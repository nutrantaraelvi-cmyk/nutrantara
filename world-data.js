/*
 * Data dunia NUTRANTARA (dipakai bersama oleh peramban dan server).
 * Kepulauan melayang di atas awan: Alun-alun Nusantara di tengah dan enam pulau pos di sekelilingnya,
 * dihubungkan jembatan cahaya. Koordinat dalam satuan peta logis 960 × 600.
 */
(function (root) {
  const islands = [
    { id: 0, name: 'Alun-alun Nusantara', cx: 470, cy: 300, rx: 230, ry: 140 },
    { id: 1, name: 'Kantin Nusantara', cx: 170, cy: 112, rx: 112, ry: 72 },
    { id: 2, name: 'Pasar & Lab Pencernaan', cx: 122, cy: 352, rx: 100, ry: 72 },
    { id: 3, name: 'Gerbang Usus Halus', cx: 612, cy: 88, rx: 98, ry: 62 },
    { id: 4, name: 'Kota Terapung', cx: 852, cy: 158, rx: 92, ry: 66 },
    { id: 5, name: 'Studio Iklan', cx: 842, cy: 378, rx: 92, ry: 66 },
    { id: 6, name: 'Dapur Juara', cx: 676, cy: 522, rx: 122, ry: 66 }
  ];

  // Jembatan cahaya: rute utama 1→2→alun-alun→3→4→5→6, ditambah alun-alun→1 agar pemain baru bisa kembali.
  const links = [[0, 1], [1, 2], [2, 0], [0, 3], [3, 4], [4, 5], [5, 6]];
  const byId = (id) => islands.find((i) => i.id === id);
  function edgePoint(from, to, k) {
    const dx = to.cx - from.cx; const dy = to.cy - from.cy;
    const len = Math.hypot(dx, dy);
    const ux = dx / len; const uy = dy / len;
    // Titik pada elips searah tujuan, ditarik masuk sedikit (k < 1) agar jembatan menyatu dengan pulau.
    const t = 1 / Math.sqrt((ux * ux) / (from.rx * from.rx) + (uy * uy) / (from.ry * from.ry));
    return [from.cx + ux * t * k, from.cy + uy * t * k];
  }
  const bridges = links.map(([a, b]) => ({ from: a, to: b, a: edgePoint(byId(a), byId(b), 0.82), b: edgePoint(byId(b), byId(a), 0.82), w: 30 }));

  // Titik pendaratan/portal tiap pos = sedikit di depan pusat pulau.
  const stations = islands.filter((i) => i.id > 0).map((i) => ({ id: i.id, x: i.cx, y: i.cy + i.ry * 0.25, name: i.name }));

  const W = {
    width: 960,
    height: 600,
    islands,
    bridges,
    stations,
    island: islands[0], // kompatibilitas: pulau utama
    spawn: { x: 430, y: 320 },
    nara: { x: 470, y: 268 },
    interactRadius: 46,
    speed: 170,
    trees: [[330, 230], [380, 380], [560, 230], [600, 380], [300, 330], [650, 300], [470, 410], [110, 80], [240, 140], [70, 340], [600, 60], [880, 120], [880, 400], [760, 520], [600, 540]]
  };

  function inEllipse(isl, x, y, m) {
    const ax = isl.rx - m; const ay = isl.ry - m;
    return ((x - isl.cx) ** 2) / (ax * ax) + ((y - isl.cy) ** 2) / (ay * ay) <= 1;
  }
  function nearestOnEllipse(isl, x, y, m) {
    const ax = isl.rx - m; const ay = isl.ry - m;
    const dx = x - isl.cx; const dy = y - isl.cy;
    const k = (dx * dx) / (ax * ax) + (dy * dy) / (ay * ay);
    if (k <= 1) return { x, y };
    const s = 1 / Math.sqrt(k);
    return { x: isl.cx + dx * s, y: isl.cy + dy * s };
  }
  function nearestOnBridge(br, x, y) {
    const [ax, ay] = br.a; const [bx, by] = br.b;
    const vx = bx - ax; const vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    const px = ax + vx * t; const py = ay + vy * t;
    const d = Math.hypot(x - px, y - py);
    const half = br.w / 2 - 3;
    if (d <= half) return { x, y, inside: true };
    return { x: px + ((x - px) / d) * half, y: py + ((y - py) / d) * half, inside: false };
  }

  /** Pulau mana (id) yang memuat titik ini, atau -1 bila di jembatan/laut. */
  W.islandAt = function (x, y) {
    const hit = islands.find((i) => inEllipse(i, x, y, 0));
    return hit ? hit.id : -1;
  };

  /**
   * Kunci posisi ke daratan yang boleh dipijak.
   * allowed: Set id pulau yang terbuka untuk pemain (bawaan: semua). Jembatan terbuka bila kedua ujungnya terbuka.
   */
  W.clamp = function (x, y, allowed) {
    const ok = (id) => !allowed || allowed.has(id);
    const margin = 10;
    for (const isl of islands) if (ok(isl.id) && inEllipse(isl, x, y, margin)) return { x, y };
    let best = null;
    let bestD = Infinity;
    for (const br of bridges) {
      if (!ok(br.from) || !ok(br.to)) continue;
      const p = nearestOnBridge(br, x, y);
      if (p.inside) return { x, y };
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = p; }
    }
    for (const isl of islands) {
      if (!ok(isl.id)) continue;
      const p = nearestOnEllipse(isl, x, y, margin);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best ? { x: best.x, y: best.y } : { x: W.spawn.x, y: W.spawn.y };
  };

  /** Pulau yang terbuka: alun-alun selalu; pos k bila sudah disegel, atau (urutan terpenuhi dan dibuka guru). */
  W.allowedIslands = function (sealedIds, openPosts) {
    const sealed = new Set(sealedIds);
    const open = new Set(openPosts || [1, 2, 3, 4, 5, 6]);
    const set = new Set([0]);
    for (let k = 1; k <= 6; k += 1) {
      if (sealed.has(k) || ((k === 1 || sealed.has(k - 1)) && open.has(k))) set.add(k);
    }
    return set;
  };

  root.NUTRANTARA_WORLD = W;
})(typeof window !== 'undefined' ? window : globalThis);
