import { io, Socket } from "socket.io-client";
import { getBaseUrl } from "./api";

// Detect API server URL from active API base URL configuration
export const getSocketUrl = (): string => {
  const apiBase = getBaseUrl();
  try {
    const urlObj = new URL(apiBase);
    return urlObj.origin;
  } catch (_) {
    return apiBase.replace(/\/api\/v1\/?$/, "");
  }
};

const SOCKET_URL = getSocketUrl();

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["polling", "websocket"],
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
  // Connected successfully
});

socket.on("disconnect", (reason) => {
  console.warn(`[WebSocket] Disconnected: ${reason}`);
});

socket.on("connect_error", (error) => {
  console.error("[WebSocket] Connection error:", error.message);
});

socket.on("reconnect", () => {
  // Reconnected successfully
});

socket.on("reconnect_attempt", () => {
  // Reconnection attempt
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
