/*
 * Data misi NUTRANTARA.
 * Semua angka pada Pos 1–5 adalah data simulasi untuk tantangan, bukan rekomendasi gizi.
 * Isi materi perlu ditinjau validator sebelum beta.
 *
 * Tipe tantangan:
 *  - single : satu pilihan (radio). correct = value.
 *  - multi  : beberapa pilihan (checkbox). correct = array value, harus persis sama.
 *  - order  : urutkan kartu. items = urutan awal, correct = urutan benar.
 *  - sort   : kelompokkan pernyataan ke kategori. correct = { itemValue: categoryValue }.
 */
window.NUTRANTARA_MISSIONS = [
  {
    id: 1,
    type: 'analysis',
    icon: '⌕',
    title: 'Detektif',
    titleEm: 'Menu',
    mapLabel: 'DETEKTIF MENU',
    location: 'KANTIN NUSANTARA',
    description: 'Dua menu, energi yang sama. Temukan bukti yang mengungkap perbedaan komposisinya.',
    duration: '8–12 MENIT',
    nara: {
      intro: 'Dua menu memiliki energi yang sama. Apakah itu berarti komposisinya juga sama? Mari periksa arsipnya.',
      afterOne: 'Bagus, energi yang sama tidak menjamin komposisi yang sama. Sekarang pilih bukti yang benar-benar mendukung laporanmu.',
      afterTwo: 'Bukti sudah terkumpul. Catat alasanmu di Paspor sebelum menyegel pos.'
    },
    stimulus: {
      title: 'ARSIP MENU',
      ref: 'REF. 01–A/B',
      columns: ['INDIKATOR', 'MENU A', 'MENU B'],
      rows: [
        { label: 'Energi', values: [['500', 'kkal'], ['500', 'kkal']] },
        { label: 'Protein', values: [['12', 'g'], ['24', 'g']], highlight: [1] },
        { label: 'Serat', values: [['3', 'g'], ['8', 'g']], highlight: [1] }
      ],
      insight: 'Energi setara belum tentu berarti semua zat gizi setara.'
    },
    challenges: [
      {
        type: 'single',
        label: 'POLA DATA',
        question: 'Energi kedua menu sama-sama 500 kkal. Apa yang bisa kamu simpulkan?',
        options: [
          { value: 'same', text: 'Komposisi kedua menu pasti sama.' },
          { value: 'different', text: 'Energinya sama, tetapi komposisi zat gizinya dapat berbeda.' },
          { value: 'healthy', text: 'Menu dengan energi sama pasti sama sehatnya.' }
        ],
        correct: 'different',
        hints: [
          'Belum tepat. Energi hanya menunjukkan satu bagian dari komposisi. Bandingkan juga data protein dan serat.',
          'Periksa lagi: energi sama tidak otomatis membuat semua zat gizi sama. Data protein dan serat menunjukkan perbedaan.'
        ],
        success: 'Tepat. Energi sama tidak menjamin protein dan serat sama.'
      },
      {
        type: 'multi',
        label: 'PILIH BUKTI',
        question: 'Data mana yang membuktikan komposisi Menu A dan B berbeda? Pilih semua yang mendukung.',
        options: [
          { value: 'energy', text: 'Energi kedua menu sama-sama 500 kkal.' },
          { value: 'protein', text: 'Protein: Menu A 12 g, Menu B 24 g.' },
          { value: 'fiber', text: 'Serat: Menu A 3 g, Menu B 8 g.' },
          { value: 'best', text: 'Menu B pasti paling sehat untuk semua siswa.' }
        ],
        correct: ['protein', 'fiber'],
        hints: [
          'Belum tepat. Cari indikator yang nilainya berbeda, dan hindari klaim “paling sehat” yang tidak dibuktikan oleh tabel.',
          'Pilih data yang nilainya berbeda antara Menu A dan B. Energi setara bukan bukti perbedaan, dan klaim paling sehat untuk semua siswa terlalu luas.'
        ],
        success: 'Tepat. Protein dan serat berbeda, jadi komposisinya berbeda. Tabel tidak cukup untuk menyatakan menu mana yang paling sehat bagi semua siswa.'
      }
    ],
    passport: {
      prompt: 'Apa yang kamu pelajari dari perbandingan Menu A dan Menu B?',
      placeholder: 'Contoh: Energi kedua menu sama, tetapi data protein dan seratnya berbeda…'
    }
  },
  {
    id: 2,
    type: 'analysis',
    icon: '⚗',
    title: 'Laboratorium',
    titleEm: 'Pencernaan',
    mapLabel: 'LAB PENCERNAAN',
    location: 'LABORATORIUM PENCERNAAN',
    description: 'Dua ruang uji, satu jalur yang macet. Rakit jalur perombakan protein dan temukan gangguannya.',
    duration: '8–12 MENIT',
    nara: {
      intro: 'Pati berkurang di kedua ruang. Jalur mana yang tetap bermasalah? Rakit dulu jalur perombakan protein yang normal.',
      afterOne: 'Jalur normal sudah terakit. Sekarang bandingkan Ruang X dan Ruang Y untuk menemukan bagian jalur yang terganggu.',
      afterTwo: 'Gangguan sudah ditemukan. Jelaskan di Paspor bagaimana data membuktikannya.'
    },
    stimulus: {
      title: 'HASIL UJI RUANG',
      ref: 'REF. 02–X/Y',
      columns: ['INDIKATOR', 'RUANG X', 'RUANG Y'],
      rows: [
        { label: 'Pati', values: [['Berkurang'], ['Berkurang']] },
        { label: 'Protein', values: [['Berkurang'], ['Hampir tidak berubah']], highlight: [1] },
        { label: 'Peptida', values: [['Banyak'], ['Sedikit']], highlight: [1] },
        { label: 'Protease', values: [['Terdeteksi'], ['Tidak terdeteksi']], highlight: [1] }
      ],
      insight: 'Pati dan protein dirombak melalui jalur dan enzim yang berbeda.'
    },
    challenges: [
      {
        type: 'order',
        label: 'RAKIT JALUR',
        question: 'Susun jalur perombakan protein di Ruang X dari awal sampai akhir.',
        items: [
          { value: 'peptide', text: 'Peptida (rantai asam amino yang lebih pendek)' },
          { value: 'amino', text: 'Asam amino siap diserap' },
          { value: 'protein', text: 'Protein dari makanan' },
          { value: 'peptidase', text: 'Peptidase memecah peptida' },
          { value: 'protease', text: 'Protease memecah protein' }
        ],
        correct: ['protein', 'protease', 'peptide', 'peptidase', 'amino'],
        hints: [
          'Belum tepat. Mulailah dari molekul terbesar. Setiap enzim berada di antara molekul yang dipecahnya dan hasil pemecahannya.',
          'Periksa lagi: protease bekerja pada protein dan menghasilkan peptida. Peptida kemudian dipecah lagi sebelum hasilnya siap diserap.'
        ],
        success: 'Tepat. Protein dipecah protease menjadi peptida, lalu peptidase memecah peptida menjadi asam amino.'
      },
      {
        type: 'multi',
        label: 'TEMUKAN GANGGUAN',
        question: 'Ruang Y bermasalah. Data mana yang menunjukkan bahwa jalur protein, bukan jalur pati, yang terganggu? Pilih semua yang mendukung.',
        options: [
          { value: 'protein', text: 'Protein di Ruang Y hampir tidak berubah.' },
          { value: 'peptide', text: 'Peptida di Ruang Y sedikit.' },
          { value: 'protease', text: 'Protease di Ruang Y tidak terdeteksi.' },
          { value: 'starch', text: 'Pati di Ruang Y berkurang.' }
        ],
        correct: ['protein', 'peptide', 'protease'],
        hints: [
          'Belum tepat. Pati berkurang di kedua ruang, jadi data pati tidak menunjukkan gangguan. Fokus pada data jalur protein.',
          'Ada tiga baris jalur protein yang berbeda antara Ruang X dan Ruang Y. Data pati bukan salah satunya.'
        ],
        success: 'Tepat. Tanpa protease, protein tidak dipecah menjadi peptida. Karena itu protein hampir tidak berubah dan peptida sedikit, sementara pati tetap berkurang.'
      }
    ],
    passport: {
      prompt: 'Jelaskan gangguan di Ruang Y menggunakan data protein, peptida, dan protease.',
      placeholder: 'Contoh: Di Ruang Y protease tidak terdeteksi, sehingga…'
    }
  },
  {
    id: 3,
    type: 'analysis',
    icon: '⇵',
    title: 'Gerbang',
    titleEm: 'Penyerapan',
    mapLabel: 'GERBANG PENYERAPAN',
    location: 'GERBANG USUS HALUS',
    description: 'Dua model usus halus memecah protein sama baiknya. Mengapa yang menyeberang ke darah berbeda?',
    duration: '8–12 MENIT',
    nara: {
      intro: 'Model P dan Q sama-sama memecah protein. Pisahkan hasil pemecahan dari jumlah yang menyeberang ke darah.',
      afterOne: 'Kamu sudah membedakan pemecahan dari perpindahan. Sekarang buat prediksi untuk memulihkan gerbang Model Q.',
      afterTwo: 'Prediksi tersimpan. Catat alasanmu di Paspor sebelum menyegel gerbang.'
    },
    stimulus: {
      title: 'MODEL USUS HALUS',
      ref: 'REF. 03–P/Q',
      columns: ['INDIKATOR', 'MODEL P', 'MODEL Q'],
      rows: [
        { label: 'Asam amino terbentuk', values: [['100', 'unit'], ['100', 'unit']] },
        { label: 'Luas permukaan penyerapan', values: [['100', '%'], ['40', '%']], highlight: [1] },
        { label: 'Asam amino berpindah ke darah', values: [['80', 'unit'], ['32', 'unit']], highlight: [1] }
      ],
      insight: 'Pencernaan memecah molekul. Penyerapan memindahkan hasilnya ke sirkulasi.'
    },
    challenges: [
      {
        type: 'single',
        label: 'PEMECAHAN ATAU PERPINDAHAN',
        question: 'Apa yang paling tepat menjelaskan perbedaan Model P dan Model Q?',
        options: [
          { value: 'less-breakdown', text: 'Model Q memecah protein lebih sedikit daripada Model P.' },
          { value: 'absorption', text: 'Pemecahan protein pada P dan Q sama, tetapi perpindahan asam amino ke darah pada Q lebih rendah.' },
          { value: 'no-enzyme', text: 'Model Q tidak memiliki enzim pencerna protein.' }
        ],
        correct: 'absorption',
        hints: [
          'Belum tepat. Lihat baris “asam amino terbentuk”. Apakah hasil pemecahan P dan Q berbeda?',
          'Hasil pemecahan P dan Q sama-sama 100 unit. Perbedaannya muncul pada jumlah yang berpindah ke darah dan luas permukaan.'
        ],
        success: 'Tepat. Masalah Model Q ada pada penyerapan, bukan pencernaan.'
      },
      {
        type: 'single',
        label: 'PREDIKSI',
        question: 'Jika luas permukaan Model Q ditingkatkan mendekati Model P dan kondisi lain tetap, prediksi mana yang paling didukung data?',
        options: [
          { value: 'more-formed', text: 'Asam amino yang terbentuk di Model Q akan bertambah.' },
          { value: 'more-transfer', text: 'Asam amino yang berpindah ke darah pada Model Q kemungkinan meningkat.' },
          { value: 'no-change', text: 'Tidak ada perubahan karena pemecahan protein sudah sama.' }
        ],
        correct: 'more-transfer',
        hints: [
          'Belum tepat. Luas permukaan berhubungan dengan perpindahan, bukan dengan jumlah protein yang dipecah.',
          'Bandingkan lagi: model dengan luas permukaan lebih besar memindahkan lebih banyak asam amino ke darah.'
        ],
        success: 'Tepat. Lipatan, vili, dan mikrovili memperluas permukaan usus halus sehingga lebih banyak hasil pencernaan dapat diserap.'
      }
    ],
    passport: {
      prompt: 'Jelaskan perbedaan antara pencernaan dan penyerapan berdasarkan Model P dan Q.',
      placeholder: 'Contoh: Kedua model membentuk 100 unit asam amino, tetapi…'
    }
  },
  {
    id: 4,
    type: 'analysis',
    icon: '⤳',
    title: 'Jejak',
    titleEm: 'Sebab Akibat',
    mapLabel: 'JEJAK SEBAB AKIBAT',
    location: 'KOTA TERAPUNG',
    description: 'Keluhan berkurang, tetapi banyak hal berubah sekaligus. Kesimpulan mana yang layak disiarkan?',
    duration: '8–12 MENIT',
    nara: {
      intro: 'Beberapa faktor berubah bersamaan. Data apa yang bisa membantu memeriksa tiap dugaan?',
      afterOne: 'Siaranmu tidak melampaui data. Sekarang tentukan data tambahan untuk menguji salah satu dugaan.',
      afterTwo: 'Rencana uji sudah ada. Tulis dugaan dan data tambahanmu di Paspor.'
    },
    stimulus: {
      title: 'CATATAN HARIAN FIKTIF',
      ref: 'REF. 04–M1/M2',
      columns: ['INDIKATOR', 'MINGGU 1', 'MINGGU 2'],
      rows: [
        { label: 'Serat harian (rata-rata)', values: [['10', 'g'], ['22', 'g']] },
        { label: 'Air minum per hari', values: [['4', 'gelas'], ['8', 'gelas']] },
        { label: 'Aktivitas fisik per hari', values: [['15', 'menit'], ['45', 'menit']] },
        { label: 'Hari dengan keluhan sulit buang air besar', values: [['5', 'hari'], ['1', 'hari']], highlight: [1] }
      ],
      insight: 'Tiga faktor berubah bersamaan dari Minggu 1 ke Minggu 2.'
    },
    challenges: [
      {
        type: 'single',
        label: 'SIARAN KESIMPULAN',
        question: 'Kesimpulan mana yang layak disiarkan berdasarkan catatan ini?',
        options: [
          { value: 'fiber-only', text: 'Serat adalah satu-satunya penyebab keluhan berkurang.' },
          { value: 'together', text: 'Keluhan berkurang ketika serat, air minum, dan aktivitas sama-sama meningkat. Data ini belum menunjukkan faktor mana yang berperan.' },
          { value: 'water-none', text: 'Air minum tidak berpengaruh karena serat juga berubah.' }
        ],
        correct: 'together',
        hints: [
          'Belum tepat. Berapa banyak faktor yang berubah dari Minggu 1 ke Minggu 2?',
          'Karena serat, air, dan aktivitas berubah bersamaan, data ini tidak dapat menunjuk satu penyebab atau mengabaikan satu faktor.'
        ],
        success: 'Tepat. Kesimpulan ini menyebut pola yang teramati sekaligus keterbatasan datanya.'
      },
      {
        type: 'single',
        label: 'DATA TAMBAHAN',
        question: 'Data tambahan apa yang paling membantu menguji dugaan tentang serat?',
        options: [
          { value: 'controlled', text: 'Catatan minggu lain ketika serat berubah, sementara air minum dan aktivitas dibuat setara.' },
          { value: 'all-change', text: 'Catatan minggu lain ketika serat, air minum, dan aktivitas kembali berubah bersamaan.' },
          { value: 'opinion', text: 'Pendapat teman tentang menu berserat yang paling enak.' }
        ],
        correct: 'controlled',
        hints: [
          'Belum tepat. Pembanding yang baik hanya mengubah faktor yang sedang diuji.',
          'Untuk menguji serat, faktor lain perlu dibuat setara agar perubahan keluhan dapat dikaitkan dengan serat.'
        ],
        success: 'Tepat. Dengan faktor lain dibuat setara, perbandingannya lebih adil untuk menguji dugaan tentang serat.'
      }
    ],
    passport: {
      prompt: 'Tuliskan dua dugaan yang masih mungkin dan satu data tambahan untuk mengujinya.',
      placeholder: 'Contoh: Dugaan 1: serat… Dugaan 2: air minum… Data tambahan: …'
    }
  },
  {
    id: 5,
    type: 'analysis',
    icon: '✂',
    title: 'Pemecah',
    titleEm: 'Klaim',
    mapLabel: 'PEMECAH KLAIM',
    location: 'STUDIO IKLAN',
    description: '“Menu C paling sehat karena energinya paling tinggi!” Audit klaim iklan ini dengan bukti.',
    duration: '8–12 MENIT',
    nara: {
      intro: 'Angka mana yang tercatat? Asumsi apa yang menghubungkan angka itu dengan klaim paling sehat?',
      afterOne: 'Data, kesimpulan, dan asumsi sudah terpisah. Sekarang ambil berkas yang dibutuhkan untuk audit.',
      afterTwo: 'Berkas audit lengkap. Tulis kritikmu terhadap klaim di Paspor.'
    },
    stimulus: {
      title: 'BERKAS IKLAN',
      ref: 'REF. 05–B/C',
      columns: ['INDIKATOR', 'MENU B', 'MENU C'],
      rows: [
        { label: 'Energi', values: [['500', 'kkal'], ['600', 'kkal']], highlight: [1] },
        { label: 'Protein', values: [['24', 'g'], ['10', 'g']] },
        { label: 'Serat', values: [['8', 'g'], ['2', 'g']] }
      ],
      insight: 'Klaim iklan: “Menu C paling sehat karena energinya paling tinggi!”'
    },
    challenges: [
      {
        type: 'sort',
        label: 'SORTIR BERKAS',
        question: 'Kelompokkan setiap pernyataan sebagai data, kesimpulan, atau asumsi.',
        categories: [
          { value: 'data', text: 'Data' },
          { value: 'conclusion', text: 'Kesimpulan' },
          { value: 'assumption', text: 'Asumsi' }
        ],
        items: [
          { value: 'energy', text: 'Menu C mengandung 600 kkal.' },
          { value: 'healthiest', text: 'Menu C paling sehat.' },
          { value: 'protein', text: 'Protein Menu C 10 g, lebih rendah daripada Menu B.' },
          { value: 'more-better', text: 'Energi lebih tinggi berarti makanan lebih sehat.' }
        ],
        correct: { energy: 'data', healthiest: 'conclusion', protein: 'data', 'more-better': 'assumption' },
        hints: [
          'Belum tepat. Data adalah angka yang tercatat. Kesimpulan adalah klaim akhir. Asumsi adalah anggapan yang menghubungkan data dengan kesimpulan.',
          'Ada dua pernyataan berisi angka tercatat. Anggapan “lebih tinggi berarti lebih sehat” tidak tertulis di tabel.'
        ],
        success: 'Tepat. Klaim ini bertumpu pada asumsi bahwa energi lebih tinggi berarti lebih sehat.'
      },
      {
        type: 'multi',
        label: 'BERKAS AUDIT',
        question: 'Berkas mana yang dibutuhkan untuk mengaudit klaim tersebut? Pilih semua yang relevan.',
        options: [
          { value: 'compare', text: 'Data protein dan serat Menu C dibandingkan dengan Menu B.' },
          { value: 'target', text: 'Kebutuhan sasaran: siswa SMA, aktivitas, dan waktu makan.' },
          { value: 'package', text: 'Harga dan desain kemasan Menu C.' },
          { value: 'views', text: 'Jumlah penonton iklan Menu C.' }
        ],
        correct: ['compare', 'target'],
        hints: [
          'Belum tepat. Harga, kemasan, atau popularitas tidak menguji apakah klaim gizi benar.',
          'Audit membutuhkan data pembanding zat gizi dan konteks kebutuhan orang yang akan memakan menu itu.'
        ],
        success: 'Tepat. Energi lebih tinggi belum tentu sesuai kebutuhan, dan Menu C lebih rendah protein serta serat daripada Menu B.'
      }
    ],
    passport: {
      prompt: 'Kritik klaim iklan Menu C dengan data pembanding dan konteks sasaran.',
      placeholder: 'Contoh: Klaim ini hanya melihat energi, padahal protein dan serat Menu C…'
    }
  },
  {
    id: 6,
    type: 'project',
    icon: '✦',
    title: 'Dapur',
    titleEm: 'Juara',
    mapLabel: 'DAPUR JUARA',
    location: 'BENGKEL MENU',
    description: 'Rancang satu porsi menu lokal untuk siswa SMA, telaah, lalu revisi berdasarkan bukti.',
    duration: '1–2 PERTEMUAN',
    nara: {
      brief: 'Arsip sudah pulih. Sekarang rancang satu porsi menu pangan lokal untuk siswa SMA. Tulis ukuran porsi dan sumber komposisi sebelum menghitung.',
      initial: 'Isi sasaran dan bahan. Ambil nilai gizi per 100 g dari Tabel Komposisi Pangan Indonesia atau label pangan, lalu catat sumbernya.',
      review: 'Minta teman atau guru menelaah rancanganmu. Catat masukan yang mereka berikan.',
      revision: 'Perbaiki rancangan berdasarkan masukan. Jelaskan apa yang berubah dan alasannya.',
      reflection: 'Hampir selesai. Refleksi ini individual, meskipun rancangan dikerjakan bersama.'
    },
    reviewChecks: [
      { value: 'target', text: 'Sasaran dan waktu makan tertulis jelas.' },
      { value: 'complete', text: 'Setiap bahan memiliki bentuk (mentah/olahan), berat porsi, dan sumber data.' },
      { value: 'formula', text: 'Perhitungan memakai nilai per 100 g × berat (g) ÷ 100.' },
      { value: 'missing', text: 'Data yang belum tersedia ditandai dan dampaknya dijelaskan.' },
      { value: 'evidence', text: 'Alasan memakai bukti dari Pos 1–5 (komposisi, pencernaan, penyerapan, klaim).' },
      { value: 'local', text: 'Bahan lokal dan mudah didapat di sekitar sekolah.' }
    ]
  }
];

/*
 * Misi khas tiap pulau (aktivitas di dalam dunia 3D), mengikuti tabel "Tindakan pemain" pada dokumen desain.
 * Bersifat formatif: boleh dicoba ulang, tidak memengaruhi skor. Papan Laporan terbuka setelah misi ini selesai.
 * Posisi `at` = [lx, lz] relatif terhadap jari-jari pulau (z+ = sisi depan/selatan).
 */
(function () {
  const ACTIVITIES = {
    1: {
      type: 'classify',
      title: 'Pilah bukti yang relevan',
      intro: 'Arsip kantin tercampur. Pindai keempat terminal, lalu putuskan mana yang benar-benar bisa menguji komposisi gizi dan mana yang hanya informasi pengalih.',
      distractor: { label: 'Harga & Kemasan', values: [['Rp10.000', 'kotak kertas'], ['Rp12.000', 'daun pisang']], at: [0.86, 0.1] },
      explain: 'Harga dan kemasan tidak menunjukkan kandungan zat gizi, jadi tidak bisa dipakai untuk menguji komposisi menu.'
    },
    2: {
      type: 'stations',
      title: 'Rakit tiga jalur perombakan',
      intro: 'Tiga meja lab menunggu: karbohidrat, protein, dan lemak. Lengkapi zat yang bekerja di setiap tahap, lalu selidiki Ruang X dan Y di terminal.',
      stations: [
        { id: 'karbo', kind: 'bench', at: [-0.86, 0.12], label: 'Meja Karbohidrat', color: '#ffd17c', chain: ['Amilum', 'Maltosa', 'Glukosa'],
          blanks: [{ label: 'Amilum → Maltosa dipecah oleh', options: ['Amilase', 'Pepsin', 'Lipase'], answer: 'Amilase' }, { label: 'Maltosa → Glukosa dipecah oleh', options: ['Tripsin', 'Maltase', 'Empedu'], answer: 'Maltase' }],
          explain: 'Amilase (dari ludah dan pankreas) memecah amilum menjadi maltosa. Maltase di usus halus memecah maltosa menjadi glukosa.' },
        { id: 'protein', kind: 'bench', at: [0.86, 0.12], label: 'Meja Protein', color: '#ff9f91', chain: ['Protein', 'Pepton/peptida', 'Asam amino'],
          blanks: [{ label: 'Protein → Pepton di lambung oleh', options: ['Amilase', 'Pepsin', 'Lipase'], answer: 'Pepsin' }, { label: 'Pepton → Asam amino oleh', options: ['Tripsin dan peptidase', 'Maltase', 'Empedu'], answer: 'Tripsin dan peptidase' }],
          explain: 'Pepsin di lambung memecah protein menjadi pepton. Tripsin dari pankreas dan peptidase di usus halus melanjutkannya menjadi asam amino.' },
        { id: 'lemak', kind: 'bench', at: [0, 0.84], label: 'Meja Lemak', color: '#68dce7', chain: ['Lemak', 'Butiran lemak kecil', 'Asam lemak + gliserol'],
          blanks: [{ label: 'Lemak → butiran kecil (emulsifikasi) oleh', options: ['Pepsin', 'Empedu', 'Maltase'], answer: 'Empedu' }, { label: 'Butiran lemak → asam lemak + gliserol oleh', options: ['Lipase', 'Amilase', 'Tripsin'], answer: 'Lipase' }],
          explain: 'Empedu bukan enzim; ia mengemulsikan lemak menjadi butiran kecil. Lipase pankreas lalu memecahnya menjadi asam lemak dan gliserol.' }
      ]
    },
    3: {
      type: 'stations',
      title: 'Lintaskan molekul ke sirkulasi',
      intro: 'Hasil pencernaan melayang di depan gerbang. Antarkan setiap molekul ke jalur penyerapan yang tepat, lalu pulihkan komponen gerbang.',
      stations: [
        { id: 'glukosa', kind: 'orb', at: [-0.86, 0.1], label: 'Molekul Glukosa', color: '#ffd17c',
          blanks: [{ label: 'Glukosa diserap menuju', options: ['Kapiler darah di vili → vena porta hepatika → hati', 'Pembuluh kil (lakteal) → pembuluh limfa'], answer: 'Kapiler darah di vili → vena porta hepatika → hati' }],
          explain: 'Glukosa larut dalam air, diserap ke kapiler darah di vili, lalu dibawa vena porta hepatika ke hati.' },
        { id: 'asamamino', kind: 'orb', at: [0.86, 0.1], label: 'Molekul Asam Amino', color: '#ff9f91',
          blanks: [{ label: 'Asam amino diserap menuju', options: ['Pembuluh kil (lakteal) → pembuluh limfa', 'Kapiler darah di vili → vena porta hepatika → hati'], answer: 'Kapiler darah di vili → vena porta hepatika → hati' }],
          explain: 'Seperti glukosa, asam amino masuk ke kapiler darah di vili lalu menuju hati melalui vena porta hepatika.' },
        { id: 'lemak', kind: 'orb', at: [-0.32, 0.8], label: 'Asam Lemak + Gliserol', color: '#68dce7',
          blanks: [{ label: 'Asam lemak dan gliserol diserap menuju', options: ['Kapiler darah di vili → vena porta hepatika → hati', 'Pembuluh kil (lakteal) → pembuluh limfa'], answer: 'Pembuluh kil (lakteal) → pembuluh limfa' }],
          explain: 'Asam lemak dan gliserol (juga vitamin larut lemak A, D, E, K) masuk ke pembuluh kil atau lakteal, lalu beredar melalui pembuluh limfa.' },
        { id: 'gerbang', kind: 'gate', at: [0.32, 0.8], label: 'Komponen Gerbang', color: '#78f4bd',
          blanks: [{ label: 'Struktur yang memperluas permukaan penyerapan', options: ['Epiglotis', 'Vili dan mikrovili', 'Gigi geraham'], answer: 'Vili dan mikrovili' }, { label: 'Enzim pada mikrovili yang menuntaskan pemecahan', options: ['Pepsin dan ptialin', 'Maltase, sukrase, laktase, peptidase', 'Empedu'], answer: 'Maltase, sukrase, laktase, peptidase' }],
          explain: 'Vili dan mikrovili memperluas permukaan penyerapan. Enzim di permukaan mikrovili menuntaskan pemecahan menjadi molekul siap serap: monosakarida dan asam amino.' }
      ]
    },
    4: {
      type: 'stations',
      title: 'Nyalakan lentera dugaan',
      intro: 'Kota terapung gelap. Setiap lentera mewakili satu faktor. Nyalakan dengan dugaan sebab-akibat yang masuk akal.',
      stations: [
        { id: 'serat', kind: 'lantern', at: [-0.86, 0.1], label: 'Lentera Serat', color: '#78f4bd',
          blanks: [{ label: 'Jika serat harian naik, keluhan sulit BAB cenderung…', options: ['berkurang, karena serat menambah massa feses dan menahan air', 'bertambah, karena serat diserap ke dalam darah', 'tidak berubah sama sekali'], answer: 'berkurang, karena serat menambah massa feses dan menahan air' }],
          explain: 'Serat tidak dicerna. Serat menambah massa feses dan menahan air sehingga feses lebih mudah bergerak.' },
        { id: 'air', kind: 'lantern', at: [0.86, 0.1], label: 'Lentera Air', color: '#68dce7',
          blanks: [{ label: 'Jika air minum naik, keluhan sulit BAB cenderung…', options: ['bertambah, karena usus kelebihan air', 'berkurang, karena feses menjadi lebih lunak', 'tidak berubah sama sekali'], answer: 'berkurang, karena feses menjadi lebih lunak' }],
          explain: 'Usus besar menyerap air dari sisa makanan. Asupan air yang cukup membantu feses tetap lunak.' },
        { id: 'aktivitas', kind: 'lantern', at: [0, 0.84], label: 'Lentera Aktivitas', color: '#ffd17c',
          blanks: [{ label: 'Jika aktivitas fisik naik, keluhan sulit BAB cenderung…', options: ['berkurang, karena gerak tubuh membantu gerak peristaltik usus', 'bertambah, karena energi tubuh habis', 'tidak berubah sama sekali'], answer: 'berkurang, karena gerak tubuh membantu gerak peristaltik usus' }],
          explain: 'Aktivitas fisik membantu merangsang gerak peristaltik. Ingat: ketiga faktor berubah bersamaan, jadi data ini belum bisa memastikan mana penyebab utamanya.' }
      ]
    },
    5: {
      type: 'stations',
      title: 'Perbaiki iklan',
      intro: 'Studio iklan menyiarkan klaim yang menyesatkan. Tulis ulang naskahnya agar jujur terhadap data, lalu tentukan data sasaran yang masih kurang.',
      stations: [
        { id: 'naskah', kind: 'board', at: [-0.86, 0.1], label: 'Naskah Iklan', color: '#ff9f91',
          blanks: [{ label: 'Naskah iklan yang jujur terhadap data', options: ['Menu C paling sehat karena energinya paling tinggi.', 'Pada data simulasi, Menu C lebih tinggi energinya (600 kkal), sedangkan Menu B lebih tinggi protein dan seratnya. Pilih sesuai kebutuhan.', 'Menu B pasti paling sehat untuk semua orang.'], answer: 'Pada data simulasi, Menu C lebih tinggi energinya (600 kkal), sedangkan Menu B lebih tinggi protein dan seratnya. Pilih sesuai kebutuhan.' }],
          explain: 'Naskah yang jujur menyebutkan data apa adanya tanpa melompat ke klaim "paling sehat".' },
        { id: 'sasaran', kind: 'board', at: [0.86, 0.1], label: 'Data Sasaran', color: '#68dce7',
          blanks: [{ label: 'Agar klaim "sehat untuk siswa SMA" bisa dinilai, perlu data…', options: ['Warna kemasan dan nama artis pengiklan', 'Kebutuhan gizi siswa SMA dan porsi yang dimakan', 'Jumlah penonton iklan'], answer: 'Kebutuhan gizi siswa SMA dan porsi yang dimakan' }],
          explain: '"Sehat" selalu bergantung pada sasaran. Tanpa data kebutuhan gizi dan porsi, klaim belum bisa diuji.' }
      ]
    },
    6: {
      type: 'collect',
      title: 'Siapkan bahan lokal',
      intro: 'Kumpulkan bahan pangan lokal di sekitar Dapur Juara ke dalam rantangmu (minimal 4). Bahan yang terkumpul otomatis masuk ke rancangan menu.',
      need: 4,
      items: [
        { id: 'jagung', label: 'Jagung', kind: 'corn', group: 'Makanan pokok · sumber karbohidrat', at: [-0.76, -0.12] },
        { id: 'tempe', label: 'Tempe', kind: 'tempe', group: 'Lauk nabati · sumber protein', at: [0.76, -0.12] },
        { id: 'telur', label: 'Telur ayam', kind: 'egg', group: 'Lauk hewani · sumber protein', at: [-0.84, 0.3] },
        { id: 'kelor', label: 'Daun kelor', kind: 'leaf', group: 'Sayur · sumber serat, vitamin, mineral', at: [0.84, 0.3] },
        { id: 'ubi', label: 'Ubi jalar', kind: 'ubi', group: 'Makanan pokok · sumber karbohidrat dan serat', at: [-0.5, 0.64] },
        { id: 'pisang', label: 'Pisang', kind: 'banana', group: 'Buah · sumber karbohidrat dan vitamin', at: [0.5, 0.64] }
      ],
      stage: { at: [0, 0.86], label: 'Panggung Presentasi' },
      explain: 'Cari nilai gizi per 100 g setiap bahan di Tabel Komposisi Pangan Indonesia (TKPI) atau label pangan, lalu hitung kontribusinya sesuai berat porsi.'
    }
  };
  window.NUTRANTARA_MISSIONS.forEach((m) => { if (ACTIVITIES[m.id]) m.activity = ACTIVITIES[m.id]; });
})();

/*
 * Pos 1 "Detektif Menu": 100 varian kasus (varian 0 = kasus asli Menu A/B).
 * Setiap siswa mendapat satu varian acak yang tersimpan di progresnya (posts[1].variant),
 * sehingga teman sebangku memeriksa pasangan menu dan bukti yang berbeda.
 * Varian dibuat deterministik (PRNG berbenih tetap), jadi browser dan server selalu
 * menghasilkan kunci jawaban yang sama. Jangan ubah benih/urutan daftar tanpa alasan:
 * progres siswa yang sudah berjalan akan menunjuk ke kasus yang berbeda.
 * Semua angka adalah data simulasi, bukan rekomendasi gizi.
 * Struktur tetap: 3 baris arsip (Energi + 2 indikator) dan 2 tantangan, agar terminal 3D dan skor tidak berubah.
 */
(function () {
  const m1 = window.NUTRANTARA_MISSIONS.find((m) => m.id === 1);
  if (!m1) return;
  const COUNT = 100;
  let seed = 20261122;
  const rand = () => { // mulberry32
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const joinAnd = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} dan ${list[list.length - 1]}` : list[0]);
  // Format rupiah manual (tidak bergantung pada data lokal Intl di server).
  const rupiah = (n) => `Rp${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

  // Kadar per tingkat (rendah, sedang, tinggi) per porsi — simulasi.
  const IND = [
    { key: 'protein', label: 'Protein', unit: 'g', lv: [10, 17, 26] },
    { key: 'fiber', label: 'Serat', unit: 'g', lv: [2, 5, 9] },
    { key: 'fat', label: 'Lemak', unit: 'g', lv: [9, 17, 27] },
    { key: 'sugar', label: 'Gula', unit: 'g', lv: [4, 11, 24] },
    { key: 'sodium', label: 'Natrium', unit: 'mg', lv: [350, 800, 1450], step: 10 },
    { key: 'calcium', label: 'Kalsium', unit: 'mg', lv: [70, 160, 310], step: 5 },
    { key: 'iron', label: 'Zat besi', unit: 'mg', lv: [2, 4, 7] },
    { key: 'vitc', label: 'Vitamin C', unit: 'mg', lv: [3, 15, 40] }
  ];
  // Profil tingkat menu kantin: [protein, serat, lemak, gula, natrium, kalsium, zat besi, vitamin C].
  const DISHES = [
    ['Nasi uduk telur', [1, 0, 2, 0, 1, 0, 1, 0]],
    ['Gado-gado', [1, 2, 1, 1, 1, 1, 1, 1]],
    ['Pecel tempe', [1, 2, 1, 1, 1, 1, 2, 1]],
    ['Mi goreng', [0, 0, 2, 0, 2, 0, 0, 0]],
    ['Soto ayam', [2, 0, 1, 0, 2, 0, 1, 0]],
    ['Pempek cuko', [1, 0, 1, 2, 1, 1, 0, 0]],
    ['Ikan + sayur asem', [2, 1, 0, 0, 1, 1, 1, 2]],
    ['Nasi goreng', [1, 0, 2, 0, 2, 0, 1, 0]],
    ['Bubur tinutuan', [0, 2, 0, 0, 1, 1, 2, 2]],
    ['Papeda kuah kuning', [2, 0, 0, 0, 1, 1, 1, 1]],
    ['Nasi jagung urap', [0, 2, 1, 0, 0, 1, 1, 1]],
    ['Martabak manis', [0, 0, 2, 2, 0, 1, 0, 0]],
    ['Nasi rendang', [2, 1, 2, 0, 1, 1, 2, 1]],
    ['Ketoprak', [1, 1, 1, 1, 1, 1, 1, 0]],
    ['Sate lontong', [2, 0, 1, 1, 1, 0, 1, 0]],
    ['Pecel lele', [2, 1, 2, 0, 1, 1, 1, 1]],
    ['Lontong sayur', [1, 1, 1, 0, 2, 1, 1, 0]]
  ];
  const PACKS = ['kotak kertas', 'daun pisang', 'mangkuk', 'besek bambu', 'kertas nasi', 'rantang', 'piring rotan'];
  const ENERGY = [450, 480, 500, 520, 550, 600];
  const value = (ind, level) => {
    const step = ind.step || 1;
    return Math.max(1, Math.round((ind.lv[level] * (0.88 + rand() * 0.24)) / step) * step);
  };

  const pairs = [];
  DISHES.forEach((a, i) => DISHES.forEach((b, j) => { if (i < j) pairs.push([a, b]); }));

  function build(n, [dishA, dishB]) {
    const [A, B] = rand() < 0.5 ? [dishA, dishB] : [dishB, dishA];
    const a = A[0]; const b = B[0];
    const E = pick(ENERGY);
    const diff = IND.filter((ind, k) => A[1][k] !== B[1][k]);
    const same = IND.filter((ind, k) => A[1][k] === B[1][k]);
    const chosen = same.length && (diff.length === 1 || rand() < 0.45)
      ? [{ ind: pick(diff), differs: true }, { ind: pick(same), differs: false }]
      : shuffle(diff).slice(0, 2).map((ind) => ({ ind, differs: true }));
    const rows = shuffle(chosen).map(({ ind, differs }) => {
      const k = IND.indexOf(ind);
      const va = value(ind, A[1][k]);
      const vb = differs ? value(ind, B[1][k]) : va;
      return { ind, differs, va, vb };
    });
    const diffRows = rows.filter((r) => r.differs);
    const sameRow = rows.find((r) => !r.differs);
    const diffNames = diffRows.map((r) => r.ind.label);
    const top = diffRows[0].va > diffRows[0].vb ? a : b;

    const priceA = 8000 + Math.floor(rand() * 21) * 500;
    let priceB = 8000 + Math.floor(rand() * 21) * 500;
    if (priceA === priceB) priceB += 1500;
    const packA = pick(PACKS);
    const packB = pick(PACKS.filter((p) => p !== packA));
    const cheaper = priceA < priceB ? a : b;

    const stimulus = {
      title: 'ARSIP MENU',
      ref: `REF. 01–${String(n + 1).padStart(3, '0')}`,
      columns: ['INDIKATOR', a.toUpperCase(), b.toUpperCase()],
      rows: [{ label: 'Energi', values: [[String(E), 'kkal'], [String(E), 'kkal']] }].concat(rows.map((r) => {
        const row = { label: r.ind.label, values: [[String(r.va), r.ind.unit], [String(r.vb), r.ind.unit]] };
        if (r.differs) row.highlight = [r.va > r.vb ? 0 : 1];
        return row;
      })),
      insight: pick([
        'Energi setara belum tentu berarti semua zat gizi setara.',
        'Angka energi yang sama bisa menyembunyikan komposisi zat gizi yang berbeda.',
        'Bandingkan setiap baris: satu indikator yang sama tidak membuat semua indikator sama.'
      ])
    };

    const q1 = pick([
      { question: `Energi ${a} dan ${b} sama-sama ${E} kkal. Apa yang bisa kamu simpulkan?`,
        options: [
          { value: 'same', text: 'Komposisi kedua menu pasti sama.' },
          { value: 'different', text: 'Energinya sama, tetapi komposisi zat gizinya dapat berbeda.' },
          { value: 'healthy', text: 'Menu dengan energi sama pasti sama sehatnya.' }
        ] },
      { question: `Petugas kantin berkata, “${a} dan ${b} sama saja, energinya kan sama-sama ${E} kkal.” Bagaimana tanggapanmu berdasarkan arsip?`,
        options: [
          { value: 'same', text: 'Setuju. Energi yang sama berarti kandungan gizinya juga sama.' },
          { value: 'different', text: 'Belum tentu. Energinya sama, tetapi zat gizi lain di arsip perlu dibandingkan dan bisa berbeda.' },
          { value: 'healthy', text: 'Setuju. Karena energinya sama, keduanya pasti sama sehatnya.' }
        ] },
      { question: `Kesimpulan mana yang paling didukung arsip ${a} dan ${b}?`,
        options: [
          { value: 'healthy', text: `${top} pasti lebih sehat untuk semua siswa.` },
          { value: 'same', text: 'Karena energinya sama, semua zat gizinya pasti sama.' },
          { value: 'different', text: `Energi kedua menu sama (${E} kkal), tetapi komposisi zat gizinya berbeda.` }
        ] }
    ]);
    const challenge1 = {
      type: 'single',
      label: 'POLA DATA',
      question: q1.question,
      options: shuffle(q1.options),
      correct: 'different',
      hints: [
        `Belum tepat. Energi hanya menunjukkan satu bagian dari komposisi. Bandingkan juga data ${joinAnd(rows.map((r) => lower(r.ind.label)))}.`,
        'Periksa lagi: energi sama tidak otomatis membuat semua zat gizi sama.'
      ],
      success: `Tepat. Energi sama (${E} kkal) tidak menjamin ${joinAnd(diffNames.map(lower))} sama.`
    };

    const claim = pick([
      { text: `${top} pasti paling sehat untuk semua siswa.`, why: 'tabel tidak cukup untuk menyatakan menu mana yang paling sehat bagi semua siswa' },
      { text: `${cheaper} lebih murah, jadi gizinya pasti lebih rendah.`, why: 'harga tidak menunjukkan kandungan zat gizi' },
      { text: `Menu yang dibungkus ${packA} pasti lebih bergizi.`, why: 'kemasan tidak menunjukkan kandungan zat gizi' }
    ]);
    const challenge2 = {
      type: 'multi',
      label: 'PILIH BUKTI',
      question: `Data mana yang membuktikan komposisi ${a} dan ${b} berbeda? Pilih semua yang mendukung.`,
      options: shuffle([
        { value: 'energy', text: `Energi kedua menu sama-sama ${E} kkal.` },
        ...rows.map((r) => ({ value: r.ind.key, text: `${r.ind.label}: ${a} ${r.va} ${r.ind.unit}, ${b} ${r.vb} ${r.ind.unit}.` })),
        { value: 'claim', text: claim.text }
      ]),
      correct: diffRows.map((r) => r.ind.key),
      hints: [
        'Belum tepat. Cari indikator yang nilainya berbeda, dan hindari klaim yang tidak dibuktikan oleh tabel.',
        'Pilih hanya data yang nilainya berbeda antara kedua menu. Nilai yang sama bukan bukti perbedaan.'
      ],
      success: `Tepat. ${joinAnd(diffNames.map((x, i) => (i ? lower(x) : x)))} berbeda, jadi komposisinya berbeda.${sameRow ? ` ${sameRow.ind.label} bernilai sama (${sameRow.va} ${sameRow.ind.unit}), jadi bukan bukti perbedaan.` : ''} Energi yang sama juga bukan bukti, dan ${claim.why}.`
    };

    return {
      mission: {
        description: `${a} dan ${b}, energi yang sama. Temukan bukti yang mengungkap perbedaan komposisinya.`,
        nara: {
          intro: `${a} dan ${b} sama-sama ${E} kkal. Apakah itu berarti komposisinya juga sama? Mari periksa arsipnya.`,
          afterOne: m1.nara.afterOne,
          afterTwo: m1.nara.afterTwo
        },
        stimulus,
        challenges: [challenge1, challenge2],
        passport: {
          prompt: `Apa yang kamu pelajari dari perbandingan ${a} dan ${b}?`,
          placeholder: 'Contoh: Energi kedua menu sama, tetapi data … menunjukkan bahwa…'
        }
      },
      distractorValues: [[rupiah(priceA), packA], [rupiah(priceB), packB]]
    };
  }

  m1.stimulus.ref = 'REF. 01–001';
  const variants = [{
    mission: { description: m1.description, nara: m1.nara, stimulus: m1.stimulus, challenges: m1.challenges, passport: m1.passport },
    distractorValues: m1.activity ? m1.activity.distractor.values : null
  }];
  shuffle(pairs).slice(0, COUNT - 1).forEach((pair, i) => variants.push(build(i + 1, pair)));
  m1.variants = variants;
})();
