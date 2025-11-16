# Tournament Tests

Automated tests for the Magic Mikes Tournament scoring system.

## Running Tests

### Option 1: Browser (Recommended)

1. Open `tests/run-tests.html` in your browser
2. Click "Run All Tests" button
3. View results in the console output

### Option 2: Browser Console

1. Open `index-sandalone.html` or `index.html` in your browser
2. Open Developer Tools (F12)
3. In the Console tab, run:
   ```javascript
   // Load the test script
   const script = document.createElement('script');
   script.src = 'tests/scoring-tests.js';
   document.head.appendChild(script);

   // Wait for script to load, then run tests
   setTimeout(() => ScoringTests.runAll(), 1000);
   ```

## What Gets Tested

### Test 1: Points Calculation
- Verifies correct point calculation for different match outcomes
- Win 2-0 → 5.0 points
- Win 2-1 → 4.5 points
- Loss 1-2 → 0.0 points
- Loss 0-2 → -1.0 points
- Confirms all points are divisible by 0.5

### Test 2: Round Robin Quality Score
- Tests quality score calculation for Round Robin tournaments
- Verifies quality score = sum of beaten opponents' points
- Confirms no multiplication by 0.5 (which would break divisibility)
- Checks that all quality scores are divisible by 0.5

### Test 3: Group Stage Quality Score
- Tests quality score calculation for Group Stage tournaments
- Verifies consistency with Round Robin logic
- Checks divisibility constraints

### Test 4: Edge Cases
- Tests various point values
- Proves that multiplying by 0.5 breaks divisibility by 0.5
- Validates that summing points maintains divisibility

## Common Issues

### Issue: Quality scores like 2.3, 3.7, etc.
**Cause:** Multiplying points (divisible by 0.5) by 0.5 produces values divisible by 0.25, not 0.5.

**Example:**
- 4.5 * 0.5 = 2.25 ✗ (not divisible by 0.5)
- 5.5 * 0.5 = 2.75 ✗ (not divisible by 0.5)

**Fix:** Never multiply points by 0.5. Quality score should be the direct sum of beaten opponents' points.

### Issue: Quality score uses wins instead of points
**Cause:** Using `stats[oppIdx].wins` instead of `stats[oppIdx].points`

**Fix:** Always use `.points` for quality score calculations.

## Scoring Formula

```
points = (wins * 3) + (gamesWon * 1) + (gamesLost * -0.5)
```

Possible per-match point values:
- Win 2-0: 5.0
- Win 2-1: 4.5
- Loss 1-2: 0.0
- Loss 0-2: -1.0

## Quality Score Formula

```
qualityScore = Σ (points of each beaten opponent)
```

Example:
- Alice beats Bob (4.5 pts) and Charlie (3.0 pts)
- Alice's quality score = 4.5 + 3.0 = 7.5 ✓

## Adding New Tests

To add new tests, edit `tests/scoring-tests.js`:

```javascript
// Add a new test method
testMyNewFeature() {
  console.log('\n=== TEST: My New Feature ===');

  // Your test logic here
  this.assert(
    condition,
    'Description of what should be true'
  );
}

// Add it to runAll()
async runAll() {
  // ... existing tests
  this.testMyNewFeature();
  // ...
}
```
