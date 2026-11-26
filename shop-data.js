/*
 * Katalog Butik Nusantara (sejak 1.2), dipakai bersama oleh peramban dan server.
 * Siswa menukar poin hasil belajar dengan busana khas daerah untuk penjelajahnya. Belanja tidak mengurangi skor:
 * saldo toko = poin yang diperoleh − poin yang sudah dibelanjakan. Server memakai katalog ini untuk memeriksa harga.
 * Berkas ini harus tetap skrip biasa yang hanya mengisi window.* (dimuat server lewat vm, tanpa DOM).
 * Mengganti id barang membuat barang milik siswa yang lama hilang; menambah barang baru aman.
 */
(function (root) {
  const slots = [
    { id: 'kepala', name: 'Topi & ikat kepala' },
    { id: 'baju', name: 'Rompi bermotif' },
    { id: 'leher', name: 'Hiasan leher' },
    { id: 'punggung', name: 'Tas punggung' }
  ];

  // price 0 + bawaan = dipakai sejak awal, tidak perlu dibeli.
  const items = [
    { id: 'caping', slot: 'kepala', name: 'Caping Bambu', origin: 'Jawa & Sunda', price: 0, bawaan: true, desc: 'Topi kerucut anyaman bambu para petani, teduh di bawah matahari.' },
    { id: 'peci', slot: 'kepala', name: 'Peci Hitam', origin: 'Nusantara', price: 40, desc: 'Kopiah beludru hitam yang rapi untuk acara resmi.' },
    { id: 'blangkon', slot: 'kepala', name: 'Blangkon Batik', origin: 'Yogyakarta & Surakarta', price: 60, desc: 'Ikat kepala batik siap pakai dengan mondolan di belakang.' },
    { id: 'udeng', slot: 'kepala', name: 'Udeng Bali', origin: 'Bali', price: 60, desc: 'Ikat kepala dengan simpul tegak di depan.' },
    { id: 'kamboja', slot: 'kepala', name: 'Mahkota Bunga Kamboja', origin: 'Bali', price: 80, desc: 'Rangkaian bunga kamboja putih kuning yang harum.' },
    { id: 'tanjak', slot: 'kepala', name: 'Tanjak Songket', origin: 'Riau & Melayu', price: 90, desc: 'Ikat kepala lipat dari kain songket, ujungnya runcing ke atas.' },
    { id: 'siger', slot: 'kepala', name: 'Siger Emas', origin: 'Lampung', price: 150, desc: 'Mahkota emas berlekuk yang dipakai pada upacara adat.' },

    { id: 'rompi', slot: 'baju', name: 'Rompi Penjelajah', origin: 'NUTRANTARA', price: 0, bawaan: true, desc: 'Rompi lapangan berwarna khas pemain.' },
    { id: 'lurik', slot: 'baju', name: 'Rompi Lurik', origin: 'Yogyakarta', price: 50, desc: 'Tenun bergaris halus yang sederhana dan sejuk.' },
    { id: 'kawung', slot: 'baju', name: 'Batik Kawung', origin: 'Jawa Tengah', price: 70, desc: 'Motif empat bulatan seperti irisan buah aren.' },
    { id: 'parang', slot: 'baju', name: 'Batik Parang', origin: 'Jawa', price: 80, desc: 'Motif lereng miring bergelombang yang tak terputus.' },
    { id: 'megamendung', slot: 'baju', name: 'Batik Mega Mendung', origin: 'Cirebon', price: 90, desc: 'Motif awan biru berlapis yang menenangkan.' },
    { id: 'tenun-ikat', slot: 'baju', name: 'Tenun Ikat Sumba', origin: 'Nusa Tenggara Timur', price: 110, desc: 'Tenun ikat merah tanah dengan motif belah ketupat.' },
    { id: 'songket', slot: 'baju', name: 'Songket Emas', origin: 'Palembang & Minangkabau', price: 160, desc: 'Kain merah bertabur benang emas.' },

    { id: 'syal-tumpal', slot: 'leher', name: 'Syal Tumpal', origin: 'NUTRANTARA', price: 0, bawaan: true, desc: 'Syal bermotif segitiga tumpal berwarna khas pemain.' },
    { id: 'selendang', slot: 'leher', name: 'Selendang Jumputan', origin: 'Palembang', price: 40, desc: 'Selendang ikat celup berwarna pelangi.' },
    { id: 'melati', slot: 'leher', name: 'Untaian Melati', origin: 'Jawa', price: 60, desc: 'Kalung bunga melati putih yang menjuntai.' },
    { id: 'manik', slot: 'leher', name: 'Kalung Manik Dayak', origin: 'Kalimantan', price: 70, desc: 'Manik-manik warna-warni dengan liontin di tengah.' },
    { id: 'ulos', slot: 'leher', name: 'Selempang Ulos', origin: 'Sumatra Utara', price: 90, desc: 'Kain ulos Batak yang disampirkan di bahu.' },

    { id: 'rantang', slot: 'punggung', name: 'Ransel Rantang', origin: 'NUTRANTARA', price: 0, bawaan: true, desc: 'Rantang tiga susun untuk bekal sehat.' },
    { id: 'bakul', slot: 'punggung', name: 'Bakul Rotan', origin: 'Kalimantan', price: 50, desc: 'Keranjang punggung anyaman rotan.' },
    { id: 'noken', slot: 'punggung', name: 'Noken', origin: 'Papua', price: 60, desc: 'Tas rajut serat kayu yang serbaguna.' },
    { id: 'payung', slot: 'punggung', name: 'Payung Geulis', origin: 'Tasikmalaya', price: 120, desc: 'Payung kertas berlukis bunga yang ikut meneduhkan.' },
    { id: 'layangan', slot: 'punggung', name: 'Sayap Layang-layang', origin: 'Nusantara', price: 140, desc: 'Dua layang-layang berekor yang terbentang seperti sayap.' }
  ];

  const defaults = {};
  items.forEach((it) => { if (it.bawaan) defaults[it.slot] = it.id; });
  const byId = (id) => items.find((it) => it.id === id) || null;

  root.NUTRANTARA_SHOP = { slots, items, defaults, byId };
})(typeof window !== 'undefined' ? window : globalThis);
