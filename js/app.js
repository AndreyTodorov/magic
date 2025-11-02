/**
 * MAIN APPLICATION CONTROLLER
 * Orchestrates all modules and handles user interactions
 */

class App {
  constructor() {
    this.unsubscribeTournament = null;
    this.debounceTimeout = null;
  }

  /**
   * Initialize application
   */
  async init() {
    console.log("🚀 Initializing Magic Mikes Tournament...");

    // Cache DOM elements
    uiManager.cacheElements();

    // Initialize Firebase
    const firebaseOk = await firebaseManager.initialize();
    if (!firebaseOk) {
      console.error("⚠️ Firebase initialization failed");
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Initialize UI state
    this.initializeUIState();

    // Ensure mode selector is visible on startup (UIManager relies on
    // the 'active' class to show/hide sections). This makes behavior
    // consistent between localStorage (standalone) and Firebase modes.
    uiManager.showSection("modeSelector");

    // Attempt to rejoin tournament
    await this.attemptRejoin();

    console.log("✓ Application initialized successfully");
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Mode selection
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleModeSelection(e));
    });

    // View tabs (Schedule / Standings / Matches)
    uiManager.elements.tabSchedule?.addEventListener("click", () =>
      uiManager.switchView("schedule")
    );
    uiManager.elements.tabStandings?.addEventListener("click", () =>
      uiManager.switchView("standings")
    );
    uiManager.elements.tabMatches?.addEventListener("click", () =>
      uiManager.switchView("matches")
    );

    // Join form
    uiManager.elements.joinForm?.addEventListener("submit", (e) =>
      this.handleJoinSubmit(e)
    );

    // Player count change
    uiManager.elements.playerCount?.addEventListener("change", () =>
      this.handlePlayerCountChange()
    );

    // Matches per player change
    uiManager.elements.matchesPerPlayer?.addEventListener("change", () =>
      this.handleMatchesPerPlayerChange()
    );

    // Generate tournament
    uiManager.elements.generateBtn?.addEventListener("click", () =>
      this.handleGenerateTournament()
    );

    // Copy code
    uiManager.elements.copyCodeBtn?.addEventListener("click", () =>
      uiManager.copyTournamentCode()
    );

    // Leave tournament
    uiManager.elements.leaveTournamentBtn?.addEventListener("click", () =>
      this.handleLeaveTournament()
    );

    // Player input enter key
    document.addEventListener("keydown", (e) => {
      if (e.target.matches("[data-player-index]") && e.key === "Enter") {
        this.handlePlayerInputEnter(e);
      }
    });

    // Duplicate name checking (debounced)
    document.addEventListener("input", (e) => {
      if (e.target.matches("[data-player-index]")) {
        this.debouncedDuplicateCheck();
      }
    });
  }

  /**
   * Initialize UI state
   */
  initializeUIState() {
    const playerCount = parseInt(uiManager.elements.playerCount.value);
    const matchesPerPlayer =
      uiManager.updateMatchesPerPlayerOptions(playerCount);
    tournamentManager.matchesPerPlayer = matchesPerPlayer;
    uiManager.updateTournamentInfo(playerCount, matchesPerPlayer);
    uiManager.renderPlayerInputs(playerCount);
    // Restore or apply previously selected sub-view (matches/schedule/standings)
    uiManager.switchView(uiManager.currentView || "matches");
  }

  /**
   * Handle mode selection (Create vs Join)
   */
  handleModeSelection(event) {
    const mode = event.target.dataset.mode;
    if (!mode) return;

    // Update button states
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    event.target.classList.add("active");

    // Show appropriate section
    if (mode === "create") {
      uiManager.showSection(["modeSelector", "createSection"]);
    } else if (mode === "join") {
      uiManager.showSection(["modeSelector", "joinSection"]);
    }
  }

  /**
   * Handle player count change
   */
  handlePlayerCountChange() {
    const playerCount = parseInt(uiManager.elements.playerCount.value);
    const matchesPerPlayer =
      uiManager.updateMatchesPerPlayerOptions(playerCount);
    tournamentManager.playerCount = playerCount;
    tournamentManager.matchesPerPlayer = matchesPerPlayer;
    uiManager.updateTournamentInfo(playerCount, matchesPerPlayer);
    uiManager.renderPlayerInputs(playerCount);
  }

  /**
   * Handle matches per player change
   */
  handleMatchesPerPlayerChange() {
    const playerCount = parseInt(uiManager.elements.playerCount.value);
    const matchesPerPlayer = parseInt(
      uiManager.elements.matchesPerPlayer.value
    );
    tournamentManager.matchesPerPlayer = matchesPerPlayer;
    uiManager.updateTournamentInfo(playerCount, matchesPerPlayer);
  }

  /**
   * Handle player input enter key
   */
  handlePlayerInputEnter(event) {
    event.preventDefault();
    const currentIndex = parseInt(event.target.dataset.playerIndex);
    const playerCount = parseInt(uiManager.elements.playerCount.value);

    if (currentIndex < playerCount) {
      // Move to next input
      const nextInput = document.getElementById(`p${currentIndex + 1}`);
      if (nextInput) nextInput.focus();
    } else {
      // Last player, trigger generate
      this.handleGenerateTournament();
    }
  }

  /**
   * Debounced duplicate name check
   */
  debouncedDuplicateCheck() {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      const playerCount = parseInt(uiManager.elements.playerCount.value);
      uiManager.checkDuplicateNames(playerCount);
    }, 300);
  }

  /**
   * Handle join tournament form submission
   */
  async handleJoinSubmit(event) {
    event.preventDefault();

    const code = uiManager.elements.tournamentCode.value.trim().toUpperCase();
    if (!code) {
      uiManager.showError("joinError", "Please enter a tournament code");
      return;
    }

    uiManager.setButtonLoading(
      uiManager.elements.joinSubmitBtn,
      true,
      "🔄 Joining..."
    );

    try {
      await this.joinTournament(code);
    } catch (error) {
      console.error("Join error:", error);
      uiManager.showError(
        "joinError",
        error.message || "Failed to join tournament"
      );
    } finally {
      uiManager.setButtonLoading(uiManager.elements.joinSubmitBtn, false);
    }
  }

  /**
   * Join existing tournament
   */
  async joinTournament(code) {
    // Check if tournament exists
    const exists = await firebaseManager.tournamentExists(code);
    if (!exists) {
      throw new Error("Tournament not found. Please check the code.");
    }

    // Join tournament
    await firebaseManager.joinTournament(code);

    // Load tournament data
    const tournamentData = await firebaseManager.getTournamentData(code);
    tournamentManager.loadTournament(tournamentData);
    tournamentManager.currentTournamentCode = code;
    tournamentManager.isCreator = false;

    // Update UI
    uiManager.showSection("tournamentSection");
    uiManager.displayTournamentCode(code);
    uiManager.elements.gamesPerPlayer.textContent =
      tournamentManager.matchesPerPlayer;

    // Start listening to updates
    this.startTournamentListener(code);

    // Render tournament
    this.renderTournament();

    // Save session
    this.saveTournamentSession(code, false);

    console.log("✓ Joined tournament:", code);
  }

  /**
   * Handle generate tournament
   */
  async handleGenerateTournament() {
    if (!firebaseManager.isInitialized) {
      alert("Firebase is not configured. Please check the console.");
      return;
    }

    const playerCount = parseInt(uiManager.elements.playerCount.value);

    // Validate player names
    if (!uiManager.checkDuplicateNames(playerCount)) {
      alert("Please fix duplicate or empty player names");
      return;
    }

    // Collect player names
    const playerNames = [];
    for (let i = 1; i <= playerCount; i++) {
      const input = document.getElementById(`p${i}`);
      const name = input?.value.trim();
      if (!name) {
        alert(`Please enter a name for Player ${i}`);
        return;
      }
      playerNames.push(name);
    }

    uiManager.setButtonLoading(
      uiManager.elements.generateBtn,
      true,
      "🔄 Generating..."
    );

    try {
      await this.createTournament(playerNames);
    } catch (error) {
      console.error("Create error:", error);
      alert("Error creating tournament. Please try again.");
    } finally {
      uiManager.setButtonLoading(uiManager.elements.generateBtn, false);
    }
  }

  /**
   * Create new tournament
   */
  async createTournament(playerNames) {
    const matchesPerPlayer = parseInt(
      uiManager.elements.matchesPerPlayer.value
    );

    // Generate matches
    tournamentManager.createTournament(playerNames, matchesPerPlayer);

    // Generate unique code
    const code = TournamentManager.generateTournamentCode();
    tournamentManager.currentTournamentCode = code;
    tournamentManager.isCreator = true;

    // Save to Firebase
    const matchesObject = tournamentManager.getMatchesForFirebase();
    await firebaseManager.createTournament(code, {
      players: playerNames,
      matches: matchesObject,
      matchesPerPlayer: matchesPerPlayer,
    });

    // Update UI
    uiManager.showSection("tournamentSection");
    uiManager.displayTournamentCode(code);
    uiManager.elements.gamesPerPlayer.textContent = matchesPerPlayer;

    // Start listening to updates
    this.startTournamentListener(code);

    // Render tournament
    this.renderTournament();

    // Save session
    this.saveTournamentSession(code, true);

    console.log("✓ Tournament created:", code);
  }

  /**
   * Start listening to tournament updates
   */
  startTournamentListener(code) {
    // Unsubscribe from previous tournament if any
    if (this.unsubscribeTournament) {
      this.unsubscribeTournament();
    }

    this.unsubscribeTournament = firebaseManager.onTournamentUpdate(
      code,
      (data) => {
        if (!data) {
          alert("Tournament has been deleted.");
          this.handleLeaveTournament();
          return;
        }

        // Update tournament data
        tournamentManager.loadTournament(data);

        // Re-render
        this.renderTournament();
      }
    );
  }

  /**
   * Render complete tournament view
   */
  renderTournament() {
    const { players, matches, matchesPerPlayer } = tournamentManager;

    // Render schedule
    uiManager.renderSchedule(players, matches);

    // Render matches
    uiManager.renderMatches(matches, players);

    // Render standings
    const { rankedStats, tiedRanks } = tournamentManager.getStandings();
    uiManager.renderStandings(rankedStats, tiedRanks, players);

    // Update progress
    const progress = tournamentManager.getProgress();
    // Auto-collapse the code display once any matches have been completed
    try {
      uiManager.setCodeDisplayCollapsed(progress.completed > 0);
    } catch (err) {
      // ignore if UI manager not ready
    }
    uiManager.updateProgress(progress.completed, progress.total);
  }

  /**
   * Record game result
   */
  async recordGame(matchId, gameNum, winner) {
    const result = tournamentManager.updateMatchGame(matchId, gameNum, winner);

    if (result.error) {
      alert(result.error);
      return;
    }

    if (!result.updated) return;

    // Update Firebase
    try {
      await firebaseManager.updateMatch(
        tournamentManager.currentTournamentCode,
        matchId,
        result.match
      );
    } catch (error) {
      console.error("Error updating match:", error);
      alert("Error updating match. Please try again.");
    }
  }

  /**
   * Handle leave tournament
   */
  handleLeaveTournament() {
    if (
      !confirm(
        "Are you sure you want to leave this tournament? You can rejoin using the same code."
      )
    ) {
      return;
    }

    this.leaveTournament();
  }

  /**
   * Leave tournament
   */
  leaveTournament() {
    // Clear session
    this.clearTournamentSession();

    // Unsubscribe from updates
    if (this.unsubscribeTournament) {
      this.unsubscribeTournament();
      this.unsubscribeTournament = null;
    }

    // Reset tournament state
    tournamentManager.reset();

    // Reset UI
    uiManager.resetToInitialState();

    console.log("✓ Left tournament");
  }

  /**
   * Save tournament session to localStorage
   */
  saveTournamentSession(code, isCreator) {
    const keys = SESSION_CONFIG.STORAGE_KEYS;
    localStorage.setItem(keys.TOURNAMENT_CODE, code);
    localStorage.setItem(keys.IS_CREATOR, isCreator.toString());
    localStorage.setItem(keys.SESSION_TIMESTAMP, Date.now().toString());
  }

  /**
   * Clear tournament session from localStorage
   */
  clearTournamentSession() {
    const keys = SESSION_CONFIG.STORAGE_KEYS;
    localStorage.removeItem(keys.TOURNAMENT_CODE);
    localStorage.removeItem(keys.IS_CREATOR);
    localStorage.removeItem(keys.SESSION_TIMESTAMP);
  }

  /**
   * Attempt to rejoin previous tournament
   */
  async attemptRejoin() {
    const keys = SESSION_CONFIG.STORAGE_KEYS;
    const savedCode = localStorage.getItem(keys.TOURNAMENT_CODE);
    const savedIsCreator = localStorage.getItem(keys.IS_CREATOR) === "true";
    const timestamp = parseInt(
      localStorage.getItem(keys.SESSION_TIMESTAMP) || "0"
    );

    // Check if session expired
    const isExpired = Date.now() - timestamp > SESSION_CONFIG.SESSION_TIMEOUT;

    if (!savedCode || isExpired) {
      if (isExpired && savedCode) {
        this.clearTournamentSession();
        console.log("Tournament session expired");
      }
      return;
    }

    console.log("🔄 Attempting to rejoin tournament...");

    try {
      // Check if tournament still exists
      const exists = await firebaseManager.tournamentExists(savedCode);

      if (exists) {
        // Rejoin tournament
        uiManager.elements.tournamentCode.value = savedCode;
        await this.joinTournament(savedCode);
        console.log("✓ Automatically rejoined tournament:", savedCode);
      } else {
        // Tournament no longer exists
        this.clearTournamentSession();
        console.log("Tournament no longer exists");
      }
    } catch (error) {
      console.error("Error rejoining tournament:", error);
      this.clearTournamentSession();
    }
  }
}

// Create global app instance
const app = new App();

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => app.init());
} else {
  app.init();
}
