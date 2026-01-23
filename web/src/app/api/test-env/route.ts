import { NextResponse } from "next/server";

export async function GET() {
  const hasJwtSecret = !!process.env.JWT_SECRET;
  const jwtSecretLength = process.env.JWT_SECRET?.length || 0;
  const jwtSecretPrefix = process.env.JWT_SECRET?.slice(0, 5) || "none";
  
  return NextResponse.json({
    hasJwtSecret,
    jwtSecretLength,
    jwtSecretPrefix,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('SECRET')),
  });
}
