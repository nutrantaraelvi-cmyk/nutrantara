/* Landing page NUTRANTARA: diorama 3D, putaran karakter, kartu pos, dan peta SVG. */
import * as THREE from './vendor/three/three.module.min.js';
import { createExplorer, createNara, toon, PALETTE } from './characters.js';
import { createMeru, createPenjor, createKite, createCorn, createTempe, createPapaya, createStupa } from './culture.js';
import { createFloatingMap } from './peta3d.js';

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
  const COL = { 0: '#78f4bd', 1: '#ff9f91', 2: '#ffd17c', 3: '#f59e5b', 4: '#68dce7', 5: '#c58cf0', 6: '#ffd17c' };
  const K = W.width / 2400; // peta 0.9 jauh lebih luas: ikon, teks, dan awan ikut diskalakan
  const clouds = Array.from({ length: 16 }, (_, k) => `<ellipse cx="${((k * 137 * K) % W.width).toFixed(0)}" cy="${((40 + ((k * 89) % 540)) * K).toFixed(0)}" rx="${(50 + (k % 4) * 14) * K}" ry="${16 * K}" fill="#fff" opacity=".7"/>`).join('');
  const bridges = W.bridges.map((br) => `<line x1="${br.a[0]}" y1="${br.a[1]}" x2="${br.b[0]}" y2="${br.b[1]}" stroke="#68dce7" stroke-width="${Math.max(br.w * 0.8, 10 * K)}" stroke-linecap="round" opacity=".85"/><line x1="${br.a[0]}" y1="${br.a[1]}" x2="${br.b[0]}" y2="${br.b[1]}" stroke="#fff" stroke-width="${3 * K}" stroke-dasharray="${8 * K} ${10 * K}" class="m-route"/>`).join('');
  const islands = W.islands.map((isl) => {
    const m = MISSIONS.find((mm) => mm.id === isl.id);
    const isBig = isl.rx > 1000;
    const s = Math.max(isl.rx, 40 * K) / isl.rx; // pulau kecil tetap terlihat di samping wilayah pos yang luas
    const rx = isl.rx * s; const ry = isl.ry * s;
    return `<g><ellipse cx="${isl.cx}" cy="${isl.cy + 16 * K}" rx="${rx * 0.8}" ry="${ry * 0.9}" fill="#6f5a48"/><ellipse cx="${isl.cx}" cy="${isl.cy}" rx="${rx + 6 * K}" ry="${ry + 6 * K}" fill="#ecd8a0"/><ellipse cx="${isl.cx}" cy="${isl.cy}" rx="${rx}" ry="${ry}" fill="url(#g-grass)"/>
      <g transform="translate(${isl.cx} ${isl.cy}) scale(${isBig ? K * 3 : K * 1.6})">${isl.id ? `<g transform="translate(0 -6)"><circle r="22" fill="#0e2426" stroke="${COL[isl.id]}" stroke-width="4"/><text y="7" text-anchor="middle" class="m-num" style="fill:${COL[isl.id]}">${isl.id}</text></g>` : ''}
      <text y="${isl.id ? 34 : 6}" text-anchor="middle" class="m-lbl">${esc(m ? `${m.title} ${m.titleEm}` : isl.name).toUpperCase()}</text></g></g>`;
  }).join('');
  document.getElementById('map-svg').innerHTML = `
    <svg viewBox="0 0 ${W.width} ${W.height}" aria-hidden="true">
      <defs><radialGradient id="g-grass" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#6ccb72"/><stop offset="1" stop-color="#3f9a5a"/></radialGradient>
      <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fdbe6"/><stop offset="1" stop-color="#e8f7fa"/></linearGradient></defs>
      <rect width="${W.width}" height="${W.height}" fill="url(#g-sky)"/>
      ${clouds}${bridges}${islands}
      <g transform="translate(${W.nara.x} ${W.nara.y}) scale(${K * 1.6})"><circle r="11" fill="#f2fff8"/><rect x="-7" y="-4" width="14" height="6" rx="2" fill="#0b1f21"/><text y="-18" text-anchor="middle" class="m-nara">NARA</text></g>
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
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.3, 48), toon('#ffffff'));
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
  // Budaya & pangan lokal
  const meru = shadowAll(createMeru(7, 0.55)); meru.position.set(-2.2, 0.1, -1.6); dio.add(meru);
  const penjor = shadowAll(createPenjor(0.55)); penjor.position.set(2.6, 0.1, -0.4); penjor.scale.x *= -1; dio.add(penjor);
  const stupa = shadowAll(createStupa(0.35)); stupa.position.set(2.4, 0.1, 1.8); dio.add(stupa);
  [[createCorn(0.7), -1.2, 0.45, 2.3, 1.3], [createTempe(0.6), 0.1, 0.2, 2.6, 0], [createPapaya(0.7), 1.2, 0.22, 2.4, 0]].forEach(([o, x, y, z, rz]) => { shadowAll(o); o.position.set(x, y, z); o.rotation.z = rz; dio.add(o); });
  const kite = createKite('#e2553f', '#f5b72b'); kite.scale.setScalar(0.45); kite.position.set(-2.8, 4.6, -1); scene.add(kite);
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
    kite.position.y = 4.6 + Math.sin(t * 1.4) * 0.25; kite.rotation.z = Math.sin(t * 1.1) * 0.25; kite.userData.tail.forEach((b, j) => { b.position.x = Math.sin(t * 5 + j) * 0.1 * j; });
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
  // Peta kepulauan melayang 3D; peta SVG tetap menjadi cadangan bila gagal.
  try {
    const host = document.getElementById('map-svg');
    createFloatingMap(host, W, MISSIONS, { reduceMotion });
    host.querySelector('svg').style.display = 'none';
  } catch (err) {
    console.error(err);
    const host = document.getElementById('map-svg');
    host.classList.remove('map3d');
    host.querySelectorAll('.map3d-canvas, .map3d-pins, .map3d-hint').forEach((el) => el.remove());
  }
} else {
  document.getElementById('hero-fallback').hidden = false;
  document.querySelectorAll('.char-canvas').forEach((c) => { c.hidden = true; });
}
