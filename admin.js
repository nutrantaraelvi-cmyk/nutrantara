/*
 * Panel kendali guru NUTRANTARA.
 * Tersambung ke server kelas lewat /ws memakai PIN admin.
 */
(() => {
  const W = window.NUTRANTARA_WORLD;
  const MISSIONS = window.NUTRANTARA_MISSIONS || [];
  const PIN_KEY = 'nutrantara-admin-pin';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');

  let ws = null;
  let authed = false;
  let pin = sessionStorage.getItem(PIN_KEY) || '';
  let snapshot = null;
  const positions = new Map();
  let selected = null; // id pemain yang dipilih untuk dipindahkan
  let toastTimer;

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function setConn(state, text) { const el = $('#admin-conn'); el.dataset.state = state; el.textContent = text; }

  function send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); else toast('Belum tersambung ke server.'); }
  const command = (action, extra = {}) => send({ type: 'admin', action, ...extra });

  function connect() {
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws.addEventListener('open', () => { setConn('wait', '◌ TERSAMBUNG — MASUKKAN PIN'); if (pin) send({ type: 'admin-auth', pin }); });
    ws.addEventListener('message', (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } handle(m); });
    ws.addEventListener('close', () => { authed = false; setConn('off', '● TERPUTUS — MENYAMBUNG ULANG…'); setTimeout(connect, 2000); });
  }

  function handle(m) {
    switch (m.type) {
      case 'admin-welcome':
        authed = true;
        sessionStorage.setItem(PIN_KEY, pin);
        $('#login-view').hidden = true;
        $('#admin-view').hidden = false;
        setConn('on', '● TERSAMBUNG SEBAGAI GURU');
        renderChat(m.chat || []);
        requestAnimationFrame(drawMap);
        break;
      case 'admin-error':
        if (!authed) {
          sessionStorage.removeItem(PIN_KEY);
          pin = '';
          const err = $('#login-error');
          err.hidden = false;
          err.textContent = m.message;
        } else toast(m.message);
        break;
      case 'admin-ok': toast(m.message); break;
      case 'admin-password': window.alert(`Kata sandi sementara untuk ${m.alias}:\n\n${m.password}\n\nBerikan langsung kepada siswa. Siswa masuk dengan kata sandi ini.`); break;
      case 'admin-state': snapshot = m; render(); break;
      case 'positions': m.list.forEach(([id, x, y]) => positions.set(id, { x, y })); break;
      case 'chat': appendChat(m.entry); break;
      case 'chat-cleared': renderChat([]); break;
      case 'chat-deleted': { const li = $(`#admin-chat [data-id="${CSS.escape(m.id)}"]`); if (li) li.remove(); break; }
      case 'admin-detail': showDetail(m.player); break;
      case 'admin-export': exportData(m.data); break;
      default: break;
    }
  }

  $('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    pin = $('#pin').value.trim();
    $('#login-error').hidden = true;
    send({ type: 'admin-auth', pin });
  });

  // ---------- Render ----------

  function render() {
    const { settings, players } = snapshot;
    const online = players.filter((p) => p.online);
    const finished = players.filter((p) => p.finishedAt).length;
    const avg = players.length ? Math.round(players.reduce((s, p) => s + p.score, 0) / players.length) : 0;
    const flagged = players.filter((p) => p.flags.length).length;
    $('#admin-stats').innerHTML = [
      ['DARING', `${online.length} <small>/ ${players.length}</small>`],
      ['SELESAI 6 POS', `${finished}`],
      ['RATA-RATA SKOR', `${avg} <small>/ 420</small>`],
      ['STATUS', settings.paused ? '<span class="warn">Dijeda</span>' : 'Berjalan'],
      ['PERLU DICEK', flagged ? `<span class="warn">⚠ ${flagged}</span>` : '0']
    ].map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join('');
    $('#server-time').textContent = `DIPERBARUI ${new Date(snapshot.serverTime).toLocaleTimeString('id-ID')}`;
    renderTeams();

    toggleBtn('#btn-pause', settings.paused, '▶ Lanjutkan permainan', '❚❚ Jeda semua pemain');
    toggleBtn('#btn-move', settings.movementLocked, '↔ Bebaskan gerak', '⌑ Bekukan gerak');
    toggleBtn('#btn-chat', !settings.chatEnabled, '✉ Nyalakan obrolan', '✕ Matikan obrolan');

    $('#post-toggles').innerHTML = MISSIONS.map((m) => {
      const open = settings.openPosts.includes(m.id);
      const reached = players.filter((p) => p.posts[m.id - 1] && p.posts[m.id - 1].sealed).length;
      return `<button type="button" class="post-toggle" data-post="${m.id}" aria-pressed="${open}"><b>POS ${pad(m.id)}</b><span>${esc(m.title)} ${esc(m.titleEm)}</span><i>${open ? '● DIBUKA' : '⌑ DITUTUP'} · ${reached} segel</i></button>`;
    }).join('');

    if (document.activeElement !== $('#class-code')) $('#class-code').value = settings.classCode || '';
    $('#ann-current').textContent = settings.announcement ? `Pengumuman aktif: “${settings.announcement}”` : 'Tidak ada pengumuman aktif.';
    renderPlayers();
  }

  function toggleBtn(sel, active, onText, offText) {
    const b = $(sel);
    b.textContent = active ? onText : offText;
    b.classList.toggle('button-primary', active);
    b.classList.toggle('button-secondary', !active);
    b.setAttribute('aria-pressed', String(active));
  }

  function ago(iso) {
    if (!iso) return '—';
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s} dtk lalu`;
    if (s < 3600) return `${Math.round(s / 60)} mnt lalu`;
    return new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  }

  function renderPlayers() {
    if (!snapshot) return;
    // Jangan menggambar ulang saat menu aksi sedang terbuka.
    if ($('#players-body details[open]')) return;
    const q = $('#player-filter').value.trim().toLocaleLowerCase('id');
    const rows = snapshot.players.filter((p) => !q || p.alias.toLocaleLowerCase('id').includes(q));
    if (!rows.length) { $('#players-body').innerHTML = `<tr><td colspan="8">${snapshot.players.length ? 'Tidak ada yang cocok.' : 'Belum ada siswa yang bergabung. Bagikan alamat server kepada siswa.'}</td></tr>`; return; }
    $('#players-body').innerHTML = rows.map((p) => {
      const cells = p.posts.map((s) => {
        const cls = s.sealed ? 'sealed' : s.started ? 'started' : '';
        const txt = s.started || s.sealed ? (s.total ? `${s.correct ?? s.done}/${s.total}` : s.sealed ? '✓' : (s.step || '…').slice(0, 3)) : '·';
        return `<span class="pcell ${cls}" title="Pos ${s.id}: ${s.sealed ? 'tersegel' : s.started ? 'dalam proses' : 'belum dimulai'}${s.attempts ? `, ${s.attempts} percobaan` : ''}">${esc(txt)}</span>`;
      }).join('');
      const answered = p.posts.reduce((n, s) => n + (s.total ? s.done : 0), 0);
      const right = p.posts.reduce((n, s) => n + (s.total ? (s.correct ?? s.done) : 0), 0);
      const flags = p.flags.length ? ` <span class="warn" title="${esc(p.flags.join('\n'))}">⚠</span>` : '';
      const tags = `${p.muted ? ' <span class="tag">bisu</span>' : ''}${p.blocked ? ' <span class="tag warn">dikeluarkan</span>' : ''}${!p.hasPassword ? ' <span class="tag warn">tanpa kata sandi</span>' : ''}${p.party ? ` <span class="tag" title="Regu proyek">🤝 ${esc(p.party)}</span>` : ''}`;
      return `<tr data-id="${p.id}"${selected === p.id ? ' class="selected"' : ''}>
        <th scope="row"><span class="roster-dot" style="background:${esc(p.color)}"></span> ${esc(p.alias)} <small class="${p.online ? 'on' : 'off'}">${p.online ? '● daring' : '○ luring'}</small>${flags}${tags}</th>
        <td>${p.score}</td><td>${p.seals} / 6</td><td class="pcells">${cells}</td><td>${right}/${answered}</td>
        <td>${p.online ? (p.zone === 'world' ? `Dunia · ${(() => { const id = W.islandAt(p.x, p.y); return W.isPost(id) ? `Pos ${id}` : id >= 0 ? W.islands.find((i) => i.id === id).name : 'jembatan'; })()}` : 'Lobi') : '—'}</td><td>${p.online ? 'sekarang' : ago(p.lastSeen)}</td>
        <td class="row-actions">
          <button type="button" class="admin-small button button-secondary" data-act="select">${selected === p.id ? 'Batal pilih' : 'Pindahkan'}</button>
          <button type="button" class="admin-small button button-secondary" data-act="detail">Detail</button>
          <details class="more"><summary class="admin-small button button-secondary">Lainnya</summary><div class="more-menu">
            <button type="button" data-act="message">Kirim pesan pribadi</button>
            <button type="button" data-act="mute">${p.muted ? 'Izinkan mengobrol' : 'Bisukan obrolan'}</button>
            <button type="button" data-act="spawn">Pindahkan ke Nara</button>
            <button type="button" data-act="reset-password">Atur ulang kata sandi</button>
            <button type="button" data-act="reset" class="danger">Atur ulang progres</button>
            <button type="button" data-act="${p.blocked ? 'unblock' : 'kick'}" class="${p.blocked ? '' : 'danger'}">${p.blocked ? 'Izinkan bergabung kembali' : 'Keluarkan dari sesi'}</button>
            <button type="button" data-act="delete" class="danger">Hapus data penjelajah</button>
          </div></details>
        </td></tr>`;
    }).join('');
  }

  $('#player-filter').addEventListener('input', renderPlayers);

  $('#players-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const row = btn.closest('tr');
    const id = row.dataset.id;
    const p = snapshot.players.find((x) => x.id === id);
    if (!p) return;
    const act = btn.dataset.act;
    const details = btn.closest('details');
    if (details) details.open = false;
    switch (act) {
      case 'select': selected = selected === id ? null : id; renderPlayers(); updateMapMode(); break;
      case 'detail': command('detail', { playerId: id }); break;
      case 'message': { const text = prompt(`Pesan pribadi untuk ${p.alias}:`); if (text && text.trim()) command('message', { playerId: id, text }); break; }
      case 'mute': command('mute', { playerId: id, value: !p.muted }); break;
      case 'spawn': command('teleport', { playerId: id, x: W.spawn.x, y: W.spawn.y }); break;
      case 'reset-password': if (confirm(`Atur ulang kata sandi ${p.alias}? Siswa akan keluar dan harus masuk dengan kata sandi sementara yang ditampilkan.`)) command('reset-password', { playerId: id }); break;
      case 'reset': if (confirm(`Atur ulang SELURUH progres ${p.alias}? Tindakan ini tidak dapat dibatalkan. Ekspor data terlebih dahulu bila perlu.`)) command('reset', { playerId: id }); break;
      case 'kick': if (confirm(`Keluarkan ${p.alias} dari sesi? Siswa tidak bisa bergabung lagi sampai diizinkan kembali.`)) command('kick', { playerId: id }); break;
      case 'unblock': command('unblock', { playerId: id }); break;
      case 'delete': if (confirm(`Hapus permanen data ${p.alias} dari server kelas? Ekspor data terlebih dahulu bila perlu.`)) command('delete', { playerId: id }); break;
      default: break;
    }
  });

  // ---------- Regu proyek ----------

  function renderTeams() {
    const teams = (snapshot && snapshot.teams) || [];
    const solo = snapshot ? snapshot.players.filter((p) => !p.party).length : 0;
    if (!teams.length) { $('#admin-teams').innerHTML = `<p class="field-hint">Belum ada regu. ${solo} siswa bermain solo.</p>`; return; }
    $('#admin-teams').innerHTML = teams.map((t) => {
      const total = t.members.reduce((n, m) => n + m.contrib, 0) || 1;
      const posts = t.posts.map((x) => {
        const text = x.type === 'project' ? `${x.archive ? 'arsip pulih ✓' : 'arsip belum pulih'} · ${x.reviews || 0} telaah sejawat · ${x.steps}/3 langkah · ${x.collected} bahan` : `${x.done}/${x.total} jawab (${x.correct} tepat)${x.stationTotal ? ` · misi ${x.stations}/${x.stationTotal}` : ''} · bukti ${x.evidence}${x.variant ? ` · kasus ${x.variant}` : ''}${x.pendingVotes ? ` · 🗳 ${x.pendingVotes} menunggu suara` : ''}`;
        const full = x.type === 'project' ? x.steps === 3 : x.done === x.total;
        return `<li class="${full ? 'done' : ''}"><b>Pos ${x.id}</b> ${esc(text)}</li>`;
      }).join('');
      const members = t.members.map((m) => `<li><span class="team-bar" style="--w:${Math.round((m.contrib / total) * 100)}%"></span><b>${m.online ? '●' : '○'} ${esc(m.alias)}</b> <span>${m.contrib} aksi · ${m.score} poin · ${m.seals}/6 segel</span></li>`).join('');
      const log = t.log.slice().reverse().map((e) => `<li><time>${new Date(e.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</time> <b>${esc(e.alias)}</b> ${esc(e.text)}${e.pos ? ` <small>(Pos ${e.pos})</small>` : ''}</li>`).join('');
      return `<article class="admin-team"><header><b>REGU ${esc(t.code)}</b><span>${t.members.length} orang · ${['', 'Solo', 'Duo', 'Trio', 'Penuh'][t.members.length] || ''}</span><button type="button" class="button button-secondary admin-small" data-dissolve="${esc(t.code)}">Bubarkan</button></header>
        <div class="admin-team-grid"><div><p class="admin-team-h">ANGGOTA &amp; KONTRIBUSI</p><ul class="admin-team-members">${members}</ul></div><div><p class="admin-team-h">KEMAJUAN PER POS</p><ul class="admin-team-posts">${posts}</ul></div></div>
        <details><summary>Log regu terbaru</summary><ul class="admin-team-log">${log || '<li>Belum ada aktivitas.</li>'}</ul></details></article>`;
    }).join('') + (solo ? `<p class="field-hint">${solo} siswa belum berada di regu (bermain solo).</p>` : '');
  }
  $('#admin-teams').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dissolve]');
    if (b && confirm(`Bubarkan regu ${b.dataset.dissolve}? Progres setiap anggota tetap tersimpan; mereka bisa membentuk regu baru.`)) command('team-dissolve', { code: b.dataset.dissolve });
  });

  // ---------- Kendali ----------

  $('#btn-pause').addEventListener('click', () => command('set-paused', { value: !snapshot.settings.paused }));
  $('#btn-move').addEventListener('click', () => command('set-movement', { value: !snapshot.settings.movementLocked }));
  $('#btn-chat').addEventListener('click', () => command('set-chat', { value: !snapshot.settings.chatEnabled }));
  $('#btn-gather').addEventListener('click', () => command('teleport', { playerId: 'all', x: W.nara.x + 30, y: W.nara.y + 30 }));
  $('#post-toggles').addEventListener('click', (e) => {
    const b = e.target.closest('[data-post]');
    if (b) command('set-post', { pos: Number(b.dataset.post), open: b.getAttribute('aria-pressed') !== 'true' });
  });
  $('#btn-open-all').addEventListener('click', () => command('set-posts', { posts: MISSIONS.map((m) => m.id) }));
  $('#btn-only-first').addEventListener('click', () => command('set-posts', { posts: [1] }));
  $('#btn-class-code').addEventListener('click', () => command('set-class-code', { code: $('#class-code').value.trim() }));
  $('#btn-announce').addEventListener('click', () => {
    const text = $('#ann-text').value.trim();
    if (!text) { toast('Tulis pengumuman terlebih dahulu.'); return; }
    command('announce', { text });
    $('#ann-text').value = '';
  });
  $('#btn-clear-ann').addEventListener('click', () => command('announce', { text: '' }));
  $('#btn-clear-chat').addEventListener('click', () => { if (confirm('Bersihkan seluruh obrolan kelas?')) command('clear-chat'); });
  $('#btn-export-json').addEventListener('click', () => { exportFormat = 'json'; command('export'); });
  $('#btn-export-csv').addEventListener('click', () => { exportFormat = 'csv'; command('export'); });

  // ---------- Obrolan ----------

  function chatItem(e) {
    const li = document.createElement('li');
    li.dataset.id = e.id;
    li.innerHTML = `<span class="chat-time">${esc(new Date(e.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))}</span> <b style="color:${esc(e.color)}">${esc(e.from)}</b> ${esc(e.text)} <button type="button" class="icon-button" data-del="${esc(e.id)}" aria-label="Hapus pesan dari ${esc(e.from)}">×</button>`;
    return li;
  }
  function renderChat(list) { const ol = $('#admin-chat'); ol.innerHTML = ''; list.forEach((e) => ol.append(chatItem(e))); ol.scrollTop = ol.scrollHeight; }
  function appendChat(e) { const ol = $('#admin-chat'); ol.append(chatItem(e)); ol.scrollTop = ol.scrollHeight; }
  $('#admin-chat').addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b) command('delete-chat', { id: b.dataset.del }); });

  // ---------- Peta langsung ----------

  const map = $('#admin-map');
  const mctx = map.getContext('2d');

  function updateMapMode() {
    const p = selected && snapshot && snapshot.players.find((x) => x.id === selected);
    $('#map-mode').textContent = p ? `KLIK PETA UNTUK MEMINDAHKAN ${p.alias.toUpperCase()}` : 'KLIK PEMAIN DI TABEL, LALU KLIK PETA UNTUK MEMINDAHKAN';
    map.classList.toggle('targeting', Boolean(p));
  }

  map.addEventListener('click', (e) => {
    if (!selected) return;
    const r = map.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W.width;
    const y = ((e.clientY - r.top) / r.height) * W.height;
    command('teleport', { playerId: selected, x, y });
    selected = null;
    renderPlayers();
    updateMapMode();
  });

  function drawMap() {
    if (!authed) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(map.getBoundingClientRect().width * dpr);
    const h = Math.round((w * W.height) / W.width);
    if (map.width !== w || map.height !== h) { map.width = w; map.height = h; }
    const s = w / W.width;
    mctx.setTransform(s, 0, 0, s, 0, 0);
    mctx.fillStyle = '#04161a'; mctx.fillRect(0, 0, W.width, W.height);
    mctx.fillStyle = '#a8e3f0'; mctx.fillRect(0, 0, W.width, W.height);
    const k = W.width / 960; // ikon & teks ikut diskalakan agar tetap terbaca di peta yang lebih luas
    W.bridges.forEach((br) => { mctx.strokeStyle = 'rgba(104,220,231,.9)'; mctx.lineWidth = Math.max(br.w * 0.7, 4 * k); mctx.lineCap = 'round'; mctx.beginPath(); mctx.moveTo(br.a[0], br.a[1]); mctx.lineTo(br.b[0], br.b[1]); mctx.stroke(); });
    const openPosts = snapshot ? snapshot.settings.openPosts : [];
    // Pulau kecil diberi ukuran minimum; wilayah pos tampil sesuai ukuran aslinya.
    W.islands.forEach((isl) => { const m = Math.max(isl.rx, 7 * k) / isl.rx; mctx.fillStyle = '#e6d29b'; mctx.beginPath(); mctx.ellipse(isl.cx, isl.cy, isl.rx * m + 5, isl.ry * m + 5, 0, 0, Math.PI * 2); mctx.fill(); mctx.fillStyle = '#4fae66'; mctx.beginPath(); mctx.ellipse(isl.cx, isl.cy, isl.rx * m, isl.ry * m, 0, 0, Math.PI * 2); mctx.fill(); });
    const font = (wt, px, fam) => `${wt} ${Math.round(px * k)}px ${fam}`;
    mctx.textAlign = 'center';
    W.islands.filter((isl) => isl.kind === 'wild').forEach((isl) => {
      mctx.fillStyle = '#1f5a3a'; mctx.font = font(600, 10, '"DM Sans", sans-serif'); mctx.fillText(`◆ ${isl.name}`, isl.cx, isl.cy);
    });
    W.stations.forEach((st) => {
      const open = openPosts.includes(st.id);
      mctx.fillStyle = open ? '#68dce7' : '#6c7f79';
      mctx.beginPath(); mctx.arc(st.x, st.y - 30 * k, 16 * k, 0, Math.PI * 2); mctx.fill();
      mctx.fillStyle = '#071516'; mctx.font = font(700, 13, 'Manrope, sans-serif'); mctx.fillText(open ? String(st.id) : '⌑', st.x, st.y - 25 * k);
      mctx.font = font(500, 11, '"DM Mono", monospace'); mctx.fillText(`POS ${st.id}`, st.x, st.y + 2 * k);
    });
    mctx.fillStyle = '#d9fff0'; mctx.beginPath(); mctx.arc(W.nara.x, W.nara.y, 8 * k, 0, Math.PI * 2); mctx.fill();
    mctx.fillStyle = '#1f7a4f'; mctx.font = font(600, 11, '"DM Sans", sans-serif'); mctx.fillText('NARA', W.nara.x, W.nara.y - 14 * k);
    if (snapshot) snapshot.players.filter((p) => p.online && p.zone === 'world').forEach((p) => {
      const pos = positions.get(p.id) || p;
      mctx.fillStyle = p.color; mctx.beginPath(); mctx.arc(pos.x, pos.y, 8 * k, 0, Math.PI * 2); mctx.fill();
      if (selected === p.id) { mctx.strokeStyle = '#ffd17c'; mctx.lineWidth = 3 * k; mctx.beginPath(); mctx.arc(pos.x, pos.y, 13 * k, 0, Math.PI * 2); mctx.stroke(); }
      mctx.fillStyle = '#071516'; mctx.font = font(600, 11, '"DM Sans", sans-serif'); mctx.fillText(p.alias, pos.x, pos.y - 13 * k);
    });
    requestAnimationFrame(drawMap);
  }

  // ---------- Detail & ekspor ----------

  function showDetail(p) {
    const prog = p.progress;
    const posts = prog ? MISSIONS.map((m) => {
      const s = prog.posts[m.id] || {};
      if (m.type === 'project') {
        const d = s.revision && s.revision.savedAt ? s.revision : s.initial || {};
        return `<article class="passport-record"><h2>Pos ${m.id} · ${esc(m.title)} ${esc(m.titleEm)} ${s.sealed ? '✓' : ''}</h2><p><b>Menu:</b> ${esc(d.menuName || '—')} · <b>Sasaran:</b> ${esc(d.target || '—')}</p><p><b>Alasan:</b> ${esc(d.rationale || '—')}</p><p><b>Telaah:</b> ${esc((s.review && s.review.notes) || '—')}</p><p><b>Refleksi:</b> ${esc((s.reflection && s.reflection.learned) || '—')}</p></article>`;
      }
      const ch = (s.challenges || []).map((c, i) => `<li>Tantangan ${i + 1}: ${c.complete ? '✓' : '…'} · ${c.attempts || 0} percobaan · ${c.points || 0} poin</li>`).join('');
      const kasus = m.variants ? `<p><b>Kasus:</b> varian ${(Number.isInteger(s.variant) ? s.variant : 0) + 1}/${m.variants.length} · ${esc((m.variants[s.variant] || m.variants[0]).name)}</p>` : '';
      return `<article class="passport-record"><h2>Pos ${m.id} · ${esc(m.title)} ${esc(m.titleEm)} ${s.sealed ? '✓' : ''}</h2>${kasus}<ul>${ch}</ul><p><b>Alasan:</b> ${esc(s.reason || '—')}</p></article>`;
    }).join('') : '<p>Belum ada progres.</p>';
    const flags = p.flags.length ? `<div class="feedback"><b>Catatan validasi server:</b><ul>${p.flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : '';
    $('#detail-title').textContent = `DETAIL · ${p.alias.toUpperCase()} · ${p.score} POIN · ${p.seals}/6 SEGEL`;
    $('#detail-body').innerHTML = `${flags}${posts}`;
    $('#detail-dialog').showModal();
  }
  $('#detail-close').addEventListener('click', () => $('#detail-dialog').close());

  let exportFormat = 'json';
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportData(data) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    if (exportFormat === 'json') { download(`nutrantara-kelas-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json'); toast('Data kelas diekspor (JSON).'); return; }
    const cell = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = ['alias', 'skor', 'segel', 'selesai', ...MISSIONS.flatMap((m) => [`pos${m.id}_segel`, `pos${m.id}_benar`, `pos${m.id}_alasan`]), 'catatan_validasi', 'dibuat', 'terakhir_aktif'];
    const lines = data.players.map((p) => {
      const posts = (p.progress && p.progress.posts) || {};
      const per = MISSIONS.flatMap((m) => {
        const s = posts[m.id] || {};
        const benar = (s.challenges || []).filter((c) => c.complete && c.correct !== false).length;
        const reason = m.type === 'project' ? ((s.reflection && s.reflection.learned) || '') : (s.reason || '');
        return [s.sealed ? 'ya' : 'tidak', m.type === 'analysis' ? `${benar}/${m.challenges.length}` : '-', reason];
      });
      return [p.alias, p.score, p.seals, p.finishedAt || '', ...per, (p.flags || []).join(' | '), p.createdAt, p.lastSeen].map(cell).join(',');
    });
    download(`nutrantara-kelas-${stamp}.csv`, `﻿${[head.join(','), ...lines].join('\n')}`, 'text/csv');
    toast('Data kelas diekspor (CSV).');
  }

  setInterval(() => { if (authed) renderPlayers(); }, 15000);
  connect();
})();
