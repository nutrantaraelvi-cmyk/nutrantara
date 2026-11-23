/*
 * Pos 5 · Pemecah Klaim: membongkar asumsi dan informasi yang diabaikan iklan.
 *  1. Mesin Pemecah Klaim — setiap klaim adalah batu geode 3D. Pukul sampai pecah, pilah pecahannya menjadi DATA dan
 *     KESIMPULAN, temukan ASUMSI tersembunyi di intinya (warrant pada model argumen Toulmin), lalu sorot informasi
 *     yang diabaikan iklan sampai kristal asumsinya runtuh.
 *  2. Kemasan Berputar 3D — depan kemasan memuat klaim; belakang memuat informasi nilai gizi; samping memuat komposisi
 *     dan takaran saji. Putar kemasan, sorot dengan lampu, lalu tandai informasi penting yang diabaikan iklan.
 *  3. Studio Naskah Jujur — pasangkan sasaran dengan data kebutuhannya, lalu rakit naskah iklan dari kepingan yang
 *     jujur. Dewan sensor menolak trik iklan (kata "paling sehat", generalisasi, informasi yang disembunyikan).
 * Referensi rancangan: model argumen Toulmin (asumsi penghubung/warrant sering tidak diucapkan); gim inokulasi
 * misinformasi seperti Bad News (mengenali trik manipulasi lebih dulu); studi klaim kemasan (Cornell, Nature Food 2026):
 * klaim depan kemasan hanya benar untuk satu zat gizi, jadi periksa label belakang; Peraturan BPOM No. 1 Tahun 2022
 * tentang pengawasan klaim pada label dan iklan pangan olahan. Semua produk, merek, dan angka adalah fiktif.
 * Formatif: tidak memengaruhi skor. Semua aksi bisa dilakukan dengan tombol (keyboard); kanvas 3D bersifat visual.
 */
import * as THREE from './vendor/three/three.module.min.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
const nowIso = () => new Date().toISOString();

// =====================================================================
// Gambar sisi kemasan (dipakai panel 3D dan model kemasan di dunia)
// =====================================================================
export const PACK_SIZE = [1.6, 2.2, 0.9];
const FACE_NAMES = { front: 'depan', brand: 'samping kiri', back: 'belakang', side: 'samping kanan' };

function wrapText(x, text, cx, y, maxW, lineH, align = 'center') {
  const words = String(text).split(/\s+/);
  let line = '';
  x.textAlign = align;
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (x.measureText(test).width > maxW && line) { x.fillText(line, cx, y); y += lineH; line = w; } else line = test;
  });
  if (line) { x.fillText(line, cx, y); y += lineH; }
  return y;
}
function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }

/** Kanvas satu sisi kemasan: front | back | side | brand | plain. */
export function packageFace(p, face) {
  const c = document.createElement('canvas');
  const wide = face === 'front' || face === 'back';
  const W = wide ? 512 : 288; const H = face === 'plain' ? 128 : 704;
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px "Baloo 2", "Trebuchet MS", sans-serif`;
  const body = (w, s) => `${w} ${s}px "DM Sans", "Segoe UI", sans-serif`;
  const base = new THREE.Color(p.color);
  const light = `#${base.clone().lerp(new THREE.Color('#ffffff'), 0.35).getHexString()}`;
  if (face === 'plain') { x.fillStyle = p.color; x.fillRect(0, 0, W, H); return c; }
  if (face === 'front' || face === 'brand') {
    const gr = x.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, light); gr.addColorStop(1, p.color);
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.globalAlpha = 0.13; x.fillStyle = '#ffffff';
    for (let i = -H; i < W; i += 46) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 22, 0); x.lineTo(i + 22 + H, H); x.lineTo(i + H, H); x.fill(); }
    x.globalAlpha = 1;
  }
  if (face === 'front') {
    x.fillStyle = 'rgba(255,255,255,.92)'; roundRect(x, 28, 34, W - 56, 128, 24); x.fill();
    x.fillStyle = '#2c2116'; x.font = font(800, 46);
    wrapText(x, p.name, W / 2, 88, W - 100, 46);
    x.font = '168px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    x.textAlign = 'center';
    x.fillText(p.icon, W / 2, 360);
    // Ledakan bintang berisi klaim iklan.
    const cx = W / 2; const cy = 520; const R = 150; const r = 118;
    x.beginPath();
    for (let i = 0; i < 32; i += 1) { const a = (i / 32) * Math.PI * 2; const rr = i % 2 ? r : R; x.lineTo(cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.78); }
    x.closePath(); x.fillStyle = '#e2553f'; x.fill();
    x.lineWidth = 6; x.strokeStyle = '#ffd54f'; x.stroke();
    x.fillStyle = '#ffffff'; x.font = font(800, 44);
    wrapText(x, p.claim, cx, cy - 6, 250, 46);
    x.fillStyle = p.ink; x.font = font(700, 30);
    wrapText(x, p.sub, W / 2, 670, W - 60, 32);
  } else if (face === 'brand') {
    x.fillStyle = p.ink; x.font = font(800, 34);
    wrapText(x, p.name, W / 2, 90, W - 40, 36);
    x.font = '92px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    x.fillText(p.icon, W / 2, 300);
    x.font = body(600, 20);
    wrapText(x, 'Diproduksi oleh PT Pangan Fiktif Nusantara', W / 2, 420, W - 50, 26);
    x.font = body(500, 18);
    wrapText(x, 'Produk fiktif untuk pembelajaran. Bukan produk nyata.', W / 2, 560, W - 50, 24);
  } else if (face === 'back') {
    x.fillStyle = '#fffdf6'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#2c2116'; x.lineWidth = 6; x.strokeRect(24, 24, W - 48, H - 48);
    x.fillStyle = '#2c2116'; x.fillRect(24, 24, W - 48, 74);
    x.fillStyle = '#ffffff'; x.font = font(800, 34); x.textAlign = 'center';
    x.fillText('INFORMASI NILAI GIZI', W / 2, 74);
    x.fillStyle = '#2c2116'; x.font = body(700, 22);
    wrapText(x, p.serving, W / 2, 134, W - 80, 26);
    x.fillRect(40, 166, W - 80, 4);
    x.font = body(700, 21); x.textAlign = 'left';
    x.fillText('Jumlah per sajian', 44, 200);
    let y = 244;
    p.label.forEach(([k, v]) => {
      x.font = body(600, 26); x.textAlign = 'left'; x.fillText(k, 44, y);
      x.font = body(800, 26); x.textAlign = 'right'; x.fillText(v, W - 44, y);
      x.fillRect(40, y + 14, W - 80, 2);
      y += 56;
    });
    x.font = body(500, 18); x.textAlign = 'center';
    wrapText(x, 'Angka simulasi untuk permainan, bukan saran gizi.', W / 2, H - 56, W - 80, 22);
  } else if (face === 'side') {
    x.fillStyle = '#fff8ea'; x.fillRect(0, 0, W, H);
    x.fillStyle = p.color; x.fillRect(0, 0, W, 64); x.fillRect(0, H - 40, W, 40);
    x.fillStyle = '#2c2116'; x.font = font(800, 28); x.textAlign = 'center';
    x.fillText('TAKARAN SAJI', W / 2, 120);
    x.font = body(600, 22);
    let y = wrapText(x, p.serving, W / 2, 160, W - 40, 28);
    x.font = font(800, 28);
    x.fillText('KOMPOSISI', W / 2, y + 40);
    x.font = body(600, 22);
    wrapText(x, p.ingredients.replace(/^Komposisi:\s*/, ''), W / 2, y + 80, W - 40, 28);
  }
  return c;
}

/** Material enam sisi kemasan untuk BoxGeometry: [kanan, kiri, atas, bawah, depan, belakang]. */
export function packageMaterials(p, Material = THREE.MeshStandardMaterial) {
  const tex = (face) => { const t = new THREE.CanvasTexture(packageFace(p, face)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  return ['side', 'brand', 'plain', 'plain', 'front', 'back'].map((f) => new Material({ map: tex(f), roughness: 0.55 }));
}

export function createClaims({ game, openPanel, closePanel, shake, say, nara, onDone }) {
  const close = (el) => el.querySelectorAll('[data-act="close"]').forEach((b) => b.addEventListener('click', () => closePanel()));
  const TEAM = () => window.NutraTeam || null;
  const sharedTeam = () => Boolean(TEAM() && TEAM().shared());
  const alias = () => game.state.alias || '';

  // =====================================================================
  // 1. Mesin Pemecah Klaim (klaim ke-k dipegang peran k mod 4)
  // =====================================================================
  function openGeode(it) {
    const m = game.missionById(it.pos);
    const G = m.activity.geode;
    const ps = () => game.activityState(it.pos).pecah || null;
    if (!ps() || !Array.isArray(ps().deck) || !ps().deck.length) {
      game.updateActivity(it.pos, (a) => { a.pecah = { deck: shuffle(G.claims.map((_, i) => i)), done: [], wrong: 0 }; });
    }
    const gateOf = (k) => (TEAM() ? TEAM().check(it.pos, 'card', null, k) : { ok: true });
    const ownerOf = (k) => (TEAM() ? TEAM().tag(it.pos, 'card', null, k) : '');
    const positions = () => ps().deck.map((_, k) => k);
    const queue = () => positions().filter((k) => !ps().done.includes(k) && gateOf(k).ok);
    const waiting = () => positions().filter((k) => !ps().done.includes(k) && !gateOf(k).ok);
    const allDone = () => ps().done.length >= ps().deck.length;
    let current = null; let step = 'hit'; let hits = 0; let busy = false; let finished = false;
    let sorted = {}; let sim = null;
    const mistake = () => { game.updateActivity(it.pos, (a) => { a.pecah.wrong = (a.pecah.wrong || 0) + 1; }); nara('shake'); };

    openPanel(it, `
      <p class="holo-kicker">POS 05 · MESIN PEMECAH KLAIM <em>LATIHAN</em></p>
      <h2>Pecahkan klaim, temukan asumsinya</h2>
      <div class="sg-hud" role="status" aria-live="polite"><span class="gd-progress"></span><span class="gd-trick"></span></div>
      <div class="gd-ad" aria-live="polite"></div>
      <div class="gd-view">
        <canvas class="gd-canvas" aria-label="Batu klaim 3D. Klik untuk memukul, seret untuk memutar."></canvas>
        <span class="gd-hint">Klik batu untuk memukul · seret untuk memutar</span>
      </div>
      <div class="gd-step"></div>
      <p class="sg-wait" aria-live="polite"></p>
      <div class="holo-feedback gd-feedback" role="status" aria-live="polite"></div>`, (el) => {
      el.classList.add('holo-wide');
      const stepEl = el.querySelector('.gd-step');
      const fb = el.querySelector('.gd-feedback');
      const claim = () => (current === null ? null : G.claims[ps().deck[current]]);
      sim = createGeodeScene(el.querySelector('.gd-canvas'), () => { if (step === 'hit') hit(); });

      function hud() {
        el.querySelector('.gd-progress').innerHTML = `${sharedTeam() ? 'Klaim regu terbongkar' : 'Klaim terbongkar'} <b>${ps().done.length}/${ps().deck.length}</b> · salah ${ps().wrong || 0}`;
        const c = claim();
        el.querySelector('.gd-trick').textContent = c && step === 'done' ? `Trik: ${c.trick}` : '';
        const w = waiting();
        el.querySelector('.sg-wait').textContent = w.length ? `⏳ ${w.length} klaim dipegang anggota lain: ${[...new Set(w.map(ownerOf))].join(', ')}. Ajak mereka membongkarnya!` : '';
      }
      function next() {
        hud();
        if (allDone()) { finish(); return; }
        const q = queue();
        step = 'hit'; hits = 0; sorted = {};
        if (sim) sim.reset();
        if (!q.length) {
          current = null;
          el.querySelector('.gd-ad').innerHTML = '<p class="gd-claim idle">Klaim bagianmu sudah terbongkar! Tunggu anggota lain membongkar klaimnya, lalu bandingkan asumsi yang kalian temukan.</p>';
          stepEl.innerHTML = '';
          return;
        }
        current = q[0];
        const c = claim();
        el.querySelector('.gd-ad').innerHTML = `<span class="gd-tag">IKLAN · ${esc(c.product.toUpperCase())}</span><p class="gd-claim">“${esc(c.claim)}”</p>${ownerOf(current) ? `<small class="sg-owner">${esc(ownerOf(current))}</small>` : ''}`;
        fb.innerHTML = 'Klaim ini terdengar meyakinkan. Apa yang tersembunyi di dalamnya? Pukul batunya sampai pecah.';
        render();
      }
      function render() {
        const c = claim();
        hud();
        if (!c) { stepEl.innerHTML = ''; return; }
        if (step === 'hit') {
          stepEl.innerHTML = `<div class="gd-row"><button type="button" class="button button-primary gd-hit">🔨 Pukul batu klaim</button><span class="gd-meter" aria-label="Retakan ${hits} dari ${G.hits}">${Array.from({ length: G.hits }, (_, i) => `<i class="${i < hits ? 'on' : ''}"></i>`).join('')}</span></div>`;
          stepEl.querySelector('.gd-hit').addEventListener('click', hit);
        } else if (step === 'sort') {
          stepEl.innerHTML = `<p class="gd-q"><b>Langkah 2 · Pilah pecahannya.</b> Mana yang <b>data</b> (fakta atau angka yang tercatat) dan mana yang <b>kesimpulan</b> (klaim akhir yang ingin dipercaya)?</p>
            <div class="gd-pieces">${c.pieces.map((p, i) => `<div class="gd-piece${sorted[i] ? ` ${sorted[i]}` : ''}" data-i="${i}"><span>${esc(p.text)}</span>${sorted[i] ? `<b>${sorted[i] === 'data' ? 'DATA' : 'KESIMPULAN'} ✓</b>` : `<div class="gd-pick"><button type="button" class="button button-secondary" data-kind="data">Data</button><button type="button" class="button button-secondary" data-kind="kesimpulan">Kesimpulan</button></div>`}</div>`).join('')}</div>`;
          stepEl.querySelectorAll('.gd-piece').forEach((row) => row.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => sortPiece(Number(row.dataset.i), b.dataset.kind, row))));
        } else if (step === 'core') {
          stepEl.innerHTML = `<p class="gd-q"><b>Langkah 3 · Inti batu: asumsi tersembunyi.</b> Iklan tidak mengucapkannya, tetapi klaim baru "masuk akal" kalau anggapan ini dipercaya. Yang mana?</p>
            <div class="gd-crystals">${c.options.map((o, i) => ({ o, i })).sort((a, b) => ((a.i * 7 + current) % 3) - ((b.i * 7 + current) % 3)).map(({ o, i }) => `<button type="button" class="gd-crystal" data-i="${i}"><span aria-hidden="true">💎</span>${esc(o.text)}</button>`).join('')}</div>`;
          stepEl.querySelectorAll('.gd-crystal').forEach((b) => b.addEventListener('click', () => pickCore(Number(b.dataset.i), b)));
        } else if (step === 'test') {
          stepEl.innerHTML = `<p class="gd-q"><b>Langkah 4 · Uji asumsinya.</b> Apakah anggapan itu selalu benar? Sorot informasi yang diabaikan iklan.</p>
            <button type="button" class="button button-primary gd-test">🔦 Sorot yang diabaikan</button>`;
          stepEl.querySelector('.gd-test').addEventListener('click', test);
        } else if (step === 'done') {
          stepEl.innerHTML = `<div class="gd-verdict"><p class="gd-stamp">ASUMSI RAPUH · ${esc(c.trick.toUpperCase())}</p>
            <p><b>Yang diabaikan:</b> ${esc(c.ignored)}</p><p><b>Mengapa rapuh:</b> ${esc(c.crack)}</p>
            <button type="button" class="button button-primary gd-next">Klaim berikutnya ↗</button></div>`;
          stepEl.querySelector('.gd-next').addEventListener('click', next);
          stepEl.querySelector('.gd-next').focus();
        }
      }
      async function hit() {
        if (busy || step !== 'hit' || current === null) return;
        const g = gateOf(current);
        if (!g.ok) { fb.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        hits += 1;
        // Pukulan tidak menunggu animasi agar klik cepat tetap terhitung; hanya pecahan terakhir yang ditunggu.
        if (hits < G.hits) { if (sim) sim.hit(hits / G.hits); else shake(el); fb.textContent = `Retak! (${hits}/${G.hits}) Pukul lagi.`; render(); return; }
        busy = true;
        if (sim) { await sim.hit(1); await sim.split(); }
        busy = false;
        step = 'sort';
        fb.innerHTML = '<b class="ok">Pecah!</b> Klaim terbelah menjadi pecahan dan sebuah inti kristal yang masih tertutup.';
        render();
      }
      function sortPiece(i, kind, row) {
        const c = claim();
        if (c.pieces[i].kind !== kind) {
          mistake();
          shake(row);
          fb.innerHTML = `<b class="warn">Belum tepat.</b> ${kind === 'data' ? 'Pernyataan ini adalah klaim akhir yang ingin dipercaya penonton, bukan fakta tercatat.' : 'Pernyataan ini fakta atau angka yang bisa diperiksa, bukan klaim akhir.'}`;
          return;
        }
        sorted[i] = kind;
        fb.innerHTML = `<b class="ok">✓ ${kind === 'data' ? 'Data' : 'Kesimpulan'}.</b>`;
        if (c.pieces.every((_, k) => sorted[k])) { step = 'core'; fb.innerHTML = '<b class="ok">✓ Data dan kesimpulan terpilah.</b> Tapi apa yang menghubungkan keduanya? Lihat inti kristalnya.'; if (sim) sim.glow(); }
        render();
      }
      function pickCore(i, btn) {
        const c = claim();
        const o = c.options[i];
        if (!o.ok) {
          mistake();
          shake(btn);
          btn.disabled = true;
          fb.innerHTML = `<b class="warn">Bukan inti asumsinya.</b> ${esc(o.why)}`;
          return;
        }
        step = 'test';
        fb.innerHTML = `<b class="ok">✓ Asumsi tersembunyi ditemukan:</b> “${esc(o.text)}”`;
        render();
      }
      async function test() {
        if (busy) return;
        const c = claim();
        busy = true;
        if (sim) await sim.shatter();
        busy = false;
        const k = current;
        const g = gateOf(k);
        game.updateActivity(it.pos, (a) => { if (!a.pecah.done.includes(k)) a.pecah.done.push(k); }, `membongkar asumsi klaim ${c.product}${g.takeover ? ' (mengambil alih)' : ''}`);
        step = 'done';
        fb.innerHTML = '<b class="ok">✓ Kristal asumsi runtuh!</b> Klaim kehilangan penopangnya.';
        render();
      }
      function finish() {
        if (finished) return;
        finished = true;
        current = null;
        const s = ps();
        const stars = starsFor(s.wrong || 0);
        const already = Boolean(game.activityState(it.pos).stations.pecah);
        if (!already) game.updateActivity(it.pos, (a) => { a.pecah.stars = stars; a.stations.pecah = true; }, 'menuntaskan Mesin Pemecah Klaim');
        el.querySelector('.gd-ad').innerHTML = '';
        stepEl.innerHTML = `<div class="sg-result"><p class="lab-stars">${starText(stars)}</p><p><b>Semua klaim terbongkar!</b> Salah langkah: ${s.wrong || 0}</p></div>`;
        el.querySelector('.sg-wait').textContent = '';
        fb.innerHTML = '<b class="ok">✓ Kunci mesin:</b> klaim iklan biasanya = data + kesimpulan + <b>asumsi yang tidak diucapkan</b>. Ucapkan asumsinya, lalu uji dengan informasi yang diabaikan: satu zat gizi, label "bebas …", "untuk semua", dan "alami/asli" belum tentu berarti sehat.';
        fb.insertAdjacentHTML('afterend', `<div class="holo-duo"><button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>${sharedTeam() ? '' : '<button type="button" class="button button-secondary" data-act="again">Main lagi ↺</button>'}</div>`);
        close(el);
        const again = el.querySelector('[data-act="again"]');
        if (again) again.addEventListener('click', () => { game.updateActivity(it.pos, (a) => { a.pecah = null; }); openGeode(it); });
        el.querySelector('[data-act="close"]').focus();
        if (sim) sim.celebrate();
        if (!already) onDone(it, stars, 'pecah');
      }
      const onTeam = () => {
        if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; }
        if (busy || finished || !ps()) return;
        if (allDone()) { finish(); return; }
        if (current === null || ps().done.includes(current)) { if (step !== 'done') next(); } else hud();
      };
      document.addEventListener('nutra:team', onTeam);
      next();
    });
  }

  // =====================================================================
  // 2. Kemasan Berputar 3D
  // =====================================================================
  function openPackage(it) {
    const m = game.missionById(it.pos);
    const P = m.activity.pack;
    const blank = () => ({ done: [], wrong: 0, stars: 0 });
    const ks = () => { const a = game.activityState(it.pos); return a.kemasan && typeof a.kemasan === 'object' ? a.kemasan : blank(); };
    const save = (fn, note) => game.updateActivity(it.pos, (a) => { if (!a.kemasan || typeof a.kemasan !== 'object') a.kemasan = blank(); if (!Array.isArray(a.kemasan.done)) a.kemasan.done = []; fn(a.kemasan, a); }, note);
    const gate = () => (TEAM() ? TEAM().check(it.pos, 'pack', 'sorot') : { ok: true });
    const owner = () => (TEAM() ? TEAM().tag(it.pos, 'pack', 'sorot') : '');
    let idx = Math.max(0, P.products.findIndex((p) => !ks().done.includes(p.id)));
    const seen = new Set(['front']);
    let picks = new Set();
    let sim = null;

    openPanel(it, `
      <p class="holo-kicker">POS 05 · KEMASAN BERPUTAR <em>LATIHAN</em></p>
      <h2>Depan kemasan berteriak, belakangnya berbisik</h2>
      <p class="holo-quote">Iklan hanya memamerkan sisi depan. Putar kemasan, sorot labelnya, lalu tandai informasi <b>penting yang diabaikan iklan</b>.</p>
      <div class="pk-tabs" role="tablist" aria-label="Produk"></div>
      <div class="pk-stage">
        <div class="pk-view">
          <canvas class="pk-canvas" aria-label="Kemasan 3D. Seret untuk memutar; lampu sorot mengikuti penunjuk."></canvas>
          <span class="pk-face" aria-live="polite"></span>
          <div class="pk-rot"><button type="button" class="button button-secondary" data-rot="1" aria-label="Putar kemasan ke kiri">⟲</button><button type="button" class="button button-secondary" data-rot="-1" aria-label="Putar kemasan ke kanan">⟳</button></div>
        </div>
        <div class="pk-side">
          <p class="pk-title"></p>
          <ul class="pk-facts"></ul>
          <button type="button" class="button button-primary pk-check">🔦 Bongkar yang diabaikan</button>
        </div>
      </div>
      <div class="holo-feedback pk-feedback" role="status" aria-live="polite"></div>
      <div class="pk-after"></div>`, (el) => {
      el.classList.add('holo-wide');
      const fb = el.querySelector('.pk-feedback');
      const product = () => P.products[idx];
      sim = createPackageScene(el.querySelector('.pk-canvas'), (face) => {
        el.querySelector('.pk-face').textContent = `Sisi ${FACE_NAMES[face]}`;
        if (!seen.has(face)) { seen.add(face); renderFacts(); }
      });
      if (sim) sim.setProduct(product());

      function tabs() {
        el.querySelector('.pk-tabs').innerHTML = P.products.map((p, i) => `<button type="button" role="tab" class="pk-tab${i === idx ? ' on' : ''}${ks().done.includes(p.id) ? ' done' : ''}" aria-selected="${i === idx}" data-i="${i}">${p.icon} ${esc(p.name)}${ks().done.includes(p.id) ? ' ✓' : ''}</button>`).join('');
        el.querySelectorAll('.pk-tab').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.i))));
      }
      function renderFacts() {
        const p = product();
        const done = ks().done.includes(p.id);
        el.querySelector('.pk-title').innerHTML = `<b>${esc(p.name)}</b> · iklan: “${esc(p.claim)}”${owner() ? ` <small class="cl-owner">${esc(owner())}</small>` : ''}`;
        el.querySelector('.pk-facts').innerHTML = p.facts.map((f, i) => {
          const open = done || seen.has(f.face);
          if (!open) return `<li class="locked"><span aria-hidden="true">🔒</span> Putar kemasan untuk melihat sisi ${esc(FACE_NAMES[f.face])}.</li>`;
          const on = done ? f.ignored : picks.has(i);
          return `<li class="${done ? (f.ignored ? 'hit' : 'skip') : ''}"><label><input type="checkbox" data-i="${i}"${on ? ' checked' : ''}${done ? ' disabled' : ''} /> <span>${esc(f.text)}</span></label>${done ? `<small>${esc(f.why)}</small>` : ''}</li>`;
        }).join('');
        el.querySelectorAll('.pk-facts input').forEach((b) => b.addEventListener('change', () => { const i = Number(b.dataset.i); if (b.checked) picks.add(i); else picks.delete(i); }));
        const btn = el.querySelector('.pk-check');
        btn.hidden = done;
      }
      function choose(i) {
        idx = i; picks = new Set(); seen.clear(); seen.add('front');
        if (sim) sim.setProduct(product());
        el.querySelector('.pk-after').innerHTML = '';
        fb.innerHTML = ks().done.includes(product().id) ? '<b class="ok">✓ Kemasan ini sudah terbongkar.</b>' : 'Mulai dari depan kemasan. Apa yang dipamerkan iklan? Lalu putar untuk mencari yang disembunyikan.';
        tabs(); renderFacts();
      }
      function check() {
        const p = product();
        const g = gate();
        if (!g.ok) { fb.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        if (!['back', 'side'].every((f) => seen.has(f))) { fb.innerHTML = '<b class="warn">Periksa dulu semua sisi penting:</b> putar kemasan sampai sisi belakang (informasi nilai gizi) dan samping kanan (komposisi) terlihat.'; shake(el.querySelector('.pk-view')); return; }
        const wrongPick = [...picks].filter((i) => !p.facts[i].ignored);
        const missed = p.facts.map((f, i) => (f.ignored && !picks.has(i) ? i : -1)).filter((i) => i >= 0);
        if (wrongPick.length || missed.length) {
          save((k) => { k.wrong = (k.wrong || 0) + 1; });
          nara('shake');
          shake(el.querySelector('.pk-side'));
          fb.innerHTML = `<b class="warn">Belum tepat.</b> ${wrongPick.length ? `${wrongPick.map((i) => esc(p.facts[i].why)).join(' ')} ` : ''}${missed.length ? `Masih ada ${missed.length} informasi penting yang belum ditandai.` : ''}`;
          return;
        }
        save((k) => { if (!k.done.includes(p.id)) k.done.push(p.id); }, `membongkar kemasan ${p.name}${g.takeover ? ' (mengambil alih)' : ''}`);
        if (sim) sim.reveal();
        fb.innerHTML = `<b class="ok">✓ TERBONGKAR!</b> Iklan memamerkan “${esc(p.claim)}”, tetapi diam soal: ${p.facts.filter((f) => f.ignored).map((f) => esc(f.text.toLowerCase())).join(' Juga: ')}`;
        tabs(); renderFacts();
        if (P.products.every((x) => ks().done.includes(x.id))) finish();
        else el.querySelector('.pk-after').innerHTML = '<button type="button" class="button button-primary pk-next">Kemasan berikutnya ↗</button>';
        const nx = el.querySelector('.pk-next');
        if (nx) nx.addEventListener('click', () => choose(P.products.findIndex((x) => !ks().done.includes(x.id))));
      }
      function finish() {
        const already = Boolean(game.activityState(it.pos).stations.kemasan);
        const stars = starsFor(ks().wrong || 0);
        if (!already) save((k, a) => { k.stars = stars; a.stations.kemasan = true; }, 'menuntaskan Kemasan Berputar');
        el.querySelector('.pk-after').innerHTML = `<div class="sg-result"><p class="lab-stars">${starText(stars)}</p><p><b>Semua kemasan terbongkar!</b> Depan kemasan hanya petunjuk: periksa label belakang dan komposisi, terutama gula, garam (natrium), lemak, dan takaran saji.</p>
          <div class="holo-duo"><button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>${sharedTeam() ? '' : '<button type="button" class="button button-secondary" data-act="again">Main lagi ↺</button>'}</div></div>`;
        close(el);
        const again = el.querySelector('[data-act="again"]');
        if (again) again.addEventListener('click', () => { game.updateActivity(it.pos, (a) => { a.kemasan = null; }); openPackage(it); });
        if (!already) onDone(it, stars, 'kemasan');
      }
      el.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => { if (sim) sim.turn(Number(b.dataset.rot)); else { ['back', 'side', 'brand'].forEach((f) => seen.add(f)); renderFacts(); } }));
      el.querySelector('.pk-check').addEventListener('click', check);
      const onTeam = () => { if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; } tabs(); renderFacts(); };
      document.addEventListener('nutra:team', onTeam);
      if (!sim) ['back', 'side', 'brand'].forEach((f) => seen.add(f));
      choose(idx);
      if (P.products.every((x) => ks().done.includes(x.id))) finish();
    });
  }

  // =====================================================================
  // 3. Studio Naskah Jujur
  // =====================================================================
  function openStudio(it) {
    const m = game.missionById(it.pos);
    const S = m.activity.studio;
    const blank = () => ({ sasaran: null, naskah: null, wrong: 0, stars: 0 });
    const ss = () => { const a = game.activityState(it.pos); return a.studio && typeof a.studio === 'object' ? a.studio : blank(); };
    const save = (fn, note) => game.updateActivity(it.pos, (a) => { if (!a.studio || typeof a.studio !== 'object') a.studio = blank(); fn(a.studio, a); }, note);
    const gate = (k) => (TEAM() ? TEAM().check(it.pos, 'studio', k) : { ok: true });
    const owner = (k) => (TEAM() ? TEAM().tag(it.pos, 'studio', k) : '');
    const answered = {};
    const order = S.slots.map((sl) => shuffle(sl.options.map((_, i) => i)));
    const chosen = {};
    let flagged = {};
    let meterPct = 0;

    openPanel(it, `
      <p class="holo-kicker">POS 05 · STUDIO NASKAH JUJUR <em>LATIHAN</em></p>
      <h2>Siaran yang jujur terhadap data</h2>
      <div class="st-set" aria-hidden="true"><span class="st-lamp">ON AIR</span><span class="st-cam">🎥</span><span class="st-mic">🎙</span></div>
      <section class="st-part st-sasaran"></section>
      <section class="st-part st-naskah"></section>
      <div class="holo-feedback st-feedback" role="status" aria-live="polite"></div>
      <div class="st-after"></div>`, (el) => {
      el.classList.add('holo-wide');
      const fb = el.querySelector('.st-feedback');
      function renderSasaran() {
        const done = Boolean(ss().sasaran);
        el.querySelector('.st-sasaran').innerHTML = `<h3>1 · Untuk siapa? ${done ? '<span class="st-ok">✓ selesai</span>' : ''}${owner('sasaran') ? ` <small class="cl-owner">${esc(owner('sasaran'))}</small>` : ''}</h3>
          <p class="st-q">Klaim "Menu C sehat" baru bisa dinilai bila sasarannya jelas. Untuk tiap orang, informasi apa yang paling perlu dicek?</p>
          <div class="st-personas">${S.personas.map((p) => {
            const ok = done || answered[p.id];
            return `<article class="st-card${ok ? ' flipped' : ''}" data-p="${p.id}"><div class="st-inner">
              <div class="st-front"><span class="st-ava" aria-hidden="true">${p.icon}</span><b>${esc(p.name)}</b><small>${esc(p.text)}</small>
                ${ok ? '' : `<div class="st-opts">${p.options.map((o, i) => `<button type="button" class="st-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>`}</div>
              <div class="st-back"><span class="st-ava" aria-hidden="true">${p.icon}</span><b>${esc(p.name)}</b><p>✓ Cek: ${esc(p.options[p.answer])}</p></div>
            </div></article>`;
          }).join('')}</div>${done ? `<p class="st-note">${esc(S.personaNote)}</p>` : ''}`;
        el.querySelectorAll('.st-card').forEach((card) => card.querySelectorAll('.st-opt').forEach((b) => b.addEventListener('click', () => pickPersona(card.dataset.p, Number(b.dataset.i), b))));
      }
      function pickPersona(id, i, btn) {
        if (ss().sasaran) return;
        const g = gate('sasaran');
        if (!g.ok) { fb.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        const p = S.personas.find((x) => x.id === id);
        if (i !== p.answer) {
          save((k) => { k.wrong = (k.wrong || 0) + 1; });
          nara('shake'); shake(btn); btn.disabled = true;
          fb.innerHTML = `<b class="warn">Belum tepat.</b> Itu tidak menunjukkan apa yang dibutuhkan tubuh ${esc(p.name.split(',')[0])}. Lihat lagi kegiatannya.`;
          return;
        }
        answered[id] = true;
        fb.innerHTML = `<b class="ok">✓ Tepat.</b> Untuk ${esc(p.name.split(',')[0])}, cek ${esc(p.options[p.answer].toLowerCase())}.`;
        if (S.personas.every((x) => answered[x.id])) {
          save((k) => { k.sasaran = { by: alias(), at: nowIso() }; }, `memasangkan sasaran di Studio Naskah Jujur${g.takeover ? ' (mengambil alih)' : ''}`);
          fb.innerHTML = `<b class="ok">✓ Sasaran jelas.</b> ${esc(S.personaNote)}`;
          maybeFinish();
        }
        renderSasaran();
      }
      function renderNaskah() {
        const n = ss().naskah;
        if (n) {
          el.querySelector('.st-naskah').innerHTML = `<h3>2 · Naskah iklan <span class="st-ok">✓ mengudara</span>${owner('naskah') ? ` <small class="cl-owner">${esc(owner('naskah'))}</small>` : ''}</h3>
            <div class="st-onair"><span class="st-wave" aria-hidden="true"></span><p>🎙 “${esc(n.text)}”</p></div>`;
          return;
        }
        el.querySelector('.st-naskah').innerHTML = `<h3>2 · Rakit naskah yang jujur${owner('naskah') ? ` <small class="cl-owner">${esc(owner('naskah'))}</small>` : ''}</h3>
          <p class="st-q">Pilih satu kepingan untuk setiap bagian naskah. Dewan sensor akan menolak trik iklan.</p>
          <div class="st-slots">${S.slots.map((sl, si) => `<fieldset class="st-slot${flagged[si] ? ' bad' : ''}"><legend>${esc(sl.label)}</legend>${order[si].map((oi) => { const o = sl.options[oi]; const on = chosen[si] === oi; return `<label class="st-tile${on ? ' on' : ''}"><input type="radio" name="st-${si}" value="${oi}"${on ? ' checked' : ''} /><span>${esc(o.text)}</span></label>`; }).join('')}${flagged[si] ? `<p class="st-trick">⚠ Trik: ${esc(flagged[si])}</p>` : ''}</fieldset>`).join('')}</div>
          <div class="st-meter" aria-hidden="true"><i style="width:${meterPct}%"></i></div>
          <button type="button" class="button button-primary st-rec">🎬 Rekam siaran</button>`;
        el.querySelectorAll('.st-slot input').forEach((r) => r.addEventListener('change', () => { const si = Number(r.name.split('-')[1]); chosen[si] = Number(r.value); delete flagged[si]; renderNaskah(); const again = el.querySelector(`input[name="st-${si}"][value="${r.value}"]`); if (again) again.focus(); }));
        el.querySelector('.st-rec').addEventListener('click', record);
      }
      function record() {
        const g = gate('naskah');
        if (!g.ok) { fb.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        if (S.slots.some((_, si) => chosen[si] === undefined)) { fb.innerHTML = '<b class="warn">Lengkapi dulu keempat bagian naskah.</b>'; return; }
        const honest = S.slots.filter((sl, si) => sl.options[chosen[si]].ok).length;
        const meter = el.querySelector('.st-meter i');
        meterPct = (honest / S.slots.length) * 100;
        requestAnimationFrame(() => { meter.style.width = `${meterPct}%`; });
        if (honest < S.slots.length) {
          flagged = {};
          S.slots.forEach((sl, si) => { const o = sl.options[chosen[si]]; if (!o.ok) flagged[si] = o.trick; });
          save((k) => { k.wrong = (k.wrong || 0) + 1; });
          nara('shake');
          fb.innerHTML = `<b class="warn">DITOLAK DEWAN SENSOR.</b> Meter kejujuran ${honest}/${S.slots.length}. Bagian yang ditandai masih memakai trik iklan.`;
          setTimeout(() => { if (el.isConnected) renderNaskah(); }, reduced() ? 0 : 700);
          return;
        }
        const text = S.slots.map((sl, si) => sl.options[chosen[si]].text).join(' ');
        save((k) => { k.naskah = { by: alias(), at: nowIso(), text }; }, `merekam naskah iklan jujur${g.takeover ? ' (mengambil alih)' : ''}`);
        el.querySelector('.st-set').classList.add('live');
        fb.innerHTML = '<b class="ok">✓ MENGUDARA!</b> Naskahmu menyebut data, pembanding, dan sasaran tanpa trik.';
        renderNaskah();
        maybeFinish();
      }
      function maybeFinish() {
        const s = ss();
        if (!s.sasaran || !s.naskah) return;
        const already = Boolean(game.activityState(it.pos).stations.studio);
        const stars = starsFor(s.wrong || 0);
        if (!already) save((k, a) => { k.stars = stars; a.stations.studio = true; }, 'menuntaskan Studio Naskah Jujur');
        el.querySelector('.st-after').innerHTML = `<div class="sg-result"><p class="lab-stars">${starText(stars)}</p><p><b>Studio tuntas!</b> Iklan yang jujur menyebut data apa adanya, memberi pembanding, dan mengakui bahwa "sehat" bergantung pada sasaran.</p>
          <div class="holo-duo"><button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>${sharedTeam() ? '' : '<button type="button" class="button button-secondary" data-act="again">Main lagi ↺</button>'}</div></div>`;
        close(el);
        const again = el.querySelector('[data-act="again"]');
        if (again) again.addEventListener('click', () => { game.updateActivity(it.pos, (a) => { a.studio = null; }); openStudio(it); });
        if (!already) onDone(it, stars, 'studio');
      }
      const onTeam = () => { if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; } renderSasaran(); if (ss().naskah) renderNaskah(); if (ss().sasaran && ss().naskah) maybeFinish(); };
      document.addEventListener('nutra:team', onTeam);
      renderSasaran();
      renderNaskah();
      if (ss().naskah) el.querySelector('.st-set').classList.add('live');
      fb.innerHTML = 'Mulai dari sasaran: "sehat" untuk siapa? Lalu rakit naskah yang jujur.';
      maybeFinish();
    });
  }

  return { openGeode, openPackage, openStudio };
}

// =====================================================================
// Kerangka adegan 3D mini di dalam panel (seret untuk memutar, klik, tween waktu nyata)
// =====================================================================
export function miniScene(canvas, { fov = 35, cam = [0, 0, 6], look = [0, 0, 0], free = false, yawLimit = 0.9, onClick = null, fit = null }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.replaceWith(Object.assign(document.createElement('p'), { className: 'holo-note', textContent: 'Tampilan 3D tidak tersedia di perangkat ini. Misi tetap bisa dikerjakan dengan tombol di bawah.' }));
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 2, 0.1, 100);
  camera.position.set(...cam);
  const target = new THREE.Vector3(...look);
  camera.lookAt(target);
  const world = new THREE.Group();
  scene.add(world);
  const slow = reduced() ? 0.25 : 1;
  const tweens = []; const frames = [];
  const S = {
    scene, world, camera, renderer, yaw: 0, pitch: 0, pointer: new THREE.Vector2(0, 0), dragging: false,
    tween: (dur, step) => new Promise((done) => tweens.push({ dur: dur * slow, t: 0, step, done })),
    onFrame: (fn) => frames.push(fn)
  };
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch, moved: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    S.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (!drag) return;
    const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    S.yaw = free ? drag.yaw + dx * 0.01 : Math.max(-yawLimit, Math.min(yawLimit, drag.yaw + dx * 0.008));
    S.pitch = Math.max(-0.3, Math.min(0.35, drag.pitch + dy * 0.004));
    S.dragging = drag.moved;
  });
  canvas.addEventListener('pointerup', (e) => { if (drag && !drag.moved && onClick) onClick(e); drag = null; S.dragging = false; });
  let last = performance.now();
  function frame(now) {
    if (!canvas.isConnected) { dispose(); return; }
    const real = Math.max(0, Math.min(0.25, (now - last) / 1000)); last = now;
    const dt = Math.min(0.05, real);
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    if (w && h && (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio()))) {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      if (fit) fit(camera, camera.aspect);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    }
    world.rotation.y += (S.yaw - world.rotation.y) * 0.15;
    world.rotation.x += (S.pitch - world.rotation.x) * 0.15;
    const t = now / 1000;
    frames.forEach((fn) => fn(t, dt, real));
    for (let i = tweens.length - 1; i >= 0; i -= 1) {
      const tw = tweens[i];
      tw.t += real;
      const k = tw.dur <= 0 ? 1 : Math.min(1, tw.t / tw.dur);
      tw.step(k);
      if (k >= 1) { tweens.splice(i, 1); tw.done(); }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  function dispose() {
    tweens.splice(0).forEach((tw) => tw.done());
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? [].concat(o.material) : [];
      mats.forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose(); });
    });
    renderer.dispose();
  }
  requestAnimationFrame(frame);
  return S;
}

// ---------- Batu geode klaim ----------
function createGeodeScene(canvas, onHit) {
  const S = miniScene(canvas, { cam: [0, 0.7, 5.4], look: [0, 0.15, 0], onClick: () => onHit(), fit: (cam, aspect) => { cam.position.z = Math.max(5.4, 3.2 / Math.max(0.6, aspect * 0.55)); } });
  if (!S) return null;
  const { scene, world } = S;
  scene.add(new THREE.HemisphereLight('#fff4ec', '#5b4a72', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 1.8);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  const glowLight = new THREE.PointLight('#b07cff', 0, 6, 0);
  scene.add(glowLight);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#7d6f8f', roughness: 0.9, flatShading: true, side: THREE.DoubleSide });
  const bump = (v) => 1 + 0.11 * Math.sin(v.x * 5.1 + v.y * 3.3) * Math.cos(v.z * 4.7 - v.y * 2.1);
  const half = (top) => {
    const geo = new THREE.SphereGeometry(1, 11, 6, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2);
    const pos = geo.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) { v.fromBufferAttribute(pos, i); const n = v.clone().normalize(); v.multiplyScalar(bump(n)); pos.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, rockMat);
  };
  const shell = new THREE.Group();
  world.add(shell);
  const top = half(true); const bot = half(false);
  const topPivot = new THREE.Group(); topPivot.add(top);
  shell.add(topPivot, bot);
  // Rongga kristal di dalam batu = asumsi tersembunyi.
  const crystalMat = new THREE.MeshStandardMaterial({ color: '#c9a2ff', emissive: '#7c3aed', emissiveIntensity: 0.4, roughness: 0.25, flatShading: true, transparent: true, opacity: 0.95 });
  const crystals = new THREE.Group();
  for (let i = 0; i < 14; i += 1) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 + (i % 4) * 0.05, 0), crystalMat);
    const a = i * 2.39996; const r = 0.15 + (i % 5) * 0.09;
    c.position.set(Math.cos(a) * r, -0.05 + ((i * 37) % 10) / 40, Math.sin(a) * r);
    c.scale.y = 1.6;
    c.rotation.set(i, i * 0.7, i * 0.3);
    c.userData.home = c.position.clone();
    crystals.add(c);
  }
  shell.add(crystals);
  const crack = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: '#d9b8ff', transparent: true, opacity: 0 }));
  crack.rotation.x = Math.PI / 2;
  shell.add(crack);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#5a5d6a', roughness: 0.95, flatShading: true }));
  pedestal.position.y = -1.25;
  world.add(pedestal);
  const dust = Array.from({ length: 24 }, () => { const d = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06, 0), rockMat); d.visible = false; world.add(d); return { m: d, v: new THREE.Vector3(), t: 0 }; });
  const ease = (k) => 1 - (1 - k) ** 3;
  let glow = 0.4; let spin = 0;

  function puff(color) {
    dust.forEach((d) => {
      d.m.visible = true; d.t = 0;
      d.m.material = color ? crystalMat : rockMat;
      d.m.position.set((Math.random() - 0.5) * 0.4, 0, 0.8 + Math.random() * 0.2);
      d.v.set((Math.random() - 0.5) * 3, Math.random() * 2.5 + 0.5, Math.random() * 1.5);
    });
  }
  S.onFrame((t, dt, real) => {
    crystals.rotation.y += dt * (0.4 + spin);
    crystalMat.emissiveIntensity += (glow - crystalMat.emissiveIntensity) * 0.1;
    glowLight.intensity = Math.max(0, (crystalMat.emissiveIntensity - 0.4) * 4) * (topPivot.rotation.x < -0.1 ? 1 : 0);
    dust.forEach((d) => {
      if (!d.m.visible) return;
      d.t += real;
      d.v.y -= 6 * real;
      d.m.position.addScaledVector(d.v, real);
      d.m.rotation.x += real * 5;
      if (d.t > 1.2 || d.m.position.y < -1.3) d.m.visible = false;
    });
  });

  return {
    async hit(level) {
      puff(false);
      crack.material.opacity = Math.min(1, level);
      await S.tween(0.35, (k) => { shell.position.x = Math.sin(k * Math.PI * 8) * 0.08 * (1 - k); shell.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.05); });
    },
    async split() {
      crack.material.opacity = 0;
      puff(false);
      await S.tween(0.8, (k) => { const e = ease(k); topPivot.position.set(0, e * 0.95, -e * 0.25); topPivot.rotation.x = -e * 0.75; bot.position.y = -e * 0.15; });
      glow = 0.6;
    },
    glow() { glow = 1.4; spin = 1; setTimeout(() => { spin = 0; }, 1200); },
    async shatter() {
      glow = 2;
      await S.tween(0.3, (k) => { crystals.scale.setScalar(1 + k * 0.25); });
      puff(true);
      await S.tween(0.9, (k) => {
        crystals.children.forEach((c, i) => {
          const a = i * 2.39996;
          c.position.set(c.userData.home.x + Math.cos(a) * k * 1.6, c.userData.home.y + Math.sin(k * Math.PI) * 0.8 - k * k * 1.6, c.userData.home.z + Math.sin(a) * k * 1.2);
          c.material.opacity = 0.95 * (1 - k);
        });
      });
      crystals.visible = false;
    },
    reset() {
      topPivot.position.set(0, 0, 0); topPivot.rotation.set(0, 0, 0); bot.position.set(0, 0, 0);
      crack.material.opacity = 0; glow = 0.4; crystals.visible = true; crystals.scale.setScalar(1);
      crystalMat.opacity = 0.95;
      crystals.children.forEach((c) => c.position.copy(c.userData.home));
    },
    celebrate() { glow = 2; spin = 2; }
  };
}

// ---------- Kemasan berputar dengan lampu sorot ----------
function createPackageScene(canvas, onFace) {
  const S = miniScene(canvas, { cam: [0, 0.35, 5.6], look: [0, 0, 0], free: true, fit: (cam, aspect) => { cam.position.z = Math.max(5.2, 2.2 / Math.max(0.4, aspect * 0.4)); } });
  if (!S) return null;
  const { scene, world, camera } = S;
  scene.add(new THREE.HemisphereLight('#fff7ea', '#4a3a2a', 1.15));
  const spot = new THREE.SpotLight('#fff4c8', 3.2, 12, 0.32, 0.6, 0);
  spot.position.set(0, 1.5, 5);
  scene.add(spot, spot.target);
  const [w, h, d] = PACK_SIZE;
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: '#dddddd' }));
  world.add(box);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.16, 32), new THREE.MeshStandardMaterial({ color: '#2c3e3c', roughness: 0.8 }));
  floor.position.y = -h / 2 - 0.08;
  scene.add(floor);
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 8, 48), new THREE.MeshBasicMaterial({ color: '#78f4bd', transparent: true, opacity: 0 }));
  glowRing.rotation.x = Math.PI / 2; glowRing.position.y = -h / 2 + 0.02;
  scene.add(glowRing);
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -d / 2);
  const hitPoint = new THREE.Vector3();
  const order = ['front', 'brand', 'back', 'side']; // sisi yang menghadap kamera pada sudut 0, 90°, 180°, 270°
  let lastFace = 'front'; let steady = 0; let reported = 'front'; let pulse = 0;
  S.onFrame((t, dt, real) => {
    // Lampu sorot mengikuti penunjuk di bidang depan kemasan.
    ray.setFromCamera(S.pointer, camera);
    if (ray.ray.intersectPlane(plane, hitPoint)) spot.target.position.lerp(hitPoint, 0.2);
    const yaw = ((world.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const face = order[Math.round(yaw / (Math.PI / 2)) % 4];
    if (face === lastFace) steady += real; else { lastFace = face; steady = 0; }
    if (steady > 0.35 && face !== reported) { reported = face; onFace(face); }
    if (!S.dragging) S.yaw += (Math.round(S.yaw / (Math.PI / 2)) * (Math.PI / 2) - S.yaw) * Math.min(1, dt * 3); // menempel ke sisi terdekat
    if (pulse > 0) { pulse = Math.max(0, pulse - dt); glowRing.material.opacity = Math.min(1, pulse); glowRing.scale.setScalar(1 + (1.5 - pulse) * 0.2); }
    box.position.y = Math.sin(t * 1.4) * 0.04;
  });
  return {
    setProduct(p) {
      [].concat(box.material).forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose(); });
      box.material = packageMaterials(p);
      S.yaw = 0; world.rotation.y = 0; reported = 'front'; lastFace = 'front';
      onFace('front');
    },
    turn(dir) { S.yaw = Math.round(S.yaw / (Math.PI / 2)) * (Math.PI / 2) + dir * (Math.PI / 2); },
    reveal() { pulse = 1.5; }
  };
}
