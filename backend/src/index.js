/**
 * @author Shaikh Nahian
*/
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as IOServer } from "socket.io";

import uploadRouter from "./routes/upload.js";
import analyzeRouter from "./routes/analyze.js";
import queryRouter from "./routes/query.js";
import { startSSHStream } from "./services/sshService.js";
import { askAboutLogs } from "./services/askService.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/upload", uploadRouter);
app.use("/analyze", analyzeRouter);
app.use("/query", queryRouter);

// http server
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

/**
 * socketSessions map:
 *   socket.id => { controller, buffer: string[], history: [{role,content}], lastAskAt: timestamp }
 */
const socketSessions = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Helper to initialize a session object for this socket
  function ensureSession() {
    if (!socketSessions.has(socket.id)) {
      socketSessions.set(socket.id, {
        controller: null,
        buffer: [], // array of recent lines
        history: [], // chat history {role,content}
      });
    }
    return socketSessions.get(socket.id);
  }

  socket.on("start_stream", (payload) => {
    const { host, username, password, logPath } = payload || {};

    if (!host || !username || !logPath) {
      socket.emit("error", "Missing required fields: host, username, logPath");
      return;
    }

    // stop if existing stream already for socket
    const prev = socketSessions.get(socket.id);
    if (prev && prev.controller) {
      try { prev.controller.stop(); } catch (e) { /* ignore */ }
      socketSessions.delete(socket.id);
    }

    // create / initialize session
    const session = ensureSession();
    session.buffer = [];
    session.history = session.history || [];

    // new ssh stream start
    try {
      const controller = startSSHStream(
        { host, username, password, logPath },
        (chunk) => {
          // chunk may contain multiple lines; split and append to buffer
          try {
            const text = String(chunk);
            const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
            if (lines.length) {
              // append lines, keep only last N lines
              session.buffer.push(...lines);
              const MAX_BUFFER_LINES = 2000;
              if (session.buffer.length > MAX_BUFFER_LINES) {
                session.buffer = session.buffer.slice(-MAX_BUFFER_LINES);
              }
            }
          } catch (e) {
            console.error("Error updating buffer:", e);
          }

          // emit raw chunk to client
          socket.emit("log", chunk);
        },
        (err) => {
          if (err) socket.emit("error", `SSH stream closed with error: ${String(err)}`);
          else socket.emit("info", "SSH stream closed");
          // cleanup
          const s = socketSessions.get(socket.id);
          if (s && s.controller) {
            try { s.controller.stop(); } catch (e) { /* */ }
          }
          socketSessions.delete(socket.id);
        }
      );

      // store controller on session
      session.controller = controller;
      socketSessions.set(socket.id, session);

      socket.emit("info", "Stream started");
    } catch (err) {
      console.error("Failed to start SSH stream:", err);
      socket.emit("error", "Failed to start SSH stream: " + String(err));
    }
  });

  socket.on("stop_stream", () => {
    const session = socketSessions.get(socket.id);
    if (session && session.controller) {
      try { session.controller.stop(); } catch (e) { /* */ }
      socketSessions.delete(socket.id);
      socket.emit("info", "Stream stopped");
    } else {
      socket.emit("info", "No active stream to stop");
    }
  });

  //conversational QA
  socket.on("ask", async (payload) => {
    const question = payload?.question || payload; // support send as string or { question }
    if (!question || typeof question !== "string") {
      socket.emit("answer", { error: "No question provided" });
      return;
    }

    const session = socketSessions.get(socket.id);
    if (!session) {
      socket.emit("answer", { error: "No active stream. Start a stream first." });
      return;
    }

    try {
      socket.emit("ai_status", "Thinking...");

      // Build recent log context from buffer (last N lines)
      const MAX_LINES_FOR_ASK = 800;
      const recentLines = (session.buffer || []).slice(-MAX_LINES_FOR_ASK);
      const logText = recentLines.join("\n");

      // Use session.history for follow-ups (bounded)
      const history = session.history || [];

      // Call askAboutLogs (re-uses LLM switch inside)
      const answer = await askAboutLogs({ logText, question, history });

      // Save to history (keep bounded)
      const MAX_HISTORY = 20;
      session.history = session.history || [];
      session.history.push({ role: "user", content: question });
      session.history.push({ role: "assistant", content: answer });
      if (session.history.length > MAX_HISTORY) {
        session.history = session.history.slice(-MAX_HISTORY);
      }

      // Emit the answer back to the client
      socket.emit("answer", { answer });
    } catch (err) {
      console.error("socket ask error:", err);
      socket.emit("answer", { error: String(err?.message ?? err) });
    }
  });

  socket.on("disconnect", () => {
    const session = socketSessions.get(socket.id);
    if (session && session.controller) {
      try { session.controller.stop(); } catch (e) { /* */ }
    }
    socketSessions.delete(socket.id);
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`LogShark backend running on port ${PORT}`));

export default app;
