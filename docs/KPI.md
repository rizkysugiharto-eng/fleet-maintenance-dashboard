# Definisi KPI

Semua rumus ada di [`src/lib/kpi.js`](../src/lib/kpi.js) dan diuji di
[`src/lib/kpi.test.js`](../src/lib/kpi.test.js).

## Istilah dasar

| Istilah | Arti |
|---|---|
| **Total hours** | Jumlah unit × jam kalender dalam periode (24 jam × jumlah hari) |
| **Downtime** | Jam unit tidak siap karena maintenance (PM, CM, BM, BAC). WO yang tumpang tindih pada unit yang sama dihitung sekali. WO yang belum selesai dihitung sampai akhir periode. |
| **Jam operasi** | Selisih hour meter (HM) akhir dan awal periode |
| **Breakdown (B/D)** | WO tak terjadwal: **BM** (rusak mendadak) + **BAC** (rusak karena insiden) |
| **Terjadwal** | **PM** (servis berkala) + **CM** (perbaikan terencana) |

## Rumus

| KPI | Rumus | Arti untuk orang awam |
|---|---|---|
| **PA** — Physical Availability | (total hours − downtime) ÷ total hours | % waktu unit siap pakai |
| **MA** — Mechanical Availability | jam operasi ÷ (jam operasi + downtime) | Jam kerja dibanding jam kerja + jam perbaikan |
| **UA** — Use of Availability | jam operasi ÷ (total hours − downtime) | % waktu siap pakai yang benar-benar dipakai bekerja |
| **MTBF** | jam operasi ÷ jumlah breakdown | Rata-rata jam kerja sebelum unit rusak |
| **MTTR** | total jam perbaikan breakdown selesai ÷ jumlahnya | Rata-rata lama perbaikan saat rusak |
| **PM schedule compliance** | PM dikerjakan dalam ±10% interval HM ÷ total PM | Disiplin mengerjakan PM tepat waktu |
| **PM completion rate** | WO PM selesai ÷ total WO PM | Berapa banyak PM yang sudah dikerjakan |
| **Repeat breakdown** | B/D pada komponen yang sama ≤ 30 hari dari B/D sebelumnya | Perbaikan yang tidak tuntas |

### Rincian waktu perbaikan (MTTR dipecah)

Setiap breakdown yang sudah selesai dibagi menjadi tiga bagian:

| Bagian | Sumber | Arti |
|---|---|---|
| **Respon mekanik** | kolom `responseHours` | Unit rusak → mekanik mulai menangani |
| **Menunggu** | kolom `delayHours` + alasan delay | Tertunda karena part, tools, cuaca, investigasi insiden |
| **Pengerjaan** | durasi − respon − menunggu | Jam kerja perbaikan yang sebenarnya |

Bagian terbesar menunjukkan di mana MTTR bisa diturunkan: respon tinggi → tambah mekanik
standby (terutama shift malam); menunggu tinggi → stok part kritis; pengerjaan tinggi →
pelatihan & prosedur. WO yang tidak mencatat waktu respon (data Site A) tidak ikut dihitung.

Target bawaan (bisa diubah di `TARGETS`): PA ≥ 85%, MA ≥ 85%, UA ≥ 75%, MTBF ≥ 100 jam, MTTR ≤ 12 jam.

## Perbedaan dengan rumus di Excel/Power BI lama

Dataset Excel (Site A) memakai rumus latihan yang sedikit berbeda:

| | Excel (Panduan) | Aplikasi ini | Kenapa diubah |
|---|---|---|---|
| PA | (Jam operasi − downtime) ÷ jam operasi | (total hours − downtime) ÷ total hours | PA standar dihitung terhadap waktu kalender. Rumus Excel lebih mirip MA. |
| MTTR | total downtime **semua** WO ÷ jumlah BM | jam perbaikan **breakdown** ÷ jumlah breakdown | Downtime PM/CM bukan waktu perbaikan kerusakan, jadi tidak ikut MTTR. |
| Jam operasi | kolom `Jam_Operasi` per WO | selisih hour meter harian | Jam operasi unit tidak terikat ke WO. HM harian Site A disimulasikan dari `HM_Saat_Ini` dan `EWH` di sheet PM_Master. |

Karena itu angka PA/MTTR Site A di aplikasi berbeda dari Power BI. Ini disengaja
dan bisa menjadi bahan pembahasan saat interview.

Contoh untuk Site A, periode 2025:

| | Power BI | Aplikasi ini |
|---|---|---|
| PA | 61,5% | 93,9% |
| MTTR | 15,6 jam | 15,6 jam (di atas target ≤ 12 jam) |

Dataset dummy Power BI sengaja dibuat sebagai armada dengan reliability rendah supaya ada
masalah yang bisa dianalisis akar penyebabnya (Breakdown Maintenance menyumbang 41,6% downtime,
BD-001 punya MTBF terendah). Di aplikasi ini PA-nya naik karena dibagi jam kalender, tetapi
masalahnya tetap terlihat: MTTR di atas target, PM terlambat, dan backlog berumur > 90 hari.
