# Tournament Tests

Comprehensive automated test suite for the Magic Mikes Tournament system.

## Test Suites

### 1. Scoring Tests (`scoring-tests.js`)
Tests for point calculations and quality score algorithms.

### 2. Tournament Structure Tests (`tournament-structure-tests.js`)
Tests for all tournament formats and configurations.

## Running Tests

### Quick Start: All Tests (Recommended)

```bash
# Open in browser
open tests/run-all-tests.html
```

This runs both scoring and structure tests with a comprehensive dashboard showing:
- Total tests run
- Pass/fail counts
- Pass rate percentage
- Detailed test output

### Individual Test Suites

**Scoring Tests Only:**
```bash
open tests/run-tests.html
```

**Structure Tests (via console):**
```javascript
// In browser console after loading the app
const script = document.createElement('script');
script.src = 'tests/tournament-structure-tests.js';
document.head.appendChild(script);
setTimeout(() => TournamentStructureTests.runAll(), 1000);
```

## What Gets Tested

### Scoring Tests

**Test 1: Points Calculation**
- Win 2-0 → 5.0 points
- Win 2-1 → 4.5 points
- Loss 1-2 → 0.0 points
- Loss 0-2 → -1.0 points
- Verifies all points divisible by 0.5

**Test 2: Round Robin Quality Score**
- Quality score = sum of beaten opponents' points
- No multiplication by 0.5 (breaks divisibility)
- All quality scores divisible by 0.5

**Test 3: Group Stage Quality Score**
- Consistent with Round Robin logic
- Divisibility constraints maintained

**Test 4: Edge Cases**
- Various point values tested
- Proves multiplication by 0.5 breaks divisibility
- Validates summing maintains divisibility

### Structure Tests

**Test 1: Group Stage - All Configurations**
Tests every optimal configuration for each player count:
- 8 players (1 configuration)
- 12 players (2 configurations)
- 16 players (2 configurations)
- 20 players (2 configurations)
- 24 players (3 configurations)
- 32 players (3 configurations)

Validates:
✓ Correct number of group matches
✓ Correct number of playoff matches
✓ Total advancing is power of 2
✓ All players assigned correctly
✓ Playoff matches start as placeholders
✓ Standings calculation works

**Test 2: Single Elimination**
Tests various player counts (4, 8, 16, 32):
✓ Correct total matches (n-1)
✓ Correct matches per round
✓ First round fully populated
✓ Standings include all players

**Test 3: Double Elimination**
Tests player counts (4, 8, 16):
✓ Winners bracket correct size
✓ Losers bracket exists
✓ Grand finals exist
✓ All brackets properly structured

**Test 4: Swiss Format**
Tests various configurations:
✓ Correct total matches (rounds × players/2)
✓ Each round has correct matches
✓ First round populated
✓ Later rounds are placeholders

**Test 5: Round Robin**
Tests different player/match combinations:
✓ Total matches correct
✓ Each player has correct match count
✓ No duplicate pairings
✓ Standings calculation works

**Test 6: Playoff Advancement**
Simulates complete group stage:
✓ Groups form correctly
✓ Standings calculated properly
✓ Top N players advance
✓ Correct number advance to playoffs

**Test 7: Invalid Configurations Rejected**
Validates configuration rules:
✓ Non-power-of-2 advancing rejected
✓ Over 50% advancing rejected
✓ Valid configurations accepted

## Test Coverage Summary

| Test Suite | Tests | Coverage |
|-----------|-------|----------|
| Scoring Tests | ~30 | Points calculation, quality scores, edge cases |
| Structure Tests | 100+ | All formats, all valid configurations, advancement |
| **Total** | **130+** | **Comprehensive coverage of all tournament logic** |

## Expected Results

All tests should pass for a working tournament system:
- **Scoring Tests**: ~30 tests, all passing
- **Structure Tests**: 100+ tests, all passing
- **Pass Rate**: 100%

## Common Issues

### Issue: Structure test fails on Group Stage configuration

**Cause:** Invalid configuration not properly validated

**Example:** 16 players in 8 groups with 3 advancing = 24 total (not power of 2)

**Fix:** Ensure `validateConfig()` enforces power-of-2 rule

### Issue: Match count mismatch

**Cause:** Placeholder matches counted in totals

**Example:** Single elimination showing 16 matches instead of 15

**Fix:** Filter out placeholder matches in progress calculation

### Issue: Quality score not divisible by 0.5

**Cause:** Multiplying points by 0.5

**Example:** 4.5 * 0.5 = 2.25 (divisible by 0.25, not 0.5)

**Fix:** Never multiply points; only sum them

## Adding New Tests

### Scoring Tests

Edit `tests/scoring-tests.js`:

```javascript
testMyNewFeature() {
  console.log('\n=== TEST: My New Feature ===');

  // Your test logic
  this.assert(
    condition,
    'Description of what should be true'
  );
}

// Add to runAll()
async runAll() {
  // ... existing tests
  this.testMyNewFeature();
}
```

### Structure Tests

Edit `tests/tournament-structure-tests.js`:

```javascript
testMyNewFormat() {
  console.log('\n=== TEST: My New Format ===');

  const format = new MyNewFormat();
  const players = this.generatePlayers(16);
  const config = format.getDefaultConfig(16);

  const matches = format.generateMatches(players, config);

  this.assert(
    matches.length === expectedCount,
    'Correct number of matches generated'
  );
}

// Add to runAll()
async runAll() {
  // ... existing tests
  this.testMyNewFormat();
}
```

## Continuous Testing

For development, you can set up continuous testing:

1. Open `tests/run-all-tests.html` in browser
2. Keep DevTools console open
3. Run tests after each code change
4. All tests should stay green ✅

## Debugging Failed Tests

When a test fails:

1. **Check the test output** - shows exactly which assertion failed
2. **Review the error message** - describes what was expected vs actual
3. **Check recent code changes** - likely culprit
4. **Run specific test suite** - isolate the problem
5. **Add console.log** in test - inspect intermediate values

## Performance

- Scoring tests: ~100ms
- Structure tests: ~500ms
- Total test time: ~600ms

Fast enough to run frequently during development!

## CI/CD Integration

These tests can be automated in CI/CD pipelines:

```bash
# Headless browser testing with Playwright/Puppeteer
npm install -D playwright
node run-tests-headless.js
```

(Future enhancement - test runner script needed)

