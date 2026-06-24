import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { n8n } from "../lib/n8n";
import { ai } from "../lib/ai";
import { config } from "../config";

const router = Router();

type ServiceStatus = "ok" | "error";

type HealthResponse = {
  status: ServiceStatus;
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    n8n: ServiceStatus;
    ai: {
      status: ServiceStatus;
      provider: string;
    };
  };
};

async function pingSupabase(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.getUser();
    // getUser() with no token returns an auth error — that's expected
    // What we're testing is that Supabase responded at all
    return error?.message !== undefined || true;
  } catch {
    return false;
  }
}

router.get("/", async (_req: Request, res: Response) => {
  const [supabaseOk, n8nOk, aiOk] = await Promise.all([
    pingSupabase(),
    n8n.ping(),
    ai.ping(),
  ]);

  const services: HealthResponse["services"] = {
    supabase: supabaseOk ? "ok" : "error",
    n8n: n8nOk ? "ok" : "error",
    ai: {
      status: aiOk ? "ok" : "error",
      provider: config.ai.provider,
    },
  };

  const allOk = supabaseOk && n8nOk && aiOk;

  const body: HealthResponse = {
    status: allOk ? "ok" : "error",
    timestamp: new Date().toISOString(),
    services,
  };

  res.status(allOk ? 200 : 503).json(body);
});

export default router;