/*
 * Ornamen budaya Nusantara (low-poly prosedural) untuk dunia, lobi, dan landing page NUTRANTARA.
 * Bentuk disederhanakan agar ringan dan ramah anak; diambil dari budaya populer Indonesia.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { toon } from './characters.js';

const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };

/** Tekstur batik kawung (empat elips mengelilingi titik). */
export function kawungTexture(bg = '#f6e3b8', ink = '#9a5b2e', repeat = 4) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 4;
  const kawung = (x, y) => {
    [[0, -16, 10, 15], [0, 16, 10, 15], [-16, 0, 15, 10], [16, 0, 15, 10]].forEach(([dx, dy, rx, ry]) => { g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, 0, 0, Math.PI * 2); g.stroke(); });
    g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
  };
  kawung(32, 32); kawung(96, 32); kawung(32, 96); kawung(96, 96); kawung(64, 64); kawung(0, 64); kawung(128, 64); kawung(64, 0); kawung(64, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Candi bentar: gerbang terbelah khas Bali, bata merah bertingkat dengan puncak batu. */
export function createCandiBentar(scale = 1) {
  const g = new THREE.Group();
  const brick = toon('#c0573a'); const stone = toon('#d9cfbf'); const dark = toon('#7a3424');
  [-1, 1].forEach((side) => {
    const half = new THREE.Group();
    let y = 0;
    [[1.6, 0.7, 1.3, brick], [1.4, 0.25, 1.15, stone], [1.3, 0.9, 1.0, brick], [1.1, 0.2, 0.9, stone], [1.0, 0.7, 0.8, brick], [0.8, 0.2, 0.65, stone], [0.65, 0.6, 0.5, brick], [0.45, 0.2, 0.38, stone], [0.3, 0.5, 0.25, dark]].forEach(([w, h, d, m]) => {
      half.add(mesh(new THREE.BoxGeometry(w, h, d), m, side * (w / 2 - 0.05) * 0.15, y + h / 2, 0));
      y += h;
    });
    half.add(mesh(new THREE.ConeGeometry(0.14, 0.4, 6), stone, 0, y + 0.2, 0));
    half.position.x = side * 1.15;
    g.add(half);
  });
  // Tangga
  for (let i = 0; i < 3; i += 1) g.add(mesh(new THREE.BoxGeometry(1.4, 0.12, 0.35), stone, 0, 0.06 + i * 0.12, 0.9 - i * 0.3));
  g.scale.setScalar(scale);
  return g;
}

/** Meru: pagoda bertingkat ganjil beratap ijuk hitam (pura Bali). */
export function createMeru(tiers = 7, scale = 1) {
  const g = new THREE.Group();
  const base = toon('#c9b79c'); const wood = toon('#8a5a35'); const ijuk = toon('#2e2a26'); const gold = toon('#f5b72b', { emissive: '#c98a1a', emissiveIntensity: 0.3 });
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.5, 2.2), base, 0, 0.25, 0));
  g.add(mesh(new THREE.BoxGeometry(1.3, 0.9, 1.3), wood, 0, 0.95, 0));
  let y = 1.45;
  for (let i = 0; i < tiers; i += 1) {
    const w = 2.1 - i * (1.5 / tiers);
    const roof = mesh(new THREE.ConeGeometry(w * 0.75, 0.38, 4), ijuk, 0, y, 0);
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    g.add(mesh(new THREE.BoxGeometry(w * 0.45, 0.16, w * 0.45), wood, 0, y + 0.24, 0));
    y += 0.36;
  }
  g.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), gold, 0, y + 0.05, 0));
  g.scale.setScalar(scale);
  return g;
}

/** Penjor: bambu melengkung dengan hiasan janur, khas hari raya Bali. */
export function createPenjor(scale = 1) {
  const g = new THREE.Group();
  const bamboo = toon('#c9a15a'); const janur = toon('#e9df7a', { side: THREE.DoubleSide }); const red = toon('#e2553f');
  const pts = [];
  for (let i = 0; i <= 10; i += 1) { const t = i / 10; pts.push(new THREE.Vector3(Math.sin(t * 1.4) * t * 1.6, t * 4.6, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(mesh(new THREE.TubeGeometry(curve, 20, 0.07, 6), bamboo));
  for (let i = 3; i <= 10; i += 1) {
    const p = curve.getPoint(i / 10);
    const strip = mesh(new THREE.PlaneGeometry(0.12, 0.6), janur, p.x, p.y - 0.3, 0.06);
    strip.rotation.z = (i % 2 ? 0.2 : -0.2);
    g.add(strip);
  }
  const tip = curve.getPoint(1);
  g.add(mesh(new THREE.ConeGeometry(0.18, 0.5, 6), janur, tip.x, tip.y - 0.35, 0));
  g.add(mesh(new THREE.SphereGeometry(0.1, 6, 4), red, tip.x, tip.y - 0.65, 0));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), toon('#d9b07a'), 0, 0.25, 0)); // sanggah kecil
  g.scale.setScalar(scale);
  return g;
}

/** Layang-layang belah ketupat dengan ekor berkibar. */
export function createKite(color = '#e2553f', accent = '#f5b72b') {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 1); shape.lineTo(0.7, 0); shape.lineTo(0, -1.2); shape.lineTo(-0.7, 0); shape.closePath();
  const body = mesh(new THREE.ShapeGeometry(shape), toon(color, { side: THREE.DoubleSide }));
  g.add(body);
  const stripe = mesh(new THREE.PlaneGeometry(1.3, 0.14), toon(accent, { side: THREE.DoubleSide }), 0, 0, 0.01);
  g.add(stripe);
  const tail = [];
  for (let i = 0; i < 6; i += 1) { const bow = mesh(new THREE.BoxGeometry(0.22, 0.08, 0.02), toon(i % 2 ? accent : color), 0, -1.35 - i * 0.32, 0); g.add(bow); tail.push(bow); }
  g.userData.tail = tail;
  return g;
}

/** Perahu pinisi dengan dua tiang dan layar putih. */
export function createPinisi(scale = 1) {
  const g = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3, 0.6); hullShape.quadraticCurveTo(-2.6, -0.4, -1.5, -0.6); hullShape.lineTo(1.8, -0.6); hullShape.quadraticCurveTo(3, -0.3, 3.4, 0.9); hullShape.lineTo(-3, 0.6);
  const hull = mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 1.4, bevelEnabled: false }), toon('#8a4b22'));
  hull.position.z = -0.7;
  g.add(hull);
  g.add(mesh(new THREE.BoxGeometry(5.6, 0.1, 1.3), toon('#c98a4b'), 0.1, 0.62, 0));
  g.add(mesh(new THREE.BoxGeometry(6.2, 0.14, 0.08), toon('#f5f0e1'), 0.2, 0.3, 0.7));
  const sail = toon('#fbf7ec', { side: THREE.DoubleSide });
  [[-0.9, 3.4], [1.1, 3.0]].forEach(([x, h]) => {
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, h + 0.6, 6), toon('#6b3e1e'), x, 0.6 + (h + 0.6) / 2, 0));
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.5, 0.2); s.lineTo(0.2, h - 0.2); s.closePath();
    const sm = mesh(new THREE.ShapeGeometry(s), sail, x + 0.05, 0.9, 0);
    g.add(sm);
  });
  const jib = new THREE.Shape(); jib.moveTo(0, 0); jib.lineTo(2.2, 0); jib.lineTo(0, 2.4); jib.closePath();
  g.add(mesh(new THREE.ShapeGeometry(jib), sail, 1.2, 0.9, 0.02));
  g.add(mesh(new THREE.ConeGeometry(0.12, 0.4, 4), toon('#e2553f'), -0.9, 4.75, 0));
  g.scale.setScalar(scale);
  return g;
}

/** Stupa lonceng ala Borobudur. */
export function createStupa(scale = 1) {
  const g = new THREE.Group();
  const stone = toon('#a49a8b');
  const profile = [[0, 0], [0.9, 0], [0.95, 0.15], [0.85, 0.25], [0.88, 0.55], [0.78, 0.95], [0.55, 1.25], [0.28, 1.4], [0.2, 1.5], [0.24, 1.6], [0.16, 1.7], [0.08, 2.2], [0, 2.3]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(mesh(new THREE.LatheGeometry(profile, 14), stone));
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.15, 0.2, 8), toon('#8f8576'), 0, -0.1, 0));
  g.scale.setScalar(scale);
  return g;
}

/** Rumah gadang Minangkabau: atap gonjong melengkung runcing. */
export function createRumahGadang(scale = 1) {
  const g = new THREE.Group();
  const wood = toon('#8a4b22'); const carve = toon('#c0573a'); const roof = toon('#3a3029');
  for (let i = 0; i < 4; i += 1) for (let k = 0; k < 2; k += 1) g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 6), wood, -1.5 + i, 0.45, -0.6 + k * 1.2));
  g.add(mesh(new THREE.BoxGeometry(3.6, 1.3, 1.7), carve, 0, 1.55, 0));
  // pola ukiran: pita emas
  g.add(mesh(new THREE.BoxGeometry(3.65, 0.14, 1.75), toon('#f5b72b'), 0, 1.6, 0));
  const s = new THREE.Shape();
  s.moveTo(-2.6, 2.4); s.quadraticCurveTo(-1.6, 0.4, 0, 0.6); s.quadraticCurveTo(1.6, 0.4, 2.6, 2.4); s.lineTo(2.3, 1.8); s.quadraticCurveTo(1.5, 0, 0, 0); s.quadraticCurveTo(-1.5, 0, -2.3, 1.8); s.closePath();
  const r = mesh(new THREE.ExtrudeGeometry(s, { depth: 2.1, bevelEnabled: false }), roof, 0, 2.15, -1.05);
  g.add(r);
  // gonjong tengah
  const s2 = new THREE.Shape(); s2.moveTo(-1.2, 1.4); s2.quadraticCurveTo(-0.6, 0.2, 0, 0.3); s2.quadraticCurveTo(0.6, 0.2, 1.2, 1.4); s2.lineTo(1, 1); s2.quadraticCurveTo(0.5, 0, 0, 0); s2.quadraticCurveTo(-0.5, 0, -1, 1); s2.closePath();
  const r2 = mesh(new THREE.ExtrudeGeometry(s2, { depth: 0.9, bevelEnabled: false }), roof, 0, 2.55, 0.15);
  r2.rotation.y = Math.PI / 2;
  g.add(r2);
  g.scale.setScalar(scale);
  return g;
}

/** Gunungan wayang kulit (kayon) pada kelir dengan cahaya blencong. */
export function createGunungan(scale = 1) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 2.4); s.quadraticCurveTo(0.9, 1.6, 1.0, 0.6); s.lineTo(0.7, 0.2); s.lineTo(0.9, 0); s.lineTo(-0.9, 0); s.lineTo(-0.7, 0.2); s.lineTo(-1.0, 0.6); s.quadraticCurveTo(-0.9, 1.6, 0, 2.4);
  const leaf = mesh(new THREE.ShapeGeometry(s, 16), toon('#7a3f1c', { side: THREE.DoubleSide }));
  g.add(leaf);
  const inner = new THREE.Shape(); inner.moveTo(0, 2.0); inner.quadraticCurveTo(0.65, 1.4, 0.7, 0.7); inner.lineTo(-0.7, 0.7); inner.quadraticCurveTo(-0.65, 1.4, 0, 2.0);
  g.add(mesh(new THREE.ShapeGeometry(inner, 12), toon('#e2553f', { side: THREE.DoubleSide }), 0, 0, 0.01));
  g.add(mesh(new THREE.CircleGeometry(0.22, 12), toon('#f5b72b', { side: THREE.DoubleSide }), 0, 1.35, 0.02));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5), toon('#c9a15a'), 0, -0.35, 0));
  g.scale.setScalar(scale);
  return g;
}

/** Gong gamelan pada rangka kayu berukir. */
export function createGong(scale = 1) {
  const g = new THREE.Group();
  const wood = toon('#8a4b22'); const red = toon('#c0573a');
  [-0.9, 0.9].forEach((x) => g.add(mesh(new THREE.BoxGeometry(0.18, 2.2, 0.25), wood, x, 1.1, 0)));
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.25, 0.3), red, 0, 2.2, 0));
  g.add(mesh(new THREE.ConeGeometry(0.4, 0.35, 4), red, -1, 2.45, 0));
  g.add(mesh(new THREE.ConeGeometry(0.4, 0.35, 4), red, 1, 2.45, 0));
  const disc = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 24), toon('#d9a72a', { emissive: '#8a6a10', emissiveIntensity: 0.25 }), 0, 1.25, 0);
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  const boss = mesh(new THREE.SphereGeometry(0.18, 10, 8), toon('#f5c94a'), 0, 1.25, 0.1);
  g.add(boss);
  g.userData.disc = disc;
  g.scale.setScalar(scale);
  return g;
}

/** Ondel-ondel Betawi: boneka raksasa ceria (merah = laki-laki, putih = perempuan). */
export function createOndelOndel(face = '#d9442b', scale = 1) {
  const g = new THREE.Group();
  const skirt = new THREE.MeshToonMaterial({ map: kawungTexture(face === '#d9442b' ? '#2b4c7e' : '#2fa36b', '#f5e6c0', 2) });
  g.add(mesh(new THREE.CylinderGeometry(0.45, 0.75, 1.8, 12), skirt, 0, 0.9, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.6, 12), toon('#f5b72b'), 0, 2.05, 0));
  g.add(mesh(new THREE.SphereGeometry(0.45, 14, 10), toon(face), 0, 2.75, 0));
  const eyeW = toon('#ffffff'); const eyeB = toon('#1b1b1b');
  [-0.16, 0.16].forEach((x) => { g.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeW, x, 2.85, 0.38)); g.add(mesh(new THREE.SphereGeometry(0.045, 6, 4), eyeB, x, 2.85, 0.46)); });
  const mouth = mesh(new THREE.TorusGeometry(0.12, 0.03, 4, 10, Math.PI), eyeB, 0, 2.62, 0.4);
  mouth.rotation.z = Math.PI;
  g.add(mouth);
  // Kembang kelapa di kepala
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2;
    const stick = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 4), toon('#2fa36b'), Math.cos(a) * 0.18, 3.4, Math.sin(a) * 0.18);
    stick.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(stick);
    g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), toon(['#f5b72b', '#e2553f', '#ffffff'][i % 3]), Math.cos(a) * 0.36, 3.7, Math.sin(a) * 0.36));
  }
  g.scale.setScalar(scale);
  return g;
}

/** Jagung, tempe, dan pepaya — pangan lokal di sekitar pulau. */
export function createCorn(scale = 1) {
  const g = new THREE.Group();
  const cob = mesh(new THREE.CapsuleGeometry(0.16, 0.6, 4, 10), toon('#f5c518'));
  g.add(cob);
  for (let i = 0; i < 3; i += 1) {
    const husk = mesh(new THREE.ConeGeometry(0.12, 0.9, 4), toon('#7cc46b'), Math.cos(i * 2.1) * 0.12, -0.15, Math.sin(i * 2.1) * 0.12);
    husk.rotation.z = Math.cos(i * 2.1) * 0.4; husk.rotation.x = Math.sin(i * 2.1) * 0.4;
    g.add(husk);
  }
  g.scale.setScalar(scale);
  return g;
}
export function createTempe(scale = 1) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), toon('#f1e2b8')));
  for (let i = 0; i < 10; i += 1) g.add(mesh(new THREE.SphereGeometry(0.05, 5, 4), toon('#d9b77a'), -0.38 + (i % 5) * 0.19, 0.16, -0.15 + Math.floor(i / 5) * 0.3));
  g.scale.setScalar(scale);
  return g;
}
export function createPapaya(scale = 1) {
  const g = new THREE.Group();
  const half = mesh(new THREE.SphereGeometry(0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#f08a3c', { side: THREE.DoubleSide }));
  half.scale.set(1, 0.6, 1.5);
  half.rotation.x = Math.PI;
  g.add(half);
  const flesh = mesh(new THREE.CircleGeometry(0.43, 16), toon('#ff8a3c'), 0, 0.01, 0);
  flesh.rotation.x = -Math.PI / 2; flesh.scale.set(1, 1.5, 1);
  g.add(flesh);
  for (let i = 0; i < 8; i += 1) g.add(mesh(new THREE.SphereGeometry(0.04, 5, 4), toon('#2b2118'), (Math.random() - 0.5) * 0.18, 0.03, (Math.random() - 0.5) * 0.5));
  g.scale.setScalar(scale);
  return g;
}
