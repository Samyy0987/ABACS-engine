import React from 'react';
import { Search, Plus, Filter, SlidersHorizontal } from 'lucide-react';
import type { PolicyCategory, PolicyEffect } from '../../types/policy';

interface PolicyFiltersProps {
  categories: PolicyCategory[];
  selectedCategory: PolicyCategory | 'ALL';
  onSelectCategory: (cat: PolicyCategory | 'ALL') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'ALL' | 'ENABLED' | 'DISABLED';
  onStatusFilterChange: (status: 'ALL' | 'ENABLED' | 'DISABLED') => void;
  effectFilter: 'ALL' | PolicyEffect;
  onEffectFilterChange: (effect: 'ALL' | PolicyEffect) => void;
  onCreateClick: () => void;
  categoryCounts: Record<string, number>;
}

export const PolicyFilters: React.FC<PolicyFiltersProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  effectFilter,
  onEffectFilterChange,
  onCreateClick,
  categoryCounts,
}) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Category Pills (Matching Reference Top Filter Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
        <button
          onClick={() => onSelectCategory('ALL')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-brand-600 text-white font-semibold shadow-purple-glow-sm'
              : 'bg-[#161726] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <span>All Policies</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'ALL'
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-slate-400'
            }`}
          >
            {categoryCounts['ALL'] || 0}
          </span>
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = categoryCounts[cat] || 0;

          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-brand-600 text-white font-semibold shadow-purple-glow-sm'
                  : 'bg-[#161726] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Filter controls, and Action button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search policies by code, name, action, or attribute constraint..."
            aria-label="Search policies"
            className="w-full bg-[#161726] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition shadow-inner"
          />
        </div>

        {/* Filter Dropdowns + Create Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0">
          {/* Status Filter */}
          <div className="flex-1 sm:flex-none flex items-center gap-1.5 bg-[#161726] border border-white/5 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as any)}
              aria-label="Filter policies by status"
              className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer w-full"
            >
              <option value="ALL" className="bg-[#161726] text-slate-300">All Status</option>
              <option value="ENABLED" className="bg-[#161726] text-emerald-400">Enabled</option>
              <option value="DISABLED" className="bg-[#161726] text-slate-400">Disabled</option>
            </select>
          </div>

          {/* Effect Filter */}
          <div className="flex-1 sm:flex-none flex items-center gap-1.5 bg-[#161726] border border-white/5 rounded-xl px-2.5 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={effectFilter}
              onChange={(e) => onEffectFilterChange(e.target.value as any)}
              aria-label="Filter policies by effect"
              className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer w-full"
            >
              <option value="ALL" className="bg-[#161726] text-slate-300">All Effects</option>
              <option value="PERMIT" className="bg-[#161726] text-emerald-400">PERMIT</option>
              <option value="DENY" className="bg-[#161726] text-rose-400">DENY</option>
            </select>
          </div>

          {/* Create Policy Button */}
          <button
            onClick={onCreateClick}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition duration-150 shadow-purple-glow cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Policy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
