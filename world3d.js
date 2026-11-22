/*
 * Dunia 3D NUTRANTARA — platformer petualangan low-poly di Pulau Nusantara.
 * Koordinat server tetap 2D (piksel 960×600 dari world-data.js); di sini dipetakan ke ruang 3D.
 * Kontrol: WASD/panah bergerak (relatif kamera), Spasi melompat, E berinteraksi, seret mouse memutar kamera,
 * gulir untuk zoom. Layar sentuh: joystick + tombol lompat/aksi.
 * Bila WebGL tidak tersedia atau pemain memilih 2D, dunia 2D (world.js) dipakai.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { createExplorer, createNara, createLabel, createBubble, toon, PALETTE } from './characters.js';

const W = window.NUTRANTARA_WORLD;
const game = window.NutraGame;
const net = window.NutraNet;
const MISSIONS = window.NUTRANTARA_MISSIONS || [];
const GFX_KEY = 'nutrantara-gfx';
const POS_KEY = 'nutrantara-world-pos-v1';

// ---------- Pemetaan koordinat ----------
const S = 1 / 16;
const toX = (px) => (px - W.island.cx) * S;
const toZ = (py) => (py - W.island.cy) * S;
const toPx = (x) => x / S + W.island.cx;
const toPy = (z) => z / S + W.island.cy;

const SPEED = 7.2;
const GRAVITY = 26;
const JUMP = 9.6;
const INTERACT = W.interactRadius * S;
const STATUS_COLOR = { done: PALETTE.green, ready: PALETTE.cyan, locked: '#6c7f79' };

function hasWebGL() {
  try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function defaultGfx() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  return coarse || (navigator.hardwareConcurrency || 4) < 4 ? 'low' : 'high';
}

let gfx = localStorage.getItem(GFX_KEY) || defaultGfx();
if (!hasWebGL()) gfx = '2d';

const stage = document.querySelector('.world-stage');
const canvas2d = document.getElementById('world-canvas');
const promptEl = document.getElementById('world-prompt');
const actionBtn = document.getElementById('world-action');

// ---------- DOM: wadah 3D, HUD, kontrol sentuh, pemilih grafis ----------
const wrap = document.createElement('div');
wrap.className = 'world3d';
wrap.innerHTML = `
  <div class="w3-hud">
    <div class="w3-chip" title="Kepingan arsip yang sudah dikumpulkan"><span aria-hidden="true">✦</span> <b id="w3-shards">0</b>/<span id="w3-shards-total">0</span> <small>KEPINGAN ARSIP</small></div>
    <div class="w3-chip w3-goal" id="w3-goal"></div>
  </div>
  <div class="w3-touch" aria-hidden="true">
    <div class="w3-stick" id="w3-stick"><i></i></div>
    <div class="w3-buttons"><button type="button" id="w3-jump" tabindex="-1">LOMPAT</button><button type="button" id="w3-act" tabindex="-1">AKSI</button></div>
  </div>
  <div class="w3-loading" id="w3-loading">Memuat pulau…</div>`;
stage.insertBefore(wrap, canvas2d);

const gfxBar = document.createElement('div');
gfxBar.className = 'w3-gfx';
gfxBar.setAttribute('role', 'group');
gfxBar.setAttribute('aria-label', 'Mode grafis');
gfxBar.innerHTML = '<span>GRAFIS</span><button type="button" data-gfx="high">3D Tinggi</button><button type="button" data-gfx="low">3D Ringan</button><button type="button" data-gfx="2d">2D</button>';
document.querySelector('.world-keys').before(gfxBar);
const keysHelp = document.querySelector('.world-keys');

function renderGfxBar() {
  gfxBar.querySelectorAll('[data-gfx]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.gfx === gfx));
    if (b.dataset.gfx !== '2d') b.disabled = !hasWebGL();
  });
  keysHelp.innerHTML = gfx === '2d'
    ? '<kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd> berjalan · <kbd>E</kbd> berinteraksi · klik/sentuh untuk berjalan · lebih nyaman dengan papan ketik? Gunakan <button type="button" class="link-button" data-screen="map">Peta</button>.'
    : '<kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd> berjalan · <kbd>Spasi</kbd> melompat · <kbd>E</kbd> berinteraksi · seret mouse memutar kamera · gulir untuk zoom · tanpa 3D? Gunakan <button type="button" class="link-button" data-screen="map">Peta</button>.';
}

gfxBar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-gfx]');
  if (!b || b.disabled) return;
  const prev = gfx;
  gfx = b.dataset.gfx;
  localStorage.setItem(GFX_KEY, gfx);
  applyMode(prev);
});

// ---------- Three.js dasar ----------
let renderer = null;
let scene;
let camera;
let sun;
let ocean;
let oceanBase;
const clock = new THREE.Clock();
let running = false;
let built = false;

const cam = { yaw: 0, pitch: 0.48, dist: 10.5 };
const self = { x: 0, z: 0, h: 0, vy: 0, grounded: true, face: Math.PI, speed: 0, obj: null };
const others = new Map(); // id -> { obj, label, labelText, x, z, h, face }
const portals = new Map(); // id -> { group, ring, disc, lock, statusKey, numLabel }
const shards = []; // { id, obj, x, y, z, taken }
const platforms = []; // { x, z, hw, hd, top }
const bubbles = []; // { sprite, follow, until }
let nara;
let smoke = [];
let animated = [];
let clouds = [];
let nearby = null;
let lastSent = 0;
let lastPxKey = '';
let statusTimer = 0;

function initRenderer() {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: gfx === 'high', powerPreference: 'high-performance' });
  } catch {
    renderer = null;
    return false;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'w3-canvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Pulau NUTRANTARA 3D. W A S D atau panah untuk berjalan, spasi untuk melompat, E untuk berinteraksi.');
  renderer.domElement.setAttribute('aria-describedby', 'world-prompt');
  wrap.prepend(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fdbe6');
  scene.fog = new THREE.Fog('#9fdbe6', 45, 120);
  camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 300);
  scene.add(new THREE.HemisphereLight('#e6fbff', '#3c7a52', 1.6));
  sun = new THREE.DirectionalLight('#fff1d6', 2.1);
  sun.position.set(18, 30, 14);
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 22, bottom: -22, near: 1, far: 90 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  bindInput(renderer.domElement);
  return true;
}

function applyQuality() {
  if (!renderer) return;
  const high = gfx === 'high';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 2 : 1));
  renderer.shadowMap.enabled = high;
  sun.castShadow = high;
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
}

// ---------- Pembangunan dunia ----------
const rand = (() => { let s = 20261122; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })();

function add(obj, x = 0, y = 0, z = 0, parent = scene) {
  obj.position.set(x, y, z);
  parent.add(obj);
  obj.traverse((o) => { if (o.isMesh && o.castShadow !== false) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c));
const cyl = (rt, rb, h, c, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), toon(c));
const sph = (r, c, seg = 10) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), toon(c));

function buildWorld() {
  const rx = W.island.rx * S;
  const rz = W.island.ry * S;

  // Laut
  oceanBase = new THREE.PlaneGeometry(320, 320, 48, 48);
  oceanBase.rotateX(-Math.PI / 2);
  ocean = new THREE.Mesh(oceanBase, toon('#2a8fa0', { transparent: true, opacity: 0.94 }));
  ocean.position.y = -0.55;
  ocean.receiveShadow = true;
  scene.add(ocean);
  const shallow = new THREE.Mesh(new THREE.RingGeometry(1, 1.22, 64), new THREE.MeshBasicMaterial({ color: '#8ff0e8', transparent: true, opacity: 0.45, depthWrite: false }));
  shallow.rotation.x = -Math.PI / 2;
  shallow.scale.set(rx + 1.6, rz + 1.6, 1);
  shallow.position.y = -0.5;
  scene.add(shallow);

  // Pulau: pasir + rumput
  const sand = cyl(1, 1.08, 1.2, '#eed9a2', 64);
  sand.scale.set(rx + 1.6, 1, rz + 1.6);
  add(sand, 0, -0.65, 0).castShadow = false;
  const grass = cyl(1, 1, 0.6, '#5cbf72', 64);
  grass.scale.set(rx, 1, rz);
  add(grass, 0, -0.3, 0).castShadow = false;
  // Petak rumput lebih tua untuk variasi
  for (let i = 0; i < 14; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.8;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1.4 + rand() * 2, 10), toon('#4fae66'));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(Math.cos(a) * r * rx, 0.011, Math.sin(a) * r * rz);
    patch.receiveShadow = true;
    scene.add(patch);
  }

  // Jalur bercahaya antar-pos
  const pts = [W.spawn, ...W.stations].map((p) => new THREE.Vector3(toX(p.x), 0.02, toZ(p.y)));
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]; const b = pts[i + 1];
    const len = a.distanceTo(b);
    const seg = box(1.5, 0.04, len, '#efdcaa');
    seg.position.copy(a).lerp(b, 0.5);
    seg.lookAt(b.x, 0.02, b.z);
    seg.castShadow = false; seg.receiveShadow = true;
    scene.add(seg);
    // Batu pijakan kecil di pinggir jalur
    for (let k = 1; k < len; k += 2.2) {
      const p = a.clone().lerp(b, k / len);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), new THREE.MeshBasicMaterial({ color: PALETTE.gold }));
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(p.x, 0.05, p.z);
      scene.add(dot);
    }
  }
  pts.forEach((p) => { const d = cyl(0.95, 0.95, 0.04, '#efdcaa', 16); d.castShadow = false; add(d, p.x, 0.02, p.z); });

  buildSpawn();
  W.stations.forEach(buildStation);
  buildDecor(rx, rz);
  buildPlatformsAndShards();
  buildBackdrop();

  // Penjelajah (kamu)
  scene.traverse((o) => { if (o.userData.spin || o.userData.bob || o.userData.rise) animated.push(o); });
  self.obj = createExplorer(net && net.me ? net.me.color : PALETTE.cyan);
  add(self.obj);
  built = true;
}

function buildSpawn() {
  const nx = toX(W.nara.x); const nz = toZ(W.nara.y);
  nara = createNara();
  add(nara, nx, 0, nz);
  const nl = createLabel('NARA · PEMANDU', { color: PALETTE.green });
  nl.position.set(nx, 2.45, nz);
  scene.add(nl);

  // Gapura selamat datang
  const sx = toX(W.spawn.x) - 2.6; const sz = toZ(W.spawn.y) + 1.5;
  const gate = new THREE.Group();
  gate.add(add(box(0.35, 3, 0.35, '#8a5a35'), -2, 1.5, 0, gate), add(box(0.35, 3, 0.35, '#8a5a35'), 2, 1.5, 0, gate));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 0.9, 4), toon('#b5523b'));
  roof.rotation.y = Math.PI / 4; roof.scale.z = 0.35;
  add(roof, 0, 3.4, 0, gate);
  add(box(3.6, 0.5, 0.15, PALETTE.deep), 0, 2.75, 0.1, gate);
  const sign = createLabel('PULAU NUTRANTARA', { color: PALETTE.gold, bg: 'rgba(7,21,22,0)', size: 30, scale: 0.009 });
  sign.position.set(0, 2.76, 0.3);
  gate.add(sign);
  gate.rotation.y = 0.5;
  add(gate, sx, 0, sz);

  // Sawah bertingkat kecil
  const px = toX(150); const pz = toZ(220);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const terrace = new THREE.Group();
      add(box(1.9, 0.18 + r * 0.22, 1.5, '#6b8f3a'), 0, (0.18 + r * 0.22) / 2, 0, terrace);
      const water = box(1.6, 0.02, 1.2, '#7fd3d6');
      water.castShadow = false;
      add(water, 0, 0.19 + r * 0.22, 0, terrace);
      for (let k = 0; k < 6; k += 1) {
        const rice = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 4), toon('#9bdc5a'));
        add(rice, -0.6 + (k % 3) * 0.6, 0.4 + r * 0.22, -0.35 + Math.floor(k / 3) * 0.7, terrace);
      }
      add(terrace, px + c * 2.05, 0, pz - r * 1.6);
    }
  }
}

// Penanda khas tiap pos
const LANDMARKS = {
  1(g) { // Kantin Nusantara: warung bertenda garis + dua piring menu
    add(box(3.2, 1, 1.4, '#a0683e'), 0, 0.5, 0, g);
    add(box(3.4, 0.12, 1.6, '#d9b07a'), 0, 1.06, 0, g);
    [-1.5, 1.5].forEach((x) => add(cyl(0.08, 0.08, 2.4, '#7a4a2a', 6), x, 1.2, 0.7, g));
    for (let i = 0; i < 6; i += 1) {
      const stripe = box(0.58, 0.08, 1.9, i % 2 ? '#fff4e0' : '#e4604b');
      stripe.rotation.x = -0.35;
      add(stripe, -1.45 + i * 0.58, 2.35, 0.35, g);
    }
    add(cyl(0.38, 0.32, 0.08, '#ffffff', 14), -0.6, 1.16, 0.1, g);
    add(cyl(0.38, 0.32, 0.08, '#ffffff', 14), 0.6, 1.16, 0.1, g);
    add(sph(0.22, '#f3e6b0', 8), -0.6, 1.25, 0.1, g);
    add(sph(0.22, '#c78a3c', 8), 0.6, 1.25, 0.1, g);
    const a = createLabel('MENU A', { size: 22 }); a.position.set(-0.6, 1.7, 0.2); g.add(a);
    const b = createLabel('MENU B', { size: 22 }); b.position.set(0.6, 1.7, 0.2); g.add(b);
  },
  2(g) { // Laboratorium Pencernaan: kubah kaca dengan saluran cerna berliku
    add(cyl(1.7, 1.9, 0.5, '#d4e3df', 20), 0, 0.25, 0, g);
    const tube = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.16, 80, 10, 2, 3), toon(PALETTE.coral));
    add(tube, 0, 1.45, 0, g).userData.spin = 0.5;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.65, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.32, depthWrite: false }));
    dome.castShadow = false;
    add(dome, 0, 0.5, 0, g);
    add(cyl(0.12, 0.12, 1.2, '#d4e3df', 8), 1.9, 0.6, 0.4, g);
    add(sph(0.28, PALETTE.green, 10), 1.9, 1.3, 0.4, g);
  },
  3(g) { // Gerbang Penyerapan: lengkung vili usus dengan butir nutrisi naik
    for (let i = 0; i <= 8; i += 1) {
      const a = Math.PI * (i / 8);
      const v = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), toon('#f19a8c'));
      v.position.set(Math.cos(a) * 2, 0.6 + Math.sin(a) * 2.2, 0);
      v.rotation.z = a - Math.PI / 2;
      add(v, v.position.x, v.position.y, 0, g);
    }
    for (let i = 0; i < 7; i += 1) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), toon(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.7 }));
      n.userData.rise = { base: rand() * 3, x: -1.5 + rand() * 3 };
      add(n, n.userData.rise.x, 0.5, (rand() - 0.5) * 0.6, g);
    }
  },
  4(g) { // Jejak Sebab Akibat: barisan domino yang mulai jatuh
    for (let i = 0; i < 6; i += 1) {
      const d = box(0.3, 1.4, 0.8, i % 2 ? PALETTE.white : '#2c5d57');
      d.rotation.z = i < 2 ? -0.5 + i * 0.25 : 0;
      add(d, -2 + i * 0.75, 0.7, 0, g);
      if (i % 2 === 0) { const dot = sph(0.07, PALETTE.deep, 6); add(dot, -2 + i * 0.75, 1.0, 0.41, g); }
    }
  },
  5(g) { // Pemecah Klaim: kristal klaim + kaca pembesar raksasa
    [[0, 1.2, 0, 0.9], [-0.9, 0.7, 0.3, 0.55], [0.8, 0.6, -0.2, 0.5], [0.3, 0.45, 0.6, 0.35]].forEach(([x, y, z, r]) => {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), toon(PALETTE.cyan, { emissive: '#2a9fb0', emissiveIntensity: 0.3 }));
      c.scale.y = 1.6;
      add(c, x, y, z, g);
    });
    const lens = new THREE.Group();
    add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.09, 8, 24), toon(PALETTE.gold)), 0, 0, 0, lens);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.66, 24), new THREE.MeshBasicMaterial({ color: '#dff', transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    lens.add(glass);
    const handle = cyl(0.08, 0.1, 1.1, '#7a4a2a', 8);
    add(handle, 0, -1.2, 0, lens);
    lens.rotation.z = 0.5;
    add(lens, 1.6, 1.8, 0.4, g).userData.bob = true;
  },
  6(g) { // Dapur Juara: pendopo beratap joglo, tungku & wajan, tumpeng
    add(box(4, 0.25, 3, '#c79a63'), 0, 0.12, 0, g);
    [[-1.7, -1.2], [1.7, -1.2], [-1.7, 1.2], [1.7, 1.2]].forEach(([x, z]) => add(cyl(0.12, 0.12, 2.4, '#7a4a2a', 6), x, 1.4, z, g));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 4), toon('#8b3b2c'));
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.8;
    add(roof, 0, 3.3, 0, g);
    add(box(1.1, 0.7, 0.8, '#a9a39a'), -0.9, 0.6, -0.4, g);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#3a3a3a')), -0.9, 1.15, -0.4, g);
    add(box(1.2, 0.6, 0.8, '#a0683e'), 0.9, 0.55, 0.2, g);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 12), toon('#f2c94c')), 0.9, 1.25, 0.2, g);
    add(cyl(0.5, 0.5, 0.05, '#4caf6e', 14), 0.9, 0.87, 0.2, g);
    smoke = [0, 1, 2, 3].map((i) => { const p = sph(0.22, '#f3f6f5', 8); p.castShadow = false; p.userData.off = i / 4; add(p, -0.9, 1.6, -0.4, g); return p; });
  }
};

// Penanda wilayah diletakkan di sisi luar pulau (menjauhi jalur), menghadap ke portal.
function landmarkSpot(st) {
  const x = toX(st.x); const z = toZ(st.y);
  const len = Math.hypot(x, z);
  const dx = len > 3 ? x / len : 0; const dz = len > 3 ? z / len : -1;
  return { x: x + dx * 3.4, z: z + dz * 3.4, rot: Math.atan2(-dx, -dz) };
}

function buildStation(st) {
  const x = toX(st.x); const z = toZ(st.y);
  const m = MISSIONS.find((mm) => mm.id === st.id);
  const spot = landmarkSpot(st);
  const lm = new THREE.Group();
  LANDMARKS[st.id](lm);
  lm.rotation.y = spot.rot;
  add(lm, spot.x, 0, spot.z);

  // Portal
  const group = new THREE.Group();
  const base = cyl(1.5, 1.6, 0.25, '#2c4f4b', 24);
  add(base, 0, 0.12, 0, group);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.16, 10, 32), toon(PALETTE.cyan, { unique: true, emissive: PALETTE.cyan, emissiveIntensity: 0.6 }));
  add(ring, 0, 1.55, 0, group);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  disc.castShadow = false;
  add(disc, 0, 1.55, 0, group);
  const lock = new THREE.Group();
  [-0.55, 0, 0.55].forEach((bx) => add(cyl(0.06, 0.06, 2.2, '#9aa7a3', 6), bx, 1.55, 0.05, lock));
  add(box(0.5, 0.42, 0.18, PALETTE.gold), 0, 1.4, 0.18, lock);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12, Math.PI), toon(PALETTE.gold)), 0, 1.62, 0.18, lock);
  group.add(lock);
  const numLabel = createLabel(`POS ${String(st.id).padStart(2, '0')}`, { color: PALETTE.cyan, size: 30 });
  numLabel.position.set(0, 3.25, 0);
  group.add(numLabel);
  const nameLabel = createLabel(m ? `${m.title} ${m.titleEm}` : st.name, { size: 24 });
  nameLabel.position.set(0, 2.85, 0);
  group.add(nameLabel);
  group.rotation.y = spot.rot;
  add(group, x, 0, z);
  portals.set(st.id, { group, ring, disc, lock, statusKey: '', numLabel });
}

function buildPalm(x, z, s = 1) {
  const g = new THREE.Group();
  let px = 0; let py = 0;
  const lean = (rand() - 0.5) * 0.5;
  for (let i = 0; i < 6; i += 1) {
    const seg = cyl(0.13 - i * 0.012, 0.15 - i * 0.012, 0.55, i % 2 ? '#a8794a' : '#8a5f37', 7);
    px += lean * 0.12;
    add(seg, px, py + 0.27, 0, g);
    seg.rotation.z = -lean * 0.4;
    py += 0.5;
  }
  for (let i = 0; i < 7; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.7, 4), toon(i % 2 ? '#3f9a5a' : '#4fb56a'));
    leaf.geometry.translate(0, 0.85, 0);
    leaf.rotation.set(1.95, (i / 7) * Math.PI * 2, 0, 'YXZ');
    leaf.scale.z = 0.35;
    add(leaf, px, py + 0.1, 0, g);
  }
  add(sph(0.12, '#6b4a2a', 6), px + 0.12, py - 0.05, 0.08, g);
  add(sph(0.12, '#6b4a2a', 6), px - 0.1, py - 0.08, -0.06, g);
  g.scale.setScalar(s);
  g.rotation.y = rand() * Math.PI * 2;
  return add(g, x, 0, z);
}

function buildDecor(rx, rz) {
  const busy = [...W.stations.map((s) => [toX(s.x), toZ(s.y), 2.6]), ...W.stations.map((s) => { const p = landmarkSpot(s); return [p.x, p.z, 3.4]; }), [toX(W.spawn.x), toZ(W.spawn.y), 3], [toX(W.nara.x), toZ(W.nara.y), 2], [toX(180), toZ(200), 4.5]];
  const free = (x, z) => busy.every(([bx, bz, r]) => Math.hypot(bx - x, bz - z) > r) && (x * x) / (rx * rx) + (z * z) / (rz * rz) < 0.86;
  W.trees.forEach(([tx, ty]) => { const x = toX(tx); const z = toZ(ty); if (free(x, z)) buildPalm(x, z, 0.9 + rand() * 0.4); });
  // Pohon kelapa di pantai
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 + rand() * 0.2;
    const x = Math.cos(a) * (rx + 0.4); const z = Math.sin(a) * (rz + 0.4);
    if (busy.every(([bx, bz, r]) => Math.hypot(bx - x, bz - z) > r)) buildPalm(x, z, 0.8 + rand() * 0.5);
  }
  // Semak, batu, bunga
  for (let i = 0; i < 70; i += 1) {
    const x = (rand() * 2 - 1) * rx; const z = (rand() * 2 - 1) * rz;
    if (!free(x, z)) continue;
    const k = rand();
    if (k < 0.45) add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rand() * 0.35, 0), toon(rand() < 0.5 ? '#3f9a5a' : '#2f8a4c')), x, 0.25, z);
    else if (k < 0.7) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + rand() * 0.3, 0), toon('#9aa59c')), x, 0.15, z);
    else {
      const f = new THREE.Group();
      add(cyl(0.02, 0.02, 0.3, '#3f9a5a', 4), 0, 0.15, 0, f);
      add(sph(0.09, ['#ff9f91', '#ffd17c', '#ffffff', '#c58cf0'][Math.floor(rand() * 4)], 6), 0, 0.32, 0, f);
      add(f, x, 0, z);
    }
  }
}

function buildPlatformsAndShards() {
  const tempe = '#e9d8a6';
  const defs = [
    // [x, z, ukuran, tinggi atas, warna]  — x,z dalam satuan dunia 3D
    [4.5, -2.8, 1.6, 0.7, tempe], [6.4, -4.2, 1.6, 1.45, tempe], [8.6, -5.4, 2.6, 2.2, '#f5c66b'],
    [-23.2, 3.2, 1.6, 0.7, tempe], [-23.8, 0.6, 1.8, 1.4, '#f5c66b'],
    [5.6, 12.2, 1.6, 0.7, tempe], [3.4, 13.6, 2.2, 1.45, '#f5c66b'],
    [20.5, -4.5, 1.6, 0.75, tempe], [22, -6.6, 2, 1.5, '#f5c66b']
  ];
  defs.forEach(([x, z, size, top, color]) => {
    const g = new THREE.Group();
    const slab = box(size, 0.4, size, color);
    add(slab, 0, top - 0.2, 0, g);
    // Bintik kedelai pada blok tempe
    for (let i = 0; i < 5; i += 1) add(sph(0.07, '#c9b37a', 5), (rand() - 0.5) * size * 0.8, top + 0.01, (rand() - 0.5) * size * 0.8, g);
    if (top > 0.8) add(cyl(0.12, 0.16, top - 0.4, '#8a5f37', 6), 0, (top - 0.4) / 2, 0, g);
    add(g, x, 0, z);
    platforms.push({ x, z, hw: size / 2, hd: size / 2, top });
  });

  const spots = [
    [8.6, 3.2, -5.4], [-23.8, 2.4, 0.6], [3.4, 2.45, 13.6], [22, 2.5, -6.6],
    [toX(250), 0.9, toZ(400)], [toX(400), 0.9, toZ(420)], [toX(540), 0.9, toZ(390)], [toX(690), 0.9, toZ(390)],
    [toX(730), 0.9, toZ(250)], [toX(560), 0.9, toZ(220)], [toX(330), 0.9, toZ(360)], [toX(120), 0.9, toZ(360)]
  ];
  spots.forEach(([x, y, z], i) => {
    const g = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), toon(PALETTE.gold, { emissive: '#c98a1a', emissiveIntensity: 0.55 }));
    leaf.scale.set(0.7, 1.15, 0.35);
    g.add(leaf);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.6 }));
    g.add(halo);
    add(g, x, y, z);
    shards.push({ id: i, obj: g, x, y, z, taken: false });
  });
  document.getElementById('w3-shards-total').textContent = String(shards.length);
}

function buildBackdrop() {
  // Gunung api di pulau seberang
  const v = new THREE.Group();
  add(cyl(26, 30, 3, '#6fa56a', 24), 0, -1, 0, v);
  add(new THREE.Mesh(new THREE.ConeGeometry(18, 20, 18), toon('#6b7f73')), 0, 10, 0, v);
  add(new THREE.Mesh(new THREE.ConeGeometry(6.5, 5, 18), toon('#8d9a92')), 0, 17.5, 0, v);
  add(v, 15, -0.5, -95);
  add(new THREE.Mesh(new THREE.ConeGeometry(10, 9, 12), toon('#7aa77a')), -60, 3.5, -80);
  // Awan
  for (let i = 0; i < 9; i += 1) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k += 1) { const p = sph(1.5 + rand() * 1.5, '#ffffff', 8); p.castShadow = false; add(p, k * 2 - 3, rand(), rand() - 0.5, c); }
    c.userData.drift = 0.4 + rand() * 0.6;
    add(c, -80 + rand() * 160, 16 + rand() * 8, -60 + rand() * 50);
    clouds.push(c);
  }
}

// ---------- Kepingan arsip (koleksi lokal, tidak memengaruhi skor) ----------
const shardKey = () => `nutrantara-shards-v1:${(game.state.alias || '').toLocaleLowerCase('id')}`;
function loadShards() {
  let taken = [];
  try { taken = JSON.parse(localStorage.getItem(shardKey())) || []; } catch { /* abaikan */ }
  shards.forEach((s) => { s.taken = taken.includes(s.id); s.obj.visible = !s.taken; });
  updateShardHud();
}
function saveShards() { try { localStorage.setItem(shardKey(), JSON.stringify(shards.filter((s) => s.taken).map((s) => s.id))); } catch { /* abaikan */ } }
function updateShardHud() { document.getElementById('w3-shards').textContent = String(shards.filter((s) => s.taken).length); }

// ---------- Masukan ----------
const keys = new Set();
const KEYMAP = { ArrowUp: 'f', KeyW: 'f', ArrowDown: 'b', KeyS: 'b', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
const stick = { x: 0, y: 0, id: null };
let jumpQueued = false;
const typing = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

window.addEventListener('keydown', (e) => {
  if (!running || typing(document.activeElement)) return;
  const onCanvas = renderer && (document.activeElement === renderer.domElement || document.activeElement === document.body);
  if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); if (onCanvas) e.preventDefault(); }
  if (e.code === 'Space' && onCanvas) { e.preventDefault(); jumpQueued = true; }
  if ((e.code === 'KeyE' || (e.code === 'Enter' && onCanvas)) && nearby) { e.preventDefault(); interact(); }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
window.addEventListener('blur', () => keys.clear());

function bindInput(el) {
  let drag = null;
  el.addEventListener('pointerdown', (e) => { el.focus(); drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    cam.yaw -= (e.clientX - drag.x) * 0.006;
    cam.pitch = Math.min(1.2, Math.max(0.15, cam.pitch + (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const end = () => { drag = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = Math.min(18, Math.max(5, cam.dist + e.deltaY * 0.01)); }, { passive: false });

  // Joystick sentuh
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
  document.getElementById('w3-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); jumpQueued = true; });
  document.getElementById('w3-act').addEventListener('pointerdown', (e) => { e.preventDefault(); interact(); });
}

actionBtn.addEventListener('click', () => { if (running) interact(); });

const canMove = () => !(net && net.online && (net.settings.paused || net.settings.movementLocked));

function interact() {
  if (!nearby) return;
  if (nearby.kind === 'nara') { naraTalk(); return; }
  keys.clear();
  game.openPos(nearby.id);
}

function naraTalk() {
  const st = game.state;
  const next = MISSIONS.find((m) => !st.posts[m.id].sealed);
  let text;
  if (!next) text = 'Semua segel aktif! Kamu Penjelajah Juara. Lihat Papan Peringkat, lalu bantu temanmu.';
  else if (!game.isUnlocked(next.id)) text = `Portal Pos ${next.id} sedang ditutup guru. Sambil menunggu, cari kepingan arsip di atas blok tempe!`;
  else text = `Tujuan berikutnya: Pos ${next.id} — ${next.title} ${next.titleEm}. Ikuti jalur emas, lalu tekan E di depan portal.`;
  say(nara, text, 2.7);
  game.showToast(`Nara: ${text}`);
}

function say(obj, text, height = 2.6) {
  const old = bubbles.findIndex((b) => b.follow === obj);
  if (old >= 0) { scene.remove(bubbles[old].sprite); bubbles.splice(old, 1); }
  const sprite = createBubble(text);
  scene.add(sprite);
  bubbles.push({ sprite, follow: obj, height, until: performance.now() + 6000 });
}

// ---------- Simulasi ----------
function update(dt) {
  // Gerak relatif kamera
  let ix = 0; let iz = 0;
  if (canMove()) {
    if (keys.has('f')) iz -= 1;
    if (keys.has('b')) iz += 1;
    if (keys.has('l')) ix -= 1;
    if (keys.has('r')) ix += 1;
    ix += stick.x; iz += stick.y;
  }
  const len = Math.hypot(ix, iz);
  if (len > 1) { ix /= len; iz /= len; }
  const sin = Math.sin(cam.yaw); const cos = Math.cos(cam.yaw);
  const mx = ix * cos + iz * sin;
  const mz = -ix * sin + iz * cos;
  const moving = Math.hypot(mx, mz) > 0.05;
  if (moving) {
    const nx = self.x + mx * SPEED * dt;
    const nz = self.z + mz * SPEED * dt;
    const c = W.clamp(toPx(nx), toPy(nz));
    self.x = toX(c.x); self.z = toZ(c.y);
    const target = Math.atan2(mx, mz);
    let diff = target - self.face;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    self.face += diff * Math.min(1, dt * 12);
  }
  self.speed += ((moving ? Math.min(1, len) : 0) - self.speed) * Math.min(1, dt * 10);

  // Lompat & gravitasi
  if (jumpQueued && self.grounded && canMove()) { self.vy = JUMP; self.grounded = false; }
  jumpQueued = false;
  const prevH = self.h;
  self.vy -= GRAVITY * dt;
  self.h += self.vy * dt;
  let floor = 0;
  platforms.forEach((p) => {
    if (Math.abs(self.x - p.x) <= p.hw + 0.2 && Math.abs(self.z - p.z) <= p.hd + 0.2 && prevH >= p.top - 0.05) floor = Math.max(floor, p.top);
  });
  if (self.h <= floor) { self.h = floor; self.vy = 0; self.grounded = true; } else self.grounded = false;

  self.obj.position.set(self.x, self.h, self.z);
  self.obj.rotation.y = self.face;
  self.obj.userData.animate(dt, { speed: self.speed, airborne: !self.grounded, height: self.h - floor });

  // Kirim posisi 10×/detik
  const now = performance.now();
  const px = Math.round(toPx(self.x)); const py = Math.round(toPy(self.z));
  const key = `${px},${py},${Math.round(self.h * 10)}`;
  if (now - lastSent > 100 && key !== lastPxKey) {
    lastSent = now;
    lastPxKey = key;
    if (net) net.sendMove(px, py, self.h);
    try { localStorage.setItem(POS_KEY, JSON.stringify({ x: px, y: py })); } catch { /* abaikan */ }
  }

  updateOthers(dt);
  updateShards(dt);
  updateNearby();
  updateCamera(dt);
  animateWorld(dt);
}

function updateOthers(dt) {
  if (!net) return;
  const seen = new Set();
  net.players.forEach((p, id) => {
    seen.add(id);
    let o = others.get(id);
    if (!o) {
      const obj = createExplorer(p.color);
      add(obj, toX(p.tx ?? p.x), 0, toZ(p.ty ?? p.y));
      o = { obj, label: null, labelText: '', x: obj.position.x, z: obj.position.z, h: 0, face: 0, speed: 0 };
      others.set(id, o);
    }
    const tx = toX(p.tx ?? p.x); const tz = toZ(p.ty ?? p.y); const th = p.th || 0;
    const k = Math.min(1, dt * 10);
    const dx = (tx - o.x) * k; const dz = (tz - o.z) * k;
    o.x += dx; o.z += dz; o.h += (th - o.h) * Math.min(1, dt * 14);
    const sp = Math.hypot(dx, dz) / Math.max(dt, 0.001);
    o.speed += (Math.min(1, sp / SPEED) - o.speed) * Math.min(1, dt * 8);
    if (sp > 0.3) o.face = Math.atan2(dx, dz);
    o.obj.position.set(o.x, o.h, o.z);
    o.obj.rotation.y = o.face;
    o.obj.userData.animate(dt, { speed: o.speed, airborne: o.h > 0.05, height: o.h });
    const text = `${p.alias}${p.seals ? `  ✦${p.seals}` : ''}`;
    if (text !== o.labelText) {
      if (o.label) o.obj.remove(o.label);
      o.label = createLabel(text, { size: 24 });
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

function updateShards(dt) {
  shards.forEach((s) => {
    if (s.taken) return;
    s.obj.rotation.y += dt * 2;
    s.obj.position.y = s.y + Math.sin(clock.elapsedTime * 2 + s.id) * 0.12;
    if (Math.hypot(s.x - self.x, s.z - self.z) < 0.9 && Math.abs(self.h + 0.8 - s.obj.position.y) < 1.3) {
      s.taken = true;
      s.obj.visible = false;
      saveShards();
      updateShardHud();
      const n = shards.filter((x) => x.taken).length;
      game.showToast(n === shards.length ? `Semua ${n} kepingan arsip terkumpul! Arsip Nusantara bersinar.` : `Kepingan arsip ditemukan! (${n}/${shards.length})`);
    }
  });
}

function updateNearby() {
  let found = null;
  if (Math.hypot(nara.position.x - self.x, nara.position.z - self.z) < INTERACT) found = { kind: 'nara' };
  W.stations.forEach((s) => {
    if (Math.hypot(toX(s.x) - self.x, toZ(s.y) - self.z) < INTERACT && self.h < 1) found = { kind: 'station', id: s.id, name: s.name };
  });
  const key = found ? `${found.kind}${found.id || ''}` : '';
  const prevKey = nearby ? `${nearby.kind}${nearby.id || ''}` : 'none';
  nearby = found;
  if (key === prevKey) return;
  if (!found) {
    promptEl.textContent = 'Jelajahi pulau. Dekati portal pos atau Nara, lalu tekan E. Kumpulkan kepingan arsip di atas blok tempe!';
    actionBtn.hidden = true;
    return;
  }
  if (found.kind === 'nara') {
    promptEl.textContent = 'Nara ada di dekatmu. Tekan E untuk meminta arahan.';
    actionBtn.textContent = 'Bicara dengan Nara';
  } else {
    const status = game.posStatus(found.id);
    promptEl.textContent = `Portal Pos ${found.id} — ${found.name} (${status === 'done' ? 'selesai' : status === 'ready' ? 'siap dimasuki' : 'terkunci'}). Tekan E untuk masuk.`;
    actionBtn.textContent = status === 'locked' ? `Pos ${found.id} terkunci` : `Masuk Pos ${found.id}`;
  }
  actionBtn.hidden = false;
}

function updatePortals() {
  let goal = null;
  portals.forEach((p, id) => {
    const status = game.posStatus(id);
    if (!goal && status === 'ready') goal = id;
    if (status === p.statusKey) return;
    p.statusKey = status;
    const c = STATUS_COLOR[status];
    p.ring.material.color.set(c);
    p.ring.material.emissive.set(status === 'locked' ? '#000000' : c);
    p.disc.material.color.set(c);
    p.disc.material.opacity = status === 'locked' ? 0.15 : 0.45;
    p.lock.visible = status === 'locked';
  });
  const goalEl = document.getElementById('w3-goal');
  const m = goal && MISSIONS.find((mm) => mm.id === goal);
  goalEl.innerHTML = m ? `<span aria-hidden="true">➜</span> TUJUAN: <b>POS ${goal}</b> ${m.title} ${m.titleEm}` : game.sealCount() === MISSIONS.length ? '✓ EKSPEDISI SELESAI' : '⌑ MENUNGGU GURU MEMBUKA POS';
  updateSelfLabel();
}

function updateCamera(dt) {
  const target = new THREE.Vector3(self.x, self.h * 0.6 + 1.2, self.z);
  const off = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).multiplyScalar(cam.dist);
  const desired = target.clone().add(off);
  camera.position.lerp(desired, Math.min(1, dt * 6));
  camera.lookAt(target);
  if (sun.castShadow) {
    sun.position.set(self.x + 18, 30, self.z + 14);
    sun.target.position.set(self.x, 0, self.z);
  }
}

function animateWorld(dt) {
  const t = clock.elapsedTime;
  nara.userData.animate(dt);
  const toSelf = Math.atan2(self.x - nara.position.x, self.z - nara.position.z);
  nara.rotation.y += (toSelf - nara.rotation.y) * Math.min(1, dt * 3);
  portals.forEach((p) => {
    p.ring.rotation.z += dt * (p.statusKey === 'ready' ? 1.2 : 0.2);
    if (p.statusKey === 'ready') p.disc.material.opacity = 0.35 + Math.sin(t * 3) * 0.12;
  });
  animated.forEach((o) => {
    if (o.userData.spin) o.rotation.y += dt * o.userData.spin;
    if (o.userData.bob) o.position.y = 1.8 + Math.sin(t * 1.5) * 0.15;
    if (o.userData.rise) { const r = o.userData.rise; o.position.y = 0.4 + ((t * 0.6 + r.base) % 3); }
  });
  smoke.forEach((p) => {
    const k = (t * 0.35 + p.userData.off) % 1;
    p.position.set(-0.9 + k * 0.4, 1.6 + k * 2.4, -0.4);
    p.scale.setScalar(0.6 + k * 1.4);
    p.material.opacity = 1 - k;
  });
  clouds.forEach((c) => { c.position.x += c.userData.drift * dt; if (c.position.x > 90) c.position.x = -90; });
  if (gfx === 'high') {
    const pos = oceanBase.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i); const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.15 + t * 1.2) * 0.18 + Math.cos(z * 0.18 + t) * 0.15);
    }
    pos.needsUpdate = true;
  }
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
  const h = Math.round(w * 9 / 16);
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x !== w || size.y !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function frame() {
  if (!running) return;
  const dt = Math.min(0.05, clock.getDelta());
  statusTimer -= dt;
  if (statusTimer <= 0) { statusTimer = 0.5; updatePortals(); }
  update(dt);
  resize();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- Mode & siklus hidup ----------
function placeSelf(px, py) {
  self.x = toX(px); self.z = toZ(py);
  self.h = 0; self.vy = 0;
  if (self.obj) self.obj.position.set(self.x, 0, self.z);
  // Kamera di belakang penjelajah, menghadap tujuan berikutnya.
  const goal = W.stations.find((s) => game.posStatus(s.id) === 'ready');
  const gx = goal ? toX(goal.x) : 0; const gz = goal ? toZ(goal.y) : 0;
  if (Math.hypot(gx - self.x, gz - self.z) > 1) cam.yaw = Math.atan2(self.x - gx, self.z - gz);
  self.face = cam.yaw + Math.PI;
  if (camera) camera.position.set(self.x + Math.sin(cam.yaw) * cam.dist, 5, self.z + Math.cos(cam.yaw) * cam.dist);
}

function start() {
  if (gfx === '2d' || running) return;
  if (!initRenderer()) { gfx = '2d'; applyMode('high'); return; }
  if (!built) {
    buildWorld();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(POS_KEY)); } catch { /* abaikan */ }
    const me = net && net.me;
    placeSelf(me ? me.x : saved ? saved.x : W.spawn.x, me ? me.y : saved ? saved.y : W.spawn.y);
    document.getElementById('w3-loading').hidden = true;
  }
  applyQuality();
  loadShards();
  selfLabelText = '';
  statusTimer = 0;
  nearby = undefined;
  running = true;
  clock.getDelta();
  requestAnimationFrame(frame);
}

function stop() { running = false; keys.clear(); stick.x = stick.y = 0; nearby = null; }

function applyMode(prev) {
  const is3d = gfx !== '2d';
  window.NUTRA_WORLD_MODE = is3d ? '3d' : '2d';
  wrap.hidden = !is3d;
  canvas2d.hidden = is3d;
  document.querySelector('.world-screen').classList.toggle('is-3d', is3d);
  renderGfxBar();
  const visible = game.visibleScreen === 'world';
  if (is3d) {
    window.NutraWorld2D && window.NutraWorld2D.stop();
    if (visible) { stop(); start(); }
  } else {
    stop();
    if (visible && window.NutraWorld2D) window.NutraWorld2D.start();
  }
  if (prev && prev !== gfx) game.showToast(gfx === '2d' ? 'Mode 2D aktif.' : gfx === 'high' ? 'Grafis 3D tinggi aktif.' : 'Grafis 3D ringan aktif (hemat baterai).');
}

document.addEventListener('nutra:screen', (e) => {
  if (e.detail === 'world' && gfx !== '2d') { window.NutraWorld2D && window.NutraWorld2D.stop(); start(); } else stop();
});

if (net) {
  net.on('welcome', ({ you }) => {
    if (!built) return;
    placeSelf(you.x, you.y);
    if (self.obj) self.obj.userData.setColor(you.color);
    loadShards();
  });
  net.on('teleport', ({ x, y }) => { if (built && gfx !== '2d') { placeSelf(x, y); game.showToast('Guru memindahkan posisimu.'); } });
  net.on('chat', (entry) => {
    if (!built || gfx === '2d') return;
    const target = net.me && entry.playerId === net.me.id ? self.obj : others.get(entry.playerId) && others.get(entry.playerId).obj;
    if (target) say(target, entry.text, 2.6);
  });
  net.on('settings', () => { statusTimer = 0; nearby = undefined; });
}

applyMode();
