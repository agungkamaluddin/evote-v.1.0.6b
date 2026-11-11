import React, { useEffect } from 'react';
import {
  X,
  BookOpen,
  CreditCard,
  Vote,
  KeyRound,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import type { ElectionPeriod, SchoolConfig } from '../types/index.ts';

interface HowToVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
  onOpenBooth: () => void;
}

export const HowToVoteModal: React.FC<HowToVoteModalProps> = ({
  isOpen,
  onClose,
  activePeriod,
  schoolConfig,
  onOpenBooth,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [
    {
      number: 1,
      title: 'Tinjau Tampilan Dashboard Awal & Profil Calon Ketua',
      description: (
        <>
          Pada halaman utama (<strong>Dashboard Awal</strong>), gulir ke bagian{' '}
          <strong>Daftar Calon Ketua {schoolConfig.organization_type}</strong>. Klik{' '}
          <strong>Lihat Detail Visi &amp; Misi</strong> pada masing-masing kartu kandidat untuk
          mempelajari visi, misi, dan program kerja sebelum memilih.
        </>
      ),
      badge: 'Dashboard Awal',
      icon: Eye,
      accent: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    },
    {
      number: 2,
      title: 'Siapkan Kartu Pemilih Resmi Anda',
      description: (
        <>
          Pastikan Anda telah menerima <strong>Kartu Pemilih</strong> dari panitia (berlaku untuk
          Siswa, Dewan Guru, maupun Staf Tata Usaha). Periksa dua data login pada kartu:{' '}
          <strong className="font-mono text-slate-900">NOMOR INDUK PEMILIH</strong> dan{' '}
          <strong className="font-mono text-emerald-700">PIN RAHASIA (6-Digit)</strong>.
        </>
      ),
      badge: 'Persiapan Kredensial',
      icon: CreditCard,
      accent: 'bg-sky-50 text-sky-600 border-sky-200',
    },
    {
      number: 3,
      title: 'Buka Bilik Suara Digital dari Dashboard',
      description: (
        <>
          Setelah yakin dengan pilihan Anda, klik tombol{' '}
          <strong>Gunakan Hak Suara (Bilik Digital)</strong> di bagian atas dashboard, atau langsung
          klik tombol <strong>Pilih</strong> pada kartu calon ketua pilihan Anda.
        </>
      ),
      badge: 'Akses Bilik Suara',
      icon: Vote,
      accent: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      number: 4,
      title: 'Masukkan NOMOR INDUK PEMILIH & PIN Rahasia',
      description: (
        <>
          Pada halaman <strong>Autentikasi Pemilih Digital</strong>, ketikkan{' '}
          <strong>NOMOR INDUK PEMILIH</strong> dan <strong>PIN Rahasia (6-Digit Angka)</strong>{' '}
          sesuai Kartu Pemilih, lalu klik <strong>Buka Surat Suara Digital</strong>.
        </>
      ),
      badge: 'Verifikasi DPT',
      icon: KeyRound,
      accent: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      number: 5,
      title: 'Pilih Kandidat & Konfirmasi Surat Suara',
      description: (
        <>
          Klik tombol <strong>Pilih Calon #...</strong> pada kandidat pilihan Anda. Periksa jendela
          konfirmasi dengan teliti, lalu klik <strong>Ya, Kirim Suara Sah</strong>. Pilihan
          bersifat <strong>RAHASIA</strong> dan <strong>FINAL</strong> (1 pemilih hanya 1 kali memilih).
        </>
      ),
      badge: 'Pencoblosan Sah',
      icon: CheckCircle2,
      accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      number: 6,
      title: 'Terima Kode Bukti & Pantau Live Count',
      description: (
        <>
          Sistem menampilkan <strong>Kode Bukti Partisipasi</strong> dan otomatis keluar dari bilik
          dalam 10 detik (atau klik <strong>Selesai &amp; Keluar dari Bilik</strong>). Perolehan
          suara langsung terbarui secara real-time di grafik <strong>Live Count</strong> pada
          dashboard awal.
        </>
      ),
      badge: 'Selesai & Real-Time',
      icon: BarChart3,
      accent: 'bg-purple-50 text-purple-600 border-purple-200',
    },
  ];

  const isSessionOpen = activePeriod.voting_session_status === 'OPEN';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header */}
        <div className="sticky top-0 z-10 px-6 py-4 bg-slate-900 text-white rounded-t-3xl flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 overflow-hidden">
              {schoolConfig.logo_url ? (
                <img
                  src={schoolConfig.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <BookOpen className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg leading-tight">
                Tata Cara Memilih (Panduan Pemilih)
              </h2>
              <p className="text-xs text-slate-400">
                Pemilihan Ketua {schoolConfig.organization_type} · {schoolConfig.school_name} ({activePeriod.year_label})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Tutup Panduan"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Tutup</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Status & Asas Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Asas LUBER JURDIL
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Langsung, Umum, Bebas, Rahasia, Jujur &amp; Adil. Pilihan Anda dienkripsi anonim dan dilindungi sistem anti double-voting.
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                isSessionOpen
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-amber-50/80 border-amber-200'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isSessionOpen
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Status Bilik Suara Saat Ini:{' '}
                  <span
                    className={
                      isSessionOpen ? 'text-emerald-700' : 'text-amber-700'
                    }
                  >
                    {activePeriod.voting_session_status}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {isSessionOpen
                    ? 'Bilik suara digital sedang dibuka. Anda dapat langsung menggunakan hak suara sekarang.'
                    : 'Bilik suara belum dibuka atau sedang dijeda panitia. Silakan tunggu hingga status berubah menjadi OPEN.'}
                </p>
              </div>
            </div>
          </div>

          {/* Step-by-Step Guide Starting from Initial Dashboard View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Alur Pemilihan dari Tampilan Dashboard Awal hingga Selesai
              </h3>
              <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                6 Langkah Mudah
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {steps.map((step) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.number}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                            {step.number}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${step.accent}`}
                          >
                            {step.badge}
                          </span>
                        </div>
                        <IconComponent className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {step.title}
                      </h4>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Help Note */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Mengalami kendala login atau lupa PIN?</strong> Jangan panik—segera hubungi{' '}
              <strong>Panitia Pemilihan / Pengawas TPS</strong> di sekolah untuk pengecekan data DPT
              atau reset PIN kredensial Anda.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Tutup Panduan
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBooth();
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Vote className="w-4 h-4" />
            <span>Masuk ke Bilik Suara Digital</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
