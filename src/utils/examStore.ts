import { ExamAttemptState, ExamConfig } from '../types/exam';
import {
  MOCK_EXAM_CONFIG,
  SEED_MONITORING_ATTEMPTS,
  countAnsweredQuestions,
} from '../data/mockExam';

const EXAMS_STORAGE_KEY = 'examcore_exams_registry_v1';
const EXAMS_SEED_VERSION_KEY = 'examcore_exams_seed_v3';
const MONITORING_STORAGE_KEY = 'examcore_monitoring_attempts_v1';
const MONITORING_SEED_VERSION_KEY = 'examcore_monitoring_seed_v3';

export function loadExams(): ExamConfig[] {
  try {
    const raw = window.localStorage.getItem(EXAMS_STORAGE_KEY);
    const seedMigrated = window.localStorage.getItem(EXAMS_SEED_VERSION_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as ExamConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!seedMigrated) {
          const upgraded = parsed.map((ex) => {
            if (ex.id !== MOCK_EXAM_CONFIG.id) return ex;
            const customExtras = ex.questions.filter(
              (q) => !MOCK_EXAM_CONFIG.questions.some((mq) => mq.id === q.id),
            );
            const mergedQuestions = [...MOCK_EXAM_CONFIG.questions, ...customExtras];
            return {
              ...ex,
              title: MOCK_EXAM_CONFIG.title,
              subject: MOCK_EXAM_CONFIG.subject,
              questions: mergedQuestions,
              totalQuestions: mergedQuestions.length,
            };
          });
          saveExams(upgraded);
          window.localStorage.setItem(EXAMS_SEED_VERSION_KEY, '1');
          return upgraded;
        }
        return parsed;
      }
    }
  } catch {
    // Fallback to seeded exam
  }

  const initial = [MOCK_EXAM_CONFIG];
  saveExams(initial);
  try {
    window.localStorage.setItem(EXAMS_SEED_VERSION_KEY, '1');
  } catch {
    // Ignore
  }
  return initial;
}

/**
 * Mengonversi file gambar yang diunggah menjadi Base64 Data URL agar tersimpan offline-first.
 * Untuk gambar raster besar (>350KB), ukurannya disesuaikan agar aman di LocalStorage/IndexedDB.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (file.type === 'image/svg+xml' || file.size <= 350 * 1024) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function saveExams(exams: ExamConfig[]): void {
  try {
    window.localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
  } catch {
    // Ignore storage quota issues
  }
}

export function findExamByToken(token: string): ExamConfig | undefined {
  const normalized = token.trim().toUpperCase();
  const exams = loadExams();
  return exams.find((e) => e.token.toUpperCase() === normalized);
}

export function findExamById(examId: string): ExamConfig | undefined {
  const exams = loadExams();
  return exams.find((e) => e.id === examId);
}

export function generateExamToken(existingTokens: string[] = []): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Hindari O/0/I/1
  const existingSet = new Set(existingTokens.map((t) => t.toUpperCase()));

  for (let attempt = 0; attempt < 20; attempt++) {
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    if (!existingSet.has(token)) {
      return token;
    }
  }
  return `EX${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function loadAllMonitoringAttempts(): ExamAttemptState[] {
  try {
    const raw = window.localStorage.getItem(MONITORING_STORAGE_KEY);
    const seedMigrated = window.localStorage.getItem(MONITORING_SEED_VERSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ExamAttemptState[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!seedMigrated) {
          const seedMap = new Map(SEED_MONITORING_ATTEMPTS.map((s) => [s.attemptId, s]));
          const upgraded = parsed.map((att) => seedMap.get(att.attemptId) ?? att);
          window.localStorage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(upgraded));
          window.localStorage.setItem(MONITORING_SEED_VERSION_KEY, '1');
          return upgraded;
        }
        return parsed;
      }
    }
  } catch {
    // Fallback to seeds
  }

  try {
    window.localStorage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(SEED_MONITORING_ATTEMPTS));
    window.localStorage.setItem(MONITORING_SEED_VERSION_KEY, '1');
  } catch {
    // Ignore
  }
  return [...SEED_MONITORING_ATTEMPTS];
}

export function upsertMonitoringAttempt(attempt: ExamAttemptState): void {
  const list = loadAllMonitoringAttempts();
  const idx = list.findIndex((a) => a.attemptId === attempt.attemptId);
  if (idx >= 0) {
    list[idx] = attempt;
  } else {
    list.unshift(attempt);
  }
  try {
    window.localStorage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

export function getMonitoringAttemptsByExam(examId: string): ExamAttemptState[] {
  return loadAllMonitoringAttempts()
    .filter((a) => a.examId === examId)
    .sort((a, b) => b.startedAt - a.startedAt);
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportMonitoringToCsv(exam: ExamConfig, attempts: ExamAttemptState[]): void {
  const headers = [
    'NIM',
    'Nama Peserta',
    'Token Ujian',
    'Judul Ujian',
    'Status Pengerjaan',
    'Status Penilaian',
    'Soal Terjawab',
    'Total Soal',
    'Jumlah Pelanggaran',
    'Skor Akhir',
    'Waktu Mulai',
    'Waktu Selesai',
  ];

  const rows = attempts.map((att) => {
    const answeredCount = countAnsweredQuestions(exam.questions, att.answers);
    const statusLabel = att.status === 'submitted' ? 'Submitted' : 'In Progress';
    const gradingStatusLabel =
      att.status !== 'submitted'
        ? 'Belum Dikumpulkan'
        : att.gradingSummary?.gradingStatus === 'pending_essay'
          ? 'Menunggu Koreksi Esai'
          : att.gradingSummary?.gradingStatus === 'fully_graded'
            ? 'Selesai Dikoreksi'
            : 'Auto-Graded';
    const scoreValue =
      att.status === 'submitted' && att.gradingSummary
        ? att.gradingSummary.score
        : '-';
    const startedStr = new Date(att.startedAt).toLocaleString('id-ID');
    const submittedStr = att.submittedAt
      ? new Date(att.submittedAt).toLocaleString('id-ID')
      : '-';

    return [
      att.student.nim,
      att.student.fullName,
      exam.token,
      exam.title,
      statusLabel,
      gradingStatusLabel,
      answeredCount,
      exam.questions.length,
      att.violations.length,
      scoreValue,
      startedStr,
      submittedStr,
    ].map(escapeCsvCell);
  });

  const csvContent =
    '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rekap-nilai-${exam.token.toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
