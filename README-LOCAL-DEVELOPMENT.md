# 🏆 Magic Mikes Tournament - Local Development

## 🚀 Quickest Way to Start (30 seconds)

### Windows
1. Double-click `start-server.bat`
2. Browser opens automatically
3. Done! ✅

### Mac/Linux
```bash
chmod +x start-server.sh
./start-server.sh
```

### No Server? No Problem!
Just **double-click `index-standalone.html`** - works immediately! 💾

---

## 📁 Project Structure

```
magic-mikes-tournament/
├── 📄 index.html                    # Production version (requires Firebase)
├── 📄 index-standalone.html         # Local version (works offline)
├── 📄 start-server.bat             # Windows quick start
├── 📄 start-server.sh              # Mac/Linux quick start
├── 📁 css/
│   └── styles.css                  # All styles (organized with CSS variables)
└── 📁 js/
    ├── config.js                   # Firebase configuration
    ├── firebase.js                 # Firebase integration (online mode)
    ├── localStorage-manager.js    # Local storage fallback (offline mode)
    ├── tournament.js               # Tournament logic (matches, scoring)
    ├── ui.js                       # DOM manipulation & rendering
    └── app.js                      # Main application controller
```

---

## 🎯 Two Modes Explained

### Mode 1: Standalone (Local Storage) - **RECOMMENDED FOR TESTING**

**File:** `index-standalone.html`

**Pros:**
- ✅ Zero setup - just open the file
- ✅ Works completely offline
- ✅ No server needed
- ✅ No Firebase config needed
- ✅ Instant testing

**Cons:**
- ❌ Data only in your browser (localStorage)
- ❌ Can't sync across devices
- ❌ "Join tournament" only works in same browser

**When to use:**
- Testing new features
- Playing tournaments alone
- Quick demos
- Development without internet

---

### Mode 2: Firebase (Real-time Database)

**File:** `index.html`

**Pros:**
- ✅ Real-time sync across devices
- ✅ Multiple people can join same tournament
- ✅ Data persists in cloud
- ✅ Production-ready

**Cons:**
- ❌ Requires Firebase setup (~5 minutes)
- ❌ Needs internet connection
- ❌ May need local server to avoid CORS

**When to use:**
- Production deployment
- Multi-device tournaments
- Testing "join tournament" feature
- After Firebase is configured

---

## 🔧 Setup Instructions

### Option A: Instant (No Setup) ⚡

```bash
# Just open this file:
index-standalone.html

# That's it! No installation, no server, nothing.
```

### Option B: With Local Server (For Firebase Testing)

#### Windows
```batch
# Method 1: Auto-detect (easiest)
start-server.bat

# Method 2: Python (if installed)
python -m http.server 8000

# Method 3: Node.js (if installed)
npx http-server -p 8000
```

#### Mac/Linux
```bash
# Method 1: Auto-detect (easiest)
./start-server.sh

# Method 2: Python 3 (usually pre-installed)
python3 -m http.server 8000

# Method 3: Python 2 (older Macs)
python -m SimpleHTTPServer 8000

# Method 4: PHP (if installed)
php -S localhost:8000

# Method 5: Node.js
npx http-server -p 8000
```

Then open: `http://localhost:8000`

---

## 🐛 Debugging Tools

### Browser Console Commands

Open DevTools (`F12` or `Cmd+Option+I` on Mac), then:

```javascript
// View all tournaments
window.devTools.viewTournaments()

// Clear all data (fresh start)
window.devTools.clearTournaments()

// Download backup JSON
window.devTools.exportTournaments()

// Check if using local or Firebase mode
console.log(firebaseManager.constructor.name)
// "LocalStorageManager" = offline mode
// "FirebaseManager" = online mode
```

### Common Issues

| Problem | Solution |
|---------|----------|
| "Cannot read property..." | Check Console for which element is missing |
| Styles not loading | Verify `css/styles.css` exists |
| Firebase not connecting | Use `index-standalone.html` instead |
| Data disappeared | Check browser didn't clear localStorage |
| CORS error | Use local server OR use standalone version |

---

## 📱 Testing on Mobile (Same Network)

1. **Start server on computer** (any method above)

2. **Find your IP address:**
   ```bash
   # Windows
   ipconfig
   # Look for: IPv4 Address: 192.168.x.x
   
   # Mac/Linux
   ifconfig | grep inet
   # Look for: inet 192.168.x.x
   ```

3. **On phone, open:**
   ```
   http://YOUR_IP_ADDRESS:8000
   ```
   Example: `http://192.168.1.105:8000`

4. **Both devices must be on same WiFi!**

---

## 🔥 Firebase Setup (Optional - For Production)

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it (e.g., "magic-mikes-tournament")
4. Disable Google Analytics (optional)

### 2. Enable Realtime Database

1. In Firebase Console → Build → Realtime Database
2. Click "Create Database"
3. Start in **test mode** (for now)
4. Note the database URL

### 3. Set Database Rules

Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "tournaments": {
      "$tournamentId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["createdAt"],
        "members": {
          ".indexOn": [".value"]
        }
      }
    }
  }
}
```

### 4. Get Configuration

1. Project Settings (gear icon) → General
2. Scroll to "Your apps" → Web app
3. Copy the config object

### 5. Update js/config.js

Replace these values:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIza...",              // Your actual API key
  authDomain: "your-app.firebaseapp.com",
  databaseURL: "https://your-app.firebaseio.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 6. (Optional) Enable App Check

1. Firebase Console → App Check
2. Register app with reCAPTCHA
3. Copy site key to `config.js`

---

## 🎨 Customization

### Change Colors

Edit `css/styles.css`:

```css
:root {
  --color-primary: #667eea;        /* Main purple */
  --color-primary-dark: #764ba2;   /* Dark purple */
  --color-success: #28a745;        /* Green */
  --color-danger: #dc3545;         /* Red */
  /* Change any of these! */
}
```

### Change Scoring

Edit `js/config.js`:

```javascript
const APP_CONFIG = {
  SCORING: {
    MATCH_WIN: 3,      // Points for winning match
    GAME_WIN: 1,       // Points for winning game
    GAME_LOSS: -0.5,   // Points for losing game
  },
};
```

### Change Player Limits

Edit `js/config.js`:

```javascript
const APP_CONFIG = {
  MIN_PLAYERS: 3,     // Minimum players
  MAX_PLAYERS: 12,    // Maximum players
  DEFAULT_PLAYERS: 7, // Default selection
};
```

---

## 📊 Data Storage Comparison

| Feature | localStorage | Firebase |
|---------|--------------|----------|
| Setup | None | 5 minutes |
| Storage | 5-10MB | 1GB free |
| Sync | No | Yes |
| Offline | Yes | With cache |
| Speed | Instant | ~100ms |
| Cost | Free | Free tier |
| Persistence | Browser only | Cloud |

---

## 🚢 Deployment Options

### GitHub Pages (Free)
```bash
# 1. Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Settings → Pages → Source: main branch
# 3. Access: https://username.github.io/repo-name
```

### Netlify (Free)
```bash
# 1. Drag folder to netlify.com/drop
# 2. Done! Gets auto URL
```

### Vercel (Free)
```bash
# 1. Install: npm i -g vercel
# 2. Run: vercel
# 3. Follow prompts
```

---

## 💡 Pro Tips

1. **Use VS Code** with "Live Server" extension for auto-refresh
2. **Keep browser Console open** (F12) to catch errors
3. **Export tournaments regularly** if using localStorage
4. **Test in incognito** to verify fresh user experience
5. **Use multiple browsers** to simulate different users

---

## 🎓 Learning Resources

### HTML/CSS/JS Basics
- MDN Web Docs: https://developer.mozilla.org/
- JavaScript.info: https://javascript.info/

### Firebase
- Official Docs: https://firebase.google.com/docs
- Realtime Database: https://firebase.google.com/docs/database

### Tools
- Chrome DevTools: https://developer.chrome.com/docs/devtools/
- VS Code: https://code.visualstudio.com/

---

## 📞 Need Help?

### Quick Checks
1. ✅ Are all files in correct folders?
2. ✅ Is browser Console showing errors?
3. ✅ Did you try `index-standalone.html`?
4. ✅ Is localStorage enabled in browser?

### Still Stuck?
- Check browser Console (F12)
- Try incognito mode
- Clear browser cache
- Use standalone version
- Check file paths are correct

---

## 🏁 Quick Start Checklist

- [ ] Downloaded all files
- [ ] Opened `index-standalone.html`
- [ ] Created tournament successfully
- [ ] Recorded some match results
- [ ] Viewed standings
- [ ] (Optional) Started local server
- [ ] (Optional) Configured Firebase
- [ ] Ready to deploy! 🚀