/*
 * NUTRANTARA — model 3D "Raksasa Hoaks Gizi" untuk event kelas Bos Mitos Gizi (sejak 1.5).
 * Desain orisinal: gumpalan kabut ungu bermata melotot dengan corong pengeras suara, dikelilingi papan klaim palsu
 * yang beterbangan. Saat terkena jawaban benar ia berkedip & menyusut; saat kalah ia meletus dan menghilang;
 * saat waktu habis ia terbang kabur. Hanya visual: status bos selalu datang dari server (window.NutraRPG.boss).
 */
import * as THREE from './vendor/three/three.module.min.js';
import { toon, createLabel } from './characters.js';

const CLAIMS = ['PALING SEHAT!', '100% ALAMI', 'BEBAS LEMAK!', 'ENERGI = SEHAT', 'PASTI LANGSING', 'SERAT TAK BERGUNA'];

export function createBoss() {
  const g = new THREE.Group();
  const rig = new THREE.Group(); // bergoyang & mengecil, kaki bayangan tetap di tanah
  g.add(rig);
  const bodyMat = toon('#7c5fd6', { emissive: '#ffffff', emissiveIntensity: 0, unique: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(2.4, 28, 20), bodyMat);
  body.scale.set(1.15, 0.95, 1);
  body.position.y = 3.2;
  rig.add(body);
  // Gumpalan kabut di sekeliling tubuh
  const puffs = [];
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9 + (i % 3) * 0.25, 14, 10), toon(i % 2 ? '#9b85e6' : '#6a4fc4'));
    puff.position.set(Math.cos(a) * 2.3, 1.4 + (i % 3) * 0.5, Math.sin(a) * 2.1);
    puff.userData.a = a;
    rig.add(puff);
    puffs.push(puff);
  }
  // Mata melotot + alis marah
  const eyes = [-0.85, 0.85].map((x) => {
    const eye = new THREE.Group();
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), toon('#ffffff')));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), toon('#1d1433'));
    pupil.position.set(0, -0.05, 0.42);
    eye.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.18), toon('#2c1f4d'));
    brow.position.set(0, 0.7, 0.3);
    brow.rotation.z = x < 0 ? -0.35 : 0.35;
    eye.add(brow);
    eye.position.set(x, 4.1, 2.0);
    rig.add(eye);
    return { eye, pupil };
  });
  // Corong pengeras suara sebagai mulut
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.5, 18, 1, true), toon('#f5b72b', { side: THREE.DoubleSide }));
  horn.rotation.x = -Math.PI / 2;
  horn.position.set(0, 2.7, 2.55);
  rig.add(horn);
  const hornRim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 8, 24), toon('#c98a1a'));
  hornRim.position.set(0, 2.7, 3.3);
  rig.add(hornRim);
  // Tanduk tanda seru di kepala
  for (let i = -1; i <= 1; i += 1) {
    const bang = new THREE.Group();
    bang.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.06, 0.9, 8), toon('#e2553f')));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), toon('#e2553f'));
    dot.position.y = -0.7;
    bang.add(dot);
    bang.position.set(i * 0.9, 6.0 + (i === 0 ? 0.35 : 0), 0.2);
    bang.rotation.z = -i * 0.3;
    rig.add(bang);
  }
  // Papan klaim palsu yang mengorbit
  const boards = CLAIMS.map((text, i) => {
    const b = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), toon('#7a4a24'));
    post.position.y = -0.7;
    b.add(post);
    const sign = createLabel(text, { color: '#fff4dc', bg: 'rgba(122,40,30,.92)', size: 30, scale: 0.012 });
    b.add(sign);
    b.userData = { a: (i / CLAIMS.length) * Math.PI * 2, r: 4.3 + (i % 2) * 0.6, y: 2.4 + (i % 3) * 1.1 };
    g.add(b);
    return b;
  });
  const name = createLabel('⚔ RAKSASA HOAKS GIZI', { color: '#ffd166', bg: 'rgba(40,20,70,.9)', size: 30, scale: 0.016 });
  name.position.y = 7.6;
  rig.add(name);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.8, 32), new THREE.MeshBasicMaterial({ color: '#2c1f4d', transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  g.add(shadow);

  let t = 0; let flash = 0; let squash = 0; let gone = 0;
  const state = { last: 'idle' };
  return {
    group: g,
    /** Dipanggil saat HP bos berkurang. */
    hit() { flash = 1; squash = 1; },
    update(dt, b, focus) {
      t += dt;
      const s = b ? b.state : 'idle';
      if (s !== state.last) { state.last = s; gone = 0; rig.visible = true; rig.position.set(0, 0, 0); rig.scale.setScalar(1); boards.forEach((x) => { x.visible = true; }); }
      const hpK = b && b.maxHp ? Math.max(0.25, b.hp / b.maxHp) : 1;
      flash = Math.max(0, flash - dt * 3);
      squash = Math.max(0, squash - dt * 4);
      bodyMat.emissiveIntensity = flash * 0.9;
      // Makin lemah, makin kecil (tetap terlihat besar) dan makin goyah.
      const base = 0.7 + hpK * 0.3;
      if (s === 'won') {
        gone += dt;
        rig.scale.setScalar(Math.max(0.01, base * (1 + gone * 0.8) * (1 - Math.min(1, gone / 1.4))));
        boards.forEach((x) => { x.position.y += dt * 6; });
        if (gone > 1.4) { rig.visible = false; boards.forEach((x) => { x.visible = false; }); }
      } else if (s === 'lost' || s === 'stopped') {
        gone += dt;
        rig.position.y = gone * gone * 6;
        rig.rotation.y += dt * 4;
        boards.forEach((x) => { x.position.y += dt * 4; });
      } else {
        rig.scale.set(base * (1 + squash * 0.12), base * (1 - squash * 0.15), base * (1 + squash * 0.12));
        rig.position.y = Math.sin(t * 1.6) * 0.25;
        rig.rotation.z = Math.sin(t * (1.3 + (1 - hpK) * 2)) * (0.04 + (1 - hpK) * 0.08);
        boards.forEach((x) => {
          const a = x.userData.a + t * 0.35;
          x.position.set(Math.cos(a) * x.userData.r, x.userData.y + Math.sin(t * 2 + x.userData.a) * 0.3, Math.sin(a) * x.userData.r);
        });
      }
      puffs.forEach((p, i) => { const k = 1 + Math.sin(t * 2 + i) * 0.08; p.scale.setScalar(k); });
      // Mata mengikuti titik fokus (penjelajah) bila ada.
      if (focus) {
        eyes.forEach(({ eye, pupil }) => {
          const wp = new THREE.Vector3();
          eye.getWorldPosition(wp);
          const dx = focus.x - wp.x; const dz = focus.z - wp.z; const d = Math.hypot(dx, dz) || 1;
          pupil.position.x = Math.max(-0.25, Math.min(0.25, (dx / d) * 0.25));
        });
      }
      shadow.material.opacity = rig.visible ? 0.25 * Math.max(0, 1 - rig.position.y / 8) : 0;
    }
  };
}
