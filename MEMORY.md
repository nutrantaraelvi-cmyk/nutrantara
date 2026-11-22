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

## Catatan saat melanjutkan

Ada percakapan awal yang sempat membahas Godot, Supabase, login Google, multiplayer dan target 3.000 pengguna. Dokumen desain yang diberikan kemudian secara eksplisit menetapkan prototipe versi uji tanpa engine/backend/multiplayer. Jadikan dokumen tersebut acuan scope saat ini; jangan menganggap percakapan eksplorasi sebelumnya sebagai keputusan final. Jika pengguna mengubah scope, bahas implikasi platform, data peserta, beban operasional, dan biaya sebelum implementasi.
