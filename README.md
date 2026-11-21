# NUTRANTARA — Misi Pangan Nusantara

Game pembelajaran berbasis web untuk **Biologi SMA kelas XI (Fase F)**, topik **sistem pencernaan manusia**, yang dipadukan dengan Project Based Learning. Siswa dipandu Nara, robot futuristik, untuk memulihkan arsip pangan melalui enam pos. Bukti yang dikumpulkan dipakai untuk menjawab pertanyaan proyek:

> Bagaimana kita merancang satu porsi menu berbahan pangan lokal untuk siswa SMA dengan mempertimbangkan komposisi, porsi, dan fungsi zat gizi berdasarkan bukti?

**Status:** prototipe 0.3. Ada enam pos, dunia RPG 2D multipemain, dan panel kendali guru (admin). Tanpa server kelas, game tetap bisa dimainkan sebagai satu pemain.

## Menjalankan

### Mode kelas (multipemain + panel guru)

Butuh Node.js 18 atau lebih baru di laptop guru.

```bash
npm install
npm start
```

Jendela server akan menampilkan:

- **alamat pemain**, misalnya `http://192.168.1.20:3000`. Bagikan alamat ini ke siswa yang tersambung ke Wi-Fi/LAN yang sama;
- **alamat admin**: `http://localhost:3000/admin`;
- **PIN admin**: dibuat acak setiap kali server dinyalakan. Agar PIN tetap, atur variabel `NUTRANTARA_ADMIN_PIN`, misalnya `$env:NUTRANTARA_ADMIN_PIN="824613"; npm start` di PowerShell.

Variabel lain: `PORT` (bawaan 3000), `NUTRANTARA_MAX_PLAYERS` (bawaan 60), `NUTRANTARA_DATA_DIR` (bawaan `data/`).

Uji otomatis server: `npm test`.

### Mode satu pemain

Buka `index.html` langsung di browser, atau unggah ke hosting statis. Game mendeteksi bahwa server kelas tidak tersedia, lalu berjalan seperti versi 0.2: progres disimpan di `localStorage` dan peringkat bersifat lokal.

## Dunia RPG

- Layar **Dunia** menampilkan pulau bersama. Setiap siswa punya avatar dengan alias dan jumlah segel.
- Gerak memakai **WASD/panah**, atau klik/sentuh titik tujuan. Tekan **E** (atau tombol di bawah peta) di depan portal untuk masuk pos, atau di dekat **Nara** untuk meminta arahan.
- Siswa lain terlihat bergerak secara langsung. Ada obrolan tim, dan pesan obrolan dapat dilihat serta dihapus guru.
- Layar **Peta** tetap tersedia sebagai jalur yang ramah papan ketik dan pembaca layar.

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
| Atur ulang / lepas alias / keluarkan / hapus | Mengelola akun alias siswa |
| Ekspor JSON / CSV | Data kelas untuk penilaian dan penelitian |

**Lepas alias:** satu alias terikat ke satu perangkat melalui token. Jika siswa berganti laptop, guru menekan "Lepas alias" agar perangkat baru bisa melanjutkan progres yang sama.

**Validasi skor:** server menghitung ulang skor dari jawaban yang tersimpan terhadap kunci di `missions.js`. Server juga membatalkan segel yang tidak memenuhi syarat dan menandainya (⚠) di panel guru. Batasannya: pemeriksaan jawaban masih berjalan di browser dan kunci jawaban ikut terkirim ke klien. Siswa yang paham teknis tetap bisa mengakali jumlah percobaan.

## Isi repositori

| Berkas | Isi |
| :-- | :-- |
| `index.html` | Layar sambutan, dunia, peta, misi, Dapur Juara, Paspor, peringkat |
| `styles.css` | Seluruh gaya visual game |
| `missions.js` | Isi dan kunci jawaban enam pos (dipakai browser dan server) |
| `world-data.js` | Tata letak pulau, portal, dan Nara (dipakai browser dan server) |
| `game.js` | Logika permainan: state, penyimpanan, tantangan, skor, ekspor Paspor |
| `net.js` | Koneksi ke server kelas, sinkronisasi progres, jeda/pengumuman |
| `world.js` | Dunia RPG di canvas: gerak, interaksi portal, avatar pemain lain, obrolan |
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

- Jawaban benar: 30 poin pada percobaan pertama, berkurang 5 poin di setiap percobaan berikutnya, minimal 10 poin.
- Segel: 20 poin dan satu lencana per pos.
- Pos 1 maksimal 80 poin (2 × 30 + 20). Target keseluruhan enam pos adalah 420 poin.

## Data dan privasi

- **Mode kelas:** progres setiap siswa disimpan di browser **dan** di `data/classroom.json` pada laptop guru, berisi alias, posisi, progres, skor, obrolan, serta hash token perangkat. Folder `data/` dikecualikan dari Git. Tidak ada layanan cloud.
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
