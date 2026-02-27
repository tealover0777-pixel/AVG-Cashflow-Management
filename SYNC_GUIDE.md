# Sync Guide: Firebase Studio ↔ Antigravity

This guide covers how to keep your **Source Code** and **Firebase State** in sync between the cloud (Firebase Studio) and your local machine (Antigravity).

---

## ☁️ From Firebase Studio → 🏠 To Antigravity

## Inside Firebas Studio Terminal
# Every time you start the work
  git pull

# Stage file
  git add .
or 
  git add [file name]

# Commit
  git commit -m "Update from Firebase Studio"
  git commit -m "Update from Google Antigravity"

# push to Github (First fime only)
  git push origin main

## get the latest from github
  git pull origin main
or
  git pull




### 1. Sync Source Code (Git)
Use Git to fetch the latest changes made in the cloud.
- **In Antigravity**: Use the Source Control tab or terminal to run:
  ```bash
  git pull origin main
  ```

### 2. Sync Firebase State (MCP)
If you updated rules or settings in the Firebase Console:
- **Security Rules**: Run `firebase_get_security_rules` to update your local `.rules` files.
- **SDK Config**: Run `firebase_get_sdk_config` to update your local Firebase initialization code.

---

## 🏠 From Antigravity → ☁️ To Firebase Studio

### 1. Sync Source Code (Git)
Push your local code changes so they appear in Firebase Studio.
- **In Antigravity**: Commit your changes and push:
  ```bash
  git add .
  git commit -m "Update from local"
  git push origin main
  ```
- **In Firebase Studio**: The changes will appear once you pull or the environment auto-syncs from the repository.

### 2. Sync Firebase State (MCP)
Push your local configuration to the cloud.
- **Rules/Hosting**: Run `firebase_deploy` to push your local security rules and build artifacts to the live Firebase project.
- **Auth/Database**: Any updates you make via MCP tools (like `auth_update_user` or `realtimedatabase_set_data`) are applied directly to the cloud.

> [!TIP]
> Always check `git status` before pushing to ensure you aren't overwriting someone else's work.

### Build Steps
To build your project, authenticate with Firebase, and deploy (publish) it, you would typically run the following commands in your terminal:

Build the project (creates the dist folder):

npm run build



Authenticate with Firebase (opens a browser window to log in):

firebase login



(If you are already logged in, you can skip this step.)

Deploy to Firebase Hosting:

firebase deploy --only hosting



(To deploy everything including functions and rules, just use firebase deploy)