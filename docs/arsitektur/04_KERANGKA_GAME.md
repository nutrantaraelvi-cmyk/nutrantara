# 4. Kerangka Game

*NUTRANTARA 1.7 · 28 November 2026 · Bagaimana sistem-sistem permainan disusun dan saling memberi makan*

## 4.1 Peta sistem

```
                         ┌──────────── Ekspedisi (inti belajar) ────────────┐
                         │ 6 pos × tantangan (single/multi/order/sort)       │
                         │ + aktivitas pos (lab, pilah, vili, …) + segel     │──► Skor 420 · Rapor A–D
                         └───────┬──────────────────────────┬───────────────┘
                                 │ dikerjakan bersama        │
                     ┌───────────▼──────────┐   ┌───────────▼───────────┐
                     │ Regu PjBL (1–4)      │   │ Proyek PjBL POS 1–6    │──► Skor PjBL 500
                     │ peran bergilir, vote │   │ MCQ 10/5/0, menu, rubrik│
                     └───────────┬──────────┘   └───────────┬───────────┘
                                 │                          │
   Jelajah (shard, pulau liar) ──┼──► RPG: XP · level 1–30 · gelar · 25+ lencana ◄── Bos Mitos Gizi (kelas)
   Kampung (NPC, quest, masak) ──┘                     ▲
   Butik (item dimiliki) ──────────────────────────────┘
          ▲
          └── saldo = skor − spent  (skor tidak pernah berkurang)
```

## 4.2 Sistem dan berkasnya

| Sistem | Data & aturan (A) | Klien | Server | Disimpan |
| :-- | :-- | :-- | :-- | :-- |
| Ekspedisi | `missions.js` | `game.js`, `quest.js`, modul pos | `validateProgress`, `challengesFor` | progres |
| Regu | `NUTRANTARA_TEAM` di `missions.js` | `team.js`, `app.js` | `party`, `team-op`, `team-vote`, `overlayTeam` | `db.teams` |
| PjBL | `pjbl-data.js`, `pjbl-core.js` | `pjbl.js` | `pjbl` | `player.pjbl`, `team.pjbl` |
| Butik | `shop-data.js` | `shop.js`, `fashion.js` | `shop` | `player.wardrobe` |
| RPG | `rpg-data.js` | `rpg.js` | `refreshRpg` | **tidak**, dihitung |
| Bos Mitos Gizi | `boss-data.js` (server saja) | `rpg.js`, `boss3d.js` | `boss` | memori; statistik di `player.rpg` |
| Kampung | `kampung-data.js`, `kampung-core.js` | `kampung.js`, `kampung3d.js` | `kampung` | `player.kampung` |
| Jelajah | `world-data.js`, `LANDMARKS` | `world3d.js`, `region.js` | `explore` | `player.explore` |
| Musik | `music-data.js` | `music.js` | `set-music` | preferensi lokal |
| Rekap | `rekap-core.js` (server saja) | `admin-rekap.js` | `rekap` | dibangun saat diminta |

## 4.3 Pola sistem yang sama untuk semua fitur sejak 1.2

```
 klien ── { type: '<fitur>', action, … } ──► server: core.apply(state, msg, ctx) ──► simpan
       ◄── { type: '<fitur>', state, result } ──┘          │
                                                          └─► refreshRpg(p) bila memengaruhi XP
 luring: klien menjalankan core.apply yang sama ke localStorage
```

Karena `*-core.js` yang sama dipakai di dua sisi, aturan luring dan daring tidak bisa menyimpang.

## 4.4 Ekonomi dan hadiah

| Mata uang | Sumber | Dipakai untuk | Bisa berkurang? |
| :-- | :-- | :-- | :-- |
| Skor ekspedisi (0–420) | 30/jawaban benar, 20/segel | Rapor, papan peringkat, saldo Butik | Tidak |
| Saldo Butik | skor − `spent` | 20 item busana daerah (40–160 poin) | Ya, hanya `spent` yang naik |
| Skor PjBL (0–500) | 10/5/0 per soal, menu, rubrik | Nilai proyek | Tidak |
| XP | Dihitung ulang dari semua fakta (`RPG.factsFrom`) | Level, gelar, lencana | Tidak (turunan) |
| Bahan & masakan Kampung | Kumpul (jeda 1,5 s, tumbuh lagi 3 menit), masak | Quest, buff jalan ×1,15 selama 60 s | Ya, dipakai |

Prinsip: **nilai belajar tidak pernah dipakai sebagai alat bayar yang menghilang**. Hadiah kosmetik dan sosial, bukan keuntungan menjawab.

## 4.5 Kendali guru atas sistem

`set-posts` (pos terbuka), `set-paused`, `set-movement`, `set-shop`, `set-rpg`, `set-music`, `boss-start`/`boss-stop`, `pjbl-rubric`, `reset`. Setiap sistem baru harus punya sakelar guru bila ia bisa mengalihkan perhatian dari pelajaran.

## 4.6 Cara menambah sistem baru

1. Data + aturan di `<fitur>-data.js` / `<fitur>-core.js` (murni, id stabil).
2. Daftarkan di `loadBrowserScript` server, di `STATIC`, dan di smoke test.
3. `player.<fitur>` dinormalisasi, pesan aksi + pesan state, dikirim setelah `welcome` dan reset.
4. Bila memberi XP, tambahkan fakta di `RPG.factsFrom`.
5. Sakelar guru bila perlu, teks Indonesia, asersi di `test/smoke.js`.
