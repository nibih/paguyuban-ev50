const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const refDir = path.join(__dirname, '../../../reference');

// 1. Parse 128 Members
const wbTeknik = xlsx.readFile(path.join(refDir, 'laporan teknik 1.xlsx'));
const pramudiRows = xlsx.utils.sheet_to_json(wbTeknik.Sheets['DAFTAR NAMA PRAMUDI'], { header: 1 });
const users = [];

pramudiRows.slice(2).forEach(row => {
  if (row[1] && row[2]) {
    const nik = String(row[1]).trim();
    const name = String(row[2]).trim();
    const isAdmin = nik === '17001589' || nik === '17000699';
    users.push({
      nik,
      name,
      role: isAdmin ? 'admin' : 'member',
      position: nik === '17001589' ? 'Ketua/Admin Kas' : (nik === '17000699' ? 'Bendahara Kas Kecil' : 'Pramudi EV 50 Cawang'),
      status: 'active'
    });
  }
});

// 2. Parse Kartu Utang (DATA HUTANG ANGGOTA.xlsx)
const wbHutang = xlsx.readFile(path.join(refDir, 'DATA HUTANG ANGGOTA.xlsx'));
const debts = [];

wbHutang.SheetNames.forEach(sheetName => {
  if (sheetName.startsWith('Sheet')) return;
  const rows = xlsx.utils.sheet_to_json(wbHutang.Sheets[sheetName], { header: 1 });
  let name = sheetName.trim();
  let incident = 'Dana Talangan Laka/Operasional Jalur';
  let amount = 0;
  let tenor = '1 Bulan';

  rows.forEach(r => {
    if (r[0] && String(r[0]).includes('NAMA') && r[2]) {
      name = String(r[2]).trim();
    }
    if (r[0] && String(r[0]).includes('JUMLAH') && r[2]) {
      amount = Number(r[2]) || amount;
      if (r[3]) tenor = String(r[3]).trim();
    }
    if (r[2] && typeof r[2] === 'string' && r[2].length > 10 && !r[2].includes('KARTU') && !r[2].includes('NAMA')) {
      incident = r[2].trim();
    }
  });

  const matchingUser = users.find(u => u.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(u.name.toLowerCase()));
  const nik = matchingUser ? matchingUser.nik : `1700${Math.floor(1000 + Math.random() * 9000)}`;

  if (amount > 0 || incident.length > 5) {
    debts.push({
      id: `DEBT-${sheetName.replace(/\s+/g, '_')}`,
      nik,
      name,
      incident: incident || 'Talangan Insiden Operasional Jalur',
      startDate: '2026-09-01',
      tenor: tenor || '1 Bulan',
      amount: amount || 300000,
      paid: 0,
      status: 'Belum Mengangsur',
      body: 'Armada EV Cawang',
      disbursedBy: 'Bendahara Kholiq / Afrizal'
    });
  }
});

// 3. 15 Real Expenses
const expenses = [
  { id: "EXP-01", date: "2026-09-01", title: "Dana Talangan Bayu (koordinasi)", category: "Talangan", amount: 300000, pic: "Bayu Dyan", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-02", date: "2026-09-04", title: "Suket M. Hasan Body 270", category: "Bantuan Laka / Suket", amount: 500000, pic: "M. Hasan", source: "Kas Kecil Tunai (Kholiq)", body: "Body 270" },
  { id: "EXP-03", date: "2026-09-04", title: "Penggantian Mekanik KLI (Tol & Makan)", category: "Konsumsi & Atensi", amount: 151000, pic: "Mekanik KLI", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-04", date: "2026-09-04", title: "Biaya Konsumsi Perbaikan Body 242 oleh Mekanik Uday", category: "Konsumsi & Atensi", amount: 200000, pic: "Mekanik Uday", source: "Kas Kecil Tunai (Kholiq)", body: "Body 242" },
  { id: "EXP-05", date: "2026-09-05", title: "Pembelian Sparepart KLI Dorris Mandela (Cicilan 1)", category: "Sparepart", amount: 502500, pic: "Dorris Mandela", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-06", date: "2026-09-05", title: "Penggantian Pembelian Sticker Warna Biru (Mekanik KLI)", category: "Belanja Teknik", amount: 91000, pic: "Mekanik KLI", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-07", date: "2026-09-05", title: "Dana Talangan OPS Sandi", category: "Talangan", amount: 1000000, pic: "Sandi", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-08", date: "2026-09-06", title: "Pembelian Cat, Tinner, dll + Transport", category: "Belanja Teknik", amount: 965500, pic: "Teknik Depo", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-09", date: "2026-09-08", title: "Bansos an. Effendi Laka Pulang Kerja", category: "Bansos", amount: 302500, pic: "Effendi", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-10", date: "2026-09-10", title: "Bansos an. Jonaemson G (Sakit)", category: "Bansos", amount: 300000, pic: "Jonaemson Gultom", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-11", date: "2026-09-11", title: "Dana Talangan Laka an. Zeva", category: "Talangan", amount: 300000, pic: "Zeva Welian", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-12", date: "2026-09-11", title: "Pembayaran Spare Part KLI bln Mei #via Afrizal", category: "Sparepart", amount: 500000, pic: "Afrizal Firmansyah", source: "Debet Rekening BSI Paguyuban", body: "-" },
  { id: "EXP-13", date: "2026-09-15", title: "Dana Talangan Laka M. Sapli", category: "Talangan", amount: 200000, pic: "M. Sapli (Body 6H Tol JORR)", source: "Kas Kecil Tunai (Kholiq)", body: "Body 270" },
  { id: "EXP-14", date: "2026-09-16", title: "Bansos Muflih (Sakit)", category: "Bansos", amount: 302500, pic: "Muflih", source: "Kas Kecil Tunai (Kholiq)", body: "-" },
  { id: "EXP-15", date: "2026-09-19", title: "Attensi Mekanik KLI & Afrizal", category: "Konsumsi & Atensi", amount: 50000, pic: "Mekanik KLI", source: "Kas Kecil Tunai (Kholiq)", body: "-" }
];

const seedData = {
  users,
  debts,
  expenses,
  vault: {
    bsiBalance: 12450000,
    pettyCash: 131500,
    accountNo: "720510945",
    bankName: "Bank Syariah Indonesia (BSI)",
    accountHolder: "PAGUYUBAN EV 50 CAWANG"
  }
};

fs.writeFileSync(path.join(__dirname, 'seedData.json'), JSON.stringify(seedData, null, 2));
console.log(`Success parsing: ${users.length} members, ${debts.length} active debt records, ${expenses.length} expenses.`);
