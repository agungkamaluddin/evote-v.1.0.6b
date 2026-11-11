import * as XLSX from 'xlsx';
import { VoterCategory } from '../types';

export interface ParsedDptRow {
  nisn: string;
  name: string;
  class_name: string;
  voter_type: VoterCategory;
  rowNumber: number;
}

export interface ParseExcelResult {
  success: boolean;
  message?: string;
  rows: ParsedDptRow[];
  totalRowsFound: number;
  invalidRowsCount: number;
  counts: {
    siswa: number;
    guru: number;
    tata_usaha: number;
  };
}

/**
 * Downloads a standardized Excel (.xlsx) template for DPT election imports.
 */
export function downloadDptExcelTemplate(orgType: string = 'OSIS', schoolName: string = 'SMA / SMK / MA'): void {
  // 1. Data Sheet
  const header = ['NOMOR_INDUK_PEMILIH', 'NAMA_LENGKAP', 'KELAS_JABATAN', 'KATEGORI_PEMILIH'];
  const sampleData = [
    header,
    ['0061234501', 'Ahmad Rizky Pratama', 'X-MIPA-1', 'SISWA'],
    ['0061234502', 'Bunga Citra Lestari', 'X-MIPA-1', 'SISWA'],
    ['0058765403', 'Dimas Arya Pamungkas', 'XI-IPS-2', 'SISWA'],
    ['0058765404', 'Fadhilah Nurul Aini', 'XI-IPS-2', 'SISWA'],
    ['0049876505', 'Gilang Ramadhan', 'XII-Bahasa', 'SISWA'],
    ['0049876506', 'Hafiz Maulana', 'XII-MIPA-3', 'SISWA'],
    ['197808152005011003', 'Drs. H. Ahmad Dahlan, M.Pd', 'Guru Pembina & Fisika', 'GURU'],
    ['198504222010012008', 'Siti Fatimah, S.Pd', 'Guru Matematika', 'GURU'],
    ['198907122014021004', 'Rahmat Hidayat, S.Kom', 'Staf IT & Lab Komputer', 'TATA_USAHA'],
    ['199103252019032011', 'Dewi Sartika, S.E', 'Staf Administrasi TU', 'TATA_USAHA'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 22 }, // NISN_NIP
    { wch: 32 }, // NAMA_LENGKAP
    { wch: 25 }, // KELAS_JABATAN
    { wch: 18 }, // KATEGORI_PEMILIH
  ];

  // 2. Guide / Instructions Sheet
  const guideData = [
    ['PETUNJUK PENGISIAN TEMPLATE EXCEL DPT ' + orgType.toUpperCase()],
    ['Lembaga / Sekolah:', schoolName],
    [''],
    ['KOLOM', 'KEBUTUHAN', 'CONTOH NILAI', 'KETERANGAN'],
    [
      'NOMOR_INDUK_PEMILIH',
      'Wajib Diisi (Unik)',
      '0061234501 atau 198506122010011002',
      'Nomor Induk Siswa Nasional untuk siswa, atau NIP/NUPTK/ID Pegawai untuk Guru dan Staf TU. Digunakan sebagai Username login bilik suara.',
    ],
    [
      'NAMA_LENGKAP',
      'Wajib Diisi',
      'Ahmad Rizky Pratama',
      'Nama lengkap pemilih yang tertera pada kartu suara dan berita acara.',
    ],
    [
      'KELAS_JABATAN',
      'Wajib Diisi',
      'X-MIPA-1 atau Guru Fisika',
      'Rombel kelas siswa (misal: X-A, XI-RPL, XII-IPA) atau jabatan untuk guru/pegawai.',
    ],
    [
      'KATEGORI_PEMILIH',
      'Wajib (Pilih 1)',
      'SISWA / GURU / TATA_USAHA',
      'Isi dengan salah satu: SISWA (default), GURU, atau TATA_USAHA.',
    ],
    [''],
    ['CATATAN KEAMANAN & KREDENSIAL:'],
    ['1. PIN 6-digit rahasia pemilih akan digenerate otomatis secara acak & terenkripsi oleh sistem saat proses import.'],
    ['2. Data dengan Nomor Induk Pemilih yang sudah terdaftar pada periode ini akan dilewati otomatis untuk mencegah data ganda.'],
    ['3. Simpan file sebagai format .xlsx, .xls, atau .csv lalu upload pada menu "Upload Excel DPT".'],
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [
    { wch: 20 },
    { wch: 18 },
    { wch: 35 },
    { wch: 60 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data_DPT');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk_Pengisian');

  // Trigger download
  const fileName = `Template_DPT_${orgType}_${new Date().getFullYear()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Downloads a simple CSV template for quick editing in Notepad or Google Sheets.
 */
export function downloadDptCsvTemplate(): void {
  const csvContent =
    'NOMOR_INDUK_PEMILIH,NAMA_LENGKAP,KELAS_JABATAN,KATEGORI_PEMILIH\n' +
    '0061234501,Ahmad Rizky Pratama,X-MIPA-1,SISWA\n' +
    '0061234502,Bunga Citra Lestari,X-MIPA-1,SISWA\n' +
    '0058765403,Dimas Arya Pamungkas,XI-IPS-2,SISWA\n' +
    '197808152005011003,Drs. H. Ahmad Dahlan M.Pd,Guru Fisika,GURU\n' +
    '198907122014021004,Rahmat Hidayat S.Kom,Staf Tata Usaha,TATA_USAHA\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Template_DPT_Pemilu.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file.
 */
export async function parseDptExcelFile(file: File): Promise<ParseExcelResult> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        message: 'File spreadsheet kosong atau tidak memiliki lembar kerja (worksheet).',
        rows: [],
        totalRowsFound: 0,
        invalidRowsCount: 0,
        counts: { siswa: 0, guru: 0, tata_usaha: 0 },
      };
    }

    // Pick first sheet or sheet containing 'DPT' or 'Data'
    const targetSheetName =
      workbook.SheetNames.find((name) => name.toLowerCase().includes('dpt') || name.toLowerCase().includes('data')) ||
      workbook.SheetNames[0];

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      return {
        success: false,
        message: 'Lembar kerja tidak dapat dibaca.',
        rows: [],
        totalRowsFound: 0,
        invalidRowsCount: 0,
        counts: { siswa: 0, guru: 0, tata_usaha: 0 },
      };
    }

    // Convert sheet to array of rows (2D array)
    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    if (rawRows.length === 0) {
      return {
        success: false,
        message: 'Tidak ada data ditemukan di dalam lembar kerja.',
        rows: [],
        totalRowsFound: 0,
        invalidRowsCount: 0,
        counts: { siswa: 0, guru: 0, tata_usaha: 0 },
      };
    }

    // Detect header row index
    let headerRowIdx = -1;
    let colIndices = { nisn: 0, name: 1, class_name: 2, category: 3 };

    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      const rowStr = row.map((cell) => String(cell || '').toLowerCase().trim());
      const hasNisn = rowStr.some((c) => c.includes('nisn') || c.includes('nip') || c.includes('induk') || c.includes('no_induk') || c.includes('username'));
      const hasName = rowStr.some((c) => c.includes('nama') || c.includes('name'));

      if (hasNisn || hasName) {
        headerRowIdx = r;
        // Map column indices
        rowStr.forEach((c, idx) => {
          if (c.includes('nisn') || c.includes('nip') || c.includes('induk') || c.includes('no_induk') || c.includes('username')) {
            colIndices.nisn = idx;
          } else if (c.includes('nama') || c.includes('name')) {
            colIndices.name = idx;
          } else if (c.includes('kelas') || c.includes('jabatan') || c.includes('rombel') || c.includes('unit') || c.includes('class')) {
            colIndices.class_name = idx;
          } else if (c.includes('kategori') || c.includes('tipe') || c.includes('role') || c.includes('peran') || c.includes('category')) {
            colIndices.category = idx;
          }
        });
        break;
      }
    }

    const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
    const validRows: ParsedDptRow[] = [];
    let invalidCount = 0;
    let counts = { siswa: 0, guru: 0, tata_usaha: 0 };
    const seenNisns = new Set<string>();

    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawNisn = String(row[colIndices.nisn] ?? '').trim();
      const rawName = String(row[colIndices.name] ?? '').trim();
      const rawClass = String(row[colIndices.class_name] ?? '').trim();
      const rawCategory = String(row[colIndices.category] ?? '').trim().toUpperCase();

      // Skip completely empty rows
      if (!rawNisn && !rawName && !rawClass) {
        continue;
      }

      // Check minimum required fields
      if (!rawNisn || !rawName) {
        invalidCount++;
        continue;
      }

      // Skip internal duplicates within the same file
      if (seenNisns.has(rawNisn)) {
        invalidCount++;
        continue;
      }
      seenNisns.add(rawNisn);

      // Determine category
      let voterType: VoterCategory = 'SISWA';
      if (rawCategory.includes('GURU')) {
        voterType = 'GURU';
        counts.guru++;
      } else if (rawCategory.includes('TU') || rawCategory.includes('TATA') || rawCategory.includes('STAF') || rawCategory.includes('PEGAWAI')) {
        voterType = 'TATA_USAHA';
        counts.tata_usaha++;
      } else {
        voterType = 'SISWA';
        counts.siswa++;
      }

      validRows.push({
        nisn: rawNisn,
        name: rawName,
        class_name: rawClass || (voterType === 'GURU' ? 'Dewan Guru' : voterType === 'TATA_USAHA' ? 'Staf TU' : 'Umum'),
        voter_type: voterType,
        rowNumber: r + 1,
      });
    }

    if (validRows.length === 0) {
      return {
        success: false,
        message: 'Tidak ada baris data pemilih yang valid ditemukan dalam file. Pastikan minimal kolom NISN/NIP dan Nama terisi.',
        rows: [],
        totalRowsFound: 0,
        invalidRowsCount: invalidCount,
        counts,
      };
    }

    return {
      success: true,
      rows: validRows,
      totalRowsFound: validRows.length + invalidCount,
      invalidRowsCount: invalidCount,
      counts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal memproses file Excel: ' + (err?.message || 'Format berkas tidak valid.'),
      rows: [],
      totalRowsFound: 0,
      invalidRowsCount: 0,
      counts: { siswa: 0, guru: 0, tata_usaha: 0 },
    };
  }
}
