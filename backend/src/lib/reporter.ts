import { ai } from "./ai";

export type ReportFinding = {
  step: string;
  insight: string;
};

export type ResearchReport = {
  summary: string;
  findings: ReportFinding[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommendations: string[];
};

type StepContext = {
  stepTitle: string;
  tool: string;
  finding: string;
};

const REPORT_SYSTEM_PROMPT = `You are a research analyst generating a structured report.

Given a research goal and a set of findings from research steps, generate a comprehensive report.

Rules:
- Return ONLY valid JSON. No explanation, no markdown, no code blocks.
- Be specific and reference actual findings.
- Do not use markdown inside string values.
- Keep each string concise: 2-4 sentences maximum.

Response format:
{
  "summary": "Executive summary of the entire research in 3-5 sentences",
  "findings": [
    { "step": "Step title", "insight": "Key insight from this step in 1-2 sentences" }
  ],
  "strengths": [
    "Specific strength identified from the research"
  ],
  "weaknesses": [
    "Specific weakness or gap identified from the research"
  ],
  "opportunities": [
    "Specific opportunity identified from the research"
  ],
  "recommendations": [
    "Specific actionable recommendation based on the research"
  ]
}

Provide 2-4 items for each array section.`;

function validateReport(raw: unknown): ResearchReport {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid report: not an object");
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.summary !== "string" || !r.summary.trim()) {
    throw new Error("Invalid report: missing summary");
  }

  function validateStringArray(key: string): string[] {
    if (!Array.isArray(r[key])) {
      throw new Error(`Invalid report: ${key} must be an array`);
    }
    return (r[key] as unknown[])
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .map((item) => (item as string).trim());
  }

  function validateFindings(): ReportFinding[] {
    if (!Array.isArray(r.findings)) {
      throw new Error("Invalid report: findings must be an array");
    }
    return (r.findings as unknown[]).map((f, i) => {
      const finding = f as Record<string, unknown>;
      if (typeof finding.step !== "string" || typeof finding.insight !== "string") {
        throw new Error(`Invalid report: finding ${i} missing step or insight`);
      }
      return {
        step: finding.step.trim(),
        insight: finding.insight.trim(),
      };
    });
  }

  return {
    summary: r.summary.trim(),
    findings: validateFindings(),
    strengths: validateStringArray("strengths"),
    weaknesses: validateStringArray("weaknesses"),
    opportunities: validateStringArray("opportunities"),
    recommendations: validateStringArray("recommendations"),
  };
}

export async function generateReport(
  goal: string,
  steps: StepContext[]
): Promise<ResearchReport> {
  // Truncate findings to avoid token limits
  const truncatedSteps = steps.map((s) => ({
    ...s,
    finding: s.finding.slice(0, 500),
  }));

  const findingsText = truncatedSteps
    .map((s, i) => `[${i + 1}] ${s.stepTitle} (${s.tool})\n${s.finding}`)
    .join("\n\n");

  const response = await ai.chat([
    { role: "system", content: REPORT_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Research goal: ${goal}\n\nResearch findings:\n${findingsText}`,
    },
  ]);

  let parsed: unknown;

  try {
    const cleaned = response.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI returned non-JSON response: ${response.text.slice(0, 200)}`);
  }

  return validateReport(parsed);
}