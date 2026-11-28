/*
 * NUTRANTARA — Rekap Jawaban Siswa untuk guru (sejak 1.7).
 * Skrip biasa tanpa DOM (window.NUTRANTARA_REKAP). HANYA dimuat server.js lewat vm (tidak ada di STATIC):
 * panel guru menerima hasil build() lewat pesan WS `admin-rekap`, lalu menampilkan, mengunduh, dan mencetaknya.
 *
 * build(input, deps) menyusun satu laporan dari data yang tersimpan di server kelas:
 *  - siswa    : ringkasan nilai per siswa (skor ekspedisi /420, nilai 0–100 & predikat, PjBL /500, level, Kampung, Bos)
 *  - jawaban  : satu baris per siswa × butir soal yang sudah dijawab: soal, jawaban siswa, kunci, hasil, poin, waktu
 *               (Ekspedisi Pos 1–5, PjBL POS 1–5 = pilihan pribadi + jawaban kelompok, kuis warga Kampung)
 *  - tulisan  : jawaban terbuka (alasan Paspor, rancangan/telaah/revisi/refleksi Pos 6, logbook, menu & refleksi PjBL)
 *  - analisis : analisis butir soal: tingkat kesukaran, daya beda, sebaran pilihan, jawaban keliru terbanyak
 *               (Bos Mitos Gizi dari tally per soal di db.bossStats, karena jawaban event bos tidak disimpan per siswa)
 * Server mengirim progres yang sudah ditimpa data regu dan divalidasi ulang (validateProgress pada salinan), jadi
 * benar/poin di sini sama dengan skor server. Kunci soal bervarian diambil lewat deps.defsFor (kasus milik siswa).
 */
window.NUTRANTARA_REKAP = (() => {
  const txt = (v, max = 4000) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const arr = (v) => (Array.isArray(v) ? v : []);
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const MIN_DAYA_BEDA = 10; // daya beda baru dihitung bila minimal 10 siswa menjawab bagian itu

  // Sama dengan predikat() di game.js (rapor siswa): A ≥ 90, B ≥ 75, C ≥ 60, selain itu D.
  const predikat = (n) => (n >= 90 ? 'A' : n >= 75 ? 'B' : n >= 60 ? 'C' : 'D');
  // Kriteria umum analisis butir: tingkat kesukaran p (proporsi benar) dan daya beda D (kelompok atas − bawah 27%).
  const tingkat = (p) => (p === null ? '—' : p > 70 ? 'Mudah' : p >= 30 ? 'Sedang' : 'Sukar');
  const kualitas = (d) => (d === null ? '—' : d >= 0.4 ? 'Sangat baik' : d >= 0.3 ? 'Baik' : d >= 0.2 ? 'Cukup' : 'Perlu ditinjau');

  /** Teks jawaban satu tantangan Ekspedisi (setara responseText di game.js, tahan terhadap data asing). */
  function responseText(def, r) {
    if (r === null || r === undefined || (Array.isArray(r) && !r.length)) return '';
    const opt = (list, v) => { const o = arr(list).find((x) => x.value === v); return o ? o.text : `«${txt(typeof v === 'object' ? JSON.stringify(v) : v, 40)}»`; };
    if (def.type === 'single') return opt(def.options, r);
    if (def.type === 'multi') return arr(r).map((v) => opt(def.options, v)).join(' · ');
    if (def.type === 'order') return arr(r).map((v, i) => `${i + 1}. ${opt(def.items, v)}`).join(' → ');
    if (def.type === 'sort') return arr(def.items).map((it) => `${it.text} = ${obj(r)[it.value] ? opt(def.categories, obj(r)[it.value]) : '?'}`).join(' · ');
    return txt(JSON.stringify(r), 200);
  }
  /** Tanda pengenal jawaban untuk sebaran: pilihan ganda kompleks tidak bergantung urutan klik. */
  const signature = (def, r) => JSON.stringify(def.type === 'multi' ? arr(r).slice().sort() : r === undefined ? null : r);
  const letterOpt = (options, id) => { const i = arr(options).findIndex((o) => o.id === id); return i < 0 ? '' : `${LETTERS[i]}. ${options[i].text}`; };

  function build(input, deps) {
    const M = deps.missions;
    const PJ = deps.pjbl;
    const KD = deps.kampung;
    const POINTS = deps.points; // poin satu tantangan Ekspedisi yang benar (30)
    const SEAL = deps.seal; // poin segel tiap pos (20)
    const analysisM = M.filter((m) => m.type === 'analysis');
    const project = M.find((m) => m.type === 'project');
    const maxExp = analysisM.reduce((n, m) => n + m.challenges.length * POINTS, 0) + M.length * SEAL;
    const quizzes = arr(KD && KD.QUESTS).filter((q) => q.kind === 'quiz');
    const npcName = (id) => (KD && KD.NPCS && KD.NPCS[id] ? KD.NPCS[id].name : id);
    const R = PJ.data.rules;
    const S6 = PJ.data.pos6;

    const siswa = [];
    const jawaban = [];
    const tulisan = [];
    const tally = new Map(); // butir → Map(sumber → { ok, sig, text }); jawaban regu dihitung sekali per regu
    const groupFirst = new Map(); // soal PjBL → Map(kelompok → benar di percobaan 1)
    const put = (butir, src, val) => { if (!tally.has(butir)) tally.set(butir, new Map()); tally.get(butir).set(src, val); };

    const players = arr(input.players).slice().sort((a, b) => String(a.alias).localeCompare(String(b.alias), 'id'));
    players.forEach((p) => {
      const base = { sid: p.id, siswa: txt(p.alias, 40), regu: txt(p.team, 12) };
      const posts = obj(obj(p.progress).posts);
      const shared = new Set(arr(p.sharedPosts).map(Number));
      const score = Number(p.score) || 0;
      const nilai = Math.round((score / maxExp) * 100);
      const row = {
        ...base, daring: p.online ? 'Daring' : 'Luring', terakhirAktif: txt(p.lastSeen, 30), dibuat: txt(p.createdAt, 30), tamat: txt(p.finishedAt, 30),
        skor: score, nilai, predikat: predikat(nilai), segel: Number(p.seals) || 0, ekspBenar: 0, ekspDijawab: 0
      };
      const textRow = (bagian, pos, jenis, isi, keterangan, waktu) => { if (txt(isi)) tulisan.push({ ...base, bagian, pos, jenis, isi: txt(isi, 6000), keterangan: txt(keterangan, 300), waktu: txt(waktu, 30) }); };

      // ---------- Ekspedisi Pos 1–5: dua tantangan per pos, satu jawaban per tantangan ----------
      analysisM.forEach((m) => {
        const s = obj(posts[m.id]);
        const defs = deps.defsFor(m, s);
        const v = m.variants ? (Number.isInteger(s.variant) && m.variants[s.variant] ? s.variant : 0) : null;
        const kasus = v === null ? '' : `Kasus ${v + 1}/${m.variants.length}: ${m.variants[v].name}`;
        let benar = 0;
        let dijawab = 0;
        defs.forEach((def, i) => {
          const c = obj(arr(s.challenges)[i]);
          if (!c.complete) return;
          dijawab += 1;
          if (c.correct) benar += 1;
          const team = Boolean(p.team) && (shared.has(m.id) || Array.isArray(c.by));
          const log = arr(c.log);
          const last = obj(log[log.length - 1]);
          const butir = `E${m.id}.${i + 1}`;
          const jawab = responseText(def, c.response);
          jawaban.push({
            ...base, bagian: 'Ekspedisi', pos: m.id, butir, no: `Tantangan ${i + 1} · ${def.label}`, soal: txt(def.question),
            jawaban: jawab, kunci: responseText(def, def.correct), hasil: c.correct ? 'Benar' : 'Salah', poin: Number(c.points) || 0, maks: POINTS,
            keterangan: [kasus, team ? `Jawaban regu${arr(c.by).length ? ` (disepakati ${arr(c.by).map((x) => txt(x, 24)).join(', ')})` : ''}` : ''].filter(Boolean).join(' · '),
            waktu: txt(c.at || last.at, 30)
          });
          put(butir, team ? `regu:${p.team}` : p.id, { ok: Boolean(c.correct), sig: signature(def, c.response), text: jawab });
        });
        row.ekspBenar += benar;
        row.ekspDijawab += dijawab;
        row[`pos${m.id}`] = dijawab ? benar : null;
        textRow('Ekspedisi', m.id, 'Alasan Paspor', s.reason, s.sealed ? 'Pos tersegel' : 'Draf, pos belum disegel', s.sealedAt);
      });

      // ---------- Ekspedisi Pos 6: rancangan menu regu, telaah, revisi, refleksi individu ----------
      if (project) {
        const s = obj(posts[project.id]);
        const regu = p.team && shared.has(project.id) ? 'Rancangan regu' : '';
        const draft = (d, jenis) => {
          d = obj(d);
          if (!d.savedAt) return;
          const bahan = arr(d.ingredients).map(obj).filter((x) => txt(x.name)).map((x) => `${txt(x.name, 60)}${txt(x.grams, 10) ? ` ${txt(x.grams, 10)} g` : ''}${txt(x.form, 20) ? ` (${txt(x.form, 20)})` : ''}${txt(x.source, 80) ? ` [sumber: ${txt(x.source, 80)}]` : ''}`).join('; ');
          textRow('Ekspedisi', project.id, jenis, [
            `Menu: ${txt(d.menuName, 80) || '—'}`, `Sasaran: ${txt(d.target, 80) || '—'}${txt(d.mealTime, 40) ? ` · ${txt(d.mealTime, 40)}` : ''}`,
            `Bahan: ${bahan || '—'}`, `Alasan: ${txt(d.rationale) || '—'}`,
            txt(d.missingNote) ? `Data yang belum tersedia: ${txt(d.missingNote)}` : '', txt(d.changeReason) ? `Alasan perubahan: ${txt(d.changeReason)}` : ''
          ].filter(Boolean).join('\n'), regu, d.savedAt);
        };
        draft(s.initial, 'Rancangan menu · versi 1');
        const rv = obj(s.review);
        if (rv.savedAt) textRow('Ekspedisi', project.id, 'Telaah rancangan', txt(rv.notes) || '(tanpa catatan)', `${arr(rv.checks).length}/${arr(project.reviewChecks).length} butir periksa terpenuhi${txt(rv.reviewer, 40) ? ` · penelaah: ${txt(rv.reviewer, 40)}` : ''}`, rv.savedAt);
        draft(s.revision, 'Rancangan menu · revisi');
        const rf = obj(s.reflection);
        if (txt(rf.learned) || txt(rf.contribution)) textRow('Ekspedisi', project.id, 'Refleksi Pos 6', `Yang dipelajari: ${txt(rf.learned) || '—'}\nKontribusi: ${txt(rf.contribution) || '—'}`, s.sealed ? 'Pos tersegel' : 'Draf, pos belum disegel', s.sealedAt);
        row[`pos${project.id}`] = s.sealed ? 'Tersegel' : s.started ? 'Dalam proses' : 'Belum mulai';
      }

      // ---------- PjBL POS 1–5: pilihan pribadi + jawaban kelompok (maks. 2 percobaan) ----------
      const mine = obj(p.pjblMine);
      const group = obj(p.pjblGroup);
      const picks = obj(mine.picks);
      const answers = obj(group.answers);
      const groupKey = p.team ? `regu:${p.team}` : p.id;
      Object.values(PJ.questions).forEach((q) => {
        const pick = picks[q.id];
        const a = obj(answers[q.id]);
        const tries = arr(a.tries).map(obj);
        if (!pick && !tries.length) return;
        const butir = q.id.toUpperCase();
        const trail = tries.map((t) => `${LETTERS[q.options.findIndex((o) => o.id === t.r)] || '?'} ${t.r === q.key ? '✓' : '✗'}${txt(t.by, 24) ? ` (${txt(t.by, 24)})` : ''}`).join(' → ');
        const status = !tries.length ? 'Kelompok belum mengunci jawaban' : `Jawaban kelompok: ${trail}${a.done ? '' : ' · tersisa 1 percobaan'}`;
        jawaban.push({
          ...base, bagian: 'PjBL', pos: q.pos, butir, no: `Soal ${q.index + 1}`, soal: txt(q.text),
          jawaban: pick ? letterOpt(q.options, pick) : '(belum memilih sendiri)', kunci: letterOpt(q.options, q.key),
          hasil: pick ? (pick === q.key ? 'Benar' : 'Salah') : '—', poin: a.done ? Number(a.points) || 0 : null, maks: R.first,
          keterangan: `${status}. Hasil = pilihan pribadi; poin = jawaban kelompok.`, waktu: txt(tries.length ? tries[tries.length - 1].at : '', 30)
        });
        if (pick) put(butir, p.id, { ok: pick === q.key, sig: pick, text: letterOpt(q.options, pick) });
        if (tries.length) {
          if (!groupFirst.has(q.id)) groupFirst.set(q.id, new Map());
          groupFirst.get(q.id).set(groupKey, tries[0].r === q.key);
        }
      });
      let pj = null;
      try { pj = PJ.summary(PJ.normGroup(group), PJ.normMine(mine)); } catch { pj = null; }
      if (pj) {
        row.pjbl = pj.total;
        row.nilaiPjbl = Math.round((pj.total / pj.max) * 100);
        pj.pos.forEach((x) => { row[`pjbl${x.pos}`] = x.done ? x.points : null; });
        const rub = obj(pj.rubric);
        const filled = S6.rubric.filter((r) => Number.isInteger(rub[r.id]));
        const sum = filled.reduce((n, r) => n + rub[r.id], 0);
        row.rubrik = filled.length ? `${sum}/${S6.rubric.length * 4}${filled.length < S6.rubric.length ? ` · ${S6.rubric.length - filled.length} aspek belum dinilai` : ''}` : '';
        row.refleksiPjbl = `${pj.reflections}/${S6.reflection.length}`;
      }
      row.menu = group.menu ? txt(group.menu.name, 60) || '(tanpa nama)' : '';
      row.disajikan = group.presented ? 'Ya' : 'Belum';
      Object.entries(obj(group.logbook)).forEach(([pos, e]) => {
        e = obj(e);
        textRow('PjBL', Number(pos), `Logbook POS ${pos}`, e.text, `Luaran kelompok${txt(e.by, 24) ? ` · ditulis ${txt(e.by, 24)}` : ''}`, e.at);
      });
      if (group.menu) {
        const menu = group.menu;
        let info = '';
        let detail = '';
        try {
          const v = PJ.validateMenu(menu);
          info = `${v.passed}/${v.checks.length} kriteria · ${v.totals.energy} kkal · protein ${v.totals.protein} g · Rp${Number(v.totals.price).toLocaleString('id-ID')}`;
          detail = v.totals.rows.map((r) => `${r.card.name} (${(PJ.methods[r.method] || { name: r.method }).name.toLowerCase()}, ${r.portion}×)`).join(', ');
          if (v.failed) info += ` · belum terpenuhi: ${v.checks.filter((c) => !c.ok).map((c) => c.name).join('; ')}`;
        } catch { /* menu rusak: tampilkan apa adanya */ }
        textRow('PjBL', 6, 'Prototype menu POS 6', `Menu: ${txt(menu.name, 60) || '(tanpa nama)'}\nIsi piring: ${detail || '—'}\nAlasan: ${txt(menu.reason) || '—'}`,
          `${info}${group.presented ? ` · disajikan ${txt(group.presented.by, 24)}` : ' · belum disajikan'}${txt(menu.by, 24) ? ` · disusun ${txt(menu.by, 24)}` : ''}`, menu.at);
      }
      Object.entries(obj(mine.reflect)).forEach(([i, e]) => {
        e = obj(e);
        const q = S6.reflection[Number(i)];
        if (q) textRow('PjBL', 6, `Refleksi PjBL ${Number(i) + 1}`, `${q.q}\n→ ${txt(e.text)}`, `Umpan balik otomatis: ${e.fb === 'good' ? 'berbukti' : 'perlu diperbaiki'}`, e.at);
      });

      // ---------- Kuis warga Kampung (hanya jumlah percobaan yang disimpan) ----------
      const kq = obj(obj(p.kampung).quests);
      quizzes.forEach((q) => {
        const st = obj(kq[q.id]);
        const tries = Number(st.tries) || 0;
        const done = st.state === 'done';
        if (!done && !tries) return;
        const butir = `K-${q.id}`;
        const first = done && tries <= 1;
        jawaban.push({
          ...base, bagian: 'Kampung', pos: null, butir, no: txt(q.title, 60), soal: txt(q.text),
          jawaban: done ? (tries <= 1 ? 'Tepat di percobaan pertama' : `Tepat setelah ${tries} percobaan`) : `Belum tepat (${tries} percobaan)`,
          kunci: letterOpt(q.options, q.answer), hasil: first ? 'Benar' : 'Salah', poin: null, maks: null,
          keterangan: `Kuis ${npcName(q.npc)} · hasil dinilai dari percobaan pertama`, waktu: txt(done ? st.at : '', 30)
        });
        put(butir, p.id, { ok: first, sig: first ? 'ok' : 'x', text: '' });
      });
      row.kampung = Object.values(kq).filter((x) => obj(x).state === 'done').length;

      const rpg = obj(p.rpg);
      row.bosBenar = Number(rpg.bossHits) || 0;
      row.bosDijawab = Math.max(row.bosBenar, Number(rpg.bossAnswers) || 0);
      row.level = Number(p.level) || 1;
      row.xp = Number(p.xp) || 0;
      row.catatan = arr(p.flags).map((f) => txt(f, 200)).join(' · ');
      siswa.push(row);
    });

    // ---------- Daya beda: kelompok atas vs bawah 27% menurut jumlah benar per bagian ----------
    function dayaBeda(bagian) {
      const per = new Map();
      jawaban.forEach((j) => {
        if (j.bagian !== bagian || j.hasil === '—') return;
        const s = per.get(j.sid) || { total: 0, items: new Map() };
        s.items.set(j.butir, j.hasil === 'Benar');
        if (j.hasil === 'Benar') s.total += 1;
        per.set(j.sid, s);
      });
      const ranked = [...per.values()].sort((a, b) => b.total - a.total);
      if (ranked.length < MIN_DAYA_BEDA) return () => null;
      const k = Math.max(1, Math.round(ranked.length * 0.27));
      const up = ranked.slice(0, k);
      const lo = ranked.slice(-k);
      return (butir) => Math.round(((up.filter((s) => s.items.get(butir)).length - lo.filter((s) => s.items.get(butir)).length) / k) * 100) / 100;
    }
    const dbExp = dayaBeda('Ekspedisi');
    const dbPj = dayaBeda('PjBL');

    const analisis = [];
    const item = (o, dijawab, benar, db) => {
      const persen = pct(benar, dijawab);
      const d = db ? db(o.butir) : null;
      analisis.push({ ...o, dijawab, benar, persen, tingkat: tingkat(persen), dayaBeda: d, kualitas: kualitas(d) });
    };
    const okCount = (list) => list.filter((x) => x.ok).length;
    analysisM.forEach((m) => m.challenges.forEach((def, i) => {
      const butir = `E${m.id}.${i + 1}`;
      const list = [...(tally.get(butir) || new Map()).values()];
      const groups = new Map();
      list.forEach((x) => { const g = groups.get(x.sig) || { pilihan: x.text, n: 0, kunci: x.ok }; g.n += 1; groups.set(x.sig, g); });
      const sebaran = [...groups.values()].sort((a, b) => b.n - a.n).slice(0, 6);
      const wrong = sebaran.find((g) => !g.kunci);
      item({
        butir, bagian: 'Ekspedisi', pos: m.id, no: `Tantangan ${i + 1} · ${def.label}`,
        soal: `${txt(def.question)}${m.variants ? ` (teks kasus 1; ada ${m.variants.length} varian kasus)` : ''}`,
        kunci: m.variants ? 'Sesuai kasus tiap siswa (lihat Jawaban per Soal)' : responseText(def, def.correct),
        sebaran, keliru: wrong ? `${wrong.pilihan} (${wrong.n}×)` : '',
        catatan: `Jawaban regu dihitung sekali per regu.${m.variants ? ' Teks pilihan diambil dari salah satu kasus.' : ''}`
      }, list.length, okCount(list), dbExp);
    }));
    Object.values(PJ.questions).forEach((q) => {
      const butir = q.id.toUpperCase();
      const list = [...(tally.get(butir) || new Map()).values()];
      const sebaran = q.options.map((o, i) => ({ pilihan: `${LETTERS[i]}. ${o.text}`, n: list.filter((x) => x.sig === o.id).length, kunci: o.id === q.key }));
      const wrong = sebaran.filter((o) => !o.kunci && o.n).sort((a, b) => b.n - a.n)[0];
      const g = [...(groupFirst.get(q.id) || new Map()).values()];
      item({
        butir, bagian: 'PjBL', pos: q.pos, no: `Soal ${q.index + 1}`, soal: txt(q.text), kunci: letterOpt(q.options, q.key), sebaran,
        keliru: wrong ? `${wrong.pilihan} (${wrong.n}×)` : '',
        catatan: `Dihitung dari pilihan pribadi.${g.length ? ` Kelompok benar di percobaan 1: ${g.filter(Boolean).length}/${g.length}.` : ''}`
      }, list.length, okCount(list), dbPj);
    });
    quizzes.forEach((q) => {
      const butir = `K-${q.id}`;
      const list = [...(tally.get(butir) || new Map()).values()];
      item({ butir, bagian: 'Kampung', pos: null, no: txt(q.title, 60), soal: txt(q.text), kunci: letterOpt(q.options, q.answer), sebaran: [], keliru: '', catatan: `Kuis ${npcName(q.npc)}. Benar = tepat di percobaan pertama.` }, list.length, okCount(list), null);
    });
    const bs = obj(input.bossStats);
    arr(deps.boss).forEach((q) => {
      const t = obj(bs[q.id]);
      const n = { mitos: Math.max(0, Math.floor(Number(t.mitos)) || 0), fakta: Math.max(0, Math.floor(Number(t.fakta)) || 0) };
      const wrongKey = q.answer === 'mitos' ? 'fakta' : 'mitos';
      item({
        butir: `B-${q.id}`, bagian: 'Bos Mitos Gizi', pos: null, no: q.id, soal: txt(q.text), kunci: q.answer === 'mitos' ? 'Mitos' : 'Fakta',
        sebaran: [{ pilihan: 'Mitos', n: n.mitos, kunci: q.answer === 'mitos' }, { pilihan: 'Fakta', n: n.fakta, kunci: q.answer === 'fakta' }],
        keliru: n[wrongKey] ? `${wrongKey === 'mitos' ? 'Mitos' : 'Fakta'} (${n[wrongKey]}×)` : '',
        catatan: `Jumlah jawaban seluruh event (bukan per siswa). ${txt(q.explain, 300)}`
      }, n.mitos + n.fakta, n[q.answer] || 0, null);
    });

    return {
      meta: { dibuat: txt(input.at, 30), kelas: txt(input.classCode, 24), jumlahSiswa: siswa.length, maksEkspedisi: maxExp, maksPjbl: PJ.data.pos.length * R.perPos, minDayaBeda: MIN_DAYA_BEDA },
      siswa, jawaban, tulisan, analisis
    };
  }

  return { build, responseText, predikat, tingkat, kualitas };
})();
