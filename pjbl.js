/* NUTRANTARA — layar Proyek PjBL POS 1–6 (sejak 1.3). Skrip biasa (defer) setelah net.js dan game.js → window.NutraPjbl.
 * Daring: setiap aksi dikirim ke server (`net.pjbl`), server menilai dan mengirim balik keadaan kelompok.
 * Luring/tamu: aksi yang sama dijalankan di peramban dengan NUTRANTARA_PJBL_CORE dan disimpan di localStorage.
 * Isi soal dan aturan ada di pjbl-data.js; logika penilaian di pjbl-core.js (dipakai juga oleh server). */
(() => {
  const C = window.NUTRANTARA_PJBL_CORE;
  const net = window.NutraNet;
  const game = window.NutraGame;
  if (!C || !game) return;
  const P = C.data;
  const S = P.pos6;
  const R = P.rules;
  const LOCAL_PREFIX = 'nutrantara-pjbl-v1:';

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) => String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const rp = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;
  const num = (n) => String(n).replace('.', ',');
  const toast = (m) => game.showToast(m);

  let activePos = 1;
  let localKey = '';
  let local = null; // { mine, group } saat luring
  let draft = null; // rancangan menu POS 6 yang sedang diedit
  let draftDirty = false;
  let pendingRender = false;

  const online = () => Boolean(net && net.status().joined && net.pjblState);
  const alias = () => (game.state && game.state.alias) || '';
  const seed = () => alias().toLocaleLowerCase('id');

  function loadLocal() {
    const key = LOCAL_PREFIX + seed();
    if (local && key === localKey) return local;
    localKey = key;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(key)); } catch { raw = null; }
    raw = raw && typeof raw === 'object' ? raw : {};
    local = { mine: C.normMine(raw.mine), group: C.normGroup(raw.group) };
    return local;
  }
  function saveLocal() {
    try { localStorage.setItem(localKey, JSON.stringify(local)); } catch { toast('Penyimpanan perangkat tidak tersedia.'); }
  }

  /** Keadaan yang sedang dipakai: dari server bila daring, dari perangkat bila luring. */
  function view() {
    if (online()) return net.pjblState;
    const l = loadLocal();
    return { mine: l.mine, group: l.group, members: [], team: null, summary: C.summary(l.group, l.mine) };
  }

  function act(msg, after) {
    if (online()) {
      if (!net.pjbl(msg)) toast('Tidak tersambung ke server kelas. Coba lagi sebentar.');
      return;
    }
    const l = loadLocal();
    const res = C.apply({ mine: l.mine, group: l.group, actor: { id: 'lokal', alias: alias() }, waiting: () => [] }, msg);
    if (!res.ok) { toast(res.message); return; }
    l.group = C.normGroup(l.group);
    saveLocal();
    onResult({ ok: true, action: msg.action, result: res.result || null });
    if (after) after();
    render();
  }

  function onResult(msg) {
    if (!msg || !msg.ok) return;
    const r = msg.result;
    if (msg.action === 'lock' && r) {
      if (r.correct) toast(`Benar! +${r.points} poin untuk kelompok.`);
      else if (!r.done) toast('Belum tepat. Baca feedback, diskusikan, lalu coba sekali lagi.');
      else toast('Belum tepat di percobaan kedua. Kunci jawaban dan penjelasannya sekarang terbuka.');
    }
    if (msg.action === 'logbook') toast('Logbook kelompok tersimpan.');
    if (msg.action === 'menu') { draftDirty = false; toast('Rancangan menu kelompok tersimpan.'); }
    if (msg.action === 'present') toast('Menu disajikan kepada Kepala Kantin! Lanjutkan dengan refleksi.');
    if (msg.action === 'reflect' && r) toast(r.fb === 'good' ? 'Refleksi tersimpan. Isinya sudah berbukti.' : 'Refleksi tersimpan. Baca saran perbaikannya.');
  }

  // ---------- Render ----------

  const screen = () => $('#screen-pjbl');
  function visible() { const s = screen(); return s && !s.hidden; }

  function render() {
    const root = screen();
    if (!root || root.hidden) return;
    // Jangan menimpa teks yang sedang diketik; render ulang setelah kolom ditinggalkan.
    const a = document.activeElement;
    if (a && root.contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text'))) { pendingRender = true; return; }
    pendingRender = false;
    const v = view();
    const sum = C.summary(v.group, v.mine);
    if (!sum.unlocked.includes(activePos)) activePos = Math.max(...sum.unlocked);
    $('#pjbl-score').innerHTML = `<b>${sum.total}</b><span>/ ${sum.max} poin analisis</span>`;
    $('#pjbl-mode').textContent = v.team ? `Regu ${v.team} · ${v.members.length} anggota` : online() ? 'Kelompok: kamu sendiri (bentuk regu di lobi)' : 'Mode luring di perangkat ini';
    $('#pjbl-tabs').innerHTML = [1, 2, 3, 4, 5, 6].map((n) => {
      const open = sum.unlocked.includes(n);
      const s = sum.pos[n - 1];
      const state = !open ? '🔒 terkunci' : n === 6 ? (sum.presented ? '✓ disajikan' : 'tantangan menu') : s.passed ? `✓ ${s.points}/100` : `${s.done}/10 soal · ${s.points} poin`;
      return `<button type="button" class="pjbl-tab" data-pjbl-pos="${n}" aria-pressed="${n === activePos}" ${open ? '' : 'aria-disabled="true"'}><b>POS ${n}</b><span>${esc(P.steps[n - 1].name)}</span><small>${state}</small></button>`;
    }).join('');
    $('#pjbl-body').innerHTML = activePos === 6 ? renderPos6(v, sum) : renderPos(v, sum, activePos);
  }

  function stepHead(n, place, narrative) {
    const st = P.steps[n - 1];
    return `<div class="pjbl-step"><div class="eyebrow"><span class="eyebrow-line"></span> LANGKAH PjBL ${n} · ${esc(st.en)}</div>
      <h2>POS ${n} — ${esc(st.name)} <em>(${esc(place)})</em></h2><p class="pjbl-steptext">${esc(st.text)}</p><p class="pjbl-narr"><b>Nara:</b> ${esc(narrative)}</p></div>`;
  }

  function table(t) {
    if (!t || !t.columns.length) return '';
    return `<figure class="pjbl-stim"><figcaption>${esc(t.title)}</figcaption><div class="pjbl-table-wrap"><table><thead><tr>${t.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div></figure>`;
  }

  function renderPos(v, sum, n) {
    const p = P.pos[n - 1];
    const s = C.posScore(v.group, n);
    let status;
    if (!s.complete) status = `Jawab semua soal. Skor sementara <b>${s.points}</b>/100. POS ${n + 1} terbuka bila skor ≥ ${R.unlock}, atau kelompok membaca ulang feedback semua soal yang salah.`;
    else if (s.passed) status = `POS ${n} selesai dengan skor <b>${s.points}</b>/100. ${s.byScore ? 'Skor memenuhi syarat.' : 'Semua feedback soal yang salah sudah dibaca ulang.'} ${n < 5 ? `POS ${n + 1}` : 'POS 6'} terbuka.`;
    else status = `Skor <b>${s.points}</b>/100 belum mencapai ${R.unlock}. Baca ulang feedback ${s.rereadLeft.length} soal yang salah (tombol “Saya sudah membaca ulang”) untuk membuka POS berikutnya.`;
    const lb = v.group.logbook[n];
    return `${stepHead(n, p.place, p.narrative)}
      <p class="pjbl-focus"><b>Fokus analisis:</b> ${esc(p.focus)} · <b>Luaran kelompok:</b> ${esc(p.output)}</p>
      ${table(p.stimulus)}${p.notes.map((t) => `<p class="pjbl-note">${esc(t)}</p>`).join('')}
      <p class="pjbl-howto">Cara menjawab: <b>1.</b> setiap anggota memilih jawabannya sendiri, <b>2.</b> diskusikan di obrolan regu dengan menyebut <i>isi</i> jawaban (urutan huruf tiap anggota berbeda), <b>3.</b> satu anggota mengunci jawaban kelompok. Benar di percobaan pertama ${R.first} poin, percobaan kedua ${R.second} poin.</p>
      <div class="pjbl-status" role="status">${status}</div>
      <ol class="pjbl-questions">${p.questions.map((q, i) => renderQuestion(v, q, i)).join('')}</ol>
      <section class="pjbl-logbook" aria-labelledby="pjbl-lb-${n}"><h3 id="pjbl-lb-${n}">Logbook digital: ${esc(p.output)}</h3>
        <p class="field-hint">${esc(p.logbookPrompt)} Luaran ini dibawa ke POS ${n + 1 <= 5 ? n + 1 : 6} dan terbuka lagi di POS 6.</p>
        <label class="sr-only" for="pjbl-lbtext-${n}">Luaran kelompok POS ${n}</label>
        <textarea class="text-input" id="pjbl-lbtext-${n}" rows="3" maxlength="1500">${esc(lb ? lb.text : '')}</textarea>
        <div class="pjbl-row"><button type="button" class="button button-secondary" data-pjbl-logbook="${n}">Simpan logbook</button>${lb ? `<small>Terakhir ditulis ${esc(lb.by)}</small>` : ''}</div>
      </section>`;
  }

  function renderQuestion(v, q, i) {
    const order = C.optionOrder(seed(), q.id);
    const letter = (id) => C.letters[order.indexOf(id)];
    const a = v.group.answers[q.id];
    const tries = a ? a.tries : [];
    const done = Boolean(a && a.done);
    const mine = v.mine.picks[q.id] || '';
    const lastTry = tries[tries.length - 1];
    const opts = order.map((id) => {
      const o = q.options.find((x) => x.id === id);
      const tried = tries.find((t) => t.r === id);
      let mark = '';
      if (tried) mark = tried.r === q.key ? '<span class="pjbl-mark ok">✓ jawaban kelompok, benar</span>' : '<span class="pjbl-mark bad">✗ dicoba kelompok, belum tepat</span>';
      else if (done && id === q.key) mark = '<span class="pjbl-mark key">★ kunci jawaban</span>';
      return `<li><label class="pjbl-opt${mine === id ? ' picked' : ''}"><input type="radio" name="pjbl-${q.id}" value="${id}" ${mine === id ? 'checked' : ''} ${done ? 'disabled' : ''} data-pjbl-pick="${q.id}" />
        <b>${letter(id)}.</b> <span>${esc(o.text)}</span> ${mark}</label></li>`;
    }).join('');
    let fb = '';
    if (a && lastTry) {
      if (a.correct) fb = `<div class="pjbl-fb ok"><b>Benar (+${a.points} poin).</b> ${esc(C.feedbackText(q.right, order))}</div>`;
      else if (!done) fb = `<div class="pjbl-fb bad"><b>Salah.</b> ${esc(C.feedbackText(q.wrong, order))} <i>Diskusikan lagi, lalu coba sekali lagi (percobaan 2 bernilai ${R.second} poin).</i></div>`;
      else fb = `<div class="pjbl-fb bad"><b>Salah (0 poin).</b> ${esc(C.feedbackText(q.wrong, order))}<br><b>Kunci: ${letter(q.key)}.</b> ${esc(C.feedbackText(q.right, order))}</div>`;
    }
    const needReread = done && a.points < R.first;
    const reread = needReread ? (v.group.reread[q.id] ? '<p class="pjbl-reread done">✓ Feedback sudah dibaca ulang kelompok</p>' : `<button type="button" class="link-button pjbl-reread" data-pjbl-reread="${q.id}">Saya sudah membaca ulang feedback ini</button>`) : '';
    // Status anggota regu: siapa yang sudah memilih; isi pilihan teman dibuka setelah soal terkunci.
    const team = v.members && v.members.length > 1 ? `<p class="pjbl-members">${v.members.map((m) => {
      const pk = m.picks[q.id];
      const st = !pk ? 'belum memilih' : pk === true ? 'sudah memilih' : `memilih ${letter(pk)}`;
      return `<span>${pk ? '●' : '○'} ${esc(m.alias)}${m.online ? '' : ' (luring)'}: ${st}</span>`;
    }).join('')}</p>` : '';
    const lockBtn = done ? '' : `<button type="button" class="button button-primary" data-pjbl-lock="${q.id}" ${mine ? '' : 'disabled'}>Kunci jawaban kelompok (${mine ? `isi pilihan ${letter(mine)}` : 'pilih dulu'}) · percobaan ${tries.length + 1}/${R.maxTries}</button>`;
    return `<li class="pjbl-q${done ? ' done' : ''}" id="q-${q.id}"><fieldset><legend><span class="pjbl-qn">${i + 1}</span> ${esc(q.text)}</legend>
      <ul class="pjbl-opts">${opts}</ul>${team}<div class="pjbl-row">${lockBtn}</div>${fb}${reread}</fieldset></li>`;
  }

  // ---------- POS 6 ----------

  function ensureDraft(v) {
    if (draft && draftDirty) return draft;
    const m = v.group.menu;
    draft = m ? JSON.parse(JSON.stringify(m)) : { name: '', target: 'campur', items: [], snack: '', allergens: [], noAllergen: false, licensed: false, reason: '' };
    return draft;
  }

  function renderPos6(v, sum) {
    const d = ensureDraft(v);
    const menu = C.normMenu(d);
    const check = C.validateMenu(menu);
    const t = check.totals;
    const groups = S.groups.map((g) => {
      const cards = S.cards.filter((c) => c.group === g.id);
      return `<div class="pjbl-shelf"><h4>${g.icon} ${esc(g.name)}</h4><ul>${cards.map((c) => `<li><button type="button" class="pjbl-card" data-pjbl-add="${c.id}" aria-label="Tambah ${esc(c.name)} ke piring">
        <b>${esc(c.name)}</b><small>${esc(c.portion)} · ${c.energy} kkal · P ${num(c.protein)} g · L ${num(c.fat)} g · gula ${c.sugar} g · Na ${c.sodium} mg · ${rp(c.price)}</small>
        <small>${esc(c.origin)}${c.local && !c.rice ? ' · pangan lokal' : ''}${c.allergens.length ? ` · alergen: ${esc(c.allergens.join(', '))}` : ''}${c.note ? ` · ${esc(c.note)}` : ''}</small></button></li>`).join('')}</ul></div>`;
    }).join('');
    const plate = t.rows.length ? `<table class="pjbl-plate"><thead><tr><th scope="col">Komponen</th><th scope="col">Porsi</th><th scope="col">Cara olah</th><th scope="col">Energi</th><th scope="col">Protein</th><th scope="col">Lemak</th><th scope="col">Harga</th><th scope="col"><span class="sr-only">Hapus</span></th></tr></thead><tbody>
      ${t.rows.map((r, i) => `<tr><th scope="row">${esc(r.card.name)}<small>${esc(r.card.portion)} per porsi</small></th>
        <td><label class="sr-only" for="pjbl-por-${i}">Porsi ${esc(r.card.name)}</label><select id="pjbl-por-${i}" data-pjbl-portion="${i}">${S.portions.map((k) => `<option value="${k}" ${k === r.portion ? 'selected' : ''}>${num(k)}×</option>`).join('')}</select></td>
        <td><label class="sr-only" for="pjbl-met-${i}">Cara olah ${esc(r.card.name)}</label><select id="pjbl-met-${i}" data-pjbl-method="${i}">${r.card.methods.map((m) => `<option value="${m}" ${m === r.method ? 'selected' : ''}>${esc(C.methods[m].name)}</option>`).join('')}</select></td>
        <td>${num(r.energy)} kkal</td><td>${num(r.protein)} g</td><td>${num(r.fat)} g</td><td>${rp(r.price)}</td>
        <td><button type="button" class="icon-button" data-pjbl-remove="${i}" aria-label="Hapus ${esc(r.card.name)}">×</button></td></tr>`).join('')}
      </tbody><tfoot><tr><th scope="row">Total makan siang</th><td colspan="2">Sayur + buah ${t.vegFruitPct}% piring</td><td>${num(t.energy)} kkal</td><td>${num(t.protein)} g</td><td>${num(t.fat)} g (${t.fatPct}%)</td><td>${rp(t.price)}</td><td></td></tr>
      <tr><td colspan="8">Gula tambahan ${num(t.sugar)} g · natrium ${t.sodium} mg</td></tr></tfoot></table>` : '<p class="pjbl-empty">Piring masih kosong. Ambil kartu bahan dari Pasar Pangan Nusantara di sebelah kiri.</p>';
    const checks = `<ul class="pjbl-checks">${check.checks.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><span aria-hidden="true">${c.ok ? '✓' : '✗'}</span><div><b>${esc(c.name)}</b> <span class="sr-only">${c.ok ? 'terpenuhi' : 'belum terpenuhi'}</span><small>${esc(c.value)}</small><p>${esc(c.text)}</p></div></li>`).join('')}</ul>`;
    const logbook = P.pos.map((p) => { const e = v.group.logbook[p.id]; return `<li><b>POS ${p.id} · ${esc(p.output)}:</b> ${e ? esc(e.text) : '<i>belum ditulis</i>'}</li>`; }).join('');
    const presented = v.group.presented;
    const rubric = sum.rubric;
    const reflections = S.reflection.map((r, i) => {
      const e = v.mine.reflect[i];
      return `<li><label for="pjbl-ref-${i}"><b>${i + 1}.</b> ${esc(r.q)}</label><textarea class="text-input" id="pjbl-ref-${i}" rows="2" maxlength="800" ${presented ? '' : 'disabled'}>${esc(e ? e.text : '')}</textarea>
        <div class="pjbl-row"><button type="button" class="button button-secondary" data-pjbl-reflect="${i}" ${presented ? '' : 'disabled'}>Simpan refleksi</button></div>
        ${e ? `<p class="pjbl-fb ${e.fb === 'good' ? 'ok' : 'bad'}"><b>${e.fb === 'good' ? 'Feedback baik.' : 'Perlu diperbaiki.'}</b> ${esc(e.fb === 'good' ? r.good : r.fix)}</p>` : ''}</li>`;
    }).join('');
    const allergenBoxes = S.allergens.map((a) => `<label class="pjbl-check"><input type="checkbox" data-pjbl-allergen="${a.id}" ${d.allergens.includes(a.id) ? 'checked' : ''}/> ${esc(a.name)}</label>`).join('');
    return `${stepHead(6, S.place, S.narrative)}
      <ol class="pjbl-flow">${S.flow.map((f) => `<li><b>${esc(f.title)}.</b> ${esc(f.text)}</li>`).join('')}</ol>
      <details class="pjbl-carry" open><summary>Logbook kelompok POS 1–5 (bahan untuk rancangan)</summary><ul>${logbook}</ul></details>
      ${draftDirty ? '<p class="pjbl-status" role="status">Ada perubahan yang belum disimpan. Tekan “Simpan rancangan kelompok” agar teman satu regu ikut melihatnya.</p>' : ''}
      <div class="pjbl-builder">
        <section class="pjbl-market" aria-labelledby="pjbl-market-h"><h3 id="pjbl-market-h">Pasar Pangan Nusantara</h3><p class="field-hint">Nilai gizi adalah data simulasi per porsi, bukan saran gizi.</p>${groups}</section>
        <section class="pjbl-dish" aria-labelledby="pjbl-dish-h"><h3 id="pjbl-dish-h">Piring Isi Piringku · makan siang 12.00</h3>
          <div class="pjbl-row"><label for="pjbl-target">Sasaran</label><select id="pjbl-target" data-pjbl-field="target">${S.targets.map((x) => `<option value="${x.id}" ${d.target === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
          ${plate}
          <h4>Cek otomatis (${check.passed}/${check.checks.length} kriteria)</h4>${checks}
          <h4>Lembar spesifikasi prototype</h4>
          <div class="pjbl-spec">
            <label for="pjbl-name">Nama menu</label><input class="text-input" id="pjbl-name" type="text" maxlength="60" data-pjbl-field="name" value="${esc(d.name)}" placeholder="mis. Piring Nara Nusantara" />
            <label for="pjbl-snack">Selingan 09.30</label><select id="pjbl-snack" data-pjbl-field="snack"><option value="">(belum dipilih)</option>${S.snacks.map((x) => `<option value="${x.id}" ${d.snack === x.id ? 'selected' : ''}>${esc(x.name)} · ${x.energy} kkal · ${rp(x.price)}</option>`).join('')}</select>
            <span>Pangan lokal</span><p>${t.locals.length ? esc(t.locals.join(', ')) : '<i>belum ada</i>'}</p>
            <span>Label alergen</span><div>${allergenBoxes}<label class="pjbl-check"><input type="checkbox" data-pjbl-flag="noAllergen" ${d.noAllergen ? 'checked' : ''}/> Tidak ada alergen umum</label><small>Sistem mendeteksi: ${t.allergens.length ? esc(t.allergens.join(', ')) : 'tidak ada'}</small></div>
            <span>Keamanan pangan</span><label class="pjbl-check"><input type="checkbox" data-pjbl-flag="licensed" ${d.licensed ? 'checked' : ''}/> Bahan kemasan yang dipakai berizin edar (BPOM/PIRT)</label>
            <label for="pjbl-reason">Alasan (2–3 kalimat, kaitkan dengan masalah POS 1)</label><textarea class="text-input" id="pjbl-reason" rows="3" maxlength="800" data-pjbl-field="reason">${esc(d.reason)}</textarea>
          </div>
          <div class="pjbl-row"><button type="button" class="button button-secondary" id="pjbl-save-menu">Simpan rancangan kelompok</button>
            <button type="button" class="button button-primary" id="pjbl-present" ${check.allOk ? '' : 'disabled'}>Sajikan kepada Kepala Kantin</button></div>
          ${presented ? `<p class="pjbl-fb ok"><b>Sudah disajikan:</b> “${esc(presented.name)}” oleh ${esc(presented.by)}. Kepala Kantin: “Menu ini memenuhi semua kriteria. Terima kasih sudah memakai data POS 1–5!”</p>` : check.allOk ? '' : `<p class="field-hint">Tombol sajikan aktif setelah semua ${check.checks.length} kriteria terpenuhi.</p>`}
        </section>
      </div>
      <section class="pjbl-rubric" aria-labelledby="pjbl-rub-h"><h3 id="pjbl-rub-h">Rubrik penilaian prototype</h3><table><thead><tr><th scope="col">Aspek</th><th scope="col">Skor</th><th scope="col">Keterangan</th></tr></thead><tbody>
        ${S.rubric.map((r) => { const val = rubric[r.id]; return `<tr><th scope="row">${esc(r.name)}</th><td>${val ? `${val}/4` : '—'}</td><td>${val ? esc(r.levels[val - 1]) : r.auto ? 'dihitung dari rancangan menu' : 'dinilai guru'}${r.auto && v.group.rubric[r.id] === undefined && val ? ' (otomatis)' : ''}</td></tr>`; }).join('')}
      </tbody></table></section>
      <section class="pjbl-reflection" aria-labelledby="pjbl-refl-h"><h3 id="pjbl-refl-h">Refleksi individu (evaluasi pengalaman)</h3>${presented ? '' : '<p class="field-hint">Refleksi terbuka setelah kelompok menyajikan menu.</p>'}<ol>${reflections}</ol></section>`;
  }

  // ---------- Interaksi ----------

  function markDraft() { draftDirty = true; }

  document.addEventListener('click', (e) => {
    const root = screen();
    if (!root || !root.contains(e.target)) return;
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.pjblPos) {
      const n = Number(b.dataset.pjblPos);
      if (b.getAttribute('aria-disabled') === 'true') { toast(`POS ${n} belum terbuka. Selesaikan POS ${n - 1} dengan skor minimal ${R.unlock}, atau baca ulang feedback soal yang salah.`); return; }
      activePos = n;
      render();
      return;
    }
    if (b.dataset.pjblLock) {
      const q = b.dataset.pjblLock;
      act({ action: 'lock', q, r: view().mine.picks[q] });
      return;
    }
    if (b.dataset.pjblReread) { act({ action: 'reread', q: b.dataset.pjblReread }); return; }
    if (b.dataset.pjblLogbook) {
      const n = Number(b.dataset.pjblLogbook);
      act({ action: 'logbook', pos: n, text: $(`#pjbl-lbtext-${n}`).value });
      return;
    }
    if (b.dataset.pjblReflect) {
      const i = Number(b.dataset.pjblReflect);
      act({ action: 'reflect', i, text: $(`#pjbl-ref-${i}`).value });
      return;
    }
    if (b.dataset.pjblAdd) {
      const c = C.cards[b.dataset.pjblAdd];
      if (draft.items.length >= 12) { toast('Piring sudah penuh (maksimal 12 komponen).'); return; }
      draft.items.push({ card: c.id, method: c.methods[0], portion: 1 });
      markDraft();
      render();
      return;
    }
    if (b.dataset.pjblRemove) { draft.items.splice(Number(b.dataset.pjblRemove), 1); markDraft(); render(); return; }
    if (b.id === 'pjbl-save-menu') { act({ action: 'menu', menu: draft }, () => { draftDirty = false; }); return; }
    if (b.id === 'pjbl-present') {
      // Simpan versi terbaru dulu, lalu sajikan (urutan pesan WebSocket terjaga).
      act({ action: 'menu', menu: draft }, () => { draftDirty = false; });
      act({ action: 'present' });
    }
  });

  document.addEventListener('change', (e) => {
    const root = screen();
    const el = e.target;
    if (!root || !root.contains(el)) return;
    if (el.dataset.pjblPick) { act({ action: 'pick', q: el.dataset.pjblPick, r: el.value }); return; }
    if (!draft) return;
    if (el.dataset.pjblPortion) { draft.items[Number(el.dataset.pjblPortion)].portion = Number(el.value); markDraft(); render(); return; }
    if (el.dataset.pjblMethod) { draft.items[Number(el.dataset.pjblMethod)].method = el.value; markDraft(); render(); return; }
    if (el.dataset.pjblAllergen) {
      const id = el.dataset.pjblAllergen;
      draft.allergens = el.checked ? [...new Set([...draft.allergens, id])] : draft.allergens.filter((x) => x !== id);
      if (el.checked) draft.noAllergen = false;
      markDraft(); render(); return;
    }
    if (el.dataset.pjblFlag) { draft[el.dataset.pjblFlag] = el.checked; if (el.dataset.pjblFlag === 'noAllergen' && el.checked) draft.allergens = []; markDraft(); render(); return; }
    if (el.dataset.pjblField) { draft[el.dataset.pjblField] = el.value; markDraft(); if (el.tagName === 'SELECT') render(); }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (draft && el.dataset && el.dataset.pjblField && screen() && screen().contains(el)) { draft[el.dataset.pjblField] = el.value; draftDirty = true; }
  });

  document.addEventListener('focusout', () => { if (pendingRender) setTimeout(() => { if (pendingRender) render(); }, 0); });

  document.addEventListener('nutra:screen', (e) => {
    if (e.detail === 'pjbl') {
      // Buka POS sesuai wilayah pos yang sedang dijelajahi bila sudah terbuka.
      const pos = Number(game.state && game.state.activePos);
      const sum = C.summary(view().group, view().mine);
      if (pos >= 1 && pos <= 6 && sum.unlocked.includes(pos)) activePos = pos;
      render();
    }
  });

  if (net) {
    net.on('pjbl', (msg) => { onResult(msg); if (msg.action === 'menu' && msg.ok) draftDirty = false; if (visible()) render(); });
    net.on('pjbl-error', (msg) => toast(msg.message || 'Aksi PjBL ditolak server.'));
  }

  window.NutraPjbl = {
    open(pos) { if (pos) activePos = Number(pos); game.goTo('pjbl'); },
    summary() { const v = view(); return C.summary(v.group, v.mine); },
    render
  };
})();
