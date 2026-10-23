import React, { useState } from 'react';
import {
  Sliders,
  Play,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const [subjectId, setSubjectId] = useState('test_alice_secops');
  const [resourceKey, setResourceKey] = useState('test-k8s-cluster-alpha');
  const [action, setAction] = useState('READ');
  const [role, setRole] = useState('SecOps');
  const [clearance, setClearance] = useState('TopSecret');
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [resourceType, setResourceType] = useState('Cluster_Node');
  const [classification, setClassification] = useState('Critical');
  const [clientIp, setClientIp] = useState('10.240.0.1');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Presets
  const applyPreset = (preset: 'alice_permit' | 'bob_deny' | 'unknown_deny') => {
    if (preset === 'alice_permit') {
      setSubjectId('test_alice_secops');
      setResourceKey('test-k8s-cluster-alpha');
      setAction('READ');
      setRole('SecOps');
      setClearance('TopSecret');
      setMfaEnforced(true);
      setResourceType('Cluster_Node');
      setClassification('Critical');
      setClientIp('10.240.0.1');
    } else if (preset === 'bob_deny') {
      setSubjectId('test_bob_guest');
      setResourceKey('test-prod-db-primary');
      setAction('READ');
      setRole('Guest');
      setClearance('Public');
      setMfaEnforced(false);
      setResourceType('Relational_Database');
      setClassification('Production_Database');
      setClientIp('192.168.1.50');
    } else if (preset === 'unknown_deny') {
      setSubjectId('unknown_external_identity');
      setResourceKey('unregistered-legacy-system');
      setAction('EXECUTE');
      setRole('Anonymous');
      setClearance('Public');
      setMfaEnforced(false);
      setResourceType('Legacy_System');
      setClassification('Unclassified');
      setClientIp('198.51.100.1');
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    const payload = {
      subject_identifier: subjectId,
      resource_key: resourceKey,
      action: action,
      subject_attributes: {
        role: role,
        clearanceLevel: clearance,
        mfaEnforced: mfaEnforced,
        department: role === 'SecOps' ? 'Security' : 'Operations',
      },
      resource_attributes: {
        type: resourceType,
        classification: classification,
        environment: 'staging-test',
      },
      environment_attributes: {
        ipRange: clientIp,
      },
      request_id: `sim-${Date.now()}`,
    };

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
      const res = await fetch(`${apiUrl}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setErrorMsg(data.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reach Flask evaluation PDP engine.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">ABAC Access Simulator & Policy Sandbox</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 font-semibold border border-brand-500/30">
                Live PDP Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Submit attribute context vectors to test real-time authorization logic and inspect decision explanations.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Quick Scenarios:</span>
          <button
            onClick={() => applyPreset('alice_permit')}
            className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition cursor-pointer"
          >
            Alice (Permit)
          </button>
          <button
            onClick={() => applyPreset('bob_deny')}
            className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-medium transition cursor-pointer"
          >
            Bob (Deny)
          </button>
          <button
            onClick={() => applyPreset('unknown_deny')}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Default Deny
          </button>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form */}
        <div className="lg:col-span-7 rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>Access Request Context Parameters</span>
          </h3>

          <form onSubmit={handleEvaluate} className="space-y-4">
            {/* Subject Context */}
            <div className="p-4 rounded-xl bg-[#11121d] border border-white/5 space-y-3">
              <span className="text-xs font-bold text-brand-400 uppercase tracking-wide block">
                1. Subject Context
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Subject Identifier</label>
                  <input
                    type="text"
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Role</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Clearance Level</label>
                  <select
                    value={clearance}
                    onChange={(e) => setClearance(e.target.value)}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="TopSecret">TopSecret</option>
                    <option value="Confidential">Confidential</option>
                    <option value="Standard">Standard</option>
                    <option value="Public">Public</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="mfa"
                    checked={mfaEnforced}
                    onChange={(e) => setMfaEnforced(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-white/20 bg-[#161726]"
                  />
                  <label htmlFor="mfa" className="text-xs text-slate-300 font-medium cursor-pointer">
                    MFA Session Verified
                  </label>
                </div>
              </div>
            </div>

            {/* Resource Context */}
            <div className="p-4 rounded-xl bg-[#11121d] border border-white/5 space-y-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide block">
                2. Resource & Action Context
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Resource Key</label>
                  <input
                    type="text"
                    required
                    value={resourceKey}
                    onChange={(e) => setResourceKey(e.target.value)}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Requested Action</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="READ">READ</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="EXECUTE">EXECUTE</option>
                    <option value="EXPORT">EXPORT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Resource Type</label>
                  <input
                    type="text"
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Classification</label>
                  <input
                    type="text"
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Environment Context */}
            <div className="p-4 rounded-xl bg-[#11121d] border border-white/5 space-y-3">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide block">
                3. Environmental Context
              </span>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Client Source IP / Subnet</label>
                <input
                  type="text"
                  required
                  value={clientIp}
                  onChange={(e) => setClientIp(e.target.value)}
                  placeholder="e.g. 10.240.0.1"
                  className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition duration-150 shadow-purple-glow flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'fill-white'}`} />
              <span>{isLoading ? 'Evaluating via ABAC PDP...' : 'Evaluate Access Request'}</span>
            </button>
          </form>
        </div>

        {/* Right: Decision Result Output */}
        <div className="lg:col-span-5 rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-4">Evaluation PDP Decision Result</h3>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {!result && !errorMsg && (
              <div className="h-64 rounded-xl bg-[#11121d] border border-white/5 p-6 flex flex-col items-center justify-center text-center">
                <Sliders className="w-10 h-10 text-slate-500 mb-3" />
                <h4 className="text-sm font-bold text-white">Sandbox Ready</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Fill in attribute parameters or select a scenario preset and click Evaluate to see the engine's decision tree.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4 animate-in fade-in">
                {/* Decision Banner */}
                <div
                  className={`p-5 rounded-xl border flex items-center justify-between shadow-lg ${
                    result.decision === 'PERMIT'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.decision === 'PERMIT' ? (
                      <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-8 h-8 text-rose-400" />
                    )}
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        Authorization Verdict
                      </span>
                      <h4 className="text-2xl font-bold tracking-tight">
                        {result.decision}
                      </h4>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white/10">
                    {result.decision === 'PERMIT' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                  </span>
                </div>

                {/* Reason & Matched Policies */}
                <div className="p-4 rounded-xl bg-[#11121d] border border-white/5 space-y-2 text-xs">
                  <span className="text-[11px] text-slate-400 font-semibold block">Decision Reason:</span>
                  <p className="text-slate-200 leading-relaxed font-mono text-[11px]">
                    {result.reason || 'Decision evaluated according to ABAC rules.'}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Matched Policy Rules:</span>
                    <div className="flex gap-1">
                      {result.matched_policy_ids && result.matched_policy_ids.length > 0 ? (
                        result.matched_policy_ids.map((pid: string) => (
                          <span
                            key={pid}
                            className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono font-semibold"
                          >
                            {pid}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 font-mono">None (Default Deny)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#11121d] border border-white/5">
                    <span className="text-slate-400 text-[10px] block">PDP Latency</span>
                    <span className="font-mono text-white font-bold text-sm">
                      {result.evaluation_duration_ms ? `${result.evaluation_duration_ms} ms` : '< 1 ms'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#11121d] border border-white/5">
                    <span className="text-slate-400 text-[10px] block">Audit Log Persisted</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-400 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {result.audit_logged ? 'Committed' : 'Recorded'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Algorithm: Deny-Overrides</span>
            <span>Zero-Trust Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
};
