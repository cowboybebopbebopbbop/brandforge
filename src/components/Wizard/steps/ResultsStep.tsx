import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store";
import AvailabilityChecker from "../../AvailabilityChecker/AvailabilityChecker";
import BrandPreview from "../../BrandPreview/BrandPreview";

export default function ResultsStep() {
  const { t } = useTranslation();
  const { getCurrentTab, updateCurrentTab } = useAppStore();
  const currentTab = getCurrentTab();
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | "safe" | "caution" | "risk">("all");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showBrandPreview, setShowBrandPreview] = useState(false);

  if (!currentTab) return null;

  const { generatedNames } = currentTab;
  const checkedNames = generatedNames.filter((n) => n.selected && n.riskLevel);

  const filteredNames = filter === "all" 
    ? checkedNames 
    : checkedNames.filter((n) => n.riskLevel === filter);

  const riskIcons: Record<string, string> = {
    safe: "🟢",
    caution: "🟡",
    risk: "🔴",
  };

  const riskColors: Record<string, string> = {
    safe: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    caution: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    risk: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  const handleBack = () => {
    updateCurrentTab({ step: 3 });
  };

  const handleStartOver = () => {
    updateCurrentTab({ step: 1, generatedNames: [] });
  };

  const copyToClipboard = async () => {
    const text = filteredNames
      .map((n) => `${riskIcons[n.riskLevel!]} ${n.name}${n.rationale ? ` - ${n.rationale}` : ""}`)
      .join("\n");
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCSV = () => {
    const headers = ["Name", "Type", "Rationale", "Risk Level", "Exact Matches", "Similar Matches"];
    const rows = filteredNames.map((n) => [
      `"${n.name}"`,
      n.type,
      `"${n.rationale?.replace(/"/g, '""') || ""}"`,
      n.riskLevel,
      `"${n.exactMatches?.join("; ") || ""}"`,
      `"${n.similarMatches?.join("; ") || ""}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `brandforge-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      industry: currentTab.config.industry,
      totalNames: filteredNames.length,
      results: filteredNames.map((n) => ({
        name: n.name,
        type: n.type,
        rationale: n.rationale || "",
        riskLevel: n.riskLevel,
        exactMatches: n.exactMatches || [],
        similarMatches: n.similarMatches || [],
      })),
      summary: {
        safe: countByRisk.safe,
        caution: countByRisk.caution,
        risk: countByRisk.risk,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `brandforge-results-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const countByRisk = {
    safe: checkedNames.filter((n) => n.riskLevel === "safe").length,
    caution: checkedNames.filter((n) => n.riskLevel === "caution").length,
    risk: checkedNames.filter((n) => n.riskLevel === "risk").length,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
          <div className="text-3xl mb-1">🟢</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{countByRisk.safe}</div>
          <div className="text-sm text-green-600 dark:text-green-500">{t("risk.safe")}</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-center">
          <div className="text-3xl mb-1">🟡</div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{countByRisk.caution}</div>
          <div className="text-sm text-yellow-600 dark:text-yellow-500">{t("risk.caution")}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
          <div className="text-3xl mb-1">🔴</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{countByRisk.risk}</div>
          <div className="text-sm text-red-600 dark:text-red-500">{t("risk.risk")}</div>
        </div>
      </div>

      {/* Filter & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "safe", "caution", "risk"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {f === "all" ? t("names.all") : (
                <span className="flex items-center gap-1">
                  {riskIcons[f]} {t(`risk.${f}`)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? t("export.copied") : t("export.clipboard")}
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t("export.csv")}
          </button>
          <button
            onClick={exportJSON}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            JSON
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {filteredNames.map((name, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border ${riskColors[name.riskLevel!]}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{riskIcons[name.riskLevel!]}</span>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {name.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {name.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t(`names.types.${name.type}`)} • {t(`risk.${name.riskLevel}Desc`)}
                  </p>
                </div>
              </div>
            </div>

            {/* Match Details */}
            {((name.exactMatches?.length ?? 0) > 0 || (name.similarMatches?.length ?? 0) > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                {(name.exactMatches?.length ?? 0) > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      Exact matches:
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      {name.exactMatches?.join(", ")}
                    </span>
                  </div>
                )}
                {(name.similarMatches?.length ?? 0) > 0 && (
                  <div>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      Similar names:
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      {name.similarMatches?.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Availability & Brand Preview */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <AvailabilityChecker name={name.name} compact />
              <button
                onClick={() => {
                  setSelectedName(name.name);
                  setShowBrandPreview(true);
                }}
                className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Preview Logo
              </button>
            </div>
          </div>
        ))}
      </div>

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
        
        <button
          onClick={handleStartOver}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          Start New Search
        </button>
      </div>

      {/* Brand Preview Modal */}
      {showBrandPreview && selectedName && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Brand Preview: {selectedName}
              </h2>
              <button
                onClick={() => setShowBrandPreview(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <BrandPreview 
                name={selectedName} 
                industry={currentTab?.config.industry}
                keywords={currentTab?.config.keywords}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
