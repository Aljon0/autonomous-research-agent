import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { executeSteps } from "../lib/executor";

const router = Router({ mergeParams: true });

type ResearchExecution = {
  id: string;
  goal: string;
  status: "pending" | "planned" | "executing" | "completed" | "failed";
  status_detail: string | null;
  plan_id: string | null;
  result: unknown;
  created_at: string;
};

type ResearchPlanRow = {
  id: string;
  execution_id: string;
  goal: string;
  steps: {
    order: number;
    title: string;
    description: string;
    tool: "search" | "analyze" | "summarize" | "compare";
  }[];
  created_at: string;
};

router.post("/", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "execution id is required" });
    return;
  }

  // 1. Fetch execution
  const { data: execution, error: execError } = await supabase
    .from("research_executions")
    .select()
    .eq("id", id)
    .single<ResearchExecution>();

  if (execError || !execution) {
    res.status(404).json({ error: "Execution not found" });
    return;
  }

  if (execution.status !== "planned") {
    res.status(400).json({
      error: `Execution cannot be run. Current status: ${execution.status}`,
    });
    return;
  }

  if (!execution.plan_id) {
    res.status(400).json({ error: "Execution has no associated plan" });
    return;
  }

  // 2. Fetch plan
  const { data: plan, error: planError } = await supabase
    .from("research_plans")
    .select()
    .eq("id", execution.plan_id)
    .single<ResearchPlanRow>();

  if (planError || !plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  // 3. Mark execution as executing
  await supabase
    .from("research_executions")
    .update({
      status: "executing",
      status_detail: `Executing ${plan.steps.length} steps`,
    })
    .eq("id", id);

  // 4. Execute steps
  const executionResult = await executeSteps(
    execution.id,
    plan.id,
    execution.goal,
    plan.steps
  );

  // 5. Mark execution as completed or failed
  const finalStatus = executionResult.failed ? "failed" : "completed";
  const finalDetail = executionResult.failed
    ? `Failed at step ${executionResult.completedSteps + 1} of ${executionResult.totalSteps}`
    : `Completed ${executionResult.completedSteps} of ${executionResult.totalSteps} steps`;

  const { data: updated, error: updateError } = await supabase
    .from("research_executions")
    .update({
      status: finalStatus,
      status_detail: finalDetail,
    })
    .eq("id", id)
    .select()
    .single<ResearchExecution>();

  if (updateError || !updated) {
    console.error("Failed to update final execution status:", updateError);
    res.status(500).json({ error: "Failed to finalize execution" });
    return;
  }

  res.status(200).json({
    execution: updated,
    results: executionResult.results,
    completedSteps: executionResult.completedSteps,
    totalSteps: executionResult.totalSteps,
  });
});

export default router;