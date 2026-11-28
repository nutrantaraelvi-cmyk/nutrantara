# 9. Arsitektur Lobby

*NUTRANTARA 1.7 · 28 November 2026 · Fase `lobby` di `app.js`*

## 9.1 Posisi lobi dalam alur

```
 loading ──toLobby()──► LOBI ──MAIN──► game: overview (pilih pulau) ──► drop ──► play
                         │  ▲                                     │
                         │  └──────────── tombol Lobi / reset guru ┘
                         ├─ Butik (shop.js)   ├─ Prestasi (rpg.js)   ├─ PjBL (pjbl.js)
                         └─ Regu: buat / gabung kode / "Terjun ke dia ↓"
```

`toLobby()` memanggil `W3.leave()`, menghentikan dunia 2D, mengirim `zone: 'lobby'`, merender lobi, dan memfokuskan tombol MAIN.

## 9.2 Isi lobi

| Bagian | Sumber data | Diperbarui |
| :-- | :-- | :-- |
| Panggung 3D: penjelajah berbusana + Nara, cincin, awan, layang-layang, laut (mini-scene sendiri di `app.js` `lobby`) | wardrobe, `nutra:outfit` | Saat busana berubah |
| Kartu pemain: alias, warna, level & gelar | `net.me`, `rpg` | `rpg` |
| Kemajuan ekspedisi per pos, skor | `game.state` | `progress-sync` |
| Regu Proyek | `net.party` | `party`, `players` |
| Pengumuman guru, status kelas (jeda, pos terbuka) | `settings` | `settings` |
| Siapa daring | `net.players` | `players` |
| Tombol MAIN, Butik, Prestasi, PjBL | | |

`renderLobby()` dipanggil saat event `players`, `settings`, `leaderboard`, `status`, `welcome`, dan setiap 3 detik selama fase lobi.

## 9.3 Regu di lobi

- **Buat**: `party create` → server membuat kode 6 karakter, siswa jadi pembuat (👑).
- **Gabung**: ketik kode atau buka `play.html?regu=KODE`; kode disimpan sebagai `pendingInvite`, dipakai otomatis begitu daring, lalu dihapus dari URL. Kode salah dibatasi laju.
- **Status anggota** (`memberStatus`): kamu · luring · di lobi · di Pos n · nama pulau liar · di jembatan.
- **Terjun ke teman**: `spawn { to }` → server memilih titik di dekatnya bila pulau teman terbuka untukmu, kalau tidak mendarat di dekat sana. Timeout 4 detik.
- Tamu/luring: tombol regu nonaktif dengan penjelasan "bermain solo dan memegang semua peran".

## 9.4 Dari lobi ke dunia

1. MAIN → `phase('game')`, `game.goTo('world')`.
2. `world3d.js` masuk mode `overview`: kepulauan dari jauh, pulau terkunci berkubah, pin pos.
3. Siswa memilih pulau yang diizinkan (`allowedIslands`) → mode `drop` (terjun) → `play`. Server memvalidasi posisi pertama.
4. Pemain yang sudah di dunia bisa didatangi teman lewat "Terjun ke dia" (drop-in).

## 9.5 Kendali guru yang terlihat di lobi

`set-paused` (MAIN dikunci, banner jeda), `set-posts` (pulau yang terbuka), `announce` (pengumuman), `set-shop` (Butik buka/tutup), `set-rpg` (sembunyikan level), `reset` (siswa dikembalikan ke lobi), `kick`.

## 9.6 Aturan lobi

- Lobi adalah tempat aman tanpa beban GPU dunia: loop 3D dunia mati, hanya mini-scene lobi.
- Semua informasi sosial (regu, siapa daring) terbaca tanpa harus masuk dunia.
- Lobi tidak menampilkan peringkat individu yang mempermalukan; fokus pada kemajuan diri dan regu.
- Pekerjaan terbuka: panel regu tersembunyi di layar ≤ 900 px (`.lobby-side`), padahal semua pos adalah misi regu. Prioritas P0 di kajian UI/UX.
