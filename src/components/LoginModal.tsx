import React, { useState } from 'react';
import { ShieldCheck, Users, Lock, User, AlertCircle, X, ChevronRight } from 'lucide-react';
import type { AuthStaffUser, StaffRole } from '../types/index.ts';
import { votingStore } from '../services/storage.ts';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthStaffUser) => void;
  initialRole?: StaffRole;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRole = 'panitia',
}) => {
  const [selectedRole, setSelectedRole] = useState<StaffRole>(initialRole);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Mohon isi username dan password Anda.');
      return;
    }

    // Authenticate with votingStore (dynamic users created by admin or initial users)
    const user = votingStore.authenticateUser(cleanUser, cleanPass, selectedRole);

    if (user) {
      onLoginSuccess({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        sk_number: user.sk_number,
      });
      onClose();
      return;
    }

    // Production authentication error notice
    if (selectedRole === 'admin') {
      setErrorMsg('Username atau password Administrator salah. Silakan periksa kembali.');
    } else {
      setErrorMsg('Username atau password Panitia Pemilihan salah. Silakan periksa kembali.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 border border-slate-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                Portal Login Petugas
              </h3>
              <p className="text-xs text-slate-400">
                Pilih peran Anda untuk mengakses panel khusus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Role Switcher */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Masuk Sebagai:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('panitia');
                  setErrorMsg('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'panitia'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Panitia Pemilihan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setErrorMsg('');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Admin Sekolah</span>
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={selectedRole === 'admin' ? 'admin' : 'panitia'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Login ke Dashboard {selectedRole === 'admin' ? 'Admin' : 'Panitia'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Security Information Footer */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Akses khusus untuk Panitia Pemilihan dan Administrator terdaftar.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
