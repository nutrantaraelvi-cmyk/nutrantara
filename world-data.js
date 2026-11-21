/*
 * Data dunia NUTRANTARA (dipakai bersama oleh peramban dan server).
 * Koordinat dalam satuan dunia logis 960 × 600.
 */
(function (root) {
  root.NUTRANTARA_WORLD = {
    width: 960,
    height: 600,
    // Area yang dapat dijelajahi: elips pulau utama.
    island: { cx: 480, cy: 320, rx: 440, ry: 260 },
    spawn: { x: 210, y: 330 },
    nara: { x: 250, y: 290 },
    interactRadius: 46,
    speed: 170,
    stations: [
      { id: 1, x: 150, y: 420, name: 'Kantin Nusantara' },
      { id: 2, x: 330, y: 470, name: 'Laboratorium Pencernaan' },
      { id: 3, x: 470, y: 330, name: 'Gerbang Penyerapan' },
      { id: 4, x: 610, y: 450, name: 'Jejak Sebab Akibat' },
      { id: 5, x: 760, y: 330, name: 'Pemecah Klaim' },
      { id: 6, x: 690, y: 170, name: 'Dapur Juara' }
    ],
    // Hiasan (tidak menghalangi gerak).
    trees: [[300, 180], [380, 150], [560, 190], [880, 330], [420, 520], [530, 540], [120, 300], [820, 450], [250, 520], [600, 330]]
  };

  root.NUTRANTARA_WORLD.clamp = function (x, y) {
    const { cx, cy, rx, ry } = root.NUTRANTARA_WORLD.island;
    const margin = 14;
    const ax = rx - margin;
    const ay = ry - margin;
    const dx = x - cx;
    const dy = y - cy;
    const k = (dx * dx) / (ax * ax) + (dy * dy) / (ay * ay);
    if (k <= 1) return { x, y };
    const s = 1 / Math.sqrt(k);
    return { x: cx + dx * s, y: cy + dy * s };
  };
})(typeof window !== 'undefined' ? window : globalThis);
