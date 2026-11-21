# Paket Persiapan Pengembangan NUTRANTARA

Misi Pangan Nusantara • Biologi SMA Kelas XI • Sistem Pencernaan pada Manusia

Elvi Era Fitri | NIM 25012355005 | Magister Teknologi Pendidikan

# 1 GDD dan Analisis Kesiapan

Dokumen ini melengkapi Desain Game NUTRANTARA dengan keputusan implementasi dan kriteria uji. Acuan produk ialah prototipe enam pos di Sites. Target teknis, pembagian tugas, dan kebijakan pengelolaan data di bawah merupakan usulan untuk versi uji kelas.

| Bidang | Dasar yang tersedia | Pekerjaan sebelum uji kelas |
| :---- | :---- | :---- |
| **Desain** | Enam pos, Paspor, skor, lencana, dan Dapur Juara. | Uji tutorial, perkembangan kesulitan, dan hubungan bukti dengan keputusan proyek. |
| **Teknis** | Web statis, penyimpanan lokal, ekspor JSON. | Uji laptop sekolah dan akses siswa. Tetapkan prosedur cadangan data. |
| **Aset** | Robot Nara, peta, dan ilustrasi Pos 1–5. | Inventarisasi sumber dan izin, siapkan aset Dapur Juara dan alternatif teks. |
| **Proyek** | Rancangan pos dan prototipe yang dapat dimainkan. | Tetapkan penanggung jawab, backlog, serta kriteria lulus tiap milestone. |
| **Kualitas** | Alur inti pernah diuji di peramban. | Uji kompatibilitas, pemulihan, validasi ahli, dan playtest siswa. |
| **Publikasi** | Prototipe Sites privat. | Tentukan akses peserta, panduan kelas, pemberitahuan data, dan alur dukungan. |

## Identitas permainan

Petualangan investigasi pangan untuk kelas XI. Nara memandu siswa memulihkan arsip dari berbagai dimensi. Pertanyaan proyeknya ialah bagaimana merancang satu porsi menu pangan lokal yang layak untuk siswa sekolah dan dapat dipertanggungjawabkan dengan bukti komposisi serta konsep pencernaan.

## Core loop dan penyelesaian

Masuk portal → telaah stimulus → pilih atau susun bukti → terima konsekuensi dan umpan balik → catat alasan → segel pos → buka portal berikutnya. Keputusan keliru menahan tantangan dan memunculkan petunjuk. Penjelajah menang setelah lima segel analisis dan satu segel proyek. Percobaan dapat diulang tanpa sistem nyawa.

# 2 Desain Level Narasi dan Balancing

| Dimensi | Aktivitas inti | Bukti dan konsekuensi |
| :---- | :---- | :---- |
| **Tutorial di peta** | Masukkan alias dan coba contoh kartu bersama Nara. | Usulan satu contoh bebas skor untuk mengenalkan tindakan dan Paspor. |
| **1 Detektif Menu** | Pindai energi, protein, dan serat Menu A–B. | Data 500 kkal yang sama dibandingkan dengan protein dan serat yang berbeda. |
| **2 Lab Pencernaan** | Rakit jalur protein, protease, dan peptida. | Bukti ruang X–Y mengarahkan perbaikan jalur. |
| **3 Gerbang Penyerapan** | Lintaskan hasil pemecahan menuju sirkulasi. | Bukti dari model P–Q dipakai membedakan pemecahan dari perpindahan. |
| **4 Jejak Sebab Akibat** | Telusuri serat, air minum, dan aktivitas. | Data beberapa faktor memicu kebutuhan pembanding tambahan. |
| **5 Pemecah Klaim** | Urutkan data, kesimpulan, dan asumsi iklan. | Siswa menguji klaim dan memilih data yang masih dibutuhkan. |
| **6 Dapur Juara** | Rancang, telaah, revisi, dan refleksikan menu. | Simpan sasaran, bahan, porsi, estimasi gizi, sumber, dan alasan revisi. |

## Ekonomi permainan

Poin keputusan = maksimum dari 10 atau 30 dikurangi 5 kali jumlah percobaan sebelumnya. Sepuluh keputusan dan enam segel bernilai maksimum 420. Setiap segel memberi satu lencana tetap. Lencana merupakan penghargaan capaian. Harga, toko, mata uang belanja, dan drop rate tidak digunakan. Saat skor seri, catatan yang masuk lebih dahulu berada di atas.

## Narasi dan respons

Nara menjelaskan bahwa arsip harus dipulihkan sebelum menu sekolah dirancang. Contoh ketika pemain keliru di Pos 1, Nara berkata “Bandingkan data protein dan serat sebelum mengirim laporan lagi.” Ketika berhasil, terminal memberi akses ke tugas berikutnya dan menjelaskan mengapa bukti tersebut relevan. Nama pos dan status portal tampil bersama ikon.

# 3 Arsitektur Teknis dan Rilis Versi

| Komponen | Keputusan |
| :---- | :---- |
| **Engine dan alat** | HTML, CSS, dan JavaScript tanpa engine tambahan. Sites untuk hosting, Git untuk sumber dan versi, Canva atau Figma untuk aset. |
| **Kode dan input** | Pisahkan definisi misi, pengelolaan progres, tampilan, serta ekspor. Gunakan klik, Tab, dan Enter. Pilihan kartu menyediakan alternatif keyboard untuk pengurutan. |
| **State dan simpan** | Simpan alias, indeks pos, langkah terselesaikan, percobaan, skor, draf, dan entri Paspor. Pulihkan setelah muat ulang. Kunci pos diperiksa pada tombol dan fungsi navigasi serta penyegelan. |
| **Backend dan jaringan** | Versi lokal memakai localStorage dan JSON dengan schemaVersion. Akun internal, cloud save, database, API, dan multiplayer tidak dibutuhkan pada uji lokal. Akses Sites tetap mengikuti pengaturan publikasi. |
| **Jika perlu peringkat kelas** | Usulan fase lanjutan memakai penyimpanan server dengan kode peserta dan kelas, serta validasi progres dan skor di server. Catatan Paspor hanya tersedia bagi pihak yang diberi akses. |
| **Platform minimum usulan** | Laptop 4 GB RAM, layar 1366 × 768, Chrome atau Edge yang tersedia di sekolah. Uji tambahan pada lebar 1024 px, layar sentuh, zoom 125%, dan keyboard. Libatkan perangkat lama yang benar-benar digunakan. |
| **Target performa** | Transfer awal ≤ 1,5 MB dan seluruh aset ≤ 5 MB. Peta siap interaksi ≤ 4 detik pada 5 Mbps. Target animasi 60 fps dengan batas uji 30 fps, dan heap JS ≤ 80 MB pada uji 15 menit. Ukur sebagai target penerimaan, bukan hasil saat ini. |

## Pipeline Git dan lingkungan

Dev untuk perubahan lokal, staging privat untuk pemeriksaan versi, dan produksi untuk versi yang telah disetujui. Usulkan pemeriksaan otomatis sintaks JavaScript, referensi aset, konsistensi data misi, dan paket hasil build sebelum deployment. Tandai versi rilis dengan tag, commit, dan catatan perubahan. Jika rilis bermasalah, aktifkan kembali versi terverifikasi dan periksa kompatibilitas penyimpanan.

# 4 Aset dan Pengalaman Pengguna

| Kebutuhan aset | Status dan spesifikasi kerja |
| :---- | :---- |
| **Karakter dan peta** | Tersedia ilustrasi Nara dan peta pulau. Gunakan WebP untuk latar dan ilustrasi. Siapkan alternatif teks untuk informasi yang dibutuhkan pemain. |
| **Latar dimensi** | Pos 1–5 memakai aset yang sudah ada. Tambahkan ilustrasi bengkel Dapur Juara dan tampilan kartu menu awal serta revisi. |
| **Ikon, animasi, dan VFX** | Gunakan ikon portal, gembok, arsip, dan enam lencana. Usulkan animasi perpindahan singkat dan sorot segel. Siapkan tampilan statis untuk preferensi gerak minimal. |
| **Palet dan huruf** | Latar #071516, panel #0E2426, teks #EBFFF6, hijau #78F4BD, biru #68DCE7, sorot #FFD17C. Inter atau sans-serif sistem. Status ditulis dengan label selain warna. |
| **Musik dan efek** | Usulan musik ambient, efek portal dan segel, serta voice-over opsional. Siapkan tombol bisu, volume, dan transkrip pesan. Catat sumber, pemegang hak, lisensi, dan atribusi sebelum digunakan. |
| **Penamaan dan struktur** | Rancangan folder assets/character, assets/world, assets/ui, assets/audio. Gunakan nama kebab-case, misalnya nara-guide.webp dan pos-01-kantin.webp. Pemetaan nama lama dicatat selama migrasi. |

## Wireframe dan menu

| Layar | Urutan komponen |
| :---- | :---- |
| **Peta** | Navigasi → alias atau tombol masuk → HUD progres, skor, lencana → peta dan rute yang dapat diklik. |
| **Pos aktif** | Kembali ke Peta → judul dimensi → pesan Nara → panel stimulus dan panel aksi → umpan balik → Paspor dan segel. |
| **Dapur Juara** | Brief → rancangan awal → telaah → revisi → refleksi. Riwayat versi dapat dibuka saat mengerjakan revisi. |
| **Arsip dan peringkat** | Paspor memuat keputusan, alasan, dan ekspor. Peringkat menampilkan alias, urutan skor, dan jumlah lencana lokal. |

# 5 Roadmap Backlog dan Tata Kerja

| Milestone usulan | Bukti agar tahap dapat dilanjutkan |
| :---- | :---- |
| **Minggu 1 • Prototipe** | Periksa rancangan alur dan aset. Petakan tujuan, stimulus, keputusan, dan bukti tiap pos. |
| **Minggu 1 • Vertical slice** | Uji tuntas Pos 1 dari alias hingga Paspor, umpan balik keliru, segel, dan buka Pos 2. |
| **Minggu 2 • Alfa** | Enam pos dapat dimainkan. Validator meninjau materi, media, dan PjBL. Perbaiki temuan penghambat. |
| **Minggu 3 • Beta** | Siswa sasaran menguji di laptop sekolah. Guru mencatat kelancaran, kebutuhan bantuan, dan hasil ekspor. |
| **Minggu 4 • Rilis uji** | Versi dibekukan untuk penelitian. Akses, panduan, lembar asesmen, dan prosedur penyerahan berfungsi. |

## Backlog MoSCoW

| Prioritas dan estimasi | Tugas |
| :---- | :---- |
| **Must • 2–3 hari** | Pengembang menguji progres, skor, pemulihan, dan ekspor. Guru memeriksa keselarasan Paspor dan proyek. |
| **Must • 2–3 hari** | Guru dan validator meninjau stimulus serta rubrik. Penguji memeriksa akses dan melakukan regresi. |
| **Should • 1–2 hari** | Pengembang menambah tutorial singkat dan tampilan perbandingan rancangan awal serta revisi. |
| **Could • 1–2 hari** | Penata visual mengembangkan efek portal, efek audio, dan animasi lencana. |
| **Ditunda dari versi uji** | Sinkronisasi lintas perangkat, peringkat daring, dan mode multiplayer. |

## Tanggung jawab dan alur komunikasi

Elvi mengarahkan materi dan penerimaan produk. Pengembang menangani implementasi serta perbaikan. Penata aset mengurus konsistensi visual dan lisensi. Validator memberi telaah. Observer mencatat keterlaksanaan. Gunakan satu daftar isu dengan pemilik, tenggat, dan bukti verifikasi. Kerjakan perubahan pada cabang pendek dengan review sebelum gabung. Git LFS dipertimbangkan jika aset biner besar bertambah.

# 6 Risiko dan Matriks Akses

| Risiko | Tanda awal | Mitigasi dan pemilik |
| :---- | :---- | :---- |
| **Jadwal dan perluasan lingkup** | Fitur tambahan menunda uji pos inti. | Elvi membekukan pekerjaan Must sebelum beta. Fitur tambahan masuk backlog berikutnya. |
| **Akses siswa** | Sites privat gagal dibuka dari akun atau perangkat kelas. | Guru memverifikasi akses sebelum sesi. Siapkan aktivitas setara untuk kendala teknis. |
| **Paspor hilang** | Data terhapus, profil berganti, atau siswa menggunakan perangkat lain. | Guru menyiapkan ekspor berkala. Pengembang menguji pemulihan dan pemberitahuan gagal simpan. |
| **Mengejar skor** | Siswa berhenti menelaah dan menebak berulang. | Guru menilai kualitas alasan dan produk dengan rubrik. Nara mengarahkan pemain kembali ke bukti. |
| **Kesalahan konsep** | Pencernaan disamakan dengan penyerapan atau data simulasi dianggap nyata. | Validator memeriksa istilah, prompt, dan label simulasi sebelum beta. |
| **Data peserta terekspos** | Identitas dimasukkan ke alias atau dokumen dikirim lewat kanal terbuka. | Guru memakai kode peserta dan kanal kelas yang dibatasi aksesnya. |

## RBAC acuan operasional

| Peran | Akses yang diusulkan |
| :---- | :---- |
| **Siswa** | Main, baca materi, isi dan ekspor Paspor pada sesi sendiri. Pada peramban bersama, gunakan profil terpisah atau selesaikan ekspor sebelum pergantian pengguna. |
| **Guru peneliti** | Menerima artefak yang diserahkan peserta, menilai, dan mengelola daftar padanan kode di lokasi terpisah. |
| **Validator dan observer** | Meninjau produk dan formulir pengujian dengan data simulasi atau data minimal yang dibutuhkan. |
| **Pengembang** | Mengubah kode dan menyiapkan versi uji. Gunakan data dummy saat pengujian teknis. |
| **Pemilik Sites** | Mengatur audiens, versi aktif, dan deployment. |

Matriks ini merupakan pembagian wewenang rancangan. Prototipe statis mengelola akses situs pada tingkat publikasi, sementara data bermain terikat profil peramban.

# 7 QA Playtest dan Data Penelitian

| ID dan skenario | Hasil yang diharapkan |
| :---- | :---- |
| **QA01 • Buka Pos 2 sebelum Pos 1 disegel** | Pos 2 tetap terkunci ketika satu aksi atau catatan belum selesai. |
| **QA02 • Kirim tindakan keliru lalu benar** | Petunjuk tampil. Langkah dan skor bertambah sekali sesuai jumlah percobaan. |
| **QA03 • Muat ulang dan buka ulang pos** | Progres dan draf pulih. Pos selesai dapat ditinjau tanpa poin tambahan. |
| **QA04 • Selesaikan Dapur Juara** | Draf awal, telaah, revisi, dan refleksi tercatat. JSON dapat dibaca dan cocok dengan Paspor. |
| **QA05 • Laptop sekolah dan jaringan lambat** | Navigasi keyboard, tampilan, ukuran paket, dan waktu muat memenuhi target atau kendalanya dicatat. |
| **QA06 • Akses, penyimpanan, dan peringkat** | Akun uji dapat membuka versi kelas. Kegagalan simpan diberi pesan. Peringkat mengurutkan skor dengan aturan seri yang konsisten. |

## Playtest dan definisi selesai

Amati tanpa langsung membantu. Catat durasi, pos yang tersendat, kebutuhan bantuan, dan kelengkapan artefak. Setiap laporan bug memuat versi, perangkat, langkah ulang, hasil yang diharapkan, hasil aktual, dan tingkat dampak. Rilis uji ketika QA inti lulus, akses siswa teruji, temuan penghambat ditutup, dan catatan persetujuan versi tersedia.

## Telemetri minimum dan asesmen

Log yang sudah tercermin dalam Paspor mencakup keputusan, percobaan dan progres. Event usulan ialah pos_dibuka, keputusan_dikirim, pos_disegel, draf_disimpan, dan paspor_diekspor. Gunakan kode, versi, nomor pos, dan hasil tindakan. Durasi dapat dicatat observer sebelum penambahan telemetri. Nilai kemampuan analisis dengan pretest–posttest individual setara dan keterampilan merancang dengan rubrik menu awal–akhir. Simpan skor permainan sebagai data proses.

# 8 Publikasi Penggunaan dan Pascarelis

## Model penggunaan

NUTRANTARA dirancang gratis untuk pembelajaran dan uji tesis. Iklan, transaksi dalam aplikasi, battle pass, dan hadiah berbayar berada di luar kebutuhan versi ini. Usulan anggaran mencakup hosting bila berbiaya, bahan purwarupa, dan penelaahan ahli sesuai kebutuhan aktual.

## Lisensi dan pemberitahuan data

Inventaris aset mencatat ID, pembuat, sumber, versi, izin, atribusi, dan status peninjauan. Periksa juga lisensi font dan pustaka yang ditambahkan. Sasaran penggunaan ialah kelas XI dengan pendampingan guru. Sebelum pengumpulan data, sesuaikan pemberitahuan peserta, proses persetujuan, retensi, dan penghapusan data dengan ketentuan sekolah serta protokol penelitian yang disetujui.

| Bagian pemberitahuan | Draf isi yang perlu disahkan sebelum uji |
| :---- | :---- |
| **Data dan tujuan** | Alias atau kode, progres, pilihan, percobaan, serta jawaban Paspor dipakai untuk pelaksanaan pembelajaran dan penelitian sesuai persetujuan. |
| **Lokasi dan pihak yang mengakses** | Progres dan peringkat versi uji tersimpan di peramban. Guru menerima ekspor jika diserahkan melalui kanal yang ditentukan. Isi jangka simpan dan kontak penanggung jawab sebelum dibagikan. |
| **Ketentuan penggunaan** | Gunakan kode peserta, ikuti aturan kelas, dan simpan Paspor sebelum berganti perangkat. Jelaskan prosedur bantuan, koreksi, serta pertanyaan tentang data. |

## Distribusi dan komunikasi

Gunakan Sites sebagai kanal web. Pastikan pengaturan audiens sesuai keputusan pemilik dan akses peserta berhasil sebelum jadwal kelas. Siapkan halaman pengantar, ikon Nara, tiga cuplikan layar peta, pos, dan Dapur Juara, serta video tur singkat opsional. Distribusikan lewat LMS atau kanal kelas yang ditetapkan. Distribusi toko aplikasi belum masuk rencana produk ini.

## Patch dan dukungan

Guru mengumpulkan laporan akses dan penggunaan. Pengembang memperbaiki bug penghambat tanpa mengubah definisi pengukuran di tengah sesi. Catat versi dan dampak perubahan bila patch dibutuhkan. Jadwalkan revisi materi, audio, atau peringkat setelah fase pengumpulan data.

Acuan internal • Lampiran persiapan membangun game dan Desain Game NUTRANTARA.
