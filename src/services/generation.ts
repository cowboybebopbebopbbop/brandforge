/**
 * BrandForge v1.2.1+ Generation Service
 * 
 * Implements Engineering Acceptance Checklist:
 * - Section A: Contracts, Boundaries, Versioning
 * - Section H: Count Guarantee + Top-Up
 * - Section I: Bucketed Allocation
 * - Section J: Checks (Post-Processed Only)
 * - Section K: Multi-Provider Behavior
 * - Section L: Idempotency, Caching, Replay
 * - Section P: Observability & Quality Regression
 */

import type { NameCategory4, NameChecks, NamingTerritory } from '../store';
import {
  validateCandidate,
  type ValidatedCandidate,
  type ValidationContext,
  type AINameType,
  type LanguageMode,
  type BanListConfig
} from './validation';

// ============================================================================
// SECTION A: Contracts, Boundaries, Versioning
// ============================================================================

export const SCHEMA_VERSION = '1.2.1';

/**
 * A.1: LLM Output Contract - "LLM-only"
 * No runId, no schemaVersion, no meta, no checks
 * Required: candidates[] with { name, type, category, rationale, territoryId? }
 */
export interface LLMOutputContract {
  candidates: LLMCandidate[];
}

export interface LLMCandidate {
  name: string;
  type: string;
  category: string;
  rationale: string;
  territoryId?: string;
}

/**
 * A.2: System API Response - "system-owned wrapper"
 * Only place where schemaVersion, runId, meta, and checks appear
 */
export interface SystemAPIResponse {
  schemaVersion: string;
  runId: string;
  candidates: ProcessedCandidate[];
  meta: GenerationMeta;
}

export interface ProcessedCandidate {
  name: string;
  type: AINameType;
  category: NameCategory4;
  rationale: string;
  territoryId?: string;
  checks: NameChecks; // J.1: Checks are attached post-generation
}

export interface GenerationMeta {
  requestedCount: number;
  returnedCount: number;
  topUpAttempts: number;
  insufficientQuality: boolean;
  shortfallReasonCodes: ShortfallReasonCode[];
  bucketFillRates?: Record<string, number>;
  // P.1: Telemetry
  promptHash: string;
  constraintHash: string;
  provider: string;
  model: string;
  temperature: number;
  rejectionCounts: RejectionCounts;
  rootKeyStats: {
    unique: number;
    maxPerRoot: number;
    topRoots: [string, number][];
  };
  inputSanitized?: boolean; // M.2
}

export type ShortfallReasonCode =
  | 'duplicate_rate_high'
  | 'ban_list_too_restrictive'
  | 'rationale_failures'
  | 'quota_conflict'
  | 'territory_constraint_conflict'
  | 'provider_parse_failed';

export interface RejectionCounts {
  empty_name: number;
  invalid_name: number;
  invalid_type: number;
  invalid_category: number;
  invalid_territory: number;
  invalid_rationale: number;
  banned: number;
  duplicate: number;
  diversity_exceeded: number;
  parse_error: number;
}

// ============================================================================
// SECTION L: Idempotency, Caching, Replay
// ============================================================================

interface CacheEntry {
  response: SystemAPIResponse;
  timestamp: number;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * L.3: Generate cache key
 * Includes: projectId + generationCount + requestedCount + provider + model + promptHash + constraintHash
 */
export function generateCacheKey(params: {
  projectId: string;
  generationCount: number;
  requestedCount: number;
  provider: string;
  model: string;
  promptHash: string;
  constraintHash: string;
}): string {
  return `${params.projectId}:${params.generationCount}:${params.requestedCount}:${params.provider}:${params.model}:${params.promptHash}:${params.constraintHash}`;
}

/**
 * Simple hash function for prompt/constraint hashing
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * L.4: Get cached response or null
 */
export function getCachedResponse(cacheKey: string): SystemAPIResponse | null {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(cacheKey);
    return null;
  }
  
  return entry.response;
}

/**
 * L.4: Cache a response
 */
export function cacheResponse(cacheKey: string, response: SystemAPIResponse): void {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

// ============================================================================
// SECTION J: Checks (Post-Processed Only, Never From Model)
// ============================================================================

/**
 * J.1-J.3: Default checks state
 * LLM output never includes checks - system attaches after generation
 */
export function getDefaultChecks(): NameChecks {
  return {
    negative_reading_risk: 'low', // Will be 'unknown' until computed
    phone_spelling_risk: 'low',
    ru_phonetic_risk: 'low',
    intercultural_risk: 'low'
  };
}

/**
 * J.3: Reset checks when relevant inputs change
 */
export function shouldResetChecks(
  oldConfig: { language?: string; geography?: string; isPhoneFirst?: boolean; isCorporate?: boolean },
  newConfig: { language?: string; geography?: string; isPhoneFirst?: boolean; isCorporate?: boolean }
): boolean {
  return (
    oldConfig.language !== newConfig.language ||
    oldConfig.geography !== newConfig.geography ||
    oldConfig.isPhoneFirst !== newConfig.isPhoneFirst ||
    oldConfig.isCorporate !== newConfig.isCorporate
  );
}

// ============================================================================
// SECTION K: Multi-Provider Behavior
// ============================================================================

export type ProviderTier = 'strict_schema_path' | 'fallback_provider_path';

export interface ProviderConfig {
  name: string;
  tier: ProviderTier;
  maxTopUpAttempts: number;
  supportsStructuredOutput: boolean;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  gemini: {
    name: 'Gemini',
    tier: 'strict_schema_path',
    maxTopUpAttempts: 3,
    supportsStructuredOutput: true
  },
  openai: {
    name: 'OpenAI',
    tier: 'fallback_provider_path',
    maxTopUpAttempts: 2,
    supportsStructuredOutput: false
  },
  claude: {
    name: 'Claude',
    tier: 'fallback_provider_path',
    maxTopUpAttempts: 2,
    supportsStructuredOutput: false
  }
};

export function getProviderConfig(provider: string): ProviderConfig {
  return PROVIDER_CONFIGS[provider.toLowerCase()] || PROVIDER_CONFIGS.gemini;
}

// ============================================================================
// SECTION I: Bucketed Allocation
// ============================================================================

export interface BucketDimensions {
  categories: NameCategory4[];
  territories: NamingTerritory[];
}

export interface Bucket {
  key: string;
  category: NameCategory4;
  territoryId?: string;
  targetCount: number;
  currentCount: number;
  candidates: ValidatedCandidate[];
}

/**
 * I.1: Create buckets based on dimensions
 */
export function createBuckets(
  dimensions: BucketDimensions,
  totalCount: number
): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();
  
  const hasTerrritories = dimensions.territories.length > 0;
  const numCategories = dimensions.categories.length || 1;
  const numTerritories = hasTerrritories ? dimensions.territories.length : 1;
  
  const totalBuckets = numCategories * numTerritories;
  const baseCount = Math.floor(totalCount / totalBuckets);
  let remainder = totalCount % totalBuckets;
  
  for (const category of dimensions.categories.length > 0 ? dimensions.categories : ['informing' as NameCategory4]) {
    if (hasTerrritories) {
      for (const territory of dimensions.territories) {
        const key = `${category}:${territory.id}`;
        const targetCount = baseCount + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        
        buckets.set(key, {
          key,
          category,
          territoryId: territory.id,
          targetCount,
          currentCount: 0,
          candidates: []
        });
      }
    } else {
      const key = category;
      const targetCount = baseCount + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      
      buckets.set(key, {
        key,
        category,
        territoryId: undefined,
        targetCount,
        currentCount: 0,
        candidates: []
      });
    }
  }
  
  return buckets;
}

/**
 * I.2: Assign candidate to appropriate bucket
 */
export function assignToBucket(
  candidate: ValidatedCandidate,
  buckets: Map<string, Bucket>
): boolean {
  const key = candidate.territoryId 
    ? `${candidate.category}:${candidate.territoryId}`
    : candidate.category;
  
  const bucket = buckets.get(key);
  if (!bucket) return false;
  
  bucket.candidates.push(candidate);
  bucket.currentCount++;
  return true;
}

/**
 * I.3: Get underfilled buckets for targeted top-up
 */
export function getUnderfilledBuckets(buckets: Map<string, Bucket>): Bucket[] {
  return Array.from(buckets.values())
    .filter(b => b.currentCount < b.targetCount)
    .sort((a, b) => (a.targetCount - a.currentCount) - (b.targetCount - b.currentCount));
}

/**
 * I.4: Calculate bucket fill rates
 */
export function getBucketFillRates(buckets: Map<string, Bucket>): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [key, bucket] of buckets) {
    rates[key] = bucket.targetCount > 0 ? bucket.currentCount / bucket.targetCount : 1;
  }
  return rates;
}

// ============================================================================
// SECTION H: Count Guarantee + Top-Up
// ============================================================================

export const MAX_TOP_UP_ATTEMPTS = 3;
export const TOP_UP_BUFFER_PERCENT = 0.15; // 15% buffer

export interface TopUpRequest {
  needed: number;
  buffer: number;
  total: number;
  targetBuckets?: Bucket[];
}

/**
 * H.2: Calculate top-up request
 */
export function calculateTopUpRequest(
  requestedCount: number,
  currentCount: number,
  buckets?: Map<string, Bucket>
): TopUpRequest {
  const needed = requestedCount - currentCount;
  const buffer = Math.ceil(needed * TOP_UP_BUFFER_PERCENT);
  const total = needed + buffer;
  
  const targetBuckets = buckets ? getUnderfilledBuckets(buckets) : undefined;
  
  return { needed, buffer, total, targetBuckets };
}

/**
 * H.4: Determine shortfall reason codes
 */
export function determineShortfallReasons(
  rejectionCounts: RejectionCounts,
  parseErrors: number,
  diversityViolations: number
): ShortfallReasonCode[] {
  const codes: ShortfallReasonCode[] = [];
  
  const totalRejections = Object.values(rejectionCounts).reduce((a, b) => a + b, 0);
  
  if (rejectionCounts.duplicate > totalRejections * 0.3) {
    codes.push('duplicate_rate_high');
  }
  
  if (rejectionCounts.banned > totalRejections * 0.2) {
    codes.push('ban_list_too_restrictive');
  }
  
  if (rejectionCounts.invalid_rationale > totalRejections * 0.3) {
    codes.push('rationale_failures');
  }
  
  if (diversityViolations > 0) {
    codes.push('quota_conflict');
  }
  
  if (rejectionCounts.invalid_territory > 0) {
    codes.push('territory_constraint_conflict');
  }
  
  if (parseErrors > 0) {
    codes.push('provider_parse_failed');
  }
  
  return codes;
}

// ============================================================================
// SECTION P: Observability & Quality Regression
// ============================================================================

export interface RunTelemetry {
  runId: string;
  subRunId?: string;
  timestamp: number;
  promptHash: string;
  constraintHash: string;
  provider: string;
  model: string;
  temperature: number;
  requestedCount: number;
  returnedCount: number;
  topUpAttempts: number;
  rejectionCounts: RejectionCounts;
  bucketFillRates: Record<string, number>;
  rootKeyStats: {
    unique: number;
    maxPerRoot: number;
    topRoots: [string, number][];
  };
  parseSuccessRate: number;
  rationalePassRate: number;
  duplicateRate: number;
}

const telemetryLog: RunTelemetry[] = [];

/**
 * P.1: Log telemetry for a run
 */
export function logTelemetry(telemetry: RunTelemetry): void {
  telemetryLog.push(telemetry);
  
  // Keep only last 100 runs in memory
  if (telemetryLog.length > 100) {
    telemetryLog.shift();
  }
  
  // Log to console for debugging
  console.log('[BrandForge Telemetry]', {
    runId: telemetry.runId,
    requested: telemetry.requestedCount,
    returned: telemetry.returnedCount,
    topUpAttempts: telemetry.topUpAttempts,
    parseSuccess: `${(telemetry.parseSuccessRate * 100).toFixed(1)}%`,
    rationalePass: `${(telemetry.rationalePassRate * 100).toFixed(1)}%`,
    duplicateRate: `${(telemetry.duplicateRate * 100).toFixed(1)}%`,
    uniqueRoots: telemetry.rootKeyStats.unique
  });
}

/**
 * P.1: Get recent telemetry
 */
export function getRecentTelemetry(): RunTelemetry[] {
  return [...telemetryLog];
}

// ============================================================================
// Main Generation Pipeline
// ============================================================================

export interface GenerationConfig {
  projectId: string;
  generationCount: number;
  requestedCount: number;
  provider: string;
  model: string;
  temperature: number;
  languageMode: LanguageMode;
  categories: NameCategory4[];
  territories: NamingTerritory[];
  banConfig: BanListConfig;
  existingNames: string[]; // Historical names to dedupe against
  maxPerRootKey?: number;
}

export interface GenerationResult {
  response: SystemAPIResponse;
  fromCache: boolean;
}

/**
 * Create initial empty rejection counts
 */
export function createEmptyRejectionCounts(): RejectionCounts {
  return {
    empty_name: 0,
    invalid_name: 0,
    invalid_type: 0,
    invalid_category: 0,
    invalid_territory: 0,
    invalid_rationale: 0,
    banned: 0,
    duplicate: 0,
    diversity_exceeded: 0,
    parse_error: 0
  };
}

/**
 * Process raw LLM output into validated candidates
 */
export function processLLMOutput(
  rawOutput: unknown,
  context: ValidationContext,
  rejectionCounts: RejectionCounts
): ValidatedCandidate[] {
  const validated: ValidatedCandidate[] = [];
  
  if (!rawOutput || typeof rawOutput !== 'object') {
    rejectionCounts.parse_error++;
    return validated;
  }
  
  const output = rawOutput as Record<string, unknown>;
  let candidates: unknown[] = [];
  
  // Extract candidates array from various possible formats
  if (Array.isArray(output)) {
    candidates = output;
  } else if (Array.isArray(output.candidates)) {
    candidates = output.candidates;
  } else if (Array.isArray(output.names)) {
    candidates = output.names;
  }
  
  for (const raw of candidates) {
    const result = validateCandidate(raw, context);
    
    if (result.valid && result.candidate) {
      validated.push(result.candidate);
      
      // Update context for next validations
      context.existingDuplicateKeys.add(result.candidate.duplicateKey);
      context.existingRootKeys.set(
        result.candidate.rootKey,
        (context.existingRootKeys.get(result.candidate.rootKey) || 0) + 1
      );
    } else {
      // Categorize rejection
      for (const error of result.errors) {
        if (error.includes('empty')) rejectionCounts.empty_name++;
        else if (error.includes('brand name')) rejectionCounts.invalid_name++;
        else if (error.includes('type')) rejectionCounts.invalid_type++;
        else if (error.includes('category')) rejectionCounts.invalid_category++;
        else if (error.includes('territory')) rejectionCounts.invalid_territory++;
        else if (error.includes('Rationale')) rejectionCounts.invalid_rationale++;
        else if (error.includes('banned')) rejectionCounts.banned++;
        else if (error.includes('Duplicate')) rejectionCounts.duplicate++;
        else if (error.includes('diversity')) rejectionCounts.diversity_exceeded++;
      }
    }
  }
  
  return validated;
}

/**
 * Convert validated candidates to processed candidates with checks
 */
export function toProcessedCandidates(validated: ValidatedCandidate[]): ProcessedCandidate[] {
  return validated.map(v => ({
    name: v.name,
    type: v.type,
    category: v.category,
    rationale: v.rationale,
    territoryId: v.territoryId,
    checks: getDefaultChecks() // J.1: System attaches checks
  }));
}

/**
 * Build final system response
 */
export function buildSystemResponse(
  runId: string,
  candidates: ProcessedCandidate[],
  _config: GenerationConfig, // Kept for future use (e.g., adding config-dependent meta)
  meta: Omit<GenerationMeta, 'schemaVersion'>
): SystemAPIResponse {
  return {
    schemaVersion: SCHEMA_VERSION,
    runId,
    candidates,
    meta: {
      ...meta,
      promptHash: meta.promptHash,
      constraintHash: meta.constraintHash
    }
  };
}
