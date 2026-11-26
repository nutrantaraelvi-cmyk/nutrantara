/*
 * Butik Nusantara (sejak 1.2): layar Toko, lemari busana, dan pratinjau 3D.
 * Siswa menukar poin hasil belajar dengan busana khas daerah (katalog di shop-data.js). Saldo = poin yang diperoleh
 * − poin yang sudah dibelanjakan, jadi skor rapor dan papan peringkat tetap utuh. Dengan server kelas, pembelian
 * diperiksa server (net.shop) dan lemari tersimpan di akun; guru bisa menutup toko. Tanpa server (mode tamu),
 * lemari tersimpan di localStorage per alias. Busana yang dipakai dikirim lewat event 'nutra:outfit' ke dunia 3D
 * dan lobi, dan terlihat oleh teman sekelas.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { createExplorer, PALETTE } from './characters.js';
import { applyOutfit, swatchOf } from './fashion.js';

const SHOP = window.NUTRANTARA_SHOP;
const game = window.NutraGame;
const net = window.NutraNet;
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Lemari ----------
const online = () => Boolean(net && net.status().joined);
const blank = () => ({ owned: [], wear: { ...SHOP.defaults }, spent: 0 });
/** Sama dengan wardrobeOf di server: hanya barang katalog, pakaian tiap slot selalu sah. */
function normalize(w) {
  const src = w && typeof w === 'object' ? w : {};
  const owned = [...new Set((Array.isArray(src.owned) ? src.owned : []).filter((id) => { const it = SHOP.byId(id); return it && !it.bawaan; }))];
  const wear = {};
  SHOP.slots.forEach((s) => {
    const id = src.wear && src.wear[s.id];
    const it = SHOP.byId(id);
    wear[s.id] = it && it.slot === s.id && (it.bawaan || owned.includes(id)) ? id : SHOP.defaults[s.id];
  });
  return { owned, wear, spent: Math.max(0, Math.floor(Number(src.spent)) || 0) };
}
let local = { key: null, w: blank() };
const localKey = () => `nutrantara-lemari-v1:${(game.state.alias || '').toLocaleLowerCase('id')}`;
function localWardrobe() {
  const key = localKey();
  if (local.key !== key) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(key)); } catch { /* abaikan */ }
    local = { key, w: normalize(saved) };
  }
  return local.w;
}
function saveLocal() { try { localStorage.setItem(local.key, JSON.stringify(local.w)); } catch { /* abaikan */ } }

/** Dengan server: lemari dari akun (kosong sampai server mengirimnya). Tanpa server: lemari lokal. */
function wardrobe() {
  if (online()) return net.wardrobe ? normalize(net.wardrobe) : blank();
  return localWardrobe();
}
const earned = () => (game.state.alias ? game.computeScore() : 0);
const balance = () => Math.max(0, earned() - wardrobe().spent);
const shopOpen = () => !online() || !net.settings || net.settings.shopOpen !== false;

function announceOutfit() {
  document.dispatchEvent(new CustomEvent('nutra:outfit', { detail: { ...wardrobe().wear } }));
}

// ---------- Beli & pakai ----------
let pending = null;
let pendingTimer = 0;
let confirming = null;
function waitServer(id) {
  pending = id;
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => { if (pending) { pending = null; render(); game.showToast('Server belum menjawab. Coba lagi sebentar lagi.'); } }, 6000);
}

function buy(id) {
  const it = SHOP.byId(id);
  confirming = null;
  if (!it || it.bawaan || pending) return;
  if (!shopOpen()) { game.showToast('Toko sedang ditutup guru.'); render(); return; }
  const bal = balance();
  if (bal < it.price) { game.showToast(`Poinmu belum cukup: perlu ${it.price}, saldo ${bal}.`); render(); return; }
  if (online()) { waitServer(id); net.shop('buy', id); render(); return; }
  const w = localWardrobe();
  w.owned.push(id); w.spent += it.price; w.wear[it.slot] = id;
  saveLocal();
  bought(it);
}

function wear(id) {
  const it = SHOP.byId(id);
  if (!it || pending) return;
  if (online()) { waitServer(id); net.shop('wear', id); render(); return; }
  const w = localWardrobe();
  if (!it.bawaan && !w.owned.includes(id)) return;
  w.wear[it.slot] = id;
  saveLocal();
  preview = null;
  announceOutfit();
  render();
}

function bought(it) {
  preview = null;
  game.showToast(`${it.name} sekarang milikmu dan langsung dipakai! ✦`);
  if (pv) pv.explorer.userData.emote('cheer');
  announceOutfit();
  render();
}

if (net) {
  net.on('wardrobe', (msg) => {
    const was = pending;
    pending = null;
    clearTimeout(pendingTimer);
    if (msg.ok === false && msg.message) game.showToast(msg.message);
    if (msg.ok && msg.action === 'buy') bought(SHOP.byId(msg.item));
    else {
      if (msg.ok && msg.action === 'wear' && was) preview = null;
      announceOutfit();
      render();
    }
  });
  net.on('settings', () => render());
  net.on('reset', () => { preview = null; render(); });
}

// ---------- Layar Toko ----------
const screen = $('#screen-shop');
let slot = SHOP.slots[0].id;
let preview = null; // id barang yang sedang dicoba (belum tentu dimiliki)

const previewWear = () => {
  const wearing = { ...wardrobe().wear };
  const it = preview && SHOP.byId(preview);
  if (it) wearing[it.slot] = it.id;
  return wearing;
};
const swatchStyle = (id) => { const s = swatchOf(id); return s.image ? `background-image:url(${s.image})` : `background:linear-gradient(135deg, ${s.colors.join(', ')})`; };

function card(it, w, bal, open) {
  const owned = it.bawaan || w.owned.includes(it.id);
  const worn = w.wear[it.slot] === it.id;
  const trying = preview === it.id;
  const state = worn ? '✓ DIPAKAI' : it.bawaan ? 'BAWAAN' : owned ? '✓ MILIKMU' : `${it.price} POIN`;
  let actions = '';
  if (!worn) actions += `<button type="button" class="button button-secondary" data-try="${it.id}" aria-pressed="${trying}">${trying ? '✓ Sedang dicoba' : 'Coba'}</button>`;
  if (owned && !worn) actions += `<button type="button" class="button button-primary" data-wear="${it.id}"${pending ? ' disabled' : ''}>Pakai</button>`;
  if (!owned) {
    if (confirming === it.id) {
      actions += `<button type="button" class="button button-primary" data-confirm="${it.id}">Ya, beli (${it.price} poin)</button><button type="button" class="button button-secondary" data-cancel>Batal</button>`;
    } else {
      const why = !open ? 'Toko ditutup' : bal < it.price ? `Kurang ${it.price - bal} poin` : '';
      actions += `<button type="button" class="button button-primary" data-buy="${it.id}"${why || pending ? ' disabled' : ''}>${pending === it.id ? 'Menunggu server…' : why || `Beli · ${it.price} poin`}</button>`;
    }
  }
  return `<article class="shop-card${worn ? ' worn' : ''}${owned ? ' owned' : ''}${trying ? ' trying' : ''}">
    <div class="shop-swatch" style="${swatchStyle(it.id)}" aria-hidden="true"></div>
    <div class="shop-card-body">
      <h3>${esc(it.name)}</h3>
      <p class="shop-origin">Asal: ${esc(it.origin)}</p>
      <p class="shop-desc">${esc(it.desc)}</p>
      <p class="shop-state">${state}</p>
      <div class="shop-actions">${actions}</div>
    </div>
  </article>`;
}

function render() {
  if (!screen || screen.hidden) return;
  const w = wardrobe(); const bal = balance(); const open = shopOpen();
  const waiting = online() && !net.wardrobe;
  $('#shop-wallet').innerHTML = `<span class="shop-wallet-label">Saldo toko</span><b>${bal} <small>poin</small></b><span class="shop-wallet-note">Diperoleh ${earned()} · dibelanjakan ${w.spent}</span>${open ? '' : '<em>🔒 Toko sedang ditutup guru. Busana milikmu tetap bisa dipakai.</em>'}`;
  $('#shop-tabs').innerHTML = SHOP.slots.map((s) => {
    const items = SHOP.items.filter((it) => it.slot === s.id && !it.bawaan);
    const have = items.filter((it) => w.owned.includes(it.id)).length;
    return `<button type="button" class="shop-tab" data-slot="${s.id}" aria-pressed="${s.id === slot}">${esc(s.name)} <small>${have}/${items.length}</small></button>`;
  }).join('');
  $('#shop-items').innerHTML = waiting
    ? '<p class="shop-empty">Mengambil lemarimu dari server kelas…</p>'
    : SHOP.items.filter((it) => it.slot === slot).map((it) => card(it, w, bal, open)).join('');
  const pw = previewWear();
  const tried = preview && SHOP.byId(preview);
  $('#shop-preview-note').innerHTML = `${tried ? `<b>Sedang mencoba:</b> ${esc(tried.name)} <button type="button" class="link-button" data-untry>Lepas pratinjau</button><br>` : ''}<span class="shop-wearing">${SHOP.slots.map((s) => `${esc(s.name)}: <b>${esc(SHOP.byId(pw[s.id]).name)}</b>`).join(' · ')}</span>`;
  if (pv) applyOutfit(pv.explorer, pw);
}

if (screen) {
  screen.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.slot) { slot = b.dataset.slot; confirming = null; render(); return; }
    if (b.dataset.try) { preview = preview === b.dataset.try ? null : b.dataset.try; if (pv && preview) pv.explorer.userData.emote('wave'); render(); return; }
    if (b.hasAttribute('data-untry')) { preview = null; render(); return; }
    if (b.dataset.wear) { wear(b.dataset.wear); return; }
    if (b.dataset.buy) { confirming = b.dataset.buy; preview = b.dataset.buy; render(); const yes = screen.querySelector('[data-confirm]'); if (yes) yes.focus(); return; }
    if (b.dataset.confirm) { buy(b.dataset.confirm); return; }
    if (b.hasAttribute('data-cancel')) { confirming = null; render(); }
  });
}

// ---------- Pratinjau 3D (dibuat saat layar Toko dibuka, dibuang saat ditutup) ----------
let pv = null;
function playerColor() {
  if (net && net.me && net.me.color) return net.me.color;
  try { const g = JSON.parse(localStorage.getItem('nutrantara-guest-v1')); if (g && g.color) return g.color; } catch { /* abaikan */ }
  return PALETTE.cyan;
}
function startPreview() {
  const wrap = $('#shop-canvas-wrap');
  const fallback = $('#shop-preview-fallback');
  if (pv || !wrap) return;
  // Kanvas baru setiap kali: konteks WebGL yang sudah dilepas tidak bisa dipakai ulang.
  const canvas = document.createElement('canvas');
  canvas.className = 'shop-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Pratinjau 3D penjelajahmu dengan busana pilihan. Seret untuk memutar.');
  let renderer = null;
  if (window.NUTRA_WORLD_MODE !== '2d') {
    wrap.append(canvas);
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { renderer = null; canvas.remove(); }
  }
  fallback.hidden = Boolean(renderer);
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fffaf0', '#7bb37a', 2.1));
  const sun = new THREE.DirectionalLight('#ffe9b8', 2.2);
  sun.position.set(-2, 4, 3);
  scene.add(sun);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.16, 40), new THREE.MeshToonMaterial({ color: '#f6e3b8' }));
  stand.position.y = -0.08;
  scene.add(stand);
  const explorer = createExplorer(playerColor());
  scene.add(explorer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.35, 5);
  camera.lookAt(0, 1.0, 0);
  pv = { renderer, scene, camera, explorer, raf: 0, drag: null, yaw: 0.5, last: performance.now() };
  explorer.userData.setColor(playerColor());
  applyOutfit(explorer, previewWear());
  const onDown = (e) => { pv.drag = e.clientX; canvas.setPointerCapture(e.pointerId); };
  const onMove = (e) => { if (pv && pv.drag !== null) { pv.yaw += (e.clientX - pv.drag) * 0.012; pv.drag = e.clientX; } };
  const onUp = () => { if (pv) pv.drag = null; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  pv.cleanup = () => { canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); };
  const loop = () => {
    if (!pv) return;
    pv.raf = requestAnimationFrame(loop);
    const now = performance.now(); const dt = Math.min(0.05, (now - pv.last) / 1000); pv.last = now;
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    if (w && h && (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio()))) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    if (pv.drag === null && !reduceMotion()) pv.yaw += dt * 0.35;
    explorer.rotation.y = pv.yaw;
    explorer.userData.animate(dt, { speed: 0 });
    renderer.render(scene, camera);
  };
  loop();
}
function stopPreview() {
  if (!pv) return;
  cancelAnimationFrame(pv.raf);
  pv.cleanup();
  pv.renderer.dispose();
  pv.renderer.forceContextLoss();
  pv.renderer.domElement.remove();
  pv = null;
}

document.addEventListener('nutra:screen', (e) => {
  if (e.detail === 'shop') { confirming = null; startPreview(); render(); } else stopPreview();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && confirming && screen && !screen.hidden) { confirming = null; render(); } });

/** Dipakai world3d.js & app.js untuk busana penjelajah sendiri. */
window.NutraShop = {
  get wear() { return { ...wardrobe().wear }; },
  get balance() { return balance(); },
  announce: announceOutfit
};
