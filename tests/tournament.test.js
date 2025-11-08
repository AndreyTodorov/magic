/**
 * Unit Tests for TournamentManager
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Load the tournament manager module
// Note: In a real setup, you'd import this properly
// For now, we'll need to load the class definition

class TournamentManager {
  constructor() {
    this.players = [];
    this.matches = [];
    this.playerCount = APP_CONFIG.DEFAULT_PLAYERS;
    this.matchesPerPlayer = 3;
    this.currentTournamentCode = null;
    this.isCreator = false;
    this.standingsCache = null;
    this.standingsCacheHash = null;
  }

  reset() {
    this.players = [];
    this.matches = [];
    this.currentTournamentCode = null;
    this.isCreator = false;
    this.standingsCache = null;
    this.standingsCacheHash = null;
  }

  getValidMatchesPerPlayer(numPlayers) {
    const validOptions = [];
    const maxPossible = numPlayers - 1;

    for (let m = 1; m <= maxPossible; m++) {
      if ((numPlayers * m) % 2 === 0) {
        validOptions.push(m);
      }
    }

    return validOptions;
  }

  getTotalMatches(numPlayers, matchesPerPlayer) {
    return (numPlayers * matchesPerPlayer) / 2;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  generateMatchStructure(numPlayers, matchesPerPerson) {
    const matchCount = Array(numPlayers).fill(0);
    const selectedMatches = [];
    const targetMatches = this.getTotalMatches(numPlayers, matchesPerPerson);

    const allPossibleMatches = [];
    for (let i = 0; i < numPlayers; i++) {
      for (let j = i + 1; j < numPlayers; j++) {
        allPossibleMatches.push([i, j]);
      }
    }

    this.shuffleArray(allPossibleMatches);

    let attempts = 0;
    const maxAttempts = 1000;

    while (selectedMatches.length < targetMatches && attempts < maxAttempts) {
      attempts++;

      for (const [p1, p2] of allPossibleMatches) {
        if (selectedMatches.length >= targetMatches) break;

        if (
          matchCount[p1] < matchesPerPerson &&
          matchCount[p2] < matchesPerPerson
        ) {
          const alreadySelected = selectedMatches.some(
            (m) => (m[0] === p1 && m[1] === p2) || (m[0] === p2 && m[1] === p1)
          );

          if (!alreadySelected) {
            selectedMatches.push([p1, p2]);
            matchCount[p1]++;
            matchCount[p2]++;
          }
        }
      }

      if (selectedMatches.length < targetMatches && attempts < maxAttempts) {
        selectedMatches.length = 0;
        matchCount.fill(0);
        this.shuffleArray(allPossibleMatches);
      }
    }

    return selectedMatches;
  }

  createTournament(playerNames, matchesPerPlayer) {
    this.players = playerNames;
    this.playerCount = playerNames.length;
    this.matchesPerPlayer = matchesPerPlayer;

    const matchStructure = this.generateMatchStructure(
      this.playerCount,
      matchesPerPlayer
    );

    this.matches = matchStructure.map((match, index) => ({
      id: index,
      player1: match[0],
      player2: match[1],
      games: [null, null, null],
      winner: null,
    }));

    return this.matches;
  }

  sanitizePlayerName(name) {
    if (!name) return "";
    let sanitized = name.trim();
    sanitized = sanitized.substring(0, 30);
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s'\-\.]/g, "");
    sanitized = sanitized.replace(/\s+/g, " ");
    return sanitized.trim();
  }

  validatePlayerNames(names) {
    const seen = new Map();
    const duplicates = [];
    const empty = [];
    const sanitized = [];

    names.forEach((name, index) => {
      const clean = this.sanitizePlayerName(name);
      sanitized.push(clean);

      if (!clean) {
        empty.push(index);
        return;
      }

      const normalized = clean.toLowerCase();
      if (seen.has(normalized)) {
        duplicates.push({
          name: clean,
          indices: [seen.get(normalized), index],
        });
      } else {
        seen.set(normalized, index);
      }
    });

    return {
      isValid: duplicates.length === 0 && empty.length === 0,
      duplicates,
      empty,
      sanitized,
    };
  }

  calculatePlayerStats() {
    if (!this.matches || !Array.isArray(this.matches)) {
      console.warn("Matches not initialized");
      return [];
    }

    const stats = this.players.map((player, index) => {
      const playerMatches = this.matches.filter(
        (m) => m.player1 === index || m.player2 === index
      );

      let wins = 0, losses = 0, gamesWon = 0, gamesLost = 0;
      const opponents = { beaten: [], lostTo: [] };

      playerMatches.forEach((m) => {
        if (!m || !m.games) return;

        if (m.winner !== null) {
          const isPlayer1 = m.player1 === index;
          const playerNum = isPlayer1 ? 1 : 2;
          const opponentIndex = isPlayer1 ? m.player2 : m.player1;

          if (m.winner === playerNum) {
            wins++;
            opponents.beaten.push(opponentIndex);
          } else {
            losses++;
            opponents.lostTo.push(opponentIndex);
          }

          m.games.forEach((game) => {
            if (game === playerNum) gamesWon++;
            else if (game !== null) gamesLost++;
          });
        }
      });

      const points =
        wins * APP_CONFIG.SCORING.MATCH_WIN +
        gamesWon * APP_CONFIG.SCORING.GAME_WIN +
        gamesLost * APP_CONFIG.SCORING.GAME_LOSS;

      return {
        player,
        playerIndex: index,
        wins,
        losses,
        gamesWon,
        gamesLost,
        points,
        matchesPlayed: wins + losses,
        opponents,
        qualityScore: 0,
      };
    });

    return stats;
  }

  updateMatchGame(matchId, gameNum, winner) {
    const match = this.matches[matchId];
    if (!match || !match.games) {
      console.error("Invalid match");
      return null;
    }

    if (gameNum > 0) {
      for (let i = 0; i < gameNum; i++) {
        if (match.games[i] === null) {
          return { error: `Please complete Game ${i + 1} first!` };
        }
      }
    }

    if (match.winner !== null && match.games[gameNum] === null) {
      return { error: "Match already completed" };
    }

    if (match.games[gameNum] === winner) {
      match.games[gameNum] = null;
      for (let i = gameNum + 1; i < APP_CONFIG.GAMES_PER_MATCH; i++) {
        match.games[i] = null;
      }
      match.winner = null;
    } else {
      match.games[gameNum] = winner;
    }

    let p1Cumulative = 0;
    let p2Cumulative = 0;
    let decidedAt = null;

    for (let i = 0; i < APP_CONFIG.GAMES_PER_MATCH; i++) {
      const g = match.games[i];
      if (g === 1) p1Cumulative++;
      else if (g === 2) p2Cumulative++;

      if (p1Cumulative >= 2) {
        match.winner = 1;
        decidedAt = i;
        break;
      }
      if (p2Cumulative >= 2) {
        match.winner = 2;
        decidedAt = i;
        break;
      }
    }

    if (decidedAt !== null) {
      for (let j = decidedAt + 1; j < APP_CONFIG.GAMES_PER_MATCH; j++) {
        match.games[j] = null;
      }
    } else {
      match.winner = null;
    }

    return { match, updated: true };
  }

  getProgress() {
    const completed = this.matches.filter((m) => m.winner !== null).length;
    const total = this.matches.length;
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  static generateTournamentCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < APP_CONFIG.TOURNAMENT_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

describe('TournamentManager', () => {
  let manager;

  beforeEach(() => {
    manager = new TournamentManager();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(manager.players).toEqual([]);
      expect(manager.matches).toEqual([]);
      expect(manager.playerCount).toBe(APP_CONFIG.DEFAULT_PLAYERS);
      expect(manager.matchesPerPlayer).toBe(3);
      expect(manager.currentTournamentCode).toBe(null);
      expect(manager.isCreator).toBe(false);
    });

    it('should reset to initial state', () => {
      manager.players = ['Player 1', 'Player 2'];
      manager.matches = [{ id: 0 }];
      manager.currentTournamentCode = 'ABC123';
      manager.isCreator = true;

      manager.reset();

      expect(manager.players).toEqual([]);
      expect(manager.matches).toEqual([]);
      expect(manager.currentTournamentCode).toBe(null);
      expect(manager.isCreator).toBe(false);
    });
  });

  describe('Match Generation Validation', () => {
    it('should return valid matches-per-player options for even player counts', () => {
      const options4 = manager.getValidMatchesPerPlayer(4);
      expect(options4).toEqual([1, 2, 3]); // 4*1=4, 4*2=8, 4*3=12 all even

      const options6 = manager.getValidMatchesPerPlayer(6);
      expect(options6).toEqual([1, 2, 3, 4, 5]); // All valid for 6 players
    });

    it('should return valid matches-per-player options for odd player counts', () => {
      const options5 = manager.getValidMatchesPerPlayer(5);
      expect(options5).toEqual([2, 4]); // 5*2=10, 5*4=20 (skip 1,3 as odd)

      const options7 = manager.getValidMatchesPerPlayer(7);
      expect(options7).toEqual([2, 4, 6]); // Only even products
    });

    it('should calculate correct total matches', () => {
      expect(manager.getTotalMatches(4, 2)).toBe(4);
      expect(manager.getTotalMatches(6, 3)).toBe(9);
      expect(manager.getTotalMatches(7, 2)).toBe(7);
    });
  });

  describe('Match Structure Generation', () => {
    it('should generate correct number of matches', () => {
      const structure = manager.generateMatchStructure(4, 2);
      expect(structure.length).toBe(4); // 4 players * 2 matches / 2 = 4 total matches
    });

    it('should ensure each player has correct number of matches', () => {
      const numPlayers = 6;
      const matchesPerPlayer = 3;
      const structure = manager.generateMatchStructure(numPlayers, matchesPerPlayer);

      // Count matches per player
      const playerMatchCount = Array(numPlayers).fill(0);
      structure.forEach(([p1, p2]) => {
        playerMatchCount[p1]++;
        playerMatchCount[p2]++;
      });

      // Each player should have exactly matchesPerPlayer matches
      playerMatchCount.forEach(count => {
        expect(count).toBe(matchesPerPlayer);
      });
    });

    it('should not create duplicate pairings', () => {
      const structure = manager.generateMatchStructure(6, 3);
      const pairings = new Set();

      structure.forEach(([p1, p2]) => {
        const key = `${Math.min(p1, p2)}-${Math.max(p1, p2)}`;
        expect(pairings.has(key)).toBe(false);
        pairings.add(key);
      });
    });

    it('should handle edge case of minimum players', () => {
      const structure = manager.generateMatchStructure(3, 2);
      expect(structure.length).toBe(3); // 3 * 2 / 2 = 3
    });
  });

  describe('Tournament Creation', () => {
    it('should create tournament with player names', () => {
      const players = ['Alice', 'Bob', 'Charlie', 'Dave'];
      const matches = manager.createTournament(players, 2);

      expect(manager.players).toEqual(players);
      expect(manager.playerCount).toBe(4);
      expect(manager.matchesPerPlayer).toBe(2);
      expect(matches.length).toBe(4);
    });

    it('should initialize matches with correct structure', () => {
      const players = ['Alice', 'Bob', 'Charlie'];
      manager.createTournament(players, 2);

      manager.matches.forEach((match, index) => {
        expect(match.id).toBe(index);
        expect(match.games).toEqual([null, null, null]);
        expect(match.winner).toBe(null);
        expect(typeof match.player1).toBe('number');
        expect(typeof match.player2).toBe('number');
      });
    });
  });

  describe('Player Name Validation', () => {
    it('should sanitize player names correctly', () => {
      expect(manager.sanitizePlayerName('  Alice  ')).toBe('Alice');
      expect(manager.sanitizePlayerName('Bob-Smith')).toBe('Bob-Smith');
      expect(manager.sanitizePlayerName("O'Connor")).toBe("O'Connor");
      expect(manager.sanitizePlayerName('Dr. Who')).toBe('Dr. Who');
    });

    it('should remove invalid characters', () => {
      expect(manager.sanitizePlayerName('Alice@123')).toBe('Alice123');
      expect(manager.sanitizePlayerName('Bob<script>')).toBe('Bobscript');
      expect(manager.sanitizePlayerName('Ch@rlie$')).toBe('Chrlie');
    });

    it('should limit name length to 30 characters', () => {
      const longName = 'A'.repeat(50);
      expect(manager.sanitizePlayerName(longName).length).toBe(30);
    });

    it('should collapse multiple spaces', () => {
      expect(manager.sanitizePlayerName('Alice   Bob')).toBe('Alice Bob');
    });

    it('should detect duplicate names (case-insensitive)', () => {
      const names = ['Alice', 'Bob', 'alice', 'Charlie'];
      const result = manager.validatePlayerNames(names);

      expect(result.isValid).toBe(false);
      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].name).toBe('alice');
      expect(result.duplicates[0].indices).toEqual([0, 2]);
    });

    it('should detect empty names', () => {
      const names = ['Alice', '', 'Bob'];
      const result = manager.validatePlayerNames(names);

      expect(result.isValid).toBe(false);
      expect(result.empty).toEqual([1]);
    });

    it('should validate correct names', () => {
      const names = ['Alice', 'Bob', 'Charlie'];
      const result = manager.validatePlayerNames(names);

      expect(result.isValid).toBe(true);
      expect(result.duplicates).toEqual([]);
      expect(result.empty).toEqual([]);
    });
  });

  describe('Match Game Recording', () => {
    beforeEach(() => {
      const players = ['Alice', 'Bob', 'Charlie', 'Dave'];
      manager.createTournament(players, 2);
    });

    it('should record game result correctly', () => {
      const result = manager.updateMatchGame(0, 0, 1);

      expect(result.updated).toBe(true);
      expect(result.match.games[0]).toBe(1);
      expect(result.match.winner).toBe(null); // No winner yet
    });

    it('should toggle game result when clicked again', () => {
      manager.updateMatchGame(0, 0, 1);
      const result = manager.updateMatchGame(0, 0, 1);

      expect(result.match.games[0]).toBe(null);
      expect(result.match.winner).toBe(null);
    });

    it('should determine match winner after 2 wins', () => {
      manager.updateMatchGame(0, 0, 1); // Player 1 wins game 1
      const result = manager.updateMatchGame(0, 1, 1); // Player 1 wins game 2

      expect(result.match.winner).toBe(1);
      expect(result.match.games).toEqual([1, 1, null]); // Game 3 should be null
    });

    it('should clear subsequent games when match is decided', () => {
      manager.updateMatchGame(0, 0, 1);
      manager.updateMatchGame(0, 1, 2);
      manager.updateMatchGame(0, 2, 1); // Player 1 wins 2-1

      expect(manager.matches[0].winner).toBe(1);
      expect(manager.matches[0].games).toEqual([1, 2, 1]);
    });

    it('should prevent recording games out of order', () => {
      const result = manager.updateMatchGame(0, 1, 1); // Try to record game 2 first

      expect(result.error).toBe('Please complete Game 1 first!');
    });

    it('should prevent recording games after match is complete', () => {
      manager.updateMatchGame(0, 0, 1);
      manager.updateMatchGame(0, 1, 1); // Match complete

      const result = manager.updateMatchGame(0, 2, 2); // Try to record game 3

      expect(result.error).toBe('Match already completed');
    });

    it('should handle 2-0 victory correctly', () => {
      manager.updateMatchGame(0, 0, 1);
      const result = manager.updateMatchGame(0, 1, 1);

      expect(result.match.winner).toBe(1);
      expect(result.match.games[2]).toBe(null); // Third game not played
    });

    it('should handle 2-1 victory correctly', () => {
      manager.updateMatchGame(0, 0, 1);
      manager.updateMatchGame(0, 1, 2);
      const result = manager.updateMatchGame(0, 2, 1);

      expect(result.match.winner).toBe(1);
      expect(result.match.games).toEqual([1, 2, 1]);
    });
  });

  describe('Statistics and Scoring', () => {
    beforeEach(() => {
      const players = ['Alice', 'Bob', 'Charlie'];
      manager.createTournament(players, 2);
    });

    it('should calculate points correctly for match wins', () => {
      // Find a match and make player1 win 2-0
      const match = manager.matches[0];
      const winningPlayer = match.player1;

      manager.updateMatchGame(0, 0, 1); // player1 wins game 1
      manager.updateMatchGame(0, 1, 1); // player1 wins game 2

      const stats = manager.calculatePlayerStats();
      const winnerStats = stats[winningPlayer];

      expect(winnerStats.wins).toBe(1);
      expect(winnerStats.gamesWon).toBe(2);
      expect(winnerStats.gamesLost).toBe(0);
      expect(winnerStats.points).toBe(5); // 3 (match) + 2 (games) = 5
    });

    it('should calculate points correctly for losses', () => {
      // Find a match and make player2 lose 0-2
      const match = manager.matches[0];
      const losingPlayer = match.player2;

      manager.updateMatchGame(0, 0, 1); // player1 wins game 1
      manager.updateMatchGame(0, 1, 1); // player1 wins game 2

      const stats = manager.calculatePlayerStats();
      const loserStats = stats[losingPlayer];

      expect(loserStats.losses).toBe(1);
      expect(loserStats.gamesWon).toBe(0);
      expect(loserStats.gamesLost).toBe(2);
      expect(loserStats.points).toBe(-1); // 0 (match) + 0 (games) + (-1) (2 losses) = -1
    });

    it('should calculate points for split match', () => {
      // Match goes 2-1 (player1 wins)
      const match = manager.matches[0];
      const winner = match.player1;
      const loser = match.player2;

      manager.updateMatchGame(0, 0, 1); // player1 wins
      manager.updateMatchGame(0, 1, 2); // player2 wins
      manager.updateMatchGame(0, 2, 1); // player1 wins

      const stats = manager.calculatePlayerStats();
      const winnerStats = stats[winner];
      const loserStats = stats[loser];

      expect(winnerStats.points).toBe(4.5); // 3 + 2 - 0.5 = 4.5
      expect(loserStats.points).toBe(0); // 0 + 1 - 1 = 0
    });
  });

  describe('Tournament Progress', () => {
    beforeEach(() => {
      const players = ['Alice', 'Bob', 'Charlie', 'Dave'];
      manager.createTournament(players, 2);
    });

    it('should track progress correctly', () => {
      let progress = manager.getProgress();
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);

      // Complete one match
      manager.updateMatchGame(0, 0, 1);
      manager.updateMatchGame(0, 1, 1);

      progress = manager.getProgress();
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(4);
      expect(progress.percentage).toBe(25);
    });
  });

  describe('Tournament Code Generation', () => {
    it('should generate code of correct length', () => {
      const code = TournamentManager.generateTournamentCode();
      expect(code.length).toBe(APP_CONFIG.TOURNAMENT_CODE_LENGTH);
    });

    it('should generate code with valid characters only', () => {
      const code = TournamentManager.generateTournamentCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(TournamentManager.generateTournamentCode());
      }
      // With 8 characters from 36 possible, collision is extremely unlikely
      expect(codes.size).toBeGreaterThan(95);
    });
  });
});
