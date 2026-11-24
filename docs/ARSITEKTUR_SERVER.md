# Arsitektur Server NUTRANTARA

*Diperbarui 23 November 2026 dari kode nyata: `server.js` (±1.330 baris), `net.js`, `Dockerfile`, `render.yaml`, `docs/DEPLOY.md`, `CLAUDE.md`, `MEMORY.md`, dan `test/smoke.js` (versi 0.9.0 / fitur regu 1.0).*

**Peta dokumen.** Dokumen ini membahas proses server, jaringan, integritas penilaian, deploy, dan **peta jalan bersama** untuk server dan data. Model data, skema tabel, migrasi ke SQLite, cadangan, dan privasi data siswa ada di [`ARSITEKTUR_DATABASE.md`](ARSITEKTUR_DATABASE.md). Rancangan generik lama (Babylon.js + Colyseus + PostgreSQL + Redis) tidak cocok dengan game yang sudah ada dan tidak dipakai.

## Ringkasan

1. **Pertahankan arsitektur sekarang**: satu proses Node.js (`server.js` + `ws`), satu kelas per instance, data di satu berkas JSON pada disk permanen. Untuk satu kelas sampai 60 siswa, ini sudah tepat dan murah.
2. **Jangan menulis ulang ke Colyseus, Socket.IO, Supabase, atau Cloudflare.** Masalah utama NUTRANTARA adalah integritas nilai dan keamanan data, bukan skala. Keduanya diperbaiki di dalam `server.js`.
3. **Tiga perbaikan sudah masuk** (23 November 2026, diuji di `test/smoke.js`): jawaban dan varian terkunci di server, jumlah percobaan dari klien diabaikan, dan berkas data rusak tidak lagi tertimpa (dengan cadangan bergulir).
4. **Berikutnya:** batasi bentuk dan ukuran progres, lalu siaran posisi per wilayah sebelum kelas penuh 40–60 siswa. Pemeriksaan jawaban di server dan SQLite hanya bila nilai masuk rapor resmi atau ada 4 kelas atau lebih.
5. **Skala publik (PostgreSQL, beberapa proses) bukan rencana sekarang** dan butuh keputusan non-teknis lebih dulu.

---

## 1. Arsitektur sekarang

```
Peramban siswa (play.html)                       Peramban guru (admin.html)
  net.js  ── HTTP /api/* (akun) ──┐          ┌── WebSocket /ws (admin-auth + PIN)
          ── WebSocket /ws ───────┤          │
                                  ▼          ▼
                     server.js (satu proses Node.js, satu event loop)
                     ├─ HTTP statis: daftar putih STATIC + CSP ketat
                     ├─ API akun: register / login / logout / me / status, /health
                     ├─ WebSocket: join, move, progress, chat, zone, spawn,
                     │             emote, party, team-op, team-vote, admin
                     ├─ Status dunia di memori: objek `db` + Map `conns`
                     └─ Simpan: debounce 1 detik → classroom.json.tmp → rename
                                  │                + cadangan bergulir tiap 30 menit
                                  ▼
                     /data/classroom.json, /data/backup/  (disk permanen Render 1 GB, snapshot harian)
```

### 1.1 Komponen

| Bagian | Isi | Catatan |
| :-- | :-- | :-- |
| Proses | Satu `server.js`, tanpa framework, dependensi runtime hanya `ws` | Mudah dipahami, diuji dengan `npm test` |
| Data bersama | `missions.js` dan `world-data.js` dimuat lewat `vm` | Kunci jawaban dan geometri dunia sama persis dengan klien |
| Akun | Nama pengguna + kata sandi scrypt, token sesi 30 hari (hash SHA-256, maks. 5 sesi per akun), kode kelas opsional | Tanpa email atau identitas pribadi |
| Guru | Satu PIN dari `NUTRANTARA_ADMIN_PIN`, 5 salah per 30 detik per IP | Satu PIN untuk seluruh instance |
| Dunia | Posisi di server, lompatan maks. 60 unit per pesan, dijepit ke pulau yang terbuka (`WORLD.clamp` + `allowedIslands`) | Server berwenang atas posisi |
| Siaran | Posisi 10×/detik ke semua pemain, ringkasan guru dan papan skor 1×/detik, heartbeat 30 detik | Belum disaring per pulau |
| Progres | Klien mengirim seluruh state (`progress`). Server mengunci jawaban lama (`lockAnswers`), lalu menghitung ulang skor (`validateProgress`) | Lihat 2.1 |
| Regu | `db.teams`, maks. 4 anggota, `team-op` (set/push), jawaban regu lewat `team-vote` | Bagian bersama berwenang di server |
| Penyimpanan | Satu berkas JSON, tulis atomik, cadangan bergulir, simpan saat SIGTERM/SIGINT | Rincian di `ARSITEKTUR_DATABASE.md` bagian 1 dan 6 |
| Pembatas laju | ±40 pesan/detik per koneksi, chat 1,5 detik, emote 1,2 detik, 12 percobaan masuk/menit per IP, 8 kode regu salah/menit | Cukup untuk kelas |
| Deploy | Docker (`node:20-alpine`, user `node`), Render Starter Singapura + disk 1 GB | Satu instance, jeda beberapa detik saat deploy |
| Luring | Tanpa server, `net.js` berhenti mencoba dan game berjalan satu pemain dengan `localStorage` | Fitur, harus dipertahankan |

### 1.2 Yang sudah baik

- Server berwenang atas posisi, pulau yang boleh dimasuki, skor, segel, dan jawaban regu.
- Kebenaran jawaban selalu dihitung ulang dari kunci (`isCorrect`). Klaim `correct` dari klien diabaikan.
- Operasi regu tidak bisa menandai tantangan selesai, hanya voting yang bisa.
- Tulis berkas atomik, kontainer tidak berjalan sebagai root, PIN wajib di produksi.
- `/health` melaporkan `storage` (folder data bisa ditulis) dan `recovery` (`null`, `backup`, atau `empty` bila berkas data ditemukan rusak saat mulai).

### 1.3 Perbaikan yang sudah masuk (23 November 2026)

| # | Perbaikan | Di kode | Diuji |
| :-- | :-- | :-- | :-- |
| 1 | **Jawaban dan varian terkunci di server.** Tantangan yang sudah dijawab tidak bisa diganti lewat progres baru, dan nomor varian Pos 1/Pos 2 tidak bisa ditukar setelah pos dimulai atau dijawab. Upaya mengganti dikembalikan ke nilai server, dicatat sebagai flag ⚠ di panel guru, dan klien dikirimi `progress-sync`. Pos yang dikerjakan regu dilewati karena bagian itu milik regu. | `lockAnswers`, dipanggil di awal `handleProgress` | `smoke.js`: jawaban terkunci tidak bisa diganti, skor tetap, guru melihat catatan upaya; varian tidak bisa ditukar |
| 2 | **Jumlah percobaan dari klien diabaikan.** Setiap tantangan dihitung `attempts = 1`, sama dengan jalur regu (`normalizeTeamPost`). | `validateProgress` | Ikut asersi skor |
| 3 | **Berkas data rusak tidak lagi tertimpa.** Bila `classroom.json` gagal dibaca, berkas diganti nama menjadi `classroom.corrupt-<waktu>.json`, server memulihkan cadangan terbaru yang masih sah, dan hanya mulai kosong bila tidak ada cadangan. **Cadangan bergulir** dibuat saat mulai, tiap 30 menit bila ada perubahan, dan saat server berhenti, ke `data/backup/classroom-<YYYYMMDD-HHmmss>.json`, 48 terakhir (`NUTRANTARA_BACKUP_KEEP`). | `loadDb`, `backupDb`, `/health` `recovery` | `smoke.js` menunggu cadangan terakhir saat server berhenti |

---

## 2. Batas yang masih ada

### 2.1 Integritas nilai

1. **Kunci jawaban dikirim ke peramban.** `missions.js` disajikan utuh, jadi siswa yang paham teknis bisa membaca kunci *sebelum* menjawab. Penguncian di 1.3 mencegah mengganti jawaban sesudahnya, bukan membaca kunci sebelumnya. Tercatat sebagai batas yang diketahui di `docs/DEPLOY.md`.
2. **Varian pertama dipilih klien.** Server mengunci varian setelah tercatat, tetapi nilai awalnya masih dari klien (`randomVariant` di `game.js`). Siswa bisa memilih varian 0 sebelum mulai menjawab.
3. **Bentuk dan ukuran progres belum diperiksa.** Satu pesan boleh sampai 256 KB (`maxPayload`), lalu disimpan apa adanya.

Untuk latihan dan penilaian formatif, ini bisa diterima. Untuk nilai rapor atau penelitian, butir 1 dan 2 harus ditutup (Fase 1.5).

### 2.2 Penyimpanan

Masalah tersisa: seluruh berkas ditulis ulang sinkron (`writeFileSync`) tiap simpan, dan cadangan hanya ada di disk yang sama. Rincian, angka ukuran, dan rencananya ada di `ARSITEKTUR_DATABASE.md` bagian 1.5 dan 6.

### 2.3 Satu proses, satu kelas

- `NUTRANTARA_MAX_PLAYERS` (bawaan 60) membatasi **jumlah akun** di satu instance, bukan jumlah yang daring.
- Satu instance = satu PIN guru, satu pengaturan pos, satu ruang obrolan, satu papan skor. Kelas kedua butuh instance kedua (di Render: layanan dan disk kedua, biaya ikut berlipat).
- Disk Render hanya bisa dipasang ke satu instance, jadi tidak ada skala horizontal dan setiap deploy berarti jeda beberapa detik.
- `playerBySession` dan pencarian alias memindai semua pemain. Wajar untuk 60 akun, tidak untuk ribuan.

### 2.4 Jaringan

Setiap 100 ms, selama ada yang bergerak, server mengirim posisi **semua** pemain daring ke **semua** pemain, tanpa kompresi (`perMessageDeflate` mati secara bawaan di `ws`). Satu entri posisi ±40 byte.

| Siswa daring | Per pesan | Keluar dari server | Satu sesi 90 menit |
| :-- | :-- | :-- | :-- |
| 30 | ±1,2 KB | ±360 KB/detik (±3 Mbps) | ±2 GB |
| 60 | ±2,4 KB | ±1,4 MB/detik (±11 Mbps) | ±8 GB |

Pada mode LAN (laptop guru di Wi-Fi sekolah), 11 Mbps keluar dari satu laptop sudah berat. Padahal sebagian besar siswa berada di wilayah pos yang berbeda dan tidak saling melihat (wilayah ±1000 × 650 m, kabut 330 m).

### 2.5 Hal kecil

- Map `authAttempts` dan `failedLogins` tidak pernah dibersihkan (bocor memori sangat kecil).
- Satu PIN dipakai bersama oleh semua guru, dan tindakan guru tidak dicatat.
- `adminSnapshot` lengkap dikirim setiap detik saat ada perubahan, padahal kebanyakan isinya sama.
- Image Docker memakai Node 20, yang sudah habis masa dukungannya pada April 2026.

---

## 3. Peta jalan

Setiap fase bisa dikerjakan dan di-deploy sendiri, tetap kompatibel dengan mode luring, dan diuji dengan menambah asersi di `test/smoke.js`. Bagian ini satu-satunya daftar prioritas untuk server dan data; `ARSITEKTUR_DATABASE.md` merujuk ke sini.

### Fase 1: Integritas penilaian

| Butir | Pekerjaan | Status |
| :-- | :-- | :-- |
| 1.1 | Jawaban pertama terkunci di server | ✅ Selesai (`lockAnswers`) |
| 1.2 | Varian tidak bisa ditukar setelah tercatat | ✅ Selesai (`lockAnswers`). Sisa: varian pertama dipilih server, bukan klien |
| 1.3 | Abaikan `attempts` dari klien | ✅ Selesai |
| 1.4 | Batasi bentuk progres: tolak di atas ±64 KB, buang kunci di luar skema `game.js` (`SCHEMA_VERSION`), potong teks alasan/refleksi | Belum |
| 1.5 | *(Hanya bila nilai masuk rapor)* Pemeriksaan jawaban di server: pesan `answer { pos, index, response }` → `{ correct, points, explanation }`; kunci pindah ke berkas yang hanya dimuat server (mis. `missions-keys.js`, tidak ada di `STATIC`). Mode luring tetap memakai kunci lokal karena tidak ada nilai resmi di sana | Belum, perubahan klien terbesar |

### Fase 2: Ketahanan data

| Butir | Pekerjaan | Status |
| :-- | :-- | :-- |
| 2.1 | Jangan menimpa berkas rusak, pulihkan dari cadangan, laporkan di `/health` | ✅ Selesai |
| 2.2 | Cadangan bergulir 30 menit, 48 terakhir | ✅ Selesai. Sisa: cadangan harian 14 hari dan ekspor mingguan guru (`ARSITEKTUR_DATABASE.md` 6.1) |
| 2.3 | Tulis tanpa memblok: `fs.promises.writeFile` + rename dengan penanda "sedang menulis", berkas utama tanpa indentasi | Belum |
| 2.4 | Bersihkan `authAttempts` dan `failedLogins` tiap beberapa menit, hapus sesi kedaluwarsa dan `tokenHash` lama | Belum |
| 2.5 | Naik ke Node 24 LTS di `Dockerfile`, `package.json` (`engines`), dan panduan guru | Belum, sebelum semester depan |

**Tetap JSON untuk satu kelas.** Pemicu pindah ke SQLite ada di `ARSITEKTUR_DATABASE.md` bagian 5.1.

### Fase 3: Efisiensi jaringan (sebelum kelas penuh 40–60 siswa)

1. **Siaran posisi per wilayah.** Kirim ke tiap pemain hanya posisi pemain di wilayah yang sama (`WORLD.islandAt`) atau dalam radius ±400 m, ditambah anggota regunya (peta mini dan "Terjun ke dia"). Guru tetap menerima semuanya. Dengan siswa tersebar di 6 pos, lalu lintas turun sekitar 5–6 kali.
2. **Hanya kirim yang berubah.** Simpan posisi terakhir yang disiarkan per pemain dan sertakan hanya entri yang bergeser.
3. **Turunkan frekuensi untuk pemain jauh** (mis. 2×/detik di luar radius dekat tetapi masih satu wilayah).
4. `perMessageDeflate` hanya untuk pesan besar (`party`, `admin-state`, `welcome`), bukan posisi.

Target: 60 siswa di Wi-Fi sekolah di bawah ±2 Mbps keluar dari laptop guru.

### Fase 4: Beberapa kelas (hanya bila ada kebutuhan nyata)

| Jumlah kelas | Rekomendasi | Alasan |
| :-- | :-- | :-- |
| 1–3 kelas | **Satu instance per kelas** (seperti sekarang). Di LAN tiap guru menjalankan laptopnya sendiri; di Render satu layanan + disk per kelas | Nol perubahan kode, data tiap kelas terpisah, satu kelas bermasalah tidak mengganggu yang lain |
| 4 kelas atau lebih di satu server | **Multi-kelas dalam satu proses**: `class_id` di semua data, PIN guru per kelas, siaran disaring per kelas, penyimpanan **SQLite** | Satu biaya server; skema dan migrasinya di `ARSITEKTUR_DATABASE.md` bagian 3–5 |

Satu proses Node.js dengan Fase 3 diperkirakan sanggup melayani beberapa ratus koneksi WebSocket serentak untuk game seperti ini. Angka ini belum diukur, jadi uji beban dulu (mis. skrip turunan `test/smoke.js` dengan 200 klien palsu) sebelum menjanjikannya ke sekolah.

### Fase 5: Skala publik (bukan rencana sekarang)

`MEMORY.md` mencatat target 3.000 pengguna dan "dipakai umum" pernah dibahas, tetapi belum diputuskan. Bila nanti diputuskan:

- Kelas menjadi "ruang" alami: sebar kelas ke beberapa proses atau server (sharding per kode kelas) dengan perutean lengket, dan ganti SQLite dengan PostgreSQL terkelola (`ARSITEKTUR_DATABASE.md` bagian 7).
- Redis hanya perlu bila satu kelas dilayani lebih dari satu proses, dan itu tidak terjadi untuk kelas 60 siswa.
- **Colyseus tetap tidak diperlukan.** Logika penting NUTRANTARA (penilaian, regu, voting, kendali guru) adalah logika khusus yang harus ditulis ulang apa pun framework-nya. Menulis ulang berarti kehilangan `smoke.js`, mode luring, dan kompatibilitas data siswa.
- Tahap ini butuh keputusan non-teknis lebih dulu: perlindungan data anak (UU PDP), lokasi server, masa simpan, akun guru per sekolah, dan dukungan operasional. Bahas dengan pengguna sebelum menulis kode, sesuai `CLAUDE.md`.

### Urutan prioritas

| Prioritas | Pekerjaan | Ukuran | Dampak |
| :-- | :-- | :-- | :-- |
| ✅ | Kunci jawaban + varian, abaikan `attempts`, berkas rusak + cadangan bergulir (1.1–1.3, 2.1–2.2) | Kecil | Selesai 23 November 2026 |
| 1 | Batasi bentuk/ukuran progres (1.4) | Kecil | Berkas data tetap kecil dan bersih |
| 2 | Bersihkan peta pembatas laju dan sesi lama, naik ke Node 24 (2.4–2.5) | Kecil | Runtime yang masih didukung, tanpa bocor memori |
| 3 | Siaran posisi per wilayah + hanya yang berubah (3.1–3.2) | Sedang | Kelas 60 siswa nyaman di Wi-Fi sekolah |
| 4 | Tulis asinkron (2.3) | Kecil | Tidak tersendat saat data membesar |
| 5 | Pemeriksaan jawaban di server + varian dari server + SQLite dengan rapor dan log guru (1.5, `ARSITEKTUR_DATABASE.md`) | Besar | Hanya bila nilai masuk rapor |
| 6 | Multi-kelas (Fase 4) | Besar | Hanya bila ≥4 kelas di satu server |
| 7 | Skala publik (Fase 5) | Besar | Hanya setelah keputusan resmi |

---

## 4. Yang tidak direkomendasikan

| Usulan | Alasan ditolak |
| :-- | :-- |
| Menulis ulang ke Colyseus / Socket.IO | Tidak menyelesaikan integritas, membuang uji dan mode luring |
| Supabase / PostgreSQL untuk satu kelas | Layanan, biaya, dan titik gagal tambahan tanpa manfaat pada 60 siswa |
| Cloudflare Workers + Durable Objects | Menulis ulang `server.js` total (dibahas 23 November 2026 dan ditolak) |
| Redis | Hanya berguna untuk banyak proses per kelas, yang tidak diperlukan |
| Skala horizontal di Render | Tidak bisa selama memakai disk permanen, dan tidak dibutuhkan untuk satu kelas |
