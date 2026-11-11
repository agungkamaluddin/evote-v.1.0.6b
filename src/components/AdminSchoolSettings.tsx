import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Printer,
  CheckCircle2,
  Award,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Edit,
  KeyRound,
  ShieldAlert,
  UploadCloud,
  Image as ImageIcon,
  Check,
  Link2,
  AlertCircle,
  ArrowRight,
  Upload,
  LogOut,
  RotateCcw,
  Database,
  ClipboardCheck,
} from 'lucide-react';
import type { Committee, ElectionPeriod, OrgType, SchoolConfig, UserAccount, StaffRole } from '../types/index.ts';
import { votingStore } from '../services/storage.ts';
import { LOGO_PRESETS } from '../data/logoPresets';
import { ConfirmModal } from './ConfirmModal';
import { Toast } from './Toast';
import { SupabaseGuideModal } from './SupabaseGuideModal';
import { AdminTandaTerima } from './AdminTandaTerima';
import { AdminAttendanceList } from './AdminAttendanceList';

export type AdminTab = 'school' | 'logo' | 'periods' | 'committees' | 'users' | 'tanda_terima' | 'attendance' | 'audit_berita_acara' | 'database_guide';

interface AdminSchoolSettingsProps {
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
  selectedTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  onLogout?: () => void;
}

export const AdminSchoolSettings: React.FC<AdminSchoolSettingsProps> = ({
  activePeriod,
  schoolConfig,
  selectedTab,
  onTabChange,
  onLogout,
}) => {
  const [internalTab, setInternalTab] = useState<AdminTab>('school');
  const activeTab = selectedTab || internalTab;

  // Reactive store subscription
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = votingStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  // In-app confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Konfirmasi',
    cancelLabel: 'Batal',
    variant: 'danger',
    onConfirm: () => {},
  });

  // In-app toast notification state
  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ isOpen: true, type, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isOpen: false }));
    }, 4500);
  };

  const handleTabClick = (tab: AdminTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // School Form
  const [schoolName, setSchoolName] = useState(schoolConfig.school_name);
  const [orgType, setOrgType] = useState<OrgType>(schoolConfig.organization_type);
  const [schoolAddress, setSchoolAddress] = useState(schoolConfig.school_address);
  const [principalName, setPrincipalName] = useState(schoolConfig.principal_name);

  // Logo Upload & Management State
  const [logoUrl, setLogoUrl] = useState(schoolConfig.logo_url || '/assets/images/school_emblem_logo_1793677969399.jpg');
  const [logoSuccessMsg, setLogoSuccessMsg] = useState('');
  const [logoErrorMsg, setLogoErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Synchronize form states whenever schoolConfig updates from server database
  useEffect(() => {
    setSchoolName(schoolConfig.school_name);
    setOrgType(schoolConfig.organization_type);
    setSchoolAddress(schoolConfig.school_address);
    setPrincipalName(schoolConfig.principal_name);
    setLogoUrl(schoolConfig.logo_url || '/assets/images/school_emblem_logo_1793677969399.jpg');
  }, [
    schoolConfig.school_name,
    schoolConfig.organization_type,
    schoolConfig.school_address,
    schoolConfig.principal_name,
    schoolConfig.logo_url,
  ]);

  // Period Form & Modals (CRUD)
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<ElectionPeriod | null>(null);
  const [newYearLabel, setNewYearLabel] = useState('2027/2028');

  // Committee Form & Modals (CRUD)
  const [showNewCommModal, setShowNewCommModal] = useState(false);
  const [editingComm, setEditingComm] = useState<Committee | null>(null);
  const [commForm, setCommForm] = useState<{
    name: string;
    sk_number: string;
    role: Committee['role'];
    email: string;
  }>({
    name: '',
    sk_number: 'SK.046/PAN-PEMILU/SMAN1/2026',
    role: 'Ketua Panitia',
    email: '',
  });

  // User Accounts Form & Modals (CRUD)
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userForm, setUserForm] = useState<{
    username: string;
    password?: string;
    name: string;
    role: StaffRole;
    sk_number: string;
  }>({
    username: '',
    password: '',
    name: '',
    role: 'panitia',
    sk_number: '',
  });

  const periods = votingStore.getPeriods();
  const committees = votingStore.getCommittees(activePeriod.id);
  const userAccounts = votingStore.getUserAccounts();
  const stats = votingStore.getElectionStats(activePeriod.id);
  const auditLogs = votingStore.getAuditLogs();

  const winningCandidate = [...stats.candidateResults].sort((a, b) => b.vote_count - a.vote_count)[0];

  // --- Handlers: School Profile (Update) ---
  const handleSaveSchoolConfig = (e: React.FormEvent) => {
    e.preventDefault();
    votingStore.updateSchoolConfig({
      school_name: schoolName,
      organization_type: orgType,
      school_address: schoolAddress,
      principal_name: principalName,
    });
    showToast('success', 'Pengaturan profil sekolah & organisasi berhasil diperbarui!');
  };

  // --- Handlers: Upload & Kelola Logo E-Voting ---
  const processImageFile = (file: File) => {
    setLogoErrorMsg('');
    setLogoSuccessMsg('');
    if (!file.type.startsWith('image/')) {
      setLogoErrorMsg('Mohon pilih file gambar yang valid (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setLogoErrorMsg('Ukuran file maksimal 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoSuccessMsg('Mengunggah file logo ke server secara permanen...');
        try {
          const permUrl = await votingStore.uploadAsset(result, 'school_logo');
          setLogoUrl(permUrl);
          setLogoSuccessMsg('File logo berhasil disimpan secara permanen ke server. Klik "Simpan & Terapkan Logo" untuk mempublikasikan ke seluruh perangkat.');
        } catch {
          setLogoUrl(result);
          setLogoSuccessMsg('File logo berhasil dimuat. Klik "Simpan & Terapkan Logo" untuk memperbarui sistem.');
        }
      }
    };
    reader.onerror = () => {
      setLogoErrorMsg('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSaveLogo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!logoUrl) {
      setLogoErrorMsg('Pilih atau unggah file logo terlebih dahulu.');
      return;
    }
    votingStore.updateSchoolConfig({
      logo_url: logoUrl,
    });
    setLogoSuccessMsg('Logo E-Voting OSIS/OSIM berhasil disimpan dan diterapkan pada seluruh sistem!');
    showToast('success', 'Logo E-Voting OSIS/OSIM berhasil diperbarui pada seluruh sistem.');
    setTimeout(() => setLogoSuccessMsg(''), 4000);
  };

  const handleResetLogo = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Logo Emblem',
      message: 'Kembalikan logo ke emblem default e-voting sekolah?',
      confirmLabel: 'Kembalikan Default',
      cancelLabel: 'Batal',
      variant: 'warning',
      onConfirm: () => {
        const defaultUrl = '/assets/images/school_emblem_logo_1793677969399.jpg';
        setLogoUrl(defaultUrl);
        votingStore.updateSchoolConfig({
          logo_url: defaultUrl,
        });
        setLogoSuccessMsg('Logo berhasil dikembalikan ke emblem default sistem.');
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', 'Logo berhasil dikembalikan ke emblem default sistem.');
        setTimeout(() => setLogoSuccessMsg(''), 4000);
      },
    });
  };

  // --- Handlers: Period (CRUD) ---
  const handleSetActivePeriod = (periodId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Ubah Periode Pemilihan Aktif',
      message: 'Ubah periode pemilihan aktif? Bilik suara dan DPT akan beralih ke periode yang dipilih.',
      confirmLabel: 'Beralih Periode',
      cancelLabel: 'Batal',
      variant: 'warning',
      onConfirm: () => {
        votingStore.setActivePeriod(periodId);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', 'Periode pemilihan aktif berhasil dialihkan.');
      },
    });
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearLabel) return;
    if (editingPeriod) {
      votingStore.updatePeriod(editingPeriod.id, { year_label: newYearLabel });
      setEditingPeriod(null);
      showToast('success', 'Label tahun ajaran periode berhasil diperbarui!');
    } else {
      votingStore.createPeriod(newYearLabel, orgType);
      showToast('success', `Periode tahun ajaran ${newYearLabel} berhasil dibuat sebagai arsip baru.`);
    }
    setShowNewPeriodModal(false);
    setNewYearLabel('');
  };

  const handleDeletePeriod = (periodId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Periode Pemilihan',
      message: 'Hapus periode ini beserta data arsip DPT dan hasil suara di dalamnya?',
      confirmLabel: 'Hapus Periode',
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        const res = votingStore.deletePeriod(periodId);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(res.success ? 'success' : 'error', res.message);
      },
    });
  };

  // --- Handlers: Committee (CRUD) ---
  const handleOpenCommModal = (comm?: Committee) => {
    if (comm) {
      setEditingComm(comm);
      setCommForm({
        name: comm.name,
        sk_number: comm.sk_number,
        role: comm.role,
        email: comm.email,
      });
    } else {
      setEditingComm(null);
      setCommForm({
        name: '',
        sk_number: 'SK.046/PAN-PEMILU/SMAN1/2026',
        role: 'Ketua Panitia',
        email: '',
      });
    }
    setShowNewCommModal(true);
  };

  const handleSaveCommittee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commForm.name || !commForm.sk_number) return;
    if (editingComm) {
      votingStore.updateCommittee(editingComm.id, {
        name: commForm.name,
        sk_number: commForm.sk_number,
        role: commForm.role,
        email: commForm.email || 'panitia@sekolah.sch.id',
      });
      showToast('success', 'Data panitia berhasil diperbarui!');
    } else {
      votingStore.addCommittee({
        period_id: activePeriod.id,
        name: commForm.name,
        sk_number: commForm.sk_number,
        role: commForm.role,
        email: commForm.email || 'panitia@sekolah.sch.id',
      });
      showToast('success', 'Akun Panitia berhasil didaftarkan berdasarkan SK!');
    }
    setShowNewCommModal(false);
  };

  const handleDeleteCommittee = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Panitia',
      message: 'Hapus anggota panitia pemilihan ini?',
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        votingStore.deleteCommittee(id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', 'Data panitia berhasil dihapus.');
      },
    });
  };

  // --- Handlers: User Accounts (CRUD) ---
  const handleOpenUserModal = (usr?: UserAccount) => {
    if (usr) {
      setEditingUser(usr);
      setUserForm({
        username: usr.username,
        password: '',
        name: usr.name,
        role: usr.role,
        sk_number: usr.sk_number || '',
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        password: '',
        name: '',
        role: 'panitia',
        sk_number: '',
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.name) {
      showToast('error', 'Mohon isi username dan nama lengkap.');
      return;
    }

    if (!editingUser && !userForm.password) {
      showToast('error', 'Mohon isi password awal untuk user baru.');
      return;
    }

    const res = votingStore.saveUserAccount({
      ...(editingUser ? { id: editingUser.id } : {}),
      username: userForm.username,
      password: userForm.password,
      name: userForm.name,
      role: userForm.role,
      sk_number: userForm.sk_number,
      is_active: true,
    });

    if (res.success) {
      showToast('success', res.message);
      setShowUserModal(false);
    } else {
      showToast('error', res.message);
    }
  };

  const handleDeleteUser = (userId: string, username: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Akun User',
      message: `Hapus akun login user "${username}"? User ini tidak akan dapat login kembali.`,
      confirmLabel: 'Hapus User',
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        const res = votingStore.deleteUserAccount(userId);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast(res.success ? 'success' : 'error', res.message);
      },
    });
  };

  const handlePrintBeritaAcara = () => {
    window.print();
  };

  const handleResetVotes = () => {
    const stats = votingStore.getElectionStats(activePeriod.id);
    setConfirmModal({
      isOpen: true,
      title: 'Reset Seluruh Suara Masuk (Administrator)',
      message: `PERINGATAN RESMI ADMINISTRATOR:\nApakah Anda yakin ingin MENGOSONGKAN KOTAK SUARA periode ${activePeriod.year_label}?\n\n• Sebanyak ${stats.totalVotes} suara masuk yang telah tercatat akan dihapus bersih.\n• Status ${stats.totalVotedDPT} pemilih di DPT yang telah memilih akan dikembalikan menjadi 'Belum Memilih'.\n• Data DPT, nomor PIN, dan profil Pasangan Calon tetap aman tersimpan.`,
      confirmLabel: 'Ya, Kosongkan Kotak Suara',
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        const res = votingStore.resetVotes(activePeriod.id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (res.success) {
          showToast('success', res.message);
        } else {
          showToast('error', 'Gagal mereset kotak suara.');
        }
      },
    });
  };

  const handleResetDemoData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset ke Data Demo Awal',
      message: 'Kembalikan seluruh database ke setelan demo awal? Semua DPT baru dan suara masuk akan di-reset.',
      confirmLabel: 'Reset Data Sekarang',
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        votingStore.resetToDefaultSeed();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', 'Data berhasil direset ke demo awal.');
        window.location.reload();
      },
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
              Dashboard Admin Sekolah / Madrasah
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Panel Administrator Lembaga
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Profil lembaga OSIS/OSIM, manajemen multi-periode, SK Panitia, kelola akun login user, serta berita acara resmi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleResetDemoData}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Data Demo</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-300 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Keluar dari akun administrator"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Log-Out Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-print">
        <button
          onClick={() => handleTabClick('school')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'school'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-400" />
          <span>Profil Sekolah/Madrasah</span>
        </button>

        <button
          onClick={() => handleTabClick('logo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'logo'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-purple-400" />
          <span>Upload Logo E-Voting</span>
        </button>


        <button
          onClick={() => handleTabClick('periods')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'periods'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-purple-400" />
          <span>Manajemen Periode ({periods.length})</span>
        </button>

        <button
          onClick={() => handleTabClick('committees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'committees'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4 text-purple-400" />
          <span>SK & Panitia ({committees.length})</span>
        </button>

        <button
          onClick={() => handleTabClick('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-purple-400" />
          <span>Tambah User ({userAccounts.length})</span>
        </button>

        <button
          onClick={() => handleTabClick('tanda_terima')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'tanda_terima'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-purple-400" />
          <span>Tanda Terima Kartu/Surat Suara</span>
        </button>

        <button
          onClick={() => handleTabClick('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'attendance'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4 text-purple-400" />
          <span>Daftar Hadir Pemilih</span>
        </button>


        <button
          onClick={() => handleTabClick('audit_berita_acara')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'audit_berita_acara'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Audit & Berita Acara</span>
        </button>

        <button
          onClick={() => handleTabClick('database_guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'database_guide'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4 text-purple-400" />
          <span>Panduan Database & Deploy</span>
        </button>
      </div>

      {/* ================= TAB 1: PROFIL SEKOLAH / MADRASAH (UPDATE) ================= */}
      {activeTab === 'school' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl">
          <form onSubmit={handleSaveSchoolConfig} className="space-y-5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-2">
                Tipe Organisasi Siswa
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrgType('OSIS')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    orgType === 'OSIS'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-extrabold text-sm text-slate-900 block mb-0.5">
                    OSIS (Sekolah Umum)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Organisasi Siswa Intra Sekolah (SMA / SMK / SMP)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrgType('OSIM')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    orgType === 'OSIM'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-extrabold text-sm text-slate-900 block mb-0.5">
                    OSIM (Madrasah)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Organisasi Siswa Intra Madrasah (MA / MTs Kementerian Agama)
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Nama Resmi Sekolah / Madrasah
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMKS PGRI 2 PALIMANAN"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Alamat Lembaga
              </label>
              <input
                type="text"
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                placeholder="Alamat sekolah..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Nama Kepala Sekolah / Madrasah (Penanggung Jawab Pemilu)
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="Contoh: Drs. H. Mulyadi, M.Pd."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            {/* Active Logo Summary Box with Direct Shortcut */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {schoolConfig.logo_url ? (
                    <img src={schoolConfig.logo_url} alt="Logo E-Voting" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Logo E-Voting Aktif</span>
                  <p className="text-xs font-bold text-slate-800">
                    Logo {orgType} {schoolConfig.school_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabClick('logo')}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Logo Baru</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Simpan Perubahan Lembaga
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB: UPLOAD LOGO E-VOTING OSIS / OSIM ================= */}
      {activeTab === 'logo' && (
        <div className="space-y-6 max-w-4xl">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200 flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5" />
                Menu Upload Logo E-Voting Resmi
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Upload & Kelola Logo E-Voting {orgType}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Unggah file logo sekolah/madrasah atau lambang OSIS/OSIM Anda. Logo ini otomatis dipasang pada Navbar, banner Quick Count real-time, Bilik Suara siswa, Kartu Pemilih cetak, dan Berita Acara rekapitulasi.
            </p>

            {/* Notification Messages */}
            {logoSuccessMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{logoSuccessMsg}</span>
              </div>
            )}
            {logoErrorMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{logoErrorMsg}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Upload Dropzone & Controls */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* File Dropzone Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>1. Unggah File Gambar Logo</span>
                </h4>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleLogoDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-purple-600 bg-purple-50/70 scale-[1.01]'
                      : 'border-slate-300 hover:border-purple-500 hover:bg-slate-50/70'
                  }`}
                  onClick={() => document.getElementById('logo-file-input')?.click()}
                >
                  <input
                    id="logo-file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoFileInput}
                    className="hidden"
                  />

                  <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <UploadCloud className="w-8 h-8 animate-bounce" />
                  </div>

                  <p className="font-extrabold text-sm text-slate-900 mb-1">
                    Klik untuk Memilih File atau Tarik File ke Sini
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
                    Mendukung format PNG, JPG, SVG, atau WebP (Transparan direkomendasikan, maksimal 3 MB)
                  </p>

                  <button
                    type="button"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File dari Perangkat</span>
                  </button>
                </div>

                {/* Alternatif Input URL */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                    Atau Masukkan URL Gambar (Opsional):
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setLogoSuccessMsg('');
                      }}
                      placeholder="https://... atau /src/assets/images/..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Preset Logos Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>2. Pilihan Cepat: Lambang Resmi Nasional</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Klik untuk memilih</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LOGO_PRESETS.map((preset) => {
                    const isSelected = logoUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setLogoUrl(preset.url);
                          setLogoSuccessMsg('Preset dipilih. Klik "Simpan & Terapkan Logo" untuk memperbarui.');
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 p-1.5 border border-slate-200 shrink-0 flex items-center justify-center">
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900 block truncate">
                              {preset.name}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0 ml-1" />}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                            {preset.subtitle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column: Live Dual Preview & Actions */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <span>3. Preview Tampilan Asli di Sistem</span>
                </h4>

                {/* Preview 1: Header / Navbar / Quick Count Dark Theme */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    A. Tampilan Dark Theme (Navbar & Banner Quick Count)
                  </span>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 p-1.5 border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo Dark Preview" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Tanpa Logo</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                          E-VOTING {orgType}
                        </span>
                        <h5 className="font-bold text-xs text-white truncate">
                          {schoolName || schoolConfig.school_name}
                        </h5>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Masa Bakti {activePeriod.year_label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview 2: Letterhead / Kartu Pemilih Light Theme */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    B. Tampilan Light Theme (Kop Berita Acara & Kartu Pemilih)
                  </span>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white p-1.5 border border-slate-300 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo Light Preview" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400">Tanpa Logo</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          PANITIA PEMILIHAN {orgType}
                        </span>
                        <h5 className="font-extrabold text-xs text-slate-900 truncate">
                          {schoolName || schoolConfig.school_name}
                        </h5>
                        <span className="text-[10px] text-slate-600 block">
                          KARTU SUARA PEMILIHAN DIGITAL
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleSaveLogo()}
                    className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan & Terapkan Logo E-Voting</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="w-full py-2 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kembalikan ke Logo Default</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* ================= TAB 3: MANAJEMEN PERIODE (CRUD) ================= */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Manajemen Periode Pemilihan (Multi-Tahun)
              </h3>
              <p className="text-xs text-slate-500">
                Tambah tahun ajaran baru, edit nama periode, ubah periode aktif, atau hapus periode arsip.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPeriod(null);
                setNewYearLabel('2027/2028');
                setShowNewPeriodModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Tambah Periode Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {periods.map((p) => {
              const pCandidates = votingStore.getCandidates(p.id);
              const pVotes = votingStore.getVotes(p.id);
              const pStudents = votingStore.getStudents(p.id);

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between ${
                    p.is_active ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-lg text-slate-900 font-mono">
                          Masa Bakti {p.year_label}
                        </span>
                        {p.is_active ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aktif Berjalan
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Arsip Historis
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        {p.organization_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Kandidat</span>
                        <strong className="text-slate-800 font-mono">{pCandidates.length} Paslon</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">DPT Terdaftar</span>
                        <strong className="text-slate-800 font-mono">{pStudents.length} Siswa</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Suara</span>
                        <strong className="text-emerald-700 font-mono">{pVotes.length} Suara</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Sesi: <strong>{p.voting_session_status}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPeriod(p);
                          setNewYearLabel(p.year_label);
                          setShowNewPeriodModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {!p.is_active && (
                        <>
                          <button
                            onClick={() => handleSetActivePeriod(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
                          >
                            Set Aktif
                          </button>
                          <button
                            onClick={() => handleDeletePeriod(p.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Periode Arsip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: SK & PANITIA (CRUD) ================= */}
      {activeTab === 'committees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Daftar Panitia Pemilihan Resmi (Berdasarkan SK)
              </h3>
              <p className="text-xs text-slate-500">
                Kelola anggota panitia pemilihan: tambah baru, perbarui jabatan/nomor SK, atau hapus.
              </p>
            </div>

            <button
              onClick={() => handleOpenCommModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Daftarkan Panitia Baru</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Nama Panitia</th>
                    <th className="py-3 px-4">Nomor SK Kepanitiaan</th>
                    <th className="py-3 px-4">Jabatan / Role</th>
                    <th className="py-3 px-4">Email Akses</th>
                    <th className="py-3 px-4 text-right">Aksi (CRUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {committees.map((comm) => (
                    <tr key={comm.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {comm.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {comm.sk_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200 text-[11px]">
                          {comm.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {comm.email}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenCommModal(comm)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Panitia"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCommittee(comm.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Panitia"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: TAMBAH USER (CRUD) ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Manajemen Akun Login Petugas
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Kelola User Petugas (Admin & Panitia)
              </h3>
              <p className="text-xs text-slate-500">
                Tambah akun baru, perbarui nama/password/role, atau hapus akun login petugas.
              </p>
            </div>

            <button
              onClick={() => handleOpenUserModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Tambah User Baru</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Username Login</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Role Akses</th>
                    <th className="py-3 px-4">Nomor NIP / SK</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userAccounts.map((usr) => (
                    <tr key={usr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {usr.username}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {usr.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          usr.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {usr.role === 'admin' ? 'Admin Sekolah' : 'Panitia Pemilihan'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {usr.sk_number || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Aktif
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenUserModal(usr)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Akun User"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {usr.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(usr.id, usr.username)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Akun User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Total {userAccounts.length} user terdaftar (Akun langsung dapat login di Portal Petugas)</span>
              <span>Proteksi password tersimpan aman</span>
            </div>
          </div>
        </div>
      )}


      {/* ================= TAB: TANDA TERIMA KARTU PEMILIH / SURAT SUARA ================= */}
      {activeTab === 'tanda_terima' && (
        <AdminTandaTerima
          activePeriod={activePeriod}
          schoolConfig={schoolConfig}
          committees={committees}
        />
      )}

      {/* ================= TAB: DAFTAR KEHADIRAN PEMILIH (PRESENSI DPT) ================= */}
      {activeTab === 'attendance' && (
        <AdminAttendanceList
          activePeriod={activePeriod}
          schoolConfig={schoolConfig}
          committees={committees}
        />
      )}

      {/* ================= TAB 5: AUDIT & BERITA ACARA ================= */}
      {activeTab === 'audit_berita_acara' && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs no-print">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Berita Acara Rekapitulasi & Dokumen Sah Pemilihan
              </h3>
              <p className="text-xs text-slate-500">
                Cetak dokumen Berita Acara resmi hasil pemungutan suara sebagai arsip legal sekolah / madrasah.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleResetVotes}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="Kosongkan seluruh kotak suara masuk periode aktif"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Reset Suara Masuk ({stats.totalVotes})</span>
              </button>

              <button
                onClick={handlePrintBeritaAcara}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Cetak Berita Acara (Print A4)</span>
              </button>
            </div>
          </div>

          {/* Printable Berita Acara Sheet */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-8 sm:p-12 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
            <div className="flex items-center justify-center gap-6 border-b-2 border-slate-900 pb-4">
              {schoolConfig.logo_url && (
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                  <img
                    src={schoolConfig.logo_url}
                    alt="Logo Lembaga"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="text-center space-y-1">
                <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-slate-900">
                  PEMERINTAH DAERAH / KEMENTERIAN AGAMA
                </h2>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-slate-900">
                  {schoolConfig.school_name}
                </h3>
                <p className="text-xs text-slate-600">
                  {schoolConfig.school_address}
                </p>
                <p className="text-xs font-semibold text-slate-800">
                  PANITIA PEMILIHAN KETUA {schoolConfig.organization_type} MASA BAKTI {activePeriod.year_label}
                </p>
              </div>
            </div>

            <div className="text-center space-y-1 py-2">
              <h4 className="font-bold text-base uppercase underline text-slate-900">
                BERITA ACARA REKAPITULASI HASIL PEMUNGUTAN SUARA
              </h4>
              <p className="text-xs text-slate-600 font-mono">
                Nomor: BA.09/PEMILU-{schoolConfig.organization_type}/{activePeriod.year_label.replace('/', '-')}/2026
              </p>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed text-justify">
              Pada hari ini, <strong>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah dilaksanakan pemungutan dan penghitungan suara secara elektronik (E-Voting) dalam rangka Pemilihan Ketua {schoolConfig.organization_type} {schoolConfig.school_name} Masa Bakti {activePeriod.year_label}. Berdasarkan sistem digital yang berjalan secara LUBER JURDIL, diperoleh hasil rekapitulasi sebagai berikut:
            </p>

            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase text-slate-800">
                I. Data Partisipasi Pemilih Berdasarkan Kategori
              </h5>
              <table className="w-full text-xs text-slate-800 border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold">
                  <tr>
                    <th className="p-2 text-left">Kategori Pemilih</th>
                    <th className="p-2 text-right w-24">Jumlah DPT</th>
                    <th className="p-2 text-right w-28">Suara Masuk</th>
                    <th className="p-2 text-right w-24">Partisipasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.categoryStats?.map((cat) => (
                    <tr key={cat.category}>
                      <td className="p-2 font-medium">{cat.label}</td>
                      <td className="p-2 font-mono text-right">{cat.total} Orang</td>
                      <td className="p-2 font-mono font-bold text-emerald-700 text-right">{cat.voted} Suara</td>
                      <td className="p-2 font-mono font-bold text-right">{cat.turnout}%</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                    <td className="p-2">TOTAL DPT KESELURUHAN</td>
                    <td className="p-2 font-mono text-right">{stats.totalDPT} Orang</td>
                    <td className="p-2 font-mono text-emerald-800 text-right">{stats.totalVotes} Suara</td>
                    <td className="p-2 font-mono text-right">{stats.turnoutPercentage}%</td>
                  </tr>
                  <tr className="bg-slate-50 text-slate-600">
                    <td colSpan={2} className="p-2 font-medium">Sisa Pemilih Tidak Menggunakan Hak Suara (Golput/Absen)</td>
                    <td colSpan={2} className="p-2 font-mono text-amber-700 font-bold text-right">{stats.remainingDPT} Orang</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase text-slate-800">
                II. Hasil Perolehan Suara Calon Ketua
              </h5>
              <table className="w-full text-xs text-slate-800 border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 text-center font-bold">
                  <tr>
                    <th className="p-2 w-16">No Urut</th>
                    <th className="p-2 text-left">Nama Calon Ketua</th>
                    <th className="p-2 w-28 text-right">Perolehan Suara</th>
                    <th className="p-2 w-24 text-right">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.candidateResults.map((cand) => (
                    <tr key={cand.id}>
                      <td className="p-2 text-center font-mono font-bold">
                        #{cand.candidate_number.toString().padStart(2, '0')}
                      </td>
                      <td className="p-2">
                        <strong>{cand.leader_name}</strong>
                      </td>
                      <td className="p-2 font-mono font-bold text-right">
                        {cand.vote_count} Suara
                      </td>
                      <td className="p-2 font-mono font-bold text-right">
                        {cand.vote_percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {winningCandidate && stats.totalVotes > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold block text-slate-900 mb-1">
                  III. Penetapan Calon Ketua Terpilih:
                </span>
                <p className="text-slate-700">
                  Berdasarkan perolehan suara terbanyak, ditetapkan bahwa <strong>Calon No. #{winningCandidate.candidate_number} ({winningCandidate.leader_name})</strong> dengan perolehan <strong>{winningCandidate.vote_count} suara ({winningCandidate.vote_percentage}%)</strong> dinyatakan sebagai Ketua {schoolConfig.organization_type} Terpilih Masa Bakti {activePeriod.year_label}.
                </p>
              </div>
            )}

            <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center text-slate-800">
              <div className="space-y-16">
                <div>
                  <p>Saksi Perwakilan MPK,</p>
                </div>
                <div>
                  <p className="font-bold underline">Bima Satrio</p>
                  <p className="text-[11px] text-slate-500">Ketua MPK Sekolah</p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p>Ketua Panitia Pemilihan,</p>
                </div>
                <div>
                  <p className="font-bold underline">{committees[0]?.name || 'Bapak Rahmat Hidayat, S.Pd.'}</p>
                  <p className="text-[11px] text-slate-500">{committees[0]?.sk_number || 'SK.045/PAN-PEMILU/2026'}</p>
                </div>
              </div>

              <div className="col-span-2 space-y-16 pt-4">
                <div>
                  <p>Mengetahui & Menyetujui,</p>
                  <p className="font-semibold">Kepala {schoolConfig.school_name}</p>
                </div>
                <div>
                  <p className="font-bold underline text-sm">{schoolConfig.principal_name}</p>
                  <p className="text-[11px] text-slate-500">NIP. 19740512 199903 1 002</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= TAB 7: PANDUAN DATABASE & DEPLOY ================= */}
      {activeTab === 'database_guide' && (
        <SupabaseGuideModal
          isOpen={true}
          onClose={() => handleTabClick('school')}
        />
      )}

      {/* Modal Periode (Create / Edit) */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-base">
              {editingPeriod ? 'Edit Label Tahun Ajaran' : 'Tambah Periode Pemilihan Baru'}
            </h4>
            <form onSubmit={handleSavePeriod} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Label Tahun Ajaran
                </label>
                <input
                  type="text"
                  value={newYearLabel}
                  onChange={(e) => setNewYearLabel(e.target.value)}
                  placeholder="Contoh: 2027/2028"
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPeriodModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Panitia (Create / Edit) */}
      {showNewCommModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-base">
              {editingComm ? 'Edit Data Panitia' : 'Daftarkan Akun Panitia (Berdasarkan SK)'}
            </h4>
            <form onSubmit={handleSaveCommittee} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  value={commForm.name}
                  onChange={(e) => setCommForm({ ...commForm, name: e.target.value })}
                  placeholder="Nama panitia..."
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Nomor Surat Keputusan (SK)</label>
                <input
                  type="text"
                  value={commForm.sk_number}
                  onChange={(e) => setCommForm({ ...commForm, sk_number: e.target.value })}
                  placeholder="SK.045/PAN-PEMILU/2026"
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Jabatan dalam Kepanitiaan</label>
                <select
                  value={commForm.role}
                  onChange={(e) => setCommForm({ ...commForm, role: e.target.value as any })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Ketua Panitia">Ketua Panitia</option>
                  <option value="Sekretaris">Sekretaris</option>
                  <option value="Bendahara">Bendahara</option>
                  <option value="Seksi Teknis / IT">Seksi Teknis / IT</option>
                  <option value="Pengawas TPS">Pengawas TPS</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Email Sekolah / Kontak</label>
                <input
                  type="email"
                  value={commForm.email}
                  onChange={(e) => setCommForm({ ...commForm, email: e.target.value })}
                  placeholder="nama@sekolah.sch.id"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCommModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold"
                >
                  Simpan Panitia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal User Account (Create / Edit CRUD) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-base">
              {editingUser ? `Edit Akun User: ${editingUser.username}` : 'Tambah User Login Petugas Baru'}
            </h4>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Username Login</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase() })}
                  placeholder="Contoh: panitia_kesiswaan"
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {editingUser ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Awal'}
                </label>
                <input
                  type="password"
                  value={userForm.password || ''}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUser ? 'Biarkan kosong untuk mempertahankan password lama' : 'Minimal 6 karakter'}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Contoh: Hendra Setiawan, S.Pd."
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Role Akses</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as StaffRole })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="panitia">Panitia Pemilihan</option>
                    <option value="admin">Admin Sekolah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nomor SK / NIP</label>
                  <input
                    type="text"
                    value={userForm.sk_number}
                    onChange={(e) => setUserForm({ ...userForm, sk_number: e.target.value })}
                    placeholder="SK.045/..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold"
                >
                  {editingUser ? 'Perbarui User' : 'Simpan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* In-App Toast Feedback */}
      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};
