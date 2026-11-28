# Arsitektur CI/CD NUTRANTARA

*Disusun 23 November 2026 dari konfigurasi nyata: `.github/workflows/blank.yml`, `Dockerfile`, `.dockerignore`, `render.yaml`, `package.json`, `package-lock.json`, `test/smoke.js`, `server.js` (penyimpanan, cadangan, `/health`, penanganan SIGTERM), `docs/DEPLOY.md`, `docs/arsitektur/kajian/ARSITEKTUR_SERVER.md`, dan `docs/arsitektur/kajian/ARSITEKTUR_DATABASE.md`.*

Semua contoh workflow dan konfigurasi di dokumen ini adalah **usulan**. Belum ada yang diterapkan ke repo. Terapkan bertahap lewat pull request sesuai urutan di bagian 10.

## Rekomendasi singkat

1. **Masalah terbesar sekarang: setiap push ke `main` langsung tayang ke kelas**, tanpa menunggu CI lulus, dan setiap deploy membuat server berhenti beberapa detik (karena memakai disk). Push yang rusak atau push di jam pelajaran langsung mengganggu siswa.
2. **Pisahkan staging dan produksi.** `main` otomatis ke *staging* (Render, paket gratis, tanpa data siswa). Produksi hanya berubah lewat workflow rilis yang memakai tag versi, persetujuan manual, dan penjaga jam pelajaran.
3. **Naik ke Node 24 sekarang.** Node 20 yang dipakai CI dan Dockerfile sudah habis masa dukungannya sejak 30 April 2026. Kode server tidak memakai API usang, jadi risikonya kecil.
4. **Tambahkan lint, pemindaian keamanan, dan Dependabot**, tetapi tetap ringan: proyek ini tidak punya tahap build, dan sebaiknya tetap begitu.
5. **Rollback kode dan rollback data adalah dua hal berbeda.** Rollback kode lewat Render (satu klik). Data dilindungi tiga lapis cadangan yang sudah ada; CI/CD cukup memastikan setiap rilis tetap bisa membaca data lama.

---

## 1. Pipeline sekarang

### 1.1 Alur

```
pengembang ──push──▶ main (GitHub)
                       │
                       ├──▶ GitHub Actions "CI" (blank.yml)
                       │      job test:   Node 20 → npm ci → node --check *.js test/*.js → npm test
                       │      job docker: docker build → docker run dengan /data milik root → tunggu /health "storage": true
                       │
                       └──▶ Render (Blueprint render.yaml) ── auto-deploy setiap commit, TIDAK menunggu CI
                              layanan "nutrantara": Docker, Singapura, Starter, disk 1 GB di /data
                              healthCheckPath: /health
```

### 1.2 Yang sudah baik

- **CI menguji hal yang benar.** `test/smoke.js` menjalankan `server.js` sungguhan di port 3999 dengan folder data sementara, lalu menguji akun, dua pemain, regu, dan admin lewat WebSocket.
- **Uji Docker meniru disk Render.** Job `docker` memasang folder milik root ke `/data` dan memastikan server (user `node` lewat `su-exec`) tetap bisa menulis. Ini menangkap bug izin disk yang hanya muncul di produksi.
- **Image kecil dan bersih.** `node:20-alpine`, `npm ci --omit=dev`, `.dockerignore` membuang `test/`, `docs/`, `data/`, folder skill, dan `.git`.
- **Secret tidak masuk Git.** `NUTRANTARA_ADMIN_PIN` memakai `sync: false` di `render.yaml`, dan server menolak berjalan di produksi tanpa PIN 6–64 karakter. PIN di CI hanya PIN palsu (`ci-pin-123456`).
- **Deploy sudah aman untuk data.** Render mengirim SIGTERM saat mengganti versi, dan `server.js` menangkapnya (`shutdown` → `flushDb()` lalu `backupDb()`). Artinya setiap deploy otomatis membuat satu cadangan di `/data/backup` bila ada perubahan sejak cadangan terakhir.
- **Cadangan tiga lapis sudah ada:** cadangan bergulir di aplikasi (tiap 30 menit, 48 berkas, `NUTRANTARA_BACKUP_KEEP`), snapshot disk Render (harian, 7 hari), dan ekspor guru dari panel admin.

### 1.3 Celah

| # | Celah | Akibat |
| :-- | :-- | :-- |
| 1 | Render auto-deploy tidak menunggu CI | Commit yang gagal uji tetap tayang ke kelas |
| 2 | Tidak ada staging | Perubahan pertama kali dicoba di depan siswa |
| 3 | Deploy terjadi kapan pun ada push | Server berhenti beberapa detik saat jam pelajaran; siswa terputus |
| 4 | Perubahan dokumen ikut men-deploy | Edit `docs/` atau `*.md` tetap memicu build dan jeda server |
| 5 | Node 20 (CI dan Dockerfile) | Sudah EOL sejak 30 April 2026, tidak dapat perbaikan keamanan |
| 6 | `actions/checkout@v4` dan `setup-node@v4` | Berjalan di runtime Node 20 milik Actions yang sedang dihentikan GitHub |
| 7 | Tidak ada lint | Hanya `node --check` (sintaks). Variabel tak terdefinisi, typo nama fungsi, dan berkas yang lupa didaftarkan di `STATIC` baru ketahuan saat dipakai |
| 8 | Tidak ada pemindaian keamanan | Kerentanan di `ws`, image dasar Alpine, atau secret yang tak sengaja ter-commit tidak terdeteksi |
| 9 | Tidak ada tag rilis | Tidak jelas versi mana yang sedang dipakai kelas, rollback harus menebak commit |
| 10 | `main` belum dilindungi | Push langsung tanpa PR dan tanpa CI hijau dimungkinkan |
| 11 | Tidak ada uji kompatibilitas data | Rilis yang mengubah bentuk `classroom.json` bisa gagal membaca data kelas yang ada, dan rollback kode tidak mengembalikan data |

---

## 2. Pipeline target

### 2.1 Gambaran

```
cabang fitur ──PR──▶ main ───────────────▶ STAGING (otomatis, setelah CI lulus)
     │                │                      nutrantara-staging.onrender.com
     │                │                      paket gratis, tanpa disk, data uji saja
     ▼                ▼
   CI (setiap PR dan push ke main)
   1. lint          ESLint + node --check + cek daftar STATIC
   2. uji           npm test di Node 22 dan 24
   3. build image   docker build, uji /health dengan /data milik root
   4. scan          npm audit (runtime), Trivy (image), gitleaks (secret)

rilis: tag vX.Y.Z di main ──▶ workflow "Rilis" (manual)
   1. cek tag = package.json version, CI commit itu hijau
   2. cek staging sehat menjalankan commit yang sama
   3. penjaga jam pelajaran (tolak Senin–Jumat 06.30–15.30 WIB kecuali dipaksa)
   4. persetujuan manual (GitHub Environment "produksi")
   5. dorong commit ke cabang `produksi` ──▶ PRODUKSI (Render, Starter + disk)
   6. tunggu /health produksi: ok, storage true, commit cocok
```

### 2.2 Tahapan dan alasan

| Tahap | Kapan jalan | Alat | Gagal berarti |
| :-- | :-- | :-- | :-- |
| Lint | PR, push `main` | ESLint (flat config), `node --check`, skrip `cek-static` | PR tidak bisa digabung |
| Uji | PR, push `main` | `npm test` (smoke test sungguhan) di matriks Node 22 dan 24 | PR tidak bisa digabung |
| Build image | PR, push `main` | `docker build` + uji `/health` dengan bind mount milik root | PR tidak bisa digabung |
| Scan keamanan | PR, push `main`, dan terjadwal mingguan | `npm audit --omit=dev`, Trivy, gitleaks, Dependabot | Tingkat *high/critical*: PR ditahan. Lainnya: peringatan |
| Staging | Setelah CI hijau di `main` | Render `autoDeployTrigger: checksPass` | Tidak boleh rilis ke produksi |
| Produksi | Manual, lewat tag | Workflow "Rilis" + GitHub Environment | Tetap di versi lama |

---

## 3. Lint

Proyek ini sengaja tanpa build dan bundler. Lint harus mengikuti itu: tanpa TypeScript, tanpa Prettier wajib, tanpa mengubah cara berkas dimuat.

### 3.1 ESLint minimal

Tambahkan `eslint`, `@eslint/js`, dan `globals` sebagai `devDependencies` (tidak masuk image karena `npm ci --omit=dev`). Usulan `eslint.config.js`:

```js
// USULAN — belum diterapkan
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['vendor/**', 'node_modules/**', 'data/**', 'anthropic-skills/**', 'blender-skills/**', 'ponytail/**', 'ui-ux-pro-max-skill/**'] },
  js.configs.recommended,
  {
    // Server dan uji: CommonJS di Node.
    files: ['server.js', 'test/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node }
  },
  {
    // Skrip klasik browser yang juga dimuat server lewat vm: hanya boleh menulis ke window.*.
    files: ['missions.js', 'world-data.js', 'net.js', 'game.js', 'world.js', 'map-art.js', 'team.js', 'splash.js', 'landing.js', 'admin.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } }
  },
  {
    // Modul ES browser.
    files: ['app.js', 'world3d.js', 'characters.js', 'quest.js', 'fx.js', 'absorb.js', 'lab.js', 'region.js', 'culture.js', 'peta3d.js', 'sky.js', 'causal.js', 'claims.js', 'archive.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.browser } }
  },
  {
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
];
```

Pembagian berkas di atas harus dicocokkan dulu dengan `play.html`, `index.html`, dan `admin.html` saat diterapkan. Mulai dengan aturan `recommended` saja. Jika muncul banyak temuan di kode lama, perbaiki di PR terpisah sebelum lint dijadikan wajib, atau jalankan dulu dengan `--max-warnings` longgar.

### 3.2 Cek khusus proyek

Dua aturan dari `CLAUDE.md` yang paling sering terlupa dan hanya ketahuan di server kelas. Keduanya layak jadi pemeriksaan otomatis (skrip kecil di `test/`, dipanggil dari `npm test` atau `npm run lint`):

1. **Daftar `STATIC` lengkap.** Setiap `src`/`href` lokal di `play.html`, `index.html`, `admin.html`, dan setiap `import './x.js'` di modul harus ada di peta `STATIC` di `server.js`. Kalau tidak, berkas itu 404 di server kelas walaupun jalan dari `file://`.
2. **`missions.js` dan `world-data.js` tetap skrip biasa.** Tidak boleh ada `import`/`export` atau akses DOM, karena server memuatnya lewat `vm`. Smoke test sudah memuatnya, tetapi pesan galatnya tidak menjelaskan sebabnya.

---

## 4. Uji

- **Pertahankan `test/smoke.js` sebagai uji utama.** Ia menguji server sungguhan, dan itu yang paling penting untuk game kelas.
- **Matriks Node 22 dan 24** di CI. Produksi berjalan di 24, sedangkan laptop guru (mode LAN) mungkin masih di 22. Lihat bagian 8.
- **Uji kompatibilitas data (baru).** Simpan satu berkas `test/fixtures/classroom-v1.json` berisi data **sintetis** (alias buatan, bukan data siswa asli) dalam bentuk `version: 1` sekarang. Uji tambahan: jalankan server dengan folder data berisi fixture itu, pastikan akun bisa masuk, progres terbaca, dan nilai sama. Setiap kali bentuk data berubah, tambahkan fixture versi baru dan pertahankan yang lama. Ini yang membuat rollback kode aman (bagian 6).
- **Uji cadangan rusak.** Satu kasus: `classroom.json` berisi JSON rusak plus satu cadangan valid di `backup/`. Server harus memulihkan dari cadangan dan `/health` melaporkan `recovery: "backup"`. Logika ini sudah ada di `server.js`, tinggal dijaga oleh uji.
- **Uji pasca-deploy di staging (ringan).** Setelah staging menyala: `GET /health` (`ok: true`), `GET /play` status 200, buka WebSocket `/ws` dan terima `welcome`. Bisa memakai ulang fungsi `client()` dari `smoke.js` dengan alamat dari variabel lingkungan.
- **Uji manual tetap ada** (daftar periksa di `docs/DEPLOY.md`): 3D Tinggi, 3D Ringan, 2D, dan 2 siswa + 1 guru. Lakukan di staging sebelum menekan tombol rilis.

---

## 5. Build image dan scan keamanan

### 5.1 Build

- Tetap satu `Dockerfile`. Ganti dasar ke `node:24-alpine` (bagian 8).
- Uji `/health` dengan `/data` milik root tetap dipertahankan persis seperti sekarang.
- Render tetap membangun image sendiri dari Git (`runtime: docker`). CI membangun image untuk **menguji**, bukan untuk dikirim. Pilihan "bangun sekali, kirim image yang sama ke staging dan produksi" lewat GHCR dibahas di bagian 9 sebagai tahap lanjut.
- Tambahkan `buildFilter` di `render.yaml` agar perubahan `docs/**` dan `*.md` tidak memicu build dan jeda server.

### 5.2 Scan

| Apa | Alat | Ambang gagal | Catatan |
| :-- | :-- | :-- | :-- |
| Dependensi runtime | `npm audit --omit=dev --audit-level=high` | high/critical | Hanya `ws` di runtime, jadi hampir selalu bersih. `three` hanya dev |
| Image (OS + Node) | Trivy (`aquasecurity/trivy-action`) | critical yang ada perbaikannya (`ignore-unfixed: true`) | Menangkap CVE Alpine/OpenSSL di image dasar |
| Secret di Git | gitleaks | ada temuan | Menjaga agar PIN, token Render, atau deploy hook tidak pernah ter-commit |
| Kode | CodeQL (`javascript`) | peringatan saja di awal | Gratis untuk repo publik. Untuk repo privat butuh GitHub Advanced Security, jadi lewati bila privat |
| Pembaruan | Dependabot | tidak ada | PR mingguan untuk npm, GitHub Actions, dan image Docker |
| Konfigurasi | `docker run` CI sebagai root lalu cek `ps` menunjukkan proses `node` | proses berjalan sebagai root | Menjaga agar perubahan Dockerfile tidak membuat server berjalan sebagai root |

Jalankan scan juga terjadwal seminggu sekali (Senin pagi), karena CVE baru muncul walau kode tidak berubah.

---

## 6. Staging, produksi, dan rollback di Render

### 6.1 Dua layanan dalam satu Blueprint

| | Staging | Produksi |
| :-- | :-- | :-- |
| Nama layanan | `nutrantara-staging` | `nutrantara` (yang sudah ada) |
| Cabang | `main` | `produksi` |
| Pemicu deploy | `autoDeployTrigger: checksPass` (setelah CI hijau) | `autoDeployTrigger: checksPass`, tetapi cabang `produksi` hanya diubah workflow Rilis |
| Paket | Free | Starter |
| Disk | Tidak ada (data hilang saat restart, memang begitu) | 1 GB di `/data` |
| Data | Akun uji buatan saja | Data kelas asli |
| PIN admin | PIN sendiri, berbeda dari produksi | PIN produksi |
| Region | Singapura | Singapura |

Aturan keras: **jangan pernah menyalin data kelas asli ke staging.** Staging gratis tidak punya disk dan bisa diakses siapa pun yang tahu alamatnya. Untuk mencoba data mirip asli, gunakan fixture sintetis (bagian 4).

Usulan `render.yaml`:

```yaml
# USULAN — belum diterapkan. Isi NUTRANTARA_ADMIN_PIN tiap layanan di dasbor Render.
services:
  - type: web
    name: nutrantara
    runtime: docker
    region: singapore          # tidak bisa diubah setelah layanan dibuat
    plan: starter
    branch: produksi           # hanya diubah oleh workflow Rilis
    autoDeployTrigger: checksPass
    healthCheckPath: /health
    buildFilter:
      ignoredPaths: ["docs/**", "**/*.md", "test/**", ".github/**"]
    envVars:
      - key: NUTRANTARA_ADMIN_PIN
        sync: false
      - key: TRUST_PROXY
        value: "1"
    disk:
      name: nutrantara-data
      mountPath: /data
      sizeGB: 1

  - type: web
    name: nutrantara-staging
    runtime: docker
    region: singapore
    plan: free                 # tanpa disk: data hilang saat restart, server tidur setelah ±15 menit sepi
    branch: main
    autoDeployTrigger: checksPass
    healthCheckPath: /health
    buildFilter:
      ignoredPaths: ["docs/**", "**/*.md"]
    envVars:
      - key: NUTRANTARA_ADMIN_PIN
        sync: false
      - key: TRUST_PROXY
        value: "1"
```

Catatan saat menerapkan:

- Periksa nama dan nilai `autoDeployTrigger` dan `buildFilter` terhadap dokumentasi Blueprint Render terbaru sebelum menggabungkan. Kolom lama `autoDeploy: true/false` juga masih ada.
- `checksPass` membuat Render menunggu status check GitHub di commit itu. Commit di `produksi` adalah commit yang sama dengan di `main`, jadi check-nya sudah hijau.
- Mengganti cabang layanan produksi dari `main` ke `produksi` lewat sinkronisasi Blueprint **tidak** menyentuh disk, tetapi buat cabang `produksi` dulu dari commit yang sedang tayang agar sinkronisasi tidak memicu deploy versi lain.

### 6.2 Workflow Rilis

Rilis = membuat tag `vX.Y.Z` di `main` (sama dengan `version` di `package.json`), lalu menjalankan workflow "Rilis" dengan tag itu. Workflow:

1. Memastikan tag ada di riwayat `main` dan `package.json` versinya cocok.
2. Memastikan CI commit itu hijau (`gh api .../commits/<sha>/check-runs`).
3. Memastikan staging sehat (`/health` ok). Bila `/health` sudah melaporkan commit (usulan 6.4), pastikan staging menjalankan commit yang sama.
4. **Penjaga jam pelajaran.** Menolak Senin–Jumat pukul 06.30–15.30 WIB kecuali input `paksa: true` (untuk perbaikan darurat). Sesuaikan jam dengan jadwal sekolah.
5. Menunggu persetujuan di GitHub Environment `produksi` (pemilik repo sebagai *required reviewer*).
6. Memindahkan cabang `produksi` ke commit tag (`git push --force-with-lease origin <sha>:refs/heads/produksi`). Render melihat perubahan dan men-deploy.
7. Menunggu `/health` produksi sampai `ok: true` dan `storage: true` (maksimal 10 menit), lalu menulis ringkasan di halaman run.

### 6.3 Rollback

**Rollback kode** (pilih yang tercepat):

1. **Dasbor Render → layanan `nutrantara` → Events → deploy sebelumnya → Rollback.** Paling cepat karena memakai image yang sudah dibangun. Sesudahnya, periksa apakah auto-deploy masih aktif di pengaturan layanan, lalu samakan cabang `produksi` dengan versi yang dipulihkan (jalankan Rilis dengan tag lama) agar push berikutnya tidak membawa kembali versi rusak.
2. **Jalankan workflow Rilis dengan tag sebelumnya.** Lebih lambat (Render membangun ulang), tetapi riwayat cabang `produksi` langsung benar.

Kedua cara membuat jeda beberapa detik, sama seperti deploy biasa.

**Rollback data** (terpisah, jarang perlu):

- Rollback kode **tidak** mengembalikan `/data/classroom.json`. Itu sebabnya setiap rilis harus tetap bisa dibaca versi sebelumnya (aturan kompatibilitas di 7.2).
- Bila data rusak oleh rilis: hentikan masalahnya dulu (rollback kode), lalu pulihkan berkas dari `/data/backup/` lewat Render Shell (salin `classroom-<waktu>.json` terakhir sebelum rilis menjadi `classroom.json`, lalu restart). Setiap deploy sudah membuat cadangan saat SIGTERM, jadi berkas "tepat sebelum rilis" biasanya tersedia.
- Pilihan terakhir: **pulihkan snapshot disk Render** (harian, 7 hari). Ini mengembalikan seluruh disk, termasuk semua progres siswa sejak snapshot, jadi hanya bila cara di atas gagal.

### 6.4 Usulan kecil untuk `server.js` (bukan bagian dokumen ini)

Tambahkan `commit: process.env.RENDER_GIT_COMMIT || null` dan `version` dari `package.json` ke respons `/health`. Dengan itu workflow Rilis bisa memastikan produksi benar-benar menjalankan commit yang dirilis, dan guru bisa melihat versi yang sedang dipakai.

---

## 7. Secret dan data

### 7.1 Secret

| Secret | Disimpan di | Dipakai oleh | Rotasi |
| :-- | :-- | :-- | :-- |
| `NUTRANTARA_ADMIN_PIN` produksi | Dasbor Render (env var layanan `nutrantara`, `sync: false`) | Server | Setiap semester, dan segera bila bocor |
| `NUTRANTARA_ADMIN_PIN` staging | Dasbor Render (layanan staging) | Server staging | Bebas, tetapi **harus berbeda** dari produksi |
| PIN CI | Ditulis langsung di workflow (`ci-pin-123456`) | Uji | Tidak perlu; bukan rahasia |
| `RENDER_API_KEY` (bila workflow memakai API Render) | GitHub Environment `produksi` → secrets | Workflow Rilis | Tahunan |
| URL deploy hook (bila dipakai) | GitHub Environment secrets | Workflow Rilis | Bila bocor, buat ulang di Render |

Aturan:

- Secret produksi hanya di **Environment** `produksi`, bukan secret tingkat repo, agar hanya job yang sudah disetujui yang bisa membacanya.
- Workflow memakai `permissions:` minimum. CI: `contents: read`. Rilis: `contents: write` hanya di job yang memindahkan cabang.
- Jangan menulis PIN ke log. `server.js` sudah tidak mencetak PIN di produksi; workflow juga tidak boleh `echo` secret.
- gitleaks di CI menjaga agar tidak ada secret yang ter-commit (bagian 5.2).
- Untuk repo publik: workflow dari fork tidak pernah mendapat secret (perilaku bawaan `pull_request`). Jangan memakai `pull_request_target` untuk menjalankan kode PR.

### 7.2 Cadangan data dan kompatibilitas rilis

Cadangan sendiri sudah dirancang di `docs/arsitektur/kajian/ARSITEKTUR_DATABASE.md` bagian 7. Tugas CI/CD hanya menjaga agar rilis tidak merusaknya:

1. **Setiap deploy = satu cadangan.** Sudah terjadi lewat SIGTERM → `backupDb()`. Jangan ubah `shutdown()` tanpa uji yang memastikan ini tetap terjadi.
2. **Aturan kompatibilitas dua arah.** Rilis N harus bisa membaca data rilis N−1 (diuji fixture). Rilis N sebaiknya tidak menulis bentuk data yang membuat rilis N−1 gagal membaca. Bila perubahan bentuk tidak bisa dihindari, naikkan `db.version`, buat versi lama menolak dengan pesan jelas (bukan menimpa), dan catat di catatan rilis bahwa rollback kode perlu pemulihan cadangan.
3. **Sebelum rilis yang mengubah bentuk data:** guru mengunduh ekspor dari panel admin (lapisan cadangan di luar server), dan pastikan snapshot Render hari itu sudah ada.
4. **Tidak ada unggahan cadangan otomatis ke layanan awan lain** dari workflow. Itu memindahkan data siswa ke tempat baru dan butuh keputusan sekolah (sejalan dengan `ARSITEKTUR_DATABASE.md` 7.3 butir 6).
5. **Saat pindah ke SQLite nanti,** cadangan memakai `VACUUM INTO` dan uji fixture ditambah satu fixture `.db`. Pipeline lain tidak berubah.

---

## 8. Naik ke Node 24

### 8.1 Mengapa sekarang

| Versi | Status per November 2026 |
| :-- | :-- |
| Node 18 | EOL (April 2025) |
| Node 20 | EOL (30 April 2026), **dipakai CI dan Dockerfile sekarang** |
| Node 22 | Maintenance LTS sampai April 2027 |
| Node 24 | Active LTS, didukung sampai April 2028 |

### 8.2 Dampak ke kode

Kecil. `server.js` hanya memakai modul inti `http`, `fs`, `path`, `crypto`, `os`, `vm`, dan `ws`. Tidak ditemukan API usang (`url.parse`, `new Buffer`, `util.is*`, `punycode`, `process.binding`). `test/smoke.js` memakai `fetch` global dan `ws`, keduanya jalan di Node 24. `ws` 8.23 mendukung Node 24. Node 24 membawa npm 11; `package-lock.json` versi 3 tetap terbaca.

Yang tetap perlu diperhatikan: `scrypt` dan `crypto.randomInt` memakai OpenSSL 3.5 di Node 24. Hash kata sandi yang sudah tersimpan tetap cocok karena parameternya ada di kode, tetapi uji fixture (bagian 4) dengan akun yang dibuat di Node 20 akan membuktikannya.

### 8.3 Langkah (satu PR)

1. `Dockerfile`: `FROM node:24-alpine`.
2. Tambahkan `.nvmrc` berisi `24`, dan di workflow pakai `node-version-file: .nvmrc` untuk job utama, plus matriks `[22, 24]` untuk job uji.
3. `actions/checkout`, `actions/setup-node`: naik ke `v5` atau lebih baru (berjalan di runtime Node 24 milik Actions).
4. `package.json`: `"engines": { "node": ">=22" }`. Bukan `>=24`, agar laptop guru yang masih Node 22 tetap bisa menjalankan mode LAN. Produksi tetap 24.
5. `docs/DEPLOY.md`: ubah "Node.js 18+" menjadi "Node.js 22 atau lebih baru (disarankan 24 LTS)".
6. Uji: CI hijau di 22 dan 24, image baru lolos uji `/health` dengan `/data` milik root (pastikan `su-exec` masih tersedia di Alpine baru), lalu coba di staging dengan 2 siswa + 1 guru.
7. Rilis seperti biasa di luar jam pelajaran. Rollback: kembalikan baris `FROM` (atau Rollback di Render).

Setelah satu semester stabil, matriks bisa dikurangi menjadi Node 24 saja dan `engines` dinaikkan ke `>=24`.

---

## 9. Strategi cabang

**Trunk-based, satu pengembang utama, cabang pendek.**

| Cabang / ref | Isi | Siapa yang menulis | Perlindungan |
| :-- | :-- | :-- | :-- |
| `main` | Kode terbaru yang lulus CI, otomatis ke staging | Hanya lewat PR | Wajib PR, wajib check `lint`, `uji (22)`, `uji (24)`, `docker`, `keamanan`; tanpa force push; tanpa hapus |
| `fitur/<nama>`, `perbaikan/<nama>`, `dok/<nama>` | Satu perubahan, umur beberapa hari | Pengembang (atau Claude) | Tidak ada |
| `produksi` | Commit yang sedang dipakai kelas | Hanya workflow Rilis | Tanpa push langsung kecuali dari GitHub Actions; tanpa hapus |
| Tag `vX.Y.Z` | Titik rilis, sama dengan `package.json` | Pengembang | Aturan tag (ruleset) melarang hapus/ubah tag `v*` |

Aturan kerja:

- **Gabung dengan squash**, judul PR dalam bahasa Indonesia, satu PR satu tujuan.
- **Versi** mengikuti `MEMORY.md`: naik minor untuk fitur besar (0.9 → 1.0 regu proyek), naik patch untuk perbaikan. Ubah `version` di `package.json` di PR terakhir sebelum rilis, lalu buat tag dari commit hasil gabungan.
- **Perbaikan darurat** saat `main` berisi pekerjaan yang belum siap dirilis: buat `perbaikan/<nama>` dari tag yang sedang tayang, buka PR ke `main` seperti biasa, dan rilis tag patch dari cabang itu (workflow Rilis menerima tag yang tidak di `main` hanya bila input `darurat: true`). Setelah itu pastikan perbaikan juga ada di `main`.
- **Cabang `produksi` tidak pernah dikerjakan langsung.** Ia hanya penunjuk.
- Folder skill lokal (`anthropic-skills/`, `blender-skills/`, `ponytail/`, `ui-ux-pro-max-skill/`) tetap di `.gitignore` dan tidak ikut CI.

---

## 10. Urutan penerapan

| Langkah | Isi | Risiko | Dampak |
| :-- | :-- | :-- | :-- |
| 1 | Lindungi `main` (ruleset), buat cabang `produksi` dari commit yang sedang tayang | Tidak ada | Tidak ada push langsung |
| 2 | Di layanan produksi sekarang: ubah auto-deploy ke "setelah CI lulus" dan tambahkan `buildFilter` | Rendah | Menutup celah 1 dan 4 segera |
| 3 | PR Node 24 (bagian 8), sekaligus ganti nama `blank.yml` menjadi `ci.yml` | Rendah | Menutup celah 5 dan 6 |
| 4 | PR lint + cek `STATIC` + uji fixture data | Rendah, mungkin perlu bersih-bersih kode lama | Menutup celah 7 dan 11 |
| 5 | PR scan keamanan + Dependabot | Rendah | Menutup celah 8 |
| 6 | Layanan staging + workflow Rilis + Environment `produksi` + pindahkan produksi ke cabang `produksi` | Sedang (mengubah cara deploy) | Menutup celah 2, 3, 9 |
| 7 | (Opsional) `/health` melaporkan commit dan versi | Rendah | Workflow Rilis bisa memverifikasi versi |
| 8 | (Opsional, lanjut) bangun image sekali di CI, kirim ke GHCR, Render memakai image itu | Sedang | Staging dan produksi memakai image yang sama persis; butuh kredensial registry di Render bila repo privat |

Langkah 1–2 bisa dikerjakan hari ini dari dasbor GitHub dan Render tanpa mengubah kode. Biaya tambahan seluruh rencana: nol, karena staging memakai paket gratis dan semua alat scan gratis untuk kebutuhan ini (kecuali CodeQL untuk repo privat).

---

## Lampiran A. Usulan workflow CI (`.github/workflows/ci.yml`)

```yaml
# USULAN — menggantikan blank.yml. Belum diterapkan.
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Periksa sintaks
        run: for f in *.js test/*.js; do node --check "$f"; done
      - name: ESLint
        run: npx eslint .
      - name: Daftar STATIC lengkap
        run: node test/cek-static.js

  uji:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [22, 24]
    name: uji (${{ matrix.node }})
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - name: Uji server kelas (termasuk fixture data)
        run: npm test

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Build image
        run: docker build -t nutrantara:ci .
      - name: Jalankan & cek /health (disk data milik root, seperti disk permanen Render)
        run: |
          docker run -d --name nt -p 3000:3000 -v "$RUNNER_TEMP/nt-data:/data" -e NUTRANTARA_ADMIN_PIN=ci-pin-123456 nutrantara:ci
          for i in $(seq 1 20); do
            if curl -fs http://localhost:3000/health | grep -q '"storage":true'; then ok=1; break; fi
            sleep 1
          done
          if [ -z "$ok" ]; then curl -s http://localhost:3000/health || true; docker logs nt; exit 1; fi
      - name: Server tidak berjalan sebagai root
        run: test "$(docker exec nt sh -c 'ps -o user= -p 1' | tr -d ' ')" != root || { docker exec nt ps; exit 1; }
      - name: Scan image (Trivy)
        uses: aquasecurity/trivy-action@0.28.0   # sematkan ke SHA saat diterapkan
        with:
          image-ref: nutrantara:ci
          severity: CRITICAL
          ignore-unfixed: true
          exit-code: "1"

  keamanan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
      - name: Audit dependensi runtime
        run: npm audit --omit=dev --audit-level=high
      - name: Cari secret (gitleaks)
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Catatan: pemeriksaan "bukan root" di atas melihat PID 1. Karena `ENTRYPOINT` memakai `exec su-exec node`, PID 1 seharusnya proses `node` milik user `node`. Sesuaikan perintahnya bila Dockerfile berubah. Versi action pihak ketiga (Trivy, gitleaks) sebaiknya disematkan ke SHA commit, dan Dependabot akan memperbaruinya.

## Lampiran B. Usulan workflow keamanan terjadwal (`.github/workflows/keamanan.yml`)

```yaml
# USULAN — belum diterapkan.
name: Keamanan mingguan

on:
  schedule:
    - cron: "0 0 * * 1"   # Senin 07.00 WIB
  workflow_dispatch:

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
      - run: npm audit --omit=dev --audit-level=moderate
      - run: docker build -t nutrantara:scan .
      - uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: nutrantara:scan
          severity: HIGH,CRITICAL
          ignore-unfixed: true
          exit-code: "1"
```

Kegagalan di sini mengirim email bawaan GitHub ke pemilik repo. Perbaikannya biasanya cukup menggabungkan PR Dependabot untuk image dasar.

## Lampiran C. Usulan Dependabot (`.github/dependabot.yml`)

```yaml
# USULAN — belum diterapkan.
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly, day: monday }
    open-pull-requests-limit: 5
    ignore:
      # three disalin manual ke vendor/ lewat `npm run vendor`; naikkan dengan sengaja, bukan otomatis.
      - dependency-name: three
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly, day: monday }
  - package-ecosystem: docker
    directory: /
    schedule: { interval: weekly, day: monday }
    ignore:
      # Tetap di jalur LTS 24; naik mayor dengan sengaja.
      - dependency-name: node
        update-types: ["version-update:semver-major"]
```

## Lampiran D. Usulan workflow Rilis (`.github/workflows/rilis.yml`)

```yaml
# USULAN — belum diterapkan. Butuh: cabang `produksi`, Environment `produksi` dengan required reviewer,
# dan variabel Environment URL_PRODUKSI / URL_STAGING (contoh: https://nutrantara.onrender.com).
name: Rilis ke produksi

on:
  workflow_dispatch:
    inputs:
      tag:
        description: "Tag yang dirilis, mis. v1.0.1"
        required: true
      paksa:
        description: "Abaikan penjaga jam pelajaran (darurat)"
        type: boolean
        default: false
      darurat:
        description: "Izinkan tag yang tidak ada di main (perbaikan darurat)"
        type: boolean
        default: false

permissions:
  contents: read
  checks: read

concurrency:
  group: rilis-produksi
  cancel-in-progress: false

jobs:
  periksa:
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ steps.sha.outputs.sha }}
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - id: sha
        name: Tag ada dan cocok dengan package.json
        run: |
          TAG="${{ inputs.tag }}"
          SHA=$(git rev-list -n1 "refs/tags/$TAG") || { echo "Tag $TAG tidak ada"; exit 1; }
          VER=$(git show "$SHA:package.json" | node -pe 'JSON.parse(require("fs").readFileSync(0)).version')
          [ "v$VER" = "$TAG" ] || { echo "package.json versi $VER, tag $TAG"; exit 1; }
          if [ "${{ inputs.darurat }}" != "true" ]; then
            git merge-base --is-ancestor "$SHA" origin/main || { echo "Tag tidak ada di main"; exit 1; }
          fi
          echo "sha=$SHA" >> "$GITHUB_OUTPUT"
      - name: CI commit ini hijau
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh api "repos/${{ github.repository }}/commits/${{ steps.sha.outputs.sha }}/check-runs" \
            --jq '[.check_runs[] | select(.name != "periksa" and .name != "deploy")] |
                  (length > 0) and all(.conclusion == "success" or .conclusion == "skipped")' | grep -q true \
            || { echo "CI belum hijau untuk commit ini"; exit 1; }
      - name: Penjaga jam pelajaran (WIB)
        if: ${{ !inputs.paksa }}
        run: |
          HARI=$(TZ=Asia/Jakarta date +%u)   # 1=Senin … 7=Minggu
          JAM=$(TZ=Asia/Jakarta date +%H%M)
          if [ "$HARI" -le 5 ] && [ "$JAM" -ge 0630 ] && [ "$JAM" -le 1530 ]; then
            echo "Sekarang jam pelajaran (Senin–Jumat 06.30–15.30 WIB). Deploy membuat server berhenti beberapa detik."
            echo "Jalankan lagi di luar jam itu, atau centang 'paksa' untuk perbaikan darurat."
            exit 1
          fi
      - name: Staging sehat
        run: curl -fs "${{ vars.URL_STAGING }}/health" | grep -q '"ok":true'

  deploy:
    needs: periksa
    runs-on: ubuntu-latest
    environment:
      name: produksi
      url: ${{ vars.URL_PRODUKSI }}/play
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - name: Pindahkan cabang produksi ke tag
        run: git push --force-with-lease=produksi origin "${{ needs.periksa.outputs.sha }}:refs/heads/produksi"
      - name: Tunggu produksi sehat
        run: |
          sleep 60   # beri waktu Render memulai build
          for i in $(seq 1 60); do
            BODY=$(curl -fs "${{ vars.URL_PRODUKSI }}/health" || true)
            echo "$BODY" | grep -q '"storage":true' && echo "$BODY" | grep -q '"ok":true' && { echo "Sehat: $BODY"; exit 0; }
            sleep 10
          done
          echo "Produksi belum sehat setelah ±11 menit. Periksa log Render dan pertimbangkan Rollback (docs/ARSITEKTUR_CICD.md 6.3)."
          exit 1
      - name: Ringkasan
        run: |
          echo "### Rilis ${{ inputs.tag }}" >> "$GITHUB_STEP_SUMMARY"
          echo "Commit: ${{ needs.periksa.outputs.sha }}" >> "$GITHUB_STEP_SUMMARY"
```

Keterbatasan yang disengaja: langkah "tunggu produksi sehat" belum bisa membedakan versi lama dan baru sampai `/health` melaporkan commit (usulan 6.4). Sebelum itu, buka halaman Events di Render untuk memastikan deploy baru selesai. Bila ruleset `produksi` melarang push, tambahkan GitHub Actions sebagai pengecualian (*bypass*) hanya untuk cabang itu.
