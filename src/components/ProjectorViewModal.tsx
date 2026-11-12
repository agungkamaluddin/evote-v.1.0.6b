import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  Lock,
  Eye,
  EyeOff,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  Vote,
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
  Briefcase,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ElectionPeriod, SchoolConfig, Candidate } from '../types/index.ts';
import { votingStore } from '../services/storage.ts';

interface ProjectorViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
}

export const ProjectorViewModal: React.FC<ProjectorViewModalProps> = ({
  isOpen,
  onClose,
  activePeriod,
  schoolConfig,
}) => {
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [revealBanner, setRevealBanner] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with store
  const stats = votingStore.getElectionStats(activePeriod.id);
  const candidates = votingStore.getCandidates(activePeriod.id);
  const auditLogs = votingStore.getAuditLogs().slice(0, 8);

  const [isEmbargoLocal, setIsEmbargoLocal] = useState<boolean>(() => votingStore.isEmbargoActive(activePeriod.id));

  // Sync local embargo state whenever activePeriod changes or votingStore notifies
  useEffect(() => {
    setIsEmbargoLocal(votingStore.isEmbargoActive(activePeriod.id));
  }, [activePeriod.id, activePeriod.is_embargo_active]);

  const isEmbargo = isEmbargoLocal;

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle request failed:', err);
    }
  };

  const handleToggleEmbargo = () => {
    const nextState = !isEmbargo;
    setIsEmbargoLocal(nextState);
    votingStore.setEmbargoStatus(activePeriod.id, nextState);

    if (!nextState) {
      // Embargo lifted -> Trigger dramatic reveal with confetti!
      setRevealBanner(true);
      setTimeout(() => setRevealBanner(false), 5000);

      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#ffffff'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 60,
            origin: { x: 0 },
            colors: ['#10b981', '#fbbf24', '#ffffff'],
          });
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 60,
            origin: { x: 1 },
            colors: ['#6366f1', '#ec4899', '#ffffff'],
          });
        }, 300);
      } catch (err) {
        console.warn('Confetti animation error:', err);
      }
    }
  };

  // Realtime clock ticker
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcut listener (Esc to close, F to fullscreen, E to toggle embargo)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          toggleFullscreen();
        }
      } else if (e.key === 'e' || e.key === 'E') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          handleToggleEmbargo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEmbargo, activePeriod.id]);

  if (!isOpen) return null;

  // Color theme per candidate index
  const candidateThemes = [
    {
      gradient: 'from-emerald-500 to-teal-600',
      border: 'border-emerald-500/60',
      glow: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
      barColor: 'bg-gradient-to-t from-emerald-600 to-teal-400',
      textAccent: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      pillBg: 'bg-emerald-500 text-slate-950',
    },
    {
      gradient: 'from-indigo-500 to-blue-600',
      border: 'border-indigo-500/60',
      glow: 'shadow-[0_0_40px_rgba(99,102,241,0.3)]',
      barColor: 'bg-gradient-to-t from-indigo-600 to-blue-400',
      textAccent: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      pillBg: 'bg-indigo-500 text-white',
    },
    {
      gradient: 'from-amber-500 to-orange-600',
      border: 'border-amber-500/60',
      glow: 'shadow-[0_0_40px_rgba(245,158,11,0.3)]',
      barColor: 'bg-gradient-to-t from-amber-600 to-yellow-400',
      textAccent: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      pillBg: 'bg-amber-500 text-slate-950',
    },
    {
      gradient: 'from-rose-500 to-pink-600',
      border: 'border-rose-500/60',
      glow: 'shadow-[0_0_40px_rgba(244,63,94,0.3)]',
      barColor: 'bg-gradient-to-t from-rose-600 to-pink-400',
      textAccent: 'text-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      pillBg: 'bg-rose-500 text-white',
    },
  ];

  // Leading candidate calculation (when not in embargo)
  const sortedByVotes = [...stats.candidateResults].sort((a, b) => b.vote_count - a.vote_count);
  const leadingCandId = sortedByVotes[0]?.vote_count > 0 ? sortedByVotes[0]?.id : null;
  const isDraw =
    sortedByVotes.length > 1 &&
    sortedByVotes[0]?.vote_count > 0 &&
    sortedByVotes[0]?.vote_count === sortedByVotes[1]?.vote_count;

  // Format date & time
  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const turnoutPercentage = stats.totalDPT > 0
    ? Math.round((stats.totalVotedDPT / stats.totalDPT) * 1000) / 10
    : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none font-sans"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.7) 0%, rgba(2, 6, 23, 1) 75%),
          radial-gradient(circle at 10% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 90% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)
        `,
      }}
    >
      {/* ================= 1. PROJECTOR TOP BAR & EMBARGO CONTROLS ================= */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: School Crest, Title & Live Status */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white/10 p-1.5 border border-white/20 shadow-md flex items-center justify-center shrink-0 overflow-hidden">
              {schoolConfig.logo_url ? (
                <img
                  src={schoolConfig.logo_url}
                  alt="Logo Sekolah"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.dataset.failed) {
                      target.dataset.failed = 'true';
                      target.src = '/assets/images/school_emblem_logo_1793677968157.jpg';
                    }
                  }}
                />
              ) : (
                <Vote className="w-6 h-6 text-emerald-400" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  Mode Proyektor
                </span>
                <span className="text-slate-500 hidden sm:inline" aria-hidden="true">·</span>
                <span className="text-xs font-semibold text-slate-300 hidden sm:inline truncate">
                  {schoolConfig.school_name}
                </span>
              </div>
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-white tracking-tight truncate">
                Papan Hitung Suara Pemilihan Ketua {schoolConfig.organization_type} {activePeriod.year_label}
              </h1>
            </div>
          </div>

          {/* Center: Live Digital Clock */}
          <div className="hidden md:flex flex-col items-center justify-center px-4 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800/80 shadow-inner">
            <div className="font-mono text-xl lg:text-2xl font-black tracking-widest text-emerald-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>{formattedTime}</span>
              <span className="text-xs text-slate-400 font-sans font-bold">WIB</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {formattedDate}
            </div>
          </div>

          {/* Right: Controls (Embargo Toggle, Fullscreen, Close) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* EMBARGO TOGGLE BUTTON (BLIND MODE) */}
            <button
              type="button"
              onClick={handleToggleEmbargo}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer shadow-md ${
                isEmbargo
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 ring-2 ring-amber-500/20'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
              }`}
              title="Klik untuk menyembunyikan atau membuka hasil live count paslon"
            >
              {isEmbargo ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Mode Embargo: AKTIF (Blind Mode)</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Mode Embargo: NONAKTIF (Hasil Terbuka)</span>
                </>
              )}
            </button>

            {/* FULLSCREEN TOGGLE */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Layar Penuh (F11)"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-slate-300" />
                  <span className="hidden sm:inline">Normal</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-slate-300" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </>
              )}
            </button>

            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 border border-slate-700 transition-colors cursor-pointer"
              title="Tutup Mode Proyektor (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Embargo Alert Banner when active */}
        {isEmbargo && (
          <div className="mt-2.5 max-w-[1920px] mx-auto bg-amber-950/70 border border-amber-500/40 rounded-xl px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold">
                MODE EMBARGO AKTIF (BLIND MODE):
              </span>
              <span className="hidden sm:inline text-amber-300/90 text-[11px]">
                Hasil perolehan suara paslon disembunyikan sementara demi menjamin independensi pemilih di TPS. Tingkat kehadiran DPT tetap berjalan transparan.
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
              HASIL DISEMBUNYIKAN
            </span>
          </div>
        )}

        {/* Dramatic Reveal Toast Banner when Embargo is Lifted */}
        {revealBanner && (
          <div className="mt-2.5 max-w-[1920px] mx-auto bg-emerald-950/90 border-2 border-emerald-400 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
              <div>
                <span className="font-extrabold text-emerald-300 text-sm block">
                  HASIL RESMI LIVE COUNT TELAH DIBUKA!
                </span>
                <span className="text-[11px] text-emerald-200">
                  Mode embargo dinonaktifkan. Seluruh perolehan suara sah kini ditampilkan terbuka di layar proyektor TPS.
                </span>
              </div>
            </div>
            <button
              onClick={() => setRevealBanner(false)}
              className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {/* ================= 2. MAIN 16:9 STAGE CANVAS (CANDIDATE PODIUMS) ================= */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-center">
        
        {/* Stage Status Sub-Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            {activePeriod.voting_session_status === 'OPEN' && (
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/40 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>BILIK SUARA DIGITAL: DIBUKA (SESI AKTIF)</span>
              </div>
            )}
            {activePeriod.voting_session_status === 'PAUSED' && (
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-400 bg-amber-950/80 px-3 py-1.5 rounded-xl border border-amber-500/40">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>SESI PEMILIHAN DIJEDA SEMENTARA</span>
              </div>
            )}
            {activePeriod.voting_session_status === 'CLOSED' && (
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>PEMUNGUTAN SUARA DITUTUP (FINALISASI)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Total Suara Terhimpun:</span>
            <span className="font-mono text-sm font-extrabold text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
              {stats.totalVotes} Suara Sah
            </span>
          </div>
        </div>

        {/* CANDIDATE PODIUM GRID (16:9 PROPORTIONS) */}
        <div
          className={`grid gap-4 sm:gap-6 lg:gap-8 items-end my-auto ${
            candidates.length === 2
              ? 'grid-cols-2 max-w-4xl mx-auto'
              : candidates.length === 3
              ? 'grid-cols-1 sm:grid-cols-3 max-w-6xl mx-auto'
              : candidates.length === 4
              ? 'grid-cols-2 sm:grid-cols-4 max-w-7xl mx-auto'
              : 'grid-cols-1 sm:grid-cols-3 max-w-6xl mx-auto'
          }`}
        >
          {candidates.map((cand, idx) => {
            const candStat = stats.candidateResults.find((c) => c.id === cand.id);
            const votePercent = candStat?.vote_percentage || 0;
            const voteCount = candStat?.vote_count || 0;
            const theme = candidateThemes[idx % candidateThemes.length];
            const isLeader = !isEmbargo && leadingCandId === cand.id && !isDraw;

            // Height for the vertical bar (max 260px)
            const barHeightPx = isEmbargo ? 160 : Math.max(20, Math.round((votePercent / 100) * 260));

            return (
              <div
                key={cand.id}
                className={`relative rounded-3xl bg-slate-900/90 border-2 ${
                  isLeader ? `${theme.border} ${theme.glow}` : 'border-slate-800/90'
                } p-4 sm:p-5 flex flex-col items-center justify-between transition-all duration-500 overflow-hidden group`}
              >
                {/* Background ambient lighting */}
                <div
                  className={`absolute -top-12 inset-x-0 h-32 bg-gradient-to-b ${theme.gradient} opacity-10 pointer-events-none blur-2xl`}
                />

                {/* Leader Crown/Trophy Badge */}
                {isLeader && (
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[11px] shadow-lg animate-bounce">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>UNGGUL SEMENTARA</span>
                  </div>
                )}

                {/* 1. Candidate Card Top: Number, Photo & Details */}
                <div className="w-full flex flex-col items-center text-center space-y-3 z-10">
                  {/* Photo with candidate number stamp */}
                  <div className="relative w-32 sm:w-36 lg:w-44 aspect-[4/5] rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-xl bg-slate-950 shrink-0">
                    <img
                      src={cand.photo_url}
                      alt={cand.leader_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.failed) {
                          target.dataset.failed = 'true';
                          target.src = '/assets/images/paslon_1_lead_1793677968157.jpg';
                        }
                      }}
                    />

                    {/* Candidate Number Badge on Photo */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-950/90 text-white backdrop-blur-md shadow-md border border-white/20">
                      <span className="text-[10px] font-semibold text-slate-300">NO</span>
                      <span className="font-mono text-base font-black text-emerald-400 leading-none">
                        #{cand.candidate_number.toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Candidate Name & Motto */}
                  <div className="w-full min-h-[58px] flex flex-col justify-center">
                    <h3
                      className="font-extrabold text-base sm:text-lg lg:text-xl text-white tracking-tight line-clamp-1"
                      title={cand.leader_name}
                    >
                      {cand.leader_name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 italic line-clamp-1 mt-0.5">
                      {cand.motto ? `"${cand.motto}"` : 'Calon Ketua OSIS/OSIM'}
                    </p>
                  </div>
                </div>

                {/* 2. Candidate Live Result or Embargo Privacy Display */}
                <div className="w-full mt-4 pt-4 border-t border-slate-800/90 z-10 flex flex-col items-center">
                  {isEmbargo ? (
                    /* ============ EMBARGO MODE: FROSTED PRIVACY BAR ============ */
                    <div className="w-full flex flex-col items-center space-y-2.5 py-3">
                      <div className="w-full max-w-[160px] h-32 rounded-2xl bg-slate-950/80 border border-dashed border-amber-500/40 p-3 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
                        {/* Shimmer gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent animate-pulse" />

                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-1.5 shadow-sm">
                          <Lock className="w-5 h-5 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                          TEREMBARGO
                        </span>
                        <p className="text-[9px] text-slate-400 leading-tight mt-0.5">
                          Terkunci di Kotak Suara
                        </p>
                      </div>

                      {/* Obfuscated Score */}
                      <div className="text-center">
                        <div className="font-mono text-2xl font-black text-slate-500 tracking-widest">
                          ••• %
                        </div>
                        <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
                          Hasil Dirahasiakan
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ============ UN-EMBARGOED: VIVID LIVE COUNT BAR ============ */
                    <div className="w-full flex flex-col items-center space-y-3">
                      {/* Vertical dynamic bar */}
                      <div className="w-full max-w-[140px] h-[220px] sm:h-[260px] bg-slate-950/80 rounded-2xl p-2.5 flex flex-col justify-end border border-slate-800 shadow-inner relative">
                        {/* Level Bar with transition */}
                        <div
                          style={{ height: `${Math.max(12, barHeightPx)}px` }}
                          className={`w-full rounded-xl ${theme.barColor} transition-all duration-700 ease-out flex items-center justify-center shadow-lg relative group-hover:brightness-110`}
                        >
                          {/* Inner glow on top of bar */}
                          <div className="absolute top-0 inset-x-0 h-1.5 bg-white/40 rounded-t-xl" />
                        </div>
                      </div>

                      {/* Percentage & Vote Count */}
                      <div className="text-center space-y-0.5">
                        <div className="font-mono text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-1">
                          <span>{votePercent}%</span>
                        </div>
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-mono font-bold border border-slate-700 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{voteCount} Suara Sah</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </main>

      {/* ================= 3. BOTTOM TURNOUT METRICS & LIVE TICKER ================= */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 sm:py-4 shrink-0">
        <div className="max-w-[1920px] mx-auto space-y-3">
          
          {/* 4 Large Projector Turnout Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Metric 1: Total DPT */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  Total DPT Pemilih
                </span>
                <span className="font-mono text-lg sm:text-2xl font-black text-white">
                  {stats.totalDPT} <span className="text-xs font-sans text-slate-400">Jiwa</span>
                </span>
              </div>
            </div>

            {/* Metric 2: Suara Masuk */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Vote className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  Suara Masuk Sah
                </span>
                <span className="font-mono text-lg sm:text-2xl font-black text-emerald-400">
                  {stats.totalVotedDPT} <span className="text-xs font-sans text-slate-400">Suara</span>
                </span>
              </div>
            </div>

            {/* Metric 3: Tingkat Partisipasi */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider block">
                    Partisipasi Pemilih
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-amber-300">
                    {turnoutPercentage}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    style={{ width: `${Math.min(100, turnoutPercentage)}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Metric 4: Belum Memilih */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  Belum Menggunakan Hak
                </span>
                <span className="font-mono text-lg sm:text-2xl font-black text-slate-300">
                  {stats.totalDPT - stats.totalVotedDPT} <span className="text-xs font-sans text-slate-400">Jiwa</span>
                </span>
              </div>
            </div>

          </div>

          {/* ================= SECTION: PARTISIPASI MENURUT KATEGORI PEMILIH ================= */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Partisipasi Menurut Kategori Pemilih</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                      One Person One Vote
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tingkat partisipasi kehadiran dan perolehan suara sah per kelompok pemilih resmi (Siswa, Dewan Guru, dan Staf Tata Usaha).
                  </p>
                </div>
              </div>

              {/* Live Ticker */}
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-800">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-slate-300">Aktivitas Terkini:</span>
                <span className="truncate max-w-xs text-slate-300">
                  {auditLogs[0] ? `${auditLogs[0].action} · ${auditLogs[0].details}` : 'Pemungutan suara berlangsung aman.'}
                </span>
              </div>
            </div>

            {/* 3 Dedicated Category Scoreboards (Siswa, Guru, Staf TU) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.categoryStats?.map((cat) => {
                const isSiswa = cat.category === 'SISWA';
                const isGuru = cat.category === 'GURU';
                const accentColor = isSiswa
                  ? {
                      bg: 'bg-indigo-950/40',
                      border: 'border-indigo-500/30',
                      iconBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
                      text: 'text-indigo-400',
                      bar: 'from-indigo-500 to-sky-400',
                    }
                  : isGuru
                  ? {
                      bg: 'bg-emerald-950/40',
                      border: 'border-emerald-500/30',
                      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                      text: 'text-emerald-400',
                      bar: 'from-emerald-500 to-teal-400',
                    }
                  : {
                      bg: 'bg-teal-950/40',
                      border: 'border-teal-500/30',
                      iconBg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
                      text: 'text-teal-400',
                      bar: 'from-teal-500 to-emerald-400',
                    };

                return (
                  <div
                    key={cat.category}
                    className={`p-3 rounded-xl border ${accentColor.bg} ${accentColor.border} flex flex-col justify-between space-y-2`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${accentColor.iconBg}`}>
                          {isSiswa ? (
                            <GraduationCap className="w-4 h-4" />
                          ) : isGuru ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <Users className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-black text-white uppercase tracking-wider block">
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            DPT Kategori: <strong className="text-white font-mono">{cat.total}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black font-mono text-white tabular-nums">
                          {cat.turnout}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Partisipasi
                        </span>
                      </div>
                    </div>

                    {/* Turnout Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          style={{ width: `${Math.min(100, cat.turnout)}%` }}
                          className={`h-full bg-linear-to-r ${accentColor.bar} rounded-full transition-all duration-500`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                        <span>
                          Masuk: <strong className="text-white font-bold">{cat.voted}</strong>
                        </span>
                        <span>
                          Sisa: <strong className="text-amber-300 font-bold">{cat.remaining}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};
