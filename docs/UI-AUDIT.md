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

---

# Revisi 2 — desain "Papan Workshop" + perbaikan aksesibilitas

Tanggal: 28 Oktober 2026 · Metode: pemindaian **axe-core 4.10** (WCAG 2.0/2.1/2.2 A–AA +
best practice) di 12 halaman, tema terang & gelap, desktop 1366 px & HP 390 px, ditambah
uji keyboard sungguhan di browser (Playwright).

## Arah desain

Ciri visual diambil dari benda yang ada di lapangan, supaya aplikasi terasa dibuat oleh orang plant:

| Elemen | Asal idenya | Dipakai di |
|---|---|---|
| Plat nomor unit (huruf stensil di plat kuning) | Nomor lambung yang dicat di bodi alat | Kartu unit, daftar Briefing Pagi, Detail unit |
| Tag status gaya LOTO: **B/D** merah, **Perlu dicek** kuning, **RFU** hijau | Tag lock-out/tag-out di workshop | Kondisi Unit, Briefing Pagi, Detail unit |
| Meteran HM berbentuk odometer | Hour meter mekanis | Detail unit |
| Ilustrasi siluet per tipe unit (8 tipe) | — | Kartu unit, daftar, Detail unit |
| Garis hazard hitam-kuning (dipakai hemat) | Garis peringatan area tambang | Atas header, tepi kartu unit B/D, atas modal |
| Sidebar arang | Papan tulis workshop | Menu utama |

Huruf: **Barlow Semi Condensed** (judul & angka, sama dengan portfolio), **Inter** (teks),
**Big Shoulders Stencil** (khusus plat unit). Latar kertas `#f5f2ea`, teks arang `#1e2124`.

Ilustrasi sengaja per **tipe**, bukan per merek/model: di ukuran 36–64 px beda model tidak
terlihat, dan meniru bentuk produk asli berisiko menjiplak desain pabrikan. Merek & model tetap
ditulis sebagai teks.

## Beranda → Briefing Pagi

| Catatan alur | Penerapan |
|---|---|
| Baris unit bisa diklik | Setiap baris membuka Detail unit |
| Aksi cepat untuk unit B/D | Tombol kunci pas → ubah status WO atau tutup WO (unit RFU) tanpa pindah halaman |
| Penjelasan untuk orang awam | Kotak "Baru pertama kali? Lihat cara kerja aplikasi ini" (4 langkah, bisa dibuka-tutup) |
| Gambaran armada utuh | "19 dari 28 unit bisa beroperasi" + bar RFU / perlu dicek / B/D |

## Temuan aksesibilitas & hasil perbaikan

| # | Temuan (terbukti di uji) | Perbaikan |
|---|---|---|
| 1 | Fokus keluar dari modal; setelah Esc fokus hilang | Tab berputar di dalam modal, fokus kembali ke pembuka (`Modal.jsx`) |
| 2 | Ganti Periode di Detail unit → fokus melompat ke tombol Tutup | `onClose` disimpan di ref, effect hanya jalan sekali |
| 3 | Menu HP tertutup: 15 link tak terlihat tetap bisa di-Tab | `visibility: hidden` saat tertutup, Esc menutup menu, label tombol berubah |
| 4 | Heatmap: 371 tombol = 371 tab stop, sel 10×22 px | Satu tab stop + tombol panah (roving tabindex), sel minimal 24 px |
| 5 | Sparkline `aria-hidden` berisi elemen fokus | `accessibilityLayer={false}` |
| 6 | Tabel yang bisa digeser tidak bisa diakses keyboard | Komponen `TableWrap`: bisa difokus bila isinya memang perlu digeser |
| 7 | Judul tab browser sama di semua halaman | Judul halaman dipakai sebagai judul tab |
| 8 | Tidak ada "Lewati ke konten"; pindah halaman tidak memindahkan fokus | Skip link + fokus ke judul halaman baru |
| 9 | Submit form gagal → fokus tetap di tombol | Fokus pindah ke isian pertama yang salah |
| 10 | Tab Detail unit tanpa `tabpanel` & tombol panah | Pola tab WAI-ARIA lengkap |
| 11 | Label tombol menu tidak berubah | "Buka menu" / "Tutup menu" + `aria-controls` |
| 12 | Tombol Tabel/Grafik tidak memberi tahu status | `aria-pressed` |
| 13 | Header HP menempel 194 px (23% layar) | Header satu baris ±65 px; site, peran, tema pindah ke menu |
| 14 | Target sentuh 21–30 px di HP | Minimal 44 px di HP |

## Untuk pengunjung awam

| Risiko | Penanganan |
|---|---|
| Istilah lapangan (B/D, RFU, PA, MTBF, MTTR, HM) tidak dipahami recruiter non-teknis | Kotak sambutan berisi kamus istilah; tombol "?" di setiap KPI; keterangan saat kursor diarahkan ke tag status |
| Banyak warna merah dikira aplikasi error | Kotak sambutan menjelaskan bahwa data fiktif sengaja dibuat bermasalah; header menulis "Data contoh" |
| Kotak "cara kerja" mudah terlewat | Terbuka otomatis untuk pengunjung baru (kuning, menonjol); setelah ditutup, aplikasi mengingatnya |
| Legenda tag memakai istilah lapangan (RFU / Perlu dicek / B/D) | Tetap dipakai supaya terasa seperti papan kerja asli; artinya dijelaskan di kamus kotak sambutan dan muncul saat kursor diarahkan ke tag |

Hasil akhir axe-core: **0 pelanggaran** di semua halaman (terang, gelap, HP, dan menu HP terbuka).
