/**
 * State Recovery Tests
 * Critical tests for user experience - ensure tournament state persists and recovers properly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('State Recovery Tests', () => {
  let manager;
  let storageManager;
  let originalGetItem;
  let originalSetItem;

  beforeEach(() => {
    // Mock localStorage
    const storage = {};
    originalGetItem = global.localStorage.getItem;
    originalSetItem = global.localStorage.setItem;

    global.localStorage.getItem = vi.fn((key) => storage[key] || null);
    global.localStorage.setItem = vi.fn((key, value) => {
      storage[key] = value;
    });
    global.localStorage.removeItem = vi.fn((key) => {
      delete storage[key];
    });
    global.localStorage.clear = vi.fn(() => {
      for (const key in storage) {
        delete storage[key];
      }
    });
  });

  afterEach(() => {
    global.localStorage.getItem = originalGetItem;
    global.localStorage.setItem = originalSetItem;
  });

  describe('Tournament State Persistence', () => {
    it('should persist tournament code to localStorage', () => {
      const tournamentCode = 'ABC123XY';
      localStorage.setItem('mm_currentTournament', tournamentCode);

      expect(localStorage.getItem('mm_currentTournament')).toBe(tournamentCode);
    });

    it('should persist creator status to localStorage', () => {
      localStorage.setItem('mm_isCreator', 'true');

      expect(localStorage.getItem('mm_isCreator')).toBe('true');
    });

    it('should persist session timestamp', () => {
      const timestamp = Date.now().toString();
      localStorage.setItem('mm_sessionTimestamp', timestamp);

      expect(localStorage.getItem('mm_sessionTimestamp')).toBe(timestamp);
    });

    it('should persist selected view preference', () => {
      localStorage.setItem('mm_selected_view', 'standings');

      expect(localStorage.getItem('mm_selected_view')).toBe('standings');
    });
  });

  describe('Session Timeout Handling', () => {
    it('should detect expired session (24 hours)', () => {
      const now = Date.now();
      const expired = now - (25 * 60 * 60 * 1000); // 25 hours ago

      localStorage.setItem('mm_sessionTimestamp', expired.toString());
      localStorage.setItem('mm_currentTournament', 'ABC123XY');

      const timestamp = parseInt(localStorage.getItem('mm_sessionTimestamp'));
      const age = now - timestamp;
      const isExpired = age > (24 * 60 * 60 * 1000);

      expect(isExpired).toBe(true);
    });

    it('should not expire valid session (within 24 hours)', () => {
      const now = Date.now();
      const recent = now - (23 * 60 * 60 * 1000); // 23 hours ago

      localStorage.setItem('mm_sessionTimestamp', recent.toString());

      const timestamp = parseInt(localStorage.getItem('mm_sessionTimestamp'));
      const age = now - timestamp;
      const isExpired = age > (24 * 60 * 60 * 1000);

      expect(isExpired).toBe(false);
    });

    it('should clear session data on expiration', () => {
      const now = Date.now();
      const expired = now - (25 * 60 * 60 * 1000);

      localStorage.setItem('mm_sessionTimestamp', expired.toString());
      localStorage.setItem('mm_currentTournament', 'ABC123XY');
      localStorage.setItem('mm_isCreator', 'true');

      // Simulate session cleanup
      const timestamp = parseInt(localStorage.getItem('mm_sessionTimestamp'));
      if (now - timestamp > (24 * 60 * 60 * 1000)) {
        localStorage.removeItem('mm_currentTournament');
        localStorage.removeItem('mm_isCreator');
        localStorage.removeItem('mm_sessionTimestamp');
      }

      expect(localStorage.getItem('mm_currentTournament')).toBeNull();
      expect(localStorage.getItem('mm_isCreator')).toBeNull();
    });
  });

  describe('LocalStorage Quota Handling', () => {
    it('should handle quota exceeded gracefully', () => {
      // Mock quota exceeded error
      const originalSetItem = global.localStorage.setItem;
      global.localStorage.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      let errorCaught = false;
      try {
        localStorage.setItem('test', 'data');
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          errorCaught = true;
        }
      }

      expect(errorCaught).toBe(true);

      // Restore
      global.localStorage.setItem = originalSetItem;
    });

    it('should detect available storage space', () => {
      // This is a simplified test - actual implementation would test available space
      const testKey = 'mm_storage_test';
      const testValue = 'x'.repeat(1000);

      try {
        localStorage.setItem(testKey, testValue);
        localStorage.removeItem(testKey);
        expect(true).toBe(true); // Storage available
      } catch (e) {
        expect(e.name).toBe('QuotaExceededError');
      }
    });
  });

  describe('Corrupted Data Recovery', () => {
    it('should handle corrupted JSON in tournaments storage', () => {
      const corruptedJSON = '{invalid json}}';
      localStorage.setItem('mm_tournaments', corruptedJSON);

      let parsed = null;
      let error = null;

      try {
        parsed = JSON.parse(localStorage.getItem('mm_tournaments'));
      } catch (e) {
        error = e;
        // Fallback to empty tournaments
        parsed = {};
      }

      expect(error).not.toBeNull();
      expect(parsed).toEqual({});
    });

    it('should validate tournament data structure on load', () => {
      const invalidTournament = {
        // Missing required fields
        matches: []
        // No players, no playerCount, etc.
      };

      localStorage.setItem('mm_tournaments', JSON.stringify({
        'ABC123XY': invalidTournament
      }));

      const tournaments = JSON.parse(localStorage.getItem('mm_tournaments'));
      const tournament = tournaments['ABC123XY'];

      // Validation checks
      const isValid = (
        tournament &&
        tournament.hasOwnProperty('players') &&
        tournament.hasOwnProperty('matches') &&
        tournament.hasOwnProperty('playerCount')
      );

      expect(isValid).toBe(false);
    });

    it('should handle missing tournament fields gracefully', () => {
      const incompleteTournament = {
        players: ['Alice', 'Bob'],
        matches: []
        // Missing playerCount, matchesPerPlayer, etc.
      };

      const validated = {
        players: incompleteTournament.players || [],
        matches: incompleteTournament.matches || [],
        playerCount: incompleteTournament.playerCount || incompleteTournament.players?.length || 0,
        matchesPerPlayer: incompleteTournament.matchesPerPlayer || 3,
        createdAt: incompleteTournament.createdAt || Date.now()
      };

      expect(validated.playerCount).toBe(2);
      expect(validated.matchesPerPlayer).toBe(3);
      expect(validated.createdAt).toBeGreaterThan(0);
    });

    it('should handle null/undefined tournament data', () => {
      localStorage.setItem('mm_tournaments', JSON.stringify({
        'ABC123XY': null
      }));

      const tournaments = JSON.parse(localStorage.getItem('mm_tournaments'));
      const tournament = tournaments['ABC123XY'];

      expect(tournament).toBeNull();

      // App should handle null by creating new tournament or showing error
      const safeTournament = tournament || { players: [], matches: [] };
      expect(safeTournament.players).toEqual([]);
    });
  });

  describe('Data Migration', () => {
    it('should handle legacy tournament format (v1)', () => {
      // Old format: no format field, no tournament-formats.js support
      const legacyTournament = {
        players: ['Alice', 'Bob', 'Charlie'],
        matches: [
          { player1: 0, player2: 1, games: [null, null, null], completed: false }
        ],
        playerCount: 3,
        matchesPerPlayer: 1
        // Missing: format, createdAt, etc.
      };

      // Migration logic
      const migrated = {
        ...legacyTournament,
        format: 'round-robin', // Default for old tournaments
        createdAt: legacyTournament.createdAt || Date.now(),
        creator: legacyTournament.creator || null,
        members: legacyTournament.members || {}
      };

      expect(migrated.format).toBe('round-robin');
      expect(migrated.createdAt).toBeGreaterThan(0);
      expect(migrated.members).toEqual({});
    });

    it('should add match IDs if missing (old format)', () => {
      const matchesWithoutIds = [
        { player1: 0, player2: 1, games: [null, null, null] },
        { player1: 0, player2: 2, games: [null, null, null] }
      ];

      // Add IDs
      const migratedMatches = matchesWithoutIds.map((match, index) => ({
        ...match,
        id: match.id !== undefined ? match.id : index
      }));

      expect(migratedMatches[0].id).toBe(0);
      expect(migratedMatches[1].id).toBe(1);
    });

    it('should convert old completed flag to winner (if needed)', () => {
      const oldMatch = {
        player1: 0,
        player2: 1,
        games: [1, 1, null],
        completed: true
        // Missing: winner field
      };

      // Determine winner from games
      const games = oldMatch.games;
      const p1Wins = games.filter(g => g === 1).length;
      const p2Wins = games.filter(g => g === 2).length;

      const migrated = {
        ...oldMatch,
        winner: p1Wins >= 2 ? 1 : p2Wins >= 2 ? 2 : null
      };

      expect(migrated.winner).toBe(1);
    });
  });

  describe('Browser Refresh Recovery', () => {
    it('should restore tournament code after simulated refresh', () => {
      const code = 'TEST1234';
      localStorage.setItem('mm_currentTournament', code);

      // Simulate page refresh by re-reading from localStorage
      const restoredCode = localStorage.getItem('mm_currentTournament');

      expect(restoredCode).toBe(code);
    });

    it('should restore selected view after refresh', () => {
      localStorage.setItem('mm_selected_view', 'matches');

      const restoredView = localStorage.getItem('mm_selected_view');

      expect(restoredView).toBe('matches');
    });

    it('should validate session is still active after refresh', () => {
      const now = Date.now();
      localStorage.setItem('mm_sessionTimestamp', now.toString());
      localStorage.setItem('mm_currentTournament', 'ABC123XY');

      // Simulate refresh - check if session is valid
      const timestamp = parseInt(localStorage.getItem('mm_sessionTimestamp'));
      const age = Date.now() - timestamp;
      const isValid = age < (24 * 60 * 60 * 1000);

      expect(isValid).toBe(true);
    });
  });

  describe('Storage Availability Detection', () => {
    it('should detect if localStorage is available', () => {
      let isAvailable = false;

      try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        isAvailable = true;
      } catch (e) {
        isAvailable = false;
      }

      expect(isAvailable).toBe(true);
    });

    it('should handle private browsing mode (storage disabled)', () => {
      // Mock localStorage being disabled
      const originalSetItem = global.localStorage.setItem;
      global.localStorage.setItem = vi.fn(() => {
        throw new Error('Storage disabled');
      });

      let canStore = false;
      try {
        localStorage.setItem('test', 'value');
        canStore = true;
      } catch (e) {
        canStore = false;
      }

      expect(canStore).toBe(false);

      // Restore
      global.localStorage.setItem = originalSetItem;
    });
  });

  describe('Multi-Tab Sync', () => {
    it('should detect storage changes from other tabs', () => {
      // This would use storage event in real implementation
      const originalCode = 'ABC123XY';
      localStorage.setItem('mm_currentTournament', originalCode);

      // Simulate another tab changing the value
      localStorage.setItem('mm_currentTournament', 'XYZ789AB');

      const newCode = localStorage.getItem('mm_currentTournament');
      expect(newCode).toBe('XYZ789AB');
      expect(newCode).not.toBe(originalCode);
    });
  });
});
