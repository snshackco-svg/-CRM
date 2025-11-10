// Authentication helper functions

import { Context } from 'hono';

// Simple password hashing (MVP - replace with bcrypt in production)
export function hashPassword(password: string): string {
  // For MVP, use simple base64 encoding
  // In production, use bcrypt or argon2
  return btoa(password);
}

export function verifyPassword(password: string, hash: string): boolean {
  const passwordHash = hashPassword(password);
  return passwordHash === hash;
}

// Generate session token
export function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Create session
export async function createSession(db: D1Database, userId: number): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

  await db.prepare(`
    INSERT INTO user_sessions (user_id, session_token, expires_at)
    VALUES (?, ?, ?)
  `).bind(userId, token, expiresAt.toISOString()).run();

  return token;
}

// Validate session
export async function validateSession(db: D1Database, token: string): Promise<any | null> {
  const session = await db.prepare(`
    SELECT 
      us.user_id,
      us.expires_at,
      u.name as full_name,
      u.email as username,
      u.role as role_type
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.session_token = ? AND us.expires_at > datetime('now')
  `).bind(token).first();

  if (!session) {
    return null;
  }

  return session;
}

// Delete session (logout)
export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare(`
    DELETE FROM user_sessions WHERE session_token = ?
  `).bind(token).run();
}

// Clean expired sessions
export async function cleanExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare(`
    DELETE FROM user_sessions WHERE expires_at < datetime('now')
  `).run();
}

// Log audit event
export async function logAudit(
  db: D1Database,
  actorUserId: number | null,
  action: string,
  targetType: string | null,
  targetId: number | null,
  metaJson: string | null,
  ipAddress: string | null = null,
  userAgent: string | null = null
): Promise<void> {
  await db.prepare(`
    INSERT INTO audit_logs (
      actor_user_id, action, target_type, target_id, 
      meta_json, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    actorUserId, action, targetType, targetId,
    metaJson, ipAddress, userAgent
  ).run();
}

// Get user's assigned modules
export async function getUserModules(db: D1Database, userId: number): Promise<any[]> {
  const result = await db.prepare(`
    SELECT 
      m.id,
      m.code,
      m.display_name,
      m.route,
      m.description,
      m.icon,
      m.color
    FROM modules m
    JOIN user_module_assignments uma ON m.id = uma.module_id
    WHERE uma.user_id = ?
      AND m.is_active = 1
      AND (uma.starts_at IS NULL OR uma.starts_at <= datetime('now'))
      AND (uma.ends_at IS NULL OR uma.ends_at > datetime('now'))
    ORDER BY m.display_name
  `).bind(userId).all();

  return result.results || [];
}

// Get user's permissions
export async function getUserPermissions(db: D1Database, userId: number): Promise<string[]> {
  const result = await db.prepare(`
    SELECT DISTINCT p.key
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?
  `).bind(userId).all();

  return (result.results || []).map((row: any) => row.key);
}

// Check if user has permission
export async function hasPermission(
  db: D1Database,
  userId: number,
  permissionKey: string
): Promise<boolean> {
  // Simplified for MVP - all authenticated users have all permissions
  return true;
}

// Extract session token from request
export function getSessionToken(c: Context): string | null {
  // Try X-Session-Token header first (used by frontend)
  const headerToken = c.req.header('X-Session-Token');
  if (headerToken) return headerToken;
  
  // Try cookie
  const cookieToken = c.req.header('Cookie')?.split(';')
    .find(c => c.trim().startsWith('session_token='))
    ?.split('=')[1];
  
  if (cookieToken) return cookieToken;
  
  // Try Authorization header
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}
