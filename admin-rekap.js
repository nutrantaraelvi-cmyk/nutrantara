/*
 * Panel guru NUTRANTARA — Rekap Jawaban Siswa (sejak 1.7).
 * Meminta laporan `rekap` dari server (disusun rekap-core.js di server), menampilkannya dalam empat tampilan
 * (Ringkasan nilai, Jawaban per soal, Analisis butir soal, Tulisan siswa) dengan filter, lalu mengunduhnya sebagai
 * Excel (.xlsx: semua lembar + matriks 1/0), CSV (tampilan & filter aktif), atau mencetaknya (lembar jawaban per siswa).
 * Satu definisi kolom (VIEWS) dipakai untuk tabel layar, CSV, Excel, dan cetak agar isinya selalu sama.
 * Tersambung ke admin.js lewat window.NutraAdmin (kirim perintah) dan event `nutra:admin` (pesan dari server).
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const PAGE = 200; // baris yang digambar di layar; unduhan & cetak selalu memuat semua baris
  const admin = () => window.NutraAdmin;

  let R = null; // laporan terakhir dari server
  let view = 'nilai';
  let limit = PAGE;
  let loading = false;
  const F = { bagian: '', pos: '', regu: '', siswa: '', hasil: '', urut: 'nomor' };

  // Waktu ditulis "2026-11-28 10:32" (waktu lokal) agar bisa diurutkan di Excel.
  const stamp = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const posLabel = (r) => (r.pos ? `Pos ${r.pos}` : '—');
  const hasilHtml = (r) => (r.hasil === 'Benar' ? '<span class="rk-hasil ok">✓ Benar</span>' : r.hasil === 'Salah' ? '<span class="rk-hasil no">✗ Salah</span>' : '<span class="rk-hasil">—</span>');
  const sebaranText = (r) => (r.sebaran || []).map((o) => `${o.pilihan}: ${o.n}${o.kunci ? ' (kunci)' : ''}`).join(' | ');
  const decimal = (n) => (n === null || n === undefined ? '—' : n.toFixed(2).replace('.', ','));

  // Kolom: h = judul, v = nilai untuk berkas/CSV, w = lebar Excel, wrap = teks terbungkus,
  // screen: false = hanya di berkas, html = isi sel di layar (wajib sudah di-escape), cls = kelas sel di layar.
  const C = {
    siswa: { h: 'Siswa', v: (r) => r.siswa, w: 18 },
    regu: { h: 'Regu', v: (r) => r.regu, w: 9 },
    bagian: { h: 'Bagian', v: (r) => r.bagian, w: 12 },
    pos: { h: 'Pos', v: (r) => r.pos, w: 6, html: posLabel },
    waktu: { h: 'Waktu', v: (r) => stamp(r.waktu), w: 16, cls: 'rk-nowrap' }
  };
  const VIEWS = {
    nilai: {
      label: 'Ringkasan Nilai',
      filters: ['regu', 'siswa'],
      rows: () => R.siswa,
      hint: 'Satu baris per siswa. Skor ekspedisi maks. 420 (nilai 0–100 = skor ÷ 420 × 100; predikat A ≥ 90, B ≥ 75, C ≥ 60, selain itu D). Skor PjBL terpisah, maks. 500. Kolom tambahan (per POS PjBL, XP, Bos, Kampung) ada di berkas Excel/CSV.',
      cols: [
        C.siswa, C.regu,
        { h: 'Status', v: (r) => r.daring, w: 9, screen: false },
        { h: 'Skor ekspedisi (/420)', v: (r) => r.skor, w: 12 },
        { h: 'Nilai ekspedisi (0–100)', v: (r) => r.nilai, w: 12 },
        { h: 'Predikat', v: (r) => r.predikat, w: 9 },
        { h: 'Segel (/6)', v: (r) => r.segel, w: 9 },
        { h: 'Benar ekspedisi (/10)', v: (r) => r.ekspBenar, w: 12 },
        ...[1, 2, 3, 4, 5].map((n) => ({ h: `Pos ${n} benar (/2)`, v: (r) => r[`pos${n}`], w: 10 })),
        { h: 'Pos 6', v: (r) => r.pos6, w: 13 },
        { h: 'Skor PjBL (/500)', v: (r) => r.pjbl, w: 11 },
        { h: 'Nilai PjBL (0–100)', v: (r) => r.nilaiPjbl, w: 11 },
        ...[1, 2, 3, 4, 5].map((n) => ({ h: `PjBL POS ${n} (/100)`, v: (r) => r[`pjbl${n}`], w: 10, screen: false })),
        { h: 'Menu POS 6', v: (r) => r.menu, w: 22, screen: false },
        { h: 'Menu disajikan', v: (r) => r.disajikan, w: 10 },
        { h: 'Rubrik prototype', v: (r) => r.rubrik, w: 22 },
        { h: 'Refleksi PjBL', v: (r) => r.refleksiPjbl, w: 10, screen: false },
        { h: 'Level', v: (r) => r.level, w: 7 },
        { h: 'XP', v: (r) => r.xp, w: 8, screen: false },
        { h: 'Quest Kampung tuntas', v: (r) => r.kampung, w: 10, screen: false },
        { h: 'Bos: benar', v: (r) => r.bosBenar, w: 9, screen: false },
        { h: 'Bos: dijawab', v: (r) => r.bosDijawab, w: 9, screen: false },
        { h: 'Terakhir aktif', v: (r) => stamp(r.terakhirAktif), w: 16, cls: 'rk-nowrap' },
        { h: 'Catatan validasi server', v: (r) => r.catatan, w: 40, wrap: true, html: (r) => (r.catatan ? `<span class="warn" title="${esc(r.catatan)}">⚠ ${r.catatan.split(' · ').length} catatan</span>` : '') }
      ]
    },
    jawaban: {
      label: 'Jawaban per Soal',
      filters: ['bagian', 'pos', 'regu', 'siswa', 'hasil'],
      rows: () => R.jawaban,
      hint: 'Satu baris per siswa per soal yang sudah dijawab, lengkap dengan kunci. Pilih satu siswa lalu tekan Cetak untuk lembar jawaban per siswa. PjBL: Hasil menilai pilihan pribadi, Poin dari jawaban kelompok.',
      cols: [
        C.siswa, C.regu, C.bagian, C.pos,
        { h: 'Kode butir', v: (r) => r.butir, w: 10, screen: false },
        { h: 'Butir', v: (r) => r.no, w: 22, wrap: true, html: (r) => `<b>${esc(r.butir)}</b><br><small>${esc(r.no)}</small>` },
        { h: 'Soal', v: (r) => r.soal, w: 50, wrap: true, cls: 'rk-long' },
        { h: 'Jawaban siswa', v: (r) => r.jawaban, w: 45, wrap: true, cls: 'rk-long' },
        { h: 'Kunci jawaban', v: (r) => r.kunci, w: 45, wrap: true, cls: 'rk-long' },
        { h: 'Hasil', v: (r) => r.hasil, w: 8, html: hasilHtml, cls: 'rk-nowrap' },
        { h: 'Poin', v: (r) => r.poin, w: 6 },
        { h: 'Poin maks.', v: (r) => r.maks, w: 7, screen: false },
        { h: 'Keterangan', v: (r) => r.keterangan, w: 36, wrap: true, cls: 'rk-mid' },
        C.waktu
      ]
    },
    analisis: {
      label: 'Analisis Butir',
      filters: ['bagian', 'pos', 'urut'],
      rows: () => R.analisis,
      hint: 'Tingkat kesukaran = persentase jawaban benar (> 70% mudah, 30–70% sedang, < 30% sukar). Daya beda = proporsi benar kelompok atas 27% dikurangi kelompok bawah 27% (≥ 0,40 sangat baik, 0,30–0,39 baik, 0,20–0,29 cukup, < 0,20 perlu ditinjau); dihitung bila minimal 10 siswa menjawab. Butir dengan % benar rendah menunjukkan miskonsepsi yang perlu dibahas di kelas.',
      cols: [
        { h: 'Kode butir', v: (r) => r.butir, w: 11 },
        C.bagian, C.pos,
        { h: 'Butir', v: (r) => r.no, w: 22, wrap: true },
        { h: 'Soal', v: (r) => r.soal, w: 50, wrap: true, cls: 'rk-long' },
        { h: 'Kunci jawaban', v: (r) => r.kunci, w: 40, wrap: true, cls: 'rk-mid' },
        { h: 'Dijawab', v: (r) => r.dijawab, w: 8 },
        { h: 'Benar', v: (r) => r.benar, w: 8 },
        { h: '% benar', v: (r) => r.persen, w: 8, html: (r) => (r.persen === null ? '—' : `<span class="rk-bar" style="--p:${Number(r.persen)}%"><b>${Number(r.persen)}%</b></span>`) },
        { h: 'Tingkat kesukaran', v: (r) => r.tingkat, w: 11 },
        { h: 'Daya beda', v: (r) => r.dayaBeda, w: 9, html: (r) => decimal(r.dayaBeda) },
        { h: 'Kualitas daya beda', v: (r) => r.kualitas, w: 13 },
        { h: 'Sebaran jawaban', v: sebaranText, w: 60, wrap: true, cls: 'rk-long', html: (r) => ((r.sebaran || []).length ? `<ul class="rk-seb">${r.sebaran.map((o) => `<li${o.kunci ? ' class="key"' : ''}><b>${Number(o.n)}×</b> ${esc(o.pilihan)}${o.kunci ? ' <em>(kunci)</em>' : ''}</li>`).join('')}</ul>` : '—') },
        { h: 'Jawaban keliru terbanyak', v: (r) => r.keliru, w: 36, wrap: true, screen: false },
        { h: 'Catatan', v: (r) => r.catatan, w: 40, wrap: true, cls: 'rk-mid' }
      ]
    },
    tulisan: {
      label: 'Tulisan Siswa',
      filters: ['bagian', 'pos', 'regu', 'siswa'],
      rows: () => R.tulisan,
      hint: 'Jawaban terbuka untuk dinilai dengan rubrik: alasan Paspor Pos 1–5, rancangan/telaah/revisi/refleksi Pos 6, logbook kelompok, prototype menu, dan refleksi PjBL.',
      cols: [
        C.siswa, C.regu, C.bagian, C.pos,
        { h: 'Jenis', v: (r) => r.jenis, w: 24, wrap: true },
        { h: 'Isi', v: (r) => r.isi, w: 80, wrap: true, cls: 'rk-text' },
        { h: 'Keterangan', v: (r) => r.keterangan, w: 36, wrap: true, cls: 'rk-mid' },
        C.waktu
      ]
    }
  };

  // ---------- Filter ----------

  const FILTER_LABEL = { bagian: 'Bagian', pos: 'Pos', regu: 'Regu', siswa: 'Siswa', hasil: 'Hasil', urut: 'Urutkan' };
  function sortRows(rows) {
    if (view !== 'analisis' || F.urut === 'nomor') return rows;
    const val = F.urut === 'sukar' ? (r) => r.persen : (r) => r.dayaBeda;
    return rows.slice().sort((a, b) => (val(a) === null) - (val(b) === null) || (val(a) ?? 0) - (val(b) ?? 0));
  }
  function filtered() {
    const v = VIEWS[view];
    return sortRows(v.rows().filter((r) => v.filters.every((f) => {
      if (f === 'bagian') return !F.bagian || r.bagian === F.bagian;
      if (f === 'pos') return !F.pos || String(r.pos) === F.pos;
      if (f === 'regu') return !F.regu || (F.regu === '-' ? !r.regu : r.regu === F.regu);
      if (f === 'siswa') return !F.siswa || r.sid === F.siswa;
      if (f === 'hasil') return !F.hasil || r.hasil === F.hasil;
      return true;
    })));
  }
  function describeFilters() {
    const parts = VIEWS[view].filters.filter((f) => f !== 'urut' && F[f]).map((f) => {
      const sel = $(`#rk-f-${f}`);
      const opt = sel && [...sel.options].find((o) => o.value === F[f]);
      return `${FILTER_LABEL[f]}: ${opt ? opt.textContent : F[f]}`;
    });
    return parts.length ? parts.join(' · ') : 'Semua data';
  }

  /** Isi pilihan filter dari data; nilai yang tidak ada lagi dikembalikan ke "Semua". */
  function fillFilters() {
    const set = (key, options) => {
      const sel = $(`#rk-f-${key}`);
      if (!sel) return;
      sel.innerHTML = options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('');
      if (!options.some(([value]) => value === F[key])) F[key] = options[0][0];
      sel.value = F[key];
    };
    const rows = VIEWS[view].rows();
    set('bagian', [['', 'Semua bagian'], ...[...new Set(rows.map((r) => r.bagian))].map((b) => [b, b])]);
    set('pos', [['', 'Semua pos'], ...[...new Set(rows.map((r) => r.pos).filter(Boolean))].sort((a, b) => a - b).map((n) => [String(n), `Pos ${n}`])]);
    const teams = [...new Set(R.siswa.map((s) => s.regu).filter(Boolean))].sort();
    set('regu', [['', 'Semua regu'], ['-', 'Tanpa regu (solo)'], ...teams.map((t) => [t, `Regu ${t}`])]);
    set('siswa', [['', `Semua siswa (${R.siswa.length})`], ...R.siswa.map((s) => [s.sid, s.siswa])]);
    set('hasil', [['', 'Semua hasil'], ['Benar', '✓ Benar'], ['Salah', '✗ Salah']]);
    set('urut', [['nomor', 'Nomor butir'], ['sukar', 'Paling sukar dulu'], ['beda', 'Daya beda terendah dulu']]);
    Object.keys(FILTER_LABEL).forEach((f) => { const wrap = $(`#rk-w-${f}`); if (wrap) wrap.hidden = !VIEWS[view].filters.includes(f); });
  }

  // ---------- Tampilan ----------

  function setBusy(on) {
    loading = on;
    const b = $('#rk-load');
    b.disabled = on;
    b.textContent = on ? 'Memuat…' : R ? '⟳ Muat ulang rekap' : '⟳ Muat rekap';
    ['#rk-xlsx', '#rk-csv', '#rk-print'].forEach((s) => { $(s).disabled = on || !R; });
  }

  function render() {
    document.querySelectorAll('[data-rk-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rkView === view)));
    const table = $('#rk-table');
    if (!R) {
      $('#rk-hint').textContent = '';
      $('#rk-count').textContent = loading ? 'Memuat rekap dari server…' : 'Tekan “Muat rekap” untuk mengambil data jawaban terbaru dari server kelas.';
      table.innerHTML = '';
      $('#rk-more').hidden = true;
      return;
    }
    const v = VIEWS[view];
    const cols = v.cols.filter((c) => c.screen !== false);
    const rows = filtered();
    $('#rk-hint').textContent = v.hint;
    $('#rk-count').textContent = rows.length
      ? `${rows.length.toLocaleString('id-ID')} baris${rows.length > limit ? `, ${limit.toLocaleString('id-ID')} pertama ditampilkan` : ''} · ${describeFilters()}. CSV dan cetak memuat semua baris yang cocok dengan filter.`
      : `Tidak ada data yang cocok (${describeFilters()}).`;
    const cellHtml = (c, r) => (c.html ? c.html(r) : esc(c.v(r) ?? ''));
    table.innerHTML = `<thead><tr>${cols.map((c) => `<th scope="col">${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, limit).map((r) => `<tr>${cols.map((c, i) => (i === 0 ? `<th scope="row">${cellHtml(c, r)}</th>` : `<td${c.cls ? ` class="${c.cls}"` : ''}>${cellHtml(c, r)}</td>`)).join('')}</tr>`).join('')}</tbody>`;
    const more = $('#rk-more');
    more.hidden = rows.length <= limit;
    more.textContent = `Tampilkan ${Math.min(1000, rows.length - limit).toLocaleString('id-ID')} baris lagi`;
  }

  function load() {
    if (loading) return;
    if (!admin() || !admin().isAuthed()) return;
    setBusy(true);
    render();
    admin().command('rekap');
  }

  // ---------- Unduh & cetak ----------

  const fileStamp = () => stamp(new Date().toISOString()).replace(/[: ]/g, '-');
  function download(name, data, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Teks siswa yang diawali = + - @ dijalankan sebagai rumus oleh Excel/Sheets: awali dengan ' agar tetap teks.
  const csvCell = (v) => {
    if (typeof v === 'number') return String(v);
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  function exportCsv() {
    const v = VIEWS[view];
    const rows = filtered();
    const text = [v.cols.map((c) => csvCell(c.h)).join(','), ...rows.map((r) => v.cols.map((c) => csvCell(c.v(r))).join(','))].join('\r\n');
    download(`nutrantara-${v.label.toLowerCase().replace(/\s+/g, '-')}-${fileStamp()}.csv`, `﻿${text}`, 'text/csv;charset=utf-8');
    admin().toast(`CSV “${v.label}” diunduh (${rows.length} baris).`);
  }

  const sheetOf = (key) => { const v = VIEWS[key]; return { name: v.label, cols: v.cols.map((c) => ({ h: c.h, w: c.w, wrap: c.wrap })), rows: v.rows().map((r) => v.cols.map((c) => c.v(r))) }; };
  /** Matriks siswa × butir: 1 = benar, 0 = salah, kosong = belum dijawab (masukan untuk aplikasi analisis butir). */
  function matrixSheet(bagian, name) {
    const items = R.analisis.filter((a) => a.bagian === bagian);
    const map = new Map();
    R.jawaban.forEach((j) => { if (j.bagian === bagian && j.hasil !== '—') map.set(`${j.sid}|${j.butir}`, j.hasil === 'Benar' ? 1 : 0); });
    return {
      name,
      cols: [{ h: 'Siswa', w: 18 }, { h: 'Regu', w: 9 }, ...items.map((a) => ({ h: a.butir, w: 8 })), { h: 'Jumlah benar', w: 10 }, { h: 'Dijawab', w: 9 }],
      rows: R.siswa.map((s) => {
        const vals = items.map((a) => (map.has(`${s.sid}|${a.butir}`) ? map.get(`${s.sid}|${a.butir}`) : null));
        const got = vals.filter((x) => x !== null);
        return [s.siswa, s.regu, ...vals, got.reduce((n, x) => n + x, 0), got.length];
      })
    };
  }
  function guideSheet() {
    const m = R.meta;
    return {
      name: 'Petunjuk',
      filter: false,
      cols: [{ h: 'Bagian', w: 24 }, { h: 'Keterangan', w: 110, wrap: true }],
      rows: [
        ['Berkas', 'NUTRANTARA — Rekap Jawaban Siswa (Biologi kelas XI, sistem pencernaan)'],
        ['Data server per', stamp(m.dibuat)],
        ['Kode kelas', m.kelas || '(tanpa kode kelas)'],
        ['Jumlah siswa', m.jumlahSiswa],
        ['Ringkasan Nilai', `Satu baris per siswa: skor ekspedisi (maks. ${m.maksEkspedisi}), nilai 0–100 dan predikat (A ≥ 90, B ≥ 75, C ≥ 60, D), segel, benar per pos, skor PjBL (maks. ${m.maksPjbl}), rubrik prototype, level, quest Kampung, jawaban Bos Mitos Gizi, dan catatan validasi server.`],
        ['Jawaban per Soal', 'Satu baris per siswa per soal yang sudah dijawab: soal, jawaban siswa, kunci, hasil (Benar/Salah), poin, keterangan, dan waktu. Ekspedisi: tiap tantangan dijawab sekali (benar 30 poin). Pos 1 dan Pos 2 punya beberapa varian kasus, jadi soal dan kunci mengikuti kasus masing-masing siswa. Pada pos yang dikerjakan regu, jawaban tantangan adalah jawaban bersama regu. PjBL: Hasil menilai pilihan pribadi siswa; Poin berasal dari jawaban kelompok (benar di percobaan 1 = 10, percobaan 2 = 5).'],
        ['Matriks Ekspedisi / PjBL', '1 = benar, 0 = salah, kosong = belum dijawab. Siap dipakai untuk analisis butir lanjutan (mis. aplikasi analisis soal).'],
        ['Analisis Butir', `Tingkat kesukaran (persentase benar: > 70% mudah, 30–70% sedang, < 30% sukar), daya beda (kelompok atas − bawah 27%: ≥ 0,40 sangat baik, 0,30–0,39 baik, 0,20–0,29 cukup, < 0,20 perlu ditinjau; dihitung bila ≥ ${m.minDayaBeda} siswa menjawab), sebaran jawaban, dan jawaban keliru terbanyak. Ekspedisi: jawaban regu dihitung sekali per regu. Bos Mitos Gizi: jumlah jawaban seluruh event.`],
        ['Tulisan Siswa', 'Jawaban terbuka untuk dinilai dengan rubrik: alasan Paspor, rancangan/telaah/revisi/refleksi Pos 6, logbook kelompok, prototype menu, dan refleksi PjBL.'],
        ['Catatan', 'Angka gizi di Pos 1–5 adalah data simulasi, bukan saran gizi. Siswa yang bermain sebagai tamu (tanpa server kelas) tidak tercatat. Berkas ini berisi alias siswa: simpan dan bagikan sesuai kebijakan data sekolah.']
      ]
    };
  }
  function exportXlsx() {
    if (!window.NutraXlsx) { admin().toast('Penulis Excel belum termuat. Muat ulang halaman.'); return; }
    const bytes = window.NutraXlsx.build([
      guideSheet(), sheetOf('nilai'), sheetOf('jawaban'), matrixSheet('Ekspedisi', 'Matriks Ekspedisi'), matrixSheet('PjBL', 'Matriks PjBL'), sheetOf('analisis'), sheetOf('tulisan')
    ]);
    download(`nutrantara-rekap-jawaban-${fileStamp()}.xlsx`, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    admin().toast(`Excel rekap diunduh: ${R.siswa.length} siswa, ${R.jawaban.length} jawaban, ${R.tulisan.length} tulisan.`);
  }

  function printView() {
    const v = VIEWS[view];
    const cols = v.cols.filter((c) => c.screen !== false);
    const rows = filtered();
    const one = F.siswa && v.filters.includes('siswa') ? R.siswa.find((s) => s.sid === F.siswa) : null;
    const title = one && view === 'jawaban' ? `Lembar Jawaban · ${one.siswa}` : v.label;
    const sub = one ? `Skor ekspedisi ${one.skor}/420 (nilai ${one.nilai}, predikat ${one.predikat}) · ${one.segel}/6 segel · PjBL ${one.pjbl ?? 0}/500${one.regu ? ` · regu ${one.regu}` : ''}` : '';
    const cellHtml = (c, r) => (c.html ? c.html(r) : esc(c.v(r) ?? ''));
    $('#rekap-print').innerHTML = `<h1>NUTRANTARA · ${esc(title)}</h1>${sub ? `<p><b>${esc(sub)}</b></p>` : ''}<p>${esc(describeFilters())} · ${rows.length} baris · dicetak ${esc(stamp(new Date().toISOString()))} · data server ${esc(stamp(R.meta.dibuat))}</p>
      <table><thead><tr>${cols.map((c) => `<th scope="col">${esc(c.h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td${c.cls ? ` class="${c.cls}"` : ''}>${cellHtml(c, r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    document.body.classList.add('cetak-rekap');
    window.print();
  }
  window.addEventListener('afterprint', () => { document.body.classList.remove('cetak-rekap'); $('#rekap-print').innerHTML = ''; });

  // ---------- Peristiwa ----------

  window.addEventListener('nutra:admin', (e) => {
    const m = e.detail || {};
    if (m.type === 'admin-rekap' && m.rekap) {
      R = m.rekap;
      limit = PAGE;
      setBusy(false);
      fillFilters();
      render();
      $('#rk-time').textContent = `DATA ${new Date(R.meta.dibuat).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · ${R.meta.jumlahSiswa} SISWA`;
    } else if (m.type === 'admin-error' && loading) {
      setBusy(false);
      render();
    }
  });

  document.querySelectorAll('[data-rk-view]').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.rkView;
    limit = PAGE;
    if (R) fillFilters();
    render();
  }));
  Object.keys(FILTER_LABEL).forEach((f) => {
    const sel = $(`#rk-f-${f}`);
    if (sel) sel.addEventListener('change', () => { F[f] = sel.value; limit = PAGE; render(); });
  });
  $('#rk-load').addEventListener('click', load);
  $('#rk-more').addEventListener('click', () => { limit += 1000; render(); });
  $('#rk-csv').addEventListener('click', () => { if (R) exportCsv(); });
  $('#rk-xlsx').addEventListener('click', () => { if (R) exportXlsx(); });
  $('#rk-print').addEventListener('click', () => { if (R) printView(); });

  // Rekap dimuat otomatis saat bagian ini pertama kali terlihat (data bisa besar, jadi tidak saat panel dibuka).
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((x) => x.isIntersecting) && !R && admin() && admin().isAuthed()) { load(); io.disconnect(); }
    });
    io.observe($('#rekap'));
  }

  window.NutraRekap = {
    /** Dari dialog Detail: buka Jawaban per Soal untuk satu siswa. */
    focusStudent(id) {
      view = 'jawaban';
      Object.assign(F, { bagian: '', pos: '', regu: '', hasil: '', siswa: id });
      limit = PAGE;
      if (R) { fillFilters(); render(); } else load();
      $('#rekap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  setBusy(false);
  render();
})();
