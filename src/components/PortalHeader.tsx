import React, { useEffect, useState } from 'react';
import { GraduationCap, Shield, Wifi, WifiOff } from 'lucide-react';
import { UserRole } from '../types/exam';

interface PortalHeaderProps {
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({ activeRole, onChangeRole }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-xs sm:text-sm tracking-tight">
            EC
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
            ExamCore
          </span>
        </div>

        {/* Role Switcher */}
        <nav
          aria-label="Pilih Peran Pengguna"
          className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg shrink-0"
        >
          <button
            type="button"
            onClick={() => onChangeRole('student')}
            aria-pressed={activeRole === 'student'}
            className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 min-h-[36px] sm:min-h-[38px] text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring ${
              activeRole === 'student'
                ? 'bg-white text-[#2563EB] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">Peserta</span>
            <span className="hidden sm:inline">Peserta Ujian</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeRole('teacher')}
            aria-pressed={activeRole === 'teacher'}
            className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 min-h-[36px] sm:min-h-[38px] text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-ring ${
              activeRole === 'teacher'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">Pengajar</span>
            <span className="hidden sm:inline">Pengajar / Admin</span>
          </button>
        </nav>

        {/* Connection Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium whitespace-nowrap shrink-0">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 text-[#16A34A]">
              <Wifi className="w-4 h-4" aria-hidden="true" />
              <span>Koneksi Terhubung</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <WifiOff className="w-4 h-4" aria-hidden="true" />
              <span>Mode Offline</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
