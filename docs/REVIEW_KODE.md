# Review Kode NUTRANTARA

Tanggal: 23 November 2026
Cakupan: semua kode game di akar repo (`server.js`, `missions.js`, `world-data.js`, `net.js`, `game.js`, `team.js`, `world.js`, `world3d.js`, `quest.js`, `lab.js`, `absorb.js`, `region.js`, `culture.js`, `characters.js`, `causal.js`, `claims.js`, `archive.js`, `app.js`, `landing.js`, `peta3d.js`, `map-art.js`, `sky.js`, `fx.js`, `splash.js`, `admin.js`, berkas HTML, `Dockerfile`, `render.yaml`, `test/smoke.js`). Folder `anthropic-skills/`, `blender-skills/`, `ponytail/`, `ui-ux-pro-max-skill/`, dan `vendor/` tidak direview.

Cara review: membaca `server.js` dan `net.js` baris per baris, menelusuri jalur data ke `innerHTML` di semua modul klien, menjalankan ESLint (aturan `no-unused-vars`, `no-undef`, dan aturan bug dasar lain) pada semua berkas, serta mencoba temuan kritis langsung pada server uji. `npm test` dijalankan pada salinan kode (Node 22) sebelum dan sesudah perubahan: **semua uji lulus**.

Ringkasan: kodenya rapi. ESLint tidak menemukan galat, hanya 5 variabel/fungsi tak terpakai, dan semuanya sudah dihapus. Satu temuan **kritis** perlu segera diperbaiki: satu pesan WebSocket yang salah bentuk dari siswa mana pun dapat mematikan server kelas.

---

## Temuan menurut keparahan

### KRITIS

**K1. Satu pesan `progress` yang salah bentuk mematikan seluruh server** (`server.js`, `handleProgress` → `lockAnswers` dan `overlayTeam`)

`handleProgress` hanya memeriksa bahwa `msg.state.posts` bernilai *truthy*. Bila `posts` berupa angka atau teks (mis. `{ posts: 5 }`), atau satu pos berisi nilai primitif (mis. `{ posts: { 1: 5 } }`), server mencoba menulis properti ke nilai primitif. Dalam mode `'use strict'` ini melempar `TypeError`. Tidak ada `try/catch` di penangan pesan, sehingga proses Node berhenti dan semua siswa terputus.

Sudah dicoba pada server uji, dan ketiga variasi mematikan server (`SERVER EXIT 1`):

- siswa yang sudah pernah menjawab satu tantangan mengirim `{ type: 'progress', state: { posts: 5 } }` → `TypeError: Cannot create property '1' on number '5'` di `lockAnswers`;
- anggota regu mengirim pesan yang sama → galat yang sama di `overlayTeam`;
- anggota regu mengirim `{ posts: { 1: 5 } }` → `Cannot create property 'started' on number '5'` di `overlayTeam`.

Cukup akun siswa biasa dan konsol peramban. Progres yang belum tersimpan (jeda 1 detik) ikut hilang, dan pada Render server mati sampai di-restart.

Usulan perbaikan (belum dikerjakan karena mengubah perilaku server untuk masukan yang salah bentuk):

```js
// handleProgress, sebelum lockAnswers
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
if (!isObj(msg.state) || !isObj(msg.state.posts)) return;
for (const k of Object.keys(msg.state.posts)) if (!isObj(msg.state.posts[k])) delete msg.state.posts[k];
```

Tambahkan juga pengaman `typeof dst === 'object'` di `overlayTeam`, dan uji asap untuk ketiga bentuk pesan di atas.

### TINGGI

**T1. Pembatas laju login dan PIN admin bisa dilewati saat `TRUST_PROXY=1`** (`server.js`, `clientIp`; `render.yaml` menyalakan `TRUST_PROXY=1`)

`clientIp` mengambil entri **paling kiri** dari `X-Forwarded-For`. Entri itu ditulis oleh klien sendiri, sedangkan proksi Render menambahkan IP asli di **kanan**. Penyerang cukup mengganti header ini di setiap permintaan atau koneksi WebSocket, sehingga:

- batas 12 percobaan login per menit per IP tidak berlaku (tebak kata sandi siswa);
- kunci 30 detik setelah 5 PIN admin salah tidak berlaku. Di produksi PIN boleh hanya 6 karakter, jadi 6 angka (900.000 kemungkinan) bisa ditebak dalam waktu wajar.

Usulan: ambil entri paling kanan (`split(',').pop().trim()`), atau entri ke-N dari kanan sesuai jumlah proksi. Wajibkan juga PIN produksi lebih panjang (mis. ≥ 10 karakter) atau tambahkan batas global percobaan PIN. Belum dikerjakan karena mengubah perilaku di produksi.

**T2. Tidak ada pengaman galat di penangan pesan WebSocket** (`server.js`, `wss.on('connection')` → `ws.on('message')`)

K1 hanya satu contoh. Galat apa pun yang tidak tertangkap di penangan (bug di masa depan, data lama yang bentuknya aneh) mematikan server untuk satu kelas penuh. Usulan: bungkus isi penangan `message` dengan `try { … } catch (err) { console.error('[ws]', msg && msg.type, err); }`. Belum dikerjakan (perubahan perilaku, sebaiknya disertai uji).

### SEDANG

**S1. Ukuran dan bentuk progres tidak dibatasi, dan penyimpanan memblokir server** (`server.js`, `handleProgress`, `flushDb`)

State dari klien disimpan apa adanya, sampai 256 KB per pesan (`maxPayload`), hingga 40 pesan per detik. `flushDb` menulis seluruh basis data dengan `JSON.stringify(db, null, 2)` secara sinkron setiap detik selama ada perubahan. Dengan 60 siswa, berkas bisa bermegabyte-megabyte dan setiap simpan menahan *event loop*, sehingga gerak terasa patah-patah. Usulan: batasi ukuran `state` (mis. 64 KB, tolak bila lebih), buang kunci yang tidak dikenal, dan simpan tanpa indentasi.

**S2. Ekspor CSV rentan injeksi formula** (`admin.js`, `exportData`)

Alasan dan refleksi siswa ditulis apa adanya ke CSV. Teks yang diawali `=`, `+`, `-`, atau `@` dijalankan sebagai formula saat guru membuka CSV di Excel atau Google Sheets. Selain itu `\r` tidak ikut dikutip. Usulan: awali sel seperti itu dengan `'` dan tambahkan `\r` ke regex pengutipan.

**S3. Panel guru gagal bila data progres berisi `null`** (`admin.js`, `showDetail` dan `exportData`)

`(s.challenges || []).map((c) => c.complete …)` gagal bila salah satu elemen `null`. Server menerima dan menyimpan elemen seperti itu (`validateProgress` melewatinya tanpa membuangnya). Akibatnya satu siswa bisa membuat tombol Detail dan ekspor CSV milik guru gagal untuk seluruh kelas. Usulan: `c && c.complete` di klien admin, atau buang elemen non-objek di `validateProgress`.

**S4. Operasi regu: batas ukuran dicek sebelum operasi diterapkan, dan peran hanya dijaga di klien** (`server.js`, `handleTeamOp` / `applyTeamOps`)

- Batas 400 KB dicek sebelum operasi diterapkan, jadi pesan terakhir masih bisa menambah hingga ±256 KB (`maxPayload`) dan data regu bisa mencapai ±650 KB. Selain itu `JSON.stringify(team.posts)` dihitung ulang pada setiap pesan. Usulan: cek ukuran sesudah operasi diterapkan dan batalkan bila melewati batas.
- Pembagian tugas per peran (`team.js`) hanya dijaga di klien. Server menerima `set` pada jalur mana pun di bawah `activity`, termasuk telaah sejawat anggota lain di `activity.arsip.reviews`. Ini dampaknya kecil (hanya dalam satu regu), tetapi perlu dicatat bila guru mengandalkan log kontribusi untuk penilaian.

### RENDAH

- **R1. Perintah admin `teleport` dengan `all` bisa gagal sesaat setelah `delete`** (`server.js`, `handleAdmin`). Soket pemain yang dihapus masih ada di `conns` sampai event `close`, sehingga `db.players[id]` bernilai `undefined` dan `p.x` melempar galat, lalu server mati (lihat T2). Peluangnya sangat kecil. Usulan: `.filter(Boolean)` seperti di siaran posisi.
- **R2. Kecepatan gerak hanya dibatasi per pesan** (`handleMove`): 60 unit per pesan × 40 pesan per detik ≈ 240 m/detik. Dampaknya hanya visual, karena server tetap menjepit gerak ke pulau yang diizinkan.
- **R3. `failedLogins` dan `authAttempts` tidak pernah dibersihkan.** Memori bertambah per IP, terutama bila digabung dengan T1. Usulan: hapus entri kedaluwarsa di interval yang sudah ada.
- **R4. `same()` membandingkan lewat `JSON.stringify`**, jadi urutan kunci berpengaruh. Untuk jawaban `sort`, dua usulan yang isinya sama tetapi urutan kuncinya beda tidak dihitung sebagai suara yang sama. Saat ini aman karena `game.js` dan `quest.js` sama-sama menyusun peta mengikuti urutan elemen `<select>`.
- **R5. Pesan galat daftar akun**: kata sandi di atas 72 karakter ditolak dengan pesan "minimal 6 karakter".
- **R6. `teleport` memakai `Number(msg.x) || spawn`**, jadi koordinat 0 dianggap kosong (di peta saat ini 0 berada di tepi, jadi praktis tidak terjadi).
- **R7. Kunci jawaban ikut terkirim ke klien.** Keterbatasan ini sudah dicatat di `CLAUDE.md`. `lockAnswers` mencegah mengganti jawaban, tetapi tidak mencegah siswa membaca kunci sebelum menjawab.

### Kode mati, duplikasi, dan kerapian

- **Duplikasi `esc`/`escapeHtml`**: fungsi pelolos HTML yang sama ditulis ulang di 14 berkas. Bisa dipindah ke satu modul bersama, tetapi berkas klasik dan modul ES memuatnya dengan cara berbeda, jadi tidak dikerjakan.
- **Logika penilaian ganda** (`isCorrect`, `awardForAttempt`, `SEAL_POINTS`, `MIN_REASON`) ada di `game.js` dan `server.js`. Ini disengaja dan sudah dicatat di `CLAUDE.md` ("harus sama"). Sejak 0.7, `awardForAttempt` praktis selalu memberi 30 karena percobaan dipaksa 1. Fungsi ini bisa disederhanakan menjadi konstanta, tetapi tidak dikerjakan agar kedua sisi tetap sejajar.
- **Ekspor yang tidak diimpor dari luar**: `colorFrom`, `createLeafGlider` (`characters.js`), dan `packageFace` (`claims.js`) diekspor tetapi hanya dipakai di berkasnya sendiri. Ini tidak berbahaya dan dibiarkan.
- **Akhir baris campuran**: `sky.js`, `splash.js`, dan `world.js` memakai CRLF, sedangkan berkas lain LF. Usulan: tambahkan `.gitattributes` (`* text=auto eol=lf`) lalu normalkan sekali. Tidak dikerjakan agar tidak muncul diff satu berkas penuh.

### Yang sudah baik

- Semua data dari pengguna (alias, obrolan, log regu, alasan, telaah, pengumuman) yang masuk `innerHTML` sudah diloloskan dengan `esc`/`escapeHtml`. Tidak ditemukan celah XSS. `showToast` dan banner memakai `textContent`.
- Kata sandi memakai scrypt dengan salt, token sesi disimpan sebagai hash, perbandingan PIN dan kata sandi memakai `timingSafeEqual`, dan ekspor admin membuang `passHash` dan `sessions`.
- Berkas statis disajikan lewat daftar putih, `server.js` tidak bisa diunduh, dan CSP ketat (`script-src 'self'`).
- `applyTeamOps` menolak `__proto__`, `constructor`, dan `prototype` (aman dari *prototype pollution*), dan `lockAnswers` mencegah mengganti jawaban atau varian.
- Cadangan bergulir dan pemulihan saat `classroom.json` rusak sudah benar. Perubahan terbaru di `server.js` (jawaban terkunci, cadangan, siaran per wilayah) tidak diubah.

---

## Yang sudah diubah

Hanya penghapusan kode mati yang pasti tidak terpakai, dan perilaku game tidak berubah. Semua sudah dicek dengan ESLint (`no-unused-vars`), `node --check` untuk semua berkas, dan `npm test` (semua uji lulus).

| Berkas | Perubahan |
|---|---|
| `server.js` | Menghapus fungsi `colorFor` (tidak pernah dipanggil; warna pemain diambil dari `PLAYER_COLORS`). |
| `server.js` | Menghapus `const token = null` dan kolom `token` di pesan `welcome` (selalu `null`, tidak dibaca `net.js` maupun uji). |
| `admin.js` | Menghapus konstanta `SCREEN_LABEL` yang tidak dipakai. |
| `world.js` | Menghapus helper `$` yang tidak dipakai. |
| `world3d.js` | Menghapus `const m = missionOf(id)` yang tidak dipakai di `startDrop` (`missionOf` hanya pencarian tanpa efek samping). |

Tidak ada commit atau push. Tidak ada skrip lain dari folder yang dijalankan.

## Pembaruan 27 November 2026

Temuan K1, T1, T2, S1–S4, R1, R3, R5, dan R6 ternyata masih ada di versi 1.4. Semuanya kini diperbaiki. K1 dibuktikan dulu dengan uji asap baru (server mati dengan `TypeError: Cannot create property '1' on number '5'`), lalu uji yang sama lulus setelah perbaikan. Selain itu, rekaman gameplay penuh Pos 1–6 di peramban hanya memunculkan satu peringatan Three.js dan tidak ada exception.

| Temuan | Perbaikan |
|---|---|
| K1 | `handleProgress` menolak `state`/`posts` yang bukan objek, membuang pos primitif, dan menormalkan elemen `challenges`. `overlayTeam` tidak lagi menulis ke pos primitif. |
| T2 | Isi penangan pesan WebSocket dipindah ke `routeMessage` dan dibungkus `try/catch`. Galat hanya menggagalkan pesan itu dan dicatat di log. |
| T1 | `clientIp` memakai entri paling kanan `X-Forwarded-For` (yang ditulis proksi), bukan entri kiri yang ditulis klien. |
| S1 | Progres di atas 96 KB ditolak dengan pemberitahuan (progres tamat Pos 1–6 ±11 KB). `classroom.json` ditulis tanpa indentasi (±separuh ukuran). |
| S2 | Sel CSV yang diawali `=`, `+`, `-`, `@`, tab, atau CR diawali `'`, dan `\r` ikut dikutip. |
| S3 | Detail dan ekspor CSV di panel guru tahan elemen `challenges` yang `null`. |
| S4 | Batas 400 KB data regu dicek sesudah operasi diterapkan. Bila terlampaui, data regu dikembalikan. |
| R1, R6 | `teleport` ke `all` melewati pemain yang sudah dihapus, dan koordinat `0` dihormati. |
| R3 | Catatan `failedLogins` dan `authAttempts` yang kedaluwarsa dibuang tiap 30 detik. |
| R5 | Kata sandi di atas 72 karakter mendapat pesan "maksimal 72 karakter". |
| Lain | `quest.js`: opsi `flatShading` dihapus dari material toon (peringatan Three.js satu-satunya selama gameplay penuh). |

Uji asap baru: 7 jenis pesan salah bentuk tidak mematikan server, progres sah tetap utuh sesudahnya, dan progres di atas 96 KB ditolak. `npm test`: semua uji lulus.

Belum dikerjakan (tetap seperti catatan di atas): R2 (kecepatan gerak per pesan), R4 (`same()` peka urutan kunci), R7 (kunci jawaban terkirim ke klien), duplikasi `esc`, dan akhir baris CRLF di tiga berkas.

## Urutan perbaikan yang disarankan (23 November; butir 1–4 selesai 27 November 2026)

1. K1 + T2: validasi bentuk `progress` dan pengaman `try/catch` di penangan WebSocket, ditambah uji asap untuk pesan salah bentuk.
2. T1: ambil IP dari entri paling kanan `X-Forwarded-For`, lalu perpanjang PIN produksi.
3. S3 dan S2: panel guru tahan data `null`, dan CSV aman dari formula.
4. S1 dan S4: batas ukuran progres dan data regu, dan simpan JSON tanpa indentasi.
