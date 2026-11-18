export type UserRole = 'student' | 'teacher';

export type QuestionType = 'multiple_choice' | 'essay';

export interface StudentProfile {
  id: string;
  fullName: string;
  nim: string;
  email: string;
  program: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
  image_url?: string;
}

export interface Question {
  id: string;
  order: number;
  topic: string;
  type: QuestionType;
  question_type?: QuestionType;
  prompt: string;
  image_url?: string;
  codeSnippet?: string;
  options: QuestionOption[];
  weight?: number;
}

export interface StoredQuestion extends Question {
  correctOptionId: string;
  rubric?: string;
  weight: number;
}

export interface ExamConfig {
  id: string;
  token: string;
  title: string;
  subject: string;
  lecturer: string;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  scheduleWindow: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: 'published' | 'draft';
  instructions: string[];
  questions: StoredQuestion[];
}

export type SyncStatus = 'synced' | 'syncing' | 'offline_local' | 'sync_failed';

export type NetworkSimulationMode = 'auto' | 'force_offline' | 'force_error';

export interface ViolationLog {
  id: string;
  type: 'TAB_HIDDEN' | 'FULLSCREEN_EXIT' | 'COPY_ATTEMPT';
  timestamp: string;
  durationSeconds: number;
  message: string;
}

export interface QuestionGradingDetail {
  questionId: string;
  order: number;
  topic: string;
  questionType: QuestionType;
  prompt: string;
  weight: number;
  earnedWeight: number;
  selectedOptionId?: string;
  selectedLabel?: string;
  selectedText?: string;
  essayAnswer?: string;
  rubric?: string;
  correctOptionId: string;
  correctLabel: string;
  correctText: string;
  status: 'correct' | 'incorrect' | 'unanswered' | 'pending_review' | 'graded';
}

export interface ExamGradingSummary {
  score: number;
  passed: boolean;
  passingScore: number;
  totalQuestions: number;
  totalWeight: number;
  earnedWeight: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  hasEssay: boolean;
  essayCount: number;
  essayGradedCount: number;
  essayPendingCount: number;
  mcWeightTotal: number;
  mcWeightEarned: number;
  essayWeightTotal: number;
  essayWeightEarned: number;
  gradingStatus: 'auto_graded' | 'pending_essay' | 'fully_graded';
  details: QuestionGradingDetail[];
}

export interface ExamAttemptState {
  attemptId: string;
  examId: string;
  examToken: string;
  examTitle: string;
  student: StudentProfile;
  startedAt: number;
  mustSubmitBefore: number;
  currentQuestionIndex: number;
  questionOrder: string[];
  optionOrders: Record<string, string[]>;
  cachedQuestions?: Question[];
  answers: Record<string, string>;
  essayScores?: Record<string, number>;
  flaggedIds: string[];
  violations: ViolationLog[];
  status: 'in_progress' | 'submitted';
  submittedAt?: number;
  submittedReason?: 'manual' | 'timeout';
  lastSavedLocallyAt?: number;
  lastSyncedAt?: number;
  pendingSync: boolean;
  gradingSummary?: ExamGradingSummary;
}
