import React, { useState } from 'react';
import type { Candidate } from '../types/index.ts';
import { Award, CheckCircle2, ChevronRight, X, Sparkles, BookOpen, User } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  onSelectInBooth: (candidateId: string) => void;
  votePercentage?: number;
  voteCount?: number;
  showVoteMetrics?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onSelectInBooth,
  votePercentage,
  voteCount,
  showVoteMetrics = false,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          {/* Top Header with Candidate Number */}
          <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
            <img
              src={candidate.photo_url}
              alt={`Calon Ketua ${candidate.candidate_number} - ${candidate.leader_name}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top group-hover:scale-102 transition-transform duration-300"
              onError={(e) => {
                // Fallback styled placeholder if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />

            {/* Badge No Urut */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md shadow-md border border-white/20">
              <span className="text-xs uppercase font-medium tracking-wider text-slate-300">Calon</span>
              <span className="font-extrabold text-lg leading-none text-emerald-400 font-mono">
                #{candidate.candidate_number.toString().padStart(2, '0')}
              </span>
            </div>

            {/* Vote percentage tag if enabled */}
            {showVoteMetrics && typeof votePercentage === 'number' && (
              <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-xl bg-emerald-600/95 text-white backdrop-blur-md shadow-md text-xs font-bold font-mono">
                {votePercentage}% ({voteCount} suara)
              </div>
            )}

            {/* Subtle Gradient Scrim at bottom of photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
              <div className="text-white">
                <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Calon Ketua
                </p>
                <h3 className="font-extrabold text-xl leading-snug drop-shadow-xs">
                  {candidate.leader_name}
                </h3>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-4">
            {candidate.motto && (
              <div className="italic text-xs text-slate-600 border-l-2 border-emerald-500 pl-2.5">
                "{candidate.motto}"
              </div>
            )}

            {/* Vision Summary */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Visi Unggulan
              </h4>
              <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                {candidate.vision}
              </p>
            </div>

            {/* Missions Preview */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                Misi Prioritas
              </h4>
              <ul className="space-y-1.5">
                {candidate.mission.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{item}</span>
                  </li>
                ))}
                {candidate.mission.length > 2 && (
                  <li className="text-xs text-indigo-600 font-medium pl-5">
                    +{candidate.mission.length - 2} misi lainnya
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 pt-0 grid grid-cols-2 gap-2 border-t border-slate-100 mt-2">
          <button
            onClick={() => setShowDetailModal(true)}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center"
          >
            Visi & Misi
          </button>
          <button
            onClick={() => onSelectInBooth(candidate.id)}
            className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all text-center flex items-center justify-center gap-1"
          >
            <span>Pilih Calon</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal Detail Visi & Misi */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                  <img
                    src={candidate.photo_url}
                    alt={candidate.leader_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div>
                  <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1">
                    Calon Ketua #{candidate.candidate_number}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {candidate.leader_name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visi */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Visi
              </h4>
              <p className="p-3.5 rounded-xl bg-slate-50 text-slate-700 text-sm leading-relaxed border border-slate-200/60">
                "{candidate.vision}"
              </p>
            </div>

            {/* Misi */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Misi & Arah Strategis
              </h4>
              <ol className="space-y-2.5">
                {candidate.mission.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 font-mono">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Program Kerja Unggulan */}
            {candidate.work_programs && candidate.work_programs.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Program Kerja Unggulan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {candidate.work_programs.map((prog, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>{prog}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  onSelectInBooth(candidate.id);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all flex items-center gap-1.5"
              >
                <span>Masuk Bilik & Pilih Calon #{candidate.candidate_number}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
