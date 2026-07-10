import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSegmentProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function FilterRail({ children }: { children: ReactNode }) {
  return (
    <div className="bk-filter-rail" role="group">
      {children}
    </div>
  );
}

export function FilterSelect({ label, value, options, onChange }: FilterSegmentProps) {
  return (
    <label className="bk-filter-seg">
      <span className="bk-filter-label">{label}</span>
      <select
        className="bk-filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterButtons({ label, value, options, onChange }: FilterSegmentProps) {
  return (
    <div className="bk-filter-seg">
      <span className="bk-filter-label">{label}</span>
      <div className="bk-filter-btns" role="tablist">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={value === o.value}
            className={clsx('bk-filter-btn', value === o.value && 'is-active')}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
