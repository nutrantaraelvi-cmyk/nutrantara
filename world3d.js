/*
 * Dunia 3D NUTRANTARA — Kepulauan melayang di atas awan.
 * Alun-alun Nusantara di tengah, enam pulau pos dan enam pulau jelajah bebas, dihubungkan jembatan cahaya.
 * Mode: 'overview' (pilih map) → 'drop' (terjun dengan daun pisang) → 'play' (jelajah & misi di dalam dunia).
 * Koordinat server tetap 2D (world-data.js, 32400×15200); di sini dipetakan ke ruang 3D (1 px = 0,1 satuan ≈ 0,1 m).
 * Sejak 0.9 tiap pos adalah wilayah dunia terbuka ±1000 × 650 m; isinya dibangun di region.js.
 * Sejak 1.1 wilayah pos bermedan blok (terrain.js: bukit, gunung, lembah, danau, struktur) dan tiap pulau punya
 * cuaca bergilir (weather.js); sejak 1.4 tiap pulau juga bermusim (warna daun, buah, salju, serakan). Penjelajah naik/turun 1 blok otomatis, melompati 2 blok, dan berenang di air.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { createExplorer, createNara, createLabel, createBubble, toon, PALETTE } from './characters.js';
import { createFx } from './fx.js';
import { createQuests } from './quest.js';
import { buildRegion } from './region.js';
import { createTerrain } from './terrain.js';
import { createWeather, forecast, WEATHER, seasonOf } from './weather.js';
import { applyOutfit, clothMaterial } from './fashion.js';
import { createBoss } from './boss3d.js';
import { createKampung } from './kampung3d.js';
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
const STEP_UP = 1.05; // undakan 1 blok dinaiki/dituruni otomatis
const SWIM_Y = -1;    // di air yang lebih dalam, penjelajah berenang di ketinggian ini
const SWIM_SPEED = 0.6;
const islandOf = (id) => W.islands.find((x) => x.id === id);
const HALF_W = (W.width * S) / 2; // setengah lebar peta dalam meter
const HALF_H = (W.height * S) / 2;
const isBig = (f) => f.rx > 60; // wilayah pos dunia terbuka
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
// Tinggi blok medan (0 di luar wilayah pos) dan lantai pijakan: di air dalam, penjelajah berenang di SWIM_Y.
const terrainH = (x, z) => (terrain ? terrain.heightAt(x, z) : 0);
const groundAt = (x, z) => Math.max(SWIM_Y, terrainH(x, z));
const inWater = (x, z) => terrainH(x, z) < 0;

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
      <div class="w3-chip w3-weather" id="w3-weather" title="Cuaca pulau ini dan cuaca berikutnya">—</div>
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
    <div class="w3-buttons"><button type="button" id="w3-lock" tabindex="-1">BIDIK</button><button type="button" id="w3-jump" tabindex="-1">LOMPAT</button><button type="button" id="w3-act" tabindex="-1">AKSI</button></div>
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
    : '<b>Gerak:</b> <kbd>W A S D</kbd> berjalan searah kamera · <kbd>Shift</kbd> berlari · <kbd>Spasi</kbd> lompat · <kbd>E</kbd> interaksi · <kbd>← →</kbd> memutar arah hadap · <kbd>↑ ↓</kbd> maju/mundur · klik tanah = jalan ke sana. <b>Kamera:</b> <kbd>K</kbd> ganti mode (Orbit, Bahu, Isometrik, Orang Pertama) · tahan klik kanan/tengah atau seret = putar (Isometrik: seret = geser layar) · gulir = zoom · <kbd>V</kbd> kamera bebas (mouse) · <kbd>Q</kbd> kunci target · <kbd>C</kbd> reset kamera · <kbd>R</kbd>/<kbd>F</kbd> menoleh atas/bawah (Isometrik: miringkan sampai top-down). <kbd>M</kbd> peta mini besar · <kbd>1–4</kbd> emote · gamepad didukung · <button type="button" class="link-button" data-screen="map">Peta</button>';
}

// ---------- Three.js ----------
let renderer = null;
let scene;
let camera;
let sun;
let hemi;
let skyDome;
let fx;
let quests;
let terrain = null;
let weather = null;
let weatherIsland = 0; // pulau terakhir yang dipijak (cuaca tetap terasa di atas jembatan)
const regionTops = []; // permukaan datar wilayah pos, disembunyikan saat medan blok tampil
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
let horizon;
let beacon;
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
  renderer.domElement.setAttribute('aria-label', 'Kepulauan NUTRANTARA 3D. W A S D untuk berjalan, spasi melompat, E berinteraksi, Q mengunci kamera ke objek misi, C mengembalikan kamera ke belakang penjelajah, 1 sampai 4 untuk emote.');
  renderer.domElement.setAttribute('aria-describedby', 'world-prompt');
  wrap.prepend(renderer.domElement);
  scene = new THREE.Scene();
  const sky = new THREE.Color('#86d4f7');
  scene.background = sky;
  scene.fog = new THREE.Fog('#bfe9fb', 110, 330);
  skyDome = createSkyDome({ radius: 650, horizon: '#bfe9fb' });
  scene.add(skyDome);
  camera = new THREE.PerspectiveCamera(50, 16 / 9, PLAY_VIEW.near, PLAY_VIEW.far);
  hemi = new THREE.HemisphereLight('#fffaf0', '#5aa86a', 1.9);
  scene.add(hemi);
  sun = new THREE.DirectionalLight('#ffe9b8', 2.5);
  sun.position.copy(SUN_DIR).multiplyScalar(50);
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  fx = createFx(scene);
  weather = createWeather({ scene, sky: skyDome, hemi, sun, gfx, reduce: motionMQ.matches });
  bindInput(renderer.domElement);
  return true;
}

// Rentang pandang: dekat saat bermain (kabut menutup wilayah jauh), jauh saat melihat peta dari atas.
const PLAY_VIEW = { near: 0.1, far: 800, fogNear: 110, fogFar: 330 };
// 3D Ringan: medan blok dimuat dalam radius lebih kecil, jadi kabut juga lebih dekat.
const PLAY_VIEW_LOW = { near: 0.1, far: 600, fogNear: 80, fogFar: 235 };
const playView = () => (gfx === 'low' ? PLAY_VIEW_LOW : PLAY_VIEW);
// Isometrik: kamera jauh di atas, jadi kabut dimulai sesudah jarak kamera agar area sekitar tetap jelas.
const ISO_VIEW = { near: 0.1, far: 800, fogNear: 0, fogFar: 0 };
function isoView() { const v = playView(); ISO_VIEW.far = v.far; ISO_VIEW.fogNear = cam.dist + v.fogNear * 0.64; ISO_VIEW.fogFar = cam.dist + v.fogFar * 0.9; return ISO_VIEW; }
// Jarak kabut dasar; cuaca (weather.js) mengalikannya setiap bingkai.
const viewFog = { near: 110, far: 330 };
function setView(v) {
  viewFog.near = v.fogNear; viewFog.far = v.fogFar;
  if (camera.near === v.near && camera.far === v.far) return;
  camera.near = v.near; camera.far = v.far; camera.updateProjectionMatrix();
}

function applyQuality() {
  if (!renderer) return;
  const high = gfx === 'high';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1));
  renderer.shadowMap.enabled = high;
  sun.castShadow = high;
  if (terrain) terrain.setQuality(gfx);
  if (weather) weather.setQuality(gfx);
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
  const big = isBig(f);
  const seg = big ? 200 : 48; // tepi wilayah besar harus halus agar sama dengan batas gerak elips
  // Wilayah pos: tepi pasir & tebing tanpa tutup, agar danau dan lembah medan blok tidak tertutup cakram.
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.97, 0.5, seg, 1, big), toon('#ecd8a0', big ? { side: THREE.DoubleSide } : {}));
  sand.scale.set(f.rx + 0.6, 1, f.rz + 0.6);
  add(sand, 0, -0.32, 0, g);
  const sea = seasonOf(isl.id).ground; // rumput ikut musim pulau
  const top = cyl(1, 1, 0.5, `#${new THREE.Color(isl.id === 0 ? '#74d46f' : isl.id === 10 ? '#ecd79a' : '#68cf67').lerp(new THREE.Color(sea[0]), sea[1] * (isl.id === 10 ? 0.4 : 1)).getHexString()}`, seg); top.scale.set(f.rx, 1, f.rz);
  add(top, 0, -0.25, 0, g);
  top.userData.islandId = isl.id;
  islandTops.push(top);
  if (big) regionTops.push(top);
  // Tebing berlapis
  const layers = [[1.02, 0.82, 2.4, '#8b6b4e'], [0.82, 0.5, 2.8, '#735a45'], [0.5, 0.12, 3.6, '#5e4a3b']].map(([rt, rb, h, c]) => [rt, rb, big ? h * 4 : h, c]);
  let y = -0.57;
  layers.forEach(([rt, rb, h, c]) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, big ? 64 : 14, 1, big), toon(c));
    l.scale.set(f.rx + 0.6, 1, f.rz + 0.6);
    y -= h / 2;
    add(l, 0, y, 0, g);
    y -= h / 2;
  });
  for (let i = 0; i < (big ? 90 : 10); i += 1) {
    const a = rand() * Math.PI * 2;
    const r = add(new THREE.Mesh(new THREE.DodecahedronGeometry((0.5 + rand() * 0.7) * (big ? 4 : 1), 0), toon(rand() < 0.5 ? '#7d6a5a' : '#94857a')), Math.cos(a) * (f.rx + 0.4), (-0.9 - rand() * 2) * (big ? 3 : 1), Math.sin(a) * (f.rz + 0.4), g);
    r.rotation.set(rand(), rand(), rand());
  }
  // Akar & sulur menggantung
  for (let i = 0; i < (big ? 70 : 8); i += 1) {
    const a = rand() * Math.PI * 2;
    const len = (1 + rand() * 2.5) * (big ? 2.5 : 1);
    add(cyl(0.05, 0.02, len, '#3f8a4c', 4), Math.cos(a) * (f.rx + 0.5), -0.6 - len / 2, Math.sin(a) * (f.rz + 0.5), g);
  }
  // Air terjun di beberapa pulau
  const falls = big ? [0.4, 1.6, 2.9, 4.3, 5.4] : [0, 1, 3, 5, 6, 7, 8, 9, 11].includes(isl.id) ? [isl.id === 0 ? 1.9 : 1.2 + rand() * 0.7] : [];
  falls.forEach((a) => {
    const wx = Math.cos(a) * (f.rx + 0.62); const wz = Math.sin(a) * (f.rz + 0.62);
    const tex = waterfallTexture();
    const fh = big ? 30 : 10;
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(big ? 6 : 1.4, fh), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    fall.position.set(wx, -fh / 2, wz);
    fall.lookAt(wx * 3, -fh / 2, wz * 3);
    fall.castShadow = false;
    g.add(fall);
    waterfalls.push(tex);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(big ? 3 : 0.9, 16), new THREE.MeshBasicMaterial({ color: '#8fdcef' }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(big ? Math.cos(a) * (f.rx - 4) : wx * 0.92, 0.02, big ? Math.sin(a) * (f.rz - 4) : wz * 0.92);
    g.add(pool);
  });
  g.position.set(f.x, 0, f.z);
  scene.add(g);

  // Kubah kunci (hanya pulau pos)
  if (W.isPost(isl.id)) {
    const dome = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9fd8e0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    shell.scale.set(f.rx + 0.4, big ? 70 : Math.min(f.rx, f.rz) * 1.1, f.rz + 0.4);
    const wire = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8fbff', wireframe: true, transparent: true, opacity: 0.25 }));
    wire.scale.copy(shell.scale);
    const lock = createLabel(`🔒 POS ${isl.id} TERKUNCI`, { color: PALETTE.gold, size: 30, scale: big ? 0.09 : 0.014 });
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
  if (big) { name.scale.multiplyScalar(1.8); name.position.set(f.x, 13, f.z - 14); } else name.position.set(f.x, isl.id === 0 ? 7 : 8.5, f.z - f.rz * 0.45);
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
  else g.position.set(f.x, 0, f.z - (isBig(f) ? 8 : f.rz * 0.5));
  scene.add(g);
  g.traverse((o) => { if (o.userData.spin || o.userData.bob || o.userData.pulse || o.userData.orbit || o.userData.smoke !== undefined || o.userData.blink || o.userData.sway !== undefined || o.userData.gong) animated.push(o); });
}

function buildBridges() {
  W.bridges.forEach((br) => {
    const a = new THREE.Vector3(toX(br.a[0]), 0, toZ(br.a[1]));
    const b = new THREE.Vector3(toX(br.b[0]), 0, toZ(br.b[1]));
    const len = a.distanceTo(b);
    const n = Math.min(60, Math.max(3, Math.ceil(len / 1.15))); // jembatan panjang memakai ubin lebih panjang
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
    if (isBig(f)) return; // wilayah pos diisi region.js
    const count = isl.id === 0 ? 30 : W.isPost(isl.id) ? 10 : 16;
    for (let i = 0; i < count; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = 0.78 + rand() * 0.14;
      const x = f.x + Math.cos(a) * f.rx * r; const z = f.z + Math.sin(a) * f.rz * r;
      if (W.bridges.some((br) => { const ax = toX(br.a[0]); const az = toZ(br.a[1]); const bx = toX(br.b[0]); const bz = toZ(br.b[1]); return Math.hypot(ax - x, az - z) < 3 || Math.hypot(bx - x, bz - z) < 3; })) continue;
      const k = rand();
      if (k < 0.4) buildPalm(x, z, 0.8 + rand() * 0.4);
      else if (k < 0.7) { const lv = seasonOf(isl.id).leaf; add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rand() * 0.35, 0), toon(rand() < 0.5 ? lv[0] : lv[lv.length - 1])), x, 0.25, z); }
      else { const fl = new THREE.Group(); add(cyl(0.02, 0.02, 0.3, '#3f9a5a', 4), 0, 0.15, 0, fl); add(sph(0.11, ['#ff9f91', '#ffd17c', '#ffffff', '#f59e5b'][Math.floor(rand() * 4)], 6), 0, 0.33, 0, fl); add(fl, x, 0, z); }
    }
  });
  W.trees.forEach(([tx, ty]) => {
    const x = toX(tx); const z = toZ(ty);
    if (W.islandAt(tx, ty) === 0) buildPalm(x, z, 1 + rand() * 0.3);
  });
}

// ---------- Musim di pulau kecil (alun-alun & pulau jelajah, sejak 1.4) ----------
// Pohon bulat, semak, batu, bunga, serakan tanah, dan benda musim (buah, topi salju, jamur, jerami, boneka salju).
// Semua jenis digabung per InstancedMesh untuk seluruh peta (±20 panggilan gambar). Benih sendiri per pulau, jadi
// urutan rand() global (dan posisi benda lain) tidak bergeser.
function buildSeasonDecor() {
  const lists = {};
  const put = (k, x, y, z, s, rot, color) => (lists[k] || (lists[k] = [])).push({ x, y, z, s, rot, color });
  const nearBridge = (x, z, d) => W.bridges.some((br) => Math.hypot(toX(br.a[0]) - x, toZ(br.a[1]) - z) < d || Math.hypot(toX(br.b[0]) - x, toZ(br.b[1]) - z) < d);
  W.islands.forEach((isl) => {
    const f = frame(isl.id);
    if (isBig(f)) return; // wilayah pos diisi region.js
    const season = seasonOf(isl.id);
    let seed = 9100 + isl.id * 131;
    const r = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
    const free = (x, z, pad) => !platforms.some((p) => Math.abs(p.x - x) < p.hw + pad && Math.abs(p.z - z) < p.hd + pad)
      && !wildShards.some(([sx, , sz]) => Math.hypot(sx - x, sz - z) < 1.6 + pad)
      && !nearBridge(x, z, 3 + pad)
      && !(isl.id === 0 && (Math.hypot(x - (f.x + 11), z - (f.z + 6.5)) < 4.5 + pad || Math.hypot(x - toX(W.nara.x), z - toZ(W.nara.y)) < 2.5 + pad));
    const spot = (r0, r1, pad) => {
      for (let k = 0; k < 24; k += 1) {
        const a = r() * Math.PI * 2; const rr = r0 + r() * (r1 - r0);
        const x = f.x + Math.cos(a) * f.rx * rr; const z = f.z + Math.sin(a) * f.rz * rr;
        if (free(x, z, pad)) return { x, z };
      }
      return null;
    };
    const big = isl.id === 0;
    for (let i = 0; i < (big ? 16 : 11); i += 1) {
      const p = spot(0.68, 0.9, 1);
      if (!p) continue;
      const s = 0.75 + r() * 0.5; const rot = r() * Math.PI * 2;
      const crown = season.bloom && r() < 0.45 ? pick(season.bloom) : pick(season.leaf);
      put('trunk', p.x, 0, p.z, s, rot, '#8a5f37');
      put('crown', p.x, 0, p.z, s, rot, crown);
      put('crown2', p.x, 0, p.z, s, rot, crown);
      if (season.snow) { put('snowcap', p.x, 0, p.z, s, rot, '#ffffff'); put('snowcap2', p.x, 0, p.z, s, rot, '#ffffff'); }
      if (season.fruit) [[0.75, 1.8, 0.3], [-0.5, 1.9, 0.65], [0.1, 1.7, -0.8], [0.6, 2.4, 0.6]].forEach(([ox, oy, oz]) => put('fruit', p.x + (Math.cos(rot) * ox + Math.sin(rot) * oz) * s, oy * s, p.z + (-Math.sin(rot) * ox + Math.cos(rot) * oz) * s, 1, 0, pick(season.fruit)));
    }
    for (let i = 0; i < (big ? 18 : 12); i += 1) {
      const p = spot(0.55, 0.93, 0.5);
      if (!p) continue;
      const s = 0.7 + r() * 0.6; const rot = r() * Math.PI * 2;
      put('bush', p.x, 0, p.z, s, rot, pick(season.leaf));
      if (season.snow) put('bushcap', p.x, 0, p.z, s, rot, '#ffffff');
    }
    for (let i = 0; i < 5; i += 1) { const p = spot(0.6, 0.94, 0.4); if (p) put('rock', p.x, 0, p.z, 0.7 + r() * 0.8, r() * 6, r() < 0.5 ? '#94908a' : '#7d776f'); }
    for (let i = 0; i < (big ? 36 : 22); i += 1) { const p = spot(0.3, 0.94, 0.2); if (p) { const s = 0.8 + r() * 0.4; put('stem', p.x, 0, p.z, s, 0, '#3f9a5a'); put('bloom', p.x, 0, p.z, s, 0, pick(season.flowers)); } }
    const coverScale = season.snow ? 3 : season.puddle ? 2.4 : 1;
    for (let i = 0; i < Math.round((big ? 70 : 45) * season.coverN); i += 1) { const p = spot(0.15, 0.94, 0); if (p) put(season.puddle ? 'puddle' : 'cover', p.x, 0, p.z, coverScale * (0.7 + r() * 0.6), r() * 6, pick(season.cover)); }
    if (season.mushrooms) for (let i = 0; i < 8; i += 1) { const p = spot(0.6, 0.92, 0.2); if (p) { const s = 0.8 + r() * 0.6; put('mstem', p.x, 0, p.z, s, 0, '#f6efe2'); put('mcap', p.x, 0, p.z, s, 0, pick(['#e5533f', '#f5d43b', '#c98a5a'])); } }
    if (season.hay) for (let i = 0; i < 3; i += 1) { const p = spot(0.7, 0.9, 1); if (p) { put('hay', p.x, 0, p.z, 0.9 + r() * 0.3, r() * 6, '#e2c25a'); put('hayTop', p.x, 0, p.z, 0.9 + r() * 0.3, 0, '#d4b04a'); } }
    if (season.snow) for (let i = 0; i < 2; i += 1) { const p = spot(0.6, 0.85, 1); if (p) { const rot = r() * Math.PI * 2; ['sm1', 'sm2', 'sm3'].forEach((k) => put(k, p.x, 0, p.z, 1, rot, '#ffffff')); put('nose', p.x, 0, p.z, 1, rot, '#f08a3c'); } }
  });
  const half = (rad, h) => new THREE.SphereGeometry(rad, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, h, 1);
  const GEO = {
    trunk: () => new THREE.CylinderGeometry(0.12, 0.17, 1.5, 6).translate(0, 0.75, 0),
    crown: () => new THREE.IcosahedronGeometry(0.95, 0).translate(0, 2, 0),
    crown2: () => new THREE.IcosahedronGeometry(0.6, 0).translate(0.35, 2.65, 0.1),
    snowcap: () => half(0.82, 0.45).translate(0, 2.5, 0),
    snowcap2: () => half(0.52, 0.5).translate(0.35, 3.0, 0.1),
    fruit: () => new THREE.SphereGeometry(0.16, 6, 4),
    bush: () => new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.32, 0),
    bushcap: () => half(0.44, 0.5).translate(0, 0.55, 0),
    rock: () => new THREE.DodecahedronGeometry(0.4, 0).translate(0, 0.18, 0),
    stem: () => new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4).translate(0, 0.15, 0),
    bloom: () => new THREE.SphereGeometry(0.11, 6, 4).translate(0, 0.33, 0),
    cover: () => new THREE.CircleGeometry(0.32, 5).rotateX(-Math.PI / 2).translate(0, 0.025, 0),
    puddle: () => new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2).scale(1, 1, 0.65).translate(0, 0.022, 0),
    mstem: () => new THREE.CylinderGeometry(0.05, 0.06, 0.22, 6).translate(0, 0.11, 0),
    mcap: () => half(0.2, 0.7).translate(0, 0.2, 0),
    hay: () => new THREE.CylinderGeometry(0.7, 0.8, 0.9, 8).translate(0, 0.45, 0),
    hayTop: () => new THREE.ConeGeometry(0.78, 0.65, 8).translate(0, 1.22, 0),
    sm1: () => new THREE.SphereGeometry(0.45, 10, 8).translate(0, 0.4, 0),
    sm2: () => new THREE.SphereGeometry(0.32, 10, 8).translate(0, 1.05, 0),
    sm3: () => new THREE.SphereGeometry(0.22, 10, 8).translate(0, 1.5, 0),
    nose: () => new THREE.ConeGeometry(0.05, 0.25, 5).rotateX(Math.PI / 2).translate(0, 1.5, 0.3)
  };
  const SHADOW = new Set(['trunk', 'crown', 'crown2', 'hay', 'sm1', 'sm2']);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const c = new THREE.Color(); const v = new THREE.Vector3(); const sc = new THREE.Vector3();
  Object.entries(lists).forEach(([k, list]) => {
    const mesh = new THREE.InstancedMesh(GEO[k](), toon('#ffffff', { unique: true }), list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot);
      mesh.setMatrixAt(i, m.compose(v.set(t.x, t.y, t.z), q, sc.setScalar(t.s)));
      mesh.setColorAt(i, c.set(t.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = gfx === 'high' && SHADOW.has(k);
    scene.add(mesh);
  });
}

// ---------- Butik Nusantara: kios toko busana di Alun-alun (sejak 1.2) ----------
// Manekin di kios berganti busana contoh setiap beberapa detik; dekati lalu tekan E untuk membuka layar Toko.
const SHOWCASE = [
  { kepala: 'siger', baju: 'songket', leher: 'ulos', punggung: 'payung' },
  { kepala: 'kamboja', baju: 'megamendung', leher: 'melati', punggung: 'layangan' },
  { kepala: 'blangkon', baju: 'parang', leher: 'manik', punggung: 'noken' },
  { kepala: 'udeng', baju: 'tenun-ikat', leher: 'selendang', punggung: 'bakul' }
];
let boutique = null;
function buildBoutique() {
  const f = frame(0);
  const lx = 11; const lz = 6.5; // sisi timur alun-alun, area yang masih lapang
  const g = new THREE.Group();
  g.position.set(f.x + lx, 0, f.z + lz);
  g.rotation.y = Math.atan2(-lx, -lz); // menghadap pusat alun-alun
  add(box(5.2, 0.06, 3.8, '#d9b68a'), 0, 0.03, 0, g);
  [[-2.3, -1.6], [2.3, -1.6], [-2.3, 1.6], [2.3, 1.6]].forEach(([x, z]) => add(cyl(0.09, 0.11, 2.9, '#8a5a35', 8), x, 1.45, z, g));
  const roof = add(new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.3, 4), toon('#c0573a')), 0, 3.55, 0, g);
  roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.8);
  const crown = add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.7, 4), toon('#9e4630')), 0, 4.4, 0, g);
  crown.rotation.y = Math.PI / 4;
  add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.6), new THREE.MeshToonMaterial({ map: kawungTexture('#f6e3b8', '#b0743a', 2) })), 1.05, 0.5, 1.15, g);
  const rail = add(cyl(0.04, 0.04, 3.9, '#7a4a24', 6), 0, 2.3, -1.35, g);
  rail.rotation.z = Math.PI / 2;
  ['kawung', 'parang', 'megamendung', 'tenun-ikat', 'songket'].forEach((id, i) => add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.05, 0.04), clothMaterial(id)), -1.6 + i * 0.8, 1.72, -1.35, g));
  add(cyl(0.45, 0.5, 0.2, '#f5e6c8', 20), -1.25, 0.13, 0.25, g);
  const manikin = createExplorer('#f5b72b');
  add(manikin, -1.25, 0.23, 0.25, g);
  applyOutfit(manikin, SHOWCASE[0]);
  const sign = createLabel('🛍 BUTIK NUSANTARA', { color: '#7a3f1c', bg: 'rgba(255,244,220,.95)', size: 28, scale: 0.012 });
  sign.position.set(0, 4.95, 0);
  g.add(sign);
  scene.add(g);
  boutique = { group: g, manikin, x: g.position.x, z: g.position.z, look: 0, t: 0, waved: 0 };
}
function animateBoutique(dt) {
  if (!boutique) return;
  const b = boutique;
  b.t += dt;
  b.manikin.rotation.y += dt * 0.6;
  b.manikin.userData.animate(dt, { speed: 0 });
  if (b.t > 6) { b.t = 0; b.look = (b.look + 1) % SHOWCASE.length; applyOutfit(b.manikin, SHOWCASE[b.look]); }
  const near = mode === 'play' && Math.hypot(b.x - self.x, b.z - self.z) < 6;
  if (near && performance.now() - b.waved > 9000) { b.waved = performance.now(); b.manikin.userData.emote('wave'); }
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
  cloudSea = createCloudSea({ radius: Math.hypot(HALF_W, HALF_H) + 600, y: -15, quality: gfx, renderer });
  scene.add(cloudSea);
  // Pulau karst di kejauhan, melingkari tepi kepulauan
  for (let i = 0; i < 48; i += 1) {
    const a = (i / 48) * Math.PI * 2 + rand() * 0.1;
    const out = 90 + rand() * 120;
    const h = 14 + rand() * 18;
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(2 + rand() * 2, 4 + rand() * 3, h, 7), toon(rand() < 0.5 ? '#6f8c7a' : '#7c9a83')), 0, h / 2, 0, g);
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 0), toon('#4f9e64')), 0, h + 0.5, 0, g);
    g.scale.setScalar(1.6);
    add(g, Math.cos(a) * (HALF_W + out), -18, Math.sin(a) * (HALF_H + out));
  }
  // Layang-layang warna-warni di atas kepulauan
  const kiteColors = [['#e2553f', '#f5b72b'], ['#1fc3d3', '#ffffff'], ['#2fa36b', '#f5b72b'], ['#f472b6', '#ffffff'], ['#2b4c7e', '#f5b72b'], ['#f08a3c', '#2fa36b']];
  kiteColors.forEach(([c1, c2], i) => {
    const k = createKite(c1, c2);
    const a = (i / kiteColors.length) * Math.PI * 2;
    const f0 = frame(0);
    k.userData.kite = { a, r: 22 + (i % 3) * 30, y: 14 + (i % 2) * 5, s: 0.03 + (i % 3) * 0.015, cx: f0.x, cz: f0.z };
    k.scale.setScalar(1.3);
    scene.add(k);
    animated.push(k);
  });
  // Perahu pinisi berlayar di lautan awan, mengitari kepulauan
  [0, Math.PI, Math.PI / 2, Math.PI * 1.5, 0.8, 3.9].forEach((a, i) => {
    const p = createPinisi(2.2);
    p.userData.pinisi = { a, rx: HALF_W + 40 + (i % 3) * 30, rz: HALF_H + 40 + (i % 3) * 30, s: 0.004 + (i % 3) * 0.0015 };
    scene.add(p);
    animated.push(p);
  });
  // Matahari digambar oleh kubah langit (sky.js), searah dengan cahaya bayangan.
  // Awan kumulus tinggi yang melayang pelan
  const high = gfx === 'high';
  const cloudTex = cumulusTextures(high ? 4 : 2, gfx);
  for (let i = 0; i < (high ? 70 : 34); i += 1) {
    const c = createCumulus(cloudTex[i % cloudTex.length], 26 + rand() * 34, { opacity: 0.96 });
    c.userData.drift = 0.5 + rand() * 0.6;
    c.position.set((rand() * 2 - 1) * (HALF_W + 100), 28 + rand() * 16, (rand() * 2 - 1) * (HALF_H + 80));
    scene.add(c);
    animated.push(c);
  }
  // Gugusan awan besar di cakrawala (tanpa kabut, diwarnai biru udara agar tampak jauh); ikut bergeser bersama kamera
  horizon = new THREE.Group();
  scene.add(horizon);
  for (let i = 0; i < (high ? 12 : 7); i += 1) {
    const a = (i / (high ? 12 : 7)) * Math.PI * 2 + rand() * 0.4;
    const r = 300 + rand() * 60;
    const c = createCumulus(cloudTex[(i + 1) % cloudTex.length], 90 + rand() * 70, { fog: false, tint: '#e4f2fb', opacity: 0.88 });
    c.position.set(Math.cos(a) * r, -16 + rand() * 6, Math.sin(a) * r);
    horizon.add(c);
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
  spots.forEach(([isl, lx, y0, lz], i) => {
    const f = frame(isl);
    const x = isl === 0 ? f.x + lx : f.x + lx * f.rx;
    const z = isl === 0 ? f.z + lz : f.z + lz * f.rz;
    const y = y0 + (isl === 0 ? 0 : groundAt(x, z)); // di wilayah pos, kepingan melayang di atas blok medan
    const g = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), toon(PALETTE.gold, { emissive: '#c98a1a', emissiveIntensity: 0.55 }));
    leaf.scale.set(0.7, 1.15, 0.35);
    g.add(leaf);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.6 })));
    add(g, x, y, z);
    shards.push({ id: i, obj: g, x, y, z, island: isl, taken: false });
  });
  // Kepingan di pulau jelajah dan wilayah pos (ditambahkan di belakang agar id lama tetap sama),
  // lalu kepingan di puncak menara pandang medan blok (sejak 1.1).
  [...wildShards, ...(terrain ? terrain.shardSpots : [])].forEach(([x, y, z, isl]) => {
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
    () => {
      quests = createQuests({
        scene, fx, game, add,
        overlay: document.getElementById('w3-holo'),
        islandFrame: (id) => frame(id),
        say: (text, reaction = 'talk') => say(nara, text, 2.6, reaction),
        nara: (r) => nara.userData.react(r, r === 'celebrate' ? 1.4 : 1.1),
        onPanel: (open) => { panelOpen = open; if (open) exitFreeLook(); if (!open && renderer) renderer.domElement.focus(); },
        onSealed: sealed
      });
    },
    () => { terrain = createTerrain({ scene, gfx, anisotropy: gfx === 'high' ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1 }); terrain.visible = false; },
    // Satu langkah per wilayah pos: grid medan blok + isinya (agar layar muat tetap bergerak).
    ...W.islands.filter((i) => W.isPost(i.id)).map((isl) => () => buildRegion({ scene, W, frame, toX, toZ, items: quests.items, platforms, shardSpots: wildShards, animated, gfx, terrain, spots: regionSpots }, isl.id)),
    () => buildDecor(),
    () => buildSeasonDecor(),
    () => buildBoutique(),
    // Kampung (1.6): warga, Dapur Lapangan, dan titik bahan; dibangun setelah medan & desa pusat siap.
    () => {
      const f0 = frame(0);
      const avoid = [...quests.items.map((i) => ({ x: i.x, z: i.z })), { x: toX(W.nara.x), z: toZ(W.nara.y) }, { x: f0.x + BOSS_AT.x, z: f0.z + BOSS_AT.z }];
      if (boutique) avoid.push({ x: boutique.x, z: boutique.z });
      kampung = createKampung({ scene, W, frame, groundAt, spots: regionSpots, avoid });
    },
    () => buildShards(),
    () => {
      nara = createNara();
      add(nara, toX(W.nara.x), 0, toZ(W.nara.y));
      arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), toon(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.7 }));
      arrow.rotation.x = Math.PI;
      arrow.castShadow = false;
      scene.add(arrow);
      // Suar cahaya emas di tujuan: terlihat dari jauh menembus kabut di wilayah yang luas
      beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 90, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd45c', transparent: true, opacity: 0.32, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      beacon.geometry.translate(0, 45, 0);
      beacon.castShadow = false;
      beacon.visible = false;
      scene.add(beacon);
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
      // Tanda kunci target: cincin segi enam (bentuknya beda dari penanda lain, bukan hanya warnanya).
      lockRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 6), new THREE.MeshBasicMaterial({ color: '#36e0ff', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
      lockRing.rotation.x = -Math.PI / 2;
      lockRing.renderOrder = 2;
      lockRing.visible = false;
      scene.add(lockRing);
      self.obj = createExplorer(net && net.me ? net.me.color : PALETTE.cyan);
      add(self.obj);
      if (window.NutraShop) applyOutfit(self.obj, window.NutraShop.wear); // busana Butik Nusantara
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
const ZOOM_MIN = 3.5;  // dekat: melihat detail penjelajah
const ZOOM_MAX = 24;   // jauh: melihat area lebih luas
const LOCK_RANGE = 150; // meter: jangkauan kunci target (objek misi tersebar ±220 m dari pusat wilayah)
const PAN_MAX = 120;   // meter: batas geser layar mode Isometrik dari penjelajah
const EYE_H = 1.55;    // tinggi mata penjelajah (mode Orang Pertama)
const SHOULDER = 0.7;  // geser kamera ke kanan bahu (mode Bahu)
const motionMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => motionMQ.matches;
// Kamera dan gerak memakai dua kendali terpisah: mouse/analog kanan/geser layar = kamera,
// WASD/analog kiri/joystick = gerak (searah kamera), sehingga bisa berjalan sambil melihat sekeliling.
// blend = sisa detik transisi halus setelah ganti mode; pan = geser layar Isometrik (meter, x/z).
const camCtl = { lock: null, reset: false, freeLook: false, blend: 0, pan: new THREE.Vector3(), panAt: 0 };
let lockRing;

// ---------- Mode kamera ----------
// Orang ketiga (Orbit bebas 360° dan Bahu/over-the-shoulder), Isometrik/top-down, dan Orang Pertama.
// zoom = rentang jarak kamera (meter); khusus Orang Pertama, zoom = sudut pandang (FOV, derajat).
const CAM_KEY = 'nutrantara-cam';
const CAM_MODES = {
  orbit: { label: 'Orbit', title: 'Orang ketiga: kamera bebas 360° mengitari penjelajah', pitch: [PITCH_MIN, PITCH_MAX], pitch0: 0.5, zoom: [ZOOM_MIN, ZOOM_MAX], zoom0: 11, fov: 50 },
  bahu: { label: 'Bahu', title: 'Orang ketiga dari atas bahu: dekat, penjelajah menghadap ke arah pandangan', pitch: [-0.6, 0.9], pitch0: 0.12, zoom: [1.8, 5], zoom0: 2.6, fov: 55 },
  iso: { label: 'Isometrik', title: 'Pandangan atas yang luas: seret untuk menggeser layar, R/F memiringkan sampai tegak lurus (top-down)', pitch: [0.8, 1.52], pitch0: 0.95, zoom: [22, 95], zoom0: 36, fov: 30 },
  fp: { label: 'Orang Pertama', title: 'Lewat mata penjelajah: paling imersif, gulir untuk memperbesar pandangan', pitch: [-1.3, 1.3], pitch0: 0.05, zoom: [30, 75], zoom0: 70, fov: null }
};
const CAM_ORDER = Object.keys(CAM_MODES);
const camMem = {}; // pitch & zoom terakhir tiap mode, dipulihkan saat kembali ke mode itu
let camMode = 'orbit';
try { const saved = localStorage.getItem(CAM_KEY); if (CAM_MODES[saved]) camMode = saved; } catch { /* abaikan */ }
cam.pitch = CAM_MODES[camMode].pitch0;
cam.dist = CAM_MODES[camMode].zoom0;
const camFov = () => CAM_MODES[camMode].fov || cam.dist;
const followsView = () => camMode === 'bahu' || camMode === 'fp'; // penjelajah selalu menghadap arah pandang

const camBar = document.createElement('div');
camBar.className = 'w3-gfx w3-cam';
camBar.setAttribute('role', 'group');
camBar.setAttribute('aria-label', 'Mode kamera');
camBar.innerHTML = `<span>KAMERA</span>${CAM_ORDER.map((id) => `<button type="button" data-cam="${id}" title="${CAM_MODES[id].title}">${CAM_MODES[id].label}</button>`).join('')}`;
gfxBar.after(camBar);
camBar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cam]');
  if (!b) return;
  setCamMode(b.dataset.cam, true);
  if (e.detail && renderer && running) renderer.domElement.focus(); // klik mouse: kembali ke dunia; Enter/Spasi: fokus tetap di tombol
});
function renderCamBar() {
  camBar.hidden = gfx === '2d';
  camBar.querySelectorAll('[data-cam]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cam === camMode)));
}
function setCamMode(id, announce) {
  if (!CAM_MODES[id]) return;
  if (id !== camMode) {
    camMem[camMode] = { pitch: cam.pitch, zoom: cam.dist };
    camMode = id;
    const M = CAM_MODES[id];
    const mem = camMem[id] || { pitch: M.pitch0, zoom: M.zoom0 };
    cam.pitch = mem.pitch;
    cam.dist = mem.zoom;
    camCtl.pan.set(0, 0, 0);
    camCtl.reset = false;
    camCtl.blend = reducedMotion() ? 0 : 0.7;
    try { localStorage.setItem(CAM_KEY, id); } catch { /* abaikan */ }
  }
  renderCamBar();
  if (announce) game.showToast(`Kamera ${CAM_MODES[id].label}: ${CAM_MODES[id].title}. Tekan K untuk ganti.`);
}
function cycleCamMode(step) { setCamMode(CAM_ORDER[(CAM_ORDER.indexOf(camMode) + step + CAM_ORDER.length) % CAM_ORDER.length], true); }
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
  if (e.code === 'KeyQ') toggleLock();
  if (e.code === 'KeyC') resetCamera();
  if (e.code === 'KeyV') toggleFreeLook();
  if (e.code === 'KeyK') cycleCamMode(1);
  if ((e.code === 'KeyE' || (e.code === 'Enter' && onCanvas)) && nearby) { e.preventDefault(); interact(); }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
window.addEventListener('blur', () => keys.clear());

const raycaster = new THREE.Raycaster();
function groundPoint(e) {
  const r = renderer.domElement.getBoundingClientRect();
  const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  // Medan blok dulu (bukit menutupi permukaan datar di bawahnya); permukaan wilayah pos yang tersembunyi dilewati.
  const surfaces = terrain && terrain.group.visible ? [...terrain.pickables, ...islandTops.filter((t) => t.visible)] : islandTops;
  const hit = raycaster.intersectObjects(surfaces, false)[0];
  if (hit) return new THREE.Vector3(hit.point.x, groundAt(hit.point.x, hit.point.z), hit.point.z);
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

// ---------- Kamera: putar, zoom, kunci target, reset ----------
function lookBy(dYaw, dPitch) {
  const [lo, hi] = CAM_MODES[camMode].pitch;
  cam.yaw += dYaw;
  cam.pitch = Math.min(hi, Math.max(lo, cam.pitch + dPitch));
  // Memutar kamera sendiri menghentikan reset dan melepas kunci target.
  if (Math.abs(dYaw) > 0.001) { camCtl.reset = false; releaseLock(false); }
}
function zoomBy(f) {
  if (mode === 'overview') { overview.dist = Math.min(120, Math.max(40, overview.dist * f)); return; }
  const [lo, hi] = CAM_MODES[camMode].zoom;
  cam.dist = Math.min(hi, Math.max(lo, cam.dist * f));
}
// Isometrik: geser layar (meter) ke kanan layar dan ke atas layar untuk mengintai area lain.
function panBy(right, ahead) {
  const s = Math.sin(cam.yaw); const c = Math.cos(cam.yaw);
  camCtl.pan.x += right * c - ahead * s;
  camCtl.pan.z += -right * s - ahead * c;
  if (camCtl.pan.length() > PAN_MAX) camCtl.pan.setLength(PAN_MAX);
  camCtl.panAt = performance.now();
  camCtl.reset = false;
  releaseLock(false);
}
// Geser layar dengan mouse/jari: dunia ikut "tertarik" searah seretan.
function panByPixels(dx, dy) {
  const h = (renderer && renderer.domElement.clientHeight) || 600;
  const mpp = (2 * cam.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / h; // meter per piksel di titik fokus
  panBy(-dx * mpp, (dy * mpp) / Math.max(0.3, Math.sin(cam.pitch)));
}
// C / Y gamepad: kamera kembali lurus ke belakang penjelajah.
function resetCamera() { if (mode === 'play') camCtl.reset = true; }
function releaseLock(announce) {
  if (!camCtl.lock) return;
  camCtl.lock = null;
  if (announce) game.showToast('Kunci kamera dilepas.');
}
const LOCK_NAMES = { terminal: 'Terminal Arsip', board: 'Papan Laporan', altar: 'Altar Segel', kitchen: 'Meja Dapur Juara', stage: 'Panggung Presentasi', archive: 'Ruang Arsip' };
const lockName = (it) => LOCK_NAMES[it.kind] || (it.st && it.st.label) || (it.ing && it.ing.label) || 'objek misi';
function findLockTarget() {
  // Utamakan tujuan misi berikutnya (yang ditunjuk panah emas), lalu objek yang dekat dan searah pandangan kamera.
  const vx = -Math.sin(cam.yaw); const vz = -Math.cos(cam.yaw);
  const goal = nextGoal().item;
  let best = null; let bestScore = Infinity;
  quests.items.forEach((it) => {
    if (it.obj && !it.obj.visible) return;
    const dx = it.x - self.x; const dz = it.z - self.z; const d = Math.hypot(dx, dz);
    if (d > LOCK_RANGE || d < 0.8) return;
    const score = d + Math.acos(Math.max(-1, Math.min(1, (dx * vx + dz * vz) / d))) * 20 - (it === goal ? 60 : 0);
    if (score < bestScore) { bestScore = score; best = it; }
  });
  return best;
}
// Q / R3 / tombol BIDIK: kunci kamera ke objek misi; bila tidak ada, kamera di-reset ke belakang penjelajah.
function toggleLock() {
  if (mode !== 'play') return;
  if (camCtl.lock) { releaseLock(true); return; }
  const it = findLockTarget();
  if (!it) { resetCamera(); game.showToast(`Tidak ada objek misi dalam ${LOCK_RANGE} m. Kamera kembali ke belakang penjelajah.`); return; }
  camCtl.lock = it;
  camCtl.reset = false;
  camCtl.pan.set(0, 0, 0);
  game.showToast(`🎯 Kamera terkunci ke ${lockName(it)}. Tekan lagi untuk melepas.`);
}
function steerYaw(goal, k) {
  let d = goal - cam.yaw;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  cam.yaw += d * k;
  return Math.abs(d);
}
function updateCamControl(dt) {
  const L = camCtl.lock;
  if (L) {
    const dx = L.x - self.x; const dz = L.z - self.z; const d = Math.hypot(dx, dz);
    if ((L.obj && !L.obj.visible) || d > LOCK_RANGE * 1.25) releaseLock(true);
    // Isometrik tidak diputar: layar dipusatkan di antara penjelajah dan target (lihat updateCamera).
    else if (d > 0.8 && camMode !== 'iso') {
      steerYaw(Math.atan2(-dx, -dz), Math.min(1, dt * 5)); // kamera di belakang penjelajah, memandang target
      if (camMode === 'fp') cam.pitch += (Math.atan2(self.h + EYE_H - 0.9, d) - cam.pitch) * Math.min(1, dt * 5);
    }
  }
  if (camCtl.reset) {
    const k = reducedMotion() ? 1 : Math.min(1, dt * 10);
    const p0 = CAM_MODES[camMode].pitch0;
    cam.pitch += (p0 - cam.pitch) * k;
    camCtl.pan.multiplyScalar(1 - k);
    // Bahu & Orang Pertama: penjelajah sudah menghadap arah pandang, cukup luruskan kemiringan.
    const yawLeft = followsView() ? 0 : steerYaw(self.face + Math.PI, k);
    if (yawLeft < 0.01 && Math.abs(cam.pitch - p0) < 0.01 && camCtl.pan.lengthSq() < 0.01) { camCtl.reset = false; camCtl.pan.set(0, 0, 0); }
  }
}
// V: kamera bebas (pointer lock) — mouse memutar kamera 360° tanpa menahan tombol. Esc atau V untuk keluar.
function toggleFreeLook() {
  const el = renderer && renderer.domElement;
  if (!el || !el.requestPointerLock) return;
  if (document.pointerLockElement === el) { document.exitPointerLock(); return; }
  try { const p = el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* peramban menolak: tetap pakai klik kanan */ }
}
function exitFreeLook() { if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); }
document.addEventListener('pointerlockchange', () => {
  camCtl.freeLook = Boolean(renderer) && document.pointerLockElement === renderer.domElement;
  aim.active = false;
  if (camCtl.freeLook) game.showToast('Kamera bebas aktif: gerakkan mouse untuk melihat sekeliling. Tekan V atau Esc untuk kembali ke kursor.');
});

// ---------- Gamepad (pemetaan standar) ----------
// Analog kiri = gerak, analog kanan = kamera (Isometrik: geser layar), LB/RB = putar kamera, A = lompat, X = aksi,
// B/L3 (tahan) = lari, R3 = kunci target (atau reset bila tak ada target), Y = reset kamera, D-pad ↑/↓ = zoom,
// D-pad ←/→ = ganti mode kamera, Back/Select = peta mini besar.
const PAD_DEAD = 0.2;
const PAD_LOOK = 2.6; // radian per detik saat analog kanan didorong penuh
const gpad = { prev: [], lx: 0, ly: 0, run: false };
function deadzone(x, y) {
  const l = Math.hypot(x, y);
  if (l < PAD_DEAD) return [0, 0];
  const k = Math.min(1, (l - PAD_DEAD) / (1 - PAD_DEAD)) / l;
  return [x * k, y * k];
}
function pollGamepad(dt) {
  gpad.lx = 0; gpad.ly = 0; gpad.run = false;
  let gp = null;
  for (const g of (navigator.getGamepads ? navigator.getGamepads() : [])) if (g && g.connected) { gp = g; break; }
  if (!gp) return;
  const held = (i) => Boolean(gp.buttons[i] && gp.buttons[i].pressed);
  const tap = (i) => held(i) && !gpad.prev[i];
  const axis = (i) => gp.axes[i] || 0;
  if (mode === 'drop' && tap(0)) drop.openLeaf = true;
  if (mode === 'play') {
    [gpad.lx, gpad.ly] = deadzone(axis(0), axis(1));
    gpad.run = held(1) || held(10);
    const [rx, ry] = deadzone(axis(2), axis(3));
    if (rx || ry) {
      if (camMode === 'iso') panBy(rx * cam.dist * 0.9 * dt, -ry * cam.dist * 0.9 * dt);
      else lookBy(-rx * PAD_LOOK * dt, ry * PAD_LOOK * 0.6 * dt);
    }
    if (held(4)) lookBy(PAD_LOOK * 0.7 * dt, 0);
    if (held(5)) lookBy(-PAD_LOOK * 0.7 * dt, 0);
    if (held(12)) zoomBy(1 - dt * 1.5);
    if (held(13)) zoomBy(1 + dt * 1.5);
    if (!panelOpen) {
      if (tap(0)) jumpQueued = true;
      if (tap(2)) interact();
      if (tap(11)) toggleLock();
      if (tap(3)) resetCamera();
      if (tap(8)) toggleMinimap();
      if (tap(14)) cycleCamMode(-1);
      if (tap(15)) cycleCamMode(1);
    }
  }
  gpad.prev = gp.buttons.map((b) => b.pressed);
}
window.addEventListener('gamepadconnected', () => {
  if (running) game.showToast('Gamepad tersambung: analog kiri berjalan, analog kanan memutar kamera, A lompat, X aksi, B lari, R3 kunci target, Y reset kamera, D-pad ←/→ ganti mode kamera.');
});

function bindInput(el) {
  let drag = null;
  const touches = new Map(); // jari yang menyentuh kanvas, untuk cubit-zoom
  let pinch = 0;             // jarak dua jari sebelumnya (0 = tidak sedang mencubit)
  const span = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  el.addEventListener('contextmenu', (e) => e.preventDefault()); // klik kanan dipakai untuk memutar kamera
  el.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); }); // cegah auto-scroll klik tengah
  el.addEventListener('pointerdown', (e) => {
    el.focus();
    if (camCtl.freeLook) return;
    el.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2) { drag = null; pinch = span(); return; }
    }
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0, button: e.button };
  });
  el.addEventListener('pointermove', (e) => {
    if (camCtl.freeLook) { if (mode === 'play') lookBy(-e.movementX * 0.004, e.movementY * 0.003); return; }
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size >= 2) { const s = span(); zoomBy(pinch / s); pinch = s; return; }
    }
    if (mode === 'overview' && !drag) { const id = pickIsland(e); el.style.cursor = id !== null ? 'pointer' : 'grab'; overview.hover = id; }
    if (mode === 'play' && (!drag || drag.moved < 6) && e.pointerType === 'mouse') { const p = groundPoint(e); aim.point = p; aim.active = Boolean(p); aim.lastMove = performance.now(); }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    // Klik kiri/sentuh baru memutar setelah bergeser sedikit, agar klik "jalan ke sana" tidak melepas kunci target.
    if (mode === 'overview') overview.yaw -= dx * 0.005;
    else if (camMode === 'iso' && drag.button === 0) { if (drag.moved >= 6) panByPixels(dx, dy); } // Isometrik: seret kiri/jari = geser layar
    else if (drag.button !== 0 || drag.moved >= 6) lookBy(-dx * 0.006, dy * 0.004);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const endPointer = (e, cancelled) => {
    touches.delete(e.pointerId);
    if (pinch) { if (touches.size < 2) pinch = 0; drag = null; return; }
    if (!drag || drag.id !== e.pointerId) return;
    const click = !cancelled && drag.moved < 6 && drag.button === 0; // klik kanan/tengah hanya memutar kamera
    drag = null;
    if (!click) return;
    if (mode === 'overview') { const id = pickIsland(e); if (id !== null) selectIsland(id); }
    if (mode === 'play' && !panelOpen) { const p = groundPoint(e); if (p) { const c = W.clamp(toPx(p.x), toPy(p.z), allowedSet()); walkTo.point = new THREE.Vector3(toX(c.x), 0, toZ(c.y)); walkTo.point.y = groundAt(walkTo.point.x, walkTo.point.z); fx.ring({ x: walkTo.point.x, y: walkTo.point.y, z: walkTo.point.z }, { color: '#f5b72b', from: 0.2, to: 1.4, life: 0.45 }); } }
  };
  el.addEventListener('pointerup', (e) => endPointer(e, false));
  el.addEventListener('pointercancel', (e) => endPointer(e, true));
  el.addEventListener('pointerleave', () => { aim.active = false; });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    // Normalisasi satuan gulir (piksel/baris/halaman), lalu zoom berkelipatan agar terasa halus.
    const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
    zoomBy(Math.exp(Math.max(-300, Math.min(300, dy)) * 0.0012));
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
  document.getElementById('w3-lock').addEventListener('pointerdown', (e) => { e.preventDefault(); toggleLock(); });
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
  if (nearby.kind === 'shop') { game.goTo('shop'); return; }
  if (nearby.kind === 'kampung') { kampung.activate(nearby.target); return; }
  quests.activate(nearby.item);
}

function nextGoal() {
  const st = game.state;
  const target = MISSIONS.find((m) => !st.posts[m.id].sealed);
  if (!target) return { text: '✓ EKSPEDISI SELESAI — semua segel aktif!', item: null };
  if (!allowedSet().has(target.id)) return { text: `⌑ Pos ${target.id} menunggu dibuka guru`, item: null };
  const here = self.island === target.id;
  if (!here) {
    const st = W.stations.find((s) => s.id === target.id);
    return { text: `➜ Menuju Wilayah Pos ${target.id}: ${target.title} ${target.titleEm} — ikuti jembatan cahaya`, point: { x: toX(st.x), z: toZ(st.y) } };
  }
  if (target.type === 'project') {
    // Pos 6: Ruang Arsip → bahan lokal → Meja Dapur Juara (mengikuti langkah misi di quest.js).
    const g = quests.goal(target.id);
    return g ? { text: `✦ ${g.text}`, item: g.item } : { text: '✦ Rancang menu di Meja Dapur Juara', item: quests.items.find((i) => i.pos === target.id && i.kind === 'kitchen') };
  }
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
function saveDiscovered(list) {
  try { localStorage.setItem(discoverKey(), JSON.stringify(list)); } catch { /* abaikan */ }
  document.dispatchEvent(new CustomEvent('nutra:explore'));
}

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
    ${(() => { const w = weatherText(id); const b = terrain && terrain.biomeOf(id); return `<p class="ov-weather">${b ? `<b>Medan:</b> ${b.name} (${b.desc}).<br>` : ''}<b>Musim:</b> ${w.season} (${w.seasonDesc}).<br><b>Iklim:</b> ${w.climate} · <b>Cuaca:</b> ${w.now}, ${w.minutes} mnt lagi ${w.next}</p>`; })()}
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
  exitFreeLook();
  camCtl.lock = null;
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
  cam.yaw = 0.25;
  if (camMode === 'orbit') { cam.pitch = 0.55; cam.dist = 11; }
  camCtl.lock = null; camCtl.reset = false; camCtl.pan.set(0, 0, 0);
  drop.t = 0; drop.island = id; drop.openLeaf = false; drop.phase = 'fall';
  mode = 'drop';
  landed = true;
  document.getElementById('w3-drophint').hidden = false;
  document.getElementById('w3-place').textContent = placeName(id);
  if (camera) camera.position.set(tx + 6, 70, tz + 14);
  // Medan di sekitar titik pendaratan dibangun dulu agar tanah sudah ada saat tiba.
  if (terrain) { terrain.visible = true; terrain.prime(tx, tz); }
  // Nara turun lebih dulu dan menunggu di dekat titik pendaratan.
  nara.position.set(tx - 1.8, groundAt(tx - 1.8, tz + 0.8), tz + 0.8);
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
  const landY = groundAt(self.x, self.z);
  if (self.h <= landY) {
    self.h = landY; self.vy = 0; self.grounded = true;
    self.obj.userData.land();
    fx.dust({ x: self.x, y: landY + 0.1, z: self.z });
    fx.ring({ x: self.x, y: landY, z: self.z }, { color: '#ffffff', from: 0.3, to: 3.2, life: 0.6 });
    drop.shake = 0.35;
    camCtl.blend = reducedMotion() ? 0 : 0.8; // kamera terjun berpindah halus ke mode kamera pilihan
    mode = 'play';
    document.getElementById('w3-drophint').hidden = true;
    if (net) net.sendMove(toPx(self.x), toPy(self.z), 0);
    arrive(drop.island, true);
    if (!sessionStorage.getItem('nutrantara-tip-kamera')) {
      try { sessionStorage.setItem('nutrantara-tip-kamera', '1'); } catch { /* abaikan */ }
      const tip = matchMedia('(pointer: coarse)').matches
        ? 'Tip: joystick kiri untuk berjalan, geser layar untuk memutar kamera, cubit untuk zoom, BIDIK untuk mengunci kamera ke objek misi.'
        : 'Tip: tahan klik kanan (atau seret) untuk memutar kamera, gulir untuk zoom. Q mengunci kamera ke objek misi, C mengembalikan kamera ke belakang, V kamera bebas.';
      setTimeout(() => game.showToast(tip), 2500);
    }
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
  updateCamControl(dt);
  if (canMove()) {
    if (keys.has('f')) iz -= 1;
    if (keys.has('b')) iz += 1;
    if (keys.has('l')) ix -= 1;
    if (keys.has('r')) ix += 1;
    if (keys.has('tl')) turn += 1;
    if (keys.has('tr')) turn -= 1;
    if (keys.has('af')) ahead += 1;
    if (keys.has('ab')) ahead -= 1;
    ix += stick.x + gpad.lx; iz += stick.y + gpad.ly;
  }
  // R/PageUp menengadah, F/PageDown menunduk (Isometrik: memiringkan pandangan atas sampai top-down).
  if (keys.has('lu')) lookBy(0, -LOOK_SPEED * dt);
  if (keys.has('ld')) lookBy(0, LOOK_SPEED * dt);
  // Tombol panah ←/→: memutar arah hadap. Orbit: kamera ikut ke belakang penjelajah.
  // Bahu & Orang Pertama: yang diputar kamera, penjelajah ikut. Isometrik: kamera diam.
  if (turn) {
    camCtl.reset = false; releaseLock(false);
    if (followsView()) cam.yaw += turn * TURN_SPEED * dt;
    else {
      self.face += turn * TURN_SPEED * dt;
      if (camMode === 'orbit') { let d = (self.face + Math.PI) - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 5); }
    }
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
    const buff = window.NutraKampung ? window.NutraKampung.speedBuff() : 1; // mencicipi hidangan Dapur Lapangan
    const sp = SPEED * buff * (keys.has('run') || gpad.run ? SPRINT : 1) * (self.grounded && inWater(self.x, self.z) ? SWIM_SPEED : 1);
    const c = W.clamp(toPx(self.x + mx * sp * dt), toPy(self.z + mz * sp * dt), allowed);
    let nx = toX(c.x); let nz = toZ(c.y);
    // Medan blok: undakan setinggi ≤ 1 blok di atas kaki bisa dimasuki (saat melompat: sampai 2 blok);
    // dinding yang lebih tinggi menahan, dan penjelajah menyusur sepanjang dinding.
    const enter = (x, z) => groundAt(x, z) <= self.h + STEP_UP;
    if (!enter(nx, nz)) {
      if (enter(nx, self.z)) nz = self.z;
      else if (enter(self.x, nz)) nx = self.x;
      else { nx = self.x; nz = self.z; }
    }
    self.x = nx; self.z = nz;
    if (faceMove && !turn && !camCtl.lock && !followsView()) {
      let diff = Math.atan2(mx, mz) - self.face;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      self.face += diff * Math.min(1, dt * 12);
    }
    // Isometrik: geser layar kembali ke penjelajah saat ia berjalan (kecuali baru saja digeser).
    if (camMode === 'iso' && performance.now() - camCtl.panAt > 1500) camCtl.pan.multiplyScalar(1 - Math.min(1, dt * 2));
  } else if (aim.active && aim.point && performance.now() - aim.lastMove < 4000 && !panelOpen && !turn && !camCtl.lock && !followsView()) {
    // Diam: penjelajah menoleh ke arah kursor.
    const dx = aim.point.x - self.x; const dz = aim.point.z - self.z;
    if (Math.hypot(dx, dz) > 0.6) { let diff = Math.atan2(dx, dz) - self.face; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); self.face += diff * Math.min(1, dt * 8); }
  }
  if (camCtl.lock) {
    // Terkunci: penjelajah tetap menghadap target, juga saat bergeser ke samping.
    const dx = camCtl.lock.x - self.x; const dz = camCtl.lock.z - self.z;
    if (Math.hypot(dx, dz) > 0.8) { let diff = Math.atan2(dx, dz) - self.face; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); self.face += diff * Math.min(1, dt * 10); }
  } else if (followsView()) {
    // Bahu & Orang Pertama: penjelajah menghadap arah pandang kamera (bergeser ke samping dengan A/D).
    let diff = (cam.yaw + Math.PI) - self.face; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    self.face += diff * Math.min(1, dt * 12);
  }
  self.obj.visible = camMode !== 'fp'; // Orang Pertama: tubuh sendiri tidak digambar
  if (self.label) self.label.visible = camMode !== 'bahu'; // Bahu: label nama sendiri terlalu dekat dengan kamera
  updateFacingMarkers(moving);
  self.speed += ((moving ? Math.min(1, Math.max(len, Math.hypot(mx, mz))) : 0) - self.speed) * Math.min(1, dt * 10);
  if (jumpQueued && self.grounded && canMove()) { self.vy = JUMP; self.grounded = false; }
  jumpQueued = false;
  const prevH = self.h;
  const wasGrounded = self.grounded;
  self.vy -= GRAVITY * dt;
  self.h += self.vy * dt;
  let floor = groundAt(self.x, self.z);
  platforms.forEach((p) => { if (Math.abs(self.x - p.x) <= p.hw + 0.2 && Math.abs(self.z - p.z) <= p.hd + 0.2 && prevH >= p.top - 0.05) floor = Math.max(floor, p.top); });
  if (self.h <= floor) {
    // Mendarat, atau naik satu undakan (tubuh menyusul halus lewat stepOff).
    if (!wasGrounded && prevH - floor > 0.6) fx.dust({ x: self.x, y: floor + 0.05, z: self.z });
    if (wasGrounded && floor - prevH > 0.05) self.stepOff = (self.stepOff || 0) - (floor - prevH);
    self.h = floor; self.vy = 0; self.grounded = true;
  } else if (wasGrounded && self.vy <= 0 && prevH - floor <= STEP_UP) {
    // Turun satu undakan tanpa melayang.
    self.stepOff = (self.stepOff || 0) + (prevH - floor);
    self.h = floor; self.vy = 0; self.grounded = true;
  } else self.grounded = false;
  self.stepOff = (self.stepOff || 0) * Math.exp(-dt * 16);

  // Debu langkah (di air: cipratan)
  if (self.grounded && self.speed > 0.6 && Math.random() < dt * 4) {
    if (inWater(self.x, self.z)) fx.ring({ x: self.x, y: -0.25, z: self.z }, { color: '#e8f8ff', from: 0.2, to: 1.1, life: 0.4 });
    else fx.dust({ x: self.x, y: floor + 0.05, z: self.z });
  }

  self.obj.position.set(self.x, self.h + self.stepOff, self.z);
  self.obj.rotation.y = self.face;
  self.obj.userData.animate(dt, { speed: self.speed, airborne: !self.grounded, height: self.h - floor });
  // Kepala ikut menengadah/menunduk mengikuti kamera orang ketiga (Isometrik: kemiringan kamera bukan arah pandang).
  const tilt = camMode === 'orbit' || camMode === 'bahu';
  const lookUp = tilt ? Math.min(1, Math.max(0, 0.25 - cam.pitch) / (0.25 - PITCH_MIN)) : 0; // 0..1
  const lookDown = tilt ? Math.min(1, Math.max(0, cam.pitch - 0.85) / (PITCH_MAX - 0.85)) : 0; // 0..1
  self.obj.userData.head.rotation.x = -lookUp * 0.55 + lookDown * 0.35;

  const isl = islandAt3(self.x, self.z);
  if (isl !== -1 && isl !== self.island) { self.island = isl; arrive(isl, false); }
  document.getElementById('w3-place').textContent = placeName(self.island);

  const now = performance.now();
  const px = Math.round(toPx(self.x)); const py = Math.round(toPy(self.z));
  // Server menyimpan tinggi di atas blok medan (0–8 m); pemain lain menambahkannya ke medan di posisi itu.
  const relH = Math.max(0, self.h - terrainH(self.x, self.z));
  const key = `${px},${py},${Math.round(relH * 10)}`;
  if (now - lastSent > 100 && key !== lastKey) { lastSent = now; lastKey = key; if (net) net.sendMove(px, py, relH); }

  // Nara mengikuti di samping penjelajah: depan-kanan; di mode Bahu & Orang Pertama pindah ke kiri agar tidak menutupi pandangan.
  const [nox, noz] = followsView() ? [1.7, 0.3] : [-1.5, 1.2];
  const off = new THREE.Vector3(nox, 0, noz).applyAxisAngle(new THREE.Vector3(0, 1, 0), self.face);
  const nx = self.x + off.x; const nz = self.z + off.z;
  const nd = Math.hypot(nx - nara.position.x, nz - nara.position.z);
  if (nd > 0.6) { nara.position.x += (nx - nara.position.x) * Math.min(1, dt * 2.2); nara.position.z += (nz - nara.position.z) * Math.min(1, dt * 2.2); }
  const lift = self.h - groundAt(self.x, self.z); // Nara ikut naik sedikit saat penjelajah melompat/berada di pijakan
  nara.position.y += (groundAt(nara.position.x, nara.position.z) + (lift > 0.5 ? lift * 0.7 : 0) - nara.position.y) * Math.min(1, dt * 3);
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
  const ch = Math.round(big ? (cw * W.height) / W.width : cw * 0.75);
  if (minimapCanvas.width !== cw || minimapCanvas.height !== ch) { minimapCanvas.width = cw; minimapCanvas.height = ch; }
  // Kecil: jendela ±320 m mengikuti pemain (wilayah pos terlalu luas untuk peta utuh); besar (M): seluruh kepulauan.
  const viewW = big ? W.width : 3200;
  const viewH = (viewW * ch) / cw;
  const s = cw / viewW;
  const u = 1 / s; // 1 piksel layar dalam satuan peta
  const ox = big ? 0 : Math.max(0, Math.min(W.width - viewW, toPx(self.x) - viewW / 2));
  const oy = big ? 0 : Math.max(0, Math.min(W.height - viewH, toPy(self.z) - viewH / 2));
  const g = mctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cw, ch);
  g.setTransform(s, 0, 0, s, -ox * s, -oy * s);
  g.fillStyle = 'rgba(191,233,251,.92)';
  g.fillRect(ox, oy, viewW, viewH);
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
    // Pulau kecil diberi ukuran minimum agar tetap terlihat di peta seluruh kepulauan.
    const mr = Math.max(isl.rx, 5 * u) / isl.rx;
    g.beginPath(); g.ellipse(isl.cx, isl.cy, isl.rx * mr, isl.ry * mr, 0, 0, Math.PI * 2); g.fill();
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
    if (big) { g.font = `600 ${Math.round(11 * u)}px "DM Sans", sans-serif`; g.fillText(unknown ? '???' : isl.name, isl.cx, isl.cy + Math.max(isl.ry * 0.55, 14 * u)); }
  });
  // Butik Nusantara di alun-alun (ikon + teks saat peta besar)
  if (boutique) {
    g.font = `700 ${Math.round((big ? 13 : 11) * u)}px "Baloo 2", sans-serif`;
    g.fillText('🛍', toPx(boutique.x), toPy(boutique.z));
    if (big) { g.font = `600 ${Math.round(10 * u)}px "DM Sans", sans-serif`; g.fillStyle = '#3b2a1a'; g.fillText('Butik', toPx(boutique.x), toPy(boutique.z) + 12 * u); }
  }
  // Peta dekat: objek misi di sekitar (titik putih; hijau bila sudah selesai dipindai)
  if (!big && quests) quests.items.forEach((it) => {
    const ix = toPx(it.x); const iy = toPy(it.z);
    if (ix < ox || iy < oy || ix > ox + viewW || iy > oy + viewH) return;
    const st = game.state.posts[it.pos];
    const done = st && (st.sealed || (it.kind === 'terminal' && (st.evidence || []).includes(it.row)));
    g.fillStyle = done ? '#2fa36b' : '#ffffff'; g.strokeStyle = '#3b2a1a'; g.lineWidth = 1 * u;
    g.beginPath(); g.arc(ix, iy, 2.6 * u, 0, Math.PI * 2); g.fill(); g.stroke();
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
  facingArrow.visible = mode === 'play' && camMode !== 'fp'; // Orang Pertama: arah hadap = arah layar
  const ax = self.x + Math.sin(self.face) * dist; const az = self.z + Math.cos(self.face) * dist;
  facingArrow.position.set(ax, Math.max(self.h, groundAt(ax, az)) + 0.06, az);
  facingArrow.rotation.set(-Math.PI / 2, self.face, 0);
  facingArrow.material.opacity = 0.75 + Math.sin(t * 4) * 0.15;
  const showAim = mode === 'play' && aim.active && aim.point && performance.now() - aim.lastMove < 4000 && !panelOpen && !followsView();
  aimRing.visible = Boolean(showAim);
  if (showAim) { aimRing.position.set(aim.point.x, aim.point.y + 0.06, aim.point.z); aimRing.scale.setScalar(1 + Math.sin(t * 6) * 0.08); }
  const L = mode === 'play' ? camCtl.lock : null;
  lockRing.visible = Boolean(L);
  if (L) {
    // Cincin membesar untuk target jauh agar tetap terlihat.
    const far = Math.max(1, Math.hypot(L.x - self.x, L.z - self.z) / 25);
    lockRing.position.set(L.x, groundAt(L.x, L.z) + 0.08, L.z); lockRing.rotation.z = -t * 1.5;
    lockRing.scale.setScalar((1 + (L.reach || 0)) * far * (1 + Math.sin(t * 5) * 0.06));
  }
  walkMarker.visible = Boolean(walkTo.point) && mode === 'play';
  if (walkTo.point) { walkMarker.position.set(walkTo.point.x, walkTo.point.y + 0.07, walkTo.point.z); walkMarker.rotation.z = t * 2; }
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
function saveShards() {
  try { localStorage.setItem(shardKey(), JSON.stringify(shards.filter((s) => s.taken).map((s) => s.id))); } catch { /* abaikan */ }
  document.dispatchEvent(new CustomEvent('nutra:explore'));
}
function updateShardHud() { document.getElementById('w3-shards').textContent = String(shards.filter((s) => s.taken).length); }

function updateNearby() {
  let found = null;
  const it = quests.nearest(self.x, self.z, self.h - groundAt(self.x, self.z));
  const kt = !it && kampung ? kampung.nearest(self.x, self.z) : null;
  if (it) found = { kind: 'item', item: it, key: `${it.kind}${it.pos}${it.row ?? ''}` };
  else if (kt) found = { kind: 'kampung', target: kt, key: `kp${kt.id}` };
  else if (boutique && Math.hypot(boutique.x - self.x, boutique.z - self.z) < 5.2) found = { kind: 'shop', key: 'shop' }; // kios selebar 5,2 m
  else if (Math.hypot(nara.position.x - self.x, nara.position.z - self.z) < 2.2) found = { kind: 'nara', key: 'nara' };
  const prev = nearby === undefined ? 'init' : nearby ? nearby.key : 'none';
  nearby = found;
  if (found && found.kind === 'kampung') { const h = kampung.hint(found.target); promptEl.textContent = h.text; actionBtn.textContent = h.button; actionBtn.hidden = false; return; }
  if (found && found.kind === 'item') { promptEl.textContent = quests.hint(found.item); actionBtn.textContent = { terminal: 'Pindai', board: 'Buka papan', altar: 'Altar segel', station: 'Buka misi', ingredient: 'Ambil bahan', stage: 'Presentasi' }[found.item.kind] || 'Buka dapur'; actionBtn.hidden = false; return; }
  if ((found ? found.key : 'none') === prev) return;
  if (!found) { promptEl.textContent = 'Jelajahi pulau. Ikuti panah emas ke tujuan berikutnya, dekati objek bercahaya, lalu tekan E.'; actionBtn.hidden = true; return; }
  if (found.kind === 'shop') {
    promptEl.textContent = 'Butik Nusantara: tukar poin hasil belajarmu dengan busana khas daerah. Tekan E untuk membuka toko.';
    actionBtn.textContent = 'Buka toko';
    actionBtn.hidden = false;
    return;
  }
  promptEl.textContent = 'Nara ada di sampingmu. Tekan E untuk meminta arahan.';
  actionBtn.textContent = 'Tanya Nara';
  actionBtn.hidden = false;
}

// Arah dari titik fokus ke kamera untuk yaw kamera dan kemiringan p (p > 0 = kamera di atas).
const camDir = (p) => new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(p), Math.sin(p), Math.cos(cam.yaw) * Math.cos(p));

function updateCamera(dt) {
  let pos; let target; let follow = 6; // follow = kecepatan kamera menyusul posisi idealnya
  const gH = groundAt(self.x, self.z); const rel = self.h - gH; // fokus kamera mengikuti tanah, lompatan hanya sebagian
  if (camMode === 'fp') {
    // Orang Pertama: kamera di mata penjelajah, memandang searah yaw/pitch.
    pos = new THREE.Vector3(self.x, self.h + (self.stepOff || 0) + EYE_H, self.z);
    target = pos.clone().sub(camDir(cam.pitch));
    follow = 0;
  } else if (camMode === 'bahu') {
    // Bahu: titik fokus sedikit di kanan kepala, sehingga penjelajah tampak di sisi kiri layar.
    target = new THREE.Vector3(self.x + Math.cos(cam.yaw) * SHOULDER, self.h + 1.45, self.z - Math.sin(cam.yaw) * SHOULDER);
    pos = target.clone().addScaledVector(camDir(cam.pitch), cam.dist);
    pos.y = Math.max(self.h + 0.3, pos.y);
    follow = 12;
  } else if (camMode === 'iso') {
    // Isometrik: kamera tinggi dengan sudut tetap; fokus bisa digeser, atau dipusatkan di antara penjelajah dan target terkunci.
    const L = camCtl.lock;
    if (L) {
      // Geser ke arah target, tetapi penjelajah tetap terlihat di layar.
      const hx = (L.x - self.x) / 2; const hz = (L.z - self.z) / 2; const hl = Math.hypot(hx, hz);
      const k = Math.min(1, (cam.dist * 0.15) / Math.max(0.001, hl));
      target = new THREE.Vector3(self.x + hx * k, gH, self.z + hz * k);
    } else target = new THREE.Vector3(self.x + camCtl.pan.x, gH + rel * 0.5, self.z + camCtl.pan.z);
    pos = target.clone().addScaledVector(camDir(cam.pitch), cam.dist);
  } else {
    target = new THREE.Vector3(self.x, gH + rel * 0.6 + 1.3, self.z);
    const p = Math.max(0.04, cam.pitch);
    const up = Math.max(0, 0.04 - cam.pitch); // seberapa jauh menengadah (0..0.54)
    pos = target.clone().addScaledVector(camDir(p), cam.dist * (1 - up * 0.6));
    pos.y = Math.max(self.h + 0.5, pos.y - up * 2.2);
    target.y += up * 26; // titik pandang naik ke langit
    if (cam.pitch > 1.0) target.y -= (cam.pitch - 1.0) * 3; // menunduk lebih dalam
  }
  // Medan blok: kamera tidak boleh masuk ke dalam bukit di antara fokus dan posisinya.
  if (terrain && camMode !== 'fp') {
    for (const k of [0.35, 0.7, 1]) {
      const g = groundAt(target.x + (pos.x - target.x) * k, target.z + (pos.z - target.z) * k) + 0.8;
      const lineY = target.y + (pos.y - target.y) * k;
      if (lineY < g) pos.y = target.y + (g - target.y) / k;
    }
  }
  // Setelah ganti mode (atau mendarat), kamera berpindah halus ke posisi barunya.
  if (camCtl.blend > 0) { camCtl.blend -= dt; follow = camMode === 'fp' ? 8 : 5; } // FP lebih cepat agar tidak "melompat" saat transisi selesai
  if (follow) camera.position.lerp(pos, Math.min(1, dt * follow));
  else camera.position.copy(pos);
  if (drop.shake > 0) { drop.shake -= dt; camera.position.x += (Math.random() - 0.5) * drop.shake; camera.position.y += (Math.random() - 0.5) * drop.shake; }
  camera.lookAt(target);
  if (sun.castShadow) {
    // Isometrik melihat area lebih luas, jadi kotak bayangan matahari diperbesar.
    const half = camMode === 'iso' ? 50 : 26;
    const sc = sun.shadow.camera;
    if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
    const fx0 = camMode === 'iso' ? target.x : self.x; const fz0 = camMode === 'iso' ? target.z : self.z;
    sun.target.position.set(fx0, camMode === 'iso' ? target.y : self.h, fz0);
    sun.position.copy(SUN_DIR).multiplyScalar(50).add(sun.target.position);
  }
}

function updateOverview(dt) {
  const f = frame(overview.selected);
  overview.target.set(f.x, 0, f.z);
  overview.focus.lerp(overview.target, Math.min(1, dt * 2.5));
  overview.yaw += dt * 0.04;
  // Wilayah pos sangat luas: kamera naik jauh lebih tinggi agar seluruh wilayah terlihat.
  const want = isBig(f) ? Math.max(f.rx, f.rz) * 1.9 : 78;
  overview.dist += (want - overview.dist) * Math.min(1, dt * 2.5);
  setView({ near: Math.max(0.1, overview.dist / 80), far: overview.dist * 4 + 800, fogNear: overview.dist * 1.3, fogFar: overview.dist * 4 });
  const desired = overview.focus.clone().add(new THREE.Vector3(Math.sin(overview.yaw) * overview.dist * 0.75, overview.dist * 0.62, Math.cos(overview.yaw) * overview.dist * 0.75));
  camera.position.lerp(desired, Math.min(1, dt * 2.5));
  camera.lookAt(overview.focus);
  selectRing.visible = true;
  selectRing.scale.set(f.rx + 1.2, f.rz + 1.2, 1);
  selectRing.position.set(f.x, 0.3 + Math.sin(clock.elapsedTime * 3) * 0.15, f.z);
  if (sun.castShadow) { sun.target.position.copy(overview.focus); sun.position.copy(SUN_DIR).multiplyScalar(50).add(overview.focus); }
}

// ---------- Event kelas: Bos Mitos Gizi (sejak 1.5) ----------
// Raksasa muncul di sisi utara Alun-alun selama event; status (HP, menang/kalah) selalu dari server.
const BOSS_AT = { x: -1, z: -12 };
const regionSpots = {}; // diisi region.js: desa pusat & kampung budaya tiap wilayah pos
let kampung = null;
let bossModel = null;
let bossHp = null;
function updateBoss(dt) {
  const st = window.NutraRPG ? window.NutraRPG.boss : null;
  const show = Boolean(st && st.state && st.state !== 'idle');
  if (!bossModel) {
    if (!show) return;
    bossModel = createBoss();
    const f = frame(0);
    bossModel.group.position.set(f.x + BOSS_AT.x, 0, f.z + BOSS_AT.z);
    scene.add(bossModel.group);
  }
  bossModel.group.visible = show;
  if (!show) { bossHp = null; return; }
  const at = bossModel.group.position;
  if (bossHp !== null && st.hp < bossHp && Math.hypot(self.x - at.x, self.z - at.z) < 120) {
    bossModel.hit();
    fx.sparkle({ x: at.x, y: 3.4, z: at.z + 1.5 }, '#ffd17c');
    fx.ring({ x: at.x, y: 0.1, z: at.z }, { color: '#c58cf0', from: 1, to: 5, life: 0.5 });
  }
  if (st.state === 'won' && bossHp !== 0) fx.confetti({ x: at.x, y: 4, z: at.z });
  bossHp = st.hp;
  bossModel.update(dt, st, self);
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
      applyOutfit(obj, p.wear || {});
      const ox = toX(p.tx ?? p.x); const oz = toZ(p.ty ?? p.y);
      add(obj, ox, groundAt(ox, oz), oz);
      o = { obj, label: null, labelText: '', x: ox, z: oz, h: groundAt(ox, oz), face: 0, speed: 0 };
      others.set(id, o);
      fx.ring({ x: o.x, y: o.h, z: o.z }, { color: p.color.startsWith('#') ? p.color : PALETTE.cyan });
    }
    // Tinggi dari server = tinggi di atas blok medan, jadi ditambah tinggi medan di posisi pemain itu.
    if (p.wear) applyOutfit(o.obj, p.wear); // tidak berbuat apa-apa bila busananya sama
    const tx = toX(p.tx ?? p.x); const tz = toZ(p.ty ?? p.y); const th = terrainH(tx, tz) + (p.th || 0);
    const k = Math.min(1, dt * 10);
    const dx = (tx - o.x) * k; const dz = (tz - o.z) * k;
    if (Math.hypot(tx - o.x, tz - o.z) > 12) { o.x = tx; o.z = tz; } else { o.x += dx; o.z += dz; }
    o.h += (th - o.h) * Math.min(1, dt * 14);
    const sp = Math.hypot(dx, dz) / Math.max(dt, 0.001);
    o.speed += (Math.min(1, sp / SPEED) - o.speed) * Math.min(1, dt * 8);
    if (sp > 0.3) o.face = Math.atan2(dx, dz);
    o.obj.position.set(o.x, o.h, o.z);
    o.obj.rotation.y = o.face;
    const oFloor = groundAt(o.x, o.z);
    o.obj.userData.animate(dt, { speed: o.speed, airborne: o.h - oFloor > 0.05, height: o.h - oFloor });
    const mate = net.isTeammate(id);
    const text = `${mate ? '🤝 ' : ''}${lvTag(p.lv)}${p.alias}${p.seals ? `  ✦${p.seals}` : ''}`;
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

// Cuaca pulau sekarang + berikutnya (teks, bukan hanya ikon/warna).
const weatherText = (id) => {
  const f = forecast(id);
  const w = WEATHER[f.kind]; const n = WEATHER[f.next];
  const se = seasonOf(id);
  return { now: `${w.icon} ${w.label}`, next: `${n.icon} ${n.label}`, minutes: f.minutesLeft, climate: f.climate.name, season: `${se.icon} ${se.name}`, seasonShort: `${se.icon} ${se.name.replace('Musim ', '')}`, seasonDesc: se.desc };
};
let weatherHudText = '';
function updateWeatherHud() {
  const el = document.getElementById('w3-weather');
  const show = mode === 'play' || mode === 'drop';
  el.hidden = !show;
  if (!show) return;
  const w = weatherText(weatherIsland);
  const text = `${w.seasonShort} · ${w.now} · ${w.minutes} mnt lagi ${w.next}`;
  if (text === weatherHudText) return;
  weatherHudText = text;
  el.textContent = text;
  el.title = `${w.season}: ${w.seasonDesc}. Iklim: ${w.climate}. Sekarang ${w.now}; ${w.minutes} menit lagi berganti ${w.next}. Cuaca hanya mengubah suasana.`;
}

const lvTag = (lv) => (lv && window.NutraRPG && window.NutraRPG.visible ? `Lv ${lv} · ` : '');
let selfLabelText = '';
function updateSelfLabel() {
  const rpg = window.NutraRPG && window.NutraRPG.view;
  const text = `${lvTag(rpg && rpg.level)}${game.state.alias || 'Kamu'}  ✦${game.sealCount()}`;
  if (text === selfLabelText) return;
  if (self.label) self.obj.remove(self.label);
  self.label = createLabel(text, { color: PALETTE.gold, size: 24 });
  self.label.position.set(0, 2.55, 0);
  self.obj.add(self.label);
  selfLabelText = text;
}

function updateGoal() {
  const goal = nextGoal();
  let p = null;
  if (goal.item) p = { x: goal.item.x, y: 3.6, z: goal.item.z };
  else if (goal.point) p = { x: goal.point.x, y: 9, z: goal.point.z };
  const d = p ? Math.hypot(p.x - self.x, p.z - self.z) : 0;
  // Wilayah luas: tampilkan jarak ke tujuan (1 satuan dunia ≈ 1 m)
  document.getElementById('w3-goal').textContent = p && d > 15 ? `${goal.text} · ${d >= 1000 ? `${(d / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(d)} m`}` : goal.text;
  arrow.visible = Boolean(p) && mode === 'play';
  if (p) arrow.userData.base = p;
  beacon.visible = arrow.visible && d > 25;
  if (p) beacon.position.set(p.x, terrainH(p.x, p.z), p.z);
}

function animateWorld(dt) {
  const t = clock.elapsedTime;
  nara.userData.animate(dt);
  animateBoutique(dt);
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
    if (o.userData.drift) { o.position.x += o.userData.drift * dt; if (o.position.x > HALF_W + 100) o.position.x = -HALF_W - 100; }
    if (o.userData.kite) {
      const k = o.userData.kite; k.a += k.s * dt;
      o.position.set((k.cx || 0) + Math.cos(k.a) * k.r, k.y + Math.sin(t * 1.3 + k.r) * 1.2, (k.cz || 0) + Math.sin(k.a) * k.r);
      o.rotation.set(Math.sin(t * 2 + k.r) * 0.15, -k.a, Math.sin(t * 1.7 + k.r) * 0.25);
      o.userData.tail.forEach((b, j) => { b.position.x = Math.sin(t * 5 + j * 0.8) * 0.12 * j; });
    }
    if (o.userData.pinisi) { const p = o.userData.pinisi; p.a += p.s * dt; o.position.set(Math.cos(p.a) * p.rx, -11.2 + Math.sin(t + p.rx) * 0.3, Math.sin(p.a) * p.rz); o.rotation.y = -Math.atan2(Math.cos(p.a) * p.rz, -Math.sin(p.a) * p.rx) + Math.PI / 2; o.rotation.z = Math.sin(t * 0.9 + p.rx) * 0.04; }
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
  if (statusTimer <= 0) { statusTimer = 0.5; quests.refresh(); refreshIslands(); updateSelfLabel(); updateGoal(); updateWeatherHud(); }
  pollGamepad(dt);
  if (mode === 'overview') updateOverview(dt);
  else if (mode === 'drop') updateDrop(dt);
  else if (mode === 'play') updatePlay(dt);
  if (mode !== 'overview') { selectRing.visible = false; setView(mode === 'play' && camMode === 'iso' ? isoView() : playView()); }
  // Medan blok tampil saat bermain/terjun (permukaan datar wilayah pos disembunyikan); mode peta memakai permukaan datar.
  const blocks = Boolean(terrain) && mode !== 'overview';
  if (terrain) {
    terrain.visible = blocks;
    if (blocks) terrain.update(camMode === 'iso' ? camera.position.x : self.x, camMode === 'iso' ? camera.position.z : self.z);
  }
  regionTops.forEach((t) => { t.visible = !blocks; });
  if (self.island >= 0) weatherIsland = self.island;
  // Kabut tidak boleh lebih jauh dari radius medan yang dimuat (saat bermain); mode peta memakai kabut jauhnya sendiri.
  if (weather) weather.update(dt, clock.elapsedTime, { island: weatherIsland, active: mode === 'play' || mode === 'drop', camera, fogNear: viewFog.near, fogFar: viewFog.far, maxFar: blocks ? terrain.radius - 10 : Infinity });
  // Sudut pandang (FOV) mengikuti mode kamera; Orang Pertama memakai FOV sebagai zoom.
  const wantFov = mode === 'play' ? camFov() : 50;
  if (Math.abs(camera.fov - wantFov) > 0.05) {
    camera.fov += (wantFov - camera.fov) * (reducedMotion() ? 1 : Math.min(1, dt * 8));
    camera.updateProjectionMatrix();
  }
  updateOthers(dt);
  updateBoss(dt);
  if (kampung) kampung.update(dt, self);
  animateWorld(dt);
  if (horizon) horizon.position.set(camera.position.x, 0, camera.position.z);
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

function stop() { running = false; keys.clear(); stick.x = stick.y = 0; nearby = null; walkTo.point = null; aim.active = false; camCtl.lock = null; camCtl.reset = false; exitFreeLook(); if (quests) quests.closePanel(true); panelOpen = false; }

function applyMode(prev) {
  const is3d = gfx !== '2d';
  window.NUTRA_WORLD_MODE = is3d ? '3d' : '2d';
  wrap.hidden = !is3d;
  canvas2d.hidden = is3d;
  document.querySelector('.world-screen').classList.toggle('is-3d', is3d);
  renderGfxBar();
  renderCamBar();
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

document.addEventListener('nutra:outfit', (e) => { if (self.obj) applyOutfit(self.obj, e.detail || {}); });

document.addEventListener('nutra:screen', (e) => {
  if (e.detail === 'world' && landed && gfx !== '2d') { if (window.NutraWorld2D) window.NutraWorld2D.stop(); if (mode === 'off') mode = 'play'; start(); }
  else if (e.detail !== 'world') stop();
});

if (net) {
  net.on('welcome', ({ you }) => { if (self.obj) self.obj.userData.setColor(you.color); });
  net.on('teleport', ({ x, y }) => { if (built && gfx !== '2d' && mode === 'play') { self.x = toX(x); self.z = toZ(y); if (terrain) terrain.prime(self.x, self.z, 70); self.h = groundAt(self.x, self.z); self.vy = 0; fx.ring({ x: self.x, y: self.h, z: self.z }); game.showToast('Guru memindahkan posisimu.'); } });
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
  /** Pulau tempat pemain berada (dipakai HUD regu). */
  get island() { return mode === 'play' || mode === 'drop' ? self.island : null; },
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
  debug: { get self() { return self; }, get nearby() { return nearby; }, ground: (x, z) => groundAt(x, z), surface: (x, z) => (terrain ? terrain.surface(x, z) : null), get weather() { return weatherText(weatherIsland); }, get chunks() { return terrain ? terrain.pickables.length : 0; }, get waterMeshes() { return terrain ? terrain.group.children.filter((m) => m.material && m.material.transparent).length : 0; }, setCam: (yaw, pitch) => { camCtl.reset = false; releaseLock(false); cam.yaw = yaw; cam.pitch = pitch; }, get cam() { return { mode: camMode, yaw: cam.yaw, pitch: cam.pitch, zoom: cam.dist, fov: camera ? camera.fov : null, lock: camCtl.lock ? camCtl.lock.kind : null, pan: camCtl.pan.length(), freeLook: camCtl.freeLook }; }, interact: () => interact(), get items() { return quests ? quests.items.map(({ kind, pos, row, x, z }) => ({ kind, pos, row, x, z })) : []; }, get kampung() { return kampung ? kampung.targets.map(({ kind, id, item, x, z }) => ({ kind, id, item, x, z })) : []; } },
  stop
};

applyMode();
