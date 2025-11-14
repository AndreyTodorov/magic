/**
 * LOCAL STORAGE MANAGER
 * Drop-in replacement for FirebaseManager for local testing
 * Uses browser localStorage instead of Firebase Realtime Database
 */

class LocalStorageManager {
  constructor() {
    this.isInitialized = true; // Always ready
    this.currentUser = { uid: "local-user-" + Date.now() }; // Mock user
    this.listeners = new Map(); // Store update listeners
    this.storageKey = "magic_mikes_tournaments";
  }

  /**
   * Initialize (mock - always succeeds)
   */
  async initialize() {
    console.log("✓ LocalStorage mode initialized (offline mode)");
    this.updateConnectionStatus(true);
    return true;
  }

  /**
   * Update connection status UI
   */
  updateConnectionStatus(connected) {
    const statusEl = document.getElementById("connectionStatus");
    const statusText = document.getElementById("statusText");
    const statusDot = statusEl?.querySelector(".status-dot");

    if (!statusEl || !statusText || !statusDot) return;

    statusEl.className = "connection-status connected";
    statusText.textContent = "Local Mode";
    statusDot.className = "status-dot local";
  }

  /**
   * Get all tournaments from localStorage
   */
  getAllTournaments() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Save all tournaments to localStorage
   */
  saveAllTournaments(tournaments) {
    localStorage.setItem(this.storageKey, JSON.stringify(tournaments));

    // Trigger listeners
    this.triggerListeners();
  }

  /**
   * Check if tournament exists
   */
  async tournamentExists(tournamentCode) {
    const tournaments = this.getAllTournaments();
    return tournaments[tournamentCode] !== undefined;
  }

  /**
   * Create new tournament
   */
  async createTournament(tournamentCode, data) {
    const tournaments = this.getAllTournaments();

    const tournamentData = {
      ...data,
      creator: this.currentUser.uid,
      members: { [this.currentUser.uid]: true },
      createdAt: Date.now(),
    };

    tournaments[tournamentCode] = tournamentData;
    this.saveAllTournaments(tournaments);

    console.log("✓ Tournament created (local):", tournamentCode);
    return true;
  }

  /**
   * Join existing tournament
   */
  async joinTournament(tournamentCode) {
    const tournaments = this.getAllTournaments();

    if (!tournaments[tournamentCode]) {
      throw new Error("Tournament not found");
    }

    if (!tournaments[tournamentCode].members) {
      tournaments[tournamentCode].members = {};
    }

    tournaments[tournamentCode].members[this.currentUser.uid] = true;
    this.saveAllTournaments(tournaments);

    console.log("✓ Joined tournament (local):", tournamentCode);
    return true;
  }

  /**
   * Get tournament data
   */
  async getTournamentData(tournamentCode) {
    const tournaments = this.getAllTournaments();
    return tournaments[tournamentCode] || null;
  }

  /**
   * Update match data
   */
  async updateMatch(tournamentCode, matchId, matchData) {
    const tournaments = this.getAllTournaments();

    if (!tournaments[tournamentCode]) {
      throw new Error("Tournament not found");
    }

    if (!tournaments[tournamentCode].matches) {
      tournaments[tournamentCode].matches = {};
    }

    tournaments[tournamentCode].matches[matchId] = matchData;
    this.saveAllTournaments(tournaments);
    this.triggerListeners();

    return true;
  }

  /**
   * Update tournament data (partial update)
   */
  async updateTournament(tournamentCode, updates) {
    const tournaments = this.getAllTournaments();

    if (!tournaments[tournamentCode]) {
      throw new Error("Tournament not found");
    }

    // Merge updates into existing tournament
    Object.assign(tournaments[tournamentCode], updates);
    this.saveAllTournaments(tournaments);
    this.triggerListeners();

    return true;
  }

  /**
   * Listen to tournament updates (simulated)
   */
  onTournamentUpdate(tournamentCode, callback) {
    // Store callback
    if (!this.listeners.has(tournamentCode)) {
      this.listeners.set(tournamentCode, []);
    }
    this.listeners.get(tournamentCode).push(callback);

    // Immediately call with current data
    const tournaments = this.getAllTournaments();
    callback(tournaments[tournamentCode] || null);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(tournamentCode);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Trigger all listeners (when data changes)
   */
  triggerListeners() {
    const tournaments = this.getAllTournaments();

    this.listeners.forEach((callbacks, tournamentCode) => {
      const data = tournaments[tournamentCode] || null;
      callbacks.forEach((callback) => callback(data));
    });
  }

  /**
   * Stop listening to tournament updates
   */
  offTournamentUpdate(tournamentCode) {
    this.listeners.delete(tournamentCode);
  }

  /**
   * Delete tournament
   */
  async deleteTournament(tournamentCode) {
    const tournaments = this.getAllTournaments();
    delete tournaments[tournamentCode];
    this.saveAllTournaments(tournaments);

    console.log("✓ Tournament deleted (local):", tournamentCode);
    return true;
  }

  /**
   * Check if current user is tournament creator
   */
  async isCreator(tournamentCode) {
    const tournaments = this.getAllTournaments();
    const tournament = tournaments[tournamentCode];
    return tournament && tournament.creator === this.currentUser.uid;
  }

  /**
   * Register callback for connection changes (mock)
   */
  onConnectionChange(callback) {
    // Always connected in local mode
    setTimeout(() => callback(true), 100);
  }

  /**
   * Clear all local tournaments (utility for testing)
   */
  clearAllTournaments() {
    localStorage.removeItem(this.storageKey);
    this.listeners.clear();
    console.log("✓ All local tournaments cleared");
  }

  /**
   * Export tournaments as JSON (for backup/sharing)
   */
  exportTournaments() {
    const tournaments = this.getAllTournaments();
    const dataStr = JSON.stringify(tournaments, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `magic-mikes-tournaments-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    console.log("✓ Tournaments exported");
  }

  /**
   * Import tournaments from JSON file
   */
  importTournaments(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const tournaments = JSON.parse(e.target.result);
          this.saveAllTournaments(tournaments);
          console.log("✓ Tournaments imported");
          resolve(true);
        } catch (error) {
          console.error("Import failed:", error);
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

// Auto-detect mode: Use LocalStorage if Firebase config is not set
let firebaseManager;

if (
  typeof FIREBASE_CONFIG !== "undefined" &&
  FIREBASE_CONFIG.apiKey !== "FIREBASE_API_KEY"
) {
  // Use real Firebase
  console.log("🔥 Using Firebase mode");
  firebaseManager = new FirebaseManager();
} else {
  // Use LocalStorage fallback
  console.log("💾 Using LocalStorage mode (offline)");
  firebaseManager = new LocalStorageManager();

  // Add dev tools to window for debugging
  window.devTools = {
    clearTournaments: () => firebaseManager.clearAllTournaments(),
    exportTournaments: () => firebaseManager.exportTournaments(),
    viewTournaments: () => {
      console.table(firebaseManager.getAllTournaments());
      return firebaseManager.getAllTournaments();
    },
  };

  console.log("%cDev Tools Available:", "color: green; font-weight: bold");
  console.log("• window.devTools.viewTournaments() - View all tournaments");
  console.log("• window.devTools.clearTournaments() - Clear all data");
  console.log("• window.devTools.exportTournaments() - Download backup");
}
