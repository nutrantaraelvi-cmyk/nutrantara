/* NUTRANTARA — logika PjBL POS 1–6 (sejak 1.3), dipakai bersama oleh peramban dan server.
 * Skrip biasa tanpa DOM: server.js dan test/smoke.js memuatnya lewat vm setelah pjbl-data.js.
 *
 * Data PjBL disimpan DI LUAR progres pos (seperti lemari Butik), jadi SCHEMA_VERSION game.js tidak berubah:
 * - `mine`  (milik tiap siswa): pilihan individu per soal dan jawaban refleksi POS 6.
 * - `group` (milik regu; tanpa regu = milik siswa itu sendiri): jawaban kelompok yang dikunci, baca ulang feedback,
 *   logbook luaran tiap POS, rancangan menu POS 6, presentasi, dan rubrik guru.
 * Alur soal: setiap anggota memilih jawaban sendiri → kelompok berdiskusi → satu anggota mengunci jawaban bersama.
 * Penskoran: benar di percobaan 1 = 10 poin, di percobaan 2 = 5 poin, 2× salah = 0 poin (kunci lalu dibuka).
 * POS berikutnya terbuka bila semua soal POS sebelumnya selesai dan skornya ≥ 70, atau kelompok sudah membaca ulang
 * feedback semua soal yang tidak benar di percobaan pertama. */
(() => {
  const P = window.NUTRANTARA_PJBL;
  const R = P.rules;
  const S = P.pos6;
  const QUESTIONS = {};
  P.pos.forEach((p) => p.questions.forEach((q, i) => { QUESTIONS[q.id] = { ...q, pos: p.id, index: i }; }));
  const CARDS = Object.fromEntries(S.cards.map((c) => [c.id, c]));
  const METHODS = Object.fromEntries(S.methods.map((m) => [m.id, m]));
  const SNACKS = Object.fromEntries(S.snacks.map((s) => [s.id, s]));
  const ALLERGENS = S.allergens.map((a) => a.id);
  const LETTERS = ['A', 'B', 'C', 'D'];
  const BAD = new Set(['__proto__', 'constructor', 'prototype']);
  const text = (v, max) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const round1 = (n) => Math.round(n * 10) / 10;

  // ---------- Bentuk data ----------

  const freshMine = () => ({ picks: {}, reflect: {} });
  const freshGroup = () => ({ answers: {}, reread: {}, logbook: {}, menu: null, presented: null, rubric: {} });

  function normTry(t) {
    t = obj(t);
    return { r: text(t.r, 2), by: text(t.by, 24), at: text(t.at, 30) };
  }

  /** Menormalkan data kelompok dari disk/klien: hanya soal yang dikenal, maksimal 2 percobaan, skor dihitung ulang dari kunci. */
  function normGroup(g) {
    g = obj(g);
    const out = freshGroup();
    Object.entries(obj(g.answers)).forEach(([qid, a]) => {
      const q = QUESTIONS[qid];
      if (!q) return;
      const tries = (Array.isArray(obj(a).tries) ? a.tries : []).map(normTry).filter((t) => q.options.some((o) => o.id === t.r)).slice(0, R.maxTries);
      if (tries.length) out.answers[qid] = grade(q, tries);
    });
    Object.entries(obj(g.reread)).forEach(([qid, at]) => { if (QUESTIONS[qid]) out.reread[qid] = text(at, 30) || 'ya'; });
    Object.entries(obj(g.logbook)).forEach(([pos, e]) => {
      const n = Number(pos);
      if (Number.isInteger(n) && n >= 1 && n <= 5 && obj(e).text) out.logbook[n] = { text: text(e.text, 1500), by: text(e.by, 24), at: text(e.at, 30) };
    });
    out.menu = g.menu ? normMenu(g.menu) : null;
    if (g.presented && out.menu) {
      const pr = obj(g.presented);
      out.presented = { at: text(pr.at, 30), by: text(pr.by, 24), name: text(pr.name, 60), passed: Number(pr.passed) || 0 };
    }
    S.rubric.forEach((r) => { const v = Number(obj(g.rubric)[r.id]); if (Number.isInteger(v) && v >= 1 && v <= 4) out.rubric[r.id] = v; });
    return out;
  }

  function normMine(m) {
    m = obj(m);
    const out = freshMine();
    Object.entries(obj(m.picks)).forEach(([qid, r]) => { const q = QUESTIONS[qid]; if (q && q.options.some((o) => o.id === r)) out.picks[qid] = r; });
    Object.entries(obj(m.reflect)).forEach(([i, e]) => {
      const n = Number(i);
      if (Number.isInteger(n) && S.reflection[n] && obj(e).text) { const t = text(e.text, 800); out.reflect[n] = { text: t, at: text(e.at, 30), fb: reflectFeedback(n, t) }; }
    });
    return out;
  }

  function normMenu(menu) {
    menu = obj(menu);
    const items = (Array.isArray(menu.items) ? menu.items : []).slice(0, 12).map((it) => {
      it = obj(it);
      const c = CARDS[it.card];
      if (!c) return null;
      const method = c.methods.includes(it.method) ? it.method : c.methods[0];
      const portion = S.portions.includes(Number(it.portion)) ? Number(it.portion) : 1;
      return { card: c.id, method, portion };
    }).filter(Boolean);
    const target = S.targets.some((t) => t.id === menu.target) ? menu.target : 'campur';
    return {
      name: text(menu.name, 60),
      target,
      items,
      snack: SNACKS[menu.snack] ? menu.snack : '',
      allergens: [...new Set((Array.isArray(menu.allergens) ? menu.allergens : []).filter((a) => ALLERGENS.includes(a)))],
      noAllergen: Boolean(menu.noAllergen),
      licensed: Boolean(menu.licensed),
      reason: text(menu.reason, 800),
      by: text(menu.by, 24),
      at: text(menu.at, 30)
    };
  }

  // ---------- Soal & skor ----------

  /** Hasil satu soal dari daftar percobaan: benar di percobaan ke-n → poin; selesai bila benar atau percobaan habis. */
  function grade(q, tries) {
    const hit = tries.findIndex((t) => t.r === q.key);
    const correct = hit >= 0;
    const points = hit === 0 ? R.first : hit === 1 ? R.second : 0;
    return { tries: correct ? tries.slice(0, hit + 1) : tries, done: correct || tries.length >= R.maxTries, correct, points };
  }

  function posScore(group, pos) {
    const p = P.pos.find((x) => x.id === Number(pos));
    if (!p) return null;
    let points = 0;
    let done = 0;
    const missed = []; // tidak benar di percobaan pertama → wajib dibaca ulang bila skor < 70
    p.questions.forEach((q) => {
      const a = group.answers[q.id];
      if (!a) return;
      points += a.points;
      if (a.done) done += 1;
      if (a.done && a.points < R.first) missed.push(q.id);
    });
    const complete = done === p.questions.length;
    const rereadDone = missed.every((id) => group.reread[id]);
    return { pos: p.id, points, done, total: p.questions.length, max: p.questions.length * R.first, complete, missed, rereadLeft: missed.filter((id) => !group.reread[id]), passed: complete && (points >= R.unlock || rereadDone), byScore: points >= R.unlock };
  }

  function unlocked(group, pos) {
    pos = Number(pos);
    if (pos <= 1) return true;
    const prev = posScore(group, pos - 1);
    return Boolean(prev && prev.passed && unlocked(group, pos - 1));
  }

  function totalScore(group) {
    return P.pos.reduce((n, p) => n + posScore(group, p.id).points, 0);
  }

  /** Urutan pilihan acak tetapi tetap untuk siswa yang sama (benih dari id/alias + id soal). Kunci tetap id isi, bukan huruf. */
  function optionOrder(seed, qid) {
    const q = QUESTIONS[qid];
    let h = 2166136261;
    const s = `${seed}|${qid}`;
    for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    const ids = q.options.map((o) => o.id);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      h = (Math.imul(h ^ (h >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
      const j = h % (i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  }

  /** Ganti penanda {A}…{D} di feedback dengan huruf tampilan; daftar huruf diurutkan agar tetap terbaca (“A, B, dan D”). */
  function feedbackText(raw, order) {
    const letterOf = (orig) => LETTERS[order.indexOf(orig.toLowerCase())] || orig;
    return String(raw).replace(/\{([A-D])\}(?:(?:, | dan |, dan )\{[A-D]\})*/g, (run) => {
      const found = run.match(/\{([A-D])\}/g).map((t) => letterOf(t[1])).sort();
      if (found.length === 1) return found[0];
      return `${found.slice(0, -1).join(', ')}${found.length > 2 ? ',' : ''} dan ${found[found.length - 1]}`;
    });
  }

  // ---------- POS 6: hitung & validasi menu ----------

  function computeMenu(menu) {
    const rows = (menu ? menu.items : []).map((it) => {
      const c = CARDS[it.card];
      const k = it.portion;
      const extraFat = (METHODS[it.method] || { fat: 0 }).fat;
      const fat = (c.fat + extraFat) * k;
      return {
        card: c, method: it.method, portion: k,
        energy: round1((c.energy + extraFat * 9) * k), protein: round1(c.protein * k), fat: round1(fat), sugar: round1(c.sugar * k),
        sodium: Math.round(c.sodium * k), price: Math.round(c.price * k), plate: c.plate * k
      };
    });
    const sum = (key) => rows.reduce((n, r) => n + r[key], 0);
    const plate = sum('plate');
    const vegFruit = rows.filter((r) => r.card.group === 'sayur' || r.card.group === 'buah').reduce((n, r) => n + r.plate, 0);
    const energy = round1(sum('energy'));
    const fat = round1(sum('fat'));
    const allergens = [...new Set(rows.flatMap((r) => r.card.allergens))];
    const locals = [...new Set(rows.filter((r) => r.card.local && !r.card.rice).map((r) => `${r.card.name} (${r.card.origin})`))];
    return {
      rows, energy, protein: round1(sum('protein')), fat, sugar: round1(sum('sugar')), sodium: Math.round(sum('sodium')), price: Math.round(sum('price')),
      fatPct: energy > 0 ? Math.round((fat * 9 / energy) * 100) : 0,
      vegFruitPct: plate > 0 ? Math.round((vegFruit / plate) * 100) : 0,
      groups: [...new Set(rows.map((r) => r.card.group))],
      allergens, locals,
      sweetDrink: rows.some((r) => r.card.sweetDrink),
      snack: menu && SNACKS[menu.snack] ? SNACKS[menu.snack] : null
    };
  }

  function validateMenu(menu) {
    const L = S.limits;
    const t = computeMenu(menu);
    const proteinMin = menu && menu.target === 'siswi' ? L.proteinSiswi : L.proteinSiswa;
    const labelled = menu && (t.allergens.length ? t.allergens.every((a) => menu.allergens.includes(a)) : menu.noAllergen);
    const pass = {
      lengkap: ['pokok', 'lauk', 'sayur', 'buah'].every((g) => t.groups.includes(g)),
      separuh: t.vegFruitPct >= L.vegFruitPct,
      energi: t.energy >= L.energyMin && t.energy <= L.energyMax,
      protein: t.protein >= proteinMin,
      lemak: t.energy > 0 && t.fatPct <= L.fatPct,
      gula: t.sugar <= L.sugar && !t.sweetDrink,
      natrium: t.sodium <= L.sodium,
      harga: t.rows.length > 0 && t.price <= L.price,
      lokal: t.locals.length >= 1,
      alergen: Boolean(labelled) && t.rows.length > 0
    };
    const value = {
      lengkap: `${['pokok', 'lauk', 'sayur', 'buah'].filter((g) => t.groups.includes(g)).length}/4 kelompok`,
      separuh: `${t.vegFruitPct}% piring`,
      energi: `${t.energy} kkal`,
      protein: `${t.protein} g (target ≥ ${String(proteinMin).replace('.', ',')} g)`,
      lemak: `${t.fatPct}% energi dari lemak (${t.fat} g)`,
      gula: `${t.sugar} g${t.sweetDrink ? ' + minuman manis kemasan' : ''}`,
      natrium: `${t.sodium} mg`,
      harga: `Rp${t.price.toLocaleString('id-ID')}`,
      lokal: t.locals.length ? t.locals.join(', ') : 'belum ada',
      alergen: t.allergens.length ? `menu mengandung: ${t.allergens.join(', ')}` : 'tidak ada alergen umum'
    };
    const checks = S.rules.map((r) => ({ id: r.id, name: r.name, ok: pass[r.id], value: value[r.id], text: pass[r.id] ? r.ok : r.bad }));
    return { totals: t, checks, passed: checks.filter((c) => c.ok).length, failed: checks.filter((c) => !c.ok).length, allOk: checks.every((c) => c.ok) };
  }

  /** Saran skor rubrik untuk aspek yang bisa dihitung sistem; aspek lain dinilai guru. */
  function autoRubric(menu) {
    if (!menu) return {};
    const v = validateMenu(menu);
    const t = v.totals;
    const gizi = v.failed === 0 ? 4 : v.failed === 1 ? 3 : v.failed <= 3 ? 2 : 1;
    const complete = menu.items.length > 0 && t.rows.every((r) => r.price >= 0);
    const biaya = t.price <= S.limits.price ? (complete && menu.name ? 4 : 3) : t.price <= S.limits.price * 1.15 ? 2 : 1;
    const mainLocal = t.rows.filter((r) => r.card.local && !r.card.rice && r.card.group !== 'pelengkap').length;
    const lokal = mainLocal >= 2 ? 4 : mainLocal === 1 ? 3 : t.locals.length ? 2 : 1;
    return { gizi, biaya, lokal };
  }

  /** Umpan balik otomatis sederhana untuk refleksi terbuka: 'good' bila isinya berbukti/spesifik, 'fix' bila masih umum. */
  function reflectFeedback(i, raw) {
    const s = String(raw || '').toLowerCase();
    if (s.length < 25) return 'fix';
    const hasNumber = /\d/.test(s);
    switch (Number(i)) {
      case 0: return hasNumber || /(data|survei|persen|%|gram|\bg\b|siswa)/.test(s) ? 'good' : 'fix';
      case 1: return /(pos ?4|pos ?5|uji|panelis|kesukaan|lugol|biuret|benedict|tekstur|laboratorium|dapur uji)/.test(s) ? 'good' : 'fix';
      case 2: return /tidak ada kendala/.test(s) && s.length < 80 ? 'fix' : (/(atasi|mengatasi|solusi|cara|bagi|diskusi|sepakat|jadwal|giliran)/.test(s) ? 'good' : 'fix');
      case 3: return /(harga|tahan|basi|selera|bahan|stok|musim|cuaca|biaya|rusak|layu)/.test(s) && /(solusi|ganti|dengan|cara|agar|supaya|sehingga|atasi)/.test(s) ? 'good' : 'fix';
      case 4: return hasNumber || /(setiap|tiap|pukul|kali|seminggu|sehari|per hari)/.test(s) ? 'good' : 'fix';
      default: return 'fix';
    }
  }

  // ---------- Aksi (server berwenang; luring dijalankan di peramban) ----------

  /**
   * Menjalankan satu aksi siswa. ctx = { mine, group, actor: { id, alias }, waiting(qid) → [alias anggota daring yang belum memilih], at }.
   * Mengubah ctx.mine / ctx.group di tempat. Mengembalikan { ok, message, changed: 'mine' | 'group', result? }.
   */
  function apply(ctx, msg) {
    const { mine, group, actor } = ctx;
    const at = ctx.at || new Date().toISOString();
    const fail = (message) => ({ ok: false, message });
    msg = obj(msg);
    const action = String(msg.action || '');
    if (action === 'pick' || action === 'lock' || action === 'reread') {
      const q = QUESTIONS[String(msg.q || '')];
      if (!q) return fail('Soal tidak dikenal.');
      if (!unlocked(group, q.pos)) return fail(`POS ${q.pos} belum terbuka. Selesaikan POS ${q.pos - 1} dengan skor minimal ${R.unlock}, atau baca ulang feedback soal yang salah.`);
      const a = group.answers[q.id];
      if (action === 'reread') {
        if (!a || !a.done || a.points >= R.first) return fail('Feedback soal ini tidak perlu dibaca ulang.');
        if (!group.reread[q.id]) group.reread[q.id] = at;
        return { ok: true, changed: 'group' };
      }
      if (a && a.done) return fail('Jawaban kelompok untuk soal ini sudah terkunci.');
      const r = String(msg.r || '');
      if (!q.options.some((o) => o.id === r)) return fail('Pilih salah satu jawaban dulu.');
      if (action === 'pick') { mine.picks[q.id] = r; return { ok: true, changed: 'mine' }; }
      if (!mine.picks[q.id]) return fail('Pilih jawabanmu sendiri dulu sebelum mengunci jawaban kelompok.');
      const waiting = ctx.waiting ? ctx.waiting(q.id) : [];
      if (waiting.length) return fail(`Tunggu ${waiting.join(', ')} memilih jawabannya sendiri, lalu diskusikan di obrolan sebelum mengunci.`);
      const tries = a ? a.tries.slice() : [];
      tries.push({ r, by: text(actor.alias, 24), at });
      const g = grade(q, tries);
      group.answers[q.id] = g;
      const last = g.tries.length;
      const result = { q: q.id, correct: g.correct, done: g.done, points: g.points, attempt: last };
      return { ok: true, changed: 'group', result };
    }
    if (action === 'logbook') {
      const pos = Number(msg.pos);
      if (!Number.isInteger(pos) || pos < 1 || pos > 5) return fail('Logbook tidak dikenal.');
      if (!unlocked(group, pos)) return fail(`POS ${pos} belum terbuka.`);
      const t = text(msg.text, 1500);
      if (t.length < 10) return fail('Tulis luaran kelompok minimal 10 karakter.');
      group.logbook[pos] = { text: t, by: text(actor.alias, 24), at };
      return { ok: true, changed: 'group' };
    }
    if (action === 'menu') {
      if (!unlocked(group, 6)) return fail('POS 6 belum terbuka.');
      const m = normMenu(msg.menu);
      m.by = text(actor.alias, 24);
      m.at = at;
      group.menu = m;
      // Menu yang diubah setelah presentasi harus disajikan ulang agar rubrik menilai versi terbaru.
      if (group.presented) group.presented = null;
      return { ok: true, changed: 'group' };
    }
    if (action === 'present') {
      if (!unlocked(group, 6)) return fail('POS 6 belum terbuka.');
      const m = group.menu;
      if (!m || !m.items.length) return fail('Susun menu dulu di piring Isi Piringku.');
      const v = validateMenu(m);
      if (!v.allOk) return fail(`Masih ada ${v.failed} kriteria yang belum terpenuhi. Revisi menu dulu.`);
      if (m.name.length < 3) return fail('Beri nama menu kalian.');
      if (m.reason.length < 60) return fail('Tulis alasan 2–3 kalimat (minimal 60 karakter) yang mengaitkan menu dengan masalah di POS 1.');
      if (!m.licensed) return fail('Centang bahwa bahan kemasan yang dipakai berizin edar.');
      group.presented = { at, by: text(actor.alias, 24), name: m.name, passed: v.passed };
      return { ok: true, changed: 'group' };
    }
    if (action === 'reflect') {
      const i = Number(msg.i);
      if (!Number.isInteger(i) || !S.reflection[i]) return fail('Pertanyaan refleksi tidak dikenal.');
      if (!group.presented) return fail('Refleksi dibuka setelah kelompok menyajikan menu kepada Kepala Kantin.');
      const t = text(msg.text, 800);
      if (t.length < 10) return fail('Tulis refleksimu minimal 10 karakter.');
      mine.reflect[i] = { text: t, at, fb: reflectFeedback(i, t) };
      return { ok: true, changed: 'mine', result: { i, fb: mine.reflect[i].fb } };
    }
    return fail('Aksi tidak dikenal.');
  }

  /** Ringkasan untuk panel guru dan layar PjBL. */
  function summary(group, mine) {
    const pos = P.pos.map((p) => posScore(group, p.id));
    const v = group.menu ? validateMenu(group.menu) : null;
    return {
      total: pos.reduce((n, s) => n + s.points, 0),
      max: P.pos.length * R.perPos,
      pos: pos.map((s) => ({ pos: s.pos, points: s.points, done: s.done, total: s.total, passed: s.passed, rereadLeft: s.rereadLeft.length, logbook: Boolean(group.logbook[s.pos]) })),
      unlocked: [1, 2, 3, 4, 5, 6].filter((n) => unlocked(group, n)),
      menu: group.menu ? { name: group.menu.name, passed: v.passed, failed: v.failed, price: v.totals.price, energy: v.totals.energy } : null,
      presented: group.presented,
      rubric: { ...autoRubric(group.menu), ...group.rubric },
      reflections: mine ? Object.keys(mine.reflect).length : 0
    };
  }

  const isKey = (k) => typeof k === 'string' && !BAD.has(k);

  window.NUTRANTARA_PJBL_CORE = {
    data: P, questions: QUESTIONS, cards: CARDS, methods: METHODS, snacks: SNACKS, letters: LETTERS,
    freshMine, freshGroup, normMine, normGroup, normMenu, grade, posScore, unlocked, totalScore,
    optionOrder, feedbackText, computeMenu, validateMenu, autoRubric, reflectFeedback, apply, summary, isKey
  };
})();
