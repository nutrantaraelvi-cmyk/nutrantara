/* NUTRANTARA — konten PjBL POS 1–6 (sejak 1.3).
 * Sumber: dokumen "Nutrantara — Integrasi PjBL & Pertanyaan Analisis POS 1–6" dari pengguna.
 * Skrip biasa yang hanya mengisi window.NUTRANTARA_PJBL agar bisa dimuat server.js lewat vm (tanpa DOM, tanpa import).
 * Kunci jawaban disimpan sebagai id isi pilihan (a–d sesuai dokumen), bukan huruf tampilan: urutan pilihan diacak per siswa.
 * Di teks feedback, {A}…{D} adalah penanda huruf pilihan asli; tampilan menggantinya dengan huruf setelah diacak.
 * Semua angka POS 1–6 adalah data simulasi pembelajaran, bukan saran gizi. */
(() => {
  const steps = [
    { id: 1, name: 'Penentuan pertanyaan mendasar', en: 'Start with the essential question', text: 'Siswa mengamati masalah nyata, lalu merumuskan pertanyaan pemantik yang terbuka dan menantang. Pertanyaan ini menjadi arah seluruh proyek.' },
    { id: 2, name: 'Mendesain perencanaan proyek', en: 'Design a plan for the project', text: 'Kelompok menyepakati tujuan, kriteria produk, bahan, sumber informasi, anggaran, dan pembagian peran.' },
    { id: 3, name: 'Menyusun jadwal', en: 'Create a schedule', text: 'Kelompok membuat linimasa kegiatan, urutan dan ketergantungan tugas, penanggung jawab, serta tenggat.' },
    { id: 4, name: 'Memonitor siswa dan kemajuan proyek', en: 'Monitor the students and the progress', text: 'Guru dan kelompok memantau kemajuan dengan logbook dan data, lalu memperbaiki rancangan bila ada yang menyimpang dari rencana.' },
    { id: 5, name: 'Menguji hasil', en: 'Assess the outcome', text: 'Produk sementara diuji terhadap kriteria, misalnya kecukupan gizi, biaya, dan uji kesukaan, lalu direvisi berdasarkan bukti.' },
    { id: 6, name: 'Mengevaluasi pengalaman', en: 'Evaluate the experience', text: 'Kelompok menyajikan produk akhir, melakukan refleksi, dan menerima umpan balik.' }
  ];
  // POS 1–5: 10 soal analisis per POS (dibangkitkan dari dokumen; jangan ubah id soal karena tersimpan di data siswa).
  const pos = [
    {
      "id": 1,
      "step": "Penentuan Pertanyaan Mendasar",
      "place": "Gerbang Kantin Desa",
      "questions": [
        {
          "text": "Dari data survei, pertanyaan mendasar mana yang paling tepat untuk mengarahkan proyek?",
          "options": [
            {
              "id": "a",
              "text": "Apa saja makanan yang dijual di kantin sekolah?"
            },
            {
              "id": "b",
              "text": "Berapa harga satu porsi cilok di kantin?"
            },
            {
              "id": "c",
              "text": "Bagaimana kita merancang menu kantin harian yang bergizi seimbang, terjangkau, dan disukai siswa?"
            },
            {
              "id": "d",
              "text": "Apakah siswa suka makan gorengan?"
            }
          ],
          "key": "c",
          "right": "Pertanyaan {C} terbuka, menantang, berangkat dari masalah nyata, dan mengarah ke produk (menu). Inilah ciri pertanyaan mendasar PjBL.",
          "wrong": "Pilihan {A}, {B}, dan {D} hanya meminta fakta tunggal atau jawaban ya/tidak. Pertanyaan seperti itu tidak memicu penyelidikan dan tidak menghasilkan produk.",
          "id": "p1q1"
        },
        {
          "text": "Masalah utama apa yang paling didukung oleh pola menu terlaris di kantin?",
          "options": [
            {
              "id": "a",
              "text": "Menu kantin didominasi karbohidrat sederhana, lemak, gula, dan garam, tetapi kurang sayur, buah, dan protein"
            },
            {
              "id": "b",
              "text": "Menu kantin terlalu mahal bagi siswa"
            },
            {
              "id": "c",
              "text": "Siswa tidak menyukai makanan kantin"
            },
            {
              "id": "d",
              "text": "Kantin kekurangan tempat duduk"
            }
          ],
          "key": "a",
          "right": "Mi instan, cilok, gorengan, dan minuman manis tinggi tepung, minyak, gula, dan natrium. Data juga menunjukkan hanya 1 dari 12 menu yang mengandung sayur.",
          "wrong": "Tidak ada data harga, tingkat kesukaan, atau tempat duduk dalam survei. Kesimpulan harus didukung data yang tersedia.",
          "id": "p1q2"
        },
        {
          "text": "Mengapa siswa yang tidak sarapan lebih mungkin mengantuk pada jam pelajaran ke-3?",
          "options": [
            {
              "id": "a",
              "text": "Karena tubuh menyimpan terlalu banyak energi"
            },
            {
              "id": "b",
              "text": "Karena tubuh kelebihan protein"
            },
            {
              "id": "c",
              "text": "Karena lambung bekerja terlalu keras mencerna makanan"
            },
            {
              "id": "d",
              "text": "Karena kadar glukosa darah menurun sehingga otak kekurangan sumber energi utama"
            }
          ],
          "key": "d",
          "right": "Glukosa adalah sumber energi utama otak. Setelah berpuasa semalam tanpa sarapan, cadangan glukosa menurun dan konsentrasi ikut turun.",
          "wrong": "Siswa yang tidak sarapan justru kekurangan energi, bukan kelebihan. Lambungnya juga kosong, tidak sedang bekerja keras.",
          "id": "p1q3"
        },
        {
          "text": "Seorang siswa minum 2 botol minuman manis kemasan setiap hari. Apa kesimpulan yang tepat?",
          "options": [
            {
              "id": "a",
              "text": "Asupan gulanya masih jauh di bawah batas harian"
            },
            {
              "id": "b",
              "text": "Asupan gulanya 25 g, setengah batas harian"
            },
            {
              "id": "c",
              "text": "Asupan gulanya 50 g, sudah mencapai batas gula harian (sekitar 4 sendok makan) hanya dari minuman"
            },
            {
              "id": "d",
              "text": "Minuman manis tidak mengandung gula karena berbentuk cair"
            }
          ],
          "key": "c",
          "right": "2 × 25 g = 50 g. Angka ini sama dengan batas gula harian dari Kemenkes, padahal siswa masih makan makanan lain yang juga mengandung gula.",
          "wrong": "Hitung ulang: satu botol berisi 25 g gula, jadi dua botol berisi 50 g. Bentuk cair tidak menghilangkan kandungan gula.",
          "id": "p1q4"
        },
        {
          "text": "Mi instan goreng dan gorengan sama-sama berpotensi menyebabkan kelebihan zat apa jika dikonsumsi setiap hari?",
          "options": [
            {
              "id": "a",
              "text": "Lemak dan natrium (garam)"
            },
            {
              "id": "b",
              "text": "Vitamin C dan serat"
            },
            {
              "id": "c",
              "text": "Kalsium dan zat besi"
            },
            {
              "id": "d",
              "text": "Air dan mineral"
            }
          ],
          "key": "a",
          "right": "Proses penggorengan menambah lemak, sedangkan bumbu mi instan dan adonan gorengan banyak mengandung natrium.",
          "wrong": "Vitamin C, serat, kalsium, dan zat besi justru rendah pada kedua makanan tersebut.",
          "id": "p1q5"
        },
        {
          "text": "Agar masalah semakin jelas, data tambahan apa yang paling perlu dikumpulkan kelompok?",
          "options": [
            {
              "id": "a",
              "text": "Warna seragam penjual kantin"
            },
            {
              "id": "b",
              "text": "Jam buka toko di luar sekolah"
            },
            {
              "id": "c",
              "text": "Jumlah meja di kantin"
            },
            {
              "id": "d",
              "text": "Uang saku harian siswa dan makanan sehat yang mereka sukai"
            }
          ],
          "key": "d",
          "right": "Menu sehat hanya berhasil jika terjangkau dan disukai. Data uang saku dan selera langsung memengaruhi rancangan menu.",
          "wrong": "Data pada pilihan {A}, {B}, dan {C} tidak berhubungan dengan pertanyaan mendasar tentang menu bergizi, terjangkau, dan disukai.",
          "id": "p1q6"
        },
        {
          "text": "Bandingkan dua menu: (P) nasi, tempe bacem, sayur bening bayam, dan pisang; (Q) mi instan goreng, kerupuk, dan es teh manis. Analisis mana yang tepat?",
          "options": [
            {
              "id": "a",
              "text": "Menu Q lebih seimbang karena porsinya lebih banyak"
            },
            {
              "id": "b",
              "text": "Menu P lebih seimbang karena memuat makanan pokok, lauk, sayur, dan buah"
            },
            {
              "id": "c",
              "text": "Kedua menu sama seimbangnya karena sama-sama mengenyangkan"
            },
            {
              "id": "d",
              "text": "Menu P kurang seimbang karena tidak ada minuman manis"
            }
          ],
          "key": "b",
          "right": "Menu P memenuhi keempat kelompok dalam Isi Piringku. Menu Q hanya berisi karbohidrat, lemak, dan gula tanpa sayur, buah, atau lauk.",
          "wrong": "Rasa kenyang dan porsi besar bukan ukuran gizi seimbang. Minuman manis juga bukan komponen wajib; air putih lebih dianjurkan.",
          "id": "p1q7"
        },
        {
          "text": "Pernyataan mana yang merupakan FAKTA berdasarkan data survei, bukan opini?",
          "options": [
            {
              "id": "a",
              "text": "Gorengan adalah makanan paling enak di kantin"
            },
            {
              "id": "b",
              "text": "Semua siswa pasti malas belajar"
            },
            {
              "id": "c",
              "text": "65% siswa yang disurvei tidak sarapan teratur"
            },
            {
              "id": "d",
              "text": "Penjual kantin tidak peduli kesehatan siswa"
            }
          ],
          "key": "c",
          "right": "Pernyataan {C} dapat dibuktikan langsung dari data survei (78 dari 120 siswa).",
          "wrong": "Pilihan {A} berupa selera pribadi, sedangkan {B} dan {D} menyamaratakan atau menuduh tanpa bukti. Proyek harus dibangun dari fakta.",
          "id": "p1q8"
        },
        {
          "text": "Kelompok menemukan 3 masalah. Mana yang paling tepat dijadikan prioritas proyek?",
          "options": [
            {
              "id": "a",
              "text": "Menu kantin minim sayur dan protein, dialami hampir semua siswa, dan didukung data survei"
            },
            {
              "id": "b",
              "text": "Cat dinding kantin mulai pudar"
            },
            {
              "id": "c",
              "text": "Antrean kantin panjang pada hari Jumat"
            },
            {
              "id": "d",
              "text": "Musik di kantin terlalu keras"
            }
          ],
          "key": "a",
          "right": "Masalah prioritas berdampak paling luas, berkaitan langsung dengan kesehatan, dan memiliki data pendukung yang kuat.",
          "wrong": "Masalah {B}, {C}, dan {D} memang nyata, tetapi tidak berkaitan dengan gizi dan tidak didukung data survei.",
          "id": "p1q9"
        },
        {
          "text": "Pertanyaan mana yang KURANG tepat dijadikan pertanyaan mendasar proyek?",
          "options": [
            {
              "id": "a",
              "text": "Bagaimana menu kantin dapat membantu siswa tetap fokus belajar sampai siang?"
            },
            {
              "id": "b",
              "text": "Menu seperti apa yang dapat mengurangi konsumsi minuman manis siswa?"
            },
            {
              "id": "c",
              "text": "Bagaimana pangan lokal Nusantara dapat menjadi menu kantin yang sehat dan murah?"
            },
            {
              "id": "d",
              "text": "Apakah gorengan tidak sehat?"
            }
          ],
          "key": "d",
          "right": "Pertanyaan {D} tertutup karena cukup dijawab “ya” atau “tidak”. Pertanyaan seperti ini tidak mendorong siswa merancang solusi.",
          "wrong": "Pilihan {A}, {B}, dan {C} justru pertanyaan mendasar yang baik karena terbuka, kontekstual, dan mengarah pada solusi. Cari pertanyaan yang bersifat tertutup.",
          "id": "p1q10"
        }
      ],
      "stimulus": {
        "title": "Stimulus data (survei 120 siswa)",
        "columns": [
          "Temuan",
          "Data"
        ],
        "rows": [
          [
            "Siswa yang tidak sarapan teratur",
            "78 siswa (65%)"
          ],
          [
            "Siswa yang mengantuk atau sulit fokus pada jam pelajaran ke-3",
            "36 siswa (30%)"
          ],
          [
            "4 menu kantin terlaris",
            "Mi instan goreng, cilok saus, gorengan, minuman manis kemasan"
          ],
          [
            "Menu kantin yang mengandung sayur",
            "1 dari 12 menu"
          ],
          [
            "Kandungan gula minuman manis kemasan",
            "25 g per botol 250 ml"
          ]
        ]
      },
      "notes": [],
      "narrative": "Nara tiba di kantin sekolah desa dan menemukan papan survei. Kelompok harus membaca data, menemukan masalah, lalu merumuskan pertanyaan mendasar proyek.",
      "focus": "Membaca data kebiasaan makan dan menu kantin, menemukan masalah gizi",
      "output": "Rumusan pertanyaan mendasar",
      "logbookPrompt": "Tulis pertanyaan mendasar kelompok kalian (terbuka, berangkat dari data survei, mengarah ke produk menu)."
    },
    {
      "id": 2,
      "step": "Mendesain Perencanaan Proyek",
      "place": "Pasar Pangan Nusantara",
      "questions": [
        {
          "text": "Menurut pedoman Isi Piringku, susunan piring makan siang mana yang tepat?",
          "options": [
            {
              "id": "a",
              "text": "Setengah piring nasi, seperempat lauk, seperempat sayur"
            },
            {
              "id": "b",
              "text": "Sepertiga nasi, sepertiga lauk, sepertiga sayur, tanpa buah"
            },
            {
              "id": "c",
              "text": "Setengah piring sayur dan buah (sayur lebih banyak), setengah lainnya makanan pokok dan lauk pauk (makanan pokok lebih banyak)"
            },
            {
              "id": "d",
              "text": "Setengah piring lauk dan setengah piring nasi"
            }
          ],
          "key": "c",
          "right": "Isi Piringku membagi piring menjadi dua bagian. Separuh untuk sayur dan buah, separuh untuk makanan pokok dan lauk pauk.",
          "wrong": "Susunan lain kekurangan buah atau terlalu banyak nasi dan lauk. Ingat bahwa sayur dan buah mengisi separuh piring.",
          "id": "p2q1"
        },
        {
          "text": "Di pasar tersedia sagu, ubi jalar, ikan tongkol, daun kelor, jagung, dan kacang merah. Pasangan mana yang dapat menggantikan nasi sebagai makanan pokok?",
          "options": [
            {
              "id": "a",
              "text": "Sagu dan jagung"
            },
            {
              "id": "b",
              "text": "Ikan tongkol dan kacang merah"
            },
            {
              "id": "c",
              "text": "Daun kelor dan ubi jalar"
            },
            {
              "id": "d",
              "text": "Kacang merah dan daun kelor"
            }
          ],
          "key": "a",
          "right": "Sagu dan jagung kaya karbohidrat (pati) sehingga berfungsi sebagai sumber energi utama, sama seperti nasi.",
          "wrong": "Ikan tongkol dan kacang merah adalah sumber protein (lauk), sedangkan daun kelor adalah sayur. Ubi jalar memang makanan pokok, tetapi pasangannya, daun kelor, bukan.",
          "id": "p2q2"
        },
        {
          "text": "Kombinasi menu mana yang memenuhi anggaran Rp10.000 sekaligus paling lengkap gizinya?",
          "options": [
            {
              "id": "a",
              "text": "Nasi + ayam goreng + sayur"
            },
            {
              "id": "b",
              "text": "Nasi + tempe goreng + telur balado + es teh manis"
            },
            {
              "id": "c",
              "text": "Nasi + tempe goreng + sayur + es teh manis"
            },
            {
              "id": "d",
              "text": "Nasi + telur balado + sayur + pisang"
            }
          ],
          "key": "d",
          "right": "Totalnya Rp3.000 + Rp3.500 + Rp2.000 + Rp1.500 = Rp10.000. Menu ini memuat makanan pokok, lauk, sayur, dan buah.",
          "wrong": "Menu nasi + ayam + sayur menghabiskan Rp12.000 (melebihi anggaran). Dua menu lainnya masuk anggaran, tetapi tidak berisi sayur atau buah dan menambah gula dari es teh.",
          "id": "p2q3"
        },
        {
          "text": "Raka seorang vegetarian (tidak makan daging dan ikan). Lauk pengganti apa yang paling tepat agar kebutuhan proteinnya tetap terpenuhi?",
          "options": [
            {
              "id": "a",
              "text": "Kerupuk dan keripik"
            },
            {
              "id": "b",
              "text": "Tahu dan tempe"
            },
            {
              "id": "c",
              "text": "Bihun dan kentang"
            },
            {
              "id": "d",
              "text": "Agar-agar dan sirup"
            }
          ],
          "key": "b",
          "right": "Tahu dan tempe berbahan kedelai, sumber protein nabati yang murah dan mudah ditemukan.",
          "wrong": "Kerupuk, keripik, bihun, dan kentang didominasi karbohidrat. Agar-agar dan sirup hampir tidak mengandung protein.",
          "id": "p2q4"
        },
        {
          "text": "Kelompok beranggotakan 5 orang: Ayu (teliti berhitung), Bima (suka menggambar), Citra (pandai berbicara), Dodi (paham materi gizi), dan Eka (rapi mencatat). Pembagian peran mana yang paling efektif?",
          "options": [
            {
              "id": "a",
              "text": "Semua anggota mengerjakan satu tugas yang sama secara bergantian"
            },
            {
              "id": "b",
              "text": "Dodi mengerjakan semua tugas karena paling paham gizi"
            },
            {
              "id": "c",
              "text": "Ayu menghitung anggaran, Bima mendesain tampilan menu, Citra melakukan survei selera, Dodi menganalisis gizi, Eka mengisi logbook, lalu semua berdiskusi pada titik temu"
            },
            {
              "id": "d",
              "text": "Ayu mendesain, Bima menghitung anggaran, Citra mengisi logbook, Dodi survei, Eka menganalisis gizi"
            }
          ],
          "key": "c",
          "right": "Peran disesuaikan dengan kekuatan tiap anggota, semua tugas tercakup, dan tetap ada koordinasi bersama.",
          "wrong": "Satu orang mengerjakan semua tugas membuat beban timpang. Bergiliran tanpa pembagian memboroskan waktu, dan peran yang tidak sesuai kekuatan anggota menurunkan mutu hasil.",
          "id": "p2q5"
        },
        {
          "text": "Kriteria keberhasilan menu kantin mana yang paling lengkap untuk proyek ini?",
          "options": [
            {
              "id": "a",
              "text": "Bergizi seimbang, terjangkau, disukai siswa, aman dan higienis, serta memanfaatkan pangan lokal"
            },
            {
              "id": "b",
              "text": "Enak, mahal, dan porsinya besar"
            },
            {
              "id": "c",
              "text": "Mengenyangkan dan cepat dimasak"
            },
            {
              "id": "d",
              "text": "Sesuai selera penjual kantin"
            }
          ],
          "key": "a",
          "right": "Kriteria ini menjawab seluruh unsur pertanyaan mendasar: gizi, harga, kesukaan, keamanan, dan konteks pangan lokal.",
          "wrong": "Pilihan lain hanya mencakup satu atau dua aspek dan mengabaikan gizi seimbang, yang menjadi inti proyek.",
          "id": "p2q6"
        },
        {
          "text": "Data UKS menunjukkan banyak siswi pucat dan cepat lelah, diduga karena anemia defisiensi besi. Kombinasi menu mana yang paling tepat?",
          "options": [
            {
              "id": "a",
              "text": "Nasi, kerupuk, dan teh manis"
            },
            {
              "id": "b",
              "text": "Bayam dan telur, ditutup segelas teh tepat setelah makan"
            },
            {
              "id": "c",
              "text": "Roti tawar, selai, dan susu kental manis"
            },
            {
              "id": "d",
              "text": "Hati ayam atau daging, sayur bayam, dan buah jeruk"
            }
          ],
          "key": "d",
          "right": "Hati dan daging kaya zat besi yang mudah diserap. Vitamin C dari jeruk membantu penyerapan zat besi dari bayam.",
          "wrong": "Teh yang diminum tepat setelah makan mengandung tanin yang menghambat penyerapan zat besi. Menu lainnya hampir tidak mengandung zat besi.",
          "id": "p2q7"
        },
        {
          "text": "Kelompok ingin menyajikan ikan dengan lemak tambahan paling sedikit. Cara pengolahan mana yang paling tepat?",
          "options": [
            {
              "id": "a",
              "text": "Digoreng dengan minyak banyak"
            },
            {
              "id": "b",
              "text": "Dipepes atau dikukus"
            },
            {
              "id": "c",
              "text": "Digoreng dengan balutan tepung"
            },
            {
              "id": "d",
              "text": "Diolah menjadi keripik ikan"
            }
          ],
          "key": "b",
          "right": "Pepes dan kukus memasak dengan uap panas tanpa minyak tambahan, sehingga lemak tetap rendah dan protein terjaga. Pepes juga masakan khas Nusantara.",
          "wrong": "Menggoreng, apalagi dengan tepung atau menjadi keripik, membuat bahan menyerap banyak minyak.",
          "id": "p2q8"
        },
        {
          "text": "Di pasar, kelompok menemukan kerupuk berwarna merah menyala yang sangat murah dan warnanya menempel di tangan. Keputusan perencanaan mana yang paling tepat?",
          "options": [
            {
              "id": "a",
              "text": "Tetap dipakai karena harganya murah"
            },
            {
              "id": "b",
              "text": "Dicuci dulu sebelum dijual"
            },
            {
              "id": "c",
              "text": "Tidak dipakai; pilih produk berizin edar (BPOM atau PIRT) tanpa pewarna mencurigakan"
            },
            {
              "id": "d",
              "text": "Dicampur dengan kerupuk lain agar tidak terlihat"
            }
          ],
          "key": "c",
          "right": "Ciri tersebut mengarah pada pewarna tekstil seperti rhodamin B yang dilarang untuk pangan. Rencana proyek harus memuat kriteria keamanan pangan.",
          "wrong": "Murah tidak berarti layak. Mencuci tidak menghilangkan zat berbahaya, dan mencampurnya justru menyebarkan risiko.",
          "id": "p2q9"
        },
        {
          "text": "Urutkan langkah perencanaan menu: (P) menyusun draf menu, (Q) menentukan kebutuhan gizi siswa, (R) memilih bahan pangan, (S) menghitung biaya. Urutan mana yang paling logis?",
          "options": [
            {
              "id": "a",
              "text": "Q – R – S – P"
            },
            {
              "id": "b",
              "text": "P – Q – R – S"
            },
            {
              "id": "c",
              "text": "S – P – R – Q"
            },
            {
              "id": "d",
              "text": "R – P – Q – S"
            }
          ],
          "key": "a",
          "right": "Kebutuhan gizi menentukan bahan yang dipilih. Bahan menentukan biaya, lalu ketiganya disusun menjadi draf menu.",
          "wrong": "Draf menu tidak bisa disusun sebelum kebutuhan gizi, bahan, dan biaya diketahui. Mulailah dari kebutuhan sasaran.",
          "id": "p2q10"
        }
      ],
      "stimulus": {
        "title": "Stimulus daftar harga kantin (anggaran makan siang maksimal Rp10.000 per porsi)",
        "columns": [
          "Item",
          "Harga (Rp)"
        ],
        "rows": [
          [
            "Nasi putih 1 porsi",
            "3.000"
          ],
          [
            "Tempe goreng",
            "1.500"
          ],
          [
            "Telur balado",
            "3.500"
          ],
          [
            "Ayam goreng",
            "7.000"
          ],
          [
            "Sayur (tumis/bening)",
            "2.000"
          ],
          [
            "Pisang 1 buah",
            "1.500"
          ],
          [
            "Es teh manis",
            "2.000"
          ],
          [
            "Air mineral",
            "1.000"
          ]
        ]
      },
      "notes": [],
      "narrative": "Nara dan kelompok berbelanja di pasar pangan Nusantara. Mereka harus menyepakati kriteria menu, memilih bahan, menghitung anggaran, dan membagi peran.",
      "focus": "Isi Piringku, pangan lokal, anggaran, keamanan pangan, pembagian peran",
      "output": "Rencana proyek dan kriteria menu",
      "logbookPrompt": "Tulis kriteria menu yang kalian sepakati (gizi, harga, pangan lokal, keamanan) dan pembagian peran anggota."
    },
    {
      "id": 3,
      "step": "Menyusun Jadwal",
      "place": "Dermaga Waktu",
      "questions": [
        {
          "text": "Tugas mana yang harus selesai sebelum T4 (menghitung gizi dan biaya) dapat dimulai?",
          "options": [
            {
              "id": "a",
              "text": "T5 uji coba dan revisi menu"
            },
            {
              "id": "b",
              "text": "T3 memilih bahan dan porsi"
            },
            {
              "id": "c",
              "text": "Desain tampilan menu"
            },
            {
              "id": "d",
              "text": "Tidak ada, T4 bisa dimulai kapan saja"
            }
          ],
          "key": "b",
          "right": "Gizi dan biaya hanya bisa dihitung setelah bahan dan porsinya ditentukan. Lihat kolom “Bergantung pada”.",
          "wrong": "T5 justru dikerjakan setelah T4. Bacalah ketergantungan tugas sebelum menyusun urutan.",
          "id": "p3q1"
        },
        {
          "text": "Jika semua tugas dikerjakan berurutan, proyek butuh 6 hari, padahal tenggatnya 5 hari. Strategi apa yang paling tepat?",
          "options": [
            {
              "id": "a",
              "text": "Menghapus tahap uji coba dan revisi"
            },
            {
              "id": "b",
              "text": "Melewatkan survei selera siswa"
            },
            {
              "id": "c",
              "text": "Semua anggota menunggu sampai survei selesai baru mulai bekerja"
            },
            {
              "id": "d",
              "text": "Mengerjakan T1 dan T2 secara bersamaan karena keduanya tidak saling bergantung"
            }
          ],
          "key": "d",
          "right": "T1 dan T2 dapat berjalan paralel (2 hari), lalu T3, T4, dan T5 masing-masing 1 hari. Totalnya tepat 5 hari tanpa membuang tahap penting.",
          "wrong": "Menghapus uji coba atau survei menurunkan mutu menu. Menunggu tanpa bekerja justru membuang waktu.",
          "id": "p3q2"
        },
        {
          "text": "Pada hari ke-3, Dodi memegang 4 tugas, sedangkan Ayu, Bima, Citra, dan Eka masing-masing 1 tugas. Apa analisis yang tepat?",
          "options": [
            {
              "id": "a",
              "text": "Beban Dodi berlebih; sebagian tugasnya perlu dialihkan ke anggota yang bebannya ringan"
            },
            {
              "id": "b",
              "text": "Tidak masalah karena Dodi paling rajin"
            },
            {
              "id": "c",
              "text": "Tugas Eka perlu ditambah agar sama dengan Dodi"
            },
            {
              "id": "d",
              "text": "Semua tugas hari ke-3 ditunda"
            }
          ],
          "key": "a",
          "right": "Beban yang timpang membuat satu orang menjadi titik hambatan. Jika Dodi terlambat, seluruh tugas yang bergantung padanya ikut terlambat.",
          "wrong": "Membiarkan atau menunda tidak menyelesaikan masalah. Yang perlu dilakukan adalah meratakan beban, bukan menambah beban baru.",
          "id": "p3q3"
        },
        {
          "text": "Kelompok menyusun jadwal lauk Senin–Jumat. Jadwal mana yang paling baik?",
          "options": [
            {
              "id": "a",
              "text": "Ayam goreng setiap hari"
            },
            {
              "id": "b",
              "text": "Tempe goreng setiap hari"
            },
            {
              "id": "c",
              "text": "Ayam, ikan, tempe, telur, dan tahu secara bergiliran"
            },
            {
              "id": "d",
              "text": "Mi instan dengan rasa yang berbeda setiap hari"
            }
          ],
          "key": "c",
          "right": "Rotasi lauk membuat asupan zat gizi lebih beragam dan siswa tidak bosan. Jadwal ini juga memadukan protein hewani dan nabati.",
          "wrong": "Lauk yang sama setiap hari membuat asupan kurang beragam. Mi instan bukan lauk dan tinggi natrium.",
          "id": "p3q4"
        },
        {
          "text": "Siswa sarapan pukul 06.00, istirahat pertama pukul 09.30, dan istirahat kedua pukul 12.00. Pasangan jadwal menu mana yang tepat?",
          "options": [
            {
              "id": "a",
              "text": "Pukul 09.30 makan berat; pukul 12.00 hanya minuman manis"
            },
            {
              "id": "b",
              "text": "Pukul 09.30 selingan ringan (bubur kacang hijau, buah, atau kacang rebus); pukul 12.00 makan siang lengkap"
            },
            {
              "id": "c",
              "text": "Gorengan pada kedua waktu istirahat"
            },
            {
              "id": "d",
              "text": "Tidak ada makanan sama sekali hingga pulang"
            }
          ],
          "key": "b",
          "right": "Selingan pukul 09.30 menjaga energi di antara sarapan dan makan siang. Makan siang lengkap memenuhi kebutuhan gizi terbesar di sekolah.",
          "wrong": "Minuman manis tidak cukup untuk makan siang. Gorengan tinggi lemak, dan tanpa makan sama sekali energi siswa akan habis sebelum pulang.",
          "id": "p3q5"
        },
        {
          "text": "Petugas kantin memasak sayur pukul 05.00 dan baru menyajikannya pukul 12.00. Apa analisis yang tepat?",
          "options": [
            {
              "id": "a",
              "text": "Vitamin C mudah rusak oleh panas dan udara, dan makanan matang di suhu ruang lebih dari 2 jam berisiko ditumbuhi bakteri; jadwal memasak sayur perlu didekatkan ke waktu saji"
            },
            {
              "id": "b",
              "text": "Sayur menjadi lebih bergizi jika didiamkan lama"
            },
            {
              "id": "c",
              "text": "Memasak lebih awal lebih hemat gas sehingga tidak ada masalah"
            },
            {
              "id": "d",
              "text": "Hanya warnanya yang berubah, gizinya tetap sama"
            }
          ],
          "key": "a",
          "right": "Jadwal memasak memengaruhi mutu gizi dan keamanan pangan. Sayur sebaiknya dimasak sedekat mungkin dengan waktu makan.",
          "wrong": "Penyimpanan lama di suhu ruang menurunkan vitamin dan memberi waktu bakteri berkembang biak. Hemat gas tidak sebanding dengan risikonya.",
          "id": "p3q6"
        },
        {
          "text": "Pada hari ke-3 seharusnya draf menu sudah siap, tetapi survei belum selesai karena 2 kelas belum mengisi. Tindakan mana yang paling tepat?",
          "options": [
            {
              "id": "a",
              "text": "Melanjutkan tanpa data survei dan menuliskan survei sudah selesai"
            },
            {
              "id": "b",
              "text": "Menghentikan proyek"
            },
            {
              "id": "c",
              "text": "Menunggu sampai semua kelas mengisi, berapa pun lamanya"
            },
            {
              "id": "d",
              "text": "Memperbarui jadwal: menetapkan batas akhir survei, menugaskan anggota lain membantu, sambil mulai memilih bahan dari data sementara"
            }
          ],
          "key": "d",
          "right": "Jadwal PjBL bersifat dinamis. Saat tonggak (milestone) meleset, jadwal disesuaikan dan tugas dibagi ulang agar tenggat tetap terkejar.",
          "wrong": "Memalsukan kemajuan tidak jujur, menghentikan proyek terlalu dini, dan menunggu tanpa batas membuat tenggat terlewat.",
          "id": "p3q7"
        },
        {
          "text": "Uji rasa dilakukan di 3 kelas secara berurutan mulai pukul 08.00. Setiap kelas butuh 10 menit persiapan dan 20 menit pengujian. Pukul berapa uji rasa selesai?",
          "options": [
            {
              "id": "a",
              "text": "09.00"
            },
            {
              "id": "b",
              "text": "09.10"
            },
            {
              "id": "c",
              "text": "09.30"
            },
            {
              "id": "d",
              "text": "10.00"
            }
          ],
          "key": "c",
          "right": "Setiap kelas butuh 10 + 20 = 30 menit, jadi 3 kelas butuh 90 menit. Pukul 08.00 + 90 menit = 09.30.",
          "wrong": "Jangan lupakan waktu persiapan. Jika hanya menghitung 3 × 20 menit, hasilnya keliru menjadi pukul 09.00.",
          "id": "p3q8"
        },
        {
          "text": "Dalam game, anggota kelompok menjelajah area POS yang berbeda-beda. Cara koordinasi jadwal mana yang paling efektif?",
          "options": [
            {
              "id": "a",
              "text": "Setiap anggota bekerja sendiri tanpa memberi kabar"
            },
            {
              "id": "b",
              "text": "Memakai papan tugas bersama yang berisi nama penanggung jawab, tenggat, dan status setiap tugas"
            },
            {
              "id": "c",
              "text": "Hanya ketua yang mengetahui jadwal"
            },
            {
              "id": "d",
              "text": "Semua anggota mengirim pesan bersamaan tanpa catatan"
            }
          ],
          "key": "b",
          "right": "Papan tugas bersama membuat semua anggota melihat siapa mengerjakan apa dan kapan harus selesai, meski berada di tempat berbeda.",
          "wrong": "Tanpa catatan bersama, informasi mudah hilang dan tugas bisa tumpang tindih atau terlupakan.",
          "id": "p3q9"
        },
        {
          "text": "Jadwal pembelian bahan mana yang paling sesuai dengan daya simpannya?",
          "options": [
            {
              "id": "a",
              "text": "Semua bahan dibeli sebulan sekali"
            },
            {
              "id": "b",
              "text": "Ikan dibeli seminggu sekali dan disimpan di suhu ruang"
            },
            {
              "id": "c",
              "text": "Beras dibeli setiap jam"
            },
            {
              "id": "d",
              "text": "Ikan dan sayur dibeli setiap hari, sedangkan beras, kacang hijau kering, dan bumbu kering dibeli mingguan"
            }
          ],
          "key": "d",
          "right": "Bahan segar seperti ikan dan sayur cepat rusak sehingga dibeli harian. Bahan kering lebih tahan lama sehingga bisa disimpan seminggu.",
          "wrong": "Ikan di suhu ruang cepat membusuk. Membeli beras setiap jam tidak efisien, dan stok bulanan untuk bahan segar akan rusak.",
          "id": "p3q10"
        }
      ],
      "stimulus": {
        "title": "Stimulus daftar tugas proyek",
        "columns": [
          "Kode",
          "Tugas",
          "Durasi",
          "Bergantung pada",
          "Penanggung jawab"
        ],
        "rows": [
          [
            "T1",
            "Survei selera siswa",
            "2 hari",
            "—",
            "Citra"
          ],
          [
            "T2",
            "Studi literatur gizi",
            "1 hari",
            "—",
            "Dodi"
          ],
          [
            "T3",
            "Memilih bahan dan porsi",
            "1 hari",
            "T1, T2",
            "Dodi"
          ],
          [
            "T4",
            "Menghitung gizi dan biaya",
            "1 hari",
            "T3",
            "Ayu"
          ],
          [
            "T5",
            "Uji coba dan revisi menu",
            "1 hari",
            "T4",
            "Semua"
          ]
        ]
      },
      "notes": [],
      "narrative": "Kapal di Dermaga Waktu hanya berangkat jika kelompok menyusun jadwal yang masuk akal. Proyek harus selesai dalam 5 hari.",
      "focus": "Urutan tugas, waktu makan siswa, daya simpan bahan, rotasi menu",
      "output": "Linimasa proyek dan jadwal menu",
      "logbookPrompt": "Tulis linimasa 5 hari: urutan tugas, penanggung jawab, dan tenggat, termasuk jadwal saji menu."
    },
    {
      "id": 4,
      "step": "Memonitor Kemajuan Proyek",
      "place": "Laboratorium Hutan",
      "questions": [
        {
          "text": "Berdasarkan tabel, sampel mana yang paling cocok dijadikan lauk sumber protein?",
          "options": [
            {
              "id": "a",
              "text": "P"
            },
            {
              "id": "b",
              "text": "R"
            },
            {
              "id": "c",
              "text": "Q"
            },
            {
              "id": "d",
              "text": "S"
            }
          ],
          "key": "c",
          "right": "Hanya sampel Q yang berubah ungu dengan Biuret, tanda adanya protein.",
          "wrong": "P positif amilum (Lugol), R positif gula pereduksi (Benedict), dan S positif lemak (kertas buram). Cari hasil ungu pada uji Biuret.",
          "id": "p4q1"
        },
        {
          "text": "Seorang anggota menulis di logbook: “Sampel R mengandung protein karena Benedict menjadi merah bata.” Bagaimana penilaianmu?",
          "options": [
            {
              "id": "a",
              "text": "Keliru; Benedict menguji gula pereduksi seperti glukosa, sedangkan protein diuji dengan Biuret yang hasilnya negatif pada sampel R"
            },
            {
              "id": "b",
              "text": "Benar; merah bata selalu menandakan protein"
            },
            {
              "id": "c",
              "text": "Keliru; sampel R mengandung lemak"
            },
            {
              "id": "d",
              "text": "Keliru; sampel R mengandung amilum"
            }
          ],
          "key": "a",
          "right": "Memonitor berarti memeriksa kebenaran data. Setiap pereaksi menguji zat yang berbeda, dan kesalahan seperti ini harus dikoreksi di logbook.",
          "wrong": "Merah bata pada Benedict menandakan gula pereduksi, bukan protein. Hasil Lugol dan kertas buram sampel R juga negatif.",
          "id": "p4q2"
        },
        {
          "text": "Sampel P paling mungkin berupa bahan apa?",
          "options": [
            {
              "id": "a",
              "text": "Minyak goreng"
            },
            {
              "id": "b",
              "text": "Nasi atau singkong"
            },
            {
              "id": "c",
              "text": "Putih telur"
            },
            {
              "id": "d",
              "text": "Air putih"
            }
          ],
          "key": "b",
          "right": "Warna biru kehitaman dengan Lugol menunjukkan amilum (pati). Nasi dan singkong adalah sumber pati.",
          "wrong": "Minyak goreng akan positif pada kertas buram, putih telur positif Biuret, dan air putih negatif pada semua uji.",
          "id": "p4q3"
        },
        {
          "text": "Draf menu 1 mengandung karbohidrat 60 g, protein 20 g, dan lemak 15 g. Analisis mana yang tepat?",
          "options": [
            {
              "id": "a",
              "text": "Energinya 95 kkal dan sudah cukup"
            },
            {
              "id": "b",
              "text": "Energinya 380 kkal dan sudah cukup"
            },
            {
              "id": "c",
              "text": "Energinya 455 kkal dan sudah melebihi target makan siang"
            },
            {
              "id": "d",
              "text": "Energinya 455 kkal dan masih di bawah target makan siang, sehingga porsi makanan pokok atau lauk perlu ditambah"
            }
          ],
          "key": "d",
          "right": "(60 × 4) + (20 × 4) + (15 × 9) = 240 + 80 + 135 = 455 kkal. Angka ini masih di bawah target sekitar 615–720 kkal.",
          "wrong": "Jangan hanya menjumlahkan gram (95) atau mengalikan lemak dengan 4. Lemak menghasilkan 9 kkal per gram.",
          "id": "p4q4"
        },
        {
          "text": "Draf menu 2 mengandung karbohidrat 80 g, protein 25 g, dan lemak 30 g (total 690 kkal). Zat gizi mana yang perlu dikurangi?",
          "options": [
            {
              "id": "a",
              "text": "Lemak, karena menyumbang sekitar 39% energi, di atas anjuran sekitar 20–30%"
            },
            {
              "id": "b",
              "text": "Karbohidrat, karena terlalu rendah"
            },
            {
              "id": "c",
              "text": "Protein, karena berlebihan"
            },
            {
              "id": "d",
              "text": "Tidak ada, semuanya sudah ideal"
            }
          ],
          "key": "a",
          "right": "Energi dari lemak = 30 × 9 = 270 kkal, dan 270 ÷ 690 ≈ 39%. Kurangi gorengan atau santan kental, ganti dengan olahan kukus, rebus, atau pepes.",
          "wrong": "Hitung persentase energi tiap zat. Karbohidrat menyumbang sekitar 46% dan protein sekitar 14%, keduanya masih wajar.",
          "id": "p4q5"
        },
        {
          "text": "Guru memberi catatan bahwa draf menu kurang serat. Revisi mana yang paling tepat sasaran?",
          "options": [
            {
              "id": "a",
              "text": "Menambah kerupuk"
            },
            {
              "id": "b",
              "text": "Menambah sirup buah"
            },
            {
              "id": "c",
              "text": "Menambah porsi sayur dan buah utuh, serta mengganti sebagian nasi putih dengan nasi merah atau jagung"
            },
            {
              "id": "d",
              "text": "Menambah porsi ayam goreng"
            }
          ],
          "key": "c",
          "right": "Serat banyak terdapat pada sayur, buah utuh, dan serealia utuh seperti nasi merah dan jagung.",
          "wrong": "Kerupuk, sirup, dan ayam goreng hampir tidak mengandung serat. Sirup buah juga lebih banyak gulanya daripada seratnya.",
          "id": "p4q6"
        },
        {
          "text": "Draf menu mengandung natrium dari ayam kecap (700 mg), sambal dan kerupuk (600 mg), serta sup instan (500 mg). Apa kesimpulan monitoringnya?",
          "options": [
            {
              "id": "a",
              "text": "Masih aman karena di bawah 2.000 mg"
            },
            {
              "id": "b",
              "text": "Totalnya 1.800 mg, sekitar 90% batas natrium harian dalam sekali makan; kurangi bumbu instan dan kerupuk, ganti dengan rempah"
            },
            {
              "id": "c",
              "text": "Natrium hanya berasal dari garam meja, jadi tidak perlu dihitung"
            },
            {
              "id": "d",
              "text": "Totalnya hanya 18% dari batas harian"
            }
          ],
          "key": "b",
          "right": "700 + 600 + 500 = 1.800 mg, hampir mencapai batas 2.000 mg per hari, padahal siswa masih makan di rumah.",
          "wrong": "Natrium juga berasal dari kecap, saus, kerupuk, dan bumbu instan. Bandingkan dengan batas harian, bukan hanya per menu.",
          "id": "p4q7"
        },
        {
          "text": "Logbook menunjukkan satu anggota belum mengerjakan tugasnya selama 2 hari. Tindakan apa yang paling tepat?",
          "options": [
            {
              "id": "a",
              "text": "Mengeluarkannya dari kelompok"
            },
            {
              "id": "b",
              "text": "Diam-diam mengerjakan tugasnya tanpa membicarakan"
            },
            {
              "id": "c",
              "text": "Menegurnya dengan marah di grup chat"
            },
            {
              "id": "d",
              "text": "Berdiskusi untuk mencari penyebabnya, menyepakati ulang peran dan tenggat, mencatatnya di logbook, serta meminta bantuan guru bila perlu"
            }
          ],
          "key": "d",
          "right": "Monitoring dalam PjBL juga memantau kerja sama. Masalah diselesaikan secara terbuka dan tercatat agar kelompok tetap utuh.",
          "wrong": "Mengeluarkan atau memarahi merusak kerja sama. Mengerjakan diam-diam menyembunyikan masalah dan menambah beban anggota lain.",
          "id": "p4q8"
        },
        {
          "text": "Survei kesukaan hanya diisi 30 siswa dari 1 kelas, padahal sekolah memiliki 600 siswa. Hasilnya 90% suka menu X. Apa analisis yang tepat?",
          "options": [
            {
              "id": "a",
              "text": "Data belum mewakili seluruh siswa; sampel perlu diperluas ke berbagai kelas dan jenjang"
            },
            {
              "id": "b",
              "text": "Pasti 90% dari 600 siswa menyukai menu X"
            },
            {
              "id": "c",
              "text": "Data tidak berguna sama sekali dan harus dibuang"
            },
            {
              "id": "d",
              "text": "Cukup bertanya kepada penjual kantin"
            }
          ],
          "key": "a",
          "right": "Satu kelas belum tentu mewakili selera seluruh sekolah. Data awal tetap berguna sebagai petunjuk, tetapi perlu dilengkapi.",
          "wrong": "Menyamaratakan hasil dari sampel kecil adalah kesalahan generalisasi. Membuang data juga tidak perlu; cukup diperluas.",
          "id": "p4q9"
        },
        {
          "text": "Bukti mana yang paling kuat menunjukkan bahwa proyek berjalan sesuai jadwal?",
          "options": [
            {
              "id": "a",
              "text": "Anggota merasa pekerjaan sudah hampir selesai"
            },
            {
              "id": "b",
              "text": "Banyaknya pesan di grup chat"
            },
            {
              "id": "c",
              "text": "Logbook berisi draf menu, tabel perhitungan gizi, dan catatan revisi yang bertanggal"
            },
            {
              "id": "d",
              "text": "Foto bersama kelompok"
            }
          ],
          "key": "c",
          "right": "Kemajuan proyek dibuktikan dengan artefak nyata yang bisa diperiksa dan dibandingkan dengan jadwal.",
          "wrong": "Perasaan, jumlah pesan, dan foto tidak menunjukkan seberapa jauh produk sudah dikerjakan.",
          "id": "p4q10"
        }
      ],
      "stimulus": {
        "title": "Stimulus hasil uji zat makanan",
        "columns": [
          "Sampel",
          "Lugol (iodin)",
          "Biuret",
          "Benedict (dipanaskan)",
          "Kertas buram"
        ],
        "rows": [
          [
            "P",
            "Biru kehitaman",
            "Biru (tetap)",
            "Biru (tetap)",
            "Tidak transparan"
          ],
          [
            "Q",
            "Kuning kecokelatan (tetap)",
            "Ungu",
            "Biru (tetap)",
            "Tidak transparan"
          ],
          [
            "R",
            "Kuning kecokelatan (tetap)",
            "Biru (tetap)",
            "Merah bata",
            "Tidak transparan"
          ],
          [
            "S",
            "Kuning kecokelatan (tetap)",
            "Biru (tetap)",
            "Biru (tetap)",
            "Transparan (noda minyak)"
          ]
        ]
      },
      "notes": [
        "Rumus bantu: energi = (karbohidrat × 4) + (protein × 4) + (lemak × 9) kkal, dengan satuan gram. Target makan siang sekitar 30% kebutuhan harian, yaitu sekitar 615–720 kkal untuk remaja 13–15 tahun (AKG 2019: 2.050 kkal perempuan, 2.400 kkal laki-laki)."
      ],
      "narrative": "Di Laboratorium Hutan, Nara memeriksa bahan menu dan logbook kelompok. Data yang keliru harus ditemukan dan rancangan diperbaiki sebelum diuji di POS 5.",
      "focus": "Uji zat makanan, hitung energi, cek gula–garam–lemak, logbook",
      "output": "Draf menu yang sudah direvisi",
      "logbookPrompt": "Tulis draf menu kalian dan revisi yang dilakukan berdasarkan hasil uji di Laboratorium Hutan."
    },
    {
      "id": 5,
      "step": "Menguji Hasil",
      "place": "Dapur Uji Rasa",
      "questions": [
        {
          "text": "Aspek mana pada Menu 1 yang paling perlu diperbaiki?",
          "options": [
            {
              "id": "a",
              "text": "Rasa"
            },
            {
              "id": "b",
              "text": "Aroma"
            },
            {
              "id": "c",
              "text": "Warna"
            },
            {
              "id": "d",
              "text": "Tekstur"
            }
          ],
          "key": "d",
          "right": "Tekstur Menu 1 bernilai 2,6, jauh lebih rendah daripada aspek lainnya (3,8–4,0). Bagian inilah yang paling perlu direvisi.",
          "wrong": "Bandingkan semua skor Menu 1 dan cari nilai terendah. Aspek lain sudah mendekati 4.",
          "id": "p5q1"
        },
        {
          "text": "Menu mana yang memenuhi ketiga kriteria sekaligus?",
          "options": [
            {
              "id": "a",
              "text": "Menu 2"
            },
            {
              "id": "b",
              "text": "Menu 1"
            },
            {
              "id": "c",
              "text": "Menu 3"
            },
            {
              "id": "d",
              "text": "Tidak ada yang memenuhi"
            }
          ],
          "key": "b",
          "right": "Menu 1 sesuai target gizi, harganya Rp9.500, dan disukai 78% panelis. Ketiga kriteria terpenuhi.",
          "wrong": "Menu 2 paling disukai tetapi gizinya berlebih lemak dan gula. Menu 3 bergizi tetapi melebihi anggaran Rp10.000.",
          "id": "p5q2"
        },
        {
          "text": "Saat uji rasa, nama menu disembunyikan dan diganti kode angka. Apa tujuannya?",
          "options": [
            {
              "id": "a",
              "text": "Mengurangi bias, agar panelis menilai dari rasa dan tampilan, bukan dari nama atau anggapan sebelumnya"
            },
            {
              "id": "b",
              "text": "Agar panelis bingung"
            },
            {
              "id": "c",
              "text": "Agar uji rasa lebih cepat selesai"
            },
            {
              "id": "d",
              "text": "Agar harga menu tidak diketahui penjual"
            }
          ],
          "key": "a",
          "right": "Uji buta (blind test) membuat hasil lebih objektif. Nama seperti “ayam goreng” bisa membuat panelis menilai lebih tinggi sebelum mencicipi.",
          "wrong": "Kode tidak dimaksudkan untuk membingungkan atau mempercepat uji, tetapi untuk menjaga keadilan penilaian.",
          "id": "p5q3"
        },
        {
          "text": "Panelis menyebut urap sayur Menu 1 terlalu keras. Revisi mana yang tepat tanpa mengorbankan gizi?",
          "options": [
            {
              "id": "a",
              "text": "Menghapus sayur dari menu"
            },
            {
              "id": "b",
              "text": "Mengganti sayur dengan kerupuk"
            },
            {
              "id": "c",
              "text": "Mengubah cara pengolahan sayur, misalnya dikukus lebih lama atau diganti sayur bening, dengan porsi sayur tetap"
            },
            {
              "id": "d",
              "text": "Menggoreng sayur dengan balutan tepung"
            }
          ],
          "key": "c",
          "right": "Revisi yang baik memperbaiki kelemahan (tekstur) sambil mempertahankan kekuatan menu (serat dan vitamin dari sayur).",
          "wrong": "Menghapus sayur atau menggantinya dengan kerupuk menghilangkan serat. Menggoreng dengan tepung menambah lemak.",
          "id": "p5q4"
        },
        {
          "text": "Foto piring uji coba menunjukkan 50% nasi, 25% ayam, 25% sayur, tanpa buah. Bagaimana analisisnya menurut Isi Piringku?",
          "options": [
            {
              "id": "a",
              "text": "Sudah sesuai karena ada nasi, lauk, dan sayur"
            },
            {
              "id": "b",
              "text": "Lauk terlalu banyak dan nasi terlalu sedikit"
            },
            {
              "id": "c",
              "text": "Sayur terlalu banyak sehingga perlu dikurangi"
            },
            {
              "id": "d",
              "text": "Makanan pokok terlalu banyak dan buah tidak ada; porsi nasi perlu dikurangi dan buah ditambahkan"
            }
          ],
          "key": "d",
          "right": "Seharusnya sayur dan buah mengisi separuh piring. Di piring ini nasi memakan separuh piring dan buah tidak ada sama sekali.",
          "wrong": "Kehadiran tiga kelompok makanan belum cukup; proporsinya harus tepat dan buah harus ada.",
          "id": "p5q5"
        },
        {
          "text": "Menu 1 mengandung protein 22 g. Kebutuhan protein harian siswi 13–15 tahun adalah 65 g, dan makan siang ditargetkan memenuhi 30%-nya. Apa kesimpulannya?",
          "options": [
            {
              "id": "a",
              "text": "Kurang, hanya memenuhi sekitar 50% target"
            },
            {
              "id": "b",
              "text": "Terpenuhi, sekitar 113% dari target makan siang (19,5 g)"
            },
            {
              "id": "c",
              "text": "Tepat 100% dari target"
            },
            {
              "id": "d",
              "text": "Hanya memenuhi 34% dari target"
            }
          ],
          "key": "b",
          "right": "Target = 30% × 65 g = 19,5 g. Maka 22 ÷ 19,5 × 100% ≈ 113%, sehingga target protein makan siang terpenuhi.",
          "wrong": "Angka 34% muncul jika 22 g dibandingkan langsung dengan kebutuhan sehari penuh. Hitung dulu target makan siangnya.",
          "id": "p5q6"
        },
        {
          "text": "Sambal Menu 1 memakai terasi, padahal ada siswa yang alergi udang. Keputusan mana yang paling tepat?",
          "options": [
            {
              "id": "a",
              "text": "Mencantumkan label alergen pada menu dan menyediakan sambal tanpa terasi"
            },
            {
              "id": "b",
              "text": "Mengabaikannya karena terasi hanya sedikit"
            },
            {
              "id": "c",
              "text": "Melarang siswa tersebut makan di kantin"
            },
            {
              "id": "d",
              "text": "Merahasiakan bahan sambal"
            }
          ],
          "key": "a",
          "right": "Terasi dibuat dari udang rebon, sehingga dapat memicu alergi. Label alergen dan pilihan pengganti menjaga keamanan semua siswa.",
          "wrong": "Sedikit alergen pun dapat memicu reaksi. Melarang atau merahasiakan bahan tidak adil dan berbahaya.",
          "id": "p5q7"
        },
        {
          "text": "Ternyata 10 dari 40 panelis adalah anggota kelompok sendiri. Bagaimana pengaruhnya terhadap hasil uji?",
          "options": [
            {
              "id": "a",
              "text": "Tidak berpengaruh sama sekali"
            },
            {
              "id": "b",
              "text": "Hasilnya menjadi lebih akurat karena mereka paling paham menunya"
            },
            {
              "id": "c",
              "text": "Hasilnya berisiko bias; panelis sebaiknya siswa lain yang mewakili sasaran"
            },
            {
              "id": "d",
              "text": "Hasil uji otomatis tidak berlaku semuanya"
            }
          ],
          "key": "c",
          "right": "Pembuat menu cenderung menilai karyanya sendiri lebih tinggi. Uji yang valid memakai panelis netral dari kelompok sasaran.",
          "wrong": "Paham menu tidak sama dengan menilai secara objektif. Hasil masih bisa diperbaiki dengan memisahkan data dari panelis netral.",
          "id": "p5q8"
        },
        {
          "text": "Dari harga Menu 1 (Rp9.500), pepes ikan berharga Rp3.000. Jika harga ikan naik 20%, apa analisisnya?",
          "options": [
            {
              "id": "a",
              "text": "Total harga tetap Rp9.500"
            },
            {
              "id": "b",
              "text": "Total harga menjadi Rp12.500"
            },
            {
              "id": "c",
              "text": "Total harga menjadi Rp10.100 dan masih dalam anggaran"
            },
            {
              "id": "d",
              "text": "Total harga menjadi Rp10.100, sedikit melebihi anggaran; perlu penyesuaian, misalnya mengganti ikan dengan tempe atau telur pada hari tertentu"
            }
          ],
          "key": "d",
          "right": "Kenaikan 20% × Rp3.000 = Rp600, sehingga total Rp9.500 + Rp600 = Rp10.100. Angka ini melebihi batas Rp10.000.",
          "wrong": "Kenaikan harga bahan harus dihitung ulang. Rp10.100 sudah melewati batas anggaran Rp10.000, meskipun selisihnya kecil.",
          "id": "p5q9"
        },
        {
          "text": "Kesimpulan mana yang paling didukung oleh seluruh hasil uji?",
          "options": [
            {
              "id": "a",
              "text": "Menu 2 terbaik karena paling disukai"
            },
            {
              "id": "b",
              "text": "Menu 1 layak dijadikan dasar prototype setelah tekstur sayurnya diperbaiki, karena memenuhi target gizi, anggaran, dan disukai 78% panelis"
            },
            {
              "id": "c",
              "text": "Semua siswa di Indonesia pasti menyukai Menu 1"
            },
            {
              "id": "d",
              "text": "Menu 3 harus dipilih karena paling mahal sehingga pasti paling bergizi"
            }
          ],
          "key": "b",
          "right": "Kesimpulan {B} memakai semua kriteria dan menyertakan revisi berdasarkan bukti. Inilah tujuan langkah menguji hasil.",
          "wrong": "Kesukaan saja tidak cukup, hasil 40 panelis tidak bisa digeneralisasi ke seluruh Indonesia, dan harga mahal tidak menjamin gizi.",
          "id": "p5q10"
        }
      ],
      "stimulus": {
        "title": "Stimulus hasil uji (skala 1–5; kriteria: gizi sesuai target, harga ≤ Rp10.000, kesukaan ≥ 75%)",
        "columns": [
          "Menu",
          "Komposisi",
          "Rasa",
          "Aroma",
          "Warna",
          "Tekstur",
          "Kesukaan",
          "Harga (Rp)",
          "Hasil cek gizi POS 4"
        ],
        "rows": [
          [
            "Menu 1",
            "Nasi jagung, pepes ikan, urap sayur, pisang",
            "3,9",
            "4,0",
            "3,8",
            "2,6",
            "78%",
            "9.500",
            "Sesuai target"
          ],
          [
            "Menu 2",
            "Nasi, ayam goreng tepung, kentang goreng, es teh manis",
            "4,6",
            "4,5",
            "4,4",
            "4,5",
            "92%",
            "8.000",
            "Lemak dan gula berlebih"
          ],
          [
            "Menu 3",
            "Nasi merah, rendang, sayur asem, jeruk",
            "4,2",
            "4,1",
            "4,0",
            "3,9",
            "85%",
            "12.500",
            "Sesuai target"
          ]
        ]
      },
      "notes": [],
      "narrative": "Di Dapur Uji Rasa, tiga draf menu diuji kepada 40 siswa panelis. Kelompok harus membaca hasil uji, lalu memilih dan memperbaiki menu berdasarkan bukti.",
      "focus": "Uji organoleptik, kecukupan gizi, biaya, validitas pengujian",
      "output": "Menu terpilih berbasis bukti",
      "logbookPrompt": "Tulis menu terpilih beserta bukti uji (gizi, harga, kesukaan) dan revisi terakhir."
    }
  ];
  // ---------- POS 6: tantangan prototype menu sehat harian ----------
  // Nilai gizi kartu bahan adalah data simulasi per porsi (bukan saran gizi), disusun agar contoh menu acuan guru lolos semua kriteria.
  // Kolom: energi kkal, protein g, lemak g, gula tambahan g, natrium mg, harga Rp, luas piring (satuan Isi Piringku).
  const card = (id, group, name, portion, e, pr, fat, sugar, na, price, plate, origin, extra = {}) =>
    ({ id, group, name, portion, energy: e, protein: pr, fat, sugar, sodium: na, price, plate, origin, allergens: [], local: false, methods: ['segar'], ...extra });
  const pos6 = {
    id: 6,
    step: 'Mengevaluasi Pengalaman dan Prototype Menu Sehat Harian',
    place: 'Kantin Nusantara',
    narrative: 'Nara tiba di Kantin Nusantara. Kelompok memakai semua temuan POS 1–5 untuk merancang, menyajikan, dan merefleksikan prototype menu sehat harian kantin sekolah. POS ini tidak berisi 10 soal; feedback diberikan oleh sistem validasi menu dan rubrik.',
    flow: [
      { title: 'Pilih bahan', text: 'Ambil kartu bahan dari Pasar Pangan Nusantara ke piring Isi Piringku. Setiap kartu memuat porsi, energi, protein, lemak, gula tambahan, natrium, harga, asal daerah, dan alergen.' },
      { title: 'Atur porsi dan cara olah', text: 'Pilih besar porsi dan cara olah (kukus, rebus, pepes, tumis, panggang, goreng). Cara olah mengubah nilai lemak.' },
      { title: 'Cek otomatis', text: 'Sistem menghitung total gizi dan harga, lalu memberi feedback per kriteria.' },
      { title: 'Revisi', text: 'Perbaiki menu hingga semua kriteria wajib terpenuhi.' },
      { title: 'Presentasi', text: 'Beri nama menu, tulis alasan pemilihan bahan, lalu sajikan kepada Kepala Kantin.' },
      { title: 'Refleksi', text: 'Setiap anggota menjawab pertanyaan refleksi sebagai evaluasi pengalaman.' }
    ],
    groups: [
      { id: 'pokok', name: 'Makanan pokok', icon: '🍚' },
      { id: 'lauk', name: 'Lauk pauk', icon: '🐟' },
      { id: 'sayur', name: 'Sayur', icon: '🥬' },
      { id: 'buah', name: 'Buah', icon: '🍌' },
      { id: 'minuman', name: 'Minuman', icon: '💧' },
      { id: 'pelengkap', name: 'Pelengkap', icon: '🍘' }
    ],
    // Tambahan lemak (g) per porsi karena cara olah; energinya dihitung 9 kkal per gram lemak.
    methods: [
      { id: 'segar', name: 'Segar / siap saji', fat: 0 },
      { id: 'kukus', name: 'Kukus', fat: 0 },
      { id: 'rebus', name: 'Rebus', fat: 0 },
      { id: 'pepes', name: 'Pepes', fat: 0 },
      { id: 'ungkep', name: 'Ungkep / bacem', fat: 0 },
      { id: 'panggang', name: 'Panggang', fat: 1 },
      { id: 'tumis', name: 'Tumis', fat: 4 },
      { id: 'goreng', name: 'Goreng', fat: 8 }
    ],
    portions: [0.5, 1, 1.5, 2],
    cards: [
      card('nasi-putih', 'pokok', 'Nasi putih', '150 g', 195, 3.5, 0.3, 0, 2, 3000, 1.5, 'Nusantara', { methods: ['kukus'], rice: true }),
      card('nasi-jagung', 'pokok', 'Nasi jagung', '200 g', 260, 4.5, 1.2, 0, 5, 2500, 1.5, 'Madura & Jawa Timur', { methods: ['kukus'], local: true }),
      card('nasi-merah', 'pokok', 'Nasi merah', '150 g', 190, 4, 1.2, 0, 3, 3500, 1.5, 'Jawa Barat', { methods: ['kukus'], rice: true }),
      card('ubi-jalar', 'pokok', 'Ubi jalar', '150 g', 180, 2, 0.3, 0, 40, 2000, 1.5, 'Papua', { methods: ['rebus', 'kukus', 'panggang', 'goreng'], local: true }),
      card('papeda', 'pokok', 'Papeda sagu', '200 g', 200, 0.5, 0.2, 0, 10, 2500, 1.5, 'Maluku & Papua', { methods: ['rebus'], local: true }),
      card('singkong', 'pokok', 'Singkong', '150 g', 220, 1.5, 0.4, 0, 5, 1500, 1.5, 'Jawa & Lampung', { methods: ['rebus', 'kukus', 'goreng'], local: true }),
      card('mi-instan', 'pokok', 'Mi instan goreng', '1 bungkus', 380, 8, 16, 3, 1100, 3500, 1.5, 'Produk pabrik', { methods: ['rebus'], allergens: ['gluten'], packaged: true }),
      card('pepes-ikan', 'lauk', 'Ikan kembung', '75 g', 105, 16, 4, 0, 220, 3000, 0.5, 'Pesisir Jawa', { methods: ['pepes', 'panggang', 'goreng'], allergens: ['ikan'], local: true }),
      card('tempe', 'lauk', 'Tempe', '50 g', 125, 10, 6, 6, 180, 1500, 0.5, 'Jawa Tengah', { methods: ['ungkep', 'kukus', 'goreng'], allergens: ['kedelai'], local: true, note: 'Bacem memakai gula aren ±6 g.' }),
      card('tahu', 'lauk', 'Tahu', '75 g', 60, 6, 3.5, 0, 120, 1500, 0.5, 'Jawa Barat', { methods: ['kukus', 'ungkep', 'goreng'], allergens: ['kedelai'] }),
      card('telur-pindang', 'lauk', 'Telur pindang', '1 butir', 80, 7, 5.5, 0, 260, 2500, 0.5, 'Jawa', { methods: ['rebus', 'goreng'], allergens: ['telur'] }),
      card('ayam-suwir', 'lauk', 'Ayam suwir', '50 g', 95, 14, 4, 0, 200, 4000, 0.5, 'Nusantara', { methods: ['kukus', 'panggang', 'goreng'] }),
      card('tongkol', 'lauk', 'Ikan tongkol bumbu kuning', '60 g', 100, 15, 4, 0, 280, 3000, 0.5, 'Sulawesi', { methods: ['ungkep', 'panggang', 'goreng'], allergens: ['ikan'], local: true }),
      card('ayam-tepung', 'lauk', 'Ayam goreng tepung', '1 potong', 290, 18, 18, 0, 500, 7000, 0.5, 'Waralaba', { methods: ['goreng'], allergens: ['gluten', 'telur'] }),
      card('sayur-bening', 'sayur', 'Sayur bening bayam dan jagung', '1 mangkuk', 50, 2, 0.5, 0, 120, 1500, 1.5, 'Jawa', { methods: ['rebus'], local: true }),
      card('sayur-kelor', 'sayur', 'Sayur bening daun kelor', '1 mangkuk', 45, 3, 0.4, 0, 110, 1500, 1.5, 'Nusa Tenggara', { methods: ['rebus'], local: true }),
      card('urap', 'sayur', 'Urap sayur', '1 porsi', 90, 3, 5, 1, 180, 2000, 1.5, 'Jawa', { methods: ['kukus'], local: true }),
      card('sayur-asem', 'sayur', 'Sayur asem', '1 mangkuk', 60, 2, 0.5, 2, 300, 2000, 1.5, 'Jawa Barat', { methods: ['rebus'], local: true }),
      card('kangkung', 'sayur', 'Kangkung', '1 porsi', 40, 2.5, 0.3, 0, 250, 2000, 1.25, 'Nusantara', { methods: ['tumis', 'rebus'] }),
      card('pisang', 'buah', 'Pisang', '1 buah sedang', 100, 1, 0.3, 0, 1, 1000, 1, 'Nusantara', { local: true }),
      card('pepaya', 'buah', 'Pepaya', '1 potong', 60, 0.7, 0.2, 0, 4, 1000, 1, 'Nusantara'),
      card('jeruk', 'buah', 'Jeruk', '1 buah', 50, 1, 0.2, 0, 1, 1500, 1, 'Kalimantan Barat'),
      card('salak', 'buah', 'Salak pondoh', '2 buah', 80, 0.4, 0.1, 0, 1, 1500, 1, 'Yogyakarta', { local: true }),
      card('air-putih', 'minuman', 'Air putih', 'isi ulang botol', 0, 0, 0, 0, 0, 0, 0, '—'),
      card('es-teh', 'minuman', 'Es teh manis', '1 gelas', 80, 0, 0, 20, 5, 2000, 0, 'Kantin'),
      card('minuman-kemasan', 'minuman', 'Minuman manis kemasan', '250 ml', 100, 0, 0, 25, 30, 4000, 0, 'Produk pabrik', { packaged: true, sweetDrink: true }),
      card('kerupuk', 'pelengkap', 'Kerupuk', '1 keping besar', 60, 0.5, 3, 0, 180, 500, 0, 'Produk pabrik', { allergens: ['udang'], packaged: true }),
      card('sambal', 'pelengkap', 'Sambal tomat', '1 sdm', 15, 0.3, 0.5, 1, 150, 500, 0, 'Nusantara')
    ],
    // Selingan pukul 09.30 (tidak ikut validasi makan siang; ditampilkan di lembar spesifikasi).
    snacks: [
      { id: 'bubur-kacang', name: 'Bubur kacang hijau, gula aren ≤ 1 sdm, tanpa santan kental', portion: '1 mangkuk kecil', method: 'rebus', energy: 200, protein: 7, sugar: 12, price: 3000, allergens: [] },
      { id: 'jagung-rebus', name: 'Jagung rebus', portion: '1 tongkol', method: 'rebus', energy: 120, protein: 4, sugar: 0, price: 2000, allergens: [] },
      { id: 'pisang-kukus', name: 'Pisang kepok kukus', portion: '1 buah', method: 'kukus', energy: 110, protein: 1, sugar: 0, price: 1500, allergens: [] },
      { id: 'ubi-ungu', name: 'Ubi ungu kukus', portion: '100 g', method: 'kukus', energy: 120, protein: 1, sugar: 0, price: 1500, allergens: [] },
      { id: 'gorengan', name: 'Gorengan bakwan', portion: '2 buah', method: 'goreng', energy: 280, protein: 4, sugar: 0, price: 2000, allergens: ['gluten'] }
    ],
    allergens: [
      { id: 'ikan', name: 'Ikan' }, { id: 'udang', name: 'Udang' }, { id: 'kedelai', name: 'Kedelai' }, { id: 'telur', name: 'Telur' },
      { id: 'kacang', name: 'Kacang tanah' }, { id: 'susu', name: 'Susu' }, { id: 'gluten', name: 'Gandum (gluten)' }
    ],
    // Ambang usulan dokumen (AKG 2019, Permenkes No. 30/2013; makan siang ±30% kebutuhan harian).
    limits: { energyMin: 615, energyMax: 720, proteinSiswi: 19.5, proteinSiswa: 21, fatPct: 30, sugar: 12, sodium: 600, price: 10000, vegFruitPct: 50 },
    targets: [
      { id: 'campur', name: 'Siswa dan siswi (protein ≥ 21 g)' },
      { id: 'siswi', name: 'Siswi (protein ≥ 19,5 g)' },
      { id: 'siswa', name: 'Siswa (protein ≥ 21 g)' }
    ],
    rules: [
      { id: 'lengkap', name: 'Keempat kelompok Isi Piringku ada', ok: 'Piringmu lengkap: makanan pokok, lauk, sayur, dan buah.', bad: 'Masih ada kelompok yang kosong. Periksa apakah sudah ada sayur dan buah.' },
      { id: 'separuh', name: 'Sayur + buah mengisi ≥ 50% piring', ok: 'Proporsi sayur dan buah sudah separuh piring.', bad: 'Sayur dan buah masih kurang dari separuh piring. Kurangi nasi, tambah sayur atau buah.' },
      { id: 'energi', name: 'Energi makan siang 615–720 kkal', ok: 'Energi cukup untuk belajar sampai sore.', bad: 'Energi terlalu rendah atau tinggi. Atur ulang porsi makanan pokok dan lauk.' },
      { id: 'protein', name: 'Protein ≥ 19,5 g (siswi) atau ≥ 21 g (siswa)', ok: 'Protein cukup untuk pertumbuhan.', bad: 'Protein kurang. Tambah tempe, tahu, telur, atau ikan.' },
      { id: 'lemak', name: 'Energi dari lemak ≤ 30%', ok: 'Lemak terkendali.', bad: 'Lemak berlebih. Ganti olahan goreng dengan kukus, rebus, atau pepes.' },
      { id: 'gula', name: 'Gula tambahan ≤ 12 g dan tanpa minuman manis kemasan', ok: 'Gula aman. Air putih pilihan terbaik.', bad: 'Gula berlebih. Ganti minuman manis dengan air putih atau kurangi gula.' },
      { id: 'natrium', name: 'Natrium ≤ 600 mg', ok: 'Garam terkendali.', bad: 'Natrium tinggi. Kurangi kecap, saus, kerupuk, dan bumbu instan; pakai rempah.' },
      { id: 'harga', name: 'Harga ≤ Rp10.000 (makan siang)', ok: 'Menu terjangkau bagi siswa.', bad: 'Melebihi anggaran. Ganti bahan dengan pilihan lokal yang lebih murah.' },
      { id: 'lokal', name: 'Minimal 1 pangan lokal non-beras', ok: 'Kamu mengangkat pangan Nusantara.', bad: 'Coba pakai jagung, ubi, sagu, singkong, atau sayur lokal.' },
      { id: 'alergen', name: 'Alergen dicantumkan', ok: 'Menu aman bagi siswa dengan alergi.', bad: 'Lengkapi label alergen, misalnya udang, kacang, telur, atau susu.' }
    ],
    spec: [
      { part: 'Nama menu', need: 'Nama menarik, misalnya “Piring Nara Nusantara”' },
      { part: 'Waktu saji', need: 'Selingan pukul 09.30 dan makan siang pukul 12.00' },
      { part: 'Komponen', need: 'Makanan pokok, lauk hewani/nabati, sayur, buah, minuman' },
      { part: 'Porsi', need: 'Berat setiap komponen (gram)' },
      { part: 'Kandungan gizi', need: 'Energi (kkal), protein (g), lemak (g), gula tambahan (g), natrium (mg)' },
      { part: 'Harga', need: 'Rincian per komponen dan total (Rp)' },
      { part: 'Pangan lokal', need: 'Bahan lokal yang dipakai dan daerah asalnya' },
      { part: 'Cara olah', need: 'Cara memasak setiap komponen' },
      { part: 'Keamanan pangan', need: 'Daftar alergen dan bahan berizin edar' },
      { part: 'Alasan', need: '2–3 kalimat yang mengaitkan menu dengan masalah di POS 1' }
    ],
    example: {
      note: 'Contoh acuan guru. Nilai gizi adalah perkiraan dan perlu dihitung ulang dengan Tabel Komposisi Pangan Indonesia (TKPI).',
      items: [{ card: 'nasi-jagung', method: 'kukus', portion: 1 }, { card: 'pepes-ikan', method: 'pepes', portion: 1 }, { card: 'tempe', method: 'ungkep', portion: 1 }, { card: 'sayur-bening', method: 'rebus', portion: 1 }, { card: 'pisang', method: 'segar', portion: 1 }, { card: 'air-putih', method: 'segar', portion: 1 }],
      snack: 'bubur-kacang',
      rotation: 'Senin pepes ikan kembung, Selasa telur pindang, Rabu ayam suwir kukus, Kamis tahu-tempe bacem, Jumat ikan tongkol bumbu kuning. Makanan pokok dirotasi antara nasi jagung, nasi merah, ubi, dan nasi putih.'
    },
    rubric: [
      { id: 'gizi', name: 'Kesesuaian gizi', auto: true, levels: ['Lebih dari 3 kriteria belum terpenuhi', '2–3 kriteria belum terpenuhi', '1 kriteria belum terpenuhi', 'Semua kriteria validasi terpenuhi'] },
      { id: 'biaya', name: 'Keterjangkauan', auto: true, levels: ['Jauh melebihi anggaran', 'Sedikit melebihi anggaran', '≤ Rp10.000, rincian kurang lengkap', '≤ Rp10.000 dengan rincian lengkap'] },
      { id: 'lokal', name: 'Pangan lokal dan kreativitas', auto: true, levels: ['Tidak ada pangan lokal', 'Pangan lokal hanya sebagai pelengkap', '1 pangan lokal', '≥ 2 pangan lokal, olahan kreatif'] },
      { id: 'masalah', name: 'Keterkaitan dengan masalah', levels: ['Tidak ada alasan', 'Alasan umum', 'Alasan logis, tanpa data', 'Alasan menjawab masalah POS 1 dengan data'] },
      { id: 'bukti', name: 'Bukti pengujian', levels: ['Tanpa pengujian', 'Hasil uji tidak dipakai', 'Menyebut hasil uji', 'Memakai hasil uji POS 4–5 untuk revisi'] },
      { id: 'kerjasama', name: 'Kerja sama', levels: ['Tidak ada pembagian peran', 'Didominasi 1–2 anggota', 'Sebagian besar berperan', 'Semua anggota berperan dan tercatat di logbook'] }
    ],
    // Refleksi terbuka (individu). `good` = pola isi yang menandakan jawaban berbukti (umpan balik otomatis sederhana; guru tetap membaca).
    reflection: [
      { q: 'Masalah apa dari POS 1 yang paling berhasil dijawab oleh menu kalian? Sertakan buktinya.', good: 'Bagus, jawabanmu menyebut data. Contoh: “menu tanpa minuman manis mengurangi asupan gula yang di POS 1 mencapai 50 g”.', fix: 'Jawabanmu masih umum (misalnya “menu kami sehat”). Tambahkan bukti berupa data dari POS 1.' },
      { q: 'Revisi apa yang paling berpengaruh dan dari hasil uji mana asalnya?', good: 'Bagus, revisimu terhubung dengan data uji POS 4 atau POS 5.', fix: 'Sebutkan sumber data revisi, misalnya hasil uji zat makanan POS 4 atau uji kesukaan POS 5.' },
      { q: 'Kendala kerja sama apa yang kalian alami dan bagaimana mengatasinya?', good: 'Bagus, kamu menyebut kendala nyata beserta strateginya.', fix: 'Jawaban “tidak ada kendala” tanpa penjelasan belum cukup. Ceritakan satu kendala dan cara kalian mengatasinya.' },
      { q: 'Jika menu ini benar-benar dijual di kantin, apa risiko terbesarnya dan apa solusinya?', good: 'Bagus, kamu menyebut risiko beserta solusinya.', fix: 'Sebutkan satu risiko (misalnya kenaikan harga bahan, daya tahan sayur, atau selera siswa) dan solusinya.' },
      { q: 'Apa satu kebiasaan makan yang akan kamu ubah setelah proyek ini?', good: 'Bagus, kebiasaanmu spesifik dan terukur.', fix: 'Buat lebih spesifik dan terukur, misalnya “sarapan setiap hari sebelum pukul 06.30”.' }
    ]
  };

  window.NUTRANTARA_PJBL = {
    version: 1,
    title: 'Integrasi PjBL: menu sehat harian kantin sekolah',
    rules: { first: 10, second: 5, maxTries: 2, unlock: 70, perPos: 100 },
    steps,
    pos,
    pos6
  };
})();
