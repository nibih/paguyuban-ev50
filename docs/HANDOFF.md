# 🤝 HANDOFF & RUNNING GOALS (HANDOFF.md)

Dokumen ini mencatat riwayat perubahan terakhir (*changelog*), status saat ini, dan daftar tujuan berjalan (*running goals*) yang siap dilanjutkan oleh developer atau agen AI berikutnya.

---

## 1. REKAP PERUBAHAN TERAKHIR (LAST CHANGES LOG)

### Sesi Terakhir:
1. **Initial Prototype (Web):**
   - Membuat aplikasi web React + Vite + Tailwind CSS dengan 5 layar Member (M1-M5) dan 5 layar Admin (A1-A5).
   - Mengimplementasikan simulasi Midtrans Snap QRIS & Virtual Account dengan tombol trigger webhook instan.
   - Mengubah penamaan tombol tab dari **"Lapor Bodi"** menjadi **"Lapor Perbaikan"** sesuai instruksi pengguna.
   - Menginisialisasi Git, menghubungkan remote GitHub `git@github.com:nibih/paguyuban-ev50.git`, dan menyiapkan file `vercel.json` untuk live deployment.

2. **Migrasi & Inisialisasi Mobile App (React Native Expo):**
   - Membuat folder terisolasi `/mobile` dengan stack Expo SDK 52, `@react-navigation/bottom-tabs`, dan `lucide-react-native`.
   - Mengonfigurasi `eas.json` untuk build target Android APK (`buildType: "apk"`).

3. **Ekstraksi Data dari Folder `reference/`:**
   - Menulis skrip parser `parseReference.js` yang membaca:
     - `laporan teknik 1.xlsx` -> 126 Pramudi Cawang.
     - `DATA HUTANG ANGGOTA.xlsx` -> 13 Kartu utang piutang anggota.
     - `05. Laporan Pengeluaran Bulann September.pdf` -> 15 Transaksi kas nyata.
   - Menghasilkan file data resmi [`seedData.json`](file:///home/oracle/nibih/paguyuban/mobile/src/data/seedData.json).

4. **Integrasi Firebase Cloud Firestore:**
   - Mengintegrasikan konfigurasi Firebase asli dari pengguna (`apiKey`, `authDomain: paguyuban-ev50.firebaseapp.com`, `projectId: paguyuban-ev50`).
   - Menyimpan kredensial ke `.env` dan `src/services/firebase.js`.
   - Membantu aktivasi database Firestore dan pembaruan Security Rules.
   - Menjalankan `seedFirestore.mjs`: Mengunggah koleksi `vault`, `users`, `debts`, dan `expenses` ke Cloud Firestore secara sukses.
   - Mengaitkan listener real-time `onSnapshot` di `AppContext.js` sehingga mutasi kas dan angsuran langsung terupdate tanpa reload.

5. **Penambahan Fitur Login & Autentikasi Pengemudi:**
   - Membuat [`LoginScreen.js`](file:///home/oracle/nibih/paguyuban/mobile/src/screens/LoginScreen.js) dengan input NIK dan PIN.
   - Menambahkan tombol **1-Click Test Accounts** untuk pengujian cepat.
   - Memasukkan akun **Nicholas (NIK 17002197)** dengan riwayat hutang laka mobil MAC Rp910.000 ke daftar prioritas teratas.
   - Menambahkan tombol Logout di Top Bar untuk kembali ke halaman login.

6. **Pengujian Build Akhir:**
   - Menjalankan ekspor bundler Metro `npx expo export --platform web` dengan status **Exit Code 0** (2045 modul terkompilasi bersih).
   - Mem-push seluruh pembaruan ke branch `main` GitHub repository.

---

## 2. TUJUAN BERJALAN (RUNNING GOALS & NEXT STEPS)

```
[PROGRESS TRACKER]
[X] 1. Prototipe Web Lengkap & Kompatibel Vercel
[X] 2. Parser Data Excel/PDF Dokumen Referensi
[X] 3. Setup React Native Expo Mobile App
[X] 4. Koneksi & Seeding Firebase Firestore Asli
[X] 5. Fitur Login & Akun Pengujian 1-Click
[X] 6. Verifikasi NIK 17002197 Nicholas
[ ] 7. Firebase Auth (Nomor HP / OTP SMS / Password Hash)
[ ] 8. Upload Foto Kerusakan Nyata ke Firebase Storage
[ ] 9. EAS Build Cloud untuk Menghasilkan File .APK Android Fisik
[ ] 10. Fitur Cetak Surat Perjanjian Utang ke PDF (expo-print)
```

### Prioritas Pekerjaan Berikutnya:

#### Goal 1: Build APK Android Fisik melalui Expo Application Services (EAS)
- Menjalankan `eas build -p android --profile preview` menggunakan akun Expo pengguna untuk mengompilasi file installer `.apk` yang bisa dipasang langsung di HP Android pramudi.
- File konfigurasi [`eas.json`](file:///home/oracle/nibih/paguyuban/mobile/eas.json) sudah disiapkan dengan opsi `buildType: "apk"`.

#### Goal 2: Firebase Storage untuk Unggah Foto Bukti
- Saat ini tombol upload foto di layar `MemberLaporPerbaikan` dan bukti transfer di `MemberIuran` baru menyimpan nama file lokal.
- Tujuan berikutnya: Memasang `expo-image-picker` dan mengunggah gambar bukti fisik langsung ke Firebase Storage bucket `paguyuban-ev50.firebasestorage.app`.

#### Goal 3: Ekspor PDF Digital Surat Kartu Utang (Kwitansi Sah)
- Di dokumen fisik `DATA HUTANG ANGGOTA.xlsx`, terdapat kop surat resmi:
  *"KARTU UTANG PIUTANG DAN DANA TALANG PAGUYUBAN EV 50"* dengan tanda tangan pemohon dan bendahara.
- Tujuan berikutnya: Memasang library `expo-print` dan `expo-sharing` untuk menghasilkan file PDF resmi yang bisa di-share langsung ke WhatsApp driver.
