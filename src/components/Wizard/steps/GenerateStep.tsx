import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store";
import { generateNames, generateLearningSummary } from "../../../api";
import type { GeneratedName } from "../../../store";

export default function GenerateStep() {
  const { t } = useTranslation();
  const { getCurrentTab, updateCurrentTab, settings, toggleFavorite, getFavoritesForCurrentProject } = useAppStore();
  const currentTab = getCurrentTab();
  const favoritedNames = getFavoritesForCurrentProject();
  const [showPrompt, setShowPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isPromptEdited, setIsPromptEdited] = useState(false);
  const [useFeedback, setUseFeedback] = useState(true);
  const [animatingFavorite, setAnimatingFavorite] = useState<string | null>(null);
  const [expandedRationale, setExpandedRationale] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build the default prompt from config
  const buildDefaultPrompt = (includeFeedback: boolean = true) => {
    if (!currentTab) return "";
    
    const { config } = currentTab;
    
    // Collect feedback from CURRENT tab only (project-specific feedback)
    const allGeneratedNames = currentTab.generatedNames;
    const likedNames = allGeneratedNames.filter(n => n.liked);
    const dislikedNames = allGeneratedNames.filter(n => n.disliked);
    
    // Collect CLIENT feedback from favorites FOR CURRENT PROJECT ONLY
    const favoritesFromCurrentTab = getFavoritesForCurrentProject();
    const clientApproved = favoritesFromCurrentTab.filter(f => f.clientFeedback?.status === 'approved');
    const clientNeedsWork = favoritesFromCurrentTab.filter(f => f.clientFeedback?.status === 'needs-work');
    const clientRejected = favoritesFromCurrentTab.filter(f => f.clientFeedback?.status === 'rejected');
    
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

    // Build the complete prompt - SIMPLIFIED for JSON schema output
    let prompt = `You are an expert brand naming strategist. Generate exactly ${settings.resultsPerGeneration} unique, creative brand names.

# BRIEF
- Industry: ${config.industry || "business"}
- North Star: ${config.northStar || "Not specified"}

# NAMING GUIDELINES
- Create ACTUAL brand names (like "Nike", "Aura", "Zenith", "Lumina") - NOT category labels
- Each name must be unique and memorable
- Mix different naming styles: invented words, compounds, foreign words, etc.
- Use diverse linguistic roots - avoid repeating the same root across multiple names

${(currentTab.generationCount || 0) >= 5 ? `
⚠️ Generation ${currentTab.generationCount}: Focus on fresh vocabulary and complete rationales.
` : ''}

${currentTab.learningSummary ? `# LEARNED PATTERNS
${currentTab.learningSummary}
` : ''}
# SPECIFICATIONS
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

    // PRD S2: North Star (P1 - main positioning anchor)
    if (config.northStar?.trim()) {
      prompt += `\n\n---\n\n# 🎯 NORTH STAR (PRIMARY POSITIONING ANCHOR)\n\n"${config.northStar}"\n\n**This is the core positioning statement. ALL generated names MUST express this essence.**`;
    }

    // PRD S2: Opposition slider (P2 - market differentiation)
    const oppositionLevel = config.oppositionSlider || 50;
    prompt += `\n\n**Market Opposition Level:** ${oppositionLevel}% (${
      oppositionLevel < 30 ? "Similar to 80% of competitors - safe, conventional" :
      oppositionLevel < 70 ? "Balanced - distinctive but not alienating" :
      "Highly differentiated - bold, oppositional to market norms"
    })`;

    // PRD S2: 4 Name Categories (P3)
    if (config.nameCategories && config.nameCategories.length > 0) {
      const categoryDescriptions: Record<string, string> = {
        informing: "Informative & Non-emotional (describes what the company does directly)",
        image_informing: "Informative & Emotional (describes function with emotional resonance)",
        image: "Non-informative & Emotional (evokes feelings, uses metaphors)",
        abstract_constructed: "Abstract/Constructed (invented words, neologisms, no direct meaning)"
      };
      prompt += `\n\n**Required Name Categories (distribute names across these):**\n${
        config.nameCategories.map(cat => `- ${categoryDescriptions[cat]}`).join("\n")
      }`;
    }

    // PRD S2: Company Strategy
    if (config.companyStrategy) {
      const strategyDescriptions: Record<string, string> = {
        discounter: "Discounter - emphasize value, accessibility, mass-market appeal",
        professional: "Professional - emphasize expertise, reliability, trust",
        innovator: "Innovator - emphasize cutting-edge, disruption, novelty",
        star: "Star/Premium - emphasize luxury, exclusivity, aspiration"
      };
      prompt += `\n\n**Company Strategy:** ${strategyDescriptions[config.companyStrategy]}`;
    }

    // PRD S2: Audience values (wants/fears)
    if ((config.audienceWants && config.audienceWants.length > 0) || 
        (config.audienceFears && config.audienceFears.length > 0)) {
      prompt += `\n\n**Audience Values:**`;
      if (config.audienceWants && config.audienceWants.length > 0) {
        prompt += `\n- They WANT: ${config.audienceWants.join(", ")}`;
      }
      if (config.audienceFears && config.audienceFears.length > 0) {
        prompt += `\n- They FEAR: ${config.audienceFears.join(", ")}`;
      }
    }

    // PRD S2: Communication Channels & Phone-first
    if (config.communicationChannels && config.communicationChannels.length > 0) {
      prompt += `\n\n**Priority Communication Channels:** ${config.communicationChannels.join(", ")}`;
      if (config.isPhoneFirst || config.communicationChannels.includes("phone-first")) {
        prompt += `\n⚠️ **PHONE-FIRST REQUIREMENT:** Names must "write as they sound" - phonetically intuitive spelling for verbal communication.`;
      }
    }

    // PRD S2: Abstraction Level (P8)
    if (config.abstractionLevel) {
      const abstractionDescriptions: Record<string, string> = {
        product: "Product level - focus on what the product/service literally is",
        capabilities: "Capabilities level - focus on what the product enables",
        beliefs: "Beliefs level - focus on values and principles",
        mission: "Mission level - focus on higher purpose and vision"
      };
      prompt += `\n\n**Abstraction Level:** ${abstractionDescriptions[config.abstractionLevel]}`;
    }

    // PRD S2: Corporate naming requirements (P6)
    if (config.isCorporate) {
      prompt += `\n\n**⚠️ CORPORATE NAMING REQUIREMENTS:**\n- Names should be SHORT (preferably 1-2 syllables)\n- Names should be NEUTRAL (not industry-specific, can grow with company)\n- Names should be INTERNATIONAL (work across cultures and languages)\n- Avoid names that limit future expansion`;
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

    // PRD S2 FR4: Association Workshop - include seed ideas
    if (currentTab.associationWorkshop) {
      const workshop = currentTab.associationWorkshop;
      
      if (workshop.properties.length > 0) {
        prompt += `\n\n---\n\n# ASSOCIATION WORKSHOP DATA\n\n**Key Properties of the Offering:**\n${workshop.properties.map(p => `- ${p}`).join("\n")}`;
      }
      
      if (workshop.associations.length > 0) {
        prompt += `\n\n**Associations by Type:**`;
        const byType = {
          similarity: workshop.associations.filter(a => a.type === "similarity"),
          adjacency: workshop.associations.filter(a => a.type === "adjacency"),
          contrast: workshop.associations.filter(a => a.type === "contrast"),
        };
        
        if (byType.similarity.length > 0) {
          prompt += `\n\n*Similarity (what it's like):*\n${byType.similarity.map(a => `- ${a.property}: ${a.words.join(", ")}`).join("\n")}`;
        }
        if (byType.adjacency.length > 0) {
          prompt += `\n\n*Adjacency (what it's near/related to):*\n${byType.adjacency.map(a => `- ${a.property}: ${a.words.join(", ")}`).join("\n")}`;
        }
        if (byType.contrast.length > 0) {
          prompt += `\n\n*Contrast (what it's opposite to):*\n${byType.contrast.map(a => `- ${a.property}: ${a.words.join(", ")}`).join("\n")}`;
        }
      }
      
      if (workshop.crossedAssociations.length > 0) {
        const seedIdeas = workshop.crossedAssociations.map(c => c.seedIdea);
        prompt += `\n\n**💡 SEED IDEAS FROM WORKSHOP (use as INSPIRATION, not output):**\n${seedIdeas.map(s => `- "${s}"`).join("\n")}`;
        prompt += `\n\n**⚠️ IMPORTANT:** These seed ideas are the user's OWN creations. 
- DO NOT output these exact seed ideas as your generated names
- Use them as INSPIRATION to understand the creative direction
- Generate NEW names that capture the ESSENCE of these ideas but are DIFFERENT words
- The user already has these - they want NEW variations inspired by them`;
      }
    }

    // Add user feedback section if there are liked or disliked names AND feedback is enabled
    if (includeFeedback && (likedNames.length > 0 || dislikedNames.length > 0 || clientApproved.length > 0 || clientNeedsWork.length > 0 || clientRejected.length > 0)) {
      prompt += `\n\n---

# USER FEEDBACK

Based on previous feedback, follow these rules:
`;

      // CLIENT FEEDBACK SECTION (highest priority)
      if (clientApproved.length > 0 || clientNeedsWork.length > 0 || clientRejected.length > 0) {
        prompt += `\n## Client Feedback (Priority)\n`;

        if (clientApproved.length > 0) {
          prompt += `\nApproved names (understand the pattern, but use DIFFERENT roots):\n`;
          clientApproved.forEach(name => {
            prompt += `• ${name.name} - ${name.rationale || 'liked'}\n`;
          });
          prompt += `→ Generate NEW names with similar FEELING but completely DIFFERENT words.\n`;
        }

        if (clientNeedsWork.length > 0) {
          prompt += `\nNeeds refinement:\n`;
          clientNeedsWork.forEach(name => {
            const feedback = name.clientFeedback;
            prompt += `• ${name.name}${feedback?.comments ? `: "${feedback.comments}"` : ''}\n`;
          });
        }

        if (clientRejected.length > 0) {
          prompt += `\nRejected (avoid these directions):\n`;
          clientRejected.forEach(name => {
            prompt += `• ${name.name}\n`;
          });
        }
      }

      // DESIGNER'S INTERNAL FEEDBACK - simplified
      if (dislikedNames.length > 0) {
        prompt += `\n## Disliked Names (avoid these and similar):\n`;
        dislikedNames.forEach(name => {
          prompt += `• ${name.name}\n`;
        });
      }

      if (likedNames.length > 0) {
        prompt += `\n## Liked Names (create NEW names with similar feeling):\n`;
        likedNames.forEach(name => {
          prompt += `• ${name.name} - ${name.rationale || 'liked'}\n`;
        });
      }
    }

    prompt += `

# OUTPUT REQUIREMENTS

Generate exactly ${settings.resultsPerGeneration} brand names. For each name:
- **name**: A real brand name (like "Aura", "Zenith", "Lumina", "Cascade") - NOT a category or description
- **type**: invented, compound, acronym, descriptive, or foreign
- **category**: informing, image_informing, image, or abstract_constructed  
- **rationale**: 20-50 word explanation of meaning, positioning, and feeling it creates
${currentTab.strategy && currentTab.strategy.territories.length > 0 ? `- **territoryId**: One of ${currentTab.strategy.territories.map(t => `"${t.id}"`).join(', ')} (choose the territory that best matches each name)` : ''}

Example of a GOOD name object:
{"name": "Verdana", "type": "invented", "category": "image"${currentTab.strategy && currentTab.strategy.territories.length > 0 ? `, "territoryId": "${currentTab.strategy.territories[0].id}"` : ''}, "rationale": "Derived from 'verdant' meaning green and flourishing. Evokes growth, vitality, and natural wellness. The soft 'a' ending creates an approachable, feminine feel ideal for wellness brands."}

Example of BAD output (DO NOT DO THIS):
{"name": "Direct/Functional", ...} ← This is a category label, NOT a brand name
{"name": "Emotional/Aspirational", ...} ← This is a category label, NOT a brand name
{"rationale": "Comb"} ← This is a fragment, NOT a complete explanation

${(currentTab.generationCount || 0) >= 5 ? `Note: Generation ${currentTab.generationCount} - maintain quality rationales.` : ''}

---

# CRITICAL REQUIREMENTS

${config.language === 'russian' ? `
Language: Generate names in RUSSIAN (Cyrillic script). Create authentic Russian brand names like Сбер, Билайн, МегаФон.
` : config.language === 'both' ? `
Language: Names should work in BOTH English and Russian.
` : `
Language: Focus on English language names with international appeal.
`}

${allWordCounts.length > 0 ? `Word count: ${allWordCounts.map(wc => wc === 'short' ? '1 word' : wc === 'medium' ? '1-2 words' : '2-3 words').join(' or ')}.` : ''}

Quality standards:
- Each name must be unique and memorable
- Use diverse roots - avoid repeating same root more than twice
- Names should feel like real, professional brands
- Every rationale must be complete (20-50 words minimum) - no fragments like "Comb" or single words`;

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
        settings.geminiModel,
        settings.creativityTemperature // Pass temperature to API
      );

      // Filter out duplicates from current tab only (project-specific)
      const allPreviousNames = new Set(
        currentTab.generatedNames.map(n => n.name.toLowerCase().trim())
      );
      
      // Also filter out seed ideas from workshop
      const seedIdeas = new Set(
        (currentTab.associationWorkshop?.crossedAssociations || [])
          .map(c => c.seedIdea.toLowerCase().trim())
      );
      
      const uniqueNames = names.filter(name => {
        const normalizedName = name.name.toLowerCase().trim();
        // Filter duplicates AND seed ideas
        return !allPreviousNames.has(normalizedName) && !seedIdeas.has(normalizedName);
      });

      // ALWAYS use filtered names - seed ideas and duplicates must be excluded
      // Even if AI generated many duplicates, it's better to show fewer unique names
      let finalNames = uniqueNames;

      // Get liked names from current tab for filtering
      const likedNames = currentTab.generatedNames.filter((n: GeneratedName) => n.liked);

      // Filter out excessive root variations (Problem 2: too many variations of same root)
      // Only keep if user liked a name with this root
      const rootCounts = new Map<string, string[]>();
      finalNames.forEach(name => {
        const words = name.name.split(/[\s\-_\.]+/);
        words.forEach(word => {
          if (word.length >= 4) {
            const root = word.toLowerCase().substring(0, 4);
            if (!rootCounts.has(root)) {
              rootCounts.set(root, []);
            }
            rootCounts.get(root)!.push(name.name);
          }
        });
      });

      // Check if user liked any name with each root
      const likedRoots = new Set<string>();
      likedNames.forEach(name => {
        const words = name.name.split(/[\s\-_\.]+/);
        words.forEach(word => {
          if (word.length >= 4) {
            likedRoots.add(word.toLowerCase().substring(0, 4));
          }
        });
      });

      // Filter: keep max 3 variations per root, unless root is liked
      const keptNames = new Set<string>();
      rootCounts.forEach((names, root) => {
        const isLikedRoot = likedRoots.has(root);
        const limit = isLikedRoot ? names.length : 3; // No limit if liked
        names.slice(0, limit).forEach(n => keptNames.add(n));
      });

      finalNames = finalNames.filter(name => keptNames.has(name.name));

      // Filter Sanskrit/Yoga terms if generation count > 5 (Problem 3)
      if ((currentTab.generationCount || 0) >= 5) {
        const sanskritPattern = /\b(prana|shanti|nirvana|samyama|turiya|avahana|brahma|vayu|vajra|dhyana|samadhi|ananda|shiva|tejas|veda)\b/i;
        const beforeSanskritFilter = finalNames.length;
        finalNames = finalNames.filter(name => {
          const hasSanskrit = sanskritPattern.test(name.name.toLowerCase());
          // Only keep if explicitly liked by user
          if (hasSanskrit) {
            return likedNames.some(liked => 
              liked.name.toLowerCase() === name.name.toLowerCase()
            );
          }
          return true;
        });
        if (beforeSanskritFilter > finalNames.length) {
          console.log(`Filtered ${beforeSanskritFilter - finalNames.length} Sanskrit/Yoga terms after Gen ${currentTab.generationCount}`);
        }
      }

      // Increment generation count
      const newGenerationCount = (currentTab.generationCount || 0) + 1;
      updateCurrentTab({ 
        generatedNames: finalNames, 
        isGenerating: false,
        generationCount: newGenerationCount 
      });

      // Generate learning summary every 3 generations
      if (newGenerationCount % 3 === 0 && newGenerationCount > 0) {
        try {
          const summary = await generateLearningSummary(
            currentTab.generatedNames,
            getFavoritesForCurrentProject(),
            settings.apiKey,
            settings.provider,
            settings.geminiModel
          );
          updateCurrentTab({ learningSummary: summary });
        } catch (error) {
          console.error("Learning summary generation failed:", error);
          // Don't block user if summary fails
        }
      }
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
    updateCurrentTab({ step: 4 });
  };

  const handleBack = () => {
    updateCurrentTab({ step: 2 });
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

          {/* AI Learning Summary - show after 3+ generations if available */}
          {currentTab.learningSummary && (currentTab.generationCount || 0) >= 3 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    {t("generation.learningSummaryTitle")}
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                    {t("generation.learningSummaryDesc", { count: currentTab.generationCount })}
                  </p>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-blue-100 dark:border-blue-900">
                    {currentTab.learningSummary}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Semantic Field Exhaustion Warning - after 5+ generations */}
          {(currentTab.generationCount || 0) >= 5 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <span className="text-xl">💡</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    {t("generation.exhaustionTitle", { defaultValue: "Expand your creative territory?" })}
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                    {t("generation.exhaustionDescription", { 
                      defaultValue: `After ${currentTab.generationCount || 0} generations, the AI might be running out of fresh ideas in current semantic territories. Consider:`,
                      count: currentTab.generationCount || 0
                    })}
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 mb-3">
                    <li>• {t("generation.exhaustionTip1", { defaultValue: "Adding new keywords in Configure step" })}</li>
                    <li>• {t("generation.exhaustionTip2", { defaultValue: "Revisiting Workshop with fresh associations" })}</li>
                    <li>• {t("generation.exhaustionTip3", { defaultValue: "Trying a different abstraction level" })}</li>
                    <li>• {t("generation.exhaustionTip4", { defaultValue: "Changing the creativity level to 'High'" })}</li>
                  </ul>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateCurrentTab({ step: 1 })}
                      className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      {t("actions.backToConfigure", { defaultValue: "← Back to Configure" })}
                    </button>
                    <button
                      onClick={() => updateCurrentTab({ step: 2 })}
                      className="px-3 py-1.5 text-xs bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-100 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
                    >
                      {t("actions.backToWorkshop", { defaultValue: "← Back to Workshop" })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  <div className="mb-3">
                    <p 
                      className={`text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors ${
                        expandedRationale === index ? '' : 'line-clamp-2'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRationale(expandedRationale === index ? null : index);
                      }}
                      title={expandedRationale === index ? t('actions.collapse', { defaultValue: 'Click to collapse' }) : t('actions.expand', { defaultValue: 'Click to read full description' })}
                    >
                      {item.rationale}
                    </p>
                    {item.rationale.length > 100 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRationale(expandedRationale === index ? null : index);
                        }}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1"
                      >
                        {expandedRationale === index ? '↑ Collapse' : '↓ Read more'}
                      </button>
                    )}
                  </div>
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
