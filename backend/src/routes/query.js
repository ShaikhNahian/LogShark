import express from "express";
import { askAboutLogs } from "../services/askService.js";

const router = express.Router();

/**
POST /query
body: { logData: string, question: string, history?: [{role,content}] }
*/
router.post("/", async (req, res) => {
  const { logData, question, history } = req.body;
  if (!logData || !question) return res.status(400).json({ error: "logData and question required" });

  try {
    const answer = await askAboutLogs({ logText: logData, question, history });
    res.json({ answer });
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Analysis failed", details: String(err?.message ?? err) });
  }
});

export default router;
