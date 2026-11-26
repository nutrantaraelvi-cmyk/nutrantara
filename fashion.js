/*
 * Busana Butik Nusantara (sejak 1.2): model 3D barang toko untuk penjelajah (createExplorer di characters.js).
 * applyOutfit(penjelajah, wear) menukar isi slot kepala/leher/punggung dan motif rompi. wear = { kepala, baju,
 * leher, punggung } berisi id barang dari shop-data.js; id bawaan (caping, rompi, syal-tumpal, rantang) memakai
 * bagian asli penjelajah. Model, tekstur, dan bahan tiap barang dibuat sekali lalu dipakai bersama oleh semua
 * penjelajah (hemat untuk kelas besar). Semua busana terinspirasi pakaian adat Nusantara dan digambar sendiri
 * dari bentuk sederhana.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { toon } from './characters.js';
import { kawungTexture, createKite } from './culture.js';

// ---------- Bantuan ----------
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function canvasTexture(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c;
  return t;
}
const fabric = (tex, opts = {}) => toon('#ffffff', { unique: true, map: tex, side: THREE.DoubleSide, ...opts });
/** Salinan geometri di banyak titik, digabung jadi satu (manik, bunga melati). colors: warna per salinan. */
function repeatGeometry(base, points, colors) {
  const src = base.index ? base : base.toNonIndexed();
  const pos = src.attributes.position.array; const nor = src.attributes.normal.array; const idx = src.index.array;
  const n = pos.length / 3;
  const P = new Float32Array(pos.length * points.length); const N = new Float32Array(nor.length * points.length);
  const C = colors ? new Float32Array(pos.length * points.length) : null;
  const I = new Uint32Array(idx.length * points.length);
  const col = new THREE.Color();
  points.forEach(([x, y, z, s = 1], k) => {
    if (C) col.set(colors[k % colors.length]);
    for (let i = 0; i < n; i += 1) {
      const o = (k * n + i) * 3;
      P[o] = pos[i * 3] * s + x; P[o + 1] = pos[i * 3 + 1] * s + y; P[o + 2] = pos[i * 3 + 2] * s + z;
      N[o] = nor[i * 3]; N[o + 1] = nor[i * 3 + 1]; N[o + 2] = nor[i * 3 + 2];
      if (C) { C[o] = col.r; C[o + 1] = col.g; C[o + 2] = col.b; }
    }
    for (let j = 0; j < idx.length; j += 1) I[k * idx.length + j] = idx[j] + k * n;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  if (C) g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

// ---------- Motif kain (kanvas, dibuat sekali) ----------
const textures = new Map();
const tex = (id) => { if (!textures.has(id)) textures.set(id, PATTERNS[id]()); return textures.get(id); };
const PATTERNS = {
  // Lurik: garis-garis tenun halus
  lurik: () => canvasTexture(64, 64, (g) => {
    g.fillStyle = '#2f3448'; g.fillRect(0, 0, 64, 64);
    [[4, 2, '#d9c49a'], [9, 1, '#d9c49a'], [16, 9, '#7a5235'], [18, 1, '#e8d6ae'], [30, 2, '#c94f3a'], [40, 1, '#d9c49a'], [46, 6, '#4b5a7a'], [56, 2, '#d9c49a']].forEach(([x, w, c]) => { g.fillStyle = c; g.fillRect(x, 0, w, 64); });
  }, [6, 1]),
  // Kawung: empat bulatan (memakai pola yang sama dengan alun-alun)
  kawung: () => { const t = kawungTexture('#efdcb5', '#6e3f1f', 1); t.repeat.set(4, 1.4); return t; },
  // Parang: pita miring bergelombang
  parang: () => canvasTexture(64, 64, (g) => {
    g.fillStyle = '#f1e0bd'; g.fillRect(0, 0, 64, 64);
    // Garis miring y = x − k berjarak 16 px dan gelombang berperiode 64/3 px, jadi motifnya menyambung saat diulang.
    for (let k = -64; k < 128; k += 16) {
      for (let t = -8; t < 72; t += 1.5) {
        const r = 3.6 + Math.sin((t * Math.PI * 6) / 64) * 1.8;
        g.fillStyle = '#7a3e1d'; g.beginPath(); g.arc(t, t - k, r, 0, Math.PI * 2); g.fill();
      }
      for (let t = 0; t < 64; t += 8) { g.fillStyle = '#3b2210'; g.beginPath(); g.arc(t + 8, t - k, 1.5, 0, Math.PI * 2); g.fill(); }
    }
  }, [4, 1.2]),
  // Mega mendung: awan biru berlapis
  megamendung: () => canvasTexture(128, 128, (g) => {
    g.fillStyle = '#1f5ea8'; g.fillRect(0, 0, 128, 128);
    const cloud = (cx, cy, s) => {
      ['#2c75bf', '#5c9ad6', '#9cc8ec', '#e1f0fb'].forEach((c, i) => {
        const k = 1 - i * 0.22;
        g.fillStyle = c;
        [[0, 0, 18], [-16, 4, 12], [16, 4, 12], [-8, -9, 11], [9, -9, 11]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(cx + dx * s, cy + dy * s, r * s * k, 0, Math.PI * 2); g.fill(); });
      });
    };
    cloud(32, 34, 1); cloud(96, 34, 0.9); cloud(64, 92, 1.05); cloud(0, 92, 0.9); cloud(128, 92, 0.9);
  }, [3, 1]),
  // Tenun ikat Sumba: merah tanah dengan belah ketupat
  'tenun-ikat': () => canvasTexture(64, 64, (g) => {
    g.fillStyle = '#8b2c1e'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#1d1714'; g.fillRect(0, 0, 64, 4); g.fillRect(0, 60, 64, 4);
    const diamond = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill(); };
    [[16, 32], [48, 32]].forEach(([x, y]) => { diamond(x, y, 14, '#e6bf72'); diamond(x, y, 9, '#1d1714'); diamond(x, y, 4, '#e6bf72'); });
    [[0, 32], [32, 32], [64, 32]].forEach(([x, y]) => diamond(x, y, 3, '#f3e2b8'));
  }, [4, 1]),
  // Songket: merah bertabur kisi benang emas
  songket: () => canvasTexture(64, 64, (g) => {
    g.fillStyle = '#951c2c'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#e7c45a'; g.lineWidth = 2;
    for (let k = -64; k <= 64; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.stroke(); g.beginPath(); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke(); }
    g.fillStyle = '#f7dc7c';
    for (let y = 0; y <= 64; y += 16) for (let x = 0; x <= 64; x += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
  }, [5, 1.4]),
  // Batik sogan untuk blangkon
  sogan: () => canvasTexture(64, 64, (g) => {
    g.fillStyle = '#6b3f1f'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#e8d2a2'; g.lineWidth = 2;
    for (let k = -64; k < 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.bezierCurveTo(k + 10, 20, k + 22, 44, k + 32, 64); g.stroke(); }
    g.fillStyle = '#2c1a0d';
    for (let k = 0; k < 64; k += 16) { g.beginPath(); g.arc(k + 8, 32, 2, 0, Math.PI * 2); g.fill(); }
  }, [3, 2]),
  // Udeng Bali: putih dengan motif emas kecil
  udeng: () => canvasTexture(32, 32, (g) => {
    g.fillStyle = '#f4efe6'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#c9a046';
    [[8, 8], [24, 24]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 5, y); g.lineTo(x, y + 5); g.lineTo(x - 5, y); g.closePath(); g.fill(); });
  }, [6, 1]),
  // Selendang jumputan: pita warna pelangi berbintik putih
  jumputan: () => canvasTexture(64, 64, (g) => {
    const row = 64 / 6;
    ['#d63a7b', '#f0782f', '#f5c84a', '#3fb27f', '#2f7fd0', '#8a4fc1'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * row, 64, row + 1); });
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 6; i += 1) for (let x = (i % 2 ? 4 : 12); x < 64; x += 16) { g.beginPath(); g.arc(x, i * row + row / 2, 2.2, 0, Math.PI * 2); g.fill(); }
  }, [3, 1]),
  // Ulos: merah tua dengan garis hitam & putih
  ulos: () => canvasTexture(64, 64, (g) => {
    g.fillStyle = '#7a1420'; g.fillRect(0, 0, 64, 64);
    [[0, 4, '#1a1214'], [8, 2, '#efe6d8'], [14, 6, '#1a1214'], [26, 2, '#efe6d8'], [30, 2, '#efe6d8'], [40, 6, '#1a1214'], [52, 2, '#efe6d8'], [58, 4, '#1a1214']].forEach(([x, w, c]) => { g.fillStyle = c; g.fillRect(x, 0, w, 64); });
    g.fillStyle = '#efe6d8';
    for (let y = 4; y < 64; y += 8) { g.fillRect(20, y, 2, 3); g.fillRect(46, y + 4, 2, 3); }
  }, [3, 1]),
  // Anyaman rotan untuk bakul
  rotan: () => canvasTexture(32, 32, (g) => {
    g.fillStyle = '#c99a5b'; g.fillRect(0, 0, 32, 32);
    g.fillStyle = '#8d6334';
    for (let y = 0; y < 32; y += 8) for (let x = 0; x < 32; x += 8) { if ((x + y) % 16 === 0) g.fillRect(x, y, 8, 3); else g.fillRect(x, y, 3, 8); }
  }, [6, 3]),
  // Rajutan noken
  noken: () => canvasTexture(32, 32, (g) => {
    g.fillStyle = '#b5652a'; g.fillRect(0, 0, 32, 32);
    g.strokeStyle = '#6e3a17'; g.lineWidth = 2;
    for (let k = -32; k <= 32; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 32, 32); g.stroke(); g.beginPath(); g.moveTo(k + 32, 0); g.lineTo(k, 32); g.stroke(); }
    g.fillStyle = '#7c4fa0'; g.fillRect(0, 13, 32, 3);
    g.fillStyle = '#f2c94c'; g.fillRect(0, 17, 32, 2);
  }, [4, 3]),
  // Payung geulis: bunga warna-warni di atas biru kehijauan
  payung: () => canvasTexture(128, 64, (g) => {
    g.fillStyle = '#1f9aa8'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#f5c84a'; g.fillRect(0, 56, 128, 8);
    const flower = (x, y, c) => { g.fillStyle = c; for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); };
    [[16, 20, '#e2553f'], [48, 36, '#f472b6'], [80, 18, '#ffffff'], [112, 38, '#e2553f'], [32, 44, '#f5c84a'], [96, 44, '#f472b6']].forEach(([x, y, c]) => flower(x, y, c));
  }, [3, 1])
};

// ---------- Rompi bermotif ----------
const VESTS = { lurik: 'lurik', kawung: 'kawung', parang: 'parang', megamendung: 'megamendung', 'tenun-ikat': 'tenun-ikat', songket: 'songket' };
const vestMats = new Map();
function vestMaterial(id) {
  if (!vestMats.has(id)) vestMats.set(id, fabric(tex(VESTS[id])));
  return vestMats.get(id);
}

// ---------- Kepala (koordinat kepala: bola berjari-jari 0,4 m) ----------
const gold = () => toon('#e8b931', { emissive: '#a8740f', emissiveIntensity: 0.35 });
const BUILDERS = {
  peci() {
    const g = new THREE.Group();
    const cap = mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.27, 24), toon('#1c1b22'), 0, 0.3, 0);
    cap.scale.z = 0.92;
    g.add(cap, mesh(new THREE.TorusGeometry(0.355, 0.012, 4, 28), toon('#3a3742'), 0, 0.19, 0));
    g.children[1].rotation.x = Math.PI / 2;
    g.rotation.x = -0.1;
    return g;
  },
  blangkon() {
    const g = new THREE.Group();
    const batik = fabric(tex('sogan'));
    g.add(mesh(new THREE.SphereGeometry(0.43, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), batik, 0, 0.02, 0));
    const band = mesh(new THREE.TorusGeometry(0.405, 0.035, 6, 26), toon('#4a2a12'), 0, 0.15, 0);
    band.rotation.x = Math.PI / 2;
    const bun = mesh(new THREE.SphereGeometry(0.15, 12, 10), batik, 0, 0.05, -0.4);
    bun.scale.set(1.25, 0.85, 0.8);
    g.add(band, bun);
    return g;
  },
  udeng() {
    const g = new THREE.Group();
    const cloth = fabric(tex('udeng'));
    g.add(mesh(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.36), cloth, 0, 0.04, 0));
    const band = mesh(new THREE.TorusGeometry(0.405, 0.06, 8, 26), cloth, 0, 0.17, 0);
    band.rotation.x = Math.PI / 2 - 0.15;
    const knot = mesh(new THREE.ConeGeometry(0.1, 0.34, 4), cloth, 0, 0.5, 0.2);
    knot.rotation.x = 0.35; knot.scale.z = 0.45;
    g.add(band, knot, mesh(new THREE.SphereGeometry(0.06, 8, 6), cloth, 0, 0.35, 0.33));
    return g;
  },
  kamboja() {
    const g = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(0.37, 0.024, 6, 28), toon('#3f8f4c'), 0, 0.25, 0);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const petal = toon('#fff8ef', { side: THREE.DoubleSide });
    const petalGeo = new THREE.CircleGeometry(0.05, 8).scale(0.6, 1, 1).translate(0, 0.045, 0);
    const center = toon('#f5c84a');
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const f = new THREE.Group();
      for (let p = 0; p < 5; p += 1) { const m = mesh(petalGeo, petal); m.rotation.z = (p / 5) * Math.PI * 2; f.add(m); }
      f.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), center, 0, 0, 0.01));
      f.position.set(Math.sin(a) * 0.38, 0.27, Math.cos(a) * 0.38);
      f.lookAt(Math.sin(a) * 2, 1.4, Math.cos(a) * 2);
      g.add(f);
    }
    return g;
  },
  tanjak() {
    const g = new THREE.Group();
    const cloth = fabric(tex('songket'));
    g.add(mesh(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.38), cloth, 0, 0.05, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.41, 0.42, 0.16, 24, 1, true), cloth, 0, 0.2, 0));
    const fold = mesh(new THREE.ConeGeometry(0.2, 0.56, 4), cloth, 0.12, 0.55, 0.05);
    fold.rotation.z = -0.35; fold.scale.z = 0.35;
    g.add(fold, mesh(new THREE.SphereGeometry(0.035, 6, 4), gold(), 0.25, 0.83, 0.05));
    return g;
  },
  siger() {
    const g = new THREE.Group();
    const mat = gold();
    const band = mesh(new THREE.TorusGeometry(0.4, 0.035, 6, 28), mat, 0, 0.2, 0);
    band.rotation.x = Math.PI / 2;
    g.add(band);
    for (let i = 0; i < 9; i += 1) {
      const a = (i - 4) * 0.22;
      const h = 0.42 - Math.abs(i - 4) * 0.06;
      const peak = new THREE.Group();
      const spike = mesh(new THREE.ConeGeometry(0.075, h, 4), mat, 0, h / 2, 0);
      spike.scale.z = 0.35;
      peak.add(spike, mesh(new THREE.SphereGeometry(0.03, 6, 4), mat, 0, h + 0.02, 0));
      peak.position.set(Math.sin(a) * 0.4, 0.2, Math.cos(a) * 0.4);
      peak.rotation.order = 'YXZ';
      peak.rotation.set(0.18, a, 0);
      g.add(peak);
    }
    g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), toon('#c0392b', { emissive: '#7a1d12', emissiveIntensity: 0.3 }), 0, 0.28, 0.42));
    return g;
  },

  // ---------- Leher (koordinat badan: leher di y ≈ 1,0 m) ----------
  selendang() {
    const g = new THREE.Group();
    const cloth = fabric(tex('jumputan'));
    const ring = mesh(new THREE.TorusGeometry(0.24, 0.06, 8, 18), cloth, 0, 1.02, 0);
    ring.rotation.x = Math.PI / 2;
    const sash = mesh(new THREE.BoxGeometry(0.13, 0.62, 0.03), cloth, 0.02, 0.8, 0.31);
    sash.rotation.z = 0.55;
    const back = mesh(new THREE.BoxGeometry(0.12, 0.32, 0.03), cloth, 0.2, 0.86, -0.27);
    back.rotation.z = -0.3;
    g.add(ring, sash, back);
    return g;
  },
  melati() {
    const g = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(0.25, 0.012, 4, 24), toon('#4f9e5a'), 0, 1.0, 0);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const pts = [];
    for (let i = 0; i < 20; i += 1) { const a = (i / 20) * Math.PI * 2; pts.push([Math.sin(a) * 0.25, 1.0, Math.cos(a) * 0.25]); }
    [-0.09, 0.09].forEach((x) => { for (let i = 0; i < 7; i += 1) pts.push([x, 0.95 - i * 0.045, 0.31 + i * 0.004]); });
    g.add(mesh(repeatGeometry(new THREE.SphereGeometry(0.034, 6, 5), pts), toon('#fffdf4')));
    return g;
  },
  manik() {
    const g = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24 * 2 - 1; const a = t * 1.1;
      pts.push([Math.sin(a) * 0.34, 1.03 - 0.2 * (1 - t * t), Math.cos(a) * 0.34]);
    }
    for (let i = 1; i < 12; i += 1) { const a = 1.1 + (i / 12) * (Math.PI * 2 - 2.2); pts.push([Math.sin(a) * 0.25, 1.03, Math.cos(a) * 0.25, 0.8]); }
    g.add(mesh(repeatGeometry(new THREE.SphereGeometry(0.032, 6, 5), pts, ['#e2553f', '#f5c84a', '#1d1d1d', '#f4f0e6', '#2f9e6b']), toon('#ffffff', { unique: true, vertexColors: true })));
    const pendant = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), gold(), 0, 0.76, 0.35);
    pendant.rotation.x = Math.PI / 2;
    const tooth = mesh(new THREE.ConeGeometry(0.03, 0.1, 6), toon('#f4f0e6'), 0, 0.66, 0.35);
    tooth.rotation.x = Math.PI;
    g.add(pendant, tooth);
    return g;
  },
  ulos() {
    const g = new THREE.Group();
    const cloth = fabric(tex('ulos'));
    const shawl = mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 22), cloth, 0, 1.0, 0);
    shawl.rotation.x = Math.PI / 2;
    g.add(shawl);
    [-1, 1].forEach((s) => {
      const tail = mesh(new THREE.BoxGeometry(0.13, 0.46, 0.035), cloth, s * 0.12, 0.79, 0.31);
      tail.rotation.z = s * 0.08;
      g.add(tail, mesh(new THREE.BoxGeometry(0.13, 0.05, 0.04), toon('#f2ead9'), s * 0.14, 0.54, 0.31));
    });
    return g;
  },

  // ---------- Punggung (koordinat badan: ransel di (0; 0,82; −0,36)) ----------
  bakul() {
    const g = new THREE.Group();
    const weave = fabric(tex('rotan'));
    g.add(mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.5, 14, 1, true), weave, 0, 0.86, -0.42));
    const bottom = mesh(new THREE.CircleGeometry(0.18, 14), toon('#8d6334', { side: THREE.DoubleSide }), 0, 0.61, -0.42);
    bottom.rotation.x = Math.PI / 2;
    const rim = mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 18), toon('#8d6334'), 0, 1.11, -0.42);
    rim.rotation.x = Math.PI / 2;
    g.add(bottom, rim);
    [['#e2553f', -0.08], ['#f5c84a', 0.08], ['#4caf6e', 0]].forEach(([c, x], i) => g.add(mesh(new THREE.SphereGeometry(0.075, 8, 6), toon(c), x, 1.1 + (i === 2 ? 0.05 : 0), -0.42 + (i === 2 ? -0.05 : 0.03))));
    [-0.14, 0.14].forEach((x) => g.add(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.03), toon('#6b4a2a'), x, 0.86, -0.3)));
    return g;
  },
  noken() {
    const g = new THREE.Group();
    const bag = mesh(new THREE.SphereGeometry(0.25, 14, 12), fabric(tex('noken')), 0, 0.72, -0.4);
    bag.scale.set(1, 1.3, 0.62);
    g.add(bag);
    [-0.13, 0.13].forEach((x) => { const s = mesh(new THREE.BoxGeometry(0.04, 0.42, 0.03), toon('#6e3a17'), x, 0.98, -0.3); s.rotation.x = -0.25; g.add(s); });
    return g;
  },
  payung() {
    const g = new THREE.Group();
    g.position.set(0, 0.85, -0.34);
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.2, 0.1), toon('#8a5a2a')));
    const pole = new THREE.Group();
    pole.rotation.x = -0.18;
    pole.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.6, 6), toon('#7a4a24'), 0, 0.8, 0));
    const canopy = mesh(new THREE.ConeGeometry(0.72, 0.3, 16, 1, true), fabric(tex('payung')), 0, 1.55, 0);
    pole.add(canopy, mesh(new THREE.SphereGeometry(0.04, 6, 4), gold(), 0, 1.72, 0));
    g.add(pole);
    return g;
  },
  layangan() {
    const g = new THREE.Group();
    [[-1, '#e2553f', '#f5b72b'], [1, '#2f7fd0', '#f5c84a']].forEach(([s, c1, c2]) => { // kontras dengan langit
      const k = createKite(c1, c2);
      k.scale.setScalar(0.4);
      k.position.set(s * 0.42, 1.02, -0.42);
      k.rotation.order = 'YXZ';
      k.rotation.set(0.15, s * 0.45, s * -0.85);
      k.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.add(k);
    });
    return g;
  }
};
const SLOT_OF = { peci: 'kepala', blangkon: 'kepala', udeng: 'kepala', kamboja: 'kepala', tanjak: 'kepala', siger: 'kepala', selendang: 'leher', melati: 'leher', manik: 'leher', ulos: 'leher', bakul: 'punggung', noken: 'punggung', payung: 'punggung', layangan: 'punggung' };
const templates = new Map();
function template(id) {
  if (!templates.has(id)) templates.set(id, BUILDERS[id]());
  return templates.get(id);
}

/**
 * Pakaikan busana ke penjelajah dari createExplorer. Barang yang tidak dikenal atau slotnya salah memakai bawaan.
 * Aman dipanggil setiap kali: tidak berbuat apa-apa bila busananya sama.
 */
export function applyOutfit(explorer, wear = {}) {
  const u = explorer && explorer.userData;
  if (!u || !u.slots) return;
  const key = ['kepala', 'baju', 'leher', 'punggung'].map((s) => wear[s] || '').join('|');
  if (u.outfitKey === key) return;
  u.outfitKey = key;
  Object.entries(u.slots).forEach(([slot, group]) => {
    if (!group.userData.base) group.userData.base = group.children[0];
    if (group.userData.custom) { group.remove(group.userData.custom); group.userData.custom = null; }
    const id = wear[slot];
    const custom = BUILDERS[id] && SLOT_OF[id] === slot;
    group.userData.base.visible = !custom;
    if (custom) {
      const c = template(id).clone(true);
      group.add(c);
      group.userData.custom = c;
    }
  });
  u.vest.material = VESTS[wear.baju] ? vestMaterial(wear.baju) : u.accentMat;
}

/** Bahan kain bermotif (untuk rak kain di kios butik); null bila id bukan rompi bermotif. */
export function clothMaterial(id) { return VESTS[id] ? vestMaterial(id) : null; }

/** Contoh warna/motif untuk kartu toko: { colors: [...] } atau { image: dataURL motif }. */
const SWATCH = {
  caping: ['#e3c27a', '#4caf6e'], peci: ['#1c1b22', '#3a3742'], blangkon: ['#6b3f1f', '#e8d2a2'], udeng: ['#f4efe6', '#c9a046'],
  kamboja: ['#fff8ef', '#f5c84a', '#3f8f4c'], tanjak: ['#951c2c', '#e7c45a'], siger: ['#e8b931', '#c0392b'],
  'syal-tumpal': ['#68dce7', '#ffd17c'], selendang: ['#d63a7b', '#f5c84a', '#2f7fd0'], melati: ['#fffdf4', '#4f9e5a'],
  manik: ['#e2553f', '#f5c84a', '#1d1d1d', '#2f9e6b'], ulos: ['#7a1420', '#1a1214', '#efe6d8'],
  rantang: ['#ff9f91', '#68dce7', '#78f4bd'], bakul: ['#c99a5b', '#8d6334'], noken: ['#b5652a', '#7c4fa0'], payung: ['#1f9aa8', '#f472b6', '#f5c84a'], layangan: ['#e2553f', '#1fc3d3', '#f5b72b'],
  rompi: ['#68dce7', '#f2fff8']
};
export function swatchOf(id) {
  if (VESTS[id]) {
    const t = tex(VESTS[id]);
    const c = t.userData.canvas || (t.image instanceof HTMLCanvasElement ? t.image : null);
    if (c) return { image: c.toDataURL() };
  }
  return { colors: SWATCH[id] || ['#cccccc'] };
}
