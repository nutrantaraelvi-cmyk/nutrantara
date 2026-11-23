/*
 * Pos 4 · Jejak Sebab Akibat: menghubungkan faktor dan mengenali batas bukti.
 *  1. Papan Benang Merah — peta dugaan sebab-akibat: tarik benang dari faktor → mekanisme → akibat.
 *     Benang yang melompati langkah, terbalik arah, atau memakai mekanisme keliru akan putus (dengan alasannya).
 *     Setelah lengkap, tiga benang bertemu di satu simpul; pemain bisa memutus benang dan melihat bahwa akibatnya
 *     tetap muncul, jadi akibat saja tidak bisa menunjuk penyebabnya (faktor terpaut).
 *  2. Simulator Usus Besar 3D ("Mesin Uji Adil") — dua usus besar (Minggu A dan B) berjalan berdampingan:
 *     kecepatan isi usus, tetes air yang diserap dinding, dan kelembapan feses mengikuti pengaturan serat, air,
 *     dan aktivitas. Mesin menandai uji ADIL (tepat satu faktor berbeda), TERPAUT, atau IDENTIK.
 *  3. Menara Siaran — setiap berita fiktif diperiksa dengan satu lensa batas bukti sebelum boleh mengudara.
 * Referensi rancangan: Control of Variables Strategy (Chen & Klahr, 1999) beserta miskonsepsi "uji adil = semua
 * kondisi sama" (Siler & Klahr); pemodelan sistem sebab-akibat SageModeler (Concord Consortium); aktivitas
 * korelasi vs sebab-akibat dengan faktor ketiga (variabel tersembunyi); tinjauan bukti konstipasi: serat paling
 * kuat, air terutama bila kurang minum, peran aktivitas fisik belum jelas. Semua angka adalah data simulasi.
 * Formatif: tidak memengaruhi skor. Semua aksi bisa dilakukan dengan tombol (keyboard); kanvas 3D bersifat visual.
 */
import * as THREE from './vendor/three/three.module.min.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const nowIso = () => new Date().toISOString();
const short = (t, n = 34) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);

/** Lintasan usus besar: sekum → kolon naik → melintang → turun → sigmoid → rektum. Dipakai juga oleh model di dunia. */
export const COLON_PATH = [[-1.5, -1.35, 0], [-1.72, -0.4, 0.05], [-1.75, 0.75, 0.05], [-1.45, 1.55, 0.15], [-0.6, 1.42, 0.38], [0.4, 1.48, 0.38], [1.4, 1.72, 0.15], [1.75, 0.9, 0.05], [1.72, -0.4, 0.05], [1.42, -1.18, 0.2], [0.75, -1.42, 0.38], [0.28, -1.12, 0.25], [0.12, -1.95, 0.05]];

export function createCausal({ game, openPanel, closePanel, shake, say, nara, onDone }) {
  const close = (el) => el.querySelectorAll('[data-act="close"]').forEach((b) => b.addEventListener('click', () => closePanel()));
  const TEAM = () => window.NutraTeam || null;
  const sharedTeam = () => Boolean(TEAM() && TEAM().shared());
  const alias = () => game.state.alias || '';

  // =====================================================================
  // 1. Papan Benang Merah
  // =====================================================================
  function openThreads(it) {
    const m = game.missionById(it.pos);
    const B = m.activity.threads;
    const nodes = Object.fromEntries(B.nodes.map((n) => [n.id, n]));
    const blank = () => ({ edges: {}, snaps: 0, done: false, stars: 0 });
    const bs = () => { const a = game.activityState(it.pos); return a.benang && typeof a.benang === 'object' ? a.benang : blank(); };
    const save = (fn, note) => game.updateActivity(it.pos, (a) => {
      if (!a.benang || typeof a.benang !== 'object') a.benang = blank();
      if (!a.benang.edges || typeof a.benang.edges !== 'object') a.benang.edges = {};
      fn(a.benang, a);
    }, note);
    const keyOf = (l) => `${l.from}>${l.to}`;
    const has = (l) => Boolean((bs().edges || {})[keyOf(l)]);
    const laneLinks = (lane) => B.links.filter((l) => l.lane === lane);
    const laneDone = (lane) => laneLinks(lane).every(has);
    const allDone = () => B.links.every(has);
    const factorLanes = Object.keys(B.lanes).filter((k) => k !== 'akibat');
    const gate = (from) => (TEAM() ? TEAM().check(it.pos, 'threads', from) : { ok: true });
    const owner = (from) => (TEAM() ? TEAM().tag(it.pos, 'threads', from) : '');
    // Apakah b dapat dicapai dari a lewat benang yang benar? (untuk membedakan "melompat" dan "terbalik")
    const reach = (a, b) => {
      const seen = new Set([a]); const q = [a];
      while (q.length) {
        const x = q.shift();
        for (const l of B.links) {
          if (l.from !== x || seen.has(l.to)) continue;
          if (l.to === b) return true;
          seen.add(l.to); q.push(l.to);
        }
      }
      return false;
    };
    let sel = null; let justMade = null; let snapping = null; let finished = false;
    const cut = new Set(); // benang yang diputus pemain setelah papan lengkap (hanya tampilan, tidak disimpan)

    const cardHtml = (n) => {
      const lane = n.lane ? B.lanes[n.lane] : n.kind === 'outcome' ? B.lanes.akibat : null;
      const tag = n.kind === 'factor' || n.kind === 'effect' ? owner(n.id) : '';
      const tilt = ((n.at[0] * 7 + n.at[1] * 3) % 5) - 2;
      return `<button type="button" class="bm-card ${n.kind}" data-node="${n.id}" style="left:${n.at[0]}%;top:${n.at[1]}%;--r:${tilt}deg${lane ? `;--c:${lane.color}` : ''}" aria-pressed="false">
        ${n.kind === 'factor' || n.kind === 'outcome' ? `<span class="bm-lamp" aria-hidden="true"></span><span class="bm-ico" aria-hidden="true">${lane.icon}</span>` : ''}
        <span class="bm-text">${esc(n.text)}</span>${tag ? `<small class="bm-owner">${esc(tag)}</small>` : ''}<span class="sr-only bm-state"></span></button>`;
    };

    openPanel(it, `
      <p class="holo-kicker">POS 04 · PAPAN BENANG MERAH <em>LATIHAN</em></p>
      <h2>Rentangkan jejak sebab-akibat</h2>
      <p class="holo-quote">Hubungkan setiap faktor ke akibatnya lewat langkah mekanisme yang masuk akal. <b>Klik kartu sebab, lalu klik kartu akibat langsungnya.</b> Benang yang melompati langkah, terbalik arah, atau memakai mekanisme keliru akan putus.</p>
      <div class="bm-hud" role="status" aria-live="polite"></div>
      <div class="bm-wrap"><div class="bm-board">
        <svg class="bm-strings" aria-hidden="true"><g class="bm-g"></g><path class="bm-str temp" d=""/></svg>
        ${B.nodes.map(cardHtml).join('')}
      </div></div>
      <p class="bm-readout" role="status" aria-live="polite">Mulai dari kartu faktor di kiri. Apa yang langsung diubahnya?</p>
      <div class="bm-after"></div>`, (el) => {
      el.classList.add('holo-wide');
      const board = el.querySelector('.bm-board');
      const svg = el.querySelector('.bm-strings');
      const group = el.querySelector('.bm-g');
      const temp = el.querySelector('.bm-str.temp');
      const readout = el.querySelector('.bm-readout');
      const after = el.querySelector('.bm-after');
      const card = (id) => board.querySelector(`[data-node="${id}"]`);
      // Titik paku di tepi atas kartu, dalam koordinat tata letak papan (tidak terpengaruh animasi panel).
      const pin = (id) => { const c = card(id); return { x: c.offsetLeft, y: c.offsetTop - c.offsetHeight / 2 + 8 }; };
      const curveD = (a, b) => {
        const sag = 14 + Math.hypot(b.x - a.x, b.y - a.y) * 0.1;
        return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)} ${(Math.max(a.y, b.y) + sag).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      };
      const laneCut = (lane) => (lane === 'akibat' ? factorLanes.every((k) => cut.has(k)) : cut.has(lane));
      const outcomeOn = () => B.links.filter((l) => l.lane === 'akibat').every(has) && factorLanes.some((k) => laneDone(k) && !cut.has(k));

      function draw() {
        const w = board.clientWidth; const h = board.clientHeight;
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        let out = '';
        B.links.forEach((l) => {
          if (!has(l)) return;
          const d = curveD(pin(l.from), pin(l.to));
          const color = B.lanes[l.lane].color;
          const isCut = laneCut(l.lane);
          const lit = laneDone(l.lane) && !isCut && (l.lane !== 'akibat' || outcomeOn());
          out += `<path class="bm-str${keyOf(l) === justMade ? ' new' : ''}${lit ? ' lit' : ''}${isCut ? ' cut' : ''}" style="--c:${color}" pathLength="1" d="${d}"/>`;
          if (lit) out += `<path class="bm-pulse" style="--c:${color}" pathLength="20" d="${d}"/>`;
        });
        if (snapping) out += `<path class="bm-str snap" pathLength="1" d="${curveD(pin(snapping[0]), pin(snapping[1]))}"/>`;
        group.innerHTML = out;
        justMade = null;
      }
      function lamps() {
        factorLanes.forEach((lane) => {
          const f = B.nodes.find((n) => n.kind === 'factor' && n.lane === lane);
          const c = card(f.id);
          const on = laneDone(lane) && !cut.has(lane);
          c.classList.toggle('lit', on);
          c.classList.toggle('cut', cut.has(lane));
          c.querySelector('.bm-state').textContent = on ? ' (lentera menyala)' : cut.has(lane) ? ' (benang diputus)' : '';
        });
        const o = card(B.nodes.find((n) => n.kind === 'outcome').id);
        o.classList.toggle('lit', outcomeOn());
        o.querySelector('.bm-state').textContent = outcomeOn() ? ' (akibat tercapai)' : '';
      }
      function hud() {
        const s = bs();
        el.querySelector('.bm-hud').innerHTML = Object.entries(B.lanes).map(([k, L]) => {
          const ls = laneLinks(k); const n = ls.filter(has).length;
          return `<span class="bm-chip${n === ls.length ? ' done' : ''}" style="--c:${L.color}">${L.icon} ${esc(L.label)} ${n}/${ls.length}</span>`;
        }).join('') + `<span class="bm-chip snaps">✂ putus ${s.snaps || 0}</span>`;
      }
      const paint = () => { draw(); lamps(); hud(); };

      function select(id) {
        sel = id;
        board.querySelectorAll('.bm-card').forEach((c) => { const on = c.dataset.node === id; c.classList.toggle('from', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        board.classList.toggle('picking', Boolean(id));
        temp.setAttribute('d', '');
        if (id) readout.innerHTML = `Sebab dipilih: <b>${esc(nodes[id].text)}</b>. Sekarang klik kartu akibat langsungnya (Esc untuk batal).`;
      }

      function attempt(from, to) {
        const l = B.links.find((x) => x.from === from && x.to === to);
        if (l && has(l)) { readout.textContent = 'Benang ini sudah terpasang. Cari langkah berikutnya.'; return; }
        const g = gate(from);
        if (!g.ok) { readout.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        if (l) {
          save((s) => { s.edges[keyOf(l)] = { by: alias(), at: nowIso() }; }, `merentangkan benang "${short(nodes[from].text)}" → "${short(nodes[to].text)}"${g.takeover ? ' (mengambil alih)' : ''}`);
          justMade = keyOf(l);
          paint();
          const L = B.lanes[l.lane];
          readout.innerHTML = `<b class="ok">✓ Benang terpasang.</b> ${esc(l.why)}${laneDone(l.lane) && l.lane !== 'akibat' ? ` <b class="bm-lit-msg">${L.icon} ${esc(L.label)} lengkap: lenteranya menyala!</b>` : ''}`;
          if (allDone()) setTimeout(finish, reduced() ? 50 : 750);
          return;
        }
        const trap = [nodes[from], nodes[to]].find((n) => n && n.trap);
        const why = trap ? trap.why : reach(to, from) ? B.reverse : reach(from, to) ? B.skip : B.tangle;
        save((s) => { s.snaps = (s.snaps || 0) + 1; });
        nara('shake');
        snapping = [from, to];
        draw();
        [card(from), card(to)].forEach((c) => { c.classList.remove('snapped'); void c.offsetWidth; c.classList.add('snapped'); });
        setTimeout(() => { snapping = null; if (el.isConnected) draw(); }, reduced() ? 60 : 760);
        readout.innerHTML = `<b class="warn">✂ Benang putus!</b> ${esc(why)}`;
        hud();
      }

      function toggleCut(id) {
        const n = nodes[id];
        if (!n || n.kind !== 'factor') { readout.innerHTML = 'Papan sudah lengkap. Klik kartu <b>faktor</b> di kiri untuk memutus atau menyambung benangnya.'; return; }
        if (cut.has(n.lane)) cut.delete(n.lane); else cut.add(n.lane);
        draw(); lamps();
        const left = factorLanes.filter((k) => !cut.has(k));
        const name = (k) => B.lanes[k].label.replace(/^Jalur /, '');
        readout.innerHTML = !cut.size ? 'Semua benang tersambung kembali.'
          : left.length ? `<b>${cut.size} benang diputus, tetapi keluhan tetap berkurang</b> lewat benang ${left.map(name).join(' dan ')}. Jadi melihat akibatnya saja tidak bisa menunjuk benang mana yang bekerja.`
            : '<b>Semua benang diputus: akibatnya padam.</b> Untuk tahu peran tiap benang, ubah satu faktor saja dan setarakan sisanya. Itulah uji adil di Simulator Usus Besar 3D.';
      }

      function finish() {
        if (finished || !el.isConnected) return;
        finished = true;
        select(null);
        const already = Boolean(game.activityState(it.pos).stations.benang);
        if (!already) save((s, a) => { s.stars = starsFor(s.snaps || 0); s.done = true; a.stations.benang = true; }, 'menuntaskan Papan Benang Merah');
        board.classList.add('done');
        paint();
        const stars = bs().stars || starsFor(bs().snaps || 0);
        readout.innerHTML = '<b class="ok">✓ Semua benang terpasang.</b> Ketiga lentera menyala dan bertemu di satu simpul.';
        after.innerHTML = `<div class="bm-finale"><p class="lab-stars">${starText(stars)}</p>
          <p><b>Simpul terpaut!</b> ${esc(B.finale)}</p>
          <p class="bm-try"><b>Coba sendiri:</b> klik kartu faktor untuk memutus benangnya. Apakah keluhan tetap berkurang?</p>
          <div class="holo-duo"><button type="button" class="button button-primary" data-act="close">Lanjut ke uji adil ↗</button>${sharedTeam() ? '' : '<button type="button" class="button button-secondary" data-act="again">Main lagi ↺</button>'}</div></div>`;
        close(after);
        const again = after.querySelector('[data-act="again"]');
        if (again) again.addEventListener('click', () => { game.updateActivity(it.pos, (a) => { a.benang = null; }); openThreads(it); });
        if (!already) onDone(it, stars, 'benang');
      }

      board.addEventListener('click', (e) => {
        const c = e.target.closest('.bm-card');
        if (!c) return;
        const id = c.dataset.node;
        if (finished) { toggleCut(id); return; }
        if (!sel) {
          const g = gate(id);
          if (!g.ok) { readout.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
          select(id);
          return;
        }
        if (sel === id) { select(null); readout.textContent = 'Pilihan dibatalkan.'; return; }
        const from = sel;
        select(null);
        attempt(from, id);
      });
      board.addEventListener('pointermove', (e) => {
        if (!sel) return;
        const r = board.getBoundingClientRect();
        const k = board.clientWidth / Math.max(1, r.width);
        temp.setAttribute('d', curveD(pin(sel), { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }));
      });
      board.addEventListener('pointerleave', () => temp.setAttribute('d', ''));
      el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sel) { e.stopPropagation(); select(null); readout.textContent = 'Pilihan dibatalkan.'; } });
      // Benang yang direntangkan anggota regu lain langsung muncul di papan ini.
      const onTeam = () => {
        if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; }
        paint();
        if (allDone()) finish();
      };
      document.addEventListener('nutra:team', onTeam);
      const onResize = () => { if (!el.isConnected) { window.removeEventListener('resize', onResize); return; } draw(); };
      window.addEventListener('resize', onResize);
      paint();
      if (allDone()) finish();
    });
  }

  // =====================================================================
  // 2. Simulator Usus Besar 3D: Mesin Uji Adil
  // =====================================================================
  function openColon(it) {
    const m = game.missionById(it.pos);
    const C = m.activity.colon;
    const F = C.factors;
    const blank = () => ({ runs: [], fair: {}, ulang: null, mistakes: 0, done: false, stars: 0 });
    const ks = () => { const a = game.activityState(it.pos); const k = a.kolon && typeof a.kolon === 'object' ? a.kolon : blank(); k.fair = k.fair || {}; k.runs = k.runs || []; return k; };
    const save = (fn, note) => game.updateActivity(it.pos, (a) => {
      if (!a.kolon || typeof a.kolon !== 'object') a.kolon = blank();
      if (!Array.isArray(a.kolon.runs)) a.kolon.runs = [];
      if (!a.kolon.fair || typeof a.kolon.fair !== 'object') a.kolon.fair = {};
      fn(a.kolon, a);
    }, note);
    const gate = (k) => (TEAM() ? TEAM().check(it.pos, 'colon', k) : { ok: true });
    const owner = (k) => (TEAM() ? TEAM().tag(it.pos, 'colon', k) : '');
    const result = (cfg) => ({
      days: Math.max(0, C.base.days - F.reduce((n, f) => n + (cfg[f.id] ? f.days : 0), 0)),
      transit: C.base.transit - F.reduce((n, f) => n + (cfg[f.id] ? f.transit : 0), 0)
    });
    const level = (v) => Object.fromEntries(F.map((f) => [f.id, v]));
    const judge = (a, b) => { const diff = F.filter((f) => a[f.id] !== b[f.id]); return { kind: !diff.length ? 'same' : diff.length === 1 ? 'fair' : 'terpaut', diff, factor: diff.length === 1 ? diff[0] : null }; };
    const isReplica = (a, b) => F.every((f) => !a[f.id] && b[f.id]) || F.every((f) => a[f.id] && !b[f.id]);
    const ready = () => Boolean(ks().ulang) && F.every((f) => ks().fair[f.id]);
    const pack = (c) => F.map((f) => (c[f.id] ? 'T' : 'R')).join('');
    const fmt = (p) => F.map((f, i) => `${f.icon}${p[i] === 'T' ? '↑' : '↓'}`).join(' ');
    const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const ORDER = [1, 3, 5, 0, 6, 2, 4]; // hari yang ditandai keluhan, berurutan
    let cfg = { A: level(0), B: ks().ulang ? level(0) : level(1) };
    let busy = false; let sim = null; let last = null;

    openPanel(it, `
      <p class="holo-kicker">POS 04 · SIMULATOR USUS BESAR 3D <em>LATIHAN</em></p>
      <h2>Mesin Uji Adil</h2>
      <div class="cl-view">
        <canvas class="cl-canvas" aria-label="Model 3D dua usus besar berdampingan, Minggu A dan Minggu B. Bisa diputar dengan menyeret."></canvas>
        <span class="cl-tag a">MINGGU A</span><span class="cl-tag b">MINGGU B</span>
        <span class="cl-clock" aria-hidden="true"></span>
        <span class="cl-hint">Seret untuk memutar · 💧 air diserap dinding usus besar · cincin = gerak peristaltik</span>
      </div>
      <p class="cl-readout" role="status" aria-live="polite"></p>
      <div class="cl-body"></div>`, (el) => {
      el.classList.add('holo-wide');
      const readout = el.querySelector('.cl-readout');
      const clock = el.querySelector('.cl-clock');
      const bodyEl = el.querySelector('.cl-body');
      sim = createColonScene(el.querySelector('.cl-canvas'), C);

      const rowHtml = (f) => {
        const d = cfg.A[f.id] !== cfg.B[f.id];
        return `<div class="cl-row${d ? ' diff' : ''}"><span class="cl-f">${f.icon} ${esc(f.label)}</span>
          ${['A', 'B'].map((w) => { const hi = cfg[w][f.id]; return `<button type="button" class="cl-tog ${hi ? 'hi' : 'lo'}" data-w="${w}" data-f="${f.id}" aria-pressed="${hi ? 'true' : 'false'}" aria-label="Minggu ${w}, ${esc(f.label)}: ${hi ? 'tinggi' : 'rendah'}. Klik untuk mengganti."><b>${hi ? 'Tinggi' : 'Rendah'}</b><small>${hi ? f.high : f.low} ${esc(f.unit)}/hari</small></button>`; }).join('')}
          <span class="cl-diff">${d ? '≠ berbeda' : '= sama'}</span></div>`;
      };
      const calHtml = (w, r, anim) => {
        const bad = new Set(ORDER.slice(0, r.days));
        return `<div class="cl-cal"><p><b>Minggu ${w}</b> · ${r.days} hari keluhan · transit ±${r.transit} jam</p><ol>${DAYS.map((d, i) => `<li class="${bad.has(i) ? 'bad' : 'ok'}${anim ? ' flip' : ''}" style="--i:${i}"><span>${d}</span><i aria-hidden="true">${bad.has(i) ? '😣' : '🙂'}</i><span class="sr-only">${bad.has(i) ? 'ada keluhan' : 'lancar'}</span></li>`).join('')}</ol></div>`;
      };
      const stampText = (x) => (x.rep ? 'TERPAUT · 3 faktor berubah bersamaan' : x.j.kind === 'fair' ? `UJI ADIL · ${x.j.factor.label.toUpperCase()}` : x.j.kind === 'same' ? 'IDENTIK · tidak ada yang diuji' : `TERPAUT · ${x.j.diff.length} faktor berbeda`);
      const resultsHtml = (x, anim) => `<div class="cl-cals">${calHtml('A', x.ra, anim)}${calHtml('B', x.rb, anim)}</div><p class="cl-stamp ${x.rep ? 'terpaut' : x.j.kind}${anim ? ' in' : ''}">${esc(stampText(x))}</p>`;
      const task = (done, icon, text, k, extra = '') => `<li class="${done ? 'done' : ''}"><span aria-hidden="true">${done ? '✓' : '○'}</span><span>${icon} ${text}${extra}</span>${owner(k) ? `<small class="cl-owner">${esc(owner(k))}</small>` : ''}<span class="sr-only">${done ? ' (selesai)' : ''}</span></li>`;
      const tasksHtml = () => {
        const s = ks();
        return [
          task(Boolean(s.ulang), '📋', 'Ulangi catatan harian: Minggu 1 vs Minggu 2', 'ulang'),
          ...F.map((f) => { const r = s.fair[f.id]; return task(Boolean(r), f.icon, `Uji adil ${esc(f.label.toLowerCase())}`, f.id, r ? ` <b>→ ${esc(f.label)} tinggi: ${r.days} hari keluhan lebih sedikit</b>` : ''); }),
          task(Boolean(s.done), '📈', 'Tarik kesimpulan dari Buku Uji', 'simpul')
        ].join('');
      };
      const bookHtml = () => {
        const runs = ks().runs;
        if (!runs.length) return '';
        return `<details class="cl-book"${runs.length <= 3 ? ' open' : ''}><summary>📒 Buku Uji regu (${runs.length} uji)</summary><ol>${runs.slice(-8).reverse().map((r) => `<li class="${esc(r.kind)}"><b>${r.kind === 'fair' ? `ADIL · ${esc((F.find((f) => f.id === r.factor) || {}).label || '')}` : r.kind === 'same' ? 'IDENTIK' : 'TERPAUT'}</b> A ${fmt(r.A)} → B ${fmt(r.B)} · keluhan ${r.da} → ${r.db} hari${r.by ? ` · ${esc(r.by)}` : ''}</li>`).join('')}</ol></details>`;
      };
      const conclusionHtml = () => `<form class="holo-form cl-conclude" novalidate><fieldset class="holo-choices"><legend class="holo-label">${esc(C.conclusion.question)}${owner('simpul') ? ` <small class="cl-owner">${esc(owner('simpul'))}</small>` : ''}</legend>
        ${C.conclusion.options.map((o, k) => `<label class="holo-choice"><input type="radio" name="cl-c" value="${esc(o.value)}" /><span class="mark">${String.fromCharCode(65 + k)}</span><span>${esc(o.text)}</span></label>`).join('')}</fieldset>
        <button type="submit" class="button button-primary">Simpulkan ↗</button></form>`;
      const doneHtml = () => {
        const s = ks();
        return `<div class="cl-done"><p class="lab-stars">${starText(s.stars || 1)}</p><p><b>Mesin Uji Adil tuntas!</b> ${esc(C.conclusion.explain)}</p>
          <table class="vl-table"><caption class="sr-only">Ringkasan Buku Uji</caption><thead><tr><th>Uji adil</th><th>Hari keluhan lebih sedikit</th><th>Transit lebih singkat</th></tr></thead>
          <tbody>${F.map((f) => { const r = s.fair[f.id] || {}; return `<tr><th>${f.icon} ${esc(f.label)} tinggi</th><td>${r.days ?? '–'} hari</td><td>${r.transit ?? '–'} jam</td></tr>`; }).join('')}</tbody></table>
          <div class="holo-duo"><button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>${sharedTeam() ? '' : '<button type="button" class="button button-secondary" data-act="replay">Main lagi ↺</button>'}</div></div>`;
      };
      const bodyHtml = (anim) => {
        if (ks().done) return doneHtml();
        const j = judge(cfg.A, cfg.B);
        return `<div class="cl-setup" role="group" aria-label="Pengaturan Minggu A dan Minggu B">
            <div class="cl-head" aria-hidden="true"><span>FAKTOR</span><span>MINGGU A</span><span>MINGGU B</span><span>BEDA?</span></div>
            ${F.map(rowHtml).join('')}
          </div>
          <div class="cl-actions">
            <button type="button" class="button button-primary cl-run">▶ Jalankan satu minggu</button>
            <button type="button" class="button button-secondary cl-preset">📋 Pasang catatan harian</button>
            <span class="cl-count">${j.diff.length} faktor berbeda</span>
          </div>
          <div class="cl-results">${last ? resultsHtml(last, anim) : '<p class="holo-note">Hasil muncul di sini: kalender keluhan tiap minggu dan perkiraan waktu transit (simulasi).</p>'}</div>
          <ol class="cl-tasks">${tasksHtml()}</ol>
          ${bookHtml()}
          ${ready() ? conclusionHtml() : ''}`;
      };

      function render(anim) {
        const picked = el.querySelector('input[name="cl-c"]:checked');
        const keep = picked ? picked.value : null;
        bodyEl.innerHTML = bodyHtml(anim);
        if (keep) { const r = bodyEl.querySelector(`input[name="cl-c"][value="${keep}"]`); if (r) r.checked = true; }
        bind();
        if (sim) { sim.setConfig(0, cfg.A); sim.setConfig(1, cfg.B); }
      }
      function bind() {
        close(bodyEl);
        bodyEl.querySelectorAll('.cl-tog').forEach((b) => b.addEventListener('click', () => {
          if (busy) return;
          const { w, f } = b.dataset;
          cfg[w][f] = cfg[w][f] ? 0 : 1;
          render();
          const again = bodyEl.querySelector(`.cl-tog[data-w="${w}"][data-f="${f}"]`);
          if (again) again.focus();
        }));
        const runBtn = bodyEl.querySelector('.cl-run');
        if (runBtn) runBtn.addEventListener('click', run);
        const preset = bodyEl.querySelector('.cl-preset');
        if (preset) preset.addEventListener('click', () => {
          if (busy) return;
          cfg = { A: level(0), B: level(1) };
          render();
          readout.innerHTML = 'Catatan harian terpasang: Minggu A = Minggu 1 (semua rendah), Minggu B = Minggu 2 (semua tinggi).';
        });
        const form = bodyEl.querySelector('.cl-conclude');
        if (form) form.addEventListener('submit', conclude);
        const replay = bodyEl.querySelector('[data-act="replay"]');
        if (replay) replay.addEventListener('click', () => {
          game.updateActivity(it.pos, (a) => { a.kolon = null; });
          cfg = { A: level(0), B: level(1) };
          last = null;
          readout.textContent = 'Mesin diulang dari awal. Jalankan catatan harian terlebih dahulu.';
          render();
        });
      }

      function verdictText(x) {
        const { ra, rb, j, rep } = x;
        const delta = Math.abs(ra.days - rb.days);
        if (rep) return `<b class="warn">TERPAUT.</b> Catatan harian tersimulasikan: keluhan ${ra.days} → ${rb.days} hari. Tetapi serat, air minum, dan aktivitas berubah bersamaan, jadi mesin tidak bisa menunjuk penyebabnya. Sekarang uji tiap faktor secara adil: ubah <b>satu</b> faktor saja.`;
        if (j.kind === 'same') return `<b class="warn">${esc(C.same)}</b>`;
        if (j.kind === 'fair') { const f = j.factor; return `<b class="ok">UJI ADIL · ${esc(f.label)}.</b> Hanya ${esc(f.label.toLowerCase())} yang berbeda: keluhan ${ra.days} → ${rb.days} hari, transit ${ra.transit} → ${rb.transit} jam. Selisih ${delta} hari dapat dikaitkan dengan ${esc(f.label.toLowerCase())} (di dalam model ini).`; }
        return `<b class="warn">TERPAUT.</b> ${j.diff.map((f) => esc(f.label)).join(' dan ')} berbeda sekaligus. Selisih ${delta} hari tidak bisa dikaitkan dengan satu faktor. Samakan faktor lain, lalu ubah tepat satu.`;
      }

      async function run() {
        if (busy) return;
        const A = { ...cfg.A }; const Bc = { ...cfg.B };
        const j = judge(A, Bc);
        const rep = isReplica(A, Bc);
        const s = ks();
        // Hanya uji yang menuntaskan tugas peran yang dikunci; uji coba bebas boleh dijalankan siapa saja.
        let taskKey = null;
        if (rep && !s.ulang) taskKey = 'ulang';
        else if (j.kind === 'fair' && !s.fair[j.factor.id]) taskKey = j.factor.id;
        const g = taskKey ? gate(taskKey) : { ok: true };
        if (!g.ok) { readout.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        busy = true;
        bodyEl.querySelectorAll('button, input').forEach((b) => { b.disabled = true; });
        const ra = result(A); const rb = result(Bc);
        readout.innerHTML = '⏳ Satu minggu berjalan di simulator… Perhatikan kecepatan isi usus besar dan tetes air yang diserap dindingnya.';
        if (sim) await sim.run([A, Bc], [ra.transit, rb.transit], (ha, hb) => { clock.textContent = `⏱ A ${Math.round(ha)} jam · B ${Math.round(hb)} jam`; });
        if (!el.isConnected) return;
        clock.textContent = `⏱ A ${ra.transit} jam · B ${rb.transit} jam`;
        last = { ra, rb, j, rep };
        const by = alias(); const at = nowIso();
        const entry = { A: pack(A), B: pack(Bc), kind: rep ? 'terpaut' : j.kind, factor: j.factor ? j.factor.id : null, da: ra.days, db: rb.days, by, at };
        const note = taskKey === 'ulang' ? 'mengulang catatan harian di Simulator Usus Besar' : taskKey ? `menguji ${j.factor.label.toLowerCase()} secara adil` : '';
        save((k) => {
          if (k.runs.length < 40) k.runs.push(entry);
          if (taskKey === 'ulang') k.ulang = { by, at };
          if (taskKey && taskKey !== 'ulang') k.fair[taskKey] = { days: Math.abs(ra.days - rb.days), transit: Math.abs(ra.transit - rb.transit), by, at };
          if (!rep && j.kind !== 'fair') k.mistakes = (k.mistakes || 0) + 1;
        }, note ? `${note}${g.takeover ? ' (mengambil alih)' : ''}` : undefined);
        readout.innerHTML = verdictText(last);
        if (!rep && j.kind !== 'fair') nara('shake');
        busy = false;
        render(true);
        if (ready() && !ks().done) say('Buku Uji lengkap! Sekarang tarik kesimpulan regu: apa arti hasil uji adil ini?', 'celebrate');
      }

      function conclude(e) {
        e.preventDefault();
        if (busy) return;
        const pick = el.querySelector('input[name="cl-c"]:checked');
        if (!pick) { readout.innerHTML = '<b class="warn">Pilih kesimpulanmu terlebih dahulu.</b>'; return; }
        const g = gate('simpul');
        if (!g.ok) { readout.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        if (pick.value !== C.conclusion.correct) {
          save((k) => { k.mistakes = (k.mistakes || 0) + 1; });
          nara('shake');
          shake(el.querySelector('.cl-conclude'));
          readout.innerHTML = `<b class="warn">Belum tepat.</b> ${esc((C.conclusion.wrong || {})[pick.value] || 'Baca lagi Buku Uji regu.')}`;
          return;
        }
        const already = Boolean(game.activityState(it.pos).stations.kolon);
        save((k, a) => { k.stars = starsFor(k.mistakes || 0); k.done = true; a.stations.kolon = true; }, `menyimpulkan uji adil Simulator Usus Besar${g.takeover ? ' (mengambil alih)' : ''}`);
        readout.innerHTML = '<b class="ok">✓ Tepat!</b> Uji adil memisahkan faktor yang terpaut, dan kesimpulannya tetap menyebut batasnya.';
        if (sim) sim.celebrate();
        if (!already) onDone(it, ks().stars, 'kolon');
        render();
      }

      // Uji yang dijalankan anggota regu lain langsung tercatat di Buku Uji ini.
      const onTeam = () => {
        if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; }
        if (busy) return;
        render();
      };
      document.addEventListener('nutra:team', onTeam);
      readout.innerHTML = ks().done ? 'Mesin Uji Adil sudah tuntas.' : ks().ulang
        ? 'Atur Minggu A dan Minggu B. Uji adil = ubah <b>tepat satu</b> faktor, setarakan sisanya.'
        : 'Minggu A dan B sudah dipasang seperti catatan harian (Minggu 1 vs Minggu 2). Jalankan, lalu dengarkan apa kata mesin.';
      render();
    });
  }

  // =====================================================================
  // 3. Menara Siaran: lensa batas bukti (kartu ke-k dipegang peran k mod 4)
  // =====================================================================
  function openTower(it) {
    const m = game.missionById(it.pos);
    const S = m.activity.tower;
    const L = S.lenses;
    const LK = Object.keys(L);
    const ts = () => game.activityState(it.pos).siaran || null;
    if (!ts() || !Array.isArray(ts().deck) || !ts().deck.length) {
      const per = Math.max(1, Math.floor(S.deal / LK.length));
      const deck = shuffle(LK.flatMap((lens) => shuffle(S.cards.map((c, i) => [c, i]).filter(([c]) => c.lens === lens)).slice(0, per).map(([, i]) => i)));
      game.updateActivity(it.pos, (a) => { a.siaran = { deck, done: [], wrong: 0, best: 0 }; });
    }
    const gateOf = (k) => (TEAM() ? TEAM().check(it.pos, 'card', null, k) : { ok: true });
    const ownerOf = (k) => (TEAM() ? TEAM().tag(it.pos, 'card', null, k) : '');
    const positions = () => ts().deck.map((_, k) => k);
    let skip = [];
    const queue = () => {
      const s = ts();
      const list = positions().filter((k) => !s.done.includes(k) && gateOf(k).ok);
      return [...list.filter((k) => !skip.includes(k)), ...skip.filter((k) => list.includes(k))];
    };
    const waiting = () => positions().filter((k) => !ts().done.includes(k) && !gateOf(k).ok);
    let streak = 0; let busy = false; let current = null; let finished = false;

    openPanel(it, `
      <p class="holo-kicker">POS 04 · MENARA SIARAN <em>LATIHAN</em></p>
      <h2>Periksa batas bukti sebelum mengudara</h2>
      <p class="holo-quote">Redaksi Radio Kota Terapung menerima berita fiktif ini. Pilih <b>lensa</b> yang paling tepat menggambarkan bukti di baliknya. Hanya berita dengan <b>uji adil</b> yang mengudara apa adanya; sisanya ditahan dan ditulis ulang dengan jujur.</p>
      <div class="sg-hud" role="status" aria-live="polite"><span class="ms-progress"></span><span class="ms-streak"></span></div>
      <div class="ms-studio">
        <div class="ms-tower" aria-hidden="true"><i class="ms-mast"></i><i class="ms-beacon"></i><i class="ms-wave w1"></i><i class="ms-wave w2"></i><i class="ms-wave w3"></i><b class="ms-onair">ON AIR</b></div>
        <div class="ms-desk"><article class="ms-card" tabindex="-1"></article></div>
      </div>
      <div class="ms-lenses" role="group" aria-label="Lensa batas bukti">${LK.map((k, i) => `<button type="button" class="ms-lens ${k}" data-lens="${k}"><span class="ms-lens-ico" aria-hidden="true">${L[k].icon}</span><b>${esc(L[k].label)}</b><small>${esc(L[k].hint)}</small><kbd>${i + 1}</kbd></button>`).join('')}</div>
      <p class="sg-wait" aria-live="polite"></p>
      <div class="holo-feedback ms-feedback" role="status" aria-live="polite">Gunakan tombol lensa atau tombol angka 1–4.</div>`, (el) => {
      el.classList.add('holo-wide');
      const card = el.querySelector('.ms-card');
      const tower = el.querySelector('.ms-tower');
      const fb = el.querySelector('.ms-feedback');
      const allDone = () => ts().done.length >= ts().deck.length;
      const hud = () => {
        el.querySelector('.ms-progress').innerHTML = `${sharedTeam() ? 'Diperiksa regu' : 'Diperiksa'} <b>${ts().done.length}/${ts().deck.length}</b> · salah lensa ${ts().wrong || 0}`;
        el.querySelector('.ms-streak').innerHTML = streak >= 2 ? `<b class="sg-combo">🔥 Combo ×${streak}</b>` : `Streak ${streak}`;
        const w = waiting();
        el.querySelector('.sg-wait').textContent = w.length ? `⏳ ${w.length} berita dipegang anggota lain: ${[...new Set(w.map(ownerOf))].join(', ')}. Ajak mereka memeriksa!` : '';
      };
      function showCard() {
        hud();
        if (allDone()) { finish(); return; }
        const q = queue();
        if (!q.length) {
          current = null;
          card.className = 'ms-card idle';
          card.innerHTML = '<span class="ms-tag">GILIRAN REGU</span><p>Beritamu sudah diperiksa semua! Tunggu anggota lain memeriksa berita bagiannya, lalu diskusikan lensanya bersama.</p>';
          return;
        }
        current = q[0];
        const c = S.cards[ts().deck[current]];
        card.className = 'ms-card enter';
        card.innerHTML = `<span class="ms-tag">BERITA MASUK ${current + 1}/${ts().deck.length}</span><p>“${esc(c.text)}”</p>${ownerOf(current) ? `<small class="sg-owner">${esc(ownerOf(current))}</small>` : ''}`;
      }
      function finish() {
        if (finished) return;
        finished = true;
        current = null;
        const s = ts();
        const stars = starsFor(s.wrong || 0);
        const already = Boolean(game.activityState(it.pos).stations.siaran);
        if (!already) game.updateActivity(it.pos, (a) => { if (a.siaran) a.siaran.stars = stars; a.stations.siaran = true; }, 'menuntaskan Menara Siaran');
        el.querySelector('.ms-studio').innerHTML = `<div class="sg-result"><p class="lab-stars">${starText(stars)}</p><p><b>Semua berita diperiksa!</b> Salah lensa: ${s.wrong || 0} · streak terbaik: ${s.best || 0}</p></div>`;
        el.querySelector('.ms-lenses').hidden = true;
        el.querySelector('.sg-wait').textContent = '';
        fb.innerHTML = '<b class="ok">✓ Kunci menara:</b> sebelum menyiarkan "A menyebabkan B", periksa apakah faktor lain ikut berubah, apakah buktinya cukup banyak dan lama, dan apakah itu hasil uji atau hanya hubungan. Kesimpulan yang jujur menyebut batas buktinya.';
        fb.insertAdjacentHTML('afterend', `<div class="holo-duo"><button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>${sharedTeam() ? '' : '<button type="button" class="button button-secondary" data-act="again">Main lagi ↺</button>'}</div>`);
        close(el);
        const again = el.querySelector('[data-act="again"]');
        if (again) again.addEventListener('click', () => { game.updateActivity(it.pos, (a) => { a.siaran = null; }); openTower(it); });
        el.querySelector('[data-act="close"]').focus();
        document.removeEventListener('keydown', onKey);
        if (!already) onDone(it, stars, 'siaran');
      }
      function pick(lens) {
        if (busy || current === null) return;
        const k = current;
        const c = S.cards[ts().deck[k]];
        const g = gateOf(k);
        const btn = el.querySelector(`.ms-lens[data-lens="${lens}"]`);
        busy = true;
        if (c.lens === lens) {
          streak += 1;
          const air = lens === 'adil';
          card.insertAdjacentHTML('beforeend', `<span class="ms-stamp ${air ? 'air' : 'hold'}">${air ? '📡 MENGUDARA' : `✋ DITAHAN · ${esc(L[lens].label.toUpperCase())}`}</span>`);
          card.classList.add(air ? 'onair' : 'held');
          if (air) { tower.classList.remove('live'); void tower.offsetWidth; tower.classList.add('live'); }
          btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
          fb.innerHTML = `<b class="ok">✓ ${esc(L[lens].label)}.</b> ${esc(c.why)}${c.fix ? `<span class="ms-fix"><b>Siaran jujur:</b> “${esc(c.fix)}”</span>` : ''}`;
          game.updateActivity(it.pos, (a) => { if (!a.siaran.done.includes(k)) a.siaran.done.push(k); a.siaran.best = Math.max(a.siaran.best || 0, streak); }, `memeriksa berita dengan lensa ${L[lens].label}${g.takeover ? ' (mengambil alih)' : ''}`);
          skip = skip.filter((x) => x !== k);
          setTimeout(() => { busy = false; if (el.isConnected) showCard(); }, reduced() ? 60 : 1100);
        } else {
          streak = 0;
          card.classList.remove('bounce'); void card.offsetWidth; card.classList.add('bounce');
          btn.classList.remove('miss'); void btn.offsetWidth; btn.classList.add('miss');
          nara('shake');
          fb.innerHTML = `<b class="warn">Bukan ${esc(L[lens].label.toLowerCase())}.</b> ${esc(c.why)} Berita ini kembali ke tumpukan.`;
          game.updateActivity(it.pos, (a) => { a.siaran.wrong = (a.siaran.wrong || 0) + 1; });
          skip = [...skip.filter((x) => x !== k), k];
          setTimeout(() => { busy = false; if (el.isConnected) showCard(); }, reduced() ? 60 : 900);
        }
      }
      const onKey = (e) => {
        if (!el.isConnected) { document.removeEventListener('keydown', onKey); return; }
        const n = Number(e.key);
        if (n >= 1 && n <= LK.length && !e.target.closest('input, textarea')) { e.preventDefault(); pick(LK[n - 1]); }
      };
      document.addEventListener('keydown', onKey);
      const onTeam = () => {
        if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; }
        if (busy || finished || !ts()) return;
        if (allDone()) { finish(); return; }
        if (current === null || ts().done.includes(current)) showCard(); else hud();
      };
      document.addEventListener('nutra:team', onTeam);
      el.querySelectorAll('.ms-lens').forEach((b) => b.addEventListener('click', () => pick(b.dataset.lens)));
      showCard();
    });
  }

  return { openThreads, openColon, openTower };
}

// =====================================================================
// Adegan 3D mini: dua usus besar berdampingan (Minggu A dan Minggu B)
// =====================================================================
function createColonScene(canvas, C) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.replaceWith(Object.assign(document.createElement('p'), { className: 'holo-note', textContent: 'Tampilan 3D tidak tersedia di perangkat ini. Uji adil tetap bisa dijalankan dengan tombol di bawah.' }));
    return null;
  }
  const slow = reduced() ? 0.25 : 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 2.4, 0.1, 100);
  scene.add(new THREE.HemisphereLight('#fff6ee', '#b4536a', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(3, 6, 8);
  scene.add(sun);
  const world = new THREE.Group();
  scene.add(world);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  const curve = new THREE.CatmullRomCurve3(COLON_PATH.map((p) => new THREE.Vector3(...p)));
  const DRY = new THREE.Color('#3e2412');
  const WET = new THREE.Color('#c08a4c');
  const Z = new THREE.Vector3(0, 0, 1);
  const UP = new THREE.Vector3(0, 1, 0);
  const T = new THREE.Vector3();
  const NRM = new THREE.Vector3();
  const N = 7; const SPACING = 0.09;
  const F = C.factors;
  // Model sederhana: air awal feses (w0), laju penyerapan air oleh dinding (k), lama transit (jam).
  const params = (cfg) => {
    const hi = (id) => Boolean(cfg && cfg[id]);
    return {
      w0: Math.min(1, 0.5 + (hi('air') ? 0.22 : 0) + (hi('serat') ? 0.2 : 0)),
      k: 0.026 * (hi('serat') ? 0.6 : 1),
      fiber: hi('serat'),
      active: hi('aktivitas'),
      transit: C.base.transit - F.reduce((n, f) => n + (hi(f.id) ? f.transit : 0), 0)
    };
  };

  function buildLane(x) {
    const g = new THREE.Group();
    g.position.x = x;
    world.add(g);
    // Dinding usus besar tembus pandang dengan tonjolan haustra.
    const TS = 200; const RS = 18;
    const geo = new THREE.TubeGeometry(curve, TS, 0.34, RS, false);
    const pos = geo.attributes.position;
    const P = new THREE.Vector3(); const V = new THREE.Vector3();
    for (let i = 0; i <= TS; i += 1) {
      const u = i / TS;
      curve.getPointAt(u, P);
      const f = u > 0.9 ? 1 - (u - 0.9) * 2.5 : 1 + 0.15 * Math.max(0, Math.sin(u * Math.PI * 2 * 16));
      for (let j = 0; j <= RS; j += 1) {
        const k = i * (RS + 1) + j;
        V.fromBufferAttribute(pos, k).sub(P).multiplyScalar(f).add(P);
        pos.setXYZ(k, V.x, V.y, V.z);
      }
    }
    geo.computeVertexNormals();
    const wall = new THREE.Mesh(geo, mat('#f3a59c', { transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, roughness: 0.3, emissive: '#000000' }));
    wall.renderOrder = 2;
    g.add(wall);
    const tube = (pts, r, color) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))); const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 24, r, 8, false), mat(color)); g.add(mesh); return mesh; };
    tube([[-0.5, -0.5, 0.4], [-0.95, -0.95, 0.32], [-1.38, -1.12, 0.12]], 0.13, '#f7c1b8'); // ujung usus halus masuk ke sekum
    tube([[-1.55, -1.5, 0.05], [-1.5, -1.8, 0.1], [-1.38, -1.95, 0.12]], 0.06, '#f3a59c'); // umbai cacing
    // Gelombang peristaltik: cincin yang merambat di sepanjang usus.
    const rings = Array.from({ length: 5 }, () => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 28), mat('#ff9f43', { emissive: '#ff8a1f', emissiveIntensity: 0.7, transparent: true, opacity: 0.8 })); g.add(r); return r; });
    // Isi usus besar: gumpalan feses; serpih hijau = serat.
    const fleckGeo = new THREE.BoxGeometry(0.12, 0.025, 0.025);
    const boluses = Array.from({ length: N }, () => {
      const b = new THREE.Group();
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), mat('#8a5a2b', { roughness: 0.85 }));
      b.add(core);
      const flecks = new THREE.Group();
      for (let k = 0; k < 5; k += 1) {
        const fl = new THREE.Mesh(fleckGeo, mat('#4caf50'));
        fl.position.set(Math.cos(k * 1.3) * 0.17, Math.sin(k * 2.1) * 0.12, Math.sin(k * 1.3) * 0.15);
        fl.rotation.set(k, k * 2, k * 0.5);
        flecks.add(fl);
      }
      b.add(flecks);
      g.add(b);
      return { g: b, core, flecks, u: 0, water: 0.5 };
    });
    // Tetes air yang diserap kembali oleh dinding usus besar.
    const drops = Array.from({ length: 36 }, () => {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('#3aa0ff', { emissive: '#3aa0ff', emissiveIntensity: 0.5, transparent: true, opacity: 0 }));
      d.visible = false;
      g.add(d);
      return { m: d, t: 0, life: 0.9, v: new THREE.Vector3() };
    });
    return { g, wall, rings, boluses, drops, p: params(null), run: null };
  }
  const lanes = [buildLane(-2.9), buildLane(2.9)];

  const idleU = (i) => 0.08 + i * (0.8 / (N - 1));
  const waterAt = (L, hours) => L.p.w0 * Math.exp(-L.p.k * hours);
  function place(L, b, u, water) {
    b.u = u; b.water = water;
    b.g.visible = u >= 0 && u <= 1;
    if (!b.g.visible) return;
    curve.getPointAt(u, b.g.position);
    b.g.scale.setScalar((L.p.fiber ? 1.22 : 1) * (0.7 + 0.42 * water));
    b.core.material.color.copy(DRY).lerp(WET, Math.min(1, water * 1.6));
    b.core.material.roughness = 0.95 - Math.min(0.6, water * 0.8);
    b.flecks.visible = L.p.fiber;
  }
  const idle = (L) => L.boluses.forEach((b, k) => place(L, b, idleU(k), waterAt(L, idleU(k) * L.p.transit)));
  function setConfig(i, cfg) { const L = lanes[i]; L.p = params(cfg); if (!L.run) idle(L); }
  function spawnDrop(L, at, u) {
    const d = L.drops.find((x) => !x.m.visible);
    if (!d) return;
    d.m.visible = true; d.t = 0;
    d.m.position.copy(at);
    curve.getTangentAt(Math.min(1, Math.max(0, u)), T);
    NRM.crossVectors(T, UP);
    if (NRM.lengthSq() < 0.01) NRM.set(1, 0, 0);
    NRM.normalize().applyAxisAngle(T, Math.random() * Math.PI * 2);
    d.v.copy(NRM).multiplyScalar(0.75);
  }

  let pending = null;
  function run(cfgs, transits, onTick) {
    cfgs.forEach((c, i) => setConfig(i, c));
    lanes.forEach((L, i) => { L.run = { t: 0, dur: Math.max(2.4, (transits[i] / C.base.transit) * 7) * slow, hours: transits[i], now: 0, finished: false }; });
    return new Promise((done) => { pending = { onTick, done }; });
  }
  let glow = 0;
  function celebrate() { glow = 1.6; }

  // ---------- Interaksi: seret untuk memutar ----------
  let drag = null; let yaw = 0; let pitch = 0;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw = Math.max(-0.7, Math.min(0.7, drag.yaw + (e.clientX - drag.x) * 0.008));
    pitch = Math.max(-0.25, Math.min(0.35, drag.pitch + (e.clientY - drag.y) * 0.004));
  });
  canvas.addEventListener('pointerup', () => { drag = null; });

  // ---------- Loop render (berhenti & membersihkan diri saat panel ditutup) ----------
  let last = performance.now();
  function frame(now) {
    if (!canvas.isConnected) { dispose(); return; }
    const real = Math.max(0, Math.min(0.25, (now - last) / 1000)); last = now;
    const dt = Math.min(0.05, real);
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    if (w && h && (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio()))) {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      const half = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(7.4, 5.1 / (half * camera.aspect), 2.3 / half);
      camera.position.set(0, 0.35, dist);
      camera.lookAt(0, -0.05, 0);
      camera.updateProjectionMatrix();
    }
    world.rotation.y += (yaw - world.rotation.y) * 0.15;
    world.rotation.x += (pitch - world.rotation.x) * 0.15;
    const t = now / 1000;
    if (glow > 0) glow = Math.max(0, glow - dt);
    lanes.forEach((L) => {
      L.wall.material.emissive.setRGB(0, glow * 0.25, glow * 0.12);
      const speed = (L.p.active ? 0.2 : 0.09) * (reduced() ? 0.3 : 1);
      const count = L.p.active ? 5 : 2;
      L.rings.forEach((r, k) => {
        r.visible = k < count;
        if (!r.visible) return;
        const u = (t * speed + k / count) % 1;
        curve.getPointAt(u, r.position);
        curve.getTangentAt(u, T);
        r.quaternion.setFromUnitVectors(Z, T);
        r.scale.setScalar(1 + 0.12 * Math.sin(t * 6 + k));
        r.material.opacity = 0.25 + 0.6 * Math.sin(Math.PI * u);
      });
      if (L.run && !L.run.finished) {
        L.run.t += real;
        const p = Math.min(1, L.run.t / L.run.dur);
        const span = 1 + (N - 1) * SPACING;
        L.boluses.forEach((b, k) => {
          const u = p * span - k * SPACING;
          const inside = Math.max(0, Math.min(1, u));
          const before = b.water;
          const water = waterAt(L, inside * L.run.hours);
          place(L, b, u, water);
          if (u > 0 && u < 1 && before - water > 0 && Math.random() < (before - water) * 60) spawnDrop(L, b.g.position, u);
        });
        L.run.now = p * L.run.hours;
        if (p >= 1) L.run.finished = true;
      } else if (!L.run) {
        L.boluses.forEach((b, k) => { b.g.rotation.y += dt * 0.5; if (!reduced()) b.g.position.y += Math.sin(t * 2 + k) * 0.0008; });
      }
      L.drops.forEach((d) => {
        if (!d.m.visible) return;
        d.t += real;
        const k = d.t / d.life;
        if (k >= 1) { d.m.visible = false; d.m.material.opacity = 0; return; }
        d.m.position.addScaledVector(d.v, real);
        d.m.material.opacity = 0.9 * (1 - k);
      });
    });
    if (pending) {
      pending.onTick(lanes[0].run ? lanes[0].run.now : 0, lanes[1].run ? lanes[1].run.now : 0);
      if (lanes.every((L) => !L.run || L.run.finished)) {
        const { done } = pending;
        pending = null;
        setTimeout(() => { lanes.forEach((L) => { L.run = null; idle(L); }); }, 500);
        done();
      }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  function dispose() {
    if (pending) { const { done } = pending; pending = null; done(); }
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    renderer.dispose();
  }
  requestAnimationFrame(frame);
  return { setConfig, run, celebrate };
}
