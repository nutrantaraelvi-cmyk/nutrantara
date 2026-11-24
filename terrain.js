/*
 * Medan blok NUTRANTARA (sejak 1.1).
 * Tiap wilayah pos (±1000 × 650 m) tersusun dari kolom blok 2 × 2 m dengan undakan setinggi 1 m, membentuk bukit,
 * gunung, lembah sungai, danau, gumuk pasir, dan kaldera sesuai bioma posnya. Gayanya terinspirasi genre game
 * bangun-blok, tetapi palet, bioma, dan strukturnya khas NUTRANTARA (candi, menara pandang berpenjor, mesa batu pasir).
 *
 * Aturan agar misi selalu terjangkau dan tidak ada yang terjebak:
 * - Desa pusat, titik pendaratan, objek misi, ujung jembatan, kampung, bukit terasering, kolam, dan jalan setapak
 *   dikunci rata di ketinggian 0 (diisi region.js lewat addRegion).
 * - Medan alam naik/turun paling banyak 1 blok per kolom (dinaiki otomatis), dan makin jauh dari area terkunci
 *   makin tinggi/dalam, jadi lubang dan cekungan selalu bisa didaki keluar.
 * - Hanya struktur (menara, candi, mesa, batu besar) yang berdinding 2 blok atau lebih, dan selalu punya tangga blok.
 * - Sungai dan danau bisa direnangi di permukaan (diatur di world3d.js).
 *
 * Grid ketinggian tiap wilayah dihitung sekali secara deterministik (sama untuk semua siswa). Mesh dibangun per
 * bongkah 64 × 64 m di sekitar pemain dan dibuang saat jauh, agar ringan di laptop sekolah.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { toon } from './characters.js';
import { createPenjor, createStupa } from './culture.js';

export const BLOCK = 2;      // lebar kolom (m)
export const STEP = 1;       // tinggi satu blok (m)
export const WATER_Y = -0.3; // permukaan sungai & danau
const CHUNK = 32;            // kolom per sisi bongkah
const CHUNK_M = CHUNK * BLOCK;
const EDGE_DEPTH = 3;        // dinding kolom di tepi wilayah turun sampai 3 m di bawah 0

// Bahan blok: warna atas, pita sisi teratas, sisi bawah. built = bagian struktur (tidak ditumbuhi tanaman).
const MATS = [
  { name: 'rumput', top: '#7cc95a', side: '#68b04c', under: '#a87b4f' },
  { name: 'tanah', top: '#c29262', side: '#ab7f53', under: '#946c47' },
  { name: 'pasir', top: '#f0dca4', side: '#e3c98e', under: '#d2b279' },
  { name: 'batu', top: '#a9ada6', side: '#959a92', under: '#82867f' },
  { name: 'embun beku', top: '#f5fbff', side: '#dcebf5', under: '#a9ada6' },
  { name: 'abu vulkanik', top: '#77716e', side: '#66605d', under: '#544f4c' },
  { name: 'dasar air', top: '#cdbd8c', side: '#b9a878', under: '#a08f63' },
  { name: 'kayu', top: '#b88250', side: '#9a6a40', under: '#7f5634', built: true },
  { name: 'andesit', top: '#8f8c85', side: '#7d7a73', under: '#6b6862', built: true },
  { name: 'bata merah', top: '#cf6a42', side: '#b65a37', under: '#9a4b2e', built: true },
  { name: 'rumput rawa', top: '#72b66c', side: '#5f9f5a', under: '#6e5c40' },
  { name: 'rumput savana', top: '#cfc56c', side: '#b8ae5b', under: '#a87b4f' },
  { name: 'lumut gunung', top: '#62ad6d', side: '#529a5d', under: '#959a92' },
  { name: 'kawah', top: '#ff8a3d', side: '#e5672b', under: '#544f4c' },
  { name: 'batu pasir', top: '#d9a06a', side: '#c48655', under: '#a96f45', built: true },
  { name: 'batu besar', top: '#9d9b93', side: '#8a8880', under: '#77756e', built: true }
];
const M = { rumput: 0, tanah: 1, pasir: 2, batu: 3, embun: 4, abu: 5, dasar: 6, kayu: 7, andesit: 8, bata: 9, rawa: 10, savana: 11, lumut: 12, kawah: 13, batupasir: 14, batubesar: 15 };

/** Bioma tiap wilayah pos. */
export const BIOMES = {
  1: { key: 'hutan', name: 'Hutan Tropis', desc: 'bukit landai berhutan lebat dan anak sungai' },
  2: { key: 'lembah', name: 'Lembah Sungai', desc: 'punggung bukit dan sungai berkelok di dasar lembah' },
  3: { key: 'gunung', name: 'Pegunungan Kabut', desc: 'puncak tinggi berlapis lumut, batu, dan embun beku' },
  4: { key: 'rawa', name: 'Rawa & Danau', desc: 'dataran basah penuh danau dan hutan bakau' },
  5: { key: 'gumuk', name: 'Gumuk Pasir & Savana', desc: 'bukit pasir, padang savana, dan mesa batu pasir' },
  6: { key: 'kaldera', name: 'Kaldera Gunung Api', desc: 'gunung api berkawah menyala dengan lereng berabu' }
};

// Struktur blok per bioma: [jenis, jumlah, bahan]
const STRUCTS = {
  hutan: [['menara', 1, M.kayu], ['candi', 2, M.bata], ['batu', 4, M.batubesar]],
  lembah: [['menara', 2, M.kayu], ['candi', 1, M.bata], ['batu', 5, M.batubesar]],
  gunung: [['menara', 1, M.andesit], ['candi', 1, M.andesit], ['batu', 14, M.batubesar]],
  rawa: [['menara', 1, M.kayu], ['candi', 1, M.andesit], ['batu', 3, M.batubesar]],
  gumuk: [['menara', 1, M.batupasir], ['mesa', 3, M.batupasir], ['candi', 1, M.batupasir], ['batu', 4, M.batubesar]],
  kaldera: [['menara', 1, M.bata], ['candi', 1, M.andesit], ['batu', 12, M.batubesar]]
};

// ---------- Derau deterministik ----------
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}
function makeNoise(seed) {
  const rnd = seeded(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i += 1) perm[i] = p[i & 255];
  const val = new Float32Array(256);
  for (let i = 0; i < 256; i += 1) val[i] = rnd() * 2 - 1;
  const v = (i, j) => val[perm[perm[i & 255] + (j & 255)]];
  function noise(x, z) {
    const xi = Math.floor(x); const zi = Math.floor(z);
    const fx = x - xi; const fz = z - zi;
    const u = fx * fx * (3 - 2 * fx); const w = fz * fz * (3 - 2 * fz);
    const a = v(xi, zi); const b = v(xi + 1, zi); const c = v(xi, zi + 1); const d = v(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  }
  function fbm(x, z, oct = 3) {
    let s = 0; let amp = 0.5; let f = 1; let n = 0;
    for (let k = 0; k < oct; k += 1) { s += amp * noise(x * f + k * 17.3, z * f - k * 9.1); n += amp; amp *= 0.5; f *= 2.03; }
    return s / n;
  }
  return { noise, fbm };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const distSeg = (px, pz, a, b) => {
  const vx = b.x - a.x; const vz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (pz - a.z) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t));
};

// Bentuk medan mentah tiap bioma (meter, sebelum dibulatkan ke blok dan diratakan di sekitar area misi).
const RAW = {
  hutan(x, z, c) {
    const r = Math.abs(c.N2.fbm(x / 180, z / 180));
    if (r < 0.045) return -2.6 * (1 - r / 0.045) - 0.4; // anak sungai
    return Math.max(0, 11 * (c.N1.fbm(x / 120, z / 120) + 0.28) + 3 * c.N1.fbm(x / 38, z / 38));
  },
  lembah(x, z, c) {
    const r = Math.abs(c.N2.fbm(x / 230, z / 230));
    if (r < 0.06) return -4.4 * (1 - r / 0.06) - 0.5; // sungai di dasar lembah
    const ridge = 15 * Math.max(0, c.N1.fbm(x / 150, z / 150) + 0.25) + 2.5 * c.N1.fbm(x / 45, z / 45);
    return Math.max(0, ridge) * smooth(0.04, 0.24, r);
  },
  gunung(x, z, c) {
    const m = Math.max(0, c.N1.fbm(x / 170, z / 170) + 0.2);
    let h = 70 * m * m + 3 * c.N1.fbm(x / 36, z / 36);
    h = Math.max(h, 52 * (1 - Math.hypot(x - c.peak.x, z - c.peak.z) / 200)); // puncak utama
    if (h < 3 && c.N2.fbm(x / 90, z / 90) > 0.33) return -2.5; // telaga
    return Math.max(0, h);
  },
  rawa(x, z, c) {
    const l = c.N2.fbm(x / 110, z / 110);
    if (l > 0.1) return -Math.min(4.5, 1 + (l - 0.1) * 20);
    return Math.max(0, 2.4 * c.N1.fbm(x / 70, z / 70) + 0.7);
  },
  gumuk(x, z, c) {
    if (c.N2.fbm(x / 80 - 31, z / 80 + 70) > 0.34) return -2.2; // oase
    const wave = Math.sin((x * 0.83 + z * 0.56) / 15 + 5 * c.N1.fbm(x / 90, z / 90));
    const field = smooth(-0.12, 0.18, c.N2.fbm(x / 260 + 40, z / 260));
    const dune = Math.pow(Math.max(0, wave), 1.4) * (3 + 5 * (c.N2.fbm(x / 200, z / 200) + 0.5)) * field;
    return dune + 1.5 * Math.max(0, c.N1.fbm(x / 60, z / 60));
  },
  kaldera(x, z, c) {
    const d = Math.hypot(x - c.peak.x, z - c.peak.z);
    let cone = 54 * Math.pow(Math.max(0, 1 - d / 230), 1.15);
    if (d < 40) cone -= 18 * (1 - d / 40); // kawah
    return Math.max(cone, 5 * Math.max(0, c.N1.fbm(x / 90, z / 90) + 0.12));
  }
};

// Bahan permukaan alam. s = { shore: bersebelahan dengan air, d: jarak ke puncak }
const SURFACE = {
  hutan: (h, s) => (h < 0 ? M.dasar : s.shore ? M.pasir : h >= 13 ? M.batu : M.rumput),
  lembah: (h, s) => (h < 0 ? M.dasar : s.shore ? M.pasir : h >= 11 ? M.batu : M.rumput),
  gunung: (h, s) => (h < 0 ? M.dasar : s.shore ? M.tanah : h >= 36 ? M.embun : h >= 15 ? M.batu : M.lumut),
  rawa: (h, s) => (h < 0 ? M.dasar : s.shore ? M.tanah : M.rawa),
  gumuk: (h, s) => (h < 0 ? M.dasar : s.shore ? M.rumput : h >= 2 ? M.pasir : M.savana),
  kaldera: (h, s) => (h < 0 ? M.dasar : s.d < 14 ? M.kawah : s.d < 240 && h >= 7 ? M.abu : s.shore ? M.pasir : M.rumput)
};

// Tekstur blok: garis tepi tipis, jadi kotak 2 × 2 m (atas) dan 2 × 1 m (sisi) terbaca walau kolomnya digabung.
function blockTexture(anisotropy) {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 32, 32);
  const rnd = seeded(99);
  for (let i = 0; i < 40; i += 1) { g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.04})`; g.fillRect(Math.floor(rnd() * 30), Math.floor(rnd() * 30), 2, 2); }
  g.strokeStyle = 'rgba(60,45,35,0.17)'; g.lineWidth = 2; g.strokeRect(1, 1, 30, 30);
  g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1; g.beginPath(); g.moveTo(3, 2.5); g.lineTo(29, 2.5); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy || 1;
  return t;
}

/**
 * Medan blok untuk semua wilayah pos.
 * opts: { scene, gfx ('high' | 'low'), anisotropy }
 */
export function createTerrain({ scene, gfx = 'high', anisotropy = 1 }) {
  const group = new THREE.Group();
  group.name = 'medan-blok';
  scene.add(group);
  const regions = [];
  const chunks = new Map();
  const pick = [];
  const shardSpots = []; // kepingan arsip di puncak menara pandang: [x, y, z, pulau]
  let quality = gfx;
  let radius = quality === 'low' ? 250 : 360;
  const material = toon('#ffffff', { unique: true, vertexColors: true, map: blockTexture(anisotropy) });
  const waterMat = new THREE.MeshToonMaterial({ color: '#5fc6e6', emissive: '#1f8fb3', emissiveIntensity: 0.18, transparent: true, opacity: 0.8 });
  const colors = MATS.map((m) => ({ top: new THREE.Color(m.top), side: new THREE.Color(m.side), under: new THREE.Color(m.under) }));

  function regionAt(x, z) {
    for (let n = 0; n < regions.length; n += 1) {
      const r = regions[n];
      if (x >= r.minX && x < r.maxX && z >= r.minZ && z < r.maxZ) return r;
    }
    return null;
  }

  /** Tinggi permukaan blok di titik dunia (0 di luar wilayah bermedan). */
  function heightAt(x, z) {
    const r = regionAt(x, z);
    if (!r) return 0;
    const k = (Math.floor(z / BLOCK) - r.gz0) * r.nx + (Math.floor(x / BLOCK) - r.gx0);
    return r.valid[k] ? r.H[k] : 0;
  }

  /** Keterangan permukaan untuk penempatan tanaman. */
  function surface(x, z) {
    const r = regionAt(x, z);
    if (!r) return { h: 0, mat: M.rumput, water: false, built: false, shore: false, region: null };
    const i = Math.floor(x / BLOCK) - r.gx0; const j = Math.floor(z / BLOCK) - r.gz0; const k = j * r.nx + i;
    if (!r.valid[k]) return { h: 0, mat: M.rumput, water: false, built: false, shore: false, region: r.id };
    const h = r.H[k];
    const wet = (kk) => r.valid[kk] && r.H[kk] < 0;
    const shore = h >= 0 && ((i > 0 && wet(k - 1)) || (i < r.nx - 1 && wet(k + 1)) || (j > 0 && wet(k - r.nx)) || (j < r.nz - 1 && wet(k + r.nx)));
    const m = r.M[k];
    return { h, mat: m, water: h < 0, built: Boolean(MATS[m].built), shore, frost: m === M.embun, sand: m === M.pasir, region: r.id };
  }

  /**
   * Hitung grid medan satu wilayah pos.
   * f = bingkai wilayah { x, z, rx, rz }; flats = { points: [{ x, z, r }], segs: [[a, b]] } area yang dikunci rata.
   */
  function addRegion(id, f, { points = [], segs = [] } = {}) {
    const biome = BIOMES[id];
    if (!biome || regions.some((r) => r.id === id)) return;
    const gx0 = Math.floor((f.x - f.rx - 3) / BLOCK); const gx1 = Math.ceil((f.x + f.rx + 3) / BLOCK);
    const gz0 = Math.floor((f.z - f.rz - 3) / BLOCK); const gz1 = Math.ceil((f.z + f.rz + 3) / BLOCK);
    const nx = gx1 - gx0; const nz = gz1 - gz0; const n = nx * nz;
    const valid = new Uint8Array(n); const locked = new Uint8Array(n); const plank = new Uint8Array(n); const fixed = new Uint8Array(n);
    const H = new Int8Array(n); const Mt = new Uint8Array(n); const E = new Float32Array(n);
    const cxOf = (i) => (gx0 + i + 0.5) * BLOCK;
    const czOf = (j) => (gz0 + j + 0.5) * BLOCK;
    for (let j = 0; j < nz; j += 1) for (let i = 0; i < nx; i += 1) {
      const k = j * nx + i;
      const e = ((cxOf(i) - f.x) / (f.rx + 1)) ** 2 + ((czOf(j) - f.z) / (f.rz + 1)) ** 2;
      E[k] = e;
      if (e <= 1) valid[k] = 1;
    }
    // Area terkunci: 1 = titik (desa, misi, jembatan, ...), 2 = jalan setapak
    const lockBox = (x0, z0, x1, z1, test, val) => {
      const i0 = Math.max(0, Math.floor(x0 / BLOCK) - gx0); const i1 = Math.min(nx - 1, Math.floor(x1 / BLOCK) - gx0);
      const j0 = Math.max(0, Math.floor(z0 / BLOCK) - gz0); const j1 = Math.min(nz - 1, Math.floor(z1 / BLOCK) - gz0);
      for (let j = j0; j <= j1; j += 1) for (let i = i0; i <= i1; i += 1) {
        const k = j * nx + i;
        if (test(cxOf(i), czOf(j)) && (!locked[k] || val === 1)) locked[k] = val;
      }
    };
    points.forEach((p) => lockBox(p.x - p.r, p.z - p.r, p.x + p.r, p.z + p.r, (x, z) => Math.hypot(x - p.x, z - p.z) <= p.r, 1));
    segs.forEach(([a, b]) => lockBox(Math.min(a.x, b.x) - 3.5, Math.min(a.z, b.z) - 3.5, Math.max(a.x, b.x) + 3.5, Math.max(a.z, b.z) + 3.5, (x, z) => distSeg(x, z, a, b) <= 3.2, 2));
    // Jarak Manhattan (kolom) ke area terkunci: membatasi tinggi/dalam medan di sekitarnya.
    const D = new Uint8Array(n).fill(255);
    for (let k = 0; k < n; k += 1) if (locked[k]) D[k] = 0;
    for (let j = 0; j < nz; j += 1) for (let i = 0; i < nx; i += 1) {
      const k = j * nx + i;
      if (i > 0 && D[k - 1] + 1 < D[k]) D[k] = D[k - 1] + 1;
      if (j > 0 && D[k - nx] + 1 < D[k]) D[k] = D[k - nx] + 1;
    }
    for (let j = nz - 1; j >= 0; j -= 1) for (let i = nx - 1; i >= 0; i -= 1) {
      const k = j * nx + i;
      if (i < nx - 1 && D[k + 1] + 1 < D[k]) D[k] = D[k + 1] + 1;
      if (j < nz - 1 && D[k + nx] + 1 < D[k]) D[k] = D[k + nx] + 1;
    }
    // Puncak (gunung/kaldera) = titik terjauh dari semua area terkunci, tidak terlalu dekat tepi.
    let peakK = 0; let best = -1;
    for (let k = 0; k < n; k += 1) if (valid[k] && E[k] < 0.6 && D[k] > best) { best = D[k]; peakK = k; }
    const seed = 1000 + id * 7919;
    const c = { N1: makeNoise(seed), N2: makeNoise(seed + 77), peak: { x: cxOf(peakK % nx), z: czOf(Math.floor(peakK / nx)) } };
    const raw = RAW[biome.key];
    for (let j = 0; j < nz; j += 1) for (let i = 0; i < nx; i += 1) {
      const k = j * nx + i;
      if (!valid[k]) continue;
      let v = raw(cxOf(i), czOf(j), c);
      if (v < 0) v *= smooth(0.92, 0.75, E[k]); // tidak ada air di dekat tepi pulau
      let h = Math.round(v);
      if (locked[k] === 2 && v < -0.5) plank[k] = 1; // jalan menyeberangi air = jembatan kayu
      h = Math.max(-D[k], Math.min(D[k], h, 60));
      H[k] = Math.max(-8, h);
    }
    // Lereng paling curam 1 blok per kolom (dua lintasan transformasi jarak min-plus).
    for (let j = 0; j < nz; j += 1) for (let i = 0; i < nx; i += 1) {
      const k = j * nx + i;
      if (!valid[k]) continue;
      if (i > 0 && valid[k - 1] && H[k - 1] + 1 < H[k]) H[k] = H[k - 1] + 1;
      if (j > 0 && valid[k - nx] && H[k - nx] + 1 < H[k]) H[k] = H[k - nx] + 1;
    }
    for (let j = nz - 1; j >= 0; j -= 1) for (let i = nx - 1; i >= 0; i -= 1) {
      const k = j * nx + i;
      if (!valid[k]) continue;
      if (i < nx - 1 && valid[k + 1] && H[k + 1] + 1 < H[k]) H[k] = H[k + 1] + 1;
      if (j < nz - 1 && valid[k + nx] && H[k + nx] + 1 < H[k]) H[k] = H[k + nx] + 1;
    }

    const region = { id, biome, f, gx0, gz0, nx, nz, H, M: Mt, valid, minX: gx0 * BLOCK, maxX: gx1 * BLOCK, minZ: gz0 * BLOCK, maxZ: gz1 * BLOCK };

    // ---- Struktur blok ----
    const rnd = seeded(seed + 501);
    const placed = [];
    const at = (i, j) => j * nx + i;
    const site = (w, d, margin, minD, gap) => {
      for (let t = 0; t < 5000; t += 1) {
        const i = margin + Math.floor(rnd() * (nx - w - margin * 2)); const j = margin + Math.floor(rnd() * (nz - d - margin * 2));
        const ci = i + w / 2; const cj = j + d / 2;
        if (placed.some((p) => Math.hypot(p.ci - ci, p.cj - cj) < gap + p.r)) continue;
        let lo = 99; let hi = -99; let ok = true;
        for (let jj = j - margin; jj < j + d + margin && ok; jj += 1) for (let ii = i - margin; ii < i + w + margin; ii += 1) {
          const k = at(ii, jj);
          if (!valid[k] || fixed[k] || locked[k] || D[k] < minD || H[k] < 0 || E[k] > 0.85) { ok = false; break; }
          lo = Math.min(lo, H[k]); hi = Math.max(hi, H[k]);
        }
        if (!ok || hi - lo > 1) continue;
        placed.push({ ci, cj, r: Math.max(w, d) / 2 });
        return { i, j, base: lo };
      }
      return null;
    };
    const setCell = (i, j, h, m) => { const k = at(i, j); H[k] = h; Mt[k] = m; fixed[k] = 1; };
    const flatten = (s, w, d, margin) => {
      for (let jj = s.j - margin; jj < s.j + d + margin; jj += 1) for (let ii = s.i - margin; ii < s.i + w + margin; ii += 1) H[at(ii, jj)] = s.base;
    };
    const world = (i, j, y) => new THREE.Vector3((gx0 + i + 0.5) * BLOCK, y, (gz0 + j + 0.5) * BLOCK);
    const decorate = (obj, pos) => { obj.position.copy(pos); obj.traverse((o) => { if (o.isMesh) { o.castShadow = quality === 'high'; o.receiveShadow = true; } }); group.add(obj); };
    const builders = {
      // Menara pandang: inti 3 × 3 kolom setinggi 10 blok, tangga melingkar 10 anak tangga, penjor di puncak.
      menara(mat, first) {
        const s = site(5, 5, 1, 12, 40);
        if (!s) return;
        flatten(s, 5, 5, 1);
        for (let dj = 1; dj <= 3; dj += 1) for (let di = 1; di <= 3; di += 1) setCell(s.i + di, s.j + dj, s.base + 10, mat);
        const ring = [];
        for (let di = 0; di <= 4; di += 1) ring.push([di, 0]);
        for (let dj = 1; dj <= 4; dj += 1) ring.push([4, dj]);
        for (let di = 3; di >= 0; di -= 1) ring.push([di, 4]);
        for (let dj = 3; dj >= 1; dj -= 1) ring.push([0, dj]);
        const start = [1, 5, 9, 13][Math.floor(rnd() * 4)];
        for (let k = 0; k < 10; k += 1) { const [di, dj] = ring[(start + k) % 16]; setCell(s.i + di, s.j + dj, s.base + 1 + k, mat); }
        const top = world(s.i + 2, s.j + 2, s.base + 10);
        const penjor = createPenjor(1.1);
        decorate(penjor, world(s.i + 1, s.j + 1, s.base + 10).add(new THREE.Vector3(-0.6, 0, -0.6)));
        if (first) shardSpots.push([top.x, top.y + 0.9, top.z, id]);
      },
      // Candi: tiga undakan (bisa didaki dari segala sisi), stupa di puncak, beberapa blok runtuh.
      candi(mat) {
        const s = site(7, 7, 1, 10, 34);
        if (!s) return;
        flatten(s, 7, 7, 1);
        for (let dj = 0; dj < 7; dj += 1) for (let di = 0; di < 7; di += 1) {
          const tier = Math.min(di, dj, 6 - di, 6 - dj);
          setCell(s.i + di, s.j + dj, s.base + (tier === 3 ? 5 : tier + 1), mat);
        }
        for (let k = 0; k < 3; k += 1) { // runtuhan di undakan terluar
          const side = Math.floor(rnd() * 4); const p = 1 + Math.floor(rnd() * 5);
          const [di, dj] = [[p, 0], [6, p], [p, 6], [0, p]][side];
          H[at(s.i + di, s.j + dj)] = s.base; Mt[at(s.i + di, s.j + dj)] = mat;
        }
        decorate(createStupa(0.55), world(s.i + 3, s.j + 3, s.base + 5));
      },
      // Mesa batu pasir: dataran tinggi 6 blok dengan tanjakan blok di satu sisi.
      mesa(mat) {
        const s = site(14, 6, 1, 10, 30);
        if (!s) return;
        flatten(s, 14, 6, 1);
        for (let dj = 0; dj < 6; dj += 1) for (let di = 6; di < 14; di += 1) setCell(s.i + di, s.j + dj, s.base + 6, mat);
        for (let k = 0; k < 5; k += 1) setCell(s.i + 5 - k, s.j + 3, s.base + 5 - k, mat);
      },
      // Batu besar: tebing kecil 2–3 blok yang harus dikitari atau dilompati.
      batu(mat) {
        const w = 2 + Math.floor(rnd() * 2); const d = 2;
        const s = site(w, d, 0, 6, 8);
        if (!s) return;
        const h = s.base + 2 + Math.floor(rnd() * 2);
        for (let dj = 0; dj < d; dj += 1) for (let di = 0; di < w; di += 1) setCell(s.i + di, s.j + dj, h - (di === w - 1 && dj === 1 ? 1 : 0), mat);
      }
    };
    STRUCTS[biome.key].forEach(([kind, count, mat]) => { for (let q = 0; q < count; q += 1) builders[kind](mat, q === 0); });
    // Pelataran yang diratakan di sekeliling struktur bisa membuat beda 2 blok dengan medan di luarnya:
    // lereng alam dirapikan lagi (struktur sendiri tidak diubah, hanya membatasi tetangganya).
    for (let pass = 0; pass < 2; pass += 1) {
      const fwd = pass === 0;
      for (let jj = 0; jj < nz; jj += 1) for (let ii = 0; ii < nx; ii += 1) {
        const j = fwd ? jj : nz - 1 - jj; const i = fwd ? ii : nx - 1 - ii; const k = j * nx + i;
        if (!valid[k] || fixed[k] || locked[k]) continue;
        const a = fwd ? (i > 0 ? k - 1 : -1) : (i < nx - 1 ? k + 1 : -1);
        const b = fwd ? (j > 0 ? k - nx : -1) : (j < nz - 1 ? k + nx : -1);
        if (a >= 0 && valid[a] && !fixed[a] && H[a] + 1 < H[k]) H[k] = H[a] + 1;
        if (b >= 0 && valid[b] && !fixed[b] && H[b] + 1 < H[k]) H[k] = H[b] + 1;
      }
    }

    // ---- Bahan permukaan alam ----
    const surf = SURFACE[biome.key];
    for (let j = 0; j < nz; j += 1) for (let i = 0; i < nx; i += 1) {
      const k = j * nx + i;
      if (!valid[k] || fixed[k]) continue;
      const h = H[k];
      if (plank[k] && h >= 0) { Mt[k] = M.kayu; continue; }
      const wet = (kk) => valid[kk] && H[kk] < 0;
      const shore = h >= 0 && ((i > 0 && wet(k - 1)) || (i < nx - 1 && wet(k + 1)) || (j > 0 && wet(k - nx)) || (j < nz - 1 && wet(k + nx)));
      Mt[k] = surf(h, { shore, d: Math.hypot(cxOf(i) - c.peak.x, czOf(j) - c.peak.z) });
    }
    regions.push(region);
  }

  // ---------- Mesh bongkah ----------
  function buildChunk(r, ci, cj) {
    const i0 = ci * CHUNK; const j0 = cj * CHUNK;
    const i1 = Math.min(r.nx, i0 + CHUNK); const j1 = Math.min(r.nz, j0 + CHUNK);
    const P = []; const N = []; const C = []; const U = []; const I = [];
    const WP = []; const WI = [];
    const { H, M: Mt, valid, nx, nz, gx0, gz0 } = r;
    const tmp = new THREE.Color();
    // Empat titik sudut berurutan; urutan segitiga dibalik bila tidak searah normal.
    const face = (v, n, col, uv) => {
      const b = P.length / 3;
      const ax = v[3] - v[0]; const ay = v[4] - v[1]; const az = v[5] - v[2];
      const bx = v[6] - v[0]; const by = v[7] - v[1]; const bz = v[8] - v[2];
      const flip = (ay * bz - az * by) * n[0] + (az * bx - ax * bz) * n[1] + (ax * by - ay * bx) * n[2] < 0;
      for (let q = 0; q < 4; q += 1) { P.push(v[q * 3], v[q * 3 + 1], v[q * 3 + 2]); N.push(n[0], n[1], n[2]); C.push(col.r, col.g, col.b); U.push(uv[q * 2], uv[q * 2 + 1]); }
      if (flip) I.push(b, b + 2, b + 1, b, b + 3, b + 2); else I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    const jitter = (k, base) => { const s = ((k * 2654435761) >>> 0) / 4294967296; return tmp.copy(base).multiplyScalar(0.95 + s * 0.09); };
    for (let j = j0; j < j1; j += 1) {
      // Atas: gabungkan kolom berurutan yang sama tinggi & bahannya.
      let i = i0;
      while (i < i1) {
        const k = j * nx + i;
        if (!valid[k]) { i += 1; continue; }
        let e = i + 1;
        while (e < i1 && valid[j * nx + e] && H[j * nx + e] === H[k] && Mt[j * nx + e] === Mt[k]) e += 1;
        const x0 = (gx0 + i) * BLOCK; const x1 = (gx0 + e) * BLOCK; const z0 = (gz0 + j) * BLOCK; const z1 = z0 + BLOCK; const y = H[k];
        face([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0], [0, 1, 0], jitter(k, colors[Mt[k]].top), [x0 / BLOCK, z0 / BLOCK, x0 / BLOCK, z1 / BLOCK, x1 / BLOCK, z1 / BLOCK, x1 / BLOCK, z0 / BLOCK]);
        i = e;
      }
      // Air: satu pita per baris kolom yang tergenang.
      i = i0;
      while (i < i1) {
        const k = j * nx + i;
        if (!valid[k] || H[k] >= 0) { i += 1; continue; }
        let e = i + 1;
        while (e < i1 && valid[j * nx + e] && H[j * nx + e] < 0) e += 1;
        const b = WP.length / 3; const x0 = (gx0 + i) * BLOCK; const x1 = (gx0 + e) * BLOCK; const z0 = (gz0 + j) * BLOCK; const z1 = z0 + BLOCK;
        WP.push(x0, WATER_Y, z0, x0, WATER_Y, z1, x1, WATER_Y, z1, x1, WATER_Y, z0);
        WI.push(b, b + 1, b + 2, b, b + 2, b + 3);
        i = e;
      }
      // Sisi: dinding blok ke tetangga yang lebih rendah (atau tepi pulau).
      for (i = i0; i < i1; i += 1) {
        const k = j * nx + i;
        if (!valid[k]) continue;
        const h = H[k]; const m = colors[Mt[k]];
        const x0 = (gx0 + i) * BLOCK; const x1 = x0 + BLOCK; const z0 = (gz0 + j) * BLOCK; const z1 = z0 + BLOCK;
        const edge = Math.min(h, 0) - EDGE_DEPTH;
        const sides = [
          [i > 0 && valid[k - 1] ? H[k - 1] : edge, [-1, 0, 0], (y0, y1) => [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0], 'z'],
          [i < nx - 1 && valid[k + 1] ? H[k + 1] : edge, [1, 0, 0], (y0, y1) => [x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0], 'z'],
          [j > 0 && valid[k - nx] ? H[k - nx] : edge, [0, 0, -1], (y0, y1) => [x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0], 'x'],
          [j < nz - 1 && valid[k + nx] ? H[k + nx] : edge, [0, 0, 1], (y0, y1) => [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], 'x']
        ];
        sides.forEach(([nh, n, quad, axis]) => {
          if (nh >= h) return;
          const uvs = (y0, y1) => (axis === 'z' ? [z0 / BLOCK, y0, z1 / BLOCK, y0, z1 / BLOCK, y1, z0 / BLOCK, y1] : [x0 / BLOCK, y0, x1 / BLOCK, y0, x1 / BLOCK, y1, x0 / BLOCK, y1]);
          const band = Math.max(nh, h - STEP);
          face(quad(band, h), n, m.side, uvs(band, h));
          if (band > nh) face(quad(nh, band), n, m.under, uvs(nh, band));
        });
      }
    }
    const out = { cx: (gx0 + i0 + CHUNK / 2) * BLOCK, cz: (gz0 + j0 + CHUNK / 2) * BLOCK, mesh: null, water: null };
    if (I.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      geo.setIndex(P.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material);
      mesh.receiveShadow = true;
      mesh.castShadow = quality === 'high';
      mesh.userData.terrain = true;
      group.add(mesh);
      pick.push(mesh);
      out.mesh = mesh;
    }
    if (WI.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(WP, 3));
      const nrm = new Float32Array(WP.length); for (let q = 1; q < nrm.length; q += 3) nrm[q] = 1;
      geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      geo.setIndex(WI);
      geo.computeBoundingSphere();
      const water = new THREE.Mesh(geo, waterMat);
      water.receiveShadow = true;
      water.renderOrder = 1;
      group.add(water);
      out.water = water;
    }
    return out;
  }

  function dispose(key) {
    const c = chunks.get(key);
    if (!c) return;
    [c.mesh, c.water].forEach((m) => { if (!m) return; group.remove(m); m.geometry.dispose(); const p = pick.indexOf(m); if (p >= 0) pick.splice(p, 1); });
    chunks.delete(key);
  }

  function wanted(px, pz, rad) {
    const list = [];
    regions.forEach((r) => {
      if (px < r.minX - rad || px > r.maxX + rad || pz < r.minZ - rad || pz > r.maxZ + rad) return;
      const nci = Math.ceil(r.nx / CHUNK); const ncj = Math.ceil(r.nz / CHUNK);
      for (let cj = 0; cj < ncj; cj += 1) for (let ci = 0; ci < nci; ci += 1) {
        const x = (r.gx0 + ci * CHUNK + CHUNK / 2) * BLOCK; const z = (r.gz0 + cj * CHUNK + CHUNK / 2) * BLOCK;
        const d = Math.hypot(x - px, z - pz);
        if (d <= rad + CHUNK_M * 0.71) list.push({ key: `${r.id}:${ci}:${cj}`, r, ci, cj, d });
      }
    });
    return list;
  }

  /** Muat bongkah di sekitar pemain (terdekat dulu, dibatasi waktu per bingkai) dan buang yang jauh. */
  let lastX = Infinity; let lastZ = Infinity; let pending = true;
  function update(px, pz, budgetMs = 3) {
    // Daftar bongkah hanya dihitung ulang bila pemain bergeser > 16 m atau masih ada yang belum dibangun.
    if (!pending && Math.hypot(px - lastX, pz - lastZ) < 16) return;
    lastX = px; lastZ = pz;
    chunks.forEach((c, key) => { if (Math.hypot(c.cx - px, c.cz - pz) > radius + CHUNK_M * 1.5) dispose(key); });
    const missing = wanted(px, pz, radius).filter((w) => !chunks.has(w.key)).sort((a, b) => a.d - b.d);
    const t0 = performance.now();
    let built = 0;
    for (let q = 0; q < missing.length; q += 1) {
      const w = missing[q];
      chunks.set(w.key, buildChunk(w.r, w.ci, w.cj));
      built += 1;
      if (performance.now() - t0 > budgetMs) break;
    }
    pending = built < missing.length;
  }

  /** Bangun langsung bongkah di dekat titik (mis. tempat mendarat) agar tanah sudah ada saat tiba. */
  function prime(px, pz, rad = 110) {
    wanted(px, pz, rad).forEach((w) => { if (!chunks.has(w.key)) chunks.set(w.key, buildChunk(w.r, w.ci, w.cj)); });
    pending = true;
  }

  function setQuality(q) {
    if (q === quality) return;
    quality = q;
    radius = q === 'low' ? 250 : 360;
    [...chunks.keys()].forEach(dispose);
    pending = true;
    group.traverse((o) => { if (o.isMesh && !o.userData.terrain) o.castShadow = q === 'high'; });
  }

  return {
    group,
    heightAt,
    surface,
    addRegion,
    update,
    prime,
    setQuality,
    shardSpots,
    biomeOf: (id) => BIOMES[id] || null,
    get radius() { return radius; },
    get pickables() { return pick; },
    set visible(v) { group.visible = v; }
  };
}
