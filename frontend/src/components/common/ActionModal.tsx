import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import type { AbacPolicy, PolicyCategory, PolicyEffect } from '../../types/policy';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'create' | 'edit' | 'delete' | null;
  policy: AbacPolicy | null;
  onSave: (policy: AbacPolicy) => void;
  onConfirmDelete: (id: string) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  type,
  policy,
  onSave,
  onConfirmDelete,
}) => {
  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#161726] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#11121d] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {type === 'create' && 'Create Enterprise ABAC Policy'}
                {type === 'edit' && `Edit Policy: ${policy?.code}`}
                {type === 'delete' && 'Confirm Policy Deletion'}
              </h3>
              <p className="text-[11px] text-slate-400">EasyAccess Policy Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {type === 'delete' && policy ? (
          <div className="p-5 sm:p-6 space-y-4">
            <p className="text-xs text-slate-300">
              Are you sure you want to delete policy{' '}
              <span className="font-mono text-brand-300 font-bold">{policy.code}</span> (
              {policy.title})?
            </p>
            <div className="p-3 bg-[#11121d] rounded-xl border border-white/5 text-xs text-slate-400">
              This action will remove the policy from active evaluation memory.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirmDelete(policy.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition cursor-pointer"
              >
                Delete Policy
              </button>
            </div>
          </div>
        ) : (
          <ModalForm
            initialPolicy={policy}
            onClose={onClose}
            onSave={(p) => {
              onSave(p);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};

const ModalForm: React.FC<{
  initialPolicy: AbacPolicy | null;
  onClose: () => void;
  onSave: (policy: AbacPolicy) => void;
  }> = ({ initialPolicy, onClose, onSave }) => {
  const [title, setTitle] = useState(initialPolicy?.title || '');
  const [description, setDescription] = useState(initialPolicy?.description || '');
  const [category, setCategory] = useState<PolicyCategory>(
    initialPolicy?.category || 'Data Protection'
  );
  const [effect, setEffect] = useState<PolicyEffect>(initialPolicy?.effect || 'PERMIT');
  const [roles, setRoles] = useState(initialPolicy?.subject.role?.join(', ') || 'SecOps, Compliance');
  const [resourceType, setResourceType] = useState(
    initialPolicy?.resource.type || 'Production_Data_Store'
  );
  const [classification, setClassification] = useState(
    initialPolicy?.resource.classification || 'Confidential'
  );
  const [ipRange, setIpRange] = useState(
    initialPolicy?.environment.ipRange || '10.0.0.0/16'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPolicy: AbacPolicy = {
      id: initialPolicy?.id || `pol-${Date.now()}`,
      code: initialPolicy?.code || `POL-${category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      title: title || 'Untitled Policy',
      description: description || 'Custom enterprise ABAC policy rule.',
      category,
      effect,
      enabled: initialPolicy ? initialPolicy.enabled : true,
      priority: initialPolicy ? initialPolicy.priority : 10,
      actions: initialPolicy ? initialPolicy.actions : ['READ'],
      subject: {
        role: roles.split(',').map((r) => r.trim()).filter(Boolean),
        clearanceLevel: 'Standard',
        mfaEnforced: true,
      },
      resource: {
        type: resourceType,
        classification: classification as any,
      },
      environment: {
        ipRange,
        allowedHours: 'Business Hours',
        deviceTrust: 'Compliant',
      },
      lastUpdated: 'Just now',
      version: initialPolicy ? `${initialPolicy.version} (edited)` : 'v1.0.0',
    };

    onSave(updatedPolicy);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-1">Policy Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sensitive Financial Data Access Guard"
          className="w-full bg-[#11121d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed policy objective and ABAC intent..."
          className="w-full bg-[#11121d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PolicyCategory)}
            className="w-full bg-[#11121d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="Data Protection">Data Protection</option>
            <option value="API & Microservices">API & Microservices</option>
            <option value="Administrative Access">Administrative Access</option>
            <option value="Compliance & Audit">Compliance & Audit</option>
            <option value="Network & Geofence">Network & Geofence</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Decision Effect</label>
          <select
            value={effect}
            onChange={(e) => setEffect(e.target.value as PolicyEffect)}
            className="w-full bg-[#11121d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="PERMIT">PERMIT (Allow)</option>
            <option value="DENY">DENY (Hard Block)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Subject Roles</label>
          <input
            type="text"
            value={roles}
            onChange={(e) => setRoles(e.target.value)}
            className="w-full bg-[#11121d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Resource Type</label>
          <input
            type="text"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="w-full bg-[#11121d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Classification</label>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value as any)}
            className="w-full bg-[#11121d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="Public">Public</option>
            <option value="Internal">Internal</option>
            <option value="Confidential">Confidential</option>
            <option value="Restricted">Restricted</option>
            <option value="Top Secret">Top Secret</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">IP Range / Subnet</label>
          <input
            type="text"
            value={ipRange}
            onChange={(e) => setIpRange(e.target.value)}
            placeholder="e.g. 10.0.0.0/16"
            className="w-full bg-[#11121d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-purple-glow transition cursor-pointer"
        >
          Save Policy
        </button>
      </div>
    </form>
  );
};
