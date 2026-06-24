"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
function require_env(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
const AI_PROVIDER = require_env("AI_PROVIDER");
if (AI_PROVIDER !== "groq" && AI_PROVIDER !== "mistral") {
    throw new Error(`AI_PROVIDER must be "groq" or "mistral", got: "${AI_PROVIDER}"`);
}
exports.config = {
    port: parseInt(process.env.PORT ?? "4000", 10),
    supabase: {
        url: require_env("SUPABASE_URL"),
        serviceRoleKey: require_env("SUPABASE_SERVICE_ROLE_KEY"),
    },
    n8n: {
        baseUrl: require_env("N8N_BASE_URL"),
    },
    ai: {
        provider: AI_PROVIDER,
        groqApiKey: process.env.GROQ_API_KEY,
        mistralApiKey: process.env.MISTRAL_API_KEY,
    },
};
// Validate the selected provider has its key
if (exports.config.ai.provider === "groq" && !exports.config.ai.groqApiKey) {
    throw new Error("AI_PROVIDER is groq but GROQ_API_KEY is not set");
}
if (exports.config.ai.provider === "mistral" && !exports.config.ai.mistralApiKey) {
    throw new Error("AI_PROVIDER is mistral but MISTRAL_API_KEY is not set");
}
