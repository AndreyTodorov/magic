#!/usr/bin/env node

/**
 * Node.js Test Runner for Tournament Tests
 * Runs test-tournaments.js in a Node environment
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

// Capture console output
const logs = [];
const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  logs.push(message);
  originalLog.apply(console, args);
};

try {
  // Load dependencies in correct order
  console.log('Loading dependencies...\n');

  vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/logger.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/tournament-formats.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/tournament.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'test-tournaments.js'), 'utf8'), context);

  console.log('Running tests...\n');
  console.log('═'.repeat(60));

  // Create and run tester in context
  const results = vm.runInContext(`
    const tester = new TournamentTester();
    tester.runAllTests();
  `, context);

  console.log('\n' + '═'.repeat(60));
  console.log('\nTest Summary:');
  console.log(`Duration: ${results.duration}s`);
  console.log(`Errors: ${results.errors.length}`);
  console.log(`Warnings: ${results.warnings.length}`);
  console.log(`Status: ${results.passed ? '✅ ALL PASSED' : '❌ FAILED'}\n`);

  if (results.errors.length > 0) {
    console.log('Errors:');
    results.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\nWarnings:');
    results.warnings.forEach((warn, i) => {
      console.log(`  ${i + 1}. ${warn}`);
    });
  }

  // Exit with appropriate code
  process.exit(results.passed ? 0 : 1);

} catch (error) {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
