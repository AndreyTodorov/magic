# Tournament Testing Guide

This document describes the automated functional testing system for Magic Mikes Tournament.

## Overview

The test suite simulates complete tournaments across all formats with various player counts to verify:
- Match generation correctness
- Bracket advancement logic
- Stage transitions (Swiss, Group Stage)
- Standings calculations
- Edge cases (BYEs, odd player counts, non-power-of-2 brackets)

## Running Tests

### Browser-Based Testing (Recommended)

1. **Start a local server:**
   ```bash
   python3 -m http.server 8000
   # OR
   npx http-server -p 8000
   ```

2. **Open test runner:**
   ```
   http://localhost:8000/test-runner.html
   ```

3. **Click "RUN ALL TESTS"** and review results

### What Gets Tested

#### Round Robin (3 scenarios)
- ✓ 4 players, 3 matches each
- ✓ 7 players, 3 matches each
- ✓ 8 players, 2 matches each

**Validates:**
- Each player gets exactly N matches
- Total match count is correct
- Standings calculation works
- Match distribution is balanced

#### Single Elimination (6 scenarios)
- ✓ 2 players (minimum)
- ✓ 4 players (power of 2)
- ✓ 5 players (non-power of 2, 3 BYEs)
- ✓ 8 players (power of 2)
- ✓ 13 players (non-power of 2, 3 BYEs)
- ✓ 16 players (power of 2)

**Validates:**
- Bracket structure is correct
- BYEs are properly distributed
- Winner advancement works through all rounds
- Exactly one champion emerges
- Round count matches expected (log2 of bracket size)

#### Double Elimination (4 scenarios)
- ✓ 3 players (minimum)
- ✓ 4 players (power of 2)
- ✓ 6 players (non-power of 2)
- ✓ 8 players (power of 2)

**Validates:**
- Winners bracket structure
- Losers bracket structure
- Split advancement (winners/losers)
- Correct match feeding (feedsIntoWin, feedsIntoLoss)
- Tournament completes without infinite loops

#### Swiss Tournament (4 scenarios)
- ✓ 4 players, 3 rounds (even)
- ✓ 7 players, 3 rounds (odd, BYE each round)
- ✓ 8 players, 4 rounds (even)
- ✓ 16 players, 5 rounds (larger tournament)

**Validates:**
- Round 1 pairing generation
- Dynamic round generation after each round
- BYE handling for odd player counts
- No repeat pairings (where possible)
- Standings-based pairing (swiss algorithm)
- All rounds complete successfully

#### Group Stage + Playoffs (3 scenarios)
- ✓ 8 players: 2 groups of 4, top 2 advance
- ✓ 12 players: 3 groups of 4, top 2 advance
- ✓ 16 players: 4 groups of 4, top 2 advance

**Validates:**
- Group assignments are balanced
- Round-robin within each group
- Stage detection (groups complete)
- Playoff bracket population
- Top players advance correctly
- Playoff bracket completes

## Test Output

### Success
```
✅ ALL TESTS PASSED!
Duration: 2.34s
Errors: 0
Warnings: 0
```

### Failure
```
❌ ERRORS FOUND:
1. Player 5 has 2 matches, expected 3
2. Standings has 7 players, expected 8

Duration: 1.87s
Errors: 2
Warnings: 1
```

## Understanding Test Results

**Green (✓):** Test passed successfully
**Red (✗):** Critical error - feature is broken
**Yellow (⚠):** Warning - works but may have issues

### Common Issues

1. **"Player X has Y matches, expected Z"**
   - Match distribution algorithm failed
   - Check `generateMatches()` in tournament-formats.js

2. **"Standings not properly sorted"**
   - Tiebreaker logic incorrect
   - Check `calculateStandings()` in tournament-formats.js

3. **"No final winner found"**
   - Bracket advancement broken
   - Check `advanceWinnerToNextMatch()` in tournament.js

4. **"Failed to generate Round X"**
   - Swiss pairing algorithm issue
   - Check `generateSwissRoundPairings()` in tournament-formats.js

5. **"Cannot advance to playoffs"**
   - Stage detection broken
   - Check `isCurrentStageComplete()` or `canAdvanceStage()` in tournament.js

## Debugging Failed Tests

1. **Open Browser DevTools** (F12)
2. **Check Console** for detailed error messages
3. **Look for stack traces** showing exact line numbers
4. **Verify test assumptions** match implementation

## Adding New Tests

Edit `test-tournaments.js` and add new test methods:

```javascript
testNewFormat(playerCount) {
  this.log(`\n=== Testing New Format: ${playerCount} players ===`);

  try {
    const manager = new TournamentManager();
    const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);

    manager.createTournament(players, 0, 'new-format');

    // Your test logic here

    this.log(`✓ Test passed`);
    return true;
  } catch (error) {
    this.log(`Test failed: ${error.message}`, 'error');
    return false;
  }
}
```

Then add to `runAllTests()`:

```javascript
this.log('\n\n🆕 NEW FORMAT TESTS');
this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
this.testNewFormat(4);
this.testNewFormat(8);
```

## Files

- **test-tournaments.js** - Test suite implementation
- **test-runner.html** - Browser test runner with UI
- **TESTING.md** - This file

## Continuous Testing

Run tests after any changes to:
- `js/tournament.js` - Core tournament logic
- `js/tournament-formats.js` - Format-specific logic
- `js/ui.js` - Schedule rendering (less critical)
- `js/app.js` - Match update flow

## Notes

- Tests use random match winners for variety
- Tests complete quickly (< 5 seconds for all scenarios)
- Tests are deterministic except for random pairing/seeding
- No data is persisted (all in-memory)
- Works in offline mode (no Firebase needed)
