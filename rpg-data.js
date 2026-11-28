/*
 * NUTRANTARA — aturan RPG (sejak 1.5): XP, level, gelar penjelajah, dan lencana prestasi.
 * Skrip biasa tanpa DOM: dimuat peramban (window.NUTRANTARA_RPG) dan server/uji lewat vm.
 *
 * XP tidak pernah disimpan sebagai angka yang bisa dinaikkan klien. XP selalu dihitung ulang dari "fakta":
 * progres yang sudah divalidasi server (jawaban & segel), bintang mini-game, kepingan arsip, pulau jelajah,
 * busana Butik, poin PjBL, regu, dan event Bos Mitos Gizi. Skor rapor 420 tidak terpengaruh.
 */
window.NUTRANTARA_RPG = (() => {
  const SHARD_GOAL = 48; // jumlah kepingan arsip di dunia 3D (HUD "✦ n/48")
  const ISLAND_GOAL = 6; // pulau jelajah (kind: 'wild')
  const MAX_LEVEL = 30;
  const RECIPE_GOAL = 9; // resep Dapur Lapangan (kampung-data.js)
  const GATHER_XP_CAP = 150; // XP dari memetik bahan dibatasi agar tidak sekadar diulang-ulang

  // [pos, kunci di activity, id stasiun, nama] — bintang ★ tiap mini-game khas pulau.
  const STARS = [
    [2, 'lab', 'lab', 'Meja Uji Reagen'],
    [3, 'sort', 'sortir', 'Gerbang Pilah'],
    [3, 'villi', 'vili', 'Simulator Vili 3D'],
    [4, 'benang', 'benang', 'Papan Benang Merah'],
    [4, 'kolon', 'kolon', 'Mesin Uji Adil'],
    [4, 'siaran', 'siaran', 'Menara Siaran'],
    [5, 'pecah', 'pecah', 'Mesin Pemecah Klaim'],
    [5, 'kemasan', 'kemasan', 'Kemasan Berputar'],
    [5, 'studio', 'studio', 'Studio Naskah Jujur']
  ];

  const XP = { answered: 10, correct: 30, seal: 60, allSeals: 100, star: 8, presented: 40, shard: 6, island: 25, owned: 5, pjbl: 1, team: 30, bossHit: 4, bossWin: 50, bossFinal: 25, cooked: 15, gathered: 1 };

  const TITLES = [
    [1, 'Penjelajah Pemula'], [3, 'Pengamat Pangan'], [5, 'Detektif Gizi'], [7, 'Analis Arsip'],
    [9, 'Ahli Cerna'], [12, 'Pakar Bukti'], [15, 'Duta Pangan Nusantara'], [20, 'Legenda Nusantara']
  ];

  const star3 = (id) => (f) => (f.stars[id] || 0) >= 3;
  const BADGES = [
    { id: 'langkah', group: 'Ekspedisi', icon: '🥾', name: 'Langkah Pertama', desc: 'Menyegel Pos 1.', test: (f) => f.sealedIds.includes(1) },
    { id: 'setengah', group: 'Ekspedisi', icon: '🧭', name: 'Separuh Jalan', desc: 'Menyegel 3 pos.', test: (f) => f.sealed >= 3 },
    { id: 'tamat', group: 'Ekspedisi', icon: '✦', name: 'Ekspedisi Tamat', desc: 'Menyegel keenam pos.', test: (f) => f.sealed >= 6 },
    { id: 'tepat5', group: 'Ekspedisi', icon: '🎯', name: 'Penembak Jitu', desc: '5 jawaban Papan Laporan tepat.', test: (f) => f.correct >= 5 },
    { id: 'sempurna', group: 'Ekspedisi', icon: '💯', name: 'Tanpa Cela', desc: 'Kesepuluh jawaban Papan Laporan tepat.', test: (f) => f.correct >= 10 },
    { id: 'panggung', group: 'Ekspedisi', icon: '🎤', name: 'Koki Juara', desc: 'Mempresentasikan kartu menu di Panggung Pos 6.', test: (f) => f.presented },
    { id: 'laboran', group: 'Mini-game', icon: '⚗', name: 'Laboran Teliti', desc: '★★★ di Meja Uji Reagen.', test: star3('lab') },
    { id: 'pemilah', group: 'Mini-game', icon: '⇵', name: 'Pemilah Jitu', desc: '★★★ di Gerbang Pilah.', test: star3('sortir') },
    { id: 'vili', group: 'Mini-game', icon: '🧬', name: 'Ahli Vili', desc: '★★★ di Simulator Vili 3D.', test: star3('vili') },
    { id: 'benang', group: 'Mini-game', icon: '🧵', name: 'Penelusur Benang', desc: '★★★ di Papan Benang Merah.', test: star3('benang') },
    { id: 'adil', group: 'Mini-game', icon: '⚖', name: 'Penguji Adil', desc: '★★★ di Mesin Uji Adil.', test: star3('kolon') },
    { id: 'penyiar', group: 'Mini-game', icon: '📡', name: 'Penyiar Jujur', desc: '★★★ di Menara Siaran.', test: star3('siaran') },
    { id: 'pemecah', group: 'Mini-game', icon: '🔨', name: 'Pemecah Klaim', desc: '★★★ di Mesin Pemecah Klaim.', test: star3('pecah') },
    { id: 'label', group: 'Mini-game', icon: '📦', name: 'Pembaca Label', desc: '★★★ di Kemasan Berputar.', test: star3('kemasan') },
    { id: 'naskah', group: 'Mini-game', icon: '🎬', name: 'Penulis Jujur', desc: '★★★ di Studio Naskah Jujur.', test: star3('studio') },
    { id: 'bintang', group: 'Mini-game', icon: '🌟', name: 'Kolektor Bintang', desc: '20 bintang dari semua mini-game.', test: (f) => f.starTotal >= 20 },
    { id: 'keping10', group: 'Jelajah', icon: '✨', name: 'Pemburu Kepingan', desc: 'Mengumpulkan 10 kepingan arsip.', test: (f) => f.shards >= 10 },
    { id: 'keping', group: 'Jelajah', icon: '🏆', name: 'Penjaga Arsip', desc: `Mengumpulkan ${SHARD_GOAL} kepingan arsip.`, test: (f) => f.shards >= SHARD_GOAL },
    { id: 'pulau', group: 'Jelajah', icon: '🏝', name: 'Penjelajah Pulau', desc: `Menemukan ${ISLAND_GOAL} pulau jelajah.`, test: (f) => f.islands >= ISLAND_GOAL },
    { id: 'gaya', group: 'Jelajah', icon: '👘', name: 'Gaya Nusantara', desc: 'Memiliki 3 busana Butik Nusantara.', test: (f) => f.owned >= 3 },
    { id: 'pemetik', group: 'Kampung', icon: '🧺', name: 'Pemetik Rajin', desc: 'Memetik 50 bahan pangan lokal.', test: (f) => f.gathered >= 50 },
    { id: 'koki', group: 'Kampung', icon: '🍳', name: 'Koki Nusantara', desc: 'Menguasai 5 resep Dapur Lapangan.', test: (f) => f.cooked >= 5 },
    { id: 'juru', group: 'Kampung', icon: '👩‍🍳', name: 'Juru Masak Agung', desc: `Menguasai ${RECIPE_GOAL} resep daerah.`, test: (f) => f.cooked >= RECIPE_GOAL },
    { id: 'warga', group: 'Kampung', icon: '🏡', name: 'Sahabat Warga', desc: 'Menuntaskan 8 quest warga.', test: (f) => f.questsDone >= 8 },
    { id: 'regu', group: 'Sosial & event', icon: '🤝', name: 'Rekan Regu', desc: 'Bergabung dalam regu proyek 2–4 orang.', test: (f) => f.team >= 2 },
    { id: 'pjbl', group: 'Sosial & event', icon: '📘', name: 'Analis PjBL', desc: 'Skor analisis PjBL minimal 350.', test: (f) => f.pjbl >= 350 },
    { id: 'bos', group: 'Sosial & event', icon: '⚔', name: 'Pemburu Hoaks', desc: 'Ikut mengalahkan Bos Mitos Gizi.', test: (f) => f.bossWins >= 1 },
    { id: 'pamungkas', group: 'Sosial & event', icon: '💥', name: 'Pukulan Pamungkas', desc: 'Memberi pukulan terakhir kepada Bos Mitos Gizi.', test: (f) => f.bossFinals >= 1 },
    { id: 'penangkal', group: 'Sosial & event', icon: '🛡', name: 'Penangkal Mitos', desc: '25 jawaban benar di event Bos Mitos Gizi.', test: (f) => f.bossHits >= 25 }
  ];

  const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);

  /** Fakta dari progres (state game.js / progres server) dan data tambahan di luar progres. */
  function factsFrom(progress, extra = {}) {
    const posts = progress && typeof progress.posts === 'object' && progress.posts ? progress.posts : {};
    const f = {
      sealed: 0, sealedIds: [], answered: 0, correct: 0, stars: {}, starTotal: 0, presented: false,
      shards: Math.min(SHARD_GOAL, num(extra.shards)), islands: Math.min(ISLAND_GOAL, num(extra.islands)), owned: num(extra.owned),
      pjbl: num(extra.pjbl), team: num(extra.team),
      bossHits: num(extra.bossHits), bossWins: num(extra.bossWins), bossFinals: num(extra.bossFinals), bossJoined: num(extra.bossJoined),
      questsDone: num(extra.questsDone), questXp: num(extra.questXp), cooked: Math.min(RECIPE_GOAL, num(extra.cooked)), gathered: num(extra.gathered)
    };
    for (let id = 1; id <= 6; id += 1) {
      const p = posts[id];
      if (!p || typeof p !== 'object') continue;
      if (p.sealed) { f.sealed += 1; f.sealedIds.push(id); }
      (Array.isArray(p.challenges) ? p.challenges : []).forEach((c) => {
        if (!c || typeof c !== 'object' || !c.complete) return;
        f.answered += 1;
        if (c.correct !== false) f.correct += 1; // sama dengan isRight di game.js; server selalu mengisi c.correct
      });
      if (id === 6 && p.activity && p.activity.presented) f.presented = true;
    }
    STARS.forEach(([pos, key, id]) => {
      const a = posts[pos] && posts[pos].activity;
      const s = a && a[key];
      const n = s && typeof s === 'object' ? Math.max(num(s.stars), num(s.best)) : 0;
      f.stars[id] = Math.min(3, n);
      f.starTotal += f.stars[id];
    });
    return f;
  }

  /** XP total yang dibutuhkan untuk mencapai level n (level 1 = 0 XP). */
  const threshold = (n) => 20 * (n - 1) * (n + 2);
  function levelOf(xp) {
    let n = 1;
    while (n < MAX_LEVEL && threshold(n + 1) <= xp) n += 1;
    return n;
  }
  const titleOf = (level) => TITLES.filter(([lv]) => level >= lv).pop()[1];

  function xpParts(f) {
    return [
      ['answered', 'Tantangan Papan Laporan dijawab', f.answered * XP.answered],
      ['correct', 'Jawaban tepat', f.correct * XP.correct],
      ['seal', 'Segel pos', f.sealed * XP.seal + (f.sealed >= 6 ? XP.allSeals : 0)],
      ['stars', 'Bintang mini-game', f.starTotal * XP.star],
      ['presented', 'Presentasi menu', f.presented ? XP.presented : 0],
      ['shards', 'Kepingan arsip', f.shards * XP.shard],
      ['islands', 'Pulau jelajah ditemukan', f.islands * XP.island],
      ['owned', 'Busana Butik', f.owned * XP.owned],
      ['pjbl', 'Poin analisis PjBL', f.pjbl * XP.pjbl],
      ['team', 'Regu proyek', f.team >= 2 ? XP.team : 0],
      ['boss', 'Event Bos Mitos Gizi', f.bossHits * XP.bossHit + f.bossWins * XP.bossWin + f.bossFinals * XP.bossFinal],
      ['quests', 'Quest warga', f.questXp],
      ['cooked', 'Resep Dapur Lapangan dikuasai', f.cooked * XP.cooked],
      ['gathered', 'Bahan lokal dipetik', Math.min(GATHER_XP_CAP, f.gathered) * XP.gathered]
    ].map(([id, label, xp]) => ({ id, label, xp }));
  }

  /** Ringkasan RPG: { xp, level, title, base, next, into, need, pct, badges: [id], parts, facts }. */
  function compute(f) {
    const parts = xpParts(f);
    const xp = parts.reduce((n, p) => n + p.xp, 0);
    const level = levelOf(xp);
    const base = threshold(level);
    const next = level >= MAX_LEVEL ? base : threshold(level + 1);
    const into = xp - base;
    const need = next - base;
    return {
      xp, level, title: titleOf(level), base, next, into, need, pct: need ? Math.min(100, Math.round((into / need) * 100)) : 100,
      badges: BADGES.filter((b) => b.test(f)).map((b) => b.id),
      parts: parts.filter((p) => p.xp > 0),
      facts: { sealed: f.sealed, correct: f.correct, starTotal: f.starTotal, shards: f.shards, islands: f.islands, bossHits: f.bossHits, bossWins: f.bossWins, questsDone: f.questsDone, cooked: f.cooked, gathered: f.gathered }
    };
  }

  const badge = (id) => BADGES.find((b) => b.id === id) || null;
  return { XP, TITLES, BADGES, STARS, SHARD_GOAL, ISLAND_GOAL, MAX_LEVEL, RECIPE_GOAL, threshold, levelOf, titleOf, factsFrom, compute, badge };
})();
