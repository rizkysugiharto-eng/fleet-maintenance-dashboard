# Audit UI — redesign tema terang

Tanggal: 13 Oktober 2026 · Metode: skill **dataviz** (aturan warna, grafik, kartu KPI,
layout dashboard + validator palet), uji kontras WCAG, dan pemeriksaan visual setiap tab
di browser (desktop 1440 px, HP 390 px, tema terang & gelap).

## 1. Arah desain

| Sebelum | Sesudah | Alasan |
|---|---|---|
| Tema gelap hijau-neon, mirip contoh referensi | **Tema terang** sebagai bawaan, aksen **kuning alat berat** (sama dengan portfolio) | Desain sendiri, lebih ringan dibaca, konsisten dengan identitas portfolio |
| Menu dikelompokkan per jenis halaman | Menu mengikuti **alur kerja**: ① Catat data → ② Pantau pekerjaan → ③ Analisis & rencana | Orang awam langsung paham urutan proses |
| Langsung masuk dashboard padat | **Beranda** baru: 4 langkah alur kerja + "Perlu perhatian" + kondisi 30 hari | Titik awal yang menjelaskan cara kerja aplikasi |
| Jam live, angka monospace, garis warna di tepi kartu | Tanggal data ("Data s.d. …"), angka sans-serif, kartu polos | Lebih sederhana; angka besar memakai huruf proporsional |
| "Unit 360" | "Detail unit" | Istilah lebih umum |

## 2. Warna — hasil validator (`dataviz/scripts/validate_palette.js`)

| Palet | Tema | Hasil |
|---|---|---|
| Seri grafik: biru `#2a78d6` + oranye `#eb6834` | Terang | ✅ Semua cek lulus (CVD ΔE 24,7 · normal ΔE 33,6 · kontras ≥ 3:1) |
| Seri grafik: biru `#3987e5` + oranye `#d95926` | Gelap | ✅ Semua cek lulus (CVD ΔE 26,8 · normal ΔE 31,8) |
| Heatmap (gradasi satu warna biru, 5 tingkat) | Terang | ❌ awalnya gagal — tingkat pertama `#b7d3f6` hanya 1,54:1 → **diganti** mulai `#86b6ef` → ✅ lulus |
| Heatmap | Gelap | ✅ lulus |

| Rincian waktu perbaikan: biru + oranye + hijau-toska `#1baf7a` | Terang | ✅ lulus, ⚠️ toska 2,82:1 di atas putih → diimbangi legenda, tampilan tabel, dan celah 2 px antar segmen |
| Rincian waktu perbaikan: `#3987e5` + `#d95926` + `#199e70` | Gelap | ✅ Semua cek lulus |

**Merah = masalah terbesar.** Merah memakai warna status *critical* (bukan warna seri),
sehingga artinya selalu "buruk". Teknik ini disebut *emphasis*: satu batang terburuk
merah, sisanya biru. Agar tidak bergantung pada warna saja, setiap grafik juga memberi
catatan teks di bawahnya ("Tertinggi: Engine · 4.725 jam").

| Tempat | Yang diberi merah |
|---|---|
| Dashboard · Analisis delay | Alasan delay dengan jam terbanyak |
| Dashboard · Downtime per jenis WO | Jenis WO dengan downtime tertinggi |
| Dashboard · PA terendah per unit | Unit dengan PA terendah |
| Dashboard · Pareto komponen | Komponen penyebab downtime tertinggi |
| Dashboard · Heatmap | Sel (tipe unit × minggu) dengan downtime tertinggi diberi bingkai merah + keterangan |
| Dashboard · Ringkasan per tipe unit | Label "Downtime tertinggi" di baris teratas |
| Backlog · Umur backlog | Kelompok umur dengan WO terbanyak |
| Beranda · Perlu perhatian | Komponen penyebab downtime tertinggi 30 hari |

## 3. Kontras teks (WCAG AA, minimal 4,5:1)

Semua token teks dicek terhadap latar putih, abu muda, dan permukaan gelap:

| Token | Terang | Gelap |
|---|---|---|
| Teks utama | 17,5 : 1 | 15,2 : 1 |
| Teks sekunder | 7,8 : 1 | 9,7 : 1 |
| Teks redup (muted) | 5,2 : 1 | 6,1 : 1 |
| Link | 6,1 : 1 | 7,9 : 1 |
| Status baik / waspada / serius / kritis | 6,7 / 6,3 / 6,1 / 6,5 : 1 | 8,0 / 10,4 / 8,0 / 6,7 : 1 |

Label status selalu **ikon + teks** (✓ / ! / ✕), tidak hanya warna. Kolom PA di tabel
ringkasan sebelumnya hanya berwarna hijau/merah → sekarang diberi ✓ / ✕.

## 4. Pemeriksaan per tab

| Tab | Temuan | Perbaikan |
|---|---|---|
| **Beranda** (baru) | — | Alur 4 langkah dengan angka live, daftar "Perlu perhatian", KPI 30 hari vs target |
| **Input Work Order** | OK | Judul menunjukkan "Langkah 1 · Catat data" |
| **Hour Meter** | OK | Penjelasan fungsi HM untuk MA/UA/MTBF |
| **Import Data** | OK | — |
| **Laporan Work Order** | Tabel 10 kolom perlu digulir ke samping di layar < 1500 px | Dibiarkan: tabel bisa digulir di dalam kartu, halaman tidak melebar |
| **Backlog** | OK | Kelompok umur terbanyak diberi merah |
| **Kondisi Unit** | Garis warna di tepi kartu (gaya referensi) | Diganti label status di pojok kartu |
| **Dashboard KPI** | Label "tertinggi" terpotong di grafik sempit (terutama di HP) | Label dipindah ke catatan di bawah grafik; margin kanan menyesuaikan panjang label |
| | Nilai KPI tidak sejajar karena deskripsi 2–3 baris | Nama KPI dipersingkat (PA, MA, UA), deskripsi diberi tinggi tetap 3 baris |
| | Grafik tren 2 seri hanya punya legenda | Ditambah label nama seri di ujung garis |
| | Angka monospace di distribusi downtime & status WO | Diganti huruf biasa + angka tabular |
| **Perencanaan PM** | OK | — |
| **Database & Login** | Status "Menghubungkan…" bisa menggantung bila Supabase tak menjawab | Batas waktu 15 detik, lalu otomatis ke mode demo dengan pesan |
| **Master Unit** | Form tambah unit melebar 118 px keluar layar | Isian form dibuat lebar 100% dan boleh menyusut |
| Semua tab | — | Tidak ada error konsol; tidak ada konten melebar di desktop (1440 px) maupun HP (390 px), tema terang & gelap |

## 5. Yang sengaja tidak diubah

- Grafik tidak memakai dua sumbu Y (aturan *one axis*); analisis delay menampilkan jam dan frekuensi dalam satu label.
- Setiap grafik tetap punya tombol **Tabel** sebagai alternatif membaca angka tanpa grafik.
- Heatmap memakai gradasi satu warna (biru) karena menunjukkan *besaran*; merah hanya untuk satu sel tertinggi.
