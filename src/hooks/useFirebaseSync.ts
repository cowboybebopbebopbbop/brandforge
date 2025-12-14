import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import { saveUserData, getUserData } from '../services/firestore';

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
  const hasLoadedRef = useRef(false);
  const isSavingRef = useRef(false);
  
  // Get current state directly to avoid stale closures
  const getStoreState = useCallback(() => useAppStore.getState(), []);

  // Load data from Firebase when user logs in
  useEffect(() => {
    if (!user || hasLoadedRef.current) return;

    const loadUserData = async () => {
      try {
        hasLoadedRef.current = true;
        isSavingRef.current = true; // Prevent saving while loading
        
        const cloudData = await getUserData(user.uid);
        
        if (cloudData && cloudData.tabs && cloudData.tabs.length > 0) {
          // Cloud data exists - use setState directly for atomic update
          const store = getStoreState();
          
          // Atomic state update using zustand's setState
          useAppStore.setState({
            tabs: cloudData.tabs,
            activeTabId: cloudData.activeTabId || null,
            settings: { ...store.settings, ...cloudData.settings },
            favoritedNames: cloudData.favoritedNames || [],
            currentView: 'projects', // Always start at projects view
          });
          
          console.log('Loaded user data from cloud:', cloudData.tabs.length, 'projects');
        } else {
          // No cloud data - save current local data to cloud
          const store = getStoreState();
          if (store.tabs.length > 0) {
            await saveUserData(user.uid, {
              tabs: store.tabs,
              activeTabId: store.activeTabId || '',
              settings: store.settings,
              favoritedNames: store.favoritedNames,
            });
            console.log('Saved local data to cloud');
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        // Allow saving after a delay to prevent immediate re-save
        setTimeout(() => {
          isSavingRef.current = false;
        }, 2000);
      }
    };

    loadUserData();
  }, [user?.uid, getStoreState]);

  // Reset hasLoaded when user changes
  useEffect(() => {
    if (!user) {
      hasLoadedRef.current = false;
    }
  }, [user]);

  // Save data to Firebase when store changes (debounced)
  useEffect(() => {
    if (!user || isSavingRef.current) return;
    
    const saveData = debounce(async () => {
      if (isSavingRef.current) return;
      
      try {
        const currentStore = getStoreState();
        await saveUserData(user.uid, {
          tabs: currentStore.tabs,
          activeTabId: currentStore.activeTabId || '',
          settings: currentStore.settings,
          favoritedNames: currentStore.favoritedNames,
        });
        console.log('Auto-saved to cloud');
      } catch (error) {
        console.error('Error saving user data:', error);
      }
    }, 2000); // Save after 2 seconds of inactivity

    saveData();
  }, [
    user?.uid,
    getStoreState,
    // Subscribe to store changes
    useAppStore((state) => state.tabs),
    useAppStore((state) => state.activeTabId),
    useAppStore((state) => state.settings),
    useAppStore((state) => state.favoritedNames),
  ]);
};
