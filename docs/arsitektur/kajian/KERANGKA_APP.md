# Kerangka Aplikasi NUTRANTARA

*Disusun 23 November 2026 dari kode nyata di `D:\nutrantara` (versi paket 0.9.0, fitur regu 1.0, `APP_VERSION` 1.0 di `game.js`). Sumber yang dibaca: `server.js`, `net.js`, `app.js`, `game.js`, `team.js`, `quest.js`, `world3d.js`, `world-data.js`, `missions.js`, modul pos (`lab.js`, `absorb.js`, `causal.js`, `claims.js`, `archive.js`), `region.js`, `landing.js`, `splash.js`, `admin.js`, ketiga berkas HTML, `Dockerfile`, `render.yaml`, `test/smoke.js`, `CLAUDE.md`, `MEMORY.md`, dan `docs/arsitektur/kajian/ARSITEKTUR_SERVER.md` / `docs/arsitektur/kajian/ARSITEKTUR_DATABASE.md`.*

Dokumen ini menjelaskan **kerangka** aplikasi: lapisan, susunan folder, alur startup, state, konfigurasi, log, penanganan error, dan cara menambah pos baru. Rincian server (fase integritas, jaringan, multi-kelas) ada di `ARSITEKTUR_SERVER.md`; skema data ada di `ARSITEKTUR_DATABASE.md`. Dokumen ini tidak mengulanginya.

---

## Rekomendasi tegas (ringkasan)

1. **Tetap tanpa build, tanpa framework, tanpa bundler.** Skrip klasik + ES module, Three.js vendored, CSP `script-src 'self'`. Ini yang membuat game jalan di LAN sekolah, dari `file://`, dan di hosting statis. Jangan pindah ke Vite/React/Phaser.
2. **Pecah `server.js` menjadi modul di `server/`** (konfigurasi, log, penyimpanan, akun, progres, regu, admin, HTTP, WebSocket), dengan `server.js` tetap sebagai titik masuk tipis. Ini langkah pertama karena tidak menyentuh klien dan sudah dijaga `npm test`.
3. **Bungkus setiap handler WebSocket dan setiap timer dengan `try/catch`.** Saat ini satu pengecualian di handler mana pun mematikan proses untuk seluruh kelas. Ini perubahan paling kecil dengan dampak paling besar di dokumen ini.
4. **Pindahkan semua berkas publik ke `public/` dan layani foldernya**, menggantikan daftar `STATIC` yang ditulis tangan. Lupa menambah berkas ke `STATIC` adalah penyebab 404 yang sudah diperingatkan di `CLAUDE.md`.
5. **Buat registri pos** (`public/posts/index.js`) agar pos baru cukup menambah satu modul dan satu entri data, bukan menyunting `quest.js`, `team.js`, `world-data.js`, `region.js`, dan `archive.js` satu per satu.
6. **Pisahkan nomor pos dari id pulau.** Sekarang Pos k = pulau k, sementara id 7–12 sudah dipakai pulau jelajah dan `allowedIslands` mengulang `1..6`. Pos ke-7 tidak bisa ditambahkan tanpa perubahan ini.

---

## 1. Lapisan

```
┌───────────────────────────── KLIEN (peramban) ─────────────────────────────┐
│ Halaman      index.html + landing.js + splash.js + peta3d.js   (beranda)    │
│              play.html  + app.js                               (game)       │
│              admin.html + admin.js                             (panel guru) │
│ Presentasi   world3d.js (Three.js) · world.js (2D cadangan) · map-art.js    │
│              region.js · sky.js · fx.js · characters.js · culture.js        │
│ Aktivitas    quest.js (objek misi) + modul pos: lab, absorb, causal,        │
│              claims, archive                                                │
│ Logika game  game.js (state, skor, layar DOM) · team.js (peran & gerbang)   │
├──────────────────────────── JARINGAN ──────────────────────────────────────┤
│ net.js: HTTP /api/* (akun) + WebSocket /ws (dunia, progres, regu, chat)     │
│ Bus peristiwa net.on(event, fn); luring = satu pemain + localStorage        │
├──────────────────────────── SERVER (Node.js) ──────────────────────────────┤
│ server.js: HTTP statis + CSP · API akun · WS dispatcher · validasi progres  │
│ regu (team-op/team-vote) · kendali guru · siaran posisi 10×/detik            │
├──────────────────────────── DATA ──────────────────────────────────────────┤
│ Bersama klien+server: missions.js (konten + kunci), world-data.js (geometri)│
│ Server: data/classroom.json (+ data/backup/, rotasi 48 berkas)              │
│ Klien:  localStorage nutrantara-* (save per akun, sesi, kamera, grafis)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Klien

| Sub-lapisan | Berkas | Bentuk | Aturan |
| :-- | :-- | :-- | :-- |
| Data bersama | `missions.js`, `world-data.js` | Skrip klasik, hanya menulis `window.*` | Tanpa `import`/`export`, tanpa DOM: server memuatnya lewat `vm` |
| Inti | `net.js` → `window.NutraNet`, `team.js` → `window.NutraTeam`, `game.js` → `window.NutraGame` | Skrip klasik `defer`, IIFE | Urutan di `play.html` wajib: missions → world-data → net → team → game → world → map-art |
| Dunia | `world3d.js` → `window.NutraWorld3D`, `world.js` → `window.NutraWorld2D` | Module (3D), klasik (2D) | 3D mengimpor `quest.js`, `region.js`, `sky.js`, `fx.js`, `characters.js`, `culture.js` |
| Aktivitas pos | `quest.js` + `lab.js` (Pos 2), `absorb.js` (3), `causal.js` (4), `claims.js` (5), `archive.js` (6) | ES module, `createX({ game, openPanel, closePanel, shake, say, nara, onDone })` | Menulis state hanya lewat `game.updateActivity(id, fn, note)` |
| Alur aplikasi | `app.js` | ES module | Fase `auth → loading → lobby → game`, mode tamu luring |

**Batas yang harus dijaga:** modul di lapisan presentasi dan aktivitas tidak boleh memanggil `NutraNet` untuk menulis progres. Semua penulisan progres melewati `game.js` (`saveState`), yang kemudian mengirim ke server. Pengecualian yang sudah ada dan sah: `app.js` untuk akun/regu/spawn, dan `archive.js`/`team.js` yang *membaca* `net.party`.

### 1.2 Jaringan

`net.js` adalah satu-satunya tempat yang membuka `fetch('/api/...')` dan `WebSocket('/ws')` di halaman pemain (panel guru punya sambungan sendiri di `admin.js`). Ia:

- mendeteksi `canConnect` dari `location.protocol`; di `file://` tidak pernah mencoba;
- menyambung ulang dengan *backoff* `800 ms × 2^n` (maks. 10 detik), dan **berhenti setelah 3 kali gagal bila belum pernah tersambung** (game lanjut luring);
- menahan progres dengan *debounce* 600 ms (`pushProgress` → `flushProgress`), mengirim seluruh state;
- menerjemahkan pesan server menjadi peristiwa `welcome`, `status`, `settings`, `players`, `positions`, `progress-sync`, `reset`, `party`, `chat`, `notice`, dst. Pendengar dipanggil di dalam `try/catch`, jadi satu pendengar yang galat tidak mematikan pendengar lain.

Protokol WebSocket (`type`) dan API HTTP sudah dicatat di `CLAUDE.md`; jangan duplikasi daftarnya di tempat lain. **Rekomendasi:** tambahkan `server/protocol.md` *atau* blok komentar di atas dispatcher yang menjadi satu-satunya daftar pesan, dan perbarui bersama `test/smoke.js`.

### 1.3 Server

Satu proses Node.js (`server.js`, ±1.330 baris, dependensi runtime hanya `ws`). Server berwenang atas: posisi dan pulau yang boleh dipijak, skor (dihitung ulang dari kunci), segel, kunci jawaban pertama (`lockAnswers`), data bersama regu, dan voting regu. Klien berwenang atas tampilan dan aktivitas formatif.

### 1.4 Data

| Data | Pemilik | Tempat | Catatan |
| :-- | :-- | :-- | :-- |
| Konten misi + kunci jawaban + varian + peran regu | Repo | `missions.js` (`NUTRANTARA_MISSIONS`, `NUTRANTARA_TEAM`) | Jangan ubah benih/daftar generator varian |
| Geometri dunia | Repo | `world-data.js` | Dipakai 2D, 3D, panel guru, dan server |
| Progres, akun, regu, chat, pengaturan | Server | `data/classroom.json` | Tulis atomik, cadangan bergulir, pemulihan bila rusak |
| Progres luring, sesi, preferensi | Klien | `localStorage` | Lihat daftar kunci di bagian 4.3 |

---

## 2. Pohon folder target

### 2.1 Masalah susunan sekarang

- 25 berkas `.js` dan 5 `.css` bercampur di akar bersama `server.js`, `Dockerfile`, dokumen desain, dan `MEMORY.md`.
- Daftar `STATIC` di `server.js` harus disunting manual untuk setiap berkas baru.
- Empat klon plugin (`anthropic-skills/`, `blender-skills/`, `ponytail/`, `ui-ux-pro-max-skill/`, masing-masing dengan `.git` sendiri) ada di dalam folder proyek. Mereka sudah dikecualikan di `.dockerignore`, tetapi membuat pencarian, CI, dan cadangan lebih berat.
- Helper yang sama (`esc`, `pad`, `shuffle`, `reduced`, `starText`, `starsFor`, `nowIso`) disalin di `causal.js`, `claims.js`, `archive.js`, `quest.js`, `team.js`, `admin.js`, `app.js`. `archive.js` mengimpor `miniScene` dari `claims.js`, padahal itu bukan bagian dari Pos 5.

### 2.2 Susunan target

```
nutrantara/
├─ server.js                 # titik masuk tipis: require('./server/main').start()
├─ server/
│  ├─ main.js                # rakit modul, listen, sinyal berhenti
│  ├─ config.js              # baca & validasi semua env (bagian 5)
│  ├─ log.js                 # logger kecil bertingkat (bagian 6)
│  ├─ shared.js              # loadBrowserScript: muat public/shared/*.js lewat vm
│  ├─ store.js               # freshDb, loadDb, flushDb, backupDb, checkStorage
│  ├─ accounts.js            # scrypt, sesi, /api/register|login|logout|me
│  ├─ progress.js            # isCorrect, challengesFor, validateProgress, lockAnswers
│  ├─ teams.js               # party, team-op, team-vote, overlayTeam
│  ├─ admin.js               # admin-auth + sub-perintah guru
│  ├─ world.js               # join, move, zone, spawn, emote, siaran posisi
│  ├─ http.js                # statis dari public/, header keamanan, /health, /api
│  └─ ws.js                  # dispatcher pesan + pembatas laju + heartbeat
├─ public/                   # SEMUA yang boleh diunduh peramban, dan hanya itu
│  ├─ index.html  play.html  admin.html
│  ├─ css/        styles.css app.css landing.css admin.css theme.css
│  ├─ shared/     missions.js world-data.js        # klasik, window.*, dimuat juga oleh server
│  ├─ core/       net.js team.js game.js           # klasik (tetap IIFE)
│  ├─ app/        app.js landing.js splash.js admin.js
│  ├─ world/      world3d.js world2d.js map-art.js region.js sky.js fx.js
│  │              characters.js culture.js peta3d.js quest.js
│  ├─ posts/      index.js (registri)  pos2-lab.js  pos3-absorb.js  pos4-causal.js
│  │              pos5-claims.js  pos6-archive.js
│  ├─ lib/        util.js (esc, pad, shuffle, reduced, nowIso, stars)  mini-scene.js
│  ├─ assets/     *.webp
│  └─ vendor/three/three.module.min.js
├─ test/smoke.js
├─ docs/                     # dokumen teknis (ARSITEKTUR_*, DEPLOY, KARAKTER, KERANGKA_APP)
├─ desain/                   # Desain_Game_*.md, Paket_Persiapan_*.md, KONSEP_*.md
├─ data/                     # gitignored: classroom.json, backup/
├─ CLAUDE.md  MEMORY.md  README.md
├─ package.json  package-lock.json  Dockerfile  .dockerignore  render.yaml
└─ .github/workflows/
```

Klon plugin dipindah **ke luar** `D:\nutrantara` (misalnya `D:\alat-claude\`).

### 2.3 Keputusan di balik susunan ini

- **`public/` dilayani sebagai folder, dengan pengaman.** `server/http.js` memetakan URL ke `public/` hanya bila: metode `GET`/`HEAD`, ekstensi ada di `TYPES` (`.html .css .js .webp`, tambah `.png .svg .woff2` bila perlu), dan `path.resolve` hasilnya masih di dalam `public/` (tolak `..`). Alias `/play` → `play.html` dan `/admin` → `admin.html` tetap. Karena kode server, `data/`, dan dokumen tidak berada di `public/`, keamanan daftar putih tetap terjaga tanpa harus menyunting daftar.
- **`shared/` tetap skrip klasik.** Server dan `test/smoke.js` memuatnya lewat `vm` dengan `window` palsu; ini kontrak yang tidak boleh dilanggar.
- **`core/` tetap klasik, tidak diubah ke module.** Manfaatnya kecil (globals sudah rapi lewat `window.Nutra*`), risikonya besar (urutan muat, admin, mode 2D tanpa WebGL). Tinjau lagi hanya bila `game.js` dipecah.
- **Path relatif tidak rusak.** Bila semua berkas klien pindah bersama ke `public/`, impor seperti `'./vendor/three/three.module.min.js'` cukup disesuaikan per subfolder (`'../vendor/three/...'`). Tidak perlu import map.
- **`Dockerfile` tidak perlu berubah** selain `.dockerignore` (tambah `desain`); `COPY . .` tetap benar.

### 2.4 Urutan migrasi

Setiap langkah satu commit, `npm test` dan `node --check` hijau sebelum lanjut.

1. **`server/` dipecah** tanpa mengubah perilaku. `server.js` menjadi pemanggil `server/main.js`. `module.exports = { server, validateProgress }` dipertahankan.
2. **`try/catch` di dispatcher dan timer** (bagian 7) + `server/log.js`.
3. **`public/lib/util.js`** dan `mini-scene.js`; modul pos mengimpor dari sana.
4. **Registri pos** (bagian 8), `quest.js` memakai registri.
5. **Pindah ke `public/`** dalam satu commit: semua berkas klien, `loadBrowserScript` dan `test/smoke.js` menunjuk `public/shared/`, `STATIC` diganti layanan folder, CI tetap memeriksa sintaks `public/**/*.js`.
6. **Pindah dokumen desain** ke `desain/` dan klon plugin keluar dari proyek. Perbarui rujukan di `CLAUDE.md`.

Langkah 5 adalah satu-satunya yang menyentuh banyak berkas sekaligus. Kerjakan di luar jam pelajaran karena deploy Render dengan disk ada jeda beberapa detik.

---

## 3. Alur startup

### 3.1 Server

```
node server.js
 1. Baca env → PORT, DATA_DIR, PRODUCTION, TRUST_PROXY, MAX_PLAYERS, BACKUP_KEEP
 2. Produksi tanpa NUTRANTARA_ADMIN_PIN sah (6–64, tanpa spasi) → console.error + exit(1)
 3. loadBrowserScript('missions.js'), ('world-data.js') lewat vm  → MISSIONS, WORLD
 4. loadDb(): baca classroom.json
      ENOENT → data kosong
      rusak  → ganti nama ke classroom.corrupt-<waktu>.json, pulihkan dari cadangan terbaru
               yang bisa di-parse, atau mulai kosong; dataRecovery = 'backup' | 'empty'
 5. checkStorage(): tulis-hapus berkas uji di DATA_DIR → storageOk
 6. setInterval backupDb tiap 30 menit (unref)
 7. http.createServer + WebSocketServer({ path: '/ws', maxPayload: 256 KB })
 8. Timer: posisi 100 ms, papan skor/ringkasan guru 1 detik, heartbeat 30 detik
 9. listen(PORT) → cetak URL beranda, /play, alamat LAN, /admin, PIN (disembunyikan di produksi),
    lokasi data, status cadangan/pemulihan
10. SIGINT/SIGTERM → flushDb + backupDb + exit(0)
```

**Rekomendasi:** pindahkan langkah 1–2 ke `server/config.js` dan validasi **semua** nilai di sana sekali (bagian 5). Tambahkan langkah 3a: periksa bentuk `MISSIONS` (setiap pos punya `id`, `type`, dan untuk `analysis` ada `challenges`; id urut 1..n) dan hentikan server dengan pesan jelas bila salah. Kesalahan konten sekarang baru ketahuan saat siswa menjawab.

### 3.2 Klien: halaman game (`play.html`)

```
HTML dibaca → CSS (styles → app → theme)
Skrip defer berurutan:
  missions.js → world-data.js → net.js → team.js → game.js → world.js → map-art.js
Module (setelah defer): world3d.js → app.js
app.js boot():
  1. net.serverStatus()  (GET /api/status)
     gagal → mode tamu: sembunyikan form akun, pakai localStorage nutrantara-guest-v1,
             bila ada tamu tersimpan langsung enter(guest, null)
  2. berhasil → tampilkan kode kelas bila needsClassCode
  3. net.resume() (GET /api/me dengan token tersimpan)
       200 → enter(akun, token)
       401 → hapus sesi, tampilkan form masuk
       0   → server hilang di tengah jalan: { offline: true }
  4. ?mode=daftar → tab daftar
enter(akun, token):
  0,08  game.begin(username)  → loadState() dari localStorage, saveState()
  0,20  net.join(token), tunggu 'welcome' atau 'join-error' maks. 6 detik
          auth    → logout, kembali ke form
          blocked → kembali ke form dengan pesan guru
          timeout → toast, lanjut (net terus mencoba di latar)
  0,35–0,85  W3.prepare(progress)  (bangun dunia 3D bertahap)
  1,00  minimal 1,8 detik layar muat → toLobby()
Lobi → MAIN → toMaps() → W3.showOverview → dropTo(id):
  daring: net.spawn(id), tunggu 'spawned'/'spawn-denied' maks. 4 detik
  luring: cek W.allowedIslands secara lokal
  W3.dropTo gagal (tanpa WebGL) → NutraWorld2D.placeAt + start
```

### 3.3 Klien: beranda dan panel guru

- **Beranda:** `splash.js` dimuat sinkron tepat setelah markup agar layar muat tampil sebelum module berat. `landing.js` membangun adegan pahlawan dan peta 3D (`peta3d.js`) di dalam `try/catch`; bila gagal, SVG cadangan tetap dipakai. Kunjungan kedua di sesi yang sama menutup layar muat otomatis (`sessionStorage nutrantara-splash`).
- **Panel guru:** `admin.js` membuka `/ws`, mengirim `admin-auth` dengan PIN dari `sessionStorage` (tidak pernah `localStorage`), lalu menerima `admin-state` 1×/detik dan `positions` 10×/detik.

### 3.4 Aturan startup yang harus dipertahankan

- Game **harus** bisa mulai tanpa server, tanpa WebGL, dan dari `file://`.
- Tidak ada sumber eksternal yang menghalangi startup (font Google boleh gagal tanpa merusak tata letak).
- Layar muat tidak boleh menunggu server lebih dari 6 detik.

---

## 4. State management

### 4.1 Peta state sekarang

| State | Pemilik | Bentuk | Persistensi |
| :-- | :-- | :-- | :-- |
| Progres siswa | `game.js` (`state`, ditutup dalam IIFE, dibaca lewat `NutraGame.state`) | `{ schemaVersion: 2, appVersion, alias, currentScreen, activePos, posts: {1..6}, updatedAt }` | `localStorage nutrantara-save-v2:<user>` + server `players[id].progress` |
| Bagian regu per pos | Server (`db.teams[kode].posts`) | `SHARED_KEYS` = `TEAM_KEYS` | Server; klien hanya mengirim `team-op` |
| Koneksi, pemain lain, regu, pengaturan guru, chat, papan skor | `net.js` | variabel modul + getter | Hanya memori (sesi di `localStorage`) |
| Dunia 3D: kamera, grafis, posisi | `world3d.js` | variabel modul | `nutrantara-cam`, `nutrantara-gfx`, `nutrantara-pulau-v1…` |
| Fase aplikasi | `app.js` | `document.body.dataset.phase` | Tidak |
| Data kelas | `server.js` (`db`) | satu objek | `classroom.json` |

### 4.2 Aturan alir data (wajib)

1. **Satu jalur tulis progres.** Modul mengubah progres hanya lewat fungsi `NutraGame` (`updateActivity(id, mutator, note)`, `submitAnswer`, `sealPost`, `scanEvidence`, …). Fungsi itu berakhir di `saveState()`, yang: menerapkan varian (`applyVariants`), menjadwalkan diff regu (`scheduleTeamPush`), mengirim progres (`net.pushProgress`), menyimpan ke `localStorage`, lalu memancarkan `document` event `nutra:state`.
2. **Tampilan bereaksi ke `nutra:state`**, bukan memanggil render satu sama lain. `quest.js` (`refresh`) dan HUD sudah memakai pola ini; modul baru wajib ikut.
3. **Server menang.** Setelah `progress`, server bisa membalas `progress-sync`; klien mengganti state seluruhnya (`adoptProgress`). Saat `welcome`, yang lebih baru (`updatedAt`) dipakai. Jangan menambah logika "gabung pintar" di klien.
4. **Bagian regu tidak pernah dikirim utuh.** `game.js` menghitung diff terhadap salinan server terakhir dan mengirim operasi `{p, set}` / `{p, push}`. `challenges` hanya berubah lewat `team-vote`.
5. **Ubah bentuk state = naikkan `SCHEMA_VERSION`.** Simpanan lama dibuang bila versinya beda. Karena progres juga ada di server, **rekomendasi:** ganti "buang" dengan fungsi `migrate(saved)` bertahap (v2 → v3 → …) di `game.js` dan pasangannya di `server/progress.js`, agar menaikkan versi tidak menghapus progres kelas yang sedang berjalan.

### 4.3 Daftar kunci penyimpanan klien

Semua kunci berawalan `nutrantara-`. Kunci baru wajib mengikuti pola `nutrantara-<nama>-v<n>` dan dicatat di sini.

| Kunci | Tempat | Berkas |
| :-- | :-- | :-- |
| `nutrantara-save-v2:<user>` | localStorage | `game.js` |
| `nutrantara-leaderboard-v1` | localStorage | `game.js` (papan skor luring) |
| `nutrantara-session-v1` | localStorage | `net.js` |
| `nutrantara-guest-v1` | localStorage | `app.js` |
| `nutrantara-shards-v1…` | localStorage | `app.js` (indeks keping arsip; tambah hanya di akhir daftar) |
| `nutrantara-world-pos-v3` | localStorage | `world.js` |
| `nutrantara-pulau-v1…` | localStorage | `world3d.js` |
| `nutrantara-cam`, `nutrantara-gfx`, `nutrantara-tip-kamera` | localStorage | `world3d.js` (belum berversi, boleh karena hanya preferensi) |
| `nutrantara-splash` | sessionStorage | `splash.js` |
| `nutrantara-admin-pin` | sessionStorage | `admin.js` |

**Rekomendasi:** pusatkan akses di `public/lib/store.js` (`get(key, fallback)`, `set(key, value)` dengan `try/catch` dan prefiks otomatis). Sekarang setiap berkas menulis `try { localStorage… } catch {}` sendiri.

### 4.4 Yang tidak direkomendasikan

Redux, signals, atau store reaktif lain. State sudah punya satu pemilik per jenis dan satu peristiwa perubahan; pustaka state hanya menambah build dan lapisan.

---

## 5. Konfigurasi dan environment

### 5.1 Server (sekarang)

| Variabel | Bawaan | Validasi sekarang | Dipakai di |
| :-- | :-- | :-- | :-- |
| `PORT` | 3000 | `Number()` atau 3000 | listen |
| `NODE_ENV` | — | `production` mengaktifkan wajib PIN dan menyembunyikan PIN di log | `server.js`, `Dockerfile` |
| `NUTRANTARA_ADMIN_PIN` | acak 6 digit | wajib 6–64 karakter tanpa spasi bila produksi | admin |
| `NUTRANTARA_MAX_PLAYERS` | 60 | `Number()` atau 60 | join |
| `NUTRANTARA_DATA_DIR` | `./data` (Docker: `/data`) | tidak ada; dicek lewat `checkStorage` | penyimpanan |
| `NUTRANTARA_BACKUP_KEEP` | 48 | `Number()` atau 48 | cadangan (belum tercatat di `CLAUDE.md`/`DEPLOY.md`) |
| `TRUST_PROXY` | mati | `=== '1'` | IP untuk pembatas laju (Render: `1`) |

Konstanta permainan yang **bukan** konfigurasi dan harus tetap di kode: `SEAL_POINTS = 20`, `MIN_REASON = 20` (harus sama dengan `game.js`), `TEAM_MAX = 4`, `ACTIVE_MS = 24 jam`, `NEAR_UNITS`, laju siaran.

### 5.2 Rekomendasi: `server/config.js`

```js
// server/config.js — satu-satunya tempat yang membaca process.env
const int = (name, def, min, max) => { /* parse, jepit, galat jelas bila bukan angka */ };
module.exports = Object.freeze({
  production: process.env.NODE_ENV === 'production',
  port: int('PORT', 3000, 1, 65535),
  adminPin: ...,               // aturan produksi yang sudah ada
  maxPlayers: int('NUTRANTARA_MAX_PLAYERS', 60, 1, 500),
  dataDir: ...,
  backupKeep: int('NUTRANTARA_BACKUP_KEEP', 48, 1, 1000),
  trustProxy: process.env.TRUST_PROXY === '1',
  logLevel: process.env.NUTRANTARA_LOG_LEVEL || 'info'   // baru, bagian 6
});
```

Aturannya: nilai tidak sah **menghentikan server saat mulai** dengan pesan berbahasa Indonesia, bukan diam-diam kembali ke bawaan (sekarang `NUTRANTARA_MAX_PLAYERS=abc` diam-diam menjadi 60). Cetak ringkasan konfigurasi (tanpa PIN) di baris startup.

Tambahkan berkas `.env.example` (tanpa nilai rahasia) sebagai dokumentasi. **Jangan** menambah dependensi `dotenv`; Node ≥20.6 punya `node --env-file=.env server.js` bila guru butuh. `engines` di `package.json` masih `>=18`; naikkan ke `>=20` agar sama dengan image Docker `node:20-alpine`.

### 5.3 Klien

Klien tidak punya konfigurasi lingkungan, dan itu benar: alamat server diambil dari `location`, mode luring dari protokol. **Jangan** menambah `config.js` klien berisi URL server; itu memecah kemampuan "satu folder, jalan di mana saja". Preferensi pemain (kamera, grafis) tetap di `localStorage`.

---

## 6. Logging

### 6.1 Sekarang

- Server memakai `console.log/warn/error` dengan prefiks `[config]`, `[data]`, `[api]`. Pesan data (rusak, dipulihkan, tidak bisa ditulis) sudah jelas dan berbahasa Indonesia.
- Tidak ada log untuk: koneksi/putus, login gagal berulang, pesan WS yang galat, perintah guru, flag validasi progres (hanya disimpan di `p.flags`, maks. 20).
- Klien: hanya `console.error` di `landing.js` dan pendengar `net.js`.

### 6.2 Rekomendasi: `server/log.js` tanpa dependensi

```js
// level: error < warn < info < debug; NUTRANTARA_LOG_LEVEL menentukan batas
log.info('ws', 'pemain masuk', { id, online: n });
// keluaran: 2026-11-23T09:30:01Z INFO  [ws] pemain masuk id=p_ab12 online=23
```

- Satu baris per peristiwa, stempel waktu ISO, level, area, lalu pasangan `kunci=nilai`. Mudah dibaca guru di jendela terminal dan mudah dicari di log Render. Tidak perlu JSON log atau pino untuk satu kelas.
- **Yang dicatat (info):** server mulai/berhenti, konfigurasi, simpan gagal/pulih, cadangan dibuat, admin masuk/gagal, setiap perintah guru (`kick`, `reset-password`, `set-posts`, `export`, …), regu dibuat/dibubarkan, flag validasi progres (alias + pos, bukan isi jawaban).
- **Debug:** masuk/putus pemain, pesan ditolak pembatas laju.
- **Jangan pernah dicatat:** kata sandi, token sesi, PIN, isi chat, isi alasan/refleksi siswa. Alias saja, sesuai aturan privasi di `ARSITEKTUR_DATABASE.md` bagian 8.
- Ringkasan berkala tiap 5 menit pada level info: pemain daring, ukuran `classroom.json`, `storageOk`. Ini cukup sebagai pemantauan untuk Render tanpa alat tambahan.

### 6.3 Klien

Tambahkan `public/lib/report.js` kecil yang memasang `window.addEventListener('error')` dan `('unhandledrejection')`: tulis ke `console.error`, tampilkan toast netral ("Terjadi gangguan. Progres tetap tersimpan."), dan bila daring, kirim pesan `client-error { where, message }` (dibatasi 5 per sesi, dipotong 300 karakter) agar guru/pengembang tahu bila sebuah pos rusak di laptop siswa. Server mencatatnya pada level warn. Jangan memakai layanan pihak ketiga (Sentry dsb.): CSP ketat dan data anak.

---

## 7. Penanganan error

### 7.1 Server: celah yang harus ditutup

| Celah | Akibat | Perbaikan |
| :-- | :-- | :-- |
| Dispatcher `ws.on('message')` tidak memakai `try/catch` | Satu pengecualian di `handleProgress`, `applyTeamOps`, `handleAdmin`, dst. menjadi *uncaught exception* dan **mematikan server untuk seluruh kelas** (posisi terakhir dalam 1 detik belum tersimpan) | Bungkus pemanggilan handler: tangkap, `log.error('ws', type, err)`, kirim `{ type: 'error', code: 'server', message: 'Permintaan tidak bisa diproses.' }`, lanjut |
| Timer posisi/papan skor/heartbeat tanpa `try/catch` | Sama: satu galat menjatuhkan proses | Bungkus isi setiap `setInterval` |
| Tidak ada `process.on('uncaughtException')` / `('unhandledRejection')` | Proses mati tanpa `flushDb` | Pasang keduanya: log, `flushDb()`, `backupDb()`, lalu `exit(1)`. Docker/Render menyalakan ulang. Jangan mencoba "lanjut jalan" setelah uncaught exception |
| `server.on('error')` belum ada | Port terpakai (`EADDRINUSE`) mencetak stack trace Node mentah ke guru | Tangkap dan cetak "Port 3000 sudah dipakai. Tutup server lain atau atur PORT." |
| `JSON.parse` WS diam-diam diabaikan | Benar untuk klien nakal, tapi tidak terlihat saat debug | Catat pada level debug |

API HTTP sudah benar: `handleApi(...).catch` → 500 `{ error: 'Kesalahan server.' }`. Penyimpanan sudah benar: tulis atomik, `storageOk`, pemulihan dari cadangan.

### 7.2 Kontrak galat ke klien

Semua penolakan memakai satu bentuk:

```json
{ "type": "error", "code": "auth | blocked | full | rate | invalid | server", "message": "Teks Indonesia untuk siswa" }
```

`code` untuk logika klien (sekarang `app.js` sudah bercabang pada `auth` dan `blocked`), `message` untuk ditampilkan. Pesan khusus yang sudah ada (`spawn-denied`, `notice`) boleh tetap, tetapi pesan galat baru wajib memakai bentuk ini. HTTP memakai `{ error: '…' }` + kode status, seperti sekarang.

### 7.3 Klien: prinsip "turun kelas, jangan berhenti"

Pola yang sudah ada dan harus jadi aturan untuk semua kode baru:

| Gagal | Turun ke |
| :-- | :-- |
| Server tidak ada | Mode tamu luring (`localStorage`) |
| Server putus di tengah | Main terus, sambung ulang dengan backoff, progres dikirim saat tersambung lagi |
| WebGL tidak ada | Dunia 2D (`world.js`) |
| Peta 3D beranda gagal | Peta SVG |
| `localStorage` penuh/diblokir | Toast "Unduh Paspor untuk mencadangkan progres" |
| Adegan mini 3D di panel pos gagal | **Belum ada.** Wajib: tangkap di `open…()`, tampilkan versi tombol/teks (semua aktivitas sudah bisa dikerjakan dengan tombol) |

Aturan tambahan: setiap `open…()` modul pos dibungkus `try/catch` oleh registri (bagian 8), dan galat menutup panel dengan pesan, bukan membekukan permainan. Setiap adegan Three.js mini wajib `dispose()` saat panel ditutup, termasuk saat ditutup karena galat (`absorb.js` sudah melakukannya; jadikan bagian `mini-scene.js`).

---

## 8. Titik perluasan: menambah pos baru

### 8.1 Yang harus disentuh hari ini (untuk "Pos 7")

Dari kode nyata, menambah satu pos sekarang berarti menyunting:

1. `missions.js`: entri baru di `NUTRANTARA_MISSIONS` (id, type, stimulus, challenges + kunci, activity.stations) dan `NUTRANTARA_TEAM.roles/tasks[7]`.
2. `world-data.js`: pulau `kind: 'post'`, **tetapi id 7 sudah dipakai "Bukit Sawah Terasering"**, dan `allowedIslands` mengulang `k = 1..6` dengan bawaan `[1,2,3,4,5,6]`. Peta 32400×15200 dengan grid 3×2 juga sudah penuh.
3. `game.js`: `sequenceOpen(id)` memakai `id - 1`, dan pos `project` (Pos 6) dianggap terakhir. Skor maksimum 420 juga tertulis mati di `admin.js` (kartu RATA-RATA SKOR).
4. `quest.js`: `createX(...)` baru dengan `onDone` salinan, cabang `st.kind === '…'` di pembangun model (±baris 190–400) dan di pembuka panel (±baris 797–805).
5. `team.js`: `roleOf` mengenal `kind` tertentu.
6. `region.js`: `CAMPS` dan `KITE_COLORS` berisi tepat 6 entri; `world3d.js`: `ISLAND_COLORS`, `LANDMARKS`; `archive.js`: `POST_COLORS` dan `[1,2,3,4,5,6]` untuk cap Paspor.
7. `server.js`: tidak perlu diubah selama type-nya `analysis`/`project` (skor dan validasi dibaca dari `MISSIONS`), kecuali penanganan varian bila pos punya `variants`.
8. `test/smoke.js`: asersi skor maksimum, segel, varian.
9. `CLAUDE.md`, `MEMORY.md`, `docs/`: skor maksimum dan daftar pos.

Itu sembilan tempat, dan tiga di antaranya akan gagal diam-diam (pulau tidak terbuka, kampung tanpa model, cap Paspor hilang).

### 8.2 Rancangan target

**(a) Nomor pos ≠ id pulau.** Tambah `post: n` dan `order: n` pada pulau pos di `world-data.js`, dan `island: <id>` pada misi. Semua kode memakai helper:

```js
W.posts            // pulau kind 'post' terurut menurut order
W.islandOfPost(n)  // id pulau untuk Pos n
W.postOfIsland(id) // nomor pos atau null
W.allowedIslands(sealed, open)   // berulang atas W.posts, bukan 1..6
```

Untuk Pos 1–6 nilainya tetap sama dengan sekarang (`island === post`), jadi data siswa dan indeks keping arsip tidak berubah. Pos baru mendapat id pulau berikutnya yang bebas (13, 14, …) dan diletakkan di **baris ketiga** grid (perbesar `height` peta), bukan menyisip di antara pulau jelajah.

`sequenceOpen` di `game.js` dan pengecekan `prevSealed` di server memakai urutan `MISSIONS`, bukan `id - 1`.

**(b) Registri pos di klien** (`public/posts/index.js`):

```js
import { createLab } from './pos2-lab.js';
// …
export const POST_MODULES = {
  2: { create: createLab,        kinds: ['lab', 'bench'] },
  3: { create: createAbsorption, kinds: ['twingate', 'villi', 'orb', 'gate'] },
  4: { create: createCausal,     kinds: ['threads', 'colon', 'tower'] },
  5: { create: createClaims,     kinds: ['geode', 'package', 'studio'] },
  6: { create: createArchive,    kinds: ['archive'] }
};
```

Setiap modul pos mengekspor satu bentuk yang seragam:

```js
export function createPosX(ctx) {        // ctx: { game, openPanel, closePanel, shake, say, nara, onDone }
  return {
    buildModel(st, THREE, helpers) {},   // model 3D stasiun di dunia (pindahan cabang quest.js)
    open(item) {},                       // buka panel aktivitas untuk stasiun ini
    status(item) {},                     // opsional: teks prompt "tekan E"
    dispose() {}
  };
}
```

`quest.js` hanya mencari `POST_MODULES[pos]` dan memanggil `buildModel`/`open` di dalam `try/catch`. `onDone` yang sekarang disalin lima kali (konfeti, cincin, teks bintang, `refresh`, hitung stasiun tersisa, `say`) menjadi satu fungsi `celebrate(it, stars, { tail })` di `quest.js`.

**(c) Data tampilan per pos ikut di misi.** Pindahkan warna (`POST_COLORS`, `ISLAND_COLORS`), kampung budaya (`CAMPS[i]` → `camp: 'rumah-gadang'`), dan warna layang-layang ke entri misi atau pulau, agar tidak ada lagi larik berpanjang 6.

**(d) Server tidak perlu tahu pos tertentu.** Pertahankan: aturan skor, segel, dan kunci per *type* (`analysis`, `project`), bukan per id. Type baru (misalnya `lab-sumatif`) wajib menambah satu fungsi validasi di `server/progress.js` dan asersi di `smoke.js`, dan baru diterima bila keduanya ada.

### 8.3 Daftar periksa pos baru (setelah rancangan target)

1. `public/shared/missions.js`: entri misi (id = nomor pos, `island`, `type`, konten, kunci, `activity.stations`, warna, kamp) + peran/tugas regu.
2. `public/shared/world-data.js`: pulau `kind: 'post'` dengan id bebas berikutnya dan `order`.
3. `public/posts/posN-nama.js`: modul dengan `buildModel`/`open`; daftarkan di `posts/index.js`.
4. Gaya baru di `theme.css`, teks dan komentar berbahasa Indonesia, semua aksi bisa dengan papan ketik.
5. `test/smoke.js`: skor maksimum baru, segel pos baru, kunci jawaban, regu.
6. `CLAUDE.md` (skor maksimum, daftar pos) dan `MEMORY.md` (keputusan scope).

Tidak ada langkah "tambahkan ke `STATIC`" dan tidak ada penyuntingan `quest.js`, `team.js`, `region.js`, `archive.js`, atau `server/*`.

### 8.4 Titik perluasan lain

| Ingin menambah | Tempat | Catatan |
| :-- | :-- | :-- |
| Tipe tantangan baru (selain `single`, `multi`, `order`, `sort`) | `gradeChallenge` di `game.js` **dan** `isCorrect` di server | Keduanya harus sama; tambah asersi |
| Pesan WebSocket baru | `server/ws.js` (dispatcher) + handler di modul server yang relevan + `net.js` (emit peristiwa) | Dokumentasikan di daftar protokol; batasi laju bila dipicu pemain |
| Perintah guru baru | `server/admin.js` (sub-perintah `admin`) + tombol di `admin.js` | Catat di log info |
| Pulau jelajah baru | `world-data.js` (id bebas) + `LANDMARKS[id]` di `world3d.js` | Keping arsip baru hanya **di akhir** daftar |
| Mode kamera baru | `CAM_MODES` + `CAM_ORDER` di `world3d.js` | Simpan di `camMem`; jangan pakai Tab |
| Kunci `localStorage` baru | `public/lib/store.js` + tabel bagian 4.3 | Berawalan dan berversi |
| Variabel env baru | `server/config.js` + `.env.example` + `docs/DEPLOY.md` | Validasi saat mulai |

---

## 9. Ringkasan urutan kerja

| No | Pekerjaan | Ukuran | Alasan urutan |
| :-- | :-- | :-- | :-- |
| 1 | `try/catch` dispatcher WS + timer, `uncaughtException` → simpan lalu keluar, `server.on('error')` | Kecil, hanya server | Menghilangkan risiko satu galat menjatuhkan kelas |
| 2 | Pecah `server.js` ke `server/` + `config.js` + `log.js` | Sedang, hanya server | Dijaga `npm test`, membuka jalan untuk Fase 1–2 di `ARSITEKTUR_SERVER.md` |
| 3 | `public/lib/util.js`, `mini-scene.js`, `store.js`, `report.js` | Kecil | Menghapus salinan helper sebelum memindah berkas |
| 4 | Registri pos + bentuk modul seragam + `celebrate` | Sedang, klien | Pos baru tidak lagi menyunting `quest.js` |
| 5 | Pindah ke `public/`, layani folder, hapus `STATIC` | Sedang, banyak berkas, satu commit | Setelah 1–4 agar pemindahan murni mekanis |
| 6 | Nomor pos ≠ id pulau, helper `W.posts`, `allowedIslands` dinamis | Sedang | Prasyarat Pos 7; kerjakan hanya bila pos baru memang direncanakan |
| 7 | `migrate()` state bertahap menggantikan "buang simpanan lama" | Kecil–sedang | Sebelum perubahan skema berikutnya |

Langkah 1–3 aman dikerjakan kapan saja. Langkah 5 dan 6 menyentuh banyak berkas: kerjakan di luar jam pelajaran dan jalankan `npm test` serta uji manual satu putaran (tamu luring, akun daring, regu 2 orang, panel guru) sebelum deploy.
