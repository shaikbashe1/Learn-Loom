// Small presentational building blocks shared across onboarding steps.
// Kept dependency-free and aligned with LearnLoom's glass/material design tokens.
import type { ReactNode } from 'react';

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="block font-label-md text-label-md text-on-surface-variant mb-sm">
      {children}
      {hint && <span className="ml-2 text-on-surface-variant/60 font-body-sm text-body-sm">{hint}</span>}
    </label>
  );
}

export function TextField({
  value, onChange, placeholder, type = 'text', icon, maxLength, inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: string;
  maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md ${icon ? 'pl-[3rem]' : 'pl-5'} pr-5 font-body-md text-body-md placeholder:text-outline transition-all duration-200`}
      />
    </div>
  );
}

/** A selectable pill. Works for both single- and multi-select grids. */
export function Chip({
  label, selected, onClick, icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-sm text-label-sm border transition-all ${
        selected
          ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_8px_rgba(0,74,198,0.2)]'
          : 'bg-surface-container text-on-surface-variant border-outline-variant/60 hover:border-outline-variant hover:text-on-surface'
      }`}
    >
      {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
      {selected && !icon && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
      {label}
    </button>
  );
}

/** A larger selectable card, used for personas / single-select tiles. */
export function OptionCard({
  label, selected, onClick, icon, description,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 w-full text-left px-4 py-3.5 rounded-2xl border transition-all ${
        selected
          ? 'bg-primary/15 border-primary/60 shadow-[0_0_12px_rgba(0,74,198,0.18)]'
          : 'bg-surface-container border-outline-variant/50 hover:border-outline-variant hover:bg-surface-container-high'
      }`}
    >
      <span
        className={`material-symbols-outlined text-[24px] ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className={`block font-label-lg text-label-lg ${selected ? 'text-primary' : 'text-on-surface'}`}>{label}</span>
        {description && <span className="block font-body-sm text-body-sm text-on-surface-variant">{description}</span>}
      </span>
      {selected && <span className="material-symbols-outlined text-[20px] text-primary">check_circle</span>}
    </button>
  );
}
