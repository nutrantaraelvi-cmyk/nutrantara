# 11. Arsitektur RBAC

*NUTRANTARA 1.7 · 28 November 2026*

## 11.1 Peran

| Peran | Didapat dengan | Penanda di kode |
| :-- | :-- | :-- |
| Anonim | Buka halaman / WS tanpa sesi | `conn.role === null` |
| Tamu luring | Mode tamu tanpa server | `user.offline`, `nutrantara-guest-v1` |
| Siswa | `/api/register`/`login` + WS `join` dengan token | `conn.role === 'player'` |
| Anggota regu | `p.team` menunjuk regu | `teamOf(p)`, `sameTeam(a, b)` |
| Pembuat regu 👑 | Membuat regu (atau anggota tersisa pertama) | `team.leaderId`, tanpa hak tambahan |
| Pemegang peran pos | Otomatis bergilir `(r + p − 1) mod n` | `NutraTeam.holder()` (klien) |
| Guru | WS `admin-auth` + `NUTRANTARA_ADMIN_PIN` | `conn.role === 'admin'` |
| Operator | Akses Render / laptop guru | Di luar aplikasi |
| Sistem | Proses server | `validateProgress`, `overlayTeam`, `refreshRpg`, aturan `*-core.js` |

## 11.2 Matriks ringkas

✅ boleh · ❌ tidak · 🔸 bersyarat

| Aksi | Anonim | Siswa | Anggota regu | Guru | Sistem |
| :-- | :-: | :-: | :-: | :-: | :-: |
| Daftar / masuk | ✅ (rate limit) | — | — | — | — |
| Gerak, emote, obrolan | ❌ | 🔸 jeda/bisu/kunci gerak | 🔸 | — | — |
| Kirim progres sendiri | ❌ | ✅ dinilai ulang | ✅ | ❌ | ✅ menghitung skor |
| Ubah data bersama regu | ❌ | ❌ | 🔸 `team-op` terbatas, tidak bisa `challenges` | ❌ | ✅ |
| Kunci jawaban regu | ❌ | — | 🔸 2 suara sama (1 bila sendirian 24 jam) | ❌ | ✅ |
| Tugas peran pos | ❌ | ✅ solo | 🔸 bila pemegangnya luring (dicatat) | — | — |
| Beli/pakai Butik | ❌ | 🔸 `shopOpen`, saldo cukup | 🔸 | ❌ | ✅ validasi |
| Aksi PjBL / Kampung | ❌ | 🔸 aturan core | 🔸 kunci regu ditolak bila teman daring belum memilih | `pjbl-rubric` | ✅ |
| Jawab Bos | ❌ | 🔸 event aktif, jeda 1,2 s | 🔸 | `boss-start/stop` | ✅ |
| Lihat obrolan | ❌ | ✅ publik | ✅ | ✅ semua | — |
| Pengaturan kelas (`set-*`, `announce`) | ❌ | ❌ | ❌ | ✅ | — |
| Moderasi (`mute`, `kick`, `unblock`, `delete-chat`, `clear-chat`) | ❌ | ❌ | ❌ | ✅ | — |
| Akun (`reset-password`, `delete`, `reset`) | ❌ | ❌ | ❌ | ✅ | — |
| `teleport`, `team-dissolve`, `set-class-code` | ❌ | ❌ | ❌ | ✅ | — |
| `detail`, `rekap`, `export` (data siswa) | ❌ | ❌ | ❌ | ✅ | — |
| Baca `boss-data.js`, `rekap-core.js` | ❌ | ❌ | ❌ | ❌ (server saja) | ✅ |

## 11.3 Di mana ditegakkan

```
 HTTP: STATIC (daftar putih) → CSP → /api/* rate limit per IP → scrypt
 WS:   routeMessage → cek conn.role → rate limit per koneksi → handler
         player: settings (paused/movementLocked/muted/blocked) → kepemilikan (p.id, teamOf) → core.apply
         admin:  hanya setelah admin-auth (5 salah / 30 s per IP)
 Data: validateProgress · overlayTeam · TEAM_LIMIT · MAX_PROGRESS · normalisasi wardrobe/pjbl/kampung
```

Aturan emas: **klien hanya boleh menyembunyikan, server yang melarang.** Gerbang peran pos di `team.js` adalah satu-satunya pembatasan yang hanya ada di klien; dampaknya kecil karena jawaban tetap butuh voting regu di server.

## 11.4 Kepemilikan data

| Data | Pemilik | Bisa dibaca |
| :-- | :-- | :-- |
| Alasan, refleksi, segel | Siswa | Siswa, guru |
| Bukti, aktivitas, tantangan per pos | Regu | Anggota, guru |
| Wardrobe, Kampung, PjBL pribadi | Siswa | Siswa, guru (detail/rekap) |
| Obrolan | Kelas | Semua, guru (lengkap, termasuk yang dihapus dari tampilan) |
| Pasangan alias ↔ nama asli | Guru, di luar server | Tidak pernah di server |

## 11.5 Celah dan usulan

1. **Satu PIN untuk semua aksi guru.** Usulan: konfirmasi ulang PIN untuk aksi merusak/membuka data (`delete`, `reset`, `reset-password`, `export`, `rekap`).
2. **Peran guru pengajar vs pengelola vs pengamat** hanya perlu bila lebih dari satu orang dewasa memegang panel.
3. **Log audit aksi guru** (siapa, kapan, apa) di `db`, tampil di panel.
4. Pertahankan: id pemain acak, sesi di-hash SHA-256, maks 5 sesi per akun, PIN wajib di produksi.

Matriks lengkap per pesan: [kajian/RBAC_MATRIKS.md](kajian/RBAC_MATRIKS.md).
