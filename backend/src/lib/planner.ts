import { ai } from "./ai";

export type PlanStep = {
  order: number;
  title: string;
  description: string;
  tool: "search" | "analyze" | "summarize" | "compare";
};

export type ResearchPlan = {
  goal: string;
  steps: PlanStep[];
};

const PLANNER_SYSTEM_PROMPT = `You are a research planning assistant.

Given a research goal, generate a structured plan with ordered steps.

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Minimum 2 steps, maximum 7 steps.
- Each step must have exactly these fields:
  - order: number (starting from 1)
  - title: string (short, max 8 words)
  - description: string (one sentence explaining what this step does)
  - tool: one of "search" | "analyze" | "summarize" | "compare"

Response format:
{
  "steps": [
    {
      "order": 1,
      "title": "Find main competitors",
      "description": "Search for the top competitors in the market segment.",
      "tool": "search"
    }
  ]
}`;

function validateSteps(raw: unknown): PlanStep[] {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("steps" in raw) ||
    !Array.isArray((raw as { steps: unknown }).steps)
  ) {
    throw new Error("Invalid plan shape: missing steps array");
  }

  const steps = (raw as { steps: unknown[] }).steps;

  if (steps.length < 2) {
    throw new Error(`Plan has too few steps: ${steps.length}`);
  }

  if (steps.length > 7) {
    throw new Error(`Plan has too many steps: ${steps.length}`);
  }

  const validTools = new Set(["search", "analyze", "summarize", "compare"]);

  return steps.map((step, i) => {
    const s = step as Record<string, unknown>;

    if (typeof s.order !== "number") throw new Error(`Step ${i}: order must be a number`);
    if (typeof s.title !== "string" || !s.title.trim()) throw new Error(`Step ${i}: title must be a non-empty string`);
    if (typeof s.description !== "string" || !s.description.trim()) throw new Error(`Step ${i}: description must be a non-empty string`);
    if (typeof s.tool !== "string" || !validTools.has(s.tool)) throw new Error(`Step ${i}: tool must be one of search | analyze | summarize | compare`);

    return {
      order: s.order,
      title: s.title.trim(),
      description: s.description.trim(),
      tool: s.tool as PlanStep["tool"],
    };
  });
}

export async function generatePlan(goal: string): Promise<ResearchPlan> {
  const response = await ai.chat([
    { role: "system", content: PLANNER_SYSTEM_PROMPT },
    { role: "user", content: `Research goal: ${goal}` },
  ]);

  let parsed: unknown;

  try {
    // Strip markdown code fences if AI wraps response despite instructions
    const cleaned = response.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI returned non-JSON response: ${response.text.slice(0, 200)}`);
  }

  const steps = validateSteps(parsed);

  return { goal, steps };
}