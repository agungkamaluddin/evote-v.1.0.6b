import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client Initialization Module
 *
 * Di lingkungan produksi (Vercel / .env), tambahkan variabel:
 * VITE_SUPABASE_URL=https://xyzcompany.supabase.co
 * VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConnected: boolean;
  source?: 'env' | 'local';
}

const CONFIG_KEY = 'evoting_supabase_config';

let cachedClient: SupabaseClient | null = null;
let cachedSignature = '';

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
  const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

  // Prioritize environment variables when deployed on Vercel or .env
  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return {
      supabaseUrl: envUrl,
      supabaseAnonKey: envKey,
      isConnected: true,
      source: 'env',
    };
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const url = (parsed?.supabaseUrl || '').trim();
        const key = (parsed?.supabaseAnonKey || '').trim();
        return {
          supabaseUrl: url,
          supabaseAnonKey: key,
          isConnected: Boolean(url && key),
          source: 'local',
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse supabase config', e);
  }

  return {
    supabaseUrl: '',
    supabaseAnonKey: '',
    isConnected: false,
    source: 'local',
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({
        supabaseUrl: config.supabaseUrl.trim(),
        supabaseAnonKey: config.supabaseAnonKey.trim(),
        isConnected: Boolean(config.supabaseUrl.trim() && config.supabaseAnonKey.trim()),
      })
    );
  }
  cachedClient = null;
  cachedSignature = '';
}

export function clearStoredSupabaseConfig(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(CONFIG_KEY);
  }
  cachedClient = null;
  cachedSignature = '';
}

export function isSupabaseConfigured(): boolean {
  const cfg = getStoredSupabaseConfig();
  return Boolean(cfg.isConnected && cfg.supabaseUrl && cfg.supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getStoredSupabaseConfig();
  if (!cfg.isConnected || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    cachedClient = null;
    cachedSignature = '';
    return null;
  }

  const signature = `${cfg.supabaseUrl}::${cfg.supabaseAnonKey}`;
  if (cachedClient && cachedSignature === signature) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    cachedSignature = signature;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{ ok: boolean; message: string; needsSchema?: boolean }> {
  const cfg = getStoredSupabaseConfig();
  const targetUrl = (customUrl ?? cfg.supabaseUrl).trim();
  const targetKey = (customKey ?? cfg.supabaseAnonKey).trim();

  if (!targetUrl || !targetKey) {
    return {
      ok: false,
      message: 'Project URL dan Anon Public Key wajib diisi.',
    };
  }

  if (!targetUrl.startsWith('https://') || !targetUrl.includes('.supabase.co')) {
    return {
      ok: false,
      message: 'Format Project URL tidak valid. Pastikan diawali https://...supabase.co',
    };
  }

  try {
    const tempClient = createClient(targetUrl, targetKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await tempClient.from('periods').select('id').limit(1);
    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Could not find the table')
      ) {
        return {
          ok: false,
          needsSchema: true,
          message:
            'Kredensial valid, tetapi tabel database belum dibuat. Silakan salin dan jalankan skrip SQL dari Tab 1 di Supabase SQL Editor.',
        };
      }
      return {
        ok: false,
        message: `Gagal terhubung ke Supabase: ${error.message}`,
      };
    }

    return {
      ok: true,
      message: 'Terhubung ke Supabase PostgreSQL! Database siap digunakan secara real-time.',
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Koneksi gagal: ${err?.message || 'Periksa kembali URL dan Anon Key.'}`,
    };
  }
}
