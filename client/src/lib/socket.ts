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
