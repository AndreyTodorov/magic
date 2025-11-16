#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Magic Mikes Tournament
 * Runs both Vitest tests and functional tests, outputs results for CI/CD and Claude Code
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('═'.repeat(80));
console.log('MAGIC MIKES TOURNAMENT - COMPREHENSIVE TEST RUNNER');
console.log('═'.repeat(80));
console.log('');

const results = {
  timestamp: new Date().toISOString(),
  vitest: null,
  functional: null,
  summary: {
    totalErrors: 0,
    totalWarnings: 0,
    allPassed: false,
    duration: 0
  }
};

const startTime = Date.now();

// ============================================================================
// 1. RUN VITEST TESTS
// ============================================================================

console.log('\n📦 RUNNING VITEST TESTS (Unit, Integration, E2E)...\n');
console.log('─'.repeat(80));

try {
  const vitestOutput = execSync('npm test -- --run --reporter=json --reporter=verbose', {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Try to parse JSON output
  const jsonMatch = vitestOutput.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
  if (jsonMatch) {
    const vitestResults = JSON.parse(jsonMatch[0]);
    results.vitest = {
      passed: vitestResults.success || vitestResults.numFailedTests === 0,
      totalTests: vitestResults.numTotalTests,
      passedTests: vitestResults.numPassedTests,
      failedTests: vitestResults.numFailedTests,
      duration: vitestResults.startTime ? (Date.now() - vitestResults.startTime) / 1000 : 0
    };

    console.log(`✅ Vitest tests completed`);
    console.log(`   Tests: ${results.vitest.totalTests}`);
    console.log(`   Passed: ${results.vitest.passedTests}`);
    console.log(`   Failed: ${results.vitest.failedTests}`);
    console.log(`   Duration: ${results.vitest.duration}s`);
  } else {
    console.log('✅ Vitest tests completed (no JSON output)');
    results.vitest = { passed: true, note: 'No JSON output available' };
  }
} catch (error) {
  console.error('❌ Vitest tests failed');
  console.error(error.message);

  results.vitest = {
    passed: false,
    error: error.message,
    stdout: error.stdout?.toString(),
    stderr: error.stderr?.toString()
  };

  if (error.stdout) {
    console.log('\nVitest stdout:');
    console.log(error.stdout.toString());
  }
  if (error.stderr) {
    console.error('\nVitest stderr:');
    console.error(error.stderr.toString());
  }
}

// ============================================================================
// 2. RUN FUNCTIONAL TESTS
// ============================================================================

console.log('\n🔧 RUNNING FUNCTIONAL TESTS (Tournament Logic)...\n');
console.log('─'.repeat(80));

try {
  // Create a shared context for all scripts
  const context = {
    console: console,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    TypeError: TypeError,
    ReferenceError: ReferenceError,
  };

  // Mock browser globals in context
  context.window = context;
  context.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      appendChild: () => {},
      addEventListener: () => {},
      textContent: '',
      innerHTML: '',
      value: '',
    }),
  };

  // Mock location
  context.location = {
    hostname: 'localhost',
    href: 'http://localhost:8000/',
    protocol: 'http:',
    host: 'localhost:8000',
  };

  // Mock localStorage
  context.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };

  // Mock Firebase
  context.firebase = null;

  // Create VM context
  vm.createContext(context);

  // Capture console output for functional tests
  const functionalLogs = [];
  const originalConsoleLog = console.log;

  // Temporarily override console.log to capture functional test output
  console.log = function(...args) {
    const message = args.join(' ');
    functionalLogs.push(message);
    originalConsoleLog.apply(console, args);
  };

  // Load dependencies in correct order
  const rootDir = path.join(__dirname, '..');

  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js/config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js/logger.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js/tournament-formats.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js/tournament.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'functional.test.js'), 'utf8'), context);

  // Run tests in context
  const functionalResults = vm.runInContext(`
    const tester = new TournamentTester();
    tester.runAllTests();
  `, context);

  // Restore console.log
  console.log = originalConsoleLog;

  results.functional = {
    passed: functionalResults.passed,
    errors: functionalResults.errors,
    warnings: functionalResults.warnings,
    duration: functionalResults.duration,
    logs: functionalLogs
  };

  console.log(`\n${functionalResults.passed ? '✅' : '❌'} Functional tests ${functionalResults.passed ? 'passed' : 'failed'}`);
  console.log(`   Errors: ${functionalResults.errors.length}`);
  console.log(`   Warnings: ${functionalResults.warnings.length}`);
  console.log(`   Duration: ${functionalResults.duration}s`);

} catch (error) {
  console.error('❌ Functional tests failed with fatal error');
  console.error(error.message);
  console.error(error.stack);

  results.functional = {
    passed: false,
    errors: [{ message: error.message, stack: error.stack }],
    warnings: [],
    duration: 0
  };
}

// ============================================================================
// 3. GENERATE SUMMARY
// ============================================================================

const endTime = Date.now();
results.summary.duration = ((endTime - startTime) / 1000).toFixed(2);

results.summary.totalErrors =
  (results.vitest?.failedTests || 0) +
  (results.functional?.errors?.length || 0);

results.summary.totalWarnings =
  (results.functional?.warnings?.length || 0);

results.summary.allPassed =
  (results.vitest?.passed !== false) &&
  (results.functional?.passed === true);

console.log('\n');
console.log('═'.repeat(80));
console.log('COMPREHENSIVE TEST SUMMARY');
console.log('═'.repeat(80));
console.log(`Total Duration: ${results.summary.duration}s`);
console.log(`Total Errors: ${results.summary.totalErrors}`);
console.log(`Total Warnings: ${results.summary.totalWarnings}`);
console.log(`Overall Status: ${results.summary.allPassed ? '✅ ALL PASSED' : '❌ FAILED'}`);
console.log('═'.repeat(80));

// ============================================================================
// 4. OUTPUT DETAILED RESULTS
// ============================================================================

if (results.summary.totalErrors > 0) {
  console.log('\n❌ ERRORS DETECTED:\n');

  if (results.vitest && results.vitest.failedTests > 0) {
    console.log('Vitest Failures:');
    console.log(`  ${results.vitest.failedTests} test(s) failed`);
    if (results.vitest.stderr) {
      console.log('\n' + results.vitest.stderr);
    }
  }

  if (results.functional?.errors?.length > 0) {
    console.log('\nFunctional Test Errors:');
    results.functional.errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.message || err}`);
    });
  }
}

if (results.summary.totalWarnings > 0) {
  console.log('\n⚠️  WARNINGS:\n');

  if (results.functional?.warnings?.length > 0) {
    console.log('Functional Test Warnings:');
    results.functional.warnings.forEach((warn, idx) => {
      console.log(`  ${idx + 1}. ${warn.message || warn}`);
    });
  }
}

// ============================================================================
// 5. SAVE RESULTS FOR CLAUDE CODE
// ============================================================================

const outputPath = path.join(__dirname, 'test-results.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

console.log(`\n📄 Detailed results saved to: ${outputPath}`);
console.log('   You can provide this file to Claude Code for debugging.\n');

// ============================================================================
// 6. EXIT WITH APPROPRIATE CODE
// ============================================================================

process.exit(results.summary.allPassed ? 0 : 1);
