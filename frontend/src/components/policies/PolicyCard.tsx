import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Copy,
  Check,
  User,
  Database,
  Globe,
  Zap,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import type { AbacPolicy } from '../../types/policy';
import { Badge, EffectBadge } from '../common/Badge';
import { Switch } from '../common/Switch';

interface PolicyCardProps {
  policy: AbacPolicy;
  onToggleStatus: (id: string, current: boolean) => void;
  onEdit: (policy: AbacPolicy) => void;
  onDelete: (policy: AbacPolicy) => void;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policy,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(policy.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1600);
  };

  const handleCopyJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(policy, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1600);
  };

  return (
    <div
      className={`rounded-2xl bg-[#161726] border transition-all duration-200 shadow-card ${
        policy.enabled
          ? 'border-white/5 hover:border-brand-500/30 hover:shadow-purple-glow-sm'
          : 'border-white/5 opacity-70 hover:opacity-100'
      }`}
    >
      {/* Main Card Header & Overview */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          {/* Code, Category, and Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyCode}
              title="Click to copy policy code"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#11121d] border border-white/10 text-brand-300 font-mono text-xs font-semibold hover:bg-brand-600/20 hover:border-brand-500/40 transition group cursor-pointer"
            >
              <span>{policy.code}</span>
              {copiedCode ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 group-hover:text-brand-300" />
              )}
            </button>

            <Badge variant="category">{policy.category}</Badge>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono border border-white/5">
              P{policy.priority}
            </span>
          </div>

          {/* Policy Effect Badge */}
          <div>
            <EffectBadge effect={policy.effect} />
          </div>
        </div>

        {/* Policy Title and Description */}
        <div className="mb-4">
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            {policy.effect === 'PERMIT' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="break-words">{policy.title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words">
            {policy.description}
          </p>
        </div>

        {/* ABAC Attribute Chips Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-3 border-t border-white/5">
          {/* Subject Preview */}
          <div className="bg-[#11121d] rounded-xl p-2.5 border border-white/5 flex items-start gap-2">
            <User className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
            <div className="overflow-hidden min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                Subject
              </span>
              <p className="text-xs font-medium text-slate-200 truncate" title={policy.subject.role?.join(', ')}>
                {policy.subject.role ? policy.subject.role.join(', ') : 'Any Subject'}
              </p>
              <span className="text-[10px] text-brand-300/80 font-mono truncate block">
                {policy.subject.clearanceLevel || 'All Clearances'}
              </span>
            </div>
          </div>

          {/* Resource Preview */}
          <div className="bg-[#11121d] rounded-xl p-2.5 border border-white/5 flex items-start gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
            <div className="overflow-hidden min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                Resource
              </span>
              <p className="text-xs font-medium text-slate-200 truncate" title={policy.resource.type}>
                {policy.resource.type}
              </p>
              <span className="text-[10px] text-indigo-300 font-mono truncate block">
                {policy.resource.classification}
              </span>
            </div>
          </div>

          {/* Environment Preview */}
          <div className="bg-[#11121d] rounded-xl p-2.5 border border-white/5 flex items-start gap-2">
            <Globe className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
            <div className="overflow-hidden min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                Environment
              </span>
              <p className="text-xs font-medium text-slate-200 truncate" title={policy.environment.ipRange}>
                {policy.environment.ipRange || 'Global Network'}
              </p>
              <span className="text-[10px] text-cyan-300 font-mono truncate block">
                {policy.environment.allowedHours || 'Any Time'}
              </span>
            </div>
          </div>

          {/* Actions Preview */}
          <div className="bg-[#11121d] rounded-xl p-2.5 border border-white/5 flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div className="overflow-hidden min-w-0 w-full">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                Actions
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {policy.actions.map((act) => (
                  <span
                    key={act}
                    className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-semibold"
                  >
                    {act}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Metadata and Action Controls */}
      <div className="px-4 sm:px-5 py-3 bg-[#11121d]/80 border-t border-white/5 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Metadata info */}
        <div className="flex items-center gap-2 sm:gap-3 text-slate-400 text-[11px] flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Updated {policy.lastUpdated}
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span className="font-mono text-slate-400 hidden sm:inline">{policy.version}</span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span className="text-brand-300 font-medium">Strict ABAC</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Green enabled-state toggle */}
          <div className="pr-2 border-r border-white/10">
            <Switch
              checked={policy.enabled}
              onChange={(newVal) => onToggleStatus(policy.id, newVal)}
              label={policy.enabled ? 'Enabled' : 'Disabled'}
            />
          </div>

          {/* Expand / Details Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161726] hover:bg-[#1f2033] border border-white/5 text-slate-300 hover:text-white transition font-medium text-xs cursor-pointer"
          >
            <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-brand-300" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Blue Edit Action Icon */}
          <button
            onClick={() => onEdit(policy)}
            title="Edit Policy"
            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Red Delete Action Icon */}
          <button
            onClick={() => onDelete(policy)}
            title="Delete Policy"
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Accordion: Full ABAC Rule Inspector */}
      {isExpanded && (
        <div className="px-4 sm:px-5 py-4 bg-[#0d0e17] border-t border-white/5 rounded-b-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Rule Constraints & Attribute Vectors
              </h3>
            </div>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 text-[11px] text-brand-300 hover:text-white bg-brand-600/20 hover:bg-brand-600/30 px-2.5 py-1 rounded-lg border border-brand-500/30 transition cursor-pointer"
            >
              {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedJson ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>
          </div>

          {/* Detailed 4-Attribute breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Subject Attributes */}
            <div className="p-3 rounded-xl bg-[#161726] border border-white/5">
              <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wide block mb-2">
                1. Subject Constraints
              </span>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                <li><span className="text-slate-500">Roles:</span> {policy.subject.role?.join(', ') || 'Any'}</li>
                <li><span className="text-slate-500">Clearance:</span> {policy.subject.clearanceLevel || 'None'}</li>
                <li><span className="text-slate-500">Department:</span> {policy.subject.department?.join(', ') || 'Any'}</li>
                <li><span className="text-slate-500">MFA Required:</span> {policy.subject.mfaEnforced ? 'Yes' : 'No'}</li>
              </ul>
            </div>

            {/* Resource Attributes */}
            <div className="p-3 rounded-xl bg-[#161726] border border-white/5">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide block mb-2">
                2. Resource Target
              </span>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                <li><span className="text-slate-500">Target Type:</span> {policy.resource.type}</li>
                <li><span className="text-slate-500">Classification:</span> {policy.resource.classification}</li>
                <li><span className="text-slate-500">Service:</span> {policy.resource.service || 'Default'}</li>
                <li><span className="text-slate-500">Owner Dept:</span> {policy.resource.ownerDepartment || 'Unspecified'}</li>
              </ul>
            </div>

            {/* Environment Attributes */}
            <div className="p-3 rounded-xl bg-[#161726] border border-white/5">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide block mb-2">
                3. Environmental Context
              </span>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                <li><span className="text-slate-500">IP Subnet:</span> {policy.environment.ipRange || '0.0.0.0/0 (Any)'}</li>
                <li><span className="text-slate-500">Allowed Hours:</span> {policy.environment.allowedHours || '24/7'}</li>
                <li><span className="text-slate-500">Geofence:</span> {policy.environment.geofence?.join(', ') || 'Global'}</li>
                <li><span className="text-slate-500">Device Trust:</span> {policy.environment.deviceTrust || 'Any'}</li>
              </ul>
            </div>

            {/* Action Rules */}
            <div className="p-3 rounded-xl bg-[#161726] border border-white/5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block mb-2">
                4. Action Permissions & Effect
              </span>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                <li><span className="text-slate-500">Effect Decision:</span> <span className={policy.effect === 'PERMIT' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{policy.effect}</span></li>
                <li><span className="text-slate-500">Allowed Actions:</span> {policy.actions.join(', ')}</li>
                <li><span className="text-slate-500">Priority Level:</span> {policy.priority} (1 = Highest override)</li>
                <li><span className="text-slate-500">Rule Version:</span> {policy.version}</li>
              </ul>
            </div>
          </div>

          {/* Raw JSON Code Block */}
          <div className="rounded-xl bg-[#090a10] border border-white/5 p-3 overflow-x-auto">
            <span className="text-[10px] text-slate-500 font-mono block mb-1">
              // Normalized ABAC Policy JSON
            </span>
            <pre className="text-[11px] text-brand-200 font-mono leading-relaxed overflow-x-auto">
              {JSON.stringify(policy, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
