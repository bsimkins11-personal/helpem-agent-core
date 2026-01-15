import { NextResponse } from "next/server";
import { classify } from "@/lib/classifier";
import { verifySessionToken } from "@/lib/sessionAuth";
import { query } from "@/lib/db";
import type { UserBiasMap } from "@/lib/userPreferences";

const MAX_BIAS_ENTRIES = 200;
const GLOBAL_RULE_KEY = "classification_biases_v1";

export async function POST(req: Request) {
  const { input } = await req.json();
  const text = String(input || "");

  let bias: UserBiasMap | undefined;
  let globalBias: UserBiasMap | undefined;
  let instructionData: Record<string, unknown> | undefined;
  let userId: string | undefined;
  const authHeader = req.headers.get("authorization");

  try {
    const result = await query(
      "SELECT data FROM global_rules WHERE key = $1",
      [GLOBAL_RULE_KEY]
    );
    const data = result.rows[0]?.data as {
      biases?: Record<
        string,
        { direction?: "todo" | "grocery"; count?: number; updatedAt?: string; lastSeen?: string }
      >;
    } | undefined;
    if (data?.biases && typeof data.biases === "object") {
      globalBias = normalizeBiasMap(data.biases);
    }
  } catch (error) {
    console.error("Failed to load global rules:", error);
  }

  if (authHeader) {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }
    userId = session.session.userId;

    try {
      const result = await query(
        "SELECT data FROM user_instructions WHERE user_id = $1",
        [userId]
      );
      const data = result.rows[0]?.data as {
        biases?: Record<
          string,
          { direction?: "todo" | "grocery"; count?: number; updatedAt?: string; lastSeen?: string }
        >;
      } | undefined;
      instructionData = data ?? undefined;
      if (data?.biases && typeof data.biases === "object") {
        bias = normalizeBiasMap(data.biases);
      }
    } catch (error) {
      console.error("Failed to load user instructions:", error);
    }
  }

  const combinedBias = mergeBiases(globalBias, bias);
  const result = classify(text, combinedBias ? { bias: combinedBias } : undefined);
  if (userId && text.trim() && (result.type === "todo" || result.type === "grocery")) {
    try {
      const normalized = normalizeText(text);
      if (normalized) {
        const now = new Date().toISOString();
        const nextBiases = { ...(bias || {}) };
        const prior = nextBiases[normalized];
        nextBiases[normalized] = {
          direction: result.type,
          count: (prior?.count || 0) + 1,
          updatedAt: now,
        };

        pruneBiases(nextBiases);

        const nextData = { ...(instructionData || {}), biases: nextBiases };
        await query(
          `INSERT INTO user_instructions (user_id, data)
           VALUES ($1, $2)
           ON CONFLICT (user_id)
           DO UPDATE SET data = $2, updated_at = NOW()`,
          [userId, nextData]
        );
      }
    } catch (error) {
      console.error("Failed to update user instructions:", error);
    }
  }
  return NextResponse.json(result);
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeBiasMap(
  entries: Record<string, { direction?: "todo" | "grocery"; count?: number; updatedAt?: string; lastSeen?: string }>
): UserBiasMap {
  const normalized: UserBiasMap = {};
  for (const [key, entry] of Object.entries(entries)) {
    if (!entry || (entry.direction !== "todo" && entry.direction !== "grocery")) continue;
    normalized[key] = {
      direction: entry.direction,
      count: typeof entry.count === "number" ? entry.count : 0,
      updatedAt: entry.updatedAt || entry.lastSeen || new Date().toISOString(),
    };
  }
  return normalized;
}

function mergeBiases(globalBias?: UserBiasMap, userBias?: UserBiasMap) {
  if (!globalBias && !userBias) return undefined;
  return { ...(globalBias || {}), ...(userBias || {}) };
}

function pruneBiases(biases: UserBiasMap) {
  const keys = Object.keys(biases);
  if (keys.length <= MAX_BIAS_ENTRIES) return;

  keys
    .sort((a, b) => {
      const aTime = biases[a].updatedAt || "";
      const bTime = biases[b].updatedAt || "";
      return aTime > bTime ? -1 : 1;
    })
    .slice(MAX_BIAS_ENTRIES)
    .forEach((key) => delete biases[key]);
}
