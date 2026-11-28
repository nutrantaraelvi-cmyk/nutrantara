# PRD NUTRANTARA — Misi Pangan Nusantara

*Product Requirements Document. Disusun 23 November 2026 dari keadaan nyata repositori: `Desain_Game_NUTRANTARA.docx.md`, `Paket_Persiapan_Pengembangan_NUTRANTARA.docx.md`, `KONSEP_VERTICAL_SLICE_POS_1_NUTRANTARA.md`, `README.md`, `MEMORY.md`, `CLAUDE.md`, `docs/arsitektur/kajian/ARSITEKTUR_SERVER.md`, `docs/arsitektur/kajian/ARSITEKTUR_DATABASE.md`, `docs/DEPLOY.md`, `docs/KARAKTER.md`, serta pemeriksaan singkat `server.js` dan `missions.js`.*

| Butir | Isi |
| :-- | :-- |
| Pemilik produk | Elvi Era Fitri (Magister Teknologi Pendidikan) |
| Mata pelajaran | Biologi SMA kelas XI, Fase F, sistem pencernaan manusia |
| Model pembelajaran | Project Based Learning (PjBL) |
| Versi produk sekarang | 1.0 menurut `MEMORY.md` (proyek regu PjBL). `package.json` masih tertulis `0.9.0` dan perlu diselaraskan |
| Status dokumen | Draf untuk ditelaah pemilik produk |

---

## 1. Latar masalah

### 1.1 Masalah pembelajaran

Topik sistem pencernaan di kelas XI cenderung diajarkan sebagai hafalan organ dan enzim. Dokumen desain dan riset rujukan pada pengembangan Pos 3 mencatat beberapa kesulitan yang berulang:

1. **Pencernaan disamakan dengan penyerapan.** Siswa sering melupakan tahap penyerapan atau menganggap enzim yang memecah molekul sama dengan proses perpindahan molekul ke darah.
2. **Kesimpulan gizi diambil dari satu angka.** Contohnya, menganggap dua menu setara karena energinya sama-sama 500 kkal, atau menganggap menu 600 kkal "paling sehat".
3. **Sebab akibat dan klaim iklan jarang diuji dengan bukti.** Siswa belum terbiasa memilah data, kesimpulan, dan asumsi.
4. **Pengetahuan gizi tidak sampai ke tindakan.** Siswa jarang diminta merancang dan merevisi menu nyata dari bahan lokal dengan perhitungan porsi dan sumber data.

### 1.2 Masalah pelaksanaan PjBL di kelas

- Guru sulit memantau kerja 30–60 siswa secara bersamaan, terutama siapa yang berkontribusi dalam kelompok.
- Artefak proses (alasan, rancangan awal, telaah, revisi) mudah hilang atau tercecer di banyak kanal.
- Laptop sekolah beragam, sebagian lama, dan jaringan kelas sering lambat atau tidak ada internet.

### 1.3 Jawaban produk

NUTRANTARA adalah game petualangan 3D berbasis web. Nara, robot pemandu, mengajak siswa memulihkan arsip pangan dari enam pos. Bukti dari Pos 1–5 dipakai untuk menjawab pertanyaan penggerak di Pos 6:

> Bagaimana kita merancang satu porsi menu berbahan pangan lokal untuk siswa SMA di lingkungan sekolah dengan mempertimbangkan komposisi, porsi, dan fungsi zat gizi berdasarkan bukti?

Guru menjalankan server kelas dan mengendalikan sesi dari panel guru. Tanpa server, game tetap bisa dimainkan sendiri.

---

## 2. Persona

### 2.1 Siswa: "Raka", 16 tahun, kelas XI MIPA

| Aspek | Keterangan |
| :-- | :-- |
| Konteks | Bermain di laptop sekolah (4 GB RAM, layar 1366 × 768, Chrome/Edge) atau ponsel di rumah. Terbiasa dengan game mobile dan mabar bersama teman |
| Kebutuhan | Tahu apa yang harus dilakukan tanpa banyak membaca, merasa ada kemajuan, bisa bermain bersama teman satu regu |
| Hambatan | Mudah menebak jawaban demi skor, cepat bosan dengan tabel angka, kadang tidak bisa hadir bersamaan dengan anggota regu |
| Yang dihindari produk | Meminta nama lengkap, menghukum jawaban salah secara berlebihan, menuntut perangkat bagus |

### 2.2 Siswa pendukung: "Sinta", siswa yang butuh aksesibilitas

Memakai papan ketik (Tab/Enter) atau zoom 125%, sulit membedakan warna, atau memakai laptop lama yang tidak kuat 3D. Butuh mode 3D Ringan atau 2D, label status yang tidak hanya berupa warna, dan teks untuk setiap pesan penting.

### 2.3 Guru Biologi: "Bu Dewi", pengajar dan peneliti

| Aspek | Keterangan |
| :-- | :-- |
| Konteks | Mengajar 1–3 kelas, menjalankan server dari laptop di Wi-Fi sekolah atau memakai server Render. Dalam konteks tesis, guru juga peneliti yang butuh data proses dan hasil |
| Kebutuhan | Membuka pos sesuai jadwal pertemuan, menjeda kelas, melihat progres dan kontribusi per siswa, mengekspor data untuk penilaian dan penelitian, mengelola akun siswa yang lupa kata sandi |
| Hambatan | Waktu persiapan terbatas, tidak semua guru nyaman dengan terminal, data siswa harus sesuai protokol sekolah dan penelitian |

### 2.4 Pemangku kepentingan lain

- **Validator** (ahli materi, media, pembelajaran, penelaah gizi): menelusuri semua pos dan memberi penilaian per butir.
- **Observer kelas**: mencatat keterlaksanaan, durasi, dan kebutuhan bantuan.
- **Sekolah dan orang tua/wali**: memberi persetujuan penggunaan data anak.

---

## 3. Tujuan dan metrik

### 3.1 Tujuan pembelajaran (dari dokumen desain)

| Kode | Tujuan | Bukti keberhasilan |
| :-- | :-- | :-- |
| TP1 | Menganalisis data pangan dan proses pencernaan: memilah bukti, membandingkan angka, membedakan pencernaan dan penyerapan, memeriksa sebab akibat dan asumsi klaim | Respons analitis di Paspor dan tes individual berbasis stimulus baru |
| TP2 | Merancang prototipe menu sehat berbasis pangan lokal: sasaran, bahan, porsi, perkiraan gizi, alasan, revisi | Kartu menu awal dan revisi dengan sumber data, perhitungan per porsi, masukan, dan alasan perubahan |

### 3.2 Tujuan produk

| Kode | Tujuan |
| :-- | :-- |
| TPr1 | Satu kelas dapat menyelesaikan enam pos dalam rangkaian pertemuan yang direncanakan guru, di laptop sekolah yang ada |
| TPr2 | Guru dapat mengendalikan sesi dan memperoleh data yang bisa dipercaya untuk penilaian formatif dan penelitian |
| TPr3 | Kerja regu PjBL terlihat: kontribusi individu tercatat terpisah dari hasil regu |
| TPr4 | Data siswa minimal, tanpa identitas pribadi, dan tidak hilang diam-diam |

### 3.3 Metrik

Angka di bawah adalah **sasaran**, bukan hasil. Belum ada data playtest siswa di repositori.

| Area | Metrik | Sasaran | Cara ukur |
| :-- | :-- | :-- | :-- |
| Hasil belajar TP1 | Selisih pretest–posttest analisis (rubrik 0–4 per indikator) | Peningkatan bermakna sesuai desain penelitian | Tes individual stimulus setara, konteks berbeda dari game |
| Hasil belajar TP2 | Skor rubrik menu awal vs akhir | Rerata naik minimal 1 tingkat rubrik | Rubrik 0–4: sasaran, bahan lokal dan porsi, estimasi gizi dan sumber, alasan, revisi |
| Penyelesaian | Siswa yang menyegel keenam pos | ≥ 80% siswa hadir | Panel guru, ekspor CSV |
| Kelengkapan artefak | Paspor dengan alasan di setiap pos + rancangan awal, telaah, revisi, refleksi Pos 6 | ≥ 90% siswa yang menyelesaikan | Ekspor JSON |
| Kemandirian | Pos yang diselesaikan tanpa bantuan lisan guru | ≥ 70% | Catatan observer |
| Durasi | Waktu per pos analisis | 8–12 menit per regu (sasaran vertical slice Pos 1) | Observer, lalu telemetri bila ditambahkan |
| Kerja regu | Regu dengan kontribusi tercatat dari setiap anggota | ≥ 80% regu | Log kontribusi di panel guru |
| Integritas | Flag ⚠ di panel guru per sesi | Dipantau, setiap flag ditindaklanjuti guru | Panel guru |
| Teknis | Peta siap interaksi | ≤ 4 detik pada 5 Mbps | Uji laptop sekolah |
| Teknis | Laju bingkai | 60 fps sasaran, 30 fps batas bawah (3D Ringan) | Uji laptop 4 GB RAM |
| Teknis | Lalu lintas keluar server untuk 60 siswa | ≤ ±2 Mbps (setelah Fase 3 server) | Uji beban |
| Data | Kehilangan data saat berkas rusak | ≤ 30 menit (cadangan bergulir) | Uji pemulihan |
| Kepuasan | Siswa yang menilai game menyenangkan dan jelas | ≥ 75% setuju | Angket singkat pascasesi |

---

## 4. Ruang lingkup

### 4.1 Riwayat perubahan scope

Scope sudah berubah beberapa kali atas permintaan pemilik produk. Ringkasannya penting karena dokumen desain awal tidak lagi sepenuhnya menggambarkan produk:

| Versi | Perubahan |
| :-- | :-- |
| Dokumen desain | Prototipe satu pemain di Sites, tanpa engine, backend, akun, atau multiplayer. Skor 30 poin berkurang 5 per percobaan |
| 0.3 | RPG multipemain 2D dengan server Node.js + WebSocket di LAN dan panel guru |
| 0.4–0.5 | Dunia 3D Three.js, kepulauan melayang, akun nama pengguna + kata sandi, lobi, terjun ke pulau, misi di dalam dunia |
| 0.6 | Tema cerah "Nusantara Ceria" dengan ornamen budaya Indonesia |
| 0.7 | Satu jawaban per tantangan (benar 30, salah 0 dengan penjelasan), kartu Hasil Pos, Rapor A–D. **Menggantikan aturan coba ulang di dokumen desain** |
| 0.8–0.9 | Dunia terbuka: 6 pulau jelajah, tiap pos menjadi wilayah ±1000 × 650 m, peta mini, 42 kepingan arsip |
| Konten | Pos 1: 100 varian kasus. Pos 2: Meja Uji Reagen, 4 kasus. Pos 3: Gerbang Pilah + Simulator Vili 3D |
| 1.0 | Proyek regu PjBL 1–4 orang dengan peran berputar, voting jawaban regu, log kontribusi. Deploy Render Starter + disk permanen |
| 1.3 | Integrasi PjBL POS 1–6: tiap POS = satu langkah sintaks PjBL; 50 soal analisis (POS 1–5) dijawab individu lalu dikunci kelompok, skor 10/5, buka POS berikutnya ≥ 70 atau baca ulang feedback; POS 6 tantangan prototype menu sehat harian kantin dengan validasi otomatis, rubrik, dan refleksi (lihat 5.7) |

PRD ini mengacu pada keadaan 1.0. Bila dokumen desain dan keputusan di `MEMORY.md` berbeda, yang berlaku adalah keputusan terbaru di `MEMORY.md`.

### 4.2 Versi sekarang (1.0): sudah ada di kode

**Alur dan dunia**
- Landing page dengan layar muat ilustrasi, game di `/play`, panel guru di `/admin`.
- Daftar dan masuk dengan nama pengguna + kata sandi (tanpa email), kode kelas opsional, mode tamu luring.
- Lobi 3D, pilih map, terjun berparasut, kepulauan 3D dengan enam wilayah pos, alun-alun, danau kawah, dan enam pulau jelajah.
- Grafis 3D Tinggi, 3D Ringan, dan 2D cadangan. Layar Peta ilustrasi untuk papan ketik dan pembaca layar.
- Kontrol dual-input untuk PC, gamepad, dan layar sentuh, empat mode kamera (orbit, bahu, isometrik, orang pertama), kunci target Q.

**Misi**
- Pos 1–5 di dalam dunia: Terminal Arsip (bukti), Papan Laporan (tantangan), Altar Segel (alasan + segel). Pos 6 Dapur Juara di layar DOM: rancangan awal, telaah, revisi, refleksi.
- Penguncian pos berurutan, ditambah buka/tutup pos oleh guru.
- Penilaian: satu jawaban per tantangan, 30 poin benar, 0 poin salah dengan penjelasan, segel 20 poin, maksimum 420. Kartu Hasil Pos dan Rapor (A ≥90%, B ≥75%, C ≥60%, D Perlu Bimbingan), dapat dicetak.
- Paspor dengan unduhan JSON.

**Multipemain dan regu**
- Avatar siswa lain, obrolan, emote, kepingan arsip.
- Regu proyek 1–4 orang dengan kode undangan, peran berputar per pos, voting jawaban regu (terkunci bila 2 anggota memilih sama, atau 1 bila anggota lain tidak aktif > 24 jam), alasan dan refleksi tetap individu, log kontribusi.

**Panel guru**
- Jeda, bekukan gerak, matikan obrolan, bisukan, akses pos, pengumuman, pesan pribadi, peta langsung dan teleport, tabel penjelajah, detail jawaban, kode kelas, atur ulang kata sandi/progres, keluarkan, hapus, bagian Regu Proyek, ekspor JSON/CSV.

**Server dan data**
- `server.js` tunggal (Node.js + `ws`), daftar berkas statis eksplisit, CSP ketat, rate limit masuk dan kode regu, PIN admin wajib di produksi.
- Skor dihitung ulang server dari kunci. Jawaban yang sudah tersimpan dan nomor varian dikunci server, `attempts` klien diabaikan.
- `data/classroom.json` dengan penanganan berkas rusak (disimpan sebagai `classroom.corrupt-*.json`, pulih dari cadangan) dan cadangan bergulir di `data/backup`.
- CI: cek sintaks, `npm test` (smoke test dua pemain + admin), build Docker + `/health`.

### 4.3 Versi berikutnya (1.1, "rilis uji kelas")

Fokus: kesiapan uji kelas dan penelitian, bukan fitur baru. Urutan mengikuti `docs/arsitektur/kajian/ARSITEKTUR_SERVER.md` dan `docs/arsitektur/kajian/ARSITEKTUR_DATABASE.md`.

| Prioritas | Pekerjaan | Alasan |
| :-- | :-- | :-- |
| Must | Batasi bentuk dan ukuran progres (±64 KB, buang kunci di luar skema, potong teks) | Berkas data tetap kecil dan bersih |
| Must | Hapus sesi kedaluwarsa, batasi umur obrolan | Minimalisasi data anak |
| Must | Pemberitahuan data untuk orang tua/wali dan ringkasannya di layar daftar | Syarat sebelum pengumpulan data |
| Must | Validasi ahli materi, media, pembelajaran, dan perbaikan temuan penghambat | Prasyarat beta |
| Must | Playtest siswa di laptop sekolah (3D Tinggi, 3D Ringan, 2D) dengan 2+ siswa dan guru | Daftar periksa rilis `docs/DEPLOY.md` |
| Must | Selaraskan nomor versi (`package.json`, README) dan bekukan versi uji dengan tag Git | Versi yang dipakai penelitian harus bisa ditelusuri |
| Should | Siaran posisi per wilayah dan hanya yang berubah | 60 siswa di Wi-Fi sekolah tanpa tersendat |
| Should | Tulis berkas data secara asinkron | Tidak tersendat saat data membesar |
| Should | Tutorial singkat bebas skor bersama Nara | Usulan Paket Persiapan |
| Should | Tampilan perbandingan rancangan awal vs revisi di Dapur Juara | Usulan Paket Persiapan |
| Should | Telemetri minimum: `pos_dibuka`, `keputusan_dikirim`, `pos_disegel`, `draf_disimpan`, `paspor_diekspor` dengan waktu | Durasi per pos tanpa bergantung observer |
| Should | Ekspor anonim untuk penelitian (id acak, alias dihapus) | Privasi data penelitian |
| Should | Naik ke Node.js 24 LTS di `Dockerfile`, CI, dan panduan | Node 20 sudah habis masa dukungannya |
| Could | Efek audio portal/segel dengan tombol bisu, animasi lencana | Daya tarik |
| Could | Kosmetik dari segel (warna caping, motif syal), tanpa toko | `docs/KARAKTER.md` |

### 4.4 Versi selanjutnya (2.0, bila ada kebutuhan nyata)

| Pekerjaan | Pemicu |
| :-- | :-- |
| Pemeriksaan jawaban sepenuhnya di server, kunci tidak dikirim ke klien | Nilai NUTRANTARA masuk rapor resmi |
| `report_snapshots` dan `audit_log` tindakan guru | Bersamaan dengan nilai rapor |
| Lapisan `storage.js`, lalu SQLite (`node:sqlite`) | Nilai rapor, ≥4 kelas di satu server, atau JSON > ±5 MB / 150 akun |
| Multi-kelas dalam satu proses, PIN per kelas | ≥4 kelas di satu server |
| Aset karakter final glTF dari desainer | Ada desainer dan lisensi jelas |
| Lokasi server di Indonesia | Penggunaan lintas sekolah atau nilai resmi (UU PDP) |

### 4.5 Di luar lingkup

- Toko, mata uang belanja, iklan, transaksi dalam aplikasi, battle pass, drop rate.
- Pertarungan atau musuh.
- Voice chat, kamera, matchmaking publik.
- Login Google, email, NIS/NISN, atau identitas pribadi lain.
- Penulisan ulang ke Godot, Colyseus, Socket.IO, Supabase, atau Cloudflare Workers (sudah dibahas dan ditolak).
- Distribusi toko aplikasi.
- Skala publik ribuan pengguna (Fase 5 server) sampai ada keputusan non-teknis tentang data anak, lokasi server, dan dukungan operasional.

---

## 5. Kebutuhan fungsional

Status: **Ada** = sudah di kode, **Sebagian** = ada tetapi belum memenuhi seluruh kebutuhan, **Belum** = rencana.

### 5.1 Akun dan sesi

| ID | Kebutuhan | Status |
| :-- | :-- | :-- |
| F-AK-01 | Siswa mendaftar dengan nama pengguna (alias 3–20 karakter) dan kata sandi, tanpa email | Ada |
| F-AK-02 | Pendaftaran dapat diwajibkan memakai kode kelas dari guru | Ada |
| F-AK-03 | Kata sandi disimpan sebagai hash scrypt, sesi berlaku 30 hari, percobaan masuk dibatasi per IP | Ada |
| F-AK-04 | Layar daftar mengingatkan agar tidak memakai nama lengkap | Ada |
| F-AK-05 | Tanpa server, game berjalan sebagai tamu luring dan menyimpan ke `localStorage` | Ada |
| F-AK-06 | Sesi kedaluwarsa dihapus otomatis | Belum |

### 5.2 Dunia dan navigasi

| ID | Kebutuhan | Status |
| :-- | :-- | :-- |
| F-DU-01 | Alur beranda → masuk → memuat → lobi → pilih map → terjun | Ada |
| F-DU-02 | Pos terkunci tertutup kubah dan tidak bisa dimasuki, jembatan menyala saat pos sebelumnya disegel | Ada |
| F-DU-03 | Penunjuk tujuan (jarak, suar cahaya, panah) dan peta mini | Ada |
| F-DU-04 | Pilihan grafis 3D Tinggi, 3D Ringan, 2D; otomatis 2D tanpa WebGL | Ada |
| F-DU-05 | Layar Peta yang bisa dipakai dengan papan ketik | Ada |
| F-DU-06 | Kontrol papan ketik, mouse, gamepad, dan sentuh | Ada |

### 5.3 Misi dan penilaian

| ID | Kebutuhan | Status |
| :-- | :-- | :-- |
| F-MI-01 | Pos 1–5 berisi stimulus (Terminal Arsip), tantangan (Papan Laporan), dan alasan + segel (Altar Segel) | Ada |
| F-MI-02 | Setiap tantangan dijawab sekali: benar 30 poin, salah 0 poin dengan jawaban tepat dan penjelasan | Ada |
| F-MI-03 | Segel hanya bisa dilakukan bila semua tantangan dijawab dan alasan memenuhi panjang minimum; segel memberi 20 poin dan satu lencana | Ada |
| F-MI-04 | Pos 6 Dapur Juara menyimpan rancangan awal, telaah, revisi, dan refleksi; segel butuh ketiganya tersimpan | Ada |
| F-MI-05 | Angka di Pos 1–5 ditandai sebagai data simulasi | Ada |
| F-MI-06 | Pos 1 memberi varian kasus acak (100), Pos 2 empat kasus, varian tetap setelah dimulai | Ada |
| F-MI-07 | Kartu Hasil Pos dan Rapor A–D dengan kekuatan dan yang perlu ditingkatkan | Ada |
| F-MI-08 | Paspor dapat diunduh sebagai JSON yang isinya sama dengan tampilan | Ada |
| F-MI-09 | Tutorial bebas skor sebelum Pos 1 | Belum |
| F-MI-10 | Perbandingan berdampingan rancangan awal dan revisi di Pos 6 | Belum |

### 5.4 Regu proyek (PjBL)

| ID | Kebutuhan | Status |
| :-- | :-- | :-- |
| F-RE-01 | Siswa membuat atau bergabung ke regu 1–4 orang dengan kode 6 karakter atau tautan `?regu=` | Ada |
| F-RE-02 | Empat peran per pos yang berputar antarpos, dibagi sesuai jumlah anggota | Ada |
| F-RE-03 | Tugas milik anggota yang daring ditolak dengan ajakan berdiskusi, tugas anggota luring boleh diambil alih dan tercatat | Ada |
| F-RE-04 | Jawaban Papan Laporan diputuskan dengan voting regu | Ada |
| F-RE-05 | Alasan, refleksi, dan segel tetap individu | Ada |
| F-RE-06 | Anggota boleh bermain pada waktu berbeda tanpa saling menimpa data | Ada |
| F-RE-07 | Guru melihat kemajuan regu, kontribusi, log, dan dapat membubarkan regu | Ada |

### 5.5 Panel guru

| ID | Kebutuhan | Status |
| :-- | :-- | :-- |
| F-GU-01 | Masuk dengan PIN; PIN wajib diatur di produksi | Ada |
| F-GU-02 | Jeda kelas, bekukan gerak, matikan obrolan, bisukan siswa | Ada |
| F-GU-03 | Buka/tutup Pos 1–6 untuk seluruh kelas | Ada |
| F-GU-04 | Pengumuman ke semua siswa dan pesan pribadi | Ada |
| F-GU-05 | Peta langsung, pindahkan siswa, kumpulkan semua di Nara | Ada |
| F-GU-06 | Tabel skor, segel, benar/dijawab, layar aktif, flag ⚠, dan detail jawaban per siswa | Ada |
| F-GU-07 | Atur ulang kata sandi dan progres, keluarkan, hapus akun | Ada |
| F-GU-08 | Ekspor JSON dan CSV tanpa hash kata sandi dan sesi | Ada |
| F-GU-09 | Ekspor anonim untuk penelitian | Belum |
| F-GU-10 | Tombol ganti alias untuk alias yang berupa nama lengkap | Belum |
| F-GU-11 | Log tindakan guru | Belum |

### 5.6 Integritas dan data

| ID | Kebutuhan | Status |
| :-- | :-- | :-- |
| F-IN-01 | Server menghitung ulang skor dari kunci dan membatalkan segel yang tidak sah | Ada |
| F-IN-02 | Jawaban yang sudah tersimpan dan nomor varian tidak bisa diganti lewat progres | Ada |
| F-IN-03 | Jumlah percobaan dari klien diabaikan | Ada |
| F-IN-04 | Progres di atas batas ukuran ditolak, kunci di luar skema dibuang | Belum |
| F-IN-05 | Kunci jawaban tidak dikirim ke klien pada mode kelas | Belum (2.0) |
| F-IN-06 | Berkas data rusak tidak ditimpa dan dipulihkan dari cadangan | Ada |
| F-IN-07 | Cadangan bergulir di `data/backup` | Ada |
| F-IN-08 | `/health` melaporkan apakah data bisa disimpan | Ada |

---

### 5.7 Proyek PjBL POS 1–6 (sejak 1.3)

Sumber konten: dokumen "Nutrantara — Integrasi PjBL & Pertanyaan Analisis POS 1–6". Data ada di `pjbl-data.js`, logika bersama di `pjbl-core.js` (dipakai peramban dan server), layar di `pjbl.js` (menu **Proyek PjBL** dan tombol **PjBL** di lobi).

| POS | Langkah PjBL | Lokasi | Luaran kelompok (logbook) |
| :-- | :-- | :-- | :-- |
| 1 | Penentuan pertanyaan mendasar | Gerbang Kantin Desa | Rumusan pertanyaan mendasar |
| 2 | Mendesain perencanaan proyek | Pasar Pangan Nusantara | Rencana proyek dan kriteria menu |
| 3 | Menyusun jadwal | Dermaga Waktu | Linimasa proyek dan jadwal menu |
| 4 | Memonitor kemajuan proyek | Laboratorium Hutan | Draf menu yang sudah direvisi |
| 5 | Menguji hasil | Dapur Uji Rasa | Menu terpilih berbasis bukti |
| 6 | Mengevaluasi pengalaman + produk akhir | Kantin Nusantara | Prototype menu sehat harian |

| ID | Kebutuhan | Status |
| :-- | :-- | :-- |
| F-PJ-01 | POS 1–5 masing-masing berisi stimulus data dan 10 soal pilihan ganda dengan kunci serta feedback benar/salah dari dokumen | Ada |
| F-PJ-02 | Setiap anggota memilih jawaban sendiri; jawaban kelompok baru bisa dikunci bila semua anggota yang daring sudah memilih. Isi pilihan teman dibuka setelah soal terkunci | Ada |
| F-PJ-03 | Benar di percobaan 1 = 10 poin, percobaan 2 = 5 poin, dua kali salah = 0 lalu kunci dibuka. Feedback salah tidak membuka kunci. Maksimal 100 per POS | Ada |
| F-PJ-04 | POS berikutnya terbuka bila semua soal selesai dan skor ≥ 70, atau kelompok menandai sudah membaca ulang feedback semua soal yang tidak benar di percobaan pertama | Ada |
| F-PJ-05 | Urutan pilihan diacak tetap per siswa; kunci disimpan berdasarkan isi, dan huruf di teks feedback disesuaikan | Ada |
| F-PJ-06 | Logbook digital luaran POS 1–5 milik kelompok, tampil lagi di POS 6 | Ada |
| F-PJ-07 | POS 6: kartu bahan (gizi, harga, asal daerah, alergen), porsi, cara olah yang mengubah lemak, cek otomatis 10 kriteria dengan feedback, lembar spesifikasi, tombol sajikan yang aktif bila semua kriteria terpenuhi | Ada |
| F-PJ-08 | Rubrik 6 aspek: 3 aspek dihitung otomatis (gizi, keterjangkauan, pangan lokal), semuanya bisa diisi/ditimpa guru di detail siswa | Ada |
| F-PJ-09 | 5 pertanyaan refleksi individu dengan feedback otomatis sederhana (berbukti vs perlu diperbaiki) setelah menu disajikan | Ada |
| F-PJ-10 | Server berwenang: skor dihitung ulang dari kunci, maksimal 2 percobaan, POS terkunci ditolak | Ada |

Catatan keputusan: skor analisis PjBL (maks. 500) **terpisah** dari skor ekspedisi 420, sehingga rapor, peringkat, dan saldo Butik tidak berubah. Gerbang 70 poin berlaku untuk jalur PjBL, tidak mengunci wilayah pos di dunia 3D. Nilai gizi kartu bahan POS 6 adalah data simulasi yang disusun agar contoh menu acuan guru lolos semua kriteria (energi contoh dihitung 640 kkal, bukan 610, karena 610 di bawah ambang 615). Data luring/tamu tersimpan di perangkat dan tidak digabung otomatis ke server.

## 6. Kebutuhan non-fungsional

| ID | Area | Kebutuhan |
| :-- | :-- | :-- |
| NF-01 | Perangkat | Berjalan di laptop 4 GB RAM, 1366 × 768, Chrome/Edge sekolah. Diuji juga pada lebar 1024 px, zoom 125%, layar sentuh |
| NF-02 | Performa | Peta siap interaksi ≤ 4 detik pada 5 Mbps; 60 fps sasaran, 30 fps batas bawah; heap JS ≤ 80 MB pada uji 15 menit |
| NF-03 | Ukuran | Sasaran awal Paket Persiapan: transfer awal ≤ 1,5 MB, seluruh aset ≤ 5 MB. Perlu diukur ulang karena versi 3D memuat Three.js dan ilustrasi WebP |
| NF-04 | Luring | Three.js disimpan lokal; game jalan di LAN tanpa internet dan sebagai satu pemain tanpa server |
| NF-05 | Kapasitas | Satu instance melayani satu kelas hingga 60 akun (`NUTRANTARA_MAX_PLAYERS`); kelas tambahan memakai instance terpisah |
| NF-06 | Jaringan | Setelah 1.1: lalu lintas keluar ≤ ±2 Mbps untuk 60 siswa daring |
| NF-07 | Aksesibilitas | Navigasi Tab/Enter, status tidak hanya dengan warna, teks untuk pesan penting, `prefers-reduced-motion` dihormati, Tab tidak dipakai untuk fungsi game |
| NF-08 | Keamanan | HTTPS wajib saat lewat internet; CSP `script-src 'self'`, tanpa CDN; PIN admin 6–64 karakter tidak dicatat di log; rate limit masuk, kode regu, dan pesan |
| NF-09 | Privasi | Tidak menyimpan nama lengkap, NIS, email, HP, tanggal lahir, foto, IP, atau info perangkat. Obrolan dapat dibaca guru dan siswa diberi tahu. Mengikuti UU PDP untuk data anak |
| NF-10 | Ketahanan data | Kehilangan data ≤ 1 detik saat proses mati, ≤ 30 menit saat berkas rusak; pulih ≤ 10 menit oleh guru dengan panduan |
| NF-11 | Operasional | Deploy Render di luar jam pelajaran (jeda beberapa detik); snapshot disk harian 7 hari; ekspor guru mingguan |
| NF-12 | Bahasa | Semua teks antarmuka, komentar, dan dokumen dalam bahasa Indonesia |
| NF-13 | Orisinalitas | Inspirasi genre boleh, tetapi karakter, level, dan tampilan tidak meniru game yang ada. Sumber dan lisensi aset dicatat |
| NF-14 | Pemeliharaan | Tanpa build step. `missions.js` dan `world-data.js` tetap skrip biasa yang dipakai bersama browser dan server. Perubahan skor diperbarui di `game.js`, `server.js`, dan `test/smoke.js` sekaligus. Perubahan bentuk state menaikkan `SCHEMA_VERSION` |
| NF-15 | Biaya | Render Starter + disk 1 GB, sekitar US$7/bulan ditambah disk, atau tanpa biaya pada mode LAN |

---

## 7. User story dan kriteria penerimaan

### Siswa

**US-01. Masuk tanpa identitas pribadi**
Sebagai siswa, saya ingin mendaftar dengan alias dan kata sandi, agar bisa bermain tanpa memberikan data pribadi.
- Pendaftaran tidak meminta email atau nama lengkap, dan layar mengingatkan untuk tidak memakai nama asli.
- Bila guru mengatur kode kelas, pendaftaran tanpa kode yang benar ditolak dengan pesan yang jelas.
- Setelah muat ulang dalam 30 hari, siswa tetap masuk tanpa mengetik ulang kata sandi.

**US-02. Tahu ke mana harus pergi**
Sebagai siswa, saya ingin selalu tahu tujuan berikutnya, agar tidak tersesat di dunia terbuka.
- HUD menampilkan misi berikutnya dan jaraknya; ada suar cahaya di tujuan dan panah penunjuk.
- Pos yang terkunci terlihat terkunci dengan label teks, bukan hanya warna.
- Pada uji kelas, ≥ 70% siswa menemukan Terminal Arsip Pos 1 tanpa bantuan lisan.

**US-03. Menganalisis bukti sebelum menyimpulkan**
Sebagai siswa, saya ingin memindai arsip data dan membandingkannya, agar kesimpulan saya berdasar bukti.
- Papan Laporan baru bisa dijawab setelah stasiun bukti pos itu selesai.
- Angka Pos 1–5 berlabel data simulasi.
- Data yang sama nilainya pada dua menu tidak dianggap bukti perbedaan (berlaku pada varian Pos 1).

**US-04. Jawaban salah tidak menghentikan saya**
Sebagai siswa, saya ingin tetap lanjut walau salah menjawab, agar tidak frustrasi dan tetap belajar dari kesalahan.
- Jawaban salah mendapat 0 poin, lalu Nara menampilkan jawaban tepat dan penjelasannya.
- Tantangan yang sudah dijawab tidak bisa dijawab ulang, baik lewat antarmuka maupun lewat konsol (server menolak dan memberi flag).

**US-05. Menyegel pos dengan alasan saya sendiri**
Sebagai siswa, saya ingin menulis alasan di Paspor lalu menyegel pos, agar kemajuan saya tercatat.
- Tombol segel tidak aktif sebelum semua tantangan dijawab dan alasan mencapai panjang minimum.
- Segel menambah 20 poin dan satu lencana, membuka jembatan ke pos berikutnya, dan menampilkan kartu Hasil Pos.
- Alasan tersimpan atas nama siswa sendiri, bukan regu.

**US-06. Merancang dan merevisi menu lokal**
Sebagai siswa, saya ingin merancang menu dari bahan lokal, menerima telaah, dan merevisinya, agar menjawab pertanyaan proyek.
- Rancangan awal menyimpan sasaran, bahan, bentuk (mentah/olahan), berat porsi, sumber data, dan perkiraan gizi.
- Perkiraan gizi per bahan = nilai per 100 g × berat (g) ÷ 100, dan total per porsi dijumlahkan. Nilai yang tidak tersedia ditandai "data belum tersedia".
- Pos 6 hanya bisa disegel setelah rancangan awal, telaah, dan revisi tersimpan, serta refleksi individu terisi.

**US-07. Bermain bersama regu walau tidak bersamaan**
Sebagai anggota regu, saya ingin mengerjakan bagian saya kapan saja, agar regu tetap maju walau jadwal kami berbeda.
- Peran saya di setiap pos terlihat di HUD regu.
- Pekerjaan anggota yang bermain pada waktu berbeda tidak saling menimpa.
- Bila anggota lain tidak aktif lebih dari 24 jam, satu suara cukup untuk mengunci jawaban regu.

**US-08. Melihat hasil belajar saya**
Sebagai siswa, saya ingin melihat rapor di akhir, agar tahu kekuatan dan yang perlu saya pelajari lagi.
- Rapor menampilkan predikat, skor, jawaban benar, penilaian per pos, kekuatan, dan yang perlu ditingkatkan.
- Rapor terbuka otomatis setelah segel terakhir dan bisa dicetak atau disimpan sebagai PDF.
- Isi Paspor JSON yang diunduh sama dengan yang tampil di layar.

**US-09. Bermain di laptop lama atau dengan papan ketik**
Sebagai siswa dengan laptop lama atau kebutuhan aksesibilitas, saya ingin mode ringan dan kontrol papan ketik, agar tetap bisa mengikuti pelajaran.
- Pilihan 3D Ringan dan 2D tersedia dan tersimpan.
- Semua tindakan misi bisa dilakukan dengan Tab/Enter.
- Dengan `prefers-reduced-motion`, animasi besar dimatikan.

### Guru

**US-10. Menjalankan kelas dengan mudah**
Sebagai guru, saya ingin menyalakan server dan membagikan alamat, agar siswa bisa langsung bergabung.
- `npm start` menampilkan alamat pemain, alamat admin, dan PIN.
- Di Render, `/health` menunjukkan `"storage": true` sebelum kelas dimulai.

**US-11. Mengatur jalannya pertemuan**
Sebagai guru, saya ingin membuka pos sesuai jadwal dan menjeda kelas, agar pembelajaran tetap terarah.
- Pos yang ditutup guru tidak bisa dimasuki siapa pun, termasuk lewat jembatan.
- Jeda menutup layar semua siswa dengan pesan, dan progres tetap aman.
- Pengumuman muncul di layar semua siswa dalam beberapa detik.

**US-12. Memantau siapa yang butuh bantuan**
Sebagai guru, saya ingin melihat progres, layar aktif, dan flag per siswa, agar bisa membantu yang tertinggal.
- Tabel penjelajah menampilkan skor, segel, benar/dijawab per pos, dan layar aktif.
- Flag ⚠ muncul bila ada segel tidak sah atau upaya mengganti jawaban, dengan penjelasan.
- Detail siswa menampilkan jawaban, alasan, rancangan menu, refleksi, dan nomor varian.

**US-13. Menilai kontribusi dalam regu**
Sebagai guru, saya ingin melihat kontribusi tiap anggota, agar nilai individu adil.
- Bagian Regu Proyek menampilkan kemajuan per pos, kontribusi, dan log pengambilalihan tugas.

**US-14. Mengekspor data untuk penilaian dan penelitian**
Sebagai guru peneliti, saya ingin mengekspor data kelas, agar bisa menilai dengan rubrik dan menganalisis hasil.
- Ekspor JSON dan CSV memuat skor, `posN_benar`, alasan, rancangan, dan refleksi, tanpa hash kata sandi dan sesi.
- (1.1) Ekspor anonim mengganti id dengan kode acak dan menghapus alias.

**US-15. Tidak kehilangan data kelas**
Sebagai guru, saya ingin data kelas tetap aman walau server bermasalah, agar kerja siswa tidak hilang.
- Bila `classroom.json` rusak saat server mulai, berkas lama disimpan dengan nama lain dan data dipulihkan dari cadangan terbaru.
- Cadangan bergulir dibuat secara berkala di `data/backup`.
- Panduan pemulihan bisa diikuti guru dalam ≤ 10 menit.

---

## 8. Risiko

| Risiko | Dampak | Kemungkinan | Mitigasi |
| :-- | :-- | :-- | :-- |
| **Perluasan scope terus-menerus.** Scope sudah berubah dari satu pemain ke 3D multipemain dunia terbuka dengan regu dalam beberapa hari | Uji kelas dan validasi tertunda, versi penelitian tidak stabil | Tinggi | Bekukan pekerjaan Must sebelum beta; fitur baru masuk backlog 1.2+ |
| **Kunci jawaban terkirim ke browser** | Siswa paham teknis bisa membaca kunci sebelum menjawab | Sedang | Cukup untuk formatif. Pindahkan pemeriksaan ke server (2.0) sebelum nilai masuk rapor |
| **Perangkat sekolah tidak kuat 3D** | Siswa tertinggal atau keluar | Sedang | 3D Ringan dan 2D; uji di laptop sekolah nyata sebelum beta |
| **Wi-Fi kelas kewalahan** (±11 Mbps keluar untuk 60 siswa) | Gerak tersendat, siswa terputus | Sedang–tinggi | Siaran posisi per wilayah (1.1); uji beban sebelum kelas penuh |
| **Dunia terbuka terlalu luas untuk satu jam pelajaran** | Waktu habis untuk berjalan, bukan belajar | Sedang | Penunjuk tujuan, terjun dekat misi, objek misi dalam inti ±220 × 140 m; ukur durasi pada playtest |
| **Mengejar skor dan menebak** | Alasan dangkal | Sedang | Satu jawaban per tantangan, rubrik menilai alasan dan produk, bukan skor game |
| **Kesalahan konsep** (pencernaan = penyerapan, data simulasi dianggap nyata) | Miskonsepsi baru | Sedang | Validasi ahli materi; label simulasi; Gerbang Pilah Pos 3 |
| **Penumpang bebas dalam regu** | Nilai regu tidak mencerminkan individu | Sedang | Peran berputar, log kontribusi, alasan dan refleksi individu, tes individual |
| **Data anak dan lokasi server** (Render Singapura, UU PDP) | Masalah persetujuan atau hukum | Sedang | Alias saja, pemberitahuan orang tua/wali, mode LAN sebagai pilihan, keputusan lokasi sebelum penggunaan resmi |
| **Data kelas hilang** | Artefak penelitian hilang | Rendah (setelah cadangan bergulir) | Cadangan bergulir, snapshot Render, ekspor mingguan guru, latihan pulih |
| **Satu PIN untuk semua guru, tanpa log** | Tindakan guru tidak bisa ditelusuri | Rendah | Log tindakan guru bersama fitur nilai rapor |
| **Ketergantungan pada satu pengembang dan biaya Render** | Layanan berhenti bila tidak dibayar | Rendah–sedang | Mode LAN dan hosting statis tetap berfungsi; Dockerfile portabel |
| **Dokumen tidak selaras dengan produk** (dokumen desain masih menyebut satu pemain, nomor versi berbeda) | Validator menilai versi yang salah | Sedang | PRD ini sebagai acuan scope terbaru; selaraskan nomor versi dan catatan perubahan |

---

## 9. Peta jalan

Jadwal empat minggu di dokumen desain dipakai sebagai kerangka. Minggu 1 di dokumen desain sudah terlampaui oleh implementasi 1.0, sehingga tahap berikutnya dimulai dari alfa.

| Tahap | Isi | Kriteria lanjut |
| :-- | :-- | :-- |
| **Selesai: 0.3–1.0** | Multipemain, 3D, dunia terbuka, enam pos, penilaian dan rapor, regu PjBL, panel guru, deploy Render, kunci jawaban di server, cadangan bergulir | `npm test` dan CI lulus |
| **Tahap 1 • Alfa (minggu ke-1)** | Pengerjaan Must teknis 1.1 (batas progres, kebersihan sesi dan obrolan, nomor versi). Walkthrough enam pos oleh pengembang dengan 2 siswa uji + 1 guru. Kirim ke validator materi, media, dan pembelajaran | Enam pos bisa diselesaikan dari awal sampai Rapor; tidak ada temuan penghambat terbuka |
| **Tahap 2 • Beta (minggu ke-2)** | Perbaiki temuan validator. Siaran posisi per wilayah dan tulis asinkron. Pemberitahuan data disahkan. Playtest terbatas dengan siswa sasaran dan observer di laptop sekolah | Durasi, kebutuhan bantuan, dan kegagalan tugas tercatat; QA01–QA06 lulus |
| **Tahap 3 • Rilis uji (minggu ke-3)** | Revisi prioritas, tutorial singkat, perbandingan rancangan. Bekukan versi dengan tag Git, catatan perubahan, panduan kelas, lembar asesmen, alur penyerahan | Akses siswa teruji, cadangan dijadwalkan, persetujuan versi tersedia |
| **Tahap 4 • Uji kelas dan pengumpulan data (minggu ke-4 dan seterusnya)** | Pretest, pelaksanaan enam pos, posttest, rubrik menu awal–akhir. Hanya perbaikan bug penghambat, tanpa mengubah definisi pengukuran | Data lengkap untuk analisis |
| **Pascapenelitian (1.2)** | Revisi dari masalah berulang, telemetri, audio, kosmetik dari segel | Diprioritaskan dari temuan uji kelas |
| **Bila dipakai untuk nilai resmi atau banyak kelas (2.0)** | Pemeriksaan jawaban di server, audit log, SQLite, multi-kelas, keputusan lokasi server | Pemicu di bagian 4.4 terjadi dan keputusan pemilik produk tersedia |

---

## 10. Pertanyaan terbuka untuk pemilik produk

1. Apakah nilai NUTRANTARA akan masuk rapor resmi, atau hanya formatif dan data penelitian? Jawaban ini menentukan apakah pemeriksaan jawaban di server masuk 1.1 atau 2.0.
2. Uji kelas memakai mode LAN (laptop guru) atau Render Singapura? Ini menentukan isi pemberitahuan data.
3. Berapa kelas dan siswa yang ikut uji, dan berapa pertemuan yang tersedia untuk enam pos?
4. Apakah durasi per pos perlu dicatat otomatis (telemetri) atau cukup oleh observer?
5. Apakah dokumen desain akan diperbarui agar sesuai produk 1.0 (multipemain, regu, aturan satu jawaban), terutama untuk instrumen validasi?
