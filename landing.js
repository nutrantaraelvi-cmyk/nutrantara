/* Landing page NUTRANTARA: diorama 3D, putaran karakter, kartu pos, dan peta SVG. */
import * as THREE from './vendor/three/three.module.min.js';
import { createExplorer, createNara, toon, PALETTE } from './characters.js';

const MISSIONS = window.NUTRANTARA_MISSIONS || [];
const W = window.NUTRANTARA_WORLD;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Kartu enam pos ----------
const POS_COLORS = ['#68dce7', '#ff9f91', '#f19a8c', '#ebfff6', '#68dce7', '#ffd17c'];
document.getElementById('pos-grid').innerHTML = MISSIONS.map((m, i) => `
  <article class="pos-card" style="--accent:${POS_COLORS[i]}">
    <div class="pos-top"><span>POS ${String(m.id).padStart(2, '0')}</span><b aria-hidden="true">${esc(m.icon)}</b></div>
    <p class="pos-loc">${esc(m.location)}</p>
    <h3>${esc(m.title)} <em>${esc(m.titleEm)}</em></h3>
    <p>${esc(m.description)}</p>
    <span class="pos-time">◷ ${esc(m.duration)}</span>
  </article>`).join('');

// ---------- Peta SVG dari world-data ----------
(function drawMap() {
  const { cx, cy, rx, ry } = W.island;
  const path = [W.spawn, ...W.stations].map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const palms = W.trees.map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="9" fill="#3f9a5a"/><circle r="5" cx="-3" cy="-3" fill="#56b77a"/></g>`).join('');
  const nodes = W.stations.map((s) => {
    const m = MISSIONS.find((mm) => mm.id === s.id);
    return `<g transform="translate(${s.x} ${s.y})"><circle r="22" fill="#0e2426" stroke="#68dce7" stroke-width="4"/><text y="6" text-anchor="middle" class="m-num">${s.id}</text><text y="40" text-anchor="middle" class="m-lbl">${esc(m ? `${m.title} ${m.titleEm}` : s.name).toUpperCase()}</text></g>`;
  }).join('');
  const tempe = [[552, 275], [582, 253], [618, 234], [109, 371], [99, 330], [570, 515], [534, 538], [808, 248], [832, 214]].map(([x, y]) => `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="3" fill="#e9d8a6" stroke="#c9b37a"/>`).join('');
  document.getElementById('map-svg').innerHTML = `
    <svg viewBox="0 0 ${W.width} ${W.height}" aria-hidden="true">
      <defs><radialGradient id="g-grass" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#5cbf72"/><stop offset="1" stop-color="#3f9a5a"/></radialGradient></defs>
      <rect width="${W.width}" height="${W.height}" fill="#0a2a30"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx + 30}" ry="${ry + 30}" fill="#8ff0e8" opacity=".15"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx + 14}" ry="${ry + 14}" fill="#eed9a2"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#g-grass)"/>
      <g opacity=".9">${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${120 + c * 33}" y="${180 + r * 26}" width="30" height="22" fill="#7fd3d6" stroke="#6b8f3a" stroke-width="3"/>`).join('')).join('')}</g>
      <path d="${path}" fill="none" stroke="#efdcaa" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${path}" fill="none" stroke="#ffd17c" stroke-width="3" stroke-dasharray="8 10" class="m-route"/>
      ${palms}${tempe}
      <g transform="translate(${W.spawn.x - 40} ${W.spawn.y + 20})"><rect x="-26" y="-30" width="52" height="8" fill="#b5523b"/><rect x="-24" y="-22" width="5" height="26" fill="#8a5a35"/><rect x="19" y="-22" width="5" height="26" fill="#8a5a35"/><text y="20" text-anchor="middle" class="m-lbl">GAPURA</text></g>
      <g transform="translate(${W.nara.x} ${W.nara.y})"><circle r="11" fill="#f2fff8"/><rect x="-7" y="-4" width="14" height="6" rx="2" fill="#0b1f21"/><text y="-18" text-anchor="middle" class="m-nara">NARA</text></g>
      ${nodes}
      <g transform="translate(${W.width - 70} 60)" class="m-compass"><circle r="24" fill="none" stroke="#ebfff6" opacity=".4"/><text y="-30" text-anchor="middle">U</text><path d="M0 -18 L6 0 L0 18 L-6 0Z" fill="#ffd17c"/></g>
    </svg>`;
})();

// ---------- 3D ----------
function webgl() { try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

function lights(scene) {
  scene.add(new THREE.HemisphereLight('#e6fbff', '#2f6b4c', 1.7));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
  sun.position.set(6, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  scene.add(sun);
}

function fit(renderer, camera, canvas) {
  const w = canvas.clientWidth; const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function shadowAll(obj) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return obj; }

function heroScene() {
  const canvas = document.getElementById('hero-canvas');
  const renderer = makeRenderer(canvas);
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 4.2, 10.5);
  camera.lookAt(0, 1.1, 0);
  lights(scene);

  const dio = new THREE.Group();
  scene.add(dio);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.3, 48), toon('#2a8fa0'));
  water.position.y = -0.55;
  dio.add(water);
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 4.1, 0.6, 40), toon('#eed9a2'));
  sand.position.y = -0.3;
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.4, 0.25, 40), toon('#5cbf72'));
  grass.position.y = -0.02;
  dio.add(shadowAll(sand), shadowAll(grass));
  const path = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 5.6), toon('#efdcaa'));
  path.position.set(0.4, 0.12, 0);
  path.rotation.y = 0.5;
  dio.add(shadowAll(path));

  // Portal
  const portal = new THREE.Group();
  portal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.16, 24), toon('#2c4f4b')));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.11, 10, 32), toon(PALETTE.cyan, { emissive: PALETTE.cyan, emissiveIntensity: 0.6 }));
  ring.position.y = 1;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
  disc.position.y = 1;
  portal.add(ring, disc);
  portal.position.set(1.5, 0.1, -1.6);
  portal.rotation.y = -0.4;
  dio.add(shadowAll(portal));

  // Pohon kelapa sederhana
  [[-2.4, -1.2, 1], [2.6, 0.9, 0.8], [-1.6, 2.2, 0.7]].forEach(([x, z, s]) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.4, 7), toon('#9a6b40'));
    trunk.position.y = 1.2;
    g.add(trunk);
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 4), toon(i % 2 ? '#3f9a5a' : '#4fb56a'));
      leaf.geometry.translate(0, 0.7, 0);
      leaf.rotation.set(1.95, (i / 6) * Math.PI * 2, 0, 'YXZ');
      leaf.scale.z = 0.35;
      leaf.position.y = 2.4;
      g.add(leaf);
    }
    g.scale.setScalar(s);
    g.position.set(x, 0.1, z);
    dio.add(shadowAll(g));
  });
  // Blok tempe + kepingan arsip
  const tempe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), toon('#e9d8a6'));
  tempe.position.set(-2.1, 1.4, 0.8);
  dio.add(shadowAll(tempe));
  const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), toon(PALETTE.gold, { emissive: '#c98a1a', emissiveIntensity: 0.6 }));
  shard.scale.set(0.7, 1.15, 0.35);
  shard.position.set(-2.1, 2, 0.8);
  dio.add(shard);

  const explorer = shadowAll(createExplorer(PALETTE.cyan));
  explorer.position.set(-0.5, 0.11, 0.9);
  explorer.rotation.y = 0.15;
  const nara = shadowAll(createNara());
  nara.position.set(0.9, 0.11, 0.6);
  nara.rotation.y = -0.6;
  nara.scale.setScalar(0.85);
  dio.add(explorer, nara);

  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    fit(renderer, camera, canvas);
    if (!reduceMotion) dio.rotation.y = Math.sin(t * 0.25) * 0.5;
    ring.rotation.z += dt;
    disc.material.opacity = 0.35 + Math.sin(t * 3) * 0.1;
    shard.rotation.y += dt * 2;
    shard.position.y = 2 + Math.sin(t * 2) * 0.1;
    // Penjelajah melompat kecil sesekali
    const hop = Math.max(0, Math.sin(t * 2.2)) ** 6 * 0.5;
    explorer.position.y = 0.11 + hop;
    explorer.userData.animate(dt, { speed: 0, airborne: hop > 0.08, height: hop });
    nara.userData.animate(dt);
    nara.userData.wave(dt);
    renderer.render(scene, camera);
  }
  loop();
}

function turntable(canvas) {
  const renderer = makeRenderer(canvas);
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  lights(scene);
  const isNara = canvas.dataset.character === 'nara';
  const model = shadowAll(isNara ? createNara() : createExplorer(PALETTE.cyan));
  scene.add(model);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.2, 32), toon('#16393a'));
  pedestal.position.y = -0.1;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
  camera.position.set(0, 1.6, 5.6);
  camera.lookAt(0, isNara ? 1.15 : 0.95, 0);
  const clock = new THREE.Clock();
  let visible = false;
  let dragging = null;
  let spin = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  canvas.addEventListener('pointerdown', (e) => { dragging = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (dragging !== null) { spin += (e.clientX - dragging) * 0.01; dragging = e.clientX; } });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  let first = true;
  function loop() {
    requestAnimationFrame(loop);
    if (!visible && !first) return;
    first = false;
    const dt = Math.min(0.05, clock.getDelta());
    fit(renderer, camera, canvas);
    if (dragging === null && !reduceMotion) spin += dt * 0.6;
    model.rotation.y = spin;
    model.userData.animate(dt, { speed: 0 });
    renderer.render(scene, camera);
  }
  loop();
}

if (webgl()) {
  try {
    heroScene();
    document.querySelectorAll('.char-canvas').forEach(turntable);
  } catch (err) {
    console.error(err);
    document.getElementById('hero-fallback').hidden = false;
  }
} else {
  document.getElementById('hero-fallback').hidden = false;
  document.querySelectorAll('.char-canvas').forEach((c) => { c.hidden = true; });
}
