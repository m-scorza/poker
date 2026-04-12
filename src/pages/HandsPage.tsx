import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { Search, Filter, ChevronDown, ChevronUp, Eye, Upload as UploadIcon, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../data/appStore';
import { getAllHeroDecisions, getHands, importHands, importTournamentSummaries, getTotalHandCount } from '../data/store';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { HandReplay } from '../components/hands/HandReplay';
import { parsePokerStarsFile } from '../parser/pokerstars';
import { buildHeroDecision } from '../analysis/scenarioDetector';
import { parseTournamentSummary } from '../parser/tournamentSummary';
import type { Hand } from '../types/hand';
import type { HeroDecision, Position, Scenario, DeviationType } from '../types/analysis';

const POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP1', 'MP', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'BTN/SB'];

const SCENARIOS: Scenario[] = [
  'RFI', 'BLIND_WAR', 'HU_BTN', 'FACING_RAISE', 'FACING_ALL_IN',
  'FACING_LIMP', 'BB_VS_RAISE', 'BB_VS_LARGE_RAISE', 'BB_VS_LIMP', 'WALK',
];

const STACK_DEPTHS = ['deep', 'medium', 'short'] as const;
type StackDepth = typeof STACK_DEPTHS[number];

const HAND_CATEGORIES = ['pairs', 'broadway', 'suited-connectors', 'suited-aces', 'offsuit'] as const;
type HandCategory = typeof HAND_CATEGORIES[number];

const DEVIATION_LABELS: Record<DeviationType, string> = {
  OVERFOLD: 'Overfold',
  OPENED_OUT_OF_RANGE: 'Fora do range',
  LIMPED: 'Limp',
  SB_OVERFOLD: 'SB Overfold',
  SB_LIMPED: 'SB Limp',
  SB_OUT_OF_RANGE: 'SB Fora do range',
  COLD_CALL: 'Cold Call',
  BB_FOLD_SUITED: 'BB Fold Suited',
  SB_COLD_CALL: 'SB Cold Call',
  FOLD_VS_LIMP: 'Fold vs Limp',
  LIMP_BEHIND: 'Limp Behind',
  HU_BTN_FOLD: 'HU BTN Fold',
};

function getStackDepth(bb: number): StackDepth {
  if (bb > 40) return 'deep';
  if (bb >= 20) return 'medium';
  return 'short';
}

function getHandCategory(handKey: string): HandCategory {
  if (handKey.length === 2) return 'pairs';
  if (handKey.endsWith('s')) {
    const r1 = handKey[0]!;
    const r2 = handKey[1]!;
    if (r1 === 'A') return 'suited-aces';
    const broadways = new Set(['A', 'K', 'Q', 'J', 'T']);
    if (broadways.has(r1) && broadways.has(r2)) return 'broadway';
    const ranks = '23456789TJQKA';
    const diff = Math.abs(ranks.indexOf(r1) - ranks.indexOf(r2));
    if (diff === 1) return 'suited-connectors';
    return 'broadway';
  }
  const broadways = new Set(['A', 'K', 'Q', 'J', 'T']);
  if (broadways.has(handKey[0]!) && broadways.has(handKey[1]!)) return 'broadway';
  return 'offsuit';
}

const STACK_DEPTH_LABELS: Record<StackDepth, string> = {
  deep: 'Deep (>40bb)',
  medium: 'Medium (20-40bb)',
  short: 'Short (<20bb)',
};

const CATEGORY_LABELS: Record<HandCategory, string> = {
  pairs: 'Pares',
  broadway: 'Broadway',
  'suited-connectors': 'Suited Connectors',
  'suited-aces': 'Suited Aces',
  offsuit: 'Offsuit',
};

export function HandsPage() {
  const [decisions, setDecisions] = useState<HeroDecision[]>([]);
  const [handsMap, setHandsMap] = useState<Map<string, Hand>>(new Map());
  
  // Filters
  const [posFilter, setPosFilter] = useState<Position | ''>('');
  const [scenarioFilter, setScenarioFilter] = useState<Scenario | ''>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [complianceFilter, setComplianceFilter] = useState<string>('');
  const [stackFilter, setStackFilter] = useState<StackDepth | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<HandCategory | ''>('');
  const [searchKey, setSearchKey] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<'handId' | 'position' | 'handKey' | 'scenario' | 'action' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // View state
  const [replayHandId, setReplayHandId] = useState<string | null>(null);
  const { strategyProfile } = useAppStore();

  // Derived replay data
  const replayHand = replayHandId ? handsMap.get(replayHandId) ?? null : null;
  const replayDecision = replayHandId ? decisions.find((d) => d.handId === replayHandId) ?? null : null;

  const load = useCallback(async () => {
    const [raw, hands] = await Promise.all([getAllHeroDecisions(), getHands()]);
    const checked = batchCheckCompliance(raw, strategyProfile);
    setDecisions(checked);
    setHandsMap(new Map(hands.map((h) => [h.id, h])));
  }, [strategyProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = decisions;
    
    // Apply date filter through handsMap
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).getTime() : 0;
      const to = dateTo ? new Date(dateTo).getTime() : Infinity;
      result = result.filter(d => {
        const hand = handsMap.get(d.handId);
        if (!hand) return false;
        const time = hand.date.getTime();
        return time >= from && time <= to;
      });
    }

    if (posFilter) result = result.filter((d) => d.position === posFilter);
    if (scenarioFilter) result = result.filter((d) => d.scenario === scenarioFilter);
    if (actionFilter) result = result.filter((d) => d.action === actionFilter);
    if (complianceFilter === 'compliant') result = result.filter((d) => d.isCompliant);
    if (complianceFilter === 'deviation') result = result.filter((d) => !d.isCompliant && d.deviationType !== null);
    if (stackFilter) result = result.filter((d) => getStackDepth(d.stackBb) === stackFilter);
    if (categoryFilter) result = result.filter((d) => getHandCategory(d.handKey) === categoryFilter);
    if (searchKey) result = result.filter((d) => d.handKey.toLowerCase().includes(searchKey.toLowerCase()));

    result.sort((a, b) => {
      let av: any = a[sortField as keyof HeroDecision];
      let bv: any = b[sortField as keyof HeroDecision];
      
      if (sortField === 'date') {
        av = handsMap.get(a.handId)?.date.getTime() ?? 0;
        bv = handsMap.get(b.handId)?.date.getTime() ?? 0;
      }
      
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [decisions, handsMap, posFilter, scenarioFilter, actionFilter, complianceFilter, stackFilter, categoryFilter, searchKey, dateFrom, dateTo, sortField, sortAsc]);

  // Reset page to 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [posFilter, scenarioFilter, actionFilter, complianceFilter, stackFilter, categoryFilter, searchKey, dateFrom, dateTo]);

  const paginated = useMemo(() => {
    return filtered.slice(page * pageSize, (page + 1) * pageSize);
  }, [filtered, page]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  return (
    <div className="space-y-6">
      <HandsPageUpload onUploadSuccess={load} />

      <div>
        <h2 className="text-xl font-bold mb-6">Mãos & Arquivo</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Buscar mão (ex: AKs)"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
              title="De (Data)"
            />
            <span className="text-[var(--color-text-muted)]">-</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
              title="Até (Data)"
            />
          </div>

          <Select value={posFilter} onChange={setPosFilter} options={POSITIONS} placeholder="Posição" />
          <Select value={scenarioFilter} onChange={setScenarioFilter} options={SCENARIOS} placeholder="Cenário" />
          <Select value={actionFilter} onChange={setActionFilter} options={['fold', 'raise', 'call', 'check']} placeholder="Ação pre-flop" />
          <Select value={complianceFilter} onChange={setComplianceFilter} options={['compliant', 'deviation']} placeholder="GTO / Compliance" />
          <SelectLabeled value={stackFilter} onChange={setStackFilter} options={STACK_DEPTHS} labels={STACK_DEPTH_LABELS} placeholder="Stack" />
          <SelectLabeled value={categoryFilter} onChange={setCategoryFilter} options={HAND_CATEGORIES} labels={CATEGORY_LABELS} placeholder="Categoria" />
        </div>

        <div className="flex justify-between items-center mb-3">
          <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <Filter size={12} />
            {filtered.length} de {decisions.length} mãos
          </p>

          <div className="flex items-center gap-3">
             <button 
               onClick={() => setPage(p => Math.max(0, p - 1))}
               disabled={page === 0}
               className="p-1 rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
             >
               <ChevronLeft size={16} />
             </button>
             <span className="text-xs font-data">Pág {page + 1} de {Math.ceil(filtered.length / pageSize) || 1}</span>
             <button 
               onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / pageSize) - 1, p + 1))}
               disabled={page >= Math.ceil(filtered.length / pageSize) - 1}
               className="p-1 rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
             >
               <ChevronRight size={16} />
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left bg-[var(--color-bg-hover)]">
                  {([
                    ['date', 'Data'],
                    ['handId', 'Hand ID'],
                    ['position', 'Posição'],
                    ['handKey', 'Mão'],
                    ['scenario', 'Cenário'],
                    ['action', 'Ação'],
                  ] as const).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className="px-3 py-2.5 text-xs text-[var(--color-text-dim)] uppercase tracking-wide cursor-pointer hover:text-[var(--color-text)]"
                    >
                      <span className="flex items-center gap-1">
                        {label} <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-xs text-[var(--color-text-dim)] uppercase tracking-wide">
                    Stack
                  </th>
                  <th className="px-3 py-2.5 text-xs text-[var(--color-text-dim)] uppercase tracking-wide">
                    GTO Score
                  </th>
                  <th className="px-3 py-2.5 text-xs text-[var(--color-text-dim)] uppercase tracking-wide w-8" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((d) => {
                  const h = handsMap.get(d.handId);
                  return (
                    <tr
                      key={d.handId}
                      className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <td className="px-3 py-2 font-data text-xs text-[var(--color-text-dim)] whitespace-nowrap">
                        {h?.date.toLocaleDateString() ?? ''} <span className="text-[10px] opacity-70">{h?.date.toLocaleTimeString().slice(0,5)}</span>
                      </td>
                      <td className="px-3 py-2 font-data text-xs text-[var(--color-text-muted)]">
                        {d.handId.slice(-8)}
                      </td>
                      <td className="px-3 py-2 font-data text-xs text-blue-400 font-bold">{d.position}</td>
                      <td className="px-3 py-2 font-data font-bold tracking-wider">{d.handKey}</td>
                      <td className="px-3 py-2 text-xs text-[var(--color-text-dim)]">{d.scenario}</td>
                      <td className="px-3 py-2">
                        <span className={clsx(
                          'text-xs px-1.5 py-0.5 rounded font-data uppercase tracking-wider',
                          d.action === 'raise' && 'bg-emerald-900/40 text-[var(--color-accent)] border border-[var(--color-accent)]/20',
                          d.action === 'fold' && 'bg-gray-800 text-[var(--color-text-dim)] border border-gray-700',
                          d.action === 'call' && 'bg-blue-900/40 text-[var(--color-info)] border border-[var(--color-info)]/20',
                          d.action === 'check' && 'bg-gray-800 text-[var(--color-text-dim)] border border-gray-700',
                        )}>
                          {d.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-data text-xs text-[var(--color-text-dim)]">
                        <span className={clsx(
                          d.stackBb < 20 && 'text-[var(--color-danger)] font-bold',
                          d.stackBb >= 20 && d.stackBb <= 40 && 'text-[var(--color-warning)] font-bold',
                        )}>
                          {d.stackBb.toFixed(0)}bb
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {d.deviationType ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-900/30 text-[var(--color-danger)] uppercase tracking-wider border border-[var(--color-danger)]/30">
                            {DEVIATION_LABELS[d.deviationType]}
                          </span>
                        ) : d.isCompliant ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-900/30 text-[var(--color-accent)] uppercase tracking-wider border border-[var(--color-accent)]/30">
                            COMPLIANT
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {h && (
                          <button
                            onClick={() => setReplayHandId(d.handId)}
                            className="bg-[var(--color-bg-input)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)] p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all shadow-sm"
                            title="Ver replay em profundidade"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
              Nenhuma mão encontrada.
            </div>
          )}
        </div>
      </div>

      {replayHand && (
        <HandReplay
          hand={replayHand}
          heroDecision={replayDecision}
          onClose={() => setReplayHandId(null)}
        />
      )}
    </div>
  );
}

// Upload Component Extracted
function HandsPageUpload({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<Array<{ name: string; parsed?: number; imported?: number; type: 'hand' | 'summary'; error?: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isImporting, setImporting, setTotalHands, heroName, strategyProfile } = useAppStore();

  const processFiles = useCallback(async (files: FileList) => {
    setImporting(true);
    setResults([]);
    const newResults: typeof results = [];

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.txt')) {
        newResults.push({ name: file.name, type: 'hand', error: 'Formato inválido' });
        continue;
      }

      try {
        const content = await file.text();
        
        // Is it a summary?
        if (content.includes('Tournament Summary') || file.name.includes('Summary')) {
          const summary = parseTournamentSummary(content, heroName);
          if (summary) {
            await importTournamentSummaries([summary]);
            newResults.push({ name: file.name, type: 'summary', parsed: 1, imported: 1 });
          } else {
            newResults.push({ name: file.name, type: 'summary', error: 'Falha ao processar Sumário' });
          }
          continue;
        }

        // Hand history
        const parsed = parsePokerStarsFile(content, heroName);
        const handsWithDecisions = parsed.map((p) => {
          const decision = buildHeroDecision(p, heroName);
          return { ...p, heroDecision: decision ?? undefined };
        });

        const decisions = handsWithDecisions
          .map((h) => h.heroDecision)
          .filter((d): d is NonNullable<typeof d> => d !== undefined);
        const checkedDecisions = batchCheckCompliance(decisions, strategyProfile);

        let decIdx = 0;
        const finalHands = handsWithDecisions.map((h) => {
          if (h.heroDecision) {
            const checked = checkedDecisions[decIdx++];
            return { ...h, heroDecision: checked };
          }
          return h;
        });

        const imported = await importHands(finalHands);
        newResults.push({ name: file.name, type: 'hand', parsed: parsed.length, imported });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro';
        newResults.push({ name: file.name, type: 'hand', error: msg });
      }
    }

    setResults(newResults);
    const total = await getTotalHandCount();
    setTotalHands(total);
    setImporting(false);
    onUploadSuccess();
  }, [heroName, strategyProfile, setImporting, setTotalHands, onUploadSuccess]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
  }, [processFiles]);

  const totalHandNodes = results.filter(r => r.type === 'hand' && !r.error);
  const totalSummaryNodes = results.filter(r => r.type === 'summary' && !r.error);
  
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-active)] bg-[var(--color-bg-base)]',
        )}
      >
        <UploadIcon
          size={32}
          className={clsx('mx-auto mb-3', dragOver ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-dim)]')}
        />
        <p className="text-[var(--color-text)] font-semibold mb-1">
          Arraste e Solte Arquivos PokerStars
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Suporta TXT de Mãos e Sumários (.txt)
        </p>
      </div>

      <input ref={fileRef} type="file" accept=".txt" multiple onChange={onFileSelect} className="hidden" />

      {isImporting && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--color-accent)] font-semibold">
          <div className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          Extraindo GTO e Histórico...
        </div>
      )}

      {results.length > 0 && !isImporting && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-sm space-y-2">
           <div className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
             <CheckCircle size={16} className="text-[var(--color-accent)]" /> 
             Processamento Concluído
           </div>
           <div className="text-[var(--color-text-dim)] text-xs">
             {totalHandNodes.reduce((acc, curr) => acc + (curr.imported ?? 0), 0)} Mãos Novas, {totalSummaryNodes.length} Sumários.
           </div>
        </div>
      )}
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T | '';
  onChange: (val: T | '') => void;
  options: readonly T[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | '')}
      className="px-3 py-2 text-sm bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function SelectLabeled<T extends string>({
  value,
  onChange,
  options,
  labels,
  placeholder,
}: {
  value: T | '';
  onChange: (val: T | '') => void;
  options: readonly T[];
  labels: Record<T, string>;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | '')}
      className="px-3 py-2 text-sm bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labels[opt]}
        </option>
      ))}
    </select>
  );
}
