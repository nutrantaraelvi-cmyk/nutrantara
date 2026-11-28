# 5. Arsitektur Game

*NUTRANTARA 1.7 · 28 November 2026 · Apa yang dimainkan siswa, dan aturan yang membuatnya adil*

## 5.1 Premis

Siswa kelas XI adalah penjelajah di Kepulauan NUTRANTARA, enam wilayah pos melayang yang masing-masing menyimpan satu kasus sistem pencernaan. Ditemani Nara (pemandu), regu proyek mengumpulkan bukti, menjawab tantangan, menulis alasan, lalu menyegel pos. Di sela misi mereka menjelajah pulau liar, membantu warga kampung, memasak hidangan daerah, berbusana daerah di Butik, dan bersama sekelas melawan Raksasa Hoaks Gizi.

Semua angka di Pos 1–5 adalah data simulasi, bukan saran gizi.

## 5.2 Siklus main

```
 Siklus mikro (1–3 menit):  jalan ke objek misi ─► E/aksi ─► panel ─► jawab sekali ─► lihat kunci + penjelasan
 Siklus pos (10–20 menit):  terminal bukti ─► aktivitas pos ─► papan laporan (vote regu) ─► alasan ≥ MIN_REASON ─► altar segel (+20)
 Siklus sesi (1 JP):        lobi ─► pilih pulau ─► terjun ─► 1–2 pos ─► rapor sementara
 Siklus proyek (beberapa pertemuan): POS 1–6 PjBL, peran bergilir, presentasi, refleksi ─► rapor akhir
 Siklus samping:            jelajah shard/pulau liar · quest Kampung · masak · Butik · event Bos (dipicu guru)
```

## 5.3 Enam pos

| Pos | Biome | Inti | Aktivitas khusus |
| --: | :-- | :-- | :-- |
| 1 | Hutan | Detektif: memilah bukti kasus menu (100 varian) | `archive.js` Arsip Menu |
| 2 | Lembah | Laboratorium: enzim & uji makanan (4 varian enzim rusak) | `lab.js` Meja Uji Reagen (Lugol, Benedict, Biuret, Sudan III, mikroskop, tuduhan berbukti) |
| 3 | Gunung | Gerbang: pencernaan vs penyerapan | `absorb.js` Gerbang Pilah + Simulator Vili 3D |
| 4 | Rawa | Jejak: sebab-akibat sulit BAB (serat, air, aktivitas) | `causal.js` Papan Benang Merah, Simulator Usus Besar 3D, Menara Siaran |
| 5 | Gumuk | Pemecah: menguji klaim gizi menu | `claims.js` |
| 6 | Kaldera | Pemulihan: proyek menu Dapur Juara (rancang, tinjau, revisi) | `game.js` Dapur Juara |

## 5.4 Aturan nilai (sejak 0.7)

- Setiap tantangan dijawab **sekali**: benar 30, salah 0 tetapi tetap selesai, lalu siswa melihat jawaban benar dan penjelasan. Tidak ada hukuman tambahan dan tidak ada coba-ulang.
- Segel +20 bila semua tantangan pos terjawab dan alasan cukup panjang. Maksimum 420.
- Rapor (`evaluatePost`, `evaluateAll`): A ≥ 90%, B ≥ 75%, C ≥ 60%, selain itu D. Rapor sementara hanya menilai pos yang sudah dimulai.
- Server menghitung ulang `correct` dari kunci (`isCorrect`) dan menandai keadaan tidak sah (⚠ di panel guru).
- Regu: skor siswa = poin tantangan regu + segel pribadinya. Jawaban regu terkunci bila 2 anggota mengusulkan jawaban yang sama, atau 1 bila tidak ada anggota lain yang aktif 24 jam terakhir.

## 5.5 Peran regu

Empat peran per pos dari `NUTRANTARA_TEAM`; peran r di pos p dipegang anggota `(r + p − 1) mod n`, jadi semua orang pernah memegang setiap peran. Tugas milik teman yang sedang daring ditolak; tugas milik teman yang luring boleh diambil alih dan dicatat. Solo dan tamu memegang semua peran.

## 5.6 Lapisan motivasi

| Lapisan | Dorongan | Rem desain |
| :-- | :-- | :-- |
| RPG (XP, 30 level, gelar, lencana) | Kemajuan terlihat | Dihitung dari bukti belajar; guru bisa menyembunyikan (`rpgVisible`) |
| Butik | Ekspresi diri, budaya daerah | Skor tidak berkurang; guru bisa menutup toko |
| Kampung | Dunia hidup, resep daerah, quiz ringan | Cap per item/hidangan, jeda kumpul |
| Bos Mitos Gizi | Kerja sama sekelas, literasi hoaks | Dipicu guru 2–20 menit; jawaban < 1,2 s ditolak; salah hanya menyembuhkan bos 3 HP |
| Jelajah | Rasa ingin tahu | Tanpa misi, tidak memengaruhi nilai |

## 5.7 Nada

"Tidak apa-apa salah": umpan balik menjelaskan, tidak mempermalukan. Peringkat menyorot pencapaian, bukan hukuman. Gameplay tidak boleh lebih menarik daripada berpikir: setiap panel misi meminta alasan, bukan refleks.
