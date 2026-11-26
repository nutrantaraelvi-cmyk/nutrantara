'use strict';
/* Uji asap server kelas: akun, dua pemain, pulau, dan admin. Jalankan: npm test */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');
const WebSocket = require('ws');

const PORT = 3999;
const PIN = '246810';
const ROOT = path.join(__dirname, '..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrantara-test-'));
const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
  env: { ...process.env, PORT: String(PORT), NUTRANTARA_ADMIN_PIN: PIN, NUTRANTARA_DATA_DIR: dataDir },
  stdio: ['ignore', 'pipe', 'inherit']
});

let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? '✓' : '✗'} ${label}`); if (!cond) failures += 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const loadBrowser = (file) => { const sb = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sb); return sb.window; };
const MISSIONS = loadBrowser('missions.js').NUTRANTARA_MISSIONS;
const TEAMDEF = loadBrowser('missions.js').NUTRANTARA_TEAM;
const W = loadBrowser('world-data.js').NUTRANTARA_WORLD;
const SHOP = loadBrowser('shop-data.js').NUTRANTARA_SHOP;
const PJ = (() => { const sb = { window: {} }; vm.createContext(sb); ['pjbl-data.js', 'pjbl-core.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb)); return sb.window.NUTRANTARA_PJBL_CORE; })();

// ---------- PjBL POS 1–6: logika bersama (tanpa server) ----------
(() => {
  const P = PJ.data;
  ok(P.pos.length === 5 && P.pos.every((p) => p.questions.length === 10), 'PjBL: 50 soal analisis POS 1–5');
  ok(P.pos.map((p) => p.questions.map((q) => q.key.toUpperCase()).join('')).join(' ') === 'CADCADBCAD CADBCADBCA BDACBADCBD CABDACBDAC DBACDBACDB', 'PjBL: kunci jawaban sama dengan rekap dokumen');
  const g = PJ.freshGroup();
  const m = PJ.freshMine();
  const ctx = { mine: m, group: g, actor: { id: 'x', alias: 'Uji' }, waiting: () => [] };
  ok(!PJ.apply(ctx, { action: 'pick', q: 'p2q1', r: 'c' }).ok, 'PjBL: POS 2 terkunci sebelum POS 1 selesai');
  ok(!PJ.apply(ctx, { action: 'lock', q: 'p1q1', r: 'c' }).ok, 'PjBL: kunci kelompok butuh pilihan individu dulu');
  // 6 soal benar di percobaan 1 (60), 2 soal benar di percobaan 2 (10), 2 soal salah dua kali (0) → 70.
  P.pos[0].questions.forEach((q, i) => {
    const wrong = q.options.find((o) => o.id !== q.key).id;
    const wrong2 = q.options.filter((o) => o.id !== q.key)[1].id;
    const seq = i < 6 ? [q.key] : i < 8 ? [wrong, q.key] : [wrong, wrong2];
    seq.forEach((r) => { PJ.apply(ctx, { action: 'pick', q: q.id, r }); PJ.apply(ctx, { action: 'lock', q: q.id, r }); });
  });
  const s1 = PJ.posScore(g, 1);
  ok(s1.points === 70 && s1.complete && s1.passed && PJ.unlocked(g, 2), 'PjBL: skor 10/5/0, 70 poin membuka POS 2');
  ok(!PJ.apply(ctx, { action: 'lock', q: 'p1q1', r: 'a' }).ok, 'PjBL: soal yang sudah terkunci tidak bisa dijawab ulang');
  const g2 = PJ.normGroup(JSON.parse(JSON.stringify(g)));
  const q10 = P.pos[0].questions[9];
  g2.answers[q10.id] = PJ.grade(q10, [{ r: q10.options.find((o) => o.id !== q10.key).id }, { r: q10.options.filter((o) => o.id !== q10.key)[1].id }]);
  const q1 = P.pos[0].questions[0];
  g2.answers[q1.id] = PJ.grade(q1, [{ r: q1.options.find((o) => o.id !== q1.key).id }, { r: q1.key }]); // 60 + 5 → 65 poin
  ok(PJ.posScore(g2, 1).points === 65 && !PJ.unlocked(g2, 2), 'PjBL: skor < 70 belum membuka POS 2');
  const ctx2 = { mine: m, group: g2, actor: { id: 'x', alias: 'Uji' }, waiting: () => [] };
  PJ.posScore(g2, 1).missed.forEach((id) => PJ.apply(ctx2, { action: 'reread', q: id }));
  ok(PJ.unlocked(g2, 2), 'PjBL: membaca ulang feedback semua soal yang salah membuka POS 2');
  const hacked = PJ.normGroup({ answers: { p1q1: { tries: [{ r: 'a' }, { r: 'b' }, { r: 'c' }], points: 10 } } });
  ok(hacked.answers.p1q1.points === 0 && hacked.answers.p1q1.done, 'PjBL: percobaan ketiga dan klaim poin dari klien diabaikan');
  const order = PJ.optionOrder('uji', 'p1q1');
  ok(order.slice().sort().join('') === 'abcd' && PJ.optionOrder('uji', 'p1q1').join() === order.join(), 'PjBL: urutan pilihan diacak tetap per siswa');
  ok(!/[{}]/.test(PJ.feedbackText(P.pos[0].questions[0].wrong, order)), 'PjBL: penanda huruf di feedback diganti huruf tampilan');
  const ex = P.pos6.example;
  const menu = PJ.normMenu({ items: ex.items, snack: ex.snack, allergens: ['ikan', 'kedelai'], licensed: true, name: 'Piring Nara Nusantara', reason: 'Menu tanpa minuman manis menurunkan gula yang di POS 1 mencapai 50 g, dan ada sayur serta buah.' });
  ok(PJ.validateMenu(menu).allOk, 'PjBL: contoh prototype menu acuan guru lolos 10 kriteria');
  const bad = PJ.normMenu({ items: [{ card: 'mi-instan' }, { card: 'ayam-tepung' }, { card: 'minuman-kemasan' }] });
  const vb = PJ.validateMenu(bad);
  ok(!vb.allOk && ['lengkap', 'gula', 'natrium', 'harga', 'lemak'].every((id) => !vb.checks.find((c) => c.id === id).ok), 'PjBL: menu kantin lama gagal kriteria gizi dan harga');
  const fried = PJ.validateMenu(PJ.normMenu({ ...menu, items: menu.items.map((it) => (it.card === 'pepes-ikan' ? { ...it, method: 'goreng' } : it)) })).totals;
  ok(fried.fat > PJ.validateMenu(menu).totals.fat, 'PjBL: cara olah goreng menambah lemak');
  ok(PJ.reflectFeedback(0, 'Menu kami menurunkan gula dari 50 g menjadi 6 g per hari.') === 'good' && PJ.reflectFeedback(0, 'Menu kami sehat dan enak sekali rasanya.') === 'fix', 'PjBL: umpan balik refleksi membedakan jawaban berbukti');
})();

function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  const inbox = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    inbox.push(msg);
    waiters.slice().forEach((w) => { if (w.pred(msg)) { waiters.splice(waiters.indexOf(w), 1); inbox.splice(inbox.indexOf(msg), 1); w.resolve(msg); } });
  });
  return {
    ws,
    send: (m) => ws.send(JSON.stringify(m)),
    wait: (pred, ms = 3000) => new Promise((resolve, reject) => {
      const found = inbox.find(pred);
      if (found) { inbox.splice(inbox.indexOf(found), 1); return resolve(found); }
      const w = { pred, resolve };
      waiters.push(w);
      setTimeout(() => { if (waiters.includes(w)) { waiters.splice(waiters.indexOf(w), 1); reject(new Error(`timeout menunggu pesan`)); } }, ms);
    }),
    // Buang pesan lama di kotak masuk agar wait() berikutnya hanya melihat pesan baru.
    drain: (pred) => { for (let i = inbox.length - 1; i >= 0; i--) if (pred(inbox[i])) inbox.splice(i, 1); },
    open: () => new Promise((r) => ws.once('open', r))
  };
}

const type = (t) => (m) => m.type === t;

function api(route, data, token) {
  return fetch(`http://localhost:${PORT}/api/${route}`, {
    method: data ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data ? JSON.stringify(data) : undefined
  }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
}

function fakeState(overrides) {
  const correct = MISSIONS[0].challenges.map((c) => c.correct);
  return {
    schemaVersion: 2, alias: 'x', activePos: 1, updatedAt: new Date().toISOString(),
    posts: { 1: { started: true, sealed: true, reason: 'Energi sama tetapi protein dan serat berbeda.', challenges: correct.map((r) => ({ complete: true, attempts: 1, response: r, log: [] })) }, ...overrides }
  };
}

async function adminProbe() {
  const probe = client();
  await probe.open();
  probe.send({ type: 'admin-auth', pin: PIN });
  const snap = await probe.wait(type('admin-state'));
  probe.ws.close();
  return snap;
}

(async () => {
  await new Promise((r) => server.stdout.on('data', (d) => { if (String(d).includes('PIN')) r(); }));
  try {
    // ---------- Halaman ----------
    const html = await fetch(`http://localhost:${PORT}/`).then((r) => r.text());
    ok(html.includes('hero-canvas'), 'landing page disajikan di /');
    ok(html.includes('id="splash"') && html.includes('splash.js'), 'beranda memuat layar muat utama');
    const splashAssets = await Promise.all(['/splash.js', '/assets/layar-muat.webp', '/assets/layar-muat-960.webp'].map((p) => fetch(`http://localhost:${PORT}${p}`)));
    ok(splashAssets.every((r) => r.ok), 'skrip & ilustrasi layar muat disajikan server');
    const play = await fetch(`http://localhost:${PORT}/play`).then((r) => r.text());
    ok(play.includes('world3d.js') && play.includes('app.js'), 'halaman game disajikan di /play');
    // Semua modul ES yang diimpor halaman (termasuk terrain.js & weather.js sejak 1.1) harus ada di whitelist STATIC.
    const modules = new Set(); const queue = ['app.js', 'world3d.js', 'landing.js', 'shop.js'];
    while (queue.length) {
      const file = queue.shift();
      if (modules.has(file)) continue;
      modules.add(file);
      for (const m of fs.readFileSync(path.join(__dirname, '..', file), 'utf8').matchAll(/from '\.\/([\w./-]+\.js)'/g)) if (!m[1].startsWith('vendor/')) queue.push(m[1]);
    }
    const served = await Promise.all([...modules].map(async (f) => [f, (await fetch(`http://localhost:${PORT}/${f}`)).ok]));
    ok(served.every(([, s]) => s) && modules.has('terrain.js') && modules.has('weather.js') && modules.has('fashion.js') && (await fetch(`http://localhost:${PORT}/shop-data.js`)).ok, `semua modul halaman disajikan server (${served.filter(([, s]) => !s).map(([f]) => f).join(', ') || `${served.length} modul`})`);
    const three = await fetch(`http://localhost:${PORT}/vendor/three/three.module.min.js`);
    ok(three.ok && three.headers.get('cache-control').includes('max-age'), 'Three.js lokal disajikan dengan cache');
    ok((await fetch(`http://localhost:${PORT}/server.js`)).status === 404, 'berkas server tidak dapat diunduh');
    const health = await fetch(`http://localhost:${PORT}/health`).then((r) => r.json());
    ok(health.ok === true && health.storage === true, '/health melaporkan folder data bisa ditulis');

    // ---------- Akun ----------
    const regA = await api('register', { username: 'Penjelajah07', password: 'rahasia123', color: '#ffd17c' });
    ok(regA.status === 201 && regA.token && regA.user.color === '#ffd17c', 'daftar akun baru');
    ok((await api('register', { username: 'penjelajah07', password: 'lainnya123' })).status === 409, 'nama pengguna ganda ditolak');
    ok((await api('register', { username: 'Nama Lengkap Saya', password: 'x' })).status === 400, 'nama pengguna/kata sandi tidak valid ditolak');
    ok((await api('login', { username: 'Penjelajah07', password: 'salah' })).status === 401, 'kata sandi salah ditolak');
    const logA = await api('login', { username: 'PENJELAJAH07', password: 'rahasia123' });
    ok(logA.status === 200 && Boolean(logA.token), 'masuk dengan kata sandi benar');
    ok((await api('me', null, logA.token)).user.username === 'Penjelajah07', '/api/me mengenali sesi');
    const regB = await api('register', { username: 'TimTempe', password: 'tempe12345' });

    const bad = client(); await bad.open();
    bad.send({ type: 'join', session: 'token-palsu-yang-cukup-panjang-123' });
    ok((await bad.wait(type('error'))).code === 'auth', 'sesi palsu ditolak');
    bad.ws.close();

    // ---------- Lobi & pulau ----------
    const a = client(); await a.open();
    a.send({ type: 'join', session: logA.token });
    const wa = await a.wait(type('welcome'));
    ok(wa.you.alias === 'Penjelajah07' && wa.you.zone === 'lobby', 'pemain A masuk lobi');

    const b = client(); await b.open();
    b.send({ type: 'join', session: regB.token });
    const wb = await b.wait(type('welcome'));
    ok(wb.players.some((p) => p.alias === 'Penjelajah07'), 'pemain B melihat pemain A');

    a.send({ type: 'spawn', island: 3 });
    ok((await a.wait(type('spawn-denied'))).island === 3, 'terjun ke pulau terkunci ditolak');
    a.send({ type: 'spawn', island: 1 });
    const sp = await a.wait(type('spawned'));
    ok(sp.island === 1 && W.islandAt(sp.x, sp.y) === 1, 'terjun ke Pulau Pos 1');
    ok(W.islands.length === 13 && W.islands.filter((i) => i.kind === 'wild').every((i) => W.allowedIslands([], []).has(i.id)), 'pulau jelajah selalu terbuka');
    b.send({ type: 'spawn', island: 1 });
    await b.wait(type('spawned'));

    a.send({ type: 'move', x: sp.x + 30, y: sp.y });
    const pos = await b.wait((m) => m.type === 'positions' && m.list.some(([id, x]) => id === wa.you.id && x > sp.x + 20));
    ok(pos.list.find(([id]) => id === wa.you.id)[6] === 1, 'gerak A tersiar ke B (zona dunia)');

    // Coba berjalan ke timur menyeberangi celah ke Wilayah Pos 3 yang masih terkunci (tanpa jembatan di jalur ini).
    const pos3 = W.islands.find((i) => i.id === 3);
    ok(W.islands.find((i) => i.id === 1).rx * 0.2 >= 1000 && pos3.rx * 0.2 >= 1000, 'wilayah pos dunia terbuka berukuran ±1000 × 650 m');
    let cur = { x: sp.x + 30, y: sp.y };
    const steps = Math.ceil((pos3.cx - cur.x) / 58);
    for (let i = 0; i < steps; i += 1) { cur = { x: cur.x + 58, y: cur.y }; a.send({ type: 'move', x: cur.x, y: cur.y }); await sleep(30); } // di bawah batas ~40 pesan/detik
    await sleep(1100); // tunggu jatah pesan per detik pulih
    const meA = (await adminProbe()).players.find((p) => p.alias === 'Penjelajah07');
    ok(W.islandAt(meA.x, meA.y) === 1 && meA.x > sp.x + 3000 && Math.abs(W.clamp(meA.x, meA.y, W.allowedIslands([], [1])).x - meA.x) < 2, 'pemain bisa menjelajah wilayah pos tetapi tidak bisa berjalan ke pos yang belum terbuka');

    a.send({ type: 'emote', emote: 'wave' });
    ok((await b.wait(type('emote'))).emote === 'wave', 'emote tersiar');

    // Regu mabar: kode undangan, gabung, terjun ke teman, keluar.
    a.send({ type: 'party', action: 'create' });
    const partyA = (await a.wait((m) => m.type === 'party' && m.party)).party;
    ok(/^[A-HJ-NP-Z2-9]{6}$/.test(partyA.code) && partyA.members.length === 1, 'membuat regu memberi kode undangan 6 karakter');
    b.send({ type: 'party', action: 'join', code: 'ZZZZZZ' });
    ok(/tidak ditemukan/.test((await b.wait(type('party-error'))).message), 'kode regu salah ditolak');
    b.send({ type: 'party', action: 'join', code: partyA.code.toLowerCase() });
    ok((await b.wait((m) => m.type === 'party' && m.party && m.party.members.length === 2)).party.code === partyA.code, 'teman bergabung dengan kode undangan');
    ok((await b.wait(type('notice'))).message.includes(partyA.code), 'pemberitahuan bergabung regu');
    ok((await a.wait((m) => m.type === 'party' && m.party && m.party.members.length === 2)).party.members.some((m) => m.alias === 'TimTempe'), 'pembuat regu melihat anggota baru');
    ok((await adminProbe()).players.find((p) => p.alias === 'TimTempe').party === partyA.code, 'guru melihat regu siswa');

    // Regu proyek (PjBL): data misi bersama lewat operasi kecil, jawaban regu lewat voting.
    a.send({ type: 'team-op', pos: 1, note: 'menyimpan bukti Energi', ops: [{ p: [1, 'evidence'], push: 0 }, { p: [1, 'activity', 'stations', 'x'], set: true }, { p: [1, 'challenges'], set: [] }, { p: [1, '__proto__', 'x'], set: 1 }] });
    const shared = (await b.wait((m) => m.type === 'party' && m.party && (m.party.posts[1] || {}).evidence && m.party.posts[1].evidence.includes(0))).party;
    ok(shared.posts[1].activity.stations.x === true && shared.log.some((e) => e.text === 'menyimpan bukti Energi'), 'bukti & misi anggota A tampil di regu anggota B, lengkap dengan log kontribusi');
    ok((shared.posts[1].challenges || []).every((c) => !c.complete), 'operasi regu tidak bisa menandai tantangan selesai (hanya lewat voting)');
    const tv = Number.isInteger(shared.posts[1].variant) ? shared.posts[1].variant : 0;
    const key0 = MISSIONS[0].variants[tv].mission.challenges[0].correct;
    a.send({ type: 'team-vote', pos: 1, index: 0, response: key0 });
    const pending = (await b.wait((m) => m.type === 'party' && m.party && ((m.party.posts[1] || {}).votes || {})[0])).party;
    ok(!pending.posts[1].challenges[0].complete, 'satu usulan belum mengunci jawaban bila anggota lain aktif');
    b.send({ type: 'team-vote', pos: 1, index: 0, response: key0 });
    const locked = (await a.wait((m) => m.type === 'party' && m.party && m.party.posts[1]?.challenges?.[0]?.complete)).party;
    ok(locked.posts[1].challenges[0].correct === true && locked.posts[1].challenges[0].points === 30 && locked.posts[1].challenges[0].by.length === 2, 'dua suara sama mengunci jawaban regu (30 poin)');
    const teamAdmin = (await adminProbe()).teams.find((t) => t.code === partyA.code);
    ok(teamAdmin && teamAdmin.members.length === 2 && teamAdmin.posts[0].done === 1 && teamAdmin.members.every((m) => m.contrib >= 1), 'guru melihat kemajuan regu dan kontribusi setiap anggota');
    // Ruang Arsip Pos 6: alasan Paspor anggota yang sudah disegel ikut terkirim ke regu untuk telaah sejawat.
    const key1 = MISSIONS[0].variants[tv].mission.challenges[1].correct;
    a.send({ type: 'team-vote', pos: 1, index: 1, response: key1 });
    b.send({ type: 'team-vote', pos: 1, index: 1, response: key1 });
    await a.wait((m) => m.type === 'party' && m.party && m.party.posts[1]?.challenges?.[1]?.complete);
    // ---------- PjBL: jawab individu, lalu kunci kelompok ----------
    a.send({ type: 'pjbl', action: 'pick', q: 'p1q1', r: 'a' });
    await a.wait((m) => m.type === 'pjbl' && m.action === 'pick');
    a.send({ type: 'pjbl', action: 'lock', q: 'p1q1', r: 'a' });
    ok(/TimTempe/.test((await a.wait(type('pjbl-error'))).message), 'PjBL: kunci kelompok menunggu teman daring memilih sendiri');
    b.send({ type: 'pjbl', action: 'pick', q: 'p1q1', r: 'c' });
    const seen = await a.wait((m) => m.type === 'pjbl' && m.members.some((x) => x.alias === 'TimTempe' && x.picks.p1q1 === true));
    ok(Boolean(seen), 'PjBL: anggota melihat teman sudah memilih (isinya masih tertutup)');
    a.send({ type: 'pjbl', action: 'lock', q: 'p1q1', r: 'a' });
    const wrong1 = await a.wait((m) => m.type === 'pjbl' && m.action === 'lock');
    ok(wrong1.result && !wrong1.result.correct && !wrong1.result.done, 'PjBL: jawaban salah pertama memberi kesempatan kedua');
    b.send({ type: 'pjbl', action: 'lock', q: 'p1q1', r: 'c' });
    const right2 = await b.wait((m) => m.type === 'pjbl' && m.action === 'lock');
    ok(right2.result && right2.result.correct && right2.result.points === 5 && right2.group.answers.p1q1.done, 'PjBL: benar di percobaan kedua = 5 poin');
    const shownA = await a.wait((m) => m.type === 'pjbl' && m.group.answers.p1q1 && m.group.answers.p1q1.done);
    ok(shownA.members.find((x) => x.alias === 'TimTempe').picks.p1q1 === 'c', 'PjBL: isi pilihan teman dibuka setelah soal terkunci');
    a.send({ type: 'pjbl', action: 'pick', q: 'p2q1', r: 'c' });
    ok(/belum terbuka/.test((await a.wait(type('pjbl-error'))).message), 'PjBL: POS 2 masih terkunci di server');
    a.send({ type: 'pjbl', action: 'logbook', pos: 1, text: 'Bagaimana merancang menu kantin harian yang bergizi seimbang, terjangkau, dan disukai siswa?' });
    ok(Boolean((await b.wait((m) => m.type === 'pjbl' && m.group.logbook[1])).group.logbook[1].by === 'Penjelajah07'), 'PjBL: logbook kelompok tersimpan untuk semua anggota');
    ok((await adminProbe()).players.find((p) => p.alias === 'TimTempe').pjbl.total === 5, 'PjBL: guru melihat skor analisis kelompok');

    const reasonB = 'Energi kedua menu sama, tetapi protein dan serat menu B lebih tinggi.';
    const stB = fakeState();
    stB.posts[1].reason = reasonB;
    b.send({ type: 'progress', state: stB });
    const withReason = (await a.wait((m) => m.type === 'party' && m.party && m.party.members.some((x) => (x.reasons || {})[1] === reasonB))).party;
    ok(Boolean(withReason) && withReason.members.every((x) => !x.reasons || !x.reasons[2]), 'alasan Paspor yang sudah disegel tampil untuk teman regu (telaah sejawat Ruang Arsip)');
    b.send({ type: 'spawn', to: wa.you.id });
    const nearA = await b.wait((m) => m.type === 'spawned' && m.friend === wa.you.id);
    ok(Number.isFinite(nearA.x) && W.islandAt(nearA.x, nearA.y) === nearA.island || nearA.island === 0, 'terjun ke dekat teman satu regu');
    b.send({ type: 'party', action: 'leave' });
    ok((await b.wait((m) => m.type === 'party' && m.party === null)).party === null && (await a.wait((m) => m.type === 'party' && m.party && m.party.members.length === 1)), 'keluar dari regu');
    b.send({ type: 'spawn', to: wa.you.id });
    ok(/bukan anggota/.test((await b.wait((m) => m.type === 'spawn-denied' && m.friend === wa.you.id)).message), 'tidak bisa terjun ke pemain di luar regu');
    a.send({ type: 'party', action: 'leave' });
    ok((await a.wait((m) => m.type === 'party' && m.party === null)).party === null, 'anggota terakhir keluar: regu bubar, progres pribadi tetap ada');

    // ---------- Progres ----------
    a.send({ type: 'progress', state: fakeState() });
    const board = await b.wait((m) => m.type === 'leaderboard' && m.leaderboard.some((r) => r.alias === 'Penjelajah07' && r.score === 80));
    ok(Boolean(board), 'progres sah Pos 1 dihitung server = 80 poin');
    a.send({ type: 'spawn', island: 2 });
    ok((await a.wait(type('spawned'))).island === 2, 'segel Pos 1 membuka Pulau Pos 2');

    // Tiap skenario penilaian dimulai dari progres kosong (guru mengatur ulang), karena jawaban
    // yang sudah tersimpan di server terkunci dan tidak bisa diganti lewat progres baru.
    const resetB = async () => {
      const probe = client(); await probe.open();
      probe.send({ type: 'admin-auth', pin: PIN });
      await probe.wait(type('admin-state'));
      probe.send({ type: 'admin', action: 'reset', playerId: wb.you.id });
      await b.wait(type('reset'));
      probe.ws.close();
      b.drain(() => true);
    };
    const scoreB = (pred) => b.wait((m) => m.type === 'leaderboard' && m.leaderboard.some((r) => r.alias === 'TimTempe' && pred(r)));

    // Jawaban salah tetap sah (0 poin) dan pos boleh disegel.
    await resetB();
    const wrongState = fakeState();
    wrongState.posts[1].challenges = [{ complete: true, attempts: 1, response: 'salah-total', correct: true }, { complete: true, attempts: 1, response: ['x'], correct: true }];
    b.send({ type: 'progress', state: wrongState });
    const wb2 = await scoreB((r) => r.seals === 1);
    ok(wb2.leaderboard.find((r) => r.alias === 'TimTempe').score === 20, 'jawaban salah = 0 poin, segel tetap sah (klaim "benar" dari klien diabaikan)');

    // Setelah melihat kunci, jawaban yang sudah terkunci tidak bisa diganti lewat progres.
    b.send({ type: 'progress', state: fakeState() });
    const relock = await b.wait(type('progress-sync'));
    ok(relock.progress.posts[1].challenges[0].response === 'salah-total', 'jawaban yang sudah terkunci tidak bisa diganti lewat progres');
    const afterTry = (await adminProbe()).players.find((p) => p.alias === 'TimTempe');
    ok(afterTry.score === 20 && afterTry.flags.some((f) => f.includes('sudah terkunci')), 'skor tetap 20 dan guru melihat catatan upaya mengganti jawaban');

    // Pos 1 punya 100 varian kasus; server menilai dengan kunci varian milik siswa.
    const V = MISSIONS[0].variants;
    ok(V.length === 100 && new Set(V.map((v) => v.mission.stimulus.columns.join('|'))).size === 100, 'Pos 1 punya 100 varian dengan pasangan menu berbeda');
    const k = V.findIndex((v, i) => i > 0 && JSON.stringify(v.mission.challenges[1].correct) !== JSON.stringify(V[0].mission.challenges[1].correct));
    const variantState = (keys, variant = k) => { const st = fakeState(); st.posts[1].variant = variant; st.posts[1].challenges = keys.map((r) => ({ complete: true, attempts: 1, response: r, log: [] })); return st; };
    await resetB();
    b.send({ type: 'progress', state: variantState(V[k].mission.challenges.map((x) => x.correct)) });
    ok(Boolean(await scoreB((r) => r.score === 80)), `jawaban benar varian ${k + 1} = 80 poin`);
    await resetB();
    b.send({ type: 'progress', state: variantState(V[0].mission.challenges.map((x) => x.correct)) });
    ok(Boolean(await scoreB((r) => r.score === 50)), 'kunci kasus asli tidak berlaku untuk varian lain');
    // Varian tidak bisa ditukar ke varian 0 (kuncinya paling mudah ditemukan) setelah pos dimulai.
    b.send({ type: 'progress', state: variantState(V[0].mission.challenges.map((x) => x.correct), 0) });
    ok((await b.wait(type('progress-sync'))).progress.posts[1].variant === k, 'nomor varian tidak bisa ditukar setelah pos dimulai');

    // Pos 2 punya 4 kasus gangguan jalur; tiap kasus cocok dengan kasus Meja Uji Reagen.
    const P2 = MISSIONS[1];
    ok(P2.variants.length === 4 && P2.variants.every((v) => P2.activity.lab.cases[v.activity.caseId] && v.mission.stimulus.rows.length === 4), 'Pos 2 punya 4 kasus yang cocok dengan Meja Uji Reagen');
    // Pos 4: papan benang, Mesin Uji Adil, dan kartu Menara Siaran konsisten dengan catatan harian.
    const P4 = MISSIONS[3].activity;
    const ids4 = new Set(P4.threads.nodes.map((n) => n.id));
    const complaint = MISSIONS[3].stimulus.rows[3].values;
    const days4 = (hi) => P4.colon.base.days - P4.colon.factors.reduce((n, f) => n + (hi ? f.days : 0), 0);
    ok(P4.threads.links.every((l) => ids4.has(l.from) && ids4.has(l.to) && P4.threads.lanes[l.lane]) && Object.keys(TEAMDEF.tasks[4].threads).every((k) => ids4.has(k)), 'Pos 4: benang dan peta peran merujuk kartu yang ada');
    ok(String(days4(false)) === complaint[0][0] && String(days4(true)) === complaint[1][0], 'Pos 4: Mesin Uji Adil mengulang catatan harian (5 → 1 hari keluhan)');
    ok(Object.keys(P4.tower.lenses).every((k) => P4.tower.cards.filter((c) => c.lens === k).length >= P4.tower.deal / 4), 'Pos 4: tiap lensa Menara Siaran punya cukup kartu');
    // Pos 5: tiap klaim punya tepat satu asumsi inti; tiap kemasan menyembunyikan info di belakang/samping; naskah punya satu kepingan jujur per bagian.
    const P5 = MISSIONS[4].activity;
    ok(P5.geode.claims.every((c) => c.options.filter((o) => o.ok).length === 1 && ['data', 'kesimpulan'].every((k) => c.pieces.some((p) => p.kind === k))), 'Pos 5: tiap klaim punya data, kesimpulan, dan satu asumsi inti');
    ok(P5.pack.products.every((p) => p.facts.some((f) => f.ignored && f.face === 'back') && p.facts.some((f) => f.ignored && f.face === 'side') && p.facts.some((f) => !f.ignored)), 'Pos 5: tiap kemasan menyembunyikan informasi di belakang dan samping');
    ok(P5.studio.slots.every((sl) => sl.options.filter((o) => o.ok).length === 1 && sl.options.every((o) => o.ok || o.trick)) && P5.studio.personas.every((x) => x.options[x.answer]), 'Pos 5: naskah dan sasaran Studio konsisten');
    const AR = MISSIONS[5].activity.archive;
    ok(MISSIONS[5].type === 'project' && AR && ['k', 'b', 'p'].every((id) => AR.rubric.some((r) => r.id === id)) && AR.plus.length >= 3 && AR.tips.length >= 3, 'Pos 6: Ruang Arsip punya rubrik Klaim–Bukti–Penalaran dan kalimat pemandu masukan');
    const p2State = (v, keys) => { const st = fakeState({ 2: { started: true, sealed: false, reason: '', variant: v, challenges: keys.map((r) => ({ complete: true, attempts: 1, response: r, log: [] })) } }); st.posts[1].variant = 0; return st; };
    await resetB();
    b.send({ type: 'progress', state: p2State(3, P2.variants[3].mission.challenges.map((c) => c.correct)) });
    ok(Boolean(await scoreB((r) => r.score === 140)), 'kasus empedu Pos 2 dinilai dengan kuncinya sendiri');

    await resetB();
    const forged = fakeState({ 2: { started: true, sealed: true, reason: 'aaaaaaaaaaaaaaaaaaaaaaaaa', challenges: [{ complete: false, attempts: 0 }, { complete: false, attempts: 0 }] } });
    b.send({ type: 'progress', state: forged });
    const sync = await b.wait(type('progress-sync'));
    ok(sync.progress.posts[2].sealed === false, 'segel tanpa menjawab semua tantangan dibatalkan server');

    // ---------- Butik Nusantara (toko busana, sejak 1.2) ----------
    const ids = SHOP.items.map((it) => it.id);
    ok(new Set(ids).size === ids.length && SHOP.slots.every((s) => SHOP.items.filter((it) => it.slot === s.id && it.bawaan).length === 1) && SHOP.items.every((it) => SHOP.slots.some((s) => s.id === it.slot) && it.price >= 0 && it.name && it.origin), 'katalog butik: id unik, satu barang bawaan per slot, harga & asal lengkap');
    // A punya 80 poin (Pos 1 benar semua + segel). Saldo = skor − dibelanjakan; skor tidak berkurang.
    a.drain(type('wardrobe')); b.drain(type('player-outfit'));
    a.send({ type: 'shop', action: 'buy', item: 'siger' });
    const pricey = await a.wait(type('wardrobe'));
    ok(pricey.ok === false && pricey.message.includes('belum cukup') && pricey.balance === 80, 'barang di atas saldo ditolak (saldo 80)');
    a.send({ type: 'shop', action: 'buy', item: 'peci' });
    const peci = await a.wait(type('wardrobe'));
    ok(peci.ok && peci.wardrobe.owned.includes('peci') && peci.wardrobe.wear.kepala === 'peci' && peci.wardrobe.spent === 40 && peci.balance === 40, 'beli Peci (40 poin): langsung dipakai, saldo jadi 40');
    ok((await b.wait(type('player-outfit'))).wear.kepala === 'peci', 'teman melihat busana baru');
    a.send({ type: 'shop', action: 'buy', item: 'peci' });
    ok((await a.wait(type('wardrobe'))).ok === false, 'barang yang sudah dimiliki tidak dibeli dua kali');
    a.send({ type: 'shop', action: 'wear', item: 'kawung' });
    ok((await a.wait(type('wardrobe'))).ok === false, 'busana yang belum dimiliki tidak bisa dipakai');
    a.send({ type: 'shop', action: 'buy', item: 'tidak-ada' });
    ok((await a.wait(type('wardrobe'))).ok === false, 'barang yang tidak ada di katalog ditolak');
    a.send({ type: 'shop', action: 'wear', item: 'caping' });
    ok((await a.wait(type('wardrobe'))).wardrobe.wear.kepala === 'caping', 'busana bawaan bisa dipakai lagi');
    const shopper = (await adminProbe()).players.find((p) => p.alias === 'Penjelajah07');
    ok(shopper.score === 80 && shopper.shop.spent === 40 && shopper.shop.balance === 40 && shopper.shop.owned.includes('peci'), 'skor tetap 80; guru melihat 40 poin dibelanjakan');

    // ---------- Admin ----------
    const adm = client(); await adm.open();
    adm.send({ type: 'admin-auth', pin: '000000' });
    ok((await adm.wait(type('admin-error'))).message.includes('PIN'), 'PIN salah ditolak');
    adm.send({ type: 'admin', action: 'set-paused', value: true });
    await sleep(100);
    adm.send({ type: 'admin-auth', pin: PIN });
    await adm.wait(type('admin-welcome'));
    const snap = await adm.wait(type('admin-state'));
    ok(snap.settings.paused === false, 'perintah admin sebelum login diabaikan');
    const pa = snap.players.find((p) => p.alias === 'Penjelajah07');
    const pb = snap.players.find((p) => p.alias === 'TimTempe');
    ok(pa && pa.score === 80 && pa.online && pa.zone === 'world', 'admin melihat skor, status daring, dan zona');
    ok(pb.flags.length > 0, 'admin melihat catatan validasi untuk progres palsu');

    adm.send({ type: 'admin', action: 'set-post', pos: 2, open: false });
    const st = await a.wait((m) => m.type === 'settings' && !m.settings.openPosts.includes(2));
    ok(!('classCode' in st.settings), 'menutup Pos 2 tersiar ke pemain (tanpa membocorkan kode kelas)');

    adm.send({ type: 'admin', action: 'set-paused', value: true });
    ok((await a.wait((m) => m.type === 'settings' && m.settings.paused)).settings.paused, 'jeda tersiar');
    adm.send({ type: 'admin', action: 'set-paused', value: false });
    await a.wait((m) => m.type === 'settings' && !m.settings.paused);

    adm.send({ type: 'admin', action: 'set-shop', value: false });
    await a.wait((m) => m.type === 'settings' && m.settings.shopOpen === false);
    a.send({ type: 'shop', action: 'buy', item: 'selendang' });
    ok((await a.wait(type('wardrobe'))).message.includes('ditutup'), 'toko yang ditutup guru menolak pembelian');
    adm.send({ type: 'admin', action: 'set-shop', value: true });
    await a.wait((m) => m.type === 'settings' && m.settings.shopOpen === true);
    a.send({ type: 'shop', action: 'buy', item: 'selendang' });
    const selendang = await a.wait(type('wardrobe'));
    ok(selendang.ok && selendang.balance === 0, 'toko dibuka lagi: Selendang (40) terbeli, saldo habis');

    adm.send({ type: 'admin', action: 'announce', text: 'Kumpul di Pos 3' });
    ok((await b.wait(type('announce'))).text === 'Kumpul di Pos 3', 'pengumuman diterima pemain');

    adm.send({ type: 'admin', action: 'teleport', playerId: pa.id, x: W.spawn.x, y: W.spawn.y });
    ok(Math.round((await a.wait(type('teleport'))).x) === W.spawn.x, 'admin memindahkan pemain');

    b.send({ type: 'chat', text: 'Halo tim!' });
    ok((await a.wait(type('chat'))).entry.text === 'Halo tim!', 'obrolan tersiar');
    adm.send({ type: 'admin', action: 'mute', playerId: pb.id, value: true });
    await b.wait(type('muted'));
    await sleep(1600);
    b.send({ type: 'chat', text: 'tes' });
    ok((await b.wait(type('notice'))).message.includes('dibisukan'), 'pemain yang dibisukan tidak bisa mengobrol');

    a.drain(type('wardrobe'));
    adm.send({ type: 'admin', action: 'reset', playerId: pa.id });
    ok(Boolean(await a.wait(type('reset'))), 'atur ulang progres sampai ke pemain');
    const emptied = await a.wait(type('wardrobe'));
    ok(emptied.wardrobe.owned.length === 0 && emptied.wardrobe.spent === 0 && emptied.wardrobe.wear.leher === 'syal-tumpal', 'atur ulang progres ikut mengosongkan lemari');

    adm.send({ type: 'admin', action: 'kick', playerId: pb.id });
    await b.wait(type('kicked'));
    ok((await api('login', { username: 'TimTempe', password: 'tempe12345' })).status === 403, 'akun yang dikeluarkan tidak bisa masuk lagi');

    adm.send({ type: 'admin', action: 'set-class-code', code: 'XI-IPA-2' });
    await adm.wait(type('admin-ok'));
    ok((await api('status')).needsClassCode === true, 'status memberi tahu kode kelas dibutuhkan');
    ok((await api('register', { username: 'Tamu01', password: 'abcdef1' })).status === 403, 'daftar tanpa kode kelas ditolak');
    ok((await api('register', { username: 'Tamu01', password: 'abcdef1', classCode: 'xi-ipa-2' })).status === 201, 'daftar dengan kode kelas diterima');

    adm.send({ type: 'admin', action: 'export' });
    const exp = await adm.wait(type('admin-export'));
    ok(exp.data.players.length === 3 && exp.data.players.every((p) => !('passHash' in p) && !('sessions' in p)), 'ekspor tanpa kata sandi/sesi');

    adm.send({ type: 'admin', action: 'reset-password', playerId: pa.id });
    const pw = await adm.wait(type('admin-password'));
    await a.wait(type('kicked'));
    ok((await api('login', { username: 'Penjelajah07', password: 'rahasia123' })).status === 401, 'kata sandi lama tidak berlaku setelah diatur ulang');
    const relog = await api('login', { username: 'Penjelajah07', password: pw.password });
    ok(relog.status === 200, 'masuk dengan kata sandi sementara dari guru');
    const c = client(); await c.open();
    c.send({ type: 'join', session: relog.token });
    ok(Boolean(await c.wait(type('welcome'))), 'bergabung lagi setelah atur ulang kata sandi');
    ok(Boolean((await c.wait(type('wardrobe'))).wardrobe.wear), 'lemari busana dikirim saat bergabung');
    ok(Boolean((await c.wait(type('pjbl'))).summary), 'data PjBL dikirim saat bergabung');

    [a, b, c, adm].forEach((x) => x.ws.close());
  } catch (err) {
    console.error('✗ Uji berhenti:', err.message);
    failures += 1;
  } finally {
    // Tunggu server berhenti (ia menyimpan data dan cadangan terakhir) sebelum folder uji dihapus.
    await new Promise((r) => { server.once('exit', r); server.kill(); });
    fs.rmSync(dataDir, { recursive: true, force: true });
    console.log(failures ? `\n${failures} uji gagal` : '\nSemua uji lulus');
    process.exit(failures ? 1 : 0);
  }
})();
