/*
 * Misi di dalam dunia NUTRANTARA.
 * Setiap pulau pos analisis (Pos 1–5) memiliki:
 *   • Terminal Arsip (satu per baris data) → dipindai untuk mengumpulkan bukti,
 *   • Papan Laporan → tantangan keputusan (terbuka setelah semua terminal dipindai),
 *   • Altar Segel → alasan Paspor dan upacara segel.
 * Pos 6 memiliki Meja Dapur Juara yang membuka bengkel menu.
 * Logika skor tetap di game.js (NutraGame.submitAnswer / sealPost) agar sama dengan server.
 */
import * as THREE from './vendor/three/three.module.min.js';
import { createLabel, toon, PALETTE } from './characters.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const RADIUS = 1.9;

export function createQuests(ctx) {
  const { scene, fx, game, overlay, islandFrame, add } = ctx;
  const items = [];
  let panel = null; // { el, item, cleanup }
  const floaters = [];

  // ---------- Objek di pulau ----------

  function holoScreen(text, color) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.06), toon('#173a3a'));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    glass.position.z = 0.04;
    g.add(frame, glass);
    const label = createLabel(text, { color: '#ebfff6', bg: 'rgba(7,21,22,0)', size: 26, scale: 0.0085 });
    label.position.z = 0.08;
    g.add(label);
    g.userData.glass = glass;
    return g;
  }

  function buildTerminal(pos, row, label, x, z, rot) {
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.9, 8), toon('#2c4f4b')), 0, 0.45, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 8), toon(PALETTE.cyan, { emissive: PALETTE.cyan, emissiveIntensity: 0.4 })), 0, 0.92, 0, g);
    const screen = holoScreen(label.toUpperCase(), PALETTE.cyan);
    screen.position.y = 1.75;
    g.add(screen);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 6, 32), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);
    g.rotation.y = rot;
    add(g, x, 0, z);
    return { obj: g, screen, ring };
  }

  function buildBoard(x, z, rot) {
    const g = new THREE.Group();
    [-0.95, 0.95].forEach((px) => add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6), toon('#7a4a2a')), px, 1.1, 0, g));
    add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.12), toon('#a0683e')), 0, 1.65, 0, g);
    const screen = holoScreen('PAPAN LAPORAN', PALETTE.gold);
    screen.scale.set(1.3, 1.25, 1);
    screen.position.set(0, 1.65, 0.1);
    g.add(screen);
    const lock = createLabel('🔒 PINDAI SEMUA TERMINAL', { color: PALETTE.gold, size: 22 });
    lock.position.set(0, 2.65, 0);
    g.add(lock);
    g.rotation.y = rot;
    add(g, x, 0, z);
    return { obj: g, screen, lock };
  }

  function buildAltar(x, z, rot) {
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.35, 10), toon('#9aa59c')), 0, 0.18, 0, g);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.8, 10), toon('#c7cfc9')), 0, 0.75, 0, g);
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), toon(PALETTE.green, { emissive: PALETTE.green, emissiveIntensity: 0.25, unique: true }));
    emblem.scale.set(1, 1.3, 0.45);
    emblem.position.y = 1.75;
    g.add(emblem);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 30), new THREE.MeshBasicMaterial({ color: PALETTE.green, transparent: true, opacity: 0.4 }));
    halo.position.y = 1.75;
    g.add(halo);
    const label = createLabel('ALTAR SEGEL', { color: PALETTE.green, size: 22 });
    label.position.y = 2.6;
    g.add(label);
    g.rotation.y = rot;
    add(g, x, 0, z);
    return { obj: g, emblem, halo };
  }

  function buildKitchenTable(x, z) {
    const g = new THREE.Group();
    add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.3), toon('#c79a63')), 0, 1, 0, g);
    [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]].forEach(([px, pz]) => add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), toon('#7a4a2a')), px, 0.5, pz, g));
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.08, 16), toon('#ffffff')), -0.5, 1.12, 0, g);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 12), toon('#f2c94c')), -0.5, 1.45, 0, g);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.45), toon('#e9d8a6')), 0.5, 1.12, 0, g);
    const label = createLabel('MEJA DAPUR JUARA', { color: PALETTE.gold, size: 22 });
    label.position.y = 2.1;
    g.add(label);
    add(g, x, 0, z);
    return { obj: g };
  }

  // Tata letak tiap pulau pos (koordinat lokal relatif pusat pulau; z+ = sisi depan/selatan).
  game.missions.forEach((m) => {
    const f = islandFrame(m.id);
    if (!f) return;
    const P = (lx, lz) => ({ x: f.x + lx * f.rx, z: f.z + lz * f.rz });
    if (m.type === 'project') {
      const p = P(0, 0.05);
      const t = buildKitchenTable(p.x, p.z);
      items.push({ kind: 'kitchen', pos: m.id, x: p.x, z: p.z, ...t });
      return;
    }
    const rows = m.stimulus.rows;
    rows.forEach((row, i) => {
      const k = rows.length === 1 ? 0 : i / (rows.length - 1);
      const lx = -0.5 + k * 1.0;
      const p = P(lx, -0.08 + Math.abs(lx) * 0.25);
      const t = buildTerminal(m.id, i, row.label, p.x, p.z, -lx * 0.5);
      items.push({ kind: 'terminal', pos: m.id, row: i, x: p.x, z: p.z, label: row.label, ...t });
    });
    const b = P(-0.62, 0.42);
    items.push({ kind: 'board', pos: m.id, x: b.x, z: b.z, ...buildBoard(b.x, b.z, 0.45) });
    const a = P(0.62, 0.42);
    items.push({ kind: 'altar', pos: m.id, x: a.x, z: a.z, ...buildAltar(a.x, a.z, -0.45) });
  });

  // ---------- Status ----------

  const postOf = (id) => game.state.posts[id];
  const evidenceOf = (id) => (postOf(id) && postOf(id).evidence) || [];
  const allScanned = (id) => evidenceOf(id).length >= game.missionById(id).stimulus.rows.length;
  const challengesDone = (id) => postOf(id).challenges.every((c) => c.complete);

  function refresh() {
    items.forEach((it) => {
      const p = postOf(it.pos);
      if (!p) return;
      if (it.kind === 'terminal') {
        const done = evidenceOf(it.pos).includes(it.row) || p.sealed;
        const c = done ? PALETTE.green : PALETTE.cyan;
        it.screen.userData.glass.material.color.set(c);
        it.ring.material.color.set(c);
      }
      if (it.kind === 'board') {
        const open = allScanned(it.pos) || p.sealed;
        it.lock.visible = !open;
        it.screen.userData.glass.material.color.set(p.sealed || (open && challengesDone(it.pos)) ? PALETTE.green : open ? PALETTE.gold : '#6c7f79');
      }
      if (it.kind === 'altar') {
        const ready = challengesDone(it.pos) && !p.sealed;
        it.emblem.material.emissiveIntensity = p.sealed ? 1.2 : ready ? 0.8 : 0.15;
        it.emblem.material.color.set(p.sealed ? PALETTE.gold : PALETTE.green);
        it.halo.material.opacity = p.sealed ? 0.9 : ready ? 0.7 : 0.2;
      }
    });
  }

  function hint(it) {
    const m = game.missionById(it.pos);
    const p = postOf(it.pos);
    if (it.kind === 'kitchen') return `Meja Dapur Juara — rancang menu proyek akhir. Tekan E.`;
    if (it.kind === 'terminal') return `Terminal Arsip · ${it.label} — ${evidenceOf(it.pos).includes(it.row) ? 'sudah dipindai ✓' : 'tekan E untuk memindai'}`;
    if (it.kind === 'board') {
      if (p.sealed) return 'Papan Laporan — semua tantangan selesai ✓ (tekan E untuk meninjau)';
      if (!allScanned(it.pos)) return `Papan Laporan terkunci — pindai ${m.stimulus.rows.length - evidenceOf(it.pos).length} terminal lagi.`;
      return `Papan Laporan — ${p.challenges.filter((c) => c.complete).length}/${m.challenges.length} tantangan. Tekan E.`;
    }
    if (p.sealed) return 'Altar Segel — pos ini sudah tersegel ✓';
    return challengesDone(it.pos) ? 'Altar Segel siap! Tekan E untuk menulis alasan dan menyegel pos.' : 'Altar Segel — selesaikan Papan Laporan terlebih dahulu.';
  }

  function nearest(x, z, h) {
    if (h > 1.2) return null;
    let best = null; let bestD = RADIUS;
    items.forEach((it) => { const d = Math.hypot(it.x - x, it.z - z); if (d < bestD) { bestD = d; best = it; } });
    return best;
  }

  // ---------- Panel hologram ----------

  function openPanel(it, html, onMount) {
    closePanel(true);
    const el = document.createElement('div');
    el.className = 'holo';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<button type="button" class="holo-close" aria-label="Tutup panel (Esc)">×</button>${html}`;
    overlay.append(el);
    overlay.hidden = false;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); closePanel(); } };
    document.addEventListener('keydown', onKey);
    el.querySelector('.holo-close').addEventListener('click', () => closePanel());
    panel = { el, item: it, cleanup: () => document.removeEventListener('keydown', onKey) };
    ctx.onPanel(true);
    if (onMount) onMount(el);
    const focusable = el.querySelector('[data-autofocus]') || el.querySelector('button:not(.holo-close), input, textarea, select');
    if (focusable) setTimeout(() => focusable.focus(), 50);
  }

  function closePanel(silent) {
    if (!panel) return;
    panel.cleanup();
    const el = panel.el;
    panel = null;
    el.classList.add('holo-out');
    setTimeout(() => { el.remove(); if (!panel) overlay.hidden = true; }, 180);
    if (!silent) ctx.onPanel(false);
  }

  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  function floatText(text, x, y, z, color = PALETTE.gold) {
    const s = createLabel(text, { color, bg: 'rgba(7,21,22,.7)', size: 34, scale: 0.012 });
    s.position.set(x, y, z);
    scene.add(s);
    floaters.push({ s, t: 0 });
  }

  // ---------- Terminal: pindai bukti ----------

  function parseNum(v) { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; }

  function scanTerminal(it) {
    const m = game.missionById(it.pos);
    const row = m.stimulus.rows[it.row];
    const cols = m.stimulus.columns.slice(1);
    fx.ring({ x: it.x, y: 0, z: it.z }, { color: PALETTE.cyan, from: 0.4, to: 2.4, life: 0.6 });
    fx.sparkle({ x: it.x, y: 1.8, z: it.z }, PALETTE.cyan);
    const nums = row.values.map(([v]) => parseNum(v));
    const max = Math.max(...nums.filter((n) => n !== null), 1);
    const bars = row.values.map(([v, unit], i) => {
      const n = nums[i];
      const width = n === null ? 100 : Math.max(6, (n / max) * 100);
      return `<div class="scan-row"><span>${esc(cols[i])}</span><div class="scan-bar"><i style="--w:${width}%"></i></div><b ${n !== null ? `data-count="${n}"` : ''}>${n !== null ? '0' : esc(v)}</b><small>${esc(unit || '')}</small></div>`;
    }).join('');
    const already = evidenceOf(it.pos).includes(it.row);
    openPanel(it, `
      <p class="holo-kicker">POS ${pad(it.pos)} · TERMINAL ARSIP ${it.row + 1}/${m.stimulus.rows.length} <em>SIMULASI</em></p>
      <h2>${esc(row.label)}</h2>
      <div class="scan-beam" aria-hidden="true"></div>
      <div class="scan-rows">${bars}</div>
      <p class="holo-note">${esc(m.stimulus.title)} · Data simulasi untuk tantangan, bukan rekomendasi gizi.</p>
      <button type="button" class="button button-primary" data-act="keep" data-autofocus>${already ? 'Tutup' : 'Simpan sebagai bukti ✦'}</button>`, (el) => {
      el.querySelectorAll('[data-count]').forEach((b) => {
        const target = Number(b.dataset.count);
        const start = performance.now();
        const tick = (now) => {
          const k = Math.min(1, (now - start) / 700);
          b.textContent = (Math.round(target * (1 - (1 - k) ** 3) * 10) / 10).toLocaleString('id-ID');
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      el.querySelector('[data-act="keep"]').addEventListener('click', () => {
        if (!already) {
          const ev = game.scanEvidence(it.pos, it.row);
          fx.sparkle({ x: it.x, y: 2, z: it.z }, PALETTE.green);
          floatText('+ BUKTI', it.x, 2.6, it.z, PALETTE.green);
          refresh();
          const left = m.stimulus.rows.length - ev.length;
          ctx.say(left ? `Bukti "${row.label}" tersimpan. ${left} terminal lagi, lalu buka Papan Laporan.` : `Semua bukti terkumpul! Insight: ${m.stimulus.insight} Sekarang buka Papan Laporan.`, left ? 'talk' : 'celebrate');
        }
        closePanel();
      });
    });
  }

  // ---------- Papan Laporan: tantangan ----------

  function mark(def, value, chosen, done) {
    if (!done) return '';
    const right = Array.isArray(def.correct) ? def.correct.includes(value) : def.correct === value;
    return right ? ' is-correct' : chosen.includes(value) ? ' is-wrong' : '';
  }

  function challengeBody(def, draft, done) {
    const dis = done ? ' disabled' : '';
    if (def.type === 'single' || def.type === 'multi') {
      const chosen = def.type === 'single' ? [draft].filter(Boolean) : (draft || []);
      return `<fieldset class="holo-choices"><legend class="sr-only">${def.type === 'single' ? 'Pilih satu jawaban' : 'Pilih semua yang sesuai'}</legend>${def.options.map((o, i) => `<label class="holo-choice${mark(def, o.value, chosen, done)}"><input type="${def.type === 'single' ? 'radio' : 'checkbox'}" name="q" value="${esc(o.value)}"${chosen.includes(o.value) ? ' checked' : ''}${dis} /><span class="mark">${def.type === 'single' ? String.fromCharCode(65 + i) : '✓'}</span><span>${esc(o.text)}</span></label>`).join('')}</fieldset>${def.type === 'multi' ? '<p class="holo-note">Boleh memilih lebih dari satu.</p>' : ''}`;
    }
    if (def.type === 'order') {
      const order = Array.isArray(draft) && draft.length === def.items.length ? draft : def.items.map((x) => x.value);
      return `<p class="holo-note">Susun dengan tombol ↑ ↓.</p><ol class="holo-order">${order.map((v, i) => { const item = def.items.find((x) => x.value === v); return `<li><span class="mark">${i + 1}</span><span>${esc(item.text)}</span><button type="button" data-move="up" data-value="${esc(v)}" aria-label="Naikkan: ${esc(item.text)}"${i === 0 || done ? ' disabled' : ''}>↑</button><button type="button" data-move="down" data-value="${esc(v)}" aria-label="Turunkan: ${esc(item.text)}"${i === order.length - 1 || done ? ' disabled' : ''}>↓</button></li>`; }).join('')}</ol>`;
    }
    if (def.type === 'sort') {
      const map = draft || {};
      return `<div class="holo-sort">${def.items.map((it2, i) => `<label for="hs-${i}">${esc(it2.text)}</label><select id="hs-${i}" data-item="${esc(it2.value)}"${dis}><option value="">Pilih…</option>${def.categories.map((c) => `<option value="${esc(c.value)}"${map[it2.value] === c.value ? ' selected' : ''}>${esc(c.text)}</option>`).join('')}</select>`).join('')}</div>`;
    }
    return '';
  }

  function openBoard(it) {
    const m = game.missionById(it.pos);
    const p = postOf(it.pos);
    if (!allScanned(it.pos) && !p.sealed) {
      ctx.say(`Papan Laporan masih terkunci. Pindai dulu semua Terminal Arsip (${evidenceOf(it.pos).length}/${m.stimulus.rows.length}).`, 'shake');
      return;
    }
    let index = p.challenges.findIndex((c) => !c.complete);
    if (index < 0) index = m.challenges.length - 1;
    let draft = p.challenges[index].response ?? null;

    const table = `<table class="holo-table"><thead><tr>${m.stimulus.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${m.stimulus.rows.map((r) => `<tr><th>${esc(r.label)}</th>${r.values.map(([v, u]) => `<td>${esc(v)} <small>${esc(u || '')}</small></td>`).join('')}</tr>`).join('')}</tbody></table>`;

    const render = () => {
      const def = m.challenges[index];
      const c = p.challenges[index];
      const done = c.complete;
      const steps = m.challenges.map((_, i) => `<i class="${p.challenges[i].complete ? 'done' : i === index ? 'now' : ''}"></i>`).join('');
      return `
        <p class="holo-kicker">POS ${pad(it.pos)} · PAPAN LAPORAN <span class="holo-steps">${steps}</span></p>
        <details class="holo-data"><summary>Lihat bukti yang terkumpul</summary>${table}<p class="holo-note">${esc(m.stimulus.insight)}</p></details>
        <p class="holo-label">TANTANGAN ${pad(index + 1)} · ${esc(def.label)}</p>
        <h2>${esc(def.question)}</h2>
        <form class="holo-form" novalidate>${challengeBody(def, draft, done)}
          <div class="holo-feedback" role="status" aria-live="polite">${done ? (c.correct !== false ? `<b class="ok">✓ ${esc(def.success)} +${c.points} poin</b>` : `<div class="holo-wrong"><b>Belum tepat — tidak apa-apa, lanjut ke tugas berikutnya!</b><span>Jawaban yang tepat: <i>${esc(game.responseText(def, def.correct))}</i></span><span>${esc(String(def.success || '').replace(/^Tepat\.\s*/, ''))}</span><small>0 poin untuk tantangan ini</small></div>`) : ''}</div>
          ${done ? `<button type="button" class="button button-primary" data-act="next" data-autofocus>${index + 1 < m.challenges.length ? 'Tantangan berikutnya →' : 'Menuju Altar Segel ✦'}</button>` : '<button type="submit" class="button button-primary">Kirim keputusan ↗</button>'}
        </form>`;
    };

    const bind = (el) => {
      const form = el.querySelector('.holo-form');
      const def = () => m.challenges[index];
      const read = () => {
        const d = def();
        if (d.type === 'single') { const x = form.querySelector('input[name="q"]:checked'); return x ? x.value : null; }
        if (d.type === 'multi') return [...form.querySelectorAll('input[name="q"]:checked')].map((x) => x.value);
        if (d.type === 'order') return Array.isArray(draft) && draft.length === d.items.length ? draft : d.items.map((x) => x.value);
        if (d.type === 'sort') { const map = {}; form.querySelectorAll('select[data-item]').forEach((s) => { map[s.dataset.item] = s.value; }); return map; }
        return null;
      };
      form.addEventListener('change', () => { if (def().type !== 'order') draft = read(); });
      form.addEventListener('click', (e) => {
        const mv = e.target.closest('[data-move]');
        if (mv) {
          const order = read().slice();
          const from = order.indexOf(mv.dataset.value);
          const to = mv.dataset.move === 'up' ? from - 1 : from + 1;
          if (to < 0 || to >= order.length) return;
          [order[from], order[to]] = [order[to], order[from]];
          draft = order;
          rerender(`[data-move="${mv.dataset.move}"][data-value="${CSS.escape(mv.dataset.value)}"]`);
          return;
        }
        if (e.target.closest('[data-act="next"]')) {
          if (index + 1 < m.challenges.length) { index += 1; draft = p.challenges[index].response ?? null; rerender(); }
          else { closePanel(); ctx.say('Hebat! Sekarang pergi ke Altar Segel dan tuliskan alasanmu.', 'celebrate'); }
        }
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const res = game.submitAnswer(it.pos, index, read());
        const fb = el.querySelector('.holo-feedback');
        if (res.empty) { fb.innerHTML = `<b class="warn">${esc(res.message)}</b>`; shake(el); return; }
        if (res.correct) {
          fx.confetti({ x: it.x, y: 2.2, z: it.z });
          floatText(`+${res.points} POIN`, it.x, 3, it.z);
          ctx.nara('celebrate');
          refresh();
          rerender();
          return;
        }
        ctx.nara('shake');
        floatText('0 POIN · TETAP LANJUT', it.x, 3, it.z, '#ffffff');
        ctx.say('Tidak apa-apa! Lihat jawaban yang tepat dan penjelasannya, lalu lanjut ke tugas berikutnya.', 'talk');
        refresh();
        rerender();
      });
    };

    const rerender = (focusSel) => {
      if (!panel) return;
      const body = panel.el.querySelector('.holo-body');
      body.innerHTML = render();
      bind(panel.el);
      const f = (focusSel && panel.el.querySelector(focusSel)) || panel.el.querySelector('[data-autofocus]') || panel.el.querySelector('.holo-form input, .holo-form select, .holo-form button');
      if (f && !f.disabled) f.focus();
    };

    openPanel(it, `<div class="holo-body">${render()}</div>`, bind);
    panel.el.classList.add('holo-wide');
    ctx.nara('talk');
  }

  // ---------- Altar Segel ----------

  function openAltar(it) {
    const m = game.missionById(it.pos);
    const p = postOf(it.pos);
    if (p.sealed) {
      openPanel(it, `<p class="holo-kicker">POS ${pad(it.pos)} · ALTAR SEGEL</p><h2>Pos ini sudah tersegel ✦</h2><p class="holo-quote">“${esc(p.reason)}”</p><button type="button" class="button button-secondary" data-act="close" data-autofocus>Tutup</button>`, (el) => el.querySelector('[data-act="close"]').addEventListener('click', () => closePanel()));
      return;
    }
    if (!challengesDone(it.pos)) { ctx.say('Altar belum aktif. Selesaikan dulu semua tantangan di Papan Laporan.', 'shake'); return; }
    openPanel(it, `
      <p class="holo-kicker">POS ${pad(it.pos)} · ALTAR SEGEL · REFLEKSI PASPOR</p>
      <h2>${esc(m.passport.prompt)}</h2>
      <label class="sr-only" for="altar-reason">Alasanmu</label>
      <textarea id="altar-reason" rows="4" maxlength="500" placeholder="${esc(m.passport.placeholder)}" data-autofocus>${esc(p.reason)}</textarea>
      <div class="holo-counter"><span id="altar-count">0</span> / 500 · minimal ${game.minReason} karakter</div>
      <div class="holo-feedback" role="status" aria-live="polite"></div>
      <button type="button" class="button button-primary" data-act="seal">Segel Pos ${it.pos} ✦</button>`, (el) => {
      const ta = el.querySelector('textarea');
      const count = el.querySelector('#altar-count');
      const upd = () => { count.textContent = String(ta.value.trim().length); count.parentElement.classList.toggle('ok', ta.value.trim().length >= game.minReason); };
      ta.addEventListener('input', () => { upd(); p.reason = ta.value; });
      upd();
      el.querySelector('[data-act="seal"]').addEventListener('click', () => {
        const res = game.sealPost(it.pos, ta.value);
        if (!res.ok) { el.querySelector('.holo-feedback').innerHTML = `<b class="warn">${esc(res.message)}</b>`; shake(el); return; }
        closePanel();
        ceremony(it, res);
      });
    });
  }

  function ceremony(it, res) {
    fx.pillar({ x: it.x, y: 0, z: it.z }, { color: PALETTE.gold, height: 16, life: 2.6 });
    fx.rise({ x: it.x, y: 0.5, z: it.z }, PALETTE.gold);
    fx.ring({ x: it.x, y: 0, z: it.z }, { color: PALETTE.gold, from: 0.5, to: 6, life: 1.2 });
    setTimeout(() => fx.confetti({ x: it.x, y: 2.5, z: it.z }), 500);
    floatText(`SEGEL POS ${it.pos} +${res.points}`, it.x, 3.4, it.z);
    ctx.nara('celebrate');
    refresh();
    ctx.onSealed(it.pos, res);
    setTimeout(() => openResult(it), 2900);
  }

  // Kartu "Hasil Pos": penilaian dan evaluasi setelah pos disegel
  function openResult(it) {
    const ev = game.evaluatePost(it.pos);
    const pct = Math.round((ev.score / ev.max) * 100);
    const stars = ev.correct === ev.total ? 3 : ev.correct > 0 ? 2 : 1;
    openPanel(it, `
      <p class="holo-kicker">POS ${pad(it.pos)} · HASIL PENILAIAN &amp; EVALUASI</p>
      <h2>${esc(ev.title)}</h2>
      <div class="result-head"><div class="result-stars" aria-label="${stars} dari 3 bintang">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><div><b>${ev.score}/${ev.max} poin</b><span>${ev.correct}/${ev.total} jawaban benar · ${esc(ev.level)}</span></div></div>
      <div class="report-bar"><i style="width:${pct}%"></i></div>
      <p class="holo-label">KEMAMPUAN: ${esc(ev.skill)}</p>
      <ul class="result-items">${ev.items.map((x) => `<li class="${x.correct ? 'ok' : 'no'}"><b>${x.correct ? '✓' : '✗'} ${esc(x.label)} · ${x.points} poin</b>${x.correct ? '' : `<span>Jawabanmu: ${esc(x.yourText)}</span><span>Jawaban tepat: ${esc(x.correctText)}</span>`}<em>${esc(x.explanation)}</em></li>`).join('')}</ul>
      <p class="holo-quote">${esc(ev.advice)}</p>
      <button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut menjelajah ↗</button>`, (el) => el.querySelector('[data-act="close"]').addEventListener('click', () => closePanel()));
    if (ev.correct === ev.total) fx.confetti({ x: it.x, y: 2.5, z: it.z });
  }

  function activate(it) {
    if (it.kind === 'terminal') scanTerminal(it);
    else if (it.kind === 'board') openBoard(it);
    else if (it.kind === 'altar') openAltar(it);
    else if (it.kind === 'kitchen') game.openPos(it.pos);
  }

  function update(dt, t) {
    items.forEach((it, i) => {
      if (it.kind === 'terminal') {
        it.screen.position.y = 1.75 + Math.sin(t * 2 + i) * 0.06;
        it.ring.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.06);
      }
      if (it.kind === 'altar') { it.emblem.rotation.y += dt * 1.2; it.emblem.position.y = 1.75 + Math.sin(t * 1.8) * 0.1; it.halo.rotation.x = Math.PI / 2 + Math.sin(t) * 0.2; }
    });
    for (let i = floaters.length - 1; i >= 0; i -= 1) {
      const f = floaters[i];
      f.t += dt;
      f.s.position.y += dt * 0.9;
      f.s.material.opacity = Math.max(0, 1 - f.t / 1.8);
      if (f.t > 1.8) { scene.remove(f.s); floaters.splice(i, 1); }
    }
  }

  refresh();
  return { items, nearest, hint, activate, refresh, update, closePanel, get panelOpen() { return Boolean(panel); } };
}
