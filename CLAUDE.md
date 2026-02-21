# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Magic Mikes Tournament is a browser-based Best of 3 tournament management system for Magic: The Gathering. It supports two modes:
- **Firebase mode** ([index.html](index.html)): Real-time multi-device sync via Firebase Realtime Database
- **Standalone mode** ([index-sandalone.html](index-sandalone.html)): Offline-first using browser localStorage

## Development Commands

### Running Locally

**Quickest start (standalone mode):**
```bash
# Just open the file directly - no server needed
open index-sandalone.html  # Mac
start index-sandalone.html # Windows
```

**With server (required for Firebase mode):**
```bash
# Auto-detect available server
./start-server.sh          # Mac/Linux
start-server.bat           # Windows

# Or manually with Python
python3 -m http.server 8000

# Or manually with Node
npx http-server -p 8000
```

Access at: `http://localhost:8000`

### Testing on Mobile (Same Network)

Find your IP address and access from mobile on same WiFi:
```bash
# Mac/Linux
ifconfig | grep inet

# Windows
ipconfig

# Then access: http://YOUR_IP:8000
```

### Browser DevTools Commands

Open Console (F12) and use:
```javascript
// View all tournaments
window.devTools.viewTournaments()

// Clear all data
window.devTools.clearTournaments()

// Export backup
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
```

## Architecture

### Module Structure

The codebase uses a **modular class-based architecture** with clear separation of concerns:

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

**Key Modules:**

1. **[app.js](js/app.js)** - Main application controller
   - Orchestrates all modules
   - Handles event listeners and user interactions
   - Manages tournament lifecycle (create, join, leave, rejoin)
   - Coordinates between UI, tournament logic, and storage

2. **[ui.js](js/ui.js)** - DOM manipulation and rendering
   - Caches all DOM elements in `elements` object
   - Manages view switching (Schedule/Standings/Matches tabs)
   - Renders player schedules, standings tables, and match cards
   - Handles all visual updates and animations

3. **[tournament.js](js/tournament.js)** - Tournament logic engine
   - Generates balanced match structures using modified round-robin
   - Calculates player standings with tiebreaker rules
   - Manages scoring system (match wins, game wins/losses)
   - Validates match structures (ensures even total games)

4. **Storage Layer** (polymorphic):
   - **[firebase.js](js/firebase.js)** - Firebase Realtime Database integration
     - Real-time sync across devices
     - Anonymous authentication
     - Connection monitoring
     - App Check for security
   - **[localStorage-manager.js](js/localStorage-manager.js)** - Drop-in replacement for offline mode
     - Same API as FirebaseManager
     - Uses browser localStorage
     - Simulates listeners for consistency

5. **[logger.js](js/logger.js)** - Logging utility
   - Configurable log levels (0=none, 1=error, 2=warn, 3=info, 4=debug)
   - Persistent log history (last 100 entries)
   - Export logs to JSON
   - Exposes `window.mmLogger` API

6. **[config.js](js/config.js)** - Configuration constants
   - Firebase credentials
   - App settings (player limits, scoring)
   - Session management

### Data Model

**Tournament Structure:**
```javascript
{
  players: ['Player 1', 'Player 2', ...],
  matches: [
    {
      player1: 0,              // Index in players array
      player2: 1,
      games: [null, null, null], // Best of 3
      completed: false
    }
  ],
  playerCount: 7,
  matchesPerPlayer: 3,
  creator: 'uid-xxx',
  members: { 'uid-xxx': true },
  createdAt: 1234567890
}
```

### Scoring System

Defined in [config.js](js/config.js):
```javascript
SCORING: {
  MATCH_WIN: 3,      // Win 2+ games in match
  GAME_WIN: 1,       // Win individual game
  GAME_LOSS: -0.5,   // Lose individual game
}
```

**Tiebreaker Priority:**
1. Total Points (primary)
2. Match Win Percentage (head-to-head priority if applicable)
3. Opponent Match Win % (OMW)
4. Game Win Percentage
5. Opponent Game Win % (OGW)

### Match Generation Algorithm

Located in [tournament.js](js/tournament.js):

1. **Validation**: Ensures `(players × matches) % 2 === 0` (total games must be even)
2. **Generation**: Modified round-robin with randomization
   - Creates all possible pairings
   - Shuffles for randomness
   - Selects matches ensuring each player gets exactly N matches
   - Retries up to 1000 times if initial selection fails
3. **Balance**: Guarantees equal match distribution across all players

### Storage Abstraction Pattern

Both `FirebaseManager` and `LocalStorageManager` implement the same interface:
```javascript
async initialize()
async tournamentExists(code)
async createTournament(code, data)
async joinTournament(code)
async getTournament(code)
async updateTournament(code, data)
async leaveTournament(code)
subscribeTournament(code, callback)
unsubscribe()
getUserTournaments()          // Returns array of { code, ...tournamentData }
```

This allows the app to work identically in both modes. The mode is determined by which HTML file is opened.

**My Tournaments tracking** (per-mode details):
- **LocalStorageManager**: `getUserTournaments()` returns all locally stored tournaments — every local tournament belongs to the current user.
- **FirebaseManager**: tracks created tournaments in localStorage key `mm_my_tournament_codes` (JSON array of snapshots). Written when `createTournament()` succeeds, removed when `deleteTournament()` is called. Extra helpers: `trackMyTournament(code, snapshot)`, `untrackMyTournament(code)`.

### View State Management

The UI has three switchable views (tabs):
- **Schedule**: Per-player match schedule with completion status
- **Standings**: Ranked leaderboard with detailed tiebreaker info
- **Matches**: All matches with game-by-game result entry

Current view persists to localStorage (`mm_selected_view`) for UX consistency.

### My Tournaments View

Accessible from the mode selector ("My Tournaments" button). Shows a responsive card grid of every tournament the user created. Each card displays:
- Tournament code (monospace, copyable)
- Format and player-count badges
- Match progress bar (completed / total)
- Created date
- Quick actions: **Rejoin**, **Delete**, **Copy Code**

Rendered by `UIManager.renderMyTournaments(tournaments)`. Cards are sorted newest-first. The section is shown via `uiManager.showSection(["modeSelector", "myTournamentsSection"])` so the mode buttons stay visible.

## Firebase Setup

1. Create project at https://console.firebase.google.com/
2. Enable Realtime Database in test mode
3. Set database rules (see [config.js](js/config.js) `DATABASE_RULES`)
4. Copy config from Project Settings → General → Web app
5. Update credentials in [js/config.js](js/config.js)
6. (Optional) Enable App Check with reCAPTCHA

## File Organization

```
├── index.html                 # Firebase mode (production)
├── index-sandalone.html       # Standalone mode (local testing)
├── css/
│   └── styles.css            # All styles with CSS variables
└── js/
    ├── config.js             # Configuration & credentials
    ├── logger.js             # Logging utility
    ├── firebase.js           # Firebase integration
    ├── localStorage-manager.js  # Local storage fallback
    ├── tournament.js         # Tournament logic
    ├── ui.js                 # DOM rendering
    └── app.js                # Main controller (loaded last)
```

**Script Load Order** (critical - see HTML files):
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

## Common Patterns

### Adding a New Feature

1. Determine which module owns the feature (UI vs Tournament logic vs Storage)
2. Add business logic to appropriate manager class
3. Add UI rendering to `UIManager`
4. Wire up event listeners in `App.setupEventListeners()`
5. Test in both standalone and Firebase modes

### Adding a New View/Tab

1. Add HTML structure to both `index.html` and `index-sandalone.html`
2. Add tab button to `#viewTabs`
3. Cache elements in `UIManager.cacheElements()`
4. Add render function in `UIManager` (e.g., `renderNewView()`)
5. Add case in `UIManager.switchView()`
6. Add event listener in `App.setupEventListeners()`

### Modifying Scoring

1. Update `APP_CONFIG.SCORING` in [config.js](js/config.js)
2. Modify `calculateStandings()` in [tournament.js](js/tournament.js)
3. Update scoring legend in HTML if rules change
4. Test tiebreaker scenarios thoroughly

## Known Issues

See [ISSUES.md](ISSUES.md) for tracked issues and planned features.

## Debugging Tips

- **Data not saving**: Check if localStorage is enabled (private browsing disables it)
- **CORS errors**: Use local server instead of `file://` protocol for Firebase mode
- **Styles not loading**: Verify [css/styles.css](css/styles.css) path is correct
- **Firebase not connecting**: Use standalone mode OR check credentials in [config.js](js/config.js)
- **Match generation fails**: Ensure player count × matches-per-player is even
