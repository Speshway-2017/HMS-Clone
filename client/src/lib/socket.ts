import { io, Socket } from "socket.io-client";

// API URL configuration: Use VITE_API_URL environment variable for LAN support
// Set VITE_API_URL should be set to your local machine's local network IP address (e.g., http://192.168.1.100:5000)
const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:5000";

export const socket: Socket = io(API_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Socket client connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Socket client disconnected");
});
