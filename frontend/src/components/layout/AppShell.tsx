import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { NavigationTab } from '../../types/policy';

interface AppShellProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [apiHealth, setApiHealth] = useState<{
    status: 'checking' | 'healthy' | 'error';
    details?: string;
  }>({
    status: 'checking',
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialHealth() {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
        const res = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          setApiHealth({
            status: 'healthy',
            details: data.phase || 'Backend Online',
          });
        } else {
          setApiHealth({
            status: 'error',
            details: `HTTP ${res.status}`,
          });
        }
      } catch {
        if (!isMounted) return;
        setApiHealth({
          status: 'error',
          details: 'Backend offline or unreachable on :5000',
        });
      }
    }

    void fetchInitialHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setApiHealth({ status: 'checking' });
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
      const res = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setApiHealth({
          status: 'healthy',
          details: data.phase || 'Backend Online',
        });
      } else {
        setApiHealth({
          status: 'error',
          details: `HTTP ${res.status}`,
        });
      }
    } catch {
      setApiHealth({
        status: 'error',
        details: 'Backend offline or unreachable on :5000',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d14] text-slate-100 flex relative overflow-x-hidden">
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 h-screen z-30 transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          apiHealth={apiHealth}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] z-50 lg:hidden transform transition-transform duration-200 ease-in-out shadow-2xl ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          apiHealth={apiHealth}
          isMobile={true}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      </aside>

      {/* Main Content Area offset by responsive sidebar width */}
      <div
        className={`flex-1 flex flex-col min-h-screen bg-[#0c0d14] transition-all duration-200 min-w-0 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Sticky Header */}
        <Header
          currentTab={currentTab}
          onRefreshHealth={handleManualRefresh}
          apiHealth={apiHealth}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Inner Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
