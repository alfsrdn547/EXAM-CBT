import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { ViolationLog } from '../types/exam';

interface ViolationModalProps {
  latestViolation: ViolationLog | null;
  totalViolations: number;
  onAcknowledge: () => void;
}

export const ViolationModal: React.FC<ViolationModalProps> = ({
  latestViolation,
  totalViolations,
  onAcknowledge,
}) => {
  if (!latestViolation) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="violation-modal-title"
    >
      <div className="bg-white border border-red-200 rounded-xl max-w-md w-full shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 text-[#DC2626] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="violation-modal-title" className="text-base font-bold text-red-950">
              Peringatan Integritas Ujian
            </h2>
            <p className="text-xs text-red-700 font-medium tabular-nums">
              Catatan Pelanggaran #{totalViolations}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3 text-sm text-slate-700">
          <p className="leading-relaxed">{latestViolation.message}</p>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Jenis Aktivitas:</span>
              <span className="font-mono font-semibold text-slate-900">{latestViolation.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu Tercatat:</span>
              <span className="font-mono tabular-nums text-slate-900">
                {new Date(latestViolation.timestamp).toLocaleTimeString('id-ID')}
              </span>
            </div>
            {latestViolation.durationSeconds > 0 && (
              <div className="flex justify-between">
                <span>Durasi Meninggalkan Layar:</span>
                <span className="font-mono tabular-nums text-slate-900">
                  {latestViolation.durationSeconds} detik
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Aktivitas ini tercatat dalam log pengawas. Harap tetap berada pada layar ujian hingga
            selesai.
          </p>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onAcknowledge}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-ring"
          >
            Saya Mengerti, Lanjutkan Ujian
          </button>
        </div>
      </div>
    </div>
  );
};
