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
  }

  /**
   * Reset tournament state
   */
  reset() {
    this.players = [];
    this.matches = [];
    this.currentTournamentCode = null;
    this.isCreator = false;
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
   */
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

  /**
   * Load tournament from Firebase data
   */
  loadTournament(tournamentData) {
    this.players = tournamentData.players;
    this.playerCount = this.players.length;
    this.matchesPerPlayer = tournamentData.matchesPerPlayer;

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
   * Get complete standings with rankings
   */
  getStandings() {
    const stats = this.calculatePlayerStats();
    const sortedStats = this.rankPlayers(stats);
    return this.assignRanks(sortedStats);
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
    } else {
      // No winner yet
      match.winner = null;
    }

    return { match, updated: true };
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
