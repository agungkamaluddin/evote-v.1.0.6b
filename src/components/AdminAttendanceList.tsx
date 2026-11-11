import React, { useState, useMemo, useEffect } from 'react';
import {
  UserCheck,
  Printer,
  Search,
  Filter,
  RotateCcw,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  GraduationCap,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { ElectionPeriod, SchoolConfig, Committee } from '../types/index.ts';
import { votingStore } from '../services/storage.ts';

interface AdminAttendanceListProps {
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
  committees?: Committee[];
}

export const AdminAttendanceList: React.FC<AdminAttendanceListProps> = ({
  activePeriod,
  schoolConfig,
  committees = [],
}) => {
  // Reactive subscription to storage so voting events in real-time immediately update attendance
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = votingStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const allStudents = useMemo(() => {
    return votingStore.getStudents(activePeriod.id);
  }, [activePeriod.id, tick]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'VOTED' | 'NOT_VOTED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'recent_voted' | 'name_asc' | 'name_desc' | 'class_asc' | 'nisn_asc'>('recent_voted');

  // Extract unique classes
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach((s) => {
      if (s.class_name && s.class_name.trim()) {
        set.add(s.class_name.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents]);

  // Attendance metrics
  const stats = useMemo(() => {
    const total = allStudents.length;
    const voted = allStudents.filter((s) => s.has_voted).length;
    const remaining = total - voted;
    const percentage = total > 0 ? ((voted / total) * 100).toFixed(1) : '0';

    let siswaTotal = 0;
    let siswaVoted = 0;
    let guruTotal = 0;
    let guruVoted = 0;
    let tuTotal = 0;
    let tuVoted = 0;

    allStudents.forEach((s) => {
      if (s.voter_type === 'GURU') {
        guruTotal++;
        if (s.has_voted) guruVoted++;
      } else if (s.voter_type === 'TATA_USAHA') {
        tuTotal++;
        if (s.has_voted) tuVoted++;
      } else {
        siswaTotal++;
        if (s.has_voted) siswaVoted++;
      }
    });

    return {
      total,
      voted,
      remaining,
      percentage,
      siswaTotal,
      siswaVoted,
      guruTotal,
      guruVoted,
      tuTotal,
      tuVoted,
    };
  }, [allStudents]);

  // Filtered attendance list
  const filteredStudents = useMemo(() => {
    return allStudents
      .filter((s) => {
        // Attendance status filter
        if (attendanceFilter === 'VOTED' && !s.has_voted) return false;
        if (attendanceFilter === 'NOT_VOTED' && s.has_voted) return false;

        // Category filter
        if (categoryFilter !== 'ALL') {
          const type = s.voter_type || 'SISWA';
          if (type !== categoryFilter) return false;
        }

        // Class filter
        if (classFilter !== 'ALL' && s.class_name !== classFilter) return false;

        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = s.name.toLowerCase().includes(q);
          const matchNisn = s.nisn.toLowerCase().includes(q);
          if (!matchName && !matchNisn) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent_voted') {
          // Voted first, newest timestamp first
          if (a.has_voted && !b.has_voted) return -1;
          if (!a.has_voted && b.has_voted) return 1;
          if (a.has_voted && b.has_voted && a.voted_at && b.voted_at) {
            return new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime();
          }
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        if (sortBy === 'nisn_asc') return a.nisn.localeCompare(b.nisn, undefined, { numeric: true });
        
        // default: class_asc
        const classComp = (a.class_name || '').localeCompare(b.class_name || '', undefined, { numeric: true });
        if (classComp !== 0) return classComp;
        return a.name.localeCompare(b.name);
      });
  }, [allStudents, attendanceFilter, categoryFilter, classFilter, searchQuery, sortBy]);

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setAttendanceFilter('ALL');
    setCategoryFilter('ALL');
    setClassFilter('ALL');
    setSortBy('recent_voted');
  };

  const formatCategoryLabel = (type?: string) => {
    if (type === 'GURU') return 'Dewan Guru';
    if (type === 'TATA_USAHA') return 'Tata Usaha / Staf';
    return 'Siswa';
  };

  const ketuaPanitia = committees[0]?.name || 'Rahmat Hidayat, S.Pd.';
  const skPanitia = committees[0]?.sk_number || 'SK.045/PAN-PEMILU/2026';

  return (
    <div className="space-y-6">
      
      {/* Header Panel (Screen Only) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Presensi & Log Kehadiran Real-Time DPT
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Daftar Kehadiran Pemilih (Presensi E-Voting)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Data kehadiran pemilih terintegrasi otomatis dengan bilik suara digital. Setiap suara yang dicoblos langsung tercatat waktu hadirnya tanpa perlu reload, dan siap diekspor menjadi format PDF resmi A4.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Cetak daftar kehadiran atau simpan sebagai dokumen PDF resmi"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak / Ekspor PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Real-time Statistics Cards (Screen Only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-600" />
              Total DPT
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {stats.total} <span className="text-xs font-normal text-slate-500">Pemilih</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Siswa: {stats.siswaTotal} • Guru: {stats.guruTotal} • TU: {stats.tuTotal}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-emerald-700 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Hadir / Memilih
            </span>
            <span className="text-xs font-extrabold text-emerald-700 font-mono bg-emerald-100 px-2 py-0.5 rounded-full">
              {stats.percentage}%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 font-mono">
            {stats.voted} <span className="text-xs font-normal text-slate-500">Suara</span>
          </p>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, parseFloat(stats.percentage)))}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-amber-700 text-xs font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Belum Hadir
            </span>
          </div>
          <p className="text-2xl font-extrabold text-amber-900 font-mono">
            {stats.remaining} <span className="text-xs font-normal text-slate-500">Orang</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Sisa {(100 - parseFloat(stats.percentage)).toFixed(1)}% Hak Suara
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-indigo-700 text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Partisipasi Guru & TU
            </span>
          </div>
          <p className="text-base font-extrabold text-indigo-900 font-mono">
            Guru: {stats.guruVoted}/{stats.guruTotal}{' '}
            <span className="text-xs text-slate-400">({stats.guruTotal > 0 ? Math.round((stats.guruVoted / stats.guruTotal) * 100) : 0}%)</span>
          </p>
          <p className="text-xs font-semibold text-slate-600 mt-1 font-mono">
            TU: {stats.tuVoted}/{stats.tuTotal}{' '}
            <span className="text-xs text-slate-400">({stats.tuTotal > 0 ? Math.round((stats.tuVoted / stats.tuTotal) * 100) : 0}%)</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar (Screen Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 no-print">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Filter Presensi Pemilih</span>
          </span>
          <span className="text-xs font-semibold text-slate-500 font-mono">
            Menampilkan {filteredStudents.length} dari {allStudents.length} Pemilih
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative lg:col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama / No. Induk..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as any)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 focus:border-emerald-500"
            >
              <option value="ALL">Semua Status Hadir</option>
              <option value="VOTED">Hadir (Sudah Memilih)</option>
              <option value="NOT_VOTED">Belum Hadir (Belum Memilih)</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:border-emerald-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="SISWA">Siswa</option>
              <option value="GURU">Dewan Guru</option>
              <option value="TATA_USAHA">Tata Usaha / Staf</option>
            </select>
          </div>

          {/* Class Dropdown */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:border-emerald-500"
            >
              <option value="ALL">Semua Kelas ({uniqueClasses.length})</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:border-emerald-500"
            >
              <option value="recent_voted">Urut: Kehadiran Terbaru</option>
              <option value="name_asc">Urut: Nama (A-Z)</option>
              <option value="name_desc">Urut: Nama (Z-A)</option>
              <option value="class_asc">Urut: Kelas / Rombel</option>
              <option value="nisn_asc">Urut: Nomor Induk</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary & Reset */}
        {(searchQuery || attendanceFilter !== 'ALL' || categoryFilter !== 'ALL' || classFilter !== 'ALL' || sortBy !== 'recent_voted') && (
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-emerald-700 font-semibold">
              Filter aktif: {attendanceFilter === 'VOTED' ? 'Hadir / Sudah Memilih' : attendanceFilter === 'NOT_VOTED' ? 'Belum Hadir' : 'Semua Status'}{' '}
              {categoryFilter !== 'ALL' ? `• ${formatCategoryLabel(categoryFilter)}` : ''}{' '}
              {classFilter !== 'ALL' ? `• Kelas ${classFilter}` : ''}{' '}
              {searchQuery ? `• Kata Kunci "${searchQuery}"` : ''}
            </span>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Screen Table View (Screen Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs no-print">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              Daftar Presensi ({filteredStudents.length} Data)
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-700 font-bold">
            {filteredStudents.filter((s) => s.has_voted).length} Hadir • {filteredStudents.filter((s) => !s.has_voted).length} Belum
          </span>
        </div>

        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200 text-[11px] sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3 w-14 text-center">Nomor</th>
                <th className="py-3 px-4">Nama Pemilih & No. Induk</th>
                <th className="py-3 px-3 w-32">Kategori</th>
                <th className="py-3 px-4 w-36">Kelas / Unit</th>
                <th className="py-3 px-4 w-44 text-center">Status Kehadiran</th>
                <th className="py-3 px-4 w-48 text-right">Waktu Presensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada pemilih yang sesuai kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block text-xs">
                        {student.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Nomor Induk: {student.nisn}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700">
                        {formatCategoryLabel(student.voter_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {student.class_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.has_voted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Hadir (Sudah Memilih)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Belum Hadir
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px]">
                      {student.has_voted && student.voted_at ? (
                        <div className="text-slate-800">
                          <span className="font-bold text-emerald-700">
                            {new Date(student.voted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {new Date(student.voted_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Total {filteredStudents.length} data presensi pemilih ditampilkan</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 font-bold text-slate-800 hover:text-emerald-700 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Klik di sini untuk langsung mencetak dokumen A4</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* OFFICIAL A4 PRINTABLE DOCUMENT (Visible on Print or Paper View) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-8 sm:p-12 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:m-0">
        
        {/* Header KOP Resmi Sekolah */}
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
            <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-900">
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

        {/* Title of Document */}
        <div className="text-center space-y-1 py-1">
          <h4 className="font-black text-sm sm:text-base uppercase underline text-slate-900 tracking-tight">
            DAFTAR KEHADIRAN PEMILIH TETAP (PRESENSI E-VOTING)
          </h4>
          <p className="text-xs text-slate-600 font-mono">
            PEMILIHAN KETUA {schoolConfig.organization_type} DIGITAL MASA BAKTI {activePeriod.year_label}
          </p>
        </div>

        {/* Summary Filter Metadata for Print */}
        <div className="grid grid-cols-2 gap-2 text-xs border border-slate-300 bg-slate-50/70 p-3 rounded-lg text-slate-800 font-medium">
          <div>
            <p>Kategori: <strong>{categoryFilter !== 'ALL' ? formatCategoryLabel(categoryFilter) : 'Semua Kategori (Siswa & Guru/Staf)'}</strong></p>
            <p>Kelas / Unit: <strong>{classFilter !== 'ALL' ? classFilter : 'Semua Rombel'}</strong></p>
            <p>Status: <strong>{attendanceFilter === 'VOTED' ? 'Hadir Saja' : attendanceFilter === 'NOT_VOTED' ? 'Belum Hadir Saja' : 'Semua Status'}</strong></p>
          </div>
          <div className="text-right">
            <p>Total DPT Filter: <strong>{filteredStudents.length} Orang</strong></p>
            <p>Hadir / Memilih: <strong className="text-emerald-800">{filteredStudents.filter((s) => s.has_voted).length} Orang ({filteredStudents.length > 0 ? Math.round((filteredStudents.filter((s) => s.has_voted).length / filteredStudents.length) * 100) : 0}%)</strong></p>
            <p>Waktu Cetak: <strong>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} pk. {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</strong></p>
          </div>
        </div>

        {/* Official Printable Table */}
        <div className="w-full">
          <table className="w-full text-left text-xs border-collapse border border-slate-900">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 text-[11px] font-bold text-slate-900">
                <th className="p-2 border border-slate-900 text-center w-12">No.</th>
                <th className="p-2 border border-slate-900 w-32">Nomor Induk</th>
                <th className="p-2 border border-slate-900">Nama Lengkap Pemilih</th>
                <th className="p-2 border border-slate-900 w-28 text-center">Kategori</th>
                <th className="p-2 border border-slate-900 w-24 text-center">Kelas</th>
                <th className="p-2 border border-slate-900 w-28 text-center">Status</th>
                <th className="p-2 border border-slate-900 w-36 text-center">Tanda Tangan / Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 border border-slate-900">
                    Tidak ada data pemilih.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="border-b border-slate-900">
                    <td className="p-2 border border-slate-900 text-center font-mono font-bold">
                      {idx + 1}
                    </td>
                    <td className="p-2 border border-slate-900 font-mono text-[11px]">
                      {student.nisn}
                    </td>
                    <td className="p-2 border border-slate-900 font-bold text-slate-900">
                      {student.name}
                    </td>
                    <td className="p-2 border border-slate-900 text-center font-medium">
                      {formatCategoryLabel(student.voter_type)}
                    </td>
                    <td className="p-2 border border-slate-900 text-center font-semibold">
                      {student.class_name || '-'}
                    </td>
                    <td className="p-2 border border-slate-900 text-center">
                      {student.has_voted ? (
                        <span className="font-bold text-emerald-800">
                          HADIR
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">
                          Belum Hadir
                        </span>
                      )}
                    </td>
                    <td className="p-2 border border-slate-900 text-center font-mono text-[10px]">
                      {student.has_voted ? (
                        <div>
                          <span className="font-bold text-slate-900 block">[ TERVERIFIKASI ]</span>
                          <span className="text-slate-600 block text-[9px]">
                            {student.voted_at ? new Date(student.voted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="border-b border-dotted border-slate-400 w-20 inline-block h-4" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Verification Block */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center text-slate-800 break-inside-avoid">
          <div className="space-y-16">
            <div>
              <p>Ketua Panitia Pemilihan,</p>
            </div>
            <div>
              <p className="font-bold underline">{ketuaPanitia}</p>
              <p className="text-[11px] text-slate-500">{skPanitia}</p>
            </div>
          </div>

          <div className="space-y-16">
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
  );
};
