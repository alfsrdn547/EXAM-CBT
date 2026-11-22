import { supabase } from '../lib/supabase';
import {
  ExamAttemptState,
  ExamConfig,
  Question,
  QuestionOption,
  QuestionType,
  StoredQuestion,
  ViolationLog,
} from '../types/exam';

export interface AuthProfile {
  role: 'student' | 'teacher' | 'admin';
  full_name: string | null;
}

export interface StartExamTiming {
  server_now: string;
  must_submit_before: string;
}

export interface StartExamResponse {
  attempt_id: string;
  exam: {
    id: string;
    title: string;
    subject?: string;
    lecturer?: string;
    duration_minutes: number;
    passing_score?: number;
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
  };
  timing: StartExamTiming;
  saved_answers?: Record<string, string> | null;
  question_order?: string[] | null;
  questions: Array<{
    id: string;
    type?: string;
    question_type?: string;
    topic?: string;
    content?: string;
    prompt?: string;
    image_url?: string | null;
    code_snippet?: string | null;
    codeSnippet?: string | null;
    weight?: number | null;
    options?: Array<{
      id: string;
      label?: string;
      text: string;
      image_url?: string | null;
    }>;
  }>;
}

// 1. Autentikasi Login & Register
export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile } = await supabase
      .from('profil')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();

    return { user: data.user, profile: profile as AuthProfile | null };
  },

  async signUp(email: string, password: string, fullName: string, role: 'student' | 'teacher') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async getSessionProfile() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profil')
      .select('role, full_name')
      .eq('id', session.user.id)
      .single();

    return {
      user: session.user,
      profile: profile as AuthProfile | null,
    };
  },
};

// 2. Layanan Ujian Peserta (Lobby, Sync Offline-First, & Final Submit)
export const studentExamService = {
  async startExam(token: string): Promise<StartExamResponse> {
    const { data, error } = await supabase.rpc('start_exam_session', {
      p_token: token.trim().toUpperCase(),
    });
    if (error) throw new Error(error.message);
    return data as StartExamResponse;
  },

  async syncAnswers(
    attemptId: string,
    answers: Record<string, string>,
    violations: any[],
    isFinal = false,
  ) {
    const { data, error } = await supabase.rpc('sync_and_submit_exam', {
      p_attempt_id: attemptId,
      p_answers: answers,
      p_violations: violations,
      p_is_final: isFinal,
    });
    if (error) throw error;
    return data;
  },
};

function normalizeQuestionContent(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/^<p[^>]*>/i, '')
    .replace(/<\/p>$/i, '')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .trim();
}

function mapSupabaseQuestionRow(row: any, index: number): StoredQuestion {
  const qType: QuestionType =
    row.question_type === 'essay' || row.type === 'essay' ? 'essay' : 'multiple_choice';
  const rawOptions = Array.isArray(row.options) ? row.options : [];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const options: QuestionOption[] =
    qType === 'essay'
      ? []
      : rawOptions.map((opt: any, optIdx: number) => ({
          id: String(opt.id ?? `opt-${optIdx}`),
          label: String(opt.label ?? letters[optIdx] ?? String(optIdx + 1)),
          text: String(opt.text ?? ''),
          image_url: opt.image_url ? String(opt.image_url) : undefined,
        }));

  const answerKey = row.answer_key ?? {};
  const weight = Number(answerKey.weight ?? row.weight ?? (qType === 'essay' ? 5 : 1)) || 1;
  const correctOptionId = String(answerKey.correct_option_id ?? '');
  const rubric = answerKey.rubric ? String(answerKey.rubric) : undefined;
  const imageUrl =
    row.image_url || answerKey.image_url ? String(row.image_url || answerKey.image_url) : undefined;
  const topic = String(answerKey.topic ?? row.topic ?? 'Umum');
  const codeSnippet = answerKey.code_snippet ? String(answerKey.code_snippet) : undefined;

  return {
    id: String(row.id),
    order: typeof row.order_index === 'number' ? row.order_index + 1 : index + 1,
    topic,
    type: qType,
    question_type: qType,
    prompt: normalizeQuestionContent(row.content ?? row.prompt),
    image_url: imageUrl,
    codeSnippet,
    options,
    correctOptionId,
    rubric,
    weight,
  };
}

export function mapStartResponseToStudentQuestions(
  rawQuestions: StartExamResponse['questions'],
): Question[] {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  return (rawQuestions ?? []).map((q, idx) => {
    const qType: QuestionType =
      q.type === 'essay' || q.question_type === 'essay' ? 'essay' : 'multiple_choice';
    const options: QuestionOption[] =
      qType === 'essay'
        ? []
        : (q.options ?? []).map((opt, optIdx) => ({
            id: String(opt.id),
            label: opt.label ? String(opt.label) : letters[optIdx] ?? String(optIdx + 1),
            text: String(opt.text ?? ''),
            image_url: opt.image_url ? String(opt.image_url) : undefined,
          }));

    return {
      id: String(q.id),
      order: idx + 1,
      topic: q.topic ? String(q.topic) : 'Materi Ujian',
      type: qType,
      question_type: qType,
      prompt: normalizeQuestionContent(q.content ?? q.prompt),
      image_url: q.image_url ? String(q.image_url) : undefined,
      codeSnippet: q.codeSnippet || q.code_snippet || undefined,
      options,
      weight: typeof q.weight === 'number' ? q.weight : undefined,
    };
  });
}

// 3. Layanan Pengajar (Live Monitoring & Manajemen Ujian / Bank Soal)
export const teacherExamService = {
  async getLiveMonitoring(examId: string) {
    const { data, error } = await supabase
      .from('percobaan_ujian')
      .select(`
        id,
        status,
        started_at,
        submitted_at,
        answers,
        violation_logs,
        score,
        profil ( full_name )
      `)
      .eq('exam_id', examId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getExamsWithQuestions(): Promise<ExamConfig[]> {
    const { data, error } = await supabase
      .from('ujian')
      .select(
        `
        id,
        created_by,
        title,
        token,
        duration_minutes,
        start_time,
        end_time,
        shuffle_questions,
        shuffle_options,
        status,
        created_at,
        pertanyaan (
          id,
          exam_id,
          question_type,
          content,
          options,
          answer_key,
          order_index
        )
      `,
      )
      .is('deleted_date', null)
      .is('pertanyaan.deleted_date', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => {
      const sortedQRows = [...(row.pertanyaan ?? [])].sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
      );
      const questions = sortedQRows.map((qRow: any, idx: number) =>
        mapSupabaseQuestionRow(qRow, idx),
      );
      const startDate = row.start_time ? new Date(row.start_time) : null;
      const endDate = row.end_time ? new Date(row.end_time) : null;
      const scheduleWindow =
        startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())
          ? `${startDate.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
            })}, ${startDate.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })} – ${endDate.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })} WIB`
          : 'Aktif Sesuai Jadwal';

      return {
        id: String(row.id),
        token: String(row.token),
        title: String(row.title),
        subject: 'Ujian Terjadwal Supabase',
        lecturer: 'Pengajar ExamCore',
        durationMinutes: Number(row.duration_minutes ?? 60),
        totalQuestions: questions.length,
        passingScore: 70,
        scheduleWindow,
        shuffleQuestions: Boolean(row.shuffle_questions ?? true),
        shuffleOptions: Boolean(row.shuffle_options ?? true),
        status: row.status === 'published' ? 'published' : 'draft',
        instructions: [
          'Waktu ujian berjalan mundur secara sinkron dengan server setelah sesi dimulai.',
          'Jawaban tersimpan otomatis ke perangkat dan disinkronkan secara berkala ke server.',
          'Dilarang berpindah tab, meminimalkan browser, atau menyalin teks soal.',
          'Jika waktu habis, sistem akan mengumpulkan jawaban secara otomatis.',
        ],
        questions,
      } satisfies ExamConfig;
    });
  },

  async createExam(input: {
    createdBy: string;
    title: string;
    token: string;
    durationMinutes: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    status: 'published' | 'draft';
  }): Promise<string> {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from('ujian')
      .insert({
        created_by: input.createdBy,
        title: input.title,
        token: input.token.trim().toUpperCase(),
        duration_minutes: input.durationMinutes,
        start_time: now.toISOString(),
        end_time: end.toISOString(),
        shuffle_questions: input.shuffleQuestions,
        shuffle_options: input.shuffleOptions,
        status: input.status,
      })
      .select('id')
      .single();

    if (error) throw error;
    return String(data.id);
  },

  async updateExam(
    examId: string,
    input: {
      title: string;
      token: string;
      durationMinutes: number;
      shuffleQuestions: boolean;
      shuffleOptions: boolean;
      status: 'published' | 'draft';
    },
  ): Promise<void> {
    const { error } = await supabase
      .from('ujian')
      .update({
        title: input.title,
        token: input.token.trim().toUpperCase(),
        duration_minutes: input.durationMinutes,
        shuffle_questions: input.shuffleQuestions,
        shuffle_options: input.shuffleOptions,
        status: input.status,
      })
      .eq('id', examId)
      .is('deleted_date', null);

    if (error) throw error;
  },

  async insertQuestion(examId: string, question: StoredQuestion, orderIndex: number): Promise<string> {
    const isEssay = question.type === 'essay' || question.question_type === 'essay';
    const { data, error } = await supabase
      .from('pertanyaan')
      .insert({
        exam_id: examId,
        question_type: isEssay ? 'essay' : 'multiple_choice',
        content: question.prompt,
        options: isEssay
          ? []
          : question.options.map((o) => ({
              id: o.id,
              label: o.label,
              text: o.text,
              ...(o.image_url ? { image_url: o.image_url } : {}),
            })),
        answer_key: {
          correct_option_id: isEssay ? null : question.correctOptionId,
          weight: question.weight,
          ...(question.rubric ? { rubric: question.rubric } : {}),
          ...(question.topic ? { topic: question.topic } : {}),
          ...(question.image_url ? { image_url: question.image_url } : {}),
          ...(question.codeSnippet ? { code_snippet: question.codeSnippet } : {}),
        },
        order_index: orderIndex,
      })
      .select('id')
      .single();

    if (error) throw error;
    return String(data.id);
  },

  async updateQuestion(question: StoredQuestion, orderIndex: number): Promise<void> {
    const isEssay = question.type === 'essay' || question.question_type === 'essay';
    const { error } = await supabase
      .from('pertanyaan')
      .update({
        question_type: isEssay ? 'essay' : 'multiple_choice',
        content: question.prompt,
        options: isEssay
          ? []
          : question.options.map((o) => ({
              id: o.id,
              label: o.label,
              text: o.text,
              ...(o.image_url ? { image_url: o.image_url } : {}),
            })),
        answer_key: {
          correct_option_id: isEssay ? null : question.correctOptionId,
          weight: question.weight,
          ...(question.rubric ? { rubric: question.rubric } : {}),
          ...(question.topic ? { topic: question.topic } : {}),
          ...(question.image_url ? { image_url: question.image_url } : {}),
          ...(question.codeSnippet ? { code_snippet: question.codeSnippet } : {}),
        },
        order_index: orderIndex,
      })
      .eq('id', question.id)
      .is('deleted_date', null);

    if (error) throw error;
  },

  async insertQuestionsBatch(
    examId: string,
    questions: StoredQuestion[],
    startOrderIndex: number,
  ): Promise<void> {
    if (questions.length === 0) return;
    const payload = questions.map((question, idx) => {
      const isEssay = question.type === 'essay' || question.question_type === 'essay';
      return {
        exam_id: examId,
        question_type: isEssay ? 'essay' : 'multiple_choice',
        content: question.prompt,
        options: isEssay
          ? []
          : question.options.map((o) => ({
              id: o.id,
              label: o.label,
              text: o.text,
              ...(o.image_url ? { image_url: o.image_url } : {}),
            })),
        answer_key: {
          correct_option_id: isEssay ? null : question.correctOptionId,
          weight: question.weight,
          ...(question.rubric ? { rubric: question.rubric } : {}),
          ...(question.topic ? { topic: question.topic } : {}),
          ...(question.image_url ? { image_url: question.image_url } : {}),
          ...(question.codeSnippet ? { code_snippet: question.codeSnippet } : {}),
        },
        order_index: startOrderIndex + idx,
      };
    });

    const { error } = await supabase.from('pertanyaan').insert(payload);
    if (error) throw error;
  },

  async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from('pertanyaan')
      .update({ deleted_date: new Date().toISOString() })
      .eq('id', questionId)
      .is('deleted_date', null);
    if (error) throw error;
  },

  async updateAttemptScore(attemptId: string, score: number): Promise<void> {
    const { error } = await supabase
      .from('percobaan_ujian')
      .update({ score })
      .eq('id', attemptId);
    if (error) throw error;
  },
};

export function mapMonitoringRowsToAttempts(
  rows: any[],
  exam: ExamConfig,
): ExamAttemptState[] {
  return (rows ?? []).map((row) => {
    const profileObj = Array.isArray(row.profil) ? row.profil[0] : row.profil;
    const fullName = profileObj?.full_name || 'Peserta Ujian';
    const rawViolations = Array.isArray(row.violation_logs) ? row.violation_logs : [];
    const violations: ViolationLog[] = rawViolations.map((v: any, idx: number) => ({
      id: String(v.id ?? `vio-${row.id}-${idx}`),
      type: (v.type as ViolationLog['type']) ?? 'TAB_HIDDEN',
      timestamp: String(v.timestamp ?? new Date().toISOString()),
      durationSeconds: Number(v.duration_seconds ?? v.durationSeconds ?? 1),
      message: String(
        v.message ?? 'Sistem mendeteksi peserta berpindah tab atau jendela ujian.',
      ),
    }));

    const startedAt = row.started_at ? new Date(row.started_at).getTime() : Date.now();
    const submittedAt = row.submitted_at ? new Date(row.submitted_at).getTime() : undefined;
    const status: 'in_progress' | 'submitted' =
      row.status === 'submitted' || row.status === 'expired' ? 'submitted' : 'in_progress';
    const numericScore =
      row.score !== null && row.score !== undefined ? Number(row.score) : undefined;

    return {
      attemptId: String(row.id),
      examId: exam.id,
      examToken: exam.token,
      examTitle: exam.title,
      student: {
        id: String(row.student_id ?? row.id),
        fullName,
        nim: String(row.id).slice(0, 8).toUpperCase(),
        email: '',
        program: '',
      },
      startedAt,
      mustSubmitBefore: startedAt + exam.durationMinutes * 60 * 1000,
      currentQuestionIndex: 0,
      questionOrder: exam.questions.map((q) => q.id),
      optionOrders: {},
      answers: (row.answers as Record<string, string>) ?? {},
      flaggedIds: [],
      violations,
      status,
      submittedAt,
      lastSyncedAt: submittedAt ?? startedAt,
      pendingSync: false,
      serverScore: numericScore ?? null,
    };
  });
}
