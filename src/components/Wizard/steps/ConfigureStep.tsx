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

export default function ConfigureStep() {
  const { t, i18n } = useTranslation();
  const { getCurrentTab, updateCurrentTab, settings } = useAppStore();
  const currentTab = getCurrentTab();
  const [mktuClasses, setMktuClasses] = useState<MKTUClass[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");

  useEffect(() => {
    // Load MKTU classes from bundled JSON
    fetch("/python-sidecar/mktu_data.json")
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
    if (!settings.apiKey) {
      alert(t("errors.noApiKey"));
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.industry")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.industryTooltip")}
        </p>
        <input
          type="text"
          value={config.industry}
          onChange={(e) => updateConfig({ industry: e.target.value })}
          placeholder={t("config.industryPlaceholder")}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.keywords")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.keywordsTooltip")}
        </p>
        <input
          type="text"
          value={keywordsInput}
          onChange={(e) => handleKeywordsChange(e.target.value)}
          placeholder={t("config.keywordsPlaceholder")}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Tone - Multi-select with custom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.tone")} <span className="text-gray-400 font-normal">({t("config.selectMultiple")})</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.toneTooltip")}
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => toggleTone(tone)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (config.tones || []).includes(tone)
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t(`config.tones.${tone}`)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={config.customTone || ""}
          onChange={(e) => updateConfig({ customTone: e.target.value })}
          placeholder={t("config.customTonePlaceholder")}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-sm"
        />
      </div>

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

      {/* Next Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={!config.industry || config.keywords.length === 0}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {t("actions.next")}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
