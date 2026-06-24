import { config } from "../../config";

type ServiceStatus = "ok" | "error";
type HealthData = {
  status: ServiceStatus;
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    n8n: ServiceStatus;
    ai: { status: ServiceStatus; provider: string };
  };
};

async function getHealth(): Promise<HealthData | null> {
  try {
    const res = await fetch(`${config.apiUrl}/api/health`, { cache: "no-store" });
    return res.json();
  } catch { return null; }
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      width: 7, height: 7,
      borderRadius: "50%",
      background: ok ? "var(--green)" : "var(--red)",
      flexShrink: 0,
    }} />
  );
}

export default async function HealthPage() {
  const data = await getHealth();

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      background: "var(--bg-subtle)",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: "1rem",
        }}>
          System Status
        </p>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          {!data ? (
            <div style={{ padding: "1.25rem 1.5rem", color: "var(--red)", fontSize: 13 }}>
              Cannot reach backend. Is it running?
            </div>
          ) : (
            <>
              {[
                { label: "Supabase", status: data.services.supabase, detail: null },
                { label: "n8n", status: data.services.n8n, detail: null },
                { label: "AI", status: data.services.ai.status, detail: data.services.ai.provider },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  padding: "1rem 1.5rem",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusDot ok={s.status === "ok"} />
                    <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{s.label}</span>
                    {s.detail && (
                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                        background: "var(--surface-raised)",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}>
                        {s.detail}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: s.status === "ok" ? "var(--green)" : "var(--red)",
                    fontWeight: 500,
                  }}>
                    {s.status}
                  </span>
                </div>
              ))}
              <div style={{
                padding: "0.75rem 1.5rem",
                borderTop: "1px solid var(--border-subtle)",
                background: "var(--bg-subtle)",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: "var(--text-tertiary)",
              }}>
                Last checked: {new Date(data.timestamp).toLocaleTimeString()}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}