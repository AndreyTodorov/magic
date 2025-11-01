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

            console.log('✓ Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Initialize Firebase App Check
     */
    initializeAppCheck() {
        try {
            const appCheck = firebase.appCheck();
            appCheck.activate(APPCHECK_SITE_KEY, true); // true = auto-refresh
            console.log('✓ App Check activated');
        } catch (error) {
            console.warn('App Check activation failed:', error);
        }
    }

    /**
     * Setup anonymous authentication
     */
    async setupAuthentication() {
        return new Promise((resolve) => {
            this.authReadyPromise = resolve;

            // Sign in anonymously
            this.auth
                .signInAnonymously()
                .catch((err) => console.warn('Anonymous sign-in failed:', err));

            // Listen for auth state changes
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                if (user) {
                    console.log('✓ User authenticated:', user.uid);
                    resolve(user);
                }
            });
        });
    }

    /**
     * Monitor Firebase connection status
     */
    monitorConnection() {
        const connectedRef = this.database.ref('.info/connected');

        connectedRef.on('value', (snapshot) => {
            const isConnected = snapshot.val() === true;

            // Update UI
            this.updateConnectionStatus(isConnected);

            // Notify callbacks
            this.connectionCallbacks.forEach(callback => callback(isConnected));

            if (isConnected) {
                console.log('✓ Connected to Firebase');
            } else {
                console.warn('⚠ Disconnected from Firebase');
            }
        });
    }

    /**
     * Update connection status UI
     */
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        const statusDot = statusEl?.querySelector('.status-dot');

        if (!statusEl || !statusText || !statusDot) return;

        if (connected) {
            statusEl.className = 'connection-status connected';
            statusText.textContent = 'Connected';
            statusDot.className = 'status-dot';
        } else {
            statusEl.className = 'connection-status disconnected';
            statusText.textContent = 'Disconnected';
            statusDot.className = 'status-dot';
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
            throw new Error('Firebase not initialized');
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
                .once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking tournament existence:', error);
            return false;
        }
    }

    /**
     * Create new tournament
     */
    async createTournament(tournamentCode, data) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
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

            console.log('✓ Tournament created:', tournamentCode);
            return true;
        } catch (error) {
            console.error('Error creating tournament:', error);
            throw error;
        }
    }

    /**
     * Join existing tournament
     */
    async joinTournament(tournamentCode) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        // Ensure user is authenticated
        if (!this.currentUser) {
            await this.authReadyPromise;
        }

        if (!this.currentUser?.uid) {
            throw new Error('User not authenticated');
        }

        try {
            await this.database
                .ref(`tournaments/${tournamentCode}/members/${this.currentUser.uid}`)
                .set(true);

            console.log('✓ Joined tournament:', tournamentCode);
            return true;
        } catch (error) {
            console.error('Error joining tournament:', error);
            throw error;
        }
    }

    /**
     * Get tournament data
     */
    async getTournamentData(tournamentCode) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            const snapshot = await this.database
                .ref(`tournaments/${tournamentCode}`)
                .once('value');

            if (!snapshot.exists()) {
                return null;
            }

            return snapshot.val();
        } catch (error) {
            console.error('Error fetching tournament data:', error);
            throw error;
        }
    }

    /**
     * Update match data
     */
    async updateMatch(tournamentCode, matchId, matchData) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            await this.database
                .ref(`tournaments/${tournamentCode}/matches/${matchId}`)
                .set(matchData);

            return true;
        } catch (error) {
            console.error('Error updating match:', error);
            throw error;
        }
    }

    /**
     * Listen to tournament updates
     */
    onTournamentUpdate(tournamentCode, callback) {
        if (!this.isInitialized) {
            console.error('Firebase not initialized');
            return null;
        }

        const ref = this.database.ref(`tournaments/${tournamentCode}`);

        ref.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                callback(null);
                return;
            }
            callback(snapshot.val());
        });

        // Return unsubscribe function
        return () => ref.off('value');
    }

    /**
     * Stop listening to tournament updates
     */
    offTournamentUpdate(tournamentCode) {
        if (!this.isInitialized) return;

        this.database
            .ref(`tournaments/${tournamentCode}`)
            .off('value');
    }

    /**
     * Delete tournament (creator only)
     */
    async deleteTournament(tournamentCode) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            await this.database
                .ref(`tournaments/${tournamentCode}`)
                .remove();

            console.log('✓ Tournament deleted:', tournamentCode);
            return true;
        } catch (error) {
            console.error('Error deleting tournament:', error);
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
                .once('value');

            return snapshot.val() === this.currentUser.uid;
        } catch (error) {
            console.error('Error checking creator status:', error);
            return false;
        }
    }
}

// Create global instance
const firebaseManager = new FirebaseManager();