import React, { useEffect, useState } from 'react';
import { GraduationCap, LogOut, Shield, Wifi, WifiOff } from 'lucide-react';
import { UserRole } from '../types/exam';

interface PortalHeaderProps {
  activeRole: UserRole;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  activeRole,
  userName,
  userEmail,
  onSignOut,
}) => {
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-xs sm:text-sm tracking-tight">
            EC
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
            ExamCore
          </span>
        </div>

        {/* Authenticated User Role & Identity */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 min-w-0 truncate">
          {activeRole === 'teacher' ? (
            <Shield className="w-4 h-4 text-slate-800 shrink-0" aria-hidden="true" />
          ) : (
            <GraduationCap className="w-4 h-4 text-[#2563EB] shrink-0" aria-hidden="true" />
          )}
          <span className="font-semibold text-slate-900 truncate">{userName}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{userEmail}</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-slate-700 shrink-0">
            {activeRole === 'teacher' ? 'Pengajar / Admin' : 'Peserta Ujian'}
          </span>
        </div>

        {/* Connection Indicator + Sign Out */}
        <div className="flex items-center gap-3 sm:gap-4 whitespace-nowrap shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 text-[#16A34A]">
                <Wifi className="w-4 h-4" aria-hidden="true" />
                <span>Terhubung</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <WifiOff className="w-4 h-4" aria-hidden="true" />
                <span>Offline</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer focus-ring"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
