# Arsitektur NUTRANTARA

*Diperbarui 28 November 2026 untuk NUTRANTARA 1.7 (Rekap Jawaban Siswa). Semua dokumen di folder ini ditulis dari kode yang ada sekarang, bukan dari rancangan umum. Nama berkas, fungsi, dan pesan WebSocket merujuk ke repo ini.*

NUTRANTARA adalah game belajar Biologi kelas XI (sistem pencernaan) untuk Project Based Learning: kepulauan melayang 3D (Three.js) yang dimainkan regu 1–4 siswa di server kelas Node.js, dengan panel guru. Tanpa server, game tetap jalan sebagai satu pemain.

## Peta dokumen

| # | Dokumen | Menjawab pertanyaan |
| --: | :-- | :-- |
| 1 | [Arsitektur Sistem](01_SISTEM.md) | Bagian apa saja yang ada, di mana jalannya, dan bagaimana tersambung? |
| 2 | [Arsitektur Kode](02_KODE.md) | Berkas mana berisi apa, dan aturan apa yang menjaga batas antarberkas? |
| 3 | [Kerangka App](03_KERANGKA_APP.md) | Bagaimana halaman, fase, layar, dan state aplikasi disusun? |
| 4 | [Kerangka Game](04_KERANGKA_GAME.md) | Bagaimana sistem permainan (misi, skor, regu, RPG, Kampung, Butik, Bos) saling terkait? |
| 5 | [Arsitektur Game](05_GAME.md) | Apa inti gameplay, siklus main, dan aturan nilainya? |
| 6 | [Arsitektur Game Engine](06_GAME_ENGINE.md) | Bagaimana mesin 3D buatan sendiri di atas Three.js bekerja per frame? |
| 7 | [Arsitektur Level](07_LEVEL.md) | Bagaimana dunia, pos, pulau, medan blok, cuaca, dan musim dibangun? |
| 8 | [Arsitektur Design](08_DESIGN.md) | Tema visual, budaya, audio, HUD, dan aksesibilitas |
| 9 | [Arsitektur Lobby](09_LOBBY.md) | Apa yang terjadi antara masuk akun dan terjun ke dunia? |
| 10 | [Arsitektur Game Loading](10_LOADING.md) | Urutan muat dari splash beranda sampai frame pertama |
| 11 | [Arsitektur RBAC](11_RBAC.md) | Siapa boleh melakukan apa, dan di mana itu ditegakkan? |
| 12 | [Arsitektur CI/CD](12_CICD.md) | Bagaimana kode diuji, dibangun, dan sampai ke kelas? |

## Kajian mendalam (23 November 2026, versi 1.0)

Folder [`kajian/`](kajian/) berisi kajian panjang yang lebih dulu ditulis: [server](kajian/ARSITEKTUR_SERVER.md), [database](kajian/ARSITEKTUR_DATABASE.md), [kode](kajian/ARSITEKTUR_KODE.md), [UI/UX](kajian/ARSITEKTUR_UIUX.md), [CI/CD](kajian/ARSITEKTUR_CICD.md), [matriks RBAC](kajian/RBAC_MATRIKS.md), dan [kerangka app](kajian/KERANGKA_APP.md). Isinya tetap berlaku sebagai analisis dan usulan (migrasi SQLite, pemisahan `server.js`, staging), tetapi angka baris dan daftar fitur berhenti di versi 1.0. Dokumen 1–12 di atas adalah gambaran terkini; bila keduanya berbeda, ikuti yang terkini.

Dokumen lain di `docs/`: [PRD](../PRD.md), [DEPLOY](../DEPLOY.md), [REVIEW_KODE](../REVIEW_KODE.md), [KARAKTER](../KARAKTER.md), [PJBL_POS_1-6](../PJBL_POS_1-6.md).

## Prinsip yang berlaku di semua dokumen

1. **Tanpa build.** Skrip klasik + modul ES dimuat langsung oleh peramban. Three.js di-vendor. Tidak ada bundler, framework, atau CDN (CSP `script-src 'self'`).
2. **Luring adalah fitur.** Setiap sistem punya jalur tanpa server (`localStorage`) dan jalur tanpa WebGL (dunia 2D).
3. **Server berwenang atas nilai.** Klien boleh menghitung untuk tampilan, tetapi skor, XP, saldo Butik, Kampung, PjBL, dan jawaban regu dihitung ulang di server dari data bersama.
4. **Aturan ditulis sekali.** Berkas `*-data.js` / `*-core.js` adalah skrip murni tanpa DOM yang dimuat peramban dan server (`loadBrowserScript` lewat `vm`).
5. **Data siswa minimal.** Alias, bukan nama asli. Obrolan bisa dibaca guru.
6. **Orisinal dan Nusantara.** Inspirasi genre boleh, menyalin game lain tidak. Properti budaya, musik, dan masakan daerah dibuat prosedural.
7. **Bahasa Indonesia** untuk semua teks pengguna, komentar, dan dokumen.

## Versi singkat

0.3 multipemain + panel guru → 0.4 3D → 0.5 kepulauan melayang, akun, lobi → 0.6 tema "Nusantara Ceria" → 0.7 sekali jawab + rapor → 0.8 dunia terbuka → 0.9 tiap pos jadi wilayah ±1000×650 m → 1.0 regu PjBL → 1.1 medan blok + cuaca → 1.2 Butik Nusantara → 1.3 PjBL POS 1–6 → 1.4 musim → 1.5 RPG + Bos Mitos Gizi → 1.6 Kampung → 1.7 Rekap Jawaban Siswa. Rincian keputusan ada di `MEMORY.md` di akar repo.
