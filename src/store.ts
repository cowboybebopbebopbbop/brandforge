import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GeneratedName {
  name: string;
  type: "invented" | "compound" | "acronym" | "descriptive" | "foreign";
  rationale?: string;
  selected?: boolean;
  riskLevel?: "safe" | "caution" | "risk";
  exactMatches?: string[];
  similarMatches?: string[];
  details?: string;
  liked?: boolean;
  disliked?: boolean;
  favorited?: boolean;
  tabId?: string; // For tracking which tab it came from
  timestamp?: number; // When it was created/favorited
}

export interface TabData {
  id: string;
  name: string;
  step: number;
  config: {
    industry: string;
    keywords: string[];
    tones: string[];
    customTone: string;
    lengths: string[];
    customLength: string;
    wordCounts: string[];
    customWordCount: string;
    language: string;
    creativity: "low" | "medium" | "high";
    customInstructions: string;
    mktuClasses: number[];
  };
  generatedNames: GeneratedName[];
  isGenerating: boolean;
  isChecking: boolean;
}

export interface Settings {
  provider: "gemini" | "openai" | "claude";
  apiKey: string;
  language: "en" | "ru";
  theme: "light" | "dark" | "system";
  resultsPerGeneration: 50 | 100 | 150;
}

interface AppState {
  tabs: TabData[];
  activeTabId: string | null;
  settings: Settings;
  favoritedNames: GeneratedName[];
  
  // Tab actions
  addTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<TabData>) => void;
  
  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;
  
  // Current tab helpers
  getCurrentTab: () => TabData | null;
  updateCurrentTab: (updates: Partial<TabData>) => void;
  
  // Favorites actions
  addToFavorites: (name: GeneratedName) => void;
  removeFromFavorites: (name: string) => void;
  toggleFavorite: (name: GeneratedName) => void;
}

export type { AppState };

const createDefaultTab = (id: string, name: string): TabData => ({
  id,
  name,
  step: 1,
  config: {
    industry: "",
    keywords: [],
    tones: ["professional"],
    customTone: "",
    lengths: ["medium"],
    customLength: "",
    wordCounts: ["medium"],
    customWordCount: "",
    language: "english",
    creativity: "high",
    customInstructions: "",
    mktuClasses: [],
  },
  generatedNames: [],
  isGenerating: false,
  isChecking: false,
});

const defaultSettings: Settings = {
  provider: "gemini",
  apiKey: "",
  language: "en",
  theme: "system",
  resultsPerGeneration: 100,
};

let tabCounter = 1;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  tabs: [createDefaultTab("tab-1", "New Project")],
  activeTabId: "tab-1",
  settings: defaultSettings,
  favoritedNames: [],

  addTab: () => {
    tabCounter++;
    const newTab = createDefaultTab(`tab-${tabCounter}`, `Project ${tabCounter}`);
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  removeTab: (id: string) => {
    const state = get();
    if (state.tabs.length <= 1) return;
    
    const newTabs = state.tabs.filter((t) => t.id !== id);
    let newActiveId = state.activeTabId;
    
    if (state.activeTabId === id) {
      const removedIndex = state.tabs.findIndex((t) => t.id === id);
      newActiveId = newTabs[Math.min(removedIndex, newTabs.length - 1)]?.id ?? null;
    }
    
    set({
      tabs: newTabs,
      activeTabId: newActiveId,
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  updateTab: (id: string, updates: Partial<TabData>) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  updateSettings: (updates: Partial<Settings>) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  getCurrentTab: () => {
    const state = get();
    return state.tabs.find((t) => t.id === state.activeTabId) ?? null;
  },

  updateCurrentTab: (updates: Partial<TabData>) => {
    const state = get();
    if (state.activeTabId) {
      state.updateTab(state.activeTabId, updates);
    }
  },

  addToFavorites: (name: GeneratedName) => {
    set((state) => {
      const exists = state.favoritedNames.some((n) => n.name === name.name);
      if (!exists) {
        return {
          favoritedNames: [
            ...state.favoritedNames,
            { ...name, favorited: true, timestamp: Date.now() },
          ],
        };
      }
      return state;
    });
  },

  removeFromFavorites: (name: string) => {
    set((state) => ({
      favoritedNames: state.favoritedNames.filter((n) => n.name !== name),
    }));
  },

  toggleFavorite: (name: GeneratedName) => {
    const state = get();
    const exists = state.favoritedNames.some((n) => n.name === name.name);
    if (exists) {
      state.removeFromFavorites(name.name);
    } else {
      state.addToFavorites({ ...name, tabId: state.activeTabId || undefined });
    }
  },
}),
    {
      name: "brandforge-storage",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        settings: state.settings,
        favoritedNames: state.favoritedNames,
      }),
      onRehydrateStorage: () => {
        return (state: AppState | undefined) => {
          if (state) {
            // Update tabCounter based on existing tabs
            const maxId = state.tabs.reduce((max: number, tab: TabData) => {
              const match = tab.id.match(/tab-(\d+)/);
              return match ? Math.max(max, parseInt(match[1])) : max;
            }, 0);
            tabCounter = maxId;
          }
        };
      },
    }
  )
);
