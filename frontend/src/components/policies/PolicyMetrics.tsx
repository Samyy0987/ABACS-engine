import React from 'react';
import {
  ShieldCheck,
  Cpu,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import type { AbacPolicy } from '../../types/policy';

interface PolicyMetricsProps {
  policies: AbacPolicy[];
}

export const PolicyMetrics: React.FC<PolicyMetricsProps> = ({ policies }) => {
  const total = policies.length;
  const activeCount = policies.filter((p) => p.enabled).length;
  const permitCount = policies.filter((p) => p.effect === 'PERMIT').length;
  const denyCount = policies.filter((p) => p.effect === 'DENY').length;

  const cards = [
    {
      title: 'Total Policies',
      value: total,
      trend: '+100%',
      isPositive: true,
      subtext: 'Catalogued Rulesets',
      icon: ShieldCheck,
      iconBg: 'bg-rose-500/15 text-rose-400',
    },
    {
      title: 'Active Enforcement',
      value: activeCount,
      trend: `${total > 0 ? Math.round((activeCount / total) * 100) : 0}%`,
      isPositive: true,
      subtext: 'Production Active',
      icon: Cpu,
      iconBg: 'bg-emerald-500/15 text-emerald-400',
    },
    {
      title: 'Permit Rules',
      value: permitCount,
      trend: `${total > 0 ? Math.round((permitCount / total) * 100) : 0}%`,
      isPositive: true,
      subtext: 'Allow Overrides',
      icon: SlidersHorizontal,
      iconBg: 'bg-amber-500/15 text-amber-400',
    },
    {
      title: 'Deny Rules',
      value: denyCount,
      trend: 'Strict',
      isPositive: false,
      subtext: 'Hard Block Targets',
      icon: ShieldAlert,
      iconBg: 'bg-indigo-500/15 text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="rounded-2xl bg-[#161726] border border-white/5 p-4 sm:p-5 flex flex-col justify-between shadow-card hover:border-brand-500/30 transition-all group"
          >
            {/* Header: Icon + Title */}
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-400 truncate">
                {c.title}
              </span>
            </div>

            {/* Value + Trend */}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {c.value}
              </h3>
              <div
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  c.isPositive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {c.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{c.trend}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 truncate">{c.subtext}</p>
          </div>
        );
      })}
    </div>
  );
};
