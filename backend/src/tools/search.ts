import { config } from "../config";
import { ai } from "../lib/ai";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type ToolResult = {
  finding: string;
  sources: SearchResult[];
  raw?: unknown;
};

async function searchWeb(query: string): Promise<SearchResult[]> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": config.search.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 5 }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper API error ${response.status}: ${error}`);
  }

  const data = await response.json() as {
    organic?: {
      title: string;
      link: string;
      snippet: string;
    }[];
  };

  return (data.organic ?? []).slice(0, 5).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
  }));
}

export async function runSearchTool(
  stepTitle: string,
  stepDescription: string,
  goal: string
): Promise<ToolResult> {
  // 1. Build search query from step context
  const queryResponse = await ai.chat([
    {
      role: "system",
      content: `You are a search query generator. Generate a short, simple Google search query.
  Rules:
  - Maximum 6 words
  - No boolean operators (no OR, AND, NOT)
  - No quotes
  - No special characters
  - Return ONLY the query, nothing else`,
    },
    {
      role: "user",
      content: `Research goal: ${goal}\nStep: ${stepTitle}\nDescription: ${stepDescription}`,
    },
  ]);

  const query = queryResponse.text.trim();
  console.log(`[search] Generated query: "${query}"`);

  // 2. Run the search
  const results = await searchWeb(query);

  if (results.length === 0) {
    return {
      finding: "No search results found for this step.",
      sources: [],
    };
  }

  // 3. Ask AI to synthesize findings from snippets
  const snippetsText = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
    .join("\n\n");

  const synthesisResponse = await ai.chat([
    {
      role: "system",
      content: `You are a research assistant. Synthesize the following search results into a 
concise, factual finding of 2-4 sentences relevant to the research goal. 
Be specific and cite key facts. Do not use markdown.`,
    },
    {
      role: "user",
      content: `Research goal: ${goal}\nStep: ${stepTitle}\n\nSearch results:\n${snippetsText}`,
    },
  ]);

  return {
    finding: synthesisResponse.text.trim(),
    sources: results,
  };
}