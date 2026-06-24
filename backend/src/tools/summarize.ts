import { ai } from "../lib/ai";
import type { ToolResult } from "./search";

export async function runSummarizeTool(
  stepTitle: string,
  stepDescription: string,
  goal: string,
  previousFindings: string[]
): Promise<ToolResult> {
  if (previousFindings.length === 0) {
    return {
      finding: "No previous findings available to summarize.",
      sources: [],
    };
  }

  const findingsText = previousFindings
    .map((f, i) => `[${i + 1}] ${f}`)
    .join("\n\n");

  const response = await ai.chat([
    {
      role: "system",
      content: `You are a research summarizer. Given a set of research findings, 
produce a clear and concise summary that captures the most important insights.

Rules:
- 3-5 sentences maximum
- Highlight the most important patterns and insights
- Connect findings into a coherent narrative
- Do not repeat findings verbatim
- Do not use markdown or bullet points
- Focus on what matters most for the research goal`,
    },
    {
      role: "user",
      content: `Research goal: ${goal}
Summarization task: ${stepTitle}
Description: ${stepDescription}

Findings to summarize:
${findingsText}`,
    },
  ]);

  return {
    finding: response.text.trim(),
    sources: [],
  };
}