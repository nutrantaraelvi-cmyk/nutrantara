/*
 * NUTRANTARA — Event kelas "Bos Mitos Gizi" (sejak 1.5).
 * HANYA dimuat server (lewat vm) dan uji asap: berkas ini sengaja TIDAK ada di daftar STATIC server.js,
 * sehingga kunci jawaban tidak terkirim ke peramban. Server mengirim teks soal, menilai jawaban, lalu
 * mengirim kunci beserta penjelasannya setelah siswa menjawab.
 * Materi: sistem pencernaan & literasi klaim pangan (Biologi SMA kelas XI). Perlu ditinjau validator materi.
 */
window.NUTRANTARA_BOSS = {
  boss: {
    id: 'hoaks',
    name: 'Raksasa Hoaks Gizi',
    intro: 'Raksasa Hoaks Gizi menyerbu Alun-alun dengan papan klaim palsu! Jawab “Mitos atau Fakta?” bersama seluruh kelas untuk mengalahkannya.',
    taunts: ['Energi paling tinggi pasti paling sehat!', 'Empedu itu enzim, kan?', 'Label “alami” pasti sehat!', 'Protein langsung diserap utuh!']
  },
  questions: [
    { id: 'm01', text: 'Pencernaan makanan baru dimulai di lambung.', answer: 'mitos', explain: 'Pencernaan sudah dimulai di mulut: gigi memecah makanan secara mekanik dan amilase ludah mulai memecah amilum.' },
    { id: 'm02', text: 'Empedu adalah enzim yang memecah lemak.', answer: 'mitos', explain: 'Empedu bukan enzim. Empedu mengemulsikan lemak menjadi butiran kecil; yang memecah lemak adalah lipase.' },
    { id: 'm03', text: 'Sebagian besar penyerapan zat gizi terjadi di usus halus.', answer: 'fakta', explain: 'Usus halus, dengan vili dan mikrovilinya, adalah tempat utama penyerapan hasil pencernaan.' },
    { id: 'm04', text: 'Vili dan mikrovili memperluas permukaan penyerapan usus halus.', answer: 'fakta', explain: 'Lipatan, vili, dan mikrovili membuat permukaan usus halus sangat luas sehingga penyerapan lebih banyak.' },
    { id: 'm05', text: 'Pepsin bekerja baik di lingkungan lambung yang asam.', answer: 'fakta', explain: 'Pepsin aktif pada suasana asam yang dibentuk HCl di lambung dan memecah protein menjadi pepton.' },
    { id: 'm06', text: 'Serat tidak dicerna enzim manusia, jadi tidak ada gunanya bagi tubuh.', answer: 'mitos', explain: 'Serat memang tidak dicerna enzim manusia, tetapi membantu kerja usus besar dan membuat feses lebih lunak.' },
    { id: 'm07', text: 'Makanan dengan energi (kkal) paling tinggi pasti paling sehat.', answer: 'mitos', explain: 'Energi hanya satu angka. Sehat atau tidaknya menu bergantung pada komposisi zat gizi dan kebutuhan orang yang memakannya.' },
    { id: 'm08', text: 'Usus besar menyerap kembali sebagian air dari sisa makanan.', answer: 'fakta', explain: 'Usus besar menyerap kembali air dan sebagian mineral sebelum sisa makanan dikeluarkan sebagai feses.' },
    { id: 'm09', text: 'Amilase ludah memecah amilum menjadi maltosa.', answer: 'fakta', explain: 'Amilase (ptialin) di ludah mulai memecah amilum menjadi maltosa sejak makanan dikunyah.' },
    { id: 'm10', text: 'Protein diserap tubuh dalam bentuk utuh tanpa dipecah.', answer: 'mitos', explain: 'Protein dipecah oleh pepsin, tripsin, dan peptidase menjadi asam amino sebelum diserap.' },
    { id: 'm11', text: 'Lipase pankreas memecah lemak menjadi asam lemak dan gliserol.', answer: 'fakta', explain: 'Setelah diemulsikan empedu, lemak dipecah lipase pankreas menjadi asam lemak dan gliserol.' },
    { id: 'm12', text: 'Hasil pencernaan lemak sebagian besar diangkut lewat pembuluh kil (limfa).', answer: 'fakta', explain: 'Asam lemak dan gliserol diserap sel vili lalu sebagian besar masuk ke pembuluh kil (lakteal).' },
    { id: 'm13', text: 'Glukosa dan asam amino diserap ke kapiler darah di vili.', answer: 'fakta', explain: 'Monosakarida seperti glukosa dan asam amino masuk ke kapiler darah di dalam vili.' },
    { id: 'm14', text: 'Gerak peristaltik hanya terjadi di lambung.', answer: 'mitos', explain: 'Gerak peristaltik terjadi di sepanjang saluran pencernaan: kerongkongan, lambung, usus halus, dan usus besar.' },
    { id: 'm15', text: 'Label “bebas lemak” berarti produk itu pasti rendah gula dan rendah energi.', answer: 'mitos', explain: 'Bebas lemak hanya menyebut satu zat gizi. Gula dan energinya tetap harus dibaca di label belakang.' },
    { id: 'm16', text: 'Klaim “vitamin C 200%” membuktikan minuman itu sehat secara keseluruhan.', answer: 'mitos', explain: 'Klaim satu zat gizi tidak menunjukkan kandungan gula, garam, atau zat gizi lain dalam minuman itu.' },
    { id: 'm17', text: 'Tempe adalah salah satu sumber protein nabati.', answer: 'fakta', explain: 'Tempe dari kedelai adalah sumber protein nabati yang mudah ditemukan di Indonesia.' },
    { id: 'm18', text: 'Jika dua menu energinya sama, komposisi zat gizinya pasti sama.', answer: 'mitos', explain: 'Energi yang sama bisa berasal dari komposisi protein, lemak, karbohidrat, dan serat yang berbeda.' },
    { id: 'm19', text: 'Empedu dibuat di hati dan disimpan di kantong empedu.', answer: 'fakta', explain: 'Hati menghasilkan empedu; kantong empedu menyimpan dan mengalirkannya ke usus dua belas jari.' },
    { id: 'm20', text: 'Pankreas mengalirkan enzim pencernaan ke usus dua belas jari.', answer: 'fakta', explain: 'Getah pankreas berisi amilase, tripsin, dan lipase yang bekerja di usus dua belas jari.' },
    { id: 'm21', text: 'Asam klorida (HCl) di lambung membantu membunuh kuman dan mengaktifkan pepsinogen.', answer: 'fakta', explain: 'HCl membuat suasana asam, membunuh banyak kuman, dan mengubah pepsinogen menjadi pepsin yang aktif.' },
    { id: 'm22', text: 'Mengunyah makanan termasuk pencernaan mekanik.', answer: 'fakta', explain: 'Mengunyah memperkecil ukuran makanan tanpa mengubah zatnya, jadi termasuk pencernaan mekanik.' },
    { id: 'm23', text: 'Penyerapan berarti memecah molekul besar menjadi molekul kecil.', answer: 'mitos', explain: 'Memecah adalah pencernaan. Penyerapan adalah memindahkan molekul kecil hasil pencernaan ke darah atau limfa.' },
    { id: 'm24', text: 'Jika serat, air minum, dan aktivitas berubah bersamaan, kita langsung tahu faktor mana penyebabnya.', answer: 'mitos', explain: 'Faktor yang berubah bersamaan saling terpaut. Perlu uji adil: ubah satu faktor dan setarakan yang lain.' },
    { id: 'm25', text: 'Pereaksi Biuret berubah ungu bila ada protein.', answer: 'fakta', explain: 'Biuret bereaksi dengan ikatan peptida pada protein sehingga larutan berwarna ungu.' },
    { id: 'm26', text: 'Larutan Lugol berubah biru kehitaman bila ada amilum.', answer: 'fakta', explain: 'Lugol (iodin) bereaksi dengan amilum menghasilkan warna biru kehitaman.' },
    { id: 'm27', text: 'Uji Benedict untuk gula pereduksi tidak perlu dipanaskan.', answer: 'mitos', explain: 'Benedict harus dipanaskan; bila ada gula pereduksi, warnanya berubah menjadi hijau, kuning, hingga merah bata.' },
    { id: 'm28', text: 'Minuman manis aman diminum sebanyak-banyaknya karena berupa cairan.', answer: 'mitos', explain: 'Gula dalam minuman tetap menambah asupan gula dan energi. Bentuk cair tidak membuatnya lebih aman.' },
    { id: 'm29', text: 'Kurang serat dan kurang minum dapat membuat feses keras dan sulit dikeluarkan.', answer: 'fakta', explain: 'Serat dan cukup air membantu feses tetap lunak sehingga mudah didorong gerak peristaltik.' },
    { id: 'm30', text: 'Usus halus tidak punya enzim sendiri; semua enzim berasal dari lambung.', answer: 'mitos', explain: 'Mikrovili usus halus punya enzim seperti maltase, sukrase, laktase, dan peptidase; pankreas juga mengirim enzim.' },
    { id: 'm31', text: 'Label “alami” atau “asli” pada kemasan otomatis berarti produk itu sehat.', answer: 'mitos', explain: 'Kata “alami” tidak menunjukkan kandungan gula, garam, lemak, atau takaran saji. Tetap periksa label gizinya.' },
    { id: 'm32', text: 'Maltase memecah maltosa menjadi glukosa.', answer: 'fakta', explain: 'Maltase di mikrovili usus halus memecah maltosa menjadi glukosa yang siap diserap.' }
  ]
};
