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
   * Run all tests
   */
  runAllTests() {
    this.log('╔════════════════════════════════════════════════════════╗');
    this.log('║     MAGIC MIKES TOURNAMENT - FUNCTIONAL TESTS          ║');
    this.log('╚════════════════════════════════════════════════════════╝');

    const startTime = Date.now();

    // Round Robin tests
    this.log('\n\n📋 ROUND ROBIN TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testRoundRobin(4, 3);
    this.testRoundRobin(7, 3);
    this.testRoundRobin(8, 2);

    // Single Elimination tests
    this.log('\n\n🏆 SINGLE ELIMINATION TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testSingleElimination(2);   // Minimum
    this.testSingleElimination(4);   // Power of 2
    this.testSingleElimination(5);   // Non-power of 2 (3 BYEs)
    this.testSingleElimination(8);   // Power of 2
    this.testSingleElimination(13);  // Non-power of 2 (3 BYEs)
    this.testSingleElimination(16);  // Power of 2

    // Double Elimination tests
    this.log('\n\n♻️  DOUBLE ELIMINATION TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testDoubleElimination(3);   // Minimum
    this.testDoubleElimination(4);   // Power of 2
    this.testDoubleElimination(6);   // Non-power of 2
    this.testDoubleElimination(8);   // Power of 2

    // Swiss tests
    this.log('\n\n🔄 SWISS TOURNAMENT TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testSwiss(4, 3);    // Even players
    this.testSwiss(7, 3);    // Odd players (BYE each round)
    this.testSwiss(8, 4);    // Even players
    this.testSwiss(16, 5);   // Larger tournament

    // Group Stage tests
    this.log('\n\n📦 GROUP STAGE TESTS');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.testGroupStage(8, 2, 2);    // 2 groups of 4, top 2 advance
    this.testGroupStage(12, 3, 2);   // 3 groups of 4, top 2 advance
    this.testGroupStage(16, 4, 2);   // 4 groups of 4, top 2 advance

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
