# Arsitektur UI/UX NUTRANTARA

Dokumen ini memetakan antarmuka NUTRANTARA yang **benar-benar ada di kode** (per 23 November 2026, versi 1.0 dengan regu PjBL, mode kamera, dan layar muat beranda), lalu menetapkan arah perbaikannya. Rekomendasi ditulis tegas: setiap butir punya prioritas, alasan berbasis temuan, dan file yang perlu diubah.

Dokumen pendamping: `docs/ARSITEKTUR_SERVER.md` (protokol dan server) dan `docs/ARSITEKTUR_DATABASE.md` (data). Dokumen ini hanya membahas lapisan tampilan dan interaksi.

---

## 0. Ringkasan untuk pengambil keputusan

NUTRANTARA sudah punya fondasi UX yang kuat: alur akun → lobi → pilih map → dunia 3D, mode luring sebagai fitur, kontrol keyboard/gamepad/sentuh, pilihan grafis 3D Tinggi/3D Ringan/2D, dan `prefers-reduced-motion` yang dihormati di hampir semua animasi. Masalahnya ada di **keterbacaan, HP, dan konsistensi**, bukan di konsep.

Sepuluh keputusan yang direkomendasikan, urut dari yang paling berdampak:

| # | Keputusan | Prioritas | Alasan singkat |
|---|---|---|---|
| 1 | Tampilkan panel **Regu Proyek** dan pengumuman lobi di layar ≤ 900 px. | P0 | Saat ini `.lobby-side{display:none}` di `app.css`. Siswa yang memakai HP tidak bisa membuat atau bergabung regu, padahal sejak 1.0 semua pos adalah misi regu. |
| 2 | Naikkan ukuran huruf minimum menjadi **12 px** (label mono) dan **14 px** (isi). | P0 | Ada ±130 deklarasi huruf 7–10 px (`styles.css` 63, `theme.css` 43, `app.css` 13). Di laptop sekolah 1366×768 dan di zoom 125% teks ini sulit dibaca. |
| 3 | Perbaiki kontras token warna yang dipakai sebagai **teks**. | P0 | Hijau `#2fa36b` di atas krem = 2,97:1; toska `#11a3b5` = 2,82:1; kuning `#f0a01e` = 2,0:1; teks putih di tombol primer (`#1fc3d3`) = 2,14:1. Semua di bawah WCAG AA 4,5:1. |
| 4 | **Hentikan sorotan sel jawaban** di tabel stimulus sebelum siswa menjawab. | P0 | `row.highlight` mewarnai sel yang berbeda (`missions.js` baris 902 dan 1009). Di Pos 1 tugasnya justru memilah bukti dari pengalih, jadi sorotan membocorkan jawaban. |
| 5 | Pasang **perangkap fokus dan pengembalian fokus** di panel hologram. | P1 | `openPanel` di `quest.js` memberi `role="dialog"` tetapi Tab bisa keluar ke kanvas, dan fokus tidak kembali ke kanvas saat panel ditutup. |
| 6 | Satukan tiga layar muat menjadi **satu pengalaman muat** dan hapus jeda buatan 1,8 detik. | P1 | Splash beranda, `#phase-loading`, dan `#w3-loading` muncul berurutan. `enter()` di `app.js` selalu menunggu minimal 1.800 ms. |
| 7 | Sajikan font **dari server sendiri**, bukan Google Fonts. | P1 | `@import` Google Fonts di `styles.css` dan `theme.css` gagal di LAN tanpa internet, mengirim IP siswa ke pihak ketiga, dan membuat tampilan berubah antara rumah dan sekolah. |
| 8 | Tetapkan **satu tata letak HUD** dengan zona tetap dan versi HP yang ringkas. | P1 | Peta mini, HUD regu, emote, GRAFIS, KAMERA, tombol sentuh, dan banner diatur dengan angka `top/bottom` yang saling menimpa per breakpoint. |
| 9 | Ubah Papan Peringkat menjadi **pencapaian regu**, bukan ranking individu terbuka. | P1 | Ranking kelas langsung mempermalukan siswa berskor rendah dan bertentangan dengan nada "tidak apa-apa salah" sejak 0.7. |
| 10 | Bereskan **teks usang**: aturan coba-ulang, "2–4 pemain", dan "tersimpan di perangkat ini". | P1 | Teks lama bertentangan dengan aturan sekali jawab (0.7) dan regu 1–4 (1.0). |

---

## 1. Lingkup dan sumber

Yang dibaca (hanya baca, tidak ada skrip dijalankan):

- Halaman: `index.html` (beranda + splash), `play.html` (aplikasi siswa), `admin.html` (panel guru).
- Gaya: `styles.css` (dasar), `app.css` (alur & HUD), `landing.css`, `admin.css`, `theme.css` (tema "Nusantara Ceria", dimuat terakhir).
- Skrip UI: `app.js`, `game.js`, `world3d.js`, `quest.js`, `lab.js`, `absorb.js`, `team.js`, `net.js`, `map-art.js`, `splash.js`, `admin.js`, `landing.js`, `fx.js`.
- Desain: `Desain_Game_NUTRANTARA.docx.md`, `Paket_Persiapan_Pengembangan_NUTRANTARA.docx.md`, `KONSEP_VERTICAL_SLICE_POS_1_NUTRANTARA.md`, `MEMORY.md`, `CLAUDE.md`.

Catatan tentang palet: dokumen desain awal meminta palet gelap hijau-biru (`#071516`, `#78F4BD`, …). Keputusan pengguna di versi 0.6 menggantinya dengan tema terang "Nusantara Ceria". Dokumen ini mengikuti keputusan 0.6 dan hanya memperbaiki keterbacaannya.

---

## 2. Pengguna dan konteks pakai

| Pengguna | Konteks | Kebutuhan UX utama |
|---|---|---|
| **Siswa SMA kelas XI** (15–17 tahun) | Laptop sekolah (sering 1366×768, prosesor rendah, Chrome lama), HP Android pribadi kelas menengah-bawah, Wi-Fi kelas yang padat, kadang tanpa internet (server LAN). Bermain di kelas maupun di rumah, kadang bergantian dengan anggota regu. | Tahu harus ke mana dan melakukan apa tanpa bantuan guru; teks terbaca; tidak dipermalukan saat salah; bisa kerja regu dari HP. |
| **Guru Biologi** | Laptop guru yang terhubung ke proyektor, mengelola 30–40 siswa dalam 1 jam pelajaran, sering sambil berjalan di kelas. | Melihat siapa macet dalam sekali pandang, menghentikan kelas dengan satu klik, mengekspor nilai, tidak salah klik tindakan berbahaya. |
| **Siswa dengan kebutuhan akses** | Pengguna papan ketik saja, low vision (zoom 125–200%), buta warna, sensitif gerak. | Target dari dokumen desain: Tab/Enter, status tidak hanya warna, 1024 px, zoom 125%, sentuh, perangkat lama, `prefers-reduced-motion`. |

---

## 3. Peta layar (yang ada sekarang)

```
index.html (beranda)
 ├─ #splash  Layar muat ilustrasi (splash.js) ── klik MULAI GAME ─┐
 └─ Beranda: hero 3D, Enam pos, Peta 3D (peta3d.js), Karakter,   │
    Untuk guru, Privasi, CTA                                      │
        │ "MULAI GAME" / "Masuk" / "Daftar" ───────────────────────┘
        ▼
play.html  (body[data-phase] = boot → auth → loading → lobby → game)
 ├─ phase-auth     Tab Masuk | Daftar akun (warna rompi, kode kelas opsional)
 │                 Luring: "Main sebagai tamu"
 ├─ phase-loading  Nara + bilah muat + tips berganti
 ├─ phase-lobby    Kanvas karakter 3D, Profil (poin/segel/kepingan, lencana, emote),
 │                 Sisi: pengumuman, REGU PROYEK, teman daring, misi berikutnya,
 │                 Aksi: Paspor · MAIN · Rapor · Peringkat
 └─ phase-game     .shell dengan topbar: ⌂ Lobi · Dunia · Peta · Paspor · Rapor · Peringkat
     ├─ screen-world      Overview "PILIH MAP" (w-overview) → terjun → dunia 3D/2D + HUD
     │                    Panel hologram (quest.js, lab.js, absorb.js, …) di atas dunia
     ├─ screen-map        Peta ilustrasi (map-art.js) + kartu misi + "Masuki pos"
     ├─ screen-mission    Versi DOM untuk Pos 1–5: stimulus | keputusan | Paspor + segel
     ├─ screen-kitchen    Pos 6 Dapur Juara: Brief → Rancangan awal → Telaah → Revisi → Refleksi
     ├─ screen-passport   Ringkasan + catatan per pos + Unduh JSON
     ├─ screen-report     Rapor A–D, kekuatan, yang perlu ditingkatkan, cetak PDF
     └─ screen-leaderboard Peringkat kelas (daring) atau lokal (luring)
    Lapisan global (net.js): banner PENGUMUMAN GURU, overlay "Permainan dijeda", blocker, toast

admin.html (panel guru)
 ├─ Login PIN
 └─ Dasbor: statistik · KENDALI SESI · AKSES POS + kode kelas · PENGUMUMAN ·
    PETA LANGSUNG · tabel PENJELAJAH (+ menu aksi, dialog detail) · REGU PROYEK · OBROLAN KELAS
```

### Temuan struktural

1. **Dua jalur untuk tantangan yang sama.** Pos 1–5 bisa dikerjakan di dunia 3D (terminal, papan, altar di `quest.js`) dan juga di `screen-mission` lewat Peta. Ini bagus sebagai cadangan papan ketik, tetapi siswa tidak diberi tahu bahwa keduanya sama, dan teks di kedua jalur berbeda (lihat §9).
2. **Topbar ada dua kali.** Lobi punya topbar sendiri; `phase-game` memakai topbar `.shell`. Navigasi "Dunia/Peta/Paspor/Rapor/Peringkat" di dalam dunia 3D menghabiskan 60 px tinggi layar di HP.
3. **Tiga layar muat berurutan** (splash beranda → `phase-loading` → `#w3-loading`) dengan gaya berbeda.

---

## 4. Alur pengguna

### 4.1 Siswa, kunjungan pertama (daring)

```
Beranda ─(splash, klik MULAI GAME)→ Beranda ─(Daftar)→ Daftar akun
  → Muat (min. 1,8 dtk) → Lobi [akun baru] → (opsional) Bentuk/Gabung regu
  → MAIN → Pilih map → Terjun ke Pos 1 → Jelajah → Terminal arsip (bukti)
  → Papan Laporan (jawab sekali; regu: usul + voting) → Altar Segel (alasan ≥ MIN_REASON)
  → Kartu Hasil Pos → jembatan Pos 2 menyala → … → Pos 6 Dapur Juara → Rapor
```

Titik gesekan yang ditemukan:

| Langkah | Masalah | Rekomendasi |
|---|---|---|
| Splash beranda | Kunjungan pertama wajib klik dua kali (MULAI GAME di splash, lalu MULAI GAME di hero) sebelum sampai ke form akun. | Tombol di splash langsung menuju `play.html` bila pengguna datang untuk bermain. Beranda tetap bisa dibuka lewat gulir atau tautan "Lihat info game" di splash. |
| Form daftar | Tidak ada indikator kekuatan atau syarat yang terlihat saat mengetik; kesalahan baru muncul setelah kirim. | Validasi langsung per kolom dengan teks (bukan warna saja): "✓ 3–20 karakter", "✗ Kata sandi tidak sama". |
| Muat | Jeda buatan 1,8 dtk + tips berganti tiap 2,2 dtk (terlalu cepat dibaca). | Hapus jeda minimum; tips berganti tiap 6 dtk atau saat diklik. |
| Lobi (HP) | Panel regu, pengumuman, teman, dan misi berikutnya disembunyikan ≤ 900 px. | Lihat §7.4: lembar bawah (bottom sheet) "Regu" di HP. |
| Pilih map | Siswa baru melihat 13 pulau (6 pos + alun-alun + 6 jelajah); hanya Pos 1 yang relevan. | Untuk akun dengan 0 segel, sorot Pos 1 dan tampilkan tombol besar "Terjun ke Pos 1" sebagai pilihan utama. |
| Di dunia | Bantuan kontrol (`.world-keys`) disembunyikan secara visual saat bermain; siswa tidak punya cara melihatnya lagi. | Tombol "?" tetap di HUD yang membuka kartu kontrol (sesuai perangkat: papan ketik, sentuh, gamepad). Tampilkan otomatis sekali pada pendaratan pertama. |
| Papan Laporan | Pesan salah sudah baik ("Belum tepat — tidak apa-apa…"). | Pertahankan. Jangan tampilkan "0 poin" dengan huruf kecil yang menonjol; cukup di Rapor. |
| Akhir | Rapor tersedia dari lobi dan topbar, tetapi tidak ada momen penutup setelah segel ke-6. | Tampilkan layar "Ekspedisi selesai" satu kali, lalu arahkan ke Rapor dan tombol "Unduh Paspor". |

### 4.2 Siswa, kembali bermain

```
play.html → resume sesi (net.resume) → Muat → Lobi → MAIN → Pilih map
```

Rekomendasi: tambahkan tombol **"Lanjutkan di <lokasi terakhir>"** di lobi sebagai aksi utama untuk akun lama (lokasi terakhir sudah disimpan di `nutrantara-world-pos-v3` untuk 2D; simpan juga untuk 3D). MAIN → Pilih map tetap ada sebagai aksi kedua.

### 4.3 Siswa, mode tamu (luring)

```
play.html → serverStatus() gagal → kartu "Server kelas tidak tersedia" → nama tamu → Muat → Lobi
```

Alurnya sudah benar. Kekurangan: siswa tidak tahu progres tamu **tidak akan pindah** ke akun kelas nanti. Tambahkan satu kalimat di kartu tamu: "Progres tamu hanya ada di browser ini. Unduh Paspor sebelum pindah perangkat."

### 4.4 Siswa dalam regu

```
Lobi → Bentuk regu (kode 6 karakter) → Salin kode/tautan ?regu=KODE → teman Gabung
  → di setiap pos: HUD regu menunjukkan peran tiap anggota (team.js)
  → tugas milik teman daring ditolak ("ajak berdiskusi"); milik teman luring boleh diambil alih
  → Papan Laporan: usulkan jawaban → terkunci saat 2 suara sama (atau 1 bila yang lain luring > 24 jam)
```

Rekomendasi:

- **Tampilkan peran di dunia, bukan hanya di HUD.** Objek misi milik peran lain diberi ikon kecil inisial pemiliknya. Siswa langsung tahu kenapa terminal menolak.
- **Status voting harus terlihat oleh semua.** Di Papan Laporan, tampilkan "2 dari 3 anggota sudah mengusulkan · 1 menunggu" beserta usulan masing-masing (tanpa warna saja).
- Penolakan tugas memakai bahasa ajakan, bukan larangan: "Ini tugas Dina (Ahli Protein). Dina sedang daring, ajak dia lewat obrolan regu."

### 4.5 Guru

```
admin.html → PIN → Dasbor
  Sebelum kelas : Akses pos (mis. Hanya Pos 1) · Kode kelas · Pengumuman pembuka
  Saat kelas    : Peta langsung · Tabel penjelajah · Jeda/Bekukan · Kumpulkan di Nara · Pesan pribadi
  Sesudah kelas : Regu proyek (kontribusi) · Detail siswa · Ekspor JSON/CSV
```

Temuan dan rekomendasi untuk panel guru ada di §10.

---

## 5. Sistem desain

### 5.1 Prinsip

1. **Terbaca dulu, ornamen kemudian.** Motif kawung dan tumpal tetap ada, tetapi tidak boleh di belakang teks isi.
2. **Satu sumber token.** Semua warna, ukuran, radius, dan bayangan berasal dari variabel `:root`. Tidak ada nilai heksadesimal langsung di komponen.
3. **Status = ikon + teks + warna.** Tidak ada status yang hanya dibedakan warna.
4. **Ringan secara default.** Komponen tidak bergantung pada `backdrop-filter`, bayangan besar, atau animasi tak berujung.

### 5.2 Masalah token saat ini

- Token tersebar di dua tempat (`styles.css` baris 3 dan `theme.css` baris 7–12), lalu dibatalkan dengan `!important` di `theme.css`. Ada ±210 deklarasi huruf di `theme.css` saja.
- Banyak warna ditulis langsung (`#7a644e`, `#3b2a1a`, `rgba(150,98,45,0.45)`, `#1fc3d3`, `#f5b72b`) tanpa variabel.
- Warna aksen dipakai sebagai teks padahal kontrasnya rendah (hasil hitung rasio kontras WCAG di atas latar `#fff6e3`):

| Token / nilai | Dipakai untuk | Kontras | Status |
|---|---|---|---|
| `--text #3b2a1a` | teks isi | 12,8 | Lulus |
| `--muted #7a644e` | teks sekunder | 5,2 | Lulus (AA) |
| `--green #2fa36b` | eyebrow, label tantangan, `.highlight-cell` | 2,97 | **Gagal** |
| `--cyan #11a3b5` | aksen | 2,82 | **Gagal** |
| `--yellow #f0a01e` | label CATATAN PASPOR, badge | 2,0 | **Gagal** |
| `#e07a10` | angka di stat strip, tagline | 2,81 | **Gagal** |
| putih di `#1fc3d3` (atas gradasi tombol primer) | teks tombol utama | 2,14 | **Gagal** |
| putih di `#86d4f7` (langit) | label di atas langit | 1,64 | **Gagal** |

### 5.3 Token yang direkomendasikan

Taruh di satu blok `:root` di `theme.css` (atau file baru `tokens.css` yang dimuat pertama; jangan lupa menambahkannya ke `STATIC` di `server.js`). Nama memakai peran, bukan warna.

```css
:root{
  /* Permukaan */
  --surface-page:#fff6e3;   /* latar halaman */
  --surface-card:#fffdf8;   /* kartu, panel, hologram */
  --surface-sunk:#fff3dc;   /* input, sel tabel */
  --surface-sky:#d9f3ff;    /* latar langit di lobi/auth */

  /* Teks */
  --ink:#3b2a1a;            /* 12,8:1 */
  --ink-soft:#5c4733;       /* 8,1:1 — ganti #7a644e untuk label kecil */
  --ink-muted:#7a644e;      /* 5,2:1 — hanya ≥ 14 px */
  --ink-on-brand:#ffffff;

  /* Merek (latar tombol/aksen, bukan teks) */
  --brand:#0b7480;          /* toska tua: putih di atasnya 5,5:1 */
  --brand-hi:#1fc3d3;       /* sorot/gradasi atas, bukan latar teks */
  --gold:#f5b72b;           /* bingkai, ikon; teks gelap di atasnya 8,7:1 */
  --wood:#9a5b2e;

  /* Status: selalu dipasangkan dengan ikon + teks */
  --ok-ink:#1f7a4d;   --ok-bg:#e3f4ea;   /* ✓ Selesai / Benar    (teks 4,95:1) */
  --info-ink:#0b7480; --info-bg:#def4f6; /* ● Aktif / Siap        (teks 5,1:1) */
  --warn-ink:#8a5a00; --warn-bg:#fdf0d2; /* ! Petunjuk / Perhatian (teks 5,5:1) */
  --err-ink:#a33a26;  --err-bg:#fbe5df;  /* ✗ Belum tepat / Error  (teks 6,1:1) */
  --lock-ink:#5c4733; --lock-bg:#efe6d6; /* 🔒 Terkunci */

  /* Tipografi */
  --font-display:'Baloo 2',system-ui,sans-serif;
  --font-body:'DM Sans',system-ui,'Segoe UI',Roboto,sans-serif;
  --font-mono:'DM Mono',ui-monospace,Consolas,monospace;
  --fs-xs:.75rem;   /* 12 px — batas bawah mutlak, hanya label MONO KAPITAL */
  --fs-sm:.875rem;  /* 14 px — teks sekunder, tombol kecil */
  --fs-md:1rem;     /* 16 px — teks isi, input (mencegah zoom otomatis iOS) */
  --fs-lg:1.25rem;  /* 20 px — judul kartu */
  --fs-xl:clamp(1.75rem,4vw,2.5rem); /* judul layar */
  --lh-body:1.55;

  /* Ruang, bentuk, sentuh */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px; --space-8:32px;
  --radius-sm:6px; --radius-md:12px; --radius-pill:999px;
  --tap:44px;               /* ukuran sentuh minimum */
  --focus:0 0 0 3px #fff, 0 0 0 6px #2b4c7e; /* cincin fokus dua lapis, terlihat di terang & gelap */
  --shadow-card:0 6px 18px rgba(120,70,20,.12);
}
```

Aturan pakai:

- **Hijau, toska, emas, dan oranye tidak pernah menjadi warna teks** di atas krem. Untuk teks status pakai `--*-ink`.
- Tombol primer memakai latar `--brand` padat (gradasi boleh, tetapi bagian tergelap harus di belakang teks). Bingkai emas dan bayangan kayu dipertahankan karena itu identitas tema.
- `.highlight-cell` yang tersisa (setelah jawaban, lihat §9.3) memakai `--ok-bg` + ikon "▲ lebih tinggi" / "▼ lebih rendah", bukan warna teks hijau.

### 5.4 Tipografi

| Peran | Font | Ukuran | Catatan |
|---|---|---|---|
| Judul layar, logo, tombol MULAI/MAIN | Baloo 2 700–800 | `--fs-xl` | Identitas ceria; jangan untuk paragraf. |
| Judul kartu, pertanyaan tantangan | Baloo 2 700 | `--fs-lg` | Pertanyaan tantangan saat ini 19 px Manrope, lalu ditimpa Baloo. Tetapkan satu. |
| Teks isi, pilihan jawaban, Nara | DM Sans 400–600 | `--fs-md` | Pilihan jawaban (`.choice-card`) saat ini 11 px: **naikkan ke 16 px**. |
| Label kapital (eyebrow, panel-heading, chip HUD) | DM Mono 500 | `--fs-xs` (12 px), letter-spacing .08em | Saat ini 7–10 px. Kurangi jumlahnya; tidak semua label perlu kapital mono. |
| Angka data di tabel stimulus | DM Mono 500 | `--fs-md` | Saat ini 12 px. |

Keputusan font:

- **Self-host tiga keluarga** (Baloo 2, DM Sans, DM Mono; subset Latin, WOFF2, hanya bobot yang dipakai: total sekitar 150–200 KB) di `assets/fonts/`, tambahkan ke `STATIC`, ganti `@import` Google dengan `@font-face … font-display:swap`, dan ubah CSP `font-src` menjadi `'self'`.
- **Buang Manrope.** Ia hanya menjadi cadangan Baloo 2 dan menambah satu unduhan.
- Teks isi tidak boleh di bawah 14 px; input form minimal 16 px (iOS memperbesar layar otomatis bila input < 16 px).

### 5.5 Pustaka komponen

Komponen yang sudah ada dan bentuk bakunya:

| Komponen | Kelas saat ini | Spesifikasi baku |
|---|---|---|
| Tombol primer | `.button-primary` | Tinggi ≥ 44 px, latar `--brand`, bingkai emas 2 px, teks `--fs-sm` 600 putih. Satu tombol primer per kartu. |
| Tombol sekunder | `.button-secondary` | Tinggi ≥ 44 px, latar `--surface-card`, bingkai `--wood` 35%. |
| Tombol ornamen | `.btn-ornate`, `.lobby-play` | Hanya untuk MULAI GAME dan MAIN. |
| Tombol tindakan berbahaya | `.danger` di menu admin | Teks `--err-ink`, ikon ⚠, selalu dengan konfirmasi (lihat §10). |
| Kartu/panel | `.world-card`, `.mission-card`, `.holo`, `.passport-record` | Latar `--surface-card`, radius `--radius-md`, tepi tumpal 8 px hanya di kartu "pajangan" (beranda, lobi), **tidak** di hologram yang berisi tugas. |
| Panel hologram | `.holo` dalam `.w3-holo-layer` | Dialog modal: judul ber-`id` + `aria-labelledby`, tombol tutup 44 px, perangkap fokus, Esc menutup, fokus kembali ke kanvas. Lebar `min(640px,100%)`; di HP menjadi lembar penuh (§8). |
| Chip HUD | `.w3-chip` | Tinggi 32 px, `--fs-xs` mono, latar `--surface-card` 92% (tanpa `backdrop-filter` di 3D Ringan). |
| Kartu pilihan jawaban | `.choice-card` | Seluruh kartu dapat diklik, tinggi ≥ 48 px, teks 16 px, penanda huruf A/B/C, status terpilih = bingkai tebal + ✓, bukan hanya latar. |
| Tag status | `.status-tag` | Pola tetap: `[ikon] TEKS` dengan token status (§5.3). Daftar status pos: 🔒 Terkunci · ● Siap dimasuki · ◐ Sedang dikerjakan · ✓ Selesai (tersegel). |
| Umpan balik | `.feedback`, `.holo-feedback` | `role="status"`; benar = `--ok`, belum tepat = `--warn` (bukan merah: salah bukan kesalahan fatal di game ini). Merah hanya untuk error sistem. |
| Toast | `.toast` | Maksimal 2 baris, 4 detik, tidak menutupi tombol sentuh (naikkan di atas zona tombol pada HP). |
| Banner guru | `.net-banner` | Satu-satunya elemen `aria-live="assertive"`. Warna khusus guru (latar `--warn-bg`, ikon 📣) agar dibedakan dari pesan game. |

Komponen baru yang perlu dibuat:

1. **Lembar bawah (bottom sheet)** untuk HP: dipakai panel regu, obrolan, dan hologram.
2. **Kartu kontrol** (tombol "?" di HUD): isi tergantung perangkat yang terdeteksi (papan ketik / sentuh / gamepad).
3. **Panel Pengaturan** (⚙): grafis, kamera, ukuran teks (100/115/130%), kurangi gerak (paksa, terlepas dari OS), kontras tinggi, sensitivitas kamera, balik sumbu Y. Saat ini GRAFIS dan KAMERA melayang sebagai dua bar terpisah di atas dunia.

---

## 6. HUD dalam game

### 6.1 Inventaris HUD saat ini (3D)

| Elemen | Posisi sekarang | Sumber |
|---|---|---|
| Topbar `.shell` (Lobi, Dunia, Peta, Paspor, Rapor, Peringkat, chip pemain) | atas, 60 px | `play.html`, `app.css` |
| Chip lokasi + kepingan arsip | kiri atas | `world3d.js` `.w3-hud-left` |
| Chip tujuan + jarak (`#w3-goal`) | kanan atas | `world3d.js` `updateGoal` |
| Peta mini (200 px, 130 px di ≤ 700 px) | kiri, `top:58px` | `theme.css` |
| HUD regu (240 px) | kiri, `top:200px` | `team.js`, `theme.css` |
| Penjelajah di pulau + obrolan tim (250 px) | kanan, `top:58px`; **hilang ≤ 900 px** | `app.css` |
| Prompt interaksi + tombol aksi (`.world-hud`) | bawah, `right:300px` | `app.css` |
| Emote (4 × 42 px) | kiri bawah, `bottom:78px` | `app.css` |
| Bar GRAFIS | kanan bawah, `bottom:62px` (170 px di sentuh) | `app.css`, `theme.css` |
| Bar KAMERA | kanan bawah, `bottom:104px` (212 px di sentuh) | `theme.css` |
| Joystick + BIDIK/LOMPAT/AKSI | bawah (sentuh) | `world3d.js` `.w3-touch` |
| Banner pos / petunjuk daun pisang / hologram / banner guru / toast | tengah | berbagai |

Masalah:

1. **Terlalu banyak elemen tetap.** Di laptop 1366×768 (tinggi area dunia ±690 px), HUD kiri (peta mini 125 px + HUD regu mulai 200 px) dan kanan (obrolan ±300 px) menutup sekitar 35% layar.
2. **Posisi diatur dengan angka yang saling bergantung** di tiga file dengan `!important`. Setiap elemen baru akan bertabrakan.
3. **GRAFIS dan KAMERA** adalah pengaturan, bukan informasi permainan, tetapi selalu tampil.
4. **`#w3-goal` memakai `aria-live="polite"`** dan teksnya berubah setiap kali jarak berubah. Pembaca layar akan terus membacakan "… · 143 m", "… · 142 m".
5. **`100vh`** dipakai untuk tinggi dunia (`calc(100vh - 76px)`). Di HP, bilah alamat browser membuat bagian bawah (tombol LOMPAT/AKSI) terpotong. Tidak ada `dvh` maupun `env(safe-area-inset-*)` di seluruh CSS.
6. Di ≤ 900 px obrolan hilang sama sekali, jadi siswa HP tidak bisa berdiskusi dengan regu, padahal penolakan tugas menyuruh mereka "berdiskusi".

### 6.2 Tata letak HUD yang direkomendasikan

Bagi layar menjadi **enam zona tetap**. Setiap elemen milik satu zona; zona menumpuk elemennya dengan flex, bukan dengan `top/bottom` manual.

```
┌──────────────────────────────────────────────────────────────┐
│ [A] Kiri atas            [B] Tengah atas         [C] Kanan atas │
│ Peta mini (klik=besar)   Tujuan: "Papan Laporan   ⚙  ?  ☰ Menu │
│ Lokasi · ✦ 12/42         · 140 m ↗"                            │
│ Regu (ringkas, bisa      (diperbarui ≤ 1×/5 dtk                │
│ dilipat)                  untuk pembaca layar)                 │
│                                                                │
│                     [D] Tengah: hologram / dialog              │
│                                                                │
│ [E] Kiri bawah                         [F] Kanan bawah         │
│ 💬 Obrolan (lipat,                     Prompt "E  Periksa       │
│ lencana belum dibaca)                  terminal" + tombol aksi │
│ Emote (di dalam menu 😀)               (sentuh: LOMPAT AKSI    │
│ (sentuh: joystick)                     BIDIK)                  │
└──────────────────────────────────────────────────────────────┘
```

Keputusan:

- **Topbar disembunyikan di dalam dunia 3D.** Navigasinya pindah ke tombol **☰ Menu** di zona C (lembar dengan Peta, Paspor, Rapor, Peringkat, Lobi, Keluar). Ini memberi 60 px kembali ke dunia.
- **⚙ Pengaturan** menggantikan bar GRAFIS dan KAMERA yang melayang. Tombol K dan pintasan lain tetap berfungsi.
- **Tujuan dipindah ke tengah atas** dan menjadi satu-satunya penunjuk arah utama, ditambah panah kecil yang menunjuk arah relatif ke kamera.
- **Obrolan menjadi tombol yang bisa dilipat** di zona E, terbuka sebagai panel kecil di desktop dan lembar bawah di HP. Ada lencana jumlah pesan belum dibaca.
- **Emote masuk ke menu 😀** (angka 1–4 tetap berfungsi).
- **HUD regu ringkas**: satu baris per anggota (ikon peran + nama + ● daring/○ luring + teks status). Rincian peran dibuka dengan klik.
- Tinggi dunia: `height:100dvh` (cadangan `100vh`), dan zona bawah memakai `padding-bottom:max(12px, env(safe-area-inset-bottom))`. Tambahkan `viewport-fit=cover` di meta viewport `play.html`.
- `#w3-goal`: buang `aria-live`. Buat elemen `sr-only` terpisah yang mengumumkan **hanya saat tujuan berganti** ("Tujuan baru: Altar Segel Pos 1").

### 6.3 Mode HUD

| Mode | Kapan | Isi |
|---|---|---|
| **Lengkap** | Desktop ≥ 1200 px | Semua zona. |
| **Ringkas** | 900–1199 px dan semua layar sentuh | Peta mini 140 px, regu dilipat, obrolan sebagai tombol. |
| **Sinema** | Tombol H atau saat hologram terbuka | Hanya tujuan dan tombol tutup. Dunia di belakang hologram diredupkan. |
| **Dijeda** | Guru menjeda | Overlay jeda (sudah ada) + banner guru. |

### 6.4 Hologram (panel tugas di dunia)

Hologram adalah tempat belajar yang sebenarnya, jadi perlakukan sebagai **dialog utama**, bukan tempelan:

- Lebar desktop `min(640px, 92vw)`; di HP **layar penuh** dengan header lengket (judul + ×) dan tombol aksi lengket di bawah.
- Tambahkan `aria-labelledby` ke judul (`<h2>`) di `openPanel`.
- Perangkap fokus (Tab/Shift+Tab berputar di dalam panel) dan **kembalikan fokus ke kanvas** di `closePanel`.
- Saat hologram terbuka, hentikan render dunia atau turunkan ke 10 fps (hemat baterai di HP dan laptop lemah). `ctx.onPanel(true)` sudah tersedia sebagai titik kaitnya.
- Simulator Vili 3D (`absorb.js`) membuat konteks WebGL kedua. Di 3D Ringan, tawarkan versi diagram 2D statis.

---

## 7. Layar per layar: rekomendasi

### 7.1 Beranda (`index.html`)

- Splash: tombol transparan di atas gambar adalah satu-satunya jalan masuk. Tambahkan **tautan teks yang terlihat** "Lewati" di pojok untuk pengguna papan ketik/pembaca layar (tombol sudah punya label `sr-only`, tetapi pengguna awas yang memakai Tab tidak melihat fokusnya di atas gambar; pastikan `.splash-start:focus-visible` punya cincin fokus tebal).
- Stat strip "2–4 pemain per tim diskusi" → **"1–4 pemain per regu"**.
- Kalimat Nara "memberi … petunjuk bertahap" → sesuaikan dengan aturan sekali jawab: "Nara memberi arahan dan penjelasan, tetapi tidak pernah langsung memberi jawaban."
- Hero 3D (`peta3d.js`, kanvas karakter) memakan GPU di laptop lemah sebelum siswa bermain. Jalankan hanya saat terlihat (`IntersectionObserver`) dan tidak sama sekali bila `prefers-reduced-motion` atau `hardwareConcurrency < 4`; tampilkan gambar statis.

### 7.2 Masuk / Daftar

- Kolom kata sandi: tombol 👁 sudah ada dan berlabel; ubah label menjadi dinamis ("Sembunyikan kata sandi" saat terbuka) dan pasang `aria-pressed`.
- Pilihan warna rompi: pastikan setiap warna punya nama (`aria-label="Toska"`), bukan hanya kotak warna.
- Pesan "Nama pengguna … jangan nama lengkap" sudah tepat secara privasi. Tambahkan contoh pola: "Contoh: elang07, kopi_tubruk".

### 7.3 Muat

- Satu komponen muat bersama untuk splash, `phase-loading`, dan `#w3-loading` (gaya Nara + bilah).
- `aria-live` jangan dipasang di seluruh `#phase-loading`; cukup di `#load-step`. Tips tidak perlu diumumkan.
- Hapus `Math.max(0, 1800 - …)`. Bila ingin animasi selesai, cukup 300 ms.

### 7.4 Lobi

- **P0:** di ≤ 900 px, ganti `display:none` pada `.lobby-side` dengan tombol **"🤝 Regu (2/4)"** dan **"📣"** (bila ada pengumuman) yang membuka lembar bawah berisi isi `.lobby-side` yang sama. Tanpa ini fitur inti 1.0 tidak dapat dipakai dari HP.
- Aksi utama: "MAIN" diganti dua tombol untuk akun lama: **"Lanjutkan"** (besar) dan "Pilih map".
- "MISI BERIKUTNYA" ditulis sebagai kalimat tindakan: "Berikutnya: Pos 2 Laboratorium Pencernaan. Uji reagen di Meja Uji bersama regumu."

### 7.5 Pilih map (`w-overview`)

- Daftar pulau (`.ov-list`) di HP menjadi gulir horizontal 200 px per kartu; beri petunjuk gulir dan urutkan: pos yang bisa dimasuki dulu, pulau jelajah di bagian akhir dengan label "Jelajah bebas · tanpa soal".
- Status pos pakai pola tag baku (🔒/●/◐/✓ + teks).

### 7.6 Peta (`screen-map`)

- `map-footer` menulis "● PROGRES TERSIMPAN DI PERANGKAT INI" walaupun siswa daring (progres di server). Buat dinamis: "Progres tersimpan di server kelas" vs "di browser ini".
- Kartu misi menampilkan "80 POIN" untuk Pos 1–5 dan "20 POIN" untuk Pos 6 (`maxPoints`). Tambahkan "Total ekspedisi 420 poin" di kartu progres agar siswa paham skalanya.

### 7.7 Layar misi DOM (`screen-mission`)

- Teks `.retry-note` "Tidak ada nyawa yang hilang. Baca kembali bukti dan coba lagi." **salah** sejak 0.7 (sekali jawab). Ganti: "Setiap tantangan dijawab sekali. Kalau belum tepat, Nara menjelaskan jawabannya dan kamu tetap lanjut."
- Hint "Gunakan bukti dari tabel. Minimal 20 karakter" sebaiknya membaca `MIN_REASON` dari kode, bukan angka tertulis.
- Tambahkan penghitung karakter langsung di textarea alasan ("18/20 karakter minimum").

### 7.8 Dapur Juara (`screen-kitchen`)

- Lima tahap (`.kitchen-steps`) perlu penanda status per tahap (✓/●/○ + teks) dan tidak boleh hanya warna.
- Tabel bahan di rancangan awal/revisi: di HP, ubah menjadi kartu per bahan (nama, bentuk, berat, sumber, nilai), bukan tabel lebar yang harus digulir ke samping.
- Tombol "Bandingkan versi" lengket saat revisi (dokumen desain meminta riwayat versi dapat dibuka saat revisi).

### 7.9 Paspor, Rapor, Peringkat

- **Rapor:** pertahankan predikat A–D, tetapi tampilkan dulu "kekuatan", baru "yang perlu ditingkatkan", dan beri saran tindakan konkret per pos ("Ulas lagi Pos 3: bedakan pencernaan dan penyerapan").
- **Peringkat (P1):** ranking individu kelas secara langsung tidak cocok dengan nada formatif game ini. Rekomendasi: guru memilih di panel guru antara **Mati (bawaan)**, **Pencapaian regu** (jumlah segel dan kepingan per regu, tanpa urutan skor), atau **Peringkat penuh**. Teks `.panel-subtitle` "Hanya ekspedisi yang selesai di peramban ini" juga salah saat daring.

---

## 8. Dukungan HP dan perangkat lemah

### 8.1 Yang sudah baik

- Deteksi awal: `defaultGfx()` memilih **3D Ringan** untuk layar sentuh atau `hardwareConcurrency < 4`.
- 3D Ringan mematikan bayangan, antialias, dan memakai `pixelRatio` 1.
- Cadangan **2D** (`world.js`) bila WebGL tidak ada, dan mode tamu tanpa server.
- Gambar responsif (`layar-muat-960.webp`, `peta-nusantara-960.webp`).
- Kontrol sentuh lengkap: joystick, usap kamera, cubit zoom, BIDIK/LOMPAT/AKSI.

### 8.2 Celah dan keputusan

| Celah | Bukti | Keputusan |
|---|---|---|
| Fitur regu dan obrolan hilang di HP | `.lobby-side{display:none}` dan `.world-side{display:none}` di `app.css` ≤ 900 px | Lembar bawah (§6.2, §7.4). **P0** |
| Tombol bawah terpotong di HP | `100vh`, tidak ada `dvh`/`safe-area` | `100dvh` + `env(safe-area-inset-*)` + `viewport-fit=cover`. **P0** |
| Tidak ada penurunan kualitas otomatis | Kualitas hanya dipilih sekali | **Pemantau FPS**: bila rata-rata < 24 fps selama 5 detik di 3D Tinggi, turunkan ke 3D Ringan; bila < 18 fps di 3D Ringan, tawarkan 2D lewat toast "Layar tersendat? Coba mode 2D". Simpan pilihan. **P1** |
| Render jalan terus di balik hologram dan tab tersembunyi | Tidak ada `visibilitychange` di `world3d.js` | Hentikan `frameLoop` saat `document.hidden`, turunkan saat hologram terbuka. **P1** |
| 3D Ringan masih menggambar semua hutan instanced dan awan | `region.js`, `createCloudSea({quality})` | Di 3D Ringan: kurangi kerapatan instance 50%, jarak kabut 80–220 m, matikan air terjun animasi. **P2** |
| Ukuran unduhan pertama | `world3d.js` 117 KB, `theme.css` 84 KB, `missions.js` 86 KB, Three.js, ditambah gambar 120–390 KB, tanpa kompresi atau cache yang dijelaskan | Pastikan server mengirim gzip/brotli dan `Cache-Control` panjang untuk `vendor/` dan `assets/`. Muat `lab.js`/`absorb.js`/`causal.js`/`claims.js`/`archive.js` hanya saat pos terkait dibuka (`import()`). **P2** |
| `backdrop-filter: blur` di HUD | `.world-card` di `app.css` | Matikan di 3D Ringan dan 2D. **P2** |
| Target sentuh kecil | Tombol `.admin-small`, `.nav-link` 11–13 px, kartu pilihan jawaban | Semua target ≥ 44 × 44 px (`--tap`). **P1** |
| Orientasi | Tidak ada penanganan potret di dunia 3D | Di potret, tampilkan saran "Putar HP ke mode lanskap untuk pengalaman terbaik" sekali, tetapi tetap bisa dimainkan. **P2** |

### 8.3 Matriks dukungan perangkat (target uji)

| Kelas perangkat | Contoh | Mode bawaan | Wajib bisa |
|---|---|---|---|
| Laptop sekolah lemah | Celeron/Pentium, 4 GB, 1366×768 | 3D Ringan | Semua pos, 25+ fps di 3D Ringan |
| Chromebook | 4 GB, layar sentuh | 3D Ringan | Semua pos, papan ketik + sentuh |
| HP Android menengah-bawah | 3–4 GB RAM, 720p | 3D Ringan | Regu, obrolan, semua hologram dalam potret dan lanskap |
| Tablet | iPad/Android 10" | 3D Ringan | Seperti HP |
| Tanpa WebGL / sangat lemah | Browser lama | 2D | Semua pos lewat 2D atau layar Peta + layar misi DOM |

---

## 9. Bahasa dan konten untuk siswa SMA

### 9.1 Pedoman nada

- **Sapaan "kamu"**, kalimat aktif, maksimal 20 kata per kalimat di hologram, satu instruksi per kalimat.
- **Nara ramah dan singkat**, tidak menghakimi. Pola umpan balik yang sudah benar di `quest.js` ("Belum tepat — tidak apa-apa, lanjut ke tugas berikutnya!" + jawaban tepat + penjelasan) dijadikan standar untuk semua pos.
- **Istilah biologi dipertahankan** (amilase, protease, lipase, empedu, vili, mikrovili, kapiler, pembuluh kil) karena itu materi ujian. Saat pertama muncul di setiap pos, beri glosarium sentuh: istilah bergaris bawah titik yang membuka definisi satu kalimat.
- **Bahasa gaul secukupnya.** "Mabar" dan "Regu" cocok untuk remaja; jangan dipakai di instruksi akademik. Hindari campuran Inggris yang tidak perlu di tombol (pilih "Orbit" tetap boleh karena istilah game, tetapi beri penjelasan di tooltip seperti yang sudah ada).
- **Angka simulasi selalu bertanda.** Label "SIMULASI" di judul stimulus sudah ada; pastikan juga ada di hologram terminal 3D dan di kartu Pos 1–5.

### 9.2 Teks yang harus diperbaiki (usang atau bertentangan)

| Lokasi | Teks sekarang | Ganti menjadi |
|---|---|---|
| `play.html` `.retry-note` | "Tidak ada nyawa yang hilang. Baca kembali bukti dan coba lagi." | "Setiap tantangan dijawab sekali. Kalau belum tepat, Nara menjelaskan jawabannya dan kamu tetap lanjut." |
| `index.html` stat strip | "2–4 pemain per tim diskusi" | "1–4 pemain per regu" |
| `index.html` kartu Nara | "petunjuk bertahap" | "arahan dan penjelasan" |
| `play.html` `.map-footer` | "PROGRES TERSIMPAN DI PERANGKAT INI" (selalu) | Dinamis: server kelas / browser ini |
| `play.html` `.panel-subtitle` peringkat | "Hanya ekspedisi yang selesai di peramban ini…" (selalu) | Dinamis sesuai mode |
| `play.html` `#chat-title` | "OBROLAN TIM" | "OBROLAN KELAS" (obrolan memang dibaca seluruh kelas dan guru), atau pisahkan kanal regu dan kelas |
| Topbar + footer | "VERSI PROTOTIPE · MULTIPEMAIN KELAS", "MATERI UJI KELAS" | Pertahankan selama uji, hapus "PROTOTIPE" saat rilis |

### 9.3 Integritas tugas belajar (P0)

`row.highlight` mewarnai sel tabel yang "berbeda" sebelum siswa menjawab. Di varian Pos 1 yang dibangkitkan (`missions.js` baris 902), sorotan hanya diberikan pada indikator yang nilainya berbeda, sedangkan indikator dengan nilai sama (pengalih) tidak disorot. Padahal tantangan Pos 1 meminta siswa membedakan bukti dari pengalih. Pola yang sama ada di Pos 2–5.

Keputusan: **jangan tampilkan sorotan sebelum tantangan dijawab.** Setelah dijawab, tampilkan sorotan sebagai pembahasan dengan ikon (▲/▼) dan teks, bukan warna saja. Perubahannya kecil di `game.js` (render stimulus) dan render terminal di `quest.js`; data `missions.js` tidak perlu diubah.

### 9.4 Keterbacaan konten

- Instruksi hologram yang panjang (misalnya bantuan kontrol di `world3d.js` baris 113, satu paragraf dengan lebih dari 15 pintasan) dipecah menjadi kartu kontrol bertingkat: "Dasar" (gerak, lompat, interaksi) dulu, "Lanjutan" (mode kamera, kunci target) bisa dibuka.
- Tips muat (`TIPS` di `app.js`) bagus sebagai pengulangan konsep. Tambahkan tips per pos yang sedang dikerjakan.

---

## 10. Panel guru (`admin.html`)

Yang sudah baik: PIN, statistik, jeda/bekukan, buka-tutup pos dengan "Hanya Pos 1", pengumuman, peta langsung, pesan pribadi, ekspor, regu, konfirmasi untuk tindakan berbahaya.

Rekomendasi:

1. **Urutkan ulang dasbor sesuai ritme kelas**: (a) bar kendali lengket di atas (Jeda, Bekukan, Obrolan, Kumpulkan, Pengumuman cepat); (b) **"Perlu perhatian"**: siswa yang tidak bergerak > 5 menit, belum bergabung regu, punya bendera ⚠ validasi, atau keluar mendadak; (c) peta langsung dan tabel; (d) regu; (e) pengaturan pos dan kode kelas; (f) obrolan.
2. **Tindakan berbahaya** (Atur ulang progres, Keluarkan, Hapus data) memakai `confirm()` bawaan browser. Ganti dengan `<dialog>` yang menuliskan nama siswa dan meminta mengetik nama alias untuk "Hapus data penjelajah". Pisahkan secara visual dari tindakan biasa dengan garis dan ikon ⚠.
3. **Mode proyektor**: tombol yang memperbesar peta langsung dan progres regu ke layar penuh dengan huruf besar, **tanpa** nama pengguna lengkap atau skor individu (aman ditampilkan ke kelas).
4. **Tabel penjelajah di laptop guru 1366 px**: 8 kolom. Gabungkan "Skor", "Segel", "Pos 1–6" menjadi satu kolom progres berupa enam ikon status (🔒/◐/✓ + teks sr-only). Kolom "Layar" dan "Terakhir aktif" jadi satu: "Pos 3 · 2 menit lalu".
5. **Pilihan peringkat** (Mati/Regu/Penuh) dan **ukuran teks siswa** ditaruh di sini sebagai pengaturan kelas.
6. Panel guru tidak dirancang untuk HP; cukup pastikan bisa dipakai di tablet (≥ 768 px) untuk guru yang berjalan di kelas: bar kendali dan "Perlu perhatian" harus berfungsi di lebar itu.

---

## 11. Aksesibilitas: audit dan rencana

Target dari dokumen desain dan `CLAUDE.md`: papan ketik (Tab/Enter), status tidak hanya warna, lebar 1024 px, zoom 125%, sentuh, perangkat lemah, `prefers-reduced-motion`.

| Kriteria | Kondisi sekarang | Tindakan | Prioritas |
|---|---|---|---|
| Kontras teks (WCAG 1.4.3) | Hijau, toska, kuning, oranye, putih-di-toska gagal (§5.2) | Token `--*-ink` dan `--brand` (§5.3) | P0 |
| Ukuran teks | ±130 deklarasi 7–10 px | Minimum 12 px label, 14 px isi, 16 px input | P0 |
| Zoom 125–200% (1.4.4, 1.4.10) | Banyak ukuran px tetap dan `min-width` (`.wordmark` 250 px, `.world-side` 250 px) | Ukuran dalam `rem`; uji 1024 px × 125% dan 1280 px × 200% | P1 |
| Fokus terlihat (2.4.7) | Ada `focus-visible` di 24 tempat, tetapi `outline:none` di input dan warna cincin berbeda-beda | Satu cincin `--focus` dua lapis di semua elemen interaktif | P1 |
| Dialog (hologram) | `role="dialog"` + `aria-modal`, Esc menutup, autofokus | Tambah `aria-labelledby`, perangkap fokus, kembalikan fokus | P1 |
| Live region | `#w3-goal` polite berubah terus; `#phase-loading` seluruhnya live; banner guru assertive | Hanya umumkan perubahan bermakna (§6.2) | P1 |
| Status bukan warna saja | Sudah baik di beberapa tempat (✓ di GRAFIS/KAMERA, ikon gembok) | Pola tag baku untuk pos, tahap Dapur, regu, voting | P1 |
| Papan ketik di dunia 3D | Kontrol lengkap, Tab sengaja tidak dipakai untuk kunci target | Pertahankan. Tambah pintasan "Pergi ke tujuan berikutnya" (mis. G) yang berjalan otomatis ke objek misi, untuk siswa yang kesulitan navigasi 3D | P2 |
| Gerak (2.3.3) | `prefers-reduced-motion` dihormati di `fx.js`, `map-art.js`, dan sebagian besar CSS | Tambah sakelar "Kurangi gerak" di ⚙ untuk perangkat yang tidak mengirim preferensi OS; matikan juga ayunan kamera dan animasi portal | P1 |
| Teks alternatif | Splash, kanvas, peta punya `alt`/`aria-label` yang deskriptif | Pertahankan. Simulator Vili 3D perlu ringkasan teks hasil eksperimen | P2 |
| Audio | Belum ada audio sama sekali | Bila ditambahkan: bisu bawaan di kelas, tombol bisu dan volume di ⚙, semua pesan tetap teks | Catatan |
| Bahasa halaman | `lang="id"` di semua halaman | Sudah baik | — |

---

## 12. Peta jalan implementasi

Urutan ini disusun agar setiap langkah bisa diuji sendiri dan tidak mengubah skor, skema simpan, atau protokol server.

### P0 (sebelum uji dengan siswa)

1. Lembar bawah Regu/Pengumuman/Obrolan untuk ≤ 900 px (`app.css`, `theme.css`, `app.js`).
2. `100dvh`, `safe-area`, `viewport-fit=cover` (`app.css`, `play.html`).
3. Token warna dan ukuran huruf baru, ganti teks berwarna aksen (`theme.css`; hapus nilai yang tumpang tindih di `styles.css`).
4. Matikan sorotan sel sebelum menjawab (`game.js`, `quest.js`).
5. Perbaiki teks usang di §9.2 (`play.html`, `index.html`, `game.js`).

### P1 (sebelum rilis beta)

6. HUD enam zona, tombol ☰ Menu, ⚙ Pengaturan, "?" kartu kontrol (`world3d.js`, `app.css`, `theme.css`).
7. Hologram: `aria-labelledby`, perangkap fokus, kembalikan fokus, layar penuh di HP, jeda render (`quest.js`, `world3d.js`).
8. Font self-host + CSP `font-src 'self'` (`assets/fonts/`, `styles.css`, `theme.css`, `server.js` STATIC dan CSP).
9. Satu komponen muat, hapus jeda 1,8 dtk (`app.js`, `splash.js`).
10. Pemantau FPS dan `visibilitychange` (`world3d.js`).
11. Peringkat yang dapat diatur guru (`game.js`, `admin.js`, `server.js` settings).
12. Panel guru: "Perlu perhatian", dialog konfirmasi, kolom progres ringkas (`admin.js`, `admin.css`).
13. Live region dan fokus baku (§11).

### P2 (penghalusan)

14. Muat skrip pos sesuai kebutuhan, kompresi dan cache.
15. Kerapatan instance dan kabut khusus 3D Ringan.
16. Mode proyektor guru, pintasan "Pergi ke tujuan", glosarium istilah, saran orientasi lanskap.

Catatan teknis untuk pelaksana: file baru (font, `tokens.css`) **wajib** ditambahkan ke peta `STATIC` di `server.js`, karena tanpa itu server kelas mengembalikan 404 walaupun berfungsi dari `file://`. CSP melarang skrip inline, jadi semua perilaku baru tetap di file `.js`.

---

## 13. Kriteria penerimaan UI/UX

Sebuah perubahan UI dianggap selesai bila:

1. **HP 360 × 740 (potret dan lanskap):** siswa bisa daftar, membentuk dan bergabung regu, membaca pengumuman, mengobrol, terjun ke Pos 1, membuka setiap hologram, dan menyegel pos tanpa elemen terpotong.
2. **Laptop 1366 × 768 dan 1024 px pada zoom 125%:** tidak ada teks di bawah 12 px, tidak ada gulir horizontal di luar tabel data, HUD menutup kurang dari 25% area dunia.
3. **Papan ketik saja:** seluruh alur Pos 1 dari lobi sampai Kartu Hasil Pos bisa diselesaikan; fokus selalu terlihat dan tidak pernah hilang ke belakang hologram.
4. **Pembaca layar (NVDA + Chrome):** pengumuman hanya untuk perubahan bermakna; setiap hologram dibacakan judulnya saat terbuka.
5. **Kontras:** semua teks lulus 4,5:1 (teks besar ≥ 24 px lulus 3:1), diperiksa dengan alat kontras pada token baru.
6. **Gerak:** dengan `prefers-reduced-motion` atau sakelar "Kurangi gerak", tidak ada animasi berulang di layar.
7. **Laptop lemah (4 inti atau kurang, grafis terintegrasi):** 3D Ringan stabil ≥ 25 fps di wilayah pos; bila tidak, game menawarkan 2D sendiri.
8. **Konten:** tidak ada teks yang bertentangan dengan aturan sekali jawab, regu 1–4, atau mode penyimpanan aktif; angka Pos 1–5 bertanda simulasi di semua tampilan.
