/*
 * Langit NUTRANTARA: kubah langit bergradasi dengan matahari dan halo cahaya (shader),
 * awan kumulus berbayang (sprite bertekstur noise), dan lautan awan berlapis di bawah kepulauan.
 * Semua tekstur dibuat di kanvas saat dimuat (tanpa berkas gambar), jadi tetap jalan offline.
 * Dipakai oleh dunia 3D (world3d.js) dan lobi (app.js).
 */
import * as THREE from './vendor/three/three.module.min.js';

// Arah datang cahaya matahari. Lampu arah (bayangan) harus memakai arah yang sama.
export const SUN_DIR = new THREE.Vector3(-0.7, 0.5, -0.5).normalize();

// ---------- Noise (dapat diulang/tileable) ----------
function hash(i, j, seed) {
  const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, y, per, seed) {
  const xi = Math.floor(x); const yi = Math.floor(y);
  const fx = x - xi; const fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx); const uy = fy * fy * (3 - 2 * fy);
  const w = (v) => ((v % per) + per) % per;
  const i0 = w(xi); const i1 = w(xi + 1); const j0 = w(yi); const j1 = w(yi + 1);
  const a = hash(i0, j0, seed); const b = hash(i1, j0, seed); const c = hash(i0, j1, seed); const d = hash(i1, j1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
// fbm: x, y dalam satuan kisi; per = periode oktaf dasar (agar tekstur menyambung).
function fbm(x, y, per, seed, oct = 5) {
  let v = 0; let amp = 0.5; let f = 1; let sum = 0;
  for (let k = 0; k < oct; k += 1) { v += amp * noise(x * f, y * f, per * f, seed + k * 13); sum += amp; amp *= 0.5; f *= 2; }
  return v / sum;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// Tekstur dari data mentah (bukan kanvas): kanvas mengalikan warna dengan alfa sehingga
// piksel transparan menjadi hitam dan menimbulkan tepi/bintik gelap.
function dataTexture(data, w, h) {
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}

// ---------- Kubah langit + matahari ----------
export function createSkyDome({ radius = 650, zenith = '#3d8fdc', horizon = '#bfe9fb', sunColor = '#fff1c9', sunDir = SUN_DIR } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      zenith: { value: new THREE.Color(zenith) },
      horizon: { value: new THREE.Color(horizon) },
      sunColor: { value: new THREE.Color(sunColor) },
      sunDir: { value: sunDir.clone().normalize() }
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: `
      uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        float t = pow(clamp(h, 0.0, 1.0), 0.5);
        vec3 col = mix(horizon, zenith, t);
        float mu = max(dot(d, sunDir), 0.0);
        // Hamburan: kabut terang di sekitar matahari, lebih kuat dekat cakrawala.
        col += sunColor * (pow(mu, 6.0) * 0.18 + pow(mu, 48.0) * 0.35) * (1.0 - 0.5 * t);
        // Halo dan cakram matahari.
        col += sunColor * pow(mu, 600.0) * 0.9;
        col = mix(col, vec3(1.0, 0.99, 0.95), smoothstep(0.99955, 0.99975, mu));
        // Di bawah cakrawala: menyatu dengan warna kabut lautan awan.
        col = mix(col, horizon, clamp(-h * 6.0, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat);
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  // Kubah selalu berpusat di kamera agar langit tak pernah "terlewati".
  dome.onBeforeRender = (r, s, cam) => { dome.position.copy(cam.position); dome.updateMatrixWorld(); };
  return dome;
}

// ---------- Awan kumulus ----------
function cumulusData(seed, w, h) {
  const img = { data: new Uint8Array(w * h * 4) };
  let s = seed * 9301 + 49297;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const base = 0.8; // dasar awan relatif tinggi kanvas (rata seperti kumulus asli)
  const blobs = [];
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i += 1) {
    const u = 0.22 + (i / (n - 1)) * 0.56 + (r() - 0.5) * 0.08;
    const mid = 1 - Math.abs(u - 0.5) * 1.7; // gumpalan tengah lebih besar → bentuk kubah
    const rad = (0.1 + mid * 0.13 + r() * 0.05) * w;
    blobs.push({ x: u * w, y: Math.max(rad * 1.3, base * h - rad * (0.35 + r() * 0.9)), r: rad });
  }
  const density = (x, y) => {
    let d = 0;
    for (const b of blobs) { const q = ((x - b.x) ** 2 + (y - b.y) ** 2) / (b.r * b.r); d += Math.exp(-q * 1.6); }
    d += (fbm(x / 22, y / 22, 64, seed, 4) - 0.5) * 0.9;
    const edge = base * h + (fbm(x / 14, 3.7, 64, seed + 5, 3) - 0.5) * 10; // dasar sedikit bergelombang
    const frame = smooth(0, 10, x) * smooth(w, w - 10, x) * smooth(0, 10, y); // jangan sampai terpotong tepi
    return d * smooth(edge + 6, edge - 16, y) * frame;
  };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = density(x, y);
      const a = smooth(0.3, 0.62, d);
      const i = (y * w + x) * 4;
      if (a <= 0) { img.data.set([255, 253, 248, 0], i); continue; }
      // Bayangan diri: makin banyak awan di atas-samping (arah cahaya), makin gelap.
      const above = density(x - 6, y - 10);
      let light = Math.exp(-1.5 * Math.max(0, above - 0.35));
      light *= 1 - 0.3 * smooth(0.35, 0.78, y / h); // perut awan lebih kelabu
      light = Math.min(1, light + (1 - a) * 0.25); // tepi tipis tembus cahaya
      img.data[i] = mix(162, 255, light);
      img.data[i + 1] = mix(176, 253, light);
      img.data[i + 2] = mix(198, 248, light);
      img.data[i + 3] = a * 255;
    }
  }
  return img.data;
}

export function cumulusTextures(count = 4, quality = 'high') {
  const w = quality === 'high' ? 256 : 128;
  return Array.from({ length: count }, (_, k) => {
    const h = Math.round(w * 0.75);
    return dataTexture(cumulusData(k * 17 + 3, w, h), w, h);
  });
}

/** Satu awan kumulus (sprite selalu menghadap kamera). width = lebar dalam satuan dunia. */
export function createCumulus(tex, width, { opacity = 1, tint = '#ffffff', fog = true } = {}) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: tint, transparent: true, opacity, depthWrite: false, fog }));
  const img = tex.image;
  sp.scale.set(width, width * (img.height / img.width), 1);
  sp.center.set(0.5, 0.2); // titik pijak di dasar awan
  return sp;
}

// ---------- Lautan awan ----------
// Menghasilkan dua tekstur dari medan noise yang sama: dasar padat dan gumpalan tembus pandang.
function seaData(size, seed) {
  const solid = new Uint8Array(size * size * 4);
  const puffs = new Uint8Array(size * size * 4);
  const P = 6;
  const field = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) field[y * size + x] = fbm((x / size) * P, (y / size) * P, P, seed, 6);
  const at = (x, y) => field[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  const sh = Math.max(1, Math.round(size / 128));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = at(x, y);
      // Relief: sisi yang menghadap cahaya lebih terang, lembah gumpalan lebih kelabu.
      const bump = (n - at(x - 2 * sh, y - 2 * sh)) * 7;
      const light = Math.min(1, Math.max(0, 0.25 + smooth(0.3, 0.75, n) * 0.6 + bump));
      const i = (y * size + x) * 4;
      const rgb = [mix(168, 255, light), mix(186, 254, light), mix(212, 250, light)];
      solid.set([...rgb, 255], i);
      puffs.set([...rgb, smooth(0.44, 0.64, n) * 255], i);
    }
  }
  return { solid, puffs };
}

/**
 * Lautan awan: satu lapisan dasar padat + lapisan gumpalan tembus pandang yang bergeser pelan
 * dengan kecepatan berbeda (memberi kesan kedalaman/paralaks). Panggil group.userData.update(dt).
 */
export function createCloudSea({ radius = 460, y = -15, quality = 'high', renderer = null } = {}) {
  const group = new THREE.Group();
  const size = quality === 'high' ? 256 : 128;
  const { solid, puffs } = seaData(size, 11);
  const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  const prep = (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; return t; };
  const solidTex = prep(dataTexture(solid, size, size));
  const puffTex = prep(dataTexture(puffs, size, size));
  const geo = new THREE.CircleGeometry(radius, 64);
  geo.rotateX(-Math.PI / 2);
  const layers = [
    { dy: -2.2, rep: 9, speed: [0.0012, 0.0005], color: '#d9e4f0', transparent: false },
    { dy: 0, rep: 7, speed: [0.0024, -0.0009], color: '#ffffff', transparent: true },
    { dy: 1.5, rep: 12, speed: [-0.0016, 0.0019], color: '#ffffff', transparent: true, opacity: 0.85 }
  ];
  const used = quality === 'high' ? layers : layers.slice(0, 2);
  const scrolls = used.map((L, k) => {
    const tex = k === 0 ? solidTex : k === 1 ? puffTex : puffTex.clone();
    const dens = radius / 460; // kepadatan awan tetap sama walau lautan awan diperluas
    tex.repeat.set(L.rep * dens, L.rep * dens);
    tex.offset.set(k * 0.37, k * 0.61);
    const m = new THREE.MeshBasicMaterial({ map: tex, color: L.color, transparent: L.transparent, opacity: L.opacity ?? 1, depthWrite: !L.transparent });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = y + L.dy;
    mesh.rotation.y = k * 1.3;
    mesh.renderOrder = L.transparent ? -10 + k : 0;
    group.add(mesh);
    return { tex, speed: L.speed };
  });
  group.userData.update = (dt) => scrolls.forEach((s) => { s.tex.offset.x += s.speed[0] * dt; s.tex.offset.y += s.speed[1] * dt; });
  return group;
}
