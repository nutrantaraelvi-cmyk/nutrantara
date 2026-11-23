/*
 * Layar pembuka beranda: intro interaktif 3 detik di atas ilustrasi layar muat.
 * Skrip klasik ini sengaja dimuat sinkron tepat setelah markup #splash, agar layar pembuka sudah tampil
 * sebelum beranda (Three.js, diorama, kartu pos) selesai dimuat. Tanpa JavaScript, #splash tetap `hidden`
 * dan beranda langsung terbuka.
 *
 * Urutan waktu (INTRO + OUTRO = 3 detik, dihitung sejak ilustrasi tampil; berhenti saat tab tersembunyi):
 *   0–2,4 s  gambar masuk, riak portal, kilau judul, Nara berkedip & menyapa, bilah muat 0→100%
 *   2,4–3 s  kamera melaju masuk portal, lalu beranda terbuka
 * Interaksi: kursor/jari menggerakkan paralaks dan menyibak butir cahaya, klik/ketuk memercikkan cahaya,
 * Nara bereaksi saat disentuh. MULAI GAME, Enter, Spasi, atau Esc langsung masuk tanpa menunggu.
 * Bila beranda belum selesai dimuat pada 2,4 s, bilah tertahan di 95% sampai siap (paling lama 15 s).
 * Lapisan efeknya (riak, kilau, mata, balon) ada di theme.css, diletakkan dalam persen ilustrasi.
 */
(function () {
  var splash = document.getElementById('splash');
  if (!splash) return;
  var root = document.documentElement;
  var art = splash.querySelector('.splash-art');
  var img = splash.querySelector('.splash-img');
  var btn = document.getElementById('splash-start');
  var fill = document.getElementById('splash-fill');
  var bar = document.getElementById('splash-bar');
  var pct = document.getElementById('splash-pct');
  var text = document.getElementById('splash-text');
  var nara = document.getElementById('splash-nara');
  var say = document.getElementById('splash-say');
  var lids = splash.querySelectorAll('.splash-lid');
  var canvas = document.getElementById('splash-motes');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(pointer: coarse)').matches;

  var INTRO = 2400, OUTRO = 600; // total 3 detik
  var STAGES = [
    [0, 'Menyiapkan Kepulauan NUTRANTARA…'],
    [0.34, 'Menanam jagung, kedelai, dan pepaya…'],
    [0.67, 'Menyalakan portal Nusantara…']
  ];
  var LINES = ['Hihi, geli! Ayo kita berangkat!', 'Enam pos pangan menunggu regumu!', 'Racik menu juara bersamaku, ya!'];

  root.classList.add('splash-open');
  splash.hidden = false;

  var imgReady = false, loaded = false, playing = false, done = false, removed = false, waiting = false, blinked = false;
  var startT = 0, hiddenAt = 0, last = 0, lastPct = -1, stage = -1, line = 0;

  // Jam intro memakai waktu nyata (beranda yang sibuk membangun 3D tidak memperpanjang intro),
  // tetapi berhenti selama tab tersembunyi agar intro tidak habis tanpa terlihat.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) hiddenAt = performance.now();
    else { if (hiddenAt && startT) startT += performance.now() - hiddenAt; hiddenAt = 0; }
  });

  if (img.complete) imgReady = true;
  else {
    img.addEventListener('load', function () { imgReady = true; });
    img.addEventListener('error', function () { imgReady = true; });
  }
  setTimeout(function () { imgReady = true; }, 2500); // gambar lambat: intro tetap berjalan

  function finish() {
    if (loaded) return;
    loaded = true;
    splash.classList.add('is-ready');
    if (waiting) enter(); // pemain sudah menekan MULAI GAME sebelum beranda siap
    else btn.focus({ preventScroll: true });
  }
  if (document.readyState === 'complete') finish(); else window.addEventListener('load', finish);
  setTimeout(finish, 15000); // pengaman: jangan pernah mengunci beranda karena satu aset lambat

  function setProgress(p) {
    var n = Math.round(p * 100);
    if (n === lastPct) return;
    lastPct = n;
    fill.style.width = n + '%';
    pct.textContent = n + '%';
    bar.setAttribute('aria-valuenow', String(n));
    if (n >= 100) { splash.classList.add('is-full'); text.textContent = 'Siap berangkat!'; return; }
    if (waiting) return;
    for (var s = STAGES.length - 1; s >= 0; s--) {
      if (p >= STAGES[s][0]) {
        if (s !== stage) { stage = s; text.textContent = STAGES[s][1]; }
        break;
      }
    }
  }

  function enter() {
    if (done) return;
    if (!loaded) { waiting = true; text.textContent = 'Sebentar lagi, pulau hampir siap…'; return; }
    done = true;
    setProgress(1);
    var r = btn.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 44, 1.3);
    root.classList.remove('splash-open');
    splash.classList.add('is-leaving');
    document.removeEventListener('keydown', onKey);
    setTimeout(function () {
      removed = true;
      window.removeEventListener('resize', resize);
      splash.remove();
    }, OUTRO + 50);
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); enter(); }
  }
  btn.addEventListener('click', enter);
  document.addEventListener('keydown', onKey);

  // ---------- Nara: berkedip & berbicara ----------
  function blink() {
    if (reduce || !lids.length || !lids[0].animate) return;
    for (var i = 0; i < lids.length; i++) {
      lids[i].animate(
        [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.45 }, { transform: 'scaleY(1)', offset: 0.6 }, { transform: 'scaleY(0)' }],
        { duration: 280, easing: 'ease-in-out' }
      );
    }
  }
  function talk() {
    say.textContent = LINES[line++ % LINES.length];
    if (!reduce && say.animate) {
      say.animate([{ transform: 'scale(.85)', opacity: 0.4 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'ease-out' });
    }
    blink();
  }
  nara.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && playing) talk(); });

  // ---------- Paralaks: ilustrasi bergeser & sedikit miring mengikuti kursor ----------
  var tx = 0, ty = 0, cx = 0, cy = 0;
  var ptr = { x: 0, y: 0, on: false }, lastTrail = 0;
  splash.addEventListener('pointermove', function (e) {
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
    if (e.pointerType === 'mouse' && e.timeStamp - lastTrail > 40) { lastTrail = e.timeStamp; spark(e.clientX, e.clientY, 0.35); }
  });
  splash.addEventListener('pointerleave', function () { tx = ty = 0; ptr.on = false; });
  splash.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') { tx = ty = 0; ptr.on = false; } });
  splash.addEventListener('pointerdown', function (e) {
    if (e.target === nara) { talk(); burst(e.clientX, e.clientY, 18, 0.8); return; }
    burst(e.clientX, e.clientY, 26, 1);
  });

  function parallax(dt) {
    if (reduce) return;
    var a = 1 - Math.pow(0.004, dt / 1000);
    var nx = cx + (tx - cx) * a, ny = cy + (ty - cy) * a;
    if (Math.abs(nx - cx) < 0.0005 && Math.abs(ny - cy) < 0.0005) return;
    cx = nx; cy = ny;
    art.style.translate = (cx * 10).toFixed(2) + 'px ' + (cy * 7).toFixed(2) + 'px';
    var ang = Math.min(1.4, Math.sqrt(cx * cx + cy * cy)) * 1.8;
    art.style.rotate = ang > 0.02 ? (-cy).toFixed(3) + ' ' + cx.toFixed(3) + ' 0 ' + ang.toFixed(2) + 'deg' : 'none';
    splash.style.setProperty('--px', cx.toFixed(3));
    splash.style.setProperty('--py', cy.toFixed(3));
  }

  // ---------- Butir cahaya (kanvas): melayang naik, menyibak dari kursor, memercik saat diklik ----------
  var ctx = !reduce && canvas.getContext ? canvas.getContext('2d') : null;
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var motes = [], sparks = [], SPR = {};
  function sprite(rgb) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(' + rgb + ',.95)');
    gr.addColorStop(0.45, 'rgba(' + rgb + ',.35)');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  }
  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function spawnMote(m, anywhere) {
    m.x = Math.random() * W;
    m.y = anywhere ? Math.random() * H : H + 20;
    m.vx = (Math.random() - 0.5) * 12;
    m.vy = -(14 + Math.random() * 30);
    m.r = 4 + Math.random() * 8;
    m.ph = Math.random() * 6.28;
    m.c = Math.random() < 0.55 ? 'gold' : 'cyan';
    m.a = 0.5 + Math.random() * 0.45;
    return m;
  }
  function spark(x, y, power) {
    if (!ctx || sparks.length > 220) return;
    var ang = Math.random() * 6.28, sp = (60 + Math.random() * 220) * power;
    var c = Math.random(), max = 0.55 + Math.random() * 0.55;
    sparks.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40 * power, r: 4 + Math.random() * 6 * power, c: c < 0.45 ? 'gold' : c < 0.85 ? 'cyan' : 'white', life: max, max: max });
  }
  function burst(x, y, n, power) { for (var i = 0; i < n; i++) spark(x, y, power); }
  if (ctx) {
    SPR.gold = sprite('255,215,110'); SPR.cyan = sprite('120,245,255'); SPR.white = sprite('255,250,235');
    resize();
    window.addEventListener('resize', resize);
    for (var i = 0, n = touch ? 34 : 64; i < n; i++) motes.push(spawnMote({}, true));
  }

  function drawFx(dt) {
    if (!ctx) return;
    var s = dt / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.ph += s * 1.6;
      m.x += (m.vx + Math.sin(m.ph) * 9) * s;
      m.y += m.vy * s;
      if (ptr.on) {
        var dx = m.x - ptr.x, dy = m.y - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400 && d2 > 1) {
          var d = Math.sqrt(d2), f = (1 - d / 120) * 220 * s;
          m.x += (dx / d) * f; m.y += (dy / d) * f;
        }
      }
      if (m.y < -30 || m.x < -30 || m.x > W + 30) spawnMote(m, false);
      ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(m.ph * 2.3));
      ctx.drawImage(SPR[m.c], m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    }
    var fr = Math.pow(0.08, s);
    for (var j = sparks.length - 1; j >= 0; j--) {
      var p = sparks[j];
      p.life -= s;
      if (p.life <= 0) { sparks.splice(j, 1); continue; }
      p.vx *= fr; p.vy = p.vy * fr + 90 * s;
      p.x += p.vx * s; p.y += p.vy * s;
      var k = p.life / p.max, r = p.r * (0.4 + 0.6 * k);
      ctx.globalAlpha = k;
      ctx.drawImage(SPR[p.c], p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Satu putaran bingkai untuk linimasa, paralaks, dan kanvas ----------
  function frame(now) {
    if (removed) return;
    var dt = last ? Math.min(100, now - last) : 16; // langkah fisika butir cahaya
    last = now;
    if (!playing && imgReady) { playing = true; startT = now; splash.classList.add('is-playing'); }
    if (playing) {
      if (!done) {
        var t = now - startT;
        var k = Math.min(1, t / INTRO);
        var eased = 1 - Math.pow(1 - k, 1.5);
        setProgress(loaded ? eased : Math.min(eased, 0.95));
        if (!blinked && t > 1400) { blinked = true; blink(); }
        if (k >= 1) enter();
      }
      parallax(dt);
      drawFx(dt);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
