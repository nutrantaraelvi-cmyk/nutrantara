/*
 * NUTRANTARA — musik latar & efek bunyi (sejak 1.7). Skrip biasa (defer) setelah game.js/rpg.js → window.NutraMusic.
 *
 * Lagu (music-data.js) disintesis langsung dengan Web Audio API: metalofon gamelan dengan "ombak" (dua bilah sedikit
 * berbeda nada), gong, suling, angklung, kolintang, kecapi, sape, sasando, talempong, ukulele, kendang, tifa, rebana.
 * Tanpa rekaman/sampel/CDN: bebas hak cipta pihak lain, ringan, dan jalan luring di LAN kelas (CSP 'self').
 *
 * Adegan dipilih dari fase (masuk/memuat, lobi), layar (Peta, Toko, PjBL, Paspor/Rapor/Peringkat/Prestasi), mode pilih map,
 * pulau tempat pemain berada (0–12), dan event Bos Mitos Gizi; layar misi memakai lagu pulau posnya dalam versi tenang.
 * Perpindahan adegan memakai crossfade. Peramban baru mengizinkan bunyi setelah interaksi pertama, jadi musik mulai saat itu.
 * Preferensi di localStorage 'nutrantara-musik-v1' { on, vol, fx }. Guru bisa membisukan semua siswa (settings.musicOn).
 */
(() => {
  const DATA = window.NUTRANTARA_MUSIC;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!DATA) return;
  const PREF_KEY = 'nutrantara-musik-v1';
  const { SCALES, THEMES, FORM, BARS } = DATA;
  const $ = (s) => document.querySelector(s);

  const prefs = (() => {
    const p = { on: true, vol: 0.55, fx: true };
    try { Object.assign(p, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch { /* abaikan */ }
    p.vol = Math.min(1, Math.max(0, Number(p.vol) || 0));
    return p;
  })();
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* abaikan */ } };

  // ---------- Lagu: not angka → peristiwa per langkah 1/16 ----------
  const PENTA = { 1: 0, 2: 1, 3: 2, 5: 3, 6: 4 };
  function compile(th) {
    if (th.compiled) return th.compiled;
    const sc = SCALES[th.scale].cents;
    const idxOf = (d) => (sc.length === 5 ? PENTA[d] ?? Math.min(4, d - 1) : d - 1);
    const sec = {};
    ['A', 'B'].forEach((L) => {
      const at = {};
      let last = null;
      th[L].split('|').map((s) => s.trim()).filter(Boolean).forEach((bar, b) => {
        const toks = bar.split(/\s+/);
        const step = 16 / toks.length;
        toks.forEach((tok, i) => {
          const s = Math.round(b * 16 + i * step);
          if (tok === '-') { if (last && last.end === s) last.end = s + step; return; }
          last = null;
          const m = /^([1-7])([',]*)$/.exec(tok);
          if (!m) return;
          const oct = (m[2].match(/'/g) || []).length - (m[2].match(/,/g) || []).length;
          last = { s, end: s + step, idx: idxOf(Number(m[1])) + oct * sc.length };
          at[s] = last;
        });
      });
      sec[L] = { at, chords: th.chords[L].map(idxOf) };
    });
    th.compiled = { sec, sc, fifth: sc.length === 5 ? 3 : 4 };
    return th.compiled;
  }
  const freq = (th, idx, oct = 0) => {
    const sc = SCALES[th.scale].cents;
    const n = sc.length;
    const o = Math.floor(idx / n);
    const c = sc[((idx % n) + n) % n] + 1200 * (o + oct);
    return 440 * 2 ** ((th.root - 69) / 12 + c / 1200);
  };

  // ---------- Bunyi dasar ----------
  let noiseBuf = null;
  function noise(c) {
    if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function tone(c, type, f, t, out, a, d, v) {
    if (v <= 0.0002 || f > 16000) return;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + a + d + 0.05);
  }
  function drop(c, t, out, f0, f1, td, d, v) {
    const o = c.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + td);
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
  }
  function hiss(c, t, out, type, f, d, v, q = 0.8) {
    const s = c.createBufferSource(); s.buffer = noise(c);
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.5, d + 0.05);
  }
  // Metalofon gamelan: dua bilah berselisih beberapa Hz (ombak) + parsial tak harmonis + ketukan pemukul.
  function metal(c, t, f, v, out, decay, ombak, partials) {
    tone(c, 'sine', f, t, out, 0.003, decay, v * 0.55);
    tone(c, 'sine', f + ombak, t, out, 0.003, decay, v * 0.4);
    partials.forEach(([m, k]) => tone(c, 'sine', f * m, t, out, 0.002, decay * 0.35, v * k));
    tone(c, 'triangle', f * 4, t, out, 0.001, 0.035, v * 0.07);
  }
  function pluck(c, t, f, v, out, decay, bright, type = 'sawtooth') {
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(bright, t); lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 220), t + decay * 0.6);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + decay + 0.05);
    tone(c, 'sine', f, t, out, 0.004, decay * 0.8, v * 0.35);
  }
  function wood(c, t, f, dur, v, out, decay, part) {
    const hits = dur > 0.55 ? Math.min(8, Math.floor(dur / 0.1)) : 1; // nada panjang digulung (roll) seperti pemain kolintang
    for (let i = 0; i < hits; i += 1) {
      const k = i ? 0.45 : 1;
      tone(c, 'sine', f, t + i * 0.1, out, 0.002, decay, v * 0.8 * k);
      tone(c, 'sine', f * part, t + i * 0.1, out, 0.001, 0.07, v * 0.22 * k);
    }
  }

  // Instrumen: (c, t, f, dur, v, out)
  const INST = {
    saron: (c, t, f, dur, v, o) => metal(c, t, f, v, o, 1.8, 2.4, [[2.76, 0.16], [5.4, 0.05]]),
    gangsa: (c, t, f, dur, v, o) => metal(c, t, f, v, o, 1.1, 6, [[2.76, 0.2], [5.4, 0.07]]),
    bonang: (c, t, f, dur, v, o) => metal(c, t, f, v, o, 1.2, 1.6, [[2, 0.2], [3, 0.06]]),
    talempong: (c, t, f, dur, v, o) => metal(c, t, f, v, o, 0.8, 3, [[2, 0.28], [4.1, 0.08]]),
    totobuang: (c, t, f, dur, v, o) => metal(c, t, f, v, o, 1.0, 2, [[2.4, 0.2], [3.9, 0.06]]),
    gong: (c, t, f, dur, v, o) => {
      tone(c, 'sine', f, t, o, 0.02, 5, v * 0.5); tone(c, 'sine', f + 0.8, t, o, 0.02, 5, v * 0.4);
      tone(c, 'sine', f * 2.01, t, o, 0.01, 2.6, v * 0.3); tone(c, 'sine', f * 2.98, t, o, 0.01, 1.2, v * 0.1);
      hiss(c, t, o, 'lowpass', 300, 0.12, v * 0.12);
    },
    kempul: (c, t, f, dur, v, o) => { tone(c, 'sine', f, t, o, 0.01, 2.4, v * 0.5); tone(c, 'sine', f + 1.2, t, o, 0.01, 2.4, v * 0.4); tone(c, 'sine', f * 2.01, t, o, 0.01, 1, v * 0.2); },
    kethuk: (c, t, f, dur, v, o) => { tone(c, 'sine', f, t, o, 0.002, 0.13, v); tone(c, 'triangle', f * 2.4, t, o, 0.001, 0.05, v * 0.3); },
    suling: (c, t, f, dur, v, out) => {
      const end = t + dur;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.05);
      g.gain.linearRampToValueAtTime(v * 0.75, Math.max(t + 0.06, end)); g.gain.setTargetAtTime(0.0001, end, 0.06);
      g.connect(out);
      const lfo = c.createOscillator(); lfo.frequency.value = 5.2;
      const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.45, dur + 0.01));
      lfo.connect(lg);
      [['sine', 1], ['triangle', 0.18]].forEach(([type, k]) => {
        const o = c.createOscillator(); o.type = type;
        o.frequency.setValueAtTime(f * 0.985, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
        lg.connect(o.frequency);
        const kg = c.createGain(); kg.gain.value = k; o.connect(kg); kg.connect(g);
        o.start(t); o.stop(end + 0.4);
      });
      lfo.start(t); lfo.stop(end + 0.4);
      hiss(c, t, g, 'bandpass', f * 1.5, 0.12, 0.25, 3);
    },
    angklung: (c, t, f, dur, v, o) => {
      const n = Math.max(2, Math.min(9, Math.round(dur * 13)));
      for (let i = 0; i < n; i += 1) {
        const k = v * (i ? 0.5 + 0.2 * ((i * 7) % 3) / 2 : 1) * (1 - i / (n + 3));
        tone(c, 'sine', f, t + i / 13, o, 0.004, 0.16, k * 0.7);
        tone(c, 'sine', f * 2, t + i / 13, o, 0.003, 0.1, k * 0.35);
      }
    },
    kolintang: (c, t, f, dur, v, o) => wood(c, t, f, dur, v, o, 0.5, 4),
    calung: (c, t, f, dur, v, o) => wood(c, t, f, dur, v * 0.9, o, 0.35, 3),
    kecapi: (c, t, f, dur, v, o) => pluck(c, t, f, v, o, 1.2, 3500),
    sape: (c, t, f, dur, v, o) => pluck(c, t, f, v, o, 0.9, 5000),
    sasando: (c, t, f, dur, v, o) => { pluck(c, t, f, v * 0.8, o, 2, 2600, 'triangle'); tone(c, 'sine', f * 1.003, t, o, 0.01, 1.6, v * 0.25); }
  };
  const LEAD_OCT = { suling: 1, angklung: 1, kolintang: 1, calung: 1, gangsa: 1, talempong: 1, kecapi: 1, sape: 1 };

  function drum(c, t, k, v, o) {
    switch (k) {
      case 'D': drop(c, t, o, 170, 82, 0.09, 0.32, v * 0.9); hiss(c, t, o, 'lowpass', 500, 0.05, v * 0.25); break; // kendang "dhung"
      case 't': hiss(c, t, o, 'bandpass', 2200, 0.06, v * 0.55, 1.2); drop(c, t, o, 420, 330, 0.02, 0.07, v * 0.35); break; // "tak"
      case 'k': hiss(c, t, o, 'highpass', 3500, 0.03, v * 0.3); drop(c, t, o, 700, 600, 0.01, 0.03, v * 0.15); break; // "ket"
      case 'T': drop(c, t, o, 210, 96, 0.12, 0.45, v); hiss(c, t, o, 'lowpass', 900, 0.04, v * 0.3); break; // tifa rendah
      case 'u': drop(c, t, o, 380, 300, 0.03, 0.14, v * 0.55); hiss(c, t, o, 'bandpass', 2600, 0.05, v * 0.35); break; // tifa tinggi
      case 'j': hiss(c, t, o, 'highpass', 6500, 0.14, v * 0.3); hiss(c, t + 0.03, o, 'highpass', 7000, 0.08, v * 0.18); break; // kecrek rebana
      case 'K': drop(c, t, o, 120, 48, 0.08, 0.3, v); break;
      case 'S': hiss(c, t, o, 'bandpass', 1800, 0.14, v * 0.5); drop(c, t, o, 240, 180, 0.02, 0.08, v * 0.3); break;
      default: break;
    }
  }
  const DRUMS = {
    kendang: ['D.k.t.k.D.kDt.k.', 'D.t.D.t.DtDtD.tt'],
    kendangLite: ['D...t...D..kt...', 'D...t...D.t.t.t.'],
    jaipong: ['D.kDt.kDD.kDt.tk', 'DtDtDtDtD.t.DDtt'],
    tifa: ['T..uT.u.T..uT.uu', 'T.u.T.u.TuTuTTuu'],
    rebana: ['D..j..j.D.j...j.', 'D.j.D.j.DjDjD.jj'],
    pop: ['K...S..KK...S...', 'K...S..KK.S.SSSS'],
    bali: ['D.tkD.tkDktkD.tk', 'DtDtDtDtDtDtDDtt']
  };

  // ---------- Rantai audio ----------
  function chain(c) {
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25;
    comp.connect(c.destination);
    const music = c.createGain(); music.connect(comp);
    const sfx = c.createGain(); sfx.connect(comp);
    const dry = c.createGain(); dry.connect(music);
    const send = c.createGain(); send.gain.value = 0.3;
    const verb = c.createConvolver();
    const len = Math.floor(c.sampleRate * 2.2);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * Math.exp((-3.6 * i) / len * 2.2); }
    verb.buffer = ir;
    send.connect(verb); verb.connect(music);
    const sfxSend = c.createGain(); sfxSend.gain.value = 0.35; sfxSend.connect(verb);
    sfx.connect(sfxSend);
    return { comp, music, sfx, dry, send };
  }
  const PAN = { lead: 0, compL: -0.4, compR: 0.4, bass: 0, pad: 0, drum: 0.12, perc: -0.15, shaker: 0.45 };
  const LEVEL = { lead: 0.85, compL: 0.5, compR: 0.5, bass: 0.7, pad: 0.35, drum: 0.6, perc: 0.75, shaker: 0.22 };

  function makeTrack(c, ch, th, at, calm) {
    const gain = c.createGain(); gain.gain.value = 0.0001;
    gain.connect(ch.dry); gain.connect(ch.send);
    const bus = {};
    Object.keys(PAN).forEach((k) => {
      const g = c.createGain(); g.gain.value = LEVEL[k];
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = PAN[k]; g.connect(p); p.connect(gain); } else g.connect(gain);
      bus[k] = g;
    });
    compile(th);
    return { th, gain, bus, next: at, step: 0, calm, alive: true, spb: 60 / th.bpm / 4 };
  }

  // Satu langkah 1/16 lagu pada waktu t.
  function playStep(c, tr, t) {
    const th = tr.th; const cp = th.compiled; const B = tr.bus;
    const bar = Math.floor(tr.step / 16); const st = tr.step % 16;
    const secIdx = Math.floor(bar / BARS) % FORM.length;
    const loop = Math.floor(bar / (BARS * FORM.length));
    const L = FORM[secIdx]; const b = bar % BARS;
    const sec = cp.sec[L];
    const root = sec.chords[b];
    const chord = [root, root + 2, root + 4];
    const vary = loop % 2 === 1;
    const calm = tr.calm || (loop % 3 === 2 && L === 'B'); // jeda tenang sesekali agar tidak melelahkan
    const sp = tr.spb;
    const f = (idx, oct) => freq(th, idx, oct);

    const ev = sec.at[b * 16 + st];
    if (ev) {
      const name = vary && th.lead2 ? th.lead2 : th.lead;
      INST[name](c, t, f(ev.idx, LEAD_OCT[name] || 0), (ev.end - ev.s) * sp, st % 4 === 0 ? 0.34 : 0.28, B.lead);
    }
    // Kolotomik gamelan: gong di awal bagian, kempul & kethuk.
    if (th.gong) {
      if (b === 0 && st === 0) INST.gong(c, t, f(root, -2), 0, th.gong === 'soft' ? 0.35 : 0.5, B.perc);
      if (th.gong !== 'soft' && st === 8 && (b % 2 === 1 || th.gong === 'busy')) INST.kempul(c, t, f(root, -1), 0, 0.28, B.perc);
    }
    if ((th.kethuk || th.gong === true) && (st === 4 || st === 12) && !calm) INST.kethuk(c, t, f(root, 1), 0, 0.09, B.perc);
    // Bas
    const fifth = root + cp.fifth;
    const BASS = {
      pluck: { 0: [root, 6], 6: [root, 2], 8: [fifth, 4], 12: [root + cp.sc.length, 4] },
      gong: { 0: [root, 8], 8: [fifth, 8] },
      cello: { 0: [root, 3], 3: [root + 2, 3], 6: [fifth, 2], 8: [root, 3], 11: [fifth, 3], 14: [root + 2, 2] }
    }[th.bass] || {};
    const bn = BASS[st];
    if (bn) {
      if (th.bass === 'gong') { tone(c, 'sine', f(bn[0], -1), t, B.bass, 0.01, 1.6, 0.3); tone(c, 'triangle', f(bn[0], -1), t, B.bass, 0.01, 0.6, 0.12); }
      else pluck(c, t, f(bn[0], -1), th.bass === 'cello' ? 0.26 : 0.3, B.bass, Math.min(0.7, bn[1] * sp + 0.15), 900, 'triangle');
    }
    // Lapisan akor (pad)
    if (th.pad === 'string' && st === 0) padChord(c, t, chord.map((i) => f(i, 0)), 16 * sp, 0.07, B.pad);
    if (th.pad === 'drone' && st === 0 && b % 2 === 0) padChord(c, t, [f(root, -1), f(fifth, -1)], 32 * sp, 0.08, B.pad);
    // Iringan
    const cv = calm ? 0.6 : 1;
    const ext = [0, 1, 2, 3, 4, 5].map((i) => chord[i % 3] + Math.floor(i / 3) * cp.sc.length);
    switch (th.comp) {
      case 'bonang': if (st % 2 === 0) INST.bonang(c, t, f(chord[[0, 1, 0, 2][(st / 2) % 4]], 0), 0, 0.16 * cv, st % 4 ? B.compR : B.compL); break;
      case 'kotekan': if (!calm || st % 2 === 0) INST.gangsa(c, t, f(ext[[0, 1, 2, 1, 3, 1, 2, 1][st % 8]], 1), 0, 0.11 * cv, st % 2 ? B.compR : B.compL); break;
      case 'kecapi': if (st % 2 === 0) INST.kecapi(c, t, f(ext[[0, 1, 2, 3, 2, 1, 2, 1][st / 2]], 0), 0, 0.14 * cv, B.compL); break;
      case 'sasando': INST.sasando(c, t, f(ext[[0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3][st]], -1), 0, 0.09 * cv, st < 8 ? B.compL : B.compR); break;
      case 'sape': if (!calm || st % 2 === 0) INST.sape(c, t, f(ext[[3, 1, 2, 1, 3, 1, 2, 0, 3, 1, 2, 1, 3, 2, 1, 0][st]], 0), 0, 0.1 * cv, B.compR); break;
      case 'talempong':
        if (st % 4 === 0) INST.talempong(c, t, f(chord[(st / 4) % 3], 0), 0, 0.13 * cv, B.compL);
        if (st % 4 === 2) INST.talempong(c, t, f(chord[(st / 4 + 1) % 3 | 0], 1), 0, 0.1 * cv, B.compR);
        break;
      case 'angklung': if (st === 0 || st === 8) [chord[0], chord[1]].forEach((i) => INST.angklung(c, t, f(i, 0), 6 * sp, 0.1 * cv, B.compL)); break;
      case 'stab': if (st % 4 === 2) chord.forEach((i) => INST.kolintang(c, t, f(i, 0), 0, 0.09 * cv, B.compR)); break;
      case 'ukulele': if (st % 4 === 2) strum(c, t, chord.concat(root + cp.sc.length).map((i) => f(i, 0)), st % 8 === 2, 0.1 * cv, B.compR); break;
      case 'strum': if ([0, 3, 6, 8, 10, 12, 14].includes(st)) strum(c, t, chord.map((i) => f(i, 0)), st % 4 === 0, (st % 4 === 0 ? 0.09 : 0.06) * cv, B.compR); break;
      default: break;
    }
    // Perkusi
    if (!calm && th.drum) {
      const fill = b === BARS - 1 && secIdx % 2 === 1;
      const k = DRUMS[th.drum][fill ? 1 : 0][st];
      if (k !== '.') drum(c, t, k, st % 4 === 0 ? 0.42 : 0.3, B.drum);
    }
    if (!calm && th.shaker) {
      const v = st % 4 === 2 ? 0.5 : st % 2 ? 0.16 : 0.28;
      if (th.shaker === 'ceng') { if (st % 2) { hiss(c, t, B.shaker, 'highpass', 5000, 0.08, v * 0.5); tone(c, 'triangle', 5200, t, B.shaker, 0.001, 0.05, v * 0.05); } }
      else hiss(c, t, B.shaker, 'bandpass', 6000, 0.05, v * 0.5, 1.5);
    }
  }
  function padChord(c, t, freqs, dur, v, out) {
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.6); g.gain.setValueAtTime(v, t + dur); g.gain.setTargetAtTime(0.0001, t + dur, 0.3);
    lp.connect(g); g.connect(out);
    freqs.forEach((fr) => [-7, 7].forEach((det) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 1.6); }));
  }
  function strum(c, t, freqs, down, v, out) {
    (down ? freqs : freqs.slice().reverse()).forEach((fr, i) => pluck(c, t + i * 0.012, fr, v, out, 0.3, 2800));
  }

  // ---------- Efek bunyi (segel, naik level, lencana, bos kalah) ----------
  const STINGS = {
    segel: (c, t, o) => { [0, 2, 3, 5].forEach((d, i) => INST.saron(c, t + i * 0.12, freq(THEMES.menu, d, 1), 0, 0.3, o)); INST.gong(c, t + 0.5, freq(THEMES.menu, 0, -1), 0, 0.5, o); },
    naik: (c, t, o) => { [0, 1, 2, 3, 4, 5].forEach((d, i) => INST.angklung(c, t + i * 0.08, freq(THEMES['pulau-8'], d, 1), 0.25, 0.22, o)); INST.kolintang(c, t + 0.55, freq(THEMES['pulau-8'], 5, 1), 0.8, 0.3, o); },
    lencana: (c, t, o) => { INST.kolintang(c, t, freq(THEMES.butik, 4, 1), 0, 0.3, o); INST.kolintang(c, t + 0.14, freq(THEMES.butik, 7, 1), 0, 0.3, o); },
    menang: (c, t, o) => { [0, 2, 4, 7].forEach((d, i) => INST.bonang(c, t + i * 0.14, freq(THEMES['pulau-0'], d, 1), 0, 0.3, o)); INST.gong(c, t + 0.6, freq(THEMES['pulau-0'], 0, -1), 0, 0.6, o); }
  };

  // ---------- Pemutar langsung ----------
  let ctx = null; let ch = null; let track = null; const fading = []; let timer = null; let sceneId = null; let calmNow = false;
  const teacherMuted = () => { const net = window.NutraNet; return Boolean(net && net.online && net.settings && net.settings.musicOn === false); };
  const musicWanted = () => prefs.on && prefs.vol > 0 && !teacherMuted();
  const volGain = () => prefs.vol * prefs.vol * 1.6;

  function ensureCtx() {
    if (ctx || !AC) return ctx;
    try { ctx = new AC(); ch = chain(ctx); } catch { ctx = null; return null; }
    ch.music.gain.value = volGain(); ch.sfx.gain.value = volGain() * 1.2;
    timer = setInterval(tick, 50);
    return ctx;
  }
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 0.25;
    [track, ...fading].forEach((tr) => {
      if (!tr || !tr.alive) return;
      while (tr.next < horizon) { playStep(ctx, tr, tr.next); tr.next += tr.spb; tr.step += 1; }
    });
  }
  function fadeOut(tr, sec = 1.2) {
    if (!tr) return;
    const t = ctx.currentTime;
    tr.gain.gain.cancelScheduledValues(t); tr.gain.gain.setValueAtTime(Math.max(0.0001, tr.gain.gain.value), t); tr.gain.gain.exponentialRampToValueAtTime(0.0001, t + sec);
    fading.push(tr);
    setTimeout(() => { tr.alive = false; fading.splice(fading.indexOf(tr), 1); setTimeout(() => tr.gain.disconnect(), 3000); }, sec * 1000 + 50);
  }
  function play(id, calm) {
    const th = THEMES[id];
    if (!ensureCtx() || !th) return;
    const level = calm ? 0.7 : 1;
    if (track && track.th === th) {
      if (track.calm !== calm) { track.calm = calm; track.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.4); }
      return;
    }
    fadeOut(track);
    const t = ctx.currentTime + 0.12;
    track = makeTrack(ctx, ch, th, t, calm);
    track.gain.gain.setValueAtTime(0.0001, t); track.gain.gain.exponentialRampToValueAtTime(level, t + 1.6);
    showNow(th);
  }
  function stopMusic() { if (track && ctx) fadeOut(track, 0.8); track = null; }

  // ---------- Adegan ----------
  const CALM_SCREENS = new Set(['mission', 'kitchen']);
  const ARCHIVE = new Set(['passport', 'report', 'leaderboard', 'prestasi']);
  let lastIsland = 0;
  function scene() {
    const phase = document.body.dataset.phase;
    if (phase === 'lobby') return ['lobi', false];
    if (phase !== 'game') return ['menu', false];
    const game = window.NutraGame;
    const scr = game ? game.visibleScreen : 'world';
    if (scr === 'shop') return ['butik', false];
    if (scr === 'pjbl') return ['pjbl', true];
    if (scr === 'map') return ['peta', false];
    if (ARCHIVE.has(scr)) return ['arsip', false];
    if (CALM_SCREENS.has(scr)) return [`pulau-${game.state.activePos}`, true];
    if (document.body.classList.contains('overview')) return ['peta', false];
    const boss = window.NutraRPG && window.NutraRPG.boss;
    if (boss && boss.state === 'active') return ['bos', false];
    const w3 = window.NutraWorld3D; const w2 = window.NutraWorld2D;
    const isl = w3 && w3.supported ? w3.island : w2 && w2.running ? w2.island : null;
    if (Number.isInteger(isl) && isl >= 0 && THEMES[`pulau-${isl}`]) lastIsland = isl;
    return [`pulau-${lastIsland}`, false];
  }
  let bossWas = 'idle';
  function update() {
    const boss = window.NutraRPG && window.NutraRPG.boss;
    const bs = boss ? boss.state : 'idle';
    if (bossWas === 'active' && bs === 'won') sting('menang');
    bossWas = bs;
    const [id, calm] = scene();
    sceneId = id; calmNow = calm;
    if (!ctx) { render(); return; }
    ch.music.gain.setTargetAtTime(musicWanted() ? volGain() : 0, ctx.currentTime, 0.15);
    ch.sfx.gain.setTargetAtTime(prefs.fx && !teacherMuted() ? volGain() * 1.2 : 0, ctx.currentTime, 0.05);
    if (musicWanted()) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); play(id, calm); } else stopMusic();
    render();
  }
  function sting(name) {
    if (!prefs.fx || teacherMuted() || !STINGS[name] || !ensureCtx()) return;
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
    const t = ctx.currentTime + 0.05;
    // Musik diredam sejenak agar efek terdengar jelas.
    if (musicWanted()) { ch.music.gain.setTargetAtTime(volGain() * 0.35, t, 0.05); ch.music.gain.setTargetAtTime(volGain(), t + 1.8, 0.4); }
    STINGS[name](ctx, t, ch.sfx);
  }

  // Bunyi baru diizinkan peramban setelah interaksi pertama.
  const unlock = () => { if (!musicWanted() && !prefs.fx) return; ensureCtx(); if (ctx && ctx.state === 'suspended') ctx.resume().then(update, () => {}); update(); };
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (musicWanted()) ctx.resume(); });
  document.addEventListener('nutra:screen', () => setTimeout(update, 0));
  new MutationObserver(() => update()).observe(document.body, { attributes: true, attributeFilter: ['data-phase', 'class'] });
  setInterval(update, 600);
  if (window.NutraNet) window.NutraNet.on('settings', update);

  // ---------- Kontrol musik ----------
  const box = document.createElement('div');
  box.className = 'music-ctl';
  box.innerHTML = `
    <button type="button" class="music-btn" id="music-btn" aria-expanded="false" aria-controls="music-panel"><span aria-hidden="true">♪</span> <span id="music-state">Musik</span></button>
    <div class="music-panel" id="music-panel" role="group" aria-label="Pengaturan musik" hidden>
      <p class="music-now"><small>SEDANG DIPUTAR</small><b id="music-title">—</b><span id="music-note"></span></p>
      <label class="music-row"><input type="checkbox" id="music-on" /> Musik latar</label>
      <label class="music-row"><input type="checkbox" id="music-fx" /> Efek segel, level &amp; lencana</label>
      <label class="music-vol" for="music-vol">Volume <output id="music-vol-out"></output></label>
      <input type="range" id="music-vol" min="0" max="100" step="5" />
      <p class="music-hint" id="music-hint"></p>
      <p class="music-credit">Lagu orisinal NUTRANTARA, dimainkan langsung oleh peramban. Bebas hak cipta pihak lain.</p>
    </div>
    <span class="music-pop" id="music-pop" aria-hidden="true"></span>`;
  document.body.append(box);
  const btn = $('#music-btn'); const panel = $('#music-panel');
  const setOpen = (on) => { panel.hidden = !on; btn.setAttribute('aria-expanded', String(on)); };
  btn.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !box.contains(e.target)) setOpen(false); });
  $('#music-on').addEventListener('change', (e) => { prefs.on = e.target.checked; if (prefs.on && prefs.vol === 0) prefs.vol = 0.5; savePrefs(); update(); });
  $('#music-fx').addEventListener('change', (e) => { prefs.fx = e.target.checked; savePrefs(); update(); if (prefs.fx) sting('lencana'); });
  $('#music-vol').addEventListener('input', (e) => { prefs.vol = Number(e.target.value) / 100; savePrefs(); update(); });

  let popTimer = null;
  function showNow(th) {
    const pop = $('#music-pop');
    pop.textContent = `♪ ${th.title}`;
    pop.classList.add('on');
    clearTimeout(popTimer);
    popTimer = setTimeout(() => pop.classList.remove('on'), 3500);
  }
  function render() {
    const muted = teacherMuted();
    const on = musicWanted();
    const th = THEMES[sceneId];
    $('#music-state').textContent = muted ? 'Musik: dibisukan guru' : on ? 'Musik: nyala' : 'Musik: mati';
    btn.dataset.on = String(on);
    $('#music-on').checked = prefs.on; $('#music-on').disabled = muted;
    $('#music-fx').checked = prefs.fx; $('#music-fx').disabled = muted;
    $('#music-vol').value = String(Math.round(prefs.vol * 100)); $('#music-vol').disabled = muted;
    $('#music-vol-out').textContent = `${Math.round(prefs.vol * 100)}%`;
    $('#music-title').textContent = th ? th.title : '—';
    $('#music-note').textContent = th ? `${th.note} · ${SCALES[th.scale].name}${calmNow ? ' · versi tenang' : ''}` : '';
    $('#music-hint').textContent = !AC ? 'Peramban ini tidak mendukung Web Audio.' : muted ? 'Guru sedang membisukan musik untuk seluruh kelas.' : on && (!ctx || ctx.state !== 'running') ? 'Musik mulai setelah kamu menekan tombol atau mengeklik layar.' : '';
  }
  render();

  // Render luring sebuah lagu (untuk uji/QA): NutraMusic.renderTheme('pulau-3', 20) → Promise<AudioBuffer>.
  function renderTheme(id, seconds = 20, rate = 44100) {
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const c = new Off(2, Math.ceil(seconds * rate), rate);
    const chn = chain(c); chn.music.gain.value = volGain();
    const tr = makeTrack(c, chn, THEMES[id], 0, false); tr.gain.gain.value = 1;
    while (tr.next < seconds - 0.5) { playStep(c, tr, tr.next); tr.next += tr.spb; tr.step += 1; }
    return c.startRendering();
  }

  window.NutraMusic = {
    sting,
    renderTheme,
    themes: THEMES,
    get scene() { return sceneId; },
    get playing() { return Boolean(track && ctx && ctx.state === 'running') ? track.th.title : null; }
  };
})();
