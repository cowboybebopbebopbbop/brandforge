/**
 * BrandForge v1.2.1+ Validation Service
 * 
 * Implements Engineering Acceptance Checklist:
 * - Section B: Canonical Normalization Keys
 * - Section C: Root/Token Rules
 * - Section D: Rationale Validation
 * - Section E: Candidate Validation Pipeline
 * - Section F: Ban Lists & Near-Variant Strategy
 * - Section G: Diversity Enforcement
 * - Section M: Security & Input Safety
 */

import type { NameCategory4 } from '../store';

// ============================================================================
// SECTION B: Canonical Normalization Keys (Deterministic)
// ============================================================================

/**
 * B.1: Normalize name for comparison/deduplication
 * Used everywhere: dedupe, bans, caching
 * 
 * Steps:
 * 1. lowercase
 * 2. trim
 * 3. collapse whitespace
 * 4. split camelCase into tokens
 * 5. treat - _ . as spaces
 * 6. strip punctuation except letters/numbers
 * 7. Unicode normalize (NFKC)
 */
export function normalizeNameForCompare(name: string): string {
  if (!name) return '';
  
  let normalized = name
    // Step 7: Unicode normalize first
    .normalize('NFKC')
    // Step 1: lowercase
    .toLowerCase()
    // Step 2: trim
    .trim()
    // Step 4: split camelCase into tokens (insert space before capitals)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Step 5: treat - _ . as spaces
    .replace(/[-_\.]/g, ' ')
    // Step 6: strip punctuation except letters/numbers/spaces
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    // Step 3: collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

/**
 * B.2: Generate duplicate key for hard-dedupe
 * duplicateKey equality = duplicate
 */
export function getDuplicateKey(name: string): string {
  return normalizeNameForCompare(name);
}

// ============================================================================
// SECTION C: Root/Token Rules (No Ambiguity)
// ============================================================================

/**
 * C.1: Tokenize name into array of lowercase tokens
 */
export function tokenizeName(name: string): string[] {
  if (!name) return [];
  
  const normalized = normalizeNameForCompare(name);
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
  
  return tokens;
}

/**
 * C.2: Extract root key (head token) for diversity enforcement
 * Default: rootKey = first meaningful token after tokenization
 */
export function getRootKey(name: string): string {
  const tokens = tokenizeName(name);
  if (tokens.length === 0) return '';
  
  // Head token is the first token
  return tokens[0];
}

/**
 * C.2: Extract tail token for analytics/soft caps
 * Common tails: "labs", "io", "studio", "tech", "ai", etc.
 */
export function getTailToken(name: string): string | null {
  const tokens = tokenizeName(name);
  if (tokens.length < 2) return null;
  
  const commonTails = new Set([
    'labs', 'lab', 'io', 'ai', 'studio', 'studios', 'tech', 'hub', 
    'box', 'ly', 'ify', 'app', 'co', 'inc', 'corp', 'hq', 'works',
    'pro', 'plus', 'max', 'go', 'now', 'one', 'x', 'yx'
  ]);
  
  const lastToken = tokens[tokens.length - 1];
  return commonTails.has(lastToken) ? lastToken : null;
}

// ============================================================================
// SECTION D: Rationale Validation (Language-Specific, Word-Based)
// ============================================================================

export type LanguageMode = 'en' | 'ru' | 'both';

export interface RationaleValidation {
  valid: boolean;
  error?: string;
  wordCount: number;
  charCount: number;
  detectedLanguage?: 'en' | 'ru';
}

/**
 * D.1-D.5: Validate rationale by word count with language-specific rules
 * 
 * Word count limits (primary):
 * - English: 18-45 words
 * - Russian: 14-35 words
 * 
 * Secondary safety: 50-400 chars
 */
export function validateRationale(
  rationale: string,
  languageMode: LanguageMode = 'en'
): RationaleValidation {
  if (!rationale || rationale.trim().length === 0) {
    return { valid: false, error: 'Rationale is empty', wordCount: 0, charCount: 0 };
  }
  
  const trimmed = rationale.trim();
  const charCount = trimmed.length;
  
  // Detect language based on script if mode is 'both'
  const cyrillicRatio = (trimmed.match(/[\u0400-\u04FF]/g) || []).length / trimmed.length;
  const detectedLanguage: 'en' | 'ru' = cyrillicRatio > 0.3 ? 'ru' : 'en';
  
  // Use detected language for 'both' mode, otherwise use specified
  const effectiveLanguage = languageMode === 'both' ? detectedLanguage : languageMode;
  
  // Word count validation (D.2)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Language-specific word limits
  const minWords = effectiveLanguage === 'ru' ? 14 : 18;
  const maxWords = effectiveLanguage === 'ru' ? 35 : 45;
  
  if (wordCount < minWords) {
    return {
      valid: false,
      error: `Rationale too short: ${wordCount} words (need ${minWords}+ for ${effectiveLanguage.toUpperCase()})`,
      wordCount,
      charCount,
      detectedLanguage
    };
  }
  
  if (wordCount > maxWords) {
    return {
      valid: false,
      error: `Rationale too long: ${wordCount} words (max ${maxWords} for ${effectiveLanguage.toUpperCase()})`,
      wordCount,
      charCount,
      detectedLanguage
    };
  }
  
  // Secondary safety: character limits (D.3)
  if (charCount < 50) {
    return {
      valid: false,
      error: `Rationale too short: ${charCount} chars (need 50+)`,
      wordCount,
      charCount,
      detectedLanguage
    };
  }
  
  if (charCount > 400) {
    return {
      valid: false,
      error: `Rationale too long: ${charCount} chars (max 400)`,
      wordCount,
      charCount,
      detectedLanguage
    };
  }
  
  // D.4: Reject template boilerplate, fragments, single-token rationales
  const suspiciousPatterns = [
    // Single-word or fragment patterns
    /^(comb|creative|good|nice|suggestion|combined|merged)$/i,
    // Template boilerplate
    /^a?\s*(invented|compound|acronym|descriptive|foreign)\s*brand\s*name$/i,
    // Category labels as rationale
    /^(informing|image_informing|image|abstract_constructed|direct|functional|emotional|aspirational)$/i,
    // Empty-ish content
    /^[\s\-_\.]+$/,
    // Just the type description
    /^(this is|it is|the name is)\s+(an?\s+)?(invented|compound|acronym|descriptive|foreign)\s*(word|name)?\.?$/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Rationale appears to be template boilerplate or fragment',
        wordCount,
        charCount,
        detectedLanguage
      };
    }
  }
  
  // Check for mostly repeated words (low quality indicator)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (uniqueWords.size < Math.min(5, wordCount * 0.4)) {
    return {
      valid: false,
      error: 'Rationale has too many repeated words',
      wordCount,
      charCount,
      detectedLanguage
    };
  }
  
  return {
    valid: true,
    wordCount,
    charCount,
    detectedLanguage
  };
}

// ============================================================================
// SECTION E: Candidate Validation Pipeline (Order Matters)
// ============================================================================

export const AI_NAME_TYPES = ['invented', 'compound', 'acronym', 'descriptive', 'foreign'] as const;
export type AINameType = typeof AI_NAME_TYPES[number];

export const NAME_CATEGORIES: NameCategory4[] = ['informing', 'image_informing', 'image', 'abstract_constructed'];

export interface CandidateValidationResult {
  valid: boolean;
  errors: string[];
  candidate?: ValidatedCandidate;
}

export interface ValidatedCandidate {
  name: string;
  type: AINameType;
  category: NameCategory4;
  rationale: string;
  territoryId?: string;
  duplicateKey: string;
  rootKey: string;
  tailToken: string | null;
}

export interface ValidationContext {
  languageMode: LanguageMode;
  existingDuplicateKeys: Set<string>;
  existingRootKeys: Map<string, number>; // rootKey -> count
  bannedTokenSet: Set<string>;
  bannedNameSet: Set<string>;
  hasStrategyTerritories: boolean;
  validTerritoryIds: Set<string>;
  maxPerRootKey: number;
}

/**
 * E.1-E.7: Full candidate validation pipeline
 * Order matters - validates in specified order and collects all errors
 */
export function validateCandidate(
  raw: unknown,
  context: ValidationContext
): CandidateValidationResult {
  const errors: string[] = [];
  
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Candidate is not an object'] };
  }
  
  const candidate = raw as Record<string, unknown>;
  
  // E.1: Name non-empty, 1-50 chars
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  if (!name) {
    errors.push('Name is empty');
  } else if (name.length < 1 || name.length > 50) {
    errors.push(`Name length invalid: ${name.length} chars (need 1-50)`);
  }
  
  // E.2: Name passes "looks like a brand name" checks
  if (name) {
    const brandNameCheck = looksLikeBrandName(name);
    if (!brandNameCheck.valid) {
      errors.push(brandNameCheck.error!);
    }
  }
  
  // E.3: type is in enum (AI types only)
  const type = typeof candidate.type === 'string' ? candidate.type.toLowerCase() as AINameType : null;
  if (!type || !AI_NAME_TYPES.includes(type)) {
    errors.push(`Invalid type: "${candidate.type}" (must be one of: ${AI_NAME_TYPES.join(', ')})`);
  }
  
  // E.4: category is in enum and required
  const category = typeof candidate.category === 'string' 
    ? candidate.category.toLowerCase() as NameCategory4 
    : null;
  if (!category || !NAME_CATEGORIES.includes(category)) {
    errors.push(`Invalid category: "${candidate.category}" (must be one of: ${NAME_CATEGORIES.join(', ')})`);
  }
  
  // E.5: territoryId required only if strategy territories exist
  const territoryId = typeof candidate.territoryId === 'string' ? candidate.territoryId : undefined;
  if (context.hasStrategyTerritories) {
    if (!territoryId) {
      errors.push('territoryId is required when strategy territories exist');
    } else if (!context.validTerritoryIds.has(territoryId)) {
      errors.push(`Invalid territoryId: "${territoryId}"`);
    }
  }
  
  // E.6: Rationale passes validation (Section D)
  const rationale = typeof candidate.rationale === 'string' ? candidate.rationale.trim() : '';
  const rationaleValidation = validateRationale(rationale, context.languageMode);
  if (!rationaleValidation.valid) {
    errors.push(`Rationale invalid: ${rationaleValidation.error}`);
  }
  
  // Get normalized keys for dedupe/diversity checks
  const duplicateKey = getDuplicateKey(name);
  const rootKey = getRootKey(name);
  const tailToken = getTailToken(name);
  
  // E.7a: Check against banned names (exact duplicateKey match)
  if (context.bannedNameSet.has(duplicateKey)) {
    errors.push('Name is in banned list');
  }
  
  // E.7b: Check against banned tokens
  const tokens = tokenizeName(name);
  for (const token of tokens) {
    if (context.bannedTokenSet.has(token)) {
      errors.push(`Name contains banned token: "${token}"`);
      break;
    }
    // F.4: Near-variant rule (only for bans, not diversity)
    // If token starts with banned token and banned token >= 4 chars
    for (const banned of context.bannedTokenSet) {
      if (banned.length >= 4 && token.startsWith(banned)) {
        errors.push(`Name contains near-variant of banned token: "${token}" (starts with "${banned}")`);
        break;
      }
    }
  }
  
  // E.7c: Deduplicate against existing
  if (context.existingDuplicateKeys.has(duplicateKey)) {
    errors.push('Duplicate name (already exists in batch or history)');
  }
  
  // E.7d: Root diversity enforcement (Section G)
  const currentRootCount = context.existingRootKeys.get(rootKey) || 0;
  if (currentRootCount >= context.maxPerRootKey) {
    errors.push(`Root diversity exceeded: "${rootKey}" already has ${currentRootCount} names (max ${context.maxPerRootKey})`);
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    errors: [],
    candidate: {
      name,
      type: type!,
      category: category!,
      rationale,
      territoryId,
      duplicateKey,
      rootKey,
      tailToken
    }
  };
}

/**
 * E.2: Check if name looks like a real brand name
 * Rejects category labels, all-caps category text, pure labels
 */
function looksLikeBrandName(name: string): { valid: boolean; error?: string } {
  const lower = name.toLowerCase();
  
  // Reject category labels used as names
  const categoryLabels = [
    'direct', 'functional', 'emotional', 'aspirational', 'abstract', 'constructed',
    'informing', 'image_informing', 'image', 'abstract_constructed',
    'invented', 'compound', 'acronym', 'descriptive', 'foreign'
  ];
  
  if (categoryLabels.includes(lower)) {
    return { valid: false, error: `"${name}" is a category label, not a brand name` };
  }
  
  // Reject compound category labels with slashes
  if (/^[a-z]+\/[a-z]+$/i.test(name)) {
    return { valid: false, error: `"${name}" appears to be a category label (contains /)` };
  }
  
  // Reject all-caps text that looks like labels (but allow short acronyms)
  if (name === name.toUpperCase() && name.length > 4 && /^[A-Z\s]+$/.test(name)) {
    return { valid: false, error: `"${name}" appears to be all-caps category text` };
  }
  
  // Reject names that are just numbers
  if (/^\d+$/.test(name)) {
    return { valid: false, error: `"${name}" is just numbers, not a brand name` };
  }
  
  // Reject very common words that aren't brand-like
  const genericWords = ['name', 'brand', 'company', 'business', 'service', 'product'];
  if (genericWords.includes(lower)) {
    return { valid: false, error: `"${name}" is too generic for a brand name` };
  }
  
  return { valid: true };
}

// ============================================================================
// SECTION F: Ban Lists & Near-Variant Strategy
// ============================================================================

export interface BanListConfig {
  clientRejectedNames: string[];
  clientBannedWords: string[];
  designerDislikes: string[];
  systemAutoBans?: string[]; // Optional: for extreme repetition
}

/**
 * F.1-F.4: Build ban sets from various inputs
 */
export function buildBanSets(config: BanListConfig): {
  bannedTokenSet: Set<string>;
  bannedNameSet: Set<string>;
} {
  const bannedTokenSet = new Set<string>();
  const bannedNameSet = new Set<string>();
  
  // F.1a: Client rejected items (highest priority)
  for (const name of config.clientRejectedNames) {
    bannedNameSet.add(getDuplicateKey(name));
    // Also extract tokens from rejected names
    for (const token of tokenizeName(name)) {
      if (token.length >= 3) {
        bannedTokenSet.add(token);
      }
    }
  }
  
  // F.1b: Client explicit banned words
  for (const word of config.clientBannedWords) {
    const normalized = normalizeNameForCompare(word);
    if (normalized.length > 0) {
      bannedTokenSet.add(normalized);
    }
  }
  
  // F.1c: Designer dislikes (lower priority - just the tokens, less aggressive)
  for (const name of config.designerDislikes) {
    const tokens = tokenizeName(name);
    // Only add the root token for designer dislikes
    if (tokens.length > 0 && tokens[0].length >= 4) {
      bannedTokenSet.add(tokens[0]);
    }
  }
  
  // F.1d: System auto-bans (optional)
  if (config.systemAutoBans) {
    for (const word of config.systemAutoBans) {
      bannedTokenSet.add(normalizeNameForCompare(word));
    }
  }
  
  return { bannedTokenSet, bannedNameSet };
}

// ============================================================================
// SECTION G: Diversity Enforcement
// ============================================================================

export interface DiversityStats {
  rootKeyDistribution: Map<string, string[]>;
  topHeadTokens: [string, number][];
  topTailTokens: [string, number][];
  violations: string[];
}

/**
 * G.1-G.3: Analyze diversity of a set of candidates
 */
export function analyzeDiversity(
  candidates: ValidatedCandidate[],
  maxPerRootKey: number = 2
): DiversityStats {
  const rootKeyDistribution = new Map<string, string[]>();
  const headTokenCounts = new Map<string, number>();
  const tailTokenCounts = new Map<string, number>();
  const violations: string[] = [];
  
  for (const candidate of candidates) {
    // Track root key distribution
    if (!rootKeyDistribution.has(candidate.rootKey)) {
      rootKeyDistribution.set(candidate.rootKey, []);
    }
    rootKeyDistribution.get(candidate.rootKey)!.push(candidate.name);
    
    // Track head tokens
    headTokenCounts.set(
      candidate.rootKey, 
      (headTokenCounts.get(candidate.rootKey) || 0) + 1
    );
    
    // Track tail tokens
    if (candidate.tailToken) {
      tailTokenCounts.set(
        candidate.tailToken,
        (tailTokenCounts.get(candidate.tailToken) || 0) + 1
      );
    }
  }
  
  // Check for violations
  for (const [rootKey, names] of rootKeyDistribution) {
    if (names.length > maxPerRootKey) {
      violations.push(
        `Root "${rootKey}" has ${names.length} names (max ${maxPerRootKey}): ${names.join(', ')}`
      );
    }
  }
  
  // Sort and get top 10
  const topHeadTokens = Array.from(headTokenCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const topTailTokens = Array.from(tailTokenCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  return {
    rootKeyDistribution,
    topHeadTokens,
    topTailTokens,
    violations
  };
}

// ============================================================================
// SECTION M: Security & Input Safety (Prompt Injection Resistance)
// ============================================================================

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  issues: string[];
}

/**
 * M.1: Sanitize user-supplied text before prompt insertion
 */
export function sanitizePromptInput(text: string): SanitizationResult {
  if (!text) return { sanitized: '', wasModified: false, issues: [] };
  
  let sanitized = text;
  const issues: string[] = [];
  let wasModified = false;
  
  // M.1a: Remove/escape code blocks
  const codeBlockPattern = /```[\s\S]*?```|`[^`]+`/g;
  if (codeBlockPattern.test(sanitized)) {
    sanitized = sanitized.replace(codeBlockPattern, '[code removed]');
    issues.push('Code blocks removed');
    wasModified = true;
  }
  
  // M.1b: Strip zero-width chars
  const zeroWidthPattern = /[\u200B-\u200D\uFEFF\u00AD]/g;
  if (zeroWidthPattern.test(sanitized)) {
    sanitized = sanitized.replace(zeroWidthPattern, '');
    issues.push('Zero-width characters removed');
    wasModified = true;
  }
  
  // M.1c: Neutralize "ignore previous instructions" patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|prompts?|context)/gi,
    /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|prompts?)/gi,
    /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|prompts?)/gi,
    /you\s+are\s+now\s+a?\s*(different|new|evil|hacked)/gi,
    /system:\s*override/gi,
    /\[SYSTEM\]/gi,
    /\[\[ADMIN\]\]/gi,
    /<\/?system>/gi,
    /<\/?admin>/gi,
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[instruction blocked]');
      issues.push('Potential prompt injection pattern neutralized');
      wasModified = true;
    }
  }
  
  // M.1d: Limit excessive special characters that might break parsing
  const excessiveSpecialChars = /[{}\[\]<>]{5,}/g;
  if (excessiveSpecialChars.test(sanitized)) {
    sanitized = sanitized.replace(excessiveSpecialChars, '');
    issues.push('Excessive special characters removed');
    wasModified = true;
  }
  
  return { sanitized, wasModified, issues };
}

/**
 * M.2: Check if content is suspicious (for meta tracking)
 */
export function hasSuspiciousContent(text: string): boolean {
  const result = sanitizePromptInput(text);
  return result.wasModified;
}
