# 📋 SYSTEM EXECUTION & CURRENT STATE OVERVIEW (CURRENT_ACTIVITY.md)

**Aplikasi:** PAGUYUBAN EV50 CAWANG (SBU Transbusway Area Cawang - Perum DAMRI)  
**Status Terkini:** Proyek Web (React + Vite) & Proyek Mobile (React Native + Expo SDK 52 + Firebase) aktif. Seluruh CRUD admin sudah tertulis ke Firestore, bukan state lokal.  
**Commit Terakhir:** `d4adf99` — *fix(seeder): make additive, add read-only Firestore inspector*  
**Repository:** [github.com/nibih/paguyuban-ev50](https://github.com/nibih/paguyuban-ev50)

---

## 1. APA YANG SEDANG DIKERJAKAN SAAT INI (WHAT WE ARE DOING)

1. **Digitalisasi Operasional Lapangan Transjakarta EV50:**
   - Memindahkan 3 sistem pembukuan fisik berbasis kertas/Excel ke dalam aplikasi digital yang terpusat:
     - **Iuran Kas Bulanan:** Kewajiban Rp100.000/bulan per pengemudi untuk 126 pramudi aktif.
     - **Dana Talang / Piutang Anggota:** Penanganan darurat laka lantas dan koordinasi jalur dengan kartu angsuran bertempo 1–3 bulan.
     - **Lapor Perbaikan Bodi & Armada:** Pendataan baret bemper, gompal, spion pecah yang terkait dengan penugasan Mekanik KLI/Uday dan Surat Keterangan (Suket) Polsek/Polres.

2. **Admin CRUD Sudah Berjalan Penuh di Firestore:**
   - 7 mutasi transaksional tertulis ke database: `markIuranPaidCash`, `addExpense`, `deleteExpense`, `addDebt`, `deleteDebt`, `updateIncidentStatus`, `deleteIncident`.
   - Tab admin A1–A6 berada di `mobile/src/screens/admin/AdminContainer.js`, dengan layar `AdminKas`, `AdminIuran`, `AdminPengeluaran`, `AdminPiutang`, `AdminLogbook`, dan `AdminAnggota`.
   - Tab **A6 — Manajemen Anggota** sudah mencakup pencarian, filter, tambah, edit, dan menonaktifkan anggota.

3. **Tiga Celah MVP Tertutup (commit `8b84148`):**
   - Foto kerusakan disimpan sebagai thumbnail base64 langsung di dokumen Firestore.
   - Bukti transfer BSI wajib untuk transfer manual, memakai rekening asli `720510945`.
   - Ekspor CSV untuk laporan DAMRI (`mobile/src/utils/csvExport.js`).

4. **Keadaan Database Langsung (`paguyuban-ev50`):**
   - `users` 128 · `iuran` 128 · `debts` 15 · `expenses` 18 · `incidents` 3.
   - `system/vault`: BSI **Rp12.850.000**, Kas Kecil **Rp281.500**.

---

## 2. TEMUAN KRITIS YANG BELUM DISELESAIKAN

Dua masalah data ditemukan saat audit dan **sengaja belum ditulis ulang** karena menyangkut keuangan:

### a. 10 kartu utang rusak di Firestore langsung
Sebabnya sudah teridentifikasi: parser lama memberi kartu yang tidak cocok sebuah NIK **acak** (`1700${Math.floor(1000 + Math.random() * 9000)}`). Commit `a77bde6` memperbaiki hal itu di `seedData.json`, tetapi koreksinya tidak pernah di-push ke database langsung, dan seeder bersifat aditif sehingga melewati dokumen yang sudah ada.

Akibatnya:
- 8 kartu menunjuk ke NIK yang **tidak punya dokumen anggota**, sehingga tidak muncul di layar pramudi.
- 4 kartu kehilangan riwayat pembayaran (nilai `paid` turun ke 0, `amount` berubah).
- Kartu buatan aplikasi `DEBT-657796` dan `DEBT-918342` tidak ada di data referensi.

Skrip perbaikan `mobile/src/data/repairDebtCards.mjs` sudah diperbaiki dan lolos uji kering (`--dry-run`): 10 kartu akan dipulihkan, 2 kartu buatan aplikasi dilewatkan.

### b. 12 bulan iuran tercatat lunas padahal belum diverifikasi
Total **Rp1.200.000**:
- 5 bulan via Midtrans QRIS pada 10/10/2026 (semua NIK 17002197).
- 7 bulan ditandai "Tunai Kasir" oleh Afrizal pada 11/10/2026.

Pengguna memastikan bahwa semua pembayaran di aplikasi sejauh ini hanya **pengujian** dan tidak ada yang diverifikasi terhadap bank.

### c. Selisih saldo kas
BSI +Rp400.000 dan Kas Kecil +Rp150.000 dibanding seed. Setiap pembayaran di aplikasi menggeser kas kecil, jadi selisih itu adalah sisa uji coba.

Audit hanya-baca: `node src/data/auditTestPayments.mjs` (tidak menulis apa pun).

---

## 3. CELAH DESAIN DI BALIK MASALAH ITU

Pembayaran dikonfirmasi **seketika saat tombol ditekan**. `payIuran`, `markIuranPaidCash`, dan `repayDebt` semuanya langsung menulis status `lunas` dan menggeser `system/vault`, tanpa status tertunda.

Karena inilah ketukan uji coba berubah menjadi catatan keuangan. Membersihkan data tanpa memperbaiki hal ini berarti masalah yang sama akan terulang pada pembayaran berikutnya.

**Belum dikerjakan.** Perlu tahap *pending* → verifikasi sebelum sebuah pembayaran dianggap sah.

---

## 4. DETAIL ARSITEKTUR RUNTIME & ENVIRONMENT

```
paguyuban/
├── root (Web React + Vite)
│   ├── src/components/member/       # M1–M5, prototipe dengan state in-memory
│   ├── src/components/admin/        # A1–A5, prototipe
│   ├── firestore.rules              # Aturan integritas Firestore (lihat bagian 5)
│   ├── firebase.json / .firebaserc  # Konfigurasi deploy Firebase
│   └── vite.config.js               # Dev server port 5173
│
├── mobile/ (React Native Expo)      # <-- satu-satunya sisi yang memakai Firestore
│   ├── App.js                       # Auth gate + Bottom Tab Navigation
│   ├── src/screens/                 # Login, Dashboard, Iuran, Talangan,
│   │                                #   LaporPerbaikan, KasTerbuka
│   ├── src/screens/admin/           # AdminContainer (A1–A6) + 6 layar admin
│   ├── src/context/AppContext.js    # Semua mutasi + listener onSnapshot
│   ├── src/services/firebase.js     # Inisialisasi Firebase (config di-hardcode)
│   ├── src/utils/thumbnails.js      # Perkecil foto ke 400px, maks 3 foto/dokumen
│   ├── src/utils/csvExport.js       # Ekspor CSV laporan DAMRI
│   ├── src/data/                    # seeder, inspector, audit, perbaikan
│   ├── scripts/checkImports.mjs     # Pemeriksaan impor statis (~90ms)
│   └── eas.json                     # Konfigurasi build APK Android
│
└── reference/                       # Berkas fisik resmi (Excel, PDF)
```

**Catatan penting:** konfigurasi Firebase di-hardcode di `src/services/firebase.js`. Aplikasi **tidak pernah** membaca `process.env.EXPO_PUBLIC_*`, sehingga variabel lingkungan di dasbor EAS bersifat inert dan tidak memengaruhi APK.

---

## 5. STATUS BACKEND FIREBASE

- **Project ID:** `paguyuban-ev50`
- **Database:** Cloud Firestore `(default)`
- **Security Rules:** sudah ditulis di `firestore.rules` dan berada di repo, tetapi **belum di-deploy** (CLI `firebase` belum terpasang di mesin ini).

Aturan yang ditegakkan: tipe dan bentuk tiap dokumen, identitas bank pada vault tidak dapat diubah, `paid ≤ amount` pada utang, tiap dokumen membawa kuncinya sendiri, dan anggota **tidak pernah dihapus** — hanya dinonaktifkan.

**Batasan yang harus dipahami:** aplikasi tidak memakai Firebase Auth, sehingga semua permintaan datang dengan `request.auth == null`. Aturan semacam `if request.auth != null` akan mengunci keluar aplikasi sekaligus seeder. Konsekuensinya, aturan ini menjamin **integritas data, bukan otorisasi** — siapa pun yang mengetahui ID proyek masih bisa menulis dokumen yang bentuknya sah.

> **Pelajaran yang sudah terjadi sekali:** pada `create`, `resource` bernilai null. Draft pertama aturan memvalidasi blok `create` terhadap `resource.data`, yang akan membuat **semua** pembuatan dokumen gagal — termasuk seeder. Blok `create` sekarang memvalidasi `request.resource.data`.

---

## 6. IDENTITAS AKUN PENGUJIAN UTAMA

PIN default adalah **4 digit terakhir NIK** selama field `pin` belum diatur.

| Nama Pengemudi | NIK | PIN | Skenario Pengujian Fitur |
|---|---|---|---|
| **Nicholas** | `17002197` | `2197` | **Hutang Laka Aktif:** kartu talangan Rp910.000. Cocok untuk memeriksa apakah pembayaran bertahan setelah reload. |
| **A Sutriadi** | `17001137` | `1137` | **Bersih & Lunas:** Mei–Agustus lunas, tanpa utang. |
| **M. Sapli** | `17001504` | `1504` | **Hutang Jalur:** kartu talangan Rp200.000. |
| **Muhamad Hasan** | `17001109` | `1109` | **Hutang Suket:** pembebanan suket laka Body 270 Rp500.000. |
| **Afrizal Firmansyah** | `17001589` | `1589` | **Admin Kasir / Ketua:** rekap anggota, kas kecil tunai, dashboard KPI. |

**Keamanan PIN:** pesan galat untuk NIK yang salah dan PIN yang salah **dibedakan**. Pesan yang sama akan memberi tahu penyerang NIK mana yang benar-benar ada.

---

## 7. CATATAN OPERASIONAL

- **Jalur build APK:** `cd /home/oracle/nibih/paguyuban/mobile && eas build --platform android --profile preview`. Tidak ada APK baru sejak `a48d52c`.
- **Pemeriksaan aman untuk sesi:** `npm --prefix mobile run check:imports` (~90ms, 23 file). Menggantikan pemeriksaan bundel yang bisa menggantung sesi.
- **Variabel EAS `preview` asing:** dasbor EAS memuat konfigurasi proyek Firebase **lain** (`satva-b293d`), kunci API **Gemini**, dan ID klien Google OAuth. Inert bagi aplikasi ini, tetapi itu kredensial hidup di proyek yang salah — sebaiknya dihapus dari dasbor EAS.
- **Seeder:** `node src/data/seedFirestore.mjs` bersifat aditif — hanya membuat dokumen yang belum ada, tidak pernah menimpa, dan tidak pernah menyentuh saldo vault. Tambahkan `--dry-run` untuk laporan tanpa tulis.
