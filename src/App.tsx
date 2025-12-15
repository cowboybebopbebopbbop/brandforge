import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "./store";
import { AuthProvider } from "./contexts/AuthContext";
import { PasswordGate } from "./components/PasswordGate/PasswordGate";
import Wizard from "./components/Wizard/Wizard";
import Settings from "./components/Settings/Settings";
import Header from "./components/Header/Header";
import Library from "./components/Library/Library";
import SetupBanner from "./components/SetupBanner/SetupBanner";
import OnboardingModal from "./components/OnboardingModal/OnboardingModal";
import ProjectsView from "./components/ProjectsView/ProjectsView";
import SharedProjectView from "./components/SharedProjectView/SharedProjectView";
import { useFirebaseSync } from "./hooks/useFirebaseSync";

function AppContent() {
  const { i18n } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { settings, updateSettings, currentView } = useAppStore();
  
  // Check if this is a shared project view
  const pathname = window.location.pathname;
  const isShareView = pathname.startsWith('/share/');
  const shareId = isShareView ? pathname.replace('/share/', '') : null;
  
  // Enable Firebase sync (skip for share views)
  useFirebaseSync();

  // Show onboarding on first visit
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = settings.language === "en" ? "ru" : "en";
    updateSettings({ language: newLang });
    i18n.changeLanguage(newLang);
  };

  // If this is a share view, render SharedProjectView instead
  if (isShareView && shareId) {
    return <SharedProjectView shareId={shareId} />;
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${settings.theme === 'dark' ? 'dark' : ''}`}>
      {currentView === "project-detail" && (
        <Header 
          onSettingsClick={() => setShowSettings(true)}
          onLanguageToggle={toggleLanguage}
          currentLanguage={settings.language}
          onLibraryClick={() => setShowLibrary(!showLibrary)}
          showLibrary={showLibrary}
        />
      )}
      
      <main className="container mx-auto px-4 py-6">
        {currentView === "projects" ? (
          <ProjectsView />
        ) : showLibrary ? (
          <Library />
        ) : (
          <>
            {!settings.apiKey && <SetupBanner onOpenSettings={() => setShowSettings(true)} />}
            <Wizard onOpenSettings={() => setShowSettings(true)} />
          </>
        )}
      </main>

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onOpenSettings={() => {
            setShowOnboarding(false);
            setShowSettings(true);
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <PasswordGate>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </PasswordGate>
  );
}

export default App;
