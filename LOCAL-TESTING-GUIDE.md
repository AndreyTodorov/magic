# 🚀 Local Testing Guide - Magic Mikes Tournament

## Option 1: Direct File Opening (Easiest - No Server)

### ✅ Instant Setup (0 minutes)

1. **Download all files** maintaining this structure:
```
magic-mikes-tournament/
├── index-standalone.html    ← Use this for local testing
├── index.html               ← Use this for production with Firebase
├── css/
│   └── styles.css
└── js/
    ├── config.js
    ├── firebase.js
    ├── localStorage-manager.js
    ├── tournament.js
    ├── ui.js
    └── app.js
```

2. **Double-click `index-standalone.html`** to open in your browser

3. **That's it!** No server needed, works completely offline.

### 💾 How It Works
- Uses **localStorage** instead of Firebase
- All data stored in your browser
- Works offline completely
- Data persists between sessions
- No "join tournament" sync (single browser only)

### 🛠️ Developer Tools (Open Console)
```javascript
// View all tournaments
window.devTools.viewTournaments()

// Clear all data
window.devTools.clearTournaments()

// Export backup
window.devTools.exportTournaments()
```

---

## Option 2: Local Server (For Testing Firebase Features)

### Why Use a Server?
- Test Firebase integration
- Avoid CORS issues
- Simulate production environment
- Test "join tournament" functionality

### 🐍 Method A: Python (Built into Mac/Linux)

**Check if installed:**
```bash
python3 --version
```

**Start server:**
```bash
# Navigate to your project folder
cd /path/to/magic-mikes-tournament

# Start server (Python 3)
python3 -m http.server 8000

# OR Python 2
python -m SimpleHTTPServer 8000
```

**Access:** Open `http://localhost:8000` in your browser

**Stop:** Press `Ctrl+C` in terminal

---

### 🟢 Method B: Node.js (http-server)

**Install Node.js first:** https://nodejs.org/

**Install http-server:**
```bash
npm install -g http-server
```

**Start server:**
```bash
cd /path/to/magic-mikes-tournament
http-server -p 8000
```

**Access:** Open `http://localhost:8000`

**Stop:** Press `Ctrl+C`

---

### 🪟 Method C: PHP (If you have PHP installed)

**Check if installed:**
```bash
php -v
```

**Start server:**
```bash
cd /path/to/magic-mikes-tournament
php -S localhost:8000
```

**Access:** Open `http://localhost:8000`

---

### 🦊 Method D: Browser Extensions (Chrome/Firefox)

**Chrome:**
1. Install "Web Server for Chrome"
2. Choose folder → Start server
3. Access provided URL

**Firefox:**
1. Use Firefox Developer Edition
2. Open folder with built-in server

---

### 🎯 Method E: VS Code Live Server (Recommended for Developers)

**If using Visual Studio Code:**

1. Install "Live Server" extension by Ritwick Dey
2. Right-click `index.html` → "Open with Live Server"
3. Auto-refreshes on file changes!

**Shortcut:** `Alt+L Alt+O` (Windows/Linux) or `Cmd+L Cmd+O` (Mac)

---

## Option 3: Quick Start Batch File (Windows)

Create `start-server.bat` in your project folder:

```batch
@echo off
echo Starting Magic Mikes Tournament Server...
echo.
echo Server will start at: http://localhost:8000
echo Press Ctrl+C to stop
echo.

REM Try Python 3 first
where python >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python...
    python -m http.server 8000
    goto :end
)

REM Try Python 2
where python2 >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python 2...
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM Try PHP
where php >nul 2>&1
if %errorlevel% == 0 (
    echo Using PHP...
    php -S localhost:8000
    goto :end
)

REM Try Node.js http-server
where http-server >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server...
    http-server -p 8000
    goto :end
)

echo ERROR: No server found!
echo.
echo Please install one of:
echo - Python: https://www.python.org/
echo - Node.js: https://nodejs.org/ (then: npm install -g http-server)
echo - PHP: https://www.php.net/
echo.
echo OR just double-click index-standalone.html (no server needed)
pause

:end
```

**Usage:** Double-click `start-server.bat`

---

## Option 4: Quick Start Shell Script (Mac/Linux)

Create `start-server.sh` in your project folder:

```bash
#!/bin/bash

echo "🚀 Starting Magic Mikes Tournament Server..."
echo ""
echo "Server will start at: http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

# Try Python 3
if command -v python3 &> /dev/null; then
    echo "✓ Using Python 3..."
    python3 -m http.server 8000
    exit 0
fi

# Try Python 2
if command -v python &> /dev/null; then
    echo "✓ Using Python 2..."
    python -m SimpleHTTPServer 8000
    exit 0
fi

# Try PHP
if command -v php &> /dev/null; then
    echo "✓ Using PHP..."
    php -S localhost:8000
    exit 0
fi

# Try Node.js http-server
if command -v http-server &> /dev/null; then
    echo "✓ Using Node.js http-server..."
    http-server -p 8000
    exit 0
fi

echo "❌ ERROR: No server found!"
echo ""
echo "Please install one of:"
echo "  • Python 3: brew install python3"
echo "  • Node.js: brew install node (then: npm install -g http-server)"
echo "  • PHP: brew install php"
echo ""
echo "OR just open index-standalone.html in your browser (no server needed)"
```

**Make executable:**
```bash
chmod +x start-server.sh
```

**Usage:**
```bash
./start-server.sh
```

---

## 🔥 Firebase vs Local Mode Comparison

| Feature | Local Mode | Firebase Mode |
|---------|-----------|---------------|
| **Setup Time** | 0 seconds | ~5 minutes |
| **Internet Required** | ❌ No | ✅ Yes |
| **Real-time Sync** | ❌ No | ✅ Yes |
| **Multi-device** | ❌ No | ✅ Yes |
| **Data Persistence** | ✅ Browser only | ✅ Cloud |
| **Server Needed** | ❌ No | Optional |
| **Cost** | Free | Free (Firebase tier) |

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot read properties of null"
**Cause:** JavaScript files loaded before HTML elements exist  
**Solution:** Scripts are at end of `<body>`, not in `<head>`

### Issue 2: "CORS policy" error
**Cause:** Opening HTML file directly (file://)  
**Solution:** Use local server OR use `index-standalone.html`

### Issue 3: Firebase connection fails
**Cause:** Config not set or CORS restrictions  
**Solution:**
1. Use `index-standalone.html` for local testing
2. OR set up Firebase properly in `js/config.js`

### Issue 4: Styles not loading
**Cause:** Wrong file path  
**Solution:** Ensure `css/styles.css` exists and paths are correct

### Issue 5: Data not persisting
**Cause:** Private browsing or cleared browser storage  
**Solution:** Use normal browsing mode, or export tournaments periodically

---

## 📱 Testing on Mobile (Same WiFi)

1. **Start server** on your computer (use any method above)

2. **Find your computer's IP address:**
    - Windows: `ipconfig` → Look for IPv4 Address
    - Mac/Linux: `ifconfig` or `ip addr`

3. **Access from phone:**
   ```
   http://YOUR_IP_ADDRESS:8000
   ```
   Example: `http://192.168.1.100:8000`

4. **Must be on same WiFi network!**

---

## 🎯 Recommended Workflow

### For Development:
```bash
# 1. Use VS Code with Live Server extension
# 2. Edit files → Auto-refresh
# 3. Use index-standalone.html for quick testing
```

### For Testing Firebase:
```bash
# 1. Configure Firebase in js/config.js
# 2. Start local server (any method)
# 3. Use index.html
# 4. Test multi-device with phones on same WiFi
```

### For Production:
```bash
# 1. Push to GitHub
# 2. Enable GitHub Pages
# 3. Update Firebase config
# 4. Users access via https://your-username.github.io/repo-name
```

---

## 🚨 Important Notes

### LocalStorage Limits
- **Max size:** ~5-10MB per domain
- **Storage:** Per browser (Chrome data ≠ Firefox data)
- **Clearing:** Browser clear data removes tournaments
- **Backup:** Use `window.devTools.exportTournaments()`

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ Internet Explorer (not supported)

---

## 🎓 Quick Start Commands Cheatsheet

```bash
# Python (easiest, usually pre-installed)
python3 -m http.server 8000

# Node.js (if you have npm)
npx http-server -p 8000

# PHP (if installed)
php -S localhost:8000

# No server? Just open this:
# index-standalone.html
```

---

## 💡 Pro Tips

1. **Bookmark `http://localhost:8000`** for quick access
2. **Use browser DevTools (F12)** to debug
3. **Check Console tab** for errors
4. **Export data regularly** with `window.devTools.exportTournaments()`
5. **Use incognito** to test fresh state
6. **Clear localStorage** to reset: `window.devTools.clearTournaments()`

---

## Need Help?

**Can't get server running?**  
→ Just use `index-standalone.html` (no server needed!)

**Data disappeared?**  
→ Check if browser cleared cache/cookies

**Want Firebase sync?**  
→ Follow Firebase setup in `js/config.js`

**Still stuck?**  
→ Check browser Console (F12) for error messages