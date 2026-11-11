import React, { useState, useEffect } from 'react';
import {
  Users,
  KeyRound,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Lock,
  Upload,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  Sparkles,
  Layers,
  Clock,
  Radio,
  FileSpreadsheet,
  GraduationCap,
  Briefcase,
  BookOpen,
  UserCheck,
  CheckSquare,
  Square,
  MinusSquare,
  Image as ImageIcon,
  UploadCloud,
  FileDown,
  FileText,
  AlertTriangle,
  LogOut,
  Loader2,
  HelpCircle,
  Check,
  FileCheck,
  RotateCcw,
  Database,
} from 'lucide-react';
import type { Candidate, ElectionPeriod, SchoolConfig, Student, VotingSessionStatus, VoterCategory } from '../types/index.ts';
import { votingStore } from '../services/storage.ts';
import { ConfirmModal } from './ConfirmModal';
import { Toast } from './Toast';
import { ResetIndividualVoteModal } from './ResetIndividualVoteModal';
import {
  downloadDptExcelTemplate,
  downloadDptCsvTemplate,
  parseDptExcelFile,
  ParseExcelResult,
} from '../services/excelService';

export type CommitteeTab = 'dpt' | 'cards' | 'candidates' | 'monitoring';

const CANDIDATE_PHOTO_PRESETS = [
  { label: 'Foto Paslon 1 (Resmi Jas)', url: '/assets/images/paslon_1_lead_1793677968157.jpg' },
  { label: 'Foto Paslon 2 (Kemeja Putih)', url: '/assets/images/paslon_2_lead_1793677970153.jpg' },
  { label: 'Foto Paslon 3 (Jas Almamater)', url: '/assets/images/paslon_3_lead_1793677969739.jpg' },
];

interface CommitteeDashboardProps {
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
  selectedTab?: CommitteeTab;
  onTabChange?: (tab: CommitteeTab) => void;
  onLogout?: () => void;
}

export const CommitteeDashboard: React.FC<CommitteeDashboardProps> = ({
  activePeriod,
  schoolConfig,
  selectedTab,
  onTabChange,
  onLogout,
}) => {
  const [internalTab, setInternalTab] = useState<CommitteeTab>('dpt');
  const activeTab = selectedTab || internalTab;

  const handleTabClick = (tab: CommitteeTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // DPT search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | VoterCategory>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedVoteStatus, setSelectedVoteStatus] = useState<'ALL' | 'VOTED' | 'NOT_VOTED'>('ALL');

  // DPT Checkbox selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Cetak Kartu & PIN search & filter state
  const [cardSelectedCategory, setCardSelectedCategory] = useState<'ALL' | VoterCategory>('ALL');
  const [cardSelectedClass, setCardSelectedClass] = useState<string>('ALL');
  const [cardSearchQuery, setCardSearchQuery] = useState<string>('');

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [studentToResetVote, setStudentToResetVote] = useState<Student | null>(null);
  const [monitoringSearchQuery, setMonitoringSearchQuery] = useState<string>('');

  // Candidate photo upload state
  const [candidatePhotoPreview, setCandidatePhotoPreview] = useState<string>('');
  const [candidatePhotoError, setCandidatePhotoError] = useState<string>('');
  const [isCandidatePhotoDragging, setIsCandidatePhotoDragging] = useState<boolean>(false);
  const [candidatePhotoInputTab, setCandidatePhotoInputTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [isUploadingCandidatePhoto, setIsUploadingCandidatePhoto] = useState<boolean>(false);
  const [isSavingCandidate, setIsSavingCandidate] = useState<boolean>(false);

  // Form states
  const [newStudent, setNewStudent] = useState<{
    nisn: string;
    name: string;
    class_name: string;
    voter_type: VoterCategory;
  }>({
    nisn: '',
    name: '',
    class_name: '',
    voter_type: 'SISWA',
  });
  const [importCsvText, setImportCsvText] = useState('');

  // Excel upload & preview states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelParsedData, setExcelParsedData] = useState<ParseExcelResult | null>(null);
  const [isExcelParsing, setIsExcelParsing] = useState<boolean>(false);
  const [excelImportTab, setExcelImportTab] = useState<'upload' | 'paste'>('upload');
  const [isExcelDragOver, setIsExcelDragOver] = useState<boolean>(false);
  const [candidateForm, setCandidateForm] = useState({
    candidate_number: 1,
    leader_name: '',
    photo_url: '',
    vision: '',
    mission: '',
    work_programs: '',
    motto: '',
  });

  const students = votingStore.getStudents(activePeriod.id);
  const candidates = votingStore.getCandidates(activePeriod.id);
  const stats = votingStore.getElectionStats(activePeriod.id);
  const auditLogs = votingStore.getAuditLogs();

  // Unique classes for filtering
  const classList = Array.from(new Set(students.map((s) => s.class_name))).sort();

  // Filtered Students for DPT Table
  const filteredStudents = students.filter((s) => {
    const sCat = s.voter_type || 'SISWA';
    const matchesCategory = selectedCategory === 'ALL' || sCat === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery);
    const matchesClass = selectedClass === 'ALL' || s.class_name === selectedClass;
    const matchesStatus =
      selectedVoteStatus === 'ALL' ||
      (selectedVoteStatus === 'VOTED' && s.has_voted) ||
      (selectedVoteStatus === 'NOT_VOTED' && !s.has_voted);

    return matchesCategory && matchesSearch && matchesClass && matchesStatus;
  });

  // Filtered Students for Cetak Kartu & PIN
  const filteredCardStudents = students.filter((s) => {
    const sCat = s.voter_type || 'SISWA';
    const matchesCategory = cardSelectedCategory === 'ALL' || sCat === cardSelectedCategory;
    const matchesClass = cardSelectedClass === 'ALL' || s.class_name === cardSelectedClass;
    const matchesSearch =
      !cardSearchQuery.trim() ||
      s.name.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
      s.nisn.includes(cardSearchQuery);

    return matchesCategory && matchesClass && matchesSearch;
  });

  // Reactive state ticker for storage events
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = votingStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  // In-app confirmation dialog state (replaces blocked native window.confirm in iframe)
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

  // In-app toast feedback state (replaces blocked native window.alert in iframe)
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

  // Checkbox calculations for filtered DPT
  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id));
  const someFilteredSelected =
    filteredStudents.some((s) => selectedStudentIds.includes(s.id)) &&
    !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredStudents.map((s) => s.id));
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const filteredIds = filteredStudents.map((s) => s.id);
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleDeleteSelectedStudents = () => {
    if (selectedStudentIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Pemilih Tercentang',
      message: `Apakah Anda yakin ingin menghapus ${selectedStudentIds.length} data pemilih yang dicentang dari DPT periode ${activePeriod.year_label}?\n\nTindakan ini bersifat permanen dan tidak dapat dibatalkan.`,
      confirmLabel: `Hapus (${selectedStudentIds.length}) Pemilih`,
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        const deleted = votingStore.deleteMultipleStudents(selectedStudentIds);
        setSelectedStudentIds([]);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', `Berhasil menghapus ${deleted} data pemilih terpilih dari DPT.`);
      },
    });
  };

  const handleDeleteAllDpt = () => {
    if (students.length === 0) {
      showToast('info', 'Daftar Pemilih Tetap (DPT) periode ini sudah kosong.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Seluruh Data DPT',
      message: `PERINGATAN KERAS:\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA DPT (${students.length} pemilih) pada periode ${activePeriod.year_label}?\n\nSemua data pemilih, Nomor Induk Pemilih, nama, kelas, status hak pilih, dan PIN kredensial akan dihapus permanen.`,
      confirmLabel: 'Ya, Hapus Semua DPT',
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        const deleted = votingStore.deleteAllStudents(activePeriod.id);
        setSelectedStudentIds([]);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', `Berhasil menghapus seluruh ${deleted} data DPT periode ${activePeriod.year_label}.`);
      },
    });
  };

  // Handler Upload Foto Calon
  const processCandidatePhotoFile = (file: File) => {
    setCandidatePhotoError('');
    if (!file.type.startsWith('image/')) {
      setCandidatePhotoError('Mohon pilih file gambar yang valid (JPG, PNG, WebP, SVG).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setCandidatePhotoError('Ukuran file maksimal 15 MB.');
      return;
    }

    setIsUploadingCandidatePhoto(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Immediately set photo preview & form data so it is NEVER missing even if saved immediately
        setCandidatePhotoPreview(result);
        setCandidateForm((prev) => ({ ...prev, photo_url: result }));

        try {
          const permUrl = await votingStore.uploadAsset(
            result,
            `paslon_${candidateForm.candidate_number || editingCandidate?.candidate_number || 'photo'}`
          );
          if (permUrl) {
            setCandidateForm((prev) => ({ ...prev, photo_url: permUrl }));
            setCandidatePhotoPreview(permUrl);
          }
        } catch (err: any) {
          console.warn('Upload to server fallback:', err);
          // Keep the data URL as fallback so candidate photo is still preserved
        } finally {
          setIsUploadingCandidatePhoto(false);
        }
      } else {
        setIsUploadingCandidatePhoto(false);
      }
    };
    reader.onerror = () => {
      setCandidatePhotoError('Gagal membaca file gambar foto calon.');
      setIsUploadingCandidatePhoto(false);
    };
    reader.readAsDataURL(file);
  };

  // Handlers
  const handleSessionChange = (status: VotingSessionStatus) => {
    votingStore.setVotingSessionStatus(activePeriod.id, status);
  };

  const handleResetVotes = () => {
    const totalVotes = stats.totalVotes;
    const totalVotedDPT = stats.totalVotedDPT;
    setConfirmModal({
      isOpen: true,
      title: 'Reset Seluruh Suara Masuk (Kosongkan Kotak Suara)',
      message: `PERINGATAN RESMI PANITIA:\nApakah Anda yakin ingin MENGOSONGKAN KOTAK SUARA periode ${activePeriod.year_label}?\n\n• Sebanyak ${totalVotes} suara masuk yang telah tercatat akan dihapus bersih.\n• Status ${totalVotedDPT} pemilih di DPT yang telah memilih akan dikembalikan menjadi 'Belum Memilih'.\n• Data DPT, nomor PIN, dan profil Pasangan Calon tetap aman dan TIDAK terhapus.\n\nTindakan ini biasanya dilakukan sebelum hari-H pemungutan suara resmi untuk membersihkan suara simulasi/uji coba.`,
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

  const handleBatchGeneratePins = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Generate Ulang PIN Pemilih',
      message: `Generate ulang PIN acak 6-digit untuk semua pemilih (Siswa, Guru, dan Staf TU) di periode ${activePeriod.year_label}?\n\nPemilih yang belum menggunakan hak pilihnya akan mendapatkan PIN baru.`,
      confirmLabel: 'Generate PIN Baru',
      cancelLabel: 'Batal',
      variant: 'warning',
      onConfirm: () => {
        const count = votingStore.batchGeneratePins(activePeriod.id, false);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', `Berhasil membuat PIN 6-digit acak baru untuk ${count} pemilih.`);
      },
    });
  };

  const handleResetPin = (student: Student) => {
    const newPin = votingStore.resetStudentPin(student.id);
    showToast('success', `PIN untuk ${student.name} berhasil direset ke: ${newPin}`);
  };

  const handleConfirmResetIndividualVote = (options: {
    studentId: string;
    deductVote: boolean;
    candidateIdToDeduct?: string;
    generateNewPin: boolean;
    reason: string;
  }) => {
    const res = votingStore.resetIndividualStudentVote(options.studentId, {
      deductVote: options.deductVote,
      candidateIdToDeduct: options.candidateIdToDeduct,
      generateNewPin: options.generateNewPin,
      reason: options.reason,
      actor: 'Panitia Pemilihan',
    });

    if (res.success) {
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  const handleBatchResetVotes = () => {
    const votedSelected = filteredStudents.filter(
      (s) => selectedStudentIds.includes(s.id) && s.has_voted
    );
    if (votedSelected.length === 0) {
      showToast('info', 'Tidak ada pemilih tercentang yang berstatus Sudah Memilih.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Reset Hak Suara (${votedSelected.length}) Pemilih`,
      message: `Apakah Anda yakin ingin mereset status voting ${votedSelected.length} pemilih tercentang kembali menjadi 'Belum Memilih'?\n\n• Suara masuk pada kotak suara akan disinkronkan berkurang ${votedSelected.length} suara.\n• Para pemilih tersebut dapat kembali menggunakan hak suaranya di bilik suara digital.`,
      confirmLabel: `Ya, Reset (${votedSelected.length}) Hak Suara`,
      cancelLabel: 'Batal',
      variant: 'warning',
      onConfirm: () => {
        const res = votingStore.batchResetStudentsVote(
          votedSelected.map((s) => s.id),
          { deductVotes: true, actor: 'Panitia Pemilihan' }
        );
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (res.success) {
          showToast('success', res.message);
        } else {
          showToast('error', res.message);
        }
      },
    });
  };

  const handleDeleteStudent = (studentId: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Pemilih dari DPT',
      message: `Hapus pemilih "${name}" dari Daftar Pemilih Tetap periode ${activePeriod.year_label}?`,
      confirmLabel: 'Hapus Pemilih',
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        votingStore.deleteStudent(studentId);
        setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', `Pemilih "${name}" berhasil dihapus dari DPT.`);
      },
    });
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.nisn || !newStudent.name || !newStudent.class_name) return;

    if (editingStudent) {
      const res = votingStore.updateStudent(editingStudent.id, {
        nisn: newStudent.nisn,
        name: newStudent.name,
        class_name: newStudent.class_name,
        voter_type: newStudent.voter_type,
      });

      if (res.success) {
        setEditingStudent(null);
        setNewStudent({ nisn: '', name: '', class_name: '', voter_type: 'SISWA' });
        setShowAddStudentModal(false);
        showToast('success', res.message);
      } else {
        showToast('error', res.message);
      }
    } else {
      const res = votingStore.addStudent({
        nisn: newStudent.nisn,
        name: newStudent.name,
        class_name: newStudent.class_name,
        voter_type: newStudent.voter_type,
        period_id: activePeriod.id,
      });

      if (res.success) {
        setNewStudent({ nisn: '', name: '', class_name: '', voter_type: 'SISWA' });
        setShowAddStudentModal(false);
        showToast('success', `Pemilih berhasil ditambahkan! PIN login: ${res.student?.pin}`);
      } else {
        showToast('error', res.message);
      }
    }
  };

  const handleBulkImport = () => {
    const lines = importCsvText.trim().split('\n');
    const parsed: Array<{ nisn: string; name: string; class_name: string; voter_type?: VoterCategory }> = [];

    for (const line of lines) {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      if (parts.length >= 3) {
        const p0Lower = parts[0].toLowerCase();
        if (p0Lower === 'nisn' || p0Lower === 'nip' || parts[1].toLowerCase() === 'nama') continue;

        let detectedType: VoterCategory = 'SISWA';
        if (parts.length >= 4) {
          const typeStr = parts[3].toUpperCase();
          if (typeStr.includes('GURU')) detectedType = 'GURU';
          else if (typeStr.includes('TU') || typeStr.includes('TATA') || typeStr.includes('STAF')) detectedType = 'TATA_USAHA';
        }

        parsed.push({
          nisn: parts[0],
          name: parts[1],
          class_name: parts[2],
          voter_type: detectedType,
        });
      }
    }

    if (parsed.length === 0) {
      showToast('error', 'Format CSV tidak dikenali. Pastikan berformat: NOMOR INDUK PEMILIH, Nama, Kelas/Jabatan, Kategori');
      return;
    }

    const res = votingStore.bulkImportStudents(parsed, activePeriod.id);
    showToast('success', `Hasil Import: ${res.added} pemilih ditambahkan, ${res.skipped} duplikat dilewati.`);
    setImportCsvText('');
    setShowImportModal(false);
  };

  const handleDownloadTemplate = () => {
    downloadDptExcelTemplate(schoolConfig.organization_type, schoolConfig.school_name);
    showToast('info', 'File template Excel DPT (.xlsx) berhasil diunduh ke perangkat Anda.');
  };

  const handleDownloadCsvTemplate = () => {
    downloadDptCsvTemplate();
    showToast('info', 'File template CSV DPT berhasil diunduh.');
  };

  const handleExcelFileSelect = async (file: File) => {
    if (!file) return;
    setExcelFile(file);
    setIsExcelParsing(true);
    try {
      const res = await parseDptExcelFile(file);
      setExcelParsedData(res);
      if (res.success) {
        showToast('success', `Berhasil membaca ${res.rows.length} data pemilih dari file Excel!`);
      } else {
        showToast('error', res.message || 'Gagal membaca format isi file Excel.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal memproses file Excel: ' + (err?.message || 'Format tidak valid.'));
    } finally {
      setIsExcelParsing(false);
    }
  };

  const handleCommitExcelImport = () => {
    if (!excelParsedData || excelParsedData.rows.length === 0) {
      showToast('error', 'Tidak ada data pemilih yang valid untuk diimport.');
      return;
    }

    const payload = excelParsedData.rows.map((r) => ({
      nisn: r.nisn,
      name: r.name,
      class_name: r.class_name,
      voter_type: r.voter_type,
    }));

    const res = votingStore.bulkImportStudents(payload, activePeriod.id);
    showToast(
      'success',
      `Hasil Import: ${res.added} pemilih berhasil dimasukkan ke DPT! (${res.skipped} data dengan Nomor Induk Pemilih duplikat dilewati).`
    );
    setExcelFile(null);
    setExcelParsedData(null);
    setShowImportModal(false);
  };

  const handleOpenCandidateModal = (cand?: Candidate) => {
    setCandidatePhotoError('');
    setCandidatePhotoInputTab('upload');
    if (cand) {
      setEditingCandidate(cand);
      setCandidateForm({
        candidate_number: cand.candidate_number,
        leader_name: cand.leader_name,
        photo_url: cand.photo_url,
        vision: cand.vision,
        mission: cand.mission.join('\n'),
        work_programs: (cand.work_programs || []).join('\n'),
        motto: cand.motto || '',
      });
      setCandidatePhotoPreview(cand.photo_url || '');
    } else {
      setEditingCandidate(null);
      const defaultPhoto = '/assets/images/paslon_1_lead_1793677968157.jpg';
      setCandidateForm({
        candidate_number: candidates.length + 1,
        leader_name: '',
        photo_url: defaultPhoto,
        vision: '',
        mission: 'Meningkatkan prestasi siswa\nMemperkuat kedisiplinan dan kolaborasi',
        work_programs: 'Festival Seni Budaya Tahunan\nKanal Aspirasi Siswa',
        motto: '',
      });
      setCandidatePhotoPreview(defaultPhoto);
    }
    setShowCandidateModal(true);
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingCandidate) return;

    setIsSavingCandidate(true);
    setCandidatePhotoError('');

    try {
      const missionArray = candidateForm.mission
        .split('\n')
        .map((m) => m.trim())
        .filter(Boolean);
      const workProgramsArray = candidateForm.work_programs
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);

      // Prioritize what is visible in the preview, then form, then editingCandidate, then fallback
      let effectivePhoto = candidatePhotoPreview || candidateForm.photo_url || editingCandidate?.photo_url;
      if (!effectivePhoto) {
        effectivePhoto = '/assets/images/paslon_1_lead_1793677968157.jpg';
      }

      // If photo is still Base64, upload to server now to guarantee permanent URL (/uploads/...)
      if (effectivePhoto.startsWith('data:image/')) {
        try {
          const permUrl = await votingStore.uploadAsset(
            effectivePhoto,
            `paslon_${candidateForm.candidate_number || editingCandidate?.candidate_number || 'lead'}`
          );
          if (permUrl) {
            effectivePhoto = permUrl;
          }
        } catch (uploadErr) {
          console.warn('Could not upload photo in handleSaveCandidate:', uploadErr);
        }
      }

      await votingStore.saveCandidateAsync({
        ...(editingCandidate ? { id: editingCandidate.id } : {}),
        period_id: activePeriod.id,
        candidate_number: Number(candidateForm.candidate_number),
        leader_name: candidateForm.leader_name.trim(),
        vice_leader_name: '',
        photo_url: effectivePhoto,
        vision: candidateForm.vision.trim(),
        mission: missionArray,
        work_programs: workProgramsArray,
        motto: candidateForm.motto.trim(),
      });

      showToast('success', 'Data & foto calon ketua berhasil disimpan.');
      setShowCandidateModal(false);
    } catch (err: any) {
      console.error('Error saving candidate:', err);
      showToast('error', 'Gagal menyimpan calon: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSavingCandidate(false);
    }
  };

  const handleDeleteCandidate = (candId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Calon Ketua',
      message: 'Hapus calon ketua ini dari surat suara dan daftar pemilihan?',
      confirmLabel: 'Hapus Calon',
      cancelLabel: 'Batal',
      variant: 'danger',
      onConfirm: () => {
        votingStore.deleteCandidate(candId);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('success', 'Calon ketua berhasil dihapus dari surat suara.');
      },
    });
  };

  const handlePrintCards = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Bilik Suara Quick Status Strip */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              Dashboard Panitia Pemilihan
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-mono">
              Masa Bakti {activePeriod.year_label} ({schoolConfig.organization_type})
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Panel Operasional Panitia
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola DPT siswa, PIN kredensial, cetak kartu, paslon, dan kontrol jalannya bilik suara.
          </p>
        </div>

        {/* Bilik Session Status Control & Logout */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 flex items-center gap-2">
            <div className="text-xs font-semibold text-slate-500 px-3 hidden sm:block">
              Sesi Bilik:
            </div>

            <button
              onClick={() => handleSessionChange('OPEN')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activePeriod.voting_session_status === 'OPEN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>BUKA</span>
            </button>

            <button
              onClick={() => handleSessionChange('PAUSED')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activePeriod.voting_session_status === 'PAUSED'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>JEDA</span>
            </button>

            <button
              onClick={() => handleSessionChange('CLOSED')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activePeriod.voting_session_status === 'CLOSED'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>TUTUP</span>
            </button>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-300 transition-all shadow-xs cursor-pointer shrink-0"
              title="Keluar dari akun panitia"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Log-Out Panitia</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Navigation Tabs (Menu Panitia: DPT Pemilih, Cetak Kartu&PIN, Pasangan Calon, Monitoring Bilik) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-print">
        <button
          onClick={() => handleTabClick('dpt')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'dpt'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>DPT Pemilih ({students.length})</span>
        </button>

        <button
          onClick={() => handleTabClick('cards')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'cards'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Cetak Kartu & PIN</span>
        </button>

        <button
          onClick={() => handleTabClick('candidates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'candidates'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Pasangan Calon ({candidates.length})</span>
        </button>

        <button
          onClick={() => handleTabClick('monitoring')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'monitoring'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          <span>Monitoring Bilik</span>
        </button>
      </div>

      {/* ================= TAB 1: DPT PEMILIH (SISWA, GURU & STAF TU) ================= */}
      {activeTab === 'dpt' && (
        <div className="space-y-4">
          
          {/* Category Filter Pills Bar */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Semua DPT ({students.length})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('SISWA')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === 'SISWA'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-white/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Siswa ({students.filter((s) => (s.voter_type || 'SISWA') === 'SISWA').length})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('GURU')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === 'GURU'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-purple-700 hover:bg-white/50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Dewan Guru ({students.filter((s) => s.voter_type === 'GURU').length})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('TATA_USAHA')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === 'TATA_USAHA'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-teal-700 hover:bg-white/50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Staf Tata Usaha ({students.filter((s) => s.voter_type === 'TATA_USAHA').length})</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              
              {/* Search Bar */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama pemilih atau Nomor Induk Pemilih..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ALL">Semua Rombel / Mapel</option>
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vote Status Filter */}
              <select
                value={selectedVoteStatus}
                onChange={(e) => setSelectedVoteStatus(e.target.value as any)}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-600"
              >
                <option value="ALL">Semua Status Voting</option>
                <option value="VOTED">Sudah Memilih</option>
                <option value="NOT_VOTED">Belum Memilih</option>
              </select>

            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              
              {/* Button: Template Excel DPT */}
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                title="Download Template Format Excel DPT (.xlsx) resmi"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                <span>Template Excel</span>
              </button>

              {/* Button: Upload Excel DPT */}
              <button
                onClick={() => {
                  setExcelImportTab('upload');
                  setExcelFile(null);
                  setExcelParsedData(null);
                  setShowImportModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs cursor-pointer active:scale-95"
                title="Upload file spreadsheet Excel (.xlsx / .xls / .csv)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Upload Excel DPT</span>
              </button>

              {/* Button: Reset Suara Masuk */}
              <button
                onClick={handleResetVotes}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                title="Kosongkan kotak suara masuk pada periode aktif"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Reset Suara ({stats.totalVotes})</span>
              </button>

              {/* Button: Hapus Semua DPT */}
              <button
                onClick={handleDeleteAllDpt}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                title="Hapus seluruh data DPT periode aktif"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Hapus Semua DPT</span>
              </button>

              <button
                onClick={() => {
                  setEditingStudent(null);
                  setNewStudent({ nisn: '', name: '', class_name: '', voter_type: 'SISWA' });
                  setShowAddStudentModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Manual</span>
              </button>
            </div>
          </div>

          {/* Floating / Sticky Bulk Action Bar for Checked Students */}
          {selectedStudentIds.length > 0 && (() => {
            const selectedVotedCount = students.filter(
              (s) => selectedStudentIds.includes(s.id) && s.has_voted
            ).length;

            return (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-mono font-bold text-xs">
                    {selectedStudentIds.length}
                  </span>
                  <span>
                    <strong>{selectedStudentIds.length} pemilih dicentang</strong> dari total {students.length} DPT
                    {selectedVotedCount > 0 && (
                      <span className="text-amber-300 ml-1.5 font-normal">
                        ({selectedVotedCount} sudah memilih)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedStudentIds([])}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Batal Centang
                  </button>

                  {selectedVotedCount > 0 && (
                    <button
                      onClick={handleBatchResetVotes}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                      title="Kembalikan status hak suara pemilih tercentang menjadi Belum Memilih"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Voting ({selectedVotedCount})</span>
                    </button>
                  )}

                  <button
                    onClick={handleDeleteSelectedStudents}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Tercentang ({selectedStudentIds.length})</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* DPT Table with Checkbox Column */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    {/* Checkbox Select All visible */}
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected && filteredStudents.length > 0}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredSelected;
                        }}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        title={allFilteredSelected ? 'Batalkan pilihan semua' : 'Centang semua yang tampil'}
                      />
                    </th>
                    <th className="py-3 px-3 w-12">No</th>
                    <th className="py-3 px-4">NOMOR INDUK PEMILIH</th>
                    <th className="py-3 px-4">Nama Pemilih</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Kelas / Jabatan</th>
                    <th className="py-3 px-4">Status Suara</th>
                    <th className="py-3 px-4">Waktu Voting</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Tidak ada data pemilih yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, idx) => {
                      const vType = std.voter_type || 'SISWA';
                      const isSelected = selectedStudentIds.includes(std.id);
                      return (
                        <tr
                          key={std.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectStudent(std.id)}
                              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900">{std.nisn}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{std.name}</td>
                          <td className="py-3 px-4">
                            {vType === 'GURU' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <GraduationCap className="w-3 h-3 text-purple-600" />
                                Dewan Guru
                              </span>
                            ) : vType === 'TATA_USAHA' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                <Briefcase className="w-3 h-3 text-teal-600" />
                                Staf TU
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <BookOpen className="w-3 h-3 text-blue-600" />
                                Siswa
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-semibold text-[11px]">
                              {std.class_name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {std.has_voted ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Sudah Memilih
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setStudentToResetVote(std)}
                                  className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                                  title={`Klik untuk reset status voting ${std.name}`}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <XCircle className="w-3 h-3 text-amber-600" />
                                Belum Memilih
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px] tabular-nums">
                            {std.voted_at ? new Date(std.voted_at).toLocaleTimeString('id-ID') : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {std.has_voted ? (
                                <button
                                  type="button"
                                  onClick={() => setStudentToResetVote(std)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-300 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
                                  title={`Reset hak suara ${std.name} (${std.nisn}) ke status Belum Memilih`}
                                >
                                  <RotateCcw className="w-3 h-3 text-amber-600" />
                                  <span>Reset Suara</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleResetPin(std)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer"
                                  title={`Generate ulang PIN untuk ${std.name}`}
                                >
                                  <KeyRound className="w-3 h-3 text-slate-500" />
                                  <span>Reset PIN</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditingStudent(std);
                                  setNewStudent({
                                    nisn: std.nisn,
                                    name: std.name,
                                    class_name: std.class_name,
                                    voter_type: std.voter_type || 'SISWA',
                                  });
                                  setShowAddStudentModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Data Pemilih"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(std.id, std.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Pemilih dari DPT"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Menampilkan {filteredStudents.length} dari {students.length} total DPT</span>
                {selectedStudentIds.length > 0 && (
                  <span className="font-bold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                    ({selectedStudentIds.length} dicentang)
                  </span>
                )}
              </div>
              <span>Terproteksi sistem anti-double voting</span>
            </div>
          </div>

        </div>
      )}


      {/* ================= TAB 2: CETAK KARTU & PIN ================= */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          
          {/* Action Toolbar Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs no-print">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200 uppercase tracking-wider">
                  Format Lembar A4 Siap Cetak & Ekspor PDF
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-semibold text-slate-600 font-mono">
                  {filteredCardStudents.length} dari {students.length} kartu terpilih
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Manajemen Kredensial PIN & Cetak Kartu Pemilih
              </h3>
              <p className="text-xs text-slate-500">
                Pilih filter kelas atau kategori di bawah, lalu klik Cetak / Buat PDF (A4) untuk menghasilkan dokumen PDF siap potong.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleBatchGeneratePins}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>Auto-Generate PIN Semua</span>
              </button>

              <button
                onClick={handlePrintCards}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                title="Cetak kartu pemilih atau simpan sebagai file PDF ukuran A4"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <FileDown className="w-4 h-4 text-sky-400" />
                <span>Cetak / Buat PDF (A4)</span>
              </button>
            </div>
          </div>

          {/* Panduan Ekspor PDF Ukuran A4 */}
          <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-sky-950 no-print">
            <FileText className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>Cara Membuat & Menyimpan Dokumen PDF (A4):</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-200/80 text-sky-900 text-[10px] font-mono font-bold">
                  Standar Kertas A4 (2 Kolom)
                </span>
              </div>
              <p className="text-[11px] text-sky-900/90 leading-relaxed">
                1. Pilih <strong>Filter Kelas</strong> atau <strong>Kategori</strong> di bawah agar kartu terkelompok rapi.<br />
                2. Klik tombol <strong>Cetak / Buat PDF (A4)</strong>.<br />
                3. Pada jendela dialog cetak browser, ubah <strong>Tujuan / Destination</strong> menjadi <strong>"Simpan sebagai PDF" (Save as PDF)</strong>.<br />
                4. Pastikan Ukuran Kertas adalah <strong>A4</strong> dan centang opsi <strong>"Grafik Latar Belakang" (Background Graphics)</strong> agar emblem sekolah dan nomor PIN tercetak sempurna.
              </p>
            </div>
          </div>

          {/* Filter Bar: Kategori, Filter Kelas (Rombel), dan Pencarian */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs no-print shadow-xs">
            
            {/* Filter Category & Filter Kelas */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Filter Kategori */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">Kategori:</span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setCardSelectedCategory('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      cardSelectedCategory === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({students.length})
                  </button>
                  <button
                    onClick={() => setCardSelectedCategory('SISWA')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      cardSelectedCategory === 'SISWA'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-blue-700'
                    }`}
                  >
                    Siswa ({students.filter((s) => (s.voter_type || 'SISWA') === 'SISWA').length})
                  </button>
                  <button
                    onClick={() => setCardSelectedCategory('GURU')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      cardSelectedCategory === 'GURU'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-purple-700'
                    }`}
                  >
                    Guru ({students.filter((s) => s.voter_type === 'GURU').length})
                  </button>
                  <button
                    onClick={() => setCardSelectedCategory('TATA_USAHA')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      cardSelectedCategory === 'TATA_USAHA'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-teal-700'
                    }`}
                  >
                    Staf TU ({students.filter((s) => s.voter_type === 'TATA_USAHA').length})
                  </button>
                </div>
              </div>

              {/* Filter Kelas (Rombel) */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-700">Filter Kelas:</span>
                <select
                  value={cardSelectedClass}
                  onChange={(e) => setCardSelectedClass(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
                >
                  <option value="ALL">Semua Kelas / Rombel ({students.length} kartu)</option>
                  {classList.map((cls) => {
                    const countInClass = students.filter((s) => s.class_name === cls).length;
                    return (
                      <option key={cls} value={cls}>
                        {cls} ({countInClass} kartu)
                      </option>
                    );
                  })}
                </select>
              </div>

            </div>

            {/* Pencarian nama atau Nomor Induk Pemilih */}
            <div className="flex items-center gap-2 flex-1 md:max-w-xs">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau Nomor Induk Pemilih kartu..."
                  value={cardSearchQuery}
                  onChange={(e) => setCardSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Lembar Header Khusus Print & PDF (Hanya Muncul Saat Print / PDF) */}
          <div className="hidden print:block mb-4 pb-2 border-b-2 border-slate-900 text-center">
            <div className="flex items-center justify-center gap-3 mb-1.5">
              {schoolConfig.logo_url && (
                <img
                  src={schoolConfig.logo_url}
                  alt="Logo Sekolah"
                  className="w-12 h-12 object-contain"
                />
              )}
              <div className="text-left">
                <h1 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 leading-tight">
                  LEMBAR KARTU PEMILIH & PIN KREDENSIAL BILIK SUARA
                </h1>
                <p className="text-[11px] font-bold text-slate-700">
                  {schoolConfig.school_name} · PEMILIHAN KETUA {schoolConfig.organization_type}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono pt-1 border-t border-slate-200">
              <span>Periode: <strong>{activePeriod.year_label}</strong></span>
              <span>Filter Kelas: <strong>{cardSelectedClass === 'ALL' ? 'Semua Kelas / Rombel' : cardSelectedClass}</strong></span>
              <span>Kategori: <strong>{cardSelectedCategory === 'ALL' ? 'Semua DPT' : cardSelectedCategory}</strong></span>
              <span>Total: <strong>{filteredCardStudents.length} Kartu Siap Pakai</strong></span>
            </div>
          </div>

          {/* Empty State */}
          {filteredCardStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
              <Printer className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Tidak ada kartu pemilih yang cocok dengan filter kelas atau pencarian.
              </p>
              <button
                onClick={() => {
                  setCardSelectedCategory('ALL');
                  setCardSelectedClass('ALL');
                  setCardSearchQuery('');
                }}
                className="text-xs text-indigo-600 hover:underline font-bold"
              >
                Reset Filter Kartu
              </button>
            </div>
          ) : (
            /* Printable Cards Grid (2 Kolom A4 Saat Dicetak / Disimpan ke PDF) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print-cards-container print:grid print:grid-cols-2 print:gap-3">
              {filteredCardStudents.map((std) => {
                const vType = std.voter_type || 'SISWA';
                const isGuru = vType === 'GURU';
                const isTu = vType === 'TATA_USAHA';

                const cardCategoryTitle = isGuru
                  ? 'KARTU PEMILIH DEWAN GURU'
                  : isTu
                  ? 'KARTU PEMILIH STAF TATA USAHA'
                  : `KARTU PEMILIH SISWA (${schoolConfig.organization_type})`;

                const badgeColor = isGuru
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : isTu
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200';

                const idLabel = 'NOMOR INDUK PEMILIH';

                return (
                  <div
                    key={std.id}
                    className={`bg-white border-2 rounded-2xl p-4 flex flex-col justify-between shadow-xs print-voter-card print:border-black print:rounded-lg print:p-3 print:m-0 print:break-inside-avoid ${
                      isGuru
                        ? 'border-purple-300'
                        : isTu
                        ? 'border-teal-300'
                        : 'border-slate-300'
                    }`}
                  >
                    {/* Header Kartu */}
                    <div className="border-b border-slate-200 pb-2 mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs overflow-hidden p-0.5 border border-slate-300 shrink-0">
                          {schoolConfig.logo_url ? (
                            <img
                              src={schoolConfig.logo_url}
                              alt="Logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            schoolConfig.organization_type
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-[10px] text-slate-900 tracking-tight leading-none uppercase">
                            {cardCategoryTitle}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px] sm:max-w-none">
                            {schoolConfig.school_name}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 font-bold shrink-0">
                        {activePeriod.year_label}
                      </span>
                    </div>

                    {/* Identity & Credentials */}
                    <div className="space-y-2 mb-2">
                      <div className="flex justify-between items-start text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block">Nama Pemilih</span>
                          <strong className="text-slate-900 text-sm leading-tight block truncate" title={std.name}>
                            {std.name}
                          </strong>
                        </div>
                        <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border shrink-0 ${badgeColor}`}>
                          {std.class_name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-slate-200">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-tight">{idLabel}</span>
                          <span className="font-mono font-bold text-slate-900 text-xs block truncate" title={std.nisn}>
                            {std.nisn}
                          </span>
                        </div>
                        <div className="bg-slate-100 p-1.5 rounded-lg text-center border border-slate-200 print:bg-slate-50">
                          <span className="text-[9px] text-slate-500 uppercase font-bold block">PIN RAHASIA</span>
                          <span className="font-mono font-extrabold text-emerald-700 tracking-widest text-sm">
                            {std.pin}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer & Reset PIN button */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold">
                        {isGuru ? 'Dewan Guru' : isTu ? 'Staf Tata Usaha' : 'Siswa Pemilih'}
                      </span>
                      <div className="flex items-center gap-1.5 no-print">
                        <button
                          onClick={() => handleResetPin(std)}
                          className="text-amber-700 hover:underline font-semibold"
                        >
                          Reset PIN
                        </button>
                      </div>
                      <span className="font-mono print-only font-bold text-slate-800">BILIK DIGITAL</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ================= TAB 3: CALON KETUA ================= */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Kelola Calon Ketua ({schoolConfig.organization_type})
              </h3>
              <p className="text-xs text-slate-500">
                Atur nomor urut, foto calon ketua, serta butir visi-misi.
              </p>
            </div>

            <button
              onClick={() => handleOpenCandidateModal()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Tambah Calon Ketua</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {candidates.map((cand) => (
              <div key={cand.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
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
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-slate-900/90 text-white font-mono font-extrabold text-sm border border-white/20">
                      #{cand.candidate_number.toString().padStart(2, '0')}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                        Calon Ketua #{cand.candidate_number}
                      </span>
                      <h4 className="font-bold text-base text-slate-900 leading-tight">
                        {cand.leader_name}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      "{cand.vision}"
                    </p>

                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{cand.mission.length} butir misi</span>
                      {cand.work_programs && cand.work_programs.length > 0 && (
                        <span> · {cand.work_programs.length} program kerja</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={() => handleOpenCandidateModal(cand)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCandidate(cand.id)}
                    className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: MONITORING BILIK ================= */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          
          {/* Status Bilik Control Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  Kontrol Sesi Bilik Suara Digital
                </span>
                <h3 className="text-xl font-bold text-white">
                  Status Saat Ini:{' '}
                  <span className={activePeriod.voting_session_status === 'OPEN' ? 'text-emerald-400' : activePeriod.voting_session_status === 'PAUSED' ? 'text-amber-400' : 'text-slate-400'}>
                    {activePeriod.voting_session_status === 'OPEN' ? 'DIBUKA (Menerima Suara)' : activePeriod.voting_session_status === 'PAUSED' ? 'DIJEDA SEMENTARA' : 'DITUTUP'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Buka sesi pada jam pemilihan dan tutup setelah tenggat waktu berakhir untuk mengunci rekapitulasi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSessionChange('OPEN')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activePeriod.voting_session_status === 'OPEN'
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Buka Bilik</span>
                </button>

                <button
                  onClick={() => handleSessionChange('PAUSED')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activePeriod.voting_session_status === 'PAUSED'
                      ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Jeda Sesi</span>
                </button>

                <button
                  onClick={() => handleSessionChange('CLOSED')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activePeriod.voting_session_status === 'CLOSED'
                      ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Tutup Pemilihan</span>
                </button>

                <button
                  onClick={handleResetVotes}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer active:scale-95"
                  title="Reset seluruh suara masuk periode aktif (kosongkan kotak suara)"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Reset Suara Masuk</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Total DPT</span>
                <strong className="text-white text-base font-mono">{stats.totalDPT} Pemilih</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Suara Masuk</span>
                <strong className="text-emerald-400 text-base font-mono">{stats.totalVotes} Suara</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Tingkat Partisipasi</span>
                <strong className="text-sky-400 text-base font-mono">{stats.turnoutPercentage}%</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Sisa Pemilih</span>
                <strong className="text-amber-400 text-base font-mono">{stats.remainingDPT} Pemilih</strong>
              </div>
            </div>
          </div>

          {/* Perolehan Suara Calon Ketua (Hasil Data Masuk Real-Time) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Perolehan Suara Calon Ketua (Hasil Input Kotak Suara)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekapitulasi perolehan suara sah (One Person One Vote: 1 DPT = 1 Suara untuk Siswa, Guru, dan Staf TU).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Data Sinkron: {stats.totalVotes} Suara Sah Masuk (100% Akurat = {stats.totalVotedDPT} Pemilih Hadir)</span>
                </span>

                <button
                  onClick={handleResetVotes}
                  className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Reset & kosongkan seluruh perolehan suara"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Suara</span>
                </button>
              </div>
            </div>

            {/* Candidate Vote Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.candidateResults.map((cand) => (
                <div key={cand.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={cand.photo_url}
                      alt={cand.leader_name}
                      className="w-12 h-12 rounded-xl object-cover object-top border border-slate-200 shadow-2xs shrink-0"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.failed) {
                          target.dataset.failed = 'true';
                          target.src = '/assets/images/paslon_1_lead_1793677968157.jpg';
                        }
                      }}
                    />
                    <div className="min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold mr-1.5">
                        #{cand.candidate_number.toString().padStart(2, '0')}
                      </span>
                      <strong className="text-xs text-slate-900 block truncate mt-0.5">
                        {cand.leader_name}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Perolehan Suara:</span>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-base text-slate-900 mr-1">
                          {cand.vote_count}
                        </span>
                        <span className="text-slate-500 text-xs">suara ({cand.vote_percentage}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${cand.vote_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monitoring Partisipasi per Kategori Pemilih */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Monitoring Tingkat Kehadiran Menurut Kategori Pemilih</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.categoryStats?.map((cat) => {
                const isGuru = cat.category === 'GURU';
                const isTu = cat.category === 'TATA_USAHA';
                const iconColor = isGuru ? 'text-purple-600' : isTu ? 'text-teal-600' : 'text-blue-600';
                const borderAccent = isGuru ? 'border-purple-200 bg-purple-50/40' : isTu ? 'border-teal-200 bg-teal-50/40' : 'border-blue-200 bg-blue-50/40';

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
                      <span>Suara: <strong className="text-slate-900 font-mono">{cat.voted}</strong> / {cat.total} DPT</span>
                      <span>Sisa: <strong className="text-amber-700 font-mono">{cat.remaining}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monitoring Partisipasi per Kelas / Rombel */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Monitoring Tingkat Kehadiran per Rombel / Unit Mapel</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.classStats.map((item) => (
                <div key={item.class_name} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 truncate mr-2">{item.class_name}</span>
                    <span className="font-mono font-bold text-slate-700 shrink-0">
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

          {/* Layanan Pengawas TPS: Reset Hak Suara Individu Pemilih Terkendala */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Layanan Pengawas TPS: Reset Hak Suara Individu</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cari pemilih yang mengalami kendala teknis di bilik suara untuk membatalkan suara keliru dan mengizinkan pemilihan ulang.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 self-start sm:self-auto">
                Berita Acara Otomatis
              </span>
            </div>

            {/* Quick Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={monitoringSearchQuery}
                onChange={(e) => setMonitoringSearchQuery(e.target.value)}
                placeholder="Ketik Nomor Induk Pemilih atau Nama Pemilih untuk mencari dan reset hak suara..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>

            {/* Quick Search Results */}
            {monitoringSearchQuery.trim() ? (() => {
              const matches = students.filter(
                (s) =>
                  s.nisn.includes(monitoringSearchQuery.trim()) ||
                  s.name.toLowerCase().includes(monitoringSearchQuery.toLowerCase())
              ).slice(0, 6);

              if (matches.length === 0) {
                return (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                    Tidak ditemukan pemilih dengan kata kunci "{monitoringSearchQuery}".
                  </p>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {matches.map((std) => {
                    const vType = std.voter_type || 'SISWA';
                    return (
                      <div
                        key={std.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          std.has_voted
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {std.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                vType === 'GURU'
                                  ? 'bg-purple-100 text-purple-700'
                                  : vType === 'TATA_USAHA'
                                  ? 'bg-teal-100 text-teal-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {vType === 'GURU' ? 'Guru' : vType === 'TATA_USAHA' ? 'TU' : 'Siswa'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {std.nisn} · {std.class_name}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                          <div>
                            {std.has_voted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Sudah Memilih ({std.voted_at ? new Date(std.voted_at).toLocaleTimeString('id-ID') : ''})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                                <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Belum Memilih</span>
                              </span>
                            )}
                          </div>

                          {std.has_voted ? (
                            <button
                              type="button"
                              onClick={() => setStudentToResetVote(std)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Voting</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleResetPin(std)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                              title="Reset PIN"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                              <span>Reset PIN</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <p className="text-[11px] text-slate-400">
                Ketik Nomor Induk Pemilih atau nama pemilih untuk mencari secara instan dan mereset status voting.
              </p>
            )}
          </div>

          {/* Audit Logs Pemilihan */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Log Transaksi & Pengawasan TPS Realtime</span>
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 mr-2">{log.action}</span>
                    <span className="text-slate-500">{log.details}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px] shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Modal Tambah / Edit Pemilih (Siswa, Guru, Staf TU) */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-base">
              {editingStudent ? 'Edit Data Pemilih (DPT)' : 'Tambah Pemilih Baru (DPT)'}
            </h4>
            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              
              <div>
                <label className="block text-slate-600 font-bold mb-1">Kategori Pemilih</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStudent({ ...newStudent, voter_type: 'SISWA' })}
                    className={`py-2 px-2 rounded-xl border text-center font-bold transition-all text-xs flex flex-col items-center gap-1 ${
                      newStudent.voter_type === 'SISWA'
                        ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Siswa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStudent({ ...newStudent, voter_type: 'GURU' })}
                    className={`py-2 px-2 rounded-xl border text-center font-bold transition-all text-xs flex flex-col items-center gap-1 ${
                      newStudent.voter_type === 'GURU'
                        ? 'bg-purple-50 border-purple-600 text-purple-700 ring-1 ring-purple-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Dewan Guru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStudent({ ...newStudent, voter_type: 'TATA_USAHA' })}
                    className={`py-2 px-2 rounded-xl border text-center font-bold transition-all text-xs flex flex-col items-center gap-1 ${
                      newStudent.voter_type === 'TATA_USAHA'
                        ? 'bg-teal-50 border-teal-600 text-teal-700 ring-1 ring-teal-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Staf TU</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  NOMOR INDUK PEMILIH
                </label>
                <input
                  type="text"
                  value={newStudent.nisn}
                  onChange={(e) => setNewStudent({ ...newStudent, nisn: e.target.value })}
                  placeholder={
                    newStudent.voter_type === 'GURU'
                      ? 'Contoh: 198506122010011002'
                      : newStudent.voter_type === 'TATA_USAHA'
                      ? 'Contoh: 199104152018022001'
                      : 'Contoh: 0061234599'
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {newStudent.voter_type === 'GURU'
                    ? 'Nama Lengkap Guru (beserta gelar)'
                    : newStudent.voter_type === 'TATA_USAHA'
                    ? 'Nama Lengkap Staf Tata Usaha'
                    : 'Nama Lengkap Siswa'}
                </label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder={
                    newStudent.voter_type === 'GURU'
                      ? 'Contoh: Dra. Hj. Siti Aminah, M.Pd.'
                      : newStudent.voter_type === 'TATA_USAHA'
                      ? 'Contoh: Bambang Irawan (Staf TU)'
                      : 'Contoh: Muhammad Rizki Pratama'
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {newStudent.voter_type === 'GURU'
                    ? 'Mata Pelajaran / Jabatan'
                    : newStudent.voter_type === 'TATA_USAHA'
                    ? 'Bagian / Unit Kerja'
                    : 'Kelas (Rombel)'}
                </label>
                <input
                  type="text"
                  value={newStudent.class_name}
                  onChange={(e) => setNewStudent({ ...newStudent, class_name: e.target.value })}
                  placeholder={
                    newStudent.voter_type === 'GURU'
                      ? 'Contoh: Guru Matematika & Wali Kelas'
                      : newStudent.voter_type === 'TATA_USAHA'
                      ? 'Contoh: Staf TU - Administrasi & IT'
                      : 'Contoh: XI-MIPA 3'
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>

              {!editingStudent && (
                <div className="p-3 rounded-lg bg-slate-50 text-[11px] text-slate-500">
                  PIN 6-digit acak akan digenerate otomatis oleh sistem begitu data disimpan.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold"
                >
                  {editingStudent ? 'Perbarui Data Pemilih' : 'Simpan Pemilih'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload Excel DPT & Template */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                    Upload & Import DPT Pemilih
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Periode {activePeriod.year_label} ({schoolConfig.organization_type} {schoolConfig.school_name})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setExcelFile(null);
                  setExcelParsedData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="Tutup dialog"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Notification Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <FileDown className="w-4 h-4 text-emerald-600" />
                  <span>Template Resmi Excel DPT</span>
                </div>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                  Unduh template format resmi dengan kolom NOMOR INDUK PEMILIH, Nama, Kelas/Jabatan, dan Kategori Pemilih.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Unduh Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-100/60 border border-emerald-300 transition-colors cursor-pointer"
                  title="Unduh format CSV"
                >
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Tab Selector: Upload Excel vs Salin Tempel Teks */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setExcelImportTab('upload')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  excelImportTab === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload File Excel (.xlsx / .xls / .csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setExcelImportTab('paste')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  excelImportTab === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Salin & Tempel Teks Manual</span>
              </button>
            </div>

            {/* TAB 1: UPLOAD FILE EXCEL */}
            {excelImportTab === 'upload' && (
              <div className="space-y-4">
                
                {/* Drag and drop upload box */}
                {!excelParsedData && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsExcelDragOver(true);
                    }}
                    onDragLeave={() => setIsExcelDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsExcelDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleExcelFileSelect(file);
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      isExcelDragOver
                        ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                        : 'border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/20'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleExcelFileSelect(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="excel-file-upload-input"
                    />

                    {isExcelParsing ? (
                      <div className="flex flex-col items-center justify-center py-4 space-y-2">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                        <p className="text-xs font-bold text-slate-700">Membaca data spreadsheet...</p>
                        <p className="text-[11px] text-slate-400">Menyusun baris pemilih siswa, guru, dan staf TU</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-emerald-600">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Pilih atau Seret File Excel ke Kotak Ini
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Mendukung format berkas <strong>.XLSX</strong>, <strong>.XLS</strong>, atau <strong>.CSV</strong>
                          </p>
                        </div>
                        <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 shadow-2xs mt-1">
                          Browse Berkas dari Komputer
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* File Parsed Preview & Statistics */}
                {excelParsedData && (
                  <div className="space-y-4">
                    
                    {/* File Info Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate max-w-xs">
                            {excelFile?.name || 'File Spreadsheet Terpilih'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Ukuran: {excelFile ? (excelFile.size / 1024).toFixed(1) + ' KB' : '-'} · {excelParsedData.rows.length} pemilih siap diimport
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setExcelFile(null);
                          setExcelParsedData(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                      >
                        Ganti File
                      </button>
                    </div>

                    {/* Category Breakdown Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                        <span className="text-[10px] font-bold text-blue-700 uppercase">Siswa</span>
                        <p className="text-base font-extrabold text-blue-900">{excelParsedData.counts.siswa}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-center">
                        <span className="text-[10px] font-bold text-purple-700 uppercase">Dewan Guru</span>
                        <p className="text-base font-extrabold text-purple-900">{excelParsedData.counts.guru}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-center">
                        <span className="text-[10px] font-bold text-teal-700 uppercase">Staf TU</span>
                        <p className="text-base font-extrabold text-teal-900">{excelParsedData.counts.tata_usaha}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Total DPT</span>
                        <p className="text-base font-extrabold text-slate-900">{excelParsedData.rows.length}</p>
                      </div>
                    </div>

                    {/* Preview Table of First 5 rows */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 border-b border-slate-200 flex justify-between items-center">
                        <span>Preview Data Pemilih (Menampilkan {Math.min(5, excelParsedData.rows.length)} dari {excelParsedData.rows.length} baris):</span>
                        <span className="text-[10px] font-normal text-slate-500">PIN akan digenerate otomatis</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">No</th>
                              <th className="py-2 px-3">NOMOR INDUK PEMILIH</th>
                              <th className="py-2 px-3">Nama Pemilih</th>
                              <th className="py-2 px-3">Kelas / Jabatan</th>
                              <th className="py-2 px-3">Kategori</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {excelParsedData.rows.slice(0, 5).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70">
                                <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-2 px-3 font-mono font-semibold text-slate-800">{row.nisn}</td>
                                <td className="py-2 px-3 text-slate-800 font-medium">{row.name}</td>
                                <td className="py-2 px-3 text-slate-600">{row.class_name}</td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      row.voter_type === 'GURU'
                                        ? 'bg-purple-100 text-purple-700'
                                        : row.voter_type === 'TATA_USAHA'
                                        ? 'bg-teal-100 text-teal-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {row.voter_type === 'GURU' ? 'Guru' : row.voter_type === 'TATA_USAHA' ? 'Staf TU' : 'Siswa'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {excelParsedData.invalidRowsCount > 0 && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        Catatan: {excelParsedData.invalidRowsCount} baris kosong/duplikat dalam file dilewati otomatis.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SALIN & TEMPEL TEKS MANUAL */}
            {excelImportTab === 'paste' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800">Format Kolom (Dipisahkan koma atau tab):</span>
                  <p className="font-mono text-[11px] text-slate-500">
                    NOMOR INDUK PEMILIH, Nama Pemilih, Kelas/Jabatan, Kategori (SISWA / GURU / TATA_USAHA)<br />
                    0061234501, Budi Santoso, X-MIPA-1, SISWA<br />
                    197808152005011003, Drs. H. Ahmad Dahlan, Guru Fisika, GURU<br />
                    198409102009022004, Endang Sulastri, Staf Administrasi, TATA_USAHA
                  </p>
                </div>

                <textarea
                  rows={6}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="0061234501, Budi Santoso, X-MIPA-1, SISWA&#10;197808152005011003, Drs. H. Ahmad Dahlan, Guru Fisika, GURU&#10;198409102009022004, Endang Sulastri, Staf TU, TATA_USAHA"
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            )}

            {/* Modal Action Buttons Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-400">
                Data dengan Nomor Induk Pemilih duplikat akan dilewati otomatis demi keamanan.
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setExcelFile(null);
                    setExcelParsedData(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                >
                  Batal
                </button>

                {excelImportTab === 'upload' ? (
                  <button
                    type="button"
                    disabled={!excelParsedData || excelParsedData.rows.length === 0}
                    onClick={handleCommitExcelImport}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      excelParsedData && excelParsedData.rows.length > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer shadow-emerald-600/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {excelParsedData && excelParsedData.rows.length > 0
                        ? `Import ${excelParsedData.rows.length} Pemilih ke DPT`
                        : 'Pilih File Excel Dahulu'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Proses Import Teks</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Calon Ketua */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-bold text-slate-900 text-base">
              {editingCandidate ? 'Edit Data Calon Ketua' : 'Tambah Calon Ketua Baru'}
            </h4>

            <form onSubmit={handleSaveCandidate} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">No Urut</label>
                  <input
                    type="number"
                    min={1}
                    value={candidateForm.candidate_number}
                    onChange={(e) => setCandidateForm({ ...candidateForm, candidate_number: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">Motto Kampanye</label>
                  <input
                    type="text"
                    value={candidateForm.motto}
                    onChange={(e) => setCandidateForm({ ...candidateForm, motto: e.target.value })}
                    placeholder="Contoh: Bersatu untuk Maju"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Nama Calon Ketua</label>
                <input
                  type="text"
                  value={candidateForm.leader_name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, leader_name: e.target.value })}
                  placeholder="Nama calon ketua"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>

              {/* Menu Upload & Pengaturan Foto Calon Ketua */}
              <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Upload Foto Calon Ketua</span>
                  </label>
                  
                  {/* Selector Mode Input Foto */}
                  <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCandidatePhotoInputTab('upload')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                        candidatePhotoInputTab === 'upload'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setCandidatePhotoInputTab('preset')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                        candidatePhotoInputTab === 'preset'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Foto Contoh
                    </button>
                    <button
                      type="button"
                      onClick={() => setCandidatePhotoInputTab('url')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                        candidatePhotoInputTab === 'url'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Input URL
                    </button>
                  </div>
                </div>

                {/* Mode 1: Drag & Drop / File Browser Upload */}
                {candidatePhotoInputTab === 'upload' && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsCandidatePhotoDragging(true);
                    }}
                    onDragLeave={() => setIsCandidatePhotoDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsCandidatePhotoDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processCandidatePhotoFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                      isCandidatePhotoDragging
                        ? 'border-emerald-500 bg-emerald-50/70'
                        : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    {isUploadingCandidatePhoto ? (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
                        <span className="text-xs font-bold text-emerald-800">Mengunggah & memproses foto calon...</span>
                        <p className="text-[10px] text-slate-500">Foto sedang dikompres dan disimpan secara permanen.</p>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          id="candidate-photo-file-input"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processCandidatePhotoFile(file);
                          }}
                        />
                        <label
                          htmlFor="candidate-photo-file-input"
                          className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            Klik untuk Pilih Foto atau Seret File ke Sini
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Mendukung format JPG, PNG, atau WebP (Otomatis dikompres)
                          </p>
                        </label>
                      </>
                    )}
                  </div>
                )}

                {/* Mode 2: Pilih Foto Preset Paslon */}
                {candidatePhotoInputTab === 'preset' && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500">Pilih dari foto contoh resmi:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {CANDIDATE_PHOTO_PRESETS.map((p, idx) => (
                        <button
                          key={p.url}
                          type="button"
                          onClick={() => {
                            setCandidateForm((prev) => ({ ...prev, photo_url: p.url }));
                            setCandidatePhotoPreview(p.url);
                          }}
                          className={`p-2 rounded-xl border text-left flex flex-col items-center gap-1.5 transition-all ${
                            candidateForm.photo_url === p.url
                              ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30'
                              : 'border-slate-200 bg-white hover:bg-slate-100'
                          }`}
                        >
                          <img
                            src={p.url}
                            alt={p.label}
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                          />
                          <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">
                            Contoh #{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode 3: Manual URL Link */}
                {candidatePhotoInputTab === 'url' && (
                  <div>
                    <input
                      type="text"
                      value={candidateForm.photo_url}
                      onChange={(e) => {
                        setCandidateForm({ ...candidateForm, photo_url: e.target.value });
                        setCandidatePhotoPreview(e.target.value);
                      }}
                      placeholder="https://... atau /src/assets/images/paslon_1_lead_1793677968157.jpg"
                      className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                )}

                {/* Error message */}
                {candidatePhotoError && (
                  <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{candidatePhotoError}</span>
                  </div>
                )}

                {/* Pratinjau Foto Calon Terpilih */}
                {candidatePhotoPreview && (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 shrink-0 bg-slate-100">
                      <img
                        src={candidatePhotoPreview}
                        alt="Pratinjau Foto Calon"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/assets/images/paslon_1_lead_1793677968157.jpg';
                        }}
                      />
                      <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-slate-900/80 text-white font-mono text-[9px] font-bold">
                        #{candidateForm.candidate_number}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                        candidatePhotoPreview.startsWith('/uploads/')
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : candidatePhotoPreview.startsWith('data:image')
                          ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                          : 'text-slate-700 bg-slate-100 border-slate-200'
                      }`}>
                        {candidatePhotoPreview.startsWith('/uploads/')
                          ? '✓ Foto Tersimpan Permanen di Server'
                          : candidatePhotoPreview.startsWith('data:image')
                          ? '✓ Foto Dipilih (Disimpan Otomatis)'
                          : 'Foto Calon Siap Digunakan'}
                      </span>
                      <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                        {candidateForm.leader_name || 'Nama Calon Ketua'}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {candidatePhotoPreview.startsWith('data:image')
                          ? 'Foto siap disinkronkan ke server'
                          : candidatePhotoPreview}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCandidateForm((prev) => ({ ...prev, photo_url: '' }));
                        setCandidatePhotoPreview('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Visi Calon Ketua</label>
                <textarea
                  rows={2}
                  value={candidateForm.vision}
                  onChange={(e) => setCandidateForm({ ...candidateForm, vision: e.target.value })}
                  placeholder="Visi utama..."
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Misi Calon Ketua (Satu baris per butir misi)</label>
                <textarea
                  rows={3}
                  value={candidateForm.mission}
                  onChange={(e) => setCandidateForm({ ...candidateForm, mission: e.target.value })}
                  placeholder="Misi 1&#10;Misi 2&#10;Misi 3"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Program Kerja Unggulan (Opsional)</label>
                <textarea
                  rows={2}
                  value={candidateForm.work_programs}
                  onChange={(e) => setCandidateForm({ ...candidateForm, work_programs: e.target.value })}
                  placeholder="Program 1&#10;Program 2"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCandidate}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {isSavingCandidate ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan Data & Foto...</span>
                    </>
                  ) : isUploadingCandidatePhoto ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengunggah Foto...</span>
                    </>
                  ) : (
                    <span>Simpan Paslon</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Hak Suara Individu Pemilih DPT */}
      <ResetIndividualVoteModal
        isOpen={!!studentToResetVote}
        student={studentToResetVote}
        candidates={candidates}
        onClose={() => setStudentToResetVote(null)}
        onConfirm={handleConfirmResetIndividualVote}
      />

      {/* In-App Confirmation Modal (Bypass blocked window.confirm in iframe) */}
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

      {/* In-App Toast Feedback (Bypass blocked window.alert in iframe) */}
      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};
