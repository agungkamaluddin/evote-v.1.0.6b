import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  isOpen,
  type,
  message,
  onClose,
}) => {
  if (!isOpen || !message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-3 fade-in duration-200"
    >
      <div
        className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 ${
          type === 'success'
            ? 'bg-slate-900 text-white border-slate-700'
            : type === 'error'
            ? 'bg-rose-900 text-white border-rose-700'
            : 'bg-slate-900 text-white border-slate-700'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          {type === 'error' && (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          {type === 'info' && (
            <Info className="w-5 h-5 text-sky-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
