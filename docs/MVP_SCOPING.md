# 🎯 MVP SCOPE VS POST-MVP ROADMAP (MVP_SCOPING.md)

**Aplikasi:** PAGUYUBAN EV50 CAWANG  
**Tujuan Dokumen:** Memisahkan secara tegas mana fitur yang **WAJIB masuk ke rilis MVP (Minimum Viable Product)** agar aplikasi bisa langsung dipakai pramudi & pengurus di lapangan, dan mana fitur yang **BISA DITUNDA KE TAHAP BERIKUTNYA (Post-MVP / Fase 2)**.

**Status per 12 Oktober 2026:** seluruh item MVP di bawah sudah **terpasang di aplikasi mobile**. Yang tersisa bukan lagi soal fitur, melainkan **kualitas data dan integritas transaksi** — lihat bagian 5.

---

## 1. PRINSIP PENENTUAN MVP

Aplikasi ini ditujukan untuk memecahkan masalah operasional fisik di Depo Cawang:
1. **Transparansi Iuran:** Pramudi tahu apakah iuran bulanannya sudah tercatat lunas atau masih menunggak.
2. **Kejelasan Utang/Talangan:** Pramudi (seperti Nicholas, M. Sapli, M. Hasan) bisa melihat sisa hutang dan histori angsuran tanpa mencari lembaran kertas/Excel.
3. **Kecepatan Lapor Bodi:** Pramudi bisa segera melapor saat baret di jalur agar mekanik KLI/Uday dan korlap segera menangani.
4. **Akuntabilitas Kas:** Pengurus kasir (Afrizal & Kholiq) tidak dicurigai karena arus kas terbuka untuk semua anggota.

**Prinsip kelima yang muncul belakangan — dan paling menentukan:** *catatan keuangan yang tercatat otomatis tanpa verifikasi sama buruknya dengan tidak ada catatan.* Setiap pembayaran harus bisa ditelusuri ke uang yang benar-benar masuk.

---

## 2. MATRIKS KLASIFIKASI FITUR: MVP VS POST-MVP

| Modul Operasional | Fitur Spesifik | Status Klasifikasi | Status Implementasi | Alasan Keputusan |
|---|---|:---:|:---:|---|
| **Autentikasi** | Login NIK & 4-Digit PIN | 🟢 **MVP** | ✅ Selesai | Cepat, mudah bagi supir di lapangan, tanpa biaya SMS/OTP. |
| | 1-Click Test Accounts | 🟢 **MVP** | ✅ Selesai | Mempermudah demo & verifikasi langsung. |
| | Password Hash / OTP SMS | 🔴 **Post-MVP** | ❌ Belum | Butuh gateway SMS/WA API & registrasi rumit. |
| | Biometric Fingerprint/FaceID | 🔴 **Post-MVP** | ❌ Belum | *Nice-to-have*, bukan kebutuhan mendesak. |
| **Iuran Bulanan** | Status Iuran Mei–September | 🟢 **MVP** | ✅ Selesai | Kebutuhan paling vital bagi 126 pramudi. |
| | Info Transfer Rekening BSI 720510945 | 🟢 **MVP** | ✅ Selesai | 90% supir mentransfer langsung ke rekening paguyuban. |
| | Upload Bukti Transfer Bank | 🟢 **MVP** | ✅ Selesai | **Wajib** untuk transfer manual (`8b84148`). |
| | Tandai Lunas Tunai oleh Kasir | 🟢 **MVP** | ✅ Selesai | `markIuranPaidCash`, transaksional ke kas kecil. |
| | **Verifikasi Sebelum Lunas** | 🟢 **MVP (gagal)** | ❌ **Celah** | Lihat bagian 5 — ini masalah MVP, bukan Fase 2. |
| | Midtrans Payment Gateway Production | 🔴 **Post-MVP** | ⚠️ Simulasi | Butuh NPWP paguyuban & biaya MDR. |
| **Dana Talang** | Kartu Utang Digital | 🟢 **MVP** | ✅ Selesai | Menggantikan `DATA HUTANG ANGGOTA.xlsx` sepenuhnya. |
| | Form Setoran Cicilan | 🟢 **MVP** | ✅ Selesai | `repayDebt` atomik atas kartu + vault. |
| | Tambah / Hapus Kartu oleh Admin | 🟢 **MVP** | ✅ Selesai | `addDebt` / `deleteDebt` di tab A4. |
| | Tanda Tangan Digital Pemohon | 🔴 **Post-MVP** | ❌ Belum | Cukup konfirmasi verbal & log admin. |
| | Cetak PDF Surat Utang Fisik | 🟡 **Post-MVP** | ❌ Belum | Cukup tampilan kartu di aplikasi untuk MVP. |
| **Lapor Perbaikan** | Pilih Nomor Body & Lokasi | 🟢 **MVP** | ✅ Selesai | Data wajib identifikasi armada DAMRI. |
| | Centang Kerusakan | 🟢 **MVP** | ✅ Selesai | Tanpa perlu mengetik panjang. |
| | Toggle Suket & Pendampingan Mekanik | 🟢 **MVP** | ✅ Selesai | Menentukan kas keluar untuk suket/konsumsi. |
| | Ambil Foto Kerusakan dari Kamera | 🟢 **MVP** | ✅ Selesai | Thumbnail base64 400px, maks 3 foto (`8b84148`). |
| | Pelacakan Lokasi GPS Otomatis | 🔴 **Post-MVP** | ❌ Belum | Input teks titik halte manual sudah cukup. |
| **Kas Terbuka** | Buku Pengeluaran 15 Pos Transparan | 🟢 **MVP** | ✅ Selesai | Menghilangkan kecurigaan pemotongan kas. |
| | Filter Pencarian Kategori | 🟢 **MVP** | ✅ **Diperbaiki** | Chip diturunkan dari data (`7a7cec5`); sebelumnya cocok 0 dari 15. |
| | OCR Scan Struk Otomatis | 🔴 **Post-MVP** | ❌ Belum | Input manual jauh lebih andal di awal. |
| **Admin View** | Matriks Cepat 126 Anggota | 🟢 **MVP** | ✅ Selesai | Kasir mencentang saat supir setor tunai (`5718a1b`). |
| | Input Kas Keluar Baru | 🟢 **MVP** | ✅ Selesai | `addExpense`. |
| | **Manajemen Anggota (A6)** | 🟢 **MVP** | ✅ Selesai | Cari, filter, tambah, edit, nonaktifkan (`a48d52c`). |
| | Export Excel / CSV | 🟢 **MVP** | ✅ Selesai | Laporan rapat bulanan DAMRI (`8b84148`). |
| | Drag-and-drop Kanban Interaktif | 🔴 **Post-MVP** | ❌ Belum | Cukup picker dropdown status di mobile. |
| **Keamanan Data** | Firestore Security Rules | 🟢 **MVP** | ⚠️ Ditulis, belum deploy | Integritas data — belum otorisasi (tanpa Auth). |

---

## 3. SCOPE RILIS MVP (STATUS EKSEKUSI)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    FITUR RILIS MVP — STATUS AKHIR                          │
├────────────────────────────────────────────────────────────────────────────┤
│ ✅ 1. Login NIK & PIN Pramudi + 1-Click Demo Accounts                      │
│ ✅ 2. Tab Beranda: Ringkasan iuran, kas, & kartu utang aktif               │
│ ✅ 3. Tab Iuran: Status per bulan + Instruksi Rekening BSI 720510945        │
│ ✅ 4. Tab Talangan: Kartu utang individu + setoran cicilan                 │
│ ✅ 5. Tab Lapor Perbaikan: Form armada, checklist bodi, & foto kamera      │
│ ✅ 6. Tab Kas Terbuka: Transparansi 15 pengeluaran + filter kategori       │
│ ✅ 7. Mode Admin A1–A6: KPI, iuran, kas, piutang, logbook, anggota         │
│ ✅ 8. Real-time Firebase Sync: 7 mutasi transaksional ke Firestore         │
│ ✅ 9. Ekspor CSV laporan DAMRI                                             │
│ ✅ 10. Foto kerusakan & bukti transfer BSI                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. DAFTAR FITUR YANG DITUNDA KE POST-MVP (FASE 2)

Tidak menghambat penggunaan aplikasi di lapangan:

1. **Midtrans Production API Live:** menunggu dokumen rekening bank formal paguyuban untuk registrasi merchant.
2. **Integrasi WhatsApp Bot / OTP:** notifikasi tagihan otomatis via WhatsApp API.
3. **Cetak Surat Perjanjian Utang ke PDF:** kop surat resmi bertanda tangan (`expo-print`).
4. **GPS Tracking Kerusakan Jalur:** deteksi koordinat insiden otomatis.
5. **Multi-Depo / Multi-Koridor:** ekspansi ke rute selain DAMRI SBU Transbusway Cawang EV 50.
6. **Firebase Storage untuk foto resolusi penuh:** saat ini thumbnail base64 di dokumen karena Storage belum diaktifkan — solusi sementara, dibatasi 1 MiB per dokumen Firestore.

---

## 5. MENGAPA MVP BELUM BISA DINYATAKAN SELESAI

Seluruh fitur terpasang, tetapi **data yang dihasilkannya belum bisa dipercaya**.

### Masalah 1: Pembayaran dikonfirmasi tanpa verifikasi
`payIuran`, `markIuranPaidCash`, dan `repayDebt` menulis status `lunas` dan menggeser `system/vault` **seketika saat tombol ditekan**, tanpa tahap tertunda.

Konsekuensi nyata: **semua pembayaran yang pernah dilakukan di aplikasi hanya pengujian, dan tidak ada satu pun yang diverifikasi ke bank.** Pengguna mengonfirmasi hal ini pada 12 Oktober.

Ini bukan Post-MVP — tanpa verifikasi, poin keempat prinsip MVP (*Akuntabilitas Kas*) gagal total. Angka di aplikasi bisa berbeda dari saldo BSI tanpa seorang pun menyadarinya.

### Masalah 2: Data yang harus dibersihkan
- **12 bulan iuran, Rp1.200.000**, tercatat lunas dari pengujian (5 via QRIS 10/10, 7 "Tunai Kasir" 11/10).
- **10 kartu utang rusak** — 8 menunjuk ke NIK tanpa dokumen anggota sehingga tidak muncul di layar pramudi pemiliknya; 4 kehilangan riwayat pembayaran. Sebab: bug parser lama memberi kartu tak cocok sebuah NIK acak; sudah diperbaiki di repo lewat `a77bde6` tetapi tak pernah di-push ke database.
- **Selisih kas:** BSI +Rp400.000, kas kecil +Rp150.000 — sisa uji coba.
- **2 kartu uji** (`DEBT-657796`, `DEBT-918342`) tidak ada di data referensi.
- **3 NIK utang tak terpecahkan:** `DEBT-Afrizal_p` sudah tertaut ke `17001589` (Ketua, terverifikasi dari rantai bukti); `DEBT-AGUS_TRIONO` dan `DEBT-SHANDY` **tidak ada di 126 nama roster** dan tetap `nik: null` — perlu pengurus yang mengenalinya.

### Urutan yang disarankan
1. **Perbaiki desain verifikasi** terlebih dahulu, agar mekanisme lama tidak langsung mengkontaminasi data baru.
2. **Bersihkan data** dengan skrip yang sudah lolos uji kering (`repairDebtCards.mjs`, `auditTestPayments.mjs`).
3. **Deploy `firestore.rules`** untuk menegakkan batas `paid ≤ amount` dan identitas bank yang tak bisa diubah.
4. Baru setelah itu rilis MVP ke pramudi.

---

## 6. CATATAN KEAMANAN TANPA FIREBASE AUTH

Aplikasi tidak memakai Firebase Auth, sehingga setiap permintaan datang dengan `request.auth == null`. Aturan `if request.auth != null` akan mengunci keluar aplikasi sekaligus seeder.

Yang **bisa** dijaga tanpa identitas, dan memang dijaga di `firestore.rules`:
- bentuk dan tipe tiap dokumen,
- identitas bank pada vault tidak dapat diubah (tak ada yang bisa mengalihkan transfer paguyuban ke rekening lain),
- `paid ≤ amount` pada kartu utang (bisa dilunasi, tidak bisa tercatat lebih bayar),
- setiap dokumen membawa kuncinya sendiri,
- anggota tidak pernah dihapus, hanya dinonaktifkan.

Yang **tidak bisa** dijaga: *siapa* yang menulis. Aktifkan Firebase Auth bila otorisasi berbasis identik diperlukan.
