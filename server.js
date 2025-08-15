import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";

import { connectMongo } from "./config/mongo.js";
import { pg } from "./config/postgres.js";

import authRoutes from "./routes/authRoutes.js";
import rideRoutes from "./routes/rideRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

import Ride from "./models/Ride.js"; // for socket room checks

dotenv.config();
await connectMongo();
await pg.connect(); // triggers pool connect log

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || "").split(","),
    credentials: true
  }
});

// Basic hardening
app.use(helmet());
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || "").split(","), credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/chat", chatRoutes);

// Socket.IO for realtime chat
io.on("connection", (socket) => {
  // client should emit 'chat:join' with { rideId }
  socket.on("chat:join", async ({ rideId, userId }) => {
    try {
      const ride = await Ride.findById(rideId);
      if (!ride) return;

      const allowed = [ride.creatorId, ...ride.requests, ...ride.confirmedUsers].includes(userId);
      if (!allowed) return;

      socket.join(`ride:${rideId}`);
    } catch {}
  });

  // when server-side sendMessage endpoint is hit, FE can listen 'chat:new'
  // you can also add a direct socket event to send if you prefer:
  socket.on("chat:send", async ({ rideId, userId, ciphertext, nonce }) => {
    // normally you would verify JWT in a socket middleware; for brevity assume trusted
    io.to(`ride:${rideId}`).emit("chat:new", { rideId, userId, ciphertext, nonce, sentAt: new Date().toISOString() });
  });
});

const port = process.env.PORT || 5000;
httpServer.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
