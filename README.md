# NUTRANTARA — Misi Pangan Nusantara

Game pembelajaran berbasis web untuk **Biologi SMA kelas XI (Fase F)**, topik **sistem pencernaan manusia**, yang dipadukan dengan Project Based Learning. Siswa dipandu Nara, robot futuristik, untuk memulihkan arsip pangan melalui enam pos. Bukti yang dikumpulkan dipakai untuk menjawab pertanyaan proyek:

> Bagaimana kita merancang satu porsi menu berbahan pangan lokal untuk siswa SMA dengan mempertimbangkan komposisi, porsi, dan fungsi zat gizi berdasarkan bukti?

**Status:** prototipe 0.6 (tema **Nusantara Ceria**: UI cerah bermotif batik, budaya populer Indonesia di dunia 3D; lihat [docs/KARAKTER.md](docs/KARAKTER.md)). Sebelumnya, 0.5 — **Kepulauan NUTRANTARA**: pulau-pulau melayang di atas awan (mengikuti konsep peta), dengan akun siswa, lobi, pilih map, terjun ke pulau, dan **semua misi Pos 1–5 dimainkan langsung di dalam dunia 3D**. Tanpa WebGL, game beralih ke dunia 2D; tanpa server kelas, tersedia mode tamu luring.

## Alur bermain

1. **Beranda** (`/`) → **Daftar akun** atau **Masuk** (nama pengguna + kata sandi, tanpa email; bisa wajib kode kelas).
2. **Memuat**: animasi Nara, bilah progres, dan tips gizi.
3. **Lobi**: karakter 3D-mu (bisa emote), skor, segel, kepingan, teman kelas yang daring, pengumuman guru, dan misi berikutnya.
4. **MAIN** → **Pilih map**: tampilan udara kepulauan; pulau terkunci tertutup kubah.
5. **Terjun**: jatuh bebas menembus awan, membuka **parasut daun pisang** (Spasi), lalu mendarat dengan debu dan guncangan kamera.
6. **Misi di dalam dunia** (Pos 1–5): pindai **Terminal Arsip** (bukti), jawab tantangan di **Papan Laporan**, tulis alasan dan segel di **Altar Segel**. Saat pos disegel, **jembatan cahaya** ke pulau berikutnya menyala dan kubah kuncinya memudar. Pos 6 dikerjakan di **Meja Dapur Juara**.
7. **Animasi interaktif**: konfeti dan Nara berputar saat jawaban benar, Nara menggeleng dan memberi petunjuk saat salah, pilar cahaya saat menyegel, panah emas penunjuk tujuan, emote 1–4 (lambai/sorak/tari/pikir) yang terlihat pemain lain, debu langkah, air terjun, dan awan bergerak.

| Halaman | Alamat |
| :-- | :-- |
| Landing page | `/` (`index.html`) |
| Game (masuk → lobi → dunia) | `/play` (`play.html`) |
| Panel guru | `/admin` (`admin.html`) |

## Menjalankan

### Mode kelas (multipemain + panel guru)

Butuh Node.js 18 atau lebih baru di laptop guru.

```bash
npm install
npm start
```

Jendela server akan menampilkan:

- **alamat pemain**, misalnya `http://192.168.1.20:3000/play`. Bagikan alamat ini ke siswa yang tersambung ke Wi-Fi/LAN yang sama;
- **alamat admin**: `http://localhost:3000/admin`;
- **PIN admin**: dibuat acak setiap kali server dinyalakan. Agar PIN tetap, atur variabel `NUTRANTARA_ADMIN_PIN`, misalnya `$env:NUTRANTARA_ADMIN_PIN="824613"; npm start` di PowerShell.

Variabel lain: `PORT` (bawaan 3000), `NUTRANTARA_MAX_PLAYERS` (bawaan 60), `NUTRANTARA_DATA_DIR` (bawaan `data/`).

Uji otomatis server: `npm test`. Untuk deploy ke server/cloud (Docker, Render) atau hosting statis, lihat [docs/DEPLOY.md](docs/DEPLOY.md).

### Mode satu pemain

Buka `play.html` langsung di browser, atau unggah ke hosting statis (`index.html` adalah landing page-nya). Game mendeteksi bahwa server kelas tidak tersedia, lalu berjalan seperti versi 0.2: progres disimpan di `localStorage` dan peringkat bersifat lokal.

## Dunia 3D

- **Pulau NUTRANTARA** low-poly: gapura dan Nara di barat, jalur emas menuju enam portal, dan penanda khas di setiap pos (warung Menu A/B, kubah laboratorium pencernaan, lengkung vili, domino sebab-akibat, kristal klaim, dapur joglo dengan tumpeng).
- **Kontrol:** **WASD** berjalan relatif kamera. Tombol **panah ← →** memutar arah hadap (kamera ikut ke belakang penjelajah), **↑ ↓** maju/mundur searah hadap. **R / Page Up** menengadah ke langit, **F / Page Down** menunduk (seret mouse ke atas/bawah juga bisa); kepala penjelajah ikut mendongak atau menunduk. **Kursor mouse**: penjelajah menoleh ke arah kursor (ada cincin penanda), dan **klik tanah** untuk berjalan ke titik itu. **Tanda panah emas** di tanah selalu menunjukkan arah hadap. **Spasi** melompat, **E** berinteraksi, **1–4** emote. Seret mouse untuk memutar kamera, gulir untuk zoom. Di layar sentuh tersedia joystick dan tombol lompat/aksi; ketuk tanah juga membuat penjelajah berjalan ke sana.
- **Multipemain:** avatar siswa lain bergerak dan melompat secara langsung, dengan label alias, jumlah segel, dan gelembung obrolan.
- **Kepingan arsip:** 12 koleksi di atas blok tempe melayang, hanya untuk kesenangan dan tidak memengaruhi skor.
- **Grafis:** *3D Tinggi* (bayangan dan ombak), *3D Ringan* (untuk laptop lama/tablet), atau *2D*. Layar **Peta** tetap tersedia untuk pengguna papan ketik dan pembaca layar.
- Desain karakter dan peta dijelaskan di [docs/KARAKTER.md](docs/KARAKTER.md).

## Panel guru (`/admin`)

| Kendali | Fungsi |
| :-- | :-- |
| Jeda semua pemain | Menutup layar semua siswa dengan pesan jeda; progres tetap aman |
| Bekukan gerak | Avatar tidak bisa bergerak, tetapi soal tetap bisa dikerjakan |
| Matikan obrolan / bisukan siswa | Moderasi obrolan |
| Akses pos | Membuka atau menutup Pos 1–6 untuk seluruh kelas (misalnya "Hanya Pos 1" di pertemuan pertama) |
| Pengumuman / pesan pribadi | Banner di layar semua siswa atau satu siswa |
| Peta langsung | Melihat posisi siswa; pilih siswa lalu klik peta untuk memindahkannya, atau "Kumpulkan semua di Nara" |
| Tabel penjelajah | Skor, segel, progres per pos, jumlah percobaan, layar aktif, catatan validasi (⚠) |
| Detail | Jawaban, alasan Paspor, rancangan menu, dan refleksi siswa |
| Kode kelas | Pendaftaran akun baru wajib memakai kode dari guru |
| Atur ulang kata sandi / progres, keluarkan, hapus | Mengelola akun siswa (kata sandi sementara ditampilkan ke guru) |
| Ekspor JSON / CSV | Data kelas untuk penilaian dan penelitian |

**Validasi skor:** server menghitung ulang skor dari jawaban yang tersimpan terhadap kunci di `missions.js`. Server juga membatalkan segel yang tidak memenuhi syarat dan menandainya (⚠) di panel guru. Batasannya: pemeriksaan jawaban masih berjalan di browser dan kunci jawaban ikut terkirim ke klien. Siswa yang paham teknis tetap bisa mengakali jumlah percobaan.

## Isi repositori

| Berkas | Isi |
| :-- | :-- |
| `index.html`, `landing.css`, `landing.js` | Landing page (diorama 3D, enam pos, peta, karakter, info guru) |
| `play.html` | Game: sambutan, dunia, peta, misi, Dapur Juara, Paspor, peringkat |
| `characters.js` | Model 3D Penjelajah Pangan dan Nara, serta label/gelembung |
| `world3d.js` | Kepulauan 3D: pulau melayang, jembatan, pilih map, terjun, kamera, kontrol, multipemain |
| `quest.js` | Misi di dalam dunia: terminal arsip, papan laporan, altar segel, panel hologram |
| `fx.js` | Efek: konfeti, debu, kilau, pilar cahaya, gelombang |
| `culture.js` | Ornamen budaya: candi bentar, meru, penjor, stupa, rumah gadang, gunungan, gong, ondel-ondel, layang-layang, pinisi, pangan lokal |
| `theme.css` | Tema cerah Nusantara (kawung, tumpal, tombol toska-emas) |
| `app.js`, `app.css` | Alur aplikasi: masuk/daftar, memuat, lobi 3D, pilih map |
| `vendor/three/` | Three.js r170 (MIT), disimpan lokal agar jalan tanpa internet |
| `Dockerfile`, `render.yaml`, `docs/DEPLOY.md` | Deploy server kelas |
| `styles.css` | Seluruh gaya visual game |
| `missions.js` | Isi dan kunci jawaban enam pos (dipakai browser dan server) |
| `world-data.js` | Tata letak pulau, portal, dan Nara (dipakai browser dan server) |
| `game.js` | Logika permainan: state, penyimpanan, tantangan, skor, ekspor Paspor |
| `net.js` | Koneksi ke server kelas, sinkronisasi progres, jeda/pengumuman |
| `world.js` | Dunia 2D cadangan, daftar pemain, dan obrolan |
| `server.js` | Server kelas: berkas statis, WebSocket, validasi skor, perintah admin |
| `admin.html`, `admin.js`, `admin.css` | Panel kendali guru |
| `test/smoke.js` | Uji otomatis server (dua pemain + admin) |
| `Desain_Game_NUTRANTARA.docx.md` | Dokumen desain pembelajaran dan produk (acuan utama) |
| `Paket_Persiapan_Pengembangan_NUTRANTARA.docx.md` | Keputusan implementasi, rencana uji, akses data, risiko, dan backlog |
| `KONSEP_VERTICAL_SLICE_POS_1_NUTRANTARA.md` | Konsep eksploratif Pos 1 (lihat catatan scope di bawah) |
| `MEMORY.md` | Ringkasan keputusan proyek untuk melanjutkan pekerjaan |

## Alur Pos 1 yang sudah diimplementasikan

1. **Alias:** pemain memasukkan alias atau kode, bukan nama lengkap.
2. **Peta:** Pos 1 aktif; Pos 2–6 masih terkunci.
3. **Tantangan 01 (pola data):** energi kedua menu sama-sama 500 kkal. Apa kesimpulannya?
4. **Tantangan 02 (pilih bukti):** pilih data protein dan serat, lalu hindari klaim "paling sehat" yang tidak didukung data.
5. **Refleksi Paspor:** pemain menuliskan alasannya (wajib diisi, maksimal 500 karakter).
6. **Segel:** pos disegel, skor dihitung, dan Pos 2 ditandai siap untuk pembaruan berikutnya.

Jawaban salah memunculkan petunjuk bertahap dari Nara. Tidak ada nyawa, dan pemain boleh mencoba lagi. Semua angka menu adalah **data simulasi** untuk tantangan, bukan rekomendasi gizi.

### Skor

- **Satu jawaban per tantangan.** Jawaban benar mendapat 30 poin. Jawaban belum tepat **tidak apa-apa**: tantangan dianggap selesai dengan 0 poin, Nara langsung menunjukkan jawaban yang tepat beserta penjelasannya, lalu siswa lanjut ke tugas berikutnya. Kebenaran jawaban selalu dihitung ulang oleh server dari kunci.
- Segel: 20 poin dan satu lencana per pos.
- Pos 1 maksimal 80 poin (2 × 30 + 20). Target keseluruhan enam pos adalah 420 poin.

### Penilaian & evaluasi

- **Hasil Pos**: setelah pos disegel, muncul kartu berisi bintang, skor, jawaban benar, dan untuk setiap tantangan: jawaban siswa, jawaban tepat, penjelasan, serta saran belajar.
- **Rapor** (menu *Rapor* atau tombol di lobi; terbuka otomatis setelah segel terakhir): predikat A (≥90%) / B (≥75%) / C (≥60%) / D (Perlu Bimbingan), skor, jumlah jawaban benar, penilaian per pos dan kemampuan yang diuji, daftar **kekuatan** dan **yang perlu ditingkatkan**, serta evaluasi proyek Dapur Juara (rancangan, sumber data, telaah, revisi, refleksi). Rapor sementara menilai pos yang sudah dikerjakan. Rapor bisa dicetak atau disimpan sebagai PDF.
- Panel guru menampilkan jumlah **benar / dijawab** per siswa, dan ekspor CSV memuat kolom `posN_benar`.

## Data dan privasi

- **Mode kelas:** setiap siswa punya akun (nama pengguna + kata sandi, **tanpa email**). Kata sandi disimpan sebagai hash *scrypt*, dan sesi berlaku 30 hari. Progres disimpan di browser **dan** di `data/classroom.json` pada server guru (nama pengguna, posisi, progres, skor, obrolan). Guru bisa mengatur **kode kelas** agar orang luar tidak bisa mendaftar, dan bisa **mengatur ulang kata sandi** siswa yang lupa. Folder `data/` dikecualikan dari Git. Tidak ada layanan cloud.
- **Mode satu pemain:** progres hanya ada di `localStorage` (`nutrantara-save-v1`).
- Tetap gunakan alias, bukan nama lengkap. Obrolan dapat dibaca guru, dan siswa diberi tahu di layar.
- Tombol **Unduh JSON** di Paspor tetap tersedia di kedua mode.
- Hapus atau arsipkan `data/classroom.json` sesuai protokol data sekolah/penelitian setelah sesi selesai.

Jika struktur state berubah, naikkan `SCHEMA_VERSION` di `game.js`.

## Catatan scope

Mulai 0.3 (22 November 2026), atas permintaan pengguna, scope berubah dari satu pemain menjadi **RPG multipemain dengan kendali admin**. Keputusan arsitektur yang diambil: dunia 2D di canvas (tanpa engine), server Node.js + WebSocket yang dijalankan guru di jaringan lokal kelas, tanpa akun, login, maupun cloud. Implikasinya:

- Hosting statis (misalnya Sites) hanya mendukung mode satu pemain. Mode kelas butuh laptop guru yang menjalankan `npm start`, dan siswa harus berada di jaringan yang sama.
- Data siswa kini terkumpul di laptop guru, sehingga perlu persetujuan dan prosedur retensi sesuai protokol sekolah/penelitian.
- Untuk dipakai lintas sekolah atau lewat internet, perlu hosting server, HTTPS, dan validasi jawaban sepenuhnya di server.

## Roadmap

1. **Minggu 1:** finalisasi alur dan aset, vertical slice Pos 1 *(sedang berjalan)*
2. **Minggu 2:** versi alfa enam pos dan validasi ahli
3. **Minggu 3:** beta terbatas dengan siswa dan observer
4. **Minggu 4:** rilis uji beku beserta akses, panduan, asesmen, dan alur penyerahan

Prioritas QA: penguncian pos, skor dan jumlah percobaan, pemulihan progres setelah halaman dimuat ulang, kesesuaian Paspor dengan JSON, kegagalan simpan yang terlihat oleh pemain, serta aksesibilitas (keyboard Tab/Enter, lebar 1024 px, zoom 125%, layar sentuh).
