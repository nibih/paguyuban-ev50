# 🎯 MVP SCOPE VS POST-MVP ROADMAP (MVP_SCOPING.md)

**Aplikasi:** PAGUYUBAN EV50 CAWANG  
**Tujuan Dokumen:** Memisahkan secara tegas mana fitur yang **WAJIB masuk ke rilis MVP (Minimum Viable Product)** agar aplikasi bisa langsung dipakai pramudi & pengurus di lapangan, dan mana fitur yang **BISA DITUNDA KE TAHAP BERIKUTNYA (Post-MVP / Fase 2)**.

---

## 1. PRINSIP PENENTUAN MVP

Aplikasi ini ditujukan untuk memecahkan masalah operasional fisik di Depo Cawang:
1. **Transparansi Iuran:** Pramudi tahu apakah iuran bulanannya sudah tercatat lunas atau masih menunggak.
2. **Kejelasan Utang/Talangan:** Pramudi (seperti Nicholas, M. Sapli, M. Hasan) bisa melihat sisa hutang dan histori angsuran tanpa perlu mencari lembaran kertas/Excel.
3. **Kecepatan Lapor Bodi:** Pramudi bisa segera melapor saat baret di jalur agar mekanik KLI/Uday dan korlap segera menangani.
4. **Akuntabilitas Kas:** Pengurus kasir (Afrizal & Kholiq) tidak dicurigai karena arus kas terbuka untuk semua anggota.

---

## 2. MATRIKS KLASIFIKASI FITUR: MVP VS POST-MVP

| Modul Operasional | Fitur Spesifik | Status Klasifikasi | Alasan Keputusan |
|---|---|:---:|---|
| **Autentikasi** | Login NIK & 4-Digit PIN | 🟢 **MVP** | Cepat, mudah bagi supir bus di lapangan, tidak butuh biaya SMS/OTP. |
| | 1-Click Test Accounts | 🟢 **MVP** | Mempermudah demo & verifikasi langsung bagi pengurus/penguji. |
| | OTP WhatsApp / SMS | 🔴 **Post-MVP** | Membutuhkan biaya gateway SMS/WA API (Twilio/Wablas) & registrasi rumit. |
| | Biometric Fingerprint/FaceID | 🔴 **Post-MVP** | Fitur kenyamanan (*nice-to-have*), bukan kebutuhan mendesak. |
| **Iuran Bulanan** | Status Iuran Mei–September (Lunas/Belum) | 🟢 **MVP** | Kebutuhan paling vital bagi 126 pramudi. |
| | Info Transfer Rekening Resmi BSI 720510945 | 🟢 **MVP** | 90% supir saat ini mentransfer langsung ke rekening paguyuban BSI. |
| | Upload Bukti Transfer Bank | 🟢 **MVP** | Bukti sah bagi bendahara untuk memverifikasi uang masuk. |
| | Midtrans Payment Gateway Production | 🔴 **Post-MVP** | Butuh legalitas badan usaha/NPWP paguyuban dan biaya MDR per transaksi. Simulasi sudah cukup untuk MVP. |
| **Dana Talang** | Kartu Utang Digital (Uraian Laka, Tenor, Sisa) | 🟢 **MVP** | Menggantikan sheet Excel `DATA HUTANG ANGGOTA.xlsx` secara total. |
| | Form Setoran Cicilan (Pengurangan Saldo) | 🟢 **MVP** | Memperbarui saldo sisa hutang secara instan. |
| | Tanda Tangan Digital Pemohon di Layar | 🔴 **Post-MVP** | Cukup konfirmasi verbal & log admin saat pencairan awal. |
| | Cetak PDF Surat Utang Fisik (expo-print) | 🟡 **MVP Lite / Post-MVP** | Di MVP cukup screenshot/tampilan kartu di aplikasi. PDF formal di Fase 2. |
| **Lapor Perbaikan** | Pilih Nomor Body Bus (237–285) & Lokasi Insiden | 🟢 **MVP** | Data wajib untuk identifikasi armada DAMRI. |
| | Centang Kerusakan (Baret, Gompal, Spion) | 🟢 **MVP** | Mempermudah supir tanpa perlu mengetik panjang. |
| | Toggle Suket Polisi & Pendampingan Mekanik | 🟢 **MVP** | Menentukan apakah kas paguyuban perlu keluar untuk suket/konsumsi. |
| | Ambil Foto Kerusakan Bodi dari Kamera | 🟢 **MVP** | Bukti fisik kerusakan wajib ada sebelum mekanik bekerja. |
| | Pelacakan Lokasi GPS Otomatis | 🔴 **Post-MVP** | Cukup input teks titik halte/koridor secara manual. |
| **Kas Terbuka** | Buku Pengeluaran 15 Pos Transparan | 🟢 **MVP** | Menghilangkan kecurigaan pemotongan kas paguyuban. |
| | Filter Pencarian (Bansos, Cat, Suket, dll) | 🟢 **MVP** | Memudahkan pencarian riwayat belanja depo. |
| | OCR Scan Struk Belanja Otomatis | 🔴 **Post-MVP** | Input nominal & foto struk manual jauh lebih andal di awal. |
| **Admin View** | Matriks Cepat 126 Anggota (Tandai Lunas Tunai) | 🟢 **MVP** | Kasir Afrizal/Kholiq bisa mencentang saat supir setor tunai di depo. |
| | Input Kas Keluar Baru | 🟢 **MVP** | Mencatat belanja cat, konsumsi mekanik, atau santunan bansos baru. |
| | Export Excel / CSV | 🟢 **MVP** | Penting untuk pelaporan rapat bulanan DAMRI. |
| | Drag-and-drop Kanban Board Interaktif | 🔴 **Post-MVP** | Di mobile cukup picker dropdown status (*Baru* -> *Proses* -> *Selesai*). |

---

## 3. SCOPE RILIS MVP (FOKUS EKSEKUSI SEKARANG)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FITUR RILIS MVP (FOKUS INTI)                    │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Login NIK & PIN Pramudi + 1-Click Demo Accounts                    │
│ 2. Tab Beranda: Ringkasan iuran, kas berjalan, & kartu utang aktif     │
│ 3. Tab Iuran: Status per bulan + Instruksi Rekening BSI 720510945      │
│ 4. Tab Talangan: Kartu utang individu (Nicholas, Sapli, Hasan)        │
│ 5. Tab Lapor Perbaikan: Form armada, checklist bodi, & foto kamera     │
│ 6. Tab Kas Terbuka: Transparansi 15 pengeluaran September             │
│ 7. Mode Admin: Kontrol kas kecil tunai & centang lunas kasir          │
│ 8. Real-time Firebase Sync: Data tersimpan aman di Cloud Firestore    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. DAFTAR FITUR YANG DITUNDA KE POST-MVP (FASE 2)

Fitur-fitur di bawah ini **TIDAK AKAN** menghambat penggunaan aplikasi di lapangan dan dijadwalkan untuk rilis berikutnya:

1. **Midtrans Production API Live:** Menunggu kelengkapan dokumen rekening bank formal paguyuban untuk registrasi merchant Midtrans.
2. **Integrasi WhatsApp Bot / OTP:** Pengiriman notifikasi tagihan otomatis via WhatsApp API.
3. **Cetak Surat Perjanjian Utang ke File PDF:** Pembuatan kop surat resmi PDF bertanda tangan digital.
4. **GPS Tracking Kerusakan Jalur:** Deteksi titik koordinat insiden secara otomatis.
5. **Multi-Depo / Multi-Koridor:** Ekspansi sistem ke rute selain SBU Transbusway Area Cawang EV50.
