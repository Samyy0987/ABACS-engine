import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {/* Track: Green when enabled (#10B981) */}
        <div
          className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
            checked 
              ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
              : 'bg-slate-700/80 hover:bg-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {/* Thumb */}
        <div
          className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-200 ease-in-out transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
      {label && (
        <span className={`text-xs font-medium ${checked ? 'text-emerald-400' : 'text-slate-400'}`}>
          {label}
        </span>
      )}
    </label>
  );
};
