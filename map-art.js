/*
 * Peta Kepulauan NUTRANTARA (layar "Peta"): lapisan animasi & interaksi di atas ilustrasi peta.
 * game.js tetap yang menggambar tombol pos (#map-nodes) dan kartu misi; berkas ini hanya
 * memosisikan pin di atas ilustrasi, mewarnai jalur cahaya sesuai progres, menaruh awan kunci,
 * memperbesar pulau yang dipilih, parallax mengikuti kursor, dan balon ucapan Nara.
 */
(function () {
  const board = document.getElementById('map-art');
  const nodesEl = document.getElementById('map-nodes');
  if (!board || !nodesEl) return;
  const stage = document.getElementById('map-stage');
  const locks = document.getElementById('map-locks');
  const spot = document.getElementById('map-spot');
  const nara = document.getElementById('map-nara');
  const naraText = document.getElementById('map-nara-text');
  const resetBtn = document.getElementById('map-reset');
  const motion = document.getElementById('map-traveler-motion');
  const traveler = board.querySelector('.route-traveler');
  const segs = [...board.querySelectorAll('.route-seg')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');

  // Posisi (persen dari ilustrasi 1672×941): pin pos dan pusat pulaunya.
  const PINS = { 1: [22.3, 21.3], 2: [13.6, 48], 3: [67.9, 23.6], 4: [90, 32.4], 5: [85.9, 58.7], 6: [73.7, 81.8] };
  const ISLES = { 1: [14.5, 14], 2: [7.5, 39], 3: [67.6, 13], 4: [88.5, 21], 5: [89.5, 49], 6: [74.5, 73] };
  const ZOOM = 1.3;

  let prev = {};
  const clouds = new Map();

  const statusOf = (n) => (n.classList.contains('completed') ? 'done' : n.classList.contains('locked') ? 'locked' : 'ready');
  const labelOf = (n) => (n.querySelector('small') ? n.querySelector('small').textContent : '');
  const pad = (id) => String(id).padStart(2, '0');

  function lockCloud(id) {
    const el = document.createElement('div');
    el.className = 'map-lock';
    el.style.left = `${ISLES[id][0]}%`;
    el.style.top = `${ISLES[id][1]}%`;
    el.innerHTML = '<i></i><i></i><i></i><i></i><b>🔒 TERKUNCI</b>';
    locks.append(el);
    return el;
  }

  function burst(id) {
    const el = document.createElement('div');
    el.className = 'map-burst';
    el.style.left = `${PINS[id][0]}%`;
    el.style.top = `${PINS[id][1]}%`;
    for (let i = 0; i < 12; i += 1) { const s = document.createElement('i'); s.style.setProperty('--a', `${i * 30}deg`); el.append(s); }
    stage.append(el);
    setTimeout(() => el.remove(), 1400);
  }

  function sync() {
    const nodes = [...nodesEl.querySelectorAll('[data-node]')];
    if (!nodes.length) return;
    const st = {};
    nodes.forEach((n) => {
      const id = Number(n.dataset.node);
      st[id] = statusOf(n);
      if (PINS[id]) { n.style.left = `${PINS[id][0]}%`; n.style.top = `${PINS[id][1]}%`; }
      n.addEventListener('pointerenter', () => showSpot(id));
      n.addEventListener('focus', () => showSpot(id));
      n.addEventListener('pointerleave', hideSpot);
      n.addEventListener('blur', hideSpot);
    });

    // Jalur k menghubungkan Pos k → Pos k+1.
    let active = null;
    segs.forEach((seg) => {
      const k = Number(seg.dataset.seg);
      const next = st[k + 1];
      seg.dataset.state = next === 'done' ? 'done' : next === 'ready' ? 'open' : 'locked';
      if (next === 'ready' && !active) active = seg;
    });
    if (active && motion) { motion.setAttribute('path', active.getAttribute('d')); traveler.style.display = ''; } else if (traveler) traveler.style.display = 'none';

    // Awan kunci: muncul di pulau terkunci, tersibak saat pos terbuka.
    Object.keys(st).forEach((key) => {
      const id = Number(key);
      const locked = st[id] === 'locked';
      if (locked && !clouds.has(id)) clouds.set(id, lockCloud(id));
      if (!locked && clouds.has(id)) {
        const el = clouds.get(id);
        clouds.delete(id);
        el.classList.add('clearing');
        setTimeout(() => el.remove(), reduce.matches ? 0 : 1200);
      }
      if (prev[id] && prev[id] !== 'done' && st[id] === 'done' && !reduce.matches) burst(id);
    });
    prev = st;
    speakFor(nodes.find((n) => n.classList.contains('selected')));
  }

  function showSpot(id) {
    if (!ISLES[id]) return;
    spot.style.left = `${ISLES[id][0]}%`;
    spot.style.top = `${ISLES[id][1]}%`;
    spot.classList.add('on');
  }
  function hideSpot() { spot.classList.remove('on'); }

  let lastSpoken = '';
  function speakFor(node) {
    if (!node) return;
    const id = Number(node.dataset.node);
    const status = statusOf(node);
    const titleEl = document.getElementById('card-title');
    // Judul kartu memakai <br>, jadi gabungkan bagian-bagiannya dengan spasi.
    const title = titleEl ? [...titleEl.childNodes].map((n) => n.textContent.trim()).filter(Boolean).join(' ') : labelOf(node);
    const note = (document.getElementById('card-note') || {}).textContent || '';
    const text = status === 'locked'
      ? `Pos ${pad(id)} masih tertutup awan. ${note.replace(/^⌑\s*/, '')}.`
      : status === 'done'
        ? `Pos ${pad(id)} · ${title} sudah tersegel ✦ Mau meninjau lagi?`
        : `Ayo ke Pos ${pad(id)}: ${title}! Tekan “Masuki pos” untuk mulai.`;
    if (text === lastSpoken) return;
    lastSpoken = text;
    naraText.textContent = text;
    nara.classList.remove('pop');
    void nara.offsetWidth;
    nara.classList.add('pop');
  }

  // ---------- Perbesar ke pulau yang dipilih ----------
  function zoomTo(id) {
    const p = PINS[id];
    if (!p) return;
    const lim = (ZOOM - 1) * 50; // geser maksimum agar tepi ilustrasi tidak terlihat
    const clamp = (v) => Math.max(-lim, Math.min(lim, v));
    const c = ISLES[id] || p;
    stage.style.setProperty('--tx', `${clamp((50 - (p[0] + c[0]) / 2) * ZOOM)}%`);
    stage.style.setProperty('--ty', `${clamp((50 - (p[1] + c[1]) / 2) * ZOOM)}%`);
    stage.style.setProperty('--s', String(ZOOM));
    board.classList.add('zoomed');
    resetBtn.hidden = false;
  }
  function resetZoom() {
    stage.style.setProperty('--tx', '0%');
    stage.style.setProperty('--ty', '0%');
    stage.style.setProperty('--s', '1');
    board.classList.remove('zoomed');
    resetBtn.hidden = true;
  }

  nodesEl.addEventListener('click', (e) => {
    const node = e.target.closest('[data-node]');
    if (node) zoomTo(Number(node.dataset.node));
  });
  resetBtn.addEventListener('click', resetZoom);
  board.addEventListener('click', (e) => { if (e.target === board || e.target.classList.contains('map-image')) resetZoom(); });
  board.addEventListener('keydown', (e) => { if (e.key === 'Escape' && board.classList.contains('zoomed')) { resetZoom(); e.stopPropagation(); } });

  // ---------- Parallax mengikuti kursor ----------
  board.addEventListener('pointermove', (e) => {
    if (reduce.matches || !finePointer.matches) return;
    const r = board.getBoundingClientRect();
    board.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    board.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  });
  board.addEventListener('pointerleave', () => { board.style.setProperty('--mx', '0'); board.style.setProperty('--my', '0'); });

  // Saat kembali ke layar Peta, mulai dari tampilan utuh.
  document.addEventListener('nutra:screen', (e) => { if (e.detail === 'map') resetZoom(); });

  new MutationObserver(sync).observe(nodesEl, { childList: true });
  sync();
})();
