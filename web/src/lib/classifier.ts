import { UserBiasMap, getUserPreference } from "./userPreferences";

export type ClassificationResult = {
  type: "todo" | "grocery";
  title?: string;
  items?: string[];
  confidence: number;
  reminderTime?: string;
};

const EXPLICIT_GROCERY_PHRASES = [
  "grocery",
  "groceries",
  "grocery list",
  "shopping list",
  "add to groceries",
  "add to grocery list",
  "on the grocery list",
  "on my grocery list",
  "add to shopping list",
];

const GROCERY_VOCABULARY = [
  "milk",
  "eggs",
  "bread",
  "butter",
  "cheese",
  "yogurt",
  "bananas",
  "apples",
  "berries",
  "avocado",
  "tomatoes",
  "lettuce",
  "spinach",
  "onions",
  "garlic",
  "potatoes",
  "rice",
  "pasta",
  "beans",
  "chicken",
  "beef",
  "fish",
  "toilet paper",
  "paper towels",
  "detergent",
  "dish soap",
  "snacks",
  "coffee",
  "tea",
  "juice",
  "water",
];

const ACTION_VERBS = [
  "buy",
  "pick up",
  "pickup",
  "pick-up",
  "shop",
  "shopping",
  "bring",
  "grab",
  "get",
  "call",
  "email",
  "text",
  "schedule",
  "plan",
  "book",
  "arrange",
  "set up",
  "remember",
  "remind",
  "finish",
  "complete",
  "send",
];

const ADD_PATTERNS = [
  /^(add|put)\s+/,
  /^we\s*(?:'|a)?re out of\s+/,
  /^we are out of\s+/,
];

const TIME_WORDS = [
  "tonight",
  "tomorrow",
  "today",
  "morning",
  "afternoon",
  "evening",
  "before",
  "after",
  "later",
  "next week",
  "next month",
];

type ClassifyOptions = {
  bias?: UserBiasMap;
};

export function classify(input: string, options?: ClassifyOptions): ClassificationResult {
  const raw = input.trim();
  const text = raw.toLowerCase();

  if (!raw) {
    return { type: "todo", title: "", confidence: 0.5 };
  }

  const { hasTime, reminderTime } = detectTime(text);
  if (hasTime) {
    return {
      type: "todo",
      title: raw,
      confidence: 0.98,
      reminderTime,
    };
  }

  if (isGenericGroceryAdd(text)) {
    return {
      type: "todo",
      title: raw,
      confidence: 0.85,
      reminderTime,
    };
  }

  if (containsActionVerb(text)) {
    return {
      type: "todo",
      title: raw,
      confidence: 0.9,
      reminderTime,
    };
  }

  const pref = options?.bias ? getUserPreference(text, options.bias) : undefined;
  if (pref === "grocery") {
    const items = extractGroceryItems(text, { allowFallback: true });
    return {
      type: "grocery",
      items: items.length ? items : [raw],
      confidence: 0.96,
    };
  }
  if (pref === "todo") {
    return {
      type: "todo",
      title: raw,
      confidence: 0.9,
      reminderTime,
    };
  }

  if (hasExplicitGroceryLanguage(text)) {
    const items = extractGroceryItems(text);
    return {
      type: "grocery",
      items: items.length ? items : [raw],
      confidence: 0.95,
    };
  }

  const addPatternItems = extractAddPatternItems(text);
  if (addPatternItems.length) {
    return {
      type: "grocery",
      items: addPatternItems,
      confidence: 0.92,
    };
  }

  const vocabItems = extractGroceryItems(text);
  if (vocabItems.length) {
    return {
      type: "grocery",
      items: vocabItems,
      confidence: 0.88,
    };
  }

  return {
    type: "todo",
    title: raw,
    confidence: 0.7,
  };
}

export function isGroceryCandidate(input: string) {
  const text = input.trim().toLowerCase();
  if (!text) return false;
  if (detectTime(text).hasTime) return false;
  if (containsActionVerb(text)) return false;
  if (hasExplicitGroceryLanguage(text)) return true;
  return extractGroceryItems(text).length > 0;
}

export function isTodoSignal(input: string) {
  const text = input.trim().toLowerCase();
  if (!text) return false;
  const time = detectTime(text).hasTime;
  return time || containsActionVerb(text);
}

function hasExplicitGroceryLanguage(text: string) {
  return EXPLICIT_GROCERY_PHRASES.some((phrase) => text.includes(phrase));
}

function containsActionVerb(text: string) {
  return ACTION_VERBS.some((verb) => new RegExp(`\\b${escapeRegex(verb)}\\b`).test(text));
}

function isGenericGroceryAdd(text: string) {
  return /^add\s+grocer(?:y|ies)\b/.test(text);
}

function extractAddPatternItems(text: string) {
  const pattern = ADD_PATTERNS.find((regex) => regex.test(text));
  if (!pattern) return [];

  const remainder = text.replace(pattern, "").trim();
  if (/\bgrocer(?:y|ies)\b/.test(remainder)) {
    return [];
  }
  return extractGroceryItems(remainder, { allowFallback: true });
}

function extractGroceryItems(text: string, options?: { allowFallback?: boolean }) {
  const found: string[] = [];

  for (const item of GROCERY_VOCABULARY) {
    if (new RegExp(`\\b${escapeRegex(item)}\\b`).test(text)) {
      found.push(capitalize(item));
    }
  }

  if (found.length === 0 && options?.allowFallback) {
    // If no known items matched, use noun-like words as a best effort.
    const fallback = text
      .split(/[,/&]+| and /g)
      .map((part) => part.trim())
      .filter(Boolean);

    return fallback.map(capitalize);
  }

  // Remove duplicates while preserving order.
  return Array.from(new Set(found));
}

function detectTime(text: string): { hasTime: boolean; reminderTime?: string } {
  const now = new Date();

  if (TIME_WORDS.some((word) => text.includes(word))) {
    return { hasTime: true, reminderTime: deriveReminderTime(text, now) };
  }

  const explicitTime = text.match(/\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/);
  if (explicitTime) {
    const hour = parseInt(explicitTime[1], 10);
    const minute = explicitTime[2] ? parseInt(explicitTime[2], 10) : 0;
    const isPM = explicitTime[3].toLowerCase() === "pm";

    const date = new Date(now);
    const normalizedHour = isPM && hour < 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
    date.setHours(normalizedHour, minute, 0, 0);

    // If the time already passed today, schedule for tomorrow.
    if (date <= now) {
      date.setDate(date.getDate() + 1);
    }

    return { hasTime: true, reminderTime: date.toISOString() };
  }

  return { hasTime: false };
}

function deriveReminderTime(text: string, now: Date) {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  if (text.includes("tomorrow")) {
    return tomorrow.toISOString();
  }

  if (text.includes("tonight") || text.includes("evening")) {
    const evening = new Date(now);
    evening.setHours(18, 0, 0, 0);
    if (evening <= now) {
      evening.setDate(evening.getDate() + 1);
    }
    return evening.toISOString();
  }

  if (text.includes("morning")) {
    const morning = new Date(now);
    morning.setHours(9, 0, 0, 0);
    if (morning <= now) {
      morning.setDate(morning.getDate() + 1);
    }
    return morning.toISOString();
  }

  // Generic fallback: one hour from now.
  const fallback = new Date(now);
  fallback.setHours(now.getHours() + 1, now.getMinutes(), 0, 0);
  return fallback.toISOString();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
