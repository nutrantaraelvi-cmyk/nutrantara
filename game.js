(() => {
  const APP_VERSION = '0.7';
  const STORAGE_PREFIX = 'nutrantara-save-v2:';
  let userKey = '';
  const saveKey = () => STORAGE_PREFIX + userKey;
  const LEADERBOARD_KEY = 'nutrantara-leaderboard-v1';
  const SCHEMA_VERSION = 2;
  const SEAL_POINTS = 20;
  const MIN_REASON = 20;
  const MISSIONS = window.NUTRANTARA_MISSIONS || [];
  const PROJECT_STEPS = [
    { id: 'brief', label: 'Brief' },
    { id: 'initial', label: 'Rancangan awal' },
    { id: 'review', label: 'Telaah' },
    { id: 'revision', label: 'Revisi' },
    { id: 'reflection', label: 'Refleksi' }
  ];
  const NUTRIENTS = [
    { key: 'energy', label: 'Energi', unit: 'kkal' },
    { key: 'protein', label: 'Protein', unit: 'g' },
    { key: 'fiber', label: 'Serat', unit: 'g' }
  ];
  const NODE_CLASSES = ['node-one', 'node-two', 'node-three', 'node-four', 'node-five', 'node-six'];
  const screens = ['world', 'map', 'mission', 'kitchen', 'passport', 'report', 'leaderboard'];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pad = (n) => String(n).padStart(2, '0');
  const missionById = (id) => MISSIONS.find((m) => m.id === Number(id));

  // ---------- State ----------

  const emptyIngredient = () => ({ name: '', form: 'mentah', grams: '', energy: '', protein: '', fiber: '', source: '' });
  const emptyDraft = () => ({ target: '', mealTime: '', menuName: '', ingredients: [emptyIngredient()], rationale: '', missingNote: '', changeReason: '', savedAt: null });
  const freshAnalysis = () => ({ started: false, sealed: false, sealedAt: null, reason: '', challenges: [freshChallenge(), freshChallenge()] });
  const freshChallenge = () => ({ complete: false, attempts: 0, points: 0, response: null, draft: null, log: [] });
  const freshProject = () => ({ started: false, sealed: false, sealedAt: null, step: 'brief', reached: 0, initial: emptyDraft(), review: { checks: [], reviewer: '', notes: '', savedAt: null }, revision: null, reflection: { learned: '', contribution: '' } });

  function freshState() {
    const posts = {};
    MISSIONS.forEach((m) => { posts[m.id] = m.type === 'project' ? freshProject() : freshAnalysis(); });
    return { schemaVersion: SCHEMA_VERSION, appVersion: APP_VERSION, alias: '', currentScreen: 'welcome', activePos: 1, leaderboardRecorded: false, posts };
  }

  // Satu jawaban per tantangan. Jawaban salah tidak menghentikan siswa: tantangan dianggap selesai (0 poin)
  // dan Nara menunjukkan jawaban yang tepat beserta penjelasannya.
  const explanation = (def) => String(def.success || '').replace(/^Tepat\.\s*/, '');
  function gradeChallenge(m, index, response) {
    const def = m.challenges[index];
    const c = post(m.id).challenges[index];
    c.attempts += 1;
    const correct = isCorrect(def, response);
    c.response = response;
    c.draft = null;
    c.correct = correct;
    c.complete = true;
    c.points = correct ? awardForAttempt(c.attempts) : 0;
    c.log.push({ attempt: c.attempts, response, correct, at: new Date().toISOString() });
    post(m.id).started = true;
    return { correct, points: c.points, attempts: c.attempts, success: def.success, explanation: explanation(def), correctText: responseText(def, def.correct), yourText: responseText(def, response) };
  }
  const isRight = (c) => c.complete && c.correct !== false;
  function markClass(def, value, selected, done) {
    if (!done) return '';
    const right = Array.isArray(def.correct) ? def.correct.includes(value) : def.correct === value;
    if (right) return ' is-correct';
    return selected.includes(value) ? ' is-wrong' : '';
  }

  function awardForAttempt(attempts) { return Math.max(10, 30 - 5 * Math.max(0, attempts - 1)); }

  function migrateV1(saved) {
    const next = freshState();
    next.alias = saved.alias || '';
    const old = saved.pos1 || {};
    const p1 = next.posts[1];
    p1.started = Boolean(old.started);
    p1.sealed = Boolean(old.sealed);
    p1.reason = old.reason || '';
    [['challengeOneComplete', 'attemptsOne'], ['challengeTwoComplete', 'attemptsTwo']].forEach(([done, tries], i) => {
      const c = p1.challenges[i];
      c.attempts = old[tries] || 0;
      c.complete = Boolean(old[done]);
      c.points = c.complete ? awardForAttempt(c.attempts) : 0;
    });
    if (old.evidence && old.evidence.length) p1.challenges[1].response = old.evidence;
    if (p1.challenges[0].complete) p1.challenges[0].response = 'different';
    next.currentScreen = next.alias ? 'map' : 'welcome';
    return next;
  }

  function loadState() {
    try {
      if (!userKey) return freshState();
      const raw = localStorage.getItem(saveKey());
      if (!raw) return freshState();
      return normalizeState(JSON.parse(raw));
    } catch {
      return freshState();
    }
  }

  function normalizeState(saved) {
    try {
      if (!saved || typeof saved !== 'object') return freshState();
      if (saved.schemaVersion === 1) return migrateV1(saved);
      if (saved.schemaVersion !== SCHEMA_VERSION || !saved.posts) return freshState();
      const base = freshState();
      MISSIONS.forEach((m) => {
        const stored = saved.posts[m.id];
        if (!stored) return;
        if (m.type === 'project') base.posts[m.id] = { ...base.posts[m.id], ...stored, review: { ...base.posts[m.id].review, ...stored.review }, reflection: { ...base.posts[m.id].reflection, ...stored.reflection } };
        else base.posts[m.id] = { ...base.posts[m.id], ...stored, challenges: base.posts[m.id].challenges.map((c, i) => ({ ...c, ...(stored.challenges || [])[i] })) };
      });
      return { ...base, ...saved, posts: base.posts, appVersion: APP_VERSION };
    } catch {
      return freshState();
    }
  }

  let state = freshState();
  let toastTimer;
  let selectedPos = null;
  let challengeView = 0;
  let lastHub = 'world';

  const net = window.NutraNet || null;

  function saveState() {
    state.updatedAt = new Date().toISOString();
    if (net && state.alias) net.pushProgress(state, state.currentScreen);
    try {
      if (userKey) localStorage.setItem(saveKey(), JSON.stringify(state));
      document.dispatchEvent(new CustomEvent('nutra:state'));
      return true;
    } catch {
      showToast('Penyimpanan perangkat tidak tersedia. Unduh Paspor untuk mencadangkan progres.');
      return false;
    }
  }

  const post = (id) => state.posts[id];
  const sealCount = () => MISSIONS.filter((m) => post(m.id).sealed).length;
  const sequenceOpen = (id) => id === 1 || Boolean(post(id - 1) && post(id - 1).sealed);
  // Guru dapat menutup pos lewat panel admin; pos yang sudah disegel tetap bisa ditinjau.
  const gateOpen = (id) => !net || net.isPostOpen(id) || Boolean(post(id) && post(id).sealed);
  const isUnlocked = (id) => sequenceOpen(id) && gateOpen(id);
  const lockMessage = (id) => (!sequenceOpen(id) ? `Segel Pos ${id - 1} dibutuhkan untuk membuka portal ini.` : `Pos ${id} sedang ditutup oleh guru. Tunggu arahan berikutnya.`);

  function computeScore() {
    return MISSIONS.reduce((total, m) => {
      const p = post(m.id);
      const decisions = m.type === 'analysis' ? p.challenges.reduce((sum, c) => sum + (c.complete ? c.points : 0), 0) : 0;
      return total + decisions + (p.sealed ? SEAL_POINTS : 0);
    }, 0);
  }

  const maxPoints = (m) => (m.type === 'analysis' ? m.challenges.length * 30 : 0) + SEAL_POINTS;

  // ---------- Leaderboard ----------

  function loadLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; }
  }

  function recordLeaderboard() {
    if (state.leaderboardRecorded || sealCount() < MISSIONS.length) return;
    const board = loadLeaderboard();
    board.push({ alias: state.alias, score: computeScore(), badges: sealCount(), finishedAt: new Date().toISOString() });
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
      state.leaderboardRecorded = true;
      saveState();
    } catch {
      showToast('Peringkat tidak dapat disimpan di perangkat ini.');
    }
  }

  const sortedLeaderboard = () => loadLeaderboard().slice().sort((a, b) => b.score - a.score || a.finishedAt.localeCompare(b.finishedAt));

  // ---------- Utilities ----------

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function parseNumber(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim().replace(',', '.');
    if (text === '') return null;
    const n = Number(text);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const formatNumber = (n) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });

  function titleHtml(m) { return `${escapeHtml(m.title)} <em>${escapeHtml(m.titleEm)}.</em>`; }

  // ---------- Navigation ----------

  function goTo(screen, persist = true) {
    if (!screens.includes(screen)) return;
    if (!state.alias) return;
    if ((screen === 'mission' || screen === 'kitchen') && !isUnlocked(state.activePos)) {
      showToast(lockMessage(state.activePos));
      screen = 'map';
    }
    if (screen === 'mission' && missionById(state.activePos).type === 'project') screen = 'kitchen';
    if (screen === 'kitchen' && missionById(state.activePos).type !== 'project') screen = 'mission';
    if (persist) {
      state.currentScreen = screen;
      saveState();
    }
    screens.forEach((name) => { $(`#screen-${name}`).hidden = name !== screen; });
    const navTarget = ['mission', 'kitchen'].includes(screen) ? (lastHub || 'map') : screen;
    if (screen === 'map' || screen === 'world') lastHub = screen;
    $$('.nav-link').forEach((button) => {
      const active = button.dataset.screen === navTarget;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    if (screen === 'map') renderMap();
    if (screen === 'mission') startMission();
    if (screen === 'kitchen') startKitchen();
    if (screen === 'passport') renderPassport();
    if (screen === 'leaderboard') renderLeaderboard();
    if (screen === 'report') renderReport();
    updatePlayerChip();
    document.dispatchEvent(new CustomEvent('nutra:screen', { detail: screen }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openPos(id) {
    if (!isUnlocked(id)) {
      showToast(lockMessage(id));
      return;
    }
    state.activePos = id;
    goTo(missionById(id).type === 'project' ? 'kitchen' : 'mission');
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-screen]');
    if (target) goTo(target.dataset.screen === 'map' && target.classList.contains('back-button') ? lastHub : target.dataset.screen);
  });

  function updatePlayerChip() {
    $('#player-chip').hidden = !state.alias;
    $('#player-name').textContent = state.alias || '';
    $('#player-score').textContent = state.alias ? `${computeScore()} POIN · ${sealCount()}/6` : '';
    const aliasInput = $('#alias');
    if (aliasInput) aliasInput.value = state.alias || '';
    const chip = $('#player-chip');
    const online = Boolean(net && net.online);
    chip.dataset.online = String(online);
    chip.title = online ? 'Tersambung ke server kelas' : 'Mode satu pemain (tidak tersambung ke server kelas)';
    const privacy = $('.privacy-note');
    if (privacy) privacy.lastChild.textContent = net && net.status().connected ? ' Progres tersimpan di perangkat ini dan di server kelas guru. Jangan gunakan nama lengkap.' : ' Progres tersimpan di perangkat ini. Jangan gunakan nama lengkap.';
  }

  /** Mulai sesi permainan untuk akun (atau tamu luring). Dipanggil oleh app.js setelah masuk. */
  function begin(username) {
    userKey = String(username).toLocaleLowerCase('id');
    state = loadState();
    state.alias = username;
    selectedPos = null;
    saveState();
    updatePlayerChip();
  }

  function end() {
    userKey = '';
    state = freshState();
    selectedPos = null;
  }

  // ---------- Server kelas (multipemain) ----------

  const visibleScreen = () => screens.find((name) => !$(`#screen-${name}`).hidden) || 'none';
  const hasLocalProgress = () => MISSIONS.some((m) => post(m.id).started);

  function adoptProgress(progress, alias) {
    const screen = visibleScreen();
    state = normalizeState(progress);
    state.alias = alias;
    state.currentScreen = screen;
  }

  if (net) {
    net.on('welcome', ({ progress, you }) => {
      if (!state.alias || state.alias.toLocaleLowerCase('id') !== you.alias.toLocaleLowerCase('id')) begin(you.alias);
      // Pakai progres yang paling baru: server (perangkat lain) atau perangkat ini.
      if (progress && (!hasLocalProgress() || String(progress.updatedAt || '') > String(state.updatedAt || ''))) adoptProgress(progress, you.alias);
      saveState();
      updatePlayerChip();
    });

    net.on('join-error', (err) => { showToast(err.message); });

    net.on('progress-sync', (msg) => {
      adoptProgress(msg.progress, state.alias);
      saveState();
      if (!document.body.classList.contains('in-world')) goTo(visibleScreen(), false);
      showToast(msg.message);
    });

    net.on('reset', (msg) => {
      const alias = state.alias;
      state = freshState();
      state.alias = alias;
      selectedPos = null;
      saveState();
      goTo('world');
      showToast(msg.message);
    });

    net.on('settings', () => {
      const screen = visibleScreen();
      if ((screen === 'mission' || screen === 'kitchen') && !isUnlocked(state.activePos)) {
        showToast(lockMessage(state.activePos));
        goTo(lastHub);
      } else if (screen === 'map') renderMap();
    });

    net.on('leaderboard', () => { if (visibleScreen() === 'leaderboard') renderLeaderboard(); });
    net.on('status', updatePlayerChip);
    net.on('notice', showToast);
  }

  // ---------- Map ----------

  function posStatus(id) {
    if (post(id).sealed) return 'done';
    return isUnlocked(id) ? 'ready' : 'locked';
  }

  const STATUS_TEXT = { done: 'Selesai', ready: 'Siap dimasuki', locked: 'Terkunci' };

  function defaultSelectedPos() {
    const next = MISSIONS.find((m) => !post(m.id).sealed && isUnlocked(m.id));
    return next ? next.id : MISSIONS[MISSIONS.length - 1].id;
  }

  function renderMap() {
    if (!selectedPos) selectedPos = defaultSelectedPos();
    const seals = sealCount();
    $('#map-progress').innerHTML = `${seals} / ${MISSIONS.length} <small>segel</small>`;
    $('#map-progress-bar').style.width = `${Math.min(100, (seals / MISSIONS.length) * 100)}%`;

    $('#map-nodes').innerHTML = MISSIONS.map((m, i) => {
      const status = posStatus(m.id);
      const mark = status === 'done' ? '✓' : status === 'locked' ? '⌑' : pad(m.id);
      const classes = ['map-node', NODE_CLASSES[i], status === 'locked' ? 'locked' : '', status === 'done' ? 'completed' : '', m.id === selectedPos ? 'selected' : ''].join(' ');
      return `<button type="button" class="${classes}" data-node="${m.id}" aria-pressed="${m.id === selectedPos}" aria-label="Pos ${pad(m.id)} ${escapeHtml(m.mapLabel)}, ${STATUS_TEXT[status]}">${status === 'ready' ? '<span class="node-pulse"></span>' : ''}<b>${mark}</b><small>${escapeHtml(m.mapLabel)}</small></button>`;
    }).join('');
    renderMissionCard();
  }

  function renderMissionCard() {
    const m = missionById(selectedPos);
    const status = posStatus(m.id);
    const statusLabel = { done: 'SELESAI', ready: 'SIAP DIMASUKI', locked: 'TERKUNCI' }[status];
    const statusIcon = { done: '✓ ', ready: '', locked: '⌑ ' }[status];
    $('#card-status').innerHTML = `<i></i> ${statusIcon}${statusLabel}`;
    $('#card-status').dataset.status = status;
    $('#card-number').textContent = `MISI ${pad(m.id)}`;
    $('#card-icon').textContent = m.icon;
    $('#card-kicker').textContent = m.location;
    $('#card-title').innerHTML = `${escapeHtml(m.title)}<br />${escapeHtml(m.titleEm)}`;
    $('#card-description').textContent = m.description;
    $('#card-duration').innerHTML = `◷ &nbsp;${escapeHtml(m.duration)}`;
    $('#card-points').innerHTML = `✦ &nbsp;${maxPoints(m)} POIN`;
    const button = $('#enter-mission');
    button.disabled = status === 'locked';
    button.innerHTML = status === 'locked' ? 'Terkunci <span aria-hidden="true">⌑</span>' : status === 'done' ? 'Tinjau pos <span aria-hidden="true">↗</span>' : 'Masuki pos <span aria-hidden="true">↗</span>';
    let note;
    if (status === 'locked') note = sequenceOpen(m.id) ? '⌑ Pos ini sedang ditutup oleh guru' : `⌑ Terbuka setelah Pos ${m.id - 1} disegel`;
    else if (status === 'done') note = '✓ Segel aktif · lencana diperoleh';
    else if (m.id < MISSIONS.length) note = `⌑ Pos ${m.id + 1} terbuka setelah pos ini disegel`;
    else note = '✦ Segel terakhir menyelesaikan ekspedisi';
    $('#card-note').textContent = note;
  }

  $('#map-nodes').addEventListener('click', (event) => {
    const node = event.target.closest('[data-node]');
    if (!node) return;
    const id = Number(node.dataset.node);
    if (!isUnlocked(id)) showToast(lockMessage(id));
    selectedPos = id;
    renderMap();
    const again = $(`[data-node="${id}"]`);
    if (again) again.focus();
  });

  $('#enter-mission').addEventListener('click', () => openPos(selectedPos));

  // ---------- Analysis missions (Pos 1–5) ----------

  function startMission() {
    const m = missionById(state.activePos);
    const p = post(m.id);
    if (!p.started) { p.started = true; saveState(); }
    $('#mission-breadcrumb').innerHTML = `POS ${pad(m.id)} <span>/</span> ${escapeHtml(m.location)}`;
    $('#mission-title').innerHTML = titleHtml(m);
    renderStimulus(m);
    const firstOpen = p.challenges.findIndex((c) => !c.complete);
    challengeView = firstOpen === -1 ? m.challenges.length : firstOpen;
    if (p.sealed) showToast(`Pos ${m.id} sudah disegel. Kamu dapat meninjau kembali catatanmu.`);
    renderMissionView();
  }

  function renderStimulus(m) {
    const s = m.stimulus;
    const head = `<div class="table-row table-head" role="row">${s.columns.map((c) => `<span role="columnheader">${escapeHtml(c)}</span>`).join('')}</div>`;
    const rows = s.rows.map((row) => `<div class="table-row" role="row"><span role="cell">${escapeHtml(row.label)}</span>${row.values.map(([value, unit], i) => `<strong role="cell"${(row.highlight || []).includes(i) ? ' class="highlight-cell"' : ''}>${escapeHtml(value)}${unit ? ` <small>${escapeHtml(unit)}</small>` : ''}</strong>`).join('')}</div>`).join('');
    $('#stimulus-panel').innerHTML = `<div class="panel-heading"><span>${escapeHtml(s.title)} <b>SIMULASI</b></span><span class="panel-id">${escapeHtml(s.ref)}</span></div><p class="panel-subtitle">Data berikut dibuat untuk tantangan permainan, bukan rekomendasi gizi.</p><div class="menu-table" role="table" aria-label="${escapeHtml(s.title)} (data simulasi)">${head}${rows}</div><div class="evidence-insight"><span>↗</span><p>${escapeHtml(s.insight)}</p></div>`;
  }

  function renderMissionView() {
    const m = missionById(state.activePos);
    const p = post(m.id);
    const total = m.challenges.length;
    const step = Math.min(challengeView, total) + 1;
    $('#step-count').innerHTML = `${pad(step)} <i>/ ${pad(total + 1)}</i>`;
    $('#challenge-counter').textContent = challengeView < total ? `${pad(challengeView + 1)} / ${pad(total)}` : 'PASPOR';
    $('#nara-message').textContent = challengeView === 0 ? m.nara.intro : challengeView === 1 ? m.nara.afterOne : m.nara.afterTwo;

    const entry = $('#passport-entry');
    if (challengeView >= total) {
      $('#challenge-area').innerHTML = '';
      entry.hidden = false;
      $('#reason-label').textContent = m.passport.prompt;
      const reason = $('#reason');
      reason.placeholder = m.passport.placeholder;
      reason.value = p.reason;
      reason.readOnly = p.sealed;
      const seal = $('#seal-mission');
      seal.disabled = p.sealed;
      seal.innerHTML = p.sealed ? 'Pos sudah tersegel <span aria-hidden="true">✓</span>' : 'Simpan &amp; segel pos <span aria-hidden="true">✦</span>';
      return;
    }
    entry.hidden = true;
    renderChallenge(m, challengeView);
  }

  function renderChallenge(m, index) {
    const def = m.challenges[index];
    const c = post(m.id).challenges[index];
    const done = c.complete;
    const disabled = done ? ' disabled' : '';
    let body = '';

    if (def.type === 'single' || def.type === 'multi') {
      const inputType = def.type === 'single' ? 'radio' : 'checkbox';
      const selected = def.type === 'single' ? [c.draft ?? c.response].filter(Boolean) : (c.draft ?? c.response ?? []);
      body = `<fieldset class="choice-list"><legend class="sr-only">${def.type === 'single' ? 'Pilih satu jawaban' : 'Pilih semua yang sesuai'}</legend>${def.options.map((o, i) => `<label class="choice-card${markClass(def, o.value, selected, done)}"><input type="${inputType}" name="answer" value="${escapeHtml(o.value)}"${selected.includes(o.value) ? ' checked' : ''}${disabled} /><span class="choice-marker">${def.type === 'single' ? String.fromCharCode(65 + i) : '✓'}</span><span>${escapeHtml(o.text)}</span></label>`).join('')}</fieldset>`;
      if (def.type === 'multi') body = `<p class="field-hint">Boleh memilih lebih dari satu.</p>${body}`;
    }

    if (def.type === 'order') {
      const order = currentOrder(def, c);
      body = `<p class="field-hint">Gunakan tombol ↑ dan ↓ (atau Tab lalu Enter) untuk memindahkan kartu.</p><ol class="order-list">${order.map((value, i) => {
        const item = def.items.find((it) => it.value === value);
        return `<li class="order-item"><span class="choice-marker">${i + 1}</span><span class="order-text">${escapeHtml(item.text)}</span><span class="order-buttons"><button type="button" class="icon-button" data-move="up" data-value="${escapeHtml(value)}" aria-label="Naikkan: ${escapeHtml(item.text)}"${i === 0 || done ? ' disabled' : ''}>↑</button><button type="button" class="icon-button" data-move="down" data-value="${escapeHtml(value)}" aria-label="Turunkan: ${escapeHtml(item.text)}"${i === order.length - 1 || done ? ' disabled' : ''}>↓</button></span></li>`;
      }).join('')}</ol>`;
    }

    if (def.type === 'sort') {
      const chosen = c.draft ?? c.response ?? {};
      body = `<div class="sort-list">${def.items.map((item, i) => `<div class="sort-item"><label for="sort-${i}">${escapeHtml(item.text)}</label><select id="sort-${i}" data-item="${escapeHtml(item.value)}"${disabled}><option value="">Pilih kelompok…</option>${def.categories.map((cat) => `<option value="${escapeHtml(cat.value)}"${chosen[item.value] === cat.value ? ' selected' : ''}>${escapeHtml(cat.text)}</option>`).join('')}</select></div>`).join('')}</div>`;
    }

    const action = done
      ? `<button class="button button-primary full-width" type="button" id="challenge-next">${index + 1 < m.challenges.length ? 'Lanjut ke tantangan berikutnya' : 'Lanjut ke Paspor'} <span aria-hidden="true">↗</span></button>`
      : `<button class="button button-primary full-width" type="submit">Kirim keputusan <span aria-hidden="true">↗</span></button>`;
    const feedback = done
      ? (isRight(c)
        ? `<div class="feedback success" role="status" aria-live="polite">✓ ${escapeHtml(def.success)} <b>+${c.points} poin</b></div>`
        : `<div class="feedback wrong" role="status" aria-live="polite"><b>Belum tepat — tidak apa-apa, lanjutkan!</b> Jawaban yang tepat: <i>${escapeHtml(responseText(def, def.correct))}</i>. ${escapeHtml(explanation(def))} <b>0 poin</b></div>`)
      : '<div class="feedback" id="challenge-feedback" role="status" aria-live="polite" hidden></div>';

    $('#challenge-area').innerHTML = `<div class="challenge"><p class="challenge-label">TANTANGAN ${pad(index + 1)} <span>· ${escapeHtml(def.label)}</span></p><h2>${escapeHtml(def.question)}</h2><form id="challenge-form" novalidate>${body}${action}</form>${feedback}</div>`;
  }

  function currentOrder(def, c) {
    const source = c.draft ?? c.response;
    return Array.isArray(source) && source.length === def.items.length ? source : def.items.map((it) => it.value);
  }

  function readResponse(def, form) {
    if (def.type === 'single') {
      const checked = $('input[name="answer"]:checked', form);
      return checked ? checked.value : null;
    }
    if (def.type === 'multi') {
      const values = $$('input[name="answer"]:checked', form).map((input) => input.value);
      return values.length ? values : null;
    }
    if (def.type === 'order') return currentOrder(def, post(state.activePos).challenges[challengeView]);
    if (def.type === 'sort') {
      const map = {};
      $$('select[data-item]', form).forEach((select) => { map[select.dataset.item] = select.value; });
      return Object.values(map).every(Boolean) ? map : null;
    }
    return null;
  }

  function isCorrect(def, response) {
    if (def.type === 'single') return response === def.correct;
    if (def.type === 'multi') return response.length === def.correct.length && def.correct.every((v) => response.includes(v));
    if (def.type === 'order') return def.correct.every((v, i) => response[i] === v);
    if (def.type === 'sort') return Object.keys(def.correct).every((k) => response[k] === def.correct[k]);
    return false;
  }

  const EMPTY_PROMPT = { single: 'Pilih salah satu jawaban terlebih dahulu.', multi: 'Pilih minimal satu bukti terlebih dahulu.', sort: 'Kelompokkan semua pernyataan terlebih dahulu.' };

  $('#challenge-area').addEventListener('submit', (event) => {
    event.preventDefault();
    const m = missionById(state.activePos);
    const def = m.challenges[challengeView];
    const c = post(m.id).challenges[challengeView];
    if (!def || c.complete) return;
    const response = readResponse(def, event.target);
    if (!response) { showToast(EMPTY_PROMPT[def.type]); return; }
    const res = gradeChallenge(m, challengeView, response);
    saveState();
    renderChallenge(m, challengeView);
    $('#nara-message').textContent = res.correct ? (challengeView === 0 ? m.nara.afterOne : m.nara.afterTwo) : 'Tidak apa-apa! Baca penjelasannya, lalu lanjut ke tugas berikutnya.';
    updatePlayerChip();
    $('#challenge-next').focus();
  });

  $('#challenge-area').addEventListener('change', (event) => {
    const m = missionById(state.activePos);
    const def = m.challenges[challengeView];
    const c = post(m.id).challenges[challengeView];
    if (!def || c.complete || def.type === 'order') return;
    const form = $('#challenge-form');
    if (def.type === 'single') c.draft = readResponse(def, form);
    if (def.type === 'multi') c.draft = $$('input[name="answer"]:checked', form).map((input) => input.value);
    if (def.type === 'sort') { c.draft = {}; $$('select[data-item]', form).forEach((s) => { c.draft[s.dataset.item] = s.value; }); }
    saveState();
  });

  $('#challenge-area').addEventListener('click', (event) => {
    if (event.target.closest('#challenge-next')) {
      challengeView += 1;
      renderMissionView();
      const focusTarget = challengeView >= missionById(state.activePos).challenges.length ? $('#reason') : $('#challenge-area h2');
      if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus(); }
      return;
    }
    const move = event.target.closest('[data-move]');
    if (!move) return;
    const m = missionById(state.activePos);
    const def = m.challenges[challengeView];
    const c = post(m.id).challenges[challengeView];
    const order = currentOrder(def, c).slice();
    const from = order.indexOf(move.dataset.value);
    const to = move.dataset.move === 'up' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    c.draft = order;
    saveState();
    renderChallenge(m, challengeView);
    const direction = move.dataset.move;
    const refocus = $(`[data-move="${direction}"][data-value="${CSS.escape(move.dataset.value)}"]`);
    (refocus && !refocus.disabled ? refocus : $(`[data-value="${CSS.escape(move.dataset.value)}"]:not([disabled])`))?.focus();
  });

  $('#reason').addEventListener('input', (event) => {
    const p = post(state.activePos);
    if (p.sealed) return;
    p.reason = event.target.value;
    saveState();
  });

  $('#seal-mission').addEventListener('click', () => {
    const m = missionById(state.activePos);
    const p = post(m.id);
    if (p.sealed) return;
    if (!p.challenges.every((c) => c.complete)) { showToast('Selesaikan kedua tantangan sebelum menyegel pos.'); return; }
    const reason = $('#reason').value.trim();
    if (reason.length < MIN_REASON) { showToast(`Tulis alasanmu minimal ${MIN_REASON} karakter sebelum menyegel pos.`); $('#reason').focus(); return; }
    p.reason = reason;
    p.sealed = true;
    p.sealedAt = new Date().toISOString();
    saveState();
    selectedPos = null;
    showToast(`Pos ${m.id} tersegel! +${SEAL_POINTS} poin dan satu lencana. ${m.id < MISSIONS.length ? `Portal Pos ${m.id + 1} terbuka.` : ''}`);
    goTo(lastHub);
  });

  // ---------- Dapur Juara (Pos 6) ----------

  const projectMission = () => MISSIONS.find((m) => m.type === 'project');
  const project = () => post(projectMission().id);

  function startKitchen() {
    const p = project();
    if (!p.started) { p.started = true; saveState(); }
    renderReviewChecks();
    showKitchenStep(p.step);
    if (p.sealed) showToast('Dapur Juara sudah disegel. Kamu dapat meninjau kembali rancanganmu.');
  }

  function showKitchenStep(stepId) {
    const p = project();
    const index = PROJECT_STEPS.findIndex((s) => s.id === stepId);
    if (index < 0 || index > p.reached) return;
    p.step = stepId;
    saveState();
    $('#kitchen-step-count').innerHTML = `${pad(index + 1)} <i>/ ${pad(PROJECT_STEPS.length)}</i>`;
    $('#kitchen-nara').textContent = projectMission().nara[stepId];
    $('#kitchen-steps').innerHTML = PROJECT_STEPS.map((s, i) => {
      const st = i < p.reached || p.sealed ? 'done' : i === p.reached ? 'ready' : 'locked';
      const mark = st === 'done' ? '✓' : st === 'locked' ? '⌑' : pad(i + 1);
      return `<button type="button" class="kitchen-step ${st}${s.id === stepId ? ' current' : ''}" data-goto-step="${s.id}"${st === 'locked' ? ' disabled' : ''}${s.id === stepId ? ' aria-current="step"' : ''}><b>${mark}</b> ${escapeHtml(s.label)}<span class="sr-only">, ${st === 'done' ? 'selesai' : st === 'locked' ? 'terkunci' : 'sedang dikerjakan'}</span></button>`;
    }).join('');
    $$('.kitchen-panel').forEach((panel) => { panel.hidden = panel.dataset.step !== stepId; });
    if (stepId === 'initial') renderDraftEditor('initial');
    if (stepId === 'review') renderReview();
    if (stepId === 'revision') renderDraftEditor('revision');
    if (stepId === 'reflection') renderReflection();
    $$('#screen-kitchen input, #screen-kitchen textarea, #screen-kitchen select, #screen-kitchen [data-kitchen-action]').forEach((el) => { el.disabled = p.sealed; });
    $('#seal-kitchen').disabled = p.sealed;
    if (p.sealed) $('#seal-kitchen').innerHTML = 'Dapur Juara sudah tersegel <span aria-hidden="true">✓</span>';
  }

  function unlockStep(stepId) {
    const p = project();
    const index = PROJECT_STEPS.findIndex((s) => s.id === stepId);
    if (index > p.reached) p.reached = index;
    showKitchenStep(stepId);
    window.scrollTo({ top: $('#kitchen-steps').offsetTop - 20, behavior: 'smooth' });
  }

  $('#screen-kitchen').addEventListener('click', (event) => {
    const target = event.target.closest('[data-goto-step]');
    if (!target) return;
    const stepId = target.dataset.gotoStep;
    const p = project();
    if (stepId === 'initial' && p.reached < 1) { unlockStep('initial'); return; }
    showKitchenStep(stepId);
  });

  function computeTotals(draft) {
    const totals = {};
    const rows = draft.ingredients.filter((ing) => ing.name.trim());
    NUTRIENTS.forEach(({ key }) => {
      let value = 0;
      let missing = 0;
      rows.forEach((ing) => {
        const grams = parseNumber(ing.grams);
        const per100 = parseNumber(ing[key]);
        if (grams === null || per100 === null) missing += 1;
        else value += (per100 * grams) / 100;
      });
      totals[key] = { value: Math.round(value * 10) / 10, missing };
    });
    totals.weight = Math.round(rows.reduce((sum, ing) => sum + (parseNumber(ing.grams) || 0), 0) * 10) / 10;
    totals.ingredients = rows.length;
    return totals;
  }

  function contribution(ing, key) {
    const grams = parseNumber(ing.grams);
    const per100 = parseNumber(ing[key]);
    return grams === null || per100 === null ? null : (per100 * grams) / 100;
  }

  const draftFor = (kind) => (kind === 'initial' ? project().initial : project().revision);

  function renderDraftEditor(kind) {
    const p = project();
    if (kind === 'revision' && !p.revision) {
      p.revision = JSON.parse(JSON.stringify(p.initial));
      p.revision.changeReason = '';
      p.revision.savedAt = null;
      saveState();
    }
    const d = draftFor(kind);
    const panel = $(`.kitchen-panel[data-step="${kind}"]`);
    const isRevision = kind === 'revision';
    const field = (name, label, opts = {}) => `<label class="field-label" for="${kind}-${name}">${label}${opts.note ? ` <span class="optional">(${opts.note})</span>` : ''}</label>${opts.textarea ? `<textarea id="${kind}-${name}" data-draft-field="${name}" rows="${opts.rows || 3}" maxlength="${opts.max || 600}" placeholder="${escapeHtml(opts.placeholder || '')}">${escapeHtml(d[name])}</textarea>` : `<input class="text-input" id="${kind}-${name}" data-draft-field="${name}" maxlength="${opts.max || 80}" autocomplete="off" placeholder="${escapeHtml(opts.placeholder || '')}" value="${escapeHtml(d[name])}" />`}`;

    panel.innerHTML = `
      <div class="panel-heading"><span>${isRevision ? 'RANCANGAN REVISI · VERSI 2' : 'RANCANGAN AWAL · VERSI 1'}</span><span class="panel-id">06 / ${isRevision ? 'REVISI' : 'AWAL'}</span></div>
      ${isRevision ? `<div class="review-recap"><span>MASUKAN TELAAH</span><p>${escapeHtml(p.review.notes) || '—'}</p></div>` : ''}
      <div class="form-grid">
        <div>${field('menuName', 'Nama menu', { placeholder: 'Contoh: Nasi jagung tempe sayur bening' })}</div>
        <div>${field('mealTime', 'Waktu makan', { placeholder: 'Contoh: Makan siang di sekolah' })}</div>
      </div>
      ${field('target', 'Sasaran', { placeholder: 'Contoh: Siswa SMA kelas XI dengan jadwal olahraga sore', max: 160 })}
      <p class="field-label">Bahan dan perkiraan gizi per porsi</p>
      <p class="field-hint">Isi nilai gizi per 100 g dari TKPI atau label pangan. Kontribusi = nilai per 100 g × berat (g) ÷ 100. Kosongkan nilai yang tidak tersedia.</p>
      <div class="table-scroll"><table class="ingredient-table">
        <thead><tr><th scope="col">Bahan</th><th scope="col">Bentuk</th><th scope="col">Berat (g)</th><th scope="col">Energi /100 g (kkal)</th><th scope="col">Protein /100 g (g)</th><th scope="col">Serat /100 g (g)</th><th scope="col">Sumber data</th><th scope="col">Kontribusi per porsi</th><th scope="col"><span class="sr-only">Hapus</span></th></tr></thead>
        <tbody>${d.ingredients.map((ing, i) => ingredientRow(kind, ing, i)).join('')}</tbody>
        <tfoot><tr><th scope="row" colspan="7">Perkiraan total per porsi</th><td colspan="2" id="${kind}-totals"></td></tr></tfoot>
      </table></div>
      <button type="button" class="button button-secondary" data-kitchen-action="add-row" data-kind="${kind}">+ Tambah bahan</button>
      ${field('missingNote', 'Data yang belum tersedia dan dampaknya pada simpulan', { textarea: true, rows: 2, note: 'wajib jika ada nilai kosong', placeholder: 'Contoh: Protein sayur belum tersedia, jadi total protein lebih rendah dari sebenarnya.' })}
      ${field('rationale', 'Alasan pemilihan bahan dan porsi', { textarea: true, rows: 4, placeholder: 'Gunakan bukti dari Pos 1–5, misalnya komposisi protein dan serat…' })}
      ${isRevision ? field('changeReason', 'Apa yang kamu ubah dan mengapa?', { textarea: true, rows: 3, placeholder: 'Contoh: Berdasarkan telaah, saya menambah 50 g sayur karena…' }) : ''}
      <div class="feedback" id="${kind}-feedback" role="status" aria-live="polite" hidden></div>
      <button type="button" class="button button-primary" data-kitchen-action="save-draft" data-kind="${kind}">${isRevision ? 'Simpan revisi &amp; lanjut refleksi' : 'Simpan rancangan awal &amp; lanjut telaah'} <span aria-hidden="true">↗</span></button>`;
    updateTotals(kind);
  }

  function ingredientRow(kind, ing, i) {
    const input = (key, label, attrs = '') => `<input class="cell-input" data-ing="${i}" data-key="${key}" aria-label="${label} bahan ${i + 1}" value="${escapeHtml(ing[key])}" ${attrs} />`;
    return `<tr data-row="${i}">
      <td>${input('name', 'Nama', 'maxlength="40" placeholder="Tempe"')}</td>
      <td><select class="cell-input" data-ing="${i}" data-key="form" aria-label="Bentuk bahan ${i + 1}"><option value="mentah"${ing.form === 'mentah' ? ' selected' : ''}>Mentah</option><option value="olahan"${ing.form === 'olahan' ? ' selected' : ''}>Olahan</option></select></td>
      <td>${input('grams', 'Berat gram', 'inputmode="decimal" maxlength="6"')}</td>
      <td>${input('energy', 'Energi per 100 gram', 'inputmode="decimal" maxlength="6"')}</td>
      <td>${input('protein', 'Protein per 100 gram', 'inputmode="decimal" maxlength="6"')}</td>
      <td>${input('fiber', 'Serat per 100 gram', 'inputmode="decimal" maxlength="6"')}</td>
      <td>${input('source', 'Sumber data', 'maxlength="60" placeholder="TKPI / label"')}</td>
      <td class="contribution" id="${kind}-contrib-${i}"></td>
      <td><button type="button" class="icon-button" data-kitchen-action="remove-row" data-kind="${kind}" data-row="${i}" aria-label="Hapus bahan ${i + 1}">×</button></td>
    </tr>`;
  }

  function nutrientText(value, unit, missing) {
    return value === null ? '<span class="missing">belum tersedia</span>' : `${formatNumber(value)} ${unit}${missing ? ' <span class="missing">*</span>' : ''}`;
  }

  function updateTotals(kind) {
    const d = draftFor(kind);
    d.ingredients.forEach((ing, i) => {
      const cell = $(`#${kind}-contrib-${i}`);
      if (!cell) return;
      cell.innerHTML = ing.name.trim() ? NUTRIENTS.map((n) => `<span>${n.label.charAt(0)}: ${nutrientText(contribution(ing, n.key), n.unit)}</span>`).join('') : '—';
    });
    const t = computeTotals(d);
    const anyMissing = NUTRIENTS.some((n) => t[n.key].missing);
    $(`#${kind}-totals`).innerHTML = `${NUTRIENTS.map((n) => `<span>${n.label}: ${nutrientText(t[n.key].value, n.unit, t[n.key].missing)}</span>`).join('')}<span>Berat: ${formatNumber(t.weight)} g</span>${anyMissing ? '<span class="missing">* sebagian data belum tersedia</span>' : ''}`;
  }

  $('#screen-kitchen').addEventListener('input', (event) => {
    const p = project();
    if (p.sealed) return;
    const el = event.target;
    const panel = el.closest('.kitchen-panel');
    const kind = panel && panel.dataset.step;
    if ((kind === 'initial' || kind === 'revision') && draftFor(kind)) {
      const d = draftFor(kind);
      if (el.dataset.draftField) d[el.dataset.draftField] = el.value;
      if (el.dataset.ing !== undefined) { d.ingredients[Number(el.dataset.ing)][el.dataset.key] = el.value; updateTotals(kind); }
    }
    if (el.id === 'review-reviewer') p.review.reviewer = el.value;
    if (el.id === 'review-notes') p.review.notes = el.value;
    if (el.id === 'reflection-learned') p.reflection.learned = el.value;
    if (el.id === 'reflection-contribution') p.reflection.contribution = el.value;
    if (el.name === 'review-check') p.review.checks = $$('input[name="review-check"]:checked').map((input) => input.value);
    saveState();
  });

  $('#screen-kitchen').addEventListener('change', (event) => {
    if (event.target.tagName === 'SELECT' || event.target.type === 'checkbox') event.target.dispatchEvent(new Event('input', { bubbles: true }));
  });

  $('#screen-kitchen').addEventListener('click', (event) => {
    const action = event.target.closest('[data-kitchen-action]');
    if (!action || project().sealed) return;
    const kind = action.dataset.kind;
    const d = draftFor(kind);
    if (action.dataset.kitchenAction === 'add-row') {
      if (d.ingredients.length >= 12) { showToast('Maksimal 12 bahan per porsi.'); return; }
      d.ingredients.push(emptyIngredient());
      saveState();
      renderDraftEditor(kind);
      $(`[data-ing="${d.ingredients.length - 1}"][data-key="name"]`).focus();
    }
    if (action.dataset.kitchenAction === 'remove-row') {
      d.ingredients.splice(Number(action.dataset.row), 1);
      if (!d.ingredients.length) d.ingredients.push(emptyIngredient());
      saveState();
      renderDraftEditor(kind);
    }
    if (action.dataset.kitchenAction === 'save-draft') saveDraft(kind);
  });

  function validateDraft(d, kind) {
    const problems = [];
    if (!d.menuName.trim()) problems.push('nama menu');
    if (!d.target.trim()) problems.push('sasaran');
    if (!d.mealTime.trim()) problems.push('waktu makan');
    const rows = d.ingredients.filter((ing) => ing.name.trim());
    if (!rows.length) problems.push('minimal satu bahan');
    rows.forEach((ing) => {
      if (!(parseNumber(ing.grams) > 0)) problems.push(`berat ${ing.name.trim()}`);
      if (!ing.source.trim()) problems.push(`sumber data ${ing.name.trim()}`);
    });
    const t = computeTotals(d);
    if (NUTRIENTS.some((n) => t[n.key].missing) && d.missingNote.trim().length < 10) problems.push('penjelasan data yang belum tersedia');
    if (d.rationale.trim().length < MIN_REASON) problems.push(`alasan (minimal ${MIN_REASON} karakter)`);
    if (kind === 'revision' && d.changeReason.trim().length < MIN_REASON) problems.push(`alasan perubahan (minimal ${MIN_REASON} karakter)`);
    return problems;
  }

  function saveDraft(kind) {
    const d = draftFor(kind);
    const problems = validateDraft(d, kind);
    const feedback = $(`#${kind}-feedback`);
    if (problems.length) {
      feedback.hidden = false;
      feedback.className = 'feedback';
      feedback.innerHTML = `<b>Lengkapi dulu:</b> ${escapeHtml(problems.join(', '))}.`;
      feedback.focus?.();
      return;
    }
    d.savedAt = new Date().toISOString();
    saveState();
    showToast(kind === 'initial' ? 'Rancangan awal tersimpan sebagai versi 1.' : 'Revisi tersimpan sebagai versi 2.');
    unlockStep(kind === 'initial' ? 'review' : 'reflection');
  }

  function draftSummary(d, label) {
    const t = computeTotals(d);
    return `<div class="draft-summary"><span>${escapeHtml(label)}</span><strong>${escapeHtml(d.menuName || '—')}</strong><p>${escapeHtml(d.target || '—')} · ${escapeHtml(d.mealTime || '—')}</p><ul>${d.ingredients.filter((ing) => ing.name.trim()).map((ing) => `<li>${escapeHtml(ing.name)} (${escapeHtml(ing.form)}), ${escapeHtml(ing.grams || '?')} g · ${escapeHtml(ing.source || 'sumber belum ditulis')}</li>`).join('')}</ul><p class="summary-totals">${NUTRIENTS.map((n) => `${n.label} ${nutrientText(t[n.key].value, n.unit, t[n.key].missing)}`).join(' · ')}</p></div>`;
  }

  function renderReviewChecks() {
    const p = project();
    const defs = projectMission().reviewChecks;
    $('#review-checks').innerHTML = `<legend class="field-label">Daftar periksa penelaah</legend>${defs.map((c) => `<label class="choice-card"><input type="checkbox" name="review-check" value="${escapeHtml(c.value)}"${p.review.checks.includes(c.value) ? ' checked' : ''} /><span class="choice-marker">✓</span><span>${escapeHtml(c.text)}</span></label>`).join('')}`;
  }

  function renderReview() {
    const p = project();
    $('#review-summary').innerHTML = draftSummary(p.initial, 'RANCANGAN AWAL · VERSI 1');
    renderReviewChecks();
    $('#review-reviewer').value = p.review.reviewer;
    $('#review-notes').value = p.review.notes;
  }

  $('#save-review').addEventListener('click', () => {
    const p = project();
    if (p.sealed) return;
    const feedback = $('#review-feedback');
    if (p.review.notes.trim().length < MIN_REASON) {
      feedback.hidden = false;
      feedback.className = 'feedback';
      feedback.innerHTML = `<b>Lengkapi dulu:</b> tulis masukan telaah minimal ${MIN_REASON} karakter. Bagian daftar periksa yang belum dicentang menjadi bahan revisi.`;
      return;
    }
    p.review.savedAt = new Date().toISOString();
    saveState();
    showToast('Telaah tersimpan. Gunakan masukan ini untuk merevisi rancangan.');
    unlockStep('revision');
  });

  function renderReflection() {
    const p = project();
    const t1 = computeTotals(p.initial);
    const t2 = p.revision ? computeTotals(p.revision) : null;
    const delta = (key) => {
      if (!t2) return '—';
      const diff = Math.round((t2[key].value - t1[key].value) * 10) / 10;
      return `${diff > 0 ? '+' : ''}${formatNumber(diff)}`;
    };
    $('#version-compare').innerHTML = `<div class="compare-grid">${draftSummary(p.initial, 'VERSI 1 · AWAL')}${p.revision ? draftSummary(p.revision, 'VERSI 2 · REVISI') : ''}</div><table class="compare-table"><caption class="sr-only">Perbandingan total gizi versi 1 dan versi 2</caption><thead><tr><th scope="col">Zat gizi</th><th scope="col">Versi 1</th><th scope="col">Versi 2</th><th scope="col">Selisih</th></tr></thead><tbody>${NUTRIENTS.map((n) => `<tr><th scope="row">${n.label}</th><td>${nutrientText(t1[n.key].value, n.unit, t1[n.key].missing)}</td><td>${t2 ? nutrientText(t2[n.key].value, n.unit, t2[n.key].missing) : '—'}</td><td>${delta(n.key)} ${n.unit}</td></tr>`).join('')}</tbody></table>`;
    $('#reflection-learned').value = p.reflection.learned;
    $('#reflection-contribution').value = p.reflection.contribution;
  }

  $('#seal-kitchen').addEventListener('click', () => {
    const p = project();
    if (p.sealed) return;
    const feedback = $('#reflection-feedback');
    const problems = [];
    if (!p.initial.savedAt) problems.push('rancangan awal');
    if (!p.review.savedAt) problems.push('telaah');
    if (!p.revision || !p.revision.savedAt) problems.push('revisi');
    if (p.reflection.learned.trim().length < MIN_REASON) problems.push(`hal yang dipelajari (minimal ${MIN_REASON} karakter)`);
    if (p.reflection.contribution.trim().length < 10) problems.push('kontribusimu (minimal 10 karakter)');
    if (problems.length) {
      feedback.hidden = false;
      feedback.className = 'feedback';
      feedback.innerHTML = `<b>Lengkapi dulu:</b> ${escapeHtml(problems.join(', '))}.`;
      return;
    }
    p.sealed = true;
    p.sealedAt = new Date().toISOString();
    saveState();
    recordLeaderboard();
    selectedPos = null;
    showToast(sealCount() === MISSIONS.length ? `Ekspedisi selesai! Skor akhir ${computeScore()} poin.` : `Dapur Juara tersegel! +${SEAL_POINTS} poin.`);
    goTo(sealCount() === MISSIONS.length ? 'report' : lastHub);
  });

  // ---------- Paspor ----------

  function responseText(def, response) {
    if (response === null || response === undefined) return '—';
    if (def.type === 'single') return (def.options.find((o) => o.value === response) || {}).text || '—';
    if (def.type === 'multi') return response.map((v) => (def.options.find((o) => o.value === v) || {}).text).filter(Boolean).join(' · ');
    if (def.type === 'order') return response.map((v, i) => `${i + 1}. ${(def.items.find((it) => it.value === v) || {}).text}`).join(' → ');
    if (def.type === 'sort') return def.items.map((it) => `${it.text} = ${(def.categories.find((c) => c.value === response[it.value]) || {}).text || '?'}`).join(' · ');
    return '—';
  }

  function statusOf(m) {
    const p = post(m.id);
    if (p.sealed) return 'TERSEGEL';
    if (p.started) return 'DALAM PROSES';
    return isUnlocked(m.id) ? 'BELUM DIMULAI' : 'TERKUNCI';
  }

  function renderPassport() {
    const seals = sealCount();
    $('#passport-alias').textContent = state.alias || '—';
    $('#passport-score').innerHTML = `${computeScore()} <small>POIN</small>`;
    $('#passport-seals').innerHTML = `${seals} <small>/ ${MISSIONS.length}</small>`;
    $('#passport-status').textContent = seals === MISSIONS.length ? 'Selesai' : MISSIONS.some((m) => post(m.id).started) ? 'Sedang berjalan' : 'Belum dimulai';

    $('#passport-records').innerHTML = MISSIONS.map((m) => {
      const p = post(m.id);
      const status = statusOf(m);
      const top = `<div class="record-top"><span>CATATAN MISI ${pad(m.id)}</span><span class="record-status" data-sealed="${p.sealed}">${p.sealed ? '✓ ' : ''}${status}</span></div><h2>${escapeHtml(m.title)} ${escapeHtml(m.titleEm)}</h2>`;
      if (!p.started) return `<article class="passport-record">${top}<p>${isUnlocked(m.id) ? 'Masuki pos ini dari peta untuk mulai mengumpulkan bukti.' : `Terbuka setelah Pos ${m.id - 1} disegel.`}</p></article>`;
      if (m.type === 'project') return `<article class="passport-record">${top}${projectRecord(p)}</article>`;
      const items = m.challenges.map((def, i) => {
        const c = p.challenges[i];
        return `<div><span>TANTANGAN ${pad(i + 1)} · ${escapeHtml(def.label)}</span><p>${c.complete ? escapeHtml(responseText(def, c.response)) : 'Belum selesai'}</p><p class="record-meta">${c.attempts} percobaan · ${c.complete ? c.points : 0} poin</p></div>`;
      }).join('');
      return `<article class="passport-record">${top}<div class="passport-answer-grid">${items}<div class="span-2"><span>ALASAN PENJELAJAH</span><p>${escapeHtml(p.reason) || '—'}</p></div></div></article>`;
    }).join('');
  }

  function projectRecord(p) {
    const parts = [];
    if (p.initial.savedAt) parts.push(draftSummary(p.initial, 'VERSI 1 · AWAL'));
    if (p.review.savedAt) parts.push(`<div class="draft-summary"><span>TELAAH${p.review.reviewer ? ` · ${escapeHtml(p.review.reviewer)}` : ''}</span><p>${escapeHtml(p.review.notes)}</p><p class="record-meta">${p.review.checks.length} / ${projectMission().reviewChecks.length} butir periksa terpenuhi</p></div>`);
    if (p.revision && p.revision.savedAt) parts.push(`${draftSummary(p.revision, 'VERSI 2 · REVISI')}<div class="draft-summary"><span>ALASAN PERUBAHAN</span><p>${escapeHtml(p.revision.changeReason)}</p></div>`);
    if (p.sealed) parts.push(`<div class="draft-summary"><span>REFLEKSI</span><p>${escapeHtml(p.reflection.learned)}</p><span>KONTRIBUSI</span><p>${escapeHtml(p.reflection.contribution)}</p></div>`);
    return parts.length ? `<div class="compare-grid">${parts.join('')}</div>` : '<p>Rancangan awal belum disimpan.</p>';
  }

  $('#export-passport').addEventListener('click', () => {
    const missions = {};
    MISSIONS.forEach((m) => {
      const p = post(m.id);
      if (m.type === 'project') {
        missions[m.id] = { id: m.id, title: `${m.title} ${m.titleEm}`, status: statusOf(m), ...JSON.parse(JSON.stringify(p)), totals: { initial: computeTotals(p.initial), revision: p.revision ? computeTotals(p.revision) : null } };
      } else {
        missions[m.id] = {
          id: m.id, title: `${m.title} ${m.titleEm}`, status: statusOf(m), sealed: p.sealed, sealedAt: p.sealedAt, reason: p.reason,
          challenges: m.challenges.map((def, i) => ({ label: def.label, type: def.type, complete: p.challenges[i].complete, correct: p.challenges[i].complete ? isRight(p.challenges[i]) : null, attempts: p.challenges[i].attempts, points: p.challenges[i].points, response: p.challenges[i].response, responseText: p.challenges[i].complete ? responseText(def, p.challenges[i].response) : null, log: p.challenges[i].log }))
        };
      }
    });
    const payload = { schemaVersion: SCHEMA_VERSION, game: 'NUTRANTARA', appVersion: APP_VERSION, exportedAt: new Date().toISOString(), alias: state.alias || null, score: computeScore(), seals: sealCount(), badges: MISSIONS.filter((m) => post(m.id).sealed).map((m) => `pos-${pad(m.id)}`), missions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nutrantara-paspor-${(state.alias || 'penjelajah').toLowerCase().replace(/[^a-z0-9-]+/g, '-')}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Paspor JSON berhasil diunduh. Simpan sebelum berganti perangkat.');
  });

  // ---------- Peringkat ----------

  function renderLeaderboard() {
    if (net && net.online) {
      const rows = net.leaderboard;
      const me = state.alias.toLocaleLowerCase('id');
      $('#leaderboard-list').innerHTML = rows.length
        ? `<table class="leaderboard-table"><caption class="sr-only">Papan peringkat kelas (langsung)</caption><thead><tr><th scope="col">#</th><th scope="col">Penjelajah</th><th scope="col">Skor</th><th scope="col">Lencana</th><th scope="col">Status</th></tr></thead><tbody>${rows.map((row, i) => { const mine = row.alias.toLocaleLowerCase('id') === me; return `<tr${mine ? ' class="me"' : ''}><td>${i + 1}</td><td>${escapeHtml(row.alias)}${mine ? ' <span class="you">(kamu)</span>' : ''}</td><td>${row.score}</td><td>${row.seals} / ${MISSIONS.length}</td><td>${row.finished ? '✓ Selesai' : row.online ? '● Daring' : '○ Luring'}</td></tr>`; }).join('')}</tbody></table>`
        : '<div class="passport-record"><p>Belum ada progres di kelas ini.</p></div>';
      return;
    }
    const board = sortedLeaderboard();
    if (!board.length) {
      $('#leaderboard-list').innerHTML = '<div class="passport-record"><p>Belum ada ekspedisi yang selesai di peramban ini. Segel keenam pos untuk masuk papan peringkat.</p></div>';
      return;
    }
    $('#leaderboard-list').innerHTML = `<table class="leaderboard-table"><caption class="sr-only">Papan peringkat lokal</caption><thead><tr><th scope="col">#</th><th scope="col">Penjelajah</th><th scope="col">Skor</th><th scope="col">Lencana</th><th scope="col">Selesai</th></tr></thead><tbody>${board.map((row, i) => `<tr${row.alias === state.alias ? ' class="me"' : ''}><td>${i + 1}</td><td>${escapeHtml(row.alias)}${row.alias === state.alias ? ' <span class="you">(kamu)</span>' : ''}</td><td>${row.score}</td><td>${row.badges} / ${MISSIONS.length}</td><td>${new Date(row.finishedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>`).join('')}</tbody></table>`;
  }

  // ---------- API misi di dalam dunia (dipakai quest.js) ----------

  function scanEvidence(id, row) {
    const p = post(id);
    if (!p || !p.challenges) return [];
    p.started = true;
    p.evidence = Array.from(new Set([...(p.evidence || []), row])).sort((a, b) => a - b);
    state.activePos = id;
    saveState();
    return p.evidence;
  }

  function submitAnswer(id, index, response) {
    const m = missionById(id);
    const def = m && m.challenges && m.challenges[index];
    const c = def && post(id).challenges[index];
    if (!def) return { error: true };
    if (c.complete) return { correct: isRight(c), points: c.points, attempts: c.attempts, success: def.success, explanation: explanation(def), correctText: responseText(def, def.correct), already: true };
    const empty = response === null || response === undefined || (Array.isArray(response) && !response.length) || (def.type === 'sort' && !Object.values(response || {}).every(Boolean));
    if (empty) return { empty: true, message: EMPTY_PROMPT[def.type] || 'Lengkapi jawabanmu terlebih dahulu.' };
    const res = gradeChallenge(m, index, response);
    state.activePos = id;
    saveState();
    updatePlayerChip();
    return res;
  }

  // ---------- Penilaian & evaluasi ----------

  const SKILLS = {
    1: 'Membandingkan data komposisi menu secara adil',
    2: 'Menyusun jalur pencernaan protein dan mengenali gangguannya',
    3: 'Membedakan pencernaan (pemecahan) dan penyerapan (perpindahan)',
    4: 'Menalar sebab-akibat dan memilih data pendukung',
    5: 'Memilah data, kesimpulan, dan asumsi untuk mengaudit klaim',
    6: 'Merancang, menelaah, dan merevisi menu lokal berbasis bukti'
  };

  function predikat(pct) {
    if (pct >= 90) return { grade: 'A', label: 'Sangat Baik', note: 'Luar biasa! Kamu konsisten memakai bukti untuk mengambil keputusan.' };
    if (pct >= 75) return { grade: 'B', label: 'Baik', note: 'Bagus! Sebagian besar keputusanmu sudah didukung bukti.' };
    if (pct >= 60) return { grade: 'C', label: 'Cukup', note: 'Sudah ada kemajuan. Ulangi pos yang masih kurang agar makin mantap.' };
    return { grade: 'D', label: 'Perlu Bimbingan', note: 'Tidak apa-apa! Pelajari kembali penjelasan Nara dan diskusikan dengan guru.' };
  }

  function evaluatePost(id) {
    const m = missionById(id);
    const p = post(id);
    if (m.type === 'project') {
      const init = p.initial || {};
      const rows = (init.ingredients || []).filter((x) => String(x.name || '').trim());
      const checks = [
        { ok: Boolean(init.savedAt), text: 'Rancangan awal disimpan (sasaran, waktu makan, bahan, porsi)' },
        { ok: rows.length > 0 && rows.every((x) => String(x.source || '').trim()), text: 'Setiap bahan punya sumber data' },
        { ok: Boolean(p.review && p.review.savedAt), text: 'Rancangan ditelaah teman/guru' },
        { ok: Boolean(p.revision && p.revision.savedAt), text: 'Rancangan direvisi berdasarkan masukan' },
        { ok: String((p.reflection && p.reflection.learned) || '').trim().length >= MIN_REASON, text: 'Refleksi individual ditulis' }
      ];
      const done = checks.filter((x) => x.ok).length;
      return { id, title: `${m.title} ${m.titleEm}`, skill: SKILLS[id], type: 'project', started: Boolean(p.started), sealed: p.sealed, score: p.sealed ? SEAL_POINTS : 0, max: maxPoints(m), checks, correct: done, total: checks.length, level: done === checks.length ? 'Tuntas' : done >= 3 ? 'Hampir tuntas' : 'Belum tuntas' };
    }
    const items = m.challenges.map((def, i) => {
      const c = p.challenges[i];
      return { label: def.label, question: def.question, answered: c.complete, correct: isRight(c), points: c.complete ? c.points : 0, yourText: c.complete ? responseText(def, c.response) : '—', correctText: responseText(def, def.correct), explanation: explanation(def) };
    });
    const correct = items.filter((x) => x.correct).length;
    const score = items.reduce((n, x) => n + x.points, 0) + (p.sealed ? SEAL_POINTS : 0);
    const answeredCount = items.filter((x) => x.answered).length;
    const level = !answeredCount ? 'Belum dikerjakan' : correct === items.length ? 'Menguasai' : correct > 0 ? 'Sebagian menguasai' : 'Perlu diulang';
    const advice = correct === items.length ? 'Pertahankan! Kamu sudah memakai bukti dengan tepat.' : `Baca lagi insight Nara: “${m.stimulus.insight}” lalu bandingkan dengan penjelasan setiap tantangan.`;
    return { id, title: `${m.title} ${m.titleEm}`, skill: SKILLS[id], type: 'analysis', sealed: p.sealed, score, max: maxPoints(m), items, correct, total: items.length, answered: answeredCount, level, advice, started: answeredCount > 0 || p.sealed };
  }

  function evaluateAll() {
    const posts = MISSIONS.map((m) => evaluatePost(m.id));
    const score = computeScore();
    const max = MISSIONS.reduce((n, m) => n + maxPoints(m), 0);
    const finished = sealCount() === MISSIONS.length;
    // Rapor sementara menilai pos yang sudah dikerjakan; rapor akhir menilai seluruh ekspedisi.
    const attemptedMax = posts.filter((x) => x.started).reduce((n, x) => n + x.max, 0);
    const base = finished ? max : Math.max(attemptedMax, 1);
    const pct = Math.min(100, Math.round((score / base) * 100));
    const answered = posts.filter((x) => x.type === 'analysis').reduce((n, x) => n + x.items.filter((i) => i.answered).length, 0);
    const correct = posts.filter((x) => x.type === 'analysis').reduce((n, x) => n + x.correct, 0);
    const totalQ = posts.filter((x) => x.type === 'analysis').reduce((n, x) => n + x.total, 0);
    return { score, max, pct, answered, correct, totalQ, seals: sealCount(), posts, predikat: predikat(pct), strengths: posts.filter((x) => (x.type === 'analysis' ? x.correct === x.total : x.level === 'Tuntas') && x.sealed), improve: posts.filter((x) => x.started && (x.type === 'analysis' ? x.correct < x.total : x.level !== 'Tuntas')), finished, base };
  }

  function renderReport() {
    const ev = evaluateAll();
    const finished = ev.seals === MISSIONS.length;
    const stars = Math.max(1, Math.round(ev.pct / 20));
    $('#report-body').innerHTML = `
      <div class="report-hero">
        <div class="report-grade grade-${ev.predikat.grade}" aria-label="Predikat ${ev.predikat.grade}"><b>${ev.predikat.grade}</b><span>${escapeHtml(ev.predikat.label)}</span></div>
        <div>
          <p class="report-kicker">${finished ? 'RAPOR AKHIR EKSPEDISI' : 'RAPOR SEMENTARA'} · ${escapeHtml(state.alias)}</p>
          <h2>${ev.score} <small>/ ${ev.max} poin</small> <span class="report-stars" aria-label="${stars} dari 5 bintang">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span></h2>
          <p>${escapeHtml(ev.predikat.note)}</p>
          <ul class="report-stats"><li><b>${ev.correct}/${ev.totalQ}</b> jawaban benar</li><li><b>${ev.seals}/${MISSIONS.length}</b> pos tersegel</li><li><b>${ev.pct}%</b> capaian${ev.finished ? '' : ' dari pos yang sudah dikerjakan'}</li></ul>
        </div>
      </div>
      <h3 class="report-h">Penilaian per pos</h3>
      <div class="report-posts">${ev.posts.map((x) => `
        <article class="report-post ${x.sealed ? 'sealed' : ''}">
          <header><span>POS ${pad(x.id)}</span><b class="lvl lvl-${x.level.replace(/\s+/g, '-').toLowerCase()}">${escapeHtml(x.level)}</b></header>
          <h4>${escapeHtml(x.title)}</h4>
          <p class="report-skill">${escapeHtml(x.skill)}</p>
          <div class="report-bar" aria-label="${x.score} dari ${x.max} poin"><i style="width:${Math.round((x.score / x.max) * 100)}%"></i></div>
          <p class="report-score">${x.score}/${x.max} poin · ${x.type === 'analysis' ? `${x.correct}/${x.total} benar` : `${x.correct}/${x.total} langkah proyek`}${x.sealed ? ' · ✦ tersegel' : ''}</p>
          ${x.type === 'analysis' ? `<ul class="report-items">${x.items.map((it) => `<li class="${it.answered ? (it.correct ? 'ok' : 'no') : 'skip'}"><b>${it.answered ? (it.correct ? '✓' : '✗') : '·'} ${escapeHtml(it.label)}</b>${it.answered && !it.correct ? `<span>Jawabanmu: ${escapeHtml(it.yourText)}</span><span>Jawaban tepat: ${escapeHtml(it.correctText)}</span>` : ''}${it.answered ? `<em>${escapeHtml(it.explanation)}</em>` : '<span>Belum dijawab</span>'}</li>`).join('')}</ul>` : `<ul class="report-items">${x.checks.map((c) => `<li class="${c.ok ? 'ok' : 'no'}"><b>${c.ok ? '✓' : '○'} ${escapeHtml(c.text)}</b></li>`).join('')}</ul>`}
        </article>`).join('')}</div>
      <div class="report-eval">
        <section><h3 class="report-h">Kekuatanmu</h3>${ev.strengths.length ? `<ul>${ev.strengths.map((x) => `<li><b>${escapeHtml(x.skill)}</b> (Pos ${x.id})</li>`).join('')}</ul>` : '<p>Selesaikan pos dengan jawaban tepat untuk melihat kekuatanmu di sini.</p>'}</section>
        <section><h3 class="report-h">Yang perlu ditingkatkan</h3>${ev.improve.length ? `<ul>${ev.improve.map((x) => `<li><b>${escapeHtml(x.skill)}</b> (Pos ${x.id})${x.advice ? ` — ${escapeHtml(x.advice)}` : ''}</li>`).join('')}</ul>` : '<p>Tidak ada catatan. Hebat!</p>'}</section>
      </div>
      <p class="report-note">${ev.finished ? '' : 'Ini rapor sementara: predikat dihitung dari pos yang sudah kamu kerjakan. Rapor akhir muncul setelah keenam pos disegel. '}Skor: jawaban benar 30 poin, jawaban belum tepat 0 poin (tetap lanjut), segel pos 20 poin, maksimal ${ev.max} poin. Angka pada Pos 1–5 adalah data simulasi.</p>`;
  }

  $('#report-print').addEventListener('click', () => window.print());

  function sealPost(id, reason) {
    const m = missionById(id);
    const p = post(id);
    if (!m || m.type !== 'analysis') return { ok: false, message: 'Pos ini tidak bisa disegel di sini.' };
    if (p.sealed) return { ok: true, already: true };
    if (!isUnlocked(id)) return { ok: false, message: lockMessage(id) };
    if (!p.challenges.every((c) => c.complete)) return { ok: false, message: 'Selesaikan semua tantangan di Papan Laporan terlebih dahulu.' };
    const text = String(reason || '').trim();
    if (text.length < MIN_REASON) return { ok: false, message: `Tulis alasanmu minimal ${MIN_REASON} karakter (sekarang ${text.length}).` };
    p.reason = text.slice(0, 500);
    p.sealed = true;
    p.sealedAt = new Date().toISOString();
    saveState();
    recordLeaderboard();
    updatePlayerChip();
    return { ok: true, points: SEAL_POINTS, score: computeScore(), next: id < MISSIONS.length ? id + 1 : null };
  }

  window.NutraGame = {
    begin, end, openPos, isUnlocked, posStatus, showToast, goTo, renderPassport, evaluatePost, evaluateAll,
    computeScore, sealCount, missionById, scanEvidence, submitAnswer, sealPost, responseText, lockMessage,
    missions: MISSIONS,
    get state() { return state; },
    get visibleScreen() { return visibleScreen(); },
    minReason: MIN_REASON
  };

  $('#app-version').textContent = APP_VERSION;
})();
