/*
 * Regu proyek NUTRANTARA (Project Based Learning), sisi klien.
 * - Peran: setiap pos punya 4 peran (missions.js → NUTRANTARA_TEAM). Pembagian mengikuti jumlah anggota
 *   (1–4) dan berputar setiap pos: pemegang peran r di pos p = anggota ke-((r + p − 1) mod n).
 * - Gerbang tugas: tugas milik peran orang lain yang sedang daring ditolak dengan ajakan berdiskusi;
 *   bila pemegangnya luring, tugas boleh diambil alih (tercatat di log kontribusi) agar regu tidak macet.
 * - HUD regu di dunia: anggota, peran di pos ini, kontribusi, dan kabar terbaru regu.
 * Tanpa server atau tanpa regu, semua gerbang terbuka (mode solo).
 */
window.NutraTeam = (() => {
  const T = window.NUTRANTARA_TEAM || { roles: {}, tasks: {}, scenarios: {} };
  const net = window.NutraNet || null;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROLES = [0, 1, 2, 3];

  const party = () => (net && net.online && net.party) || null;
  const members = () => (party() ? party().members : []);
  const meId = () => (net && net.me ? net.me.id : null);
  const size = () => Math.max(1, members().length);
  /** Pembagian peran hanya berlaku bila regu berisi 2 orang atau lebih. */
  const shared = () => members().length >= 2;

  function holder(pos, role) {
    const ms = members();
    if (!ms.length) return null;
    return ms[(role + Number(pos) - 1) % ms.length];
  }
  const roleInfo = (pos, role) => ((T.roles[pos] || [])[role]) || { icon: '•', name: `Peran ${role + 1}`, task: '' };
  function myRoles(pos) {
    if (!shared()) return ROLES.slice();
    return ROLES.filter((r) => { const h = holder(pos, r); return h && h.id === meId(); });
  }

  /** Peran yang memegang sebuah tugas. kind: terminal | distractor | station | lab | villi | card | ingredient | kitchen | stage | threads | colon. */
  function roleOf(pos, kind, key, index) {
    const t = T.tasks[pos] || {};
    if (kind === 'terminal') return Array.isArray(t.terminal) ? t.terminal[index % t.terminal.length] : Number.isInteger(t.terminal) ? t.terminal : null;
    if (kind === 'distractor') return Number.isInteger(t.distractor) ? t.distractor : null;
    if (kind === 'station') return t.station && Number.isInteger(t.station[key]) ? t.station[key] : null;
    if (kind === 'lab') return t.lab && Number.isInteger(t.lab[key]) ? t.lab[key] : null;
    if (kind === 'villi') return t.villi && Number.isInteger(t.villi[key]) ? t.villi[key] : null;
    if (kind === 'card') return t.sorterCard ? index % 4 : null;
    if (kind === 'ingredient') return t.ingredient ? index % 4 : null;
    if (kind === 'kitchen') return t.kitchen && Number.isInteger(t.kitchen[key]) ? t.kitchen[key] : null;
    if (kind === 'stage') return Number.isInteger(t.stage) ? t.stage : null;
    // Peta tugas lain berbentuk { kunci: peran }, mis. threads/colon di Pos 4.
    if (t[kind] && typeof t[kind] === 'object' && !Array.isArray(t[kind])) return Number.isInteger(t[kind][key]) ? t[kind][key] : null;
    return null;
  }

  function gate(pos, role) {
    if (role === null || role === undefined || !shared()) return { ok: true, mine: true, role };
    const info = roleInfo(pos, role);
    const h = holder(pos, role);
    if (!h || h.id === meId()) return { ok: true, mine: true, role, info };
    if (!h.online) return { ok: true, takeover: true, role, info, holder: h, text: `${h.alias} sedang luring — kamu mengambil alih tugas ${info.icon} ${info.name}.` };
    return { ok: false, role, info, holder: h, text: `Tugas ${info.icon} ${info.name} milik ${h.alias}. Ajak ${h.alias} mengerjakannya (dia sedang daring), atau kerjakan tugas peranmu sendiri.` };
  }
  const check = (pos, kind, key, index) => gate(pos, roleOf(pos, kind, key, index));

  /** Label singkat pemilik tugas, mis. "🥚 Rani". Kosong pada mode solo. */
  function tag(pos, kind, key, index) {
    const role = roleOf(pos, kind, key, index);
    if (role === null || !shared()) return '';
    const h = holder(pos, role);
    return `${roleInfo(pos, role).icon} ${h ? (h.id === meId() ? 'kamu' : h.alias) : '—'}`;
  }

  // ---------- Jawaban regu (voting) ----------
  /** Voting dipakai bila tersambung ke server dan berada dalam regu (regu 1 orang langsung terkunci). */
  const voting = () => Boolean(party());
  const teamPost = (pos) => (party() && party().posts && party().posts[pos]) || {};
  const votesFor = (pos, index) => ((teamPost(pos).votes || {})[index]) || {};
  function needVotes() { return members().some((m) => m.id !== meId() && m.active) ? 2 : 1; }
  /** Ringkasan usulan: [{ response, aliases, ids, mine }] urut dari suara terbanyak. */
  function proposals(pos, index) {
    const groups = [];
    Object.entries(votesFor(pos, index)).forEach(([id, v]) => {
      const key = JSON.stringify(v.response);
      let g = groups.find((x) => x.key === key);
      if (!g) { g = { key, response: v.response, aliases: [], ids: [] }; groups.push(g); }
      g.aliases.push(v.alias); g.ids.push(id);
    });
    groups.forEach((g) => { g.mine = g.ids.includes(meId()); });
    return groups.sort((a, b) => b.ids.length - a.ids.length);
  }
  function vote(pos, index, response) { return Boolean(net && net.teamVote && net.teamVote(pos, index, response)); }

  // ---------- HUD regu di dunia ----------
  let hud = null;
  let lastLogAt = '';
  let collapsed = false;
  let lastHtml = '';
  const currentPos = () => {
    const w = window.NutraWorld3D;
    const id = w && Number.isInteger(w.island) ? w.island : null;
    return id && T.roles[id] ? id : null;
  };

  function ensureHud() {
    if (hud) return hud;
    const stage = document.querySelector('.world-stage');
    if (!stage) return null;
    hud = document.createElement('aside');
    hud.className = 'team-hud';
    hud.setAttribute('aria-label', 'Regu proyek');
    hud.hidden = true;
    stage.append(hud);
    hud.addEventListener('click', (e) => { if (e.target.closest('[data-team-toggle]')) { collapsed = !collapsed; render(); } });
    return hud;
  }

  function scenario() { return T.scenarios[Math.min(4, size())] || T.scenarios[1]; }

  function render() {
    const el = ensureHud();
    if (!el) return;
    const inWorld = document.body.classList.contains('in-world');
    const pos = currentPos();
    if (!inWorld || !pos) { el.hidden = true; lastHtml = ''; return; }
    el.hidden = false;
    const p = party();
    const sc = scenario();
    const mine = myRoles(pos);
    const myRoleText = mine.map((r) => `<li><b>${esc(roleInfo(pos, r).icon)} ${esc(roleInfo(pos, r).name)}</b><span>${esc(roleInfo(pos, r).task)}</span></li>`).join('');
    const memberRows = shared() ? members().map((m) => {
      const roles = ROLES.filter((r) => { const h = holder(pos, r); return h && h.id === m.id; }).map((r) => roleInfo(pos, r).icon).join(' ');
      const n = (m.contrib && m.contrib[pos]) || 0;
      return `<li class="${m.online ? 'on' : 'off'}"><i style="background:${esc(m.color)}"></i><b>${esc(m.id === meId() ? `${m.alias} (kamu)` : m.alias)}</b><span class="team-roles" aria-label="Peran">${esc(roles)}</span><span class="team-dot">${m.online ? '● daring' : '○ luring'} · ${n} aksi</span></li>`;
    }).join('') : '';
    const feed = p ? (p.log || []).filter((x) => !x.pos || x.pos === pos).slice(-3).reverse().map((x) => `<li><b>${esc(x.alias)}</b> ${esc(x.text)}</li>`).join('') : '';
    const html = `
      <button type="button" class="team-head" data-team-toggle aria-expanded="${!collapsed}">
        <span>🤝 ${p ? `REGU ${esc(p.code)}` : 'MAIN SENDIRI'}</span><b>${esc(sc.name)} · ${size()} orang</b><i aria-hidden="true">${collapsed ? '▸' : '▾'}</i>
      </button>
      ${collapsed ? '' : `
        <p class="team-scn">${esc(sc.text)}</p>
        <p class="team-label">PERANMU DI POS ${pos}</p>
        <ul class="team-mine">${myRoleText}</ul>
        ${memberRows ? `<p class="team-label">ANGGOTA &amp; PERAN</p><ul class="team-members">${memberRows}</ul>` : ''}
        ${feed ? `<p class="team-label">KABAR REGU</p><ul class="team-feed">${feed}</ul>` : ''}
        ${!p && net && net.online ? '<p class="team-hint">Bentuk regu (maks. 4) di lobi agar tugas dibagi bersama.</p>' : ''}`}`;
    if (html === lastHtml) return;
    lastHtml = html;
    el.innerHTML = html;
  }

  /** Kabar baru dari anggota lain → toast singkat. */
  function announce(party) {
    if (!party || !party.log || !party.log.length) return;
    const fresh = party.log.filter((x) => x.at > lastLogAt);
    const first = !lastLogAt;
    lastLogAt = party.log[party.log.length - 1].at;
    if (first) return;
    fresh.filter((x) => x.id !== meId()).slice(-2).forEach((x) => {
      const g = window.NutraGame;
      if (g && g.showToast) g.showToast(`🤝 ${x.alias} ${x.text}${x.pos ? ` (Pos ${x.pos})` : ''}`);
    });
  }

  if (net) {
    net.on('party', (p) => { announce(p); render(); });
    net.on('status', render);
  }
  setInterval(render, 1500);

  return { holder, myRoles, roleInfo, roleOf, gate, check, tag, shared, size, members, voting, proposals, needVotes, vote, teamPost, render, scenario, get party() { return party(); } };
})();
