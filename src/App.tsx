import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "./store";
import { AuthProvider } from "./contexts/AuthContext";
import TabManager from "./components/TabManager/TabManager";
import Wizard from "./components/Wizard/Wizard";
import Settings from "./components/Settings/Settings";
import Header from "./components/Header/Header";
import Library from "./components/Library/Library";
import { useFirebaseSync } from "./hooks/useFirebaseSync";

function AppContent() {
  const { i18n } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const { settings, updateSettings } = useAppStore();
  
  // Enable Firebase sync
  useFirebaseSync();

  const toggleLanguage = () => {
    const newLang = settings.language === "en" ? "ru" : "en";
    updateSettings({ language: newLang });
    i18n.changeLanguage(newLang);
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${settings.theme === 'dark' ? 'dark' : ''}`}>
      <Header 
        onSettingsClick={() => setShowSettings(true)}
        onLanguageToggle={toggleLanguage}
        currentLanguage={settings.language}
        onLibraryClick={() => setShowLibrary(!showLibrary)}
        showLibrary={showLibrary}
      />
      
      <main className="container mx-auto px-4 py-6">
        {showLibrary ? (
          <Library />
        ) : (
          <>
            <TabManager />
            <Wizard />
          </>
        )}
      </main>

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
