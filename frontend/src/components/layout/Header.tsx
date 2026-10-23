import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  Calendar,
  RefreshCw,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import type { NavigationTab } from '../../types/policy';

interface HeaderProps {
  currentTab: NavigationTab;
  onRefreshHealth: () => void;
  apiHealth: {
    status: 'checking' | 'healthy' | 'error';
    details?: string;
  };
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onRefreshHealth,
  apiHealth,
  onOpenMobileMenu,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [hasNotifications] = useState(true);

  const titles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Live authorization telemetry & policy analytics' },
    users: { title: 'Users & Identity Directory', subtitle: 'Subjects, security clearance & MFA enforcement' },
    resources: { title: 'Protected Resources', subtitle: 'Enterprise data stores, APIs & microservices' },
    policies: { title: 'Security Policies', subtitle: 'Attribute-based access control (ABAC) rulesets' },
    simulator: { title: 'Access Simulator', subtitle: 'Interactive Policy Decision Point (PDP) sandbox' },
    audit: { title: 'Audit Trail', subtitle: 'Chronological access decisions & compliance history' },
    settings: { title: 'Engine Settings', subtitle: 'Oracle ORDS, SQLite audit fallback & system config' },
  };

  const currentInfo = titles[currentTab] || {
    title: 'Dashboard',
    subtitle: 'Enterprise Access Control',
  };

  const timeframeOptions = [
    { id: '24h', label: 'Last 24 hour' },
    { id: 'week', label: 'Last weeks' },
    { id: 'month', label: 'Last month' },
    { id: 'year', label: 'Last year' },
  ];

  return (
    <header className="h-16 lg:h-18 bg-[#0c0d14]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle + Title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 lg:hidden transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
            {currentInfo.title}
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center: Search Input (Matching Reference Center Search) */}
      <div className="flex-1 max-w-xs md:max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search anything..."
            aria-label="Search access control"
            className="w-full bg-[#161726] border border-white/5 rounded-full pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-inner"
          />
        </div>
      </div>

      {/* Right: Timeframe Pills, Filters, Notifications, Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Timeframe pills (Matching Reference "Last 24 hour / Last weeks / Last month") */}
        <div className="hidden xl:flex items-center bg-[#161726] p-1 rounded-full border border-white/5 text-xs">
          {timeframeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedTimeframe(opt.id)}
              className={`px-3 py-1 rounded-full text-xs transition duration-150 cursor-pointer ${
                selectedTimeframe === opt.id
                  ? 'bg-brand-600 text-white font-medium shadow-purple-glow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filter by date range button (Matching Reference) */}
        <button
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161726] border border-white/5 text-slate-300 hover:text-white hover:border-brand-500/30 transition text-xs font-medium cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Filter by date range</span>
          <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>

        {/* Backend health status pill */}
        <button
          onClick={onRefreshHealth}
          title="Click to re-ping /api/health"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#161726] border border-white/5 hover:border-brand-500/30 text-xs transition cursor-pointer"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              apiHealth.status === 'healthy'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : apiHealth.status === 'checking'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-400'
            }`}
          />
          <span className="hidden sm:inline text-[11px] font-medium text-slate-300">
            {apiHealth.status === 'healthy' ? 'API Online' : apiHealth.status === 'checking' ? 'Checking' : 'Offline'}
          </span>
          <RefreshCw
            className={`w-3 h-3 text-slate-400 ${
              apiHealth.status === 'checking' ? 'animate-spin text-brand-400' : ''
            }`}
          />
        </button>

        {/* Notification Bell (Matching Reference Notification) */}
        <div className="relative">
          <button
            title="System notifications"
            className="w-9 h-9 rounded-full bg-[#161726] border border-white/5 hover:border-brand-500/30 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
          </button>
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-[#0c0d14]" />
          )}
        </div>

        {/* User Avatar (Matching Reference User Photo / Badge) */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-white/5">
          <div className="relative cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-400 p-[2px] shadow-purple-glow-sm">
              <div className="w-full h-full rounded-full bg-[#161726] flex items-center justify-center text-white text-xs font-bold">
                SA
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c0d14]" />
          </div>

          <div className="hidden 2xl:block text-left">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              SecOps Admin
              <UserCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">secops@easyaccess.cyber</div>
          </div>
        </div>
      </div>
    </header>
  );
};
