/* NUTRANTARA — renderer atlas enam dunia pulau (window.NutraIslands).
 * Satu fungsi render untuk semua pulau: membaca window.NUTRANTARA_ISLANDS (island-data.js)
 * dan menggambar latar SVG berlapis (belakang · tengah · depan), bangunan quest,
 * objek alam, satwa, serta hotspot yang dapat dijangkau keyboard.
 * Hanya tampilan: tidak menyentuh state permainan, Paspor, atau localStorage progres.
 * Satu-satunya preferensi yang disimpan: latar diciutkan/dibuka (`nutrantara-latar-v1`).
 */
(function () {
  'use strict';
  const DATA = window.NUTRANTARA_ISLANDS || {};
  const PREF = 'nutrantara-latar-v1';
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GY = 345; // garis tanah

  // ---------- Lapisan belakang: siluet medan per tipe ----------
  const BACK = {
    'hutan-hujan': (p) => `<path d="M0 230 C80 150 160 170 230 120 C300 80 360 150 430 130 C520 100 600 60 690 110 C770 150 850 90 1000 140 L1000 300 L0 300Z" fill="${p.far}" opacity=".75"/><path d="M0 270 C120 220 220 250 330 215 C460 180 560 240 700 205 C820 175 900 220 1000 200 L1000 320 L0 320Z" fill="${p.mid}" opacity=".7"/>`,
    vulkan: (p) => `<path d="M260 300 L470 70 C490 55 520 55 540 70 L760 300Z" fill="${p.far}"/><path d="M470 70 C490 55 520 55 540 70 L520 92 L505 80 L488 95Z" fill="#e9e3d6"/><path d="M0 300 C120 230 200 240 300 265 C420 220 600 230 720 260 C820 230 920 240 1000 250 L1000 320 L0 320Z" fill="${p.mid}" opacity=".85"/><g class="isl-smoke"><circle cx="505" cy="50" r="14" fill="#fff" opacity=".55"/><circle cx="522" cy="34" r="10" fill="#fff" opacity=".4"/></g>`,
    'sungai-besar': (p) => `<path d="M0 250 Q30 225 60 240 Q90 215 125 238 Q160 210 200 235 Q240 212 280 236 Q320 215 360 238 Q400 214 440 236 Q480 212 520 238 Q560 215 600 236 Q640 212 680 238 Q720 216 760 236 Q800 210 840 236 Q880 214 920 238 Q960 218 1000 236 L1000 320 L0 320Z" fill="${p.far}" opacity=".85"/>`,
    karst: (p) => `<path d="M0 300 L0 230 C10 160 40 150 60 230 C70 150 110 130 125 230 L160 300Z" fill="${p.far}"/><path d="M600 300 L610 190 C620 120 660 110 670 190 L690 140 C700 90 740 95 745 160 L760 300Z" fill="${p.far}"/><path d="M820 300 L825 150 C835 70 900 70 905 160 L915 300Z" fill="${p.far}"/><path d="M920 300 L930 200 C940 150 980 150 990 205 L1000 300Z" fill="${p.far}" opacity=".85"/>`,
    'pegunungan-tinggi': (p) => `<path d="M0 290 L110 140 L160 180 L260 60 L330 150 L400 100 L500 30 L590 130 L650 90 L760 170 L840 80 L930 160 L1000 120 L1000 310 L0 310Z" fill="${p.far}"/><path d="M240 85 L260 60 L282 88 L268 84Z M480 52 L500 30 L522 56 L505 50Z M825 100 L840 80 L858 103Z" fill="#eef0fb"/><path d="M0 300 C150 250 280 280 420 250 C560 225 700 270 1000 240 L1000 330 L0 330Z" fill="${p.mid}" opacity=".8"/>`,
    'savana-pesisir': (p) => `<path d="M180 280 L300 150 C310 140 320 140 330 150 L460 280Z" fill="${p.far}" opacity=".7"/><path d="M500 300 C600 250 700 240 820 260 C900 245 960 250 1000 255 L1000 320 L500 320Z" fill="${p.mid}"/>`
  };

  // ---------- Objek alam (glyph) — x = pusat, digambar di atas garis tanah ----------
  const tree = (c1, c2) => `<rect x="-6" y="-70" width="12" height="70" fill="#6b4a2b"/><g class="isl-sway"><ellipse cx="0" cy="-90" rx="52" ry="32" fill="${c1}"/><ellipse cx="-26" cy="-74" rx="30" ry="20" fill="${c2}"/><ellipse cx="28" cy="-76" rx="32" ry="20" fill="${c2}"/></g>`;
  const GLYPH = {
    tree: (p) => tree(p.mid, p.ground),
    mossy: (p) => `<rect x="-7" y="-80" width="14" height="80" fill="#5c5a3a"/><path d="M-7 -60 h14 M-7 -35 h14" stroke="#9bc27a" stroke-width="6"/><g class="isl-sway"><ellipse cx="0" cy="-98" rx="40" ry="26" fill="#4f7d5c"/><ellipse cx="0" cy="-104" rx="26" ry="14" fill="#9bc27a" opacity=".7"/></g>`,
    palm: () => `<path d="M0 0 Q4 -50 0 -110" stroke="#7b5a3a" stroke-width="8" fill="none"/><g class="isl-sway"><circle cx="0" cy="-112" r="10" fill="#5e7a2e"/>${[0, 40, 80, 120, 160, 200, 250, 300].map((a) => `<path d="M0 -112 l${Math.round(Math.cos(a / 57.3) * 40)} ${Math.round(Math.sin(a / 57.3) * 20)}" stroke="#6f9a3a" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>`,
    bamboo: () => `<g class="isl-sway">${[-14, 0, 14].map((dx, i) => `<path d="M${dx} 0 V${-110 - i * 15}" stroke="#7fae4a" stroke-width="6"/><path d="M${dx - 4} -40 h8 M${dx - 4} -80 h8" stroke="#4f7a2a" stroke-width="2"/><path d="M${dx} ${-100 - i * 15} l18 -10 M${dx} ${-90 - i * 15} l-18 -8" stroke="#8cc05a" stroke-width="4" stroke-linecap="round"/>`).join('')}</g>`,
    fern: () => `<g class="isl-sway">${[-60, -30, 0, 30, 60].map((a) => `<path d="M0 0 Q${a * 0.6} -30 ${a} -38" stroke="#4f9a4a" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}</g>`,
    rafflesia: () => `<g>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="${Math.round(Math.cos(a / 57.3) * 16)}" cy="${-10 + Math.round(Math.sin(a / 57.3) * 7)}" rx="13" ry="8" fill="#b8342a"/>`).join('')}<circle cx="0" cy="-10" r="8" fill="#5a1a14"/><circle cx="-8" cy="-14" r="2" fill="#f3d6c8"/><circle cx="9" cy="-7" r="2" fill="#f3d6c8"/></g>`,
    vine: () => `<path class="isl-sway" d="M0 -150 C-20 -120 20 -100 0 -70 C-20 -40 15 -20 0 0" stroke="#5e8a3a" stroke-width="4" fill="none"/><circle cx="-8" cy="-110" r="5" fill="#7fb04a"/><circle cx="8" cy="-50" r="5" fill="#7fb04a"/>`,
    rock: () => `<path d="M-30 0 L-22 -22 L-4 -30 L20 -24 L32 0Z" fill="#6a6c70"/><path d="M-22 -22 L-4 -30 L2 -14Z" fill="#8a8d92"/>`,
    crops: () => `${[-36, -18, 0, 18, 36].map((dx) => `<path d="M${dx} 0 V-26" stroke="#5f8f2e" stroke-width="3"/><ellipse cx="${dx}" cy="-28" rx="6" ry="9" fill="#e5b93a"/>`).join('')}<rect x="-44" y="-2" width="88" height="6" fill="#8a5a30"/>`,
    bridge: () => `<path d="M-60 -10 Q0 10 60 -10" stroke="#8a5a30" stroke-width="7" fill="none"/><path d="M-60 -30 Q0 -12 60 -30" stroke="#a67a4a" stroke-width="2" fill="none"/>${[-40, -20, 0, 20, 40].map((dx) => `<path d="M${dx} ${-22 + Math.abs(dx) / 5} V${-2 + Math.abs(dx) / 8}" stroke="#a67a4a" stroke-width="2"/>`).join('')}`,
    terrace: (p) => `${[0, 1, 2, 3].map((i) => `<path d="M${-80 + i * 10} ${-i * 16} h${160 - i * 20} l-6 -16 h${-148 + i * 20}Z" fill="${i % 2 ? '#8fc05a' : '#a7cf6a'}" stroke="${p.water}" stroke-width="2"/>`).join('')}`,
    tea: () => `${[0, 1, 2].map((i) => `<ellipse cx="0" cy="${-8 - i * 16}" rx="${70 - i * 14}" ry="9" fill="${i % 2 ? '#4f8f3a' : '#5fa045'}"/>`).join('')}`,
    stream: (p) => `<path class="isl-flow" d="M-80 0 C-40 -14 0 10 40 -6 S80 -4 100 -2" stroke="${p.water}" stroke-width="10" fill="none" stroke-linecap="round"/>`,
    cave: () => `<path d="M-60 0 C-60 -70 60 -70 60 0Z" fill="#cbbfa8"/><path d="M-26 0 C-26 -36 26 -36 26 0Z" fill="#2f2a24"/>`,
    mist: () => '',
    roots: () => `<rect x="-10" y="-90" width="20" height="90" fill="#6b4a2b"/><path d="M-10 -20 L-40 0 M10 -20 L40 0 M-6 -30 L-24 0 M6 -30 L24 0" stroke="#6b4a2b" stroke-width="7" stroke-linecap="round"/>`,
    mangrove: () => `<g class="isl-sway"><ellipse cx="0" cy="-70" rx="38" ry="24" fill="#3f7a4a"/></g><path d="M0 -50 V-22 M0 -22 Q-20 -14 -26 6 M0 -22 Q0 -6 0 6 M0 -22 Q20 -14 26 6" stroke="#5a4030" stroke-width="5" fill="none"/>`,
    peat: () => `<ellipse cx="0" cy="2" rx="70" ry="10" fill="#7a5a34" opacity=".8"/><path d="M-50 2 V-20 M-30 2 V-14 M40 2 V-18" stroke="#6f8f3a" stroke-width="3"/>`,
    flower: (p) => `${[-14, 0, 14].map((dx, i) => `<path d="M${dx} 0 V${-18 - i * 4}" stroke="#4f8a3a" stroke-width="2"/><circle cx="${dx}" cy="${-20 - i * 4}" r="6" fill="${p.accent}"/><circle cx="${dx}" cy="${-20 - i * 4}" r="2" fill="#fff3c4"/>`).join('')}`,
    boat: () => `<path d="M-50 -6 Q0 14 50 -6 L44 -12 L-44 -12Z" fill="#7a4a24"/><path d="M-10 -12 V-34 M-10 -34 L14 -14" stroke="#4a2e18" stroke-width="2"/>`,
    karst: (p) => `<path d="M-40 0 L-34 -110 C-28 -150 22 -150 28 -100 L40 0Z" fill="#d8d6cb"/><path d="M-30 -120 C-20 -140 10 -142 20 -118" stroke="${p.mid}" stroke-width="10" fill="none"/>`,
    coral: () => `<path d="M-20 0 V-16 M-20 -10 l-8 -8 M-20 -12 l8 -8 M10 0 V-20 M10 -14 l-9 -6 M10 -16 l8 -10" stroke="#ef7f6a" stroke-width="5" stroke-linecap="round"/><circle cx="-4" cy="-6" r="6" fill="#f5b72b"/>`,
    grass: () => `${[-40, -26, -12, 2, 16, 30, 44].map((dx) => `<path class="isl-sway" d="M${dx} 0 q2 -14 -4 -24 M${dx} 0 q2 -12 8 -20" stroke="#b08a3a" stroke-width="3" fill="none"/>`).join('')}`,
    pandan: () => `${[-50, -25, 0, 25, 50].map((a) => `<path d="M0 0 L${a} -46" stroke="#4f8f4a" stroke-width="5" stroke-linecap="round"/>`).join('')}<path d="M-4 0 L-10 20 M4 0 L10 20" stroke="#7a5a34" stroke-width="3"/>`,
    sea: () => '',
    peaks: () => '',
    lake: (p) => `<ellipse cx="0" cy="4" rx="90" ry="14" fill="${p.water}"/><path class="isl-flow" d="M-60 4 h40 M10 0 h40" stroke="#fff" stroke-width="2" opacity=".7"/>`,
    sago: () => `<path d="M0 0 V-90" stroke="#6b5a3a" stroke-width="10"/><g class="isl-sway">${[-70, -40, -10, 20, 50].map((a) => `<path d="M0 -90 Q${a / 2} -120 ${a} -100" stroke="#5f9a3a" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('')}</g>`,
    boardwalk: () => `<path d="M-120 0 L120 -10" stroke="#8a5a30" stroke-width="10"/>${[-100, -50, 0, 50, 100].map((dx) => `<path d="M${dx} ${-dx / 24} V${16 - dx / 24}" stroke="#5a3a1e" stroke-width="4"/>`).join('')}`,
    waterfall: (p) => `<path d="M-50 0 L-40 -190 L40 -190 L50 0Z" fill="#7a7c72"/><path class="isl-fall" d="M-14 -190 V0 M0 -190 V0 M14 -190 V0" stroke="${p.water}" stroke-width="9" stroke-dasharray="18 10"/><ellipse cx="0" cy="4" rx="40" ry="8" fill="#e8f6fa" opacity=".8"/>`
  };
  const NO_GLYPH = { sea: 1, peaks: 1, mist: 1 };

  // ---------- Satwa: siluet sederhana per bentuk tubuh (bukan musuh, objek pengamatan) ----------
  const FAUNA = {
    kera: '<ellipse cx="0" cy="-18" rx="14" ry="18" fill="#8a4a24"/><circle cx="0" cy="-42" r="10" fill="#8a4a24"/><circle cx="0" cy="-40" r="5" fill="#d6a37a"/><path d="M-12 -24 Q-26 -6 -20 4 M12 -24 Q26 -6 20 4" stroke="#8a4a24" stroke-width="6" fill="none" stroke-linecap="round"/>',
    owa: '<ellipse cx="0" cy="-18" rx="10" ry="14" fill="#9a9aa0"/><circle cx="0" cy="-36" r="8" fill="#6a6a70"/><path d="M-8 -28 L-30 -60 M8 -28 L30 -58" stroke="#9a9aa0" stroke-width="5" stroke-linecap="round"/>',
    bekantan: '<ellipse cx="0" cy="-18" rx="14" ry="18" fill="#c27a3a"/><circle cx="0" cy="-42" r="10" fill="#c27a3a"/><ellipse cx="4" cy="-38" rx="6" ry="5" fill="#e8a07a"/><path d="M-6 0 V10 M6 0 V10" stroke="#e8dcc8" stroke-width="5"/>',
    'kucing-besar': '<ellipse cx="0" cy="-20" rx="38" ry="14" fill="#d9822b"/><circle cx="38" cy="-28" r="12" fill="#d9822b"/><path d="M-16 -32 v20 M0 -34 v22 M16 -32 v20" stroke="#2a1a10" stroke-width="3"/><path d="M-30 -8 V0 M-14 -8 V0 M14 -8 V0 M30 -8 V0" stroke="#d9822b" stroke-width="6"/><path d="M-38 -22 Q-56 -30 -60 -12" stroke="#d9822b" stroke-width="5" fill="none"/>',
    kucing: '<ellipse cx="0" cy="-12" rx="22" ry="9" fill="#b0502a"/><circle cx="22" cy="-18" r="7" fill="#b0502a"/><path d="M18 -25 l2 -6 l4 5 M24 -25 l3 -6 l3 6" fill="#b0502a"/><path d="M-22 -12 Q-36 -20 -38 -6" stroke="#b0502a" stroke-width="4" fill="none"/>',
    gajah: '<ellipse cx="0" cy="-34" rx="40" ry="26" fill="#7d7a78"/><circle cx="38" cy="-40" r="16" fill="#7d7a78"/><path d="M50 -34 Q58 -10 52 4" stroke="#7d7a78" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="-38" rx="10" ry="12" fill="#6a6866"/><path d="M-26 -12 V0 M-8 -12 V0 M10 -12 V0 M26 -12 V0" stroke="#7d7a78" stroke-width="10"/>',
    badak: '<ellipse cx="0" cy="-26" rx="40" ry="18" fill="#7b7470"/><path d="M36 -34 Q52 -30 56 -18 L40 -14Z" fill="#7b7470"/><path d="M50 -26 l4 -10" stroke="#5a5450" stroke-width="4"/><path d="M-24 -10 V0 M-8 -10 V0 M12 -10 V0 M26 -10 V0" stroke="#7b7470" stroke-width="9"/>',
    anoa: '<ellipse cx="0" cy="-20" rx="26" ry="12" fill="#4a3a30"/><circle cx="26" cy="-24" r="8" fill="#4a3a30"/><path d="M24 -30 L20 -44 M30 -30 L32 -44" stroke="#2a201a" stroke-width="3"/><path d="M-16 -10 V0 M-4 -10 V0 M10 -10 V0 M20 -10 V0" stroke="#4a3a30" stroke-width="5"/>',
    babirusa: '<ellipse cx="0" cy="-16" rx="24" ry="11" fill="#9a8a80"/><ellipse cx="26" cy="-18" rx="9" ry="6" fill="#9a8a80"/><path d="M26 -22 Q22 -38 14 -34 M30 -20 Q32 -34 24 -36" stroke="#efe6d6" stroke-width="2" fill="none"/><path d="M-14 -6 V2 M-4 -6 V2 M8 -6 V2 M16 -6 V2" stroke="#9a8a80" stroke-width="4"/>',
    kelinci: '<ellipse cx="0" cy="-8" rx="14" ry="8" fill="#8a6a40"/><circle cx="12" cy="-12" r="5" fill="#8a6a40"/><path d="M10 -16 l-2 -10 M14 -16 l2 -10" stroke="#8a6a40" stroke-width="3"/><path d="M-10 -10 h20 M-8 -6 h18" stroke="#3a2a1a" stroke-width="1.5"/>',
    elang: '<path d="M-50 -6 Q-24 -20 0 -6 Q24 -20 50 -6 Q24 -10 0 2 Q-24 -10 -50 -6Z" fill="#5a3a22"/><circle cx="0" cy="-8" r="5" fill="#e8d6b8"/><path d="M-2 -12 l-3 -8 l6 6" fill="#5a3a22"/>',
    rangkong: '<ellipse cx="0" cy="-14" rx="18" ry="10" fill="#1e1e1e"/><circle cx="16" cy="-20" r="6" fill="#1e1e1e"/><path d="M20 -22 Q40 -22 44 -12 L22 -16Z" fill="#f2c94c"/><path d="M20 -26 Q32 -32 38 -24 L22 -22Z" fill="#e2553f"/><path d="M-18 -12 L-34 -4 L-18 -6" fill="#f4f1ea"/>',
    maleo: '<ellipse cx="0" cy="-16" rx="16" ry="10" fill="#1e1e22"/><circle cx="14" cy="-28" r="6" fill="#1e1e22"/><path d="M12 -34 Q16 -42 20 -34" fill="#3a3a40"/><ellipse cx="4" cy="-12" rx="10" ry="6" fill="#f2c4b4"/><path d="M-2 -6 V2 M6 -6 V2" stroke="#4a4a4a" stroke-width="2"/>',
    tarsius: '<ellipse cx="0" cy="-14" rx="7" ry="10" fill="#a67a50"/><circle cx="0" cy="-28" r="7" fill="#a67a50"/><circle cx="-3" cy="-29" r="3" fill="#2a1a10"/><circle cx="3" cy="-29" r="3" fill="#2a1a10"/><path d="M0 -4 Q-4 14 4 24" stroke="#a67a50" stroke-width="2" fill="none"/>',
    cenderawasih: '<ellipse cx="0" cy="-14" rx="9" ry="7" fill="#7a3a1a"/><circle cx="8" cy="-20" r="5" fill="#f2c94c"/><path d="M-6 -12 Q-30 -30 -40 -8 M-6 -10 Q-28 -16 -38 4 M-6 -10 Q-24 -4 -30 14" stroke="#f2a93a" stroke-width="3" fill="none"/>',
    kanguru: '<ellipse cx="0" cy="-20" rx="12" ry="16" fill="#9a5a2a"/><circle cx="4" cy="-40" r="7" fill="#9a5a2a"/><path d="M0 -6 Q-6 18 -2 34" stroke="#c09060" stroke-width="5" fill="none"/>',
    kasuari: '<path d="M-22 -40 Q0 -60 22 -40 Q20 -20 0 -18 Q-20 -20 -22 -40Z" fill="#1a1a1a"/><path d="M14 -46 L22 -78" stroke="#2a6fd0" stroke-width="5"/><circle cx="23" cy="-82" r="5" fill="#2a6fd0"/><path d="M20 -86 l4 -8 l2 8" fill="#c8a24a"/><path d="M20 -70 l-4 8" stroke="#e2553f" stroke-width="3"/><path d="M-6 -18 V0 M6 -18 V0" stroke="#5a5a4a" stroke-width="4"/>',
    ekidna: '<ellipse cx="0" cy="-8" rx="20" ry="9" fill="#3a2e26"/><path d="M20 -8 Q34 -6 40 2" stroke="#3a2e26" stroke-width="3" fill="none"/>' + [-14, -6, 2, 10].map((dx) => `<path d="M${dx} -14 l-2 -6" stroke="#c8b49a" stroke-width="1.5"/>`).join(''),
    kuskus: '<ellipse cx="0" cy="-14" rx="13" ry="11" fill="#e8dcc8"/><circle cx="10" cy="-22" r="7" fill="#e8dcc8"/><circle cx="12" cy="-23" r="2" fill="#2a1a10"/><path d="M-12 -10 Q-26 0 -16 10" stroke="#e8dcc8" stroke-width="4" fill="none"/>',
    jalak: '<ellipse cx="0" cy="-10" rx="11" ry="7" fill="#f6f6f2"/><circle cx="9" cy="-16" r="5" fill="#f6f6f2"/><circle cx="10" cy="-16" r="2.2" fill="#2a7fd0"/><path d="M-10 -8 l-8 6 M2 -10 l-6 0" stroke="#222" stroke-width="2"/><path d="M6 -20 l2 -6 l2 6" fill="#f6f6f2"/>',
    celepuk: '<ellipse cx="0" cy="-14" rx="9" ry="12" fill="#8a6a4a"/><path d="M-7 -24 l-2 -6 l5 3 M7 -24 l2 -6 l-5 3" fill="#8a6a4a"/><circle cx="-3" cy="-18" r="2.5" fill="#f2c94c"/><circle cx="3" cy="-18" r="2.5" fill="#f2c94c"/>',
    komodo: '<path d="M-50 -6 Q-20 -18 20 -12 L40 -10 Q46 -8 40 -4 L-50 -2Z" fill="#6a6450"/><path d="M-24 -8 l-6 8 M10 -10 l6 10" stroke="#6a6450" stroke-width="5"/><path d="M42 -6 l8 -2 M42 -6 l8 2" stroke="#e8a23a" stroke-width="1.5"/>',
    rusa: '<ellipse cx="0" cy="-30" rx="24" ry="10" fill="#a0703a"/><path d="M20 -36 L30 -54" stroke="#a0703a" stroke-width="6"/><ellipse cx="34" cy="-56" rx="8" ry="5" fill="#a0703a"/><path d="M30 -60 l-6 -14 m3 6 l-6 -2 M34 -60 l4 -14 m-2 6 l6 -2" stroke="#5a3a1a" stroke-width="2" fill="none"/><path d="M-16 -22 V0 M-6 -22 V0 M10 -22 V0 M18 -22 V0" stroke="#a0703a" stroke-width="3"/>',
    penyu: '<ellipse cx="0" cy="0" rx="20" ry="12" fill="#4f7a4a"/><path d="M-12 -4 h24 M-8 4 h16" stroke="#3a5a34" stroke-width="2"/><circle cx="22" cy="0" r="5" fill="#6a8a5a"/><path d="M-12 -10 l-10 -6 M-12 10 l-10 6 M10 -10 l8 -8 M10 10 l8 8" stroke="#6a8a5a" stroke-width="4" stroke-linecap="round"/>'
  };

  // ---------- Bangunan quest: enam gaya, masing-masing siluet & material berbeda ----------
  function gonjong(x0, x1, y, n, fill) { // atap bergonjong (inspirasi Rumah Gadang, Sumatra Barat)
    const step = (x1 - x0) / (n - 1); let d = `M${x0 - 20} ${y + 10}`;
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * step; const top = y - 90 + Math.abs(i - (n - 1) / 2) * 18;
      d += ` Q${cx - step / 2.2} ${y - 10} ${cx - 4} ${top + 8} L${cx} ${top}` + ` L${cx + 4} ${top + 8}` + (i < n - 1 ? ` Q${cx + step / 2.2} ${y - 10} ${cx + step / 2} ${y - 22}` : ` Q${cx + step / 2.2} ${y - 10} ${x1 + 20} ${y + 10}`);
    }
    return `<path d="${d}Z" fill="${fill}" stroke="#3a2412" stroke-width="2"/>`;
  }
  const lamp = (x, y) => `<path d="M${x} ${y - 14} V${y}" stroke="#3a2412"/><circle class="isl-glow" cx="${x}" cy="${y + 5}" r="6" fill="#ffd27a"/>`;
  const BUILD = {
    gadang: (p) => `<g>
      <path d="M260 ${GY + 8} H760" stroke="${p.water}" stroke-width="22" class="isl-flow" stroke-dasharray="30 14"/>
      ${[330, 380, 430, 480, 530, 580, 630, 680].map((x) => `<rect x="${x - 4}" y="292" width="8" height="${GY - 290}" fill="#5a3a1e"/>`).join('')}
      <rect x="300" y="${GY - 18}" width="440" height="10" fill="#8a5a30"/>
      <path d="M320 210 H700 L690 295 H330Z" fill="#9a5b2e" stroke="#3a2412" stroke-width="2"/>
      ${gonjong(330, 690, 210, 5, '#4a2e1c')}
      <g>${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${360 + c * 26}" y="${228 + r * 15}" width="22" height="11" rx="2" fill="#e8c48a" stroke="#6b3e1e"/><circle cx="${371 + c * 26}" cy="${234 + r * 15}" r="1.6" fill="#6b3e1e"/>`).join('')).join('')}</g>
      <rect x="480" y="226" width="80" height="62" rx="4" fill="#fdf3e4" stroke="#3a2412" stroke-width="2"/>
      <text x="520" y="242" text-anchor="middle" font-size="10" font-weight="700" fill="#123a2c">KOMPOSISI</text>
      ${[['ENERGI', 46], ['PROTEIN', 30], ['SERAT', 18]].map(([t, w], i) => `<text x="486" y="${258 + i * 11}" font-size="7" fill="#123a2c">${t}</text><rect x="520" y="${252 + i * 11}" width="${w * 0.8}" height="6" fill="${['#e8a23a', '#3e8a5f', '#5fb3c4'][i]}"/>`).join('')}
      <g>${[590, 620, 650].map((x) => `<rect x="${x}" y="230" width="22" height="56" fill="#c98a4b" stroke="#3a2412"/><path d="M${x} 248 h22 M${x} 266 h22" stroke="#3a2412"/>`).join('')}</g>
      ${[400, 520, 640].map((x) => lamp(x, 205)).join('')}
      <g>${[240, 760].map((x, i) => `<path d="M${x - 40} ${GY - 52} L${x} ${GY - 72} L${x + 40} ${GY - 52}Z" fill="${i ? '#e2553f' : '#e8a23a'}"/><rect x="${x - 34}" y="${GY - 52}" width="68" height="34" fill="#c98a4b" opacity=".9"/><path d="M${x - 30} ${GY - 22} h60" stroke="#5a3a1e" stroke-width="4"/>${[0, 1, 2].map((k) => `<circle cx="${x - 18 + k * 18}" cy="${GY - 28}" r="6" fill="${['#e5b93a', '#7fb04a', '#d9622b'][k]}"/>`).join('')}`).join('')}</g>
      <text x="240" y="${GY - 76}" text-anchor="middle" font-size="10" font-weight="700" fill="${p.ink}">PASAR PANGAN</text>
    </g>`,
    joglo: (p) => `<g>
      <path d="M260 ${GY} L290 300 H730 L760 ${GY}Z" fill="#6a6c70"/>${[300, 360, 420, 480, 540, 600, 660].map((x) => `<path d="M${x} 300 V${GY}" stroke="#55575a"/>`).join('')}
      ${[320, 380, 440, 580, 640, 700].map((x) => `<rect x="${x - 5}" y="200" width="10" height="100" fill="#6b3e1e"/>`).join('')}
      <path d="M280 205 L360 160 H660 L740 205Z" fill="#7a4a2a" stroke="#3a2412" stroke-width="2"/>
      <path d="M380 162 L450 92 H570 L640 162Z" fill="#5a3420" stroke="#3a2412" stroke-width="2"/>
      <path d="M470 94 L500 60 H520 L550 94Z" fill="#4a2a18"/>
      <g class="isl-tubes">${[0, 1, 2, 3].map((i) => `<rect x="${430 + i * 42}" y="214" width="28" height="78" rx="14" fill="#dff3f7" fill-opacity=".55" stroke="#2c6f86" stroke-width="2"/><rect x="${434 + i * 42}" y="${250 - i * 8}" width="20" height="${38 + i * 8}" rx="10" fill="${['#f08a3c', '#f2b13c', '#7cc4a0', '#4aa6d6'][i]}" class="isl-glow"/>`).join('')}</g>
      <path class="isl-flow isl-liquid" d="M444 296 V306 H486 V296 M486 306 H528 V296 M528 306 H570 V296" stroke="#f08a3c" stroke-width="5" fill="none" stroke-dasharray="10 6"/>
      <rect x="770" y="230" width="120" height="80" rx="6" fill="#e9e3d6" stroke="#3a2412" stroke-width="2"/><path d="M760 232 L830 196 L900 232Z" fill="#7a4a2a"/>
      <rect x="784" y="244" width="92" height="40" fill="#18324a"/><path d="M790 276 L810 262 L830 270 L850 252 L870 258" stroke="#7cd4f0" stroke-width="2" fill="none"/>
      <path d="M740 270 Q755 262 770 270" stroke="#8a5a30" stroke-width="6" fill="none"/>
      ${[400, 520, 620].map((x, i) => `<circle class="isl-glow" cx="${x}" cy="210" r="5" fill="${i % 2 ? '#4aa6d6' : '#f08a3c'}"/>`).join('')}
    </g>`,
    betang: (p) => `<g>
      <path d="M0 ${GY + 10} H1000" stroke="${p.water}" stroke-width="30" class="isl-flow" stroke-dasharray="40 18"/>
      ${Array.from({ length: 15 }, (_, i) => 140 + i * 40).map((x) => `<rect x="${x - 4}" y="252" width="8" height="${GY + 4 - 252}" fill="#4a3220"/>`).join('')}
      <rect x="130" y="246" width="590" height="8" fill="#8a5a30"/>
      <rect x="140" y="196" width="570" height="52" fill="#a8743e" stroke="#3a2412" stroke-width="2"/>
      ${Array.from({ length: 10 }, (_, i) => `<rect x="${160 + i * 54}" y="210" width="20" height="24" fill="#3a2412" opacity=".75"/>`).join('')}
      <path d="M120 200 L180 160 H670 L730 200Z" fill="#5a3e24" stroke="#3a2412" stroke-width="2"/>
      <path d="M180 160 L160 150 M670 160 L690 150" stroke="#3a2412" stroke-width="4"/>
      <path d="M200 ${GY - 4} L220 254" stroke="#6b4a2b" stroke-width="6"/>${[0, 1, 2, 3, 4].map((k) => `<path d="M${204 + k * 3.5} ${GY - 18 - k * 18} h8" stroke="#3a2412" stroke-width="2"/>`).join('')}
      <path d="M260 ${GY - 6} h80 v-30 h-80Z" fill="none" stroke="#3a2412" stroke-width="3"/><path d="M270 ${GY - 6} v-26 M290 ${GY - 6} v-26 M310 ${GY - 6} v-26 M330 ${GY - 6} v-26" stroke="#6b4a2b" stroke-width="3"/>
      <rect x="420" y="214" width="110" height="26" rx="3" fill="#fdf3e4"/><path d="M432 227 H508 m-10 -7 l10 7 l-10 7" stroke="#1d2a18" stroke-width="3" fill="none"/>
      <path d="M720 222 Q760 250 800 140" stroke="#8a5a30" stroke-width="3" fill="none"/><path d="M720 214 Q760 240 800 132" stroke="#a67a4a" stroke-width="1.5" fill="none"/>
      <rect x="792" y="60" width="16" height="${GY - 60}" fill="#4a3220"/><rect x="770" y="120" width="60" height="24" fill="#a8743e" stroke="#3a2412"/><path d="M764 122 L800 94 L836 122Z" fill="#5a3e24"/>
      <path d="M560 ${GY - 2} C560 ${GY - 60} 650 ${GY - 60} 650 ${GY - 2}" stroke="#6b4a2b" stroke-width="10" fill="none"/><path d="M576 ${GY - 2} C576 ${GY - 44} 634 ${GY - 44} 634 ${GY - 2}" stroke="#6b4a2b" stroke-width="6" fill="none"/>
    </g>`,
    tongkonan: (p) => `<g>
      ${[380, 430, 480, 530, 580, 630].map((x) => `<rect x="${x - 6}" y="240" width="12" height="${GY - 240}" fill="#3a2412"/>`).join('')}
      <rect x="360" y="190" width="300" height="56" fill="#7a2e1d" stroke="#2a1a10" stroke-width="2"/>
      <path d="M270 150 Q510 230 750 150 L700 196 Q510 230 320 196Z" fill="#2c2a28" stroke="#111" stroke-width="2"/>
      <path d="M270 150 Q300 168 320 196 M750 150 Q720 168 700 196" stroke="#555" stroke-width="2" fill="none"/>
      <rect x="440" y="200" width="140" height="40" rx="3" fill="#f4f1ea" stroke="#2a1a10"/>
      <g stroke="#c8452f" stroke-width="2" fill="none"><path d="M452 230 L480 212 L520 222 L560 208"/><path d="M480 212 L500 232 L540 226"/></g>${[[452, 230], [480, 212], [520, 222], [560, 208], [500, 232], [540, 226]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#1f2b33"/>`).join('')}
      <g class="isl-beam" stroke-width="6" fill="none" stroke-linecap="round"><path d="M510 ${GY + 30} V${GY - 10}" stroke="#f5b72b"/><path d="M510 ${GY - 10} Q440 ${GY - 30} 420 ${GY - 70}" stroke="#f5b72b"/><path d="M510 ${GY - 10} Q580 ${GY - 30} 600 ${GY - 70}" stroke="#4fc3d9"/><path d="M420 ${GY - 70} Q510 ${GY - 120} 600 ${GY - 70}" stroke="#f08a6a" stroke-dasharray="8 6"/></g>
      <rect x="720" y="100" width="40" height="${GY - 100}" fill="#d8d6cb" stroke="#2a1a10"/><path d="M712 104 Q740 70 768 104Z" fill="#3aa6c0"/><rect x="730" y="130" width="20" height="16" fill="#1f2b33"/>
      <path d="M660 220 L720 180" stroke="#8a5a30" stroke-width="5"/>
    </g>`,
    menara: (p) => `<g>
      <g class="isl-glow">${[0, 1, 2, 3, 4].map((i) => { const w = 120 - i * 16; const y = 300 - i * 52; return `<rect x="${500 - w / 2}" y="${y - 50}" width="${w}" height="50" fill="${i % 2 ? '#3b3f7a' : '#4a4f94'}" stroke="#1e1f3a" stroke-width="2"/><ellipse cx="500" cy="${y - 25}" rx="${Math.min(18, w / 6)}" ry="12" fill="#bfe3ff" stroke="#e9b949" stroke-width="3"/><path d="M${500 - w / 2 - 8} ${y - 50} H${500 + w / 2 + 8}" stroke="#e9b949" stroke-width="4"/>`; }).join('')}</g>
      <path d="M500 40 V8" stroke="#e9b949" stroke-width="4"/><circle cx="500" cy="8" r="6" fill="#e9b949"/><path class="isl-pulse" d="M482 18 A24 24 0 0 1 518 18 M470 10 A36 36 0 0 1 530 10" stroke="#bda7ff" stroke-width="3" fill="none"/>
      <rect x="430" y="300" width="140" height="${GY - 300}" fill="#3b3f7a"/>
      ${[['DATA', 438, '#4aa6d6'], ['KESIMPULAN', 478, '#e9b949'], ['ASUMSI', 524, '#bda7ff']].map(([t, x, c]) => `<rect x="${x}" y="306" width="${t.length * 5 + 10}" height="22" rx="3" fill="#eef0fb" stroke="${c}" stroke-width="3"/><text x="${x + 5}" y="321" font-size="8" font-weight="700" fill="#1e1f3a">${t}</text>`).join('')}
      <ellipse cx="300" cy="${GY - 34}" rx="70" ry="34" fill="#7a5a3a"/><path d="M226 ${GY - 34} Q300 ${GY - 120} 374 ${GY - 34}Z" fill="#a08a5a" stroke="#5a4a2a" stroke-width="2"/><rect x="290" y="${GY - 30}" width="20" height="30" rx="8" fill="#2a1a10"/>
      <path d="M370 ${GY - 22} L430 ${GY - 30}" stroke="#8a5a30" stroke-width="6"/>
      <rect x="620" y="${GY - 60}" width="110" height="60" rx="30" fill="#4a4f94" stroke="#1e1f3a" stroke-width="2"/><circle cx="660" cy="${GY - 32}" r="12" fill="#bfe3ff"/><circle cx="696" cy="${GY - 32}" r="12" fill="#bfe3ff"/>
      <path d="M570 ${GY - 30} L620 ${GY - 30}" stroke="#8a5a30" stroke-width="6"/>
    </g>`,
    lumbung: (p) => `<g>
      <rect x="150" y="270" width="160" height="${GY - 270}" fill="#d9c7a0"/><path d="M130 272 L230 222 L330 272Z" fill="#8a3a22" stroke="#3a2412" stroke-width="2"/>${[166, 230, 294].map((x) => `<rect x="${x - 4}" y="272" width="8" height="${GY - 272}" fill="#6b3e1e"/>`).join('')}
      <rect x="180" y="290" width="100" height="30" rx="3" fill="#fdf3e4" stroke="#3a2412"/><path d="M190 300 h50 M190 310 h34" stroke="#3a2412" stroke-width="2"/><path d="M248 296 l20 18 M268 296 l-20 18" stroke="#e2553f" stroke-width="2"/>
      <text x="230" y="${GY - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="${p.ink}">BALE · INSPIRASI BALI</text>
      <rect x="350" y="280" width="300" height="${GY - 280}" fill="#e8d6b0"/><path d="M330 282 L380 236 H620 L670 282Z" fill="#7a4a2a" stroke="#3a2412" stroke-width="2"/>${[360, 430, 500, 570, 640].map((x) => `<rect x="${x - 4}" y="282" width="8" height="${GY - 282}" fill="#6b3e1e"/>`).join('')}
      <rect x="400" y="310" width="200" height="12" fill="#8a5a30"/>${[430, 470, 510, 550].map((x, i) => `<circle cx="${x}" cy="306" r="7" fill="${['#e5b93a', '#7fb04a', '#e2553f', '#f5b72b'][i]}"/>`).join('')}
      <path d="M380 300 q4 -16 0 -26 M390 300 q4 -16 0 -26" stroke="#fff" stroke-width="2" opacity=".6" class="isl-smoke"/><rect x="370" y="300" width="28" height="18" fill="#6a6c70"/>
      ${[0, 1].map((i) => { const x = 730 + i * 110; return `<rect x="${x - 4}" y="250" width="8" height="${GY - 250}" fill="#5a3a1e"/><rect x="${x + 46}" y="250" width="8" height="${GY - 250}" fill="#5a3a1e"/><ellipse cx="${x + 25}" cy="250" rx="34" ry="5" fill="#5a3a1e"/><path d="M${x - 20} 250 C${x - 26} 170 ${x + 4} 120 ${x + 25} 112 C${x + 46} 120 ${x + 76} 170 ${x + 70} 250Z" fill="#b89a5a" stroke="#6a5030" stroke-width="2"/><rect x="${x + 16}" y="190" width="18" height="22" fill="#5a3a1e"/><text x="${x + 25}" y="232" text-anchor="middle" font-size="8" font-weight="700" fill="#3a2412">${i ? 'REVISI' : 'AWAL'}</text>`; }).join('')}
      <text x="805" y="${GY - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="${p.ink}">LUMBUNG · INSPIRASI LOMBOK</text>
      <path d="M690 ${GY} V${GY - 40}" stroke="#7a5a30" stroke-width="3"/><path d="M690 ${GY - 40} h24" stroke="#7a5a30" stroke-width="3"/>
    </g>`
  };

  function sceneSvg(id, opts) {
    const d = DATA[id]; if (!d) return '';
    const p = d.palette; const t = d.terrain; const mini = opts && opts.mini;
    const sea = t.sea ? `<rect x="0" y="${GY - 60}" width="1000" height="60" fill="${p.water}" opacity=".9"/><path class="isl-flow" d="M0 ${GY - 40} h1000 M0 ${GY - 20} h1000" stroke="#fff" stroke-width="2" stroke-dasharray="26 30" opacity=".6"/>` : '';
    const mist = t.mist ? `<g class="isl-mist" opacity=".55"><ellipse cx="220" cy="250" rx="220" ry="16" fill="#fff"/><ellipse cx="760" cy="230" rx="260" ry="14" fill="#fff"/></g>` : '';
    const nature = mini ? '' : d.natureObjects.filter((o) => !NO_GLYPH[o.type] && GLYPH[o.type]).map((o) => `<g class="isl-obj" transform="translate(${o.x} ${GY}) scale(${o.s || 1})"><title>${esc(o.name)}</title>${GLYPH[o.type](p)}</g>`).join('');
    const fauna = mini ? '' : d.fauna.map((f) => `<g class="isl-fauna" transform="translate(${f.x} ${f.y})"><title>${esc(f.name)} — ${esc(f.statusText)}</title>${FAUNA[f.shape] || ''}</g>`).join('');
    return `<svg class="isl-svg" viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet" ${mini ? 'aria-hidden="true" focusable="false"' : `role="img" aria-label="${esc(d.accessibilityDescription)}"`}>
      <defs><linearGradient id="isl-sky-${id}${mini ? 'm' : ''}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky1}"/><stop offset="1" stop-color="${p.sky2}"/></linearGradient></defs>
      <rect width="1000" height="420" fill="url(#isl-sky-${id}${mini ? 'm' : ''})"/>
      <g class="isl-layer-back">${(BACK[t.type] || BACK['hutan-hujan'])(p)}${sea}${mist}</g>
      <rect x="0" y="${GY}" width="1000" height="${420 - GY}" fill="${p.ground}"/>
      <g class="isl-layer-mid">${(BUILD[d.questBuilding.style] || (() => ''))(p)}</g>
      <g class="isl-layer-front">${nature}${fauna}</g>
    </svg>`;
  }

  // ---------- Panel latar dunia pada layar misi ----------
  let current = null;
  function statusBadge(f) { return `<span class="isl-status isl-status-${esc(f.status)}">${esc(f.statusText)}</span>`; }
  function panelHtml(id) {
    const d = DATA[id];
    const spots = [
      ...d.hotspots.map((h) => ({ kind: 'Bangunan', id: 'h-' + h.id, x: h.x, y: h.y, name: h.name, body: `<p>${esc(h.note)}</p>` })),
      ...d.fauna.map((f) => ({ kind: 'Satwa', id: 'f-' + f.id, x: f.x / 10, y: (f.y - 75) / 4.2, name: f.name, body: `<p class="isl-latin"><i>${esc(f.latin)}</i>${f.zone ? ` · zona ${esc(f.zone)}` : ''}</p>${statusBadge(f)}<p><b>Habitat:</b> ${esc(f.habitat)}</p><p>${esc(f.note)}</p>` }))
    ];
    const collapsed = readPref();
    return `<div class="isl-head"><div><span class="isl-kicker">DUNIA PULAU · ${esc(d.region.toUpperCase())}</span><strong>${esc(d.questBuilding.name)}</strong><small>${esc(d.architecture.origin)}</small></div><button type="button" class="isl-toggle" aria-expanded="${!collapsed}" aria-controls="isl-body-${id}">${collapsed ? 'Tampilkan latar' : 'Ciutkan latar'}</button></div>
      <div class="isl-body" id="isl-body-${id}"${collapsed ? ' hidden' : ''}>
        <div class="isl-stage">${sceneSvg(id)}
          <div class="isl-spots">${spots.map((s, i) => `<button type="button" class="isl-spot isl-spot-${s.kind === 'Satwa' ? 'fauna' : 'build'}" style="--x:${Math.max(3, Math.min(97, s.x))}%;--y:${Math.max(6, Math.min(94, s.y))}%" data-spot="${esc(s.id)}" aria-label="${esc(s.kind)}: ${esc(s.name)}" title="${esc(s.name)}" aria-expanded="false"><span aria-hidden="true">${s.kind === 'Satwa' ? '◉' : i + 1}</span></button>`).join('')}</div>
        </div>
        <div class="isl-info" role="region" aria-live="polite" aria-label="Keterangan pengamatan" hidden></div>
        <details class="isl-more"><summary>Tentang ${esc(d.name)}: bangunan, alam, dan satwa</summary>
          <p>${esc(d.questBuilding.desc)}</p>
          <p class="isl-arch"><b>Arsitektur:</b> ${esc(d.architecture.inspiration)} (${esc(d.architecture.origin)}). ${esc(d.architecture.note)}</p>
          <ul class="isl-parts">${d.questBuilding.parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <p><b>Medan:</b> ${esc(d.terrain.label)}.</p>
          <ul class="isl-nature">${d.natureObjects.map((o) => `<li><b>${esc(o.name)}</b> — ${esc(o.note)}</li>`).join('')}</ul>
          <ul class="isl-fauna-list">${d.fauna.map((f) => `<li><b>${esc(f.name)}</b> <i>${esc(f.latin)}</i> ${statusBadge(f)}</li>`).join('')}</ul>
          <p class="isl-foot">Satwa ditampilkan sebagai bagian ekosistem untuk diamati, bukan untuk diburu. Bangunan quest fiktif, terinspirasi secara hormat; bukan replika tempat sakral.</p>
        </details>
      </div>`;
  }
  function spotData(id, key) {
    const d = DATA[id]; if (!d) return null;
    if (key.startsWith('h-')) { const h = d.hotspots.find((x) => 'h-' + x.id === key); return h && { title: h.name, kind: 'Titik observasi bangunan', html: `<p>${esc(h.note)}</p>` }; }
    const f = d.fauna.find((x) => 'f-' + x.id === key);
    return f && { title: f.name, kind: 'Kartu satwa', html: `<p class="isl-latin"><i>${esc(f.latin)}</i>${f.zone ? ` · zona ${esc(f.zone)}` : ''}</p>${statusBadge(f)}<p><b>Habitat:</b> ${esc(f.habitat)}</p><p>${esc(f.note)}</p>` };
  }
  function readPref() { try { return localStorage.getItem(PREF) === '1'; } catch (e) { return false; } }
  function writePref(v) { try { localStorage.setItem(PREF, v ? '1' : '0'); } catch (e) { /* abaikan */ } }

  function mountPanel(host, id) {
    if (!host || !DATA[id]) { if (host) { host.hidden = true; host.innerHTML = ''; } return; }
    host.hidden = false;
    host.dataset.island = DATA[id].key;
    host.innerHTML = panelHtml(id);
    current = id;
  }
  function openSpot(host, btn) {
    const info = host.querySelector('.isl-info'); const key = btn.dataset.spot;
    const wasOpen = btn.getAttribute('aria-expanded') === 'true';
    host.querySelectorAll('.isl-spot').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (wasOpen) { info.hidden = true; info.innerHTML = ''; return; }
    const s = spotData(Number(host.dataset.pos), key); if (!s) return;
    btn.setAttribute('aria-expanded', 'true');
    info.hidden = false;
    info.innerHTML = `<div class="isl-info-head"><span>${esc(s.kind)}</span><strong>${esc(s.title)}</strong><button type="button" class="isl-close" aria-label="Tutup keterangan">×</button></div>${s.html}`;
  }
  function wire(host) {
    if (host.dataset.wired) return; host.dataset.wired = '1';
    host.addEventListener('click', (e) => {
      const spot = e.target.closest('.isl-spot'); if (spot) { openSpot(host, spot); return; }
      if (e.target.closest('.isl-close')) {
        const open = host.querySelector('.isl-spot[aria-expanded="true"]');
        host.querySelector('.isl-info').hidden = true;
        if (open) { open.setAttribute('aria-expanded', 'false'); open.focus(); }
        return;
      }
      const tg = e.target.closest('.isl-toggle');
      if (tg) {
        const body = host.querySelector('.isl-body'); const hide = !body.hidden;
        body.hidden = hide; tg.setAttribute('aria-expanded', String(!hide)); tg.textContent = hide ? 'Tampilkan latar' : 'Ciutkan latar'; writePref(hide);
      }
    });
    host.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const info = host.querySelector('.isl-info'); if (!info || info.hidden) return;
      const open = host.querySelector('.isl-spot[aria-expanded="true"]');
      info.hidden = true; if (open) { open.setAttribute('aria-expanded', 'false'); open.focus(); }
    });
  }
  function ensureHost(screenId, beforeSel) {
    const screen = document.getElementById(screenId); if (!screen) return null;
    let host = screen.querySelector('.isl-world');
    if (!host) {
      host = document.createElement('section'); host.className = 'isl-world'; host.setAttribute('aria-label', 'Latar dunia pulau');
      const ref = screen.querySelector(beforeSel); if (ref) ref.parentNode.insertBefore(host, ref); else screen.appendChild(host);
      wire(host);
    }
    return host;
  }
  function renderFor(pos, screenId, beforeSel) {
    const host = ensureHost(screenId, beforeSel); if (!host) return;
    if (host.dataset.pos === String(pos) && host.innerHTML) return;
    host.dataset.pos = String(pos);
    mountPanel(host, pos);
  }

  // ---------- Peta: identitas pulau pada node dan kartu misi ----------
  function decorateMap() {
    document.querySelectorAll('#map-nodes [data-node]').forEach((n) => {
      const d = DATA[Number(n.dataset.node)]; if (!d || n.querySelector('.node-island')) return;
      const tag = document.createElement('i'); tag.className = 'node-island'; tag.textContent = d.name; n.appendChild(tag);
      n.setAttribute('aria-label', `${n.getAttribute('aria-label') || ''}, pulau ${d.name}, ${d.questBuilding.name}`);
      n.dataset.island = d.key;
    });
    const num = document.getElementById('card-number'); const kicker = document.getElementById('card-kicker');
    const m = num && /(\d+)/.exec(num.textContent); const id = m ? Number(m[1]) : 0; const d = DATA[id];
    if (!kicker || !d) return;
    let card = document.getElementById('card-island');
    if (!card) { card = document.createElement('div'); card.id = 'card-island'; card.className = 'card-island'; kicker.parentNode.insertBefore(card, kicker); }
    if (card.dataset.pos === String(id)) return;
    card.dataset.pos = String(id); card.dataset.island = d.key;
    card.innerHTML = `<div class="card-island-art">${sceneSvg(id, { mini: true })}</div><p><span>${esc(d.name)}</span> · ${esc(d.questBuilding.name)}</p>`;
  }

  function activePos() { const g = window.NutraGame; return g && g.state ? Number(g.state.activePos) || 0 : 0; }
  function onScreen(screen) {
    if (screen === 'map') decorateMap();
    if (screen === 'mission') renderFor(activePos(), 'screen-mission', '.mission-columns');
    if (screen === 'kitchen') renderFor(6, 'screen-kitchen', '.kitchen-steps');
  }
  document.addEventListener('nutra:screen', (e) => onScreen(e.detail));
  function boot() {
    const nodes = document.getElementById('map-nodes');
    if (nodes) new MutationObserver(decorateMap).observe(nodes, { childList: true });
    const num = document.getElementById('card-number');
    if (num) new MutationObserver(decorateMap).observe(num, { childList: true, characterData: true, subtree: true });
    decorateMap();
    const g = window.NutraGame; if (g && g.visibleScreen) onScreen(g.visibleScreen);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.NutraIslands = { data: DATA, sceneSvg, mountPanel, decorateMap, get current() { return current; } };
})();
