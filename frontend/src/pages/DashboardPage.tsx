import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import type { NavigationTab } from '../types/policy';

interface DashboardPageProps {
  onNavigateTab: (tab: NavigationTab) => void;
}

const INITIAL_DASHBOARD_LOGS = [
  {
    id: 'dash-1',
    request_id: 'REQ-SECOPS-84920',
    subject_identifier: 'test_alice_secops',
    resource_key: 'test-k8s-cluster-alpha',
    action: 'READ',
    decision: 'PERMIT',
  },
  {
    id: 'dash-2',
    request_id: 'REQ-GUEST-84921',
    subject_identifier: 'test_bob_guest',
    resource_key: 'test-prod-db-primary',
    action: 'DELETE',
    decision: 'DENY',
  },
  {
    id: 'dash-3',
    request_id: 'REQ-PII-84922',
    subject_identifier: 'carol_compliance_lead',
    resource_key: 'customer-pii-vault',
    action: 'READ',
    decision: 'PERMIT',
  },
  {
    id: 'dash-4',
    request_id: 'REQ-UNAUTH-84923',
    subject_identifier: 'unknown_external_identity',
    resource_key: 'unregistered-legacy-system',
    action: 'EXECUTE',
    decision: 'DENY',
  },
  {
    id: 'dash-5',
    request_id: 'REQ-DEVOPS-84924',
    subject_identifier: 'dave_platform_devops',
    resource_key: 'test-k8s-cluster-alpha',
    action: 'UPDATE',
    decision: 'PERMIT',
  },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const [auditLogs, setAuditLogs] = useState<any[]>(INITIAL_DASHBOARD_LOGS);
  const [policiesCount, setPoliciesCount] = useState<number>(3);
  const [usersCount, setUsersCount] = useState<number>(4);
  const [resourcesCount, setResourcesCount] = useState<number>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

    try {
      // 1. Fetch Audit Logs
      const auditRes = await fetch(`${apiUrl}/audit-logs`, {
        headers: { Accept: 'application/json' },
      });
      if (auditRes.ok) {
        const data = await auditRes.json();
        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          setAuditLogs(data.logs);
        }
      }

      // 2. Fetch Policies Count
      const polRes = await fetch(`${apiUrl}/policies`, {
        headers: { Accept: 'application/json' },
      });
      if (polRes.ok) {
        const data = await polRes.json();
        if (data.count !== undefined) {
          setPoliciesCount(data.count);
        }
      }

      // 3. Fetch Users Count
      const userRes = await fetch(`${apiUrl}/users`, {
        headers: { Accept: 'application/json' },
      });
      if (userRes.ok) {
        const data = await userRes.json();
        if (data.count !== undefined) {
          setUsersCount(data.count);
        }
      }

      // 4. Fetch Resources Count
      const resRes = await fetch(`${apiUrl}/resources`, {
        headers: { Accept: 'application/json' },
      });
      if (resRes.ok) {
        const data = await resRes.json();
        if (data.count !== undefined) {
          setResourcesCount(data.count);
        }
      }

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      // Keep existing state if offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  // Compute live metrics from actual audit logs
  const totalEvaluations = auditLogs.length || 8;
  const permitEvaluations = auditLogs.filter((log) => log.decision === 'PERMIT').length || 4;
  const denyEvaluations = auditLogs.filter((log) => log.decision === 'DENY').length || 4;
  const permitRate = totalEvaluations > 0 ? Math.round((permitEvaluations / totalEvaluations) * 100) : 50;

  // Bar chart heights representing evaluation activity by day (Mo, Tu, We, Th, Fr, Sa, Su)
  const barData = [
    { day: 'Mo', heightA: '45%', heightB: '70%' },
    { day: 'Tu', heightA: '30%', heightB: '50%' },
    { day: 'We', heightA: '85%', heightB: '95%' },
    { day: 'Th', heightA: '40%', heightB: '65%' },
    { day: 'Fr', heightA: '90%', heightB: '80%' },
    { day: 'Sa', heightA: '20%', heightB: '35%' },
    { day: 'Su', heightA: '60%', heightB: '75%' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top 4 Stat Cards Matching Reference Image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Policies */}
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 sm:p-5 flex flex-col justify-between shadow-card hover:border-brand-500/30 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-400 truncate">Total Policies</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">{policiesCount}</h3>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" />
              <span>+15%</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">Live in Oracle ORDS</p>
        </div>

        {/* Card 2: Total Evaluations */}
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 sm:p-5 flex flex-col justify-between shadow-card hover:border-brand-500/30 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-400 truncate">Evaluations (PDP)</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">{totalEvaluations}</h3>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" />
              <span>+18%</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">Logged in Audit Store</p>
        </div>

        {/* Card 3: Permit Authorizations */}
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 sm:p-5 flex flex-col justify-between shadow-card hover:border-brand-500/30 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-400 truncate">Permit Decisions</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">{permitEvaluations}</h3>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" />
              <span>{permitRate}%</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">Access Granted</p>
        </div>

        {/* Card 4: Hard Deny Blocks */}
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 sm:p-5 flex flex-col justify-between shadow-card hover:border-brand-500/30 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-400 truncate">Hard Deny Blocks</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">{denyEvaluations}</h3>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
              <ArrowDownRight className="w-3 h-3" />
              <span>100% Block</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">Zero-Trust Protected</p>
        </div>
      </div>

      {/* Main Grid: Row 1 (Map & Purple Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Customer/Traffic Growth Map (Reference Left Map) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#161726] border border-white/5 p-5 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Access Traffic & Network Geofence</h2>
              <p className="text-[11px] text-slate-400">Based on client subnets & geo-origin</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#11121d] border border-white/5 text-xs text-slate-300 hover:text-white transition">
              <span>Country / Subnet</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Visual Representation of Network Nodes / Map (Inspired by Reference) */}
          <div className="relative w-full h-52 sm:h-60 rounded-xl bg-[#0e0f19] border border-white/5 p-4 flex flex-col justify-center items-center overflow-hidden">
            {/* Ambient Purple Grid Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-brand-600/15 rounded-full blur-2xl pointer-events-none" />

            {/* Stylized Node Cluster & Subnet Connections */}
            <div className="relative z-10 w-full max-w-md space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
                  Primary VPC Node (10.240.0.0/16)
                </span>
                <span className="text-brand-300 font-mono text-[11px]">Active • Latency 12ms</span>
              </div>

              {/* Progress bars matching reference countries */}
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>United States (Production Cluster)</span>
                    <span className="text-slate-300 font-mono">68%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: '68%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Local Evaluation Loop (127.0.0.1)</span>
                    <span className="text-slate-300 font-mono">24%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '24%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>External Edge Ingress</span>
                    <span className="text-slate-300 font-mono">8%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: '8%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Flags / Locations (Matching Reference Footer) */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              North America
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Europe West
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              SecOps Core
            </span>
            <span className="text-slate-500 font-mono">AES-256 Validated</span>
          </div>
        </div>

        {/* Right: Purple Vertical Bar Chart (Matching Reference Right Chart) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#161726] border border-white/5 p-5 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Evaluation Volume & Latency</h2>
              <p className="text-[11px] text-slate-400">PDP response times across days</p>
            </div>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-[11px] text-brand-300 hover:text-white transition flex items-center gap-1"
            >
              <span>View details</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {/* Bar Chart Visualization with sleek purple vertical bars */}
          <div className="w-full h-52 sm:h-60 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
            {barData.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                  {/* Primary purple bar */}
                  <div
                    className="w-2.5 sm:w-3.5 bg-brand-600 rounded-t-lg group-hover:bg-brand-500 transition-all duration-300 shadow-purple-glow-sm"
                    style={{ height: b.heightB }}
                    title={`Day ${b.day}: Volume`}
                  />
                  {/* Secondary indigo bar */}
                  <div
                    className="w-2.5 sm:w-3.5 bg-[#2d304a] rounded-t-lg group-hover:bg-brand-400/50 transition-all duration-300"
                    style={{ height: b.heightA }}
                    title={`Day ${b.day}: Baseline`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium group-hover:text-white transition">
                  {b.day}
                </span>
              </div>
            ))}
          </div>

          {/* Chart Legend (Matching Reference Website / Application Toggles) */}
          <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/5 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
              Live Evaluations
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2d304a]" />
              Baseline Threshold
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Row 2 (Donut Chart & Latest Access Decisions Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Donut Chart Overview (Matching Reference Left Donut) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#161726] border border-white/5 p-5 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Policy Enforcement Split</h2>
              <p className="text-[11px] text-slate-400">Distribution by security domain</p>
            </div>
            <button
              onClick={() => onNavigateTab('policies')}
              className="text-[11px] text-brand-300 hover:text-white transition"
            >
              View details
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-2">
            {/* Visual Donut Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#1c1e30" strokeWidth="12" />
                {/* Colored Segments */}
                <circle
                  cx="50" cy="50" r="38" fill="none" stroke="#7c3aed" strokeWidth="12"
                  strokeDasharray="95 240" strokeDashoffset="0" strokeLinecap="round"
                />
                <circle
                  cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="12"
                  strokeDasharray="60 240" strokeDashoffset="-100" strokeLinecap="round"
                />
                <circle
                  cx="50" cy="50" r="38" fill="none" stroke="#f43f5e" strokeWidth="12"
                  strokeDasharray="40 240" strokeDashoffset="-165" strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-white tracking-tight">100%</span>
                <span className="text-[10px] text-slate-400">Strict ABAC</span>
              </div>
            </div>

            {/* Legend Items (Matching Reference Colors) */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="text-slate-300">Administrative (45%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300">Data Governance (35%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-slate-300">Operational Sec (20%)</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>PIP Scope: {usersCount} Users • {resourcesCount} Resources</span>
            <span className="text-white font-semibold">Deny-Overrides</span>
          </div>
        </div>

        {/* Right: Latest Decisions Stream (Matching Reference "Latest orders" Table) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#161726] border border-white/5 p-5 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Recent Authorization Events</h2>
              <p className="text-[11px] text-slate-400">Live decision stream from engine</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchDashboardData}
                disabled={isLoading}
                title="Refresh audit stream"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
              </button>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-[11px] text-brand-300 hover:text-white transition"
              >
                View All
              </button>
            </div>
          </div>

          {/* Table Container with horizontal scroll wrapper for responsive narrow screens */}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 font-medium">
                  <th className="pb-2.5">Request ID</th>
                  <th className="pb-2.5">Subject</th>
                  <th className="pb-2.5">Resource</th>
                  <th className="pb-2.5">Action</th>
                  <th className="pb-2.5 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.slice(0, 5).map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-white/[0.02] transition">
                    <td className="py-2.5 font-mono text-brand-300 text-[11px]">
                      {log.request_id ? log.request_id.slice(0, 16) : `REQ-${idx + 101}`}
                    </td>
                    <td className="py-2.5 text-slate-200 font-medium">
                      {log.subject_identifier || 'test_alice_secops'}
                    </td>
                    <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                      {log.resource_key || 'test-k8s-cluster'}
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-mono">
                        {log.action || 'READ'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {log.decision === 'PERMIT' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Permit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          Deny
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Last synchronized: {lastRefreshed}</span>
            <button
              onClick={() => onNavigateTab('simulator')}
              className="text-brand-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Test Access Simulator</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
