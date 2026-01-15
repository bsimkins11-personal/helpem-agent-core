// /api/tts - Text-to-speech using OpenAI TTS
// Receives text, returns audio URL or audio data

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { checkUsageLimit, trackUsage, usageLimitError } from "@/lib/usageTracker";

let openai: OpenAI | null = null;
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

// Voice options: alloy, echo, fable, onyx, nova, shimmer
// nova = female, natural
// onyx = male, deep
// alloy = neutral
type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export async function POST(req: Request) {
  // Check usage limit
  const usage = checkUsageLimit();
  if (!usage.allowed) {
    return NextResponse.json(usageLimitError(), { status: 429 });
  }

  try {
    const { text, voice = "nova" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    // Limit text length to avoid huge costs
    const maxLength = 4000;
    const truncatedText = text.length > maxLength 
      ? text.slice(0, maxLength) + "..."
      : text;

    console.log(`🔊 Generating TTS: "${truncatedText.slice(0, 50)}..." with voice: ${voice}`);

    const client = getOpenAIClient();

    // Generate speech
    const response = await client.audio.speech.create({
      model: "tts-1", // or "tts-1-hd" for higher quality
      voice: voice as Voice,
      input: truncatedText,
      response_format: "mp3",
    });

    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();

    console.log(`✅ TTS generated: ${audioBuffer.byteLength} bytes`);
    
    // Track usage based on text length
    trackUsage("tts", { chars: truncatedText.length });

    // Return audio directly
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error("TTS error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "TTS failed";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
