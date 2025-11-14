/**
 * FIREBASE CONFIGURATION
 *
 * Setup Instructions for Local Development:
 * 1. Copy js/config.local.js.template to js/config.local.js
 * 2. Edit config.local.js with your actual Firebase credentials
 * 3. The local config will override these placeholder values
 *
 * For Production:
 * Replace these values with your production Firebase credentials
 */

// Default configuration (placeholders for production deployment)
let FIREBASE_CONFIG = {
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
let APPCHECK_SITE_KEY = "APP_CHECK_SITE_KEY";

/**
 * Environment Detection
 * Automatically detects if running in development or production
 */
let ENVIRONMENT = 'development'; // Set to 'production' when deploying

// Detect localhost/development
if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
        ENVIRONMENT = 'development';
    }
}

// Override with local config if it exists (for local development)
if (typeof FIREBASE_CONFIG_OVERRIDE !== 'undefined') {
    FIREBASE_CONFIG = FIREBASE_CONFIG_OVERRIDE;
    console.log('✓ Using local Firebase configuration');
}

if (typeof APPCHECK_SITE_KEY_OVERRIDE !== 'undefined') {
    APPCHECK_SITE_KEY = APPCHECK_SITE_KEY_OVERRIDE;
}

if (typeof ENVIRONMENT_OVERRIDE !== 'undefined') {
    ENVIRONMENT = ENVIRONMENT_OVERRIDE;
}

console.log(`🌍 Environment: ${ENVIRONMENT}`);

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

    // Authentication Requirements:
    // ✅ Login REQUIRED to CREATE tournaments
    // ❌ Login NOT required to VIEW tournaments
    // ❌ Login NOT required to UPDATE match scores
    //
    // Unauthenticated users can:
    //   - View any tournament by entering its code
    //   - Update match scores in real-time
    //   - See live standings and schedules
    //
    // Authenticated users additionally can:
    //   - Create new tournaments
    //   - Be listed as tournament members
    //   - Have their activity tracked
    REQUIRE_LOGIN_TO_JOIN: false,  // Currently not enforced - joining works without auth
};

/**
 * App Check Configuration
 */
const APPCHECK_CONFIG = {
    // Enable App Check in production for security
    ENABLED: ENVIRONMENT === 'production',

    // Whether to enforce App Check (reject requests without valid tokens)
    // Set to false during initial deployment, then enable after testing
    ENFORCE: false,
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

    // Tournament format configuration
    FORMATS: {
        DEFAULT: 'round-robin', // Default format for new tournaments

        // Scoring systems for different formats
        SCORING_SYSTEMS: {
            'points': {  // Current system for round-robin
                MATCH_WIN: 3,
                GAME_WIN: 1,
                GAME_LOSS: -0.5,
            },
            'wins-only': {  // For elimination formats
                MATCH_WIN: 1,
                GAME_WIN: 0,
                GAME_LOSS: 0,
            },
            'swiss': {  // Swiss pairing points
                MATCH_WIN: 3,
                MATCH_DRAW: 1,
                MATCH_LOSS: 0,
                GAME_WIN: 0,    // Game wins don't count in Swiss
                GAME_LOSS: 0,
            },
        },
    },
};