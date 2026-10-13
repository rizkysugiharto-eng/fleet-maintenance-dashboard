# Fleet Maintenance Dashboard

Aplikasi web untuk memonitor **maintenance & reliability armada alat berat**.
User menginput work order dan sistem langsung menghitung KPI (PA, MTBF, MTTR,
backlog, biaya) lalu menampilkannya sebagai grafik dan tabel.

Project ini adalah pengembangan dari dashboard Power BI saya
(*Fleet Maintenance & Reliability Dashboard*) menjadi aplikasi web end-to-end.

![Tampilan dashboard](docs/screenshot-dashboard.png)

> Semua data di aplikasi ini **fiktif (dummy)** dan dibuat untuk keperluan
> portfolio, bukan data perusahaan mana pun.

## Fitur

| Halaman | Peran | Fungsi |
|---|---|---|
| **Dashboard** | User & Admin | KPI (PA, MTBF, MTTR, jumlah WO, backlog, biaya), PA per unit, tren PA bulanan, pareto komponen breakdown, biaya per unit, downtime per tipe maintenance. Filter periode, tipe unit, dan unit. Setiap grafik bisa dialihkan ke tampilan tabel. |
| **Input WO** | User & Admin | Form input work order dengan validasi (unit, komponen, waktu mulai/selesai, biaya). WO tanpa waktu selesai tercatat sebagai *Open* (backlog). |
| **Data WO** | User & Admin | Tabel seluruh work order: pencarian, filter, menutup WO yang masih Open, dan export CSV. |
| **Master unit** | Admin | Tambah unit baru dan reset data demo. |

Peran User/Admin saat ini disimulasikan lewat pilihan **Peran** di pojok kanan
atas. Login sungguhan direncanakan di tahap 2 (lihat [Roadmap](#roadmap)).

## Rumus KPI

Semua rumus ada di [`src/lib/kpi.js`](src/lib/kpi.js) dan diuji di
[`src/lib/kpi.test.js`](src/lib/kpi.test.js).

| KPI | Rumus |
|---|---|
| Calendar hours | jumlah unit × jam dalam periode |
| Downtime | total durasi WO (PM, BM, CM) dalam periode; WO yang tumpang tindih pada unit yang sama dihitung sekali; WO *Open* dihitung down sampai akhir periode |
| **Physical Availability (PA)** | (calendar hours − downtime) ÷ calendar hours × 100% |
| **MTBF** | jam operasi ÷ jumlah breakdown (BM) |
| **MTTR** | total jam perbaikan BM ÷ jumlah BM yang sudah selesai |
| Backlog | jumlah WO berstatus *Open* |

Penyederhanaan: jam operasi = calendar hours − downtime. Di lapangan, jam
operasi biasanya diambil dari hour meter (HM) unit dan memisahkan waktu standby.

## Cara menjalankan di komputer sendiri

1. Install [Node.js](https://nodejs.org/) versi 22 atau lebih baru.
2. Clone repo ini, lalu di terminal jalankan:

   ```bash
   npm install      # mengunduh library yang dibutuhkan
   npm run dev      # menjalankan aplikasi di http://localhost:5173
   ```

3. Perintah lain:

   ```bash
   npm test         # menjalankan tes rumus KPI
   npm run build    # membuat versi siap publikasi di folder dist/
   ```

## Struktur project

```
src/
├── main.jsx               Titik masuk aplikasi
├── App.jsx                Header, menu, dan daftar halaman (route)
├── styles.css             Semua tampilan (warna, layout, mode gelap)
├── pages/                 Satu file per halaman
│   ├── Dashboard.jsx
│   ├── InputWorkOrder.jsx
│   ├── WorkOrders.jsx
│   └── Units.jsx
├── components/            Potongan UI yang dipakai ulang
│   ├── KpiTile.jsx        Kotak angka KPI
│   ├── ChartCard.jsx      Kartu grafik + tombol "Lihat tabel"
│   └── Charts.jsx         Grafik batang & garis (Recharts)
├── context/
│   └── DataContext.jsx    Data bersama untuk semua halaman
├── lib/
│   ├── kpi.js             Rumus KPI  ← "otak" aplikasi
│   ├── kpi.test.js        Tes rumus KPI
│   ├── storage.js         Simpan/baca data (localStorage → nanti database)
│   ├── format.js          Format angka, rupiah, tanggal
│   └── useChartColors.js  Warna grafik mengikuti tema terang/gelap
└── data/
    └── dummy.js           Generator data dummy 8 unit selama 2025
```

### Padanan dengan Power BI

| Power BI | Di project ini |
|---|---|
| Sumber data | `src/data/dummy.js` + data input user (`src/lib/storage.js`) |
| Power Query (cleaning) | Validasi form di `src/pages/InputWorkOrder.jsx` |
| DAX measure | Fungsi di `src/lib/kpi.js` |
| Slicer | Filter di atas dashboard |
| Visual | Komponen di `src/components/Charts.jsx` |

## Teknologi

- [React](https://react.dev/): library untuk membangun tampilan (UI)
- [Vite](https://vite.dev/): alat untuk menjalankan & mem-build aplikasi
- [Recharts](https://recharts.org/): library grafik
- [React Router](https://reactrouter.com/): navigasi antar halaman
- [Vitest](https://vitest.dev/): pengujian rumus KPI
- GitHub Actions + GitHub Pages: tes & publikasi otomatis

## Publikasi ke GitHub Pages

Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
otomatis menjalankan tes, build, dan publikasi setiap ada push ke branch `main`.
Aktifkan sekali di **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Roadmap

- [x] **Tahap 1 — Frontend + data demo**: dashboard KPI, input & data WO,
      master unit, data tersimpan di browser (localStorage).
- [ ] **Tahap 2 — Backend & login**: database PostgreSQL via
      [Supabase](https://supabase.com/), login, dan hak akses per peran
      (User/Admin). Cukup mengganti `src/lib/storage.js`.
- [ ] **Tahap 3 — Fitur lanjutan**: import data dari Excel/CSV, kepatuhan
      jadwal PM (PM compliance), input hour meter, export laporan PDF.

## Lisensi

[MIT](LICENSE) © 2026 Rizky Bagus Eka Sugiharto
