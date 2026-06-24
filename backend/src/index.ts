import express from "express";
import cors from "cors";
import { config } from "./config";
import healthRouter from "./routes/health";
import researchRouter from "./routes/research";
import executeRouter from "./routes/execute";
import reportRouter from "./routes/report";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  methods: ["GET", "POST"],
}));

app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/research", researchRouter);
app.use("/api/research/:id/execute", executeRouter);
app.use("/api/research/:id/report", reportRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
  console.log(`AI provider: ${config.ai.provider}`);
});