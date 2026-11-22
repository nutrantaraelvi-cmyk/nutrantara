/*
 * Alur aplikasi NUTRANTARA:
 *   Beranda (index.html) → Masuk / Daftar akun → Memuat → Lobi → MAIN → Pilih map → Terjun ke pulau.
 * Tanpa server kelas (hosting statis/berkas lokal) tersedia mode tamu luring.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { createExplorer, createNara, toon, PALETTE } from './characters.js';
import { SUN_DIR, createSkyDome, createCloudSea, cumulusTextures, createCumulus } from './sky.js';
import { createPenjor, createKite, createStupa, createCorn, createTempe, kawungTexture } from './culture.js';

const net = window.NutraNet;
const game = window.NutraGame;
const W3 = window.NutraWorld3D;
const W = window.NUTRANTARA_WORLD;
const MISSIONS = window.NUTRANTARA_MISSIONS || [];
const COLORS = ['#68dce7', '#78f4bd', '#ffd17c', '#ff9f91', '#c58cf0', '#7fa8ff', '#f59e5b', '#f472b6'];
const GUEST_KEY = 'nutrantara-guest-v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let user = null; // { username, color, offline }
let regColor = COLORS[Math.floor(Math.random() * COLORS.length)];

const TIPS = [
  'Energi yang sama belum tentu berarti komposisi zat gizinya sama.',
  'Pencernaan memecah molekul; penyerapan memindahkan hasilnya ke darah.',
  'Klaim “paling sehat” butuh bukti, bukan hanya satu angka.',
  'Tempe, jagung, kelor, dan ubi adalah pangan lokal kaya manfaat.',
  'Saat beberapa faktor berubah bersamaan, hati-hati menyimpulkan sebab.',
  'Kumpulkan kepingan arsip emas di atas blok tempe melayang!',
  'Tekan 1–4 di dunia untuk emote: lambai, sorak, tari, pikir.'
];

// ---------- Fase ----------
function phase(name) {
  document.body.dataset.phase = name;
  ['auth', 'loading', 'lobby'].forEach((p) => { $(`#phase-${p}`).hidden = p !== name; });
  $('.shell').hidden = !['game'].includes(name);
  document.body.classList.toggle('in-world', name === 'game');
  if (name === 'lobby') lobby.start(); else lobby.stop();
}

// ---------- Masuk / daftar ----------
function setTab(which) {
  const login = which === 'login';
  $('#tab-login').setAttribute('aria-selected', String(login));
  $('#tab-register').setAttribute('aria-selected', String(!login));
  $('#form-login').hidden = !login;
  $('#form-register').hidden = login;
  (login ? $('#login-user') : $('#reg-user')).focus();
}
$('#tab-login').addEventListener('click', () => setTab('login'));
$('#tab-register').addEventListener('click', () => setTab('register'));
document.querySelectorAll('.pass-toggle').forEach((b) => b.addEventListener('click', () => {
  const input = document.getElementById(b.dataset.toggle);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
}));

function renderColors() {
  $('#reg-colors').innerHTML = COLORS.map((c) => `<button type="button" class="swatch${c === regColor ? ' on' : ''}" data-color="${c}" style="--c:${c}" aria-label="Warna ${c}" aria-pressed="${c === regColor}"></button>`).join('');
}
$('#reg-colors').addEventListener('click', (e) => { const b = e.target.closest('[data-color]'); if (b) { regColor = b.dataset.color; renderColors(); } });

function authError(form, msg) {
  const el = form.querySelector('.auth-error');
  el.hidden = !msg;
  el.textContent = msg || '';
  if (msg) { form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); }
}

function busy(form, on) { form.querySelectorAll('button, input').forEach((x) => { x.disabled = on; }); form.classList.toggle('busy', on); }

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const username = $('#login-user').value.trim();
  const password = $('#login-pass').value;
  if (!username || !password) return authError(form, 'Isi nama pengguna dan kata sandi.');
  busy(form, true);
  const r = await net.login({ username, password });
  busy(form, false);
  if (!r.token) return authError(form, r.error || 'Gagal masuk.');
  authError(form, '');
  enter({ username: r.user.username, color: r.user.color }, r.token);
});

$('#form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const username = $('#reg-user').value.trim();
  const password = $('#reg-pass').value;
  if (!/^[A-Za-z0-9_.-]{3,20}$/.test(username)) return authError(form, 'Nama pengguna 3–20 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.');
  if (password.length < 6) return authError(form, 'Kata sandi minimal 6 karakter.');
  if (password !== $('#reg-pass2').value) return authError(form, 'Kedua kata sandi tidak sama.');
  busy(form, true);
  const r = await net.register({ username, password, color: regColor, classCode: $('#reg-code').value.trim() });
  busy(form, false);
  if (!r.token) return authError(form, r.error || 'Gagal mendaftar.');
  authError(form, '');
  enter({ username: r.user.username, color: r.user.color, isNew: true }, r.token);
});

$('#form-guest').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#guest-name').value.trim().slice(0, 20);
  if (!name) return;
  const guest = { username: name, color: regColor, offline: true };
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(guest)); } catch { /* abaikan */ }
  enter(guest, null);
});

// ---------- Memuat ----------
async function enter(account, token) {
  user = account;
  phase('loading');
  const fill = $('#load-fill');
  const step = $('#load-step');
  const bar = fill.parentElement;
  let tipIndex = Math.floor(Math.random() * TIPS.length);
  $('#load-tip').textContent = `💡 ${TIPS[tipIndex]}`;
  const tipTimer = setInterval(() => { tipIndex = (tipIndex + 1) % TIPS.length; $('#load-tip').textContent = `💡 ${TIPS[tipIndex]}`; }, 2200);
  const progress = (k, text) => { fill.style.width = `${Math.round(k * 100)}%`; bar.setAttribute('aria-valuenow', String(Math.round(k * 100))); if (text) step.textContent = text; };
  const started = performance.now();

  progress(0.08, 'Menyiapkan akun penjelajah…');
  game.begin(account.username);
  await sleep(250);

  if (token) {
    progress(0.2, 'Menyambung ke server kelas…');
    const ok = await new Promise((resolve) => {
      const done = (v) => { clearTimeout(timer); resolve(v); };
      const timer = setTimeout(() => done('timeout'), 6000);
      net.on('welcome', () => done('ok'));
      net.on('join-error', (err) => done(err));
      net.join(token);
    });
    if (ok !== 'ok') {
      clearInterval(tipTimer);
      if (ok && ok.code === 'auth') { await net.logout(); showAuth(); authError($('#form-login'), 'Sesi berakhir. Silakan masuk lagi.'); return; }
      if (ok && ok.code === 'blocked') { showAuth(); authError($('#form-login'), ok.message); return; }
      game.showToast('Server kelas lambat merespons. Mencoba terus di latar belakang…');
    }
    if (net.me) user.color = net.me.color;
  }

  progress(0.35, 'Membangun Kepulauan NUTRANTARA…');
  await W3.prepare((k) => progress(0.35 + k * 0.5, k < 0.4 ? 'Menumbuhkan pulau melayang…' : k < 0.8 ? 'Menyalakan jembatan cahaya…' : 'Menyiapkan terminal arsip…'));
  progress(0.92, 'Memanggil Nara…');
  const wait = Math.max(0, 1800 - (performance.now() - started));
  await sleep(wait);
  progress(1, 'Siap!');
  await sleep(350);
  clearInterval(tipTimer);
  toLobby(account.isNew);
}

function showAuth() {
  phase('auth');
  setTimeout(() => $('#login-user').focus(), 50);
}

// ---------- Lobi ----------
const lobby = (() => {
  let renderer; let scene; let camera; let hero; let nara; let ring; let clouds = []; let kites = []; let sea = null;
  let running = false;
  let yaw = 0.3;
  let drag = null;
  let idleT = 6;
  const clock = new THREE.Clock();
  const canvas = $('#lobby-canvas');

  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#86d4f7');
    scene.fog = new THREE.Fog('#bfe9fb', 22, 65);
    scene.add(createSkyDome({ radius: 150, horizon: '#bfe9fb' }));
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight('#f0fbff', '#4d8a5e', 1.7));
    const sun = new THREE.DirectionalLight('#fff0d0', 2.2);
    sun.position.copy(SUN_DIR).multiplyScalar(12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    const island = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.5, 32), toon('#62c46f'));
    top.position.y = -0.25; top.receiveShadow = true;
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.4, 0.5, 32), toon('#ecd8a0'));
    sand.position.y = -0.35;
    const cliff = new THREE.Mesh(new THREE.ConeGeometry(3.5, 4.5, 12), toon('#7a5f48'));
    cliff.rotation.x = Math.PI; cliff.position.y = -2.8;
    island.add(top, sand, cliff);
    scene.add(island);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), new THREE.MeshToonMaterial({ map: kawungTexture('#f6e3b8', '#b0743a', 2) }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.01; plaza.receiveShadow = true; scene.add(plaza);
    [[-2.6, -1.4, false], [2.6, -1.4, true]].forEach(([x, z, flip]) => { const p = createPenjor(0.8); if (flip) p.scale.x *= -1; p.position.set(x, 0, z); scene.add(p); });
    const stupa = createStupa(0.4); stupa.position.set(2.1, 0, 1.2); scene.add(stupa);
    const corn = createCorn(0.7); corn.position.set(-1.4, 0.18, 1.6); corn.rotation.z = 1.3; scene.add(corn);
    const tempe = createTempe(0.6); tempe.position.set(-0.8, 0.1, 2.0); scene.add(tempe);
    kites = [['#e2553f', '#f5b72b', -4, 5], ['#1fc3d3', '#ffffff', 4.5, 6], ['#2fa36b', '#f5b72b', 1, 7.5]].map(([a, b, x, y]) => { const k = createKite(a, b); k.scale.setScalar(0.6); k.position.set(x, y, -5); scene.add(k); return k; });
    ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 40), new THREE.MeshBasicMaterial({ color: '#1fc3d3', transparent: true, opacity: 0.7 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
    scene.add(ring);
    hero = createExplorer(user ? user.color : PALETTE.cyan);
    hero.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(hero);
    nara = createNara();
    nara.position.set(-1.9, 0, -0.4);
    nara.scale.setScalar(0.85);
    scene.add(nara);
    sea = createCloudSea({ radius: 110, y: -7, quality: 'high', renderer });
    scene.add(sea);
    const tex = cumulusTextures(3, 'high');
    for (let i = 0; i < 10; i += 1) {
      const c = createCumulus(tex[i % 3], 7 + Math.random() * 7, { opacity: 0.95 });
      c.position.set(-30 + Math.random() * 60, -3 + Math.random() * 9, -28 + Math.random() * 18);
      c.userData.drift = 0.3 + Math.random() * 0.5;
      scene.add(c);
      clouds.push(c);
    }
    canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (drag !== null) { yaw -= (e.clientX - drag) * 0.008; drag = e.clientX; } });
    canvas.addEventListener('pointerup', () => { drag = null; });
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    if (drag === null) yaw += dt * 0.08;
    const wide = w > 900;
    const look = new THREE.Vector3(wide ? 0 : 0, 1.1, 0);
    camera.position.set(Math.sin(yaw) * 7, 2.6, Math.cos(yaw) * 7);
    camera.lookAt(look);
    hero.rotation.y += (Math.atan2(camera.position.x, camera.position.z) - hero.rotation.y) * Math.min(1, dt * 3);
    hero.userData.animate(dt, { speed: 0 });
    nara.userData.animate(dt);
    nara.rotation.y = Math.atan2(camera.position.x - nara.position.x, camera.position.z - nara.position.z) * 0.6;
    ring.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    clouds.forEach((c) => { c.position.x += c.userData.drift * dt; if (c.position.x > 30) c.position.x = -30; });
    if (sea) sea.userData.update(dt);
    kites.forEach((k, i) => { k.position.y += Math.sin(t * 1.3 + i) * 0.004; k.rotation.z = Math.sin(t * 1.1 + i) * 0.3; k.userData.tail.forEach((b, j) => { b.position.x = Math.sin(t * 5 + j + i) * 0.1 * j; }); });
    idleT -= dt;
    if (idleT <= 0) { idleT = 7 + Math.random() * 5; hero.userData.emote(['wave', 'think', 'cheer'][Math.floor(Math.random() * 3)]); }
    renderer.render(scene, camera);
  }

  return {
    start() {
      if (running) return;
      try { if (!renderer) build(); } catch { canvas.hidden = true; return; }
      if (user) hero.userData.setColor(user.color);
      running = true;
      clock.getDelta();
      loop();
    },
    stop() { running = false; },
    emote(name) { if (hero) hero.userData.emote(name); if (nara && name === 'cheer') nara.userData.react('celebrate', 1.4); }
  };
})();

function renderLobby() {
  const st = game.state;
  $('#lobby-name').textContent = user ? user.username : '—';
  $('#lobby-score').textContent = String(game.computeScore());
  $('#lobby-seals').textContent = `${game.sealCount()}/6`;
  let shards = 0;
  try { shards = (JSON.parse(localStorage.getItem(`nutrantara-shards-v1:${(st.alias || '').toLocaleLowerCase('id')}`)) || []).length; } catch { /* abaikan */ }
  $('#lobby-shards').textContent = String(shards);
  $('#lobby-badges').innerHTML = MISSIONS.map((m) => `<span class="${st.posts[m.id].sealed ? 'on' : ''}" title="Pos ${m.id} ${m.title} ${m.titleEm}">${st.posts[m.id].sealed ? '✦' : m.id}</span>`).join('');
  const online = net && net.online;
  $('#lobby-conn').textContent = user && user.offline ? '○ MODE TAMU (LURING)' : online ? '● TERSAMBUNG KE SERVER KELAS' : '◌ MENYAMBUNG…';
  $('#lobby-conn').dataset.on = String(Boolean(online));
  const friends = online ? [...net.players.values()] : [];
  $('#lobby-count').textContent = String(friends.length);
  $('#lobby-friends').innerHTML = friends.length
    ? friends.map((p) => `<li><i style="background:${esc(p.color)}"></i><b>${net.isTeammate(p.id) ? '🤝 ' : ''}${esc(p.alias)}</b><span>${p.zone === 'world' ? (W.isPost(W.islandAt(p.tx ?? p.x, p.ty ?? p.y)) ? `di Pos ${W.islandAt(p.tx ?? p.x, p.ty ?? p.y)}` : 'menjelajah') : 'di lobi'} · ✦${p.seals || 0}</span></li>`).join('')
    : `<li class="empty">${user && user.offline ? 'Main sendiri dalam mode tamu.' : 'Belum ada teman lain yang daring.'}</li>`;
  const ann = online && net.settings.announcement;
  $('#lobby-ann').hidden = !ann;
  if (ann) $('#lobby-ann').innerHTML = `<b>PENGUMUMAN GURU</b> ${esc(ann)}`;
  const next = MISSIONS.find((m) => !st.posts[m.id].sealed);
  $('#lobby-next').innerHTML = next
    ? `<span>POS ${String(next.id).padStart(2, '0')} · ${esc(next.location)}</span><b>${esc(next.title)} ${esc(next.titleEm)}</b><small>${game.isUnlocked(next.id) ? 'Siap — tekan MAIN lalu terjun!' : esc(game.lockMessage(next.id))}</small>`
    : '<b>Ekspedisi selesai ✦</b><small>Semua segel aktif. Bantu temanmu!</small>';
  renderParty();
}

function toLobby(isNew) {
  W3.leave();
  if (window.NutraWorld2D) window.NutraWorld2D.stop();
  if (net) net.sendZone('lobby');
  phase('lobby');
  renderLobby();
  setTimeout(() => $('#lobby-play').focus(), 80);
  if (isNew) game.showToast(`Akun ${user.username} siap! Tekan MAIN untuk memilih map.`);
}

// ---------- Regu mabar (kode undangan) ----------
// Tautan undangan: play.html?regu=KODE → otomatis bergabung setelah masuk ke lobi.
const cleanCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
let pendingInvite = cleanCode(new URLSearchParams(location.search).get('regu')) || null;
let partyIds = null;

function partyMsg(text, warn = false) {
  const el = $('#party-msg');
  el.textContent = text || '';
  el.dataset.warn = String(warn);
}

function memberStatus(m) {
  if (net.me && m.id === net.me.id) return 'kamu';
  const live = net.players.get(m.id);
  if (!live) return '○ luring';
  if (live.zone !== 'world') return '● di lobi';
  const isl = W.islandAt(live.tx ?? live.x, live.ty ?? live.y);
  if (W.isPost(isl)) return `● di Pos ${isl}`;
  const found = W.islands.find((i) => i.id === isl);
  return `● ${found ? found.name : 'di jembatan'}`;
}

function renderParty() {
  const offline = !net || (user && user.offline);
  const online = net && net.online;
  $('#party-create').disabled = !online;
  $('#party-join').querySelectorAll('input,button').forEach((el) => { el.disabled = !online; });
  if (offline) {
    $('#party-none').hidden = false; $('#party-in').hidden = true;
    partyMsg('Regu proyek butuh server kelas. Dalam mode tamu kamu bermain solo dan memegang semua peran.');
    return;
  }
  if (online && pendingInvite) {
    const code = pendingInvite;
    pendingInvite = null;
    try { history.replaceState(null, '', location.pathname); } catch { /* abaikan */ }
    if (!net.party || net.party.code !== code) { net.partyJoin(code); partyMsg(`Bergabung ke regu ${code}…`); }
  }
  const party = online ? net.party : null;
  $('#party-none').hidden = Boolean(party);
  $('#party-in').hidden = !party;
  if (!party) return;
  $('#party-code-text').textContent = party.code;
  const sc = window.NutraTeam ? window.NutraTeam.scenario() : null;
  $('#party-scn').innerHTML = sc ? `<b>${esc(sc.name)}</b> ${esc(sc.text)}` : '';
  $('#party-members').innerHTML = party.members.map((m) => {
    const me = net.me && m.id === net.me.id;
    const live = net.players.get(m.id);
    const canJoin = !me && live && live.zone === 'world';
    return `<li><i style="background:${esc(m.color)}"></i><b>${esc(m.alias)}${m.id === party.leaderId ? ' <span title="Pembuat regu">👑</span>' : ''}</b><span>${esc(memberStatus(m))}</span>${canJoin ? `<button type="button" class="button button-primary party-go" data-friend="${esc(m.id)}">Terjun ke dia ↓</button>` : ''}</li>`;
  }).join('') + (party.members.length < 2 ? '<li class="empty">Belum ada teman. Bagikan kode di atas, atau mulai solo dulu.</li>' : `<li class="empty">${party.members.length}/${party.max} anggota · peran berputar setiap pos</li>`);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* http di jaringan kelas: pakai cara lama */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

async function dropToFriend(friendId) {
  const friend = net.players.get(friendId);
  const res = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    const ok = (msg) => { if (msg.friend === friendId) { clearTimeout(timer); resolve(msg); } };
    net.on('spawned', ok);
    net.on('spawn-denied', ok);
    net.spawnNear(friendId);
  });
  if (!res || res.message) { game.showToast((res && res.message) || 'Server tidak merespons. Coba lagi.'); return; }
  phase('game');
  game.goTo('world');
  const in3d = W3.dropTo(res.island, res.x, res.y);
  if (!in3d && window.NutraWorld2D) { window.NutraWorld2D.placeAt(res.x, res.y); window.NutraWorld2D.start(); }
  const name = friend ? friend.alias : 'temanmu';
  game.showToast(res.near ? `Terjun ke dekat ${name}! 🤝` : `Pulau ${name} belum terbuka untukmu, jadi kamu mendarat di dekat sana.`);
}

$('#party-create').addEventListener('click', () => { net.partyCreate(); partyMsg('Membuat regu…'); });
$('#party-join').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = cleanCode($('#party-code').value);
  if (code.length !== 6) { partyMsg('Kode regu terdiri dari 6 huruf/angka.', true); $('#party-code').focus(); return; }
  net.partyJoin(code);
  partyMsg(`Bergabung ke regu ${code}…`);
});
$('#party-copy').addEventListener('click', async () => { const ok = await copyText(net.party.code); partyMsg(ok ? `Kode ${net.party.code} disalin. Kirim ke temanmu!` : `Salin manual: ${net.party.code}`, !ok); });
$('#party-link').addEventListener('click', async () => {
  const link = `${location.origin}${location.pathname}?regu=${net.party.code}`;
  const ok = await copyText(link);
  partyMsg(ok ? 'Tautan undangan disalin. Teman yang membukanya langsung bergabung.' : `Salin manual: ${link}`, !ok);
});
$('#party-leave').addEventListener('click', () => { net.partyLeave(); partyMsg('Kamu keluar dari regu.'); });
$('#party-members').addEventListener('click', (e) => { const b = e.target.closest('[data-friend]'); if (b) dropToFriend(b.dataset.friend); });

if (net) {
  net.on('party', (party) => {
    const ids = party ? party.members.map((m) => m.id) : null;
    if (party && partyIds && party.code === partyIds.code) {
      party.members.filter((m) => !partyIds.ids.includes(m.id)).forEach((m) => game.showToast(`🤝 ${m.alias} bergabung ke regumu!`));
    }
    partyIds = party ? { code: party.code, ids } : null;
    if (party) partyMsg('');
    if (document.body.dataset.phase === 'lobby') renderParty();
  });
  net.on('party-error', (message) => { partyMsg(message, true); game.showToast(message); });
}

document.querySelectorAll('[data-lemote]').forEach((b) => b.addEventListener('click', () => lobby.emote(b.dataset.lemote)));
$('#lobby-play').addEventListener('click', toMaps);
document.querySelectorAll('.lobby-btn[data-go]').forEach((b) => b.addEventListener('click', () => { phase('game'); game.goTo(b.dataset.go); }));
$('#nav-lobby').addEventListener('click', () => toLobby(false));
$('#lobby-logout').addEventListener('click', async () => {
  if (!window.confirm('Keluar dari akun ini?')) return;
  if (user && user.offline) { try { localStorage.removeItem(GUEST_KEY); } catch { /* abaikan */ } }
  else await net.logout();
  game.end();
  location.replace('play.html');
});

if (net) {
  ['players', 'settings', 'leaderboard', 'status', 'welcome'].forEach((ev) => net.on(ev, () => { if (document.body.dataset.phase === 'lobby') renderLobby(); }));
  setInterval(() => { if (document.body.dataset.phase === 'lobby') renderLobby(); }, 3000);
  net.on('reset', () => { if (document.body.dataset.phase === 'game') toLobby(false); });
}

// ---------- Pilih map & terjun ----------
function toMaps() {
  phase('game');
  game.goTo('world');
  W3.showOverview({ onBack: () => toLobby(false), onDrop: dropTo });
}

async function dropTo(id) {
  let px; let py;
  if (net && net.online) {
    const res = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 4000);
      const ok = (msg) => { if (msg.island === id) { clearTimeout(timer); resolve(msg); } };
      net.on('spawned', ok);
      net.on('spawn-denied', ok);
      net.spawn(id);
    });
    if (!res || res.type === 'spawn-denied' || res.message) { game.showToast((res && res.message) || 'Server tidak merespons. Coba lagi.'); return; }
    px = res.x; py = res.y;
  } else {
    const sealed = MISSIONS.filter((m) => game.state.posts[m.id].sealed).map((m) => m.id);
    if (!W.allowedIslands(sealed, null).has(id)) { game.showToast(game.lockMessage(id)); return; }
    const st = W.stations.find((s) => s.id === id);
    const isl = W.islands.find((i) => i.id === id);
    // Pos: di depan portal; pulau jelajah: di tengah pulau; alun-alun: titik kumpul.
    px = st ? st.x : id === 0 ? W.spawn.x : isl.cx; py = st ? st.y + 20 : id === 0 ? W.spawn.y : isl.cy + isl.ry * 0.62;
  }
  const in3d = W3.dropTo(id, px, py);
  if (!in3d && window.NutraWorld2D) { window.NutraWorld2D.placeAt(px, py); window.NutraWorld2D.start(); }
}

// ---------- Mulai ----------
(async function boot() {
  renderColors();
  const status = net ? await net.serverStatus() : null;
  if (!status) {
    $('.auth-tabs').hidden = true;
    $('#form-login').hidden = true;
    $('#form-register').hidden = true;
    $('#auth-offline').hidden = false;
    let guest = null;
    try { guest = JSON.parse(localStorage.getItem(GUEST_KEY)); } catch { /* abaikan */ }
    if (guest && guest.username) { enter(guest, null); return; }
    phase('auth');
    $('#guest-name').focus();
    return;
  }
  $('#reg-code-wrap').hidden = !status.needsClassCode;
  const session = await net.resume();
  if (session && session.user) { enter({ username: session.user.username, color: session.user.color }, session.token); return; }
  const want = new URLSearchParams(location.search).get('mode');
  showAuth();
  if (want === 'daftar') setTab('register');
})();
