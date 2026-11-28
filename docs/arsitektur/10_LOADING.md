# 10. Arsitektur Game Loading

*NUTRANTARA 1.7 · 28 November 2026*

Ada dua tahap muat yang terpisah: **splash beranda** (`index.html`) dan **muat game** (`play.html`, fase `loading`).

## 10.1 Splash beranda (`splash.js`)

```
 HTML #splash tampil ─► splash.js (skrip klasik SINKRON tepat setelah markup, agar langsung terlukis)
   INTRO 2,4 s: ilustrasi layar-muat*.webp (contain + latar blur), bar terisi, efek: riak portal,
                sapuan judul, kilau, mata & dada Nara menyala, kedip, balon kata
   OUTRO 0,6 s: zoom ke portal ─► beranda
   waktu = jam dinding, berhenti hanya saat tab tersembunyi
```

| Situasi | Perilaku |
| :-- | :-- |
| Halaman belum `load` di 2,4 s | Bar tertahan di 95% (maks 15 s) |
| MULAI GAME / Enter / Spasi / Esc | Masuk lebih cepat |
| Pointer / sentuh | Paralaks, partikel `#splash-motes`, percikan, Nara bereaksi |
| `prefers-reduced-motion` | Layar statis 3 s |
| Tanpa JS | `hidden`, beranda langsung tampil |

Modul berat beranda (`landing.js`, `peta3d.js`) dimuat di belakang splash.

## 10.2 Muat game (`enter()` di `app.js`)

| Bar | Langkah | Yang terjadi |
| --: | :-- | :-- |
| 8% | Menyiapkan akun penjelajah… | `game.begin(alias)`: baca simpanan `localStorage`, buang bila `SCHEMA_VERSION` beda |
| 20% | Menyambung ke server kelas… | `net.join(token)`; tunggu `welcome` (maks 6 s). `auth` → kembali ke masuk; `blocked` → pesan; lambat → lanjut, coba di latar |
| 35–85% | Menumbuhkan pulau melayang… / Menyalakan jembatan cahaya… / Menyiapkan terminal arsip… | `W3.prepare(onProgress)`: renderer, langit, pulau, wilayah, budaya, objek misi, Kampung |
| 92% | Memanggil Nara… | Tunggu sampai minimal 1,8 s sejak mulai |
| 100% | Siap! | 350 ms, lalu `toLobby()` |

Selama muat, tips bergilir tiap 2,2 s; bar punya `aria-valuenow`.

## 10.3 Muat bertahap setelah lobi

Tidak semuanya dibangun di `prepare`:

- **Medan blok**: chunk 64 m dibangun saat pemain mendekat, dibuang saat jauh (`terrain.update`).
- **Mini-scene** (Simulator Vili, pratinjau Butik): dibuat saat panel dibuka, di-`dispose` saat ditutup.
- **Musik**: konteks audio baru dibuat setelah gestur pertama.
- **Data server**: `welcome` lalu `wardrobe`, `pjbl`, `kampung`, `rpg` datang terpisah; UI menampilkan keadaan lokal dulu.

## 10.4 Jalur gagal

| Gagal | Hasil |
| :-- | :-- |
| Server tidak ada | Lanjut luring tanpa menunggu lama |
| WebGL tidak ada / grafis 2D | `prepare` dilewati, dunia 2D |
| Sesi kedaluwarsa | Fase `auth` dengan pesan "Sesi berakhir" |
| Berkas 404 di server kelas | Hampir selalu karena belum ada di `STATIC` |

## 10.5 Arah perbaikan

Dari kajian UI/UX (P1): satukan splash, `#phase-loading`, dan `#w3-loading` menjadi satu pengalaman muat, dan hapus jeda buatan 1,8 s sehingga perangkat cepat langsung masuk. Pertahankan jalur luring dan bar yang jujur (mengikuti `prepare` sungguhan).
