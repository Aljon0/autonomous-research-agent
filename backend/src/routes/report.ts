import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { generateReport } from "../lib/reporter";

const router = Router({ mergeParams: true });

type StepResult = {
  id: string;
  step_order: number;
  step_title: string;
  tool: string;
  status: string;
  result: {
    finding?: string;
    sources?: unknown[];
    recalled?: boolean;
  } | null;
};

type ResearchExecution = {
  id: string;
  goal: string;
  status: string;
  report_id: string | null;
};

type ReportRow = {
  id: string;
  execution_id: string;
  goal: string;
  summary: string;
  findings: unknown[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommendations: string[];
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

  if (execution.status !== "completed") {
    res.status(400).json({
      error: `Report can only be generated for completed executions. Current status: ${execution.status}`,
    });
    return;
  }

  // 2. Return existing report if already generated
  if (execution.report_id) {
    const { data: existing } = await supabase
      .from("research_reports")
      .select()
      .eq("id", execution.report_id)
      .single<ReportRow>();

    if (existing) {
      res.status(200).json(existing);
      return;
    }
  }

  // 3. Fetch completed step results
  const { data: results, error: resultsError } = await supabase
    .from("research_results")
    .select()
    .eq("execution_id", id)
    .eq("status", "completed")
    .order("step_order", { ascending: true })
    .returns<StepResult[]>();

  if (resultsError || !results || results.length === 0) {
    res.status(400).json({ error: "No completed step results found for this execution" });
    return;
  }

  // 4. Build step context from results
  const steps = results
    .filter((r) => r.result?.finding && r.result.finding.trim().length > 0)
    .map((r) => ({
      stepTitle: r.step_title,
      tool: r.tool,
      finding: r.result!.finding!,
    }));

  if (steps.length === 0) {
    res.status(400).json({ error: "No findings available to generate report" });
    return;
  }

  // 5. Generate report
  let report;
  try {
    report = await generateReport(execution.goal, steps);
  } catch (err) {
    console.error("Report generation failed:", err);
    res.status(500).json({
      error: "Failed to generate report",
      details: err instanceof Error ? err.message : "Unknown error",
    });
    return;
  }

  // 6. Save report
  const { data: reportRow, error: reportError } = await supabase
    .from("research_reports")
    .insert({
      execution_id: id,
      goal: execution.goal,
      summary: report.summary,
      findings: report.findings,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      opportunities: report.opportunities,
      recommendations: report.recommendations,
    })
    .select()
    .single<ReportRow>();

  if (reportError || !reportRow) {
    console.error("Failed to save report:", reportError);
    res.status(500).json({ error: "Failed to save report" });
    return;
  }

  // 7. Link report to execution
  await supabase
    .from("research_executions")
    .update({ report_id: reportRow.id })
    .eq("id", id);

  res.status(200).json(reportRow);
});

export default router;