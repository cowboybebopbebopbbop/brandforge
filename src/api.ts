/**
 * API utilities for BrandForge
 * Browser-based API calls to AI providers
 */

import { GeneratedName } from "./store";

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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Match pattern: "1. **Name:** ActualBrandName" or "**Name:** ActualBrandName"
    const nameFieldMatch = line.match(/^(?:\d+\.\s*)?\*?\*?Name:?\*?\*?\s*(.+)$/i);
    if (nameFieldMatch) {
      // Save previous name if exists
      if (currentName) {
        names.push({
          name: currentName,
          type: currentType,
          rationale: currentRationale.trim() || 'Creative brand name suggestion',
          selected: false
        });
        currentRationale = '';
        currentType = 'invented';
      }
      currentName = nameFieldMatch[1].replace(/\*+/g, '').trim();
      continue;
    }
    
    // Match pattern: "**Type:** invented" or "* **Type:** invented"
    const typeFieldMatch = line.match(/^\*?\s*\*?\*?Type:?\*?\*?\s*(.+)$/i);
    if (typeFieldMatch) {
      const typeText = typeFieldMatch[1].replace(/\*+/g, '').trim().toLowerCase();
      if (typeText.includes('acronym')) currentType = 'acronym';
      else if (typeText.includes('compound')) currentType = 'compound';
      else if (typeText.includes('descriptive')) currentType = 'descriptive';
      else if (typeText.includes('foreign')) currentType = 'foreign';
      else currentType = 'invented';
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
    if (simpleMatch && !line.toLowerCase().includes('name:') && !line.toLowerCase().includes('type:') && !line.toLowerCase().includes('rationale:')) {
      // Save previous name if exists
      if (currentName) {
        names.push({
          name: currentName,
          type: currentType,
          rationale: currentRationale.trim() || 'Creative brand name suggestion',
          selected: false
        });
        currentRationale = '';
        currentType = 'invented';
      }
      
      currentName = simpleMatch[1].trim();
      currentRationale = simpleMatch[2].trim();
      
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
  
  // Add last name
  if (currentName) {
    names.push({
      name: currentName,
      type: currentType,
      rationale: currentRationale.trim() || 'Creative brand name suggestion',
      selected: false
    });
  }
  
  return names.slice(0, count);
};

// Call Google Gemini API
async function callGemini(prompt: string, apiKey: string, count: number): Promise<GeneratedName[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.9,
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
async function callOpenAI(prompt: string, apiKey: string, count: number): Promise<GeneratedName[]> {
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
        temperature: 0.9,
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
async function callClaude(prompt: string, apiKey: string, count: number): Promise<GeneratedName[]> {
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
        temperature: 0.9
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
  provider: string
): Promise<GeneratedName[]> {
  const prompt = request.full_prompt || `Generate ${request.count} creative brand names for a ${request.industry} company. Keywords: ${request.keywords.join(', ')}. Tone: ${request.tones.join(', ')}. Length: ${request.lengths.join(', ')}. ${request.custom_instructions}`;
  
  try {
    switch (provider.toLowerCase()) {
      case 'gemini':
        return await callGemini(prompt, apiKey, request.count);
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
