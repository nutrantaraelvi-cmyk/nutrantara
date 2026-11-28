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

  const POS_KEY = 'nutrantara-world-pos-v3'; // v3: peta 32400×15200 (wilayah pos dunia terbuka)
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

  function allowed() {
    const sealed = (window.NUTRANTARA_MISSIONS || []).filter((m) => game.state.posts[m.id] && game.state.posts[m.id].sealed).map((m) => m.id);
    return W.allowedIslands(sealed, net && net.online ? net.settings.openPosts : null);
  }

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

  // Kamera 2D: peta dunia terbuka lebih luas dari layar, jadi yang tampak hanya jendela VIEW di sekitar pemain.
  const VIEW = { w: 960, h: 600 };
  const view = { x: 0, y: 0 };
  function followCamera() {
    view.x = Math.max(0, Math.min(W.width - VIEW.w, self.x - VIEW.w / 2));
    view.y = Math.max(0, Math.min(W.height - VIEW.h, self.y - VIEW.h / 2));
  }

  function toWorld(event) {
    const r = canvas.getBoundingClientRect();
    return { x: view.x + ((event.clientX - r.left) / r.width) * VIEW.w, y: view.y + ((event.clientY - r.top) / r.height) * VIEW.h };
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    const p = toWorld(e);
    const station = W.stations.find((s) => Math.hypot(s.x - p.x, s.y - p.y) < 30);
    target = W.clamp(station ? station.x : p.x, station ? station.y + 30 : p.y, allowed());
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
      const c = W.clamp(self.x + vx * step, self.y + vy * step, allowed());
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
    const h = Math.round((w * VIEW.h) / VIEW.w);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function drawWorld() {
    followCamera();
    const sx = canvas.width / VIEW.w;
    ctx.setTransform(sx, 0, 0, sx, -view.x * sx, -view.y * sx);
    const open = allowed();

    // Langit & awan
    const sky = ctx.createLinearGradient(0, view.y, 0, view.y + VIEW.h);
    sky.addColorStop(0, '#9fdbe6');
    sky.addColorStop(1, '#e8f7fa');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W.width, W.height);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let k = 0; k < 44; k += 1) {
      const x = ((k * 137 + t * 8) % (W.width + 120)) - 60;
      const y = 40 + ((k * 151) % (W.height - 80));
      ctx.beginPath(); ctx.ellipse(x, y, 46, 14, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Jembatan cahaya
    ctx.lineCap = 'round';
    W.bridges.forEach((br) => {
      const on = open.has(br.from) && open.has(br.to);
      ctx.strokeStyle = on ? 'rgba(104,220,231,.9)' : 'rgba(110,125,122,.6)';
      ctx.lineWidth = br.w;
      ctx.beginPath(); ctx.moveTo(br.a[0], br.a[1]); ctx.lineTo(br.b[0], br.b[1]); ctx.stroke();
      if (on) {
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = -t * 20;
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(br.a[0], br.a[1]); ctx.lineTo(br.b[0], br.b[1]); ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Pulau melayang
    W.islands.forEach((isl) => {
      ctx.fillStyle = '#7a5f48';
      ctx.beginPath(); ctx.ellipse(isl.cx, isl.cy + 14, isl.rx + 6, isl.ry + 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e6d29b';
      ctx.beginPath(); ctx.ellipse(isl.cx, isl.cy, isl.rx + 6, isl.ry + 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isl.id === 0 ? '#5cbf72' : '#4fae66';
      ctx.beginPath(); ctx.ellipse(isl.cx, isl.cy, isl.rx, isl.ry, 0, 0, Math.PI * 2); ctx.fill();
      if (!open.has(isl.id)) {
        ctx.fillStyle = 'rgba(80,95,92,.55)';
        ctx.beginPath(); ctx.ellipse(isl.cx, isl.cy, isl.rx, isl.ry, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = '700 11px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(7,21,22,.8)';
      ctx.fillText(W.isPost(isl.id) ? `POS ${isl.id} · ${isl.name.toUpperCase()}` : isl.kind === 'wild' ? `◆ ${isl.name.toUpperCase()}` : isl.name.toUpperCase(), isl.cx, W.isPost(isl.id) ? isl.cy + Math.min(isl.ry * 0.25, 300) - 150 : isl.cy - isl.ry + 18);
    });

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
      ctx.fillRect(view.x, view.y, VIEW.w, 30);
      label(view.x + VIEW.w / 2, view.y + 20, net.settings.paused ? 'PERMAINAN DIJEDA GURU' : 'GERAK DIBEKUKAN GURU', '#ffd17c');
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
    const name = `${!p.self && net && net.isTeammate && net.isTeammate(p.id) ? '🤝 ' : ''}${p.alias}${p.seals ? ` ✦${p.seals}` : ''}`;
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
    const bx = Math.min(view.x + VIEW.w - w - 4, Math.max(view.x + 4, x - w / 2));
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

  const use2D = () => window.NUTRA_WORLD_MODE !== '3d';

  function start() {
    renderRoster();
    renderChatState();
    if (running || !use2D()) return;
    running = true;
    nearby = undefined;
    updateNearby();
    renderRoster();
    renderChatState();
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function stop() { running = false; keys.clear(); target = null; nearby = null; }

  function placeAt(x, y) { self.x = x; self.y = y; target = null; saveSelf(); }

  window.NutraWorld2D = { start, stop, placeAt, get running() { return running; }, get island() { return W.islandAt(self.x, self.y); } };

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
    net.on('teleport', ({ x, y }) => { self.x = x; self.y = y; target = null; saveSelf(); if (use2D()) game.showToast('Guru memindahkan posisimu.'); });
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

