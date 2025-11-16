# Magic Mikes Tournament - Test Suite

Comprehensive testing suite for the Magic Mikes Tournament application, combining unit tests, integration tests, and functional tournament logic tests.

## 📁 Test Structure

```
tests/
├── index.html              # Browser-based test runner (visual)
├── run-all-tests.js        # Node.js comprehensive test runner (CI/CD)
├── setup.js                # Vitest setup and mocks
├── functional.test.js      # Functional tournament logic tests (was test-tournaments.js)
├── ui.test.js              # UI component tests
├── tournament.test.js      # Tournament manager unit tests
├── localStorage.test.js    # Storage layer tests
├── integration.test.js     # Integration tests
├── e2e-scenarios.test.js   # End-to-end scenario tests
└── test-results.json       # Auto-generated test results (for Claude Code)
```

## 🚀 Running Tests

### All Tests (Recommended for CI/CD)

```bash
# Run all tests (Vitest + Functional)
npm run test:all

# Or directly
node tests/run-all-tests.js
```

This will:
- Run all Vitest unit/integration/e2e tests
- Run all functional tournament logic tests
- Generate `test-results.json` for debugging
- Exit with code 0 (pass) or 1 (fail)

### Vitest Tests Only

```bash
# Run once
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

### Browser-Based Test Runner

Open `tests/index.html` in a browser to:
- Run functional tests interactively
- View detailed logs with color-coded output
- Export results for Claude Code debugging
- Copy JSON results to clipboard

Useful for:
- Visual debugging
- Local development
- Generating bug reports for Claude Code

## 📊 Test Types

### 1. **Functional Tests** (`functional.test.js`)

Comprehensive tournament logic tests across all formats:

#### Round Robin Tests
- All player counts (4-12) with valid match combinations
- Match generation and validation
- Standings calculation with tiebreakers
- Partial match completion
- Standings progression

#### Single Elimination Tests
- Power-of-2 player counts (2, 4, 8, 16, 32)
- Bracket structure validation
- Round-by-round progression
- Winner advancement logic

#### Double Elimination Tests
- Player counts: 4, 8, 16
- Winners bracket validation
- Losers bracket routing
- Grand finals
- Complete tournament playthrough

#### Swiss Format Tests
- Various player counts and round configurations
- Round visibility (rounds appear after previous completes)
- Pairing generation
- Bye handling (odd player counts)

#### Group Stage Tests
- Multiple group configurations
- Playoff advancement logic
- Stage visibility (groups → playoffs)
- Seeding into elimination brackets

**Key Scenarios Tested:**
- Match generation and validation
- Standings calculation and tiebreakers
- Bracket progression (round visibility)
- Partial match completion
- Winner advancement logic
- Quality score calculations
- Points divisibility (all scores divisible by 0.5)

**Test Coverage:**
- **Round Robin**: ~30 test combinations
- **Single Elimination**: 5 player counts × scenarios
- **Double Elimination**: 3 player counts × scenarios
- **Swiss**: 8 configurations
- **Group Stage**: 6 configurations
- **In-Game Scenarios**: 7 edge case tests
- **Total**: 100+ functional test scenarios

### 2. **Unit Tests** (Vitest)

- `tournament.test.js`: TournamentManager logic (50+ tests)
- `ui.test.js`: UIManager DOM manipulation
- `localStorage.test.js`: Storage abstraction layer

### 3. **Integration Tests** (`integration.test.js`)

- Full tournament workflows
- Component interactions
- Data persistence

### 4. **E2E Scenario Tests** (`e2e-scenarios.test.js`)

- Real-world user scenarios
- Multi-device simulation
- Edge cases

## 🔍 Test Output for Claude Code

After running tests, you'll get:

### 1. **Console Output** (Human-readable)
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
```

### 2. **JSON Output** (`test-results.json`)
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

You can provide `test-results.json` to Claude Code for detailed debugging.

### 3. **Browser Export** (from `index.html`)

When running in the browser:
1. Click "RUN ALL TESTS"
2. Click "EXPORT FOR CLAUDE" to download results
3. Copy JSON output to share with Claude Code

## 🧪 What Gets Tested

### Scoring System Tests

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

### Tournament Structure Tests

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

## 🐛 Debugging Failed Tests

### If Vitest Tests Fail

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- tournament.test.js

# Run in UI mode for interactive debugging
npm run test:ui
```

### If Functional Tests Fail

1. **Browser debugging**: Open `tests/index.html` and run tests to see detailed logs
2. **Node debugging**: Check `test-results.json` for error details
3. **Provide to Claude**: Export results and share with Claude Code

Example error output:
```
❌ ERRORS DETECTED:

Functional Test Errors:
  1. [ERROR] Round Robin test failed: Player 5 has 2 matches, expected 3
  2. [ERROR] Double Elimination: 2 placeholder matches have players assigned
  3. [ERROR] Standings not properly sorted at position 3
```

## 📝 Writing New Tests

### Vitest Tests

```javascript
// In tests/my-feature.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyFeature', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Functional Tests

Add to `functional.test.js`:

```javascript
testMyNewScenario() {
  this.log(`\n=== Testing My Scenario ===`);

  try {
    const manager = new TournamentManager();
    const players = ['Alice', 'Bob', 'Charlie', 'Diana'];

    // Create tournament
    manager.createTournament(players, 3, TOURNAMENT_FORMATS.ROUND_ROBIN);

    // Test logic
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
  this.testMyNewScenario();
  // ...
}
```

## 🔧 CI/CD Integration

The GitHub workflow (`.github/workflows/test.yml`) automatically:

1. Installs dependencies
2. Runs all tests via `node tests/run-all-tests.js`
3. Generates coverage report
4. Uploads `test-results.json` as artifact (available for 30 days)

### Accessing Test Results from GitHub Actions

1. Go to Actions tab
2. Select test run
3. Download "test-results" artifact
4. Provide to Claude Code if debugging is needed

## 📈 Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# Opens in browser (macOS)
open coverage/index.html
```

Coverage includes:
- `js/tournament.js` (tournament logic)
- `js/tournament-formats.js` (format implementations)
- `js/ui.js` (UI management)
- `js/localStorage-manager.js` (storage)
- Excludes: `js/firebase.js` (external service)

## 🎯 Common Issues

### Issue: Structure test fails on Group Stage configuration

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

### Issue: Double Elimination - players stuck without matches

**Cause:** Losers bracket routing not correctly advancing players

**Example:** Player loses in Winners R1 but never appears in Losers R1

**Fix:** Ensure `feedsIntoLoss` properly routes to losers bracket matches

### "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Browser tests not loading

- Ensure you're running a local server (not `file://` protocol)
- Check browser console for errors
- Verify all JS files in `../js/` are accessible

### Vitest "happy-dom" errors

```bash
# Update happy-dom
npm update happy-dom
```

### Functional tests timeout

- Check for infinite loops in match generation
- Increase safeguard limits in functional tests
- Debug in browser with `tests/index.html`

## 📚 Test Performance

- **Vitest tests**: ~1-2 seconds
- **Functional tests**: ~2-3 seconds
- **Total test time**: ~5 seconds

Fast enough to run frequently during development!

## 🎓 Best Practices

1. **Run all tests before committing**: `npm run test:all`
2. **Check coverage**: Aim for >80% coverage on core logic
3. **Add tests for bugs**: When fixing bugs, add regression tests
4. **Use browser runner**: For visual debugging and detailed logs
5. **Export results**: When reporting bugs, include `test-results.json`

## 📊 Test Coverage Summary

| Test Suite | Tests | Coverage |
|-----------|-------|----------|
| Unit Tests (Vitest) | ~50 | TournamentManager, UIManager, Storage |
| Integration Tests | ~20 | Full workflows, component interactions |
| E2E Scenarios | ~20 | Real-world user scenarios |
| Functional Tests | ~100 | All formats, all configurations, edge cases |
| **Total** | **190+** | **Comprehensive coverage of all tournament logic** |

## 🆘 Troubleshooting

For detailed troubleshooting and project structure, check:
- `CLAUDE.md` in the root directory
- `ISSUES.md` for known issues and planned features

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [happy-dom (test environment)](https://github.com/capricorn86/happy-dom)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)

---

**Questions or issues?** Check `CLAUDE.md` in the root directory for project structure and debugging tips.
