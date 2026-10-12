# 🤝 HANDOFF & RUNNING GOALS (HANDOFF.md)

Dokumen ini mencatat riwayat perubahan terakhir (*changelog*), status saat ini, dan daftar tujuan berjalan (*running goals*) yang siap dilanjutkan oleh developer atau agen AI berikutnya.

**Commit terakhir:** `d4adf99` — *fix(seeder): make additive, add read-only Firestore inspector*

---

## 1. REKAP PERUBAHAN TERAKHIR (LAST CHANGES LOG)

### Sesi 1 — Prototipe (1–2 Oktober)
1. **Prototipe Web:** React + Vite + Tailwind, 5 layar Member (M1–M5) dan 5 layar Admin (A1–A5), simulasi Midtrans Snap, penamaan tombol diubah menjadi **"Lapor Perbaikan"**, init Git + remote + `vercel.json`.
2. **Migrasi Mobile Expo:** folder `/mobile`, Expo SDK 52, `@react-navigation/bottom-tabs`, `lucide-react-native`, `eas.json` dengan `buildType: "apk"`.
3. **Ekstraksi Data:** `parseReference.js` membaca `laporan teknik 1.xlsx` (126 pramudi), `DATA HUTANG ANGGOTA.xlsx` (13 kartu), laporan PDF September (15 transaksi) → `seedData.json`.
4. **Integrasi Firebase:** config asli `paguyuban-ev50`, listener `onSnapshot` di `AppContext.js`, login NIK + PIN, tombol 1-Click Test Accounts, akun Nicholas (17002197) diprioritaskan.

### Sesi 2 — Admin CRUD & MVP (10 Oktober)

5. **`5718a1b` — Admin CRUD ke Firestore.** 7 mutasi transaksional: `markIuranPaidCash`, `addExpense`, `deleteExpense`, `addDebt`, `deleteDebt`, `updateIncidentStatus`, `deleteIncident`. Layar baru `mobile/src/screens/admin/` (A1–A6). `AdminDashboard.js` lama yang hanya-baca dihapus.
6. **`7a7cec5` — Perbaikan filter pengeluaran.** Guard terbalik, filter memakai `title` bukan `category`, `.replace('operasional','operasional')` yang no-op, dan chip hardcode yang mati. Chip kini diturunkan dari data.
7. **`8b84148` — Tiga celah MVP ditutup.** Foto kerusakan (thumbnail base64), bukti transfer BSI wajib untuk transfer manual (rekening asli `720510945`), ekspor CSV laporan DAMRI.
8. **`a48d52c` — Manajemen anggota (A6).** Cari, filter, tambah, edit, nonaktifkan. PIN dibuat nyata: `loginWithNik(nik, pin)` kini mengembalikan `null` (sukses) atau string alasan. Listener `users` ditambahkan.
9. **`088df46` — Pemeriksaan impor statis.** `mobile/scripts/checkImports.mjs`, `npm --prefix mobile run check:imports`, ~90ms. Menggantikan pemeriksaan bundel yang bisa menggantung sesi. Kini memindai 23 file.

### Sesi 3 — Aturan & Data (12 Oktober)

10. **`3c18a03` — Aturan Security Rules + berhenti melacak `.env`.** File baru `firestore.rules`, `firebase.json`, `.firebaserc`, `firestore.indexes.json`. `mobile/.env` dilepas dari Git (`.gitignore` hanya mencantumkan `.env*.local`).

11. **`d4adf99` — Seeder aditif + inspector.** Sebelumnya seeder memanggil `setDoc` tanpa syarat — aman di database kosong, **merusak** begitu aplikasi dipakai. Kini hanya membuat dokumen yang belum ada dan tidak pernah menyentuh saldo vault. Menambah `--dry-run` dan `inspectFirestore.mjs` (hanya-baca).

---

## 2. PELAJARAN PENTING (BACA SEBELUM MENERUSKAN)

### a. Bug aturan `create` yang nyaris terkirim
`resource` bernilai null sampai dokumen ada. Draft pertama `firestore.rules` memvalidasi blok `create` terhadap `resource.data`, yang berarti **setiap pembuatan dokumen akan gagal — termasuk seeder**. Blok `create` kini memvalidasi `request.resource.data`.

Diverifikasi terhadap `seedData`: 15 pemeriksaan bentuk/kunci/enum lulus.

### b. Seeder lama menghapus data langsung
Vault sudah bergerak ke Rp12.850.000 / Rp281.500 dari Rp12.450.000 / Rp131.500 di seed, dan pengemudi sudah membuat 2 utang, 3 pengeluaran, dan 1 insiden lewat aplikasi. Versi lama akan menyetel ulang uang sungguhan ke angka basi.

Dijalankan aditif: **113 users, 122 iuran, 2 insiden dibuat**; 15 users, 6 iuran, 13 utang, 15 pengeluaran, 1 insiden dibiarkan; vault tak tersentuh.

### c. Pembayaran di aplikasi hanyalah pengujian
Pengguna memastikan pada 12 Oktober bahwa **tidak ada** pembayaran di aplikasi yang diverifikasi. Audit menemukan:
- **12 bulan iuran, Rp1.200.000** tercatat lunas (5 via QRIS 10/10, 7 "Tunai Kasir" 11/10).
- **DEBT-NICHOLAS** `paid` 0 → 300.000.
- Selisih vault BSI **+Rp400.000**, kas kecil **+Rp150.000**.

Awalnya skrip perbaikan memperlakukan Rp300.000 Nicholas sebagai pembayaran nyata yang harus dipertahankan. **Itu salah** — sudah dikoreksi, kini semua pembayaran aplikasi dikembalikan.

### d. Sepuluh kartu utang rusak di Firestore langsung
Sebab: parser lama memberi kartu yang tak cocok NIK **acak** (`1700${Math.floor(1000 + Math.random()*9000)}`). `a77bde6` memperbaikinya di `seedData.json`, tetapi tak pernah di-push ke database — dan seeder aditif melewatinya.

- 8 kartu menunjuk ke NIK tanpa dokumen anggota → tak terlihat di `MemberTalangan`.
- 4 kartu kehilangan riwayat pembayaran.
- `DEBT-657796`, `DEBT-918342` hanya ada dari pengujian.

**Data masih dalam keadaan rusak — sengaja.** Perbaikan belum ditulis.

### e. Bug kedua di skrip perbaikan itu sendiri
Dry run mengusulkan `DEBT-NICHOLAS status="Sedang Mengangsur"->"Belum Mengangsur"` — akan menghapus catatan pembayaran. Penyebab: loop penyalinan menyalin `status` dari seed, lalu langkah turunan berikutnya hanya menimpa jika **berbeda dari live**, sehingga tak bisa membatalkan nilai yang baru saja ditulis.

`status` kini tidak pernah disalin — hanya diturunkan dari `paid`/`amount`.

### f. `import` hijau tidak menangkap salah bentuk data
Insiden menyimpan `body`/`driver`/`nik`/`damage`/`location`, **bukan** `title`/`description`/`reporterName`. Ketidakcocokan itu membuat layar kosong; diperbaiki di `8b84148`. Pemeriksaan impor tetap lulus.

---

## 3. KEADAAN DATABASE LANGSUNG (BELUM DIBERSIHKAN)

| Koleksi | Jumlah | Kondisi |
|---|---:|---|
| `users` | 128 | ✅ Sesuai seed |
| `iuran` | 128 | ⚠️ 12 bulan lunas dari pengujian (Rp1.200.000) |
| `debts` | 15 | ❌ 10 kartu rusak + 2 kartu uji |
| `expenses` | 18 | ✅ 15 seed + 3 dibuat aplikasi |
| `incidents` | 3 | ✅ 2 seed + 1 dibuat aplikasi |
| `system/vault` | 1 | ⚠️ BSI Rp12.850.000 · Kas Kecil Rp281.500 (sisa uji) |

Audit hanya-baca: `node src/data/auditTestPayments.mjs`  
Rencana perbaikan, uji kering: `node src/data/repairDebtCards.mjs --dry-run`

---

## 4. TUJUAN BERJALAN (RUNNING GOALS & NEXT STEPS)

```
[PROGRESS TRACKER]
[X] 1. Prototipe Web Lengkap & Kompatibel Vercel
[X] 2. Parser Data Excel/PDF Dokumen Referensi
[X] 3. Setup React Native Expo Mobile App
[X] 4. Koneksi & Seeding Firebase Firestore Asli
[X] 5. Fitur Login & Akun Pengujian 1-Click
[X] 6. Admin CRUD penuh (A1–A6) tertulis ke Firestore
[X] 7. Tiga celah MVP: foto, struk BSI, ekspor CSV
[X] 8. Manajemen anggota + PIN nyata
[ ] 9. Deploy firestore.rules ke produksi
[ ] 10. Bersihkan data uji (10 kartu utang, 12 bulan iuran, vault)
[ ] 11. Status VERIFIKASI pembayaran (pending -> cocok BSI -> lunas)
[ ] 12. Tentukan nasib 2 kartu uji & 3 NIK utang tak terpecahkan
[ ] 13. Build APK terbaru (terakhir: a48d52c)
[ ] 14. Firebase Auth (OTP SMS / password hash)
[ ] 15. Firebase Storage untuk foto resolusi penuh
[ ] 16. Cetak kartu utang ke PDF (expo-print)
```

### Goal 1: Deploy aturan Firestore
```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```
CLI belum terpasang di mesin ini. Catatan: aturan ini menjamin **integritas, bukan otorisasi** — tanpa Firebase Auth, `request.auth` selalu null.

### Goal 2: Perbaikan data (pilih ini atau Goal 3 lebih dulu)
10 kartu rusak + 12 bulan iuran uji + selisih vault. Skrip sudah diperbaiki dan lolos uji kering.

### Goal 3: Status verifikasi pembayaran
Akar masalah kontaminasi. `payIuran`, `markIuranPaidCash`, `repayDebt` kini mengonfirmasi seketika. Perlu alur *pending* → verifikasi kasir terhadap mutasi BSI. **Disarankan dikerjakan bersamaan atau sebelum Goal 2**, agar data bersih tidak terkontaminasi ulang oleh mekanisme yang sama.

### Goal 4: Build APK Android
```bash
cd /home/oracle/nibih/paguyuban/mobile && eas build --platform android --profile preview
```
Tidak ada APK baru sejak `a48d52c`. Pengguna menjalankan build sendiri.

### Goal 5: Ekspor PDF Kartu Utang
Kop surat resmi `DATA HUTANG ANGGOTA.xlsx` dengan tanda tangan pemohon & bendahara. Perlu `expo-print`.

---

## 5. CATATAN LINGKUNGAN

- **Variabel EAS `preview` asing:** memuat config proyek Firebase **lain** (`satva-b293d`, sender `826459105974`), **kunci API Gemini**, dan ID klien Google OAuth. Inert bagi aplikasi ini (config Firebase di-hardcode, `process.env` tak pernah dibaca), tetapi itu kredensial hidup di proyek yang salah — **hapus dari dasbor EAS**.
- **Aman untuk sesi:** `npm --prefix mobile run check:imports`. Jangan jalankan `eas build` atau `expo export` — keduanya menggantung sesi.
- **Akun uji:** Nicholas `17002197`/`2197`, A Sutriadi `17001137`/`1137`, M. Sapli `17001504`/`1504`, Muhamad Hasan `17001109`/`1109`, Afrizal `17001589`/`1589`. PIN default = 4 digit terakhir NIK.
