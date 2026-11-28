/*
 * NUTRANTARA — logika Kampung (sejak 1.6): tas bahan, Dapur Lapangan, dan quest warga.
 * Skrip biasa tanpa DOM (window.NUTRANTARA_KAMPUNG_CORE), dipakai bersama oleh server (otoritatif saat daring),
 * mode luring/tamu di peramban, dan uji asap. Server memanggil apply() dengan konteks dari datanya sendiri
 * (pulau tempat pemain berada, pulau yang sudah ditemukan, jam server), jadi klien tidak bisa memalsukannya.
 */
window.NUTRANTARA_KAMPUNG_CORE = (() => {
  const D = window.NUTRANTARA_KAMPUNG;
  const QUEST = Object.fromEntries(D.QUESTS.map((q) => [q.id, q]));
  const int = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));

  function fresh() {
    return { items: {}, dishes: {}, recipes: D.START_RECIPES.slice(), cooked: [], quests: {}, gathered: 0, cool: {}, lastGather: 0 };
  }

  /** Bentuk tas yang sah: hanya id yang dikenal, jumlah dalam batas. Data rusak/asing dibuang. */
  function norm(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const out = fresh();
    const src = (o) => (o && typeof o === 'object' ? o : {});
    Object.keys(D.ITEMS).forEach((id) => { const n = int(src(s.items)[id], D.ITEM_MAX); if (n) out.items[id] = n; });
    Object.keys(D.RECIPES).forEach((id) => { const n = int(src(s.dishes)[id], D.DISH_MAX); if (n) out.dishes[id] = n; });
    const list = (v) => (Array.isArray(v) ? v : []);
    out.recipes = [...new Set([...D.START_RECIPES, ...list(s.recipes).filter((id) => D.RECIPES[id])])];
    out.cooked = [...new Set(list(s.cooked).filter((id) => D.RECIPES[id]))];
    Object.entries(src(s.quests)).forEach(([id, q]) => {
      if (!QUEST[id] || !q || typeof q !== 'object') return;
      const state = q.state === 'done' ? 'done' : q.state === 'active' ? 'active' : null;
      if (state) out.quests[id] = { state, at: typeof q.at === 'string' ? q.at.slice(0, 30) : '', tries: int(q.tries, 99) };
    });
    out.gathered = int(s.gathered, 100000);
    const now = Date.now();
    Object.entries(src(s.cool)).forEach(([id, t]) => { const n = Number(t); if (/^\d{1,2}:\d{1,2}$/.test(id) && Number.isFinite(n) && now - n < D.COOLDOWN_MS) out.cool[id] = n; });
    out.lastGather = Number.isFinite(Number(s.lastGather)) ? Number(s.lastGather) : 0;
    return out;
  }

  const nodeItem = (nodeId) => {
    const [isl, k] = String(nodeId).split(':').map(Number);
    const list = D.NODES[isl];
    return list && Number.isInteger(k) && k >= 0 && k < list.length ? { island: isl, item: list[k] } : null;
  };
  /** Jumlah bahan/hidangan di tas (kunci needs bisa id bahan atau id resep). */
  const have = (st, id) => (D.ITEMS[id] ? st.items[id] || 0 : st.dishes[id] || 0);
  const label = (id) => (D.ITEMS[id] ? D.ITEMS[id].name : D.RECIPES[id] ? D.RECIPES[id].name : id);

  /** Status quest: locked (quest sebelumnya belum tuntas) | open | active | done. */
  function status(st, q) {
    const cur = st.quests[q.id];
    if (cur && cur.state) return cur.state;
    if (q.after && !(st.quests[q.after] && st.quests[q.after].state === 'done')) return 'locked';
    return 'open';
  }
  /** Quest yang sedang ditawarkan/dijalankan seorang warga (null bila semua tuntas). */
  function npcQuest(st, npcId) {
    return D.QUESTS.find((q) => q.npc === npcId && status(st, q) !== 'done' && status(st, q) !== 'locked') || null;
  }
  function missing(st, q, ctx = {}) {
    if (q.kind === 'visit') return (ctx.explored || []).includes(q.island) ? [] : [`temukan pulau tujuan`];
    if (q.kind !== 'bring') return [];
    return Object.entries(q.needs).filter(([id, n]) => have(st, id) < n).map(([id, n]) => `${label(id)} ${have(st, id)}/${n}`);
  }

  const fail = (message) => ({ ok: false, message });
  /**
   * Terapkan aksi siswa. ctx = { now: ms, island: pulau tempat pemain (null di lobi), explored: [id pulau jelajah] }.
   * Mengembalikan { ok, message?, result? }. st diubah langsung bila berhasil.
   */
  function apply(st, msg, ctx = {}) {
    const now = Number.isFinite(ctx.now) ? ctx.now : Date.now();
    const action = msg && msg.action;
    if (action === 'gather') {
      const node = nodeItem(msg.node);
      if (!node) return fail('Titik bahan tidak dikenal.');
      if (ctx.island !== node.island) return fail('Dekati titik bahannya dulu.');
      if (now - (st.lastGather || 0) < D.GATHER_GAP_MS) return fail('Pelan-pelan, petik satu per satu.');
      const left = D.COOLDOWN_MS - (now - (st.cool[msg.node] || 0));
      if (left > 0) return fail(`Bahan di sini belum tumbuh lagi (±${Math.ceil(left / 60000)} menit).`);
      if ((st.items[node.item] || 0) >= D.ITEM_MAX) return fail(`Tas penuh untuk ${label(node.item)} (maks. ${D.ITEM_MAX}).`);
      st.items[node.item] = (st.items[node.item] || 0) + 1;
      st.cool[msg.node] = now;
      st.lastGather = now;
      st.gathered += 1;
      return { ok: true, result: { item: node.item, count: st.items[node.item] } };
    }
    if (action === 'cook') {
      const r = D.RECIPES[msg.recipe];
      if (!r) return fail('Resep tidak dikenal.');
      if (!st.recipes.includes(msg.recipe)) return fail('Resep ini belum kamu pelajari. Bantu warga untuk mendapatkannya.');
      const lack = Object.entries(r.needs).filter(([id, n]) => (st.items[id] || 0) < n);
      if (lack.length) return fail(`Bahan kurang: ${lack.map(([id, n]) => `${label(id)} ${st.items[id] || 0}/${n}`).join(', ')}.`);
      if ((st.dishes[msg.recipe] || 0) >= D.DISH_MAX) return fail(`Rantang penuh untuk ${r.name}.`);
      Object.entries(r.needs).forEach(([id, n]) => { st.items[id] -= n; if (!st.items[id]) delete st.items[id]; });
      st.dishes[msg.recipe] = (st.dishes[msg.recipe] || 0) + 1;
      const first = !st.cooked.includes(msg.recipe);
      if (first) st.cooked.push(msg.recipe);
      return { ok: true, result: { recipe: msg.recipe, first } };
    }
    if (action === 'eat') {
      const r = D.RECIPES[msg.recipe];
      if (!r || !(st.dishes[msg.recipe] > 0)) return fail('Hidangan itu tidak ada di rantangmu.');
      st.dishes[msg.recipe] -= 1;
      if (!st.dishes[msg.recipe]) delete st.dishes[msg.recipe];
      return { ok: true, result: { recipe: msg.recipe, buffMs: D.BUFF_MS } };
    }
    const q = QUEST[msg && msg.quest];
    if (!q) return fail('Quest tidak dikenal.');
    const s = status(st, q);
    if (action === 'accept') {
      if (s === 'locked') return fail('Selesaikan dulu permintaan sebelumnya dari warga ini.');
      if (s !== 'open') return fail(s === 'done' ? 'Quest ini sudah tuntas.' : 'Quest ini sudah berjalan.');
      st.quests[q.id] = { state: 'active', at: new Date(now).toISOString(), tries: 0 };
      return { ok: true, result: { quest: q.id, state: 'active' } };
    }
    if (action === 'answer') {
      if (q.kind !== 'quiz') return fail('Quest ini bukan kuis.');
      if (s !== 'active') return fail(s === 'done' ? 'Kuis ini sudah tuntas.' : 'Terima dulu quest-nya.');
      st.quests[q.id].tries += 1;
      if (msg.choice !== q.answer) return { ok: true, result: { quest: q.id, correct: false, tries: st.quests[q.id].tries } };
      return finish(st, q, now, { correct: true });
    }
    if (action === 'turnin') {
      if (q.kind === 'quiz') return fail('Jawab kuisnya dulu.');
      if (s !== 'active') return fail(s === 'done' ? 'Quest ini sudah tuntas.' : 'Terima dulu quest-nya.');
      const lack = missing(st, q, ctx);
      if (lack.length) return fail(`Belum lengkap: ${lack.join(', ')}.`);
      if (q.kind === 'bring') Object.entries(q.needs).forEach(([id, n]) => {
        const bag = D.ITEMS[id] ? st.items : st.dishes;
        bag[id] -= n;
        if (!bag[id]) delete bag[id];
      });
      return finish(st, q, now, {});
    }
    return fail('Aksi tidak dikenal.');
  }
  function finish(st, q, now, extra) {
    st.quests[q.id] = { ...(st.quests[q.id] || {}), state: 'done', at: new Date(now).toISOString() };
    (q.recipes || []).forEach((id) => { if (!st.recipes.includes(id)) st.recipes.push(id); });
    Object.entries(q.items || {}).forEach(([id, n]) => { st.items[id] = Math.min(D.ITEM_MAX, (st.items[id] || 0) + n); });
    return { ok: true, result: { quest: q.id, state: 'done', xp: q.xp, recipes: q.recipes || [], items: q.items || {}, ...extra } };
  }

  /** Fakta untuk XP & lencana RPG. XP quest hanya dari quest berstatus done (yang selalu diputuskan apply). */
  function facts(st) {
    const done = D.QUESTS.filter((q) => st.quests[q.id] && st.quests[q.id].state === 'done');
    return { questsDone: done.length, questXp: done.reduce((n, q) => n + q.xp, 0), cooked: st.cooked.length, gathered: st.gathered };
  }

  return { fresh, norm, apply, status, npcQuest, missing, have, label, nodeItem, facts, QUEST };
})();
