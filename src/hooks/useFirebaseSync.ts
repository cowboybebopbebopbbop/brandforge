import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import { saveUserData, syncUserData } from '../services/firestore';

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const useFirebaseSync = () => {
  const { user } = useAuth();
  const store = useAppStore();

  // Load data from Firebase when user logs in
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        const localData = {
          tabs: store.tabs,
          activeTabId: store.activeTabId || '',
          settings: store.settings,
          favoritedNames: store.favoritedNames,
        };

        const syncedData = await syncUserData(user.uid, localData);

        if (syncedData) {
          // Update store with cloud data
          if (syncedData.tabs) {
            // Replace all tabs with cloud tabs
            store.tabs.forEach((tab: any) => store.removeTab(tab.id));
            syncedData.tabs.forEach((tab: any) => {
              store.addTab();
              const lastTab = store.tabs[store.tabs.length - 1];
              store.updateTab(lastTab.id, tab);
            });
          }

          if (syncedData.settings) {
            store.updateSettings(syncedData.settings);
          }

          if (syncedData.favoritedNames) {
            // Clear and reload favorites
            store.favoritedNames.forEach((fav: any) => 
              store.removeFromFavorites(fav.name)
            );
            syncedData.favoritedNames.forEach((fav: any) => 
              store.addToFavorites(fav)
            );
          }

          if (syncedData.activeTabId) {
            store.setActiveTab(syncedData.activeTabId);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user?.uid]);

  // Save data to Firebase when store changes (debounced)
  useEffect(() => {
    if (!user) return;

    const saveData = debounce(async () => {
      try {
        await saveUserData(user.uid, {
          tabs: store.tabs,
          activeTabId: store.activeTabId || '',
          settings: store.settings,
          favoritedNames: store.favoritedNames,
        });
      } catch (error) {
        console.error('Error saving user data:', error);
      }
    }, 1000); // Save after 1 second of inactivity

    saveData();
  }, [
    user?.uid,
    store.tabs,
    store.activeTabId,
    store.settings,
    store.favoritedNames,
  ]);
};
