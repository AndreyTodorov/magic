/**
 * MAIN APPLICATION CONTROLLER
 * Orchestrates all modules and handles user interactions
 */

class App {
  constructor() {
    this.unsubscribeTournament = null;
    this.debounceTimeout = null;
    this.renderDebounceTimeout = null;
    this.lastRenderedView = null;
    this.pendingRenderFrame = null;
    this.lastMatchUpdate = null; // Track which match was just updated
  }

  /**
   * Initialize application
   */
  async init() {
    logger.info("App", "Initializing Magic Mikes Tournament");

    // Cache DOM elements
    uiManager.cacheElements();

    // Initialize Firebase
    const firebaseOk = await firebaseManager.initialize();
    if (!firebaseOk) {
      logger.error("App", "Firebase initialization failed");
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Initialize UI state
    this.initializeUIState();

    // Initially hide mode selector until we know auth state
    // The auth state change handler will show it when appropriate
    const modeSelector = document.getElementById("modeSelector");
    if (modeSelector) {
      modeSelector.style.display = "none";
    }

    // Manually trigger auth state handler to set initial UI state
    this.handleAuthStateChange(authManager.currentUser);

    // Attempt to rejoin tournament
    await this.attemptRejoin();

    logger.info("App", "Application initialized successfully");
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Auth tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.handleAuthTabSwitch(e));
    });

    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', (e) =>
      this.handleLogin(e)
    );

    // Signup form
    document.getElementById('signupForm')?.addEventListener('submit', (e) =>
      this.handleSignup(e)
    );

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () =>
      this.handleLogout()
    );

    // Forgot password
    document.getElementById('forgotPasswordBtn')?.addEventListener('click', () =>
      this.handleForgotPassword()
    );

    // Listen to auth state changes
    authManager.onAuthStateChange((user) => {
      this.handleAuthStateChange(user);
    });

    // Mode selection
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleModeSelection(e));
    });

    // View tabs (Schedule / Standings / Matches)
    // Only render the new view when switching tabs for better performance
    uiManager.elements.tabSchedule?.addEventListener("click", () => {
      if (uiManager.switchView("schedule")) {
        // Force full render when switching views, clear last match update
        this.lastMatchUpdate = null;
        this.renderTournament(true);
      }
    });
    uiManager.elements.tabStandings?.addEventListener("click", () => {
      if (uiManager.switchView("standings")) {
        // Force full render when switching views, clear last match update
        this.lastMatchUpdate = null;
        this.renderTournament(true);
      }
    });
    uiManager.elements.tabMatches?.addEventListener("click", () => {
      if (uiManager.switchView("matches")) {
        // Force full render when switching views, clear last match update
        this.lastMatchUpdate = null;
        this.renderTournament(true);
      }
    });

    // Join form
    uiManager.elements.joinForm?.addEventListener("submit", (e) =>
      this.handleJoinSubmit(e)
    );

    // Real-time tournament code validation
    uiManager.elements.tournamentCode?.addEventListener("input", (e) => {
      this.validateTournamentCodeInput(e.target);
    });

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

    // Scroll to top button
    const scrollToTopBtn = document.getElementById("scrollToTop");
    if (scrollToTopBtn) {
      // Show/hide button based on scroll position
      window.addEventListener("scroll", () => {
        if (window.pageYOffset > 300) {
          scrollToTopBtn.classList.add("visible");
        } else {
          scrollToTopBtn.classList.remove("visible");
        }
      });

      // Scroll to top when clicked
      scrollToTopBtn.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }

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

    // Format selection (event delegation)
    document.addEventListener("click", (e) => {
      // Format card click
      if (e.target.closest(".format-card")) {
        const card = e.target.closest(".format-card");
        const formatType = card.dataset.formatType;
        this.handleFormatSelection(formatType);
      }
    });

    // Back to mode selector from format selection
    uiManager.elements.backToModeBtn?.addEventListener("click", () => {
      uiManager.showSection("modeSelector");
      // Clear mode button selection
      document.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
    });

    // Back to format selection from create section
    uiManager.elements.backToFormatBtn?.addEventListener("click", () => {
      uiManager.renderFormatCards();
      uiManager.showSection(["modeSelector", "formatSelectionSection"]);
    });

    // Game result buttons (event delegation for security)
    document.addEventListener("click", (e) => {
      if (e.target.matches(".game-result") && !e.target.disabled) {
        const matchId = parseInt(e.target.dataset.matchId);
        const gameNum = parseInt(e.target.dataset.gameNum);
        const playerNum = parseInt(e.target.dataset.playerNum);
        if (!isNaN(matchId) && !isNaN(gameNum) && !isNaN(playerNum)) {
          this.recordGame(matchId, gameNum, playerNum);
        }
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

    // Show auth section by default if not logged in
    // This ensures the login form is visible on initial load
    const authSection = document.getElementById('authSection');
    if (authSection && !authManager.isSignedIn()) {
      authSection.style.display = 'block';
    }
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
      // Show format selection instead of going directly to create
      uiManager.renderFormatCards();
      uiManager.showSection(["modeSelector", "formatSelectionSection"]);
    } else if (mode === "join") {
      uiManager.showSection(["modeSelector", "joinSection"]);
    }
  }

  /**
   * Handle format selection
   */
  handleFormatSelection(formatType) {
    // Set selected format in UI manager
    uiManager.setSelectedFormat(formatType);

    // Show create section
    uiManager.showSection(["modeSelector", "createSection"]);

    // Update player count change to refresh format config
    const playerCount = parseInt(uiManager.elements.playerCount.value);
    this.handlePlayerCountChange();
  }

  /**
   * Handle player count change
   */
  handlePlayerCountChange() {
    const playerCount = parseInt(uiManager.elements.playerCount.value);

    // Update format config if format is selected
    if (uiManager.selectedFormat) {
      const format = tournamentFormats.factory.create(uiManager.selectedFormat);
      uiManager.renderFormatConfig(format);
    }

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
   * Validate tournament code input in real-time
   */
  validateTournamentCodeInput(input) {
    if (!input) return;

    // Auto-uppercase
    const value = input.value.toUpperCase();
    if (value !== input.value) {
      input.value = value;
    }

    // Clear previous validation
    uiManager.clearError("joinError");
    input.classList.remove("form-input--error", "form-input--success");

    // Validate format
    if (value.length > 0) {
      const isValid = /^[A-Z0-9]{0,8}$/.test(value);

      if (!isValid) {
        input.classList.add("form-input--error");
        uiManager.showError(
          "joinError",
          "Code must be 8 characters (letters and numbers only)",
          0
        );
      } else if (value.length === 8) {
        input.classList.add("form-input--success");
      }
    }

    // Enable/disable submit button
    const isComplete = value.length === 8 && /^[A-Z0-9]{8}$/.test(value);
    if (uiManager.elements.joinSubmitBtn) {
      uiManager.elements.joinSubmitBtn.disabled = !isComplete;
    }
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
      logger.error("App", "Failed to join tournament", error);
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

    // Load tournament data (works for everyone, auth not required)
    const tournamentData = await firebaseManager.getTournamentData(code);
    tournamentManager.loadTournament(tournamentData);
    tournamentManager.currentTournamentCode = code;
    tournamentManager.isCreator = false;

    // Only add to members list if user is authenticated
    // Unauthenticated users can view and update scores without being members
    if (authManager.isSignedIn()) {
      try {
        await firebaseManager.joinTournament(code);
        logger.info("App", `Joined as member: ${code}`);
      } catch (error) {
        logger.warn("App", "Could not join as member (continuing as viewer)", error);
      }
    } else {
      logger.info("App", `Viewing tournament as guest: ${code}`);
    }

    // Update UI
    uiManager.showSection("tournamentSection");
    uiManager.displayTournamentCode(code);
    uiManager.elements.gamesPerPlayer.textContent =
      tournamentManager.matchesPerPlayer;

    // Hide auth section and mode selector when in tournament
    const authSection = document.getElementById('authSection');
    const modeSelector = document.getElementById('modeSelector');
    if (authSection) {
      authSection.style.display = 'none';
    }
    if (modeSelector) {
      modeSelector.style.display = 'none';
    }

    // Show guest indicator if not logged in
    const viewingStatus = document.getElementById('viewingStatus');
    if (viewingStatus) {
      viewingStatus.style.display = authManager.isSignedIn() ? 'none' : 'flex';
    }

    // Start listening to updates
    this.startTournamentListener(code);

    // Render tournament
    this.renderTournament();

    // Save session
    this.saveTournamentSession(code, false);

    logger.info("App", `Successfully joined tournament: ${code}`);
  }

  /**
   * Handle generate tournament
   */
  async handleGenerateTournament() {
    if (!firebaseManager.isInitialized) {
      uiManager.showAlert(
        "Firebase is not configured. Please check the console.",
        "error"
      );
      return;
    }

    const playerCount = parseInt(uiManager.elements.playerCount.value);

    // Validate player names
    if (!uiManager.checkDuplicateNames(playerCount)) {
      uiManager.showAlert(
        "Please fix duplicate or empty player names",
        "error"
      );
      return;
    }

    // Collect and sanitize player names
    const playerNames = [];
    for (let i = 1; i <= playerCount; i++) {
      const input = document.getElementById(`p${i}`);
      const name = input?.value;
      if (!name || !name.trim()) {
        uiManager.showAlert(`Please enter a name for Player ${i}`, "error");
        return;
      }
      const sanitized = tournamentManager.sanitizePlayerName(name);
      if (!sanitized) {
        uiManager.showAlert(
          `Player ${i} name contains only invalid characters`,
          "error"
        );
        return;
      }
      playerNames.push(sanitized);
    }

    uiManager.setButtonLoading(
      uiManager.elements.generateBtn,
      true,
      "🔄 Generating..."
    );

    try {
      await this.createTournament(playerNames);
    } catch (error) {
      logger.error("App", "Failed to create tournament", error);
      uiManager.showAlert(
        "Error creating tournament. Please try again.",
        "error"
      );
    } finally {
      uiManager.setButtonLoading(uiManager.elements.generateBtn, false);
    }
  }

  /**
   * Create new tournament
   */
  async createTournament(playerNames) {
    // Get selected format and config from UI
    const selectedFormat = uiManager.selectedFormat || APP_CONFIG.FORMATS.DEFAULT;
    const formatConfig = uiManager.getFormatConfig();

    // For round-robin backward compatibility
    const matchesPerPlayer = parseInt(
      uiManager.elements.matchesPerPlayer.value
    ) || formatConfig.matchesPerPlayer || 3;

    // Generate matches using selected format
    tournamentManager.createTournament(
      playerNames,
      matchesPerPlayer,
      selectedFormat,
      formatConfig
    );

    // Generate unique code
    const code = TournamentManager.generateTournamentCode();
    tournamentManager.currentTournamentCode = code;
    tournamentManager.isCreator = true;

    // Save to Firebase with format data
    const matchesObject = tournamentManager.getMatchesForFirebase();
    await firebaseManager.createTournament(code, {
      players: playerNames,
      matches: matchesObject,
      matchesPerPlayer: matchesPerPlayer,
      format: tournamentManager.format,
      formatConfig: tournamentManager.formatConfig,
      currentStage: tournamentManager.currentStage,
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

    logger.info("App", `Successfully created tournament: ${code}`);
  }

  /**
   * Start listening to tournament updates
   */
  startTournamentListener(code) {
    // Unsubscribe from previous tournament if any
    if (this.unsubscribeTournament) {
      logger.debug("App", "Cleaning up previous tournament listener");
      this.unsubscribeTournament();
      this.unsubscribeTournament = null;
    }

    // Ensure we're listening to the correct tournament
    const currentCode = code;
    logger.debug("App", `Starting listener for tournament: ${code}`);

    this.unsubscribeTournament = firebaseManager.onTournamentUpdate(
      code,
      (data) => {
        // Ignore updates if we've switched tournaments
        if (tournamentManager.currentTournamentCode !== currentCode) {
          logger.debug(
            "App",
            `Ignoring update from old tournament ${currentCode}`
          );
          return;
        }

        if (!data) {
          uiManager.showAlert("Tournament has been deleted.", "warning");
          this.leaveTournament();
          return;
        }

        // Update tournament data
        tournamentManager.loadTournament(data);

        // Use requestAnimationFrame for smoother updates on mobile
        // This ensures updates happen on the next frame, avoiding jank
        if (this.pendingRenderFrame) {
          cancelAnimationFrame(this.pendingRenderFrame);
        }

        this.pendingRenderFrame = requestAnimationFrame(() => {
          this.renderTournament();
          this.pendingRenderFrame = null;
        });
      }
    );
  }

  /**
   * Render complete tournament view
   * OPTIMIZED: Only renders the currently visible view and uses incremental updates
   */
  renderTournament(forceFullRender = false) {
    const { players, matches, matchesPerPlayer } = tournamentManager;

    // Only render the currently visible view for better mobile performance
    const currentView = uiManager.currentView;

    // Try incremental update for matches view if only one match changed
    if (!forceFullRender && currentView === "matches" && this.lastMatchUpdate !== null) {
      const matchId = this.lastMatchUpdate;
      const match = matches[matchId];
      if (match && uiManager.updateSingleMatch(matchId, match, players)) {
        // Successfully updated single match, skip full render
        this.lastMatchUpdate = null;
        // Still need to update progress bar
        const progress = tournamentManager.getProgress();
        uiManager.updateProgress(progress.completed, progress.total);
        return;
      }
      // Fall through to full render if incremental update failed
      this.lastMatchUpdate = null;
    }

    // Full render for view
    const progress = tournamentManager.getProgress();
    const isComplete = progress.completed === progress.total && progress.total > 0;

    if (currentView === "schedule") {
      uiManager.renderSchedule(players, matches);
    } else if (currentView === "matches") {
      uiManager.renderMatches(matches, players);
    } else if (currentView === "standings") {
      const { rankedStats, tiedRanks } = tournamentManager.getStandings();
      uiManager.renderStandings(rankedStats, tiedRanks, players, isComplete);
    }

    // Update progress (lightweight operation)
    // Auto-collapse the code display once any matches have been completed.
    // If the user manually collapsed/expanded the code display, respect
    // their choice unless we need to force (for example, when at least one
    // match is completed we force it closed).
    try {
      if (progress.completed > 0) {
        // At least one completed match -> force collapse so it doesn't take
        // space after play has started.
        uiManager.setCodeDisplayCollapsed({ collapsed: true, force: true });
      } else {
        // No completed matches: try to expand programmatically only if the
        // user hasn't explicitly toggled the control. Do not force expansion
        // because the user may have chosen to keep it closed.
        uiManager.setCodeDisplayCollapsed({ collapsed: false, force: false });
      }
    } catch (err) {
      // Ignore if UI manager not ready (on initial load)
      console.warn("Failed to toggle code display:", err);
    }
    uiManager.updateProgress(progress.completed, progress.total);
  }

  /**
   * Record game result
   */
  async recordGame(matchId, gameNum, winner) {
    const result = tournamentManager.updateMatchGame(matchId, gameNum, winner);

    if (result.error) {
      uiManager.showAlert(result.error, "warning");
      return;
    }

    if (!result.updated) return;

    // Track which match was updated for incremental rendering
    this.lastMatchUpdate = matchId;

    // Update Firebase
    try {
      await firebaseManager.updateMatch(
        tournamentManager.currentTournamentCode,
        matchId,
        result.match
      );
    } catch (error) {
      logger.error("App", "Failed to update match", error);
      uiManager.showAlert("Error updating match. Please try again.", "error");
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

    // Show auth section and mode selector after leaving
    const authSection = document.getElementById('authSection');
    const modeSelector = document.getElementById('modeSelector');

    if (authSection && !authManager.isSignedIn()) {
      authSection.style.display = 'block';
    }

    if (modeSelector) {
      modeSelector.style.display = 'flex';
    }

    logger.info("App", "Left tournament");
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

  /**
   * Handle auth tab switching (Login/Signup)
   */
  handleAuthTabSwitch(event) {
    const mode = event.target.dataset.authMode;
    if (!mode) return;

    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    event.target.classList.add('active');

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (mode === 'login') {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    }
  }

  /**
   * Handle login
   */
  async handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    uiManager.setButtonLoading(loginBtn, true, '🔄 Logging in...');
    uiManager.clearError('loginError');

    try {
      const result = await authManager.signIn(email, password);

      if (result.success) {
        logger.info('App', 'User logged in successfully');
        // Auth state change handler will update UI
      } else {
        uiManager.showError('loginError', result.error);
      }
    } finally {
      uiManager.setButtonLoading(loginBtn, false);
    }
  }

  /**
   * Handle signup
   */
  async handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const signupBtn = document.getElementById('signupBtn');

    uiManager.setButtonLoading(signupBtn, true, '🔄 Creating account...');
    uiManager.clearError('signupError');

    try {
      const result = await authManager.signUp(email, password, name);

      if (result.success) {
        logger.info('App', 'User signed up successfully');
        // Auth state change handler will update UI
      } else {
        uiManager.showError('signupError', result.error);
      }
    } finally {
      uiManager.setButtonLoading(signupBtn, false);
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
      return;
    }

    // Leave current tournament if any
    if (tournamentManager.currentTournamentCode) {
      this.leaveTournament();
    }

    const result = await authManager.signOut();
    if (result.success) {
      logger.info('App', 'User logged out');
    }
  }

  /**
   * Handle forgot password
   */
  async handleForgotPassword() {
    const email = prompt('Enter your email address:');
    if (!email) return;

    const result = await authManager.resetPassword(email);

    if (result.success) {
      alert('Password reset email sent! Check your inbox.');
    } else {
      alert('Error: ' + result.error);
    }
  }

  /**
   * Handle auth state changes
   */
  handleAuthStateChange(user) {
    const authSection = document.getElementById('authSection');
    const userInfo = document.getElementById('userInfo');
    const modeSelector = document.getElementById('modeSelector');
    const createBtn = document.querySelector('[data-mode="create"]');
    const inTournament = tournamentManager.currentTournamentCode !== null;

    if (user) {
      // User is logged in
      // Only hide auth section if not in tournament (tournament hides it separately)
      if (authSection && !inTournament) authSection.style.display = 'none';
      if (userInfo) userInfo.style.display = 'flex';

      // Only show mode selector if not in tournament
      if (modeSelector && !inTournament) modeSelector.style.display = 'flex';

      // Update user display name
      const userName = document.getElementById('userName');
      if (userName) {
        userName.textContent = authManager.getDisplayName();
      }

      // Show and enable create tournament button
      if (createBtn) {
        createBtn.style.display = 'block';
        createBtn.disabled = false;
        createBtn.title = '';
      }
    } else {
      // User is logged out
      // Only show auth section if not in a tournament
      if (authSection && !inTournament) authSection.style.display = 'block';
      if (userInfo) userInfo.style.display = 'none';

      // Only show mode selector if not in tournament
      if (modeSelector && !inTournament) modeSelector.style.display = 'flex';

      // Hide create tournament button when not logged in
      if (createBtn) {
        createBtn.style.display = 'none';
      }
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
