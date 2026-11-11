import React, { useState, useEffect } from 'react';
import {
  Database,
  Copy,
  Check,
  Code2,
  Terminal,
  Layers,
  ExternalLink,
  Save,
  Radio,
  Globe,
  AlertTriangle,
  X,
  FileCode,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, FOLDER_STRUCTURE_GUIDE } from '../services/supabaseSchema';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  clearStoredSupabaseConfig,
  testSupabaseConnection,
} from '../services/supabaseClient';
import { votingStore } from '../services/storage';

interface SupabaseGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'instructions' | 'deploy' | 'connect' | 'folder'>('sql');

  // Supabase connection credentials
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.supabaseUrl);
  const [key, setKey] = useState(currentConfig.supabaseAnonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Close on Escape key when rendered as popup
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // If used as controlled modal and isOpen is false, don't render
  if (isOpen === false) return null;

  const handleCopySql = () => {
    const cleanSql = SUPABASE_SQL_SCHEMA.trim();
    navigator.clipboard.writeText(cleanSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    const cleanKey = key.trim();

    if (!cleanUrl || !cleanKey) {
      setConnectionFeedback({
        type: 'error',
        message: 'Mohon masukkan Project URL dan Anon Public Key Supabase terlebih dahulu.',
      });
      return;
    }

    setIsTesting(true);
    setConnectionFeedback(null);

    try {
      const testRes = await testSupabaseConnection(cleanUrl, cleanKey);
      saveStoredSupabaseConfig({
        supabaseUrl: cleanUrl,
        supabaseAnonKey: cleanKey,
        isConnected: testRes.ok,
      });

      if (testRes.ok) {
        await votingStore.reinitializeConnection();
        setConnectionFeedback({
          type: 'success',
          message: testRes.message,
        });
      } else {
        setConnectionFeedback({
          type: testRes.needsSchema ? 'warning' : 'error',
          message: testRes.message,
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnectSupabase = async () => {
    clearStoredSupabaseConfig();
    setUrl('');
    setKey('');
    await votingStore.reinitializeConnection();
    setConnectionFeedback({
      type: 'warning',
      message: 'Koneksi Supabase lokal dihapus. Aplikasi kembali menggunakan penyimpanan server/lokal bawaan.',
    });
  };

  const content = (
    <div className="space-y-6">
      {/* Warning Notice about the ERROR 42601 syntax error */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-900 shadow-xs">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-extrabold text-sm text-amber-950">
            Penting: Solusi Error SQL Supabase (<code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">syntax error at or near "export"</code>)
          </p>
          <p className="text-amber-800 leading-relaxed">
            Error terjadi karena Anda menyalin file TypeScript (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">src/services/supabaseSchema.ts</code>) yang memiliki kode <code className="font-mono text-rose-700 bg-amber-100 px-1 py-0.5 rounded">export const SUPABASE_SQL_SCHEMA = ...</code>. Supabase PostgreSQL hanya menerima perintah SQL murni.
          </p>
          <p className="text-amber-900 font-semibold pt-1">
            Gunakan tombol hijau <strong>"Salin Seluruh SQL Schema (Pure SQL)"</strong> di bawah ini, atau gunakan file <code className="font-mono bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950 font-bold">/supabase_schema.sql</code> yang sudah kami sediakan di root project.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              BaaS & Backend Integration Hub
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5" />
              Panduan Vercel Hosting
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Panduan Database Supabase & Deploy Web
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Arsitektur tabel, Stored Procedure atomik anti double-voting, Row Level Security, kredensial cloud, dan langkah deploy Vercel.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopySql}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
          >
            {copiedSql ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>SQL Murni Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Seluruh SQL Schema (Pure SQL)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'sql'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>1. Skema SQL Murni (DDL + RPC)</span>
        </button>

        <button
          onClick={() => setActiveTab('instructions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'instructions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>2. Setup Supabase 4 Langkah</span>
        </button>

        <button
          onClick={() => setActiveTab('deploy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'deploy'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>3. Panduan Deploy Vercel</span>
        </button>

        <button
          onClick={() => setActiveTab('connect')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'connect'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>4. Hubungkan URL & Anon Key</span>
        </button>

        <button
          onClick={() => setActiveTab('folder')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'folder'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>5. Struktur Folder</span>
        </button>
      </div>

      {/* ================= TAB 1: SQL SCHEMA ================= */}
      {activeTab === 'sql' && (
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">supabase_schema.sql (Pure PostgreSQL DDL)</span>
              <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 border border-slate-700">Bebas dari sintaks TS/JS</span>
            </div>
            <button
              onClick={handleCopySql}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Tersalin!' : 'Salin Kode SQL Murni'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Skrip ini berisi: Extension UUID, Enum <code className="text-indigo-300">org_type</code> & <code className="text-indigo-300">session_status</code>, tabel <code className="text-emerald-300">periods</code>, <code className="text-emerald-300">committees</code>, <code className="text-emerald-300">candidates</code>, <code className="text-emerald-300">students</code> (DPT), <code className="text-emerald-300">votes</code> (anonim rahasia), Stored Procedure <code className="text-amber-300">submit_vote_atomic</code>, RLS Policies, dan Realtime publications.
          </p>

          <pre className="font-mono text-xs text-slate-300 overflow-x-auto p-4 bg-slate-950 rounded-xl leading-relaxed max-h-[550px] overflow-y-auto selection:bg-emerald-500 selection:text-slate-950">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      )}

      {/* ================= TAB 2: PANDUAN SETUP 4 LANGKAH ================= */}
      {activeTab === 'instructions' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="max-w-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Langkah Singkat Menjalankan Database Cloud Supabase
            </h3>
            <p className="text-xs text-slate-500">
              Ikuti 4 langkah terverifikasi berikut untuk mengaktifkan database Supabase PostgreSQL:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                1
              </div>
              <h4 className="font-bold text-sm text-slate-900">
                Buat Project di Supabase
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a>, buat akun (gratis), buat Organization, lalu buat New Project (misal: "evoting-sekolah"). Simpan database password Anda.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                2
              </div>
              <h4 className="font-bold text-sm text-slate-900">
                Jalankan SQL Script di Supabase SQL Editor
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Di dashboard Supabase, klik menu <strong>SQL Editor</strong> di sidebar kiri, lalu klik <strong>New Query</strong>. Tekan tombol hijau <strong>"Salin Seluruh SQL Schema (Pure SQL)"</strong> di atas, tempel di editor, lalu klik <strong>RUN</strong>. Seluruh 5 tabel, RLS, dan RPC atomik akan otomatis dibuat dalam 3 detik!
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                3
              </div>
              <h4 className="font-bold text-sm text-slate-900">
                Salin Kredensial URL & Anon Key
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Buka menu <strong>Project Settings → API</strong> di Supabase. Salin nilai <strong>Project URL</strong> (contoh: <code>https://xyzcompany.supabase.co</code>) dan <strong>anon public API key</strong>.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                4
              </div>
              <h4 className="font-bold text-sm text-slate-900">
                Hubungkan ke Aplikasi
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda dapat langsung menempelkan URL & Anon Key di Tab <strong>"4. Hubungkan URL & Anon Key"</strong> di modal ini, atau memasukkannya ke file <code>.env</code> lokal / Vercel Environment Variables.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PANDUAN DEPLOY VERCEL ================= */}
      {activeTab === 'deploy' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>Tahapan Detail Deploy E-Voting ke Vercel Hosting</span>
            </h3>
            <p className="text-xs text-slate-500">
              Aplikasi ini adalah Single Page Application berbasis React + Vite yang 100% kompatibel dan siap di-deploy secara instan ke Vercel secara gratis.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h4 className="font-bold text-sm text-slate-900">Push Source Code ke GitHub / GitLab</h4>
              </div>
              <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                Unggah repositori proyek ini ke akun GitHub Anda. File konfigurasi <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">vercel.json</code> sudah otomatis tersedia di root proyek untuk menangani Single Page App client-side routing.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h4 className="font-bold text-sm text-slate-900">Import Repositori di Vercel Dashboard</h4>
              </div>
              <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                Buka <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5">vercel.com <ExternalLink className="w-3 h-3" /></a>, login menggunakan akun GitHub, klik <strong>"Add New... → Project"</strong>, dan pilih repositori e-voting Anda.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h4 className="font-bold text-sm text-slate-900">Konfigurasi Build & Environment Variables</h4>
              </div>
              <div className="text-xs text-slate-600 pl-8 space-y-2">
                <p>Vercel otomatis mendeteksi Framework Preset: <strong>Vite</strong>.</p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                  <p><span className="text-slate-400">Framework:</span> Vite</p>
                  <p><span className="text-slate-400">Build Command:</span> npm run build</p>
                  <p><span className="text-slate-400">Output Directory:</span> dist</p>
                </div>
                <p className="pt-1">
                  Pada bagian <strong>Environment Variables</strong> di halaman import Vercel, tambahkan (opsional jika menggunakan Supabase):
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1 text-slate-800">
                  <p>VITE_SUPABASE_URL = https://your-id.supabase.co</p>
                  <p>VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6...</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                <h4 className="font-bold text-sm text-slate-900">Klik "Deploy" & Selesai!</h4>
              </div>
              <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                Vercel akan menjalankan build dalam 30–60 detik dan memberikan domain publik gratis bersertifikat SSL HTTPS (contoh: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">https://evoting-osis.vercel.app</code>) yang dapat diakses oleh seluruh siswa dan panitia melalui smartphone maupun PC.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: HUBUNGKAN KREDENSIAL ================= */}
      {activeTab === 'connect' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-xl space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Konfigurasi Kredensial Supabase Cloud
            </h3>
            <p className="text-xs text-slate-500">
              Masukkan <strong>Project URL</strong> dan <strong>Anon Public Key</strong> dari dashboard Supabase Anda untuk mengaktifkan database PostgreSQL & Realtime Sync secara langsung. Saat deploy di Vercel, masukkan juga kedua variabel ini di menu <em>Environment Variables</em> Vercel.
            </p>
          </div>

          {currentConfig.source === 'env' && currentConfig.isConnected && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Terhubung Otomatis via Environment Variables</span>
                Aplikasi mendeteksi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> dari konfigurasi server/Vercel.
              </div>
            </div>
          )}

          {connectionFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                connectionFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : connectionFeedback.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{connectionFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Anon / Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <textarea
                rows={3}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="submit"
                disabled={isTesting}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{isTesting ? 'Menguji & Menyinkronkan...' : 'Simpan & Hubungkan Supabase'}</span>
              </button>

              {currentConfig.isConnected && currentConfig.source !== 'env' && (
                <button
                  type="button"
                  onClick={handleDisconnectSupabase}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Putuskan Koneksi
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 5: STRUKTUR FOLDER ================= */}
      {activeTab === 'folder' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Arsitektur & Struktur Direktori E-Voting
          </h3>
          <pre className="font-mono text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto leading-relaxed">
            {FOLDER_STRUCTURE_GUIDE}
          </pre>
        </div>
      )}
    </div>
  );

  // If opened as modal overlay:
  if (isOpen) {
    return (
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Panduan Database Supabase & Deploy Web"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative bg-slate-50 rounded-3xl border border-slate-300 shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-8"
        >
          {onClose && (
            <div className="sticky top-0 z-20 flex justify-end mb-2 pointer-events-none">
              <button
                type="button"
                onClick={onClose}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/95 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 shadow-md text-xs font-bold transition-all cursor-pointer"
                title="Tutup Jendela Panduan"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>
          )}

          {content}

          {onClose && (
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Tutup Panduan</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Otherwise rendered inline
  return content;
};
