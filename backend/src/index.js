import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as IOServer } from "socket.io";

import uploadRouter from "./routes/upload.js";
import analyzeRouter from "./routes/analyze.js";
import { startSSHStream } from "./services/sshService.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/upload", uploadRouter);
app.use("/analyze", analyzeRouter);

// http server
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// map socket.id -> { sshController }
const socketStreams = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("start_stream", (payload) => {
    const { host, username, password, logPath } = payload || {};

    if (!host || !username || !logPath) {
      socket.emit("error", "Missing required fields: host, username, logPath");
      return;
    }

    // stop if existing stream already for socket
    if (socketStreams.has(socket.id)) {
      try { socketStreams.get(socket.id).stop(); } catch (e) { /* */ }
      socketStreams.delete(socket.id);
    }

    // new ssh stream start
    try {
      const controller = startSSHStream(
        { host, username, password, logPath },
        (chunk) => {
          // emit each chunk to this socket only
          socket.emit("log", chunk);
        },
        (err) => {
          if (err) socket.emit("error", `SSH stream closed with error: ${String(err)}`);
          else socket.emit("info", "SSH stream closed");
          // cleanup
          socketStreams.delete(socket.id);
        }
      );

      socketStreams.set(socket.id, controller);
      socket.emit("info", "Stream started");
    } catch (err) {
      console.error("Failed to start SSH stream:", err);
      socket.emit("error", "Failed to start SSH stream: " + String(err));
    }
  });

  socket.on("stop_stream", () => {
    const ctrl = socketStreams.get(socket.id);
    if (ctrl) {
      try { ctrl.stop(); } catch (e) { /* */ }
      socketStreams.delete(socket.id);
      socket.emit("info", "Stream stopped");
    } else {
      socket.emit("info", "No active stream to stop");
    }
  });

  socket.on("disconnect", () => {
    const ctrl = socketStreams.get(socket.id);
    if (ctrl) {
      try { ctrl.stop(); } catch (e) { /* */ }
      socketStreams.delete(socket.id);
    }
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`LogShark backend running on port ${PORT}`));

export default app;

