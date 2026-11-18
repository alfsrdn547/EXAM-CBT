# Product Requirements Document (PRD)
**Nama Produk:** ExamCore (High-Concurrency & Offline-First CBT Platform)  
**Versi:** 1.0 (MVP)  
**Target Penggunaan:** Dokumen spesifikasi teknis & produk untuk pengembangan aplikasi ujian online skala menengah-besar.

---

## 1. Ringkasan Produk (Product Overview)
**ExamCore** adalah platform *Computer-Based Test* (CBT) berbasis web (PWA) yang dirancang untuk menangani lonjakan trafik tinggi secara bersamaan (*high concurrency*) serta kondisi koneksi internet peserta yang tidak stabil (*offline-first*). Aplikasi ini memisahkan beban baca paket soal menggunakan *caching* dan beban tulis jawaban menggunakan antrean (*message queue*) serta penyimpanan lokal di browser.

### Tujuan Utama MVP
1. **Zero Downtime saat Lonjakan Trafik:** Mampu melayani ratusan hingga ribuan peserta yang memulai dan mengumpulkan ujian pada detik yang sama.
2. **Resiliensi Koneksi (Offline-First):** Peserta tidak kehilangan progres jawaban meskipun koneksi internet terputus di tengah ujian.
3. **Integritas Ujian (Anti-Cheat Dasar):** Mencegah manipulasi waktu (*timer*), kebocoran kunci jawaban di sisi klien, dan mencatat aktivitas berpindah tab/layar.

---

## 2. Target Pengguna (User Personas)
1. **Peserta Ujian (Student):** Mengakses ujian menggunakan token, mengerjakan soal dengan antarmuka bebas distraksi, melihat status penyimpanan jawaban secara *real-time*, dan mengumpulkan ujian.
2. **Pengajar / Pembuat Soal (Teacher/Proctor):** Membuat jadwal ujian, mengunggah bank soal, memantau status pengerjaan peserta secara langsung, melihat log pelanggaran, dan mengekspor rekapitulasi nilai.

---

## 3. Spesifikasi Fitur MVP (Functional Requirements)

### A. Modul Peserta (Student Flow)
1. **Autentikasi & Lobby Ujian:**
   * Login menggunakan email/NIM/NIS dan password.
   * Input **Token Ujian** (6–8 karakter alfanumerik) untuk membuka akses ruang ujian sesuai jadwal (`start_time` s.d. `end_time`).
   * Halaman konfirmasi peraturan ujian sebelum memulai sesi (memicu mode *fullscreen*).
2. **Workspace Pengerjaan Soal (Core UI):**
   * **Bundled Question Loading:** Mengunduh seluruh paket soal dalam satu kali *request* terkompresi di awal sesi (tanpa kunci jawaban).
   * **Server-Synced Timer:** Penghitung waktu mundur berbasis selisih waktu server (`must_submit_before - server_now`) agar tidak bisa dimanipulasi lewat pengaturan jam perangkat klien.
   * **Offline-First Auto-Save:** Setiap klik opsi jawaban langsung disimpan ke **IndexedDB / LocalStorage** dalam <50ms.
   * **Background Sync with Jitter:** Sinkronisasi otomatis jawaban ke server setiap 30–45 detik (dengan jeda acak/*jitter*) atau saat koneksi kembali online.
   * **Indikator Status Koneksi & Sync:** Badge visual yang jelas (`Tersimpan di Server`, `Menyimpan Lokal - Offline`, `Gagal Sinkronisasi`).
   * **Navigasi Soal:** Daftar nomor soal dengan kode warna status (Sudah Dijawab, Ragu-ragu/Flagged, Belum Dijawab).
3. **Deteksi Pelanggaran (Proctoring Ringan):**
   * Mendeteksi `visibilitychange` (pindah tab/minimize browser) dan keluar dari mode `fullscreen`.
   * Menampilkan peringatan (*warning modal*) kepada peserta dan mencatat *timestamp* serta durasi pelanggaran ke `violation_logs`.
   * Menonaktifkan klik kanan, *copy-paste*, dan *text selection* pada area soal.
4. **Pengumpulan Ujian (Submit):**
   * Konfirmasi akhir sebelum submit (menampilkan jumlah soal terjawab dan yang masih kosong).
   * *Force auto-submit* otomatis ketika waktu habis.

### B. Modul Pengajar / Admin (Teacher Flow)
1. **Manajemen Ujian & Bank Soal:**
   * CRUD ujian (Judul, Durasi, Jadwal Mulai/Selesai, Acak Soal, Acak Opsi, Generate Token).
   * Editor soal pilihan ganda (mendukung teks terformat dan gambar) beserta pengaturan bobot nilai.
2. **Live Monitoring & Hasil:**
   * Melihat daftar peserta yang sedang mengerjakan (`in_progress`), sudah selesai (`submitted`), beserta jumlah pelanggaran (*violation count*).
   * **Auto-Grading Instan:** Penilaian otomatis untuk soal pilihan ganda begitu ujian dikumpulkan.
   * Ekspor hasil nilai dan rekap jawaban ke format CSV/Excel.

---

## 4. Arsitektur Teknis & Tech Stack

### Rekomendasi Tech Stack
* **Frontend:** React / Next.js (App Router) atau Vue 3, Tailwind CSS, Dexie.js (untuk IndexedDB), Lucide Icons.
* **Backend API:** Node.js (Fastify / NestJS) atau Golang (Fiber / Gin).
* **Caching & Message Broker:** Redis (In-memory cache untuk paket soal + BullMQ/Redis Streams untuk antrean *submit*).
* **Database Utama:** PostgreSQL (memanfaatkan tipe data `JSONB` untuk opsi soal, jawaban peserta, dan log pelanggaran).
* **Storage Aset:** S3-Compatible Object Storage + CDN (untuk gambar pada soal).

### Strategi Penanganan Lonjakan Trafik (High Concurrency)
1. **Read Optimization (Mulai Ujian):** Paket soal ujian yang aktif di-cache di **Redis**. Saat ribuan peserta mulai bersamaan, API mengambil data dari Redis, melakukan pengacakan urutan di memori, membuang `answer_key`, dan mengirimkannya ke klien tanpa membebani PostgreSQL.
2. **Write Optimization (Submit Ujian):** Endpoint `/submit` tidak langsung melakukan kalkulasi nilai ke PostgreSQL. Payload jawaban dimasukkan ke **Message Queue** dan langsung mengembalikan respons `202 Accepted` ke klien. *Background worker* memproses antrean secara bertahap untuk menyimpan ke PostgreSQL dan menghitung skor.

---

## 5. Skema Database (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    token VARCHAR(10) UNIQUE NOT NULL,
    duration_minutes INT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    shuffle_questions BOOLEAN DEFAULT TRUE,
    shuffle_options BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_type VARCHAR(20) DEFAULT 'multiple_choice',
    content TEXT NOT NULL,
    options JSONB NOT NULL,     -- [{"id": "opt_1", "text": "..."}]
    answer_key JSONB NOT NULL,  -- {"correct_option_id": "opt_1", "weight": 2.0}
    order_index INT DEFAULT 0
);

CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
    question_order JSONB,
    answers JSONB DEFAULT '{}'::jsonb,
    violation_logs JSONB DEFAULT '[]'::jsonb,
    score NUMERIC(5,2),
    UNIQUE (exam_id, student_id)
);
```

---

## 6. Kontrak API & Struktur JSON

### 1. Mulai Ujian (`POST /api/exams/start`)
**Request:**
```json
{ "token": "UTS2026" }
```
**Response (`200 OK`):**
```json
{
  "attempt_id": "8f9b2c1a-4d3e-4a1b-9c8d-7e6f5a4b3c2d",
  "exam": {
    "id": "e1234567-89ab-cdef-0123-456789abcdef",
    "title": "Ujian Tengah Semester - Pemrograman Web",
    "duration_minutes": 90
  },
  "timing": {
    "server_now": "2026-11-17T08:00:00Z",
    "must_submit_before": "2026-11-17T09:30:00Z"
  },
  "saved_answers": {},
  "questions": [
    {
      "id": "q-101",
      "type": "multiple_choice",
      "content": "<p>Protokol apa yang mengamankan komunikasi HTTP?</p>",
      "options": [
        { "id": "opt-a", "text": "SMTP" },
        { "id": "opt-b", "text": "TLS/SSL" }
      ]
    }
  ]
}
```

### 2. Sinkronisasi & Submit Jawaban (`POST /api/attempts/:id/sync`)
**Request:**
```json
{
  "client_timestamp": "2026-11-17T08:45:12Z",
  "is_final_submit": false,
  "answers": {
    "q-101": "opt-b"
  },
  "violations": [
    {
      "type": "TAB_HIDDEN",
      "timestamp": "2026-11-17T08:14:05Z",
      "duration_seconds": 4
    }
  ]
}
```

---

## 7. Panduan UI/UX (Design Requirements)
* **Layout Halaman Ujian:**
  * **Top Bar (Sticky):** Judul ujian, nama peserta, indikator status koneksi (*Online/Offline & Sync Status*), dan *Countdown Timer* mencolok (berubah warna menjadi merah saat waktu tersisa < 5 menit).
  * **Main Area (70% lebar layar):** Kartu soal dengan tipografi bersih (ukuran font nyaman dibaca, mendukung zoom teks), opsi jawaban berbentuk kartu besar yang mudah diklik, serta tombol navigasi (`Sebelumnya`, `Tandai Ragu-ragu`, `Selanjutnya`).
  * **Sidebar Kanan (30% lebar layar):** Grid matriks nomor soal dengan legenda warna jelas + tombol `Selesai & Kumpulkan Ujian`.
* **Tema Warna:** Netral terang (*Clean Light Mode* dengan latar belakang `#F8FAFC` dan kartu `#FFFFFF`) untuk mengurangi kelelahan mata selama ujian panjang, dengan aksen biru (`#2563EB`) untuk soal aktif, hijau (`#16A34A`) untuk terjawab, dan kuning (`#EAB308`) untuk ragu-ragu.