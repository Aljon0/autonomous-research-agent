import { supabase } from "./supabase";

export type MemoryEntry = {
  id: string;
  content: string;
  goal: string;
  step_title: string;
  tool: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type RecallResult = {
  found: boolean;
  entry?: MemoryEntry;
  similarity?: number;
};

export async function recallMemory(
  goal: string,
  stepTitle: string
): Promise<RecallResult> {
  try {
    const { data, error } = await supabase.rpc("recall_memory", {
      query_goal: goal,
      query_step: stepTitle,
      similarity_threshold: 0.6,  // raised from 0.15
    });

    if (error) {
      console.error("Memory recall error:", error);
      return { found: false };
    }

    if (!data || data.length === 0) {
      return { found: false };
    }

    const entry = data[0] as MemoryEntry & { similarity: number };

    return {
      found: true,
      entry,
      similarity: entry.similarity,
    };
  } catch (err) {
    // Memory recall failure should never block execution
    console.error("Memory recall exception:", err);
    return { found: false };
  }
}

export async function storeMemory(
    goal: string,
    stepTitle: string,
    tool: string,
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    // Never store empty findings
    if (!content || content.trim().length === 0) {
      console.warn(`Skipping memory store for "${stepTitle}" — empty content`);
      return;
    }
  
    try {
      const { error } = await supabase.from("research_memory").insert({
        goal,
        step_title: stepTitle,
        tool,
        content,
        metadata,
      });
  
      if (error) {
        console.error("Memory store error:", error);
      }
    } catch (err) {
      console.error("Memory store exception:", err);
    }
  }