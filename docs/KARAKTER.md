# Desain karakter & dunia NUTRANTARA

Semua model dibuat secara prosedural di [`characters.js`](../characters.js) dan [`world3d.js`](../world3d.js). Gayanya low-poly dengan bayangan toon tiga tingkat, dan tidak membutuhkan berkas model eksternal. Seluruh desain orisinal dan bertema pangan Nusantara.

## Palet

| Nama | Warna | Dipakai untuk |
| :-- | :-- | :-- |
| Hijau arsip | `#78f4bd` | Segel, mata Nara, UI utama |
| Cyan portal | `#68dce7` | Portal siap, cincin hover Nara |
| Emas bulir | `#ffd17c` | Jalur emas, kepingan arsip, sorotan |
| Koral | `#ff9f91` | Rantang, saluran cerna, pipi |
| Bambu | `#e3c27a` | Caping |
| Teal malam | `#071516` | Latar UI |

## Penjelajah Pangan (karakter pemain)

Anak penjelajah berproporsi *chibi*: kepala besar dan badan pendek, supaya ramah dan mudah dikenali dari jauh.

- **Caping bambu** dengan pita hijau dan kancing emas di puncak, tanda bahwa pangan berawal dari sawah.
- **Ransel rantang tiga susun** (koral, warna pemain, hijau): wadah arsip pangan yang dipulihkan.
- **Syal motif tumpal** (segitiga khas kain Nusantara), dibuat dari warna pemain dan emas.
- **Rompi** berwarna pemain di atas kaus putih, dengan saku emas.
- **Pemindai gizi** di pergelangan kanan, menyala cyan.
- **Warna pemain** diturunkan server dari alias, sehingga setiap siswa tampil berbeda di dunia bersama.
- Animasi: berjalan (ayunan tangan dan kaki), diam (napas), lompat (tangan terbuka), dan berkedip.

## Nara (pemandu)

Robot pemandu yang melayang di dekat gapura.

- Cangkang kapsul putih dengan **visor gelap** dan **mata hijau** yang berkedip.
- **Antena daun padi** dengan **bulir emas** bercahaya.
- **Lambang berlian "N"** di dada dan sabuk cyan.
- Dua **tangan melayang** dan **cincin hover cyan**. Nara tidak pernah menapak tanah.
- Perilaku: selalu menoleh ke penjelajah. Tekan E di dekatnya untuk mendapat arahan ke pos berikutnya (bukan jawaban).

## Peta Pulau NUTRANTARA

Tata letak mengikuti [`world-data.js`](../world-data.js), yang dipakai bersama oleh server, dunia 2D, dunia 3D, dan peta di landing page. Satu piksel peta sama dengan 1/16 satuan 3D.

| Wilayah | Penanda khas |
| :-- | :-- |
| Gapura & Nara (barat) | Gapura beratap merah "PULAU NUTRANTARA" dan sawah bertingkat |
| Pos 1 Kantin Nusantara | Warung bertenda garis dengan piring Menu A dan Menu B |
| Pos 2 Laboratorium Pencernaan | Kubah kaca berisi saluran cerna berliku |
| Pos 3 Gerbang Penyerapan | Lengkung vili usus dengan butir nutrisi yang naik |
| Pos 4 Jejak Sebab Akibat | Barisan domino yang mulai jatuh |
| Pos 5 Pemecah Klaim | Kristal klaim dan kaca pembesar raksasa |
| Pos 6 Dapur Juara | Pendopo beratap joglo, tungku berasap, dan tumpeng |

- **Jalur emas** menghubungkan gapura dan keenam portal secara berurutan.
- **Portal**: cyan berarti siap, hijau berarti tersegel, abu-abu dengan gembok berarti terkunci (terkunci karena urutan pos atau ditutup guru).
- **Blok tempe melayang** menyimpan **12 kepingan arsip**. Koleksi ini hanya untuk kesenangan (tersimpan di browser) dan tidak memengaruhi skor belajar.
- Latar belakang: pulau gunung api di utara, awan, dan laut berombak (ombak hanya di grafis Tinggi).

## Animasi (v0.5)

- **Penjelajah**: pose terjun bebas, melayang dengan **parasut daun pisang**, mendarat (tekan-pulih), emote **lambai / sorak / tari / pikir**.
- **Nara**: **merayakan** (berputar sambil melompat, bulir antena menyala) saat jawaban benar, **menggeleng** dengan mata kuning saat salah, **berbicara** (antena bergoyang), mengikuti penjelajah sebagai pendamping.
- **Dunia**: konfeti, debu, kilau, pilar cahaya segel, gelombang pindai, jembatan yang menyala berurutan, kubah kunci yang memudar, air terjun, awan, panah emas penunjuk tujuan.

## Kepulauan (v0.5)

Mengikuti konsep peta pengguna: pulau-pulau melayang di atas lautan awan dengan tebing berlapis, akar menggantung, dan air terjun. Penanda tiap pulau: **Pos 1** kantin sekolah dengan lengkung bersulur, **Pos 2** pasar tradisional + kubah lab pencernaan, **Pos 3** pohon raksasa dengan gerbang emas, **Pos 4** menara kota terapung + bola molekul, **Pos 5** meja studio iklan dengan kaca pembesar, **Pos 6** pendopo dapur dengan portal daun emas. **Alun-alun Nusantara** di tengah: gapura, sawah bertingkat, kolam, dan blok tempe.

## Pengembangan berikutnya

- Ganti model prosedural dengan aset dari desainer (format glTF) tanpa mengubah logika: cukup ganti `createExplorer` dan `createNara`.
- Kosmetik yang bisa dibuka dari segel, misalnya warna caping atau motif syal. Jangan dijadikan toko atau ekonomi pembelian, sesuai dokumen desain.
