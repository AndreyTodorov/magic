# Troubleshooting Guide

## Firebase Connection Issues

### Symptom: "Disconnected from Firebase" / Cannot create tournaments

If you see the following errors in your browser console:
```
⚠ Disconnected from Firebase
FIREBASE WARNING: Missing appcheck token
```

### Diagnosis

Open your browser console (F12) and run:
```javascript
window.debugFirebaseConfig()      // Check if config is loaded correctly
window.testFirebaseConnection()   // Test database connectivity
```

### Common Causes & Solutions

#### 1. Database Doesn't Exist

**Check:** Go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Realtime Database

**Fix:**
- If you see "Create Database", click it
- Choose a location (e.g., `europe-west1`)
- Start in **Test Mode** (we'll set proper rules next)

#### 2. Wrong Database Rules

**Check:** Firebase Console → Realtime Database → Rules

**Fix:** Replace the rules with:
```json
{
  "rules": {
    "tournaments": {
      "$tournamentId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["createdAt"],
        "members": {
          ".indexOn": [".value"]
        }
      }
    }
  }
}
```

Then click **Publish**.

⚠️ **Note:** These rules allow all read/write access. For production, you should add authentication checks.

#### 3. Wrong Database URL

**Check:** The database URL in your GitHub Secrets should match your Firebase region.

**Common formats:**
- US Central: `https://PROJECT-ID-default-rtdb.firebaseio.com`
- Europe West: `https://PROJECT-ID-default-rtdb.europe-west1.firebasedatabase.app`
- Asia: `https://PROJECT-ID-default-rtdb.asia-southeast1.firebasedatabase.app`

**Fix:**
1. Go to Firebase Console → Realtime Database → Data tab
2. Copy the URL shown at the top (e.g., `https://magic-mikes-default-rtdb.europe-west1.firebasedatabase.app`)
3. Update your GitHub Secret `FIREBASE_DATABASE_URL` with this exact URL

#### 4. GitHub Secrets Not Configured

**Check:** Your `.github/workflows/static.yml` expects these secrets:
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `APP_CHECK_SITE_KEY`

**Fix:**
1. Go to GitHub → Your Repo → Settings → Secrets and variables → Actions
2. Add each secret with values from Firebase Console → Project Settings → General → Your apps → Web app config

#### 5. Config Placeholders Not Replaced

If `window.debugFirebaseConfig()` shows `apiKey: "FIREBASE_API_KEY"` (with the literal text instead of your actual key), the GitHub Actions replacement didn't work.

**Fix:**
1. Verify all GitHub Secrets are set correctly
2. Trigger a new deployment: push to main branch
3. Check GitHub Actions logs to see if the sed commands ran successfully

## App Check Issues

### Symptom: "Missing appcheck token" warning

This is **expected in development** and won't prevent the app from working if your database rules allow unauthenticated access.

**For production:**
1. Go to Firebase Console → App Check
2. Register your site with reCAPTCHA v3
3. Add the site key to your `APP_CHECK_SITE_KEY` GitHub Secret
4. Set `APPCHECK_CONFIG.ENFORCE: true` in `js/config.js`

## Authentication Issues

### Symptom: Cannot sign in / sign up

**Check browser console for specific error codes:**

- `auth/email-already-in-use` → Use a different email or sign in instead
- `auth/invalid-email` → Check email format
- `auth/wrong-password` → Incorrect password, use "Forgot Password"
- `auth/user-not-found` → Sign up first
- `auth/network-request-failed` → Check internet connection

## Local Development

### Using Local Config (Optional)

For local development, you can avoid committing credentials:

1. Copy `js/config.local.js.template` (if it exists) to `js/config.local.js`
2. Edit `js/config.local.js` with your Firebase credentials
3. This file is gitignored and will override production config

**Note:** The "config.local.js not found" message in production is **normal and expected**.

## Standalone Mode (Offline)

If Firebase is giving you trouble, you can use the standalone version:

1. Open `index-sandalone.html` instead of `index.html`
2. This uses localStorage instead of Firebase
3. Works offline but data isn't synced across devices

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Run `window.testFirebaseConnection()` and share the output
3. Verify your Firebase project is on the Spark (free) plan or higher
4. Make sure Firebase Authentication and Realtime Database are enabled in your Firebase Console
