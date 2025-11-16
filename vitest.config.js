import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['js/**/*.js'],
      exclude: ['js/firebase.js'] // Exclude Firebase integration from coverage
    },
    include: ['tests/**/*.test.js'],
    exclude: ['tests/functional.test.js'] // Exclude browser-based functional tests from vitest
  }
});
