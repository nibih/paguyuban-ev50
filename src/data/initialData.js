export const INITIAL_USERS = [
  { nik: "17001137", name: "A Sutriadi", role: "member", phone: "0812-9901-1137", status: "active", joined: "Mei 2026", position: "Pramudi EV 50" },
  { nik: "17001342", name: "Abdul Rochman", role: "member", phone: "0812-8822-1342", status: "active", joined: "Mei 2026", position: "Pramudi EV 50" },
  { nik: "17000495", name: "Ade Muhibudin", role: "member", phone: "0813-7711-0495", status: "active", joined: "Mei 2026", position: "Pramudi EV 50" },
  { nik: "17001504", name: "M. Sapli", role: "member", phone: "0813-4411-1504", status: "active", joined: "Mei 2026", position: "Pramudi EV 50", debt: 200000 },
  { nik: "17001589", name: "Afrizal Firmansyah", role: "admin", phone: "0811-9988-1589", status: "pengurus", joined: "Mei 2026", position: "Ketua/Admin Kas" },
  { nik: "17000699", name: "Moh Abdul Khaliq", role: "admin", phone: "0812-6655-0699", status: "pengurus", joined: "Mei 2026", position: "Bendahara Kas Kecil" },
  { nik: "17001365", name: "Toni Ichtiar", role: "member", phone: "0812-1122-1365", status: "pengurus", joined: "Mei 2026", position: "Korlap" },
  { nik: "17000839", name: "Bayu Dyan Sukmana", role: "member", phone: "0812-3344-0839", status: "active", joined: "Mei 2026", position: "Pramudi EV 50", debt: 300000 },
  { nik: "17001529", name: "Zeva Welian", role: "member", phone: "0813-9900-1529", status: "active", joined: "Mei 2026", position: "Pramudi EV 50", debt: 300000 },
  { nik: "17001109", name: "Muhamad Hasan", role: "member", phone: "0812-4455-1109", status: "active", joined: "Mei 2026", position: "Pramudi EV 50", debt: 500000 },
  { nik: "17001880", name: "Sandi", role: "member", phone: "0813-1122-1880", status: "active", joined: "Mei 2026", position: "Pramudi EV 50", debt: 1000000 }
];

export const MONTHS = ['Mei', 'Juni', 'Juli', 'Agustus', 'September'];

export const INITIAL_IURAN = {
  "17001137": {
    Mei: { status: "lunas", nominal: 100000, date: "2026-05-02", method: "Transfer BSI", ref: "BSI-88912" },
    Juni: { status: "lunas", nominal: 100000, date: "2026-06-03", method: "Transfer BSI", ref: "BSI-91021" },
    Juli: { status: "lunas", nominal: 100000, date: "2026-07-01", method: "Transfer BSI", ref: "BSI-94301" },
    Agustus: { status: "lunas", nominal: 100000, date: "2026-08-05", method: "Transfer BSI", ref: "BSI-98124" },
    September: { status: "lunas", nominal: 100000, date: "2026-09-02", method: "Midtrans QRIS", ref: "MDT-55410" }
  },
  "17001342": {
    Mei: { status: "lunas", nominal: 100000, date: "2026-05-04", method: "Tunai Admin" },
    Juni: { status: "lunas", nominal: 100000, date: "2026-06-05", method: "Tunai Admin" },
    Juli: { status: "lunas", nominal: 100000, date: "2026-07-04", method: "Transfer BSI" },
    Agustus: { status: "lunas", nominal: 100000, date: "2026-08-04", method: "Transfer BSI" },
    September: { status: "unpaid", nominal: 0 }
  },
  "17000495": {
    Mei: { status: "lunas", nominal: 100000, date: "2026-05-02", method: "Transfer BSI" },
    Juni: { status: "lunas", nominal: 100000, date: "2026-06-02", method: "Transfer BSI" },
    Juli: { status: "lunas", nominal: 100000, date: "2026-07-03", method: "Transfer BSI" },
    Agustus: { status: "lunas", nominal: 100000, date: "2026-08-02", method: "Transfer BSI" },
    September: { status: "unpaid", nominal: 0 }
  },
  "17001504": {
    Mei: { status: "unpaid", nominal: 0 },
    Juni: { status: "unpaid", nominal: 0 },
    Juli: { status: "unpaid", nominal: 0 },
    Agustus: { status: "unpaid", nominal: 0 },
    September: { status: "unpaid", nominal: 0 }
  },
  "17001589": {
    Mei: { status: "special", nominal: 500000, note: "Pemberian Saldo Pokok Awal Pengurus", date: "2026-05-01" },
    Juni: { status: "unpaid", nominal: 0 },
    Juli: { status: "unpaid", nominal: 0 },
    Agustus: { status: "special", nominal: 150000, note: "Iuran + Donasi Tambahan", date: "2026-08-01" },
    September: { status: "unpaid", nominal: 0 }
  },
  "17000699": {
    Mei: { status: "special", nominal: 50000, note: "Sebagian", date: "2026-05-01" },
    Juni: { status: "lunas", nominal: 100000, date: "2026-06-01" },
    Juli: { status: "lunas", nominal: 100000, date: "2026-07-01" },
    Agustus: { status: "lunas", nominal: 100000, date: "2026-08-01" },
    September: { status: "lunas", nominal: 100000, date: "2026-09-01" }
  },
  "17001365": {
    Mei: { status: "lunas", nominal: 100000 },
    Juni: { status: "lunas", nominal: 100000 },
    Juli: { status: "lunas", nominal: 100000 },
    Agustus: { status: "lunas", nominal: 100000 },
    September: { status: "lunas", nominal: 100000 }
  },
  "17000839": {
    Mei: { status: "lunas", nominal: 100000 },
    Juni: { status: "lunas", nominal: 100000 },
    Juli: { status: "lunas", nominal: 100000 },
    Agustus: { status: "unpaid", nominal: 0 },
    September: { status: "unpaid", nominal: 0 }
  },
  "17001529": {
    Mei: { status: "lunas", nominal: 100000 },
    Juni: { status: "lunas", nominal: 100000 },
    Juli: { status: "unpaid", nominal: 0 },
    Agustus: { status: "unpaid", nominal: 0 },
    September: { status: "unpaid", nominal: 0 }
  },
  "17001109": {
    Mei: { status: "lunas", nominal: 100000 },
    Juni: { status: "lunas", nominal: 100000 },
    Juli: { status: "lunas", nominal: 100000 },
    Agustus: { status: "lunas", nominal: 100000 },
    September: { status: "unpaid", nominal: 0 }
  },
  "17001880": {
    Mei: { status: "lunas", nominal: 100000 },
    Juni: { status: "unpaid", nominal: 0 },
    Juli: { status: "unpaid", nominal: 0 },
    Agustus: { status: "unpaid", nominal: 0 },
    September: { status: "unpaid", nominal: 0 }
  }
};

export const INITIAL_EXPENSES = [
  {
    id: 1,
    date: "2026-09-01",
    title: "Dana Talangan Bayu (koordinasi)",
    category: "Talangan",
    amount: 300000,
    pic: "Bayu Dyan",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_01.jpg"
  },
  {
    id: 2,
    date: "2026-09-04",
    title: "Suket M. Hasan Body 270",
    category: "Bantuan Laka / Suket",
    amount: 500000,
    pic: "M. Hasan",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "Body 270",
    receipt: "receipt_02.jpg"
  },
  {
    id: 3,
    date: "2026-09-04",
    title: "Penggantian Mekanik KLI (Tol & Makan)",
    category: "Konsumsi & Atensi",
    amount: 151000,
    pic: "Mekanik KLI",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_03.jpg"
  },
  {
    id: 4,
    date: "2026-09-04",
    title: "Biaya Konsumsi Perbaikan Body 242 oleh Mekanik Uday",
    category: "Konsumsi & Atensi",
    amount: 200000,
    pic: "Mekanik Uday",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "Body 242",
    receipt: "receipt_04.jpg"
  },
  {
    id: 5,
    date: "2026-09-05",
    title: "Pembelian Sparepart KLI Dorris Mandela (Cicilan 1)",
    category: "Sparepart",
    amount: 502500,
    pic: "Dorris Mandela",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_05.jpg"
  },
  {
    id: 6,
    date: "2026-09-05",
    title: "Penggantian Pembelian Sticker Warna Biru (Mekanik KLI)",
    category: "Belanja Teknik",
    amount: 91000,
    pic: "Mekanik KLI",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_06.jpg"
  },
  {
    id: 7,
    date: "2026-09-05",
    title: "Dana Talangan OPS Sandi",
    category: "Talangan",
    amount: 1000000,
    pic: "Sandi",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_07.jpg"
  },
  {
    id: 8,
    date: "2026-09-06",
    title: "Pembelian Cat, Tinner, dll + Transport",
    category: "Belanja Teknik",
    amount: 965500,
    pic: "Teknik Depo",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_08.jpg"
  },
  {
    id: 9,
    date: "2026-09-08",
    title: "Bansos an. Effendi Laka Pulang Kerja",
    category: "Bansos",
    amount: 302500,
    pic: "Effendi",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_09.jpg"
  },
  {
    id: 10,
    date: "2026-09-10",
    title: "Bansos an. Jonaemson G (Sakit)",
    category: "Bansos",
    amount: 300000,
    pic: "Jonaemson Gultom",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_10.jpg"
  },
  {
    id: 11,
    date: "2026-09-11",
    title: "Dana Talangan Laka an. Zeva",
    category: "Talangan",
    amount: 300000,
    pic: "Zeva Welian",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_11.jpg"
  },
  {
    id: 12,
    date: "2026-09-11",
    title: "Pembayaran Spare Part KLI bln Mei #via Afrizal",
    category: "Sparepart",
    amount: 500000,
    pic: "Afrizal Firmansyah",
    source: "Debet Rekening BSI Paguyuban",
    body: "-",
    receipt: "receipt_12.jpg"
  },
  {
    id: 13,
    date: "2026-09-15",
    title: "Dana Talangan Laka M. Sapli",
    category: "Talangan",
    amount: 200000,
    pic: "M. Sapli (Body 6H Tol JORR)",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "Body 270",
    receipt: "receipt_13.jpg"
  },
  {
    id: 14,
    date: "2026-09-16",
    title: "Bansos Muflih (Sakit)",
    category: "Bansos",
    amount: 302500,
    pic: "Muflih",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_14.jpg"
  },
  {
    id: 15,
    date: "2026-09-19",
    title: "Attensi Mekanik KLI & Afrizal",
    category: "Konsumsi & Atensi",
    amount: 50000,
    pic: "Mekanik KLI",
    source: "Kas Kecil Tunai (Kholiq)",
    body: "-",
    receipt: "receipt_15.jpg"
  }
];

export const INITIAL_DEBTS = [
  {
    id: "DEBT-01",
    nik: "17001504",
    name: "M. Sapli",
    incident: "Laka di Rute 6H serempet truk di Toll JORR II Lebak Bulus",
    startDate: "2026-09-15",
    body: "Body 270 / EV Fleet",
    disbursedBy: "Bendahara Kholiq",
    tenor: "1 Bulan",
    amount: 200000,
    paid: 0,
    status: "Belum Mengangsur",
    mutations: [
      { id: 1, date: "15/09/2026", desc: "Pencairan Dana Talangan Laka Tol JORR", debit: 200000, credit: 0, balance: 200000 }
    ]
  },
  {
    id: "DEBT-02",
    nik: "17000839",
    name: "Bayu Dyan Sukmana",
    incident: "Dana Talangan Koordinasi Jalur",
    startDate: "2026-09-01",
    body: "Body 248",
    disbursedBy: "Bendahara Kholiq",
    tenor: "1 Bulan",
    amount: 300000,
    paid: 0,
    status: "Belum Mengangsur",
    mutations: [
      { id: 1, date: "01/09/2026", desc: "Pencairan Dana Talangan Koordinasi", debit: 300000, credit: 0, balance: 300000 }
    ]
  },
  {
    id: "DEBT-03",
    nik: "17001109",
    name: "Muhamad Hasan",
    incident: "Suket Kepolisian Body 270",
    startDate: "2026-09-04",
    body: "Body 270",
    disbursedBy: "Bendahara Kholiq",
    tenor: "2 Bulan",
    amount: 500000,
    paid: 0,
    status: "Belum Mengangsur",
    mutations: [
      { id: 1, date: "04/09/2026", desc: "Pencairan Pengurusan Suket Laka 270", debit: 500000, credit: 0, balance: 500000 }
    ]
  },
  {
    id: "DEBT-04",
    nik: "17001529",
    name: "Zeva Welian",
    incident: "Dana Talangan Insiden Bodi Laka",
    startDate: "2026-09-11",
    body: "Body 258",
    disbursedBy: "Bendahara Kholiq",
    tenor: "1 Bulan",
    amount: 300000,
    paid: 0,
    status: "Belum Mengangsur",
    mutations: [
      { id: 1, date: "11/09/2026", desc: "Pencairan Bantuan Talangan Laka", debit: 300000, credit: 0, balance: 300000 }
    ]
  },
  {
    id: "DEBT-05",
    nik: "17001880",
    name: "Sandi",
    incident: "Dana Talangan Operasional Lapangan",
    startDate: "2026-09-05",
    body: "Body 242",
    disbursedBy: "Afrizal Firmansyah",
    tenor: "3 Bulan",
    amount: 1000000,
    paid: 0,
    status: "Belum Mengangsur",
    mutations: [
      { id: 1, date: "05/09/2026", desc: "Pencairan Dana Talangan Ops Jalur", debit: 1000000, credit: 0, balance: 1000000 }
    ]
  }
];

export const INITIAL_INCIDENTS = [
  {
    id: "INC-01",
    body: "Body 248",
    driver: "A Sutriadi",
    nik: "17001137",
    damage: "Bemper kanan baret kena separator",
    damageTypes: ["Bemper Kanan / Kiri Baret"],
    location: "Koridor 6H - Halte Ragunan",
    date: "2026-09-02",
    status: "Selesai",
    mechanic: "Mekanik KLI",
    expenseRef: "Rp91.000 Stiker Biru KLI",
    suketNeeded: false,
    suketStatus: "Tidak Perlu Suket",
    notes: "Sudah di-touchup cat dan stiker baru. Unit mulus."
  },
  {
    id: "INC-02",
    body: "Body 258",
    driver: "Abdul Rochman",
    nik: "17001342",
    damage: "Bemper kanan bawah baret trotoar",
    damageTypes: ["Bemper Kanan / Kiri Baret"],
    location: "Tol Lingkar Luar Exit Fatmawati",
    date: "2026-09-04",
    status: "Selesai",
    mechanic: "Mekanik KLI",
    expenseRef: "Rp151.000 Tol & Konsumsi KLI",
    suketNeeded: false,
    suketStatus: "Tidak Perlu Suket",
    notes: "Dikerjakan di sela jam istirahat shif 1."
  },
  {
    id: "INC-03",
    body: "Body 242",
    driver: "Ishak Oma",
    nik: "17000495",
    damage: "Body samping gompal & goresan tiang",
    damageTypes: ["Bodi Bawah Gompal"],
    location: "Depo EV Cawang",
    date: "2026-09-03",
    status: "Sedang Dikerjakan Mekanik",
    mechanic: "Mekanik Uday",
    expenseRef: "Rp200.000 Konsumsi Uday",
    suketNeeded: false,
    suketStatus: "Tidak Perlu Suket",
    notes: "Sedang proses dempul & cat oven."
  },
  {
    id: "INC-04",
    body: "Body 270",
    driver: "Muhamad Hasan",
    nik: "17001109",
    damage: "Insiden jalur serempetan mobil box & bemper pecah",
    damageTypes: ["Bemper Kanan / Kiri Baret", "Lampu Utama / Sein Retak"],
    location: "Jalan TB Simatupang",
    date: "2026-09-04",
    status: "Sedang Dikerjakan Mekanik",
    mechanic: "Mekanik KLI",
    expenseRef: "Rp500.000 Suket Polisi",
    suketNeeded: true,
    suketStatus: "Suket Selesai",
    notes: "Suket laka lantas polres sudah terbit, klaim asuransi DAMRI proses."
  },
  {
    id: "INC-05",
    body: "Body 237",
    driver: "Toni Ichtiar",
    nik: "17001365",
    damage: "Kaca spion kiri pecah senggolan pohon",
    damageTypes: ["Kaca Spion Pecah"],
    location: "Koridor Cawang - PGC",
    date: "2026-09-18",
    status: "Laporan Baru Masuk",
    mechanic: "Belum Ditugaskan",
    expenseRef: "-",
    suketNeeded: false,
    suketStatus: "Menunggu Survey",
    notes: "Menunggu spion cadangan tiba dari gudang Cawang."
  }
];
