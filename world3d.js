/*
 * Dunia 3D NUTRANTARA — Kepulauan melayang di atas awan.
 * Alun-alun Nusantara di tengah, enam pulau pos dan enam pulau jelajah bebas, dihubungkan jembatan cahaya.
 * Mode: 'overview' (pilih map) → 'drop' (terjun dengan daun pisang) → 'play' (jelajah & misi di dalam dunia).
 * Koordinat server tetap 2D (world-data.js, 2400×1500); di sini dipetakan ke ruang 3D (1 px = 0,1 satuan).
 */
import * as THREE from './vendor/three/three.module.min.js';
import { createExplorer, createNara, createLabel, createBubble, toon, PALETTE } from './characters.js';
import { createFx } from './fx.js';
import { createQuests } from './quest.js';
import { SUN_DIR, createSkyDome, createCloudSea, cumulusTextures, createCumulus } from './sky.js';
import { createCandiBentar, createMeru, createPenjor, createKite, createPinisi, createStupa, createRumahGadang, createGunungan, createGong, createOndelOndel, createCorn, createTempe, createPapaya, kawungTexture } from './culture.js';

const W = window.NUTRANTARA_WORLD;
const game = window.NutraGame;
const net = window.NutraNet;
const MISSIONS = window.NUTRANTARA_MISSIONS || [];
const GFX_KEY = 'nutrantara-gfx';
const S = 0.1;
const CX = W.width / 2;
const CY = W.height / 2;
const toX = (px) => (px - CX) * S;
const toZ = (py) => (py - CY) * S;
const toPx = (x) => x / S + CX;
const toPy = (z) => z / S + CY;
const SPEED = 7.5;
const GRAVITY = 26;
const JUMP = 9.6;
const ISLAND_COLORS = { 0: '#78f4bd', 1: '#ff9f91', 2: '#ffd17c', 3: '#f59e5b', 4: '#68dce7', 5: '#c58cf0', 6: '#ffd17c', 7: '#9bdc5a', 8: '#4fb56a', 9: '#5ec8e8', 10: '#f5c66b', 11: '#f472b6', 12: '#e2853f' };
const SPRINT = 1.65; // Shift = berlari
const islandOf = (id) => W.islands.find((x) => x.id === id);
const placeName = (id) => (W.isPost(id) ? `POS ${id} · ${frame(id).name}` : id >= 0 ? islandOf(id).name.toUpperCase() : 'JEMBATAN CAHAYA');

function hasWebGL() {
  try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const defaultGfx = () => (matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 4) < 4 ? 'low' : 'high');
let gfx = localStorage.getItem(GFX_KEY) || defaultGfx();
if (!hasWebGL()) gfx = '2d';

const frame = (id) => {
  const i = W.islands.find((x) => x.id === id);
  return i ? { id, x: toX(i.cx), z: toZ(i.cy), rx: i.rx * S, rz: i.ry * S, name: i.name } : null;
};
const missionOf = (id) => MISSIONS.find((m) => m.id === id);
const sealedIds = () => MISSIONS.filter((m) => game.state.posts[m.id] && game.state.posts[m.id].sealed).map((m) => m.id);
const allowedSet = () => W.allowedIslands(sealedIds(), net && net.online ? net.settings.openPosts : null);
const islandAt3 = (x, z) => W.islandAt(toPx(x), toPy(z));

// ---------- DOM ----------
const stage = document.querySelector('.world-stage');
const canvas2d = document.getElementById('world-canvas');
const promptEl = document.getElementById('world-prompt');
const actionBtn = document.getElementById('world-action');

const wrap = document.createElement('div');
wrap.className = 'world3d';
wrap.innerHTML = `
  <div class="w3-hud">
    <div class="w3-hud-left">
      <div class="w3-chip w3-place" id="w3-place">—</div>
      <div class="w3-chip" title="Kepingan arsip yang sudah dikumpulkan"><span aria-hidden="true">✦</span> <b id="w3-shards">0</b>/<span id="w3-shards-total">0</span> <small>KEPINGAN</small></div>
    </div>
    <div class="w3-chip w3-goal" id="w3-goal" aria-live="polite"></div>
  </div>
  <button type="button" class="w3-minimap" id="w3-minimap" title="Peta mini (M untuk memperbesar)" aria-label="Peta mini kepulauan. Tekan untuk memperbesar atau memperkecil."><canvas width="240" height="150"></canvas></button>
  <div class="w3-emotes" role="group" aria-label="Emote">
    <button type="button" data-emote="wave" title="Melambai (1)">👋</button>
    <button type="button" data-emote="cheer" title="Bersorak (2)">🎉</button>
    <button type="button" data-emote="dance" title="Menari (3)">💃</button>
    <button type="button" data-emote="think" title="Berpikir (4)">🤔</button>
  </div>
  <div class="w3-touch" aria-hidden="true">
    <div class="w3-stick" id="w3-stick"><i></i></div>
    <div class="w3-buttons"><button type="button" id="w3-jump" tabindex="-1">LOMPAT</button><button type="button" id="w3-act" tabindex="-1">AKSI</button></div>
  </div>
  <div class="w3-banner" id="w3-banner" aria-live="polite"></div>
  <div class="w3-drophint" id="w3-drophint" hidden>Tekan <kbd>Spasi</kbd> untuk membuka daun pisang</div>
  <div class="w3-holo-layer" id="w3-holo" hidden></div>
  <div class="w3-loading" id="w3-loading">Memuat kepulauan…</div>`;
stage.insertBefore(wrap, canvas2d);

// Panel pilih map (dipakai juga oleh mode 2D)
const ov = document.createElement('div');
ov.className = 'w-overview';
ov.hidden = true;
ov.innerHTML = `
  <div class="ov-top"><div><p class="ov-kicker">PILIH MAP</p><h2>Kepulauan <em>NUTRANTARA</em></h2></div><button type="button" class="button button-secondary" id="ov-back">← Lobi</button></div>
  <ol class="ov-list" id="ov-list"></ol>
  <aside class="ov-info" id="ov-info" aria-live="polite"></aside>`;
stage.append(ov);

const gfxBar = document.createElement('div');
gfxBar.className = 'w3-gfx';
gfxBar.setAttribute('role', 'group');
gfxBar.setAttribute('aria-label', 'Mode grafis');
gfxBar.innerHTML = '<span>GRAFIS</span><button type="button" data-gfx="high">3D Tinggi</button><button type="button" data-gfx="low">3D Ringan</button><button type="button" data-gfx="2d">2D</button>';
const keysHelp = document.querySelector('.world-keys');
keysHelp.before(gfxBar);

function renderGfxBar() {
  gfxBar.querySelectorAll('[data-gfx]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.gfx === gfx));
    if (b.dataset.gfx !== '2d') b.disabled = !hasWebGL();
  });
  keysHelp.innerHTML = gfx === '2d'
    ? '<kbd>W A S D</kbd> berjalan · <kbd>E</kbd> berinteraksi · klik/sentuh untuk berjalan · Papan ketik saja? Gunakan <button type="button" class="link-button" data-screen="map">Peta</button>.'
    : '<kbd>W A S D</kbd> berjalan · <kbd>← →</kbd> memutar arah hadap · <kbd>↑ ↓</kbd> maju/mundur · <kbd>R</kbd>/<kbd>F</kbd> menoleh atas/bawah · kursor = arah hadap, klik tanah = jalan ke sana · <kbd>Shift</kbd> berlari · <kbd>Spasi</kbd> lompat · <kbd>E</kbd> interaksi · <kbd>M</kbd> peta mini besar · <kbd>1–4</kbd> emote · seret = putar kamera · gulir = zoom · <button type="button" class="link-button" data-screen="map">Peta</button>';
}

// ---------- Three.js ----------
let renderer = null;
let scene;
let camera;
let sun;
let fx;
let quests;
const clock = new THREE.Clock();
let running = false;
let built = false;
let mode = 'off'; // off | overview | drop | play
let landed = false;

const cam = { yaw: 0, pitch: 0.5, dist: 11 };
const self = { x: 0, z: 0, h: 0, vy: 0, grounded: true, face: Math.PI, speed: 0, obj: null, island: -1 };
const others = new Map();
const platforms = [];
const shards = [];
const bubbles = [];
const animated = [];
const islandTops = [];
const domes = new Map();
const bridges3d = [];
const waterfalls = [];
let cloudSea;
let nara;
let arrow;
let selectRing;
let nearby = null;
let lastSent = 0;
let lastKey = '';
let statusTimer = 0;
let allowedKey = '';
let panelOpen = false;
const visited = new Set();

function initRenderer() {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: gfx === 'high', powerPreference: 'high-performance' });
  } catch { renderer = null; return false; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'w3-canvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Kepulauan NUTRANTARA 3D. W A S D untuk berjalan, spasi melompat, E berinteraksi, 1 sampai 4 untuk emote.');
  renderer.domElement.setAttribute('aria-describedby', 'world-prompt');
  wrap.prepend(renderer.domElement);
  scene = new THREE.Scene();
  const sky = new THREE.Color('#86d4f7');
  scene.background = sky;
  scene.fog = new THREE.Fog('#bfe9fb', 110, 330);
  scene.add(createSkyDome({ radius: 650, horizon: '#bfe9fb' }));
  camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 800);
  scene.add(new THREE.HemisphereLight('#fffaf0', '#5aa86a', 1.9));
  sun = new THREE.DirectionalLight('#ffe9b8', 2.5);
  sun.position.copy(SUN_DIR).multiplyScalar(50);
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  fx = createFx(scene);
  bindInput(renderer.domElement);
  return true;
}

function applyQuality() {
  if (!renderer) return;
  const high = gfx === 'high';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1));
  renderer.shadowMap.enabled = high;
  sun.castShadow = high;
  scene.traverse((o) => { if (o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; });
}

// ---------- Pembangun ----------
const rand = (() => { let s = 20261122; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })();
function add(obj, x = 0, y = 0, z = 0, parent = scene) {
  obj.position.set(x, y, z);
  parent.add(obj);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c));
const cyl = (rt, rb, h, c, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), toon(c));
const sph = (r, c, seg = 10) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), toon(c));

function waterfallTexture() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 32, 0);
  grad.addColorStop(0, '#bfefff'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, '#bfefff');
  g.fillStyle = grad; g.fillRect(0, 0, 32, 128);
  g.fillStyle = 'rgba(120,200,230,.55)';
  for (let i = 0; i < 26; i += 1) g.fillRect(Math.random() * 30, Math.random() * 128, 2, 10 + Math.random() * 22);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 2);
  return t;
}

function buildIsland(isl) {
  const f = frame(isl.id);
  const g = new THREE.Group();
  const sand = cyl(1, 0.97, 0.5, '#ecd8a0', 48); sand.scale.set(f.rx + 0.6, 1, f.rz + 0.6);
  add(sand, 0, -0.32, 0, g);
  const top = cyl(1, 1, 0.5, isl.id === 0 ? '#74d46f' : isl.id === 10 ? '#ecd79a' : '#68cf67', 48); top.scale.set(f.rx, 1, f.rz);
  add(top, 0, -0.25, 0, g);
  top.userData.islandId = isl.id;
  islandTops.push(top);
  // Tebing berlapis
  const layers = [[1.02, 0.82, 2.4, '#8b6b4e'], [0.82, 0.5, 2.8, '#735a45'], [0.5, 0.12, 3.6, '#5e4a3b']];
  let y = -0.57;
  layers.forEach(([rt, rb, h, c]) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), toon(c));
    l.scale.set(f.rx + 0.6, 1, f.rz + 0.6);
    y -= h / 2;
    add(l, 0, y, 0, g);
    y -= h / 2;
  });
  for (let i = 0; i < 10; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rand() * 0.7, 0), toon(rand() < 0.5 ? '#7d6a5a' : '#94857a')), Math.cos(a) * (f.rx + 0.4), -0.9 - rand() * 2, Math.sin(a) * (f.rz + 0.4), g);
    r.rotation.set(rand(), rand(), rand());
  }
  // Akar & sulur menggantung
  for (let i = 0; i < 8; i += 1) {
    const a = rand() * Math.PI * 2;
    const len = 1 + rand() * 2.5;
    add(cyl(0.05, 0.02, len, '#3f8a4c', 4), Math.cos(a) * (f.rx + 0.5), -0.6 - len / 2, Math.sin(a) * (f.rz + 0.5), g);
  }
  // Air terjun di beberapa pulau
  if ([0, 1, 3, 5, 6, 7, 8, 9, 11].includes(isl.id)) {
    const a = isl.id === 0 ? 1.9 : 1.2 + rand() * 0.7;
    const wx = Math.cos(a) * (f.rx + 0.62); const wz = Math.sin(a) * (f.rz + 0.62);
    const tex = waterfallTexture();
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 10), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    fall.position.set(wx, -5, wz);
    fall.lookAt(wx * 3, -5, wz * 3);
    fall.castShadow = false;
    g.add(fall);
    waterfalls.push(tex);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: '#8fdcef' }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(wx * 0.92, 0.02, wz * 0.92);
    g.add(pool);
  }
  g.position.set(f.x, 0, f.z);
  scene.add(g);

  // Kubah kunci (hanya pulau pos)
  if (W.isPost(isl.id)) {
    const dome = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9fd8e0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    shell.scale.set(f.rx + 0.4, Math.min(f.rx, f.rz) * 1.1, f.rz + 0.4);
    const wire = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8fbff', wireframe: true, transparent: true, opacity: 0.25 }));
    wire.scale.copy(shell.scale);
    const lock = createLabel(`🔒 POS ${isl.id} TERKUNCI`, { color: PALETTE.gold, size: 30, scale: 0.014 });
    lock.position.y = shell.scale.y + 1;
    dome.add(shell, wire, lock);
    dome.position.set(f.x, 0, f.z);
    dome.userData = { shell, wire, lock, fade: 0 };
    scene.add(dome);
    domes.set(isl.id, dome);
  }
  // Nama pulau
  const m = missionOf(isl.id);
  const name = createLabel(m ? `POS ${isl.id} · ${m.title} ${m.titleEm}` : isl.kind === 'wild' ? `◆ ${isl.name.toUpperCase()}` : isl.name.toUpperCase(), { color: ISLAND_COLORS[isl.id], size: 30, scale: 0.013 });
  name.position.set(f.x, isl.id === 0 ? 7 : 8.5, f.z - f.rz * 0.45);
  scene.add(name);
}

// Pijakan & kepingan untuk penanda pulau jelajah (koordinat lokal pulau → dunia).
const wildShards = [];
function plat(f, x, z, hw, hd, top) { platforms.push({ x: f.x + x, z: f.z + z, hw, hd, top }); }
function wildShard(f, x, y, z) { wildShards.push([f.x + x, y, f.z + z, f.id]); }

// Penanda khas tiap pulau (mengikuti konsep peta)
const LANDMARKS = {
  0(g) { // Alun-alun: gapura, sawah, kolam, rumah Nara
    const gate = createCandiBentar(1.25);
    const sign = createLabel('ALUN-ALUN NUSANTARA', { color: '#7a3f1c', bg: 'rgba(255,244,220,.92)', size: 28, scale: 0.0095 });
    sign.position.set(0, 4.6, 0.4); gate.add(sign);
    add(gate, 0, 0, 7.5, g);
    [-3.4, 3.4].forEach((x) => { const p = createPenjor(0.9); if (x > 0) p.scale.x *= -1; add(p, x, 0, 8.2, g); });
    add(createMeru(9, 1.2), 16, 0, -3.5, g);
    add(createMeru(5, 0.8), 18.5, 0, 1.5, g);
    const gong = createGong(0.9); add(gong, 4.5, 0, -8.5, g); gong.userData.disc.userData.gong = true;
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), new THREE.MeshToonMaterial({ map: kawungTexture('#f6e3b8', '#b0743a', 3) }));
    plaza.rotation.x = -Math.PI / 2; plaza.receiveShadow = true;
    add(plaza, toX(W.nara.x) - toX(W.island.cx), 0.015, toZ(W.nara.y) - toZ(W.island.cy), g);
    [[-6, 3.5], [6.5, 4]].forEach(([x, z]) => add(createStupa(0.7), x, 0, z, g));
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 4; c += 1) {
      const t = new THREE.Group();
      add(box(2.1, 0.2 + r * 0.25, 1.6, '#6b8f3a'), 0, (0.2 + r * 0.25) / 2, 0, t);
      const water = box(1.8, 0.02, 1.3, '#7fd3d6'); add(water, 0, 0.21 + r * 0.25, 0, t);
      for (let k = 0; k < 6; k += 1) add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 4), toon('#9bdc5a')), -0.6 + (k % 3) * 0.6, 0.45 + r * 0.25, -0.35 + Math.floor(k / 3) * 0.7, t);
      add(t, -14 + c * 2.2, 0, -5 - r * 1.8, g);
    }
    const pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), toon('#7fd3e6')); pond.rotation.x = -Math.PI / 2; pond.scale.y = 0.7;
    add(pond, 11, 0.02, 2, g);
    const pad = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 32), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.6 }));
    pad.rotation.x = -Math.PI / 2; add(pad, toX(W.nara.x) - toX(W.island.cx), 0.03, toZ(W.nara.y) - toZ(W.island.cy), g);
  },
  1(g) { // Kantin sekolah modern dengan portal lengkung bersulur, jagung, tempe, pepaya
    add(createTempe(0.8), -1.8, 0.92, 2.7, g); add(createPapaya(0.9), -1.3, 0.88, 3.0, g); add(createCorn(0.9), 1.4, 1.05, 2.8, g).rotation.z = 1.2;
    [-2.8, 2.8].forEach((x) => { const p = createPenjor(0.75); if (x > 0) p.scale.x *= -1; add(p, x, 0, 3.6, g); });
    add(box(6, 2.6, 2.6, '#f6ead2'), 0, 1.3, 0, g);
    add(box(6.1, 0.35, 2.7, '#f08a3c'), 0, 2.2, 0, g);
    add(box(6.3, 0.2, 2.9, '#5a6d6b'), 0, 2.7, 0, g);
    for (let i = 0; i < 5; i += 1) add(box(0.85, 0.9, 0.05, '#1d4d55'), -2.4 + i * 1.2, 1.15, 1.31, g).material = toon('#2f7f8c', { emissive: '#3ad0e0', emissiveIntensity: 0.25 });
    for (let i = 0; i < 4; i += 1) add(sph(0.35, '#3f9a5a', 7), -2.2 + i * 1.45, 3.05, -0.4, g);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.18, 10, 28, Math.PI), toon(PALETTE.gold, { emissive: '#c98a1a', emissiveIntensity: 0.35 }));
    add(arch, 3.9, 0.1, 0.6, g).rotation.y = -0.4;
    for (let i = 0; i < 8; i += 1) add(sph(0.16, '#4caf6e', 6), 3.9 + Math.cos((i / 7) * Math.PI) * 1.25 * Math.cos(0.4), 0.1 + Math.sin((i / 7) * Math.PI) * 1.25, 0.6 - Math.cos((i / 7) * Math.PI) * 0.5, g);
    [[-1.6, 2.8], [1.6, 2.8]].forEach(([x, z]) => {
      add(cyl(0.7, 0.7, 0.08, '#d9b07a', 14), x, 0.8, z, g); add(cyl(0.06, 0.06, 0.8, '#7a4a2a', 6), x, 0.4, z, g);
      add(cyl(0.04, 0.04, 1.6, '#7a4a2a', 6), x, 1.6, z, g);
      add(new THREE.Mesh(new THREE.ConeGeometry(1, 0.45, 8), toon(x < 0 ? '#e4604b' : '#68dce7')), x, 2.45, z, g);
    });
  },
  2(g) { // Pasar tradisional + laboratorium pencernaan
    [[-2.6, 0, '#e4604b'], [0, -0.4, '#ffd17c'], [2.6, 0, '#68dce7']].forEach(([x, z, c], k) => {
      add(box(2.1, 0.9, 1.1, '#a0683e'), x, 0.45, z, g);
      [-0.9, 0.9].forEach((px) => add(cyl(0.05, 0.05, 2.2, '#7a4a2a', 5), x + px, 1.1, z + 0.5, g));
      for (let i = 0; i < 4; i += 1) { const s = box(0.55, 0.06, 1.4, i % 2 ? '#fff4e0' : c); s.rotation.x = -0.3; add(s, x - 0.8 + i * 0.53, 2.2, z + 0.15, g); }
      const fruits = ['#ff7043', '#ffd54f', '#8bc34a', '#ab47bc', '#ff8a65'];
      for (let i = 0; i < 7; i += 1) add(sph(0.16, fruits[(i + k) % fruits.length], 7), x - 0.7 + (i % 4) * 0.45, 1.02 + Math.floor(i / 4) * 0.2, z - 0.1 + Math.floor(i / 4) * 0.2, g);
    });
    const lab = new THREE.Group();
    add(cyl(1.4, 1.5, 0.4, '#d4e3df', 18), 0, 0.2, 0, lab);
    const tube = new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.13, 70, 8, 2, 3), toon(PALETTE.coral));
    add(tube, 0, 1.25, 0, lab).userData.spin = 0.6;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.3, depthWrite: false }));
    add(dome, 0, 0.4, 0, lab);
    add(lab, 5.6, 0, 0.6, g);
    add(createRumahGadang(0.75), -6.2, 0, -0.6, g);
    [-2.9, -0.3, 2.3].forEach((x) => add(createCorn(0.6), x, 1.15, 0.25, g).rotation.z = 1.4);
  },
  3(g) { // Pohon raksasa dengan gerbang emas (penyerapan)
    add(cyl(0.9, 1.4, 5, '#7a5134', 10), 0, 2.5, 0, g);
    [[0, 5.6, 0, 2.4], [-1.6, 5, 0.4, 1.7], [1.7, 5.1, -0.2, 1.8], [0.4, 6.6, -0.6, 1.6], [-0.9, 6.2, -0.9, 1.4]].forEach(([x, y, z, r]) => add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), toon(rand() < 0.5 ? '#3f9a5a' : '#57b06c')), x, y, z, g));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 10, 30), toon(PALETTE.gold, { emissive: '#e09a2a', emissiveIntensity: 0.6 }));
    add(ring, 0, 1.55, 1.0, g);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.92, 30), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.6 }));
    add(disc, 0, 1.55, 1.02, g).userData.pulse = true;
    for (let i = 0; i < 7; i += 1) {
      const l = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), toon('#9be36b', { emissive: '#6fd04a', emissiveIntensity: 0.5 }));
      l.userData.orbit = { r: 1.5 + rand(), s: 0.4 + rand() * 0.5, y: 1 + rand() * 4, o: rand() * 6 };
      add(l, 0, l.userData.orbit.y, 0, g);
    }
    [[-4.2, 0.5], [4.2, 0.5], [-3.2, -2.2], [3.2, -2.2]].forEach(([x, z]) => add(createStupa(0.55), x, 0, z, g));
  },
  4(g) { // Kota terapung: menara & bola molekul
    let y = 0;
    [[1.1, 1.3, 1.6, '#f4f7f6'], [0.95, 1.1, 1.6, '#e2ecea'], [0.8, 0.95, 1.6, '#f4f7f6'], [0.65, 0.8, 1.4, '#e2ecea']].forEach(([rt, rb, h, c]) => { add(cyl(rt, rb, h, c, 14), 0, y + h / 2, 0, g); add(cyl(rb + 0.02, rb + 0.02, 0.12, PALETTE.cyan, 14), 0, y + 0.1, 0, g).material = toon(PALETTE.cyan, { emissive: PALETTE.cyan, emissiveIntensity: 0.6 }); y += h; });
    add(cyl(1.2, 1.2, 0.2, '#f08a3c', 16), 0, y, 0, g);
    add(cyl(0.05, 0.05, 1.6, '#c9d3cf', 6), 0, y + 0.9, 0, g);
    add(sph(0.14, PALETTE.gold, 8), 0, y + 1.75, 0, g).userData.blink = true;
    const globe = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), new THREE.MeshToonMaterial({ color: '#c9f3ff', transparent: true, opacity: 0.25, depthWrite: false }));
    globe.add(glass);
    const atoms = [[0, 0, 0, 0.28], [0.6, 0.35, 0, 0.2], [-0.55, 0.3, 0.2, 0.2], [0.1, -0.6, 0.35, 0.2], [0, 0.25, -0.6, 0.18]];
    atoms.forEach(([x, yy, z, r]) => { const a = sph(r, PALETTE.gold, 10); a.position.set(x, yy, z); globe.add(a); if (x || yy || z) { const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(x, yy, z), 5), toon('#ffffff')); stick.position.set(x / 2, yy / 2, z / 2); stick.lookAt(x, yy, z); stick.rotateX(Math.PI / 2); globe.add(stick); } });
    add(cyl(0.8, 1, 0.5, '#c9d3cf', 14), -3.3, 0.25, 0.4, g);
    add(globe, -3.3, 1.9, 0.4, g).userData.spin = 0.5;
    [[3, 0.2], [3.6, -1.2]].forEach(([x, z]) => { add(box(1.2, 1.6, 1.2, '#e2ecea'), x, 0.8, z, g); add(box(1.25, 0.15, 1.25, PALETTE.cyan), x, 1.65, z, g); });
  },
  5(g) { // Studio iklan: meja kerja, berkas, kaca pembesar, papan pin
    add(box(3.4, 0.18, 1.6, '#a0683e'), 0, 1.05, 0, g);
    [[-1.5, -0.65], [1.5, -0.65], [-1.5, 0.65], [1.5, 0.65]].forEach(([x, z]) => add(box(0.14, 1, 0.14, '#7a4a2a'), x, 0.5, z, g));
    for (let i = 0; i < 6; i += 1) { const p = box(0.6, 0.02, 0.8, '#ffffff'); p.rotation.y = rand() - 0.5; add(p, -1.1 + i * 0.45, 1.16 + i * 0.01, (rand() - 0.5) * 0.5, g); }
    add(box(3.2, 2, 0.15, '#c8a27a'), 0, 2.4, -1.2, g);
    ['#ffd17c', '#ff9f91', '#68dce7', '#78f4bd', '#ffffff'].forEach((c, i) => add(box(0.5, 0.5, 0.04, c), -1.2 + i * 0.6, 2.4 + (i % 2) * 0.4, -1.1, g));
    const lens = new THREE.Group();
    add(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 24), toon(PALETTE.gold)), 0, 0, 0, lens);
    lens.add(new THREE.Mesh(new THREE.CircleGeometry(0.56, 24), new THREE.MeshBasicMaterial({ color: '#dff', transparent: true, opacity: 0.35, side: THREE.DoubleSide })));
    add(cyl(0.07, 0.09, 1, '#7a4a2a', 6), 0, -1.05, 0, lens);
    lens.rotation.z = 0.6;
    add(lens, 2.4, 2.3, 0.2, g).userData.bob = 2.3;
    const onair = createLabel('● ON AIR', { color: '#e2553f', size: 26 }); onair.position.set(0, 3.8, -1.2); g.add(onair);
    const kelir = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), new THREE.MeshBasicMaterial({ color: '#fff1c9' })); add(kelir, -4.4, 1.6, -0.6, g);
    add(createGunungan(0.75), -4.4, 0.7, -0.55, g);
    const blencong = sph(0.16, '#ffb347'); blencong.material = toon('#ffb347', { emissive: '#ff9a1f', emissiveIntensity: 1.2 }); add(blencong, -4.4, 2.9, 0.4, g).userData.blink = true;
  },
  6(g) { // Dapur Juara: pendopo joglo, tungku, dan portal daun emas
    add(box(4.4, 0.25, 3.2, '#c79a63'), 0, 0.12, 0, g);
    [[-1.9, -1.3], [1.9, -1.3], [-1.9, 1.3], [1.9, 1.3]].forEach(([x, z]) => add(cyl(0.12, 0.12, 2.6, '#7a4a2a', 6), x, 1.5, z, g));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.7, 4), toon('#8b3b2c')); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.8;
    add(roof, 0, 3.6, 0, g);
    add(box(1.1, 0.7, 0.8, '#a9a39a'), -1.2, 0.6, -0.6, g);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#3a3a3a')), -1.2, 1.15, -0.6, g);
    for (let i = 0; i < 4; i += 1) { const p = sph(0.22, '#f3f6f5', 8); p.castShadow = false; p.userData.smoke = i / 4; add(p, -1.2, 1.6, -0.6, g); }
    const portal = new THREE.Group();
    add(new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.18, 10, 30), toon(PALETTE.gold, { emissive: '#e09a2a', emissiveIntensity: 0.5 })), 0, 0, 0, portal);
    const pd = new THREE.Mesh(new THREE.CircleGeometry(1.15, 30), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.55 }));
    portal.add(pd); pd.userData.pulse = true;
    for (let i = 0; i < 7; i += 1) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 4), toon(i % 2 ? '#f5a623' : '#ffd17c')); const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7; lf.position.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0); lf.rotation.z = a - Math.PI / 2; portal.add(lf); }
    add(portal, 4.2, 1.6, 0.5, g).rotation.y = -0.5;
    const ondelA = createOndelOndel('#d9442b', 0.72); add(ondelA, -3.2, 0, 1.9, g).userData.sway = 0;
    const ondelB = createOndelOndel('#f4efe6', 0.72); add(ondelB, -4.4, 0, 1.2, g).userData.sway = 1.5;
  },
  // ---------- Pulau jelajah bebas ----------
  7(g, f) { // Bukit sawah terasering: tiga undakan yang bisa didaki, gubuk & orang-orangan sawah di puncak
    [[9, 6.4, 0.55], [6.6, 4.6, 1.1], [4.2, 3, 1.65]].forEach(([w, d, top], k) => {
      add(box(w, top, d, k % 2 ? '#7a9a3a' : '#6b8f3a'), 0, top / 2, -1, g);
      add(box(w - 0.5, 0.02, d - 0.5, '#7fd3d6'), 0, top + 0.01, -1, g);
      for (let i = 0; i < 14; i += 1) add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 4), toon('#9bdc5a')), -w / 2 + 0.5 + rand() * (w - 1), top + 0.2, -1 - d / 2 + 0.4 + rand() * (d - 0.8), g);
      plat(f, 0, -1, w / 2, d / 2, top);
    });
    const hut = new THREE.Group();
    [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]].forEach(([x, z]) => add(cyl(0.07, 0.07, 1.4, '#7a4a2a', 5), x, 0.7, z, hut));
    add(box(1.8, 0.1, 1.4, '#c79a63'), 0, 0.6, 0, hut);
    const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.9, 4), toon('#d9b56a')); hutRoof.rotation.y = Math.PI / 4; add(hutRoof, 0, 1.8, 0, hut);
    add(hut, 1, 1.65, -1.4, g);
    const scare = new THREE.Group();
    add(cyl(0.05, 0.05, 1.6, '#7a4a2a', 5), 0, 0.8, 0, scare); add(box(1.2, 0.08, 0.08, '#7a4a2a'), 0, 1.25, 0, scare);
    add(box(0.6, 0.6, 0.3, '#e2553f'), 0, 1.1, 0, scare); add(sph(0.22, '#f2d2b0', 8), 0, 1.6, 0, scare);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.25, 12), toon('#e8c77a')), 0, 1.82, 0, scare);
    add(scare, -1.3, 1.65, -1.2, g).userData.sway = 0.7;
    wildShard(f, 0.4, 2.6, -0.4);
    wildShard(f, -9.5, 0.9, 3);
  },
  8(g, f) { // Hutan bambu: rumpun bambu, angklung raksasa, tunggul untuk dilompati
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + rand() * 0.3; const r = 0.45 + rand() * 0.3;
      const x = Math.cos(a) * f.rx * r; const z = Math.sin(a) * f.rz * r;
      if (x < -1.5 && x > -7 && z > 0.5) continue; // jalur tunggul tetap lapang
      for (let k = 0; k < 3; k += 1) {
        const h = 4 + rand() * 3; const stalk = new THREE.Group();
        for (let s = 0; s < 3; s += 1) { add(cyl(0.09, 0.1, h / 3 - 0.05, s % 2 ? '#7cbf4a' : '#6aa83f', 6), 0, s * (h / 3) + h / 6, 0, stalk); add(cyl(0.11, 0.11, 0.05, '#4f8a35', 6), 0, (s + 1) * (h / 3), 0, stalk); }
        add(new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 5), toon('#5aa84a')), 0, h + 0.2, 0, stalk);
        stalk.rotation.z = (rand() - 0.5) * 0.25;
        add(stalk, x + (rand() - 0.5) * 0.8, 0, z + (rand() - 0.5) * 0.8, g);
      }
    }
    const ang = new THREE.Group(); // angklung: bingkai bambu dengan tabung bertingkat
    add(box(2.6, 0.12, 0.12, '#c9a35a'), 0, 0.2, 0, ang); add(box(2.6, 0.12, 0.12, '#c9a35a'), 0, 2.4, 0, ang);
    [-1.3, 1.3].forEach((x) => add(cyl(0.07, 0.07, 2.3, '#c9a35a', 6), x, 1.3, 0, ang));
    for (let i = 0; i < 4; i += 1) add(cyl(0.12, 0.12, 0.9 + i * 0.35, '#e0c27a', 8), -0.9 + i * 0.6, 0.65 + (0.9 + i * 0.35) / 2, 0, ang);
    add(ang, 0, 0, 0.5, g).userData.sway = 2;
    [[-2.5, 2.2, 0.5], [-3.6, 3.2, 1], [-4.8, 2.5, 1.5], [-6, 1.2, 2.1]].forEach(([x, z, top]) => {
      add(cyl(0.55, 0.65, top, '#8a5f37', 10), x, top / 2, z, g); add(cyl(0.5, 0.5, 0.04, '#d9b07a', 10), x, top + 0.01, z, g);
      plat(f, x, z, 0.5, 0.5, top);
    });
    wildShard(f, -6, 3, 1.2);
    wildShard(f, 3.5, 0.9, -2.5);
  },
  9(g, f) { // Danau kawah: danau biru, dermaga, teratai, batu loncatan menuju candi kecil
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 36), toon('#5ec8e8')); lake.rotation.x = -Math.PI / 2; lake.scale.set(f.rx * 0.55, f.rz * 0.55, 1);
    add(lake, 0, 0.02, 0, g);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.08, 36), toon('#94857a')); rim.rotation.x = -Math.PI / 2; rim.scale.copy(lake.scale); add(rim, 0, 0.03, 0, g);
    for (let i = 0; i < 9; i += 1) {
      const a = rand() * Math.PI * 2; const px = Math.cos(a) * f.rx * 0.4; const pz = Math.sin(a) * f.rz * 0.4;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), toon('#4caf6e')); pad.rotation.x = -Math.PI / 2; add(pad, px, 0.05, pz, g);
      add(sph(0.13, '#f9a8d4', 6), px, 0.15, pz, g);
    }
    add(box(1.2, 0.5, 1.2, '#94857a'), 0, 0.25, 0, g); add(createStupa(0.6), 0, 0.5, 0, g); plat(f, 0, 0, 0.6, 0.6, 0.5);
    [[-4.6, 0], [-3.3, 0.4], [-2, 0.1]].forEach(([x, z], k) => { add(cyl(0.45, 0.5, 0.3 + k * 0.1, '#a99f92', 8), x, (0.3 + k * 0.1) / 2, z, g); plat(f, x, z, 0.42, 0.42, 0.3 + k * 0.1); });
    add(box(1.4, 0.15, 4, '#a0683e'), f.rx * 0.5, 0.2, 2, g).rotation.y = -0.5;
    for (let i = 0; i < 7; i += 1) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rand() * 0.5, 0), toon('#7d6a5a')), Math.cos(i) * f.rx * 0.68, 0.3, Math.sin(i) * f.rz * 0.68, g);
    wildShard(f, 0, 1.6, 0);
    wildShard(f, f.rx * 0.6, 0.9, 3.3);
  },
  10(g, f) { // Pantai kelapa: nyiur, payung pantai, mercusuar, pinisi bersandar
    [[-3, 2], [-1.5, 3], [2.5, 2.6], [4, 1.2], [-6, 0], [6, -1.5]].forEach(([x, z]) => buildPalm(f.x + x, f.z + z, 1 + rand() * 0.3));
    [[-2.2, -1, '#e2553f'], [0.8, -1.6, '#1fc3d3'], [3.2, -0.4, '#f5b72b']].forEach(([x, z, c]) => {
      add(cyl(0.04, 0.04, 2, '#ffffff', 5), x, 1, z, g); add(new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8), toon(c)), x, 2.1, z, g);
      add(box(0.7, 0.06, 1.5, '#ffffff'), x + 0.8, 0.2, z + 0.3, g);
    });
    for (let i = 0; i < 5; i += 1) add(sph(0.18, '#6b4a2a', 7), -1 + rand() * 2, 0.15, 3.5 + rand(), g);
    const tower = new THREE.Group(); let y = 0;
    for (let i = 0; i < 5; i += 1) { add(cyl(0.75 - i * 0.08, 0.82 - i * 0.08, 1, i % 2 ? '#e2553f' : '#ffffff', 12), 0, y + 0.5, 0, tower); y += 1; }
    add(cyl(0.55, 0.55, 0.6, '#fff3b0', 10), 0, y + 0.3, 0, tower).material = toon('#fff3b0', { emissive: '#ffd54f', emissiveIntensity: 0.9 });
    add(new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.6, 10), toon('#2b4c7e')), 0, y + 0.9, 0, tower);
    add(tower, f.rx * 0.62, 0, -f.rz * 0.35, g);
    add(createPinisi(1), -f.rx * 0.95, -0.4, f.rz * 0.3, g).rotation.y = 0.4;
    wildShard(f, -6, 0.9, 1.5);
    wildShard(f, 5.4, 0.9, 3);
  },
  11(g, f) { // Bukit layang-layang: bukit rumput, kincir angin, layang-layang tertambat, peti untuk dipanjat
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#7cc95a')); hill.scale.set(5, 2.2, 3.6); add(hill, -3, 0, -1.5, g);
    const mill = new THREE.Group();
    add(cyl(0.35, 0.6, 4.5, '#f4efe6', 8), 0, 2.25, 0, mill);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.8, 8), toon('#e2553f')), 0, 4.9, 0, mill);
    const blades = new THREE.Group();
    for (let i = 0; i < 4; i += 1) { const b = box(0.35, 2.4, 0.05, i % 2 ? '#f5b72b' : '#ffffff'); b.position.y = 1.2; const arm = new THREE.Group(); arm.add(b); arm.rotation.z = (i / 4) * Math.PI * 2; blades.add(arm); }
    blades.position.set(0, 4.3, 0.65); blades.userData.roll = 1.4; mill.add(blades); animated.push(blades);
    add(mill, 4.5, 0, -1.5, g);
    [['#e2553f', '#f5b72b'], ['#1fc3d3', '#ffffff'], ['#2fa36b', '#f5b72b']].forEach(([c1, c2], i) => {
      const x = -6 + i * 3; const z = 2.5; const ky = 7 + i;
      add(cyl(0.06, 0.06, 1, '#7a4a2a', 5), x, 0.5, z, g);
      const k = createKite(c1, c2); k.scale.setScalar(0.8); k.userData.tether = { y: ky, o: i * 2 }; add(k, x, ky, z - 2, g); animated.push(k);
      const a = new THREE.Vector3(x, 1, z); const b = new THREE.Vector3(x, ky, z - 2);
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 3), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      line.position.copy(a.clone().lerp(b, 0.5)); line.scale.y = a.distanceTo(b); line.lookAt(b); line.rotateX(Math.PI / 2); g.add(line);
    });
    [[1, 1.5, 0.6, 1.2], [1.9, 0.5, 1.2, 1], [2.6, -0.4, 1.8, 0.8]].forEach(([x, z, top, s]) => { add(box(s, top, s, '#c79a63'), x, top / 2, z, g); add(box(s + 0.02, 0.06, s + 0.02, '#8a5f37'), x, top - 0.02, z, g); plat(f, x, z, s / 2, s / 2, top); });
    wildShard(f, 2.6, 2.7, -0.4);
    wildShard(f, -3, 0.9, 4);
  },
  12(g, f) { // Kebun rempah: barisan perdu cengkeh & pala, para-para jemuran rempah, saung
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 6; c += 1) add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), toon(r % 2 ? '#3f9a5a' : '#2f8a4c')), -5 + c * 1.6, 0.5, -4 + r * 1.6, g);
    [['#f5b72b', 'Kunyit'], ['#e2553f', 'Cabai'], ['#8a5f37', 'Kayu manis'], ['#5a3a2a', 'Cengkeh']].forEach(([c, label], i) => {
      const x = -4.5 + i * 3; const z = 2;
      [-0.9, 0.9].forEach((px) => add(cyl(0.05, 0.05, 0.9, '#7a4a2a', 5), x + px, 0.45, z, g));
      add(box(2, 0.06, 1.2, '#c9a35a'), x, 0.9, z, g); add(box(1.8, 0.05, 1, c), x, 0.95, z, g);
      const lb = createLabel(label, { color: '#7a3f1c', bg: 'rgba(255,244,220,.92)', size: 22, scale: 0.008 }); lb.position.set(x, 1.6, z); g.add(lb);
      plat(f, x, z, 1, 0.6, 0.95);
    });
    const saung = new THREE.Group();
    [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]].forEach(([x, z]) => add(cyl(0.08, 0.08, 2, '#7a4a2a', 5), x, 1, z, saung));
    add(box(2.2, 0.12, 1.8, '#c79a63'), 0, 0.5, 0, saung);
    const saungRoof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1, 4), toon('#8b3b2c')); saungRoof.rotation.y = Math.PI / 4; add(saungRoof, 0, 2.4, 0, saung);
    add(saung, 5.5, 0, -2, g);
    wildShard(f, 4.5, 1.9, 2);
    wildShard(f, -6.5, 0.9, -1);
  }
};

function buildLandmark(id) {
  const f = frame(id);
  const g = new THREE.Group();
  if (!LANDMARKS[id]) return;
  LANDMARKS[id](g, f);
  if (id === 0 || !W.isPost(id)) g.position.set(f.x, 0, f.z);
  else g.position.set(f.x, 0, f.z - f.rz * 0.5);
  scene.add(g);
  g.traverse((o) => { if (o.userData.spin || o.userData.bob || o.userData.pulse || o.userData.orbit || o.userData.smoke !== undefined || o.userData.blink || o.userData.sway !== undefined || o.userData.gong) animated.push(o); });
}

function buildBridges() {
  W.bridges.forEach((br) => {
    const a = new THREE.Vector3(toX(br.a[0]), 0, toZ(br.a[1]));
    const b = new THREE.Vector3(toX(br.b[0]), 0, toZ(br.b[1]));
    const len = a.distanceTo(b);
    const n = Math.max(3, Math.ceil(len / 1.15));
    const width = br.w * S * 0.85;
    const tiles = [];
    const dir = b.clone().sub(a).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    for (let i = 0; i < n; i += 1) {
      const t = (i + 0.5) / n;
      const p = a.clone().lerp(b, t);
      const tile = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, (len / n) * 0.82), new THREE.MeshToonMaterial({ color: '#bff6ff', emissive: PALETTE.cyan, emissiveIntensity: 0.5, transparent: true, opacity: 0.92 }));
      tile.position.set(p.x, -0.08 + Math.sin(t * Math.PI) * -0.25, p.z);
      tile.rotation.y = yaw;
      tile.receiveShadow = true;
      scene.add(tile);
      tiles.push(tile);
    }
    const rails = [-1, 1].map((side) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.9 }));
      const off = new THREE.Vector3(Math.cos(yaw) * side * width * 0.55, 0.5, -Math.sin(yaw) * side * width * 0.55);
      r.position.copy(a.clone().lerp(b, 0.5)).add(off);
      r.rotation.y = yaw;
      scene.add(r);
      return r;
    });
    bridges3d.push({ br, tiles, rails, open: null, lightUp: -1 });
    [a, b].forEach((end, k) => {
      const back = k === 0 ? -1 : 1;
      [-1, 1].forEach((side) => {
        const p = createPenjor(0.7);
        p.position.set(end.x + Math.cos(yaw) * side * (width * 0.7 + 0.3) - dir.x * back * 0.6, 0, end.z - Math.sin(yaw) * side * (width * 0.7 + 0.3) - dir.z * back * 0.6);
        p.rotation.y = yaw + (side > 0 ? Math.PI : 0);
        scene.add(p);
      });
    });
  });
}

function buildDecor() {
  W.islands.forEach((isl) => {
    const f = frame(isl.id);
    const count = isl.id === 0 ? 30 : W.isPost(isl.id) ? 10 : 16;
    for (let i = 0; i < count; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = 0.78 + rand() * 0.14;
      const x = f.x + Math.cos(a) * f.rx * r; const z = f.z + Math.sin(a) * f.rz * r;
      if (W.bridges.some((br) => { const ax = toX(br.a[0]); const az = toZ(br.a[1]); const bx = toX(br.b[0]); const bz = toZ(br.b[1]); return Math.hypot(ax - x, az - z) < 3 || Math.hypot(bx - x, bz - z) < 3; })) continue;
      const k = rand();
      if (k < 0.4) buildPalm(x, z, 0.8 + rand() * 0.4);
      else if (k < 0.7) add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rand() * 0.35, 0), toon(rand() < 0.5 ? '#3f9a5a' : '#2f8a4c')), x, 0.25, z);
      else { const fl = new THREE.Group(); add(cyl(0.02, 0.02, 0.3, '#3f9a5a', 4), 0, 0.15, 0, fl); add(sph(0.11, ['#ff9f91', '#ffd17c', '#ffffff', '#f59e5b'][Math.floor(rand() * 4)], 6), 0, 0.33, 0, fl); add(fl, x, 0, z); }
    }
  });
  W.trees.forEach(([tx, ty]) => {
    const x = toX(tx); const z = toZ(ty);
    if (W.islandAt(tx, ty) === 0) buildPalm(x, z, 1 + rand() * 0.3);
  });
}

function buildPalm(x, z, s = 1) {
  const g = new THREE.Group();
  let px = 0; let py = 0;
  const lean = (rand() - 0.5) * 0.5;
  for (let i = 0; i < 6; i += 1) {
    const seg = cyl(0.13 - i * 0.012, 0.15 - i * 0.012, 0.55, i % 2 ? '#a8794a' : '#8a5f37', 7);
    px += lean * 0.12;
    add(seg, px, py + 0.27, 0, g);
    py += 0.5;
  }
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.7, 4), toon(i % 2 ? '#3f9a5a' : '#4fb56a'));
    leaf.geometry.translate(0, 0.85, 0);
    leaf.rotation.set(1.95, (i / 7) * Math.PI * 2, 0, 'YXZ');
    leaf.scale.z = 0.35;
    add(leaf, px, py + 0.1, 0, g);
  }
  g.scale.setScalar(s);
  g.rotation.y = rand() * Math.PI * 2;
  return add(g, x, 0, z);
}

function buildSkyAndClouds() {
  // Lautan awan berlapis di bawah kepulauan
  cloudSea = createCloudSea({ radius: 460, y: -15, quality: gfx, renderer });
  scene.add(cloudSea);
  // Pulau karst di kejauhan
  for (let i = 0; i < 22; i += 1) {
    const a = (i / 22) * Math.PI * 2 + rand() * 0.3;
    const r = 175 + rand() * 80;
    const h = 10 + rand() * 12;
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(2 + rand() * 2, 4 + rand() * 3, h, 7), toon(rand() < 0.5 ? '#6f8c7a' : '#7c9a83')), 0, h / 2, 0, g);
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 0), toon('#4f9e64')), 0, h + 0.5, 0, g);
    add(g, Math.cos(a) * r, -18, Math.sin(a) * r);
  }
  // Layang-layang warna-warni di atas kepulauan
  const kiteColors = [['#e2553f', '#f5b72b'], ['#1fc3d3', '#ffffff'], ['#2fa36b', '#f5b72b'], ['#f472b6', '#ffffff'], ['#2b4c7e', '#f5b72b'], ['#f08a3c', '#2fa36b']];
  kiteColors.forEach(([c1, c2], i) => {
    const k = createKite(c1, c2);
    const a = (i / kiteColors.length) * Math.PI * 2;
    k.userData.kite = { a, r: 22 + (i % 3) * 30, y: 14 + (i % 2) * 5, s: 0.03 + (i % 3) * 0.015 };
    k.scale.setScalar(1.3);
    scene.add(k);
    animated.push(k);
  });
  // Perahu pinisi berlayar di lautan awan
  [0, Math.PI, Math.PI / 2].forEach((a, i) => {
    const p = createPinisi(1.4);
    p.userData.pinisi = { a, r: 145 + i * 18, s: 0.012 + i * 0.004 };
    scene.add(p);
    animated.push(p);
  });
  // Matahari digambar oleh kubah langit (sky.js), searah dengan cahaya bayangan.
  // Awan kumulus tinggi yang melayang pelan
  const high = gfx === 'high';
  const cloudTex = cumulusTextures(high ? 4 : 2, gfx);
  for (let i = 0; i < (high ? 22 : 12); i += 1) {
    const c = createCumulus(cloudTex[i % cloudTex.length], 26 + rand() * 34, { opacity: 0.96 });
    c.userData.drift = 0.5 + rand() * 0.6;
    c.position.set(-200 + rand() * 400, 24 + rand() * 14, -120 + rand() * 240);
    scene.add(c);
    animated.push(c);
  }
  // Gugusan awan besar di cakrawala (tanpa kabut, diwarnai biru udara agar tampak jauh)
  for (let i = 0; i < (high ? 12 : 7); i += 1) {
    const a = (i / (high ? 12 : 7)) * Math.PI * 2 + rand() * 0.4;
    const r = 300 + rand() * 60;
    const c = createCumulus(cloudTex[(i + 1) % cloudTex.length], 90 + rand() * 70, { fog: false, tint: '#e4f2fb', opacity: 0.88 });
    c.position.set(Math.cos(a) * r, -16 + rand() * 6, Math.sin(a) * r);
    scene.add(c);
  }
}

function buildShards() {
  const tempe = '#e9d8a6';
  const f0 = frame(0);
  [[6, -4, 1.6, 0.7], [8, -5.4, 1.6, 1.45], [10.4, -6.2, 2.4, 2.2], [-9, 6, 1.8, 0.75], [-11, 7.4, 2, 1.5]].forEach(([x, z, size, top]) => {
    const g = new THREE.Group();
    add(box(size, 0.4, size, top > 2 ? '#f5c66b' : tempe), 0, top - 0.2, 0, g);
    for (let i = 0; i < 5; i += 1) add(sph(0.07, '#c9b37a', 5), (rand() - 0.5) * size * 0.8, top + 0.01, (rand() - 0.5) * size * 0.8, g);
    if (top > 0.8) add(cyl(0.12, 0.16, top - 0.4, '#8a5f37', 6), 0, (top - 0.4) / 2, 0, g);
    add(g, f0.x + x, 0, f0.z + z);
    platforms.push({ x: f0.x + x, z: f0.z + z, hw: size / 2, hd: size / 2, top });
  });
  const spots = [[0, 10.4, 3.2, -6.2], [0, -11, 2.5, 7.4], [0, 15, 0.9, 6], [0, -16, 0.9, -1],
    [1, -0.6, 0.9, 0.55], [2, 0.7, 0.9, 0.55], [3, -0.6, 0.9, 0.5], [4, 0.6, 0.9, 0.5], [5, -0.6, 0.9, 0.55], [6, 0.65, 0.9, 0.5], [0, -4, 0.9, 9], [0, 17, 0.9, -5]];
  spots.forEach(([isl, lx, y, lz], i) => {
    const f = frame(isl);
    const x = isl === 0 ? f.x + lx : f.x + lx * f.rx;
    const z = isl === 0 ? f.z + lz : f.z + lz * f.rz;
    const g = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), toon(PALETTE.gold, { emissive: '#c98a1a', emissiveIntensity: 0.55 }));
    leaf.scale.set(0.7, 1.15, 0.35);
    g.add(leaf);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.6 })));
    add(g, x, y, z);
    shards.push({ id: i, obj: g, x, y, z, island: isl, taken: false });
  });
  // Kepingan di pulau jelajah (ditambahkan di belakang agar id lama tetap sama).
  wildShards.forEach(([x, y, z, isl]) => {
    const g = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), toon(PALETTE.gold, { emissive: '#c98a1a', emissiveIntensity: 0.55 }));
    leaf.scale.set(0.7, 1.15, 0.35);
    g.add(leaf);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.6 })));
    add(g, x, y, z);
    shards.push({ id: shards.length, obj: g, x, y, z, island: isl, taken: false });
  });
  document.getElementById('w3-shards-total').textContent = String(shards.length);
}

async function prepare(onProgress = () => {}) {
  if (built) { onProgress(1); return true; }
  if (gfx === '2d' || !initRenderer()) { onProgress(1); return false; }
  const steps = [
    () => buildSkyAndClouds(),
    () => W.islands.forEach(buildIsland),
    () => W.islands.forEach((i) => buildLandmark(i.id)),
    () => buildBridges(),
    () => buildDecor(),
    () => buildShards(),
    () => {
      quests = createQuests({
        scene, fx, game, add,
        overlay: document.getElementById('w3-holo'),
        islandFrame: (id) => frame(id),
        say: (text, reaction = 'talk') => say(nara, text, 2.6, reaction),
        nara: (r) => nara.userData.react(r, r === 'celebrate' ? 1.4 : 1.1),
        onPanel: (open) => { panelOpen = open; if (!open && renderer) renderer.domElement.focus(); },
        onSealed: sealed
      });
      nara = createNara();
      add(nara, toX(W.nara.x), 0, toZ(W.nara.y));
      arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), toon(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.7 }));
      arrow.rotation.x = Math.PI;
      arrow.castShadow = false;
      scene.add(arrow);
      selectRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 60), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.9 }));
      selectRing.rotation.x = Math.PI / 2;
      scene.add(selectRing);
      // Tanda panah arah hadap (di tanah, di depan penjelajah)
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0, 0.55); arrowShape.lineTo(0.42, 0.05); arrowShape.lineTo(0.16, 0.05); arrowShape.lineTo(0.16, -0.35); arrowShape.lineTo(-0.16, -0.35); arrowShape.lineTo(-0.16, 0.05); arrowShape.lineTo(-0.42, 0.05); arrowShape.closePath();
      facingArrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: '#ffc93c', transparent: true, opacity: 0.95, depthWrite: false }));
      const arrowEdge = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: '#7a3f1c', transparent: true, opacity: 0.85, depthWrite: false }));
      arrowEdge.scale.setScalar(1.22); arrowEdge.position.set(0, -0.03, -0.005); arrowEdge.renderOrder = 1;
      facingArrow.add(arrowEdge);
      facingArrow.scale.setScalar(1.5);
      facingArrow.rotation.order = 'YXZ';
      facingArrow.renderOrder = 2;
      scene.add(facingArrow);
      aimRing = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
      aimRing.rotation.x = -Math.PI / 2;
      aimRing.renderOrder = 2;
      scene.add(aimRing);
      walkMarker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 4), new THREE.MeshBasicMaterial({ color: '#f5b72b', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
      walkMarker.rotation.x = -Math.PI / 2;
      walkMarker.renderOrder = 2;
      scene.add(walkMarker);
      self.obj = createExplorer(net && net.me ? net.me.color : PALETTE.cyan);
      add(self.obj);
    }
  ];
  for (let i = 0; i < steps.length; i += 1) {
    steps[i]();
    onProgress((i + 1) / steps.length);
    await new Promise((r) => setTimeout(r, 16));
  }
  built = true;
  applyQuality();
  document.getElementById('w3-loading').hidden = true;
  refreshIslands(true);
  return true;
}

// ---------- Kunci pulau & jembatan ----------
function refreshIslands(instant) {
  const allowed = allowedSet();
  const key = [...allowed].sort().join(',');
  if (key === allowedKey && !instant) return;
  const firstTime = !allowedKey;
  allowedKey = key;
  domes.forEach((dome, id) => {
    const open = allowed.has(id);
    if (open && dome.visible && !instant && !firstTime) dome.userData.fade = 1; // animasi kubah memudar
    else dome.visible = !open;
  });
  bridges3d.forEach((b) => {
    const open = allowed.has(b.br.from) && allowed.has(b.br.to);
    if (b.open === open) return;
    const animateOpen = open && b.open === false && !instant;
    b.open = open;
    b.tiles.forEach((t, i) => {
      t.material.color.set(open ? '#bff6ff' : '#7d8b88');
      t.material.emissiveIntensity = open ? (animateOpen ? 0 : 0.5) : 0;
      t.material.opacity = open ? 0.92 : 0.45;
      t.userData.delay = animateOpen ? i * 0.12 : -1;
    });
    b.rails.forEach((r) => { r.material.color.set(open ? PALETTE.cyan : '#56615f'); r.material.opacity = open ? 0.9 : 0.35; });
    b.lightT = animateOpen ? 0 : -1;
  });
}

function sealed(id, res) {
  quests.refresh();
  setTimeout(() => {
    refreshIslands();
    const next = res.next && missionOf(res.next);
    if (next && allowedSet().has(next.id)) {
      banner(`JEMBATAN KE POS ${next.id} TERBUKA!`, `${next.title} ${next.titleEm}`);
      say(nara, `Segel aktif! Jembatan cahaya ke Pos ${next.id} — ${next.title} ${next.titleEm} — sudah menyala. Ikuti panah emas!`, 2.6, 'celebrate');
    } else if (next) {
      banner('POS TERSEGEL ✦', `Pos ${next.id} menunggu dibuka guru`);
    }
  }, 1600);
}

// ---------- Interaksi ----------
const keys = new Set();
const KEYMAP = { ShiftLeft: 'run', ShiftRight: 'run', KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r', ArrowUp: 'af', ArrowDown: 'ab', ArrowLeft: 'tl', ArrowRight: 'tr', KeyR: 'lu', PageUp: 'lu', KeyF: 'ld', PageDown: 'ld' };
const TURN_SPEED = 2.6; // radian per detik
const PITCH_MIN = -0.5; // menengadah ke langit
const PITCH_MAX = 1.3;  // menunduk dari atas
const LOOK_SPEED = 1.3;
const aim = { point: null, active: false, lastMove: 0 }; // titik tanah di bawah kursor
const walkTo = { point: null };
let facingArrow; let aimRing; let walkMarker;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const stick = { x: 0, y: 0, id: null };
let jumpQueued = false;
const typing = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
const EMOTE_KEYS = { Digit1: 'wave', Digit2: 'cheer', Digit3: 'dance', Digit4: 'think' };

window.addEventListener('keydown', (e) => {
  if (!running || typing(document.activeElement) || panelOpen) return;
  const onCanvas = renderer && (document.activeElement === renderer.domElement || document.activeElement === document.body);
  if (mode === 'drop' && e.code === 'Space') { e.preventDefault(); drop.openLeaf = true; return; }
  if (mode !== 'play') return;
  if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); if (onCanvas) e.preventDefault(); }
  if (e.code === 'Space' && onCanvas) { e.preventDefault(); jumpQueued = true; }
  if (EMOTE_KEYS[e.code]) doEmote(EMOTE_KEYS[e.code]);
  if (e.code === 'KeyM') toggleMinimap();
  if ((e.code === 'KeyE' || (e.code === 'Enter' && onCanvas)) && nearby) { e.preventDefault(); interact(); }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
window.addEventListener('blur', () => keys.clear());

const raycaster = new THREE.Raycaster();
function groundPoint(e) {
  const r = renderer.domElement.getBoundingClientRect();
  const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  const hit = raycaster.intersectObjects(islandTops, false)[0];
  if (hit) return new THREE.Vector3(hit.point.x, 0, hit.point.z);
  groundPlane.constant = 0;
  const out = new THREE.Vector3();
  return raycaster.ray.intersectPlane(groundPlane, out) ? out.setY(0) : null;
}
function pickIsland(e) {
  const r = renderer.domElement.getBoundingClientRect();
  const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  const hit = raycaster.intersectObjects(islandTops, false)[0];
  return hit ? hit.object.userData.islandId : null;
}

function bindInput(el) {
  let drag = null;
  el.addEventListener('pointerdown', (e) => { el.focus(); drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => {
    if (mode === 'overview' && !drag) { const id = pickIsland(e); el.style.cursor = id !== null ? 'pointer' : 'grab'; overview.hover = id; }
    if (mode === 'play' && (!drag || drag.moved < 6) && e.pointerType === 'mouse') { const p = groundPoint(e); aim.point = p; aim.active = Boolean(p); aim.lastMove = performance.now(); }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (mode === 'overview') overview.yaw -= dx * 0.005;
    else { cam.yaw -= dx * 0.006; cam.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, cam.pitch + dy * 0.004)); }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  el.addEventListener('pointerup', (e) => {
    if (mode === 'overview' && drag && drag.moved < 6) { const id = pickIsland(e); if (id !== null) selectIsland(id); }
    if (mode === 'play' && drag && drag.moved < 6 && !panelOpen) { const p = groundPoint(e); if (p) { const c = W.clamp(toPx(p.x), toPy(p.z), allowedSet()); walkTo.point = new THREE.Vector3(toX(c.x), 0, toZ(c.y)); fx.ring({ x: walkTo.point.x, y: 0, z: walkTo.point.z }, { color: '#f5b72b', from: 0.2, to: 1.4, life: 0.45 }); } }
    drag = null;
  });
  el.addEventListener('pointercancel', () => { drag = null; });
  el.addEventListener('pointerleave', () => { aim.active = false; });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (mode === 'overview') overview.dist = Math.min(120, Math.max(40, overview.dist + e.deltaY * 0.05));
    else cam.dist = Math.min(20, Math.max(5, cam.dist + e.deltaY * 0.01));
  }, { passive: false });

  const pad = document.getElementById('w3-stick');
  const knob = pad.querySelector('i');
  const moveStick = (e) => {
    const r = pad.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    stick.x = dx; stick.y = dy;
    knob.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`;
  };
  pad.addEventListener('pointerdown', (e) => { stick.id = e.pointerId; pad.setPointerCapture(e.pointerId); moveStick(e); });
  pad.addEventListener('pointermove', (e) => { if (stick.id === e.pointerId) moveStick(e); });
  const release = () => { stick.id = null; stick.x = 0; stick.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
  document.getElementById('w3-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); if (mode === 'drop') drop.openLeaf = true; else jumpQueued = true; });
  document.getElementById('w3-act').addEventListener('pointerdown', (e) => { e.preventDefault(); interact(); });
}

wrap.querySelector('.w3-emotes').addEventListener('click', (e) => { const b = e.target.closest('[data-emote]'); if (b) doEmote(b.dataset.emote); });
actionBtn.addEventListener('click', () => { if (running && gfx !== '2d') interact(); });

function doEmote(name) {
  if (mode !== 'play') return;
  self.obj.userData.emote(name);
  if (net) net.emote(name);
}

const canMove = () => !panelOpen && !(net && net.online && (net.settings.paused || net.settings.movementLocked));

function interact() {
  if (!nearby || mode !== 'play' || panelOpen) return;
  keys.clear();
  if (nearby.kind === 'nara') { naraTalk(); return; }
  quests.activate(nearby.item);
}

function nextGoal() {
  const st = game.state;
  const target = MISSIONS.find((m) => !st.posts[m.id].sealed);
  if (!target) return { text: '✓ EKSPEDISI SELESAI — semua segel aktif!', item: null };
  if (!allowedSet().has(target.id)) return { text: `⌑ Pos ${target.id} menunggu dibuka guru`, item: null };
  const here = self.island === target.id;
  if (!here) {
    const f = frame(target.id);
    return { text: `➜ Menuju Pulau Pos ${target.id}: ${target.title} ${target.titleEm} — ikuti jembatan cahaya`, point: { x: f.x, z: f.z } };
  }
  if (target.type === 'project') return { text: '✦ Rancang menu di Meja Dapur Juara', item: quests.items.find((i) => i.pos === target.id) };
  const p = st.posts[target.id];
  const ev = (p.evidence || []).length;
  const rows = target.stimulus.rows.length;
  if (ev < rows) {
    const item = quests.items.find((i) => i.pos === target.id && i.kind === 'terminal' && !(p.evidence || []).includes(i.row));
    return { text: `⌕ Pindai Terminal Arsip (${ev}/${rows})`, item };
  }
  const done = p.challenges.filter((c) => c.complete).length;
  if (done < target.challenges.length) return { text: `▤ Jawab di Papan Laporan (${done}/${target.challenges.length})`, item: quests.items.find((i) => i.pos === target.id && i.kind === 'board') };
  return { text: '✦ Tulis alasan & segel di Altar Segel', item: quests.items.find((i) => i.pos === target.id && i.kind === 'altar') };
}

function naraTalk() {
  const goal = nextGoal();
  const m = MISSIONS.find((x) => x.id === self.island);
  let text = goal.text.replace(/^[^A-Za-z0-9]+/, '');
  if (m && !game.state.posts[m.id].sealed && m.nara && m.nara.intro && !(game.state.posts[m.id].evidence || []).length) text = m.nara.intro;
  say(nara, `${text}`, 2.6, 'talk');
}

function say(obj, text, height = 2.6, reaction) {
  if (!obj) return;
  if (obj === nara && reaction) nara.userData.react(reaction, reaction === 'celebrate' ? 1.4 : 1.2);
  const old = bubbles.findIndex((b) => b.follow === obj);
  if (old >= 0) { scene.remove(bubbles[old].sprite); bubbles.splice(old, 1); }
  const sprite = createBubble(text);
  scene.add(sprite);
  bubbles.push({ sprite, follow: obj, height, until: performance.now() + Math.min(9000, 3500 + text.length * 45) });
}

function banner(title, sub = '') {
  const el = document.getElementById('w3-banner');
  el.innerHTML = `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

// ---------- Mode pilih map (overview) ----------
const overview = { yaw: 0.6, dist: 78, focus: new THREE.Vector3(), target: new THREE.Vector3(), selected: 1, hover: null, onBack: null, onDrop: null };

const discoverKey = () => `nutrantara-pulau-v1:${(game.state.alias || '').toLocaleLowerCase('id')}`;
function discovered() { try { return JSON.parse(localStorage.getItem(discoverKey())) || []; } catch { return []; } }
function saveDiscovered(list) { try { localStorage.setItem(discoverKey(), JSON.stringify(list)); } catch { /* abaikan */ } }

function islandStatus(id) {
  if (id === 0) return { key: 'open', text: 'TERBUKA · TITIK KUMPUL' };
  if (W.isWild(id)) {
    if (!allowedSet().has(id)) return { key: 'locked', text: 'Belum terjangkau' };
    return { key: discovered().includes(id) ? 'done' : 'open', text: discovered().includes(id) ? '◆ SUDAH DIJELAJAHI' : 'JELAJAH BEBAS' };
  }
  const p = game.state.posts[id];
  if (p && p.sealed) return { key: 'done', text: '✓ TERSEGEL' };
  if (allowedSet().has(id)) return { key: 'open', text: 'TERBUKA' };
  return { key: 'locked', text: game.lockMessage(id) };
}

function renderOverview() {
  const list = document.getElementById('ov-list');
  list.innerHTML = W.islands.map((isl) => {
    const m = missionOf(isl.id);
    const st = islandStatus(isl.id);
    return `<li><button type="button" class="ov-card ${st.key}${overview.selected === isl.id ? ' selected' : ''}" data-island="${isl.id}" aria-pressed="${overview.selected === isl.id}" style="--c:${ISLAND_COLORS[isl.id]}"><span class="ov-num">${isl.kind === 'wild' ? '◆' : isl.id ? String(isl.id).padStart(2, '0') : '✳'}</span><span><b>${m ? `${m.title} ${m.titleEm}` : isl.name}</b><small>${st.key === 'locked' ? '⌑ TERKUNCI' : st.text}</small></span></button></li>`;
  }).join('');
  const id = overview.selected;
  const m = missionOf(id);
  const st = islandStatus(id);
  const p = m && game.state.posts[id];
  let progress = '';
  if (m && m.type === 'analysis') progress = `<ul class="ov-prog"><li>${(p.evidence || []).length}/${m.stimulus.rows.length} bukti terminal</li><li>${p.challenges.filter((c) => c.complete).length}/${m.challenges.length} tantangan</li><li>${p.sealed ? 'Segel aktif ✦' : 'Belum disegel'}</li></ul>`;
  document.getElementById('ov-info').innerHTML = `
    <p class="ov-kicker" style="color:${ISLAND_COLORS[id]}">${m ? `POS ${String(id).padStart(2, '0')} · ${m.location}` : W.isWild(id) ? 'PULAU JELAJAH' : 'PULAU TENGAH'}</p>
    <h3>${m ? `${m.title} <em>${m.titleEm}</em>` : W.isWild(id) ? islandOf(id).name : 'Alun-alun <em>Nusantara</em>'}</h3>
    <p>${m ? m.description : W.isWild(id) ? `${islandOf(id).desc} Tidak ada soal di sini: bebas menjelajah dan mencari kepingan arsip.` : 'Titik kumpul kelas bersama Nara. Ada gapura, sawah bertingkat, kolam, dan blok tempe berisi kepingan arsip.'}</p>
    ${progress}
    <p class="ov-status ${st.key}">${st.text}</p>
    <button type="button" class="button button-primary ov-drop" id="ov-drop"${st.key === 'locked' ? ' disabled' : ''}>${st.key === 'locked' ? '⌑ Terkunci' : 'Terjun ke sini ↓'}</button>`;
}

function selectIsland(id) {
  overview.selected = id;
  renderOverview();
}

ov.addEventListener('click', (e) => {
  const card = e.target.closest('[data-island]');
  if (card) { selectIsland(Number(card.dataset.island)); return; }
  if (e.target.closest('#ov-drop')) { const id = overview.selected; if (overview.onDrop) overview.onDrop(id); }
  if (e.target.closest('#ov-back') && overview.onBack) overview.onBack();
});

function showOverview({ onBack, onDrop } = {}) {
  overview.onBack = onBack;
  overview.onDrop = onDrop;
  const next = MISSIONS.find((m) => !game.state.posts[m.id].sealed && allowedSet().has(m.id));
  overview.selected = next ? next.id : 0;
  ov.hidden = false;
  document.body.classList.add('overview');
  renderOverview();
  if (gfx === '2d' || !built) { mode = 'overview'; return; }
  mode = 'overview';
  const f = frame(overview.selected);
  overview.focus.set(f.x, 0, f.z);
  self.obj.visible = false;
  start();
  setTimeout(() => { const b = ov.querySelector('.ov-card.selected'); if (b) b.focus(); }, 60);
}

function hideOverview() {
  ov.hidden = true;
  document.body.classList.remove('overview');
}

// ---------- Terjun ----------
const drop = { t: 0, island: 1, openLeaf: false, phase: 'fall', shake: 0 };

function startDrop(id, px, py) {
  hideOverview();
  allowedKey = '';
  refreshIslands(true);
  const f = frame(id);
  const st = W.stations.find((s) => s.id === id);
  const tx = px !== undefined ? toX(px) : st ? toX(st.x) : f.x;
  const tz = py !== undefined ? toZ(py) : st ? toZ(st.y) + 2 : f.z + 2;
  self.x = tx; self.z = tz; self.h = 48; self.vy = -20; self.grounded = false;
  self.island = id;
  self.obj.visible = true;
  cam.yaw = 0.25; cam.pitch = 0.55; cam.dist = 11;
  drop.t = 0; drop.island = id; drop.openLeaf = false; drop.phase = 'fall';
  mode = 'drop';
  landed = true;
  document.getElementById('w3-drophint').hidden = false;
  const m = missionOf(id);
  document.getElementById('w3-place').textContent = placeName(id);
  if (camera) camera.position.set(tx + 6, 70, tz + 14);
  // Nara turun lebih dulu dan menunggu di dekat titik pendaratan.
  nara.position.set(tx - 1.8, 0, tz + 0.8);
  start();
}

function updateDrop(dt) {
  drop.t += dt;
  const pose = drop.phase === 'fall' ? 'skydive' : 'glide';
  if (drop.phase === 'fall') {
    self.vy = Math.max(-26, self.vy - 18 * dt);
    if (self.h < 16 || drop.openLeaf) {
      drop.phase = 'glide';
      fx.ring({ x: self.x, y: self.h + 2, z: self.z }, { color: '#9ccc65', from: 0.5, to: 3, life: 0.5, y: 0 });
    }
  } else {
    self.vy += (-3.2 - self.vy) * Math.min(1, dt * 3);
    self.x += Math.sin(drop.t * 1.6) * 0.6 * dt;
  }
  self.h += self.vy * dt;
  self.face += dt * (drop.phase === 'fall' ? 1.2 : 0.4);
  if (self.h <= 0) {
    self.h = 0; self.vy = 0; self.grounded = true;
    self.obj.userData.land();
    fx.dust({ x: self.x, y: 0.1, z: self.z });
    fx.ring({ x: self.x, y: 0, z: self.z }, { color: '#ffffff', from: 0.3, to: 3.2, life: 0.6 });
    drop.shake = 0.35;
    mode = 'play';
    document.getElementById('w3-drophint').hidden = true;
    if (net) net.sendMove(toPx(self.x), toPy(self.z), 0);
    arrive(drop.island, true);
    if (!sessionStorage.getItem('nutrantara-tip-arah')) { try { sessionStorage.setItem('nutrantara-tip-arah', '1'); } catch { /* abaikan */ } setTimeout(() => game.showToast('Tip: ← → memutar arah hadap, ↑ ↓ maju/mundur, R/F menoleh ke atas/bawah. Arahkan kursor untuk menoleh, klik tanah untuk berjalan.'), 2500); }
  }
  self.obj.position.set(self.x, self.h, self.z);
  self.obj.rotation.y = self.face;
  self.obj.userData.animate(dt, { speed: 0, airborne: true, height: self.h, pose });
  // Kamera mengikuti dari atas, lalu turun ke posisi bermain.
  const k = Math.min(1, Math.max(0, 1 - self.h / 48));
  const target = new THREE.Vector3(self.x, self.h + 1, self.z);
  const desired = new THREE.Vector3(self.x + Math.sin(cam.yaw) * (7 + k * 4), self.h + 9 - k * 3.5, self.z + Math.cos(cam.yaw) * (7 + k * 4));
  camera.position.lerp(desired, Math.min(1, dt * 4));
  camera.lookAt(target);
}

function arrive(id, fromDrop) {
  const m = missionOf(id);
  if (m) {
    banner(`POS ${String(id).padStart(2, '0')} · ${m.location}`, `${m.title} ${m.titleEm}`);
    if (!visited.has(id)) {
      visited.add(id);
      const p = game.state.posts[id];
      const intro = p && p.sealed ? `Pos ${id} sudah kamu segel. Lihat-lihat lagi atau lanjut ke pulau berikutnya.` : m.type === 'project' ? m.nara.brief : `${m.nara.intro} Pindai Terminal Arsip untuk mengumpulkan bukti.`;
      setTimeout(() => say(nara, intro, 2.6, 'talk'), fromDrop ? 500 : 0);
    }
  } else if (W.isWild(id)) {
    const isl = islandOf(id);
    const found = discovered();
    const first = !found.includes(id);
    if (first) { found.push(id); saveDiscovered(found); }
    const total = W.islands.filter((i) => i.kind === 'wild').length;
    banner(`◆ ${isl.name.toUpperCase()}`, first ? `Pulau jelajah ditemukan! (${found.length}/${total})` : 'Pulau jelajah');
    if (!visited.has(id)) { visited.add(id); setTimeout(() => say(nara, `${isl.desc} Cari kepingan arsip yang tersembunyi di sini!`, 2.6, first ? 'celebrate' : 'talk'), fromDrop ? 500 : 0); }
  } else if (fromDrop || !visited.has(0)) {
    visited.add(0);
    banner('ALUN-ALUN NUSANTARA', 'Titik kumpul kelas');
    setTimeout(() => say(nara, 'Selamat datang di Alun-alun! Jembatan cahaya menghubungkan semua pulau pos. Ikuti panah emas.', 2.6, 'talk'), 400);
  }
  if (m && m.id === id) game.state.activePos = id;
}

// ---------- Simulasi bermain ----------
function updatePlay(dt) {
  let ix = 0; let iz = 0;
  let turn = 0; let ahead = 0;
  if (canMove()) {
    if (keys.has('f')) iz -= 1;
    if (keys.has('b')) iz += 1;
    if (keys.has('l')) ix -= 1;
    if (keys.has('r')) ix += 1;
    if (keys.has('tl')) turn += 1;
    if (keys.has('tr')) turn -= 1;
    if (keys.has('af')) ahead += 1;
    if (keys.has('ab')) ahead -= 1;
    ix += stick.x; iz += stick.y;
  }
  // R/PageUp menengadah, F/PageDown menunduk.
  if (keys.has('lu')) cam.pitch = Math.max(PITCH_MIN, cam.pitch - LOOK_SPEED * dt);
  if (keys.has('ld')) cam.pitch = Math.min(PITCH_MAX, cam.pitch + LOOK_SPEED * dt);
  // Tombol panah ←/→: memutar arah hadap; kamera ikut berputar ke belakang penjelajah.
  if (turn) {
    self.face += turn * TURN_SPEED * dt;
    let d = (self.face + Math.PI) - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    cam.yaw += d * Math.min(1, dt * 5);
    walkTo.point = null;
  }
  const len = Math.hypot(ix, iz);
  if (len > 1) { ix /= len; iz /= len; }
  const sin = Math.sin(cam.yaw); const cos = Math.cos(cam.yaw);
  let mx = ix * cos + iz * sin;
  let mz = -ix * sin + iz * cos;
  let faceMove = true;
  // Tombol panah ↑/↓: maju/mundur searah hadap (mundur tanpa berbalik badan).
  if (ahead) { mx += Math.sin(self.face) * ahead; mz += Math.cos(self.face) * ahead; if (ahead < 0 && !len) faceMove = false; walkTo.point = null; }
  // Klik tanah: berjalan ke titik tujuan.
  if (!len && !ahead && walkTo.point) {
    const dx = walkTo.point.x - self.x; const dz = walkTo.point.z - self.z; const d = Math.hypot(dx, dz);
    if (d < 0.35 || !canMove()) walkTo.point = null; else { mx = dx / d; mz = dz / d; }
  } else if (len) walkTo.point = null;
  const mlen = Math.hypot(mx, mz);
  if (mlen > 1) { mx /= mlen; mz /= mlen; }
  const moving = Math.hypot(mx, mz) > 0.05;
  const allowed = allowedSet();
  if (moving) {
    const sp = SPEED * (keys.has('run') ? SPRINT : 1);
    const c = W.clamp(toPx(self.x + mx * sp * dt), toPy(self.z + mz * sp * dt), allowed);
    self.x = toX(c.x); self.z = toZ(c.y);
    if (faceMove && !turn) {
      let diff = Math.atan2(mx, mz) - self.face;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      self.face += diff * Math.min(1, dt * 12);
    }
  } else if (aim.active && aim.point && performance.now() - aim.lastMove < 4000 && !panelOpen && !turn) {
    // Diam: penjelajah menoleh ke arah kursor.
    const dx = aim.point.x - self.x; const dz = aim.point.z - self.z;
    if (Math.hypot(dx, dz) > 0.6) { let diff = Math.atan2(dx, dz) - self.face; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); self.face += diff * Math.min(1, dt * 8); }
  }
  updateFacingMarkers(moving);
  self.speed += ((moving ? Math.min(1, Math.max(len, Math.hypot(mx, mz))) : 0) - self.speed) * Math.min(1, dt * 10);
  if (jumpQueued && self.grounded && canMove()) { self.vy = JUMP; self.grounded = false; }
  jumpQueued = false;
  const prevH = self.h;
  self.vy -= GRAVITY * dt;
  self.h += self.vy * dt;
  let floor = 0;
  platforms.forEach((p) => { if (Math.abs(self.x - p.x) <= p.hw + 0.2 && Math.abs(self.z - p.z) <= p.hd + 0.2 && prevH >= p.top - 0.05) floor = Math.max(floor, p.top); });
  if (self.h <= floor) {
    if (!self.grounded && prevH - floor > 0.6) fx.dust({ x: self.x, y: floor + 0.05, z: self.z });
    self.h = floor; self.vy = 0; self.grounded = true;
  } else self.grounded = false;

  // Debu langkah
  if (self.grounded && self.speed > 0.6 && Math.random() < dt * 4) fx.dust({ x: self.x, y: floor + 0.05, z: self.z });

  self.obj.position.set(self.x, self.h, self.z);
  self.obj.rotation.y = self.face;
  self.obj.userData.animate(dt, { speed: self.speed, airborne: !self.grounded, height: self.h - floor });
  const lookUp = Math.max(0, 0.25 - cam.pitch) / (0.25 - PITCH_MIN); // 0..1
  const lookDown = Math.max(0, cam.pitch - 0.85) / (PITCH_MAX - 0.85); // 0..1
  self.obj.userData.head.rotation.x = -lookUp * 0.55 + lookDown * 0.35;

  const isl = islandAt3(self.x, self.z);
  if (isl !== -1 && isl !== self.island) { self.island = isl; arrive(isl, false); }
  document.getElementById('w3-place').textContent = placeName(self.island);

  const now = performance.now();
  const px = Math.round(toPx(self.x)); const py = Math.round(toPy(self.z));
  const key = `${px},${py},${Math.round(self.h * 10)}`;
  if (now - lastSent > 100 && key !== lastKey) { lastSent = now; lastKey = key; if (net) net.sendMove(px, py, self.h); }

  // Nara mengikuti di samping penjelajah
  const off = new THREE.Vector3(-1.5, 0, 1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), self.face);
  const nx = self.x + off.x; const nz = self.z + off.z;
  const nd = Math.hypot(nx - nara.position.x, nz - nara.position.z);
  if (nd > 0.6) { nara.position.x += (nx - nara.position.x) * Math.min(1, dt * 2.2); nara.position.z += (nz - nara.position.z) * Math.min(1, dt * 2.2); }
  nara.position.y += ((self.h > 0.5 ? self.h * 0.7 : 0) - nara.position.y) * Math.min(1, dt * 3);
  const toSelf = Math.atan2(self.x - nara.position.x, self.z - nara.position.z);
  let nd2 = toSelf - nara.rotation.y; nd2 = Math.atan2(Math.sin(nd2), Math.cos(nd2));
  nara.rotation.y += nd2 * Math.min(1, dt * 4);

  updateShards(dt);
  updateNearby();
  updateCamera(dt);
  drawMinimap();
}

// ---------- Peta mini ----------
const minimapBtn = wrap.querySelector('#w3-minimap');
const minimapCanvas = minimapBtn.querySelector('canvas');
const mctx = minimapCanvas.getContext('2d');
let minimapAt = 0;
function toggleMinimap() { minimapBtn.classList.toggle('big'); minimapAt = 0; }
minimapBtn.addEventListener('click', () => { toggleMinimap(); if (renderer) renderer.domElement.focus(); });

function drawMinimap() {
  const now = performance.now();
  if (now - minimapAt < 100) return;
  minimapAt = now;
  const big = minimapBtn.classList.contains('big');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.max(120, Math.round(minimapBtn.clientWidth * dpr));
  const ch = Math.round((cw * W.height) / W.width);
  if (minimapCanvas.width !== cw || minimapCanvas.height !== ch) { minimapCanvas.width = cw; minimapCanvas.height = ch; }
  const s = cw / W.width;
  const u = 1 / s; // 1 piksel layar dalam satuan peta
  const g = mctx;
  g.setTransform(s, 0, 0, s, 0, 0);
  g.clearRect(0, 0, W.width, W.height);
  g.fillStyle = 'rgba(191,233,251,.92)';
  g.fillRect(0, 0, W.width, W.height);
  const allowed = allowedSet();
  const found = discovered();
  g.lineCap = 'round';
  W.bridges.forEach((br) => {
    const on = allowed.has(br.from) && allowed.has(br.to);
    g.strokeStyle = on ? '#1fc3d3' : 'rgba(110,125,122,.55)';
    g.lineWidth = Math.max(br.w * 0.8, 3 * u);
    if (!on) g.setLineDash([8 * u, 6 * u]);
    g.beginPath(); g.moveTo(br.a[0], br.a[1]); g.lineTo(br.b[0], br.b[1]); g.stroke();
    g.setLineDash([]);
  });
  W.islands.forEach((isl) => {
    const open = allowed.has(isl.id);
    const unknown = isl.kind === 'wild' && !found.includes(isl.id);
    g.fillStyle = !open ? '#9aa6a2' : unknown ? 'rgba(104,207,103,.45)' : '#68cf67';
    g.beginPath(); g.ellipse(isl.cx, isl.cy, isl.rx, isl.ry, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = open ? ISLAND_COLORS[isl.id] : '#56615f';
    g.lineWidth = 2.5 * u;
    g.stroke();
    // Penanda teks (bukan hanya warna): nomor pos, ◆ jelajah, ? belum ditemukan, ⌑ terkunci
    const sealed = W.isPost(isl.id) && game.state.posts[isl.id] && game.state.posts[isl.id].sealed;
    const mark = !open ? '⌑' : sealed ? '✓' : W.isPost(isl.id) ? String(isl.id) : isl.kind === 'wild' ? (unknown ? '?' : '◆') : '✳';
    g.fillStyle = '#3b2a1a';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round((big ? 15 : 12) * u)}px "Baloo 2", sans-serif`;
    g.fillText(mark, isl.cx, isl.cy);
    if (big) { g.font = `600 ${Math.round(11 * u)}px "DM Sans", sans-serif`; g.fillText(unknown ? '???' : isl.name, isl.cx, isl.cy + isl.ry * 0.55); }
  });
  // Tujuan berikutnya
  const goal = nextGoal();
  const gp = goal.item ? goal.item : goal.point;
  if (gp) {
    const gx = toPx(gp.x); const gy = toPy(gp.z);
    g.fillStyle = '#f5b72b'; g.strokeStyle = '#7a3f1c'; g.lineWidth = 1.5 * u;
    g.beginPath();
    for (let i = 0; i < 10; i += 1) { const r = (i % 2 ? 4 : 9) * u; const a = (i / 10) * Math.PI * 2 - Math.PI / 2; g.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke();
  }
  // Pemain lain
  if (net) net.players.forEach((p, id) => {
    if (p.zone !== 'world') return;
    const px = p.tx ?? p.x; const py = p.ty ?? p.y;
    g.fillStyle = p.color || '#68dce7'; g.beginPath(); g.arc(px, py, 3.5 * u, 0, Math.PI * 2); g.fill();
    if (net.isTeammate(id)) { g.strokeStyle = '#1f7a4f'; g.lineWidth = 2 * u; g.beginPath(); g.arc(px, py, 6.5 * u, 0, Math.PI * 2); g.stroke(); }
  });
  // Diri sendiri: panah sesuai arah hadap
  const px = toPx(self.x); const py = toPy(self.z);
  const fx2 = Math.sin(self.face); const fy2 = Math.cos(self.face);
  const r = 8 * u;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#e2553f'; g.lineWidth = 2.5 * u;
  g.beginPath();
  g.moveTo(px + fx2 * r, py + fy2 * r);
  g.lineTo(px - fx2 * r * 0.6 + fy2 * r * 0.6, py - fy2 * r * 0.6 - fx2 * r * 0.6);
  g.lineTo(px - fx2 * r * 0.6 - fy2 * r * 0.6, py - fy2 * r * 0.6 + fx2 * r * 0.6);
  g.closePath(); g.fill(); g.stroke();
}

function updateFacingMarkers(moving) {
  if (!facingArrow) return;
  const t = clock.elapsedTime;
  const dist = 1.75 + (moving ? 0.2 : Math.sin(t * 4) * 0.1);
  facingArrow.visible = mode === 'play';
  facingArrow.position.set(self.x + Math.sin(self.face) * dist, self.h + 0.06, self.z + Math.cos(self.face) * dist);
  facingArrow.rotation.set(-Math.PI / 2, self.face, 0);
  facingArrow.material.opacity = 0.75 + Math.sin(t * 4) * 0.15;
  const showAim = mode === 'play' && aim.active && aim.point && performance.now() - aim.lastMove < 4000 && !panelOpen;
  aimRing.visible = Boolean(showAim);
  if (showAim) { aimRing.position.set(aim.point.x, 0.06, aim.point.z); aimRing.scale.setScalar(1 + Math.sin(t * 6) * 0.08); }
  walkMarker.visible = Boolean(walkTo.point) && mode === 'play';
  if (walkTo.point) { walkMarker.position.set(walkTo.point.x, 0.07, walkTo.point.z); walkMarker.rotation.z = t * 2; }
}

function updateShards(dt) {
  shards.forEach((s) => {
    if (s.taken) return;
    s.obj.rotation.y += dt * 2;
    s.obj.position.y = s.y + Math.sin(clock.elapsedTime * 2 + s.id) * 0.12;
    if (Math.hypot(s.x - self.x, s.z - self.z) < 0.9 && Math.abs(self.h + 0.8 - s.obj.position.y) < 1.3) {
      s.taken = true;
      s.obj.visible = false;
      fx.sparkle({ x: s.x, y: s.obj.position.y, z: s.z });
      saveShards();
      updateShardHud();
      const n = shards.filter((x) => x.taken).length;
      game.showToast(n === shards.length ? `Semua ${n} kepingan arsip terkumpul! ✦` : `Kepingan arsip ditemukan! (${n}/${shards.length})`);
    }
  });
}

const shardKey = () => `nutrantara-shards-v1:${(game.state.alias || '').toLocaleLowerCase('id')}`;
function loadShards() {
  let taken = [];
  try { taken = JSON.parse(localStorage.getItem(shardKey())) || []; } catch { /* abaikan */ }
  shards.forEach((s) => { s.taken = taken.includes(s.id); s.obj.visible = !s.taken; });
  updateShardHud();
}
function saveShards() { try { localStorage.setItem(shardKey(), JSON.stringify(shards.filter((s) => s.taken).map((s) => s.id))); } catch { /* abaikan */ } }
function updateShardHud() { document.getElementById('w3-shards').textContent = String(shards.filter((s) => s.taken).length); }

function updateNearby() {
  let found = null;
  const it = quests.nearest(self.x, self.z, self.h);
  if (it) found = { kind: 'item', item: it, key: `${it.kind}${it.pos}${it.row ?? ''}` };
  else if (Math.hypot(nara.position.x - self.x, nara.position.z - self.z) < 2.2) found = { kind: 'nara', key: 'nara' };
  const prev = nearby === undefined ? 'init' : nearby ? nearby.key : 'none';
  nearby = found;
  if (found && found.kind === 'item') { promptEl.textContent = quests.hint(found.item); actionBtn.textContent = found.item.kind === 'terminal' ? 'Pindai' : found.item.kind === 'board' ? 'Buka papan' : found.item.kind === 'altar' ? 'Altar segel' : 'Buka dapur'; actionBtn.hidden = false; return; }
  if ((found ? found.key : 'none') === prev) return;
  if (!found) { promptEl.textContent = 'Jelajahi pulau. Ikuti panah emas ke tujuan berikutnya, dekati objek bercahaya, lalu tekan E.'; actionBtn.hidden = true; return; }
  promptEl.textContent = 'Nara ada di sampingmu. Tekan E untuk meminta arahan.';
  actionBtn.textContent = 'Tanya Nara';
  actionBtn.hidden = false;
}

function updateCamera(dt) {
  const target = new THREE.Vector3(self.x, self.h * 0.6 + 1.3, self.z);
  const p = Math.max(0.04, cam.pitch);
  const up = Math.max(0, 0.04 - cam.pitch); // seberapa jauh menengadah (0..0.54)
  const dist = cam.dist * (1 - up * 0.6);
  const off = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(p), Math.sin(p), Math.cos(cam.yaw) * Math.cos(p)).multiplyScalar(dist);
  const pos = target.clone().add(off);
  pos.y = Math.max(self.h + 0.5, pos.y - up * 2.2);
  target.y += up * 26; // titik pandang naik ke langit
  if (cam.pitch > 1.0) target.y -= (cam.pitch - 1.0) * 3; // menunduk lebih dalam
  camera.position.lerp(pos, Math.min(1, dt * 6));
  if (drop.shake > 0) { drop.shake -= dt; camera.position.x += (Math.random() - 0.5) * drop.shake; camera.position.y += (Math.random() - 0.5) * drop.shake; }
  camera.lookAt(target);
  if (sun.castShadow) { sun.target.position.set(self.x, 0, self.z); sun.position.copy(SUN_DIR).multiplyScalar(50).add(sun.target.position); }
}

function updateOverview(dt) {
  const f = frame(overview.selected);
  overview.target.set(f.x, 0, f.z);
  overview.focus.lerp(overview.target, Math.min(1, dt * 2.5));
  overview.yaw += dt * 0.04;
  const desired = overview.focus.clone().add(new THREE.Vector3(Math.sin(overview.yaw) * overview.dist * 0.75, overview.dist * 0.62, Math.cos(overview.yaw) * overview.dist * 0.75));
  camera.position.lerp(desired, Math.min(1, dt * 2.5));
  camera.lookAt(overview.focus);
  selectRing.visible = true;
  selectRing.scale.set(f.rx + 1.2, f.rz + 1.2, 1);
  selectRing.position.set(f.x, 0.3 + Math.sin(clock.elapsedTime * 3) * 0.15, f.z);
  if (sun.castShadow) { sun.target.position.copy(overview.focus); sun.position.copy(SUN_DIR).multiplyScalar(50).add(overview.focus); }
}

function updateOthers(dt) {
  if (!net) return;
  const seen = new Set();
  net.players.forEach((p, id) => {
    if (p.zone !== 'world') return;
    seen.add(id);
    let o = others.get(id);
    if (!o) {
      const obj = createExplorer(p.color);
      add(obj, toX(p.tx ?? p.x), 0, toZ(p.ty ?? p.y));
      o = { obj, label: null, labelText: '', x: obj.position.x, z: obj.position.z, h: 0, face: 0, speed: 0 };
      others.set(id, o);
      fx.ring({ x: o.x, y: 0, z: o.z }, { color: p.color.startsWith('#') ? p.color : PALETTE.cyan });
    }
    const tx = toX(p.tx ?? p.x); const tz = toZ(p.ty ?? p.y); const th = p.th || 0;
    const k = Math.min(1, dt * 10);
    const dx = (tx - o.x) * k; const dz = (tz - o.z) * k;
    if (Math.hypot(tx - o.x, tz - o.z) > 12) { o.x = tx; o.z = tz; } else { o.x += dx; o.z += dz; }
    o.h += (th - o.h) * Math.min(1, dt * 14);
    const sp = Math.hypot(dx, dz) / Math.max(dt, 0.001);
    o.speed += (Math.min(1, sp / SPEED) - o.speed) * Math.min(1, dt * 8);
    if (sp > 0.3) o.face = Math.atan2(dx, dz);
    o.obj.position.set(o.x, o.h, o.z);
    o.obj.rotation.y = o.face;
    o.obj.userData.animate(dt, { speed: o.speed, airborne: o.h > 0.05, height: o.h });
    const mate = net.isTeammate(id);
    const text = `${mate ? '🤝 ' : ''}${p.alias}${p.seals ? `  ✦${p.seals}` : ''}`;
    if (text !== o.labelText) {
      if (o.label) o.obj.remove(o.label);
      o.label = createLabel(text, mate ? { size: 24, color: '#78f4bd' } : { size: 24 });
      o.label.position.set(0, 2.55, 0);
      o.obj.add(o.label);
      o.labelText = text;
    }
  });
  others.forEach((o, id) => { if (!seen.has(id)) { scene.remove(o.obj); others.delete(id); } });
}

let selfLabelText = '';
function updateSelfLabel() {
  const text = `${game.state.alias || 'Kamu'}  ✦${game.sealCount()}`;
  if (text === selfLabelText) return;
  if (self.label) self.obj.remove(self.label);
  self.label = createLabel(text, { color: PALETTE.gold, size: 24 });
  self.label.position.set(0, 2.55, 0);
  self.obj.add(self.label);
  selfLabelText = text;
}

function updateGoal() {
  const goal = nextGoal();
  document.getElementById('w3-goal').textContent = goal.text;
  let p = null;
  if (goal.item) p = { x: goal.item.x, y: 3.6, z: goal.item.z };
  else if (goal.point) p = { x: goal.point.x, y: 9, z: goal.point.z };
  arrow.visible = Boolean(p) && mode === 'play';
  if (p) arrow.userData.base = p;
}

function animateWorld(dt) {
  const t = clock.elapsedTime;
  nara.userData.animate(dt);
  if (fx) fx.update(dt);
  if (quests) quests.update(dt, t);
  animated.forEach((o) => {
    if (o.userData.spin) o.rotation.y += dt * o.userData.spin;
    if (o.userData.bob) o.position.y = o.userData.bob + Math.sin(t * 1.5) * 0.15;
    if (o.userData.pulse) o.material.opacity = 0.45 + Math.sin(t * 3) * 0.15;
    if (o.userData.blink) o.visible = Math.sin(t * 4) > -0.3;
    if (o.userData.sway !== undefined) { o.rotation.y = Math.sin(t * 1.6 + o.userData.sway) * 0.35; o.rotation.z = Math.sin(t * 3.2 + o.userData.sway) * 0.05; }
    if (o.userData.gong) { const near = self.obj && Math.hypot(self.x - (o.parent.parent.position.x + o.parent.position.x), self.z - (o.parent.parent.position.z + o.parent.position.z)) < 3; o.scale.setScalar(near ? 1 + Math.abs(Math.sin(t * 10)) * 0.06 : 1); }
    if (o.userData.orbit) { const r = o.userData.orbit; o.position.set(Math.cos(t * r.s + r.o) * r.r, r.y + Math.sin(t * 2 + r.o) * 0.3, Math.sin(t * r.s + r.o) * r.r + 0.6); o.rotation.y += dt * 2; }
    if (o.userData.smoke !== undefined) { const k = (t * 0.35 + o.userData.smoke) % 1; o.position.set(-1.2 + k * 0.4, 1.6 + k * 2.4, -0.6); o.scale.setScalar(0.6 + k * 1.4); }
    if (o.userData.roll) o.rotation.z += dt * o.userData.roll;
    if (o.userData.tether) { const k = o.userData.tether; o.position.y = k.y + Math.sin(t * 1.2 + k.o) * 0.4; o.rotation.z = Math.sin(t * 1.7 + k.o) * 0.3; }
    if (o.userData.drift) { o.position.x += o.userData.drift * dt; if (o.position.x > 200) o.position.x = -200; }
    if (o.userData.kite) {
      const k = o.userData.kite; k.a += k.s * dt;
      o.position.set(Math.cos(k.a) * k.r, k.y + Math.sin(t * 1.3 + k.r) * 1.2, Math.sin(k.a) * k.r);
      o.rotation.set(Math.sin(t * 2 + k.r) * 0.15, -k.a, Math.sin(t * 1.7 + k.r) * 0.25);
      o.userData.tail.forEach((b, j) => { b.position.x = Math.sin(t * 5 + j * 0.8) * 0.12 * j; });
    }
    if (o.userData.pinisi) { const p = o.userData.pinisi; p.a += p.s * dt; o.position.set(Math.cos(p.a) * p.r, -11.2 + Math.sin(t + p.r) * 0.3, Math.sin(p.a) * p.r); o.rotation.y = -p.a; o.rotation.z = Math.sin(t * 0.9 + p.r) * 0.04; }
  });
  waterfalls.forEach((tex) => { tex.offset.y -= dt * 1.2; });
  if (cloudSea) cloudSea.userData.update(dt);
  domes.forEach((dome) => {
    const u = dome.userData;
    if (u.fade > 0) {
      u.fade -= dt * 0.8;
      const k = Math.max(0, u.fade);
      dome.scale.setScalar(1 + (1 - k) * 0.25);
      u.shell.material.opacity = 0.22 * k; u.wire.material.opacity = 0.25 * k; u.lock.material.opacity = k;
      if (u.fade <= 0) { dome.visible = false; dome.scale.setScalar(1); u.shell.material.opacity = 0.22; u.wire.material.opacity = 0.25; u.lock.material.opacity = 1; if (u.fade > -1) fx.sparkle({ x: dome.position.x, y: 2, z: dome.position.z }, PALETTE.cyan); u.fade = -1; }
    } else if (dome.visible) u.wire.rotation.y += dt * 0.1;
  });
  bridges3d.forEach((b) => {
    if (b.lightT < 0) return;
    b.lightT += dt;
    b.tiles.forEach((tile) => { if (tile.userData.delay >= 0) tile.material.emissiveIntensity = Math.min(0.5, Math.max(0, (b.lightT - tile.userData.delay) * 3)) + (b.lightT - tile.userData.delay > 0 && b.lightT - tile.userData.delay < 0.3 ? 1 : 0); });
    if (b.lightT > b.tiles.length * 0.12 + 0.5) { b.lightT = -1; b.tiles.forEach((tile) => { tile.material.emissiveIntensity = 0.5; }); }
  });
  if (arrow && arrow.visible && arrow.userData.base) { const p = arrow.userData.base; arrow.position.set(p.x, p.y + Math.sin(t * 4) * 0.3, p.z); arrow.rotation.y += dt * 3; }
  if (gfx === 'high' && t % 1 < dt) refreshIslands();
  const now = performance.now();
  for (let i = bubbles.length - 1; i >= 0; i -= 1) {
    const b = bubbles[i];
    if (b.until < now || !b.follow.parent) { scene.remove(b.sprite); bubbles.splice(i, 1); continue; }
    b.sprite.position.set(b.follow.position.x, b.follow.position.y + b.height + 0.4, b.follow.position.z);
  }
}

function resize() {
  const r = wrap.getBoundingClientRect();
  const w = Math.max(320, Math.round(r.width));
  const h = Math.max(240, Math.round(r.height));
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x !== w || size.y !== h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
}

function frameLoop() {
  if (!running) return;
  const dt = Math.min(0.05, clock.getDelta());
  statusTimer -= dt;
  if (statusTimer <= 0) { statusTimer = 0.5; quests.refresh(); refreshIslands(); updateSelfLabel(); updateGoal(); }
  if (mode === 'overview') updateOverview(dt);
  else if (mode === 'drop') updateDrop(dt);
  else if (mode === 'play') updatePlay(dt);
  if (mode !== 'overview') selectRing.visible = false;
  updateOthers(dt);
  animateWorld(dt);
  resize();
  renderer.render(scene, camera);
  requestAnimationFrame(frameLoop);
}

function start() {
  if (gfx === '2d' || !built) return;
  if (running) return;
  applyQuality();
  loadShards();
  selfLabelText = '';
  statusTimer = 0;
  nearby = undefined;
  running = true;
  clock.getDelta();
  requestAnimationFrame(frameLoop);
}

function stop() { running = false; keys.clear(); stick.x = stick.y = 0; nearby = null; walkTo.point = null; aim.active = false; if (quests) quests.closePanel(true); panelOpen = false; }

function applyMode(prev) {
  const is3d = gfx !== '2d';
  window.NUTRA_WORLD_MODE = is3d ? '3d' : '2d';
  wrap.hidden = !is3d;
  canvas2d.hidden = is3d;
  document.querySelector('.world-screen').classList.toggle('is-3d', is3d);
  renderGfxBar();
  if (prev && prev !== gfx) {
    game.showToast(gfx === '2d' ? 'Mode 2D aktif.' : gfx === 'high' ? 'Grafis 3D tinggi aktif.' : 'Grafis 3D ringan aktif (hemat baterai).');
    if (is3d && !built) { prepare().then(() => { if (landed && game.visibleScreen === 'world') { mode = 'play'; start(); } }); return; }
  }
  const visible = game.visibleScreen === 'world';
  if (is3d) {
    if (window.NutraWorld2D) window.NutraWorld2D.stop();
    if (visible && landed) { stop(); mode = 'play'; start(); }
  } else {
    stop();
    if (visible && landed && window.NutraWorld2D) window.NutraWorld2D.start();
  }
}

gfxBar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-gfx]');
  if (!b || b.disabled) return;
  const prev = gfx;
  gfx = b.dataset.gfx;
  localStorage.setItem(GFX_KEY, gfx);
  applyMode(prev);
});

document.addEventListener('nutra:screen', (e) => {
  if (e.detail === 'world' && landed && gfx !== '2d') { if (window.NutraWorld2D) window.NutraWorld2D.stop(); if (mode === 'off') mode = 'play'; start(); }
  else if (e.detail !== 'world') stop();
});

if (net) {
  net.on('welcome', ({ you }) => { if (self.obj) self.obj.userData.setColor(you.color); });
  net.on('teleport', ({ x, y }) => { if (built && gfx !== '2d' && mode === 'play') { self.x = toX(x); self.z = toZ(y); self.h = 0; fx.ring({ x: self.x, y: 0, z: self.z }); game.showToast('Guru memindahkan posisimu.'); } });
  net.on('chat', (entry) => {
    if (!built || gfx === '2d') return;
    const target = net.me && entry.playerId === net.me.id ? self.obj : others.get(entry.playerId) && others.get(entry.playerId).obj;
    if (target) say(target, entry.text, 2.6);
  });
  net.on('emote', ({ id, emote }) => { const o = others.get(id); if (o) o.obj.userData.emote(emote); });
  net.on('settings', () => { statusTimer = 0; });
}

window.NutraWorld3D = {
  get supported() { return gfx !== '2d'; },
  get mode() { return mode; },
  get landed() { return landed; },
  prepare,
  showOverview,
  hideOverview,
  /** Terjun ke pulau (posisi px opsional dari server). */
  dropTo(id, px, py) {
    if (gfx === '2d' || !built) { hideOverview(); landed = true; mode = 'play'; return false; }
    startDrop(id, px, py);
    return true;
  },
  leave() { stop(); mode = 'off'; landed = false; hideOverview(); visited.clear(); },
  /** Untuk uji otomatis (QA): akses posisi pemain & interaksi. */
  debug: { get self() { return self; }, get nearby() { return nearby; }, interact: () => interact(), get items() { return quests ? quests.items.map(({ kind, pos, row, x, z }) => ({ kind, pos, row, x, z })) : []; } },
  stop
};

applyMode();
