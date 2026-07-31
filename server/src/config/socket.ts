import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;
let isSocketInitialized = false;

export function initSocket(server: HTTPServer, _clientUrl: string) {
  io = new Server(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  isSocketInitialized = true;

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

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

    // Conformed Event Syncing:
    if (event === "ip_bill_update") {
      io.to(roomId).emit("ip_billing_update", data);
    } else if (event === "ip_billing_update") {
      io.to(roomId).emit("ip_bill_update", data);
    }
  }
}

/**
 * Emit an event strictly to a specific doctor's room
 */
export function emitToDoctor(doctorId: string | object, event: string, data: any) {
  if (io && doctorId) {
    io.to(`doctor:${doctorId}`).emit(event, data);
  }
}

/**
 * Broadcast an event to all connected sockets
 */
export function broadcastGlobal(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
