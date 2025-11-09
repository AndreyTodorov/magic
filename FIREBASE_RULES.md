# Firebase Database Security Rules

## Overview

This document explains the Firebase Realtime Database security rules for Magic Mikes Tournament.

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
        ".write": "auth != null"
      }
    }
  }
}
```

**What it does:**
- ✅ Anyone can **read** tournaments (public tournaments)
- ✅ Only **authenticated users** can create/update tournaments
- ⚠️ Minimal validation (for faster development)

**How to apply:**
1. Firebase Console → Realtime Database → Rules
2. Copy contents from `firebase-database-rules.dev.json`
3. Click **Publish**

---

## Production Rules (Secure)

Use in production for security and data validation:

```json
{
  "rules": {
    "tournaments": {
      "$tournamentId": {
        ".read": true,
        ".write": "auth != null && (
          !data.exists() ||
          data.child('creator').val() === auth.uid ||
          data.child('members').child(auth.uid).exists()
        )",
        // ... full validation rules
      }
    }
  }
}
```

**Security features:**

### 1. Read Access
- ✅ **Public read** - Anyone can view tournaments (needed for Join feature)

### 2. Write Access
- ✅ **Must be authenticated** - Only logged-in users can write
- ✅ **Creator can update** - Tournament creator has full access
- ✅ **Members can update** - Joined members can update matches
- ❌ **Others blocked** - Non-members cannot modify tournaments

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

### Test Read Access (Anyone)
```javascript
// Should work without authentication
firebase.database().ref('tournaments/ABC12345').once('value');
```

### Test Write Access (Authenticated Only)
```javascript
// Should fail if not logged in
firebase.database().ref('tournaments/NEW123').set({ ... });

// Should work after login
firebase.auth().signInWithEmailAndPassword(email, password)
  .then(() => {
    firebase.database().ref('tournaments/NEW123').set({ ... });
  });
```

### Test Creator Access
```javascript
// Creator can update their tournament
const tournamentRef = firebase.database().ref('tournaments/ABC12345');
tournamentRef.update({ someField: 'newValue' }); // ✅ Works
```

### Test Member Access
```javascript
// Member can update matches
const matchRef = firebase.database()
  .ref('tournaments/ABC12345/matches/0');
matchRef.update({ completed: true }); // ✅ Works
```

### Test Non-Member Access
```javascript
// Non-member cannot update
const tournamentRef = firebase.database()
  .ref('tournaments/SOMEONE_ELSES_TOURNAMENT');
tournamentRef.update({ players: ['hacker'] }); // ❌ Fails
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
