/*
 * Layar muat utama beranda. Skrip klasik ini sengaja dimuat sinkron tepat setelah markup #splash,
 * agar layar muat sudah tampil sebelum beranda (Three.js, diorama, kartu pos) selesai dimuat.
 * Tanpa JavaScript, #splash tetap `hidden` dan beranda langsung terbuka.
 * Kunjungan pertama di sesi ini: pemain masuk lewat tombol MULAI GAME (klik, Enter, atau Spasi).
 * Kunjungan berikutnya di sesi yang sama: layar muat menutup sendiri begitu beranda siap.
 */
(function () {
  var splash = document.getElementById('splash');
  if (!splash) return;
  var root = document.documentElement;
  var img = splash.querySelector('.splash-img');
  var btn = document.getElementById('splash-start');
  var bar = document.getElementById('splash-bar');
  var fill = document.getElementById('splash-fill');
  var pct = document.getElementById('splash-pct');
  var text = document.getElementById('splash-text');
  var KEY = 'nutrantara-splash';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(pointer: coarse)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* mode privat: anggap kunjungan pertama */ }

  root.classList.add('splash-open');
  splash.hidden = false;

  var target = 4, shown = 0, loaded = false, ready = false, wantIn = false, done = false, lastPct = -1;
  function reach(v) { if (v > target) target = v; }

  // Tonggak muat nyata; di antaranya bilah merambat pelan agar tidak terlihat macet.
  if (img.complete) reach(18); else img.addEventListener('load', function () { reach(18); });
  document.addEventListener('DOMContentLoaded', function () { reach(82); });
  function finish() { loaded = true; target = 100; }
  if (document.readyState === 'complete') finish(); else window.addEventListener('load', finish);
  setTimeout(finish, 15000); // pengaman: jangan pernah mengunci beranda karena satu aset lambat

  function tick() {
    if (done) return;
    if (!loaded) target = Math.min(95, target + 0.05);
    shown += (target - shown) * (reduce ? 1 : 0.12);
    if (loaded && shown > 99.4) shown = 100;
    var p = Math.round(shown);
    if (p !== lastPct) {
      lastPct = p;
      fill.style.width = p + '%';
      pct.textContent = p + '%';
      bar.setAttribute('aria-valuenow', String(p));
    }
    if (shown === 100 && !ready) becomeReady();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function becomeReady() {
    ready = true;
    splash.classList.add('is-ready');
    if (wantIn || seen) { setTimeout(enter, wantIn ? 150 : 450); return; }
    text.textContent = touch ? 'Siap! Ketuk MULAI GAME' : 'Siap! Klik MULAI GAME atau tekan Enter';
    btn.focus({ preventScroll: true });
  }

  function enter() {
    if (done) return;
    if (!ready) { wantIn = true; text.textContent = 'Sebentar lagi, pulau hampir siap…'; return; }
    done = true;
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* abaikan */ }
    root.classList.remove('splash-open');
    splash.classList.add('is-leaving');
    document.removeEventListener('keydown', onKey);
    setTimeout(function () { splash.remove(); }, reduce ? 0 : 1100);
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); enter(); }
  }
  btn.addEventListener('click', enter);
  document.addEventListener('keydown', onKey);
})();
