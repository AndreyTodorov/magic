/**
 * Unit Tests for LocalStorageManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('LocalStorageManager', () => {
  let manager;
  let userIdCounter = 0;

  // Mock LocalStorageManager class
  class LocalStorageManager {
    constructor() {
      this.isInitialized = true;
      this.currentUser = { uid: "local-user-" + (++userIdCounter) };
      this.listeners = new Map();
      this.storageKey = "magic_mikes_tournaments";
    }

    async initialize() {
      this.updateConnectionStatus(true);
      return true;
    }

    updateConnectionStatus(connected) {
      // Mock implementation
    }

    getAllTournaments() {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    }

    saveAllTournaments(tournaments) {
      localStorage.setItem(this.storageKey, JSON.stringify(tournaments));
      this.triggerListeners();
    }

    async tournamentExists(tournamentCode) {
      const tournaments = this.getAllTournaments();
      return tournaments[tournamentCode] !== undefined;
    }

    async createTournament(tournamentCode, data) {
      const tournaments = this.getAllTournaments();

      const tournamentData = {
        ...data,
        creator: this.currentUser.uid,
        members: { [this.currentUser.uid]: true },
        createdAt: Date.now(),
      };

      tournaments[tournamentCode] = tournamentData;
      this.saveAllTournaments(tournaments);

      return true;
    }

    async joinTournament(tournamentCode) {
      const tournaments = this.getAllTournaments();

      if (!tournaments[tournamentCode]) {
        throw new Error("Tournament not found");
      }

      if (!tournaments[tournamentCode].members) {
        tournaments[tournamentCode].members = {};
      }

      tournaments[tournamentCode].members[this.currentUser.uid] = true;
      this.saveAllTournaments(tournaments);

      return true;
    }

    async getTournamentData(tournamentCode) {
      const tournaments = this.getAllTournaments();
      return tournaments[tournamentCode] || null;
    }

    async updateMatch(tournamentCode, matchId, matchData) {
      const tournaments = this.getAllTournaments();

      if (!tournaments[tournamentCode]) {
        throw new Error("Tournament not found");
      }

      if (!tournaments[tournamentCode].matches) {
        tournaments[tournamentCode].matches = {};
      }

      tournaments[tournamentCode].matches[matchId] = matchData;
      this.saveAllTournaments(tournaments);

      return true;
    }

    onTournamentUpdate(tournamentCode, callback) {
      if (!this.listeners.has(tournamentCode)) {
        this.listeners.set(tournamentCode, []);
      }
      this.listeners.get(tournamentCode).push(callback);

      const tournaments = this.getAllTournaments();
      callback(tournaments[tournamentCode] || null);

      return () => {
        const callbacks = this.listeners.get(tournamentCode);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      };
    }

    triggerListeners() {
      const tournaments = this.getAllTournaments();

      this.listeners.forEach((callbacks, tournamentCode) => {
        const data = tournaments[tournamentCode] || null;
        callbacks.forEach((callback) => callback(data));
      });
    }

    offTournamentUpdate(tournamentCode) {
      this.listeners.delete(tournamentCode);
    }

    async deleteTournament(tournamentCode) {
      const tournaments = this.getAllTournaments();
      delete tournaments[tournamentCode];
      this.saveAllTournaments(tournaments);

      return true;
    }

    async isCreator(tournamentCode) {
      const tournaments = this.getAllTournaments();
      const tournament = tournaments[tournamentCode];
      if (!tournament) return false;
      return tournament.creator === this.currentUser.uid;
    }

    onConnectionChange(callback) {
      setTimeout(() => callback(true), 0);
    }

    clearAllTournaments() {
      localStorage.removeItem(this.storageKey);
      this.listeners.clear();
    }
  }

  beforeEach(() => {
    localStorage.clear();
    manager = new LocalStorageManager();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(manager.isInitialized).toBe(true);
      expect(manager.currentUser).toBeDefined();
      expect(manager.currentUser.uid).toContain('local-user-');
      expect(manager.storageKey).toBe('magic_mikes_tournaments');
    });

    it('should initialize successfully', async () => {
      const result = await manager.initialize();
      expect(result).toBe(true);
    });
  });

  describe('Storage Operations', () => {
    it('should return empty object when no tournaments exist', () => {
      const tournaments = manager.getAllTournaments();
      expect(tournaments).toEqual({});
    });

    it('should save tournaments to localStorage', () => {
      const testData = {
        'ABC123': { players: ['Alice', 'Bob'], creator: 'user1' }
      };

      manager.saveAllTournaments(testData);

      const stored = JSON.parse(localStorage.getItem(manager.storageKey));
      expect(stored).toEqual(testData);
    });

    it('should retrieve tournaments from localStorage', () => {
      const testData = {
        'ABC123': { players: ['Alice', 'Bob'] }
      };
      localStorage.setItem(manager.storageKey, JSON.stringify(testData));

      const tournaments = manager.getAllTournaments();
      expect(tournaments).toEqual(testData);
    });
  });

  describe('Tournament Existence', () => {
    it('should return false for non-existent tournament', async () => {
      const exists = await manager.tournamentExists('NONEXIST');
      expect(exists).toBe(false);
    });

    it('should return true for existing tournament', async () => {
      await manager.createTournament('ABC123', {
        players: ['Alice', 'Bob'],
        matches: {}
      });

      const exists = await manager.tournamentExists('ABC123');
      expect(exists).toBe(true);
    });
  });

  describe('Tournament Creation', () => {
    it('should create tournament with correct structure', async () => {
      const tournamentData = {
        players: ['Alice', 'Bob', 'Charlie'],
        matches: {},
        matchesPerPlayer: 2
      };

      await manager.createTournament('TEST123', tournamentData);

      const tournaments = manager.getAllTournaments();
      expect(tournaments['TEST123']).toBeDefined();
      expect(tournaments['TEST123'].players).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(tournaments['TEST123'].creator).toBe(manager.currentUser.uid);
      expect(tournaments['TEST123'].createdAt).toBeDefined();
    });

    it('should add creator to members list', async () => {
      await manager.createTournament('TEST123', {
        players: ['Alice', 'Bob'],
        matches: {}
      });

      const tournament = await manager.getTournamentData('TEST123');
      expect(tournament.members[manager.currentUser.uid]).toBe(true);
    });

    it('should create multiple tournaments', async () => {
      await manager.createTournament('TOUR1', { players: ['A', 'B'] });
      await manager.createTournament('TOUR2', { players: ['C', 'D'] });

      const tournaments = manager.getAllTournaments();
      expect(Object.keys(tournaments)).toHaveLength(2);
      expect(tournaments['TOUR1']).toBeDefined();
      expect(tournaments['TOUR2']).toBeDefined();
    });
  });

  describe('Tournament Joining', () => {
    beforeEach(async () => {
      await manager.createTournament('JOIN123', {
        players: ['Alice', 'Bob'],
        matches: {}
      });
    });

    it('should join existing tournament', async () => {
      const newManager = new LocalStorageManager();
      await newManager.joinTournament('JOIN123');

      const tournament = await newManager.getTournamentData('JOIN123');
      expect(tournament.members[newManager.currentUser.uid]).toBe(true);
    });

    it('should throw error when joining non-existent tournament', async () => {
      await expect(manager.joinTournament('NONEXIST'))
        .rejects.toThrow('Tournament not found');
    });

    it('should preserve existing members when joining', async () => {
      const originalCreator = manager.currentUser.uid;
      const newManager = new LocalStorageManager();

      await newManager.joinTournament('JOIN123');

      const tournament = await newManager.getTournamentData('JOIN123');
      expect(tournament.members[originalCreator]).toBe(true);
      expect(tournament.members[newManager.currentUser.uid]).toBe(true);
    });
  });

  describe('Tournament Data Retrieval', () => {
    it('should return null for non-existent tournament', async () => {
      const data = await manager.getTournamentData('NONEXIST');
      expect(data).toBe(null);
    });

    it('should return tournament data', async () => {
      const tournamentData = {
        players: ['Alice', 'Bob'],
        matches: { 0: { id: 0 } }
      };

      await manager.createTournament('DATA123', tournamentData);
      const retrieved = await manager.getTournamentData('DATA123');

      expect(retrieved.players).toEqual(['Alice', 'Bob']);
      expect(retrieved.matches).toBeDefined();
    });
  });

  describe('Match Updates', () => {
    beforeEach(async () => {
      await manager.createTournament('MATCH123', {
        players: ['Alice', 'Bob'],
        matches: {}
      });
    });

    it('should update match data', async () => {
      const matchData = {
        id: 0,
        player1: 0,
        player2: 1,
        games: [1, 1, null],
        winner: 1
      };

      await manager.updateMatch('MATCH123', 0, matchData);

      const tournament = await manager.getTournamentData('MATCH123');
      expect(tournament.matches[0]).toEqual(matchData);
    });

    it('should update multiple matches', async () => {
      await manager.updateMatch('MATCH123', 0, { id: 0, winner: 1 });
      await manager.updateMatch('MATCH123', 1, { id: 1, winner: 2 });

      const tournament = await manager.getTournamentData('MATCH123');
      expect(tournament.matches[0].winner).toBe(1);
      expect(tournament.matches[1].winner).toBe(2);
    });

    it('should throw error when updating non-existent tournament', async () => {
      await expect(manager.updateMatch('NONEXIST', 0, { id: 0 }))
        .rejects.toThrow('Tournament not found');
    });
  });

  describe('Tournament Listeners', () => {
    it('should call listener immediately with current data', async () => {
      await manager.createTournament('LISTEN123', {
        players: ['Alice', 'Bob']
      });

      const callback = vi.fn();
      manager.onTournamentUpdate('LISTEN123', callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          players: ['Alice', 'Bob']
        })
      );
    });

    it('should call listener when data changes', async () => {
      await manager.createTournament('LISTEN123', {
        players: ['Alice'],
        matches: {}
      });

      const callback = vi.fn();
      manager.onTournamentUpdate('LISTEN123', callback);

      // Clear initial call
      callback.mockClear();

      // Update tournament
      await manager.updateMatch('LISTEN123', 0, { id: 0, winner: 1 });

      expect(callback).toHaveBeenCalled();
    });

    it('should support multiple listeners', async () => {
      await manager.createTournament('LISTEN123', { players: [] });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.onTournamentUpdate('LISTEN123', callback1);
      manager.onTournamentUpdate('LISTEN123', callback2);

      callback1.mockClear();
      callback2.mockClear();

      manager.saveAllTournaments(manager.getAllTournaments());

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', async () => {
      await manager.createTournament('LISTEN123', { players: [] });

      const callback = vi.fn();
      const unsubscribe = manager.onTournamentUpdate('LISTEN123', callback);

      callback.mockClear();
      unsubscribe();

      manager.saveAllTournaments(manager.getAllTournaments());

      expect(callback).not.toHaveBeenCalled();
    });

    it('should call listener with null for non-existent tournament', () => {
      const callback = vi.fn();
      manager.onTournamentUpdate('NONEXIST', callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('Tournament Deletion', () => {
    beforeEach(async () => {
      await manager.createTournament('DELETE123', {
        players: ['Alice', 'Bob']
      });
    });

    it('should delete tournament', async () => {
      await manager.deleteTournament('DELETE123');

      const exists = await manager.tournamentExists('DELETE123');
      expect(exists).toBe(false);
    });

    it('should trigger listeners after deletion', async () => {
      const callback = vi.fn();
      manager.onTournamentUpdate('DELETE123', callback);
      callback.mockClear();

      await manager.deleteTournament('DELETE123');

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('should not affect other tournaments', async () => {
      await manager.createTournament('KEEP123', { players: ['X', 'Y'] });
      await manager.deleteTournament('DELETE123');

      const exists = await manager.tournamentExists('KEEP123');
      expect(exists).toBe(true);
    });
  });

  describe('Creator Check', () => {
    it('should return true for creator', async () => {
      await manager.createTournament('CREATOR123', { players: [] });

      const isCreator = await manager.isCreator('CREATOR123');
      expect(isCreator).toBe(true);
    });

    it('should return false for non-creator', async () => {
      await manager.createTournament('CREATOR123', { players: [] });

      const newManager = new LocalStorageManager();
      const isCreator = await newManager.isCreator('CREATOR123');
      expect(isCreator).toBe(false);
    });

    it('should return false for non-existent tournament', async () => {
      const isCreator = await manager.isCreator('NONEXIST');
      expect(isCreator).toBe(false);
    });
  });

  describe('Connection Monitoring', () => {
    it('should call connection callback with true', async () => {
      return new Promise((resolve) => {
        manager.onConnectionChange((connected) => {
          expect(connected).toBe(true);
          resolve();
        });
      });
    });
  });

  describe('Cleanup Operations', () => {
    it('should clear all tournaments', async () => {
      await manager.createTournament('TOUR1', { players: [] });
      await manager.createTournament('TOUR2', { players: [] });

      manager.clearAllTournaments();

      const tournaments = manager.getAllTournaments();
      expect(tournaments).toEqual({});
    });

    it('should clear all listeners', async () => {
      await manager.createTournament('TOUR1', { players: [] });

      const callback = vi.fn();
      manager.onTournamentUpdate('TOUR1', callback);

      manager.clearAllTournaments();

      expect(manager.listeners.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed localStorage data', () => {
      localStorage.setItem(manager.storageKey, 'invalid json');

      expect(() => manager.getAllTournaments()).toThrow();
    });

    it('should handle missing matches object', async () => {
      await manager.createTournament('NOMATCH', { players: ['A'] });

      // Remove matches manually
      const tournaments = manager.getAllTournaments();
      delete tournaments['NOMATCH'].matches;
      localStorage.setItem(manager.storageKey, JSON.stringify(tournaments));

      // Should create matches object when updating
      await manager.updateMatch('NOMATCH', 0, { id: 0 });

      const tournament = await manager.getTournamentData('NOMATCH');
      expect(tournament.matches).toBeDefined();
    });

    it('should handle missing members object', async () => {
      // Create tournament manually without members
      const tournaments = {
        'NOMEMBERS': {
          players: ['A', 'B'],
          creator: 'user1'
        }
      };
      localStorage.setItem(manager.storageKey, JSON.stringify(tournaments));

      // Should create members when joining
      await manager.joinTournament('NOMEMBERS');

      const tournament = await manager.getTournamentData('NOMEMBERS');
      expect(tournament.members).toBeDefined();
    });
  });
});
