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
    title: 'Pemulihan',
    titleEm: 'Arsip',
    mapLabel: 'PEMULIHAN ARSIP',
    location: 'RUANG ARSIP & DAPUR JUARA',
    description: 'Telaah penjelasan teman regu, kumpulkan Paspor Nusantara, lalu rancang menu juara di Dapur Juara berdasarkan bukti.',
    duration: '1–2 PERTEMUAN',
    nara: {
      archive: 'Arsip Nusantara rusak: halaman-halamannya pudar. Telaah penjelasan Paspor teman regumu dengan rubrik Klaim–Bukti–Penalaran agar setiap halaman pulih.',
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
      title: 'Rakit jalur & selidiki Ruang Y',
      intro: 'Tiga meja lab menunggu: karbohidrat, protein, dan lemak. Rakit jalur normalnya, lalu bawa sampel Ruang X dan Y ke Meja Uji Reagen. Uji, bandingkan, dan tunjuk bagian jalur yang macet. Tuduhan tanpa bukti ditolak!',
      stations: [
        { id: 'karbo', kind: 'bench', at: [-0.86, 0.12], label: 'Meja Karbohidrat', color: '#ffd17c', chain: ['Amilum', 'Maltosa', 'Glukosa'],
          blanks: [{ label: 'Amilum → Maltosa dipecah oleh', options: ['Amilase', 'Pepsin', 'Lipase'], answer: 'Amilase' }, { label: 'Maltosa → Glukosa dipecah oleh', options: ['Tripsin', 'Maltase', 'Empedu'], answer: 'Maltase' }],
          explain: 'Amilase (dari ludah dan pankreas) memecah amilum menjadi maltosa. Maltase di usus halus memecah maltosa menjadi glukosa.' },
        { id: 'protein', kind: 'bench', at: [0.86, 0.12], label: 'Meja Protein', color: '#ff9f91', chain: ['Protein', 'Pepton/peptida', 'Asam amino'],
          blanks: [{ label: 'Protein → Pepton di lambung oleh', options: ['Amilase', 'Pepsin', 'Lipase'], answer: 'Pepsin' }, { label: 'Pepton → Asam amino oleh', options: ['Tripsin dan peptidase', 'Maltase', 'Empedu'], answer: 'Tripsin dan peptidase' }],
          explain: 'Pepsin di lambung memecah protein menjadi pepton. Tripsin dari pankreas dan peptidase di usus halus melanjutkannya menjadi asam amino.' },
        { id: 'lemak', kind: 'bench', at: [0, 0.84], label: 'Meja Lemak', color: '#68dce7', chain: ['Lemak', 'Butiran lemak kecil', 'Asam lemak + gliserol'],
          blanks: [{ label: 'Lemak → butiran kecil (emulsifikasi) oleh', options: ['Pepsin', 'Empedu', 'Maltase'], answer: 'Empedu' }, { label: 'Butiran lemak → asam lemak + gliserol oleh', options: ['Lipase', 'Amilase', 'Tripsin'], answer: 'Lipase' }],
          explain: 'Empedu bukan enzim; ia mengemulsikan lemak menjadi butiran kecil. Lipase pankreas lalu memecahnya menjadi asam lemak dan gliserol.' },
        { id: 'lab', kind: 'lab', at: [0, 0.4], label: 'Meja Uji Reagen', color: '#c58cf0' }
      ],
      // Meja Uji Reagen: praktikum virtual uji makanan. Kasus aktif (caseId) dipasang oleh varian Pos 2.
      // Hasil uji adalah simulasi berbasis prinsip uji makanan SMA (Lugol, Benedict, Biuret, Sudan III).
      caseId: 'protease',
      lab: {
        brief: 'Sampel isi usus halus dua jam setelah makan nasi, telur, dan santan. Ruang X adalah kontrol normal; Ruang Y bermasalah. Uji keduanya, lalu tunjuk bagian jalur yang macet.',
        budget: 6,
        sample: '#f1e4c6',
        tools: [
          { id: 'lugol', label: 'Lugol', tests: 'amilum (pati)', color: '#b9782a', kind: 'drop' },
          { id: 'benedict', label: 'Benedict', tests: 'gula hasil cerna (glukosa, maltosa)', color: '#3b7fd1', kind: 'heat' },
          { id: 'biuret', label: 'Biuret', tests: 'protein utuh', color: '#5b9de3', kind: 'drop' },
          { id: 'sudan', label: 'Sudan III', tests: 'lemak', color: '#e2553f', kind: 'drop' },
          { id: 'micro', label: 'Mikroskop', tests: 'ukuran butiran lemak', color: '#11a3b5', kind: 'look' }
        ],
        normal: { lugol: 'neg', benedict: 'pos', biuret: 'neg', sudan: 'neg', micro: 'few' },
        results: {
          lugol: { neg: { color: '#d9a441', word: 'Negatif', text: 'kuning kecokelatan: amilum sudah terurai.' }, pos: { color: '#1f2a5c', word: 'Positif', text: 'biru kehitaman: masih banyak amilum.' } },
          benedict: { pos: { color: '#c4532b', word: 'Positif', text: 'merah bata: banyak gula hasil pencernaan.' }, neg: { color: '#3b7fd1', word: 'Negatif', text: 'tetap biru: hampir tidak ada gula hasil pencernaan.' } },
          biuret: { neg: { color: '#7fb2e5', word: 'Negatif', text: 'tetap biru: protein sudah terurai.' }, pos: { color: '#7b3fa0', word: 'Positif', text: 'ungu: masih banyak protein utuh.' } },
          sudan: { neg: { color: '#f3dcb8', word: 'Negatif', text: 'tidak ada lapisan merah: lemak sudah terurai.' }, pos: { color: '#f3dcb8', layer: '#e0472f', word: 'Positif', text: 'lapisan merah jingga mengapung di atas: masih banyak lemak.' } },
          micro: { few: { dots: [5, 'small'], word: 'Normal', text: 'butiran lemak sangat kecil dan sedikit.' }, many: { dots: [26, 'small'], word: 'Janggal', text: 'banyak butiran lemak kecil: lemak sudah teremulsi, tetapi belum dipecah.' }, big: { dots: [6, 'big'], word: 'Janggal', text: 'butiran lemak besar dan menggumpal: lemak tidak teremulsi.' } }
        },
        cases: {
          amilase: { label: 'Amilase (pemecah amilum)', y: { lugol: 'pos', benedict: 'neg' }, need: [['lugol', 'benedict']], needHint: 'Uji Ruang Y dengan reagen yang memeriksa pati atau gula hasil pencernaan.',
            predict: 'Jika amilase yang macet, Lugol di Ruang Y akan positif (biru kehitaman) dan Benedict negatif.', path: { from: 'Amilum', mid: 'Maltosa', to: 'Glukosa', agent: 'Amilase + maltase' },
            explain: 'Tanpa amilase, amilum tidak dipecah menjadi maltosa. Lugol Ruang Y positif dan Benedict negatif, sedangkan uji protein dan lemak sama dengan kontrol.' },
          protease: { label: 'Protease — pepsin & tripsin (pemecah protein)', y: { biuret: 'pos' }, need: [['biuret']], needHint: 'Uji Ruang Y dengan reagen yang memeriksa protein utuh.',
            predict: 'Jika protease yang macet, Biuret di Ruang Y akan positif (ungu) karena protein tetap utuh.', path: { from: 'Protein', mid: 'Peptida', to: 'Asam amino', agent: 'Protease + peptidase' },
            explain: 'Tanpa protease, protein tidak dipecah menjadi peptida. Biuret Ruang Y positif ungu, sedangkan uji pati, gula, dan lemak sama dengan kontrol.' },
          lipase: { label: 'Lipase (pemecah lemak)', y: { sudan: 'pos', micro: 'many' }, need: [['sudan'], ['micro']], needHint: 'Sudan III saja belum cukup: lemak juga tertinggal bila empedu macet. Periksa ukuran butiran lemak Ruang Y.',
            predict: 'Jika lipase yang macet, Sudan III Ruang Y positif, tetapi butiran lemaknya kecil-kecil karena empedu tetap mengemulsikannya.', path: { from: 'Butiran lemak', mid: 'Digliserida', to: 'Asam lemak + gliserol', agent: 'Lipase' },
            explain: 'Lemak Ruang Y tertinggal (Sudan III positif), padahal butirannya sudah kecil. Emulsifikasi berjalan, jadi yang macet adalah lipase pemecahnya.' },
          empedu: { label: 'Empedu (pengemulsi lemak)', y: { sudan: 'pos', micro: 'big' }, need: [['sudan'], ['micro']], needHint: 'Sudan III saja belum cukup: lemak juga tertinggal bila lipase macet. Periksa ukuran butiran lemak Ruang Y.',
            predict: 'Jika empedu yang macet, Sudan III Ruang Y positif dan butiran lemaknya besar menggumpal karena tidak teremulsi.', path: { from: 'Gumpalan lemak', mid: 'Butiran kecil', to: 'Asam lemak + gliserol', agent: 'Empedu → lipase' },
            explain: 'Lemak Ruang Y tertinggal dan butirannya besar menggumpal. Tanpa empedu, lemak tidak teremulsi sehingga lipase sulit bekerja. Ingat: empedu bukan enzim.' }
        }
      }
    },
    3: {
      type: 'stations',
      title: 'Cerna dulu, baru serap!',
      intro: 'Gerbang usus halus macet karena banyak penjelajah tertukar antara pencernaan dan penyerapan. Pilah prosesnya di Gerbang Pilah, buktikan di Simulator Vili 3D, lalu pulihkan komponen gerbang.',
      stations: [
        { id: 'sortir', kind: 'twingate', at: [-0.86, 0.1], label: 'Gerbang Pilah', color: '#ff9f43' },
        { id: 'vili', kind: 'villi', at: [0, 0.78], label: 'Simulator Vili 3D', color: '#ff6f91' },
        { id: 'gerbang', kind: 'gate', at: [0.86, 0.1], label: 'Komponen Gerbang', color: '#78f4bd',
          blanks: [{ label: 'Struktur yang memperluas permukaan penyerapan', options: ['Epiglotis', 'Vili dan mikrovili', 'Gigi geraham'], answer: 'Vili dan mikrovili' }, { label: 'Enzim pada mikrovili yang menuntaskan pemecahan', options: ['Pepsin dan ptialin', 'Maltase, sukrase, laktase, peptidase', 'Empedu'], answer: 'Maltase, sukrase, laktase, peptidase' }],
          explain: 'Vili dan mikrovili memperluas permukaan penyerapan. Enzim di permukaan mikrovili menuntaskan pemecahan menjadi molekul siap serap: monosakarida dan asam amino.' }
      ],
      // Gerbang Pilah: kartu peristiwa dipilah ke PENCERNAAN (memecah) atau PENYERAPAN (memindahkan).
      sorter: {
        deal: 8,
        gates: {
          cerna: { label: 'PENCERNAAN', hint: 'memecah makanan atau molekul besar menjadi lebih kecil' },
          serap: { label: 'PENYERAPAN', hint: 'memindahkan molekul kecil menembus dinding saluran ke darah atau limfa' }
        },
        cards: [
          { gate: 'cerna', text: 'Gigi mengunyah nasi menjadi potongan kecil.', why: 'Mengunyah memecah makanan secara mekanik. Belum ada zat yang masuk ke darah.' },
          { gate: 'cerna', text: 'Amilase ludah memecah amilum menjadi maltosa.', why: 'Enzim memecah molekul besar menjadi lebih kecil: itu pencernaan kimiawi.' },
          { gate: 'cerna', text: 'Pepsin di lambung memecah protein menjadi pepton.', why: 'Pepsin memecah protein. Hasilnya masih di dalam lambung, belum diserap.' },
          { gate: 'cerna', text: 'Empedu mengemulsikan lemak menjadi butiran kecil.', why: 'Emulsifikasi memperkecil butiran lemak agar mudah dipecah lipase. Belum ada yang diserap.' },
          { gate: 'cerna', text: 'Lipase pankreas memecah lemak menjadi asam lemak dan gliserol.', why: 'Lipase memecah lemak: pencernaan kimiawi di usus halus.' },
          { gate: 'cerna', text: 'Dinding lambung meremas makanan hingga menjadi kimus.', why: 'Gerak meremas lambung adalah pencernaan mekanik.' },
          { gate: 'cerna', text: 'Maltase di permukaan mikrovili memecah maltosa menjadi glukosa.', why: 'Jebakan! Walau terjadi di mikrovili, maltase memecah molekul. Itu pencernaan; glukosanya baru diserap sesudahnya.' },
          { gate: 'cerna', text: 'Tripsin memecah pepton menjadi peptida yang lebih pendek.', why: 'Tripsin memecah rantai protein menjadi lebih pendek: pencernaan kimiawi.' },
          { gate: 'serap', text: 'Glukosa masuk ke kapiler darah di vili.', why: 'Glukosa berpindah menembus dinding vili ke darah: itu penyerapan.' },
          { gate: 'serap', text: 'Asam amino dibawa vena porta hepatika menuju hati.', why: 'Asam amino yang sudah diserap diangkut darah ke hati.' },
          { gate: 'serap', text: 'Asam lemak dan gliserol masuk ke pembuluh kil (lakteal).', why: 'Hasil pencernaan lemak berpindah ke pembuluh kil: penyerapan lewat jalur limfa.' },
          { gate: 'serap', text: 'Vitamin A, D, E, dan K ikut masuk ke pembuluh limfa bersama lemak.', why: 'Vitamin larut lemak diserap bersama lemak ke pembuluh limfa.' },
          { gate: 'serap', text: 'Air dan mineral diserap di usus besar.', why: 'Usus besar memindahkan air dan mineral ke tubuh: penyerapan, bukan pemecahan.' },
          { gate: 'serap', text: 'Sel epitel vili menarik asam amino dari rongga usus.', why: 'Molekul kecil dipindahkan dari rongga usus ke dalam sel: penyerapan.' }
        ]
      },
      // Simulator Vili 3D: cerna molekul besar, antar hasilnya ke jalur yang tepat, lalu uji luas permukaan (Model P vs Q).
      villi: {
        enzymes: [
          { id: 'karbo', label: 'Amilase → maltase' },
          { id: 'protein', label: 'Pepsin → tripsin → peptidase' },
          { id: 'lemak', label: 'Empedu → lipase' }
        ],
        routes: {
          darah: { label: 'Kapiler darah', path: 'kapiler darah → vena porta hepatika → hati' },
          limfa: { label: 'Pembuluh kil (lakteal)', path: 'pembuluh kil → pembuluh limfa → aliran darah' }
        },
        molecules: [
          { id: 'amilum', label: 'Amilum (pati)', color: '#f2c94c', shape: 'chain', enzyme: 'karbo', product: 'Glukosa', route: 'darah',
            wrongEnzyme: 'Enzim tidak cocok! Amilum hanya dipecah amilase lalu maltase. Enzim bekerja spesifik pada substratnya.',
            wrongRoute: 'Glukosa larut dalam air, jadi masuk ke kapiler darah, bukan pembuluh kil.' },
          { id: 'protein', label: 'Protein', color: '#ff8f7a', shape: 'fold', enzyme: 'protein', product: 'Asam amino', route: 'darah',
            wrongEnzyme: 'Enzim tidak cocok! Protein dipecah pepsin, tripsin, lalu peptidase. Enzim bekerja spesifik pada substratnya.',
            wrongRoute: 'Asam amino larut dalam air, jadi masuk ke kapiler darah lalu ke hati, bukan pembuluh kil.' },
          { id: 'lemak', label: 'Lemak', color: '#ffd166', shape: 'blob', enzyme: 'lemak', product: 'Asam lemak + gliserol', route: 'limfa',
            wrongEnzyme: 'Enzim tidak cocok! Lemak perlu diemulsikan empedu, lalu dipecah lipase.',
            wrongRoute: 'Di sel vili, asam lemak dan gliserol disusun ulang menjadi butiran lemak berlapis protein (kilomikron) yang terlalu besar untuk kapiler, jadi masuk pembuluh kil.' }
        ],
        tooBig: 'Terpental! Molekul ini terlalu besar untuk menembus dinding vili. Cerna dulu menjadi molekul kecil.',
        models: {
          P: { label: 'Model P · vili tinggi + mikrovili', surface: 100, cross: 80 },
          Q: { label: 'Model Q · vili rusak dan pendek', surface: 40, cross: 32 }
        },
        conclusion: {
          question: 'Kedua model sama-sama membentuk 100 unit asam amino. Apa yang sebenarnya berbeda?',
          options: [
            { value: 'cerna', text: 'Pencernaannya: Model Q memecah protein lebih sedikit.' },
            { value: 'serap', text: 'Penyerapannya: pemecahan sama, tetapi Model Q memindahkan lebih sedikit asam amino ke darah karena permukaannya sempit.' },
            { value: 'enzim', text: 'Model Q tidak punya enzim pencerna protein.' }
          ],
          correct: 'serap',
          explain: 'Pencernaan memecah molekul; penyerapan memindahkan hasilnya ke sirkulasi. Luas permukaan vili dan mikrovili menentukan berapa banyak yang bisa berpindah.'
        }
      }
    },
    4: {
      type: 'stations',
      title: 'Telusuri jejak, uji secara adil',
      intro: 'Keluhan sulit BAB warga Kota Terapung berkurang, tetapi serat, air minum, dan aktivitas berubah sekaligus. Rentangkan benang dugaan di Papan Benang Merah, uji tiap faktor secara adil di Simulator Usus Besar 3D, lalu periksa batas bukti setiap berita di Menara Siaran sebelum mengudara.',
      stations: [
        { id: 'benang', kind: 'threads', at: [-0.86, 0.1], label: 'Papan Benang Merah', color: '#e2553f' },
        { id: 'kolon', kind: 'colon', at: [0, 0.8], label: 'Simulator Usus Besar 3D', color: '#ff9f43' },
        { id: 'siaran', kind: 'tower', at: [0.86, 0.1], label: 'Menara Siaran', color: '#1fc3d3' }
      ],
      // Papan Benang Merah: peta dugaan sebab-akibat (faktor → mekanisme → akibat), terinspirasi pemodelan sistem
      // SageModeler. at = posisi kartu di papan (persen lebar, persen tinggi). Kartu jebakan memutus benang.
      threads: {
        lanes: {
          serat: { label: 'Jalur serat', icon: '🥬', color: '#3fa95c' },
          air: { label: 'Jalur air', icon: '💧', color: '#1fa3d3' },
          aktivitas: { label: 'Jalur aktivitas', icon: '🏃', color: '#f59f0b' },
          akibat: { label: 'Simpul akibat', icon: '🎯', color: '#e2553f' }
        },
        nodes: [
          { id: 'serat', kind: 'factor', lane: 'serat', text: 'Serat harian naik', at: [10, 15] },
          { id: 'air', kind: 'factor', lane: 'air', text: 'Air minum naik', at: [10, 50] },
          { id: 'aktivitas', kind: 'factor', lane: 'aktivitas', text: 'Aktivitas fisik naik', at: [10, 85] },
          { id: 'massa', kind: 'mech', text: 'Massa feses bertambah dan mengikat air', at: [30, 15] },
          { id: 'cairan', kind: 'mech', text: 'Cairan di usus besar tercukupi', at: [30, 50] },
          { id: 'peristaltik', kind: 'mech', text: 'Gerak peristaltik usus besar lebih aktif', at: [30, 85] },
          { id: 'cerna', kind: 'mech', trap: true, text: 'Serat dicerna enzim menjadi glukosa lalu masuk darah', at: [51, 15],
            why: 'Serat tidak dapat dicerna enzim pencernaan manusia, jadi tidak menjadi glukosa. Justru karena tidak dicerna, serat sampai di usus besar dan menambah massa feses.' },
          { id: 'lama', kind: 'mech', trap: true, text: 'Isi usus besar tertahan lebih lama', at: [51, 62],
            why: 'Arahnya terbalik. Peristaltik yang lebih aktif mendorong isi usus besar lebih cepat, bukan menahannya lebih lama.' },
          { id: 'transit', kind: 'mech', text: 'Transit lebih singkat, air yang diserap kembali berkurang', at: [51, 86] },
          { id: 'lunak', kind: 'effect', text: 'Feses lebih lunak dan mudah didorong', at: [71, 50] },
          { id: 'keras', kind: 'mech', trap: true, text: 'Feses lebih keras dan kering', at: [71, 85],
            why: 'Arahnya terbalik. Feses yang bermassa, cukup cairan, dan tidak lama tertahan justru menjadi lebih lunak, bukan lebih keras.' },
          { id: 'keluhan', kind: 'outcome', text: 'Hari keluhan sulit BAB berkurang', at: [90, 50] }
        ],
        links: [
          { from: 'serat', to: 'massa', lane: 'serat', why: 'Serat tidak dicerna, jadi menambah massa feses dan mengikat air.' },
          { from: 'massa', to: 'lunak', lane: 'serat', why: 'Feses yang bermassa dan menahan air menjadi lebih lunak dan mudah didorong.' },
          { from: 'air', to: 'cairan', lane: 'air', why: 'Air minum menambah cairan tubuh, termasuk cairan yang sampai di usus besar.' },
          { from: 'cairan', to: 'lunak', lane: 'air', why: 'Usus besar menyerap air dari sisa makanan. Bila cairannya cukup, feses tidak terlalu kering.' },
          { from: 'aktivitas', to: 'peristaltik', lane: 'aktivitas', why: 'Gerak tubuh diduga membantu merangsang gerak peristaltik usus.' },
          { from: 'peristaltik', to: 'transit', lane: 'aktivitas', why: 'Peristaltik yang aktif mendorong isi usus besar lebih cepat sehingga waktu transitnya singkat.' },
          { from: 'transit', to: 'lunak', lane: 'aktivitas', why: 'Makin singkat isi usus besar tertahan, makin sedikit air yang diserap kembali, sehingga feses tidak mengeras.' },
          { from: 'lunak', to: 'keluhan', lane: 'akibat', why: 'Feses yang lunak lebih mudah dikeluarkan, sehingga hari keluhan berkurang.' }
        ],
        skip: 'Benang terlalu panjang: kamu melompati langkah mekanismenya. Jejak sebab-akibat yang kuat menjelaskan bagaimana sebab menghasilkan akibat, langkah demi langkah.',
        reverse: 'Arah benang terbalik. Tarik benang dari sebab menuju akibatnya.',
        tangle: 'Benang kusut: itu bukan langkah langsung dari kartu ini. Baca lagi kartunya: apa yang langsung diubahnya?',
        finale: 'Tiga benang bertemu di satu simpul: feses lebih lunak. Pada Minggu 2 ketiga faktor naik bersamaan, jadi dari catatan itu saja kita tidak tahu benang mana yang bekerja: satu, dua, atau ketiganya. Inilah faktor terpaut. Ingat juga, benang ini baru dugaan mekanisme, belum bukti.'
      },
      // Simulator Usus Besar 3D ("Mesin Uji Adil"), mengikuti Control of Variables Strategy (Chen & Klahr 1999):
      // uji adil hanya mengubah satu faktor. Model simulasi sederhana; angka bukan saran kesehatan.
      // Minggu dasar (semua rendah) = Minggu 1 catatan harian; semua tinggi = Minggu 2.
      colon: {
        factors: [
          { id: 'serat', icon: '🥬', label: 'Serat', unit: 'g', low: 10, high: 22, days: 2, transit: 20 },
          { id: 'air', icon: '💧', label: 'Air minum', unit: 'gelas', low: 4, high: 8, days: 1, transit: 6 },
          { id: 'aktivitas', icon: '🏃', label: 'Aktivitas', unit: 'menit', low: 15, high: 45, days: 1, transit: 10 }
        ],
        base: { days: 5, transit: 68 },
        same: 'IDENTIK: kedua minggu sama persis, jadi tidak ada faktor yang diuji. Uji adil bukan berarti menyamakan semuanya, melainkan mengubah tepat satu faktor.',
        conclusion: {
          question: 'Buku Uji mencatat hasil uji adil dibanding minggu dasar: serat −2 hari keluhan, air −1 hari, aktivitas −1 hari (simulasi). Kesimpulan mana yang paling tepat?',
          options: [
            { value: 'serat-saja', text: 'Hanya serat yang berpengaruh, jadi air minum dan aktivitas tidak perlu diperhatikan.' },
            { value: 'model', text: 'Di dalam model ini, setiap faktor ikut mengurangi hari keluhan dan serat paling besar. Karena ini simulasi, kesimpulannya perlu diuji lagi pada data nyata.' },
            { value: 'empat', text: 'Setiap faktor mengurangi 4 hari keluhan, sama dengan selisih Minggu 1 dan Minggu 2.' }
          ],
          correct: 'model',
          wrong: { 'serat-saja': 'Lihat Buku Uji: uji adil air dan aktivitas juga mengurangi hari keluhan, walau lebih sedikit.', empat: 'Selisih 4 hari terjadi saat ketiga faktor naik bersamaan. Uji adil menunjukkan bagian tiap faktor jauh lebih kecil.' },
          explain: 'Uji adil memisahkan faktor yang terpaut: ubah satu, setarakan sisanya. Tetap kenali batasnya: simulator ini model sederhana yang hasilnya selalu sama. Pada manusia nyata, bukti terkuat ada pada serat; manfaat menambah air terutama terlihat pada orang yang kurang minum, dan peran aktivitas fisik masih terus diteliti.'
        }
      },
      // Menara Siaran: setiap berita diperiksa dengan satu lensa batas bukti sebelum boleh mengudara.
      // Kartu ke-k dipegang peran k mod 4 (seperti Gerbang Pilah Pos 3). Berita bersifat fiktif.
      tower: {
        deal: 8,
        lenses: {
          terpaut: { icon: '🧶', label: 'Faktor terpaut', hint: 'beberapa hal berubah bersamaan' },
          tipis: { icon: '🪶', label: 'Bukti tipis', hint: 'satu orang atau waktu terlalu singkat' },
          hubungan: { icon: '🔗', label: 'Baru hubungan', hint: 'hanya terlihat bersamaan; mungkin ada faktor ketiga' },
          adil: { icon: '⚖', label: 'Uji adil', hint: 'satu faktor diubah, sisanya disetarakan' }
        },
        cards: [
          { lens: 'terpaut', text: 'Minggu ini Raka makan lebih banyak sayur, minum lebih banyak, dan rajin bersepeda. Keluhannya berkurang. Pasti karena sayurnya!',
            why: 'Tiga hal berubah bersamaan, jadi berkurangnya keluhan belum bisa dikaitkan dengan sayur saja.',
            fix: 'Keluhan Raka berkurang saat sayur, air minum, dan aktivitasnya naik bersamaan. Belum diketahui faktor mana yang berperan.' },
          { lens: 'terpaut', text: 'Kantin mengganti menu menjadi berserat sekaligus memasang dispenser air gratis. Keluhan siswa turun. Menu baru terbukti manjur!',
            why: 'Menu dan kebiasaan minum berubah pada waktu yang sama. Dispenser air bisa ikut berperan.',
            fix: 'Setelah menu berserat dan dispenser air hadir bersamaan, keluhan siswa turun. Perlu uji terpisah untuk tahu peran masing-masing.' },
          { lens: 'terpaut', text: 'Selama liburan, Dinda tidur lebih cukup, makan buah setiap hari, dan banyak jalan kaki. BAB-nya lancar. Buahlah kuncinya!',
            why: 'Tidur, buah, dan jalan kaki berubah sekaligus. Ketiganya terpaut, jadi buah belum tentu kuncinya.',
            fix: 'BAB Dinda lancar selama liburan, saat tidur, makan buah, dan jalan kakinya bertambah bersamaan.' },
          { lens: 'tipis', text: 'Paman Bayu minum air jahe satu kali dan besoknya langsung lancar. Air jahe obat ampuh sembelit!',
            why: 'Hanya satu orang dan satu hari. Hasil seperti ini bisa saja kebetulan.',
            fix: 'Paman Bayu merasa lebih lancar sehari setelah minum air jahe. Satu pengalaman belum cukup untuk menyimpulkan.' },
          { lens: 'tipis', text: 'Satu siswa mencoba roti gandum dua hari dan merasa lebih lancar. Roti gandum pasti cocok untuk semua siswa!',
            why: 'Satu orang selama dua hari tidak bisa mewakili semua siswa.',
            fix: 'Seorang siswa merasa lebih lancar setelah dua hari makan roti gandum. Perlu lebih banyak orang dan waktu untuk menguji.' },
          { lens: 'tipis', text: 'Sari minum yogurt tiga hari dan perutnya terasa enak. Yogurt menyembuhkan sembelit!',
            why: 'Tiga hari pada satu orang terlalu sedikit. Lagi pula "perut terasa enak" belum tentu berarti sembelitnya sembuh.',
            fix: 'Sari merasa perutnya enak setelah tiga hari minum yogurt. Itu pengalaman satu orang, belum bukti penyembuhan.' },
          { lens: 'hubungan', text: 'Survei: warga yang rutin berolahraga lebih jarang sembelit. Jadi olahraga pasti mencegah sembelit.',
            why: 'Survei hanya menunjukkan hubungan. Warga yang rutin berolahraga mungkin juga makan lebih banyak serat: itu faktor ketiga.',
            fix: 'Pada survei, warga yang rutin berolahraga lebih jarang sembelit. Hubungan ini masih perlu diuji secara adil.' },
          { lens: 'hubungan', text: 'Kampung dengan penjualan buah tertinggi punya keluhan sembelit paling rendah. Buah dari pasar itu menyembuhkan sembelit!',
            why: 'Dua hal hanya terlihat bersamaan. Kampung itu bisa berbeda dalam banyak hal lain, misalnya kebiasaan minum atau bergerak.',
            fix: 'Kampung dengan penjualan buah tertinggi juga punya keluhan sembelit terendah. Penyebabnya belum diketahui.' },
          { lens: 'hubungan', text: 'Siswa yang membawa botol minum ke sekolah jarang mengeluh sulit BAB. Botol minum penyebabnya!',
            why: 'Botol hanyalah penanda kebiasaan. Mungkin mereka minum lebih banyak, atau punya kebiasaan sehat lain.',
            fix: 'Siswa yang membawa botol minum lebih jarang mengeluh sulit BAB. Kebiasaan apa di baliknya masih perlu diteliti.' },
          { lens: 'adil', text: 'Uji simulasi: dua kelompok dengan air minum dan aktivitas yang sama, hanya seratnya yang berbeda. Kelompok serat tinggi lebih jarang mengeluh.',
            why: 'Hanya satu faktor yang dibedakan, jadi selisihnya dapat dikaitkan dengan serat. Tetap sebutkan bahwa ini data simulasi.' },
          { lens: 'adil', text: 'Selama 4 minggu, 30 relawan dibagi menjadi dua kelompok yang setara; hanya aktivitas fisiknya yang dibedakan. Kelompok aktif sedikit lebih jarang mengeluh.',
            why: 'Kelompok setara, satu faktor dibedakan, cukup banyak orang, dan cukup lama. Kesimpulannya tetap sebatas kelompok yang diuji.' },
          { lens: 'adil', text: 'Percobaan 2 minggu: air minum 20 relawan dinaikkan, menu dan aktivitas dijaga sama. Keluhan sedikit turun, terutama pada yang awalnya kurang minum.',
            why: 'Hanya air yang diubah dan faktor lain dijaga sama. Hasilnya juga jujur menyebut batasnya: efeknya paling terlihat pada yang awalnya kurang minum.' }
        ]
      }
    },
    5: {
      type: 'stations',
      title: 'Bongkar asumsi, sorot yang diabaikan',
      intro: 'Studio Iklan menyiarkan klaim yang terdengar meyakinkan. Pecahkan klaim di Mesin Pemecah Klaim untuk menemukan asumsi tersembunyi, putar kemasan di Kemasan Berputar untuk menyorot informasi yang diabaikan, lalu susun naskah yang jujur di Studio Naskah Jujur.',
      stations: [
        { id: 'pecah', kind: 'geode', at: [-0.86, 0.1], label: 'Mesin Pemecah Klaim', color: '#9b6fd6' },
        { id: 'kemasan', kind: 'package', at: [0, 0.8], label: 'Kemasan Berputar', color: '#ff9f43' },
        { id: 'studio', kind: 'studio', at: [0.86, 0.1], label: 'Studio Naskah Jujur', color: '#e2553f' }
      ],
      // Mesin Pemecah Klaim: klaim = batu geode. Dipukul → pecahan DATA dan KESIMPULAN, intinya = ASUMSI tersembunyi
      // (warrant pada model argumen Toulmin), lalu asumsinya diuji dengan informasi yang diabaikan iklan.
      // Klaim ke-k dipegang peran k mod 4. Produk dan angka fiktif (simulasi).
      geode: {
        hits: 3,
        claims: [
          { product: 'Minuman Jeruk Cerah', claim: 'Minuman Jeruk Cerah paling menyehatkan karena vitamin C-nya 200% AKG!', trick: 'Sorotan satu zat gizi',
            pieces: [{ text: 'Vitamin C 200% AKG per botol', kind: 'data' }, { text: 'Minuman Jeruk Cerah paling menyehatkan', kind: 'kesimpulan' }],
            options: [
              { text: 'Satu zat gizi yang tinggi membuat minuman sehat secara keseluruhan.', ok: true },
              { text: 'Vitamin C larut dalam air.', why: 'Benar, tetapi fakta ini tidak menghubungkan angka vitamin C dengan klaim "paling menyehatkan".' },
              { text: 'Botol minumannya berwarna jingga cerah.', why: 'Itu fakta kemasan, bukan penghubung antara data dan klaim.' }
            ],
            ignored: 'Gula 28 g per botol tidak disebut.',
            crack: 'Satu zat gizi yang tinggi tidak menjamin minuman sehat secara keseluruhan, apalagi bila gulanya tinggi.' },
          { product: 'Sereal Kriuk Pagi', claim: 'Sereal Kriuk Pagi bebas lemak, jadi pasti tidak membuat gemuk!', trick: 'Label "bebas …"',
            pieces: [{ text: 'Lemak 0 g per sajian', kind: 'data' }, { text: 'Sereal ini pasti tidak membuat gemuk', kind: 'kesimpulan' }],
            options: [
              { text: 'Berat badan hanya dipengaruhi lemak dalam makanan.', ok: true },
              { text: 'Sereal biasa dimakan saat sarapan.', why: 'Itu kebiasaan makan, bukan penghubung antara "bebas lemak" dan "tidak membuat gemuk".' },
              { text: 'Lemak termasuk zat gizi makro.', why: 'Benar, tetapi tidak menjelaskan lompatan dari "0 g lemak" ke "pasti tidak membuat gemuk".' }
            ],
            ignored: 'Gula 12 g dan energi 120 kkal per sajian tidak disebut.',
            crack: 'Energi juga datang dari gula dan karbohidrat lain. "Bebas lemak" tidak berarti bebas energi.' },
          { product: 'Camilan Batang Kuat', claim: 'Camilan Batang Kuat tinggi protein, jadi cocok untuk semua anak!', trick: 'Generalisasi berlebihan',
            pieces: [{ text: 'Protein 12 g per batang', kind: 'data' }, { text: 'Camilan ini cocok untuk semua anak', kind: 'kesimpulan' }],
            options: [
              { text: 'Makanan tinggi protein pasti cocok untuk semua orang, apa pun kebutuhannya.', ok: true },
              { text: 'Protein tersusun atas asam amino.', why: 'Benar, tetapi tidak menjelaskan mengapa camilan ini cocok untuk semua anak.' },
              { text: 'Camilan ini dijual di kantin sekolah.', why: 'Tempat penjualan tidak menunjukkan kecocokan gizi.' }
            ],
            ignored: 'Natrium 380 mg per batang dan perbedaan kebutuhan tiap anak tidak disebut.',
            crack: 'Kebutuhan gizi berbeda menurut usia, aktivitas, dan kondisi tubuh. Satu produk tidak otomatis cocok untuk semua.' },
          { product: 'Keripik Sayur Renyah', claim: 'Keripik Sayur Renyah terbuat dari sayur asli, jadi sehatnya sama dengan makan sayur!', trick: 'Efek "alami/asli"',
            pieces: [{ text: 'Bahannya bayam dan wortel asli', kind: 'data' }, { text: 'Sehatnya sama dengan makan sayur', kind: 'kesimpulan' }],
            options: [
              { text: 'Bahan asal menentukan gizi produk akhir, bagaimana pun cara mengolahnya.', ok: true },
              { text: 'Bayam berwarna hijau karena klorofil.', why: 'Benar, tetapi warna bayam tidak menghubungkan bahan asli dengan klaim kesehatan.' },
              { text: 'Keripik dikemas dalam bungkus kedap udara.', why: 'Itu fakta kemasan, bukan penghubung antara data dan klaim.' }
            ],
            ignored: 'Keripik digoreng: lemak 8 g dan natrium 210 mg per sajian, padahal sebungkus berisi 3 sajian.',
            crack: 'Cara mengolah mengubah gizi. Sayur yang digoreng menjadi keripik menyerap minyak dan diberi garam.' }
        ]
      },
      // Kemasan Berputar: depan kemasan = klaim iklan; belakang = informasi nilai gizi; samping = komposisi dan takaran saji.
      // Sebuah fakta baru bisa ditandai setelah sisi kemasannya dilihat. Semua produk dan angka fiktif.
      pack: {
        products: [
          { id: 'sereal', name: 'Sereal Kriuk Pagi', color: '#f5b72b', ink: '#7a3b12', claim: 'TINGGI SERAT!', sub: 'Sarapan sehat setiap hari', icon: '🥣',
            serving: 'Takaran saji 30 g · 4 sajian per kotak',
            label: [['Energi', '120 kkal'], ['Lemak total', '1 g'], ['Protein', '2 g'], ['Karbohidrat', '26 g'], ['Gula', '12 g'], ['Serat pangan', '3 g'], ['Natrium', '150 mg']],
            ingredients: 'Komposisi: tepung jagung, gula, dedak gandum, garam, perisa.',
            facts: [
              { text: 'Gula 12 g per sajian, hampir separuh berat sajiannya.', face: 'back', ignored: true, why: 'Iklan hanya menonjolkan serat, padahal gulanya tinggi.' },
              { text: 'Gula ada di urutan kedua komposisi.', face: 'side', ignored: true, why: 'Komposisi ditulis dari bahan terbanyak. Gula termasuk bahan utama sereal ini.' },
              { text: 'Serat pangan 3 g per sajian.', face: 'back', ignored: false, why: 'Ini justru yang disebut iklan ("tinggi serat"), bukan yang diabaikan.' },
              { text: 'Kotaknya berwarna kuning cerah.', face: 'front', ignored: false, why: 'Warna kemasan bukan informasi gizi.' }
            ] },
          { id: 'susu', name: 'Susu Cokelat Tulang Kuat', color: '#8a5a3a', ink: '#fff4dc', claim: 'KAYA KALSIUM!', sub: 'Untuk tulang kuat', icon: '🥛',
            serving: 'Takaran saji 200 ml · 1 kotak',
            label: [['Energi', '160 kkal'], ['Lemak total', '5 g'], ['Protein', '6 g'], ['Gula', '20 g'], ['Kalsium', '30% AKG']],
            ingredients: 'Komposisi: susu sapi, gula, bubuk kakao, penstabil.',
            facts: [
              { text: 'Gula 20 g per kotak.', face: 'back', ignored: true, why: 'Iklan hanya membahas kalsium; gula sebanyak ini tidak disebut.' },
              { text: 'Gula ada di urutan kedua komposisi, tepat setelah susu.', face: 'side', ignored: true, why: 'Urutan komposisi menunjukkan gula termasuk bahan terbanyak.' },
              { text: 'Kalsium 30% AKG per kotak.', face: 'back', ignored: false, why: 'Ini yang ditonjolkan iklan ("kaya kalsium"), bukan yang diabaikan.' },
              { text: 'Ada gambar sapi tersenyum di depan kotak.', face: 'front', ignored: false, why: 'Gambar kemasan bukan informasi gizi.' }
            ] },
          { id: 'keripik', name: 'Keripik Sayur Renyah', color: '#3fa95c', ink: '#ffffff', claim: '100% SAYUR ASLI', sub: 'Camilan sehat', icon: '🥬',
            serving: 'Takaran saji 25 g · 3 sajian per bungkus',
            label: [['Energi', '130 kkal'], ['Lemak total', '8 g'], ['Karbohidrat', '14 g'], ['Serat pangan', '1 g'], ['Natrium', '210 mg']],
            ingredients: 'Komposisi: bayam, wortel, minyak sawit, garam, penyedap.',
            facts: [
              { text: 'Lemak 8 g dan natrium 210 mg per sajian.', face: 'back', ignored: true, why: 'Keripik digoreng dan diberi garam; iklan tidak menyebutnya.' },
              { text: 'Satu bungkus berisi 3 sajian, jadi natrium sebungkus 630 mg.', face: 'side', ignored: true, why: 'Angka per sajian tampak kecil, padahal sebungkus biasanya dihabiskan sekaligus.' },
              { text: 'Bahan utamanya bayam dan wortel.', face: 'side', ignored: false, why: 'Ini yang ditonjolkan iklan ("sayur asli"), bukan yang diabaikan.' },
              { text: 'Bungkusnya bisa ditutup kembali.', face: 'front', ignored: false, why: 'Fitur kemasan bukan informasi gizi.' }
            ] }
        ]
      },
      // Studio Naskah Jujur: "sehat" selalu bergantung pada sasaran, lalu naskah iklan disusun dari kepingan yang jujur.
      studio: {
        personas: [
          { id: 'raka', icon: '🚣', name: 'Raka, 16 tahun', text: 'Atlet dayung pelajar, latihan 2 jam setiap sore.',
            options: ['Kecukupan energi dan protein untuk latihan dan pemulihan', 'Warna dan bentuk kotak makannya', 'Jumlah penonton iklan menu itu'], answer: 0 },
          { id: 'sinta', icon: '📚', name: 'Sinta, 17 tahun', text: 'Belajar di kelas seharian, jarang bergerak, sering sulit BAB.',
            options: ['Nama artis yang mengiklankan menu', 'Kandungan serat dan besar porsi yang dimakan', 'Harga kemasan termurah'], answer: 1 },
          { id: 'dimas', icon: '🎒', name: 'Dimas, 8 tahun', text: 'Adik kelas SD yang ikut makan siang di kantin keluarga.',
            options: ['Porsi dan kebutuhan gizi sesuai usianya', 'Menu paling berenergi pasti paling baik untuknya', 'Iklan mana yang paling sering diputar'], answer: 0 }
        ],
        personaNote: 'Menu yang sama bisa cukup untuk satu orang dan kurang atau berlebih untuk orang lain. Klaim "sehat" tanpa sasaran belum bisa dinilai.',
        slots: [
          { id: 'buka', label: 'Pembuka', options: [
            { text: 'Kenalkan Menu C dari Studio Nusantara.', ok: true },
            { text: 'Menu C, menu PALING SEHAT sedunia!', trick: 'Kata sakti "paling sehat" tanpa bukti' },
            { text: 'Menu C, cocok untuk semua orang!', trick: 'Generalisasi berlebihan' }] },
          { id: 'data', label: 'Data', options: [
            { text: 'Pada data simulasi, Menu C berisi 600 kkal.', ok: true },
            { text: 'Energi Menu C tertinggi, berarti gizinya terbaik.', trick: 'Asumsi tersembunyi: energi tinggi = lebih sehat' },
            { text: 'Menu C pasti membuatmu juara.', trick: 'Klaim tanpa data' }] },
          { id: 'banding', label: 'Pembanding', options: [
            { text: 'Menu B lebih tinggi protein (24 g) dan serat (8 g).', ok: true },
            { text: 'Menu lain tidak perlu dilirik.', trick: 'Informasi pembanding diabaikan' },
            { text: 'Kemasan Menu C paling menarik.', trick: 'Pengalih: kemasan bukan gizi' }] },
          { id: 'batas', label: 'Sasaran & batas', options: [
            { text: 'Pilih sesuai kebutuhan dan aktivitasmu.', ok: true },
            { text: 'Dijamin cocok untuk semua siswa.', trick: 'Generalisasi berlebihan' },
            { text: 'Makan sebanyak-banyaknya setiap hari.', trick: 'Porsi dan kebutuhan diabaikan' }] }
        ]
      }
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
      // Ruang Arsip Nusantara (Pemulihan Arsip): telaah sejawat atas penjelasan Paspor Pos 1–5 dengan rubrik
      // Klaim–Bukti–Penalaran (kerangka CER, McNeill & Krajcik). Halaman arsip pulih bila setiap penjelasan di dalamnya
      // sudah ditelaah teman regu (telaah diri hanya bila tidak ada teman aktif yang sudah mencapai Pos 6).
      archive: {
        at: [0, -0.5],
        label: 'Ruang Arsip Nusantara',
        rubric: [
          { id: 'k', label: 'Klaim', ask: 'Klaimnya jelas dan menjawab pertanyaan pos.' },
          { id: 'b', label: 'Bukti', ask: 'Ada angka atau data dari pos sebagai bukti.' },
          { id: 'p', label: 'Penalaran', ask: 'Dijelaskan mengapa bukti itu mendukung klaim, memakai konsep yang tepat.' }
        ],
        plus: ['Klaimnya jelas dan langsung menjawab pertanyaan.', 'Buktinya memakai angka atau data dari pos.', 'Penalarannya menghubungkan bukti dengan konsep.', 'Jujur menyebut batas buktinya.'],
        tips: ['Tambahkan angka atau data dari pos sebagai bukti.', 'Jelaskan mengapa bukti itu mendukung klaimmu.', 'Tulis klaimmu dalam satu kalimat yang tegas.', 'Sebutkan batas bukti atau data yang masih kurang.']
      },
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
      name: `${a} vs ${b}`,
      activity: { distractor: { ...m1.activity.distractor, values: [[rupiah(priceA), packA], [rupiah(priceB), packB]] } }
    };
  }

  m1.stimulus.ref = 'REF. 01–001';
  const variants = [{
    mission: { description: m1.description, nara: m1.nara, stimulus: m1.stimulus, challenges: m1.challenges, passport: m1.passport },
    name: 'Menu A vs Menu B',
    activity: { distractor: m1.activity.distractor }
  }];
  shuffle(pairs).slice(0, COUNT - 1).forEach((pair, i) => variants.push(build(i + 1, pair)));
  m1.variants = variants;
})();

/*
 * Pos 2 "Laboratorium Pencernaan": 4 kasus gangguan jalur (varian 0 = kasus asli protease).
 * Kasus yang sama dipakai Meja Uji Reagen (activity.caseId) dan Papan Laporan, sehingga bukti
 * praktikum, data terminal, dan tantangan yang dinilai selalu cocok. Struktur tetap: 4 baris arsip, 2 tantangan.
 */
(function () {
  const m2 = window.NUTRANTARA_MISSIONS.find((m) => m.id === 2);
  if (!m2) return;
  const cols = ['INDIKATOR', 'RUANG X', 'RUANG Y'];
  const afterOne = 'Jalur normal sudah terakit. Sekarang bandingkan Ruang X dan Ruang Y untuk menemukan bagian jalur yang terganggu.';
  const afterTwo = m2.nara.afterTwo;
  const insight = 'Pati, protein, dan lemak dirombak melalui jalur dan zat yang berbeda.';
  const row = (label, x, y, differs = true) => ({ label, values: [[x], [y]], ...(differs ? { highlight: [1] } : {}) });

  const variants = [
    { name: 'Gangguan protease', activity: { caseId: 'protease' },
      mission: { description: m2.description, nara: m2.nara, stimulus: m2.stimulus, challenges: m2.challenges, passport: m2.passport } },
    { name: 'Gangguan amilase', activity: { caseId: 'amilase' },
      mission: {
        description: 'Dua ruang uji, satu jalur yang macet. Protein terurai di kedua ruang, tetapi ada yang janggal di Ruang Y.',
        nara: { intro: 'Protein berkurang di kedua ruang. Jalur mana yang tetap bermasalah di Ruang Y? Rakit dulu jalur yang normal, lalu uji sampelnya.', afterOne, afterTwo },
        stimulus: { title: 'HASIL UJI RUANG', ref: 'REF. 02–B', columns: cols, insight,
          rows: [row('Protein', 'Berkurang', 'Berkurang', false), row('Pati', 'Berkurang', 'Hampir tidak berubah'), row('Maltosa & glukosa', 'Banyak', 'Sedikit'), row('Amilase', 'Terdeteksi', 'Tidak terdeteksi')] },
        challenges: [
          { type: 'order', label: 'RAKIT JALUR', question: 'Susun jalur perombakan pati (amilum) di Ruang X dari awal sampai akhir.',
            items: [
              { value: 'maltose', text: 'Maltosa (disakarida)' },
              { value: 'glucose', text: 'Glukosa siap diserap' },
              { value: 'starch', text: 'Amilum (pati) dari makanan' },
              { value: 'maltase', text: 'Maltase memecah maltosa' },
              { value: 'amylase', text: 'Amilase memecah amilum' }
            ],
            correct: ['starch', 'amylase', 'maltose', 'maltase', 'glucose'],
            hints: ['Belum tepat. Mulailah dari molekul terbesar. Setiap enzim berada di antara molekul yang dipecahnya dan hasil pemecahannya.', 'Periksa lagi: amilase bekerja pada amilum dan menghasilkan maltosa. Maltosa masih dipecah lagi sebelum diserap.'],
            success: 'Tepat. Amilase (dari ludah dan pankreas) memecah amilum menjadi maltosa, lalu maltase di usus halus memecah maltosa menjadi glukosa.' },
          { type: 'multi', label: 'TEMUKAN GANGGUAN', question: 'Ruang Y bermasalah. Data mana yang menunjukkan bahwa jalur pati, bukan jalur protein, yang terganggu? Pilih semua yang mendukung.',
            options: [
              { value: 'starch', text: 'Pati di Ruang Y hampir tidak berubah.' },
              { value: 'protein', text: 'Protein di Ruang Y berkurang.' },
              { value: 'sugar', text: 'Maltosa dan glukosa di Ruang Y sedikit.' },
              { value: 'amylase', text: 'Amilase di Ruang Y tidak terdeteksi.' }
            ],
            correct: ['starch', 'sugar', 'amylase'],
            hints: ['Belum tepat. Protein berkurang di kedua ruang, jadi data protein tidak menunjukkan gangguan. Fokus pada data jalur pati.', 'Ada tiga baris jalur pati yang berbeda antara Ruang X dan Ruang Y. Data protein bukan salah satunya.'],
            success: 'Tepat. Tanpa amilase, amilum tidak dipecah menjadi maltosa. Karena itu pati hampir tidak berubah dan gula hasil pencernaan sedikit, sementara protein tetap berkurang.' }
        ],
        passport: { prompt: 'Jelaskan gangguan di Ruang Y menggunakan data pati, gula, dan amilase.', placeholder: 'Contoh: Di Ruang Y amilase tidak terdeteksi, sehingga…' }
      } },
    { name: 'Gangguan lipase', activity: { caseId: 'lipase' },
      mission: {
        description: 'Dua ruang uji, satu jalur yang macet. Protein terurai di kedua ruang, tetapi sesuatu tertinggal di Ruang Y.',
        nara: { intro: 'Protein berkurang di kedua ruang. Apa yang tertinggal di Ruang Y? Rakit dulu jalur yang normal, lalu uji sampelnya.', afterOne, afterTwo },
        stimulus: { title: 'HASIL UJI RUANG', ref: 'REF. 02–C', columns: cols, insight,
          rows: [row('Protein', 'Berkurang', 'Berkurang', false), row('Lemak', 'Berkurang', 'Hampir tidak berubah'), row('Asam lemak & gliserol', 'Banyak', 'Sedikit'), row('Lipase', 'Terdeteksi', 'Tidak terdeteksi')] },
        challenges: [
          { type: 'order', label: 'RAKIT JALUR', question: 'Susun jalur perombakan lemak di Ruang X dari awal sampai akhir.',
            items: [
              { value: 'droplet', text: 'Butiran lemak kecil (teremulsi)' },
              { value: 'fatty', text: 'Asam lemak dan gliserol siap diserap' },
              { value: 'fat', text: 'Lemak dari makanan' },
              { value: 'lipase', text: 'Lipase memecah butiran lemak' },
              { value: 'bile', text: 'Empedu mengemulsikan lemak' }
            ],
            correct: ['fat', 'bile', 'droplet', 'lipase', 'fatty'],
            hints: ['Belum tepat. Mulailah dari lemak utuh. Ingat: empedu bukan enzim; ia memperkecil butiran lemak sebelum enzim bekerja.', 'Periksa lagi: empedu menghasilkan butiran lemak kecil, lalu lipase memecah butiran itu menjadi molekul siap serap.'],
            success: 'Tepat. Empedu mengemulsikan lemak menjadi butiran kecil, lalu lipase pankreas memecahnya menjadi asam lemak dan gliserol.' },
          { type: 'multi', label: 'TEMUKAN GANGGUAN', question: 'Ruang Y bermasalah. Data mana yang menunjukkan bahwa jalur lemak, bukan jalur protein, yang terganggu? Pilih semua yang mendukung.',
            options: [
              { value: 'protein', text: 'Protein di Ruang Y berkurang.' },
              { value: 'fat', text: 'Lemak di Ruang Y hampir tidak berubah.' },
              { value: 'fatty', text: 'Asam lemak dan gliserol di Ruang Y sedikit.' },
              { value: 'lipase', text: 'Lipase di Ruang Y tidak terdeteksi.' }
            ],
            correct: ['fat', 'fatty', 'lipase'],
            hints: ['Belum tepat. Protein berkurang di kedua ruang, jadi data protein tidak menunjukkan gangguan. Fokus pada data jalur lemak.', 'Ada tiga baris jalur lemak yang berbeda antara Ruang X dan Ruang Y. Data protein bukan salah satunya.'],
            success: 'Tepat. Tanpa lipase, lemak tidak dipecah menjadi asam lemak dan gliserol. Karena itu lemak hampir tidak berubah dan hasil pemecahannya sedikit, sementara protein tetap berkurang.' }
        ],
        passport: { prompt: 'Jelaskan gangguan di Ruang Y menggunakan data lemak, asam lemak, dan lipase.', placeholder: 'Contoh: Di Ruang Y lipase tidak terdeteksi, sehingga…' }
      } },
    { name: 'Gangguan empedu', activity: { caseId: 'empedu' },
      mission: {
        description: 'Dua ruang uji, satu jalur yang macet. Enzimnya lengkap, tetapi lemak di Ruang Y tetap menggumpal.',
        nara: { intro: 'Enzim terdeteksi di kedua ruang, tetapi lemak di Ruang Y menggumpal. Apa yang hilang? Rakit dulu jalur yang normal, lalu uji sampelnya.', afterOne: 'Rute empedu sudah tersusun. Sekarang bandingkan Ruang X dan Ruang Y untuk menemukan bagian jalur yang terganggu.', afterTwo },
        stimulus: { title: 'HASIL UJI RUANG', ref: 'REF. 02–D', columns: cols, insight: 'Empedu bukan enzim, tetapi tanpa empedu lipase sulit memecah lemak.',
          rows: [row('Lemak', 'Berkurang', 'Hampir tidak berubah'), row('Ukuran butiran lemak', 'Kecil (teremulsi)', 'Besar (menggumpal)'), row('Empedu', 'Terdeteksi', 'Tidak terdeteksi'), row('Lipase', 'Terdeteksi', 'Terdeteksi', false)] },
        challenges: [
          { type: 'order', label: 'RUTE EMPEDU', question: 'Susun perjalanan empedu di Ruang X sampai lemak siap dipecah lipase.',
            items: [
              { value: 'store', text: 'Empedu disimpan di kantong empedu' },
              { value: 'emulsify', text: 'Empedu mengemulsikan lemak menjadi butiran kecil' },
              { value: 'liver', text: 'Hati membentuk empedu' },
              { value: 'lipase', text: 'Lipase memecah butiran lemak lebih cepat' },
              { value: 'duodenum', text: 'Empedu dialirkan ke usus dua belas jari (duodenum)' }
            ],
            correct: ['liver', 'store', 'duodenum', 'emulsify', 'lipase'],
            hints: ['Belum tepat. Mulailah dari organ yang membentuk empedu, lalu ikuti ke mana empedu disimpan dan dialirkan.', 'Periksa lagi: empedu dibentuk hati, disimpan, lalu dialirkan ke duodenum. Baru di sana empedu bertemu lemak.'],
            success: 'Tepat. Empedu dibentuk hati, disimpan di kantong empedu, dialirkan ke duodenum, lalu mengemulsikan lemak sehingga permukaan kerja lipase lebih luas.' },
          { type: 'multi', label: 'TEMUKAN GANGGUAN', question: 'Data mana yang berbeda antara Ruang X dan Ruang Y dan menunjukkan gangguan pada jalur lemak? Pilih semua yang mendukung.',
            options: [
              { value: 'fat', text: 'Lemak di Ruang Y hampir tidak berubah.' },
              { value: 'lipase', text: 'Lipase terdeteksi di Ruang X dan Ruang Y.' },
              { value: 'droplet', text: 'Butiran lemak di Ruang Y besar dan menggumpal.' },
              { value: 'bile', text: 'Empedu di Ruang Y tidak terdeteksi.' }
            ],
            correct: ['fat', 'droplet', 'bile'],
            hints: ['Belum tepat. Baris yang nilainya sama di kedua ruang bukan tanda gangguan.', 'Ada tiga baris yang berbeda antara Ruang X dan Ruang Y. Lipase terdeteksi di kedua ruang.'],
            success: 'Tepat. Tanpa empedu, lemak tidak teremulsi sehingga butirannya besar dan lipase sulit bekerja. Lipase sama-sama terdeteksi, jadi baris itu bukan tanda gangguan.' }
        ],
        passport: { prompt: 'Jelaskan gangguan di Ruang Y menggunakan data lemak, ukuran butiran, dan empedu.', placeholder: 'Contoh: Di Ruang Y empedu tidak terdeteksi, sehingga…' }
      } }
  ];
  m2.stimulus.ref = 'REF. 02–A';
  m2.variants = variants;
})();

/*
 * PERAN REGU (Project Based Learning). Setiap pos punya 4 peran; tugas di dunia dibagi ke peran itu.
 * Pembagian menurut jumlah anggota (maks. 4): 1 orang memegang semua peran, 2 orang masing-masing 2,
 * 3 orang (satu orang memegang 2), 4 orang satu peran per orang. Peran berputar setiap pos agar
 * tiap siswa mencoba tugas yang berbeda. Bila pemegang peran sedang luring, anggota lain boleh
 * mengambil alih (tercatat di log kontribusi), sehingga regu yang bermain bergantian tidak macet.
 * tasks: peta tugas → indeks peran. terminal: angka (semua baris) atau larik per baris.
 * threads (Pos 4) dikunci menurut kartu asal benang; sorterCard: kartu ke-k (Gerbang Pilah / Menara Siaran) milik peran k mod 4.
 */
window.NUTRANTARA_TEAM = {
  max: 4,
  scenarios: {
    1: { name: 'Mode Solo', text: 'Kamu memegang keempat peran. Kerjakan semua tugas sendiri — tetap seru, tetap tuntas.' },
    2: { name: 'Mode Duo', text: 'Masing-masing memegang 2 peran. Bagi tugas, lalu cocokkan temuan sebelum mengunci jawaban.' },
    3: { name: 'Mode Trio', text: 'Satu anggota memegang 2 peran (bergiliran tiap pos). Jawaban regu butuh 2 suara yang sama.' },
    4: { name: 'Mode Regu Penuh', text: 'Satu peran per orang. Setiap anggota memegang potongan bukti yang tidak dimiliki yang lain.' }
  },
  roles: {
    1: [
      { icon: '🔎', name: 'Penyidik Arsip 1', task: 'Pindai Terminal Arsip 1 dan laporkan angkanya ke regu.' },
      { icon: '🔍', name: 'Penyidik Arsip 2', task: 'Pindai Terminal Arsip 2 dan laporkan angkanya ke regu.' },
      { icon: '🧾', name: 'Penyidik Arsip 3', task: 'Pindai Terminal Arsip 3 dan laporkan angkanya ke regu.' },
      { icon: '🕵', name: 'Pemburu Pengalih', task: 'Periksa terminal Harga & Kemasan: bukti relevan atau pengalih?' }
    ],
    2: [
      { icon: '🍚', name: 'Ahli Karbohidrat', task: 'Rakit Meja Karbohidrat; di Meja Uji Reagen pegang Lugol dan Benedict.' },
      { icon: '🥚', name: 'Ahli Protein', task: 'Rakit Meja Protein; di Meja Uji Reagen pegang Biuret.' },
      { icon: '🧈', name: 'Ahli Lemak', task: 'Rakit Meja Lemak; di Meja Uji Reagen pegang Sudan III dan mikroskop.' },
      { icon: '⚖', name: 'Kepala Lab', task: 'Pindai Terminal Arsip dan ajukan tuduhan jalur yang macet setelah bukti regu lengkap.' }
    ],
    3: [
      { icon: '✂', name: 'Pemecah Molekul', task: 'Pilah kartu Gerbang Pilah milikmu; cerna molekul besar di Simulator Vili.' },
      { icon: '🚚', name: 'Pengantar Molekul', task: 'Pilah kartu Gerbang Pilah milikmu; antar hasil cerna ke kapiler darah atau pembuluh kil.' },
      { icon: '🔬', name: 'Peneliti Model P', task: 'Pilah kartumu; jalankan eksperimen Model P; pulihkan Komponen Gerbang.' },
      { icon: '📊', name: 'Peneliti Model Q', task: 'Pilah kartumu; jalankan eksperimen Model Q; pindai Terminal Arsip.' }
    ],
    4: [
      { icon: '🥬', name: 'Penjaga Jalur Serat', task: 'Rentangkan benang jalur serat, uji serat secara adil di Simulator Usus Besar, dan periksa berita bagianmu di Menara Siaran.' },
      { icon: '💧', name: 'Penjaga Jalur Air', task: 'Rentangkan benang jalur air, uji air minum secara adil di Simulator Usus Besar, dan periksa berita bagianmu di Menara Siaran.' },
      { icon: '🏃', name: 'Penjaga Jalur Aktivitas', task: 'Rentangkan benang jalur aktivitas, uji aktivitas secara adil di Simulator Usus Besar, dan periksa berita bagianmu di Menara Siaran.' },
      { icon: '📈', name: 'Analis Data', task: 'Pindai Terminal Arsip, ikat simpul akibat di Papan Benang Merah, ulangi catatan harian di simulator, lalu tarik kesimpulan regu.' }
    ],
    5: [
      { icon: '🔍', name: 'Pemeriksa Data', task: 'Pindai Terminal Arsip dan bongkar klaim bagianmu di Mesin Pemecah Klaim.' },
      { icon: '🔦', name: 'Penyorot Label', task: 'Putar kemasan di Kemasan Berputar, sorot informasi yang diabaikan iklan, dan bongkar klaim bagianmu.' },
      { icon: '🎯', name: 'Peneliti Sasaran', task: 'Pasangkan sasaran dengan data kebutuhannya di Studio Naskah Jujur, dan bongkar klaim bagianmu.' },
      { icon: '✍', name: 'Penulis Naskah', task: 'Susun dan rekam naskah iklan yang jujur di Studio Naskah Jujur, dan bongkar klaim bagianmu.' }
    ],
    6: [
      { icon: '🧑‍🍳', name: 'Perancang Menu', task: 'Telaah penjelasan teman di Ruang Arsip, kumpulkan bahan bagianmu, dan susun rancangan awal menu regu.' },
      { icon: '🧐', name: 'Penelaah', task: 'Telaah penjelasan teman di Ruang Arsip, kumpulkan bahan bagianmu, dan telaah rancangan awal dengan daftar periksa.' },
      { icon: '✏', name: 'Perevisi', task: 'Telaah penjelasan teman di Ruang Arsip, kumpulkan bahan bagianmu, dan revisi rancangan berdasarkan telaah.' },
      { icon: '📣', name: 'Juru Bicara', task: 'Telaah penjelasan teman di Ruang Arsip, kumpulkan bahan bagianmu, dan presentasikan kartu menu regu di Panggung.' }
    ]
  },
  tasks: {
    1: { terminal: [0, 1, 2], distractor: 3 },
    2: { station: { karbo: 0, protein: 1, lemak: 2 }, terminal: 3, lab: { lugol: 0, benedict: 0, biuret: 1, sudan: 2, micro: 2, accuse: 3 } },
    3: { station: { gerbang: 2 }, terminal: 3, sorterCard: true, villi: { digest: 0, route: 1, P: 2, Q: 3 } },
    4: { terminal: 3, threads: { serat: 0, massa: 0, air: 1, cairan: 1, aktivitas: 2, peristaltik: 2, transit: 2, lunak: 3 }, colon: { serat: 0, air: 1, aktivitas: 2, ulang: 3, simpul: 3 }, sorterCard: true },
    5: { terminal: 0, sorterCard: true, pack: { sorot: 1 }, studio: { sasaran: 2, naskah: 3 } },
    6: { ingredient: true, kitchen: { initial: 0, review: 1, revision: 2 }, stage: 3 }
  }
};
