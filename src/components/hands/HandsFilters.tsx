import { Search } from 'lucide-react';
import type { Position, Scenario } from '../../types/analysis';

const POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP1', 'MP', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'BTN/SB'];

const SCENARIOS: Scenario[] = [
  'RFI', 'BLIND_WAR', 'HU_BTN', 'FACING_RAISE', 'FACING_3BET', 'FACING_ALL_IN',
  'FACING_LIMP', 'BB_VS_RAISE', 'BB_VS_RAISE_MULTIWAY', 'BB_VS_LARGE_RAISE', 'BB_VS_LIMP', 'WALK',
];

const STACK_DEPTHS = ['deep', 'medium', 'short'] as const;
export type StackDepth = typeof STACK_DEPTHS[number];

const HAND_CATEGORIES = ['pairs', 'broadway', 'suited-connectors', 'suited-aces', 'suited-gappers', 'offsuit'] as const;
export type HandCategory = typeof HAND_CATEGORIES[number];

const COMPLIANCE_FILTERS = ['compliant', 'deviation', 'not-graded'] as const;
export type ComplianceFilter = typeof COMPLIANCE_FILTERS[number];

const STACK_DEPTH_LABELS: Record<StackDepth, string> = {
  deep: 'Deep (>40bb)',
  medium: 'Medium (20-40bb)',
  short: 'Short (<20bb)',
};

const CATEGORY_LABELS: Record<HandCategory, string> = {
  pairs: 'Pairs',
  broadway: 'Broadway',
  'suited-connectors': 'Suited Connectors',
  'suited-aces': 'Suited Aces',
  'suited-gappers': 'Suited Gappers & Other',
  offsuit: 'Offsuit',
};

const COMPLIANCE_LABELS: Record<ComplianceFilter, string> = {
  compliant: 'Compliant',
  deviation: 'Deviation',
  'not-graded': 'Not graded',
};

export interface HandsFiltersProps {
  searchKey: string;
  setSearchKey: (val: string) => void;
  posFilter: Position | '';
  setPosFilter: (val: Position | '') => void;
  scenarioFilter: Scenario | '';
  setScenarioFilter: (val: Scenario | '') => void;
  actionFilter: string;
  setActionFilter: (val: string) => void;
  complianceFilter: ComplianceFilter | '';
  setComplianceFilter: (val: ComplianceFilter | '') => void;
  stackFilter: StackDepth | '';
  setStackFilter: (val: StackDepth | '') => void;
  categoryFilter: HandCategory | '';
  setCategoryFilter: (val: HandCategory | '') => void;
}

export function HandsFilters(props: HandsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--fg-muted)]" />
        <input
          type="text"
          placeholder="Search hand (e.g., AKs)"
          value={props.searchKey}
          onChange={(e) => props.setSearchKey(e.target.value)}
          className="pl-8 pr-3 py-2 text-sm bg-[var(--ink-1)] border border-[var(--hairline)] rounded-lg text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <FilterSelect value={props.posFilter} onChange={props.setPosFilter} options={POSITIONS} placeholder="Position" />
      <FilterSelect value={props.scenarioFilter} onChange={props.setScenarioFilter} options={SCENARIOS} placeholder="Scenario" />
      <FilterSelect value={props.actionFilter} onChange={props.setActionFilter} options={['fold', 'raise', 'call', 'check']} placeholder="Pre-flop Action" />
      <FilterSelect value={props.complianceFilter} onChange={props.setComplianceFilter} options={COMPLIANCE_FILTERS} labels={COMPLIANCE_LABELS} placeholder="Reference verdict" />
      <FilterSelect value={props.stackFilter} onChange={props.setStackFilter} options={STACK_DEPTHS} labels={STACK_DEPTH_LABELS} placeholder="Stack" />
      <FilterSelect value={props.categoryFilter} onChange={props.setCategoryFilter} options={HAND_CATEGORIES} labels={CATEGORY_LABELS} placeholder="Category" />
    </div>
  );
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  labels,
}: {
  value: T | '';
  onChange: (val: T | '') => void;
  options: readonly T[];
  placeholder: string;
  labels?: Record<T, string>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | '')}
      className="px-3 py-2 text-sm bg-[var(--ink-1)] border border-[var(--hairline)] rounded-lg text-[var(--fg)] focus:outline-none focus:border-[var(--accent)]"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labels ? labels[opt] : opt}
        </option>
      ))}
    </select>
  );
}
