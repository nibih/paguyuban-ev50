# 📋 SYSTEM EXECUTION & CURRENT STATE OVERVIEW (CURRENT_ACTIVITY.md)

**Aplikasi:** PAGUYUBAN EV50 CAWANG (SBU Transbusway Area Cawang - Perum DAMRI)  
**Status Terkini:** Proyek Web (React + Vite) & Proyek Mobile (React Native + Expo SDK 52 + Firebase) Aktif & Tersinkronisasi.  
**Repository:** [github.com/nibih/paguyuban-ev50](https://github.com/nibih/paguyuban-ev50)

---

## 1. APA YANG SEDANG DIKERJAKAN SAAT INI (WHAT WE ARE DOING)

1. **Digitalisasi Operasional Lapangan Transjakarta EV50:**
   - Memindahkan 3 sistem pembukuan fisik berbasis kertas/Excel ke dalam aplikasi digital yang terpusat:
     - **Iuran Kas Bulanan:** Kewajiban Rp100.000/bulan per pengemudi untuk 126 pramudi aktif.
     - **Dana Talang / Piutang Anggota:** Penanganan darurat laka lantas dan koordinasi jalur dengan kartu angsuran bertempo 1–3 bulan.
     - **Lapor Perbaikan Bodi & Armada:** Pendataan baret bemper, gompal, spion pecah yang terkait dengan penugasan Mekanik KLI/Uday dan Surat Keterangan (Suket) Polsek/Polres.

2. **Pengembangan Dua Sisi Ekosistem:**
   - **Frontend Web (Desktop & Mobile Simulation):** Terletak di root direktori `/home/oracle/nibih/paguyuban`, dibangun dengan React 18, Vite, dan Tailwind CSS. Memiliki switcher peran instan (*Member View* dan *Admin View*) serta simulasi gateway pembayaran Midtrans Snap.
   - **Mobile App Native (React Native + Expo):** Terletak di direktori [`/mobile`](file:///home/oracle/nibih/paguyuban/mobile), dibangun dengan Expo SDK 52, `@react-navigation`, `lucide-react-native`, dan backend **Cloud Firestore**.

3. **Integrasi Data Nyata dari Folder `reference/`:**
   - Data anggota sebanyak 126 pramudi diambil dari `laporan teknik 1.xlsx`.
   - Data kartu hutang (termasuk Nicholas NIK 17002197, M. Sapli NIK 17001504, M. Hasan NIK 17001109) diambil dari `DATA HUTANG ANGGOTA.xlsx`.
   - Data 15 pengeluaran sah September 2026 diambil dari `05. Laporan Pengeluaran Bulann September.pdf`.
   - Data rekening penampung BSI 720510945 a.n PAGUYUBAN EV 50 CAWANG.

---

## 2. DETAIL ARSITEKTUR RUNTIME & ENVIRONMENT

```
paguyuban/
├── root (Web React + Vite)
│   ├── src/components/member/       # M1: Dashboard, M2: Iuran, M3: Talangan, M4: Lapor Perbaikan, M5: Kas Terbuka
│   ├── src/components/admin/        # A1: KPI, A2: Matriks Iuran, A3: Pengeluaran, A4: Piutang, A5: Logbook
│   ├── src/context/AppContext.jsx   # State store reaktif dengan CRUD in-memory
│   ├── vercel.json                  # Konfigurasi SPA routing Vercel
│   └── vite.config.js               # Dev server port 5173
│
├── mobile/ (React Native Expo)
│   ├── App.js                       # Root entrypoint + Auth gate & Bottom Tab Navigation
│   ├── src/screens/                 # Login, Dashboard, Iuran, Talangan, LaporPerbaikan, KasTerbuka, AdminDashboard
│   ├── src/context/AppContext.js    # Firebase state store + real-time onSnapshot listeners
│   ├── src/services/firebase.js     # Inisialisasi Firebase Web SDK v11
│   ├── src/data/seedFirestore.mjs   # Skrip seeding data otomatis ke Firestore
│   ├── eas.json                     # Konfigurasi EAS build APK Android
│   └── app.json                     # Konfigurasi Expo manifest
│
└── reference/                       # Berkas fisik resmi (Excel, PDF mutasi kas & utang)
```

---

## 3. IDENTITAS AKUN PENGUJIAN UTAMA

Aplikasi mobile menyediakan tombol **1-Click Test** pada layar login:

| Nama Pengemudi | NIK | PIN | Skenario Pengujian Fitur |
|---|---|---|---|
| **Nicholas** | `17002197` | `2197` | **Hutang Laka Aktif:** Menguji kartu talangan Rp910.000 (*Laka Menabrak Mobil MAC*) & cicilan 2 bulan. |
| **A Sutriadi** | `17001137` | `1137` | **Pramudi Bersih & Lunas:** Menguji pembayaran iuran rutin, pelaporan bodi mulus, dan cek kas terbuka. |
| **M. Sapli** | `17001504` | `1504` | **Hutang Jalur:** Menguji kartu talangan Rp200.000 (*Laka 6H serempet truk di Toll JORR*). |
| **Muhamad Hasan** | `17001109` | `1109` | **Hutang Suket:** Menguji pembebanan suket laka Body 270 Rp500.000. |
| **Afrizal Firmansyah** | `17001589` | `1589` | **Admin Kasir / Korlap:** Menguji rekap 126 anggota, kontrol kas kecil tunai (Kholiq), dan dashboard KPI. |

---

## 4. STATUS BACKEND FIREBASE

- **Project ID:** `paguyuban-ev50`
- **Database:** Cloud Firestore `(default)` di region Asia.
- **Koleksi Aktif:**
  - `system/vault`: Saldo Rekening BSI Rp12.450.000 & Saldo Kas Kecil Tunai Rp131.500.
  - `users`: Dokumen akun pramudi & pengurus.
  - `debts`: Dokumen kartu utang piutang anggota (`DEBT-NICHOLAS`, `DEBT-M_SAPLI_`, dll.).
  - `expenses`: 15 dokumen mutasi pengeluaran resmi September 2026.
- **Security Rules:** Aktif dalam test mode (`allow read, write: if true;`) untuk kemudahan pengujian.
