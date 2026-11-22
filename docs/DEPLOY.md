# Panduan deploy NUTRANTARA

NUTRANTARA dapat dijalankan dengan tiga cara. Pilih sesuai kebutuhan kelas.

| Cara | Multipemain & panel guru | Cocok untuk |
| :-- | :-- | :-- |
| A. Laptop guru di jaringan sekolah | Ya | Satu kelas dalam satu ruangan, tanpa internet |
| B. Server/cloud (Docker) | Ya | Beberapa kelas, akses lewat internet dengan HTTPS |
| C. Hosting statis (GitHub Pages, Netlify, Sites) | Tidak, hanya satu pemain | Latihan mandiri di rumah |

## A. Laptop guru (LAN)

Kebutuhan: Node.js 18+.

```bash
npm install
# PowerShell: $env:NUTRANTARA_ADMIN_PIN="PIN-RAHASIA"; npm start
npm start
```

- Siswa membuka alamat `http://<IP-laptop>:3000/play` yang tampil di jendela server, dari Wi-Fi yang sama.
- Jika siswa tidak bisa tersambung, izinkan Node.js di Windows Firewall (jaringan *Private*).
- Data kelas tersimpan di `data/classroom.json`. Cadangkan atau hapus berkas ini sesuai protokol sekolah.

## B. Server dengan Docker

```bash
docker build -t nutrantara .
docker run -d --name nutrantara -p 3000:3000 \
  -e NUTRANTARA_ADMIN_PIN="ganti-dengan-pin-kuat" \
  -e TRUST_PROXY=1 \
  -v nutrantara-data:/data \
  nutrantara
```

- `NODE_ENV=production` sudah diatur di image. Server **menolak berjalan** tanpa `NUTRANTARA_ADMIN_PIN` (6–64 karakter), dan PIN tidak ditulis ke log.
- Pasang di belakang reverse proxy berkemampuan HTTPS (Caddy, Nginx, atau bawaan platform). WebSocket `/ws` otomatis memakai `wss://` saat halaman dibuka lewat HTTPS. Aktifkan `TRUST_PROXY=1` hanya bila memang berada di belakang proxy.
- Data tersimpan di volume `/data`. Tanpa volume persisten, data hilang setiap kali kontainer diganti.
- Cek kesehatan layanan di `GET /health`.

**Render.com:** berkas `render.yaml` sudah tersedia dan saat ini memakai paket **Free** untuk demo. Paket ini tidak punya disk, jadi data siswa hilang setiap kali server restart atau deploy, dan server tertidur setelah sekitar 15 menit sepi. Sebelum dipakai kelas, ganti ke `plan: starter` dan aktifkan blok `disk:` (1 GB di `/data`) di `render.yaml`.

Langkah deploy:
1. Masuk ke [dashboard.render.com](https://dashboard.render.com) dengan akun GitHub.
2. Pilih **New → Blueprint**, lalu pilih repo ini. Render membaca `render.yaml`.
3. Saat diminta, isi `NUTRANTARA_ADMIN_PIN` dengan PIN rahasia (6–64 karakter).
4. Tunggu build selesai. Alamat game: `https://<nama-layanan>.onrender.com/play`, panel guru: `/admin`.
5. Setiap push ke `main` akan men-deploy ulang secara otomatis.

**Railway / Fly.io / VPS:** gunakan Dockerfile yang sama, lalu pasang volume ke `/data`.

### Sebelum dibuka ke internet

- Atur **kode kelas** di panel guru agar hanya siswa kelas itu yang bisa mendaftar akun.
- Wajib HTTPS: kata sandi siswa dikirim saat masuk. Tanpa HTTPS, kata sandi bisa disadap di jaringan.
- Gunakan PIN yang panjang dan unik, dan ganti PIN setiap semester.
- Server menyimpan alias siswa, jawaban, dan obrolan. Pastikan lokasi server dan masa simpan data disetujui sekolah.
- Kunci jawaban masih dikirim ke browser, dan skor divalidasi ulang di server, tetapi siswa yang paham teknis tetap bisa mengakali jumlah percobaan. Untuk penilaian berisiko tinggi, pindahkan pemeriksaan jawaban ke server terlebih dahulu.
- Satu proses server melayani hingga `NUTRANTARA_MAX_PLAYERS` (bawaan 60) alias per kelas. Untuk beberapa kelas sekaligus, jalankan satu instance per kelas.

## C. Hosting statis (satu pemain)

Unggah semua berkas kecuali `server.js`, `node_modules/`, `data/`, dan `test/`. Bisa juga dengan mengaktifkan GitHub Pages dari branch `main`. Landing page ada di `index.html`, game di `play.html`. Tanpa server kelas, game otomatis berjalan dalam mode satu pemain, dan progres hanya tersimpan di browser.

## Daftar periksa rilis

- [ ] `npm test` lulus (CI GitHub juga menjalankannya)
- [ ] Coba di laptop sekolah: 3D Tinggi, 3D Ringan, dan 2D
- [ ] Coba dengan 2 siswa + 1 guru: bergabung, gerak, obrolan, jeda, buka/tutup pos, ekspor
- [ ] PIN admin diatur lewat variabel lingkungan
- [ ] Cadangan `data/` dijadwalkan
