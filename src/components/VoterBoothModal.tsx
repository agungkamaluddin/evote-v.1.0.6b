import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Vote as VoteIcon,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  LogOut,
  HelpCircle,
  FileCheck2,
  GraduationCap,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import { Candidate, ElectionPeriod, SchoolConfig, Student } from '../types';
import { votingStore } from '../services/storage';

interface VoterBoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
  preselectedCandidateId?: string | null;
}

export const VoterBoothModal: React.FC<VoterBoothModalProps> = ({
  isOpen,
  onClose,
  activePeriod,
  schoolConfig,
  preselectedCandidateId,
}) => {
  const [step, setStep] = useState<'LOGIN' | 'BALLOT' | 'SUCCESS'>('LOGIN');
  const [nisn, setNisn] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [authenticatedStudent, setAuthenticatedStudent] = useState<Student | null>(null);

  // Ballot selection state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showVisiMisiModal, setShowVisiMisiModal] = useState<Candidate | null>(null);
  const [voteReceipt, setVoteReceipt] = useState<string>('');
  const [autoLogoutTimer, setAutoLogoutTimer] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reactive subscription
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = votingStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const candidates = votingStore.getCandidates(activePeriod.id);
  const allStudents = votingStore.getStudents(activePeriod.id);

  // Sync preselected candidate if provided
  useEffect(() => {
    if (preselectedCandidateId && candidates.length > 0) {
      const match = candidates.find((c) => c.id === preselectedCandidateId);
      if (match) {
        setSelectedCandidate(match);
      }
    }
  }, [preselectedCandidateId, candidates]);

  // Auto-logout countdown timer on SUCCESS screen
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'SUCCESS' && autoLogoutTimer > 0) {
      timer = setTimeout(() => {
        setAutoLogoutTimer((prev) => prev - 1);
      }, 1000);
    } else if (step === 'SUCCESS' && autoLogoutTimer === 0) {
      handleCompleteLogout();
    }
    return () => clearTimeout(timer);
  }, [step, autoLogoutTimer]);

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nisn.trim() || !pin.trim()) {
      setErrorMsg('Mohon masukkan Nomor Induk Pemilih dan PIN 6-Digit Anda.');
      return;
    }

    let latestStudents = allStudents;
    let student = latestStudents.find(
      (s) => s.nisn.trim() === nisn.trim() && s.pin.trim() === pin.trim()
    );

    // If not found or session not open locally yet, pull freshest state from cloud/server
    if (!student || activePeriod.voting_session_status !== 'OPEN') {
      await votingStore.syncNow();
      latestStudents = votingStore.getStudents(votingStore.getActivePeriod().id);
      student = latestStudents.find(
        (s) => s.nisn.trim() === nisn.trim() && s.pin.trim() === pin.trim()
      );
    }

    const currentPeriod = votingStore.getActivePeriod();
    if (currentPeriod.voting_session_status !== 'OPEN') {
      setErrorMsg(
        currentPeriod.voting_session_status === 'PAUSED'
          ? 'Bilik suara sedang dijeda sementara oleh panitia. Mohon tunggu.'
          : 'Sesi pemilihan telah ditutup. Bilik suara tidak lagi melayani pemilihan.'
      );
      return;
    }

    if (!student) {
      setErrorMsg('Nomor Induk Pemilih atau PIN tidak cocok. Silakan periksa kartu pemilih Anda.');
      return;
    }

    if (student.has_voted) {
      setErrorMsg(`Kredensial atas nama ${student.name} (${student.nisn}) telah tercatat sudah menggunakan hak suara sebelumnya. Sistem menolak pemungutan suara ganda.`);
      return;
    }

    // Success login
    setAuthenticatedStudent(student);
    setStep('BALLOT');
  };

  // Handle Submit Vote (Atomic)
  const handleConfirmVote = async () => {
    if (isSubmitting || !selectedCandidate || !authenticatedStudent) return;
    setIsSubmitting(true);

    try {
      const result = await votingStore.submitVote(
        authenticatedStudent.nisn,
        authenticatedStudent.pin,
        selectedCandidate.id
      );

      if (result.success) {
        setVoteReceipt(result.voteReceipt || 'EVOTE-SUCCESS');
        setShowConfirmModal(false);
        setStep('SUCCESS');
        setAutoLogoutTimer(10);

        // Trigger celebratory confetti!
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // graceful ignore
        }
      } else {
        setShowConfirmModal(false);
        setErrorMsg(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteLogout = () => {
    setStep('LOGIN');
    setNisn('');
    setPin('');
    setAuthenticatedStudent(null);
    setSelectedCandidate(null);
    setShowConfirmModal(false);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col justify-between my-auto">

        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-3xl flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
              {schoolConfig.logo_url ? (
                <img
                  src={schoolConfig.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <VoteIcon className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">
                Bilik Suara Digital {schoolConfig.organization_type}
              </h2>
              <p className="text-xs text-slate-400">
                {schoolConfig.school_name} · Masa Bakti {activePeriod.year_label}
              </p>
            </div>
          </div>

          <button
            onClick={step === 'SUCCESS' ? handleCompleteLogout : onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Tutup Bilik"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Switcher */}
        <div className="p-6 sm:p-8 flex-1">
          {/* ================= STEP 1: LOGIN SISWA, GURU & STAF TU ================= */}
          {step === 'LOGIN' && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-800 shadow-xs">
                  <Lock className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Autentikasi Pemilih Digital
                </h3>
                <p className="text-xs text-slate-500">
                  Masukkan Nomor Induk Pemilih dan PIN rahasia 6-digit yang tercantum pada Kartu Pemilih Anda.
                </p>
              </div>

              {/* Status Warning if not OPEN */}
              {activePeriod.voting_session_status !== 'OPEN' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">Bilik Suara Tidak Aktif</span>
                    Status saat ini: {activePeriod.voting_session_status}. Panitia belum membuka atau sedang menjeda sesi pemungutan suara.
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Login */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    NOMOR INDUK PEMILIH
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      placeholder="Masukkan Nomor Induk Pemilih"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    PIN Rahasia (6-Digit Angka)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 digit angka"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono tracking-widest"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={activePeriod.voting_session_status !== 'OPEN'}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Buka Surat Suara Digital</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              {/* Petunjuk Pemilih Digital Resmi */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-600">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Petunjuk Bilik Suara Digital</span>
                </div>
                <ul className="text-[11px] space-y-1.5 text-slate-500 list-disc list-inside">
                  <li>Masukkan <strong>NOMOR INDUK PEMILIH</strong> dan <strong>PIN 6-Digit</strong> dari Kartu Pemilih resmi Anda.</li>
                  <li>Kredensial hanya dapat digunakan <strong>1 kali</strong> dan terlindungi sistem anti double-voting.</li>
                  <li>Pilihan surat suara bersifat rahasia dan langsung masuk ke kotak suara digital.</li>
                  <li>Jika ada kendala kredensial atau salah input, segera laporkan ke Pengawas TPS.</li>
                </ul>
              </div>

            </div>
          )}

          {/* ================= STEP 2: BILIK SUARA (DIGITAL BALLOT) ================= */}
          {step === 'BALLOT' && authenticatedStudent && (
            <div className="space-y-6">
              
              {/* Voter Badge Bar */}
              {(() => {
                const vType = authenticatedStudent.voter_type || 'SISWA';
                const isGuru = vType === 'GURU';
                const isTu = vType === 'TATA_USAHA';
                const barBorder = isGuru ? 'border-purple-300 bg-purple-50/70' : isTu ? 'border-teal-300 bg-teal-50/70' : 'border-emerald-200 bg-emerald-50';
                const iconColor = isGuru ? 'bg-purple-600' : isTu ? 'bg-teal-600' : 'bg-emerald-600';
                const catLabel = isGuru ? 'Dewan Guru' : isTu ? 'Staf Tata Usaha' : 'Siswa';
                const idLabel = 'NOMOR INDUK PEMILIH';

                return (
                  <div className={`rounded-2xl p-4 border ${barBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${iconColor} text-white flex items-center justify-center font-bold font-mono shadow-xs`}>
                        {isGuru ? <GraduationCap className="w-5 h-5" /> : isTu ? <Briefcase className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            Pemilih Terverifikasi ({catLabel})
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/80 border border-slate-300 text-slate-800 font-semibold">
                            {authenticatedStudent.class_name}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                          {authenticatedStudent.name}
                        </h3>
                        <p className="text-xs text-slate-600 font-mono">
                          {idLabel}: {authenticatedStudent.nisn} · Hak Suara Sah & Rahasia
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 bg-white/80 py-1.5 px-3 rounded-lg border border-slate-300/60 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Asas Rahasia: Pilihan Tidak Ditautkan ke Identitas Pemilih</span>
                    </div>
                  </div>
                );
              })()}

              {/* Instructions */}
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Surat Suara Digital Pemilihan Ketua {schoolConfig.organization_type}
                </h3>
                <p className="text-xs text-slate-500">
                  Tinjau profil calon ketua di bawah ini, kemudian klik tombol <strong className="text-slate-800">"Pilih Calon Ini"</strong> untuk menentukan pilihan Anda.
                </p>
              </div>

              {/* Candidate Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {candidates.map((cand) => {
                  const isSelected = selectedCandidate?.id === cand.id;

                  return (
                    <div
                      key={cand.id}
                      className={`rounded-2xl border-2 transition-all p-4 flex flex-col justify-between bg-white ${
                        isSelected
                          ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg'
                          : 'border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Photo & Number - Positioned from top so head and face are never cut off */}
                        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                          <img
                            src={cand.photo_url}
                            alt={cand.leader_name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top"
                          />
                          <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-slate-900/90 text-white font-mono font-extrabold text-sm border border-white/20 shadow-sm">
                            #{cand.candidate_number.toString().padStart(2, '0')}
                          </div>
                        </div>

                        {/* Names */}
                        <div>
                          <h4 className="font-bold text-base text-slate-900 leading-tight">
                            {cand.leader_name}
                          </h4>
                        </div>

                        {/* Vision summary */}
                        <p className="text-xs text-slate-600 line-clamp-3 italic">
                          "{cand.vision}"
                        </p>

                        <button
                          type="button"
                          onClick={() => setShowVisiMisiModal(cand)}
                          className="text-xs text-indigo-600 font-semibold hover:underline block"
                        >
                          Lihat Detail Visi & Misi →
                        </button>
                      </div>

                      {/* Select Button */}
                      <div className="pt-4 mt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setShowConfirmModal(true);
                          }}
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                            isSelected
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <VoteIcon className="w-4 h-4 text-emerald-400" />
                          <span>Pilih Calon #{cand.candidate_number}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ================= STEP 3: SUCCESS SCREEN ================= */}
          {step === 'SUCCESS' && (
            <div className="max-w-md mx-auto text-center space-y-6 py-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-2">
                <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Suara Berhasil Dicatat Sah
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Terima Kasih Atas Partisipasi Anda!
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hak suara Anda telah tersimpan secara anonim dan aman di sistem E-Voting {schoolConfig.organization_type}. Kredensial Anda telah ditandai selesai.
                </p>
              </div>

              {/* Receipt Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/60 pb-2">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    Kode Bukti Partisipasi
                  </span>
                  <span className="font-mono text-[11px]">{new Date().toLocaleTimeString('id-ID')}</span>
                </div>
                <div className="font-mono font-bold text-sm text-slate-900 text-center py-1">
                  {voteReceipt}
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  Bukti ini adalah tanda keabsahan suara tanpa mengungkapkan isi pilihan Anda.
                </p>
              </div>

              {/* Auto Logout Countdown */}
              <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Auto logout dalam <strong className="text-slate-800 font-mono">{autoLogoutTimer} detik</strong></span>
              </div>

              <button
                type="button"
                onClick={handleCompleteLogout}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Selesai & Keluar dari Bilik</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Confirmation Modal (Before Submitting) */}
      {showConfirmModal && selectedCandidate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                Konfirmasi Pilihan Suara
              </h4>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin memberikan suara kepada:
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <div className="w-20 h-24 rounded-xl overflow-hidden mx-auto border-2 border-slate-300 shadow-xs bg-slate-100">
                <img
                  src={selectedCandidate.photo_url}
                  alt={selectedCandidate.leader_name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white inline-block">
                Calon Ketua #{selectedCandidate.candidate_number.toString().padStart(2, '0')}
              </span>
              <h5 className="font-extrabold text-base text-slate-900">
                {selectedCandidate.leader_name}
              </h5>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left">
              ⚠️ <strong>Peringatan:</strong> Pilihan bersifat RAHASIA dan FINAL. Setelah dikonfirmasi, hak suara Anda tidak dapat diubah kembali.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Kembali / Ubah
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmVote}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Mengirim Suara...' : 'Ya, Kirim Suara Sah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visi Misi Modal in Ballot */}
      {showVisiMisiModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                  <img
                    src={showVisiMisiModal.photo_url}
                    alt={showVisiMisiModal.leader_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Calon Ketua #{showVisiMisiModal.candidate_number}
                  </span>
                  <h4 className="font-bold text-base text-slate-900 mt-1">
                    {showVisiMisiModal.leader_name}
                  </h4>
                </div>
              </div>
              <button
                onClick={() => setShowVisiMisiModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase text-slate-500 mb-1">Visi</h5>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                "{showVisiMisiModal.vision}"
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase text-slate-500 mb-1">Misi</h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {showVisiMisiModal.mission.map((m, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
                      {i + 1}
                    </span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVisiMisiModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
