import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionAuth";
import { query } from "@/lib/db";

const MAX_BIAS_ENTRIES = 200;

type Direction = "todo" | "grocery";

export async function POST(req: Request) {
  const session = await verifySessionToken(req);
  if (!session.success) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { text, from, to, timestamp } = await req.json();
  if (typeof text !== "string") {
    return NextResponse.json({ error: "Missing or invalid text" }, { status: 400 });
  }
  if (to !== "todo" && to !== "grocery") {
    return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
  }

  const normalized = normalizeText(text);
  if (!normalized) {
    return NextResponse.json({ error: "Empty text" }, { status: 400 });
  }

  const seenAt = parseTimestamp(timestamp);
  const userId = session.session.userId;

  try {
    const result = await query(
      "SELECT data FROM user_instructions WHERE user_id = $1",
      [userId]
    );
    const data = (result.rows[0]?.data as Record<string, unknown>) ?? {};
    const rawBiases =
      data.biases && typeof data.biases === "object" ? (data.biases as Record<string, BiasEntry>) : {};
    const biases = rawBiases;
    const prior = biases[normalized];

    biases[normalized] = {
      direction: to,
      count: (prior?.count || 0) + 1,
      updatedAt: seenAt,
      from: from === "todo" || from === "grocery" ? from : prior?.from,
    };

    pruneBiases(biases);

    const nextData = { ...data, biases };
    await query(
      `INSERT INTO user_instructions (user_id, data)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET data = $2, updated_at = NOW()`,
      [userId, nextData]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR /api/feedback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type BiasEntry = {
  direction?: Direction;
  count?: number;
  updatedAt?: string;
  from?: Direction;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function parseTimestamp(ts?: string) {
  const d = ts ? new Date(ts) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function pruneBiases(biases: Record<string, BiasEntry>) {
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
