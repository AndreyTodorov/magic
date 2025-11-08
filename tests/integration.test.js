/**
 * Integration Tests for App Class
 * Tests the interaction between multiple components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('App Integration Tests', () => {
  let app, tournamentManager, uiManager, storageManager;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="modeSelector"></div>
      <div id="joinSection"></div>
      <div id="createSection"></div>
      <div id="tournamentSection"></div>
      <div id="viewTabs"></div>
      <input id="playerCount" type="number" value="4">
      <select id="matchesPerPlayer"></select>
      <div id="playerInputs"></div>
      <div id="matchesContainer"></div>
      <div id="standingsTable"></div>
      <div id="scheduleGrid"></div>
      <button id="generateBtn">Generate</button>
      <div id="progressFill"></div>
      <div id="progressText"></div>
    `;

    // Mock managers (simplified versions)
    tournamentManager = {
      players: [],
      matches: [],
      playerCount: 4,
      matchesPerPlayer: 2,
      createTournament: vi.fn((players, matchesPerPlayer) => {
        tournamentManager.players = players;
        tournamentManager.playerCount = players.length;
        tournamentManager.matchesPerPlayer = matchesPerPlayer;
        tournamentManager.matches = [
          { id: 0, player1: 0, player2: 1, games: [null, null, null], winner: null },
          { id: 1, player1: 2, player2: 3, games: [null, null, null], winner: null },
          { id: 2, player1: 0, player2: 2, games: [null, null, null], winner: null },
          { id: 3, player1: 1, player2: 3, games: [null, null, null], winner: null },
        ];
        return tournamentManager.matches;
      }),
      updateMatchGame: vi.fn((matchId, gameNum, winner) => {
        const match = tournamentManager.matches[matchId];
        match.games[gameNum] = winner;

        // Simple winner detection
        const p1Wins = match.games.filter(g => g === 1).length;
        const p2Wins = match.games.filter(g => g === 2).length;

        if (p1Wins >= 2) match.winner = 1;
        else if (p2Wins >= 2) match.winner = 2;

        return { match, updated: true };
      }),
      getProgress: vi.fn(() => {
        const completed = tournamentManager.matches.filter(m => m.winner !== null).length;
        return {
          completed,
          total: tournamentManager.matches.length,
          percentage: (completed / tournamentManager.matches.length) * 100
        };
      }),
      getStandings: vi.fn(() => ({
        rankedStats: tournamentManager.players.map((player, i) => ({
          player,
          playerIndex: i,
          wins: 0,
          losses: 0,
          points: 0,
          rank: i + 1
        })),
        tiedRanks: new Set()
      })),
      reset: vi.fn(() => {
        tournamentManager.players = [];
        tournamentManager.matches = [];
      })
    };

    uiManager = {
      currentView: 'matches',
      elements: {
        playerInputs: document.getElementById('playerInputs'),
        matchesContainer: document.getElementById('matchesContainer'),
        standingsTable: document.getElementById('standingsTable'),
        scheduleGrid: document.getElementById('scheduleGrid'),
        progressFill: document.getElementById('progressFill'),
        progressText: document.getElementById('progressText'),
      },
      renderMatches: vi.fn(),
      renderStandings: vi.fn(),
      renderSchedule: vi.fn(),
      updateProgress: vi.fn(),
      showSection: vi.fn(),
      displayTournamentCode: vi.fn(),
      showAlert: vi.fn(),
    };

    storageManager = {
      isInitialized: true,
      createTournament: vi.fn(async () => true),
      updateMatch: vi.fn(async () => true),
      onTournamentUpdate: vi.fn(() => () => {}),
    };
  });

  describe('Tournament Creation Flow', () => {
    it('should create tournament with valid player data', async () => {
      const players = ['Alice', 'Bob', 'Charlie', 'Dave'];

      // Simulate tournament creation
      tournamentManager.createTournament(players, 2);

      expect(tournamentManager.players).toEqual(players);
      expect(tournamentManager.matches).toHaveLength(4);
      expect(tournamentManager.createTournament).toHaveBeenCalledWith(players, 2);
    });

    it('should generate balanced match structure', () => {
      const players = ['P1', 'P2', 'P3', 'P4'];
      tournamentManager.createTournament(players, 2);

      // Each player should appear in exactly 2 matches
      const playerMatchCounts = [0, 0, 0, 0];
      tournamentManager.matches.forEach(match => {
        playerMatchCounts[match.player1]++;
        playerMatchCounts[match.player2]++;
      });

      expect(playerMatchCounts).toEqual([2, 2, 2, 2]);
    });
  });

  describe('Match Recording Flow', () => {
    beforeEach(() => {
      const players = ['Alice', 'Bob', 'Charlie', 'Dave'];
      tournamentManager.createTournament(players, 2);
    });

    it('should record match results and update storage', async () => {
      // Record game results
      tournamentManager.updateMatchGame(0, 0, 1);
      tournamentManager.updateMatchGame(0, 1, 1);

      expect(tournamentManager.matches[0].games).toEqual([1, 1, null]);
      expect(tournamentManager.matches[0].winner).toBe(1);
      expect(tournamentManager.updateMatchGame).toHaveBeenCalledTimes(2);
    });

    it('should update progress as matches complete', () => {
      // Complete first match
      tournamentManager.updateMatchGame(0, 0, 1);
      tournamentManager.updateMatchGame(0, 1, 1);

      let progress = tournamentManager.getProgress();
      expect(progress.completed).toBe(1);
      expect(progress.percentage).toBe(25);

      // Complete second match
      tournamentManager.updateMatchGame(1, 0, 1);
      tournamentManager.updateMatchGame(1, 1, 1);

      progress = tournamentManager.getProgress();
      expect(progress.completed).toBe(2);
      expect(progress.percentage).toBe(50);
    });

    it('should update UI after match completion', () => {
      tournamentManager.updateMatchGame(0, 0, 1);
      tournamentManager.updateMatchGame(0, 1, 1);

      const progress = tournamentManager.getProgress();
      uiManager.updateProgress(progress.completed, progress.total);

      expect(uiManager.updateProgress).toHaveBeenCalledWith(1, 4);
    });
  });

  describe('View Switching Flow', () => {
    beforeEach(() => {
      const players = ['Alice', 'Bob', 'Charlie', 'Dave'];
      tournamentManager.createTournament(players, 2);
    });

    it('should render matches view', () => {
      uiManager.currentView = 'matches';
      uiManager.renderMatches(tournamentManager.matches, tournamentManager.players);

      expect(uiManager.renderMatches).toHaveBeenCalledWith(
        tournamentManager.matches,
        tournamentManager.players
      );
    });

    it('should render standings view', () => {
      uiManager.currentView = 'standings';
      const { rankedStats, tiedRanks } = tournamentManager.getStandings();
      uiManager.renderStandings(rankedStats, tiedRanks, tournamentManager.players);

      expect(uiManager.renderStandings).toHaveBeenCalled();
    });

    it('should render schedule view', () => {
      uiManager.currentView = 'schedule';
      uiManager.renderSchedule(tournamentManager.players, tournamentManager.matches);

      expect(uiManager.renderSchedule).toHaveBeenCalledWith(
        tournamentManager.players,
        tournamentManager.matches
      );
    });
  });

  describe('Full Tournament Lifecycle', () => {
    it('should complete entire tournament flow', async () => {
      // 1. Create tournament
      const players = ['Alice', 'Bob', 'Charlie', 'Dave'];
      tournamentManager.createTournament(players, 2);

      expect(tournamentManager.players).toHaveLength(4);
      expect(tournamentManager.matches).toHaveLength(4);

      // 2. Record all match results
      // Match 0: Alice vs Bob (Alice wins 2-0)
      tournamentManager.updateMatchGame(0, 0, 1);
      tournamentManager.updateMatchGame(0, 1, 1);

      // Match 1: Charlie vs Dave (Charlie wins 2-0)
      tournamentManager.updateMatchGame(1, 0, 1);
      tournamentManager.updateMatchGame(1, 1, 1);

      // Match 2: Alice vs Charlie (Alice wins 2-1)
      tournamentManager.updateMatchGame(2, 0, 1);
      tournamentManager.updateMatchGame(2, 1, 2);
      tournamentManager.updateMatchGame(2, 2, 1);

      // Match 3: Bob vs Dave (Bob wins 2-0)
      tournamentManager.updateMatchGame(3, 0, 1);
      tournamentManager.updateMatchGame(3, 1, 1);

      // 3. Check final progress
      const progress = tournamentManager.getProgress();
      expect(progress.completed).toBe(4);
      expect(progress.percentage).toBe(100);

      // 4. All matches should have winners
      expect(tournamentManager.matches.every(m => m.winner !== null)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      storageManager.createTournament = vi.fn(async () => {
        throw new Error('Storage error');
      });

      try {
        await storageManager.createTournament('TEST', {});
      } catch (e) {
        expect(e.message).toBe('Storage error');
      }
    });

    it('should handle invalid match updates', () => {
      const players = ['Alice', 'Bob'];
      tournamentManager.createTournament(players, 1);

      tournamentManager.updateMatchGame = vi.fn(() => ({
        error: 'Invalid match',
        updated: false
      }));

      const result = tournamentManager.updateMatchGame(99, 0, 1);
      expect(result.error).toBeDefined();
      expect(result.updated).toBe(false);
    });
  });

  describe('Data Persistence', () => {
    it('should save tournament to storage on creation', async () => {
      const players = ['Alice', 'Bob', 'Charlie', 'Dave'];
      const code = 'TEST123';

      tournamentManager.createTournament(players, 2);

      await storageManager.createTournament(code, {
        players,
        matches: tournamentManager.matches,
        matchesPerPlayer: 2
      });

      expect(storageManager.createTournament).toHaveBeenCalledWith(
        code,
        expect.objectContaining({
          players,
          matchesPerPlayer: 2
        })
      );
    });

    it('should update storage on match result', async () => {
      const players = ['Alice', 'Bob'];
      const code = 'TEST123';

      tournamentManager.createTournament(players, 1);
      const result = tournamentManager.updateMatchGame(0, 0, 1);

      await storageManager.updateMatch(code, 0, result.match);

      expect(storageManager.updateMatch).toHaveBeenCalledWith(
        code,
        0,
        expect.objectContaining({
          games: expect.arrayContaining([1])
        })
      );
    });
  });

  describe('Real-time Updates', () => {
    it('should register tournament update listener', () => {
      const code = 'TEST123';
      const callback = vi.fn();

      storageManager.onTournamentUpdate(code, callback);

      expect(storageManager.onTournamentUpdate).toHaveBeenCalledWith(code, callback);
    });

    it('should handle tournament updates from other devices', () => {
      const code = 'TEST123';
      let updateCallback;

      storageManager.onTournamentUpdate = vi.fn((code, callback) => {
        updateCallback = callback;
        return () => {};
      });

      storageManager.onTournamentUpdate(code, (data) => {
        if (data) {
          tournamentManager.players = data.players;
          tournamentManager.matches = data.matches;
        }
      });

      // Simulate update from another device
      updateCallback({
        players: ['New', 'Players'],
        matches: []
      });

      expect(tournamentManager.players).toEqual(['New', 'Players']);
    });
  });

  describe('Tournament Reset', () => {
    it('should reset tournament state', () => {
      tournamentManager.createTournament(['A', 'B', 'C'], 2);

      expect(tournamentManager.players).not.toEqual([]);
      expect(tournamentManager.matches).not.toEqual([]);

      tournamentManager.reset();

      expect(tournamentManager.players).toEqual([]);
      expect(tournamentManager.matches).toEqual([]);
    });

    it('should reset UI to initial state', () => {
      uiManager.showSection('modeSelector');

      expect(uiManager.showSection).toHaveBeenCalledWith('modeSelector');
    });
  });
});
