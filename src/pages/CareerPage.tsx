import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { CareerOverviewTab } from '../components/career/CareerOverviewTab';
import { CareerTiersTab } from '../components/career/CareerTiersTab';
import { CareerNemesisTab } from '../components/career/CareerNemesisTab';
import { CareerHighImpactHandsTab } from '../components/career/CareerHighImpactHandsTab';
import { HandReplay } from '../components/hands/HandReplay';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { buildUngradedScenarioImpact } from '../analysis/ungradedScenarios';
import { useAppStore } from '../data/appStore';
import { getRecentImportRuns } from '../data/store';
import { summarizeDataHealth } from '../data/importRuns';
import { DataHealthAlertIcon, dataHealthAlertToneClass } from '../components/shared/DataHealthAlert';
import type { Tournament, Hand } from '../types/hand';
import type { HeroDecision } from '../types/analysis';
import type { VillainProfile } from '../types/villain';
import { AlertTriangle, Calendar, TableProperties, Swords, Flame } from 'lucide-react';

export function CareerPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [decisions, setDecisions] = useState<HeroDecision[]>([]);
  const [hands, setHands] = useState<Hand[]>([]);
  const [villains, setVillains] = useState<VillainProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { strategyProfile } = useAppStore();
  const recentImportRuns = useLiveQuery(() => getRecentImportRuns(1), [], []);
  const dataHealth = summarizeDataHealth(recentImportRuns ?? []);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'overview' | 'tiers' | 'nemesis' | 'hands') || 'overview';

  const [selectedHand, setSelectedHand] = useState<Hand | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<HeroDecision | null>(null);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [allTourns, allDecisions, allHands, allVillains] = await Promise.all([
      db.tournaments.toArray(),
      db.heroDecisions.toArray(),
      db.hands.toArray(),
      db.villains.toArray()
    ]);
    // Sort tournaments by startDate (if available) or ID
    const sorted = allTourns.sort((a, b) => {
      if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
      return a.id.localeCompare(b.id);
    });
    setTournaments(sorted);
    setDecisions(batchCheckCompliance(allDecisions, strategyProfile));
    setHands(allHands);
    setVillains(allVillains);
    setLoading(false);
  }, [strategyProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ungradedScenarioImpact = useMemo(() => {
    return buildUngradedScenarioImpact(decisions);
  }, [decisions]);

  const handleOpenReplayer = (hand: Hand, decision: HeroDecision) => {
    setSelectedHand(hand);
    setSelectedDecision(decision);
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-[var(--fg-dim)]">Mapping career data...</div>;
  }

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col gap-2 mb-8">
         <span className="kick sig mb-2 block">Player Career</span>
         <h1 className="text-3xl font-bold text-[var(--fg)]">Evolution & Stats</h1>
         <p className="lede text-[var(--fg-dim)] max-w-2xl">
           Chronological overview of your tournament journey, achievements, and financial evolution.
         </p>
      </header>

      {dataHealth.status === 'ready' && (dataHealth.confidence === 'low' || dataHealth.confidence === 'medium') && (
        <div className={clsx(
          'flex items-start gap-3 rounded-xl border p-4 text-xs shadow-md',
          dataHealthAlertToneClass(dataHealth.confidence === 'low')
        )}>
          <DataHealthAlertIcon isDanger={dataHealth.confidence === 'low'} />
          <div>
            <span className="font-bold uppercase tracking-wider">
              {dataHealth.confidence === 'low' ? 'Action Required' : 'Directional Analysis'}:
            </span>{' '}
            {dataHealth.confidence === 'low'
              ? 'Your latest import encountered significant warnings or failures. Career financials, profit charts, and ABI stats may be incomplete or biased. Fix import warnings in the Upload tab before trusting metrics.'
              : 'Your latest import completed with minor warnings. Profit timelines and career scorecards are highly useful but should be treated as directional.'}
            <div className="mt-2">
              <Link
                to="/hands?panel=data-health#data-health"
                className="inline-flex items-center gap-1 font-bold text-white hover:underline uppercase tracking-wider text-[10px]"
              >
                Review Import Warnings &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {ungradedScenarioImpact.total > 0 && (
        <section
          className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 p-5 text-xs shadow-md shadow-black/10"
          data-testid="career-ungraded-scenario-notice"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--accent)]" />
            <div className="min-w-0 flex-1">
              <span className="font-bold uppercase tracking-wider text-[var(--accent)]">Stats caveat</span>
              <h2 className="mt-1 text-base font-black text-white">Strategy metrics omit not-graded review spots</h2>
              <p className="mt-2 leading-6 text-[var(--fg-dim)]">
                {ungradedScenarioImpact.total} of {ungradedScenarioImpact.total + ungradedScenarioImpact.gradeable} imported decisions are intentionally routed to study/export review instead of compliance scoring. ROI and profit remain raw imported outcomes, but compliance, leak confidence, and high-impact-hand study mix should not treat these spots as clean until exact range/solver support exists.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">Not graded</span>
                  <strong className="mt-1 block text-sm text-white">
                    {ungradedScenarioImpact.total} ({Math.round(ungradedScenarioImpact.rate * 100)}%)
                  </strong>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">Gradeable</span>
                  <strong className="mt-1 block text-sm text-white">{ungradedScenarioImpact.gradeable}</strong>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">Fold / continue</span>
                  <strong className="mt-1 block text-sm text-white">
                    {ungradedScenarioImpact.folded} / {ungradedScenarioImpact.continued}
                  </strong>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">Scenario families</span>
                  <strong className="mt-1 block text-sm text-white">{ungradedScenarioImpact.scenarioCount}</strong>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-[var(--fg-dim)]">
                {ungradedScenarioImpact.topScenarios.map((row) => (
                  <li key={row.id} className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white">{row.scenario.replace(/_/g, ' ')}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
                      {row.count} spots · {row.folded} folded · {row.continued} continued
                    </span>
                    <p className="mt-1 leading-5">{row.reason}</p>
                  </li>
                ))}
              </ul>
              <Link
                to="/hands"
                className="mt-4 inline-flex items-center gap-1 font-bold text-white hover:underline uppercase tracking-wider text-[10px]"
              >
                Open Hand Archive not-graded queue &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Tabs Switcher */}
      <div className="tabs mb-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={activeTab === 'overview' ? 'on' : ''}
        >
          <Calendar size={16} /> Overview
        </button>
        <button
          onClick={() => setActiveTab('tiers')}
          className={activeTab === 'tiers' ? 'on' : ''}
        >
          <TableProperties size={16} /> Tiers & Formats
        </button>
        <button
          onClick={() => setActiveTab('nemesis')}
          className={activeTab === 'nemesis' ? 'on' : ''}
        >
          <Swords size={16} /> Nemesis & Opponents
        </button>
        <button
          onClick={() => setActiveTab('hands')}
          className={activeTab === 'hands' ? 'on' : ''}
        >
          <Flame size={16} /> High Impact Hands
        </button>
      </div>

      {/* Tabs Content */}
      {activeTab === 'overview' && (
        <CareerOverviewTab
          tournaments={tournaments}
          decisions={decisions}
          strategyProfile={strategyProfile}
          onDemoLoaded={loadData}
        />
      )}

      {activeTab === 'tiers' && (
        <CareerTiersTab tournaments={tournaments} />
      )}

      {activeTab === 'nemesis' && (
        <CareerNemesisTab hands={hands} villains={villains} />
      )}

      {activeTab === 'hands' && (
        <CareerHighImpactHandsTab
          decisions={decisions}
          hands={hands}
          onOpenReplay={handleOpenReplayer}
        />
      )}

      {/* Hand Replay Modal */}
      {selectedHand && (
        <HandReplay
          hand={selectedHand}
          heroDecision={selectedDecision}
          onClose={() => {
            setSelectedHand(null);
            setSelectedDecision(null);
          }}
        />
      )}
    </div>
  );
}
