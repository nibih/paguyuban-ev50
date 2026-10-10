# 🚀 ONBOARDING GUIDE FOR DEVELOPERS & AI AGENTS (ONBOARDING.md)

Panduan ini ditujukan bagi programmer baru atau AI coding agent yang mengambil alih proyek **PAGUYUBAN EV50 CAWANG**.

---

## 1. PENGENALAN SISTEM & DOMAIN BISNIS

Aplikasi ini mendigitalkan paguyuban pengemudi bus listrik Transjakarta (EV50) di bawah naungan operator Perum DAMRI (Depo Cawang).

### 3 Domain Operasional Inti:
1. **Iuran Kas Bulanan:** Setiap pramudi wajib membayar kas Rp100.000/bulan untuk dana sosial, perlindungan operasional, dan kas bersama. Saldo ditampung di Bank Syariah Indonesia (BSI) No. Rek `720510945` a.n **PAGUYUBAN EV 50 CAWANG**.
2. **Dana Talangan / Piutang Anggota:** Dana pinjaman darurat jika terjadi laka lantas atau kebutuhan jalur mendesak. Pembayaran dicatat dalam "Kartu Utang" bertempo 1–3 bulan.
3. **Lapor Perbaikan Bodi & Armada EV:** Kerusakan bodi bus (Body 237–285) seperti baret, gompal, atau spion pecah dilaporkan oleh pengemudi, dikoordinasikan dengan Mekanik KLI / Uday, serta pengurusan Surat Keterangan (Suket) kepolisian yang biayanya ditalangi paguyuban.

---

## 2. PANDUAN SETUP LOCAL ENVIRONMENT

### Prasyarat Sistem:
- **Node.js:** Versi >= 18 (Sistem saat ini: Node v24.15.0).
- **npm:** Versi >= 10.
- **Git** terkonfigurasi.

### Menjalankan Proyek Web (React + Vite):
```bash
# Masuk ke root directory
cd /home/oracle/nibih/paguyuban

# Install dependencies (jika baru clone)
npm install

# Jalankan dev server
npm run dev
# Buka http://localhost:5173 di browser
```

### Menjalankan Proyek Mobile (React Native Expo):
```bash
# Masuk ke folder mobile
cd /home/oracle/nibih/paguyuban/mobile

# Install dependencies
npm install

# Jalankan Metro Bundler
npm start
# Tekan 'w' untuk web preview, atau scan QR code via aplikasi Expo Go di smartphone Android/iOS.
```

---

## 3. PANDUAN FIREBASE (BACKEND)

Kredensial Firebase sudah terkonfigurasi pada file [`/mobile/.env`](file:///home/oracle/nibih/paguyuban/mobile/.env) dan [`/mobile/src/services/firebase.js`](file:///home/oracle/nibih/paguyuban/mobile/src/services/firebase.js):

- **Project ID:** `paguyuban-ev50`
- **Firestore Console:** [console.firebase.google.com/project/paguyuban-ev50/firestore](https://console.firebase.google.com/project/paguyuban-ev50/firestore)

### Menjalankan Ulang Seeding Data ke Firestore:
Jika Anda ingin me-reset atau memperbarui data di Firestore dari dokumen Excel:
```bash
cd /home/oracle/nibih/paguyuban/mobile
node src/data/seedFirestore.mjs
```

---

## 4. ATURAN PENGEMBANGAN UNTUK AI AGENT & DEVELOPER

1. **Integritas Data Asli:**
   - Selalu pertahankan nama pengemudi asli, NIK, nomor body bus, dan nominal pengeluaran sesuai dokumen di folder `reference/`.
   - Hindari membuat data acak (*dummy*) jika data aslinya ada di sheet Excel/PDF referensi.
2. **Prinsip Dual-Platform:**
   - Fitur baru yang ditambahkan di Web harus memiliki padanan alur di Mobile app (Expo), begitu juga sebaliknya.
3. **Penamaan Fitur:**
   - Istilah untuk pelaporan kerusakan adalah **"Lapor Perbaikan"** (bukan "Lapor Bodi").
4. **Alur Commit & Push:**
   - Commit harus jelas dan modular (menggunakan konvensi *Conventional Commits*: `feat:`, `fix:`, `refactor:`, `docs:`).
   - Pastikan selalu mem-push ke branch `main` repositori GitHub.
