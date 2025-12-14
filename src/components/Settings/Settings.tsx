import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore, Settings as SettingsType } from "../../store";

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguageChange = (lang: "en" | "ru") => {
    updateSettings({ language: lang });
    i18n.changeLanguage(lang);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("settings.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* AI Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("settings.provider")}
            </label>
            <select
              value={settings.provider}
              onChange={(e) => updateSettings({ provider: e.target.value as SettingsType["provider"] })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("settings.apiKey")}
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              placeholder={t("settings.apiKeyPlaceholder")}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Gemini Model Selection */}
          {settings.provider === "gemini" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("settings.geminiModel")}
              </label>
              <select
                value={settings.geminiModel || "gemini-2.0-flash-exp"}
                onChange={(e) => updateSettings({ geminiModel: e.target.value as SettingsType["geminiModel"] })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("settings.language")}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguageChange("en")}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  settings.language === "en"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => handleLanguageChange("ru")}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  settings.language === "ru"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                🇷🇺 Русский
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("settings.theme")}
            </label>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme })}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    settings.theme === theme
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t(`settings.themes.${theme}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("settings.resultsCount")}
            </label>
            <div className="flex gap-2">
              {([50, 100, 150] as const).map((count) => (
                <button
                  key={count}
                  onClick={() => updateSettings({ resultsPerGeneration: count })}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    settings.resultsPerGeneration === count
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Creativity Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("settings.creativityTemperature", { defaultValue: "AI Creativity Level" })}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t("settings.temperatureDesc", { defaultValue: "Higher values make output more random and creative" })}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: 0.3, label: "Low", emoji: "🎯", desc: "Focused" },
                { value: 0.5, label: "Balanced", emoji: "⚖️", desc: "Stable" },
                { value: 0.8, label: "High", emoji: "🎨", desc: "Creative" },
                { value: 1.0, label: "Max", emoji: "🚀", desc: "Wild" }
              ] as const).map(({ value, label, emoji, desc }) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ creativityTemperature: value })}
                  className={`px-3 py-2.5 rounded-lg font-medium transition-colors text-center ${
                    settings.creativityTemperature === value
                      ? "bg-purple-600 text-white ring-2 ring-purple-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  title={desc}
                >
                  <div className="text-lg">{emoji}</div>
                  <div className="text-xs mt-1">{label}</div>
                  <div className="text-xs opacity-70">{value}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            {saved ? t("settings.saved") : t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
