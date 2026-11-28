/*
 * NUTRANTARA — Kampung di dunia 3D (sejak 1.6): warga NPC, tungku Dapur Lapangan, dan titik bahan pangan lokal.
 * Posisi: warga & tungku di desa pusat tiap wilayah pos (area rata r 30 m) atau titik tetap di pulau kecil;
 * titik bahan di desa pusat dan di kampung budaya (area rata yang tersambung jalan setapak). Semua deterministik.
 * Isi tas, quest, dan jeda tumbuh dikelola window.NutraKampung (kampung.js); berkas ini hanya tampilan & jangkauan.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { createExplorer, createLabel, toon, PALETTE } from './characters.js';
import { applyOutfit } from './fashion.js';
import { createCorn, createTempe } from './culture.js';

const K = () => window.NutraKampung || null;
const DATA = () => window.NUTRANTARA_KAMPUNG;
// Titik bahan di Alun-alun (meter dari pusat), dipilih di area yang lapang.
const PLAZA_NODES = [[-19, -3], [-8, 11], [20, -8]];

function itemModel(item) {
  const it = DATA().ITEMS[item];
  const c = it ? it.color : '#f5b72b';
  const kind = it ? it.model : 'ball';
  let m;
  if (kind === 'corn') { m = createCorn(0.7); m.rotation.z = 1.2; }
  else if (kind === 'tempe') m = createTempe(0.7);
  else if (kind === 'egg') { m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), toon(c)); m.scale.y = 1.3; }
  else if (kind === 'leaf') { m = new THREE.Group(); for (let i = 0; i < 6; i += 1) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), toon(c)); lf.scale.set(1, 0.3, 0.6); lf.position.set(Math.cos(i) * 0.18, i * 0.05, Math.sin(i) * 0.18); m.add(lf); } }
  else if (kind === 'tuber') { m = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 4, 8), toon(c)); m.rotation.z = 1.4; }
  else if (kind === 'banana') { m = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 6, 12, Math.PI * 0.8), toon(c)); m.rotation.z = 0.6; }
  else if (kind === 'fish') {
    m = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), toon(c)); body.scale.set(1.6, 0.8, 0.6);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 4), toon(c)); tail.rotation.z = Math.PI / 2; tail.position.x = -0.38;
    m.add(body, tail);
  } else if (kind === 'sack') {
    m = new THREE.Group();
    const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.4, 10), toon('#c8a46e'));
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6), toon(c)); top.position.y = 0.22; top.scale.y = 0.5;
    m.add(sack, top);
  } else m = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), toon(c));
  return m;
}

function buildKitchenModel() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.55, 10), toon('#8f857a'));
  base.position.y = 0.28;
  g.add(base);
  for (let i = 0; i < 5; i += 1) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), toon('#7a4a24'));
    log.rotation.z = Math.PI / 2; log.rotation.y = (i / 5) * Math.PI;
    log.position.set(0, 0.62, 0);
    g.add(log);
  }
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 8), toon('#ff8a1f', { emissive: '#ff6a00', emissiveIntensity: 0.9, unique: true }));
  fire.position.y = 0.8;
  g.add(fire);
  const wok = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#2c2c2c', { side: THREE.DoubleSide }));
  wok.position.y = 1.32;
  g.add(wok);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), toon('#e8a317'));
  soup.rotation.x = -Math.PI / 2; soup.position.y = 1.18;
  g.add(soup);
  // Rak bumbu & meja kecil
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.6), toon('#c79a63'));
  table.position.set(1.5, 0.8, 0);
  g.add(table);
  [[-1.0, 0.4], [2.0, 0.4]].forEach(([x]) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.5), toon('#7a4a24')); leg.position.set(x + (x < 0 ? 2.0 : 0), 0.4, 0); g.add(leg); });
  ['#f2c94c', '#3fa95c', '#e2553f'].forEach((c, i) => { const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 8), toon(c)); jar.position.set(1.15 + i * 0.32, 0.96, 0); g.add(jar); });
  const steam = [0, 1, 2].map((i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }));
    s.userData.k = i / 3;
    g.add(s);
    return s;
  });
  const label = createLabel('🍳 DAPUR LAPANGAN', { color: '#7a3f1c', bg: 'rgba(255,244,220,.95)', size: 26, scale: 0.012 });
  label.position.y = 2.6;
  g.add(label);
  g.userData = { fire, steam };
  return g;
}

export function createKampung({ scene, W, frame, groundAt, spots, avoid = [] }) {
  const D = DATA();
  const targets = []; // { kind: 'npc'|'kitchen'|'node', id, x, z, r, obj, ... }
  const taken = []; // titik yang sudah dipakai, agar benda kampung tidak bertumpuk
  // Geser titik sedikit bila terlalu dekat dengan objek misi atau benda kampung lain.
  function settle(x, z, minD = 3.2) {
    let px = x; let pz = z;
    for (let k = 0; k < 12; k += 1) {
      const near = [...avoid, ...taken].find((p) => Math.hypot(p.x - px, p.z - pz) < minD);
      if (!near) break;
      const dx = px - near.x; const dz = pz - near.z; const d = Math.hypot(dx, dz) || 1;
      px += (dx / d) * (minD - d + 0.6); pz += (dz / d) * (minD - d + 0.6);
    }
    taken.push({ x: px, z: pz });
    return { x: px, z: pz };
  }
  const hubOf = (island) => (spots && spots[island] && spots[island].hub) || (() => { const f = frame(island); return { x: f.x, z: f.z - 8 }; })();
  const anchor = (island, post, at, postOffset) => {
    if (post) { const h = hubOf(island); return settle(h.x + postOffset[0], h.z + postOffset[1]); }
    const f = frame(island);
    return settle(f.x + at[0], f.z + at[1]);
  };

  // ---- Warga ----
  Object.entries(D.NPCS).forEach(([id, n]) => {
    const p = anchor(n.island, n.post, n.at || [0, 0], [14, -16]);
    const obj = createExplorer(n.color);
    applyOutfit(obj, n.wear || {});
    obj.position.set(p.x, groundAt(p.x, p.z), p.z);
    const name = createLabel(`${n.name} · ${n.role}`, { color: '#fff4dc', bg: 'rgba(122,63,28,.88)', size: 22, scale: 0.0105 });
    name.position.y = 2.55;
    obj.add(name);
    obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(obj);
    targets.push({ kind: 'npc', id, x: p.x, z: p.z, r: 2.6, obj, marker: null, markText: '', face: 0 });
  });

  // ---- Dapur Lapangan ----
  D.KITCHENS.forEach((k, i) => {
    const p = anchor(k.island, k.post, k.at || [0, 0], [-14, -16]);
    const obj = buildKitchenModel();
    obj.position.set(p.x, groundAt(p.x, p.z), p.z);
    scene.add(obj);
    targets.push({ kind: 'kitchen', id: `dapur-${i}`, x: p.x, z: p.z, r: 2.8, obj });
  });

  // ---- Titik bahan ----
  Object.entries(D.NODES).forEach(([islandKey, list]) => {
    const island = Number(islandKey);
    const f = frame(island);
    if (!f) return;
    let pts = [];
    if (island === 0) pts = PLAZA_NODES.map(([x, z]) => ({ x: f.x + x, z: f.z + z }));
    else if (W.isPost(island)) {
      const h = hubOf(island);
      pts.push({ x: h.x - 22, z: h.z + 6 }, { x: h.x + 22, z: h.z + 6 });
      const camps = (spots && spots[island] && spots[island].camps) || [];
      camps.forEach((c) => {
        const dx = h.x - c.x; const dz = h.z - c.z; const d = Math.hypot(dx, dz) || 1;
        const ux = dx / d; const uz = dz / d;
        pts.push({ x: c.x + ux * 7 - uz * 5, z: c.z + uz * 7 + ux * 5 }, { x: c.x + ux * 7 + uz * 5, z: c.z + uz * 7 - ux * 5 });
      });
      for (let k = pts.length; k < list.length; k += 1) { const a = (k / list.length) * Math.PI * 2; pts.push({ x: h.x + Math.cos(a) * 18, z: h.z + Math.sin(a) * 18 }); }
    } else {
      const n = list.length;
      for (let k = 0; k < n; k += 1) { const a = (k / n) * Math.PI * 2 + 0.6; pts.push({ x: f.x + Math.cos(a) * f.rx * 0.55, z: f.z + Math.sin(a) * f.rz * 0.55 }); }
    }
    list.forEach((item, k) => {
      const p = settle(pts[k].x, pts[k].z, 2.4);
      const g = new THREE.Group();
      const model = itemModel(item);
      model.position.y = 0.9;
      g.add(model);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 24), new THREE.MeshBasicMaterial({ color: '#78f4bd', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
      g.add(ring);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.35, 6), toon('#4caf6e'));
      leaf.position.y = 0.18;
      g.add(leaf);
      g.position.set(p.x, groundAt(p.x, p.z), p.z);
      scene.add(g);
      targets.push({ kind: 'node', id: `${island}:${k}`, item, island, x: p.x, z: p.z, r: 1.7, obj: g, model, ring });
    });
  });

  function refreshMarkers() {
    const k = K();
    targets.forEach((t) => {
      if (t.kind === 'node') { t.obj.visible = !k || k.nodeReady(t.id); return; }
      if (t.kind !== 'npc') return;
      const m = k ? k.marker(t.id) : '';
      if (m === t.markText) return;
      if (t.marker) t.obj.remove(t.marker);
      t.marker = null;
      t.markText = m;
      if (!m) return;
      t.marker = createLabel(m, { color: m === '?' ? '#0f7a4a' : '#7a3f1c', bg: m === '!' ? 'rgba(245,183,43,.95)' : 'rgba(255,250,240,.95)', size: 40, scale: 0.016 });
      t.marker.position.y = 3.25;
      t.obj.add(t.marker);
    });
  }
  document.addEventListener('nutra:kampung', refreshMarkers);
  refreshMarkers();

  let t = 0; let lastRefresh = 0;
  return {
    targets,
    /** Objek kampung terdekat dalam jangkauan (titik bahan yang belum tumbuh diabaikan). */
    nearest(x, z) {
      let best = null; let bestD = Infinity;
      targets.forEach((it) => {
        if (it.kind === 'node' && !it.obj.visible) return;
        const d = Math.hypot(it.x - x, it.z - z);
        if (d < it.r && d < bestD) { bestD = d; best = it; }
      });
      return best;
    },
    update(dt, self) {
      t += dt;
      if (t - lastRefresh > 2) { lastRefresh = t; refreshMarkers(); } // titik bahan tumbuh lagi seiring waktu
      targets.forEach((it, i) => {
        if (it.kind === 'node' && it.obj.visible) {
          it.model.rotation.y += dt * 1.2;
          it.model.position.y = 0.9 + Math.sin(t * 2.4 + i) * 0.1;
          it.ring.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.08);
        } else if (it.kind === 'npc') {
          const near = Math.hypot(self.x - it.x, self.z - it.z) < 9;
          const want = near ? Math.atan2(self.x - it.x, self.z - it.z) : it.face;
          let d = want - it.obj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
          it.obj.rotation.y += d * Math.min(1, dt * 4);
          it.obj.userData.animate(dt, { speed: 0 });
          if (it.marker) it.marker.position.y = 3.25 + Math.sin(t * 3 + i) * 0.1;
        } else if (it.kind === 'kitchen') {
          const u = it.obj.userData;
          u.fire.scale.y = 1 + Math.sin(t * 9 + i) * 0.15;
          u.steam.forEach((s) => { const k = (t * 0.5 + s.userData.k) % 1; s.position.set(Math.sin(k * 6 + i) * 0.15, 1.4 + k * 1.4, 0); s.material.opacity = 0.5 * (1 - k); s.scale.setScalar(0.6 + k); });
        }
      });
    },
    /** Teks petunjuk & label tombol aksi untuk objek terdekat. */
    hint(it) { const k = K(); return k ? k.hint(it) : { text: '', button: 'Aksi' }; },
    activate(it) { const k = K(); if (k) k.activate(it); }
  };
}
