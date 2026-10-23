import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCode,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  RefreshCw
} from 'lucide-react';
import type { AbacPolicy, PolicyCategory, PolicyEffect } from '../types/policy';
import { INITIAL_MOCK_POLICIES } from '../data/mockPolicies';
import { PolicyMetrics } from '../components/policies/PolicyMetrics';
import { PolicyFilters } from '../components/policies/PolicyFilters';
import { PolicyCard } from '../components/policies/PolicyCard';
import { ActionModal } from '../components/common/ActionModal';

const CATEGORIES: PolicyCategory[] = [
  'Data Protection',
  'API & Microservices',
  'Administrative Access',
  'Compliance & Audit',
  'Network & Geofence',
];

export const SecurityPoliciesPage: React.FC = () => {
  // Policies state (initialized with authentic policies)
  const [policies, setPolicies] = useState<AbacPolicy[]>(INITIAL_MOCK_POLICIES);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<PolicyCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [effectFilter, setEffectFilter] = useState<'ALL' | PolicyEffect>('ALL');

  // Modal & Toast state
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [activePolicy, setActivePolicy] = useState<AbacPolicy | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Attempt to fetch real policies from backend if reachable
  const fetchBackendPolicies = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
      const res = await fetch(`${apiUrl}/policies`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.policies && Array.isArray(data.policies) && data.policies.length > 0) {
          // Normalize backend policies to match AbacPolicy interface
          const liveMapped: AbacPolicy[] = data.policies.map((p: any) => ({
            id: p.id || p.code,
            code: p.code || 'POL-ORDS',
            title: p.name || p.title || 'Untitled Policy',
            description: p.description || 'Enterprise Oracle ORDS Policy',
            category: (p.category === 'Administrative' ? 'Administrative Access' :
                       p.category === 'Data Governance' ? 'Data Protection' :
                       p.category === 'Operational Security' ? 'Compliance & Audit' :
                       'Data Protection') as PolicyCategory,
            effect: (p.effect?.toUpperCase() === 'DENY' ? 'DENY' : 'PERMIT') as PolicyEffect,
            enabled: p.is_enabled !== false,
            priority: p.priority || 1,
            actions: p.actions || ['READ'],
            subject: typeof p.conditions?.subject === 'object' && p.conditions?.subject !== null
              ? {
                  role: Array.isArray(p.conditions.subject.role) ? p.conditions.subject.role : (p.conditions.subject.role ? [p.conditions.subject.role] : ['SecOps']),
                  clearanceLevel: p.conditions.subject.clearanceLevel || 'TopSecret',
                  mfaEnforced: Boolean(p.conditions.subject.mfaEnforced),
                }
              : { role: ['SecOps'], clearanceLevel: 'TopSecret', mfaEnforced: true },
            resource: typeof p.conditions?.resource === 'object' && p.conditions?.resource !== null
              ? {
                  type: p.conditions.resource.type || 'Cluster_Node',
                  classification: (p.conditions.resource.classification || 'Critical') as any,
                }
              : { type: 'Cluster_Node', classification: 'Confidential' },
            environment: typeof p.conditions?.environment === 'object' && p.conditions?.environment !== null
              ? {
                  ipRange: p.conditions.environment.ipRange || '10.240.0.0/16',
                  allowedHours: p.conditions.environment.allowedHours || '24/7',
                }
              : { ipRange: '10.240.0.0/16', allowedHours: '24/7' },
            lastUpdated: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'Active',
            version: p.version || '1.0.0',
          }));

          // Merge live policies at top of existing mock policies
          const combined = [
            ...liveMapped,
            ...INITIAL_MOCK_POLICIES.filter((mp) => !liveMapped.some((lp) => lp.code.toLowerCase() === mp.code.toLowerCase()))
          ];
          setPolicies(combined);
          setIsLiveConnected(true);
        }
      }
    } catch {
      // Keep initial policies if backend is not reached
      setIsLiveConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchBackendPolicies();
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: policies.length };
    CATEGORIES.forEach((cat) => {
      counts[cat] = policies.filter((p) => p.category === cat).length;
    });
    return counts;
  }, [policies]);

  // Filtered policies list
  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      // Category filter
      if (selectedCategory !== 'ALL' && policy.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'ENABLED' && !policy.enabled) return false;
      if (statusFilter === 'DISABLED' && policy.enabled) return false;

      // Effect filter
      if (effectFilter !== 'ALL' && policy.effect !== effectFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = policy.code.toLowerCase().includes(q);
        const matchesTitle = policy.title.toLowerCase().includes(q);
        const matchesDesc = policy.description.toLowerCase().includes(q);
        const matchesActions = policy.actions.some((a) => a.toLowerCase().includes(q));
        const matchesRole = policy.subject.role?.some((r) => r.toLowerCase().includes(q));
        const matchesRes = policy.resource.type.toLowerCase().includes(q);
        const matchesClass = policy.resource.classification.toLowerCase().includes(q);

        return (
          matchesCode ||
          matchesTitle ||
          matchesDesc ||
          matchesActions ||
          Boolean(matchesRole) ||
          matchesRes ||
          matchesClass
        );
      }

      return true;
    });
  }, [policies, selectedCategory, statusFilter, effectFilter, searchQuery]);

  // Handlers for actions
  const handleToggleStatus = (id: string, newStatus: boolean) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: newStatus } : p))
    );
    showToast(
      `Policy status updated to ${newStatus ? 'ENABLED' : 'DISABLED'}.`
    );
  };

  const handleCreateClick = () => {
    setActivePolicy(null);
    setModalType('create');
  };

  const handleEditClick = (policy: AbacPolicy) => {
    setActivePolicy(policy);
    setModalType('edit');
  };

  const handleDeleteClick = (policy: AbacPolicy) => {
    setActivePolicy(policy);
    setModalType('delete');
  };

  const handleSavePolicy = (saved: AbacPolicy) => {
    if (modalType === 'create') {
      setPolicies((prev) => [saved, ...prev]);
      showToast(`Policy ${saved.code} created successfully.`);
    } else if (modalType === 'edit') {
      setPolicies((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      showToast(`Policy ${saved.code} updated successfully.`);
    }
  };

  const handleConfirmDelete = (id: string) => {
    const deleted = policies.find((p) => p.id === id);
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    showToast(`Policy ${deleted?.code || id} removed.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-[#161726] border border-brand-500/50 shadow-purple-glow text-xs text-white flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner: Engine Status & Connection */}
      <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Attribute-Based Access Control Rulesets
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                  {isLiveConnected ? 'Oracle ORDS Connected' : 'Engine Standby'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Fine-grained policies evaluated dynamically by the PDP using subject roles, security clearances, resource classifications, and environmental parameters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={fetchBackendPolicies}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
              <span>Sync Policies</span>
            </button>
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-brand-300 font-mono bg-[#11121d] px-3 py-1.5 rounded-xl border border-white/5">
              <FileCode className="w-3.5 h-3.5 text-brand-400" />
              <span>XACML 3.0 / JSON</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <PolicyMetrics policies={policies} />

      {/* Filters & Actions Bar */}
      <PolicyFilters
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        effectFilter={effectFilter}
        onEffectFilterChange={setEffectFilter}
        onCreateClick={handleCreateClick}
        categoryCounts={categoryCounts}
      />

      {/* Policy Cards List */}
      {filteredPolicies.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {filteredPolicies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onToggleStatus={handleToggleStatus}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-8 sm:p-12 text-center shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Matching Security Policies Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No policies match the current filter criteria or search query "{searchQuery}". Try adjusting your filters or resetting the search term.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setStatusFilter('ALL');
              setEffectFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/40 text-xs font-semibold transition cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Create / Edit / Delete Modal */}
      <ActionModal
        isOpen={modalType !== null}
        onClose={() => {
          setModalType(null);
          setActivePolicy(null);
        }}
        type={modalType}
        policy={activePolicy}
        onSave={handleSavePolicy}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};
