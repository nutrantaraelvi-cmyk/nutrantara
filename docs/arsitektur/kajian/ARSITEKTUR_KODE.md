# Arsitektur Kode NUTRANTARA

*Disusun 23 November 2026 dari kode nyata di `D:\nutrantara` (paket 0.9.0, fitur regu 1.0): semua berkas `*.js` di akar, `play.html`, `index.html`, `admin.html`, `test/smoke.js`, `.github/workflows/blank.yml`, `Dockerfile`, `CLAUDE.md`, serta `docs/arsitektur/kajian/ARSITEKTUR_SERVER.md` dan `docs/arsitektur/kajian/ARSITEKTUR_DATABASE.md`. Kode hanya dibaca, tidak dijalankan. Nomor baris mengacu ke versi saat itu.*

Dokumen ini melengkapi dua dokumen arsitektur yang sudah ada. `ARSITEKTUR_SERVER.md` membahas *apa* yang dikerjakan server (integritas nilai, ketahanan data, jaringan). `ARSITEKTUR_DATABASE.md` membahas *di mana* data disimpan. Dokumen ini membahas *bagaimana kode disusun*: modul, batas antarfile, aturan bersama, penanganan error, dan pengujian.

## Rekomendasi tegas

1. **Pertahankan gaya sekarang: tanpa build, tanpa bundler, tanpa framework.** Ini keputusan yang tepat untuk game kelas yang harus jalan dari `file://`, hosting statis, dan laptop guru tanpa internet. Jangan pindah ke Vite, React, atau TypeScript penuh.
2. **Satukan aturan penilaian di satu berkas bersama (`rules.js`) sekarang.** Aturan skor, kunci regu, dan `isCorrect` saat ini ditulis dua kali (klien dan server) dan sudah mulai berbeda. Ini masalah struktur paling berisiko karena langsung menyentuh nilai siswa.
3. **Pasang jaring pengaman error di server sekarang.** Satu pesan WebSocket yang memicu exception, atau satu pesan yang melebihi `maxPayload`, kemungkinan besar mematikan proses dan memutus seluruh kelas.
4. **Pecah `server.js` menjadi ±8 modul CommonJS di folder `server/`**, tanpa mengubah perilaku, dengan `smoke.js` sebagai penjaga. Kerjakan sesudah Fase 1–2 di `ARSITEKTUR_SERVER.md`, dan sebelum `storage.js` versi SQLite di `ARSITEKTUR_DATABASE.md`, karena pemisahan ini justru menyiapkan lapisan simpan itu.
5. **Tambah uji unit untuk logika murni** (`node:test`, bawaan Node, tanpa dependensi baru) di samping uji asap yang sudah ada.
6. **Pecah `game.js` dan `world3d.js` belakangan, bertahap, dan hanya bagian yang sering diubah.** Ukurannya besar tetapi isinya kohesif. Memecahnya sekaligus berisiko tinggi tanpa uji peramban.

---

## 1. Struktur modul sekarang

Semua kode ada di akar repositori (±15.300 baris, tanpa `vendor/`). Ada empat jenis berkas dengan aturan yang berbeda.

### 1.1 Data bersama (skrip klasik murni, dibaca peramban dan server)

| Berkas | Baris | Isi | Global |
| :-- | --: | :-- | :-- |
| `missions.js` | 1.175 | Konten 6 pos, **kunci jawaban**, generator varian kasus (Pos 1: 100, Pos 2: 4), definisi peran regu | `NUTRANTARA_MISSIONS`, `NUTRANTARA_TEAM` |
| `world-data.js` | 170 | Peta logis 32400×15200, wilayah pos, pulau jelajah, jembatan, `isPost`, `islandAt` | `NUTRANTARA_WORLD` |

Kedua berkas dimuat server lewat `vm` (`loadBrowserScript`, `server.js:35`) dan oleh `test/smoke.js:22`. Aturannya: hanya menulis ke `window.*`, tanpa `import`/`export`, tanpa DOM. Pola ini bagus dan menjadi dasar modul bersama yang diusulkan di bagian 4.2.

### 1.2 Skrip klasik peramban (`defer`, berbagi lewat `window`)

| Berkas | Baris | Peran | Global yang dibuat |
| :-- | --: | :-- | :-- |
| `net.js` | 332 | Klien WebSocket + HTTP akun, event bus (`on`/`emit`), mode luring | `NutraNet` |
| `team.js` | 168 | Peran berputar, gerbang tugas, HUD regu | `NutraTeam` |
| `game.js` | 1.367 | **Inti permainan**: state & simpan (`localStorage`), penilaian, layar DOM (peta, misi, dapur, paspor, rapor), sinkron regu | `NutraGame` |
| `world.js` | 484 | Dunia 2D cadangan (tanpa WebGL) | `NutraWorld2D` |
| `map-art.js` | 169 | Layar "Peta" ilustrasi | (tidak ada, mengamati DOM) |
| `admin.js` | 367 | Panel guru | (tidak ada) |
| `splash.js` | 78 | Layar muat halaman depan | (tidak ada) |

### 1.3 Modul ES peramban (Three.js dari `vendor/`)

| Berkas | Baris | Peran |
| :-- | --: | :-- |
| `world3d.js` | 2.051 | Dunia 3D: renderer, pembangun pulau, kamera 4 mode, input (keyboard, mouse, gamepad, sentuh), mode pilih map, terjun, simulasi, peta mini. Membuat `window.NutraWorld3D` |
| `app.js` | 493 | Alur aplikasi: masuk/daftar → lobi → regu → pilih pulau → dunia, mode tamu |
| `quest.js` | 1.246 | Objek misi di dunia: terminal, papan laporan, altar segel, panel aktivitas |
| `lab.js`, `absorb.js`, `causal.js`, `claims.js`, `archive.js` | 270–834 | Aktivitas per pos, masing-masing `createX({ game, openPanel, closePanel, shake, say, nara, onDone })` |
| `region.js`, `culture.js`, `characters.js`, `sky.js`, `fx.js` | 100–439 | Pembangun visual: wilayah, properti budaya, karakter, langit, efek |
| `landing.js`, `peta3d.js` | 244, 497 | Halaman depan dan diorama peta 3D |

### 1.4 Server, uji, dan pengiriman

| Berkas | Isi |
| :-- | :-- |
| `server.js` (1.330 baris, CommonJS) | Konfigurasi, simpan JSON + cadangan, akun, validasi progres, ringkasan, siaran, handler pemain, regu, admin, HTTP statis + API, WebSocket, siaran posisi, mati bersih. Bagian-bagiannya sudah ditandai komentar `// ---------- … ----------`, jadi batas modulnya sudah terlihat |
| `test/smoke.js` (352 baris, 77 asersi) | Menyalakan `server.js` di port 3999 dengan folder data sementara, lalu menguji akun, dua pemain, regu, admin lewat WebSocket |
| `.github/workflows/blank.yml` | `node --check` untuk `*.js` dan `test/*.js`, `npm test`, build Docker + cek `/health` |
| `Dockerfile`, `render.yaml` | Node 20 Alpine, jalan sebagai `node` lewat `su-exec` |

### 1.5 Gaya

`styles.css` (dasar), `app.css`, `landing.css`, `admin.css`, lalu `theme.css` (83 KB) dimuat terakhir di setiap halaman. Arsitektur UI dibahas di dokumen UI/UX tersendiri, jadi dokumen ini hanya menyentuh CSS sejauh menyangkut struktur berkas.

---

## 2. Ketergantungan antar file

### 2.1 Urutan muat `play.html`

```
missions.js ─┐
world-data.js┤ (klasik, defer, berurutan)
net.js ──────┤   NutraNet      ← butuh NUTRANTARA_MISSIONS
team.js ─────┤   NutraTeam     ← butuh NUTRANTARA_TEAM, NutraNet
game.js ─────┤   NutraGame     ← butuh MISSIONS, NutraNet, NutraTeam
world.js ────┤   NutraWorld2D  ← butuh WORLD, MISSIONS, NutraGame, NutraNet
map-art.js ──┘
world3d.js  (module)  NutraWorld3D ← membaca window.NutraGame, NutraNet, NutraWorld2D
app.js      (module)  ← membaca window.NutraWorld3D di tingkat atas (app.js:13), tanpa import
```

Skrip `defer` dan modul dijalankan sesuai urutan dokumen setelah HTML selesai diurai, jadi urutan ini benar. Tetapi kontraknya **tersirat**: tidak ada yang mencegah seseorang memindah tag `<script>` atau menambah `async`, dan bila itu terjadi, `app.js` mendapat `undefined` tanpa pesan error yang jelas.

### 2.2 Graf import modul ES

```
app.js ──► characters.js, sky.js, culture.js
world3d.js ──► characters.js, fx.js, quest.js, region.js, sky.js, culture.js
quest.js ──► characters.js, culture.js, lab.js, absorb.js, causal.js, claims.js, archive.js
archive.js ──► claims.js (hanya untuk miniScene)
region.js ──► characters.js, culture.js
culture.js ──► characters.js
landing.js ──► characters.js, culture.js, peta3d.js
(semua) ──► vendor/three/three.module.min.js
```

Grafnya bersih: tidak ada siklus, dan `characters.js`/`culture.js` adalah daun yang dipakai bersama. Satu kejanggalan: `archive.js` bergantung pada `claims.js` (aktivitas Pos 5) hanya untuk utilitas `miniScene` (`claims.js:554`).

### 2.3 Ketergantungan lewat `window` (kontrak tersirat)

| Global | Ditulis | Dibaca oleh |
| :-- | :-- | :-- |
| `NUTRANTARA_MISSIONS` | `missions.js` | `game.js`, `net.js`, `world.js`, `world3d.js`, `app.js`, `admin.js`, `landing.js`, `server.js` |
| `NUTRANTARA_WORLD` | `world-data.js` | `world.js`, `world3d.js`, `app.js`, `admin.js`, `landing.js`, `server.js` |
| `NUTRANTARA_TEAM` | `missions.js` | `team.js` |
| `NutraNet` | `net.js` | `game.js`, `team.js`, `world.js`, `world3d.js`, `app.js`, `archive.js` |
| `NutraGame` | `game.js` | `world.js`, `world3d.js`, `app.js`, `team.js`, `quest.js` |
| `NutraTeam` | `team.js` | `game.js`, `quest.js`, `lab.js`, `absorb.js`, `causal.js`, `claims.js`, `app.js` |
| `NutraWorld2D` / `NutraWorld3D` | `world.js` / `world3d.js` | `app.js`, satu sama lain |

Modul aktivitas (`lab.js` dan kawan-kawan) menerima `game` lewat parameter, tetapi tetap membaca `window.NutraTeam` langsung. Itu dua pola untuk hal yang sama.

### 2.4 Ketergantungan klien ↔ server

| Kontrak | Sisi klien | Sisi server | Status |
| :-- | :-- | :-- | :-- |
| Konten + kunci | `missions.js` | `missions.js` lewat `vm` | Satu sumber ✓ |
| Peta | `world-data.js` | `world-data.js` lewat `vm` | Satu sumber ✓ |
| `isCorrect` | `game.js:539` | `server.js:246` | **Dua salinan, sudah berbeda** |
| `SEAL_POINTS`, `MIN_REASON` | `game.js:8–9` | `server.js:30–31` | Dua salinan |
| Kunci regu | `TEAM_KEYS`/`TEAM_OP_KEYS` `game.js:1061` | `SHARED_KEYS`/`OP_KEYS` `server.js:579` | Dua salinan, nama berbeda |
| `awardForAttempt` | `game.js:87` | `server.js:244` | Dua salinan |
| Jenis pesan WebSocket | `net.js` (string literal) | `server.js:1228–1245` (string literal) | Tidak ada daftar bersama |
| Daftar berkas statis | tag `<script>`/`<link>` di HTML, `import` | `STATIC` `server.js:1087` | Manual, mudah lupa |

---

## 3. Masalah struktur nyata

Diurutkan dari dampak terbesar. Tiap butir menyebut buktinya.

### 3.1 Aturan penilaian ditulis dua kali dan sudah berbeda (tinggi)

- `isCorrect` di server memeriksa tipe (`typeof response === 'string'`, `Array.isArray`), versi klien tidak. Pada klien, `response` bernilai `null` untuk tipe `multi` membuat `response.length` melempar error.
- Klien menaikkan `c.attempts += 1` lalu memberi `awardForAttempt(c.attempts)` (`game.js:68–74`). Server memaksa `attempts = 1` (`server.js:281`). Bila suatu saat klien punya `attempts > 1` (simpanan lama, migrasi v1 di `game.js:101`), layar siswa menampilkan poin yang lebih kecil daripada yang dicatat guru.
- `CLAUDE.md` sendiri memperingatkan "Scoring lives in two places that must agree". Peringatan di dokumen tidak cukup; aturannya harus satu berkas.

### 3.2 Server tidak punya jaring pengaman error (tinggi)

- Dispatcher pesan (`server.js:1222–1245`) memanggil handler tanpa `try/catch`, dan tidak ada `process.on('uncaughtException')`. Bug kecil di satu handler terhadap pesan yang bentuknya tak terduga dari satu siswa menjatuhkan seluruh server untuk 60 siswa.
- Tidak ada `ws.on('error')`. Pustaka `ws` memancarkan `error` pada socket, misalnya saat pesan melebihi `maxPayload: 256 KB`. EventEmitter tanpa pendengar `error` melempar exception, jadi satu klien yang mengirim pesan besar kemungkinan besar mematikan proses. Ini dugaan dari cara kerja `ws`, belum dibuktikan dengan menjalankan; buktikan dengan asersi baru di `smoke.js` (kirim 300 KB, lalu pastikan `/health` masih menjawab).
- `server.listen` tanpa penanganan `EADDRINUSE`: guru yang menjalankan `npm start` dua kali mendapat jejak tumpukan Node, bukan pesan "port 3000 sudah dipakai".
- Hanya API HTTP yang punya penangkap error (`server.js:1196`).

### 3.3 `server.js` satu berkas berisi 12 tanggung jawab (sedang)

Konfigurasi, penyimpanan, akun, penilaian, regu, admin, HTTP, WebSocket, dan siaran semuanya berbagi variabel tingkat atas (`db`, `conns`, `adminDirty`, `boardDirty`, `positionsDirty`). Akibatnya logika murni seperti `validateProgress`, `lockAnswers`, `fillMerge`, `applyTeamOps` tidak bisa diuji tanpa menyalakan server, dan rencana `storage.js` di `ARSITEKTUR_DATABASE.md` 5.2 sulit dipasang karena `scheduleSave()` dipanggil dari mana-mana. Penanda bagian sudah ada, jadi pemisahannya mekanis.

### 3.4 Daftar `STATIC` manual (sedang)

Setiap berkas baru harus ditambahkan ke `STATIC` (`server.js:1087`), atau berkas itu 404 di server kelas padahal jalan di `file://`. Kesalahan ini tidak tertangkap CI, karena `smoke.js` tidak memeriksa bahwa semua berkas yang dirujuk HTML dan `import` dapat diunduh.

### 3.5 Kontrak `window` tersirat dan urutan skrip rapuh (sedang)

Lihat 2.1 dan 2.3. `app.js:13` membaca `window.NutraWorld3D` saat modul dievaluasi tanpa `import`, sehingga bergantung pada urutan tag di `play.html`. Bila nilainya `undefined`, error muncul jauh dari penyebabnya.

### 3.6 Duplikasi kode utilitas dan pola (sedang)

- Fungsi `esc` (escape HTML) disalin persis di **13 berkas**. Satu perbaikan keamanan harus diulang 13 kali.
- `absorb.js`, `causal.js`, dan `claims.js` masing-masing membuat `WebGLRenderer` mini sendiri dengan pola buat/buang yang mirip. `claims.js` sudah punya `miniScene` umum, tetapi hanya `archive.js` yang memakainya.
- Callback `onDone` di `quest.js:28–60` ditulis ulang hampir sama untuk tiap aktivitas (konfeti, cincin, teks bintang, `refresh`, hitung stasiun tersisa, kalimat Nara).

### 3.7 `game.js` dan `world3d.js` sangat besar (rendah–sedang)

`game.js` (1.367 baris) menggabungkan state, penyimpanan, penilaian, rendering DOM tujuh layar, dapur Pos 6, sinkron regu, dan rapor dalam satu IIFE. `world3d.js` (2.051 baris, 129 variabel tingkat atas) menggabungkan renderer, pembangun pulau, kamera, input, dan peta mini. Isinya kohesif dan sudah berkomentar baik, jadi ini bukan keadaan darurat. Masalah nyatanya: logika murni di `game.js` (penilaian, `evaluatePost`, `diffOps`) tidak bisa diuji tanpa DOM, dan input/kamera di `world3d.js` adalah bagian yang paling sering diubah.

### 3.8 Hal kecil yang perlu dirapikan

- Kode mati: `markClass` (`game.js:80`) selalu `return null`; `awardForAttempt` tidak bermakna lagi sejak "satu jawaban per tantangan" (0.7), karena hasilnya selalu 30.
- Versi tidak sinkron: `package.json` `0.9.0`, `APP_VERSION = '1.0'` (`game.js:2`), dan `CLAUDE.md` menyebut fitur 1.0.
- Node 20 di `Dockerfile` dan CI sudah melewati masa dukungan (April 2026). `ARSITEKTUR_DATABASE.md` sudah merekomendasikan Node 24 LTS; kode mengikutinya.
- Pemeriksaan sintaks CI `for f in *.js` hanya melihat akar. Begitu ada folder `server/` atau `shared/`, pola itu harus ikut diperbarui.
- Kunci `localStorage` tersebar sebagai string literal di banyak berkas, dengan pola versi yang berbeda-beda (`-v1`, `-v2:`, `-v3`, tanpa versi).
- `index.html` memuat `missions.js` (86 KB, berisi kunci jawaban) hanya untuk halaman depan.

---

## 4. Struktur target bertahap

Prinsip untuk semua tahap:

- **Tanpa build tetap wajib.** Setiap berkas harus bisa dibuka langsung dari `file://` dan dari server kelas.
- **Satu tahap = satu PR kecil yang perilakunya tidak berubah**, dijaga `npm test` yang hijau sebelum dan sesudah.
- **Mode luring tetap fitur.** Tidak ada perubahan yang membuat klien wajib tersambung ke server.

### 4.1 Tahap 0 (sekarang, kecil): jaring pengaman dan kebersihan

1. Bungkus dispatcher WebSocket:
   ```js
   ws.on('error', (err) => log.warn('ws', conn.playerId, err.message));
   ws.on('message', (raw) => {
     try { dispatch(ws, conn, raw); }
     catch (err) { log.error('handler', { type: msgType, player: conn.playerId }, err); }
   });
   ```
2. Tambah `process.on('uncaughtException')` dan `unhandledRejection` yang mencatat error lalu **memanggil `flushDb()` sebelum keluar** (proses tetap keluar; Docker/Render menyalakan ulang, guru LAN melihat pesan jelas).
3. `server.on('error')` untuk `EADDRINUSE` dengan pesan bahasa Indonesia.
4. Hapus `markClass`, samakan versi (`package.json` jadi sumber, `APP_VERSION` dibaca dari situ atau diubah bersamaan), naikkan Node ke 24 di `Dockerfile`, `package.json` (`engines`), dan CI.
5. Asersi baru di `smoke.js`: pesan 300 KB tidak menjatuhkan server; jenis pesan tak dikenal dan pesan bentuk aneh (`move` tanpa angka, `progress` dengan `posts: null`) tidak menjatuhkan server.

### 4.2 Tahap 1 (sekarang, kecil): modul bersama `rules.js`

Buat satu berkas **`rules.js`** di akar, dengan aturan yang sama seperti `missions.js`: skrip klasik murni, hanya menulis `window.NUTRANTARA_RULES`, tanpa DOM.

```js
// rules.js — aturan penilaian dan regu yang dipakai peramban DAN server. Jangan pakai DOM/import.
window.NUTRANTARA_RULES = (() => {
  const CHALLENGE_POINTS = 30;
  const SEAL_POINTS = 20;
  const MIN_REASON = 20;
  const SHARED_KEYS = { analysis: [...], project: [...] };
  const OP_KEYS = { analysis: [...], project: [...] };
  function isCorrect(def, response) { /* versi server yang memeriksa tipe */ }
  function challengePoints(correct) { return correct ? CHALLENGE_POINTS : 0; }
  function grade(pct) { /* A ≥90, B ≥75, C ≥60, D */ }
  return Object.freeze({ CHALLENGE_POINTS, SEAL_POINTS, MIN_REASON, SHARED_KEYS, OP_KEYS, isCorrect, challengePoints, grade });
})();
```

- `play.html` memuatnya tepat setelah `missions.js`. `game.js` memakai `window.NUTRANTARA_RULES` dan menghapus salinannya sendiri (`isCorrect`, konstanta, `TEAM_KEYS`, `awardForAttempt`).
- `server.js` memuatnya dengan `loadBrowserScript('rules.js')` seperti `missions.js`, dan `smoke.js` juga.
- Tambahkan ke `STATIC`.
- Ganti `awardForAttempt` dengan `challengePoints(correct)`. Nilainya sama (30 atau 0), jadi data siswa tidak berubah.

Ini perubahan paling bernilai di dokumen ini: setelahnya, "skor di dua tempat yang harus sama" berhenti menjadi risiko.

**Kenapa skrip klasik, bukan modul ES:** `game.js` adalah skrip klasik dan tidak bisa `import`. Pola `vm` untuk server sudah teruji di `missions.js`. Mengubah semuanya ke modul ES hanya demi satu berkas tidak sepadan.

### 4.3 Tahap 2 (setelah Fase 1–2 server, sedang): pecah `server.js`

Struktur target:

```
server.js                 ← titik masuk tipis: muat config, rakit modul, listen, shutdown (±60 baris)
server/
  config.js               ← env (PORT, ADMIN_PIN, MAX_PLAYERS, DATA_DIR, TRUST_PROXY), validasi produksi
  log.js                  ← log.info/warn/error dengan tag [data] [ws] [api] [admin]
  shared.js               ← loadBrowserScript: MISSIONS, WORLD, TEAM, RULES
  storage.js              ← load/parse/flush/backup/checkStorage/markDirty (antarmuka dari ARSITEKTUR_DATABASE 5.2)
  accounts.js             ← hash/cek kata sandi, sesi, pembatas laju login
  grading.js              ← challengesFor, validateProgress, lockAnswers (murni, tanpa db global)
  teams.js                ← kode regu, merge/overlay, applyTeamOps, voting (murni sebisa mungkin)
  views.js                ← publicPlayer, leaderboard, adminSnapshot, teamView
  realtime.js             ← conns, send/broadcast, flag dirty, siaran posisi per wilayah
  handlers/
    player.js             ← join, move, zone, spawn, emote, chat, progress
    party.js              ← party, team-op, team-vote
    admin.js              ← admin-auth, admin (sub-perintah)
  http.js                 ← STATIC/berkas statis, header keamanan, API /api/*, /health
```

Aturan:

- **Satu arah ketergantungan:** `handlers/*` → (`grading`, `teams`, `accounts`, `views`, `realtime`, `storage`) → (`shared`, `config`, `log`). Modul bawah tidak pernah me-`require` modul atas.
- **Logika murni menerima data sebagai parameter.** `validateProgress(state, missions, rules)`, bukan membaca `MISSIONS` global. Inilah yang membuat Tahap 4 (uji unit) mungkin.
- **`db` hanya disentuh lewat `storage`** (`storage.db`, `storage.markDirty('player', id)`). Ganti semua `scheduleSave()` dengan `markDirty(...)`. Implementasi JSON pertama mengabaikan argumennya dan berperilaku sama seperti sekarang; implementasi SQLite nanti memakainya.
- **Dispatcher berbasis tabel** di `realtime.js`, bukan rangkaian `if`:
  ```js
  const PLAYER_HANDLERS = { move, progress, chat, zone, spawn, emote, party, 'team-op': teamOp, 'team-vote': teamVote, ping };
  ```
  Jenis pesan tak dikenal dicatat sekali per koneksi, bukan diam.
- **Urutan pemindahan:** `config` + `log` → `shared` → `storage` → `grading` → `teams` → `views` → `realtime` → `handlers` → `http`. Satu PR per 1–2 modul, `npm test` hijau tiap langkah, dan tidak ada perubahan perilaku di PR yang sama.
- **Tetap CommonJS dan tetap tanpa framework** (tanpa Express). `http` bawaan sudah cukup untuk 7 rute.
- `Dockerfile` (`COPY . .`) sudah menyalin folder baru; CI `node --check` diganti `node --check server.js server/**/*.js *.js test/*.js` (lihat 4.6).

Dengan struktur ini, rencana di dua dokumen lain menjadi pekerjaan di satu modul masing-masing: Fase 1 server di `grading.js`, Fase 3 di `realtime.js`, SQLite di `storage.js`, multi-kelas di `storage` + `realtime`.

### 4.4 Tahap 3 (sedang): `STATIC` otomatis dan kontrak klien

**`STATIC` dari daftar yang dibuat otomatis, dengan daftar putih ekstensi.** Ganti peta manual dengan pemindaian saat mulai: semua berkas `*.html`, `*.css`, `*.js` di akar (kecuali `server.js`, `rules.js` tetap disertakan), `assets/*.webp`, dan `vendor/three/three.module.min.js`. Sertakan daftar tolak eksplisit (`server.js`, `server/`, `test/`, `data/`, `docs/`, `*.md`, `package*.json`, folder skill). Jalur dinormalisasi dan dicocokkan dengan daftar hasil pindaian, jadi tidak ada jalur buatan pengguna yang langsung dibaca dari disk. Tambah asersi di `smoke.js`: setiap `src`/`href` di tiga HTML dan setiap `import './…'` di modul ES menjawab 200.

Bila memilih tetap manual, minimal tambah asersi itu. Asersi tersebut yang menutup kelas bug "lupa menambah ke STATIC".

**Kontrak `window` dibuat eksplisit:**

- Satu berkas kecil `contracts.md` tidak perlu; cukup satu komentar blok di atas `play.html` yang menyebut urutan dan global masing-masing, plus pemeriksaan di awal tiap konsumen:
  ```js
  const game = window.NutraGame;
  if (!game) throw new Error('world3d.js: NutraGame belum dimuat. Periksa urutan <script> di play.html.');
  ```
- `app.js` membaca `window.NutraWorld3D` setelah event `DOMContentLoaded` atau, lebih baik, `world3d.js` mengekspor API-nya (`export const World3D = …`) dan tetap menulis ke `window` untuk `world.js`/`team.js`. Dengan begitu `app.js` memakai `import`, dan urutan muat dijamin browser.
- Modul aktivitas menerima `team` lewat parameter yang sama seperti `game`, bukan membaca `window.NutraTeam`.

**Konstanta jenis pesan.** Tambah `MSG` ke `rules.js` (`MSG.JOIN = 'join'`, …) dan pakai di `net.js` dan `server/realtime.js`. Salah ketik nama pesan lalu menjadi `undefined` yang mudah dilacak, bukan pesan yang diam-diam diabaikan.

### 4.5 Tahap 4 (bertahap, hanya bila menyentuh bagian itu): klien

Jangan pecah klien sekaligus. Pecah bagian ketika ada pekerjaan di bagian itu.

| Target | Isi | Pemicu |
| :-- | :-- | :-- |
| `ui-util.js` (modul ES) | `esc`, `$`, `$$`, `toast`; dipakai semua modul ES. Skrip klasik memakai salinan dari `window.NutraUtil` yang ditulis berkas klasik kecil `util.js` | Sekarang, kecil. Hapus 13 salinan `esc` |
| `mini-scene.js` (modul ES) | Pindahkan `miniScene` dari `claims.js`; `absorb.js` dan `causal.js` memakainya | Saat aktivitas berikutnya diubah |
| `activity-host.js` | Satu fungsi `onActivityDone(it, stars, { label, doneText })` pengganti callback `onDone` yang berulang di `quest.js` | Saat aktivitas baru ditambah |
| `game-state.js` (klasik) | `freshState`, `normalizeState`, `migrateV1`, `loadState`, `saveState`, `SCHEMA_VERSION`, kunci `localStorage` | Saat skema simpan berubah |
| `game-eval.js` (klasik) | `evaluatePost`, `evaluateAll`, predikat; murni, tanpa DOM | Saat rapor diubah |
| `game-team.js` (klasik) | `opsSnapshot`, `diffOps`, `adoptTeam`, voting | Saat fitur regu diubah |
| `world3d/camera.js`, `world3d/input.js`, `world3d/minimap.js` | Mode kamera, kendali keyboard/mouse/gamepad/sentuh, peta mini | Saat kendali atau kamera diubah |

`game.js` yang tersisa menjadi lapisan layar DOM yang memakai modul-modul di atas. Semua tetap skrip klasik dengan pola IIFE yang sama, jadi `play.html` hanya mendapat beberapa tag `<script defer>` tambahan dan `STATIC` (atau pindaian Tahap 3) ikut diperbarui.

**Tidak direkomendasikan sekarang:** memindah semua berkas ke `public/`. Itu menyentuh tiga HTML, semua `import`, `STATIC`, CI, Docker, dan `smoke.js` sekaligus untuk manfaat yang kecil. Pertimbangkan hanya bersamaan dengan Tahap 3 bila pindaian otomatis dipakai, karena saat itu satu folder `public/` justru menyederhanakan daftar tolak.

### 4.6 Konvensi penamaan

Sebagian besar sudah konsisten; tulis dan pertahankan:

| Hal | Konvensi | Contoh |
| :-- | :-- | :-- |
| Berkas | `kebab-case.js`, satu kata bila bisa | `world-data.js`, `mini-scene.js` |
| Folder server | `server/` CommonJS, `server/handlers/` per kelompok pesan | `server/handlers/party.js` |
| Global klasik | Data: `NUTRANTARA_*` (huruf besar). API: `Nutra*` (PascalCase) | `NUTRANTARA_RULES`, `NutraNet` |
| Pabrik modul | `createX(ctx)` mengembalikan objek; `buildX` untuk pembangun scene sekali jalan | `createLab`, `buildRegions` |
| Konstanta | `UPPER_SNAKE` | `SEAL_POINTS`, `NEAR_UNITS` |
| Fungsi/variabel | `camelCase`, kata kerja untuk fungsi | `validateProgress`, `teamView` |
| Handler pesan | `handleNamaPesan` | `handleTeamVote` |
| Jenis pesan WebSocket | `kebab-case`, dari `MSG` | `team-op`, `progress-sync` |
| Kunci `localStorage` | `nutrantara-<hal>-v<n>`, terpusat di `game-state.js` | `nutrantara-save-v2:<user>` |
| Bahasa | Teks pengguna, komentar, dan dokumen dalam bahasa Indonesia; nama kode dalam bahasa Inggris (seperti sekarang) | |

Nama kunci regu disatukan menjadi `SHARED_KEYS`/`OP_KEYS` (nama server), karena keduanya akan berada di `rules.js`.

### 4.7 Penanganan error

**Server:**

1. **Batas luar wajib**: dispatcher WebSocket, handler HTTP, timer siaran, dan timer simpan masing-masing punya `try/catch` yang mencatat error. Satu pesan buruk tidak boleh mematikan kelas.
2. **Validasi di tepi, bukan di dalam.** Setiap handler memulai dengan memeriksa bentuk pesan (angka terbatas, string dipotong `cleanText`, larik terbatas panjangnya) dan langsung `return` bila tidak sah. Logika di bawahnya boleh menganggap data sudah bersih. Pola ini sudah dipakai di sebagian handler; jadikan aturan.
3. **Dua jenis kegagalan, dua perlakuan:**
   - *Kesalahan pengguna* (kode regu salah, kata sandi salah, pos terkunci): balas pesan bahasa Indonesia ke klien (`party-error`, `join-error`, JSON `{ error }`), tidak dicatat sebagai error.
   - *Kesalahan program* (exception): catat dengan tag dan `playerId`, balas generik "Kesalahan server", jangan pernah kirim jejak tumpukan ke klien.
4. **Kegagalan simpan selalu terlihat oleh guru.** Sudah ada (`/health.storage`, `checkStorage`); pertahankan dan tampilkan juga di panel guru.
5. **`log.js` sederhana**, bukan pustaka: `console` dengan tag tetap (`[data]`, `[ws]`, `[api]`, `[admin]`, `[regu]`) dan, di produksi, satu baris JSON per kejadian agar mudah dicari di log Render. Jangan pernah mencatat kata sandi, token sesi, PIN guru, atau isi obrolan.
6. **Exception tak tertangkap**: catat, `flushDb()`, lalu keluar dengan kode 1. Jangan lanjut berjalan dalam keadaan tidak pasti.

**Klien:**

1. `emit` di `net.js` sudah membungkus tiap pendengar dengan `try/catch` (`net.js:28`); pertahankan pola itu untuk event bus lain.
2. Fitur yang bisa gagal karena perangkat (WebGL, `localStorage` penuh atau dilarang, pointer lock, gamepad) harus jatuh ke cadangan yang sudah ada (2D, simpan di memori, kendali biasa) dengan satu toast, bukan error di konsol.
3. Panel aktivitas yang membuat renderer mini harus membuang renderer di `finally`/saat tutup, termasuk bila pembangunan scene gagal di tengah jalan, agar tidak menghabiskan batas konteks WebGL peramban.
4. Jangan menelan error tanpa jejak. `catch {}` kosong hanya boleh untuk `JSON.parse` simpanan lama dan akses `localStorage`; selain itu minimal `console.warn` dengan konteks.

### 4.8 Pengujian

**Sekarang:** satu uji asap integrasi (`test/smoke.js`, 77 asersi) yang bagus untuk alur server. Tidak ada uji logika klien sama sekali: penilaian klien, `evaluatePost`, `diffOps`, rotasi peran regu, dan generator varian tidak tertutup.

**Target, tiga lapis, semuanya tanpa dependensi baru:**

| Lapis | Alat | Isi | Kapan dijalankan |
| :-- | :-- | :-- | :-- |
| 1. Unit | `node:test` + `node:assert` (bawaan) di `test/unit/*.test.js` | `rules.js` (tiap tipe soal, respons rusak), `grading.js` (`validateProgress`, `lockAnswers`), `teams.js` (`fillMerge`, `applyTeamOps`, kunci terlarang `__proto__`), `game-eval.js` (predikat A–D), `team.js` rotasi peran `(r + p − 1) mod n`, varian `missions.js` deterministik | Setiap commit, < 2 detik |
| 2. Integrasi | `test/smoke.js` yang sudah ada | Ditambah asersi Tahap 0 (pesan besar/aneh) dan Tahap 3 (semua berkas statis 200) | Setiap commit |
| 3. Peramban | Playwright (sudah biasa dipakai untuk pengecekan manual) di `test/e2e/`, **opsional** | Satu skenario: buka `play.html` dari server, masuk tamu, buka Pos 1, jawab satu soal, cek skor; satu lagi dengan WebGL dimatikan (cadangan 2D) | Manual sebelum rilis atau di CI terjadwal, bukan tiap commit |

Ketentuan:

- `package.json`: `"test": "node --test test/unit/ && node test/smoke.js"`. `smoke.js` tetap gaya `ok(cond, label)`; tidak perlu diubah ke `node:test`.
- Uji unit memuat skrip klasik lewat `vm` seperti `smoke.js:22`. Ini juga menjadi uji bahwa `missions.js`, `world-data.js`, dan `rules.js` tetap bebas DOM.
- **Uji pengunci untuk data siswa:** satu uji memeriksa bahwa varian 0, 1, dan 99 Pos 1 menghasilkan kunci yang sama seperti sekarang (simpan sidik jarinya di uji). Ini menjaga peringatan `CLAUDE.md` "jangan ubah seed generator".
- **Uji kesetaraan klien–server:** sebelum `rules.js` jadi, satu uji yang menjalankan `isCorrect` versi `game.js` dan `server.js` pada semua soal dan semua varian akan langsung menunjukkan perbedaan yang dibahas di 3.1. Setelah `rules.js` jadi, uji ini tidak diperlukan lagi.
- CI: ganti `for f in *.js test/*.js; do node --check "$f"; done` dengan pemeriksaan yang ikut menyapu `server/` dan `test/unit/`, misalnya `find . -name '*.js' -not -path './node_modules/*' -not -path './vendor/*' -not -path './<folder skill>/*' -print0 | xargs -0 -n1 node --check`.
- **Linter: belum.** Tambahkan ESLint (dev saja, konfigurasi minimal: `no-undef`, `no-unused-vars`, `eqeqeq`) hanya setelah Tahap 2, karena saat itu daftar global per berkas sudah jelas. Sebelum itu, ESLint akan penuh peringatan tentang global `window.*` dan menambah kebisingan, bukan keamanan.

---

## 5. Urutan kerja

| Urutan | Pekerjaan | Ukuran | Kapan | Bergantung pada |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Tahap 0: `try/catch` dispatcher, `ws.on('error')`, `uncaughtException` + flush, `EADDRINUSE`, asersi pesan besar/aneh | Kecil | Sekarang | — |
| 2 | Tahap 1: `rules.js` bersama, hapus salinan di `game.js`/`server.js` | Kecil | Sekarang | 1 |
| 3 | Uji unit `node:test` untuk `rules.js` + uji pengunci varian | Kecil | Bersama 2 | 2 |
| 4 | Rapikan: hapus `markClass`, samakan versi, Node 24 | Kecil | Sekarang | — |
| 5 | `ui-util.js`/`util.js`, hapus 13 salinan `esc` | Kecil | Kapan saja | — |
| 6 | Fase 1–2 `ARSITEKTUR_SERVER.md` (integritas, ketahanan data) | Kecil–sedang | Sekarang | 1, 2 |
| 7 | Tahap 2: pecah `server.js` ke `server/` (8–10 PR kecil) | Sedang | Setelah 6 | 6 |
| 8 | Uji unit `grading.js`, `teams.js` | Kecil | Bersama 7 | 7 |
| 9 | Tahap 3: `STATIC` otomatis + asersi semua berkas 200, kontrak `window` eksplisit, `MSG` | Sedang | Setelah 7 | 7 |
| 10 | `storage.js` versi SQLite (`ARSITEKTUR_DATABASE.md` 5.2) | Sedang–besar | Saat pemicu 5.1 | 7 |
| 11 | Tahap 4: pecah `game.js` / `world3d.js` per bagian | Sedang, bertahap | Saat bagian itu diubah | 2 |
| 12 | ESLint minimal, uji peramban Playwright opsional | Kecil | Setelah 7 | 7 |

Butir 1–5 bisa selesai dalam beberapa hari kerja dan tidak mengubah apa pun yang dilihat siswa atau guru.

---

## 6. Yang tidak direkomendasikan

| Usulan | Alasan ditolak |
| :-- | :-- |
| Bundler (Vite, webpack, esbuild) | Mematahkan mode `file://` dan hosting statis tanpa langkah build, dan menambah langkah yang harus dipahami guru yang menjalankan server sendiri. Manfaatnya (minifikasi, tree-shaking) kecil untuk game LAN |
| Menulis ulang ke TypeScript | Butuh build. Bila ingin pemeriksaan tipe, pakai JSDoc + `// @ts-check` per berkas, yang bisa dibaca VS Code tanpa build |
| React / Vue / Svelte untuk layar DOM | Layar `game.js` berupa template string + `esc` sudah bekerja dan aksesibel. Framework menambah build dan ukuran tanpa memperbaiki masalah di bagian 3 |
| Express / Fastify / NestJS | Tujuh rute HTTP dan satu WebSocket tidak butuh framework. Pemisahan modul (Tahap 2) memberi keteraturan yang sama |
| Mengubah semua skrip klasik menjadi modul ES sekarang | Server memuat data bersama lewat `vm`, yang mengandalkan skrip klasik. Perubahan besar ini tidak memperbaiki satu pun masalah nyata di bagian 3 |
| Memecah `game.js` dan `world3d.js` sekaligus | Tanpa uji peramban, risiko regresi kendali dan kamera tinggi. Pecah per bagian saat bagian itu diubah |
| Memindah semua berkas ke `public/` sekarang | Menyentuh HTML, `import`, `STATIC`, CI, Docker, dan uji sekaligus untuk manfaat kecil (lihat 4.5) |
