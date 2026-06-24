import { supabase } from "./supabase";
import { runTool } from "../tools/index";
import { recallMemory, storeMemory } from "./memory";
import type { PlanStep } from "./planner";

export type StepResult = {
  id: string;
  execution_id: string;
  plan_id: string;
  step_order: number;
  step_title: string;
  tool: string;
  result: unknown;
  status: "pending" | "running" | "completed" | "failed";
  recalled?: boolean;
  created_at: string;
};

export type ExecutionResult = {
  results: StepResult[];
  failed: boolean;
  completedSteps: number;
  totalSteps: number;
  recalledSteps: number;
};

async function insertStepResult(
  executionId: string,
  planId: string,
  step: PlanStep
): Promise<StepResult> {
  const { data, error } = await supabase
    .from("research_results")
    .insert({
      execution_id: executionId,
      plan_id: planId,
      step_order: step.order,
      step_title: step.title,
      tool: step.tool,
      status: "pending",
    })
    .select()
    .single<StepResult>();

  if (error || !data) {
    throw new Error(`Failed to insert step ${step.order}: ${error?.message}`);
  }

  return data;
}

async function updateStepResult(
  id: string,
  status: StepResult["status"],
  result?: unknown
): Promise<void> {
  const { error } = await supabase
    .from("research_results")
    .update({ status, result: result ?? null })
    .eq("id", id);

  if (error) {
    console.error(`Failed to update step result ${id}:`, error);
  }
}

export async function executeSteps(
  executionId: string,
  planId: string,
  goal: string,
  steps: PlanStep[]
): Promise<ExecutionResult> {
  const results: StepResult[] = [];
  const previousFindings: string[] = [];
  let failed = false;
  let recalledSteps = 0;

  for (const step of steps) {
    // 1. Insert step as pending
    let stepRow: StepResult;

    try {
      stepRow = await insertStepResult(executionId, planId, step);
    } catch (err) {
      console.error(`Failed to insert step ${step.order}:`, err);
      failed = true;
      break;
    }

    // 2. Check memory for existing finding
    const recall = await recallMemory(goal, step.title);

    if (recall.found && recall.entry) {
      console.log(
        `Memory hit for step ${step.order} "${step.title}" (similarity: ${recall.similarity?.toFixed(2)})`
      );

      const recalledResult = {
        finding: recall.entry.content,
        sources: (recall.entry.metadata.sources as unknown[]) ?? [],
        recalled: true,
        similarity: recall.similarity,
      };

      await updateStepResult(stepRow.id, "completed", recalledResult);

      if (recall.entry.content) {
        previousFindings.push(recall.entry.content);
      }

      results.push({
        ...stepRow,
        status: "completed",
        result: recalledResult,
        recalled: true,
      });

      recalledSteps++;
      continue;
    }

    // 3. Mark step as running
    await updateStepResult(stepRow.id, "running");

    // 4. Run the tool
    try {
      const toolResult = await runTool(step, goal, previousFindings);

      // 5. Store finding in memory
      await storeMemory(
        goal,
        step.title,
        step.tool,
        toolResult.finding,
        {
          sources: toolResult.sources ?? [],
          executionId,
          planId,
        }
      );

      // 6. Mark step as completed
      await updateStepResult(stepRow.id, "completed", {
        ...toolResult,
        recalled: false,
      });

      if (toolResult.finding) {
        previousFindings.push(toolResult.finding);
      }

      results.push({
        ...stepRow,
        status: "completed",
        result: { ...toolResult, recalled: false },
        recalled: false,
      });
    } catch (err) {
      console.error(`Step ${step.order} failed:`, err);

      await updateStepResult(stepRow.id, "failed", {
        error: err instanceof Error ? err.message : "Unknown error",
      });

      results.push({ ...stepRow, status: "failed" });
      failed = true;
      break;
    }
  }

  return {
    results,
    failed,
    completedSteps: results.filter((r) => r.status === "completed").length,
    totalSteps: steps.length,
    recalledSteps,
  };
}