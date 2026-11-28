# 12. Arsitektur CI/CD

*NUTRANTARA 1.7 · 28 November 2026 · Sumber: `.github/workflows/blank.yml`, `Dockerfile`, `render.yaml`, `test/smoke.js`*

## 12.1 Pipeline sekarang

```
 pengembang ──push/PR──► main (GitHub)
                          ├──► GitHub Actions "CI"
                          │     job test   : Node 20 · npm ci · node --check *.js test/*.js · npm test
                          │     job docker : docker build · run dengan /data milik root · tunggu /health "storage": true
                          └──► Render Blueprint (render.yaml): auto-deploy tiap commit  ⚠ tidak menunggu CI
                                 Docker · Singapura · Starter · disk 1 GB /data · healthCheckPath /health
```

## 12.2 Tahap uji

| Tahap | Menangkap | Tidak menangkap |
| :-- | :-- | :-- |
| `node --check` | Salah sintaks | Variabel tak terdefinisi, berkas lupa di `STATIC` |
| `npm test` (`test/smoke.js`, port 3999, folder data sementara) | Akun, 2 pemain, regu, vote, progres & skor, Butik, PjBL, RPG, Bos, Kampung, rekap, admin, validasi lagu `music-data.js`, batas ukuran | Tampilan, WebGL, interaksi peramban |
| Docker + `/health` | Izin disk Render (root → `node` via `su-exec`), image bisa jalan | Data lama |

## 12.3 Build & rilis

- **Tanpa tahap build.** Image = `node:20-alpine` + `npm ci --omit=dev` + salinan repo (`.dockerignore` membuang `test/`, `docs/`, `data/`, folder skill, `.git`).
- Kontainer mulai sebagai root hanya untuk `chown` folder data, lalu `exec su-exec node`.
- Server menolak jalan di `NODE_ENV=production` tanpa `NUTRANTARA_ADMIN_PIN` (6–64 karakter). PIN diisi di dasbor Render (`sync: false`), CI memakai PIN palsu.
- Saat deploy, Render mengirim SIGTERM → `flushDb()` + `backupDb()`; ada jeda beberapa detik karena disk satu instance.

## 12.4 Perlindungan data lintas rilis

Tiga lapis cadangan: cadangan bergulir aplikasi (30 menit, 48 berkas), snapshot disk Render (harian, 7 hari), ekspor JSON guru. Rilis tidak boleh mengubah id yang tersimpan (lihat [02_KODE.md](02_KODE.md) 2.4) dan harus tetap membaca `classroom.json` lama.

## 12.5 Celah (urut prioritas)

| # | Celah | Akibat |
| --: | :-- | :-- |
| 1 | Render deploy tanpa menunggu CI | Commit gagal uji tetap tayang ke kelas |
| 2 | Deploy kapan saja | Siswa terputus di jam pelajaran |
| 3 | Tidak ada staging | Perubahan pertama kali dicoba di depan siswa |
| 4 | Node 20 sudah EOL (30 April 2026), `actions/*@v4` | Tanpa perbaikan keamanan |
| 5 | Tanpa lint dan pemindaian keamanan | Typo nama, dependensi rentan, secret ter-commit tidak terdeteksi |
| 6 | Tanpa tag rilis, `main` tidak dilindungi | Tidak jelas versi yang dipakai kelas; rollback menebak |
| 7 | Edit `docs/` ikut men-deploy | Jeda server tanpa alasan |

## 12.6 Pipeline target

```
 PR ──► CI: check · lint (ESLint flat, tanpa build) · smoke · uji unit node:test · docker+/health · audit npm
 merge main ──► staging Render (paket gratis, tanpa data siswa), otomatis setelah CI hijau
 tag vX.Y.Z ──► workflow rilis: persetujuan manual · penjaga jam pelajaran (tolak 07.00–15.00 WIB hari sekolah)
               ──► Deploy Hook Render produksi ──► cek /health ──► catat versi
 rollback kode: Render (satu klik ke deploy sebelumnya) · rollback data: cadangan /data/backup
```

Langkah penerapan (masing-masing satu PR): (1) matikan auto-deploy produksi, deploy lewat hook setelah CI; (2) Node 24 di CI dan Dockerfile; (3) lindungi `main`, tag rilis; (4) abaikan `docs/**`/`*.md` untuk deploy; (5) staging; (6) lint + Dependabot + audit; (7) uji kompatibilitas data lama dari salinan `classroom.json` anonim.

Contoh workflow lengkap: [kajian/ARSITEKTUR_CICD.md](kajian/ARSITEKTUR_CICD.md). Langkah deploy manual: [../DEPLOY.md](../DEPLOY.md).
