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
