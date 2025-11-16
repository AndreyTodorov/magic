/**
 * TOURNAMENT FORMATS MODULE
 * Base classes and implementations for different tournament formats
 */

/**
 * Tournament Format Types
 */
const TOURNAMENT_FORMATS = {
  ROUND_ROBIN: 'round-robin',
  SWISS: 'swiss',
  SINGLE_ELIMINATION: 'single-elimination',
  DOUBLE_ELIMINATION: 'double-elimination',
  GROUP_STAGE: 'group-stage',
};

/**
 * Base class for all tournament formats
 * Defines the interface that all format implementations must follow
 */
class TournamentFormatBase {
  constructor() {
    this.formatType = null;
    this.formatName = null;
    this.description = null;
    this.minPlayers = 2;
    this.maxPlayers = 100;
    this.supportsMultiStage = false;
  }

  /**
   * Validate if the player count is valid for this format
   * @param {number} numPlayers - Number of players
   * @returns {Object} { isValid: boolean, error?: string, warning?: string }
   */
  validatePlayerCount(numPlayers) {
    if (numPlayers < this.minPlayers) {
      return {
        isValid: false,
        error: `${this.formatName} requires at least ${this.minPlayers} players`,
      };
    }
    if (numPlayers > this.maxPlayers) {
      return {
        isValid: false,
        error: `${this.formatName} supports maximum ${this.maxPlayers} players`,
      };
    }
    return { isValid: true };
  }

  /**
   * Validate format-specific configuration
   * @param {Object} config - Format configuration
   * @param {number} numPlayers - Number of players
   * @returns {Object} { isValid: boolean, error?: string }
   */
  validateConfig(config, numPlayers) {
    return { isValid: true };
  }

  /**
   * Get default configuration for this format
   * @param {number} numPlayers - Number of players
   * @returns {Object} Default configuration
   */
  getDefaultConfig(numPlayers) {
    return {};
  }

  /**
   * Generate match structure for this format
   * @param {Array<string>} players - Player names
   * @param {Object} config - Format configuration
   * @returns {Array<Object>} Array of match objects
   */
  generateMatches(players, config) {
    throw new Error('generateMatches must be implemented by subclass');
  }

  /**
   * Calculate standings for this format
   * @param {Array<Object>} matches - Match data
   * @param {Array<string>} players - Player names
   * @param {Object} config - Format configuration
   * @returns {Array<Object>} Player statistics and rankings
   */
  calculateStandings(matches, players, config) {
    throw new Error('calculateStandings must be implemented by subclass');
  }

  /**
   * Get the next stage in multi-stage tournaments
   * @param {string} currentStage - Current stage name
   * @param {Object} tournamentData - Current tournament data
   * @returns {string|null} Next stage name or null if tournament is complete
   */
  getNextStage(currentStage, tournamentData) {
    return null; // Single-stage formats return null
  }

  /**
   * Check if current stage is complete
   * @param {Array<Object>} matches - Match data for current stage
   * @returns {boolean} True if all matches are complete
   */
  isStageComplete(matches) {
    if (!matches || matches.length === 0) return false;
    return matches.every((m) => m.winner !== null);
  }

  /**
   * Get format metadata for UI display
   * @returns {Object} Format information
   */
  getFormatInfo() {
    return {
      type: this.formatType,
      name: this.formatName,
      description: this.description,
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
      supportsMultiStage: this.supportsMultiStage,
      icon: this.getFormatIcon(),
    };
  }

  /**
   * Get emoji/icon for this format
   * @returns {string} Icon representation
   */
  getFormatIcon() {
    return '🎲';
  }

  /**
   * Get recommended player counts
   * @returns {Array<number>} Array of recommended player counts
   */
  getRecommendedPlayerCounts() {
    return [];
  }

  /**
   * Get default/optimal player count for this format
   * @returns {number} Default player count
   */
  getDefaultPlayerCount() {
    const recommended = this.getRecommendedPlayerCounts();
    if (recommended.length > 0) {
      return recommended[0]; // First recommended is usually the best default
    }
    return APP_CONFIG.DEFAULT_PLAYERS;
  }
}

/**
 * Round Robin Format Implementation
 * Current implementation - everyone plays a fixed number of matches
 */
class RoundRobinFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.ROUND_ROBIN;
    this.formatName = 'Round Robin';
    this.description = 'Everyone plays everyone else (or a fixed number of matches)';
    this.minPlayers = APP_CONFIG.MIN_PLAYERS;
    this.maxPlayers = APP_CONFIG.MAX_PLAYERS;
  }

  getFormatIcon() {
    return '📊';
  }

  getRecommendedPlayerCounts() {
    return [4, 6, 7, 8];
  }

  getDefaultPlayerCount() {
    return 8; // 8 players is ideal for round robin tournaments
  }

  getDefaultConfig(numPlayers) {
    // Get first valid matches-per-player option
    const validOptions = this.getValidMatchesPerPlayer(numPlayers);
    return {
      matchesPerPlayer: validOptions[0] || 3,
    };
  }

  /**
   * Generate valid matches-per-player options
   * Rule: (players × matches) must be even
   */
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

  validateConfig(config, numPlayers) {
    if (!config.matchesPerPlayer) {
      return { isValid: false, error: 'Matches per player is required' };
    }

    const validOptions = this.getValidMatchesPerPlayer(numPlayers);
    if (!validOptions.includes(config.matchesPerPlayer)) {
      return {
        isValid: false,
        error: `Invalid matches per player. Valid options: ${validOptions.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  generateMatches(players, config) {
    const numPlayers = players.length;
    const matchesPerPlayer = config.matchesPerPlayer;
    const matchCount = Array(numPlayers).fill(0);
    const selectedMatches = [];
    const targetMatches = (numPlayers * matchesPerPlayer) / 2;

    // Generate all possible pairings
    const allPossibleMatches = [];
    for (let i = 0; i < numPlayers; i++) {
      for (let j = i + 1; j < numPlayers; j++) {
        allPossibleMatches.push([i, j]);
      }
    }

    // Shuffle for randomization
    this.shuffleArray(allPossibleMatches);

    let attempts = 0;
    const maxAttempts = 1000;

    while (selectedMatches.length < targetMatches && attempts < maxAttempts) {
      attempts++;

      for (const [p1, p2] of allPossibleMatches) {
        if (selectedMatches.length >= targetMatches) break;

        // Check if both players haven't exceeded quota
        if (
          matchCount[p1] < matchesPerPlayer &&
          matchCount[p2] < matchesPerPlayer
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

      // Retry with reshuffling if needed
      if (selectedMatches.length < targetMatches && attempts < maxAttempts) {
        selectedMatches.length = 0;
        matchCount.fill(0);
        this.shuffleArray(allPossibleMatches);
      }
    }

    // Convert to match objects
    return selectedMatches.map((match, index) => ({
      id: index,
      player1: match[0],
      player2: match[1],
      games: [null, null, null],
      winner: null,
    }));
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  calculateStandings(matches, players, config) {
    if (!matches || !Array.isArray(matches)) {
      return [];
    }

    const stats = players.map((player, index) => {
      const playerMatches = matches.filter(
        (m) => m.player1 === index || m.player2 === index
      );

      let wins = 0,
        losses = 0,
        gamesWon = 0,
        gamesLost = 0;
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

      // Scoring: Match Win (+3), Game Won (+1), Game Lost (-0.5)
      const scoringSystem = APP_CONFIG.FORMATS.SCORING_SYSTEMS['points'];
      const points =
        wins * scoringSystem.MATCH_WIN +
        gamesWon * scoringSystem.GAME_WIN +
        gamesLost * scoringSystem.GAME_LOSS;

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

    // Calculate quality scores (opponent strength)
    stats.forEach((stat, index) => {
      stat.qualityScore = this.calculateQualityScore(index, stats);
    });

    return stats;
  }

  /**
   * Calculate quality score for a player based on opponents beaten
   * Quality score = sum of beaten opponents' points
   */
  calculateQualityScore(playerIndex, allStats) {
    const stat = allStats[playerIndex];
    let qualityScore = 0;

    // Add points from each opponent beaten
    stat.opponents.beaten.forEach((oppIndex) => {
      qualityScore += allStats[oppIndex].points;
    });

    return qualityScore;
  }
}

/**
 * Swiss Format Implementation
 * Pairs players with similar records each round
 */
class SwissFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.SWISS;
    this.formatName = 'Swiss Tournament';
    this.description = 'Pair players with similar records each round';
    this.minPlayers = 8;
    this.maxPlayers = 64;
  }

  getFormatIcon() {
    return '🔄';
  }

  validatePlayerCount(numPlayers) {
    // Call base validation first
    const baseValidation = super.validatePlayerCount(numPlayers);
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Require even player counts (no BYEs allowed in Swiss)
    if (numPlayers % 2 === 1) {
      return {
        isValid: false,
        error: `Swiss format requires an even number of players to avoid BYE rounds. Recommended counts: ${this.getRecommendedPlayerCounts().join(', ')}`
      };
    }

    return { isValid: true };
  }

  getRecommendedPlayerCounts() {
    return [8, 16, 32, 64];
  }

  getDefaultConfig(numPlayers) {
    // Default rounds: ceil(log2(players))
    const defaultRounds = Math.ceil(Math.log2(numPlayers));
    return {
      rounds: Math.min(defaultRounds, 7),
      allowDraws: false, // Magic doesn't typically allow draws, but Swiss can support it
    };
  }

  validateConfig(config, numPlayers) {
    if (!config.rounds || config.rounds < 1) {
      return { isValid: false, error: 'At least 1 round is required' };
    }
    if (config.rounds > 10) {
      return { isValid: false, error: 'Maximum 10 rounds allowed' };
    }
    return { isValid: true };
  }

  /**
   * Generate all matches for Swiss tournament
   * Note: In a real implementation, Swiss rounds are generated dynamically
   * after each round completes. For now, we'll pre-generate round 1 and
   * placeholder structures for future rounds.
   */
  generateMatches(players, config) {
    const numPlayers = players.length;
    const numRounds = config.rounds;
    const matches = [];
    let matchId = 0;

    // Generate Round 1: Random pairings
    const round1Pairings = this.generateRound1Pairings(numPlayers);

    for (const [p1, p2] of round1Pairings) {
      matches.push({
        id: matchId++,
        round: 1,
        player1: p1,
        player2: p2 === null ? null : p2, // null = BYE
        games: [null, null, null],
        winner: null,
        isBye: p2 === null,
      });
    }

    // For subsequent rounds, create placeholder matches that will be
    // populated when previous round completes
    // Need enough slots for all players (numPlayers / 2, rounded up for odd)
    const matchesPerRound = Math.ceil(numPlayers / 2);

    for (let round = 2; round <= numRounds; round++) {
      for (let i = 0; i < matchesPerRound; i++) {
        matches.push({
          id: matchId++,
          round: round,
          player1: null,
          player2: null,
          games: [null, null, null],
          winner: null,
          isPlaceholder: true,
        });
      }
    }

    return matches;
  }

  /**
   * Generate round 1 pairings (random)
   * @param {number} numPlayers - Number of players
   * @returns {Array<Array<number>>} Array of [player1Index, player2Index] pairs
   */
  generateRound1Pairings(numPlayers) {
    const playerIndices = Array.from({ length: numPlayers }, (_, i) => i);
    this.shuffleArray(playerIndices);

    const pairings = [];
    for (let i = 0; i < playerIndices.length; i += 2) {
      if (i + 1 < playerIndices.length) {
        pairings.push([playerIndices[i], playerIndices[i + 1]]);
      } else {
        // Odd number of players - give last player a BYE
        pairings.push([playerIndices[i], null]);
      }
    }

    return pairings;
  }

  /**
   * Generate pairings for a Swiss round based on standings
   * @param {Array<Object>} standings - Current standings
   * @param {Array<Array<number>>} previousPairings - All previous pairings to avoid repeats
   * @returns {Array<Array<number>>} Array of [player1Index, player2Index] pairs
   */
  generateSwissRoundPairings(standings, previousPairings) {
    const numPlayers = standings.length;
    const paired = new Set();
    const pairings = [];

    // Create a set of previous matchups for quick lookup
    const previousMatchups = new Set();
    previousPairings.forEach(([p1, p2]) => {
      if (p2 !== null) {
        const key = [p1, p2].sort().join('-');
        previousMatchups.add(key);
      }
    });

    // Group players by points (match wins)
    const pointGroups = {};
    standings.forEach((player) => {
      const points = player.wins;
      if (!pointGroups[points]) {
        pointGroups[points] = [];
      }
      pointGroups[points].push(player.playerIndex);
    });

    // Sort point groups from highest to lowest
    const sortedPoints = Object.keys(pointGroups)
      .map(Number)
      .sort((a, b) => b - a);

    // Track players who need opponents
    let unpaired = [];

    // Pair within each point group, carrying down unpaired players
    for (const points of sortedPoints) {
      const group = [...unpaired, ...pointGroups[points]];
      unpaired = [];

      while (group.length > 0) {
        const p1 = group.shift();
        if (paired.has(p1)) continue;

        // Find best opponent in remaining group
        let foundOpponent = false;
        for (let i = 0; i < group.length; i++) {
          const p2 = group[i];
          if (paired.has(p2)) continue;

          const matchupKey = [p1, p2].sort().join('-');
          if (!previousMatchups.has(matchupKey)) {
            // Valid pairing
            pairings.push([p1, p2]);
            paired.add(p1);
            paired.add(p2);
            group.splice(i, 1);
            foundOpponent = true;
            break;
          }
        }

        if (!foundOpponent) {
          // Couldn't pair in this group, carry down to next group
          unpaired.push(p1);
        }
      }
    }

    // Handle any remaining unpaired players
    if (unpaired.length > 0) {
      // If odd number, give bye to lowest-ranked unpaired player
      if (unpaired.length % 2 === 1) {
        const byePlayer = unpaired.pop();
        pairings.push([byePlayer, null]);
      }

      // Pair remaining (even if they've played before - necessary in small tournaments)
      while (unpaired.length >= 2) {
        pairings.push([unpaired.shift(), unpaired.shift()]);
      }
    }

    return pairings;
  }

  /**
   * Fisher-Yates shuffle
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Calculate standings for Swiss format
   * Primary: Match wins
   * Tiebreakers: OMW% (Opponent Match Win %), GW%, OGW%
   */
  calculateStandings(matches, players, config) {
    // Initialize stats
    const stats = players.map((player, index) => ({
      player,
      playerIndex: index,
      wins: 0,
      losses: 0,
      draws: 0,
      gamesWon: 0,
      gamesLost: 0,
      matchesPlayed: 0,
      points: 0,
      opponents: { beaten: [], lostTo: [] },
      allOpponents: [], // For OMW calculation
      byes: 0,
      qualityScore: 0,
    }));

    // Calculate basic stats
    matches.forEach((match) => {
      if (!match || match.isPlaceholder) return;

      // Handle BYE
      if (match.isBye) {
        stats[match.player1].wins++;
        stats[match.player1].byes++;
        stats[match.player1].matchesPlayed++;
        stats[match.player1].points += 3; // Bye = automatic win
        return;
      }

      if (match.winner === null) return; // Match not complete

      const p1 = match.player1;
      const p2 = match.player2;

      // Track all opponents (for OMW calculation)
      stats[p1].allOpponents.push(p2);
      stats[p2].allOpponents.push(p1);

      // Count games
      if (match.games) {
        match.games.forEach((game) => {
          if (game === 1) {
            stats[p1].gamesWon++;
            stats[p2].gamesLost++;
          } else if (game === 2) {
            stats[p2].gamesWon++;
            stats[p1].gamesLost++;
          }
        });
      }

      // Match results
      if (match.winner === 1) {
        stats[p1].wins++;
        stats[p2].losses++;
        stats[p1].points += 3;
        stats[p1].opponents.beaten.push(p2);
        stats[p2].opponents.lostTo.push(p1);
      } else if (match.winner === 2) {
        stats[p2].wins++;
        stats[p1].losses++;
        stats[p2].points += 3;
        stats[p2].opponents.beaten.push(p1);
        stats[p1].opponents.lostTo.push(p2);
      }

      stats[p1].matchesPlayed++;
      stats[p2].matchesPlayed++;
    });

    // Calculate tiebreakers
    stats.forEach((stat) => {
      // Opponent Match Win % (OMW)
      let opponentWins = 0;
      let opponentMatches = 0;
      stat.allOpponents.forEach((oppIndex) => {
        const opp = stats[oppIndex];
        opponentWins += opp.wins;
        opponentMatches += opp.matchesPlayed;
      });
      stat.omw = opponentMatches > 0 ? opponentWins / opponentMatches : 0;
      stat.qualityScore = opponentWins; // Use opponent wins as quality score

      // Game Win %
      const totalGames = stat.gamesWon + stat.gamesLost;
      stat.gwp = totalGames > 0 ? stat.gamesWon / totalGames : 0;

      // Opponent Game Win % (OGW)
      let opponentGamesWon = 0;
      let opponentTotalGames = 0;
      stat.allOpponents.forEach((oppIndex) => {
        const opp = stats[oppIndex];
        opponentGamesWon += opp.gamesWon;
        opponentTotalGames += opp.gamesWon + opp.gamesLost;
      });
      stat.ogw = opponentTotalGames > 0 ? opponentGamesWon / opponentTotalGames : 0;
    });

    return stats;
  }
}

/**
 * Single Elimination Format Implementation
 * Traditional bracket - lose once and you're eliminated
 */
class SingleEliminationFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.SINGLE_ELIMINATION;
    this.formatName = 'Single Elimination';
    this.description = 'Traditional bracket tournament - lose once and you\'re out';
    this.minPlayers = 2;
    this.maxPlayers = 64;
  }

  getFormatIcon() {
    return '🏆';
  }

  validatePlayerCount(numPlayers) {
    // Call base validation first
    const baseValidation = super.validatePlayerCount(numPlayers);
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // MUST be power of 2 (no BYEs allowed)
    const isPowerOf2 = numPlayers > 0 && (numPlayers & (numPlayers - 1)) === 0;
    if (!isPowerOf2) {
      const recommended = this.getRecommendedPlayerCounts()
        .filter(n => n >= numPlayers && n <= 64)
        .slice(0, 3)
        .join(', ');
      return {
        isValid: false,
        error: `Single Elimination requires exactly 2, 4, 8, 16, 32, or 64 players (power of 2). Recommended: ${recommended}`
      };
    }

    return { isValid: true };
  }

  getRecommendedPlayerCounts() {
    return [4, 8, 16, 32, 64];
  }

  getDefaultPlayerCount() {
    return 8; // 8 players creates a perfect 3-round bracket
  }

  getDefaultConfig(numPlayers) {
    return {
      seedingMethod: 'random', // 'random' or 'seeded'
      thirdPlaceMatch: false,  // Add 3rd place consolation match
    };
  }

  validateConfig(config, numPlayers) {
    if (numPlayers < 2) {
      return { isValid: false, error: 'At least 2 players required' };
    }
    return { isValid: true };
  }

  /**
   * Get next power of 2 >= n
   */
  nextPowerOf2(n) {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  /**
   * Generate single elimination bracket
   */
  generateMatches(players, config) {
    const numPlayers = players.length;
    const bracketSize = this.nextPowerOf2(numPlayers);
    const numByes = bracketSize - numPlayers;
    const numRounds = Math.log2(bracketSize);

    // Seed players
    const seeding = this.seedPlayers(numPlayers, config.seedingMethod);

    const matches = [];
    let matchId = 0;

    // Calculate which positions get byes
    // Byes go to top seeds
    const byePositions = new Set();
    for (let i = 0; i < numByes; i++) {
      byePositions.add(i);
    }

    // Build bracket structure
    // We'll build it round by round
    const roundMatches = {}; // round -> [matchIds]

    // Round 1
    roundMatches[1] = [];
    const round1Pairings = [];

    for (let i = 0; i < bracketSize / 2; i++) {
      const topSeed = seeding[i * 2];
      const bottomSeed = seeding[i * 2 + 1];

      // Check if this match has a bye
      const topHasBye = byePositions.has(i * 2);
      const bottomHasBye = byePositions.has(i * 2 + 1);

      if (topHasBye || bottomHasBye) {
        // One player gets a bye - they auto-advance
        const advancingPlayer = topHasBye ? bottomSeed : topSeed;
        round1Pairings.push({
          player1: advancingPlayer,
          player2: null,
          isBye: true,
          winner: 1, // Auto-win
        });
      } else {
        // Normal match
        round1Pairings.push({
          player1: topSeed,
          player2: bottomSeed,
          isBye: false,
          winner: null,
        });
      }
    }

    // Create round 1 matches
    round1Pairings.forEach((pairing, index) => {
      const match = {
        id: matchId,
        round: 1,
        bracketPosition: `R1-M${index + 1}`,
        player1: pairing.player1,
        player2: pairing.player2,
        games: [null, null, null],
        winner: pairing.winner,
        isBye: pairing.isBye,
        feedsInto: null, // Will set after creating all matches
      };
      roundMatches[1].push(matchId);
      matches.push(match);
      matchId++;
    });

    // Create subsequent rounds (placeholders until previous round completes)
    for (let round = 2; round <= numRounds; round++) {
      roundMatches[round] = [];
      const matchesInRound = Math.pow(2, numRounds - round);

      for (let i = 0; i < matchesInRound; i++) {
        const match = {
          id: matchId,
          round: round,
          bracketPosition: `R${round}-M${i + 1}`,
          player1: null,
          player2: null,
          games: [null, null, null],
          winner: null,
          isBye: false,
          isPlaceholder: true,
          feedsFrom: [], // Will populate from previous round
          feedsInto: null,
        };
        roundMatches[round].push(matchId);
        matches.push(match);
        matchId++;
      }
    }

    // Set up feedsInto relationships
    for (let round = 1; round < numRounds; round++) {
      const currentRoundMatches = roundMatches[round];
      const nextRoundMatches = roundMatches[round + 1];

      currentRoundMatches.forEach((matchId, index) => {
        const match = matches[matchId];
        const nextMatchIndex = Math.floor(index / 2);
        match.feedsInto = nextRoundMatches[nextMatchIndex];

        // Set feedsFrom in next round
        const nextMatch = matches[nextRoundMatches[nextMatchIndex]];
        if (!nextMatch.feedsFrom) nextMatch.feedsFrom = [];
        nextMatch.feedsFrom.push(matchId);
      });
    }

    // Third place match (optional)
    if (config.thirdPlaceMatch && numPlayers >= 4) {
      const finalsRound = numRounds;
      const semiFinalMatches = roundMatches[finalsRound - 1];

      matches.push({
        id: matchId,
        round: finalsRound,
        bracketPosition: `3rd-Place`,
        player1: null,
        player2: null,
        games: [null, null, null],
        winner: null,
        isBye: false,
        isPlaceholder: true,
        isThirdPlace: true,
        feedsFrom: semiFinalMatches, // Losers from semi-finals
      });
    }

    return matches;
  }

  /**
   * Seed players for bracket
   * @param {number} numPlayers - Number of players
   * @param {string} method - 'random' or 'seeded'
   * @returns {Array<number>} Array of player indices in seeded order
   */
  seedPlayers(numPlayers, method) {
    const indices = Array.from({ length: numPlayers }, (_, i) => i);

    if (method === 'random') {
      // Shuffle randomly
      this.shuffleArray(indices);
    }
    // else: keep in order (seeded 1, 2, 3, ...)

    // Standard bracket seeding (1 vs lowest, 2 vs 2nd lowest, etc.)
    // For a 4-player bracket: [0, 3, 1, 2] -> 0v3, 1v2
    // For an 8-player bracket: [0, 7, 3, 4, 1, 6, 2, 5]
    return this.applyBracketSeeding(indices);
  }

  /**
   * Apply standard bracket seeding pattern
   * 1 vs lowest seed, 2 vs 2nd-lowest, etc.
   */
  applyBracketSeeding(seeds) {
    const n = seeds.length;
    const bracketSize = this.nextPowerOf2(n);

    // Pad with nulls if needed
    while (seeds.length < bracketSize) {
      seeds.push(null);
    }

    // Standard bracket order
    const ordered = [];
    const rounds = Math.log2(bracketSize);

    // Build the bracket order recursively
    const buildOrder = (start, end, depth) => {
      if (depth === 0) {
        ordered.push(seeds[start]);
        return;
      }

      const mid = Math.floor((start + end) / 2);
      buildOrder(start, mid, depth - 1);
      buildOrder(mid + 1, end, depth - 1);
    };

    // Alternative simpler approach: interleave top and bottom halves
    // [0, n-1, 1, n-2, 2, n-3, ...]
    for (let i = 0; i < bracketSize / 2; i++) {
      ordered.push(seeds[i]);
      ordered.push(seeds[bracketSize - 1 - i]);
    }

    return ordered.filter((s) => s !== null);
  }

  /**
   * Fisher-Yates shuffle
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Calculate standings for single elimination
   * Standings are based on how far players progressed
   */
  calculateStandings(matches, players, config) {
    const stats = players.map((player, index) => ({
      player,
      playerIndex: index,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      roundEliminated: null, // Which round they were eliminated (null = still in)
      finalPosition: null, // 1st, 2nd, 3rd-4th, 5th-8th, etc.
      matchesPlayed: 0,
      opponents: { beaten: [], lostTo: [] },
      // No points or qualityScore for elimination formats - ranking is by bracket position
    }));

    // Track which round each player was eliminated
    matches.forEach((match) => {
      if (!match || match.isPlaceholder) return;
      if (match.isBye) {
        stats[match.player1].wins++;
        stats[match.player1].matchesPlayed++;
        return;
      }
      if (match.winner === null) return;

      const p1 = match.player1;
      const p2 = match.player2;

      // Count games
      if (match.games) {
        match.games.forEach((game) => {
          if (game === 1) {
            stats[p1].gamesWon++;
            stats[p2].gamesLost++;
          } else if (game === 2) {
            stats[p2].gamesWon++;
            stats[p1].gamesLost++;
          }
        });
      }

      // Determine winner/loser
      const winner = match.winner === 1 ? p1 : p2;
      const loser = match.winner === 1 ? p2 : p1;

      stats[winner].wins++;
      stats[loser].losses++;
      stats[winner].matchesPlayed++;
      stats[loser].matchesPlayed++;

      // Track opponents
      stats[winner].opponents.beaten.push(loser);
      stats[loser].opponents.lostTo.push(winner);

      // Mark elimination round for loser
      if (stats[loser].roundEliminated === null) {
        stats[loser].roundEliminated = match.round;
      }
    });

    // Calculate final positions based on elimination round
    // Later rounds = better placement
    const maxRound = Math.max(...matches.map((m) => m.round || 0));

    stats.forEach((stat) => {
      if (stat.roundEliminated === null) {
        // Still in tournament (or won)
        stat.finalPosition = stat.wins > 0 ? 1 : null;
      } else {
        // Position based on when eliminated
        // Round 1 elimination = last place range
        const playersInRound = Math.pow(2, maxRound - stat.roundEliminated + 1);
        stat.finalPosition = playersInRound / 2 + 1; // e.g., eliminated in semis = 3rd-4th
      }

      // No points in elimination formats - ranking is by bracket position only
    });

    return stats;
  }
}

/**
 * Double Elimination Format Implementation
 * Losers get a second chance in the losers bracket
 *
 * Note: Full double elimination bracket routing is complex.
 * This is a simplified implementation that creates the structure
 * but dynamic routing would be implemented in Phase 5.
 */
class DoubleEliminationFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.DOUBLE_ELIMINATION;
    this.formatName = 'Double Elimination';
    this.description = 'Losers get a second chance in the losers bracket';
    this.minPlayers = 4;
    this.maxPlayers = 32;
  }

  getFormatIcon() {
    return '♻️';
  }

  validatePlayerCount(numPlayers) {
    // Call base validation first
    const baseValidation = super.validatePlayerCount(numPlayers);
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // MUST be power of 2 (no BYEs allowed)
    const isPowerOf2 = numPlayers > 0 && (numPlayers & (numPlayers - 1)) === 0;
    if (!isPowerOf2) {
      const recommended = this.getRecommendedPlayerCounts()
        .filter(n => n >= numPlayers && n <= 32)
        .slice(0, 3)
        .join(', ');
      return {
        isValid: false,
        error: `Double Elimination requires exactly 4, 8, 16, or 32 players (power of 2). Recommended: ${recommended}`
      };
    }

    return { isValid: true };
  }

  getRecommendedPlayerCounts() {
    return [4, 8, 16, 32];
  }

  getDefaultPlayerCount() {
    return 8; // 8 players creates a manageable double elimination bracket
  }

  getDefaultConfig(numPlayers) {
    return {
      grandFinalReset: false, // If loser's bracket winner wins, reset bracket
      seedingMethod: 'random',
    };
  }

  validateConfig(config, numPlayers) {
    if (numPlayers < 4) {
      return { isValid: false, error: 'At least 4 players required for double elimination' };
    }
    return { isValid: true };
  }

  /**
   * Get next power of 2
   */
  nextPowerOf2(n) {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  /**
   * Generate double elimination bracket
   * Creates both winners and losers brackets
   */
  generateMatches(players, config) {
    const numPlayers = players.length;
    const bracketSize = this.nextPowerOf2(numPlayers);
    const winnerRounds = Math.log2(bracketSize);

    // Double elim losers bracket has 2*(winners_rounds - 1) rounds
    // (excludes the grand final which is separate)
    const loserRounds = 2 * (winnerRounds - 1);

    // Seed players
    const seeding = this.seedPlayers(numPlayers, config.seedingMethod);

    const matches = [];
    let matchId = 0;

    // Create Winners Bracket (same as single elimination)
    const winnersMatches = this.generateWinnersBracket(
      seeding,
      bracketSize,
      winnerRounds,
      matchId
    );
    matches.push(...winnersMatches);
    matchId += winnersMatches.length;

    // Create Losers Bracket (simplified - placeholders)
    // In a full implementation, we'd calculate exact losers bracket routing
    const losersMatches = this.generateLosersBracket(
      numPlayers,
      loserRounds,
      matchId
    );
    matches.push(...losersMatches);
    matchId += losersMatches.length;

    // Grand Finals
    matches.push({
      id: matchId++,
      round: winnerRounds + loserRounds,
      bracket: 'grand-finals',
      bracketPosition: 'Grand Finals',
      player1: null,
      player2: null,
      games: [null, null, null],
      winner: null,
      isPlaceholder: true,
      feedsFrom: ['winners-final', 'losers-final'],
    });

    // Grand Finals Reset (if enabled and losers bracket winner wins)
    if (config.grandFinalReset) {
      matches.push({
        id: matchId++,
        round: winnerRounds + loserRounds + 1,
        bracket: 'grand-finals',
        bracketPosition: 'Grand Finals Reset',
        player1: null,
        player2: null,
        games: [null, null, null],
        winner: null,
        isPlaceholder: true,
        isConditional: true, // Only played if losers bracket winner wins first GF
      });
    }

    // Set up feedsIntoWin and feedsIntoLoss relationships
    this.setupDoubleEliminationFeeds(matches, winnerRounds);

    return matches;
  }

  /**
   * Generate winners bracket (identical to single elimination)
   */
  generateWinnersBracket(seeding, bracketSize, numRounds, startMatchId) {
    const matches = [];
    let matchId = startMatchId;
    const roundMatches = {};

    // Round 1
    roundMatches[1] = [];
    for (let i = 0; i < bracketSize / 2; i++) {
      const p1 = seeding[i * 2] !== undefined ? seeding[i * 2] : null;
      const p2 = seeding[i * 2 + 1] !== undefined ? seeding[i * 2 + 1] : null;

      const isBye = p1 === null || p2 === null;

      matches.push({
        id: matchId,
        round: 1,
        bracket: 'winners',
        bracketPosition: `WB-R1-M${i + 1}`,
        player1: p1,
        player2: p2,
        games: [null, null, null],
        winner: isBye ? (p1 !== null ? 1 : 2) : null,
        isBye: isBye,
        feedsIntoWin: null, // Next winners bracket match
        feedsIntoLoss: null, // Losers bracket match
      });
      roundMatches[1].push(matchId);
      matchId++;
    }

    // Subsequent rounds (placeholders)
    for (let round = 2; round <= numRounds; round++) {
      roundMatches[round] = [];
      const matchesInRound = Math.pow(2, numRounds - round);

      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: matchId,
          round: round,
          bracket: 'winners',
          bracketPosition: `WB-R${round}-M${i + 1}`,
          player1: null,
          player2: null,
          games: [null, null, null],
          winner: null,
          isPlaceholder: true,
          feedsIntoWin: null,
          feedsIntoLoss: null,
        });
        roundMatches[round].push(matchId);
        matchId++;
      }
    }

    return matches;
  }

  /**
   * Generate losers bracket with proper match count
   * For 8 players: LR1=2, LR2=2, LR3=2, LR4=1, LR5=1 (6 matches)
   */
  generateLosersBracket(numPlayers, numRounds, startMatchId) {
    const matches = [];
    let matchId = startMatchId;

    // Start with losers from WR1 pairing up
    let matchesInRound = Math.floor(numPlayers / 4);

    for (let round = 1; round <= numRounds && matchesInRound >= 1; round++) {
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: matchId++,
          round: round,
          bracket: 'losers',
          bracketPosition: `LB-R${round}-M${i + 1}`,
          player1: null,
          player2: null,
          games: [null, null, null],
          winner: null,
          isPlaceholder: true,
          feedsIntoWin: null,
          feedsIntoLoss: null,
        });
      }

      // Losers bracket pattern:
      // - Even rounds (LR2, LR4, ...): Winners from previous round (halve)
      // - Odd rounds after R1 (LR3, LR5, ...): Merge LR winners + WB losers (maintain count)
      if (round === 1) {
        // LR2 = same count as LR1 (receives winners from LR1 + losers from WR2)
        // Don't change count yet
      } else if (round % 2 === 0) {
        // Even rounds: halve the count (advancing winners only)
        matchesInRound = Math.ceil(matchesInRound / 2);
      }
      // Odd rounds (after 1): maintain count for merging
    }

    return matches;
  }

  /**
   * Set up feedsIntoWin and feedsIntoLoss relationships for double elimination
   */
  setupDoubleEliminationFeeds(matches, winnerRounds) {
    // Organize matches by bracket and round
    const winnersMatches = {};
    const losersMatches = {};

    matches.forEach(match => {
      if (match.bracket === 'winners') {
        if (!winnersMatches[match.round]) winnersMatches[match.round] = [];
        winnersMatches[match.round].push(match);
      } else if (match.bracket === 'losers') {
        if (!losersMatches[match.round]) losersMatches[match.round] = [];
        losersMatches[match.round].push(match);
      }
    });

    // Set up winners bracket feeds
    for (let round = 1; round <= winnerRounds; round++) {
      const currentRound = winnersMatches[round] || [];
      const nextRound = winnersMatches[round + 1] || [];

      for (let i = 0; i < currentRound.length; i++) {
        const match = currentRound[i];

        // Winners advance to next round in winners bracket (if there is a next round)
        const nextMatchIndex = Math.floor(i / 2);
        if (nextRound[nextMatchIndex]) {
          match.feedsIntoWin = nextRound[nextMatchIndex].id;
        }

        // Losers drop to losers bracket
        // WR1 losers go to LR1 (first round of losers) with 2:1 mapping
        // WR2+ losers go to even losers rounds (LR2, LR4, etc.) with 1:1 mapping for merge rounds
        let loserRound;
        let loserMatchIndex;

        if (round === 1) {
          loserRound = 1;  // WR1 → LR1
          loserMatchIndex = Math.floor(i / 2);  // 2:1 mapping (4 WB matches → 2 LB matches)
        } else {
          loserRound = 2 * (round - 1);  // WR2 → LR2, WR3 → LR4, etc.
          loserMatchIndex = i;  // 1:1 mapping for merge rounds
        }

        if (losersMatches[loserRound] && losersMatches[loserRound][loserMatchIndex]) {
          match.feedsIntoLoss = losersMatches[loserRound][loserMatchIndex].id;
        }
      }
    }

    // Set up losers bracket internal feeds
    const loserRounds = Object.keys(losersMatches).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < loserRounds.length - 1; i++) {
      const round = loserRounds[i];
      const currentRound = losersMatches[round];
      const nextRound = losersMatches[loserRounds[i + 1]];

      if (!currentRound || !nextRound) continue;

      for (let j = 0; j < currentRound.length; j++) {
        const match = currentRound[j];

        // Determine mapping type:
        // - If next round has same number of matches: 1:1 mapping (merge rounds)
        // - If next round has fewer matches: 2:1 mapping (consolidation rounds)
        let nextMatchIndex;
        if (nextRound.length === currentRound.length) {
          // 1:1 mapping for merge rounds (e.g., LR1→LR2 where LR2 receives both LR1 winners and WR2 losers)
          nextMatchIndex = j;
        } else {
          // 2:1 mapping for consolidation rounds (e.g., LR2→LR3)
          nextMatchIndex = Math.floor(j / 2);
        }

        if (nextRound[nextMatchIndex]) {
          match.feedsIntoWin = nextRound[nextMatchIndex].id;
        }
      }
    }

    // Connect winners bracket final and losers bracket final to grand finals
    const grandFinal = matches.find(m => m.bracket === 'grand-finals' && !m.isConditional);
    if (grandFinal) {
      // Winners bracket final (last round)
      const winnersFinal = winnersMatches[winnerRounds];
      if (winnersFinal && winnersFinal.length === 1) {
        winnersFinal[0].feedsIntoWin = grandFinal.id;
      }

      // Losers bracket final (last round)
      const finalLoserRound = Math.max(...loserRounds);
      const losersFinal = losersMatches[finalLoserRound];
      if (losersFinal && losersFinal.length === 1) {
        losersFinal[0].feedsIntoWin = grandFinal.id;
      }
    }
  }

  /**
   * Seed players (random or ordered)
   */
  seedPlayers(numPlayers, method) {
    const indices = Array.from({ length: numPlayers }, (_, i) => i);

    if (method === 'random') {
      this.shuffleArray(indices);
    }

    // Apply bracket seeding
    return this.applyBracketSeeding(indices);
  }

  /**
   * Apply standard bracket seeding
   */
  applyBracketSeeding(seeds) {
    const n = seeds.length;
    const bracketSize = this.nextPowerOf2(n);

    while (seeds.length < bracketSize) {
      seeds.push(null);
    }

    const ordered = [];
    for (let i = 0; i < bracketSize / 2; i++) {
      ordered.push(seeds[i]);
      ordered.push(seeds[bracketSize - 1 - i]);
    }

    return ordered.filter((s) => s !== null);
  }

  /**
   * Fisher-Yates shuffle
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Calculate standings for double elimination
   */
  calculateStandings(matches, players, config) {
    const stats = players.map((player, index) => ({
      player,
      playerIndex: index,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      eliminationRound: null,
      finalPosition: null,
      matchesPlayed: 0,
      opponents: { beaten: [], lostTo: [] },
      // No points or qualityScore for elimination formats - ranking is by bracket position
    }));

    // Track losses and calculate basic stats
    matches.forEach((match) => {
      if (!match || match.isPlaceholder || match.isConditional) return;
      if (match.isBye) return;
      if (match.winner === null) return;

      const p1 = match.player1;
      const p2 = match.player2;

      if (p1 === null || p2 === null) return;

      // Count games
      if (match.games) {
        match.games.forEach((game) => {
          if (game === 1) {
            stats[p1].gamesWon++;
            stats[p2].gamesLost++;
          } else if (game === 2) {
            stats[p2].gamesWon++;
            stats[p1].gamesLost++;
          }
        });
      }

      const winner = match.winner === 1 ? p1 : p2;
      const loser = match.winner === 1 ? p2 : p1;

      stats[winner].wins++;
      stats[loser].losses++;
      stats[winner].matchesPlayed++;
      stats[loser].matchesPlayed++;

      // Track opponents
      stats[winner].opponents.beaten.push(loser);
      stats[loser].opponents.lostTo.push(winner);

      // Track elimination round (round of most recent/final loss)
      // This determines final placement in the bracket
      stats[loser].eliminationRound = match.round;
    });

    // No points calculation for double elimination - ranking is by bracket position only

    return stats;
  }
}

/**
 * Group Stage Format Implementation
 * Groups play round-robin, then top players advance to single-elimination playoffs
 *
 * This is a multi-stage tournament format.
 */
class GroupStageFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.GROUP_STAGE;
    this.formatName = 'Group Stage + Playoffs';
    this.description = 'Groups play round-robin, then top players advance to playoffs';
    this.minPlayers = 8;
    this.maxPlayers = 32;
    this.supportsMultiStage = true;
  }

  getFormatIcon() {
    return '📦';
  }

  getRecommendedPlayerCounts() {
    return [8, 12, 16, 20, 24, 32];
  }

  /**
   * Get valid group configurations for a given player count
   * Returns array of {numGroups, playersPerGroup, advancingPerGroup, description}
   * Only returns configurations where:
   * - Total advancing is a power of 2 (4, 8, 16, 32)
   * - Groups have 4-6 players (or 3-8 as acceptable range)
   * - Advancing per group is 1-2
   * - Less than 50% of group advances
   */
  getValidConfigurations(numPlayers) {
    const configs = [];

    // Define optimal configurations per player count
    const optimalConfigs = {
      8: [
        { numGroups: 2, playersPerGroup: 4, advancingPerGroup: 2, description: '2 groups of 4, top 2 advance → 4-player playoffs' }
      ],
      12: [
        { numGroups: 4, playersPerGroup: 3, advancingPerGroup: 1, description: '4 groups of 3, winner only → 4-player playoffs' },
        { numGroups: 2, playersPerGroup: 6, advancingPerGroup: 2, description: '2 groups of 6, top 2 advance → 4-player playoffs' }
      ],
      16: [
        { numGroups: 4, playersPerGroup: 4, advancingPerGroup: 2, description: '4 groups of 4, top 2 advance → 8-player playoffs (recommended)' },
        { numGroups: 4, playersPerGroup: 4, advancingPerGroup: 1, description: '4 groups of 4, winner only → 4-player playoffs (exclusive)' }
      ],
      20: [
        { numGroups: 4, playersPerGroup: 5, advancingPerGroup: 2, description: '4 groups of 5, top 2 advance → 8-player playoffs (recommended)' },
        { numGroups: 4, playersPerGroup: 5, advancingPerGroup: 1, description: '4 groups of 5, winner only → 4-player playoffs' }
      ],
      24: [
        { numGroups: 4, playersPerGroup: 6, advancingPerGroup: 2, description: '4 groups of 6, top 2 advance → 8-player playoffs (recommended)' },
        { numGroups: 4, playersPerGroup: 6, advancingPerGroup: 1, description: '4 groups of 6, winner only → 4-player playoffs (exclusive)' },
        { numGroups: 8, playersPerGroup: 3, advancingPerGroup: 1, description: '8 groups of 3, winner only → 8-player playoffs' }
      ],
      32: [
        { numGroups: 8, playersPerGroup: 4, advancingPerGroup: 2, description: '8 groups of 4, top 2 advance → 16-player playoffs (recommended)' },
        { numGroups: 8, playersPerGroup: 4, advancingPerGroup: 1, description: '8 groups of 4, winner only → 8-player playoffs (exclusive)' },
        { numGroups: 4, playersPerGroup: 8, advancingPerGroup: 2, description: '4 groups of 8, top 2 advance → 8-player playoffs' }
      ]
    };

    return optimalConfigs[numPlayers] || [];
  }

  getDefaultConfig(numPlayers) {
    // Get first valid configuration
    const validConfigs = this.getValidConfigurations(numPlayers);

    if (validConfigs.length > 0) {
      const config = validConfigs[0];
      return {
        numGroups: config.numGroups,
        playersPerGroup: config.playersPerGroup,
        advancingPerGroup: config.advancingPerGroup,
        currentStage: 'groups',
      };
    }

    // Fallback for non-standard player counts
    const numGroups = Math.max(2, Math.floor(numPlayers / 4));
    return {
      numGroups,
      playersPerGroup: Math.floor(numPlayers / numGroups),
      advancingPerGroup: 2,
      currentStage: 'groups',
    };
  }

  validateConfig(config, numPlayers) {
    if (!config.numGroups || config.numGroups < 2) {
      return { isValid: false, error: 'At least 2 groups required' };
    }

    if (!config.playersPerGroup || config.playersPerGroup < 3) {
      return { isValid: false, error: 'At least 3 players per group required' };
    }

    const totalInGroups = config.numGroups * config.playersPerGroup;
    if (totalInGroups > numPlayers) {
      return {
        isValid: false,
        error: `Configuration requires ${totalInGroups} players but only ${numPlayers} available`,
      };
    }

    if (config.advancingPerGroup >= config.playersPerGroup) {
      return {
        isValid: false,
        error: 'Cannot advance all players from group',
      };
    }

    // Check if total advancing players is a power of 2
    const totalAdvancing = config.numGroups * config.advancingPerGroup;
    const isPowerOf2 = (n) => n > 0 && (n & (n - 1)) === 0;

    if (!isPowerOf2(totalAdvancing)) {
      return {
        isValid: false,
        error: `Total advancing players (${totalAdvancing}) must be a power of 2 (4, 8, 16, 32) for single elimination playoffs`,
      };
    }

    // Warn if more than 50% advance
    const advancePercent = (config.advancingPerGroup / config.playersPerGroup) * 100;
    if (advancePercent > 50) {
      return {
        isValid: false,
        error: `Too many players advancing (${advancePercent.toFixed(0)}%). Maximum 50% of each group should advance.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Generate matches for group stage
   * Stage 1: Groups (round-robin within each group)
   * Stage 2: Playoffs (single elimination)
   */
  generateMatches(players, config) {
    const matches = [];
    let matchId = 0;

    // Assign players to groups
    const groupAssignments = this.assignPlayersToGroups(
      players.length,
      config.numGroups,
      config.playersPerGroup
    );

    // Generate group stage matches (round-robin within each group)
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    groupAssignments.forEach((groupPlayers, groupIndex) => {
      const groupName = groupNames[groupIndex];

      // Generate all pairings for this group (full round-robin)
      for (let i = 0; i < groupPlayers.length; i++) {
        for (let j = i + 1; j < groupPlayers.length; j++) {
          matches.push({
            id: matchId++,
            stage: 'groups',
            group: groupName,
            groupIndex: groupIndex,
            player1: groupPlayers[i],
            player2: groupPlayers[j],
            games: [null, null, null],
            winner: null,
          });
        }
      }
    });

    // Playoffs bracket (placeholder - populated when groups complete)
    // Number of playoff spots
    const playoffSpots = config.numGroups * config.advancingPerGroup;

    // Create single elimination playoff bracket
    const playoffBracketSize = this.nextPowerOf2(playoffSpots);
    const playoffRounds = Math.log2(playoffBracketSize);

    const playoffRoundMatches = {}; // Track match IDs by round for feedsInto setup

    for (let round = 1; round <= playoffRounds; round++) {
      playoffRoundMatches[round] = [];
      const matchesInRound = Math.pow(2, playoffRounds - round);

      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: matchId,
          stage: 'playoffs',
          round: round,
          bracketPosition: `Playoff-R${round}-M${i + 1}`,
          player1: null,
          player2: null,
          games: [null, null, null],
          winner: null,
          isPlaceholder: true,
          feedsInto: null, // Will set after creating all matches
        });
        playoffRoundMatches[round].push(matchId);
        matchId++;
      }
    }

    // Set up feedsInto relationships for playoff bracket
    for (let round = 1; round < playoffRounds; round++) {
      const currentRoundMatches = playoffRoundMatches[round];
      const nextRoundMatches = playoffRoundMatches[round + 1];

      currentRoundMatches.forEach((currentMatchId, index) => {
        const match = matches.find(m => m.id === currentMatchId);
        const nextMatchIndex = Math.floor(index / 2);
        match.feedsInto = nextRoundMatches[nextMatchIndex];
      });
    }

    return matches;
  }

  /**
   * Assign players to groups
   * @param {number} numPlayers - Total players
   * @param {number} numGroups - Number of groups
   * @param {number} playersPerGroup - Players per group
   * @returns {Array<Array<number>>} Array of groups, each containing player indices
   */
  assignPlayersToGroups(numPlayers, numGroups, playersPerGroup) {
    const playerIndices = Array.from({ length: numPlayers }, (_, i) => i);

    // Shuffle for random group assignment
    this.shuffleArray(playerIndices);

    const groups = [];
    for (let i = 0; i < numGroups; i++) {
      groups.push([]);
    }

    // Distribute players to groups
    for (let i = 0; i < numPlayers && i < numGroups * playersPerGroup; i++) {
      const groupIndex = i % numGroups;
      groups[groupIndex].push(playerIndices[i]);
    }

    return groups;
  }

  /**
   * Get next power of 2
   */
  nextPowerOf2(n) {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  /**
   * Fisher-Yates shuffle
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Calculate standings for group stage format
   * Returns separate standings per group during group stage
   */
  calculateStandings(matches, players, config) {
    const stage = config.currentStage || 'groups';

    if (stage === 'groups') {
      return this.calculateGroupStandings(matches, players, config);
    } else {
      return this.calculatePlayoffStandings(matches, players, config);
    }
  }

  /**
   * Calculate standings within each group
   */
  calculateGroupStandings(matches, players, config) {
    // Initialize stats for all players
    const stats = players.map((player, index) => ({
      player,
      playerIndex: index,
      wins: 0,
      losses: 0,
      draws: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
      group: null,
      matchesPlayed: 0,
      opponents: { beaten: [], lostTo: [] },
      qualityScore: 0,
    }));

    // Get group matches only
    const groupMatches = matches.filter((m) => m.stage === 'groups');

    // Assign players to their groups and calculate stats
    groupMatches.forEach((match) => {
      if (match.player1 === null || match.player2 === null) return;

      // Mark group membership
      stats[match.player1].group = match.group;
      stats[match.player2].group = match.group;

      if (match.winner === null) return; // Not complete

      const p1 = match.player1;
      const p2 = match.player2;

      // Count games
      if (match.games) {
        match.games.forEach((game) => {
          if (game === 1) {
            stats[p1].gamesWon++;
            stats[p2].gamesLost++;
          } else if (game === 2) {
            stats[p2].gamesWon++;
            stats[p1].gamesLost++;
          }
        });
      }

      // Match results
      if (match.winner === 1) {
        stats[p1].wins++;
        stats[p2].losses++;
        stats[p1].points += 3;
        stats[p1].opponents.beaten.push(p2);
        stats[p2].opponents.lostTo.push(p1);
      } else if (match.winner === 2) {
        stats[p2].wins++;
        stats[p1].losses++;
        stats[p2].points += 3;
        stats[p2].opponents.beaten.push(p1);
        stats[p1].opponents.lostTo.push(p2);
      }

      stats[p1].matchesPlayed++;
      stats[p2].matchesPlayed++;
    });

    // Calculate quality scores
    stats.forEach((stat) => {
      stat.qualityScore = stat.opponents.beaten.reduce((sum, oppIdx) => {
        // Safety check: ensure opponent index is valid
        if (oppIdx !== null && oppIdx !== undefined && stats[oppIdx]) {
          return sum + stats[oppIdx].points;
        }
        return sum;
      }, 0);
    });

    return stats;
  }

  /**
   * Calculate playoff standings
   */
  calculatePlayoffStandings(matches, players, config) {
    const stats = players.map((player, index) => ({
      player,
      playerIndex: index,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
      roundEliminated: null,
      matchesPlayed: 0,
      opponents: { beaten: [], lostTo: [] },
    }));

    const playoffMatches = matches.filter((m) => m.stage === 'playoffs');

    playoffMatches.forEach((match) => {
      if (!match || match.isPlaceholder) return;
      if (match.winner === null) return;

      const p1 = match.player1;
      const p2 = match.player2;

      if (p1 === null || p2 === null) return;

      // Count games
      if (match.games) {
        match.games.forEach((game) => {
          if (game === 1) {
            stats[p1].gamesWon++;
            stats[p2].gamesLost++;
          } else if (game === 2) {
            stats[p2].gamesWon++;
            stats[p1].gamesLost++;
          }
        });
      }

      const winner = match.winner === 1 ? p1 : p2;
      const loser = match.winner === 1 ? p2 : p1;

      stats[winner].wins++;
      stats[loser].losses++;
      stats[winner].points += 3; // 3 points per match win
      stats[winner].matchesPlayed++;
      stats[loser].matchesPlayed++;

      // Track opponents
      stats[winner].opponents.beaten.push(loser);
      stats[loser].opponents.lostTo.push(winner);

      // Track elimination round for playoff bracket position
      if (stats[loser].roundEliminated === null) {
        stats[loser].roundEliminated = match.round;
      }
    });

    return stats;
  }

  /**
   * Get next stage
   */
  getNextStage(currentStage, tournamentData) {
    if (currentStage === 'groups') return 'playoffs';
    return null; // Playoffs is the final stage
  }
}

/**
 * Format Factory
 * Creates format instances based on format type
 */
class TournamentFormatFactory {
  static formats = {
    [TOURNAMENT_FORMATS.ROUND_ROBIN]: RoundRobinFormat,
    [TOURNAMENT_FORMATS.SWISS]: SwissFormat,
    [TOURNAMENT_FORMATS.SINGLE_ELIMINATION]: SingleEliminationFormat,
    [TOURNAMENT_FORMATS.DOUBLE_ELIMINATION]: DoubleEliminationFormat,
    [TOURNAMENT_FORMATS.GROUP_STAGE]: GroupStageFormat,
  };

  /**
   * Create a format instance
   * @param {string} formatType - Format type constant
   * @returns {TournamentFormatBase} Format instance
   */
  static create(formatType) {
    // Handle null/undefined/invalid formats by defaulting to round-robin
    if (!formatType || typeof formatType !== 'string') {
      console.warn(`Invalid format type: ${formatType}, defaulting to round-robin`);
      formatType = APP_CONFIG.FORMATS.DEFAULT;
    }

    const FormatClass = this.formats[formatType];
    if (!FormatClass) {
      console.warn(`Unknown format type: ${formatType}, defaulting to round-robin`);
      return new this.formats[APP_CONFIG.FORMATS.DEFAULT]();
    }
    return new FormatClass();
  }

  /**
   * Get all available formats
   * @returns {Array<Object>} Array of format info objects
   */
  static getAllFormats() {
    return Object.keys(this.formats).map((formatType) => {
      const format = this.create(formatType);
      return format.getFormatInfo();
    });
  }

  /**
   * Check if format is implemented
   * @param {string} formatType - Format type constant
   * @returns {boolean} True if format is fully implemented
   */
  static isImplemented(formatType) {
    // All formats are now implemented (Phase 2 complete)
    return Object.values(TOURNAMENT_FORMATS).includes(formatType);
  }
}

// Create global instances
const tournamentFormats = {
  FORMATS: TOURNAMENT_FORMATS,
  factory: TournamentFormatFactory,
  base: TournamentFormatBase,
};
