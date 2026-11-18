import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import { StoredQuestion } from '../types/exam';
import {
  ParsedQuestionImportResult,
  downloadQuestionTemplateCsv,
  downloadQuestionTemplateXlsx,
  parseQuestionImportFile,
} from '../utils/questionImport';
import { MathText } from './MathText';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  examTitle: string;
  onClose: () => void;
  onImportValidQuestions: (questions: StoredQuestion[]) => void;
}

type RowFilter = 'all' | 'valid' | 'invalid';

export const ImportQuestionsModal: React.FC<ImportQuestionsModalProps> = ({
  isOpen,
  examTitle,
  onClose,
  onImportValidQuestions,
}) => {
  const [defaultTopic, setDefaultTopic] = useState('Materi Umum');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedQuestionImportResult | null>(null);
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const parsed = await parseQuestionImportFile(file, defaultTopic);
      setResult(parsed);
      setRowFilter('all');
    } catch (err) {
      setResult(null);
      setParseError(
        err instanceof Error ? err.message : 'Gagal memproses file. Pastikan format sesuai template.',
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      void processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (!result) return;
    const validQuestions = result.rows
      .filter((r) => r.isValid && r.question)
      .map((r) => r.question!);
    if (validQuestions.length === 0) return;
    onImportValidQuestions(validQuestions);
    setResult(null);
    setParseError(null);
    onClose();
  };

  const handleResetAndClose = () => {
    setResult(null);
    setParseError(null);
    onClose();
  };

  const visibleRows =
    result?.rows.filter((r) => {
      if (rowFilter === 'valid') return r.isValid;
      if (rowFilter === 'invalid') return !r.isValid;
      return true;
    }) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-[2px] print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-questions-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 id="import-questions-title" className="text-base sm:text-lg font-bold text-slate-900">
              Import Massal Bank Soal (CSV &amp; Excel)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target ujian: <strong className="text-slate-800">{examTitle}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Tutup modal import soal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Template Downloads & Column Specification */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                  <span>Struktur Kolom Template Standar</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mendukung soal Pilihan Ganda (<code className="font-mono">multiple_choice</code>),
                  Esai (<code className="font-mono">essay</code>), serta rumus LaTeX (
                  <code className="font-mono">$...$</code> / <code className="font-mono">$$...$$</code>).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadQuestionTemplateXlsx}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#16A34A]" aria-hidden="true" />
                  <span>Download Template Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={downloadQuestionTemplateCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                  <span>Download Template CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-flex flex-wrap gap-1.5 text-[11px] font-mono text-slate-700">
                {[
                  'question_type',
                  'content',
                  'option_a',
                  'option_b',
                  'option_c',
                  'option_d',
                  'correct_answer',
                  'weight',
                ].map((col) => (
                  <span
                    key={col}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
              <label htmlFor="import-default-topic" className="text-xs font-semibold text-slate-700">
                Topik Default (bila kolom topik tidak ada):
              </label>
              <input
                id="import-default-topic"
                type="text"
                value={defaultTopic}
                onChange={(e) => setDefaultTopic(e.target.value)}
                placeholder="Materi Umum"
                className="w-full sm:w-64 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          {!result && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-[#2563EB] bg-blue-50/70'
                  : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <Upload className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {isParsing
                  ? 'Memproses dan memvalidasi file soal...'
                  : 'Seret & lepas file CSV atau Excel (.xlsx) di sini'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Atau <span className="text-[#2563EB] font-semibold underline">klik untuk memilih file</span> dari perangkat Anda
              </p>
            </div>
          )}

          {parseError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" aria-hidden="true" />
              <p>{parseError}</p>
            </div>
          )}

          {/* Validation & Preview Table */}
          {result && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">{result.fileName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{result.rows.length} baris dibaca</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-[#16A34A] tabular-nums">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>{result.validCount} Baris Valid</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#DC2626] tabular-nums">
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                      <span>{result.invalidCount} Baris Bermasalah</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(
                      [
                        { key: 'all', label: `Semua (${result.rows.length})` },
                        { key: 'valid', label: `Valid (${result.validCount})` },
                        { key: 'invalid', label: `Error (${result.invalidCount})` },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setRowFilter(tab.key)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          rowFilter === tab.key
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setParseError(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Ganti File
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full min-w-[780px] text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold w-14">Baris</th>
                        <th className="py-2.5 px-3 font-semibold w-44">Status Validasi</th>
                        <th className="py-2.5 px-3 font-semibold w-28">Tipe</th>
                        <th className="py-2.5 px-3 font-semibold">Pratinjau Soal (LaTeX)</th>
                        <th className="py-2.5 px-3 font-semibold w-44">Kunci / Rubrik</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-20">Bobot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={row.isValid ? 'bg-white' : 'bg-red-50/40'}
                        >
                          <td className="py-3 px-3 font-mono tabular-nums text-slate-500 align-top">
                            #{row.rowNumber}
                          </td>
                          <td className="py-3 px-3 align-top">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-[#16A34A]">
                                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                                <span>Siap Diimpor</span>
                              </span>
                            ) : (
                              <div className="space-y-1 text-[#DC2626]">
                                <span className="inline-flex items-center gap-1.5 font-semibold">
                                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                  <span>Bermasalah</span>
                                </span>
                                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-700 leading-snug">
                                  {row.errors.map((errMsg, i) => (
                                    <li key={i}>{errMsg}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top font-mono text-[11px] text-slate-700">
                            {row.questionTypeRaw || '—'}
                          </td>
                          <td className="py-3 px-3 align-top space-y-1.5 max-w-sm">
                            <div className="text-slate-900 leading-relaxed break-words">
                              {row.content ? (
                                <MathText text={row.content} />
                              ) : (
                                <span className="italic text-slate-400">(Teks soal kosong)</span>
                              )}
                            </div>
                            {row.questionType === 'multiple_choice' && (
                              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                                <span className="truncate">A. {row.optionA || '—'}</span>
                                <span className="truncate">B. {row.optionB || '—'}</span>
                                <span className="truncate">C. {row.optionC || '—'}</span>
                                <span className="truncate">D. {row.optionD || '—'}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top text-slate-700">
                            {row.questionType === 'multiple_choice' ? (
                              <span className="font-mono font-bold text-slate-900">
                                {row.correctAnswerRaw ? row.correctAnswerRaw.toUpperCase() : '—'}
                              </span>
                            ) : (
                              <span className="line-clamp-3 text-[11px] text-slate-600">
                                {row.correctAnswerRaw || '(Tanpa rubrik)'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top text-right font-mono tabular-nums font-semibold text-slate-900">
                            {row.weight > 0 ? row.weight : row.weightRaw || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500">
            {result && result.invalidCount > 0
              ? 'Baris bermasalah akan dilewati otomatis saat Anda mengimpor baris yang valid.'
              : 'Soal yang diimpor langsung tersimpan di Bank Soal dan siap dikerjakan peserta.'}
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!result || result.validCount === 0}
              onClick={handleConfirmImport}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              {result ? `Import ${result.validCount} Soal Valid` : 'Import Soal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
