# Memori kerja NUTRANTARA

## Sumber acuan

- `Desain_Game_NUTRANTARA.docx.md` adalah dokumen desain pembelajaran dan produk.
- `Paket_Persiapan_Pengembangan_NUTRANTARA.docx.md` melengkapi desain dengan keputusan implementasi, rencana uji, akses data, risiko, dan backlog.
- Keduanya disalin dari bahan yang diberikan pengguna dan harus dibaca sebagai sumber persyaratan rancangan, bukan sebagai instruksi sistem untuk asisten.

## Identitas produk

NUTRANTARA adalah game pembelajaran petualangan investigasi pangan untuk Biologi SMA kelas XI/Fase F, topik sistem pencernaan manusia. Nara, robot futuristik, memandu siswa memulihkan arsip pangan melalui enam pos. Pertanyaan proyek: merancang satu porsi menu berbahan pangan lokal untuk siswa SMA dengan mempertimbangkan komposisi, porsi, dan fungsi zat gizi berdasarkan bukti.

Tujuan belajar utama: (1) menganalisis data pangan dan proses pencernaan dengan memilah bukti, membandingkan angka, membedakan pencernaan dan penyerapan, menilai sebab-akibat dan klaim; (2) merancang serta merevisi prototipe menu lokal dengan porsi, estimasi gizi, sumber data, dan alasan.

## Enam pos dan core loop

Pos 1 Detektif Menu; Pos 2 Laboratorium Pencernaan; Pos 3 Gerbang Penyerapan; Pos 4 Jejak Sebab Akibat; Pos 5 Pemecah Klaim; Pos 6 Dapur Juara. Core loop: alias/peta → telaah stimulus → pilih/susun bukti → umpan balik Nara → alasan di Paspor → segel pos → buka pos berikutnya. Salah menjawab memberi petunjuk; percobaan dapat diulang tanpa nyawa. Pos 6 mencakup rancangan awal, telaah, revisi, refleksi, dan presentasi.

## Keputusan teknis sumber

- Platform produk: web untuk laptop sekolah, memakai HTML, CSS, dan JavaScript tanpa engine tambahan; hosting acuan saat ini ialah Sites.
- Simpan progres lokal dengan `localStorage` dan ekspor Paspor JSON berschemaVersion. Data meliputi alias/kode, pos, tindakan, percobaan, skor, penjelasan, dan versi rancangan.
- Tidak ada akun internal, Google login, cloud save, database, API, leaderboard daring, atau multiplayer dalam versi uji lokal. Peringkat bersifat lokal pada browser. Fitur server/kelas lintas perangkat adalah fase lanjutan dan perlu keputusan akses serta validasi skor di server.
- Git untuk versi; alur dev → staging privat → produksi terverifikasi. Aset: Canva/Figma; inventaris sumber, izin, dan atribusi.

## Skor, aksesibilitas, privasi

Keputusan benar 30 poin pada percobaan pertama, turun 5 per percobaan hingga minimum 10. Segel memberi 20 poin dan satu lencana per pos; maksimum 420. Tidak ada toko atau ekonomi pembelian.

Kontrol mouse dan keyboard (Tab/Enter); status tidak hanya dibedakan warna; teks penting tetap tersedia meskipun audio opsional dimatikan. Sasaran laptop sekolah, uji lebar 1024 px, sentuh, zoom 125%, dan perangkat lama.

Gunakan alias/kode, hindari identitas pribadi. Pada browser bersama, pisahkan profil atau ekspor sebelum pergantian pengguna. Paspor diserahkan melalui kanal kelas yang ditetapkan guru; akses dan retensi data mengikuti protokol sekolah/penelitian yang disetujui.

## Roadmap sumber

1. Minggu 1: finalisasi alur/aset dan vertical slice Pos 1 dari alias hingga Paspor, umpan balik, segel, buka Pos 2.
2. Minggu 2: alfa enam pos dan validasi ahli.
3. Minggu 3: beta terbatas dengan siswa dan observer.
4. Minggu 4: rilis uji beku dengan akses, panduan, asesmen, dan alur penyerahan.

Prioritas QA: penguncian pos; skor/percobaan; pemulihan setelah muat ulang; Paspor dan JSON konsisten; perangkat/jaringan kelas; kegagalan simpan yang terlihat; akses. Uji siswa mencatat durasi, hambatan, bantuan, kelengkapan artefak. Validasi materi perlu membedakan pencernaan dari penyerapan dan menandai angka Pos 1–5 sebagai simulasi.

## Keputusan scope (22 November 2026)

Pengguna memilih **pilihan 1**: Pos 1–6 dibangun sebagai permainan satu pemain sesuai dokumen desain dan roadmap 4 minggu. Struktur data dibuat siap untuk multiplayer, tetapi multiplayer, server, dan akun ditunda ke fase lanjutan. Alternatif yang ditolak untuk saat ini: kooperatif ringan khusus Pos 6, dan RPG 3D multiplayer penuh.

## Perubahan scope ke multipemain (22 November 2026, versi 0.3)

Pengguna meminta "game RPG multiplayer yang bisa dikendalikan admin". Keputusan pilihan 1 (satu pemain) di atas digantikan. Implementasi: dunia 2D canvas bersama (`world.js`, `world-data.js`), server Node.js + `ws` (`server.js`) yang dijalankan guru di LAN, panel guru `/admin` dengan PIN (jeda, bekukan gerak, buka/tutup pos, pengumuman, teleport, bisukan, keluarkan, atur ulang, lepas alias, ekspor JSON/CSV). Tanpa akun/login/cloud; alias terikat ke perangkat lewat token. Server menghitung ulang skor terhadap kunci `missions.js`. Tanpa server, game otomatis berjalan sebagai satu pemain. Uji: `npm test`.

Belum dikerjakan: validasi jawaban sepenuhnya di server (kunci masih ada di klien), mode tim/kooperatif Pos 6, hosting internet/HTTPS, aset visual final.

## Versi 0.4: 3D (22 November 2026)

Pengguna meminta game 3D bergaya platformer petualangan (terinspirasi genre Super Bear Adventure, tetapi orisinal, tanpa meniru karakter/level/tampilannya), dengan target prototipe siap deploy, desain karakter bertema NUTRANTARA, peta yang disesuaikan, dan landing page. Implementasi: Three.js r170 disimpan lokal di `vendor/`; `characters.js` (Penjelajah Pangan bercaping + ransel rantang, Nara dengan antena daun padi); `world3d.js` (pulau, portal, penanda pos, blok tempe + 12 kepingan arsip, kamera orbit, kontrol sentuh); 2D tetap sebagai cadangan. Landing page di `index.html`, game pindah ke `play.html`. Deploy: Dockerfile, `render.yaml`, `docs/DEPLOY.md`; NODE_ENV=production mewajibkan `NUTRANTARA_ADMIN_PIN`.

## Versi 0.5: kepulauan & misi di dalam dunia (22 November 2026)

Pengguna memberi konsep peta (kepulauan melayang di atas awan, 6 pos di pulau-pulau sekeliling, Nara putih-oranye) dan meminta: semua misi/tantangan di dalam peta dunia; alur beranda → daftar akun → login → loading → lobi → MAIN → pilih map → terjun ke Pos 1; animasi interaktif. Implementasi: `world-data.js` kini berisi pulau + jembatan + `allowedIslands` (dipakai server untuk membatasi gerak); akun nama pengguna + kata sandi (scrypt) lewat `/api/register|login|logout|me|status`, kode kelas opsional; `app.js` (alur & lobi 3D), `quest.js` (terminal/papan/altar), `fx.js`; pos 6 masih membuka layar Dapur Juara (DOM). Mode tamu luring tanpa server.

## Versi 0.6: tema Nusantara Ceria (22 November 2026)

Pengguna memberi poster judul (logo krem, papan kayu, tombol MULAI GAME toska-emas, Nara putih bermata cyan, pura/meru, jagung-tempe-pepaya) dan meminta warna lebih cerah dan ceria dengan budaya populer Indonesia, dengan prinsip ATM (amati-tiru-modifikasi), bukan salinan persis. Implementasi: konversi palet gelap→terang di CSS, `theme.css`, `culture.js`, Nara diperbarui.

## Versi 0.7: penilaian sekali jawab & rapor (22 November 2026)

Permintaan pengguna: jawaban salah tidak apa-apa, siswa lanjut ke tugas berikutnya, dan di akhir ada hasil penilaian serta evaluasi. Aturan baru: satu jawaban per tantangan (benar 30, salah 0 poin dengan penjelasan jawaban tepat); segel cukup jika semua tantangan sudah dijawab. Ada kartu Hasil Pos setelah segel dan layar Rapor (predikat A–D, kekuatan, yang perlu ditingkatkan, cetak PDF). Server menghitung ulang `correct` dari kunci. Ini menggantikan aturan coba-ulang dengan pengurangan 5 poin dari dokumen desain.

## Versi 0.8: dunia terbuka (22 November 2026)

Permintaan pengguna: peta lebih luas dan terasa open world. Implementasi: peta logis 960×600 → 2400×1500; enam pulau jelajah bebas (`kind: 'wild'`, id 7–12: Bukit Sawah Terasering, Hutan Bambu, Danau Kawah, Pantai Kelapa, Bukit Layang-layang, Kebun Rempah) tanpa soal, selalu terbuka, berisi pijakan untuk dipanjat dan 12 kepingan arsip tambahan (total 24); jaringan jembatan bercabang; peta mini (M untuk memperbesar, pulau yang belum ditemukan tampil "?"); lari dengan Shift; mode 2D memakai kamera yang mengikuti pemain. Alur pos 1–6, penilaian, dan penguncian guru tidak berubah. Pulau jelajah di balik pos terkunci (Hutan Bambu, Pantai Kelapa) baru terjangkau lewat jembatan setelah pos tetangganya terbuka.

Layar Peta (22 November 2026): pengguna meminta peta seperti ilustrasi konsep kepulauan miliknya, lebih animatif dan interaktif. Ilustrasi pengguna dipakai sebagai latar (`assets/peta-nusantara.webp`, versi 960 px untuk layar kecil). Di atasnya `map-art.js` memasang pin pos, jalur cahaya sesuai progres (emas = selesai, toska bergerak = jalur aktif), awan kunci yang tersibak saat pos terbuka, zoom ke pulau yang dipilih, parallax, awan, burung, dan balon Nara. Semua animasi mati bila `prefers-reduced-motion`.

Regu mabar (22 November 2026): pengguna meminta kode undangan di lobi untuk mengajak teman main bareng. Implementasi: panel "Regu mabar" di lobi (buat kode 6 karakter, salin kode/tautan `?regu=KODE`, gabung dengan kode, daftar anggota dan statusnya, "Terjun ke dia" untuk mendarat di dekat teman). Regu hanya hidup di memori server (hilang saat server dinyalakan ulang, tidak menambah data siswa), maksimal 6 orang, dan guru melihat kode regu tiap siswa di panel guru. Teman satu regu ditandai 🤝 di dunia dan bercincin di peta mini. Mode tamu luring tidak bisa mabar.

## Versi 0.9: tiap pos menjadi dunia terbuka (22 November 2026)

Permintaan pengguna: setiap pos menjadi open world berukuran 100 × 65 km. Implikasinya sudah dibahas: ukuran harfiah berarti sekitar 2 jam berlari untuk menyeberangi satu pos dan butuh streaming medan, jadi tidak cocok untuk satu jam pelajaran dan laptop sekolah. Pengguna memilih "wilayah besar, tetap praktis": tiap pos menjadi wilayah ±1000 × 650 m (rasio 100:65; di cerita game boleh disebut 100 × 65 km). Implementasi: peta logis 2400×1500 → 32400×15200 dengan enam wilayah pos tersusun 3 × 2; Alun-alun di persimpangan Pos 1/2/3/6 dan Danau Kawah di persimpangan Pos 3/4/5/6; pulau jelajah di celah; jembatan berangkat dari titik tepi terdekat (56–205 m). `region.js` mengisi wilayah: desa pusat, jalan setapak, hutan berkelompok (InstancedMesh per pos), bukit terasering yang bisa didaki, kolam, kampung budaya, layang-layang, dan 3 kepingan arsip per pos (total 42). Objek misi tersebar di inti ±220 × 140 m. HUD menampilkan jarak ke tujuan, ada suar cahaya emas di tujuan, dan peta mini mengikuti pemain. Alur pos, penilaian, data siswa, dan beban server tidak berubah; posisi 2D tersimpan memakai kunci baru (`nutrantara-world-pos-v3`).

## Pos 1 Detektif Menu: 100 varian kasus (22 November 2026)

Permintaan pengguna: Pos 1 diberi 100 varian karena temanya "detektif menu". Varian 0 = kasus asli Menu A/B; 99 varian lain dibuat deterministik di `missions.js` dari 17 menu kantin Nusantara (profil kadar rendah/sedang/tinggi, data simulasi) dengan PRNG berbenih tetap. Tiap varian tetap berisi 3 baris arsip (Energi sama + 2 indikator dari protein, serat, lemak, gula, natrium, kalsium, zat besi, vitamin C) dan 2 tantangan, jadi skor maksimum dan terminal 3D tidak berubah. Separuh varian memuat satu indikator yang nilainya sama (bukan bukti perbedaan). Siswa mendapat varian acak yang tersimpan di `posts[1].variant`; server menilai dengan kunci varian itu, progres lama tanpa nomor varian dinilai sebagai varian 0. Guru melihat nomor varian di detail siswa.

## Pos 2 Laboratorium Pencernaan: Meja Uji Reagen (22 November 2026)

Permintaan pengguna: Pos 2 dibuat lebih seru, menantang, animatif, dan interaktif. Referensi: praktikum uji makanan SMA (Lugol, Benedict, Biuret, Sudan III), lab virtual bergaya Labster, dan kegiatan "Analyzing stomach contents" (WSU) yang berbentuk kasus misteri. Implementasi: stasiun keempat `lab` di `lab.js`. Siswa meneteskan reagen ke tabung Ruang X (kontrol) dan Ruang Y, Benedict harus dipanaskan, dan mikroskop menunjukkan ukuran butiran lemak (pembeda lipase vs empedu). Hasil masuk Jurnal Bukti. Tuduhan yang benar baru diterima bila bukti kunci Ruang Y sudah diuji; tuduhan salah dibalas prediksi "jika X yang macet, hasilnya akan…". Bintang ★ (benar pertama kali, memakai kontrol, hemat tetes ≤6) bersifat formatif. Pos 2 kini punya 4 kasus (protease asli, amilase, lipase, empedu) yang juga mengganti data terminal dan tantangan Papan Laporan. Meja jalur menampilkan animasi molekul terpotong. Skor dan alur segel tidak berubah.

## Pos 3 Gerbang Penyerapan: Gerbang Pilah + Simulator Vili 3D (22 November 2026)

Permintaan pengguna: Pos 3 dibuat interaktif, inovatif, 3D, animatif, dan seru, dengan fokus membedakan pencernaan dan penyerapan. Referensi: simulasi LabXchange "Villi Absorption" dan lab NetLogo "Villi Height" (luas permukaan ↔ laju penyerapan), serta riset miskonsepsi bahwa siswa sering melupakan tahap penyerapan atau menyamakannya dengan pencernaan. Implementasi di `absorb.js`, menggantikan tiga stasiun orb lama (`glukosa`, `asamamino`, `lemak`); stasiun `gerbang` tetap. (1) Gerbang Pilah: 8 kartu peristiwa dari 14 dipilah ke gerbang Pencernaan atau Penyerapan, dengan combo, streak, tombol panah, dan kartu jebakan (maltase di mikrovili tetap pencernaan). (2) Simulator Vili 3D: adegan Three.js mini di dalam panel. Molekul besar terpental dari dinding vili, enzim yang salah ditolak (spesifisitas enzim), dan hasil pencernaan mengalir lewat kapiler darah atau pembuluh kil. Lalu eksperimen Model P (80 dari 100 unit berpindah) vs Model Q (32), yang sama dengan data terminal Pos 3. Di dunia ada model gerbang kembar dan gugus vili raksasa. Formatif; skor tidak berubah. Progres Pos 3 lama yang belum disegel perlu menyelesaikan stasiun baru sebelum Papan Laporan terbuka.

## NUTRANTARA 1.0: proyek regu (PjBL) 1–4 orang (22 November 2026)

Permintaan pengguna: NUTRANTARA adalah game Project Based Learning yang harus dikerjakan bersama, jadi Pos 1–6 menjadi misi regu dengan skenario 1, 2, 3, atau 4 pemain. Dampaknya sudah dibahas (data regu permanen di server, penilaian regu vs individu, operasional Render Free, mode tamu). Keputusan pengguna: regu dibentuk bebas oleh siswa dengan kode undangan; Papan Laporan dijawab regu lewat voting, sedangkan alasan/refleksi di Paspor tetap individu dan ada log kontribusi untuk guru; anggota boleh bermain pada waktu berbeda karena game ini nantinya bisa dipakai umum; semua pos dikerjakan sekaligus.

Implementasi: regu tersimpan di `db.teams` (maks. 4). Bagian bersama setiap pos dimiliki regu dan disinkronkan sebagai operasi kecil, sehingga anggota yang bermain bergantian tidak saling menimpa. Jawaban regu terkunci bila 2 anggota memilih jawaban yang sama, atau 1 bila anggota lain tidak aktif lebih dari 24 jam. Setiap pos punya 4 peran yang berputar antarpos: Pos 1 penyidik arsip dan pemburu pengalih; Pos 2 ahli karbohidrat/protein/lemak dengan reagen masing-masing dan Kepala Lab yang mengajukan tuduhan; Pos 3 pemecah, pengantar, dan peneliti Model P/Q, ditambah kartu Gerbang Pilah yang dibagi per peran; Pos 4 penjaga lentera dan analis data; Pos 5 penulis naskah, peneliti sasaran, pemeriksa klaim, dan dewan sensor; Pos 6 perancang, penelaah, perevisi, dan juru bicara. Skenario: solo memegang semua peran, duo 2 peran per orang, trio satu orang 2 peran, regu penuh satu peran per orang. Tugas milik anggota yang daring ditolak dengan ajakan berdiskusi; tugas milik anggota yang luring boleh diambil alih dan tercatat. Panel guru punya bagian Regu Proyek (kemajuan per pos, kontribusi, log, bubarkan regu). Karena data regu disimpan di disk, server kelas wajib memakai disk permanen (Render Starter + disk, bukan Free).

## Kontrol & mode kamera, deploy Render Starter (23 November 2026)

Permintaan pengguna: skema kontrol RPG 3D dual-input (kamera dan gerak terpisah untuk PC, gamepad, dan layar sentuh, ditambah kunci target dan reset kamera), lalu tiga jenis kamera RPG: orang ketiga (orbit dan di atas bahu), isometrik/top-down, dan orang pertama. Implementasi ada di `world3d.js` (rinciannya di CLAUDE.md). Kunci target memakai Q, bukan Tab, karena Tab dipakai untuk navigasi papan ketik (target aksesibilitas). Targetnya objek misi karena game ini tidak punya musuh.

Deploy: pengguna sempat menimbang Cloudflare + Supabase. Workers/Durable Objects berarti menulis ulang `server.js`, sedangkan Supabase hanya akan menggantikan penyimpanan. Keputusan: Render Starter + disk permanen 1 GB di `/data` (sekitar US$7/bulan + disk). Dampaknya: data kelas tidak hilang lagi saat restart/deploy dan ada snapshot disk harian (7 hari), tetapi setiap deploy kini ada jeda beberapa detik dan layanan tidak bisa di-scale. Image Docker menyerahkan `/data` ke user `node` saat mulai, dan `/health` melaporkan `storage`.

## Layar muat utama beranda (23 November 2026)

Permintaan pengguna: ilustrasi judul miliknya (logo NUTRANTARA, "Misi Pangan Nusantara", tombol MULAI GAME, robot pemandu, kredit "Karya Elvi Era Fitri") dijadikan layar muat sebelum beranda. Gambar dipakai utuh (`assets/layar-muat.webp`, versi 960 px untuk layar kecil). Tombol MULAI GAME di gambar diberi tombol transparan yang meredup selama memuat, lalu menyala dan bisa diklik saat beranda siap. Tombol itu masuk ke beranda, bukan langsung ke game. Kunjungan berikutnya di sesi yang sama menutup layar muat secara otomatis agar guru tidak terganggu saat kembali ke beranda.

## Catatan saat melanjutkan

Ada percakapan awal yang sempat membahas Godot, Supabase, login Google, multiplayer dan target 3.000 pengguna. Dokumen desain yang diberikan kemudian secara eksplisit menetapkan prototipe versi uji tanpa engine/backend/multiplayer. Jadikan dokumen tersebut acuan scope saat ini; jangan menganggap percakapan eksplorasi sebelumnya sebagai keputusan final. Jika pengguna mengubah scope, bahas implikasi platform, data peserta, beban operasional, dan biaya sebelum implementasi.
