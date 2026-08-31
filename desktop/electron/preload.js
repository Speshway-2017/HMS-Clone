/**
 * HMS Desktop - Preload Script (v2 - Fixed)
 *
 * Runs in the renderer process with a bridge to the main process.
 * Two responsibilities:
 *   1. Expose a safe contextBridge API to the React app (optional use).
 *   2. Self-register an IPC 'hms-navigate' listener that uses
 *      window.history.pushState() + popstate event to trigger React Router
 *      client-side navigation WITHOUT a full page reload.
 *
 * This means Electron's native menu can navigate between role dashboards
 * using React Router — no modification to client/ source needed.
 */

const { contextBridge, ipcRenderer } = require("electron");

// ─── Self-registering Navigation Handler ─────────────────────────────────────
// Listens for 'hms-navigate' from main process.
// Calls history.pushState() then fires a popstate event.
// React Router's BrowserRouter intercepts popstate and routes accordingly.
ipcRenderer.on("hms-navigate", (event, route) => {
  try {
    const currentPath = window.location.pathname;
    if (currentPath === route) {
      console.log("[HMS Preload] Already on route:", route);
      return;
    }
    console.log("[HMS Preload] Navigating:", currentPath, "→", route);
    window.history.pushState({ hmsNavigate: true }, "", route);
    // Dispatch popstate so React Router re-evaluates the URL
    window.dispatchEvent(new PopStateEvent("popstate", { state: { hmsNavigate: true } }));
  } catch (err) {
    console.error("[HMS Preload] Navigation error:", err);
  }
});

// ─── Context Bridge API ───────────────────────────────────────────────────────
// Exposes safe APIs to the renderer (React app can use window.electronAPI)
contextBridge.exposeInMainWorld("electronAPI", {
  // Platform info
  isElectron: true,
  platform: process.platform,

  // Server & Config info
  getServerPort: () => ipcRenderer.invoke("get-server-port"),
  getClientPort: () => ipcRenderer.invoke("get-client-port"),
  isDev: () => ipcRenderer.invoke("is-dev"),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (cfg) => ipcRenderer.invoke("save-config", cfg),

  // App control
  quitApp: () => ipcRenderer.send("quit-app"),

  // Navigation API (React app can call this to navigate programmatically)
  // Usage: window.electronAPI.navigate('/admin')
  navigate: (route) => {
    window.history.pushState({ hmsNavigate: true }, "", route);
    window.dispatchEvent(new PopStateEvent("popstate", { state: { hmsNavigate: true } }));
  },
});
