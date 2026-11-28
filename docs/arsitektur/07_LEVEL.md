# 7. Arsitektur Level

*NUTRANTARA 1.7 · 28 November 2026*

## 7.1 Koordinat dunia

Peta logis **32400 × 15200 unit**, 1 unit = 0,1 m di 3D (`world-data.js`). Koordinat yang sama dipakai dunia 3D, dunia 2D, peta langsung guru, serta teleport/spawn server. Dalam cerita game satu wilayah pos disebut "100 × 65 km".

```
 ┌──────────── 32400 ────────────┐
 │  [Pos 1]     [Pos 2]   [Pos 3]  │   wilayah pos: elips 5000 × 3250 unit (±500 × 325 m jari-jari)
 │        (7)  ●0  (8)    (9)      │   ●0 Alun-alun: pertemuan Pos 1/2/3/6
 │  [Pos 6]     [Pos 5]   [Pos 4]  │   (7)–(12) pulau liar di celah, hanya lewat jembatan
 └─────────────── 15200 ─────────┘
```

Pakai `W.isPost(id)` (bukan `id > 0`) untuk mengenali pos; `W.islandAt(x, y)` untuk pulau di bawah suatu titik.

## 7.2 Jenis pulau

| Jenis | Id | Isi | Akses |
| :-- | :-- | :-- | :-- |
| Alun-alun | 0 | Kios Butik + manekin, Mbok Sari, arena Bos (sisi utara), titik temu | Selalu |
| Wilayah pos | 1–6 | Kampung (hub), misi, jalur, bukit teras, kolam, kemah budaya, medan blok | Dibuka guru (`openPosts`) |
| Pulau liar | 7–12 | Properti, platform panjat, shard arsip (`LANDMARKS`), Pak Wayan (Bukit Sawah), Daeng Baso (Pantai Kelapa) | Selalu, bila jembatan ujung lainnya terbuka |

Jembatan dari wilayah besar mulai di titik tepi terdekat.

## 7.3 Tata letak wilayah pos (`region.js`)

```
            kemah budaya ─ jalur ─ kemah budaya
                  │                     │
   jembatan ── HUB KAMPUNG (NPC, tungku, simpul kumpul)
                  │
        ┌── inti misi ±220 × 140 m (quest.js: terminal, papan laporan, altar segel) ──┐
        └─────────────────────────────────────────────────────────────────────────────┘
   sisa wilayah: jelajah bebas · bukit teras · kolam · layang-layang · 3 shard tambahan · menara blok
```

Objek misi ditempatkan relatif ke pusat wilayah tetapi dijepit ke inti (`sx`/`sz`), agar misi tidak tersebar terlalu jauh untuk satu jam pelajaran. Semua fitur dikirim ke `terrain.addRegion` supaya tetap datar.

## 7.4 Medan blok (`terrain.js`)

- Grid kolom 2 × 2 m, langkah 1 m. Satu biome per pos (`BIOMES`: hutan, lembah, gunung, rawa, gumuk, kaldera), tinggi dihitung sekali dari seed per pos (deterministik di semua klien).
- **Invarian** (periksa ulang bila generator diubah):
  1. Fitur dan koridor jalur terkunci datar di ketinggian 0.
  2. Medan alami berubah paling banyak 1 blok per kolom (transformasi jarak min-plus dua lintasan).
  3. Tinggi/dalam hanya boleh tumbuh seiring jarak Manhattan dari sel terkunci, jadi tidak ada lubang jebakan.
  4. Hanya struktur (menara bertangga spiral + penjor, candi, mesa berramp, batu besar) yang punya dinding ≥ 2 blok.
- Mesh dibangun per chunk 64 m di sekitar pemain, dibuang saat jauh. Kabut main dijepit ke radius itu.

## 7.5 Cuaca dan musim (`weather.js`)

| | Cuaca | Musim |
| :-- | :-- | :-- |
| Lingkup | Per pulau, bergilir tiap 8 menit dari `Date.now` | Tetap per pulau: Semi, Panen, Hujan, Kemarau, Gugur, Dingin |
| Memengaruhi | Kabut, langit, cahaya, hujan, embun beku, abu, daun, debu, kilat lembut, pelangi | Warna daun/bunga/rumput, bunga mekar, buah, salju puncak, serasah, warna rumput medan |
| Gameplay | Tidak ada penalti gerak | Tidak ada |

## 7.6 Isi yang bisa ditemukan

- **Shard arsip**: id = indeks daftar, disimpan di `localStorage` dan `player.explore`. Urutan: tempat di Alun-alun/pos → pulau liar → shard wilayah dari `region.js` → enam shard puncak menara. **Tambah hanya di akhir.** Target XP `SHARD_GOAL` 48.
- **Simpul kumpul Kampung** `pulau:indeks` di hub dan kemah budaya; NPC dan tungku di hub; `kampung3d.js` menggeser yang terlalu dekat (< ±3 m) ke objek misi.

## 7.7 Aturan desain level

1. Setiap objek misi dan NPC terjangkau lewat jalur datar dari jembatan.
2. Tidak ada tempat terjebak; jatuh dari pulau tidak mungkin (dijepit `WORLD.clamp`).
3. Inti misi bisa diselesaikan tanpa menjelajah; jelajah adalah hadiah, bukan syarat.
4. Budaya per wilayah konsisten dengan biome dan musimnya.
5. Menambah pulau atau pos: ubah `world-data.js` (dipakai server), `LANDMARKS` di `world3d.js`, lalu periksa jembatan, `allowedIslands`, dan smoke test.
