import { PokerCard } from 'poker-analyzer';

export const Ranks = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
    <PokerCard card="As" />
    <PokerCard card="Kh" />
    <PokerCard card="Td" />
    <PokerCard card="7c" />
  </div>
);

export const Suits = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
    <PokerCard card="Ah" size="lg" />
    <PokerCard card="Ad" size="lg" />
    <PokerCard card="Ac" size="lg" />
    <PokerCard card="As" size="lg" />
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
    <PokerCard card="Qh" size="sm" />
    <PokerCard card="Qh" size="md" />
    <PokerCard card="Qh" size="lg" />
    <PokerCard card="Qh" size="xl" />
  </div>
);

export const HoleAndBoard = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
    <div style={{ display: 'flex', gap: 4 }}>
      <PokerCard card="Ks" size="lg" />
      <PokerCard card="Qs" size="lg" />
    </div>
    <div style={{ display: 'flex', gap: 4 }}>
      <PokerCard card="Jc" />
      <PokerCard card="Th" />
      <PokerCard card="2d" />
      <PokerCard card="back" />
      <PokerCard card="back" />
    </div>
  </div>
);
