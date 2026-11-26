/*
 * Karakter NUTRANTARA (low-poly, gaya kartun/toon). Dipakai bersama oleh game 3D dan landing page.
 *
 * PENJELAJAH PANGAN: anak penjelajah bertopi caping, ransel rantang tiga susun (arsip pangan),
 *   syal bermotif tumpal, dan pemindai gizi bercahaya di pergelangan. Warna rompi & syal = warna pemain.
 * NARA: robot pemandu melayang; visor gelap dengan mata hijau, antena daun padi berujung bulir emas,
 *   lambang berlian "N" di dada, dan cincin hover berwarna cyan.
 */
import * as THREE from './vendor/three/three.module.min.js';

export const PALETTE = {
  deep: '#071516', teal: '#0e2426', green: '#78f4bd', cyan: '#68dce7', gold: '#ffd17c', coral: '#ff9f91',
  skin: '#e9b48a', bamboo: '#e3c27a', white: '#f2fff8', ink: '#13201f', leaf: '#4caf6e'
};

let gradient = null;
function toonGradient() {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 170, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const matCache = new Map();
export function toon(color, { unique, ...opts } = {}) {
  const key = JSON.stringify([String(color), opts.emissive, opts.emissiveIntensity, opts.opacity, opts.side]);
  if (!unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color: colorFrom(color), gradientMap: toonGradient(), ...opts });
  if (!unique) matCache.set(key, m);
  return m;
}

/** Terima warna hex, nama, THREE.Color, atau "hsl(h s% l%)" (format dari server). */
export function colorFrom(value) {
  if (value instanceof THREE.Color) return value.clone();
  const m = /^hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/i.exec(String(value).trim());
  if (m) return new THREE.Color().setHSL(Number(m[1]) / 360, Number(m[2]) / 100, Number(m[3]) / 100, THREE.SRGBColorSpace);
  return new THREE.Color(value);
}

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Tekstur syal bermotif tumpal (segitiga khas kain Nusantara).
function tumpalTexture(base, accent) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 16);
  g.fillStyle = accent;
  for (let x = 0; x < 64; x += 8) { g.beginPath(); g.moveTo(x, 16); g.lineTo(x + 4, 4); g.lineTo(x + 8, 16); g.fill(); }
  g.fillRect(0, 0, 64, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Penjelajah Pangan. color = warna khas pemain (rompi, syal, rantang tengah). */
export function createExplorer(color = PALETTE.cyan) {
  const root = new THREE.Group();
  root.name = 'explorer';
  const body = new THREE.Group();
  root.add(body);

  const accent = colorFrom(color);
  const accentMat = toon(accent, { unique: true });
  const skin = toon(PALETTE.skin);
  const ink = toon(PALETTE.ink);
  const white = toon(PALETTE.white);
  const shorts = toon('#1f4b4a');
  const shoe = toon(PALETTE.gold);

  // Kaki
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.22, 4, 8);
  const legL = new THREE.Group(); const legR = new THREE.Group();
  legL.position.set(-0.15, 0.42, 0); legR.position.set(0.15, 0.42, 0);
  legL.add(mesh(legGeo, skin, 0, -0.2, 0)); legR.add(mesh(legGeo, skin, 0, -0.2, 0));
  const shoeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.3);
  legL.add(mesh(shoeGeo, shoe, 0, -0.38, 0.04)); legR.add(mesh(shoeGeo, shoe, 0, -0.38, 0.04));
  body.add(legL, legR);

  // Badan: kaus putih, celana, rompi warna pemain
  body.add(mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 10), shorts, 0, 0.5, 0));
  body.add(mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.42, 10), white, 0, 0.78, 0));
  const vest = mesh(new THREE.CylinderGeometry(0.29, 0.33, 0.36, 10, 1, true, -Math.PI * 0.42, Math.PI * 1.84), accentMat, 0, 0.8, 0);
  vest.material.side = THREE.DoubleSide;
  body.add(vest);
  // Saku rompi
  body.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 0.04), toon(PALETTE.gold), -0.16, 0.74, 0.29));

  // Lengan + pemindai gizi
  const armGeo = new THREE.CapsuleGeometry(0.075, 0.26, 4, 8);
  const armL = new THREE.Group(); const armR = new THREE.Group();
  armL.position.set(-0.36, 0.95, 0); armR.position.set(0.36, 0.95, 0);
  armL.add(mesh(armGeo, white, 0, -0.18, 0)); armR.add(mesh(armGeo, white, 0, -0.18, 0));
  armL.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), skin, 0, -0.38, 0));
  armR.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), skin, 0, -0.38, 0));
  const scanner = mesh(new THREE.BoxGeometry(0.13, 0.08, 0.12), toon(PALETTE.cyan, { emissive: PALETTE.cyan, emissiveIntensity: 0.9 }), 0, -0.28, 0.02);
  armR.add(scanner);
  body.add(armL, armR);

  // Syal tumpal
  const scarf = mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 14), new THREE.MeshToonMaterial({ map: tumpalTexture(`#${accent.getHexString()}`, PALETTE.gold), gradientMap: toonGradient() }), 0, 1.02, 0);
  scarf.rotation.x = Math.PI / 2;
  const tail = mesh(new THREE.BoxGeometry(0.1, 0.24, 0.04), scarf.material, 0.14, 0.9, -0.2);
  tail.rotation.z = -0.3;
  // Slot busana (Butik Nusantara, fashion.js): isi bawaan bisa diganti barang lain.
  const neckSlot = new THREE.Group();
  neckSlot.add(scarf, tail);
  body.add(neckSlot);

  // Kepala
  const head = new THREE.Group();
  head.position.set(0, 1.42, 0);
  head.add(mesh(new THREE.SphereGeometry(0.4, 16, 12), skin));
  head.add(mesh(new THREE.SphereGeometry(0.41, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), ink, 0, 0.02, -0.01)); // rambut
  const eyeGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const eyeL = mesh(eyeGeo, ink, -0.14, 0.02, 0.36); const eyeR = mesh(eyeGeo, ink, 0.14, 0.02, 0.36);
  eyeL.scale.y = eyeR.scale.y = 1.35;
  head.add(eyeL, eyeR);
  const shine = new THREE.SphereGeometry(0.018, 6, 4);
  head.add(mesh(shine, white, -0.125, 0.05, 0.405), mesh(shine, white, 0.155, 0.05, 0.405));
  const blush = toon(PALETTE.coral);
  const blushGeo = new THREE.CircleGeometry(0.06, 10);
  const bl = mesh(blushGeo, blush, -0.24, -0.08, 0.31); bl.rotation.y = -0.6;
  const br = mesh(blushGeo, blush, 0.24, -0.08, 0.31); br.rotation.y = 0.6;
  head.add(bl, br);
  const smile = mesh(new THREE.TorusGeometry(0.06, 0.014, 4, 10, Math.PI), ink, 0, -0.1, 0.38);
  smile.rotation.z = Math.PI;
  head.add(smile);

  // Caping (topi bambu kerucut) dengan pita hijau
  const hat = new THREE.Group();
  hat.position.y = 0.3;
  hat.rotation.x = -0.12;
  hat.add(mesh(new THREE.ConeGeometry(0.72, 0.36, 18), toon(PALETTE.bamboo), 0, 0.12, 0));
  hat.add(mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.07, 18), toon(PALETTE.leaf), 0, 0.02, 0));
  hat.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), toon(PALETTE.gold), 0, 0.31, 0));
  const hatSlot = new THREE.Group();
  hatSlot.add(hat);
  head.add(hatSlot);
  body.add(head);

  // Ransel rantang tiga susun
  const pack = new THREE.Group();
  pack.position.set(0, 0.82, -0.36);
  const tierGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12);
  [[PALETTE.coral, 0], [color, 0.15], [PALETTE.green, 0.3]].forEach(([c, y]) => pack.add(mesh(tierGeo, c === color ? accentMat : toon(c), 0, y - 0.12, 0)));
  pack.add(mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 12), toon('#c9d3cf'), 0, 0.27, 0));
  const handle = mesh(new THREE.TorusGeometry(0.13, 0.02, 4, 12, Math.PI), toon('#c9d3cf'), 0, 0.28, 0);
  pack.add(handle);
  const backSlot = new THREE.Group();
  backSlot.add(pack);
  body.add(backSlot);

  // Bayangan bulat (murah, selalu ada)
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  blob.renderOrder = 1;
  root.add(blob);

  // Parasut daun pisang (dipakai saat terjun dari langit)
  const leaf = createLeafGlider();
  leaf.position.y = 2.35;
  leaf.visible = false;
  root.add(leaf);

  let phase = 0;
  let blinkT = 2;
  let emote = null;
  let emoteT = 0;
  let squash = 0;
  const EMOTE_TIME = { wave: 1.8, dance: 2.6, cheer: 1.6, think: 2.2 };
  root.userData = {
    body, head, blob, scanner, accentMat, leaf, vest,
    slots: { kepala: hatSlot, leher: neckSlot, punggung: backSlot },
    /** state: { speed (0..1), airborne, height, pose: 'skydive' | 'glide' | null } */
    animate(dt, state = {}) {
      const speed = state.speed || 0;
      phase += dt * (6 + speed * 8);
      const swing = Math.sin(phase) * 0.7 * speed;
      legL.rotation.set(swing, 0, 0); legR.rotation.set(-swing, 0, 0);
      armL.rotation.set(-swing * 0.8, 0, 0.05); armR.rotation.set(swing * 0.8, 0, -0.05);
      body.rotation.set(0, 0, 0);
      head.rotation.set(0, 0, 0);
      leaf.visible = state.pose === 'glide';
      let bodyY = Math.abs(Math.sin(phase)) * 0.06 * speed + Math.sin(phase * 0.35) * 0.015 * (1 - speed);

      if (state.pose === 'skydive') {
        // Terjun bebas: badan mendatar, tangan & kaki terentang, berkibar.
        body.rotation.x = 1.25;
        armL.rotation.z = -1.45 + Math.sin(phase * 3) * 0.08; armR.rotation.z = 1.45 - Math.sin(phase * 3) * 0.08;
        legL.rotation.set(0.25, 0, -0.35); legR.rotation.set(0.25, 0, 0.35);
        bodyY = 0.6;
      } else if (state.pose === 'glide') {
        // Melayang memegang daun pisang di atas kepala.
        armL.rotation.z = -2.75; armR.rotation.z = 2.75;
        legL.rotation.x = 0.25 + Math.sin(phase * 2) * 0.25; legR.rotation.x = -0.15 - Math.sin(phase * 2) * 0.25;
        leaf.rotation.z = Math.sin(phase * 1.3) * 0.12;
        leaf.rotation.x = Math.cos(phase * 1.1) * 0.1;
        bodyY = 0;
      } else if (state.airborne) {
        legL.rotation.x = -0.6; legR.rotation.x = 0.3; armL.rotation.z = -0.9; armR.rotation.z = 0.9;
        bodyY = 0;
      } else if (emote && speed < 0.2) {
        emoteT -= dt;
        const k = emoteT;
        if (emote === 'wave') { armR.rotation.z = 2.5 + Math.sin(k * 14) * 0.45; head.rotation.z = Math.sin(k * 7) * 0.08; }
        if (emote === 'cheer') { armL.rotation.z = -2.8; armR.rotation.z = 2.8; bodyY = Math.abs(Math.sin(k * 9)) * 0.35; }
        if (emote === 'dance') {
          body.rotation.y = Math.sin(k * 8) * 0.6;
          body.rotation.z = Math.sin(k * 16) * 0.12;
          armL.rotation.z = -1.2 - Math.sin(k * 16) * 0.8; armR.rotation.z = 1.2 - Math.sin(k * 16) * 0.8;
          legL.rotation.x = Math.max(0, Math.sin(k * 16)) * 0.7; legR.rotation.x = Math.max(0, -Math.sin(k * 16)) * 0.7;
          bodyY = Math.abs(Math.sin(k * 16)) * 0.08;
        }
        if (emote === 'think') { armR.rotation.x = -2.0; armR.rotation.z = 0.45; head.rotation.z = 0.2; head.rotation.x = -0.1; }
        if (emoteT <= 0) emote = null;
      } else if (emote && speed >= 0.2) emote = null;

      // Mendarat: tekan-pulih (squash & stretch)
      if (squash > 0) { squash = Math.max(0, squash - dt * 3); const s = Math.sin(squash * Math.PI) * 0.28; body.scale.set(1 + s * 0.6, 1 - s, 1 + s * 0.6); } else body.scale.set(1, 1, 1);
      body.position.y = bodyY;
      blinkT -= dt;
      const blink = blinkT < 0.12;
      eyeL.scale.y = eyeR.scale.y = blink ? 0.2 : 1.35;
      if (blinkT < 0) blinkT = 2 + Math.random() * 3;
      scanner.material.emissiveIntensity = 0.6 + Math.sin(phase * 0.5) * 0.3;
      const h = state.height || 0;
      blob.position.y = 0.02 - h;
      blob.scale.setScalar(Math.max(0.4, 1 - h * 0.15));
      blob.visible = h < 12;
    },
    emote(name) { if (EMOTE_TIME[name]) { emote = name; emoteT = EMOTE_TIME[name]; } },
    land() { squash = 1; },
    get emoting() { return emote; },
    setColor(c) { accentMat.color.copy(colorFrom(c)); }
  };
  return root;
}

/** Daun pisang lebar untuk melayang turun. */
export function createLeafGlider() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.25);
  shape.bezierCurveTo(0.95, -0.8, 1.0, 0.7, 0, 1.3);
  shape.bezierCurveTo(-1.0, 0.7, -0.95, -0.8, 0, -1.25);
  const geo = new THREE.ShapeGeometry(shape, 12);
  // Lengkungkan daun seperti payung
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) { const x = pos.getX(i); pos.setZ(i, -x * x * 0.32); }
  geo.computeVertexNormals();
  const blade = new THREE.Mesh(geo, toon('#4caf50', { side: THREE.DoubleSide }));
  blade.rotation.x = -Math.PI / 2;
  blade.castShadow = true;
  g.add(blade);
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.5), toon('#9ccc65'));
  rib.position.y = 0.02;
  g.add(rib);
  for (let i = -3; i <= 3; i += 1) {
    if (!i) continue;
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.02, 0.03), toon('#81c784'));
    vein.position.set(Math.sign(i) * 0.38, 0.03, i * 0.3);
    vein.rotation.y = Math.sign(i) * 0.35;
    g.add(vein);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), toon('#8d6e63'));
  stem.position.y = -0.4;
  g.add(stem);
  return g;
}

/** Nara, robot pemandu. */
export function createNara() {
  const root = new THREE.Group();
  root.name = 'nara';
  const bodyG = new THREE.Group();
  root.add(bodyG);

  const shell = toon(PALETTE.white);
  bodyG.add(mesh(new THREE.CapsuleGeometry(0.42, 0.42, 6, 16), shell, 0, 1.15, 0));
  // Layar wajah hitam mengilap dengan mata cyan tersenyum (^ ^)
  const face = mesh(new THREE.SphereGeometry(0.3, 18, 12), toon('#121a1e'), 0, 1.38, 0.27);
  face.scale.set(1.18, 0.82, 0.5);
  bodyG.add(face);
  const eyeMat = toon('#5ff3ff', { emissive: '#3fe6f5', emissiveIntensity: 1.4, unique: true });
  const eyeGeo = new THREE.TorusGeometry(0.065, 0.024, 6, 14, Math.PI);
  const eyeL = mesh(eyeGeo, eyeMat, -0.12, 1.36, 0.42); const eyeR = mesh(eyeGeo, eyeMat, 0.12, 1.36, 0.42);
  bodyG.add(eyeL, eyeR);
  // Penutup telinga oranye dengan lingkar cyan
  [-1, 1].forEach((side) => {
    const pod = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 18), toon('#f08a3c'), side * 0.43, 1.38, 0);
    pod.rotation.z = Math.PI / 2;
    bodyG.add(pod);
    const ringEar = mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 16), toon('#3fe6f5', { emissive: '#3fe6f5', emissiveIntensity: 0.8 }), side * 0.49, 1.38, 0);
    ringEar.rotation.y = Math.PI / 2;
    bodyG.add(ringEar);
  });
  // Lambang berlian N
  const emblem = mesh(new THREE.OctahedronGeometry(0.1, 0), toon(PALETTE.green, { emissive: PALETTE.green, emissiveIntensity: 0.8 }), 0, 0.98, 0.42);
  emblem.scale.z = 0.4;
  bodyG.add(emblem);
  // Sabuk cyan
  const belt = mesh(new THREE.TorusGeometry(0.43, 0.035, 6, 24), toon(PALETTE.cyan, { emissive: PALETTE.cyan, emissiveIntensity: 0.5 }), 0, 0.86, 0);
  belt.rotation.x = Math.PI / 2;
  bodyG.add(belt);
  // Tangan melayang
  const handGeo = new THREE.SphereGeometry(0.13, 10, 8);
  const handL = mesh(handGeo, shell, -0.62, 1.0, 0.05); const handR = mesh(handGeo, shell, 0.62, 1.0, 0.05);
  bodyG.add(handL, handR);
  // Antena daun padi dengan bulir emas
  const antenna = new THREE.Group();
  antenna.position.set(0, 1.78, 0);
  antenna.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), toon(PALETTE.leaf), 0, 0.15, 0));
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.18, 0.12, 0, 0.42); leafShape.quadraticCurveTo(-0.18, 0.12, 0, 0);
  const leaf = mesh(new THREE.ShapeGeometry(leafShape), toon(PALETTE.leaf, { side: THREE.DoubleSide }), 0.02, 0.22, 0);
  leaf.rotation.z = -0.7;
  antenna.add(leaf);
  const grain = mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.6, unique: true }), 0, 0.33, 0);
  grain.scale.y = 1.4;
  antenna.add(grain);
  bodyG.add(antenna);
  // Cincin hover
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 28), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.85 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.42;
  root.add(ring);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.18, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.03;
  root.add(glow);

  let t = Math.random() * 10;
  let blinkT = 3;
  let react = null;
  let reactT = 0;
  const eyeColor = eyeMat.color.clone();
  root.userData = {
    animate(dt) {
      t += dt;
      bodyG.position.y = Math.sin(t * 2) * 0.08;
      bodyG.rotation.set(0, 0, 0);
      ring.position.y = 0.42 + Math.sin(t * 2) * 0.04;
      ring.scale.setScalar(1 + Math.sin(t * 4) * 0.04);
      handL.position.y = 1.0 + Math.sin(t * 2 + 1) * 0.06;
      handR.position.y = 1.0 + Math.sin(t * 2 + 2) * 0.06;
      antenna.rotation.z = Math.sin(t * 1.5) * 0.12;
      grain.material.emissiveIntensity = 0.6;
      eyeMat.color.copy(eyeColor);
      eyeMat.emissive.copy(eyeColor);
      if (react) {
        reactT -= dt;
        const k = 1 - Math.max(0, reactT);
        if (react === 'celebrate') {
          // Berputar sambil melompat, tangan terangkat, bulir antena menyala terang.
          bodyG.position.y = Math.abs(Math.sin(k * Math.PI * 3)) * 0.6;
          bodyG.rotation.y = k * Math.PI * 4;
          handL.position.y = handR.position.y = 1.5;
          grain.material.emissiveIntensity = 2;
        } else if (react === 'shake') {
          // Menggeleng pelan dengan mata kuning: "belum tepat, coba lagi".
          bodyG.rotation.y = Math.sin(k * Math.PI * 6) * 0.35;
          eyeMat.color.set(PALETTE.gold);
          eyeMat.emissive.set(PALETTE.gold);
        } else if (react === 'talk') {
          antenna.rotation.z = Math.sin(t * 9) * 0.3;
          grain.material.emissiveIntensity = 1.2 + Math.sin(t * 12) * 0.6;
          handR.position.y = 1.15 + Math.sin(t * 6) * 0.1;
        }
        if (reactT <= 0) react = null;
      }
      blinkT -= dt;
      eyeL.scale.y = eyeR.scale.y = blinkT < 0.12 ? 0.15 : 1;
      if (blinkT < 0) blinkT = 2.5 + Math.random() * 3;
      glow.material.opacity = 0.14 + Math.sin(t * 3) * 0.05;
    },
    wave() { handR.position.y = 1.25 + Math.sin(t * 10) * 0.12; },
    react(name, seconds = 1.2) { react = name; reactT = seconds; }
  };
  return root;
}

/** Label teks melayang (sprite). */
export function createLabel(text, { color = PALETTE.white, bg = 'rgba(7,21,22,.78)', size = 28, scale = 0.011 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `700 ${size}px "DM Sans", "Segoe UI", sans-serif`;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + size;
  const h = Math.ceil(size * 1.6);
  c.width = w; c.height = h;
  g.font = font;
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(0, 0, w, h, h / 3); g.fill();
  g.fillStyle = color;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(w * scale, h * scale, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Gelembung percakapan (sprite multi-baris). */
export function createBubble(text) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const size = 26;
  g.font = `500 ${size}px "DM Sans", "Segoe UI", sans-serif`;
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach((w) => { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > 420 && line) { lines.push(line); line = w; } else line = test; });
  if (line) lines.push(line);
  const shown = lines.slice(0, 4);
  const w = Math.ceil(Math.max(...shown.map((l) => g.measureText(l).width))) + 36;
  const h = shown.length * 34 + 30;
  c.width = w; c.height = h;
  g.font = `500 ${size}px "DM Sans", "Segoe UI", sans-serif`;
  g.fillStyle = 'rgba(242,255,248,.96)';
  g.beginPath(); g.roundRect(0, 0, w, h - 12, 16); g.fill();
  g.beginPath(); g.moveTo(w / 2 - 12, h - 13); g.lineTo(w / 2, h); g.lineTo(w / 2 + 12, h - 13); g.fill();
  g.fillStyle = PALETTE.deep;
  shown.forEach((l, i) => g.fillText(l, 18, 38 + i * 34));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(w * 0.008, h * 0.008, 1);
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 11;
  return sprite;
}
