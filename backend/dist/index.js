"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const health_1 = __importDefault(require("./routes/health"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    methods: ["GET", "POST"],
}));
app.use(express_1.default.json());
// Routes
app.use("/api/health", health_1.default);
// 404 fallback
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
app.listen(config_1.config.port, () => {
    console.log(`Backend running on port ${config_1.config.port}`);
    console.log(`AI provider: ${config_1.config.ai.provider}`);
});
