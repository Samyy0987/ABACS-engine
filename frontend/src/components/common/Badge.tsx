import React from 'react';
import type { PolicyEffect } from '../../types/policy';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'permit' | 'deny' | 'category' | 'attribute' | 'neutral' | 'purple' | 'amber' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5' 
    : 'text-[11px] px-2.5 py-0.5';

  const variantStyles = {
    permit: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold',
    deny: 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold',
    category: 'bg-brand-500/15 text-brand-300 border border-brand-500/30 font-medium',
    attribute: 'bg-white/5 text-slate-300 border border-white/10 font-mono text-[10px]',
    neutral: 'bg-white/5 text-slate-400 border border-white/10',
    purple: 'bg-brand-600/20 text-brand-300 border border-brand-500/30 font-medium',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeStyles} ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};

export const EffectBadge: React.FC<{ effect: PolicyEffect }> = ({ effect }) => {
  if (effect === 'PERMIT') {
    return (
      <Badge variant="permit">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        PERMIT
      </Badge>
    );
  }
  return (
    <Badge variant="deny">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      DENY
    </Badge>
  );
};
