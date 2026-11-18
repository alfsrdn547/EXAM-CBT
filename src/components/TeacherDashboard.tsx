import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlignLeft,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  ImageOff,
  KeyRound,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Shuffle,
  Sigma,
  Trash2,
  Upload,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import { ExamAttemptState, ExamConfig, QuestionType, StoredQuestion } from '../types/exam';
import {
  DEFAULT_EXAM_INSTRUCTIONS,
  countAnsweredQuestions,
  evaluateExamAnswers,
} from '../data/mockExam';
import {
  exportMonitoringToCsv,
  fileToDataUrl,
  generateExamToken,
  getMonitoringAttemptsByExam,
  upsertMonitoringAttempt,
} from '../utils/examStore';
import {
  downloadQuestionTemplateCsv,
  downloadQuestionTemplateXlsx,
} from '../utils/questionImport';
import { MathText } from './MathText';
import { ImageLightboxModal } from './ImageLightboxModal';
import { ImportQuestionsModal } from './ImportQuestionsModal';
import {
  ParticipantCardsConfig,
  ParticipantCardsModal,
  ParticipantCardsPrintSheet,
} from './ParticipantCardsPrintView';
import {
  BeritaAcaraConfig,
  BeritaAcaraModal,
  BeritaAcaraPrintSheet,
} from './BeritaAcaraPrintView';

interface TeacherDashboardProps {
  exams: ExamConfig[];
  onSaveExams: (nextExams: ExamConfig[]) => void;
  onTestAsStudentWithToken: (token: string) => void;
}

type TeacherTab = 'bank_soal' | 'monitoring';
type MonitoringFilter = 'all' | 'in_progress' | 'submitted';

interface QuestionDraft {
  id?: string;
  type: QuestionType;
  topic: string;
  prompt: string;
  image_url: string;
  codeSnippet: string;
  weight: number;
  rubric: string;
  options: { id: string; label: string; text: string; image_url?: string }[];
  correctOptionId: string;
}

const LATEX_TEMPLATES: { label: string; snippet: string; wrapInline?: boolean; title: string }[] = [
  { label: 'Inline $...$', snippet: '$x$', title: 'Sisipkan rumus inline' },
  { label: 'Blok $$...$$', snippet: '\n$$\n\n$$\n', title: 'Sisipkan rumus blok terpisah' },
  { label: 'a/b', snippet: '\\frac{a}{b}', wrapInline: true, title: 'Pecahan (\\frac{a}{b})' },
  { label: '√x', snippet: '\\sqrt{x}', wrapInline: true, title: 'Akar kuadrat (\\sqrt{x})' },
  { label: 'x²', snippet: 'x^{2}', wrapInline: true, title: 'Pangkat (x^{2})' },
  { label: '∫', snippet: '\\int_{a}^{b} f(x)\\,dx', wrapInline: true, title: 'Integral tentu' },
  { label: 'Σ', snippet: '\\sum_{i=1}^{n} x_i', wrapInline: true, title: 'Notasi Sigma' },
  {
    label: 'Matriks',
    snippet: '\n$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$\n',
    title: 'Matriks 2×2',
  },
];

function createEmptyOptions() {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return [
    { id: `opt-${uid}-a`, label: 'A', text: '', image_url: '' },
    { id: `opt-${uid}-b`, label: 'B', text: '', image_url: '' },
    { id: `opt-${uid}-c`, label: 'C', text: '', image_url: '' },
    { id: `opt-${uid}-d`, label: 'D', text: '', image_url: '' },
  ];
}

function createEmptyQuestionDraft(type: QuestionType = 'multiple_choice'): QuestionDraft {
  const options = createEmptyOptions();
  return {
    type,
    topic: '',
    prompt: '',
    image_url: '',
    codeSnippet: '',
    weight: type === 'essay' ? 5 : 1,
    rubric: '',
    options,
    correctOptionId: options[0].id,
  };
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  exams,
  onSaveExams,
  onTestAsStudentWithToken,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('bank_soal');
  const [selectedExamId, setSelectedExamId] = useState<string>(() => exams[0]?.id ?? '');

  // Exam creation / edit state
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [editingExamMetaId, setEditingExamMetaId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [examLecturer, setExamLecturer] = useState('Dr. Hendra Wijaya, M.Kom.');
  const [examDuration, setExamDuration] = useState(60);
  const [examPassingScore, setExamPassingScore] = useState(70);
  const [examToken, setExamToken] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [examStatus, setExamStatus] = useState<'published' | 'draft'>('published');
  const [examFormError, setExamFormError] = useState<string | null>(null);

  // Question editor state
  const [isQuestionEditorOpen, setIsQuestionEditorOpen] = useState(false);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(createEmptyQuestionDraft);
  const [questionFormError, setQuestionFormError] = useState<string | null>(null);
  const [openOptionImageIdx, setOpenOptionImageIdx] = useState<number | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [previewImgError, setPreviewImgError] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption: string } | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Token copied notice
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Monitoring state
  const [monitoringRefreshTick, setMonitoringRefreshTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MonitoringFilter>('all');
  const [inspectViolationAttempt, setInspectViolationAttempt] =
    useState<ExamAttemptState | null>(null);
  const [gradingEssayAttempt, setGradingEssayAttempt] =
    useState<ExamAttemptState | null>(null);
  const [essayScoreInputs, setEssayScoreInputs] = useState<Record<string, string>>({});

  // Bulk Import & Print Generators state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [importSuccessNotice, setImportSuccessNotice] = useState<string | null>(null);

  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);
  const [cardsConfig, setCardsConfig] = useState<ParticipantCardsConfig>({
    institutionName: 'UNIVERSITAS TEKNOLOGI NUSANTARA · FAKULTAS ILMU KOMPUTER',
    scheduleText: 'Hari Ini · 08.00 – 10.00 WIB',
    participants: [],
  });

  const [isBeritaAcaraModalOpen, setIsBeritaAcaraModalOpen] = useState(false);
  const [beritaAcaraConfig, setBeritaAcaraConfig] = useState<BeritaAcaraConfig>({
    institutionName: 'KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI',
    facultyLine: 'UNIVERSITAS TEKNOLOGI NUSANTARA · FAKULTAS ILMU KOMPUTER',
    examDateText: new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    locationText: 'Lab CBT Terpadu & Sesi Daring ExamCore',
    cityName: 'Jakarta',
    registeredCount: 0,
    proctorName: 'Andi Pratama, S.Kom.',
    proctorNip: '198904122015041002',
    lecturerName: 'Dr. Hendra Wijaya, M.Kom.',
    lecturerNip: '198207182008121001',
    specialNotes: '',
  });

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === selectedExamId) ?? exams[0],
    [exams, selectedExamId],
  );

  const monitoringAttempts = useMemo(() => {
    void monitoringRefreshTick;
    if (!selectedExam) return [];
    return getMonitoringAttemptsByExam(selectedExam.id);
  }, [selectedExam, monitoringRefreshTick]);

  const filteredAttempts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monitoringAttempts.filter((att) => {
      if (statusFilter !== 'all' && att.status !== statusFilter) return false;
      if (!q) return true;
      return (
        att.student.fullName.toLowerCase().includes(q) ||
        att.student.nim.toLowerCase().includes(q)
      );
    });
  }, [monitoringAttempts, searchQuery, statusFilter]);

  const monitoringStats = useMemo(() => {
    const total = monitoringAttempts.length;
    const inProgress = monitoringAttempts.filter((a) => a.status === 'in_progress').length;
    const submitted = monitoringAttempts.filter((a) => a.status === 'submitted');
    const avgScore =
      submitted.length > 0
        ? Math.round(
            submitted.reduce((sum, a) => sum + (a.gradingSummary?.score ?? 0), 0) /
              submitted.length,
          )
        : null;
    const totalViolations = monitoringAttempts.reduce(
      (sum, a) => sum + a.violations.length,
      0,
    );
    return {
      total,
      inProgress,
      submittedCount: submitted.length,
      avgScore,
      totalViolations,
    };
  }, [monitoringAttempts]);

  // Open new exam form
  const openCreateExamForm = () => {
    setEditingExamMetaId(null);
    setExamTitle('');
    setExamSubject('');
    setExamLecturer('Dr. Hendra Wijaya, M.Kom.');
    setExamDuration(60);
    setExamPassingScore(70);
    setExamToken(generateExamToken(exams.map((e) => e.token)));
    setShuffleQuestions(true);
    setShuffleOptions(true);
    setExamStatus('published');
    setExamFormError(null);
    setIsCreatingExam(true);
  };

  // Open edit exam metadata form
  const openEditExamForm = (exam: ExamConfig) => {
    setEditingExamMetaId(exam.id);
    setExamTitle(exam.title);
    setExamSubject(exam.subject);
    setExamLecturer(exam.lecturer);
    setExamDuration(exam.durationMinutes);
    setExamPassingScore(exam.passingScore);
    setExamToken(exam.token);
    setShuffleQuestions(exam.shuffleQuestions);
    setShuffleOptions(exam.shuffleOptions);
    setExamStatus(exam.status);
    setExamFormError(null);
    setIsCreatingExam(true);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedTitle = examTitle.trim();
    const cleanedToken = examToken.trim().toUpperCase();

    if (!cleanedTitle) {
      setExamFormError('Judul ujian wajib diisi.');
      return;
    }
    if (!cleanedToken || cleanedToken.length < 4) {
      setExamFormError('Token ujian minimal 4 karakter alfanumerik.');
      return;
    }

    const duplicate = exams.find(
      (item) => item.token.toUpperCase() === cleanedToken && item.id !== editingExamMetaId,
    );
    if (duplicate) {
      setExamFormError(`Token "${cleanedToken}" sudah digunakan oleh ujian lain.`);
      return;
    }

    if (editingExamMetaId) {
      const nextExams = exams.map((item) =>
        item.id === editingExamMetaId
          ? {
              ...item,
              title: cleanedTitle,
              subject: examSubject.trim() || 'Mata Kuliah Umum',
              lecturer: examLecturer.trim() || 'Tim Pengajar',
              durationMinutes: Math.max(5, Number(examDuration) || 60),
              passingScore: Math.min(100, Math.max(0, Number(examPassingScore) || 70)),
              token: cleanedToken,
              shuffleQuestions,
              shuffleOptions,
              status: examStatus,
            }
          : item,
      );
      onSaveExams(nextExams);
      setIsCreatingExam(false);
      setEditingExamMetaId(null);
      return;
    }

    const newId = `exam-${Date.now()}`;
    const createdExam: ExamConfig = {
      id: newId,
      token: cleanedToken,
      title: cleanedTitle,
      subject: examSubject.trim() || 'Mata Kuliah Umum',
      lecturer: examLecturer.trim() || 'Tim Pengajar',
      durationMinutes: Math.max(5, Number(examDuration) || 60),
      totalQuestions: 0,
      passingScore: Math.min(100, Math.max(0, Number(examPassingScore) || 70)),
      scheduleWindow: 'Aktif Hari Ini',
      shuffleQuestions,
      shuffleOptions,
      status: examStatus,
      instructions: DEFAULT_EXAM_INSTRUCTIONS,
      questions: [],
    };

    const nextExams = [createdExam, ...exams];
    onSaveExams(nextExams);
    setSelectedExamId(newId);
    setIsCreatingExam(false);
    setIsQuestionEditorOpen(true);
    setQuestionDraft(createEmptyQuestionDraft());
  };

  // Question CRUD
  const openAddQuestion = () => {
    setQuestionDraft(createEmptyQuestionDraft('multiple_choice'));
    setQuestionFormError(null);
    setImageUploadError(null);
    setPreviewImgError(false);
    setOpenOptionImageIdx(null);
    setIsQuestionEditorOpen(true);
  };

  const openEditQuestion = (q: StoredQuestion) => {
    const qType: QuestionType =
      q.type === 'essay' || q.question_type === 'essay' ? 'essay' : 'multiple_choice';
    const fallbackOptions =
      q.options && q.options.length > 0 ? q.options.map((o) => ({ ...o, image_url: o.image_url ?? '' })) : createEmptyOptions();
    setQuestionDraft({
      id: q.id,
      type: qType,
      topic: q.topic,
      prompt: q.prompt,
      image_url: q.image_url ?? '',
      codeSnippet: q.codeSnippet ?? '',
      weight: q.weight,
      rubric: q.rubric ?? '',
      options: fallbackOptions,
      correctOptionId: q.correctOptionId || fallbackOptions[0].id,
    });
    setQuestionFormError(null);
    setImageUploadError(null);
    setPreviewImgError(false);
    setOpenOptionImageIdx(null);
    setIsQuestionEditorOpen(true);
  };

  const handleInsertLatex = (snippet: string, wrapInline?: boolean) => {
    const textarea = promptTextareaRef.current;
    const current = questionDraft.prompt;

    if (!textarea) {
      const addition = wrapInline ? `$${snippet}$` : snippet;
      setQuestionDraft((prev) => ({ ...prev, prompt: `${prev.prompt}${addition}` }));
      return;
    }

    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);

    // Cek apakah posisi kursor sudah berada di dalam delimiter $...$ atau $$...$$
    const unescapedDollarsBefore = (before.match(/(?<!\\)\$/g) || []).length;
    const isInsideMath = unescapedDollarsBefore % 2 === 1;
    const textToInsert = wrapInline && !isInsideMath ? `$${snippet}$` : snippet;

    const updated = `${before}${textToInsert}${after}`;
    setQuestionDraft((prev) => ({ ...prev, prompt: updated }));

    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextPos = start + textToInsert.length;
      textarea.setSelectionRange(nextPos, nextPos);
    });
  };

  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageUploadError('File harus berupa gambar (PNG, JPG, WebP, atau SVG).');
      return;
    }
    try {
      setImageUploadError(null);
      setPreviewImgError(false);
      const dataUrl = await fileToDataUrl(file);
      setQuestionDraft((prev) => ({ ...prev, image_url: dataUrl }));
    } catch {
      setImageUploadError('Gagal memproses file gambar. Silakan coba lagi.');
    }
  };

  const handleOptionImageUpload = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageUploadError('File opsi harus berupa gambar (PNG, JPG, WebP, atau SVG).');
      return;
    }
    try {
      setImageUploadError(null);
      const dataUrl = await fileToDataUrl(file);
      setQuestionDraft((prev) => ({
        ...prev,
        options: prev.options.map((o, i) => (i === idx ? { ...o, image_url: dataUrl } : o)),
      }));
    } catch {
      setImageUploadError('Gagal memproses gambar opsi.');
    }
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    const cleanedPrompt = questionDraft.prompt.trim();
    if (!cleanedPrompt) {
      setQuestionFormError('Teks pertanyaan tidak boleh kosong.');
      return;
    }

    const isEssay = questionDraft.type === 'essay';
    if (!isEssay && questionDraft.options.some((o) => !o.text.trim() && !o.image_url?.trim())) {
      setQuestionFormError('Seluruh opsi jawaban (A–D) harus memiliki teks atau gambar.');
      return;
    }

    const cleanedOptions = isEssay
      ? []
      : questionDraft.options.map((o) => ({
          id: o.id,
          label: o.label,
          text: o.text.trim(),
          image_url: o.image_url?.trim() || undefined,
        }));
    const cleanedQuestionImage = questionDraft.image_url.trim() || undefined;
    const cleanedRubric = isEssay ? questionDraft.rubric.trim() || undefined : undefined;

    const existingList = selectedExam.questions;
    let updatedQuestions: StoredQuestion[];

    if (questionDraft.id) {
      updatedQuestions = existingList.map((q) =>
        q.id === questionDraft.id
          ? {
              ...q,
              type: questionDraft.type,
              question_type: questionDraft.type,
              topic: questionDraft.topic.trim() || 'Umum',
              prompt: cleanedPrompt,
              image_url: cleanedQuestionImage,
              codeSnippet: questionDraft.codeSnippet.trim() || undefined,
              weight: Math.max(1, Number(questionDraft.weight) || 1),
              rubric: cleanedRubric,
              options: cleanedOptions,
              correctOptionId: isEssay ? '' : questionDraft.correctOptionId,
            }
          : q,
      );
    } else {
      const newQuestion: StoredQuestion = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        order: existingList.length + 1,
        topic: questionDraft.topic.trim() || 'Umum',
        type: questionDraft.type,
        question_type: questionDraft.type,
        prompt: cleanedPrompt,
        image_url: cleanedQuestionImage,
        codeSnippet: questionDraft.codeSnippet.trim() || undefined,
        weight: Math.max(1, Number(questionDraft.weight) || 1),
        rubric: cleanedRubric,
        options: cleanedOptions,
        correctOptionId: isEssay ? '' : questionDraft.correctOptionId,
      };
      updatedQuestions = [...existingList, newQuestion];
    }

    const nextExams = exams.map((ex) =>
      ex.id === selectedExam.id
        ? {
            ...ex,
            questions: updatedQuestions.map((q, idx) => ({ ...q, order: idx + 1 })),
            totalQuestions: updatedQuestions.length,
          }
        : ex,
    );

    onSaveExams(nextExams);
    setIsQuestionEditorOpen(false);
    setQuestionFormError(null);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!selectedExam) return;
    const filtered = selectedExam.questions
      .filter((q) => q.id !== questionId)
      .map((q, idx) => ({ ...q, order: idx + 1 }));

    const nextExams = exams.map((ex) =>
      ex.id === selectedExam.id
        ? {
            ...ex,
            questions: filtered,
            totalQuestions: filtered.length,
          }
        : ex,
    );
    onSaveExams(nextExams);
  };

  const handleCopyToken = (token: string, examId: string) => {
    navigator.clipboard?.writeText(token).catch(() => {});
    setCopiedTokenId(examId);
    window.setTimeout(() => setCopiedTokenId(null), 1800);
  };

  const handleImportValidQuestions = (importedQuestions: StoredQuestion[]) => {
    if (!selectedExam || importedQuestions.length === 0) return;
    const merged = [...selectedExam.questions, ...importedQuestions].map((q, idx) => ({
      ...q,
      order: idx + 1,
    }));
    const nextExams = exams.map((ex) =>
      ex.id === selectedExam.id
        ? {
            ...ex,
            questions: merged,
            totalQuestions: merged.length,
          }
        : ex,
    );
    onSaveExams(nextExams);
    setImportSuccessNotice(
      `Berhasil mengimpor ${importedQuestions.length} soal valid ke paket "${selectedExam.title}".`,
    );
    window.setTimeout(() => setImportSuccessNotice(null), 5000);
  };

  const handleOpenCardsGenerator = () => {
    if (!selectedExam) return;
    const baseRoster = monitoringAttempts.map((att, idx) => ({
      id: `pc-init-${att.attemptId}`,
      fullName: att.student.fullName,
      nim: att.student.nim,
      roomSession: `Lab CBT 0${(idx % 2) + 1} · Sesi 1`,
    }));

    const fallbackSamples = [
      { id: 'pc-sample-1', fullName: 'Rizky Pratama', nim: '210401018', roomSession: 'Lab CBT 01 · Sesi 1' },
      { id: 'pc-sample-2', fullName: 'Nadia Kusuma', nim: '210401024', roomSession: 'Lab CBT 02 · Sesi 1' },
      { id: 'pc-sample-3', fullName: 'Dimas Wijaya', nim: '210401031', roomSession: 'Lab CBT 02 · Sesi 1' },
    ];

    setCardsConfig((prev) => ({
      ...prev,
      scheduleText: selectedExam.scheduleWindow || prev.scheduleText,
      participants:
        prev.participants.length > 0
          ? prev.participants
          : baseRoster.length > 0
            ? [...baseRoster, ...fallbackSamples].slice(0, 8)
            : fallbackSamples,
    }));
    setIsBeritaAcaraModalOpen(false);
    setIsCardsModalOpen(true);
  };

  const lastBeritaExamIdRef = useRef<string | null>(null);

  const handleOpenBeritaAcara = () => {
    if (!selectedExam) return;
    const violationsTotal = monitoringAttempts.reduce((s, a) => s + a.violations.length, 0);
    const isDifferentExam = lastBeritaExamIdRef.current !== selectedExam.id;
    lastBeritaExamIdRef.current = selectedExam.id;

    const autoNote =
      violationsTotal > 0
        ? `Ujian berjalan tertib. Sistem mencatat ${violationsTotal} aktivitas perpindahan tab/fokus untuk ditinjau pengawas.`
        : 'Ujian berlangsung tertib dan lancar tanpa kendala teknis yang mengganggu peserta.';

    setBeritaAcaraConfig((prev) => ({
      ...prev,
      registeredCount: isDifferentExam
        ? monitoringAttempts.length
        : Math.max(prev.registeredCount, monitoringAttempts.length),
      lecturerName: selectedExam.lecturer || prev.lecturerName,
      specialNotes: isDifferentExam ? autoNote : prev.specialNotes.trim() || autoNote,
    }));
    setIsCardsModalOpen(false);
    setIsBeritaAcaraModalOpen(true);
  };

  const triggerBrowserPrint = () => {
    window.setTimeout(() => {
      window.print();
    }, 60);
  };

  return (
    <>
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6 print:hidden">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
            Konsol Pengajar &amp; Pengawas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola jadwal ujian, bank soal berbobot, serta pantau progres peserta secara langsung.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('bank_soal')}
            className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer focus-ring ${
              activeTab === 'bank_soal'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">Ujian &amp; Soal</span>
            <span className="hidden sm:inline">Manajemen Ujian &amp; Bank Soal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMonitoringRefreshTick((t) => t + 1);
              setActiveTab('monitoring');
            }}
            className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer focus-ring ${
              activeTab === 'monitoring'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">Monitoring</span>
            <span className="hidden sm:inline">Live Monitoring &amp; Rekap Hasil</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Manajemen Ujian & Bank Soal */}
      {activeTab === 'bank_soal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Exam List + Create Form */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Daftar Paket Ujian</h2>
                <button
                  type="button"
                  onClick={openCreateExamForm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-ring"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Buat Ujian</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {exams.map((ex) => {
                  const isSelected = selectedExam?.id === ex.id;
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setSelectedExamId(ex.id);
                        setIsQuestionEditorOpen(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer focus-ring ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold tracking-wider text-[#2563EB]">
                          TOKEN: {ex.token}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            ex.status === 'published' ? 'text-[#16A34A]' : 'text-slate-500'
                          }`}
                        >
                          {ex.status === 'published' ? 'Aktif' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2">
                        {ex.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                        <span>{ex.questions.length} soal</span>
                        <span aria-hidden="true">·</span>
                        <span>{ex.durationMinutes} menit</span>
                        {ex.shuffleQuestions && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Acak Soal</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exam Create / Edit Form */}
            {isCreatingExam && (
              <form
                onSubmit={handleSaveExam}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingExamMetaId ? 'Edit Pengaturan Ujian' : 'Buat Ujian Baru'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreatingExam(false)}
                    aria-label="Tutup form ujian"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Ujian
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Contoh: UAS Basis Data Terdistribusi"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Kuliah
                  </label>
                  <input
                    type="text"
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    placeholder="Contoh: IF-402 Basis Data"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Durasi (Menit)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={examDuration}
                      onChange={(e) => setExamDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nilai Lulus (KKM)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={examPassingScore}
                      onChange={(e) => setExamPassingScore(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Token Ujian (6–8 Karakter)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={examToken}
                      onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                      maxLength={10}
                      className="flex-1 px-3 py-2 text-sm font-mono font-bold uppercase tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExamToken(generateExamToken(exams.map((ex) => ex.token)))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Generate</span>
                    </button>
                  </div>
                </div>

                {/* Shuffle Toggles */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                      <Shuffle className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>Acak Urutan Soal per Peserta</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#2563EB]"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                      <Shuffle className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>Acak Urutan Opsi Jawaban</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#2563EB]"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Publikasi
                  </label>
                  <select
                    value={examStatus}
                    onChange={(e) => setExamStatus(e.target.value as 'published' | 'draft')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="published">Published (Siap Dikerjakan)</option>
                    <option value="draft">Draft (Disembunyikan)</option>
                  </select>
                </div>

                {examFormError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                    {examFormError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingExam(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {editingExamMetaId ? 'Simpan Perubahan' : 'Simpan Ujian'}
                  </button>
                </div>
              </form>
            )}
          </aside>

          {/* Right Panel: Selected Exam & Question Bank Editor */}
          <section className="lg:col-span-8 space-y-5">
            {selectedExam ? (
              <>
                {/* Selected Exam Header */}
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{selectedExam.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{selectedExam.durationMinutes} Menit</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {selectedExam.shuffleQuestions ? 'Acak Soal Aktif' : 'Urutan Soal Tetap'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {selectedExam.shuffleOptions ? 'Acak Opsi Aktif' : 'Urutan Opsi Tetap'}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        {selectedExam.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyToken(selectedExam.token, selectedExam.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedTokenId === selectedExam.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Token Disalin: {selectedExam.token}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Token: {selectedExam.token}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenCardsGenerator}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Cetak Kartu Peserta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditExamForm(selectedExam)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Pengaturan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onTestAsStudentWithToken(selectedExam.token)}
                        disabled={selectedExam.questions.length === 0 || selectedExam.status !== 'published'}
                        title={
                          selectedExam.questions.length === 0
                            ? 'Tambahkan minimal 1 soal terlebih dahulu'
                            : 'Uji langsung di tampilan Peserta Ujian'
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                      >
                        <span>Uji sebagai Peserta</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add / Edit Question Form + Live Preview KaTeX */}
                {isQuestionEditorOpen && (
                  <form
                    onSubmit={handleSaveQuestion}
                    className="bg-white border border-[#2563EB] rounded-xl p-5 sm:p-6 space-y-5"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {questionDraft.id ? 'Edit Soal Pilihan Ganda' : 'Tambah Soal Baru'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Mendukung gambar (Upload Base64 / URL) serta rumus LaTeX (<code className="font-mono">$...$</code> / <code className="font-mono">$$...$$</code>)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsQuestionEditorOpen(false)}
                        aria-label="Tutup editor soal"
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                      {/* Left Column: Inputs */}
                      <div className="xl:col-span-7 space-y-4 min-w-0">
                        {/* Question Type Switcher (Multiple Choice vs Essay) */}
                        <div>
                          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Tipe Soal
                          </span>
                          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 border border-slate-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                setQuestionDraft((prev) => ({
                                  ...prev,
                                  type: 'multiple_choice',
                                  weight: prev.id ? prev.weight : 1,
                                }))
                              }
                              className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                questionDraft.type === 'multiple_choice'
                                  ? 'bg-white text-slate-900 shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Pilihan Ganda
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setQuestionDraft((prev) => ({
                                  ...prev,
                                  type: 'essay',
                                  weight: prev.id ? prev.weight : 5,
                                }))
                              }
                              className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                questionDraft.type === 'essay'
                                  ? 'bg-white text-slate-900 shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Esai (Uraian)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Topik / Kategori Materi
                            </label>
                            <input
                              type="text"
                              value={questionDraft.topic}
                              onChange={(e) =>
                                setQuestionDraft((prev) => ({ ...prev, topic: e.target.value }))
                              }
                              placeholder="Contoh: Kalkulus Integral / Kinematika"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              {questionDraft.type === 'essay'
                                ? 'Bobot Skor Maksimal'
                                : 'Bobot Nilai Soal'}
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={questionDraft.weight}
                              onChange={(e) =>
                                setQuestionDraft((prev) => ({
                                  ...prev,
                                  weight: Number(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                            />
                          </div>
                        </div>

                        {/* Question Prompt + Quick LaTeX Toolbar */}
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Sigma className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                              <span>Pertanyaan (Teks &amp; LaTeX)</span>
                            </label>
                            <span className="text-[11px] text-slate-500">
                              Sisipkan simbol cepat:
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 p-2 mb-2 bg-slate-50 border border-slate-200 rounded-lg">
                            {LATEX_TEMPLATES.map((tpl) => (
                              <button
                                key={tpl.label}
                                type="button"
                                title={tpl.title}
                                onClick={() => handleInsertLatex(tpl.snippet, tpl.wrapInline)}
                                className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-300 border border-slate-200 rounded transition-colors cursor-pointer"
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>

                          <textarea
                            ref={promptTextareaRef}
                            rows={4}
                            value={questionDraft.prompt}
                            onChange={(e) =>
                              setQuestionDraft((prev) => ({ ...prev, prompt: e.target.value }))
                            }
                            placeholder="Contoh: Hitung nilai integral tentu berikut: $$\int_{0}^{2} (3x^2 + 2x)\,dx$$"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>

                        {/* Question Image Upload / URL Input */}
                        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                              <span>Gambar Soal (Opsional · Tersimpan Offline)</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer">
                                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Upload Gambar</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => void handleQuestionImageUpload(e)}
                                  className="sr-only"
                                />
                              </label>

                              {questionDraft.image_url && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuestionDraft((prev) => ({ ...prev, image_url: '' }));
                                    setPreviewImgError(false);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Hapus Gambar</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            type="text"
                            value={questionDraft.image_url}
                            onChange={(e) => {
                              setPreviewImgError(false);
                              setQuestionDraft((prev) => ({ ...prev, image_url: e.target.value }));
                            }}
                            placeholder="Atau tempel URL gambar / Data URL Base64..."
                            className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                          />

                          {imageUploadError && (
                            <p className="text-xs text-red-600">{imageUploadError}</p>
                          )}

                          {questionDraft.image_url && (
                            <div className="pt-1">
                              {previewImgError ? (
                                <div className="flex items-center gap-2 p-2.5 rounded border border-red-200 bg-red-50 text-xs text-red-700">
                                  <ImageOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                                  <span>URL atau format gambar tidak valid.</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-white">
                                  <img
                                    src={questionDraft.image_url}
                                    alt="Preview gambar soal"
                                    referrerPolicy="no-referrer"
                                    onError={() => setPreviewImgError(true)}
                                    className="h-20 w-auto max-w-[180px] object-contain rounded"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLightboxImage({
                                        url: questionDraft.image_url,
                                        caption: 'Pratinjau Gambar Soal',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                  >
                                    <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Zoom</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Cuplikan Kode (Opsional)
                          </label>
                          <textarea
                            rows={2}
                            value={questionDraft.codeSnippet}
                            onChange={(e) =>
                              setQuestionDraft((prev) => ({ ...prev, codeSnippet: e.target.value }))
                            }
                            placeholder="SELECT * FROM users WHERE role = 'student';"
                            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>

                        {/* Conditional Answer Area: Rubric (Essay) vs Options A-D (Multiple Choice) */}
                        {questionDraft.type === 'essay' ? (
                          <div className="space-y-2 pt-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Rubrik / Kunci Jawaban Referensi (untuk Koreksi Pengajar)
                            </label>
                            <textarea
                              rows={4}
                              value={questionDraft.rubric}
                              onChange={(e) =>
                                setQuestionDraft((prev) => ({ ...prev, rubric: e.target.value }))
                              }
                              placeholder="Tuliskan poin-poin penilaian, kata kunci, atau langkah perhitungan referensi (mendukung sintaks $LaTeX$)..."
                              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-emerald-50/30 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                            />
                            <p className="text-[11px] text-slate-500">
                              Rubrik ini hanya terlihat oleh pengajar saat mengoreksi jawaban esai peserta.
                            </p>
                          </div>
                        ) : (
                          /* Options A-D + Answer Key Radio + Optional Image per Option */
                          <div className="space-y-2.5 pt-1">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                              <span>Pilihan Jawaban (Mendukung $LaTeX$ &amp; Gambar)</span>
                              <span className="text-[#16A34A]">Pilih Kunci Jawaban Benar</span>
                            </div>

                            {questionDraft.options.map((opt, idx) => {
                              const isCorrect = questionDraft.correctOptionId === opt.id;
                              const isImgOpen = openOptionImageIdx === idx || Boolean(opt.image_url);
                              return (
                                <div
                                  key={opt.id}
                                  className={`p-2.5 rounded-lg border space-y-2 ${
                                    isCorrect
                                      ? 'border-[#16A34A] bg-emerald-50/40'
                                      : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded bg-slate-100 text-slate-800 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                      {opt.label}
                                    </span>
                                    <input
                                      type="text"
                                      value={opt.text}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setQuestionDraft((prev) => ({
                                          ...prev,
                                          options: prev.options.map((o, i) =>
                                            i === idx ? { ...o, text: val } : o,
                                          ),
                                        }));
                                      }}
                                      placeholder={`Isi opsi ${opt.label} (mis. $x = 4$)...`}
                                      className="flex-1 min-w-0 px-2.5 py-1.5 text-sm bg-transparent focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenOptionImageIdx((cur) => (cur === idx ? null : idx))
                                      }
                                      title="Tambah atau kelola gambar opsi"
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded border transition-colors shrink-0 cursor-pointer ${
                                        opt.image_url
                                          ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      <ImageIcon className="w-3 h-3" aria-hidden="true" />
                                      <span className="hidden sm:inline">Gambar</span>
                                    </button>
                                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer pr-1">
                                      <input
                                        type="radio"
                                        name="correct-option-radio"
                                        checked={isCorrect}
                                        onChange={() =>
                                          setQuestionDraft((prev) => ({
                                            ...prev,
                                            correctOptionId: opt.id,
                                          }))
                                        }
                                        className="w-4 h-4 text-[#16A34A]"
                                      />
                                      <span className={isCorrect ? 'text-[#16A34A]' : 'text-slate-500'}>
                                        Kunci
                                      </span>
                                    </label>
                                  </div>

                                  {isImgOpen && (
                                    <div className="pl-9 pr-1 pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                      <input
                                        type="text"
                                        value={opt.image_url ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setQuestionDraft((prev) => ({
                                            ...prev,
                                            options: prev.options.map((o, i) =>
                                              i === idx ? { ...o, image_url: val } : o,
                                            ),
                                          }));
                                        }}
                                        placeholder={`URL gambar opsi ${opt.label}...`}
                                        className="flex-1 min-w-[160px] px-2.5 py-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-[#2563EB]"
                                      />
                                      <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer">
                                        <Upload className="w-3 h-3" aria-hidden="true" />
                                        <span>Upload</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => void handleOptionImageUpload(idx, e)}
                                          className="sr-only"
                                        />
                                      </label>
                                      {opt.image_url && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setQuestionDraft((prev) => ({
                                              ...prev,
                                              options: prev.options.map((o, i) =>
                                                i === idx ? { ...o, image_url: '' } : o,
                                              ),
                                            }))
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Live Preview KaTeX & Gambar */}
                      <div className="xl:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 min-w-0 xl:sticky xl:top-24">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Eye className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                            <span>Live Preview KaTeX &amp; Gambar</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {questionDraft.type === 'essay' ? 'Tampilan Esai' : 'Tampilan Peserta'}
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 min-w-0">
                          {questionDraft.image_url && !previewImgError && (
                            <img
                              src={questionDraft.image_url}
                              alt="Preview gambar pada soal"
                              referrerPolicy="no-referrer"
                              className="max-h-44 w-auto max-w-full object-contain rounded-lg border border-slate-200 bg-slate-50"
                            />
                          )}

                          <div className="text-sm font-medium text-slate-900 leading-relaxed min-w-0">
                            {questionDraft.prompt.trim() ? (
                              <MathText text={questionDraft.prompt} />
                            ) : (
                              <span className="text-slate-400 italic font-normal">
                                Ketik pertanyaan dengan sintaks $...$ atau $$...$$ untuk melihat hasil rendering KaTeX secara langsung.
                              </span>
                            )}
                          </div>

                          {questionDraft.codeSnippet.trim() && (
                            <pre className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 max-w-full overflow-x-auto">
                              <code>{questionDraft.codeSnippet}</code>
                            </pre>
                          )}

                          {questionDraft.type === 'essay' ? (
                            <div className="space-y-3 pt-1">
                              <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 italic">
                                Area kotak jawaban uraian peserta (maks {questionDraft.weight} poin)
                              </div>
                              {questionDraft.rubric.trim() && (
                                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 text-xs text-emerald-950 space-y-1">
                                  <span className="block font-semibold text-emerald-800">
                                    Pratinjau Rubrik Pengajar:
                                  </span>
                                  <div className="leading-relaxed">
                                    <MathText text={questionDraft.rubric} />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 pt-1">
                              {questionDraft.options.map((opt) => {
                                const isKey = questionDraft.correctOptionId === opt.id;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                                      isKey
                                        ? 'border-emerald-300 bg-emerald-50/50 text-slate-900'
                                        : 'border-slate-200 bg-white text-slate-700'
                                    }`}
                                  >
                                    <span
                                      className={`w-6 h-6 rounded font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                        isKey
                                          ? 'bg-[#16A34A] text-white'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {opt.label}
                                    </span>
                                    <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                                      <div>
                                        {opt.text.trim() ? (
                                          <MathText text={opt.text} />
                                        ) : (
                                          <span className="text-slate-400 italic">
                                            Opsi {opt.label} kosong
                                          </span>
                                        )}
                                      </div>
                                      {opt.image_url?.trim() && (
                                        <img
                                          src={opt.image_url}
                                          alt={`Preview opsi ${opt.label}`}
                                          referrerPolicy="no-referrer"
                                          className="max-h-20 w-auto max-w-full object-contain rounded border border-slate-200 bg-white"
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {questionFormError && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                        {questionFormError}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsQuestionEditorOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                      >
                        Simpan Soal ke Bank Soal
                      </button>
                    </div>
                  </form>
                )}

                {/* Question Bank List */}
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Bank Soal ({selectedExam.questions.length} Butir)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        Total bobot:{' '}
                        {selectedExam.questions.reduce((acc, q) => acc + (q.weight || 1), 0)} poin
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Download Template Excel/CSV</span>
                        </button>
                        {isTemplateMenuOpen && (
                          <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                            <button
                              type="button"
                              onClick={() => {
                                downloadQuestionTemplateXlsx();
                                setIsTemplateMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" aria-hidden="true" />
                              <span>Template Excel (.xlsx)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                downloadQuestionTemplateCsv();
                                setIsTemplateMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                              <span>Template CSV (.csv)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsTemplateMenuOpen(false);
                          setIsImportModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Import Soal (CSV/Excel)</span>
                      </button>

                      <button
                        type="button"
                        onClick={openAddQuestion}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <FilePlus2 className="w-4 h-4" aria-hidden="true" />
                        <span>Tambah Soal</span>
                      </button>
                    </div>
                  </div>

                  {importSuccessNotice && (
                    <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" aria-hidden="true" />
                        <span>{importSuccessNotice}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setImportSuccessNotice(null)}
                        className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {selectedExam.questions.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <p className="text-sm font-medium text-slate-700">
                        Belum ada soal pada paket ujian ini.
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Tambahkan minimal 1 soal pilihan ganda beserta kunci jawaban dan bobotnya
                        agar peserta dapat mengerjakan ujian dengan token{' '}
                        <span className="font-mono font-bold text-slate-900">
                          {selectedExam.token}
                        </span>
                        .
                      </p>
                      <button
                        type="button"
                        onClick={openAddQuestion}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        <span>Tambah Soal Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {selectedExam.questions.map((q, idx) => {
                        const isEssay = q.type === 'essay' || q.question_type === 'essay';
                        return (
                        <div key={q.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono tabular-nums font-bold text-slate-900">
                                Soal #{idx + 1}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`font-semibold ${
                                  isEssay ? 'text-[#2563EB]' : 'text-slate-600'
                                }`}
                              >
                                {isEssay ? 'Esai' : 'Pilihan Ganda'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{q.topic}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums font-semibold text-slate-700">
                                {isEssay ? `Maks: ${q.weight}` : `Bobot: ${q.weight}`}
                              </span>
                              {q.image_url && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1 text-[#2563EB] font-medium">
                                    <ImageIcon className="w-3 h-3" aria-hidden="true" />
                                    <span>Bergambar</span>
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditQuestion(q)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>

                          {q.image_url && (
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxImage({
                                    url: q.image_url!,
                                    caption: `Soal #${idx + 1} — ${q.topic}`,
                                  })
                                }
                                className="inline-flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-300 transition-colors cursor-zoom-in"
                              >
                                <img
                                  src={q.image_url}
                                  alt={`Gambar soal ${idx + 1}`}
                                  referrerPolicy="no-referrer"
                                  className="max-h-32 w-auto max-w-full object-contain rounded"
                                />
                              </button>
                            </div>
                          )}

                          <p className="text-sm font-medium text-slate-900 leading-relaxed min-w-0">
                            <MathText text={q.prompt} />
                          </p>

                          {q.codeSnippet && (
                            <pre className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto">
                              <code>{q.codeSnippet}</code>
                            </pre>
                          )}

                          {isEssay ? (
                            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 text-xs text-emerald-950 space-y-1">
                              <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                                <AlignLeft className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Rubrik / Kunci Referensi:</span>
                              </span>
                              <div className="leading-relaxed">
                                {q.rubric ? (
                                  <MathText text={q.rubric} />
                                ) : (
                                  <span className="italic text-slate-500">
                                    Belum ada rubrik referensi yang ditulis.
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {q.options.map((opt) => {
                                const isKey = opt.id === q.correctOptionId;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`px-3 py-2 rounded-lg border text-xs flex items-start gap-2 ${
                                      isKey
                                        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-medium'
                                        : 'border-slate-200 bg-slate-50/40 text-slate-700'
                                    }`}
                                  >
                                    <span className="font-mono font-bold shrink-0">
                                      {opt.label}.
                                    </span>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                      <span className="block">
                                        <MathText text={opt.text} />
                                      </span>
                                      {opt.image_url && (
                                        <img
                                          src={opt.image_url}
                                          alt={`Gambar opsi ${opt.label}`}
                                          referrerPolicy="no-referrer"
                                          onClick={() =>
                                            setLightboxImage({
                                              url: opt.image_url!,
                                              caption: `Soal #${idx + 1} — Opsi ${opt.label}`,
                                            })
                                          }
                                          className="max-h-20 w-auto max-w-full object-contain rounded border border-slate-200 bg-white cursor-zoom-in"
                                        />
                                      )}
                                    </div>
                                    {isKey && (
                                      <CheckCircle2
                                        className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5"
                                        aria-label="Kunci jawaban"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}

      {/* TAB 2: Live Monitoring & Rekap Hasil */}
      {activeTab === 'monitoring' && selectedExam && (
        <div className="space-y-6">
          {/* Controls & Exam Selector Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <label htmlFor="monitor-exam-select" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Pilih Ujian:
              </label>
              <select
                id="monitor-exam-select"
                value={selectedExam.id}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full sm:w-auto min-h-[42px] px-3 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB] max-w-full sm:max-w-md truncate"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    [{ex.token}] {ex.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMonitoringRefreshTick((t) => t + 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer focus-ring"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Segarkan Data</span>
              </button>

              <button
                type="button"
                onClick={handleOpenBeritaAcara}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer focus-ring"
              >
                <Printer className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                <span>Cetak Berita Acara Ujian</span>
              </button>

              <button
                type="button"
                disabled={monitoringAttempts.length === 0}
                onClick={() => exportMonitoringToCsv(selectedExam, monitoringAttempts)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer focus-ring"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Ekspor Rekap CSV</span>
              </button>
            </div>
          </div>

          {/* 4-Column Summary Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <Users className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                <span>Total Peserta Tercatat</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {monitoringStats.total}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
                <span>Sedang Mengerjakan</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {monitoringStats.inProgress}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
                <span>Sudah Mengumpulkan</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {monitoringStats.submittedCount}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                <BarChart3 className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <span>Rata-rata Nilai · Pelanggaran</span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {monitoringStats.avgScore !== null ? monitoringStats.avgScore : '—'}{' '}
                <span className="text-sm font-normal text-slate-500">
                  · {monitoringStats.totalViolations} log
                </span>
              </p>
            </div>
          </div>

          {/* Search & Status Filter + Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative max-w-xs w-full">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau NIM..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
                {(
                  [
                    { key: 'all', label: 'Semua' },
                    { key: 'in_progress', label: 'In Progress' },
                    { key: 'submitted', label: 'Submitted' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatusFilter(item.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      statusFilter === item.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAttempts.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700">
                  Belum ada data peserta untuk filter ini.
                </p>
                <p className="text-xs text-slate-500">
                  Peserta yang masuk menggunakan token{' '}
                  <span className="font-mono font-bold text-slate-900">{selectedExam.token}</span>{' '}
                  akan otomatis tercatat pada tabel pemantauan ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="py-3 px-4 sm:px-5">Peserta</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Soal Terjawab</th>
                      <th className="py-3 px-4 text-right">Pelanggaran</th>
                      <th className="py-3 px-4">Penilaian &amp; Koreksi</th>
                      <th className="py-3 px-4 text-right">Skor Akhir</th>
                      <th className="py-3 px-5 text-right">Pembaruan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttempts.map((att) => {
                      const answeredCount = countAnsweredQuestions(
                        selectedExam.questions,
                        att.answers,
                      );
                      const totalQ = Math.max(1, selectedExam.questions.length);
                      const pct = Math.min(100, Math.round((answeredCount / totalQ) * 100));
                      const violationCount = att.violations.length;
                      const examHasEssay = selectedExam.questions.some(
                        (q) => q.type === 'essay' || q.question_type === 'essay',
                      );
                      const summary =
                        att.status === 'submitted'
                          ? att.gradingSummary ??
                            evaluateExamAnswers(
                              selectedExam.questions,
                              att.answers,
                              selectedExam.passingScore,
                              att.questionOrder,
                              att.optionOrders,
                              att.essayScores,
                            )
                          : null;
                      const isPendingEssay = summary?.gradingStatus === 'pending_essay';

                      const openEssayGradingModal = () => {
                        const initialScores: Record<string, string> = {};
                        for (const q of selectedExam.questions) {
                          if (q.type === 'essay' || q.question_type === 'essay') {
                            const existingScore = att.essayScores?.[q.id];
                            initialScores[q.id] =
                              typeof existingScore === 'number' ? String(existingScore) : '';
                          }
                        }
                        setEssayScoreInputs(initialScores);
                        setGradingEssayAttempt(att);
                      };

                      return (
                        <tr key={att.attemptId} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-5">
                            <p className="font-semibold text-slate-900">{att.student.fullName}</p>
                            <p className="text-xs font-mono tabular-nums text-slate-500">
                              NIM {att.student.nim}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {att.status === 'submitted' ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16A34A]">
                                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                                <span>Submitted</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB]">
                                <Clock className="w-4 h-4" aria-hidden="true" />
                                <span>In Progress</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 min-w-[140px]">
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#2563EB] rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono tabular-nums text-slate-700 shrink-0">
                                {answeredCount}/{selectedExam.questions.length}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {violationCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => setInspectViolationAttempt(att)}
                                className="inline-flex items-center gap-1 text-xs font-mono tabular-nums font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                                <span>{violationCount} log</span>
                              </button>
                            ) : (
                              <span className="text-xs font-mono tabular-nums text-slate-400">
                                0
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {att.status !== 'submitted' ? (
                              <span className="text-xs text-slate-400">Menunggu submit</span>
                            ) : examHasEssay ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={openEssayGradingModal}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                    isPendingEssay
                                      ? 'bg-blue-50 text-[#2563EB] border-blue-200 hover:bg-blue-100'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>
                                    {isPendingEssay ? 'Koreksi Esai' : 'Edit Skor Esai'}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-emerald-700">
                                Auto-Graded
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono tabular-nums font-bold">
                            {att.status === 'submitted' && summary ? (
                              <div className="inline-flex flex-col items-end">
                                <span
                                  className={
                                    isPendingEssay
                                      ? 'text-slate-700'
                                      : summary.passed
                                        ? 'text-[#16A34A]'
                                        : 'text-[#DC2626]'
                                  }
                                >
                                  {summary.score}
                                </span>
                                {isPendingEssay && (
                                  <span className="font-sans text-[10px] font-medium text-amber-700">
                                    Sementara
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-5 text-right whitespace-nowrap text-xs font-mono tabular-nums text-slate-500">
                            {new Date(
                              att.submittedAt ?? att.lastSyncedAt ?? att.startedAt,
                            ).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            WIB
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Violation Log Inspector Modal */}
      {inspectViolationAttempt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-violations-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h3 id="inspect-violations-title" className="text-base font-bold text-slate-900">
                  Log Pelanggaran Peserta
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectViolationAttempt.student.fullName} · NIM{' '}
                  {inspectViolationAttempt.student.nim}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectViolationAttempt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2.5">
              {inspectViolationAttempt.violations.map((v, i) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-amber-950">
                    <span>
                      #{i + 1} · {v.type}
                    </span>
                    <span className="font-mono tabular-nums">{v.durationSeconds} detik</span>
                  </div>
                  <p className="text-amber-900">{v.message}</p>
                  <p className="font-mono tabular-nums text-[11px] text-amber-700">
                    {new Date(v.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectViolationAttempt(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Essay Grading Modal */}
      {gradingEssayAttempt && selectedExam && (() => {
        const essayQuestions = selectedExam.questions.filter(
          (q) => q.type === 'essay' || q.question_type === 'essay',
        );
        const parsedEssayScores: Record<string, number> = {};
        for (const q of essayQuestions) {
          const raw = essayScoreInputs[q.id];
          if (raw !== undefined && raw.trim() !== '') {
            const num = Number(raw);
            if (!Number.isNaN(num)) {
              parsedEssayScores[q.id] = Math.min(q.weight, Math.max(0, num));
            }
          }
        }
        const livePreviewSummary = evaluateExamAnswers(
          selectedExam.questions,
          gradingEssayAttempt.answers,
          selectedExam.passingScore,
          gradingEssayAttempt.questionOrder,
          gradingEssayAttempt.optionOrders,
          parsedEssayScores,
        );

        const handleSaveEssayGrading = (e: React.FormEvent) => {
          e.preventDefault();
          const finalEssayScores: Record<string, number> = {};
          for (const q of essayQuestions) {
            const raw = essayScoreInputs[q.id];
            if (raw !== undefined && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
              finalEssayScores[q.id] = Math.min(q.weight, Math.max(0, Number(raw)));
            }
          }
          const nextSummary = evaluateExamAnswers(
            selectedExam.questions,
            gradingEssayAttempt.answers,
            selectedExam.passingScore,
            gradingEssayAttempt.questionOrder,
            gradingEssayAttempt.optionOrders,
            finalEssayScores,
          );
          const updatedAttempt: ExamAttemptState = {
            ...gradingEssayAttempt,
            essayScores: finalEssayScores,
            gradingSummary: nextSummary,
          };
          upsertMonitoringAttempt(updatedAttempt);

          // Sinkronkan juga ke active attempt di localStorage jika ID cocok
          try {
            const activeRaw = window.localStorage.getItem('examcore_active_attempt_v1');
            if (activeRaw) {
              const activeParsed = JSON.parse(activeRaw) as ExamAttemptState;
              if (activeParsed.attemptId === updatedAttempt.attemptId) {
                window.localStorage.setItem(
                  'examcore_active_attempt_v1',
                  JSON.stringify(updatedAttempt),
                );
              }
            }
          } catch {
            // Ignore
          }

          setMonitoringRefreshTick((t) => t + 1);
          setGradingEssayAttempt(null);
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="essay-grading-title"
          >
            <form
              onSubmit={handleSaveEssayGrading}
              className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
                <div>
                  <h3 id="essay-grading-title" className="text-base sm:text-lg font-bold text-slate-900">
                    Koreksi Manual Jawaban Esai
                  </h3>
                  <p className="text-xs text-slate-500">
                    {gradingEssayAttempt.student.fullName} · NIM {gradingEssayAttempt.student.nim}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="block text-[11px] text-slate-500">
                      Pratinjau Skor Akhir (PG + Esai)
                    </span>
                    <span className="text-base font-bold font-mono tabular-nums text-[#2563EB]">
                      {livePreviewSummary.score}/100
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGradingEssayAttempt(null)}
                    aria-label="Tutup panel koreksi esai"
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Score Summary Strip */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-slate-600">
                    Skor Pilihan Ganda (Auto):{' '}
                    <strong className="font-mono tabular-nums text-slate-900">
                      {livePreviewSummary.mcWeightEarned}/{livePreviewSummary.mcWeightTotal} poin
                    </strong>
                  </span>
                  <span className="text-slate-600">
                    Skor Esai (Manual):{' '}
                    <strong className="font-mono tabular-nums text-slate-900">
                      {livePreviewSummary.essayWeightEarned}/{livePreviewSummary.essayWeightTotal} poin
                    </strong>
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-slate-900 sm:hidden">
                  Total: {livePreviewSummary.score}/100
                </span>
              </div>

              {/* Essay Items List */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {essayQuestions.map((q, idx) => {
                  const studentAns = gradingEssayAttempt.answers[q.id]?.trim() || '';
                  const inputVal = essayScoreInputs[q.id] ?? '';
                  return (
                    <div
                      key={q.id}
                      className="border border-slate-200 rounded-xl p-4 space-y-3.5 bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-bold text-slate-900">
                            Esai #{idx + 1} (Urutan #{q.order})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{q.topic}</span>
                        </div>
                        <span className="font-mono tabular-nums text-xs font-semibold text-slate-700">
                          Bobot Maks: {q.weight} poin
                        </span>
                      </div>

                      <div className="text-sm font-medium text-slate-900 leading-relaxed">
                        <MathText text={q.prompt} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Jawaban Peserta
                          </span>
                          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                            {studentAns ? (
                              <MathText text={studentAns} />
                            ) : (
                              <span className="italic text-slate-400">
                                Peserta tidak mengisi jawaban esai ini.
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                            Rubrik / Referensi Pengajar
                          </span>
                          <div className="text-xs sm:text-sm text-emerald-950 leading-relaxed whitespace-pre-wrap break-words">
                            {q.rubric ? (
                              <MathText text={q.rubric} />
                            ) : (
                              <span className="italic text-slate-500">
                                Tidak ada rubrik referensi.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <label
                          htmlFor={`essay-score-${q.id}`}
                          className="text-xs font-semibold text-slate-700"
                        >
                          Berikan Skor (0 – {q.weight}):
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEssayScoreInputs((prev) => ({ ...prev, [q.id]: '0' }))
                            }
                            className="px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEssayScoreInputs((prev) => ({
                                ...prev,
                                [q.id]: String(Number((q.weight / 2).toFixed(1))),
                              }))
                            }
                            className="px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEssayScoreInputs((prev) => ({
                                ...prev,
                                [q.id]: String(q.weight),
                              }))
                            }
                            className="px-2.5 py-1.5 text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer"
                          >
                            Maks ({q.weight})
                          </button>
                          <input
                            id={`essay-score-${q.id}`}
                            type="number"
                            min={0}
                            max={q.weight}
                            step="0.5"
                            value={inputVal}
                            onChange={(e) =>
                              setEssayScoreInputs((prev) => ({
                                ...prev,
                                [q.id]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            className="w-24 px-3 py-1.5 text-sm font-mono tabular-nums font-bold text-right border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-slate-500">
                  Skor akhir &amp; file ekspor CSV akan otomatis diperbarui setelah disimpan.
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGradingEssayAttempt(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg cursor-pointer"
                  >
                    Simpan Nilai Esai
                  </button>
                </div>
              </div>
            </form>
          </div>
        );
      })()}

      <ImageLightboxModal
        imageUrl={lightboxImage?.url ?? null}
        caption={lightboxImage?.caption}
        onClose={() => setLightboxImage(null)}
      />

      {selectedExam && (
        <>
          <ImportQuestionsModal
            isOpen={isImportModalOpen}
            examTitle={selectedExam.title}
            onClose={() => setIsImportModalOpen(false)}
            onImportValidQuestions={handleImportValidQuestions}
          />

          <ParticipantCardsModal
            isOpen={isCardsModalOpen}
            exam={selectedExam}
            monitoringAttempts={monitoringAttempts}
            config={cardsConfig}
            onChangeConfig={setCardsConfig}
            onClose={() => setIsCardsModalOpen(false)}
            onPrint={triggerBrowserPrint}
          />

          <BeritaAcaraModal
            isOpen={isBeritaAcaraModalOpen}
            exam={selectedExam}
            attempts={monitoringAttempts}
            config={beritaAcaraConfig}
            onChangeConfig={setBeritaAcaraConfig}
            onClose={() => setIsBeritaAcaraModalOpen(false)}
            onPrint={triggerBrowserPrint}
          />
        </>
      )}
      </div>

      {/* Print-Only Root Document Container (outside any fixed/overflow modal) */}
      {selectedExam && isCardsModalOpen && (
        <div className="hidden print:block w-full bg-white">
          <ParticipantCardsPrintSheet exam={selectedExam} config={cardsConfig} />
        </div>
      )}

      {selectedExam && isBeritaAcaraModalOpen && (
        <div className="hidden print:block w-full bg-white">
          <BeritaAcaraPrintSheet
            exam={selectedExam}
            attempts={monitoringAttempts}
            config={beritaAcaraConfig}
          />
        </div>
      )}
    </>
  );
};
