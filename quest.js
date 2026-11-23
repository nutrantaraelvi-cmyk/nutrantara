/*
 * Misi di dalam dunia NUTRANTARA.
 * Setiap pulau pos analisis (Pos 1–5) memiliki:
 *   • Terminal Arsip (satu per baris data) → dipindai untuk mengumpulkan bukti,
 *   • Papan Laporan → tantangan keputusan (terbuka setelah semua terminal dipindai),
 *   • Altar Segel → alasan Paspor dan upacara segel.
 * Pos 6 memiliki Meja Dapur Juara yang membuka bengkel menu.
 * Logika skor tetap di game.js (NutraGame.submitAnswer / sealPost) agar sama dengan server.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { createLabel, toon, PALETTE } from './characters.js';
import { createCorn, createTempe } from './culture.js';
import { createLab } from './lab.js';
import { createAbsorption } from './absorb.js';
import { createCausal, COLON_PATH } from './causal.js';
import { createClaims, packageMaterials, PACK_SIZE } from './claims.js';
import { createArchive, archiveStatus, POST_COLORS } from './archive.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const RADIUS = 1.9;

export function createQuests(ctx) {
  const { scene, fx, game, overlay, islandFrame, add } = ctx;
  const items = [];
  let panel = null; // { el, item, cleanup }
  const floaters = [];
  const absorption = createAbsorption({
    game, openPanel, closePanel, shake, nara: ctx.nara, say: ctx.say,
    onDone: (it, stars) => {
      fx.confetti({ x: it.x, y: 2.6, z: it.z });
      fx.ring({ x: it.x, y: 0, z: it.z }, { color: it.st.color, from: 0.6, to: 4, life: 0.9 });
      floatText(`${'★'.repeat(stars)} ${it.st.label.toUpperCase()}`, it.x, 3.4, it.z, PALETTE.gold);
      refresh();
      const m = game.missionById(it.pos);
      const left = m.activity.stations.filter((x) => !game.activityState(it.pos).stations[x.id]).length;
      ctx.say(left ? `${it.st.label} tuntas dengan ${stars} bintang! Masih ${left} misi gerbang lagi.` : 'Semua misi gerbang tuntas! Sekarang pindai Terminal Arsip, lalu buka Papan Laporan.', 'celebrate');
    }
  });
  const causal = createCausal({
    game, openPanel, closePanel, shake, say: ctx.say, nara: ctx.nara,
    onDone: (it, stars) => {
      fx.confetti({ x: it.x, y: 2.8, z: it.z });
      fx.ring({ x: it.x, y: 0, z: it.z }, { color: it.st.color, from: 0.6, to: 4.5, life: 0.9 });
      floatText(`${'★'.repeat(stars)} ${it.st.label.toUpperCase()}`, it.x, 3.8, it.z, PALETTE.gold);
      refresh();
      const m = game.missionById(it.pos);
      const left = m.activity.stations.filter((x) => !game.activityState(it.pos).stations[x.id]).length;
      ctx.say(left ? `${it.st.label} tuntas dengan ${stars} bintang! Masih ${left} misi jejak lagi.` : 'Semua jejak tertelusuri! Sekarang pindai Terminal Arsip, lalu buka Papan Laporan.', 'celebrate');
    }
  });
  const claims = createClaims({
    game, openPanel, closePanel, shake, say: ctx.say, nara: ctx.nara,
    onDone: (it, stars) => {
      fx.confetti({ x: it.x, y: 2.8, z: it.z });
      fx.ring({ x: it.x, y: 0, z: it.z }, { color: it.st.color, from: 0.6, to: 4.5, life: 0.9 });
      floatText(`${'★'.repeat(stars)} ${it.st.label.toUpperCase()}`, it.x, 3.8, it.z, PALETTE.gold);
      refresh();
      const m = game.missionById(it.pos);
      const left = m.activity.stations.filter((x) => !game.activityState(it.pos).stations[x.id]).length;
      ctx.say(left ? `${it.st.label} tuntas dengan ${stars} bintang! Masih ${left} misi studio lagi.` : 'Semua klaim terbongkar! Sekarang pindai Terminal Arsip, lalu buka Papan Laporan.', 'celebrate');
    }
  });
  const archive = createArchive({
    game, openPanel, closePanel, shake, say: ctx.say, nara: ctx.nara,
    onDone: (it) => {
      fx.confetti({ x: it.x, y: 3, z: it.z });
      fx.pillar({ x: it.x, y: 0, z: it.z }, { color: PALETTE.gold, height: 10, life: 2 });
      floatText('✦ ARSIP PULIH', it.x, 4, it.z, PALETTE.gold);
      refresh();
      ctx.say('Arsip Nusantara pulih dan Paspor Nusantara terkumpul! Sekarang kumpulkan bahan lokal, lalu rancang menu di Meja Dapur Juara.', 'celebrate');
    }
  });
  const lab = createLab({
    game, openPanel, closePanel, shake, say: ctx.say, nara: ctx.nara,
    onSolved: (it, stars) => {
      fx.confetti({ x: it.x, y: 2.4, z: it.z });
      fx.pillar({ x: it.x, y: 0, z: it.z }, { color: it.st.color, height: 7, life: 1.6, radius: 0.5 });
      floatText(`${'★'.repeat(stars)} KASUS TERPECAHKAN`, it.x, 3, it.z, PALETTE.gold);
      refresh();
      const m = game.missionById(it.pos);
      const left = m.activity.stations.filter((x) => !game.activityState(it.pos).stations[x.id]).length;
      ctx.say(left ? `Kasus terpecahkan dengan ${stars} bintang! Selesaikan juga ${left} meja jalur lainnya.` : 'Kasus terpecahkan! Sekarang pindai Terminal Arsip, lalu buka Papan Laporan.', 'celebrate');
    }
  });

  // ---------- Objek di pulau ----------

  function holoScreen(text, color) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.06), toon('#173a3a'));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    glass.position.z = 0.04;
    g.add(frame, glass);
    const label = createLabel(text, { color: '#ebfff6', bg: 'rgba(7,21,22,0)', size: 26, scale: 0.0085 });
    label.position.z = 0.08;
    g.add(label);
    g.userData.glass = glass;
    return g;
  }

  function buildTerminal(pos, row, label, x, z, rot) {
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.9, 8), toon('#2c4f4b')), 0, 0.45, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 8), toon(PALETTE.cyan, { emissive: PALETTE.cyan, emissiveIntensity: 0.4 })), 0, 0.92, 0, g);
    const screen = holoScreen(label.toUpperCase(), PALETTE.cyan);
    screen.position.y = 1.75;
    g.add(screen);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 6, 32), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);
    g.rotation.y = rot;
    add(g, x, 0, z);
    return { obj: g, screen, ring };
  }

  function buildBoard(x, z, rot) {
    const g = new THREE.Group();
    [-0.95, 0.95].forEach((px) => add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6), toon('#7a4a2a')), px, 1.1, 0, g));
    add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.12), toon('#a0683e')), 0, 1.65, 0, g);
    const screen = holoScreen('PAPAN LAPORAN', PALETTE.gold);
    screen.scale.set(1.3, 1.25, 1);
    screen.position.set(0, 1.65, 0.1);
    g.add(screen);
    const lock = createLabel('🔒 PINDAI SEMUA TERMINAL', { color: PALETTE.gold, size: 22 });
    lock.position.set(0, 2.65, 0);
    g.add(lock);
    g.rotation.y = rot;
    add(g, x, 0, z);
    return { obj: g, screen, lock };
  }

  function buildAltar(x, z, rot) {
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.35, 10), toon('#9aa59c')), 0, 0.18, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.8, 10), toon('#c7cfc9')), 0, 0.75, 0, g);
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), toon(PALETTE.green, { emissive: PALETTE.green, emissiveIntensity: 0.25, unique: true }));
    emblem.scale.set(1, 1.3, 0.45);
    emblem.position.y = 1.75;
    g.add(emblem);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 30), new THREE.MeshBasicMaterial({ color: PALETTE.green, transparent: true, opacity: 0.4 }));
    halo.position.y = 1.75;
    g.add(halo);
    const label = createLabel('ALTAR SEGEL', { color: PALETTE.green, size: 22 });
    label.position.y = 2.6;
    g.add(label);
    g.rotation.y = rot;
    add(g, x, 0, z);
    return { obj: g, emblem, halo };
  }

  function buildKitchenTable(x, z) {
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.3), toon('#c79a63')), 0, 1, 0, g);
    [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]].forEach(([px, pz]) => add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), toon('#7a4a2a')), px, 0.5, pz, g));
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.08, 16), toon('#ffffff')), -0.5, 1.12, 0, g);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 12), toon('#f2c94c')), -0.5, 1.45, 0, g);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.45), toon('#e9d8a6')), 0.5, 1.12, 0, g);
    const label = createLabel('MEJA DAPUR JUARA', { color: PALETTE.gold, size: 22 });
    label.position.y = 2.1;
    g.add(label);
    add(g, x, 0, z);
    return { obj: g };
  }

  // ---------- Stasiun misi khas pulau ----------
  function stationLabel(g, text, color, y) {
    const l = createLabel(text, { color, size: 22 });
    l.position.y = y;
    g.add(l);
    return l;
  }

  const YAXIS = new THREE.Vector3(0, 1, 0);
  const ZAXIS = new THREE.Vector3(0, 0, 1);
  const TMP = new THREE.Vector3();
  /** Batang silinder dari titik a ke titik b (rangka menara). */
  function beam(parent, a, b, r, color) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 5), toon(color));
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(YAXIS, b.clone().sub(a).normalize());
    parent.add(mesh);
    return mesh;
  }

  function buildStation(st, x, z, act) {
    const g = new THREE.Group();
    const parts = {};
    if (st.kind === 'bench') { // meja lab: tabung reaksi + layar rantai reaksi
      add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.9), toon('#e8e2d6')), 0, 0.95, 0, g);
      [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].forEach(([px, pz]) => add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 0.1), toon('#9aa59c')), px, 0.47, pz, g));
      [-0.5, 0, 0.5].forEach((px, i) => { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 10), new THREE.MeshToonMaterial({ color: [st.color, '#ffffff', '#c58cf0'][i], transparent: true, opacity: 0.85 })); add(tube, px, 1.24, 0, g); });
      parts.screen = holoScreen(st.chain ? st.chain.join(' → ') : st.label, st.color);
      parts.screen.scale.set(1.2, 0.8, 1);
      parts.screen.position.set(0, 2, -0.3);
      g.add(parts.screen);
    } else if (st.kind === 'lab') { // meja uji reagen: rak tabung, botol reagen, mikroskop
      add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 1.1), toon('#f4efe4')), 0, 0.95, 0, g);
      add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 1), toon('#5d8f8a')), 0, 0.45, 0, g);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.3), toon('#7a4a2a')), -0.55, 1.12, -0.2, g);
      parts.tubes = ['#d9a441', '#c4532b', '#7b3fa0', '#e0472f'].map((c, i) => {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 10), new THREE.MeshToonMaterial({ color: c, transparent: true, opacity: 0.88 }));
        add(tube, -0.85 + i * 0.2, 1.33, -0.2, g);
        return tube;
      });
      ['#b9782a', '#3b7fd1', '#5b9de3', '#e2553f'].forEach((c, i) => {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 10), toon(c)), 0.15 + i * 0.22, 1.17, 0.25, g);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 8), toon('#2c3e3c')), 0.15 + i * 0.22, 1.38, 0.25, g);
      });
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), toon('#2c4f4b')), 0.85, 1.32, -0.25, g);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.3, 10), toon('#173a3a')), 0.85, 1.6, -0.1, g).rotation.x = 0.6;
      parts.screen = holoScreen('UJI REAGEN · RUANG X / Y', st.color);
      parts.screen.scale.set(1.3, 0.85, 1);
      parts.screen.position.set(0, 2.15, -0.45);
      g.add(parts.screen);
    } else if (st.kind === 'twingate') { // dua gerbang: PENCERNAAN (jingga) dan PENYERAPAN (toska)
      [['#ff9f43', -1.1, '⚙ CERNA'], ['#1fc3d3', 1.1, '⇵ SERAP']].forEach(([c, px, text]) => {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.14, 10, 28, Math.PI), toon(c, { emissive: c, emissiveIntensity: 0.25, unique: true }));
        add(arch, px, 0.1, 0, g);
        [-0.9, 0.9].forEach((dx) => add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 10), toon('#7a4a2a')), px + dx, 0.12, 0, g));
        const sign = createLabel(text, { color: c, size: 22 });
        sign.position.set(px, 1.35, 0);
        g.add(sign);
      });
      parts.cards = [0, 1, 2].map((i) => {
        const card = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.03), toon('#fff4dc'));
        add(card, 0, 1.1 + i * 0.15, 0.2, g);
        return card;
      });
    } else if (st.kind === 'villi') { // gugus vili raksasa: kapiler merah melingkar + pembuluh kil kuning di vili tengah
      add(new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.4, 24), toon('#f0a3a3')), 0, 0.2, 0, g);
      parts.fingers = [];
      for (let i = 0; i < 7; i += 1) {
        const center = i === 0;
        const a = (i / 6) * Math.PI * 2;
        const r = center ? 0 : 1.5;
        const h = center ? 3.2 : 2 + (i % 3) * 0.4;
        const f = new THREE.Group();
        f.add(new THREE.Mesh(new THREE.CapsuleGeometry(center ? 0.55 : 0.36, h, 6, 12), new THREE.MeshToonMaterial({ color: '#f6b7b0', transparent: center, opacity: center ? 0.45 : 1 })));
        f.children[0].position.y = h / 2 + 0.4;
        if (center) {
          const lac = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, h - 0.4, 4, 8), toon('#f7e39a', { emissive: '#f7e39a', emissiveIntensity: 0.4, unique: true }));
          lac.position.y = h / 2 + 0.4;
          f.add(lac);
          const curve = new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, k) => { const tt = k / 23; return new THREE.Vector3(Math.cos(tt * Math.PI * 6) * 0.38, 0.5 + tt * h, Math.sin(tt * Math.PI * 6) * 0.38); }));
          f.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.06, 6), toon('#e0473f', { emissive: '#e0473f', emissiveIntensity: 0.35, unique: true })));
        }
        f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        g.add(f);
        parts.fingers.push(f);
      }
      parts.beads = [0, 1, 2, 3, 4, 5].map((i) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(['#f2c94c', '#ff8f7a', '#ffd166'][i % 3], { emissive: '#ffffff', emissiveIntensity: 0.1, unique: true }));
        add(b, 0, 3, 0, g);
        return b;
      });
      parts.screen = holoScreen('SIMULATOR VILI 3D', st.color);
      parts.screen.position.set(0, 4.7, 0);
      g.add(parts.screen);
    } else if (st.kind === 'orb') { // molekul hasil pencernaan
      const orb = new THREE.Group();
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), toon(st.color, { emissive: st.color, emissiveIntensity: 0.5, unique: true }));
      orb.add(core);
      for (let i = 0; i < 3; i += 1) { const a = (i / 3) * Math.PI * 2; const atom = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), toon('#ffffff')); atom.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.3, Math.sin(a) * 0.55); orb.add(atom); }
      orb.position.y = 1.4;
      g.add(orb);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.2, 14), toon('#d4e3df')), 0, 0.1, 0, g);
      parts.orb = orb; parts.core = core;
    } else if (st.kind === 'gate') { // gerbang vili usus yang rusak
      for (let i = 0; i < 5; i += 1) { const v = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.7, 4, 8), toon('#f19a8c')); add(v, -0.8 + i * 0.4, 0.55, 0, g); v.rotation.z = (i - 2) * 0.12; }
      parts.core = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 8, 28, Math.PI), toon(st.color, { emissive: st.color, emissiveIntensity: 0.15, unique: true }));
      add(parts.core, 0, 0.35, 0, g);
    } else if (st.kind === 'threads') { // papan benang merah + tiga lentera jalur + barisan domino sebab-akibat
      const lanes = (act && act.threads && act.threads.lanes) || {};
      add(new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.75, 0.12), toon('#6b4423')), 0, 1.8, 0, g);
      add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.55, 0.04), toon('#d2a66b')), 0, 1.8, 0.07, g);
      [-1.25, 1.25].forEach((px) => add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), toon('#5a3a20')), px, 0.55, 0, g));
      const pins = [[-1.05, 2.3], [-1.05, 1.8], [-1.05, 1.3], [-0.4, 2.3], [-0.4, 1.8], [-0.4, 1.3], [0.2, 1.35], [0.55, 1.8], [1.05, 1.8]];
      pins.forEach(([px, py]) => {
        add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.012), toon('#fff8e8')), px, py - 0.1, 0.095, g);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon('#e2553f')), px, py, 0.11, g);
      });
      const LANES = { serat: [0, 3, 7], air: [1, 4, 7], aktivitas: [2, 5, 6, 7], akibat: [7, 8] };
      parts.strings = Object.entries(LANES).map(([lane, idx]) => {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(idx.map((n) => new THREE.Vector3(pins[n][0], pins[n][1], 0.115))), new THREE.LineBasicMaterial({ color: '#8a6a50' }));
        g.add(line);
        return { lane, line, color: (lanes[lane] || {}).color || '#e2553f' };
      });
      // Gantungan lentera di atas papan: satu lentera per jalur faktor.
      [-1.5, 1.5].forEach((px) => add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.3, 6), toon('#5a3d22')), px, 1.65, -0.15, g));
      add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.08), toon('#5a3d22')), 0, 3.28, -0.15, g);
      parts.lanterns = ['serat', 'air', 'aktivitas'].map((lane, i) => {
        const px = -0.9 + i * 0.9;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 4), toon('#2c2116')), px, 3.13, -0.15, g);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), toon('#8a8a8a', { emissive: (lanes[lane] || {}).color || '#ffd17c', emissiveIntensity: 0, unique: true }));
        core.scale.y = 1.35;
        add(core, px, 2.88, -0.15, g);
        return { lane, core, color: (lanes[lane] || {}).color || '#ffd17c' };
      });
      // Barisan domino di depan papan: roboh beruntun saat jalurnya lengkap (jejak sebab-akibat).
      parts.dominoes = ['serat', 'air', 'aktivitas'].map((lane, i) => {
        const color = (lanes[lane] || {}).color || '#ffd17c';
        const start = new THREE.Vector3(-1.9 + i * 1.9, 0, 2.5 - Math.abs(i - 1) * 0.5);
        const end = new THREE.Vector3((i - 1) * 0.35, 0, 0.55);
        const dir = end.clone().sub(start).normalize();
        const count = 8;
        const gap = start.distanceTo(end) / (count - 1);
        const pieces = [];
        for (let k = 0; k < count; k += 1) {
          const pivot = new THREE.Group();
          pivot.rotation.order = 'YXZ';
          pivot.position.copy(start).lerp(end, k / (count - 1));
          pivot.rotation.y = Math.atan2(dir.x, dir.z);
          const d = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.07), toon(k % 2 ? '#fff8e8' : color));
          d.position.y = 0.25;
          pivot.add(d);
          g.add(pivot);
          pieces.push(pivot);
        }
        return { lane, pieces, angle: Math.asin(Math.min(1, gap / 0.5)), fallen: false, t: -1 };
      });
    } else if (st.kind === 'colon') { // usus besar raksasa (tembus pandang) di atas alas + gelombang peristaltik
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 0.36, 26), toon('#e8d6bd')), 0, 0.18, 0, g);
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.06, 26), toon('#ff9f43')), 0, 0.39, 0, g);
      const curve = new THREE.CatmullRomCurve3(COLON_PATH.map(([px, py, pz]) => new THREE.Vector3(px * 0.95, py * 0.95 + 2.45, pz)));
      add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.3, 12, false), toon('#f3a59c', { transparent: true, opacity: 0.6 })), 0, 0, 0, g);
      [[-1.43, 1.05], [1.35, 1.2]].forEach(([px, top]) => add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, top - 0.4, 6), toon('#c8b49a')), px, 0.4 + (top - 0.4) / 2, 0, g));
      parts.colonCurve = curve;
      parts.beads = [0, 1, 2, 3, 4].map(() => add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), toon('#8a5a2b')), 0, 0, 0, g));
      parts.wave = add(new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 24), toon('#ff9f43', { emissive: '#ff8a1f', emissiveIntensity: 0.8, unique: true })), 0, 0, 0, g);
      parts.screen = holoScreen('MESIN UJI ADIL', st.color);
      parts.screen.position.set(0, 4.85, 0);
      g.add(parts.screen);
    } else if (st.kind === 'tower') { // menara siaran kota terapung
      const H = 4.4; const base = 0.62; const top = 0.16;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const at = (hy) => base + (top - base) * (hy / H);
      corners.forEach(([sx, sz]) => beam(g, new THREE.Vector3(sx * base, 0, sz * base), new THREE.Vector3(sx * top, H, sz * top), 0.05, '#c0573a'));
      [0, 1.1, 2.2, 3.3].forEach((h0, lvl, arr) => {
        const r0 = at(h0);
        const h1 = lvl < arr.length - 1 ? arr[lvl + 1] : H;
        const r1 = at(h1);
        corners.forEach(([sx, sz], k) => {
          const [nx, nz] = corners[(k + 1) % 4];
          if (h0 > 0) beam(g, new THREE.Vector3(sx * r0, h0, sz * r0), new THREE.Vector3(nx * r0, h0, nz * r0), 0.03, '#f5f0e6');
          beam(g, new THREE.Vector3(sx * r0, h0, sz * r0), new THREE.Vector3(nx * r1, h1, nz * r1), 0.022, '#c0573a');
        });
      });
      add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), toon('#f5f0e6')), 0, H + 0.2, 0, g);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.2, 6), toon('#2c3e3c')), 0, H + 1.0, 0, g);
      const dish = add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), toon('#f5f0e6', { side: THREE.DoubleSide })), 0, H + 0.25, 0.42, g);
      dish.rotation.x = Math.PI / 2;
      parts.beacon = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toon('#e2553f', { emissive: '#ff3b2b', emissiveIntensity: 0.6, unique: true })), 0, H + 1.65, 0, g);
      parts.waves = [0, 1, 2].map(() => {
        const w = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 6, 32), new THREE.MeshBasicMaterial({ color: st.color, transparent: true, opacity: 0 }));
        w.rotation.x = Math.PI / 2;
        w.position.y = H + 1.6;
        g.add(w);
        return w;
      });
      parts.screen = holoScreen('MENARA SIARAN', st.color);
      parts.screen.position.set(0, 1.5, 0.95);
      g.add(parts.screen);
    } else if (st.kind === 'geode') { // batu klaim di atas landasan + palu; terbelah memperlihatkan kristal asumsi saat tuntas
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.7, 8), toon('#6b6e7a')), 0, 0.35, 0, g);
      const rock = toon('#7d6f8f', { flatShading: true, unique: true });
      parts.geodeTop = new THREE.Group();
      parts.geodeTop.add(new THREE.Mesh(new THREE.SphereGeometry(0.75, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), rock));
      add(parts.geodeTop, 0, 1.45, 0, g);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.75, 9, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), rock), 0, 1.45, 0, g);
      parts.crystal = new THREE.Group();
      for (let i = 0; i < 7; i += 1) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.13 + (i % 3) * 0.05, 0), toon('#c9a2ff', { emissive: '#7c3aed', emissiveIntensity: 0.8 }));
        c.scale.y = 1.6;
        c.position.set(Math.cos(i * 2.4) * 0.22, 0.05 + (i % 3) * 0.05, Math.sin(i * 2.4) * 0.22);
        parts.crystal.add(c);
      }
      add(parts.crystal, 0, 1.45, 0, g);
      const hammer = new THREE.Group();
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6), toon('#8a5a2b')), 0, 0.55, 0, hammer);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.18), toon('#4b5563')), 0, 1.1, 0, hammer);
      hammer.rotation.z = 0.5;
      add(hammer, 1.15, 0, 0.25, g);
      parts.screen = holoScreen('DATA + ASUMSI = KLAIM?', st.color);
      parts.screen.position.set(0, 2.75, -0.35);
      g.add(parts.screen);
    } else if (st.kind === 'package') { // kemasan raksasa berputar di bawah lampu sorot
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.3, 28), toon('#2c3e3c')), 0, 0.15, 0, g);
      parts.packRing = add(new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.05, 8, 40), toon('#78f4bd', { emissive: '#78f4bd', emissiveIntensity: 0, unique: true })), 0, 0.31, 0, g);
      parts.packRing.rotation.x = Math.PI / 2;
      const [pw, ph, pd] = PACK_SIZE;
      const prod = act && act.pack && act.pack.products[0];
      parts.box = add(new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), prod ? packageMaterials(prod) : toon('#f5b72b')), 0, 0.35 + ph / 2, 0, g);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.7, 6), toon('#2c3e3c')), 1.6, 1.85, -0.55, g);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 0.4, 12), toon('#f5f0e6')), 1.35, 3.6, -0.45, g).rotation.z = 0.8;
      parts.beam = add(new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.45, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })), 0.68, 2.55, -0.2, g);
      parts.beam.rotation.z = -0.58;
      parts.beam.castShadow = false;
    } else if (st.kind === 'studio') { // studio rekaman: latar, kamera di tripod, mikrofon, lampu ON AIR
      add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 2.2), toon('#3b2f4a')), 0, 0.1, 0, g);
      add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.12), toon('#f5f0e6')), 0, 1.4, -1.05, g);
      parts.screen = holoScreen('STUDIO NASKAH JUJUR', st.color);
      parts.screen.position.set(0, 1.55, -0.95);
      g.add(parts.screen);
      parts.onAirSign = add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.08), toon('#5a4632', { emissive: '#ff3b2b', emissiveIntensity: 0, unique: true })), 0, 2.85, -1.0, g);
      const sign = createLabel('ON AIR', { color: '#ffffff', bg: 'rgba(0,0,0,0)', size: 26, scale: 0.008 });
      sign.position.set(0, 0, 0.06);
      parts.onAirSign.add(sign);
      const rig = new THREE.Group();
      [0, 2.09, 4.19].forEach((a) => beam(rig, new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(Math.cos(a) * 0.42, 0.2, Math.sin(a) * 0.42), 0.025, '#2c2116'));
      add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.7), toon('#2c2116')), 0, 1.38, 0, rig);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.3, 14), toon('#4b5563')), 0, 1.38, -0.48, rig).rotation.x = Math.PI / 2;
      rig.rotation.y = 0.51;
      add(rig, 0.95, 0, 0.55, g);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), toon('#9aa59c')), -0.85, 0.9, -0.2, g);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), toon('#2c2116')), -0.85, 1.62, -0.2, g);
    } else { // papan naskah studio
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), toon('#7a4a2a')), -0.7, 0.9, 0, g);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), toon('#7a4a2a')), 0.7, 0.9, 0, g);
      parts.screen = holoScreen(st.label.toUpperCase(), st.color);
      parts.screen.position.y = 1.6;
      g.add(parts.screen);
    }
    parts.label = stationLabel(g, st.label, st.color, { bench: 2.75, lab: 2.95, twingate: 2.2, villi: 5.5, threads: 3.65, colon: 5.6, tower: 6.5, geode: 3.4, package: 4.25, studio: 3.4 }[st.kind] || 2.6);
    add(g, x, 0, z);
    return { obj: g, ...parts };
  }

  function buildIngredient(item, x, z) {
    const g = new THREE.Group();
    let model;
    if (item.kind === 'corn') { model = createCorn(0.9); model.rotation.z = 1.2; }
    else if (item.kind === 'tempe') model = createTempe(0.9);
    else if (item.kind === 'egg') { model = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), toon('#f7ead4')); model.scale.y = 1.3; }
    else if (item.kind === 'leaf') { model = new THREE.Group(); for (let i = 0; i < 6; i += 1) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), toon('#3fa95c')); lf.scale.set(1, 0.3, 0.6); lf.position.set(Math.cos(i) * 0.2, i * 0.05, Math.sin(i) * 0.2); model.add(lf); } }
    else if (item.kind === 'ubi') { model = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.35, 4, 8), toon('#b5486b')); model.rotation.z = 1.4; }
    else { model = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 6, 12, Math.PI * 0.8), toon('#f5d33b')); model.rotation.z = 0.6; }
    model.position.y = 0.9;
    g.add(model);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 28), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
    g.add(ring);
    stationLabel(g, item.label, PALETTE.gold, 1.7);
    add(g, x, 0, z);
    return { obj: g, model };
  }

  function buildArchive(x, z) { // Ruang Arsip Nusantara: podium + buku Paspor terbuka + lima halaman arsip melayang
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.3, 30), toon('#c8b49a')), 0, 0.15, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.06, 30), toon('#145c60')), 0, 0.33, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.1, 8), toon('#7a4a2a')), 0, 0.9, 0, g);
    const desk = add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.9), toon('#7a4a2a')), 0, 1.48, 0, g);
    desk.rotation.x = -0.45;
    const book = new THREE.Group();
    [-1, 1].forEach((side) => {
      const cover = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.8), toon('#145c60')), side * 0.31, 0, 0, book);
      cover.rotation.z = side * -0.12;
      const leafs = add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.74), toon('#fff4dc')), side * 0.3, 0.04, 0, book);
      leafs.rotation.z = side * -0.12;
    });
    book.rotation.x = -0.45;
    add(book, 0, 1.58, 0.03, g);
    const pages = [1, 2, 3, 4, 5].map((n, i) => {
      const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.72), toon('#9c8f78', { emissive: POST_COLORS[n], emissiveIntensity: 0, side: THREE.DoubleSide, unique: true }));
      pg.userData = { a: (i / 5) * Math.PI * 2, n };
      g.add(pg);
      return pg;
    });
    const beam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#f5b72b', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })), 0, 3.6, 0, g);
    beam.castShadow = false;
    stationLabel(g, 'Ruang Arsip Nusantara', PALETTE.gold, 3.9);
    add(g, x, 0, z);
    return { obj: g, pages, beam, book };
  }

  function buildStage(x, z) {
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.35, 24), toon('#c0573a')), 0, 0.17, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.05, 24), toon('#f5b72b')), 0, 0.37, 0, g);
    const banner = holoScreen('PANGGUNG PRESENTASI', PALETTE.gold);
    banner.position.set(0, 2.1, -1.1);
    g.add(banner);
    add(g, x, 0, z);
    return { obj: g };
  }

  // Tata letak tiap pulau pos (koordinat lokal relatif pusat pulau; z+ = sisi depan/selatan).
  game.missions.forEach((m) => {
    const f = islandFrame(m.id);
    if (!f) return;
    // Wilayah pos sangat luas: objek misi tersebar di inti wilayah (±220 × 140 m), sisanya untuk jelajah bebas.
    const sx = Math.min(f.rx, 220); const sz = Math.min(f.rz, 140);
    const P = (lx, lz) => ({ x: f.x + lx * sx, z: f.z + lz * sz });
    if (m.type === 'project') {
      const p = P(0, 0.05);
      const t = buildKitchenTable(p.x, p.z);
      items.push({ kind: 'kitchen', pos: m.id, x: p.x, z: p.z, ...t });
      (m.activity.items || []).forEach((ing) => { const q = P(ing.at[0], ing.at[1]); items.push({ kind: 'ingredient', pos: m.id, ing, x: q.x, z: q.z, ...buildIngredient(ing, q.x, q.z) }); });
      const sg = P(m.activity.stage.at[0], m.activity.stage.at[1]);
      items.push({ kind: 'stage', pos: m.id, x: sg.x, z: sg.z, ...buildStage(sg.x, sg.z) });
      if (m.activity.archive) { const ar = P(m.activity.archive.at[0], m.activity.archive.at[1]); items.push({ kind: 'archive', pos: m.id, x: ar.x, z: ar.z, reach: 0.6, ...buildArchive(ar.x, ar.z) }); }
      return;
    }
    const rows = m.stimulus.rows;
    rows.forEach((row, i) => {
      const k = rows.length === 1 ? 0 : i / (rows.length - 1);
      const lx = -0.5 + k * 1.0;
      const p = P(lx, -0.08 + Math.abs(lx) * 0.25);
      // Pos bervarian: indikatornya berganti per siswa, jadi layar terminal memakai nomor arsip.
      const t = buildTerminal(m.id, i, m.variants ? `ARSIP ${i + 1}` : row.label, p.x, p.z, -lx * 0.5);
      items.push({ kind: 'terminal', pos: m.id, row: i, x: p.x, z: p.z, label: row.label, ...t });
    });
    const b = P(-0.62, 0.42);
    items.push({ kind: 'board', pos: m.id, x: b.x, z: b.z, ...buildBoard(b.x, b.z, 0.45) });
    const a = P(0.62, 0.42);
    items.push({ kind: 'altar', pos: m.id, x: a.x, z: a.z, ...buildAltar(a.x, a.z, -0.45) });
    const act = m.activity;
    if (act && act.type === 'classify') {
      const d = P(act.distractor.at[0], act.distractor.at[1]);
      items.push({ kind: 'terminal', pos: m.id, row: -1, distractor: true, x: d.x, z: d.z, label: act.distractor.label, ...buildTerminal(m.id, -1, act.distractor.label, d.x, d.z, -0.4) });
    }
    if (act && act.type === 'stations') act.stations.forEach((st) => { const q = P(st.at[0], st.at[1]); items.push({ kind: 'station', pos: m.id, st, x: q.x, z: q.z, reach: { colon: 0.9, villi: 0.8 }[st.kind] || 0, ...buildStation(st, q.x, q.z, act) }); });
  });

  // ---------- Peran regu (PjBL) ----------
  const TEAM = () => window.NutraTeam || null;
  /** Tugas sebuah objek dunia: [jenis, kunci, indeks] untuk NutraTeam.check. */
  function taskOf(it) {
    if (it.kind === 'terminal') return it.distractor ? ['distractor', null, 0] : ['terminal', null, it.row];
    if (it.kind === 'station') return ['station', it.st.id, 0];
    if (it.kind === 'ingredient') return ['ingredient', null, game.missionById(it.pos).activity.items.findIndex((x) => x.id === it.ing.id)];
    if (it.kind === 'stage') return ['stage', null, 0];
    return null;
  }
  function itemDone(it) {
    const a = game.activityState(it.pos);
    if (it.kind === 'terminal') return it.distractor ? Boolean(a.rejected) : evidenceOf(it.pos).includes(it.row);
    if (it.kind === 'station') return Boolean(a.stations && a.stations[it.st.id]);
    if (it.kind === 'ingredient') return (a.collected || []).includes(it.ing.id);
    if (it.kind === 'stage') return Boolean(a.presented);
    if (it.kind === 'archive') return Boolean(a.stations && a.stations.arsip);
    return false;
  }
  /** Tugas milik peran anggota lain yang sedang daring ditolak dengan ajakan berdiskusi. */
  function teamGate(it) {
    const T = TEAM();
    const task = taskOf(it);
    if (!T || !task || itemDone(it) || (postOf(it.pos) && postOf(it.pos).sealed)) return true;
    const g = T.check(it.pos, ...task);
    if (!g.ok) { ctx.say(g.text, 'shake'); return false; }
    if (g.takeover) game.showToast(g.text);
    return true;
  }
  function ownerTag(it) {
    const T = TEAM();
    const task = taskOf(it);
    const t = T && task && !itemDone(it) ? T.tag(it.pos, ...task) : '';
    return t ? ` · ${t}` : '';
  }
  /** Panah tujuan mengarah ke tugas milik peranku lebih dulu. */
  function mineFirst(list) {
    const T = TEAM();
    if (!T || !T.shared()) return list[0];
    return list.find((x) => { const task = taskOf(x); return !task || T.check(x.pos, ...task).mine; }) || list[0];
  }

  // ---------- Status ----------

  const postOf = (id) => game.state.posts[id];
  const evidenceOf = (id) => (postOf(id) && postOf(id).evidence) || [];
  const allScanned = (id) => evidenceOf(id).length >= game.missionById(id).stimulus.rows.length;
  const activityOk = (id) => game.activityDone(id);
  const boardOpen = (id) => allScanned(id) && activityOk(id);
  const challengesDone = (id) => postOf(id).challenges.every((c) => c.complete);

  function refresh() {
    items.forEach((it) => {
      const p = postOf(it.pos);
      if (!p) return;
      const act = game.activityState(it.pos);
      if (it.kind === 'terminal' && it.distractor) {
        const c = act.rejected ? '#e2553f' : PALETTE.cyan;
        it.screen.userData.glass.material.color.set(c);
        it.ring.material.color.set(c);
        return;
      }
      if (it.kind === 'station') {
        const done = Boolean(act.stations[it.st.id]) || p.sealed;
        if (it.screen) it.screen.userData.glass.material.color.set(done ? PALETTE.green : it.st.color);
        if (it.core) it.core.material.emissiveIntensity = done ? 1.1 : 0.35;
        if (it.orb) it.orb.visible = !done;
        if (it.lanterns) refreshThreads(it, done);
        it.live = done; // menara mengudara, geode terbuka, kemasan bersinar, lampu ON AIR menyala
        return;
      }
      if (it.kind === 'ingredient') { it.obj.visible = !act.collected.includes(it.ing.id); return; }
      if (it.kind === 'archive') {
        const S = archiveStatus(game);
        it.pages.forEach((pg, i) => { const on = S.pages[i] && S.pages[i].restored; pg.material.color.set(on ? '#fff4dc' : '#9c8f78'); pg.material.emissiveIntensity = on ? 0.55 : 0; });
        it.live = Boolean(act.stations.arsip) || S.done;
        return;
      }
      if (it.kind === 'terminal') {
        const done = evidenceOf(it.pos).includes(it.row) || p.sealed;
        const c = done ? PALETTE.green : PALETTE.cyan;
        it.screen.userData.glass.material.color.set(c);
        it.ring.material.color.set(c);
      }
      if (it.kind === 'board') {
        const open = boardOpen(it.pos) || p.sealed;
        it.lock.visible = !open;
        it.screen.userData.glass.material.color.set(p.sealed || (open && challengesDone(it.pos)) ? PALETTE.green : open ? PALETTE.gold : '#6c7f79');
      }
      if (it.kind === 'altar') {
        const ready = challengesDone(it.pos) && !p.sealed;
        it.emblem.material.emissiveIntensity = p.sealed ? 1.2 : ready ? 0.8 : 0.15;
        it.emblem.material.color.set(p.sealed ? PALETTE.gold : PALETTE.green);
        it.halo.material.opacity = p.sealed ? 0.9 : ready ? 0.7 : 0.2;
      }
    });
  }

  /** Jalur benang Pos 4 yang sudah lengkap di Papan Benang Merah. */
  function laneComplete(pos, lane) {
    const b = game.activityState(pos).benang;
    const links = game.missionById(pos).activity.threads.links.filter((l) => l.lane === lane);
    return Boolean(b && b.edges) && links.every((l) => b.edges[`${l.from}>${l.to}`]);
  }
  function refreshThreads(it, done) {
    it.lanterns.forEach((ln) => { const on = done || laneComplete(it.pos, ln.lane); ln.on = on; ln.core.material.emissiveIntensity = on ? 1.2 : 0; ln.core.material.color.set(on ? ln.color : '#8a8a8a'); });
    it.strings.forEach((sg) => { sg.line.material.color.set(done || laneComplete(it.pos, sg.lane) ? sg.color : '#8a6a50'); });
    it.dominoes.forEach((d) => {
      const on = done || laneComplete(it.pos, d.lane);
      if (on && !d.fallen && d.t < 0) {
        if (it.inited) d.t = 0; // baru lengkap: robohkan beruntun
        else { d.pieces.forEach((pc, k) => { pc.rotation.x = k === d.pieces.length - 1 ? 1.4 : d.angle; }); d.fallen = true; }
      }
      if (!on && (d.fallen || d.t >= 0)) { d.t = -1; d.fallen = false; d.pieces.forEach((pc) => { pc.rotation.x = 0; }); }
    });
    it.inited = true;
  }

  function hint(it) {
    const m = game.missionById(it.pos);
    const p = postOf(it.pos);
    const act = game.activityState(it.pos);
    if (it.kind === 'kitchen') return act.collected.length < (m.activity.need || 0) && !p.sealed ? `Meja Dapur Juara — kumpulkan bahan dulu (${act.collected.length}/${m.activity.need}).` : 'Meja Dapur Juara — rancang menu proyek akhir. Tekan E.';
    if (it.kind === 'ingredient') return `${it.ing.label} — ${it.ing.group}. Tekan E untuk memasukkan ke rantang.${ownerTag(it)}`;
    if (it.kind === 'stage') return p.sealed ? 'Panggung Presentasi — tekan E untuk mempresentasikan kartu menumu!' : 'Panggung Presentasi — terbuka setelah Dapur Juara disegel.';
    if (it.kind === 'archive') { const S = archiveStatus(game); return `Ruang Arsip Nusantara — ${S.done ? 'arsip pulih ✓ (tekan E untuk membuka Paspor Nusantara)' : `halaman pulih ${S.restored}/${S.total}. Tekan E untuk menelaah penjelasan regu.`}`; }
    if (it.kind === 'station') return `${it.st.label} — ${act.stations[it.st.id] ? 'selesai ✓' : 'tekan E untuk mengerjakan misi'}${ownerTag(it)}`;
    if (it.kind === 'terminal' && it.distractor) return `Terminal Arsip · ${it.label} — ${act.rejected ? 'ditandai pengalih ✓' : 'tekan E untuk memindai'}${ownerTag(it)}`;
    if (it.kind === 'terminal') return `Terminal Arsip · ${m.stimulus.rows[it.row].label} — ${evidenceOf(it.pos).includes(it.row) ? 'sudah dipindai ✓' : 'tekan E untuk memindai'}${ownerTag(it)}`;
    if (it.kind === 'board') {
      if (p.sealed) return 'Papan Laporan — semua tantangan selesai ✓ (tekan E untuk meninjau)';
      if (!activityOk(it.pos)) return `Papan Laporan terkunci — selesaikan misi "${m.activity.title}" dulu.`;
      if (!allScanned(it.pos)) return `Papan Laporan terkunci — pindai ${m.stimulus.rows.length - evidenceOf(it.pos).length} terminal lagi.`;
      return `Papan Laporan — ${p.challenges.filter((c) => c.complete).length}/${m.challenges.length} tantangan. Tekan E.`;
    }
    if (p.sealed) return 'Altar Segel — pos ini sudah tersegel ✓';
    return challengesDone(it.pos) ? 'Altar Segel siap! Tekan E untuk menulis alasan dan menyegel pos.' : 'Altar Segel — selesaikan Papan Laporan terlebih dahulu.';
  }

  function nearest(x, z, h) {
    if (h > 1.2) return null;
    let best = null; let bestD = RADIUS;
    // Objek berkaki lebar (alas simulator) punya jangkauan tambahan agar bisa dibuka dari tepinya.
    items.forEach((it) => { if (it.obj && !it.obj.visible) return; const d = Math.hypot(it.x - x, it.z - z) - (it.reach || 0); if (d < bestD) { bestD = d; best = it; } });
    return best;
  }

  // ---------- Panel hologram ----------

  function openPanel(it, html, onMount) {
    closePanel(true);
    const el = document.createElement('div');
    el.className = 'holo';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<button type="button" class="holo-close" aria-label="Tutup panel (Esc)">×</button>${html}`;
    overlay.append(el);
    overlay.hidden = false;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); closePanel(); } };
    document.addEventListener('keydown', onKey);
    el.querySelector('.holo-close').addEventListener('click', () => closePanel());
    panel = { el, item: it, cleanup: () => document.removeEventListener('keydown', onKey) };
    ctx.onPanel(true);
    if (onMount) onMount(el);
    const focusable = el.querySelector('[data-autofocus]') || el.querySelector('button:not(.holo-close), input, textarea, select');
    if (focusable) setTimeout(() => focusable.focus(), 50);
  }

  function closePanel(silent) {
    if (!panel) return;
    panel.cleanup();
    const el = panel.el;
    panel = null;
    el.classList.add('holo-out');
    setTimeout(() => { el.remove(); if (!panel) overlay.hidden = true; }, 180);
    if (!silent) ctx.onPanel(false);
  }

  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  function floatText(text, x, y, z, color = PALETTE.gold) {
    const s = createLabel(text, { color, bg: 'rgba(7,21,22,.7)', size: 34, scale: 0.012 });
    s.position.set(x, y, z);
    scene.add(s);
    floaters.push({ s, t: 0 });
  }

  // ---------- Terminal: pindai bukti ----------

  function parseNum(v) { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; }

  function scanTerminal(it) {
    const m = game.missionById(it.pos);
    const classify = m.activity && m.activity.type === 'classify';
    const row = it.distractor ? { label: m.activity.distractor.label, values: m.activity.distractor.values } : m.stimulus.rows[it.row];
    const cols = m.stimulus.columns.slice(1);
    fx.ring({ x: it.x, y: 0, z: it.z }, { color: PALETTE.cyan, from: 0.4, to: 2.4, life: 0.6 });
    fx.sparkle({ x: it.x, y: 1.8, z: it.z }, PALETTE.cyan);
    const nums = row.values.map(([v]) => (it.distractor ? null : parseNum(v)));
    const max = Math.max(...nums.filter((n) => n !== null), 1);
    const bars = row.values.map(([v, unit], i) => {
      const n = nums[i];
      const width = n === null ? 100 : Math.max(6, (n / max) * 100);
      return `<div class="scan-row"><span>${esc(cols[i])}</span><div class="scan-bar"><i style="--w:${width}%"></i></div><b ${n !== null ? `data-count="${n}"` : ''}>${n !== null ? '0' : esc(v)}</b><small>${esc(unit || '')}</small></div>`;
    }).join('');
    const already = it.distractor ? game.activityState(it.pos).rejected : evidenceOf(it.pos).includes(it.row);
    const decide = classify && !already;
    openPanel(it, `
      <p class="holo-kicker">POS ${pad(it.pos)} · TERMINAL ARSIP${it.distractor ? '' : ` ${it.row + 1}/${m.stimulus.rows.length}`} <em>SIMULASI</em></p>
      <h2>${esc(row.label)}</h2>
      <div class="scan-beam" aria-hidden="true"></div>
      <div class="scan-rows">${bars}</div>
      <p class="holo-note">${esc(m.stimulus.title)} · Data simulasi untuk tantangan, bukan rekomendasi gizi.</p>
      ${decide ? `<p class="holo-label">MISI: ${esc(m.activity.title).toUpperCase()}</p><p class="holo-ask">Apakah data ini bisa menguji perbedaan <b>komposisi gizi</b> kedua menu?</p><div class="holo-feedback" role="status" aria-live="polite"></div><div class="holo-duo"><button type="button" class="button button-primary" data-act="relevant" data-autofocus>✦ Bukti relevan</button><button type="button" class="button button-secondary" data-act="reject">✗ Informasi pengalih</button></div>` : `<button type="button" class="button button-primary" data-act="keep" data-autofocus>${already ? 'Tutup' : 'Simpan sebagai bukti ✦'}</button>`}`, (el) => {
      el.querySelectorAll('[data-count]').forEach((b) => {
        const target = Number(b.dataset.count);
        const start = performance.now();
        const tick = (now) => {
          const k = Math.min(1, (now - start) / 700);
          b.textContent = (Math.round(target * (1 - (1 - k) ** 3) * 10) / 10).toLocaleString('id-ID');
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const decideBtn = (choice) => {
        const right = it.distractor ? choice === 'reject' : choice === 'relevant';
        if (!right) {
          game.updateActivity(it.pos, (a) => { a.tries = (a.tries || 0) + 1; });
          ctx.nara('shake');
          shake(el);
          el.querySelector('.holo-feedback').innerHTML = it.distractor ? `<b class="warn">Coba lagi.</b> Apakah harga atau kemasan menunjukkan kandungan protein, serat, atau energi?` : `<b class="warn">Coba lagi.</b> Data "${esc(row.label)}" adalah angka zat gizi. Bisakah dipakai membandingkan komposisi menu?`;
          return;
        }
        if (it.distractor) {
          game.updateActivity(it.pos, (a) => { a.rejected = true; }, `menolak terminal pengalih ${m.activity.distractor.label}`);
          fx.ring({ x: it.x, y: 0, z: it.z }, { color: '#e2553f', from: 0.4, to: 2.2, life: 0.5 });
          floatText('✗ PENGALIH DITOLAK', it.x, 2.6, it.z, '#ffffff');
          ctx.say(`Tepat! ${m.activity.explain}`, 'celebrate');
        } else {
          const ev = game.scanEvidence(it.pos, it.row);
          fx.sparkle({ x: it.x, y: 2, z: it.z }, PALETTE.green);
          floatText('+ BUKTI', it.x, 2.6, it.z, PALETTE.green);
          const left = m.stimulus.rows.length - ev.length;
          ctx.say(left ? `Bukti "${row.label}" relevan dan tersimpan. ${left} terminal data lagi.` : `Semua bukti relevan terkumpul! ${m.stimulus.insight}`, left ? 'talk' : 'celebrate');
        }
        refresh();
        closePanel();
      };
      if (decide) {
        el.querySelector('[data-act="relevant"]').addEventListener('click', () => decideBtn('relevant'));
        el.querySelector('[data-act="reject"]').addEventListener('click', () => decideBtn('reject'));
        return;
      }
      el.querySelector('[data-act="keep"]').addEventListener('click', () => {
        if (!already) {
          const ev = game.scanEvidence(it.pos, it.row);
          fx.sparkle({ x: it.x, y: 2, z: it.z }, PALETTE.green);
          floatText('+ BUKTI', it.x, 2.6, it.z, PALETTE.green);
          refresh();
          const left = m.stimulus.rows.length - ev.length;
          ctx.say(left ? `Bukti "${row.label}" tersimpan. ${left} terminal lagi, lalu buka Papan Laporan.` : `Semua bukti terkumpul! Insight: ${m.stimulus.insight} Sekarang buka Papan Laporan.`, left ? 'talk' : 'celebrate');
        }
        closePanel();
      });
    });
  }

  // ---------- Stasiun misi (Pos 2–5) ----------

  function openStation(it) {
    if (it.st.kind === 'lab') { lab.open(it); return; }
    if (it.st.kind === 'twingate') { absorption.openSorter(it); return; }
    if (it.st.kind === 'villi') { absorption.openVilli(it); return; }
    if (it.st.kind === 'threads') { causal.openThreads(it); return; }
    if (it.st.kind === 'colon') { causal.openColon(it); return; }
    if (it.st.kind === 'tower') { causal.openTower(it); return; }
    if (it.st.kind === 'geode') { claims.openGeode(it); return; }
    if (it.st.kind === 'package') { claims.openPackage(it); return; }
    if (it.st.kind === 'studio') { claims.openStudio(it); return; }
    const m = game.missionById(it.pos);
    const st = it.st;
    const act = game.activityState(it.pos);
    const done = Boolean(act.stations[st.id]);
    const chain = st.chain ? `<div class="holo-chain">${st.chain.map((c, i) => `<span>${esc(c)}</span>${i < st.chain.length - 1 ? `<i>→ <b>${i + 1}</b></i>` : ''}`).join('')}</div>` : '';
    const blanks = st.blanks.map((b, i) => `<fieldset class="holo-choices" data-blank="${i}"><legend class="holo-label">${st.chain ? `${i + 1}. ` : ''}${esc(b.label)}</legend>${b.options.map((o, k) => `<label class="holo-choice${done && o === b.answer ? ' is-correct' : ''}"><input type="radio" name="b${i}" value="${esc(o)}"${done ? ' disabled' : ''}${done && o === b.answer ? ' checked' : ''} /><span class="mark">${String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></label>`).join('')}</fieldset>`).join('');
    openPanel(it, `
      <p class="holo-kicker">POS ${pad(it.pos)} · MISI: ${esc(m.activity.title).toUpperCase()} <em>LATIHAN</em></p>
      <h2>${esc(st.label)}</h2>
      ${chain}
      <form class="holo-form" novalidate>${blanks}
        <div class="holo-feedback" role="status" aria-live="polite">${done ? `<b class="ok">✓ Selesai.</b> ${esc(st.explain)}` : ''}</div>
        ${done ? '<button type="button" class="button button-primary" data-act="close" data-autofocus>Tutup</button>' : '<button type="submit" class="button button-primary">Periksa ↗</button>'}
      </form>`, (el) => {
      const form = el.querySelector('.holo-form');
      const closeBtn = el.querySelector('[data-act="close"]');
      if (closeBtn) closeBtn.addEventListener('click', () => closePanel());
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const picks = st.blanks.map((b, i) => { const x = form.querySelector(`input[name="b${i}"]:checked`); return x ? x.value : null; });
        const fb = el.querySelector('.holo-feedback');
        if (picks.some((p) => !p)) { fb.innerHTML = '<b class="warn">Pilih jawaban untuk setiap bagian terlebih dahulu.</b>'; shake(el); return; }
        const wrong = st.blanks.map((b, i) => picks[i] !== b.answer);
        form.querySelectorAll('fieldset[data-blank]').forEach((fs2, i) => fs2.classList.toggle('blank-wrong', wrong[i]));
        if (wrong.some(Boolean)) {
          const a = game.updateActivity(it.pos, (x) => { x.tries = (x.tries || 0) + 1; x.stationTries = x.stationTries || {}; x.stationTries[st.id] = (x.stationTries[st.id] || 0) + 1; });
          const n = a.stationTries[st.id];
          ctx.nara('shake');
          shake(el);
          fb.innerHTML = n >= 2 ? `<b class="warn">Belum tepat. Petunjuk:</b> ${esc(st.explain)}` : `<b class="warn">Belum tepat — coba lagi.</b> Bagian yang ditandai merah perlu diperiksa ulang.`;
          return;
        }
        game.updateActivity(it.pos, (a) => { a.stations[st.id] = true; }, `menuntaskan ${st.label}`);
        fx.sparkle({ x: it.x, y: 1.8, z: it.z }, st.color);
        fx.ring({ x: it.x, y: 0, z: it.z }, { color: st.color, from: 0.4, to: 2.6, life: 0.7 });
        if (st.kind === 'orb') fx.rise({ x: it.x, y: 1, z: it.z }, st.color);
        floatText('✓ MISI', it.x, 2.8, it.z, st.color);
        refresh();
        const left = m.activity.stations.filter((x) => !game.activityState(it.pos).stations[x.id]).length;
        ctx.say(left ? `${st.explain} Masih ${left} lagi.` : `Misi "${m.activity.title}" tuntas! Sekarang pindai Terminal Arsip, lalu buka Papan Laporan.`, left ? 'talk' : 'celebrate');
        if (st.kind !== 'bench') { closePanel(); return; }
        // Meja jalur: tampilkan molekul yang terpotong tahap demi tahap sebelum panel ditutup.
        form.querySelectorAll('input').forEach((x) => { x.disabled = true; });
        fb.innerHTML = `<div class="lab-path" aria-hidden="true"><div class="lab-chain" style="--c:${st.color}"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><b class="ok">✓ Jalur berjalan!</b> ${esc(st.explain)}`;
        requestAnimationFrame(() => fb.querySelector('.lab-chain').classList.add('split'));
        const submit = form.querySelector('button[type="submit"]');
        submit.type = 'button';
        submit.textContent = 'Lanjut ↗';
        submit.addEventListener('click', () => closePanel(), { once: true });
        submit.focus();
      });
    });
  }

  // ---------- Dapur Juara: kumpulkan bahan & presentasi (Pos 6) ----------

  function collectIngredient(it) {
    const m = game.missionById(it.pos);
    const act = game.updateActivity(it.pos, (a) => { if (!a.collected.includes(it.ing.id)) a.collected.push(it.ing.id); }, `memasukkan ${it.ing.label} ke rantang regu`);
    const names = m.activity.items.filter((x) => act.collected.includes(x.id)).map((x) => x.label);
    game.prefillKitchen(names);
    fx.sparkle({ x: it.x, y: 1, z: it.z }, PALETTE.gold);
    floatText(`+ ${it.ing.label.toUpperCase()} KE RANTANG`, it.x, 2.2, it.z);
    refresh();
    const need = m.activity.need;
    ctx.say(act.collected.length >= need ? `${it.ing.label} masuk rantang (${it.ing.group}). Bahan cukup! Bawa ke Meja Dapur Juara. ${m.activity.explain}` : `${it.ing.label} masuk rantang (${it.ing.group}). ${act.collected.length}/${need} bahan.`, act.collected.length >= need ? 'celebrate' : 'talk');
  }

  function openKitchen(it) {
    const m = game.missionById(it.pos);
    const act = game.activityState(it.pos);
    const started = postOf(it.pos).sealed || Boolean(postOf(it.pos).initial && postOf(it.pos).initial.savedAt);
    if (m.activity.archive && !act.stations.arsip && !started) { ctx.say('Pulihkan dulu Ruang Arsip Nusantara: telaah penjelasan regu sampai semua halaman pulih. Ikuti panah emas.', 'shake'); return; }
    if (act.collected.length < m.activity.need && !postOf(it.pos).sealed) { ctx.say(`Kumpulkan dulu minimal ${m.activity.need} bahan lokal di sekitar dapur (${act.collected.length}/${m.activity.need}).`, 'shake'); return; }
    game.openPos(it.pos);
  }

  function present(it) {
    const p = postOf(it.pos);
    if (!p.sealed) { ctx.say('Panggung dibuka setelah Dapur Juara disegel. Selesaikan rancangan, telaah, revisi, dan refleksi.', 'shake'); return; }
    const d = p.revision && p.revision.savedAt ? p.revision : p.initial;
    const ings = (d.ingredients || []).filter((x) => String(x.name || '').trim());
    game.updateActivity(it.pos, (a) => { a.presented = true; }, 'mempresentasikan kartu menu regu');
    fx.confetti({ x: it.x, y: 2.5, z: it.z });
    fx.pillar({ x: it.x, y: 0, z: it.z }, { color: PALETTE.gold, height: 10, life: 2 });
    ctx.nara('celebrate');
    openPanel(it, `
      <p class="holo-kicker">POS 06 · PANGGUNG PRESENTASI · KARTU MENU</p>
      <h2>${esc(d.menuName || 'Menu Juara')}</h2>
      <p class="holo-ask">Sasaran: <b>${esc(d.target || '—')}</b> · ${esc(d.mealTime || '')}</p>
      <ul class="menu-card">${ings.map((x) => `<li><b>${esc(x.name)}</b> <span>${esc(x.form)} · ${esc(x.grams || '?')} g</span><small>${esc(x.source || 'sumber belum ditulis')}</small></li>`).join('')}</ul>
      <p class="holo-quote">${esc(d.rationale || '')}</p>
      <p class="holo-note">Presentasikan kartu ini ke kelas: jelaskan alasan pemilihan bahan, porsi, dan apa yang kamu ubah setelah telaah.</p>
      <button type="button" class="button button-primary" data-act="close" data-autofocus>Selesai presentasi ✦</button>`, (el) => el.querySelector('[data-act="close"]').addEventListener('click', () => closePanel()));
  }

  // ---------- Langkah misi per pos & log misi ----------

  function steps(id) {
    const m = game.missionById(id);
    const p = postOf(id);
    const a = game.activityState(id);
    const out = [];
    if (m.type === 'project') {
      if (m.activity.archive) { const S = archiveStatus(game); out.push({ text: `Pulihkan Ruang Arsip: telaah penjelasan regu (${S.restored}/${S.total} halaman)`, done: Boolean(a.stations.arsip) || p.sealed || Boolean(p.initial && p.initial.savedAt), item: items.find((x) => x.pos === id && x.kind === 'archive') }); }
      out.push({ text: `Kumpulkan bahan lokal (${Math.min(a.collected.length, m.activity.need)}/${m.activity.need})`, done: a.collected.length >= m.activity.need || p.sealed, item: mineFirst(items.filter((x) => x.pos === id && x.kind === 'ingredient' && !a.collected.includes(x.ing.id))) });
      out.push({ text: 'Rancang, telaah, revisi, dan refleksi di Meja Dapur Juara', done: p.sealed, item: items.find((x) => x.pos === id && x.kind === 'kitchen') });
      out.push({ text: 'Presentasikan kartu menu di Panggung', done: Boolean(a.presented), item: items.find((x) => x.pos === id && x.kind === 'stage') });
      return out;
    }
    const act = m.activity;
    if (act && act.type === 'classify') {
      out.push({ text: `${act.title}: simpan bukti relevan (${evidenceOf(id).length}/${m.stimulus.rows.length}) dan tolak pengalih`, done: (allScanned(id) && a.rejected) || p.sealed, item: mineFirst(items.filter((x) => x.pos === id && x.kind === 'terminal' && (x.distractor ? !a.rejected : !evidenceOf(id).includes(x.row)))) });
    } else if (act) {
      const n = act.stations.filter((st) => a.stations[st.id]).length;
      out.push({ text: `Misi: ${act.title} (${n}/${act.stations.length})`, done: n >= act.stations.length || p.sealed, item: mineFirst(items.filter((x) => x.pos === id && x.kind === 'station' && !a.stations[x.st.id])) });
      out.push({ text: `Pindai Terminal Arsip (${evidenceOf(id).length}/${m.stimulus.rows.length})`, done: allScanned(id) || p.sealed, item: mineFirst(items.filter((x) => x.pos === id && x.kind === 'terminal' && !evidenceOf(id).includes(x.row))) });
    }
    const c = p.challenges.filter((x) => x.complete).length;
    out.push({ text: `Jawab tantangan di Papan Laporan (${c}/${m.challenges.length})`, done: c >= m.challenges.length, item: items.find((x) => x.pos === id && x.kind === 'board') });
    out.push({ text: 'Tulis alasan & segel di Altar Segel', done: p.sealed, item: items.find((x) => x.pos === id && x.kind === 'altar') });
    return out;
  }

  /** Tujuan berikutnya di pulau pos ini (untuk HUD & panah emas). */
  function goal(id) {
    const list = steps(id);
    const next = list.find((x) => !x.done);
    return next ? { text: next.text, item: next.item } : null;
  }

  function openLog(id) {
    const m = game.missionById(id);
    if (!m) return;
    const list = steps(id);
    const story = m.activity ? m.activity.intro : '';
    openPanel({ x: 0, z: 0 }, `
      <p class="holo-kicker">📜 LOG MISI · POS ${pad(id)} · ${esc(m.location)}</p>
      <h2>${esc(m.title)} ${esc(m.titleEm)}</h2>
      <p class="holo-quote">${esc(story)}</p>
      <ol class="mission-steps">${list.map((x) => `<li class="${x.done ? 'done' : ''}"><span>${x.done ? '✓' : '○'}</span>${esc(x.text)}</li>`).join('')}</ol>
      <p class="holo-note">Misi khas pulau adalah latihan: boleh dicoba ulang dan tidak memengaruhi skor. Tantangan di Papan Laporan dinilai sekali jawab.</p>
      <button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>`, (el) => el.querySelector('[data-act="close"]').addEventListener('click', () => closePanel()));
  }

  // ---------- Papan Laporan: tantangan ----------

  function mark(def, value, chosen, done) {
    if (!done) return '';
    const right = Array.isArray(def.correct) ? def.correct.includes(value) : def.correct === value;
    return right ? ' is-correct' : chosen.includes(value) ? ' is-wrong' : '';
  }

  function challengeBody(def, draft, done) {
    const dis = done ? ' disabled' : '';
    if (def.type === 'single' || def.type === 'multi') {
      const chosen = def.type === 'single' ? [draft].filter(Boolean) : (draft || []);
      return `<fieldset class="holo-choices"><legend class="sr-only">${def.type === 'single' ? 'Pilih satu jawaban' : 'Pilih semua yang sesuai'}</legend>${def.options.map((o, i) => `<label class="holo-choice${mark(def, o.value, chosen, done)}"><input type="${def.type === 'single' ? 'radio' : 'checkbox'}" name="q" value="${esc(o.value)}"${chosen.includes(o.value) ? ' checked' : ''}${dis} /><span class="mark">${def.type === 'single' ? String.fromCharCode(65 + i) : '✓'}</span><span>${esc(o.text)}</span></label>`).join('')}</fieldset>${def.type === 'multi' ? '<p class="holo-note">Boleh memilih lebih dari satu.</p>' : ''}`;
    }
    if (def.type === 'order') {
      const order = Array.isArray(draft) && draft.length === def.items.length ? draft : def.items.map((x) => x.value);
      return `<p class="holo-note">Susun dengan tombol ↑ ↓.</p><ol class="holo-order">${order.map((v, i) => { const item = def.items.find((x) => x.value === v); return `<li><span class="mark">${i + 1}</span><span>${esc(item.text)}</span><button type="button" data-move="up" data-value="${esc(v)}" aria-label="Naikkan: ${esc(item.text)}"${i === 0 || done ? ' disabled' : ''}>↑</button><button type="button" data-move="down" data-value="${esc(v)}" aria-label="Turunkan: ${esc(item.text)}"${i === order.length - 1 || done ? ' disabled' : ''}>↓</button></li>`; }).join('')}</ol>`;
    }
    if (def.type === 'sort') {
      const map = draft || {};
      return `<div class="holo-sort">${def.items.map((it2, i) => `<label for="hs-${i}">${esc(it2.text)}</label><select id="hs-${i}" data-item="${esc(it2.value)}"${dis}><option value="">Pilih…</option>${def.categories.map((c) => `<option value="${esc(c.value)}"${map[it2.value] === c.value ? ' selected' : ''}>${esc(c.text)}</option>`).join('')}</select>`).join('')}</div>`;
    }
    return '';
  }

  function openBoard(it) {
    const m = game.missionById(it.pos);
    const p = postOf(it.pos);
    if (!activityOk(it.pos) && !p.sealed) {
      ctx.say(`Papan Laporan masih terkunci. Selesaikan misi "${m.activity.title}" dulu.`, 'shake');
      return;
    }
    if (!allScanned(it.pos) && !p.sealed) {
      ctx.say(`Papan Laporan masih terkunci. Pindai dulu semua Terminal Arsip (${evidenceOf(it.pos).length}/${m.stimulus.rows.length}).`, 'shake');
      return;
    }
    let index = p.challenges.findIndex((c) => !c.complete);
    if (index < 0) index = m.challenges.length - 1;
    let draft = p.challenges[index].response ?? null;

    const table = `<table class="holo-table"><thead><tr>${m.stimulus.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${m.stimulus.rows.map((r) => `<tr><th>${esc(r.label)}</th>${r.values.map(([v, u]) => `<td>${esc(v)} <small>${esc(u || '')}</small></td>`).join('')}</tr>`).join('')}</tbody></table>`;

    const P = () => postOf(it.pos); // data regu bisa memperbarui progres saat panel terbuka
    const voting = () => Boolean(TEAM() && TEAM().voting());
    const render = () => {
      const p = P();
      const def = m.challenges[index];
      const c = p.challenges[index];
      const done = c.complete;
      const steps = m.challenges.map((_, i) => `<i class="${p.challenges[i].complete ? 'done' : i === index ? 'now' : ''}"></i>`).join('');
      return `
        <p class="holo-kicker">POS ${pad(it.pos)} · PAPAN LAPORAN <span class="holo-steps">${steps}</span></p>
        <details class="holo-data"><summary>Lihat bukti yang terkumpul</summary>${table}<p class="holo-note">${esc(m.stimulus.insight)}</p></details>
        <p class="holo-label">TANTANGAN ${pad(index + 1)} · ${esc(def.label)}</p>
        <h2>${esc(def.question)}</h2>
        ${done ? (c.by ? `<p class="team-locked">🤝 Jawaban regu dikunci oleh ${esc(c.by.join(', '))}.</p>` : '') : game.teamVotesHtml(it.pos, index)}
        <form class="holo-form" novalidate>${challengeBody(def, draft, done)}
          <div class="holo-feedback" role="status" aria-live="polite">${done ? (c.correct !== false ? `<b class="ok">✓ ${esc(def.success)} +${c.points} poin</b>` : `<div class="holo-wrong"><b>Belum tepat — tidak apa-apa, lanjut ke tugas berikutnya!</b><span>Jawaban yang tepat: <i>${esc(game.responseText(def, def.correct))}</i></span><span>${esc(String(def.success || '').replace(/^Tepat\.\s*/, ''))}</span><small>0 poin untuk tantangan ini</small></div>`) : ''}</div>
          ${done ? `<button type="button" class="button button-primary" data-act="next" data-autofocus>${index + 1 < m.challenges.length ? 'Tantangan berikutnya →' : 'Menuju Altar Segel ✦'}</button>` : `<button type="submit" class="button button-primary">${voting() ? 'Usulkan jawaban regu ↗' : 'Kirim keputusan ↗'}</button>`}
        </form>`;
    };

    const bind = (el) => {
      const form = el.querySelector('.holo-form');
      const def = () => m.challenges[index];
      const read = () => {
        const d = def();
        if (d.type === 'single') { const x = form.querySelector('input[name="q"]:checked'); return x ? x.value : null; }
        if (d.type === 'multi') return [...form.querySelectorAll('input[name="q"]:checked')].map((x) => x.value);
        if (d.type === 'order') return Array.isArray(draft) && draft.length === d.items.length ? draft : d.items.map((x) => x.value);
        if (d.type === 'sort') { const map = {}; form.querySelectorAll('select[data-item]').forEach((s) => { map[s.dataset.item] = s.value; }); return map; }
        return null;
      };
      form.addEventListener('change', () => { if (def().type !== 'order') draft = read(); });
      form.addEventListener('click', (e) => {
        const mv = e.target.closest('[data-move]');
        if (mv) {
          const order = read().slice();
          const from = order.indexOf(mv.dataset.value);
          const to = mv.dataset.move === 'up' ? from - 1 : from + 1;
          if (to < 0 || to >= order.length) return;
          [order[from], order[to]] = [order[to], order[from]];
          draft = order;
          rerender(`[data-move="${mv.dataset.move}"][data-value="${CSS.escape(mv.dataset.value)}"]`);
          return;
        }
        const agree = e.target.closest('[data-agree]');
        if (agree) { game.agreeVote(it.pos, index, Number(agree.dataset.agree)); el.querySelector('.holo-feedback').innerHTML = '<b class="ok">Suaramu terkirim. Menunggu regu…</b>'; return; }
        if (e.target.closest('[data-act="next"]')) {
          if (index + 1 < m.challenges.length) { index += 1; draft = P().challenges[index].response ?? null; rerender(); }
          else { closePanel(); ctx.say('Hebat! Sekarang pergi ke Altar Segel dan tuliskan alasanmu.', 'celebrate'); }
        }
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const res = game.submitAnswer(it.pos, index, read());
        const fb = el.querySelector('.holo-feedback');
        if (res.empty) { fb.innerHTML = `<b class="warn">${esc(res.message)}</b>`; shake(el); return; }
        if (res.proposed) {
          ctx.nara('talk');
          rerender();
          const fb2 = panel && panel.el.querySelector('.holo-feedback');
          if (fb2 && !P().challenges[index].complete) fb2.innerHTML = `<b class="ok">Usulan terkirim.</b> ${res.need > 1 ? 'Jawaban terkunci setelah satu anggota lain memilih jawaban yang sama. Diskusikan buktinya!' : ''}`;
          return;
        }
        if (res.correct) {
          fx.confetti({ x: it.x, y: 2.2, z: it.z });
          floatText(`+${res.points} POIN`, it.x, 3, it.z);
          ctx.nara('celebrate');
          refresh();
          rerender();
          return;
        }
        ctx.nara('shake');
        floatText('0 POIN · TETAP LANJUT', it.x, 3, it.z, '#ffffff');
        ctx.say('Tidak apa-apa! Lihat jawaban yang tepat dan penjelasannya, lalu lanjut ke tugas berikutnya.', 'talk');
        refresh();
        rerender();
      });
    };

    const rerender = (focusSel) => {
      if (!panel) return;
      const body = panel.el.querySelector('.holo-body');
      body.innerHTML = render();
      bind(panel.el);
      const f = (focusSel && panel.el.querySelector(focusSel)) || panel.el.querySelector('[data-autofocus]') || panel.el.querySelector('.holo-form input, .holo-form select, .holo-form button');
      if (f && !f.disabled) f.focus();
    };

    openPanel(it, `<div class="holo-body">${render()}</div>`, bind);
    panel.el.classList.add('holo-wide');
    // Kabar regu (usulan baru / jawaban terkunci) memperbarui papan yang sedang terbuka.
    const host = panel.el;
    let wasDone = P().challenges[index].complete;
    const onTeam = () => {
      if (!panel || panel.el !== host) { document.removeEventListener('nutra:team', onTeam); return; }
      const nowDone = P().challenges[index].complete;
      if (nowDone && !wasDone) {
        const c = P().challenges[index];
        if (c.correct) { fx.confetti({ x: it.x, y: 2.2, z: it.z }); floatText(`+${c.points} POIN REGU`, it.x, 3, it.z); ctx.nara('celebrate'); } else { floatText('0 POIN · TETAP LANJUT', it.x, 3, it.z, '#ffffff'); ctx.nara('shake'); }
        refresh();
      }
      wasDone = nowDone;
      if (!host.contains(document.activeElement) || !document.activeElement.matches('input, select')) rerender();
    };
    document.addEventListener('nutra:team', onTeam);
    ctx.nara('talk');
  }

  // ---------- Altar Segel ----------

  function openAltar(it) {
    const m = game.missionById(it.pos);
    const p = postOf(it.pos);
    if (p.sealed) {
      openPanel(it, `<p class="holo-kicker">POS ${pad(it.pos)} · ALTAR SEGEL</p><h2>Pos ini sudah tersegel ✦</h2><p class="holo-quote">“${esc(p.reason)}”</p><button type="button" class="button button-secondary" data-act="close" data-autofocus>Tutup</button>`, (el) => el.querySelector('[data-act="close"]').addEventListener('click', () => closePanel()));
      return;
    }
    if (!challengesDone(it.pos)) { ctx.say('Altar belum aktif. Selesaikan dulu semua tantangan di Papan Laporan.', 'shake'); return; }
    openPanel(it, `
      <p class="holo-kicker">POS ${pad(it.pos)} · ALTAR SEGEL · REFLEKSI PASPOR</p>
      <h2>${esc(m.passport.prompt)}</h2>
      <label class="sr-only" for="altar-reason">Alasanmu</label>
      <textarea id="altar-reason" rows="4" maxlength="500" placeholder="${esc(m.passport.placeholder)}" data-autofocus>${esc(p.reason)}</textarea>
      <div class="holo-counter"><span id="altar-count">0</span> / 500 · minimal ${game.minReason} karakter</div>
      <div class="holo-feedback" role="status" aria-live="polite"></div>
      <button type="button" class="button button-primary" data-act="seal">Segel Pos ${it.pos} ✦</button>`, (el) => {
      const ta = el.querySelector('textarea');
      const count = el.querySelector('#altar-count');
      const upd = () => { count.textContent = String(ta.value.trim().length); count.parentElement.classList.toggle('ok', ta.value.trim().length >= game.minReason); };
      ta.addEventListener('input', () => { upd(); p.reason = ta.value; });
      upd();
      el.querySelector('[data-act="seal"]').addEventListener('click', () => {
        const res = game.sealPost(it.pos, ta.value);
        if (!res.ok) { el.querySelector('.holo-feedback').innerHTML = `<b class="warn">${esc(res.message)}</b>`; shake(el); return; }
        closePanel();
        ceremony(it, res);
      });
    });
  }

  function ceremony(it, res) {
    fx.pillar({ x: it.x, y: 0, z: it.z }, { color: PALETTE.gold, height: 16, life: 2.6 });
    fx.rise({ x: it.x, y: 0.5, z: it.z }, PALETTE.gold);
    fx.ring({ x: it.x, y: 0, z: it.z }, { color: PALETTE.gold, from: 0.5, to: 6, life: 1.2 });
    setTimeout(() => fx.confetti({ x: it.x, y: 2.5, z: it.z }), 500);
    floatText(`SEGEL POS ${it.pos} +${res.points}`, it.x, 3.4, it.z);
    ctx.nara('celebrate');
    refresh();
    ctx.onSealed(it.pos, res);
    setTimeout(() => openResult(it), 2900);
  }

  // Kartu "Hasil Pos": penilaian dan evaluasi setelah pos disegel
  function openResult(it) {
    const ev = game.evaluatePost(it.pos);
    const pct = Math.round((ev.score / ev.max) * 100);
    const stars = ev.correct === ev.total ? 3 : ev.correct > 0 ? 2 : 1;
    openPanel(it, `
      <p class="holo-kicker">POS ${pad(it.pos)} · HASIL PENILAIAN &amp; EVALUASI</p>
      <h2>${esc(ev.title)}</h2>
      <div class="result-head"><div class="result-stars" aria-label="${stars} dari 3 bintang">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><div><b>${ev.score}/${ev.max} poin</b><span>${ev.correct}/${ev.total} jawaban benar · ${esc(ev.level)}</span></div></div>
      <div class="report-bar"><i style="width:${pct}%"></i></div>
      <p class="holo-label">KEMAMPUAN: ${esc(ev.skill)}</p>
      <ul class="result-items">${ev.items.map((x) => `<li class="${x.correct ? 'ok' : 'no'}"><b>${x.correct ? '✓' : '✗'} ${esc(x.label)} · ${x.points} poin</b>${x.correct ? '' : `<span>Jawabanmu: ${esc(x.yourText)}</span><span>Jawaban tepat: ${esc(x.correctText)}</span>`}<em>${esc(x.explanation)}</em></li>`).join('')}</ul>
      <p class="holo-quote">${esc(ev.advice)}</p>
      <button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut menjelajah ↗</button>`, (el) => el.querySelector('[data-act="close"]').addEventListener('click', () => closePanel()));
    if (ev.correct === ev.total) fx.confetti({ x: it.x, y: 2.5, z: it.z });
  }

  function activate(it) {
    if (!teamGate(it)) return;
    if (it.kind === 'terminal') scanTerminal(it);
    else if (it.kind === 'board') openBoard(it);
    else if (it.kind === 'altar') openAltar(it);
    else if (it.kind === 'kitchen') openKitchen(it);
    else if (it.kind === 'station') openStation(it);
    else if (it.kind === 'ingredient') collectIngredient(it);
    else if (it.kind === 'stage') present(it);
    else if (it.kind === 'archive') archive.open(it);
  }

  function update(dt, t) {
    items.forEach((it, i) => {
      if (it.kind === 'station' && it.orb) { it.orb.position.y = 1.4 + Math.sin(t * 2 + i) * 0.15; it.orb.rotation.y += dt; }
      if (it.kind === 'station' && it.core && it.st.kind === 'gate') it.core.rotation.z = Math.sin(t) * 0.05;
      if (it.kind === 'station' && it.fingers) {
        it.fingers.forEach((f, k) => { f.rotation.z = Math.sin(t * 1.1 + k) * 0.05; f.rotation.x = Math.cos(t * 0.9 + k) * 0.04; });
        it.beads.forEach((b, k) => { const a = t * 0.7 + (k / it.beads.length) * Math.PI * 2; b.position.set(Math.cos(a) * 2.4, 3.2 + Math.sin(t * 2 + k) * 0.4, Math.sin(a) * 2.4); });
      }
      if (it.kind === 'station' && it.cards) it.cards.forEach((c, k) => { c.position.y = 1.1 + k * 0.15 + Math.sin(t * 2 + k) * 0.06; c.rotation.y = Math.sin(t + k) * 0.4; });
      if (it.kind === 'station' && it.lanterns) {
        it.lanterns.forEach((ln, k) => { ln.core.rotation.y += dt; if (ln.on) ln.core.material.emissiveIntensity = 1.05 + Math.sin(t * 7 + k * 2) * 0.15; });
        it.dominoes.forEach((d) => {
          if (d.t < 0) return;
          d.t += dt;
          const n = d.pieces.length;
          d.pieces.forEach((pc, k) => { const a = Math.min(1, Math.max(0, (d.t - k * 0.13) / 0.2)); pc.rotation.x = a * a * (k === n - 1 ? 1.4 : d.angle); });
          if (d.t > n * 0.13 + 0.3) { d.t = -1; d.fallen = true; }
        });
      }
      if (it.kind === 'station' && it.colonCurve) {
        it.beads.forEach((b, k) => it.colonCurve.getPointAt((t * 0.05 + k / it.beads.length) % 1, b.position));
        const u = (t * 0.12) % 1;
        it.colonCurve.getPointAt(u, it.wave.position);
        it.colonCurve.getTangentAt(u, TMP);
        it.wave.quaternion.setFromUnitVectors(ZAXIS, TMP);
      }
      if (it.kind === 'station' && it.geodeTop) {
        const k = Math.min(1, dt * 3);
        it.geodeTop.position.y += ((it.live ? 1.95 : 1.45) - it.geodeTop.position.y) * k;
        it.geodeTop.position.z += ((it.live ? -0.25 : 0) - it.geodeTop.position.z) * k;
        it.geodeTop.rotation.x += ((it.live ? -0.85 : 0) - it.geodeTop.rotation.x) * k;
        it.crystal.rotation.y += dt * (it.live ? 1.2 : 0.2);
      }
      if (it.kind === 'station' && it.box) {
        it.box.rotation.y += dt * 0.45;
        it.box.position.y = 1.45 + Math.sin(t * 1.4 + i) * 0.05;
        it.beam.material.opacity = 0.13 + Math.sin(t * 3) * 0.03;
        it.packRing.material.emissiveIntensity = it.live ? 0.8 + Math.sin(t * 4) * 0.3 : 0;
      }
      if (it.kind === 'station' && it.onAirSign) it.onAirSign.material.emissiveIntensity = it.live ? (Math.sin(t * 3) > -0.3 ? 1.2 : 0.4) : 0;
      if (it.kind === 'station' && it.waves) {
        it.beacon.material.emissiveIntensity = Math.sin(t * 4) > 0 ? 1 : 0.2;
        it.waves.forEach((w, k) => {
          w.visible = Boolean(it.live);
          if (!w.visible) return;
          const ph = (t * 0.6 + k / 3) % 1;
          w.scale.setScalar(0.4 + ph * 3.2);
          w.material.opacity = 0.8 * (1 - ph);
        });
      }
      if (it.kind === 'archive') {
        it.pages.forEach((pg, k) => { const a = pg.userData.a + t * 0.35; pg.position.set(Math.cos(a) * 1.75, 2.35 + Math.sin(t * 1.6 + k) * 0.15, Math.sin(a) * 1.75); pg.rotation.y = -a + Math.PI / 2; });
        it.beam.material.opacity = it.live ? 0.18 + Math.sin(t * 2) * 0.05 : 0;
      }
      if (it.kind === 'ingredient' && it.obj.visible) { it.model.rotation.y += dt * 1.2; it.model.position.y = 0.9 + Math.sin(t * 2.5 + i) * 0.1; }
      if (it.kind === 'terminal') {
        it.screen.position.y = 1.75 + Math.sin(t * 2 + i) * 0.06;
        it.ring.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.06);
      }
      if (it.kind === 'altar') { it.emblem.rotation.y += dt * 1.2; it.emblem.position.y = 1.75 + Math.sin(t * 1.8) * 0.1; it.halo.rotation.x = Math.PI / 2 + Math.sin(t) * 0.2; }
    });
    for (let i = floaters.length - 1; i >= 0; i -= 1) {
      const f = floaters[i];
      f.t += dt;
      f.s.position.y += dt * 0.9;
      f.s.material.opacity = Math.max(0, 1 - f.t / 1.8);
      if (f.t > 1.8) { scene.remove(f.s); floaters.splice(i, 1); }
    }
  }

  refresh();
  return { items, nearest, hint, activate, refresh, update, closePanel, goal, steps, openLog, get panelOpen() { return Boolean(panel); } };
}
