import { pool } from "../config/database";
import { Request } from "express";

export interface LogEntry {
  user_id?: number;
  username?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  status?: 'success' | 'failed' | 'error';
}

export interface AdminLogEntry extends LogEntry {
  admin_user_id?: number;
  admin_username?: string;
  target_user_id?: number;
  target_username?: string;
}

// Helper function to extract IP address from request
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// Helper function to extract user agent
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

// Main logging function for user activities
export async function logUserActivity(
  logData: LogEntry,
  req?: Request
): Promise<void> {
  try {
    // Enrich log data with request information if available
    const enrichedLog: LogEntry = {
      ...logData,
      ip_address: logData.ip_address || (req ? getClientIP(req) : undefined),
      user_agent: logData.user_agent || (req ? getUserAgent(req) : undefined),
      session_id: logData.session_id || (req ? (req as any).sessionID : undefined),
      status: logData.status || 'success'
    };

    await pool.execute(
      `INSERT INTO user_activity_logs 
       (user_id, username, action, resource_type, resource_id, details, 
        ip_address, user_agent, session_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        enrichedLog.user_id || null,
        enrichedLog.username || null,
        enrichedLog.action,
        enrichedLog.resource_type || null,
        enrichedLog.resource_id || null,
        enrichedLog.details || null,
        enrichedLog.ip_address || null,
        enrichedLog.user_agent || null,
        enrichedLog.session_id || null,
        enrichedLog.status
      ]
    );
  } catch (error) {
    console.error('Error logging user activity:', error);
    // Don't throw error to avoid breaking the main application flow
  }
}

// Logging function for admin activities
export async function logAdminActivity(
  logData: AdminLogEntry,
  req?: Request
): Promise<void> {
  try {
    const enrichedLog: AdminLogEntry = {
      ...logData,
      ip_address: logData.ip_address || (req ? getClientIP(req) : undefined),
      user_agent: logData.user_agent || (req ? getUserAgent(req) : undefined),
      session_id: logData.session_id || (req ? (req as any).sessionID : undefined),
      status: logData.status || 'success'
    };

    await pool.execute(
      `INSERT INTO admin_activity_logs 
       (admin_user_id, admin_username, action, target_user_id, target_username,
        resource_type, resource_id, details, ip_address, user_agent, session_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        enrichedLog.admin_user_id || null,
        enrichedLog.admin_username || null,
        enrichedLog.action,
        enrichedLog.target_user_id || null,
        enrichedLog.target_username || null,
        enrichedLog.resource_type || null,
        enrichedLog.resource_id || null,
        enrichedLog.details || null,
        enrichedLog.ip_address || null,
        enrichedLog.user_agent || null,
        enrichedLog.session_id || null,
        enrichedLog.status
      ]
    );
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
}

// Convenience functions for common actions
export const ActivityLogger = {
  // Authentication logs
  login: (user_id: number, username: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action: 'login',
      details: 'User logged in successfully'
    }, req),

  loginFailed: (username: string, reason: string, req?: Request) =>
    logUserActivity({
      username,
      action: 'login_failed',
      details: `Login failed: ${reason}`,
      status: 'failed'
    }, req),

  logout: (user_id: number, username: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action: 'logout',
      details: 'User logged out'
    }, req),

  // Registration logs
  registrationCreated: (user_id: number, username: string, registration_id: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action: 'registration_created',
      resource_type: 'registration',
      resource_id: registration_id,
      details: 'New registration created'
    }, req),

  registrationUpdated: (user_id: number, username: string, registration_id: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action: 'registration_updated',
      resource_type: 'registration',
      resource_id: registration_id,
      details: 'Registration updated'
    }, req),

  registrationViewed: (user_id: number, username: string, registration_id: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action: 'registration_viewed',
      resource_type: 'registration',
      resource_id: registration_id,
      details: 'Registration details viewed'
    }, req),

  // File upload logs
  fileUploaded: (user_id: number, username: string, filename: string, fileType: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action: 'file_uploaded',
      resource_type: 'file',
      resource_id: filename,
      details: `Uploaded ${fileType} file: ${filename}`
    }, req),

  // Profile logs
  profileUpdated: (user_id: number, username: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action: 'profile_updated',
      resource_type: 'profile',
      resource_id: user_id.toString(),
      details: 'User profile updated'
    }, req),

  passwordChanged: (user_id: number, username: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action: 'password_changed',
      resource_type: 'profile',
      resource_id: user_id.toString(),
      details: 'Password changed successfully'
    }, req),

  // Admin activity logs
  userSoftDeleted: (admin_id: number, admin_username: string, target_user_id: number, target_username: string, req?: Request) =>
    logAdminActivity({
      admin_user_id: admin_id,
      admin_username,
      action: 'user_soft_deleted',
      target_user_id,
      target_username,
      resource_type: 'user',
      resource_id: target_user_id.toString(),
      details: `Soft deleted user: ${target_username}`
    }, req),

  userRestored: (admin_id: number, admin_username: string, target_user_id: number, target_username: string, req?: Request) =>
    logAdminActivity({
      admin_user_id: admin_id,
      admin_username,
      action: 'user_restored',
      target_user_id,
      target_username,
      resource_type: 'user',
      resource_id: target_user_id.toString(),
      details: `Restored soft-deleted user: ${target_username}`
    }, req),

  dashboardViewed: (admin_id: number, admin_username: string, req?: Request) =>
    logAdminActivity({
      admin_user_id: admin_id,
      admin_username,
      action: 'dashboard_viewed',
      resource_type: 'dashboard',
      details: 'Admin dashboard accessed'
    }, req),

  userListViewed: (admin_id: number, admin_username: string, req?: Request) =>
    logAdminActivity({
      admin_user_id: admin_id,
      admin_username,
      action: 'user_list_viewed',
      resource_type: 'users',
      details: 'User list accessed'
    }, req),

  registrationListViewed: (admin_id: number, admin_username: string, req?: Request) =>
    logAdminActivity({
      admin_user_id: admin_id,
      admin_username,
      action: 'registration_list_viewed',
      resource_type: 'registrations',
      details: 'Registration list accessed'
    }, req),

  // Data export logs
  dataExported: (admin_id: number, admin_username: string, exportType: string, req?: Request) =>
    logAdminActivity({
      admin_user_id: admin_id,
      admin_username,
      action: 'data_exported',
      resource_type: 'export',
      resource_id: exportType,
      details: `Data exported: ${exportType}`
    }, req),

  // Error logs
  error: (user_id: number | undefined, username: string | undefined, action: string, error: string, req?: Request) =>
    logUserActivity({
      user_id,
      username,
      action,
      details: `Error: ${error}`,
      status: 'error'
    }, req)
};

// Function to get user activity logs (for admin viewing)
export async function getUserActivityLogs(
  userId?: number,
  limit: number = 50,
  offset: number = 0
) {
  try {
    let query = `
      SELECT * FROM user_activity_logs 
      WHERE 1=1
    `;
    let params: any[] = [];

    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [logs] = await pool.execute(query, params);
    return logs;
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    return [];
  }
}

// Function to get admin activity logs
export async function getAdminActivityLogs(
  adminId?: number,
  limit: number = 50,
  offset: number = 0
) {
  try {
    let query = `
      SELECT * FROM admin_activity_logs 
      WHERE 1=1
    `;
    let params: any[] = [];

    if (adminId) {
      query += ` AND admin_user_id = ?`;
      params.push(adminId);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [logs] = await pool.execute(query, params);
    return logs;
  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
    return [];
  }
}