# Local Development Guide

Comprehensive guide for developing Magic Mikes Tournament locally.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Modes](#development-modes)
- [Firebase Setup](#firebase-setup)
- [Configuration](#configuration)
- [Development Workflow](#development-workflow)
- [Code Structure](#code-structure)
- [Adding Features](#adding-features)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

**1. Web Browser**
- Chrome 90+ (recommended for DevTools)
- Firefox 88+
- Safari 14+

**2. Text Editor/IDE**
- VS Code (recommended)
- WebStorm
- Sublime Text
- Any text editor

**3. HTTP Server** (choose one)

**Python** (usually pre-installed on Mac/Linux):
```bash
python3 --version  # Check if installed
```

**Node.js** (for npx http-server):
```bash
node --version  # Check if installed
npm install -g http-server  # Install http-server
```

**PHP** (if available):
```bash
php --version  # Check if installed
```

### Recommended VS Code Extensions

- **Live Server** - Auto-reload on file changes
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **GitLens** - Git insights
- **Path Intellisense** - Autocomplete file paths
- **JavaScript (ES6) code snippets** - Code snippets

Install via VS Code Extensions marketplace.

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/AndreyTodorov/magic.git
cd magic
```

### 2. Install Dependencies (Optional, for Testing)

```bash
# Only needed if you want to run unit tests
npm install
```

### 3. Choose Development Mode

You have two options:

**Option A: Standalone Mode** (Simplest, offline)
- No configuration needed
- Works offline
- Data stored in localStorage
- No multi-device sync

**Option B: Firebase Mode** (Full-featured)
- Requires Firebase setup
- Real-time sync
- Multi-device support
- Requires internet

## Development Modes

### Standalone Mode (Offline)

**1. Open file directly:**
```bash
# Mac
open index-sandalone.html

# Windows
start index-sandalone.html

# Linux
xdg-open index-sandalone.html
```

**Features:**
✅ Instant start
✅ No configuration
✅ Full tournament functionality
✅ Works offline
❌ No Firebase sync
❌ No remote access

**Use cases:**
- Local testing
- Offline tournaments
- Quick prototyping
- Feature development

### Firebase Mode (Online)

**1. Start local server:**

```bash
# Python (recommended)
python3 -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

**2. Open in browser:**
```
http://localhost:8000
```

**Features:**
✅ Real-time sync
✅ Multi-device support
✅ Authentication
✅ Remote access
❌ Requires configuration
❌ Requires internet

**Use cases:**
- Testing Firebase features
- Multi-device testing
- Production-like environment

## Firebase Setup

### Create Firebase Project

**1. Go to [Firebase Console](https://console.firebase.google.com/)**

**2. Create New Project:**
- Click "Add project"
- Enter project name (e.g., "magic-mikes-dev")
- Disable Google Analytics (optional)
- Click "Create project"

**3. Enable Realtime Database:**
- Navigate to "Realtime Database" in sidebar
- Click "Create Database"
- Choose location (e.g., `us-central1` or `europe-west1`)
- Start in **test mode**

**4. Set Database Rules:**

Go to Realtime Database → Rules tab:

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

Click **Publish**.

> **Note:** These are permissive rules for development. See [FIREBASE_RULES.md](FIREBASE_RULES.md) for production rules.

**5. Enable Authentication:**
- Go to "Authentication" → "Get started"
- Click "Email/Password" under Sign-in methods
- Enable "Email/Password"
- Save

**6. Get Configuration:**
- Go to Project Settings (⚙️) → General
- Scroll to "Your apps"
- If no web app, click "Add app" (</> icon)
- Register app (nickname: "Magic Mikes Dev")
- Copy the `firebaseConfig` object

## Configuration

### Local Configuration File

Create `js/config.local.js` (gitignored):

```javascript
/**
 * LOCAL DEVELOPMENT CONFIGURATION
 * This file is gitignored and only used for local development
 */

const FIREBASE_CONFIG_OVERRIDE = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

// Optional: Override App Check site key
const APPCHECK_SITE_KEY_OVERRIDE = "your-recaptcha-site-key";

// Force development environment
const ENVIRONMENT_OVERRIDE = 'development';
```

**Why use config.local.js?**
- ✅ Keeps credentials out of git
- ✅ Each developer has their own Firebase project
- ✅ Production config remains in `config.js`
- ✅ No accidental commits of secrets

### Configuration Priority

```
1. config.local.js (highest priority, local dev only)
2. config.js with placeholders (default, replaced in production)
3. Environment detection (fallback)
```

### Environment Detection

The app automatically detects environment:

```javascript
// Development: localhost, 127.0.0.1, 192.168.*
ENVIRONMENT = 'development'

// Production: GitHub Pages, custom domain
ENVIRONMENT = 'production'
```

**Development mode:**
- App Check disabled
- More verbose logging
- Dev-friendly error messages

**Production mode:**
- App Check enabled (if configured)
- Minimal logging
- User-friendly error messages

## Development Workflow

### Starting Development

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Start local server
python3 -m http.server 8000

# 4. Open in browser
# http://localhost:8000

# 5. Start coding!
```

### Making Changes

**1. Edit files:**
- Use your preferred editor
- Changes to JS/CSS/HTML

**2. Reload browser:**
- Manual: Ctrl+R / Cmd+R
- Auto: Use Live Server extension

**3. Check browser console:**
- F12 → Console tab
- Look for errors/warnings

**4. Test changes:**
- Manually test feature
- Run unit tests: `npm test`

### Testing Changes

**Unit Tests:**
```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Check coverage
npm run test:coverage
```

**Manual Testing:**
- Create tournament
- Update matches
- Check standings
- Test edge cases
- Test on mobile (same WiFi)

**Browser Testing:**
```bash
# Start server
python3 -m http.server 8000

# Open test runner
http://localhost:8000/test-runner.html
```

### Committing Changes

```bash
# 1. Check what changed
git status
git diff

# 2. Stage changes
git add file1.js file2.css

# 3. Commit with conventional message
git commit -m "feat: add Swiss tournament format"
git commit -m "fix: correct standings tiebreaker"
git commit -m "docs: update README"

# 4. Push to remote
git push origin feature/my-feature

# 5. Create Pull Request on GitHub
```

**Conventional Commit Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

### Code Review Process

1. Create Pull Request
2. Wait for CI tests to pass
3. Request review from maintainer
4. Address feedback
5. Merge when approved

## Code Structure

### Project Layout

```
magic-mikes/
├── index.html                 # Firebase mode entry point
├── index-sandalone.html       # Standalone mode entry point
├── favicon.svg                # App icon
│
├── css/
│   └── styles.css             # All styles (CSS variables)
│
├── js/
│   ├── config.js              # Main configuration
│   ├── config.local.js        # Local overrides (gitignored)
│   ├── logger.js              # Logging utility
│   ├── auth.js                # Authentication
│   ├── firebase.js            # Firebase manager
│   ├── localStorage-manager.js # Local storage manager
│   ├── tournament.js          # Core tournament logic
│   ├── tournament-formats.js  # Format implementations
│   ├── ui.js                  # UI rendering
│   └── app.js                 # Main app controller
│
├── tests/                     # Vitest tests
│   ├── setup.js
│   ├── tournament.test.js
│   ├── ui.test.js
│   └── integration.test.js
│
├── .github/
│   └── workflows/
│       ├── static.yml         # Deploy to GitHub Pages
│       └── test.yml           # Run tests on CI
│
├── README.md                  # Project documentation
├── LOCAL-DEV.md               # This file
├── TESTING.md                 # Testing guide
├── FIREBASE_RULES.md          # Database rules
└── CLAUDE.md                  # AI assistant guide
```

### Module Responsibilities

**app.js** - Main Controller
```javascript
class App {
  init()                    // Initialize app
  createTournament()        // Create new tournament
  joinTournament()          // Join existing tournament
  updateMatch()             // Update match results
  advanceStage()            // Move to next stage
  // Event handlers, coordination
}
```

**tournament.js** - Tournament Logic
```javascript
class TournamentManager {
  createTournament()        // Initialize tournament data
  generateMatches()         // Create match structure
  calculateStandings()      // Calculate rankings
  advanceWinner()           // Handle bracket advancement
  // Core tournament algorithms
}
```

**ui.js** - UI Rendering
```javascript
class UIManager {
  renderMatches()           // Display match cards
  renderStandings()         // Display standings table
  renderSchedule()          // Display player schedules
  switchView()              // Change active tab
  // All DOM manipulation
}
```

**firebase.js** - Database Integration
```javascript
class FirebaseManager {
  initialize()              // Connect to Firebase
  createTournament()        // Save tournament
  updateTournament()        // Update tournament
  onTournamentUpdate()      // Listen for changes
  // Firebase CRUD operations
}
```

**tournament-formats.js** - Format Implementations
```javascript
class RoundRobinFormat {
  generateMatches()         // Create balanced matches
  validateConfiguration()   // Check player/match counts
}

class SingleEliminationFormat {
  generateBracket()         // Create elimination bracket
  advanceWinner()           // Move winner to next round
}

class SwissFormat {
  generateRound()           // Create Swiss pairings
  pairPlayers()             // Match similar records
}

// ... other formats
```

### Data Flow

```
User Action → App → TournamentManager → FirebaseManager → Firebase
                ↓                            ↓
              UIManager                  Tournament Update
                ↓                            ↓
           DOM Update ← App ← TournamentManager
```

**Example: Updating Match**
```
1. User clicks game winner button
2. App.handleGameClick() receives event
3. App.updateMatch() updates tournament data
4. FirebaseManager.updateTournament() saves to database
5. Firebase triggers onTournamentUpdate() listener
6. TournamentManager updates local state
7. TournamentManager.calculateStandings() recalculates
8. UIManager.renderMatches() updates DOM
9. UIManager.renderStandings() updates DOM
```

## Adding Features

### Example: Adding New Tournament Format

**1. Define format in tournament-formats.js:**

```javascript
class MyNewFormat {
  constructor(players, config) {
    this.players = players;
    this.config = config;
  }

  validateConfiguration() {
    // Validate player count, config options
    if (this.players.length < 4) {
      throw new Error('Minimum 4 players required');
    }
  }

  generateMatches() {
    // Create match structure
    const matches = [];
    // ... match generation logic
    return matches;
  }

  // Other format-specific methods
}
```

**2. Register format in config.js:**

```javascript
APP_CONFIG: {
  FORMATS: {
    'my-new-format': {
      name: 'My New Format',
      description: 'Description of format',
      minPlayers: 4,
      maxPlayers: 12,
      requiresEvenPlayers: false
    }
  }
}
```

**3. Add UI for format selection:**

Update `index.html` and `index-sandalone.html`:

```html
<div class="format-card" data-format="my-new-format">
  <h3>My New Format</h3>
  <p>Description here</p>
</div>
```

**4. Handle format in TournamentManager:**

```javascript
createTournament(players, matchesPerPlayer, format, options = {}) {
  switch (format) {
    case 'my-new-format':
      const formatter = new MyNewFormat(players, options);
      formatter.validateConfiguration();
      this.tournament.matches = formatter.generateMatches();
      break;
    // ... other formats
  }
}
```

**5. Write tests:**

```javascript
describe('My New Format', () => {
  it('should generate valid matches', () => {
    const format = new MyNewFormat(['A', 'B', 'C', 'D'], {});
    const matches = format.generateMatches();
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should validate configuration', () => {
    expect(() => {
      new MyNewFormat(['A', 'B'], {});  // Too few players
    }).toThrow();
  });
});
```

**6. Test manually:**
- Create tournament with new format
- Verify matches generated correctly
- Test advancement logic (if applicable)
- Check standings calculation

### Example: Adding New View/Tab

**1. Add HTML structure:**

```html
<button class="tab-btn" data-view="my-view">My View</button>

<div id="myView" class="view-content" style="display: none;">
  <!-- View content here -->
</div>
```

**2. Cache elements in UIManager:**

```javascript
cacheElements() {
  this.elements = {
    // ... existing elements
    myView: document.getElementById('myView'),
    tabMyView: document.querySelector('[data-view="my-view"]')
  };
}
```

**3. Add render function:**

```javascript
renderMyView(data) {
  const html = data.map(item => `
    <div class="my-item">
      ${item.name}
    </div>
  `).join('');

  this.elements.myView.innerHTML = html;
}
```

**4. Handle view switching:**

```javascript
switchView(viewName) {
  // ... existing logic

  if (viewName === 'my-view') {
    this.renderMyView(this.tournamentManager.getMyData());
  }
}
```

**5. Add event listener:**

```javascript
setupEventListeners() {
  // ... existing listeners

  this.elements.tabMyView.addEventListener('click', () => {
    this.uiManager.switchView('my-view');
  });
}
```

## Debugging

### Browser DevTools

**Open Console** (F12 or Cmd+Option+I)

**Useful commands:**
```javascript
// View tournament data
app.tournamentManager.tournament

// View matches
app.tournamentManager.matches

// View standings
app.tournamentManager.calculateStandings()

// Test Firebase connection
window.testFirebaseConnection()

// Check configuration
window.debugFirebaseConfig()

// View all tournaments (localStorage/Firebase)
window.devTools.viewTournaments()

// Export logs
window.mmLogger.exportLogs()
```

### Logging Levels

Set log level in browser console:

```javascript
// 0 = None
// 1 = Error only
// 2 = Error + Warn
// 3 = Error + Warn + Info
// 4 = All (including debug)

window.mmLogger.setLevel(4)  // Show all logs
```

### Breakpoints

**1. Add debugger statement:**
```javascript
function calculateStandings() {
  debugger;  // Execution will pause here
  // ... rest of function
}
```

**2. Set breakpoint in DevTools:**
- Open Sources tab
- Find file (js/tournament.js)
- Click line number to set breakpoint

### Network Monitoring

**Monitor Firebase requests:**
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket) or "Fetch/XHR"
3. Watch for database reads/writes

**Check for errors:**
- Look for red entries (failed requests)
- Check response codes (200 = OK, 404 = Not Found, 403 = Forbidden)

### Common Debug Scenarios

**Matches not saving:**
```javascript
// Check Firebase connection
window.testFirebaseConnection()

// Check tournament code
console.log(app.currentTournamentCode)

// Check update method
app.updateMatch(0, [0, 1, 0])  // Manually update match 0
```

**Standings incorrect:**
```javascript
// Get raw standings data
const standings = app.tournamentManager.calculateStandings()
console.table(standings)

// Check individual player
const player = standings.find(s => s.name === 'Alice')
console.log(player)
```

**UI not updating:**
```javascript
// Force render
app.uiManager.renderMatches(
  app.tournamentManager.matches,
  app.tournamentManager.tournament.players
)

// Check if elements exist
console.log(app.uiManager.elements.matchesContainer)
```

## Common Tasks

### Reset Local Data

```javascript
// Clear all tournaments
window.devTools.clearTournaments()

// Clear specific tournament
localStorage.removeItem('currentTournament')
localStorage.removeItem('isCreator')
```

### Export Tournament Data

```javascript
// Export all tournaments to JSON file
window.devTools.exportTournaments()

// Manually get tournament data
const code = app.currentTournamentCode
const data = await firebaseManager.getTournament(code)
console.log(JSON.stringify(data, null, 2))
```

### Simulate Match Results

```javascript
// Complete all matches with random results
app.tournamentManager.matches.forEach((match, i) => {
  const winner = Math.random() < 0.5 ? 0 : 1
  const games = winner === 0 ? [0, 1, 0] : [1, 0, 1]
  app.updateMatch(i, games)
})
```

### Test on Mobile Device

**1. Find your IP address:**

```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

**2. Start server:**
```bash
python3 -m http.server 8000
```

**3. Access from mobile (same WiFi):**
```
http://YOUR_IP:8000
```

Example: `http://192.168.1.100:8000`

### Update Scoring System

**Edit js/config.js:**
```javascript
APP_CONFIG: {
  SCORING: {
    MATCH_WIN: 3,      // Change this
    GAME_WIN: 1,       // Change this
    GAME_LOSS: -0.5,   // Change this
  }
}
```

**Update calculateStandings() if needed:**

If you change the scoring model (e.g., remove game loss penalty), update the calculation logic in `js/tournament.js`.

## Performance Optimization

### Minimize Re-renders

**Bad:**
```javascript
// Renders on every update
matches.forEach(match => {
  renderMatch(match)
})
```

**Good:**
```javascript
// Batch render once
const html = matches.map(match => renderMatchHTML(match)).join('')
container.innerHTML = html
```

### Cache DOM Elements

**Bad:**
```javascript
// Queries DOM every time
function updateMatch() {
  document.getElementById('match').textContent = 'Updated'
}
```

**Good:**
```javascript
// Cache on init
this.elements = {
  match: document.getElementById('match')
}

function updateMatch() {
  this.elements.match.textContent = 'Updated'
}
```

### Debounce Events

**For search/filter inputs:**
```javascript
let debounceTimer
input.addEventListener('input', (e) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    filterTournaments(e.target.value)
  }, 300)
})
```

### Lazy Load Data

**Only fetch what's needed:**
```javascript
// Don't fetch all tournaments on load
// Fetch on demand
async viewTournament(code) {
  const data = await firebaseManager.getTournament(code)
  this.renderTournament(data)
}
```

## Troubleshooting

### Server Won't Start

**Python:**
```bash
# Try different port
python3 -m http.server 3000

# Check if port is in use
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows
```

**Node.js:**
```bash
# Install http-server globally
npm install -g http-server

# Start server
http-server -p 8000
```

### Firebase Connection Issues

**Check configuration:**
```javascript
window.debugFirebaseConfig()
```

**Test connection:**
```javascript
window.testFirebaseConnection()
```

**Common issues:**
- Wrong database URL (check region)
- Incorrect database rules
- Database doesn't exist
- App Check blocking (disable in dev)

### CORS Errors

**Cause:** Using `file://` protocol

**Fix:** Use HTTP server
```bash
python3 -m http.server 8000
```

### localStorage Full

**Check storage:**
```javascript
// Check used space
const used = JSON.stringify(localStorage).length
console.log(`Using ${(used / 1024 / 1024).toFixed(2)} MB`)
```

**Clear old data:**
```javascript
window.devTools.clearTournaments()
```

### Git Issues

**Accidentally committed config.local.js:**
```bash
# Remove from git but keep file
git rm --cached js/config.local.js
git commit -m "Remove config.local.js from tracking"
```

**Merge conflicts:**
```bash
# Pull latest
git pull origin main

# Resolve conflicts in files
# Look for <<<<<<< HEAD markers

# After resolving
git add .
git commit -m "Resolve merge conflicts"
```

### Tests Failing

**Run specific test:**
```bash
npx vitest run tests/tournament.test.js
```

**Check for async issues:**
```javascript
// Make sure to await
it('should update tournament', async () => {
  await app.updateMatch(0, [0, 1, 0])  // Must await!
  expect(...).toBe(...)
})
```

**Clear test environment:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

**Last Updated:** 2025-01-16

**For Questions:**
- Check [README.md](../README.md) for project overview
- Check [TESTING.md](TESTING.md) for testing guide
- Check [FIREBASE_RULES.md](FIREBASE_RULES.md) for database rules
- Open a GitHub issue for bugs/features
