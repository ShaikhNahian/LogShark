import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import uploadRouter from "./routes/upload.js";
import analyzeRouter from "./routes/analyze.js";
import { streamRemoteLogs } from "./services/sshService.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Existing routes
app.use("/upload", uploadRouter);
app.use("/analyze", analyzeRouter);

// ✅ NEW: SSH Log Streaming Endpoint
app.post("/stream", (req, res) => {
  const { host, username, password, logPath } = req.body;

  if (!host || !username || !password || !logPath) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Set up streaming headers
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
  });

  try {
    streamRemoteLogs(
      { host, username, password, logPath },
      (line) => res.write(line),
      () => res.end()
    );
  } catch (err) {
    console.error("SSH stream error:", err);
    res.status(500).json({ error: "Failed to stream remote logs" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`LogShark backend running on port ${PORT}`)
);

export default app;
