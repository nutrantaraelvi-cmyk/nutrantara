/*
 * Lapisan jaringan NUTRANTARA (klien).
 * Bila halaman dibuka lewat server kelas (http/https), klien tersambung ke /ws.
 * Bila dibuka sebagai berkas lokal atau di hosting statis, permainan tetap berjalan sebagai satu pemain.
 */
window.NutraNet = (() => {
  const ALL_POSTS = (window.NUTRANTARA_MISSIONS || []).map((m) => m.id);
  const listeners = {};
  const players = new Map();
  let ws = null;
  let connected = false;
  let joined = false;
  let everConnected = false;
  let failures = 0;
  let me = null;
  let muted = false;
  let party = null; // { code, leaderId, max, members: [...], posts, log } — regu proyek (maks. 4)
  let stopped = false;
  let chat = [];
  let leaderboard = [];
  let settings = { paused: false, chatEnabled: true, movementLocked: false, openPosts: ALL_POSTS.slice(), announcement: '' };
  let progressTimer = null;
  let pendingProgress = null;

  const canConnect = location.protocol === 'http:' || location.protocol === 'https:';

  function on(event, fn) { (listeners[event] ||= []).push(fn); }
  function emit(event, data) { (listeners[event] || []).forEach((fn) => { try { fn(data); } catch (err) { console.error(err); } }); }

  // ---------- Akun & sesi ----------
  const SESSION_KEY = 'nutrantara-session-v1';
  let wantSession = '';

  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
  function setSession(s) { try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* abaikan */ } }

  async function api(route, data, token) {
    if (!canConnect) return { status: 0, error: 'Server kelas tidak tersedia.' };
    try {
      const res = await fetch(`/api/${route}`, {
        method: data ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: data ? JSON.stringify(data) : undefined
      });
      const body = await res.json().catch(() => ({}));
      return { status: res.status, ...body };
    } catch {
      return { status: 0, error: 'Server kelas tidak dapat dihubungi.' };
    }
  }

  async function serverStatus() { const r = await api('status'); return r.status === 200 ? r : null; }
  async function register(data) { const r = await api('register', data); if (r.token) setSession({ token: r.token, user: r.user }); return r; }
  async function login(data) { const r = await api('login', data); if (r.token) setSession({ token: r.token, user: r.user }); return r; }
  async function resume() {
    const s = getSession();
    if (!s || !s.token) return null;
    const r = await api('me', null, s.token);
    if (r.status === 200) { setSession({ token: s.token, user: r.user }); return { token: s.token, user: r.user }; }
    if (r.status === 401) setSession(null);
    return r.status === 0 ? { offline: true, ...s } : null;
  }
  async function logout() {
    const s = getSession();
    if (s && s.token) await api('logout', {}, s.token);
    setSession(null);
    wantSession = '';
    stopped = true;
    if (ws) ws.close();
  }

  function send(msg) {
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify(msg)); return true; }
    return false;
  }

  function connect() {
    if (!canConnect || stopped) return;
    try {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    } catch {
      return;
    }
    ws.addEventListener('open', () => {
      connected = true;
      everConnected = true;
      failures = 0;
      emit('status', status());
      if (wantSession) join(wantSession);
    });
    ws.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      handle(msg);
    });
    ws.addEventListener('close', (event) => {
      const wasJoined = joined;
      connected = false;
      joined = false;
      players.clear();
      emit('status', status());
      if (wasJoined) emit('players', players);
      if (event.code === 4003 || event.code === 4001) { stopped = true; return; }
      failures += 1;
      // Hosting statis tanpa server kelas: berhenti mencoba setelah 3 kali gagal.
      if (!everConnected && failures >= 3) return;
      setTimeout(connect, Math.min(10000, 800 * 2 ** Math.min(failures, 4)));
    });
  }

  function handle(msg) {
    switch (msg.type) {
      case 'welcome':
        joined = true;
        me = msg.you;
        muted = Boolean(msg.you.muted);
        settings = msg.settings;
        players.clear();
        msg.players.forEach((p) => players.set(p.id, { ...p, tx: p.x, ty: p.y }));
        chat = msg.chat || [];
        leaderboard = msg.leaderboard || [];
        emit('status', status());
        emit('welcome', { progress: msg.progress, progressUpdatedAt: msg.progressUpdatedAt, you: me });
        emit('settings', settings);
        emit('players', players);
        emit('chat-reset', chat);
        emit('leaderboard', leaderboard);
        if (pendingProgress) flushProgress();
        if (settings.announcement) showBanner(settings.announcement, false);
        break;
      case 'error':
        emit('join-error', msg);
        break;
      case 'settings': {
        const before = settings;
        settings = msg.settings;
        emit('settings', settings);
        if (!settings.announcement) hideBanner();
        if (before.paused !== settings.paused) renderPause();
        break;
      }
      case 'player-join':
        if (me && msg.player.id === me.id) break;
        players.set(msg.player.id, { ...msg.player, tx: msg.player.x, ty: msg.player.y });
        emit('players', players);
        break;
      case 'player-leave':
        players.delete(msg.id);
        emit('players', players);
        break;
      case 'positions':
        msg.list.forEach(([id, x, y, seals, activePos, h, inWorld]) => {
          if (me && id === me.id) { me.seals = seals; return; }
          const p = players.get(id);
          if (p) { p.tx = x; p.ty = y; p.th = (h || 0) / 10; p.seals = seals; p.activePos = activePos; p.zone = inWorld ? 'world' : 'lobby'; }
        });
        break;
      case 'spawned':
        if (me) { me.x = msg.x; me.y = msg.y; }
        emit('spawned', msg);
        break;
      case 'spawn-denied':
        emit('spawn-denied', msg);
        break;
      case 'emote':
        emit('emote', msg);
        break;
      case 'teleport':
        if (me) { me.x = msg.x; me.y = msg.y; }
        emit('teleport', msg);
        break;
      case 'chat':
        chat.push(msg.entry);
        if (chat.length > 100) chat.shift();
        emit('chat', msg.entry);
        break;
      case 'chat-cleared':
        chat = [];
        emit('chat-reset', chat);
        break;
      case 'chat-deleted':
        chat = chat.filter((e) => e.id !== msg.id);
        emit('chat-reset', chat);
        break;
      case 'announce':
        showBanner(msg.text, Boolean(msg.private));
        emit('announce', msg);
        break;
      case 'notice':
        emit('notice', msg.message);
        break;
      case 'muted':
        muted = Boolean(msg.value);
        emit('notice', muted ? 'Kamu dibisukan oleh guru.' : 'Kamu boleh mengobrol lagi.');
        emit('settings', settings);
        break;
      case 'leaderboard':
        leaderboard = msg.leaderboard;
        emit('leaderboard', leaderboard);
        break;
      case 'progress-sync':
        emit('progress-sync', msg);
        break;
      case 'reset':
        emit('reset', msg);
        break;
      case 'party':
        party = msg.party;
        emit('party', party);
        break;
      case 'party-error':
        emit('party-error', msg.message);
        break;
      case 'kicked':
        showBlocker('Sesi berakhir', msg.message || 'Kamu dikeluarkan dari sesi oleh guru.');
        emit('kicked', msg);
        break;
      case 'replaced':
        showBlocker('Dibuka di tab lain', 'Penjelajah ini sedang dimainkan di tab atau perangkat lain. Tutup tab ini.');
        break;
      default:
        break;
    }
  }

  function join(session) {
    wantSession = session;
    stopped = false;
    if (!canConnect) return false;
    if (!ws || ws.readyState > 1) { connect(); return true; }
    return send({ type: 'join', session });
  }

  function sendZone(zone) { if (joined) send({ type: 'zone', zone }); }
  function spawn(island) { return joined && send({ type: 'spawn', island }); }
  /** Terjun ke dekat teman satu regu (server memilih pulau dan posisinya). */
  function spawnNear(friendId) { return joined && send({ type: 'spawn', to: friendId }); }
  const partyCreate = () => joined && send({ type: 'party', action: 'create' });
  const partyJoin = (code) => joined && send({ type: 'party', action: 'join', code });
  const partyLeave = () => joined && send({ type: 'party', action: 'leave' });
  /** Operasi kecil pada data misi regu (set/push) + catatan kontribusi. */
  const teamOp = (ops, note, pos) => joined && Boolean(party) && send({ type: 'team-op', ops, note, pos });
  /** Usulan/suara jawaban regu untuk satu tantangan Papan Laporan. */
  const teamVote = (pos, index, response) => joined && Boolean(party) && send({ type: 'team-vote', pos, index, response });
  const isTeammate = (id) => Boolean(party && me && id !== me.id && party.members.some((m) => m.id === id));
  function emote(name) { return joined && send({ type: 'emote', emote: name }); }

  function pushProgress(state, screen) {
    pendingProgress = { state, screen };
    if (!joined) return;
    clearTimeout(progressTimer);
    progressTimer = setTimeout(flushProgress, 600);
  }

  function flushProgress() {
    if (!pendingProgress || !joined) return;
    const { state, screen } = pendingProgress;
    if (send({ type: 'progress', state, screen })) pendingProgress = null;
  }

  function sendMove(x, y, h = 0) { if (joined) send({ type: 'move', x: Math.round(x), y: Math.round(y), h: Math.round(h * 10) }); }
  function sendChat(text) { return joined && send({ type: 'chat', text }); }

  function status() { return { canConnect, connected, joined, online: joined }; }

  function isPostOpen(id) { return !joined || settings.openPosts.includes(Number(id)); }

  // ---------- Lapisan UI global: jeda, pengumuman, blokir ----------

  function ensureLayer() {
    let layer = document.getElementById('net-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'net-layer';
    layer.innerHTML = `
      <div class="net-banner" id="net-banner" role="status" aria-live="assertive" hidden><span class="net-banner-tag" id="net-banner-tag">PENGUMUMAN GURU</span><p id="net-banner-text"></p><button type="button" class="icon-button" id="net-banner-close" aria-label="Tutup pengumuman">×</button></div>
      <div class="net-overlay" id="net-pause" role="dialog" aria-modal="true" aria-labelledby="net-pause-title" hidden><div class="net-overlay-card"><div class="nara-avatar" aria-hidden="true"><span>◉</span><i></i></div><h2 id="net-pause-title">Permainan dijeda oleh guru</h2><p>Dengarkan arahan guru. Progresmu aman dan permainan akan berlanjut otomatis.</p></div></div>
      <div class="net-overlay" id="net-blocker" role="alertdialog" aria-modal="true" aria-labelledby="net-blocker-title" hidden><div class="net-overlay-card"><h2 id="net-blocker-title"></h2><p id="net-blocker-text"></p></div></div>`;
    document.body.append(layer);
    layer.querySelector('#net-banner-close').addEventListener('click', hideBanner);
    return layer;
  }

  function showBanner(text, isPrivate) {
    if (!text) return;
    ensureLayer();
    document.getElementById('net-banner-tag').textContent = isPrivate ? 'PESAN GURU UNTUKMU' : 'PENGUMUMAN GURU';
    document.getElementById('net-banner-text').textContent = text;
    document.getElementById('net-banner').hidden = false;
  }

  function hideBanner() { const b = document.getElementById('net-banner'); if (b) b.hidden = true; }

  function renderPause() {
    ensureLayer();
    const overlay = document.getElementById('net-pause');
    overlay.hidden = !(joined && settings.paused);
    document.body.classList.toggle('net-paused', !overlay.hidden);
    setInert();
  }

  // Saat dijeda/diblokir, isi halaman tidak bisa difokus atau diklik (keyboard juga).
  function setInert() {
    const shell = document.querySelector('.shell');
    const blocked = !document.getElementById('net-pause').hidden || !document.getElementById('net-blocker').hidden;
    if (shell) shell.inert = blocked;
  }

  function showBlocker(title, text) {
    ensureLayer();
    document.getElementById('net-blocker-title').textContent = title;
    document.getElementById('net-blocker-text').textContent = text;
    document.getElementById('net-blocker').hidden = false;
    setInert();
  }

  on('status', renderPause);
  on('settings', renderPause);
  return {
    on, join, pushProgress, sendMove, sendChat, isPostOpen, status,
    api, serverStatus, register, login, resume, logout, getSession, sendZone, spawn, emote,
    spawnNear, partyCreate, partyJoin, partyLeave, isTeammate, teamOp, teamVote,
    get party() { return party; },
    get me() { return me; },
    get players() { return players; },
    get settings() { return settings; },
    get chat() { return chat; },
    get leaderboard() { return leaderboard; },
    get muted() { return muted; },
    get online() { return joined; }
  };
})();
