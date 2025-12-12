# Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `brandforge`
4. Disable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Click on **Sign-in method** tab
4. Enable **Google** sign-in provider
5. Add support email
6. Save

## 3. Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click "Create database"
3. Select **Start in production mode**
4. Choose location (e.g., us-central)
5. Click "Enable"

## 4. Set Firestore Rules

In Firestore, go to **Rules** tab and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click "Publish"

## 5. Get Firebase Configuration

1. Go to **Project settings** (gear icon)
2. Scroll down to "Your apps"
3. Click **Web** icon `</>`
4. Register app with nickname: `brandforge-web`
5. Copy the config values

## 6. Configure Environment Variables

Create `.env` file in project root (copy from `.env.example`):

```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 7. Deploy to GitHub Pages

The `.env` file is gitignored for security. For GitHub Pages deployment:

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Add each Firebase config as a secret:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## 8. Update GitHub Actions Workflow

The workflow file `.github/workflows/deploy.yml` needs to be updated to use secrets during build.

## Done!

Now users can:
- ✅ Sign in with Google
- ✅ Save API keys in the cloud
- ✅ Sync tabs across devices
- ✅ Save favorites permanently
- ✅ Access data from any device
