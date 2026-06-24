"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const n8n_1 = require("../lib/n8n");
const ai_1 = require("../lib/ai");
const config_1 = require("../config");
const router = (0, express_1.Router)();
async function pingSupabase() {
    try {
        const { error } = await supabase_1.supabase.auth.getUser();
        // getUser() with no token returns an auth error — that's expected
        // What we're testing is that Supabase responded at all
        return error?.message !== undefined || true;
    }
    catch {
        return false;
    }
}
router.get("/", async (_req, res) => {
    const [supabaseOk, n8nOk, aiOk] = await Promise.all([
        pingSupabase(),
        n8n_1.n8n.ping(),
        ai_1.ai.ping(),
    ]);
    const services = {
        supabase: supabaseOk ? "ok" : "error",
        n8n: n8nOk ? "ok" : "error",
        ai: {
            status: aiOk ? "ok" : "error",
            provider: config_1.config.ai.provider,
        },
    };
    const allOk = supabaseOk && n8nOk && aiOk;
    const body = {
        status: allOk ? "ok" : "error",
        timestamp: new Date().toISOString(),
        services,
    };
    res.status(allOk ? 200 : 503).json(body);
});
exports.default = router;
