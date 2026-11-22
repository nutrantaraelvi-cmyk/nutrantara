/*
 * Isi wilayah dunia terbuka tiap pos (sejak 0.9): wilayah ±1000 × 650 m berisi desa pusat, jalan setapak ke tiap
 * objek misi dan jembatan, hutan berkelompok, semak, batu, bunga, rumput, kolam, bukit terasering yang bisa didaki,
 * dan kampung budaya. Semua deterministik (benih per pos), jadi tiap siswa melihat wilayah yang sama.
 * Vegetasi memakai InstancedMesh per pos agar ringan: wilayah di luar jarak pandang tidak digambar.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { toon, createLabel } from './characters.js';
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

/**
 * Bangun isi semua wilayah pos.
 * ctx: { scene, W, frame, toX, toZ, items (objek misi quest.js), platforms, shardSpots, animated, gfx }
 */
export function buildRegions(ctx) {
  const { W } = ctx;
  W.islands.filter((i) => W.isPost(i.id)).forEach((isl) => buildRegion(ctx, isl.id));
}

function buildRegion(ctx, id) {
  const { scene, W, frame, toX, toZ, items, platforms, shardSpots, animated, gfx } = ctx;
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
  const scatter = (count, { grove = 0, spread = 18, pad = 0 } = {}) => {
    const out = [];
    for (let i = 0; i < count; i += 1) {
      for (let tries = 0; tries < 6; tries += 1) {
        let x; let z;
        if (rand() < grove) {
          const g = groves[Math.floor(rand() * groves.length)];
          const a = rand() * Math.PI * 2; const r = Math.sqrt(-2 * Math.log(1 - rand() * 0.999)) * spread;
          x = g.x + Math.cos(a) * r; z = g.z + Math.sin(a) * r;
        } else { const p = randomPoint(6); x = p.x; z = p.z; }
        if (!blocked(x, z, pad)) { out.push({ x, z, s: 0.75 + rand() * 0.6, rot: rand() * Math.PI * 2, c: rand() }); break; }
      }
    }
    return out;
  };
  const n = (hi, lo) => (high ? hi : lo);
  const trees = scatter(n(520, 220), { grove: 0.75, pad: 1 });
  const pines = scatter(n(170, 70), { grove: 0.5, spread: 12, pad: 1 });
  const bushes = scatter(n(380, 150), { grove: 0.4, spread: 24 });
  const rocks = scatter(n(90, 40));
  const flowers = high ? scatter(520, { grove: 0.2, spread: 30 }) : [];
  const grass = high ? scatter(900) : [];

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6).translate(0, 1.1, 0);
  instanced(root, trunkGeo, '#8a5f37', [...trees, ...pines], () => '#8a5f37', { shadow: high });
  instanced(root, new THREE.IcosahedronGeometry(1.6, 0).translate(0, 3.1, 0), '#ffffff', trees, (t) => (t.c < 0.33 ? '#3f9a5a' : t.c < 0.66 ? '#4fb56a' : '#68c26a'), { shadow: high });
  instanced(root, new THREE.ConeGeometry(1.4, 3.8, 7).translate(0, 3.4, 0), '#ffffff', pines, (t) => (t.c < 0.5 ? '#2f8a4c' : '#3b9a58'), { shadow: high });
  instanced(root, new THREE.IcosahedronGeometry(0.8, 0).scale(1, 0.7, 1).translate(0, 0.45, 0), '#ffffff', bushes, (t) => (t.c < 0.5 ? '#4caf6e' : '#5fbf63'));
  instanced(root, new THREE.DodecahedronGeometry(0.7, 0).translate(0, 0.25, 0), '#ffffff', rocks, (t) => (t.c < 0.5 ? '#94857a' : '#7d6a5a'));
  if (flowers.length) instanced(root, new THREE.SphereGeometry(0.15, 6, 4).translate(0, 0.32, 0), '#ffffff', flowers, (t) => ['#ff9f91', '#ffd17c', '#ffffff', '#f59e5b', '#f472b6'][Math.floor(t.c * 5)]);
  if (grass.length) instanced(root, new THREE.ConeGeometry(0.14, 0.6, 3).translate(0, 0.3, 0), '#ffffff', grass, (t) => (t.c < 0.5 ? '#5cb860' : '#7cc65a'));
}

function instanced(root, geo, base, list, colorOf, { shadow = false } = {}) {
  if (!list.length) return;
  const mesh = new THREE.InstancedMesh(geo, toon(base, { unique: true }), list.length);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  list.forEach((t, i) => {
    q.setFromAxisAngle(up, t.rot);
    m.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
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
