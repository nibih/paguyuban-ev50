# 🚀 ONBOARDING GUIDE FOR DEVELOPERS & AI AGENTS (ONBOARDING.md)

Panduan ini ditujukan bagi programmer baru atau AI coding agent yang mengambil alih proyek **PAGUYUBAN EV50 CAWANG**.

---

## 1. PENGENALAN SISTEM & DOMAIN BISNIS

Aplikasi ini mendigitalkan paguyuban pengemudi bus listrik DAMRI SBU Transbusway Cawang EV 50 (Depo Cawang).

### 3 Domain Operasional Inti:
1. **Iuran Kas Bulanan:** Setiap pramudi wajib membayar kas Rp100.000/bulan untuk dana sosial, perlindungan operasional, dan kas bersama. Saldo ditampung di Bank Syariah Indonesia (BSI) No. Rek `7352135571` a.n **PAGUYUBAN EV 50 CAWANG**.
2. **Dana Talangan / Piutang Anggota:** Dana pinjaman darurat jika terjadi laka lantas atau kebutuhan jalur mendesak. Pembayaran dicatat dalam "Kartu Utang" bertempo 1–3 bulan.
3. **Lapor Perbaikan Bodi & Armada EV:** Kerusakan bodi bus (Body 237–285) seperti baret, gompal, atau spion pecah dilaporkan oleh pengemudi, dikoordinasikan dengan Mekanik KLI / Uday, serta pengurusan Surat Keterangan (Suket) kepolisian yang biayanya ditalangi paguyuban.

### Peran Pengguna
- **Pramudi (Member):** melihat iuran, kartu utang sendiri, melapor kerusakan, dan kas terbuka.
- **Pengurus / Kasir (Admin):** tab **A1** KPI, **A2** matriks iuran, **A3** pengeluaran, **A4** piutang, **A5** logbook armada, **A6** manajemen anggota.

---

## 2. PANDUAN SETUP LOCAL ENVIRONMENT

### Prasyarat Sistem:
- **Node.js:** Versi >= 18 (Sistem saat ini: Node v24.15.0).
- **npm:** Versi >= 10.
- **Git** terkonfigurasi.

### Menjalankan Proyek Web (React + Vite):
```bash
cd /home/oracle/nibih/paguyuban
npm install
npm run dev
# Buka http://localhost:5173 di browser
```

### Menjalankan Proyek Mobile (React Native Expo):
```bash
cd /home/oracle/nibih/paguyuban/mobile
npm install
npm start
# 'w' untuk web preview, atau scan QR via Expo Go
```

### Pemeriksaan yang AMAN dijalankan agent:
```bash
# ~90ms. Pemeriksaan impor statis (23 file saat ini).
npm --prefix mobile run check:imports
```

> ⚠️ **JANGAN jalankan `eas build` atau `expo export`.** Keduanya menggantung sesi agent. Build APK dijalankan oleh pengguna di mesinnya sendiri.

---

## 3. PANDUAN FIREBASE (BACKEND)

- **Project ID:** `paguyuban-ev50`
- **Firestore Console:** [console.firebase.google.com/project/paguyuban-ev50/firestore](https://console.firebase.google.com/project/paguyuban-ev50/firestore)
- **Config di-hardcode** di [`/mobile/src/services/firebase.js`](file:///home/oracle/nibih/paguyuban/mobile/src/services/firebase.js). Aplikasi **tidak pernah** membaca `process.env.EXPO_PUBLIC_*`, jadi variabel lingkungan di dasbor EAS bersifat inert.

### Struktur Koleksi

| Koleksi | Kunci | Isi |
|---|---|---|
| `system/vault` | tetap | `bsiBalance`, `pettyCash`, `accountNo`, `bankName`, `accountHolder` |
| `users` | `nik` | `name`, `role` (`member`/`admin`), `position`, `status` (`active`/`inactive`), `pin?`, `createdAt?`, `createdBy?` |
| `iuran` | `nik` | `months`: peta bulan → `{status, nominal, method?, date?, markedBy?, source?}` |
| `debts` | `id` | `nik`, `name`, `incident`, `amount`, `paid`, `status`, `tenor`, `startDate`, `body`, `disbursedBy` |
| `expenses` | `id` | `date`, `title`, `category`, `amount`, `pic`, `source`, `body` |
| `incidents` | `id` | `body`, `driver`, `nik`, `damage`, `location`, `status`, `photos?` |

**Bentuk data penting:** insiden menyimpan `body`/`driver`/`nik`/`damage`/`location` — **bukan** `title`/`description`/`reporterName`. Ketidakcocokan ini pernah membuat layar kosong sementara bundel tetap hijau. Pemeriksaan impor **tidak** menangkap salah bentuk data.

### Skrip Data
```bash
cd /home/oracle/nibih/paguyuban/mobile

# Baca keadaan langsung & bandingkan dengan seed. Hanya baca.
node src/data/inspectFirestore.mjs

# Audit sisa pembayaran pengujian. Hanya baca.
node src/data/auditTestPayments.mjs

# Seeder ADITIF: hanya membuat dokumen yang belum ada,
# tidak pernah menimpa, tidak pernah menyentuh vault.
node src/data/seedFirestore.mjs --dry-run   # laporan saja
node src/data/seedFirestore.mjs             # tulis

# Perbaikan kartu utang. Selalu uji kering dulu.
node src/data/repairDebtCards.mjs --dry-run
```

### Security Rules
Berkas [`firestore.rules`](file:///home/oracle/nibih/paguyuban/firestore.rules) ada di repo tapi **belum di-deploy**:
```bash
npm i -g firebase-tools && firebase login
firebase deploy --only firestore:rules
```

Aturan menjamin **integritas data, bukan otorisasi**. Aplikasi tidak memakai Firebase Auth, jadi `request.auth` selalu null — aturan `if request.auth != null` akan mengunci keluar aplikasi sekaligus seeder.

---

## 4. ATURAN PENGEMBANGAN UNTUK AI AGENT & DEVELOPER

1. **Integritas Data Asli:**
   - Selalu pertahankan nama pengemudi asli, NIK, nomor body bus, dan nominal pengeluaran sesuai dokumen di folder `reference/`.
   - **Jangan pernah membuat NIK, nama, atau nominal acak.** Sebuah bug pernah melakukan `users.find(...) || \`1700${Math.floor(1000 + Math.random()*9000)}\`` — hasilnya 8 kartu utang menunjuk ke orang yang tidak ada. Bila tidak yakin, tulis `nik: null` dan `needsReview: true`.
2. **Data Langsung Itu Keuangan Nyata:**
   - Selalu `--dry-run` sebelum menulis ke Firestore langsung.
   - Jangan menimpa saldo vault atau dokumen yang sudah ada tanpa konfirmasi eksplisit.
   - Pembayaran yang belum diverifikasi harus **bukan** `lunas`.
3. **Prinsip Dual-Platform:** fitur baru di Web harus punya padanan di Mobile dan sebaliknya. *Catatan: praktik ini belum konsisten — lihat `FEATURE_PLANNING.md` bagian 3 untuk pertanyaan terbuka soal masa depan Web.*
4. **Penamaan Fitur:** istilah pelaporan kerusakan adalah **"Lapor Perbaikan"** (bukan "Lapor Bodi").
5. **Anggota Tidak Pernah Dihapus:** hanya dinonaktifkan. Pemilik kartu utang atau riwayat iuran adalah bagian dari catatan keuangan. Admin aktif terakhir tidak boleh dinonaktifkan (agar tidak terkunci).
6. **NIK Tidak Bisa Diubah** setelah dibuat — seluruh utang, iuran, dan insiden menunjuk ke NIK itu.
7. **Pesan Galat Login Dibedakan:** NIK tak dikenal dan PIN salah harus memberi pesan berbeda. Pesan sama akan memberi tahu penyerang NIK mana yang ada.
8. **Alur Commit & Push:** konvensi *Conventional Commits* (`feat:`, `fix:`, `refactor:`, `docs:`), commit modular dan jelas, selalu push ke `main`.
   - Hati-hati: **backtick di pesan commit akan dieksekusi shell.** Gunakan `git commit -F -` dengan heredoc.

---

## 5. KEADAAN TERKINI & PEKERJAAN TERBUKA

Baca [`HANDOFF.md`](file:///home/oracle/nibih/paguyuban/docs/HANDOFF.md) untuk changelog lengkap dan [`CURRENT_ACTIVITY.md`](file:///home/oracle/nibih/paguyuban/docs/CURRENT_ACTIVITY.md) untuk keadaan sistem.

**Dua hal penting yang belum selesai:**

1. **10 kartu utang rusak di Firestore langsung** — 8 menunjuk ke NIK tanpa dokumen anggota, 4 kehilangan riwayat pembayaran. Skrip perbaikan sudah ada dan lolos uji kering, belum dijalankan.
2. **12 bulan iuran (Rp1.200.000) tercatat lunas dari pengujian** — semua pembayaran di aplikasi sejauh ini hanya uji coba dan tidak ada yang diverifikasi.

Di balik keduanya ada **celah desain**: pembayaran dikonfirmasi seketika saat tombol ditekan, tanpa tahap verifikasi. Membersihkan data tanpa memperbaiki hal ini berarti kontaminasi akan terulang.

### Akun Uji (PIN default = 4 digit terakhir NIK)

| Nama | NIK | PIN | Skenario |
|---|---|---|---|
| Nicholas | `17002197` | `2197` | Hutang laka Rp910.000 — cocok untuk menguji ketahanan pembayaran |
| A Sutriadi | `17001137` | `1137` | Bersih & lunas |
| M. Sapli | `17001504` | `1504` | Hutang jalur Rp200.000 |
| Muhamad Hasan | `17001109` | `1109` | Hutang suket Rp500.000 |
| Afrizal Firmansyah | `17001589` | `1589` | Admin Kasir / Ketua |
