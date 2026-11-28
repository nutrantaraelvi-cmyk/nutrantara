/*
 * NUTRANTARA — Kampung di klien (sejak 1.6): dialog warga & quest sampingan, Dapur Lapangan, dan tas penjelajah.
 * Skrip biasa (defer) setelah game.js → window.NutraKampung. Model 3D & jangkauan ada di kampung3d.js.
 * Daring: server otoritatif (pesan 'kampung'); luring/tamu: aturan yang sama dari kampung-core.js, disimpan di
 * localStorage nutrantara-kampung-v1:<alias>.
 */
(() => {
  const D = window.NUTRANTARA_KAMPUNG;
  const C = window.NUTRANTARA_KAMPUNG_CORE;
  const W = window.NUTRANTARA_WORLD;
  const net = window.NutraNet;
  const game = window.NutraGame;
  if (!D || !C || !game) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const online = () => Boolean(net && net.online);

  // ---------- Status (server atau lokal) ----------
  const aliasKey = () => (game.state.alias || '').toLocaleLowerCase('id');
  let local = null; let localAlias = null;
  function localState() {
    if (localAlias !== game.state.alias) {
      localAlias = game.state.alias;
      try { local = C.norm(JSON.parse(localStorage.getItem(`nutrantara-kampung-v1:${aliasKey()}`))); } catch { local = C.fresh(); }
    }
    return local;
  }
  function saveLocal() { try { localStorage.setItem(`nutrantara-kampung-v1:${aliasKey()}`, JSON.stringify(local)); } catch { /* abaikan */ } }
  const state = () => (online() ? (net.kampung ? net.kampung.state : C.fresh()) : localState());
  const skew = () => (online() && net.kampung ? net.kampung.skew : 0);
  const islandsFound = () => { try { const v = JSON.parse(localStorage.getItem(`nutrantara-pulau-v1:${aliasKey()}`)); return Array.isArray(v) ? v : []; } catch { return []; } };
  const ctxLocal = () => { const w3 = window.NutraWorld3D; const isl = w3 ? w3.island : null; return { now: Date.now(), island: Number.isInteger(isl) ? isl : null, explored: islandsFound() }; };
  const islandName = (id) => { const i = W && W.islands.find((x) => x.id === id); return i ? i.name : `Pulau ${id}`; };
  const npcPlace = (n) => (n.post ? `Pos ${n.island} · desa pusat` : islandName(n.island));

  let buffUntil = 0;
  let view = null; // { mode: 'npc'|'kitchen'|'bag', npc, tab }
  let note = null; // umpan balik terakhir di panel: { kind: 'ok'|'warn', html }

  function changed() {
    document.dispatchEvent(new CustomEvent('nutra:kampung'));
    if (!panel.hidden) render();
    renderChip();
    if (!online() && window.NutraRPG) window.NutraRPG.refresh();
  }

  function act(msg) {
    if (online()) { net.kampungAct(msg); return; }
    const res = C.apply(localState(), msg, ctxLocal());
    if (!res.ok) { onError(res.message); return; }
    saveLocal();
    onResult(msg.action, res.result);
    changed();
  }

  function rewardText(r) {
    const parts = [];
    if (r.xp) parts.push(`+${r.xp} XP`);
    (r.recipes || []).forEach((id) => parts.push(`resep baru: ${D.RECIPES[id].name}`));
    Object.entries(r.items || {}).forEach(([id, n]) => parts.push(`${n} ${D.ITEMS[id].name}`));
    return parts.join(' · ');
  }
  function onResult(action, r) {
    if (!r) return;
    if (action === 'gather') { game.showToast(`${D.ITEMS[r.item].icon} +1 ${D.ITEMS[r.item].name} (punya ${r.count})`); return; }
    if (action === 'cook') {
      const rc = D.RECIPES[r.recipe];
      note = { kind: 'ok', html: `<b>✓ ${esc(rc.name)} matang!</b> ${r.first ? `<em>Resep baru dikuasai (+${window.NUTRANTARA_RPG ? window.NUTRANTARA_RPG.XP.cooked : 15} XP).</em> ` : ''}<span>${esc(rc.info)}</span>` };
      return;
    }
    if (action === 'eat') {
      buffUntil = Date.now() + (r.buffMs || D.BUFF_MS);
      note = { kind: 'ok', html: `<b>Nyam! ${esc(D.RECIPES[r.recipe].name)} habis dicicipi.</b> <span>Semangat: larimu sedikit lebih cepat selama 1 menit.</span>` };
      game.showToast('Semangat! Larimu sedikit lebih cepat selama 1 menit.');
      return;
    }
    const q = C.QUEST[r.quest];
    if (action === 'accept') { note = { kind: 'ok', html: `<b>Quest diterima: ${esc(q.title)}</b>` }; return; }
    if (action === 'answer' && r.correct === false) { note = { kind: 'warn', html: '<b>Belum tepat.</b> <span>Baca lagi pertanyaannya, lalu coba pilihan lain.</span>' }; return; }
    if (r.state === 'done') {
      note = { kind: 'ok', html: `<b>✦ Quest tuntas: ${esc(q.title)}</b> <span>${q.kind === 'quiz' ? `${esc(q.explain)} ` : ''}${esc(rewardText(r))}</span>` };
      game.showToast(`✦ Quest tuntas: ${q.title}`);
    }
  }
  function onError(message) {
    if (!panel.hidden) { note = { kind: 'warn', html: `<b>${esc(message)}</b>` }; render(); } else game.showToast(message);
  }
  if (net) {
    net.on('kampung', (m) => { if (m.action) onResult(m.action, m.result); changed(); });
    net.on('kampung-error', (m) => onError(m.message));
    net.on('welcome', () => setTimeout(changed, 50));
  }

  // ---------- Panel ----------
  const layer = document.createElement('div');
  layer.id = 'kp-layer';
  layer.innerHTML = `<div class="kp-panel" id="kp-panel" role="dialog" aria-modal="false" aria-labelledby="kp-title" hidden>
    <button type="button" class="holo-close" id="kp-close" aria-label="Tutup panel (Esc)">×</button><div id="kp-body"></div></div>`;
  document.body.append(layer);
  const panel = $('#kp-panel');
  // Tombol di panel tidak boleh menggerakkan penjelajah; Esc menutup.
  panel.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  $('#kp-close').addEventListener('click', () => close());
  function open(v) {
    view = v; note = null;
    panel.hidden = false;
    render();
    setTimeout(() => { const f = panel.querySelector('[data-autofocus]') || panel.querySelector('button:not(.holo-close):not([disabled])'); if (f) f.focus(); }, 40);
  }
  function close() { panel.hidden = true; view = null; note = null; }

  const needChips = (needs, st) => Object.entries(needs).map(([id, n]) => {
    const h = C.have(st, id);
    const def = D.ITEMS[id] || D.RECIPES[id];
    return `<li class="${h >= n ? 'ok' : 'no'}"><span aria-hidden="true">${def.icon}</span> ${esc(def.name)} <b>${Math.min(h, n)}/${n}</b> <em>${h >= n ? '✓' : '✗ kurang'}</em></li>`;
  }).join('');
  const noteHtml = () => (note ? `<div class="kp-note ${note.kind}" role="status">${note.html}</div>` : '');

  function renderNpc(id) {
    const n = D.NPCS[id];
    const st = state();
    const q = C.npcQuest(st, id);
    const done = D.QUESTS.filter((x) => x.npc === id && C.status(st, x) === 'done').length;
    const total = D.QUESTS.filter((x) => x.npc === id).length;
    let card = '';
    if (q) {
      const s = C.status(st, q);
      const reward = rewardText({ xp: q.xp, recipes: q.recipes, items: q.items });
      let actions = '';
      if (s === 'open') actions = '<button type="button" class="button button-primary" data-kp="accept" data-autofocus>Terima quest ✓</button>';
      else if (q.kind === 'quiz') actions = `<div class="kp-options">${q.options.map((o, i) => `<button type="button" class="kp-option" data-kp="answer" data-choice="${esc(o.id)}"><span class="mark">${String.fromCharCode(65 + i)}</span> ${esc(o.text)}</button>`).join('')}</div>`;
      else if (q.kind === 'bring') {
        const lack = C.missing(st, q);
        actions = `<ul class="kp-needs">${needChips(q.needs, st)}</ul><p class="kp-tip">${Object.keys(q.needs).some((k) => D.RECIPES[k]) ? 'Masak hidangannya di Dapur Lapangan, lalu kembali ke sini.' : 'Petik bahan di titik bercahaya hijau di pulau-pulau.'}</p><button type="button" class="button button-primary" data-kp="turnin"${lack.length ? ' disabled' : ' data-autofocus'}>Serahkan ✓</button>`;
      } else {
        const found = online() ? true : islandsFound().includes(q.island);
        actions = `<p class="kp-tip">Tujuan: temukan <b>${esc(islandName(q.island))}</b> lewat jembatan cahaya atau peta.${online() ? '' : found ? ' ✓ Sudah ditemukan.' : ' Belum ditemukan.'}</p><button type="button" class="button button-primary" data-kp="turnin" data-autofocus>Laporkan ✓</button>`;
      }
      card = `<div class="kp-quest"><p class="holo-kicker">QUEST ${s === 'open' ? 'BARU' : 'BERJALAN'} · ${done}/${total} DARI ${esc(n.name.toUpperCase())}</p><h3>${esc(q.title)}</h3><p>${esc(q.text)}</p>${actions}<p class="kp-reward">Hadiah: ${esc(reward)}</p></div>`;
    } else card = `<div class="kp-quest done"><p><b>✓ Semua permintaan ${esc(n.name)} sudah tuntas.</b></p></div>`;
    return `<div class="kp-npc-head"><span class="kp-face" style="--c:${esc(n.color)}" aria-hidden="true">${esc(n.name.split(' ').pop()[0])}</span><div><h2 id="kp-title">${esc(n.name)}</h2><small>${esc(n.role)} · ${esc(npcPlace(n))}</small></div></div>
      <p class="kp-say">“${esc(q ? n.hello : n.bye)}”</p>${noteHtml()}${card}
      <div class="kp-foot"><button type="button" class="button button-secondary" data-kp-open="bag" data-tab="quests">📜 Jurnal quest</button><button type="button" class="button button-secondary" data-kp-open="bag" data-tab="items">🎒 Tas</button></div>`;
  }

  function renderKitchen() {
    const st = state();
    const ids = Object.keys(D.RECIPES);
    const known = ids.filter((id) => st.recipes.includes(id));
    const locked = ids.filter((id) => !st.recipes.includes(id));
    return `<p class="holo-kicker">DAPUR LAPANGAN · RESEP DAERAH NUSANTARA</p><h2 id="kp-title">Masak hidangan lokal</h2>
      <p class="kp-tip">Bahan dipetik di titik bercahaya hijau. Hidangan masuk rantang: antar ke warga untuk quest, atau cicipi untuk semangat lari.</p>${noteHtml()}
      <div class="kp-recipes">${known.map((id) => {
        const r = D.RECIPES[id];
        const ok = Object.entries(r.needs).every(([k, n]) => (st.items[k] || 0) >= n);
        return `<article class="kp-recipe"><header><span class="kp-dish" aria-hidden="true">${r.icon}</span><div><b>${esc(r.name)}</b><small>${esc(r.region)}${st.cooked.includes(id) ? ' · ✓ dikuasai' : ''} · di rantang: ${st.dishes[id] || 0}</small></div></header>
          <ul class="kp-needs">${needChips(r.needs, st)}</ul>
          <button type="button" class="button ${ok ? 'button-primary' : 'button-secondary'}" data-kp="cook" data-recipe="${esc(id)}"${ok ? '' : ' disabled'}>🍳 Masak</button></article>`;
      }).join('')}</div>
      ${locked.length ? `<p class="lobby-kicker">RESEP TERKUNCI · DIDAPAT DARI QUEST WARGA</p><ul class="kp-locked">${locked.map((id) => `<li>🔒 ${esc(D.RECIPES[id].name)} <small>${esc(D.RECIPES[id].region)}</small></li>`).join('')}</ul>` : ''}`;
  }

  function renderBag(tab) {
    const st = state();
    const tabs = [['items', '🎒 Bahan'], ['dishes', '🍱 Rantang'], ['recipes', '📖 Resep'], ['quests', '📜 Quest']];
    let body = '';
    if (tab === 'items') {
      const list = Object.keys(D.ITEMS).filter((id) => st.items[id]);
      body = list.length ? `<div class="kp-grid">${list.map((id) => `<div class="kp-cell"><span aria-hidden="true">${D.ITEMS[id].icon}</span><b>${esc(D.ITEMS[id].name)}</b><small>${esc(D.ITEMS[id].group)}</small><em>×${st.items[id]}</em></div>`).join('')}</div>` : '<p class="kp-tip">Tas masih kosong. Petik bahan pangan lokal di titik bercahaya hijau: di Alun-alun, desa tiap pos, kampung budaya, dan pulau jelajah.</p>';
      body += `<p class="kp-tip">Total dipetik: ${st.gathered}. Titik bahan tumbuh lagi ±3 menit setelah dipetik.</p>`;
    } else if (tab === 'dishes') {
      const list = Object.keys(D.RECIPES).filter((id) => st.dishes[id]);
      body = list.length ? `<div class="kp-list">${list.map((id) => `<div class="kp-row"><span aria-hidden="true">${D.RECIPES[id].icon}</span><div><b>${esc(D.RECIPES[id].name)} ×${st.dishes[id]}</b><small>${esc(D.RECIPES[id].info)}</small></div><button type="button" class="button button-secondary" data-kp="eat" data-recipe="${esc(id)}">Cicipi</button></div>`).join('')}</div>` : '<p class="kp-tip">Rantang kosong. Masak di Dapur Lapangan (Alun-alun atau desa pusat tiap pos).</p>';
      if (Date.now() < buffUntil) body += `<p class="kp-note ok">⚡ Semangat aktif: ${Math.ceil((buffUntil - Date.now()) / 1000)} detik lagi.</p>`;
    } else if (tab === 'recipes') {
      body = `<div class="kp-list">${Object.entries(D.RECIPES).map(([id, r]) => { const k = st.recipes.includes(id); return `<div class="kp-row ${k ? '' : 'off'}"><span aria-hidden="true">${k ? r.icon : '🔒'}</span><div><b>${esc(r.name)}</b> <small>${esc(r.region)}${k ? ` · bahan: ${Object.entries(r.needs).map(([i, n]) => `${D.ITEMS[i].name} ${n}`).join(', ')}` : ' · didapat dari quest warga'}</small>${k ? `<small>${esc(r.info)}</small>` : ''}</div></div>`; }).join('')}</div>`;
    } else {
      const rows = D.QUESTS.map((q) => ({ q, s: C.status(st, q) }));
      const active = rows.filter((x) => x.s === 'active');
      const open = rows.filter((x) => x.s === 'open');
      const done = rows.filter((x) => x.s === 'done');
      const row = ({ q, s }) => { const n = D.NPCS[q.npc]; const lack = s === 'active' && q.kind === 'bring' ? C.missing(st, q) : []; return `<div class="kp-row"><span aria-hidden="true">${s === 'done' ? '✓' : s === 'active' ? '▶' : '!'}</span><div><b>${esc(q.title)}</b><small>${esc(n.name)} · ${esc(npcPlace(n))}${s === 'active' ? (q.kind === 'bring' ? (lack.length ? ` · kurang: ${esc(lack.join(', '))}` : ' · siap diserahkan') : q.kind === 'quiz' ? ' · jawab kuisnya' : ' · temukan pulaunya') : ''}</small></div><em>+${q.xp} XP</em></div>`; };
      body = `<p class="kp-tip">${done.length}/${D.QUESTS.length} quest tuntas. Warga bertanda <b>!</b> punya quest baru; <b>?</b> berarti quest siap diselesaikan.</p>
        ${active.length ? `<p class="lobby-kicker">SEDANG BERJALAN</p><div class="kp-list">${active.map(row).join('')}</div>` : ''}
        ${open.length ? `<p class="lobby-kicker">TERSEDIA</p><div class="kp-list">${open.map(row).join('')}</div>` : ''}
        ${done.length ? `<p class="lobby-kicker">TUNTAS</p><div class="kp-list">${done.map(row).join('')}</div>` : ''}`;
    }
    return `<p class="holo-kicker">TAS PENJELAJAH</p><h2 id="kp-title">Bahan, rantang, resep & quest</h2>
      <div class="kp-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" class="kp-tab${tab === id ? ' on' : ''}" aria-selected="${tab === id}" data-kp-tab="${id}">${label}</button>`).join('')}</div>${noteHtml()}${body}`;
  }

  function render() {
    if (!view) return;
    const body = $('#kp-body');
    body.innerHTML = view.mode === 'npc' ? renderNpc(view.npc) : view.mode === 'kitchen' ? renderKitchen() : renderBag(view.tab || 'items');
    panel.classList.toggle('wide', view.mode !== 'npc');
  }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled || !view) return;
    if (b.dataset.kpTab) { view.tab = b.dataset.kpTab; note = null; render(); return; }
    if (b.dataset.kpOpen) { open({ mode: b.dataset.kpOpen, tab: b.dataset.tab }); return; }
    const a = b.dataset.kp;
    if (!a) return;
    const st = state();
    if (a === 'cook' || a === 'eat') { act({ action: a, recipe: b.dataset.recipe }); return; }
    const q = view.mode === 'npc' ? C.npcQuest(st, view.npc) : null;
    if (!q) return;
    if (a === 'answer') act({ action: 'answer', quest: q.id, choice: b.dataset.choice });
    else act({ action: a, quest: q.id });
  });

  // ---------- HUD: tombol tas & tombol I ----------
  function renderChip() {
    const host = $('.w3-hud-left');
    if (!host) return;
    let chip = $('#kp-chip');
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.id = 'kp-chip';
      chip.className = 'w3-chip kp-chip';
      chip.title = 'Tas penjelajah: bahan, rantang, resep, dan quest (tombol I)';
      chip.addEventListener('click', () => (panel.hidden ? open({ mode: 'bag', tab: 'items' }) : close()));
      host.append(chip);
    }
    const st = state();
    const items = Object.values(st.items).reduce((n, v) => n + v, 0);
    const active = D.QUESTS.filter((q) => C.status(st, q) === 'active').length;
    chip.innerHTML = `🎒 <b>${items}</b> <small>bahan${active ? ` · ${active} quest` : ''}</small>`;
  }
  setInterval(renderChip, 2000);
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyI' || e.repeat) return;
    const t = document.activeElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (document.body.dataset.phase !== 'game' || game.visibleScreen !== 'world') return;
    if (panel.hidden) open({ mode: 'bag', tab: 'items' }); else close();
  });
  document.addEventListener('nutra:screen', (e) => { if (e.detail !== 'world' && !panel.hidden) close(); });

  // ---------- API untuk dunia 3D & RPG ----------
  window.NutraKampung = {
    get state() { return state(); },
    facts: () => C.facts(state()),
    nodeReady(id) { const t = state().cool[id]; return !t || Date.now() - skew() - t >= D.COOLDOWN_MS; },
    speedBuff: () => (Date.now() < buffUntil ? D.BUFF_SPEED : 1),
    /** Penanda di atas kepala warga: ! quest baru, ? siap diselesaikan, … sedang berjalan. */
    marker(npcId) {
      const st = state();
      const q = C.npcQuest(st, npcId);
      if (!q) return '';
      const s = C.status(st, q);
      if (s === 'open') return '!';
      if (q.kind === 'quiz') return '?';
      if (q.kind === 'visit') return online() || islandsFound().includes(q.island) ? '?' : '…';
      return C.missing(st, q).length ? '…' : '?';
    },
    hint(t) {
      if (t.kind === 'npc') { const n = D.NPCS[t.id]; const m = this.marker(t.id); return { text: `${n.name} (${n.role})${m === '!' ? ' punya quest baru' : m === '?' ? ': quest siap diselesaikan' : m ? ': quest sedang berjalan' : ''}. Tekan E untuk bicara.`, button: 'Bicara' }; }
      if (t.kind === 'kitchen') return { text: 'Dapur Lapangan: masak resep daerah dari bahan lokal di tasmu. Tekan E.', button: 'Masak' };
      const it = D.ITEMS[t.item];
      return { text: `${it.name} (${it.group}). Tekan E untuk memetik ke tas.`, button: 'Petik' };
    },
    activate(t) {
      if (t.kind === 'npc') open({ mode: 'npc', npc: t.id });
      else if (t.kind === 'kitchen') open({ mode: 'kitchen' });
      else act({ action: 'gather', node: t.id });
    },
    openBag: (tab = 'items') => open({ mode: 'bag', tab })
  };
})();
