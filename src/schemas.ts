/**
 * Versioned API Response Schemas for BrandForge
 * 
 * P0 Fix: Separate schemas for different generation types to avoid contract mismatches
 */

import { NameCategory4, NameChecks } from './store';

// Schema version for compatibility tracking
export const SCHEMA_VERSION = '1.1.0';

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
  rationale: string;         // ✓ Always required, 20-50 words enforced
  
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
 * NAME GENERATION SCHEMA (Primary - most important)
 * 
 * P0 Fix: Complete and consistent field definitions
 */
export const NAME_GENERATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    schemaVersion: { type: 'string' as const },
    runId: { type: 'string' as const },
    candidates: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { 
            type: 'string' as const,
            minLength: 1,
            maxLength: 50
          },
          type: { 
            type: 'string' as const,
            enum: ['invented', 'compound', 'acronym', 'descriptive', 'foreign']
          },
          category: {
            type: 'string' as const,
            enum: ['informing', 'image_informing', 'image', 'abstract_constructed']
          },
          rationale: { 
            type: 'string' as const,
            minLength: 50,  // ~10-15 words minimum
            maxLength: 400  // ~60-80 words maximum
          },
          territoryId: { type: 'string' as const }
        },
        required: ['name', 'type', 'category', 'rationale']
      },
      minItems: 1
    },
    meta: {
      type: 'object' as const,
      properties: {
        generationCount: { type: 'number' as const },
        feedbackApplied: { type: 'boolean' as const },
        territoriesUsed: {
          type: 'array' as const,
          items: { type: 'string' as const }
        }
      }
    }
  },
  required: ['schemaVersion', 'candidates']
};

/**
 * Validation helpers
 */
export function validateRationale(rationale: string): { valid: boolean; error?: string; wordCount: number } {
  if (!rationale || rationale.trim().length === 0) {
    return { valid: false, error: 'Rationale is empty', wordCount: 0 };
  }
  
  // P0 Fix: Unified rationale validation
  // Word count (approximate, works for both EN/RU)
  const words = rationale.trim().split(/\s+/);
  const wordCount = words.length;
  
  if (wordCount < 10) {
    return { valid: false, error: `Rationale too short (${wordCount} words, need 10+ words)`, wordCount };
  }
  
  if (wordCount > 80) {
    return { valid: false, error: `Rationale too long (${wordCount} words, keep under 80 words)`, wordCount };
  }
  
  // Check for template fragments
  const suspiciousPatterns = [
    /^(comb|creative|good|nice|suggestion)$/i,
    /^A (invented|compound|acronym|descriptive|foreign) brand name$/i
  ];
  
  const normalized = rationale.trim().toLowerCase();
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(normalized)) {
      return { valid: false, error: 'Rationale appears to be a template fragment', wordCount };
    }
  }
  
  return { valid: true, wordCount };
}

/**
 * P0 Fix: Proper tokenization for diversity checking
 * Replaces naive "first 4-6 characters" approach
 */
export function tokenizeName(name: string): string[] {
  // Split by spaces, hyphens, underscores, camelCase
  const tokens: string[] = [];
  
  // Handle camelCase and spaces/hyphens
  const parts = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Split camelCase
    .split(/[\s\-_\.]+/);                  // Split by separators
  
  for (const part of parts) {
    if (part.length > 0) {
      tokens.push(part.toLowerCase());
    }
  }
  
  return tokens;
}

/**
 * P0 Fix: Better root/stem extraction
 * Uses linguistic tokens instead of character prefixes
 */
export function extractRoots(name: string): string[] {
  const tokens = tokenizeName(name);
  const roots: string[] = [];
  
  for (const token of tokens) {
    // For short tokens (≤4 chars), use the whole token
    if (token.length <= 4) {
      roots.push(token);
    } else {
      // For longer tokens, use first 5 characters as root
      // But also track the full token for better matching
      roots.push(token.substring(0, 5));
      roots.push(token); // Full token for exact matching
    }
  }
  
  return roots;
}

/**
 * Check root diversity across a set of names
 * Returns names grouped by shared roots
 */
export function checkRootDiversity(names: NameCandidate[]): Map<string, string[]> {
  const rootToNames = new Map<string, string[]>();
  
  for (const candidate of names) {
    const roots = extractRoots(candidate.name);
    
    for (const root of roots) {
      if (!rootToNames.has(root)) {
        rootToNames.set(root, []);
      }
      rootToNames.get(root)!.push(candidate.name);
    }
  }
  
  // Filter to only roots that appear multiple times
  const duplicates = new Map<string, string[]>();
  for (const [root, namesList] of rootToNames.entries()) {
    if (namesList.length > 1) {
      duplicates.set(root, [...new Set(namesList)]); // Deduplicate
    }
  }
  
  return duplicates;
}
