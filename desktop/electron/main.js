/**
 * HMS Desktop - Electron Main Process (v3 - Standalone Production)
 * Wraps the existing Vite React frontend and Express backend.
 * Zero changes to client/ or server/ source code.
 */

const { app, BrowserWindow, Menu, Tray, shell, ipcMain, dialog, utilityProcess } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

// ─── Application-specific userData & cache isolation ─────────────────────────
const userDataPath = path.join(app.getPath("appData"), "HMS-Desktop-App");
app.setPath("userData", userDataPath);

// ─── Configuration ────────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV === "development" || !app.isPackaged;
const SERVER_PORT = 5000;
const CLIENT_PORT = 5173;
const PROJECT_ROOT = IS_DEV
  ? path.join(__dirname, "..", "..")
  : process.resourcesPath;

const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const VITE_URL = `http://localhost:${CLIENT_PORT}`;

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow = null;
let splashWindow = null;
let tray = null;
let serverProcess = null;
let clientProcess = null;
let staticClientServer = null;
let isQuitting = false;

// ─── Splash Screen ────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.center();
}

function destroySplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }
}

// ─── Main Window ──────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: "Hospital Management System",
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // ── Event: page finished loading ────────────────────────────────
  let pageLoaded = false;
  mainWindow.webContents.on("did-finish-load", () => {
    const url = mainWindow.webContents.getURL();
    console.log("[HMS] ✓ Page loaded successfully:", url);
    pageLoaded = true;
    destroySplash();
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // ── Event: page failed to load ───────────────────────────────────────────
  let loadRetryCount = 0;
  const MAX_RETRIES = 10;
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[HMS] ✗ Page failed to load: [${errorCode}] ${errorDescription} → ${validatedURL}`);
    if (errorCode === -3) return; // ERR_ABORTED (navigation cancelled by redirect/loadURL)
    if (pageLoaded) return;
    if (loadRetryCount >= MAX_RETRIES) {
      console.error(`[HMS] Max retries (${MAX_RETRIES}) reached. Giving up auto-retry.`);
      return;
    }
    loadRetryCount++;
    const delay = Math.min(1000 * loadRetryCount, 8000);
    console.log(`[HMS] Retrying load in ${delay}ms (attempt ${loadRetryCount}/${MAX_RETRIES})...`);
    setTimeout(() => {
      if (pageLoaded || !mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.loadURL(VITE_URL).catch((err) =>
        console.error("[HMS] Retry loadURL failed:", err.message)
      );
    }, delay);
  });

  // ── Event: renderer crash ─────────────────────────────────────────────────
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    console.error("[HMS] ✗ Render process gone:", details.reason, details.exitCode);
  });

  // ── Event: console messages from renderer ─────────────────────────────────
  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    const levels = ["[DBG]", "[INF]", "[WRN]", "[ERR]"];
    const tag = levels[level] || "[LOG]";
    if (level >= 2) {
      console.log(`[RENDERER${tag}] ${message} (${path.basename(sourceId || "")}:${line})`);
    }
  });

  // ── Fallback: show window after 8s if ready-to-show never fires ───────────
  const showFallbackTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn("[HMS] ready-to-show fallback triggered — showing window anyway");
      destroySplash();
      mainWindow.show();
      mainWindow.focus();
    }
  }, 8000);

  // ── Event: ready-to-show (primary show path) ──────────────────────────────
  mainWindow.once("ready-to-show", () => {
    clearTimeout(showFallbackTimer);
    console.log("[HMS] ready-to-show event fired");
    destroySplash();
    mainWindow.show();
    mainWindow.focus();
    if (IS_DEV) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  buildMenu();

  return mainWindow;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(route) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn("[HMS] navigateTo called but mainWindow is not available");
    return;
  }

  mainWindow.show();
  mainWindow.focus();

  const currentURL = mainWindow.webContents.getURL();
  console.log(`[HMS] Navigating to: ${route} (current: ${currentURL})`);

  if (!currentURL || currentURL === "about:blank" || !currentURL.includes("localhost")) {
    console.log("[HMS] Page not ready, using loadURL for navigation");
    mainWindow.loadURL(`${VITE_URL}${route}`).catch((err) =>
      console.error("[HMS] loadURL failed:", err.message)
    );
    return;
  }

  mainWindow.webContents.send("hms-navigate", route);
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: "HMS",
      submenu: [
        {
          label: "Hospital Management System",
          enabled: false,
        },
        { type: "separator" },
        {
          label: "Reload Page",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow && mainWindow.webContents.reload(),
        },
        {
          label: "Force Reload",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => mainWindow && mainWindow.webContents.reloadIgnoringCache(),
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: "CmdOrCtrl+Q",
          click: () => quitApp(),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Full Screen",
          accelerator: "F11",
          click: () =>
            mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+=",
          click: () => {
            if (mainWindow) {
              const factor = mainWindow.webContents.getZoomFactor();
              mainWindow.webContents.setZoomFactor(Math.min(factor + 0.1, 3));
            }
          },
        },
        {
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          click: () => {
            if (mainWindow) {
              const factor = mainWindow.webContents.getZoomFactor();
              mainWindow.webContents.setZoomFactor(Math.max(factor - 0.1, 0.5));
            }
          },
        },
        {
          label: "Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          click: () => mainWindow && mainWindow.webContents.setZoomFactor(1),
        },
        { type: "separator" },
        ...(IS_DEV
          ? [
              {
                label: "Developer Tools",
                accelerator: "CmdOrCtrl+Shift+I",
                click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
              },
            ]
          : []),
      ],
    },
    {
      label: "Roles",
      submenu: [
        {
          label: "🏥 Admin Dashboard",
          accelerator: "CmdOrCtrl+1",
          click: () => navigateTo("/admin"),
        },
        {
          label: "🩺 Doctor Dashboard",
          accelerator: "CmdOrCtrl+2",
          click: () => navigateTo("/doctor"),
        },
        {
          label: "🗂️ Receptionist Dashboard",
          accelerator: "CmdOrCtrl+3",
          click: () => navigateTo("/receptionist"),
        },
        {
          label: "🔬 Laboratory Dashboard",
          accelerator: "CmdOrCtrl+4",
          click: () => navigateTo("/laboratory"),
        },
        {
          label: "💊 Pharmacy Dashboard",
          accelerator: "CmdOrCtrl+5",
          click: () => navigateTo("/pharmacy"),
        },
        {
          label: "💰 Accountant Dashboard",
          accelerator: "CmdOrCtrl+6",
          click: () => navigateTo("/accountant"),
        },
        { type: "separator" },
        {
          label: "🔐 Login Page",
          accelerator: "CmdOrCtrl+L",
          click: () => navigateTo("/login"),
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About HMS",
          click: () =>
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Hospital Management System",
              message: "Hospital Management System",
              detail:
                "Version 1.0.0\n\nA comprehensive hospital management platform.\n\nRoles: Admin · Doctor · Receptionist · Laboratory · Pharmacy · Accountant",
              buttons: ["OK"],
            }),
        },
        { type: "separator" },
        {
          label: "Open DevTools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── Icon ─────────────────────────────────────────────────────────────────────
function getIconPath() {
  const assetsDir = path.join(__dirname, "..", "assets");
  const icoPath = path.join(assetsDir, "icon.ico");
  const pngPath = path.join(assetsDir, "icon.png");
  if (fs.existsSync(icoPath)) return icoPath;
  if (fs.existsSync(pngPath)) return pngPath;
  return undefined;
}

// ─── System Tray ──────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) return;

  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: "Hospital Management System", enabled: false },
      { type: "separator" },
      {
        label: "Open",
        click: () => {
          if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
        },
      },
      { type: "separator" },
      { label: "Quit", click: () => quitApp() },
    ]);
    tray.setToolTip("Hospital Management System");
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => {
      if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });
  } catch (e) {
    console.warn("[HMS] Tray creation skipped:", e.message);
  }
}

// ─── Embedded Static Client HTTP Server (Production Frontend) ─────────────────
function startStaticClientServer(clientDistDir, port) {
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".map": "application/json",
    ".webp": "image/webp"
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split("?")[0];
    let filePath = path.join(clientDistDir, reqUrl);

    // Prevent directory traversal
    if (!filePath.startsWith(clientDistDir)) {
      res.statusCode = 403;
      return res.end("Forbidden");
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // SPA Fallback: serve index.html for all React Router routes
        const indexPath = path.join(clientDistDir, "index.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream(indexPath).pipe(res);
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => {
      console.log(`[HMS] Static client server running at http://localhost:${port}`);
      resolve(server);
    }).on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`[HMS] Port ${port} already in use, using existing server.`);
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

// ─── Backend Server Spawning ───────────────────────────────────────────────────
function startBackendServer() {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const resolveOnce = () => { if (!resolved) { resolved = true; resolve(); } };

    if (IS_DEV) {
      const serverDir = path.join(PROJECT_ROOT, "server");
      console.log("[HMS] Starting backend server in DEV from:", serverDir);
      const useShell = process.platform === "win32";

      serverProcess = spawn("npx", ["tsx", "src/server.ts"], {
        cwd: serverDir,
        env: { ...process.env, NODE_ENV: "development", PORT: String(SERVER_PORT) },
        shell: useShell,
      });

      serverProcess.stdout.on("data", (data) => {
        const msg = data.toString();
        console.log("[SERVER]", msg.trim());
        if (msg.includes("listening") || msg.includes("Server listening")) resolveOnce();
      });

      serverProcess.stderr.on("data", (data) => {
        const msg = data.toString();
        console.log("[SERVER STDERR]", msg.trim());
        if (msg.includes("listening") || msg.includes("Server listening")) resolveOnce();
      });

      serverProcess.on("error", (err) => {
        console.error("[HMS] Dev Server spawn error:", err.message);
        if (!resolved) { resolved = true; reject(err); }
      });

      serverProcess.on("close", (code) => {
        console.log(`[HMS] Dev Server process exited with code ${code}`);
      });

      setTimeout(resolveOnce, 4000);
    } else {
      // PRODUCTION MODE: Use utilityProcess.fork to execute packaged server/dist/server.js
      const serverDir = path.join(process.resourcesPath, "server");
      const serverEntry = path.join(serverDir, "dist", "server.js");
      console.log("[HMS] Starting backend server in PROD from:", serverDir);
      console.log("[HMS] Server entry script:", serverEntry);

      if (!fs.existsSync(serverEntry)) {
        console.error("[HMS] Packaged server entry not found at:", serverEntry);
        reject(new Error(`Server entry file missing: ${serverEntry}`));
        return;
      }

      try {
        serverProcess = utilityProcess.fork(serverEntry, [], {
          cwd: serverDir,
          env: { ...process.env, NODE_ENV: "production", PORT: String(SERVER_PORT) },
          stdio: "pipe",
        });

        if (serverProcess.stdout) {
          serverProcess.stdout.on("data", (data) => {
            const msg = data.toString();
            console.log("[PROD SERVER]", msg.trim());
            if (msg.includes("listening") || msg.includes("Server listening")) resolveOnce();
          });
        }

        if (serverProcess.stderr) {
          serverProcess.stderr.on("data", (data) => {
            const msg = data.toString();
            console.log("[PROD SERVER STDERR]", msg.trim());
            if (msg.includes("listening") || msg.includes("Server listening")) resolveOnce();
          });
        }

        serverProcess.on("exit", (code) => {
          console.log(`[HMS] Prod Server utilityProcess exited with code ${code}`);
        });

        setTimeout(resolveOnce, 3000);
      } catch (err) {
        console.error("[HMS] Failed to fork server utilityProcess:", err.message);
        reject(err);
      }
    }
  });
}

// ─── Frontend Dev Server Spawning (DEV only) ──────────────────────────────────
function startFrontendDevServer() {
  return new Promise((resolve) => {
    const clientDir = path.join(PROJECT_ROOT, "client");
    console.log("[HMS] Starting frontend dev server from:", clientDir);

    clientProcess = spawn("npm", ["run", "dev"], {
      cwd: clientDir,
      env: { ...process.env, NODE_ENV: "development" },
      shell: true,
    });

    let resolved = false;
    const resolveOnce = (delay = 0) => {
      if (!resolved) { resolved = true; setTimeout(resolve, delay); }
    };

    clientProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log("[CLIENT]", msg.trim());
      if (msg.includes("localhost") || msg.includes("ready") || msg.includes("5173")) resolveOnce(500);
    });

    clientProcess.stderr.on("data", (data) => {
      console.log("[CLIENT STDERR]", data.toString().trim());
    });

    clientProcess.on("error", (err) => {
      console.error("[HMS] Client spawn error:", err.message);
      resolveOnce();
    });

    setTimeout(resolveOnce, 10000);
  });
}

// ─── Health / Readiness Polling ───────────────────────────────────────────────
function pollUntilReady(url, label, timeout = 60000, interval = 800) {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      http.get(url, (res) => {
        console.log(`[HMS] ${label} ready (HTTP ${res.statusCode})`);
        resolve(true);
      }).on("error", () => {
        if (Date.now() - start > timeout) {
          console.warn(`[HMS] ${label} timed out — proceeding anyway`);
          resolve(false);
        } else {
          setTimeout(check, interval);
        }
      });
    }
    check();
  });
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}`, (res) => resolve(true)).on("error", () => resolve(false));
  });
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
function killChildProcesses() {
  if (serverProcess) {
    try {
      if (typeof serverProcess.kill === "function") {
        serverProcess.kill();
      } else if (serverProcess.pid) {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", serverProcess.pid.toString(), "/f", "/t"], { shell: true });
        } else {
          serverProcess.kill();
        }
      }
    } catch (e) {
      console.warn("[HMS] Error stopping serverProcess:", e.message);
    }
    serverProcess = null;
  }

  if (clientProcess && !clientProcess.killed) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", clientProcess.pid.toString(), "/f", "/t"], { shell: true });
      } else {
        clientProcess.kill("SIGTERM");
      }
    } catch (e) {
      console.warn("[HMS] Error stopping clientProcess:", e.message);
    }
    clientProcess = null;
  }

  if (staticClientServer) {
    try {
      staticClientServer.close();
    } catch (e) {}
    staticClientServer = null;
  }
}

function quitApp() {
  isQuitting = true;
  killChildProcesses();
  if (tray) { tray.destroy(); tray = null; }
  app.quit();
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
ipcMain.handle("get-server-port", () => SERVER_PORT);
ipcMain.handle("get-client-port", () => CLIENT_PORT);
ipcMain.handle("is-dev", () => IS_DEV);
ipcMain.on("quit-app", () => quitApp());

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  console.log(`\n[HMS] ==========================================`);
  console.log(`[HMS] Hospital Management System Desktop`);
  console.log(`[HMS] IS_DEV: ${IS_DEV} | NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[HMS] userData: ${app.getPath("userData")}`);
  console.log(`[HMS] ==========================================\n`);

  createSplashWindow();

  const [serverRunning, clientRunning] = await Promise.all([
    isPortOpen(SERVER_PORT),
    isPortOpen(CLIENT_PORT),
  ]);

  console.log(`[HMS] Server (port ${SERVER_PORT}): ${serverRunning ? "already running" : "not running"}`);
  console.log(`[HMS] Client (port ${CLIENT_PORT}): ${clientRunning ? "already running" : "not running"}`);

  try {
    if (!serverRunning) {
      console.log("[HMS] Spawning backend server...");
      await startBackendServer();
      await pollUntilReady(`${SERVER_URL}/api/v1/health`, "Backend");
    } else {
      console.log("[HMS] Backend already running — skipping spawn.");
    }

    if (IS_DEV) {
      if (!clientRunning) {
        console.log("[HMS] Spawning frontend dev server...");
        await startFrontendDevServer();
        await pollUntilReady(VITE_URL, "Frontend Vite");
      } else {
        console.log("[HMS] Frontend dev server already running — skipping spawn.");
      }
    } else {
      // PRODUCTION MODE: Start embedded static client HTTP server for client/dist
      const clientDistDir = path.join(process.resourcesPath, "client", "dist");
      console.log("[HMS] Production mode: serving client/dist from:", clientDistDir);
      staticClientServer = await startStaticClientServer(clientDistDir, CLIENT_PORT);
      await pollUntilReady(VITE_URL, "Static Client Server");
    }
  } catch (err) {
    console.error("[HMS] Startup error:", err.message);
  }

  const win = createMainWindow();

  const loadDelay = (serverRunning && clientRunning) ? 0 : 1500;
  console.log(`[HMS] Loading URL in ${loadDelay}ms: ${VITE_URL}`);
  setTimeout(() => {
    if (win && !win.isDestroyed()) {
      win.loadURL(VITE_URL).catch((err) => {
        console.error("[HMS] Initial loadURL failed:", err.message);
      });
    }
  }, loadDelay);

  createTray();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") quitApp();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  killChildProcesses();
});

app.on("will-quit", () => {
  killChildProcesses();
});

// ─── Security: prevent external navigation ────────────────────────────────────
app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const allowed = ["localhost", "127.0.0.1"];
      if (!allowed.includes(parsedUrl.hostname)) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch (_) {}
  });

  contents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      const allowed = ["localhost", "127.0.0.1"];
      if (!allowed.includes(parsedUrl.hostname)) {
        shell.openExternal(url);
        return { action: "deny" };
      }
    } catch (_) {}
    return { action: "allow" };
  });
});
