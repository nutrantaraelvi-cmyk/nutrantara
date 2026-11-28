/*
 * NUTRANTARA — data musik latar (sejak 1.7). Skrip biasa → window.NUTRANTARA_MUSIC. Tanpa DOM, jadi juga dibaca uji asap.
 *
 * Semua lagu adalah komposisi orisinal untuk NUTRANTARA (bukan salinan lagu yang sudah ada). Mesin sintesis music.js
 * memainkannya langsung di peramban, tanpa rekaman, sampel, atau CDN, jadi tidak ada hak cipta pihak lain.
 * Tangga nada dan instrumen terinspirasi tradisi musik Nusantara.
 *
 * Melodi ditulis dalam not angka: satu birama = 8 ketukan seperdelapan, dipisah '|'.
 *   1 2 3 5 6 = nada (tangga nada 5 nada hanya memakai 1 2 3 5 6, seperti not angka gamelan; 7 nada memakai 1–7)
 *   ' = oktaf atas · , = oktaf bawah · - = tahan nada sebelumnya · . = diam
 * Bentuk lagu A A B A (tiap bagian 4 birama), lalu berulang dengan variasi instrumen dan jeda tenang.
 * chords: nada dasar akor tiap birama (akor = nada ke-1, ke-3, ke-5 dalam tangga nada lagu).
 * Jangan mengganti id lagu: id dipakai sebagai nama adegan.
 */
window.NUTRANTARA_MUSIC = (() => {
  // Jarak nada (sen) dari nada dasar. Laras gamelan berbeda di tiap perangkat; slendro di sini memakai jarak tidak rata
  // (±228/258 sen) seperti hasil pengukuran gamelan Jawa, pelog perkiraan umum 7 nada, selisir = 5 nada pelog gaya Bali.
  const SCALES = {
    slendro: { name: 'laras slendro', cents: [0, 228, 486, 714, 942] },
    pelog: { name: 'laras pelog', cents: [0, 120, 270, 540, 670, 785, 950] },
    selisir: { name: 'laras selisir (Bali)', cents: [0, 120, 270, 670, 785] },
    pentatonik: { name: 'pentatonik', cents: [0, 200, 400, 700, 900] },
    mayor: { name: 'diatonik mayor', cents: [0, 200, 400, 500, 700, 900, 1100] }
  };

  const THEMES = {
    menu: { title: 'Gerbang Nusantara', note: 'Gamelan Jawa: saron, bonang, gong, suling', scale: 'slendro', root: 62, bpm: 90,
      lead: 'saron', lead2: 'suling', comp: 'bonang', bass: 'gong', pad: 'drone', gong: true, drum: 'kendangLite',
      A: "3 - 5 - 6 - 1' - | 6 5 3 5 6 - - - | 5 - 3 - 2 3 5 - | 3 2 1 2 3 - - -",
      B: "5 - 6 - 1' - 2' - | 3' 2' 1' 6 5 - - - | 6 5 3 5 2 3 5 6 | 5 3 2 3 1 - - -",
      chords: { A: [1, 6, 5, 1], B: [5, 1, 6, 1] } },
    lobi: { title: 'Riang di Lobi', note: 'Keroncong: ukulele cak-cuk, cello petik, suling', scale: 'mayor', root: 65, bpm: 108,
      lead: 'suling', lead2: 'kolintang', comp: 'ukulele', bass: 'cello', shaker: true,
      A: "5 - 3 4 5 - 1' - | 7 6 5 6 5 - - - | 4 - 6 - 1' - 6 - | 5 4 3 2 1 - - -",
      B: "6 - 5 4 6 - 1' - | 5 - 3 1 5 - 3 - | 4 - 6 4 2 - 4 - | 5 - 7 - 2' - 7 6",
      chords: { A: [1, 5, 4, 1], B: [4, 1, 2, 5] } },
    peta: { title: 'Peta Petualangan', note: 'Kendang, bonang, dan kecapi', scale: 'slendro', root: 64, bpm: 112,
      lead: 'bonang', lead2: 'suling', comp: 'kecapi', bass: 'pluck', gong: true, drum: 'kendang', shaker: true,
      A: "1 . 1 2 3 . 5 . | 6 5 6 1' 6 . 5 . | 3 . 3 5 6 . 5 3 | 2 3 2 1 2 - - .",
      B: "5 . 5 6 1' . 2' . | 3' 2' 1' 6 5 . 6 . | 1' 6 5 3 5 6 5 3 | 2 3 5 3 1 - - .",
      chords: { A: [1, 6, 3, 2], B: [5, 1, 6, 1] } },
    butik: { title: 'Butik Batik', note: 'Kolintang Minahasa, angklung, rebana', scale: 'mayor', root: 67, bpm: 116,
      lead: 'kolintang', lead2: 'angklung', comp: 'stab', bass: 'pluck', drum: 'rebana', shaker: true,
      A: "1 3 5 3 1' - 5 - | 6 - 4 6 1' - 6 - | 7 - 5 7 2' - 7 5 | 1' - 5 - 3 - 1 -",
      B: "6 . 6 1' 3' - 1' . | 4 . 4 6 1' - 6 . | 2 4 6 4 2 4 6 1' | 7 - 6 - 5 - 2 -",
      chords: { A: [1, 4, 5, 1], B: [6, 4, 2, 5] } },
    arsip: { title: 'Catatan Penjelajah', note: 'Sasando NTT dan kecapi, tenang', scale: 'slendro', root: 60, bpm: 84,
      lead: 'sasando', lead2: 'suling', comp: 'kecapi', bass: 'gong', pad: 'string', gong: 'soft',
      A: "5 - - 6 5 - 3 - | 2 - 3 5 3 - - - | 6 - - 1' 6 - 5 - | 3 - 5 3 2 - - -",
      B: "1' - - 2' 1' - 6 - | 5 - 6 1' 6 - - - | 5 - 3 5 6 - 5 3 | 2 - 3 2 1 - - -",
      chords: { A: [1, 5, 6, 2], B: [6, 5, 1, 1] } },
    pjbl: { title: 'Ruang Proyek', note: 'Marimba bambu dan kecapi, untuk fokus', scale: 'pentatonik', root: 57, bpm: 96,
      lead: 'calung', lead2: 'sasando', comp: 'kecapi', bass: 'pluck', pad: 'string',
      A: "1 - 3 - 5 - 3 - | 6 - 5 - 3 - - - | 2 - 3 - 5 - 6 - | 5 - 3 - 2 - - -",
      B: "3 - 5 - 6 - 1' - | 2' - 1' - 6 - - - | 5 - 6 - 5 - 3 - | 2 - 1 - - - - -",
      chords: { A: [1, 6, 2, 5], B: [1, 6, 5, 1] } },
    bos: { title: 'Lawan Raksasa Hoaks', note: 'Pelog, kotekan cepat, tifa & kendang', scale: 'pelog', root: 62, bpm: 132,
      lead: 'bonang', lead2: 'saron', comp: 'kotekan', bass: 'gong', gong: 'busy', drum: 'jaipong', shaker: true,
      A: "1 . 2 3 . 2 1 . | 5 . 6 5 . 3 2 . | 1 . 2 3 5 . 6 5 | 3 2 1 2 1 - - .",
      B: "5 . 5 6 7 . 6 5 | 6 . 5 3 2 . 3 . | 5 6 5 3 2 3 2 1 | 2 . 3 . 1 - - .",
      chords: { A: [1, 5, 1, 3], B: [5, 6, 3, 1] } },

    // ---------- Pulau (id = nomor pulau di world-data.js) ----------
    'pulau-0': { title: 'Pesta Alun-alun', note: 'Gamelan & angklung meriah', scale: 'slendro', root: 62, bpm: 112,
      lead: 'saron', lead2: 'angklung', comp: 'bonang', bass: 'gong', gong: true, drum: 'kendang', shaker: true,
      A: "6 5 3 5 6 . 1' . | 2' 1' 6 5 6 . . . | 3 5 6 1' 6 5 3 2 | 3 5 3 2 1 . . .",
      B: "1 . 2 3 5 . 6 . | 5 3 2 3 5 . . . | 6 1' 6 5 3 5 6 1' | 2' 1' 6 5 6 . . .",
      chords: { A: [6, 2, 3, 1], B: [1, 5, 6, 6] } },
    'pulau-1': { title: 'Rimba Riang', note: 'Kecapi suling Sunda', scale: 'pentatonik', root: 60, bpm: 100,
      lead: 'suling', lead2: 'kecapi', comp: 'kecapi', bass: 'pluck', gong: 'soft', drum: 'kendangLite', shaker: true,
      A: "3 - 5 6 5 - 3 2 | 1 - 2 3 2 - - - | 5 - 6 1' 6 - 5 3 | 5 - 6 5 3 - - -",
      B: "6 - 1' 2' 1' - 6 5 | 3 - 5 6 5 - - - | 2 3 5 3 2 1 2 3 | 5 3 2 3 1 - - -",
      chords: { A: [1, 2, 6, 1], B: [6, 5, 2, 1] } },
    'pulau-2': { title: 'Pasar Lembah', note: 'Kendang jaipong & bonang pasar', scale: 'slendro', root: 60, bpm: 118,
      lead: 'bonang', lead2: 'saron', comp: 'kecapi', bass: 'pluck', gong: true, drum: 'jaipong', shaker: true,
      A: "1 2 3 . 3 2 3 5 | 6 . 5 . 3 . 2 . | 1 2 3 . 3 2 3 5 | 6 5 6 1' 6 . . .",
      B: "1' . 6 5 6 . 5 3 | 5 . 3 2 3 . . . | 2 3 5 6 5 3 2 1 | 2 . 3 . 1 . . .",
      chords: { A: [1, 6, 1, 6], B: [6, 3, 2, 1] } },
    'pulau-3': { title: 'Angin Gunung', note: 'Pelog, suling, gong agung', scale: 'pelog', root: 62, bpm: 88,
      lead: 'suling', lead2: 'saron', comp: 'kecapi', bass: 'gong', pad: 'string', gong: true, drum: 'kendangLite',
      A: "3 - - 5 6 - 5 - | 3 - 2 1 2 - - - | 5 - 6 - 7 - 6 5 | 3 - 5 - 6 - - -",
      B: "1' - - 7 6 - 5 - | 6 - 5 3 5 - - - | 2 - 3 5 3 2 1 - | 2 - 3 - 1 - - -",
      chords: { A: [1, 1, 5, 6], B: [6, 5, 2, 1] } },
    'pulau-4': { title: 'Pasar Terapung', note: 'Petikan sape Dayak di atas air', scale: 'pentatonik', root: 57, bpm: 98,
      lead: 'sape', lead2: 'suling', comp: 'sape', bass: 'gong', pad: 'drone', drum: 'kendangLite',
      A: "5 - 6 5 3 - 2 3 | 5 - 6 1' 6 - 5 - | 3 - 5 3 2 - 1 2 | 3 - 5 3 2 - - -",
      B: "1' - 2' 1' 6 - 5 6 | 1' - 6 5 3 - - - | 2 3 5 6 5 3 2 3 | 1 - 2 - 1 - - -",
      chords: { A: [1, 1, 6, 1], B: [1, 5, 2, 1] } },
    'pulau-5': { title: 'Jingle Gumuk Pasir', note: 'Kolintang, gitar petik, rebana', scale: 'mayor', root: 60, bpm: 120,
      lead: 'kolintang', lead2: 'suling', comp: 'strum', bass: 'pluck', drum: 'pop', shaker: true,
      A: "1 . 1 2 3 . 5 . | 6 . 5 . 3 . 1 . | 4 . 4 5 6 . 1' . | 7 . 6 . 5 - - .",
      B: "3' . 2' . 1' . 5 . | 6 . 5 . 4 . 6 . | 2 4 6 4 2' - 1' 7 | 5 . 6 . 7 - 2' .",
      chords: { A: [1, 6, 4, 5], B: [1, 4, 2, 5] } },
    'pulau-6': { title: 'Dapur Kaldera', note: 'Talempong Minang & tambur', scale: 'pentatonik', root: 62, bpm: 110,
      lead: 'talempong', lead2: 'saron', comp: 'talempong', bass: 'pluck', gong: true, drum: 'tifa', shaker: true,
      A: "1 . 3 . 5 . 6 5 | 3 . 5 . 1' - - . | 6 . 5 . 3 . 2 3 | 5 . 3 . 1 - - .",
      B: "5 6 1' . 5 6 1' . | 2' 1' 6 5 6 - - . | 3 5 6 5 3 2 1 2 | 3 . 2 . 1 - - .",
      chords: { A: [1, 5, 6, 1], B: [5, 6, 2, 1] } },
    'pulau-7': { title: 'Sawah Bertingkat', note: 'Gangsa Bali, kotekan, ceng-ceng', scale: 'selisir', root: 64, bpm: 120,
      lead: 'gangsa', lead2: 'suling', comp: 'kotekan', bass: 'gong', gong: true, drum: 'bali', shaker: 'ceng',
      A: "1 2 3 5 3 2 1 2 | 3 . 5 . 6 . 5 . | 3 5 6 5 3 2 3 5 | 6 5 3 2 1 . . .",
      B: "5 6 1' 6 5 3 5 6 | 1' . 6 . 5 . 3 . | 2 3 5 3 2 1 2 3 | 5 3 2 3 1 . . .",
      chords: { A: [1, 5, 6, 1], B: [5, 6, 2, 1] } },
    'pulau-8': { title: 'Simfoni Bambu', note: 'Angklung & calung Sunda', scale: 'pentatonik', root: 60, bpm: 104,
      lead: 'angklung', lead2: 'calung', comp: 'angklung', bass: 'pluck', kethuk: true, drum: 'kendangLite',
      A: "5 - 3 - 5 6 5 - | 3 - 2 - 1 - - - | 2 - 3 - 5 - 6 5 | 6 - 1' - 5 - - -",
      B: "1' - 6 - 1' 2' 1' - | 6 - 5 - 3 - - - | 5 6 5 3 2 3 5 6 | 5 - 2 - 1 - - -",
      chords: { A: [1, 1, 2, 5], B: [1, 6, 2, 1] } },
    'pulau-9': { title: 'Riak Danau Kawah', note: 'Sasando berombak, tenang', scale: 'slendro', root: 62, bpm: 80,
      lead: 'sasando', lead2: 'saron', comp: 'sasando', bass: 'gong', pad: 'string', gong: 'soft',
      A: "1 - 2 - 3 - 5 - | 6 - 5 - 3 - - - | 5 - 3 - 2 - 3 - | 1 - - - - - - -",
      B: "6 - 1' - 2' - 1' - | 6 - 5 - 6 - - - | 3 - 5 - 6 - 5 - | 3 - 2 - 1 - - -",
      chords: { A: [1, 6, 2, 1], B: [6, 5, 6, 1] } },
    'pulau-10': { title: 'Nyiur Pantai', note: 'Ukulele, tifa Maluku, suling', scale: 'mayor', root: 62, bpm: 110,
      lead: 'suling', lead2: 'kolintang', comp: 'ukulele', bass: 'pluck', drum: 'tifa', shaker: true,
      A: "3 . 3 4 5 . 3 . | 4 . 4 6 1' . 6 . | 5 . 7 . 2' . 7 6 | 5 - 3 - 1 - - .",
      B: "1' . 7 6 6 . 3 . | 4 . 6 . 1' . 6 4 | 2 . 5 . 7 . 5 2 | 3 . 2 . 1 - - .",
      chords: { A: [1, 4, 5, 1], B: [6, 4, 5, 1] } },
    'pulau-11': { title: 'Layang-layang Menari', note: 'Suling tinggi & kecapi berangin', scale: 'pentatonik', root: 62, bpm: 106,
      lead: 'suling', lead2: 'angklung', comp: 'kecapi', bass: 'pluck', gong: 'soft', drum: 'kendangLite', shaker: true,
      A: "1 . 2 . 3 5 6 . | 5 . 3 . 5 - - . | 6 . 5 . 3 2 1 . | 2 . 3 . 2 - - .",
      B: "3 5 6 . 1' . 6 . | 5 6 1' . 2' - - . | 3' 2' 1' 6 5 6 1' . | 6 . 2' . 1' - - .",
      chords: { A: [1, 5, 6, 2], B: [1, 5, 6, 1] } },
    'pulau-12': { title: 'Kebun Rempah', note: 'Totobuang & tifa Maluku', scale: 'pelog', root: 60, bpm: 112,
      lead: 'totobuang', lead2: 'suling', comp: 'talempong', bass: 'pluck', gong: true, drum: 'tifa', shaker: true,
      A: "5 . 6 . 5 3 2 . | 3 . 5 . 6 - - . | 1' . 6 . 5 3 5 6 | 5 3 2 3 1 - - .",
      B: "2 . 3 5 3 . 2 1 | 2 . 3 5 6 - - . | 1' 6 5 6 5 3 2 3 | 5 . 3 . 2 - 1 .",
      chords: { A: [1, 6, 5, 1], B: [2, 6, 5, 1] } }
  };

  return { SCALES, THEMES, FORM: 'AABA', BARS: 4 };
})();
