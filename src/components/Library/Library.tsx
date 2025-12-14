import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../store";
import { checkTrademarks } from "../../api";
import type { GeneratedName } from "../../store";
import ClientFeedback from "../ClientFeedback/ClientFeedback";
import CreateCustomName from "../CreateCustomName/CreateCustomName";

interface TrademarkResult {
  name: string;
  risk_level: "safe" | "caution" | "risk";
  exact_matches: string[];
  similar_matches: string[];
  details: string;
}

export default function Library() {
  const { t } = useTranslation();
  const { removeFromFavorites, tabs, updateFavoriteName, addCustomFavorite, activeTabId, getFavoritesForCurrentProject } = useAppStore();
  const [isChecking, setIsChecking] = useState(false);
  const [checkedNames, setCheckedNames] = useState<Set<string>>(new Set());
  const [feedbackModalName, setFeedbackModalName] = useState<GeneratedName | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editRationale, setEditRationale] = useState("");

  // Get favorites for current project only
  const projectFavorites = getFavoritesForCurrentProject();
  
  // Get current tab
  const currentTab = tabs.find(t => t.id === activeTabId);

  // Get MKTU classes from active tab or use empty array
  const mktuClasses = currentTab?.config?.mktuClasses || [];

  const handleRemove = (name: string) => {
    if (confirm(t("library.confirmRemove"))) {
      removeFromFavorites(name);
    }
  };

  const typeColors: Record<string, string> = {
    invented: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    compound: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    acronym: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    descriptive: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    foreign: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
    user: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  };

  const exportFavorites = () => {
    const data = {
      exportDate: new Date().toISOString(),
      projectName: currentTab?.name || "Unknown Project",
      totalFavorites: projectFavorites.length,
      favorites: projectFavorites.map((n) => ({
        name: n.name,
        type: n.type,
        rationale: n.rationale || "",
        riskLevel: n.riskLevel,
        timestamp: n.timestamp,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `brandforge-favorites-${currentTab?.name.replace(/\s+/g, '-')}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    const text = projectFavorites.map((n) => n.name).join("\n");
    await navigator.clipboard.writeText(text);
  };

  const handleCreateCustom = (name: string, rationale: string) => {
    addCustomFavorite(name, rationale);
  };

  const startEditing = (item: GeneratedName) => {
    setEditingName(item.name);
    setEditRationale(item.rationale || "");
  };

  const saveEdit = (name: string) => {
    updateFavoriteName(name, { rationale: editRationale });
    setEditingName(null);
    setEditRationale("");
  };

  const cancelEdit = () => {
    setEditingName(null);
    setEditRationale("");
  };

  const checkFavorites = async () => {
    if (projectFavorites.length === 0) return;
    
    setIsChecking(true);

    try {
      const results: TrademarkResult[] = await checkTrademarks({
        names: projectFavorites.map((n) => n.name),
        mktu_classes: mktuClasses,
      });
      
      // Store checked names with their results
      const newChecked = new Set(checkedNames);
      results.forEach(r => newChecked.add(r.name));
      setCheckedNames(newChecked);
      
      setIsChecking(false);
    } catch (err) {
      console.error("Check failed:", err);
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-7 h-7 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            {t("library.title")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {currentTab?.name} • {t("library.subtitle", { count: projectFavorites.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("customName.createButton")}
          </button>
          {projectFavorites.length > 0 && (
            <>
              <button
              onClick={checkFavorites}
              disabled={isChecking}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isChecking ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t("actions.checking")}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {t("actions.checkAll")}
                </>
              )}
            </button>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {t("actions.copy")}
            </button>
            <button
              onClick={exportFavorites}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("actions.export")}
            </button>
            </>
          )}
        </div>
      </div>

      {/* Empty State */}
      {projectFavorites.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-16">
          <div className="text-center max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-12 h-12 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("library.empty")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t("library.emptyDescription")}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>Click the star icon on any name to save it here</span>
            </div>
          </div>
        </div>
      )}

      {/* Favorites Grid */}
      {projectFavorites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectFavorites.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl bg-white dark:bg-gray-800 border-2 transition-all ${
                item.clientFeedback?.status === "approved"
                  ? "border-green-500 shadow-green-100 dark:shadow-green-900/20"
                  : item.clientFeedback?.status === "rejected"
                  ? "border-red-500 shadow-red-100 dark:shadow-red-900/20"
                  : item.clientFeedback?.status === "needs-work"
                  ? "border-yellow-500 shadow-yellow-100 dark:shadow-yellow-900/20"
                  : "border-gray-200 dark:border-gray-700"
              } hover:shadow-lg`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold text-lg text-gray-900 dark:text-white flex-1">
                  {item.name}
                  {item.clientFeedback?.status && (
                    <span className="ml-2 text-xs">
                      {item.clientFeedback.status === "approved" && "✅"}
                      {item.clientFeedback.status === "rejected" && "❌"}
                      {item.clientFeedback.status === "needs-work" && "🔄"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(item.name)}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={t("actions.remove")}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {item.rationale && editingName !== item.name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {item.rationale}
                </p>
              )}

              {/* Edit Mode */}
              {editingName === item.name ? (
                <div className="mb-3">
                  <textarea
                    value={editRationale}
                    onChange={(e) => setEditRationale(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    rows={3}
                    placeholder={t("library.editRationalePlaceholder", { defaultValue: "Edit the name description/rationale..." })}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveEdit(item.name)}
                      className="flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {t("actions.save", { defaultValue: "Save" })}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      {t("actions.cancel", { defaultValue: "Cancel" })}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startEditing(item)}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline mb-3 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t("library.editRationale", { defaultValue: "Edit description" })}
                </button>
              )}

              {/* Client Feedback Display */}
              {item.clientFeedback?.comments && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    💬 {t("clientFeedback.clientComment")}:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    "{item.clientFeedback.comments}"
                  </p>
                  {item.clientFeedback.clientName && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      — {item.clientFeedback.clientName}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${typeColors[item.type]}`}>
                  {t(`names.types.${item.type}`)}
                </span>
                
                {item.riskLevel && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.riskLevel === "safe"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : item.riskLevel === "caution"
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  }`}>
                    {item.riskLevel === "safe" && "🟢"}
                    {item.riskLevel === "caution" && "🟡"}
                    {item.riskLevel === "risk" && "🔴"}
                    {" " + t(`risk.${item.riskLevel}`)}
                  </span>
                )}
              </div>

              {/* Client Feedback Button */}
              <button
                onClick={() => setFeedbackModalName(item)}
                className="mt-3 w-full px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {item.clientFeedback ? t("clientFeedback.updateFeedback") : t("clientFeedback.addFeedback")}
              </button>

              {item.timestamp && (
                <div className="text-xs text-gray-400 dark:text-gray-600 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {new Date(item.timestamp).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Client Feedback Modal */}
      {feedbackModalName && (
        <ClientFeedback
          name={feedbackModalName}
          onUpdate={(updates) => updateFavoriteName(feedbackModalName.name, updates)}
          onClose={() => setFeedbackModalName(null)}
        />
      )}

      {/* Create Custom Name Modal */}
      <CreateCustomName
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateCustom}
      />
    </div>
  );
}
