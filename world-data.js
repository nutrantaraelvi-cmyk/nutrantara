/*
 * Data dunia NUTRANTARA (dipakai bersama oleh peramban dan server).
 * Kepulauan melayang di atas awan: Alun-alun Nusantara di tengah dan enam pulau pos di sekelilingnya,
 * dihubungkan jembatan cahaya, ditambah pulau jelajah bebas (dunia terbuka). Koordinat dalam satuan peta logis 2400 × 1500.
 */
(function (root) {
  // kind: 'plaza' (titik kumpul), 'post' (Pos 1–6 berisi misi), 'wild' (pulau jelajah bebas, selalu terbuka).
  const islands = [
    { id: 0, kind: 'plaza', name: 'Alun-alun Nusantara', cx: 1200, cy: 750, rx: 250, ry: 160 },
    { id: 1, kind: 'post', name: 'Kantin Nusantara', cx: 600, cy: 470, rx: 130, ry: 86 },
    { id: 2, kind: 'post', name: 'Pasar & Lab Pencernaan', cx: 380, cy: 960, rx: 124, ry: 86 },
    { id: 3, kind: 'post', name: 'Gerbang Usus Halus', cx: 1330, cy: 230, rx: 120, ry: 78 },
    { id: 4, kind: 'post', name: 'Kota Terapung', cx: 1930, cy: 330, rx: 116, ry: 80 },
    { id: 5, kind: 'post', name: 'Studio Iklan', cx: 2050, cy: 1060, rx: 116, ry: 80 },
    { id: 6, kind: 'post', name: 'Dapur Juara', cx: 1500, cy: 1290, rx: 140, ry: 84 },
    { id: 7, kind: 'wild', name: 'Bukit Sawah Terasering', cx: 830, cy: 1240, rx: 140, ry: 92, desc: 'Sawah bertingkat yang bisa didaki sampai gubuk di puncak. Padi adalah sumber karbohidrat utama di banyak daerah Indonesia.' },
    { id: 8, kind: 'wild', name: 'Hutan Bambu', cx: 190, cy: 560, rx: 118, ry: 88, desc: 'Hutan bambu yang rimbun dengan angklung raksasa dan tunggul kayu untuk dilompati.' },
    { id: 9, kind: 'wild', name: 'Danau Kawah', cx: 1760, cy: 740, rx: 124, ry: 92, desc: 'Danau biru di kawah tua, dengan dermaga kayu, teratai, dan batu loncatan menuju candi kecil.' },
    { id: 10, kind: 'wild', name: 'Pantai Kelapa', cx: 2190, cy: 1370, rx: 120, ry: 76, desc: 'Pantai berpasir dengan nyiur melambai, mercusuar, dan perahu pinisi yang bersandar.' },
    { id: 11, kind: 'wild', name: 'Bukit Layang-layang', cx: 840, cy: 180, rx: 118, ry: 80, desc: 'Bukit berangin tempat layang-layang menari dan kincir angin berputar.' },
    { id: 12, kind: 'wild', name: 'Kebun Rempah', cx: 2230, cy: 640, rx: 112, ry: 84, desc: 'Kebun rempah Nusantara: kunyit, cabai, kayu manis, dan cengkeh dijemur di atas para-para.' }
  ];

  // Jembatan cahaya. Rute pos: 1→2→(sawah)→alun-alun→3→4→(Danau Kawah)→5→6, ditambah jalur jelajah ke pulau liar.
  // Jembatan terbuka bila kedua ujungnya terbuka, jadi pulau liar di balik pos terkunci ikut terbuka bersama posnya.
  const links = [
    [0, 1], [1, 2], [2, 7], [7, 0], [0, 3], [3, 4], [5, 6], [6, 0], [6, 7],
    [0, 11], [11, 1], [11, 3], [1, 8], [8, 2], [0, 9], [9, 4], [9, 5], [9, 12], [12, 4], [5, 10]
  ];
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
  const stations = islands.filter((i) => i.kind === 'post').map((i) => ({ id: i.id, x: i.cx, y: i.cy + i.ry * 0.25, name: i.name }));

  const W = {
    width: 2400,
    height: 1500,
    islands,
    bridges,
    stations,
    island: islands[0], // kompatibilitas: pulau utama
    spawn: { x: 1150, y: 775 },
    nara: { x: 1200, y: 712 },
    interactRadius: 46,
    speed: 170,
    trees: [],
    isPost: (id) => Boolean(byId(id) && byId(id).kind === 'post'),
    isWild: (id) => Boolean(byId(id) && byId(id).kind === 'wild')
  };

  // Pohon di tepi tiap pulau (deterministik, dipakai peta 2D dan alun-alun 3D).
  islands.forEach((isl) => {
    const n = isl.kind === 'plaza' ? 10 : 4;
    for (let k = 0; k < n; k += 1) {
      const a = (k / n) * Math.PI * 2 + isl.id * 0.7;
      W.trees.push([Math.round(isl.cx + Math.cos(a) * isl.rx * 0.72), Math.round(isl.cy + Math.sin(a) * isl.ry * 0.72)]);
    }
  });

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

  /** Pulau yang terbuka: alun-alun & pulau jelajah selalu; pos k bila sudah disegel, atau (urutan terpenuhi dan dibuka guru). */
  W.allowedIslands = function (sealedIds, openPosts) {
    const sealed = new Set(sealedIds);
    const open = new Set(openPosts || [1, 2, 3, 4, 5, 6]);
    const set = new Set(islands.filter((i) => i.kind !== 'post').map((i) => i.id));
    for (let k = 1; k <= 6; k += 1) {
      if (sealed.has(k) || ((k === 1 || sealed.has(k - 1)) && open.has(k))) set.add(k);
    }
    return set;
  };

  root.NUTRANTARA_WORLD = W;
})(typeof window !== 'undefined' ? window : globalThis);
