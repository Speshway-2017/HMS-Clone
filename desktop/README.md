# HMS Desktop (Electron)

Electron wrapper for the Hospital Management System. Embeds the existing Vite React frontend and Express backend into a native desktop window.

## Quick Start (Development)

> **Prerequisites**: The `client/` and `server/` dev servers should already be running via `npm run dev`.

```bash
cd desktop
npm install
npm run dev:electron-only
```

This opens the Electron window pointing at `http://localhost:5173` (the running Vite dev server).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev:electron-only` | Launch Electron pointing at already-running dev servers |
| `npm run dev` | Start client + server + electron together |
| `npm run build` | Build client and server for production |
| `npm run dist` | Build + package into a Windows installer |

---

## How It Works

1. **Electron main process** (`electron/main.js`) starts
2. A **splash screen** is shown while services boot
3. Electron checks if `localhost:5000` and `localhost:5173` are already running
   - If **yes** → uses them directly (great for dev)
   - If **no** → spawns the backend (`tsx src/server.ts`) and frontend (`npm run dev`)
4. Main `BrowserWindow` loads the React app
5. On close → kills any spawned child processes

## Supported Roles

| Role | Route |
|---|---|
| Admin | `/admin` |
| Doctor | `/doctor` |
| Receptionist | `/receptionist` |
| Laboratory | `/laboratory` |
| Pharmacist | `/pharmacy` |
| Accountant | `/accountant` |

All accessible from the **Roles** menu bar.

## Production Build

```bash
# 1. Build server and client
npm run build

# 2. Package into Windows installer
npm run dist:win

# Output: dist-electron/Hospital Management System Setup 1.0.0.exe
```
