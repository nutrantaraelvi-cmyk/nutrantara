/*
 * Dunia RPG NUTRANTARA: pulau bersama tempat penjelajah berjalan menuju enam portal pos.
 * Kontrol: WASD/panah untuk bergerak, E/Enter untuk berinteraksi, klik/sentuh untuk berjalan ke titik.
 * Tanpa server kelas, dunia tetap dapat dimainkan sendirian.
 */
(() => {
  const W = window.NUTRANTARA_WORLD;
  const game = window.NutraGame;
  const net = window.NutraNet;
  if (!W || !game) return;

  const POS_KEY = 'nutrantara-world-pos-v1';
  const canvas = document.getElementById('world-canvas');
  const ctx = canvas.getContext('2d');
  const promptEl = document.getElementById('world-prompt');
  const actionBtn = document.getElementById('world-action');
  const rosterEl = document.getElementById('world-roster');
  const rosterCount = document.getElementById('world-roster-count');
  const chatLog = document.getElementById('chat-log');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatState = document.getElementById('chat-state');
  const modeEl = document.getElementById('world-mode');
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const keys = new Set();
  let running = false;
  let last = 0;
  let lastSent = 0;
  let sentX = -1;
  let sentY = -1;
  let target = null;
  let nearby = null;
  let t = 0;
  const bubbles = new Map(); // id -> { text, until }

  const self = loadSelf();

  function loadSelf() {
    try {
      const s = JSON.parse(localStorage.getItem(POS_KEY));
      if (s && Number.isFinite(s.x)) return { x: s.x, y: s.y, dir: 1 };
    } catch { /* abaikan */ }
    return { x: W.spawn.x, y: W.spawn.y, dir: 1 };
  }

  function saveSelf() { try { localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(self.x), y: Math.round(self.y) })); } catch { /* abaikan */ } }

  const canMove = () => !(net && net.online && (net.settings.paused || net.settings.movementLocked));

  // ---------- Masukan ----------

  const typing = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  const MOVE_KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };

  window.addEventListener('keydown', (e) => {
    if (!running || typing(document.activeElement)) return;
    if (MOVE_KEYS[e.code]) {
      keys.add(MOVE_KEYS[e.code]);
      target = null;
      if (document.activeElement === canvas || document.activeElement === document.body) e.preventDefault();
    }
    if ((e.code === 'KeyE' || (e.code === 'Enter' && document.activeElement === canvas)) && nearby) { e.preventDefault(); interact(); }
  });
  window.addEventListener('keyup', (e) => { if (MOVE_KEYS[e.code]) keys.delete(MOVE_KEYS[e.code]); });
  window.addEventListener('blur', () => keys.clear());

  function toWorld(event) {
    const r = canvas.getBoundingClientRect();
    return { x: ((event.clientX - r.left) / r.width) * W.width, y: ((event.clientY - r.top) / r.height) * W.height };
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    const p = toWorld(e);
    const station = W.stations.find((s) => Math.hypot(s.x - p.x, s.y - p.y) < 30);
    target = W.clamp(station ? station.x : p.x, station ? station.y + 30 : p.y);
  });

  actionBtn.addEventListener('click', interact);

  function interact() {
    if (!nearby) return;
    if (nearby.kind === 'nara') { naraTalk(); return; }
    keys.clear();
    game.openPos(nearby.id);
  }

  function naraTalk() {
    const st = game.state;
    const next = (window.NUTRANTARA_MISSIONS || []).find((m) => !st.posts[m.id].sealed);
    let text;
    if (!next) text = 'Semua segel aktif! Lihat Papan Peringkat dan bandingkan rancangan menumu dengan teman.';
    else if (!game.isUnlocked(next.id)) text = `Portal Pos ${next.id} sedang ditutup guru. Sambil menunggu, tinjau kembali Paspor dan bukti yang sudah kamu kumpulkan.`;
    else text = `Tujuan berikutnya: Pos ${next.id} — ${next.title} ${next.titleEm}. Ikuti jalur bercahaya, lalu tekan E di depan portalnya.`;
    bubbles.set('nara', { text, until: performance.now() + 6000 });
    game.showToast(`Nara: ${text}`);
  }

  // ---------- Simulasi ----------

  function update(dt) {
    let vx = 0;
    let vy = 0;
    if (canMove()) {
      if (keys.has('up')) vy -= 1;
      if (keys.has('down')) vy += 1;
      if (keys.has('left')) vx -= 1;
      if (keys.has('right')) vx += 1;
      if (!vx && !vy && target) {
        const dx = target.x - self.x;
        const dy = target.y - self.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) target = null; else { vx = dx / d; vy = dy / d; }
      }
    } else target = null;
    const len = Math.hypot(vx, vy);
    if (len) {
      const step = (W.speed * dt) / len;
      const c = W.clamp(self.x + vx * step, self.y + vy * step);
      self.x = c.x;
      self.y = c.y;
      if (vx) self.dir = vx > 0 ? 1 : -1;
      self.moving = true;
    } else self.moving = false;

    const nowMs = performance.now();
    if (nowMs - lastSent > 100 && (Math.round(self.x) !== sentX || Math.round(self.y) !== sentY)) {
      lastSent = nowMs;
      sentX = Math.round(self.x);
      sentY = Math.round(self.y);
      if (net) net.sendMove(self.x, self.y);
      saveSelf();
    }

    if (net) net.players.forEach((p) => {
      const k = Math.min(1, dt * 10);
      const mx = (p.tx - p.x) * k;
      p.moving = Math.abs(mx) + Math.abs(p.ty - p.y) > 0.6;
      if (Math.abs(mx) > 0.05) p.dir = mx > 0 ? 1 : -1;
      p.x += mx;
      p.y += (p.ty - p.y) * k;
    });

    updateNearby();
  }

  function updateNearby() {
    let found = null;
    if (Math.hypot(W.nara.x - self.x, W.nara.y - self.y) < W.interactRadius) found = { kind: 'nara' };
    W.stations.forEach((s) => {
      if (Math.hypot(s.x - self.x, s.y - self.y) < W.interactRadius) found = { kind: 'station', id: s.id, name: s.name };
    });
    const key = found ? `${found.kind}${found.id || ''}` : '';
    const prevKey = nearby ? `${nearby.kind}${nearby.id || ''}` : '';
    nearby = found;
    if (key === prevKey) return;
    if (!found) {
      promptEl.textContent = 'Jelajahi pulau. Dekati portal pos atau Nara, lalu tekan E.';
      actionBtn.hidden = true;
      return;
    }
    if (found.kind === 'nara') {
      promptEl.textContent = 'Nara ada di dekatmu. Tekan E untuk meminta arahan.';
      actionBtn.textContent = 'Bicara dengan Nara';
    } else {
      const status = game.posStatus(found.id);
      promptEl.textContent = `Portal Pos ${found.id} — ${found.name} (${status === 'done' ? 'selesai' : status === 'ready' ? 'siap dimasuki' : 'terkunci'}). Tekan E untuk masuk.`;
      actionBtn.textContent = status === 'locked' ? `Pos ${found.id} terkunci` : `Masuk Pos ${found.id}`;
    }
    actionBtn.hidden = false;
  }

  // ---------- Gambar ----------

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(r.width * dpr));
    const h = Math.round((w * W.height) / W.width);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function drawWorld() {
    const sx = canvas.width / W.width;
    ctx.setTransform(sx, 0, 0, sx, 0, 0);
    const { cx, cy, rx, ry } = W.island;

    // Laut
    const sea = ctx.createLinearGradient(0, 0, 0, W.height);
    sea.addColorStop(0, '#08262b');
    sea.addColorStop(1, '#04161a');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, W.width, W.height);
    ctx.strokeStyle = 'rgba(104,220,231,.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i += 1) {
      const y = 20 + i * 44;
      ctx.beginPath();
      for (let x = 0; x <= W.width; x += 16) ctx.lineTo(x, y + Math.sin(x / 40 + t * 1.2 + i) * 3);
      ctx.stroke();
    }

    // Pulau
    ctx.fillStyle = '#c9b887';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 10, ry + 10, 0, 0, Math.PI * 2); ctx.fill();
    const grass = ctx.createRadialGradient(cx, cy - 60, 40, cx, cy, rx);
    grass.addColorStop(0, '#2f7a57');
    grass.addColorStop(1, '#1d5a42');
    ctx.fillStyle = grass;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,244,189,.07)';
    for (let gx = cx - rx; gx < cx + rx; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, cy - ry); ctx.lineTo(gx, cy + ry); ctx.stroke(); }

    // Jalur antar-pos
    const path = [W.spawn, ...W.stations];
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(235,216,160,.35)';
    ctx.lineWidth = 16;
    ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -t * 20;
    ctx.strokeStyle = 'rgba(255,209,124,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.setLineDash([]);

    // Pohon
    W.trees.forEach(([x, y]) => {
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath(); ctx.ellipse(x, y + 12, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5b3d22'; ctx.fillRect(x - 2, y, 4, 12);
      ctx.fillStyle = '#3f9a63';
      ctx.beginPath(); ctx.arc(x, y - 4, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#56b77a';
      ctx.beginPath(); ctx.arc(x - 4, y - 8, 6, 0, Math.PI * 2); ctx.fill();
    });

    // Portal pos
    W.stations.forEach((s) => {
      const status = game.posStatus(s.id);
      const color = status === 'done' ? '#78f4bd' : status === 'ready' ? '#68dce7' : '#6c7f79';
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 16, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
      if (status === 'ready') {
        ctx.strokeStyle = 'rgba(104,220,231,.5)';
        ctx.lineWidth = 2;
        const pulse = 26 + ((t * 18) % 18);
        ctx.globalAlpha = 1 - (pulse - 26) / 18;
        ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, pulse, pulse * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#0e2426';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, 24, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Gerbang
      ctx.beginPath();
      ctx.moveTo(s.x - 16, s.y + 4); ctx.lineTo(s.x - 16, s.y - 18);
      ctx.quadraticCurveTo(s.x, s.y - 36, s.x + 16, s.y - 18); ctx.lineTo(s.x + 16, s.y + 4);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = '700 13px Manrope, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(status === 'done' ? '✓' : status === 'locked' ? '🔒' : String(s.id).padStart(2, '0'), s.x, s.y - 6);
      ctx.font = '500 10px "DM Mono", monospace';
      ctx.fillStyle = 'rgba(235,255,246,.85)';
      ctx.fillText(`POS ${s.id} · ${s.name.toUpperCase()}`, s.x, s.y + 34);
    });

    // Nara
    const nb = Math.sin(t * 3) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(W.nara.x, W.nara.y + 14, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9fff0';
    ctx.beginPath(); ctx.roundRect(W.nara.x - 10, W.nara.y - 16 + nb, 20, 22, 6); ctx.fill();
    ctx.fillStyle = '#071516';
    ctx.beginPath(); ctx.roundRect(W.nara.x - 7, W.nara.y - 12 + nb, 14, 8, 3); ctx.fill();
    ctx.fillStyle = '#78f4bd';
    ctx.fillRect(W.nara.x - 5, W.nara.y - 10 + nb, 3, 3); ctx.fillRect(W.nara.x + 2, W.nara.y - 10 + nb, 3, 3);
    ctx.strokeStyle = '#78f4bd'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W.nara.x, W.nara.y - 16 + nb); ctx.lineTo(W.nara.x, W.nara.y - 24 + nb); ctx.stroke();
    ctx.fillStyle = '#ffd17c';
    ctx.beginPath(); ctx.arc(W.nara.x, W.nara.y - 26 + nb, 2.5, 0, Math.PI * 2); ctx.fill();
    label(W.nara.x, W.nara.y - 34, 'NARA', '#78f4bd');

    // Pemain (urut berdasarkan y supaya yang di depan tergambar terakhir)
    const people = [];
    if (net) net.players.forEach((p) => people.push({ ...p, self: false }));
    const me = net && net.me;
    people.push({ id: me ? me.id : 'me', x: self.x, y: self.y, dir: self.dir, moving: self.moving, alias: game.state.alias || 'Kamu', color: me ? me.color : '#ffd17c', seals: game.sealCount(), self: true });
    people.sort((a, b) => a.y - b.y).forEach(drawAvatar);

    // Gelembung percakapan
    const nowMs = performance.now();
    bubbles.forEach((b, id) => {
      if (b.until < nowMs) { bubbles.delete(id); return; }
      const who = id === 'nara' ? { x: W.nara.x, y: W.nara.y - 40 } : id === (me && me.id) ? { x: self.x, y: self.y - 44 } : net && net.players.get(id) ? { x: net.players.get(id).x, y: net.players.get(id).y - 44 } : null;
      if (who) bubble(who.x, who.y, b.text);
    });

    if (net && net.online && (net.settings.paused || net.settings.movementLocked)) {
      ctx.fillStyle = 'rgba(4,22,26,.55)';
      ctx.fillRect(0, 0, W.width, 30);
      label(W.width / 2, 20, net.settings.paused ? 'PERMAINAN DIJEDA GURU' : 'GERAK DIBEKUKAN GURU', '#ffd17c');
    }
  }

  function drawAvatar(p) {
    const bob = p.moving ? Math.sin(t * 14) * 1.5 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (p.self) {
      ctx.strokeStyle = '#ffd17c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 14, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = p.color || '#68dce7';
    ctx.beginPath(); ctx.roundRect(p.x - 8, p.y - 6 + bob, 16, 17, 5); ctx.fill();
    ctx.fillStyle = '#f2d2b0';
    ctx.beginPath(); ctx.arc(p.x, p.y - 12 + bob, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(p.x + (p.dir || 1) * 3 - 1, p.y - 13 + bob, 2, 2);
    // Ransel penjelajah
    ctx.fillStyle = 'rgba(7,21,22,.6)';
    ctx.fillRect(p.x - (p.dir || 1) * 9 - 2, p.y - 3 + bob, 4, 9);
    const name = `${p.alias}${p.seals ? ` ✦${p.seals}` : ''}`;
    label(p.x, p.y - 26, name, p.self ? '#ffd17c' : '#ebfff6');
  }

  function label(x, y, text, color) {
    ctx.font = '600 10px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(7,21,22,.75)';
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - 10, w, 14, 3); ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 1);
  }

  function bubble(x, y, text) {
    ctx.font = '500 10px "DM Sans", sans-serif';
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach((w) => { const test = line ? `${line} ${w}` : w; if (ctx.measureText(test).width > 170 && line) { lines.push(line); line = w; } else line = test; });
    if (line) lines.push(line);
    const shown = lines.slice(0, 4);
    const w = Math.max(...shown.map((l) => ctx.measureText(l).width)) + 14;
    const h = shown.length * 13 + 8;
    const bx = Math.min(W.width - w - 4, Math.max(4, x - w / 2));
    const by = Math.max(4, y - h);
    ctx.fillStyle = 'rgba(235,255,246,.95)';
    ctx.beginPath(); ctx.roundRect(bx, by, w, h, 6); ctx.fill();
    ctx.fillStyle = '#071516';
    ctx.textAlign = 'left';
    shown.forEach((l, i) => ctx.fillText(l, bx + 7, by + 15 + i * 13));
  }

  function frame(ms) {
    if (!running) return;
    const dt = Math.min(0.05, (ms - last) / 1000 || 0);
    last = ms;
    t += dt;
    update(dt);
    resize();
    drawWorld();
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    nearby = undefined;
    updateNearby();
    renderRoster();
    renderChatState();
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function stop() { running = false; keys.clear(); target = null; }

  document.addEventListener('nutra:screen', (e) => { if (e.detail === 'world') start(); else stop(); });

  // ---------- Daftar pemain & obrolan ----------

  function renderMode() {
    if (!net) { modeEl.textContent = 'MODE SATU PEMAIN'; return; }
    const s = net.status();
    modeEl.textContent = s.joined ? '● TERSAMBUNG KE SERVER KELAS' : s.canConnect && s.connected ? '◌ MENYAMBUNG…' : 'MODE SATU PEMAIN · TANPA SERVER KELAS';
    modeEl.dataset.online = String(Boolean(s.joined));
  }

  function renderRoster() {
    renderMode();
    const list = [{ alias: game.state.alias || 'Kamu', color: net && net.me ? net.me.color : '#ffd17c', seals: game.sealCount(), self: true }];
    if (net) net.players.forEach((p) => list.push(p));
    rosterCount.textContent = String(list.length);
    rosterEl.innerHTML = list.map((p) => `<li><span class="roster-dot" style="background:${esc(p.color)}"></span><span>${esc(p.alias)}${p.self ? ' <em>(kamu)</em>' : ''}</span><b>✦ ${Number(p.seals) || 0}</b></li>`).join('');
  }

  function chatLine(entry) {
    const li = document.createElement('li');
    li.dataset.id = entry.id;
    const time = new Date(entry.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    li.innerHTML = `<span class="chat-time">${esc(time)}</span> <b style="color:${esc(entry.color)}">${esc(entry.from)}</b> ${esc(entry.text)}`;
    return li;
  }

  function resetChat(list) {
    chatLog.innerHTML = '';
    list.forEach((e) => chatLog.append(chatLine(e)));
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function renderChatState() {
    let reason = '';
    if (!net || !net.online) reason = 'Obrolan tersedia saat tersambung ke server kelas.';
    else if (!net.settings.chatEnabled) reason = 'Obrolan sedang dimatikan oleh guru.';
    else if (net.muted) reason = 'Kamu sedang dibisukan oleh guru.';
    chatInput.disabled = Boolean(reason);
    chatForm.querySelector('button').disabled = Boolean(reason);
    chatState.textContent = reason || 'Sopan, singkat, dan tetap pada misi. Pesan dapat dilihat guru.';
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !net) return;
    if (net.sendChat(text)) chatInput.value = '';
  });

  if (net) {
    net.on('players', renderRoster);
    net.on('status', () => { renderRoster(); renderChatState(); });
    net.on('settings', () => { renderChatState(); nearby = undefined; });
    net.on('welcome', ({ you }) => { self.x = you.x; self.y = you.y; renderRoster(); renderChatState(); });
    net.on('teleport', ({ x, y }) => { self.x = x; self.y = y; target = null; saveSelf(); game.showToast('Guru memindahkan posisimu.'); });
    net.on('chat', (entry) => {
      chatLog.append(chatLine(entry));
      while (chatLog.children.length > 100) chatLog.firstChild.remove();
      chatLog.scrollTop = chatLog.scrollHeight;
      bubbles.set(entry.playerId, { text: entry.text, until: performance.now() + 5000 });
    });
    net.on('chat-reset', resetChat);
    net.on('leaderboard', renderRoster);
  }

  renderMode();
  if (game.visibleScreen === 'world') start();
})();
