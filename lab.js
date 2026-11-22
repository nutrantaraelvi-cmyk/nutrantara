/*
 * Meja Uji Reagen (Pos 2 · Laboratorium Pencernaan).
 * Praktikum virtual uji makanan + deduksi: siswa meneteskan Lugol, Benedict (lalu dipanaskan), Biuret,
 * Sudan III, atau memakai mikroskop pada sampel Ruang X (kontrol) dan Ruang Y (bermasalah),
 * mencatat hasilnya di Jurnal Bukti, lalu menunjuk bagian jalur yang macet.
 * Aturan detektif: tuduhan yang benar baru diterima bila bukti kuncinya sudah diuji di Ruang Y.
 * Bersifat formatif (tidak memengaruhi skor); bintang ★ memberi tantangan tambahan:
 *   ★ kasus terpecahkan · ★ diagnosis benar pada percobaan pertama · ★ memakai kontrol Ruang X dan hemat tetes.
 * Hasil selalu ditulis dengan kata (positif/negatif + warna), tidak hanya lewat warna.
 */

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROOMS = { x: 'Ruang X', y: 'Ruang Y' };
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));

export function createLab({ game, openPanel, closePanel, shake, say, nara, onSolved }) {
  const TEAM = () => window.NutraTeam || null;
  /** Regu: reagen dipegang peran (Lugol/Benedict, Biuret, Sudan III/mikroskop); tuduhan oleh Kepala Lab. */
  const gate = (pos, key) => (TEAM() ? TEAM().check(pos, 'lab', key) : { ok: true });
  const owner = (pos, key) => (TEAM() ? TEAM().tag(pos, 'lab', key) : '');
  const sharedTeam = () => Boolean(TEAM() && TEAM().shared());
  function labState(id, caseId) {
    const a = game.activityState(id);
    if (!a.lab || a.lab.caseId !== caseId) a.lab = { caseId, log: [], wrong: 0, done: false, stars: 0 };
    return a.lab;
  }
  const update = (id, caseId, fn, note) => game.updateActivity(id, (a) => { if (!a.lab || a.lab.caseId !== caseId) a.lab = { caseId, log: [], wrong: 0, done: false, stars: 0 }; fn(a.lab, a); }, note);

  function open(it) {
    const m = game.missionById(it.pos);
    const L = m.activity.lab;
    const caseId = L.cases[m.activity.caseId] ? m.activity.caseId : Object.keys(L.cases)[0];
    const cs = L.cases[caseId];
    const tools = Object.fromEntries(L.tools.map((t) => [t.id, t]));
    const result = (tool, room) => L.results[tool][(room === 'y' && cs.y[tool]) || L.normal[tool]];
    const st = () => labState(it.pos, caseId);
    let tool = null;
    let busy = false;

    const dropsLeft = () => Math.max(0, L.budget - st().log.length);
    const dropsHtml = () => {
      const used = st().log.length;
      const dots = Array.from({ length: L.budget }, (_, i) => `<i class="${i < used ? 'used' : ''}"></i>`).join('');
      return `<span class="lab-drop-dots" aria-hidden="true">${dots}</span> ${used > L.budget ? `<b class="warn">${used} uji — lewat dari ${L.budget} tetes hemat</b>` : `${dropsLeft()} tetes hemat tersisa`}`;
    };
    const entryHtml = ({ tool: t, room, by }) => {
      const r = result(t, room);
      return `<li class="lab-entry ${r.word === 'Positif' || r.word === 'Janggal' ? 'pos' : 'neg'}"><span class="lab-swatch" style="--c:${r.layer || r.color || '#11a3b5'}" aria-hidden="true"></span><span><b>${ROOMS[room]} · ${esc(tools[t].label)}</b> — ${esc(r.word)}: ${esc(r.text)}${by && sharedTeam() ? ` <small class="lab-by">· diuji ${esc(by)}</small>` : ''}</span></li>`;
    };
    const journalHtml = () => {
      const log = st().log;
      return log.length ? `<ul class="lab-journal-list">${log.map(entryHtml).join('')}</ul>` : '<p class="holo-note">Belum ada uji. Mulailah dengan membandingkan Ruang X dan Ruang Y.</p>';
    };
    const tubeHtml = (room) => `
      <button type="button" class="lab-tube" data-room="${room}" aria-label="Teteskan ke tabung ${ROOMS[room]}">
        <span class="lab-glass" style="--liq:${L.sample}"><span class="lab-liquid"></span><span class="lab-layer"></span><span class="lab-drip"></span><span class="lab-bubbles"><i></i><i></i><i></i><i></i></span></span>
        <b>${ROOMS[room]}</b><small>${room === 'x' ? 'kontrol normal' : 'bermasalah'}</small>
      </button>`;

    function solvedHtml() {
      const s = st();
      const stars = '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars);
      const p = cs.path;
      return `
        <p class="holo-kicker">POS 02 · MEJA UJI REAGEN <em>KASUS TERPECAHKAN</em></p>
        <h2>Jalur macet: ${esc(cs.label)}</h2>
        <p class="lab-stars" aria-label="${s.stars} dari 3 bintang">${stars}</p>
        <ul class="lab-star-why">
          <li class="on">★ Kasus terpecahkan dengan bukti</li>
          <li class="${s.wrong === 0 ? 'on' : ''}">${s.wrong === 0 ? '★' : '☆'} Diagnosis benar pada percobaan pertama</li>
          <li class="${s.control && s.thrifty ? 'on' : ''}">${s.control && s.thrifty ? '★' : '☆'} Memakai kontrol Ruang X dan paling banyak ${L.budget} uji</li>
        </ul>
        <div class="lab-path" aria-label="Animasi jalur yang dipulihkan: ${esc(p.from)} menjadi ${esc(p.mid)} lalu ${esc(p.to)}">
          <div class="lab-chain"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <p><span>${esc(p.from)}</span> <b>✂ ${esc(p.agent)}</b> <span>${esc(p.mid)}</span> → <span>${esc(p.to)}</span></p>
        </div>
        <p class="holo-quote">${esc(cs.explain)}</p>
        <details class="lab-journal"><summary>Jurnal bukti (${s.log.length} uji)</summary>${journalHtml()}</details>
        <p class="holo-note">Bawa temuanmu ke Terminal Arsip dan Papan Laporan. ${s.stars < 3 ? 'Ingin ★★★? Tekan "Ulangi kasus" untuk mencoba lagi.' : ''}</p>
        <div class="holo-duo">
          <button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>
          ${sharedTeam() ? '' : '<button type="button" class="button button-secondary" data-act="replay">Ulangi kasus ↺</button>'}
        </div>`;
    }

    function benchHtml() {
      return `
        <p class="holo-kicker">POS 02 · MEJA UJI REAGEN <em>LATIHAN</em></p>
        <h2>Jalur mana yang macet di Ruang Y?</h2>
        <p class="holo-quote">${esc(L.brief)}</p>
        <p class="lab-drops" role="status">${dropsHtml()}</p>
        <div class="lab-bench">
          <div class="lab-tools" role="group" aria-label="Pilih reagen atau alat">
            ${L.tools.map((t) => `<button type="button" class="lab-tool" data-tool="${t.id}" aria-pressed="false" style="--c:${t.color}"><span class="lab-bottle${t.kind === 'look' ? ' scope' : ''}" aria-hidden="true"></span><b>${esc(t.label)}</b><small>${esc(t.tests)}</small>${owner(it.pos, t.id) ? `<small class="lab-owner">${esc(owner(it.pos, t.id))}</small>` : ''}</button>`).join('')}
          </div>
          <div class="lab-stage">
            <div class="lab-tubes">${tubeHtml('x')}${tubeHtml('y')}</div>
            <div class="lab-scope" hidden aria-hidden="true"><div class="lab-lens"></div></div>
            <button type="button" class="button button-secondary lab-heat" hidden>🔥 Panaskan tabung</button>
          </div>
        </div>
        <p class="lab-readout" role="status" aria-live="polite">Pilih reagen di rak, lalu klik tabung yang ingin diuji.</p>
        <details class="lab-journal" open><summary>Jurnal bukti</summary><div class="lab-journal-body">${journalHtml()}</div></details>
        <form class="holo-form lab-diagnose" novalidate>
          <fieldset class="holo-choices"><legend class="holo-label">Tuduhan: bagian jalur mana yang macet di Ruang Y?</legend>
            ${Object.entries(L.cases).map(([id, c], k) => `<label class="holo-choice"><input type="radio" name="dx" value="${id}" /><span class="mark">${String.fromCharCode(65 + k)}</span><span>${esc(c.label)}</span></label>`).join('')}
          </fieldset>
          <div class="holo-feedback" role="status" aria-live="polite"></div>
          <button type="submit" class="button button-primary">Ajukan tuduhan ⚖${owner(it.pos, 'accuse') ? ` <small>(${esc(owner(it.pos, 'accuse'))})</small>` : ''}</button>
        </form>`;
    }

    function mount(el) {
      const s = st();
      if (s.done) {
        el.querySelector('[data-act="close"]').addEventListener('click', () => closePanel());
        const replay = el.querySelector('[data-act="replay"]');
        if (replay) replay.addEventListener('click', () => {
          update(it.pos, caseId, (lab) => { lab.log = []; lab.wrong = 0; lab.done = false; });
          remount(el);
        });
        requestAnimationFrame(() => el.querySelector('.lab-chain').classList.add('split'));
        return;
      }
      const readout = el.querySelector('.lab-readout');
      const heatBtn = el.querySelector('.lab-heat');
      const scope = el.querySelector('.lab-scope');
      const refreshLog = () => {
        el.querySelector('.lab-drops').innerHTML = dropsHtml();
        el.querySelector('.lab-journal-body').innerHTML = journalHtml();
      };

      el.querySelectorAll('.lab-tool').forEach((b) => b.addEventListener('click', () => {
        if (busy) return;
        const g = gate(it.pos, b.dataset.tool);
        if (!g.ok) { readout.textContent = g.text; shake(b); return; }
        tool = b.dataset.tool;
        el.querySelectorAll('.lab-tool').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        const t = tools[tool];
        readout.textContent = `${g.takeover ? `${g.text} ` : ''}${t.label} dipilih (menguji ${t.tests}). Klik tabung Ruang X atau Ruang Y.`;
      }));

      async function runTest(room) {
        if (busy) return;
        if (!tool) { readout.textContent = 'Pilih dulu reagen atau mikroskop di rak.'; shake(el.querySelector('.lab-tools')); return; }
        busy = true;
        el.classList.add('lab-busy');
        const t = tools[tool];
        const r = result(tool, room);
        const tube = el.querySelector(`.lab-tube[data-room="${room}"]`);
        const glass = tube.querySelector('.lab-glass');
        el.querySelectorAll('.lab-tube').forEach((x) => x.classList.remove('active'));
        tube.classList.add('active');
        glass.className = 'lab-glass';
        glass.style.setProperty('--liq', L.sample);
        glass.style.removeProperty('--layer');
        scope.hidden = true;
        if (t.kind === 'look') {
          readout.textContent = `Mengamati sampel ${ROOMS[room]} di bawah mikroskop…`;
          const [count, size] = r.dots;
          const lens = scope.querySelector('.lab-lens');
          lens.innerHTML = Array.from({ length: count }, (_, i) => {
            const a = (i * 137.5) % 360; const d = 12 + ((i * 29) % 34);
            const sz = size === 'big' ? 16 + ((i * 7) % 12) : 4 + ((i * 3) % 4);
            return `<i style="left:${50 + Math.cos(a * Math.PI / 180) * d}%;top:${50 + Math.sin(a * Math.PI / 180) * d}%;width:${sz}px;height:${sz}px;animation-delay:${(i % 6) * 0.08}s"></i>`;
          }).join('');
          scope.hidden = false;
          scope.classList.remove('zoom'); void scope.offsetWidth; scope.classList.add('zoom');
          await wait(650);
        } else {
          glass.style.setProperty('--drip', t.color);
          glass.classList.add('dripping');
          readout.textContent = `Meneteskan ${t.label} ke ${ROOMS[room]}…`;
          await wait(520);
          glass.style.setProperty('--liq', t.kind === 'heat' ? t.color : mix(L.sample, t.color));
          await wait(380);
          if (t.kind === 'heat') {
            readout.textContent = `Benedict perlu dipanaskan agar bereaksi. Tekan "Panaskan tabung".`;
            heatBtn.hidden = false;
            heatBtn.focus();
            await new Promise((resolve) => heatBtn.addEventListener('click', resolve, { once: true }));
            heatBtn.hidden = true;
            glass.classList.add('boiling');
            readout.textContent = 'Memanaskan di penangas air…';
            await wait(1300);
            glass.classList.remove('boiling');
          }
          glass.style.setProperty('--liq', r.color);
          if (r.layer) { glass.style.setProperty('--layer', r.layer); glass.classList.add('layered'); }
          await wait(450);
        }
        update(it.pos, caseId, (lab) => { lab.log.push({ tool, room, by: game.state.alias || '', at: new Date().toISOString() }); }, `menguji ${ROOMS[room]} dengan ${t.label}`);
        readout.innerHTML = `<b>${ROOMS[room]} · ${esc(t.label)}: ${esc(r.word)}</b> — ${esc(r.text)}`;
        tube.classList.add('result');
        refreshLog();
        busy = false;
        el.classList.remove('lab-busy');
        const n = st().log.length;
        if (n === 1) say('Catatan masuk Jurnal Bukti. Bandingkan dengan tabung lainnya: detektif selalu memakai kontrol!', 'talk');
        else if (n === L.budget) say('Tetes hemat habis. Kamu masih boleh menguji, tetapi bintang hemat hilang. Coba ajukan tuduhan.', 'talk');
      }
      el.querySelectorAll('.lab-tube').forEach((b) => b.addEventListener('click', () => runTest(b.dataset.room)));
      // Uji dari anggota regu lain masuk ke jurnal ini secara langsung.
      const onTeam = () => {
        if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; }
        if (busy) return;
        if (st().done) { document.removeEventListener('nutra:team', onTeam); remount(el); return; }
        refreshLog();
      };
      document.addEventListener('nutra:team', onTeam);

      el.querySelector('.lab-diagnose').addEventListener('submit', (e) => {
        e.preventDefault();
        const fb = el.querySelector('.lab-diagnose .holo-feedback');
        const pick = el.querySelector('input[name="dx"]:checked');
        if (busy) return;
        if (!pick) { fb.innerHTML = '<b class="warn">Pilih dulu bagian jalur yang kamu tuduh.</b>'; shake(el); return; }
        const g = gate(it.pos, 'accuse');
        if (!g.ok) { fb.innerHTML = `<b class="warn">${esc(g.text)}</b> Diskusikan pilihanmu dengannya.`; shake(el); return; }
        const log = st().log;
        if (!log.some((x) => x.room === 'y')) { fb.innerHTML = '<b class="warn">Tuduhan tanpa bukti ditolak.</b> Uji dulu sampel Ruang Y.'; shake(el); nara('shake'); return; }
        if (pick.value !== caseId) {
          update(it.pos, caseId, (lab) => { lab.wrong += 1; }, `mengajukan tuduhan ${L.cases[pick.value].label.split(' ')[0]} (belum cocok)`);
          nara('shake');
          shake(el);
          fb.innerHTML = `<b class="warn">Tuduhan belum cocok dengan bukti.</b> ${esc(L.cases[pick.value].predict)} Apakah Jurnal Bukti menunjukkan itu? Bandingkan lagi dengan kontrol Ruang X.`;
          return;
        }
        const missing = cs.need.filter((group) => !group.some((t) => log.some((x) => x.room === 'y' && x.tool === t)));
        if (missing.length) {
          fb.innerHTML = `<b class="warn">Dugaanmu menarik, tetapi buktinya belum cukup.</b> ${esc(cs.needHint)}`;
          nara('talk');
          return;
        }
        update(it.pos, caseId, (lab, a) => {
          lab.control = log.some((x) => x.room === 'x');
          lab.thrifty = log.length <= L.budget;
          const stars = 1 + (lab.wrong === 0 ? 1 : 0) + (lab.control && lab.thrifty ? 1 : 0);
          lab.stars = stars;
          lab.best = Math.max(lab.best || 0, stars);
          lab.done = true;
          a.stations.lab = true;
        }, `memecahkan kasus Meja Uji Reagen (${cs.label.split(' ')[0]})`);
        onSolved(it, st().stars);
        remount(el);
      });
    }

    function remount(el) {
      el.innerHTML = `<button type="button" class="holo-close" aria-label="Tutup panel (Esc)">×</button>${st().done ? solvedHtml() : benchHtml()}`;
      el.querySelector('.holo-close').addEventListener('click', () => closePanel());
      el.classList.add('holo-lab');
      mount(el);
      const f = el.querySelector('[data-autofocus]') || el.querySelector('.lab-tool');
      if (f) f.focus();
    }

    openPanel(it, st().done ? solvedHtml() : benchHtml(), (el) => { el.classList.add('holo-lab'); mount(el); });
  }

  return { open };
}

// Campuran warna sederhana (rata-rata RGB) untuk warna reagen yang baru diteteskan.
function mix(a, b) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, '0')).join('')}`;
}
