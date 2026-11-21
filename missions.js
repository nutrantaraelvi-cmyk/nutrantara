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
