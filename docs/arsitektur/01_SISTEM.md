# 1. Arsitektur Sistem

*NUTRANTARA 1.7 · 28 November 2026*

## 1.1 Gambaran besar

```
                    ┌──────────────── Peramban ────────────────┐
 Siswa              │ index.html  beranda + splash + peta 3D    │
 (laptop/HP)        │ play.html   akun → lobi → peta → dunia 3D │──┐
                    └───────────────────────────────────────────┘  │  HTTP /api/*  (akun)
 Guru               ┌───────────────────────────────────────────┐  │  WebSocket /ws (game, admin)
 (laptop+proyektor) │ admin.html  panel guru + Rekap Jawaban    │──┤
                    └───────────────────────────────────────────┘  ▼
                    ┌─────────────── server.js (1 proses Node) ───────────────┐
                    │ HTTP statis (daftar putih STATIC, CSP ketat)              │
                    │ API akun (scrypt, sesi 30 hari, rate limit per IP)        │
                    │ WS: routeMessage → handler pemain / regu / admin          │
                    │ Aturan bersama via vm: missions, world-data, shop-data,   │
                    │   pjbl-*, rpg-data, kampung-*, boss-data*, rekap-core*    │
                    │ State di memori: db + conns + boss (event)                │
                    └──────────────┬───────────────────────────────────────────┘
                                   │ debounce 1 s, tulis .tmp → rename, cadangan 30 menit
                                   ▼
                    data/classroom.json  + data/backup/   (Render: disk /data 1 GB)
 * = hanya server, tidak pernah dikirim ke peramban (kunci jawaban bos, rekap)
```

## 1.2 Tiga cara menjalankan

| Mode | Cara | Yang tersedia | Data |
| :-- | :-- | :-- | :-- |
| **Server kelas LAN** | `npm start` di laptop guru, siswa buka URL yang dicetak | Semua fitur, tanpa internet | `data/classroom.json` di laptop |
| **Server daring** | Docker di Render Starter (Singapura) + disk 1 GB | Semua fitur | `/data/classroom.json`, snapshot disk harian |
| **Statis / luring** | Buka `play.html` dari hosting statis atau `file://`, atau server mati | Satu pemain: misi, rapor, PjBL, Kampung, Butik, RPG lokal. Tanpa regu, Bos, obrolan | `localStorage` per alias |

Tanpa WebGL, ketiga mode jatuh ke dunia 2D (`world.js`).

## 1.3 Komponen dan tanggung jawab

| Komponen | Berwenang atas | Tidak berwenang atas |
| :-- | :-- | :-- |
| Peramban siswa | Render, input, kamera, cuaca (dihitung dari `Date.now`, sama di semua klien), musik, buff makanan | Skor, XP, saldo, posisi akhir, pulau yang terbuka |
| `server.js` | Akun, posisi (dijepit `WORLD.clamp` + `allowedIslands`), skor (`validateProgress`), data regu (`overlayTeam`), Butik, PjBL, Kampung, RPG, Bos, pengaturan kelas | Tampilan |
| Panel guru | Pengaturan kelas dan moderasi lewat pesan `admin` | Tidak bisa menulis jawaban siswa |
| Disk | Ketahanan data | Tidak ada logika |

## 1.4 Aliran data utama

1. **Akun.** `POST /api/register|login` → token sesi → WS `join` → `welcome` (pemain, pengaturan, progres, wardrobe, pjbl, kampung, rpg).
2. **Gerak.** Klien `move` ±10×/s → server jepit → siaran `positions` 10×/s berisi tuple `[id, x, y, seals, activePos, h, inWorld, level]`.
3. **Progres.** `saveState` di `game.js` → `progress` (state penuh, maks 96 KB) + `team-op` (selisih bagian regu) → server overlay regu → `validateProgress` → `progress-sync`.
4. **Sistem berbasis aksi.** `shop`, `pjbl`, `kampung`, `boss`, `explore`, `team-vote`: klien mengirim **aksi**, server menjalankan aturan bersama dan membalas state baru. Klien tidak pernah mengirim angka hasil.
5. **Guru.** `admin-auth` (PIN) → `admin` sub-perintah → ringkasan 1×/s, `admin-rekap` saat diminta.

## 1.5 Batas dan kapasitas

| Batas | Nilai | Sumber |
| :-- | :-- | :-- |
| Pemain per instance | 60 (`NUTRANTARA_MAX_PLAYERS`) | Satu kelas per server |
| Anggota regu | 1–4 | `party` |
| Progres per pesan | 96 KB (`MAX_PROGRESS`); ekspedisi selesai ±11 KB | `handleProgress` |
| Pesan per koneksi | ±40/s; obrolan 1,5 s; emote 1,2 s; masuk 12/menit/IP | rate limiter |
| Skala | Satu proses, satu disk, tidak bisa di-scale horizontal | Keputusan sadar; lihat [kajian/ARSITEKTUR_SERVER.md](kajian/ARSITEKTUR_SERVER.md) |

## 1.6 Keputusan arsitektur

- **Satu proses + JSON**, bukan database server: cukup untuk 60 siswa dan murah. Pindah ke SQLite (`node:sqlite`) bila nilai masuk rapor resmi, ≥4 kelas per server, atau berkas > 5 MB ([kajian/ARSITEKTUR_DATABASE.md](kajian/ARSITEKTUR_DATABASE.md)).
- **Tanpa pihak ketiga saat runtime**: dependensi runtime hanya `ws`. Font, Three.js, musik (sintesis Web Audio), dan peta semuanya lokal agar jalan di LAN sekolah tanpa internet.
- **Keterbatasan yang diketahui**: kunci jawaban misi (`missions.js`) ikut ke klien. Server tetap menilai ulang, jadi siswa yang membaca kode tidak bisa menaikkan skor tanpa menjawab benar, tetapi bisa mengintip. Kunci Bos dan rekap sengaja server-saja.
