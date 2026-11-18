import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { ExamAttemptState, ExamConfig, StudentProfile } from '../types/exam';
import { countAnsweredQuestions } from '../data/mockExam';

interface LobbyViewProps {
  exams: ExamConfig[];
  defaultExam: ExamConfig;
  student: StudentProfile;
  existingAttempt: ExamAttemptState | null;
  prefilledToken?: string;
  onUpdateStudent: (student: StudentProfile) => void;
  onTokenVerified: (matchedExam: ExamConfig) => void;
  onResumeAttempt: () => void;
  onDiscardAttempt: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  exams,
  defaultExam,
  student,
  existingAttempt,
  prefilledToken = '',
  onUpdateStudent,
  onTokenVerified,
  onResumeAttempt,
  onDiscardAttempt,
}) => {
  const [tokenInput, setTokenInput] = useState(prefilledToken);
  const [error, setError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState<boolean>(true);

  useEffect(() => {
    if (prefilledToken) {
      setTokenInput(prefilledToken.toUpperCase());
      setError(null);
    }
  }, [prefilledToken]);

  useEffect(() => {
    setStorageReady(
      typeof window !== 'undefined' && ('indexedDB' in window || 'localStorage' in window),
    );
  }, []);

  const publishedExams = exams.filter((e) => e.status === 'published');
  const previewExam =
    publishedExams.find((e) => e.token.toUpperCase() === tokenInput.trim().toUpperCase()) ??
    defaultExam;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = student.fullName.trim();
    const cleanedNim = student.nim.trim();
    const cleanedToken = tokenInput.trim().toUpperCase();

    if (!cleanedName || !cleanedNim) {
      setError('Nama lengkap dan NIM peserta wajib diisi sebelum melanjutkan.');
      return;
    }

    if (!cleanedToken) {
      setError('Masukkan token ujian yang diberikan oleh pengajar.');
      return;
    }

    const matched = exams.find((item) => item.token.toUpperCase() === cleanedToken);
    if (!matched) {
      const availableTokens = publishedExams.map((p) => p.token).join(', ');
      setError(
        `Token "${cleanedToken}" tidak ditemukan. Token aktif saat ini: ${availableTokens || '—'}.`,
      );
      return;
    }

    if (matched.status !== 'published') {
      setError(`Ujian dengan token "${cleanedToken}" masih berstatus Draft oleh pengajar.`);
      return;
    }

    if (matched.questions.length === 0) {
      setError(
        `Ujian "${matched.title}" belum memiliki soal di Bank Soal. Tambahkan soal di menu Pengajar terlebih dahulu.`,
      );
      return;
    }

    setError(null);
    onUpdateStudent({
      ...student,
      fullName: cleanedName,
      nim: cleanedNim,
    });
    onTokenVerified(matched);
  };

  const hasInProgressAttempt = existingAttempt && existingAttempt.status === 'in_progress';
  const resumeQuestions =
    existingAttempt?.cachedQuestions && existingAttempt.cachedQuestions.length > 0
      ? existingAttempt.cachedQuestions
      : previewExam.questions;
  const answeredCount = hasInProgressAttempt
    ? countAnsweredQuestions(resumeQuestions, existingAttempt.answers)
    : 0;
  const essayCount = previewExam.questions.filter(
    (q) => q.type === 'essay' || q.question_type === 'essay',
  ).length;
  const mcCount = previewExam.questions.length - essayCount;

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-12">
      {/* Resume Unfinished Session Notice (if applicable) */}
      {hasInProgressAttempt && (
        <div className="mb-6 sm:mb-8 bg-white border border-blue-200 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#2563EB]">
              Sesi Ujian Tersimpan Ditemukan ({existingAttempt.examToken})
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Peserta <strong className="text-slate-900">{existingAttempt.student.fullName}</strong>{' '}
              ({existingAttempt.student.nim}) memiliki sesi aktif dengan{' '}
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {answeredCount}/{existingAttempt.questionOrder.length || previewExam.questions.length}
              </span>{' '}
              soal terjawab di penyimpanan lokal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onDiscardAttempt}
              className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 sm:border-transparent rounded-lg transition-colors whitespace-nowrap focus-ring cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Mulai Ulang</span>
            </button>
            <button
              type="button"
              onClick={onResumeAttempt}
              className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap focus-ring cursor-pointer"
            >
              <span>Lanjutkan Ujian</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-stretch">
        {/* Left Column: Exam Overview & Readiness */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-3">
              <span>{previewExam.subject}</span>
              <span aria-hidden="true">·</span>
              <span>{previewExam.lecturer}</span>
              <span aria-hidden="true">·</span>
              <span>Jadwal {previewExam.scheduleWindow}</span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4"
              style={{ textWrap: 'balance' }}
            >
              {previewExam.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8 max-w-[65ch]">
              Ruang ujian ini menggunakan arsitektur penyimpanan lokal instan untuk menjaga
              progres jawaban Anda tetap aman meskipun terjadi gangguan jaringan selama sesi
              berlangsung.
            </p>

            {/* Key Exam Specifications */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-5 border-y border-slate-200 mb-8">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Durasi Pengerjaan</span>
                </div>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {previewExam.durationMinutes} Menit
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Jumlah Soal</span>
                </div>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {essayCount > 0 && mcCount > 0
                    ? `${mcCount} PG + ${essayCount} Esai`
                    : essayCount > 0
                      ? `${essayCount} Esai`
                      : `${mcCount} Pilihan Ganda`}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Ketahanan Data</span>
                </div>
                <p className="text-lg font-bold text-slate-900">Offline-First</p>
              </div>
            </div>

            {/* Brief Instructions */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                <span>Ringkasan Ketentuan Sesi</span>
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {previewExam.instructions.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-slate-400 mt-0.5 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Readiness Strip */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 ${storageReady ? 'text-[#16A34A]' : 'text-amber-600'}`}
                aria-hidden="true"
              />
              <span>
                {storageReady
                  ? 'Penyimpanan Lokal (IndexedDB) Siap'
                  : 'Penyimpanan Lokal Terbatas'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
              <span>Sinkronisasi Otomatis Aktif</span>
            </div>
          </div>
        </section>

        {/* Right Column: Student Verification & Token Form */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="mb-5 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
                Masuk Ruang Ujian
              </h2>
              <p className="text-sm text-slate-600">
                Pastikan identitas peserta sesuai, lalu masukkan token ujian dari pengajar untuk
                membuka lembar soal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              <div>
                <label
                  htmlFor="student-name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Nama Lengkap Peserta
                </label>
                <div className="relative">
                  <UserCheck
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="student-name"
                    type="text"
                    value={student.fullName}
                    onChange={(e) =>
                      onUpdateStudent({ ...student, fullName: e.target.value })
                    }
                    placeholder="Masukkan nama lengkap"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-nim"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  NIM / Nomor Peserta
                </label>
                <input
                  id="student-nim"
                  type="text"
                  value={student.nim}
                  onChange={(e) => onUpdateStudent({ ...student, nim: e.target.value })}
                  placeholder="Contoh: 2024080123"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-colors"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="exam-token"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Token Ujian
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTokenInput(defaultExam.token);
                      setError(null);
                    }}
                    className="text-xs font-medium text-[#2563EB] hover:text-blue-700 hover:underline focus-ring rounded px-1 py-1 cursor-pointer"
                  >
                    Isi token ({defaultExam.token})
                  </button>
                </div>

                <div className="relative">
                  <KeyRound
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="exam-token"
                    type="text"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value.toUpperCase());
                      if (error) setError(null);
                    }}
                    placeholder="Masukkan 6–8 karakter token"
                    maxLength={12}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full min-h-[48px] pl-10 pr-4 py-3 text-base font-mono font-semibold uppercase tracking-widest text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>

                {/* Quick Token Picker for Published Teacher Exams */}
                {publishedExams.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span>Token aktif:</span>
                    {publishedExams.map((ex, idx) => (
                      <React.Fragment key={ex.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setTokenInput(ex.token);
                            setError(null);
                          }}
                          className="py-0.5 font-mono font-semibold text-slate-800 hover:text-[#2563EB] underline underline-offset-2 cursor-pointer"
                        >
                          {ex.token}
                        </button>
                        {idx < publishedExams.length - 1 && <span aria-hidden="true">·</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 leading-relaxed"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] py-3 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors cursor-pointer focus-ring"
              >
                <span>Verifikasi Token &amp; Lanjut</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          <p className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            Dengan melanjutkan, Anda akan diminta membaca dan menyetujui tata tertib ujian sebelum
            waktu hitung mundur dimulai.
          </p>
        </section>
      </div>
    </main>
  );
};
