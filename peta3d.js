/*
 * Peta Kepulauan Melayang 3D untuk halaman depan (bagian #peta).
 * Dibuat prosedural dari world-data.js agar tata letaknya sama dengan dunia permainan:
 * enam wilayah pos (kisi 3 × 2), Alun-alun Nusantara, dan enam pulau jelajah.
 * Setiap pulau: puncak berbukit (rumput, pantai pasir, puncak batu), danau, hutan,
 * tebing batu bergaris yang meruncing ke bawah, air terjun, lalu lautan awan dan laut jauh di bawah.
 * Jembatan cahaya menghubungkan pulau; portal emas menandai setiap pos (pin DOM "POS n").
 * Bisa diputar dengan diseret. Hanya dirender saat terlihat; menghormati prefers-reduced-motion.
 */
import * as THREE from './vendor/three/three.module.min.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Derau (value noise + fbm) ----------
function hash(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x); const yi = Math.floor(y); const xf = x - xi; const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf); const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s); const b = hash(xi + 1, yi, s); const c = hash(xi, yi + 1, s); const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 4) {
  let t = 0; let amp = 0.5; let f = 1; let n = 0;
  for (let i = 0; i < oct; i += 1) { t += amp * vnoise(x * f, y * f, s + i * 17); n += amp; amp *= 0.5; f *= 2; }
  return t / n;
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- Tekstur kanvas ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const skyTex = () => canvasTex(4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#3f9fd6'); gr.addColorStop(0.45, '#8fd0ec'); gr.addColorStop(0.75, '#d9f1f8'); gr.addColorStop(1, '#f4fbfc');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const cloudTex = () => canvasTex(256, 256, (g) => {
  const r = rng(7);
  for (let i = 0; i < 16; i += 1) {
    const rad = 24 + r() * 40; const x = rad + 4 + r() * (248 - 2 * rad); const y = 70 + r() * 116; const rr = Math.min(rad, y - 2, 254 - y);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
  }
});
const fallTex = () => {
  const t = canvasTex(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 46; i += 1) {
      const x = r() * w; const len = 30 + r() * 90; const y = r() * h;
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(${230 + r() * 25},${245 + r() * 10},255,${0.5 + r() * 0.4})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x, y, 2 + r() * 4, len);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const beamTex = () => {
  const t = canvasTex(64, 8, (g, w, h) => {
    for (let x = 0; x < w; x += 1) { const a = 0.35 + 0.65 * (Math.sin((x / w) * Math.PI * 2 * 3) > 0.2 ? 1 : 0.15); g.fillStyle = `rgba(160,255,250,${a})`; g.fillRect(x, 0, 1, h); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const glowTex = (color) => canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, color); gr.addColorStop(0.35, color.replace(/[\d.]+\)$/, '0.35)')); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

// ---------- Palet ----------
const C = {
  grassA: new THREE.Color('#5fae4a'), grassB: new THREE.Color('#8cc45a'), grassC: new THREE.Color('#3f8f3f'),
  sand: new THREE.Color('#e9d39a'), wetSand: new THREE.Color('#cfb47a'), rock: new THREE.Color('#9a8f84'), rockDark: new THREE.Color('#6d625a'),
  cliffA: new THREE.Color('#b59a78'), cliffB: new THREE.Color('#8b7560'), cliffC: new THREE.Color('#5d4e44'), moss: new THREE.Color('#5f8f45'),
  field: new THREE.Color('#c9b46a')
};

/** Membangun satu pulau melayang. Mengembalikan grup + fungsi tinggi permukaan h(x,z) lokal. */
function buildIsland({ rx, rz, seed, big, depth }) {
  const group = new THREE.Group();
  const R = (th) => 1 + 0.32 * (fbm(Math.cos(th) * 1.6 + seed, Math.sin(th) * 1.6 - seed, seed, 3) - 0.5);
  const peaks = [];
  const r0 = rng(seed * 31 + 5);
  const nPeaks = big ? 3 : 1;
  for (let i = 0; i < nPeaks; i += 1) {
    const a = r0() * Math.PI * 2; const d = 0.2 + r0() * 0.45;
    peaks.push({ x: Math.cos(a) * d * rx, z: Math.sin(a) * d * rz, h: big ? (i === 0 ? 0.75 : 0.35) + r0() * 0.4 : 0.22 + r0() * 0.18, s: (big ? 1.0 : 0.35) + r0() * 0.6 });
  }
  const lake = big ? { x: (r0() - 0.5) * rx * 0.7, z: (r0() - 0.5) * rz * 0.6, r: 0.45 + r0() * 0.4 } : null;
  const scaleH = big ? 1 : 0.6;
  function height(x, z, t) {
    let y = 0.22 * scaleH * (1 - Math.pow(t, 5));
    y += (fbm(x * 0.45 + seed, z * 0.45, seed + 3, 5) - 0.45) * 0.55 * scaleH * (1 - Math.pow(t, 3));
    peaks.forEach((p) => { const d2 = ((x - p.x) ** 2 + (z - p.z) ** 2) / (p.s * p.s); y += p.h * Math.exp(-d2) * (0.75 + 0.5 * fbm(x * 2, z * 2, seed + 9, 3)); });
    if (lake) { const d2 = ((x - lake.x) ** 2 + (z - lake.z) ** 2) / (lake.r * lake.r * 1.8); y -= 0.32 * Math.exp(-d2); }
    y -= smooth(0.86, 1, t) * 0.16;
    return y;
  }

  // ---- Puncak (permukaan) ----
  const NR = big ? 26 : 12; const NS = big ? 120 : 56;
  const pos = []; const col = []; const idx = [];
  const ringPts = [];
  pos.push(0, height(0, 0, 0), 0); col.push(...C.grassA.toArray());
  for (let i = 1; i <= NR; i += 1) {
    const t = i / NR;
    for (let j = 0; j < NS; j += 1) {
      const th = (j / NS) * Math.PI * 2;
      const rr = R(th);
      const x = Math.cos(th) * rx * rr * t; const z = Math.sin(th) * rz * rr * t;
      const y = height(x, z, t);
      pos.push(x, y, z);
      const n = fbm(x * 0.9 + 40, z * 0.9, seed + 21, 3);
      let c = C.grassA.clone().lerp(C.grassB, smooth(0.35, 0.7, n)).lerp(C.grassC, smooth(0.55, 0.85, fbm(x * 0.4, z * 0.4 + 9, seed + 5, 3)) * 0.6);
      if (big && fbm(x * 0.25 + 3, z * 0.25, seed + 77, 2) > 0.62) c.lerp(C.field, 0.55); // sawah/ladang
      if (y > 0.55 * scaleH) c.lerp(C.rock, smooth(0.55, 0.95, y / scaleH));
      if (y > 1.05) c.lerp(C.rockDark, 0.4);
      if (t > 0.9 || y < 0.03) c = c.lerp(C.sand, smooth(0.9, 0.97, t) * 0.9 + (y < 0.03 ? 0.4 : 0));
      if (t > 0.985) c.lerp(C.wetSand, 0.5);
      col.push(c.r, c.g, c.b);
      if (i === NR) ringPts.push({ x, y, z, th });
    }
  }
  for (let j = 0; j < NS; j += 1) idx.push(0, 1 + ((j + 1) % NS), 1 + j);
  for (let i = 1; i < NR; i += 1) {
    const a0 = 1 + (i - 1) * NS; const b0 = 1 + i * NS;
    for (let j = 0; j < NS; j += 1) {
      const j1 = (j + 1) % NS;
      idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }
  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  topGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  topGeo.setIndex(idx);
  topGeo.computeVertexNormals();
  const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
  top.receiveShadow = true; top.castShadow = true;
  group.add(top);

  // ---- Tebing & sisi bawah: lapisan cincin bergerigi yang meruncing ----
  const L = big ? 16 : 9; const D = depth;
  const cp = []; const cc = []; const ci = [];
  for (let k = 0; k <= L; k += 1) {
    const s = k / L;
    const shrink = k <= 1 ? 1 - 0.02 * k : (1 - Math.pow((s - 0.06) / 0.94, 1.35)) * 0.97 + 0.03;
    for (let j = 0; j < NS; j += 1) {
      const p = ringPts[j];
      const jag = k === 0 ? 0 : (fbm(p.th * 3 + seed, k * 0.8, seed + 13, 3) - 0.5) * 0.5 + (hash(j, k, seed) - 0.5) * 0.12;
      const f = Math.max(0.02, shrink + jag * (1 - s) * 0.6);
      const y = k === 0 ? p.y : p.y - 0.18 - s * D * (0.85 + 0.3 * fbm(p.th * 2, 7, seed + 2, 2));
      cp.push(p.x * f, y, p.z * f);
      const band = fbm(y * 3.2 + p.th * 0.6, p.th, seed + 31, 2);
      let c = C.cliffA.clone().lerp(C.cliffB, smooth(0.3, 0.7, band)).lerp(C.cliffC, smooth(0.25, 1, s));
      if (k <= 1) c = c.lerp(C.moss, 0.55 * (1 - k * 0.6));
      cc.push(c.r, c.g, c.b);
    }
  }
  const tipIndex = cp.length / 3;
  cp.push((hash(1, 2, seed) - 0.5) * rx * 0.2, ringPts[0].y - D * 1.15, (hash(3, 4, seed) - 0.5) * rz * 0.2);
  cc.push(...C.cliffC.toArray());
  for (let k = 0; k < L; k += 1) {
    for (let j = 0; j < NS; j += 1) {
      const j1 = (j + 1) % NS; const a = k * NS; const b = (k + 1) * NS;
      ci.push(a + j, b + j, a + j1, a + j1, b + j, b + j1);
    }
  }
  for (let j = 0; j < NS; j += 1) ci.push(L * NS + j, tipIndex, L * NS + ((j + 1) % NS));
  const cliffGeo = new THREE.BufferGeometry();
  cliffGeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  cliffGeo.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
  cliffGeo.setIndex(ci);
  cliffGeo.computeVertexNormals();
  const cliff = new THREE.Mesh(cliffGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  cliff.castShadow = true; cliff.receiveShadow = true;
  group.add(cliff);

  const surface = (x, z) => {
    const th = Math.atan2(z / rz, x / rx);
    const t = Math.hypot(x / rx, z / rz) / R(th);
    return t >= 1 ? null : { y: height(x, z, t), t };
  };
  return { group, surface, ringPts, lake, peaks, height };
}

export function createFloatingMap(host, W, MISSIONS, { reduceMotion = false } = {}) {
  const SCALE = 1 / 1000;
  const X = (x) => (x - W.width / 2) * SCALE;
  const Z = (y) => (y - W.height / 2) * SCALE;

  const canvas = document.createElement('canvas');
  canvas.className = 'map3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const pinLayer = document.createElement('div');
  pinLayer.className = 'map3d-pins';
  pinLayer.setAttribute('aria-hidden', 'true');
  const hint = document.createElement('p');
  hint.className = 'map3d-hint';
  hint.textContent = 'Seret untuk memutar peta';
  host.classList.add('map3d');
  host.append(canvas, pinLayer, hint);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = skyTex();
  scene.fog = new THREE.Fog('#d6eef6', 34, 95);
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 400);

  // Cahaya: matahari sore dari barat laut, langit biru, pantulan hangat dari bawah.
  scene.add(new THREE.HemisphereLight('#dff4ff', '#7a8f6a', 1.25));
  const sun = new THREE.DirectionalLight('#fff0d2', 2.6);
  sun.position.set(-14, 22, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 70 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#bfe6ff', 0.5);
  fill.position.set(12, 6, 14);
  scene.add(fill);

  const world = new THREE.Group();
  scene.add(world);
  const animated = [];

  // ---------- Pulau ----------
  const islands = W.islands.map((isl) => {
    const big = isl.rx > 1000;
    const minR = 0.55;
    const rx = big ? isl.rx * SCALE * 0.6 : Math.max(isl.rx * SCALE * 3, minR);
    const rz = big ? isl.ry * SCALE * 0.6 : Math.max(isl.ry * SCALE * 3, minR * 0.75);
    const depth = big ? 3.6 + hash(isl.id, 1, 9) * 1.4 : 1.4 + hash(isl.id, 2, 9) * 0.7;
    const isle = buildIsland({ rx, rz, seed: 101 + isl.id * 37, big, depth });
    const g = isle.group;
    const bob = (hash(isl.id, 3, 7) - 0.5) * 0.5;
    g.position.set(X(isl.cx), bob, Z(isl.cy));
    world.add(g);
    return { isl, big, rx, rz, depth, ...isle, g, bob };
  });

  // ---------- Hutan, batu, danau, air terjun ----------
  const treeTrunkGeo = new THREE.CylinderGeometry(0.018, 0.028, 0.22, 5);
  const treeCrownGeo = new THREE.IcosahedronGeometry(0.11, 0);
  const pineGeo = new THREE.ConeGeometry(0.085, 0.3, 6);
  const palmLeafGeo = new THREE.ConeGeometry(0.13, 0.05, 7);
  const rockGeo = new THREE.DodecahedronGeometry(0.06, 0);
  const trees = []; const pines = []; const palms = []; const rocks = [];
  const dummy = new THREE.Object3D();
  islands.forEach((it) => {
    const r = rng(it.isl.id * 977 + 3);
    const n = it.big ? 760 : 30;
    for (let i = 0; i < n; i += 1) {
      const a = r() * Math.PI * 2; const d = Math.sqrt(r()) * 0.93;
      const x = Math.cos(a) * it.rx * d; const z = Math.sin(a) * it.rz * d;
      const s = it.surface(x, z);
      if (!s || s.y < 0.02) continue;
      if (it.lake && ((x - it.lake.x) ** 2 + (z - it.lake.z) ** 2) < (it.lake.r * 1.15) ** 2) continue;
      const dens = fbm(x * 0.7 + 11, z * 0.7, it.isl.id + 50, 3);
      if (dens < 0.42 && s.t < 0.88) continue;
      if (s.t >= 0.84 && r() > 0.22) continue; // tepi pantai: hanya sesekali kelapa
      const wx = it.g.position.x + x; const wy = it.g.position.y + s.y; const wz = it.g.position.z + z;
      const kind = s.t > 0.86 ? 'palm' : s.y > 0.55 ? 'pine' : r() < 0.2 ? 'pine' : 'tree';
      const sc = 0.75 + r() * 0.6;
      (kind === 'palm' ? palms : kind === 'pine' ? pines : trees).push({ x: wx, y: wy, z: wz, s: sc, rot: r() * 6.28, hue: r(), palm: kind === 'palm' });
      if (r() < 0.08) rocks.push({ x: wx + 0.08, y: wy, z: wz - 0.05, s: 0.6 + r() * 1.4, rot: r() * 6.28 });
    }
  });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 1 });
  function instanced(geo, mat, list, place, color) {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    const c = new THREE.Color();
    list.forEach((p, i) => { place(p); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); if (color) mesh.setColorAt(i, color(p, c)); });
    mesh.castShadow = true; mesh.receiveShadow = true;
    world.add(mesh);
    return mesh;
  }
  const treeGreen = (p, c) => c.setHSL(0.27 + p.hue * 0.08, 0.5 + p.hue * 0.15, 0.27 + p.hue * 0.12);
  instanced(treeTrunkGeo, trunkMat, [...trees, ...palms], (p) => { dummy.position.set(p.x, p.y + 0.1 * p.s, p.z); dummy.rotation.set(0, p.rot, p.palm ? 0.12 : 0); dummy.scale.set(p.s, p.s * (p.palm ? 1.7 : 1), p.s); });
  instanced(treeCrownGeo, leafMat, trees, (p) => { dummy.position.set(p.x, p.y + 0.26 * p.s, p.z); dummy.rotation.set(p.rot, p.rot * 2, 0); dummy.scale.set(p.s * 1.15, p.s * 0.9, p.s * 1.15); }, treeGreen);
  instanced(pineGeo, leafMat, pines, (p) => { dummy.position.set(p.x, p.y + 0.18 * p.s, p.z); dummy.rotation.set(0, p.rot, 0); dummy.scale.setScalar(p.s); }, (p, c) => c.setHSL(0.36 + p.hue * 0.05, 0.45, 0.2 + p.hue * 0.08));
  instanced(palmLeafGeo, leafMat, palms, (p) => { dummy.position.set(p.x + 0.03, p.y + 0.38 * p.s, p.z); dummy.rotation.set(0, p.rot, 0); dummy.scale.set(p.s, p.s, p.s); }, (p, c) => c.setHSL(0.25 + p.hue * 0.05, 0.6, 0.35));
  instanced(rockGeo, new THREE.MeshStandardMaterial({ color: '#a39788', roughness: 1, flatShading: true }), rocks, (p) => { dummy.position.set(p.x, p.y + 0.02, p.z); dummy.rotation.set(p.rot, p.rot, 0); dummy.scale.set(p.s, p.s * 0.7, p.s); });

  const waterMat = new THREE.MeshStandardMaterial({ color: '#2ea3c7', roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.92 });
  const falls = fallTex();
  const fallMat = new THREE.MeshBasicMaterial({ map: falls, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: '#eafaff' });
  const mistTex = glowTex('rgba(255,255,255,0.8)');
  islands.forEach((it) => {
    if (it.lake) {
      // Permukaan danau di sedikit atas titik terdalam cekungan.
      let low = Infinity;
      for (let k = 0; k < 24; k += 1) { const a = (k / 24) * 6.28; const s = it.surface(it.lake.x + Math.cos(a) * it.lake.r * 0.4, it.lake.z + Math.sin(a) * it.lake.r * 0.4); if (s) low = Math.min(low, s.y); }
      const lake = new THREE.Mesh(new THREE.CircleGeometry(it.lake.r * 1.05, 40), waterMat);
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(it.lake.x, Math.min(low + 0.06, it.height(it.lake.x, it.lake.z, 0.2) + 0.1), it.lake.z);
      lake.receiveShadow = true;
      it.g.add(lake);
    }
    // Air terjun di tepi pulau.
    const r = rng(it.isl.id * 53 + 1);
    const count = it.big ? 3 : (r() < 0.5 ? 1 : 0);
    for (let k = 0; k < count; k += 1) {
      const p = it.ringPts[Math.floor(r() * it.ringPts.length)];
      const len = it.depth * (0.75 + r() * 0.35);
      const w = it.big ? 0.22 + r() * 0.16 : 0.12;
      const tex = falls.clone(); tex.needsUpdate = true; tex.repeat.set(1, len / 1.2);
      const mat = fallMat.clone(); mat.map = tex;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, len, 1, 8), mat);
      const out = new THREE.Vector3(p.x, 0, p.z).normalize();
      plane.position.set(p.x * 1.015 + out.x * 0.05, p.y - len / 2 + 0.02, p.z * 1.015 + out.z * 0.05);
      plane.lookAt(plane.position.x + out.x, plane.position.y, plane.position.z + out.z);
      it.g.add(plane);
      animated.push((dt) => { tex.offset.y += dt * 0.9; });
      const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.75 }));
      mist.position.set(plane.position.x + out.x * 0.1, p.y - len + 0.1, plane.position.z + out.z * 0.1);
      mist.scale.set(w * 5, w * 3, 1);
      it.g.add(mist);
    }
  });

  // ---------- Jembatan cahaya ----------
  const beam = beamTex();
  const islandById = new Map(islands.map((x) => [x.isl.id, x]));
  const surfaceAt = (id, wx, wz) => {
    const it = islandById.get(id);
    if (!it) return 0.2;
    const s = it.surface(wx - it.g.position.x, wz - it.g.position.z);
    return it.g.position.y + (s ? s.y : 0.05);
  };
  W.bridges.forEach((br, i) => {
    const ia = islandById.get(br.from); const ib = islandById.get(br.to);
    if (!ia || !ib) return;
    // Ujung jembatan ditarik sedikit ke dalam tepi pulau (pulau peta diperkecil agar celahnya terlihat).
    const end = (it, other) => {
      const dx = other.g.position.x - it.g.position.x; const dz = other.g.position.z - it.g.position.z;
      const th = Math.atan2(dz / it.rz, dx / it.rx);
      let x = Math.cos(th) * it.rx * 0.82; let z = Math.sin(th) * it.rz * 0.82;
      for (let k = 0; k < 8 && !it.surface(x, z); k += 1) { x *= 0.9; z *= 0.9; }
      return new THREE.Vector3(it.g.position.x + x, 0, it.g.position.z + z);
    };
    const a = end(ia, ib); const b = end(ib, ia);
    a.y = surfaceAt(br.from, a.x, a.z) + 0.06; b.y = surfaceAt(br.to, b.x, b.z) + 0.06;
    const mid = a.clone().lerp(b, 0.5); mid.y += a.distanceTo(b) * 0.08 + 0.15;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const tex = beam.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(2, a.distanceTo(b) * 3), 1);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.035, 6), new THREE.MeshBasicMaterial({ map: tex, color: '#7ff6ee', transparent: true, opacity: 0.95 }));
    world.add(tube);
    const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.09, 8), new THREE.MeshBasicMaterial({ color: '#7ff6ee', transparent: true, opacity: 0.16, depthWrite: false }));
    world.add(halo);
    animated.push((dt) => { tex.offset.x -= dt * 0.6 * (i % 2 ? 1 : -1); });
  });

  // ---------- Portal pos & penanda ----------
  const pins = [];
  const goldGlow = glowTex('rgba(255,210,110,0.95)');
  W.islands.forEach((isl) => {
    const it = islandById.get(isl.id);
    const m = MISSIONS.find((mm) => mm.id === isl.id);
    const st = (W.stations || []).find((s) => s.id === isl.id);
    let wx = it.g.position.x; let wz = it.g.position.z;
    if (st && it.big) { wx = X(st.x); wz = Z(st.y); if (!it.surface(wx - it.g.position.x, wz - it.g.position.z)) { wx = it.g.position.x; wz = it.g.position.z; } }
    const wy = surfaceAt(isl.id, wx, wz);
    if (it.big || isl.id === 0) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 10, 32), new THREE.MeshStandardMaterial({ color: '#f5b72b', emissive: '#ffb02e', emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.35 }));
      ring.position.set(wx, wy + 0.24, wz);
      world.add(ring);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: goldGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.position.copy(ring.position); glow.scale.set(0.9, 0.9, 1);
      world.add(glow);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.16, 1.3, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      pillar.position.set(wx, wy + 0.75, wz);
      world.add(pillar);
      animated.push((dt, t) => { ring.rotation.y = t * 0.8; glow.material.opacity = 0.7 + Math.sin(t * 2 + isl.id) * 0.25; });
    }
    const el = document.createElement('div');
    el.className = `map3d-pin ${isl.id && it.big ? 'pos' : isl.id ? 'wild' : 'plaza'}`;
    el.innerHTML = it.big ? `<b>POS</b><strong>${isl.id}</strong><span>${esc(m ? `${m.title} ${m.titleEm}` : isl.name)}</span>` : `<span>${esc(isl.name)}</span>`;
    pinLayer.append(el);
    pins.push({ el, p: new THREE.Vector3(wx, wy + (it.big ? 0.55 : 0.3), wz) });
  });

  // ---------- Lautan awan, laut jauh di bawah, pulau kecil di kejauhan ----------
  const cloud = cloudTex();
  const clouds = [];
  const rc = rng(2024);
  for (let i = 0; i < 170; i += 1) {
    const sea = i < 130;
    const mat = new THREE.SpriteMaterial({ map: cloud, transparent: true, depthWrite: false, opacity: sea ? 0.85 + rc() * 0.15 : 0.55 + rc() * 0.3, color: new THREE.Color().setHSL(0.56, 0.35, sea ? 0.9 + rc() * 0.1 : 0.97) });
    const s = new THREE.Sprite(mat);
    const x = (rc() - 0.5) * 70; const z = (rc() - 0.5) * 46;
    const y = sea ? -5.2 - rc() * 2.6 : 1.2 + rc() * 2.4;
    const size = sea ? 5 + rc() * 7 : 2 + rc() * 3;
    s.position.set(x, y, z); s.scale.set(size, size * 0.55, 1);
    world.add(s);
    clouds.push({ s, speed: (sea ? 0.08 : 0.18) * (0.5 + rc()) });
  }
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#2f93bf', roughness: 0.25, metalness: 0.1 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -16;
  scene.add(ocean);
  const rd = rng(77);
  for (let i = 0; i < 14; i += 1) {
    const a = rd() * Math.PI * 2; const d = 20 + rd() * 12;
    const size = 0.35 + rd() * 0.8;
    const isle = buildIsland({ rx: size, rz: size * (0.7 + rd() * 0.4), seed: 900 + i * 13, big: false, depth: size * 2.6 });
    isle.group.position.set(Math.cos(a) * d * 1.1, -1 + rd() * 3, Math.sin(a) * d * 0.62);
    world.add(isle.group);
    animated.push((dt, t) => { isle.group.position.y += Math.sin(t * 0.5 + i) * dt * 0.05; });
  }

  // ---------- Kamera: orbit pelan + seret untuk memutar ----------
  const target = new THREE.Vector3(0, 0.3, 0.2);
  let yaw = 0; let pitch = 0.92; let dragYaw = 0; let dragPitch = 0; let drag = null;
  const radius = 30;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: dragYaw, pitch: dragPitch }; canvas.setPointerCapture(e.pointerId); host.classList.add('dragging'); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dragYaw = Math.max(-1.1, Math.min(1.1, drag.yaw + (e.clientX - drag.x) * 0.005));
    dragPitch = Math.max(-0.3, Math.min(0.35, drag.pitch + (e.clientY - drag.y) * 0.003));
  });
  const endDrag = () => { drag = null; host.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function placeCamera(t) {
    yaw = (reduceMotion ? 0 : Math.sin(t * 0.045) * 0.22) + dragYaw;
    const ph = pitch + dragPitch;
    camera.position.set(target.x + Math.sin(yaw) * Math.sin(ph) * radius, target.y + Math.cos(ph) * radius, target.z + Math.cos(yaw) * Math.sin(ph) * radius);
    camera.lookAt(target);
  }

  const v = new THREE.Vector3();
  function placePins() {
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    pins.forEach(({ el, p }) => {
      v.copy(p).project(camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      el.style.display = vis ? '' : 'none';
      if (vis) el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    });
  }

  function resize() {
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    if (!w || !h) return;
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 1.3 ? 46 : 34; // layar sempit: pandang lebih lebar
      camera.updateProjectionMatrix();
    }
  }

  let visible = true; let last = performance.now(); let t = 0; let rendered = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduceMotion) t += dt;
    else if (rendered) return; // gerak dikurangi: cukup satu gambar diam
    resize();
    placeCamera(t);
    if (!reduceMotion) {
      animated.forEach((fn) => fn(dt, t));
      clouds.forEach((c) => { c.s.position.x += c.speed * dt; if (c.s.position.x > 36) c.s.position.x = -36; });
    }
    renderer.render(scene, camera);
    placePins();
    rendered = true;
  }
  requestAnimationFrame(frame);
  return { renderer, scene, camera };
}
