import React from 'react';
import {
  Settings,
  Database,
  Shield,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">ABAC Engine Configuration & Security Settings</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
              Active Production
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Global evaluation parameters, database persistence architecture, and security policies.
          </p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* Section 1: Decision Logic Strategy */}
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Shield className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white">Policy Decision Point (PDP) Strategy</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-[#11121d] border border-white/5 space-y-1">
              <span className="text-slate-400 font-medium">Default Decision</span>
              <p className="text-white font-mono font-bold text-sm">DENY (Zero-Trust Baseline)</p>
              <p className="text-[11px] text-slate-500">Unmatched access requests are blocked automatically.</p>
            </div>

            <div className="p-3 rounded-xl bg-[#11121d] border border-white/5 space-y-1">
              <span className="text-slate-400 font-medium">Conflict Resolution</span>
              <p className="text-white font-mono font-bold text-sm">Deny-Overrides</p>
              <p className="text-[11px] text-slate-500">Explicit DENY overrides all matching PERMIT rules.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Data Persistence & Architecture */}
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Database className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Persistence & Service Endpoints</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#11121d] border border-white/5 flex items-center justify-between gap-3">
              <div>
                <span className="text-white font-semibold block">Oracle ORDS REST API Module</span>
                <span className="text-slate-400 text-[11px]">Primary store for policies, users, resources, and enterprise catalog.</span>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#11121d] border border-white/5 flex items-center justify-between gap-3">
              <div>
                <span className="text-white font-semibold block">Local SQLite Audit Fallback Store</span>
                <span className="text-slate-400 text-[11px]">Guarantees 100% durable audit trail persistence in backend/data/audit_fallback.db.</span>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#11121d] border border-white/5 flex items-center justify-between gap-3">
              <div>
                <span className="text-white font-semibold block">Flask ABAC Engine Daemon</span>
                <span className="text-slate-400 text-[11px]">Running on port 5000 with CORS enabled for React frontend client.</span>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Identity & Cryptography */}
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Cryptographic Standards</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#11121d] border border-white/5">
              <span className="text-slate-400 block mb-1">Hash Algorithm</span>
              <span className="font-mono text-white font-bold">PBKDF2-HMAC-SHA256</span>
            </div>
            <div className="p-3 rounded-xl bg-[#11121d] border border-white/5">
              <span className="text-slate-400 block mb-1">Audit Signature</span>
              <span className="font-mono text-white font-bold">SHA-256 HMAC</span>
            </div>
            <div className="p-3 rounded-xl bg-[#11121d] border border-white/5">
              <span className="text-slate-400 block mb-1">ABAC Specification</span>
              <span className="font-mono text-white font-bold">NIST SP 800-162</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
