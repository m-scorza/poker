import { parseGGPokerFile } from './ggpoker';
import { parseOpenHandHistoryFile } from './openHandHistory';
import { parsePokerStarsFile, type ParsedHand } from './pokerstars';
import { identifyFile, type FileIdentity } from './siteIdentifier';
import { sanitizeHandHistory, type SanitizedHandHistoryReport } from './sanitizeHandHistory';
import type { ImportConfidence } from './workerProcessor';

export interface ContributionSourceFile {
  name: string;
  content: string;
}

export interface BuildLocalContributionPackageOptions {
  files: ContributionSourceFile[];
  heroName: string;
  appVersion: string;
  createdAt?: Date;
}

export interface ContributionParserReport {
  totalFiles: number;
  sanitizedFiles: number;
  unsupportedFiles: number;
  handsFound: number;
  confidence: ImportConfidence;
  warnings: string[];
}

export interface ContributionChunk {
  id: string;
  sourceFileAlias: string;
  site: FileIdentity['site'];
  type: FileIdentity['type'];
  handCount: number;
  sanitizedText: string;
  redactionReport: SanitizedHandHistoryReport;
}

export interface ContributionForbiddenFinding {
  field: string;
  marker: string;
}

export interface LocalContributionPackage {
  schemaVersion: 1;
  kind: 'local-sanitized-parser-fixture-package';
  createdAt: string;
  appVersion: string;
  shareable: boolean;
  chunks: ContributionChunk[];
  parserReport: ContributionParserReport;
  forbiddenFindings: ContributionForbiddenFinding[];
}

export function buildLocalContributionPackage(
  options: BuildLocalContributionPackageOptions,
): LocalContributionPackage {
  const chunks: ContributionChunk[] = [];
  const warnings: string[] = [];
  const forbiddenMarkers = new Set<string>();
  let unsupportedFiles = 0;
  let handsFound = 0;

  options.files.forEach((file, index) => {
    const sourceFileAlias = `source-${index + 1}.txt`;
    addForbiddenMarkers(forbiddenMarkers, file.name);
    addForbiddenMarkers(forbiddenMarkers, options.heroName);
    collectRawPokerIdentifiers(file.content, forbiddenMarkers);

    const identity = identifyFile(file.content);
    if (!isSanitizableHandHistory(identity)) {
      unsupportedFiles += 1;
      warnings.push(`${sourceFileAlias}: unsupported or unrecognized poker file`);
      return;
    }

    const sanitized = sanitizeHandHistory(file.content, { heroName: options.heroName });
    const parsedHands = parseSanitizedHandHistory(identity, sanitized.text, options.heroName);
    handsFound += parsedHands.length;

    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      sourceFileAlias,
      site: identity.site,
      type: identity.type,
      handCount: parsedHands.length,
      sanitizedText: sanitized.text,
      redactionReport: sanitized.report,
    });
  });

  const sanitizedFiles = chunks.length;
  const confidence: ImportConfidence = sanitizedFiles === 0
    ? 'low'
    : unsupportedFiles > 0 || warnings.length > 0
      ? 'medium'
      : 'high';

  const draft: Omit<LocalContributionPackage, 'shareable' | 'forbiddenFindings'> = {
    schemaVersion: 1,
    kind: 'local-sanitized-parser-fixture-package',
    createdAt: (options.createdAt ?? new Date()).toISOString(),
    appVersion: options.appVersion,
    chunks,
    parserReport: {
      totalFiles: options.files.length,
      sanitizedFiles,
      unsupportedFiles,
      handsFound,
      confidence,
      warnings,
    },
  };

  const forbiddenFindings = findForbiddenMarkers(draft, forbiddenMarkers);
  return {
    ...draft,
    shareable: forbiddenFindings.length === 0,
    forbiddenFindings,
  };
}

function isSanitizableHandHistory(identity: FileIdentity): boolean {
  return identity.type === 'hand_history' && (
    identity.site === 'pokerstars'
    || identity.site === 'ggpoker'
    || identity.site === 'open_hand_history'
  );
}

function parseSanitizedHandHistory(
  identity: FileIdentity,
  sanitizedText: string,
  originalHeroName: string,
): ParsedHand[] {
  if (identity.site === 'pokerstars') return parsePokerStarsFile(sanitizedText, 'Hero');
  if (identity.site === 'ggpoker') return parseGGPokerFile(sanitizedText, originalHeroName === 'Hero' ? 'scorza23' : originalHeroName);
  if (identity.site === 'open_hand_history') return parseOpenHandHistoryFile(sanitizedText, 'Hero');
  return [];
}

function addForbiddenMarkers(markers: Set<string>, value: string): void {
  const trimmed = value.trim();
  if (isSyntheticSafeMarker(trimmed)) return;
  if (trimmed.length >= 3) markers.add(trimmed);

  const basename = trimmed.replace(/\\/g, '/').split('/').filter(Boolean).pop();
  if (basename && basename.length >= 3 && !isSyntheticSafeMarker(basename)) markers.add(basename);
}

function isSyntheticSafeMarker(value: string): boolean {
  return value === 'Hero' || /^Villain_\d+$/.test(value) || /^source-\d+\.txt$/.test(value);
}

function collectRawPokerIdentifiers(content: string, markers: Set<string>): void {
  collectMatches(content, /(?:PokerStars Hand|Poker Hand|GGPoker Hand|Hand) #([A-Za-z0-9]+)/g, markers);
  collectMatches(content, /Tournament #(\d+)/g, markers);
  collectMatches(content, /^Seat \d+: (.+?) \(/gm, markers);
  collectMatches(content, /^(.+?): (?:folds|calls|checks|raises|posts small blind|posts big blind|posts the ante|shows|mucks|collected|wins|bets)/gm, markers);
  collectMatches(content, /Table '([^']+)'/g, markers);
  collectMatches(content, /(\d{4}\/\d{2}\/\d{2})/g, markers);
}

function collectMatches(content: string, regex: RegExp, markers: Set<string>): void {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const value = match[1];
    if (value && value.trim().length >= 3 && !isSyntheticSafeMarker(value.trim())) markers.add(value.trim());
  }
}

function findForbiddenMarkers(
  payload: Omit<LocalContributionPackage, 'shareable' | 'forbiddenFindings'>,
  markers: Set<string>,
): ContributionForbiddenFinding[] {
  const serialized = JSON.stringify(payload);
  const findings: ContributionForbiddenFinding[] = [];
  let index = 1;

  for (const marker of Array.from(markers)) {
    if (serialized.includes(marker)) {
      findings.push({
        field: 'package',
        marker: `forbidden-marker-${index}`,
      });
      index += 1;
    }
  }

  return findings;
}
