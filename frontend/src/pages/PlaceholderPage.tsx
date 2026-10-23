import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Sliders, 
  FileText, 
  Settings,
  ArrowRight,
  Shield
} from 'lucide-react';
import type { NavigationTab } from '../types/policy';

interface PlaceholderPageProps {
  tab: NavigationTab;
  onNavigateToPolicies: () => void;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  tab,
  onNavigateToPolicies,
}) => {
  const configs: Record<
    Exclude<NavigationTab, 'policies'>,
    {
      title: string;
      subtitle: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
      plannedPhase: string;
      features: string[];
    }
  > = {
    dashboard: {
      title: 'Executive Security Dashboard',
      subtitle: 'Real-time telemetry, access decisions, and threat vectors',
      description: 'The Central Dashboard will summarize evaluation performance, access enforcement hit-rates, and live policy decisions across all enterprise microservices.',
      icon: LayoutDashboard,
      plannedPhase: 'Phase 4 - Dashboard & Telemetry',
      features: [
        'Live ABAC Permit vs Deny stream',
        'Top triggered policies and anomaly alarms',
        'Latency metrics (PDP evaluation response times)',
        'Active subjects and geo-distributed access requests',
      ],
    },
    users: {
      title: 'Subject & User Attribute Directory',
      subtitle: 'Identity attributes, role mappings, and security clearances',
      description: 'Manage subject attributes used in ABAC policy condition evaluations: security clearance levels, department assignments, risk scores, and device compliance tags.',
      icon: Users,
      plannedPhase: 'Phase 3 - Policy Engine & Subject Context',
      features: [
        'Subject attribute provider (PIP) integration',
        'Role and group inheritance hierarchies',
        'Security clearance and credential expiration tracking',
        'Hardware token & MFA requirement profiling',
      ],
    },
    resources: {
      title: 'Enterprise Protected Resources',
      subtitle: 'Inventory of sensitive data stores, APIs, and microservices',
      description: 'Register and catalog enterprise targets protected by the ABAC engine: relational databases, S3 object stores, REST endpoints, and internal microservice methods.',
      icon: Layers,
      plannedPhase: 'Phase 3 - Resource PIP & Classification',
      features: [
        'Resource classification tags (Confidential, Restricted, Top Secret)',
        'Owner department and custodian assignments',
        'Data masking and tokenization rules per resource',
        'Target endpoint health and policy mapping',
      ],
    },
    simulator: {
      title: 'ABAC Access Simulator & Policy Sandbox',
      subtitle: 'Test and dry-run policy evaluation logic without affecting production',
      description: 'Simulate access requests by defining Subject attributes, Resource attributes, Environmental variables, and Target action. See step-by-step decision trees and rule conflict resolutions.',
      icon: Sliders,
      plannedPhase: 'Phase 3 - PDP Evaluation Engine',
      features: [
        'Interactive Request Simulator (Subject + Resource + Context)',
        'Policy Decision Point (PDP) dry-run evaluation',
        'Rule combination algorithms (Deny-Overrides, Permit-Overrides)',
        'Detailed audit trail and explainable decision breakdown',
      ],
    },
    audit: {
      title: 'Immutable Compliance Audit Logs',
      subtitle: 'Complete chronological history of access requests and policy changes',
      description: 'Audit every authorization decision evaluated by the ABAC engine, including environmental snapshots, subject attributes, matched policy rules, and final decision results.',
      icon: FileText,
      plannedPhase: 'Phase 4 - Audit & Telemetry',
      features: [
        'SOC2 and ISO 27001 compliant immutable event stream',
        'Searchable request context and decision logs',
        'Exportable audit reports for compliance officers',
        'Policy modification revision history and diff viewer',
      ],
    },
    settings: {
      title: 'ABAC Engine Configuration & Security Settings',
      subtitle: 'Global evaluation algorithms, Supabase connection, and API tokens',
      description: 'Configure engine-wide behavior including default decision rules, caching TTLs for attribute resolution, Supabase connection pool parameters, and client API keys.',
      icon: Settings,
      plannedPhase: 'Phase 2 & Phase 5 - Infrastructure & Deployment',
      features: [
        'Supabase PostgreSQL database connectivity parameters',
        'Default decision strategy (Deny-by-default)',
        'Policy caching and PDP optimization controls',
        'API key management and bearer token generation',
      ],
    },
  };

  const current = configs[tab as Exclude<NavigationTab, 'policies'>] || configs.dashboard;
  const Icon = current.icon;

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Container Card */}
      <div className="rounded-2xl bg-[#121528] border border-[#212646] p-8 shadow-card">
        {/* Header with Icon */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-[#1E2346]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 border border-brand-400/30 flex items-center justify-center text-white shadow-purple-glow">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                {current.plannedPhase}
              </span>
              <span className="text-xs text-slate-400">Placeholder Screen</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{current.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{current.subtitle}</p>
          </div>
        </div>

        {/* Content body */}
        <div className="py-6 space-y-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            {current.description}
          </p>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Planned Capabilities in Future Phases
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {current.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-[#161933] border border-[#23284B] p-3 text-xs text-slate-300 flex items-start gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation CTA */}
        <div className="pt-6 border-t border-[#1E2346] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-brand-400" />
            <span>Currently in Phase 1: Security Policies view is active and ready for review.</span>
          </div>

          <button
            onClick={onNavigateToPolicies}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition duration-150 shadow-purple-glow cursor-pointer"
          >
            <span>Go to Security Policies</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
