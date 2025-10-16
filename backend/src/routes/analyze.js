import express from "express";
import { analyzeLogs } from "../services/langchainService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { logData } = req.body;
  if (!logData) return res.status(400).json({ error: "No log data provided" });
  try {
    const summary = await analyzeLogs(logData);
    res.json({ summary });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
