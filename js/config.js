/**
 * FIREBASE CONFIGURATION
 *
 * Setup Instructions:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project
 * 3. Enable Realtime Database
 * 4. Set database rules (see DATABASE_RULES below)
 * 5. Get your config from Project Settings > General
 * 6. Replace the values below with your Firebase project credentials
 */

const FIREBASE_CONFIG = {
    apiKey: "FIREBASE_API_KEY",
    authDomain: "FIREBASE_AUTH_DOMAIN",
    databaseURL: "FIREBASE_DATABASE_URL",
    projectId: "FIREBASE_PROJECT_ID",
    storageBucket: "FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
    appId: "FIREBASE_APP_ID",
};

/**
 * Firebase App Check Site Key
 * Get this from Firebase Console > App Check
 */
const APPCHECK_SITE_KEY = "APP_CHECK_SITE_KEY";

/**
 * Recommended Database Rules
 * Copy and paste into Firebase Console > Realtime Database > Rules
 */
const DATABASE_RULES = `
{
  "rules": {
    "tournaments": {
      "$tournamentId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["createdAt"],
        "members": {
          ".indexOn": [".value"]
        }
      }
    }
  }
}
`;

/**
 * Authentication Configuration
 */
const AUTH_CONFIG = {
    // Set to 'email' for email/password, 'anonymous' for anonymous auth
    MODE: 'email',

    // Whether to require login for joining tournaments
    REQUIRE_LOGIN_TO_JOIN: false,  // Set true if you want login required to join
};

/**
 * Session Configuration
 */
const SESSION_CONFIG = {
    // Tournament session expires after 24 hours
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000,

    // Local storage keys
    STORAGE_KEYS: {
        TOURNAMENT_CODE: 'currentTournament',
        IS_CREATOR: 'isCreator',
        SESSION_TIMESTAMP: 'sessionTimestamp',
    },
};

/**
 * Application Constants
 */
const APP_CONFIG = {
    MIN_PLAYERS: 3,
    MAX_PLAYERS: 12,
    DEFAULT_PLAYERS: 7,
    TOURNAMENT_CODE_LENGTH: 8,
    GAMES_PER_MATCH: 3, // Best of 3

    // Scoring system
    SCORING: {
        MATCH_WIN: 3,
        GAME_WIN: 1,
        GAME_LOSS: -0.5,
    },
};