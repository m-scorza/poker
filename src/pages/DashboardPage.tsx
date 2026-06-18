import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { useAppStore } from '../data/appStore';
import { groupIntoSessions, computeSessionTrends, computeIntraSessionTrends } from '../data/sessions';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { buildCareerCoachReport } from '../analysis/careerCoach';
import { computePositionStats } from '../analysis/positionStats';
import { buildStudyQueue } from '../analysis/studyPlan';
import { getTournamentRevenue } from '../analysis/financials';
import { sumUsd } from '../parser/money';

import { MonumentCurve } from '../components/dashboard/MonumentCurve';
import { VerdictGauge } from '../components/dashboard/VerdictGauge';
import { RingHud } from '../components/dashboard/RingHud';
import { PositionalHeatmap } from '../components/dashboard/PositionalHeatmap';
import { BankrollChart } from '../components/dashboard/BankrollChart';
import { WireTape } from '../components/dashboard/WireTape';
import { DemoDataButton } from '../components/shared/DemoDataButton';

export function DashboardPage() {
  const { strategyProfile, activeSessionId } = useAppStore();

  const totalHands = useLiveQuery(() => db.hands.count(), []) ?? 0;

  const rawData = useLiveQuery(async () => {
    const rawHands = await db.hands.toArray();
    const rawDecisions = await db.heroDecisions.toArray();
    const rawTournaments = await db.tournaments.toArray();
    return { rawHands, rawDecisions, rawTournaments };
  }, []);

  const data = useMemo(() => {
    if (!rawData) return null;
    const { rawHands, rawDecisions, rawTournaments } = rawData;

    const tMap = new Map(rawTournaments.map(t => [t.id, t]));
    const decisionMap = new Map(rawDecisions.map(d => [d.handId, d]));

    const sessionsGrouped = groupIntoSessions(rawHands, decisionMap, tMap);
    const trendData = computeSessionTrends(sessionsGrouped);

    let filteredHands = rawHands;
    let filteredDecisions = rawDecisions;

    if (activeSessionId !== 'all') {
      const activeSession = sessionsGrouped.find(s => s.id === activeSessionId);
      if (activeSession) {
         filteredHands = activeSession.hands;
         filteredDecisions = filteredHands.map(h => decisionMap.get(h.id)).filter((d): d is NonNullable<typeof d> => d !== undefined);
      }
    }

    const allChecked = batchCheckCompliance(rawDecisions, strategyProfile);
    const allStats = computeAggregateStats(allChecked);
    const allLeaks = detectLeaks(allStats, strategyProfile);
    const careerCoachReport = buildCareerCoachReport(rawTournaments, allChecked, allLeaks);

    const checked = activeSessionId === 'all'
      ? allChecked
      : batchCheckCompliance(filteredDecisions, strategyProfile);
    const stats = activeSessionId === 'all' ? allStats : computeAggregateStats(checked);
    const leaks = activeSessionId === 'all' ? allLeaks : detectLeaks(stats, strategyProfile);
    const positionStats = computePositionStats(checked, filteredHands);
    const studyQueue = buildStudyQueue(leaks, checked, filteredHands, 5);

    const financialSessions = activeSessionId === 'all'
      ? sessionsGrouped
      : sessionsGrouped.filter(s => s.id === activeSessionId);

    const totalPnl = sumUsd(financialSessions.map(s => s.pnl));
    const totalBuyIns = sumUsd(financialSessions.map(s => s.buyIns));
    const totalPrizes = sumUsd(financialSessions.map(s => s.prizes));

    const uniqueTourneys = new Set<string>();
    financialSessions.forEach(s => s.tournamentIds.forEach(id => uniqueTourneys.add(id)));
    const totalTournaments = uniqueTourneys.size;

    let itmCount = 0;
    uniqueTourneys.forEach(id => {
       const t = tMap.get(id);
       if (t && getTournamentRevenue(t) > 0) itmCount++;
    });

    const statsSummary = { totalBuyIns, totalPrizes, totalTournaments, itmCount };
    const displayTrend = activeSessionId === 'all' ? trendData : computeIntraSessionTrends(checked, filteredHands);

    return { stats, leaks, trendData, sessionsGrouped, totalPnl, statsSummary, positionStats, displayTrend, careerCoachReport, studyQueue };
  }, [rawData, activeSessionId, strategyProfile]);

  if (totalHands === 0) {
    return (
      <div style={{ padding: 'var(--s-xl)', textAlign: 'center' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--fg)' }}>No Data Found</h3>
        <p className="text-sm mb-8" style={{ color: 'var(--fg-dim)' }}>
           Drag your Hand History or Summary files to the Hands tab to start.
        </p>
        <DemoDataButton />
      </div>
    );
  }

  const aggregateStats = data?.stats;
  const leaks = data?.leaks ?? [];
  const totalPnl = data?.totalPnl ?? 0;
  const statsSummary = data?.statsSummary ?? { totalBuyIns: 0, totalPrizes: 0, totalTournaments: 0, itmCount: 0 };
  const positionStats = data?.positionStats ?? [];
  const careerCoachReport = data?.careerCoachReport;

  const vpip = aggregateStats && aggregateStats.totalHands > 0 ? (aggregateStats.vpipHands / aggregateStats.totalHands) * 100 : 0;
  const pfr = aggregateStats && aggregateStats.totalHands > 0 ? (aggregateStats.pfrHands / aggregateStats.totalHands) * 100 : 0;
  const threeBet = aggregateStats && aggregateStats.threeBetOpps > 0 ? (aggregateStats.threeBetMade / aggregateStats.threeBetOpps) * 100 : 0;
  
  const roiRaw = statsSummary.totalBuyIns > 0 ? (totalPnl / statsSummary.totalBuyIns) * 100 : 0;
  const roi = `${roiRaw.toFixed(1)}%`;
  
  const itmRateRaw = statsSummary.totalTournaments > 0 ? (statsSummary.itmCount / statsSummary.totalTournaments) * 100 : 0;
  const itmRate = `${itmRateRaw.toFixed(1)}%`;

  const topLeak = leaks[0];

  const sampleConfidence = careerCoachReport?.sampleConfidence ?? 'low';
  const verdictConf = `Confidence: ${sampleConfidence.charAt(0).toUpperCase()}${sampleConfidence.slice(1)}`;

  const wireItems = [
    { t: 'PROFIT', v: `$${totalPnl.toFixed(2)}`, cls: totalPnl >= 0 ? 'up' : 'loss' },
    { t: 'VPIP', v: `${vpip.toFixed(1)}%` },
    { t: 'PFR',  v: `${pfr.toFixed(1)}%` },
    { t: '3BET', v: `${threeBet.toFixed(1)}%` },
  ];

  return (
    <>
      <WireTape wireItems={wireItems} />
      
      <div className="desk-head">
        <div className="dh-left">
          <span className="kick">Desk &gt; Overview &gt; System</span>
          <h2>Command Desk <span>[{totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}]</span></h2>
        </div>
        <div className="dh-right">
          <button className="btn"><i className="icon-cloud"></i>Sync</button>
          <button className="btn primary">Export report</button>
        </div>
      </div>

      <main className="desk-grid">
        <MonumentCurve 
          totalPnl={totalPnl} 
          tournaments={statsSummary.totalTournaments} 
          roi={roi} 
          itmRate={itmRate} 
          verdict={careerCoachReport?.recommendation || "You're cash positive."} 
        />
        
        <VerdictGauge 
          score={careerCoachReport?.stakeReadinessScore ?? 0}
          verdictReco={careerCoachReport?.recommendation.split('.')[0] || 'Keep grinding'}
          verdictConf={verdictConf}
          roi={roi}
          totalPnl={totalPnl}
          blockerTitle={topLeak?.name || 'No major leaks'}
          blockerDesc={topLeak?.description || 'Your ranges are solid.'}
          fixText={topLeak ? `Review ${topLeak.name}` : ''}
        />
        
        <RingHud vpip={vpip} pfr={pfr} threeBet={threeBet} />
        
        {topLeak && (
           <section className="card headline reveal in">
              <div>
                <span className="kick loss">Headline incident · the #1 leak</span>
                <h2 className="hl-title">{topLeak.name}</h2>
                <p className="hl-prose" dangerouslySetInnerHTML={{ __html: topLeak.description }} />
              </div>
           </section>
        )}
        
        <BankrollChart trendData={data?.trendData || []} />
        
        <PositionalHeatmap stats={positionStats} />
      </main>
    </>
  );
}
