import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getPromptWithTime } from "@/lib/prompt";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  const client = new OpenAI({ apiKey });

  const { input } = await req.json();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: getPromptWithTime() },
      { role: "user", content: input },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;

  try {
    return NextResponse.json(JSON.parse(content!));
  } catch {
    return NextResponse.json(
      { error: "Invalid LLM response" },
      { status: 500 }
    );
  }
}
