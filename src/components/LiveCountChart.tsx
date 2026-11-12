import React from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Award,
  Vote,
  Sparkles,
  RefreshCw,
  Layers,
  GraduationCap,
  Briefcase,
  BookOpen,
  Tv,
  EyeOff,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import type { ElectionPeriod, SchoolConfig } from '../types/index.ts';
import { votingStore } from '../services/storage.ts';

interface LiveCountChartProps {
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
  onOpenBooth: () => void;
  onOpenHowToVote?: () => void;
  onOpenProjector?: () => void;
}

export const LiveCountChart: React.FC<LiveCountChartProps> = ({
  activePeriod,
  schoolConfig,
  onOpenBooth,
  onOpenHowToVote,
  onOpenProjector,
}) => {
  const stats = votingStore.getElectionStats(activePeriod.id);
  const auditLogs = votingStore.getAuditLogs().slice(0, 5);

  // Palette for candidates
  const candidateColors = [
    { bar: 'bg-emerald-500', stroke: '#10b981', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { bar: 'bg-indigo-600', stroke: '#4f46e5', light: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { bar: 'bg-amber-500', stroke: '#f59e0b', light: 'bg-amber-50 text-amber-700 border-amber-200' },
    { bar: 'bg-rose-500', stroke: '#f43f5e', light: 'bg-rose-50 text-rose-700 border-rose-200' },
  ];

  // Leading candidate
  const leadingCandidate = [...stats.candidateResults].sort((a, b) => b.vote_count - a.vote_count)[0];
  const isDraw = stats.candidateResults.length > 1 &&
    stats.candidateResults[0].vote_count > 0 &&
    stats.candidateResults[0].vote_count === stats.candidateResults[1].vote_count;

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Quick Dashboard */}
      <div className="relative rounded-3xl bg-slate-900 text-white overflow-hidden p-6 sm:p-8 lg:p-10 shadow-lg">
        {/* Subtle background glow */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              {schoolConfig.logo_url && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 p-2 backdrop-blur-md border border-white/20 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={schoolConfig.logo_url}
                    alt={`Logo E-Voting ${schoolConfig.organization_type}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Real-time Count
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300">{schoolConfig.school_name}</span>
                </div>
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                  E-VOTING RESMI {schoolConfig.organization_type}
                </p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white text-balance leading-tight">
              Pemilihan Ketua {schoolConfig.organization_type} Masa Bakti {activePeriod.year_label}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Pesta demokrasi sekolah berintegritas tinggi. Suara direkam secara aman, rahasia, dan langsung diverifikasi melalui bilik suara digital anti double-voting.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenBooth}
                className="px-5 py-2.5 text-sm font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Vote className="w-4 h-4" />
                <span>Gunakan Hak Suara (Bilik Digital)</span>
              </button>

              {onOpenProjector && (
                <button
                  type="button"
                  onClick={onOpenProjector}
                  className="px-4 py-2.5 text-sm font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 border border-amber-500 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Tv className="w-4 h-4 text-amber-950" />
                  <span>Mode Proyektor</span>
                </button>
              )}

              {onOpenHowToVote && (
                <button
                  type="button"
                  onClick={onOpenHowToVote}
                  className="px-4 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600/80 hover:border-slate-500 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Cara Memilih</span>
                </button>
              )}

              <div className="text-xs text-slate-400 flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Pukul 07.30 - 15.00 WIB</span>
              </div>
            </div>

            {/* Embargo Alert Banner on Public View */}
            {activePeriod.is_embargo_active && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-bold text-amber-300">Mode Embargo Live Count Aktif: </span>
                  <span>Persentase perolehan suara disembunyikan sementara di layar publik demi menjaga asas netralitas & ketenangan bilik suara.</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Realtime Turnout Gauge */}
          <div className="lg:col-span-5 bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tingkat Partisipasi Pemilih
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                1 DPT = 1 Suara Sah
              </span>
            </div>

            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-white tabular-nums">
                {stats.turnoutPercentage}%
              </span>
              <span className="text-xs text-slate-400 pb-1.5">
                dari {stats.totalDPT} DPT (Siswa, Guru & Staf TU)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-700 ease-out rounded-full"
                style={{ width: `${Math.min(100, stats.turnoutPercentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Suara Sah Masuk</span>
                <span className="text-base font-bold text-white font-mono tabular-nums">
                  {stats.totalVotes} Suara
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Sisa Belum Memilih</span>
                <span className="text-base font-bold text-slate-300 font-mono tabular-nums">
                  {stats.remainingDPT} Pemilih
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Key Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total DPT</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {stats.totalDPT}
          </div>
          <p className="text-xs text-slate-500 mt-1">Siswa, Guru & Staf TU</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suara Masuk</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">
            {stats.totalVotes}
          </div>
          <p className="text-xs text-slate-500 mt-1">Surat Suara Sah (Bobot 1:1)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partisipasi</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-sky-600 font-mono tabular-nums">
            {stats.turnoutPercentage}%
          </div>
          <p className="text-xs text-slate-500 mt-1">{stats.totalVotes} dari {stats.totalDPT} Pemilih</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sisa Hak Suara</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
            {stats.remainingDPT}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pemilih Belum Memilih</p>
        </div>
      </div>

      {/* 3. Live Count Main Chart Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Grafik Perolehan Suara Calon Ketua
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                Live Subscribed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data ter-update secara otomatis setiap ada suara masuk dari bilik suara pemilih (Siswa, Dewan Guru, dan Staf TU).
            </p>
          </div>

          {leadingCandidate && stats.totalVotes > 0 && !isDraw && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Memimpin: Calon Ketua #{leadingCandidate.candidate_number} - {leadingCandidate.leader_name} ({leadingCandidate.vote_percentage}%)</span>
            </div>
          )}
        </div>

        {/* Visual Vertical Bar Chart */}
        <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-6 border border-slate-200">
          
          {/* Chart Header Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-6 px-2">
            <span className="font-semibold text-slate-700">Skala Persentase (0% - 100%)</span>
            <span className="font-mono">{stats.candidateResults.length} Calon Ketua Berkontestasi</span>
          </div>

          {/* Chart Area with Y-Axis guides and Vertical Columns */}
          <div className="relative pt-6 pb-2">
            
            {/* Horizontal Gridlines - pinned directly to the bar track bounds */}
            <div className="absolute inset-x-0 top-[88px] h-56 sm:h-64 flex flex-col justify-between pointer-events-none">
              {[100, 75, 50, 25, 0].map((pct) => (
                <div key={pct} className="flex items-center gap-3">
                  <span className="w-8 text-right font-mono text-[10px] text-slate-400 tabular-nums font-semibold">
                    {pct}%
                  </span>
                  <div className={`flex-1 border-b ${pct === 0 ? 'border-slate-300' : 'border-dashed border-slate-200'}`} />
                </div>
              ))}
            </div>

            {/* Vertical Bars Columns - items-start ensures strict horizontal alignment across all candidates */}
            <div className="ml-11 grid gap-4 sm:gap-6 items-start"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, stats.candidateResults.length)}, minmax(0, 1fr))`
              }}
            >
              {stats.candidateResults.map((cand, idx) => {
                const color = candidateColors[idx % candidateColors.length];
                const isLeader = leadingCandidate?.id === cand.id && stats.totalVotes > 0 && !isDraw;
                const barHeight = stats.totalVotes > 0 ? cand.vote_percentage : 0;
                const isEmbargo = Boolean(activePeriod.is_embargo_active);

                return (
                  <div key={cand.id} className="flex flex-col items-center">
                    
                    {/* Top Floating Metric & Unggul Badge - uniform height h-16 and aligned percentage */}
                    <div className="mb-2 text-center h-16 w-full flex flex-col justify-end items-center transition-transform hover:scale-105">
                      {isEmbargo ? (
                        <div className="flex flex-col items-center justify-end">
                          <span className="mb-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <EyeOff className="w-3 h-3 text-amber-600" />
                            Embargo
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-slate-400 font-mono tracking-wider">
                            ••• %
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono font-medium mt-1">
                            Dirahasiakan
                          </span>
                        </div>
                      ) : (
                        <>
                          {isLeader ? (
                            <span className="mb-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              Unggul
                            </span>
                          ) : (
                            <span className="mb-1 text-[10px] opacity-0 select-none px-2.5 py-0.5 pointer-events-none">
                              -
                            </span>
                          )}
                          <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tabular-nums leading-none">
                            {cand.vote_percentage}%
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono font-medium mt-1">
                            {cand.vote_count} suara
                          </span>
                        </>
                      )}
                    </div>

                    {/* Vertical Bar Track & Pillar */}
                    <div className="w-full max-w-[90px] sm:max-w-[120px] h-56 sm:h-64 bg-slate-200/60 rounded-t-2xl p-1 relative flex items-end justify-center shadow-inner overflow-hidden">
                      {isEmbargo ? (
                        <div className="w-full h-full bg-slate-200/90 rounded-t-xl flex flex-col items-center justify-center p-2 text-center border-t-2 border-dashed border-slate-300">
                          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mb-1">
                            <EyeOff className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                            Terkunci
                          </span>
                          <span className="text-[9px] text-slate-400 leading-tight">
                            Bilik Suara
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`w-full rounded-t-xl transition-all duration-1000 ease-out shadow-md ${color.bar}`}
                          style={{
                            height: `${Math.max(barHeight > 0 ? 5 : 2, barHeight)}%`,
                          }}
                        >
                          {/* Shimmer / Gloss on Pillar */}
                          <div className="w-full h-full bg-linear-to-t from-black/10 via-transparent to-white/25 rounded-t-xl" />
                        </div>
                      )}
                    </div>

                    {/* X-Axis Baseline separator - identical height & margin */}
                    <div className="w-full max-w-[90px] sm:max-w-[120px] h-1 bg-slate-300 rounded-full my-3" />

                    {/* Candidate Info Below Column - Width and vertical alignment strictly matched */}
                    <div className="text-center w-full max-w-[90px] sm:max-w-[120px] mx-auto flex flex-col items-center">
                      {/* Photo Sized to Match the Width of the Bar Chart */}
                      <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] rounded-2xl overflow-hidden border-2 border-slate-300/90 shadow-md bg-slate-100 group transition-transform hover:scale-[1.03]">
                        <img
                          src={cand.photo_url}
                          alt={cand.leader_name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (!target.dataset.failed) {
                              target.dataset.failed = 'true';
                              target.src = '/assets/images/paslon_1_lead_1793677968157.jpg';
                            }
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-xs text-white font-mono text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-lg border border-white/20 shadow-xs">
                          #{cand.candidate_number.toString().padStart(2, '0')}
                        </div>
                      </div>

                      {/* Names: Leader - Uniform min-height so wrapping doesn't cause shift */}
                      <div className="mt-2 min-w-0 w-full text-center min-h-[44px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Calon Ketua
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2" title={cand.leader_name}>
                          {cand.leader_name}
                        </h4>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>

        {/* Breakdown Partisipasi Menurut Kategori Pemilih (Siswa, Dewan Guru, Staf TU) */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Partisipasi Menurut Kategori Pemilih</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Prinsip <strong>One Person One Vote</strong>: Setiap DPT (Siswa, Guru, Staf TU) bernilai <strong>1 suara sah</strong> yang setara tanpa pembobotan.
              </p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5 shadow-2xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bobot Nilai: 1 DPT = 1 Suara Sah</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.categoryStats?.map((cat) => {
              const isGuru = cat.category === 'GURU';
              const isTu = cat.category === 'TATA_USAHA';
              const iconColor = isGuru ? 'text-purple-600' : isTu ? 'text-teal-600' : 'text-blue-600';
              const borderAccent = isGuru ? 'border-purple-200 bg-purple-50/50' : isTu ? 'border-teal-200 bg-teal-50/50' : 'border-blue-200 bg-blue-50/50';

              return (
                <div key={cat.category} className={`p-4 rounded-2xl border ${borderAccent} space-y-2`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      {isGuru ? <GraduationCap className={`w-4 h-4 ${iconColor}`} /> : isTu ? <Briefcase className={`w-4 h-4 ${iconColor}`} /> : <BookOpen className={`w-4 h-4 ${iconColor}`} />}
                      {cat.label}
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {cat.turnout}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.turnout >= 80 ? 'bg-emerald-500' : cat.turnout >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${cat.turnout}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1">
                    <span>Suara Sah: <strong className="text-slate-900 font-mono">{cat.voted}</strong> / {cat.total} DPT</span>
                    <span>Sisa: <strong className="text-amber-700 font-mono">{cat.remaining}</strong> pemilih</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown Per Class (Tingkat Partisipasi per Rombel/Mapel) */}
        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Tingkat Partisipasi Rombel & Unit Kerja
            </h3>
            <span className="text-xs text-slate-500">
              {stats.classStats.length} Unit / Rombel Terdata
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.classStats.map((item) => (
              <div
                key={item.class_name}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{item.class_name}</span>
                  <span className="font-mono font-bold text-slate-700 tabular-nums">
                    {item.turnout}% ({item.voted}/{item.total})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.turnout >= 80 ? 'bg-emerald-500' : item.turnout >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${item.turnout}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Recent Real-time Activity Logs (Secret & Anonymous) */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span>Audit Trail Log Pemilihan Terkini</span>
          </div>
          <span className="text-[11px] text-slate-400">Menjaga Asas LUBER JURDIL</span>
        </div>

        <div className="divide-y divide-slate-200/80">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between text-xs gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-800 shrink-0">{log.action}</span>
                <span className="text-slate-500 truncate">{log.details}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] shrink-0 tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
