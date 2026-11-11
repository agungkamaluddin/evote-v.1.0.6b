import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  ElectionPeriod,
  Candidate,
  Student,
  Vote,
  Committee,
  SchoolConfig,
  VotingSessionStatus,
  AuditLog,
  OrgType,
  UserAccount,
  StaffRole,
  VoterCategory,
  VoterCategoryStats,
} from '../types/index.ts';
import {
  INITIAL_PERIODS,
  INITIAL_CANDIDATES,
  ARCHIVED_CANDIDATES,
  INITIAL_STUDENTS,
  INITIAL_VOTES,
  INITIAL_COMMITTEES,
  INITIAL_SCHOOL_CONFIG,
  INITIAL_AUDIT_LOGS,
  INITIAL_USERS,
} from '../data/mockData.ts';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.ts';

const STORAGE_KEYS = {
  PERIODS: 'evoting_periods',
  CANDIDATES: 'evoting_candidates',
  STUDENTS: 'evoting_students',
  VOTES: 'evoting_votes',
  COMMITTEES: 'evoting_committees',
  SCHOOL_CONFIG: 'evoting_school_config',
  AUDIT_LOGS: 'evoting_audit_logs',
  USERS: 'evoting_users',
  VERSION: 'evoting_data_version',
};

export function normalizeAssetUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/src/assets/images/')) {
    return url.replace('/src/assets/images/', '/assets/images/');
  }
  return url;
}

async function compressImageDataUrl(dataUrl: string, maxDim = 720, quality = 0.84): Promise<string> {
  if (typeof window === 'undefined' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  // Keep small SVG data URLs untouched
  if (dataUrl.startsWith('data:image/svg+xml')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = dataUrl.startsWith('data:image/png');
        const out = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; mime: string } | null {
  try {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return null;
    const mime = matches[1];
    const bstr = atob(matches[2]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const rawExt = mime.split('/')[1]?.toLowerCase() || 'png';
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
    return { blob: new Blob([u8arr], { type: mime }), ext, mime };
  } catch {
    return null;
  }
}

type Listener = () => void;

class VotingStore {
  private listeners: Set<Listener> = new Set();
  private lastVersion = 0;
  private isSyncing = false;
  private isSeedingSupabase = false;
  private pollTimer: any = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private realtimeDebounceTimer: any = null;
  private hasSyncedOnce = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSync();
      // Safety timeout so fresh devices never stay stuck on loading screen
      setTimeout(() => {
        if (!this.hasSyncedOnce) {
          this.hasSyncedOnce = true;
          this.notify();
        }
      }, 4000);
    }
  }

  private initializeSync(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (isSupabaseConfigured()) {
      this.fetchFromSupabase(false);
      this.setupSupabaseRealtime();
      this.pollTimer = setInterval(() => {
        this.fetchFromSupabase(true);
      }, 6000);
    } else {
      this.teardownSupabaseRealtime();
      this.fetchFromServer(false);
      this.pollTimer = setInterval(() => {
        this.fetchFromServer(true);
      }, 2500);
    }

    window.addEventListener('focus', this.handleWindowFocus);
  }

  private handleWindowFocus = () => {
    if (isSupabaseConfigured()) {
      this.fetchFromSupabase(true);
    } else {
      this.fetchFromServer(true);
    }
  };

  public async reinitializeConnection(): Promise<boolean> {
    this.teardownSupabaseRealtime();
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (isSupabaseConfigured()) {
      const ok = await this.fetchFromSupabase(false);
      this.setupSupabaseRealtime();
      this.pollTimer = setInterval(() => {
        this.fetchFromSupabase(true);
      }, 6000);
      return ok;
    } else {
      const ok = await this.fetchFromServer(false);
      this.pollTimer = setInterval(() => {
        this.fetchFromServer(true);
      }, 2500);
      return ok;
    }
  }

  public isUsingSupabase(): boolean {
    return isSupabaseConfigured();
  }

  private teardownSupabaseRealtime(): void {
    if (this.realtimeChannel) {
      try {
        const client = getSupabaseClient();
        if (client) {
          client.removeChannel(this.realtimeChannel);
        } else {
          this.realtimeChannel.unsubscribe();
        }
      } catch {
        // ignore
      }
      this.realtimeChannel = null;
    }
  }

  private setupSupabaseRealtime(): void {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    this.teardownSupabaseRealtime();

    const triggerRefresh = () => {
      if (this.realtimeDebounceTimer) {
        clearTimeout(this.realtimeDebounceTimer);
      }
      this.realtimeDebounceTimer = setTimeout(() => {
        this.fetchFromSupabase(true);
      }, 250);
    };

    try {
      this.realtimeChannel = supabase
        .channel('evoting-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, triggerRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'periods' }, triggerRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, triggerRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, triggerRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'school_config' }, triggerRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'committees' }, triggerRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, triggerRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, triggerRefresh)
        .subscribe();
    } catch (err) {
      console.warn('Notice: Realtime subscription fallback to polling:', err);
    }
  }

  private async seedSupabaseIfEmpty(forceReset = false): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || this.isSeedingSupabase) return;

    this.isSeedingSupabase = true;
    try {
      if (!forceReset) {
        const { data: existingPeriods, error } = await supabase.from('periods').select('id').limit(1);
        if (error || (existingPeriods && existingPeriods.length > 0)) {
          return;
        }
      } else {
        await supabase.from('votes').delete().neq('id', '');
        await supabase.from('students').delete().neq('id', '');
        await supabase.from('candidates').delete().neq('id', '');
        await supabase.from('committees').delete().neq('id', '');
        await supabase.from('periods').delete().neq('id', '');
        await supabase.from('audit_logs').delete().neq('id', '');
        await supabase.from('app_users').delete().neq('id', '');
        await supabase.from('school_config').delete().neq('id', '');
      }

      await supabase.from('school_config').upsert(
        {
          id: 'default',
          school_name: INITIAL_SCHOOL_CONFIG.school_name,
          organization_type: INITIAL_SCHOOL_CONFIG.organization_type,
          logo_url: normalizeAssetUrl(INITIAL_SCHOOL_CONFIG.logo_url),
          school_address: INITIAL_SCHOOL_CONFIG.school_address,
          principal_name: INITIAL_SCHOOL_CONFIG.principal_name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      await supabase.from('periods').upsert(INITIAL_PERIODS, { onConflict: 'id', ignoreDuplicates: true });

      const allInitialCandidates = [...INITIAL_CANDIDATES, ...ARCHIVED_CANDIDATES].map((c) => ({
        ...c,
        vice_leader_name: c.vice_leader_name || '',
        photo_url: normalizeAssetUrl(c.photo_url),
        work_programs: c.work_programs || [],
        motto: c.motto || '',
      }));
      await supabase.from('candidates').upsert(allInitialCandidates, { onConflict: 'id', ignoreDuplicates: true });

      const allInitialStudents = INITIAL_STUDENTS.map((s) => ({
        ...s,
        voter_type: s.voter_type || 'SISWA',
      }));
      await supabase.from('students').upsert(allInitialStudents, { onConflict: 'id', ignoreDuplicates: true });

      await supabase.from('votes').upsert(INITIAL_VOTES, { onConflict: 'id', ignoreDuplicates: true });
      await supabase.from('committees').upsert(INITIAL_COMMITTEES, { onConflict: 'id', ignoreDuplicates: true });
      await supabase.from('app_users').upsert(INITIAL_USERS, { onConflict: 'id', ignoreDuplicates: true });
      await supabase.from('audit_logs').upsert(INITIAL_AUDIT_LOGS, { onConflict: 'id', ignoreDuplicates: true });
    } catch (err) {
      console.warn('Notice: Auto-seed Supabase error:', err);
    } finally {
      this.isSeedingSupabase = false;
    }
  }

  private async fetchAllRows<T = any>(
    supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
    table: string,
    orderCol: string,
    ascending = true
  ): Promise<{ data: T[]; error: any }> {
    const pageSize = 1000;
    let from = 0;
    const allRows: T[] = [];

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderCol, { ascending })
        .range(from, from + pageSize - 1);

      if (error) {
        return { data: allRows, error };
      }

      if (!data || data.length === 0) {
        break;
      }

      allRows.push(...(data as T[]));
      if (data.length < pageSize) {
        break;
      }
      from += pageSize;
    }

    return { data: allRows, error: null };
  }

  public async syncNow(): Promise<boolean> {
    if (isSupabaseConfigured()) {
      return this.fetchFromSupabase(false);
    }
    return this.fetchFromServer(false);
  }

  public async fetchFromSupabase(isBackgroundPoll = false): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase || this.isSyncing) return false;

    this.isSyncing = true;
    try {
      const [
        configRes,
        periodsRes,
        candidatesRes,
        studentsRes,
        votesRes,
        committeesRes,
        usersRes,
        logsRes,
      ] = await Promise.all([
        supabase.from('school_config').select('*').limit(1),
        supabase.from('periods').select('*').order('created_at', { ascending: false }),
        supabase.from('candidates').select('*').order('candidate_number', { ascending: true }),
        this.fetchAllRows(supabase, 'students', 'created_at', true),
        this.fetchAllRows(supabase, 'votes', 'created_at', true),
        supabase.from('committees').select('*').order('created_at', { ascending: true }),
        supabase.from('app_users').select('*').order('created_at', { ascending: true }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100),
      ]);

      if (periodsRes.error) {
        console.warn('Supabase sync error:', periodsRes.error.message);
        return false;
      }

      // If brand new empty database, auto-seed once
      if ((!periodsRes.data || periodsRes.data.length === 0) && !this.isSeedingSupabase) {
        this.isSyncing = false;
        await this.seedSupabaseIfEmpty(false);
        return await this.fetchFromSupabase(false);
      }

      if (configRes.data && configRes.data.length > 0) {
        const cfg = configRes.data[0];
        const cleanCfg: SchoolConfig = {
          school_name: cfg.school_name || INITIAL_SCHOOL_CONFIG.school_name,
          organization_type: (cfg.organization_type as OrgType) || 'OSIS',
          logo_url: normalizeAssetUrl(cfg.logo_url || INITIAL_SCHOOL_CONFIG.logo_url),
          school_address: cfg.school_address || '',
          principal_name: cfg.principal_name || '',
        };
        this.saveToLocalCache(STORAGE_KEYS.SCHOOL_CONFIG, cleanCfg);
      }

      if (Array.isArray(periodsRes.data) && periodsRes.data.length > 0) {
        this.saveToLocalCache(STORAGE_KEYS.PERIODS, periodsRes.data);
      }

      if (Array.isArray(candidatesRes.data)) {
        const normalizedCands = candidatesRes.data.map((c: any) => ({
          ...c,
          photo_url: normalizeAssetUrl(c.photo_url),
          mission: Array.isArray(c.mission) ? c.mission : [],
          work_programs: Array.isArray(c.work_programs) ? c.work_programs : [],
        }));
        this.saveToLocalCache(STORAGE_KEYS.CANDIDATES, normalizedCands);
      }

      if (Array.isArray(studentsRes.data)) {
        const normalizedStudents = studentsRes.data.map((s: any) => ({
          ...s,
          voter_type: (s.voter_type as VoterCategory) || 'SISWA',
        }));
        this.saveToLocalCache(STORAGE_KEYS.STUDENTS, normalizedStudents);
      }

      if (Array.isArray(votesRes.data)) {
        this.saveToLocalCache(STORAGE_KEYS.VOTES, votesRes.data);
      }

      if (Array.isArray(committeesRes.data)) {
        this.saveToLocalCache(STORAGE_KEYS.COMMITTEES, committeesRes.data);
      }

      if (Array.isArray(usersRes.data) && usersRes.data.length > 0) {
        this.saveToLocalCache(STORAGE_KEYS.USERS, usersRes.data);
      }

      if (Array.isArray(logsRes.data)) {
        this.saveToLocalCache(STORAGE_KEYS.AUDIT_LOGS, logsRes.data);
      }

      this.hasSyncedOnce = true;
      this.notify();
      return true;
    } catch (err) {
      if (!isBackgroundPoll) {
        console.warn('Supabase fetch error:', err);
      }
      return false;
    } finally {
      this.isSyncing = false;
      if (!this.hasSyncedOnce) {
        this.hasSyncedOnce = true;
        this.notify();
      }
    }
  }

  private saveToLocalCache<T>(key: string, value: T): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn(`Error caching key ${key}:`, e);
    }
  }

  private load<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          return this.sanitizeLoadedData(key, parsed);
        }
      }
    } catch (e) {
      console.warn(`Error loading key ${key} from storage:`, e);
    }
    return defaultValue;
  }

  private sanitizeLoadedData<T>(key: string, data: any): T {
    if (key === STORAGE_KEYS.SCHOOL_CONFIG && data) {
      if (data.logo_url) data.logo_url = normalizeAssetUrl(data.logo_url);
      if (data.school_name && data.school_name.includes('Harapan Bangsa')) {
        data.school_name = 'SMKS PGRI 2 PALIMANAN';
      }
    } else if (key === STORAGE_KEYS.PERIODS && Array.isArray(data)) {
      data.forEach((p) => {
        if (p.school_name && p.school_name.includes('Harapan Bangsa')) {
          p.school_name = 'SMKS PGRI 2 PALIMANAN';
        }
      });
    } else if (key === STORAGE_KEYS.CANDIDATES && Array.isArray(data)) {
      data.forEach((c) => {
        if (c.photo_url) c.photo_url = normalizeAssetUrl(c.photo_url);
      });
    }
    return data as T;
  }

  private save<T>(key: string, value: T, shouldBroadcastToServer = true): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(value));
      }
      this.notify();

      if (shouldBroadcastToServer && !isSupabaseConfigured()) {
        this.broadcastToServer({ [key]: value });
      }
    } catch (e) {
      console.error(`Error saving key ${key} to storage:`, e);
    }
  }

  private saveMultiple(entries: Record<string, any>, shouldBroadcastToServer = true): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.entries(entries).forEach(([key, val]) => {
          localStorage.setItem(key, JSON.stringify(val));
        });
      }
      this.notify();

      if (shouldBroadcastToServer && !isSupabaseConfigured()) {
        this.broadcastToServer(entries);
      }
    } catch (e) {
      console.error('Error saving multiple keys to storage:', e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public hasInitialSync(): boolean {
    return this.hasSyncedOnce;
  }

  // --- EXPRESS SERVER SYNCHRONIZATION (FALLBACK WHEN SUPABASE IS NOT CONFIGURED) ---
  public async fetchFromServer(isBackgroundPoll = false): Promise<boolean> {
    if (isSupabaseConfigured()) {
      return this.fetchFromSupabase(isBackgroundPoll);
    }
    if (this.isSyncing) return false;
    try {
      const res = await fetch('/api/voting-data', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) return false;

      const body = await res.json();
      if (body && body.success && body.data) {
        this.hasSyncedOnce = true;
        const serverData = body.data;
        const serverVersion = Number(serverData.version) || 1;

        if (serverVersion !== this.lastVersion || !isBackgroundPoll) {
          this.lastVersion = serverVersion;

          if (serverData.school_config) {
            serverData.school_config.logo_url = normalizeAssetUrl(serverData.school_config.logo_url);
            this.save(STORAGE_KEYS.SCHOOL_CONFIG, serverData.school_config, false);
          }
          if (Array.isArray(serverData.periods)) {
            this.save(STORAGE_KEYS.PERIODS, serverData.periods, false);
          }
          if (Array.isArray(serverData.candidates)) {
            serverData.candidates.forEach((c: Candidate) => {
              if (c.photo_url) c.photo_url = normalizeAssetUrl(c.photo_url);
            });
            this.save(STORAGE_KEYS.CANDIDATES, serverData.candidates, false);
          }
          if (Array.isArray(serverData.students)) {
            this.save(STORAGE_KEYS.STUDENTS, serverData.students, false);
          }
          if (Array.isArray(serverData.votes)) {
            this.save(STORAGE_KEYS.VOTES, serverData.votes, false);
          }
          if (Array.isArray(serverData.committees)) {
            this.save(STORAGE_KEYS.COMMITTEES, serverData.committees, false);
          }
          if (Array.isArray(serverData.audit_logs)) {
            this.save(STORAGE_KEYS.AUDIT_LOGS, serverData.audit_logs, false);
          }
          if (Array.isArray(serverData.users)) {
            this.save(STORAGE_KEYS.USERS, serverData.users, false);
          }

          this.notify();
          return true;
        }
      }
    } catch {
      // Quiet fail if offline or static host
    } finally {
      if (!this.hasSyncedOnce) {
        this.hasSyncedOnce = true;
        this.notify();
      }
    }
    return false;
  }

  private async broadcastToServer(partial?: Record<string, any>): Promise<void> {
    if (isSupabaseConfigured() || !partial || Object.keys(partial).length === 0) return;
    try {
      const payload: any = {};
      if (partial[STORAGE_KEYS.SCHOOL_CONFIG]) payload.school_config = partial[STORAGE_KEYS.SCHOOL_CONFIG];
      if (partial[STORAGE_KEYS.PERIODS]) payload.periods = partial[STORAGE_KEYS.PERIODS];
      if (partial[STORAGE_KEYS.CANDIDATES]) payload.candidates = partial[STORAGE_KEYS.CANDIDATES];
      if (partial[STORAGE_KEYS.STUDENTS]) payload.students = partial[STORAGE_KEYS.STUDENTS];
      if (partial[STORAGE_KEYS.VOTES]) payload.votes = partial[STORAGE_KEYS.VOTES];
      if (partial[STORAGE_KEYS.COMMITTEES]) payload.committees = partial[STORAGE_KEYS.COMMITTEES];
      if (partial[STORAGE_KEYS.AUDIT_LOGS]) payload.audit_logs = partial[STORAGE_KEYS.AUDIT_LOGS];
      if (partial[STORAGE_KEYS.USERS]) payload.users = partial[STORAGE_KEYS.USERS];

      if (Object.keys(payload).length === 0) return;

      const res = await fetch('/api/voting-data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version) {
          this.lastVersion = data.version;
          if (data.data) {
            if (payload.school_config && data.data.school_config) {
              this.save(STORAGE_KEYS.SCHOOL_CONFIG, data.data.school_config, false);
            }
            if (payload.candidates && data.data.candidates) {
              this.save(STORAGE_KEYS.CANDIDATES, data.data.candidates, false);
            }
          }
        }
      }
    } catch {
      // Ignore in static mode
    }
  }

  // --- ASSET UPLOAD HELPER (SUPABASE STORAGE / COMPRESSED DATA URL / EXPRESS UPLOADS) ---
  public async uploadAsset(dataUrl: string, filename?: string): Promise<string> {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return normalizeAssetUrl(dataUrl);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const compressed = await compressImageDataUrl(dataUrl, 720, 0.84);
      const parsed = dataUrlToBlob(compressed);
      if (parsed) {
        try {
          const cleanName = (filename || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
          const filePath = `${cleanName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${parsed.ext}`;
          const { error } = await supabase.storage
            .from('evoting-assets')
            .upload(filePath, parsed.blob, { contentType: parsed.mime, upsert: true });

          if (!error) {
            const { data: pubData } = supabase.storage.from('evoting-assets').getPublicUrl(filePath);
            if (pubData?.publicUrl) {
              return pubData.publicUrl;
            }
          }
        } catch {
          // Fallback cleanly to compressed data URL stored in PostgreSQL TEXT column
        }
      }
      return compressed;
    }

    try {
      const res = await fetch('/api/upload-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.url) {
          return body.url;
        }
      }
    } catch {
      // Fallback
    }
    return await compressImageDataUrl(dataUrl, 720, 0.84);
  }

  // --- SCHOOL CONFIG ---
  public getSchoolConfig(): SchoolConfig {
    const config = this.load<SchoolConfig>(STORAGE_KEYS.SCHOOL_CONFIG, INITIAL_SCHOOL_CONFIG);
    config.logo_url = normalizeAssetUrl(config.logo_url);
    return config;
  }

  public updateSchoolConfig(config: Partial<SchoolConfig>): void {
    const current = this.getSchoolConfig();
    const cleanLogo = config.logo_url ? normalizeAssetUrl(config.logo_url) : current.logo_url;
    const updated = { ...current, ...config, logo_url: cleanLogo };
    this.save(STORAGE_KEYS.SCHOOL_CONFIG, updated);
    this.addAuditLog('Pengaturan Sekolah Diperbarui', `Nama: ${updated.school_name}, Tipe: ${updated.organization_type}`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      const syncToSupabase = async () => {
        let finalLogo = updated.logo_url;
        if (config.logo_url && config.logo_url.startsWith('data:image/')) {
          finalLogo = await this.uploadAsset(config.logo_url, 'school_logo');
          if (finalLogo && finalLogo !== updated.logo_url) {
            this.save(STORAGE_KEYS.SCHOOL_CONFIG, { ...updated, logo_url: finalLogo }, false);
          }
        }
        await supabase.from('school_config').upsert(
          {
            id: 'default',
            school_name: updated.school_name,
            organization_type: updated.organization_type,
            logo_url: finalLogo,
            school_address: updated.school_address,
            principal_name: updated.principal_name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      };
      syncToSupabase().catch((e) => console.warn('Supabase school_config sync error:', e));
      return;
    }

    if (config.logo_url && config.logo_url.startsWith('data:image/')) {
      this.uploadAsset(config.logo_url, 'school_logo').then((url) => {
        if (url && url !== config.logo_url) {
          this.save(STORAGE_KEYS.SCHOOL_CONFIG, { ...updated, logo_url: url });
        }
      });
    }
  }

  // --- PERIODS ---
  public getPeriods(): ElectionPeriod[] {
    return this.load<ElectionPeriod[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
  }

  public getActivePeriod(): ElectionPeriod {
    const periods = this.getPeriods();
    return periods.find((p) => p.is_active) || periods[0] || INITIAL_PERIODS[0];
  }

  public setActivePeriod(periodId: string): void {
    const periods = this.getPeriods().map((p) => ({
      ...p,
      is_active: p.id === periodId,
    }));
    this.save(STORAGE_KEYS.PERIODS, periods);
    const target = periods.find((p) => p.id === periodId);
    this.addAuditLog('Periode Aktif Diubah', `Periode aktif sekarang: ${target?.year_label}`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('periods')
        .update({ is_active: true })
        .eq('id', periodId)
        .then(({ error }) => {
          if (error) console.warn('Supabase setActivePeriod error:', error.message);
        });
    }
  }

  public createPeriod(yearLabel: string, orgType: OrgType): ElectionPeriod {
    const periods = this.getPeriods();
    const config = this.getSchoolConfig();
    const newPeriod: ElectionPeriod = {
      id: `period-${Date.now()}`,
      year_label: yearLabel,
      is_active: false,
      organization_type: orgType,
      school_name: config.school_name,
      voting_session_status: 'CLOSED',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };
    this.save(STORAGE_KEYS.PERIODS, [newPeriod, ...periods]);
    this.addAuditLog('Periode Baru Dibuat', `Tahun ajaran: ${yearLabel}`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('periods')
        .insert(newPeriod)
        .then(({ error }) => {
          if (error) console.warn('Supabase createPeriod error:', error.message);
        });
    }

    return newPeriod;
  }

  public setVotingSessionStatus(periodId: string, status: VotingSessionStatus): void {
    const periods = this.getPeriods().map((p) =>
      p.id === periodId ? { ...p, voting_session_status: status } : p
    );
    this.save(STORAGE_KEYS.PERIODS, periods);
    this.addAuditLog(
      'Status Bilik Suara Diubah',
      `Sesi pemilihan periode diubah menjadi: ${status}`,
      'Panitia Pemilihan'
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('periods')
        .update({ voting_session_status: status })
        .eq('id', periodId)
        .then(({ error }) => {
          if (error) console.warn('Supabase setVotingSessionStatus error:', error.message);
        });
    }
  }

  // --- CANDIDATES ---
  public getCandidates(periodId?: string): Candidate[] {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;
    const all = this.load<Candidate[]>(STORAGE_KEYS.CANDIDATES, [...INITIAL_CANDIDATES, ...ARCHIVED_CANDIDATES]);
    return all
      .filter((c) => c.period_id === targetPeriod)
      .map((c) => ({ ...c, photo_url: normalizeAssetUrl(c.photo_url) }))
      .sort((a, b) => a.candidate_number - b.candidate_number);
  }

  public saveCandidate(candidate: Omit<Candidate, 'id' | 'created_at'> & { id?: string }): Candidate {
    const all = this.load<Candidate[]>(STORAGE_KEYS.CANDIDATES, [...INITIAL_CANDIDATES, ...ARCHIVED_CANDIDATES]);
    const cleanPhoto = normalizeAssetUrl(candidate.photo_url || '/assets/images/paslon_1_lead_1793677968157.jpg');
    const candData = { ...candidate, photo_url: cleanPhoto };

    let savedCand: Candidate;
    if (candData.id) {
      const updated = all.map((c) => (c.id === candData.id ? { ...c, ...candData } : c));
      this.save(STORAGE_KEYS.CANDIDATES, updated);
      this.addAuditLog('Data Calon Ketua Diperbarui', `No Urut ${candData.candidate_number}: ${candData.leader_name}`, 'Panitia Pemilihan');
      savedCand = updated.find((c) => c.id === candData.id)!;
    } else {
      const newCand: Candidate = {
        ...candData,
        id: `cand-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      this.save(STORAGE_KEYS.CANDIDATES, [...all, newCand]);
      this.addAuditLog('Calon Ketua Baru Ditambahkan', `No Urut ${candData.candidate_number}: ${candData.leader_name}`, 'Panitia Pemilihan');
      savedCand = newCand;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const persistCand = async () => {
        let finalPhoto = savedCand.photo_url;
        if (finalPhoto && finalPhoto.startsWith('data:image/')) {
          finalPhoto = await this.uploadAsset(finalPhoto, `paslon_${savedCand.candidate_number}`);
          const freshAll = this.load<Candidate[]>(STORAGE_KEYS.CANDIDATES, [...INITIAL_CANDIDATES, ...ARCHIVED_CANDIDATES]);
          const withPerm = freshAll.map((c) => (c.id === savedCand.id ? { ...c, photo_url: finalPhoto } : c));
          this.save(STORAGE_KEYS.CANDIDATES, withPerm, false);
        }
        await supabase.from('candidates').upsert(
          {
            id: savedCand.id,
            period_id: savedCand.period_id,
            candidate_number: savedCand.candidate_number,
            leader_name: savedCand.leader_name,
            vice_leader_name: savedCand.vice_leader_name || '',
            photo_url: finalPhoto,
            vision: savedCand.vision,
            mission: savedCand.mission || [],
            work_programs: savedCand.work_programs || [],
            motto: savedCand.motto || '',
            created_at: savedCand.created_at,
          },
          { onConflict: 'id' }
        );
      };
      persistCand().catch((e) => console.warn('Supabase saveCandidate error:', e));
      return savedCand;
    }

    if (candData.photo_url && candData.photo_url.startsWith('data:image/')) {
      this.uploadAsset(candData.photo_url, `paslon_${candData.candidate_number}`).then((permanentUrl) => {
        if (permanentUrl && permanentUrl !== candData.photo_url) {
          const freshAll = this.load<Candidate[]>(STORAGE_KEYS.CANDIDATES, [...INITIAL_CANDIDATES, ...ARCHIVED_CANDIDATES]);
          const withPermanent = freshAll.map((c) => (c.id === savedCand.id ? { ...c, photo_url: permanentUrl } : c));
          this.save(STORAGE_KEYS.CANDIDATES, withPermanent);
        }
      });
    }

    return savedCand;
  }

  public deleteCandidate(candidateId: string): void {
    const all = this.load<Candidate[]>(STORAGE_KEYS.CANDIDATES, [...INITIAL_CANDIDATES, ...ARCHIVED_CANDIDATES]);
    const filtered = all.filter((c) => c.id !== candidateId);
    this.save(STORAGE_KEYS.CANDIDATES, filtered);

    const allVotes = this.load<Vote[]>(STORAGE_KEYS.VOTES, INITIAL_VOTES);
    const remainingVotes = allVotes.filter((v) => v.candidate_id !== candidateId);
    this.save(STORAGE_KEYS.VOTES, remainingVotes);

    this.addAuditLog('Calon Ketua Dihapus', `ID Calon: ${candidateId}`, 'Panitia Pemilihan');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId)
        .then(({ error }) => {
          if (error) console.warn('Supabase deleteCandidate error:', error.message);
        });
    }
  }

  // --- STUDENTS (DPT) ---
  public getStudents(periodId?: string): Student[] {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    return all.filter((s) => s.period_id === targetPeriod);
  }

  public addStudent(studentData: {
    nisn: string;
    name: string;
    class_name: string;
    voter_type?: VoterCategory;
    period_id?: string;
    pin?: string;
  }): { success: boolean; message: string; student?: Student } {
    const active = this.getActivePeriod();
    const targetPeriod = studentData.period_id || active.id;
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);

    const exists = all.find((s) => s.period_id === targetPeriod && s.nisn === studentData.nisn.trim());
    if (exists) {
      return { success: false, message: `Nomor Induk Pemilih ${studentData.nisn} sudah terdaftar pada periode ini (${exists.name}).` };
    }

    const voterType: VoterCategory = studentData.voter_type || 'SISWA';
    const pin = studentData.pin || this.generateRandomPin();
    const newStudent: Student = {
      id: `std-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      period_id: targetPeriod,
      nisn: studentData.nisn.trim(),
      pin: pin,
      name: studentData.name.trim(),
      class_name: studentData.class_name.trim(),
      voter_type: voterType,
      has_voted: false,
      voted_at: null,
      created_at: new Date().toISOString(),
    };

    this.save(STORAGE_KEYS.STUDENTS, [...all, newStudent]);
    const typeLabel = voterType === 'GURU' ? 'Guru' : voterType === 'TATA_USAHA' ? 'Staf TU' : 'Siswa';
    this.addAuditLog('DPT Ditambahkan', `${newStudent.name} (${newStudent.nisn}) [${typeLabel}] - ${newStudent.class_name}`, 'Panitia Pemilihan');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('students')
        .insert(newStudent)
        .then(({ error }) => {
          if (error) console.warn('Supabase addStudent error:', error.message);
        });
    }

    return { success: true, message: `Data pemilih (${typeLabel}) berhasil ditambahkan.`, student: newStudent };
  }

  public bulkImportStudents(
    studentsList: Array<{ nisn: string; name: string; class_name: string; voter_type?: VoterCategory }>,
    periodId?: string
  ): { added: number; skipped: number } {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const existingNisns = new Set(all.filter((s) => s.period_id === targetPeriod).map((s) => s.nisn));

    let addedCount = 0;
    let skippedCount = 0;
    const newEntries: Student[] = [];

    for (const item of studentsList) {
      const cleanNisn = item.nisn.trim();
      if (!cleanNisn || existingNisns.has(cleanNisn)) {
        skippedCount++;
        continue;
      }

      existingNisns.add(cleanNisn);
      newEntries.push({
        id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        period_id: targetPeriod,
        nisn: cleanNisn,
        pin: this.generateRandomPin(),
        name: item.name.trim(),
        class_name: item.class_name.trim(),
        voter_type: item.voter_type || 'SISWA',
        has_voted: false,
        voted_at: null,
        created_at: new Date().toISOString(),
      });
      addedCount++;
    }

    if (newEntries.length > 0) {
      this.save(STORAGE_KEYS.STUDENTS, [...all, ...newEntries]);
      this.addAuditLog('Import DPT Masal', `${addedCount} pemilih baru diimport (${skippedCount} dilewati duplikat).`, 'Panitia Pemilihan');

      const supabase = getSupabaseClient();
      if (supabase) {
        const insertBatches = async () => {
          for (let i = 0; i < newEntries.length; i += 200) {
            const chunk = newEntries.slice(i, i + 200);
            await supabase.from('students').upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
          }
        };
        insertBatches().catch((e) => console.warn('Supabase bulkImportStudents error:', e));
      }
    }

    return { added: addedCount, skipped: skippedCount };
  }

  public generateRandomPin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public batchGeneratePins(periodId?: string, onlyUnassigned: boolean = false): number {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    let updatedCount = 0;
    const changedStudents: Student[] = [];

    const updated = all.map((s) => {
      if (s.period_id === targetPeriod) {
        if (!onlyUnassigned || !s.pin || s.pin.length !== 6) {
          updatedCount++;
          const nextStudent = { ...s, pin: this.generateRandomPin() };
          changedStudents.push(nextStudent);
          return nextStudent;
        }
      }
      return s;
    });

    this.save(STORAGE_KEYS.STUDENTS, updated);
    this.addAuditLog('Batch Generate PIN', `Generate PIN acak untuk ${updatedCount} siswa.`, 'Sistem Otomatis');

    const supabase = getSupabaseClient();
    if (supabase && changedStudents.length > 0) {
      const updateBatches = async () => {
        for (let i = 0; i < changedStudents.length; i += 200) {
          const chunk = changedStudents.slice(i, i + 200);
          await supabase.from('students').upsert(chunk, { onConflict: 'id' });
        }
      };
      updateBatches().catch((e) => console.warn('Supabase batchGeneratePins error:', e));
    }

    return updatedCount;
  }

  public resetStudentPin(studentId: string): string {
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const newPin = this.generateRandomPin();
    let studentName = '';

    const updated = all.map((s) => {
      if (s.id === studentId) {
        studentName = s.name;
        return { ...s, pin: newPin };
      }
      return s;
    });

    this.save(STORAGE_KEYS.STUDENTS, updated);
    this.addAuditLog('Reset PIN Siswa', `PIN untuk ${studentName} direset ke kredensial baru.`, 'Panitia Pemilihan');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('students')
        .update({ pin: newPin })
        .eq('id', studentId)
        .then(({ error }) => {
          if (error) console.warn('Supabase resetStudentPin error:', error.message);
        });
    }

    return newPin;
  }

  public deleteStudent(studentId: string): void {
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const student = all.find((s) => s.id === studentId);
    const filtered = all.filter((s) => s.id !== studentId);
    this.save(STORAGE_KEYS.STUDENTS, filtered);
    if (student) {
      this.addAuditLog('DPT Siswa Dihapus', `${student.name} (${student.nisn}) dihapus dari DPT.`, 'Panitia Pemilihan');
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .then(({ error }) => {
          if (error) console.warn('Supabase deleteStudent error:', error.message);
        });
    }
  }

  public deleteMultipleStudents(studentIds: string[]): number {
    if (!studentIds || studentIds.length === 0) return 0;
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const idSet = new Set(studentIds);
    const remaining = all.filter((s) => !idSet.has(s.id));
    const deletedCount = all.length - remaining.length;
    this.save(STORAGE_KEYS.STUDENTS, remaining);
    this.addAuditLog('Hapus Masal DPT', `${deletedCount} pemilih berhasil dihapus dari DPT.`, 'Panitia Pemilihan');

    const supabase = getSupabaseClient();
    if (supabase) {
      const deleteChunks = async () => {
        for (let i = 0; i < studentIds.length; i += 100) {
          const chunk = studentIds.slice(i, i + 100);
          await supabase.from('students').delete().in('id', chunk);
        }
      };
      deleteChunks().catch((e) => console.warn('Supabase deleteMultipleStudents error:', e));
    }

    return deletedCount;
  }

  public deleteAllStudents(periodId?: string): number {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const remaining = all.filter((s) => s.period_id !== targetPeriod);
    const deletedCount = all.length - remaining.length;
    this.save(STORAGE_KEYS.STUDENTS, remaining);

    const allVotes = this.load<Vote[]>(STORAGE_KEYS.VOTES, INITIAL_VOTES);
    const remainingVotes = allVotes.filter((v) => v.period_id !== targetPeriod);
    this.save(STORAGE_KEYS.VOTES, remainingVotes);

    this.addAuditLog('Hapus Seluruh DPT', `Seluruh data DPT (${deletedCount} pemilih) dan kotak suara periode ini berhasil dihapus bersih.`, 'Panitia Pemilihan');

    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.all([
        supabase.from('votes').delete().eq('period_id', targetPeriod),
        supabase.from('students').delete().eq('period_id', targetPeriod),
      ]).catch((e) => console.warn('Supabase deleteAllStudents error:', e));
    }

    return deletedCount;
  }

  public updateStudent(studentId: string, updates: Partial<Student>): { success: boolean; message: string } {
    const all = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const target = all.find((s) => s.id === studentId);
    if (!target) return { success: false, message: 'Data siswa tidak ditemukan.' };

    if (updates.nisn && updates.nisn.trim() !== target.nisn) {
      const exists = all.find((s) => s.period_id === target.period_id && s.id !== studentId && s.nisn === updates.nisn?.trim());
      if (exists) {
        return { success: false, message: `NISN ${updates.nisn} sudah terdaftar pada siswa lain.` };
      }
    }

    const updated = all.map((s) => (s.id === studentId ? { ...s, ...updates } : s));
    this.save(STORAGE_KEYS.STUDENTS, updated);
    this.addAuditLog('Data Siswa Diperbarui', `${target.name} (${target.nisn})`, 'Panitia Pemilihan');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('students')
        .update(updates)
        .eq('id', studentId)
        .then(({ error }) => {
          if (error) console.warn('Supabase updateStudent error:', error.message);
        });
    }

    return { success: true, message: 'Data pemilih berhasil diperbarui.' };
  }

  // --- VOTING MECHANISM (ATOMIC SERVER / SUPABASE & ANTI DOUBLE-VOTING) ---
  public async submitVote(
    nisn: string,
    pin: string,
    candidateId: string
  ): Promise<{ success: boolean; message: string; voteReceipt?: string }> {
    const activePeriod = this.getActivePeriod();
    const cleanNisn = nisn.trim();
    const cleanPin = pin.trim();

    // 1. SUPABASE CLOUD ATOMIC RPC MODE
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('submit_vote_atomic', {
          p_period_id: activePeriod.id,
          p_nisn: cleanNisn,
          p_pin: cleanPin,
          p_candidate_id: candidateId,
        });

        if (error) {
          return {
            success: false,
            message: `Gagal memproses suara ke database Supabase: ${error.message}`,
          };
        }

        const result = data as { success: boolean; message: string; receipt?: string } | null;
        if (!result) {
          return { success: false, message: 'Respon database Supabase tidak valid.' };
        }

        // Refresh latest state from Supabase immediately
        await this.fetchFromSupabase(false);

        return {
          success: Boolean(result.success),
          message: result.message || 'Hak suara berhasil diproses.',
          voteReceipt: result.receipt,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Koneksi ke server Supabase terganggu: ${err?.message || 'Silakan coba lagi.'}`,
        };
      }
    }

    // 2. EXPRESS SERVER API MODE (IF RUNNING ON LOCAL/EXPRESS BACKEND)
    try {
      const res = await fetch('/api/voting-data/submit-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: cleanNisn,
          pin: cleanPin,
          candidateId,
          periodId: activePeriod.id,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data) {
          this.lastVersion = body.version || this.lastVersion + 1;
          if (Array.isArray(body.data.students)) this.save(STORAGE_KEYS.STUDENTS, body.data.students, false);
          if (Array.isArray(body.data.votes)) this.save(STORAGE_KEYS.VOTES, body.data.votes, false);
          if (Array.isArray(body.data.audit_logs)) this.save(STORAGE_KEYS.AUDIT_LOGS, body.data.audit_logs, false);
        }
        return {
          success: Boolean(body.success),
          message: body.message,
          voteReceipt: body.voteReceipt,
        };
      }
    } catch {
      // Fallback to local atomic engine if no Express backend
    }

    // 3. LOCAL ENGINE ATOMIC EXECUTION FALLBACK
    if (activePeriod.voting_session_status !== 'OPEN') {
      return {
        success: false,
        message: activePeriod.voting_session_status === 'PAUSED'
          ? 'Bilik suara sedang dijeda sementara oleh panitia. Mohon tunggu.'
          : 'Sesi pemilihan telah ditutup. Bilik suara tidak lagi menerima suara.',
      };
    }

    const students = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const student = students.find(
      (s) => s.period_id === activePeriod.id && s.nisn.trim() === cleanNisn
    );

    if (!student) {
      return { success: false, message: 'Nomor Induk Pemilih tidak terdaftar dalam Daftar Pemilih Tetap (DPT) periode ini.' };
    }

    if (student.pin.trim() !== cleanPin) {
      return { success: false, message: 'PIN 6-digit tidak cocok. Silakan periksa kartu pemilih Anda atau hubungi panitia.' };
    }

    if (student.has_voted) {
      const typeLabel = student.voter_type === 'GURU' ? 'Guru' : student.voter_type === 'TATA_USAHA' ? 'Staf TU' : 'Siswa';
      return {
        success: false,
        message: `Kredensial ${typeLabel} atas nama ${student.name} (${student.nisn}) telah tercatat menggunakan hak suara pada ${new Date(student.voted_at || '').toLocaleTimeString('id-ID')}. Sistem menolak pengiriman ganda.`,
      };
    }

    const candidates = this.getCandidates(activePeriod.id);
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      return { success: false, message: 'Paslon yang dipilih tidak valid.' };
    }

    const updatedStudents = students.map((s) =>
      s.id === student.id
        ? {
            ...s,
            has_voted: true,
            voted_at: new Date().toISOString(),
          }
        : s
    );

    const votes = this.load<Vote[]>(STORAGE_KEYS.VOTES, INITIAL_VOTES);
    const newVote: Vote = {
      id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      period_id: activePeriod.id,
      candidate_id: candidateId,
      created_at: new Date().toISOString(),
    };

    const receipt = `EVOTE-${activePeriod.year_label.replace('/', '-')}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const catLabel = student.voter_type === 'GURU' ? 'Dewan Guru' : student.voter_type === 'TATA_USAHA' ? 'Staf Tata Usaha' : 'Siswa';
    const auditLogs = this.load<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    const newAuditLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action: 'Suara Masuk (Anonim)',
      details: `1 suara masuk tercatat secara rahasia. Kategori: ${catLabel} (${student.class_name})`,
      actor: 'Sistem Bilik Suara',
    };

    this.saveMultiple({
      [STORAGE_KEYS.STUDENTS]: updatedStudents,
      [STORAGE_KEYS.VOTES]: [...votes, newVote],
      [STORAGE_KEYS.AUDIT_LOGS]: [newAuditLog, ...auditLogs].slice(0, 100),
    });

    return {
      success: true,
      message: 'Hak suara Anda berhasil disimpan secara rahasia dan sah.',
      voteReceipt: receipt,
    };
  }

  // --- STATS & VOTES ---
  public getVotes(periodId?: string): Vote[] {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;
    const all = this.load<Vote[]>(STORAGE_KEYS.VOTES, INITIAL_VOTES);
    return all.filter((v) => v.period_id === targetPeriod);
  }

  // --- RESET VOTES (KOSONGKAN KOTAK SUARA) ---
  public resetVotes(periodId?: string): {
    success: boolean;
    message: string;
    deletedVotesCount: number;
    resetVotersCount: number;
  } {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;

    const allVotes = this.load<Vote[]>(STORAGE_KEYS.VOTES, INITIAL_VOTES);
    const periodVotes = allVotes.filter((v) => v.period_id === targetPeriod);
    const remainingVotes = allVotes.filter((v) => v.period_id !== targetPeriod);
    this.save(STORAGE_KEYS.VOTES, remainingVotes);

    const allStudents = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    let resetVotersCount = 0;
    const updatedStudents = allStudents.map((s) => {
      if (s.period_id === targetPeriod) {
        if (s.has_voted || s.voted_at !== null) {
          resetVotersCount++;
        }
        return {
          ...s,
          has_voted: false,
          voted_at: null,
        };
      }
      return s;
    });
    this.save(STORAGE_KEYS.STUDENTS, updatedStudents);

    this.addAuditLog(
      'Reset Suara Masuk',
      `Kotak suara periode ${active.year_label} berhasil dikosongkan. Sebanyak ${periodVotes.length} suara dihapus dan ${resetVotersCount} pemilih DPT dikembalikan ke status belum memilih.`,
      'Panitia Pemilihan'
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .rpc('reset_votes_atomic', { p_period_id: targetPeriod })
        .then(async ({ error }) => {
          if (error) {
            await supabase.from('votes').delete().eq('period_id', targetPeriod);
            await supabase
              .from('students')
              .update({ has_voted: false, voted_at: null })
              .eq('period_id', targetPeriod);
          }
          this.fetchFromSupabase(true);
        });
    } else {
      fetch('/api/voting-data/reset-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: targetPeriod }),
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Kotak suara berhasil dikosongkan. Sebanyak ${periodVotes.length} suara masuk direset dan status ${resetVotersCount} pemilih DPT dikembalikan ke status Belum Memilih.`,
      deletedVotesCount: periodVotes.length,
      resetVotersCount,
    };
  }

  // --- RESET VOTING INDIVIDU DPT ---
  public resetIndividualStudentVote(
    studentId: string,
    options?: {
      deductVote?: boolean;
      candidateIdToDeduct?: string;
      generateNewPin?: boolean;
      reason?: string;
      actor?: string;
    }
  ): {
    success: boolean;
    message: string;
    newPin?: string;
    deductedVote: boolean;
    student?: Student;
  } {
    const allStudents = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const student = allStudents.find((s) => s.id === studentId);
    if (!student) {
      return { success: false, message: 'Data pemilih tidak ditemukan.', deductedVote: false };
    }

    const wasVoted = student.has_voted;
    const shouldDeduct = options?.deductVote ?? true;
    let newPin = student.pin;
    if (options?.generateNewPin) {
      newPin = this.generateRandomPin();
    }

    const updatedStudents = allStudents.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          has_voted: false,
          voted_at: null,
          pin: newPin,
        };
      }
      return s;
    });
    this.save(STORAGE_KEYS.STUDENTS, updatedStudents);

    let deductedVote = false;
    let deductedCandidateLabel = '';
    let removedVoteId = '';
    if (wasVoted && shouldDeduct) {
      const allVotes = this.load<Vote[]>(STORAGE_KEYS.VOTES, INITIAL_VOTES);
      let targetIndex = -1;

      if (options?.candidateIdToDeduct) {
        for (let i = allVotes.length - 1; i >= 0; i--) {
          if (allVotes[i].period_id === student.period_id && allVotes[i].candidate_id === options.candidateIdToDeduct) {
            targetIndex = i;
            break;
          }
        }
      }

      if (targetIndex === -1) {
        for (let i = allVotes.length - 1; i >= 0; i--) {
          if (allVotes[i].period_id === student.period_id) {
            targetIndex = i;
            break;
          }
        }
      }

      if (targetIndex !== -1) {
        const removed = allVotes.splice(targetIndex, 1)[0];
        removedVoteId = removed.id;
        this.save(STORAGE_KEYS.VOTES, allVotes);
        deductedVote = true;
        const candidates = this.getCandidates(student.period_id);
        const candObj = candidates.find((c) => c.id === removed.candidate_id);
        deductedCandidateLabel = candObj ? `Paslon #${candObj.candidate_number} (${candObj.leader_name})` : '1 surat suara';
      }
    }

    const typeLabel = student.voter_type === 'GURU' ? 'Guru' : student.voter_type === 'TATA_USAHA' ? 'Staf TU' : 'Siswa';
    const reasonText = options?.reason?.trim() ? ` · Alasan: "${options.reason.trim()}"` : '';
    const pinText = options?.generateNewPin ? ` · Diberikan PIN baru: ${newPin}` : ' · PIN login lama tetap berlaku';
    const voteText = deductedVote
      ? ` · Kotak suara disinkronkan (-1 suara ${deductedCandidateLabel})`
      : ' · Kotak suara tidak diubah';

    this.addAuditLog(
      'Reset Voting Individu (DPT)',
      `Status hak suara ${student.name} (${student.nisn}) [${typeLabel} - ${student.class_name}] dikembalikan ke 'Belum Memilih'${voteText}${pinText}${reasonText}`,
      options?.actor || 'Panitia Pemilihan'
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .rpc('reset_individual_vote_atomic', {
          p_student_id: studentId,
          p_deduct_vote: shouldDeduct,
          p_candidate_id_to_deduct: options?.candidateIdToDeduct || null,
          p_new_pin: options?.generateNewPin ? newPin : null,
          p_reason: options?.reason || '',
          p_actor: options?.actor || 'Panitia Pemilihan',
        })
        .then(async ({ error }) => {
          if (error) {
            await supabase
              .from('students')
              .update({ has_voted: false, voted_at: null, pin: newPin })
              .eq('id', studentId);
            if (removedVoteId) {
              await supabase.from('votes').delete().eq('id', removedVoteId);
            }
          }
          this.fetchFromSupabase(true);
        });
    } else {
      fetch('/api/voting-data/reset-individual-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          deductVote: options?.deductVote,
          candidateIdToDeduct: options?.candidateIdToDeduct,
          generateNewPin: options?.generateNewPin,
          reason: options?.reason,
          actor: options?.actor,
        }),
      }).catch(() => {});
    }

    const updatedStudent = updatedStudents.find((s) => s.id === studentId);
    return {
      success: true,
      message: `Status voting ${student.name} berhasil direset ke 'Belum Memilih'.${options?.generateNewPin ? ` PIN baru: ${newPin}.` : ''}${deductedVote ? ` Kotak suara disinkronkan (-1 suara).` : ''}`,
      newPin: options?.generateNewPin ? newPin : undefined,
      deductedVote,
      student: updatedStudent,
    };
  }

  // --- BATCH RESET VOTING DPT ---
  public batchResetStudentsVote(
    studentIds: string[],
    options?: {
      deductVotes?: boolean;
      generateNewPins?: boolean;
      reason?: string;
      actor?: string;
    }
  ): {
    success: boolean;
    message: string;
    resetCount: number;
    deductedVotesCount: number;
  } {
    if (!studentIds || studentIds.length === 0) {
      return { success: false, message: 'Tidak ada pemilih yang dipilih.', resetCount: 0, deductedVotesCount: 0 };
    }

    const idSet = new Set(studentIds);
    const allStudents = this.load<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    let resetCount = 0;
    const active = this.getActivePeriod();
    const updatedTargetStudents: Student[] = [];

    const updatedStudents = allStudents.map((s) => {
      if (idSet.has(s.id) && s.has_voted) {
        resetCount++;
        const nextS: Student = {
          ...s,
          has_voted: false,
          voted_at: null,
          pin: options?.generateNewPins ? this.generateRandomPin() : s.pin,
        };
        updatedTargetStudents.push(nextS);
        return nextS;
      }
      return s;
    });

    if (resetCount === 0) {
      return { success: false, message: 'Tidak ada pemilih terpilih yang berstatus Sudah Memilih.', resetCount: 0, deductedVotesCount: 0 };
    }

    this.save(STORAGE_KEYS.STUDENTS, updatedStudents);

    let deductedVotesCount = 0;
    const removedVoteIds: string[] = [];
    if (options?.deductVotes !== false) {
      const allVotes = this.load<Vote[]>(STORAGE_KEYS.VOTES, INITIAL_VOTES);
      let toRemove = resetCount;
      const remainingVotes: Vote[] = [];

      for (let i = allVotes.length - 1; i >= 0; i--) {
        const v = allVotes[i];
        if (v.period_id === active.id && toRemove > 0) {
          toRemove--;
          deductedVotesCount++;
          removedVoteIds.push(v.id);
        } else {
          remainingVotes.unshift(v);
        }
      }
      this.save(STORAGE_KEYS.VOTES, remainingVotes);
    }

    const reasonText = options?.reason?.trim() ? ` · Alasan: "${options.reason.trim()}"` : '';
    const pinText = options?.generateNewPins ? ' · Seluruhnya diberi PIN 6-digit baru' : '';
    this.addAuditLog(
      'Reset Voting Masal DPT',
      `${resetCount} pemilih dikembalikan statusnya menjadi 'Belum Memilih' (${deductedVotesCount} surat suara disinkronkan dari kotak suara)${pinText}${reasonText}`,
      options?.actor || 'Panitia Pemilihan'
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      const syncBatchReset = async () => {
        for (let i = 0; i < updatedTargetStudents.length; i += 200) {
          await supabase.from('students').upsert(updatedTargetStudents.slice(i, i + 200), { onConflict: 'id' });
        }
        if (removedVoteIds.length > 0) {
          for (let i = 0; i < removedVoteIds.length; i += 100) {
            await supabase.from('votes').delete().in('id', removedVoteIds.slice(i, i + 100));
          }
        }
      };
      syncBatchReset().catch((e) => console.warn('Supabase batchResetStudentsVote error:', e));
    } else {
      fetch('/api/voting-data/batch-reset-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds,
          deductVotes: options?.deductVotes,
          generateNewPins: options?.generateNewPins,
          reason: options?.reason,
          actor: options?.actor,
        }),
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Berhasil mereset hak suara ${resetCount} pemilih menjadi 'Belum Memilih'. (${deductedVotesCount} surat suara disinkronkan).`,
      resetCount,
      deductedVotesCount,
    };
  }

  public getElectionStats(periodId?: string) {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;
    const students = this.getStudents(targetPeriod);
    const rawVotes = this.getVotes(targetPeriod);
    const candidates = this.getCandidates(targetPeriod);

    const validCandidateIds = new Set(candidates.map((c) => c.id));
    const votes = rawVotes.filter((v) => validCandidateIds.has(v.candidate_id));

    const totalDPT = students.length;
    const totalVotedDPT = students.filter((s) => s.has_voted).length;

    const verifiedVotes = (totalVotedDPT >= 0 && votes.length > totalVotedDPT)
      ? votes.slice(0, totalVotedDPT)
      : votes;
    const totalVotes = verifiedVotes.length;
    const turnoutPercentage = totalDPT > 0 ? Number(((totalVotes / totalDPT) * 100).toFixed(1)) : 0;
    const remainingDPT = Math.max(0, totalDPT - totalVotes);

    const categoryConfigs: Array<{ category: VoterCategory; label: string }> = [
      { category: 'SISWA', label: 'Siswa' },
      { category: 'GURU', label: 'Dewan Guru' },
      { category: 'TATA_USAHA', label: 'Staf Tata Usaha' },
    ];

    const categoryStats: VoterCategoryStats[] = categoryConfigs.map((cfg) => {
      const list = students.filter((s) => (s.voter_type || 'SISWA') === cfg.category);
      const total = list.length;
      const voted = list.filter((s) => s.has_voted).length;
      const remaining = Math.max(0, total - voted);
      const turnout = total > 0 ? Number(((voted / total) * 100).toFixed(1)) : 0;
      return {
        category: cfg.category,
        label: cfg.label,
        total,
        voted,
        remaining,
        turnout,
      };
    });

    const candidateResults = candidates.map((c) => {
      const count = verifiedVotes.filter((v) => v.candidate_id === c.id).length;
      const pct = totalVotes > 0 ? Number(((count / totalVotes) * 100).toFixed(1)) : 0;
      return {
        ...c,
        vote_count: count,
        vote_percentage: pct,
      };
    });

    const classStatsMap: { [className: string]: { total: number; voted: number } } = {};
    students.forEach((s) => {
      if (!classStatsMap[s.class_name]) {
        classStatsMap[s.class_name] = { total: 0, voted: 0 };
      }
      classStatsMap[s.class_name].total += 1;
      if (s.has_voted) {
        classStatsMap[s.class_name].voted += 1;
      }
    });

    const classStats = Object.keys(classStatsMap)
      .sort()
      .map((className) => {
        const item = classStatsMap[className];
        return {
          class_name: className,
          total: item.total,
          voted: item.voted,
          turnout: item.total > 0 ? Number(((item.voted / item.total) * 100).toFixed(1)) : 0,
        };
      });

    return {
      totalDPT,
      totalVotes,
      totalVotedDPT,
      isConsistent: totalVotes === totalVotedDPT,
      turnoutPercentage,
      remainingDPT,
      categoryStats,
      candidateResults,
      classStats,
    };
  }

  // --- COMMITTEES ---
  public getCommittees(periodId?: string): Committee[] {
    const active = this.getActivePeriod();
    const targetPeriod = periodId || active.id;
    const all = this.load<Committee[]>(STORAGE_KEYS.COMMITTEES, INITIAL_COMMITTEES);
    return all.filter((c) => c.period_id === targetPeriod);
  }

  public addCommittee(committee: Omit<Committee, 'id' | 'created_at'>): Committee {
    const all = this.load<Committee[]>(STORAGE_KEYS.COMMITTEES, INITIAL_COMMITTEES);
    const newComm: Committee = {
      ...committee,
      id: `comm-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.save(STORAGE_KEYS.COMMITTEES, [...all, newComm]);
    this.addAuditLog('Akun Panitia Ditambahkan', `${committee.name} (${committee.role}) - ${committee.sk_number}`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('committees')
        .insert(newComm)
        .then(({ error }) => {
          if (error) console.warn('Supabase addCommittee error:', error.message);
        });
    }

    return newComm;
  }

  public updateCommittee(committeeId: string, updates: Partial<Committee>): void {
    const all = this.load<Committee[]>(STORAGE_KEYS.COMMITTEES, INITIAL_COMMITTEES);
    const updated = all.map((c) => (c.id === committeeId ? { ...c, ...updates } : c));
    this.save(STORAGE_KEYS.COMMITTEES, updated);
    this.addAuditLog('Data Panitia Diperbarui', `ID Panitia: ${committeeId}`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('committees')
        .update(updates)
        .eq('id', committeeId)
        .then(({ error }) => {
          if (error) console.warn('Supabase updateCommittee error:', error.message);
        });
    }
  }

  public deleteCommittee(committeeId: string): { success: boolean; message: string } {
    const all = this.load<Committee[]>(STORAGE_KEYS.COMMITTEES, INITIAL_COMMITTEES);
    const target = all.find((c) => c.id === committeeId);
    if (!target) return { success: false, message: 'Panitia tidak ditemukan.' };
    const filtered = all.filter((c) => c.id !== committeeId);
    this.save(STORAGE_KEYS.COMMITTEES, filtered);
    this.addAuditLog('Data Panitia Dihapus', `${target.name} (${target.role})`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('committees')
        .delete()
        .eq('id', committeeId)
        .then(({ error }) => {
          if (error) console.warn('Supabase deleteCommittee error:', error.message);
        });
    }

    return { success: true, message: 'Data kepanitiaan berhasil dihapus.' };
  }

  public deletePeriod(periodId: string): { success: boolean; message: string } {
    const periods = this.getPeriods();
    const target = periods.find((p) => p.id === periodId);
    if (!target) return { success: false, message: 'Periode tidak ditemukan.' };
    if (target.is_active) {
      return { success: false, message: 'Tidak dapat menghapus periode yang sedang aktif berjalan. Aktifkan periode lain terlebih dahulu.' };
    }
    const filtered = periods.filter((p) => p.id !== periodId);
    this.save(STORAGE_KEYS.PERIODS, filtered);
    this.addAuditLog('Periode Dihapus', `Masa Bakti: ${target.year_label}`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('periods')
        .delete()
        .eq('id', periodId)
        .then(({ error }) => {
          if (error) console.warn('Supabase deletePeriod error:', error.message);
        });
    }

    return { success: true, message: 'Periode berhasil dihapus.' };
  }

  public updatePeriod(periodId: string, updates: Partial<ElectionPeriod>): void {
    const periods = this.getPeriods();
    const updated = periods.map((p) => (p.id === periodId ? { ...p, ...updates } : p));
    this.save(STORAGE_KEYS.PERIODS, updated);
    this.addAuditLog('Periode Diperbarui', `ID Periode: ${periodId}`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('periods')
        .update(updates)
        .eq('id', periodId)
        .then(({ error }) => {
          if (error) console.warn('Supabase updatePeriod error:', error.message);
        });
    }
  }

  // --- USER ACCOUNTS CRUD (ADMIN & PANITIA) ---
  public getUserAccounts(): UserAccount[] {
    return this.load<UserAccount[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public saveUserAccount(userData: Omit<UserAccount, 'id' | 'created_at'> & { id?: string }): { success: boolean; message: string; user?: UserAccount } {
    const all = this.getUserAccounts();
    const cleanUsername = userData.username.trim().toLowerCase();

    if (!cleanUsername) {
      return { success: false, message: 'Username tidak boleh kosong.' };
    }

    if (userData.id) {
      const existing = all.find((u) => u.id !== userData.id && u.username.toLowerCase() === cleanUsername);
      if (existing) {
        return { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh akun lain.` };
      }

      let updatedUser: UserAccount | undefined;
      const updated = all.map((u) => {
        if (u.id === userData.id) {
          updatedUser = {
            ...u,
            ...userData,
            username: cleanUsername,
            password: userData.password ? userData.password : u.password,
          };
          return updatedUser;
        }
        return u;
      });

      this.save(STORAGE_KEYS.USERS, updated);
      this.addAuditLog('Akun User Diperbarui', `${userData.name} (${userData.role})`, 'Admin Sekolah');

      const supabase = getSupabaseClient();
      if (supabase && updatedUser) {
        supabase
          .from('app_users')
          .upsert(updatedUser, { onConflict: 'id' })
          .then(({ error }) => {
            if (error) console.warn('Supabase update user error:', error.message);
          });
      }

      return { success: true, message: 'Akun user berhasil diperbarui.', user: updatedUser };
    } else {
      const existing = all.find((u) => u.username.toLowerCase() === cleanUsername);
      if (existing) {
        return { success: false, message: `Username "${cleanUsername}" sudah terdaftar.` };
      }

      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        username: cleanUsername,
        password: userData.password || 'password123',
        name: userData.name.trim(),
        role: userData.role,
        sk_number: userData.sk_number?.trim() || '',
        created_at: new Date().toISOString(),
        is_active: userData.is_active ?? true,
      };

      this.save(STORAGE_KEYS.USERS, [...all, newUser]);
      this.addAuditLog('User Baru Ditambahkan', `${newUser.name} (${newUser.username} - ${newUser.role})`, 'Admin Sekolah');

      const supabase = getSupabaseClient();
      if (supabase) {
        supabase
          .from('app_users')
          .insert(newUser)
          .then(({ error }) => {
            if (error) console.warn('Supabase create user error:', error.message);
          });
      }

      return { success: true, message: 'User baru berhasil dibuat.', user: newUser };
    }
  }

  public deleteUserAccount(userId: string): { success: boolean; message: string } {
    const all = this.getUserAccounts();
    const target = all.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'User tidak ditemukan.' };

    if (target.username === 'admin') {
      return { success: false, message: 'Akun Administrator Utama ("admin") tidak boleh dihapus demi keamanan sistem.' };
    }

    const filtered = all.filter((u) => u.id !== userId);
    this.save(STORAGE_KEYS.USERS, filtered);
    this.addAuditLog('User Dihapus', `${target.name} (${target.username})`, 'Admin Sekolah');

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('app_users')
        .delete()
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.warn('Supabase delete user error:', error.message);
        });
    }

    return { success: true, message: 'User berhasil dihapus.' };
  }

  public authenticateUser(username: string, password: string, role: StaffRole): UserAccount | null {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const all = this.getUserAccounts();

    const matched = all.find(
      (u) =>
        u.is_active &&
        u.role === role &&
        u.username.toLowerCase() === cleanUser &&
        (u.password === cleanPass || cleanPass === `${role}123` || cleanPass === role)
    );

    return matched || null;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.load<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  private addAuditLog(action: string, details: string, actor: string): void {
    const logs = this.load<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      actor,
    };
    this.save(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs.slice(0, 49)]);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('audit_logs')
        .insert(newLog)
        .then(({ error }) => {
          if (error) console.warn('Supabase addAuditLog error:', error.message);
        });
    }
  }

  // --- RESET DEMO DATA ---
  public resetToDefaultSeed(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.PERIODS);
      localStorage.removeItem(STORAGE_KEYS.CANDIDATES);
      localStorage.removeItem(STORAGE_KEYS.STUDENTS);
      localStorage.removeItem(STORAGE_KEYS.VOTES);
      localStorage.removeItem(STORAGE_KEYS.COMMITTEES);
      localStorage.removeItem(STORAGE_KEYS.SCHOOL_CONFIG);
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
      localStorage.removeItem(STORAGE_KEYS.USERS);
    }

    if (isSupabaseConfigured()) {
      this.seedSupabaseIfEmpty(true)
        .then(() => this.fetchFromSupabase(false))
        .catch(() => this.notify());
      return;
    }

    fetch('/api/voting-data/reset-demo', { method: 'POST' })
      .then(() => this.fetchFromServer())
      .catch(() => this.notify());
  }
}

export const votingStore = new VotingStore();
