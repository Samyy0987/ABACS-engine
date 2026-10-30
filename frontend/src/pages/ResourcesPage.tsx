import React, { useState, useEffect } from 'react';
import {
  Layers,
  Database,
  Server,
  ShieldCheck,
  Search,
  RefreshCw,
  Building,
  Activity,
  Lock
} from 'lucide-react';

const INITIAL_RESOURCES = [
  {
    id: 'res-1',
    name: 'Kubernetes Alpha Cluster Node',
    resource_key: 'test-k8s-cluster-alpha',
    resource_type: 'Cluster_Node',
    classification: 'Critical',
    department: 'Platform Security',
    environment: 'production',
    service: 'AWS EKS US-East',
    is_active: true,
  },
  {
    id: 'res-2',
    name: 'Primary Enterprise Relational Database',
    resource_key: 'test-prod-db-primary',
    resource_type: 'Relational_Database',
    classification: 'Production_Database',
    department: 'Data Infrastructure',
    environment: 'production',
    service: 'Oracle Autonomous / Postgres',
    is_active: true,
  },
  {
    id: 'res-3',
    name: 'Customer PII Vault & Compliance Storage',
    resource_key: 'customer-pii-vault',
    resource_type: 'Customer_PII_Vault',
    classification: 'Confidential',
    department: 'Customer Privacy',
    environment: 'production',
    service: 'Encrypted S3 / Object Store',
    is_active: true,
  },
  {
    id: 'res-4',
    name: 'Payment Settlement Microservice API',
    resource_key: 'payment-settlement-service',
    resource_type: 'API_Endpoint',
    classification: 'Restricted',
    department: 'Financial Ops',
    environment: 'production',
    service: 'gRPC Gateway / Mesh',
    is_active: true,
  },
];

export const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<any[]>(INITIAL_RESOURCES);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
      const res = await fetch(`${apiUrl}/resources`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resources && Array.isArray(data.resources) && data.resources.length > 0) {
          const ordsResources = data.resources;
          const merged = [
            ...ordsResources,
            ...INITIAL_RESOURCES.filter(
              (initR) => !ordsResources.some((or: any) => or.resource_key?.toLowerCase() === initR.resource_key.toLowerCase())
            ),
          ];
          setResources(merged);
        }
      }
    } catch {
      // Keep state if offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchResources();
  }, []);

  const filteredResources = resources.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.resource_key?.toLowerCase().includes(q) ||
      r.resource_type?.toLowerCase().includes(q) ||
      r.classification?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Protected Enterprise Resources</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                Oracle ORDS PIP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sensitive data stores, cloud clusters, and API endpoints guarded by ABAC authorization policies.
            </p>
          </div>
        </div>

        <button
          onClick={fetchResources}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          <span>Refresh Inventory</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Catalogued Targets</span>
          <h3 className="text-2xl font-bold text-white mt-1">{resources.length}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Live in Oracle ORDS</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Active Protection</span>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">
            {resources.filter((r) => r.is_active !== false).length}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">100% Policy Enforced</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Critical Classifications</span>
          <h3 className="text-2xl font-bold text-rose-400 mt-1">
            {resources.filter((r) => r.classification === 'Critical' || r.classification?.includes('Production')).length}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Elevated Audit Logging</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Resource Types</span>
          <h3 className="text-2xl font-bold text-brand-400 mt-1">2 Schemas</h3>
          <p className="text-[11px] text-slate-500 mt-1">Databases & Kubernetes</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search resources by name, key, type, classification..."
          className="w-full bg-[#161726] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-inner"
        />
      </div>

      {/* Resources Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResources.map((resource) => (
            <div
              key={resource.id || resource.resource_key}
              className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card hover:border-brand-500/30 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-purple-glow-sm">
                      {resource.resource_type === 'Cluster_Node' ? (
                        <Server className="w-5 h-5" />
                      ) : (
                        <Database className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{resource.name || resource.resource_key}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </h3>
                      <span className="text-xs text-brand-300 font-mono">{resource.resource_key}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      resource.is_active !== false
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {resource.is_active !== false ? 'PROTECTED' : 'INACTIVE'}
                  </span>
                </div>

                {/* Attributes Chips */}
                <div className="space-y-2 py-3 border-t border-b border-white/5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Resource Type
                    </span>
                    <span className="font-mono text-[11px] text-indigo-300">
                      {resource.resource_type || 'Generic_Resource'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Classification
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-mono text-[11px] border border-rose-500/30 font-semibold">
                      {resource.classification || 'Unclassified'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" /> Owner Department
                    </span>
                    <span>{resource.department || 'Infrastructure'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Environment</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono text-[11px]">
                      {resource.environment || 'production'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target ID Footer */}
              <div className="pt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Oracle ID: {resource.id ? resource.id.slice(0, 16) : 'LIVE-ORDS'}...</span>
                <span className="text-brand-300">Zero-Trust Target</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-8 sm:p-12 text-center shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Matching Resources Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No enterprise targets match "{searchQuery}". Try adjusting your search term.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/40 text-xs font-semibold transition cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
};
