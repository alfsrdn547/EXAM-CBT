import React, { useState } from 'react';
import { AlertTriangle, CheckSquare, Maximize2, ShieldAlert, X } from 'lucide-react';
import { ExamConfig, StudentProfile } from '../types/exam';

interface RulesModalProps {
  isOpen: boolean;
  exam: ExamConfig;
  student: StudentProfile;
  onCancel: () => void;
  onConfirmStart: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  exam,
  student,
  onCancel,
  onConfirmStart,
}) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleStart = () => {
    if (!agreed) return;
    onConfirmStart();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl max-w-xl w-full shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-xs font-semibold text-[#2563EB] mb-1">
              Konfirmasi Sebelum Memulai Ujian
            </p>
            <h2 id="rules-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              Tata Tertib &amp; Persetujuan Peserta
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup modal peraturan"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus-ring cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Candidate & Exam Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="block text-xs text-slate-500">Peserta</span>
              <span className="font-semibold text-slate-900">{student.fullName}</span>
              <span className="block text-xs font-mono text-slate-600 tabular-nums">
                NIM {student.nim}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Paket Ujian</span>
              <span className="font-semibold text-slate-900">{exam.subject}</span>
              <span className="block text-xs text-slate-600 tabular-nums">
                {exam.totalQuestions || exam.questions.length} Soal · {exam.durationMinutes} Menit
              </span>
            </div>
          </div>

          {/* Rules List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>Peraturan Selama Sesi Berlangsung</span>
            </h3>
            <ol className="space-y-2.5 text-xs sm:text-sm text-slate-700">
              {exam.instructions.map((rule, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Fullscreen & Anti-Cheat Notice */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Memulai ujian akan mengaktifkan mode layar penuh (<em>fullscreen</em>) dan pencatatan
              aktivitas perpindahan tab secara otomatis.
            </p>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-5 h-5 sm:w-4 sm:h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] shrink-0"
            />
            <span className="text-xs sm:text-sm font-medium text-slate-800 select-none leading-relaxed">
              Saya telah membaca, memahami, dan menyetujui seluruh peraturan ujian di atas serta
              siap memulai waktu pengerjaan.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors focus-ring cursor-pointer"
          >
            Kembali ke Lobby
          </button>
          <button
            type="button"
            disabled={!agreed}
            onClick={handleStart}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer focus-ring"
          >
            <Maximize2 className="w-4 h-4" aria-hidden="true" />
            <span>Mulai Kerjakan Ujian</span>
            <CheckSquare className="w-4 h-4 hidden sm:inline" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
