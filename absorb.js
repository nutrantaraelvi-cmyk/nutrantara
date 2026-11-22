/*
 * Pos 3 · Gerbang Penyerapan: membedakan PENCERNAAN (memecah) dan PENYERAPAN (memindahkan).
 *  1. Gerbang Pilah — kartu peristiwa dipilah ke gerbang Pencernaan atau Penyerapan (combo, streak, ★).
 *  2. Simulator Vili 3D — adegan Three.js mini di dalam panel (bisa diputar):
 *     a. molekul besar terpental dari dinding vili sampai dicerna dengan enzim yang cocok;
 *     b. hasil pencernaan diantar ke kapiler darah atau pembuluh kil (animasi mengalir di dalam vili);
 *     c. eksperimen luas permukaan Model P vs Q: pemecahan sama (100 unit), yang berpindah berbeda (80 vs 32).
 * Referensi rancangan: simulasi LabXchange "Villi Absorption" dan lab NetLogo "Villi Height" (luas permukaan ↔ laju
 * penyerapan), serta riset miskonsepsi bahwa siswa sering melupakan/menyamakan tahap penyerapan dengan pencernaan.
 * Formatif: tidak memengaruhi skor. Semua aksi bisa dilakukan dengan tombol (keyboard); kanvas 3D bersifat visual.
 */
import * as THREE from './vendor/three/three.module.min.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function createAbsorption({ game, openPanel, closePanel, shake, say, nara, onDone }) {
  const close = (el) => el.querySelectorAll('[data-act="close"]').forEach((b) => b.addEventListener('click', () => closePanel()));

  // =====================================================================
  // 1. Gerbang Pilah (tumpukan kartu milik regu; kartu ke-k dipegang peran k mod 4)
  // =====================================================================
  function openSorter(it) {
    const m = game.missionById(it.pos);
    const S = m.activity.sorter;
    const TEAM = () => window.NutraTeam || null;
    const ps = () => game.activityState(it.pos).pilah || null;
    if (!ps() || !Array.isArray(ps().deck) || !ps().deck.length) {
      const half = Math.floor(S.deal / 2);
      const pickIdx = (gate) => shuffle(S.cards.map((c, i) => [c, i]).filter(([c]) => c.gate === gate)).slice(0, half).map(([, i]) => i);
      const deck = shuffle([...pickIdx('cerna'), ...pickIdx('serap')]);
      game.updateActivity(it.pos, (a) => { a.pilah = { deck, done: [], wrong: 0, best: 0 }; });
    }
    const gateOf = (k) => (TEAM() ? TEAM().check(it.pos, 'card', null, k) : { ok: true });
    const ownerOf = (k) => (TEAM() ? TEAM().tag(it.pos, 'card', null, k) : '');
    const positions = () => ps().deck.map((_, k) => k);
    let skip = []; // kartu yang salah kirim pindah ke belakang antrean pribadi
    const queue = () => {
      const s = ps();
      const list = positions().filter((k) => !s.done.includes(k) && gateOf(k).ok);
      return [...list.filter((k) => !skip.includes(k)), ...skip.filter((k) => list.includes(k))];
    };
    const waiting = () => positions().filter((k) => !ps().done.includes(k) && !gateOf(k).ok);
    let streak = 0; let busy = false; let current = null; let finished = false;

    openPanel(it, `
      <p class="holo-kicker">POS 03 · GERBANG PILAH <em>LATIHAN</em></p>
      <h2>Cerna atau serap?</h2>
      <p class="holo-quote">Setiap kartu adalah satu peristiwa di saluran pencernaan. Kirim ke gerbang yang benar. Ingat: <b>pencernaan memecah</b>, <b>penyerapan memindahkan</b>.</p>
      <div class="sg-hud" role="status" aria-live="polite"><span class="sg-progress"></span><span class="sg-streak"></span></div>
      <div class="sg-arena">
        <button type="button" class="sg-gate cerna" data-gate="cerna"><span class="sg-arch" aria-hidden="true">⚙</span><b>${esc(S.gates.cerna.label)}</b><small>${esc(S.gates.cerna.hint)}</small><kbd>←</kbd></button>
        <div class="sg-card-wrap"><article class="sg-card" tabindex="-1"></article></div>
        <button type="button" class="sg-gate serap" data-gate="serap"><span class="sg-arch" aria-hidden="true">⇵</span><b>${esc(S.gates.serap.label)}</b><small>${esc(S.gates.serap.hint)}</small><kbd>→</kbd></button>
      </div>
      <p class="sg-wait" aria-live="polite"></p>
      <div class="holo-feedback sg-feedback" role="status" aria-live="polite">Gunakan tombol gerbang atau tombol panah ← →.</div>`, (el) => {
      el.classList.add('holo-wide');
      const card = el.querySelector('.sg-card');
      const fb = el.querySelector('.sg-feedback');
      const allDone = () => ps().done.length >= ps().deck.length;
      const hud = () => {
        el.querySelector('.sg-progress').innerHTML = `${TEAM() && TEAM().shared() ? 'Terpilah regu' : 'Terpilah'} <b>${ps().done.length}/${ps().deck.length}</b> · salah kirim ${ps().wrong || 0}`;
        el.querySelector('.sg-streak').innerHTML = streak >= 2 ? `<b class="sg-combo">🔥 Combo ×${streak}</b>` : `Streak ${streak}`;
        const w = waiting();
        el.querySelector('.sg-wait').textContent = w.length ? `⏳ ${w.length} kartu dipegang anggota lain: ${[...new Set(w.map(ownerOf))].join(', ')}. Ajak mereka memilah!` : '';
      };
      function showCard() {
        hud();
        if (allDone()) { finish(); return; }
        const q = queue();
        if (!q.length) {
          current = null;
          card.className = 'sg-card idle';
          card.innerHTML = '<span class="sg-tag">GILIRAN REGU</span><p>Kartumu sudah habis! Tunggu anggota lain memilah kartunya, lalu diskusikan alasannya bersama.</p>';
          return;
        }
        current = q[0];
        const c = S.cards[ps().deck[current]];
        card.className = 'sg-card enter';
        card.innerHTML = `<span class="sg-tag">PERISTIWA ${current + 1}/${ps().deck.length}</span><p>${esc(c.text)}</p>${ownerOf(current) ? `<small class="sg-owner">${esc(ownerOf(current))}</small>` : ''}`;
      }
      function finish() {
        if (finished) return;
        finished = true;
        current = null;
        const s = ps();
        const stars = !s.wrong ? 3 : s.wrong <= 2 ? 2 : 1;
        const already = Boolean(game.activityState(it.pos).stations.sortir);
        if (!already) {
          game.updateActivity(it.pos, (a) => {
            a.sort = { stars: Math.max(stars, (a.sort && a.sort.stars) || 0), best: Math.max(s.best || 0, (a.sort && a.sort.best) || 0) };
            a.stations.sortir = true;
          }, 'menuntaskan Gerbang Pilah');
        }
        el.querySelector('.sg-arena').innerHTML = `<div class="sg-result"><p class="lab-stars">${starText(stars)}</p><p><b>Semua kartu terpilah!</b> Salah kirim: ${s.wrong || 0} · streak terbaik: ${s.best || 0}</p></div>`;
        el.querySelector('.sg-wait').textContent = '';
        fb.innerHTML = '<b class="ok">✓ Kunci gerbang:</b> pencernaan <b>memecah</b> molekul besar menjadi kecil; penyerapan <b>memindahkan</b> molekul kecil ke darah atau limfa. Enzim di mikrovili tetap termasuk pencernaan.';
        const solo = !(TEAM() && TEAM().shared());
        fb.insertAdjacentHTML('afterend', `<div class="holo-duo"><button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>${solo ? '<button type="button" class="button button-secondary" data-act="again">Main lagi ↺</button>' : ''}</div>`);
        close(el);
        const again = el.querySelector('[data-act="again"]');
        if (again) again.addEventListener('click', () => { game.updateActivity(it.pos, (a) => { a.pilah = null; }); openSorter(it); });
        el.querySelector('[data-act="close"]').focus();
        document.removeEventListener('keydown', onKey);
        if (!already) onDone(it, stars, 'sortir');
      }
      function send(gate) {
        if (busy || current === null) return;
        const k = current;
        const c = S.cards[ps().deck[k]];
        const g = gateOf(k);
        const gateEl = el.querySelector(`.sg-gate[data-gate="${gate}"]`);
        busy = true;
        if (c.gate === gate) {
          streak += 1;
          card.className = `sg-card fly-${gate}`;
          gateEl.classList.remove('hit'); void gateEl.offsetWidth; gateEl.classList.add('hit');
          fb.innerHTML = `<b class="ok">✓ ${esc(S.gates[gate].label)}.</b> ${esc(c.why)}`;
          game.updateActivity(it.pos, (a) => { if (!a.pilah.done.includes(k)) a.pilah.done.push(k); a.pilah.best = Math.max(a.pilah.best || 0, streak); }, `memilah kartu ke ${S.gates[gate].label}${g.takeover ? ' (mengambil alih)' : ''}`);
          skip = skip.filter((x) => x !== k);
          setTimeout(() => { busy = false; showCard(); }, reduced() ? 50 : 520);
        } else {
          streak = 0;
          card.className = 'sg-card bounce';
          gateEl.classList.remove('miss'); void gateEl.offsetWidth; gateEl.classList.add('miss');
          nara('shake');
          fb.innerHTML = `<b class="warn">Bukan ${esc(S.gates[gate].label.toLowerCase())}.</b> ${esc(c.why)} Kartu ini kembali ke tumpukan.`;
          game.updateActivity(it.pos, (a) => { a.pilah.wrong = (a.pilah.wrong || 0) + 1; });
          skip = [...skip.filter((x) => x !== k), k];
          setTimeout(() => { busy = false; showCard(); }, reduced() ? 50 : 650);
        }
      }
      const onKey = (e) => {
        if (!el.isConnected) { document.removeEventListener('keydown', onKey); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); send('cerna'); }
        if (e.key === 'ArrowRight') { e.preventDefault(); send('serap'); }
      };
      document.addEventListener('keydown', onKey);
      // Kartu yang dipilah anggota lain ikut tercatat di sini.
      const onTeam = () => {
        if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; }
        if (busy || finished || !ps()) return;
        if (allDone()) { finish(); return; }
        if (current === null || ps().done.includes(current)) showCard(); else hud();
      };
      document.addEventListener('nutra:team', onTeam);
      el.querySelectorAll('.sg-gate').forEach((b) => b.addEventListener('click', () => send(b.dataset.gate)));
      showCard();
    });
  }

  // =====================================================================
  // 2. Simulator Vili 3D
  // =====================================================================
  function openVilli(it) {
    const m = game.missionById(it.pos);
    const V = m.activity.villi;
    const mols = Object.fromEntries(V.molecules.map((x) => [x.id, x]));
    const vs = () => {
      const a = game.activityState(it.pos);
      if (!a.villi) a.villi = { mols: {}, ran: {}, mistakes: 0, done: false, stars: 0 };
      return a.villi;
    };
    const save = (fn, note) => game.updateActivity(it.pos, (a) => { if (!a.villi) a.villi = { mols: {}, ran: {}, mistakes: 0, done: false, stars: 0 }; fn(a.villi, a); }, note);
    // Regu: Pemecah mencerna, Pengantar mengantar, Peneliti P/Q menjalankan modelnya masing-masing.
    const TEAM = () => window.NutraTeam || null;
    const gate = (key) => (TEAM() ? TEAM().check(it.pos, 'villi', key) : { ok: true });
    const owner = (key) => (TEAM() ? TEAM().tag(it.pos, 'villi', key) : '');
    const sharedTeam = () => Boolean(TEAM() && TEAM().shared());
    const molState = (id) => vs().mols[id] || 'utuh'; // utuh → dicerna → diserap
    const allAbsorbed = () => V.molecules.every((x) => molState(x.id) === 'diserap');
    let selected = V.molecules.find((x) => molState(x.id) !== 'diserap')?.id || null;
    let model = 'P';
    let last = { formed: 0, crossed: 0 }; // hasil aliran terakhir, agar meter tidak kosong setelah render ulang
    let busy = false;
    let sim = null;

    const molButtons = () => V.molecules.map((x) => {
      const s = molState(x.id);
      return `<button type="button" class="vl-mol${selected === x.id ? ' on' : ''}" data-mol="${x.id}" aria-pressed="${selected === x.id}"${s === 'diserap' ? ' disabled' : ''} style="--c:${x.color}">
        <span class="vl-dot ${s}" aria-hidden="true"></span><b>${esc(s === 'utuh' ? x.label : x.product)}</b>
        <small>${s === 'utuh' ? 'molekul besar · belum dicerna' : s === 'dicerna' ? 'molekul kecil · siap diserap' : '✓ sudah diserap'}</small></button>`;
    }).join('');

    function phaseHtml() {
      const s = vs();
      if (s.done) {
        return `<div class="vl-done"><p class="lab-stars">${starText(s.stars)}</p>
          <p><b>Gerbang penyerapan pulih!</b> ${esc(V.conclusion.explain)}</p>
          <table class="vl-table"><caption class="sr-only">Hasil eksperimen</caption><thead><tr><th>Model</th><th>Terbentuk (pencernaan)</th><th>Berpindah ke darah (penyerapan)</th></tr></thead>
          <tbody>${['P', 'Q'].map((k) => `<tr><th>${esc(V.models[k].label)}</th><td>100 unit</td><td>${V.models[k].cross} unit</td></tr>`).join('')}</tbody></table>
          <div class="holo-duo"><button type="button" class="button button-primary" data-act="close" data-autofocus>Lanjut ↗</button>${sharedTeam() ? '' : '<button type="button" class="button button-secondary" data-act="replay">Main lagi ↺</button>'}</div></div>`;
      }
      if (!allAbsorbed()) {
        const cur = selected ? mols[selected] : null;
        const st = cur ? molState(cur.id) : null;
        return `<p class="vl-step"><b>Tahap 1 · Cerna, lalu serap.</b> Pilih molekul (klik di layar 3D atau tombol), lalu pilih aksinya.</p>
          <div class="vl-mols" role="group" aria-label="Molekul di rongga usus">${molButtons()}</div>
          <div class="vl-actions"${cur ? '' : ' hidden'}>
            <div class="vl-row"><span>✂ Cerna dengan${owner('digest') ? `<small class="vl-owner">${esc(owner('digest'))}</small>` : ''}</span>${V.enzymes.map((e) => `<button type="button" class="button button-secondary vl-enz" data-enz="${e.id}"${st !== 'utuh' ? ' disabled' : ''}>${esc(e.label)}</button>`).join('')}</div>
            <div class="vl-row"><span>⇵ Serap ke${owner('route') ? `<small class="vl-owner">${esc(owner('route'))}</small>` : ''}</span>${Object.entries(V.routes).map(([id, r]) => `<button type="button" class="button button-secondary vl-route ${id}" data-route="${id}">${esc(r.label)}</button>`).join('')}</div>
          </div>`;
      }
      const ran = s.ran || {};
      return `<p class="vl-step"><b>Tahap 2 · Eksperimen luas permukaan.</b> Alirkan 100 unit asam amino hasil pencernaan melewati vili Model P dan Model Q.</p>
        <div class="vl-models" role="radiogroup" aria-label="Pilih model usus">${['P', 'Q'].map((k) => `<label class="vl-model${model === k ? ' on' : ''}"><input type="radio" name="vl-model" value="${k}"${model === k ? ' checked' : ''} /><b>${esc(V.models[k].label)}</b><small>luas permukaan ${V.models[k].surface}%${ran[k] ? ' · ✓ sudah diuji' : ''}${owner(k) ? ` · ${esc(owner(k))}` : ''}</small></label>`).join('')}</div>
        <button type="button" class="button button-primary vl-run">▶ Alirkan 100 unit asam amino</button>
        <div class="vl-meters">
          <div><span>Terbentuk (hasil pencernaan)</span><i><em class="vl-bar formed" style="width:${last.formed}%"></em></i><b class="vl-formed">${last.formed}</b></div>
          <div><span>Berpindah ke darah (penyerapan)</span><i><em class="vl-bar crossed" style="width:${last.crossed}%"></em></i><b class="vl-crossed">${last.crossed}</b></div>
        </div>
        <ul class="vl-log">${['P', 'Q'].filter((k) => ran[k]).map((k) => `<li>${esc(V.models[k].label)}: terbentuk 100 unit, berpindah ${V.models[k].cross} unit</li>`).join('')}</ul>
        ${ran.P && ran.Q ? `<form class="holo-form vl-conclude" novalidate><fieldset class="holo-choices"><legend class="holo-label">${esc(V.conclusion.question)}</legend>
          ${V.conclusion.options.map((o, k) => `<label class="holo-choice"><input type="radio" name="vl-c" value="${o.value}" /><span class="mark">${String.fromCharCode(65 + k)}</span><span>${esc(o.text)}</span></label>`).join('')}</fieldset>
          <button type="submit" class="button button-primary">Simpulkan ↗</button></form>` : ''}`;
    }

    openPanel(it, `
      <p class="holo-kicker">POS 03 · SIMULATOR VILI 3D <em>LATIHAN</em></p>
      <h2>Cerna dulu, baru serap!</h2>
      <div class="vl-view">
        <canvas class="vl-canvas" aria-label="Model 3D penampang vili usus halus. Bisa diputar dengan menyeret."></canvas>
        <span class="vl-tag lumen">RONGGA USUS (lumen)</span><span class="vl-tag blood">● kapiler darah</span><span class="vl-tag lymph">● pembuluh kil</span>
        <span class="vl-hint">Seret untuk memutar · klik molekul</span>
      </div>
      <p class="vl-readout" role="status" aria-live="polite">Molekul makanan melayang di rongga usus. Bisakah langsung menembus dinding vili?</p>
      <div class="vl-phase"></div>`, (el) => {
      el.classList.add('holo-wide');
      const readout = el.querySelector('.vl-readout');
      sim = createVilliScene(el.querySelector('.vl-canvas'), V, (id) => { if (!busy && !allAbsorbed() && molState(id) !== 'diserap') { selected = id; render(); } });
      if (sim) V.molecules.forEach((x) => sim.setMolecule(x.id, molState(x.id), x));
      if (sim) sim.setModel(model, true);

      function render() {
        el.querySelector('.vl-phase').innerHTML = phaseHtml();
        if (sim) sim.highlight(allAbsorbed() ? null : selected);
        bind();
      }
      function bind() {
        const phase = el.querySelector('.vl-phase');
        close(phase);
        const replay = phase.querySelector('[data-act="replay"]');
        if (replay) replay.addEventListener('click', () => {
          save((s) => { s.mols = {}; s.ran = {}; s.mistakes = 0; s.done = false; });
          selected = V.molecules[0].id;
          model = 'P';
          if (sim) { V.molecules.forEach((x) => sim.setMolecule(x.id, 'utuh', x)); sim.setModel('P'); }
          readout.textContent = 'Simulasi diulang. Molekul makanan kembali ke rongga usus.';
          render();
        });
        phase.querySelectorAll('.vl-mol').forEach((b) => b.addEventListener('click', () => { if (busy) return; selected = b.dataset.mol; const x = mols[selected]; readout.textContent = `${molState(x.id) === 'utuh' ? x.label : x.product} dipilih.`; render(); }));
        phase.querySelectorAll('.vl-enz').forEach((b) => b.addEventListener('click', () => digest(b.dataset.enz)));
        phase.querySelectorAll('.vl-route').forEach((b) => b.addEventListener('click', () => absorb(b.dataset.route)));
        phase.querySelectorAll('input[name="vl-model"]').forEach((r) => r.addEventListener('change', () => { if (busy) return; model = r.value; if (sim) sim.setModel(model); render(); }));
        const run = phase.querySelector('.vl-run');
        if (run) run.addEventListener('click', runExperiment);
        const form = phase.querySelector('.vl-conclude');
        if (form) form.addEventListener('submit', conclude);
      }
      const mistake = () => { save((s) => { s.mistakes += 1; }); nara('shake'); };

      async function digest(enz) {
        if (busy || !selected) return;
        const g = gate('digest');
        if (!g.ok) { readout.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        const x = mols[selected];
        busy = true;
        if (enz !== x.enzyme) {
          mistake();
          readout.innerHTML = `<b class="warn">${esc(x.wrongEnzyme)}</b>`;
          if (sim) await sim.wobble(x.id); else shake(el);
          busy = false;
          return;
        }
        readout.innerHTML = `✂ ${esc(V.enzymes.find((e) => e.id === enz).label)} memecah ${esc(x.label.toLowerCase())}…`;
        if (sim) await sim.split(x.id, x);
        save((s) => { s.mols[x.id] = 'dicerna'; }, `mencerna ${x.label} di Simulator Vili`);
        readout.innerHTML = `<b class="ok">✓ Pencernaan:</b> ${esc(x.label)} terpecah menjadi <b>${esc(x.product.toLowerCase())}</b>. Molekulnya kecil sekarang. Ke mana ia diserap?`;
        busy = false;
        render();
      }

      async function absorb(route) {
        if (busy || !selected) return;
        const g = gate('route');
        if (!g.ok) { readout.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        const x = mols[selected];
        busy = true;
        if (molState(x.id) === 'utuh') {
          mistake();
          readout.innerHTML = `<b class="warn">${esc(V.tooBig)}</b>`;
          if (sim) await sim.bounce(x.id); else shake(el);
          busy = false;
          return;
        }
        if (route !== x.route) {
          mistake();
          readout.innerHTML = `<b class="warn">Jalur salah.</b> ${esc(x.wrongRoute)}`;
          if (sim) await sim.bounce(x.id); else shake(el);
          busy = false;
          return;
        }
        readout.innerHTML = `⇵ ${esc(x.product)} menembus dinding vili…`;
        if (sim) await sim.absorb(x.id, route);
        save((s) => { s.mols[x.id] = 'diserap'; }, `mengantar ${x.product} ke ${V.routes[route].label}`);
        readout.innerHTML = `<b class="ok">✓ Penyerapan:</b> ${esc(x.product)} masuk ${esc(V.routes[route].path)}.`;
        selected = V.molecules.find((y) => molState(y.id) !== 'diserap')?.id || null;
        busy = false;
        if (allAbsorbed()) say('Semua hasil pencernaan terserap! Sekarang uji: apa yang terjadi jika permukaan vili menyempit?', 'celebrate');
        render();
      }

      async function runExperiment() {
        if (busy) return;
        const g = gate(model);
        if (!g.ok) { readout.innerHTML = `<b class="warn">${esc(g.text)}</b>`; return; }
        busy = true;
        el.querySelectorAll('.vl-run, input[name="vl-model"]').forEach((b) => { b.disabled = true; });
        const M = V.models[model];
        const formed = el.querySelector('.vl-formed'); const crossed = el.querySelector('.vl-crossed');
        const bars = { f: el.querySelector('.vl-bar.formed'), c: el.querySelector('.vl-bar.crossed') };
        readout.textContent = `Mengalirkan 100 unit asam amino melewati ${M.label}…`;
        const onTick = (f, c) => { formed.textContent = f; crossed.textContent = c; bars.f.style.width = `${f}%`; bars.c.style.width = `${c}%`; };
        if (sim) await sim.flow(model, M.cross, onTick); else onTick(100, M.cross);
        onTick(100, M.cross);
        last = { formed: 100, crossed: M.cross };
        save((s) => { s.ran = { ...(s.ran || {}), [model]: true }; }, `menjalankan eksperimen ${M.label.split(' ·')[0]}`);
        const ran = vs().ran;
        readout.innerHTML = `<b>${esc(M.label)}:</b> terbentuk 100 unit, berpindah ke darah <b>${M.cross} unit</b>. ${ran.P && ran.Q ? 'Bandingkan kedua model, lalu simpulkan.' : `Sekarang uji ${model === 'P' ? 'Model Q' : 'Model P'}.`}`;
        busy = false;
        if (!(ran.P && ran.Q)) { model = model === 'P' ? 'Q' : 'P'; if (sim) sim.setModel(model); }
        render();
      }

      function conclude(e) {
        e.preventDefault();
        const pick = el.querySelector('input[name="vl-c"]:checked');
        if (!pick) { readout.innerHTML = '<b class="warn">Pilih kesimpulanmu terlebih dahulu.</b>'; return; }
        if (pick.value !== V.conclusion.correct) {
          mistake();
          shake(el.querySelector('.vl-conclude'));
          readout.innerHTML = `<b class="warn">Belum tepat.</b> Lihat meter "Terbentuk": kedua model sama-sama 100 unit. Bagian mana yang berbeda?`;
          return;
        }
        save((s, a) => {
          s.stars = s.mistakes === 0 ? 3 : s.mistakes <= 2 ? 2 : 1;
          s.best = Math.max(s.best || 0, s.stars);
          s.done = true;
          a.stations.vili = true;
        }, 'menyimpulkan eksperimen Simulator Vili');
        readout.innerHTML = '<b class="ok">✓ Tepat!</b> Pencernaan sama, penyerapan berbeda.';
        if (sim) { sim.setModel('P'); sim.celebrate(); } // vili tumbuh kembali: gerbang pulih
        onDone(it, vs().stars, 'vili');
        render();
      }

      // Aksi anggota regu lain (mencerna, mengantar, eksperimen) tampil langsung di adegan ini.
      const onTeam = () => {
        if (!el.isConnected) { document.removeEventListener('nutra:team', onTeam); return; }
        if (busy) return;
        if (sim) V.molecules.forEach((x) => { if (sim.stateOf(x.id) !== molState(x.id)) sim.setMolecule(x.id, molState(x.id), x); });
        if (selected && molState(selected) === 'diserap') selected = V.molecules.find((y) => molState(y.id) !== 'diserap')?.id || null;
        render();
      };
      document.addEventListener('nutra:team', onTeam);
      render();
    });
  }

  return { openSorter, openVilli };
}

// =====================================================================
// Adegan 3D mini: penampang vili usus halus
// =====================================================================
function createVilliScene(canvas, V, onPick) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.replaceWith(Object.assign(document.createElement('p'), { className: 'holo-note', textContent: 'Tampilan 3D tidak tersedia di perangkat ini. Simulasi tetap bisa dijalankan dengan tombol di bawah.' }));
    return null;
  }
  const slow = reduced() ? 0.15 : 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 2, 0.1, 100);
  camera.position.set(0, 3.9, 12.5);
  camera.lookAt(0, 2.1, 0);
  scene.add(new THREE.HemisphereLight('#fff4ec', '#c0566a', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(3, 8, 6);
  scene.add(sun);
  const world = new THREE.Group();
  scene.add(world);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });

  // Dinding usus (epitel) + otot di bawahnya.
  const base = new THREE.Mesh(new THREE.BoxGeometry(12, 0.7, 3.2), mat('#f0a3a3'));
  base.position.y = -0.35;
  world.add(base);
  const muscle = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 3.2), mat('#c8566a'));
  muscle.position.y = -0.95;
  world.add(muscle);

  // Vili: lima tonjolan jari; vili tengah tembus pandang memperlihatkan kapiler (merah) dan pembuluh kil (kuning).
  const villi = [];
  const X = [-4.4, -2.2, 0, 2.2, 4.4];
  X.forEach((x, i) => {
    const center = i === 2;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.4, 6, 16), mat('#f6b7b0', center ? { transparent: true, opacity: 0.35, depthWrite: false } : {}));
    body.position.y = 1.2;
    g.add(body);
    // Mikrovili: rumbai kecil di permukaan (brush border).
    const fuzz = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 5), mat('#f9c8c0'), 40);
    const q = new THREE.Object3D();
    for (let k = 0; k < 40; k += 1) {
      const a = (k / 40) * Math.PI * 2 * 3; const h = 0.3 + (k / 40) * 2.6;
      const r = h > 2.4 ? 0.55 * Math.sqrt(Math.max(0, 1 - ((h - 2.4) / 0.6) ** 2)) + 0.02 : 0.57;
      q.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
      q.lookAt(Math.cos(a) * 3, h, Math.sin(a) * 3);
      q.rotateX(Math.PI / 2);
      q.updateMatrix();
      fuzz.setMatrixAt(k, q.matrix);
    }
    g.add(fuzz);
    if (center) {
      const lacteal = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 2.2, 4, 10), mat('#f7e39a', { emissive: '#f7e39a', emissiveIntensity: 0.2 }));
      lacteal.position.y = 1.15;
      g.add(lacteal);
      g.userData.lacteal = lacteal;
    }
    const capCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, -0.2, 0.1), new THREE.Vector3(-0.4, 1.2, 0.25), new THREE.Vector3(-0.3, 2.4, 0.2),
      new THREE.Vector3(0, 2.85, 0), new THREE.Vector3(0.3, 2.4, -0.2), new THREE.Vector3(0.4, 1.2, -0.25), new THREE.Vector3(0.38, -0.2, -0.1)
    ]);
    const cap = new THREE.Mesh(new THREE.TubeGeometry(capCurve, 40, center ? 0.07 : 0.05, 6), mat('#e0473f', { emissive: '#e0473f', emissiveIntensity: center ? 0.25 : 0 }));
    cap.visible = center;
    g.add(cap);
    g.position.x = x;
    g.userData = { ...g.userData, fuzz, cap, capCurve, body, target: 1 };
    world.add(g);
    villi.push(g);
  });
  // Pembuluh keluar di bawah dinding: vena (merah) ke kanan menuju hati, pembuluh limfa (kuning) ke kiri.
  const pipe = (pts, color, r) => { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))); const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 40, r, 6), mat(color)); world.add(mesh); return c; };
  const veinOut = pipe([[0.38, -0.2, -0.1], [0.9, -0.45, 1.75], [3.5, -0.55, 1.85], [6.2, -0.5, 1.85]], '#e0473f', 0.1);
  const lymphOut = pipe([[0, -0.05, 0], [-0.6, -0.45, 1.75], [-3.5, -0.55, 1.85], [-6.2, -0.5, 1.85]], '#f2d16b', 0.1);

  // Molekul makanan di rongga usus.
  const molecules = {};
  const homes = { amilum: [-3.3, 4.1, 0.6], protein: [0, 4.45, 0.8], lemak: [3.3, 4.05, 0.6] };
  const bead = (color, r = 0.22) => new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color, { emissive: color, emissiveIntensity: 0.15 }));
  function buildIntact(def) {
    const g = new THREE.Group();
    if (def.shape === 'blob') { for (let i = 0; i < 6; i += 1) { const b = bead(def.color, 0.36); b.position.set(Math.cos(i) * 0.38, Math.sin(i * 2) * 0.28, Math.sin(i) * 0.3); g.add(b); } }
    else for (let i = 0; i < 7; i += 1) { const b = bead(def.color); b.position.set((i - 3) * 0.36, def.shape === 'fold' ? Math.sin(i * 1.4) * 0.35 : Math.sin(i) * 0.1, def.shape === 'fold' ? Math.cos(i * 1.4) * 0.25 : 0); g.add(b); }
    return g;
  }
  function buildPieces(def) {
    const g = new THREE.Group();
    const n = def.shape === 'blob' ? 4 : 6;
    for (let i = 0; i < n; i += 1) {
      const b = bead(def.shape === 'blob' && i === n - 1 ? '#ffffff' : def.color, 0.15);
      const a = (i / n) * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.35, Math.sin(a) * 0.2);
      g.add(b);
    }
    return g;
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }));
  halo.visible = false;
  world.add(halo);

  function setMolecule(id, state, def) {
    const old = molecules[id];
    if (old) world.remove(old.group);
    if (state === 'diserap') { delete molecules[id]; return; }
    const group = state === 'utuh' ? buildIntact(def) : buildPieces(def);
    group.position.set(...homes[id]);
    group.userData.pick = id;
    group.traverse((o) => { o.userData.pick = id; });
    world.add(group);
    molecules[id] = { group, def, state, home: new THREE.Vector3(...homes[id]) };
  }
  let highlighted = null;
  function highlight(id) { highlighted = id; halo.visible = Boolean(id && molecules[id]); }

  // ---------- Animasi ----------
  const tweens = [];
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  function along(obj, points, dur) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => p.clone()));
    return new Promise((done) => tweens.push({ dur: dur * slow, t: 0, step: (k) => obj.position.copy(curve.getPoint(ease(k))), done }));
  }
  const timed = (dur, step) => new Promise((done) => tweens.push({ dur: dur * slow, t: 0, step, done }));
  const villusTop = (i = 2) => new THREE.Vector3(villi[i].position.x, villi[i].scale.y * 2.9 + 0.3, 0.4);

  async function bounce(id) {
    const m = molecules[id]; if (!m) return;
    const g = m.group; const top = villusTop();
    await along(g, [m.home, new THREE.Vector3((m.home.x + top.x) / 2, (m.home.y + top.y) / 2 + 0.3, 0.6), top], 0.55);
    await timed(0.25, (k) => { g.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.25); });
    await along(g, [top, new THREE.Vector3(top.x, top.y + 1.4, 0.8), m.home], 0.6);
  }
  async function wobble(id) {
    const m = molecules[id]; if (!m) return;
    await timed(0.6, (k) => { m.group.rotation.z = Math.sin(k * Math.PI * 6) * 0.35 * (1 - k); });
  }
  async function split(id, def) {
    const m = molecules[id]; if (!m) return;
    const g = m.group;
    await timed(0.35, (k) => { g.scale.setScalar(1 + k * 0.2); g.rotation.y = k * Math.PI; });
    // Gunting enzim: kilatan putih, lalu manik-manik memisah.
    await timed(0.7, (k) => { g.children.forEach((b, i) => { b.position.multiplyScalar(1 + 0.03 * (1 - k)); b.rotation.y = i + k * 4; }); g.scale.setScalar(1.2 - k * 0.2); });
    setMolecule(id, 'dicerna', def);
    const pieces = molecules[id].group;
    await timed(0.5, (k) => { pieces.scale.setScalar(0.4 + 0.6 * k); });
  }
  async function absorb(id, route) {
    const m = molecules[id]; if (!m) return;
    const g = m.group; const c = villi[2];
    const top = villusTop();
    halo.visible = false;
    await along(g, [m.home, new THREE.Vector3((m.home.x) / 2, top.y + 0.8, 0.6), top], 0.7);
    await timed(0.25, (k) => { g.scale.setScalar(1 - k * 0.55); });
    let inside;
    if (route === 'darah') {
      inside = c.userData.capCurve.getPoints(16).slice(3).map((p) => p.clone().multiply(c.scale).add(c.position));
      inside.push(...veinOut.getPoints(10));
      c.userData.cap.material.emissiveIntensity = 0.9;
    } else {
      inside = [new THREE.Vector3(0, 2.5 * c.scale.y, 0), new THREE.Vector3(0, 1.2 * c.scale.y, 0), new THREE.Vector3(0, 0, 0)];
      inside.push(...lymphOut.getPoints(10));
      if (c.userData.lacteal) c.userData.lacteal.material.emissiveIntensity = 0.9;
    }
    await along(g, [top, ...inside], 2.2);
    c.userData.cap.material.emissiveIntensity = 0.25;
    if (c.userData.lacteal) c.userData.lacteal.material.emissiveIntensity = 0.2;
    world.remove(g);
    delete molecules[id];
  }

  // Model P: vili tinggi + mikrovili; Model Q: vili pendek, mikrovili hilang.
  let modelKey = 'P';
  function setModel(key, instant) {
    modelKey = key;
    villi.forEach((v) => { v.userData.target = key === 'P' ? 1 : 0.42; v.userData.fuzz.visible = key === 'P'; if (instant) v.scale.y = v.userData.target; });
  }

  async function flow(key, crossPct, onTick) {
    const n = 25; const unit = 100 / n; const crossN = Math.round(crossPct / unit);
    const fates = shuffle(Array.from({ length: n }, (_, i) => i < crossN));
    let formed = 0; let crossed = 0;
    const jobs = fates.map(async (cross, i) => {
      await timed(0.12 * i, () => {});
      const b = bead('#ff8f7a', 0.13);
      const z = -0.6 + Math.random() * 1.6;
      b.position.set(-6, 3.8 + Math.random() * 0.8, z);
      world.add(b);
      formed += 1; onTick(Math.round(formed * unit), Math.round(crossed * unit));
      const vi = Math.floor(Math.random() * villi.length);
      const v = villi[vi];
      const over = new THREE.Vector3(v.position.x, v.scale.y * 2.9 + 0.5, z);
      if (cross) {
        await along(b, [b.position.clone(), new THREE.Vector3((b.position.x + over.x) / 2, 4, z), over], 0.9 + Math.random() * 0.4);
        await along(b, [over, new THREE.Vector3(v.position.x, 0.3, z * 0.3), new THREE.Vector3(v.position.x + 0.5, -0.7, 0.9)], 0.7);
        crossed += 1; onTick(Math.round(formed * unit), Math.round(crossed * unit));
      } else {
        await along(b, [b.position.clone(), over, new THREE.Vector3(over.x + 1.6, over.y + 0.2, z), new THREE.Vector3(6.4, 3.2, z)], 1.6 + Math.random() * 0.4);
      }
      world.remove(b);
    });
    await Promise.all(jobs);
  }

  function celebrate() {
    for (let i = 0; i < 24; i += 1) {
      const b = bead(['#f2c94c', '#ff8f7a', '#78f4bd', '#68dce7'][i % 4], 0.1);
      b.position.set(0, 3.2, 0.5);
      world.add(b);
      const to = new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 2, (Math.random() - 0.5) * 2);
      along(b, [b.position.clone(), to, to.clone().setY(-1)], 1.6).then(() => world.remove(b));
    }
  }

  // ---------- Interaksi: seret untuk memutar, klik untuk memilih ----------
  const ray = new THREE.Raycaster();
  let drag = null; let yaw = 0; let pitch = 0;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    yaw = Math.max(-0.9, Math.min(0.9, drag.yaw + dx * 0.008));
    pitch = Math.max(-0.25, Math.min(0.35, drag.pitch + dy * 0.004));
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved) {
      const r = canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(Object.values(molecules).map((m) => m.group), true)[0];
      if (hit && hit.object.userData.pick) onPick(hit.object.userData.pick);
    }
    drag = null;
  });

  // ---------- Loop render (berhenti & membersihkan diri saat panel ditutup) ----------
  let last = performance.now();
  function frame(now) {
    if (!canvas.isConnected) { dispose(); return; }
    const real = Math.max(0, (now - last) / 1000); last = now;
    const dt = Math.min(0.05, real); // gerak idle dibatasi; tween memakai waktu nyata agar tidak melambat di perangkat lambat
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }
    world.rotation.y += (yaw - world.rotation.y) * 0.15;
    world.rotation.x += (pitch - world.rotation.x) * 0.15;
    const t = now / 1000;
    villi.forEach((v, i) => {
      v.scale.y += (v.userData.target - v.scale.y) * Math.min(1, dt * 3);
      v.rotation.z = reduced() ? 0 : Math.sin(t * 1.3 + i) * 0.04;
    });
    Object.values(molecules).forEach((m, i) => {
      m.group.rotation.y += dt * 0.6;
      if (!reduced()) m.group.children.forEach((b, k) => { b.position.y += Math.sin(t * 2 + k + i) * 0.0015; });
    });
    if (highlighted && molecules[highlighted]) {
      halo.visible = true;
      halo.position.copy(molecules[highlighted].group.position);
      halo.rotation.set(Math.PI / 2 + Math.sin(t) * 0.3, 0, t);
    }
    for (let i = tweens.length - 1; i >= 0; i -= 1) {
      const tw = tweens[i];
      tw.t += real;
      const k = tw.dur <= 0 ? 1 : Math.min(1, tw.t / tw.dur);
      tw.step(k);
      if (k >= 1) { tweens.splice(i, 1); tw.done(); }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  function dispose() {
    tweens.splice(0).forEach((tw) => tw.done());
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    renderer.dispose();
  }
  requestAnimationFrame(frame);

  const stateOf = (id) => (molecules[id] ? molecules[id].state : 'diserap');
  return { setMolecule, stateOf, highlight, bounce, wobble, split, absorb, setModel, flow, celebrate, get model() { return modelKey; } };
}
