# Testing Guide

Comprehensive testing documentation for Magic Mikes Tournament, covering unit tests, integration tests, functional tests, and end-to-end scenarios.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [What Gets Tested](#what-gets-tested)
- [Understanding Test Output](#understanding-test-output)
- [Writing New Tests](#writing-new-tests)
- [Debugging Failed Tests](#debugging-failed-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

The test suite validates the entire tournament system across all formats with various player counts to verify:
- Match generation correctness
- Bracket advancement logic
- Stage transitions (Swiss, Group Stage)
- Standings calculations with tiebreakers
- Edge cases (BYEs, odd player counts, non-power-of-2 brackets)
- UI rendering and interactions
- Storage layer abstraction
- Complete end-to-end workflows

**Test Coverage:**
- **Unit Tests**: ~50 tests
- **Integration Tests**: ~20 tests
- **E2E Scenarios**: ~20 tests
- **Functional Tests**: ~100 scenarios
- **Total**: 190+ comprehensive test scenarios

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run All Tests (Recommended)

```bash
# Run complete test suite (Vitest + Functional)
npm run test:all
```

### Run Specific Test Suites

```bash
# Run Vitest tests only (unit/integration/e2e)
npm test

# Run with watch mode (auto-rerun on changes)
npm run test:watch

# Run with visual UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run directly with Node.js
node tests/run-all-tests.js
```

### Browser-Based Testing

For visual debugging and interactive testing:

1. Start a local server:
   ```bash
   python3 -m http.server 8000
   # OR
   npx http-server -p 8000
   ```

2. Open test runner:
   ```
   http://localhost:8000/tests/index.html
   ```

3. Click **"RUN ALL TESTS"** and review results

## Test Structure

```
tests/
├── index.html              # Browser-based test runner (visual/interactive)
├── run-all-tests.js        # Node.js comprehensive test runner (CI/CD)
├── setup.js                # Vitest configuration and mocks
├── functional.test.js      # Functional tournament logic tests
├── ui.test.js              # UI component tests
├── tournament.test.js      # Tournament manager unit tests
├── localStorage.test.js    # Storage layer tests
├── integration.test.js     # Integration tests
├── e2e-scenarios.test.js   # End-to-end scenario tests
└── test-results.json       # Auto-generated results (for debugging)
```

## Running Tests

### All Tests (CI/CD)

The comprehensive test suite runs both Vitest and functional tests:

```bash
npm run test:all
```

This will:
- Run all Vitest unit/integration/e2e tests
- Run all functional tournament logic tests
- Generate `test-results.json` for debugging
- Exit with code 0 (pass) or 1 (fail)

**Expected Output:**
```
═══════════════════════════════════════════════════════════
MAGIC MIKES TOURNAMENT - COMPREHENSIVE TEST RUNNER
═══════════════════════════════════════════════════════════

📦 RUNNING VITEST TESTS...
✅ Vitest tests completed
   Tests: 90
   Passed: 90
   Failed: 0

🔧 RUNNING FUNCTIONAL TESTS...
✅ Functional tests passed
   Errors: 0
   Warnings: 0

═══════════════════════════════════════════════════════════
COMPREHENSIVE TEST SUMMARY
═══════════════════════════════════════════════════════════
Overall Status: ✅ ALL PASSED
Total Tests: 190+
Duration: 5.42s
```

### Vitest Tests Only

```bash
# Run once
npm test

# Watch mode (auto-rerun on file changes)
npm run test:watch

# Interactive UI mode
npm run test:ui

# With coverage report
npm run test:coverage
```

### Coverage Reports

```bash
# Generate and view coverage
npm run test:coverage

# Open in browser (macOS)
open coverage/index.html

# Open in browser (Linux)
xdg-open coverage/index.html

# Open in browser (Windows)
start coverage/index.html
```

**Coverage includes:**
- `js/tournament.js` - Tournament logic
- `js/tournament-formats.js` - Format implementations
- `js/ui.js` - UI management
- `js/localStorage-manager.js` - Storage layer
- Excludes: `js/firebase.js` (external service)

### Browser Test Runner

Open `tests/index.html` in a browser to:
- Run functional tests interactively
- View detailed logs with color-coded output
- Export results for debugging
- Copy JSON results to clipboard

**Use cases:**
- Visual debugging
- Local development
- Generating bug reports

## Test Types

### 1. Functional Tests (`functional.test.js`)

Comprehensive tournament logic tests across all formats.

#### Round Robin Tests

Tests various player/match combinations:
- 4 players, 1 match each (minimal)
- 4 players, 3 matches each (standard)
- 6 players, 2 matches each (even, moderate)
- 7 players, 2 matches each (odd, moderate)
- 8 players, 1 match each (many players, few matches)
- 8 players, 3 matches each (many players, many matches)

**Validates:**
- Each player gets exactly N matches
- Total match count is correct
- Standings calculation works
- Match distribution is balanced
- Works with both even and odd player counts

#### Single Elimination Tests

Power-of-2 player counts only (BYEs no longer supported):
- 2 players (minimum)
- 4 players (small tournament)
- 8 players (medium tournament)
- 16 players (large tournament)
- 32 players (very large tournament)

**Validates:**
- Bracket structure is correct
- Winner advancement works through all rounds
- Exactly one champion emerges
- Round count matches expected (log2 of bracket size)

#### Double Elimination Tests

Power-of-2 player counts:
- 4 players (minimum)
- 8 players (medium)
- 16 players (large)

**Validates:**
- Winners bracket structure
- Losers bracket structure
- Split advancement (winners/losers)
- Correct match feeding (feedsIntoWin, feedsIntoLoss)
- Tournament completes without infinite loops

#### Swiss Tournament Tests

Various configurations:
- 4 players, 2 rounds (minimal)
- 4 players, 3 rounds (small)
- 6 players, 3 rounds (even, moderate)
- 7 players, 3 rounds (odd, BYE each round)
- 8 players, 3 rounds (even)
- 8 players, 4 rounds (even, more rounds)
- 12 players, 4 rounds (medium tournament)
- 16 players, 5 rounds (large tournament)

**Validates:**
- Round 1 pairing generation
- Dynamic round generation after each round
- BYE handling for odd player counts
- No repeat pairings (where possible)
- Standings-based pairing (Swiss algorithm)
- All rounds complete successfully

#### Group Stage + Playoffs Tests

Multiple configurations:
- 8 players: 2 groups of 4, top 2 advance (4-player playoff)
- 8 players: 2 groups of 4, top 1 advance (2-player playoff)
- 12 players: 3 groups of 4, top 2 advance (6-player playoff)
- 12 players: 4 groups of 3, top 1 advance (4-player playoff)
- 16 players: 4 groups of 4, top 2 advance (8-player playoff)
- 16 players: 4 groups of 4, top 1 advance (4-player playoff)

**Validates:**
- Group assignments are balanced
- Round-robin within each group
- Stage detection (groups complete)
- Playoff bracket population
- Top players advance correctly
- Playoff bracket completes
- Different advancement configurations work

### 2. Unit Tests (Vitest)

**`tournament.test.js`** - TournamentManager logic (50+ tests)
- Match generation algorithms
- Standings calculations
- Tiebreaker logic
- Data validation

**`ui.test.js`** - UIManager DOM manipulation
- Element caching
- View switching
- Rendering functions
- Event handling

**`localStorage.test.js`** - Storage abstraction layer
- CRUD operations
- Subscription/listener system
- Error handling
- Data persistence

### 3. Integration Tests (`integration.test.js`)

Tests component interactions:
- Full tournament workflows
- App initialization
- Module communication
- Data flow between layers

### 4. E2E Scenario Tests (`e2e-scenarios.test.js`)

Real-world user scenarios:
- Creating and joining tournaments
- Recording match results
- Viewing standings
- Multi-device simulation
- Edge cases and error handling

## What Gets Tested

### Scoring System

**Points Calculation:**
- Win 2-0 → 5.0 points (Match Win: 3 + Game Wins: 2×1)
- Win 2-1 → 4.5 points (Match Win: 3 + Game Wins: 2×1 + Game Loss: -0.5)
- Loss 1-2 → 0.0 points (Game Win: 1 + Game Losses: 2×-0.5)
- Loss 0-2 → -1.0 points (Game Losses: 2×-0.5)
- **All points divisible by 0.5** ✓

**Quality Score (Tiebreaker):**
- Sum of beaten opponents' points (no multiplication)
- Maintains divisibility by 0.5
- Used for tiebreaking in Round Robin and Group Stage

### Tournament Structure

**Group Stage - All Configurations:**
- 8, 12, 16, 20, 24, 32 players
- Validates:
  - ✓ Correct number of group matches
  - ✓ Correct number of playoff matches
  - ✓ Total advancing is power of 2
  - ✓ All players assigned correctly
  - ✓ Playoff matches start as placeholders
  - ✓ Standings calculation works

**Single Elimination:**
- ✓ Correct total matches (n-1)
- ✓ Correct matches per round
- ✓ First round fully populated
- ✓ Round visibility (later rounds appear after completion)

**Double Elimination:**
- ✓ Winners bracket correct size
- ✓ Losers bracket exists and routes correctly
- ✓ Grand finals exist
- ✓ All brackets properly structured
- ✓ No players stuck without matches

**Swiss Format:**
- ✓ Correct total matches (rounds × players/2)
- ✓ Each round has correct matches
- ✓ First round populated
- ✓ Later rounds are placeholders until previous round completes

**Round Robin:**
- ✓ Total matches correct: (players × matches_per_player) / 2
- ✓ Each player has correct match count
- ✓ No duplicate pairings
- ✓ (players × matches) is even

### Key Scenarios Tested

- Match generation and validation
- Standings calculation and tiebreakers
- Bracket progression (round visibility)
- Partial match completion
- Winner advancement logic
- Quality score calculations
- Points divisibility (all scores divisible by 0.5)
- BYE handling in Swiss format
- Stage transitions in Group Stage
- Error handling and edge cases

## Understanding Test Output

### Success Output

```
✅ ALL TESTS PASSED!
Duration: 2.34s
Errors: 0
Warnings: 0
```

### Failure Output

```
❌ ERRORS FOUND:

Functional Test Errors:
  1. [ERROR] Player 5 has 2 matches, expected 3
  2. [ERROR] Standings has 7 players, expected 8

Duration: 1.87s
Errors: 2
Warnings: 1
```

### Test Result Indicators

- **Green (✓)**: Test passed successfully
- **Red (✗)**: Critical error - feature is broken
- **Yellow (⚠)**: Warning - works but may have issues

### Common Error Messages

**"Player X has Y matches, expected Z"**
- Match distribution algorithm failed
- Check `generateMatches()` in tournament-formats.js

**"Standings not properly sorted"**
- Tiebreaker logic incorrect
- Check `calculateStandings()` in tournament-formats.js

**"No final winner found"**
- Bracket advancement broken
- Check `advanceWinnerToNextMatch()` in tournament.js

**"Failed to generate Round X"**
- Swiss pairing algorithm issue
- Check `generateSwissRoundPairings()` in tournament-formats.js

**"Cannot advance to playoffs"**
- Stage detection broken
- Check `isCurrentStageComplete()` or `canAdvanceStage()` in tournament.js

## Debugging Failed Tests

### Browser DevTools Debugging

1. **Open Browser DevTools** (F12)
2. **Check Console** for detailed error messages
3. **Look for stack traces** showing exact line numbers
4. **Verify test assumptions** match implementation

### Vitest Debugging

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- tournament.test.js

# Run in UI mode for interactive debugging
npm run test:ui

# Run with filtered test name
npm test -- -t "should calculate standings"
```

### Functional Test Debugging

1. **Browser debugging**: Open `tests/index.html` and run tests to see detailed logs
2. **Node debugging**: Check `test-results.json` for error details
3. **Export results**: Share with team or AI assistants for analysis

### Test Results JSON

After running tests, `test-results.json` contains:

```json
{
  "timestamp": "2024-11-16T18:30:00.000Z",
  "vitest": {
    "passed": true,
    "totalTests": 90,
    "passedTests": 90,
    "failedTests": 0
  },
  "functional": {
    "passed": true,
    "errors": [],
    "warnings": [],
    "duration": "2.35"
  },
  "summary": {
    "totalErrors": 0,
    "totalWarnings": 0,
    "allPassed": true,
    "duration": "5.42"
  }
}
```

## Writing New Tests

### Vitest Unit Tests

Create a new test file or add to existing ones:

```javascript
// In tests/my-feature.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyFeature', () => {
  beforeEach(() => {
    // Setup code runs before each test
  });

  it('should do something correctly', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Functional Tournament Tests

Add to `functional.test.js`:

```javascript
testMyNewScenario() {
  this.log(`\n=== Testing My Scenario ===`);

  try {
    const manager = new TournamentManager();
    const players = ['Alice', 'Bob', 'Charlie', 'Diana'];

    // Create tournament
    manager.createTournament(players, 3, TOURNAMENT_FORMATS.ROUND_ROBIN);

    // Validate structure
    if (manager.matches.length !== expectedMatches) {
      throw new Error(`Expected ${expectedMatches} matches, got ${manager.matches.length}`);
    }

    // Play through tournament
    manager.matches.forEach(match => {
      // Simulate match result
      match.games = [0, 1, 0]; // Player 1 wins 2-1
      match.completed = true;
    });

    // Validate standings
    const standings = manager.calculateStandings();
    if (standings.length !== players.length) {
      throw new Error('Standings mismatch');
    }

    this.log(`✓ Test passed`);
    return true;
  } catch (error) {
    this.log(`Test failed: ${error.message}`, 'error');
    console.error(error);
    return false;
  }
}
```

Then add to `runAllTests()`:

```javascript
runAllTests() {
  // ... existing tests ...

  this.log('\n\n🆕 MY NEW TESTS');
  this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  this.testMyNewScenario();

  // ...
}
```

### Integration Tests

Add to `integration.test.js`:

```javascript
describe('My Integration Scenario', () => {
  it('should work end-to-end', async () => {
    // Initialize app
    const app = new App();
    await app.init();

    // Simulate user actions
    // ...

    // Verify results
    expect(app.currentTournament).toBeDefined();
  });
});
```

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/test.yml` automatically:

1. Installs dependencies
2. Runs all tests via `node tests/run-all-tests.js`
3. Generates coverage report
4. Uploads `test-results.json` as artifact (available for 30 days)

### Accessing Test Results from GitHub Actions

1. Go to **Actions** tab
2. Select test run
3. Download **"test-results"** artifact
4. Review JSON for detailed debugging information

### Adding Tests to CI/CD

All tests in the `tests/` directory are automatically run by CI/CD. No configuration needed - just add your test file and commit!

## Test Performance

- **Vitest tests**: ~1-2 seconds
- **Functional tests**: ~2-3 seconds
- **Total test time**: ~5 seconds

Fast enough to run frequently during development!

## Common Issues

### Issue: "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Browser tests not loading

- Ensure you're running a local server (not `file://` protocol)
- Check browser console for errors
- Verify all JS files in `../js/` are accessible

### Issue: Vitest "happy-dom" errors

```bash
# Update happy-dom
npm update happy-dom
```

### Issue: Functional tests timeout

- Check for infinite loops in match generation
- Increase safeguard limits in functional tests
- Debug in browser with `tests/index.html`

### Issue: Structure test fails on Group Stage

**Cause:** Invalid configuration not properly validated

**Example:** 16 players in 8 groups with 3 advancing = 24 total (not power of 2)

**Fix:** Ensure `validateConfig()` enforces power-of-2 rule

### Issue: Match count mismatch

**Cause:** Placeholder matches counted in totals

**Example:** Single elimination showing 16 matches instead of 15

**Fix:** Filter out `isPlaceholder` matches in progress calculation

### Issue: Quality score not divisible by 0.5

**Cause:** Multiplying points by 0.5

**Example:** 4.5 × 0.5 = 2.25 (divisible by 0.25, not 0.5)

**Fix:** Never multiply points; only sum them

## Best Practices

1. **Run all tests before committing**
   ```bash
   npm run test:all
   ```

2. **Check coverage regularly**
   - Aim for >80% coverage on core logic
   - Use `npm run test:coverage`

3. **Add tests for bugs**
   - When fixing bugs, add regression tests
   - Prevents the same bug from reappearing

4. **Use browser runner for visual debugging**
   - `tests/index.html` provides detailed logs
   - Export results when reporting bugs

5. **Write descriptive test names**
   ```javascript
   // Good
   it('should calculate correct points for 2-1 match win', () => {})

   // Bad
   it('test 1', () => {})
   ```

6. **Test edge cases**
   - Odd player counts
   - Empty inputs
   - Maximum limits
   - Concurrent operations

7. **Keep tests focused**
   - One assertion per test when possible
   - Test one behavior at a time
   - Use clear arrange-act-assert structure

8. **Run tests in watch mode during development**
   ```bash
   npm run test:watch
   ```

## Test Coverage Summary

| Test Suite | Tests | Coverage |
|-----------|-------|----------|
| Unit Tests (Vitest) | ~50 | TournamentManager, UIManager, Storage |
| Integration Tests | ~20 | Full workflows, component interactions |
| E2E Scenarios | ~20 | Real-world user scenarios |
| Functional Tests | ~100 | All formats, all configurations, edge cases |
| **Total** | **190+** | **Comprehensive coverage of all tournament logic** |

## Continuous Testing During Development

Run tests after any changes to:
- `js/tournament.js` - Core tournament logic
- `js/tournament-formats.js` - Format-specific logic
- `js/ui.js` - Schedule rendering (less critical)
- `js/app.js` - Match update flow
- `js/localStorage-manager.js` - Storage layer

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [happy-dom (test environment)](https://github.com/capricorn86/happy-dom)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)

## Questions or Issues?

- Check [README.md](../README.md) for project overview
- See [LOCAL-DEV.md](LOCAL-DEV.md) for development setup
- Review [CLAUDE.md](../CLAUDE.md) for architecture details
