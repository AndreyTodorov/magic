/**
 * Test Setup File
 * Initializes global test environment and mocks
 */

import { beforeEach, vi } from 'vitest';

// Mock configuration before loading modules
global.FIREBASE_CONFIG = {
  apiKey: "test-api-key",
  authDomain: "test.firebaseapp.com",
  databaseURL: "https://test.firebaseio.com",
  projectId: "test-project",
  storageBucket: "test.appspot.com",
  messagingSenderId: "123456789",
  appId: "test-app-id",
};

global.APPCHECK_SITE_KEY = "test-site-key";

global.SESSION_CONFIG = {
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  STORAGE_KEYS: {
    TOURNAMENT_CODE: 'currentTournament',
    IS_CREATOR: 'isCreator',
    SESSION_TIMESTAMP: 'sessionTimestamp',
  },
};

global.APP_CONFIG = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 12,
  DEFAULT_PLAYERS: 7,
  TOURNAMENT_CODE_LENGTH: 8,
  GAMES_PER_MATCH: 3,
  SCORING: {
    MATCH_WIN: 3,
    GAME_WIN: 1,
    GAME_LOSS: -0.5,
  },
};

// Mock logger
global.logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
