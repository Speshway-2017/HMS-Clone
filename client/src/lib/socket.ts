import { io, Socket } from "socket.io-client";

// In development, the backend runs on port 5000. In production, same origin.
const SOCKET_URL = window.location.hostname === "localhost" ? "http://localhost:5000" : window.location.origin;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Socket client connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Socket client disconnected");
});
