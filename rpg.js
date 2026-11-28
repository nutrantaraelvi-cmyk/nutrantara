/*
 * NUTRANTARA — RPG di klien (sejak 1.5): level & XP, lencana prestasi, layar Prestasi, dan event kelas Bos Mitos Gizi.
 * Skrip biasa (defer) setelah game.js dan pjbl.js → window.NutraRPG.
 * Daring: ringkasan dihitung server (pesan 'rpg'). Luring/tamu: dihitung di sini dengan aturan yang sama (rpg-data.js).
 * Bos Mitos Gizi hanya ada di server kelas; kunci jawabannya tidak pernah dikirim sebelum siswa menjawab.
 */
(() => {
  const R = window.NUTRANTARA_RPG;
  const net = window.NutraNet;
  const game = window.NutraGame;
  if (!R || !game) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const online = () => Boolean(net && net.online);
  const visible = () => !online() || !net.settings || net.settings.rpgVisible !== false;

  // ---------- Ringkasan RPG ----------
  const aliasKey = () => (game.state.alias || '').toLocaleLowerCase('id');
  const readList = (key) => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v.filter(Number.isInteger) : []; } catch { return []; } };
  const shardsLocal = () => readList(`nutrantara-shards-v1:${aliasKey()}`);
  const islandsLocal = () => readList(`nutrantara-pulau-v1:${aliasKey()}`);

  function localView() {
    if (!game.state.alias) return null;
    let pjbl = 0;
    try { pjbl = window.NutraPjbl ? window.NutraPjbl.summary().total : 0; } catch { pjbl = 0; }
    const owned = window.NutraShop && Number.isFinite(window.NutraShop.owned) ? window.NutraShop.owned : 0;
    const kampung = window.NutraKampung ? window.NutraKampung.facts() : {};
    return R.compute(R.factsFrom(game.state, { shards: shardsLocal().length, islands: islandsLocal().length, owned, pjbl, ...kampung }));
  }
  const current = () => (online() ? net.rpg : localView());

  let view = null; // ringkasan terakhir yang sudah diumumkan
  let viewAlias = '';

  function refresh() {
    const v = current();
    if (!v) return;
    if (viewAlias !== game.state.alias) { view = null; viewAlias = game.state.alias; }
    if (view && visible()) announce(view, v);
    view = v;
    render();
  }

  // ---------- Notifikasi: +XP, naik level, lencana baru ----------
  const layer = document.createElement('div');
  layer.id = 'rpg-layer';
  layer.innerHTML = '<div class="rpg-xp-pop" id="rpg-xp-pop" aria-hidden="true"></div><div class="rpg-toasts" id="rpg-toasts" role="status" aria-live="polite"></div><div class="rpg-levelup" id="rpg-levelup" role="status" aria-live="assertive" hidden></div>';
  document.body.append(layer);

  let xpTimer = null; let xpSum = 0;
  function popXp(n) {
    const el = $('#rpg-xp-pop');
    xpSum += n;
    el.textContent = `+${xpSum} XP`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(xpTimer);
    xpTimer = setTimeout(() => { xpSum = 0; el.classList.remove('on'); }, 2200);
  }
  function toast(icon, title, text) {
    const box = $('#rpg-toasts');
    const t = document.createElement('div');
    t.className = 'rpg-toast';
    t.innerHTML = `<span class="ico" aria-hidden="true">${esc(icon)}</span><div><b>${esc(title)}</b><small>${esc(text)}</small></div>`;
    box.append(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 5200);
  }
  function levelUp(v) {
    const el = $('#rpg-levelup');
    el.innerHTML = `<div class="rpg-levelup-card"><span class="kicker">NAIK LEVEL!</span><b>Lv ${v.level}</b><span class="title">${esc(v.title)}</span></div>`;
    el.hidden = false;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    if (!reduced()) burst(el);
    setTimeout(() => { el.hidden = true; }, 3600);
  }
  function burst(host) {
    for (let i = 0; i < 18; i += 1) {
      const s = document.createElement('i');
      s.className = 'rpg-spark';
      s.style.setProperty('--a', `${(i / 18) * 360}deg`);
      s.style.setProperty('--d', `${80 + (i % 4) * 30}px`);
      host.append(s);
      setTimeout(() => s.remove(), 1100);
    }
  }
  function announce(before, after) {
    if (after.xp > before.xp) popXp(after.xp - before.xp);
    const music = window.NutraMusic;
    if (after.level > before.level) { levelUp(after); if (music) music.sting('naik'); }
    const had = new Set(before.badges);
    if (music && after.level <= before.level && after.badges.some((id) => !had.has(id))) setTimeout(() => music.sting('lencana'), 400);
    after.badges.filter((id) => !had.has(id)).forEach((id, i) => {
      const b = R.badge(id);
      if (b) setTimeout(() => toast(b.icon, `Lencana baru: ${b.name}`, b.desc), 400 + i * 700);
    });
  }

  // ---------- HUD dunia, lobi, dan layar Prestasi ----------
  function render() {
    renderChip();
    renderLobby();
    if (game.visibleScreen === 'prestasi') renderScreen();
  }
  function renderChip() {
    const host = $('.w3-hud-left');
    let chip = $('#rpg-chip');
    if (!host) return;
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.id = 'rpg-chip';
      chip.className = 'w3-chip rpg-chip';
      chip.dataset.screen = 'prestasi';
      host.prepend(chip);
    }
    const v = view;
    chip.hidden = !v || !visible();
    if (!v) return;
    chip.title = `Level ${v.level} · ${v.title} · ${v.xp} XP. Tekan untuk membuka Prestasi.`;
    chip.innerHTML = `<b>Lv ${v.level}</b><span class="rpg-mini" aria-hidden="true"><i style="width:${v.pct}%"></i></span><small>${esc(v.title)}</small>`;
  }
  function renderLobby() {
    const stats = $('#phase-lobby .lobby-stats');
    if (!stats) return;
    let box = $('#rpg-lobby');
    if (!box) {
      box = document.createElement('div');
      box.id = 'rpg-lobby';
      box.className = 'rpg-lobby';
      stats.after(box);
    }
    const v = view;
    box.hidden = !v || !visible();
    if (!v) return;
    box.innerHTML = `<div class="rpg-lobby-head"><b>Lv ${v.level}</b><span>${esc(v.title)}</span><em>${v.badges.length}/${R.BADGES.length} lencana</em></div>
      <div class="rpg-bar" role="progressbar" aria-label="XP menuju level berikutnya" aria-valuemin="0" aria-valuemax="${v.need}" aria-valuenow="${v.into}"><i style="width:${v.pct}%"></i></div>
      <small>${v.level >= R.MAX_LEVEL ? `${v.xp} XP · level tertinggi` : `${v.into}/${v.need} XP menuju Lv ${v.level + 1}`}</small>`;
  }
  function renderScreen() {
    const body = $('#prestasi-body');
    if (!body) return;
    const v = view || current();
    if (!v) { body.innerHTML = '<p class="panel-subtitle">Memuat prestasi…</p>'; return; }
    if (!visible()) { body.innerHTML = '<p class="panel-subtitle">Guru sedang menyembunyikan level dan lencana. Skor dan progresmu tetap aman.</p>'; return; }
    const earned = new Set(v.badges);
    const nextTitle = R.TITLES.find(([lv]) => lv > v.level);
    const groups = [...new Set(R.BADGES.map((b) => b.group))];
    const stat = (n, label) => `<div><b>${n}</b><span>${label}</span></div>`;
    body.innerHTML = `
      <div class="rpg-hero">
        <div class="rpg-ring" style="--p:${v.pct}" aria-hidden="true"><b>${v.level}</b><span>LEVEL</span></div>
        <div class="rpg-hero-text">
          <p class="lobby-kicker">GELAR PENJELAJAH</p>
          <h2>${esc(v.title)}</h2>
          <div class="rpg-bar big" role="progressbar" aria-label="XP menuju level berikutnya" aria-valuemin="0" aria-valuemax="${v.need}" aria-valuenow="${v.into}"><i style="width:${v.pct}%"></i></div>
          <p>${v.level >= R.MAX_LEVEL ? 'Level tertinggi tercapai!' : `<b>${v.into}/${v.need} XP</b> menuju Lv ${v.level + 1}`} · total ${v.xp} XP${nextTitle ? ` · gelar berikutnya “${esc(nextTitle[1])}” di Lv ${nextTitle[0]}` : ''}</p>
        </div>
        <div class="rpg-hero-stats">${stat(`${v.badges.length}/${R.BADGES.length}`, 'lencana')}${stat(`${v.facts.sealed}/6`, 'segel')}${stat(v.facts.starTotal, 'bintang ★')}${stat(`${v.facts.shards}/${R.SHARD_GOAL}`, 'kepingan')}</div>
      </div>
      <div class="rpg-cols">
        <section class="rpg-card" aria-labelledby="rpg-xp-title"><h3 id="rpg-xp-title">Sumber XP</h3>
          ${v.parts.length ? `<table class="rpg-table"><tbody>${v.parts.map((p) => `<tr><th>${esc(p.label)}</th><td>+${p.xp} XP</td></tr>`).join('')}</tbody></table>` : '<p class="field-hint">Belum ada XP. Pindai terminal, jawab Papan Laporan, dan kumpulkan kepingan arsip!</p>'}
          <p class="field-hint">XP dihitung ulang dari kegiatan belajarmu. Skor rapor (maks. 420) dan poin Butik tidak berubah.</p></section>
        <section class="rpg-card" aria-labelledby="rpg-title-title"><h3 id="rpg-title-title">Tangga gelar</h3>
          <ol class="rpg-ladder">${R.TITLES.map(([lv, name]) => `<li class="${v.level >= lv ? 'on' : ''}"><span>Lv ${lv}</span><b>${esc(name)}</b><em>${v.level >= lv ? '✓' : '○'}</em></li>`).join('')}</ol></section>
      </div>
      ${groups.map((g) => `<section class="rpg-card" aria-label="Lencana ${esc(g)}"><h3>${esc(g)}</h3><div class="rpg-badges">${R.BADGES.filter((b) => b.group === g).map((b) => { const on = earned.has(b.id); return `<div class="rpg-badge ${on ? 'on' : 'off'}"><span class="ico" aria-hidden="true">${on ? b.icon : '🔒'}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small><em>${on ? '✓ Diraih' : 'Belum diraih'}</em></div>`; }).join('')}</div></section>`).join('')}`;
  }

  document.addEventListener('nutra:screen', (e) => { if (e.detail === 'prestasi') renderScreen(); });

  // ---------- Jelajah: kepingan & pulau dilaporkan ke server ----------
  const sendExplore = () => { if (online()) net.explore(shardsLocal(), islandsLocal()); };
  document.addEventListener('nutra:explore', () => { if (online()) sendExplore(); else refresh(); });

  if (net) {
    net.on('rpg', refresh);
    net.on('welcome', () => { view = null; setTimeout(sendExplore, 300); });
    net.on('settings', () => { render(); renderBoss(); });
    net.on('reset', () => { view = null; });
  }
  // Luring: hitung ulang berkala (murah, hanya membaca state & localStorage).
  setInterval(() => { if (!online() && game.state.alias) refresh(); }, 2000);
  setInterval(() => { if (!view) refresh(); else renderChip(); }, 1500);

  // =====================================================================
  // Event kelas: Bos Mitos Gizi
  // =====================================================================
  const bossLayer = document.createElement('div');
  bossLayer.id = 'boss-layer';
  bossLayer.innerHTML = `
    <div class="boss-bar" id="boss-bar" hidden>
      <div class="boss-face" aria-hidden="true"><i></i><i></i><b></b></div>
      <div class="boss-info"><span class="boss-name" id="boss-name"></span><div class="boss-hp" role="progressbar" aria-label="HP bos" aria-valuemin="0" id="boss-hp"><i></i><span></span></div><small id="boss-meta"></small></div>
      <button type="button" class="button button-primary boss-go" id="boss-go">⚔ Lawan!</button>
    </div>
    <div class="boss-panel" id="boss-panel" role="dialog" aria-modal="false" aria-labelledby="boss-panel-title" hidden>
      <button type="button" class="holo-close" id="boss-close" aria-label="Tutup panel bos">×</button>
      <p class="holo-kicker">EVENT KELAS · MITOS ATAU FAKTA?</p>
      <h2 id="boss-panel-title"></h2>
      <p class="boss-taunt" id="boss-taunt"></p>
      <div class="boss-q" id="boss-q"></div>
      <div class="boss-top" id="boss-top"></div>
    </div>`;
  document.body.append(bossLayer);
  const panel = $('#boss-panel');
  // Tombol di panel tidak boleh menggerakkan penjelajah (W A S D, spasi) di dunia 3D.
  panel.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); else { e.stopPropagation(); closePanel(); } });

  let q = null; // { id, text } soal aktif
  let result = null; // hasil jawaban terakhir
  let readyAt = 0;
  let tickTimer = null;
  const bossState = () => (online() ? net.boss : { state: 'idle' });
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  function renderBoss() {
    const b = bossState();
    const bar = $('#boss-bar');
    const show = online() && b && b.state && b.state !== 'idle';
    bar.hidden = !show;
    document.body.classList.toggle('boss-on', Boolean(show));
    if (!show) { if (!panel.hidden) closePanel(); return; }
    const active = b.state === 'active';
    const pct = b.maxHp ? Math.round((b.hp / b.maxHp) * 100) : 0;
    $('#boss-name').textContent = active ? `⚔ ${b.name}` : b.state === 'won' ? `✦ ${b.name} dikalahkan!` : b.state === 'lost' ? `${b.name} kabur… waktu habis` : `${b.name}: event dihentikan guru`;
    const hp = $('#boss-hp');
    hp.setAttribute('aria-valuemax', String(b.maxHp || 0));
    hp.setAttribute('aria-valuenow', String(b.hp || 0));
    hp.querySelector('i').style.width = `${pct}%`;
    hp.querySelector('span').textContent = `HP ${b.hp}/${b.maxHp}`;
    const last = b.last ? ` · ${b.last.correct ? `💥 ${b.last.alias} −${b.last.dmg}` : `😈 ${b.last.alias} terkecoh mitos (+3 HP)`}` : '';
    $('#boss-meta').textContent = active ? `⏱ ${mmss(b.endsAt - Date.now())} · ${b.players} penjelajah ikut${last}` : b.state === 'won' ? `Pukulan pamungkas: ${b.final || '—'} · ${b.players} penjelajah ikut · ${b.answers} jawaban` : `${b.players} penjelajah ikut · ${b.answers} jawaban`;
    $('#boss-go').hidden = !active;
    bar.classList.toggle('won', b.state === 'won');
    if (!panel.hidden) renderPanel();
    if (active && !tickTimer) tickTimer = setInterval(() => { if (bossState().state === 'active') { const bb = bossState(); $('#boss-meta').textContent = `⏱ ${mmss(bb.endsAt - Date.now())} · ${bb.players} penjelajah ikut${bb.last ? ` · ${bb.last.correct ? `💥 ${bb.last.alias} −${bb.last.dmg}` : `😈 ${bb.last.alias} terkecoh mitos (+3 HP)`}` : ''}`; } else { clearInterval(tickTimer); tickTimer = null; } }, 1000);
  }

  function openPanel() {
    const b = bossState();
    if (!b || b.state !== 'active') return;
    panel.hidden = false;
    if (!q && !result) net.bossAct({ action: 'next' });
    renderPanel();
    setTimeout(() => { const f = panel.querySelector('.boss-answer:not([disabled]), .boss-next, .holo-close'); if (f) f.focus(); }, 60);
  }
  function closePanel() { panel.hidden = true; const go = $('#boss-go'); if (go && !go.hidden) go.focus(); }

  function renderPanel() {
    const b = bossState();
    $('#boss-panel-title').textContent = b.name || 'Bos Mitos Gizi';
    const taunts = b.taunts || [];
    $('#boss-taunt').textContent = b.state === 'active' && taunts.length ? `“${taunts[Math.floor(Date.now() / 6000) % taunts.length]}”` : '';
    const box = $('#boss-q');
    if (b.state !== 'active') {
      box.innerHTML = b.state === 'won' ? `<div class="boss-end won"><b>✦ Raksasa Hoaks Gizi dikalahkan!</b><span>Pukulan pamungkas: ${esc(b.final || '—')}. Semua peserta mendapat XP dan lencana Pemburu Hoaks.</span></div>` : '<div class="boss-end"><b>Event selesai.</b><span>Tunggu event berikutnya dari guru.</span></div>';
    } else if (result) {
      box.innerHTML = `<div class="boss-result ${result.correct ? 'ok' : 'no'}" role="status">
        <b>${result.correct ? `✓ Tepat! −${result.dmg} HP` : '✗ Terkecoh mitos! Bos pulih 3 HP'}</b>
        <span>Jawabannya: <strong>${result.answer === 'mitos' ? 'MITOS' : 'FAKTA'}</strong>. ${esc(result.explain)}</span>
        ${result.streak >= 2 ? `<em>🔥 Combo ×${result.streak}</em>` : ''}</div>
        <button type="button" class="button button-primary boss-next">Soal berikutnya ↗</button>`;
      box.querySelector('.boss-next').addEventListener('click', () => { result = null; q = null; net.bossAct({ action: 'next' }); renderPanel(); });
    } else if (q) {
      const wait = Math.max(0, readyAt - Date.now());
      box.innerHTML = `<p class="boss-statement">“${esc(q.text)}”</p>
        <div class="boss-answers"><button type="button" class="boss-answer mitos" data-a="mitos"${wait ? ' disabled' : ''}><span aria-hidden="true">🧟</span> MITOS</button><button type="button" class="boss-answer fakta" data-a="fakta"${wait ? ' disabled' : ''}><span aria-hidden="true">🔬</span> FAKTA</button></div>
        <p class="boss-hint" role="status">${wait ? 'Baca pernyataannya dulu…' : 'Pilih jawabanmu.'}</p>`;
      box.querySelectorAll('.boss-answer').forEach((btn) => btn.addEventListener('click', () => {
        box.querySelectorAll('.boss-answer').forEach((x) => { x.disabled = true; });
        net.bossAct({ action: 'answer', id: q.id, a: btn.dataset.a });
      }));
      if (wait) setTimeout(() => { if (!panel.hidden && q) { renderPanel(); const f = panel.querySelector('.boss-answer'); if (f) f.focus(); } }, wait + 20);
    } else box.innerHTML = '<p class="boss-hint">Mengambil soal…</p>';
    const top = b.top || [];
    $('#boss-top').innerHTML = top.length ? `<p class="lobby-kicker">PENYERANG TERBAIK</p><ol>${top.map((t) => `<li><b>${esc(t.alias)}</b><span>${t.dmg} kerusakan</span></li>`).join('')}</ol>` : '';
  }

  $('#boss-go').addEventListener('click', openPanel);
  $('#boss-close').addEventListener('click', closePanel);
  if (net) {
    net.on('boss', (b) => {
      if (!b || b.state !== 'active') { q = null; result = null; }
      renderBoss();
    });
    net.on('boss-q', (m) => { q = m.q; result = null; readyAt = Date.now() + 1300; if (!panel.hidden) { renderPanel(); } });
    net.on('boss-result', (m) => { result = m; q = null; if (!panel.hidden) { renderPanel(); const f = panel.querySelector('.boss-next'); if (f) f.focus(); } });
    net.on('boss-error', (m) => {
      if (/Baca dulu/.test(m.message)) { readyAt = Date.now() + 600; renderPanel(); return; }
      if (/sudah dijawab/.test(m.message)) { q = null; result = null; net.bossAct({ action: 'next' }); return; }
      game.showToast(m.message);
    });
    net.on('status', renderBoss);
  }

  window.NutraRPG = {
    get view() { return view; },
    get visible() { return visible(); },
    get boss() { return bossState(); },
    refresh,
    openBoss: openPanel
  };
})();
