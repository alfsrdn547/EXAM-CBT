import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { authService } from '../services/examService';
import { UserRole } from '../types/exam';

export interface AuthenticatedSession {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  rawRole: 'student' | 'teacher' | 'admin';
}

interface LoginViewProps {
  onAuthenticated: (session: AuthenticatedSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registerRole, setRegisterRole] = useState<'student' | 'teacher'>('student');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedEmail = email.trim();
    if (!cleanedEmail || !password) {
      setErrorMessage('Email dan kata sandi wajib diisi.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setErrorMessage('Nama lengkap wajib diisi untuk pendaftaran akun.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        const { user, profile } = await authService.signIn(cleanedEmail, password);
        const rawRole = (profile?.role ??
          (user.user_metadata?.role as 'student' | 'teacher' | 'admin' | undefined) ??
          'student') as 'student' | 'teacher' | 'admin';
        const resolvedRole: UserRole =
          rawRole === 'teacher' || rawRole === 'admin' ? 'teacher' : 'student';
        const resolvedName =
          profile?.full_name ||
          (user.user_metadata?.full_name as string | undefined) ||
          cleanedEmail.split('@')[0];

        onAuthenticated({
          userId: user.id,
          email: user.email ?? cleanedEmail,
          fullName: resolvedName,
          role: resolvedRole,
          rawRole,
        });
      } else {
        const signUpRes = await authService.signUp(
          cleanedEmail,
          password,
          fullName.trim(),
          registerRole,
        );

        if (signUpRes.session && signUpRes.user) {
          onAuthenticated({
            userId: signUpRes.user.id,
            email: signUpRes.user.email ?? cleanedEmail,
            fullName: fullName.trim(),
            role: registerRole,
            rawRole: registerRole,
          });
        } else {
          setSuccessMessage(
            'Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi lalu masuk dengan akun tersebut.',
          );
          setMode('login');
          setPassword('');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal melakukan autentikasi.';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage('Email atau kata sandi tidak sesuai. Silakan periksa kembali.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('Email akun belum terkonfirmasi. Periksa kotak masuk email Anda.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Clean Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm tracking-tight">
              EC
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ExamCore</span>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Platform Ujian Berbasis Komputer
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Intro Panel */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-10 flex flex-col justify-between">
            <div className="space-y-5">
              <p className="text-xs font-semibold text-[#2563EB]">
                Autentikasi Terintegrasi Supabase
              </p>
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
                style={{ textWrap: 'balance' }}
              >
                Masuk ke Ruang Ujian &amp; Konsol Evaluasi ExamCore
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-[60ch]">
                Sistem secara otomatis mengarahkan akun Anda ke <strong>Lobby Peserta Ujian</strong>{' '}
                atau <strong>Dashboard Pengajar</strong> sesuai peran yang terdaftar di basis data.
              </p>

              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <GraduationCap className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                    <span>Peserta Ujian</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Verifikasi token ujian, hitung mundur sinkron server, serta penyimpanan otomatis
                    offline-first di IndexedDB dan LocalStorage.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />
                    <span>Pengajar / Admin</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kelola paket ujian, import massal soal Excel/CSV, pemantauan peserta langsung,
                    dan cetak dokumen resmi A4.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-500">
              Gunakan email dan kata sandi akun ExamCore Anda yang terdaftar.
            </p>
          </section>

          {/* Right Auth Form Card */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className={`py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Masuk Akun
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daftar Baru
                </button>
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {mode === 'login' ? 'Masuk ke ExamCore' : 'Buat Akun ExamCore'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-5">
                {mode === 'login'
                  ? 'Masukkan email dan kata sandi akun Anda.'
                  : 'Daftarkan akun baru sebagai Peserta atau Pengajar.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {mode === 'register' && (
                  <>
                    <div>
                      <label
                        htmlFor="auth-fullname"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Nama Lengkap
                      </label>
                      <div className="relative">
                        <User
                          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="auth-fullname"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Contoh: Ahmad Fauzan"
                          className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Peran Akun
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRegisterRole('student')}
                          className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            registerRole === 'student'
                              ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Peserta (Student)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegisterRole('teacher')}
                          className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            registerRole === 'teacher'
                              ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Pengajar (Teacher)
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@institusi.ac.id"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-password"
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {successMessage && (
                  <div
                    role="status"
                    className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] py-2.5 px-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors cursor-pointer focus-ring"
                >
                  <span>
                    {isSubmitting
                      ? 'Memproses...'
                      : mode === 'login'
                        ? 'Masuk ke Portal'
                        : 'Daftarkan Akun'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
