# 2. Arsitektur Kode

*NUTRANTARA 1.7 · 28 November 2026 · ±23.600 baris JavaScript (tanpa `vendor/`), semua di akar repo*

## 2.1 Empat jenis berkas

| Jenis | Aturan | Contoh |
| :-- | :-- | :-- |
| **A. Data & aturan bersama** (skrip klasik murni) | Hanya menulis `window.*`. Tanpa `import`/`export`, tanpa DOM. Dimuat peramban **dan** server (`loadBrowserScript`, `vm`) dan `test/smoke.js` | `missions.js`, `world-data.js`, `shop-data.js`, `pjbl-data.js`, `pjbl-core.js`, `rpg-data.js`, `kampung-data.js`, `kampung-core.js`, `music-data.js` |
| **A′. Aturan khusus server** | Sama seperti A, tetapi **tidak** ada di `STATIC` | `boss-data.js` (kunci Bos), `rekap-core.js` |
| **B. Skrip klasik peramban** (`defer`) | Menerbitkan satu global `Nutra*`, membaca global lain | `net.js`, `game.js`, `team.js`, `world.js`, `pjbl.js`, `rpg.js`, `kampung.js`, `music.js`, `map-art.js`, `splash.js`, `admin.js`, `admin-rekap.js`, `xlsx.js` |
| **C. Modul ES peramban** | `import` dari `vendor/three/`, membaca global B | `app.js`, `world3d.js`, `quest.js`, `terrain.js`, `region.js`, `weather.js`, `culture.js`, `characters.js`, `fashion.js`, `shop.js`, `boss3d.js`, `kampung3d.js`, `lab.js`, `absorb.js`, `causal.js`, `claims.js`, `archive.js`, `fx.js`, `sky.js`, `peta3d.js`, `landing.js`, `islands.js` |
| **D. Server & uji** (CommonJS) | | `server.js` (1.746 baris), `test/smoke.js` (647 baris, ±170 asersi) |

## 2.2 Peta lapisan

```
 C  app.js ──► world3d.js ──► terrain · region · weather · culture · characters · fashion
    │            │            quest ──► lab · absorb · causal · claims · archive
    │            │            boss3d · kampung3d · fx · sky
    │            └─ window.NutraWorld3D
 B  game.js (state, skor, layar DOM) · net.js (WS) · team.js · pjbl.js · rpg.js · kampung.js · music.js · shop.js
 A  missions · world-data · shop-data · pjbl-data/core · rpg-data · kampung-data/core · music-data
                                     ▲ dimuat juga oleh
 D  server.js ──── vm ───────────────┘   + boss-data · rekap-core (A′)
```

Arah ketergantungan selalu ke bawah: C boleh membaca B dan A, B boleh membaca A, A tidak membaca siapa pun. Server hanya membaca A dan A′.

## 2.3 Berkas terbesar dan isinya

| Berkas | Baris | Isi |
| :-- | --: | :-- |
| `world3d.js` | 2.377 | Renderer, pembangun pulau, 4 mode kamera, input (kibor, mouse, gamepad, sentuh), mode peta/terjun/main, peta mini, Butik kios, Bos, Kampung |
| `server.js` | 1.746 | Konfigurasi, simpan + cadangan, akun, validasi progres, regu, Butik, PjBL, RPG, Kampung, Bos, admin, rekap, HTTP, WS |
| `pjbl-data.js` | 1.680 | Konten PjBL POS 1–6 |
| `game.js` | 1.370 | State & simpan, `gradeChallenge`, layar DOM (peta, misi, dapur, paspor, rapor), sinkron regu |
| `quest.js` | 1.246 | Objek misi di dunia: terminal, papan laporan, altar segel, kartu hasil |
| `missions.js` | 1.175 | Konten 6 pos, kunci jawaban, generator varian (Pos 1: 100, Pos 2: 4), peran regu |

## 2.4 Kontrak antarmodul yang wajib dijaga

| Kontrak | Kenapa |
| :-- | :-- |
| Berkas baru peramban **harus** didaftarkan di `STATIC` di `server.js` | Tanpa itu 404 di server kelas walau jalan di `file://` |
| Berkas A tetap murni | Server dan smoke test memuatnya lewat `vm` dengan `window` palsu |
| `gradeChallenge` (`game.js`) ≡ `isCorrect`/`validateProgress` (`server.js`) | Skor harus sama di dua tempat; ubah keduanya + smoke test |
| `TEAM_KEYS` (`game.js`) ≡ `SHARED_KEYS` (`server.js`) | Bagian data yang dimiliki regu |
| Ubah bentuk state `game.js` → naikkan `SCHEMA_VERSION` | Simpanan lama dibuang bila versi beda |
| Jangan ganti id yang tersimpan | Item Butik, soal PjBL (`p1q1`…), resep/NPC/quest Kampung, soal Bos, urutan shard arsip (tambah di akhir), seed generator varian |
| Modul aktivitas pos memakai pola `createX({ game, openPanel, closePanel, shake, say, nara, onDone })` | `quest.js` bisa memasang aktivitas baru tanpa tahu isinya |
| Event DOM untuk komunikasi lintas jenis | `nutra:outfit`, `nutra:explore`; `net.on(...)` untuk pesan server |

## 2.5 Penanganan error

- Server: setiap pesan WS lewat `routeMessage` dalam `try/catch`; handler yang gagal hanya menggagalkan pesan itu. `handleProgress` menolak bentuk yang bukan objek biasa. Data regu dibatasi `TEAM_LIMIT` (dibatalkan bila lewat). `clientIp` memakai entri X-Forwarded-For paling kanan.
- Klien: `localStorage` selalu dibungkus `try/catch`; tanpa server `net.js` berhenti mencoba dan game tetap jalan; tanpa WebGL pindah ke 2D.

## 2.6 Konvensi

- Satu global per skrip klasik, prefiks `Nutra*` (perilaku) atau `NUTRANTARA_*` (data).
- Bagian dalam berkas besar ditandai `// ---------- Judul ----------`.
- Gaya baru di `theme.css`. Teks dan komentar bahasa Indonesia.
- Tidak ada linter; pemeriksaan = `node --check` + `npm test`.

## 2.7 Utang struktur (urut prioritas)

1. `server.js` mulai sesak: pecah ke `server/` per domain (akun, progres, regu, butik, pjbl, kampung, bos, admin, http) tanpa ubah perilaku, dengan smoke test sebagai penjaga.
2. Satukan aturan skor misi ke satu berkas A (`rules.js`) seperti yang sudah dilakukan untuk PjBL/Kampung/RPG.
3. `world3d.js` (2.377 baris): pisahkan input+kamera dan Butik/Bos/Kampung ke modul sendiri bila sering diubah.
4. Tambah uji unit `node:test` untuk berkas A (murni, mudah diuji).

Rincian: [kajian/ARSITEKTUR_KODE.md](kajian/ARSITEKTUR_KODE.md).
