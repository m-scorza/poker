import { describe, it, expect } from 'vitest';
import { getEvidenceMetadata } from '../evidence';
import { createEvidence, UNSUPPORTED_EVIDENCE } from '../../types/evidence';

describe('evidence metadata utilities', () => {
  describe('getEvidenceMetadata', () => {
    it('handles local heads-up push/fold references correctly', () => {
      // cleanId contains reference-hu-push-fold
      const res1 = getEvidenceMetadata('reference-hu-push-fold');
      expect(res1.label).toBe('local-reference');
      expect(res1.badgeClass).toContain('text-amber-400');
      expect(res1.strength).toBe('reference_check');
      expect(res1.strengthLabel).toBe('Reference check');
      expect(res1.solverBacked).toBe(false);

      // cleanId contains cbet_hu
      // Note: cbet_hu itself falls through the inner condition to return proxy-model
      const res2 = getEvidenceMetadata('cbet_hu');
      expect(res2.label).toBe('proxy-model');
      expect(res2.strengthLabel).toBe('Directional only');

      // sourceKind is reference but cleanId has reference-hu-push-fold
      const res3 = getEvidenceMetadata('reference-hu-push-fold', 'reference');
      expect(res3.label).toBe('local-reference');
    });

    it('handles unsupported/raw outcomes correctly', () => {
      // cleanId contains loss-biggest-bb-swings
      const res1 = getEvidenceMetadata('loss-biggest-bb-swings');
      expect(res1.label).toBe('unsupported');
      expect(res1.badgeClass).toContain('text-rose-400');
      expect(res1.strength).toBe('review_only');
      expect(res1.caveat).toContain('not as a verdict');

      // sourceKind is loss
      const res2 = getEvidenceMetadata('any-id', 'loss');
      expect(res2.label).toBe('unsupported');
    });

    it('handles rule-based preflop rules correctly', () => {
      // cleanId contains vpip
      expect(getEvidenceMetadata('vpip_stat').label).toBe('rule-based');
      expect(getEvidenceMetadata('vpip_stat').strengthLabel).toBe('Rule-based, no EV');
      // cleanId contains pfr
      expect(getEvidenceMetadata('pfr_stat').label).toBe('rule-based');
      // cleanId contains limping/limps
      expect(getEvidenceMetadata('limping_hands').label).toBe('rule-based');
      expect(getEvidenceMetadata('limps_ratio').label).toBe('rule-based');
      // cleanId contains 3bet/three_bet
      expect(getEvidenceMetadata('three_bet_pct').label).toBe('rule-based');
      expect(getEvidenceMetadata('3bet_ratio').label).toBe('rule-based');
      // cleanId contains compliance
      expect(getEvidenceMetadata('gto_compliance').label).toBe('rule-based');
      // cleanId contains deviation-
      expect(getEvidenceMetadata('deviation-preflop').label).toBe('rule-based');
      // sourceKind is deviation
      expect(getEvidenceMetadata('some-id', 'deviation').label).toBe('rule-based');
    });

    it('handles proxy-model postflop rules correctly', () => {
      // default fallthrough or specific postflop keywords
      expect(getEvidenceMetadata('wtsd').label).toBe('proxy-model');
      expect(getEvidenceMetadata('wtsd').badgeClass).toContain('text-blue-400');
      expect(getEvidenceMetadata('wtsd').strength).toBe('directional');
      expect(getEvidenceMetadata('won_at_sd').label).toBe('proxy-model');
      
      // postflop_ prefix overrides isPreflopRule match
      expect(getEvidenceMetadata('postflop_vpip').label).toBe('proxy-model');
    });

    it('handles fallback default outcome correctly', () => {
      const res = getEvidenceMetadata('completely-unknown-metric');
      expect(res.label).toBe('proxy-model');
      expect(res.solverBacked).toBe(false);
    });

    it('prefers canonical evidence over id heuristics', () => {
      const res = getEvidenceMetadata('loss-biggest-bb-swings', 'loss', createEvidence('rule_based', [
        {
          docPath: 'docs/knowledge/strategy/09-study-methods-and-tools.md',
          section: '4. Leak Finder Framework',
          quote: 'Create a study plan targeting the biggest leaks first',
        },
      ]));

      expect(res.label).toBe('rule-based');
      expect(res.canonicalKind).toBe('rule_based');
      expect(res.citationStatus).toBe('present');
      expect(res.citationLabel).toBe('KB cited');
      expect(res.canRenderAsAdvice).toBe(true);
    });

    it('surfaces missing citations for non-unsupported evidence', () => {
      const res = getEvidenceMetadata('postflop-missed-cbet', 'postflop', createEvidence('proxy_model'));

      expect(res.label).toBe('proxy-model');
      expect(res.citationStatus).toBe('missing');
      expect(res.citationLabel).toBe('Needs citation');
      expect(res.citationTooltip).toContain('no knowledge-base citation');
    });

    it('keeps unsupported evidence review-only even when the id looks rule-based', () => {
      const res = getEvidenceMetadata('vpip_stat', undefined, UNSUPPORTED_EVIDENCE);

      expect(res.label).toBe('unsupported');
      expect(res.strength).toBe('review_only');
      expect(res.citationStatus).toBe('not_required');
      expect(res.canRenderAsAdvice).toBe(false);
    });
  });
});
