import { useTranslation } from "react-i18next";
import { AuthButton } from "../Auth/AuthButton";
import { useAppStore } from "../../store";

interface HeaderProps {
  onSettingsClick: () => void;
  onLanguageToggle: () => void;
  currentLanguage: "en" | "ru";
  onLibraryClick?: () => void;
  showLibrary?: boolean;
}

export default function Header({ onSettingsClick, onLanguageToggle, currentLanguage, onLibraryClick, showLibrary }: HeaderProps) {
  const { t } = useTranslation();
  const { setCurrentView, getCurrentTab } = useAppStore();
  const currentProject = getCurrentTab();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Back + Project Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView("projects")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              title={t("projects.backToProjects")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{t("projects.backToProjects")}</span>
            </button>

            {currentProject && (
              <>
                <span className="text-gray-300 dark:text-gray-700">/</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {currentProject.name}
                </span>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <AuthButton />

            {onLibraryClick && (
              <button
                onClick={onLibraryClick}
                className={`p-2 transition-colors ${
                  showLibrary
                    ? "text-yellow-500"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
                title={t("library.title")}
              >
                <svg className="w-5 h-5" fill={showLibrary ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            )}

            <button
              onClick={onLanguageToggle}
              className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {currentLanguage.toUpperCase()}
            </button>

            <button
              onClick={onSettingsClick}
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
    </header>
  );
}
