import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store";
import { generateNames } from "../../../api";
import type { GeneratedName } from "../../../store";

export default function GenerateStep() {
  const { t } = useTranslation();
  const { getCurrentTab, updateCurrentTab, settings, toggleFavorite, favoritedNames, tabs } = useAppStore();
  const currentTab = getCurrentTab();
  const [showPrompt, setShowPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isPromptEdited, setIsPromptEdited] = useState(false);
  const [useFeedback, setUseFeedback] = useState(true);
  const [animatingFavorite, setAnimatingFavorite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build the default prompt from config
  const buildDefaultPrompt = (includeFeedback: boolean = true) => {
    if (!currentTab) return "";
    
    const { config } = currentTab;
    
    // Collect feedback from CURRENT tab only (project-specific feedback)
    const allGeneratedNames = currentTab.generatedNames;
    const likedNames = allGeneratedNames.filter(n => n.liked);
    const dislikedNames = allGeneratedNames.filter(n => n.disliked);
    
    // Combine selected tones with custom tone
    const allTones = [...(config.tones || [])];
    if (config.customTone?.trim()) {
      allTones.push(config.customTone.trim());
    }

    // Combine selected lengths with custom length
    const allLengths = [...(config.lengths || [])];
    if (config.customLength?.trim()) {
      allLengths.push(config.customLength.trim());
    }

    // Combine selected word counts with custom word count
    const allWordCounts = [...(config.wordCounts || [])];
    if (config.customWordCount?.trim()) {
      allWordCounts.push(config.customWordCount.trim());
    }

    const creativityMap = {
      low: "conservative and predictable",
      medium: "balanced between conventional and creative",
      high: "highly creative and experimental"
    };

    // Build the complete prompt
    let prompt = `# ROLE

You are acting as a team of senior brand professionals: a Brand Designer, Brand Identity Designer, and Brand Strategist in one.

Your approach:
• You think in terms of positioning, target audience, competitive landscape, and long-term brand architecture.
• You avoid names that are hard to pronounce, spell, or remember in English.
• You avoid obvious negative, vulgar, or confusing associations.
• You deliberately explore different directions (corporate, playful, abstract, techy, premium, etc.), but always stay within a professional tone.
• You aim for names that could realistically be used for a modern brand with a strong, distinctive identity.

When you generate name ideas, always:
• Treat each name as if it were going into a real client presentation.
• Provide a short, strategic explanation for every name that clarifies the intended brand feeling, positioning, and meaning.

---

# TASK

Generate ${settings.resultsPerGeneration} unique brand names for a ${config.industry || "business"} company.

---

# REQUIREMENTS

`;

    const requirements: string[] = [];

    if (config.keywords && config.keywords.length > 0) {
      requirements.push(`**Keywords:** ${config.keywords.join(", ")}`);
    }

    if (allTones.length > 0) {
      requirements.push(`**Tone/Style:** ${allTones.join(", ")}`);
    }

    if (allLengths.length > 0) {
      const lengthMap: Record<string, string> = {
        short: "3-6 characters",
        medium: "7-10 characters",
        long: "11+ characters"
      };
      const mappedLengths = allLengths.map(l => lengthMap[l] || l);
      requirements.push(`**Character Length:** ${mappedLengths.join(", ")} (e.g., short: Nike, Zen; medium: ZenFlow; long: PeacefulMind)`);
    }

    if (allWordCounts.length > 0) {
      const wordCountMap: Record<string, string> = {
        short: "1 word (single-word names)",
        medium: "1-2 words (compact, memorable)",
        long: "2-3 words (more descriptive)"
      };
      const mappedWordCounts = allWordCounts.map(w => wordCountMap[w] || w);
      requirements.push(`**Word Count:** ${mappedWordCounts.join(", ")}`);
    }

    if (config.language) {
      const langMap: Record<string, string> = {
        english: "English",
        russian: "Russian",
        both: "Both English and Russian"
      };
      requirements.push(`**Language:** ${langMap[config.language] || config.language}`);
    }

    requirements.push(`**Creativity Level:** ${creativityMap[config.creativity || "high"]}`);

    prompt += requirements.join("\n");

    if (config.customInstructions?.trim()) {
      prompt += `\n\n**Additional Instructions:** ${config.customInstructions}`;
    }

    // Add target audience and positioning if available
    if (config.targetAudience?.trim()) {
      prompt += `\n\n**Target Audience:** ${config.targetAudience}`;
    }

    if (config.positioning?.trim()) {
      prompt += `\n\n**Brand Positioning:** ${config.positioning}`;
    }

    if (config.competitors && config.competitors.length > 0) {
      prompt += `\n\n**Competitors to differentiate from:** ${config.competitors.join(", ")}`;
    }

    if (config.inspirationBrands && config.inspirationBrands.length > 0) {
      prompt += `\n\n**Inspiration brands (style reference):** ${config.inspirationBrands.join(", ")}`;
    }

    if (config.restrictions?.trim()) {
      prompt += `\n\n**Restrictions/Taboos:** ${config.restrictions}`;
    }

    if (config.geographicMarket?.trim()) {
      prompt += `\n\n**Geographic Market:** ${config.geographicMarket}`;
    }

    // Add user feedback section if there are liked or disliked names AND feedback is enabled
    if (includeFeedback && (likedNames.length > 0 || dislikedNames.length > 0)) {
      prompt += `\n\n---

# USER FEEDBACK & CRITICAL REQUIREMENTS

Based on previous generations, the user has provided feedback. This is CRITICAL - you MUST follow these rules:
`;

      if (dislikedNames.length > 0) {
        // Extract words and roots from disliked names
        const dislikedWords = new Set<string>();
        dislikedNames.forEach(name => {
          // Split by common separators and spaces
          const words = name.name.split(/[\s\-_\.]+/);
          words.forEach(word => {
            dislikedWords.add(word.toLowerCase());
            // Add root (first 4+ chars for longer words)
            if (word.length > 5) {
              dislikedWords.add(word.substring(0, Math.floor(word.length * 0.6)).toLowerCase());
            }
          });
        });

        prompt += `\n**❌ DISLIKED Names - STRICTLY FORBIDDEN:**\n`;
        dislikedNames.forEach(name => {
          prompt += `• ${name.name} - ${name.rationale || 'User disliked this'}\n`;
        });
        
        prompt += `\n**CRITICAL RULES FOR DISLIKED NAMES:**
1. DO NOT use any of the disliked names above, even with modifications
2. DO NOT use ANY words or roots from disliked names: ${Array.from(dislikedWords).join(", ")}
3. DO NOT create variations by adding/removing words to/from disliked names
4. DO NOT use similar sounding words or translations of disliked names
5. If a name was disliked, that entire word/root is now BANNED - explore completely different directions

`;
      }

      if (likedNames.length > 0) {
        prompt += `\n**✓ LIKED Names** (understand the PATTERN and style, but generate NEW names):\n`;
        likedNames.forEach(name => {
          prompt += `• ${name.name} (${name.type}) - ${name.rationale || 'User liked this style'}\n`;
        });
        
        prompt += `\n**How to use liked names:**
- Understand WHY these names work (tone, structure, feel, meaning)
- Generate NEW names that capture the same essence but are completely DIFFERENT words
- Match the linguistic style, word structure, and brand feeling
- DO NOT just copy or slightly modify the liked names

`;
      }

      prompt += `\n**GENERATION STRATEGY:**
- Each new generation should explore DIFFERENT semantic territories
- If previous names didn't work, dig DEEPER: new roots, associations, metaphors
- Go WIDER: explore adjacent concepts, lateral thinking
- NEVER repeat rejected patterns or words
- Treat each generation as a fresh creative exploration
`;
    }

    prompt += `

---

# OUTPUT FORMAT

For each name, provide the following in a structured format:

1. **Name:** The brand name
2. **Type:** One of: invented, compound, acronym, descriptive, or foreign
3. **Rationale:** A short, strategic explanation that clarifies the intended brand feeling, positioning, and meaning

Present all ${settings.resultsPerGeneration} names in a numbered list.

---

# CRITICAL REQUIREMENTS

${config.language === 'russian' ? `
**RUSSIAN LANGUAGE GENERATION RULES:**
- Generate names in RUSSIAN language (Cyrillic script)
- Create INVENTED words by modifying Russian roots (like "Яндекс" from "индекс", "Озон" from "ozone")
- Use creative morphology: prefixes, suffixes, blending (like "ВкусВилл", "Магнит", "Тинькофф")
- Transform existing Russian words into brand names through: truncation, combination, phonetic play
- DO NOT just translate English words - create authentic Russian brand names
- Examples of good Russian invented names: Сбер, Билайн, МегаФон, Ситилинк, Пятёрочка
- AVOID simple English transliterations (like "Поинт" for "Point")
- Think like Russian brand naming: short, memorable, culturally resonant
` : config.language === 'both' ? `
**MULTILINGUAL GENERATION:**
- Create names that work in BOTH English and Russian
- Consider pronunciation, spelling, and cultural meaning in both languages
- Aim for names that are easy to pronounce and remember in both markets
` : `
**ENGLISH LANGUAGE GENERATION:**
- Focus on English language names
- Ensure easy pronunciation and spelling for English speakers
- Consider international appeal and scalability
`}

**WORD COUNT ENFORCEMENT:**
${allWordCounts.map(wc => {
  if (wc === 'short') return '- For "1 word" requirement: Generate ONLY single-word names (e.g., "Nike", "Apex", "Zenith")';
  if (wc === 'medium') return '- For "1-2 words" requirement: Generate names with maximum 2 words (e.g., "Blue Sky", "FastTrack")';
  if (wc === 'long') return '- For "2-3 words" requirement: Generate names with 2-3 words (e.g., "Peaceful Morning Yoga")';
  return `- For "${wc}" requirement: Follow this specification exactly`;
}).join('\n')}
- STRICTLY adhere to word count - do not add extra words in subsequent generations
- If user selected "1 word", NEVER generate 2-word names, even with feedback

**UNIQUENESS & DIVERSITY:**
- Every name must be COMPLETELY UNIQUE - no repeats from previous generations
- Check your output: if you see duplicate names, replace them immediately
- Explore diverse creative directions: different roots, meanings, associations, metaphors
- Progressive depth: each generation should explore NEW semantic territories

**QUALITY STANDARDS:**
- Each name should feel like a real, professional brand
- Avoid awkward combinations, hard-to-pronounce sequences
- Ensure names are memorable, distinctive, and appropriate for the industry
- Consider trademark-ability and domain availability potential`;

    return prompt;
  };

  // Update prompt when config changes (only if not manually edited)
  useEffect(() => {
    if (!isPromptEdited) {
      setCustomPrompt(buildDefaultPrompt(useFeedback));
    }
  }, [currentTab?.config, currentTab?.generatedNames, settings.resultsPerGeneration, isPromptEdited, useFeedback]);

  // Reset prompt edit flag when step changes to regenerate with new config
  useEffect(() => {
    setIsPromptEdited(false);
  }, [currentTab?.step]);

  const handlePromptChange = (value: string) => {
    setCustomPrompt(value);
    setIsPromptEdited(true);
  };

  const resetPrompt = () => {
    setCustomPrompt(buildDefaultPrompt(useFeedback));
    setIsPromptEdited(false);
  };

  if (!currentTab) return null;

  const { config, generatedNames, isGenerating } = currentTab;

  const startGeneration = async () => {
    setError(null);
    updateCurrentTab({ isGenerating: true, generatedNames: [] });

    // Combine selected tones with custom tone
    const allTones = [...(config.tones || [])];
    if (config.customTone?.trim()) {
      allTones.push(config.customTone.trim());
    }

    // Combine selected lengths with custom length
    const allLengths = [...(config.lengths || [])];
    if (config.customLength?.trim()) {
      allLengths.push(config.customLength.trim());
    }

    try {
      // Generate the prompt with current feedback settings
      const promptToUse = isPromptEdited ? customPrompt : buildDefaultPrompt(useFeedback);
      
      const names = await generateNames(
        {
          industry: config.industry,
          keywords: config.keywords,
          tones: allTones,
          lengths: allLengths,
          language: config.language,
          creativity: config.creativity || "high",
          custom_instructions: config.customInstructions,
          full_prompt: promptToUse,
          count: settings.resultsPerGeneration,
        },
        settings.apiKey,
        settings.provider,
        settings.geminiModel
      );

      // Filter out duplicates from current tab only (project-specific)
      const allPreviousNames = new Set(
        currentTab.generatedNames.map(n => n.name.toLowerCase().trim())
      );
      
      const uniqueNames = names.filter(name => {
        const normalizedName = name.name.toLowerCase().trim();
        return !allPreviousNames.has(normalizedName);
      });

      // If we filtered out too many, keep original but warn
      const finalNames = uniqueNames.length > Math.floor(names.length * 0.3) ? uniqueNames : names;

      updateCurrentTab({ generatedNames: finalNames, isGenerating: false });
    } catch (error: any) {
      console.error("Generation failed:", error);
      const errorMessage = error?.message || t("errors.generationFailed");
      setError(`${t("errors.generationFailed")}: ${errorMessage}`);
      updateCurrentTab({ isGenerating: false });
    }
  };

  const toggleNameSelection = (index: number) => {
    const updated = [...generatedNames];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    updateCurrentTab({ generatedNames: updated });
  };

  const toggleLike = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...generatedNames];
    updated[index] = {
      ...updated[index],
      liked: !updated[index].liked,
      disliked: false, // Can't be both liked and disliked
    };
    updateCurrentTab({ generatedNames: updated });
  };

  const toggleDislike = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...generatedNames];
    updated[index] = {
      ...updated[index],
      disliked: !updated[index].disliked,
      liked: false, // Can't be both liked and disliked
    };
    updateCurrentTab({ generatedNames: updated });
  };

  const handleToggleFavorite = (item: GeneratedName, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(item);
    
    // Trigger animation
    setAnimatingFavorite(item.name);
    setTimeout(() => setAnimatingFavorite(null), 600);
  };

  const isFavorited = (name: string) => {
    return favoritedNames.some((n) => n.name === name);
  };

  const selectAll = () => {
    const updated = generatedNames.map((n) => ({ ...n, selected: true }));
    updateCurrentTab({ generatedNames: updated });
  };

  const deselectAll = () => {
    const updated = generatedNames.map((n) => ({ ...n, selected: false }));
    updateCurrentTab({ generatedNames: updated });
  };

  const selectedCount = generatedNames.filter((n) => n.selected).length;

  const handleNext = () => {
    if (selectedCount === 0) {
      setError(t("errors.noNamesSelected"));
      return;
    }
    setError(null);
    updateCurrentTab({ step: 3 });
  };

  const handleBack = () => {
    updateCurrentTab({ step: 1 });
  };

  const typeColors: Record<string, string> = {
    invented: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    compound: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    acronym: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    descriptive: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    foreign: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  };

  // Check if we have feedback to use (from current tab only)
  const allGeneratedNames = currentTab.generatedNames;
  const likedCount = allGeneratedNames.filter(n => n.liked).length;
  const dislikedCount = allGeneratedNames.filter(n => n.disliked).length;
  const hasFeedback = likedCount > 0 || dislikedCount > 0;

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Indicator */}
      {hasFeedback && generatedNames.length === 0 && !isGenerating && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {t("feedback.title")}
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseFeedback(true)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                      useFeedback
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {t("feedback.useNotes")}
                  </button>
                  <button
                    onClick={() => setUseFeedback(false)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                      !useFeedback
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {t("feedback.cleanGeneration")}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {useFeedback ? t("feedback.description") : t("feedback.cleanDescription")}
              </p>
              {useFeedback && (
                <div className="flex gap-3 text-xs">
                  {likedCount > 0 && (
                    <span className="text-green-600 dark:text-green-400">
                      👍 {t("feedback.likedCount", { count: likedCount })}
                    </span>
                  )}
                  {dislikedCount > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      👎 {t("feedback.dislikedCount", { count: dislikedCount })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generation Controls */}
      {generatedNames.length === 0 && !isGenerating && (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center pt-6">
            <div className="w-20 h-20 mx-auto mb-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("prompt.readyToGenerate")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t("prompt.reviewPrompt")}
            </p>
          </div>

          {/* Prompt Preview Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">{t("prompt.title")}</span>
                {isPromptEdited && (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                    {t("prompt.edited")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  {showPrompt ? t("prompt.hide") : t("prompt.show")}
                  <svg className={`w-4 h-4 transition-transform ${showPrompt ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isPromptEdited && (
                  <button
                    onClick={resetPrompt}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {t("prompt.reset")}
                  </button>
                )}
              </div>
            </div>
            
            {showPrompt && (
              <div className="p-4">
                <textarea
                  value={customPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder={t("prompt.placeholder")}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("prompt.editHint")}
                </p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="text-center pb-6">
            <button
              onClick={startGeneration}
              className="px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors text-lg"
            >
              {t("actions.generate")}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-4 border-purple-200 dark:border-purple-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t("actions.generating")}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Creating unique brand names using AI...
          </p>
        </div>
      )}

      {/* Generated Names Grid */}
      {generatedNames.length > 0 && !isGenerating && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("names.generated")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("names.count", { count: generatedNames.length })} • {t("names.selected", { count: selectedCount })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              >
                {t("actions.selectAll")}
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t("actions.deselectAll")}
              </button>
              {hasFeedback ? (
                <>
                  <button
                    onClick={() => {
                      setUseFeedback(true);
                      startGeneration();
                    }}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                    title={t("feedback.useNotesHint")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t("actions.regenerateWithNotes")}
                  </button>
                  <button
                    onClick={() => {
                      setUseFeedback(false);
                      startGeneration();
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title={t("feedback.cleanHint")}
                  >
                    {t("actions.regenerate")}
                  </button>
                </>
              ) : (
                <button
                  onClick={startGeneration}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t("actions.regenerate")}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {generatedNames.map((item, index) => (
              <div
                key={index}
                onClick={() => toggleNameSelection(index)}
                className={`p-4 rounded-xl text-left transition-all cursor-pointer ${
                  item.selected
                    ? "bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500"
                    : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-gray-900 dark:text-white flex-1">
                    {item.name}
                  </div>
                  {item.selected && (
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {item.rationale && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {item.rationale}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${typeColors[item.type]}`}>
                    {t(`names.types.${item.type}`)}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* Like Button */}
                    <button
                      onClick={(e) => toggleLike(index, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.liked
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                      title={t("actions.like")}
                    >
                      <svg className="w-4 h-4" fill={item.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                      </svg>
                    </button>
                    {/* Dislike Button */}
                    <button
                      onClick={(e) => toggleDislike(index, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.disliked
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : "text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                      title={t("actions.dislike")}
                    >
                      <svg className="w-4 h-4" fill={item.disliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: "rotate(180deg)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                      </svg>
                    </button>
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(item, e)}
                      className={`p-1.5 rounded-lg transition-all relative ${
                        isFavorited(item.name)
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                          : "text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                      } ${animatingFavorite === item.name ? "animate-bounce" : ""}`}
                      title={t("actions.favorite")}
                    >
                      <svg 
                        className={`w-4 h-4 transition-all ${
                          animatingFavorite === item.name ? "scale-125" : ""
                        }`} 
                        fill={isFavorited(item.name) ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      {/* Sparkle effect on favorite */}
                      {animatingFavorite === item.name && isFavorited(item.name) && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="absolute w-8 h-8 bg-yellow-400 rounded-full opacity-75 animate-ping"></span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={handleBack}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("actions.back")}
        </button>
        
        {generatedNames.length > 0 && (
          <button
            onClick={handleNext}
            disabled={selectedCount === 0}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {t("actions.next")}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
