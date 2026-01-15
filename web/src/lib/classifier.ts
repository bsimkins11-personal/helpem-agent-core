export function classify(input: string) {
  const text = input.toLowerCase();

  if (text.includes("every") || text.includes("daily")) {
    return { type: "habit", confidence: 0.9 };
  }

  if (text.includes("tomorrow") || text.includes("at")) {
    return { type: "appointment", confidence: 0.8 };
  }

  return { type: "todo", confidence: 0.7 };
}
