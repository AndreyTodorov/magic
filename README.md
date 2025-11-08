# Magic Mikes Tournament

A browser-based Best of 3 tournament management system for Magic: The Gathering.

## Features

- 🎮 Best of 3 match format
- 👥 Support for 3-12 players
- 🔄 Real-time sync across multiple devices (Firebase mode)
- 💾 Offline mode using localStorage
- 📊 Advanced scoring with tiebreakers
- 📱 Mobile-friendly responsive design
- 🏆 Live standings and rankings
- ⚡ Fast performance with optimized rendering

## Quick Start

### Standalone Mode (No Setup Required)

Simply open [index-sandalone.html](index-sandalone.html) in your browser:

```bash
# Mac
open index-sandalone.html

# Windows
start index-sandalone.html

# Linux
xdg-open index-sandalone.html
```

### Firebase Mode (Multi-Device Sync)

1. Set up Firebase (see [docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md))
2. Update [js/config.js](js/config.js) with your credentials
3. Start a local server:

```bash
# Auto-detect available server
./start-server.sh          # Mac/Linux
start-server.bat           # Windows

# Or manually
python3 -m http.server 8000
# or
npx http-server -p 8000
```

4. Open http://localhost:8000

## Testing

### Install Test Dependencies

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
```

### Test Coverage

The application has comprehensive test coverage:

- **Unit Tests**: TournamentManager, UIManager, LocalStorageManager
- **Integration Tests**: App class and component interactions
- **E2E Scenarios**: Complete user workflows and edge cases

See [docs/TESTING.md](docs/TESTING.md) for detailed testing documentation.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Architecture and development guide
- **[docs/TESTING.md](docs/TESTING.md)** - Testing guide and best practices
- **[docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md)** - Firebase configuration (if needed)

## Architecture

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
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Scoring System

- **Match Win**: +3 points
- **Game Win**: +1 point per game
- **Game Loss**: -0.5 points per game

### Tiebreakers (in order)

1. Total Points
2. Head-to-Head Record
3. Quality Score (sum of beaten opponents' points)
4. Match Win Percentage
5. Game Differential
6. Total Games Won

## Browser DevTools

Open the browser console (F12) for debugging tools:

```javascript
// View all tournaments
window.devTools.viewTournaments()

// Clear all data
window.devTools.clearTournaments()

// Export backup
window.devTools.exportTournaments()

// Logger commands
window.mmLogger.setLevel(3)        // Set log level (0-4)
window.mmLogger.getHistory()        // View log history
window.mmLogger.exportLogs()        // Download logs
```

## Development

### Project Structure

```
├── index.html                 # Firebase mode (production)
├── index-sandalone.html       # Standalone mode (offline)
├── css/
│   └── styles.css            # All styles with CSS variables
├── js/
│   ├── config.js             # Configuration & credentials
│   ├── logger.js             # Logging utility
│   ├── firebase.js           # Firebase integration
│   ├── localStorage-manager.js  # Local storage fallback
│   ├── tournament.js         # Tournament logic
│   ├── ui.js                 # DOM rendering
│   └── app.js                # Main controller
├── tests/                    # Test files
│   ├── setup.js
│   ├── tournament.test.js
│   ├── ui.test.js
│   ├── localStorage.test.js
│   ├── integration.test.js
│   └── e2e-scenarios.test.js
└── docs/                     # Documentation
    └── TESTING.md
```

### Adding New Features

1. Write tests first (TDD recommended)
2. Implement feature in appropriate module
3. Update UI if needed
4. Run tests: `npm test`
5. Check coverage: `npm run test:coverage`
6. Update documentation

See [CLAUDE.md](CLAUDE.md) for detailed development patterns.

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

Requires:
- ES6+ support
- localStorage
- Fetch API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built with vanilla JavaScript (no frameworks)
- Uses Firebase Realtime Database for sync
- Tested with Vitest
