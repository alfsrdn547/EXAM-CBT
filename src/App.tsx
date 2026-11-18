/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_STUDENT,
  MOCK_EXAM_CONFIG,
  buildStudentQuestions,
  evaluateExamAnswers,
} from './data/mockExam';
import { ExamAttemptState, ExamConfig, StudentProfile, UserRole } from './types/exam';
import {
  clearActiveAttempt,
  loadActiveAttempt,
  saveAttemptLocally,
} from './utils/storage';
import {
  loadExams,
  saveExams,
  upsertMonitoringAttempt,
} from './utils/examStore';
import { deterministicShuffle } from './utils/prng';
import { PortalHeader } from './components/PortalHeader';
import { LobbyView } from './components/LobbyView';
import { RulesModal } from './components/RulesModal';
import { ExamWorkspace } from './components/ExamWorkspace';
import { SubmittedView } from './components/SubmittedView';
import { TeacherDashboard } from './components/TeacherDashboard';

type StudentStage = 'lobby' | 'workspace' | 'submitted';

function generateAttemptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function App() {
  const [role, setRole] = useState<UserRole>('student');
  const [exams, setExams] = useState<ExamConfig[]>(() => loadExams());
  const [studentStage, setStudentStage] = useState<StudentStage>('lobby');
  const [student, setStudent] = useState<StudentProfile>(DEFAULT_STUDENT);
  const [attempt, setAttempt] = useState<ExamAttemptState | null>(null);
  const [pendingExam, setPendingExam] = useState<ExamConfig | null>(null);
  const [prefilledToken, setPrefilledToken] = useState<string>('');
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [submittedSynced, setSubmittedSynced] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadedExams = loadExams();
    setExams(loadedExams);

    loadActiveAttempt()
      .then(async (saved) => {
        if (!mounted) return;
        if (saved) {
          setStudent(saved.student);
          const matchedExam =
            loadedExams.find((ex) => ex.id === saved.examId) ??
            loadedExams.find((ex) => ex.token === saved.examToken) ??
            loadedExams[0] ??
            MOCK_EXAM_CONFIG;

          if (saved.status === 'submitted') {
            setAttempt(saved);
            setSubmittedSynced(!saved.pendingSync);
            setStudentStage('submitted');
          } else if (saved.status === 'in_progress') {
            if (saved.mustSubmitBefore <= Date.now()) {
              const gradingSummary = evaluateExamAnswers(
                matchedExam.questions,
                saved.answers,
                matchedExam.passingScore,
                saved.questionOrder,
                saved.optionOrders,
                saved.essayScores,
              );
              const expiredAttempt: ExamAttemptState = {
                ...saved,
                status: 'submitted',
                submittedAt: saved.mustSubmitBefore,
                submittedReason: 'timeout',
                gradingSummary,
              };
              await saveAttemptLocally(expiredAttempt);
              upsertMonitoringAttempt(expiredAttempt);
              if (!mounted) return;
              setAttempt(expiredAttempt);
              setSubmittedSynced(typeof navigator !== 'undefined' ? navigator.onLine : true);
              setStudentStage('submitted');
            } else {
              setAttempt(saved);
              setStudentStage('workspace');
            }
          }
        }
      })
      .finally(() => {
        if (mounted) setIsHydrating(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveExams = (nextExams: ExamConfig[]) => {
    setExams(nextExams);
    saveExams(nextExams);
  };

  const handleTokenVerified = (matchedExam: ExamConfig) => {
    setPendingExam(matchedExam);
    setIsRulesModalOpen(true);
  };

  const handleStartNewExam = async () => {
    const targetExam = pendingExam ?? exams[0] ?? MOCK_EXAM_CONFIG;
    const now = Date.now();
    const attemptId = generateAttemptId();

    const orderedIds = targetExam.shuffleQuestions
      ? deterministicShuffle(
          targetExam.questions,
          `${attemptId}:${student.id || student.nim}`,
        ).map((q) => q.id)
      : targetExam.questions.map((q) => q.id);

    const optionOrders: Record<string, string[]> = {};
    if (targetExam.shuffleOptions) {
      for (const q of targetExam.questions) {
        if (q.type !== 'essay' && q.question_type !== 'essay' && q.options.length > 0) {
          optionOrders[q.id] = deterministicShuffle(
            q.options,
            `${attemptId}:${q.id}`,
          ).map((o) => o.id);
        }
      }
    }

    const initialQuestions = buildStudentQuestions(
      targetExam.questions,
      orderedIds,
      optionOrders,
    );

    const newAttempt: ExamAttemptState = {
      attemptId,
      examId: targetExam.id,
      examToken: targetExam.token,
      examTitle: targetExam.title,
      student,
      startedAt: now,
      mustSubmitBefore: now + targetExam.durationMinutes * 60 * 1000,
      currentQuestionIndex: 0,
      questionOrder: orderedIds,
      optionOrders,
      cachedQuestions: initialQuestions,
      answers: {},
      flaggedIds: [],
      violations: [],
      status: 'in_progress',
      lastSavedLocallyAt: now,
      lastSyncedAt: now,
      pendingSync: false,
    };

    await saveAttemptLocally(newAttempt);
    upsertMonitoringAttempt(newAttempt);
    setAttempt(newAttempt);
    setIsRulesModalOpen(false);
    setPendingExam(null);
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
    upsertMonitoringAttempt(finalAttempt);
    setAttempt(finalAttempt);
    setSubmittedSynced(synced);
    setStudentStage('submitted');
  };

  const handleReturnToLobby = async () => {
    await clearActiveAttempt();
    setAttempt(null);
    setPrefilledToken('');
    setStudentStage('lobby');
  };

  const handleTestAsStudentWithToken = async (token: string) => {
    await clearActiveAttempt();
    setAttempt(null);
    setPrefilledToken(token);
    setStudentStage('lobby');
    setRole('student');
  };

  const activeExamForAttempt = useMemo(() => {
    if (!attempt) return exams[0] ?? MOCK_EXAM_CONFIG;
    return (
      exams.find((e) => e.id === attempt.examId) ??
      exams.find((e) => e.token === attempt.examToken) ??
      exams[0] ??
      MOCK_EXAM_CONFIG
    );
  }, [attempt, exams]);

  const activeStudentQuestions = useMemo(() => {
    if (!attempt) return [];
    if (attempt.cachedQuestions && attempt.cachedQuestions.length > 0) {
      return attempt.cachedQuestions;
    }
    return buildStudentQuestions(
      activeExamForAttempt.questions,
      attempt.questionOrder,
      attempt.optionOrders,
    );
  }, [activeExamForAttempt, attempt]);

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-500">Memuat aplikasi ExamCore...</div>
      </div>
    );
  }

  // Distraction-free active Exam Workspace (Student)
  if (role === 'student' && studentStage === 'workspace' && attempt) {
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

  // Exam Submission & Auto-Grading Summary (Student)
  if (role === 'student' && studentStage === 'submitted' && attempt) {
    return (
      <SubmittedView
        exam={activeExamForAttempt}
        attempt={attempt}
        isSyncedToServer={submittedSynced}
        onReturnToLobby={() => void handleReturnToLobby()}
      />
    );
  }

  // Start Page with Role Switcher: Student Lobby vs Teacher / Admin Console
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col print:block print:bg-white print:min-h-0">
      <PortalHeader activeRole={role} onChangeRole={setRole} />

      {role === 'student' ? (
        <LobbyView
          exams={exams}
          defaultExam={exams[0] ?? MOCK_EXAM_CONFIG}
          student={student}
          existingAttempt={attempt}
          prefilledToken={prefilledToken}
          onUpdateStudent={setStudent}
          onTokenVerified={handleTokenVerified}
          onResumeAttempt={handleResumeAttempt}
          onDiscardAttempt={() => void handleDiscardAttempt()}
        />
      ) : (
        <TeacherDashboard
          exams={exams}
          onSaveExams={handleSaveExams}
          onTestAsStudentWithToken={(tok) => void handleTestAsStudentWithToken(tok)}
        />
      )}

      <RulesModal
        isOpen={isRulesModalOpen}
        exam={pendingExam ?? exams[0] ?? MOCK_EXAM_CONFIG}
        student={student}
        onCancel={() => {
          setIsRulesModalOpen(false);
          setPendingExam(null);
        }}
        onConfirmStart={() => void handleStartNewExam()}
      />
    </div>
  );
}
