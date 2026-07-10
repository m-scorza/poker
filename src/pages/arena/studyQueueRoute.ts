export interface StudyQueueRouteRequest {
  handId: string | null;
  handIds: string[];
  packetIds: string[];
}

export interface GetDrillPoolOptions {
  handId?: string | null;
  handIds?: string[];
}

function decodeQueryComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function rawQueryParam(search: string, names: readonly string[]): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return null;

  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [rawKey, ...rawValueParts] = pair.split('=');
    const key = decodeQueryComponent(rawKey ?? '');
    if (names.includes(key)) return rawValueParts.join('=');
  }

  return null;
}

function parseEncodedDelimitedParam(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => decodeQueryComponent(entry).trim())
    .filter(Boolean);
}

export function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function requestedStudyQueueRoute(): StudyQueueRouteRequest {
  if (typeof window === 'undefined') {
    return { handId: null, handIds: [], packetIds: [] };
  }
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const requestedDrill = params.get('drill') ?? params.get('source');
  if (requestedDrill !== 'study-queue') {
    return { handId: null, handIds: [], packetIds: [] };
  }
  const handId = params.get('handId') ?? params.get('reviewHand');
  const handIds = uniqueNonEmpty([
    handId ?? '',
    ...parseEncodedDelimitedParam(rawQueryParam(search, ['handIds'])),
  ]);
  return {
    handId: handIds[0] ?? null,
    handIds,
    packetIds: uniqueNonEmpty(parseEncodedDelimitedParam(rawQueryParam(search, ['packetIds']))),
  };
}
