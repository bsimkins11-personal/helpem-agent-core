import { prisma } from "../src/lib/prisma.js";

const RULE_KEY = "classification_biases_v1";
const MAX_ENTRIES = 1000;

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function aggregateGlobalRules() {
  const instructions = await prisma.userInstruction.findMany({
    select: { data: true },
  });

  const totals = new Map();

  for (const record of instructions) {
    const data = record.data || {};
    const biases = data.biases || {};
    if (!biases || typeof biases !== "object") continue;

    for (const [rawKey, entry] of Object.entries(biases)) {
      const key = normalizeText(rawKey);
      if (!key) continue;
      if (!entry || typeof entry !== "object") continue;

      const direction = entry.direction;
      if (direction !== "todo" && direction !== "grocery") continue;

      const count = Number(entry.count || 0);
      if (!Number.isFinite(count) || count <= 0) continue;

      const existing = totals.get(key) || {
        todoCount: 0,
        groceryCount: 0,
        updatedAt: "1970-01-01T00:00:00.000Z",
      };

      if (direction === "todo") {
        existing.todoCount += count;
      } else {
        existing.groceryCount += count;
      }

      const entryTime = parseTimestamp(entry.updatedAt || entry.lastSeen);
      if (entryTime > existing.updatedAt) {
        existing.updatedAt = entryTime;
      }

      totals.set(key, existing);
    }
  }

  const sorted = Array.from(totals.entries())
    .map(([key, value]) => {
      const total = value.todoCount + value.groceryCount;
      const direction = value.todoCount >= value.groceryCount ? "todo" : "grocery";
      return [
        key,
        {
          direction,
          count: total,
          todoCount: value.todoCount,
          groceryCount: value.groceryCount,
          updatedAt: value.updatedAt,
        },
      ];
    })
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_ENTRIES);

  const biases = Object.fromEntries(sorted);
  const payload = {
    biases,
    generatedAt: new Date().toISOString(),
  };

  await prisma.globalRule.upsert({
    where: { key: RULE_KEY },
    update: { data: payload },
    create: { key: RULE_KEY, data: payload },
  });

  console.log(
    `✅ Global rules updated: ${Object.keys(biases).length} entries`
  );
}

aggregateGlobalRules()
  .catch((error) => {
    console.error("❌ Global rules aggregation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
