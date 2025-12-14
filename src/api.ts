/**
 * API utilities for BrandForge
 * Browser-based API calls to AI providers
 * 
 * P0 Fix: Unified schema enforcement with versioned response contracts
 */

import { GeneratedName } from "./store";
import { 
  NAME_GENERATION_SCHEMA, 
  NameGenerationResponse, 
  NameCandidate,
  validateRationale,
  checkRootDiversity,
  SCHEMA_VERSION
} from "./schemas";

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
 * P0 Fix: Parse AI response with unified schema validation
 * P1 Fix: Remove fallback rationale templates - reject invalid responses
 * 
 * Returns GeneratedName[] matching our contract
 */
const parseAIResponse = (text: string, count: number): GeneratedName[] => {
  const names: GeneratedName[] = [];
  
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
    
    // P0 Fix: Handle versioned response schema
    let candidates: NameCandidate[] = [];
    
    if (Array.isArray(parsed)) {
      // Legacy format: flat array
      candidates = parsed;
    } else if (parsed.candidates && Array.isArray(parsed.candidates)) {
      // New format: NameGenerationResponse with candidates array
      candidates = parsed.candidates;
    } else if (parsed.names && Array.isArray(parsed.names)) {
      // Alternative format
      candidates = parsed.names;
    }
    
    if (candidates.length > 0) {
      // P0 Fix: Validate and convert to GeneratedName with unified field names
      const validatedNames = candidates.slice(0, count).map((item: any) => {
        const candidate: GeneratedName = {
          name: item.name || item.title || '',
          type: item.type || 'invented',
          rationale: item.rationale || item.description || item.explanation || '',
          selected: false,
          category: item.category || item.category4 || item.category_4, // P0 Fix: handle all variants
          territoryId: item.territoryId || item.territory_id
        };
        
        // P1 Fix: Validate rationale quality - reject empty/template rationales
        const validation = validateRationale(candidate.rationale || '');
        if (!validation.valid) {
          console.warn(`Invalid rationale for "${candidate.name}": ${validation.error}`);
          // DO NOT use fallback templates - mark as invalid
          candidate.rationale = ''; // Will be filtered out
        }
        
        return candidate;
      }).filter((item: GeneratedName) => {
        // P1 Fix: Strict filtering - reject names with empty rationales
        return item.name && 
               item.name.length > 0 && 
               item.rationale && 
               item.rationale.length > 0;
      });
      
      // P0 Fix: Check root diversity
      const diversityIssues = checkRootDiversity(validatedNames);
      if (diversityIssues.size > 0) {
        console.warn('Root diversity issues detected:', Object.fromEntries(diversityIssues));
      }
      
      return validatedNames;
    }
  } catch (e) {
    // JSON parsing failed, try to extract JSON from text
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
            category: item.category || item.category4 || item.category_4,
            territoryId: item.territoryId || item.territory_id
          })).filter(item => {
            // P1 Fix: Strict validation
            const validation = validateRationale(item.rationale || '');
            return item.name && item.name.length > 0 && validation.valid;
          });
          
          return validatedNames;
        }
      } catch {
        // Continue to text parsing
      }
    }
  }
  
  console.warn('P1: JSON parsing failed, falling back to text parsing (lower quality)');
  console.log('Parsing AI response (fallback to text parsing):', text.substring(0, 500));
  
  // P1 Fix: Text parsing fallback (LAST RESORT - should rarely be needed with responseSchema)
  // DO NOT use template rationales - reject incomplete responses
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
    
    // Skip preamble/intro sentences (contains common intro phrases)
    if (line.match(/^(here are|here's|i've generated|below are|following are|these are)/i)) continue;
    if (line.match(/adhering to|based on|according to|with the following/i) && line.length > 40) continue;
    
    // Match pattern: "1. **Name:** ActualBrandName" or "**Name:** ActualBrandName"
    const nameFieldMatch = line.match(/^(?:\d+\.\s*)?\*?\*?Name:?\*?\*?\s*(.+)$/i);
    if (nameFieldMatch) {
      // Save previous name if exists and valid
      if (currentName && hasValidName && currentName.length > 1) {
        const validation = validateRationale(currentRationale.trim());
        
        // P1 Fix: Only add if rationale is valid (no template fallbacks)
        if (validation.valid) {
          names.push({
            name: currentName,
            type: currentType,
            rationale: currentRationale.trim(),
            selected: false,
            category: currentCategory || undefined
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
            category: currentCategory || undefined
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
        category: currentCategory || undefined
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
  });
  
  return validNames.slice(0, count);
};

// Call Google Gemini API
async function callGemini(prompt: string, apiKey: string, count: number, model: string = "gemini-2.0-flash-exp", temperature: number = 0.9): Promise<GeneratedName[]> {
  try {
    // Trim API key to remove any whitespace
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
            maxOutputTokens: 2048,
            // P0 Fix: Use versioned response schema
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
    
    return parseAIResponse(text, count);
  } catch (error: any) {
    if (error.message?.includes('Gemini API error')) {
      throw error;
    }
    throw new Error(`Gemini API failed: ${error.message || 'Network error'}`);
  }
}

// Call OpenAI API
async function callOpenAI(prompt: string, apiKey: string, count: number, temperature: number = 0.9): Promise<GeneratedName[]> {
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
          { role: 'system', content: 'You are a professional brand naming expert.' },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: 2000
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
    
    return parseAIResponse(text, count);
  } catch (error: any) {
    if (error.message?.includes('OpenAI API error')) {
      throw error;
    }
    throw new Error(`OpenAI API failed: ${error.message || 'Network error'}`);
  }
}

// Call Anthropic Claude API
async function callClaude(prompt: string, apiKey: string, count: number, temperature: number = 0.9): Promise<GeneratedName[]> {
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
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
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
    
    return parseAIResponse(text, count);
  } catch (error: any) {
    if (error.message?.includes('Claude API error')) {
      throw error;
    }
    throw new Error(`Claude API failed: ${error.message || 'Network error'}`);
  }
}

// API for generating names
export async function generateNames(
  request: GenerationRequest,
  apiKey: string,
  provider: string,
  geminiModel?: string,
  temperature?: number // Add temperature parameter
): Promise<GeneratedName[]> {
  const prompt = request.full_prompt || `Generate ${request.count} creative brand names for a ${request.industry} company. Keywords: ${request.keywords.join(', ')}. Tone: ${request.tones.join(', ')}. Length: ${request.lengths.join(', ')}. ${request.custom_instructions}`;
  
  try {
    switch (provider.toLowerCase()) {
      case 'gemini':
        return await callGemini(prompt, apiKey, request.count, geminiModel || "gemini-2.0-flash-exp", temperature);
      case 'openai':
        return await callOpenAI(prompt, apiKey, request.count);
      case 'claude':
        return await callClaude(prompt, apiKey, request.count);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error('AI API error:', error);
    throw error;
  }
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
