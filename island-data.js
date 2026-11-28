/* NUTRANTARA — Atlas enam dunia pulau (metadata visual saja).
 * Skrip klasik: hanya mengisi window.NUTRANTARA_ISLANDS, tanpa DOM, tanpa import/export.
 * Data ini TIDAK disimpan di progres/Paspor; mengubahnya aman untuk save lama.
 *
 * Aturan akurasi:
 * - status satwa: 'endemik' hanya bila sebarannya alami terbatas pada pulau/kawasan yang disebut;
 *   'subspesies lokal' untuk subspesies khas pulau; selain itu 'satwa khas wilayah' / 'tersebar di kawasan'.
 * - arsitektur selalu menyebut wilayah inspirasi; bangunan quest adalah bangunan edukasi FIKTIF,
 *   bukan replika rumah adat atau tempat ibadah tertentu, dan tidak memakai simbol ritual.
 * - layout x/y memakai ruang gambar 1000 × 420 (tanah ±345).
 */
(function () {
  const islands = {
    1: {
      key: 'sumatra', name: 'Sumatra', region: 'Pulau Sumatra',
      palette: { sky1: '#bfe6dc', sky2: '#eef7ef', far: '#7fae9c', mid: '#3e8a5f', ground: '#5b8a3a', accent: '#e8a23a', water: '#5fb3c4', ink: '#123a2c' },
      terrain: { type: 'hutan-hujan', label: 'Hutan hujan, pegunungan berkabut, sungai lebar dan lahan basah', river: true, mist: true },
      natureObjects: [
        { id: 'kanopi', type: 'tree', x: 70, s: 1.25, name: 'Pohon berkanopi lebar', note: 'Lapisan kanopi menaungi lantai hutan yang lembap.' },
        { id: 'air-terjun', type: 'waterfall', x: 880, s: 1, name: 'Air terjun', note: 'Air dari pegunungan mengisi sungai di kaki bukit.' },
        { id: 'rafflesia', type: 'rafflesia', x: 180, s: 1, name: 'Bunga raksasa bergaya Rafflesia', note: 'Flora ikonik Sumatra; hidup menumpang pada akar tumbuhan merambat Tetrastigma.' },
        { id: 'paku', type: 'fern', x: 250, s: 1, name: 'Paku-pakuan', note: 'Tumbuh rapat di tanah lembap dekat sungai.' },
        { id: 'bambu', type: 'bamboo', x: 940, s: 1, name: 'Rumpun bambu', note: 'Bambu tumbuh cepat di tepi sungai dan lereng.' },
        { id: 'rotan', type: 'vine', x: 120, s: 1, name: 'Rotan dan sulur', note: 'Rotan memanjat batang pohon menuju cahaya.' },
        { id: 'batu', type: 'rock', x: 760, s: 1, name: 'Batu vulkanik', note: 'Sisa aktivitas gunung api di Bukit Barisan.' },
        { id: 'rempah', type: 'crops', x: 300, s: 1, name: 'Kebun rempah & pangan', note: 'Kebun kecil di samping pasar pangan (ilustrasi).' },
        { id: 'jembatan', type: 'bridge', x: 690, s: 1, name: 'Jembatan kayu', note: 'Menyeberangi sungai menuju dek balai.' }
      ],
      fauna: [
        { id: 'orangutan-sumatra', shape: 'kera', x: 95, y: 205, name: 'Orangutan Sumatra', latin: 'Pongo abelii', status: 'endemik', statusText: 'Endemik Sumatra', habitat: 'Kanopi hutan hujan dataran rendah Sumatra bagian utara', note: 'Hampir seluruh hidupnya di pohon; berperan menyebarkan biji buah hutan.' },
        { id: 'harimau-sumatra', shape: 'kucing-besar', x: 820, y: 330, name: 'Harimau Sumatra', latin: 'Panthera tigris sumatrae', status: 'subspesies', statusText: 'Subspesies lokal Sumatra', habitat: 'Hutan dataran rendah hingga pegunungan', note: 'Satu-satunya harimau yang masih hidup di Indonesia; dilindungi.' },
        { id: 'gajah-sumatra', shape: 'gajah', x: 230, y: 330, name: 'Gajah Sumatra', latin: 'Elephas maximus sumatranus', status: 'subspesies', statusText: 'Subspesies lokal Sumatra', habitat: 'Hutan dataran rendah dan tepi sungai', note: 'Hidup berkelompok dan membuka jalur di hutan.' },
        { id: 'kelinci-sumatra', shape: 'kelinci', x: 580, y: 340, name: 'Kelinci Sumatra', latin: 'Nesolagus netscheri', status: 'endemik', statusText: 'Endemik Sumatra', habitat: 'Hutan pegunungan Bukit Barisan', note: 'Kelinci bergaris yang sangat jarang terlihat; aktif malam hari.' }
      ],
      architecture: { inspiration: 'Rumah Gadang Minangkabau', origin: 'inspirasi Sumatra Barat', note: 'Atap gonjong menjulang dan rumah panggung kayu menjadi inspirasi bentuk. Rumah Gadang adalah warisan Minangkabau, bukan wakil seluruh budaya Sumatra.' },
      questBuilding: { id: 'balai-arsip', style: 'gadang', name: 'Balai Arsip Pangan Hujan', desc: 'Balai komunitas fiktif yang memadukan ruang arsip, rak bukti, dan pasar pangan edukatif di atas dek sungai. Laci bahan pangan dan papan komposisi menu membantu membandingkan energi, protein, dan serat.', parts: ['Atap bergonjong sebagai siluet utama', 'Laci arsip bahan pangan dan rak kartu data', 'Pasar kecil di bagian depan', 'Dek kayu di atas sungai', 'Papan komposisi menu', 'Lampu gantung hangat'] },
      hotspots: [
        { id: 'papan-menu', x: 50, y: 63, name: 'Papan komposisi menu', note: 'Di sini dua menu dibandingkan baris demi baris: energi sama belum tentu protein dan seratnya sama.' },
        { id: 'laci-arsip', x: 41, y: 48, name: 'Laci arsip bahan pangan', note: 'Setiap laci memuat kartu data simulasi satu bahan pangan.' },
        { id: 'dek-sungai', x: 70, y: 80, name: 'Dek sungai', note: 'Dek kayu menghubungkan pasar pangan dengan jembatan.' }
      ],
      accessibilityDescription: 'Latar Pulau Sumatra: pegunungan berkabut di belakang, Balai Arsip Pangan Hujan beratap gonjong di atas dek sungai di tengah, dan hutan hujan dengan bunga raksasa, paku, bambu, serta satwa hutan di depan.',
      motion: { mist: true, water: true, sway: true }
    },
    2: {
      key: 'jawa', name: 'Jawa', region: 'Pulau Jawa',
      palette: { sky1: '#f6d9b8', sky2: '#fdf3e4', far: '#8f9aa0', mid: '#6e9a52', ground: '#7a8f3e', accent: '#f08a3c', water: '#66b6d0', ink: '#2b2a22' },
      terrain: { type: 'vulkan', label: 'Gunung berapi, lereng hijau, sawah bertingkat dan kebun teh', river: true, mist: true },
      natureObjects: [
        { id: 'sawah', type: 'terrace', x: 120, s: 1, name: 'Sawah bertingkat', note: 'Teras sawah menahan air di lereng gunung.' },
        { id: 'teh', type: 'tea', x: 880, s: 1, name: 'Kebun teh', note: 'Barisan teh tumbuh di lereng sejuk.' },
        { id: 'bambu', type: 'bamboo', x: 40, s: 1, name: 'Kebun bambu', note: 'Bambu dipakai untuk pagar dan peralatan kebun.' },
        { id: 'andesit', type: 'rock', x: 300, s: 1, name: 'Batu andesit', note: 'Batuan beku dari gunung api, kuat untuk fondasi.' },
        { id: 'sungai', type: 'stream', x: 760, s: 1, name: 'Sungai kecil', note: 'Air lereng mengalir ke sawah di bawah.' },
        { id: 'gua-kapur', type: 'cave', x: 960, s: 1, name: 'Gua kapur', note: 'Gua kecil di perbukitan kapur selatan (ilustrasi).' },
        { id: 'pohon', type: 'tree', x: 220, s: 0.9, name: 'Pohon peneduh lereng', note: 'Menahan tanah vulkanik agar tidak longsor.' },
        { id: 'pangan', type: 'crops', x: 640, s: 1, name: 'Taman tanaman pangan', note: 'Singkong, jagung, dan kacang ditanam berderet.' },
        { id: 'kabut', type: 'mist', x: 500, s: 1, name: 'Kabut pagi', note: 'Kabut tipis turun di lereng sebelum matahari tinggi.' }
      ],
      fauna: [
        { id: 'elang-jawa', shape: 'elang', x: 210, y: 90, name: 'Elang Jawa', latin: 'Nisaetus bartelsi', status: 'endemik', statusText: 'Endemik Jawa', habitat: 'Hutan pegunungan Jawa', note: 'Elang berjambul yang terbang tinggi di atas lereng berhutan.' },
        { id: 'owa-jawa', shape: 'owa', x: 40, y: 220, name: 'Owa Jawa', latin: 'Hylobates moloch', status: 'endemik', statusText: 'Endemik Jawa', habitat: 'Hutan hujan Jawa bagian barat dan tengah', note: 'Berayun dari dahan ke dahan dan bersuara nyaring di pagi hari.' },
        { id: 'surili', shape: 'kera', x: 930, y: 250, name: 'Surili', latin: 'Presbytis comata', status: 'endemik', statusText: 'Endemik Jawa', habitat: 'Hutan Jawa bagian barat dan tengah', note: 'Monyet daun berjambul yang memakan daun muda.' },
        { id: 'badak-jawa', shape: 'badak', x: 820, y: 335, name: 'Badak Jawa', latin: 'Rhinoceros sondaicus', status: 'endemik', statusText: 'Kini hanya di TN Ujung Kulon, Banten', habitat: 'Hutan dataran rendah dan rawa Ujung Kulon (ujung barat Jawa)', note: 'Ditampilkan sebagai kartu: populasinya hanya tersisa di Ujung Kulon, bukan di lereng gunung api.' }
      ],
      architecture: { inspiration: 'Pendopo dan joglo', origin: 'inspirasi Jawa (Jawa Tengah & DI Yogyakarta)', note: 'Ruang terbuka bertiang kayu (soko) dan atap bertingkat bergaya joglo; tidak dicampur dengan bentuk rumah adat pulau lain.' },
      questBuilding: { id: 'lab-kawah', style: 'joglo', name: 'Laboratorium Rantai Cerna Kawah', desc: 'Pusat penelitian fiktif di lereng gunung. Tabung transparan dan jalur cairan bercahaya menggambarkan urutan zat yang diubah dan dipindahkan dari satu ruang ke ruang berikutnya.', parts: ['Pendopo utama beratap joglo', 'Tabung transparan berurutan', 'Jalur cairan bercahaya', 'Ruang observasi berpanel diagram', 'Jembatan kecil antar-ruang', 'Fondasi batu vulkanik', 'Lampu biru dan jingga'] },
      hotspots: [
        { id: 'tabung', x: 50, y: 58, name: 'Deret tabung proses', note: 'Tabung disusun berurutan: urutan ruang menentukan zat mana yang sudah diubah.' },
        { id: 'observasi', x: 74, y: 52, name: 'Ruang observasi', note: 'Panel diagram mencatat perubahan di tiap ruang (data simulasi).' },
        { id: 'jembatan-ruang', x: 63, y: 66, name: 'Jembatan antar-ruang', note: 'Jalur perpindahan dari pendopo ke ruang observasi.' }
      ],
      accessibilityDescription: 'Latar Pulau Jawa: gunung berapi berkabut di belakang, Laboratorium Rantai Cerna Kawah beratap joglo dengan tabung bercahaya di tengah, sawah bertingkat, kebun teh, dan batu andesit di depan.',
      motion: { mist: true, water: true, sway: true }
    },
    3: {
      key: 'kalimantan', name: 'Kalimantan', region: 'Pulau Kalimantan (Borneo)',
      palette: { sky1: '#cde7d6', sky2: '#f1f7ea', far: '#5f8f6c', mid: '#2f6e45', ground: '#4c6b2e', accent: '#d9822b', water: '#7a9c7f', ink: '#1d2a18' },
      terrain: { type: 'sungai-besar', label: 'Hutan hujan bertingkat, sungai besar, rawa gambut dan bakau', river: true, mist: true },
      natureObjects: [
        { id: 'kanopi', type: 'tree', x: 930, s: 1.35, name: 'Hutan hujan bertingkat', note: 'Pohon tinggi membentuk lapisan kanopi di atas sungai.' },
        { id: 'akar', type: 'roots', x: 820, s: 1, name: 'Akar pohon besar', note: 'Akar banir menopang pohon di tanah gambut yang lunak.' },
        { id: 'bakau', type: 'mangrove', x: 60, s: 1, name: 'Hutan bakau', note: 'Akar tunjang bakau berdiri di air payau muara.' },
        { id: 'gambut', type: 'peat', x: 180, s: 1, name: 'Rawa gambut', note: 'Air rawa gambut berwarna cokelat teh.' },
        { id: 'sulur', type: 'vine', x: 900, s: 1, name: 'Tanaman merambat', note: 'Sulur menghubungkan dahan seperti jembatan alami.' },
        { id: 'daun', type: 'fern', x: 270, s: 1.2, name: 'Daun lebar lantai hutan', note: 'Daun lebar menangkap cahaya yang sedikit.' },
        { id: 'bunga', type: 'flower', x: 720, s: 1, name: 'Bunga hutan', note: 'Bunga menarik serangga penyerbuk.' },
        { id: 'perahu', type: 'boat', x: 400, s: 1, name: 'Perahu sungai', note: 'Sungai menjadi jalan utama antar-kampung.' },
        { id: 'jembatan-gantung', type: 'bridge', x: 800, s: 1, name: 'Jembatan gantung', note: 'Menghubungkan rumah panjang ke menara kanopi.' }
      ],
      fauna: [
        { id: 'orangutan-kalimantan', shape: 'kera', x: 905, y: 170, name: 'Orangutan Kalimantan', latin: 'Pongo pygmaeus', status: 'endemik', statusText: 'Endemik Pulau Kalimantan (Borneo)', habitat: 'Hutan hujan dan hutan rawa gambut', note: 'Membuat sarang baru dari dahan setiap malam.' },
        { id: 'bekantan', shape: 'bekantan', x: 120, y: 265, name: 'Bekantan', latin: 'Nasalis larvatus', status: 'endemik', statusText: 'Endemik Pulau Kalimantan (Borneo)', habitat: 'Hutan bakau dan tepi sungai', note: 'Monyet berhidung panjang yang pandai berenang.' },
        { id: 'kucing-merah', shape: 'kucing', x: 690, y: 340, name: 'Kucing merah', latin: 'Catopuma badia', status: 'endemik', statusText: 'Endemik Pulau Kalimantan (Borneo)', habitat: 'Hutan dataran rendah dekat sungai', note: 'Kucing liar kecil yang sangat jarang terekam kamera.' },
        { id: 'rangkong-badak', shape: 'rangkong', x: 540, y: 95, name: 'Rangkong badak', latin: 'Buceros rhinoceros', status: 'khas', statusText: 'Satwa khas wilayah (juga di Sumatra & Semenanjung Malaya)', habitat: 'Kanopi hutan hujan', note: 'Paruhnya bertanduk (balung); penyebar biji pohon hutan.' }
      ],
      architecture: { inspiration: 'Rumah panjang (betang)', origin: 'inspirasi rumah betang komunitas Dayak, Kalimantan Tengah & Barat', note: 'Bangunan memanjang di atas tiang tinggi untuk banyak keluarga. Komunitas Dayak beragam; bentuk ini tidak mewakili semua budaya Kalimantan.' },
      questBuilding: { id: 'stasiun-kanopi', style: 'betang', name: 'Stasiun Aliran Kanopi', desc: 'Stasiun riset fiktif yang membentang di atas sungai. Gerbang air, terowongan akar, dan jembatan kanopi menggambarkan perpindahan hasil cerna melalui permukaan dan jalur.', parts: ['Bangunan memanjang di atas tiang', 'Gerbang air dan jalur sungai', 'Panel arah perpindahan', 'Terowongan akar', 'Menara kanopi', 'Dek pengamatan satwa', 'Air yang mengalir perlahan'] },
      hotspots: [
        { id: 'gerbang-air', x: 30, y: 78, name: 'Gerbang air', note: 'Hanya yang sudah cukup kecil dapat melewati celah gerbang — seperti zat yang siap diserap.' },
        { id: 'panel-arah', x: 52, y: 55, name: 'Panel arah perpindahan', note: 'Panah menunjukkan dari mana ke mana zat berpindah.' },
        { id: 'menara', x: 80, y: 30, name: 'Menara kanopi', note: 'Dari sini permukaan sungai yang luas terlihat jelas: makin luas permukaan, makin banyak yang berpindah.' }
      ],
      accessibilityDescription: 'Latar Pulau Kalimantan: dataran hutan berkabut di belakang, Stasiun Aliran Kanopi berupa rumah panjang di atas tiang yang terhubung jembatan gantung ke menara kanopi di tengah, serta sungai, bakau, dan rawa gambut di depan.',
      motion: { mist: true, water: true, sway: true }
    },
    4: {
      key: 'sulawesi', name: 'Sulawesi', region: 'Pulau Sulawesi',
      palette: { sky1: '#c5e4f0', sky2: '#f4f9f6', far: '#b9c7c0', mid: '#5f9a77', ground: '#8aa35a', accent: '#c8452f', water: '#3aa6c0', ink: '#1f2b33' },
      terrain: { type: 'karst', label: 'Pegunungan karst, tebing kapur, gua, teluk dan terumbu karang', river: false, mist: true, sea: true },
      natureObjects: [
        { id: 'karst', type: 'karst', x: 900, s: 1, name: 'Menara karst', note: 'Batu kapur terkikis air hujan menjadi tebing tegak.' },
        { id: 'gua', type: 'cave', x: 80, s: 1.1, name: 'Gua kapur', note: 'Air melarutkan kapur dan membentuk lorong gua.' },
        { id: 'karang', type: 'coral', x: 200, s: 1, name: 'Terumbu karang', note: 'Karang hidup di perairan teluk yang jernih.' },
        { id: 'batu-pesisir', type: 'rock', x: 300, s: 1.1, name: 'Pesisir berbatu', note: 'Batu kapur di tepi teluk.' },
        { id: 'rumput', type: 'grass', x: 700, s: 1, name: 'Padang rumput', note: 'Padang terbuka di antara bukit.' },
        { id: 'pohon', type: 'tree', x: 980, s: 1, name: 'Hutan tropis', note: 'Hutan di kaki tebing karst.' },
        { id: 'bunga', type: 'flower', x: 620, s: 1, name: 'Bunga tropis', note: 'Bunga di tepi jalan setapak.' },
        { id: 'pandan', type: 'pandan', x: 360, s: 1, name: 'Pandan pesisir', note: 'Tanaman pesisir yang tahan angin laut.' },
        { id: 'teluk', type: 'sea', x: 150, s: 1, name: 'Teluk dan pulau kecil', note: 'Sulawesi berbentuk lengan-lengan dengan banyak teluk.' }
      ],
      fauna: [
        { id: 'anoa', shape: 'anoa', x: 720, y: 340, name: 'Anoa', latin: 'Bubalus spp.', status: 'endemik', statusText: 'Endemik Sulawesi', habitat: 'Hutan dataran rendah hingga pegunungan', note: 'Kerbau kerdil, ada dua jenis: anoa dataran rendah dan anoa pegunungan.' },
        { id: 'babirusa', shape: 'babirusa', x: 600, y: 342, name: 'Babirusa', latin: 'Babyrousa spp.', status: 'endemik', statusText: 'Endemik Sulawesi & pulau sekitarnya', habitat: 'Hutan tepi sungai dan rawa', note: 'Taring atas jantan tumbuh menembus moncong dan melengkung ke belakang.' },
        { id: 'maleo', shape: 'maleo', x: 330, y: 338, name: 'Maleo', latin: 'Macrocephalon maleo', status: 'endemik', statusText: 'Endemik Sulawesi', habitat: 'Hutan dekat pantai atau sumber panas bumi', note: 'Telurnya dikubur di pasir hangat; anaknya langsung bisa terbang.' },
        { id: 'tarsius', shape: 'tarsius', x: 955, y: 225, name: 'Tarsius', latin: 'Tarsius spp.', status: 'endemik', statusText: 'Khas Sulawesi & pulau sekitarnya (beberapa jenis)', habitat: 'Hutan, semak, dan tebing berlubang', note: 'Primata kecil bermata besar yang aktif malam hari.' },
        { id: 'yaki', shape: 'kera', x: 40, y: 300, name: 'Monyet hitam Sulawesi (yaki)', latin: 'Macaca nigra', status: 'endemik', statusText: 'Endemik Sulawesi Utara', habitat: 'Hutan Sulawesi bagian utara', note: 'Berjambul hitam dan hidup dalam kelompok besar.' }
      ],
      architecture: { inspiration: 'Tongkonan', origin: 'inspirasi Toraja, Sulawesi Selatan', note: 'Atap melengkung seperti perahu menjadi elemen visual utama, tanpa ukiran atau simbol ritual. Tongkonan tidak mewakili seluruh Sulawesi.' },
      questBuilding: { id: 'observatorium-karst', style: 'tongkonan', name: 'Observatorium Jejak Karst', desc: 'Observatorium fiktif dengan ruang yang bercabang. Jalur cahaya terpecah lalu bertemu kembali, mengingatkan bahwa beberapa faktor bisa berubah bersamaan dan data belum tentu menunjuk satu penyebab tunggal.', parts: ['Atap melengkung terinspirasi Tongkonan', 'Ruang bercabang seperti jalur sebab-akibat', 'Dinding peta dan garis hubungan', 'Menara pengamatan', 'Jembatan antar-tingkat', 'Panel data yang dapat dibaca', 'Jalur cahaya bercabang dan bertemu'] },
      hotspots: [
        { id: 'jalur-cahaya', x: 50, y: 70, name: 'Jalur cahaya bercabang', note: 'Dua jalur menuju hasil yang sama: perlu uji yang adil untuk tahu mana yang berpengaruh.' },
        { id: 'dinding-peta', x: 46, y: 46, name: 'Dinding peta hubungan', note: 'Garis hubungan mencatat dugaan, bukan kepastian.' },
        { id: 'menara-amat', x: 74, y: 28, name: 'Menara pengamatan', note: 'Mengamati dari banyak sudut sebelum menyimpulkan.' }
      ],
      accessibilityDescription: 'Latar Pulau Sulawesi: menara karst kapur dan teluk di belakang, Observatorium Jejak Karst beratap melengkung dengan jalur cahaya bercabang di tengah, serta gua, terumbu karang, pesisir berbatu, dan padang rumput di depan.',
      motion: { mist: true, water: true, sway: true }
    },
    5: {
      key: 'papua', name: 'Papua', region: 'Pulau Papua (Nugini bagian barat)',
      palette: { sky1: '#c9c6ec', sky2: '#eef0fb', far: '#7d84b8', mid: '#3f6f66', ground: '#4f6d3c', accent: '#e9b949', water: '#6fb1d6', ink: '#1e1f3a' },
      terrain: { type: 'pegunungan-tinggi', label: 'Pegunungan tinggi, hutan awan, lembah, danau dan hutan sagu', river: false, mist: true, lake: true },
      natureObjects: [
        { id: 'puncak', type: 'peaks', x: 500, s: 1, name: 'Pegunungan tinggi', note: 'Puncak tertinggi Indonesia berada di Pegunungan Jayawijaya.' },
        { id: 'hutan-awan', type: 'mossy', x: 80, s: 1.2, name: 'Hutan awan berlumut', note: 'Pohon di ketinggian diselimuti lumut karena kabut terus-menerus.' },
        { id: 'air-terjun', type: 'waterfall', x: 940, s: 1, name: 'Air terjun lembah', note: 'Air dari pegunungan turun ke lembah.' },
        { id: 'danau', type: 'lake', x: 220, s: 1, name: 'Danau', note: 'Danau pegunungan yang tenang.' },
        { id: 'sagu', type: 'sago', x: 860, s: 1, name: 'Hutan sagu', note: 'Batang sagu menghasilkan pati, pangan pokok di banyak daerah Papua.' },
        { id: 'batu', type: 'rock', x: 330, s: 1.3, name: 'Batu besar', note: 'Bongkah batu di tepi jalur kayu.' },
        { id: 'bunga', type: 'flower', x: 700, s: 1, name: 'Bunga tropis', note: 'Bunga hutan yang mekar di tanah lembap.' },
        { id: 'pakis', type: 'fern', x: 150, s: 1.3, name: 'Pakis pohon', note: 'Pakis tumbuh tinggi di hutan pegunungan.' },
        { id: 'jalur', type: 'boardwalk', x: 620, s: 1, name: 'Jalur kayu', note: 'Jalan papan di atas tanah lembap melindungi akar.' }
      ],
      fauna: [
        { id: 'cenderawasih', shape: 'cenderawasih', x: 120, y: 175, name: 'Burung cenderawasih', latin: 'Famili Paradisaeidae', status: 'khas', statusText: 'Khas kawasan Papua–Nugini & Maluku', habitat: 'Hutan hujan dan hutan pegunungan', note: 'Jantan memiliki bulu hias dan tarian untuk menarik betina.' },
        { id: 'kanguru-pohon', shape: 'kanguru', x: 40, y: 245, name: 'Kanguru pohon', latin: 'Dendrolagus spp.', status: 'kawasan', statusText: 'Tersebar di kawasan (Nugini & Australia utara)', habitat: 'Hutan pegunungan', note: 'Kanguru yang memanjat pohon dengan cakar kuat.' },
        { id: 'kasuari', shape: 'kasuari', x: 780, y: 335, name: 'Kasuari gelambir ganda', latin: 'Casuarius casuarius', status: 'kawasan', statusText: 'Tersebar di kawasan (Nugini, Kepulauan Aru, Australia utara)', habitat: 'Hutan dataran rendah', note: 'Burung besar yang tidak bisa terbang; penyebar biji buah hutan.' },
        { id: 'ekidna', shape: 'ekidna', x: 400, y: 345, name: 'Ekidna moncong panjang', latin: 'Zaglossus spp.', status: 'endemik', statusText: 'Endemik Pulau Nugini', habitat: 'Hutan pegunungan dan padang rumput tinggi', note: 'Mamalia bertelur yang mencari cacing dengan moncongnya.' },
        { id: 'kuskus', shape: 'kuskus', x: 905, y: 215, name: 'Kuskus', latin: 'Famili Phalangeridae', status: 'kawasan', statusText: 'Tersebar di kawasan (Sulawesi, Maluku, Nugini, Australia)', habitat: 'Pepohonan hutan', note: 'Berekor pemegang dan bergerak lambat di dahan.' }
      ],
      architecture: { inspiration: 'Honai', origin: 'inspirasi Honai, Papua Pegunungan (Lembah Baliem)', note: 'Hanya bentuk bundar, atap jerami rendah, dan bahan alami yang dipinjam untuk ruang arsip. Honai bukan wakil seluruh budaya Papua yang sangat beragam.' },
      questBuilding: { id: 'menara-verifikasi', style: 'menara', name: 'Menara Verifikasi Hutan Awan', desc: 'Menara arsip fiktif dan bangunan tertinggi di atlas. Jendela lensa, pemindai, dan tiga panel memisahkan DATA, KESIMPULAN, dan ASUMSI agar klaim dapat diperiksa terhadap bukti.', parts: ['Menara observasi bertingkat', 'Ruang arsip bundar beratap rendah', 'Jendela berbentuk lensa', 'Panel data, kesimpulan, asumsi', 'Jembatan kayu di antara kabut', 'Ruang pamer satwa & habitat', 'Antena pemindai fiktif', 'Cahaya biru, ungu, dan emas'] },
      hotspots: [
        { id: 'panel-tiga', x: 50, y: 70, name: 'Panel data · kesimpulan · asumsi', note: 'Pisahkan apa yang terukur (data), apa yang ditarik (kesimpulan), dan apa yang dianggap benar tanpa bukti (asumsi).' },
        { id: 'lensa', x: 50, y: 34, name: 'Jendela lensa', note: 'Lensa memperbesar detail kecil yang sering diabaikan dalam klaim.' },
        { id: 'pemindai', x: 50, y: 8, name: 'Antena pemindai', note: 'Mencari informasi yang hilang sebelum klaim diterima.' }
      ],
      accessibilityDescription: 'Latar Pulau Papua: pegunungan tinggi berkabut ungu di belakang, Menara Verifikasi Hutan Awan bertingkat dengan jendela lensa dan ruang arsip bundar di tengah, serta hutan awan berlumut, danau, sagu, dan jalur kayu di depan.',
      motion: { mist: true, water: true, sway: true }
    },
    6: {
      key: 'bali-nusa-tenggara', name: 'Bali–Nusa Tenggara', region: 'Bali, Lombok, dan Nusa Tenggara',
      palette: { sky1: '#bfe5f2', sky2: '#fff4dc', far: '#c9a46a', mid: '#b5a046', ground: '#c7a85a', accent: '#e2553f', water: '#2aa7c9', ink: '#3a2412' },
      terrain: { type: 'savana-pesisir', label: 'Savana kering, pantai, bukit kapur, mangrove dan laut biru', river: false, mist: false, sea: true },
      natureObjects: [
        { id: 'savana', type: 'grass', x: 820, s: 1.2, name: 'Savana kering', note: 'Padang rumput luas dengan musim kemarau panjang di Nusa Tenggara.' },
        { id: 'lontar', type: 'palm', x: 960, s: 1.2, name: 'Pohon lontar', note: 'Lontar tahan kering; niranya diolah menjadi gula.' },
        { id: 'pantai', type: 'sea', x: 120, s: 1, name: 'Pantai & laut biru', note: 'Perairan jernih di antara pulau-pulau kecil.' },
        { id: 'karang', type: 'coral', x: 80, s: 1, name: 'Terumbu karang', note: 'Segitiga Terumbu Karang mencakup perairan Nusa Tenggara.' },
        { id: 'bukit-kapur', type: 'karst', x: 760, s: 0.6, name: 'Bukit kapur', note: 'Bukit kapur rendah di pesisir selatan.' },
        { id: 'bakau', type: 'mangrove', x: 260, s: 0.9, name: 'Mangrove', note: 'Mangrove melindungi pesisir dari abrasi.' },
        { id: 'kebun', type: 'crops', x: 560, s: 1, name: 'Kebun bahan pangan', note: 'Jagung, sorgum, kacang, dan sayur untuk dapur (ilustrasi).' },
        { id: 'batu-karang', type: 'rock', x: 330, s: 1, name: 'Batu karang', note: 'Batu karang mati yang terangkat di tepi pantai.' },
        { id: 'gunung', type: 'peaks', x: 300, s: 0.7, name: 'Gunung', note: 'Gunung api seperti Rinjani menjulang di Lombok.' }
      ],
      fauna: [
        { id: 'jalak-bali', shape: 'jalak', x: 135, y: 220, zone: 'Bali', name: 'Jalak Bali', latin: 'Leucopsar rothschildi', status: 'endemik', statusText: 'Endemik Bali (zona Bali)', habitat: 'Hutan musim dan savana Bali Barat', note: 'Burung putih dengan kulit biru di sekitar mata; dilindungi.' },
        { id: 'celepuk-rinjani', shape: 'celepuk', x: 420, y: 230, zone: 'Lombok', name: 'Celepuk Rinjani', latin: 'Otus jolandae', status: 'endemik', statusText: 'Endemik Lombok (zona Nusa Tenggara)', habitat: 'Hutan lereng Gunung Rinjani', note: 'Burung hantu kecil yang baru dideskripsikan pada 2013.' },
        { id: 'komodo', shape: 'komodo', x: 860, y: 342, zone: 'Nusa Tenggara Timur', name: 'Komodo', latin: 'Varanus komodoensis', status: 'endemik', statusText: 'Endemik Komodo, Rinca, Flores & sekitarnya (NTT)', habitat: 'Savana dan hutan kering', note: 'Kadal terbesar di dunia; diamati dari jarak aman bersama jagawana.' },
        { id: 'rusa-timor', shape: 'rusa', x: 740, y: 335, zone: 'Nusa Tenggara', name: 'Rusa Timor', latin: 'Rusa timorensis', status: 'kawasan', statusText: 'Satwa khas wilayah (Jawa, Bali, Nusa Tenggara)', habitat: 'Savana dan padang rumput', note: 'Rusa yang merumput berkelompok di padang terbuka.' },
        { id: 'penyu-hijau', shape: 'penyu', x: 170, y: 388, zone: 'Laut', name: 'Penyu hijau', latin: 'Chelonia mydas', status: 'kawasan', statusText: 'Tersebar luas di laut tropis', habitat: 'Padang lamun dan pantai peneluran', note: 'Memakan lamun; betinanya kembali ke pantai untuk bertelur.' }
      ],
      architecture: { inspiration: 'Bale halaman Bali dan lumbung Sasak', origin: 'inspirasi Bali (paviliun bale) · inspirasi Nusa Tenggara (lumbung Sasak, Lombok)', note: 'Dua inspirasi dipisahkan secara visual: bale terbuka di zona Bali (kiri) dan lumbung beratap jerami melengkung di zona Lombok (kanan). Tidak memakai bangunan ibadah.' },
      questBuilding: { id: 'dapur-lumbung', style: 'lumbung', name: 'Dapur Juara Lumbung Data', desc: 'Kompleks dapur terbuka fiktif yang hangat dan meriah. Lumbung menyimpan bahan dan versi panduan menu; meja perancangan, papan telaah, dan area konsultasi mendukung menyusun, menelaah, dan merevisi.', parts: ['Dapur terbuka', 'Lumbung penyimpanan bahan', 'Meja perancangan menu', 'Kebun bahan pangan', 'Papan telaah & revisi', 'Area konsultasi', 'Teras menghadap laut', 'Rak versi awal & versi revisi'] },
      hotspots: [
        { id: 'meja-rancang', x: 50, y: 70, name: 'Meja perancangan menu', note: 'Draf panduan disusun untuk pengguna tertentu sebelum ditelaah.' },
        { id: 'papan-telaah', x: 37, y: 52, name: 'Papan telaah & revisi', note: 'Masukan dicatat bersama alasan revisinya.' },
        { id: 'lumbung-versi', x: 73, y: 40, name: 'Lumbung versi', note: 'Versi awal dan versi revisi disimpan berdampingan untuk refleksi.' }
      ],
      accessibilityDescription: 'Latar Bali–Nusa Tenggara: laut biru dan gunung di belakang, Dapur Juara Lumbung Data dengan bale terbuka bergaya Bali di kiri dan lumbung Sasak beratap melengkung di kanan, serta savana, lontar, mangrove, dan terumbu karang di depan.',
      motion: { mist: false, water: true, sway: true }
    }
  };
  window.NUTRANTARA_ISLANDS = islands;
})();
