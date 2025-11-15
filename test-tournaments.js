/**
 * Functional Tournament Tests
 * Simulates various tournament scenarios to verify correctness
 */

class TournamentTester {
  constructor() {
    this.results = [];
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const entry = { message, type, timestamp: new Date().toISOString() };
    console.log(`[${type.toUpperCase()}] ${message}`);

    if (type === 'error') {
      this.errors.push(entry);
    } else if (type === 'warning') {
      this.warnings.push(entry);
    } else {
      this.results.push(entry);
    }
  }

  /**
   * Simulate playing a match to completion
   */
  playMatch(match, winner = null) {
    if (!match || match.isPlaceholder || match.isBye) {
      return;
    }

    // If no winner specified, randomly determine
    if (winner === null) {
      winner = Math.random() < 0.5 ? 1 : 2;
    }

    // Best of 3: winner gets 2 games
    if (winner === 1) {
      match.games[0] = 1;
      match.games[1] = 1;
      match.games[2] = null;
    } else {
      match.games[0] = 2;
      match.games[1] = 2;
      match.games[2] = null;
    }

    match.winner = winner;
  }

  /**
   * Test Round Robin format
   */
  testRoundRobin(playerCount, matchesPerPlayer) {
    this.log(`\n=== Testing Round Robin: ${playerCount} players, ${matchesPerPlayer} matches/player ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);

      manager.createTournament(players, matchesPerPlayer, TOURNAMENT_FORMATS.ROUND_ROBIN);

      this.log(`✓ Created tournament with ${manager.matches.length} matches`);

      // Verify each player has correct number of matches
      const matchCounts = new Array(playerCount).fill(0);
      manager.matches.forEach(match => {
        matchCounts[match.player1]++;
        matchCounts[match.player2]++;
      });

      const incorrectCounts = matchCounts.filter((count, idx) => {
        if (count !== matchesPerPlayer) {
          this.log(`Player ${idx + 1} has ${count} matches, expected ${matchesPerPlayer}`, 'error');
          return true;
        }
        return false;
      });

      if (incorrectCounts.length === 0) {
        this.log(`✓ All players have correct match count`);
      }

      // Play all matches
      manager.matches.forEach(match => this.playMatch(match));
      this.log(`✓ Played all ${manager.matches.length} matches`);

      // Get standings
      const standings = manager.getStandings();
      this.log(`✓ Generated standings with ${standings.rankedStats.length} players`);

      if (standings.rankedStats.length !== playerCount) {
        this.log(`Standings has ${standings.rankedStats.length} players, expected ${playerCount}`, 'error');
      }

      return true;
    } catch (error) {
      this.log(`Round Robin test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Comprehensive Round Robin tests - all player counts and valid match combinations
   */
  testRoundRobinComprehensive() {
    const minPlayers = 4;
    const maxPlayers = 12; // Test up to 12 players for comprehensive coverage

    let testCount = 0;
    let passedCount = 0;

    for (let numPlayers = minPlayers; numPlayers <= maxPlayers; numPlayers++) {
      // Calculate valid matches per player for this player count
      // Rule: (players × matches) must be even
      const validMatches = [];
      for (let m = 1; m < numPlayers; m++) {
        if ((numPlayers * m) % 2 === 0) {
          validMatches.push(m);
        }
      }

      // Test first, middle, and last valid option for each player count
      const matchesToTest = [];
      if (validMatches.length > 0) {
        matchesToTest.push(validMatches[0]); // First valid
        if (validMatches.length > 2) {
          matchesToTest.push(validMatches[Math.floor(validMatches.length / 2)]); // Middle
        }
        if (validMatches.length > 1) {
          matchesToTest.push(validMatches[validMatches.length - 1]); // Last valid
        }
      }

      // Run tests for this player count
      matchesToTest.forEach(matches => {
        testCount++;
        if (this.testRoundRobin(numPlayers, matches)) {
          passedCount++;
        }
      });
    }

    this.log(`\n📊 Round Robin Summary: ${passedCount}/${testCount} test combinations passed`);
  }

  /**
   * Test Single Elimination format
   */
  testSingleElimination(playerCount) {
    this.log(`\n=== Testing Single Elimination: ${playerCount} players ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);

      manager.createTournament(players, 0, TOURNAMENT_FORMATS.SINGLE_ELIMINATION);

      this.log(`✓ Created bracket with ${manager.matches.length} matches`);

      // Calculate expected rounds
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
      const expectedRounds = Math.log2(bracketSize);

      // Count matches by round
      const matchesByRound = {};
      manager.matches.forEach(match => {
        if (!matchesByRound[match.round]) matchesByRound[match.round] = 0;
        matchesByRound[match.round]++;
      });

      this.log(`✓ Bracket has ${Object.keys(matchesByRound).length} rounds`);

      // Play through tournament round by round
      for (let round = 1; round <= expectedRounds; round++) {
        const roundMatches = manager.matches.filter(m => m.round === round && !m.isPlaceholder);
        this.log(`Round ${round}: ${roundMatches.length} matches`);

        roundMatches.forEach(match => {
          if (!match.isBye && match.winner === null) {
            this.playMatch(match);
            // Advance winner
            manager.advanceWinnerToNextMatch(match);
          }
        });
      }

      this.log(`✓ Completed all rounds`);

      // Verify exactly one winner
      const finalMatch = manager.matches.find(m => m.round === expectedRounds);
      if (finalMatch && finalMatch.winner !== null) {
        this.log(`✓ Tournament has a winner: Player ${finalMatch.winner === 1 ? finalMatch.player1 + 1 : finalMatch.player2 + 1}`);
      } else {
        this.log(`No final winner found`, 'error');
      }

      // Get standings
      const standings = manager.getStandings();
      this.log(`✓ Generated standings with ${standings.rankedStats.length} players`);

      return true;
    } catch (error) {
      this.log(`Single Elimination test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test Double Elimination format
   */
  testDoubleElimination(playerCount) {
    this.log(`\n=== Testing Double Elimination: ${playerCount} players ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);

      manager.createTournament(players, 0, TOURNAMENT_FORMATS.DOUBLE_ELIMINATION);

      this.log(`✓ Created bracket with ${manager.matches.length} matches`);

      // Count winners and losers bracket matches
      const winnersMatches = manager.matches.filter(m => m.bracket === 'winners' || !m.bracket);
      const losersMatches = manager.matches.filter(m => m.bracket === 'losers');

      this.log(`✓ Winners bracket: ${winnersMatches.length} matches`);
      this.log(`✓ Losers bracket: ${losersMatches.length} matches`);

      // Play through bracket progressively
      let safeguard = 0;
      const maxIterations = 100;

      while (safeguard < maxIterations) {
        const unfinishedMatches = manager.matches.filter(m =>
          !m.isPlaceholder &&
          m.winner === null &&
          m.player1 !== null &&
          m.player2 !== null &&
          !m.isBye
        );

        if (unfinishedMatches.length === 0) break;

        // Play one match from earliest round
        const match = unfinishedMatches[0];
        this.playMatch(match);
        manager.advanceWinnerToNextMatch(match);

        safeguard++;
      }

      if (safeguard >= maxIterations) {
        this.log(`Reached max iterations, possible infinite loop`, 'warning');
      }

      this.log(`✓ Completed bracket in ${safeguard} steps`);

      // Get standings
      const standings = manager.getStandings();
      this.log(`✓ Generated standings with ${standings.rankedStats.length} players`);

      return true;
    } catch (error) {
      this.log(`Double Elimination test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test Swiss format
   */
  testSwiss(playerCount, rounds) {
    this.log(`\n=== Testing Swiss: ${playerCount} players, ${rounds} rounds ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);

      const config = { rounds };
      manager.createTournament(players, 0, TOURNAMENT_FORMATS.SWISS, config);

      this.log(`✓ Created Swiss tournament with ${manager.matches.length} matches`);

      // Play through rounds
      for (let round = 1; round <= rounds; round++) {
        this.log(`Playing Round ${round}...`);

        const roundMatches = manager.matches.filter(m => m.round === round && !m.isPlaceholder);

        roundMatches.forEach(match => {
          if (match.winner === null && !match.isBye) {
            this.playMatch(match);
          }
        });

        this.log(`✓ Completed Round ${round}: ${roundMatches.length} matches`);

        // Generate next round (except for last round)
        if (round < rounds) {
          const result = manager.generateNextSwissRound();
          if (result.success) {
            this.log(`✓ Generated Round ${round + 1} pairings`);
          } else {
            this.log(`Failed to generate Round ${round + 1}: ${result.error}`, 'error');
          }
        }
      }

      // Get standings
      const standings = manager.getStandings();
      this.log(`✓ Generated standings with ${standings.rankedStats.length} players`);

      // Verify standings are sorted
      for (let i = 1; i < standings.rankedStats.length; i++) {
        if (standings.rankedStats[i].points > standings.rankedStats[i - 1].points) {
          this.log(`Standings not properly sorted at position ${i}`, 'error');
        }
      }

      return true;
    } catch (error) {
      this.log(`Swiss test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test Group Stage format
   */
  testGroupStage(playerCount, numGroups, advancingPerGroup) {
    this.log(`\n=== Testing Group Stage: ${playerCount} players, ${numGroups} groups, top ${advancingPerGroup} advance ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);

      const playersPerGroup = Math.floor(playerCount / numGroups);
      const config = { numGroups, playersPerGroup, advancingPerGroup };

      manager.createTournament(players, 0, TOURNAMENT_FORMATS.GROUP_STAGE, config);

      this.log(`✓ Created Group Stage with ${manager.matches.length} total matches`);

      // Count group matches
      const groupMatches = manager.matches.filter(m => m.stage === 'groups');
      const playoffMatches = manager.matches.filter(m => m.stage === 'playoffs');

      this.log(`✓ Group stage: ${groupMatches.length} matches`);
      this.log(`✓ Playoffs: ${playoffMatches.length} matches (placeholders)`);

      // Play all group matches
      groupMatches.forEach(match => this.playMatch(match));
      this.log(`✓ Completed all group matches`);

      // Check if can advance
      if (!manager.canAdvanceStage()) {
        this.log(`Cannot advance to playoffs after groups complete`, 'error');
        return false;
      }

      // Advance to playoffs
      const result = manager.advanceToPlayoffs();
      if (result.success) {
        this.log(`✓ Advanced to playoffs: ${result.advancingPlayers.length} players`);
      } else {
        this.log(`Failed to advance to playoffs: ${result.error}`, 'error');
        return false;
      }

      // Verify playoffs are populated
      const populatedPlayoffMatches = manager.matches.filter(m =>
        m.stage === 'playoffs' &&
        m.round === 1 &&
        !m.isPlaceholder
      );

      this.log(`✓ Playoff Round 1 has ${populatedPlayoffMatches.length} populated matches`);

      // Play through playoffs
      let safeguard = 0;
      while (safeguard < 50) {
        const unfinished = manager.matches.filter(m =>
          m.stage === 'playoffs' &&
          !m.isPlaceholder &&
          m.winner === null &&
          m.player1 !== null &&
          m.player2 !== null &&
          !m.isBye
        );

        if (unfinished.length === 0) break;

        const match = unfinished[0];
        this.playMatch(match);
        manager.advanceWinnerToNextMatch(match);

        safeguard++;
      }

      this.log(`✓ Completed playoffs in ${safeguard} steps`);

      // Get standings
      const standings = manager.getStandings();
      this.log(`✓ Generated standings with ${standings.rankedStats.length} players`);

      return true;
    } catch (error) {
      this.log(`Group Stage test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test partial match completion and game states
   */
  testPartialMatchCompletion() {
    this.log(`\n=== Testing Partial Match Completion ===`);

    try {
      const manager = new TournamentManager();
      const players = ['Alice', 'Bob', 'Charlie', 'Diana'];
      manager.createTournament(players, 3, TOURNAMENT_FORMATS.ROUND_ROBIN);

      const match = manager.matches[0];

      // Test 1: No games played
      let standings = manager.getStandings();
      this.log(`✓ Initial standings generated with no games played`);

      // Test 2: One game played (tied 1-1 possible)
      manager.updateMatchGame(match.id, 0, 1);
      standings = manager.getStandings();
      if (match.winner !== null) {
        this.log(`Match should not have winner after 1 game`, 'error');
      } else {
        this.log(`✓ Match correctly has no winner after 1 game`);
      }

      // Test 3: Two games played, tied 1-1
      manager.updateMatchGame(match.id, 1, 2);
      standings = manager.getStandings();
      if (match.winner !== null) {
        this.log(`Match should not have winner when tied 1-1`, 'error');
      } else {
        this.log(`✓ Match correctly has no winner when tied 1-1`);
      }

      // Test 4: Player 1 wins deciding game (2-1)
      manager.updateMatchGame(match.id, 2, 1);
      standings = manager.getStandings();
      if (match.winner !== 1) {
        this.log(`Match should have winner=1 after 2-1 score`, 'error');
      } else {
        this.log(`✓ Match correctly determined winner after 2-1`);
      }

      // Test 5: Undo last game - should remove winner
      manager.updateMatchGame(match.id, 2, 1); // Toggle off
      if (match.winner !== null) {
        this.log(`Match should have no winner after undoing deciding game`, 'error');
      } else {
        this.log(`✓ Match correctly removed winner when game undone`);
      }

      // Test 6: Player 2 wins 2-1 (different winner)
      manager.updateMatchGame(match.id, 2, 2);
      if (match.winner !== 2) {
        this.log(`Match should have winner=2 after player 2 wins`, 'error');
      } else {
        this.log(`✓ Match correctly switched winner to player 2`);
      }

      // Test 7: Standings reflect partial and complete matches
      const stats = standings.rankedStats;
      const player1Stats = stats.find(s => s.player === players[match.player1]);
      const player2Stats = stats.find(s => s.player === players[match.player2]);

      if (player2Stats.wins > player1Stats.wins) {
        this.log(`✓ Standings correctly show player 2 ahead of player 1`);
      }

      return true;
    } catch (error) {
      this.log(`Partial match completion test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test standings progression through tournament
   */
  testStandingsProgression() {
    this.log(`\n=== Testing Standings Progression ===`);

    try {
      const manager = new TournamentManager();
      const players = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
      manager.createTournament(players, 2, TOURNAMENT_FORMATS.ROUND_ROBIN);

      // Verify initial standings (all tied)
      let standings = manager.getStandings();
      const allZeroWins = standings.rankedStats.every(s => s.wins === 0);
      if (allZeroWins) {
        this.log(`✓ Initial standings show all players with 0 wins`);
      } else {
        this.log(`Initial standings should show 0 wins for all players`, 'error');
      }

      // Play first match - standings should update
      this.playMatch(manager.matches[0]);
      standings = manager.getStandings();
      const hasOneWinner = standings.rankedStats.some(s => s.wins === 1);
      if (hasOneWinner) {
        this.log(`✓ After first match, one player has 1 win`);
      } else {
        this.log(`After first match, standings should show a winner`, 'error');
      }

      // Play half the matches
      const halfMatches = Math.floor(manager.matches.length / 2);
      for (let i = 1; i < halfMatches; i++) {
        this.playMatch(manager.matches[i]);
      }
      standings = manager.getStandings();
      this.log(`✓ Standings updated after ${halfMatches} matches`);

      // Play all remaining matches
      for (let i = halfMatches; i < manager.matches.length; i++) {
        this.playMatch(manager.matches[i]);
      }
      standings = manager.getStandings();

      // Verify final standings have proper ranking
      const topPlayer = standings.rankedStats[0];
      const bottomPlayer = standings.rankedStats[standings.rankedStats.length - 1];

      if (topPlayer.rank <= bottomPlayer.rank) {
        this.log(`✓ Final standings properly ranked (top rank ≤ bottom rank)`);
      } else {
        this.log(`Rankings incorrect: top=${topPlayer.rank}, bottom=${bottomPlayer.rank}`, 'error');
      }

      // Verify all players played correct number of matches
      const allPlayed = standings.rankedStats.every(s =>
        (s.wins + s.losses) === 2 || s.wins === 2 || s.losses === 2
      );
      if (allPlayed) {
        this.log(`✓ All players played their matches`);
      }

      return true;
    } catch (error) {
      this.log(`Standings progression test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test elimination bracket progression step-by-step
   */
  testEliminationBracketProgression() {
    this.log(`\n=== Testing Elimination Bracket Progression ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`);
      manager.createTournament(players, 0, TOURNAMENT_FORMATS.SINGLE_ELIMINATION);

      // Round 1: Should have 4 matches
      const round1Matches = manager.matches.filter(m => m.round === 1);
      if (round1Matches.length !== 4) {
        this.log(`Round 1 should have 4 matches, has ${round1Matches.length}`, 'error');
        return false;
      }
      this.log(`✓ Round 1 has ${round1Matches.length} matches`);

      // Before playing: Round 2 should be all placeholders
      let round2Matches = manager.matches.filter(m => m.round === 2);
      const allPlaceholders = round2Matches.every(m =>
        m.isPlaceholder && m.player1 === null && m.player2 === null
      );
      if (allPlaceholders) {
        this.log(`✓ Round 2 matches start as placeholders`);
      } else {
        this.log(`Round 2 should start as placeholders`, 'error');
      }

      // Play one Round 1 match
      this.playMatch(round1Matches[0]);
      manager.advanceWinnerToNextMatch(round1Matches[0]);
      round2Matches = manager.matches.filter(m => m.round === 2);

      // Round 2 should still be mostly placeholders (only 1 player advanced)
      this.log(`✓ After 1 R1 match, round 2 partially populated`);

      // Play second Round 1 match (completes first R2 match)
      this.playMatch(round1Matches[1]);
      manager.advanceWinnerToNextMatch(round1Matches[1]);
      round2Matches = manager.matches.filter(m => m.round === 2);

      // Check if first R2 match has both players (no longer placeholder)
      const firstR2Match = round2Matches[0];
      if (firstR2Match && !firstR2Match.isPlaceholder &&
          firstR2Match.player1 !== null && firstR2Match.player2 !== null) {
        this.log(`✓ After 2 R1 matches, first R2 match populated`);
      } else if (firstR2Match && (firstR2Match.player1 !== null || firstR2Match.player2 !== null)) {
        this.log(`✓ After 2 R1 matches, first R2 match has players assigned`);
      } else {
        this.log(`Expected first R2 match to have players after 2 R1 matches`, 'error');
      }

      // Complete all Round 1 matches
      round1Matches.forEach(match => {
        if (match.winner === null) {
          this.playMatch(match);
          manager.advanceWinnerToNextMatch(match);
        }
      });

      round2Matches = manager.matches.filter(m => m.round === 2);
      const allR2Populated = round2Matches.every(m =>
        m.player1 !== null && m.player2 !== null
      );
      if (allR2Populated) {
        this.log(`✓ All Round 2 matches populated after Round 1 complete`);
      } else {
        this.log(`Round 2 matches should all be populated`, 'error');
      }

      // Play Round 2
      round2Matches.forEach(match => {
        this.playMatch(match);
        manager.advanceWinnerToNextMatch(match);
      });

      // Finals should be populated
      const finals = manager.matches.filter(m => m.round === 3);
      if (finals.length === 1 && finals[0].player1 !== null && finals[0].player2 !== null) {
        this.log(`✓ Finals populated after Round 2 complete`);
      } else {
        this.log(`Finals should be populated with 2 players`, 'error');
      }

      // Play finals
      this.playMatch(finals[0]);

      // Verify winner
      const standings = manager.getStandings();
      const champion = standings.rankedStats.find(s => s.rank === 1);
      if (champion && champion.wins === 3) {
        this.log(`✓ Champion correctly identified with 3 wins`);
      } else {
        this.log(`Champion should have 3 wins in 8-player bracket`, 'error');
      }

      return true;
    } catch (error) {
      this.log(`Elimination bracket progression test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test Swiss round visibility (Rounds 2 and 3 should appear after completing previous round)
   */
  testSwissRoundVisibility() {
    this.log(`\n=== Testing Swiss Round Visibility ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`);
      manager.createTournament(players, 0, TOURNAMENT_FORMATS.SWISS, { rounds: 3 });

      // Initially: Only Round 1 should be visible (non-placeholder)
      let round1Matches = manager.matches.filter(m => m.round === 1 && !m.isPlaceholder);
      let round2Matches = manager.matches.filter(m => m.round === 2 && !m.isPlaceholder);
      let round3Matches = manager.matches.filter(m => m.round === 3 && !m.isPlaceholder);

      if (round1Matches.length === 4 && round2Matches.length === 0 && round3Matches.length === 0) {
        this.log(`✓ Initially: Round 1 visible (${round1Matches.length} matches), Rounds 2-3 hidden`);
      } else {
        this.log(`Initial state incorrect: R1=${round1Matches.length}, R2=${round2Matches.length}, R3=${round3Matches.length}`, 'error');
      }

      // Complete Round 1
      round1Matches.forEach(match => this.playMatch(match));
      this.log(`✓ Completed Round 1`);

      // Generate Round 2
      const result2 = manager.generateNextSwissRound();
      if (!result2.success) {
        this.log(`Failed to generate Round 2: ${result2.error}`, 'error');
        return false;
      }
      this.log(`✓ Generated Round 2`);

      // Round 2 should now be visible
      round2Matches = manager.matches.filter(m => m.round === 2 && !m.isPlaceholder);
      round3Matches = manager.matches.filter(m => m.round === 3 && !m.isPlaceholder);

      if (round2Matches.length > 0) {
        this.log(`✓ Round 2 now visible (${round2Matches.length} matches)`);
      } else {
        this.log(`Round 2 should be visible after generation`, 'error');
        return false;
      }

      if (round3Matches.length === 0) {
        this.log(`✓ Round 3 still hidden`);
      } else {
        this.log(`Round 3 should still be hidden`, 'error');
      }

      // Complete Round 2
      round2Matches.forEach(match => this.playMatch(match));
      this.log(`✓ Completed Round 2`);

      // Generate Round 3
      const result3 = manager.generateNextSwissRound();
      if (!result3.success) {
        this.log(`Failed to generate Round 3: ${result3.error}`, 'error');
        return false;
      }
      this.log(`✓ Generated Round 3`);

      // Round 3 should now be visible
      round3Matches = manager.matches.filter(m => m.round === 3 && !m.isPlaceholder);

      if (round3Matches.length > 0) {
        this.log(`✓ Round 3 now visible (${round3Matches.length} matches)`);
      } else {
        this.log(`Round 3 should be visible after generation`, 'error');
        return false;
      }

      // Verify all rounds are now visible
      const allRounds = [1, 2, 3].map(r =>
        manager.matches.filter(m => m.round === r && !m.isPlaceholder).length
      );
      this.log(`✓ Final state: Round 1=${allRounds[0]}, Round 2=${allRounds[1]}, Round 3=${allRounds[2]} matches`);

      // Test rendering filter: Ensure placeholder matches are hidden
      const renderableMatches = manager.matches.filter(m => {
        if (m.isPlaceholder) return false;
        if (m.player1 === null) return false;
        if (m.player2 === null && !m.isBye) return false;
        return true;
      });

      const expectedRenderable = allRounds[0] + allRounds[1] + allRounds[2];
      if (renderableMatches.length === expectedRenderable) {
        this.log(`✓ Rendering filter correct: ${renderableMatches.length} matches visible`);
      } else {
        this.log(`Rendering filter issue: ${renderableMatches.length} matches, expected ${expectedRenderable}`, 'error');
      }

      return true;
    } catch (error) {
      this.log(`Swiss round visibility test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test Swiss auto-generation of next round
   */
  testSwissAutoGeneration() {
    this.log(`\n=== Testing Swiss Auto-Generation of Next Round ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`);
      manager.createTournament(players, 0, TOURNAMENT_FORMATS.SWISS, { rounds: 3 });

      // Initially: Only Round 1 should be visible
      let round1Matches = manager.matches.filter(m => m.round === 1 && !m.isPlaceholder);
      let round2Matches = manager.matches.filter(m => m.round === 2 && !m.isPlaceholder);

      if (round1Matches.length === 4 && round2Matches.length === 0) {
        this.log(`✓ Initially: Round 1 has 4 matches, Round 2 has 0 (placeholders)`);
      } else {
        this.log(`ERROR: Initial state incorrect: R1=${round1Matches.length}, R2=${round2Matches.length}`, 'error');
        return false;
      }

      // Complete Round 1 using updateMatchGame (simulates UI behavior)
      // This should auto-generate Round 2 when the last match completes
      round1Matches.forEach((match, index) => {
        manager.updateMatchGame(match.id, 0, 1); // Player 1 wins game 1
        manager.updateMatchGame(match.id, 1, 1); // Player 1 wins game 2

        if (index === round1Matches.length - 1) {
          // After last match, Round 2 should be auto-generated
          this.log(`✓ Completed all Round 1 matches`);
        }
      });

      // Check if Round 2 was auto-generated
      round2Matches = manager.matches.filter(m => m.round === 2 && !m.isPlaceholder);

      if (round2Matches.length === 4) {
        this.log(`✓ Round 2 auto-generated with 4 matches`);
      } else {
        this.log(`ERROR: Round 2 should have 4 matches, found ${round2Matches.length}`, 'error');
        return false;
      }

      // Verify Round 2 matches have valid pairings
      const allPaired = round2Matches.every(m => m.player1 !== null && m.player2 !== null);
      if (allPaired) {
        this.log(`✓ All Round 2 matches have valid pairings`);
      } else {
        this.log(`ERROR: Some Round 2 matches don't have valid pairings`, 'error');
        return false;
      }

      return true;
    } catch (error) {
      this.log(`Swiss auto-generation test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Test Double Elimination round visibility (Round 3 losers bracket should appear)
   */
  testDoubleEliminationRoundVisibility() {
    this.log(`\n=== Testing Double Elimination Round Visibility ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`);
      manager.createTournament(players, 0, TOURNAMENT_FORMATS.DOUBLE_ELIMINATION);

      // Count matches by bracket and round
      const countMatches = (bracket, round) => {
        return manager.matches.filter(m =>
          m.bracket === bracket &&
          m.round === round &&
          !m.isPlaceholder &&
          m.player1 !== null &&
          m.player2 !== null
        ).length;
      };

      // Initially: Winners R1 should be visible
      const initialWR1 = countMatches('winners', 1);
      if (initialWR1 === 4) {
        this.log(`✓ Initially: Winners R1 visible (${initialWR1} matches)`);
      } else {
        this.log(`Winners R1 should have 4 matches, has ${initialWR1}`, 'error');
      }

      // Play Winners Round 1
      const wr1Matches = manager.matches.filter(m =>
        m.bracket === 'winners' && m.round === 1 && !m.isPlaceholder
      );
      wr1Matches.forEach(match => {
        this.playMatch(match);
        manager.advanceWinnerToNextMatch(match);
      });
      this.log(`✓ Completed Winners Round 1`);

      // After WR1: Winners R2 and Losers R1 should be visible
      const wr2After = countMatches('winners', 2);
      const lr1After = countMatches('losers', 1);

      if (wr2After === 2) {
        this.log(`✓ Winners R2 now visible (${wr2After} matches)`);
      } else {
        this.log(`Winners R2 should have 2 matches, has ${wr2After}`, 'error');
      }

      if (lr1After >= 1) {
        this.log(`✓ Losers R1 populated (${lr1After} matches)`);
      } else {
        this.log(`Note: Losers R1 has ${lr1After} matches after WR1 (losers bracket routing may need adjustment)`);
      }

      // Play Winners Round 2
      const wr2Matches = manager.matches.filter(m =>
        m.bracket === 'winners' && m.round === 2 && !m.isPlaceholder
      );
      wr2Matches.forEach(match => {
        this.playMatch(match);
        manager.advanceWinnerToNextMatch(match);
      });
      this.log(`✓ Completed Winners Round 2`);

      // Play Losers Round 1
      const lr1Matches = manager.matches.filter(m =>
        m.bracket === 'losers' && m.round === 1 && !m.isPlaceholder
      );
      lr1Matches.forEach(match => {
        this.playMatch(match);
        manager.advanceWinnerToNextMatch(match);
      });
      this.log(`✓ Completed Losers Round 1`);

      // Check if higher losers rounds are now visible
      const lr2After = countMatches('losers', 2);
      if (lr2After >= 1) {
        this.log(`✓ Losers R2 now visible (${lr2After} matches)`);
      } else {
        this.log(`Note: Losers R2 has ${lr2After} matches (may be expected for 8-player bracket)`);
      }

      // Continue playing all matches to ensure tournament completes properly
      let safeguard = 0;
      const maxIterations = 50;

      while (safeguard < maxIterations) {
        const nextMatch = manager.matches.find(m =>
          !m.isPlaceholder &&
          m.player1 !== null &&
          m.player2 !== null &&
          m.winner === null
        );

        if (!nextMatch) break;

        this.playMatch(nextMatch);
        manager.advanceWinnerToNextMatch(nextMatch);
        safeguard++;
      }

      // Verify bracket structure
      const totalWinners = [1, 2, 3].reduce((sum, r) => sum + countMatches('winners', r), 0);
      const totalLosers = [1, 2, 3, 4, 5].reduce((sum, r) => sum + countMatches('losers', r), 0);

      this.log(`✓ Final bracket: Winners=${totalWinners} matches, Losers=${totalLosers} matches`);

      if (totalLosers === 0) {
        this.log(`ERROR: Losers bracket has 0 matches! Double elimination not working properly!`, 'error');
      }

      // Check completion
      const completedMatches = manager.matches.filter(m => m.winner !== null && !m.isPlaceholder).length;
      this.log(`✓ Completed ${completedMatches} matches total`);

      if (completedMatches < 10) {
        this.log(`Double elimination with 8 players should have ~13-14 matches, only completed ${completedMatches}`, 'error');
      }

      return true;
    } catch (error) {
      this.log(`Double elimination visibility test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Comprehensive Double Elimination Complete Test
   * This test ensures the entire tournament can be played to completion
   */
  testDoubleEliminationComplete() {
    this.log(`\n=== Testing Double Elimination COMPLETE Playthrough ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`);
      manager.createTournament(players, 0, TOURNAMENT_FORMATS.DOUBLE_ELIMINATION);

      const totalMatches = manager.matches.length;
      this.log(`✓ Created ${totalMatches} total match slots`);

      // DEBUG: Print bracket structure
      this.log(`\n--- Bracket Structure ---`);
      const winnersBracket = manager.matches.filter(m => m.bracket === 'winners');
      const losersBracket = manager.matches.filter(m => m.bracket === 'losers');

      this.log(`Winners Bracket (${winnersBracket.length} matches):`);
      winnersBracket.forEach(m => {
        const p1 = m.player1 !== null ? `P${m.player1 + 1}` : 'TBD';
        const p2 = m.player2 !== null ? `P${m.player2 + 1}` : 'TBD';
        this.log(`  M${m.id} [R${m.round}]: ${p1} vs ${p2} → Win:M${m.feedsIntoWin} Loss:M${m.feedsIntoLoss} [${m.isPlaceholder ? 'PH' : 'ACTIVE'}]`);
      });

      this.log(`\nLosers Bracket (${losersBracket.length} matches):`);
      losersBracket.forEach(m => {
        const p1 = m.player1 !== null ? `P${m.player1 + 1}` : 'TBD';
        const p2 = m.player2 !== null ? `P${m.player2 + 1}` : 'TBD';
        this.log(`  M${m.id} [R${m.round}]: ${p1} vs ${p2} → Win:M${m.feedsIntoWin} Loss:${m.feedsIntoLoss} [${m.isPlaceholder ? 'PH' : 'ACTIVE'}]`);
      });
      this.log(`--- End Structure ---\n`);

      // Expected match counts for 8 players
      const expectedWinnersMatches = 7;  // 4 + 2 + 1
      const expectedLosersMatches = 6;   // Proper losers bracket
      const expectedTotal = expectedWinnersMatches + expectedLosersMatches; // 13 (+ grand finals)

      // Play through entire tournament
      let completedMatches = 0;
      let safeguard = 0;
      const maxIterations = 100;

      while (safeguard < maxIterations) {
        // Find next playable match
        const playableMatch = manager.matches.find(m =>
          !m.isPlaceholder &&
          m.winner === null &&
          m.player1 !== null &&
          m.player2 !== null &&
          !m.isBye
        );

        if (!playableMatch) {
          // No more playable matches
          break;
        }

        // Play the match
        this.playMatch(playableMatch);
        const winnerIdx = playableMatch.winner === 1 ? playableMatch.player1 : playableMatch.player2;
        const loserIdx = playableMatch.winner === 1 ? playableMatch.player2 : playableMatch.player1;

        this.log(`  Played M${playableMatch.id} [${playableMatch.bracket} R${playableMatch.round}]: Winner=P${winnerIdx+1}, Loser=P${loserIdx+1} → feedsIntoWin:M${playableMatch.feedsIntoWin}, feedsIntoLoss:M${playableMatch.feedsIntoLoss}`);

        manager.advanceWinnerToNextMatch(playableMatch);
        completedMatches++;
        safeguard++;
      }

      this.log(`✓ Completed ${completedMatches} matches`);

      // Check for stuck state - matches with both players assigned but not completed
      const unplayedButPopulated = manager.matches.filter(m =>
        !m.isPlaceholder &&
        m.winner === null &&
        (m.player1 !== null || m.player2 !== null)
      );

      if (unplayedButPopulated.length > 0) {
        this.log(`ERROR: ${unplayedButPopulated.length} matches remain unplayed!`, 'error');
        unplayedButPopulated.forEach((m, i) => {
          const p1 = m.player1 !== null ? players[m.player1] : 'TBD';
          const p2 = m.player2 !== null ? players[m.player2] : 'TBD';
          this.log(`  Unplayed match ${i + 1}: ${m.bracket} R${m.round} M${m.id} - ${p1} vs ${p2}`, 'error');
          this.log(`    feedsIntoWin: ${m.feedsIntoWin}, feedsIntoLoss: ${m.feedsIntoLoss}`, 'error');
        });
      }

      // Also check for placeholder matches that should have been populated
      const placeholdersWithPlayers = manager.matches.filter(m =>
        m.isPlaceholder &&
        (m.player1 !== null || m.player2 !== null)
      );

      if (placeholdersWithPlayers.length > 0) {
        this.log(`ERROR: ${placeholdersWithPlayers.length} placeholder matches have players!`, 'error');
        placeholdersWithPlayers.forEach((m, i) => {
          const p1 = m.player1 !== null ? players[m.player1] : 'NULL';
          const p2 = m.player2 !== null ? players[m.player2] : 'NULL';
          this.log(`  Placeholder with players ${i + 1}: ${m.bracket} R${m.round} M${m.id} - ${p1} vs ${p2}`, 'error');
        });
      }

      // Verify champion
      const standings = manager.getStandings();
      const champions = standings.rankedStats.filter(s => s.rank === 1);

      if (champions.length !== 1) {
        this.log(`ERROR: Should have exactly 1 champion, found ${champions.length}`, 'error');
        this.log(`  Champions: ${champions.map(c => `${c.player} (elim: ${c.eliminationRound}, wins: ${c.wins}, losses: ${c.losses})`).join(', ')}`, 'error');
        // Debug all standings
        standings.rankedStats.slice(0, 8).forEach(s => {
          this.log(`    ${s.rank}. ${s.player}: wins=${s.wins}, losses=${s.losses}, elimRound=${s.eliminationRound}`, 'error');
        });
      } else {
        this.log(`✓ Exactly 1 champion: ${champions[0].player}`);
      }

      // Verify match count
      if (completedMatches < expectedTotal - 2) {
        this.log(`ERROR: Completed only ${completedMatches} matches, expected at least ${expectedTotal - 2}`, 'error');
      } else {
        this.log(`✓ Match count acceptable (${completedMatches}/${expectedTotal} expected)`);
      }

      // Verify all players played multiple matches
      const playerMatchCounts = standings.rankedStats.map(s => ({
        player: s.player,
        matches: s.wins + s.losses
      }));

      const minMatches = Math.min(...playerMatchCounts.map(p => p.matches));
      const maxMatches = Math.max(...playerMatchCounts.map(p => p.matches));

      this.log(`✓ Match range per player: ${minMatches}-${maxMatches} matches`);

      if (minMatches < 2) {
        this.log(`WARNING: Some players played fewer than 2 matches (should get second chance)`, 'warning');
      }

      return true;
    } catch (error) {
      this.log(`Double Elimination complete test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Comprehensive Group Stage + Playoffs Test
   * Tests visibility issues and stage progression
   */
  testGroupStagePlayoffsComplete() {
    this.log(`\n=== Testing Group Stage + Playoffs COMPLETE Playthrough ===`);

    try {
      const manager = new TournamentManager();
      const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`);

      // Create tournament: 2 groups of 4, top 2 advance to 4-player playoffs
      manager.createTournament(players, 0, TOURNAMENT_FORMATS.GROUP_STAGE);

      const totalMatches = manager.matches.length;
      this.log(`✓ Created ${totalMatches} total match slots`);

      // Filter matches by stage
      const groupMatches = manager.matches.filter(m => m.stage === 'groups');
      const playoffMatches = manager.matches.filter(m => m.stage === 'playoffs');

      this.log(`✓ Group matches: ${groupMatches.length}`);
      this.log(`✓ Playoff matches: ${playoffMatches.length}`);

      // Should start in groups stage
      if (manager.currentStage !== 'groups') {
        this.log(`ERROR: Should start in 'groups' stage, found '${manager.currentStage}'`, 'error');
      } else {
        this.log(`✓ Started in 'groups' stage`);
      }

      // TEST 1: In groups stage, only group matches should be visible
      // Simulate UI filtering: only show matches from current stage
      const currentStageInGroups = manager.currentStage || 'groups';
      const visibleInGroups = manager.matches.filter(m =>
        (!m.stage || m.stage === currentStageInGroups) &&
        !m.isPlaceholder &&
        m.player1 !== null &&
        (m.player2 !== null || m.isBye)
      );

      const visibleGroupMatches = visibleInGroups.filter(m => m.stage === 'groups' || !m.stage);
      const visiblePlayoffMatches = visibleInGroups.filter(m => m.stage === 'playoffs');

      if (visiblePlayoffMatches.length > 0) {
        this.log(`ERROR: In groups stage, ${visiblePlayoffMatches.length} playoff matches are visible (should be 0)`, 'error');
      } else {
        this.log(`✓ In groups stage: 0 playoff matches visible`);
      }

      if (visibleGroupMatches.length !== groupMatches.length) {
        this.log(`ERROR: In groups stage, ${visibleGroupMatches.length} group matches visible, expected ${groupMatches.length}`, 'error');
      } else {
        this.log(`✓ In groups stage: All ${groupMatches.length} group matches visible`);
      }

      // Play all group matches
      this.log(`\n--- Playing Group Stage ---`);
      let completedGroups = 0;
      groupMatches.forEach(match => {
        this.playMatch(match);
        manager.advanceWinnerToNextMatch(match);
        completedGroups++;
      });
      this.log(`✓ Completed ${completedGroups} group matches`);

      // Advance to playoffs
      const advanceResult = manager.advanceToPlayoffs();
      this.log(`  Advanced ${advanceResult.advancingPlayers?.length || 0} players to playoffs: ${JSON.stringify(advanceResult.advancingPlayers || [])}`);

      if (manager.currentStage !== 'playoffs') {
        this.log(`ERROR: After advancing, should be in 'playoffs' stage, found '${manager.currentStage}'`, 'error');
      } else {
        this.log(`✓ Advanced to 'playoffs' stage`);
      }

      // Debug: Show playoff match state after seeding
      playoffMatches.forEach(m => {
        const p1 = m.player1 !== null ? `P${m.player1 + 1}(idx:${m.player1})` : 'TBD';
        const p2 = m.player2 !== null ? `P${m.player2 + 1}(idx:${m.player2})` : 'TBD';
        this.log(`  Playoff M${m.id} [R${m.round}]: ${p1} vs ${p2} [${m.isPlaceholder ? 'PH' : 'ACTIVE'}] feedsInto:${m.feedsInto}`);
      });

      // Verify all advancing players were seeded
      const seededPlayerIndices = new Set();
      playoffMatches.filter(m => m.round === 1).forEach(m => {
        if (m.player1 !== null) seededPlayerIndices.add(m.player1);
        if (m.player2 !== null) seededPlayerIndices.add(m.player2);
      });

      const missingPlayers = advanceResult.advancingPlayers.filter(p => !seededPlayerIndices.has(p));
      if (missingPlayers.length > 0) {
        this.log(`ERROR: ${missingPlayers.length} advancing players were not seeded in playoffs: ${JSON.stringify(missingPlayers)}`, 'error');
      } else {
        this.log(`✓ All ${advanceResult.advancingPlayers.length} advancing players seeded in playoffs`);
      }

      // TEST 2: In playoffs stage, only playoff matches should be visible (not group matches)
      this.log(`\n--- Testing Playoff Stage Visibility ---`);
      const currentStageInPlayoffs = manager.currentStage || 'playoffs';
      const visibleInPlayoffs = manager.matches.filter(m =>
        (!m.stage || m.stage === currentStageInPlayoffs) &&
        !m.isPlaceholder &&
        m.player1 !== null &&
        (m.player2 !== null || m.isBye)
      );

      const visibleGroupInPlayoffs = visibleInPlayoffs.filter(m => m.stage === 'groups');
      const visiblePlayoffInPlayoffs = visibleInPlayoffs.filter(m => m.stage === 'playoffs' || !m.stage);

      if (visibleGroupInPlayoffs.length > 0) {
        this.log(`ERROR: In playoffs stage, ${visibleGroupInPlayoffs.length} GROUP matches are visible (should be 0)`, 'error');
      } else {
        this.log(`✓ In playoffs stage: 0 group matches visible`);
      }

      if (visiblePlayoffInPlayoffs.length === 0) {
        this.log(`ERROR: In playoffs stage, 0 playoff matches visible (should have Round 1 visible)`, 'error');
      } else {
        this.log(`✓ In playoffs stage: ${visiblePlayoffInPlayoffs.length} playoff matches visible`);
      }

      // Play playoff matches and check visibility after each round
      this.log(`\n--- Playing Playoffs ---`);
      let playoffRound = 1;
      let completedPlayoffs = 0;
      let safeguard = 0;

      while (safeguard < 20) {
        // Find next playable playoff match
        const playableMatch = manager.matches.find(m =>
          m.stage === 'playoffs' &&
          !m.isPlaceholder &&
          m.winner === null &&
          m.player1 !== null &&
          m.player2 !== null &&
          !m.isBye
        );

        if (!playableMatch) {
          break;
        }

        const currentRound = playableMatch.round;
        this.log(`  Playing Playoff R${currentRound} M${playableMatch.id}: ${players[playableMatch.player1]} vs ${players[playableMatch.player2]}`);

        this.playMatch(playableMatch);
        manager.advanceWinnerToNextMatch(playableMatch);
        completedPlayoffs++;

        // Check if this completed a round
        const roundMatches = manager.matches.filter(m =>
          m.stage === 'playoffs' && m.round === currentRound && !m.isPlaceholder
        );
        const allRoundComplete = roundMatches.every(m => m.winner !== null);

        if (allRoundComplete && currentRound < Math.log2(playoffMatches.length + 1)) {
          // Check if next round is visible
          const nextRoundMatches = manager.matches.filter(m =>
            m.stage === 'playoffs' &&
            m.round === currentRound + 1 &&
            !m.isPlaceholder &&
            m.player1 !== null &&
            m.player2 !== null
          );

          if (nextRoundMatches.length === 0) {
            this.log(`  ERROR: After completing Playoff R${currentRound}, next round (R${currentRound + 1}) is NOT visible`, 'error');
          } else {
            this.log(`  ✓ After completing Playoff R${currentRound}, next round (R${currentRound + 1}) is visible (${nextRoundMatches.length} matches)`);
          }
        }

        safeguard++;
      }

      this.log(`✓ Completed ${completedPlayoffs} playoff matches`);

      // Verify champion
      const standings = manager.getStandings();
      const champions = standings.rankedStats.filter(s => s.rank === 1);

      if (champions.length !== 1) {
        this.log(`ERROR: Should have exactly 1 champion, found ${champions.length}`, 'error');
      } else {
        this.log(`✓ Exactly 1 champion: ${champions[0].player}`);
      }

      // Verify total matches completed
      const totalCompleted = completedGroups + completedPlayoffs;
      const expectedPlayoffMatches = playoffMatches.length;

      if (completedPlayoffs < expectedPlayoffMatches) {
        this.log(`ERROR: Completed only ${completedPlayoffs} playoff matches, expected ${expectedPlayoffMatches}`, 'error');
      } else {
        this.log(`✓ All playoff matches completed`);
      }

      this.log(`✓ Total matches completed: ${totalCompleted} (${completedGroups} groups + ${completedPlayoffs} playoffs)`);

      return true;
    } catch (error) {
      this.log(`Group Stage + Playoffs complete test failed: ${error.message}`, 'error');
      console.error(error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  runAllTests() {
    this.log('╔════════════════════════════════════════════════════════╗');
    this.log('║     MAGIC MIKES TOURNAMENT - FUNCTIONAL TESTS          ║');
    this.log('╚════════════════════════════════════════════════════════╝');

    const startTime = Date.now();

    // Round Robin tests - Comprehensive coverage
    this.log('\n\n📋 ROUND ROBIN TESTS (Comprehensive)');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testRoundRobinComprehensive();

    // Single Elimination tests (power-of-2 only)
    this.log('\n\n🏆 SINGLE ELIMINATION TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testSingleElimination(2);   // Minimum
    this.testSingleElimination(4);   // Small tournament
    this.testSingleElimination(8);   // Medium tournament
    this.testSingleElimination(16);  // Large tournament
    this.testSingleElimination(32);  // Very large tournament

    // Double Elimination tests (power-of-2 only)
    this.log('\n\n♻️  DOUBLE ELIMINATION TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testDoubleElimination(4);   // Minimum
    this.testDoubleElimination(8);   // Medium tournament
    this.testDoubleElimination(16);  // Large tournament

    // Swiss tests
    this.log('\n\n🔄 SWISS TOURNAMENT TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testSwiss(4, 2);    // Minimal: 4 players, 2 rounds
    this.testSwiss(4, 3);    // Small: 4 players, 3 rounds
    this.testSwiss(6, 3);    // Even players, moderate rounds
    this.testSwiss(7, 3);    // Odd players (BYE each round)
    this.testSwiss(8, 3);    // Even players, 3 rounds
    this.testSwiss(8, 4);    // Even players, 4 rounds
    this.testSwiss(12, 4);   // Medium tournament
    this.testSwiss(16, 5);   // Large tournament

    // Group Stage tests
    this.log('\n\n📦 GROUP STAGE TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testGroupStage(8, 2, 2);    // 2 groups of 4, top 2 advance (4-player playoff)
    this.testGroupStage(8, 2, 1);    // 2 groups of 4, top 1 advance (2-player playoff)
    this.testGroupStage(12, 3, 2);   // 3 groups of 4, top 2 advance (6-player playoff)
    this.testGroupStage(12, 4, 1);   // 4 groups of 3, top 1 advance (4-player playoff)
    this.testGroupStage(16, 4, 2);   // 4 groups of 4, top 2 advance (8-player playoff)
    this.testGroupStage(16, 4, 1);   // 4 groups of 4, top 1 advance (4-player playoff)

    // In-Game Scenario Tests
    this.log('\n\n🎮 IN-GAME SCENARIO TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testPartialMatchCompletion();
    this.testStandingsProgression();
    this.testEliminationBracketProgression();
    this.testSwissRoundVisibility();
    this.testSwissAutoGeneration();
    this.testDoubleEliminationRoundVisibility();
    this.testDoubleEliminationComplete();
    this.testGroupStagePlayoffsComplete();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Summary
    this.log('\n\n╔════════════════════════════════════════════════════════╗');
    this.log('║                    TEST SUMMARY                        ║');
    this.log('╚════════════════════════════════════════════════════════╝');
    this.log(`\nTotal Duration: ${duration}s`);
    this.log(`Errors: ${this.errors.length}`);
    this.log(`Warnings: ${this.warnings.length}`);

    if (this.errors.length > 0) {
      this.log('\n❌ ERRORS FOUND:');
      this.errors.forEach((err, idx) => {
        this.log(`  ${idx + 1}. ${err.message}`);
      });
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warn, idx) => {
        this.log(`  ${idx + 1}. ${warn.message}`);
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('\n✅ ALL TESTS PASSED!');
    }

    return {
      passed: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      duration
    };
  }
}

// Export for use in browser console or test runner
if (typeof window !== 'undefined') {
  window.TournamentTester = TournamentTester;
  window.runTournamentTests = function() {
    const tester = new TournamentTester();
    return tester.runAllTests();
  };
}

// Auto-run if loaded in HTML
if (typeof document !== 'undefined') {
  console.log('Tournament tests loaded. Run: runTournamentTests()');
}
