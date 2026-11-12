import React from 'react';
import {
  Vote as VoteIcon,
  BarChart3,
  Users,
  ShieldCheck,
  Building2,
  Calendar,
  Shield,
  FileText,
  Printer,
  Sparkles,
  Radio,
  Lock,
  PauseCircle,
  LogIn,
  LogOut,
  Eye,
  UserPlus,
  UploadCloud,
  Database,
  BookOpen,
  ClipboardCheck,
  UserCheck,
  Tv,
  EyeOff,
} from 'lucide-react';
import type { AuthStaffUser, ElectionPeriod, SchoolConfig } from '../types/index.ts';
import { CommitteeTab } from './CommitteeDashboard';
import { AdminTab } from './AdminSchoolSettings';

interface NavbarProps {
  currentUser: AuthStaffUser | null;
  currentView: 'home' | 'committee' | 'admin';
  panitiaTab: CommitteeTab;
  adminTab: AdminTab;
  onNavigateHome: () => void;
  onSelectPanitiaTab: (tab: CommitteeTab) => void;
  onSelectAdminTab: (tab: AdminTab) => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
  onOpenBooth: () => void;
  onOpenGuideModal?: () => void;
  onOpenProjector?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  panitiaTab,
  adminTab,
  onNavigateHome,
  onSelectPanitiaTab,
  onSelectAdminTab,
  onOpenLoginModal,
  onLogout,
  activePeriod,
  schoolConfig,
  onOpenBooth,
  onOpenGuideModal,
  onOpenProjector,
}) => {
  const getSessionBadge = () => {
    switch (activePeriod.voting_session_status) {
      case 'OPEN':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bilik Buka</span>
          </div>
        );
      case 'PAUSED':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Bilik Dijeda</span>
          </div>
        );
      case 'CLOSED':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <Lock className="w-3.5 h-3.5" />
            <span>Sesi Ditutup</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-colors no-print">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Zone 1: Brand & Role Indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 overflow-hidden p-1 border border-slate-700/60 shrink-0">
                {schoolConfig.logo_url ? (
                  <img
                    src={schoolConfig.logo_url}
                    alt={`Logo ${schoolConfig.organization_type}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <VoteIcon className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base lg:text-lg tracking-tight">
                    E-VOTING {schoolConfig.organization_type}
                  </span>
                  {currentUser ? (
                    <span className={`text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {currentUser.role === 'admin' ? 'Admin' : 'Panitia'}
                    </span>
                  ) : (
                    <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {activePeriod.year_label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate max-w-[130px] sm:max-w-[200px] md:max-w-xs">
                  {schoolConfig.school_name}
                </p>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Scrollable if viewport is tight, so it NEVER pushes Zone 3 off-screen) */}
          <nav className="hidden lg:flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar mx-1">
            
            {/* PUBLIC: Menampilkan Beranda / Quick Count */}
            {!currentUser && (
              <button
                onClick={onNavigateHome}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg text-slate-900 bg-slate-100 transition-colors whitespace-nowrap"
              >
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Quick Count & Calon Ketua</span>
              </button>
            )}

            {/* PANITIA ROLE LOGGED IN */}
            {currentUser?.role === 'panitia' && (
              <>
                <button
                  onClick={() => onSelectPanitiaTab('dpt')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'committee' && panitiaTab === 'dpt'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>DPT Pemilih</span>
                </button>

                <button
                  onClick={() => onSelectPanitiaTab('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'committee' && panitiaTab === 'cards'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Cetak Kartu & PIN</span>
                </button>

                <button
                  onClick={() => onSelectPanitiaTab('candidates')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'committee' && panitiaTab === 'candidates'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Calon Ketua</span>
                </button>

                <button
                  onClick={() => onSelectPanitiaTab('monitoring')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'committee' && panitiaTab === 'monitoring'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Radio className="w-4 h-4 text-emerald-600" />
                  <span>Monitoring Bilik</span>
                </button>
              </>
            )}

            {/* ADMIN ROLE LOGGED IN: Concise labels so navbar never overflows */}
            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => onSelectAdminTab('school')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'school'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Profil Lembaga"
                >
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>Profil Lembaga</span>
                </button>

                <button
                  onClick={() => onSelectAdminTab('logo')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'logo'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Upload Logo"
                >
                  <UploadCloud className="w-4 h-4 text-purple-600" />
                  <span>Upload Logo</span>
                </button>


                <button
                  onClick={() => onSelectAdminTab('periods')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'periods'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Periode"
                >
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Periode</span>
                </button>

                <button
                  onClick={() => onSelectAdminTab('committees')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'committees'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="SK & Panitia"
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>SK Panitia</span>
                </button>

                <button
                  onClick={() => onSelectAdminTab('users')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'users'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Tambah & Kelola User"
                >
                  <UserPlus className="w-4 h-4 text-purple-600" />
                  <span>Tambah User</span>
                </button>

                <button
                  onClick={() => onSelectAdminTab('tanda_terima')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'tanda_terima'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Tanda Terima Kartu Pemilih / Surat Suara (Cetak A4 & PDF)"
                >
                  <ClipboardCheck className="w-4 h-4 text-purple-600" />
                  <span>Tanda Terima</span>
                </button>

                <button
                  onClick={() => onSelectAdminTab('attendance')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'attendance'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Daftar Kehadiran Pemilih (Presensi DPT & Ekspor PDF)"
                >
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span>Daftar Hadir</span>
                </button>


                <button
                  onClick={() => onSelectAdminTab('audit_berita_acara')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'audit_berita_acara'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Audit & Berita Acara"
                >
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Berita Acara</span>
                </button>

                <button
                  onClick={() => (onOpenGuideModal ? onOpenGuideModal() : onSelectAdminTab('database_guide'))}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'admin' && adminTab === 'database_guide'
                      ? 'text-slate-900 bg-slate-100 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Panduan Database Supabase & Deploy (Khusus Admin)"
                >
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>Panduan & Deploy</span>
                </button>
              </>
            )}

          </nav>

          {/* Zone 3: Actions & User Status - ALWAYS PERMANENTLY VISIBLE */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto z-10">
            
            <div className="hidden 2xl:block">
              {getSessionBadge()}
            </div>

            {/* Tombol Mode Proyektor */}
            {onOpenProjector && (
              <button
                type="button"
                onClick={onOpenProjector}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-xl transition-all shadow-xs cursor-pointer hover:scale-102 border border-amber-500/50"
                title="Buka Mode Proyektor (Layar Lebar & Mode Embargo)"
              >
                <Tv className="w-3.5 h-3.5 text-amber-950" />
                <span className="font-extrabold">Mode Proyektor</span>
                {activePeriod.is_embargo_active && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-900 text-amber-100 text-[10px] font-mono font-bold flex items-center gap-0.5 ml-0.5">
                    <EyeOff className="w-2.5 h-2.5" />
                    <span>Embargo</span>
                  </span>
                )}
              </button>
            )}

            {/* If NOT logged in: Show "Login Petugas" and "Bilik Suara Siswa" */}
            {!currentUser ? (
              <>

                <button
                  onClick={onOpenLoginModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all whitespace-nowrap border border-slate-200"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-600" />
                  <span>Login Petugas</span>
                </button>

                <button
                  onClick={onOpenBooth}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <VoteIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bilik Suara Siswa</span>
                </button>
              </>
            ) : (
              /* If LOGGED IN: Show Preview Quick Count link & Prominent Logout button */
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={onNavigateHome}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl border transition-colors ${
                    currentView === 'home'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                  title="Lihat Tampilan Quick Count Publik"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Quick Count</span>
                </button>

                {/* LOGOUT BUTTON - ALWAYS VISIBLE ON FULLSCREEN AND ALL SCREENS */}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-300 rounded-xl transition-all whitespace-nowrap shadow-xs hover:scale-102 cursor-pointer"
                  title="Log-Out Akun Petugas"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="font-extrabold">Log-Out</span>
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Mobile Navigation Row when Logged In */}
        {currentUser && (
          <div className="lg:hidden flex items-center gap-2 py-2 border-t border-slate-100 overflow-x-auto">
            {currentUser.role === 'panitia' && (
              <>
                <button
                  onClick={() => onSelectPanitiaTab('dpt')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'committee' && panitiaTab === 'dpt'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  DPT Siswa
                </button>
                <button
                  onClick={() => onSelectPanitiaTab('cards')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'committee' && panitiaTab === 'cards'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Cetak Kartu & PIN
                </button>
                <button
                  onClick={() => onSelectPanitiaTab('candidates')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'committee' && panitiaTab === 'candidates'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Calon Ketua
                </button>
                <button
                  onClick={() => onSelectPanitiaTab('monitoring')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'committee' && panitiaTab === 'monitoring'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Monitoring Bilik
                </button>
              </>
            )}

            {currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => onSelectAdminTab('school')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'school'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Profil Lembaga
                </button>
                <button
                  onClick={() => onSelectAdminTab('logo')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'logo'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Upload Logo
                </button>
                <button
                  onClick={() => onSelectAdminTab('periods')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'periods'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Periode
                </button>
                <button
                  onClick={() => onSelectAdminTab('committees')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'committees'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  SK Panitia
                </button>
                <button
                  onClick={() => onSelectAdminTab('users')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'users'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Tambah User
                </button>
                <button
                  onClick={() => onSelectAdminTab('tanda_terima')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'tanda_terima'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Tanda Terima
                </button>
                <button
                  onClick={() => onSelectAdminTab('attendance')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'attendance'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Daftar Hadir
                </button>
                <button
                  onClick={() => onSelectAdminTab('audit_berita_acara')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'audit_berita_acara'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Berita Acara
                </button>
                <button
                  onClick={() => (onOpenGuideModal ? onOpenGuideModal() : onSelectAdminTab('database_guide'))}
                  className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                    currentView === 'admin' && adminTab === 'database_guide'
                      ? 'bg-slate-900 text-white'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  Panduan & Deploy
                </button>
              </>
            )}

            <button
              onClick={onLogout}
              className="ml-auto px-3 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg whitespace-nowrap flex items-center gap-1 shrink-0"
              title="Log-Out Petugas"
            >
              <LogOut className="w-3 h-3 text-rose-600" />
              <span>Log-Out</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
