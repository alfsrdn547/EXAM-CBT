import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  Plus,
  Printer,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { ExamAttemptState, ExamConfig } from '../types/exam';
import {
  ParticipantCardItem,
  downloadParticipantTemplateCsv,
  parseParticipantImportFile,
} from '../utils/questionImport';
import { QrCodeSvg } from './QrCodeSvg';

export interface ParticipantCardsConfig {
  institutionName: string;
  scheduleText: string;
  participants: ParticipantCardItem[];
}

function chunkIntoPages<T>(items: T[], size = 8): T[][] {
  if (items.length === 0) return [];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

export const ParticipantCardsPrintSheet: React.FC<{
  exam: ExamConfig;
  config: ParticipantCardsConfig;
}> = ({ exam, config }) => {
  const pages = useMemo(() => chunkIntoPages(config.participants, 8), [config.participants]);

  return (
    <div className="bg-white text-slate-900">
      {pages.map((pageItems, pageIndex) => (
        <div
          key={pageIndex}
          className={`w-full bg-white ${
            pageIndex < pages.length - 1 ? 'print-page-break mb-8 print:mb-0' : ''
          }`}
        >
          {/* Page Header (subtle metadata line) */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pb-2 mb-2 border-b border-slate-300">
            <span className="font-semibold text-slate-700">
              Kartu Peserta Ujian CBT · {exam.title}
            </span>
            <span className="font-mono tabular-nums">
              Halaman {pageIndex + 1} / {pages.length}
            </span>
          </div>

          {/* 2 Columns x 4 Rows Grid per A4 Page */}
          <div className="grid grid-cols-2 gap-3">
            {pageItems.map((participant) => (
              <div
                key={participant.id}
                className="print-avoid-break border border-dashed border-slate-400 rounded-lg p-3 bg-white flex flex-col justify-between min-h-[60mm]"
              >
                {/* Card Institution & Exam Header */}
                <div className="border-b border-slate-300 pb-2 mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-600 truncate">
                    {config.institutionName || 'EXAMCORE · PORTAL UJIAN CBT'}
                  </p>
                  <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-1 mt-0.5">
                    {exam.title}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate">{exam.subject}</p>
                </div>

                {/* Participant Details + QR Token */}
                <div className="flex items-center justify-between gap-2.5 flex-1">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div>
                      <span className="block text-[9px] text-slate-500">Nama Peserta</span>
                      <span className="block text-xs font-bold text-slate-900 truncate">
                        {participant.fullName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <span className="block text-[9px] text-slate-500">NIM / ID</span>
                        <span className="block text-[11px] font-mono font-bold tabular-nums text-slate-900 truncate">
                          {participant.nim}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-500">Ruang / Sesi</span>
                        <span className="block text-[10px] font-medium text-slate-800 truncate">
                          {participant.roomSession}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <div className="px-2 py-1 rounded bg-slate-100 border border-slate-300">
                        <span className="block text-[8px] font-semibold uppercase text-slate-500">
                          Token Ujian
                        </span>
                        <span className="font-mono text-xs font-bold tracking-widest text-slate-900">
                          {exam.token}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9px] text-slate-500">Jadwal &amp; Durasi</span>
                        <span className="block text-[10px] font-medium text-slate-800 truncate tabular-nums">
                          {config.scheduleText} · {exam.durationMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code with Token */}
                  <div className="flex flex-col items-center shrink-0 border border-slate-200 rounded p-1 bg-white">
                    <QrCodeSvg value={exam.token} size={58} />
                    <span className="text-[8px] font-mono font-semibold text-slate-600 mt-0.5">
                      {exam.token}
                    </span>
                  </div>
                </div>

                {/* Footer Cut Line */}
                <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500">
                  <span>Bawa kartu ini saat ujian berlangsung</span>
                  <span className="font-mono">ExamCore CBT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface ParticipantCardsModalProps {
  isOpen: boolean;
  exam: ExamConfig;
  monitoringAttempts: ExamAttemptState[];
  config: ParticipantCardsConfig;
  onChangeConfig: (next: ParticipantCardsConfig) => void;
  onClose: () => void;
  onPrint: () => void;
}

export const ParticipantCardsModal: React.FC<ParticipantCardsModalProps> = ({
  isOpen,
  exam,
  monitoringAttempts,
  config,
  onChangeConfig,
  onClose,
  onPrint,
}) => {
  const [newName, setNewName] = useState('');
  const [newNim, setNewNim] = useState('');
  const [newRoom, setNewRoom] = useState('Lab Komputer 01 · Sesi 1');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newNim.trim()) return;
    const item: ParticipantCardItem = {
      id: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      fullName: newName.trim(),
      nim: newNim.trim(),
      roomSession: newRoom.trim() || 'Lab Komputer 01 · Sesi 1',
    };
    onChangeConfig({
      ...config,
      participants: [...config.participants, item],
    });
    setNewName('');
    setNewNim('');
  };

  const handleImportRoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setImportError(null);
      const imported = await parseParticipantImportFile(file);
      onChangeConfig({
        ...config,
        participants: [...config.participants, ...imported],
      });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal membaca file daftar peserta.');
    }
  };

  const handleSyncFromMonitoring = () => {
    const existingNims = new Set(config.participants.map((p) => p.nim));
    const additions: ParticipantCardItem[] = monitoringAttempts
      .filter((att) => !existingNims.has(att.student.nim))
      .map((att, idx) => ({
        id: `pc-mon-${att.attemptId}`,
        fullName: att.student.fullName,
        nim: att.student.nim,
        roomSession: `Lab CBT 0${(idx % 2) + 1} · Sesi 1`,
      }));
    if (additions.length > 0) {
      onChangeConfig({
        ...config,
        participants: [...config.participants, ...additions],
      });
    }
  };

  const handleRemoveParticipant = (id: string) => {
    onChangeConfig({
      ...config,
      participants: config.participants.filter((p) => p.id !== id),
    });
  };

  const totalPages = Math.max(1, Math.ceil(config.participants.length / 8));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/60 backdrop-blur-[2px] print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cards-generator-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="cards-generator-title" className="text-base sm:text-lg font-bold text-slate-900">
              Generator Cetak Kartu Peserta Ujian (A4)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Tata letak 2 kolom × 4 baris per halaman A4 ({config.participants.length} peserta ·{' '}
              {totalPages} halaman)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={config.participants.length === 0}
              onClick={onPrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup generator kartu peserta"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split Editor & Live A4 Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Configuration Column */}
          <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-5 bg-white">
            {/* Institution & Schedule */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Informasi Header Kartu
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Institusi / Fakultas
                </label>
                <input
                  type="text"
                  value={config.institutionName}
                  onChange={(e) =>
                    onChangeConfig({ ...config, institutionName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jadwal / Tanggal Pelaksanaan
                </label>
                <input
                  type="text"
                  value={config.scheduleText}
                  onChange={(e) =>
                    onChangeConfig({ ...config, scheduleText: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Add Participant Manually */}
            <form onSubmit={handleAddParticipant} className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tambah Peserta Manual
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
                <input
                  type="text"
                  value={newNim}
                  onChange={(e) => setNewNim(e.target.value)}
                  placeholder="NIM / NIS / ID Peserta"
                  className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="Ruang / Sesi (mis: Lab 01 · Sesi 1)"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
                <button
                  type="submit"
                  disabled={!newName.trim() || !newNim.trim()}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tambah</span>
                </button>
              </div>
            </form>

            {/* Batch Import / Sync */}
            <div className="space-y-2.5 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Import Massal Daftar Peserta
                </h3>
                <button
                  type="button"
                  onClick={downloadParticipantTemplateCsv}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>Template CSV</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImportRoster}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Import CSV / Excel</span>
                </button>
                {monitoringAttempts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncFromMonitoring}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ambil dari Data Sesi ({monitoringAttempts.length})</span>
                  </button>
                )}
              </div>

              {importError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                  {importError}
                </p>
              )}
            </div>

            {/* Participant List */}
            <div className="space-y-2 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  Daftar Siap Cetak ({config.participants.length})
                </span>
                {config.participants.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ ...config, participants: [] })}
                    className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    Kosongkan Semua
                  </button>
                )}
              </div>

              {config.participants.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                  Belum ada peserta. Tambahkan peserta di atas atau impor file CSV/Excel.
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {config.participants.map((p, idx) => (
                    <div
                      key={p.id}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {idx + 1}. {p.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                          {p.nim} · {p.roomSession}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(p.id)}
                        aria-label={`Hapus ${p.fullName}`}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Live A4 Preview Column */}
          <div className="lg:col-span-7 bg-slate-100 p-4 sm:p-6 overflow-auto">
            <div className="max-w-[210mm] mx-auto space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Pratinjau Kertas A4 (2 Kolom × 4 Baris)</span>
                <span className="font-mono tabular-nums">Token QR: {exam.token}</span>
              </div>

              {config.participants.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500">
                  Pratinjau kartu peserta akan muncul di sini setelah minimal 1 peserta ditambahkan.
                </div>
              ) : (
                <div className="bg-white border border-slate-300 shadow-sm p-6 rounded-sm">
                  <ParticipantCardsPrintSheet exam={exam} config={config} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
