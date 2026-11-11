import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  X,
  BookOpen,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import type { Candidate, Student } from '../types/index.ts';

interface ResetIndividualVoteModalProps {
  isOpen: boolean;
  student: Student | null;
  candidates: Candidate[];
  onClose: () => void;
  onConfirm: (options: {
    studentId: string;
    deductVote: boolean;
    candidateIdToDeduct?: string;
    generateNewPin: boolean;
    reason: string;
  }) => void;
}

const PRESET_REASONS = [
  'Kendala teknis di bilik suara / peramban terputus mendadak',
  'Pemilih keliru memilih dan segera melapor ke Pengawas TPS',
  'Kredensial NISN/PIN digunakan tanpa izin oleh pemilih lain',
  'Gladi bersih & uji coba simulasi sistem oleh panitia',
];

export const ResetIndividualVoteModal: React.FC<ResetIndividualVoteModalProps> = ({
  isOpen,
  student,
  candidates,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !student) return null;

  const [deductMode, setDeductMode] = useState<'latest' | 'candidate' | 'none'>('latest');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidates[0]?.id || '');
  const [generateNewPin, setGenerateNewPin] = useState<boolean>(false);
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (student) {
      setDeductMode('latest');
      setSelectedCandidateId(candidates[0]?.id || '');
      setGenerateNewPin(false);
      setSelectedPresetReason(PRESET_REASONS[0]);
      setCustomReason('');
      setIsSubmitting(false);
    }
  }, [student, candidates]);

  const vType = student.voter_type || 'SISWA';
  const isGuru = vType === 'GURU';
  const isTu = vType === 'TATA_USAHA';

  const typeLabel = isGuru ? 'Dewan Guru' : isTu ? 'Staf Tata Usaha' : 'Siswa';
  const idLabel = 'NOMOR INDUK PEMILIH';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalReason = customReason.trim()
      ? `${selectedPresetReason} (${customReason.trim()})`
      : selectedPresetReason;

    try {
      onConfirm({
        studentId: student.id,
        deductVote: deductMode !== 'none',
        candidateIdToDeduct: deductMode === 'candidate' ? selectedCandidateId : undefined,
        generateNewPin,
        reason: finalReason,
      });
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <RotateCcw className="w-5 h-5 text-white animate-spin-reverse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight leading-snug">
                Reset Status Voting Individu
              </h3>
              <p className="text-xs text-amber-100">
                Kembalikan hak suara pemilih ke status 'Belum Memilih'
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700">
          
          {/* 1. Profil Pemilih Terpilih */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Data Pemilih DPT
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  {student.name}
                </h4>
              </div>

              {isGuru ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                  <GraduationCap className="w-3 h-3 text-purple-600" />
                  Dewan Guru
                </span>
              ) : isTu ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 border border-teal-200">
                  <Briefcase className="w-3 h-3 text-teal-600" />
                  Staf TU
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  <BookOpen className="w-3 h-3 text-blue-600" />
                  Siswa
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">{idLabel}:</span>
                <span className="font-mono font-bold text-slate-800">{student.nisn}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kelas / Rombel:</span>
                <span className="font-mono font-bold text-slate-800">{student.class_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Waktu Voting:</span>
                <span className="font-mono font-bold text-amber-700">
                  {student.voted_at ? new Date(student.voted_at).toLocaleTimeString('id-ID') : 'Belum'}
                </span>
              </div>
            </div>
          </div>

          {/* Warning notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Setelah direset, kredensial pemilih ini dapat login kembali ke bilik suara digital untuk memilih ulang calon ketua.
            </p>
          </div>

          {/* 2. Pilihan Penyesuaian Kotak Suara */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>Penyesuaian Kotak Suara (Surat Suara Sah)</span>
              <span className="text-[10px] font-normal text-slate-500">Asas Rahasia (LUBER)</span>
            </label>

            <div className="space-y-2">
              {/* Option 1: Kurangi suara terakhir (Recommended) */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  deductMode === 'latest'
                    ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deductMode"
                  value="latest"
                  checked={deductMode === 'latest'}
                  onChange={() => setDeductMode('latest')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900">Kurangi 1 suara terakhir dari kotak suara</strong>
                    <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Disarankan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Menjaga perolehan total suara tetap sinkron 1:1 dengan total pemilih hadir di DPT.
                  </p>
                </div>
              </label>

              {/* Option 2: Kurangi suara paslon spesifik */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  deductMode === 'candidate'
                    ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deductMode"
                  value="candidate"
                  checked={deductMode === 'candidate'}
                  onChange={() => setDeductMode('candidate')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <strong className="text-slate-900">Kurangi 1 suara dari Paslon tertentu</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pilih jika pemilih secara langsung melaporkan keliru memilih paslon nomor tertentu.
                    </p>
                  </div>

                  {deductMode === 'candidate' && (
                    <div className="pt-1">
                      <select
                        value={selectedCandidateId}
                        onChange={(e) => setSelectedCandidateId(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500"
                      >
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            Paslon #{c.candidate_number} - {c.leader_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: Hanya reset status DPT */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  deductMode === 'none'
                    ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="deductMode"
                  value="none"
                  checked={deductMode === 'none'}
                  onChange={() => setDeductMode('none')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="min-w-0 flex-1">
                  <strong className="text-slate-900">Hanya reset status kehadiran DPT</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Jangan kurangi kotak suara (misal jika suara sebelumnya memang gagal masuk akibat gangguan koneksi).
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Opsi Kredensial PIN */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generateNewPin}
                onChange={(e) => setGenerateNewPin(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 mt-0.5"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Generate PIN 6-Digit Baru untuk Pemilih Ini
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {generateNewPin
                    ? 'PIN lama akan dibatalkan, dan pemilih akan diberikan PIN acak baru untuk login ulang.'
                    : `PIN login saat ini (${student.pin}) tetap dipertahankan.`}
                </span>
              </div>
            </label>
          </div>

          {/* 4. Alasan / Berita Acara Panitia */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-900 text-xs">
              Alasan Reset / Berita Acara Panitia (Audit Log)
            </label>

            <div className="space-y-1.5">
              <select
                value={selectedPresetReason}
                onChange={(e) => setSelectedPresetReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500"
              >
                {PRESET_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Catatan tambahan petugas / nomor laporan saksi (opsional)..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          {/* Actions Button */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Konfirmasi Reset Hak Suara</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
