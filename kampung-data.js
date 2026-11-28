/*
 * NUTRANTARA — Kampung (sejak 1.6): bahan pangan lokal, resep Dapur Lapangan, warga NPC, dan quest sampingan.
 * Skrip biasa tanpa DOM: dimuat peramban (window.NUTRANTARA_KAMPUNG), server, dan uji (lewat vm).
 * Jangan mengganti id bahan, resep, warga, atau quest: id tersimpan di tas siswa (player.kampung / localStorage).
 * Catatan gizi bersifat umum dan dikaitkan ke materi Pos 1–5; tidak berisi angka gizi.
 */
window.NUTRANTARA_KAMPUNG = (() => {
  const ITEMS = {
    beras: { name: 'Beras', icon: '🍚', group: 'Makanan pokok', color: '#f3ead8', model: 'sack' },
    jagung: { name: 'Jagung', icon: '🌽', group: 'Makanan pokok', color: '#f2c94c', model: 'corn' },
    ubi: { name: 'Ubi jalar', icon: '🍠', group: 'Makanan pokok', color: '#b5486b', model: 'tuber' },
    sagu: { name: 'Tepung sagu', icon: '🥣', group: 'Makanan pokok', color: '#efe6d2', model: 'sack' },
    tempe: { name: 'Tempe', icon: '🟫', group: 'Lauk nabati', color: '#e8d6a8', model: 'tempe' },
    kacang: { name: 'Kacang tanah', icon: '🥜', group: 'Lauk nabati', color: '#c99a5b', model: 'sack' },
    telur: { name: 'Telur ayam', icon: '🥚', group: 'Lauk hewani', color: '#f7ead4', model: 'egg' },
    ikan: { name: 'Ikan kembung', icon: '🐟', group: 'Lauk hewani', color: '#7fa8c9', model: 'fish' },
    kelor: { name: 'Daun kelor', icon: '🌿', group: 'Sayur', color: '#3fa95c', model: 'leaf' },
    bayam: { name: 'Bayam', icon: '🥬', group: 'Sayur', color: '#2f8a4c', model: 'leaf' },
    labu: { name: 'Labu kuning', icon: '🎃', group: 'Sayur', color: '#f08a3c', model: 'ball' },
    pisang: { name: 'Pisang', icon: '🍌', group: 'Buah', color: '#f5d33b', model: 'banana' },
    pepaya: { name: 'Pepaya', icon: '🍈', group: 'Buah', color: '#f59e5b', model: 'ball' },
    kelapa: { name: 'Kelapa', icon: '🥥', group: 'Bumbu & santan', color: '#8a5a35', model: 'ball' },
    kunyit: { name: 'Kunyit', icon: '🧂', group: 'Bumbu & santan', color: '#e8a317', model: 'tuber' }
  };

  const RECIPES = {
    'sayur-bening': { name: 'Sayur Bening Kelor', region: 'Jawa', icon: '🥣', needs: { kelor: 2, jagung: 1 },
      info: 'Daun kelor dan jagung menyumbang serat. Serat tidak dicerna enzim manusia, tetapi membantu kerja usus besar (Pos 4).' },
    'nasi-jagung': { name: 'Nasi Jagung', region: 'Jawa Timur', icon: '🍚', needs: { jagung: 2, beras: 1 },
      info: 'Jagung dan beras kaya pati. Amilase di mulut dan pankreas memecah pati menjadi maltosa, lalu maltase memecahnya menjadi glukosa (Pos 2).' },
    kolak: { name: 'Kolak Pisang Ubi', region: 'Jawa', icon: '🍲', needs: { pisang: 1, ubi: 1, kelapa: 1 },
      info: 'Pisang dan ubi memberi karbohidrat, santan kelapa memberi lemak. Kolak biasanya bergula, jadi nikmati secukupnya dan tetap cek gulanya (Pos 5).' },
    pepes: { name: 'Pepes Ikan', region: 'Jawa Barat (Sunda)', icon: '🐟', needs: { ikan: 1, kunyit: 1 },
      info: 'Ikan adalah sumber protein yang dipecah protease menjadi asam amino (Pos 2). Pepes dikukus dalam daun pisang, tidak digoreng.' },
    gado: { name: 'Gado-gado', region: 'Jakarta (Betawi)', icon: '🥗', needs: { bayam: 1, tempe: 1, telur: 1, kacang: 1 },
      info: 'Tempe dan telur memberi protein, sayur memberi serat, dan saus kacang memberi lemak serta protein nabati. Satu piring, banyak zat gizi.' },
    tinutuan: { name: 'Tinutuan (Bubur Manado)', region: 'Sulawesi Utara', icon: '🍵', needs: { beras: 1, labu: 1, bayam: 1, jagung: 1 },
      info: 'Bubur sayur dari Manado: beras dan jagung memberi karbohidrat, labu dan bayam memberi serat dan vitamin.' },
    urap: { name: 'Urap Sayur', region: 'Jawa', icon: '🥬', needs: { bayam: 1, kelor: 1, kelapa: 1 },
      info: 'Sayur dengan kelapa parut berbumbu. Lemak dari kelapa diemulsikan empedu lalu dipecah lipase (Pos 2); sayurnya menyumbang serat.' },
    papeda: { name: 'Papeda Kuah Kuning', region: 'Maluku & Papua', icon: '🍜', needs: { sagu: 2, ikan: 1, kunyit: 1 },
      info: 'Sagu adalah makanan pokok di Maluku dan Papua, sumber karbohidrat. Kuah ikan berkunyit memberi protein.' },
    rujak: { name: 'Rujak Buah', region: 'Jawa', icon: '🍧', needs: { pepaya: 1, pisang: 1, kacang: 1 },
      info: 'Buah segar memberi serat dan vitamin C. Sambal rujak memakai gula merah, jadi cukup sebagai camilan, bukan pengganti makan.' }
  };
  const START_RECIPES = ['sayur-bening', 'nasi-jagung'];

  // Warga: island = id pulau; post = desa pusat wilayah pos; at = [x, z] meter dari pusat pulau (pulau kecil).
  const NPCS = {
    sari: { name: 'Mbok Sari', role: 'Pedagang pasar', island: 0, at: [-11, 7], color: '#f59e5b', wear: { kepala: 'caping', baju: 'kawung', leher: 'selendang', punggung: 'bakul' },
      hello: 'Monggo, Nak! Pasar Awan menjual bahan dari seluruh Nusantara. Bantu Mbok, nanti Mbok ajari resep.', bye: 'Matur nuwun! Semua bahan sudah lengkap. Masak yang enak di Dapur Lapangan, ya.' },
    darto: { name: 'Pak Darto', role: 'Pengelola kantin', island: 1, post: true, color: '#7fa8ff', wear: { kepala: 'peci', baju: 'lurik' },
      hello: 'Kantin sekolah ingin menu yang seimbang, bukan sekadar mengenyangkan. Bisa bantu?', bye: 'Menu kantin jadi lebih seimbang berkat kamu!' },
    laras: { name: 'Bu Laras', role: 'Laboran', island: 2, post: true, color: '#c58cf0', wear: { baju: 'parang' },
      hello: 'Selamat datang di laboratorium! Pereaksi siap, tetapi bahan ujinya belum ada.', bye: 'Uji makanan berjalan lancar. Terima kasih, asisten lab!' },
    bima: { name: 'Mas Bima', role: 'Pemandu gerbang usus', island: 3, post: true, color: '#ff9f91', wear: { kepala: 'udeng', baju: 'tenun-ikat' },
      hello: 'Gerbang usus halus ramai hari ini. Pencernaan memecah, penyerapan memindahkan, ingat itu!', bye: 'Gerbang lancar, energi penjaga pulih. Mantap!' },
    dewi: { name: 'Kak Dewi', role: 'Penyiar radio', island: 4, post: true, color: '#1fc3d3', wear: { baju: 'megamendung', leher: 'manik' },
      hello: 'Halo, pendengar! Radio Kota Terapung hanya menyiarkan berita yang buktinya kuat.', bye: 'Siaran hari ini jujur dan berbukti. Terima kasih!' },
    rendra: { name: 'Bang Rendra', role: 'Pembuat iklan', island: 5, post: true, color: '#e2553f', wear: { kepala: 'tanjak', baju: 'songket' },
      hello: 'Dulu iklanku penuh klaim berlebihan. Sekarang aku belajar membuat iklan yang jujur.', bye: 'Iklan jujur ternyata tetap menarik. Terima kasih sudah mengajariku!' },
    rina: { name: 'Uni Rina', role: 'Juru masak', island: 6, post: true, color: '#78f4bd', wear: { kepala: 'kamboja', baju: 'songket', leher: 'ulos' },
      hello: 'Dapur Juara butuh juru masak yang paham bahan lokal. Tunjukkan masakanmu!', bye: 'Masakanmu juara! Kamu sudah jadi koki Nusantara sejati.' },
    wayan: { name: 'Pak Wayan', role: 'Petani sawah', island: 7, at: [3, 5], color: '#2fa36b', wear: { kepala: 'caping', baju: 'lurik' },
      hello: 'Om swastiastu! Panen padi tahun ini melimpah. Mau bantu di sawah?', bye: 'Sawah sudah dipanen. Semoga resepnya bermanfaat!' },
    daeng: { name: 'Daeng Baso', role: 'Nelayan', island: 10, at: [-4, 4], color: '#7fa8c9', wear: { kepala: 'peci', baju: 'tenun-ikat' },
      hello: 'Angin laut bagus hari ini. Nelayan juga butuh kelapa untuk bekal melaut.', bye: 'Perahu siap berlayar. Terima kasih, kawan!' }
  };

  // Quest: kind 'bring' (serahkan bahan/hidangan), 'quiz' (pilih jawaban yang tepat), 'visit' (temukan pulau).
  const QUESTS = [
    { id: 'sari-belanja', npc: 'sari', kind: 'bring', title: 'Belanja di Pasar Awan', text: 'Mbok kehabisan bahan kolak. Bawakan satu kelapa dan satu pisang.', needs: { kelapa: 1, pisang: 1 }, xp: 40, recipes: ['kolak'] },
    { id: 'sari-kunyit', npc: 'sari', after: 'sari-belanja', kind: 'bring', title: 'Bumbu Kuning', text: 'Bumbu pepes butuh kunyit. Bawakan dua kunyit.', needs: { kunyit: 2 }, xp: 40, recipes: ['pepes'] },
    { id: 'sari-danau', npc: 'sari', after: 'sari-kunyit', kind: 'visit', title: 'Ikan dari Danau Kawah', text: 'Pedagang ikan langganan Mbok ada di Danau Kawah. Temukan pulaunya!', island: 9, xp: 50, items: { ikan: 1 } },
    { id: 'darto-kuis', npc: 'darto', kind: 'quiz', title: 'Menu Kantin Seimbang', text: 'Nasi uduk telur dan bubur tinutuan sama-sama 500 kkal. Agar tahu mana yang cocok untuk makan siang, apa yang perlu dibandingkan lagi?',
      options: [{ id: 'a', text: 'Warna dan harga kemasannya' }, { id: 'b', text: 'Kandungan zat gizi lain, misalnya protein dan serat' }, { id: 'c', text: 'Tidak perlu, energinya sudah sama' }], answer: 'b',
      explain: 'Energi yang sama belum tentu berarti komposisi zat gizinya sama. Bandingkan protein, serat, dan zat gizi lain (Pos 1).', xp: 30 },
    { id: 'darto-sayur', npc: 'darto', after: 'darto-kuis', kind: 'bring', title: 'Sayur untuk Kantin', text: 'Kantin butuh menu sayur. Masak Sayur Bening Kelor di Dapur Lapangan, lalu bawa ke sini.', needs: { 'sayur-bening': 1 }, xp: 60, recipes: ['tinutuan'] },
    { id: 'laras-kuis', npc: 'laras', kind: 'quiz', title: 'Enzim Pertama', text: 'Enzim apa yang mulai memecah amilum (pati) di mulut?',
      options: [{ id: 'a', text: 'Pepsin' }, { id: 'b', text: 'Amilase ludah (ptialin)' }, { id: 'c', text: 'Lipase' }], answer: 'b',
      explain: 'Amilase ludah memecah amilum menjadi maltosa sejak makanan dikunyah. Pepsin bekerja di lambung, lipase memecah lemak (Pos 2).', xp: 30 },
    { id: 'laras-biuret', npc: 'laras', after: 'laras-kuis', kind: 'bring', title: 'Bahan Uji Biuret', text: 'Ibu perlu sampel kaya protein untuk uji Biuret. Bawakan satu telur dan satu tempe.', needs: { telur: 1, tempe: 1 }, xp: 50, recipes: ['gado'] },
    { id: 'bima-kuis', npc: 'bima', kind: 'quiz', title: 'Gerbang Penyerapan', text: 'Di bagian mana sebagian besar hasil pencernaan diserap ke darah?',
      options: [{ id: 'a', text: 'Lambung' }, { id: 'b', text: 'Usus halus' }, { id: 'c', text: 'Usus besar' }], answer: 'b',
      explain: 'Usus halus punya vili dan mikrovili yang memperluas permukaan, jadi sebagian besar penyerapan terjadi di sana (Pos 3).', xp: 30 },
    { id: 'bima-nasi', npc: 'bima', after: 'bima-kuis', kind: 'bring', title: 'Bekal Penjaga Gerbang', text: 'Penjaga gerbang lapar. Masak Nasi Jagung untuk bekal mereka.', needs: { 'nasi-jagung': 1 }, xp: 60 },
    { id: 'dewi-kuis', npc: 'dewi', kind: 'quiz', title: 'Siaran Uji Adil', text: 'Pendengar ingin tahu apakah serat mengurangi sulit buang air besar. Uji mana yang adil?',
      options: [{ id: 'a', text: 'Ubah serat saja; air minum dan aktivitas dibuat sama' }, { id: 'b', text: 'Ubah serat, air minum, dan aktivitas sekaligus' }, { id: 'c', text: 'Tanyakan pendapat teman sekelas' }], answer: 'a',
      explain: 'Uji adil mengubah tepat satu faktor dan menyetarakan faktor lain, agar hasilnya bisa dikaitkan dengan faktor itu (Pos 4).', xp: 30 },
    { id: 'dewi-urap', npc: 'dewi', after: 'dewi-kuis', kind: 'bring', title: 'Makan Siang Studio', text: 'Kru radio ingin makan siang berserat. Bawakan Urap Sayur.', needs: { urap: 1 }, xp: 60 },
    { id: 'rendra-kuis', npc: 'rendra', kind: 'quiz', title: 'Iklan yang Jujur', text: 'Sebuah iklan menulis “BEBAS LEMAK!”. Apa arti yang paling tepat?',
      options: [{ id: 'a', text: 'Produk itu pasti rendah gula dan energi' }, { id: 'b', text: 'Belum tentu sehat; tetap cek gula, garam, dan energi di label' }, { id: 'c', text: 'Produk itu cocok untuk semua orang' }], answer: 'b',
      explain: 'Klaim satu zat gizi tidak menjelaskan zat gizi lain. Label belakang dan takaran saji tetap perlu dibaca (Pos 5).', xp: 30 },
    { id: 'rendra-gado', npc: 'rendra', after: 'rendra-kuis', kind: 'bring', title: 'Bintang Iklan Jujur', text: 'Iklan jujurku butuh menu bergizi seimbang sebagai bintangnya. Bawakan Gado-gado.', needs: { gado: 1 }, xp: 60 },
    { id: 'rina-kolak', npc: 'rina', kind: 'bring', title: 'Cicip Kolak', text: 'Uni ingin mencicipi kolak buatanmu. Masak Kolak Pisang Ubi.', needs: { kolak: 1 }, xp: 50, recipes: ['rujak'] },
    { id: 'rina-papeda', npc: 'rina', after: 'rina-kolak', kind: 'bring', title: 'Hidangan dari Timur', text: 'Ujian terakhir: masak Papeda Kuah Kuning dari Maluku dan Papua.', needs: { papeda: 1 }, xp: 80 },
    { id: 'wayan-panen', npc: 'wayan', kind: 'bring', title: 'Panen Raya', text: 'Bantu Bapak membawa hasil panen: dua beras dan satu jagung.', needs: { beras: 2, jagung: 1 }, xp: 40, recipes: ['urap'] },
    { id: 'daeng-kelapa', npc: 'daeng', kind: 'bring', title: 'Bekal Melaut', text: 'Bawakan dua kelapa untuk bekal melaut. Daeng akan berbagi ikan dan resep dari timur.', needs: { kelapa: 2 }, xp: 40, recipes: ['papeda'], items: { ikan: 1 } }
  ];

  // Titik bahan per pulau (urutan = indeks titik; id titik "pulau:indeks"). Pos: 2 di desa pusat + 2 di tiap kampung budaya.
  const NODES = {
    0: ['kelapa', 'pisang', 'kunyit'],
    1: ['jagung', 'kelor', 'telur', 'tempe', 'jagung', 'bayam', 'kelor', 'pepaya'],
    2: ['beras', 'jagung', 'ubi', 'kacang', 'telur', 'tempe', 'bayam', 'labu'],
    3: ['ubi', 'labu', 'jagung', 'kelor', 'kacang', 'telur', 'pisang', 'bayam'],
    4: ['ikan', 'sagu', 'kunyit', 'kelor', 'ikan', 'sagu', 'bayam', 'labu'],
    5: ['kacang', 'ubi', 'jagung', 'telur', 'kacang', 'kelapa', 'pepaya', 'kunyit'],
    6: ['beras', 'tempe', 'telur', 'ikan', 'kelor', 'labu', 'ubi', 'pisang'],
    7: ['beras', 'jagung', 'beras', 'jagung'],
    8: ['kelor', 'bayam', 'ubi', 'kunyit'],
    9: ['ikan', 'labu', 'ikan', 'kelor'],
    10: ['kelapa', 'ikan', 'kelapa', 'sagu'],
    11: ['pisang', 'pepaya', 'jagung', 'kacang'],
    12: ['kunyit', 'pepaya', 'kunyit', 'kelapa']
  };
  // Dapur Lapangan: tungku masak di desa pusat tiap pos dan di Alun-alun.
  const KITCHENS = [{ island: 0, at: [-15, 2] }, ...[1, 2, 3, 4, 5, 6].map((island) => ({ island, post: true }))];

  return {
    ITEMS, RECIPES, START_RECIPES, NPCS, QUESTS, NODES, KITCHENS,
    COOLDOWN_MS: 3 * 60 * 1000, // titik bahan tumbuh lagi setelah 3 menit (per siswa)
    GATHER_GAP_MS: 1500, // jeda minimal antarpetik
    ITEM_MAX: 30, DISH_MAX: 10,
    BUFF_MS: 60 * 1000, BUFF_SPEED: 1.15 // mencicipi hidangan: lari sedikit lebih cepat selama 1 menit
  };
})();
