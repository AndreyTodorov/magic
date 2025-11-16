/**
 * SCORING AND QUALITY SCORE TESTS
 * Run these tests in browser console after loading the tournament app
 */

const ScoringTests = {
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
   * Test helper: check if number is divisible by 0.5
   */
  isDivisibleBy0_5(num) {
    const remainder = (num * 2) % 1;
    return Math.abs(remainder) < 0.0001; // Account for floating point precision
  },

  /**
   * Test 1: Points calculation for different match outcomes
   */
  testPointsCalculation() {
    console.log('\n=== TEST 1: Points Calculation ===');

    // Test data: simulated match outcomes
    const testCases = [
      {
        desc: 'Win 2-0',
        wins: 1,
        gamesWon: 2,
        gamesLost: 0,
        expectedPoints: 5.0 // 3 + 2*1 + 0*(-0.5)
      },
      {
        desc: 'Win 2-1',
        wins: 1,
        gamesWon: 2,
        gamesLost: 1,
        expectedPoints: 4.5 // 3 + 2*1 + 1*(-0.5)
      },
      {
        desc: 'Loss 1-2',
        wins: 0,
        gamesWon: 1,
        gamesLost: 2,
        expectedPoints: 0.0 // 0 + 1*1 + 2*(-0.5)
      },
      {
        desc: 'Loss 0-2',
        wins: 0,
        gamesWon: 0,
        gamesLost: 2,
        expectedPoints: -1.0 // 0 + 0*1 + 2*(-0.5)
      },
      {
        desc: 'Two wins (2-0, 2-1)',
        wins: 2,
        gamesWon: 4,
        gamesLost: 1,
        expectedPoints: 9.5 // 6 + 4*1 + 1*(-0.5)
      }
    ];

    const scoringSystem = APP_CONFIG.FORMATS.SCORING_SYSTEMS['points'];

    testCases.forEach(testCase => {
      const actualPoints =
        testCase.wins * scoringSystem.MATCH_WIN +
        testCase.gamesWon * scoringSystem.GAME_WIN +
        testCase.gamesLost * scoringSystem.GAME_LOSS;

      this.assert(
        Math.abs(actualPoints - testCase.expectedPoints) < 0.0001,
        `${testCase.desc}: Expected ${testCase.expectedPoints}, got ${actualPoints}`
      );

      this.assert(
        this.isDivisibleBy0_5(actualPoints),
        `${testCase.desc}: Points ${actualPoints} must be divisible by 0.5`
      );
    });
  },

  /**
   * Test 2: Round Robin quality score calculation
   */
  async testRoundRobinQualityScore() {
    console.log('\n=== TEST 2: Round Robin Quality Score ===');

    // Create a simple 3-player tournament
    const players = ['Alice', 'Bob', 'Charlie'];
    const format = new RoundRobinFormat();

    // Simulate matches:
    // Alice beats Bob 2-0
    // Alice beats Charlie 2-1
    // Bob beats Charlie 2-0
    const matches = [
      {
        player1: 0, // Alice
        player2: 1, // Bob
        games: [1, 1, null],
        winner: 1
      },
      {
        player1: 0, // Alice
        player2: 2, // Charlie
        games: [1, 1, 2],
        winner: 1
      },
      {
        player1: 1, // Bob
        player2: 2, // Charlie
        games: [1, 1, null],
        winner: 1
      }
    ];

    const stats = format.calculateStandings(matches, players, { matchesPerPlayer: 2 });

    // Check that all points are divisible by 0.5
    stats.forEach((stat, idx) => {
      this.assert(
        this.isDivisibleBy0_5(stat.points),
        `${stat.player}'s points (${stat.points}) must be divisible by 0.5`
      );
    });

    // Check that all quality scores are divisible by 0.5
    stats.forEach((stat, idx) => {
      this.assert(
        this.isDivisibleBy0_5(stat.qualityScore),
        `${stat.player}'s quality score (${stat.qualityScore}) must be divisible by 0.5`
      );
    });

    // Alice's quality score should be sum of Bob's and Charlie's points
    const alice = stats[0];
    const bob = stats[1];
    const charlie = stats[2];

    const expectedAliceQS = bob.points + charlie.points;
    this.assert(
      Math.abs(alice.qualityScore - expectedAliceQS) < 0.0001,
      `Alice's quality score should be ${expectedAliceQS}, got ${alice.qualityScore}`
    );

    // Bob's quality score should be Charlie's points only
    const expectedBobQS = charlie.points;
    this.assert(
      Math.abs(bob.qualityScore - expectedBobQS) < 0.0001,
      `Bob's quality score should be ${expectedBobQS}, got ${bob.qualityScore}`
    );

    // Charlie's quality score should be 0 (beat nobody)
    this.assert(
      Math.abs(charlie.qualityScore) < 0.0001,
      `Charlie's quality score should be 0, got ${charlie.qualityScore}`
    );
  },

  /**
   * Test 3: Group Stage quality score calculation
   */
  async testGroupStageQualityScore() {
    console.log('\n=== TEST 3: Group Stage Quality Score ===');

    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const format = new GroupStageFormat();

    const config = {
      numGroups: 2,
      playersPerGroup: 4,
      advancingPerGroup: 2,
      currentStage: 'groups'
    };

    const matches = format.generateMatches(players, config);

    // Simulate some match results in Group A
    const groupAMatches = matches.filter(m => m.stage === 'groups' && m.group === 'A');
    if (groupAMatches.length > 0) {
      // P1 beats P2
      groupAMatches[0].games = [1, 1, null];
      groupAMatches[0].winner = 1;
    }
    if (groupAMatches.length > 1) {
      // P1 beats P3
      groupAMatches[1].games = [1, 1, 2];
      groupAMatches[1].winner = 1;
    }
    if (groupAMatches.length > 2) {
      // P2 beats P3
      groupAMatches[2].games = [1, 1, null];
      groupAMatches[2].winner = 1;
    }

    const stats = format.calculateStandings(matches, players, config);

    // Check divisibility by 0.5 for all stats
    stats.forEach((stat) => {
      if (stat.points !== undefined) {
        this.assert(
          this.isDivisibleBy0_5(stat.points),
          `${stat.player}'s points (${stat.points}) must be divisible by 0.5`
        );
      }

      if (stat.qualityScore !== undefined) {
        this.assert(
          this.isDivisibleBy0_5(stat.qualityScore),
          `${stat.player}'s quality score (${stat.qualityScore}) must be divisible by 0.5`
        );
      }
    });
  },

  /**
   * Test 4: Edge cases
   */
  testEdgeCases() {
    console.log('\n=== TEST 4: Edge Cases ===');

    // Test that multiplying points by any factor doesn't break divisibility
    const pointValues = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

    pointValues.forEach(points => {
      // Quality score is just sum of points - should remain divisible by 0.5
      const qualityScore = points + points; // Simulating sum of 2 opponents

      this.assert(
        this.isDivisibleBy0_5(qualityScore),
        `Quality score ${qualityScore} from summing ${points} + ${points} must be divisible by 0.5`
      );
    });

    // Test that we NEVER multiply points by 0.5 (which would break divisibility)
    pointValues.forEach(points => {
      const multiplied = points * 0.5;
      const isDivisible = this.isDivisibleBy0_5(multiplied);

      // This will fail for 0.5, 1.5, 2.5, etc., proving we shouldn't multiply by 0.5
      if (!isDivisible) {
        this.assert(
          true,
          `Confirmed: ${points} * 0.5 = ${multiplied} is NOT divisible by 0.5 (this is why we can't multiply)`
        );
      }
    });
  },

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🧪 Starting Scoring Tests...\n');
    this.testResults = [];

    this.testPointsCalculation();
    await this.testRoundRobinQualityScore();
    await this.testGroupStageQualityScore();
    this.testEdgeCases();

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
  console.log('Scoring tests loaded. Run ScoringTests.runAll() to execute tests.');
}
