/**
 * Versioned API Response Schemas for BrandForge
 * 
 * v1.2.1+ Engineering Acceptance Checklist Implementation:
 * - Section A: LLM-only output contract (no runId, no schemaVersion, no meta, no checks)
 * - Section B: Canonical normalization keys via validation.ts
 * - Section C: Root/Token rules via validation.ts
 * - Section D: Language-specific rationale validation
 * - Section E: Candidate validation pipeline
 * - Section F: Ban lists & near-variant strategy
 * - Section G: Diversity enforcement (max 2 per rootKey for 50 names)
 * - Section J: Checks are post-processed only, never from model
 */

import { NameCategory4, NameChecks } from './store';

// Re-export validation utilities for backward compatibility
export { 
  normalizeNameForCompare,
  getDuplicateKey,
  tokenizeName,
  getRootKey,
  getTailToken,
  validateRationale,
  validateCandidate,
  buildBanSets,
  analyzeDiversity,
  sanitizePromptInput,
  hasSuspiciousContent,
  type LanguageMode,
  type RationaleValidation,
  type ValidatedCandidate,
  type ValidationContext,
  type DiversityStats,
  type BanListConfig,
  type SanitizationResult
} from './services/validation';

// Re-export generation utilities
export {
  SCHEMA_VERSION,
  type LLMOutputContract,
  type LLMCandidate,
  type SystemAPIResponse,
  type ProcessedCandidate,
  type GenerationMeta,
  type ShortfallReasonCode,
  type RejectionCounts,
  getDefaultChecks,
  getProviderConfig,
  createBuckets,
  calculateTopUpRequest,
  MAX_TOP_UP_ATTEMPTS,
  logTelemetry
} from './services/generation';

// Keep local schema version for backward compatibility
export const LOCAL_SCHEMA_VERSION = '1.2.1';

/**
 * Strategy Synthesis Response
 * Used in: Strategy View step
 */
export interface StrategySynthesisResponse {
  schemaVersion: string;
  runId: string;
  northStar: string;
  attributes: string[];
  territories: {
    id: string;
    name: string;
    description: string;
  }[];
}

/**
 * Association Workshop Response
 * Used in: Association Workshop step
 */
export interface AssociationResponse {
  schemaVersion: string;
  runId: string;
  properties: string[];
  associations: {
    property: string;
    type: 'similarity' | 'adjacency' | 'contrast';
    words: string[];
  }[];
  crossedAssociations: {
    seedIdea: string;
    sources: string[];
  }[];
}

/**
 * Name Generation Response (PRIMARY)
 * Used in: Generate Names step
 * 
 * P0 Fix: This is the CANONICAL contract for name generation
 * All fields marked as required are enforced in responseSchema
 */
export interface NameGenerationResponse {
  schemaVersion: string;
  runId?: string;
  candidates: NameCandidate[];
  meta?: {
    requestedCount: number;    // P0-C: Original request
    returnedCount: number;     // P0-C: Actual after validation
    topUpAttempts: number;     // P0-C: Retry calls made (max 3)
    generationCount: number;
    feedbackApplied: boolean;
    territoriesUsed: string[];
  };
}

/**
 * Individual Name Candidate
 * 
 * P0 Fixes:
 * - Unified field name: 'category' (not category_4)
 * - All required fields marked explicitly
 * - Complete type enum
 */
export interface NameCandidate {
  // REQUIRED FIELDS (enforced in responseSchema)
  name: string;
  type: 'invented' | 'compound' | 'acronym' | 'descriptive' | 'foreign';
  category: NameCategory4;  // ✓ Standardized: always 'category', never 'category_4'
  rationale: string;         // ✓ EN: 18-45 words, RU: 14-35 words (P1-E)
  
  // OPTIONAL FIELDS
  territoryId?: string;      // References territories from strategy
  checks?: Partial<NameChecks>;  // Quality checks (added by post-processing if needed)
}

/**
 * Gemini 2.0 Response Schema Definitions
 * These are passed to the API to enforce JSON structure
 */
export const STRATEGY_SYNTHESIS_SCHEMA = {
  type: 'object' as const,
  properties: {
    schemaVersion: { type: 'string' as const },
    runId: { type: 'string' as const },
    northStar: { type: 'string' as const },
    attributes: {
      type: 'array' as const,
      items: { type: 'string' as const }
    },
    territories: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          name: { type: 'string' as const },
          description: { type: 'string' as const }
        },
        required: ['id', 'name', 'description']
      }
    }
  },
  required: ['schemaVersion', 'runId', 'northStar', 'attributes', 'territories']
};

export const ASSOCIATION_RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    schemaVersion: { type: 'string' as const },
    runId: { type: 'string' as const },
    properties: {
      type: 'array' as const,
      items: { type: 'string' as const }
    },
    associations: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          property: { type: 'string' as const },
          type: { 
            type: 'string' as const,
            enum: ['similarity', 'adjacency', 'contrast']
          },
          words: {
            type: 'array' as const,
            items: { type: 'string' as const }
          }
        },
        required: ['property', 'type', 'words']
      }
    },
    crossedAssociations: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          seedIdea: { type: 'string' as const },
          sources: {
            type: 'array' as const,
            items: { type: 'string' as const }
          }
        },
        required: ['seedIdea', 'sources']
      }
    }
  },
  required: ['schemaVersion', 'runId', 'properties', 'associations', 'crossedAssociations']
};

/**
 * NAME GENERATION SCHEMA (LLM-Only Contract)
 * 
 * v1.2.1+ Section A: LLM output is "LLM-only"
 * - NO runId (system-generated)
 * - NO schemaVersion (system-controlled)
 * - NO meta (system-owned)
 * - NO checks (post-processed)
 * 
 * Required: candidates[] only
 */
export const NAME_GENERATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    // A.1: LLM output contains ONLY candidates array
    candidates: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          // E.1: Name 1-50 chars
          name: { 
            type: 'string' as const,
            minLength: 1,
            maxLength: 50
          },
          // E.3: Type in AI enum only
          type: { 
            type: 'string' as const,
            enum: ['invented', 'compound', 'acronym', 'descriptive', 'foreign']
          },
          // E.4: Category required
          category: {
            type: 'string' as const,
            enum: ['informing', 'image_informing', 'image', 'abstract_constructed']
          },
          // D.3: 50-400 chars secondary safety
          rationale: { 
            type: 'string' as const,
            minLength: 50,
            maxLength: 400
          },
          // E.5: territoryId optional (required validation done post-parse)
          territoryId: { type: 'string' as const }
        },
        required: ['name', 'type', 'category', 'rationale']
      },
      minItems: 1
    }
  },
  // A.1: Only candidates is required from LLM
  required: ['candidates']
};

/**
 * Legacy checkRootDiversity for backward compatibility
 * @deprecated Use analyzeDiversity from services/validation.ts instead
 */
export function checkRootDiversity(names: NameCandidate[]): Map<string, string[]> {
  const { tokenizeName } = require('./services/validation');
  const rootToNames = new Map<string, string[]>();
  
  for (const candidate of names) {
    const tokens = tokenizeName(candidate.name);
    
    for (const token of tokens) {
      if (!rootToNames.has(token)) {
        rootToNames.set(token, []);
      }
      rootToNames.get(token)!.push(candidate.name);
    }
  }
  
  // Filter to only roots that appear multiple times
  const duplicates = new Map<string, string[]>();
  for (const [root, namesList] of rootToNames.entries()) {
    if (namesList.length > 1) {
      duplicates.set(root, [...new Set(namesList)]);
    }
  }
  
  return duplicates;
}
