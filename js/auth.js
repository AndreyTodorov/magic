/**
 * AUTHENTICATION MANAGER
 * Handles user sign-up, sign-in, and auth state
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authReadyPromise = null;
    this.onAuthChangeCallbacks = [];
  }

  /**
   * Initialize authentication
   */
  async initialize(firebaseAuth) {
    this.auth = firebaseAuth;

    return new Promise((resolve) => {
      this.authReadyPromise = resolve;

      // Listen for auth state changes
      this.auth.onAuthStateChanged((user) => {
        this.currentUser = user;

        // Notify all callbacks
        this.onAuthChangeCallbacks.forEach(callback => callback(user));

        if (user) {
          console.log("✓ User authenticated:", user.email || user.uid);
          resolve(user);
        } else {
          console.log("No user signed in");
          resolve(null);
        }
      });
    });
  }

  /**
   * Register callback for auth state changes
   */
  onAuthStateChange(callback) {
    this.onAuthChangeCallbacks.push(callback);
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password, displayName) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        email,
        password
      );

      // Update profile with display name
      if (displayName) {
        await userCredential.user.updateProfile({
          displayName: displayName
        });
      }

      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(
        email,
        password
      );
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      await this.auth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Check if user is signed in
   */
  isSignedIn() {
    return this.currentUser !== null;
  }

  /**
   * Get current user display name
   */
  getDisplayName() {
    return this.currentUser?.displayName || this.currentUser?.email || 'User';
  }

  /**
   * Get user-friendly error messages
   */
  getErrorMessage(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Email/password sign-in is not enabled',
      'auth/weak-password': 'Password is too weak (minimum 6 characters)',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many failed attempts. Try again later',
      'auth/network-request-failed': 'Network error. Check your connection',
    };

    return errorMessages[error.code] || error.message;
  }
}

// Create global instance
const authManager = new AuthManager();
