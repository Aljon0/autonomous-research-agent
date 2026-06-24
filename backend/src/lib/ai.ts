import { config } from "../config";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatResponse = {
  text: string;
  provider: "groq" | "mistral";
};

async function chatGroq(messages: ChatMessage[]): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.ai.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error ${response.status}: ${error}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content ?? "";
}

async function chatMistral(messages: ChatMessage[]): Promise<string> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.ai.mistralApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error ${response.status}: ${error}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content ?? "";
}

async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  if (config.ai.provider === "groq") {
    const text = await chatGroq(messages);
    return { text, provider: "groq" };
  }

  const text = await chatMistral(messages);
  return { text, provider: "mistral" };
}

async function ping(): Promise<boolean> {
  try {
    const response = await chat([
      { role: "user", content: "Reply with the word OK and nothing else." },
    ]);
    return response.text.trim().length > 0;
  } catch {
    return false;
  }
}

export const ai = {
  chat,
  ping,
};