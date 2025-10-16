import express from "express";
import multer from "multer";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("logfile"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const logData = fs.readFileSync(req.file.path, "utf8");
  // optionally remove uploaded file
  try { fs.unlinkSync(req.file.path); } catch (e) {}
  res.json({ message: "Log uploaded", logData });
});

export default router;
