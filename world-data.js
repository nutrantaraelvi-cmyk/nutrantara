/*
 * Data dunia NUTRANTARA (dipakai bersama oleh peramban dan server).
 * Kepulauan melayang di atas awan. Sejak 0.9 tiap pos adalah wilayah dunia terbuka sendiri seluas ±1000 × 650 m
 * (di cerita game: "100 × 65 km"), tersusun 3 × 2. Alun-alun Nusantara dan pulau jelajah mengisi celah di antaranya,
 * dihubungkan jembatan cahaya. Koordinat dalam satuan peta logis 32400 × 15200 (1 satuan = 0,1 m di dunia 3D).
 */
(function (root) {
  // Ukuran wilayah pos (setengah sumbu elips): 5000 × 3250 satuan = 1000 × 650 m.
  const PRX = 5000;
  const PRY = 3250;
  // kind: 'plaza' (titik kumpul), 'post' (Pos 1–6 berisi misi), 'wild' (pulau jelajah bebas, selalu terbuka).
  const islands = [
    { id: 0, kind: 'plaza', name: 'Alun-alun Nusantara', cx: 10900, cy: 7600, rx: 250, ry: 160 },
    { id: 1, kind: 'post', name: 'Kantin Nusantara', cx: 5600, cy: 4000, rx: PRX, ry: PRY },
    { id: 2, kind: 'post', name: 'Pasar & Lab Pencernaan', cx: 5600, cy: 11200, rx: PRX, ry: PRY },
    { id: 3, kind: 'post', name: 'Gerbang Usus Halus', cx: 16200, cy: 4000, rx: PRX, ry: PRY },
    { id: 4, kind: 'post', name: 'Kota Terapung', cx: 26800, cy: 4000, rx: PRX, ry: PRY },
    { id: 5, kind: 'post', name: 'Studio Iklan', cx: 26800, cy: 11200, rx: PRX, ry: PRY },
    { id: 6, kind: 'post', name: 'Dapur Juara', cx: 16200, cy: 11200, rx: PRX, ry: PRY },
    { id: 7, kind: 'wild', name: 'Bukit Sawah Terasering', cx: 10900, cy: 12500, rx: 140, ry: 92, desc: 'Sawah bertingkat yang bisa didaki sampai gubuk di puncak. Padi adalah sumber karbohidrat utama di banyak daerah Indonesia.' },
    { id: 8, kind: 'wild', name: 'Hutan Bambu', cx: 1000, cy: 7600, rx: 118, ry: 88, desc: 'Hutan bambu yang rimbun dengan angklung raksasa dan tunggul kayu untuk dilompati.' },
    { id: 9, kind: 'wild', name: 'Danau Kawah', cx: 21500, cy: 7600, rx: 124, ry: 92, desc: 'Danau biru di kawah tua, dengan dermaga kayu, teratai, dan batu loncatan menuju candi kecil.' },
    { id: 10, kind: 'wild', name: 'Pantai Kelapa', cx: 21500, cy: 12500, rx: 120, ry: 76, desc: 'Pantai berpasir dengan nyiur melambai, mercusuar, dan perahu pinisi yang bersandar.' },
    { id: 11, kind: 'wild', name: 'Bukit Layang-layang', cx: 10900, cy: 2700, rx: 118, ry: 80, desc: 'Bukit berangin tempat layang-layang menari dan kincir angin berputar.' },
    { id: 12, kind: 'wild', name: 'Kebun Rempah', cx: 21500, cy: 2700, rx: 112, ry: 84, desc: 'Kebun rempah Nusantara: kunyit, cabai, kayu manis, dan cengkeh dijemur di atas para-para.' }
  ];

  // Jembatan cahaya. Alun-alun berada di persimpangan Pos 1, 2, 3, dan 6; Danau Kawah di persimpangan Pos 3, 4, 5, dan 6.
  // Jembatan terbuka bila kedua ujungnya terbuka, jadi pulau liar di balik pos terkunci ikut terbuka bersama posnya.
  const links = [
    [0, 1], [0, 2], [0, 3], [0, 6], [1, 8], [8, 2], [1, 11], [11, 3], [3, 12], [12, 4],
    [3, 4], [9, 3], [9, 4], [9, 5], [9, 6], [5, 6], [6, 10], [10, 5], [2, 7], [7, 6]
  ];
  const byId = (id) => islands.find((i) => i.id === id);
  const isBig = (isl) => isl.rx > 1000;
  // Pulau kecil: titik pada elips searah tujuan, ditarik masuk sedikit agar jembatan menyatu dengan pulau.
  function edgeToward(isl, tx, ty) {
    const dx = tx - isl.cx; const dy = ty - isl.cy;
    const len = Math.hypot(dx, dy);
    const ux = dx / len; const uy = dy / len;
    const t = 1 / Math.sqrt((ux * ux) / (isl.rx * isl.rx) + (uy * uy) / (isl.ry * isl.ry));
    return [isl.cx + ux * t * 0.82, isl.cy + uy * t * 0.82];
  }
  // Wilayah pos: titik tepi yang paling dekat ke tujuan (agar jembatan tidak melintasi separuh wilayah), masuk 4 m.
  function edgeNearest(isl, tx, ty) {
    let best = null; let bestD = Infinity;
    for (let k = 0; k < 720; k += 1) {
      const a = (k / 720) * Math.PI * 2;
      const x = isl.cx + Math.cos(a) * isl.rx; const y = isl.cy + Math.sin(a) * isl.ry;
      const d = Math.hypot(x - tx, y - ty);
      if (d < bestD) { bestD = d; best = a; }
    }
    return [isl.cx + Math.cos(best) * (isl.rx - 40), isl.cy + Math.sin(best) * (isl.ry - 40)];
  }
  function bridgeEnds(A, B) {
    if (isBig(A) && isBig(B)) return [edgeNearest(A, B.cx, B.cy), edgeNearest(B, A.cx, A.cy)];
    if (isBig(A)) { const a = edgeNearest(A, B.cx, B.cy); return [a, edgeToward(B, a[0], a[1])]; }
    if (isBig(B)) { const b = edgeNearest(B, A.cx, A.cy); return [edgeToward(A, b[0], b[1]), b]; }
    return [edgeToward(A, B.cx, B.cy), edgeToward(B, A.cx, A.cy)];
  }
  const bridges = links.map(([a, b]) => { const [pa, pb] = bridgeEnds(byId(a), byId(b)); return { from: a, to: b, a: pa, b: pb, w: 30 }; });

  // Titik pendaratan/portal tiap pos = 30 m di selatan pusat wilayah (pusatnya berisi desa penanda khas).
  const stations = islands.filter((i) => i.kind === 'post').map((i) => ({ id: i.id, x: i.cx, y: i.cy + Math.min(i.ry * 0.25, 300), name: i.name }));
  const plaza = islands[0];

  const W = {
    width: 32400,
    height: 15200,
    islands,
    bridges,
    stations,
    island: plaza, // kompatibilitas: pulau utama
    spawn: { x: plaza.cx - 50, y: plaza.cy + 25 },
    nara: { x: plaza.cx, y: plaza.cy - 38 },
    interactRadius: 46,
    speed: 170,
    trees: [],
    isPost: (id) => Boolean(byId(id) && byId(id).kind === 'post'),
    isWild: (id) => Boolean(byId(id) && byId(id).kind === 'wild')
  };

  // Pohon (deterministik, dipakai peta 2D dan alun-alun 3D): di tepi pulau kecil, tersebar di wilayah pos.
  let seed = 9091;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  islands.forEach((isl) => {
    if (isBig(isl)) {
      for (let k = 0; k < 90; k += 1) {
        const a = rnd() * Math.PI * 2; const r = Math.sqrt(rnd()) * 0.92;
        const x = Math.round(isl.cx + Math.cos(a) * isl.rx * r); const y = Math.round(isl.cy + Math.sin(a) * isl.ry * r);
        if (Math.hypot(x - isl.cx, y - isl.cy) > 500) W.trees.push([x, y]);
      }
      return;
    }
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
