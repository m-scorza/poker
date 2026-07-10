export const CURRICULUM_PROGRESS_STORAGE_KEY = 'poker-xray:curriculum-progress:v1';

export interface CurriculumProgressEntry {
  packSlug: string;
  reviewedSpotIds: string[];
  attempts: number;
  correct: number;
  totalSpots: number;
  isComplete: boolean;
  updatedAt: string;
  completedAt?: string;
}

export type CurriculumProgressStore = Record<string, CurriculumProgressEntry>;

export interface CurriculumSpotReview {
  packSlug: string;
  spotId: string;
  wasCorrect: boolean;
  totalSpots: number;
  updatedAt?: string;
}

function storage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function normalizeReviewedSpotIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)));
}

function normalizeCurriculumProgressEntry(raw: unknown): CurriculumProgressEntry | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.packSlug !== 'string' || record.packSlug.length === 0) return null;

  const reviewedSpotIds = normalizeReviewedSpotIds(record.reviewedSpotIds);
  const attempts = safeCount(record.attempts);
  const correct = Math.min(safeCount(record.correct), attempts);
  const totalSpots = Math.max(1, safeCount(record.totalSpots), reviewedSpotIds.length);
  const isComplete = record.isComplete === true || reviewedSpotIds.length >= totalSpots;

  return {
    packSlug: record.packSlug,
    reviewedSpotIds,
    attempts,
    correct,
    totalSpots,
    isComplete,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
    ...(typeof record.completedAt === 'string' || isComplete
      ? { completedAt: typeof record.completedAt === 'string' ? record.completedAt : new Date(0).toISOString() }
      : {}),
  };
}

export function buildCurriculumProgress(
  previous: CurriculumProgressStore,
  review: CurriculumSpotReview,
): CurriculumProgressStore {
  const existing = normalizeCurriculumProgressEntry(previous[review.packSlug]);
  const updatedAt = review.updatedAt ?? new Date().toISOString();
  const reviewedSpotIds = normalizeReviewedSpotIds([...(existing?.reviewedSpotIds ?? []), review.spotId]);
  const attempts = (existing?.attempts ?? 0) + 1;
  const correct = (existing?.correct ?? 0) + (review.wasCorrect ? 1 : 0);
  const totalSpots = Math.max(1, Math.floor(review.totalSpots), reviewedSpotIds.length);
  const isComplete = reviewedSpotIds.length >= totalSpots;
  const completedAt = existing?.completedAt ?? (isComplete ? updatedAt : undefined);

  return {
    ...previous,
    [review.packSlug]: {
      packSlug: review.packSlug,
      reviewedSpotIds,
      attempts,
      correct,
      totalSpots,
      isComplete,
      updatedAt,
      ...(completedAt ? { completedAt } : {}),
    },
  };
}

export function readCurriculumProgress(): CurriculumProgressStore {
  const local = storage();
  if (!local) return {};
  try {
    const raw = local.getItem(CURRICULUM_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce<CurriculumProgressStore>((store, [key, value]) => {
      const entry = normalizeCurriculumProgressEntry(value);
      if (entry) store[key] = entry;
      return store;
    }, {});
  } catch {
    return {};
  }
}

function writeCurriculumProgress(progress: CurriculumProgressStore): void {
  const local = storage();
  if (!local) return;
  try {
    local.setItem(CURRICULUM_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
}

export function recordCurriculumSpotReview(review: CurriculumSpotReview): CurriculumProgressEntry | null {
  const progress = buildCurriculumProgress(readCurriculumProgress(), review);
  writeCurriculumProgress(progress);
  return progress[review.packSlug] ?? null;
}
