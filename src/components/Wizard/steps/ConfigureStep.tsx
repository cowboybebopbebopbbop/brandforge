import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore, NameCategory4, CompanyStrategy, CommunicationChannel, AbstractionLevel } from "../../../store";
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
  const [competitorsInput, setCompetitorsInput] = useState("");
  const [inspirationBrandsInput, setInspirationBrandsInput] = useState("");
  const [audienceWantsInput, setAudienceWantsInput] = useState("");
  const [audienceFearsInput, setAudienceFearsInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<{ industry?: string; keywords?: string; apiKey?: string; northStar?: string }>({});
  const [importSuccess, setImportSuccess] = useState(false);

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
      setKeywordsInput(currentTab.config.keywords?.join(", ") || "");
      setCompetitorsInput(currentTab.config.competitors?.join(", ") || "");
      setInspirationBrandsInput(currentTab.config.inspirationBrands?.join(", ") || "");
      setAudienceWantsInput(currentTab.config.audienceWants?.join(", ") || "");
      setAudienceFearsInput(currentTab.config.audienceFears?.join(", ") || "");
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

  const handleCompetitorsChange = (value: string) => {
    setCompetitorsInput(value);
    const competitors = value.split(",").map((k) => k.trim()).filter(Boolean);
    updateConfig({ competitors });
  };

  const handleInspirationBrandsChange = (value: string) => {
    setInspirationBrandsInput(value);
    const inspirationBrands = value.split(",").map((k) => k.trim()).filter(Boolean);
    updateConfig({ inspirationBrands });
  };

  const handleAudienceWantsChange = (value: string) => {
    setAudienceWantsInput(value);
    const audienceWants = value.split(",").map((k) => k.trim()).filter(Boolean);
    updateConfig({ audienceWants });
  };

  const handleAudienceFearsChange = (value: string) => {
    setAudienceFearsInput(value);
    const audienceFears = value.split(",").map((k) => k.trim()).filter(Boolean);
    updateConfig({ audienceFears });
  };

  const handleImportBrief = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const briefData = JSON.parse(e.target?.result as string);
        
        // Update config with imported data
        updateConfig({
          industry: briefData.industry || config.industry,
          keywords: briefData.keywords || config.keywords,
          tones: briefData.tones || config.tones,
          customTone: briefData.customTone || config.customTone,
          lengths: briefData.lengths || config.lengths,
          customLength: briefData.customLength || config.customLength,
          wordCounts: briefData.wordCounts || config.wordCounts,
          customWordCount: briefData.customWordCount || config.customWordCount,
          language: briefData.language || config.language,
          creativity: briefData.creativity || config.creativity,
          customInstructions: briefData.customInstructions || config.customInstructions,
          mktuClasses: briefData.mktuClasses || config.mktuClasses,
          targetAudience: briefData.targetAudience || config.targetAudience,
          positioning: briefData.positioning || config.positioning,
          competitors: briefData.competitors || config.competitors,
          inspirationBrands: briefData.inspirationBrands || config.inspirationBrands,
          restrictions: briefData.restrictions || config.restrictions,
          geographicMarket: briefData.geographicMarket || config.geographicMarket,
        });

        // Update input fields
        if (briefData.keywords) setKeywordsInput(briefData.keywords.join(", "));
        if (briefData.competitors) setCompetitorsInput(briefData.competitors.join(", "));
        if (briefData.inspirationBrands) setInspirationBrandsInput(briefData.inspirationBrands.join(", "));

        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (error) {
        console.error("Failed to parse brief file:", error);
        alert(t("errors.briefImportFailed"));
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    event.target.value = "";
  };

  const handleExportBrief = () => {
    const briefData = {
      industry: config.industry,
      keywords: config.keywords,
      tones: config.tones,
      customTone: config.customTone,
      lengths: config.lengths,
      customLength: config.customLength,
      wordCounts: config.wordCounts,
      customWordCount: config.customWordCount,
      language: config.language,
      creativity: config.creativity,
      customInstructions: config.customInstructions,
      mktuClasses: config.mktuClasses,
      targetAudience: config.targetAudience,
      positioning: config.positioning,
      competitors: config.competitors,
      inspirationBrands: config.inspirationBrands,
      restrictions: config.restrictions,
      geographicMarket: config.geographicMarket,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(briefData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `brandforge-brief-${currentTab.name.replace(/\s+/g, "-")}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    // PRD FR2: North Star is required
    if (!config.northStar?.trim()) {
      newErrors.northStar = t("errors.noNorthStar");
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
      {/* Import/Export Buttons */}
      <div className="flex items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("config.briefTitle")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("config.briefSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportBrief}
              className="hidden"
            />
            <div className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {t("actions.importBrief")}
            </div>
          </label>
          <button
            onClick={handleExportBrief}
            className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            {t("actions.exportBrief")}
          </button>
        </div>
      </div>

      {/* Import Success Message */}
      {importSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {t("success.briefImported")}
            </p>
          </div>
        </div>
      )}

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

      {/* Target Audience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.targetAudience")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.targetAudienceTooltip")}
        </p>
        <input
          type="text"
          value={config.targetAudience}
          onChange={(e) => updateConfig({ targetAudience: e.target.value })}
          placeholder={t("config.targetAudiencePlaceholder")}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Positioning */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.positioning")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.positioningTooltip")}
        </p>
        <textarea
          value={config.positioning}
          onChange={(e) => updateConfig({ positioning: e.target.value })}
          placeholder={t("config.positioningPlaceholder")}
          rows={2}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
        />
      </div>

      {/* PRD S2: North Star (Required) */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border-2 border-purple-200 dark:border-purple-800">
        <label className="block text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">
          {t("config.northStar")} <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
          {t("config.northStarTooltip")}
        </p>
        <textarea
          value={config.northStar || ""}
          onChange={(e) => {
            updateConfig({ northStar: e.target.value });
            if (errors.northStar) setErrors({ ...errors, northStar: undefined });
          }}
          placeholder={t("config.northStarPlaceholder")}
          rows={2}
          className={`w-full px-4 py-3 rounded-lg border ${
            errors.northStar 
              ? "border-red-500 focus:ring-red-500" 
              : "border-purple-300 dark:border-purple-600 focus:ring-purple-500"
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:border-transparent transition-colors resize-none`}
        />
        {errors.northStar && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.northStar}</p>
        )}
      </div>

      {/* PRD S2: Opposition Slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.oppositionSlider")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("config.oppositionSliderTooltip")}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400 w-24">{t("config.opposition.similar")}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={config.oppositionSlider || 50}
            onChange={(e) => updateConfig({ oppositionSlider: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400 w-24 text-right">{t("config.opposition.different")}</span>
        </div>
        <div className="text-center mt-2">
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
            {config.oppositionSlider || 50}%
          </span>
        </div>
      </div>

      {/* PRD S2: 4 Name Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.nameCategories")} <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("config.nameCategoriesInfo")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["informing", "image_informing", "image", "abstract_constructed"] as NameCategory4[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                const current = config.nameCategories || [];
                if (current.includes(cat)) {
                  if (current.length > 1) {
                    updateConfig({ nameCategories: current.filter(c => c !== cat) });
                  }
                } else {
                  updateConfig({ nameCategories: [...current, cat] });
                }
              }}
              className={`p-3 rounded-xl text-left transition-all border-2 ${
                (config.nameCategories || []).includes(cat)
                  ? "bg-purple-50 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300"
                  : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  (config.nameCategories || []).includes(cat) ? "border-purple-500 bg-purple-500" : "border-gray-400"
                }`}>
                  {(config.nameCategories || []).includes(cat) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">{t(`config.categories.${cat}`)}</div>
                  <div className="text-xs opacity-75">{t(`config.categories.${cat}Desc`)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PRD S2: Company Strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.companyStrategy")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("config.companyStrategyTooltip")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["discounter", "professional", "innovator", "star"] as CompanyStrategy[]).map((strategy) => (
            <button
              key={strategy}
              onClick={() => updateConfig({ companyStrategy: strategy })}
              className={`p-3 rounded-xl text-left transition-all border-2 ${
                config.companyStrategy === strategy
                  ? "bg-purple-50 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300"
                  : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  config.companyStrategy === strategy ? "border-purple-500 bg-purple-500" : "border-gray-400"
                }`}>
                  {config.companyStrategy === strategy && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">{t(`config.strategies.${strategy}`)}</div>
                  <div className="text-xs opacity-75">{t(`config.strategies.${strategy}Desc`)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PRD S2: Audience Values */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("config.audienceWants")}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("config.audienceWantsTooltip")}
          </p>
          <input
            type="text"
            value={audienceWantsInput}
            onChange={(e) => handleAudienceWantsChange(e.target.value)}
            placeholder={t("config.audienceWantsPlaceholder")}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("config.audienceFears")}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("config.audienceFearsTooltip")}
          </p>
          <input
            type="text"
            value={audienceFearsInput}
            onChange={(e) => handleAudienceFearsChange(e.target.value)}
            placeholder={t("config.audienceFearsPlaceholder")}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* PRD S2: Communication Channels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.communicationChannels")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.communicationChannelsTooltip")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["phone-first", "sales", "documents", "international"] as CommunicationChannel[]).map((channel) => (
            <button
              key={channel}
              onClick={() => {
                const current = config.communicationChannels || [];
                if (current.includes(channel)) {
                  updateConfig({ 
                    communicationChannels: current.filter(c => c !== channel),
                    isPhoneFirst: channel === "phone-first" ? false : config.isPhoneFirst
                  });
                } else {
                  updateConfig({ 
                    communicationChannels: [...current, channel],
                    isPhoneFirst: channel === "phone-first" ? true : config.isPhoneFirst
                  });
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                (config.communicationChannels || []).includes(channel)
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t(`config.channels.${channel}`)}
            </button>
          ))}
        </div>
      </div>

      {/* PRD S2: Abstraction Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.abstractionLevel")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("config.abstractionLevelTooltip")}
        </p>
        <div className="flex items-center gap-2">
          {(["product", "capabilities", "beliefs", "mission"] as AbstractionLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => updateConfig({ abstractionLevel: level })}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                config.abstractionLevel === level
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t(`config.abstraction.${level}`)}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-1 px-2">
          <span className="text-xs text-gray-400">{t("config.abstraction.concrete")}</span>
          <span className="text-xs text-gray-400">{t("config.abstraction.abstract")}</span>
        </div>
      </div>

      {/* PRD S2: Corporate Naming Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("config.isCorporate")}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("config.isCorporateTooltip")}
          </p>
        </div>
        <button
          onClick={() => updateConfig({ isCorporate: !config.isCorporate })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.isCorporate ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.isCorporate ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Competitors */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.competitors")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.competitorsTooltip")}
        </p>
        <input
          type="text"
          value={competitorsInput}
          onChange={(e) => handleCompetitorsChange(e.target.value)}
          placeholder={t("config.competitorsPlaceholder")}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Inspiration Brands */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t("config.inspirationBrands")}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t("config.inspirationBrandsTooltip")}
        </p>
        <input
          type="text"
          value={inspirationBrandsInput}
          onChange={(e) => handleInspirationBrandsChange(e.target.value)}
          placeholder={t("config.inspirationBrandsPlaceholder")}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
        />
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

            {/* Restrictions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("config.restrictions")}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t("config.restrictionsTooltip")}
              </p>
              <textarea
                value={config.restrictions}
                onChange={(e) => updateConfig({ restrictions: e.target.value })}
                placeholder={t("config.restrictionsPlaceholder")}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
              />
            </div>

            {/* Geographic Market */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("config.geographicMarket")}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t("config.geographicMarketTooltip")}
              </p>
              <input
                type="text"
                value={config.geographicMarket}
                onChange={(e) => updateConfig({ geographicMarket: e.target.value })}
                placeholder={t("config.geographicMarketPlaceholder")}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
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
          disabled={!config.industry || config.keywords.length === 0 || !config.northStar?.trim()}
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
