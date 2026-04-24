# BookIt LAN Network Setup Guide

This guide explains how to set up BookIt to share data across multiple PCs on your local network (LAN).

---

## Overview

**Three Usage Modes:**

1. **Standalone (Offline)** - Single PC, local data only
2. **LAN Server (Host)** - Main PC hosting shared database
3. **LAN Client** - Other PCs connecting to the server

---

## Step 1: Set Up the LAN Server (Main PC)

The server PC holds the centralized database that all client PCs connect to.

### Prerequisites
- Node.js 14+ installed on the server PC
- All PCs on the same network (router)

### Installation

**On your main/server PC:**

1. Open **PowerShell** or **Command Prompt** as Administrator
2. Navigate to the BookIt server folder:
   ```
   cd C:\path\to\bookit\server
   ```
3. Install dependencies (run once):
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. **Note the URL displayed**, for example:
   ```
   IQBook LAN Server running on http://192.168.1.50:4000
   ```
6. Keep this window **open** while using BookIt across the network

### Finding Your Server IP Address

If the server doesn't display the IP, find it manually:

1. Open **PowerShell** on the server PC
2. Run:
   ```
   ipconfig
   ```
3. Look for **IPv4 Address** under your network adapter (usually `192.168.x.x`)
4. Your server URL will be:
   ```
   http://{YOUR_IP_ADDRESS}:4000
   ```

**Example:** If your IPv4 address is `192.168.1.50`, the URL is:
```
http://192.168.1.50:4000
```

---

## Step 2: Verify Network Connectivity

Before connecting clients, verify the server is reachable:

**On any other PC on the same network:**

1. Open a web browser
2. Type the server URL from Step 1:
   ```
   http://192.168.1.50:4000/api/health
   ```
3. You should see a healthy response (or success message)
4. If you see **"Cannot reach server"** → Check firewall (see Troubleshooting)

---

## Step 3: Connect a Client PC

Once the server is running, connect other PCs to it.

### Installation

**On each client PC:**

1. Install BookIt normally using the `.exe` installer
2. Complete the installation
3. Run BookIt

### Configure Connection

**Inside BookIt application:**

1. Open BookIt on the client PC
2. Go to **Settings** (gear icon, top navigation)
3. Click **Network / Multi-user**
4. Select mode: **Client**
5. Enter the server URL:
   ```
   http://192.168.1.50:4000
   ```
   (use the URL from your server PC)
6. Click **Test Connection**
   - ✅ Success → "Connection verified"
   - ❌ Failed → Check server URL and firewall (see Troubleshooting)
7. Click **Save**
8. BookIt will restart and sync with the server

### Verify Connection

After saving, BookIt should:
- Display "Client mode" in Settings
- Sync data with the server PC
- Show the same data as other connected clients
- Work offline if the server goes down (cached data)

---

## Step 4: Connecting Additional Clients

Repeat **Step 3** on each additional PC:

- Install BookIt
- Open Settings → Network
- Select **Client** mode
- Enter the server URL
- Test and save

All clients will now share the same accounting database in real-time.

---

## Server Configuration (Advanced)

### Custom Data Directory

By default, server data is stored in:
```
C:\Users\{YourUsername}\.iqbook
```

To change it, set an environment variable before starting the server:

```
set IQBOOK_DATA_DIR=D:\BookItData
npm start
```

### Custom Port

Default port is `4000`. To change it:

```
set PORT=5000
npm start
```

Then use: `http://192.168.1.50:5000` on client PCs

---

## Common Scenarios

### Scenario 1: Server Goes Down
- Clients continue working with cached data
- Changes sync when server comes back online
- No data loss

### Scenario 2: New PC Joins Mid-Day
- Install BookIt on the new PC
- Connect to the server
- All previous data syncs automatically

### Scenario 3: Switching Between Offline and LAN
**On any client PC:**

1. Open Settings → Network
2. Change mode from **Client** to **Standalone** (or back)
3. Click Save
4. BookIt restarts with the new mode

---

## Troubleshooting

### Issue: "Cannot connect to server"

**Check #1: Server URL Format**
- Ensure URL starts with `http://` (not `https://`)
- Remove trailing slashes
- Example: ✅ `http://192.168.1.50:4000` ❌ `http://192.168.1.50:4000/`

**Check #2: Server is Running**
- Verify the server PowerShell window shows "running on http://..."
- If not, restart the server: `npm start` in the server folder

**Check #3: Network Connectivity**
- Ping the server from the client PC:
  ```
  ping 192.168.1.50
  ```
- If ping fails, devices are not on the same network

**Check #4: Firewall Blocking**
- Windows Firewall may block port 4000
- **Allow through firewall:**
  1. Open **Windows Defender Firewall** → **Allow an app through firewall**
  2. Click **Allow another app**
  3. Browse to your Node.js executable (usually `C:\Program Files\nodejs\node.exe`)
  4. Click **Add**
  5. Restart the server

### Issue: "Connection verified" but data doesn't sync

- Wait 5-10 seconds (sync happens in background)
- Check if you're in **Client** mode (not Standalone)
- Restart BookIt
- Check server logs for errors

### Issue: Data shows differently on different PCs

- Ensure all PCs are showing **Client** mode
- Check network connection is stable
- Allow 10 seconds for sync after any changes

### Issue: Server Computer IP Address Changed

- Find the new IP: Run `ipconfig` on server PC
- Update all client PCs with the new URL
- Test connection from each client

---

## Security Notes

- **LAN-Only:** Server is designed for private networks only
- **No authentication:** Runs on trusted networks (not for internet use)
- **Firewall:** Ensure firewall blocks external access to port 4000
- **For remote access:** Use a VPN, not direct internet exposure

---

## Performance Tips

### On Server PC
- Close unnecessary applications
- Ensure stable network connection (wired ethernet recommended)
- Monitor resource usage (Task Manager)

### On Client PCs
- Keep network connection stable
- Limit number of clients (recommended: ≤ 10 PCs)
- Regularly restart PCs if experiencing lag

---

## Need Help?

**When reporting issues, include:**
1. Server PC OS and IP address
2. Client PC OS
3. Server error messages (from PowerShell window)
4. Client error messages (from Settings → Network)
5. Network setup (e.g., "All on same WiFi router")

