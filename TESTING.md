# Testing Guide

Comprehensive testing documentation for Magic Mikes Tournament.

## Table of Contents

- [Overview](#overview)
- [Test Setup](#test-setup)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Browser Testing](#browser-testing)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Writing Tests](#writing-tests)
- [Debugging Tests](#debugging-tests)
- [CI/CD Testing](#cicd-testing)

## Overview

The project uses **Vitest** for unit and integration testing with comprehensive coverage across all tournament formats and features.

### Test Philosophy

- **Test-Driven Development (TDD)** - Write tests before implementation
- **Comprehensive Coverage** - Aim for >80% code coverage
- **Fast Execution** - Tests should complete in < 5 seconds
- **Isolated Tests** - No dependencies between tests
- **Real-World Scenarios** - Test actual user workflows

### What Gets Tested

✅ **Tournament Logic**
- Match generation algorithms
- Bracket advancement
- Swiss pairing system
- Group stage transitions
- Standings calculations
- Tiebreaker logic

✅ **UI Components**
- DOM rendering
- View switching
- Match card updates
- Standings table sorting
- Player schedule display

✅ **Storage Layer**
- Firebase CRUD operations
- localStorage persistence
- Real-time listeners
- Session management

✅ **Authentication**
- Sign in/up flows
- Password reset
- Auth state changes
- User profile updates

✅ **Edge Cases**
- Odd player counts (BYEs)
- Tied scores
- Incomplete matches
- Invalid inputs
- Power-of-2 requirements

## Test Setup

### Prerequisites

```bash
# Node.js 16+ required
node --version  # Should be 16+

# Install dependencies
npm install
```

### Dependencies

Installed automatically with `npm install`:

- **vitest** - Test runner and framework
- **@vitest/ui** - Visual test interface
- **@vitest/coverage** - Code coverage reports
- **jsdom** - DOM simulation for browser testing
- **happy-dom** - Alternative DOM implementation (faster)

### Project Structure

```
tests/
├── setup.js                 # Test configuration
├── tournament.test.js       # Tournament logic tests
├── tournament-formats.test.js  # Format-specific tests
├── ui.test.js              # UI rendering tests
├── localStorage.test.js    # Storage tests
├── integration.test.js     # Integration tests
└── e2e-scenarios.test.js   # End-to-end workflows
```

## Running Tests

### Command Line

```bash
# Run all tests (default)
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with visual UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npx vitest run tests/tournament.test.js

# Run tests matching pattern
npx vitest run -t "Round Robin"

# Run in silent mode (less output)
npx vitest run --silent
```

### Visual UI

The best way to explore and debug tests:

```bash
npm run test:ui
```

Then open `http://localhost:51204/__vitest__/` in your browser.

**Features:**
- ✅ Interactive test tree
- ✅ Live rerun on file changes
- ✅ Filter by status (passed/failed)
- ✅ View test duration
- ✅ Source code preview
- ✅ Console output per test

## Test Coverage

### Generating Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

### Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| tournament.js | 90% | 92% |
| tournament-formats.js | 90% | 94% |
| ui.js | 80% | 85% |
| firebase.js | 70% | 75% |
| localStorage-manager.js | 80% | 88% |
| auth.js | 70% | 72% |
| **Overall** | **80%** | **85%** |

### Coverage Reports

Coverage reports show:
- **Statements** - Lines of code executed
- **Branches** - Conditional paths taken
- **Functions** - Functions called
- **Lines** - Actual line coverage

**Example output:**
```
File                        | % Stmts | % Branch | % Funcs | % Lines
----------------------------|---------|----------|---------|--------
All files                   |   85.2  |   82.1   |   88.4  |   85.2
 js/tournament.js           |   92.3  |   89.5   |   94.1  |   92.3
 js/tournament-formats.js   |   94.1  |   91.2   |   96.3  |   94.1
 js/ui.js                   |   85.7  |   78.9   |   87.2  |   85.7
```

## Browser Testing

### Functional Test Runner

For testing in actual browsers:

1. **Start local server:**
   ```bash
   python3 -m http.server 8000
   ```

2. **Open test runner:**
   ```
   http://localhost:8000/test-runner.html
   ```

3. **Click "RUN ALL TESTS"**

### What Browser Tests Cover

#### Round Robin (6 scenarios)
- ✓ 4 players, 1 match each
- ✓ 4 players, 3 matches each
- ✓ 6 players, 2 matches each
- ✓ 7 players, 2 matches each (odd count)
- ✓ 8 players, 1 match each
- ✓ 8 players, 3 matches each

**Validates:**
- Each player gets exactly N matches
- Total match count is correct
- Standings calculation works
- Match distribution is balanced

#### Single Elimination (5 scenarios)
- ✓ 2 players (minimum)
- ✓ 4 players
- ✓ 8 players
- ✓ 16 players
- ✓ 32 players

**Validates:**
- Bracket structure
- Winner advancement
- Exactly one champion
- Round count = log₂(players)
- Power-of-2 validation

#### Double Elimination (3 scenarios)
- ✓ 4 players
- ✓ 8 players
- ✓ 16 players

**Validates:**
- Winners bracket
- Losers bracket
- Match feeding logic
- Grand finals
- No infinite loops

#### Swiss System (8 scenarios)
- ✓ 4 players, 2-3 rounds
- ✓ 6 players, 3 rounds
- ✓ 7 players, 3 rounds (with BYE)
- ✓ 8 players, 3-4 rounds
- ✓ 12 players, 4 rounds
- ✓ 16 players, 5 rounds

**Validates:**
- Round 1 pairing
- Dynamic round generation
- BYE handling (odd counts)
- No repeat pairings
- Standings-based pairing

#### Group Stage + Playoffs (6 scenarios)
- ✓ 8 players: 2 groups of 4
- ✓ 12 players: 3 groups of 4
- ✓ 12 players: 4 groups of 3
- ✓ 16 players: 4 groups of 4

**Validates:**
- Balanced group assignments
- Round-robin within groups
- Stage completion detection
- Playoff bracket population
- Advancement (top 1/2)

### Browser Test Output

**Success:**
```
✅ ALL TESTS PASSED!
Duration: 2.34s
Tests: 28/28
Errors: 0
Warnings: 0
```

**Failure:**
```
❌ TESTS FAILED
Duration: 1.87s
Tests: 26/28
Errors: 2

Errors:
1. Round Robin (7 players): Player 5 has 1 match, expected 2
2. Swiss (8 players): Failed to generate Round 3
```

## Unit Tests

### Tournament Logic Tests

**File:** `tests/tournament.test.js`

Tests core tournament functionality:

```javascript
describe('TournamentManager', () => {
  describe('createTournament', () => {
    it('should create tournament with correct player count', () => {
      const manager = new TournamentManager();
      manager.createTournament(['Alice', 'Bob'], 3, 'round-robin');
      expect(manager.tournament.playerCount).toBe(2);
    });

    it('should validate match count (must be even)', () => {
      const manager = new TournamentManager();
      expect(() => {
        manager.createTournament(['Alice', 'Bob', 'Charlie'], 2, 'round-robin');
      }).toThrow('Invalid configuration');
    });
  });

  describe('calculateStandings', () => {
    it('should sort by total points', () => {
      // Test implementation
    });

    it('should apply head-to-head tiebreaker', () => {
      // Test implementation
    });

    it('should apply quality score tiebreaker', () => {
      // Test implementation
    });
  });
});
```

### Format-Specific Tests

**File:** `tests/tournament-formats.test.js`

Tests each tournament format:

```javascript
describe('Round Robin Format', () => {
  it('should generate balanced matches', () => {
    const format = new RoundRobinFormat();
    const matches = format.generateMatches(8, 3);

    // Verify each player gets 3 matches
    const playerMatchCount = {};
    matches.forEach(match => {
      playerMatchCount[match.player1] = (playerMatchCount[match.player1] || 0) + 1;
      playerMatchCount[match.player2] = (playerMatchCount[match.player2] || 0) + 1;
    });

    Object.values(playerMatchCount).forEach(count => {
      expect(count).toBe(3);
    });
  });
});

describe('Single Elimination Format', () => {
  it('should create bracket with correct rounds', () => {
    const format = new SingleEliminationFormat();
    const bracket = format.generateBracket(8);

    expect(bracket.rounds).toBe(3); // 8 → 4 → 2 → 1
    expect(bracket.matches.length).toBe(7); // 4 + 2 + 1
  });

  it('should advance winners correctly', () => {
    // Test implementation
  });
});
```

### UI Tests

**File:** `tests/ui.test.js`

Tests DOM rendering:

```javascript
describe('UIManager', () => {
  let ui;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="matchesContainer"></div>
      <div id="standingsTable"></div>
      <div id="scheduleGrid"></div>
    `;
    ui = new UIManager();
  });

  describe('renderMatches', () => {
    it('should render match cards', () => {
      const matches = [
        { player1: 0, player2: 1, games: [null, null, null], completed: false }
      ];
      const players = ['Alice', 'Bob'];

      ui.renderMatches(matches, players);

      const cards = document.querySelectorAll('.match-card');
      expect(cards.length).toBe(1);
    });

    it('should highlight completed matches', () => {
      const matches = [
        { player1: 0, player2: 1, games: [0, 1, 0], completed: true }
      ];
      const players = ['Alice', 'Bob'];

      ui.renderMatches(matches, players);

      const card = document.querySelector('.match-card');
      expect(card.classList.contains('completed')).toBe(true);
    });
  });

  describe('renderStandings', () => {
    it('should sort standings by points', () => {
      const standings = [
        { name: 'Alice', points: 10 },
        { name: 'Bob', points: 15 },
        { name: 'Charlie', points: 5 }
      ];

      ui.renderStandings(standings);

      const rows = document.querySelectorAll('.standing-row');
      expect(rows[0].textContent).toContain('Bob');
      expect(rows[1].textContent).toContain('Alice');
      expect(rows[2].textContent).toContain('Charlie');
    });
  });
});
```

### Storage Tests

**File:** `tests/localStorage.test.js`

Tests localStorage manager:

```javascript
describe('LocalStorageManager', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new LocalStorageManager();
  });

  it('should save tournament data', async () => {
    const tournamentData = {
      players: ['Alice', 'Bob'],
      matches: []
    };

    await manager.createTournament('TEST123', tournamentData);

    const saved = await manager.getTournament('TEST123');
    expect(saved.players).toEqual(['Alice', 'Bob']);
  });

  it('should check tournament existence', async () => {
    await manager.createTournament('TEST123', { players: [] });

    const exists = await manager.tournamentExists('TEST123');
    expect(exists).toBe(true);

    const notExists = await manager.tournamentExists('FAKE123');
    expect(notExists).toBe(false);
  });

  it('should update tournament data', async () => {
    await manager.createTournament('TEST123', { players: ['Alice'] });

    await manager.updateTournament('TEST123', { players: ['Alice', 'Bob'] });

    const updated = await manager.getTournament('TEST123');
    expect(updated.players.length).toBe(2);
  });
});
```

## Integration Tests

**File:** `tests/integration.test.js`

Tests complete workflows:

```javascript
describe('Tournament Creation Flow', () => {
  it('should create and manage tournament end-to-end', async () => {
    const app = new App();
    await app.init();

    // Create tournament
    const players = ['Alice', 'Bob', 'Charlie', 'Dave'];
    await app.createTournament(players, 2, 'round-robin');

    // Verify tournament created
    expect(app.tournamentManager.tournament.players).toEqual(players);
    expect(app.tournamentManager.matches.length).toBe(4); // 4 players × 2 matches / 2

    // Update match
    await app.updateMatch(0, [0, 1, 0]);

    // Verify standings updated
    const standings = app.tournamentManager.calculateStandings();
    expect(standings[0].points).toBeGreaterThan(0);
  });
});

describe('Multi-Stage Tournament Flow', () => {
  it('should handle group stage to playoffs transition', async () => {
    const app = new App();
    await app.init();

    // Create group stage tournament
    const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`);
    await app.createTournament(players, 0, 'group-stage', {
      groupSize: 4,
      advanceCount: 2
    });

    // Complete all group matches
    const groupMatches = app.tournamentManager.matches.filter(m => !m.isPlayoff);
    for (const match of groupMatches) {
      await app.updateMatch(match.id, [0, 1, 0]);
    }

    // Advance to playoffs
    await app.advanceStage();

    // Verify playoffs created
    const playoffMatches = app.tournamentManager.matches.filter(m => m.isPlayoff);
    expect(playoffMatches.length).toBeGreaterThan(0);
  });
});
```

## E2E Tests

**File:** `tests/e2e-scenarios.test.js`

Tests real user scenarios:

```javascript
describe('E2E: Tournament Organizer Scenario', () => {
  it('should run a complete 8-player tournament', async () => {
    const app = new App();
    await app.init();

    // 1. Organizer creates tournament
    const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`);
    await app.createTournament(players, 3, 'round-robin');

    const code = app.currentTournamentCode;
    expect(code).toHaveLength(8);

    // 2. Players join
    for (let i = 0; i < 3; i++) {
      await app.joinTournament(code);
    }

    // 3. Matches are played
    const matches = app.tournamentManager.matches;
    for (const match of matches) {
      const winner = Math.random() < 0.5 ? 0 : 1;
      const games = winner === 0 ? [0, 1, 0] : [1, 0, 1];
      await app.updateMatch(match.id, games);
    }

    // 4. Verify final standings
    const standings = app.tournamentManager.calculateStandings();
    expect(standings).toHaveLength(8);
    expect(standings[0].points).toBeGreaterThanOrEqual(standings[1].points);

    // 5. Organizer leaves
    await app.leaveTournament();
    expect(app.currentTournamentCode).toBeNull();
  });
});

describe('E2E: Swiss Tournament Scenario', () => {
  it('should run Swiss rounds with dynamic pairing', async () => {
    const app = new App();
    await app.init();

    const players = Array.from({ length: 16 }, (_, i) => `Player ${i + 1}`);
    await app.createTournament(players, 0, 'swiss', { rounds: 5 });

    // Play all 5 rounds
    for (let round = 0; round < 5; round++) {
      const roundMatches = app.tournamentManager.getRoundMatches(round);

      // Complete all matches in round
      for (const match of roundMatches) {
        await app.updateMatch(match.id, [0, 1, 0]);
      }

      // Advance to next round (if not last)
      if (round < 4) {
        await app.advanceStage();
      }
    }

    // Verify tournament completed
    const standings = app.tournamentManager.calculateStandings();
    expect(standings).toHaveLength(16);
    expect(standings.every(s => s.matchesPlayed === 5)).toBe(true);
  });
});
```

## Writing Tests

### Test Structure

Follow this pattern:

```javascript
describe('Module or Feature Name', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset state, create instances, etc.
  });

  // Cleanup after each test
  afterEach(() => {
    // Clear mocks, reset DOM, etc.
  });

  describe('Specific functionality', () => {
    it('should do something specific', () => {
      // Arrange: Set up test data
      const input = {...};

      // Act: Execute the code
      const result = functionUnderTest(input);

      // Assert: Verify expectations
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      // Test edge case
    });

    it('should throw error for invalid input', () => {
      expect(() => {
        functionUnderTest(invalidInput);
      }).toThrow('Expected error message');
    });
  });
});
```

### Best Practices

**1. Test One Thing**
```javascript
// Good: Tests one specific behavior
it('should calculate match win points correctly', () => {
  expect(calculatePoints({ matchWins: 2 })).toBe(6);
});

// Bad: Tests multiple things
it('should calculate all points', () => {
  expect(calculatePoints({ matchWins: 2, gameWins: 3 })).toBe(9);
  expect(calculatePoints({ gameLosses: 2 })).toBe(-1);
  // Too many assertions
});
```

**2. Use Descriptive Names**
```javascript
// Good: Clear what is being tested
it('should sort tied players by head-to-head record', () => {...});

// Bad: Vague
it('should sort correctly', () => {...});
```

**3. Test Edge Cases**
```javascript
it('should handle empty player array', () => {...});
it('should handle single player', () => {...});
it('should handle maximum players (12)', () => {...});
it('should handle odd player count with BYE', () => {...});
```

**4. Use Test Data Builders**
```javascript
function createMockTournament(overrides = {}) {
  return {
    players: ['Alice', 'Bob'],
    matches: [],
    playerCount: 2,
    format: 'round-robin',
    ...overrides
  };
}

// Usage
it('should work with custom tournament', () => {
  const tournament = createMockTournament({ playerCount: 8 });
  // ...
});
```

**5. Mock External Dependencies**
```javascript
// Mock Firebase
vi.mock('../js/firebase.js', () => ({
  firebaseManager: {
    createTournament: vi.fn(),
    getTournament: vi.fn(),
    updateTournament: vi.fn()
  }
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
global.localStorage = mockLocalStorage;
```

## Debugging Tests

### Common Issues

**1. Test fails randomly**
- Cause: Race condition or async timing
- Fix: Use `await` properly, add `waitFor` helpers

```javascript
// Bad
it('should update UI', () => {
  updateUI();
  expect(element.textContent).toBe('Updated');
});

// Good
it('should update UI', async () => {
  await updateUI();
  expect(element.textContent).toBe('Updated');
});
```

**2. DOM element not found**
- Cause: HTML not set up correctly
- Fix: Add HTML in `beforeEach`

```javascript
beforeEach(() => {
  document.body.innerHTML = `
    <div id="matchesContainer"></div>
    <div id="standingsTable"></div>
  `;
});
```

**3. Mock not working**
- Cause: Mock set up after import
- Fix: Use `vi.mock` at top of file

```javascript
// Must be at top before any imports
vi.mock('../js/firebase.js');

import { firebaseManager } from '../js/firebase.js';
```

**4. Coverage not 100%**
- Cause: Unreachable code or missing test cases
- Fix: Check coverage report for missed lines

```bash
npm run test:coverage
open coverage/index.html
# Click on file to see highlighted lines
```

### Debug Tools

**1. Vitest UI**
```bash
npm run test:ui
# Interactive debugging
```

**2. Console Logging**
```javascript
it('should do something', () => {
  console.log('Debug:', variable);
  expect(variable).toBe(expected);
});
```

**3. Debugger**
```javascript
it('should do something', () => {
  debugger; // Pause here in browser DevTools
  expect(variable).toBe(expected);
});
```

**4. Test.only**
```javascript
// Run only this test
it.only('should do something', () => {...});

// Skip this test
it.skip('should do something', () => {...});
```

## CI/CD Testing

### GitHub Actions

Tests run automatically on every push and pull request.

**Workflow:** `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Pre-commit Hooks

Run tests before committing:

```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm test"
```

### Continuous Monitoring

**Badge in README:**
```markdown
[![Tests](https://github.com/username/repo/actions/workflows/test.yml/badge.svg)](https://github.com/username/repo/actions/workflows/test.yml)
```

---

**Last Updated:** 2025-01-16

**For Questions:** Open a GitHub issue or see [LOCAL-DEV.md](LOCAL-DEV.md)
