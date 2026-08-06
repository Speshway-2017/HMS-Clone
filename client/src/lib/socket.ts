import { io, Socket } from "socket.io-client";

// Detect API server URL from window location if VITE_API_URL is relative or unspecified
const getSocketUrl = (): string => {
  const envUrl = (import.meta as any).env.VITE_API_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // Default backend port 5000 in dev
    return `${protocol}//${hostname}:5000`;
  }
  return "http://localhost:5000";
};

const SOCKET_URL = getSocketUrl();

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  auth: (cb) => {
    const token = localStorage.getItem("token") || localStorage.getItem("hms_auth_token");
    cb({ token });
  },
});

socket.on("connect", () => {
  console.log(`[WebSocket] Connected successfully (ID: ${socket.id}) to ${SOCKET_URL}`);
});

socket.on("disconnect", (reason) => {
  console.warn(`[WebSocket] Disconnected: ${reason}`);
});

socket.on("connect_error", (error) => {
  console.error("[WebSocket] Connection error:", error.message);
});

socket.on("reconnect", (attemptNumber) => {
  console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
});

socket.on("reconnect_attempt", (attemptNumber) => {
  console.log(`[WebSocket] Reconnection attempt #${attemptNumber}`);
});

// Periodic ping heartbeat check
setInterval(() => {
  if (socket.connected) {
    const start = Date.now();
    socket.emit("ping_server", (res: any) => {
      const latency = Date.now() - start;
      if (latency > 1000) {
        console.warn(`[WebSocket] High latency detected: ${latency}ms`);
      }
    });
  }
}, 30000);
