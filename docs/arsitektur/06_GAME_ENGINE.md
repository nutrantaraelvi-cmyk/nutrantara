# 6. Arsitektur Game Engine

*NUTRANTARA 1.7 · 28 November 2026*

NUTRANTARA tidak memakai engine game jadi (Unity, Godot, Babylon). "Engine"-nya adalah lapisan tipis buatan sendiri di atas **Three.js** (di-vendor di `vendor/three/three.module.min.js`), berpusat di `world3d.js`. Alasannya: tanpa build, jalan dari `file://` dan LAN, ukuran unduhan kecil, dan bisa jatuh ke 2D.

## 6.1 Lapisan engine

```
 ┌─ Aplikasi ─────── app.js (fase), game.js (layar & state)
 ├─ Gameplay ─────── quest.js · kampung3d.js · boss3d.js · modul pos
 ├─ Dunia ────────── world3d.js: mode overview/drop/play, pemain, pemain lain, kamera, input
 ├─ Pembangun ────── terrain.js (blok + chunk) · region.js (isi wilayah, instancing) · culture.js
 │                   characters.js · fashion.js · sky.js · weather.js · fx.js
 ├─ Render ──────── Three.js WebGLRenderer (antialias & bayangan hanya di 3D Tinggi)
 └─ Cadangan ────── world.js: kanvas 2D 960×600 mengikuti pemain
```

## 6.2 Frame loop (`frameLoop` di `world3d.js`)

```
 dt = min(0.05, clock.getDelta())                       // dibatasi agar tab yang lama tidur tidak melompat
 tiap 0,5 s: quests.refresh · refreshIslands · label · tujuan · HUD cuaca
 pollGamepad(dt)
 mode: overview → updateOverview | drop → updateDrop | play → updatePlay (gerak, tabrakan medan, kamera)
 terrain.update(x, z)                                   // bangun/buang chunk 64 m di sekitar pemain/kamera
 weather.update(...)                                    // kabut ≤ radius medan
 FOV mengikuti mode kamera (lerp, langsung bila reduced-motion)
 updateOthers · updateBoss · kampung.update · animateWorld (spin, bob, layang-layang, pinisi, kubah, jembatan)
 resize · renderer.render · requestAnimationFrame
```

`start()`/`stop()` menyalakan dan mematikan loop saat masuk/keluar dunia, jadi lobi dan layar DOM tidak membebani GPU.

## 6.3 Mode dunia

| Mode | Kegunaan | Tampilan |
| :-- | :-- | :-- |
| `overview` | Pilih pulau (peta 3D seluruh kepulauan) | Kabut jauh, permukaan wilayah datar (`regionTops`) |
| `drop` | Animasi terjun ke titik pilihan / ke dekat teman | Medan blok dimuat |
| `play` | Bermain | Kabut 110–330 m, far 800 (`playView`, lebih dekat di 3D Ringan) |

## 6.4 Fisika & gerak (sederhana, deterministik)

- `groundAt` = max(tinggi blok, `SWIM_Y` − 1 m). Air dalam diseberangi dengan berenang 60% kecepatan.
- Naik otomatis bila kolom ≤ kaki + 1,05 m; lompat naik 2 blok; turun langsung menempel.
- Kamera didorong di atas medan. Tidak ada mesin fisika umum; tabrakan hanya terhadap grid medan dan objek misi.
- `move.h` (0–8 m) dikirim sebagai tinggi di atas blok, jadi server tidak perlu tahu medan.

## 6.5 Input & kamera

Skema ganda (kamera terpisah dari gerak): WASD relatif kamera, ←/→ putar arah, Shift lari, klik tanah untuk jalan, klik-kanan/tengah putar kamera, roda zoom, V mouse-look, Q kunci target (`LOCK_RANGE`), C reset, R/F tengadah. Gamepad standar lewat `pollGamepad`, sentuh lewat joystick kiri + usap + cubit. Empat mode kamera di `CAM_MODES`: `orbit`, `bahu`, `iso`, `fp`, masing-masing ingat pitch/zoom di `camMem`; logika kunci/reset di `updateCamControl`.

## 6.6 Kualitas grafis

| Pilihan | Default bila | Beda |
| :-- | :-- | :-- |
| 3D Tinggi | Desktop ≥ 4 inti | Antialias, bayangan objek terpilih, medan radius 360 m, refresh pulau tiap detik |
| 3D Ringan | Pointer kasar (HP) atau < 4 inti | Tanpa antialias/bayangan, radius 250 m, kabut lebih dekat |
| 2D | Dipilih atau tanpa WebGL | `world.js`, kanvas 2D |

## 6.7 Anggaran performa

- Vegetasi dan blok memakai `InstancedMesh`; model item Butik dan tekstur dibuat sekali lalu di-clone.
- Chunk medan jauh di-`dispose`. Mini-scene (Simulator Vili, pratinjau Butik) membuang dirinya saat panel ditutup.
- Cuaca dihitung dari `Date.now` (bergilir 8 menit) tanpa lalu lintas jaringan; partikel dikurangi dan kilat mati di `prefers-reduced-motion`.
- Pemain lain diinterpolasi dari siaran 10×/s.

## 6.8 Audio engine (`music.js`)

Sintesis Web Audio murni, tanpa berkas audio: instrumen gamelan, angklung, kolintang, sasando, sape, talempong, tifa, keroncong; 20 lagu orisinal dalam not angka (`music-data.js`). Adegan dipilih dari fase, layar, pulau, dan event Bos, dengan crossfade; mulai setelah gestur pertama pengguna.

## 6.9 Batas engine yang disengaja

Tidak ada sistem fisika umum, animasi skeletal dari berkas, atau pemuat model eksternal: semua model prosedural. Ini menjaga tanpa-build dan ukuran kecil. Bila suatu saat butuh aset glTF, tambahkan `GLTFLoader` ke `vendor/` dan daftarkan aset di `STATIC`.
