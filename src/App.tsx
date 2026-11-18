/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildStudentQuestions } from './data/mockExam';
import { ExamAttemptState, ExamConfig, Question, StudentProfile } from './types/exam';
import {
  clearActiveAttempt,
  loadActiveAttempt,
  saveAttemptLocally,
} from './utils/storage';
import { deterministicShuffle } from './utils/prng';
import { supabase } from './lib/supabase';
import {
  authService,
  studentExamService,
  teacherExamService,
} from './services/examService';
import { AuthenticatedSession, LoginView } from './components/LoginView';
import { PortalHeader } from './components/PortalHeader';
import { LobbyView, StartedExamPayload } from './components/LobbyView';
import { RulesModal } from './components/RulesModal';
import { ExamWorkspace } from './components/ExamWorkspace';
import { SubmittedView } from './components/SubmittedView';
import { TeacherDashboard } from './components/TeacherDashboard';

type StudentStage = 'lobby' | 'workspace' | 'submitted';

function isAttemptExpired(saved: ExamAttemptState): boolean {
  if (saved.serverMustSubmitBefore && typeof saved.serverClockOffsetMs === 'number') {
    const mustMs = new Date(saved.serverMustSubmitBefore).getTime();
    if (!Number.isNaN(mustMs)) {
      const estimatedServerNow = Date.now() + saved.serverClockOffsetMs;
      return estimatedServerNow >= mustMs;
    }
  }
  return saved.mustSubmitBefore <= Date.now();
}

function buildFallbackExamConfig(saved: ExamAttemptState): ExamConfig {
  if (saved.cachedExam) return saved.cachedExam;
  return {
    id: saved.examId,
    token: saved.examToken,
    title: saved.examTitle,
    subject: 'Ujian Berbasis Komputer',
    lecturer: 'Tim Pengajar',
    durationMinutes: Math.max(
      1,
      Math.round((saved.mustSubmitBefore - saved.startedAt) / 60000),
    ),
    totalQuestions: saved.cachedQuestions?.length ?? saved.questionOrder.length,
    passingScore: 70,
    scheduleWindow: 'Sesi Aktif',
    shuffleQuestions: true,
    shuffleOptions: true,
    status: 'published',
    instructions: [],
    questions: [],
  };
}

export default function App() {
  const [authSession, setAuthSession] = useState<AuthenticatedSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Teacher state (loaded from Supabase)
  const [teacherExams, setTeacherExams] = useState<ExamConfig[]>([]);
  const [isLoadingTeacherExams, setIsLoadingTeacherExams] = useState(false);
  const [teacherExamsError, setTeacherExamsError] = useState<string | null>(null);

  // Student state
  const [studentStage, setStudentStage] = useState<StudentStage>('lobby');
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    id: '',
    fullName: '',
    nim: '',
    email: '',
    program: '',
  });
  const [attempt, setAttempt] = useState<ExamAttemptState | null>(null);
  const [pendingStart, setPendingStart] = useState<StartedExamPayload | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [submittedSynced, setSubmittedSynced] = useState(true);

  const refreshTeacherExams = useCallback(async () => {
    setIsLoadingTeacherExams(true);
    setTeacherExamsError(null);
    try {
      const list = await teacherExamService.getExamsWithQuestions();
      setTeacherExams(list);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal memuat daftar ujian dari Supabase.';
      setTeacherExamsError(msg);
    } finally {
      setIsLoadingTeacherExams(false);
    }
  }, []);

  const hydrateForSession = useCallback(
    async (session: AuthenticatedSession) => {
      setAuthSession(session);

      if (session.role === 'teacher') {
        await refreshTeacherExams();
        return;
      }

      // Role = student: prepare profile & check offline-first attempt matching this user
      const fallbackNim = session.userId.slice(0, 8).toUpperCase();
      setStudentProfile({
        id: session.userId,
        fullName: session.fullName,
        nim: fallbackNim,
        email: session.email,
        program: 'Peserta Terdaftar',
      });

      const saved = await loadActiveAttempt();
      if (saved && saved.student.id === session.userId) {
        setStudentProfile(saved.student);

        if (saved.status === 'submitted') {
          setAttempt(saved);
          setSubmittedSynced(!saved.pendingSync);
          setStudentStage('submitted');
        } else if (saved.status === 'in_progress') {
          if (isAttemptExpired(saved)) {
            let serverScore: number | null = saved.serverScore ?? null;
            let syncedOk = false;

            if (typeof navigator === 'undefined' || navigator.onLine) {
              try {
                const formattedViolations = saved.violations.map((v) => ({
                  id: v.id,
                  type: v.type,
                  timestamp: v.timestamp,
                  duration_seconds: v.durationSeconds,
                  message: v.message,
                }));
                const rpcRes = await studentExamService.syncAnswers(
                  saved.attemptId,
                  saved.answers,
                  formattedViolations,
                  true,
                );
                if (
                  rpcRes &&
                  typeof rpcRes === 'object' &&
                  typeof (rpcRes as any).score === 'number'
                ) {
                  serverScore = Number((rpcRes as any).score);
                }
                syncedOk = true;
              } catch {
                syncedOk = false;
              }
            }

            const expiredAttempt: ExamAttemptState = {
              ...saved,
              status: 'submitted',
              submittedAt: saved.mustSubmitBefore,
              submittedReason: 'timeout',
              pendingSync: !syncedOk,
              serverScore,
            };
            await saveAttemptLocally(expiredAttempt);
            setAttempt(expiredAttempt);
            setSubmittedSynced(syncedOk);
            setStudentStage('submitted');
          } else {
            setAttempt(saved);
            setStudentStage('workspace');
          }
        }
      } else {
        setAttempt(null);
        setStudentStage('lobby');
      }
    },
    [refreshTeacherExams],
  );

  useEffect(() => {
    let mounted = true;

    authService
      .getSessionProfile()
      .then(async (res) => {
        if (!mounted) return;
        if (res) {
          const rawRole = (res.profile?.role ??
            (res.user.user_metadata?.role as 'student' | 'teacher' | 'admin' | undefined) ??
            'student') as 'student' | 'teacher' | 'admin';
          const role = rawRole === 'teacher' || rawRole === 'admin' ? 'teacher' : 'student';
          const fullName =
            res.profile?.full_name ||
            (res.user.user_metadata?.full_name as string | undefined) ||
            res.user.email?.split('@')[0] ||
            'Pengguna ExamCore';

          await hydrateForSession({
            userId: res.user.id,
            email: res.user.email ?? '',
            fullName,
            role,
            rawRole,
          });
        }
      })
      .finally(() => {
        if (mounted) setIsCheckingAuth(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setAuthSession(null);
        setAttempt(null);
        setPendingStart(null);
        setIsRulesModalOpen(false);
        setTeacherExams([]);
        setStudentStage('lobby');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateForSession]);

  const handleAuthenticated = async (session: AuthenticatedSession) => {
    setIsCheckingAuth(true);
    try {
      await hydrateForSession(session);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setAuthSession(null);
    setAttempt(null);
    setPendingStart(null);
    setIsRulesModalOpen(false);
    setTeacherExams([]);
    setStudentStage('lobby');
  };

  const handleStartExamLoaded = (payload: StartedExamPayload) => {
    setPendingStart(payload);
    setIsRulesModalOpen(true);
  };

  const handleConfirmStartExam = async () => {
    if (!pendingStart) return;

    const { rawResponse, examConfig, questions, token } = pendingStart;
    const attemptId = String(rawResponse.attempt_id);
    const clientNow = Date.now();

    // Calculate server-synced countdown using timing.server_now & timing.must_submit_before
    const serverNowMs = new Date(rawResponse.timing.server_now).getTime();
    const mustSubmitServerMs = new Date(rawResponse.timing.must_submit_before).getTime();
    const serverClockOffsetMs = Number.isNaN(serverNowMs) ? 0 : serverNowMs - clientNow;
    const remainingMs =
      !Number.isNaN(serverNowMs) && !Number.isNaN(mustSubmitServerMs)
        ? Math.max(0, mustSubmitServerMs - serverNowMs)
        : examConfig.durationMinutes * 60 * 1000;

    // Preserve server question_order if returned, else deterministic shuffle per attempt & student
    const serverOrder = Array.isArray(rawResponse.question_order)
      ? rawResponse.question_order.filter((id) => questions.some((q) => q.id === id))
      : [];
    const orderedIds =
      serverOrder.length === questions.length
        ? serverOrder
        : examConfig.shuffleQuestions
          ? deterministicShuffle(
              questions,
              `${attemptId}:${studentProfile.id || studentProfile.nim}`,
            ).map((q) => q.id)
          : questions.map((q) => q.id);

    const optionOrders: Record<string, string[]> = {};
    if (examConfig.shuffleOptions) {
      for (const q of questions) {
        if (q.type !== 'essay' && q.question_type !== 'essay' && q.options.length > 0) {
          optionOrders[q.id] = deterministicShuffle(
            q.options,
            `${attemptId}:${q.id}`,
          ).map((o) => o.id);
        }
      }
    }

    const initialQuestions: Question[] = buildStudentQuestions(
      questions,
      orderedIds,
      optionOrders,
    );

    const savedAnswers =
      rawResponse.saved_answers && typeof rawResponse.saved_answers === 'object'
        ? { ...rawResponse.saved_answers }
        : {};

    const newAttempt: ExamAttemptState = {
      attemptId,
      examId: examConfig.id,
      examToken: token,
      examTitle: examConfig.title,
      student: studentProfile,
      startedAt: clientNow,
      mustSubmitBefore: clientNow + remainingMs,
      serverClockOffsetMs,
      serverMustSubmitBefore: rawResponse.timing.must_submit_before,
      isSupabaseSession: true,
      serverScore: null,
      currentQuestionIndex: 0,
      questionOrder: orderedIds,
      optionOrders,
      cachedQuestions: initialQuestions,
      cachedExam: examConfig,
      answers: savedAnswers,
      flaggedIds: [],
      violations: [],
      status: 'in_progress',
      lastSavedLocallyAt: clientNow,
      lastSyncedAt: clientNow,
      pendingSync: false,
    };

    await saveAttemptLocally(newAttempt);
    setAttempt(newAttempt);
    setIsRulesModalOpen(false);
    setPendingStart(null);
    setStudentStage('workspace');

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleResumeAttempt = () => {
    if (!attempt) return;
    setStudentStage('workspace');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleDiscardAttempt = async () => {
    await clearActiveAttempt();
    setAttempt(null);
    setStudentStage('lobby');
  };

  const handleCompleteSubmit = (finalAttempt: ExamAttemptState, synced: boolean) => {
    setAttempt(finalAttempt);
    setSubmittedSynced(synced);
    setStudentStage('submitted');
  };

  const handleReturnToLobby = async () => {
    await clearActiveAttempt();
    setAttempt(null);
    setStudentStage('lobby');
  };

  const activeExamForAttempt = useMemo(() => {
    if (!attempt) return null;
    return buildFallbackExamConfig(attempt);
  }, [attempt]);

  const activeStudentQuestions = useMemo(() => {
    if (!attempt) return [];
    return attempt.cachedQuestions ?? [];
  }, [attempt]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-500">
          Memeriksa sesi autentikasi ExamCore...
        </div>
      </div>
    );
  }

  if (!authSession) {
    return <LoginView onAuthenticated={(session) => void handleAuthenticated(session)} />;
  }

  // Distraction-free active Exam Workspace (Student)
  if (
    authSession.role === 'student' &&
    studentStage === 'workspace' &&
    attempt &&
    activeExamForAttempt
  ) {
    return (
      <ExamWorkspace
        exam={activeExamForAttempt}
        questions={activeStudentQuestions}
        attempt={attempt}
        onUpdateAttempt={setAttempt}
        onCompleteSubmit={handleCompleteSubmit}
      />
    );
  }

  // Exam Submission Summary (Student)
  if (
    authSession.role === 'student' &&
    studentStage === 'submitted' &&
    attempt &&
    activeExamForAttempt
  ) {
    return (
      <SubmittedView
        exam={activeExamForAttempt}
        questions={activeStudentQuestions}
        attempt={attempt}
        isSyncedToServer={submittedSynced}
        onReturnToLobby={() => void handleReturnToLobby()}
      />
    );
  }

  // Authenticated Portal: Student Lobby or Teacher / Admin Dashboard
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col print:block print:bg-white print:min-h-0">
      <PortalHeader
        activeRole={authSession.role}
        userName={authSession.fullName}
        userEmail={authSession.email}
        onSignOut={() => void handleSignOut()}
      />

      {authSession.role === 'student' ? (
        <LobbyView
          student={studentProfile}
          existingAttempt={attempt}
          onUpdateStudent={setStudentProfile}
          onStartExamLoaded={handleStartExamLoaded}
          onResumeAttempt={handleResumeAttempt}
          onDiscardAttempt={() => void handleDiscardAttempt()}
        />
      ) : (
        <TeacherDashboard
          teacherUserId={authSession.userId}
          teacherName={authSession.fullName}
          exams={teacherExams}
          isLoadingExams={isLoadingTeacherExams}
          examsError={teacherExamsError}
          onRefreshExams={refreshTeacherExams}
        />
      )}

      {pendingStart && (
        <RulesModal
          isOpen={isRulesModalOpen}
          exam={pendingStart.examConfig}
          student={studentProfile}
          onCancel={() => {
            setIsRulesModalOpen(false);
            setPendingStart(null);
          }}
          onConfirmStart={() => void handleConfirmStartExam()}
        />
      )}
    </div>
  );
}
