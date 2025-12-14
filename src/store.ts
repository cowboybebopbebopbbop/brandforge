import { create } from "zustand";
import { persist } from "zustand/middleware";

// PRD S2: 4 name categories from Malaikin's book
export type NameCategory4 = 
  | "informing"           // Информирующие (informative, non-emotional)
  | "image_informing"     // Образно-информирующие (informative and emotional)
  | "image"               // Образные (non-informative but emotional)
  | "abstract_constructed"; // Абстрактные/сконструированные (non-informative, non-emotional)

// PRD S2: Quality checks structure
export interface NameChecks {
  negative_reading_risk: "low" | "medium" | "high";
  phone_spelling_risk: "low" | "medium" | "high";
  ru_phonetic_risk: "low" | "medium" | "high";
  intercultural_risk: "low" | "medium" | "high";
}

export interface GeneratedName {
  id?: string; // Unique identifier for tracking
  name: string;
  type: "invented" | "compound" | "acronym" | "descriptive" | "foreign" | "user";
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
  // PRD S2: 4-category classification
  category4?: NameCategory4;
  // PRD S2: Territory reference
  territoryId?: string;
  // PRD S2: Quality checks
  checks?: NameChecks;
  // Client Feedback Layer
  clientFeedback?: {
    status: "approved" | "needs-work" | "rejected" | "pending";
    comments?: string;
    round?: number; // Feedback round (1, 2, 3...)
    feedbackDate?: number;
    clientName?: string; // Optional: track which client/stakeholder
  };
}

// PRD S2: Company strategy types
export type CompanyStrategy = "discounter" | "professional" | "innovator" | "star";

// PRD S2: Abstraction level for naming
export type AbstractionLevel = "product" | "capabilities" | "beliefs" | "mission";

// PRD S2: Communication channel type
export type CommunicationChannel = "phone-first" | "sales" | "documents" | "international";

// PRD S2: Naming territory
export interface NamingTerritory {
  id: string;
  name: string;
  description: string;
}

// PRD S2: Association from workshop
export interface Association {
  id: string;
  property: string;        // Key property of the offering
  type: "similarity" | "adjacency" | "contrast";
  words: string[];         // Associated words
}

// PRD S2: Crossed association (seed idea)
export interface CrossedAssociation {
  id: string;
  associations: string[];  // IDs of associations being crossed
  seedIdea: string;        // Resulting seed idea
}

// PRD S2: Strategy synthesis result
export interface StrategyData {
  northStar: string;
  attributes: string[];
  territories: NamingTerritory[];
  locked?: boolean;
}

// PRD S2: Association workshop data
export interface AssociationWorkshopData {
  properties: string[];          // 3-6 key properties
  associations: Association[];
  crossedAssociations: CrossedAssociation[];
}

export interface TabData {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
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
    // Additional brief fields
    targetAudience: string;
    positioning: string;
    competitors: string[];
    inspirationBrands: string[];
    restrictions: string;
    geographicMarket: string;
    // PRD S2: New required fields
    northStar: string;                              // Main positioning anchor
    oppositionSlider: number;                       // 0-100, 0 = like 80% competitors, 100 = fully oppositional
    nameCategories: NameCategory4[];                // Which of 4 categories to generate
    companyStrategy: CompanyStrategy;               // Discounter/Pro/Innovator/Star
    audienceWants: string[];                        // "I want..." values (2-3)
    audienceFears: string[];                        // "I fear..." values (2-3)
    communicationChannels: CommunicationChannel[];  // Which channels are priority
    abstractionLevel: AbstractionLevel;             // Product → Mission spectrum
    isPhoneFirst: boolean;                          // "Writes as it sounds" requirement
    isCorporate: boolean;                           // Corporate naming case (brevity/neutrality/internationality)
  };
  // PRD S2: Strategy synthesis data
  strategy?: StrategyData;
  // PRD S2: Association workshop data
  associationWorkshop?: AssociationWorkshopData;
  generatedNames: GeneratedName[];
  isGenerating: boolean;
  isChecking: boolean;
}

export interface Settings {
  provider: "gemini" | "openai" | "claude";
  apiKey: string;
  geminiModel?: "gemini-2.0-flash-exp" | "gemini-1.5-flash" | "gemini-1.5-pro" | "gemini-1.0-pro";
  language: "en" | "ru";
  theme: "light" | "dark" | "system";
  resultsPerGeneration: 50 | 100 | 150;
}

interface AppState {
  tabs: TabData[];
  activeTabId: string | null;
  currentView: "projects" | "project-detail";
  settings: Settings;
  favoritedNames: GeneratedName[];
  
  // Project actions
  addTab: () => void;
  deleteProject: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<TabData>) => void;
  renameTab: (id: string, name: string) => void;
  
  // View actions
  setCurrentView: (view: "projects" | "project-detail") => void;
  openProject: (id: string) => void;
  
  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void;
  
  // Current tab helpers
  getCurrentTab: () => TabData | null;
  updateCurrentTab: (updates: Partial<TabData>) => void;
  
  // Favorites actions (isolated per project)
  addToFavorites: (name: GeneratedName) => void;
  removeFromFavorites: (name: string) => void;
  toggleFavorite: (name: GeneratedName) => void;
  updateFavoriteName: (name: string, updates: Partial<GeneratedName>) => void;
  addCustomFavorite: (name: string, rationale: string) => void;
  getFavoritesForCurrentProject: () => GeneratedName[];
}

export type { AppState };

const createDefaultTab = (id: string, name: string): TabData => ({
  id,
  name,
  createdAt: Date.now(),
  lastModified: Date.now(),
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
    targetAudience: "",
    positioning: "",
    competitors: [],
    inspirationBrands: [],
    restrictions: "",
    geographicMarket: "",
    // PRD S2: New required fields with defaults
    northStar: "",
    oppositionSlider: 50,
    nameCategories: ["informing", "image_informing", "image", "abstract_constructed"],
    companyStrategy: "professional",
    audienceWants: [],
    audienceFears: [],
    communicationChannels: [],
    abstractionLevel: "product",
    isPhoneFirst: false,
    isCorporate: false,
  },
  generatedNames: [],
  isGenerating: false,
  isChecking: false,
});

const defaultSettings: Settings = {
  provider: "gemini",
  apiKey: "",
  geminiModel: "gemini-2.0-flash-exp",
  language: "en",
  theme: "system",
  resultsPerGeneration: 100,
};

let tabCounter = 0;  // Start from 0, will increment when creating first tab

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  tabs: [],  // Start with empty tabs - will be created when user creates first project
  activeTabId: null,
  currentView: "projects",
  settings: defaultSettings,
  favoritedNames: [],

  addTab: () => {
    tabCounter++;
    const newTab = createDefaultTab(`tab-${tabCounter}`, `Project ${tabCounter}`);
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
      currentView: "project-detail",
    }));
  },

  deleteProject: (id: string) => {
    const state = get();
    const newTabs = state.tabs.filter((t) => t.id !== id);
    
    // Also remove favorites associated with this project
    const newFavorites = state.favoritedNames.filter(f => f.tabId !== id);
    
    set({
      tabs: newTabs,
      activeTabId: state.activeTabId === id ? null : state.activeTabId,
      favoritedNames: newFavorites,
      currentView: "projects",
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  updateTab: (id: string, updates: Partial<TabData>) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates, lastModified: Date.now() } : t)),
    }));
  },

  renameTab: (id: string, name: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, name, lastModified: Date.now() } : t)),
    }));
  },

  setCurrentView: (view: "projects" | "project-detail") => {
    set({ currentView: view });
  },

  openProject: (id: string) => {
    set({ 
      activeTabId: id, 
      currentView: "project-detail" 
    });
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

  updateFavoriteName: (name: string, updates: Partial<GeneratedName>) => {
    set((state) => ({
      favoritedNames: state.favoritedNames.map((n) =>
        n.name === name ? { ...n, ...updates } : n
      ),
    }));
  },

  addCustomFavorite: (name: string, rationale: string) => {
    const state = get();
    const customId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const customName: GeneratedName = {
      id: customId,
      name,
      type: "user",
      rationale,
      favorited: true,
      timestamp: Date.now(),
      tabId: state.activeTabId || undefined,
    };
    
    // Add to favorites
    set({
      favoritedNames: [...state.favoritedNames, customName],
    });
    
    // ALSO add to current tab's generatedNames so it appears in feedback filtering
    if (state.activeTabId) {
      const currentTab = state.tabs.find(t => t.id === state.activeTabId);
      if (currentTab) {
        state.updateTab(state.activeTabId, {
          generatedNames: [...currentTab.generatedNames, customName],
        });
      }
    }
  },

  getFavoritesForCurrentProject: () => {
    const state = get();
    if (!state.activeTabId) return [];
    return state.favoritedNames.filter(f => f.tabId === state.activeTabId);
  },
}),
    {
      name: "brandforge-storage",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        currentView: state.currentView,
        settings: state.settings,
        favoritedNames: state.favoritedNames,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;
        // Use persisted state completely, don't merge with initial state
        return {
          ...currentState,
          tabs: persisted.tabs ?? [],
          activeTabId: persisted.activeTabId ?? null,
          currentView: persisted.currentView ?? "projects",
          settings: persisted.settings ?? currentState.settings,
          favoritedNames: persisted.favoritedNames ?? [],
        };
      },
      onRehydrateStorage: () => {
        return (state: AppState | undefined) => {
          if (state && state.tabs && state.tabs.length > 0) {
            // Update tabCounter based on existing tabs to avoid ID collisions
            const maxId = state.tabs.reduce((max: number, tab: TabData) => {
              const match = tab.id.match(/tab-(\d+)/);
              return match ? Math.max(max, parseInt(match[1])) : max;
            }, 0);
            tabCounter = maxId;
          } else {
            // Reset counter if no tabs
            tabCounter = 0;
          }
        };
      },
    }
  )
);
