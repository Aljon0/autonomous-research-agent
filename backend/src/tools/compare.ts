import { ai } from "../lib/ai";
import type { ToolResult } from "./search";

export async function runCompareTool(
  stepTitle: string,
  stepDescription: string,
  goal: string,
  previousFindings: string[]
): Promise<ToolResult> {
  if (previousFindings.length < 2) {
    return {
      finding:
        "Not enough findings to compare. At least 2 previous findings are required.",
      sources: [],
    };
  }

  const findingsText = previousFindings
    .map((f, i) => `[${i + 1}] ${f}`)
    .join("\n\n");

  const response = await ai.chat([
    {
      role: "system",
      content: `You are a research analyst specializing in comparative analysis.
Given a set of research findings, identify meaningful similarities, differences,
and contrasts relevant to the research goal.

Rules:
- 3-5 sentences maximum
- Identify at least one similarity and one difference
- Focus on contrasts that are meaningful to the research goal
- Do not use markdown or bullet points
- Be specific, reference actual content from the findings
- End with a concise insight or conclusion from the comparison`,
    },
    {
      role: "user",
      content: `Research goal: ${goal}
Comparison task: ${stepTitle}
Description: ${stepDescription}

Findings to compare:
${findingsText}`,
    },
  ]);

  return {
    finding: response.text.trim(),
    sources: [],
  };
}