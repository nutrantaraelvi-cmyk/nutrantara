/*
 * Pos 6 · Pemulihan Arsip: telaah sejawat penjelasan Paspor dan pengumpulan Paspor Nusantara.
 *  - Arsip Nusantara punya satu halaman untuk tiap Pos 1–5. Halaman itu pudar sampai setiap penjelasan Paspor di
 *    dalamnya ditelaah teman regu dengan rubrik Klaim–Bukti–Penalaran, sorotan bukti (stabilo) pada teksnya, satu
 *    pujian spesifik, dan satu saran yang bisa ditindaklanjuti. Penulis membaca masukan lalu boleh merevisi penjelasannya.
 *  - Telaah diri hanya berlaku bila penulis tidak punya teman aktif yang sudah mencapai Pos 6 (mode solo atau
 *    anggota lain belum bermain), agar regu yang bermain bergantian tidak macet.
 *  - Buku Paspor Nusantara 3D: halaman dibalik, cap pos menghantam halaman yang pulih, sampul emas saat lengkap.
 * Referensi rancangan: kerangka penjelasan ilmiah Klaim–Bukti–Penalaran (CER, McNeill & Krajcik); telaah sejawat
 * terstruktur dengan rubrik dan kalimat pemandu agar masukan spesifik; siklus draf → telaah → revisi dalam PjBL.
 * Disimpan di posts[6].activity.arsip (bagian bersama regu): reviews["pos:penulis:penelaah"], revisi["pos:penulis"].
 */
import * as THREE from './vendor/three/three.module.min.js';
import { miniScene } from './claims.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const nowIso = () => new Date().toISOString();
export const POST_COLORS = { 1: '#ff9f43', 2: '#b07cff', 3: '#ff6f91', 4: '#e2553f', 5: '#7c5fd6', 6: '#f5b72b' };

/** Penjelasan, telaah, dan status setiap halaman arsip. Dipakai panel Ruang Arsip dan model di dunia. */
export function archiveStatus(game) {
  const net = window.NutraNet || null;
  const party = net && net.online && net.party ? net.party : null;
  const meId = net && net.me ? net.me.id : 'me';
  const team = party && Array.isArray(party.members) && party.members.length > 1;
  const members = team ? party.members : [{ id: meId, alias: game.state.alias || 'Kamu', active: true, seals: 6 }];
  const project = game.missions.find((m) => m.type === 'project');
  const act = game.activityState(project.id) || {};
  const arsip = act.arsip && typeof act.arsip === 'object' ? act.arsip : {};
  const reviews = arsip.reviews || {};
  const revisi = arsip.revisi || {};
  // Telaah diri hanya bila penulis tidak punya teman aktif yang sudah mencapai Pos 6.
  const selfOk = (author) => !team || !members.some((m) => m.id !== author && m.active && (m.seals || 0) >= 5);
  const pages = game.missions.filter((m) => m.type === 'analysis').map((m) => {
    const explanations = members.map((mb) => {
      const mine = mb.id === meId;
      const p = game.state.posts[m.id];
      const text = mine ? (p && p.sealed ? String(p.reason || '').trim() : '') : String((mb.reasons || {})[m.id] || '').trim();
      if (!text) return null;
      const got = Object.keys(reviews).filter((k) => k.startsWith(`${m.id}:${mb.id}:`)).map((k) => ({ ...reviews[k], reviewer: k.split(':')[2] }));
      const ok = got.some((r) => r.reviewer !== mb.id) || (selfOk(mb.id) && got.some((r) => r.reviewer === mb.id));
      return { pos: m.id, author: mb.id, alias: mb.alias, mine, text, reviews: got, ok, selfOk: selfOk(mb.id), revision: revisi[`${m.id}:${mb.id}`] || null };
    }).filter(Boolean);
    return { pos: m.id, mission: m, explanations, restored: explanations.length > 0 && explanations.every((e) => e.ok) };
  });
  const restored = pages.filter((p) => p.restored).length;
  const idx = members.findIndex((m) => m.id === meId);
  return {
    meId, team, members, pages, restored, total: pages.length, done: restored === pages.length,
    partner: team && idx >= 0 ? members[(idx + 1) % members.length] : null,
    // Mode solo: telaah diri ikut dihitung; dalam regu hanya telaah untuk/dari teman.
    myReviews: Object.keys(reviews).filter((k) => { const [, a, r] = k.split(':'); return r === meId && (a !== meId || !team); }).length,
    forMe: Object.keys(reviews).filter((k) => { const [, a, r] = k.split(':'); return a === meId && (r !== meId || !team); }).length
  };
}

export function createArchive({ game, openPanel, closePanel, shake, say, nara, onDone }) {
  const close = (el) => el.querySelectorAll('[data-act="close"]').forEach((b) => b.addEventListener('click', () => closePanel()));
  const alias = () => game.state.alias || '';

  function open(it) {
    const m = game.missionById(it.pos);
    const A = m.activity.archive;
    const save = (fn, note) => game.updateActivity(it.pos, (a) => {
      if (!a.arsip || typeof a.arsip !== 'object') a.arsip = { reviews: {}, revisi: {} };
      a.arsip.reviews = a.arsip.reviews || {};
      a.arsip.revisi = a.arsip.revisi || {};
      fn(a.arsip, a);
    }, note);
    const S0 = archiveStatus(game);
    let page = Math.max(0, S0.pages.findIndex((p) => !p.restored));
    if (S0.done) page = 5;
    let mode = null; // { kind: 'review'|'feedback', pos, author }
    let marks = new Set(); let rub = {}; let plus = null; let tip = null;
    let book = null;

    openPanel(it, `
      <p class="holo-kicker">POS 06 · RUANG ARSIP NUSANTARA <em>TELAAH SEJAWAT</em></p>
      <h2>Pulihkan arsip, kumpulkan Paspor Nusantara</h2>
      <p class="holo-quote">Halaman Arsip Nusantara pudar. Setiap halaman pulih ketika <b>penjelasan Paspor</b> di dalamnya ditelaah teman regu dengan rubrik <b>Klaim–Bukti–Penalaran</b>. Telaah dengan jujur dan ramah: sorot buktinya, beri satu pujian dan satu saran.</p>
      <div class="ar-hud" role="status" aria-live="polite"></div>
      <div class="ar-stage">
        <div class="ar-view">
          <canvas class="ar-canvas" aria-label="Buku Paspor Nusantara 3D. Seret untuk memiringkan."></canvas>
          <div class="ar-nav"><button type="button" class="button button-secondary" data-nav="-1" aria-label="Halaman sebelumnya">◀</button><span class="ar-pageno" aria-live="polite"></span><button type="button" class="button button-secondary" data-nav="1" aria-label="Halaman berikutnya">▶</button></div>
        </div>
        <div class="ar-side"></div>
      </div>
      <div class="holo-feedback ar-feedback" role="status" aria-live="polite"></div>
      <div class="ar-after"></div>`, (el) => {
      el.classList.add('holo-wide');
      const side = el.querySelector('.ar-side');
      const fb = el.querySelector('.ar-feedback');
      book = createBookScene(el.querySelector('.ar-canvas'), (i) => drawLeaf(i, archiveStatus(game), game), () => drawCover(game));
      if (book) book.setPage(page, true);

      // Semua halaman ikut digambar ulang: status satu halaman memengaruhi halaman 6 dan cap di sampul.
      const refreshAll = () => { for (let i = 0; i < 6; i += 1) book.refresh(i); };
      function hud() {
        const S = archiveStatus(game);
        el.querySelector('.ar-hud').innerHTML = `<span class="ar-chip">📖 Halaman pulih <b>${S.restored}/${S.total}</b></span><span class="ar-chip">🖍 Telaahanmu <b>${S.myReviews}</b></span><span class="ar-chip">💬 Masukan untukmu <b>${S.forMe}</b></span>${S.partner ? `<span class="ar-chip partner">🤝 Telaah utamamu: <b>${esc(S.partner.alias)}</b></span>` : `<span class="ar-chip partner">${S.team ? '' : '🪞 Mode solo: telaah penjelasanmu sendiri'}</span>`}
          <span class="ar-stamps" aria-label="Cap Paspor Nusantara">${[1, 2, 3, 4, 5, 6].map((n) => { const on = n < 6 ? S.pages[n - 1].restored : S.done; return `<i class="${on ? 'on' : ''}" style="--c:${POST_COLORS[n]}" title="Pos ${n}${on ? ' pulih' : ''}">${n}</i>`; }).join('')}</span>`;
        el.querySelector('.ar-pageno').textContent = page < 5 ? `Halaman ${page + 1} · Pos ${page + 1}` : 'Halaman 6 · Dapur Juara';
      }

      function statusOf(e, S) {
        const peers = e.reviews.filter((r) => r.reviewer !== e.author);
        if (peers.length) return `✓ ditelaah ${peers.map((r) => esc(r.by || 'teman')).join(', ')}`;
        if (e.ok) return '✓ ditelaah sendiri';
        return e.selfOk ? 'belum ditelaah' : 'menunggu telaah teman';
      }

      function renderSide() {
        const S = archiveStatus(game);
        hud();
        if (page === 5) {
          const p6 = game.state.posts[it.pos];
          side.innerHTML = `<h3>Halaman 6 · Dapur Juara</h3>
            <p class="ar-prompt">${S.done ? (p6.sealed ? '✦ Paspor Nusantara lengkap! Semua halaman pulih dan Dapur Juara tersegel.' : 'Arsip pulih. Bawa bukti dari Pos 1–5 ke Dapur Juara: kumpulkan bahan lokal, lalu rancang menu regu.') : `Halaman ini terbuka setelah halaman 1–5 pulih (${S.restored}/5).`}</p>
            <ul class="ar-list">${S.pages.map((p) => `<li class="ar-mini${p.restored ? ' ok' : ''}"><b>Pos ${p.pos}</b> ${esc(p.mission.title)} ${esc(p.mission.titleEm)} <span>${p.restored ? '✓ pulih' : `${p.explanations.filter((e) => e.ok).length}/${p.explanations.length} penjelasan ditelaah`}</span></li>`).join('')}</ul>`;
          return;
        }
        const pg = S.pages[page];
        if (mode && mode.kind === 'review') { renderReview(S, pg); return; }
        if (mode && mode.kind === 'feedback') { renderFeedback(S, pg); return; }
        const passport = pg.mission.passport || {};
        side.innerHTML = `<h3>Pos ${pg.pos} · ${esc(pg.mission.title)} ${esc(pg.mission.titleEm)} ${pg.restored ? '<span class="ar-ok">✓ pulih</span>' : ''}</h3>
          <p class="ar-prompt"><b>Pertanyaan Paspor:</b> ${esc(passport.prompt || '')}</p>
          <ul class="ar-list">${pg.explanations.map((e) => {
            const mineReviewed = e.reviews.some((r) => r.reviewer === S.meId);
            let action = '';
            if (!e.mine && !mineReviewed) action = `<button type="button" class="button button-primary" data-review="${esc(e.author)}">🖍 Telaah penjelasan ini</button>`;
            else if (!e.mine) action = '<span class="ar-done">✓ sudah kamu telaah</span>';
            else {
              const peers = e.reviews.filter((r) => r.reviewer !== e.author).length;
              action = `<button type="button" class="button button-secondary" data-feedback="${esc(e.author)}">💬 Masukan untukmu (${peers})</button>`;
              if (e.selfOk && !mineReviewed) action += ` <button type="button" class="button button-primary" data-review="${esc(e.author)}">🖍 Telaah sendiri</button>`;
            }
            return `<li class="ar-exp${e.ok ? ' ok' : ''}${S.partner && e.author === S.partner.id ? ' partner' : ''}"><div class="ar-who"><b>${esc(e.alias)}${e.mine ? ' (kamu)' : ''}</b><span>${statusOf(e, S)}</span></div>
              <p class="ar-text">“${esc(e.revision ? e.revision.text : e.text)}”${e.revision ? ' <small class="ar-rev">✦ sudah direvisi</small>' : ''}</p><div class="ar-actions">${action}</div></li>`;
          }).join('') || '<li class="ar-exp">Belum ada penjelasan di halaman ini.</li>'}</ul>
          ${!S.team ? '' : '<p class="holo-note">Penjelasanmu sendiri ditelaah teman. Telaah diri hanya terbuka bila tidak ada teman aktif yang sudah sampai di Pos 6.</p>'}`;
        side.querySelectorAll('[data-review]').forEach((b) => b.addEventListener('click', () => { mode = { kind: 'review', pos: pg.pos, author: b.dataset.review }; marks = new Set(); rub = {}; plus = null; tip = null; renderSide(); }));
        side.querySelectorAll('[data-feedback]').forEach((b) => b.addEventListener('click', () => { mode = { kind: 'feedback', pos: pg.pos, author: b.dataset.feedback }; renderSide(); }));
      }

      const tokens = (text) => text.split(/(\s+)/);
      function renderReview(S, pg) {
        const e = pg.explanations.find((x) => x.author === mode.author);
        if (!e) { mode = null; renderSide(); return; }
        let n = -1;
        const words = tokens(e.text).map((t) => { if (/^\s+$/.test(t)) return t; n += 1; return `<button type="button" class="ar-tok${marks.has(n) ? ' on' : ''}" data-t="${n}" aria-pressed="${marks.has(n)}">${esc(t)}</button>`; }).join('');
        side.innerHTML = `<h3>Telaah: ${esc(e.alias)}${e.mine ? ' (diri sendiri)' : ''} · Pos ${pg.pos}</h3>
          <p class="ar-prompt"><b>Pertanyaan:</b> ${esc((pg.mission.passport || {}).prompt || '')}</p>
          <p class="ar-hint">🖍 Klik kata atau angka yang menjadi <b>bukti</b> untuk menyorotnya.</p>
          <p class="ar-tokens">${words}</p>
          <div class="ar-rubric">${A.rubric.map((r) => `<fieldset class="ar-crit"><legend><b>${esc(r.label)}</b> · ${esc(r.ask)}</legend>
            <label class="ar-yn${rub[r.id] === 1 ? ' on' : ''}"><input type="radio" name="ar-${r.id}" value="1"${rub[r.id] === 1 ? ' checked' : ''} /> ✓ Ada</label>
            <label class="ar-yn no${rub[r.id] === 0 ? ' on' : ''}"><input type="radio" name="ar-${r.id}" value="0"${rub[r.id] === 0 ? ' checked' : ''} /> ✗ Belum</label></fieldset>`).join('')}</div>
          <fieldset class="ar-chips"><legend>⭐ Bagian terkuat</legend>${A.plus.map((t, i) => `<label class="ar-chipsel${plus === i ? ' on' : ''}"><input type="radio" name="ar-plus" value="${i}"${plus === i ? ' checked' : ''} /> ${esc(t)}</label>`).join('')}</fieldset>
          <fieldset class="ar-chips"><legend>🔧 Saran</legend>${A.tips.map((t, i) => `<label class="ar-chipsel${tip === i ? ' on' : ''}"><input type="radio" name="ar-tip" value="${i}"${tip === i ? ' checked' : ''} /> ${esc(t)}</label>`).join('')}</fieldset>
          <label class="ar-note">Catatan tambahan (opsional) <textarea maxlength="200" rows="2" placeholder="Contoh: Angka 22 g serat sudah tepat; coba jelaskan mengapa itu berarti…"></textarea></label>
          <div class="holo-duo"><button type="button" class="button button-primary ar-send">Kirim telaah ✓</button><button type="button" class="button button-secondary ar-cancel">Batal</button></div>`;
        side.querySelectorAll('.ar-tok').forEach((b) => b.addEventListener('click', () => { const t = Number(b.dataset.t); if (marks.has(t)) marks.delete(t); else marks.add(t); b.classList.toggle('on', marks.has(t)); b.setAttribute('aria-pressed', String(marks.has(t))); }));
        A.rubric.forEach((r) => side.querySelectorAll(`input[name="ar-${r.id}"]`).forEach((x) => x.addEventListener('change', () => { rub[r.id] = Number(x.value); side.querySelectorAll(`input[name="ar-${r.id}"]`).forEach((y) => y.closest('label').classList.toggle('on', y.checked)); })));
        side.querySelectorAll('input[name="ar-plus"]').forEach((x) => x.addEventListener('change', () => { plus = Number(x.value); side.querySelectorAll('input[name="ar-plus"]').forEach((y) => y.closest('label').classList.toggle('on', y.checked)); }));
        side.querySelectorAll('input[name="ar-tip"]').forEach((x) => x.addEventListener('change', () => { tip = Number(x.value); side.querySelectorAll('input[name="ar-tip"]').forEach((y) => y.closest('label').classList.toggle('on', y.checked)); }));
        side.querySelector('.ar-cancel').addEventListener('click', () => { mode = null; renderSide(); });
        side.querySelector('.ar-send').addEventListener('click', () => send(e, pg));
        side.querySelector('.ar-tok') && side.querySelector('.ar-tok').focus();
      }

      async function send(e, pg) {
        if (A.rubric.some((r) => rub[r.id] === undefined)) { fb.innerHTML = '<b class="warn">Nilai ketiga bagian rubrik dulu: Klaim, Bukti, dan Penalaran.</b>'; shake(side.querySelector('.ar-rubric')); return; }
        if (rub.b === 1 && !marks.size) { fb.innerHTML = '<b class="warn">Kamu menilai buktinya ada.</b> Sorot dulu kata atau angka buktinya di penjelasan.'; shake(side.querySelector('.ar-tokens')); return; }
        if (plus === null || tip === null) { fb.innerHTML = '<b class="warn">Pilih satu bagian terkuat dan satu saran.</b> Masukan yang baik memuji hal spesifik dan memberi langkah perbaikan.'; return; }
        const before = archiveStatus(game);
        const note = side.querySelector('.ar-note textarea').value.trim().slice(0, 200);
        const S = before;
        save((a) => { a.reviews[`${pg.pos}:${e.author}:${S.meId}`] = { k: rub.k, b: rub.b, p: rub.p, hl: [...marks].sort((x, y) => x - y).slice(0, 60), plus, tip, note, by: alias(), at: nowIso() }; }, `menelaah penjelasan ${e.mine ? 'sendiri' : e.alias} (Pos ${pg.pos})`);
        mode = null;
        const after = archiveStatus(game);
        const nowRestored = after.pages[page].restored && !before.pages[page].restored;
        fb.innerHTML = `<b class="ok">✓ Telaah terkirim.</b> ${nowRestored ? `Halaman Pos ${pg.pos} pulih! Cap pos menempel di Paspor Nusantara.` : 'Terima kasih: masukanmu akan dibaca penulisnya.'}`;
        if (book) { refreshAll(); if (nowRestored) await book.stamp(page); }
        if (nowRestored) nara('celebrate');
        renderSide();
        maybeFinish();
      }

      function renderFeedback(S, pg) {
        const e = pg.explanations.find((x) => x.author === mode.author);
        if (!e) { mode = null; renderSide(); return; }
        const words = (hl) => { let n = -1; return tokens(e.text).map((t) => { if (/^\s+$/.test(t)) return t; n += 1; return hl.includes(n) ? `<mark>${esc(t)}</mark>` : esc(t); }).join(''); };
        const peers = e.reviews.filter((r) => r.reviewer !== e.author || e.selfOk);
        side.innerHTML = `<h3>Masukan untuk penjelasanmu · Pos ${pg.pos}</h3>
          ${peers.length ? peers.map((r) => `<article class="ar-fb"><p class="ar-who"><b>${esc(r.by || 'Teman')}</b> <span>${A.rubric.map((c) => `<i class="${r[c.id] ? 'y' : 'n'}">${esc(c.label)} ${r[c.id] ? '✓' : '✗'}</i>`).join('')}</span></p>
            <p class="ar-text">${words(r.hl || [])}</p>
            <p>⭐ ${esc(A.plus[r.plus] || '')}</p><p>🔧 ${esc(A.tips[r.tip] || '')}</p>${r.note ? `<p class="ar-quote">“${esc(r.note)}”</p>` : ''}</article>`).join('') : '<p class="ar-prompt">Belum ada masukan. Ajak teman regumu membuka Ruang Arsip untuk menelaah penjelasanmu.</p>'}
          <label class="ar-note">✏ Revisi penjelasanmu (opsional, tercatat di Paspor) <textarea rows="4" maxlength="1200">${esc(e.revision ? e.revision.text : e.text)}</textarea></label>
          <div class="holo-duo"><button type="button" class="button button-primary ar-save-rev">Simpan revisi ✦</button><button type="button" class="button button-secondary ar-cancel">Kembali</button></div>`;
        side.querySelector('.ar-cancel').addEventListener('click', () => { mode = null; renderSide(); });
        side.querySelector('.ar-save-rev').addEventListener('click', () => {
          const text = side.querySelector('.ar-note textarea').value.trim();
          if (text.length < game.minReason) { fb.innerHTML = `<b class="warn">Revisi terlalu singkat.</b> Tulis minimal ${game.minReason} karakter.`; return; }
          if (text === e.text) { fb.innerHTML = 'Belum ada yang berubah. Coba terapkan salah satu saran temanmu.'; return; }
          save((a) => { a.revisi[`${pg.pos}:${e.author}`] = { text, at: nowIso() }; }, `merevisi penjelasan Pos ${pg.pos} setelah telaah`);
          fb.innerHTML = '<b class="ok">✦ Revisi tersimpan</b> dan tercatat di Paspor Nusantara.';
          mode = null;
          if (book) refreshAll();
          renderSide();
        });
      }

      function maybeFinish() {
        const S = archiveStatus(game);
        if (!S.done) return;
        const already = Boolean(game.activityState(it.pos).stations.arsip);
        if (!already) save((a, act) => { act.stations.arsip = true; }, 'memulihkan Ruang Arsip Nusantara');
        el.querySelector('.ar-after').innerHTML = `<div class="sg-result ar-finale"><p class="ar-seal" aria-hidden="true">✦</p><p><b>Arsip Nusantara pulih!</b> Kelima cap pos terkumpul di Paspor Nusantara. Penjelasan yang ditelaah dan direvisi adalah bukti kuat untuk menu regumu.</p>
          <div class="holo-duo"><button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ke Dapur Juara ↗</button></div></div>`;
        close(el);
        if (book) { refreshAll(); book.celebrate(); }
        if (!already) onDone(it);
      }

      el.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
        const next = Math.max(0, Math.min(5, page + Number(b.dataset.nav)));
        if (next === page) return;
        page = next; mode = null;
        if (book) book.setPage(page);
        renderSide();
      }));
      // Telaah dari anggota regu lain langsung memulihkan halaman di buku ini.
      const onTeam = () => {
        if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; }
        if (book) refreshAll();
        if (!mode) renderSide(); else hud();
        maybeFinish();
      };
      document.addEventListener('nutra:team', onTeam);
      fb.innerHTML = S0.team ? `Mulai dari penjelasan <b>${esc(S0.partner ? S0.partner.alias : 'teman')}</b>: telaah utamamu. Kamu juga boleh menelaah penjelasan anggota lain.` : 'Mode solo: telaah penjelasan Paspormu sendiri dengan rubrik, lalu revisi bila perlu.';
      renderSide();
      maybeFinish();
    });
  }

  return { open };
}

// =====================================================================
// Gambar halaman buku Paspor Nusantara
// =====================================================================
function wrap(x, text, cx, y, maxW, lineH, maxLines = 99) {
  const words = String(text).split(/\s+/);
  let line = ''; let lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (x.measureText(test).width > maxW && line) {
      lines += 1;
      if (lines >= maxLines) { x.fillText(`${line}…`, cx, y); return y + lineH; }
      x.fillText(line, cx, y); y += lineH; line = w;
    } else line = test;
  }
  if (line) { x.fillText(line, cx, y); y += lineH; }
  return y;
}
const FONT = (w, s) => `${w} ${s}px "Baloo 2", "Trebuchet MS", sans-serif`;
const BODY = (w, s, it = '') => `${it} ${w} ${s}px "DM Sans", "Segoe UI", sans-serif`;

function paper(x, W, H, restored) {
  x.fillStyle = restored ? '#fff8e6' : '#d6c9ae';
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 380; i += 1) { x.fillStyle = `rgba(120,90,40,${restored ? 0.04 : 0.08})`; x.fillRect((i * 97) % W, (i * 57) % H, 2, 2); }
}

function drawLeaf(i, S, game) {
  const c = document.createElement('canvas');
  const W = 512; const H = 672;
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const project = i === 5;
  const pg = project ? null : S.pages[i];
  const m = project ? game.missions.find((mm) => mm.type === 'project') : pg.mission;
  const restored = project ? S.done : pg.restored;
  const col = POST_COLORS[m.id];
  paper(x, W, H, restored);
  x.strokeStyle = restored ? col : '#9c8f78'; x.lineWidth = 10; x.strokeRect(20, 20, W - 40, H - 40);
  x.textAlign = 'center';
  x.fillStyle = restored ? '#7a644e' : '#8a7d66'; x.font = '700 22px "JetBrains Mono", monospace';
  x.fillText(`POS ${pad(m.id)} · ${m.location}`.slice(0, 34), W / 2, 74);
  x.fillStyle = restored ? '#2c2116' : '#6e6250'; x.font = FONT(800, 42);
  x.fillText(`${m.title} ${m.titleEm}`, W / 2, 128);
  // Cap pos
  const cx = W / 2; const cy = 290; const R = 96;
  if (restored) {
    x.save(); x.translate(cx, cy); x.rotate(-0.18);
    x.fillStyle = col; x.globalAlpha = 0.92; x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 1; x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, R - 14, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#ffffff'; x.font = '84px "Segoe UI Symbol", "Segoe UI Emoji", sans-serif'; x.textBaseline = 'middle'; x.fillText(m.icon, 0, -6);
    x.font = FONT(800, 22); x.fillText(project ? 'LENGKAP' : 'PULIH', 0, 56);
    x.restore(); x.textBaseline = 'alphabetic';
  } else {
    x.setLineDash([12, 10]); x.strokeStyle = '#9c8f78'; x.lineWidth = 5; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#9c8f78'; x.font = FONT(800, 80); x.fillText('?', cx, cy + 28);
  }
  x.fillStyle = restored ? '#2c2116' : '#6e6250';
  if (project) {
    x.font = BODY(700, 24);
    wrap(x, S.done ? (game.state.posts[m.id].sealed ? 'Paspor Nusantara lengkap! Dapur Juara tersegel.' : 'Arsip pulih. Lanjutkan ke Dapur Juara.') : `Terbuka setelah halaman 1–5 pulih (${S.restored}/5).`, W / 2, 440, W - 90, 32);
  } else {
    const ok = pg.explanations.filter((e) => e.ok).length;
    x.font = BODY(700, 24);
    x.fillText(`Penjelasan regu: ${pg.explanations.length} · ditelaah ${ok}/${pg.explanations.length}`, W / 2, 430);
    const mine = pg.explanations.find((e) => e.mine);
    if (mine) { x.font = BODY(500, 21, 'italic'); wrap(x, `“${mine.revision ? mine.revision.text : mine.text}”`, W / 2, 480, W - 100, 28, 5); }
  }
  if (!restored) {
    // Retakan dan sudut sobek: arsip yang belum pulih.
    x.strokeStyle = 'rgba(70,50,30,.55)'; x.lineWidth = 3;
    [[60, 160, 7], [380, 560, 6], [300, 40, 5]].forEach(([sx, sy, n]) => { x.beginPath(); x.moveTo(sx, sy); let px = sx; let py = sy; for (let k = 0; k < n; k += 1) { px += 18 + ((k * 37) % 23); py += ((k % 2) ? -1 : 1) * (10 + ((k * 13) % 17)); x.lineTo(px, py); } x.stroke(); });
    x.fillStyle = '#b5a68a'; x.beginPath(); x.moveTo(W, H - 120); x.lineTo(W, H); x.lineTo(W - 140, H); x.closePath(); x.fill();
  }
  return c;
}

function drawCover(game) {
  const c = document.createElement('canvas');
  const W = 512; const H = 672;
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1b6f73'); gr.addColorStop(1, '#0f4b4f');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(245,183,43,.35)'; x.lineWidth = 2;
  for (let yy = 40; yy < H; yy += 56) for (let xx = 40; xx < W; xx += 56) { x.beginPath(); x.ellipse(xx, yy, 14, 22, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.ellipse(xx, yy, 22, 14, 0, 0, Math.PI * 2); x.stroke(); }
  x.strokeStyle = '#f5b72b'; x.lineWidth = 8; x.strokeRect(26, 26, W - 52, H - 52);
  x.fillStyle = '#f5b72b'; x.textAlign = 'center'; x.font = FONT(800, 50);
  x.fillText('PASPOR', W / 2, 190); x.fillText('NUSANTARA', W / 2, 246);
  x.beginPath(); x.arc(W / 2, 380, 70, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#0f4b4f'; x.font = FONT(800, 80); x.fillText('N', W / 2, 408);
  x.fillStyle = '#fff4dc'; x.font = BODY(600, 24);
  wrap(x, `Milik penjelajah ${game.state.alias || ''}`, W / 2, 520, W - 100, 30);
  return c;
}

function drawBack() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 336;
  const x = c.getContext('2d');
  paper(x, 256, 336, true);
  x.strokeStyle = 'rgba(31,163,163,.25)'; x.lineWidth = 2;
  for (let yy = 30; yy < 336; yy += 44) for (let xx = 30; xx < 256; xx += 44) { x.beginPath(); x.ellipse(xx, yy, 9, 15, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.ellipse(xx, yy, 15, 9, 0, 0, Math.PI * 2); x.stroke(); }
  x.fillStyle = 'rgba(122,100,78,.6)'; x.textAlign = 'center'; x.font = FONT(800, 22); x.fillText('ARSIP NUSANTARA', 128, 176);
  return c;
}

// =====================================================================
// Buku Paspor Nusantara 3D: halaman dibalik, cap pos, sampul emas
// =====================================================================
function createBookScene(canvas, leafCanvas, coverCanvas) {
  const S = miniScene(canvas, { cam: [0, 0.2, 5], look: [0, 0, 0], yawLimit: 0.5, fit: (cam, aspect) => { cam.position.z = Math.max(4.6, 2.3 / Math.max(0.35, aspect * 0.38)); } });
  if (!S) return null;
  const { scene, world } = S;
  S.pitch = -0.18;
  scene.add(new THREE.HemisphereLight('#fff7ea', '#6b5a3a', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 1.4);
  sun.position.set(2, 3, 5);
  scene.add(sun);
  const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const W = 1.6; const H = 2.1; const N = 6;
  const coverMat = new THREE.MeshStandardMaterial({ color: '#145c60', roughness: 0.6 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, H + 0.1, 0.06), [coverMat, coverMat, coverMat, coverMat, new THREE.MeshStandardMaterial({ map: tex(coverCanvas()), roughness: 0.6 }), coverMat]);
  left.position.set(-(W + 0.08) / 2, 0, -0.05);
  const right = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, H + 0.1, 0.06), coverMat);
  right.position.set((W + 0.08) / 2, 0, -0.05);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H + 0.1, 12), new THREE.MeshStandardMaterial({ color: '#f5b72b', roughness: 0.4, metalness: 0.3 }));
  spine.position.z = -0.04;
  world.add(left, right, spine);
  const backTex = tex(drawBack());
  const leaves = Array.from({ length: N }, (_, i) => {
    const pivot = new THREE.Group();
    const fg = new THREE.PlaneGeometry(W, H); fg.translate(W / 2, 0, 0);
    const front = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: tex(leafCanvas(i)), roughness: 0.85 }));
    const bg = new THREE.PlaneGeometry(W, H); bg.translate(-W / 2, 0, 0);
    const back = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.85 }));
    back.rotation.y = Math.PI;
    pivot.add(front, back);
    world.add(pivot);
    return { pivot, front };
  });
  // Stempel pos yang menghantam halaman yang pulih.
  const stamp = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 14), new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.7 }));
  handle.rotation.x = Math.PI / 2; handle.position.z = 0.35;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: '#8a5a2b' }));
  knob.position.z = 0.65;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 24), new THREE.MeshStandardMaterial({ color: '#e2553f', roughness: 0.5 }));
  base.rotation.x = Math.PI / 2; base.position.z = 0.06;
  stamp.add(handle, knob, base);
  stamp.visible = false;
  world.add(stamp);
  const flash = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), new THREE.MeshBasicMaterial({ color: '#f5b72b', transparent: true, opacity: 0, side: THREE.DoubleSide }));
  world.add(flash);
  let current = 0; let glow = 0;
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  function layer() {
    leaves.forEach((l, i) => { l.pivot.position.z = i < current ? 0.004 * (i + 1) : 0.004 * (N - i); });
  }
  async function setPage(p, instant) {
    const from = current;
    current = p;
    if (instant) { leaves.forEach((l, i) => { l.pivot.rotation.y = i < p ? -Math.PI : 0; }); layer(); return; }
    const moving = p > from ? leaves.slice(from, p) : leaves.slice(p, from).reverse();
    for (const l of moving) {
      const start = l.pivot.rotation.y; const end = p > from ? -Math.PI : 0;
      await S.tween(0.55, (k) => { const e = ease(k); l.pivot.rotation.y = start + (end - start) * e; l.pivot.position.z = 0.03 + Math.sin(k * Math.PI) * 0.35; });
    }
    layer();
  }
  S.onFrame((t, dt) => {
    if (glow > 0) { glow = Math.max(0, glow - dt * 0.5); spine.material.emissive = spine.material.emissive || new THREE.Color(); spine.material.emissive.setRGB(glow, glow * 0.7, 0); }
    if (flash.material.opacity > 0) { flash.material.opacity = Math.max(0, flash.material.opacity - dt * 1.2); flash.scale.multiplyScalar(1 + dt * 1.5); }
  });
  return {
    setPage,
    refresh(i) { const l = leaves[i]; if (!l) return; const old = l.front.material.map; l.front.material.map = tex(leafCanvas(i)); l.front.material.needsUpdate = true; if (old) old.dispose(); },
    async stamp(i) {
      if (current !== i) await setPage(i);
      stamp.visible = true;
      const cx = W / 2; const cy = 0.4;
      stamp.position.set(cx, cy, 1.4);
      await S.tween(0.35, (k) => { stamp.position.z = 1.4 - ease(k) * 1.38; });
      flash.position.set(cx, cy, 0.05); flash.scale.setScalar(1); flash.material.opacity = 1;
      await S.tween(0.4, (k) => { stamp.position.z = 0.02 + ease(k) * 1.5; stamp.rotation.z = k * 0.4; });
      stamp.visible = false;
    },
    celebrate() { glow = 1.2; }
  };
}
