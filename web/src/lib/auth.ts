import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { auditLog } from './auditLog';

export interface AuthUser {
  userId: string;
  appleUserId: string;
}

/**
 * Get authenticated user from session token (cookie or iOS native)
 * Returns null if not authenticated
 */
export async function getAuthUser(req?: Request): Promise<AuthUser | null> {
  console.log('🔐 ========================================');
  console.log('🔐 getAuthUser: Starting authentication check');
  console.log('🔐 ========================================');
  
  try {
    // Try to get token from cookie first
    const cookieStore = await cookies();
    let token = cookieStore.get('session_token')?.value;
    console.log('🔍 Cookie token:', token ? `Found (${token.substring(0, 20)}...)` : 'NOT FOUND');
    
    // If no cookie, try Authorization header (for iOS or direct API calls)
    if (!token && req) {
      const authHeader = req.headers.get('Authorization');
      console.log('🔍 Authorization header:', authHeader ? 'Present' : 'NOT FOUND');
      
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('🔍 Token from header:', `Found (${token.substring(0, 20)}...)`);
      }
    }
    
    if (!token) {
      console.error('❌ No session token found (checked cookie + header)');
      auditLog("UNAUTHORIZED_ACCESS", { reason: "No token provided" }, req);
      return null;
    }
    
    console.log('🔍 Token found, verifying...');
    console.log('🔍 Token length:', token.length);
    
    // Verify JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET not configured in environment');
      return null;
    }
    console.log('✅ JWT_SECRET is configured');
    
    const decoded = jwt.verify(token, secret) as any;
    console.log('✅ Token verified successfully');
    console.log('🔍 Decoded payload:', {
      userId: decoded.userId,
      appleUserId: decoded.appleUserId,
      iat: decoded.iat,
      exp: decoded.exp,
    });
    
    if (!decoded.userId || !decoded.appleUserId) {
      console.error('❌ Invalid token payload - missing userId or appleUserId');
      console.error('❌ Payload:', decoded);
      auditLog("AUTH_FAILED", { reason: "Invalid token payload" }, req);
      return null;
    }
    
    // Successful authentication
    console.log('✅ Authentication successful for user:', decoded.userId);
    console.log('🔐 ========================================');
    auditLog("AUTH_SUCCESS", { userId: decoded.userId }, req);
    
    return {
      userId: decoded.userId,
      appleUserId: decoded.appleUserId,
    };
  } catch (error) {
    console.error('🔴 ========================================');
    console.error('❌ AUTH ERROR in getAuthUser');
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && 'name' in error) {
      console.error('❌ JWT Error name:', (error as any).name);
    }
    console.error('🔴 ========================================');
    auditLog("AUTH_FAILED", { 
      reason: error instanceof Error ? error.message : "Unknown error" 
    }, req);
    return null;
  }
}
