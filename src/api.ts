/**
 * API utilities for BrandForge
 * Browser-based API calls to AI providers
 */

import { GeneratedName } from "./store";

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

// Helper to parse AI response and extract names
const parseAIResponse = (text: string, count: number): GeneratedName[] => {
  const names: GeneratedName[] = [];
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, count).map(item => ({
        name: item.name || item.title || '',
        type: item.type || 'invented',
        rationale: item.rationale || item.description || '',
        selected: false
      }));
    }
  } catch {
    // Not JSON, continue with text parsing
  }
  
  // Parse text response line by line
  const lines = text.split('\n');
  let currentName = '';
  let currentType: GeneratedName['type'] = 'invented';
  let currentRationale = '';
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
        // Ensure rationale is meaningful and substantial
        const cleanRationale = currentRationale.trim();
        let meaningfulRationale = cleanRationale;
        
        // Check if rationale is empty, too short, or just a type name/fragment
        if (!cleanRationale || 
            cleanRationale.length < 15 || 
            cleanRationale.toLowerCase().match(/^(invented|compound|acronym|descriptive|foreign|creative brand name|suggestion|comb|means|combines|refers|represents)$/i)) {
          meaningfulRationale = `${currentName}: A ${currentType} brand name thoughtfully crafted to communicate brand essence and resonate with target audience.`;
        }
        
        // Replace single-word fragments with full sentences
        if (cleanRationale.match(/^\w{3,8}$/)) {
          meaningfulRationale = `${currentName} is a ${currentType} brand name designed for memorable brand identity and market differentiation.`;
        }
        
        names.push({
          name: currentName,
          type: currentType,
          rationale: meaningfulRationale,
          selected: false
        });
        currentRationale = '';
        currentType = 'invented';
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
        const cleanRationale = currentRationale.trim();
        const meaningfulRationale = cleanRationale && 
          cleanRationale.length > 10 && 
          !cleanRationale.toLowerCase().match(/^(invented|compound|acronym|descriptive|foreign)$/i)
          ? cleanRationale
          : 'Creative brand name suggestion';
        
        names.push({
          name: currentName,
          type: currentType,
          rationale: meaningfulRationale,
          selected: false
        });
        currentRationale = '';
        currentType = 'invented';
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
    const cleanRationale = currentRationale.trim();
    let meaningfulRationale = cleanRationale;
    
    // Stronger validation for rationale quality
    if (!cleanRationale || 
        cleanRationale.length < 15 || 
        cleanRationale.toLowerCase().match(/^(invented|compound|acronym|descriptive|foreign|creative|suggestion)$/i)) {
      meaningfulRationale = `${currentName}: A ${currentType} brand name combining creative elements for strategic positioning.`;
    }
    
    names.push({
      name: currentName,
      type: currentType,
      rationale: meaningfulRationale,
      selected: false
    });
  }
  
  // Final validation: ensure ALL names have substantial rationales
  const preValidated = names.filter(n => 
    n.name && 
    n.name.length > 1 && 
    n.name.length < 50
  );
  
  const validNames = preValidated.map(name => {
    // Check rationale quality
    if (!name.rationale || 
        name.rationale.length < 15 || 
        name.rationale.toLowerCase().match(/^(creative brand name suggestion|creative brand name|suggestion)$/i)) {
      return {
        ...name,
        rationale: `${name.name}: A ${name.type} brand name combining creative elements for memorable impact and strategic positioning.`
      };
    }
    return name;
  });
  
  return validNames.slice(0, count);
};

// Call Google Gemini API
async function callGemini(prompt: string, apiKey: string, count: number, model: string = "gemini-2.0-flash-exp", temperature: number = 0.9): Promise<GeneratedName[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: temperature, // Use provided temperature
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
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
