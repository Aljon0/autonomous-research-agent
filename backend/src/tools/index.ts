import type { PlanStep } from "../lib/planner";
import type { ToolResult } from "./search";
import { runSearchTool } from "./search";
import { runAnalyzeTool } from "./analyze";
import { runSummarizeTool } from "./summarize";
import { runCompareTool } from "./compare";

export type { ToolResult };

export async function runTool(
  step: PlanStep,
  goal: string,
  previousFindings: string[]
): Promise<ToolResult> {
  switch (step.tool) {
    case "search":
      return runSearchTool(step.title, step.description, goal);

    case "analyze":
      return runAnalyzeTool(
        step.title,
        step.description,
        goal,
        previousFindings
      );

    case "summarize":
      return runSummarizeTool(
        step.title,
        step.description,
        goal,
        previousFindings
      );

    case "compare":
      return runCompareTool(
        step.title,
        step.description,
        goal,
        previousFindings
      );

    default: {
      const exhaustive: never = step.tool;
      throw new Error(`Unknown tool: ${exhaustive}`);
    }
  }
}