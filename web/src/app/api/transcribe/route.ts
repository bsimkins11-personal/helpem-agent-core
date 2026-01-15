// /api/transcribe - Speech-to-text using OpenAI Whisper
// Receives audio data, returns transcription

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

export async function POST(req: Request) {
  // Check usage limit
  const usage = checkUsageLimit();
  if (!usage.allowed) {
    return NextResponse.json(usageLimitError(), { status: 429 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    
    let audioFile: File;
    
    // Handle different content types
    if (contentType.includes("multipart/form-data")) {
      // Form data upload
      const formData = await req.formData();
      const file = formData.get("audio");
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "No audio file provided" },
          { status: 400 }
        );
      }
      audioFile = file;
    } else {
      // Raw audio data
      const audioData = await req.arrayBuffer();
      if (!audioData || audioData.byteLength === 0) {
        return NextResponse.json(
          { error: "No audio data provided" },
          { status: 400 }
        );
      }
      
      // Determine file extension from content type
      let extension = "m4a";
      if (contentType.includes("wav")) extension = "wav";
      else if (contentType.includes("mp3")) extension = "mp3";
      else if (contentType.includes("webm")) extension = "webm";
      else if (contentType.includes("ogg")) extension = "ogg";
      
      // Create a File object from the buffer
      audioFile = new File(
        [audioData],
        `audio.${extension}`,
        { type: contentType || "audio/m4a" }
      );
    }

    console.log(`📤 Transcribing audio: ${audioFile.size} bytes, type: ${audioFile.type}`);

    const client = getOpenAIClient();

    // Use Whisper API for transcription
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "text",
    });

    console.log(`✅ Transcription: "${transcription}"`);
    
    // Track usage (estimate 5 seconds of audio)
    trackUsage("whisper", { seconds: 5 });

    return NextResponse.json({
      success: true,
      text: transcription,
    });

  } catch (error) {
    console.error("Transcription error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Transcription failed";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
