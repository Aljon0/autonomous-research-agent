import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { n8n } from "../lib/n8n";
import { generatePlan } from "../lib/planner";

const router = Router();

type ResearchRequestBody = {
  goal: string;
};

type ResearchExecution = {
  id: string;
  goal: string;
  status: "pending" | "planned" | "completed" | "failed";
  status_detail: string | null;
  plan_id: string | null;
  result: unknown;
  created_at: string;
};

type ResearchPlanRow = {
  id: string;
  execution_id: string;
  goal: string;
  steps: unknown;
  created_at: string;
};

router.post("/", async (req: Request, res: Response) => {
  const { goal } = req.body as ResearchRequestBody;

  if (!goal || typeof goal !== "string" || goal.trim().length === 0) {
    res.status(400).json({ error: "goal is required" });
    return;
  }

  // 1. Insert execution as pending
  const { data: execution, error: insertError } = await supabase
    .from("research_executions")
    .insert({ goal: goal.trim(), status: "pending" })
    .select()
    .single<ResearchExecution>();

  if (insertError || !execution) {
    console.error("Failed to insert execution:", insertError);
    res.status(500).json({ error: "Failed to create research execution" });
    return;
  }

  try {
    // 2. Generate plan via AI
    const plan = await generatePlan(goal.trim());

    // 3. Save plan to Supabase
    const { data: planRow, error: planError } = await supabase
      .from("research_plans")
      .insert({
        execution_id: execution.id,
        goal: plan.goal,
        steps: plan.steps,
      })
      .select()
      .single<ResearchPlanRow>();

    if (planError || !planRow) {
      console.error("Failed to insert plan:", planError);
      throw new Error("Failed to save research plan");
    }

    // 4. Trigger n8n with plan context
    await n8n.triggerWebhook("research", {
      goal: goal.trim(),
      executionId: execution.id,
      planId: planRow.id,
      stepCount: plan.steps.length,
    });

    // 5. Update execution as planned
    const { data: updated, error: updateError } = await supabase
      .from("research_executions")
      .update({
        status: "planned",
        plan_id: planRow.id,
        status_detail: `Plan generated: ${plan.steps.length} steps`,
      })
      .eq("id", execution.id)
      .select()
      .single<ResearchExecution>();

    if (updateError || !updated) {
      console.error("Failed to update execution:", updateError);
      throw new Error("Failed to update execution status");
    }

    res.status(200).json({ execution: updated, plan: planRow });
  } catch (err) {
    console.error("Research planning failed:", err);

    await supabase
      .from("research_executions")
      .update({
        status: "failed",
        status_detail: err instanceof Error ? err.message : "Unknown error",
      })
      .eq("id", execution.id);

    res.status(500).json({
      error: "Research planning failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;