import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { QuestionType, StoredQuestion } from '../types/exam';

export interface ParsedQuestionRow {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  questionTypeRaw: string;
  questionType: QuestionType;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswerRaw: string;
  weightRaw: string;
  weight: number;
  topic: string;
  question?: StoredQuestion;
}

export interface ParsedQuestionImportResult {
  fileName: string;
  rows: ParsedQuestionRow[];
  validCount: number;
  invalidCount: number;
}

export interface ParticipantCardItem {
  id: string;
  fullName: string;
  nim: string;
  roomSession: string;
}

const TEMPLATE_COLUMNS = [
  'question_type',
  'content',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'weight',
] as const;

const TEMPLATE_SAMPLE_ROWS = [
  {
    question_type: 'multiple_choice',
    content:
      'Hitunglah nilai integral tentu berikut: $$\\int_{0}^{2} (3x^2 + 2x)\\,dx$$',
    option_a: '8',
    option_b: '10',
    option_c: '12',
    option_d: '16',
    correct_answer: 'C',
    weight: 2,
  },
  {
    question_type: 'multiple_choice',
    content:
      'Dalam arsitektur Offline-First, teknologi penyimpanan peramban yang mendukung transaksi asinkron berkapasitas besar untuk menyimpan paket soal dan gambar Base64 adalah ...',
    option_a: 'SessionStorage',
    option_b: 'IndexedDB',
    option_c: 'HTTP Cookie',
    option_d: 'URL Query String',
    correct_answer: 'B',
    weight: 1,
  },
  {
    question_type: 'essay',
    content:
      'Jelaskan bagaimana strategi sinkronisasi ulang (background sync) bekerja ketika koneksi internet peserta ujian terputus di tengah sesi dan kembali tersambung!',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer:
      'Menyebutkan penyimpanan lokal instan (LocalStorage/IndexedDB), penandaan flag pendingSync, deteksi event online, dan pengiriman ulang delta jawaban ke server secara idempoten.',
    weight: 5,
  },
];

function normalizeRecordKeys(record: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    const cleanKey = k
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    normalized[cleanKey] = v === null || v === undefined ? '' : String(v).trim();
  }
  return normalized;
}

function isCompletelyEmptyRow(norm: Record<string, string>): boolean {
  return Object.values(norm).every((val) => val.trim() === '');
}

function validateAndBuildRows(
  rawRecords: Record<string, unknown>[],
  defaultTopic: string,
): ParsedQuestionRow[] {
  const rows: ParsedQuestionRow[] = [];
  const baseUid = Date.now();

  rawRecords.forEach((rawObj, idx) => {
    const norm = normalizeRecordKeys(rawObj);
    if (isCompletelyEmptyRow(norm)) {
      return;
    }

    const rowNumber = idx + 2; // Baris 1 = header di Excel/CSV
    const questionTypeRaw = norm['question_type'] ?? norm['tipe_soal'] ?? norm['type'] ?? '';
    const content = norm['content'] ?? norm['pertanyaan'] ?? norm['prompt'] ?? '';
    const optionA = norm['option_a'] ?? norm['opsi_a'] ?? '';
    const optionB = norm['option_b'] ?? norm['opsi_b'] ?? '';
    const optionC = norm['option_c'] ?? norm['opsi_c'] ?? '';
    const optionD = norm['option_d'] ?? norm['opsi_d'] ?? '';
    const correctAnswerRaw =
      norm['correct_answer'] ?? norm['kunci_jawaban'] ?? norm['rubric'] ?? '';
    const weightRaw = norm['weight'] ?? norm['bobot'] ?? '';
    const topic = norm['topic'] || norm['topik'] || defaultTopic.trim() || 'Umum';

    const errors: string[] = [];
    const normalizedType = questionTypeRaw.toLowerCase();

    let resolvedType: QuestionType = 'multiple_choice';
    if (normalizedType === 'multiple_choice' || normalizedType === 'pg') {
      resolvedType = 'multiple_choice';
    } else if (normalizedType === 'essay' || normalizedType === 'esai') {
      resolvedType = 'essay';
    } else {
      errors.push(
        `Kolom question_type "${questionTypeRaw || '(kosong)'}" tidak valid. Gunakan "multiple_choice" atau "essay".`,
      );
    }

    if (!content) {
      errors.push('Kolom content (teks soal) tidak boleh kosong.');
    }

    const parsedWeight = Number(weightRaw.replace(',', '.'));
    if (!weightRaw || Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      errors.push('Kolom weight (bobot) harus berupa angka positif (> 0).');
    }

    const normalizedKey = correctAnswerRaw.trim().toUpperCase();

    if (resolvedType === 'multiple_choice' && errors.every((e) => !e.includes('question_type'))) {
      if (!optionA || !optionB || !optionC || !optionD) {
        const missingOpts: string[] = [];
        if (!optionA) missingOpts.push('option_a');
        if (!optionB) missingOpts.push('option_b');
        if (!optionC) missingOpts.push('option_c');
        if (!optionD) missingOpts.push('option_d');
        errors.push(`Opsi pilihan ganda belum lengkap (${missingOpts.join(', ')} kosong).`);
      }

      if (!['A', 'B', 'C', 'D'].includes(normalizedKey)) {
        errors.push(
          `Kunci jawaban pilihan ganda "${correctAnswerRaw || '(kosong)'}" tidak valid. Harus A, B, C, atau D.`,
        );
      }
    }

    const isValid = errors.length === 0;
    let builtQuestion: StoredQuestion | undefined;

    if (isValid) {
      const qId = `q-imp-${baseUid}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
      if (resolvedType === 'essay') {
        builtQuestion = {
          id: qId,
          order: 0,
          topic,
          type: 'essay',
          question_type: 'essay',
          prompt: content,
          weight: parsedWeight,
          rubric: correctAnswerRaw || undefined,
          options: [],
          correctOptionId: '',
        };
      } else {
        const opts = [
          { id: `${qId}-a`, label: 'A', text: optionA },
          { id: `${qId}-b`, label: 'B', text: optionB },
          { id: `${qId}-c`, label: 'C', text: optionC },
          { id: `${qId}-d`, label: 'D', text: optionD },
        ];
        const keyOption = opts.find((o) => o.label === normalizedKey) ?? opts[0];
        builtQuestion = {
          id: qId,
          order: 0,
          topic,
          type: 'multiple_choice',
          question_type: 'multiple_choice',
          prompt: content,
          weight: parsedWeight,
          options: opts,
          correctOptionId: keyOption.id,
        };
      }
    }

    rows.push({
      rowNumber,
      isValid,
      errors,
      questionTypeRaw,
      questionType: resolvedType,
      content,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswerRaw,
      weightRaw,
      weight: Number.isNaN(parsedWeight) ? 0 : parsedWeight,
      topic,
      question: builtQuestion,
    });
  });

  return rows;
}

export async function parseQuestionImportFile(
  file: File,
  defaultTopic = 'Bank Soal Import',
): Promise<ParsedQuestionImportResult> {
  const lowerName = file.name.toLowerCase();
  let rawRecords: Record<string, unknown>[] = [];

  if (lowerName.endsWith('.csv')) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new Error(`Format CSV tidak dapat dibaca: ${parsed.errors[0].message}`);
    }
    rawRecords = parsed.data;
  } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
    }
    const sheet = workbook.Sheets[firstSheetName];
    rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });
  } else {
    throw new Error('Format file tidak didukung. Gunakan file .csv, .xlsx, atau .xls.');
  }

  const rows = validateAndBuildRows(rawRecords, defaultTopic);
  if (rows.length === 0) {
    throw new Error('File tidak berisi baris soal. Pastikan template memiliki baris data di bawah header.');
  }

  const validCount = rows.filter((r) => r.isValid).length;
  return {
    fileName: file.name,
    rows,
    validCount,
    invalidCount: rows.length - validCount,
  };
}

export function downloadQuestionTemplateCsv(): void {
  const csv = Papa.unparse({
    fields: [...TEMPLATE_COLUMNS],
    data: TEMPLATE_SAMPLE_ROWS.map((r) => TEMPLATE_COLUMNS.map((col) => r[col])),
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template-bank-soal-examcore.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadQuestionTemplateXlsx(): void {
  const worksheet = XLSX.utils.json_to_sheet(TEMPLATE_SAMPLE_ROWS, {
    header: [...TEMPLATE_COLUMNS],
  });
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 52 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 36 },
    { wch: 10 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank_Soal');
  XLSX.writeFile(workbook, 'template-bank-soal-examcore.xlsx');
}

export async function parseParticipantImportFile(file: File): Promise<ParticipantCardItem[]> {
  const lowerName = file.name.toLowerCase();
  let rawRecords: Record<string, unknown>[] = [];

  if (lowerName.endsWith('.csv')) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    rawRecords = parsed.data;
  } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('File Excel peserta kosong.');
    }
    rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[firstSheetName],
      { defval: '' },
    );
  } else {
    throw new Error('Format file peserta harus .csv, .xlsx, atau .xls.');
  }

  const results: ParticipantCardItem[] = [];
  rawRecords.forEach((rec, idx) => {
    const norm = normalizeRecordKeys(rec);
    const fullName =
      norm['nama_lengkap'] || norm['nama'] || norm['full_name'] || norm['name'] || '';
    const nim = norm['nim'] || norm['nis'] || norm['id_peserta'] || norm['id'] || '';
    const roomSession =
      norm['ruang_sesi'] || norm['ruang'] || norm['sesi'] || norm['room'] || 'Lab CBT 01 · Sesi 1';

    if (fullName && nim) {
      results.push({
        id: `pc-imp-${Date.now()}-${idx}`,
        fullName,
        nim,
        roomSession,
      });
    }
  });

  if (results.length === 0) {
    throw new Error(
      'Tidak ada peserta valid ditemukan. Gunakan kolom: nama_lengkap, nim, ruang_sesi.',
    );
  }

  return results;
}

export function downloadParticipantTemplateCsv(): void {
  const sample = [
    ['Ahmad Fauzan', '210401001', 'Lab Komputer 01 · Sesi 1'],
    ['Siti Nurhaliza', '210401002', 'Lab Komputer 01 · Sesi 1'],
    ['Budi Santoso', '210401003', 'Lab Komputer 02 · Sesi 1'],
    ['Dewi Lestari', '210401004', 'Lab Komputer 02 · Sesi 1'],
  ];
  const csv = Papa.unparse({
    fields: ['nama_lengkap', 'nim', 'ruang_sesi'],
    data: sample,
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template-daftar-peserta-examcore.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
