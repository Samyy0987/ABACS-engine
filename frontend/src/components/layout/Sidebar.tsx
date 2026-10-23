import React from 'react';
import {
  Shield,
  LayoutDashboard,
  Users,
  Layers,
  ShieldAlert,
  Sliders,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { NavigationTab } from '../../types/policy';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  apiHealth: {
    status: 'checking' | 'healthy' | 'error';
    details?: string;
  };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  apiHealth,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Overview',
      sublabel: 'Dashboard & Telemetry',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      id: 'users' as NavigationTab,
      label: 'Users',
      sublabel: 'Subjects & Clearances',
      icon: Users,
    },
    {
      id: 'resources' as NavigationTab,
      label: 'Resources',
      sublabel: 'Protected Targets',
      icon: Layers,
    },
    {
      id: 'policies' as NavigationTab,
      label: 'Security Policies',
      sublabel: 'ABAC Rulesets',
      icon: ShieldAlert,
      badge: 'Core',
    },
    {
      id: 'simulator' as NavigationTab,
      label: 'Access Simulator',
      sublabel: 'PDP Sandbox',
      icon: Sliders,
    },
    {
      id: 'audit' as NavigationTab,
      label: 'Audit Trail',
      sublabel: 'Access Decisions',
      icon: FileText,
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Settings',
      sublabel: 'Engine Config',
      icon: Settings,
    },
  ];

  const handleItemClick = (id: NavigationTab) => {
    onSelectTab(id);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div
      className={`h-full flex flex-col bg-[#11121d] border-r border-white/5 select-none transition-all duration-200 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* User / Brand Profile Section (Matching Reference Top Profile) */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-purple-glow-sm border border-brand-400/40">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#11121d] ${
                  apiHealth.status === 'healthy'
                    ? 'bg-emerald-400'
                    : apiHealth.status === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
                title={`Engine status: ${apiHealth.status}`}
              />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight text-white truncate">
                    EasyAccess
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                    ABAC
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  secops@easyaccess.cyber
                </p>
              </div>
            )}
          </div>

          {!isMobile && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition hidden lg:block"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            Access Control Suite
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              title={isCollapsed ? `${item.label} - ${item.sublabel}` : undefined}
              className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer ${
                isCollapsed
                  ? 'justify-center p-3'
                  : 'justify-between px-3.5 py-2.5 text-xs'
              } ${
                isActive
                  ? 'bg-brand-600 text-white font-semibold shadow-purple-glow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-slate-400 border border-white/5'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Engine Telemetry / Status Pill */}
      <div className="p-3 border-t border-white/5 bg-[#0e0f18]/80 text-xs">
        {isCollapsed ? (
          <div className="flex flex-col items-center py-1 gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                apiHealth.status === 'healthy'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : apiHealth.status === 'checking'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
              title={`API Health: ${apiHealth.status}`}
            />
            <Activity className="w-3.5 h-3.5 text-slate-500" />
          </div>
        ) : (
          <div className="rounded-xl bg-[#161726] p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-brand-400" />
                Backend Engine
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                {apiHealth.status === 'healthy' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span
                  className={`font-semibold ${
                    apiHealth.status === 'healthy'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {apiHealth.status === 'healthy' ? 'Online' : 'Offline'}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/5">
              <span>Oracle ORDS + SQLite</span>
              <span className="text-brand-300 font-mono">v1.2 Active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
