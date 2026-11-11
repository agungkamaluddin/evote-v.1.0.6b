import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  INITIAL_SCHOOL_CONFIG,
  INITIAL_PERIODS,
  INITIAL_CANDIDATES,
  ARCHIVED_CANDIDATES,
  INITIAL_STUDENTS,
  INITIAL_VOTES,
  INITIAL_COMMITTEES,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS,
} from './src/data/mockData.ts';
import type {
  ElectionPeriod,
  Candidate,
  Student,
  Vote,
  Committee,
  SchoolConfig,
  AuditLog,
  UserAccount,
  VotingSessionStatus,
  VoterCategory,
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure data and public directories exist
const DATA_DIR = path.resolve(__dirname, 'data');
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOADS_DIR = path.resolve(PUBLIC_DIR, 'uploads');
const ASSETS_IMAGES_DIR = path.resolve(PUBLIC_DIR, 'assets/images');
const SRC_IMAGES_DIR = path.resolve(__dirname, 'src/assets/images');
const STORE_FILE = path.resolve(DATA_DIR, 'election_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(ASSETS_IMAGES_DIR)) {
  fs.mkdirSync(ASSETS_IMAGES_DIR, { recursive: true });
}

// Copy source images to public/assets/images if not already copied
try {
  if (fs.existsSync(SRC_IMAGES_DIR)) {
    const files = fs.readdirSync(SRC_IMAGES_DIR);
    for (const f of files) {
      const srcPath = path.resolve(SRC_IMAGES_DIR, f);
      const destPath = path.resolve(ASSETS_IMAGES_DIR, f);
      if (!fs.existsSync(destPath) && fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
} catch (e) {
  console.warn('Notice: Image asset sync error:', e);
}

// Store schema interface
interface CentralStoreState {
  school_config: SchoolConfig;
  periods: ElectionPeriod[];
  candidates: Candidate[];
  students: Student[];
  votes: Vote[];
  committees: Committee[];
  audit_logs: AuditLog[];
  users: UserAccount[];
  version: number;
  last_updated: string;
}

function getInitialStore(): CentralStoreState {
  return {
    school_config: { ...INITIAL_SCHOOL_CONFIG },
    periods: [...INITIAL_PERIODS],
    candidates: [...INITIAL_CANDIDATES, ...ARCHIVED_CANDIDATES],
    students: [...INITIAL_STUDENTS],
    votes: [...INITIAL_VOTES],
    committees: [...INITIAL_COMMITTEES],
    audit_logs: [...INITIAL_AUDIT_LOGS],
    users: [...INITIAL_USERS],
    version: 1,
    last_updated: new Date().toISOString(),
  };
}

// Read database from file
function readStore(): CentralStoreState {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.school_config && Array.isArray(parsed.periods)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading store file, falling back to initial seed:', err);
  }
  const initial = getInitialStore();
  writeStore(initial);
  return initial;
}

// Write database to file atomically
function writeStore(state: CentralStoreState): void {
  try {
    state.last_updated = new Date().toISOString();
    const tempFile = `${STORE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORE_FILE);
  } catch (err) {
    console.error('Error writing to store file:', err);
  }
}

// Helper to safely write base64 image into permanent server uploads
function saveBase64Image(dataUrl: string, prefix = 'asset'): string {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
  if (!dataUrl.startsWith('data:image/')) return dataUrl;

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);(?:charset=[^;]+;)?base64,([\s\S]+)$/i);
    if (!matches) return dataUrl;

    const rawExt = matches[1].toLowerCase();
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
    const base64Data = matches[2].replace(/\s/g, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (!fs.existsSync(UPLOADS_DIR)) {
      try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) {}
    }

    const cleanName = prefix.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const savedFileName = `${cleanName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const filePath = path.resolve(UPLOADS_DIR, savedFileName);
    fs.writeFileSync(filePath, buffer);

    // Also mirror to dist/uploads if dist exists (so production serve never misses it)
    const distUploads = path.resolve(__dirname, 'dist/uploads');
    if (!fs.existsSync(distUploads)) {
      try { fs.mkdirSync(distUploads, { recursive: true }); } catch (e) {}
    }
    if (fs.existsSync(distUploads)) {
      try { fs.writeFileSync(path.resolve(distUploads, savedFileName), buffer); } catch (e) {}
    }

    return `/uploads/${savedFileName}`;
  } catch (err) {
    console.warn('Error saving base64 image permanently:', err);
    return dataUrl;
  }
}

// Initialize on server boot
let store = readStore();

// App setup
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static asset serving:
// Ensure both /assets/images/... and /src/assets/images/... and /uploads/... are served reliably
const DIST_UPLOADS_DIR = path.resolve(__dirname, 'dist/uploads');
if (!fs.existsSync(DIST_UPLOADS_DIR)) {
  try { fs.mkdirSync(DIST_UPLOADS_DIR, { recursive: true }); } catch (e) {}
}
app.use('/assets/images', express.static(ASSETS_IMAGES_DIR));
app.use('/src/assets/images', express.static(ASSETS_IMAGES_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/uploads', express.static(DIST_UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

// Helper to log audit event
function appendAuditLog(action: string, details: string, actor: string) {
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    actor,
  };
  store.audit_logs = [newLog, ...(store.audit_logs || []).slice(0, 49)];
}

// ================= API ENDPOINTS =================

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  store = readStore();
  res.json({
    status: 'ok',
    version: store.version,
    last_updated: store.last_updated,
    totalStudents: store.students.length,
    totalVotes: store.votes.length,
    school: store.school_config.school_name,
  });
});

// 2. Fetch full centralized election data (always fresh from disk)
app.get('/api/voting-data', (req: Request, res: Response) => {
  store = readStore();
  res.json({
    success: true,
    version: store.version,
    last_updated: store.last_updated,
    data: store,
  });
});

// 3. Image & asset upload endpoint (saves file to /uploads/ and returns permanent URL)
app.post('/api/upload-asset', (req: Request, res: Response) => {
  try {
    const { dataUrl, filename } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ success: false, message: 'Data URL gambar tidak valid.' });
      return;
    }

    if (!dataUrl.startsWith('data:image/')) {
      if (dataUrl.startsWith('/') || dataUrl.startsWith('http')) {
        res.json({ success: true, url: dataUrl });
        return;
      }
      res.status(400).json({ success: false, message: 'Format gambar tidak valid.' });
      return;
    }

    const publicUrl = saveBase64Image(dataUrl, filename || 'asset');
    res.json({
      success: true,
      url: publicUrl,
    });
  } catch (err: any) {
    console.error('Error uploading asset:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan file asset: ' + err.message });
  }
});

// 4. Synchronize data from client to central store (merges only provided fields & preserves assets)
app.post('/api/voting-data/sync', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ success: false, message: 'Payload tidak valid.' });
      return;
    }

    // Refresh store from disk before merging
    store = readStore();
    let changed = false;

    if (updates.school_config) {
      const config = { ...updates.school_config };
      // Permanently write base64 logo if submitted
      if (config.logo_url && config.logo_url.startsWith('data:image/')) {
        config.logo_url = saveBase64Image(config.logo_url, 'school_logo');
      }
      store.school_config = { ...store.school_config, ...config };
      changed = true;
    }
    if (Array.isArray(updates.periods)) {
      store.periods = updates.periods;
      changed = true;
    }
    if (Array.isArray(updates.candidates)) {
      // Permanently write any base64 candidate photos if submitted
      store.candidates = updates.candidates.map((c: Candidate) => {
        if (c.photo_url && c.photo_url.startsWith('data:image/')) {
          return {
            ...c,
            photo_url: saveBase64Image(c.photo_url, `paslon_${c.candidate_number || 'lead'}`),
          };
        }
        return c;
      });
      changed = true;
    }
    if (Array.isArray(updates.students)) {
      store.students = updates.students;
      changed = true;
    }
    if (Array.isArray(updates.votes)) {
      store.votes = updates.votes;
      changed = true;
    }
    if (Array.isArray(updates.committees)) {
      store.committees = updates.committees;
      changed = true;
    }
    if (Array.isArray(updates.users)) {
      store.users = updates.users;
      changed = true;
    }
    if (Array.isArray(updates.audit_logs)) {
      const existingIds = new Set(store.audit_logs.map((l) => l.id));
      const newLogs = updates.audit_logs.filter((l: AuditLog) => !existingIds.has(l.id));
      if (newLogs.length > 0) {
        store.audit_logs = [...newLogs, ...store.audit_logs].slice(0, 100);
        changed = true;
      }
    }

    if (changed) {
      store.version = (store.version || 1) + 1;
      writeStore(store);
    }

    res.json({
      success: true,
      version: store.version,
      last_updated: store.last_updated,
      data: store,
    });
  } catch (err: any) {
    console.error('Error syncing voting data:', err);
    res.status(500).json({ success: false, message: 'Gagal menyinkronkan data: ' + err.message });
  }
});

// 5. Submit Vote endpoint (Server-Authoritative & Anti Double-Voting)
app.post('/api/voting-data/submit-vote', (req: Request, res: Response) => {
  try {
    const { nisn, pin, candidateId, periodId } = req.body;
    if (!nisn || !pin || !candidateId) {
      res.status(400).json({ success: false, message: 'Data formulir bilik suara tidak lengkap.' });
      return;
    }

    // Refresh store from disk to ensure freshest state
    store = readStore();

    // Active period
    const activePeriod = store.periods.find((p) => (periodId ? p.id === periodId : p.is_active)) || store.periods[0];
    if (!activePeriod) {
      res.status(400).json({ success: false, message: 'Periode pemilihan aktif tidak ditemukan.' });
      return;
    }

    if (activePeriod.voting_session_status !== 'OPEN') {
      res.json({
        success: false,
        message: activePeriod.voting_session_status === 'PAUSED'
          ? 'Bilik suara sedang dijeda sementara oleh panitia. Mohon tunggu.'
          : 'Sesi pemilihan telah ditutup. Bilik suara tidak lagi menerima suara.',
      });
      return;
    }

    // Validate student
    const student = store.students.find(
      (s) => s.period_id === activePeriod.id && s.nisn.trim() === String(nisn).trim()
    );

    if (!student) {
      res.json({
        success: false,
        message: 'Nomor Induk (NISN/NIP) tidak terdaftar dalam Daftar Pemilih Tetap (DPT) periode ini.',
      });
      return;
    }

    if (student.pin.trim() !== String(pin).trim()) {
      res.json({
        success: false,
        message: 'PIN 6-digit tidak cocok. Silakan periksa kartu pemilih Anda atau hubungi panitia.',
      });
      return;
    }

    if (student.has_voted) {
      const typeLabel = student.voter_type === 'GURU' ? 'Guru' : student.voter_type === 'TATA_USAHA' ? 'Staf TU' : 'Siswa';
      res.json({
        success: false,
        message: `Kredensial ${typeLabel} atas nama ${student.name} (${student.nisn}) telah tercatat menggunakan hak suara pada ${new Date(student.voted_at || '').toLocaleTimeString('id-ID')}. Sistem menolak pengiriman ganda.`,
      });
      return;
    }

    // Validate candidate
    const candidate = store.candidates.find((c) => c.id === candidateId && c.period_id === activePeriod.id);
    if (!candidate) {
      res.json({ success: false, message: 'Paslon yang dipilih tidak valid.' });
      return;
    }

    // Atomic execution: Mark student as voted
    student.has_voted = true;
    student.voted_at = new Date().toISOString();

    // Create Anonymous Vote (idempotent: prevent duplicate vote IDs)
    const voteId = req.body.voteId || `vote-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const alreadyExists = store.votes.some((v) => v.id === voteId);
    if (!alreadyExists) {
      const newVote: Vote = {
        id: voteId,
        period_id: activePeriod.id,
        candidate_id: candidateId,
        created_at: new Date().toISOString(),
      };
      store.votes.push(newVote);
    }

    // Audit log
    const catLabel = student.voter_type === 'GURU' ? 'Dewan Guru' : student.voter_type === 'TATA_USAHA' ? 'Staf Tata Usaha' : 'Siswa';
    appendAuditLog(
      'Suara Masuk (Anonim)',
      `1 suara masuk tercatat secara rahasia. Kategori: ${catLabel} (${student.class_name})`,
      'Sistem Bilik Suara'
    );

    store.version = (store.version || 1) + 1;
    writeStore(store);

    const receipt = `EVOTE-${activePeriod.year_label.replace('/', '-')}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    res.json({
      success: true,
      message: 'Hak suara Anda berhasil disimpan secara rahasia dan sah ke server pusat.',
      voteReceipt: receipt,
      version: store.version,
      updatedStudent: student,
      data: store,
    });
  } catch (err: any) {
    console.error('Error submitting vote:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses suara: ' + err.message });
  }
});

// 6. Reset votes (Empty ballot box)
app.post('/api/voting-data/reset-votes', (req: Request, res: Response) => {
  try {
    const { periodId } = req.body;
    store = readStore();
    const active = store.periods.find((p) => (periodId ? p.id === periodId : p.is_active)) || store.periods[0];
    const targetPeriod = periodId || active.id;

    const previousCount = store.votes.filter((v) => v.period_id === targetPeriod).length;
    store.votes = store.votes.filter((v) => v.period_id !== targetPeriod);

    let resetVotersCount = 0;
    store.students = store.students.map((s) => {
      if (s.period_id === targetPeriod) {
        if (s.has_voted) resetVotersCount++;
        return {
          ...s,
          has_voted: false,
          voted_at: null,
        };
      }
      return s;
    });

    appendAuditLog(
      'Reset Suara Masuk',
      `Kotak suara periode ${active.year_label} berhasil dikosongkan di server. Sebanyak ${previousCount} suara dihapus dan ${resetVotersCount} pemilih DPT dikembalikan ke status belum memilih.`,
      'Panitia Pemilihan'
    );

    store.version = (store.version || 1) + 1;
    writeStore(store);

    res.json({
      success: true,
      message: `Kotak suara berhasil dikosongkan. Sebanyak ${previousCount} suara masuk direset dan status ${resetVotersCount} pemilih DPT dikembalikan ke status Belum Memilih.`,
      deletedVotesCount: previousCount,
      resetVotersCount,
      data: store,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mereset kotak suara: ' + err.message });
  }
});

// 7. Reset individual student vote
app.post('/api/voting-data/reset-individual-vote', (req: Request, res: Response) => {
  try {
    const { studentId, deductVote, candidateIdToDeduct, generateNewPin, reason, actor } = req.body;
    store = readStore();

    const student = store.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Data pemilih tidak ditemukan.' });
      return;
    }

    const wasVoted = student.has_voted;
    let newPin = student.pin;
    if (generateNewPin) {
      newPin = Math.floor(100000 + Math.random() * 900000).toString();
    }

    student.has_voted = false;
    student.voted_at = null;
    student.pin = newPin;

    let deductedVote = false;
    let deductedCandidateLabel = '';
    if (wasVoted && deductVote !== false) {
      let targetIndex = -1;
      if (candidateIdToDeduct) {
        for (let i = store.votes.length - 1; i >= 0; i--) {
          if (store.votes[i].period_id === student.period_id && store.votes[i].candidate_id === candidateIdToDeduct) {
            targetIndex = i;
            break;
          }
        }
      }
      if (targetIndex === -1) {
        for (let i = store.votes.length - 1; i >= 0; i--) {
          if (store.votes[i].period_id === student.period_id) {
            targetIndex = i;
            break;
          }
        }
      }
      if (targetIndex !== -1) {
        const removed = store.votes.splice(targetIndex, 1)[0];
        deductedVote = true;
        const cand = store.candidates.find((c) => c.id === removed.candidate_id);
        deductedCandidateLabel = cand ? `Paslon #${cand.candidate_number} (${cand.leader_name})` : '1 surat suara';
      }
    }

    const typeLabel = student.voter_type === 'GURU' ? 'Guru' : student.voter_type === 'TATA_USAHA' ? 'Staf TU' : 'Siswa';
    const reasonText = reason?.trim() ? ` · Alasan: "${reason.trim()}"` : '';
    const pinText = generateNewPin ? ` · Diberikan PIN baru: ${newPin}` : ' · PIN login lama tetap berlaku';
    const voteText = deductedVote ? ` · Kotak suara disinkronkan (-1 suara ${deductedCandidateLabel})` : '';

    appendAuditLog(
      'Reset Voting Individu (DPT)',
      `Status hak suara ${student.name} (${student.nisn}) [${typeLabel} - ${student.class_name}] dikembalikan ke 'Belum Memilih'${voteText}${pinText}${reasonText}`,
      actor || 'Panitia Pemilihan'
    );

    store.version = (store.version || 1) + 1;
    writeStore(store);

    res.json({
      success: true,
      message: `Status voting ${student.name} berhasil direset ke 'Belum Memilih'.${generateNewPin ? ` PIN baru: ${newPin}.` : ''}${deductedVote ? ' Kotak suara disinkronkan (-1 suara).' : ''}`,
      newPin: generateNewPin ? newPin : undefined,
      deductedVote,
      student,
      data: store,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mereset pemilih: ' + err.message });
  }
});

// 8. Batch reset students vote
app.post('/api/voting-data/batch-reset-votes', (req: Request, res: Response) => {
  try {
    const { studentIds, deductVotes, generateNewPins, reason, actor } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.json({ success: false, message: 'Tidak ada pemilih yang dipilih.', resetCount: 0 });
      return;
    }

    store = readStore();
    const idSet = new Set(studentIds);
    let resetCount = 0;
    const active = store.periods.find((p) => p.is_active) || store.periods[0];

    store.students = store.students.map((s) => {
      if (idSet.has(s.id) && s.has_voted) {
        resetCount++;
        return {
          ...s,
          has_voted: false,
          voted_at: null,
          pin: generateNewPins ? Math.floor(100000 + Math.random() * 900000).toString() : s.pin,
        };
      }
      return s;
    });

    let deductedVotesCount = 0;
    if (deductVotes !== false && resetCount > 0) {
      let toRemove = resetCount;
      const remainingVotes: Vote[] = [];
      for (let i = store.votes.length - 1; i >= 0; i--) {
        const v = store.votes[i];
        if (v.period_id === active.id && toRemove > 0) {
          toRemove--;
          deductedVotesCount++;
        } else {
          remainingVotes.unshift(v);
        }
      }
      store.votes = remainingVotes;
    }

    appendAuditLog(
      'Reset Voting Masal DPT',
      `${resetCount} pemilih dikembalikan statusnya menjadi 'Belum Memilih' (${deductedVotesCount} surat suara disinkronkan dari kotak suara)`,
      actor || 'Panitia Pemilihan'
    );

    store.version = (store.version || 1) + 1;
    writeStore(store);

    res.json({
      success: true,
      message: `Berhasil mereset hak suara ${resetCount} pemilih menjadi 'Belum Memilih'.`,
      resetCount,
      deductedVotesCount,
      data: store,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal reset masal: ' + err.message });
  }
});

// 9. Reset to default demo seed
app.post('/api/voting-data/reset-demo', (req: Request, res: Response) => {
  try {
    store = getInitialStore();
    store.version = (store.version || 1) + 1;
    writeStore(store);
    res.json({
      success: true,
      message: 'Database berhasil direset kembali ke seed demo awal.',
      data: store,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal reset demo: ' + err.message });
  }
});

// ================= VITE DEV OR PROD SERVE =================
async function startServer() {
  if (!isProduction) {
    // Development mode with Vite Middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/uploads') || req.url.startsWith('/assets') || req.url.startsWith('/src/assets')) {
        return next();
      }
      const indexHtml = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Application dist not built yet. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[E-Voting OSIS] Server running on http://0.0.0.0:${PORT} (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);
    console.log(`[E-Voting OSIS] Central database loaded from: ${STORE_FILE}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
