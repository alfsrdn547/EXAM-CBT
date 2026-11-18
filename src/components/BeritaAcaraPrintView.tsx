import React, { useMemo } from 'react';
import { Printer, X } from 'lucide-react';
import { ExamAttemptState, ExamConfig } from '../types/exam';
import { evaluateExamAnswers } from '../data/mockExam';

export interface BeritaAcaraConfig {
  institutionName: string;
  facultyLine: string;
  examDateText: string;
  locationText: string;
  cityName: string;
  registeredCount: number;
  proctorName: string;
  proctorNip: string;
  lecturerName: string;
  lecturerNip: string;
  specialNotes: string;
}

interface ComputedStats {
  registered: number;
  submittedCount: number;
  inProgressCount: number;
  absentCount: number;
  totalViolations: number;
}

function computeSessionStats(
  attempts: ExamAttemptState[],
  registeredCount: number,
): ComputedStats {
  const submittedCount = attempts.filter((a) => a.status === 'submitted').length;
  const inProgressCount = attempts.filter((a) => a.status === 'in_progress').length;
  const presentTotal = submittedCount + inProgressCount;
  const safeRegistered = Math.max(registeredCount, presentTotal);
  const absentCount = Math.max(0, safeRegistered - presentTotal);
  const totalViolations = attempts.reduce((sum, a) => sum + a.violations.length, 0);

  return {
    registered: safeRegistered,
    submittedCount,
    inProgressCount,
    absentCount,
    totalViolations,
  };
}

export const BeritaAcaraPrintSheet: React.FC<{
  exam: ExamConfig;
  attempts: ExamAttemptState[];
  config: BeritaAcaraConfig;
}> = ({ exam, attempts, config }) => {
  const stats = useMemo(
    () => computeSessionStats(attempts, config.registeredCount),
    [attempts, config.registeredCount],
  );

  const sortedAttempts = useMemo(
    () => [...attempts].sort((a, b) => a.student.nim.localeCompare(b.student.nim)),
    [attempts],
  );

  return (
    <div className="bg-white text-slate-900 text-[12px] leading-relaxed">
      {/* HALAMAN 1: BERITA ACARA PELAKSANAAN UJIAN */}
      <section className="print-page-break pb-6 mb-8 print:mb-0 print:pb-0">
        {/* Kop Surat Resmi */}
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-700">
            {config.institutionName}
          </p>
          <p className="text-sm font-bold tracking-wide uppercase text-slate-900 mt-0.5">
            {config.facultyLine}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Sistem Ujian Berbasis Komputer · ExamCore Computer-Based Testing
          </p>
        </div>

        {/* Judul Dokumen */}
        <div className="text-center mb-5">
          <h1 className="text-base font-bold uppercase tracking-wide text-slate-900 underline underline-offset-4">
            Berita Acara Pelaksanaan Ujian
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Nomor Token Sesi: <span className="font-mono font-bold text-slate-900">{exam.token}</span>
          </p>
        </div>

        {/* Narasi Pembuka & Identitas Ujian */}
        <p className="text-xs text-slate-800 mb-3 text-justify">
          Pada hari ini, <strong>{config.examDateText}</strong>, bertempat di{' '}
          <strong>{config.locationText}</strong>, telah dilaksanakan evaluasi ujian berbasis komputer
          dengan rincian pelaksanaan sebagai berikut:
        </p>

        <table className="w-full border border-slate-400 text-xs mb-5">
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="py-1.5 px-3 font-semibold bg-slate-50 w-44">Judul Ujian</td>
              <td className="py-1.5 px-3 font-semibold text-slate-900">{exam.title}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="py-1.5 px-3 font-semibold bg-slate-50">Mata Kuliah</td>
              <td className="py-1.5 px-3">{exam.subject}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="py-1.5 px-3 font-semibold bg-slate-50">Token Ujian</td>
              <td className="py-1.5 px-3 font-mono font-bold tracking-wider">{exam.token}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="py-1.5 px-3 font-semibold bg-slate-50">Hari / Tanggal</td>
              <td className="py-1.5 px-3">{config.examDateText}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="py-1.5 px-3 font-semibold bg-slate-50">Durasi &amp; Jumlah Soal</td>
              <td className="py-1.5 px-3 tabular-nums">
                {exam.durationMinutes} Menit · {exam.questions.length} Butir Soal (KKM:{' '}
                {exam.passingScore})
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-3 font-semibold bg-slate-50">Pengajar / Koordinator</td>
              <td className="py-1.5 px-3">{config.lecturerName}</td>
            </tr>
          </tbody>
        </table>

        {/* Statistik Kehadiran & Integritas Otomatis */}
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2">
          1. Ringkasan Statistik Peserta &amp; Pelanggaran Sesi
        </h2>
        <div className="grid grid-cols-5 border border-slate-400 divide-x divide-slate-400 mb-5 text-center">
          <div className="p-2.5">
            <span className="block text-[10px] text-slate-600">Terdaftar</span>
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {stats.registered}
            </span>
          </div>
          <div className="p-2.5">
            <span className="block text-[10px] text-slate-600">Hadir / Submitted</span>
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {stats.submittedCount}
            </span>
          </div>
          <div className="p-2.5">
            <span className="block text-[10px] text-slate-600">Sedang Mengerjakan</span>
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {stats.inProgressCount}
            </span>
          </div>
          <div className="p-2.5">
            <span className="block text-[10px] text-slate-600">Tidak Hadir</span>
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {stats.absentCount}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50">
            <span className="block text-[10px] text-slate-600">Total Pelanggaran</span>
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {stats.totalViolations}
            </span>
          </div>
        </div>

        {/* Catatan Kejadian Khusus */}
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2">
          2. Catatan Kejadian Khusus Selama Ujian
        </h2>
        <div className="border border-slate-400 p-3 min-h-[26mm] text-xs text-slate-800 whitespace-pre-wrap mb-5">
          {config.specialNotes.trim() ||
            'Tidak ada catatan kejadian khusus. Ujian berlangsung dengan tertib dan lancar.'}
        </div>

        {/* Kalimat Penutup */}
        <p className="text-xs text-slate-800 mb-8 text-justify">
          Demikian berita acara pelaksanaan ujian ini dibuat dengan sebenar-benarnya untuk
          dipergunakan sebagaimana mestinya. Lampiran rekapitulasi nilai peserta tercantum pada
          halaman berikutnya.
        </p>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 gap-10 text-xs pt-2">
          <div className="text-center">
            <p className="text-slate-700">&nbsp;</p>
            <p className="font-semibold text-slate-900">Pengawas Ujian,</p>
            <div className="h-16" />
            <p className="font-bold text-slate-900 underline underline-offset-2">
              {config.proctorName || '........................................'}
            </p>
            <p className="text-[11px] font-mono text-slate-600">
              NIP/NIDN. {config.proctorNip || '........................'}
            </p>
          </div>

          <div className="text-center">
            <p className="text-slate-700">
              {config.cityName}, {config.examDateText}
            </p>
            <p className="font-semibold text-slate-900">Pengajar / Penanggung Jawab,</p>
            <div className="h-16" />
            <p className="font-bold text-slate-900 underline underline-offset-2">
              {config.lecturerName || exam.lecturer}
            </p>
            <p className="text-[11px] font-mono text-slate-600">
              NIP/NIDN. {config.lecturerNip || '........................'}
            </p>
          </div>
        </div>
      </section>

      {/* HALAMAN 2: LAMPIRAN DAFTAR NILAI RESMI */}
      <section className="pt-2">
        <div className="border-b-2 border-slate-900 pb-2.5 mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Lampiran Berita Acara Pelaksanaan Ujian
            </p>
            <h2 className="text-sm font-bold uppercase text-slate-900">
              Daftar Rekapitulasi Nilai Peserta Ujian
            </h2>
          </div>
          <div className="text-right text-[11px]">
            <p className="font-semibold text-slate-900">{exam.title}</p>
            <p className="font-mono text-slate-600 tabular-nums">
              Token: {exam.token} · KKM: {exam.passingScore}
            </p>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-[11px]">
          <thead className="bg-slate-100 text-slate-900">
            <tr>
              <th className="border border-slate-400 py-2 px-2.5 text-center w-10">No</th>
              <th className="border border-slate-400 py-2 px-2.5 text-left w-28">NIM / ID</th>
              <th className="border border-slate-400 py-2 px-2.5 text-left">Nama Peserta</th>
              <th className="border border-slate-400 py-2 px-2.5 text-left w-32">Status Pengerjaan</th>
              <th className="border border-slate-400 py-2 px-2.5 text-center w-24">Pelanggaran</th>
              <th className="border border-slate-400 py-2 px-2.5 text-right w-20">Skor Akhir</th>
              <th className="border border-slate-400 py-2 px-2.5 text-center w-32">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {sortedAttempts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="border border-slate-400 py-6 px-4 text-center text-slate-500 italic"
                >
                  Belum ada data peserta yang tercatat pada sesi ujian ini.
                </td>
              </tr>
            ) : (
              sortedAttempts.map((att, idx) => {
                const summary =
                  att.status === 'submitted'
                    ? att.gradingSummary ??
                      evaluateExamAnswers(
                        exam.questions,
                        att.answers,
                        exam.passingScore,
                        att.questionOrder,
                        att.optionOrders,
                        att.essayScores,
                      )
                    : null;

                let statusLabel = 'Sedang Mengerjakan';
                let keterangan = 'BELUM SELESAI';
                let scoreDisplay = '—';

                if (att.status === 'submitted' && summary) {
                  scoreDisplay = String(summary.score);
                  if (summary.gradingStatus === 'pending_essay') {
                    statusLabel = 'Submitted (Esai Pending)';
                    keterangan = 'MENUNGGU KOREKSI';
                  } else {
                    statusLabel = 'Submitted';
                    keterangan = summary.passed ? 'LULUS' : 'REMEDIAL';
                  }
                }

                return (
                  <tr key={att.attemptId} className="print-avoid-break">
                    <td className="border border-slate-400 py-2 px-2.5 text-center font-mono tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-400 py-2 px-2.5 font-mono tabular-nums">
                      {att.student.nim}
                    </td>
                    <td className="border border-slate-400 py-2 px-2.5 font-semibold text-slate-900">
                      {att.student.fullName}
                    </td>
                    <td className="border border-slate-400 py-2 px-2.5">{statusLabel}</td>
                    <td className="border border-slate-400 py-2 px-2.5 text-center font-mono tabular-nums">
                      {att.violations.length}
                    </td>
                    <td className="border border-slate-400 py-2 px-2.5 text-right font-mono font-bold tabular-nums">
                      {scoreDisplay}
                    </td>
                    <td className="border border-slate-400 py-2 px-2.5 text-center font-bold">
                      {keterangan}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="mt-6 flex items-center justify-between text-[10px] text-slate-500">
          <span>Dicetak melalui ExamCore CBT Admin Console</span>
          <span className="font-mono tabular-nums">
            Total Tercatat: {sortedAttempts.length} Peserta
          </span>
        </div>
      </section>
    </div>
  );
};

interface BeritaAcaraModalProps {
  isOpen: boolean;
  exam: ExamConfig;
  attempts: ExamAttemptState[];
  config: BeritaAcaraConfig;
  onChangeConfig: (next: BeritaAcaraConfig) => void;
  onClose: () => void;
  onPrint: () => void;
}

export const BeritaAcaraModal: React.FC<BeritaAcaraModalProps> = ({
  isOpen,
  exam,
  attempts,
  config,
  onChangeConfig,
  onClose,
  onPrint,
}) => {
  if (!isOpen) return null;

  const stats = computeSessionStats(attempts, config.registeredCount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/60 backdrop-blur-[2px] print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="berita-acara-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="berita-acara-title" className="text-base sm:text-lg font-bold text-slate-900">
              Cetak Berita Acara &amp; Lampiran Daftar Nilai (A4)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dokumen resmi 2 halaman siap cetak ke PDF melalui dialog cetak browser.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup generator berita acara"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split Configuration & 2-Page Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Form */}
          <div className="lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-4 bg-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Data Resmi Berita Acara
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kop Surat Institusi
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
                Fakultas / Unit Penyelenggara
              </label>
              <input
                type="text"
                value={config.facultyLine}
                onChange={(e) => onChangeConfig({ ...config, facultyLine: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hari / Tanggal Ujian
                </label>
                <input
                  type="text"
                  value={config.examDateText}
                  onChange={(e) =>
                    onChangeConfig({ ...config, examDateText: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Peserta Terdaftar
                </label>
                <input
                  type="number"
                  min={attempts.length}
                  value={stats.registered}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      registeredCount: Math.max(attempts.length, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi / Ruang Ujian
                </label>
                <input
                  type="text"
                  value={config.locationText}
                  onChange={(e) =>
                    onChangeConfig({ ...config, locationText: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kota Tanda Tangan
                </label>
                <input
                  type="text"
                  value={config.cityName}
                  onChange={(e) => onChangeConfig({ ...config, cityName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Kejadian Khusus
              </label>
              <textarea
                rows={3}
                value={config.specialNotes}
                onChange={(e) => onChangeConfig({ ...config, specialNotes: e.target.value })}
                placeholder="Catat kendala teknis, keterlambatan, atau pelanggaran khusus..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pengawas
                </label>
                <input
                  type="text"
                  value={config.proctorName}
                  onChange={(e) =>
                    onChangeConfig({ ...config, proctorName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP / NIDN Pengawas
                </label>
                <input
                  type="text"
                  value={config.proctorNip}
                  onChange={(e) =>
                    onChangeConfig({ ...config, proctorNip: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pengajar
                </label>
                <input
                  type="text"
                  value={config.lecturerName}
                  onChange={(e) =>
                    onChangeConfig({ ...config, lecturerName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP / NIDN Pengajar
                </label>
                <input
                  type="text"
                  value={config.lecturerNip}
                  onChange={(e) =>
                    onChangeConfig({ ...config, lecturerNip: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          {/* Right Live 2-Page A4 Preview */}
          <div className="lg:col-span-8 bg-slate-100 p-4 sm:p-6 overflow-auto">
            <div className="max-w-[210mm] mx-auto space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Pratinjau Dokumen Resmi A4 (Halaman 1: Berita Acara · Halaman 2: Daftar Nilai)
                </span>
                <span className="font-mono tabular-nums">{attempts.length} Peserta</span>
              </div>

              <div className="bg-white border border-slate-300 shadow-sm p-6 sm:p-8 rounded-sm">
                <BeritaAcaraPrintSheet exam={exam} attempts={attempts} config={config} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
