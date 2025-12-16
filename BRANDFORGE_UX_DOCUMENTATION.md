# BrandForge — UX Documentation

**Version:** 1.0  
**Date:** December 15, 2025  
**Status:** Complete UX Specification

---

## 1. USER STORY MAP (MVP)

### Primary User: **Copywriter / Brand Strategist**

**Core Value Proposition:**  
Generate creative, strategic brand names using AI + professional naming methodology, with client feedback and collaboration tools.

---

### Primary Outcomes → User Journeys

#### **Outcome 1: Create Strategic Brand Names**
**Steps:**
1. Configure naming brief (industry, keywords, strategy, north star)
2. Run association workshop (properties → associations → seed ideas)
3. Generate 100 names using AI (Gemini/OpenAI)
4. Review, favorite, and refine names
5. Check trademark availability (MKTU classes)
6. Export final candidates

**Success Metrics:**
- 100 names generated in <30 seconds
- 5-15 favorites selected per project
- 0 duplicate names within project

---

#### **Outcome 2: Collaborate with Clients**
**Steps:**
1. Select favorite names (3-10)
2. Create share link (Client view - favorites only)
3. Client opens link → sees curated names
4. Client provides feedback (approved/needs-work/rejected)
5. Copywriter reviews feedback → iterates

**Success Metrics:**
- Share link created in 1 click
- Client provides feedback in <5 minutes
- Anti-minusing: rejection requires written reason

---

#### **Outcome 3: Collaborate with Colleagues**
**Steps:**
1. Complete naming brief + generate names
2. Create share link (Colleague view - full project)
3. Colleague sees: brief + strategy + all names
4. Colleague can edit brief with permission
5. Co-create and refine together

**Success Metrics:**
- Full project context shared
- Edit access controlled by permissions
- Version history tracked (implicit via Firebase)

---

#### **Outcome 4: Manage Multiple Projects**
**Steps:**
1. View all projects on dashboard
2. See project status (step, # names generated, favorites)
3. Open/edit/rename/delete projects
4. Projects sync across devices (Firebase)

**Success Metrics:**
- Projects list loads in <2 seconds
- Auto-sync every 3 seconds
- Visual status indicators for each project

---

## 2. INFORMATION ARCHITECTURE

### **Site Map**

```
BrandForge
│
├── / (Root)
│   ├── PasswordGate (if not authenticated)
│   └── App (authenticated)
│       │
│       ├── Projects View (default)
│       │   ├── Project Grid
│       │   ├── Create New Project
│       │   └── Project Actions (open/edit/delete/share)
│       │
│       ├── Project Detail View
│       │   ├── Header (back, project name, actions)
│       │   ├── Wizard (5 steps)
│       │   │   ├── Step 1: Configure Brief
│       │   │   ├── Step 2: Association Workshop
│       │   │   ├── Step 3: Generate Names
│       │   │   ├── Step 4: Check Availability
│       │   │   └── Step 5: Results & Export
│       │   │
│       │   └── Library (Favorites sidebar)
│       │       ├── Favorite names list
│       │       ├── Client Feedback interface
│       │       └── Create custom name
│       │
│       ├── Settings Modal
│       │   ├── API Configuration
│       │   ├── Language (EN/RU)
│       │   ├── Theme (Light/Dark)
│       │   └── Export/Import data
│       │
│       └── Onboarding Modal (first visit)
│
├── /share/{shareId}
│   ├── Client View (favorites-only)
│   │   ├── Selected names grid
│   │   └── Feedback form (if permission: comment)
│   │
│   └── Colleague View (full-project)
│       ├── Project brief
│       ├── All generated names
│       └── Edit access (if permission: edit)
│
└── Auth Layer
    ├── Firebase Auth (Google sign-in)
    └── Anonymous mode (local storage only)
```

---

### **Object Model**

```typescript
// Core Domain Objects

Project (TabData) {
  id: string
  name: string
  createdAt: number
  lastModified: number
  step: 1-5
  config: BriefConfig
  strategy?: StrategyData
  associationWorkshop?: AssociationWorkshopData
  generatedNames: GeneratedName[]
  generationCount: number
}

BriefConfig {
  industry: string
  keywords: string[]
  tones: string[]
  language: "en" | "ru" | "both"
  northStar: string  // Positioning anchor
  companyStrategy: "discounter" | "professional" | "innovator" | "star"
  audienceWants: string[]  // "I want..." values
  audienceFears: string[]  // "I fear..." values
  nameCategories: NameCategory4[]  // Malaikin's 4 categories
  abstractionLevel: "product" | "capabilities" | "beliefs" | "mission"
  communicationChannels: CommunicationChannel[]
  mktuClasses: number[]  // Trademark classes
}

GeneratedName {
  id?: string
  name: string
  type: "invented" | "compound" | "acronym" | "descriptive" | "foreign" | "user"
  rationale: string
  category?: NameCategory4
  territoryId?: string
  checks?: NameChecks
  
  // UI state
  selected?: boolean
  favorited?: boolean
  
  // Availability check
  riskLevel?: "safe" | "caution" | "risk"
  exactMatches?: string[]
  similarMatches?: string[]
  
  // Client feedback
  clientFeedback?: {
    status: "approved" | "needs-work" | "rejected" | "pending"
    comments?: string
    round?: number
    clientName?: string
  }
}

ShareLink {
  id: string  // 12-char unique ID
  projectId: string
  projectName: string
  shareType: "favorites-only" | "full-project"
  permission: "view" | "comment" | "edit"
  isActive: boolean
  accessCount: number
  createdAt: timestamp
  expiresAt?: timestamp
}

FavoritedName (extends GeneratedName) {
  tabId: string  // Parent project
  timestamp: number
}
```

---

## 3. USER FLOWS

### **3.1 HAPPY PATH: Create First Project**

```
[User] lands on BrandForge
  → (first visit) Onboarding Modal appears
  → User clicks "Get Started" → Settings modal opens
  → User enters API key + saves
  ✓ Onboarding complete
  
[Projects View] is empty
  → User clicks "+ New Project"
  → System creates Tab "Untitled Project 1"
  → System navigates to Project Detail (Step 1)

[Step 1: Configure Brief]
  → User fills industry: "SaaS"
  → User adds keywords: "AI", "automation", "productivity"
  → User sets North Star: "Make work effortless"
  → User selects name categories: [informing, image_informing]
  → User clicks "Next"
  ✓ Validation passes → Step 2

[Step 2: Association Workshop]
  → User adds properties: "Fast", "Smart", "Simple"
  → System suggests associations
  → User crosses associations → seed ideas
  → User clicks "Next" → Step 3

[Step 3: Generate Names]
  → System shows AI prompt preview
  → User clicks "Generate 100 Names"
  → Loading: "Generating creative names..."
  → SUCCESS: 100 names appear in grid
  → User favorites 8 names (⭐ animation)
  → User clicks "Next" → Step 4

[Step 4: Check Availability]
  → User sees 8 favorites in list
  → User clicks "Check All" → parallel MKTU search
  → Results: 3 safe, 3 caution, 2 risk
  → User filters to "safe" names
  → User clicks "Next" → Step 5

[Step 5: Results]
  → User sees 3 safe names with previews
  → User exports as JSON
  → ✓ Project complete

Total time: ~10-15 minutes
Total interactions: ~25 clicks
```

---

### **3.2 EDGE PATH: API Error During Generation**

```
[Step 3: Generate Names]
  → User clicks "Generate 100 Names"
  → API request fails (401 Unauthorized)
  
[Error State]
  → Toast notification: "API Error: Invalid API key"
  → Generate button disabled
  → Error banner shows: "Your API key is invalid. Please update it in Settings."
  → User clicks "Open Settings"
  → Settings modal opens
  
[Recovery]
  → User enters correct API key
  → User saves → modal closes
  → Generate button re-enabled
  → User clicks "Generate 100 Names" again
  → ✓ Success → names appear
```

---

### **3.3 HAPPY PATH: Share with Client**

```
[User] has project with 8 favorite names
  → User clicks "Share" button in Library
  → ShareProjectModal opens

[ShareProjectModal]
  → Radio: "Client - show favorites only" (selected)
  → Checkbox: "Allow feedback" (checked)
  → User clicks "Create Link"
  → System generates share link: /share/aBcD1234EfGh
  → Modal shows link + copy button
  → User clicks "Copy Link"
  → Toast: "Link copied!"
  → User sends link to client via email

[Client] opens link
  → SharedProjectView loads (Client mode)
  → Shows: 8 favorite names + BrandPreview
  → Each name has "Give Feedback" button
  → Client clicks "Give Feedback" on "Nexify"
  
[ClientFeedback Modal]
  → Client selects: "Needs Work"
  → Client writes: "Great concept but too techy"
  → Client clicks "Save Feedback"
  → ✓ Feedback stored in Firebase
  
[Copywriter] sees update
  → Firebase sync triggers
  → Name "Nexify" shows yellow badge: "Needs Work"
  → Copywriter reviews comment
  → Iterates on brief → generates new batch
```

---

### **3.4 EDGE PATH: Share Link Deactivated**

```
[Client] clicks old share link
  → System fetches shareInfo from Firebase
  → shareInfo.isActive = false
  
[Error State]
  → Full-screen error message:
    😕 "Oops! This share link has been deactivated"
  → Button: "Go to BrandForge"
  → Client clicks button → redirects to landing page
```

---

### **3.5 HAPPY PATH: Colleague Collaboration**

```
[Copywriter A] creates share link
  → ShareType: "Colleague - full access"
  → Permission: "Edit"
  → Creates link → sends to Copywriter B

[Copywriter B] opens link
  → SharedProjectView loads (Colleague mode)
  → Shows:
    - Project Brief (industry, north star, strategy)
    - All 100 generated names (favorites first)
    - BrandPreview for each name
  
[Copywriter B] reviews brief
  → Sees: North Star = "Make work effortless"
  → Suggests: Change to "Automate the busy work"
  → (Note: Edit functionality depends on permission)
  
[Copywriter B] favorites 3 additional names
  → (If edit permission granted)
  → Firebase syncs updates back to Copywriter A
  → Both see same favorites list
```

---

### **3.6 EDGE PATH: Offline + Auto-Recovery**

```
[User] is editing project
  → Internet connection drops
  
[System] detects offline
  → Firebase hook: useFirebaseSync() pauses
  → Local changes stored in zustand (localStorage)
  → Small indicator: "Offline - changes will sync when online"
  
[User] continues working
  → Favorites 5 names
  → Edits project name
  → All stored locally
  
[Connection] restored
  → useFirebaseSync() resumes
  → Queued changes pushed to Firebase
  → Toast: "Synced!"
  → ✓ No data loss
```

---

## 4. SCREEN LIST + STATES

### **4.1 Projects View**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Empty** | tabs.length === 0 | Empty state graphic + "Create Your First Project" button |
| **Loading** | Initial Firebase load | Skeleton grid (3 placeholder cards) |
| **Populated** | tabs.length > 0 | Project grid with cards |
| **Editing Name** | editingId !== null | Inline text input + save/cancel |
| **Deleting** | Delete confirmation modal | Confirmation dialog overlay |
| **Error (Auth)** | Firebase auth fails | Banner: "Sign in to sync across devices" |
| **Offline** | No network | Banner: "Offline - working locally" |

---

### **4.2 Wizard: Step 1 (Configure Brief)**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Initial** | First load, empty config | Empty form fields, "Next" disabled |
| **Filling** | User typing | Live validation, error messages inline |
| **Validation Error** | Missing required fields | Red borders + error text below fields |
| **Valid** | All required fields filled | "Next" button enabled (purple) |
| **Saving** | After clicking "Next" | Brief auto-saves → navigate to Step 2 |
| **Importing** | User clicks "Import Brief" | File picker → populate fields from JSON |
| **Exporting** | User clicks "Export Brief" | Downloads JSON file |

**Required Fields:**
- API Key (checked via Settings)
- Industry
- Keywords (≥1)
- North Star

---

### **4.3 Wizard: Step 3 (Generate Names)**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Not Started** | generatedNames.length === 0 | "Generate 100 Names" button (large, purple) |
| **Generating** | isGenerating === true | Loading spinner + "Generating creative names..." + progress bar (estimated) |
| **Success** | Names loaded | Grid of 100 names, favorite buttons active |
| **Partial Success** | <100 names returned | Warning: "Generated 73 names (some duplicates removed)" |
| **Error: API** | API key invalid | Error banner + "Open Settings" button |
| **Error: Rate Limit** | 429 response | "API rate limited. Try again in 60 seconds" + countdown |
| **Error: Network** | Network failure | "Connection failed. Check internet and retry" |
| **Empty Results** | 0 valid names | "No names generated. Try different keywords" + "Edit Brief" button |

**Interactions:**
- Favorite button: Click → ⭐ animation → adds to Library
- Unfavorite: Click again → remove from Library
- Generate More: "Generate 10 More" button (if <100)

---

### **4.4 Wizard: Step 4 (Check Availability)**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **No Favorites** | favorites.length === 0 | Message: "No favorites to check. Go back and favorite names." |
| **Ready** | favorites.length > 0, not checking | "Check All" button + list of unchecked names |
| **Checking** | isChecking === true | Progress: "Checking 8 names... 3/8 complete" |
| **Completed** | All checked | Names with badges: Safe (green) / Caution (yellow) / Risk (red) |
| **Error: MKTU API** | API failure | Warning: "Could not check [name]. MKTU API unavailable." |
| **Filtering** | User selects filter | Show only: Safe / Caution / Risk |

---

### **4.5 Library (Favorites)**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Empty** | favorites.length === 0 | Empty state: "No favorites yet. ⭐ names to add them here." |
| **Populated** | favorites.length > 0 | List of favorite names + actions |
| **Checking Availability** | Individual name checking | Name row shows spinner |
| **Feedback Modal Open** | feedbackModalName !== null | ClientFeedback modal overlay |
| **Creating Custom** | isCreateModalOpen === true | CreateCustomName modal |
| **Editing Rationale** | editingName !== null | Inline textarea + save/cancel |

---

### **4.6 Settings Modal**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Closed** | showSettings === false | Not rendered |
| **Open** | showSettings === true | Modal overlay + form |
| **Validating API Key** | User clicks "Test Connection" | "Testing..." spinner |
| **API Valid** | Test successful | Green checkmark: "API key is valid ✓" |
| **API Invalid** | Test failed | Red X: "Invalid API key. Check and try again." |
| **Exporting Data** | User clicks "Export All Data" | Downloads JSON with all projects |
| **Importing Data** | User uploads JSON | Confirmation: "Import 5 projects?" → merge or replace |

---

### **4.7 Shared Project View (Client)**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Loading** | Fetching from Firebase | Spinner: "Loading shared project..." |
| **Not Found** | shareId invalid | Error: "Shared project not found or deleted" |
| **Inactive** | isActive === false | Error: "This share link has been deactivated" |
| **No Favorites** | favorites.length === 0 | Message: "No favorites selected yet" |
| **Populated** | favorites.length > 0 | Grid of favorite names |
| **Feedback Enabled** | permission === 'comment' | "Give Feedback" buttons visible |
| **Feedback Given** | clientFeedback exists | Status badge: Approved/Needs Work/Rejected |

---

### **4.8 Shared Project View (Colleague)**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Loading** | Fetching from Firebase | Spinner: "Loading shared project..." |
| **Not Found** | shareId invalid | Error: "Shared project not found or deleted" |
| **Full Project** | shareType === 'full-project' | Brief section + all names grid |
| **Edit Mode** | permission === 'edit' | Edit buttons visible on brief |
| **View Only** | permission === 'view' | No edit controls |

---

### **4.9 Onboarding Modal**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Hidden** | hasSeenOnboarding === true | Not rendered |
| **Step 1** | First visit, step === 1 | Intro: "Generate strategic brand names" |
| **Step 2** | step === 2 | "Configure your brief" |
| **Step 3** | step === 3 | "AI generates 100 names" |
| **Step 4** | step === 4 | "Check availability" |
| **Complete** | step === 4 + "Get Started" | Closes → opens Settings modal |

---

### **4.10 Password Gate**

**States:**

| State | Condition | UI |
|-------|-----------|-----|
| **Locked** | Password not entered | Full-screen lock + password input |
| **Validating** | User submits password | "Checking..." spinner |
| **Invalid** | Wrong password | Shake animation + "Incorrect password" |
| **Unlocked** | Correct password | Fades away → shows app |

---

## 5. INTERACTION SPECIFICATIONS

### **5.1 Form Validation Rules**

#### **Configure Brief (Step 1)**

| Field | Rule | Error Message | Timing |
|-------|------|---------------|---------|
| Industry | Required, 3-50 chars | "Industry is required" | On "Next" click |
| Keywords | ≥1 keyword | "Add at least one keyword" | On "Next" click |
| North Star | Required, 10-200 chars | "North Star is required" | On "Next" click |
| API Key | Validated in Settings | "No API key set. Open Settings" | On "Next" click |
| Tones | Optional | - | - |
| Language | Default: "english" | - | - |
| MKTU Classes | Optional | - | - |

**Validation Flow:**
1. User clicks "Next"
2. System checks all required fields
3. If errors: highlight fields in red + show error messages
4. If valid: auto-save → navigate to Step 2

---

#### **Settings Modal**

| Field | Rule | Error Message | Timing |
|-------|------|---------------|---------|
| API Key | Required, 20+ chars | "API key is required" | On "Save" click |
| Provider | Required | - | Default: "gemini" |
| Model | Required | - | Default: "gemini-2.0-flash-exp" |
| Temperature | 0.0 - 2.0 | "Must be between 0 and 2" | On change |

**API Key Validation:**
- User enters key
- User clicks "Test Connection"
- System makes test request: `generateNames(count: 1)`
- Success: Green ✓ "API key is valid"
- Failure: Red ✗ "Invalid API key"

---

### **5.2 Async Behavior**

#### **Name Generation**

```typescript
// Flow
User clicks "Generate 100 Names"
  → isGenerating = true
  → Button disabled + spinner
  → API call: generateNames(prompt, count: 100)
  → Stream results OR wait for full batch
  → deduplicate + validate (Section E in PRD)
  → Display names in grid
  → isGenerating = false
  → Button re-enabled

// Loading States
- 0-5s: "Analyzing your brief..."
- 5-15s: "Generating creative names..."
- 15-30s: "Refining candidates..."
- >30s: "This is taking longer than usual..."

// Error Handling
- 401: "Invalid API key" → suggest Settings
- 429: "Rate limited. Try again in 60s" → countdown
- 500: "Service error. Try again" → retry button
- Network: "Connection lost. Check internet"
```

---

#### **Availability Check**

```typescript
// Flow
User clicks "Check All"
  → isChecking = true
  → Batch check: parallel requests to MKTU API
  → Progress bar: "Checking 8 names... 3/8"
  → Each name updates individually as result arrives
  → All complete → isChecking = false

// Retry Logic
- Failed check → show "Retry" button on name
- Individual retry doesn't re-check successful names
- Timeout: 30s per name → "Could not check"

// Display Results
- Safe: Green badge + "No exact matches"
- Caution: Yellow badge + "3 similar marks found"
- Risk: Red badge + "Exact match found: [details]"
```

---

#### **Firebase Sync**

```typescript
// Auto-Sync (useFirebaseSync hook)
- Triggers: every 3 seconds if changes detected
- Debounce: 1 second after last edit
- Batch updates: all pending changes in one write
- Conflict resolution: last-write-wins
- Offline: queue changes → sync when online

// Manual Sync
- Settings: "Sync Now" button
- Forces immediate sync regardless of debounce
```

---

### **5.3 Toasts & Notifications**

| Event | Toast Type | Message | Duration | Auto-dismiss |
|-------|-----------|---------|----------|--------------|
| API key saved | Success | "Settings saved ✓" | 2s | Yes |
| API key invalid | Error | "Invalid API key" | 5s | Yes |
| Share link copied | Success | "Link copied to clipboard!" | 2s | Yes |
| Generation complete | Success | "Generated 100 names ✓" | 3s | Yes |
| Generation failed | Error | "Generation failed. Try again." | 5s | No (dismissible) |
| Offline mode | Info | "Offline - changes will sync later" | - | No (persistent) |
| Sync complete | Success | "Synced ✓" | 1s | Yes |
| Project deleted | Success | "Project deleted" | 2s | Yes |

**Toast Position:** Bottom-right corner  
**Toast Stack:** Max 3 visible, older ones push up  
**Accessibility:** aria-live="polite" for screen readers

---

### **5.4 Modals**

#### **Modal Hierarchy**

| Modal | Z-Index | Can Stack? | Backdrop |
|-------|---------|-----------|----------|
| Settings | 50 | No | Black 50% |
| Onboarding | 50 | No | Black 60% |
| ClientFeedback | 50 | No | Black 50% |
| ShareProjectModal | 50 | No | Black 50% |
| ConfirmDelete | 60 | Yes (over Settings) | Black 70% |
| CreateCustomName | 50 | No | Black 50% |

**Close Behavior:**
- ESC key: closes topmost modal
- Click backdrop: closes modal (except Onboarding)
- X button: always available top-right

---

### **5.5 Keyboard Shortcuts**

| Key | Action | Context |
|-----|--------|---------|
| ⌘/Ctrl + K | Open Settings | Global |
| ⌘/Ctrl + N | New Project | Projects View |
| ⌘/Ctrl + L | Open Library | Project View |
| ESC | Close modal/sidebar | Any modal |
| ⌘/Ctrl + Enter | Submit form | Any form |
| ⌘/Ctrl + S | Save (no-op, auto-saves) | - |
| F | Favorite name | Name card focused |
| ← → | Navigate steps | Wizard |

---

### **5.6 Loading States**

| Component | Skeleton | Spinner | Progress Bar |
|-----------|----------|---------|--------------|
| Projects Grid | Yes (3 cards) | No | No |
| Generate Names | No | Yes | Yes (estimated) |
| Check Availability | No | Yes | Yes (N/M names) |
| Shared Project | No | Yes (center) | No |
| Firebase Sync | No | No | No (silent) |

**Skeleton Design:**
- Gray rounded rectangles
- Pulsing animation (1.5s)
- Matches real card dimensions

---

## 6. COMPONENT INVENTORY

### **6.1 Core Components**

| Component | Props | Variants | Reusable |
|-----------|-------|----------|----------|
| **Button** | `text, onClick, variant, disabled, loading` | `primary, secondary, danger, ghost` | ✓ |
| **Input** | `value, onChange, label, error, type` | `text, textarea, number` | ✓ |
| **Badge** | `text, variant` | `success, warning, danger, info` | ✓ |
| **Card** | `children, onClick, selected` | `default, hover, selected` | ✓ |
| **Modal** | `isOpen, onClose, title, children` | `default, large, full-screen` | ✓ |
| **Toast** | `message, type, duration` | `success, error, info, warning` | ✓ |

---

### **6.2 Domain Components**

#### **ProjectCard**
```tsx
interface ProjectCardProps {
  project: TabData;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onShare: (id: string, name: string) => void;
}
```
**Variants:**
- Default: Shows name, step, stats
- Editing: Inline name editor
- Hover: Shows "Open" action

---

#### **NameCard**
```tsx
interface NameCardProps {
  name: GeneratedName;
  onFavorite: (name: string) => void;
  onUnfavorite: (name: string) => void;
  showFeedback?: boolean;
}
```
**States:**
- Default: Name + rationale + type badge
- Favorited: Gold star icon
- With Feedback: Status badge (approved/needs-work/rejected)
- Checking: Spinner overlay
- Checked: Risk level badge (safe/caution/risk)

---

#### **BrandPreview**
```tsx
interface BrandPreviewProps {
  name: string;
}
```
**Features:**
- Mock logo on colored background
- Domain preview (.com)
- Social handle (@name)
- Expandable/collapsible

---

#### **ClientFeedback**
```tsx
interface ClientFeedbackProps {
  name: GeneratedName;
  onUpdate: (feedback: ClientFeedback) => void;
  onClose: () => void;
}
```
**States:**
- Pending: Select status + add comments
- Anti-minusing: If "rejected", require reason
- Complete: Shows previous feedback rounds

---

#### **StepIndicator**
```tsx
interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
}
```
**Variants:**
- Linear: 1 → 2 → 3 → 4 → 5
- Completed steps: Green checkmark
- Current step: Purple highlight
- Future steps: Gray

---

#### **Header**
```tsx
interface HeaderProps {
  onSettingsClick: () => void;
  onLanguageToggle: () => void;
  currentLanguage: "en" | "ru";
  onLibraryClick: () => void;
  showLibrary: boolean;
}
```
**Features:**
- Back to Projects button
- Project name
- Language toggle (EN/RU)
- Library button (⭐ icon)
- Settings button (⚙️ icon)
- Auth button (avatar/sign-in)

---

#### **ShareProjectModal**
```tsx
interface ShareProjectModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}
```
**Features:**
- Radio: Client vs Colleague
- Permission checkboxes
- "Create Link" button
- List of existing links
- Copy/Delete actions per link

---

### **6.3 Form Components**

#### **TagInput**
```tsx
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  maxTags?: number;
}
```
**Behavior:**
- Type + Enter → adds tag
- Click X → removes tag
- Max length: 20 chars per tag

---

#### **MultiSelect**
```tsx
interface MultiSelectProps<T> {
  options: T[];
  value: T[];
  onChange: (selected: T[]) => void;
  renderOption: (option: T) => React.ReactNode;
}
```
**Variants:**
- Checkboxes (tones, lengths)
- Buttons (name categories)

---

## 7. ANALYTICS EVENTS

### **7.1 Core Actions**

| Event Name | Trigger | Properties | Priority |
|------------|---------|------------|----------|
| `project_created` | User clicks "+ New Project" | `{ projectId, timestamp }` | P0 |
| `brief_configured` | User completes Step 1 | `{ projectId, industry, keywordCount, hasNorthStar }` | P0 |
| `names_generated` | Generation completes | `{ projectId, count, duration, provider, model }` | P0 |
| `name_favorited` | User favorites a name | `{ projectId, name, type, category }` | P0 |
| `name_unfavorited` | User unfavorites a name | `{ projectId, name }` | P1 |
| `availability_checked` | User checks name availability | `{ projectId, name, result: safe/caution/risk }` | P0 |
| `share_link_created` | User creates share link | `{ projectId, shareType, permission }` | P0 |
| `client_feedback_given` | Client submits feedback | `{ shareId, name, status, hasComments }` | P0 |

---

### **7.2 Engagement Metrics**

| Event Name | Trigger | Properties | Priority |
|------------|---------|------------|----------|
| `step_advanced` | User moves to next step | `{ projectId, fromStep, toStep }` | P1 |
| `settings_opened` | User opens Settings | `{ source: "header" | "banner" | "onboarding" }` | P2 |
| `library_opened` | User opens Library sidebar | `{ projectId, favoritesCount }` | P1 |
| `api_key_validated` | User tests API key | `{ provider, success: boolean }` | P1 |
| `language_changed` | User toggles language | `{ from, to }` | P2 |
| `theme_changed` | User changes theme | `{ theme: "light" | "dark" | "system" }` | P2 |

---

### **7.3 Error Tracking**

| Event Name | Trigger | Properties | Priority |
|------------|---------|------------|----------|
| `generation_failed` | API error during generation | `{ projectId, errorCode, errorMessage, provider }` | P0 |
| `availability_check_failed` | MKTU API error | `{ name, errorMessage }` | P1 |
| `firebase_sync_failed` | Firebase write fails | `{ errorCode, operation }` | P0 |
| `share_link_not_found` | Invalid shareId accessed | `{ shareId }` | P1 |

---

### **7.4 Conversion Funnel**

```
Onboarding Started (100%)
  ↓
API Key Configured (80%)
  ↓
First Project Created (70%)
  ↓
Names Generated (60%)
  ↓
Name Favorited (50%)
  ↓
Availability Checked (30%)
  ↓
Share Link Created (20%)
```

**Drop-off Analysis:**
- Identify where users abandon
- A/B test onboarding flow
- Optimize API key setup

---

## 8. UX ACCEPTANCE GATE

### **Checklist: All States Covered?**

✅ **Loading States**
- Projects grid skeleton
- Name generation spinner + progress
- Availability check progress (N/M)
- Shared project loading

✅ **Empty States**
- No projects (first-time user)
- No favorites (Library empty)
- No generated names (before generation)
- No share links (ShareProjectModal)

✅ **Error States**
- API key invalid (banner + modal)
- Generation failed (toast + retry button)
- Network offline (banner + queue sync)
- Share link not found (full-screen error)
- Share link deactivated (full-screen error)

✅ **Permission-Denied States**
- Shared project: view-only mode (no edit buttons)
- Shared project: comment mode (feedback enabled)

✅ **Offline States**
- Banner: "Offline - working locally"
- Queued changes in zustand
- Auto-sync on reconnect

✅ **First-Run States**
- Onboarding modal (4 steps)
- Empty projects view + CTA
- Settings prompt for API key

---

### **Missing States (to implement)**

❌ **Rate Limit State** (429 error)
- Countdown timer: "Try again in 58 seconds"
- Suggestion: "Use a different API key"

❌ **Bulk Operations**
- "Select All" favorites
- "Check All" with progress
- "Delete All" with confirmation

❌ **Undo/Redo**
- Undo delete project
- Undo unfavorite name

❌ **Search/Filter**
- Search projects by name
- Filter names by type/category
- Filter by risk level

---

## 9. RESPONSIVE DESIGN NOTES

### **Breakpoints**

| Device | Width | Layout |
|--------|-------|--------|
| Mobile | <640px | Single column, stack all |
| Tablet | 640-1024px | 2 columns for names grid |
| Desktop | >1024px | 3 columns + sidebar |

### **Mobile Adaptations**

- Header: Collapse to hamburger menu
- Library: Full-screen overlay (not sidebar)
- Project grid: 1 column
- Name cards: Full width
- Modals: Full screen with slide-up animation

---

## 10. ACCESSIBILITY

### **ARIA Labels**

- All buttons: `aria-label` or visible text
- Modals: `role="dialog"`, `aria-labelledby`
- Toasts: `aria-live="polite"`
- Loading: `aria-busy="true"`

### **Keyboard Navigation**

- All interactive elements: focusable + focus styles
- Modals: trap focus within modal
- ESC: closes modals
- Tab order: logical top-to-bottom

### **Color Contrast**

- All text: WCAG AA (4.5:1 for normal, 3:1 for large)
- Dark mode: high contrast maintained
- Focus indicators: 3px blue outline

---

## END OF UX DOCUMENTATION

**Status:** Complete ✓  
**Review Date:** December 15, 2025  
**Approved By:** System Agent

---

**Next Steps:**
1. Implement missing states (rate limit, search, undo)
2. A/B test onboarding flow
3. Add analytics tracking (Segment/Mixpanel)
4. Mobile-first redesign of Library
5. Add keyboard shortcuts guide (? key)
