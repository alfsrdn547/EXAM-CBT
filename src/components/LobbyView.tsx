import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { ExamAttemptState, ExamConfig, Question, StudentProfile } from '../types/exam';
import { countAnsweredQuestions } from '../data/mockExam';
import {
  StartExamResponse,
  mapStartResponseToStudentQuestions,
  studentExamService,
} from '../services/examService';

export interface StartedExamPayload {
  rawResponse: StartExamResponse;
  examConfig: ExamConfig;
  questions: Question[];
  token: string;
}

interface LobbyViewProps {
  student: StudentProfile;
  existingAttempt: ExamAttemptState | null;
  onUpdateStudent: (student: StudentProfile) => void;
  onStartExamLoaded: (payload: StartedExamPayload) => void;
  onResumeAttempt: () => void;
  onDiscardAttempt: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  student,
  existingAttempt,
  onUpdateStudent,
  onStartExamLoaded,
  onResumeAttempt,
  onDiscardAttempt,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState<boolean>(true);

  useEffect(() => {
    setStorageReady(
      typeof window !== 'undefined' && ('indexedDB' in window || 'localStorage' in window),
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = student.fullName.trim();
    const cleanedNim = student.nim.trim();
    const cleanedToken = tokenInput.trim().toUpperCase();

    if (!cleanedName) {
      setError('Nama lengkap peserta tidak ditemukan.');
      return;
    }

    if (!cleanedToken) {
      setError('Masukkan token ujian yang diberikan oleh pengajar.');
      return;
    }

    setIsLoadingStart(true);
    setError(null);

    try {
      const startData = await studentExamService.startExam(cleanedToken);
      if (!startData || !startData.attempt_id || !startData.exam || !startData.timing) {
        throw new Error('Respons server untuk sesi ujian tidak lengkap.');
      }

      const mappedQuestions = mapStartResponseToStudentQuestions(startData.questions);
      if (mappedQuestions.length === 0) {
        throw new Error('Paket ujian ini belum memiliki soal yang aktif.');
      }

      const mappedExam: ExamConfig = {
        id: String(startData.exam.id),
        token: cleanedToken,
        title: String(startData.exam.title),
        subject: startData.exam.subject ? String(startData.exam.subject) : 'Ujian Berbasis Komputer',
        lecturer: startData.exam.lecturer ? String(startData.exam.lecturer) : 'Tim Pengajar',
        durationMinutes: Number(startData.exam.duration_minutes ?? 60),
        totalQuestions: mappedQuestions.length,
        passingScore: Number(startData.exam.passing_score ?? 70),
        scheduleWindow: 'Sesi Aktif Sekarang',
        shuffleQuestions: Boolean(startData.exam.shuffle_questions ?? true),
        shuffleOptions: Boolean(startData.exam.shuffle_options ?? true),
        status: 'published',
        instructions: [
          'Waktu hitung mundur dihitung akurat berdasarkan waktu server.',
          'Seluruh perubahan jawaban otomatis disimpan lokal (IndexedDB/LocalStorage) dan disinkronkan tiap 30 detik.',
          'Dilarang berpindah tab, membuka jendela lain, atau menyalin teks selama ujian berlangsung.',
          'Klik Selesai & Kumpulkan Ujian setelah selesai, atau sistem akan mengumpulkan otomatis saat waktu habis.',
        ],
        questions: [],
      };

      onUpdateStudent({
        ...student,
        fullName: cleanedName,
        nim: cleanedNim || student.id.slice(0, 8).toUpperCase(),
      });

      onStartExamLoaded({
        rawResponse: startData,
        examConfig: mappedExam,
        questions: mappedQuestions,
        token: cleanedToken,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memulai sesi ujian.';
      setError(msg);
    } finally {
      setIsLoadingStart(false);
    }
  };

  const hasInProgressAttempt = existingAttempt && existingAttempt.status === 'in_progress';
  const resumeQuestions = existingAttempt?.cachedQuestions ?? [];
  const answeredCount = hasInProgressAttempt
    ? countAnsweredQuestions(resumeQuestions, existingAttempt.answers)
    : 0;

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-12">
      {/* Resume Unfinished Session Notice (if applicable) */}
      {hasInProgressAttempt && (
        <div className="mb-6 sm:mb-8 bg-white border border-blue-200 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#2563EB]">
              Sesi Ujian Aktif Ditemukan ({existingAttempt.examToken})
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {existingAttempt.examTitle} ·{' '}
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {answeredCount}/
                {existingAttempt.questionOrder.length || resumeQuestions.length}
              </span>{' '}
              soal terjawab tersimpan di perangkat Anda.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onDiscardAttempt}
              className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 sm:border-transparent rounded-lg transition-colors whitespace-nowrap focus-ring cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Hapus Cache Lokal</span>
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
        {/* Left Column: Exam Platform Overview & Readiness */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-3">
              <span>Lobby Peserta Ujian</span>
              <span aria-hidden="true">·</span>
              <span>Terhubung ke Server Supabase</span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4"
              style={{ textWrap: 'balance' }}
            >
              Siapkan Sesi Ujian Berbasis Komputer Anda
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8 max-w-[65ch]">
              Masukkan token ujian dari pengajar di formulir samping untuk mengunduh paket soal
              resmi. Timer ujian disinkronkan langsung dengan waktu server agar akurat dan aman.
            </p>

            {/* Key Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-y border-slate-200 mb-8">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Sinkronisasi Timer</span>
                </div>
                <p className="text-base font-bold text-slate-900">Server-Synced Clock</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Ketahanan Data</span>
                </div>
                <p className="text-base font-bold text-slate-900">
                  IndexedDB + Background Sync 30s
                </p>
              </div>
            </div>

            {/* Brief Instructions */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                <span>Ketentuan Umum Sesi Ujian</span>
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-semibold text-slate-400 mt-0.5 tabular-nums">
                    01.
                  </span>
                  <span className="leading-relaxed">
                    Setiap jawaban tersimpan langsung ke perangkat lokal dan disinkronkan ke server
                    setiap 30 detik atau saat koneksi kembali pulih.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-semibold text-slate-400 mt-0.5 tabular-nums">
                    02.
                  </span>
                  <span className="leading-relaxed">
                    Aktivitas berpindah tab atau keluar dari layar penuh akan dicatat otomatis ke
                    log pengawas.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-semibold text-slate-400 mt-0.5 tabular-nums">
                    03.
                  </span>
                  <span className="leading-relaxed">
                    Saat waktu habis, sistem mengumpulkan jawaban terakhir Anda secara otomatis.
                  </span>
                </li>
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
              <span>Auto-Sync Supabase Aktif</span>
            </div>
          </div>
        </section>

        {/* Right Column: Authenticated Identity & Token Form */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="mb-5 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
                Masuk Ruang Ujian
              </h2>
              <p className="text-sm text-slate-600">
                Masukkan token ujian yang diberikan oleh pengajar untuk memulai sesi.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              <div>
                <label
                  htmlFor="student-name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Nama Peserta (Akun Terautentikasi)
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
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Email / ID Peserta
                </label>
                <input
                  id="student-email"
                  type="text"
                  readOnly
                  value={student.email || student.nim}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm font-mono text-slate-600 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label
                  htmlFor="exam-token"
                  className="block text-sm font-semibold text-slate-900 mb-1.5"
                >
                  Token Ujian
                </label>

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
                    placeholder="Masukkan token ujian (mis. UTS2026)"
                    maxLength={16}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full min-h-[48px] pl-10 pr-4 py-3 text-base font-mono font-semibold uppercase tracking-widest text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-colors"
                  />
                </div>
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
                disabled={isLoadingStart}
                className="w-full min-h-[48px] py-3 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors cursor-pointer focus-ring"
              >
                <span>
                  {isLoadingStart
                    ? 'Memverifikasi Token & Memuat Soal...'
                    : 'Verifikasi Token & Lanjut'}
                </span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          <p className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            Token diverifikasi secara langsung oleh server Supabase dan membuka sesi ujian sesuai
            jadwal aktif.
          </p>
        </section>
      </div>
    </main>
  );
};
