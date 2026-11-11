import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardCheck,
  Printer,
  Search,
  Filter,
  RotateCcw,
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import type { ElectionPeriod, SchoolConfig, Student, Committee } from '../types/index.ts';
import { votingStore } from '../services/storage.ts';

interface AdminTandaTerimaProps {
  activePeriod: ElectionPeriod;
  schoolConfig: SchoolConfig;
  committees?: Committee[];
}

export const AdminTandaTerima: React.FC<AdminTandaTerimaProps> = ({
  activePeriod,
  schoolConfig,
  committees = [],
}) => {
  // Reactive subscription to votingStore so data is always synchronized
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = votingStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  // Fetch current DPT students for this period
  const allStudents = useMemo(() => {
    return votingStore.getStudents(activePeriod.id);
  }, [activePeriod.id, tick]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'class_asc' | 'nisn_asc'>('class_asc');

  // Unique classes list from DPT
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach((s) => {
      if (s.class_name && s.class_name.trim()) {
        set.add(s.class_name.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents]);

  // Category counts
  const categoryStats = useMemo(() => {
    let siswa = 0;
    let guru = 0;
    let tu = 0;
    allStudents.forEach((s) => {
      if (s.voter_type === 'GURU') guru++;
      else if (s.voter_type === 'TATA_USAHA') tu++;
      else siswa++;
    });
    return {
      total: allStudents.length,
      siswa,
      guru,
      tu,
    };
  }, [allStudents]);

  // Filtered and Sorted Students
  const filteredStudents = useMemo(() => {
    return allStudents
      .filter((s) => {
        // Category filter
        if (selectedCategory !== 'ALL') {
          const type = s.voter_type || 'SISWA';
          if (type !== selectedCategory) return false;
        }

        // Class filter
        if (selectedClass !== 'ALL' && s.class_name !== selectedClass) {
          return false;
        }

        // Search query (name or nisn)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = s.name.toLowerCase().includes(q);
          const matchNisn = s.nisn.toLowerCase().includes(q);
          if (!matchName && !matchNisn) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        if (sortBy === 'nisn_asc') {
          return a.nisn.localeCompare(b.nisn, undefined, { numeric: true });
        }
        // default: class_asc then name
        const classComp = (a.class_name || '').localeCompare(b.class_name || '', undefined, { numeric: true });
        if (classComp !== 0) return classComp;
        return a.name.localeCompare(b.name);
      });
  }, [allStudents, selectedCategory, selectedClass, searchQuery, sortBy]);

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedClass('ALL');
    setSortBy('class_asc');
  };

  const formatCategoryLabel = (type?: string) => {
    if (type === 'GURU') return 'Dewan Guru';
    if (type === 'TATA_USAHA') return 'Tata Usaha / Staf';
    return 'Siswa';
  };

  const formatCategoryBadge = (type?: string) => {
    if (type === 'GURU') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Briefcase className="w-3 h-3 text-amber-600" />
          Guru
        </span>
      );
    }
    if (type === 'TATA_USAHA') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
          <UserCheck className="w-3 h-3 text-purple-600" />
          Staf TU
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
        <GraduationCap className="w-3 h-3 text-indigo-600" />
        Siswa
      </span>
    );
  };

  const ketuaPanitia = committees[0]?.name || 'Rahmat Hidayat, S.Pd.';
  const skPanitia = committees[0]?.sk_number || 'SK.045/PAN-PEMILU/2026';

  return (
    <div className="space-y-6">
      
      {/* Header Panel (Screen Only) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Format Berita Acara & Presensi TPS
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Tanda Terima Kartu Pemilih / Surat Suara
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Formulir tanda terima distribusi kartu login & fisik surat suara pemilih tetap (DPT). Dilengkapi kolom tanda tangan paraf zig-zag standar pemilu sekolah dan tersinkronisasi penuh dengan data DPT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Cetak format tanda terima atau simpan sebagai dokumen PDF resmi"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak / Ekspor PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Quick Statistics Bar (Screen Only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Users className="w-4 h-4 text-slate-600" />
            <span>Total DPT Pemilih</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono">
            {categoryStats.total} <span className="text-xs font-normal text-slate-500">Orang</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold mb-1">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Kategori Siswa</span>
          </div>
          <p className="text-xl font-extrabold text-indigo-900 font-mono">
            {categoryStats.siswa} <span className="text-xs font-normal text-slate-500">Orang</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-1">
            <Briefcase className="w-4 h-4 text-amber-600" />
            <span>Dewan Guru</span>
          </div>
          <p className="text-xl font-extrabold text-amber-900 font-mono">
            {categoryStats.guru} <span className="text-xs font-normal text-slate-500">Orang</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-purple-700 text-xs font-semibold mb-1">
            <UserCheck className="w-4 h-4 text-purple-600" />
            <span>Tata Usaha / Staf</span>
          </div>
          <p className="text-xl font-extrabold text-purple-900 font-mono">
            {categoryStats.tu} <span className="text-xs font-normal text-slate-500">Orang</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar (Screen Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 no-print">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filter Data Tanda Terima</span>
          </span>
          <span className="text-xs font-semibold text-slate-500 font-mono">
            Menampilkan {filteredStudents.length} dari {allStudents.length} Pemilih
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama / No. Induk Pemilih..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:border-indigo-500"
            >
              <option value="ALL">Semua Kategori Pemilih</option>
              <option value="SISWA">Siswa</option>
              <option value="GURU">Dewan Guru</option>
              <option value="TATA_USAHA">Tata Usaha / Staf</option>
            </select>
          </div>

          {/* Class Dropdown */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:border-indigo-500"
            >
              <option value="ALL">Semua Kelas / Rombel ({uniqueClasses.length})</option>
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
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:border-indigo-500"
            >
              <option value="class_asc">Urut: Kelas, lalu Nama A-Z</option>
              <option value="name_asc">Urut: Nama Pemilih (A-Z)</option>
              <option value="name_desc">Urut: Nama Pemilih (Z-A)</option>
              <option value="nisn_asc">Urut: Nomor Induk Pemilih</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary & Reset */}
        {(searchQuery || selectedCategory !== 'ALL' || selectedClass !== 'ALL' || sortBy !== 'class_asc') && (
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-indigo-600 font-semibold">
              Filter aktif: {selectedCategory !== 'ALL' ? formatCategoryLabel(selectedCategory) : ''}{' '}
              {selectedClass !== 'ALL' ? `• Kelas ${selectedClass}` : ''}{' '}
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

      {/* Screen Interactive Table View (Screen Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs no-print">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
              Pratinjau Tabel Tanda Terima ({filteredStudents.length} Data)
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Kolom Tanda Tangan siap cetak format A4
          </span>
        </div>

        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200 text-[11px] sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3 w-14 text-center">Nomor</th>
                <th className="py-3 px-4">Nama Pemilih</th>
                <th className="py-3 px-3 w-36">Kategori Pemilih</th>
                <th className="py-3 px-4 w-40">Kelas</th>
                <th className="py-3 px-4 w-56 text-center">Tanda Tangan / Paraf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada data pemilih yang sesuai dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const rowNumber = idx + 1;
                  const isOdd = rowNumber % 2 !== 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {rowNumber}
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
                        {formatCategoryBadge(student.voter_type)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {student.class_name || '-'}
                      </td>
                      <td className="py-2.5 px-4">
                        {/* Zigzag signature cell indicator */}
                        <div
                          className={`w-full py-2 px-3 border border-dashed border-slate-300 rounded-lg bg-slate-50/50 text-[11px] font-mono text-slate-400 flex items-center ${
                            isOdd ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <span>{rowNumber}. ..........................</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Menampilkan {filteredStudents.length} data pemilih terdaftar</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 font-bold text-slate-800 hover:text-indigo-600 cursor-pointer"
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
            DAFTAR TANDA TERIMA KARTU PEMILIH & SURAT SUARA
          </h4>
          <p className="text-xs text-slate-600 font-mono">
            PEMILIHAN KETUA {schoolConfig.organization_type} DIGITAL MASA BAKTI {activePeriod.year_label}
          </p>
        </div>

        {/* Filter Metadata Box for Document Accuracy */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 border border-slate-300 bg-slate-50/70 p-2.5 rounded-lg font-medium">
          <div>
            <span>Kategori: <strong>{selectedCategory !== 'ALL' ? formatCategoryLabel(selectedCategory) : 'Semua Kategori (Siswa & Guru/Staf)'}</strong></span>
            <span className="mx-2">•</span>
            <span>Kelas / Unit: <strong>{selectedClass !== 'ALL' ? selectedClass : 'Semua Rombel'}</strong></span>
          </div>
          <div>
            <span>Total Penerima: <strong>{filteredStudents.length} Orang</strong></span>
            <span className="mx-2">•</span>
            <span>Tanggal: <strong>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
          </div>
        </div>

        {/* Official Printable Table with Zig-Zag Signatures */}
        <div className="w-full">
          <table className="w-full text-left text-xs border-collapse border border-slate-900">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 text-[11px] font-bold text-slate-900">
                <th className="p-2 border border-slate-900 text-center w-12">Nomor</th>
                <th className="p-2 border border-slate-900">Nama Pemilih</th>
                <th className="p-2 border border-slate-900 w-32 text-center">Kategori Pemilih</th>
                <th className="p-2 border border-slate-900 w-28 text-center">Kelas</th>
                <th className="p-2 border border-slate-900 w-48 text-center" colSpan={2}>
                  Tanda Tangan
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 border border-slate-900">
                    Tidak ada data pemilih.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const rowNumber = idx + 1;
                  const isOdd = rowNumber % 2 !== 0;

                  return (
                    <tr key={student.id} className="border-b border-slate-900">
                      <td className="p-2 border border-slate-900 text-center font-mono font-bold">
                        {rowNumber}
                      </td>
                      <td className="p-2 border border-slate-900">
                        <span className="font-bold text-slate-900 block">
                          {student.name}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          Nomor Induk: {student.nisn}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-900 text-center font-medium">
                        {formatCategoryLabel(student.voter_type)}
                      </td>
                      <td className="p-2 border border-slate-900 text-center font-semibold">
                        {student.class_name || '-'}
                      </td>
                      
                      {/* Signature Column (Left for Odd numbers) */}
                      <td className="p-2 border border-slate-900 w-24 text-left font-mono text-[10px] align-bottom h-10">
                        {isOdd ? (
                          <div className="flex items-end gap-1 h-full">
                            <span className="font-bold">{rowNumber}.</span>
                            <span className="border-b border-dotted border-slate-500 w-full inline-block pb-1" />
                          </div>
                        ) : null}
                      </td>

                      {/* Signature Column (Right for Even numbers) */}
                      <td className="p-2 border border-slate-900 w-24 text-left font-mono text-[10px] align-bottom h-10">
                        {!isOdd ? (
                          <div className="flex items-end gap-1 h-full">
                            <span className="font-bold">{rowNumber}.</span>
                            <span className="border-b border-dotted border-slate-500 w-full inline-block pb-1" />
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Verification Block */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center text-slate-800 break-inside-avoid">
          <div className="space-y-16">
            <div>
              <p>Petugas Distribusi TPS,</p>
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
