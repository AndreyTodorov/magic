# Firebase Database Security Rules

## Overview

This document explains the Firebase Realtime Database security rules for Magic Mikes Tournament.

## Key Permission Summary

**What REQUIRES authentication (login):**
- ✅ Creating new tournaments
- ✅ Joining tournaments (becoming a member)
- ✅ Modifying tournament settings (players, matchesPerPlayer)

**What DOESN'T require authentication:**
- ✅ Viewing tournaments (public read access)
- ✅ Updating match scores (public write to matches)

**Why allow unauthenticated score updates?**
This design allows spectators, friends, or players without accounts to help record match results during a tournament. The creator can share the tournament code, and anyone can contribute by updating scores - perfect for casual tournaments where not everyone wants to create an account.

## Rule Files

- **`firebase-database-rules.json`** - Production rules (secure, validates data)
- **`firebase-database-rules.dev.json`** - Development rules (simple, for testing)

---

## Development Rules (Simple)

Use during development and testing:

```json
{
  "rules": {
    "tournaments": {
      "$tournamentId": {
        ".read": true,
        ".write": "auth != null && !data.exists()",
        "matches": {
          ".write": true
        },
        "members": {
          ".write": "auth != null"
        }
      }
    }
  }
}
```

**What it does:**
- ✅ Anyone can **read** tournaments (public tournaments)
- ✅ Only **authenticated users** can **create** new tournaments
- ✅ **Anyone** can update match scores (no auth required)
- ✅ Only **authenticated users** can join tournaments
- ⚠️ Minimal validation (for faster development)

**How to apply:**
1. Firebase Console → Realtime Database → Rules
2. Copy contents from `firebase-database-rules.dev.json`
3. Click **Publish**

---

## Production Rules (Secure)

Use in production for security and data validation.

**Security features:**

### 1. Read Access
- ✅ **Public read** - Anyone can view tournaments (needed for Join feature)

### 2. Write Access - Granular Permissions

**Creating Tournaments:**
- ✅ **Must be authenticated** - Only logged-in users can create new tournaments
- ❌ **Unauthenticated blocked** - Anonymous users cannot create tournaments

**Updating Match Scores:**
- ✅ **Public write access** - Anyone can update match results (authenticated or not)
- ✅ **Data validation** - Match data must conform to expected structure
- 🎯 **Use case** - Allows spectators or players without accounts to record scores

**Other Fields (players, creator, matchesPerPlayer):**
- ✅ **Creator only** - Only tournament creator can modify
- ✅ **Members can edit** - Joined members have limited edit access
- ❌ **Others blocked** - Non-members cannot modify tournament settings

**Joining Tournaments:**
- ✅ **Must be authenticated** - Only logged-in users can join
- ✅ **Self-registration** - Users can add themselves to members
- ✅ **Creator control** - Creator can add/remove any member

### 3. Data Validation

**Tournament structure:**
- Must have: `players`, `matches`, `matchesPerPlayer`, `creator`
- `matchesPerPlayer`: Must be 1-20
- `creator`: Must match authenticated user's UID
- `createdAt`: Timestamp, cannot be modified after creation

**Match validation:**
- Must have: `player1`, `player2`, `games`, `completed`
- `player1`/`player2`: Must be numbers (player indexes)
- `games`: Array with null or number values
- `completed`: Must be boolean

**Member management:**
- Users can only add themselves to members
- Creator can manage all members
- Members list is publicly readable

### 4. Extra fields blocked
- ❌ No additional fields allowed (prevents data injection)

---

## How to Apply Production Rules

### Option 1: Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Realtime Database** → **Rules**
4. Copy entire contents from `firebase-database-rules.json`
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Firebase CLI (Automated)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize project (if not already done):
   ```bash
   firebase init database
   ```

4. Deploy rules:
   ```bash
   firebase deploy --only database
   ```

---

## Testing Rules

### Test Read Access (Anyone - No Auth Required)
```javascript
// Should work without authentication
firebase.database().ref('tournaments/ABC12345').once('value');
// ✅ Works - tournaments are publicly readable
```

### Test Creating Tournament (Requires Auth)
```javascript
// Should FAIL if not logged in
firebase.database().ref('tournaments/NEW123').set({
  players: ['Player 1'],
  matches: [...],
  creator: 'some-uid'
});
// ❌ Fails - must be authenticated to create tournaments

// Should WORK after login
firebase.auth().signInWithEmailAndPassword(email, password)
  .then(() => {
    firebase.database().ref('tournaments/NEW123').set({
      players: ['Player 1'],
      matches: [...],
      creator: firebase.auth().currentUser.uid
    });
    // ✅ Works - authenticated user can create
  });
```

### Test Match Updates (No Auth Required)
```javascript
// IMPORTANT: Anyone can update match scores without logging in
const matchRef = firebase.database()
  .ref('tournaments/ABC12345/matches/0');

// Update match results without authentication
matchRef.update({
  games: [0, 1, 0],
  completed: true
});
// ✅ Works - match updates are public
```

### Test Tournament Settings (Requires Auth + Membership)
```javascript
// Non-member cannot update tournament settings
firebase.database().ref('tournaments/ABC12345/players')
  .set(['Hacker Player']);
// ❌ Fails - must be creator or member

// Creator can update settings
firebase.auth().signInWithEmailAndPassword(creatorEmail, password)
  .then(() => {
    firebase.database().ref('tournaments/ABC12345/players')
      .set(['Updated Player']);
    // ✅ Works - creator has full access
  });
```

### Test Joining Tournament (Requires Auth)
```javascript
// Cannot join without authentication
firebase.database()
  .ref('tournaments/ABC12345/members/some-uid')
  .set(true);
// ❌ Fails - must be authenticated

// Can join after login
firebase.auth().signInWithEmailAndPassword(email, password)
  .then(() => {
    firebase.database()
      .ref(`tournaments/ABC12345/members/${firebase.auth().currentUser.uid}`)
      .set(true);
    // ✅ Works - authenticated users can join
  });
```

---

## Common Issues

### Issue: "Permission Denied" when creating tournament
**Solution:** Make sure user is authenticated:
```javascript
await firebase.auth().signInWithEmailAndPassword(email, password);
```

### Issue: "Validation failed" when creating tournament
**Solution:** Ensure all required fields are present:
```javascript
{
  players: ['Player 1', 'Player 2'],
  matches: [{ player1: 0, player2: 1, games: [null, null, null], completed: false }],
  matchesPerPlayer: 3,
  creator: firebase.auth().currentUser.uid,
  members: { [firebase.auth().currentUser.uid]: true },
  createdAt: firebase.database.ServerValue.TIMESTAMP
}
```

### Issue: App Check warnings
**Solution:**
- In development: Ignored automatically (ENVIRONMENT='development')
- In production: Set up App Check in Firebase Console

---

## Migration from Development to Production

1. **Backup your data** (Firebase Console → Realtime Database → Export JSON)
2. **Test rules** with Firebase Emulator first:
   ```bash
   firebase emulators:start
   ```
3. **Apply production rules** during low-traffic period
4. **Monitor** Firebase Console for permission errors
5. **Adjust rules** if legitimate access is blocked

---

## Security Best Practices

1. ✅ **Always validate data types** - Prevents injection attacks
2. ✅ **Limit field sizes** - Prevents storage abuse
3. ✅ **Use authentication** - Never allow anonymous writes in production
4. ✅ **Enable App Check** - Prevents unauthorized clients
5. ✅ **Monitor usage** - Check Firebase Console for abuse patterns
6. ✅ **Regular audits** - Review rules quarterly

---

## Appendix: Rule Breakdown

### Why public read?
Tournaments need to be discoverable via join codes. Users without accounts can view tournaments before joining.

### Why members can write?
Members need to update match results during the tournament. The creator shouldn't be the only one able to record results.

### Why validate field types?
Prevents malicious users from injecting invalid data that could crash the app or corrupt the database.

### Why block extra fields?
Prevents attackers from storing arbitrary data in your database, which could lead to storage abuse or data leaks.
