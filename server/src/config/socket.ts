import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env";

let io: Server | null = null;
let isSocketInitialized = false;

export function initSocket(server: HTTPServer, _clientUrl: string) {
  io = new Server(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  // JWT Token Authentication Middleware for Sockets
  io.use((socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (authHeader) {
        const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        const decoded = jwt.verify(token, env.jwtSecret) as any;
        socket.data.user = decoded;

        // Auto join user hospital & branch room if present in token payload
        if (decoded.hospitalId) {
          socket.join(decoded.hospitalId.toString());
          if (decoded.branchId) {
            socket.join(`hospital:${decoded.hospitalId}:branch:${decoded.branchId}`);
          }
        }
        if (decoded.role === "doctor" && (decoded.doctorId || decoded.userId || decoded.id)) {
          const docId = decoded.doctorId || decoded.userId || decoded.id;
          socket.join(`doctor:${docId}`);
        }
      }
      next();
    } catch {
      // Allow connection even if unauthenticated
      next();
    }
  });

  isSocketInitialized = true;

  io.on("connection", (socket: Socket) => {
    const userInfo = socket.data.user ? `[User: ${socket.data.user.email || socket.data.user.id}]` : "[Guest]";
    console.log(`✓ Socket connected: ${socket.id} ${userInfo}`);

    // Heartbeat / ping-pong handler
    socket.on("ping_server", (callback?: (res: any) => void) => {
      if (typeof callback === "function") {
        callback({ status: "ok", timestamp: Date.now(), socketId: socket.id });
      }
    });

    // Allow joining a specific hospital & branch room
    socket.on("join_hospital", (hospitalId: string, branchId?: string) => {
      if (hospitalId) {
        socket.join(hospitalId.toString());
        if (branchId) {
          socket.join(`hospital:${hospitalId}:branch:${branchId}`);
        }
      }
    });

    socket.on("join_branch", (data: { hospitalId: string; branchId: string }) => {
      if (data?.hospitalId && data?.branchId) {
        socket.join(`hospital:${data.hospitalId}:branch:${data.branchId}`);
      }
    });

    // Allow joining a doctor-specific room
    socket.on("join_doctor", (doctorId: string) => {
      if (doctorId) {
        socket.join(`doctor:${doctorId}`);
      }
    });

    // Telemedicine Consultation Room handlers
    socket.on("join_consultation_room", (roomId: string) => {
      if (roomId) {
        socket.join(`telemedicine:${roomId}`);
      }
    });

    socket.on("start_telemedicine_session", (data: { roomId: string; appointmentId: string; doctorName: string; meetUrl?: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("telemedicine_session_started", data);
        io?.to(`telemedicine:${data.roomId}`).emit("google_meet_session_started", data);
      }
    });

    socket.on("start_google_meet_session", (data: { roomId: string; appointmentId: string; doctorName: string; meetUrl: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("google_meet_session_started", data);
      }
    });

    socket.on("end_telemedicine_session", (data: { roomId: string; appointmentId: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("telemedicine_session_ended", data);
      }
    });

    socket.on("send_telemedicine_chat", (data: { roomId: string; sender: string; text: string; time: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("telemedicine_chat_received", data);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  console.log("✓ Socket.IO initialized");
  return io;
}

export function closeSocket(): Promise<void> {
  return new Promise((resolve) => {
    if (io) {
      io.close(() => {
        isSocketInitialized = false;
        console.log("✓ Socket.IO closed");
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getSocketStatus(): boolean {
  return isSocketInitialized && io !== null;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
}

/**
 * Emit an event to all clients in a specific hospital and optional branch room
 */
export function emitToHospital(hospitalId: string | object, event: string, data: any, branchId?: string | object | null) {
  if (io && hospitalId) {
    const hId = hospitalId.toString();
    const bId = branchId ? branchId.toString() : null;

    if (bId) {
      const branchRoom = `hospital:${hId}:branch:${bId}`;
      io.to(branchRoom).emit(event, data);
      io.to(branchRoom).emit("dashboard_update", { type: event, data });
    }

    // Always emit to hospital room (for admins viewing all branches)
    io.to(hId).emit(event, data);
    io.to(hId).emit("dashboard_update", { type: event, data });
  }
}

/**
 * Emit an event strictly to a specific doctor's room
 */
export function emitToDoctor(doctorId: string | object, event: string, data: any) {
  if (io && doctorId) {
    const docIdStr = doctorId.toString();
    io.to(`doctor:${docIdStr}`).emit(event, data);
  }
}

/**
 * Broadcast an event to all connected sockets
 */
export function broadcastGlobal(event: string, data: any) {
  if (io) {
    io.emit(event, data);
    io.emit("dashboard_update", { type: event, data });
  }
}
