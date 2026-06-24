"use client";

import { useState, useRef } from "react";

type PlanStep = {
  order: number;
  title: string;
  description: string;
  tool: "search" | "analyze" | "summarize" | "compare";
};

type ResearchPlanRow = {
  id: string;
  execution_id: string;
  goal: string;
  steps: PlanStep[];
  created_at: string;
};

type ResearchExecution = {
  id: string;
  goal: string;
  status: "pending" | "planned" | "executing" | "completed" | "failed";
  status_detail: string | null;
  plan_id: string | null;
  report_id: string | null;
  result: unknown;
  created_at: string;
};

type StepResultData = {
  finding: string;
  sources?: { title: string; url: string; snippet: string }[];
  recalled?: boolean;
  similarity?: number;
  error?: string;
};

type StepResult = {
  id: string;
  step_order: number;
  step_title: string;
  tool: string;
  result: StepResultData | null;
  status: "pending" | "running" | "completed" | "failed";
  recalled?: boolean;
};

type ReportFinding = { step: string; insight: string };

type Report = {
  id: string;
  execution_id: string;
  goal: string;
  summary: string;
  findings: ReportFinding[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommendations: string[];
  created_at: string;
};

type PlanResponse = { execution: ResearchExecution; plan: ResearchPlanRow };
type ExecuteResponse = {
  execution: ResearchExecution;
  results: StepResult[];
  completedSteps: number;
  totalSteps: number;
  recalledSteps: number;
};

const TOOL_META: Record<string, { color: string; bg: string; border: string }> = {
  search:    { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  analyze:   { color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE" },
  summarize: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  compare:   { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
};

const STATUS_META: Record<string, { color: string; bg: string; border: string }> = {
  pending:   { color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
  planned:   { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  executing: { color: "#7C3AED", bg: "#EDE9FE", border: "#DDD6FE" },
  completed: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  failed:    { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
};

async function runResearch(goal: string): Promise<PlanResponse> {
  const res = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
  return res.json();
}

async function executeResearch(id: string): Promise<ExecuteResponse> {
  const res = await fetch(`/api/research/${id}/execute`, { method: "POST" });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
  return res.json();
}

async function generateReport(id: string): Promise<Report> {
  const res = await fetch(`/api/research/${id}/report`, { method: "POST" });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
  return res.json();
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      color,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 6,
      padding: "2px 8px",
      whiteSpace: "nowrap" as const,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.03em",
    }}>
      {label}
    </span>
  );
}

function ReportList({ items, color, bg, border }: { items: string[]; color: string; bg: string; border: string }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 10,
      padding: "1rem 1.125rem",
    }}>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" as const, gap: 8 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: color, flexShrink: 0, marginTop: 7,
            }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-tertiary)",
      margin: "0 0 0.875rem",
    }}>
      {children}
    </p>
  );
}

export default function ResearchPage() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [planResult, setPlanResult] = useState<PlanResponse | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteResponse | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const busy = loading || executing || reporting;

  async function handleRun() {
    if (!goal.trim() || busy) return;
    setLoading(true); setError(null); setPlanResult(null);
    setExecuteResult(null); setReport(null);
    try { setPlanResult(await runResearch(goal.trim())); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function handleExecute() {
    if (!planResult || busy) return;
    setExecuting(true); setError(null); setExecuteResult(null); setReport(null);
    try { setExecuteResult(await executeResearch(planResult.execution.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setExecuting(false); }
  }

  async function handleReport() {
    if (!executeResult || busy) return;
    setReporting(true); setError(null);
    try {
      const data = await generateReport(executeResult.execution.id);
      setReport(data);
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setReporting(false); }
  }

  const activeExecution = executeResult?.execution ?? planResult?.execution;
  const steps = planResult?.plan.steps ?? [];
  const results = executeResult?.results ?? [];
  const getResult = (order: number) => results.find(r => r.step_order === order);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-subtle)" }}>

      {/* Top nav */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 2rem",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: "var(--accent)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontSize: 14 }}>⬡</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            Research Agent
          </span>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: "var(--text-tertiary)",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "3px 10px",
        }}>
          autonomous · ai-powered
        </span>
      </header>

      <main style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "2rem",
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        gap: "1.5rem",
        alignItems: "start",
      }}>

        {/* LEFT — input panel */}
        <div style={{
          position: "sticky",
          top: 72,
          display: "flex",
          flexDirection: "column" as const,
          gap: "1rem",
        }}>

          {/* Input card */}
          <div style={{
            background: "var(--surface)",
            border: `1.5px solid ${focused ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: focused
              ? "0 0 0 3px var(--accent-dim)"
              : "0 1px 3px rgba(0,0,0,0.06)",
            transition: "all 0.15s ease",
          }}>
            <div style={{ padding: "1.25rem 1.25rem 0" }}>
              <p style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: "0 0 4px",
              }}>
                What do you want to research?
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 1rem" }}>
                Describe your goal and the agent will plan, execute, and report.
              </p>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRun(); }
                }}
                disabled={busy}
                placeholder="e.g. Find the top 5 competitors of Notion and summarize their positioning"
                rows={4}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.7,
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{
              padding: "0.75rem 1.25rem",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--bg-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                ↵ to run
              </span>
              <button
                onClick={handleRun}
                disabled={busy || !goal.trim()}
                style={{
                  background: goal.trim() && !busy ? "var(--accent)" : "var(--surface-raised)",
                  color: goal.trim() && !busy ? "#fff" : "var(--text-tertiary)",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 18px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: goal.trim() && !busy ? "pointer" : "not-allowed",
                  transition: "all 0.15s ease",
                }}
              >
                {loading ? "Planning..." : "Run Research"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "var(--red-light)",
              border: "1px solid #FECACA",
              borderRadius: 10,
              padding: "0.875rem 1rem",
              fontSize: 13,
              color: "var(--red)",
            }}>
              {error}
            </div>
          )}

          {/* Status card */}
          {activeExecution && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1rem 1.125rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                  Execution
                </span>
                {(() => {
                  const s = STATUS_META[activeExecution.status];
                  return <Badge label={activeExecution.status} color={s.color} bg={s.bg} border={s.border} />;
                })()}
              </div>
              {activeExecution.status_detail && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px" }}>
                  {activeExecution.status_detail}
                </p>
              )}
              {executeResult?.recalledSteps ? (
                <p style={{ fontSize: 12, color: "var(--amber)", margin: "0 0 6px" }}>
                  ↩ {executeResult.recalledSteps} step{executeResult.recalledSteps > 1 ? "s" : ""} recalled from memory
                </p>
              ) : null}
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: "var(--text-tertiary)",
                margin: 0,
              }}>
                {activeExecution.id.slice(0, 18)}...
              </p>
            </div>
          )}

          {/* Execute button */}
          {!executeResult && planResult?.execution.status === "planned" && (
            <button
              onClick={handleExecute}
              disabled={executing}
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 500,
                cursor: executing ? "not-allowed" : "pointer",
                opacity: executing ? 0.7 : 1,
                width: "100%",
                boxShadow: "0 1px 3px rgba(124,58,237,0.3)",
              }}
            >
              {executing ? "Executing..." : "Execute Plan →"}
            </button>
          )}

          {/* Report button */}
          {executeResult?.execution.status === "completed" && !report && (
            <button
              onClick={handleReport}
              disabled={reporting}
              style={{
                background: "var(--surface)",
                color: "var(--accent)",
                border: "1.5px solid var(--accent)",
                borderRadius: 10,
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 500,
                cursor: reporting ? "not-allowed" : "pointer",
                opacity: reporting ? 0.7 : 1,
                width: "100%",
              }}
            >
              {reporting ? "Generating Report..." : "Generate Report →"}
            </button>
          )}

          {/* Jump to report */}
          {report && (
            <button
              onClick={() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{
                background: "var(--green-light)",
                color: "var(--green)",
                border: "1px solid #A7F3D0",
                borderRadius: 10,
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
              }}
            >
              ↓ View Report
            </button>
          )}
        </div>

        {/* RIGHT — results */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "1.25rem" }}>

          {/* Empty state */}
          {!planResult && !loading && (
            <div style={{
              background: "var(--surface)",
              border: "1.5px dashed var(--border)",
              borderRadius: 14,
              padding: "4rem 2rem",
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 280,
            }}>
              <div style={{
                width: 44, height: 44,
                background: "var(--accent-light)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 22 }}>⬡</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
                Ready to research
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                Enter a goal on the left to get started
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="shimmer" style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "2rem",
              minHeight: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Generating research plan...</p>
            </div>
          )}

          {/* Plan */}
          {steps.length > 0 && (
            <div className="fade-up" style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-subtle)",
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    Research Plan
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginLeft: 10,
                  }}>
                    {steps.length} steps
                    {executeResult ? ` · ${executeResult.completedSteps} completed` : ""}
                    {executeResult?.recalledSteps ? ` · ${executeResult.recalledSteps} from cache` : ""}
                  </span>
                </div>
              </div>

              {steps.map((step, i) => {
                const sr = getResult(step.order);
                const isRecalled = sr?.result?.recalled === true;
                const tool = TOOL_META[step.tool] ?? TOOL_META.search;
                const statusM = sr ? STATUS_META[sr.status] : null;

                return (
                  <div key={step.order} style={{
                    padding: "1rem 1.25rem",
                    borderBottom: i < steps.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        width: 24,
                        flexShrink: 0,
                        paddingTop: 2,
                      }}>
                        {String(step.order).padStart(2, "0")}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                          flexWrap: "wrap" as const,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {step.title}
                          </span>
                          <Badge label={step.tool} color={tool.color} bg={tool.bg} border={tool.border} />
                          {sr && !isRecalled && statusM && (
                            <Badge label={sr.status} color={statusM.color} bg={statusM.bg} border={statusM.border} />
                          )}
                          {isRecalled && (
                            <Badge
                              label={`↩ memory ${sr?.result?.similarity ? Math.round(sr.result.similarity * 100) + "%" : ""}`}
                              color="var(--amber)"
                              bg="var(--amber-light)"
                              border="#FDE68A"
                            />
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                          {step.description}
                        </p>

                        {sr?.result?.finding && sr.status === "completed" && (
                          <div style={{
                            marginTop: 10,
                            padding: "0.875rem 1rem",
                            background: isRecalled ? "var(--amber-light)" : "var(--bg-subtle)",
                            border: `1px solid ${isRecalled ? "#FDE68A" : "var(--border)"}`,
                            borderRadius: 10,
                          }}>
                            <p style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                              lineHeight: 1.75,
                              margin: 0,
                            }}>
                              {sr.result.finding}
                            </p>
                            {sr.result.sources && sr.result.sources.length > 0 && (
                              <div style={{
                                marginTop: 10,
                                paddingTop: 10,
                                borderTop: "1px solid var(--border)",
                                display: "flex",
                                flexDirection: "column" as const,
                                gap: 4,
                              }}>
                                {sr.result.sources.slice(0, 3).map((s, j) => (
                                  <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                                    fontSize: 12,
                                    color: "var(--accent)",
                                    textDecoration: "none",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap" as const,
                                    display: "block",
                                  }}>
                                    ↗ {s.title}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Report */}
          {report && (
            <div ref={reportRef} className="fade-up" style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              {/* Report header */}
              <div style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-subtle)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}>
                    Research Report
                  </span>
                </div>
                <h2 style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 4px",
                  lineHeight: 1.4,
                }}>
                  {report.goal}
                </h2>
                <p style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  margin: 0,
                }}>
                  {new Date(report.created_at).toLocaleString()}
                </p>
              </div>

              {/* Summary */}
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                <SectionLabel>Executive Summary</SectionLabel>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0 }}>
                  {report.summary}
                </p>
              </div>

              {/* Findings */}
              {report.findings.length > 0 && (
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                  <SectionLabel>Key Findings</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
                    {report.findings.map((f, i) => (
                      <div key={i} style={{
                        display: "flex",
                        gap: 12,
                        paddingBottom: i < report.findings.length - 1 ? 14 : 0,
                        borderBottom: i < report.findings.length - 1 ? "1px solid var(--border-subtle)" : "none",
                      }}>
                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          flexShrink: 0,
                          width: 22,
                          paddingTop: 2,
                        }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--accent)",
                            margin: "0 0 4px",
                          }}>
                            {f.step}
                          </p>
                          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                            {f.insight}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis grid */}
              <div style={{ padding: "1.25rem 1.5rem" }}>
                <SectionLabel>Analysis</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { key: "strengths",       label: "Strengths",       color: "var(--green)", bg: "var(--green-light)",  border: "#A7F3D0" },
                    { key: "weaknesses",      label: "Weaknesses",      color: "var(--red)",   bg: "var(--red-light)",    border: "#FECACA" },
                    { key: "opportunities",   label: "Opportunities",   color: "var(--blue)",  bg: "var(--blue-light)",   border: "#BFDBFE" },
                    { key: "recommendations", label: "Recommendations", color: "var(--accent)", bg: "var(--accent-light)", border: "#DDD6FE" },
                  ].map(({ key, label, color, bg, border }) => (
                    <div key={key}>
                      <p style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        color,
                        margin: "0 0 8px",
                      }}>
                        {label}
                      </p>
                      <ReportList
                        items={report[key as keyof typeof report] as string[]}
                        color={color}
                        bg={bg}
                        border={border}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}