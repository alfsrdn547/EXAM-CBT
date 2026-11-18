import React, { useEffect, useState } from 'react';
import { ImageOff, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxModalProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  imageUrl,
  caption,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setScale(1);
    setHasError(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Perbesar Gambar Soal"
      onClick={onClose}
    >
      {/* Top Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-white max-w-4xl w-full mx-auto shrink-0"
      >
        <p className="text-xs sm:text-sm font-medium text-slate-200 truncate">
          {caption || 'Tampilan Gambar Diperbesar'}
        </p>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.25).toFixed(2))))}
            aria-label="Perkecil gambar"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono tabular-nums text-xs text-slate-300 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.25).toFixed(2))))}
            aria-label="Perbesar gambar"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale(1)}
            aria-label="Reset zoom"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup lightbox gambar"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-white text-slate-900 hover:bg-slate-200 transition-colors ml-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Canvas */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 overflow-auto flex items-center justify-center my-3 max-w-5xl w-full mx-auto"
      >
        {hasError ? (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center text-slate-300 space-y-2">
            <ImageOff className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-medium">Gambar tidak dapat dimuat saat ini.</p>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={caption || 'Gambar soal diperbesar'}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
            className="max-w-full max-h-[78vh] object-contain rounded-lg bg-white p-2 shadow-2xl transition-transform duration-150"
          />
        )}
      </div>
    </div>
  );
};
