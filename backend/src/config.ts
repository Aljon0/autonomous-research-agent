import "dotenv/config";

function require_env(key: string): string {
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

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),

  supabase: {
    url: require_env("SUPABASE_URL"),
    serviceRoleKey: require_env("SUPABASE_SERVICE_ROLE_KEY"),
  },

  n8n: {
    baseUrl: require_env("N8N_BASE_URL"),
  },

  ai: {
    provider: AI_PROVIDER as "groq" | "mistral",
    groqApiKey: process.env.GROQ_API_KEY,
    mistralApiKey: process.env.MISTRAL_API_KEY,
  },

  search: {
    apiKey: require_env("SEARCH_API_KEY"),
  },
} as const;

// Validate the selected provider has its key
if (config.ai.provider === "groq" && !config.ai.groqApiKey) {
  throw new Error("AI_PROVIDER is groq but GROQ_API_KEY is not set");
}

if (config.ai.provider === "mistral" && !config.ai.mistralApiKey) {
  throw new Error("AI_PROVIDER is mistral but MISTRAL_API_KEY is not set");
}