// Authentication middleware for Sales CRM routes
import { Context, Next } from 'hono';
import { validateSession, getSessionToken } from '../routes/auth/helpers';
import type { Bindings, Variables } from '../types';

/**
 * Authentication middleware
 * Validates session token and sets user context
 * 
 * DEVELOPMENT MODE: Uses localStorage session_token as user_id directly
 */
export async function authMiddleware(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const token = getSessionToken(c);

  if (!token) {
    return c.json({
      success: false,
      error: 'Not authenticated - No session token provided'
    }, 401);
  }

  try {
    // DEVELOPMENT MODE: Treat token as user_id directly
    const userId = parseInt(token);
    
    if (isNaN(userId) || userId < 1 || userId > 3) {
      return c.json({
        success: false,
        error: 'Invalid session token - must be 1, 2, or 3'
      }, 401);
    }

    // Set user context for downstream handlers
    c.set('user', {
      id: userId,
      username: userId === 1 ? 'admin@example.com' : (userId === 2 ? 'pm@example.com' : 'sales@example.com'),
      full_name: userId === 1 ? '管理者' : (userId === 2 ? 'PM担当' : '営業担当'),
      role_type: userId === 1 ? 'Admin' : (userId === 2 ? 'PM' : 'Sales'),
      department_id: null
    });

    await next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return c.json({
      success: false,
      error: 'Authentication error'
    }, 500);
  }
}
