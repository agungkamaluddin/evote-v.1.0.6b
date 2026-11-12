import React, { useState, useEffect } from 'react';
import { votingStore } from './services/storage';
import { Navbar } from './components/Navbar';
import { LiveCountChart } from './components/LiveCountChart';
import { CandidateCard } from './components/CandidateCard';
import { VoterBoothModal } from './components/VoterBoothModal';
import { CommitteeDashboard, CommitteeTab } from './components/CommitteeDashboard';
import { AdminSchoolSettings, AdminTab } from './components/AdminSchoolSettings';
import { LoginModal } from './components/LoginModal';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { HowToVoteModal } from './components/HowToVoteModal';
import { ProjectorViewModal } from './components/ProjectorViewModal';
import type { AuthStaffUser } from './types/index.ts';
import { Vote, Sparkles, LogIn, BookOpen, Tv } from 'lucide-react';

export default function App() {
  // Authentication & Roles
  const [currentUser, setCurrentUser] = useState<AuthStaffUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isHowToVoteOpen, setIsHowToVoteOpen] = useState(false);

  // View state: 'home' (public quick count & paslon), 'committee', or 'admin'
  const [currentView, setCurrentView] = useState<'home' | 'committee' | 'admin'>('home');
  const [panitiaTab, setPanitiaTab] = useState<CommitteeTab>('dpt');
  const [adminTab, setAdminTab] = useState<AdminTab>('school');

  // Student Bilik Suara state
  const [isBoothOpen, setIsBoothOpen] = useState(false);
  const [preselectedCandidateId, setPreselectedCandidateId] = useState<string | null>(null);

  // Big Screen 16:9 Projector View state
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);

  // Reactive state ticker for storage events
  const [, setTick] = useState(0);
  const isFreshDevice = typeof window !== 'undefined' && !localStorage.getItem('evoting_school_config');
  const [isReady, setIsReady] = useState(!isFreshDevice || votingStore.hasInitialSync());

  useEffect(() => {
    const unsubscribe = votingStore.subscribe(() => {
      setTick((prev) => prev + 1);
      setIsReady(true);
    });
    return unsubscribe;
  }, []);

  const activePeriod = votingStore.getActivePeriod();
  const schoolConfig = votingStore.getSchoolConfig();
  const candidates = votingStore.getCandidates(activePeriod.id);
  const stats = votingStore.getElectionStats(activePeriod.id);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4 animate-pulse">
          <Vote className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1.5">Menghubungkan ke Database E-Voting</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-5">
          Memuat konfigurasi profil sekolah, daftar paslon, dan status bilik suara resmi...
        </p>
        <div className="w-44 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="w-1/2 h-full bg-indigo-500 rounded-full animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  const handleOpenBooth = (candidateId?: string) => {
    if (candidateId) {
      setPreselectedCandidateId(candidateId);
    } else {
      setPreselectedCandidateId(null);
    }
    setIsBoothOpen(true);
  };

  const handleLoginSuccess = (user: AuthStaffUser) => {
    setCurrentUser(user);
    if (user.role === 'panitia') {
      setCurrentView('committee');
      setPanitiaTab('dpt');
    } else {
      setCurrentView('admin');
      setAdminTab('school');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsGuideModalOpen(false);
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* 1. Global Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        panitiaTab={panitiaTab}
        adminTab={adminTab}
        onNavigateHome={() => setCurrentView('home')}
        onSelectPanitiaTab={(tab) => {
          setCurrentView('committee');
          setPanitiaTab(tab);
        }}
        onSelectAdminTab={(tab) => {
          setCurrentView('admin');
          setAdminTab(tab);
        }}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        activePeriod={activePeriod}
        schoolConfig={schoolConfig}
        onOpenBooth={() => handleOpenBooth()}
        onOpenGuideModal={currentUser?.role === 'admin' ? () => setIsGuideModalOpen(true) : undefined}
        onOpenProjector={() => setIsProjectorOpen(true)}
      />

      {/* 2. Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:p-0 print:m-0 print:max-w-none">
        
        {/* ================= VIEW: HOME (PUBLIC QUICK COUNT & PASLON) ================= */}
        {currentView === 'home' && (
          <div className="space-y-12">
            
            {/* Live Count and Realtime Metrics with Vertical Bar Chart */}
            <LiveCountChart
              activePeriod={activePeriod}
              schoolConfig={schoolConfig}
              onOpenBooth={() => handleOpenBooth()}
              onOpenHowToVote={() => setIsHowToVoteOpen(true)}
              onOpenProjector={() => setIsProjectorOpen(true)}
            />

            {/* Candidates Section */}
            <section className="space-y-6 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Pilihan Calon Pemimpin Siswa</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Daftar Calon Ketua {schoolConfig.organization_type}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Pelajari visi, misi, dan program kerja masing-masing calon ketua sebelum menentukan pilihan di bilik suara.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!currentUser && (
                    <button
                      onClick={() => setIsLoginModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Login Petugas</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsHowToVoteOpen(true)}
                    className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Cara Memilih</span>
                  </button>

                  <button
                    onClick={() => handleOpenBooth()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                  >
                    <Vote className="w-4 h-4 text-emerald-400" />
                    <span>Buka Bilik Suara Siswa</span>
                  </button>
                </div>
              </div>

              {/* Grid of Candidate Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map((cand) => {
                  const candStat = stats.candidateResults.find((c) => c.id === cand.id);
                  return (
                    <CandidateCard
                      key={cand.id}
                      candidate={cand}
                      onSelectInBooth={(candId) => handleOpenBooth(candId)}
                      votePercentage={candStat?.vote_percentage}
                      voteCount={candStat?.vote_count}
                      showVoteMetrics={true}
                    />
                  );
                })}
              </div>
            </section>

          </div>
        )}

        {/* ================= VIEW: COMMITTEE DASHBOARD (LOGGED IN) ================= */}
        {currentView === 'committee' && currentUser?.role === 'panitia' && (
          <CommitteeDashboard
            activePeriod={activePeriod}
            schoolConfig={schoolConfig}
            selectedTab={panitiaTab}
            onTabChange={(tab) => setPanitiaTab(tab)}
            onLogout={handleLogout}
          />
        )}

        {/* ================= VIEW: ADMIN SCHOOL DASHBOARD (LOGGED IN) ================= */}
        {currentView === 'admin' && currentUser?.role === 'admin' && (
          <AdminSchoolSettings
            activePeriod={activePeriod}
            schoolConfig={schoolConfig}
            selectedTab={adminTab}
            onTabChange={(tab) => setAdminTab(tab)}
            onLogout={handleLogout}
          />
        )}

      </main>

      {/* 3. Global Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-7 transition-colors no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-100 text-xs text-slate-500">
            
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs overflow-hidden p-1 border border-slate-700/60 shrink-0">
                {schoolConfig.logo_url ? (
                  <img
                    src={schoolConfig.logo_url}
                    alt={`Logo E-Voting ${schoolConfig.organization_type}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Vote className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm leading-snug">
                  {schoolConfig.school_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {schoolConfig.organization_type === 'OSIM'
                    ? 'E-Voting OSIM · Sistem Pemilihan Ketua Osim Digital'
                    : 'E-Voting OSIS · Sistem Pemilihan Ketua Osis Digital'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-x-3 gap-y-2 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Asas LUBER JURDIL</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>Bilik Suara Rahasia &amp; Terenkripsi</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>Anti Double-Voting</span>
              {currentUser?.role === 'admin' && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <button
                    onClick={() => setIsGuideModalOpen(true)}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                  >
                    Panduan Database &amp; Deploy
                  </button>
                </>
              )}
              {!currentUser && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="text-slate-700 hover:text-slate-900 font-semibold underline cursor-pointer"
                  >
                    Portal Login Petugas
                  </button>
                </>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] text-slate-600 font-mono font-semibold whitespace-nowrap shrink-0">
                Masa Bakti {activePeriod.year_label}
              </span>
            </div>

          </div>

          <div className="pt-4 flex items-center justify-center text-center">
            <p className="text-xs text-slate-500">
              Designed &amp; Developed by <span className="font-bold text-slate-800">AK97</span>
            </p>
          </div>
        </div>
      </footer>

      {/* 4. Staff Login Modal (Admin & Panitia) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 5. Digital Voting Booth Modal (Student) */}
      <VoterBoothModal
        isOpen={isBoothOpen}
        onClose={() => setIsBoothOpen(false)}
        activePeriod={activePeriod}
        schoolConfig={schoolConfig}
        preselectedCandidateId={preselectedCandidateId}
      />

      {/* 6. How To Vote Guide Modal */}
      <HowToVoteModal
        isOpen={isHowToVoteOpen}
        onClose={() => setIsHowToVoteOpen(false)}
        activePeriod={activePeriod}
        schoolConfig={schoolConfig}
        onOpenBooth={() => handleOpenBooth()}
      />

      {/* 7. Supabase Database & Deployment Guide Modal (Admin Only) */}
      {currentUser?.role === 'admin' && (
        <SupabaseGuideModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
        />
      )}

      {/* 8. Big Screen 16:9 Projector View Modal (TPS & Auditorium) with Live Embargo Controls */}
      <ProjectorViewModal
        isOpen={isProjectorOpen}
        onClose={() => setIsProjectorOpen(false)}
        activePeriod={activePeriod}
        schoolConfig={schoolConfig}
      />

    </div>
  );
}
