import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store";
import MKTUSelector from "../MKTUSelector";

interface MKTUClass {
  number: number;
  name_ru: string;
  name_en: string;
  keywords: string[];
}

interface ConfigureStepProps {
  onOpenSettings?: () => void;
}

export default function ConfigureStep({ onOpenSettings }: ConfigureStepProps) {
  const { t, i18n } = useTranslation();
  const { getCurrentTab, updateCurrentTab, settings } = useAppStore();
  const currentTab = getCurrentTab();
  const [mktuClasses, setMktuClasses] = useState<MKTUClass[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<{ industry?: string; keywords?: string; apiKey?: string }>({});

  useEffect(() => {
    // Load MKTU classes from bundled JSON
    const basePath = import.meta.env.BASE_URL || '/';
    fetch(`${basePath}python-sidecar/mktu_data.json`)
      .then((res) => res.json())
      .then((data) => setMktuClasses(data.classes))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (currentTab) {
      setKeywordsInput(currentTab.config.keywords.join(", "));
    }
  }, [currentTab?.id]);

  if (!currentTab) return null;

  const { config } = currentTab;

  const updateConfig = (updates: Partial<typeof config>) => {
    updateCurrentTab({ config: { ...config, ...updates } });
  };

  const handleKeywordsChange = (value: string) => {
    setKeywordsInput(value);
    const keywords = value.split(",").map((k) => k.trim()).filter(Boolean);
    updateConfig({ keywords });
  };

  const handleNext = () => {
    const newErrors: typeof errors = {};
    
    if (!settings.apiKey) {
      newErrors.apiKey = t("errors.noApiKey");
    }
    if (!config.industry?.trim()) {
      newErrors.industry = t("errors.noIndustry");
    }
    if (config.keywords.length === 0) {
      newErrors.keywords = t("errors.noKeywords");
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    
    updateCurrentTab({ step: 2 });
  };

  const toggleTone = (tone: string) => {
    const current = config.tones || [];
    if (current.includes(tone)) {
      updateConfig({ tones: current.filter((t) => t !== tone) });
    } else {
      updateConfig({ tones: [...current, tone] });
    }
  };

  const toggleLength = (length: string) => {
    const current = config.lengths || [];
    if (current.includes(length)) {
      updateConfig({ lengths: current.filter((l) => l !== length) });
    } else {
      updateConfig({ lengths: [...current, length] });
    }
  };

  const toggleWordCount = (wordCount: string) => {
    const current = config.wordCounts || [];
    if (current.includes(wordCount)) {
      updateConfig({ wordCounts: current.filter((w) => w !== wordCount) });
    } else {
      updateConfig({ wordCounts: [...current, wordCount] });
    }
  };

  const tones = ["professional", "playful", "techy", "luxurious", "minimal", "bold"];
  const lengths = ["short", "medium", "long"];
  const wordCounts = ["short", "medium", "long"];
  const languages = ["english", "russian", "both"];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* API Key Error Banner */}
      {errors.apiKey && onOpenSettings && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                {errors.apiKey}
              </p>
              <button
                onClick={onOpenSettings}
                className="text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
              >
                {t("setup.configure")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.industry")} <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.industryTooltip")}
        </p>
        <input
          type="text"
          value={config.industry}
          onChange={(e) => {
            updateConfig({ industry: e.target.value });
            if (errors.industry) setErrors({ ...errors, industry: undefined });
          }}
          placeholder={t("config.industryPlaceholder")}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.industry 
              ? "border-red-500 focus:ring-red-500" 
              : "border-gray-300 dark:border-gray-600 focus:ring-purple-500"
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:border-transparent transition-colors`}
        />
        {errors.industry && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.industry}</p>
        )}
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.keywords")} <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.keywordsTooltip")}
        </p>
        <input
          type="text"
          value={keywordsInput}
          onChange={(e) => {
            handleKeywordsChange(e.target.value);
            if (errors.keywords) setErrors({ ...errors, keywords: undefined });
          }}
          placeholder={t("config.keywordsPlaceholder")}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.keywords 
              ? "border-red-500 focus:ring-red-500" 
              : "border-gray-300 dark:border-gray-600 focus:ring-purple-500"
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:border-transparent transition-colors`}
        />
        {errors.keywords && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.keywords}</p>
        )}
      </div>

      {/* Tone - Multi-select with custom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.tone")} 
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
            ({t("config.selectMultiple")})
          </span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.toneTooltip")}
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => toggleTone(tone)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                (config.tones || []).includes(tone)
                  ? "bg-purple-600 text-white shadow-md transform scale-105"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t(`config.tones.${tone}`)}
            </button>
          ))}
        </div>
        {(config.tones || []).length > 0 && (
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
            ✓ {(config.tones || []).length} {t("config.selected")}
          </p>
        )}
        <input
          type="text"
          value={config.customTone || ""}
          onChange={(e) => updateConfig({ customTone: e.target.value })}
          placeholder={t("config.customTonePlaceholder")}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-sm"
        />
      </div>

      {/* Collapsible Advanced Options */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left group"
        >
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("config.advancedOptions")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("config.advancedOptionsDesc")}
            </p>
          </div>
          <svg 
            className={`w-6 h-6 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-6">
            {/* Character Length - Multi-select with custom */}
            <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.charLength")} <span className="text-gray-400 font-normal">({t("config.selectMultiple")})</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.charLengthTooltip")}
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {lengths.map((length) => (
            <button
              key={length}
              onClick={() => toggleLength(length)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (config.lengths || []).includes(length)
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t(`config.charLengths.${length}`)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={config.customLength || ""}
          onChange={(e) => updateConfig({ customLength: e.target.value })}
          placeholder={t("config.customCharLengthPlaceholder")}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-sm"
        />
      </div>

      {/* Word Count - Multi-select with custom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.wordCount")} <span className="text-gray-400 font-normal">({t("config.selectMultiple")})</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.wordCountTooltip")}
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {wordCounts.map((wordCount) => (
            <button
              key={wordCount}
              onClick={() => toggleWordCount(wordCount)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (config.wordCounts || []).includes(wordCount)
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t(`config.wordCounts.${wordCount}`)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={config.customWordCount || ""}
          onChange={(e) => updateConfig({ customWordCount: e.target.value })}
          placeholder={t("config.customWordCountPlaceholder")}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-sm"
        />
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.language")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.languageTooltip")}
        </p>
        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => updateConfig({ language: lang })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                config.language === lang
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t(`config.languages.${lang}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Creativity / Randomness */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.creativity")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("config.creativityTooltip")}
        </p>
        <div className="space-y-2">
          {(["low", "medium", "high"] as const).map((level) => (
            <button
              key={level}
              onClick={() => updateConfig({ creativity: level })}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                config.creativity === level
                  ? "bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-500"
                  : "bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  config.creativity === level
                    ? "border-purple-500 bg-purple-500"
                    : "border-gray-400 dark:border-gray-500"
                }`}>
                  {config.creativity === level && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className={`font-medium ${
                    config.creativity === level
                      ? "text-purple-700 dark:text-purple-300"
                      : "text-gray-900 dark:text-white"
                  }`}>
                    {t(`config.creativityLevels.${level}`)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t(`config.creativityLevels.${level}Desc`)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

            {/* Custom Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("config.customInstructions")}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t("config.customInstructionsTooltip")}
              </p>
              <textarea
                value={config.customInstructions}
                onChange={(e) => updateConfig({ customInstructions: e.target.value })}
                placeholder={t("config.customInstructionsPlaceholder")}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
              />
            </div>

            {/* MKTU Classes */}
            <MKTUSelector
              classes={mktuClasses}
              selectedClasses={config.mktuClasses}
              onSelectionChange={(mktuClasses) => updateConfig({ mktuClasses })}
              industry={config.industry}
              language={i18n.language as "en" | "ru"}
            />
          </div>
        )}
      </div>

      {/* Next Button - Improved hierarchy */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNext}
          disabled={!config.industry || config.keywords.length === 0}
          className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center gap-2"
        >
          {t("actions.continueToGenerate")}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
