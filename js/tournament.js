/**
 * TOURNAMENT MANAGER MODULE
 * Handles all tournament logic, match generation, scoring, and rankings
 */

class TournamentManager {
  constructor() {
    this.players = [];
    this.matches = [];
    this.playerCount = APP_CONFIG.DEFAULT_PLAYERS;
    this.matchesPerPlayer = 3;
    this.currentTournamentCode = null;
    this.isCreator = false;
    // Cache for standings calculations (improves mobile performance)
    this.standingsCache = null;
    this.standingsCacheHash = null;
    // Format support
    this.format = APP_CONFIG.FORMATS.DEFAULT;
    this.formatConfig = {};
    this.currentStage = null; // For multi-stage tournaments
  }

  /**
   * Reset tournament state
   */
  reset() {
    this.players = [];
    this.matches = [];
    this.currentTournamentCode = null;
    this.isCreator = false;
    this.standingsCache = null;
    this.standingsCacheHash = null;
    this.format = APP_CONFIG.FORMATS.DEFAULT;
    this.formatConfig = {};
    this.currentStage = null;
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

  /**
   * Calculate total matches needed
   */
  getTotalMatches(numPlayers, matchesPerPlayer) {
    return (numPlayers * matchesPerPlayer) / 2;
  }

  /**
   * Generate balanced match structure using modified round-robin
   */
  generateMatchStructure(numPlayers, matchesPerPerson) {
    const matchCount = Array(numPlayers).fill(0);
    const selectedMatches = [];
    const targetMatches = this.getTotalMatches(numPlayers, matchesPerPerson);

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
    // Max attempts prevents infinite loops if the match structure is impossible
    // 1000 attempts is sufficient for valid configurations (up to 12 players)
    const maxAttempts = 1000;

    while (selectedMatches.length < targetMatches && attempts < maxAttempts) {
      attempts++;

      for (const [p1, p2] of allPossibleMatches) {
        if (selectedMatches.length >= targetMatches) break;

        // Check if both players haven't exceeded quota
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

      // Retry with reshuffling if needed
      if (selectedMatches.length < targetMatches && attempts < maxAttempts) {
        selectedMatches.length = 0;
        matchCount.fill(0);
        this.shuffleArray(allPossibleMatches);
      }
    }

    return selectedMatches;
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

  /**
   * Create tournament from player names
   * @param {Array<string>} playerNames - Array of player names
   * @param {number} matchesPerPlayer - Matches per player (for round-robin)
   * @param {string} format - Tournament format type (optional, defaults to round-robin)
   * @param {Object} formatConfig - Format-specific configuration (optional)
   */
  createTournament(playerNames, matchesPerPlayer, format = null, formatConfig = null) {
    this.players = playerNames;
    this.playerCount = playerNames.length;
    this.matchesPerPlayer = matchesPerPlayer;

    // Set format (default to round-robin for backward compatibility)
    this.format = format || APP_CONFIG.FORMATS.DEFAULT;

    // Get format handler
    const formatHandler = tournamentFormats.factory.create(this.format);

    // Set format config
    if (formatConfig) {
      this.formatConfig = formatConfig;
    } else {
      // Use default config for format
      this.formatConfig = formatHandler.getDefaultConfig(this.playerCount);
      // For round-robin, ensure matchesPerPlayer is set
      if (this.format === 'round-robin') {
        this.formatConfig.matchesPerPlayer = matchesPerPlayer;
      }
    }

    // Generate matches using format handler
    this.matches = formatHandler.generateMatches(this.players, this.formatConfig);

    // Set initial stage for multi-stage formats
    if (this.format === TOURNAMENT_FORMATS.GROUP_STAGE) {
      this.currentStage = 'groups';
    }

    // For elimination formats, process any auto-wins (BYE matches)
    if (this.format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
        this.format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION) {
      this.processAutoWins();
    }

    return this.matches;
  }

  /**
   * Process auto-wins (BYE matches) and advance winners
   */
  processAutoWins() {
    this.matches.forEach((match) => {
      if (match.isBye && match.winner !== null) {
        this.advanceWinnerToNextMatch(match);
      }
    });
  }

  /**
   * Load tournament from Firebase data
   */
  loadTournament(tournamentData) {
    this.players = tournamentData.players;
    this.playerCount = this.players.length;
    this.matchesPerPlayer = tournamentData.matchesPerPlayer;

    // Load format data (backward compatibility: default to round-robin)
    this.format = tournamentData.format || APP_CONFIG.FORMATS.DEFAULT;
    this.formatConfig = tournamentData.formatConfig || {
      matchesPerPlayer: this.matchesPerPlayer,
    };
    this.currentStage = tournamentData.currentStage || null;

    // Convert Firebase object to array
    if (tournamentData.matches) {
      this.matches = Object.keys(tournamentData.matches)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((key) => {
          const match = tournamentData.matches[key];
          if (!match) {
            console.warn(`Invalid match data for key ${key}`);
            return null;
          }
          // Normalize games array because Firebase omits nulls (missing indices become undefined)
          const games = Array.from(
            { length: APP_CONFIG.GAMES_PER_MATCH },
            (_, i) => {
              const v = Array.isArray(match.games) ? match.games[i] : null;
              return v === 1 || v === 2 ? v : null;
            }
          );
          // Normalize winner to null unless it is 1 or 2
          const winner =
            match.winner === 1 || match.winner === 2 ? match.winner : null;
          return {
            ...match,
            games,
            winner,
          };
        })
        .filter((match) => match !== null);
    } else {
      this.matches = [];
    }

    // For elimination formats, rebuild bracket state from completed matches
    if (this.format === TOURNAMENT_FORMATS.SINGLE_ELIMINATION ||
        this.format === TOURNAMENT_FORMATS.DOUBLE_ELIMINATION) {
      this.rebuildBracketState();
    }
  }

  /**
   * Rebuild bracket state from completed matches
   * This ensures winners are properly advanced to next rounds
   */
  rebuildBracketState() {
    // Process all completed matches in order of rounds
    const matchesByRound = {};
    this.matches.forEach((match) => {
      if (!match.round) return;
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    // Process rounds in order
    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    rounds.forEach((round) => {
      matchesByRound[round].forEach((match) => {
        if (match.winner !== null || match.isBye) {
          this.advanceWinnerToNextMatch(match);
        }
      });
    });
  }

  /**
   * Sanitize player name (remove problematic characters)
   */
  sanitizePlayerName(name) {
    if (!name) return "";

    // Trim whitespace
    let sanitized = name.trim();

    // Limit length to 30 characters
    sanitized = sanitized.substring(0, 30);

    // Remove potentially problematic characters but keep common punctuation
    // Allow letters, numbers, spaces, apostrophes, hyphens, periods
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s'\-\.]/g, "");

    // Collapse multiple spaces into one
    sanitized = sanitized.replace(/\s+/g, " ");

    return sanitized.trim();
  }

  /**
   * Validate player names (check for duplicates and empty)
   */
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

  /**
   * Calculate quality score (sum of beaten opponents' points)
   */
  calculateQualityScore(playerIndex, stats) {
    let qualityScore = 0;

    const playerMatches = this.matches.filter(
      (m) => m.player1 === playerIndex || m.player2 === playerIndex
    );

    playerMatches.forEach((m) => {
      if (m.winner !== null) {
        const isPlayer1 = m.player1 === playerIndex;
        const playerNum = isPlayer1 ? 1 : 2;
        const opponentIndex = isPlayer1 ? m.player2 : m.player1;
        const opponentStats = stats[opponentIndex];

        if (m.winner === playerNum) {
          qualityScore += opponentStats.points;
        }
      }
    });

    return qualityScore;
  }

  /**
   * Calculate comprehensive player statistics
   */
  calculatePlayerStats() {
    if (!this.matches || !Array.isArray(this.matches)) {
      console.warn("Matches not initialized");
      return [];
    }

    const stats = this.players.map((player, index) => {
      const playerMatches = this.matches.filter(
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

    // Calculate quality scores
    stats.forEach((stat, index) => {
      stat.qualityScore = this.calculateQualityScore(index, stats);
    });

    return stats;
  }

  /**
   * Sort players with comprehensive tiebreaking
   */
  rankPlayers(stats) {
    return stats.sort((a, b) => {
      // Primary: Total points
      if (Math.abs(b.points - a.points) > 0.01) {
        return b.points - a.points;
      }

      // Secondary: Head-to-head
      const h2hMatch = this.matches.find(
        (m) =>
          (m.player1 === a.playerIndex && m.player2 === b.playerIndex) ||
          (m.player1 === b.playerIndex && m.player2 === a.playerIndex)
      );

      if (h2hMatch && h2hMatch.winner !== null) {
        if (h2hMatch.player1 === a.playerIndex) {
          return h2hMatch.winner === 1 ? -1 : 1;
        } else {
          return h2hMatch.winner === 1 ? 1 : -1;
        }
      }

      // Tertiary: Quality score
      if (Math.abs(b.qualityScore - a.qualityScore) > 0.01) {
        return b.qualityScore - a.qualityScore;
      }

      // Quaternary: Win percentage
      const aWinPct = a.matchesPlayed > 0 ? a.wins / a.matchesPlayed : 0;
      const bWinPct = b.matchesPlayed > 0 ? b.wins / b.matchesPlayed : 0;
      if (Math.abs(bWinPct - aWinPct) > 0.01) {
        return bWinPct - aWinPct;
      }

      // Quinary: Game differential
      const aGameDiff = a.gamesWon - a.gamesLost;
      const bGameDiff = b.gamesWon - b.gamesLost;
      if (bGameDiff !== aGameDiff) {
        return bGameDiff - aGameDiff;
      }

      // Final: Total games won
      return b.gamesWon - a.gamesWon;
    });
  }

  /**
   * Assign ranks and detect ties
   */
  assignRanks(sortedStats) {
    let currentRank = 1;
    const rankedStats = sortedStats.map((stat, index) => {
      if (index > 0) {
        const prev = sortedStats[index - 1];
        const pointsTied = Math.abs(stat.points - prev.points) < 0.01;
        const qualityTied =
          Math.abs(stat.qualityScore - prev.qualityScore) < 0.01;

        if (!pointsTied || !qualityTied) {
          currentRank = index + 1;
        }
      }

      return { ...stat, rank: currentRank };
    });

    // Identify tied ranks
    const tiedRanks = new Set();
    for (let i = 0; i < rankedStats.length - 1; i++) {
      if (rankedStats[i].rank === rankedStats[i + 1].rank) {
        tiedRanks.add(rankedStats[i].rank);
      }
    }

    return { rankedStats, tiedRanks };
  }

  /**
   * Generate a hash of match results for cache validation
   */
  getMatchesHash() {
    // Simple hash based on match results - if results haven't changed, cache is valid
    return this.matches
      .map((m) => `${m.id}:${m.games.join(",")},${m.winner}`)
      .join("|");
  }

  /**
   * Rank players based on format-specific tiebreakers
   */
  rankPlayersByFormat(stats, format) {
    // Filter out any null/undefined stats
    stats = stats.filter(s => s !== null && s !== undefined);

    // Swiss format uses: Wins → OMW% → GW% → OGW%
    if (format === TOURNAMENT_FORMATS.SWISS) {
      return stats.sort((a, b) => {
        // Safety: ensure both objects exist
        if (!a || !b) return 0;

        // Primary: Match wins (points / 3)
        if (b.points !== a.points) return b.points - a.points;

        // Secondary: Opponent Match Win %
        const aOmw = a.omw || 0;
        const bOmw = b.omw || 0;
        if (Math.abs(bOmw - aOmw) > 0.001) return bOmw - aOmw;

        // Tertiary: Game Win %
        const aGwp = a.gwp || 0;
        const bGwp = b.gwp || 0;
        if (Math.abs(bGwp - aGwp) > 0.001) return bGwp - aGwp;

        // Quaternary: Opponent Game Win %
        const aOgw = a.ogw || 0;
        const bOgw = b.ogw || 0;
        if (Math.abs(bOgw - aOgw) > 0.001) return bOgw - aOgw;

        // Final: Total games won (with safety check)
        const aGamesWon = a.gamesWon || 0;
        const bGamesWon = b.gamesWon || 0;
        return bGamesWon - aGamesWon;
      });
    }

    // Round Robin, Single/Double Elimination: Use existing tiebreakers
    // Points → Quality Score → Win % → Game differential → Games won
    return stats.sort((a, b) => {
      // Safety: ensure both objects exist
      if (!a || !b) return 0;

      // Primary: Total points
      if (Math.abs(b.points - a.points) > 0.01) {
        return b.points - a.points;
      }

      // Secondary: Head-to-head (if both have qualityScore)
      if (a.qualityScore !== undefined && b.qualityScore !== undefined) {
        if (Math.abs(b.qualityScore - a.qualityScore) > 0.01) {
          return b.qualityScore - a.qualityScore;
        }
      }

      // Tertiary: Win percentage
      const aWinPct = a.matchesPlayed > 0 ? a.wins / a.matchesPlayed : 0;
      const bWinPct = b.matchesPlayed > 0 ? b.wins / b.matchesPlayed : 0;
      if (Math.abs(bWinPct - aWinPct) > 0.01) {
        return bWinPct - aWinPct;
      }

      // Quaternary: Game differential (with safety checks)
      const aGamesWon = a.gamesWon || 0;
      const aGamesLost = a.gamesLost || 0;
      const bGamesWon = b.gamesWon || 0;
      const bGamesLost = b.gamesLost || 0;
      const aGameDiff = aGamesWon - aGamesLost;
      const bGameDiff = bGamesWon - bGamesLost;
      if (bGameDiff !== aGameDiff) {
        return bGameDiff - aGameDiff;
      }

      // Final: Total games won
      return bGamesWon - aGamesWon;
    });
  }

  /**
   * Get complete standings with rankings
   * OPTIMIZED: Uses caching to avoid recalculating unchanged standings
   */
  getStandings() {
    const currentHash = this.getMatchesHash();

    // Return cached standings if data hasn't changed
    if (this.standingsCacheHash === currentHash && this.standingsCache) {
      return this.standingsCache;
    }

    // Get format handler
    const formatHandler = tournamentFormats.factory.create(this.format);

    // Calculate standings using format-specific method
    const stats = formatHandler.calculateStandings(
      this.matches,
      this.players,
      this.formatConfig
    );

    // Rank players based on format-specific tiebreakers
    const sortedStats = this.rankPlayersByFormat(stats, this.format);
    const result = this.assignRanks(sortedStats);

    // Cache the result
    this.standingsCache = result;
    this.standingsCacheHash = currentHash;

    return result;
  }

  /**
   * Calculate tournament progress
   */
  getProgress() {
    const completed = this.matches.filter((m) => m.winner !== null).length;
    const total = this.matches.length;
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  /**
   * Get schedule for specific player
   */
  getPlayerSchedule(playerIndex) {
    return this.matches
      .filter((m) => m.player1 === playerIndex || m.player2 === playerIndex)
      .map((m) => {
        const opponentIndex = m.player1 === playerIndex ? m.player2 : m.player1;
        return {
          matchId: m.id,
          opponent: this.players[opponentIndex],
          opponentIndex,
          completed: m.winner !== null,
        };
      });
  }

  /**
   * Get match by ID
   */
  getMatch(matchId) {
    return this.matches[matchId];
  }

  /**
   * Update match game result
   */
  updateMatchGame(matchId, gameNum, winner) {
    const match = this.matches[matchId];
    if (!match || !match.games) {
      console.error("Invalid match");
      return null;
    }

    // Check if previous games are completed
    if (gameNum > 0) {
      for (let i = 0; i < gameNum; i++) {
        if (match.games[i] === null) {
          return { error: `Please complete Game ${i + 1} first!` };
        }
      }
    }

    // Don't allow updating locked games
    if (match.winner !== null && match.games[gameNum] === null) {
      return { error: "Match already completed" };
    }

    // Toggle game result
    if (match.games[gameNum] === winner) {
      match.games[gameNum] = null;
      // Reset subsequent games
      for (let i = gameNum + 1; i < APP_CONFIG.GAMES_PER_MATCH; i++) {
        match.games[i] = null;
      }
      match.winner = null;
    } else {
      match.games[gameNum] = winner;
    }

    // After applying the change, walk through games in order and detect
    // the earliest point where a player reaches 2 wins. Once the match
    // is decided at that game, clear all subsequent game results as
    // they cannot have been played.
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
      // Clear any games after the decisive game
      for (let j = decidedAt + 1; j < APP_CONFIG.GAMES_PER_MATCH; j++) {
        match.games[j] = null;
      }

      // Advance winner to next round in elimination brackets
      this.advanceWinnerToNextMatch(match);
    } else {
      // No winner yet
      match.winner = null;

      // Clear any advancement if match is no longer decided
      this.clearAdvancementFromMatch(match);
    }

    return { match, updated: true };
  }

  /**
   * Advance winner to next match in elimination brackets
   */
  advanceWinnerToNextMatch(match) {
    if (match.winner === null) return;

    // Handle Double Elimination (feedsIntoWin and feedsIntoLoss)
    if (match.feedsIntoWin !== undefined || match.feedsIntoLoss !== undefined) {
      this.advanceDoubleEliminationMatch(match);
      return;
    }

    // Handle Single Elimination (feedsInto)
    if (!match.feedsInto && match.feedsInto !== 0) return;

    // Get the next match
    const nextMatch = this.matches.find((m) => m.id === match.feedsInto);
    if (!nextMatch) return;

    // Determine which player won
    const winnerIndex = match.winner === 1 ? match.player1 : match.player2;

    // Determine which position in the next match this winner should occupy
    // In elimination brackets, matches feed into next round in pairs:
    // Match 0 and 1 feed into Match 0 of next round (winners go to player1 and player2)
    // Match 2 and 3 feed into Match 1 of next round, etc.

    // Find all matches that feed into the same next match
    const feedingMatches = this.matches.filter((m) => m.feedsInto === match.feedsInto);
    const currentMatchIndexInFeeding = feedingMatches.findIndex((m) => m.id === match.id);

    // First match in the pair goes to player1, second goes to player2
    if (currentMatchIndexInFeeding === 0) {
      nextMatch.player1 = winnerIndex;
    } else if (currentMatchIndexInFeeding === 1) {
      nextMatch.player2 = winnerIndex;
    }

    // If both players are now filled, mark as no longer placeholder
    if (nextMatch.player1 !== null && nextMatch.player2 !== null) {
      nextMatch.isPlaceholder = false;
    }
  }

  /**
   * Advance players in double elimination format
   */
  advanceDoubleEliminationMatch(match) {
    const winnerIndex = match.winner === 1 ? match.player1 : match.player2;
    const loserIndex = match.winner === 1 ? match.player2 : match.player1;

    // Advance winner (to winners bracket or within losers bracket)
    if (match.feedsIntoWin || match.feedsIntoWin === 0) {
      const nextMatch = this.matches.find((m) => m.id === match.feedsIntoWin);
      if (nextMatch) {
        // In merge rounds, multiple sources feed into same match:
        // - Winners from previous losers rounds feed via feedsIntoWin
        // - Losers from winners bracket feed via feedsIntoLoss
        // To avoid conflicts, assign based on how many matches feed via each type
        const feedingViaWin = this.matches.filter((m) => m.feedsIntoWin === match.feedsIntoWin);
        const feedingViaLoss = this.matches.filter((m) => m.feedsIntoLoss === match.feedsIntoWin);

        if (feedingViaLoss.length > 0) {
          // This is a merge round - assign feedsIntoWin to player1, feedsIntoLoss to player2
          const index = feedingViaWin.findIndex((m) => m.id === match.id);
          if (index === 0) {
            nextMatch.player1 = winnerIndex;
          } else if (index === 1) {
            nextMatch.player2 = winnerIndex;
          }
        } else {
          // Regular advancement - use standard position logic
          const index = feedingViaWin.findIndex((m) => m.id === match.id);
          if (index === 0) {
            nextMatch.player1 = winnerIndex;
          } else if (index === 1) {
            nextMatch.player2 = winnerIndex;
          }
        }

        if (nextMatch.player1 !== null && nextMatch.player2 !== null) {
          nextMatch.isPlaceholder = false;
        }
      }
    }

    // Advance loser to losers bracket
    if (match.feedsIntoLoss || match.feedsIntoLoss === 0) {
      const nextMatch = this.matches.find((m) => m.id === match.feedsIntoLoss);
      if (nextMatch) {
        // In merge rounds, losers from winners bracket should go to player2
        // (player1 is reserved for winners from previous losers round)
        const feedingViaWin = this.matches.filter((m) => m.feedsIntoWin === match.feedsIntoLoss);
        const feedingViaLoss = this.matches.filter((m) => m.feedsIntoLoss === match.feedsIntoLoss);

        if (feedingViaWin.length > 0) {
          // This is a merge round - assign to player2 (player1 is for feedsIntoWin)
          const index = feedingViaLoss.findIndex((m) => m.id === match.id);
          if (index === 0) {
            nextMatch.player2 = loserIndex;
          } else if (index === 1) {
            // If there are multiple losers feeding in, this shouldn't happen in standard bracket
            nextMatch.player1 = loserIndex;
          }
        } else {
          // Regular losers bracket advancement - use standard position logic
          const index = feedingViaLoss.findIndex((m) => m.id === match.id);
          if (index === 0) {
            nextMatch.player1 = loserIndex;
          } else if (index === 1) {
            nextMatch.player2 = loserIndex;
          }
        }

        if (nextMatch.player1 !== null && nextMatch.player2 !== null) {
          nextMatch.isPlaceholder = false;
        }
      }
    }
  }

  /**
   * Clear advancement when a match result is changed/cleared
   */
  clearAdvancementFromMatch(match) {
    // Handle Double Elimination
    if (match.feedsIntoWin !== undefined || match.feedsIntoLoss !== undefined) {
      this.clearDoubleEliminationAdvancement(match);
      return;
    }

    // Handle Single Elimination
    if (!match.feedsInto && match.feedsInto !== 0) return;

    // Get the next match
    const nextMatch = this.matches.find((m) => m.id === match.feedsInto);
    if (!nextMatch) return;

    // Find which player in next match came from this match
    const potentialWinners = [match.player1, match.player2];

    if (potentialWinners.includes(nextMatch.player1)) {
      nextMatch.player1 = null;
    }
    if (potentialWinners.includes(nextMatch.player2)) {
      nextMatch.player2 = null;
    }

    // If either player is now null, mark as placeholder
    if (nextMatch.player1 === null || nextMatch.player2 === null) {
      nextMatch.isPlaceholder = true;
      // Also clear the match result
      nextMatch.winner = null;
      nextMatch.games = [null, null, null];
    }
  }

  /**
   * Clear double elimination advancements
   */
  clearDoubleEliminationAdvancement(match) {
    const potentialPlayers = [match.player1, match.player2];

    // Clear from winners bracket next match
    if (match.feedsIntoWin || match.feedsIntoWin === 0) {
      const nextWinnersMatch = this.matches.find((m) => m.id === match.feedsIntoWin);
      if (nextWinnersMatch) {
        if (potentialPlayers.includes(nextWinnersMatch.player1)) {
          nextWinnersMatch.player1 = null;
        }
        if (potentialPlayers.includes(nextWinnersMatch.player2)) {
          nextWinnersMatch.player2 = null;
        }
        if (nextWinnersMatch.player1 === null || nextWinnersMatch.player2 === null) {
          nextWinnersMatch.isPlaceholder = true;
          nextWinnersMatch.winner = null;
          nextWinnersMatch.games = [null, null, null];
        }
      }
    }

    // Clear from losers bracket next match
    if (match.feedsIntoLoss || match.feedsIntoLoss === 0) {
      const nextLosersMatch = this.matches.find((m) => m.id === match.feedsIntoLoss);
      if (nextLosersMatch) {
        if (potentialPlayers.includes(nextLosersMatch.player1)) {
          nextLosersMatch.player1 = null;
        }
        if (potentialPlayers.includes(nextLosersMatch.player2)) {
          nextLosersMatch.player2 = null;
        }
        if (nextLosersMatch.player1 === null || nextLosersMatch.player2 === null) {
          nextLosersMatch.isPlaceholder = true;
          nextLosersMatch.winner = null;
          nextLosersMatch.games = [null, null, null];
        }
      }
    }
  }

  /**
   * Convert matches to Firebase format
   */
  getMatchesForFirebase() {
    const matchesObject = {};
    this.matches.forEach((match, index) => {
      matchesObject[index] = match;
    });
    return matchesObject;
  }

  /**
   * Check if current stage is complete
   */
  isCurrentStageComplete() {
    const formatHandler = tournamentFormats.factory.create(this.format);

    // For Swiss format, check if current round is complete
    if (this.format === TOURNAMENT_FORMATS.SWISS) {
      return this.isCurrentSwissRoundComplete();
    }

    // For Group Stage, check based on current stage
    if (this.format === TOURNAMENT_FORMATS.GROUP_STAGE) {
      const stage = this.currentStage || 'groups';
      const stageMatches = this.matches.filter((m) => m.stage === stage);
      return stageMatches.every((m) => m.winner !== null || m.isPlaceholder);
    }

    // For other formats, use format handler's method
    return formatHandler.isStageComplete(this.matches);
  }

  /**
   * Check if current Swiss round is complete
   */
  isCurrentSwissRoundComplete() {
    const currentRound = this.getCurrentSwissRound();
    if (!currentRound) return false;

    const roundMatches = this.matches.filter(
      (m) => m.round === currentRound && !m.isPlaceholder
    );

    return roundMatches.every((m) => m.winner !== null || m.isBye);
  }

  /**
   * Get current Swiss round number
   */
  getCurrentSwissRound() {
    const swissMatches = this.matches.filter(
      (m) => m.round !== undefined && !m.isPlaceholder
    );
    if (swissMatches.length === 0) return null;

    const completedMatches = swissMatches.filter((m) => m.winner !== null);
    if (completedMatches.length === 0) return 1;

    const maxCompletedRound = Math.max(...completedMatches.map((m) => m.round));
    const maxRound = Math.max(...swissMatches.map((m) => m.round));

    // If all matches in max completed round are done, we're ready for next round
    const maxCompletedRoundMatches = swissMatches.filter(
      (m) => m.round === maxCompletedRound
    );
    const allDone = maxCompletedRoundMatches.every((m) => m.winner !== null);

    return allDone && maxCompletedRound < maxRound
      ? maxCompletedRound + 1
      : maxCompletedRound;
  }

  /**
   * Check if tournament can advance to next stage
   */
  canAdvanceStage() {
    if (!this.isCurrentStageComplete()) return false;

    const formatHandler = tournamentFormats.factory.create(this.format);

    // Check if there is a next stage
    const nextStage = formatHandler.getNextStage(this.currentStage, {
      matches: this.matches,
      players: this.players,
      formatConfig: this.formatConfig,
    });

    return nextStage !== null;
  }

  /**
   * Advance to next stage
   */
  async advanceToNextStage() {
    if (!this.canAdvanceStage()) {
      return { success: false, error: 'Cannot advance stage' };
    }

    const formatHandler = tournamentFormats.factory.create(this.format);

    // Swiss: Generate next round
    if (this.format === TOURNAMENT_FORMATS.SWISS) {
      return this.generateNextSwissRound();
    }

    // Group Stage: Advance to playoffs
    if (this.format === TOURNAMENT_FORMATS.GROUP_STAGE) {
      return this.advanceToPlayoffs();
    }

    return { success: false, error: 'Stage advancement not supported for this format' };
  }

  /**
   * Generate next Swiss round pairings
   */
  generateNextSwissRound() {
    const currentRound = this.getCurrentSwissRound();
    const nextRound = currentRound + 1;

    // Check if next round exists
    const hasNextRound = this.matches.some(
      (m) => m.round === nextRound && m.isPlaceholder
    );
    if (!hasNextRound) {
      return { success: false, error: 'No more rounds available' };
    }

    // Get current standings
    const { rankedStats } = this.getStandings();

    // Get format handler to generate pairings
    const formatHandler = tournamentFormats.factory.create(this.format);

    // Get all previous pairings to avoid repeats
    const previousPairings = this.matches
      .filter((m) => !m.isPlaceholder && !m.isBye)
      .map((m) => [m.player1, m.player2]);

    // Generate next round pairings
    const pairings = formatHandler.generateSwissRoundPairings(
      rankedStats,
      previousPairings
    );

    // Update placeholder matches with new pairings
    const nextRoundMatches = this.matches.filter(
      (m) => m.round === nextRound && m.isPlaceholder
    );

    pairings.forEach((pairing, index) => {
      if (nextRoundMatches[index]) {
        nextRoundMatches[index].player1 = pairing[0];
        nextRoundMatches[index].player2 = pairing[1];
        nextRoundMatches[index].isPlaceholder = false;
        nextRoundMatches[index].isBye = pairing[1] === null;
        if (pairing[1] === null) {
          nextRoundMatches[index].winner = 1; // Auto-win for bye
        }
      }
    });

    // Invalidate cache
    this.standingsCache = null;
    this.standingsCacheHash = null;

    return { success: true, round: nextRound };
  }

  /**
   * Advance from group stage to playoffs
   */
  advanceToPlayoffs() {
    if (this.currentStage !== 'groups' && this.currentStage !== null) {
      return { success: false, error: 'Not in group stage' };
    }

    // Get group standings
    const formatHandler = tournamentFormats.factory.create(this.format);
    const standings = formatHandler.calculateStandings(
      this.matches,
      this.players,
      { ...this.formatConfig, currentStage: 'groups' }
    );

    // Group players by group
    const groups = {};
    standings.forEach((stat) => {
      if (stat.group) {
        if (!groups[stat.group]) groups[stat.group] = [];
        groups[stat.group].push(stat);
      }
    });

    // Sort each group by points
    Object.keys(groups).forEach((groupName) => {
      groups[groupName].sort((a, b) => b.points - a.points);
    });

    // Get advancing players (top N from each group)
    const advancingPerGroup = this.formatConfig.advancingPerGroup || 2;
    const advancingPlayers = [];

    Object.keys(groups)
      .sort()
      .forEach((groupName) => {
        const groupPlayers = groups[groupName].slice(0, advancingPerGroup);
        advancingPlayers.push(...groupPlayers.map((p) => p.playerIndex));
      });

    // Seed playoff bracket
    const playoffMatches = this.matches.filter((m) => m.stage === 'playoffs');

    // Simple seeding: alternate groups
    // Group A top → seed 1, Group B top → seed 2, Group A 2nd → seed 3, etc.
    const seededPlayers = [];
    for (let i = 0; i < advancingPerGroup; i++) {
      Object.keys(groups)
        .sort()
        .forEach((groupName) => {
          if (groups[groupName][i]) {
            seededPlayers.push(groups[groupName][i].playerIndex);
          }
        });
    }

    // Fill playoff bracket first round
    const firstRoundMatches = playoffMatches.filter((m) => m.round === 1);
    for (let i = 0; i < firstRoundMatches.length && i * 2 < seededPlayers.length; i++) {
      firstRoundMatches[i].player1 = seededPlayers[i * 2];
      firstRoundMatches[i].player2 = seededPlayers[i * 2 + 1] || null;
      firstRoundMatches[i].isPlaceholder = false;
      if (seededPlayers[i * 2 + 1] === undefined) {
        firstRoundMatches[i].isBye = true;
        firstRoundMatches[i].winner = 1;
      }
    }

    // Update current stage
    this.currentStage = 'playoffs';

    // Invalidate cache
    this.standingsCache = null;
    this.standingsCacheHash = null;

    return { success: true, stage: 'playoffs', advancingPlayers };
  }

  /**
   * Generate unique tournament code
   */
  static generateTournamentCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < APP_CONFIG.TOURNAMENT_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

// Create global instance
const tournamentManager = new TournamentManager();
