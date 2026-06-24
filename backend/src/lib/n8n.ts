import { config } from "../config";

async function ping(): Promise<boolean> {
  try {
    const response = await fetch(`${config.n8n.baseUrl}/healthz`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) return true;

    const fallback = await fetch(`${config.n8n.baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    return fallback.ok;
  } catch {
    return false;
  }
}

type WebhookPayload = {
  goal: string;
  [key: string]: unknown;
};

type WebhookResponse = {
  success: boolean;
  data: unknown;
};

async function triggerWebhook(
  webhookPath: string,
  payload: WebhookPayload
): Promise<WebhookResponse> {
  const url = `${config.n8n.baseUrl}/webhook/${webhookPath}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      if (response.status === 502 || response.status === 503) {
        console.log(`n8n not ready (attempt ${attempt}/3), retrying in 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`n8n webhook error ${response.status}: ${error}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (err) {
      if (attempt === 3) throw err;
      console.log(`n8n attempt ${attempt} failed, retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  throw new Error("n8n failed after 3 attempts");
}

export const n8n = {
  ping,
  triggerWebhook,
};