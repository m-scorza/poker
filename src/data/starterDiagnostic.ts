export const STARTER_DIAGNOSTIC_STORAGE_KEY = 'poker-xray:starter-diagnostic-summary:v1';

interface StarterDiagnosticReviewArea {
  label: string;
  misses: number;
  attempts: number;
}

export interface StarterDiagnosticSummary {
  packTitle: string;
  correct: number;
  total: number;
  isComplete: boolean;
  updatedAt: string;
  reviewAreas: StarterDiagnosticReviewArea[];
  recommendedPackTitle: string | null;
}

export interface StarterDiagnosticAnswer {
  packTitle: string;
  sourcePackTitle: string;
  wasCorrect: boolean;
  isComplete: boolean;
  updatedAt: string;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeReviewAreas(value: unknown): StarterDiagnosticReviewArea[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((area): area is StarterDiagnosticReviewArea => (
      typeof area === 'object' &&
      area !== null &&
      'label' in area &&
      'misses' in area &&
      'attempts' in area &&
      typeof area.label === 'string' &&
      typeof area.misses === 'number' &&
      typeof area.attempts === 'number'
    ))
    .map((area) => ({
      label: area.label,
      misses: Math.max(0, area.misses),
      attempts: Math.max(0, area.attempts),
    }));
}

function sortReviewAreas(areas: StarterDiagnosticReviewArea[]): StarterDiagnosticReviewArea[] {
  return [...areas].sort((a, b) =>
    b.misses - a.misses ||
    b.attempts - a.attempts ||
    a.label.localeCompare(b.label)
  );
}

function buildStarterDiagnosticSummary(
  previous: StarterDiagnosticSummary | null,
  answer: StarterDiagnosticAnswer,
): StarterDiagnosticSummary {
  const shouldContinue = previous?.packTitle === answer.packTitle && previous.isComplete === false;
  const base = shouldContinue ? previous : null;
  const reviewAreasByLabel = new Map<string, StarterDiagnosticReviewArea>();

  for (const area of base?.reviewAreas ?? []) {
    reviewAreasByLabel.set(area.label, { ...area });
  }

  const existingArea = reviewAreasByLabel.get(answer.sourcePackTitle);
  if (existingArea || !answer.wasCorrect) {
    const nextArea = existingArea ?? { label: answer.sourcePackTitle, misses: 0, attempts: 0 };
    nextArea.attempts += 1;
    if (!answer.wasCorrect) nextArea.misses += 1;
    reviewAreasByLabel.set(answer.sourcePackTitle, nextArea);
  }

  const reviewAreas = sortReviewAreas(Array.from(reviewAreasByLabel.values()).filter((area) => area.misses > 0));

  return {
    packTitle: answer.packTitle,
    correct: (base?.correct ?? 0) + (answer.wasCorrect ? 1 : 0),
    total: (base?.total ?? 0) + 1,
    isComplete: answer.isComplete,
    updatedAt: answer.updatedAt,
    reviewAreas,
    recommendedPackTitle: reviewAreas[0]?.label ?? null,
  };
}

export function readStarterDiagnosticSummary(): StarterDiagnosticSummary | null {
  const local = storage();
  if (!local) return null;
  try {
    const raw = local.getItem(STARTER_DIAGNOSTIC_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StarterDiagnosticSummary>;
    if (
      typeof parsed.packTitle !== 'string' ||
      typeof parsed.correct !== 'number' ||
      typeof parsed.total !== 'number' ||
      typeof parsed.isComplete !== 'boolean' ||
      typeof parsed.updatedAt !== 'string'
    ) {
      return null;
    }
    const reviewAreas = sortReviewAreas(normalizeReviewAreas(parsed.reviewAreas));
    return {
      packTitle: parsed.packTitle,
      correct: parsed.correct,
      total: parsed.total,
      isComplete: parsed.isComplete,
      updatedAt: parsed.updatedAt,
      reviewAreas,
      recommendedPackTitle: typeof parsed.recommendedPackTitle === 'string'
        ? parsed.recommendedPackTitle
        : reviewAreas[0]?.label ?? null,
    };
  } catch {
    return null;
  }
}

export function recordStarterDiagnosticAnswer(answer: StarterDiagnosticAnswer): StarterDiagnosticSummary | null {
  const local = storage();
  if (!local) return null;
  const summary = buildStarterDiagnosticSummary(readStarterDiagnosticSummary(), answer);
  local.setItem(STARTER_DIAGNOSTIC_STORAGE_KEY, JSON.stringify(summary));
  return summary;
}
