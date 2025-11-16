# Local Development Guide

Comprehensive guide for setting up, developing, debugging, and deploying Magic Mikes Tournament locally.

## Table of Contents

- [Quick Start](#quick-start)
- [Understanding the Two Modes](#understanding-the-two-modes)
- [Project Structure](#project-structure)
- [Setting Up Local Development](#setting-up-local-development)
- [Firebase Setup](#firebase-setup)
- [Firebase Security Rules](#firebase-security-rules)
- [Development Tools](#development-tools)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)
- [Customization](#customization)
- [Testing on Mobile](#testing-on-mobile)
- [Deployment](#deployment)
- [Best Practices](#best-practices)

## Quick Start

### Fastest Way to Start (30 seconds)

**Windows:**
1. Double-click `start-server.bat`
2. Browser opens automatically
3. Done!

**Mac/Linux:**
```bash
chmod +x start-server.sh
./start-server.sh
```

**No Server? No Problem!**

Just double-click `index-sandalone.html` - works immediately with no setup!

## Understanding the Two Modes

### Mode 1: Standalone (localStorage) - RECOMMENDED FOR TESTING

**File:** `index-sandalone.html`

**Pros:**
- ✅ Zero setup - just open the file
- ✅ Works completely offline
- ✅ No server needed
- ✅ No Firebase configuration needed
- ✅ Instant testing
- ✅ Perfect for local development

**Cons:**
- ❌ Data only in your browser (localStorage)
- ❌ Can't sync across devices
- ❌ "Join tournament" only works in same browser

**When to use:**
- Testing new features
- Running automated tests
- Quick demos
- Development without internet
- Learning the codebase

### Mode 2: Firebase (Real-time Database)

**File:** `index.html`

**Pros:**
- ✅ Real-time sync across devices
- ✅ Multiple people can join same tournament
- ✅ Data persists in cloud
- ✅ Production-ready
- ✅ Automatic backups

**Cons:**
- ❌ Requires Firebase setup (~5 minutes first time)
- ❌ Needs internet connection
- ❌ May need local server to avoid CORS issues

**When to use:**
- Production deployment
- Multi-device tournaments
- Testing "join tournament" feature
- After Firebase is configured
- Collaboration with others

## Project Structure

```
magic-mikes-tournament/
├── index.html                    # Production version (requires Firebase)
├── index-sandalone.html          # Local version (works offline)
├── start-server.bat             # Windows quick start
├── start-server.sh              # Mac/Linux quick start
├── css/
│   └── styles.css                # All styles (organized with CSS variables)
├── js/
│   ├── config.js                 # Firebase configuration & app settings
│   ├── logger.js                 # Logging utility
│   ├── firebase.js               # Firebase integration (online mode)
│   ├── localStorage-manager.js   # Local storage fallback (offline mode)
│   ├── tournament.js             # Tournament logic (matches, scoring)
│   ├── ui.js                     # DOM manipulation & rendering
│   └── app.js                    # Main application controller
├── tests/                        # Comprehensive test suite
│   ├── setup.js
│   ├── tournament.test.js
│   ├── ui.test.js
│   ├── localStorage.test.js
│   ├── integration.test.js
│   └── e2e-scenarios.test.js
└── docs/                         # Additional documentation
```

### Critical Script Load Order

Scripts **must** be loaded in this exact order (see HTML files):

```html
<script src="js/config.js"></script>
<script src="js/logger.js"></script>
<script src="js/firebase.js"></script>         <!-- OR localStorage-manager.js -->
<script src="js/tournament.js"></script>
<script src="js/ui.js"></script>
<script src="js/app.js"></script>
<script>
  const app = new App();
  app.init();
</script>
```

**Why this order matters:**
- `config.js` must load first (provides configuration to all modules)
- `logger.js` must load before modules that log
- Storage layer (`firebase.js` or `localStorage-manager.js`) must load before `tournament.js`
- `app.js` must load last (depends on all other modules)

## Setting Up Local Development

### Option A: Instant Start (No Setup)

```bash
# Just open this file:
index-sandalone.html

# Mac
open index-sandalone.html

# Windows
start index-sandalone.html

# Linux
xdg-open index-sandalone.html
```

**That's it!** No installation, no server, nothing.

### Option B: With Local Server (For Firebase Testing)

#### Windows

```batch
# Method 1: Auto-detect (easiest)
start-server.bat

# Method 2: Python (if installed)
python -m http.server 8000

# Method 3: Node.js (if installed)
npx http-server -p 8000
```

#### Mac/Linux

```bash
# Method 1: Auto-detect (easiest)
./start-server.sh

# Method 2: Python 3 (usually pre-installed)
python3 -m http.server 8000

# Method 3: Python 2 (older systems)
python -m SimpleHTTPServer 8000

# Method 4: PHP (if installed)
php -S localhost:8000

# Method 5: Node.js
npx http-server -p 8000
```

Then open: http://localhost:8000

## Firebase Setup

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Enter project name (e.g., "magic-mikes-tournament")
4. Disable Google Analytics (optional, but simpler)
5. Click **"Create project"**

### Step 2: Enable Realtime Database

1. In Firebase Console → **Build** → **Realtime Database**
2. Click **"Create Database"**
3. Choose a location:
   - US Central: `us-central1`
   - Europe West: `europe-west1`
   - Asia Southeast: `asia-southeast1`
4. Start in **"Test mode"** (we'll set proper rules next)
5. Click **"Enable"**
6. **Note the database URL** (shown at the top)
   - Format: `https://PROJECT-ID-default-rtdb.REGION.firebasedatabase.app`

### Step 3: Set Database Security Rules

Go to **Realtime Database** → **Rules** tab and replace with:

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

Click **"Publish"**.

**⚠️ Note:** These rules allow all read/write access. For production, you should add authentication checks. See [Firebase Security Rules](#firebase-security-rules) section below.

### Step 4: Get Firebase Configuration

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **"Your apps"** section
3. Click **"Web"** icon (</>) to add a web app
4. Enter app nickname (e.g., "Magic Mikes Tournament")
5. **Don't** check "Firebase Hosting" (we'll deploy elsewhere)
6. Click **"Register app"**
7. Copy the `firebaseConfig` object

Example:
```javascript
{
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "magic-mikes-abc123.firebaseapp.com",
  databaseURL: "https://magic-mikes-abc123-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "magic-mikes-abc123",
  storageBucket: "magic-mikes-abc123.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
}
```

### Step 5: Update Configuration File

Edit `js/config.js` and replace the `FIREBASE_CONFIG` object:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.REGION.firebasedatabase.app",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

**Important:** Use your **actual** values from Firebase Console, not the placeholders!

### Step 6: Test Firebase Connection

1. Start local server (see above)
2. Open http://localhost:8000
3. Open browser console (F12)
4. Run:
   ```javascript
   window.debugFirebaseConfig()
   window.testFirebaseConnection()
   ```
5. Check for successful connection message

### Step 7: (Optional) Enable App Check

For additional security in production:

1. Firebase Console → **App Check**
2. Click **"Get started"**
3. Register app with **reCAPTCHA v3**
4. Copy the site key
5. Update `js/config.js`:
   ```javascript
   const APPCHECK_CONFIG = {
     SITE_KEY: 'your-recaptcha-site-key',
     ENFORCE: true  // Set to true in production
   };
   ```

## Firebase Security Rules

### Understanding Permissions

**What REQUIRES authentication:**
- ✅ Creating new tournaments
- ✅ Joining tournaments (becoming a member)
- ✅ Modifying tournament settings (players, matchesPerPlayer)

**What DOESN'T require authentication:**
- ✅ Viewing tournaments (public read access)
- ✅ Updating match scores (public write to matches)

**Why allow unauthenticated score updates?**

This design allows spectators, friends, or players without accounts to help record match results during a tournament. The creator can share the tournament code, and anyone can contribute by updating scores - perfect for casual tournaments where not everyone wants to create an account.

### Development Rules (Simple)

Use during development and testing:

```json
{
  "rules": {
    "tournaments": {
      "$tournamentId": {
        ".read": true,
        ".write": "auth != null && !data.exists()",
        "matches": {
          ".write": true
        },
        "members": {
          ".write": "auth != null"
        }
      }
    }
  }
}
```

**What it does:**
- ✅ Anyone can **read** tournaments (public tournaments)
- ✅ Only **authenticated users** can **create** new tournaments
- ✅ **Anyone** can update match scores (no auth required)
- ✅ Only **authenticated users** can join tournaments
- ⚠️ Minimal validation (for faster development)

### Production Rules (Secure)

For production deployment, use more restrictive rules with data validation.

See the complete production rules in `firebase-database-rules.json` (if exists) or contact the project maintainer.

**Security features:**
- Data validation (player count, match structure, etc.)
- Creator-only write access to tournament settings
- Member-only edit access
- Public read access (for joining)
- Public match score updates (for collaboration)

### Testing Rules

```javascript
// Test Read Access (Anyone - No Auth Required)
firebase.database().ref('tournaments/ABC12345').once('value');
// ✅ Works - tournaments are publicly readable

// Test Creating Tournament (Requires Auth)
firebase.database().ref('tournaments/NEW123').set({
  players: ['Player 1'],
  matches: [...],
  creator: 'some-uid'
});
// ❌ Fails - must be authenticated to create tournaments

// Test Match Updates (No Auth Required)
firebase.database()
  .ref('tournaments/ABC12345/matches/0')
  .update({
    games: [0, 1, 0],
    completed: true
  });
// ✅ Works - match updates are public
```

## Development Tools

### Browser DevTools Commands

Open Console (F12) and use:

```javascript
// View all tournaments
window.devTools.viewTournaments()

// Clear all data (fresh start)
window.devTools.clearTournaments()

// Download backup JSON
window.devTools.exportTournaments()

// Check storage mode
console.log(firebaseManager.constructor.name)
// "LocalStorageManager" = offline mode
// "FirebaseManager" = online mode

// Logger commands
window.mmLogger.setLevel(3)        // Set log level (0-4)
window.mmLogger.getHistory()        // View log history
window.mmLogger.exportLogs()        // Download logs
window.mmLogger.clearHistory()      // Clear logs

// Firebase debugging (if using Firebase mode)
window.debugFirebaseConfig()       // Check if config loaded correctly
window.testFirebaseConnection()    // Test database connectivity
```

### Logger Levels

Configure logging detail in `js/config.js`:

```javascript
const LOGGER_CONFIG = {
  LEVEL: 3,  // 0=none, 1=error, 2=warn, 3=info, 4=debug
  MAX_HISTORY: 100,
  PERSIST_HISTORY: true
};
```

**Log Levels:**
- **0 (None)**: No logging (production)
- **1 (Error)**: Only errors
- **2 (Warn)**: Errors + warnings
- **3 (Info)**: Errors + warnings + info (recommended for development)
- **4 (Debug)**: Everything (verbose, for deep debugging)

### VS Code Extensions (Recommended)

- **Live Server** - Auto-refresh on file changes
- **ESLint** - Code quality
- **Prettier** - Code formatting
- **Path Intellisense** - Autocomplete file paths
- **JavaScript (ES6) code snippets** - Speed up coding

## Debugging

### Common Debug Scenarios

#### Data Not Saving

**Symptom:** Changes don't persist after page refresh

**Diagnosis:**
1. Check browser console for errors
2. Run `console.log(firebaseManager.constructor.name)`
3. Check if localStorage is enabled (not in private browsing)

**Solutions:**
- If using Firebase: Check credentials in `js/config.js`
- If using localStorage: Disable private browsing mode
- Check browser's storage settings (some browsers limit localStorage)

#### CORS Errors

**Symptom:** `Access-Control-Allow-Origin` errors in console

**Diagnosis:**
- You're opening `file://` protocol instead of `http://`
- Firebase requires HTTP/HTTPS protocol

**Solutions:**
```bash
# Use local server
python3 -m http.server 8000
# OR
npx http-server -p 8000
```

Then access via http://localhost:8000

#### Styles Not Loading

**Symptom:** Page looks unstyled/broken

**Diagnosis:**
1. Check browser console for 404 errors
2. Verify `css/styles.css` exists
3. Check file path in HTML

**Solutions:**
- Ensure `css/styles.css` file exists
- Check path is relative: `<link rel="stylesheet" href="css/styles.css">`
- Clear browser cache (Ctrl+Shift+Delete)

#### Firebase Not Connecting

**Symptom:** "Disconnected from Firebase" in console

**Diagnosis:**
```javascript
window.debugFirebaseConfig()      // Check config
window.testFirebaseConnection()   // Test connection
```

**Solutions:**
1. **Database doesn't exist:**
   - Go to Firebase Console → Realtime Database
   - Create database if missing

2. **Wrong database URL:**
   - Check URL matches your Firebase region
   - Format: `https://PROJECT-ID-default-rtdb.REGION.firebasedatabase.app`

3. **Wrong database rules:**
   - Set rules as shown in [Firebase Setup](#firebase-setup)
   - Click "Publish" to apply

4. **Config placeholders not replaced:**
   - If `apiKey: "FIREBASE_API_KEY"` (literal string), config wasn't updated
   - Replace with actual values from Firebase Console

5. **GitHub Secrets not configured:**
   - For GitHub Pages deployment, add secrets in repo settings
   - See [Deployment](#deployment) section

#### Match Generation Fails

**Symptom:** "Failed to generate valid match structure" error

**Diagnosis:**
- Check console for specific error message
- Verify player count and matches-per-player settings

**Solutions:**
- Ensure `(player count × matches per player)` is **even**
  - Valid: 6 players × 3 matches = 18 (even)
  - Invalid: 7 players × 3 matches = 21 (odd)
- Try different match-per-player count
- Check `js/tournament.js` for validation logic

### Debug Mode

Enable detailed logging:

```javascript
// In browser console
window.mmLogger.setLevel(4);  // Enable debug mode

// Then perform actions and watch console
```

Or set in `js/config.js`:

```javascript
const LOGGER_CONFIG = {
  LEVEL: 4,  // Debug level
};
```

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| "Cannot read property..." | Check Console for which element is missing |
| Styles not loading | Verify `css/styles.css` exists |
| Firebase not connecting | Use `index-sandalone.html` instead |
| Data disappeared | Check browser didn't clear localStorage |
| CORS error | Use local server OR use standalone version |
| Match generation fails | Ensure (players × matches) is even |
| Tests failing | Run `npm install` and retry |

### Firebase Connection Issues

**Symptom:** "Disconnected from Firebase" / Cannot create tournaments

**Common errors:**
```
⚠ Disconnected from Firebase
FIREBASE WARNING: Missing appcheck token
```

**Solutions:**

1. **Database Doesn't Exist**
   - Go to Firebase Console → Realtime Database
   - Click "Create Database"
   - Choose location and start in Test Mode

2. **Wrong Database Rules**
   - Firebase Console → Realtime Database → Rules
   - Copy rules from [Firebase Setup](#firebase-setup)
   - Click "Publish"

3. **Wrong Database URL**
   - Find correct URL: Firebase Console → Realtime Database → Data tab
   - URL shown at top
   - Update `FIREBASE_DATABASE_URL` in config

4. **GitHub Secrets Not Configured**
   - Required secrets:
     - `FIREBASE_API_KEY`
     - `FIREBASE_AUTH_DOMAIN`
     - `FIREBASE_DATABASE_URL`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_STORAGE_BUCKET`
     - `FIREBASE_MESSAGING_SENDER_ID`
     - `FIREBASE_APP_ID`
     - `APP_CHECK_SITE_KEY` (optional)
   - Add in GitHub → Settings → Secrets and variables → Actions

5. **Config Placeholders Not Replaced**
   - Check `window.debugFirebaseConfig()` output
   - Should show actual values, not "FIREBASE_API_KEY" strings
   - If placeholders remain, GitHub Actions didn't run correctly
   - Push to main branch to trigger new deployment

### App Check Issues

**Symptom:** "Missing appcheck token" warning

This is **expected in development** and won't prevent the app from working if your database rules allow unauthenticated access.

**For production:**
1. Firebase Console → App Check
2. Register site with reCAPTCHA v3
3. Add site key to `APP_CHECK_SITE_KEY`
4. Set `APPCHECK_CONFIG.ENFORCE: true`

### Local Development Config (Optional)

For local development without committing credentials:

1. Copy `js/config.local.js.template` to `js/config.local.js` (if template exists)
2. Edit `js/config.local.js` with your Firebase credentials
3. This file is gitignored and will override production config

**Note:** The "config.local.js not found" message in production is **normal and expected**.

### Still Having Issues?

1. Check browser console for detailed error messages
2. Run `window.testFirebaseConnection()` and share output
3. Verify Firebase project is on Spark (free) plan or higher
4. Ensure Firebase Authentication and Realtime Database are enabled
5. Try standalone mode: `index-sandalone.html`

## Testing on Mobile

### Same Network Testing

1. **Start server on computer:**
   ```bash
   python3 -m http.server 8000
   ```

2. **Find your IP address:**
   ```bash
   # Windows
   ipconfig
   # Look for: IPv4 Address: 192.168.x.x

   # Mac/Linux
   ifconfig | grep inet
   # Look for: inet 192.168.x.x
   ```

3. **On phone, open:**
   ```
   http://YOUR_IP_ADDRESS:8000
   ```
   Example: `http://192.168.1.105:8000`

4. **Important:** Both devices must be on **same WiFi network**

### Mobile Debugging

**iOS Safari:**
1. Settings → Safari → Advanced → Enable "Web Inspector"
2. Connect iPhone to Mac via USB
3. Mac Safari → Develop → [Your iPhone] → [Page name]

**Android Chrome:**
1. Enable Developer Options on phone
2. Enable USB Debugging
3. Connect to computer via USB
4. Chrome on computer → `chrome://inspect`
5. Inspect your page

## Customization

### Change Colors

Edit `css/styles.css`:

```css
:root {
  --color-primary: #667eea;        /* Main purple */
  --color-primary-dark: #764ba2;   /* Dark purple */
  --color-success: #28a745;        /* Green */
  --color-danger: #dc3545;         /* Red */
  --color-warning: #ffc107;        /* Yellow */
  --color-info: #17a2b8;           /* Blue */
  /* Change any of these! */
}
```

### Change Scoring

Edit `js/config.js`:

```javascript
const APP_CONFIG = {
  SCORING: {
    MATCH_WIN: 3,      // Points for winning match
    GAME_WIN: 1,       // Points for winning game
    GAME_LOSS: -0.5,   // Points for losing game
  },
};
```

**Remember to update tests** after changing scoring!

### Change Player Limits

Edit `js/config.js`:

```javascript
const APP_CONFIG = {
  MIN_PLAYERS: 3,     // Minimum players
  MAX_PLAYERS: 12,    // Maximum players
  DEFAULT_PLAYERS: 7, // Default selection
};
```

### Add Custom DevTools Commands

Edit the global `window.devTools` object in `js/app.js`:

```javascript
window.devTools = {
  viewTournaments: () => { /* ... */ },
  clearTournaments: () => { /* ... */ },

  // Add your custom command
  myCustomCommand: () => {
    console.log('Custom command executed!');
    // Your logic here
  }
};
```

Then use in console: `window.devTools.myCustomCommand()`

## Deployment

### GitHub Pages (Free)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Configure GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: main branch
   - Click Save

3. **Access:**
   ```
   https://username.github.io/repository-name
   ```

### Netlify (Free)

**Option 1: Drag and Drop**
1. Go to [netlify.com/drop](https://netlify.com/drop)
2. Drag project folder
3. Done! Auto-generated URL provided

**Option 2: Git Integration**
1. Sign up at [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Connect GitHub repository
4. Build settings:
   - Build command: (leave empty)
   - Publish directory: `/`
5. Click "Deploy site"

### Vercel (Free)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
```

### Firebase Hosting (Free)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Deploy
firebase deploy --only hosting
```

## Data Storage Comparison

| Feature | localStorage | Firebase |
|---------|--------------|----------|
| Setup | None | 5 minutes |
| Storage Limit | 5-10MB | 1GB free |
| Sync | No | Yes |
| Offline | Yes | With cache |
| Speed | Instant | ~100ms |
| Cost | Free | Free tier |
| Persistence | Browser only | Cloud |
| Multi-device | No | Yes |

## Best Practices

### Development Workflow

1. **Use standalone mode for development**
   ```bash
   open index-sandalone.html
   ```

2. **Keep browser console open** (F12)
   - Catch errors immediately
   - Monitor logs in real-time

3. **Export tournaments regularly** if using localStorage
   ```javascript
   window.devTools.exportTournaments()
   ```

4. **Test in incognito mode** to verify fresh user experience
   - No cached data
   - Simulates new user

5. **Use multiple browsers** to simulate different users
   - Chrome for user 1
   - Firefox for user 2
   - Safari for user 3

6. **Run tests before committing**
   ```bash
   npm run test:all
   ```

### Code Organization

1. **Keep modules focused** - Each file has one responsibility
2. **Use descriptive variable names** - Code should be self-documenting
3. **Add comments for complex logic** - Help future you
4. **Follow existing patterns** - Consistency matters
5. **Test new features** - Write tests alongside code

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes, test frequently
npm test

# Commit with clear message
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/my-new-feature
```

### Performance Tips

1. **Minimize DOM manipulation** - Cache elements in UIManager
2. **Batch updates** - Update multiple elements together
3. **Use event delegation** - One listener for multiple elements
4. **Lazy load** - Only render visible content
5. **Debounce frequent operations** - Reduce redundant calculations

## Learning Resources

### HTML/CSS/JS Basics
- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)
- [CSS-Tricks](https://css-tricks.com/)

### Firebase
- [Official Docs](https://firebase.google.com/docs)
- [Realtime Database](https://firebase.google.com/docs/database)
- [Security Rules](https://firebase.google.com/docs/rules)

### Tools
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [VS Code](https://code.visualstudio.com/)
- [Git Documentation](https://git-scm.com/doc)

### Testing
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)

## Questions or Issues?

- Check [README.md](README.md) for project overview
- See [TESTING.md](TESTING.md) for testing guide
- Review [CLAUDE.md](CLAUDE.md) for architecture details
- Check [docs/ISSUES.md](docs/ISSUES.md) for known issues
