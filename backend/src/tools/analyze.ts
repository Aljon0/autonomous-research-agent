import { ai } from "../lib/ai";
import type { ToolResult } from "./search";

export async function runAnalyzeTool(
  stepTitle: string,
  stepDescription: string,
  goal: string,
  previousFindings: string[]
): Promise<ToolResult> {
  const context =
    previousFindings.length > 0
      ? `\n\nPrevious research findings:\n${previousFindings
          .map((f, i) => `[${i + 1}] ${f}`)
          .join("\n")}`
      : "";

  const response = await ai.chat([
    {
      role: "system",
      content: `You are a research analyst. Analyze the given topic in the context of the 
research goal. Use any previous findings as context.

Rules:
- Be specific and factual
- 3-5 sentences
- Focus on actionable insights
- Do not use markdown or bullet points
- Draw connections to previous findings when relevant`,
    },
    {
      role: "user",
      content: `Research goal: ${goal}
Step to analyze: ${stepTitle}
Description: ${stepDescription}${context}`,
    },
  ]);

  return {
    finding: response.text.trim(),
    sources: [],
  };
}