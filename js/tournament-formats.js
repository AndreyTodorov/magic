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
    // Use existing calculation from TournamentManager
    // This will be integrated in the next step
    return [];
  }
}

/**
 * Swiss Format Implementation (Placeholder)
 * To be implemented in Phase 2
 */
class SwissFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.SWISS;
    this.formatName = 'Swiss Tournament';
    this.description = 'Pair players with similar records each round';
    this.minPlayers = 4;
    this.maxPlayers = 100;
  }

  getFormatIcon() {
    return '🔄';
  }

  getRecommendedPlayerCounts() {
    return [8, 16, 32, 64];
  }

  getDefaultConfig(numPlayers) {
    // Default rounds: ceil(log2(players))
    const defaultRounds = Math.ceil(Math.log2(numPlayers));
    return {
      rounds: Math.min(defaultRounds, 7),
    };
  }

  generateMatches(players, config) {
    // TODO: Implement in Phase 2
    throw new Error('Swiss format not yet implemented');
  }

  calculateStandings(matches, players, config) {
    // TODO: Implement in Phase 2
    return [];
  }
}

/**
 * Single Elimination Format Implementation (Placeholder)
 * To be implemented in Phase 2
 */
class SingleEliminationFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.SINGLE_ELIMINATION;
    this.formatName = 'Single Elimination';
    this.description = 'Traditional bracket tournament - lose once and you\'re out';
    this.minPlayers = 2;
    this.maxPlayers = 128;
  }

  getFormatIcon() {
    return '🏆';
  }

  getRecommendedPlayerCounts() {
    return [4, 8, 16, 32, 64];
  }

  getDefaultConfig(numPlayers) {
    return {
      seedingMethod: 'random',
    };
  }

  generateMatches(players, config) {
    // TODO: Implement in Phase 2
    throw new Error('Single elimination format not yet implemented');
  }

  calculateStandings(matches, players, config) {
    // TODO: Implement in Phase 2
    return [];
  }
}

/**
 * Double Elimination Format Implementation (Placeholder)
 * To be implemented in Phase 2
 */
class DoubleEliminationFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.DOUBLE_ELIMINATION;
    this.formatName = 'Double Elimination';
    this.description = 'Losers get a second chance in the losers bracket';
    this.minPlayers = 4;
    this.maxPlayers = 64;
  }

  getFormatIcon() {
    return '♻️';
  }

  getRecommendedPlayerCounts() {
    return [4, 8, 16, 32];
  }

  getDefaultConfig(numPlayers) {
    return {
      grandFinalReset: false, // If loser's bracket winner wins, reset bracket
    };
  }

  generateMatches(players, config) {
    // TODO: Implement in Phase 2
    throw new Error('Double elimination format not yet implemented');
  }

  calculateStandings(matches, players, config) {
    // TODO: Implement in Phase 2
    return [];
  }
}

/**
 * Group Stage Format Implementation (Placeholder)
 * To be implemented in Phase 2
 */
class GroupStageFormat extends TournamentFormatBase {
  constructor() {
    super();
    this.formatType = TOURNAMENT_FORMATS.GROUP_STAGE;
    this.formatName = 'Group Stage + Playoffs';
    this.description = 'Groups play round-robin, then top players advance to playoffs';
    this.minPlayers = 8;
    this.maxPlayers = 64;
    this.supportsMultiStage = true;
  }

  getFormatIcon() {
    return '📦';
  }

  getRecommendedPlayerCounts() {
    return [12, 16, 24, 32];
  }

  getDefaultConfig(numPlayers) {
    // Try to create balanced groups of 4 players each
    const numGroups = Math.floor(numPlayers / 4);
    return {
      numGroups: Math.max(2, Math.min(numGroups, 8)),
      playersPerGroup: 4,
      advancingPerGroup: 2,
    };
  }

  generateMatches(players, config) {
    // TODO: Implement in Phase 2
    throw new Error('Group stage format not yet implemented');
  }

  calculateStandings(matches, players, config) {
    // TODO: Implement in Phase 2
    return [];
  }

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
    const FormatClass = this.formats[formatType];
    if (!FormatClass) {
      throw new Error(`Unknown format type: ${formatType}`);
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
    // Currently only round-robin is implemented
    return formatType === TOURNAMENT_FORMATS.ROUND_ROBIN;
  }
}

// Create global instances
const tournamentFormats = {
  FORMATS: TOURNAMENT_FORMATS,
  factory: TournamentFormatFactory,
  base: TournamentFormatBase,
};
