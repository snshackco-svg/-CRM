import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  deleteSession,
  cleanExpiredSessions,
  logAudit,
  getUserModules,
  getUserPermissions,
  getSessionToken
} from './helpers';

type Bindings = {
  DB: D1Database;
};

const authRoute = new Hono<{ Bindings: Bindings }>();

// Login endpoint
authRoute.post('/login', async (c) => {
  const { DB } = c.env;
  const { username, password } = await c.req.json();

  if (!username || !password) {
    return c.json({
      success: false,
      error: 'Username and password are required'
    }, 400);
  }

  try {
    // Clean expired sessions
    await cleanExpiredSessions(DB);

    // Find user
    const user = await DB.prepare(`
      SELECT 
        user_id,
        username,
        password_hash,
        full_name,
        role_type,
        is_active,
        department_id
      FROM users
      WHERE username = ?
    `).bind(username).first();

    if (!user) {
      // Log failed login attempt
      await logAudit(DB, null, 'login_failed', 'user', null, 
        JSON.stringify({ username, reason: 'user_not_found' }));
      
      return c.json({
        success: false,
        error: 'Invalid username or password'
      }, 401);
    }

    // Check if account is active
    if (!user.is_active) {
      await logAudit(DB, user.user_id as number, 'login_failed', 'user', user.user_id as number,
        JSON.stringify({ reason: 'account_disabled' }));
      
      return c.json({
        success: false,
        error: 'Account is disabled'
      }, 401);
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash as string)) {
      await logAudit(DB, user.user_id as number, 'login_failed', 'user', user.user_id as number,
        JSON.stringify({ reason: 'invalid_password' }));
      
      return c.json({
        success: false,
        error: 'Invalid username or password'
      }, 401);
    }

    // Create session
    const sessionToken = await createSession(DB, user.user_id as number);

    // Update last login
    await DB.prepare(`
      UPDATE users SET last_login_at = datetime('now') WHERE user_id = ?
    `).bind(user.user_id).run();

    // Log successful login
    await logAudit(DB, user.user_id as number, 'login_success', 'user', user.user_id as number, null);

    // Set cookie
    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'Lax',
      maxAge: 86400, // 24 hours
      path: '/'
    });

    // Get user's assigned modules
    const modules = await getUserModules(DB, user.user_id as number);
    const permissions = await getUserPermissions(DB, user.user_id as number);

    return c.json({
      success: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role_type: user.role_type,
        department_id: user.department_id
      },
      session_token: sessionToken,
      modules,
      permissions
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// Logout endpoint
authRoute.post('/logout', async (c) => {
  const { DB } = c.env;
  const token = getSessionToken(c);

  if (!token) {
    return c.json({
      success: false,
      error: 'No session found'
    }, 401);
  }

  try {
    // Validate session to get user info for audit log
    const session = await validateSession(DB, token);
    
    if (session) {
      await logAudit(DB, session.user_id, 'logout', 'user', session.user_id, null);
    }

    // Delete session
    await deleteSession(DB, token);

    // Clear cookie
    deleteCookie(c, 'session_token', { path: '/' });

    return c.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// Get current user info and assigned modules
authRoute.get('/me', async (c) => {
  const { DB } = c.env;
  const token = getSessionToken(c);

  if (!token) {
    return c.json({
      success: false,
      error: 'Not authenticated'
    }, 401);
  }

  try {
    const session = await validateSession(DB, token);

    if (!session) {
      return c.json({
        success: false,
        error: 'Invalid or expired session'
      }, 401);
    }

    // Get user's assigned modules
    const modules = await getUserModules(DB, session.user_id);
    const permissions = await getUserPermissions(DB, session.user_id);

    return c.json({
      success: true,
      user: {
        user_id: session.user_id,
        username: session.username,
        full_name: session.full_name,
        role_type: session.role_type,
        department_id: session.department_id
      },
      modules,
      permissions
    });

  } catch (error: any) {
    console.error('Get current user error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// Get user's assigned modules only
authRoute.get('/me/modules', async (c) => {
  const { DB } = c.env;
  const token = getSessionToken(c);

  if (!token) {
    return c.json({
      success: false,
      error: 'Not authenticated'
    }, 401);
  }

  try {
    const session = await validateSession(DB, token);

    if (!session) {
      return c.json({
        success: false,
        error: 'Invalid or expired session'
      }, 401);
    }

    const modules = await getUserModules(DB, session.user_id);

    return c.json({
      success: true,
      modules
    });

  } catch (error: any) {
    console.error('Get modules error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// Check if user has specific permission
authRoute.post('/check-permission', async (c) => {
  const { DB } = c.env;
  const token = getSessionToken(c);
  const { permission } = await c.req.json();

  if (!token) {
    return c.json({
      success: false,
      error: 'Not authenticated'
    }, 401);
  }

  try {
    const session = await validateSession(DB, token);

    if (!session) {
      return c.json({
        success: false,
        error: 'Invalid or expired session'
      }, 401);
    }

    const permissions = await getUserPermissions(DB, session.user_id);
    const hasPermission = permissions.includes(permission) || 
                         permissions.includes('admin.full') ||
                         session.role_type === 'president';

    return c.json({
      success: true,
      has_permission: hasPermission
    });

  } catch (error: any) {
    console.error('Check permission error:', error);
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

export default authRoute;
