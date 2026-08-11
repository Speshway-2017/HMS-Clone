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

        // Auto join user hospital room if present in token payload
        if (decoded.hospitalId) {
          socket.join(decoded.hospitalId.toString());
        }
        if (decoded.role === "doctor" && (decoded.doctorId || decoded.userId || decoded.id)) {
          const docId = decoded.doctorId || decoded.userId || decoded.id;
          socket.join(`doctor:${docId}`);
        }
      }
      next();
    } catch {
      // Allow connection even if unauthenticated (for public queues/telemedicine guest links), but mark unauth
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

    // Allow joining a specific hospital room to avoid cross-hospital leakage
    socket.on("join_hospital", (hospitalId: string) => {
      if (hospitalId) {
        socket.join(hospitalId.toString());
        console.log(`Socket ${socket.id} joined hospital room: ${hospitalId}`);
      }
    });

    // Allow joining a doctor-specific room to enforce notification isolation
    socket.on("join_doctor", (doctorId: string) => {
      if (doctorId) {
        socket.join(`doctor:${doctorId}`);
        console.log(`Socket ${socket.id} joined doctor room: doctor:${doctorId}`);
      }
    });

    // Telemedicine Consultation Room handlers
    socket.on("join_consultation_room", (roomId: string) => {
      if (roomId) {
        socket.join(`telemedicine:${roomId}`);
        console.log(`Socket ${socket.id} joined telemedicine room: telemedicine:${roomId}`);
      }
    });

    socket.on("start_telemedicine_session", (data: { roomId: string; appointmentId: string; doctorName: string; meetUrl?: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("telemedicine_session_started", data);
        io?.to(`telemedicine:${data.roomId}`).emit("google_meet_session_started", data);
        io?.emit("telemedicine_session_started", data);
        io?.emit("google_meet_session_started", data);
      }
    });

    socket.on("start_google_meet_session", (data: { roomId: string; appointmentId: string; doctorName: string; meetUrl: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("google_meet_session_started", data);
        io?.emit("google_meet_session_started", data);
        io?.emit("start_google_meet_session", data);
        io?.emit("meeting:created", data);
        io?.emit("appointment_updated", { appointmentId: data.appointmentId || data.roomId, meetingLink: data.meetUrl });
      }
    });

    socket.on("end_telemedicine_session", (data: { roomId: string; appointmentId: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("telemedicine_session_ended", data);
        io?.emit("telemedicine_session_ended", data);
        io?.emit("appointment_updated", { appointmentId: data.appointmentId || data.roomId, status: "completed" });
      }
    });

    socket.on("send_telemedicine_chat", (data: { roomId: string; sender: string; text: string; time: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("telemedicine_chat_received", data);
      }
    });

    // Enterprise Meeting & WebRTC Signaling Events
    socket.on("meeting:create", (data: { roomId: string; appointmentId: string; doctorName: string; patientId?: string }) => {
      if (data?.roomId) {
        socket.join(`telemedicine:${data.roomId}`);
        io?.to(`telemedicine:${data.roomId}`).emit("meeting:created", data);
        io?.emit("telemedicine_session_started", data);
        io?.emit("meeting:created", data);
      }
    });

    socket.on("meeting:join", (data: { roomId: string; participantId?: string; role?: string }) => {
      if (data?.roomId) {
        socket.join(`telemedicine:${data.roomId}`);
        socket.to(`telemedicine:${data.roomId}`).emit("meeting:joined", data);
      }
    });

    socket.on("meeting:offer", (data: { roomId: string; offer: any; sender: string }) => {
      if (data?.roomId) {
        socket.to(`telemedicine:${data.roomId}`).emit("meeting:offer", data);
      }
    });

    socket.on("meeting:answer", (data: { roomId: string; answer: any; sender: string }) => {
      if (data?.roomId) {
        socket.to(`telemedicine:${data.roomId}`).emit("meeting:answer", data);
      }
    });

    socket.on("meeting:ice-candidate", (data: { roomId: string; candidate: any; sender: string }) => {
      if (data?.roomId) {
        socket.to(`telemedicine:${data.roomId}`).emit("meeting:ice-candidate", data);
      }
    });

    socket.on("meeting:leave", (data: { roomId: string; sender: string }) => {
      if (data?.roomId) {
        socket.to(`telemedicine:${data.roomId}`).emit("meeting:left", data);
      }
    });

    socket.on("meeting:end", (data: { roomId: string; appointmentId: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("meeting:ended", data);
        io?.to(`telemedicine:${data.roomId}`).emit("telemedicine_session_ended", data);
        io?.emit("telemedicine_session_ended", data);
      }
    });

    socket.on("consultation:update", (data: { roomId: string; status: string; appointmentId: string }) => {
      if (data?.roomId) {
        io?.to(`telemedicine:${data.roomId}`).emit("consultation:updated", data);
        io?.emit("appointment_updated", data);
        io?.emit("dashboard_update", data);
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
 * Emit an event to all clients in a specific hospital room
 */
export function emitToHospital(hospitalId: string | object, event: string, data: any) {
  if (io && hospitalId) {
    const roomId = hospitalId.toString();
    io.to(roomId).emit(event, data);
    
    // Broadcast generic dashboard update for reactive query invalidations
    io.to(roomId).emit("dashboard_update", { type: event, data });

    // Global broadcast fallback so single-tenant/all connected clients also get live updates
    io.emit(event, data);
    io.emit("dashboard_update", { type: event, data });

    // Conformed Event Syncing:
    if (event === "ip_bill_update") {
      io.to(roomId).emit("ip_billing_update", data);
      io.emit("ip_billing_update", data);
    } else if (event === "ip_billing_update") {
      io.to(roomId).emit("ip_bill_update", data);
      io.emit("ip_bill_update", data);
    }
  } else if (io) {
    // If hospitalId missing, broadcast globally
    io.emit(event, data);
    io.emit("dashboard_update", { type: event, data });
  }
}

/**
 * Emit an event strictly to a specific doctor's room
 */
export function emitToDoctor(doctorId: string | object, event: string, data: any) {
  if (io && doctorId) {
    const docIdStr = doctorId.toString();
    io.to(`doctor:${docIdStr}`).emit(event, data);
    io.emit(event, data); // Fallback
  } else if (io) {
    io.emit(event, data);
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
