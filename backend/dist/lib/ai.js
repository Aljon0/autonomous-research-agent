"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const mistralai_1 = require("@mistralai/mistralai");
const config_1 = require("../config");
async function chat(messages) {
    if (config_1.config.ai.provider === "groq") {
        const client = new groq_sdk_1.default({ apiKey: config_1.config.ai.groqApiKey });
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            max_tokens: 1024,
        });
        const text = response.choices[0]?.message?.content ?? "";
        return { text, provider: "groq" };
    }
    // Mistral
    const client = new mistralai_1.Mistral({ apiKey: config_1.config.ai.mistralApiKey });
    const response = await client.chat.complete({
        model: "mistral-small-latest",
        messages,
        maxTokens: 1024,
    });
    const text = response.choices?.[0]?.message?.content ?? "";
    return {
        text: typeof text === "string" ? text : "",
        provider: "mistral",
    };
}
async function ping() {
    try {
        const response = await chat([
            { role: "user", content: "Reply with the word OK and nothing else." },
        ]);
        return response.text.trim().length > 0;
    }
    catch {
        return false;
    }
}
exports.ai = {
    chat,
    ping,
};
