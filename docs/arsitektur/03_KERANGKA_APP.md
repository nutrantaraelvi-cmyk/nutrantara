# 3. Kerangka App

*NUTRANTARA 1.7 · 28 November 2026*

## 3.1 Tiga halaman

| Halaman | Skrip | Untuk |
| :-- | :-- | :-- |
| `index.html` | `splash.js` (sinkron), `landing.js`, `peta3d.js` | Beranda: splash 3 detik, enam pos, diorama peta 3D, info guru & privasi |
| `play.html` | Skrip klasik A/B lalu modul `world3d.js`, `app.js` | Aplikasi siswa |
| `admin.html` | `admin.js`, `admin-rekap.js`, `xlsx.js` | Panel guru |

Semua halaman memuat `styles.css` → (`app.css`/`landing.css`/`admin.css`) → `theme.css` terakhir.

## 3.2 Fase aplikasi siswa (`app.js`)

`phase(name)` menulis `document.body.dataset.phase` dan menampilkan satu dari `#phase-auth`, `#phase-loading`, `#phase-lobby`; fase `game` menyembunyikan ketiganya.

```
 auth ──masuk/daftar/tamu──► loading ──► lobby ──MAIN──► game
  ▲                                      ▲   │           │  (layar game.js:
  │ sesi kedaluwarsa / blokir            │   └─Butik/Prestasi/PjBL…  peta, world,
  └──────────────────────────────────────┴── toLobby() ◄── reset guru / tombol lobi   misi, rapor, pjbl…)
```

## 3.3 Layar di dalam fase game (`game.js` `screens`)

`game.goTo(id)` mengganti layar DOM: `map` (Peta ilustrasi + pin pos, `map-art.js`), `world` (kanvas 3D/2D), misi pos, Dapur Juara (Pos 6), paspor, rapor, `pjbl`, `prestasi` (RPG), toko (Butik). Panel dalam dunia (terminal, lab, Gerbang Pilah, dialog NPC, Dapur Lapangan, Mitos atau Fakta) dibuka oleh `quest.js` / `kampung.js` / `rpg.js` di atas kanvas tanpa mengganti layar.

## 3.4 Peta state

| State | Pemilik | Disimpan di | Sinkron server |
| :-- | :-- | :-- | :-- |
| Progres ekspedisi (6 pos) | `game.js` `state` | `nutrantara-save-v2:<user>` | `progress` + `team-op` |
| Lemari Butik | server / `shop.js` | `nutrantara-lemari-v1:<alias>` | `shop` → `wardrobe` |
| PjBL | server / `pjbl.js` | `nutrantara-pjbl-v1:<alias>` | `pjbl` |
| Kampung | server / `kampung.js` | `nutrantara-kampung-v1:<alias>` | `kampung` |
| Shard & pulau jelajah | `world3d.js` | `localStorage` | `explore` |
| RPG (XP, level, lencana) | **turunan** dari semua di atas | tidak disimpan | `rpg` |
| Preferensi | masing-masing modul | `nutrantara-cam`, `nutrantara-musik-v1`, grafis | tidak |
| Akun tamu | `app.js` | `nutrantara-guest-v1` | tidak |

Aturan alir data:
1. Data yang dihitung (skor, XP, saldo, `correct`) **tidak pernah** dikirim sebagai angka dari klien.
2. Server mengirim state; klien menggantikan, bukan menggabungkan, kecuali bagian regu yang di-diff oleh `game.js`.
3. Modul berkomunikasi lewat `net.on(...)` (server) dan event DOM `nutra:*` (lokal), bukan saling memanggil fungsi internal.

## 3.5 Startup

**Server:** muat konfigurasi env → `loadBrowserScript` aturan bersama → `checkStorage` → baca `classroom.json` (pulihkan dari cadangan bila rusak) → HTTP + WS di `PORT` → cetak URL pemain, `/admin`, PIN.

**Klien `play.html`:** skrip `defer` A/B menerbitkan global → `world3d.js` menerbitkan `NutraWorld3D` → `app.js` membaca sesi tersimpan (`/api/me`) → fase `auth` atau langsung `loading`. Rincian di [10_LOADING.md](10_LOADING.md).

## 3.6 Konfigurasi

| Server (env) | Klien |
| :-- | :-- |
| `PORT`, `NUTRANTARA_ADMIN_PIN` (wajib di produksi), `NUTRANTARA_MAX_PLAYERS`, `NUTRANTARA_DATA_DIR`, `TRUST_PROXY`, `NUTRANTARA_BACKUP_KEEP`, `NODE_ENV` | URL WS diturunkan dari `location`; `?regu=KODE` untuk undangan; pengaturan kelas (`settings`) didorong server: `paused`, `movementLocked`, `openPosts`, `chatEnabled`, `shopOpen`, `rpgVisible`, `musicOn`, `announcement`, `classCode` |

## 3.7 Aturan kerangka

- Satu sumber kebenaran per jenis data (tabel 3.4); jangan membuat salinan kedua.
- Fitur baru yang menyimpan data di luar progres mengikuti pola Butik/PjBL/Kampung: berkas `*-data.js` + `*-core.js` murni, `player.<fitur>` di server, kunci `localStorage` luring, satu pesan WS aksi, satu pesan balasan state, dikirim ulang setelah `welcome` dan reset guru.

Rincian lama: [kajian/KERANGKA_APP.md](kajian/KERANGKA_APP.md).
