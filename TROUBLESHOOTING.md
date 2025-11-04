# Troubleshooting Guide - Website Not Opening

## ✅ Quick Fix

Your development server **IS running** on port 5173. To access your website:

1. **Open your web browser** (Chrome, Firefox, Edge, etc.)
2. **Navigate to one of these URLs:**
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`

**Important:** Make sure you use `http://` (not `https://`) and include the port number `:5173`

---

## 🔍 Common Issues & Solutions

### Issue 1: "This site can't be reached" or "Unable to connect"

**Solutions:**
- Make sure the dev server is running (check terminal for "Local: http://localhost:5173")
- Try `http://127.0.0.1:5173` instead of `localhost`
- Check Windows Firewall - it may be blocking the connection
- Try restarting the dev server:
  ```bash
  # Stop the server (Ctrl+C in terminal)
  # Then start again:
  npm run dev
  ```

### Issue 2: Browser shows blank page or errors

**Solutions:**
- Open browser Developer Tools (F12) and check the Console tab for errors
- Try a different browser
- Clear browser cache (Ctrl+Shift+Delete)
- Try Incognito/Private mode

### Issue 3: Port 5173 is already in use

**Solutions:**
- Kill the process using port 5173:
  ```powershell
  netstat -ano | findstr :5173
  # Note the PID, then:
  taskkill /PID <PID_NUMBER> /F
  ```
- Or change the port in `vite.config.ts`:
  ```typescript
  server: {
    port: 3000, // Change to any available port
    host: '0.0.0.0',
  }
  ```

### Issue 4: Dependencies not installed

**Solutions:**
- Make sure all dependencies are installed:
  ```bash
  npm install
  ```

### Issue 5: TypeScript/Build errors

**Solutions:**
- Check terminal for error messages
- Make sure you're in the correct directory: `vcanship--main`
- Try reinstalling dependencies:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

---

## 🚀 Restart the Server

If nothing works, try a fresh start:

```bash
# Navigate to project directory
cd "vcanship--main"

# Stop any running server (Ctrl+C)

# Reinstall dependencies (optional)
npm install

# Start the server
npm run dev
```

You should see output like:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Then open `http://localhost:5173` in your browser.

---

## 📞 Still Not Working?

1. Check the terminal/console where you ran `npm run dev` for error messages
2. Open browser Developer Tools (F12) → Console tab and check for JavaScript errors
3. Verify the server is actually running:
   ```powershell
   netstat -ano | findstr :5173
   ```
   This should show LISTENING status

---

## ✅ Verification Steps

1. ✅ Server is running (check terminal)
2. ✅ Port 5173 is listening (check with netstat)
3. ✅ Use correct URL: `http://localhost:5173`
4. ✅ Browser is not blocking the connection
5. ✅ No firewall blocking port 5173



