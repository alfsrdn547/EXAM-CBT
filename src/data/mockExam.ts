import {
  ExamAttemptState,
  ExamConfig,
  ExamGradingSummary,
  Question,
  QuestionGradingDetail,
  QuestionType,
  StoredQuestion,
  StudentProfile,
} from '../types/exam';

export const DEFAULT_STUDENT: StudentProfile = {
  id: 'std-2024080123',
  fullName: 'Andi Pratama',
  nim: '2024080123',
  email: 'andi.pratama@mahasiswa.ac.id',
  program: 'Teknik Informatika — Semester 5',
};

export const VALID_EXAM_TOKEN = 'UTS2026';

export const DEFAULT_EXAM_INSTRUCTIONS: string[] = [
  'Baca setiap butir soal pilihan ganda maupun esai dengan saksama sebelum menjawab.',
  'Setiap pilihan jawaban dan ketikan esai langsung tersimpan otomatis di penyimpanan lokal browser dan disinkronkan ke server secara berkala.',
  'Peserta dilarang berpindah tab, membuka aplikasi lain, atau menyalin konten soal selama sesi ujian berlangsung.',
  'Apabila koneksi internet terputus, Anda tetap dapat melanjutkan pengerjaan soal; jawaban akan disinkronkan kembali saat koneksi pulih.',
  'Ujian akan dikumpulkan secara otomatis apabila waktu hitung mundur mencapai 00:00:00.',
];

export const MOCK_STORED_QUESTIONS: StoredQuestion[] = [
  {
    id: 'q-01',
    order: 1,
    topic: 'Keamanan Jaringan & Protokol',
    type: 'multiple_choice',
    prompt:
      'Protokol kriptografi manakah yang digunakan pada lapisan transport untuk mengamankan komunikasi HTTP menjadi HTTPS agar terhindar dari penyadapan (eavesdropping) dan manipulasi data?',
    options: [
      { id: 'opt-1a', label: 'A', text: 'SMTP (Simple Mail Transfer Protocol)' },
      { id: 'opt-1b', label: 'B', text: 'TLS (Transport Layer Security)' },
      { id: 'opt-1c', label: 'C', text: 'ICMP (Internet Control Message Protocol)' },
      { id: 'opt-1d', label: 'D', text: 'SNMP (Simple Network Management Protocol)' },
    ],
    correctOptionId: 'opt-1b',
    weight: 1,
  },
  {
    id: 'q-02',
    order: 2,
    topic: 'Arsitektur High-Concurrency',
    type: 'multiple_choice',
    prompt:
      'Dalam perancangan sistem ujian online berskala besar, strategi utama memisahkan beban baca paket soal menggunakan Redis cache dan beban tulis submit menggunakan Message Queue bertujuan untuk:',
    options: [
      {
        id: 'opt-2a',
        label: 'A',
        text: 'Menghilangkan kebutuhan autentikasi pengguna di sisi backend',
      },
      {
        id: 'opt-2b',
        label: 'B',
        text: 'Mencegah bottleneck koneksi dan lonjakan penulisan langsung ke database utama saat trafik serentak',
      },
      {
        id: 'opt-2c',
        label: 'C',
        text: 'Menyimpan kunci jawaban langsung di LocalStorage agar evaluasi lebih cepat',
      },
      {
        id: 'opt-2d',
        label: 'D',
        text: 'Mengganti seluruh query SQL dengan file teks statis di browser klien',
      },
    ],
    correctOptionId: 'opt-2b',
    weight: 1,
  },
  {
    id: 'q-03',
    order: 3,
    topic: 'Offline-First Storage',
    type: 'multiple_choice',
    prompt:
      'Mengapa IndexedDB sering dipilih dibandingkan Cookies untuk menyimpan state jawaban peserta ujian yang kompleks dalam aplikasi web modern berbasis offline-first?',
    options: [
      {
        id: 'opt-3a',
        label: 'A',
        text: 'Cookies otomatis dikirim pada setiap HTTP header sehingga boros bandwidth dan kapasitasnya sangat terbatas (~4 KB)',
      },
      {
        id: 'opt-3b',
        label: 'B',
        text: 'IndexedDB tidak dapat diakses oleh JavaScript di sisi klien',
      },
      {
        id: 'opt-3c',
        label: 'C',
        text: 'Cookies hanya berfungsi pada protokol FTP dan WebSocket',
      },
      {
        id: 'opt-3d',
        label: 'D',
        text: 'IndexedDB secara otomatis mengenkripsi seluruh traffic jaringan tanpa HTTPS',
      },
    ],
    correctOptionId: 'opt-3a',
    weight: 1,
  },
  {
    id: 'q-04',
    order: 4,
    topic: 'HTTP Status Codes',
    type: 'multiple_choice',
    prompt:
      'Ketika endpoint pengumpulan ujian (/api/attempts/:id/sync) menerima payload final dan memasukkannya ke antrean background worker untuk diproses secara asinkron, status kode HTTP manakah yang paling tepat dikembalikan?',
    options: [
      { id: 'opt-4a', label: 'A', text: '202 Accepted' },
      { id: 'opt-4b', label: 'B', text: '301 Moved Permanently' },
      { id: 'opt-4c', label: 'C', text: '403 Forbidden' },
      { id: 'opt-4d', label: 'D', text: '502 Bad Gateway' },
    ],
    correctOptionId: 'opt-4a',
    weight: 1,
  },
  {
    id: 'q-05',
    order: 5,
    topic: 'React & State Management',
    type: 'multiple_choice',
    prompt:
      'Perhatikan potongan kode React berikut. Masalah performa atau bug apakah yang dapat terjadi apabila dependency array pada useEffect dihilangkan?',
    codeSnippet: `useEffect(() => {
  const timer = setInterval(() => {
    setSecondsLeft(prev => prev - 1);
  }, 1000);
  return () => clearInterval(timer);
});`,
    options: [
      {
        id: 'opt-5a',
        label: 'A',
        text: 'Komponen tidak akan pernah melakukan render awal di DOM',
      },
      {
        id: 'opt-5b',
        label: 'B',
        text: 'Interval akan dihancurkan dan dibuat ulang pada setiap kali state berubah dan komponen re-render',
      },
      {
        id: 'opt-5c',
        label: 'C',
        text: 'Variabel prev akan selalu bernilai undefined saat pertama kali dipanggil',
      },
      {
        id: 'opt-5d',
        label: 'D',
        text: 'React akan melempar SyntaxError pada saat kompilasi TypeScript',
      },
    ],
    correctOptionId: 'opt-5b',
    weight: 2,
  },
  {
    id: 'q-06',
    order: 6,
    topic: 'Keamanan Aplikasi Web',
    type: 'multiple_choice',
    prompt:
      'Jika teks soal dari rich-text editor dirender mentah ke halaman HTML tanpa proses sanitasi terlebih dahulu, kerentanan keamanan apakah yang paling berisiko muncul?',
    options: [
      { id: 'opt-6a', label: 'A', text: 'Cross-Site Scripting (XSS)' },
      { id: 'opt-6b', label: 'B', text: 'DNS Cache Poisoning' },
      { id: 'opt-6c', label: 'C', text: 'ARP Spoofing' },
      { id: 'opt-6d', label: 'D', text: 'Buffer Overflow pada kernel OS' },
    ],
    correctOptionId: 'opt-6a',
    weight: 1,
  },
  {
    id: 'q-07',
    order: 7,
    topic: 'Sinkronisasi & Jitter',
    type: 'multiple_choice',
    prompt:
      'Dalam mekanisme Background Sync berkala setiap 30–45 detik dari ribuan browser peserta, mengapa ditambahkan jeda acak (random jitter) sebelum mengirim request ke server?',
    options: [
      {
        id: 'opt-7a',
        label: 'A',
        text: 'Agar browser peserta dapat mengompresi gambar secara otomatis',
      },
      {
        id: 'opt-7b',
        label: 'B',
        text: 'Untuk mencegah efek thundering herd di mana ribuan klien menembak server pada milidetik yang sama persis',
      },
      {
        id: 'opt-7c',
        label: 'C',
        text: 'Supaya peserta tidak bisa mengubah jawaban yang sudah dikirim',
      },
      {
        id: 'opt-7d',
        label: 'D',
        text: 'Untuk menonaktifkan cache DNS di perangkat peserta',
      },
    ],
    correctOptionId: 'opt-7b',
    weight: 1,
  },
  {
    id: 'q-08',
    order: 8,
    topic: 'Basis Data Relasional & JSONB',
    type: 'multiple_choice',
    prompt:
      'Pada skema PostgreSQL ExamCore, kolom answers dan violation_logs menggunakan tipe data JSONB dibandingkan JSON biasa karena:',
    options: [
      {
        id: 'opt-8a',
        label: 'A',
        text: 'JSONB menyimpan data dalam format biner terurai yang mendukung pengindeksan (GIN) dan pemrosesan query lebih cepat',
      },
      {
        id: 'opt-8b',
        label: 'B',
        text: 'JSONB hanya menerima nilai numerik dan menolak string teks',
      },
      {
        id: 'opt-8c',
        label: 'C',
        text: 'Tipe JSON biasa tidak didukung oleh PostgreSQL versi modern',
      },
      {
        id: 'opt-8d',
        label: 'D',
        text: 'JSONB otomatis memindahkan data ke penyimpanan browser klien',
      },
    ],
    correctOptionId: 'opt-8a',
    weight: 1,
  },
  {
    id: 'q-09',
    order: 9,
    topic: 'Integritas Waktu Klien-Server',
    type: 'multiple_choice',
    prompt:
      'Seorang peserta mencoba memanipulasi jam sistem pada laptopnya mundur 1 jam untuk memperpanjang waktu ujian. Pendekatan arsitektur manakah yang efektif menggagalkan manipulasi tersebut?',
    options: [
      {
        id: 'opt-9a',
        label: 'A',
        text: 'Menggunakan Date.now() lokal browser secara murni sebagai batas akhir ujian',
      },
      {
        id: 'opt-9b',
        label: 'B',
        text: 'Menghitung selisih offset dari timestamp server (must_submit_before - server_now) dan melakukan validasi final di sisi server',
      },
      {
        id: 'opt-9c',
        label: 'C',
        text: 'Menyimpan sisa detik ujian dalam cookie yang dapat diubah pengguna',
      },
      {
        id: 'opt-9d',
        label: 'D',
        text: 'Menonaktifkan CSS transition pada komponen timer',
      },
    ],
    correctOptionId: 'opt-9b',
    weight: 1,
  },
  {
    id: 'q-10',
    order: 10,
    topic: 'Browser Web APIs',
    type: 'multiple_choice',
    prompt:
      'Event DOM standar apakah yang didengarkan oleh sistem proctoring ringan untuk mendeteksi ketika peserta berpindah ke tab browser lain atau meminimalkan jendela browser?',
    options: [
      { id: 'opt-10a', label: 'A', text: 'visibilitychange pada objek document' },
      { id: 'opt-10b', label: 'B', text: 'DOMContentLoaded pada objek window' },
      { id: 'opt-10c', label: 'C', text: 'hashchange pada objek location' },
      { id: 'opt-10d', label: 'D', text: 'pointermove pada elemen body' },
    ],
    correctOptionId: 'opt-10a',
    weight: 1,
  },
  {
    id: 'q-11',
    order: 11,
    topic: 'TypeScript & Type Safety',
    type: 'multiple_choice',
    prompt:
      'Perhatikan definisi tipe TypeScript berikut. Manakah pernyataan yang benar mengenai tipe Record<string, string> untuk menyimpan jawaban peserta?',
    codeSnippet: `interface ExamState {
  answers: Record<string, string>;
  flaggedIds: string[];
}`,
    options: [
      {
        id: 'opt-11a',
        label: 'A',
        text: 'answers merupakan array berindeks angka yang hanya dapat menampung 10 item',
      },
      {
        id: 'opt-11b',
        label: 'B',
        text: 'answers adalah objek pemetaan dengan key bertipe string (ID soal) dan value bertipe string (ID opsi)',
      },
      {
        id: 'opt-11c',
        label: 'C',
        text: 'flaggedIds hanya boleh berisi tipe boolean true atau false',
      },
      {
        id: 'opt-11d',
        label: 'D',
        text: 'Record<string, string> otomatis melakukan sinkronisasi ke database SQL',
      },
    ],
    correctOptionId: 'opt-11b',
    weight: 2,
  },
  {
    id: 'q-12',
    order: 12,
    topic: 'Aksesibilitas & UI Design',
    type: 'multiple_choice',
    prompt:
      'Mengapa antarmuka status pada platform ujian tidak boleh hanya mengandalkan perbedaan warna (misalnya hanya hijau atau merah) tanpa ikon atau label teks?',
    options: [
      {
        id: 'opt-12a',
        label: 'A',
        text: 'Karena browser modern tidak mendukung kode warna hex pada Tailwind CSS',
      },
      {
        id: 'opt-12b',
        label: 'B',
        text: 'Untuk memenuhi aksesibilitas bagi pengguna dengan buta warna (color vision deficiency) serta kejelasan informasi pada layar monokrom',
      },
      {
        id: 'opt-12c',
        label: 'C',
        text: 'Karena label teks memperkecil ukuran bundle JavaScript secara signifikan',
      },
      {
        id: 'opt-12d',
        label: 'D',
        text: 'Agar pengguna dapat menyalin teks status ke clipboard dengan mudah',
      },
    ],
    correctOptionId: 'opt-12b',
    weight: 1,
  },
  {
    id: 'q-13',
    order: 13,
    topic: 'Fisika — Kinematika Gerak Parabola',
    type: 'multiple_choice',
    image_url:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300" width="640" height="300" style="background:#ffffff;font-family:sans-serif">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#334155"/>
            </marker>
            <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="#2563EB"/>
            </marker>
          </defs>
          <rect width="640" height="300" fill="#F8FAFC"/>
          <line x1="60" y1="250" x2="590" y2="250" stroke="#334155" stroke-width="2" marker-end="url(#arrow)"/>
          <line x1="60" y1="250" x2="60" y2="30" stroke="#334155" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="598" y="254" font-size="14" font-weight="bold" fill="#334155">x</text>
          <text x="54" y="22" font-size="14" font-weight="bold" fill="#334155">y</text>
          <path d="M 60 250 Q 300 10 540 250" fill="none" stroke="#2563EB" stroke-width="3" stroke-dasharray="7 5"/>
          <line x1="60" y1="250" x2="140" y2="155" stroke="#DC2626" stroke-width="2.5" marker-end="url(#arrowBlue)"/>
          <path d="M 105 250 A 45 45 0 0 0 92 214" fill="none" stroke="#0F172A" stroke-width="1.8"/>
          <text x="112" y="238" font-size="14" font-style="italic" fill="#0F172A">θ</text>
          <text x="145" y="150" font-size="15" font-weight="bold" fill="#DC2626">v₀</text>
          <line x1="300" y1="130" x2="300" y2="250" stroke="#16A34A" stroke-width="2" stroke-dasharray="4 4"/>
          <circle cx="300" cy="130" r="5" fill="#16A34A"/>
          <text x="310" y="125" font-size="13" font-weight="bold" fill="#16A34A">h_maks</text>
          <text x="292" y="272" font-size="13" fill="#475569">R / 2</text>
          <text x="530" y="272" font-size="13" font-weight="bold" fill="#0F172A">R</text>
          <text x="60" y="272" font-size="13" fill="#475569">0</text>
        </svg>`,
      ),
    prompt:
      'Perhatikan diagram lintasan gerak parabola sebuah proyektil dengan kecepatan awal $v_0$ dan sudut elevasi $\\theta$ terhadap bidang horizontal (abaikan gesekan udara, percepatan gravitasi $g$). Persamaan tinggi maksimum $h_{\\text{maks}}$ yang dicapai benda adalah:',
    options: [
      {
        id: 'opt-13a',
        label: 'A',
        text: '$h_{\\text{maks}} = \\frac{v_0^2 \\sin^2\\theta}{2g}$',
      },
      {
        id: 'opt-13b',
        label: 'B',
        text: '$h_{\\text{maks}} = \\frac{v_0^2 \\sin(2\\theta)}{g}$',
      },
      {
        id: 'opt-13c',
        label: 'C',
        text: '$h_{\\text{maks}} = \\frac{v_0 \\cos\\theta}{2g}$',
      },
      {
        id: 'opt-13d',
        label: 'D',
        text: '$h_{\\text{maks}} = \\frac{1}{2} g v_0^2 \\tan\\theta$',
      },
    ],
    correctOptionId: 'opt-13a',
    weight: 2,
  },
  {
    id: 'q-14',
    order: 14,
    topic: 'Matematika — Kalkulus Integral Tentu',
    type: 'multiple_choice',
    prompt:
      'Tentukan nilai integral tentu dari fungsi polinomial berikut:\n$$I = \\int_{0}^{2} (3x^2 + 2x - 1)\\,dx$$',
    options: [
      { id: 'opt-14a', label: 'A', text: '$I = 10$' },
      { id: 'opt-14b', label: 'B', text: '$I = 12$' },
      { id: 'opt-14c', label: 'C', text: '$I = 8$' },
      { id: 'opt-14d', label: 'D', text: '$I = 14$' },
    ],
    correctOptionId: 'opt-14a',
    weight: 2,
  },
  {
    id: 'q-15',
    order: 15,
    topic: 'Matematika — Persamaan Kuadrat & Matriks',
    type: 'multiple_choice',
    prompt:
      'Diketahui rumus kuadrat umum serta bentuk matriks transformasi berdimensi tiga berikut:\n$$x_{1,2} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}, \\qquad M = \\begin{pmatrix} 2 & -1 & 3 & 0 \\\\ 0 & 4 & 1 & -2 \\\\ 1 & 2 & 5 & 1 \\end{pmatrix}$$\nUntuk persamaan kuadrat $2x^2 - 5x + 2 = 0$, himpunan akar-akar riilnya adalah:',
    options: [
      {
        id: 'opt-15a',
        label: 'A',
        text: '$x_1 = 2$ dan $x_2 = \\frac{1}{2}$',
      },
      {
        id: 'opt-15b',
        label: 'B',
        text: '$x_1 = -2$ dan $x_2 = \\frac{1}{2}$',
      },
      {
        id: 'opt-15c',
        label: 'C',
        text: '$x_1 = 4$ dan $x_2 = \\frac{1}{4}$',
      },
      {
        id: 'opt-15d',
        label: 'D',
        text: '$x_1 = 1$ dan $x_2 = \\frac{3}{2}$',
      },
    ],
    correctOptionId: 'opt-15a',
    weight: 2,
  },
  {
    id: 'q-16',
    order: 16,
    topic: 'Arsitektur Offline-First & Sinkronisasi',
    type: 'essay',
    question_type: 'essay',
    prompt:
      'Jelaskan secara terstruktur bagaimana mekanisme Offline-First Auto-Save dan Background Sync with Jitter bekerja pada aplikasi CBT agar jawaban peserta tidak hilang ketika koneksi internet terputus menjelang akhir ujian, sekaligus mencegah lonjakan beban server (thundering herd).',
    options: [],
    correctOptionId: '',
    rubric:
      'Poin penilaian (maks 5): (1) Penyimpanan lokal instan <50ms ke LocalStorage/IndexedDB setiap perubahan jawaban (2 poin); (2) Penandaan status pendingSync / indikator offline lokal yang transparan ke pengguna (1 poin); (3) Antrean sinkronisasi otomatis saat event online aktif serta interval latar belakang dengan jeda acak (jitter 30–45 detik) untuk meratakan trafik tulis ke server (2 poin).',
    weight: 5,
  },
  {
    id: 'q-17',
    order: 17,
    topic: 'Fisika & Matematika Komputasi (Esai)',
    type: 'essay',
    question_type: 'essay',
    prompt:
      'Sebuah proyektil ditembakkan vertikal ke atas mengikuti persamaan posisi:\n$$s(t) = v_0 t - \\frac{1}{2}gt^2$$\nJika kecepatan awal $v_0 = 20\\text{ m/s}$ dan percepatan gravitasi $g = 10\\text{ m/s}^2$, turunkan waktu saat proyektil mencapai titik tertinggi ($t_{\\text{maks}}$) serta hitung ketinggian maksimumnya ($h_{\\text{maks}}$). Tuliskan langkah perhitungannya!',
    options: [],
    correctOptionId: '',
    rubric:
      'Poin penilaian (maks 5): (1) Menurunkan fungsi kecepatan $v(t) = \\frac{ds}{dt} = v_0 - gt$ (1.5 poin); (2) Syarat titik tertinggi $v(t) = 0 \\implies 20 - 10t = 0 \\implies t_{\\text{maks}} = 2\\text{ detik}$ (1.5 poin); (3) Substitusi ke $s(2) = 20(2) - \\frac{1}{2}(10)(2)^2 = 40 - 20 = 20\\text{ meter}$ (2 poin).',
    weight: 5,
  },
];

export const MOCK_EXAM_CONFIG: ExamConfig = {
  id: 'exam-uts-web-2026',
  token: VALID_EXAM_TOKEN,
  title: 'Ujian Tengah Semester — Pemrograman Web, Matematika & Fisika Komputasi',
  subject: 'IF-304 Komputasi & Sistem Web',
  lecturer: 'Dr. Hendra Wijaya, M.Kom.',
  durationMinutes: 90,
  totalQuestions: MOCK_STORED_QUESTIONS.length,
  passingScore: 70,
  scheduleWindow: '08:00 – 11:30 WIB',
  shuffleQuestions: false,
  shuffleOptions: false,
  status: 'published',
  instructions: DEFAULT_EXAM_INSTRUCTIONS,
  questions: MOCK_STORED_QUESTIONS,
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Menentukan apakah sebuah soal dianggap sudah terjawab.
 * Untuk soal esai, hanya dianggap terjawab apabila teks tidak kosong setelah di-trim.
 */
export function isQuestionAnswered(
  question: { id: string; type?: QuestionType },
  answers: Record<string, string>,
): boolean {
  const val = answers[question.id];
  if (typeof val !== 'string') return false;
  if (question.type === 'essay') {
    return val.trim().length > 0;
  }
  return val.length > 0;
}

export function countAnsweredQuestions(
  questions: { id: string; type?: QuestionType }[],
  answers: Record<string, string>,
): number {
  return questions.reduce((acc, q) => acc + (isQuestionAnswered(q, answers) ? 1 : 0), 0);
}

/**
 * Menghasilkan daftar soal aman untuk peserta (tanpa correctOptionId & tanpa rubric)
 * serta menghormati urutan soal & opsi yang diacak deterministik saat sesi dimulai.
 */
export function buildStudentQuestions(
  storedQuestions: StoredQuestion[],
  questionOrder?: string[],
  optionOrders?: Record<string, string[]>,
): Question[] {
  const map = new Map(storedQuestions.map((q) => [q.id, q]));
  const ordered =
    questionOrder && questionOrder.length > 0
      ? questionOrder
          .map((id) => map.get(id))
          .filter((q): q is StoredQuestion => Boolean(q))
      : storedQuestions;

  // Sertakan soal baru apabila belum masuk urutan
  const seen = new Set(ordered.map((q) => q.id));
  const combined = [...ordered, ...storedQuestions.filter((q) => !seen.has(q.id))];

  return combined.map((sq, idx) => {
    const qType: QuestionType = sq.type === 'essay' || sq.question_type === 'essay'
      ? 'essay'
      : 'multiple_choice';

    if (qType === 'essay') {
      return {
        id: sq.id,
        order: idx + 1,
        topic: sq.topic,
        type: 'essay',
        question_type: 'essay',
        prompt: sq.prompt,
        image_url: sq.image_url,
        codeSnippet: sq.codeSnippet,
        weight: sq.weight,
        options: [],
      };
    }

    const optOrder = optionOrders?.[sq.id];
    const optMap = new Map(sq.options.map((o) => [o.id, o]));
    const orderedOpts =
      optOrder && optOrder.length > 0
        ? optOrder
            .map((id) => optMap.get(id))
            .filter((o): o is NonNullable<typeof o> => Boolean(o))
        : sq.options;

    // Pastikan seluruh opsi tetap ikut apabila ada opsi tambahan baru
    const seenOpts = new Set(orderedOpts.map((o) => o.id));
    const finalOpts = [...orderedOpts, ...sq.options.filter((o) => !seenOpts.has(o.id))];

    return {
      id: sq.id,
      order: idx + 1,
      topic: sq.topic,
      type: 'multiple_choice',
      question_type: 'multiple_choice',
      prompt: sq.prompt,
      image_url: sq.image_url,
      codeSnippet: sq.codeSnippet,
      weight: sq.weight,
      options: finalOpts.map((opt, optIdx) => ({
        id: opt.id,
        label: OPTION_LETTERS[optIdx] ?? opt.label,
        text: opt.text,
        image_url: opt.image_url,
      })),
    };
  });
}

export function evaluateExamAnswers(
  storedQuestions: StoredQuestion[],
  answers: Record<string, string>,
  passingScore: number = 70,
  questionOrder?: string[],
  optionOrders?: Record<string, string[]>,
  essayScores?: Record<string, number>,
): ExamGradingSummary {
  const orderedQuestions = buildStudentQuestions(storedQuestions, questionOrder, optionOrders);
  const storedMap = new Map(storedQuestions.map((q) => [q.id, q]));

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let totalWeight = 0;
  let earnedWeight = 0;
  let essayCount = 0;
  let essayGradedCount = 0;
  let essayPendingCount = 0;
  let mcWeightTotal = 0;
  let mcWeightEarned = 0;
  let essayWeightTotal = 0;
  let essayWeightEarned = 0;

  const details: QuestionGradingDetail[] = orderedQuestions.map((q) => {
    const stored = storedMap.get(q.id);
    const weight = stored?.weight ?? 1;
    totalWeight += weight;

    if (q.type === 'essay') {
      essayCount += 1;
      essayWeightTotal += weight;
      const rawEssay = answers[q.id];
      const essayAnswer = typeof rawEssay === 'string' ? rawEssay.trim() : '';
      const hasScore =
        essayScores !== undefined &&
        typeof essayScores[q.id] === 'number' &&
        !Number.isNaN(essayScores[q.id]);

      if (!essayAnswer) {
        unansweredCount += 1;
      }

      if (hasScore) {
        const clampedScore = Math.min(weight, Math.max(0, Number(essayScores![q.id])));
        essayGradedCount += 1;
        earnedWeight += clampedScore;
        essayWeightEarned += clampedScore;

        return {
          questionId: q.id,
          order: q.order,
          topic: q.topic,
          questionType: 'essay',
          prompt: q.prompt,
          weight,
          earnedWeight: clampedScore,
          essayAnswer,
          rubric: stored?.rubric,
          correctOptionId: '',
          correctLabel: '-',
          correctText: stored?.rubric || '-',
          status: 'graded',
        };
      }

      essayPendingCount += 1;
      return {
        questionId: q.id,
        order: q.order,
        topic: q.topic,
        questionType: 'essay',
        prompt: q.prompt,
        weight,
        earnedWeight: 0,
        essayAnswer,
        rubric: stored?.rubric,
        correctOptionId: '',
        correctLabel: '-',
        correctText: stored?.rubric || '-',
        status: essayAnswer ? 'pending_review' : 'unanswered',
      };
    }

    mcWeightTotal += weight;
    const correctOptionId = stored?.correctOptionId ?? '';
    const correctOpt = q.options.find((o) => o.id === correctOptionId);
    const selectedOptionId = answers[q.id];
    const selectedOpt = selectedOptionId
      ? q.options.find((o) => o.id === selectedOptionId)
      : undefined;

    let status: QuestionGradingDetail['status'] = 'unanswered';
    let qEarned = 0;

    if (selectedOptionId) {
      if (selectedOptionId === correctOptionId) {
        status = 'correct';
        correctCount += 1;
        qEarned = weight;
        earnedWeight += weight;
        mcWeightEarned += weight;
      } else {
        status = 'incorrect';
        incorrectCount += 1;
      }
    } else {
      unansweredCount += 1;
    }

    return {
      questionId: q.id,
      order: q.order,
      topic: q.topic,
      questionType: 'multiple_choice',
      prompt: q.prompt,
      weight,
      earnedWeight: qEarned,
      selectedOptionId,
      selectedLabel: selectedOpt?.label,
      selectedText: selectedOpt
        ? selectedOpt.text || (selectedOpt.image_url ? '[Opsi Bergambar]' : '-')
        : undefined,
      correctOptionId,
      correctLabel: correctOpt?.label ?? '-',
      correctText: correctOpt
        ? correctOpt.text || (correctOpt.image_url ? '[Opsi Bergambar]' : '-')
        : '-',
      status,
    };
  });

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const hasEssay = essayCount > 0;
  const gradingStatus: ExamGradingSummary['gradingStatus'] = !hasEssay
    ? 'auto_graded'
    : essayPendingCount > 0
      ? 'pending_essay'
      : 'fully_graded';

  return {
    score,
    passed: score >= passingScore,
    passingScore,
    totalQuestions: orderedQuestions.length,
    totalWeight,
    earnedWeight,
    correctCount,
    incorrectCount,
    unansweredCount,
    hasEssay,
    essayCount,
    essayGradedCount,
    essayPendingCount,
    mcWeightTotal,
    mcWeightEarned,
    essayWeightTotal,
    essayWeightEarned,
    gradingStatus,
    details,
  };
}

const nowMs = Date.now();

const SITI_ANSWERS: Record<string, string> = {
  'q-01': 'opt-1b',
  'q-02': 'opt-2b',
  'q-03': 'opt-3a',
  'q-04': 'opt-4a',
  'q-05': 'opt-5b',
  'q-06': 'opt-6a',
  'q-07': 'opt-7b',
  'q-08': 'opt-8a',
  'q-09': 'opt-9b',
  'q-10': 'opt-10a',
  'q-11': 'opt-11b',
  'q-12': 'opt-12b',
  'q-13': 'opt-13a',
  'q-14': 'opt-14a',
  'q-15': 'opt-15a',
  'q-16':
    'Saat peserta memilih atau mengetik jawaban, aplikasi menyimpannya secara instan (<50ms) ke LocalStorage dan IndexedDB serta menandai pendingSync=true. Ketika internet terputus, badge berubah menjadi Menyimpan Lokal - Offline. Saat koneksi kembali online atau timer background sync berjalan dengan jeda acak (jitter 30-45 detik), payload dikirim bertahap ke server sehingga trafik tidak menumpuk bersamaan.',
  'q-17':
    'Diketahui $s(t) = v_0 t - \\frac{1}{2}gt^2$. Turunan pertama adalah $v(t) = v_0 - gt$. Saat titik tertinggi, $v(t) = 0 \\implies 20 - 10t = 0 \\implies t_{\\text{maks}} = 2$ detik. Substitusi ke fungsi posisi: $h_{\\text{maks}} = 20(2) - \\frac{1}{2}(10)(2^2) = 40 - 20 = 20$ meter.',
};

const SITI_ESSAY_SCORES: Record<string, number> = {
  'q-16': 5,
  'q-17': 5,
};

const BUDI_ANSWERS: Record<string, string> = {
  'q-01': 'opt-1b',
  'q-02': 'opt-2b',
  'q-03': 'opt-3a',
  'q-04': 'opt-4a',
  'q-05': 'opt-5a',
  'q-06': 'opt-6a',
  'q-07': 'opt-7b',
  'q-08': 'opt-8a',
  'q-09': 'opt-9b',
  'q-10': 'opt-10a',
  'q-11': 'opt-11b',
  'q-12': 'opt-12b',
  'q-13': 'opt-13a',
  'q-14': 'opt-14b',
  'q-15': 'opt-15a',
  'q-16':
    'Aplikasi CBT menyimpan jawaban ke LocalStorage dan IndexedDB terlebih dahulu supaya aman jika internet mati. Setelah online kembali, jawaban dikirim otomatis ke server dengan jeda waktu acak agar server tidak down.',
  'q-17':
    'Kecepatan di titik puncak sama dengan nol sehingga 20 - 10t = 0, diperoleh t = 2 detik. Maka ketinggian maksimum s(2) = 20(2) - 5(4) = 20 meter.',
};

const FAJAR_ANSWERS: Record<string, string> = {
  'q-01': 'opt-1a',
  'q-02': 'opt-2b',
  'q-03': 'opt-3a',
  'q-04': 'opt-4b',
  'q-05': 'opt-5a',
  'q-06': 'opt-6a',
  'q-07': 'opt-7a',
  'q-08': 'opt-8a',
  'q-09': 'opt-9a',
  'q-10': 'opt-10a',
  'q-11': 'opt-11a',
  'q-12': 'opt-12b',
  'q-13': 'opt-13a',
  'q-14': 'opt-14a',
  'q-16':
    'Jawaban disimpan di browser dulu lalu dikirim ke server ketika jaringan normal kembali.',
};

export const SEED_MONITORING_ATTEMPTS: ExamAttemptState[] = [
  {
    attemptId: 'att-seed-001',
    examId: MOCK_EXAM_CONFIG.id,
    examToken: MOCK_EXAM_CONFIG.token,
    examTitle: MOCK_EXAM_CONFIG.title,
    student: {
      id: 'std-2024080101',
      fullName: 'Siti Nurhaliza',
      nim: '2024080101',
      email: 'siti.nurhaliza@mahasiswa.ac.id',
      program: 'Teknik Informatika — Semester 5',
    },
    startedAt: nowMs - 48 * 60 * 1000,
    mustSubmitBefore: nowMs + 42 * 60 * 1000,
    submittedAt: nowMs - 6 * 60 * 1000,
    submittedReason: 'manual',
    currentQuestionIndex: 16,
    questionOrder: MOCK_STORED_QUESTIONS.map((q) => q.id),
    optionOrders: {},
    answers: SITI_ANSWERS,
    essayScores: SITI_ESSAY_SCORES,
    flaggedIds: [],
    violations: [],
    status: 'submitted',
    lastSavedLocallyAt: nowMs - 6 * 60 * 1000,
    lastSyncedAt: nowMs - 6 * 60 * 1000,
    pendingSync: false,
    gradingSummary: evaluateExamAnswers(
      MOCK_STORED_QUESTIONS,
      SITI_ANSWERS,
      70,
      undefined,
      undefined,
      SITI_ESSAY_SCORES,
    ),
  },
  {
    attemptId: 'att-seed-002',
    examId: MOCK_EXAM_CONFIG.id,
    examToken: MOCK_EXAM_CONFIG.token,
    examTitle: MOCK_EXAM_CONFIG.title,
    student: {
      id: 'std-2024080114',
      fullName: 'Budi Santoso',
      nim: '2024080114',
      email: 'budi.santoso@mahasiswa.ac.id',
      program: 'Teknik Informatika — Semester 5',
    },
    startedAt: nowMs - 52 * 60 * 1000,
    mustSubmitBefore: nowMs + 38 * 60 * 1000,
    submittedAt: nowMs - 11 * 60 * 1000,
    submittedReason: 'manual',
    currentQuestionIndex: 16,
    questionOrder: MOCK_STORED_QUESTIONS.map((q) => q.id),
    optionOrders: {},
    answers: BUDI_ANSWERS,
    flaggedIds: [],
    violations: [
      {
        id: 'vio-seed-1',
        type: 'TAB_HIDDEN',
        timestamp: new Date(nowMs - 30 * 60 * 1000).toISOString(),
        durationSeconds: 6,
        message: 'Peserta meninggalkan tab ujian.',
      },
    ],
    status: 'submitted',
    lastSavedLocallyAt: nowMs - 11 * 60 * 1000,
    lastSyncedAt: nowMs - 11 * 60 * 1000,
    pendingSync: false,
    gradingSummary: evaluateExamAnswers(MOCK_STORED_QUESTIONS, BUDI_ANSWERS, 70),
  },
  {
    attemptId: 'att-seed-003',
    examId: MOCK_EXAM_CONFIG.id,
    examToken: MOCK_EXAM_CONFIG.token,
    examTitle: MOCK_EXAM_CONFIG.title,
    student: {
      id: 'std-2024080129',
      fullName: 'Raka Mahendra',
      nim: '2024080129',
      email: 'raka.mahendra@mahasiswa.ac.id',
      program: 'Teknik Informatika — Semester 5',
    },
    startedAt: nowMs - 24 * 60 * 1000,
    mustSubmitBefore: nowMs + 66 * 60 * 1000,
    currentQuestionIndex: 10,
    questionOrder: MOCK_STORED_QUESTIONS.map((q) => q.id),
    optionOrders: {},
    answers: {
      'q-01': 'opt-1b',
      'q-02': 'opt-2b',
      'q-03': 'opt-3a',
      'q-04': 'opt-4a',
      'q-05': 'opt-5b',
      'q-06': 'opt-6a',
      'q-07': 'opt-7b',
      'q-08': 'opt-8a',
      'q-09': 'opt-9b',
      'q-10': 'opt-10a',
    },
    flaggedIds: ['q-08'],
    violations: [
      {
        id: 'vio-seed-2',
        type: 'TAB_HIDDEN',
        timestamp: new Date(nowMs - 14 * 60 * 1000).toISOString(),
        durationSeconds: 4,
        message: 'Peserta meninggalkan tab ujian.',
      },
      {
        id: 'vio-seed-3',
        type: 'TAB_HIDDEN',
        timestamp: new Date(nowMs - 8 * 60 * 1000).toISOString(),
        durationSeconds: 12,
        message: 'Peserta meninggalkan tab ujian.',
      },
    ],
    status: 'in_progress',
    lastSavedLocallyAt: nowMs - 45 * 1000,
    lastSyncedAt: nowMs - 45 * 1000,
    pendingSync: false,
  },
  {
    attemptId: 'att-seed-004',
    examId: MOCK_EXAM_CONFIG.id,
    examToken: MOCK_EXAM_CONFIG.token,
    examTitle: MOCK_EXAM_CONFIG.title,
    student: {
      id: 'std-2024080142',
      fullName: 'Dewi Lestari',
      nim: '2024080142',
      email: 'dewi.lestari@mahasiswa.ac.id',
      program: 'Teknik Informatika — Semester 5',
    },
    startedAt: nowMs - 19 * 60 * 1000,
    mustSubmitBefore: nowMs + 71 * 60 * 1000,
    currentQuestionIndex: 6,
    questionOrder: MOCK_STORED_QUESTIONS.map((q) => q.id),
    optionOrders: {},
    answers: {
      'q-01': 'opt-1b',
      'q-02': 'opt-2b',
      'q-03': 'opt-3a',
      'q-04': 'opt-4a',
      'q-05': 'opt-5b',
      'q-06': 'opt-6a',
    },
    flaggedIds: [],
    violations: [],
    status: 'in_progress',
    lastSavedLocallyAt: nowMs - 20 * 1000,
    lastSyncedAt: nowMs - 20 * 1000,
    pendingSync: false,
  },
  {
    attemptId: 'att-seed-005',
    examId: MOCK_EXAM_CONFIG.id,
    examToken: MOCK_EXAM_CONFIG.token,
    examTitle: MOCK_EXAM_CONFIG.title,
    student: {
      id: 'std-2024080158',
      fullName: 'Fajar Ramadhan',
      nim: '2024080158',
      email: 'fajar.ramadhan@mahasiswa.ac.id',
      program: 'Teknik Informatika — Semester 5',
    },
    startedAt: nowMs - 65 * 60 * 1000,
    mustSubmitBefore: nowMs + 25 * 60 * 1000,
    submittedAt: nowMs - 18 * 60 * 1000,
    submittedReason: 'manual',
    currentQuestionIndex: 15,
    questionOrder: MOCK_STORED_QUESTIONS.map((q) => q.id),
    optionOrders: {},
    answers: FAJAR_ANSWERS,
    flaggedIds: [],
    violations: [
      {
        id: 'vio-seed-4',
        type: 'TAB_HIDDEN',
        timestamp: new Date(nowMs - 40 * 60 * 1000).toISOString(),
        durationSeconds: 19,
        message: 'Peserta meninggalkan tab ujian.',
      },
    ],
    status: 'submitted',
    lastSavedLocallyAt: nowMs - 18 * 60 * 1000,
    lastSyncedAt: nowMs - 18 * 60 * 1000,
    pendingSync: false,
    gradingSummary: evaluateExamAnswers(MOCK_STORED_QUESTIONS, FAJAR_ANSWERS, 70),
  },
];

