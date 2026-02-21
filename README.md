# Magic Mikes Tournament

[![Tests](https://github.com/AndreyTodorov/magic/actions/workflows/test.yml/badge.svg)](https://github.com/AndreyTodorov/magic/actions/workflows/test.yml)

A browser-based Best of 3 tournament management system for Magic: The Gathering, featuring real-time multi-device sync and offline capabilities.

## Features

- **Best of 3 Match Format** - Designed specifically for MTG tournament structure
- **Multi-Player Support** - Tournaments for 3-12 players
- **Dual Mode Architecture**:
  - **Firebase Mode** - Real-time sync across multiple devices
  - **Standalone Mode** - Offline-first using browser localStorage
- **Advanced Scoring** - Match wins, game wins/losses with comprehensive tiebreaker system
- **Mobile-Friendly** - Responsive design works on phones and tablets
- **Live Standings** - Real-time rankings with detailed tiebreaker information
- **Multiple Views** - Schedule, Standings, and Matches tabs for easy navigation
- **My Tournaments** - Card list of all tournaments you created with quick Rejoin, Delete, and Copy Code actions
- **Fast Performance** - Optimized rendering and caching

## Quick Start

### Standalone Mode (No Setup Required)

The fastest way to get started - simply open the standalone HTML file:

```bash
# Mac
open index-sandalone.html

# Windows
start index-sandalone.html

# Linux
xdg-open index-sandalone.html
```

**No server, no configuration, no internet required!**

### Firebase Mode (Multi-Device Sync)

For tournaments where multiple people need to access the same data:

1. Set up Firebase (see [LOCAL-DEV.md](docs/LOCAL-DEV.md) for detailed instructions)
2. Update `js/config.js` with your Firebase credentials
3. Start a local server:

```bash
# Auto-detect available server
./start-server.sh          # Mac/Linux
start-server.bat           # Windows

# Or manually with Python
python3 -m http.server 8000

# Or with Node.js
npx http-server -p 8000
```

4. Open http://localhost:8000

## Documentation

- **[LOCAL-DEV.md](docs/LOCAL-DEV.md)** - Local development setup, Firebase configuration, debugging, and troubleshooting
- **[TESTING.md](docs/TESTING.md)** - Comprehensive testing guide with unit, integration, and functional tests
- **[CLAUDE.md](CLAUDE.md)** - Architecture reference for AI assistants (Claude Code)

## Architecture Overview

The application uses a **modular class-based architecture** with clear separation of concerns:

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

1. **app.js** - Main application controller
   - Orchestrates all modules
   - Handles event listeners and user interactions
   - Manages tournament lifecycle (create, join, leave, rejoin)

2. **ui.js** - DOM manipulation and rendering
   - Caches all DOM elements
   - Manages view switching (Schedule/Standings/Matches tabs)
   - Renders player schedules, standings tables, and match cards

3. **tournament.js** - Tournament logic engine
   - Generates balanced match structures using modified round-robin
   - Calculates player standings with tiebreaker rules
   - Validates match structures and scoring

4. **Storage Layer** (polymorphic)
   - **firebase.js** - Firebase Realtime Database integration
   - **localStorage-manager.js** - Drop-in replacement for offline mode
   - Both implement identical interfaces for seamless mode switching

5. **logger.js** - Logging utility
   - Configurable log levels (0=none, 1=error, 2=warn, 3=info, 4=debug)
   - Persistent log history
   - Export capabilities

6. **config.js** - Configuration constants
   - Firebase credentials
   - App settings (player limits, scoring)
   - Session management

## Data Model

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

## Scoring System

Points are calculated as follows:

- **Match Win**: +3 points (win 2+ games in match)
- **Game Win**: +1 point per game won
- **Game Loss**: -0.5 points per game lost

**Example Results:**
- Win 2-0: 5.0 points (3 + 2×1)
- Win 2-1: 4.5 points (3 + 2×1 - 0.5)
- Loss 1-2: 0.0 points (1 - 2×0.5)
- Loss 0-2: -1.0 points (-2×0.5)

### Tiebreaker Priority

When players have equal points, rankings are determined by:

1. **Total Points** (primary)
2. **Match Win Percentage** (head-to-head priority if applicable)
3. **Opponent Match Win %** (OMW)
4. **Game Win Percentage**
5. **Opponent Game Win %** (OGW)

## Browser DevTools

Open the browser console (F12) for debugging and data management:

```javascript
// View all tournaments
window.devTools.viewTournaments();

// Clear all data
window.devTools.clearTournaments();

// Export backup
window.devTools.exportTournaments();

// Check storage mode
console.log(firebaseManager.constructor.name);
// "LocalStorageManager" = offline mode
// "FirebaseManager" = online mode

// Logger commands
window.mmLogger.setLevel(3);        // Set log level (0-4)
window.mmLogger.getHistory();        // View log history
window.mmLogger.exportLogs();        // Download logs
window.mmLogger.clearHistory();      // Clear logs
```

## Project Structure

```
├── index.html                 # Firebase mode (production)
├── index-sandalone.html       # Standalone mode (offline testing)
├── start-server.sh            # Quick start script (Mac/Linux)
├── start-server.bat           # Quick start script (Windows)
├── css/
│   └── styles.css            # All styles with CSS variables
├── js/
│   ├── config.js             # Configuration & credentials
│   ├── logger.js             # Logging utility
│   ├── firebase.js           # Firebase integration
│   ├── localStorage-manager.js  # Local storage fallback
│   ├── tournament.js         # Tournament logic
│   ├── ui.js                 # DOM rendering
│   └── app.js                # Main controller (loaded last)
├── tests/                    # Comprehensive test suite
│   ├── setup.js
│   ├── tournament.test.js
│   ├── ui.test.js
│   ├── localStorage.test.js
│   ├── integration.test.js
│   └── e2e-scenarios.test.js
└── docs/                     # Additional documentation
```

### Critical Script Load Order

Scripts must be loaded in this exact order (see HTML files):

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

## Testing

The project includes comprehensive test coverage with unit tests, integration tests, and functional tournament simulations.

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with visual UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run comprehensive test suite (Vitest + Functional)
npm run test:all
```

### Test Coverage

- **Unit Tests**: TournamentManager, UIManager, LocalStorageManager
- **Integration Tests**: App class and component interactions
- **E2E Scenarios**: Complete user workflows and edge cases
- **Functional Tests**: All tournament formats and configurations
- **Total**: 190+ test scenarios

See [TESTING.md](docs/TESTING.md) for detailed testing documentation.

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Requirements:**
- ES6+ support
- localStorage
- Fetch API

## Development

### Adding New Features

1. Write tests first (TDD recommended)
2. Implement feature in appropriate module (ui.js, tournament.js, etc.)
3. Add UI rendering to UIManager if needed
4. Wire up event listeners in App.setupEventListeners()
5. Run tests: `npm test`
6. Test in both standalone and Firebase modes
7. Check coverage: `npm run test:coverage`
8. Update documentation

### Adding a New View/Tab

1. Add HTML structure to both `index.html` and `index-sandalone.html`
2. Add tab button to `#viewTabs`
3. Cache elements in `UIManager.cacheElements()`
4. Add render function in `UIManager` (e.g., `renderNewView()`)
5. Add case in `UIManager.switchView()`
6. Add event listener in `App.setupEventListeners()`

### Modifying Scoring

1. Update `APP_CONFIG.SCORING` in `js/config.js`
2. Modify `calculateStandings()` in `js/tournament.js`
3. Update scoring legend in HTML if rules change
4. Test tiebreaker scenarios thoroughly

## Match Generation Algorithm

Located in `js/tournament.js`:

1. **Validation**: Ensures `(players × matches) % 2 === 0` (total games must be even)
2. **Generation**: Modified round-robin with randomization
   - Creates all possible pairings
   - Shuffles for randomness
   - Selects matches ensuring each player gets exactly N matches
   - Retries up to 1000 times if initial selection fails
3. **Balance**: Guarantees equal match distribution across all players

## Deployment

### GitHub Pages

1. Push your code to GitHub
2. Go to Settings → Pages
3. Set source to main branch
4. Access at: `https://username.github.io/repository-name`

### Netlify

1. Drag project folder to [netlify.com/drop](https://netlify.com/drop)
2. Done! Auto-generated URL provided

### Vercel

```bash
npm i -g vercel
vercel
# Follow prompts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass: `npm run test:all`
5. Update documentation
6. Submit a pull request

## Known Issues and Roadmap

Track active issues and planned features in [docs/ISSUES.md](docs/ISSUES.md):

- [ ] Add "Best of X" dropdown for configurable match format
- [ ] Lock completed matches with unlock confirmation
- [ ] Show finished matches at bottom of list
- [ ] Improve join tournament button behavior
- [x] Three-tab view for quick switching
- [x] Player schedule completion indicators
- [x] Tournament membership enforcement
- [x] My Tournaments card list with quick actions (Rejoin, Delete, Copy Code)

## Troubleshooting

See [LOCAL-DEV.md](docs/LOCAL-DEV.md) for comprehensive troubleshooting:

- Data not saving → Check localStorage enabled
- CORS errors → Use local server instead of `file://` protocol
- Styles not loading → Verify `css/styles.css` path
- Firebase not connecting → Use standalone mode or check credentials
- Match generation fails → Ensure (player count × matches per player) is even

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built with vanilla JavaScript (no frameworks)
- Uses Firebase Realtime Database for real-time sync
- Tested with Vitest and happy-dom
- Inspired by Magic: The Gathering tournament formats
