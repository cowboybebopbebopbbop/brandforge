import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../store";

export default function TabManager() {
  const { t } = useTranslation();
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab } = useAppStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleDoubleClick = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingName(currentName);
  };

  const handleRename = (tabId: string) => {
    if (editingName.trim()) {
      updateTab(tabId, { name: editingName.trim() });
    }
    setEditingTabId(null);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === "Enter") {
      handleRename(tabId);
    } else if (e.key === "Escape") {
      setEditingTabId(null);
      setEditingName("");
    }
  };

  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`group flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-colors ${
            activeTabId === tab.id
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
          onClick={() => setActiveTab(tab.id)}
          onDoubleClick={() => handleDoubleClick(tab.id, tab.name)}
        >
          {editingTabId === tab.id ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => handleRename(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="text-sm font-medium bg-transparent border-b border-purple-500 outline-none w-24 text-gray-900 dark:text-white"
            />
          ) : (
            <span className="text-sm font-medium whitespace-nowrap" title="Double-click to rename">
              {tab.name}
            </span>
          )}
          {tabs.length > 1 && editingTabId !== tab.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              title={t("tabs.close")}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
      
      {/* Add Tab Button */}
      <button
        onClick={addTab}
        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        title={t("tabs.newProject")}
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
