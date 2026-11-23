'use strict';
/*
 * Server kelas NUTRANTARA.
 * - Menyajikan berkas statis permainan dan panel admin.
 * - WebSocket /ws untuk dunia bersama, obrolan, sinkronisasi progres, dan kendali guru.
 * - Data kelas disimpan di data/classroom.json pada komputer guru (alias saja, tanpa identitas pribadi).
 *
 * Jalankan: npm start   (PIN admin: variabel NUTRANTARA_ADMIN_PIN, atau dibuat acak saat start)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const vm = require('vm');
const { WebSocketServer } = require('ws');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.NUTRANTARA_DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'classroom.json');
const PRODUCTION = process.env.NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
if (PRODUCTION && !/^\S{6,64}$/.test(process.env.NUTRANTARA_ADMIN_PIN || '')) {
  console.error('[config] NODE_ENV=production membutuhkan NUTRANTARA_ADMIN_PIN (6–64 karakter, tanpa spasi).');
  process.exit(1);
}
const ADMIN_PIN = String(process.env.NUTRANTARA_ADMIN_PIN || crypto.randomInt(100000, 1000000));
const MAX_PLAYERS = Number(process.env.NUTRANTARA_MAX_PLAYERS) || 60;
const SEAL_POINTS = 20;
const MIN_REASON = 20;

// ---------- Data bersama (sama dengan yang dipakai peramban) ----------

function loadBrowserScript(file) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  return sandbox.window;
}

const MISSIONS = loadBrowserScript('missions.js').NUTRANTARA_MISSIONS;
const WORLD = loadBrowserScript('world-data.js').NUTRANTARA_WORLD;
const ALL_POSTS = MISSIONS.map((m) => m.id);

// ---------- Penyimpanan ----------

function freshDb() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    settings: { paused: false, chatEnabled: true, movementLocked: false, openPosts: ALL_POSTS.slice(), announcement: '', classCode: '' },
    players: {},
    teams: {},
    chat: []
  };
}

function loadDb() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const base = freshDb();
    return { ...base, ...saved, settings: { ...base.settings, ...saved.settings }, players: saved.players || {}, teams: saved.teams || {}, chat: saved.chat || [] };
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[data] Gagal membaca data kelas, memulai data baru:', err.message);
    return freshDb();
  }
}

const db = loadDb();
let saveTimer = null;

function flushDb() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('[data] Gagal menyimpan data kelas:', err.message);
  }
}

function scheduleSave() {
  if (!saveTimer) saveTimer = setTimeout(flushDb, 1000);
}

// ---------- Utilitas ----------

const sha256 = (text) => crypto.createHash('sha256').update(String(text)).digest('hex');
const newId = () => crypto.randomBytes(6).toString('hex');
const newToken = () => crypto.randomBytes(24).toString('base64url');
const now = () => new Date().toISOString();

function cleanText(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function colorFor(alias) {
  let h = 0;
  for (const ch of alias) h = (h * 31 + ch.codePointAt(0)) % 360;
  return `hsl(${h} 75% 62%)`;
}

function safeEqual(a, b) {
  const x = Buffer.from(sha256(a));
  const y = Buffer.from(sha256(b));
  return crypto.timingSafeEqual(x, y);
}

// ---------- Akun (nama pengguna + kata sandi, tanpa email) ----------

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;
const PLAYER_COLORS = ['#68dce7', '#78f4bd', '#ffd17c', '#ff9f91', '#c58cf0', '#7fa8ff', '#f59e5b', '#f472b6'];
const SESSION_DAYS = 30;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function checkPassword(password, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), Buffer.from(salt, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function issueSession(player) {
  const token = newToken();
  player.sessions = (player.sessions || []).filter((s) => s.exp > Date.now()).slice(-4);
  player.sessions.push({ hash: sha256(token), exp: Date.now() + SESSION_DAYS * 864e5 });
  return token;
}

function playerBySession(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  const hash = sha256(token);
  return Object.values(db.players).find((p) => (p.sessions || []).some((s) => s.exp > Date.now() && s.hash === hash)) || null;
}

const accountView = (p) => ({ id: p.id, username: p.alias, color: p.color, score: p.score, seals: p.seals, createdAt: p.createdAt });

function tempPassword() {
  const words = ['tempe', 'jagung', 'sagu', 'kelor', 'pisang', 'ubi', 'beras', 'kacang'];
  return `${words[crypto.randomInt(words.length)]}-${crypto.randomInt(1000, 10000)}`;
}

function sealedIds(p) {
  const posts = (p.progress && p.progress.posts) || {};
  return ALL_POSTS.filter((id) => posts[id] && posts[id].sealed);
}
const allowedFor = (p) => WORLD.allowedIslands(sealedIds(p), db.settings.openPosts);

// ---------- Validasi progres (server menghitung ulang skor) ----------

const awardForAttempt = (attempts) => Math.max(10, 30 - 5 * Math.max(0, attempts - 1));

function isCorrect(def, response) {
  if (def.type === 'single') return typeof response === 'string' && response === def.correct;
  if (def.type === 'multi') return Array.isArray(response) && response.length === def.correct.length && def.correct.every((v) => response.includes(v));
  if (def.type === 'order') return Array.isArray(response) && def.correct.every((v, i) => response[i] === v);
  if (def.type === 'sort') return response && typeof response === 'object' && Object.keys(def.correct).every((k) => response[k] === def.correct[k]);
  return false;
}

// Pos bervarian (Pos 1): kunci jawaban diambil dari varian milik siswa. Progres lama tanpa nomor = varian 0.
function challengesFor(m, p, flags) {
  if (!m.variants) return m.challenges;
  if (p.variant === undefined) return m.variants[0].mission.challenges;
  if (!Number.isInteger(p.variant) || !m.variants[p.variant]) {
    flags.push(`Pos ${m.id}: nomor varian tidak sah, dikembalikan ke varian 1`);
    p.variant = 0;
  }
  return m.variants[p.variant].mission.challenges;
}

function validateProgress(state) {
  const flags = [];
  let score = 0;
  let seals = 0;
  let prevSealed = true;
  const posts = state.posts || {};
  for (const m of MISSIONS) {
    const p = posts[m.id];
    if (!p || typeof p !== 'object') { prevSealed = false; continue; }
    if (m.type === 'analysis') {
      const list = Array.isArray(p.challenges) ? p.challenges : [];
      let allDone = true;
      challengesFor(m, p, flags).forEach((def, i) => {
        const c = list[i];
        if (!c || typeof c !== 'object' || !c.complete) { allDone = false; return; }
        // Satu jawaban per tantangan: benar = poin, salah = 0 poin (tetap dianggap selesai).
        // Kebenaran selalu dihitung ulang dari kunci, bukan dari klaim klien.
        const empty = c.response === null || c.response === undefined || (Array.isArray(c.response) && !c.response.length);
        if (empty) { flags.push(`Pos ${m.id} tantangan ${i + 1}: ditandai selesai tanpa jawaban`); c.complete = false; c.points = 0; allDone = false; return; }
        c.attempts = Math.max(1, Math.floor(Number(c.attempts)) || 1);
        c.correct = isCorrect(def, c.response);
        c.points = c.correct ? awardForAttempt(c.attempts) : 0;
        score += c.points;
      });
      if (p.sealed && (!allDone || !prevSealed || String(p.reason || '').trim().length < MIN_REASON)) {
        flags.push(`Pos ${m.id}: segel tidak memenuhi syarat dan dibatalkan`);
        p.sealed = false;
        p.sealedAt = null;
      }
    } else if (p.sealed) {
      const ok = prevSealed && p.initial && p.initial.savedAt && p.review && p.review.savedAt && p.revision && p.revision.savedAt;
      if (!ok) {
        flags.push(`Pos ${m.id}: segel tidak memenuhi syarat dan dibatalkan`);
        p.sealed = false;
        p.sealedAt = null;
      }
    }
    if (p.sealed) { score += SEAL_POINTS; seals += 1; }
    prevSealed = Boolean(p.sealed);
  }
  return { score, seals, flags };
}

// ---------- Ringkasan untuk klien ----------

const conns = new Map(); // ws -> { role, playerId, ip }
const onlineIds = () => new Set([...conns.values()].filter((c) => c.role === 'player').map((c) => c.playerId));

function publicPlayer(p) {
  return { id: p.id, alias: p.alias, color: p.color, x: Math.round(p.x), y: Math.round(p.y), seals: p.seals, activePos: p.activePos || null, zone: p.zone || 'lobby' };
}

function leaderboard() {
  const online = onlineIds();
  return Object.values(db.players)
    .filter((p) => p.progress)
    .sort((a, b) => b.score - a.score || b.seals - a.seals || String(a.finishedAt || '9').localeCompare(String(b.finishedAt || '9')))
    .slice(0, 50)
    .map((p) => ({ alias: p.alias, score: p.score, seals: p.seals, online: online.has(p.id), finished: Boolean(p.finishedAt) }));
}

function postSummary(p) {
  const posts = (p.progress && p.progress.posts) || {};
  return MISSIONS.map((m) => {
    const s = posts[m.id] || {};
    const attempts = Array.isArray(s.challenges) ? s.challenges.reduce((n, c) => n + (Number(c && c.attempts) || 0), 0) : 0;
    const done = Array.isArray(s.challenges) ? s.challenges.filter((c) => c && c.complete).length : 0;
    const correct = Array.isArray(s.challenges) ? s.challenges.filter((c) => c && c.complete && c.correct !== false).length : 0;
    return { id: m.id, started: Boolean(s.started), sealed: Boolean(s.sealed), attempts, done, correct, total: m.type === 'analysis' ? m.challenges.length : 0, step: s.step || null };
  });
}

/** Ringkasan regu untuk panel guru: kemajuan per pos dan kontribusi tiap anggota. */
function adminTeam(team) {
  const online = onlineIds();
  return {
    code: team.code,
    createdAt: team.createdAt,
    members: team.members.filter((id) => db.players[id]).map((id) => {
      const c = (team.contrib && team.contrib[id]) || {};
      return { id, alias: db.players[id].alias, online: online.has(id), lastSeen: db.players[id].lastSeen, score: db.players[id].score, seals: db.players[id].seals, contrib: Object.values(c).reduce((n, x) => n + x, 0), perPost: c };
    }),
    posts: MISSIONS.map((m) => {
      const t = team.posts[m.id] || {};
      const stations = m.activity && m.activity.stations ? m.activity.stations.filter((st) => t.activity && t.activity.stations && t.activity.stations[st.id]).length : 0;
      if (m.type === 'project') {
        const arsip = (t.activity && t.activity.arsip) || {};
        return { id: m.id, type: m.type, steps: ['initial', 'review', 'revision'].filter((k) => t[k] && t[k].savedAt).length, collected: ((t.activity && t.activity.collected) || []).length, archive: Boolean(t.activity && t.activity.stations && t.activity.stations.arsip), reviews: Object.keys(arsip.reviews || {}).length };
      }
      const ch = Array.isArray(t.challenges) ? t.challenges : [];
      return { id: m.id, type: m.type, done: ch.filter((c) => c && c.complete).length, correct: ch.filter((c) => c && c.complete && c.correct).length, total: m.challenges.length, stations, stationTotal: m.activity && m.activity.stations ? m.activity.stations.length : 0, evidence: (t.evidence || []).length, variant: Number.isInteger(t.variant) ? t.variant + 1 : null, pendingVotes: Object.keys(t.votes || {}).length };
    }),
    log: (team.log || []).slice(-12)
  };
}

function adminPlayer(p, online) {
  return {
    ...publicPlayer(p),
    online: online.has(p.id),
    score: p.score,
    muted: Boolean(p.muted),
    blocked: Boolean(p.blocked),
    hasPassword: Boolean(p.passHash),
    screen: p.screen || null,
    flags: p.flags || [],
    lastSeen: p.lastSeen,
    createdAt: p.createdAt,
    finishedAt: p.finishedAt || null,
    party: teamOf(p) ? p.team : null,
    posts: postSummary(p)
  };
}

function adminSnapshot() {
  const online = onlineIds();
  return {
    type: 'admin-state',
    settings: db.settings,
    players: Object.values(db.players).sort((a, b) => a.alias.localeCompare(b.alias, 'id')).map((p) => adminPlayer(p, online)),
    teams: Object.values(db.teams).map(adminTeam),
    missions: MISSIONS.map((m) => ({ id: m.id, title: `${m.title} ${m.titleEm}`, type: m.type })),
    world: { width: WORLD.width, height: WORLD.height },
    serverTime: now()
  };
}

// ---------- Kirim pesan ----------

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(msg, filter = () => true) {
  const data = JSON.stringify(msg);
  for (const [ws, c] of conns) if (ws.readyState === 1 && filter(c)) ws.send(data);
}

const toPlayers = (msg) => broadcast(msg, (c) => c.role === 'player');
const toAdmins = (msg) => broadcast(msg, (c) => c.role === 'admin');
const socketsOf = (playerId) => [...conns].filter(([, c]) => c.role === 'player' && c.playerId === playerId).map(([ws]) => ws);

let adminDirty = true;
let boardDirty = false;
let positionsDirty = false;

function settingsChanged() {
  toPlayers({ type: 'settings', settings: publicSettings() });
  adminDirty = true;
  scheduleSave();
}

const publicSettings = () => { const { classCode, ...rest } = db.settings; return rest; };

// ---------- Penanganan pesan pemain ----------

function handleJoin(ws, conn, msg) {
  const player = playerBySession(msg.session);
  if (!player) return send(ws, { type: 'error', code: 'auth', message: 'Sesi masuk sudah berakhir. Silakan masuk lagi.' });
  if (player.blocked) return send(ws, { type: 'error', code: 'blocked', message: 'Akun ini sedang dikeluarkan oleh guru. Minta guru mengizinkan kembali.' });
  // Tab/perangkat lain dengan akun yang sama ditutup.
  socketsOf(player.id).forEach((other) => { if (other !== ws) { send(other, { type: 'replaced' }); other.close(4001, 'replaced'); } });
  player.zone = 'lobby';
  const token = null;

  conn.role = 'player';
  conn.playerId = player.id;
  player.lastSeen = now();
  scheduleSave();

  if (teamOf(player) && player.progress) overlayTeam(player.progress, teamOf(player));
  const online = onlineIds();
  send(ws, {
    type: 'welcome',
    you: { ...publicPlayer(player), muted: player.muted },
    token,
    progress: player.progress,
    progressUpdatedAt: player.progressUpdatedAt,
    settings: publicSettings(),
    players: Object.values(db.players).filter((p) => online.has(p.id) && p.id !== player.id).map(publicPlayer),
    chat: db.chat.slice(-30),
    leaderboard: leaderboard()
  });
  broadcast({ type: 'player-join', player: publicPlayer(player) }, (c) => c.role === 'player' && c.playerId !== player.id);
  if (teamOf(player)) teamChanged(player.team, true); else { player.team = null; send(ws, { type: 'party', party: null }); }
  adminDirty = true;
  boardDirty = true;
}

function handleMove(conn, msg) {
  const p = db.players[conn.playerId];
  if (!p || p.zone !== 'world' || db.settings.paused || db.settings.movementLocked) return;
  let x = Number(msg.x);
  let y = Number(msg.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  // Batasi lompatan per pesan agar tidak bisa teleport sendiri.
  const dx = x - p.x;
  const dy = y - p.y;
  const dist = Math.hypot(dx, dy);
  const maxStep = 60;
  if (dist > maxStep) { x = p.x + (dx / dist) * maxStep; y = p.y + (dy / dist) * maxStep; }
  const c = WORLD.clamp(x, y, allowedFor(p));
  p.x = c.x;
  p.y = c.y;
  p.h = Math.max(0, Math.min(80, Math.round(Number(msg.h)) || 0)); // tinggi lompatan (×0,1 unit), hanya tampilan
  positionsDirty = true;
}

function handleZone(conn, msg) {
  const p = db.players[conn.playerId];
  if (!p || !['lobby', 'world'].includes(msg.zone)) return;
  p.zone = msg.zone;
  positionsDirty = true;
  adminDirty = true;
}

// Terjun ke pulau pilihan: server memeriksa apakah pulau itu terbuka untuk pemain.
function handleSpawn(ws, conn, msg) {
  const p = db.players[conn.playerId];
  const id = Number(msg.island);
  if (!p) return;
  const allowed = allowedFor(p);
  if (msg.to) return spawnNearFriend(ws, p, String(msg.to), allowed);
  if (!allowed.has(id)) return send(ws, { type: 'spawn-denied', island: id, message: 'Pulau ini belum terbuka untukmu.' });
  const isl = WORLD.islands.find((i) => i.id === id);
  const st = WORLD.stations.find((x) => x.id === id);
  // Pos: di depan portal; pulau jelajah: sedikit di selatan pusat (pusatnya berisi penanda khas).
  const base = id === 0 ? WORLD.spawn : { x: isl.cx, y: st ? st.y + 22 : isl.cy + isl.ry * 0.62 };
  const c = WORLD.clamp(base.x + (Math.random() * 30 - 15), base.y + (Math.random() * 16 - 8), allowed);
  p.x = c.x; p.y = c.y; p.h = 0; p.zone = 'world';
  positionsDirty = true;
  adminDirty = true;
  send(ws, { type: 'spawned', island: id, x: p.x, y: p.y });
}

// Terjun ke dekat teman satu regu yang sedang berada di dunia.
function spawnNearFriend(ws, p, friendId, allowed) {
  const f = db.players[friendId];
  const deny = (message) => send(ws, { type: 'spawn-denied', friend: friendId, message });
  if (!f || !sameTeam(p, f)) return deny('Pemain itu bukan anggota regumu.');
  if (!onlineIds().has(f.id) || f.zone !== 'world') return deny(`${f.alias} sedang tidak berada di dunia.`);
  const c = WORLD.clamp(f.x + (Math.random() * 40 - 20), f.y + (Math.random() * 24 - 12), allowed);
  const near = Math.hypot(c.x - f.x, c.y - f.y) < 60;
  const island = WORLD.islandAt(c.x, c.y);
  p.x = c.x; p.y = c.y; p.h = 0; p.zone = 'world';
  positionsDirty = true;
  adminDirty = true;
  send(ws, { type: 'spawned', island: island >= 0 ? island : 0, x: p.x, y: p.y, friend: f.id, near });
}

const EMOTES = new Set(['wave', 'dance', 'cheer', 'think']);
function handleEmote(conn, msg) {
  const p = db.players[conn.playerId];
  if (!p || !EMOTES.has(msg.emote) || db.settings.paused) return;
  const t = Date.now();
  if (conn.lastEmote && t - conn.lastEmote < 1200) return;
  conn.lastEmote = t;
  broadcast({ type: 'emote', id: p.id, emote: msg.emote }, (c) => c.role === 'player');
}

// ---------- Regu proyek (PjBL): 1–4 anggota, tersimpan permanen ----------
// Regu dibentuk bebas oleh siswa dengan kode undangan. Misi di setiap pos dikerjakan bersama:
// bukti, misi khas, rancangan Dapur Juara, dan jawaban Papan Laporan milik regu; alasan/refleksi
// dan segel tetap milik masing-masing siswa (tanggung jawab individu). Anggota boleh bermain
// pada waktu berbeda: perubahan dikirim sebagai operasi kecil (set/push) agar tidak saling menimpa.
const TEAM_MAX = 4;
const TEAM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // tanpa 0/O, 1/I/L agar mudah didikte
const ACTIVE_MS = 24 * 3600 * 1000; // anggota dianggap aktif bila daring atau terlihat < 24 jam terakhir
const SHARED_KEYS = { analysis: ['variant', 'evidence', 'activity', 'challenges', 'started'], project: ['activity', 'initial', 'review', 'revision', 'reached', 'started'] };
const OP_KEYS = { analysis: ['variant', 'evidence', 'activity', 'started'], project: ['activity', 'initial', 'review', 'revision', 'reached', 'started'] };
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const missionOf = (id) => MISSIONS.find((m) => m.id === Number(id));
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const teamOf = (p) => (p && p.team && db.teams[p.team]) || null;
const sameTeam = (a, b) => Boolean(a && b && a.team && a.team === b.team && db.teams[a.team]);
const isActive = (id) => onlineIds().has(id) || (db.players[id] && Date.now() - Date.parse(db.players[id].lastSeen || 0) < ACTIVE_MS);
const freshTeamChallenge = () => ({ complete: false, attempts: 0, points: 0, response: null, log: [] });

function newTeamCode() {
  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i += 1) code += TEAM_ALPHABET[crypto.randomInt(TEAM_ALPHABET.length)];
    if (!db.teams[code]) return code;
  }
}

/** Kunci jawaban sesuai varian kasus regu. */
function teamDefs(m, t) {
  return challengesFor(m, { variant: Number.isInteger(t.variant) ? t.variant : undefined }, []);
}

function normalizeTeamPost(m, t) {
  if (m.type !== 'analysis') return t;
  const defs = teamDefs(m, t);
  t.challenges = defs.map((def, i) => {
    const c = Array.isArray(t.challenges) ? t.challenges[i] : null;
    if (!c || !c.complete || c.response === null || c.response === undefined) return freshTeamChallenge();
    const correct = isCorrect(def, c.response);
    return { ...c, complete: true, attempts: 1, correct, points: correct ? awardForAttempt(1) : 0 };
  });
  if (Array.isArray(t.evidence)) t.evidence = [...new Set(t.evidence.filter(Number.isInteger))].sort((a, b) => a - b);
  return t;
}

function extractShared(progress) {
  const out = {};
  const posts = (progress && progress.posts) || {};
  MISSIONS.forEach((m) => {
    const src = posts[m.id];
    if (!src || typeof src !== 'object') return;
    const dst = {};
    SHARED_KEYS[m.type].forEach((k) => { if (src[k] !== undefined && src[k] !== null) dst[k] = clone(src[k]); });
    out[m.id] = normalizeTeamPost(m, dst);
  });
  return out;
}

/** Gabung isi (bukan timpa): boolean OR, angka maksimum, larik digabung, teks milik regu dipertahankan. */
function fillMerge(a, b) {
  if (a === undefined || a === null) return clone(b);
  if (b === undefined || b === null) return a;
  if (Array.isArray(a) && Array.isArray(b)) { b.forEach((x) => { if (!a.some((y) => same(x, y))) a.push(clone(x)); }); return a; }
  if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    Object.keys(b).forEach((k) => { if (!BAD_KEYS.has(k)) a[k] = fillMerge(a[k], b[k]); });
    return a;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') return a || b;
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  return a;
}

/** Anggota baru membawa progresnya: isi yang belum dikerjakan regu diambil dari anggota itu. */
function mergeIntoTeam(team, progress) {
  const incoming = extractShared(progress);
  Object.entries(incoming).forEach(([pid, s]) => {
    const m = missionOf(pid);
    const t = team.posts[pid] || (team.posts[pid] = {});
    if (t.variant === undefined && s.variant !== undefined) t.variant = s.variant;
    if (s.started) t.started = true;
    if (Array.isArray(s.evidence)) t.evidence = [...new Set([...(t.evidence || []), ...s.evidence])];
    if (s.activity) t.activity = fillMerge(t.activity, s.activity);
    if (m.type === 'analysis' && Array.isArray(s.challenges) && (t.variant === s.variant || !m.variants)) {
      t.challenges = t.challenges || [];
      s.challenges.forEach((c, i) => { if (c && c.complete && !(t.challenges[i] && t.challenges[i].complete)) t.challenges[i] = c; });
    }
    if (m.type === 'project') {
      ['initial', 'review', 'revision'].forEach((k) => { if (s[k] && (!t[k] || (s[k].savedAt && !t[k].savedAt))) t[k] = s[k]; });
      if (Number.isFinite(s.reached)) t.reached = Math.max(t.reached || 0, s.reached);
    }
    normalizeTeamPost(m, t);
  });
}

/** Salin bagian milik regu ke progres seorang anggota (server berwenang atas bagian bersama). */
function overlayTeam(progress, team) {
  if (!progress || typeof progress !== 'object' || !team) return progress;
  progress.posts = progress.posts || {};
  Object.entries(team.posts).forEach(([pid, t]) => {
    const m = missionOf(pid);
    if (!m) return;
    const dst = progress.posts[pid] || (progress.posts[pid] = {});
    SHARED_KEYS[m.type].forEach((k) => { if (t[k] !== undefined) dst[k] = clone(t[k]); });
  });
  return progress;
}

function refreshMemberScores(team) {
  team.members.forEach((id) => {
    const p = db.players[id];
    if (!p || !p.progress) return;
    overlayTeam(p.progress, team);
    const { score, seals } = validateProgress(p.progress);
    if (score !== p.score || seals !== p.seals) boardDirty = true;
    p.score = score;
    p.seals = seals;
    if (seals === MISSIONS.length && !p.finishedAt) p.finishedAt = now();
  });
}

function teamLog(team, p, pos, text) {
  team.log = team.log || [];
  const entry = { at: now(), id: p.id, alias: p.alias, pos: Number(pos) || 0, text: cleanText(text, 100) };
  team.log.push(entry);
  if (team.log.length > 300) team.log.splice(0, team.log.length - 300);
  return entry;
}

/** Alasan Paspor (Pos analisis yang sudah disegel) untuk telaah sejawat di Ruang Arsip Pos 6. */
function reasonsOf(p) {
  const posts = (p.progress && p.progress.posts) || {};
  const out = {};
  MISSIONS.forEach((m) => {
    const t = posts[m.id];
    if (m.type === 'analysis' && t && t.sealed && typeof t.reason === 'string' && t.reason.trim()) out[m.id] = t.reason.trim().slice(0, 1200);
  });
  return out;
}

function teamView(team) {
  const online = onlineIds();
  return {
    code: team.code,
    leaderId: team.leaderId,
    max: TEAM_MAX,
    createdAt: team.createdAt,
    members: team.members.filter((id) => db.players[id]).map((id) => ({
      ...publicPlayer(db.players[id]),
      online: online.has(id),
      active: isActive(id),
      island: online.has(id) && db.players[id].zone === 'world' ? WORLD.islandAt(db.players[id].x, db.players[id].y) : null,
      contrib: (team.contrib && team.contrib[id]) || {},
      reasons: reasonsOf(db.players[id])
    })),
    posts: team.posts,
    log: (team.log || []).slice(-25)
  };
}

const teamTimers = new Map();
function teamChanged(code, immediate) {
  adminDirty = true;
  scheduleSave();
  const fire = () => {
    teamTimers.delete(code);
    const team = db.teams[code];
    if (!team) return;
    const view = teamView(team);
    team.members.forEach((id) => socketsOf(id).forEach((ws) => send(ws, { type: 'party', party: view })));
  };
  if (immediate) { clearTimeout(teamTimers.get(code)); return fire(); }
  if (!teamTimers.has(code)) teamTimers.set(code, setTimeout(fire, 150));
}

function sendNoTeam(playerId) { socketsOf(playerId).forEach((ws) => send(ws, { type: 'party', party: null })); }

function leaveTeam(playerId) {
  const p = db.players[playerId];
  const team = teamOf(p);
  if (p) p.team = null;
  if (team) {
    team.members = team.members.filter((id) => id !== playerId);
    if (!team.members.length) delete db.teams[team.code];
    else {
      if (team.leaderId === playerId) team.leaderId = team.members[0];
      if (p) teamLog(team, p, 0, 'keluar dari regu');
      teamChanged(team.code, true);
    }
  }
  sendNoTeam(playerId);
  adminDirty = true;
  scheduleSave();
}

function handleParty(ws, conn, msg) {
  const p = db.players[conn.playerId];
  if (!p) return;
  if (msg.action === 'create') {
    if (!teamOf(p)) {
      const code = newTeamCode();
      db.teams[code] = { code, leaderId: p.id, members: [p.id], createdAt: now(), posts: extractShared(p.progress), log: [], contrib: {} };
      p.team = code;
      teamLog(db.teams[code], p, 0, 'membentuk regu');
    }
    return teamChanged(p.team, true);
  }
  if (msg.action === 'join') {
    const code = String(msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    // Batasi tebakan kode: maksimal 8 kode salah per menit per koneksi.
    const t = Date.now();
    conn.partyFails = (conn.partyFails || []).filter((x) => t - x < 60000);
    if (conn.partyFails.length >= 8) return send(ws, { type: 'party-error', message: 'Terlalu banyak kode salah. Tunggu satu menit.' });
    const team = db.teams[code];
    if (!team) { conn.partyFails.push(t); return send(ws, { type: 'party-error', message: 'Kode regu tidak ditemukan. Periksa lagi hurufnya.' }); }
    if (team.members.includes(p.id)) return teamChanged(code, true);
    if (team.members.length >= TEAM_MAX) return send(ws, { type: 'party-error', message: `Regu sudah penuh (maksimal ${TEAM_MAX} orang).` });
    if (teamOf(p)) leaveTeam(p.id);
    team.members.push(p.id);
    p.team = code;
    mergeIntoTeam(team, p.progress);
    teamLog(team, p, 0, 'bergabung ke regu');
    refreshMemberScores(team);
    teamChanged(code, true);
    socketsOf(p.id).forEach((s) => send(s, { type: 'notice', message: `Kamu bergabung dengan regu ${code}. Bagi peran, lalu kerjakan misi bersama!` }));
    return;
  }
  if (msg.action === 'leave') return leaveTeam(p.id);
}

/** Operasi kecil dari anggota: { p: [pos, kunci, ...jalur], set } atau { p, push }. */
function applyTeamOps(team, ops) {
  let changed = 0;
  for (const op of ops.slice(0, 200)) {
    if (!op || !Array.isArray(op.p) || op.p.length < 2 || op.p.length > 10) continue;
    if (op.p.some((seg) => (typeof seg !== 'string' && !Number.isInteger(seg)) || BAD_KEYS.has(seg) || (typeof seg === 'string' && seg.length > 40))) continue;
    const m = missionOf(op.p[0]);
    if (!m || !OP_KEYS[m.type].includes(op.p[1])) continue;
    const hasPush = Object.prototype.hasOwnProperty.call(op, 'push');
    const value = hasPush ? op.push : op.set;
    if (value === undefined || JSON.stringify(value).length > 20000) continue;
    const t = team.posts[m.id] || (team.posts[m.id] = {});
    if (op.p[1] === 'variant') {
      if (t.variant === undefined && m.variants && Number.isInteger(value) && m.variants[value]) { t.variant = value; normalizeTeamPost(m, t); changed += 1; }
      continue;
    }
    if (op.p[1] === 'evidence' && !(hasPush ? Number.isInteger(value) : Array.isArray(value) && value.every(Number.isInteger))) continue;
    const rest = op.p.slice(1);
    let obj = t;
    let ok = true;
    for (let i = 0; i < rest.length - 1; i += 1) {
      const k = rest[i];
      if (Array.isArray(obj) && !Number.isInteger(k)) { ok = false; break; }
      if (obj[k] === null || typeof obj[k] !== 'object') obj[k] = Number.isInteger(rest[i + 1]) ? [] : {};
      obj = obj[k];
    }
    const last = rest[rest.length - 1];
    if (!ok || (Array.isArray(obj) && !Number.isInteger(last)) || (Number.isInteger(last) && (last < 0 || last > 500))) continue;
    if (hasPush) {
      if (!Array.isArray(obj[last])) obj[last] = [];
      if (obj[last].length < 500 && !obj[last].some((x) => same(x, value))) obj[last].push(clone(value));
    } else obj[last] = clone(value);
    changed += 1;
  }
  return changed;
}

function handleTeamOp(ws, conn, msg) {
  const p = db.players[conn.playerId];
  const team = teamOf(p);
  if (!team || !Array.isArray(msg.ops)) return;
  if (JSON.stringify(team.posts).length > 400000) return send(ws, { type: 'notice', message: 'Data regu sudah terlalu besar. Hubungi guru.' });
  const changed = applyTeamOps(team, msg.ops);
  if (!changed) return;
  const pos = Number(msg.pos) || Number(msg.ops[0] && msg.ops[0].p && msg.ops[0].p[0]) || 0;
  team.contrib = team.contrib || {};
  const mine = team.contrib[p.id] || (team.contrib[p.id] = {});
  if (msg.note) { mine[pos] = (mine[pos] || 0) + 1; teamLog(team, p, pos, msg.note); }
  teamChanged(team.code);
}

/** Jawaban regu: usulan anggota; terkunci bila ada 2 suara sama (atau 1 bila anggota lain tidak aktif). */
function handleTeamVote(ws, conn, msg) {
  const p = db.players[conn.playerId];
  const team = teamOf(p);
  const m = missionOf(msg.pos);
  if (!team || !m || m.type !== 'analysis') return;
  const t = team.posts[m.id] || (team.posts[m.id] = {});
  normalizeTeamPost(m, t);
  const index = Number(msg.index);
  const defs = teamDefs(m, t);
  const def = defs[index];
  if (!def || t.challenges[index].complete) return;
  const r = msg.response;
  const okShape = def.type === 'single' ? typeof r === 'string' && r.length <= 40
    : def.type === 'sort' ? r && typeof r === 'object' && !Array.isArray(r) && Object.keys(r).length <= 20
      : Array.isArray(r) && r.length && r.length <= 20 && r.every((x) => typeof x === 'string' && x.length <= 40);
  if (!okShape) return send(ws, { type: 'notice', message: 'Jawaban belum lengkap.' });
  t.votes = t.votes || {};
  const v = t.votes[index] || (t.votes[index] = {});
  v[p.id] = { alias: p.alias, response: clone(r), at: now() };
  const supporters = Object.entries(v).filter(([id, x]) => team.members.includes(id) && same(x.response, r));
  const others = team.members.filter((id) => id !== p.id && isActive(id));
  const need = others.length ? 2 : 1;
  team.contrib = team.contrib || {};
  const mine = team.contrib[p.id] || (team.contrib[p.id] = {});
  mine[m.id] = (mine[m.id] || 0) + 1;
  if (supporters.length >= need) {
    const correct = isCorrect(def, r);
    t.challenges[index] = { complete: true, attempts: 1, response: clone(r), correct, points: correct ? awardForAttempt(1) : 0, by: supporters.map(([, x]) => x.alias), at: now(), log: [] };
    delete t.votes[index];
    t.started = true;
    teamLog(team, p, m.id, `mengunci jawaban regu Tantangan ${index + 1} (${correct ? 'tepat' : 'belum tepat'})`);
    refreshMemberScores(team);
  } else {
    teamLog(team, p, m.id, `mengusulkan jawaban Tantangan ${index + 1} (${supporters.length}/${need} suara)`);
  }
  teamChanged(team.code, true);
}

function handleProgress(ws, conn, msg) {
  const p = db.players[conn.playerId];
  if (!p || !msg.state || typeof msg.state !== 'object' || !msg.state.posts) return;
  const state = msg.state;
  state.alias = p.alias;
  overlayTeam(state, teamOf(p));
  const { score, seals, flags } = validateProgress(state);
  p.progress = state;
  p.progressUpdatedAt = now();
  p.screen = cleanText(msg.screen, 20) || p.screen;
  p.activePos = ALL_POSTS.includes(Number(state.activePos)) ? Number(state.activePos) : p.activePos;
  if (score !== p.score || seals !== p.seals) boardDirty = true;
  p.score = score;
  p.seals = seals;
  if (seals === MISSIONS.length && !p.finishedAt) p.finishedAt = now();
  // Alasan Paspor baru (pos baru disegel) dikirim ke anggota regu untuk telaah sejawat di Ruang Arsip.
  const reasonSig = JSON.stringify(reasonsOf(p));
  if (reasonSig !== p.reasonSig) {
    p.reasonSig = reasonSig;
    const team = teamOf(p);
    if (team) teamChanged(team.code);
  }
  if (flags.length) {
    p.flags = [...flags.map((f) => `${now()} · ${f}`), ...(p.flags || [])].slice(0, 20);
    send(ws, { type: 'progress-sync', progress: state, message: 'Sebagian progres tidak sah menurut server dan telah dikoreksi.' });
  }
  positionsDirty = true; // seals/activePos ikut tampil di dunia
  adminDirty = true;
  scheduleSave();
}

function handleChat(ws, conn, msg) {
  const p = db.players[conn.playerId];
  if (!p) return;
  if (!db.settings.chatEnabled) return send(ws, { type: 'notice', message: 'Obrolan sedang dimatikan oleh guru.' });
  if (p.muted) return send(ws, { type: 'notice', message: 'Kamu sedang dibisukan oleh guru.' });
  const text = cleanText(msg.text, 200);
  if (!text) return;
  const t = Date.now();
  if (conn.lastChat && t - conn.lastChat < 1500) return send(ws, { type: 'notice', message: 'Tunggu sebentar sebelum mengirim pesan lagi.' });
  conn.lastChat = t;
  const entry = { id: newId(), from: p.alias, playerId: p.id, color: p.color, text, at: now() };
  db.chat.push(entry);
  if (db.chat.length > 200) db.chat.splice(0, db.chat.length - 200);
  broadcast({ type: 'chat', entry }, (c) => c.role === 'player' || c.role === 'admin');
  scheduleSave();
}

// ---------- Kendali admin ----------

const failedLogins = new Map(); // ip -> { count, until }

function handleAdminAuth(ws, conn, msg) {
  const rec = failedLogins.get(conn.ip) || { count: 0, until: 0 };
  if (rec.until > Date.now()) return send(ws, { type: 'admin-error', message: 'Terlalu banyak percobaan. Coba lagi dalam 30 detik.' });
  if (typeof msg.pin !== 'string' || !safeEqual(msg.pin, ADMIN_PIN)) {
    rec.count += 1;
    if (rec.count >= 5) { rec.until = Date.now() + 30000; rec.count = 0; }
    failedLogins.set(conn.ip, rec);
    return send(ws, { type: 'admin-error', message: 'PIN salah.' });
  }
  failedLogins.delete(conn.ip);
  conn.role = 'admin';
  send(ws, { type: 'admin-welcome', chat: db.chat.slice(-100) });
  send(ws, adminSnapshot());
}

function kickSockets(playerId, reason) {
  socketsOf(playerId).forEach((ws) => { send(ws, { type: 'kicked', message: reason }); ws.close(4003, 'kicked'); });
}

function handleAdmin(ws, msg) {
  const s = db.settings;
  const target = msg.playerId ? db.players[msg.playerId] : null;
  const needTarget = () => { if (!target) { send(ws, { type: 'admin-error', message: 'Pemain tidak ditemukan.' }); return false; } return true; };
  const done = (message) => send(ws, { type: 'admin-ok', message });

  switch (msg.action) {
    case 'set-paused': s.paused = Boolean(msg.value); settingsChanged(); return done(s.paused ? 'Permainan dijeda.' : 'Permainan dilanjutkan.');
    case 'set-chat': s.chatEnabled = Boolean(msg.value); settingsChanged(); return done(s.chatEnabled ? 'Obrolan dinyalakan.' : 'Obrolan dimatikan.');
    case 'set-movement': s.movementLocked = Boolean(msg.value); settingsChanged(); return done(s.movementLocked ? 'Gerak pemain dibekukan.' : 'Gerak pemain dibebaskan.');
    case 'set-post': {
      const pos = Number(msg.pos);
      if (!ALL_POSTS.includes(pos)) return;
      const set = new Set(s.openPosts);
      if (msg.open) set.add(pos); else set.delete(pos);
      s.openPosts = ALL_POSTS.filter((id) => set.has(id));
      settingsChanged();
      return done(`Pos ${pos} ${msg.open ? 'dibuka' : 'ditutup'}.`);
    }
    case 'set-posts': {
      const list = Array.isArray(msg.posts) ? msg.posts.map(Number) : [];
      s.openPosts = ALL_POSTS.filter((id) => list.includes(id));
      settingsChanged();
      return done('Akses pos diperbarui.');
    }
    case 'announce': {
      s.announcement = cleanText(msg.text, 280);
      settingsChanged();
      if (s.announcement) toPlayers({ type: 'announce', text: s.announcement, at: now() });
      return done(s.announcement ? 'Pengumuman dikirim.' : 'Pengumuman dihapus.');
    }
    case 'teleport': {
      const point = WORLD.clamp(Number(msg.x) || WORLD.spawn.x, Number(msg.y) || WORLD.spawn.y);
      const list = msg.playerId === 'all' ? [...onlineIds()].map((id) => db.players[id]) : target ? [target] : [];
      list.forEach((p, i) => {
        const offset = list.length > 1 ? { x: Math.cos(i * 2.4) * (12 + i * 3), y: Math.sin(i * 2.4) * (12 + i * 3) } : { x: 0, y: 0 };
        const c = WORLD.clamp(point.x + offset.x, point.y + offset.y);
        p.x = c.x; p.y = c.y;
        socketsOf(p.id).forEach((sock) => send(sock, { type: 'teleport', x: p.x, y: p.y }));
      });
      positionsDirty = true;
      adminDirty = true;
      return done(list.length > 1 ? `${list.length} pemain dipindahkan.` : list.length ? `${list[0].alias} dipindahkan.` : 'Tidak ada pemain daring.');
    }
    case 'mute':
      if (!needTarget()) return;
      target.muted = Boolean(msg.value);
      socketsOf(target.id).forEach((sock) => send(sock, { type: 'muted', value: target.muted }));
      adminDirty = true; scheduleSave();
      return done(`${target.alias} ${target.muted ? 'dibisukan' : 'boleh mengobrol lagi'}.`);
    case 'kick':
      if (!needTarget()) return;
      target.blocked = true;
      kickSockets(target.id, 'Kamu dikeluarkan dari sesi oleh guru.');
      adminDirty = true; boardDirty = true; scheduleSave();
      return done(`${target.alias} dikeluarkan.`);
    case 'unblock':
      if (!needTarget()) return;
      target.blocked = false;
      adminDirty = true; scheduleSave();
      return done(`${target.alias} boleh bergabung kembali.`);
    case 'reset-password': {
      if (!needTarget()) return;
      const pw = tempPassword();
      target.passHash = hashPassword(pw);
      target.sessions = [];
      kickSockets(target.id, 'Kata sandimu diatur ulang oleh guru. Masuk lagi dengan kata sandi baru.');
      target.blocked = false;
      adminDirty = true; scheduleSave();
      return send(ws, { type: 'admin-password', alias: target.alias, password: pw });
    }
    case 'set-class-code':
      s.classCode = cleanText(msg.code, 24);
      adminDirty = true; scheduleSave();
      return done(s.classCode ? `Kode kelas diatur: ${s.classCode}. Pendaftaran baru wajib memakai kode ini.` : 'Kode kelas dihapus. Pendaftaran terbuka.');
    case 'reset':
      if (!needTarget()) return;
      target.progress = null; target.progressUpdatedAt = null; target.score = 0; target.seals = 0; target.finishedAt = null; target.flags = [];
      socketsOf(target.id).forEach((sock) => send(sock, { type: 'reset', message: 'Guru mengatur ulang progresmu.' }));
      adminDirty = true; boardDirty = true; scheduleSave();
      return done(`Progres ${target.alias} diatur ulang.`);
    case 'delete':
      if (!needTarget()) return;
      kickSockets(target.id, 'Data penjelajahmu dihapus oleh guru.');
      leaveTeam(target.id);
      delete db.players[target.id];
      toPlayers({ type: 'player-leave', id: target.id });
      adminDirty = true; boardDirty = true; scheduleSave();
      return done(`${target.alias} dihapus dari data kelas.`);
    case 'message':
      if (!needTarget()) return;
      socketsOf(target.id).forEach((sock) => send(sock, { type: 'announce', text: cleanText(msg.text, 280), at: now(), private: true }));
      return done(`Pesan terkirim ke ${target.alias}.`);
    case 'clear-chat':
      db.chat = [];
      broadcast({ type: 'chat-cleared' }, (c) => c.role === 'player' || c.role === 'admin');
      scheduleSave();
      return done('Obrolan dibersihkan.');
    case 'delete-chat': {
      db.chat = db.chat.filter((e) => e.id !== msg.id);
      broadcast({ type: 'chat-deleted', id: msg.id }, (c) => c.role === 'player' || c.role === 'admin');
      scheduleSave();
      return done('Pesan dihapus.');
    }
    case 'detail':
      if (!needTarget()) return;
      return send(ws, { type: 'admin-detail', player: { ...adminPlayer(target, onlineIds()), progress: target.progress } });
    case 'team-dissolve': {
      const team = db.teams[String(msg.code || '')];
      if (!team) return send(ws, { type: 'admin-error', message: 'Regu tidak ditemukan.' });
      [...team.members].forEach((id) => leaveTeam(id));
      delete db.teams[team.code];
      adminDirty = true; scheduleSave();
      return done(`Regu ${team.code} dibubarkan. Progres anggota tetap tersimpan.`);
    }
    case 'export':
      return send(ws, { type: 'admin-export', data: { exportedAt: now(), game: 'NUTRANTARA', settings: db.settings, players: Object.values(db.players).map(({ tokenHash, aliasKey, passHash, sessions, ...rest }) => rest), teams: Object.values(db.teams), chat: db.chat } });
    default:
      return send(ws, { type: 'admin-error', message: 'Perintah tidak dikenal.' });
  }
}

// ---------- HTTP statis ----------

const STATIC = {
  '/': 'index.html', '/index.html': 'index.html', '/play': 'play.html', '/play.html': 'play.html', '/admin': 'admin.html', '/admin.html': 'admin.html',
  '/styles.css': 'styles.css', '/admin.css': 'admin.css', '/landing.css': 'landing.css',
  '/missions.js': 'missions.js', '/world-data.js': 'world-data.js', '/net.js': 'net.js', '/team.js': 'team.js', '/game.js': 'game.js', '/world.js': 'world.js', '/admin.js': 'admin.js',
  '/characters.js': 'characters.js', '/world3d.js': 'world3d.js', '/landing.js': 'landing.js', '/peta3d.js': 'peta3d.js',
  '/app.js': 'app.js', '/app.css': 'app.css', '/quest.js': 'quest.js', '/fx.js': 'fx.js', '/culture.js': 'culture.js', '/lab.js': 'lab.js', '/absorb.js': 'absorb.js', '/causal.js': 'causal.js', '/claims.js': 'claims.js', '/archive.js': 'archive.js', '/theme.css': 'theme.css',
  '/map-art.js': 'map-art.js', '/sky.js': 'sky.js', '/region.js': 'region.js', '/assets/peta-nusantara.webp': 'assets/peta-nusantara.webp', '/assets/peta-nusantara-960.webp': 'assets/peta-nusantara-960.webp',
  '/vendor/three/three.module.min.js': 'vendor/three/three.module.min.js'
};
const IMMUTABLE = new Set(['vendor/three/three.module.min.js']);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp' };
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'"
};

const authAttempts = new Map(); // ip -> { count, reset }
function authLimited(ip) {
  const t = Date.now();
  const rec = authAttempts.get(ip) || { count: 0, reset: t + 60000 };
  if (t > rec.reset) { rec.count = 0; rec.reset = t + 60000; }
  rec.count += 1;
  authAttempts.set(ip, rec);
  return rec.count > 12;
}

function clientIp(req) {
  return TRUST_PROXY && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress;
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 4096) { req.destroy(); resolve(null); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

const bearer = (req) => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

async function handleApi(req, res, url) {
  const route = url.pathname;
  if (route === '/api/status' && req.method === 'GET') {
    return json(res, 200, { ok: true, needsClassCode: Boolean(db.settings.classCode), online: onlineIds().size });
  }
  if (route === '/api/me' && req.method === 'GET') {
    const p = playerBySession(bearer(req));
    return p ? json(res, 200, { user: accountView(p) }) : json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Metode tidak didukung.' });
  if (!String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { error: 'Format harus JSON.' });

  if (route === '/api/logout') {
    const token = bearer(req);
    const p = playerBySession(token);
    if (p) { const h = sha256(token); p.sessions = p.sessions.filter((x) => x.hash !== h); scheduleSave(); }
    return json(res, 200, { ok: true });
  }

  if (route !== '/api/register' && route !== '/api/login') return json(res, 404, { error: 'Tidak ditemukan.' });
  if (authLimited(clientIp(req))) return json(res, 429, { error: 'Terlalu banyak percobaan. Tunggu satu menit.' });
  const body = await readJson(req);
  if (!body) return json(res, 400, { error: 'Data tidak valid.' });
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const key = username.toLocaleLowerCase('id');

  if (route === '/api/register') {
    if (!USERNAME_RE.test(username)) return json(res, 400, { error: 'Nama pengguna 3–20 karakter: huruf, angka, titik, garis bawah, atau tanda hubung. Jangan pakai nama lengkap.' });
    if (password.length < 6 || password.length > 72) return json(res, 400, { error: 'Kata sandi minimal 6 karakter.' });
    if (db.settings.classCode && String(body.classCode || '').trim().toLocaleLowerCase('id') !== db.settings.classCode.toLocaleLowerCase('id')) return json(res, 403, { error: 'Kode kelas salah. Tanyakan kepada guru.' });
    if (Object.values(db.players).some((p) => p.aliasKey === key)) return json(res, 409, { error: 'Nama pengguna sudah dipakai. Pilih nama lain.' });
    if (Object.keys(db.players).length >= MAX_PLAYERS) return json(res, 403, { error: 'Kelas sudah penuh. Hubungi guru.' });
    const color = PLAYER_COLORS.includes(body.color) ? body.color : PLAYER_COLORS[crypto.randomInt(PLAYER_COLORS.length)];
    const player = {
      id: newId(), alias: username, aliasKey: key, passHash: hashPassword(password), sessions: [], color,
      x: WORLD.spawn.x, y: WORLD.spawn.y, zone: 'lobby',
      createdAt: now(), lastSeen: now(), progress: null, progressUpdatedAt: null, score: 0, seals: 0, flags: [], muted: false, blocked: false
    };
    db.players[player.id] = player;
    const token = issueSession(player);
    adminDirty = true;
    scheduleSave();
    return json(res, 201, { token, user: accountView(player) });
  }

  const player = Object.values(db.players).find((p) => p.aliasKey === key);
  if (!player || !player.passHash || !checkPassword(password, player.passHash)) {
    return json(res, 401, { error: player && !player.passHash ? 'Akun ini belum punya kata sandi. Minta guru mengatur ulang kata sandi.' : 'Nama pengguna atau kata sandi salah.' });
  }
  if (player.blocked) return json(res, 403, { error: 'Akun ini sedang dikeluarkan oleh guru.' });
  const token = issueSession(player);
  scheduleSave();
  return json(res, 200, { token, user: accountView(player) });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((err) => { console.error('[api]', err); json(res, 500, { error: 'Kesalahan server.' }); });
    return;
  }
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
    return res.end(JSON.stringify({ ok: true, players: onlineIds().size }));
  }
  const file = STATIC[url.pathname];
  if (!file || req.method !== 'GET') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    return res.end('Tidak ditemukan');
  }
  fs.readFile(path.join(ROOT, file), (err, data) => {
    if (err) { res.writeHead(500, SECURITY_HEADERS); return res.end('Gagal membaca berkas'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)], 'Cache-Control': IMMUTABLE.has(file) ? 'public, max-age=604800' : 'no-cache', ...SECURITY_HEADERS });
    res.end(data);
  });
});

// ---------- WebSocket ----------

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });

wss.on('connection', (ws, req) => {
  const conn = { role: null, playerId: null, ip: clientIp(req), alive: true, budget: 40 };
  conns.set(ws, conn);
  ws.on('pong', () => { conn.alive = true; });

  ws.on('message', (raw) => {
    // Pembatas laju sederhana: maksimal ~40 pesan per detik.
    if (--conn.budget < 0) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'join') return handleJoin(ws, conn, msg);
    if (msg.type === 'admin-auth') return handleAdminAuth(ws, conn, msg);
    if (conn.role === 'player') {
      if (msg.type === 'move') return handleMove(conn, msg);
      if (msg.type === 'progress') return handleProgress(ws, conn, msg);
      if (msg.type === 'chat') return handleChat(ws, conn, msg);
      if (msg.type === 'zone') return handleZone(conn, msg);
      if (msg.type === 'spawn') return handleSpawn(ws, conn, msg);
      if (msg.type === 'emote') return handleEmote(conn, msg);
      if (msg.type === 'party') return handleParty(ws, conn, msg);
      if (msg.type === 'team-op') return handleTeamOp(ws, conn, msg);
      if (msg.type === 'team-vote') return handleTeamVote(ws, conn, msg);
      if (msg.type === 'ping') return send(ws, { type: 'pong' });
    }
    if (conn.role === 'admin') {
      if (msg.type === 'admin') return handleAdmin(ws, msg);
      if (msg.type === 'admin-refresh') return send(ws, adminSnapshot());
    }
  });

  ws.on('close', () => {
    conns.delete(ws);
    if (conn.role === 'player' && conn.playerId) {
      const p = db.players[conn.playerId];
      if (p) p.lastSeen = now();
      if (!onlineIds().has(conn.playerId)) { toPlayers({ type: 'player-leave', id: conn.playerId }); if (p && teamOf(p)) teamChanged(p.team); }
      adminDirty = true;
      boardDirty = true;
      scheduleSave();
    }
  });
});

// Siaran posisi 10×/detik, ringkasan admin 1×/detik, heartbeat 30 detik.
setInterval(() => {
  for (const c of conns.values()) c.budget = Math.min(40, c.budget + 4);
  if (!positionsDirty) return;
  positionsDirty = false;
  const online = onlineIds();
  const list = [...online].map((id) => db.players[id]).filter(Boolean).map((p) => [p.id, Math.round(p.x), Math.round(p.y), p.seals, p.activePos || 0, p.h || 0, p.zone === 'world' ? 1 : 0]);
  toPlayers({ type: 'positions', list });
  toAdmins({ type: 'positions', list });
}, 100);

setInterval(() => {
  if (boardDirty) { boardDirty = false; toPlayers({ type: 'leaderboard', leaderboard: leaderboard() }); adminDirty = true; }
  if (adminDirty) { adminDirty = false; toAdmins(adminSnapshot()); }
}, 1000);

setInterval(() => {
  for (const [ws, c] of conns) {
    if (!c.alive) { ws.terminate(); continue; }
    c.alive = false;
    ws.ping();
  }
}, 30000);

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
}

server.listen(PORT, () => {
  console.log('\n  NUTRANTARA — server kelas aktif');
  console.log(`  Beranda : http://localhost:${PORT}`);
  console.log(`  Pemain  : http://localhost:${PORT}/play`);
  lanAddresses().forEach((ip) => console.log(`            http://${ip}:${PORT}/play   (bagikan ke siswa di jaringan yang sama)`));
  console.log(`  Admin   : http://localhost:${PORT}/admin`);
  console.log(`  PIN     : ${PRODUCTION ? '(dari NUTRANTARA_ADMIN_PIN, tidak ditampilkan)' : ADMIN_PIN}${PRODUCTION ? '' : process.env.NUTRANTARA_ADMIN_PIN ? ' (dari NUTRANTARA_ADMIN_PIN)' : ' (acak — atur NUTRANTARA_ADMIN_PIN agar tetap)'}`);
  console.log(`  Data    : ${DATA_FILE}\n`);
});

function shutdown() {
  flushDb();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { server, validateProgress };
