"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.n8n = void 0;
const config_1 = require("../config");
async function ping() {
    try {
        const response = await fetch(`${config_1.config.n8n.baseUrl}/healthz`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });
        if (response.ok)
            return true;
        // Some n8n versions use /health instead of /healthz
        const fallback = await fetch(`${config_1.config.n8n.baseUrl}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });
        return fallback.ok;
    }
    catch {
        return false;
    }
}
exports.n8n = {
    ping,
};
