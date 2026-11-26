/*
 * Cuaca tiap pulau NUTRANTARA (sejak 1.1).
 * Tiap pulau punya iklim sendiri dengan 2–4 cuaca yang bergilir setiap 8 menit. Gilirannya dihitung dari jam
 * (Date.now), jadi semua pemain melihat cuaca yang sama tanpa beban server. Cuaca hanya mengubah suasana: kabut,
 * warna langit, cahaya, partikel (hujan, embun beku, abu, daun, debu), petir lembut, dan pelangi. Tidak ada
 * hukuman gerak. Petir dimatikan dan partikel dikurangi bila "kurangi gerakan" aktif; kilatnya paling banyak
 * 2 kali per detik.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { SUN_DIR } from './sky.js';

export const PERIOD_MIN = 8;
const PERIOD = PERIOD_MIN * 60 * 1000;

/** Jenis cuaca. fog/near = pengali jarak akhir/awal kabut; hemi/sun = pengali cahaya; fall = partikel. */
export const WEATHER = {
  cerah: { label: 'Cerah', icon: '☀️', fog: 1, fogColor: '#bfe9fb', zenith: '#3d8fdc', horizon: '#bfe9fb', hemi: 1, sun: 1, sunColor: '#ffe9b8' },
  berawan: { label: 'Berawan', icon: '⛅', fog: 0.85, fogColor: '#d0dde6', zenith: '#7a9fc0', horizon: '#d3e1ea', hemi: 0.95, sun: 0.55, sunColor: '#f4ead2' },
  gerimis: { label: 'Gerimis', icon: '🌦️', fog: 0.72, fogColor: '#c3d2dc', zenith: '#7d97ad', horizon: '#c9d6df', hemi: 0.9, sun: 0.45, sunColor: '#eee6d6', fall: { type: 'hujan', amount: 0.35 } },
  hujan: { label: 'Hujan tropis', icon: '🌧️', fog: 0.58, near: 0.45, fogColor: '#a9b9c4', zenith: '#5f7488', horizon: '#aebdc7', hemi: 0.8, sun: 0.28, sunColor: '#e0dcd2', fall: { type: 'hujan', amount: 1 } },
  badai: { label: 'Badai petir', icon: '⛈️', fog: 0.48, near: 0.3, fogColor: '#8795a1', zenith: '#3b4a5a', horizon: '#8e9ba6', hemi: 0.66, sun: 0.15, sunColor: '#d6d8dc', fall: { type: 'hujan', amount: 1, wind: 7 }, petir: true },
  kabut: { label: 'Kabut tebal', icon: '🌫️', fog: 0.22, near: 0.04, fogColor: '#e4ecef', zenith: '#b7c9d4', horizon: '#e4ecef', hemi: 1, sun: 0.45, sunColor: '#f1ede4' },
  embun: { label: 'Embun beku', icon: '❄️', fog: 0.55, near: 0.3, fogColor: '#e8f2fa', zenith: '#8fb6d8', horizon: '#e8f2fa', hemi: 1.05, sun: 0.7, sunColor: '#e8f4ff', fall: { type: 'embun', amount: 0.85 } },
  terik: { label: 'Terik', icon: '🔆', fog: 1.08, fogColor: '#f6ecd0', zenith: '#2f86d8', horizon: '#f4ead0', hemi: 1.08, sun: 1.25, sunColor: '#fff0c0' },
  angin: { label: 'Berangin', icon: '🌬️', fog: 0.92, fogColor: '#d6e8ef', zenith: '#4e98d6', horizon: '#d2e8f1', hemi: 1, sun: 0.9, sunColor: '#ffe9b8', fall: { type: 'daun', amount: 0.75, wind: 8 } },
  debu: { label: 'Angin berpasir', icon: '🏜️', fog: 0.55, near: 0.2, fogColor: '#e9d3a6', zenith: '#b9a27a', horizon: '#ead6ac', hemi: 0.95, sun: 0.8, sunColor: '#ffe2b0', fall: { type: 'debu', amount: 0.9, wind: 12 } },
  abu: { label: 'Hujan abu tipis', icon: '🌋', fog: 0.55, near: 0.3, fogColor: '#b8aea6', zenith: '#7f7570', horizon: '#c2b6ab', hemi: 0.85, sun: 0.55, sunColor: '#ffd0a0', fall: { type: 'abu', amount: 0.8 } },
  salju: { label: 'Hujan salju', icon: '🌨️', fog: 0.6, near: 0.3, fogColor: '#eef4f9', zenith: '#9dbbd6', horizon: '#eef4f9', hemi: 1.08, sun: 0.6, sunColor: '#eef6ff', fall: { type: 'salju', amount: 1, wind: 1.5 } },
  kelopak: { label: 'Kelopak berguguran', icon: '🌸', fog: 0.95, fogColor: '#f3e4ee', zenith: '#5aa0dc', horizon: '#f1e2ec', hemi: 1.02, sun: 0.95, sunColor: '#fff0e6', fall: { type: 'kelopak', amount: 0.7, wind: 3 } },
  gugur: { label: 'Daun berguguran', icon: '🍂', fog: 0.9, fogColor: '#efdcc0', zenith: '#6a9ccc', horizon: '#eedcc2', hemi: 1, sun: 0.85, sunColor: '#ffdcae', fall: { type: 'gugur', amount: 0.8, wind: 4 } },
  pelangi: { label: 'Pelangi', icon: '🌈', fog: 0.95, fogColor: '#c9eaf7', zenith: '#4b98d8', horizon: '#cdebf7', hemi: 1, sun: 1, sunColor: '#fff1cf', rainbow: true }
};

/**
 * Musim tiap pulau (sejak 1.4). Kepulauan melayang ini punya musim yang berbeda-beda dan tetap per pulau, jadi semua
 * pemain melihat musim yang sama tanpa server. Musim mengubah warna daun, bunga, rumput, tutupan tanah, buah/salju
 * di pohon (region.js, world3d.js), warna rumput medan blok (terrain.js), dan cuaca yang bergilir di bawah ini.
 * leaf = warna tajuk; bloom = sebagian pohon berbunga merah muda; fruit = warna buah; snow = topi salju;
 * ground = warna rumput & seberapa kuat dicampur; cover = warna serakan di tanah (daun, kelopak, salju, genangan).
 */
export const SEASONS = {
  semi: { name: 'Musim Semi', icon: '🌸', desc: 'pohon berbunga merah muda dan padang bunga', leaf: ['#5fc46a', '#7fd36e', '#94dd78'], bloom: ['#f7a8c8', '#f9c4da', '#ffffff'], flowers: ['#f472b6', '#ff9fc4', '#ffffff', '#ffd17c', '#c89bf0'], grass: ['#74cc62', '#8fd86c'], ground: ['#86d66a', 0.35], cover: ['#f7b6d0', '#ffffff', '#f9cfe0'], coverN: 1 },
  panen: { name: 'Musim Panen', icon: '🥭', desc: 'pohon berbuah lebat dan jerami menumpuk', leaf: ['#3f9a5a', '#4fb56a', '#5aa84a'], fruit: ['#f5a623', '#e5533f', '#f5d43b', '#ff7a2f'], flowers: ['#ffd17c', '#f59e5b', '#ffffff', '#ff9f91'], grass: ['#8fbf4a', '#b5bf52'], ground: ['#a9c45a', 0.3], cover: ['#e9c46a', '#d9a94a'], coverN: 0.6, hay: true },
  hujan: { name: 'Musim Hujan', icon: '🌧️', desc: 'hutan hijau pekat, genangan, dan jamur', leaf: ['#2f8a4c', '#3a9a52', '#2a7d46'], flowers: ['#ffffff', '#ffd17c', '#9fc8ff'], grass: ['#4fb256', '#5cbf5e'], ground: ['#5cb85a', 0.3], cover: ['#8fd3ea', '#7cc7e2'], coverN: 0.5, puddle: true, mushrooms: 1.6 },
  kemarau: { name: 'Musim Kemarau', icon: '🌾', desc: 'rumput menguning, daun kering, dan tanah retak', leaf: ['#9aa84a', '#b5a842', '#8a9a3a'], flowers: ['#f5d43b', '#f59e5b', '#ffffff'], grass: ['#d4bf62', '#c4ad52'], ground: ['#d2c070', 0.55], cover: ['#c9a45a', '#b58a45', '#d9b870'], coverN: 0.9, hay: true },
  gugur: { name: 'Musim Gugur', icon: '🍂', desc: 'daun jingga dan merah berguguran', leaf: ['#e2853f', '#f5b72b', '#c9512f', '#d96a2b', '#b8643a'], flowers: ['#f5b72b', '#e2553f', '#ffffff'], grass: ['#b9a85a', '#c9a24c'], ground: ['#c2ab5c', 0.45], cover: ['#e2853f', '#f5b72b', '#c9512f'], coverN: 1.3, mushrooms: 1 },
  dingin: { name: 'Musim Dingin', icon: '❄️', desc: 'salju menutup bukit, pinus berselimut putih', leaf: ['#2f6f4c', '#3b7d58', '#2a6a48'], snow: true, flowers: ['#ffffff', '#cfe6ff'], grass: ['#dfeef5', '#cfe3d8'], ground: ['#f1f7fb', 0.75], cover: ['#ffffff', '#eef6fb'], coverN: 1.1 }
};
const ISLAND_SEASON = { 0: 'semi', 1: 'panen', 2: 'semi', 3: 'dingin', 4: 'hujan', 5: 'kemarau', 6: 'gugur', 7: 'panen', 8: 'hujan', 9: 'dingin', 10: 'kemarau', 11: 'gugur', 12: 'panen' };
/** Musim pulau (objek SEASONS + key). */
export function seasonOf(id) {
  const key = ISLAND_SEASON[id] || 'semi';
  return { key, ...SEASONS[key] };
}

/** Iklim tiap pulau: nama dan urutan cuaca yang bergilir (mengikuti musimnya). */
export const CLIMATES = {
  0: { name: 'Sejuk alun-alun', cycle: ['cerah', 'kelopak', 'berawan', 'cerah'] },
  1: { name: 'Hutan tropis lembap', cycle: ['cerah', 'gerimis', 'berawan', 'gerimis'] },
  2: { name: 'Lembah sungai berbunga', cycle: ['hujan', 'pelangi', 'kelopak', 'cerah'] },
  3: { name: 'Pegunungan bersalju', cycle: ['salju', 'kabut', 'embun', 'cerah'] },
  4: { name: 'Rawa berbadai', cycle: ['badai', 'hujan', 'berawan', 'gerimis'] },
  5: { name: 'Gurun pasir & savana kering', cycle: ['terik', 'debu', 'cerah'] },
  6: { name: 'Lereng gunung api', cycle: ['abu', 'gugur', 'berawan', 'cerah'] },
  7: { name: 'Sawah berembun', cycle: ['gerimis', 'pelangi', 'cerah'] },
  8: { name: 'Hutan bambu basah', cycle: ['hujan', 'angin', 'gerimis', 'berawan'] },
  9: { name: 'Kawah bersalju', cycle: ['salju', 'kabut', 'cerah'] },
  10: { name: 'Pantai tropis', cycle: ['terik', 'angin', 'cerah'] },
  11: { name: 'Bukit berangin', cycle: ['gugur', 'angin', 'cerah', 'berawan'] },
  12: { name: 'Kebun rempah basah', cycle: ['hujan', 'cerah', 'gerimis'] }
};

/** Cuaca pulau sekarang dan berikutnya (deterministik dari jam). */
export function forecast(id, now = Date.now()) {
  const climate = CLIMATES[id] || CLIMATES[0];
  const slot = Math.floor(now / PERIOD);
  const off = (Math.max(0, id) * 5) % climate.cycle.length;
  const kind = climate.cycle[(slot + off) % climate.cycle.length];
  const next = climate.cycle[(slot + off + 1) % climate.cycle.length];
  return { climate, kind, next, minutesLeft: Math.max(1, Math.ceil((PERIOD - (now % PERIOD)) / 60000)) };
}

// Partikel per jenis jatuhan.
const FALL = {
  hujan: { colors: ['#d8ecf8'] },
  embun: { colors: ['#ffffff', '#e3f2ff'], speed: 1.3, size: 0.28, sway: 0.8 },
  abu: { colors: ['#9a918b', '#b3aaa3', '#7f7772'], speed: 1.6, size: 0.24, sway: 0.5 },
  daun: { colors: ['#4fb56a', '#8ccf66', '#f5b72b', '#e2853f'], speed: 1.8, size: 0.36, sway: 1.4 },
  debu: { colors: ['#e3c48e', '#d9b77c', '#efd7a8'], speed: 0.3, size: 0.18, sway: 0.4, low: true },
  salju: { colors: ['#ffffff', '#f2f8ff'], speed: 1.5, size: 0.34, sway: 0.7 },
  kelopak: { colors: ['#f7a8c8', '#f9c4da', '#ffffff', '#f472b6'], speed: 1.1, size: 0.3, sway: 1.6 },
  gugur: { colors: ['#e2853f', '#f5b72b', '#c9512f', '#d96a2b'], speed: 1.5, size: 0.38, sway: 1.5 }
};
const WIND = new THREE.Vector3(0.8, 0, 0.6).normalize();
const RAIN_BOX = 30; const RAIN_H = 18;
const FLAKE_BOX = 26; const FLAKE_H = 12;

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * opts: { scene, sky (kubah langit dari sky.js), hemi, sun, gfx, reduce }
 */
export function createWeather({ scene, sky, hemi, sun, gfx = 'high', reduce = false }) {
  const U = sky.material.uniforms;
  const base = { hemi: hemi.intensity, sun: sun.intensity, sunUniform: U.sunColor.value.clone() };
  // Nilai yang sedang dipakai (dicampur halus menuju cuaca tujuan).
  const mix = {
    fog: 1, near: 1, hemi: 1, sun: 1, rain: 0, flake: 0, wind: 0, rainbow: 0, petir: 0,
    fogColor: new THREE.Color(WEATHER.cerah.fogColor), zenith: new THREE.Color(WEATHER.cerah.zenith),
    horizon: new THREE.Color(WEATHER.cerah.horizon), sunColor: new THREE.Color(WEATHER.cerah.sunColor)
  };
  const tmp = new THREE.Color();
  const flashColor = new THREE.Color('#e6eeff');
  let quality = gfx;
  const caps = () => {
    const k = reduce ? 0.25 : 1;
    return quality === 'low' ? { rain: Math.round(500 * k), flake: Math.round(320 * k) } : { rain: Math.round(1500 * k), flake: Math.round(850 * k) };
  };
  const MAX_RAIN = 1500; const MAX_FLAKE = 850;

  // ---- Hujan: garis pendek miring ----
  const rainPos = new Float32Array(MAX_RAIN * 6);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#d8ecf8', transparent: true, opacity: 0.55, depthWrite: false }));
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);
  // ---- Butiran: embun beku, abu, daun, debu ----
  const flakePos = new Float32Array(MAX_FLAKE * 3);
  const flakeCol = new Float32Array(MAX_FLAKE * 3);
  const flakeGeo = new THREE.BufferGeometry();
  flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
  flakeGeo.setAttribute('color', new THREE.BufferAttribute(flakeCol, 3));
  const flakeMat = new THREE.PointsMaterial({ size: 0.17, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.9 });
  const flakes = new THREE.Points(flakeGeo, flakeMat);
  flakes.frustumCulled = false;
  flakes.visible = false;
  scene.add(flakes);
  let flakeType = null;
  let seededAt = null;
  // ---- Petir & pelangi ----
  const boltPos = new Float32Array(14 * 6);
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3));
  const bolt = new THREE.LineSegments(boltGeo, new THREE.LineBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0, fog: false, depthWrite: false }));
  bolt.frustumCulled = false;
  bolt.visible = false;
  scene.add(bolt);
  const RB_IN = 240; const RB_W = 30;
  const rbGeo = new THREE.RingGeometry(RB_IN, RB_IN + RB_W, 64, 7, 0, Math.PI);
  const RB = ['#9b6bd6', '#5b6be0', '#3fa7e8', '#4fc46a', '#f5d43b', '#f59a3b', '#e5533f'].map((c) => new THREE.Color(c));
  const rbp = rbGeo.attributes.position;
  const rbc = new Float32Array(rbp.count * 3);
  for (let i = 0; i < rbp.count; i += 1) {
    const t = Math.min(0.999, Math.max(0, (Math.hypot(rbp.getX(i), rbp.getY(i)) - RB_IN) / RB_W)) * (RB.length - 1);
    tmp.copy(RB[Math.floor(t)]).lerp(RB[Math.min(RB.length - 1, Math.floor(t) + 1)], t % 1);
    rbc.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  rbGeo.setAttribute('color', new THREE.BufferAttribute(rbc, 3));
  const rainbow = new THREE.Mesh(rbGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  rainbow.visible = false;
  rainbow.renderOrder = -10;
  scene.add(rainbow);
  let flash = 0; let flashT = -1; let nextBolt = 6;

  const rand = Math.random;
  function seedRain(cam) {
    for (let i = 0; i < MAX_RAIN; i += 1) {
      rainPos[i * 6] = cam.x + (rand() * 2 - 1) * RAIN_BOX;
      rainPos[i * 6 + 1] = cam.y + (rand() * 2 - 1) * RAIN_H;
      rainPos[i * 6 + 2] = cam.z + (rand() * 2 - 1) * RAIN_BOX;
    }
  }
  function setFlakeType(type, cam) {
    flakeType = type;
    const def = FALL[type];
    flakeMat.size = def.size;
    for (let i = 0; i < MAX_FLAKE; i += 1) {
      flakePos[i * 3] = cam.x + (rand() * 2 - 1) * FLAKE_BOX;
      flakePos[i * 3 + 1] = def.low ? cam.y - 6 + rand() * 9 : cam.y + (rand() * 2 - 1) * FLAKE_H;
      flakePos[i * 3 + 2] = cam.z + (rand() * 2 - 1) * FLAKE_BOX;
      tmp.set(def.colors[i % def.colors.length]);
      flakeCol.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    flakeGeo.attributes.color.needsUpdate = true;
  }
  const wrap = (v, c, half) => (v - c > half ? v - half * 2 : v - c < -half ? v + half * 2 : v);

  function updateRain(dt, cam) {
    const n = Math.round(caps().rain * mix.rain);
    rain.visible = n > 0;
    if (!n) return;
    const vy = 22; const wind = mix.wind;
    const len = 0.9 / Math.hypot(vy, wind);
    for (let i = 0; i < n; i += 1) {
      const o = i * 6;
      let x = rainPos[o] + WIND.x * wind * dt; let y = rainPos[o + 1] - vy * dt; let z = rainPos[o + 2] + WIND.z * wind * dt;
      if (y < cam.y - RAIN_H) { y += RAIN_H * 2; x = cam.x + (rand() * 2 - 1) * RAIN_BOX; z = cam.z + (rand() * 2 - 1) * RAIN_BOX; }
      x = wrap(x, cam.x, RAIN_BOX); z = wrap(z, cam.z, RAIN_BOX);
      rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z;
      rainPos[o + 3] = x - WIND.x * wind * len; rainPos[o + 4] = y + vy * len; rainPos[o + 5] = z - WIND.z * wind * len;
    }
    rainGeo.setDrawRange(0, n * 2);
    rainGeo.attributes.position.needsUpdate = true;
  }

  function updateFlakes(dt, t, cam) {
    const n = Math.round(caps().flake * mix.flake);
    flakes.visible = n > 0 && Boolean(flakeType);
    if (!flakes.visible) return;
    const def = FALL[flakeType];
    const wind = mix.wind;
    for (let i = 0; i < n; i += 1) {
      const o = i * 3;
      const s = Math.sin(t * def.sway * 2 + i * 1.7) * def.sway;
      let x = flakePos[o] + (WIND.x * wind + s * 0.6) * dt;
      let y = flakePos[o + 1] - def.speed * (0.6 + (i % 5) * 0.12) * dt + (def.low ? Math.sin(t * 3 + i) * 0.4 * dt : 0);
      let z = flakePos[o + 2] + (WIND.z * wind + Math.cos(t * def.sway + i) * def.sway * 0.4) * dt;
      if (def.low) { if (y < cam.y - 6) y += 9; else if (y > cam.y + 3) y -= 9; } else if (y < cam.y - FLAKE_H) y += FLAKE_H * 2;
      x = wrap(x, cam.x, FLAKE_BOX); z = wrap(z, cam.z, FLAKE_BOX);
      flakePos[o] = x; flakePos[o + 1] = y; flakePos[o + 2] = z;
    }
    flakeGeo.setDrawRange(0, n);
    flakeGeo.attributes.position.needsUpdate = true;
  }

  function strike(cam) {
    const a = rand() * Math.PI * 2; const d = 150 + rand() * 120;
    let x = cam.x + Math.cos(a) * d; let z = cam.z + Math.sin(a) * d; let y = 150;
    for (let s = 0; s < 14; s += 1) {
      const ny = y - 11 - rand() * 4; const nx = x + (rand() - 0.5) * 14; const nz = z + (rand() - 0.5) * 14;
      boltPos.set([x, y, z, nx, ny, nz], s * 6);
      x = nx; y = ny; z = nz;
    }
    boltGeo.attributes.position.needsUpdate = true;
    boltGeo.computeBoundingSphere();
  }

  /**
   * Perbarui cuaca setiap bingkai.
   * ctx: { island (id pulau atau null), active (bermain/terjun), camera, fogNear, fogFar, maxFar }
   */
  let lastT = 0;
  function update(frameDt, t, { island, active, camera, fogNear, fogFar, maxFar = Infinity }) {
    // Waktu nyata (bukan langkah bingkai yang dibatasi): di laptop lambat pun cuaca berganti dalam ±4 detik.
    const nowT = performance.now();
    const dt = lastT ? Math.min(1, (nowT - lastT) / 1000) : frameDt;
    lastT = nowT;
    const kind = active && island !== null && island >= 0 ? forecast(island).kind : 'cerah';
    const w = WEATHER[kind];
    const k = active ? 1 - Math.exp(-dt / 1.4) : 1; // perpindahan cuaca ±4 detik; mode peta langsung cerah
    const lerp = (a, b) => a + (b - a) * k;
    mix.fog = lerp(mix.fog, w.fog); mix.near = lerp(mix.near, w.near ?? w.fog); mix.hemi = lerp(mix.hemi, w.hemi); mix.sun = lerp(mix.sun, w.sun);
    mix.wind = lerp(mix.wind, (w.fall && w.fall.wind) || 0);
    mix.rainbow = lerp(mix.rainbow, w.rainbow && !reduce ? 1 : 0);
    mix.petir = lerp(mix.petir, w.petir ? 1 : 0);
    mix.fogColor.lerp(tmp.set(w.fogColor), k); mix.zenith.lerp(tmp.set(w.zenith), k);
    mix.horizon.lerp(tmp.set(w.horizon), k); mix.sunColor.lerp(tmp.set(w.sunColor), k);
    const fall = active && w.fall ? w.fall : null;
    mix.rain = lerp(mix.rain, fall && fall.type === 'hujan' ? fall.amount : 0);
    // Butiran berganti jenis setelah yang lama habis.
    const wantFlake = fall && fall.type !== 'hujan' ? fall.type : null;
    if (wantFlake && wantFlake !== flakeType && mix.flake < 0.03) setFlakeType(wantFlake, camera.position);
    mix.flake = lerp(mix.flake, wantFlake && wantFlake === flakeType ? fall.amount : 0);

    // Petir lembut: dua kilatan pendek, jeda 7–15 detik; tidak ada saat "kurangi gerakan".
    if (active && mix.petir > 0.6 && !reduce) {
      nextBolt -= dt;
      if (nextBolt <= 0) { nextBolt = 7 + rand() * 8; flashT = 0; strike(camera.position); }
    }
    if (flashT >= 0) {
      flashT += dt;
      flash = Math.max(Math.exp(-flashT / 0.07), flashT > 0.2 ? Math.exp(-(flashT - 0.2) / 0.08) * 0.7 : 0);
      if (flashT > 0.7) { flashT = -1; flash = 0; }
    }
    bolt.visible = flash > 0.05;
    bolt.material.opacity = Math.min(1, flash * 1.2);

    // Terapkan ke langit, kabut, dan cahaya.
    const f = flash * 0.45;
    U.zenith.value.copy(mix.zenith).lerp(flashColor, f);
    U.horizon.value.copy(mix.horizon).lerp(flashColor, f);
    U.sunColor.value.copy(base.sunUniform).multiplyScalar(Math.min(1, mix.sun));
    scene.background.copy(mix.horizon);
    scene.fog.color.copy(mix.fogColor).lerp(flashColor, f);
    const far = Math.min(maxFar, fogFar * mix.fog);
    scene.fog.far = far;
    scene.fog.near = Math.min(far * 0.8, fogNear * mix.near);
    hemi.intensity = base.hemi * mix.hemi + flash * 1.1;
    sun.intensity = base.sun * mix.sun;
    sun.color.copy(mix.sunColor);

    // Partikel mengikuti kamera; disembunyikan di mode peta.
    const cam = camera.position;
    if (!seededAt) { seedRain(cam); seededAt = true; }
    const pdt = Math.min(0.1, dt); // gerak partikel: langkah dibatasi agar tidak melompat jauh
    if (active) { updateRain(pdt, cam); updateFlakes(pdt, t, cam); } else { rain.visible = false; flakes.visible = false; }
    rainbow.visible = active && mix.rainbow > 0.02;
    if (rainbow.visible) {
      // Pelangi selalu di arah membelakangi matahari, 450 m dari kamera (masih di dalam jarak pandang mode Ringan).
      const ax = -SUN_DIR.x; const az = -SUN_DIR.z; const al = Math.hypot(ax, az) || 1;
      rainbow.position.set(cam.x + (ax / al) * 450, cam.y - 70, cam.z + (az / al) * 450);
      rainbow.lookAt(cam.x, cam.y - 70, cam.z);
      rainbow.material.opacity = mix.rainbow * 0.34;
    }
  }

  return {
    update,
    setQuality(q) { quality = q; },
    get current() { return mix; }
  };
}
