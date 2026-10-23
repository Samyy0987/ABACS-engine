import { useState } from 'react';
import type { NavigationTab } from './types/policy';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { SecurityPoliciesPage } from './pages/SecurityPoliciesPage';
import { UsersPage } from './pages/UsersPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  // Default to 'dashboard' to display the redesigned responsive dashboard from reference
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');

  return (
    <AppShell currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === 'dashboard' && <DashboardPage onNavigateTab={setCurrentTab} />}
      {currentTab === 'policies' && <SecurityPoliciesPage />}
      {currentTab === 'users' && <UsersPage />}
      {currentTab === 'resources' && <ResourcesPage />}
      {currentTab === 'simulator' && <SimulatorPage />}
      {currentTab === 'audit' && <AuditLogsPage />}
      {currentTab === 'settings' && <SettingsPage />}
    </AppShell>
  );
}

export default App;
