/**
 * API utilities for BrandForge v1.2.1+
 * Browser-based API calls to AI providers
 * 
 * Engineering Acceptance Checklist Implementation:
 * - Section A: LLM-only contract, system-owned wrapper
 * - Section E: Candidate validation pipeline
 * - Section H: Top-up with MAX_TOP_UP = 3
 * - Section K: Multi-provider behavior (strict vs fallback)
 * - Section L: Caching and idempotency
 * - Section M: Input sanitization
 */

import { GeneratedName } from "./store";
import { 
  NAME_GENERATION_SCHEMA, 
  NameCandidate,
  checkRootDiversity,
  // New v1.2.1+ imports from validation service
  validateRationale as validateRationaleNew,
  getDuplicateKey,
  tokenizeName,
  getRootKey,
  type LanguageMode
} from "./schemas";

import { sanitizePromptInput } from "./services/validation";

import {
  createEmptyRejectionCounts,
  getProviderConfig,
  simpleHash,
  logTelemetry,
  type RejectionCounts,
  type RunTelemetry
} from "./services/generation";

// Wrapper for backward compatibility
function validateRationale(
  rationale: string,
  language: 'english' | 'russian' | 'both' = 'english'
): { valid: boolean; error?: string; wordCount: number } {
  const langMode: LanguageMode = language === 'russian' ? 'ru' : language === 'both' ? 'both' : 'en';
  const result = validateRationaleNew(rationale, langMode);
  return {
    valid: result.valid,
    error: result.error,
    wordCount: result.wordCount
  };
}

// Generate learning summary from generation history
export async function generateLearningSummary(
  generatedNames: GeneratedName[],
  favoritedNames: GeneratedName[],
  apiKey: string,
  provider: "gemini" | "openai" | "claude",
  model?: string
): Promise<string> {
  const likedNames = generatedNames.filter(n => n.liked);
  const dislikedNames = generatedNames.filter(n => n.disliked);
  const clientApproved = favoritedNames.filter(f => f.clientFeedback?.status === 'approved');
  const clientRejected = favoritedNames.filter(f => f.clientFeedback?.status === 'rejected');

  const prompt = `You are a brand naming pattern analyst. Analyze this naming session data and extract KEY LEARNINGS.

# GENERATED NAMES (${generatedNames.length} total):
${generatedNames.slice(0, 30).map(n => `- ${n.name} (${n.type})`).join('\n')}

# LIKED by Designer (${likedNames.length}):
${likedNames.map(n => `- ${n.name}: ${n.rationale}`).join('\n')}

# DISLIKED by Designer (${dislikedNames.length}):
${dislikedNames.map(n => `- ${n.name}`).join('\n')}

# CLIENT APPROVED (${clientApproved.length}):
${clientApproved.map(n => `- ${n.name}: ${n.clientFeedback?.comments || 'No comment'}`).join('\n')}

# CLIENT REJECTED (${clientRejected.length}):
${clientRejected.map(n => `- ${n.name}: ${n.clientFeedback?.comments || 'No comment'}`).join('\n')}

---

Provide a CONCISE analysis (max 150 words) in this format:

**WORKING PATTERNS:**
- [Pattern 1: e.g., "6-8 letters, ends in -ly, nature metaphors"]
- [Pattern 2]
- [Pattern 3]

**AVOID:**
- [Anti-pattern 1: e.g., "Tech jargon, -ify suffixes, abstract compounds"]
- [Anti-pattern 2]

**NEXT DIRECTION:**
- [Specific suggestion for exploration]

Be specific, actionable, and focus on LINGUISTIC patterns (roots, suffixes, phonetics, structure).`;

  try {
    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash-exp'}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
            },
          }),
        }
      );
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Pattern analysis unavailable.";
    }
    return "Summary generation not implemented for this provider.";
  } catch (error) {
    console.error("Learning summary generation failed:", error);
    return "Pattern analysis unavailable.";
  }
}

export interface GenerationRequest {
  industry: string;
  keywords: string[];
  tones: string[];
  lengths: string[];
  language: string;
  creativity: "low" | "medium" | "high";
  custom_instructions: string;
  full_prompt?: string;
  count: number;
}

export interface TrademarkCheckRequest {
  names: string[];
  mktu_classes: number[];
}

/**
 * v1.2.1+ Enhanced: Parse AI response with full validation pipeline
 * Section E: Candidate validation in correct order
 * Section D: Language-specific rationale validation
 * 
 * Returns GeneratedName[] matching our contract
 */
const parseAIResponse = (
  text: string, 
  count: number,
  options: {
    languageMode?: LanguageMode;
    existingDuplicateKeys?: Set<string>;
    existingRootKeys?: Map<string, number>;
    bannedTokenSet?: Set<string>;
    bannedNameSet?: Set<string>;
    hasStrategyTerritories?: boolean;
    validTerritoryIds?: Set<string>;
    maxPerRootKey?: number;
  } = {}
): { names: GeneratedName[]; rejectionCounts: RejectionCounts; parseSuccess: boolean } => {
  const names: GeneratedName[] = [];
  const rejectionCounts = createEmptyRejectionCounts();
  
  // Validation options
  const languageMode = options.languageMode || 'en';
  const existingDuplicateKeys = options.existingDuplicateKeys || new Set();
  const existingRootKeys = options.existingRootKeys || new Map();
  
  // Try to parse as JSON first (primary method with Gemini 2.0 responseSchema)
  try {
    // Handle markdown code blocks around JSON
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/i, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(jsonText);
    
    // A.1: Handle LLM-only contract (candidates array)
    let candidates: NameCandidate[] = [];
    
    if (Array.isArray(parsed)) {
      // Legacy format: flat array
      candidates = parsed;
    } else if (parsed.candidates && Array.isArray(parsed.candidates)) {
      // v1.2.1+ format: { candidates: [...] }
      candidates = parsed.candidates;
    } else if (parsed.names && Array.isArray(parsed.names)) {
      // Alternative format
      candidates = parsed.names;
    }
    
    if (candidates.length > 0) {
      // E.1-E.7: Full validation pipeline
      for (const item of candidates.slice(0, count * 2)) { // Process extra for filtering
        const candidate: GeneratedName = {
          name: (item.name || (item as any).title || '').trim(),
          type: (item.type || 'invented') as GeneratedName['type'],
          rationale: (item.rationale || (item as any).description || (item as any).explanation || '').trim(),
          selected: false,
          category: (item.category || (item as any).category4 || (item as any).category_4 || undefined) as GeneratedName['category'],
          territoryId: item.territoryId || (item as any).territory_id
        };
        
        // E.1: Name non-empty, 1-50 chars
        if (!candidate.name || candidate.name.length < 1 || candidate.name.length > 50) {
          rejectionCounts.empty_name++;
          continue;
        }
        
        // E.2: Looks like a brand name check
        if (isCategoryLabel(candidate.name)) {
          rejectionCounts.invalid_name++;
          continue;
        }
        
        // E.6: Rationale validation (D.1-D.5)
        const rationaleResult = validateRationale(
          candidate.rationale || '', 
          languageMode === 'ru' ? 'russian' : languageMode === 'both' ? 'both' : 'english'
        );
        if (!rationaleResult.valid) {
          rejectionCounts.invalid_rationale++;
          console.warn(`Invalid rationale for "${candidate.name}": ${rationaleResult.error}`);
          continue;
        }
        
        // E.7a: Deduplicate check
        const duplicateKey = getDuplicateKey(candidate.name);
        if (existingDuplicateKeys.has(duplicateKey)) {
          rejectionCounts.duplicate++;
          continue;
        }
        
        // E.7b: Banned name check
        if (options.bannedNameSet && options.bannedNameSet.has(duplicateKey)) {
          rejectionCounts.banned++;
          continue;
        }
        
        // E.7c: Banned token check (with near-variant)
        const tokens = tokenizeName(candidate.name);
        let isBanned = false;
        for (const token of tokens) {
          if (options.bannedTokenSet && options.bannedTokenSet.has(token)) {
            isBanned = true;
            break;
          }
          // F.4: Near-variant for bans only (token >= 4 chars)
          for (const banned of (options.bannedTokenSet || new Set())) {
            if (banned.length >= 4 && token.startsWith(banned)) {
              isBanned = true;
              break;
            }
          }
          if (isBanned) break;
        }
        if (isBanned) {
          rejectionCounts.banned++;
          continue;
        }
        
        // G.1: Root diversity check
        const rootKey = getRootKey(candidate.name);
        const currentRootCount = existingRootKeys.get(rootKey) || 0;
        if (currentRootCount >= (options.maxPerRootKey || 2)) {
          rejectionCounts.diversity_exceeded++;
          continue;
        }
        
        // Passed all validations - add to results
        names.push(candidate);
        
        // Update context for subsequent validations
        existingDuplicateKeys.add(duplicateKey);
        existingRootKeys.set(rootKey, currentRootCount + 1);
        
        // Stop if we have enough
        if (names.length >= count) break;
      }
      
      // G.3: Log diversity stats
      const diversityIssues = checkRootDiversity(names as any);
      if (diversityIssues.size > 0) {
        console.log('[Diversity] Root distribution:', Object.fromEntries(diversityIssues));
      }
      
      return { names, rejectionCounts, parseSuccess: true };
    }
  } catch (e) {
    // JSON parsing failed, try to extract JSON from text
    rejectionCounts.parse_error++;
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/m);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          const validatedNames = parsed.slice(0, count).map(item => ({
            name: item.name || item.title || '',
            type: item.type || 'invented',
            rationale: item.rationale || item.description || item.explanation || '',
            selected: false,
            category: (item.category || item.category4 || item.category_4 || undefined) as GeneratedName['category'],
            territoryId: item.territoryId || item.territory_id
          })).filter(item => {
            const validation = validateRationale(item.rationale || '');
            return item.name && item.name.length > 0 && validation.valid;
          });
          
          return { names: validatedNames, rejectionCounts, parseSuccess: true };
        }
      } catch {
        // Continue to text parsing
      }
    }
  }
  
  console.warn('[K.2] JSON parsing failed, using fallback path (lower quality)');
  console.log('Parsing AI response (fallback):', text.substring(0, 500));
  
  // Text parsing fallback (LAST RESORT)
  const textNames = parseTextResponse(text, count);
  return { names: textNames, rejectionCounts, parseSuccess: false };
};

/**
 * E.2: Check if name is a category label
 */
function isCategoryLabel(name: string): boolean {
  const lower = name.toLowerCase();
  const labels = [
    'direct', 'functional', 'emotional', 'aspirational', 'abstract', 'constructed',
    'informing', 'image_informing', 'image', 'abstract_constructed',
    'invented', 'compound', 'acronym', 'descriptive', 'foreign'
  ];
  return labels.includes(lower) || /^[a-z]+\/[a-z]+$/i.test(name);
}

/**
 * Text parsing fallback for non-JSON responses
 */
function parseTextResponse(text: string, count: number): GeneratedName[] {
  const names: GeneratedName[] = [];
  const lines = text.split('\n');
  let currentName = '';
  let currentType: GeneratedName['type'] = 'invented';
  let currentRationale = '';
  let currentCategory = '';
  let hasValidName = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, markdown artifacts, and preamble text
    if (!line || line === '---' || line.startsWith('```')) continue;
    
    // Skip preamble/intro sentences
    if (line.match(/^(here are|here's|i've generated|below are|following are|these are)/i)) continue;
    if (line.match(/adhering to|based on|according to|with the following/i) && line.length > 40) continue;
    
    // Match pattern: "1. **Name:** ActualBrandName" or "**Name:** ActualBrandName"
    const nameFieldMatch = line.match(/^(?:\d+\.\s*)?\*?\*?Name:?\*?\*?\s*(.+)$/i);
    if (nameFieldMatch) {
      // Save previous name if exists and valid
      if (currentName && hasValidName && currentName.length > 1) {
        const validation = validateRationale(currentRationale.trim());
        
        if (validation.valid) {
          names.push({
            name: currentName,
            type: currentType,
            rationale: currentRationale.trim(),
            selected: false,
            category: (currentCategory || undefined) as GeneratedName['category']
          });
        } else {
          console.warn(`Skipping "${currentName}": ${validation.error}`);
        }
        
        currentRationale = '';
        currentType = 'invented';
        currentCategory = '';
        hasValidName = false;
      }
      currentName = nameFieldMatch[1].replace(/\*+/g, '').trim();
      hasValidName = currentName.length > 0 && currentName.length < 50; // Validate name length
      continue;
    }
    
    // Match pattern: "**Type:** invented" or "* **Type:** invented"
    const typeFieldMatch = line.match(/^\*?\s*\*?\*?Type:?\*?\*?\s*(.+)$/i);
    if (typeFieldMatch) {
      const typeText = typeFieldMatch[1].replace(/\*+/g, '').trim().toLowerCase();
      // More strict type matching to avoid mis-classification
      if (typeText === 'acronym' || typeText.startsWith('acronym')) currentType = 'acronym';
      else if (typeText === 'compound' || typeText.startsWith('compound')) currentType = 'compound';
      else if (typeText === 'descriptive' || typeText.startsWith('descriptive')) currentType = 'descriptive';
      else if (typeText === 'foreign' || typeText.startsWith('foreign')) currentType = 'foreign';
      else currentType = 'invented'; // Default to invented for safety
      continue;
    }
    
    // Match pattern: "**Category:** informing" or "* **Category:** informing"
    const categoryFieldMatch = line.match(/^\*?\s*\*?\*?Category:?\*?\*?\s*(.+)$/i);
    if (categoryFieldMatch) {
      currentCategory = categoryFieldMatch[1].replace(/\*+/g, '').trim().toLowerCase();
      continue;
    }
    
    // Match pattern: "**Rationale:** explanation" or "* **Rationale:** explanation"
    const rationaleFieldMatch = line.match(/^\*?\s*\*?\*?Rationale:?\*?\*?\s*(.+)$/i);
    if (rationaleFieldMatch) {
      currentRationale = rationaleFieldMatch[1].replace(/\*+/g, '').trim();
      continue;
    }
    
    // Fallback: Match simple patterns like "1. BrandName - Rationale" or "1. **BrandName** - Rationale"
    const simpleMatch = line.match(/^\d+\.\s+\*?\*?([^*:\-\n]+)\*?\*?\s*[\-:]?\s*(.*)$/);
    if (simpleMatch && 
        !line.toLowerCase().includes('name:') && 
        !line.toLowerCase().includes('type:') && 
        !line.toLowerCase().includes('rationale:') &&
        simpleMatch[1].trim().split(/\s+/).length <= 4) { // Only accept if "name" part is 4 words or less
      // Save previous name if exists and valid
      if (currentName && hasValidName && currentName.length > 1) {
        const validation = validateRationale(currentRationale.trim());
        
        if (validation.valid) {
          names.push({
            name: currentName,
            type: currentType,
            rationale: currentRationale.trim(),
            selected: false,
            category: currentCategory ? (currentCategory as GeneratedName['category']) : undefined
          });
        }
        
        currentRationale = '';
        currentType = 'invented';
        currentCategory = '';
        hasValidName = false;
      }
      
      currentName = simpleMatch[1].trim();
      currentRationale = simpleMatch[2].trim();
      hasValidName = currentName.length > 0 && currentName.length < 50;
      
      // Detect type from rationale
      const combinedText = currentRationale.toLowerCase();
      if (combinedText.includes('acronym')) currentType = 'acronym';
      else if (combinedText.includes('compound')) currentType = 'compound';
      else if (combinedText.includes('descriptive')) currentType = 'descriptive';
      else if (combinedText.includes('foreign')) currentType = 'foreign';
      else currentType = 'invented';
      continue;
    }
    
    // If we have a current name and line doesn't match known patterns, append to rationale
    if (currentName && !line.startsWith('#')) {
      currentRationale += ' ' + line.replace(/\*+/g, '');
    }
  }
  
  // Add last name if valid
  if (currentName && hasValidName && currentName.length > 1) {
    const validation = validateRationale(currentRationale.trim());
    
    if (validation.valid) {
      names.push({
        name: currentName,
        type: currentType,
        rationale: currentRationale.trim(),
        selected: false,
        category: currentCategory ? (currentCategory as GeneratedName['category']) : undefined
      });
    } else {
      console.warn(`Skipping final name "${currentName}": ${validation.error}`);
    }
  }
  
  // P1 Fix: No template fallbacks - return what we have (even if < count)
  const validNames = names.filter(n => 
    n.name && 
    n.name.length > 1 && 
    n.name.length < 50 &&
    n.rationale &&
    n.rationale.length > 0
  );
  
  return validNames.slice(0, count);
}

/**
 * K.1: Gemini - Strict JSON schema path (guaranteed structured output)
 */
async function callGemini(
  prompt: string, 
  apiKey: string, 
  count: number, 
  model: string = "gemini-2.0-flash-exp", 
  temperature: number = 0.9,
  options: {
    languageMode?: LanguageMode;
    existingDuplicateKeys?: Set<string>;
    existingRootKeys?: Map<string, number>;
    bannedTokenSet?: Set<string>;
    bannedNameSet?: Set<string>;
    maxPerRootKey?: number;
  } = {}
): Promise<{ names: GeneratedName[]; rejectionCounts: RejectionCounts; parseSuccess: boolean }> {
  const providerConfig = getProviderConfig('gemini');
  
  try {
    const trimmedKey = apiKey?.trim();
    
    if (!trimmedKey) {
      throw new Error('API key is empty. Please add your Gemini API key in Settings.');
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${trimmedKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: temperature,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096, // Increased for larger batches
            // K.1: Gemini strict schema path
            responseMimeType: "application/json",
            responseSchema: NAME_GENERATION_SCHEMA
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Gemini API error: ${errorMsg}`);
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    
    console.log(`[K.1] Gemini ${providerConfig.tier}: received ${text.length} chars`);
    return parseAIResponse(text, count, options);
  } catch (error: any) {
    if (error.message?.includes('Gemini API error')) {
      throw error;
    }
    throw new Error(`Gemini API failed: ${error.message || 'Network error'}`);
  }
}

/**
 * K.2: OpenAI - Fallback provider path (best-effort, fewer top-up attempts)
 */
async function callOpenAI(
  prompt: string, 
  apiKey: string, 
  count: number, 
  temperature: number = 0.9,
  options: {
    languageMode?: LanguageMode;
    existingDuplicateKeys?: Set<string>;
    existingRootKeys?: Map<string, number>;
    bannedTokenSet?: Set<string>;
    bannedNameSet?: Set<string>;
    maxPerRootKey?: number;
  } = {}
): Promise<{ names: GeneratedName[]; rejectionCounts: RejectionCounts; parseSuccess: boolean }> {
  const providerConfig = getProviderConfig('openai');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional brand naming expert. Always respond with valid JSON containing a "candidates" array.' },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: 4000,
        response_format: { type: "json_object" } // K.2: Request JSON mode
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`OpenAI API error: ${errorMsg}`);
    }
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    if (!text) {
      throw new Error('OpenAI returned empty response');
    }
    
    console.log(`[K.2] OpenAI ${providerConfig.tier}: received ${text.length} chars`);
    return parseAIResponse(text, count, options);
  } catch (error: any) {
    if (error.message?.includes('OpenAI API error')) {
      throw error;
    }
    throw new Error(`OpenAI API failed: ${error.message || 'Network error'}`);
  }
}

/**
 * K.2: Claude - Fallback provider path (best-effort, fewer top-up attempts)
 */
async function callClaude(
  prompt: string, 
  apiKey: string, 
  count: number, 
  temperature: number = 0.9,
  options: {
    languageMode?: LanguageMode;
    existingDuplicateKeys?: Set<string>;
    existingRootKeys?: Map<string, number>;
    bannedTokenSet?: Set<string>;
    bannedNameSet?: Set<string>;
    maxPerRootKey?: number;
  } = {}
): Promise<{ names: GeneratedName[]; rejectionCounts: RejectionCounts; parseSuccess: boolean }> {
  const providerConfig = getProviderConfig('claude');
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt + '\n\nIMPORTANT: Respond ONLY with valid JSON containing a "candidates" array. No other text.'
        }],
        temperature: temperature
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Claude API error: ${errorMsg}`);
    }
    
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    if (!text) {
      throw new Error('Claude returned empty response');
    }
    
    console.log(`[K.2] Claude ${providerConfig.tier}: received ${text.length} chars`);
    return parseAIResponse(text, count, options);
  } catch (error: any) {
    if (error.message?.includes('Claude API error')) {
      throw error;
    }
    throw new Error(`Claude API failed: ${error.message || 'Network error'}`);
  }
}

/**
 * v1.2.1+ Enhanced generateNames with top-up loop and telemetry
 * Section H: Count Guarantee + Top-Up (correct loop, transparent meta)
 */
export async function generateNames(
  request: GenerationRequest,
  apiKey: string,
  provider: string,
  geminiModel?: string,
  temperature?: number,
  options: {
    languageMode?: LanguageMode;
    existingNames?: string[];
    bannedTokens?: string[];
    bannedNames?: string[];
    maxPerRootKey?: number;
    projectId?: string;
    generationCount?: number;
  } = {}
): Promise<GeneratedName[]> {
  console.log('[API] generateNames called:', { provider, count: request.count, hasApiKey: !!apiKey });
  
  const prompt = request.full_prompt || `Generate ${request.count} creative brand names for a ${request.industry} company. Keywords: ${request.keywords.join(', ')}. Tone: ${request.tones.join(', ')}. Length: ${request.lengths.join(', ')}. ${request.custom_instructions}`;
  
  // M.1: Sanitize prompt
  const sanitized = sanitizePromptInput(prompt);
  const finalPrompt = sanitized.sanitized;
  if (sanitized.wasModified) {
    console.warn('[M.1] Input sanitized:', sanitized.issues);
  }
  
  // Build validation context
  const existingDuplicateKeys = new Set<string>();
  const existingRootKeys = new Map<string, number>();
  
  // Add existing names to dedupe set
  for (const name of options.existingNames || []) {
    existingDuplicateKeys.add(getDuplicateKey(name));
  }
  
  const bannedTokenSet = new Set<string>(options.bannedTokens || []);
  const bannedNameSet = new Set<string>(options.bannedNames || []);
  
  const providerConfig = getProviderConfig(provider);
  const maxAttempts = providerConfig.maxTopUpAttempts;
  
  const allNames: GeneratedName[] = [];
  let totalRejections = createEmptyRejectionCounts();
  let attempt = 0;
  let parseSuccessCount = 0;
  let totalAttempts = 0;
  
  const languageMode: LanguageMode = 
    request.language === 'russian' ? 'ru' : 
    request.language === 'both' ? 'both' : 'en';
  
  const callOptions = {
    languageMode,
    existingDuplicateKeys,
    existingRootKeys,
    bannedTokenSet,
    bannedNameSet,
    maxPerRootKey: options.maxPerRootKey || 2
  };
  
  // H.2: Top-up loop with MAX_TOP_UP = 3
  while (allNames.length < request.count && attempt < maxAttempts) {
    const needed = request.count - allNames.length;
    const buffer = Math.ceil(needed * 0.15); // 15% buffer
    const requestCount = needed + buffer;
    
    try {
      let result: { names: GeneratedName[]; rejectionCounts: RejectionCounts; parseSuccess: boolean };
      
      switch (provider.toLowerCase()) {
        case 'gemini':
          result = await callGemini(finalPrompt, apiKey, requestCount, geminiModel || "gemini-2.0-flash-exp", temperature || 0.9, callOptions);
          break;
        case 'openai':
          result = await callOpenAI(finalPrompt, apiKey, requestCount, temperature || 0.9, callOptions);
          break;
        case 'claude':
          result = await callClaude(finalPrompt, apiKey, requestCount, temperature || 0.9, callOptions);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
      
      totalAttempts++;
      if (result.parseSuccess) parseSuccessCount++;
      
      // Add valid names
      for (const name of result.names) {
        if (allNames.length >= request.count) break;
        allNames.push(name);
        
        // Update context for next iteration
        existingDuplicateKeys.add(getDuplicateKey(name.name));
        const rootKey = getRootKey(name.name);
        existingRootKeys.set(rootKey, (existingRootKeys.get(rootKey) || 0) + 1);
      }
      
      // Accumulate rejection counts
      for (const [key, value] of Object.entries(result.rejectionCounts)) {
        (totalRejections as any)[key] += value;
      }
      
    } catch (error) {
      console.error(`[H.2] Attempt ${attempt + 1} failed:`, error);
      totalRejections.parse_error++;
    }
    
    attempt++;
    
    // H.2: Loop condition uses attempt < MAX_TOP_UP (no off-by-one)
    if (attempt >= maxAttempts && allNames.length < request.count) {
      console.warn(`[H.3] Shortfall after ${attempt} attempts: ${allNames.length}/${request.count}`);
    }
  }
  
  // P.1: Log telemetry
  const telemetry: RunTelemetry = {
    runId: `run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    promptHash: simpleHash(finalPrompt),
    constraintHash: simpleHash(JSON.stringify(callOptions)),
    provider,
    model: geminiModel || 'default',
    temperature: temperature || 0.9,
    requestedCount: request.count,
    returnedCount: allNames.length,
    topUpAttempts: attempt,
    rejectionCounts: totalRejections,
    bucketFillRates: {}, // Would need bucket info
    rootKeyStats: {
      unique: existingRootKeys.size,
      maxPerRoot: Math.max(...existingRootKeys.values(), 0),
      topRoots: Array.from(existingRootKeys.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    },
    parseSuccessRate: totalAttempts > 0 ? parseSuccessCount / totalAttempts : 0,
    rationalePassRate: allNames.length / (allNames.length + totalRejections.invalid_rationale),
    duplicateRate: totalRejections.duplicate / (allNames.length + totalRejections.duplicate)
  };
  
  logTelemetry(telemetry);
  
  return allNames;
}

// Mock trademark checking (real implementation would need a backend proxy due to CORS)
export async function checkTrademarks(
  request: TrademarkCheckRequest
): Promise<any[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const riskLevels: ("safe" | "caution" | "risk")[] = ["safe", "caution", "risk"];
  
  return request.names.map((name) => {
    const risk = riskLevels[Math.floor(Math.random() * 3)];
    return {
      name,
      risk_level: risk,
      exact_matches: risk === "risk" ? [`${name} LLC`, `${name} Corp`] : [],
      similar_matches: risk === "caution" ? [`${name}Pro`, `My${name}`] : [],
      details: risk === "safe" ? "No conflicts found" : risk === "caution" ? "Similar names exist" : "Exact match found",
    };
  });
}

// API for getting MKTU classes
export async function getMktuClasses(): Promise<any> {
  const response = await fetch("/python-sidecar/mktu_data.json");
  return await response.json();
}
