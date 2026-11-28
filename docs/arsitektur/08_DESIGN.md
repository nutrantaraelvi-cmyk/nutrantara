# 8. Arsitektur Design

*NUTRANTARA 1.7 · 28 November 2026*

## 8.1 Identitas: "Nusantara Ceria" (sejak 0.6)

Cerah, hangat, dan berbudaya: langit terang, laut awan, pulau melayang, ornamen kawung dan tumpal, bukan fiksi ilmiah gelap. Palet gelap hijau-biru dari dokumen desain awal diganti atas keputusan pengguna di versi 0.6.

| Token | Nilai / sumber | Dipakai untuk |
| :-- | :-- | :-- |
| Judul | Baloo 2 | Heading, tombol besar |
| Tombol primer | Toska + emas | Aksi utama (MAIN, MULAI GAME) |
| Pola | Kawung, tumpal (CSS di `theme.css`) | Latar panel, bingkai |
| Status | Selalu ikon/teks + warna | Bukan warna saja (aksesibilitas) |

## 8.2 Lapisan CSS

```
styles.css   dasar (reset, tipografi, layar misi)
app.css      fase akun/lobi/loading + HUD dunia
landing.css  beranda      admin.css  panel guru
theme.css    DIMUAT TERAKHIR: tema cerah, pola, tombol  ← gaya baru di sini
```

## 8.3 Bahasa visual 3D

- **Model prosedural** dari primitif Three.js, gaya low-poly blok yang ramah perangkat lemah.
- **Budaya** (`culture.js`): candi bentar, meru, penjor, stupa, rumah gadang, gunungan, gong, ondel-ondel, layang-layang, pinisi, makanan daerah. Butik: 20 busana daerah di 4 slot (kepala, baju, leher, punggung).
- **Karakter** (`characters.js`): penjelajah, Nara, warga Kampung dengan penanda quest ! / ? / …, Raksasa Hoaks Gizi (`boss3d.js`).
- **Penanda gameplay**: cincin heksagon toska (kunci target), panah tanah emas (arah hadap), kubah terkunci yang memudar saat pos dibuka, jembatan cahaya yang menyala bertahap.

## 8.4 Ilustrasi 2D

| Aset | Dipakai di | Catatan |
| :-- | :-- | :-- |
| `assets/layar-muat*.webp` (1672 × 941) | Splash beranda | Tombol, bar, efek ditempatkan dalam persen artwork; koordinat piksel di komentar `theme.css`. Ganti gambar = ukur ulang |
| `assets/peta-nusantara*.webp` | Layar Peta (`map-art.js`) | Pin pos dirender `game.js`, diposisikan `map-art.js` |

## 8.5 Audio

20 lagu orisinal, skala slendro/pelog/selisir/pentatonik/mayor, satu per adegan (`menu`, `lobi`, `peta`, `butik`, `arsip`, `pjbl`, `bos`, `pulau-0`…`pulau-12`) plus sting (`segel`, `naik`, `lencana`, `menang`). Kontrol ♪ mengambang (nyala/mati, volume, efek); guru bisa membisukan kelas.

## 8.6 HUD dunia

Zona: kiri atas = level + tujuan; kanan atas = peta mini (±320 m, M = penuh); kiri = HUD regu; bawah = tombol aksi/sentuh, emote; pojok = GRAFIS, KAMERA, 🎒 tas, cuaca. Panel hologram misi muncul di tengah di atas kanvas (`role="dialog"`).

## 8.7 Aksesibilitas (target dari dokumen desain)

| Target | Penerapan |
| :-- | :-- |
| Kibor (Tab/Enter) | Tab sengaja tidak dipakai untuk kunci target; panel bisa dioperasikan kibor |
| Status tidak hanya warna | Ikon, teks, pola |
| Lebar 1024 px, zoom 125%, sentuh | Tata letak responsif, joystick sentuh |
| Perangkat lemah | 3D Ringan / 2D |
| `prefers-reduced-motion` | Splash statis, partikel berkurang, kilat mati, FOV langsung, `fx.js` menghormatinya |

Pekerjaan terbuka dari kajian UI/UX: ukuran huruf minimum 12/14 px, kontras token warna teks (WCAG AA), perangkap fokus panel, font disajikan lokal, panel regu di layar ≤ 900 px. Rincian: [kajian/ARSITEKTUR_UIUX.md](kajian/ARSITEKTUR_UIUX.md).

## 8.8 Pagar orisinalitas

Inspirasi genre (petualangan dunia terbuka, RPG, voxel) boleh. Karakter, level, musik, dan tampilan game lain tidak disalin. Ornamen budaya digambar ulang secara prosedural, bukan diambil dari aset pihak lain.
