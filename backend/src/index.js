import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import uploadRouter from "./routes/upload.js";
import analyzeRouter from "./routes/analyze.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/upload", uploadRouter);
app.use("/analyze", analyzeRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`LogShark backend running on port ${PORT}`));

export default app;
