/**
 * TOURNAMENT STRUCTURE TESTS
 * Comprehensive tests for all tournament formats and configurations
 */

const TournamentStructureTests = {
  testResults: [],

  /**
   * Test helper: assert a condition
   */
  assert(condition, message) {
    if (!condition) {
      this.testResults.push({ pass: false, message: `❌ FAILED: ${message}` });
      console.error(`❌ FAILED: ${message}`);
      return false;
    } else {
      this.testResults.push({ pass: true, message: `✅ PASSED: ${message}` });
      console.log(`✅ PASSED: ${message}`);
      return true;
    }
  },

  /**
   * Generate player names for testing
   */
  generatePlayers(count) {
    return Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
  },

  /**
   * Test 1: Group Stage - All Configurations
   */
  testGroupStageAllConfigurations() {
    console.log('\n=== TEST 1: Group Stage - All Configurations ===');

    const format = new GroupStageFormat();
    const playerCounts = [8, 12, 16, 20, 24, 32];

    playerCounts.forEach(numPlayers => {
      const players = this.generatePlayers(numPlayers);
      const configs = format.getValidConfigurations(numPlayers);

      this.assert(
        configs.length > 0,
        `${numPlayers} players: At least one valid configuration exists`
      );

      configs.forEach((config, idx) => {
        console.log(`\n  Testing ${numPlayers} players - Config ${idx + 1}: ${config.description}`);

        // Validate configuration
        const validation = format.validateConfig(config, numPlayers);
        this.assert(
          validation.isValid,
          `${numPlayers} players, Config ${idx + 1}: Configuration is valid`
        );

        // Generate matches
        const matches = format.generateMatches(players, config);

        // Check group stage matches
        const groupMatches = matches.filter(m => m.stage === 'groups');
        const expectedGroupMatches = this.calculateExpectedGroupMatches(
          config.numGroups,
          config.playersPerGroup
        );

        this.assert(
          groupMatches.length === expectedGroupMatches,
          `${numPlayers} players, Config ${idx + 1}: Correct number of group matches (expected ${expectedGroupMatches}, got ${groupMatches.length})`
        );

        // Check playoff matches
        const playoffMatches = matches.filter(m => m.stage === 'playoffs');
        const totalAdvancing = config.numGroups * config.advancingPerGroup;
        const expectedPlayoffMatches = totalAdvancing - 1; // Single elimination: n-1 matches

        this.assert(
          playoffMatches.length === expectedPlayoffMatches,
          `${numPlayers} players, Config ${idx + 1}: Correct number of playoff matches (expected ${expectedPlayoffMatches}, got ${playoffMatches.length})`
        );

        // Verify total advancing is power of 2
        const isPowerOf2 = (n) => n > 0 && (n & (n - 1)) === 0;
        this.assert(
          isPowerOf2(totalAdvancing),
          `${numPlayers} players, Config ${idx + 1}: Total advancing (${totalAdvancing}) is power of 2`
        );

        // Verify all group matches have both players assigned
        const invalidGroupMatches = groupMatches.filter(m =>
          m.player1 === null || m.player2 === null
        );
        this.assert(
          invalidGroupMatches.length === 0,
          `${numPlayers} players, Config ${idx + 1}: All group matches have players assigned`
        );

        // Verify playoff matches are placeholders initially
        const playoffPlaceholders = playoffMatches.filter(m => m.isPlaceholder);
        this.assert(
          playoffPlaceholders.length === playoffMatches.length,
          `${numPlayers} players, Config ${idx + 1}: All playoff matches start as placeholders`
        );

        // Test standings calculation for groups
        const standings = format.calculateStandings(matches, players, { ...config, currentStage: 'groups' });
        this.assert(
          standings.length === numPlayers,
          `${numPlayers} players, Config ${idx + 1}: Standings include all players`
        );

        // Verify each player is assigned to a group
        const playersWithGroup = standings.filter(s => s.group !== null && s.group !== undefined);
        const expectedPlayersInGroups = config.numGroups * config.playersPerGroup;
        this.assert(
          playersWithGroup.length === expectedPlayersInGroups,
          `${numPlayers} players, Config ${idx + 1}: Correct number of players assigned to groups`
        );
      });
    });
  },

  /**
   * Calculate expected number of group stage matches
   */
  calculateExpectedGroupMatches(numGroups, playersPerGroup) {
    // Round robin within each group: n*(n-1)/2 matches per group
    const matchesPerGroup = (playersPerGroup * (playersPerGroup - 1)) / 2;
    return numGroups * matchesPerGroup;
  },

  /**
   * Test 2: Single Elimination - Various Player Counts
   */
  testSingleEliminationAllCounts() {
    console.log('\n=== TEST 2: Single Elimination - Various Player Counts ===');

    const format = new SingleEliminationFormat();
    const playerCounts = [4, 8, 16, 32];

    playerCounts.forEach(numPlayers => {
      const players = this.generatePlayers(numPlayers);
      const config = format.getDefaultConfig(numPlayers);

      console.log(`\n  Testing ${numPlayers} players`);

      const matches = format.generateMatches(players, config);

      // Single elimination should have n-1 matches
      const expectedMatches = numPlayers - 1;
      this.assert(
        matches.length === expectedMatches,
        `Single Elimination ${numPlayers} players: Correct number of matches (expected ${expectedMatches}, got ${matches.length})`
      );

      // Count matches per round
      const rounds = Math.ceil(Math.log2(numPlayers));
      for (let round = 1; round <= rounds; round++) {
        const roundMatches = matches.filter(m => m.round === round);
        const expectedRoundMatches = Math.pow(2, rounds - round);

        this.assert(
          roundMatches.length === expectedRoundMatches,
          `Single Elimination ${numPlayers} players, Round ${round}: Correct number of matches (expected ${expectedRoundMatches}, got ${roundMatches.length})`
        );
      }

      // Verify first round has all matches populated
      const firstRoundMatches = matches.filter(m => m.round === 1);
      const firstRoundWithPlayers = firstRoundMatches.filter(m =>
        m.player1 !== null && (m.player2 !== null || m.isBye)
      );
      this.assert(
        firstRoundWithPlayers.length === firstRoundMatches.length,
        `Single Elimination ${numPlayers} players: All first round matches have players`
      );

      // Test standings
      const standings = format.calculateStandings(matches, players, config);
      this.assert(
        standings.length === numPlayers,
        `Single Elimination ${numPlayers} players: Standings include all players`
      );
    });
  },

  /**
   * Test 3: Double Elimination - Various Player Counts
   */
  testDoubleEliminationAllCounts() {
    console.log('\n=== TEST 3: Double Elimination - Various Player Counts ===');

    const format = new DoubleEliminationFormat();
    const playerCounts = [4, 8, 16];

    playerCounts.forEach(numPlayers => {
      const players = this.generatePlayers(numPlayers);
      const config = format.getDefaultConfig(numPlayers);

      console.log(`\n  Testing ${numPlayers} players`);

      const matches = format.generateMatches(players, config);

      // Verify winners bracket matches
      const winnersMatches = matches.filter(m => m.bracket === 'winners');
      const expectedWinners = numPlayers - 1;
      this.assert(
        winnersMatches.length === expectedWinners,
        `Double Elimination ${numPlayers} players: Correct winners bracket matches (expected ${expectedWinners}, got ${winnersMatches.length})`
      );

      // Verify losers bracket exists
      const losersMatches = matches.filter(m => m.bracket === 'losers');
      this.assert(
        losersMatches.length > 0,
        `Double Elimination ${numPlayers} players: Losers bracket exists`
      );

      // Verify grand finals exist
      const grandFinals = matches.filter(m => m.bracket === 'grand-finals');
      this.assert(
        grandFinals.length >= 1,
        `Double Elimination ${numPlayers} players: Grand finals exist`
      );
    });
  },

  /**
   * Test 4: Swiss Format
   */
  testSwissFormat() {
    console.log('\n=== TEST 4: Swiss Format ===');

    const format = new SwissFormat();
    const testCases = [
      { players: 8, rounds: 3 },
      { players: 16, rounds: 4 },
      { players: 32, rounds: 5 }
    ];

    testCases.forEach(({ players: numPlayers, rounds }) => {
      const players = this.generatePlayers(numPlayers);
      const config = { rounds };

      console.log(`\n  Testing ${numPlayers} players, ${rounds} rounds`);

      const matches = format.generateMatches(players, config);

      // Calculate expected matches
      const expectedMatches = rounds * (numPlayers / 2);
      this.assert(
        matches.length === expectedMatches,
        `Swiss ${numPlayers} players, ${rounds} rounds: Correct number of matches (expected ${expectedMatches}, got ${matches.length})`
      );

      // Check each round has correct number of matches
      for (let round = 1; round <= rounds; round++) {
        const roundMatches = matches.filter(m => m.round === round);
        const expectedRoundMatches = numPlayers / 2;

        this.assert(
          roundMatches.length === expectedRoundMatches,
          `Swiss ${numPlayers} players, Round ${round}: Correct matches (expected ${expectedRoundMatches}, got ${roundMatches.length})`
        );
      }

      // Only first round should have players assigned
      const firstRoundMatches = matches.filter(m => m.round === 1);
      const firstRoundWithPlayers = firstRoundMatches.filter(m => !m.isPlaceholder);
      this.assert(
        firstRoundWithPlayers.length === firstRoundMatches.length,
        `Swiss ${numPlayers} players: First round has all matches populated`
      );

      // Other rounds should be placeholders
      const laterRounds = matches.filter(m => m.round > 1);
      const laterRoundPlaceholders = laterRounds.filter(m => m.isPlaceholder);
      this.assert(
        laterRoundPlaceholders.length === laterRounds.length,
        `Swiss ${numPlayers} players: Later rounds are placeholders`
      );
    });
  },

  /**
   * Test 5: Round Robin
   */
  testRoundRobin() {
    console.log('\n=== TEST 5: Round Robin ===');

    const format = new RoundRobinFormat();
    const testCases = [
      { players: 6, matchesPerPlayer: 3 },
      { players: 8, matchesPerPlayer: 4 },
      { players: 10, matchesPerPlayer: 4 }
    ];

    testCases.forEach(({ players: numPlayers, matchesPerPlayer }) => {
      const players = this.generatePlayers(numPlayers);
      const config = { matchesPerPlayer };

      console.log(`\n  Testing ${numPlayers} players, ${matchesPerPlayer} matches per player`);

      const matches = format.generateMatches(players, config);

      // Calculate expected total matches
      const expectedMatches = (numPlayers * matchesPerPlayer) / 2;
      this.assert(
        matches.length === expectedMatches,
        `Round Robin ${numPlayers} players: Correct number of matches (expected ${expectedMatches}, got ${matches.length})`
      );

      // Verify each player has correct number of matches
      const playerMatchCounts = new Array(numPlayers).fill(0);
      matches.forEach(m => {
        playerMatchCounts[m.player1]++;
        playerMatchCounts[m.player2]++;
      });

      const allPlayersHaveCorrectMatches = playerMatchCounts.every(
        count => count === matchesPerPlayer
      );
      this.assert(
        allPlayersHaveCorrectMatches,
        `Round Robin ${numPlayers} players: All players have ${matchesPerPlayer} matches`
      );

      // Test standings
      const standings = format.calculateStandings(matches, players, config);
      this.assert(
        standings.length === numPlayers,
        `Round Robin ${numPlayers} players: Standings include all players`
      );
    });
  },

  /**
   * Test 6: Playoff Advancement (Group Stage)
   */
  async testPlayoffAdvancement() {
    console.log('\n=== TEST 6: Playoff Advancement (Group Stage) ===');

    const format = new GroupStageFormat();
    const players = this.generatePlayers(16);
    const config = {
      numGroups: 4,
      playersPerGroup: 4,
      advancingPerGroup: 2,
      currentStage: 'groups'
    };

    console.log('\n  Testing 16 players: 4 groups of 4, top 2 advance');

    const matches = format.generateMatches(players, config);

    // Simulate all group matches complete
    const groupMatches = matches.filter(m => m.stage === 'groups');
    groupMatches.forEach((match, idx) => {
      // Simulate results (player1 wins odd matches, player2 wins even)
      match.winner = idx % 2 === 0 ? 1 : 2;
      match.games = idx % 2 === 0 ? [1, 1, null] : [2, 2, null];
    });

    // Calculate group standings
    const standings = format.calculateStandings(matches, players, { ...config, currentStage: 'groups' });

    // Get top 2 from each group
    const groups = {};
    standings.forEach(stat => {
      if (stat.group) {
        if (!groups[stat.group]) groups[stat.group] = [];
        groups[stat.group].push(stat);
      }
    });

    // Sort each group by points
    Object.keys(groups).forEach(groupName => {
      groups[groupName].sort((a, b) => b.points - a.points);
    });

    // Verify 4 groups exist
    this.assert(
      Object.keys(groups).length === 4,
      'Playoff Advancement: 4 groups exist'
    );

    // Verify each group has 4 players
    Object.keys(groups).forEach(groupName => {
      this.assert(
        groups[groupName].length === 4,
        `Playoff Advancement: Group ${groupName} has 4 players`
      );
    });

    // Verify top 2 from each group = 8 total advancing
    const advancing = [];
    Object.keys(groups).forEach(groupName => {
      advancing.push(...groups[groupName].slice(0, 2));
    });

    this.assert(
      advancing.length === 8,
      `Playoff Advancement: 8 players advance to playoffs`
    );
  },

  /**
   * Test 7: Invalid Configurations Rejected
   */
  testInvalidConfigurationsRejected() {
    console.log('\n=== TEST 7: Invalid Configurations Rejected ===');

    const format = new GroupStageFormat();
    const players = this.generatePlayers(16);

    // Test: Too many advancing (not power of 2)
    const invalidConfig1 = {
      numGroups: 3,
      playersPerGroup: 5,
      advancingPerGroup: 2, // 3*2 = 6 (not power of 2)
      currentStage: 'groups'
    };

    const validation1 = format.validateConfig(invalidConfig1, 16);
    this.assert(
      !validation1.isValid,
      'Invalid config rejected: 6 advancing (not power of 2)'
    );

    // Test: More than 50% advance
    const invalidConfig2 = {
      numGroups: 4,
      playersPerGroup: 4,
      advancingPerGroup: 3, // 75% advance
      currentStage: 'groups'
    };

    const validation2 = format.validateConfig(invalidConfig2, 16);
    this.assert(
      !validation2.isValid,
      'Invalid config rejected: 75% advancing (over 50% limit)'
    );

    // Test: Valid configuration
    const validConfig = {
      numGroups: 4,
      playersPerGroup: 4,
      advancingPerGroup: 2, // 4*2 = 8 (power of 2, 50% advance)
      currentStage: 'groups'
    };

    const validation3 = format.validateConfig(validConfig, 16);
    this.assert(
      validation3.isValid,
      'Valid config accepted: 8 advancing (power of 2, 50% advance)'
    );
  },

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🧪 Starting Tournament Structure Tests...\n');
    this.testResults = [];

    try {
      this.testGroupStageAllConfigurations();
      this.testSingleEliminationAllCounts();
      this.testDoubleEliminationAllCounts();
      this.testSwissFormat();
      this.testRoundRobin();
      await this.testPlayoffAdvancement();
      this.testInvalidConfigurationsRejected();
    } catch (error) {
      console.error('Test execution error:', error);
      this.testResults.push({
        pass: false,
        message: `❌ Test execution error: ${error.message}`
      });
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    const passed = this.testResults.filter(r => r.pass).length;
    const failed = this.testResults.filter(r => !r.pass).length;
    const total = this.testResults.length;

    console.log(`\n📊 Test Summary: ${passed}/${total} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('✅ All tests passed!');
    } else {
      console.log('❌ Some tests failed. Review the output above.');
      console.log('\nFailed tests:');
      this.testResults.filter(r => !r.pass).forEach(r => {
        console.log(`  ${r.message}`);
      });
    }

    return {
      passed,
      failed,
      total,
      results: this.testResults
    };
  }
};

// Auto-run tests if this file is loaded
if (typeof window !== 'undefined') {
  console.log('Tournament structure tests loaded. Run TournamentStructureTests.runAll() to execute tests.');
}
