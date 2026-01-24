import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }
    
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      return NextResponse.json({ 
        error: "JWT_SECRET not configured",
        hasSecret: false 
      }, { status: 500 });
    }
    
    try {
      // Try to verify the token
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
      
      return NextResponse.json({
        success: true,
        decoded,
        secretLength: JWT_SECRET.length,
        secretPrefix: JWT_SECRET.slice(0, 5)
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: err.message,
        errorName: err.name,
        secretLength: JWT_SECRET.length,
        secretPrefix: JWT_SECRET.slice(0, 5)
      });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Internal error",
      message: error.message 
    }, { status: 500 });
  }
}
