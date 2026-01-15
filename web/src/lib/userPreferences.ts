type Direction = "grocery" | "todo";

export type UserBiasEntry = {
  direction: Direction;
  count: number;
  updatedAt: string;
};

export type UserBiasMap = Record<string, UserBiasEntry>;

const STORAGE_KEY = "helpem-user-bias-v1";
const MAX_ENTRIES = 200;

export function loadUserBias(): UserBiasMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UserBiasMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function recordCorrection(text: string, direction: Direction) {
  if (typeof window === "undefined") return;
  const key = normalize(text);
  if (!key) return;

  const bias = loadUserBias();
  const existing = bias[key];
  bias[key] = {
    direction,
    count: (existing?.count || 0) + 1,
    updatedAt: new Date().toISOString(),
  };

  const keys = Object.keys(bias);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (bias[a].updatedAt > bias[b].updatedAt ? -1 : 1))
      .slice(MAX_ENTRIES)
      .forEach((k) => delete bias[k]);
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bias));
  } catch {
    // best-effort; fail silently
  }
}

export function getUserPreference(
  text: string,
  bias: UserBiasMap
): Direction | undefined {
  const key = normalize(text);
  if (!key) return undefined;
  return bias[key]?.direction;
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}
