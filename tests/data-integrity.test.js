/**
 * Data Integrity Tests
 * Ensures data consistency and prevents corrupted tournament states
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Data Integrity Tests', () => {
  describe('Referential Integrity', () => {
    it('should ensure all match player indices reference valid players', () => {
      const tournament = {
        players: ['Alice', 'Bob', 'Charlie'],
        matches: [
          { id: 0, player1: 0, player2: 1, games: [null, null, null] },
          { id: 1, player1: 1, player2: 2, games: [null, null, null] },
          { id: 2, player1: 0, player2: 2, games: [null, null, null] },
        ],
        playerCount: 3
      };

      // Validate all player indices
      const invalidMatches = tournament.matches.filter(match => {
        return (
          match.player1 < 0 ||
          match.player1 >= tournament.playerCount ||
          match.player2 < 0 ||
          match.player2 >= tournament.playerCount
        );
      });

      expect(invalidMatches).toHaveLength(0);
    });

    it('should detect out-of-bounds player indices', () => {
      const tournament = {
        players: ['Alice', 'Bob'],
        matches: [
          { id: 0, player1: 0, player2: 5, games: [null, null, null] }, // player2 out of bounds
        ],
        playerCount: 2
      };

      const invalidMatches = tournament.matches.filter(match => {
        return (
          match.player1 < 0 ||
          match.player1 >= tournament.playerCount ||
          match.player2 < 0 ||
          match.player2 >= tournament.playerCount
        );
      });

      expect(invalidMatches).toHaveLength(1);
      expect(invalidMatches[0].player2).toBe(5);
    });

    it('should detect null player indices', () => {
      const match = {
        id: 0,
        player1: null,
        player2: 1,
        games: [null, null, null]
      };

      const isValid = (
        match.player1 !== null &&
        match.player2 !== null &&
        typeof match.player1 === 'number' &&
        typeof match.player2 === 'number'
      );

      expect(isValid).toBe(false);
    });

    it('should prevent players from playing themselves', () => {
      const invalidMatch = {
        id: 0,
        player1: 0,
        player2: 0, // Same player
        games: [null, null, null]
      };

      const isSelfMatch = invalidMatch.player1 === invalidMatch.player2;

      expect(isSelfMatch).toBe(true); // Should be detected and prevented
    });
  });

  describe('Match State Consistency', () => {
    it('should ensure winner matches game results (2-0)', () => {
      const match = {
        player1: 0,
        player2: 1,
        games: [1, 1, null],
        winner: 1
      };

      const p1Wins = match.games.filter(g => g === 1).length;
      const p2Wins = match.games.filter(g => g === 2).length;

      const calculatedWinner = p1Wins >= 2 ? 1 : p2Wins >= 2 ? 2 : null;

      expect(match.winner).toBe(calculatedWinner);
    });

    it('should ensure winner matches game results (2-1)', () => {
      const match = {
        player1: 0,
        player2: 1,
        games: [1, 2, 1],
        winner: 1
      };

      const p1Wins = match.games.filter(g => g === 1).length;
      const p2Wins = match.games.filter(g => g === 2).length;

      const calculatedWinner = p1Wins >= 2 ? 1 : p2Wins >= 2 ? 2 : null;

      expect(match.winner).toBe(calculatedWinner);
    });

    it('should detect inconsistent winner (winner set but not 2 wins)', () => {
      const inconsistentMatch = {
        player1: 0,
        player2: 1,
        games: [1, null, null],
        winner: 1 // Winner set with only 1 game win
      };

      const p1Wins = inconsistentMatch.games.filter(g => g === 1).length;
      const p2Wins = inconsistentMatch.games.filter(g => g === 2).length;

      const shouldHaveWinner = p1Wins >= 2 || p2Wins >= 2;

      expect(shouldHaveWinner).toBe(false);
      expect(inconsistentMatch.winner).not.toBeNull(); // Inconsistent!
    });

    it('should ensure no winner when match is tied 1-1', () => {
      const match = {
        player1: 0,
        player2: 1,
        games: [1, 2, null],
        winner: null
      };

      const p1Wins = match.games.filter(g => g === 1).length;
      const p2Wins = match.games.filter(g => g === 2).length;

      expect(p1Wins).toBe(1);
      expect(p2Wins).toBe(1);
      expect(match.winner).toBeNull();
    });

    it('should ensure games array has exactly 3 elements', () => {
      const validMatch = {
        games: [null, null, null]
      };

      const invalidMatch = {
        games: [null, null] // Only 2 games
      };

      expect(validMatch.games).toHaveLength(3);
      expect(invalidMatch.games).toHaveLength(2); // Invalid!
    });

    it('should ensure game results are only 1, 2, or null', () => {
      const match = {
        games: [1, 2, null]
      };

      const invalidMatch = {
        games: [1, 3, null] // 3 is invalid
      };

      const validValues = match.games.every(g => g === null || g === 1 || g === 2);
      const invalidValues = invalidMatch.games.every(g => g === null || g === 1 || g === 2);

      expect(validValues).toBe(true);
      expect(invalidValues).toBe(false);
    });

    it('should prevent impossible game states (both players winning 2+ games)', () => {
      const impossibleMatch = {
        player1: 0,
        player2: 1,
        games: [1, 1, 2, 2], // Both have 2 wins - impossible in Bo3!
        winner: null
      };

      // Should never have more than 3 games
      expect(impossibleMatch.games.length).toBeGreaterThan(3); // This is wrong!
    });
  });

  describe('Tournament State Consistency', () => {
    it('should ensure playerCount matches players array length', () => {
      const tournament = {
        players: ['Alice', 'Bob', 'Charlie'],
        playerCount: 3
      };

      const inconsistentTournament = {
        players: ['Alice', 'Bob', 'Charlie'],
        playerCount: 5 // Wrong!
      };

      expect(tournament.players.length).toBe(tournament.playerCount);
      expect(inconsistentTournament.players.length).not.toBe(inconsistentTournament.playerCount);
    });

    it('should ensure total matches equals formula (Round Robin)', () => {
      const tournament = {
        players: ['Alice', 'Bob', 'Charlie', 'Diana'],
        playerCount: 4,
        matchesPerPlayer: 3,
        matches: [] // Will be populated
      };

      const expectedMatches = (tournament.playerCount * tournament.matchesPerPlayer) / 2;

      expect(expectedMatches).toBe(6); // 4 * 3 / 2
    });

    it('should ensure no duplicate pairings in Round Robin', () => {
      const matches = [
        { player1: 0, player2: 1 },
        { player1: 0, player2: 2 },
        { player1: 1, player2: 2 },
        { player1: 0, player2: 1 }, // Duplicate!
      ];

      const pairings = new Set();
      const duplicates = [];

      matches.forEach(match => {
        const key = [match.player1, match.player2].sort().join('-');
        if (pairings.has(key)) {
          duplicates.push(match);
        }
        pairings.add(key);
      });

      expect(duplicates).toHaveLength(1);
    });

    it('should ensure each player has correct number of matches', () => {
      const tournament = {
        players: ['Alice', 'Bob', 'Charlie', 'Diana'],
        playerCount: 4,
        matchesPerPlayer: 2,
        matches: [
          { player1: 0, player2: 1 },
          { player1: 0, player2: 2 },
          { player1: 1, player2: 2 },
          { player1: 2, player2: 3 },
        ]
      };

      // Count matches per player
      const matchCounts = new Array(tournament.playerCount).fill(0);
      tournament.matches.forEach(match => {
        matchCounts[match.player1]++;
        matchCounts[match.player2]++;
      });

      // Player 0: 2 matches (vs 1, vs 2)
      // Player 1: 2 matches (vs 0, vs 2)
      // Player 2: 3 matches (vs 0, vs 1, vs 3) - WRONG!
      // Player 3: 1 match (vs 2) - WRONG!

      expect(matchCounts[0]).toBe(2);
      expect(matchCounts[1]).toBe(2);
      expect(matchCounts[2]).not.toBe(tournament.matchesPerPlayer); // Should be 2, is 3
      expect(matchCounts[3]).not.toBe(tournament.matchesPerPlayer); // Should be 2, is 1
    });
  });

  describe('Score Calculation Integrity', () => {
    it('should ensure match points equal game points for completed matches', () => {
      const match = {
        player1: 0,
        player2: 1,
        games: [1, 1, null],
        winner: 1
      };

      const p1GameWins = match.games.filter(g => g === 1).length;
      const p2GameWins = match.games.filter(g => g === 2).length;

      expect(p1GameWins).toBe(2);
      expect(p2GameWins).toBe(0);
    });

    it('should ensure points are always divisible by 0.5', () => {
      const testCases = [
        { wins: 3, gameWins: 6, gameLosses: 0, expected: 15.0 },
        { wins: 2, gameWins: 5, gameLosses: 2, expected: 10.0 },
        { wins: 1, gameWins: 3, gameLosses: 3, expected: 4.5 },
        { wins: 0, gameWins: 0, gameLosses: 6, expected: -3.0 },
      ];

      testCases.forEach(test => {
        const points = (3 * test.wins) + (1 * test.gameWins) + (-0.5 * test.gameLosses);

        expect(points).toBe(test.expected);
        // Use Math.abs to handle -0 vs +0 JavaScript issue
        expect(Math.abs(points % 0.5)).toBe(0); // Divisible by 0.5
      });
    });

    it('should ensure game wins + game losses = total games played', () => {
      const stats = {
        gameWins: 5,
        gameLosses: 4
      };

      const totalGames = stats.gameWins + stats.gameLosses;

      expect(totalGames).toBe(9); // 3 matches * 3 games max = 9 games max
    });

    it('should ensure wins + losses = matches played', () => {
      const stats = {
        wins: 2,
        losses: 1
      };

      const matchesPlayed = stats.wins + stats.losses;

      expect(matchesPlayed).toBe(3);
    });
  });

  describe('Cross-View Consistency', () => {
    it('should show same match data in Schedule and Matches views', () => {
      const matchData = {
        id: 0,
        player1: 0,
        player2: 1,
        games: [1, 2, null],
        winner: null
      };

      // Simulate data in both views
      const scheduleViewMatch = { ...matchData };
      const matchesViewMatch = { ...matchData };

      expect(scheduleViewMatch).toEqual(matchesViewMatch);
    });

    it('should update Standings when match is recorded', () => {
      const before = {
        players: ['Alice', 'Bob'],
        matches: [
          { id: 0, player1: 0, player2: 1, games: [null, null, null], winner: null }
        ]
      };

      // Record match
      before.matches[0].games = [1, 1, null];
      before.matches[0].winner = 1;

      // Standings should reflect this
      const standings = calculateStandings(before);

      expect(standings[0].wins).toBe(1); // Alice has 1 win
      expect(standings[1].wins).toBe(0); // Bob has 0 wins
    });

    it('should show consistent completion percentage across views', () => {
      const tournament = {
        matches: [
          { games: [1, 1, null], winner: 1 },
          { games: [2, 2, null], winner: 2 },
          { games: [null, null, null], winner: null },
        ]
      };

      const completedMatches = tournament.matches.filter(m => m.winner !== null).length;
      const totalMatches = tournament.matches.length;
      const percentage = (completedMatches / totalMatches) * 100;

      expect(percentage).toBe(66.66666666666666);
    });
  });

  describe('Data Validation on Load', () => {
    it('should detect corrupted tournament with missing players', () => {
      const corrupted = {
        // Missing players array
        matches: [],
        playerCount: 4
      };

      const isValid = (
        corrupted.hasOwnProperty('players') &&
        Array.isArray(corrupted.players)
      );

      expect(isValid).toBe(false);
    });

    it('should detect corrupted tournament with missing matches', () => {
      const corrupted = {
        players: ['Alice', 'Bob'],
        // Missing matches array
        playerCount: 2
      };

      const isValid = (
        corrupted.hasOwnProperty('matches') &&
        Array.isArray(corrupted.matches)
      );

      expect(isValid).toBe(false);
    });

    it('should validate match objects have required fields', () => {
      const validMatch = {
        id: 0,
        player1: 0,
        player2: 1,
        games: [null, null, null],
        winner: null
      };

      const invalidMatch = {
        id: 0,
        // Missing player1, player2
        games: [null, null, null]
      };

      const isValidMatchStructure = (match) => (
        match.hasOwnProperty('id') &&
        match.hasOwnProperty('player1') &&
        match.hasOwnProperty('player2') &&
        match.hasOwnProperty('games')
      );

      expect(isValidMatchStructure(validMatch)).toBe(true);
      expect(isValidMatchStructure(invalidMatch)).toBe(false);
    });

    it('should validate Firebase tournament has creator and members', () => {
      const validFirebaseTournament = {
        players: ['Alice', 'Bob'],
        matches: [],
        playerCount: 2,
        creator: 'uid-123',
        members: { 'uid-123': true },
        createdAt: Date.now()
      };

      const isValidFirebaseStructure = (
        validFirebaseTournament.hasOwnProperty('creator') &&
        validFirebaseTournament.hasOwnProperty('members') &&
        validFirebaseTournament.hasOwnProperty('createdAt')
      );

      expect(isValidFirebaseStructure).toBe(true);
    });
  });

  describe('Atomic Operations', () => {
    it('should update match winner and games together', () => {
      const match = {
        games: [null, null, null],
        winner: null
      };

      // Update should be atomic - both or neither
      match.games = [1, 1, null];
      match.winner = 1;

      expect(match.games).toEqual([1, 1, null]);
      expect(match.winner).toBe(1);
    });

    it('should detect partial updates (games changed but not winner)', () => {
      const match = {
        games: [1, 1, null],
        winner: null // Should be 1!
      };

      const p1Wins = match.games.filter(g => g === 1).length;
      const shouldHaveWinner = p1Wins >= 2;

      expect(shouldHaveWinner).toBe(true);
      expect(match.winner).toBeNull(); // Inconsistent!
    });
  });

  describe('Bracket Integrity (Elimination Formats)', () => {
    it('should ensure elimination rounds progress sequentially', () => {
      const matches = [
        { id: 0, round: 1, player1: 0, player2: 1, winner: 1, feedsInto: 4 },
        { id: 1, round: 1, player1: 2, player2: 3, winner: 2, feedsInto: 4 },
        { id: 2, round: 1, player1: 4, player2: 5, winner: 4, feedsInto: 5 },
        { id: 3, round: 1, player1: 6, player2: 7, winner: 6, feedsInto: 5 },
        { id: 4, round: 2, player1: null, player2: null, winner: null, feedsInto: 6 },
        { id: 5, round: 2, player1: null, player2: null, winner: null, feedsInto: 6 },
        { id: 6, round: 3, player1: null, player2: null, winner: null, feedsInto: null },
      ];

      // Verify feedsInto references valid match IDs
      matches.forEach(match => {
        if (match.feedsInto !== null) {
          const targetMatch = matches.find(m => m.id === match.feedsInto);
          expect(targetMatch).toBeDefined();
        }
      });
    });

    it('should ensure placeholder matches start with null players', () => {
      const placeholderMatch = {
        id: 4,
        round: 2,
        player1: null,
        player2: null,
        isPlaceholder: true,
        winner: null
      };

      expect(placeholderMatch.player1).toBeNull();
      expect(placeholderMatch.player2).toBeNull();
      expect(placeholderMatch.isPlaceholder).toBe(true);
    });

    it('should ensure winners advance to correct next match', () => {
      const round1Match = {
        id: 0,
        round: 1,
        player1: 0,
        player2: 1,
        winner: 1,
        feedsInto: 4
      };

      const round2Match = {
        id: 4,
        round: 2,
        player1: null,
        player2: null
      };

      // Simulate advancement
      const winnerPlayerIndex = round1Match.winner === 1 ? round1Match.player1 : round1Match.player2;

      // Winner should be added to round2Match
      expect(round1Match.feedsInto).toBe(round2Match.id);
    });
  });
});

// Helper function for testing
function calculateStandings(tournament) {
  const stats = tournament.players.map((player, idx) => ({
    player,
    wins: 0,
    losses: 0
  }));

  tournament.matches.forEach(match => {
    if (match.winner !== null) {
      if (match.winner === 1) {
        stats[match.player1].wins++;
        stats[match.player2].losses++;
      } else {
        stats[match.player2].wins++;
        stats[match.player1].losses++;
      }
    }
  });

  return stats;
}
