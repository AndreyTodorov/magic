[![Tests](https://github.com/AndreyTodorov/magic/actions/workflows/test.yml/badge.svg)](https://github.com/AndreyTodorov/magic/actions/workflows/test.yml)

# Magic Mikes Tournament

A comprehensive browser-based tournament management system for Magic: The Gathering supporting multiple tournament formats with real-time synchronization and offline capabilities.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Tournament Formats](#tournament-formats)
- [Deployment](#deployment)
- [Scoring System](#scoring-system)
- [Architecture](#architecture)
- [Browser DevTools](#browser-devtools)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Features

### Core Features
- 🎮 **Best of 3 match format** - Standard Magic: The Gathering match structure
- 👥 **3-12 players support** - Flexible player counts for various tournament sizes
- 🔄 **Real-time sync** - Multi-device synchronization via Firebase Realtime Database
- 💾 **Offline mode** - Full functionality using browser localStorage (standalone mode)
- 📊 **Advanced scoring** - Comprehensive tiebreaker system with 6 levels
- 📱 **Mobile-responsive** - Optimized for desktop, tablet, and mobile devices
- 🏆 **Live standings** - Real-time tournament rankings with detailed statistics
- ⚡ **Fast performance** - Optimized rendering with minimal re-renders

### Tournament Formats

#### 1. Round Robin
- Each player plays a fixed number of matches
- Balanced match distribution algorithm
- Supports 3-12 players
- Configurable matches per player (1-20)
- **Use case:** Swiss-style tournaments, leagues

#### 2. Single Elimination
- Classic bracket tournament
- Power-of-2 player counts only (2, 4, 8, 16, 32)
- Win or go home
- **Use case:** Quick playoffs, championship finals

#### 3. Double Elimination
- Winners and losers brackets
- Two chances to stay in the tournament
- Power-of-2 player counts only (4, 8, 16, 32)
- Grand finals with bracket reset
- **Use case:** Competitive tournaments with second chances

#### 4. Swiss System
- Dynamic pairing based on current standings
- Configurable number of rounds (1-10)
- BYE support for odd player counts
- No repeat pairings
- **Use case:** Large tournaments, GP-style events

#### 5. Group Stage + Playoffs
- Round-robin group play followed by elimination playoffs
- Configurable group sizes (3-6 players per group)
- Top 1 or 2 advance from each group
- **Use case:** Multi-stage competitive events

### User Features
- 🔐 **Email authentication** - Secure user accounts with Firebase Auth
- 👤 **User profiles** - Display names and email management
- 🔗 **Tournament codes** - 8-character codes for easy joining
- 📤 **Code sharing** - One-click copy for easy distribution
- 👁️ **Guest viewing** - View tournaments without authentication
- 🎯 **Creator controls** - Tournament creator has admin privileges
- 📊 **Detailed statistics** - Match win %, opponent strength, game differential

## Quick Start

### Option 1: Standalone Mode (Instant, No Setup)

Perfect for local use, testing, or offline tournaments.

```bash
# Mac
open index-sandalone.html

# Windows
start index-sandalone.html

# Linux
xdg-open index-sandalone.html
```

**Features:**
- ✅ Works completely offline
- ✅ No configuration needed
- ✅ All tournament formats available
- ✅ Data stored in browser localStorage
- ❌ No multi-device sync
- ❌ No remote access

### Option 2: Firebase Mode (Production, Multi-Device)

Full-featured mode with real-time synchronization across devices.

#### Prerequisites
1. Firebase account (free tier works)
2. Web server (Python, Node.js, or any HTTP server)
3. Modern browser with JavaScript enabled

#### Setup Steps

**1. Create Firebase Project**

Visit [Firebase Console](https://console.firebase.google.com/)
- Click "Add project"
- Enter project name
- Disable Google Analytics (optional)
- Click "Create project"

**2. Enable Realtime Database**

- Go to "Realtime Database" in left sidebar
- Click "Create Database"
- Choose location (e.g., `us-central1` or `europe-west1`)
- Start in **test mode** for initial setup

**3. Configure Database Rules**

Go to Realtime Database → Rules tab and paste:

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

> **Note:** These are permissive rules for development. See [FIREBASE_RULES.md](docs/FIREBASE_RULES.md) for production-ready secure rules.

**4. Enable Authentication**

- Go to "Authentication" in left sidebar
- Click "Get started"
- Click "Email/Password" under Sign-in methods
- Enable "Email/Password"
- Save

**5. Get Firebase Configuration**

- Go to Project Settings (gear icon) → General
- Scroll to "Your apps" → Web app
- If no web app exists, click "Add app" (</> icon)
- Copy the firebaseConfig object

**6. Configure Application**

For **local development**, create `js/config.local.js`:

```javascript
const FIREBASE_CONFIG_OVERRIDE = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

const APPCHECK_SITE_KEY_OVERRIDE = "your-recaptcha-site-key"; // Optional
const ENVIRONMENT_OVERRIDE = 'development';
```

For **GitHub Pages deployment**, add as GitHub Secrets:
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `APP_CHECK_SITE_KEY` (optional, for App Check)

**7. Start Local Server**

```bash
# Python (built-in)
python3 -m http.server 8000

# Node.js (requires npx)
npx http-server -p 8000

# PHP (if installed)
php -S localhost:8000
```

**8. Open Application**

Visit `http://localhost:8000` in your browser.

**9. Create Account**

- Click "Sign Up" tab
- Enter display name, email, and password
- Click "Create Account"

**10. Create Tournament**

- Click "Create Tournament"
- Select tournament format
- Enter number of players
- Fill in player names
- Click "Generate Tournament"
- Share the tournament code with other players

## Tournament Formats

### Round Robin

**Overview:** Each player plays a fixed number of matches against different opponents.

**Configuration:**
- Player count: 3-12
- Matches per player: 1-20
- Validation: `(players × matches) % 2 === 0` (total games must be even)

**Algorithm:**
1. Generate all possible pairings
2. Shuffle for randomness
3. Select matches ensuring each player gets exactly N matches
4. Retry up to 1000 times if initial selection fails

**Best for:** League play, Swiss-style tournaments, casual events

**Example:** 8 players, 3 matches each = 12 total matches

### Single Elimination

**Overview:** Classic bracket tournament where one loss eliminates a player.

**Configuration:**
- Player count: Must be power of 2 (2, 4, 8, 16, 32)
- Rounds: log₂(players)

**Structure:**
```
Round 1: 8 → 4 (4 matches)
Round 2: 4 → 2 (2 matches)  [Semi-finals]
Round 3: 2 → 1 (1 match)    [Finals]
```

**Best for:** Quick playoffs, championship finals, time-constrained events

**Example:** 8 players = 3 rounds, 7 total matches

### Double Elimination

**Overview:** Players have two chances; losers drop to losers bracket.

**Configuration:**
- Player count: Must be power of 2 (4, 8, 16, 32)
- Brackets: Winners and Losers
- Grand Finals: Best-of-3 series with bracket reset option

**Structure:**
```
Winners Bracket: Normal elimination
Losers Bracket: Losers from Winners + Losers bracket matches
Grand Finals: Winners champ vs Losers champ
```

**Best for:** Competitive tournaments, fighting game tournaments

**Example:** 8 players = ~14 matches total (varies based on results)

### Swiss System

**Overview:** Dynamic pairing system where players with similar records face each other.

**Configuration:**
- Player count: 3-12 (odd counts supported with BYE)
- Rounds: 1-10
- Pairing algorithm: Based on current standings

**Algorithm:**
1. Round 1: Random or seeded pairing
2. Subsequent rounds: Pair players with similar records
3. Avoid repeat matchings when possible
4. Assign BYE to lowest-ranked player (odd counts)

**Best for:** Large tournaments, Grand Prix-style events, skill-based matchmaking

**Example:** 16 players, 5 rounds = 40 total matches

### Group Stage + Playoffs

**Overview:** Round-robin groups followed by elimination playoffs.

**Configuration:**
- Player count: 8-16 (must be divisible by group size)
- Group sizes: 3-6 players
- Advancement: Top 1 or 2 from each group
- Playoff format: Single elimination

**Structure:**
```
Stage 1: Group Play (round-robin within groups)
Stage 2: Playoffs (single-elimination bracket)
```

**Best for:** Multi-day events, World Cup-style tournaments

**Example:** 12 players → 3 groups of 4 → Top 2 advance → 6-player playoff

## Deployment

### GitHub Pages (Recommended)

The repository includes a GitHub Actions workflow for automatic deployment.

**Setup:**

1. Fork or clone this repository
2. Add Firebase secrets to GitHub (Settings → Secrets and variables → Actions):
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
   - `APP_CHECK_SITE_KEY` (optional)

3. Enable GitHub Pages (Settings → Pages):
   - Source: GitHub Actions
   - Save

4. Push to `main` branch - deployment happens automatically

5. Access your site at `https://username.github.io/repository-name/`

**How it works:**
- Workflow file: `.github/workflows/static.yml`
- On push to `main`, replaces placeholder values in `js/config.js` with secrets
- Deploys to GitHub Pages
- Environment automatically set to `'production'`

### Other Hosting Platforms

**Netlify:**
1. Connect repository
2. Add Firebase secrets as environment variables
3. Build command: None (static site)
4. Publish directory: `/`

**Vercel:**
1. Import repository
2. Add Firebase secrets as environment variables
3. Deploy

**Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Scoring System

### Points System

| Event | Points |
|-------|--------|
| Match Win (2+ game wins) | +3 |
| Game Win | +1 |
| Game Loss | -0.5 |

**Example:** Player wins match 2-1
- Match win: +3
- Game wins (2): +2
- Game loss (1): -0.5
- **Total: +4.5 points**

### Tiebreaker Priority

When players have equal points, tiebreakers are applied in this order:

1. **Total Points** (primary sorting)
2. **Head-to-Head Record** - If two players played each other, winner ranks higher
3. **Quality Score** - Sum of defeated opponents' total points (strength of victories)
4. **Match Win Percentage** - Percentage of matches won
5. **Game Differential** - Games won minus games lost
6. **Total Games Won** - Raw count of game wins

### Tiebreaker Examples

**Scenario 1: Head-to-Head**
```
Player A: 12 pts
Player B: 12 pts
They played each other: A won
Result: A ranks higher than B
```

**Scenario 2: Quality Score**
```
Player A: 12 pts, beat players with 9, 6, 3 pts = Quality: 18
Player B: 12 pts, beat players with 6, 3, 0 pts = Quality: 9
Result: A ranks higher (beat stronger opponents)
```

**Scenario 3: Three-way Tie**
```
Players A, B, C all have 12 pts
A beat B, B beat C, C beat A (circular)
Head-to-head doesn't apply
Falls back to Quality Score
```

### Customizing Scoring

Edit `js/config.js`:

```javascript
APP_CONFIG: {
  SCORING: {
    MATCH_WIN: 3,      // Change match win points
    GAME_WIN: 1,       // Change game win points
    GAME_LOSS: -0.5,   // Change game loss points
  }
}
```

Then update `js/tournament.js` `calculateStandings()` function if tiebreaker logic changes.

## Architecture

### Technology Stack

- **Frontend:** Vanilla JavaScript (ES6+)
- **Database:** Firebase Realtime Database
- **Authentication:** Firebase Auth (Email/Password)
- **Security:** Firebase App Check (optional)
- **Storage:** localStorage (standalone mode)
- **Styling:** CSS3 with CSS variables
- **Testing:** Vitest
- **Deployment:** GitHub Actions → GitHub Pages

### Module Structure

```
┌─────────────────────────────────────────────────────────┐
│                      app.js (App)                       │
│              Main Controller & Orchestrator             │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┼─────────┬─────────────┐
        │         │         │             │
        ▼         ▼         ▼             ▼
   ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐
   │  UI    │ │Tourna- │ │ Storage  │ │ Logger │
   │Manager │ │ment    │ │ Manager  │ │        │
   │        │ │Manager │ │          │ │        │
   └────────┘ └────────┘ └──────────┘ └────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              ┌──────────┐    ┌──────────────┐
              │Firebase  │    │LocalStorage  │
              │Manager   │    │Manager       │
              └──────────┘    └──────────────┘
```

### Key Modules

#### 1. app.js - Main Controller
- Orchestrates all modules
- Handles event listeners
- Manages tournament lifecycle (create, join, leave)
- Coordinates between UI, tournament logic, and storage

#### 2. ui.js - DOM Manipulation
- Caches DOM elements
- Manages view switching (Schedule/Standings/Matches)
- Renders player schedules, standings, match cards
- Handles animations and visual updates

#### 3. tournament.js - Tournament Logic
- Generates balanced match structures
- Calculates player standings with tiebreakers
- Manages scoring system
- Validates match structures

#### 4. tournament-formats.js - Format-Specific Logic
- Implements each tournament format
- Match generation algorithms
- Bracket advancement logic
- Stage transitions

#### 5. firebase.js - Firebase Integration
- Real-time database sync
- Authentication management
- Connection monitoring
- CRUD operations

#### 6. localStorage-manager.js - Offline Storage
- Drop-in replacement for FirebaseManager
- Same API as FirebaseManager
- Browser localStorage persistence
- Simulates listeners for consistency

#### 7. auth.js - Authentication
- Email/password sign-in
- User profile management
- Password reset
- Auth state management

#### 8. logger.js - Logging Utility
- Configurable log levels (0-4)
- Persistent log history (last 100 entries)
- Export logs to JSON
- Browser console integration

#### 9. config.js - Configuration
- Firebase credentials
- App settings (player limits, scoring)
- Environment detection
- Session management

### File Structure

```
magic-mikes/
├── index.html                      # Firebase mode (production)
├── index-sandalone.html            # Standalone mode (offline)
├── favicon.svg                     # App icon
├── css/
│   └── styles.css                 # All styles with CSS variables
├── js/
│   ├── config.js                  # Configuration & credentials
│   ├── logger.js                  # Logging utility
│   ├── auth.js                    # Authentication
│   ├── firebase.js                # Firebase integration
│   ├── localStorage-manager.js    # Local storage fallback
│   ├── tournament.js              # Core tournament logic
│   ├── tournament-formats.js      # Format implementations
│   ├── ui.js                      # DOM rendering
│   └── app.js                     # Main controller
├── tests/                         # Vitest test files
│   ├── setup.js
│   ├── tournament.test.js
│   ├── ui.test.js
│   └── integration.test.js
├── .github/
│   └── workflows/
│       ├── static.yml             # Deployment workflow
│       └── test.yml               # CI testing workflow
├── README.md                      # This file
├── LOCAL-DEV.md                   # Local development guide
├── TESTING.md                     # Testing documentation
├── FIREBASE_RULES.md              # Database security rules
└── CLAUDE.md                      # AI coding assistant guide
```

### Data Model

**Tournament Structure:**
```javascript
{
  // Basic info
  players: ['Alice', 'Bob', 'Charlie'],
  playerCount: 3,
  format: 'round-robin',

  // Round Robin specific
  matchesPerPlayer: 2,

  // Matches
  matches: [
    {
      player1: 0,              // Index in players array
      player2: 1,
      games: [null, null, null], // Best of 3: null=pending, 0/1=winner
      completed: false
    }
  ],

  // Metadata
  creator: 'firebase-uid-123',
  members: {
    'firebase-uid-123': true,
    'firebase-uid-456': true
  },
  createdAt: 1234567890,

  // Format-specific (optional)
  currentStage: 'groups',      // For multi-stage formats
  groups: [...],                // For group stage
  rounds: [...],                // For Swiss
  winnersMatches: [...],        // For double elimination
  losersMatches: [...]
}
```

### Script Load Order

Critical - scripts must load in this exact order:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/12.5.0/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/12.5.0/firebase-auth-compat.js"></script>

<!-- App Scripts (order matters!) -->
<script src="js/config.local.js"></script>  <!-- Optional, dev only -->
<script src="js/logger.js"></script>
<script src="js/config.js"></script>
<script src="js/tournament-formats.js"></script>
<script src="js/auth.js"></script>
<script src="js/firebase.js"></script>
<script src="js/tournament.js"></script>
<script src="js/ui.js"></script>
<script src="js/app.js"></script>
```

## Browser DevTools

Open browser console (F12) to access debugging tools:

### Data Management
```javascript
// View all tournaments in storage
window.devTools.viewTournaments()

// Clear all tournament data
window.devTools.clearTournaments()

// Export tournaments to JSON file
window.devTools.exportTournaments()

// Check storage mode
console.log(firebaseManager.constructor.name)
// "LocalStorageManager" = offline mode
// "FirebaseManager" = online mode
```

### Firebase Diagnostics
```javascript
// Verify Firebase configuration
window.debugFirebaseConfig()
// Shows: environment, config keys, database URL, placeholders check

// Test Firebase connection
window.testFirebaseConnection()
// Tests: initialization, read access, write access, tournaments path

// Both functions provide detailed diagnostics and troubleshooting steps
```

### Logging
```javascript
// Set log level (0=none, 1=error, 2=warn, 3=info, 4=debug)
window.mmLogger.setLevel(3)

// View log history
window.mmLogger.getHistory()

// Export logs to JSON file
window.mmLogger.exportLogs()

// Clear log history
window.mmLogger.clearHistory()
```

### Manual Testing
```javascript
// Get current tournament data
const tournament = app.tournamentManager.getTournamentData()

// Simulate match completion
app.updateMatch(0, [0, 1, 0]) // Match 0: Player 1 wins 2-1

// Get standings
const standings = app.tournamentManager.calculateStandings()

// Check match count per player
app.tournamentManager.matches.forEach((match, i) => {
  console.log(`Match ${i}:`, tournament.players[match.player1], 'vs', tournament.players[match.player2])
})
```

## Troubleshooting

### Firebase Connection Issues

**Symptom:** "Disconnected from Firebase" status

**Diagnosis:**
```javascript
window.testFirebaseConnection()    // Test database access
window.debugFirebaseConfig()       // Verify config loaded
```

**Common Fixes:**

1. **Database doesn't exist**
   - Go to Firebase Console → Realtime Database
   - Click "Create Database"
   - Choose a location
   - Start in test mode

2. **Permission denied**
   - Go to Firebase Console → Realtime Database → Rules
   - Update rules (see [Quick Start](#option-2-firebase-mode-production-multi-device))
   - Click "Publish"

3. **Wrong database URL**
   - Verify `FIREBASE_DATABASE_URL` matches your Firebase region
   - Common formats:
     - US: `https://project-id.firebaseio.com`
     - Europe: `https://project-id-default-rtdb.europe-west1.firebasedatabase.app`
     - Asia: `https://project-id-default-rtdb.asia-southeast1.firebasedatabase.app`

4. **Config placeholders not replaced**
   - Check GitHub Secrets are set correctly
   - Verify GitHub Actions workflow ran successfully
   - Check `window.debugFirebaseConfig()` output

5. **CORS errors**
   - Don't use `file://` protocol - use a web server
   - Ensure server is running on `localhost` or valid domain

### Authentication Issues

**Can't sign in/up:**
- Verify Firebase Authentication is enabled
- Check browser console for specific error codes
- Common errors:
  - `auth/email-already-in-use` - Use different email or sign in
  - `auth/invalid-email` - Check email format
  - `auth/wrong-password` - Use "Forgot Password"
  - `auth/user-not-found` - Sign up first

**Forgot password:**
- Click "Forgot Password" button
- Enter email
- Check email for reset link
- Link expires in 1 hour

### Performance Issues

**Slow rendering:**
- Reduce number of tournaments in storage
- Clear old tournaments: `window.devTools.clearTournaments()`
- Use standalone mode for offline testing

**Page not loading:**
- Check browser console for errors
- Verify all scripts loaded (no 404 errors)
- Check script load order matches [Architecture](#script-load-order)

### Data Issues

**Tournaments not saving:**
- Check localStorage is enabled (not in private browsing)
- Verify Firebase is connected (check status indicator)
- Check browser storage quota (Settings → Site settings → Storage)

**Matches not updating:**
- Check connection status
- Refresh page
- Check browser console for errors

**Standings incorrect:**
- Verify all matches are completed
- Check scoring configuration in `js/config.js`
- Review tiebreaker logic in `js/tournament.js`

### Still Having Issues?

**Workaround: Use Standalone Mode**
```bash
# Works offline, no configuration needed
open index-sandalone.html
```

**Get Help:**
1. Run diagnostics: `window.testFirebaseConnection()`
2. Export logs: `window.mmLogger.exportLogs()`
3. Check [TESTING.md](docs/TESTING.md) for common issues
4. Review [LOCAL-DEV.md](docs/LOCAL-DEV.md) for development setup
5. Open GitHub issue with:
   - Error messages from console
   - Diagnostic output
   - Browser and OS version
   - Steps to reproduce

## Documentation

- **[README.md](README.md)** - This file - overall project documentation
- **[LOCAL-DEV.md](docs/LOCAL-DEV.md)** - Local development setup and workflows
- **[TESTING.md](docs/TESTING.md)** - Comprehensive testing guide
- **[FIREBASE_RULES.md](docs/FIREBASE_RULES.md)** - Production database security rules
- **[CLAUDE.md](CLAUDE.md)** - AI coding assistant guide for Claude Code

## Browser Compatibility

### Supported Browsers

✅ **Fully Supported:**
- Chrome 90+ (recommended)
- Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 90+)

### Requirements

- ES6+ support (arrow functions, classes, modules)
- localStorage API
- Fetch API
- CSS Grid & Flexbox
- CSS Custom Properties (variables)

### Known Issues

- Internet Explorer: Not supported (lacks ES6 support)
- Safari < 14: Partial support (some CSS features missing)
- Opera Mini: Limited support (proxy-based rendering issues)

## Contributing

### Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. See [LOCAL-DEV.md](docs/LOCAL-DEV.md) for development setup

### Development Workflow

1. Write tests first (see [TESTING.md](docs/TESTING.md))
2. Implement feature
3. Run tests: `npm test`
4. Check coverage: `npm run test:coverage`
5. Update documentation
6. Commit changes (use conventional commits)
7. Push to your fork
8. Open a Pull Request

### Code Style

- Use ES6+ features
- Follow existing code structure
- Add JSDoc comments for public methods
- Use meaningful variable names
- Keep functions small and focused
- Avoid deep nesting (max 3 levels)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Swiss tournament format
fix: correct standings tiebreaker calculation
docs: update Firebase setup instructions
test: add tests for double elimination
refactor: simplify match generation algorithm
```

### Testing Requirements

- All new features must have tests
- Maintain >80% code coverage
- Tests must pass before merging
- Include edge case tests

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with vanilla JavaScript (no frameworks)
- Real-time sync powered by Firebase
- Icons and fonts from Google Fonts
- Testing with Vitest
- Inspired by Magic: The Gathering tournament software

---

**Project Status:** Active development

**Version:** 2.0.0

**Last Updated:** 2025-01-16

**Maintainer:** [Andrey Todorov](https://github.com/AndreyTodorov)
