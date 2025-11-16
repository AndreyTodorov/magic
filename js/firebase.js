/**
 * FIREBASE INITIALIZATION MODULE
 * Handles Firebase app initialization, authentication, and connection monitoring
 */

class FirebaseManager {
  constructor() {
    this.app = null;
    this.database = null;
    this.auth = null;
    this.isInitialized = false;
    this.currentUser = null;
    this.authReadyPromise = null;
    this.connectionCallbacks = [];
    this.statusMinimizeTimeout = null;
  }

  /**
   * Initialize Firebase services
   */
  async initialize() {
    try {
      // Initialize Firebase app
      this.app = firebase.initializeApp(FIREBASE_CONFIG);
      this.database = firebase.database();
      this.auth = firebase.auth();
      this.isInitialized = true;

      // Initialize App Check for security
      this.initializeAppCheck();

      // Setup anonymous authentication
      await this.setupAuthentication();

      // Monitor connection status
      this.monitorConnection();

      if (ENVIRONMENT === 'development') {
        console.log("✓ Firebase initialized successfully");
      }
      return true;
    } catch (error) {
      console.error("Firebase initialization error:", error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Initialize Firebase App Check
   * Automatically enabled in production, disabled in development
   */
  initializeAppCheck() {
    if (!APPCHECK_CONFIG.ENABLED) {
      if (ENVIRONMENT === 'development') {
        console.log(`⚠ App Check disabled in ${ENVIRONMENT} mode`);
      }
      return;
    }

    try {
      // Check if App Check SDK is loaded
      if (!firebase.appCheck) {
        console.warn('⚠ App Check SDK not loaded. Add script to index.html for production.');
        return;
      }

      const appCheck = firebase.appCheck();
      appCheck.activate(APPCHECK_SITE_KEY, true); // true = auto-refresh
      if (ENVIRONMENT === 'development') {
        console.log('✓ App Check activated');
      }
    } catch (error) {
      console.error('App Check activation failed:', error);
    }
  }

  /**
   * Setup authentication based on AUTH_CONFIG
   */
  async setupAuthentication() {
    // Initialize auth manager
    await authManager.initialize(this.auth);

    // If anonymous mode, sign in anonymously
    if (AUTH_CONFIG.MODE === 'anonymous') {
      try {
        await this.auth.signInAnonymously();
      } catch (err) {
        console.warn("Anonymous sign-in failed:", err);
      }
    }

    // Update currentUser when auth state changes
    authManager.onAuthStateChange((user) => {
      this.currentUser = user;
    });

    return authManager.authReadyPromise;
  }

  /**
   * Monitor Firebase connection status
   */
  monitorConnection() {
    const connectedRef = this.database.ref(".info/connected");
    let wasDisconnected = false;

    connectedRef.on("value", (snapshot) => {
      const isConnected = snapshot.val() === true;

      // Update UI
      this.updateConnectionStatus(isConnected);

      // Notify callbacks
      this.connectionCallbacks.forEach((callback) => callback(isConnected));

      if (isConnected) {
        if (wasDisconnected) {
          if (ENVIRONMENT === 'development') {
            console.log("✓ Reconnected to Firebase");
          }
          // Show user-friendly notification
          const statusText = document.getElementById("statusText");
          if (statusText) {
            statusText.textContent = "Reconnected";
            setTimeout(() => {
              if (snapshot.val() === true) {
                statusText.textContent = "Connected";
              }
            }, 2000);
          }
        }
        wasDisconnected = false;
      } else {
        if (ENVIRONMENT === 'development') {
          console.warn("⚠ Disconnected from Firebase");
          console.warn("Troubleshooting tips:");
          console.warn("1. Check Firebase Console → Realtime Database → Data (verify database exists)");
          console.warn("2. Check Firebase Console → Realtime Database → Rules");
          console.warn("3. Verify database URL in config matches your Firebase region");
          console.warn("4. Run window.testFirebaseConnection() in console for detailed diagnostics");
        }
        wasDisconnected = true;
      }
    }, (error) => {
      console.error("❌ Firebase connection monitoring failed:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      if (error.code === 'PERMISSION_DENIED') {
        console.error("⚠️ PERMISSION DENIED - Check your database rules!");
        console.error("Expected rules:", DATABASE_RULES);
      }
    });
  }

  /**
   * Update connection status UI
   * Auto-minimizes to just a dot after 4 seconds of stable connection
   */
  updateConnectionStatus(connected) {
    const statusEl = document.getElementById("connectionStatus");
    const statusText = document.getElementById("statusText");
    const statusDot = statusEl?.querySelector(".status-dot");

    if (!statusEl || !statusText || !statusDot) return;

    // Clear any existing minimize timeout
    clearTimeout(this.statusMinimizeTimeout);

    // Remove minimized class initially to show full status
    statusEl.classList.remove("minimized");

    if (connected) {
      statusEl.className = "connection-status connected";
      statusText.textContent = "Connected";
      statusDot.className = "status-dot connected";

      // Auto-minimize after 4 seconds if connection remains stable
      this.statusMinimizeTimeout = setTimeout(() => {
        statusEl.classList.add("minimized");
      }, 4000);
    } else {
      statusEl.className = "connection-status disconnected";
      statusText.textContent = "Disconnected";
      statusDot.className = "status-dot disconnected";
      // Keep disconnected status visible (don't minimize)
    }
  }

  /**
   * Register callback for connection changes
   */
  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
  }

  /**
   * Get tournament reference
   */
  getTournamentRef(tournamentCode) {
    if (!this.isInitialized) {
      throw new Error("Firebase not initialized");
    }
    return this.database.ref(`tournaments/${tournamentCode}`);
  }

  /**
   * Check if tournament exists
   */
  async tournamentExists(tournamentCode) {
    if (!this.isInitialized) return false;

    try {
      const snapshot = await this.database
        .ref(`tournaments/${tournamentCode}`)
        .once("value");
      return snapshot.exists();
    } catch (error) {
      console.error("Error checking tournament existence:", error);
      return false;
    }
  }

  /**
   * Create new tournament
   */
  async createTournament(tournamentCode, data) {
    if (!this.isInitialized) {
      throw new Error("Firebase not initialized");
    }

    const tournamentData = {
      ...data,
      creator: this.currentUser?.uid || null,
      members: this.currentUser?.uid ? { [this.currentUser.uid]: true } : {},
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    };

    try {
      await this.database
        .ref(`tournaments/${tournamentCode}`)
        .set(tournamentData);

      if (ENVIRONMENT === 'development') {
        console.log("✓ Tournament created:", tournamentCode);
      }
      return true;
    } catch (error) {
      console.error("Error creating tournament:", error);
      throw error;
    }
  }

  /**
   * Join existing tournament
   */
  async joinTournament(tournamentCode) {
    if (!this.isInitialized) {
      throw new Error("Firebase not initialized");
    }

    // Ensure user is authenticated
    if (!this.currentUser) {
      await this.authReadyPromise;
    }

    if (!this.currentUser?.uid) {
      throw new Error("User not authenticated");
    }

    try {
      await this.database
        .ref(`tournaments/${tournamentCode}/members/${this.currentUser.uid}`)
        .set(true);

      if (ENVIRONMENT === 'development') {
        console.log("✓ Joined tournament:", tournamentCode);
      }
      return true;
    } catch (error) {
      console.error("Error joining tournament:", error);
      throw error;
    }
  }

  /**
   * Get tournament data
   */
  async getTournamentData(tournamentCode) {
    if (!this.isInitialized) {
      throw new Error("Firebase not initialized");
    }

    try {
      const snapshot = await this.database
        .ref(`tournaments/${tournamentCode}`)
        .once("value");

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.val();
    } catch (error) {
      console.error("Error fetching tournament data:", error);
      throw error;
    }
  }

  /**
   * Update match data
   */
  async updateMatch(tournamentCode, matchId, matchData) {
    if (!this.isInitialized) {
      throw new Error("Firebase not initialized");
    }

    try {
      await this.database
        .ref(`tournaments/${tournamentCode}/matches/${matchId}`)
        .set(matchData);

      return true;
    } catch (error) {
      console.error("Error updating match:", error);
      throw error;
    }
  }

  /**
   * Update tournament data (partial update)
   */
  async updateTournament(tournamentCode, updates) {
    if (!this.isInitialized) {
      throw new Error("Firebase not initialized");
    }

    try {
      await this.database
        .ref(`tournaments/${tournamentCode}`)
        .update(updates);

      return true;
    } catch (error) {
      console.error("Error updating tournament:", error);
      throw error;
    }
  }

  /**
   * Listen to tournament updates
   */
  onTournamentUpdate(tournamentCode, callback) {
    if (!this.isInitialized) {
      console.error("Firebase not initialized");
      return null;
    }

    const ref = this.database.ref(`tournaments/${tournamentCode}`);

    ref.on("value", (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(snapshot.val());
    });

    // Return unsubscribe function
    return () => ref.off("value");
  }

  /**
   * Stop listening to tournament updates
   */
  offTournamentUpdate(tournamentCode) {
    if (!this.isInitialized) return;

    this.database.ref(`tournaments/${tournamentCode}`).off("value");
  }

  /**
   * Delete tournament (creator only)
   */
  async deleteTournament(tournamentCode) {
    if (!this.isInitialized) {
      throw new Error("Firebase not initialized");
    }

    try {
      await this.database.ref(`tournaments/${tournamentCode}`).remove();

      if (ENVIRONMENT === 'development') {
        console.log("✓ Tournament deleted:", tournamentCode);
      }
      return true;
    } catch (error) {
      console.error("Error deleting tournament:", error);
      throw error;
    }
  }

  /**
   * Check if current user is tournament creator
   */
  async isCreator(tournamentCode) {
    if (!this.currentUser) return false;

    try {
      const snapshot = await this.database
        .ref(`tournaments/${tournamentCode}/creator`)
        .once("value");

      return snapshot.val() === this.currentUser.uid;
    } catch (error) {
      console.error("Error checking creator status:", error);
      return false;
    }
  }
}

// Create global instance
const firebaseManager = new FirebaseManager();

// Global debugging helper
if (typeof window !== 'undefined') {
  window.testFirebaseConnection = async function() {
    console.log('=== Firebase Connection Diagnostics ===');

    // Check initialization
    console.log('Firebase initialized:', firebaseManager.isInitialized);
    console.log('Current user:', firebaseManager.currentUser?.email || firebaseManager.currentUser?.uid || 'None');

    if (!firebaseManager.isInitialized) {
      console.error('❌ Firebase not initialized!');
      return;
    }

    // Test database read access
    console.log('Testing database read access...');
    try {
      const testRef = firebaseManager.database.ref('.info/connected');
      const snapshot = await testRef.once('value');
      console.log('✓ Can read .info/connected:', snapshot.val());
    } catch (error) {
      console.error('❌ Cannot read .info/connected:', error.code, error.message);
    }

    // Test tournaments path access
    console.log('Testing tournaments path access...');
    try {
      const tournamentsRef = firebaseManager.database.ref('tournaments');
      const snapshot = await tournamentsRef.limitToFirst(1).once('value');
      console.log('✓ Can read tournaments path');
      console.log('Tournaments found:', snapshot.numChildren());
    } catch (error) {
      console.error('❌ Cannot read tournaments path:', error.code, error.message);

      if (error.code === 'PERMISSION_DENIED') {
        console.error('\n⚠️  PERMISSION DENIED ERROR');
        console.error('Your database rules are blocking access.');
        console.error('\nRequired rules:');
        console.error(DATABASE_RULES);
        console.error('\nTo fix:');
        console.error('1. Go to Firebase Console → Realtime Database → Rules');
        console.error('2. Replace existing rules with the rules shown above');
        console.error('3. Click "Publish"');
      }
    }

    // Test write access
    console.log('Testing write access...');
    try {
      const testCode = 'TEST' + Date.now();
      await firebaseManager.database.ref(`tournaments/${testCode}`).set({
        test: true,
        timestamp: Date.now()
      });
      console.log('✓ Can write to database');

      // Clean up
      await firebaseManager.database.ref(`tournaments/${testCode}`).remove();
      console.log('✓ Can delete from database');
    } catch (error) {
      console.error('❌ Cannot write to database:', error.code, error.message);
    }

    console.log('=================================');
  };
}
