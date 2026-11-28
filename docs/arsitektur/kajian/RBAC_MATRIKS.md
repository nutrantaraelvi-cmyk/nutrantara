# Matriks RBAC NUTRANTARA

Dokumen ini memetakan siapa boleh melakukan apa di server kelas NUTRANTARA (`server.js`), aturan kepemilikan data, celah izin di kode sekarang, dan usulan penerapannya. Dasar pembacaan: `server.js` (±1.330 baris), `team.js`, `missions.js` (`NUTRANTARA_TEAM`), `admin.js`, `net.js`, `app.js`, `docs/arsitektur/kajian/ARSITEKTUR_SERVER.md`, dan `docs/arsitektur/kajian/ARSITEKTUR_DATABASE.md`. Dokumen ini tidak mengubah kode.

Nomor baris merujuk ke `server.js` saat dokumen ini ditulis (23 November 2026).

---

## 1. Daftar peran

### 1.1 Peran yang sudah ada di kode

| Peran | Cara mendapatkannya | Penanda di kode | Cakupan |
| :-- | :-- | :-- | :-- |
| **Anonim** | Membuka HTTP atau WebSocket tanpa sesi | `conn.role === null` | Halaman statis, `/health`, `/api/status`, `/api/register`, `/api/login`, pesan WS `join` dan `admin-auth` |
| **Tamu (luring)** | Tombol "mode tamu" di `app.js` saat server tidak ada | `localStorage` `nutrantara-guest-v1`, `user.offline` | Hanya peramban sendiri. Tidak pernah menyentuh server, tidak punya regu, memegang keempat peran (mode solo) |
| **Siswa** | Daftar/masuk (`/api/register`, `/api/login`), lalu WS `join` dengan token sesi | `conn.role === 'player'`, `conn.playerId` | Progres sendiri, dunia bersama, obrolan, emote, membentuk/gabung regu |
| **Anggota regu** | Siswa yang `p.team` menunjuk regu yang ada | `teamOf(p)`, `sameTeam(a, b)` | Data bersama regu per pos (`SHARED_KEYS`), voting jawaban, terjun ke dekat teman |
| **Ketua regu** | Pembentuk regu, atau anggota pertama yang tersisa bila ketua keluar | `team.leaderId` | Saat ini **tidak punya hak tambahan apa pun** (hanya ditampilkan) |
| **Pemegang peran pos** | Otomatis dan bergilir: peran r di pos p = anggota ke-`(r + p − 1) mod n` | `NutraTeam.holder()` di `team.js` (klien saja) | Tugas tertentu di pos (terminal, meja lab, kartu, dapur, dst. sesuai `NUTRANTARA_TEAM.tasks`) |
| **Guru (admin)** | WS `admin-auth` dengan PIN `NUTRANTARA_ADMIN_PIN` | `conn.role === 'admin'` | Seluruh kelas: pengaturan, moderasi, akun, progres, regu, ekspor |
| **Operator server** | Akses ke mesin/hosting (Render, laptop guru) | Di luar aplikasi | Variabel lingkungan, `data/classroom.json`, folder `data/backup`, log konsol (PIN tercetak di mode non-produksi) |
| **Sistem** | Proses server sendiri | `validateProgress`, `lockAnswers`, `overlayTeam`, `normalizeTeamPost` | Skor, kebenaran jawaban, segel sah, bendera ⚠ |

### 1.2 Peran yang diusulkan

| Peran usulan | Alasan |
| :-- | :-- |
| **Guru pengajar** | Kendali kelas sehari-hari: jeda, buka pos, pengumuman, teleport, bisukan, keluarkan sementara, lihat detail |
| **Guru pengelola** (pemilik kelas) | Aksi yang merusak atau membuka data: hapus siswa, atur ulang progres, atur ulang kata sandi, ekspor, bubarkan regu, kode kelas |
| **Pengamat** (opsional: guru tamu, peneliti, pengawas) | Hanya baca panel guru, tanpa obrolan pribadi dan tanpa ekspor |

Pemisahan ini baru bermanfaat bila ada lebih dari satu orang dewasa yang memegang panel. Untuk satu guru per kelas, cukup satu peran guru ditambah konfirmasi ulang PIN untuk aksi berisiko (bagian 5.3).

---

## 2. Matriks peran lawan aksi

Keterangan: ✅ boleh · ❌ tidak boleh · 🔸 boleh dengan syarat (lihat catatan) · ⚠ boleh di kode sekarang padahal seharusnya tidak, atau hanya dicegah di klien.

### 2.1 Akun dan sesi (HTTP)

| Aksi | Anonim | Tamu | Siswa | Guru | Catatan |
| :-- | :-: | :-: | :-: | :-: | :-- |
| `GET /`, `/play`, `/admin`, berkas `STATIC` | ✅ | ✅ | ✅ | ✅ | `/admin` hanya halaman; kuasa baru ada setelah PIN |
| `GET /health` | ✅ | – | ✅ | ✅ | Membuka jumlah pemain daring, `storage`, `recovery` |
| `GET /api/status` | ✅ | – | ✅ | ✅ | Jumlah daring dan apakah kode kelas wajib |
| `POST /api/register` | 🔸 | – | – | – | Butuh kode kelas bila diatur, kuota `MAX_PLAYERS`, 12 percobaan/menit/IP |
| `POST /api/login` | 🔸 | – | – | – | Ditolak bila `blocked` |
| `GET /api/me` | ❌ | – | ✅ ⚠ | – | Tidak memeriksa `blocked` (baris 1142) |
| `POST /api/logout` | – | – | ✅ | – | Hanya sesi yang dipakai |
| Ganti kata sandi sendiri | – | – | ❌ | – | Belum ada fitur; hanya lewat guru (`reset-password`) |

### 2.2 Dunia dan sosial (WebSocket, peran `player`)

| Aksi (`type`) | Siswa tanpa regu | Anggota regu | Guru | Catatan |
| :-- | :-: | :-: | :-: | :-- |
| `join` (masuk dunia) | 🔸 | 🔸 | ⚠ | Butuh sesi sah dan tidak `blocked`. Soket guru yang mengirim `join` berubah menjadi soket pemain |
| `move` | 🔸 | 🔸 | ❌ | Ditolak saat `paused`/`movementLocked`; lompatan ≤60 unit; dijepit ke pulau terbuka |
| `zone` | ✅ | ✅ | ❌ | Hanya `lobby`/`world` |
| `spawn` ke pulau | 🔸 | 🔸 | ❌ | Hanya pulau di `allowedFor(p)` |
| `spawn` ke teman (`to`) | ❌ | 🔸 | ❌ | Hanya teman satu regu yang daring dan berada di dunia |
| `emote` | 🔸 | 🔸 | ❌ | Tidak saat jeda; 1,2 detik |
| `chat` (umum) | 🔸 | 🔸 | ❌ | Tidak saat obrolan dimatikan atau dibisukan; 1,5 detik. Guru tidak bisa mengirim obrolan, hanya `announce`/`message` |
| Membaca obrolan | ✅ | ✅ | ✅ | Semua pesan umum; guru melihat 100 terakhir |
| Melihat alias, warna, posisi, segel, skor siswa lain | ✅ | ✅ | ✅ | `publicPlayer`, `leaderboard`. Daftar posisi penuh dikirim ke semua pemain tiap 2 detik |
| `progress` (simpan progres sendiri) | ✅ | ✅ | ❌ | Server menghitung ulang skor, mengunci jawaban, menimpa bagian regu |
| `ping` | ✅ | ✅ | ❌ | |

### 2.3 Regu proyek

| Aksi | Siswa tanpa regu | Anggota | Ketua | Pemegang peran | Guru | Catatan |
| :-- | :-: | :-: | :-: | :-: | :-: | :-- |
| `party create` | ✅ | – | – | – | ❌ | Progres pembentuk menjadi data awal regu |
| `party join` dengan kode | 🔸 | 🔸 | 🔸 | – | ❌ | Maks. 4 anggota, 8 kode salah/menit/koneksi. Bergabung otomatis keluar dari regu lama |
| `party leave` | – | ✅ | ✅ | – | ❌ | Ketua pindah ke anggota pertama |
| Mengeluarkan anggota lain | – | ❌ | ❌ | – | ❌ | Belum ada; guru hanya bisa membubarkan seluruh regu |
| Mengganti kode undangan | – | ❌ | ❌ | – | ❌ | Kode berlaku selamanya |
| `team-op` pada tugas peran sendiri | – | ✅ | ✅ | ✅ | ❌ | |
| `team-op` pada tugas peran teman yang **daring** | – | ⚠ | ⚠ | – | ❌ | Ditolak hanya di klien (`NutraTeam.gate`); server menerima |
| `team-op` pada tugas peran teman yang **luring** | – | 🔸 | 🔸 | – | ❌ | Ambil alih yang disengaja desain; seharusnya dicatat di log oleh server |
| `team-op` menyetel `variant` | – | 🔸 | 🔸 | – | ❌ | Hanya sekali, saat varian regu belum ada |
| `team-op` pada `challenges` | – | ❌ | ❌ | ❌ | ❌ | Ditolak server (`OP_KEYS`) |
| `team-op` pada `initial`/`review`/`revision` (Pos 6) | – | ⚠ | ⚠ | 🔸 | ❌ | Server menerima dari siapa saja, termasuk `savedAt` buatan |
| `team-vote` (usul/suara jawaban) | – | ✅ | ✅ | – | ❌ | Kunci: 2 suara sama, atau 1 bila anggota lain tidak aktif 24 jam |
| Membaca data regu, log, kontribusi | – | ✅ | ✅ | – | ✅ | `teamView` / `adminTeam` |
| Membaca alasan Paspor teman (pos tersegel) | – | ✅ | ✅ | – | ✅ | Untuk telaah sejawat Pos 6 (`reasonsOf`) |

### 2.4 Kendali guru (`admin` sub-perintah)

Kolom "Usulan" menunjukkan siapa yang seharusnya memegang aksi itu bila peran guru dipecah (bagian 1.2). P = guru pengajar, K = guru pengelola, A = pengamat.

| Aksi | Guru sekarang | P | K | A | Risiko | Catatan |
| :-- | :-: | :-: | :-: | :-: | :-- | :-- |
| `admin-refresh`, menerima `admin-state` dan `positions` | ✅ | ✅ | ✅ | ✅ | Rendah | Termasuk bendera ⚠ dan ringkasan progres |
| `detail` (progres lengkap seorang siswa) | ✅ | ✅ | ✅ | ✅ | Sedang | Berisi alasan dan refleksi tertulis |
| `set-paused`, `set-chat`, `set-movement` | ✅ | ✅ | ✅ | ❌ | Rendah | |
| `set-post`, `set-posts` | ✅ | ✅ | ✅ | ❌ | Rendah | |
| `announce`, `message` (pesan pribadi) | ✅ | ✅ | ✅ | ❌ | Rendah | |
| `teleport` (satu / semua) | ✅ | ✅ | ✅ | ❌ | Rendah | Tidak dijepit ke pulau yang terbuka untuk siswa |
| `mute` | ✅ | ✅ | ✅ | ❌ | Rendah | |
| `kick` / `unblock` | ✅ | ✅ | ✅ | ❌ | Sedang | `kick` = `blocked`, sesi tidak dicabut |
| `delete-chat`, `clear-chat` | ✅ | ✅ | ✅ | ❌ | Sedang | Tidak bisa dibatalkan |
| `reset-password` | ✅ | ❌ | ✅ | ❌ | Tinggi | Kata sandi sementara tampil di panel; ikut membuka blokir |
| `set-class-code` | ✅ | ❌ | ✅ | ❌ | Sedang | Menentukan siapa yang bisa mendaftar |
| `reset` (progres siswa) | ✅ | ❌ | ✅ | ❌ | Tinggi | Tidak bisa dibatalkan kecuali dari cadangan |
| `delete` (hapus siswa) | ✅ | ❌ | ✅ | ❌ | Tinggi | Tidak bisa dibatalkan kecuali dari cadangan |
| `team-dissolve` | ✅ | ❌ | ✅ | ❌ | Sedang | Progres anggota tetap |
| `export` | ✅ | ❌ | ✅ | ❌ | Tinggi | Seluruh data kelas keluar server (tanpa `passHash`, `sessions`, `aliasKey`) |
| Mengganti PIN, memulihkan cadangan | ❌ | ❌ | Operator | ❌ | Tinggi | Sekarang hanya lewat variabel lingkungan dan berkas |

### 2.5 Matriks peran lawan sumber daya

C = buat, R = baca, U = ubah, D = hapus. Huruf kecil berarti terbatas (lihat bagian 3).

| Sumber daya | Anonim | Tamu | Siswa (pemilik) | Siswa lain | Anggota regu | Guru | Sistem |
| :-- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Akun: alias, warna | C | – | R | r (alias, warna) | r | R, D | – |
| Akun: `passHash`, `sessions` | C | – | U (masuk/keluar) | – | – | U (`reset-password`) | – |
| Status `muted`, `blocked`, `flags` | – | – | r (`muted`) | – | – | R, U | C (`flags`) |
| Posisi, zona | – | lokal | U (dibatasi) | R | R | R, U (`teleport`) | U (jepit) |
| Progres pribadi: `reason`, refleksi, `sealed` | – | lokal | C, R, U | – | r (`reason` yang tersegel) | R, D (`reset`) | U (batalkan segel tak sah) |
| Jawaban tantangan solo | – | lokal | C (sekali) | – | – | R, D | U (kunci, nilai ulang) |
| Skor, segel, `finishedAt` | – | lokal | R | R | R | R | C, U |
| Data bersama regu (`SHARED_KEYS`) | – | – | – | – | C, R, u | R, D (bubarkan) | U (normalisasi) |
| Jawaban regu (`challenges`) | – | – | – | – | C (lewat voting) | R | U (nilai ulang) |
| Log dan kontribusi regu | – | – | – | – | C, R | R | C |
| Keanggotaan regu, kode | – | – | C, D (diri sendiri) | – | R | D (bubarkan) | – |
| Obrolan | – | – | C, R | R | R | R, D | – |
| Pengaturan kelas (`settings`) | – | – | r (`publicSettings`) | r | r | R, U | – |
| Kode kelas | – | – | – | – | – | R, U | – |
| Ekspor | – | – | – | – | – | C | – |
| Berkas data dan cadangan | – | – | – | – | – | – | C, U (Operator: R, U, D) |

---

## 3. Aturan kepemilikan data

1. **Akun milik siswa, dikelola guru.** Hanya siswa yang tahu kata sandinya. Guru boleh mengatur ulang kata sandi, membisukan, mengeluarkan, dan menghapus, tetapi tidak pernah melihat kata sandi asli. Server tidak menyimpan identitas pribadi (alias saja).
2. **Progres pribadi milik siswa.** `reason` (alasan Paspor), refleksi, dan `sealed` adalah tanggung jawab individu dan tidak pernah ditimpa data regu. Hanya siswa itu yang menulisnya; guru hanya membaca atau mengatur ulang.
3. **Kebenaran dan skor milik sistem.** Nilai `correct`, `points`, `score`, `seals`, `finishedAt`, dan bendera ⚠ selalu dihitung ulang server. Klaim klien diabaikan.
4. **Jawaban yang sudah dikirim terkunci.** Jawaban tantangan dan nomor varian tidak bisa diganti setelah tersimpan (`lockAnswers`). Hanya guru (`reset`) yang bisa membukanya kembali, dengan menghapus seluruh progres.
5. **Bagian bersama milik regu, bukan anggota.** Untuk kunci di `SHARED_KEYS`, data regu menang atas data anggota (`overlayTeam`). Setiap anggota boleh menulis, tetapi tugas tertentu dipegang oleh pemegang peran pos itu.
6. **Tugas peran milik pemegangnya selama dia daring.** Bila pemegang peran luring, anggota lain boleh mengambil alih dan pengambilalihan itu wajib tercatat di log regu.
7. **Jawaban regu milik keputusan bersama.** Jawaban Papan Laporan regu hanya terkunci lewat voting (`team-vote`), tidak pernah lewat `team-op`.
8. **Siswa hanya melihat profil publik siswa lain:** alias, warna, posisi, segel, skor. Alasan Paspor hanya terlihat oleh anggota regu yang sama, dan hanya untuk pos yang sudah disegel.
9. **Data kelas milik sekolah, dipegang guru.** Pengaturan, obrolan, dan ekspor dikendalikan guru. Berkas `classroom.json` dan cadangan hanya ada di disk server dan tidak boleh masuk Git.
10. **Keluar regu tidak membawa pergi data regu.** Data bersama tetap milik regu; bagian pribadi tetap milik siswa. Bila regu kosong, regu dihapus.

---

## 4. Celah izin di kode sekarang

Diurutkan dari dampak terbesar. "Lokasi" menunjuk fungsi di `server.js`.

| # | Celah | Lokasi | Dampak | Tingkat |
| :-: | :-- | :-- | :-- | :-: |
| G1 | **Gerbang peran hanya di klien.** `applyTeamOps` menerima operasi pada jalur mana pun di `OP_KEYS` dari anggota mana pun. Siswa yang memodifikasi klien (atau konsol peramban) bisa mengerjakan tugas peran teman yang sedang daring, termasuk `lab.accuse` (Kepala Lab). | `applyTeamOps` (801), `handleTeamOp` (837) | Pembagian peran PjBL bisa dilewati; log kontribusi tidak mencerminkan kerja nyata | Tinggi |
| G2 | **Segel Pos 6 bisa dipalsukan untuk seluruh regu.** `initial`, `review`, `revision` termasuk `OP_KEYS.project`, dan `validateProgress` hanya memeriksa keberadaan `savedAt`. Satu anggota bisa mengirim `{p:[6,'initial'], set:{savedAt:'…'}}` untuk ketiganya, lalu setiap anggota yang sudah menyegel Pos 1–5 bisa menyegel Pos 6 (+20 poin). | `applyTeamOps`, `validateProgress` (265) | Skor bisa dinaikkan tanpa mengerjakan rancangan menu | Tinggi |
| G3 | **Jawaban solo bisa dibawa masuk ke regu lain.** `mergeIntoTeam` menyalin tantangan yang sudah `complete` dari progres anggota baru ke regu bila regu belum menjawabnya, tanpa voting. Siswa bisa menjawab sendiri, lalu bergabung ke regu dan mengisi jawabannya tanpa persetujuan anggota. Sebaliknya juga: siswa bisa pindah regu untuk "mengambil" jawaban regu yang sudah terkunci ke progres pribadinya. | `mergeIntoTeam` (644), `handleParty` join (777) | Jawaban regu tidak lagi hasil keputusan bersama | Sedang |
| G4 | **Hitungan kontribusi bisa digelembungkan.** Setiap `team-op` dengan `note` menambah kontribusi, dan `set` selalu dihitung berubah walau nilainya sama. `msg.pos` juga bebas diisi. | `handleTeamOp` (837) | Penilaian kerja sama oleh guru bisa menyesatkan | Sedang |
| G5 | **Satu PIN untuk seluruh kuasa guru.** Tidak ada pemisahan aksi biasa dan aksi merusak, tidak ada identitas guru, dan tidak ada `audit_log`. Panel yang tertinggal terbuka (PIN di `sessionStorage`) memberi kuasa penuh, termasuk `delete` dan `export`. | `handleAdminAuth` (944), `handleAdmin` (963), `admin.js` | Siswa di laptop guru bisa menghapus data kelas; tidak ada jejak siapa melakukan apa | Tinggi |
| G6 | **Status admin tidak pernah kedaluwarsa.** Soket admin tetap berkuasa selama tersambung, tanpa batas waktu tanpa aktivitas. Panel yang dibuka pagi hari masih berkuasa penuh sore harinya. | `handleAdminAuth` | Sama dengan G5 | Sedang |
| G7 | **Pembatas PIN bisa dipakai untuk mengunci guru keluar, atau dilewati.** Batas 5 salah/30 detik per IP. Tanpa `TRUST_PROXY` di belakang proxy, semua koneksi berbagi satu IP sehingga siswa bisa membuat guru terkunci terus-menerus. Dengan `TRUST_PROXY=1` tanpa proxy sungguhan, `X-Forwarded-For` bisa dipalsukan sehingga batasnya hilang dan PIN 6 digit bisa ditebak. | `handleAdminAuth`, `clientIp` (1116) | Guru tidak bisa masuk saat kelas, atau PIN ditebak | Sedang |
| G8 | **Satu soket bisa berganti peran.** Pesan `join` dan `admin-auth` diterima kapan saja, sehingga soket admin bisa menjadi pemain dan sebaliknya. Saat ini tidak berbahaya (peran ditimpa, bukan ditambah), tetapi rapuh bila nanti ada pemeriksaan gabungan. | Penangan `message` (1231) | Kebingungan peran di fitur mendatang | Rendah |
| G9 | **`kick` tidak mencabut sesi, dan `/api/me` tidak memeriksa `blocked`.** Token tetap sah; siswa yang dikeluarkan masih dianggap masuk di layar awal sampai `join` ditolak. `reset-password` diam-diam ikut membuka blokir. | `handleAdmin` kick (1013), reset-password (1024), `/api/me` (1142) | Perilaku membingungkan; blokir bisa terbuka tanpa disengaja | Rendah |
| G10 | **`reset` tidak menyentuh data regu.** Setelah guru mengatur ulang progres anggota regu, bagian bersama langsung kembali lewat `overlayTeam` pada `join` berikutnya. | `handleAdmin` reset (1038) | Guru mengira progres kosong padahal skor regu kembali | Rendah |
| G11 | **Ketua regu tanpa kuasa, kode undangan abadi.** Tidak ada cara mengeluarkan anggota atau mengganti kode. Mantan anggota yang keluar bisa bergabung kembali kapan saja selama regu belum penuh. | `handleParty` (765) | Gangguan dari mantan anggota; guru harus membubarkan seluruh regu | Rendah |
| G12 | **`evidence` dan `activity` tidak diperiksa terhadap aksi nyata.** Server menerima nomor bukti dan hasil stasiun apa saja yang bentuknya sah, tanpa memeriksa apakah terminal sudah dipindai. | `applyTeamOps` | Bukti bisa "dibuka" tanpa menjelajah | Rendah (sudah dibatasi karena skor dari jawaban) |
| G13 | **Kunci jawaban dikirim ke klien.** Sudah tercatat sebagai batas yang diketahui di `CLAUDE.md`. Ini bukan masalah RBAC murni, tetapi menurunkan nilai setiap gerbang di atas. | `missions.js` | Jawaban bisa dibaca dari berkas | Diketahui |
| G14 | **`/health` dan `/api/status` terbuka untuk publik.** Membuka jumlah pemain daring dan status penyimpanan. | `handleApi`, server HTTP | Informasi kecil untuk penyerang | Rendah |

Yang sudah benar dan perlu dipertahankan: skor dan kebenaran dihitung ulang server, `challenges` tidak bisa disetel lewat `team-op`, jawaban dan varian terkunci, `spawn` ke teman diperiksa satu regu, `publicSettings` menyembunyikan kode kelas, dan ekspor membuang hash kata sandi serta sesi.

---

## 5. Usulan penerapan di server

### 5.1 Satu titik keputusan: `can(actor, action, resource)`

Ganti pemeriksaan yang tersebar dengan satu tabel kebijakan dan satu fungsi, di dekat bagian "Kirim pesan":

```js
// Aktor: { kind: 'anon' | 'player' | 'admin', playerId?, adminLevel?: 'pengamat' | 'pengajar' | 'pengelola' }
const ADMIN_ACTIONS = {
  pengamat:  ['refresh', 'detail'],
  pengajar:  ['refresh', 'detail', 'set-paused', 'set-chat', 'set-movement', 'set-post', 'set-posts', 'announce',
              'message', 'teleport', 'mute', 'kick', 'unblock', 'delete-chat', 'clear-chat'],
  pengelola: ['*'] // termasuk reset, delete, reset-password, set-class-code, team-dissolve, export
};
const RISKY = new Set(['reset', 'delete', 'reset-password', 'export', 'clear-chat', 'team-dissolve', 'set-class-code']);

function can(actor, action, res = {}) {
  if (actor.kind === 'admin') {
    const list = ADMIN_ACTIONS[actor.adminLevel] || [];
    return list.includes('*') || list.includes(action);
  }
  if (actor.kind !== 'player') return false;
  const p = db.players[actor.playerId];
  if (!p || p.blocked) return false;
  switch (action) {
    case 'team-op': return canTeamOp(p, res.team, res.op);
    case 'team-vote': return Boolean(res.team && res.team.members.includes(p.id));
    case 'spawn-friend': return sameTeam(p, res.friend);
    default: return true; // aksi pemain biasa; batasan jeda/bisu tetap di penangan
  }
}
```

Penangan WS memanggil `can()` sebelum bekerja, dan penolakan dikirim sebagai `{ type: 'denied', action }` yang ditampilkan klien. Tamu luring tidak perlu aturan server karena tidak pernah tersambung.

### 5.2 Gerbang peran di server (menutup G1, G2, G4)

`missions.js` sudah dimuat lewat `vm`, jadi `NUTRANTARA_TEAM.tasks` bisa dibaca server tanpa duplikasi. Langkahnya:

1. **Pindahkan rumus pemegang peran ke kode bersama.** Taruh `holderIndex(pos, role, n) = (role + pos − 1) % n` dan `roleOf(pos, kind, key, index)` di akhir `missions.js` (di bawah `window.NUTRANTARA_TEAM`) agar `team.js` dan `server.js` memakai fungsi yang sama.
2. **Petakan jalur operasi ke tugas.** Buat `TASK_OF_PATH` di server yang menerjemahkan `op.p` ke `(kind, key, index)`, misalnya `[2,'activity','lab','biuret'] → ('lab','biuret')`, `[6,'initial'] → ('kitchen','initial')`, `[3,'activity','sort',k] → ('card', null, k)`. Jalur yang tidak terpetakan (mis. `started`) tetap bebas untuk semua anggota.
3. **`canTeamOp`:** hitung pemegang peran dari urutan `team.members`. Izinkan bila pemegangnya si pengirim, atau bila pemegangnya luring (`!onlineIds().has(holderId)`). Dalam kasus kedua, server sendiri yang menulis log "mengambil alih tugas …", bukan klien.
4. **Pos 6 (`initial`, `review`, `revision`):** server menyetel `savedAt` dan `by` sendiri saat operasi diterima, dan menolak `savedAt` dari klien. Syarat segel di `validateProgress` ditambah: isi rancangan tidak kosong dan `by` adalah anggota regu.
5. **Kontribusi dihitung server:** tambah kontribusi hanya bila nilai benar-benar berubah (`!same(old, value)`), dan `pos` diambil dari `op.p[0]`, bukan dari `msg.pos`. Batasi satu tambahan per tugas per anggota.

### 5.3 Peran guru dan aksi berisiko (menutup G5, G6, G7)

1. **Dua tingkat PIN.** `NUTRANTARA_ADMIN_PIN` tetap menjadi PIN pengelola. Tambahkan `NUTRANTARA_TEACHER_PIN` (opsional) untuk guru pengajar dan `NUTRANTARA_OBSERVER_PIN` untuk pengamat. Bila hanya satu PIN diatur, perilaku sama dengan sekarang. Simpan `conn.adminLevel` saat `admin-auth`.
2. **Konfirmasi ulang untuk aksi `RISKY`.** Pesan `admin` dengan aksi berisiko wajib membawa `pin` lagi (atau token konfirmasi sekali pakai berumur 60 detik). Panel guru menampilkan dialog "Ketik PIN untuk menghapus <alias>".
3. **Batas waktu admin.** Soket admin turun ke pengamat setelah 30 menit tanpa perintah, dan harus memasukkan PIN lagi. PIN di `sessionStorage` dihapus saat tab ditutup (sudah) dan saat batas waktu tercapai.
4. **Audit log.** Setiap aksi guru dicatat `{ at, level, action, targetId, targetAlias, detail }` di `db.audit` (maks. 500 baris), sesuai tabel `audit_log` di `ARSITEKTUR_DATABASE.md`. Tanpa PIN, kata sandi, atau IP. Tampilkan 20 terakhir di panel.
5. **Pembatas PIN.** Tambahkan batas global (mis. 20 salah per 5 menit untuk seluruh server) di samping batas per IP, dan cetak peringatan di konsol. Dokumentasikan di `DEPLOY.md` bahwa `TRUST_PROXY=1` hanya boleh di belakang proxy yang menimpa `X-Forwarded-For` (Render memenuhinya).

### 5.4 Perbaikan kecil (G3, G8–G11)

| Celah | Perbaikan |
| :-- | :-- |
| G3 | Saat `join` regu, jangan salin `challenges` yang sudah selesai ke regu. Jadikan usulan voting (`t.votes`) atas nama anggota baru, sehingga tetap butuh suara kedua. Saat keluar regu, catat di log pos mana yang jawabannya berasal dari regu |
| G8 | Tolak `join` bila `conn.role === 'admin'` dan `admin-auth` bila `conn.role === 'player'`; satu soket satu peran |
| G9 | `kick` mengosongkan `sessions`. `/api/me` mengembalikan 403 bila `blocked`. `reset-password` tidak lagi mengubah `blocked`, panel menawarkan "buka blokir" terpisah |
| G10 | `reset` menawarkan dua pilihan: "progres pribadi saja" (sekarang) atau "keluarkan dari regu juga", dan pesan konfirmasi menjelaskan bahwa bagian regu tetap ada |
| G11 | Ketua regu boleh `party kick` (anggota luring atau daring) dan `party rotate-code`. Setiap aksi tercatat di log regu dan terlihat guru |

### 5.5 Urutan kerja yang disarankan

1. `can()` dan tabel kebijakan, tanpa mengubah perilaku (semua aksi guru = pengelola). Tambah uji di `test/smoke.js` bahwa pemain tidak bisa mengirim `admin` dan pengamat tidak bisa `delete`.
2. G2 dan G1 (gerbang peran di server), karena langsung memengaruhi skor. Uji: anggota B tidak bisa menulis `lab.biuret` milik A yang daring, tetapi bisa bila A luring, dan log mencatat ambil alih; `savedAt` dari klien diabaikan.
3. Audit log dan konfirmasi ulang aksi berisiko.
4. Tingkat PIN guru dan batas waktu admin.
5. Perbaikan kecil di 5.4.

Setiap langkah bisa dirilis sendiri dan tidak mengubah format `classroom.json` kecuali penambahan `db.audit`, sehingga tidak perlu menaikkan `SCHEMA_VERSION` klien.
