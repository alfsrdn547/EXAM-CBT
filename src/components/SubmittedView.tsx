import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { ExamAttemptState, ExamConfig } from '../types/exam';
import { evaluateExamAnswers } from '../data/mockExam';
import { formatTimeWIB } from '../utils/storage';
import { MathText } from './MathText';

interface SubmittedViewProps {
  exam: ExamConfig;
  attempt: ExamAttemptState;
  isSyncedToServer: boolean;
  onReturnToLobby: () => void;
}

export const SubmittedView: React.FC<SubmittedViewProps> = ({
  exam,
  attempt,
  isSyncedToServer,
  onReturnToLobby,
}) => {
  const [showDetails, setShowDetails] = useState(true);

  const grading =
    attempt.gradingSummary ??
    evaluateExamAnswers(
      exam.questions,
      attempt.answers,
      exam.passingScore,
      attempt.questionOrder,
      attempt.optionOrders,
      attempt.essayScores,
    );

  const isPendingEssay = grading.gradingStatus === 'pending_essay';

  const durationSpentSec = Math.max(
    1,
    Math.floor(((attempt.submittedAt ?? Date.now()) - attempt.startedAt) / 1000),
  );
  const spentMinutes = Math.floor(durationSpentSec / 60);
  const spentRemSec = durationSpentSec % 60;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm tracking-tight">
              EC
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ExamCore</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium">
            {isSyncedToServer ? (
              <span className="inline-flex items-center gap-1.5 text-[#16A34A]">
                <Cloud className="w-4 h-4" aria-hidden="true" />
                <span>Tersimpan di Server</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <WifiOff className="w-4 h-4" aria-hidden="true" />
                <span>Tersimpan Lokal</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Hero Score & Summary Card */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>Ringkasan Nilai Otomatis</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">ID {attempt.attemptId.slice(0, 8)}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{exam.title}</h1>
              <p className="text-sm text-slate-600">
                Peserta: <strong className="text-slate-900">{attempt.student.fullName}</strong>{' '}
                <span aria-hidden="true">·</span>{' '}
                <span className="font-mono tabular-nums">NIM {attempt.student.nim}</span>
              </p>
              {attempt.submittedReason === 'timeout' && (
                <p className="text-xs font-medium text-amber-800 pt-1">
                  Dikumpulkan otomatis oleh sistem karena batas waktu ujian telah berakhir.
                </p>
              )}
            </div>

            {/* Score Readout Block */}
            <div className="flex items-center gap-5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-6 py-4">
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-0.5">
                  {isPendingEssay ? 'Skor Sementara (PG)' : 'Nilai Akhir'}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono tabular-nums text-slate-900">
                    {grading.score}
                  </span>
                  <span className="text-sm font-mono text-slate-400">/100</span>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200" aria-hidden="true" />

              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">
                  Status (KKM {grading.passingScore})
                </span>
                {isPendingEssay ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB]">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    <span>Menunggu Koreksi Esai</span>
                  </span>
                ) : grading.passed ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16A34A]">
                    <Award className="w-4 h-4" aria-hidden="true" />
                    <span>Lulus</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#DC2626]">
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Belum Lulus</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {isPendingEssay && (
            <div className="mt-5 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-xs sm:text-sm text-blue-900">
              Ujian ini memiliki <strong>{grading.essayCount} soal esai</strong>. Soal pilihan
              ganda telah dinilai otomatis, sedangkan skor final akan diperbarui setelah pengajar
              selesai mengoreksi jawaban esai Anda.
            </div>
          )}

          {/* 4-Column Breakdown Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
                <span>PG Benar</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {grading.correctCount}{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {grading.totalQuestions - grading.essayCount}
                </span>
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <XCircle className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
                <span>Jawaban Salah</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {grading.incorrectCount}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <HelpCircle className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span>Tidak Dijawab</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {grading.unansweredCount}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                <span>Durasi &amp; Waktu Selesai</span>
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {spentMinutes}m {spentRemSec}d
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-500">
                {formatTimeWIB(attempt.submittedAt)} WIB
              </p>
            </div>
          </div>
        </section>

        {/* Proctoring / Violation Logs */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {attempt.violations.length === 0 ? (
                <ShieldCheck className="w-5 h-5 text-[#16A34A]" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600" aria-hidden="true" />
              )}
              <span>Log Integritas &amp; Aktivitas Tab</span>
            </h2>
            <span className="text-xs font-mono tabular-nums font-semibold text-slate-600">
              {attempt.violations.length} catatan
            </span>
          </div>

          {attempt.violations.length === 0 ? (
            <p className="text-sm text-slate-600">
              Tidak ada pelanggaran perpindahan tab atau jendela ujian yang tercatat selama sesi
              berlangsung.
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">#</th>
                    <th className="py-2.5 px-4 font-semibold">Jenis Pelanggaran</th>
                    <th className="py-2.5 px-4 font-semibold">Waktu Tercatat</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Durasi Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempt.violations.map((v, i) => (
                    <tr key={v.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">
                        {i + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-amber-800">
                        {v.type}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                        {new Date(v.timestamp).toLocaleTimeString('id-ID')} WIB
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-right text-slate-900">
                        {v.durationSeconds} detik
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Per-Question Grading Breakdown */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Rincian Evaluasi Jawaban</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan pilihan Anda terhadap kunci jawaban sistem
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <span>{showDetails ? 'Sembunyikan Rincian' : 'Tampilkan Rincian'}</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {showDetails && (
            <div className="divide-y divide-slate-100 mt-2">
              {grading.details.map((item) => (
                <div
                  key={item.questionId}
                  className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        Soal {item.order}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.questionType === 'essay' ? 'Esai' : 'Pilihan Ganda'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.topic}</span>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">
                      <MathText text={item.prompt} />
                    </p>

                    {item.questionType === 'essay' ? (
                      <div className="pt-1.5 space-y-1.5 text-xs">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                          <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Jawaban Esai Anda:
                          </span>
                          {item.essayAnswer ? (
                            <MathText text={item.essayAnswer} />
                          ) : (
                            <span className="italic text-slate-400">Tidak dijawab</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                        <span className="text-slate-600">
                          Jawaban Anda:{' '}
                          <strong className="text-slate-900">
                            {item.selectedLabel ? (
                              <>
                                {item.selectedLabel}. <MathText text={item.selectedText ?? ''} />
                              </>
                            ) : (
                              'Kosong'
                            )}
                          </strong>
                        </span>
                        {item.status !== 'correct' && (
                          <span className="text-emerald-800">
                            Kunci Jawaban:{' '}
                            <strong>
                              {item.correctLabel}. <MathText text={item.correctText} />
                            </strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {item.status === 'correct' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>Benar</span>
                      </span>
                    )}
                    {item.status === 'incorrect' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
                        <XCircle className="w-4 h-4" aria-hidden="true" />
                        <span>Salah</span>
                      </span>
                    )}
                    {item.status === 'pending_review' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB]">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        <span>Menunggu Koreksi</span>
                      </span>
                    )}
                    {item.status === 'graded' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] font-mono tabular-nums">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {item.earnedWeight}/{item.weight} poin
                        </span>
                      </span>
                    )}
                    {item.status === 'unanswered' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <HelpCircle className="w-4 h-4" aria-hidden="true" />
                        <span>Kosong</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Ringkasan ini tersimpan di browser Anda hingga Anda memulai sesi ujian baru.
            </p>
            <button
              type="button"
              onClick={onReturnToLobby}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Kembali ke Lobby Ujian</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
