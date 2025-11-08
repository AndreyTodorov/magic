# Testing Quick Start Guide

Get started with testing the Magic Mikes Tournament application in under 5 minutes.

## Installation

```bash
# Install test dependencies
npm install
```

This installs:
- `vitest` - Test framework
- `@vitest/ui` - Visual test interface
- `@vitest/coverage-v8` - Coverage reporting
- `happy-dom` - DOM emulation

## Run Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto re-run on changes)
npm run test:watch

# Run tests with visual UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Expected Output

When you run `npm test`, you should see:

```
✓ tests/tournament.test.js (100+ passed)
  ✓ Initialization (2)
  ✓ Match Generation Validation (3)
  ✓ Match Structure Generation (4)
  ✓ Tournament Creation (2)
  ✓ Player Name Validation (7)
  ✓ Match Game Recording (8)
  ✓ Statistics and Scoring (3)
  ✓ Tournament Progress (1)
  ✓ Tournament Code Generation (3)

✓ tests/ui.test.js (60+ passed)
✓ tests/localStorage.test.js (50+ passed)
✓ tests/integration.test.js (25+ passed)
✓ tests/e2e-scenarios.test.js (30+ passed)

Test Files  5 passed (5)
     Tests  265+ passed (265+)
  Duration  X.XXs
```

## Test Structure

```
tests/
├── setup.js                 # Global test configuration
├── tournament.test.js       # Tournament logic (100+ tests)
├── ui.test.js              # UI components (60+ tests)
├── localStorage.test.js    # Storage layer (50+ tests)
├── integration.test.js     # Integration (25+ tests)
└── e2e-scenarios.test.js   # E2E workflows (30+ tests)
```

## Visual Test UI

For debugging and exploring tests visually:

```bash
npm run test:ui
```

This opens a browser interface at `http://localhost:51204` where you can:
- 👁️ See all tests organized by file
- 🐛 Click on tests to see detailed output
- 📊 View test execution time
- 🔍 Filter and search tests
- 📝 See console logs and errors

## Coverage Report

Generate a detailed coverage report:

```bash
npm run test:coverage
```

Then open the HTML report:

```bash
# Mac
open coverage/index.html

# Windows
start coverage/index.html

# Linux
xdg-open coverage/index.html
```

Coverage targets:
- **Overall**: >80%
- **TournamentManager**: >90% (critical business logic)
- **UIManager**: >70%
- **LocalStorageManager**: >85%

## Run Specific Tests

### Run Single Test File

```bash
npx vitest tests/tournament.test.js
```

### Run Tests Matching Pattern

```bash
# Run all tests with "Match Generation" in the name
npx vitest -t "Match Generation"

# Run all tests in describe blocks containing "Scoring"
npx vitest -t "Scoring"
```

### Run Only Failed Tests

```bash
npx vitest --reporter=verbose --run
```

## Common Issues

### Issue: Tests Fail with "localStorage is not defined"

**Fix**: The setup file should automatically mock localStorage. If you see this error, ensure tests are being run through the npm scripts which load [tests/setup.js](tests/setup.js).

```bash
# ✅ Correct
npm test

# ❌ May not load setup
node tests/tournament.test.js
```

### Issue: "Cannot find module"

**Fix**: Install dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Tests Pass Locally But Fail in CI

**Check**:
1. Node.js version (requires v18+)
2. All dependencies in package.json
3. No hardcoded paths or environment-specific code

## What's Being Tested?

### ✅ Core Features

- **Match Generation**: Balanced pairing algorithm
- **Scoring**: Point calculation with tiebreakers
- **Player Management**: Name validation and sanitization
- **UI Rendering**: View switching, progress tracking
- **Data Persistence**: Tournament CRUD operations
- **Real-time Sync**: Multi-device updates

### ✅ Edge Cases

- Empty inputs
- Invalid data types
- Minimum/maximum boundaries
- Concurrent operations
- XSS prevention

### ✅ User Workflows

- Complete tournament lifecycle
- Odd number of players
- Tie-breaking scenarios
- Session persistence

## Test Examples

### Unit Test Example

From [tests/tournament.test.js](tests/tournament.test.js):

```javascript
it('should generate correct number of matches', () => {
  const structure = manager.generateMatchStructure(4, 2);
  expect(structure.length).toBe(4); // 4 players * 2 matches / 2 = 4
});
```

### Integration Test Example

From [tests/integration.test.js](tests/integration.test.js):

```javascript
it('should update progress as matches complete', () => {
  tournamentManager.updateMatchGame(0, 0, 1);
  tournamentManager.updateMatchGame(0, 1, 1);

  const progress = tournamentManager.getProgress();
  expect(progress.completed).toBe(1);
  expect(progress.percentage).toBe(25);
});
```

### E2E Scenario Example

From [tests/e2e-scenarios.test.js](tests/e2e-scenarios.test.js):

```javascript
it('should handle complete tournament from creation to completion', () => {
  const players = ['Alice', 'Bob', 'Charlie', 'Dave'];

  // Create tournament
  tournamentManager.createTournament(players, 2);

  // Play all matches
  // ... record game results ...

  // Verify completion
  const progress = tournamentManager.getProgress();
  expect(progress.percentage).toBe(100);
});
```

## Next Steps

1. ✅ **Run the tests**: `npm test`
2. 📊 **Check coverage**: `npm run test:coverage`
3. 🔍 **Explore visually**: `npm run test:ui`
4. 📖 **Read full guide**: [docs/TESTING.md](docs/TESTING.md)
5. 📝 **See test summary**: [docs/TEST-SUMMARY.md](docs/TEST-SUMMARY.md)

## Writing Your First Test

Add a new test to [tests/tournament.test.js](tests/tournament.test.js):

```javascript
it('should do something new', () => {
  // Arrange: Set up test data
  const input = 'test';

  // Act: Execute the function
  const result = manager.doSomething(input);

  // Assert: Verify the result
  expect(result).toBe('expected');
});
```

Then run:

```bash
npm run test:watch
```

Your test will automatically run when you save the file!

## Resources

- **Full Testing Guide**: [docs/TESTING.md](docs/TESTING.md)
- **Test Summary**: [docs/TEST-SUMMARY.md](docs/TEST-SUMMARY.md)
- **Project Documentation**: [CLAUDE.md](CLAUDE.md)
- **Vitest Docs**: https://vitest.dev/

## Help

If tests fail or you need help:
1. Check error messages carefully
2. Review existing test files for examples
3. See [docs/TESTING.md](docs/TESTING.md) troubleshooting section
4. Open an issue on GitHub

---

**That's it!** You're ready to run and write tests. Start with `npm test` and explore from there. 🚀
