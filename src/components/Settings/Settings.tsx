import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore, Settings as SettingsType } from "../../store";

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const [saved, setSaved] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguageChange = (lang: "en" | "ru") => {
    updateSettings({ language: lang });
    i18n.changeLanguage(lang);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("settings.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* AI Provider */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {t("settings.provider")}
            </label>
            <select
              value={settings.provider}
              onChange={(e) => updateSettings({ provider: e.target.value as SettingsType["provider"] })}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {t("settings.apiKey")}
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value.trim() })}
              placeholder={t("settings.apiKeyPlaceholder")}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Gemini Model Selection */}
          {settings.provider === "gemini" && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                {t("settings.geminiModel")}
              </label>
              <select
                value={settings.geminiModel || "gemini-2.0-flash-exp"}
                onChange={(e) => updateSettings({ geminiModel: e.target.value as SettingsType["geminiModel"] })}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="gemini-2.0-flash-exp">{t("settings.models.gemini-2.0-flash-exp")}</option>
                <option value="gemini-1.5-flash">{t("settings.models.gemini-1.5-flash")}</option>
                <option value="gemini-1.5-pro">{t("settings.models.gemini-1.5-pro")}</option>
                <option value="gemini-1.0-pro">{t("settings.models.gemini-1.0-pro")}</option>
              </select>
            </div>
          )}

          {/* Interface Language */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {t("settings.language")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLanguageChange("en")}
                className={`px-3 py-2.5 text-sm rounded-lg font-medium transition-all ${
                  settings.language === "en"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750"
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => handleLanguageChange("ru")}
                className={`px-3 py-2.5 text-sm rounded-lg font-medium transition-all ${
                  settings.language === "ru"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750"
                }`}
              >
                🇷🇺 Русский
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {t("settings.theme")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme })}
                  className={`px-3 py-2.5 text-sm rounded-lg font-medium transition-all capitalize ${
                    settings.theme === theme
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750"
                  }`}
                >
                  {t(`settings.themes.${theme}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {t("settings.resultsCount")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([50, 100, 150] as const).map((count) => (
                <button
                  key={count}
                  onClick={() => updateSettings({ resultsPerGeneration: count })}
                  className={`px-3 py-2.5 text-sm rounded-lg font-medium transition-all ${
                    settings.resultsPerGeneration === count
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Creativity Temperature */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
              {t("settings.creativityTemperature", { defaultValue: "AI Creativity Level" })}
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              {t("settings.temperatureDesc", { defaultValue: "Higher values make output more random and creative. Lower values focus on safe, predictable names." })}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: 0.3, label: "Low", emoji: "🎯" },
                { value: 0.5, label: "Balanced", emoji: "⚖️" },
                { value: 0.8, label: "High", emoji: "🎨" },
                { value: 1.0, label: "Max", emoji: "🚀" }
              ] as const).map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ creativityTemperature: value })}
                  className={`px-2 py-2.5 rounded-lg text-sm font-medium transition-all text-center ${
                    settings.creativityTemperature === value
                      ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-400 ring-offset-2 dark:ring-offset-gray-900"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750"
                  }`}
                >
                  <div className="text-base mb-0.5">{emoji}</div>
                  <div className="text-xs font-medium">{label}</div>
                  <div className="text-xs opacity-60 mt-0.5">{value}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={handleSave}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              saved 
                ? "bg-green-500 text-white"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {saved ? "✓ " + t("settings.saved") : t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
