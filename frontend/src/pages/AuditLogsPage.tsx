import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  X,
  Copy,
  Check
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | 'PERMIT' | 'DENY'>('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
      const res = await fetch(`${apiUrl}/audit-logs`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch {
      // Keep state if offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (decisionFilter !== 'ALL' && log.decision !== decisionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSub = log.subject_identifier?.toLowerCase().includes(q);
      const matchRes = log.resource_key?.toLowerCase().includes(q);
      const matchAct = log.action?.toLowerCase().includes(q);
      const matchReq = log.request_id?.toLowerCase().includes(q);
      return matchSub || matchRes || matchAct || matchReq;
    }
    return true;
  });

  const totalLogs = logs.length;
  const permitLogs = logs.filter((l) => l.decision === 'PERMIT').length;
  const denyLogs = logs.filter((l) => l.decision === 'DENY').length;

  const handleCopySnapshot = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Immutable Compliance Audit Logs</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                Oracle ORDS & SQLite Fallback
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Chronological ledger of every authorization request evaluated by the ABAC engine with contextual snapshots.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Total Audited Events</span>
          <h3 className="text-2xl font-bold text-white mt-1">{totalLogs}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Immutable Records</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Permit Decisions</span>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">{permitLogs}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Authorized Accesses</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Deny Decisions</span>
          <h3 className="text-2xl font-bold text-rose-400 mt-1">{denyLogs}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Enforced Blocks</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Persistence Layer</span>
          <h3 className="text-2xl font-bold text-brand-400 mt-1">100% Durable</h3>
          <p className="text-[11px] text-slate-500 mt-1">Local Fallback + ORDS</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by request ID, subject, resource, action..."
            className="w-full bg-[#161726] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#161726] border border-white/5 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#161726] text-slate-300">All Decisions</option>
              <option value="PERMIT" className="bg-[#161726] text-emerald-400">PERMIT Only</option>
              <option value="DENY" className="bg-[#161726] text-rose-400">DENY Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View (Hidden on mobile < 768px) */}
      <div className="hidden md:block rounded-2xl bg-[#161726] border border-white/5 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#11121d] border-b border-white/5 text-[11px] text-slate-400 font-medium">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Resource Target</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4 font-mono text-brand-300 text-[11px]">
                    {log.request_id || log.id?.slice(0, 16)}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    {log.subject_identifier || 'Unknown Subject'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-indigo-300">
                    {log.resource_key}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {log.decision === 'PERMIT' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        PERMIT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/30">
                        <XCircle className="w-3 h-3" />
                        DENY
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {log.evaluation_duration_ms ? `${log.evaluation_duration_ms} ms` : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                      title="Inspect Snapshot"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Cards View (Shown on < 768px for zero horizontal overflow) */}
      <div className="md:hidden space-y-3">
        {filteredLogs.map((log, idx) => (
          <div
            key={log.id || idx}
            className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-brand-300 text-xs font-semibold">
                {log.request_id || log.id?.slice(0, 16)}
              </span>
              {log.decision === 'PERMIT' ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  PERMIT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/30">
                  <XCircle className="w-3 h-3" />
                  DENY
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Subject:</span>
                <span className="font-medium text-white">{log.subject_identifier}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Resource:</span>
                <span className="font-mono text-indigo-300 text-[11px]">{log.resource_key}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Action:</span>
                <span className="font-mono text-amber-300">{log.action}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Timestamp:</span>
                <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(log)}
              className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Context Snapshot</span>
            </button>
          </div>
        ))}
      </div>

      {/* Snapshot Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#161726] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#11121d] border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Audit Event Context Snapshot</h3>
                <span className="text-[11px] font-mono text-brand-300">{selectedLog.request_id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Evaluation Decision:</span>
                <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                  selectedLog.decision === 'PERMIT' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}>
                  {selectedLog.decision}
                </span>
              </div>

              <div className="rounded-xl bg-[#0d0e17] border border-white/5 p-3 overflow-x-auto">
                <pre className="text-[11px] text-brand-200 font-mono leading-relaxed overflow-x-auto">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => handleCopySnapshot(selectedLog)}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-purple-glow transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
