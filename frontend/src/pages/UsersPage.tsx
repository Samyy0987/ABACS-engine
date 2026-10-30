import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Mail,
  Building,
  UserCheck
} from 'lucide-react';

const INITIAL_DIRECTORY_USERS = [
  {
    id: 'usr-1',
    username: 'test_alice_secops',
    name: 'Alice Henderson',
    email: 'alice.henderson@enterprise.cyber',
    department: 'Security Operations',
    clearance_level: 'TopSecret',
    mfa_enforced: true,
    roles: ['SecOps', 'Admin'],
    is_active: true,
  },
  {
    id: 'usr-2',
    username: 'test_bob_guest',
    name: 'Bob Miller',
    email: 'bob.miller@enterprise.cyber',
    department: 'Engineering',
    clearance_level: 'Public',
    mfa_enforced: false,
    roles: ['Guest', 'Contractor'],
    is_active: true,
  },
  {
    id: 'usr-3',
    username: 'carol_compliance_lead',
    name: 'Carol Danvers',
    email: 'carol.danvers@enterprise.cyber',
    department: 'Compliance & Audit',
    clearance_level: 'Confidential',
    mfa_enforced: true,
    roles: ['Auditor', 'Compliance_Lead'],
    is_active: true,
  },
  {
    id: 'usr-4',
    username: 'dave_platform_devops',
    name: 'David Zhao',
    email: 'david.zhao@enterprise.cyber',
    department: 'Platform Ops',
    clearance_level: 'Secret',
    mfa_enforced: true,
    roles: ['DevOps', 'Cluster_Maintainer'],
    is_active: true,
  },
];

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>(INITIAL_DIRECTORY_USERS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
      const res = await fetch(`${apiUrl}/users`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users) && data.users.length > 0) {
          // Merge ORDS users with existing directory users, prioritizing ORDS records
          const ordsUsers = data.users;
          const merged = [
            ...ordsUsers,
            ...INITIAL_DIRECTORY_USERS.filter(
              (initU) => !ordsUsers.some((ou: any) => ou.username?.toLowerCase() === initU.username.toLowerCase())
            ),
          ];
          setUsers(merged);
        }
      }
    } catch {
      // Keep state if offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      u.clearance_level?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Subject & Identity Directory</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                Oracle ORDS PIP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Enterprise subjects whose attributes (roles, clearance, MFA, department) are resolved during ABAC evaluation.
            </p>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs font-medium transition cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Total Directory Subjects</span>
          <h3 className="text-2xl font-bold text-white mt-1">{users.length}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Seeded Test Identities</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">Active Status</span>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">
            {users.filter((u) => u.is_active !== false).length}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Eligible for PDP Evaluation</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">MFA Enforced</span>
          <h3 className="text-2xl font-bold text-brand-400 mt-1">
            {users.filter((u) => u.mfa_enforced).length}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Hardware / TOTP Active</p>
        </div>

        <div className="rounded-2xl bg-[#161726] border border-white/5 p-4 shadow-card">
          <span className="text-xs text-slate-400 font-medium">TopSecret Clearances</span>
          <h3 className="text-2xl font-bold text-indigo-400 mt-1">
            {users.filter((u) => u.clearance_level === 'TopSecret').length}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Privileged Access Scope</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search subjects by username, name, email, department..."
          className="w-full bg-[#161726] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-inner"
        />
      </div>

      {/* Users Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id || user.username}
              className="rounded-2xl bg-[#161726] border border-white/5 p-5 shadow-card hover:border-brand-500/30 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-purple-glow-sm">
                      {user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{user.name || user.username}</span>
                        {user.is_active !== false && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                      </h3>
                      <span className="text-xs text-brand-300 font-mono">@{user.username}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      user.is_active !== false
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {user.is_active !== false ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </div>

                {/* Attributes Chips */}
                <div className="space-y-2 py-3 border-t border-b border-white/5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </span>
                    <span className="font-mono text-[11px] truncate">{user.email || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" /> Department
                    </span>
                    <span>{user.department || 'General'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Clearance
                    </span>
                    <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono text-[11px] border border-brand-500/30">
                      {user.clearance_level || 'Public'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" /> MFA Enforced
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      {user.mfa_enforced ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">Enforced</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-500 font-medium">Disabled</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Roles Footer */}
              <div className="pt-3 flex items-center justify-between gap-2 flex-wrap text-xs">
                <span className="text-[11px] text-slate-400">Assigned Roles:</span>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(user.roles) ? (
                    user.roles.map((r: string) => (
                      <span
                        key={r}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 font-mono"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 font-mono">
                      {user.roles || 'Standard'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#161726] border border-white/5 p-8 sm:p-12 text-center shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Matching Subjects Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No identity records match "{searchQuery}". Try adjusting your search term.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/40 text-xs font-semibold transition cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
};
