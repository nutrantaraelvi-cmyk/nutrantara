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
const W = loadBrowser('world-data.js').NUTRANTARA_WORLD;

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
    const play = await fetch(`http://localhost:${PORT}/play`).then((r) => r.text());
    ok(play.includes('world3d.js') && play.includes('app.js'), 'halaman game disajikan di /play');
    const three = await fetch(`http://localhost:${PORT}/vendor/three/three.module.min.js`);
    ok(three.ok && three.headers.get('cache-control').includes('max-age'), 'Three.js lokal disajikan dengan cache');
    ok((await fetch(`http://localhost:${PORT}/server.js`)).status === 404, 'berkas server tidak dapat diunduh');

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
    b.send({ type: 'spawn', to: wa.you.id });
    const nearA = await b.wait((m) => m.type === 'spawned' && m.friend === wa.you.id);
    ok(Number.isFinite(nearA.x) && W.islandAt(nearA.x, nearA.y) === nearA.island || nearA.island === 0, 'terjun ke dekat teman satu regu');
    b.send({ type: 'party', action: 'leave' });
    ok((await b.wait((m) => m.type === 'party' && m.party === null)).party === null && (await a.wait((m) => m.type === 'party' && m.party && m.party.members.length === 1)), 'keluar dari regu');
    b.send({ type: 'spawn', to: wa.you.id });
    ok(/bukan anggota/.test((await b.wait((m) => m.type === 'spawn-denied' && m.friend === wa.you.id)).message), 'tidak bisa terjun ke pemain di luar regu');

    // ---------- Progres ----------
    a.send({ type: 'progress', state: fakeState() });
    const board = await b.wait((m) => m.type === 'leaderboard' && m.leaderboard.some((r) => r.alias === 'Penjelajah07' && r.score === 80));
    ok(Boolean(board), 'progres sah Pos 1 dihitung server = 80 poin');
    a.send({ type: 'spawn', island: 2 });
    ok((await a.wait(type('spawned'))).island === 2, 'segel Pos 1 membuka Pulau Pos 2');

    // Jawaban salah tetap sah (0 poin) dan pos boleh disegel.
    const wrongState = fakeState();
    wrongState.posts[1].challenges = [{ complete: true, attempts: 1, response: 'salah-total', correct: true }, { complete: true, attempts: 1, response: ['x'], correct: true }];
    b.send({ type: 'progress', state: wrongState });
    const wb2 = await b.wait((m) => m.type === 'leaderboard' && m.leaderboard.some((r) => r.alias === 'TimTempe' && r.seals === 1));
    ok(wb2.leaderboard.find((r) => r.alias === 'TimTempe').score === 20, 'jawaban salah = 0 poin, segel tetap sah (klaim "benar" dari klien diabaikan)');

    const forged = fakeState({ 2: { started: true, sealed: true, reason: 'aaaaaaaaaaaaaaaaaaaaaaaaa', challenges: [{ complete: false, attempts: 0 }, { complete: false, attempts: 0 }] } });
    b.send({ type: 'progress', state: forged });
    const sync = await b.wait(type('progress-sync'));
    ok(sync.progress.posts[2].sealed === false, 'segel tanpa menjawab semua tantangan dibatalkan server');

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

    adm.send({ type: 'admin', action: 'reset', playerId: pa.id });
    ok(Boolean(await a.wait(type('reset'))), 'atur ulang progres sampai ke pemain');

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

    [a, b, c, adm].forEach((x) => x.ws.close());
  } catch (err) {
    console.error('✗ Uji berhenti:', err.message);
    failures += 1;
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    console.log(failures ? `\n${failures} uji gagal` : '\nSemua uji lulus');
    process.exit(failures ? 1 : 0);
  }
})();
