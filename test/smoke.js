'use strict';
/* Uji asap server kelas: dua pemain + admin. Jalankan: npm test */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const WebSocket = require('ws');

const PORT = 3999;
const PIN = '246810';
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrantara-test-'));
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: { ...process.env, PORT: String(PORT), NUTRANTARA_ADMIN_PIN: PIN, NUTRANTARA_DATA_DIR: dataDir },
  stdio: ['ignore', 'pipe', 'inherit']
});

let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? '✓' : '✗'} ${label}`); if (!cond) failures += 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  const inbox = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    inbox.push(msg);
    waiters.slice().forEach((w) => { if (w.pred(msg)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); } });
  });
  const api = {
    ws, inbox,
    send: (m) => ws.send(JSON.stringify(m)),
    wait: (pred, ms = 3000) => new Promise((resolve, reject) => {
      const found = inbox.find(pred);
      if (found) { inbox.splice(inbox.indexOf(found), 1); return resolve(found); }
      const w = { pred, resolve };
      waiters.push(w);
      setTimeout(() => { if (waiters.includes(w)) { waiters.splice(waiters.indexOf(w), 1); reject(new Error('timeout')); } }, ms);
    }),
    open: () => new Promise((r) => ws.once('open', r))
  };
  return api;
}

const type = (t) => (m) => m.type === t;

function fakeState(overrides) {
  const missions = (() => { const s = { window: {} }; require('vm').runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'missions.js'), 'utf8'), s); return s.window.NUTRANTARA_MISSIONS; })();
  const m1 = missions[0];
  const correct = m1.challenges.map((c) => c.correct);
  return {
    schemaVersion: 2, alias: 'x', activePos: 1, updatedAt: new Date().toISOString(),
    posts: { 1: { started: true, sealed: true, reason: 'Energi sama tetapi protein dan serat berbeda.', challenges: correct.map((r) => ({ complete: true, attempts: 1, response: r, log: [] })) }, ...overrides }
  };
}

(async () => {
  await new Promise((r) => server.stdout.on('data', (d) => { if (String(d).includes('PIN')) r(); }));
  try {
    const html = await fetch(`http://localhost:${PORT}/`).then((r) => r.text());
    ok(html.includes('hero-canvas'), 'landing page disajikan di /');
    const play = await fetch(`http://localhost:${PORT}/play`).then((r) => r.text());
    ok(play.includes('world-canvas') && play.includes('world3d.js'), 'halaman game disajikan di /play');
    const three = await fetch(`http://localhost:${PORT}/vendor/three/three.module.min.js`);
    ok(three.ok && three.headers.get('cache-control').includes('max-age'), 'Three.js lokal disajikan dengan cache');
    const notFound = await fetch(`http://localhost:${PORT}/server.js`);
    ok(notFound.status === 404, 'berkas server tidak dapat diunduh');

    const a = client(); await a.open();
    a.send({ type: 'join', alias: 'Penjelajah 07' });
    const wa = await a.wait(type('welcome'));
    ok(wa.token && wa.you.alias === 'Penjelajah 07', 'pemain A bergabung dan menerima token');

    const b = client(); await b.open();
    b.send({ type: 'join', alias: 'penjelajah 07' });
    const eb = await b.wait(type('error'));
    ok(eb.code === 'alias-taken', 'alias yang sama ditolak untuk perangkat lain');
    b.send({ type: 'join', alias: 'Tim Tempe' });
    const wb = await b.wait(type('welcome'));
    ok(wb.players.some((p) => p.alias === 'Penjelajah 07'), 'pemain B melihat pemain A');

    a.send({ type: 'move', x: wa.you.x + 30, y: wa.you.y });
    const pos = await b.wait((m) => m.type === 'positions' && m.list.some(([id]) => id === wa.you.id));
    ok(pos.list.find(([id]) => id === wa.you.id)[1] > wa.you.x + 20, 'gerak A tersiar ke B');

    a.send({ type: 'move', x: 5000, y: 5000 });
    await sleep(150);

    a.send({ type: 'progress', state: fakeState() });
    const board = await b.wait((m) => m.type === 'leaderboard' && m.leaderboard.some((r) => r.alias === 'Penjelajah 07' && r.score === 80));
    ok(Boolean(board), 'progres sah Pos 1 dihitung server = 80 poin');

    const forged = fakeState({ 2: { started: true, sealed: true, reason: 'aaaaaaaaaaaaaaaaaaaaaaaaa', challenges: [{ complete: true, attempts: 1, response: 'salah' }, { complete: true, attempts: 1, response: ['salah'] }] } });
    b.send({ type: 'progress', state: forged });
    const sync = await b.wait(type('progress-sync'));
    ok(sync.progress.posts[2].sealed === false, 'progres palsu dikoreksi server');

    const adm = client(); await adm.open();
    adm.send({ type: 'admin-auth', pin: '000000' });
    ok((await adm.wait(type('admin-error'))).message.includes('PIN'), 'PIN salah ditolak');
    adm.send({ type: 'admin', action: 'set-paused', value: true });
    await sleep(100);
    adm.send({ type: 'admin-auth', pin: PIN });
    await adm.wait(type('admin-welcome'));
    const snap = await adm.wait(type('admin-state'));
    ok(snap.settings.paused === false, 'perintah admin sebelum login diabaikan');
    const pa = snap.players.find((p) => p.alias === 'Penjelajah 07');
    const pb = snap.players.find((p) => p.alias === 'Tim Tempe');
    ok(pa && pa.score === 80 && pa.online, 'admin melihat skor dan status daring');
    ok(pb.flags.length > 0, 'admin melihat catatan validasi untuk progres palsu');

    adm.send({ type: 'admin', action: 'set-post', pos: 2, open: false });
    const st = await a.wait((m) => m.type === 'settings' && !m.settings.openPosts.includes(2));
    ok(Boolean(st), 'menutup Pos 2 tersiar ke pemain');

    adm.send({ type: 'admin', action: 'set-paused', value: true });
    ok((await a.wait((m) => m.type === 'settings' && m.settings.paused)).settings.paused, 'jeda tersiar');
    a.send({ type: 'move', x: 300, y: 300 });
    adm.send({ type: 'admin', action: 'set-paused', value: false });
    await a.wait((m) => m.type === 'settings' && !m.settings.paused);

    adm.send({ type: 'admin', action: 'announce', text: 'Kumpul di Pos 3' });
    ok((await b.wait(type('announce'))).text === 'Kumpul di Pos 3', 'pengumuman diterima pemain');

    adm.send({ type: 'admin', action: 'teleport', playerId: pa.id, x: 470, y: 330 });
    const tp = await a.wait(type('teleport'));
    ok(Math.round(tp.x) === 470, 'admin memindahkan pemain');

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
    const b2 = client(); await b2.open();
    b2.send({ type: 'join', alias: 'Tim Tempe', token: wb.token });
    ok((await b2.wait(type('error'))).code === 'blocked', 'pemain yang dikeluarkan tidak bisa masuk lagi');

    adm.send({ type: 'admin', action: 'export' });
    const exp = await adm.wait(type('admin-export'));
    ok(exp.data.players.length === 2 && !('tokenHash' in exp.data.players[0]), 'ekspor tanpa hash token');

    // Lanjut di perangkat lain setelah alias dilepas.
    adm.send({ type: 'admin', action: 'release', playerId: pa.id });
    await adm.wait(type('admin-ok'));
    const c = client(); await c.open();
    c.send({ type: 'join', alias: 'Penjelajah 07' });
    ok(Boolean((await c.wait(type('welcome'))).token), 'alias yang dilepas dapat diklaim perangkat baru');

    [a, b2, c, adm].forEach((x) => x.ws.close());
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
