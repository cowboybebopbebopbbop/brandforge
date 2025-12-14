import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../store";
import { useAuth } from "../../contexts/AuthContext";
import { AuthButton } from "../Auth/AuthButton";
import Settings from "../Settings/Settings";
import ShareProjectModal from "../ShareProject/ShareProjectModal";

export default function ProjectsView() {
  const { t, i18n } = useTranslation();
  const { tabs, addTab, deleteProject, openProject, renameTab, settings, updateSettings } = useAppStore();
  useAuth(); // Auth context for avatar dropdown
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [shareProjectId, setShareProjectId] = useState<string | null>(null);
  const [shareProjectName, setShareProjectName] = useState<string>("");

  const toggleLanguage = () => {
    const newLang = settings.language === "en" ? "ru" : "en";
    updateSettings({ language: newLang });
    i18n.changeLanguage(newLang);
  };

  const handleCreateProject = () => {
    addTab();
  };

  const handleOpenProject = (id: string) => {
    openProject(id);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      alert(t("projects.cannotDeleteLast"));
      return;
    }
    if (confirm(t("projects.confirmDelete"))) {
      deleteProject(id);
    }
  };

  const handleRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      setEditingId(id);
      setEditingName(tab.name);
    }
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      renameTab(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const getProjectStats = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return { favorites: 0, generated: 0, step: 1 };
    
    const favorites = useAppStore.getState().favoritedNames.filter(f => f.tabId === tabId).length;
    const generated = tab.generatedNames.length;
    
    return { favorites, generated, step: tab.step };
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t("projects.today");
    if (diffDays === 1) return t("projects.yesterday");
    if (diffDays < 7) return t("projects.daysAgo", { count: diffDays });
    
    return date.toLocaleDateString();
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return t("steps.configure");
      case 2: return t("steps.generate");
      case 3: return t("steps.check");
      case 4: return t("steps.results");
      default: return t("steps.configure");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Minimal Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-gray-900 dark:text-white font-semibold">BrandForge</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLanguage}
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {settings.language === "en" ? "RU" : "EN"}
              </button>
              <AuthButton />
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={t("settings.title")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t("projects.title", "Projects")}
          </h2>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Create New Project Card */}
          <div
            onClick={handleCreateProject}
            className="group flex items-center justify-center p-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/10 min-h-[120px]"
          >
            <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">{t("projects.createNew")}</span>
            </div>
          </div>
          {tabs.map((tab) => {
            const stats = getProjectStats(tab.id);
            const isEditing = editingId === tab.id;
            
            return (
              <div
                key={tab.id}
                onClick={() => !isEditing && handleOpenProject(tab.id)}
                className="group relative bg-white dark:bg-gray-800/50 rounded-xl p-5 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-200 hover:shadow-lg"
              >
                {/* Top Row: Name + Actions */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  {isEditing ? (
                    <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(tab.id);
                          if (e.key === "Escape") handleCancelRename();
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveRename(tab.id)}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                        >
                          {t("actions.save")}
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-xs"
                        >
                          {t("actions.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                      {tab.name}
                    </h3>
                  )}
                  
                  {/* Actions - visible on hover */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareProjectId(tab.id);
                          setShareProjectName(tab.name);
                        }}
                        className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                        title={t("projects.share", "Share")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleRename(tab.id, e)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title={t("projects.rename")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(tab.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title={t("projects.delete")}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {stats.favorites}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {stats.generated}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                    {getStepLabel(stats.step)}
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>{formatDate(tab.lastModified)}</span>
                  <span className="text-purple-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("projects.open")} →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {tabs.length === 0 && (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("projects.noProjects")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t("projects.noProjectsDesc")}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {shareProjectId && (
        <ShareProjectModal
          projectId={shareProjectId}
          projectName={shareProjectName}
          onClose={() => setShareProjectId(null)}
        />
      )}
    </div>
  );
}
