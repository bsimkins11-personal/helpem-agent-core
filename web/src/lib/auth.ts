import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
  appleUserId: string;
}

/**
 * Get authenticated user from session token (cookie or iOS native)
 * Returns null if not authenticated
 */
export async function getAuthUser(req?: Request): Promise<AuthUser | null> {
  try {
    // Try to get token from cookie first
    const cookieStore = await cookies();
    let token = cookieStore.get('session_token')?.value;
    
    // If no cookie, try Authorization header (for iOS or direct API calls)
    if (!token && req) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      console.log('❌ No session token found');
      return null;
    }
    
    // Verify JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET not configured');
      return null;
    }
    
    const decoded = jwt.verify(token, secret) as any;
    
    if (!decoded.userId || !decoded.appleUserId) {
      console.error('❌ Invalid token payload');
      return null;
    }
    
    return {
      userId: decoded.userId,
      appleUserId: decoded.appleUserId,
    };
  } catch (error) {
    console.error('❌ Auth error:', error);
    return null;
  }
}
