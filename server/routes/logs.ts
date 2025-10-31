import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getUserActivityLogs, getAdminActivityLogs } from "../utils/logger";

// Get user activity logs (admin only)
export async function getActivityLogs(req: AuthRequest, res: Response) {
  try {
    // Require admin role
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const logType = req.query.logType as string || "user"; // 'user' or 'admin'

    const offset = (page - 1) * limit;

    let logs;
    if (logType === "admin") {
      logs = await getAdminActivityLogs(userId, limit, offset);
    } else {
      logs = await getUserActivityLogs(userId, limit, offset);
    }

    const logsArray = Array.isArray(logs) ? logs : [];
    // Get total count for pagination
    // This is a simplified approach - in production you'd want separate count queries
    const hasMore = logsArray.length === limit;

    res.json({
      logs: logsArray,
      pagination: {
        page,
        limit,
        hasMore
      }
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
}

// Get activity logs for a specific user (admin only)
export async function getUserActivityLogsById(req: AuthRequest, res: Response) {
  try {
    // Require admin role
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "Valid user ID is required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const logs = await getUserActivityLogs(userId, limit, offset);
    const logsArray = Array.isArray(logs) ? logs : [];

    res.json({
      logs: logsArray,
      pagination: {
        page,
        limit,
        hasMore: logsArray.length === limit
      }
    });
  } catch (error) {
    console.error("Error fetching user activity logs:", error);
    res.status(500).json({ error: "Failed to fetch user activity logs" });
  }
}

// Get dashboard activity statistics (admin only)
export async function getActivityStatistics(req: AuthRequest, res: Response) {
  try {
    // Require admin role
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // This would be implemented with more sophisticated queries
    // For now, return basic stats
    const stats = {
      totalUserActivities: 0,
      totalAdminActivities: 0,
      todayActivities: 0,
      recentLogins: 0,
      failedLogins: 0
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching activity statistics:", error);
    res.status(500).json({ error: "Failed to fetch activity statistics" });
  }
}