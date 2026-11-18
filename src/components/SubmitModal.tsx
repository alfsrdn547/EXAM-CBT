import React from 'react';
import { AlertTriangle, CheckCircle2, Flag, HelpCircle, Send, X } from 'lucide-react';

interface SubmitModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  flaggedCount: number;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirmSubmit: () => void;
}

export const SubmitModal: React.FC<SubmitModalProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  flaggedCount,
  isSubmitting,
  onCancel,
  onConfirmSubmit,
}) => {
  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;
  const hasIncomplete = unansweredCount > 0 || flaggedCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl max-w-md w-full shadow-xl overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 id="submit-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              Konfirmasi Pengumpulan Ujian
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Periksa kembali ringkasan pengerjaan Anda sebelum dikumpulkan.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Tutup konfirmasi pengumpulan"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus-ring cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-5">
          {/* Summary Grid */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
            <div className="p-3 sm:p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-medium text-emerald-800 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" aria-hidden="true" />
                <span>Terjawab</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-950">
                {answeredCount}
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-medium text-amber-900 mb-1">
                <Flag className="w-3.5 h-3.5 text-[#CA8A04]" aria-hidden="true" />
                <span>Ragu-ragu</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-950">
                {flaggedCount}
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-medium text-slate-600 mb-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Kosong</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900">
                {unansweredCount}
              </p>
            </div>
          </div>

          {hasIncomplete ? (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">
                Masih terdapat{' '}
                {unansweredCount > 0 && (
                  <strong className="tabular-nums">{unansweredCount} soal belum dijawab</strong>
                )}
                {unansweredCount > 0 && flaggedCount > 0 && ' dan '}
                {flaggedCount > 0 && (
                  <strong className="tabular-nums">{flaggedCount} soal ditandai ragu-ragu</strong>
                )}
                . Setelah dikumpulkan, jawaban tidak dapat diubah lagi.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">
                Seluruh <strong>{totalQuestions} soal</strong> telah terjawab. Setelah dikumpulkan,
                sesi ujian Anda akan ditutup.
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors focus-ring cursor-pointer"
          >
            Periksa Kembali
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirmSubmit}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer focus-ring"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{isSubmitting ? 'Mengumpulkan...' : 'Ya, Kumpulkan Ujian'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
