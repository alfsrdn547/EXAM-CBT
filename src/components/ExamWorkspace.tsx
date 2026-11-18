import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  AlignLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Flag,
  ImageOff,
  LayoutGrid,
  RefreshCw,
  Send,
  Sigma,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  ExamAttemptState,
  ExamConfig,
  NetworkSimulationMode,
  Question,
  SyncStatus,
  ViolationLog,
} from '../types/exam';
import {
  countAnsweredQuestions,
  evaluateExamAnswers,
  isQuestionAnswered,
} from '../data/mockExam';
import {
  formatCountdown,
  formatTimeWIB,
  saveAttemptLocally,
  syncAttemptToServer,
} from '../utils/storage';
import { SubmitModal } from './SubmitModal';
import { ViolationModal } from './ViolationModal';
import { MathText } from './MathText';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ExamWorkspaceProps {
  exam: ExamConfig;
  questions: Question[];
  attempt: ExamAttemptState;
  onUpdateAttempt: (next: ExamAttemptState) => void;
  onCompleteSubmit: (finalAttempt: ExamAttemptState, synced: boolean) => void;
}

type FontScale = 'sm' | 'md' | 'lg';

export const ExamWorkspace: React.FC<ExamWorkspaceProps> = ({
  exam,
  questions,
  attempt,
  onUpdateAttempt,
  onCompleteSubmit,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((attempt.mustSubmitBefore - Date.now()) / 1000)),
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline_local' : 'synced',
  );
  const [simMode, setSimMode] = useState<NetworkSimulationMode>('auto');
  const [isSyncPopoverOpen, setIsSyncPopoverOpen] = useState(false);
  const [isQuestionDrawerOpen, setIsQuestionDrawerOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>('md');
  const [pendingViolationModal, setPendingViolationModal] = useState<ViolationLog | null>(null);
  const [copyBlockedNotice, setCopyBlockedNotice] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption: string } | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});

  const attemptRef = useRef<ExamAttemptState>(attempt);
  attemptRef.current = attempt;

  const simModeRef = useRef<NetworkSimulationMode>(simMode);
  simModeRef.current = simMode;

  const syncStatusRef = useRef<SyncStatus>(syncStatus);
  syncStatusRef.current = syncStatus;

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hiddenTimestampRef = useRef<number | null>(null);
  const autoSubmittedRef = useRef<boolean>(false);
  const copyNoticeTimerRef = useRef<number | null>(null);

  const currentIndex = Math.min(
    Math.max(0, attempt.currentQuestionIndex),
    questions.length - 1,
  );
  const currentQuestion = questions[currentIndex];
  const isEssayQuestion = currentQuestion.type === 'essay';

  const [essayDraftText, setEssayDraftText] = useState<string>(
    () => attempt.answers[currentQuestion.id] ?? '',
  );
  const [essaySavingState, setEssaySavingState] = useState<'idle' | 'typing' | 'saved'>('idle');
  const essayTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const essayDebounceRef = useRef<number | null>(null);
  const essayDraftRef = useRef<{ questionId: string; text: string; dirty: boolean }>({
    questionId: currentQuestion.id,
    text: attempt.answers[currentQuestion.id] ?? '',
    dirty: false,
  });

  const effectiveAnswers = useMemo(() => {
    if (!isEssayQuestion) return attempt.answers;
    return {
      ...attempt.answers,
      [currentQuestion.id]: essayDraftText,
    };
  }, [attempt.answers, currentQuestion.id, essayDraftText, isEssayQuestion]);

  const answeredCount = useMemo(
    () => countAnsweredQuestions(questions, effectiveAnswers),
    [effectiveAnswers, questions],
  );
  const flaggedCount = attempt.flaggedIds.length;
  const unansweredCount = questions.length - answeredCount;
  const isCriticalTime = secondsLeft < 300; // < 5 menit

  const showCopyBlockedBanner = useCallback(() => {
    setCopyBlockedNotice(true);
    if (copyNoticeTimerRef.current) {
      window.clearTimeout(copyNoticeTimerRef.current);
    }
    copyNoticeTimerRef.current = window.setTimeout(() => {
      setCopyBlockedNotice(false);
    }, 2600);
  }, []);

  // Execute server sync safely without overwriting newer local edits
  const performSync = useCallback(
    async (targetAttempt?: ExamAttemptState) => {
      const latest = targetAttempt ?? attemptRef.current;
      const mode = simModeRef.current;

      if (mode === 'force_offline' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        setSyncStatus('offline_local');
        return false;
      }

      setSyncStatus('syncing');
      const result = await syncAttemptToServer(latest, mode);

      if (result.ok && result.syncedAt) {
        setSyncStatus('synced');
        const merged: ExamAttemptState = {
          ...attemptRef.current,
          lastSyncedAt: result.syncedAt,
          pendingSync: false,
        };
        attemptRef.current = merged;
        void saveAttemptLocally(merged);
        onUpdateAttempt(merged);
        return true;
      }

      if (result.reason === 'offline') {
        setSyncStatus('offline_local');
      } else {
        setSyncStatus('sync_failed');
      }
      return false;
    },
    [onUpdateAttempt],
  );

  // Final submission handler (manual or timeout) with instant auto-grading
  const finalizeSubmission = useCallback(
    async (reason: 'manual' | 'timeout') => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      if (essayDebounceRef.current) {
        window.clearTimeout(essayDebounceRef.current);
        essayDebounceRef.current = null;
      }

      const now = Date.now();
      let latest = attemptRef.current;
      if (essayDraftRef.current.dirty) {
        const pendingQId = essayDraftRef.current.questionId;
        const pendingText = essayDraftRef.current.text;
        const nextAnswers = { ...latest.answers };
        if (pendingText.trim().length > 0) {
          nextAnswers[pendingQId] = pendingText;
        } else {
          delete nextAnswers[pendingQId];
        }
        latest = {
          ...latest,
          answers: nextAnswers,
          lastSavedLocallyAt: now,
          pendingSync: true,
        };
        essayDraftRef.current.dirty = false;
      }

      const gradingSummary = evaluateExamAnswers(
        exam.questions,
        latest.answers,
        exam.passingScore,
        latest.questionOrder,
        latest.optionOrders,
        latest.essayScores,
      );

      const finalized: ExamAttemptState = {
        ...latest,
        status: 'submitted',
        submittedAt: now,
        submittedReason: reason,
        gradingSummary,
      };

      attemptRef.current = finalized;
      await saveAttemptLocally(finalized);
      const synced = await performSync(finalized);

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // Ignore fullscreen exit restrictions
        }
      }

      const finalWithSyncState: ExamAttemptState = {
        ...attemptRef.current,
        status: 'submitted',
        submittedAt: now,
        submittedReason: reason,
        gradingSummary,
        pendingSync: !synced,
      };
      await saveAttemptLocally(finalWithSyncState);

      setIsSubmitting(false);
      setIsSubmitModalOpen(false);
      setIsQuestionDrawerOpen(false);
      onCompleteSubmit(finalWithSyncState, synced);
    },
    [exam.passingScore, exam.questions, isSubmitting, onCompleteSubmit, performSync],
  );

  // Countdown Timer (1s interval) + Auto-submit when 0
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((attemptRef.current.mustSubmitBefore - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);

      if (remaining <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void finalizeSubmission('timeout');
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [attempt.mustSubmitBefore, finalizeSubmission]);

  // Real browser online/offline listeners + background sync with jitter (30-45s)
  useEffect(() => {
    const handleOnline = () => {
      if (simModeRef.current === 'auto') {
        void performSync();
      }
    };

    const handleOffline = () => {
      if (simModeRef.current === 'auto') {
        setSyncStatus('offline_local');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let timeoutId: number;
    const scheduleNextJitterSync = () => {
      const jitterMs = 30000 + Math.floor(Math.random() * 15000); // 30s - 45s
      timeoutId = window.setTimeout(async () => {
        if (attemptRef.current.pendingSync || syncStatusRef.current !== 'synced') {
          await performSync();
        }
        scheduleNextJitterSync();
      }, jitterMs);
    };

    scheduleNextJitterSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearTimeout(timeoutId);
    };
  }, [performSync]);

  // Proctoring Ringan: visibilitychange detection + keyboard copy shortcut prevention
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTimestampRef.current = Date.now();
      } else if (hiddenTimestampRef.current !== null) {
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - hiddenTimestampRef.current) / 1000),
        );
        hiddenTimestampRef.current = null;

        const violation: ViolationLog = {
          id: `vio-${Date.now()}`,
          type: 'TAB_HIDDEN',
          timestamp: new Date().toISOString(),
          durationSeconds,
          message:
            'Sistem mendeteksi Anda berpindah tab atau meninggalkan jendela ujian. Aktivitas ini telah dicatat ke dalam log pengawas.',
        };

        const updated: ExamAttemptState = {
          ...attemptRef.current,
          violations: [...attemptRef.current.violations, violation],
          pendingSync: true,
        };
        attemptRef.current = updated;
        void saveAttemptLocally(updated);
        onUpdateAttempt(updated);
        setPendingViolationModal(violation);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEssayInput = target?.tagName === 'TEXTAREA';
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        showCopyBlockedBanner();
      } else if (!isEssayInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        showCopyBlockedBanner();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUpdateAttempt, showCopyBlockedBanner]);

  // Close sync popover on outside click
  useEffect(() => {
    if (!isSyncPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsSyncPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSyncPopoverOpen]);

  // Persist answer immediately (<50ms) and trigger debounced sync
  const syncDebounceRef = useRef<number | null>(null);

  const persistLocalAndScheduleSync = useCallback(
    (nextState: ExamAttemptState) => {
      const stamped: ExamAttemptState = {
        ...nextState,
        lastSavedLocallyAt: Date.now(),
        pendingSync: true,
      };
      attemptRef.current = stamped;
      void saveAttemptLocally(stamped);
      onUpdateAttempt(stamped);

      if (
        simModeRef.current === 'force_offline' ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        setSyncStatus('offline_local');
        return;
      }

      if (syncDebounceRef.current) {
        window.clearTimeout(syncDebounceRef.current);
      }
      syncDebounceRef.current = window.setTimeout(() => {
        void performSync(stamped);
      }, 650);
    },
    [onUpdateAttempt, performSync],
  );

  // Sinkronkan draft textarea esai saat berpindah nomor soal
  useEffect(() => {
    const savedText = attemptRef.current.answers[currentQuestion.id] ?? '';
    setEssayDraftText(savedText);
    setEssaySavingState('idle');
    essayDraftRef.current = {
      questionId: currentQuestion.id,
      text: savedText,
      dirty: false,
    };
  }, [currentQuestion.id]);

  // Auto-resize textarea jawaban esai
  useEffect(() => {
    const el = essayTextareaRef.current;
    if (!el || !isEssayQuestion) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(180, Math.min(el.scrollHeight, 480))}px`;
  }, [essayDraftText, fontScale, isEssayQuestion]);

  // Bersihkan timer debounce saat unmount
  useEffect(() => {
    return () => {
      if (essayDebounceRef.current) {
        window.clearTimeout(essayDebounceRef.current);
      }
      if (syncDebounceRef.current) {
        window.clearTimeout(syncDebounceRef.current);
      }
    };
  }, []);

  const commitEssayAnswer = useCallback(
    (questionId: string, rawText: string): ExamAttemptState => {
      const nextAnswers = { ...attemptRef.current.answers };
      if (rawText.trim().length > 0) {
        nextAnswers[questionId] = rawText;
      } else {
        delete nextAnswers[questionId];
      }
      const nextState: ExamAttemptState = {
        ...attemptRef.current,
        answers: nextAnswers,
      };
      essayDraftRef.current.dirty = false;
      persistLocalAndScheduleSync(nextState);
      setEssaySavingState('saved');
      return attemptRef.current;
    },
    [persistLocalAndScheduleSync],
  );

  const flushPendingEssay = useCallback((): ExamAttemptState => {
    if (essayDebounceRef.current) {
      window.clearTimeout(essayDebounceRef.current);
      essayDebounceRef.current = null;
    }
    if (essayDraftRef.current.dirty) {
      return commitEssayAnswer(essayDraftRef.current.questionId, essayDraftRef.current.text);
    }
    return attemptRef.current;
  }, [commitEssayAnswer]);

  const handleEssayChange = (questionId: string, nextValue: string) => {
    setEssayDraftText(nextValue);
    setEssaySavingState('typing');
    essayDraftRef.current = {
      questionId,
      text: nextValue,
      dirty: true,
    };

    if (essayDebounceRef.current) {
      window.clearTimeout(essayDebounceRef.current);
    }
    // Debounce 300ms setelah berhenti mengetik sebelum menulis ke LocalStorage/IndexedDB
    essayDebounceRef.current = window.setTimeout(() => {
      commitEssayAnswer(questionId, nextValue);
    }, 300);
  };

  const handleInsertEssaySymbol = (symbol: string) => {
    const el = essayTextareaRef.current;
    if (!el) {
      handleEssayChange(currentQuestion.id, `${essayDraftText}${symbol}`);
      return;
    }
    const start = el.selectionStart ?? essayDraftText.length;
    const end = el.selectionEnd ?? essayDraftText.length;
    const nextVal = `${essayDraftText.slice(0, start)}${symbol}${essayDraftText.slice(end)}`;
    handleEssayChange(currentQuestion.id, nextVal);
    window.requestAnimationFrame(() => {
      el.focus();
      const pos = start + symbol.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    const nextAnswers = {
      ...attemptRef.current.answers,
      [questionId]: optionId,
    };
    persistLocalAndScheduleSync({
      ...attemptRef.current,
      answers: nextAnswers,
    });
  };

  const handleToggleFlag = (questionId: string) => {
    const baseState = flushPendingEssay();
    const exists = baseState.flaggedIds.includes(questionId);
    const nextFlags = exists
      ? baseState.flaggedIds.filter((id) => id !== questionId)
      : [...baseState.flaggedIds, questionId];

    persistLocalAndScheduleSync({
      ...baseState,
      flaggedIds: nextFlags,
    });
  };

  const handleNavigateQuestion = (index: number, closeDrawer = false) => {
    const baseState = flushPendingEssay();
    const bounded = Math.min(Math.max(0, index), questions.length - 1);
    const nextState: ExamAttemptState = {
      ...baseState,
      currentQuestionIndex: bounded,
    };
    attemptRef.current = nextState;
    void saveAttemptLocally(nextState);
    onUpdateAttempt(nextState);
    if (closeDrawer) {
      setIsQuestionDrawerOpen(false);
    }
  };

  const handleSimulationChange = (nextMode: NetworkSimulationMode) => {
    setSimMode(nextMode);
    simModeRef.current = nextMode;
    if (nextMode === 'force_offline') {
      setSyncStatus('offline_local');
    } else if (nextMode === 'force_error') {
      setSyncStatus('sync_failed');
    } else {
      void performSync();
    }
  };

  const handleToggleOfflineCorner = () => {
    const nextMode: NetworkSimulationMode = simMode === 'force_offline' ? 'auto' : 'force_offline';
    handleSimulationChange(nextMode);
  };

  const handleSimulateLowTimer = () => {
    const updated: ExamAttemptState = {
      ...attemptRef.current,
      mustSubmitBefore: Date.now() + 285 * 1000, // 4 menit 45 detik
    };
    attemptRef.current = updated;
    void saveAttemptLocally(updated);
    onUpdateAttempt(updated);
    setSecondsLeft(285);
    setIsSyncPopoverOpen(false);
  };

  const handleProtectedInteraction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    showCopyBlockedBanner();
  };

  const syncBadgeConfig = useMemo(() => {
    switch (syncStatus) {
      case 'synced':
        return {
          label: 'Tersimpan di Server',
          shortLabel: 'Tersimpan',
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70',
          icon: <Cloud className="w-4 h-4 text-[#16A34A] shrink-0" aria-hidden="true" />,
        };
      case 'syncing':
        return {
          label: 'Menyinkronkan...',
          shortLabel: 'Sync...',
          classes: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/70',
          icon: (
            <RefreshCw className="w-4 h-4 text-[#2563EB] animate-spin shrink-0" aria-hidden="true" />
          ),
        };
      case 'offline_local':
        return {
          label: 'Menyimpan Lokal - Offline',
          shortLabel: 'Offline',
          classes: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70',
          icon: <WifiOff className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />,
        };
      case 'sync_failed':
        return {
          label: 'Gagal Sinkronisasi',
          shortLabel: 'Gagal Sync',
          classes: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100/70',
          icon: <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" aria-hidden="true" />,
        };
    }
  }, [syncStatus]);

  const fontSizeClass =
    fontScale === 'sm'
      ? 'text-[14px] leading-relaxed'
      : fontScale === 'lg'
        ? 'text-[18px] leading-relaxed'
        : 'text-[16px] leading-relaxed';

  const isCurrentFlagged = attempt.flaggedIds.includes(currentQuestion.id);
  const selectedOptionId = attempt.answers[currentQuestion.id];
  const isSimulatedOffline = simMode === 'force_offline';

  const renderMatrixContent = (closeOnSelect: boolean) => (
    <>
      <div className="grid grid-cols-5 gap-2.5 mb-5">
        {questions.map((q, idx) => {
          const isActive = idx === currentIndex;
          const isAnswered = isQuestionAnswered(q, effectiveAnswers);
          const isFlagged = attempt.flaggedIds.includes(q.id);

          let cellStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80';
          let statusText = 'Belum dijawab';

          if (isActive) {
            cellStyle =
              'bg-[#2563EB] text-white border-[#2563EB] ring-2 ring-blue-200 ring-offset-1';
            statusText = 'Soal aktif';
          } else if (isFlagged) {
            cellStyle = 'bg-[#EAB308] text-slate-950 border-[#CA8A04] hover:bg-yellow-500';
            statusText = 'Ditandai ragu-ragu';
          } else if (isAnswered) {
            cellStyle = 'bg-[#16A34A] text-white border-[#15803D] hover:bg-emerald-700';
            statusText = 'Sudah terjawab';
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => handleNavigateQuestion(idx, closeOnSelect)}
              aria-label={`Soal ${idx + 1}: ${statusText}`}
              aria-current={isActive ? 'step' : undefined}
              className={`relative min-h-[44px] rounded-lg border font-mono tabular-nums text-sm font-bold flex items-center justify-center transition-colors cursor-pointer focus-ring ${cellStyle}`}
            >
              <span>{idx + 1}</span>
              {isActive && isFlagged && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#EAB308] border border-white"
                  title="Ragu-ragu"
                />
              )}
              {isActive && !isFlagged && isAnswered && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#16A34A] border border-white"
                  title="Terjawab"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Color Status Legend */}
      <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-[#2563EB] shrink-0" aria-hidden="true" />
          <span>Aktif</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#16A34A] shrink-0" aria-hidden="true" />
            <span>Terjawab</span>
          </div>
          <span className="font-mono tabular-nums font-semibold text-slate-900">
            {answeredCount}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#EAB308] shrink-0" aria-hidden="true" />
            <span>Ragu-ragu</span>
          </div>
          <span className="font-mono tabular-nums font-semibold text-slate-900">
            {flaggedCount}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 shrink-0"
              aria-hidden="true"
            />
            <span>Kosong</span>
          </div>
          <span className="font-mono tabular-nums font-semibold text-slate-900">
            {unansweredCount}
          </span>
        </div>
      </div>

      {/* Final Submit Action */}
      <div className="mt-5 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            flushPendingEssay();
            setIsQuestionDrawerOpen(false);
            setIsSubmitModalOpen(true);
          }}
          className="w-full min-h-[48px] py-3 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-ring"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span>Selesai &amp; Kumpulkan Ujian</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col overflow-x-clip pb-20 lg:pb-8">
      {/* Adaptive Sticky Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Exam Title & Student Name */}
          <div className="min-w-0 flex items-center gap-2.5 sm:gap-3.5 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-xs tracking-tight shrink-0">
              EC
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xs sm:text-base font-bold text-slate-900 truncate">
                {exam.title}
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 truncate">
                {attempt.student.fullName}{' '}
                <span aria-hidden="true">·</span>{' '}
                <span className="font-mono tabular-nums">{attempt.student.nim}</span>
              </p>
            </div>
          </div>

          {/* Right Controls: Sync Indicator + Prominent Countdown Timer */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Sync Status Badge + Detail Popover */}
            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={() => setIsSyncPopoverOpen((prev) => !prev)}
                aria-expanded={isSyncPopoverOpen}
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 min-h-[34px] sm:min-h-[38px] text-[11px] sm:text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring ${syncBadgeConfig.classes}`}
              >
                {syncBadgeConfig.icon}
                <span className="hidden lg:inline">{syncBadgeConfig.label}</span>
                <span className="lg:hidden">{syncBadgeConfig.shortLabel}</span>
              </button>

              {isSyncPopoverOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-40 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-900">Status Penyimpanan</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {attempt.pendingSync ? 'Ada antrean lokal' : 'Sinkron'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Simpan Lokal Terakhir:</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatTimeWIB(attempt.lastSavedLocallyAt ?? attempt.startedAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sinkron Server Terakhir:</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatTimeWIB(attempt.lastSyncedAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void performSync()}
                    className="w-full min-h-[38px] py-2 px-3 inline-flex items-center justify-center gap-1.5 font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Sinkronkan Sekarang</span>
                  </button>

                  {/* Network & Timer State Tester */}
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Uji Kondisi Jaringan &amp; Timer</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleSimulationChange('auto')}
                        className={`py-1.5 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          simMode === 'auto'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulationChange('force_offline')}
                        className={`py-1.5 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          simMode === 'force_offline'
                            ? 'bg-white text-amber-800 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Offline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulationChange('force_error')}
                        className={`py-1.5 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          simMode === 'force_error'
                            ? 'bg-white text-red-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Gagal Sync
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulateLowTimer}
                      className="w-full py-2 px-2.5 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Uji Peringatan Timer (&lt; 5 Menit)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Countdown Timer (Always Prominent on Right) */}
            <div
              role="timer"
              aria-live="polite"
              aria-label={`Sisa waktu ujian ${formatCountdown(secondsLeft)}`}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 min-h-[34px] sm:min-h-[38px] rounded-lg border font-mono tabular-nums text-xs sm:text-base font-bold whitespace-nowrap shrink-0 transition-colors ${
                isCriticalTime
                  ? 'bg-red-50 text-[#DC2626] border-red-300'
                  : 'bg-slate-50 text-slate-900 border-slate-200'
              }`}
            >
              {isCriticalTime ? (
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DC2626] shrink-0" aria-hidden="true" />
              ) : (
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" aria-hidden="true" />
              )}
              <span>{formatCountdown(secondsLeft)}</span>
              {isCriticalTime && (
                <span className="hidden md:inline font-sans text-[11px] font-semibold text-[#DC2626]">
                  (&lt; 5 Menit)
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Two-Column Workspace (100% Mobile/Tablet, 70%/30% Desktop) */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 min-w-0">
        <div className="flex flex-col lg:flex-row gap-6 items-start min-w-0">
          {/* Main Area — 100% on Mobile/Tablet, 70% Width on Desktop */}
          <section
            aria-label="Area Soal Ujian"
            onContextMenu={handleProtectedInteraction}
            onCopy={handleProtectedInteraction}
            onCut={handleProtectedInteraction}
            onPaste={handleProtectedInteraction}
            onDragStart={handleProtectedInteraction}
            className="w-full lg:w-[70%] min-w-0 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 lg:p-8 select-none"
          >
            {/* Question Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 sm:pb-5 mb-5 sm:mb-6 border-b border-slate-200">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold text-slate-900 tabular-nums">
                    Soal {currentIndex + 1} dari {questions.length}
                  </span>
                  <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500 truncate max-w-[220px] sm:max-w-none">
                    {currentQuestion.topic}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Mobile & Tablet Trigger: Daftar Soal (X/15) */}
                <button
                  type="button"
                  onClick={() => setIsQuestionDrawerOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-ring"
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">
                    Daftar Soal ({answeredCount}/{questions.length})
                  </span>
                </button>

                {/* Text Zoom Controls */}
                <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg">
                  <span className="sr-only">Ukuran Teks Soal</span>
                  <button
                    type="button"
                    onClick={() => setFontScale('sm')}
                    aria-pressed={fontScale === 'sm'}
                    aria-label="Perkecil ukuran teks soal"
                    className={`min-h-[32px] min-w-[32px] px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      fontScale === 'sm'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontScale('md')}
                    aria-pressed={fontScale === 'md'}
                    aria-label="Ukuran teks soal normal"
                    className={`min-h-[32px] min-w-[32px] px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      fontScale === 'md'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontScale('lg')}
                    aria-pressed={fontScale === 'lg'}
                    aria-label="Perbesar ukuran teks soal"
                    className={`min-h-[32px] min-w-[32px] px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      fontScale === 'lg'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>

            {copyBlockedNotice && (
              <div
                role="status"
                className="mb-5 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                <span>Fitur klik kanan dan salin/tempel teks dinonaktifkan selama ujian.</span>
              </div>
            )}

            {/* Question Content */}
            <div className="mb-6 sm:mb-8 min-w-0">
              {currentQuestion.image_url && (
                <div className="mb-4">
                  {brokenImageIds[currentQuestion.id] ? (
                    <div className="flex items-center gap-2.5 p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
                      <ImageOff className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>Gambar ilustrasi soal tidak dapat dimuat.</span>
                    </div>
                  ) : (
                    <div className="inline-flex flex-col items-start gap-2 max-w-full">
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: currentQuestion.image_url!,
                            caption: `Ilustrasi Soal ${currentIndex + 1} — ${currentQuestion.topic}`,
                          })
                        }
                        className="group relative max-w-full rounded-lg focus-ring cursor-zoom-in"
                        aria-label={`Perbesar gambar soal ${currentIndex + 1}`}
                      >
                        <img
                          src={currentQuestion.image_url}
                          alt={`Ilustrasi soal ${currentIndex + 1}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenImageIds((prev) => ({
                              ...prev,
                              [currentQuestion.id]: true,
                            }))
                          }
                          className="max-h-72 w-auto max-w-full object-contain rounded-lg border border-slate-200 bg-slate-50"
                        />
                        <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 group-hover:bg-blue-50 group-hover:text-[#2563EB] border border-slate-200 rounded-md transition-colors">
                          <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Klik untuk Perbesar Gambar</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <p className={`text-slate-900 font-medium max-w-[72ch] break-words ${fontSizeClass}`}>
                <MathText text={currentQuestion.prompt} />
              </p>

              {currentQuestion.codeSnippet && (
                <pre className="mt-4 p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 max-w-full overflow-x-auto leading-relaxed">
                  <code>{currentQuestion.codeSnippet}</code>
                </pre>
              )}
            </div>

            {/* Answer Area: Essay Editor vs Multiple Choice Cards */}
            {isEssayQuestion ? (
              <div className="space-y-3 select-text">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor={`essay-input-${currentQuestion.id}`}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800"
                  >
                    <AlignLeft className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                    <span>Lembar Jawaban Esai</span>
                    {currentQuestion.weight && (
                      <span className="font-mono text-xs font-normal text-slate-500">
                        (Bobot maks: {currentQuestion.weight} poin)
                      </span>
                    )}
                  </label>

                  <span className="text-[11px] font-medium text-slate-500">
                    {essaySavingState === 'typing'
                      ? 'Menyimpan ketikan...'
                      : essayDraftText.trim().length > 0
                        ? 'Tersimpan otomatis di lokal'
                        : 'Belum ada jawaban'}
                  </span>
                </div>

                {/* Basic Math / Symbol Quick Insert Bar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 px-1.5">
                    <Sigma className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                    <span>Simbol:</span>
                  </span>
                  {[
                    '±',
                    '×',
                    '÷',
                    '√',
                    'π',
                    'θ',
                    '≤',
                    '≥',
                    '≠',
                    '≈',
                    '∫',
                    'Σ',
                    '²',
                    '³',
                    '→',
                    '$...$',
                  ].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleInsertEssaySymbol(sym === '$...$' ? '$$' : sym)}
                      className="min-h-[30px] min-w-[30px] px-2 text-xs font-mono font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-[#2563EB] border border-slate-200 rounded transition-colors cursor-pointer"
                    >
                      {sym}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={essayTextareaRef}
                  id={`essay-input-${currentQuestion.id}`}
                  value={essayDraftText}
                  onChange={(e) => handleEssayChange(currentQuestion.id, e.target.value)}
                  placeholder="Tuliskan jawaban uraian Anda secara jelas dan terstruktur di sini... (Anda juga dapat menyisipkan rumus LaTeX menggunakan $...$)"
                  className={`w-full min-h-[180px] p-4 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-colors resize-y select-text ${fontSizeClass}`}
                />

                {/* Word & Character Counter */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-mono tabular-nums">
                    {essayDraftText.trim()
                      ? essayDraftText.trim().split(/\s+/).length
                      : 0}{' '}
                    kata · {essayDraftText.length} karakter
                  </span>
                  <span>Auto-save aktif (jeda 300ms)</span>
                </div>

                {/* Optional Live Math Preview if Student Uses $...$ */}
                {essayDraftText.includes('$') && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Pratinjau Rumus Jawaban Anda
                    </p>
                    <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      <MathText text={essayDraftText} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Large Clickable Option Cards (min 12px gap, 58px+ target) */
              <div
                role="radiogroup"
                aria-label={`Pilihan jawaban soal ${currentIndex + 1}`}
                className="flex flex-col gap-3 sm:gap-3.5"
              >
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  const optionImgKey = `${currentQuestion.id}-${option.id}`;
                  return (
                    <div
                      key={option.id}
                      role="radio"
                      tabIndex={0}
                      aria-checked={isSelected}
                      onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectOption(currentQuestion.id, option.id);
                        }
                      }}
                      className={`w-full text-left p-3.5 sm:p-4.5 rounded-xl border transition-all flex items-start gap-3 sm:gap-4 min-h-[58px] cursor-pointer focus-ring ${
                        isSelected
                          ? 'border-2 border-[#2563EB] bg-blue-50/50 text-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg font-mono text-sm font-bold flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {option.label}
                      </span>

                      <div className="flex-1 pt-0.5 min-w-0 space-y-2.5">
                        <span className={`block break-words min-w-0 ${fontSizeClass}`}>
                          <MathText text={option.text} />
                        </span>

                        {option.image_url && (
                          <div>
                            {brokenImageIds[optionImgKey] ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 text-xs text-slate-500">
                                <ImageOff className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Gambar opsi tidak tersedia</span>
                              </span>
                            ) : (
                              <div className="inline-flex flex-col items-start gap-1.5 max-w-full">
                                <img
                                  src={option.image_url}
                                  alt={`Gambar opsi ${option.label}`}
                                  referrerPolicy="no-referrer"
                                  onError={() =>
                                    setBrokenImageIds((prev) => ({
                                      ...prev,
                                      [optionImgKey]: true,
                                    }))
                                  }
                                  className="max-h-36 w-auto max-w-full object-contain rounded-md border border-slate-200 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxImage({
                                      url: option.image_url!,
                                      caption: `Soal ${currentIndex + 1} — Opsi ${option.label}`,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-[#2563EB] bg-slate-100 hover:bg-blue-50 rounded border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <ZoomIn className="w-3 h-3" aria-hidden="true" />
                                  <span>Perbesar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 transition-opacity ${
                          isSelected ? 'bg-[#2563EB] text-white opacity-100' : 'opacity-0'
                        }`}
                        aria-hidden="true"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile & Tablet Inline Offline Toggle (Prevents Overlap with Sticky Bottom Bar) */}
            <div className="lg:hidden mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Peserta: <strong className="text-slate-700">{attempt.student.fullName}</strong>
              </span>
              <button
                type="button"
                onClick={handleToggleOfflineCorner}
                aria-pressed={isSimulatedOffline}
                className={`inline-flex items-center gap-2 px-3 min-h-[40px] text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer focus-ring ${
                  isSimulatedOffline
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isSimulatedOffline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Simulasi: Offline (Ke Online)</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-[#16A34A] shrink-0" aria-hidden="true" />
                    <span>Simulasi: Online (Ke Offline)</span>
                  </>
                )}
              </button>
            </div>

            {/* Desktop Bottom Navigation Controls (Preserved on >1024px) */}
            <div className="hidden lg:flex mt-8 pt-6 border-t border-slate-200 flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => handleNavigateQuestion(currentIndex - 1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span>Sebelumnya</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleFlag(currentQuestion.id)}
                aria-pressed={isCurrentFlagged}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring ${
                  isCurrentFlagged
                    ? 'bg-[#EAB308] border-[#CA8A04] text-slate-950 hover:bg-yellow-500'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                <Flag className="w-4 h-4" aria-hidden="true" />
                <span>{isCurrentFlagged ? 'Ditandai Ragu-ragu' : 'Tandai Ragu-ragu'}</span>
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => handleNavigateQuestion(currentIndex + 1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    flushPendingEssay();
                    setIsSubmitModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring"
                >
                  <span>Tinjau &amp; Kumpulkan</span>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </section>

          {/* Desktop Right Sidebar — 30% Width on Desktop Only (Hidden on <lg) */}
          <aside
            aria-label="Matriks Nomor Soal"
            className="hidden lg:block w-full lg:w-[30%] bg-white border border-slate-200 rounded-xl p-6 lg:sticky lg:top-24"
          >
            <div className="flex items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Navigasi Soal</h2>
              <span className="text-xs font-semibold text-slate-600 font-mono tabular-nums">
                {answeredCount}/{questions.length} Terjawab
              </span>
            </div>

            {renderMatrixContent(false)}
          </aside>
        </div>
      </main>

      {/* Mobile & Tablet Thumb-Friendly Sticky Bottom Action Bar (<1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => handleNavigateQuestion(currentIndex - 1)}
            className="min-h-[44px] inline-flex items-center justify-center gap-1 px-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-ring"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Sebelumnya</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleFlag(currentQuestion.id)}
            aria-pressed={isCurrentFlagged}
            className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2 text-xs sm:text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer focus-ring ${
              isCurrentFlagged
                ? 'bg-[#EAB308] border-[#CA8A04] text-slate-950'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50'
            }`}
          >
            <Flag className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ragu-ragu</span>
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => handleNavigateQuestion(currentIndex + 1)}
              className="min-h-[44px] inline-flex items-center justify-center gap-1 px-2 text-xs sm:text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-ring"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                flushPendingEssay();
                setIsSubmitModalOpen(true);
              }}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2 text-xs sm:text-sm font-semibold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-ring"
            >
              <span>Kumpulkan</span>
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet / Tablet Slide-over Drawer for Question Matrix (<1024px) */}
      {isQuestionDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex items-end sm:items-stretch sm:justify-end bg-slate-900/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-matrix-title"
          onClick={() => setIsQuestionDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white border-t sm:border-t-0 sm:border-l border-slate-200 rounded-t-2xl sm:rounded-none sm:rounded-l-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] sm:max-h-full overflow-y-auto"
          >
            {/* Mobile Drag Handle Affordance */}
            <div
              className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden"
              aria-hidden="true"
            />

            <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
              <div>
                <h2 id="drawer-matrix-title" className="text-base font-bold text-slate-900">
                  Daftar Soal
                </h2>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                  {answeredCount}/{questions.length} Terjawab · {flaggedCount} Ragu-ragu
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionDrawerOpen(false)}
                aria-label="Tutup daftar soal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer focus-ring"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderMatrixContent(true)}
          </div>
        </div>
      )}

      {/* Desktop Corner Simulation Toggle: Mode Offline / Online */}
      <div className="hidden lg:block fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={handleToggleOfflineCorner}
          aria-pressed={isSimulatedOffline}
          title="Klik untuk menguji mode koneksi Offline / Online"
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg border shadow-md transition-colors whitespace-nowrap cursor-pointer focus-ring ${
            isSimulatedOffline
              ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {isSimulatedOffline ? (
            <>
              <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Simulasi: Mode Offline (Klik ke Online)</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-[#16A34A] shrink-0" aria-hidden="true" />
              <span>Simulasi: Mode Online (Klik ke Offline)</span>
            </>
          )}
        </button>
      </div>

      {/* Modals */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
        isSubmitting={isSubmitting}
        onCancel={() => setIsSubmitModalOpen(false)}
        onConfirmSubmit={() => void finalizeSubmission('manual')}
      />

      <ViolationModal
        latestViolation={pendingViolationModal}
        totalViolations={attempt.violations.length}
        onAcknowledge={() => {
          setPendingViolationModal(null);
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }}
      />

      <ImageLightboxModal
        imageUrl={lightboxImage?.url ?? null}
        caption={lightboxImage?.caption}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};
