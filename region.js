/*
 * Isi wilayah dunia terbuka tiap pos (sejak 0.9): wilayah ±1000 × 650 m berisi desa pusat, jalan setapak ke tiap
 * objek misi dan jembatan, hutan berkelompok, semak, batu, bunga, rumput, kolam, bukit terasering yang bisa didaki,
 * dan kampung budaya. Semua deterministik (benih per pos), jadi tiap siswa melihat wilayah yang sama.
 * Sejak 1.1 area-area itu dikunci rata di medan blok (terrain.js), dan tanaman bergaya blok mengikuti bioma pos:
 * berdiri di atas blok, tidak tumbuh di air, struktur, atau embun beku. Vegetasi memakai InstancedMesh per pos.
 * Sejak 1.4 tiap pulau bermusim (weather.js SEASONS): warna daun/bunga/rumput, pohon berbunga, buah, topi salju,
 * serakan di tanah, dan benda tambahan (rumpun bambu, pisang, kayu tumbang, tunggul, jamur, jerami, boneka salju,
 * lampu jalan) mengikuti musim dan bioma.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { toon, createLabel } from './characters.js';
import { seasonOf } from './weather.js';
import { createRumahGadang, createMeru, createStupa, createGunungan, createOndelOndel, createGong, createPenjor, createKite, kawungTexture } from './culture.js';

const CAMPS = [
  { name: 'Kampung Gadang', make: () => createRumahGadang(1.5) },
  { name: 'Pura Meru', make: () => createMeru(7, 1.6) },
  { name: 'Candi Stupa', make: () => { const g = new THREE.Group(); [[0, 0, 1.6], [-3.2, 1.5, 0.9], [3.2, 1.5, 0.9]].forEach(([x, z, s]) => { const st = createStupa(s); st.position.set(x, 0, z); g.add(st); }); return g; } },
  { name: 'Panggung Wayang', make: () => createGunungan(1.8) },
  { name: 'Kampung Betawi', make: () => { const g = new THREE.Group(); const a = createOndelOndel('#d9442b', 1.1); a.position.x = -1.3; const b = createOndelOndel('#f4efe6', 1.1); b.position.x = 1.3; g.add(a, b); return g; } },
  { name: 'Balai Gamelan', make: () => createGong(1.3) }
];
const KITE_COLORS = [['#e2553f', '#f5b72b'], ['#1fc3d3', '#ffffff'], ['#2fa36b', '#f5b72b'], ['#f472b6', '#ffffff'], ['#2b4c7e', '#f5b72b'], ['#f08a3c', '#2fa36b']];

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}
const distSeg = (px, pz, a, b) => {
  const vx = b.x - a.x; const vz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (pz - a.z) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t));
};

// Tanaman per bioma (pengali jumlah dasar) dan warna daun.
const FLORA = {
  hutan: { bamboo: 0.6, banana: 0.8, logs: 1, mush: 1, trees: 1.4, pines: 0.3, palms: 0, mangroves: 0, bushes: 1, rocks: 0.4, flowers: 1, grass: 1, leaf: ['#3f9a5a', '#4fb56a', '#68c26a'] },
  lembah: { bamboo: 1, banana: 0.6, logs: 0.6, mush: 0.6, trees: 0.8, pines: 0.3, palms: 0.12, mangroves: 0, bushes: 1, rocks: 0.6, flowers: 1.6, grass: 1.2, leaf: ['#4fb56a', '#68c26a', '#8ccf66'] },
  gunung: { bamboo: 0, banana: 0, logs: 1.2, mush: 0.4, trees: 0.25, pines: 2.2, palms: 0, mangroves: 0, bushes: 0.6, rocks: 2, flowers: 0.4, grass: 0.8, leaf: ['#2f8a4c', '#3b9a58', '#4caf6e'] },
  rawa: { bamboo: 0.4, banana: 0.5, logs: 0.8, mush: 1.4, trees: 0.2, pines: 0, palms: 0.1, mangroves: 1.4, bushes: 1.6, rocks: 0.2, flowers: 0.6, grass: 1.4, leaf: ['#2f7d4a', '#3f8f52', '#4f9e5a'] },
  gumuk: { bamboo: 0, banana: 0.1, logs: 0.3, mush: 0, trees: 0.1, pines: 0, palms: 0.4, mangroves: 0, bushes: 0.6, rocks: 0.9, flowers: 0.3, grass: 1, leaf: ['#8a9a3a', '#9aa84a', '#7c8f3c'] },
  kaldera: { bamboo: 0.2, banana: 0.2, logs: 1, mush: 0.4, trees: 0.5, pines: 0.5, palms: 0, mangroves: 0, bushes: 0.6, rocks: 2.2, flowers: 0.3, grass: 0.6, leaf: ['#3f8a4c', '#4a9a52', '#5aa65a'] }
};

/**
 * Bangun isi semua wilayah pos.
 * ctx: { scene, W, frame, toX, toZ, items (objek misi quest.js), platforms, shardSpots, animated, gfx, terrain }
 */
export function buildRegions(ctx) {
  const { W } = ctx;
  W.islands.filter((i) => W.isPost(i.id)).forEach((isl) => buildRegion(ctx, isl.id));
}

/** Bangun isi satu wilayah pos (dipanggil per langkah muat agar layar tidak membeku). */
export function buildRegion(ctx, id) {
  const { scene, W, frame, toX, toZ, items, platforms, shardSpots, animated, gfx, terrain } = ctx;
  const f = frame(id);
  const rand = seeded(7000 + id * 7919);
  const high = gfx === 'high';
  const root = new THREE.Group();
  root.name = `wilayah-pos-${id}`;
  scene.add(root);

  const hub = { x: f.x, z: f.z - 8 };
  const st = W.stations.find((s) => s.id === id);
  const station = { x: toX(st.x), z: toZ(st.y) };
  const quest = items.filter((it) => it.pos === id).map((it) => ({ x: it.x, z: it.z }));
  const ends = W.bridges.filter((b) => b.from === id || b.to === id).map((b) => { const p = b.from === id ? b.a : b.b; return { x: toX(p[0]), z: toZ(p[1]) }; });
  const inside = (x, z, m = 6) => ((x - f.x) / (f.rx - m)) ** 2 + ((z - f.z) / (f.rz - m)) ** 2 <= 1;
  const randomPoint = (m = 20) => { for (;;) { const x = f.x + (rand() * 2 - 1) * f.rx; const z = f.z + (rand() * 2 - 1) * f.rz; if (inside(x, z, m)) return { x, z }; } };

  // ---- Penempatan titik menarik: kampung, bukit, kolam ----
  const pois = [];
  const farFromAll = (p, d) => pois.every((q) => Math.hypot(q.x - p.x, q.z - p.z) > d + q.r)
    && quest.every((q) => Math.hypot(q.x - p.x, q.z - p.z) > d)
    && ends.every((q) => Math.hypot(q.x - p.x, q.z - p.z) > d)
    && Math.hypot(hub.x - p.x, hub.z - p.z) > d + 50;
  const place = (r, minD) => { for (let k = 0; k < 400; k += 1) { const p = randomPoint(r + 10); if (farFromAll(p, minD + r)) return p; } return null; };
  const camps = [];
  for (let i = 0; i < 3; i += 1) { const p = place(10, 30); if (p) { camps.push({ ...p, r: 10, kind: (id + i * 2) % CAMPS.length }); pois.push({ ...p, r: 12 }); } }
  const hills = [];
  for (let i = 0; i < 3; i += 1) { const p = place(14, 30); if (p) { hills.push({ ...p, r: 14 }); pois.push({ ...p, r: 18 }); } }
  const ponds = [];
  for (let i = 0; i < 2; i += 1) { const p = place(16, 25); if (p) { const r = 9 + rand() * 8; ponds.push({ ...p, r, k: 0.6 + rand() * 0.3 }); pois.push({ ...p, r: r + 3 }); } }

  // ---- Jalan setapak dari desa pusat ----
  const segs = [];
  const route = (a, b) => {
    // sedikit berbelok lewat titik tengah acak agar tidak lurus kaku
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = -(b.z - a.z) / (len || 1); const nz = (b.x - a.x) / (len || 1);
    const bend = (rand() - 0.5) * Math.min(30, len * 0.15);
    const m = { x: (a.x + b.x) / 2 + nx * bend, z: (a.z + b.z) / 2 + nz * bend };
    segs.push([a, m], [m, b]);
  };
  route(hub, station);
  quest.forEach((q) => route(hub, q));
  ends.forEach((e) => route(hub, e));
  camps.forEach((c) => route(hub, c));
  hills.forEach((h) => route(hub, { x: h.x, z: h.z + 14 }));
  buildPaths(root, segs);

  // ---- Medan blok: semua titik penting & jalan setapak dikunci rata di ketinggian 0 ----
  if (terrain) {
    const points = [
      { ...hub, r: 30 }, { ...station, r: 12 },
      ...quest.map((q) => ({ ...q, r: 10 })), ...ends.map((e) => ({ ...e, r: 15 })),
      ...camps.map((c) => ({ x: c.x, z: c.z, r: 13 })), ...hills.map((h) => ({ x: h.x, z: h.z, r: 20 })),
      ...ponds.map((p) => ({ x: p.x, z: p.z, r: p.r + 3 }))
    ];
    terrain.addRegion(id, f, { points, segs, tint: seasonOf(id).ground });
  }
  const flora = FLORA[(terrain && terrain.biomeOf(id) || { key: 'hutan' }).key];
  const ground = (x, z) => (terrain ? terrain.surface(x, z) : { h: 0, water: false, built: false, shore: false });

  // ---- Kampung budaya ----
  camps.forEach((c, i) => {
    const def = CAMPS[c.kind];
    const g = new THREE.Group();
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(7, 36), new THREE.MeshToonMaterial({ map: kawungTexture('#f6e3b8', '#b0743a', 4) }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true;
    g.add(plaza);
    const prop = def.make();
    prop.position.set(0, 0, -1.5);
    g.add(prop);
    [-4.2, 4.2].forEach((x) => { const p = createPenjor(0.8); if (x > 0) p.scale.x *= -1; p.position.set(x, 0, 4.5); g.add(p); });
    const sign = createLabel(`◆ ${def.name}`, { color: '#7a3f1c', bg: 'rgba(255,244,220,.92)', size: 28, scale: 0.014 });
    sign.position.set(0, 7.2, 0);
    g.add(sign);
    g.position.set(c.x, 0, c.z);
    g.rotation.y = Math.atan2(hub.x - c.x, hub.z - c.z);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } if (o.userData.gong) animated.push(o); });
    if (prop.userData.disc) { prop.userData.disc.userData.gong = true; animated.push(prop.userData.disc); }
    root.add(g);
    if (i === 0) shardSpots.push([c.x + 3, 0.9, c.z + 3, id]);
  });

  // ---- Bukit terasering (pijakan yang bisa didaki) ----
  const tierCol = ['#79c257', '#8ccf66', '#a2db78'];
  hills.forEach((h, i) => {
    const tiers = [[13, 1.2], [9, 2.4], [5, 3.6]];
    tiers.forEach(([half, top], k) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(half * 2, top, half * 2), toon(tierCol[k]));
      b.position.set(h.x, top / 2, h.z);
      b.castShadow = true; b.receiveShadow = true;
      root.add(b);
      // pematang sawah: garis air tipis di tiap tingkat
      const water = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 - 1, 0.6), new THREE.MeshBasicMaterial({ color: '#8fdcef' }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(h.x, top + 0.02, h.z + half - 1);
      root.add(water);
      platforms.push({ x: h.x, z: h.z, hw: half, hd: half, top });
    });
    // gubuk di puncak
    const hut = new THREE.Group();
    [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 5), toon('#8a5a35')); p.position.set(x, 1, z); hut.add(p); });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.4, 4), toon('#c9a15a'));
    roof.rotation.y = Math.PI / 4; roof.position.y = 2.6; hut.add(roof);
    hut.position.set(h.x - 2.6, 3.6, h.z - 2.6);
    hut.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    root.add(hut);
    if (i < 2) shardSpots.push([h.x + 1.5, 3.6 + 0.9, h.z + 1.5, id]);
  });

  // ---- Kolam ----
  ponds.forEach((p) => {
    const rim = new THREE.Mesh(new THREE.CircleGeometry(p.r + 1.4, 32), toon('#ecd8a0'));
    rim.rotation.x = -Math.PI / 2; rim.scale.y = p.k; rim.position.set(p.x, 0.014, p.z);
    const water = new THREE.Mesh(new THREE.CircleGeometry(p.r, 32), new THREE.MeshToonMaterial({ color: '#7fd3e6', emissive: '#2a9fc0', emissiveIntensity: 0.15 }));
    water.rotation.x = -Math.PI / 2; water.scale.y = p.k; water.position.set(p.x, 0.024, p.z);
    water.receiveShadow = true;
    root.add(rim, water);
    for (let k = 0; k < 6; k += 1) {
      const a = rand() * Math.PI * 2; const r = rand() * p.r * 0.75;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rand() * 0.4, 10), toon('#4caf6e'));
      pad.rotation.x = -Math.PI / 2; pad.position.set(p.x + Math.cos(a) * r, 0.034, p.z + Math.sin(a) * r * p.k);
      root.add(pad);
    }
  });

  // ---- Layang-layang di langit wilayah ----
  for (let k = 0; k < 2; k += 1) {
    const [c1, c2] = KITE_COLORS[(id + k * 3) % KITE_COLORS.length];
    const kite = createKite(c1, c2);
    kite.userData.kite = { a: rand() * Math.PI * 2, r: 50 + rand() * 120, y: 22 + rand() * 10, s: 0.02 + rand() * 0.02, cx: f.x, cz: f.z };
    kite.scale.setScalar(2.2);
    scene.add(kite);
    animated.push(kite);
  }

  // ---- Vegetasi tersebar (instanced) ----
  const blocked = (x, z, pad = 0) => {
    if (!inside(x, z, 5)) return true;
    if (Math.hypot(x - hub.x, z - hub.z) < 26 + pad) return true;
    if (Math.hypot(x - station.x, z - station.z) < 10 + pad) return true;
    if (quest.some((q) => Math.hypot(q.x - x, q.z - z) < 8 + pad)) return true;
    if (ends.some((q) => Math.hypot(q.x - x, q.z - z) < 12 + pad)) return true;
    if (pois.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + pad)) return true;
    return segs.some(([a, b]) => distSeg(x, z, a, b) < 2.6 + pad);
  };
  const groves = Array.from({ length: 18 }, () => randomPoint(30));
  // Tanaman bergaya blok berdiri tepat di tengah kolom 2 × 2 m, satu tanaman per kolom.
  const taken = new Set();
  const fits = {
    land: (s) => !s.water && !s.built && !s.frost,
    shore: (s) => !s.built && ((s.shore && s.h === 0) || s.h === -1),
    dry: (s) => !s.water && !s.built && !s.frost && !s.sand,
    any: (s) => !s.built && s.h >= -1
  };
  const scatter = (count, { grove = 0, spread = 18, pad = 0, on = 'land' } = {}) => {
    const out = [];
    if (count < 1) return out;
    for (let i = 0; i < count; i += 1) {
      for (let tries = 0; tries < (on === 'shore' ? 14 : 6); tries += 1) {
        let x; let z;
        if (rand() < grove) {
          const g = groves[Math.floor(rand() * groves.length)];
          const a = rand() * Math.PI * 2; const r = Math.sqrt(-2 * Math.log(1 - rand() * 0.999)) * spread;
          x = g.x + Math.cos(a) * r; z = g.z + Math.sin(a) * r;
        } else { const p = randomPoint(6); x = p.x; z = p.z; }
        x = (Math.floor(x / 2) + 0.5) * 2; z = (Math.floor(z / 2) + 0.5) * 2;
        const key = `${x},${z}`;
        if (taken.has(key) || blocked(x, z, pad)) continue;
        const s = ground(x, z);
        if (!fits[on](s)) continue;
        taken.add(key);
        out.push({ x, y: Math.max(s.h, -1), z, s: 0.8 + rand() * 0.45, rot: Math.floor(rand() * 4) * (Math.PI / 2), c: rand(), c2: rand() });
        break;
      }
    }
    return out;
  };
  const n = (hi, lo, k) => Math.round((high ? hi : lo) * k);
  const season = seasonOf(id);
  const trees = scatter(n(720, 280, flora.trees), { grove: 0.75, pad: 1 });
  const pines = scatter(n(230, 90, flora.pines), { grove: 0.5, spread: 12, pad: 1 });
  const palms = scatter(n(150, 60, flora.palms), { grove: 0.3, spread: 20, pad: 1, on: 'dry' });
  const mangroves = scatter(n(300, 120, flora.mangroves), { grove: 0, pad: 1, on: 'shore' });
  const bamboo = scatter(n(140, 50, flora.bamboo), { grove: 0.6, spread: 10, pad: 1, on: 'dry' });
  const bananas = scatter(n(120, 45, flora.banana), { grove: 0.5, spread: 16, pad: 1, on: 'dry' });
  const logs = scatter(n(70, 30, flora.logs), { grove: 0.6, spread: 22, on: 'dry' });
  const stumps = scatter(n(90, 35, flora.logs), { grove: 0.6, spread: 22 });
  const bushes = scatter(n(520, 200, flora.bushes), { grove: 0.4, spread: 24 });
  const rocks = scatter(n(130, 55, flora.rocks), { on: 'any' });
  const mushrooms = scatter(n(160, 50, flora.mush * (season.mushrooms || 0.4)), { grove: 0.8, spread: 14, on: 'dry' });
  const hay = season.hay ? scatter(n(45, 18, 1), { on: 'dry', pad: 1 }) : [];
  const snowmen = season.snow ? scatter(n(16, 8, 1), { on: 'any', pad: 2 }) : [];
  const cover = scatter(n(800, 260, season.coverN), { grove: season.puddle ? 0.1 : 0.55, spread: 20, on: season.puddle ? 'dry' : 'land' });
  const flowers = high ? scatter(n(800, 0, flora.flowers * (season.key === 'semi' ? 1.5 : 1)), { grove: 0.2, spread: 30, on: 'dry' }) : [];
  const grass = high ? scatter(n(1400, 0, flora.grass), { on: 'dry' }) : [];

  const pick = (arr, v) => arr[Math.min(arr.length - 1, Math.floor(v * arr.length))];
  // Musim semi: sepertiga pohon berbunga merah muda.
  const leaf = (t) => (season.bloom && t.c2 < 0.35 ? pick(season.bloom, t.c) : pick(season.leaf, t.c));
  const shade = (t) => pick(season.leaf, t.c);
  instanced(root, boxes([[0.55, 2.6, 0.55, 0, 1.3, 0]]), '#8a5f37', [...trees, ...pines], () => '#8a5f37', { shadow: high });
  instanced(root, boxes([[2.8, 1.6, 2.8, 0, 3.2, 0], [1.8, 1.1, 1.8, 0, 4.4, 0], [1.1, 0.8, 3.3, 0, 3.3, 0], [3.3, 0.8, 1.1, 0, 3.3, 0]]), '#ffffff', trees, leaf, { shadow: high });
  instanced(root, boxes([[2.6, 1, 2.6, 0, 2.4, 0], [1.9, 1, 1.9, 0, 3.4, 0], [1.2, 1, 1.2, 0, 4.4, 0], [0.5, 0.8, 0.5, 0, 5.3, 0]]), '#ffffff', pines, (t) => (season.snow ? shade(t) : t.c < 0.5 ? '#2f8a4c' : '#3b9a58'), { shadow: high });
  // Lontar/kelapa: batang tinggi ramping, tajuk berbentuk silang.
  instanced(root, boxes([[0.42, 5.2, 0.42, 0, 2.6, 0]]), '#9a6c40', palms, () => '#9a6c40', { shadow: high });
  instanced(root, boxes([[3.8, 0.3, 0.9, 0, 5.3, 0], [0.9, 0.3, 3.8, 0, 5.3, 0], [1, 0.7, 1, 0, 5.45, 0]]), '#ffffff', palms, shade, { shadow: high });
  // Bakau: akar penyangga di atas air, tajuk lebar.
  instanced(root, boxes([[0.45, 2.2, 0.45, 0, 1.7, 0], [0.2, 1.3, 0.2, 0.6, 0.55, 0], [0.2, 1.3, 0.2, -0.6, 0.55, 0], [0.2, 1.3, 0.2, 0, 0.55, 0.6], [0.2, 1.3, 0.2, 0, 0.55, -0.6]]), '#6e5034', mangroves, () => '#6e5034', { shadow: high });
  instanced(root, boxes([[3.4, 1.1, 3.4, 0, 3.1, 0], [2, 0.8, 2, 0, 4, 0]]), '#ffffff', mangroves, shade, { shadow: high });
  // Rumpun bambu: lima batang tinggi dan jumbai daun.
  const dryStem = ['kemarau', 'gugur', 'dingin'].includes(season.key);
  instanced(root, boxes([[0.22, 7, 0.22, 0, 3.5, 0], [0.2, 6, 0.2, 0.5, 3, 0.3], [0.2, 6.5, 0.2, -0.4, 3.25, 0.4], [0.2, 5.5, 0.2, 0.3, 2.75, -0.5], [0.2, 6.2, 0.2, -0.5, 3.1, -0.3]]), '#ffffff', bamboo, (t) => (dryStem ? (t.c < 0.5 ? '#b9b04a' : '#a89f45') : t.c < 0.5 ? '#7fb04a' : '#9cc25a'), { shadow: high });
  instanced(root, boxes([[1.4, 0.6, 1.4, 0, 6.6, 0], [1, 0.5, 1, 0.5, 5.7, 0.3], [1, 0.5, 1, -0.5, 5.9, -0.2], [0.9, 0.5, 0.9, 0.2, 5.2, -0.5]]), '#ffffff', bamboo, shade);
  // Pohon pisang: batang semu dan empat pelepah lebar.
  instanced(root, boxes([[0.35, 2.2, 0.35, 0, 1.1, 0], [2.4, 0.12, 0.6, 0.9, 2.3, 0], [0.6, 0.12, 2.4, 0, 2.4, 0.9], [2.2, 0.12, 0.6, -0.85, 2.2, 0.1], [0.6, 0.12, 2.2, 0.1, 2.35, -0.85], [0.5, 1.2, 0.5, 0, 2.6, 0]]), '#ffffff', bananas, (t) => (dryStem ? shade(t) : t.c < 0.5 ? '#6fcf5a' : '#5fbf4e'));
  instanced(root, boxes([[1.3, 0.9, 1.3, 0, 0.45, 0], [0.8, 0.5, 0.8, 0.3, 1.1, -0.2]]), '#ffffff', bushes, (t) => (t.c < 0.5 ? leaf(t) : shade({ c: 1 - t.c })));
  instanced(root, boxes([[1.4, 0.9, 1.1, 0, 0.45, 0], [0.8, 0.6, 0.7, 0.35, 1.2, 0.1]]), '#ffffff', rocks, (t) => (t.c < 0.5 ? '#94908a' : '#7d776f'));
  // Kayu tumbang dan tunggul.
  instanced(root, boxes([[3.2, 0.65, 0.65, 0, 0.33, 0], [0.3, 0.5, 0.3, 0.6, 0.8, 0.15], [0.7, 0.75, 0.75, 1.6, 0.38, 0]]), '#ffffff', logs, (t) => (t.c < 0.5 ? '#7a5434' : '#8a5f37'));
  instanced(root, boxes([[0.9, 0.7, 0.9, 0, 0.35, 0], [0.35, 0.25, 0.35, 0.55, 0.13, 0.1]]), '#ffffff', stumps, (t) => (t.c < 0.5 ? '#9a6c40' : '#7a5434'));
  // Jamur warna-warni di bawah pohon.
  instanced(root, boxes([[0.12, 0.3, 0.12, 0, 0.15, 0], [0.45, 0.18, 0.45, 0, 0.36, 0], [0.08, 0.2, 0.08, 0.3, 0.1, 0.2], [0.28, 0.12, 0.28, 0.3, 0.24, 0.2]]), '#ffffff', mushrooms, (t) => pick(['#e5533f', '#f5d43b', '#f6efe2', '#c98a5a'], t.c));
  // Tumpukan jerami (panen & kemarau) dan boneka salju (dingin).
  instanced(root, boxes([[1.6, 1.1, 1.6, 0, 0.55, 0], [1.1, 0.6, 1.1, 0, 1.4, 0], [0.5, 0.4, 0.5, 0, 1.9, 0]]), '#ffffff', hay, (t) => (t.c < 0.5 ? '#e2c25a' : '#d4b04a'), { shadow: high });
  instanced(root, boxes([[1.1, 1.1, 1.1, 0, 0.55, 0], [0.8, 0.8, 0.8, 0, 1.5, 0], [0.55, 0.55, 0.55, 0, 2.15, 0]]), '#ffffff', snowmen, () => '#ffffff', { shadow: high });
  instanced(root, boxes([[0.12, 0.12, 0.4, 0, 2.15, 0.45], [0.9, 0.18, 0.9, 0, 1.92, 0], [0.1, 0.7, 0.1, 0.6, 1.5, 0]]), '#ffffff', snowmen, (t) => (t.c < 0.5 ? '#e5533f' : '#f08a3c'));
  // Musim panen: buah di tajuk. Musim dingin: topi salju.
  if (season.fruit) {
    const fruiting = trees.filter((t) => t.c2 < 0.6);
    instanced(root, boxes([[0.4, 0.4, 0.4, 1.45, 3.0, 0.3], [0.4, 0.4, 0.4, -0.5, 3.1, 1.45], [0.4, 0.4, 0.4, -1.45, 3.4, -0.4], [0.4, 0.4, 0.4, 0.6, 2.9, -1.45], [0.35, 0.35, 0.35, 0.9, 4.2, 0.9]]), '#ffffff', fruiting, (t) => pick(season.fruit, (t.c * 7) % 1));
  }
  if (season.snow) {
    const white = () => '#ffffff';
    instanced(root, boxes([[3.0, 0.3, 3.0, 0, 4.1, 0], [1.95, 0.3, 1.95, 0, 5.05, 0]]), '#ffffff', trees, white);
    instanced(root, boxes([[2.7, 0.22, 2.7, 0, 2.95, 0], [2.0, 0.22, 2.0, 0, 3.95, 0], [1.3, 0.22, 1.3, 0, 4.95, 0], [0.6, 0.2, 0.6, 0, 5.75, 0]]), '#ffffff', pines, white);
    instanced(root, boxes([[1.4, 0.18, 1.4, 0, 0.95, 0], [0.85, 0.15, 0.85, 0.3, 1.4, -0.2]]), '#ffffff', bushes, white);
    instanced(root, boxes([[1.45, 0.15, 1.15, 0, 0.95, 0], [0.85, 0.12, 0.75, 0.35, 1.55, 0.1]]), '#ffffff', rocks, white);
  }
  // Serakan di tanah: kelopak, daun gugur, daun kering, salju, atau genangan air.
  const coverGeo = season.puddle ? boxes([[1.8, 0.03, 1.3, 0, 0.02, 0], [0.9, 0.03, 0.7, 0.9, 0.02, 0.5]])
    : season.snow ? boxes([[1.9, 0.08, 1.9, 0, 0.04, 0], [1.1, 0.06, 1.1, 0.7, 0.03, 0.7]])
      : boxes([[0.6, 0.04, 0.45, 0, 0.03, 0], [0.45, 0.04, 0.55, 0.6, 0.03, 0.4], [0.4, 0.04, 0.4, -0.5, 0.03, -0.45], [0.35, 0.04, 0.3, 0.3, 0.03, -0.6]]);
  instanced(root, coverGeo, '#ffffff', cover, (t) => pick(season.cover, t.c));
  if (flowers.length) instanced(root, boxes([[0.08, 0.35, 0.08, 0, 0.17, 0], [0.26, 0.2, 0.26, 0, 0.42, 0]]), '#ffffff', flowers, (t) => pick(season.flowers, t.c));
  if (grass.length) instanced(root, boxes([[0.1, 0.5, 0.1, 0, 0.25, 0], [0.1, 0.38, 0.1, 0.18, 0.19, 0.08], [0.1, 0.42, 0.1, -0.15, 0.21, -0.1]]), '#ffffff', grass, (t) => pick(season.grass, t.c));

  // Lampu jalan di sepanjang jalan setapak (tiap ±34 m), di sisi jalan yang rata.
  const lamps = [];
  segs.forEach(([a, b], si) => {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const side = si % 2 ? 1 : -1;
    const nx = -(b.z - a.z) / (len || 1); const nz = (b.x - a.x) / (len || 1);
    for (let d = 17; d < len - 8; d += 34) {
      const t = d / len;
      const x = a.x + (b.x - a.x) * t + nx * 2.3 * side; const z = a.z + (b.z - a.z) * t + nz * 2.3 * side;
      if (Math.hypot(x - hub.x, z - hub.z) < 28) continue;
      const sf = ground(x, z);
      if (sf.water || sf.built) continue;
      lamps.push({ x, y: sf.h, z, s: 1, rot: Math.atan2(nx, nz) + (side > 0 ? Math.PI : 0), c: 0 });
    }
  });
  instanced(root, boxes([[0.16, 2.2, 0.16, 0, 1.1, 0], [0.5, 0.12, 0.5, 0, 0.06, 0], [0.12, 0.1, 0.7, 0, 2.2, 0.3]]), '#7a4a24', lamps, () => '#7a4a24');
  instanced(root, boxes([[0.36, 0.45, 0.36, 0, 1.92, 0.6]]), '#ffd45c', lamps, () => '#ffd45c');
}

/** Gabungkan beberapa kotak [lebar, tinggi, dalam, x, y, z] menjadi satu geometri (untuk tanaman bergaya blok). */
function boxes(list) {
  const parts = list.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  let count = 0; let icount = 0;
  parts.forEach((g) => { count += g.attributes.position.count; icount += g.index.count; });
  const pos = new Float32Array(count * 3); const nor = new Float32Array(count * 3); const idx = new Uint16Array(icount);
  let v = 0; let ii = 0;
  parts.forEach((g) => {
    pos.set(g.attributes.position.array, v * 3);
    nor.set(g.attributes.normal.array, v * 3);
    g.index.array.forEach((n) => { idx[ii] = n + v; ii += 1; });
    v += g.attributes.position.count;
    g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

function instanced(root, geo, base, list, colorOf, { shadow = false } = {}) {
  if (!list.length) return;
  const mesh = new THREE.InstancedMesh(geo, toon(base, { unique: true }), list.length);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  list.forEach((t, i) => {
    q.setFromAxisAngle(up, t.rot);
    m.compose(new THREE.Vector3(t.x, t.y || 0, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(colorOf(t)));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = shadow;
  mesh.receiveShadow = false;
  root.add(mesh);
}

// Jalan setapak: satu geometri gabungan per wilayah (pita datar selebar 2,6 m).
function buildPaths(root, segs) {
  const pos = []; const idx = [];
  const W2 = 1.3;
  segs.forEach(([a, b]) => {
    const dx = b.x - a.x; const dz = b.z - a.z; const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * W2; const nz = (dx / len) * W2;
    // perpanjang sedikit agar sambungan antarsegmen tidak berlubang
    const ex = (dx / len) * W2; const ez = (dz / len) * W2;
    const i = pos.length / 3;
    pos.push(a.x - ex + nx, 0, a.z - ez + nz, a.x - ex - nx, 0, a.z - ez - nz, b.x + ex - nx, 0, b.z + ez - nz, b.x + ex + nx, 0, b.z + ez + nz);
    idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = toon('#e6c98f', { unique: true });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.012;
  mesh.receiveShadow = true;
  root.add(mesh);
}
