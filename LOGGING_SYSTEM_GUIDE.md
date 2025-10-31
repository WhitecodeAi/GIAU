# User Activity Logging System

A comprehensive logging system to track all user activities and admin actions within the GI Registration application.

## Overview

The logging system captures detailed information about user interactions, administrative actions, and system events to provide:

- **Audit trails** for compliance and security
- **User behavior analytics** for system improvement
- **Security monitoring** for suspicious activities
- **Error tracking** for debugging and maintenance
- **Administrative oversight** of all system operations

## Database Schema

### User Activity Logs Table (`user_activity_logs`)

```sql
CREATE TABLE user_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,                    -- Foreign key to users table
  username VARCHAR(255) NULL,          -- Username for quick reference
  action VARCHAR(100) NOT NULL,        -- Action performed (login, registration_created, etc.)
  resource_type VARCHAR(50) NULL,      -- Type of resource affected (user, registration, file, etc.)
  resource_id VARCHAR(50) NULL,        -- ID of the specific resource
  details TEXT NULL,                   -- Additional details about the action
  ip_address VARCHAR(45) NULL,         -- User's IP address
  user_agent TEXT NULL,                -- User's browser/client information
  session_id VARCHAR(255) NULL,        -- Session identifier
  status ENUM('success', 'failed', 'error') DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_user_id (user_id),
  INDEX idx_username (username),
  INDEX idx_action (action),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Admin Activity Logs Table (`admin_activity_logs`)

```sql
CREATE TABLE admin_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NULL,              -- Admin who performed the action
  admin_username VARCHAR(255) NULL,    -- Admin username
  action VARCHAR(100) NOT NULL,        -- Administrative action
  target_user_id INT NULL,             -- User affected by admin action
  target_username VARCHAR(255) NULL,   -- Username of affected user
  resource_type VARCHAR(50) NULL,      -- Resource type
  resource_id VARCHAR(50) NULL,        -- Resource ID
  details TEXT NULL,                   -- Action details
  ip_address VARCHAR(45) NULL,         -- Admin's IP address
  user_agent TEXT NULL,                -- Admin's browser information
  session_id VARCHAR(255) NULL,        -- Admin's session ID
  status ENUM('success', 'failed', 'error') DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes and foreign keys
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_target_user_id (target_user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## Logged Activities

### User Activities
- **Authentication**:
  - `login` - Successful user login
  - `login_failed` - Failed login attempt
  - `logout` - User logout
  - `password_changed` - Password update

- **Registration Management**:
  - `registration_created` - New registration submitted
  - `registration_updated` - Registration modified
  - `registration_viewed` - Registration details accessed

- **File Operations**:
  - `file_uploaded` - Document/image upload
  - `file_downloaded` - File download (if tracked)

- **Profile Management**:
  - `profile_updated` - Profile information changed
  - `profile_viewed` - Profile accessed

### Admin Activities
- **User Management**:
  - `user_soft_deleted` - User soft deleted
  - `user_restored` - Soft-deleted user restored
  - `user_list_viewed` - User list accessed
  - `registration_list_viewed` - Registration list accessed

- **Dashboard Actions**:
  - `dashboard_viewed` - Admin dashboard accessed
  - `data_exported` - Data export performed

- **System Administration**:
  - Various system maintenance actions

## Implementation

### 1. Logger Utility (`server/utils/logger.ts`)

The core logging functionality with convenience methods:

```typescript
import { ActivityLogger } from "../utils/logger";

// Log successful login
await ActivityLogger.login(user.id, user.username, req);

// Log failed login
await ActivityLogger.loginFailed(username, "Invalid password", req);

// Log admin action
await ActivityLogger.userSoftDeleted(
  adminId, adminUsername, 
  targetUserId, targetUsername, 
  req
);
```

### 2. Automatic Context Enrichment

The logger automatically captures:
- **IP Address** - Real client IP (handles proxies)
- **User Agent** - Browser/client information
- **Session ID** - For session tracking
- **Timestamp** - Automatic creation time
- **Status** - Success/failed/error classification

### 3. Integration Points

Logging is integrated at key application points:

```typescript
// In authentication routes
import { ActivityLogger } from "../utils/logger";

export async function login(req: Request, res: Response) {
  // ... authentication logic
  
  if (loginSuccessful) {
    await ActivityLogger.login(user.id, user.username, req);
  } else {
    await ActivityLogger.loginFailed(username, reason, req);
  }
}
```

## API Endpoints

### Get Activity Logs (Admin Only)
```
GET /api/logs/activity?page=1&limit=50&logType=user&userId=123
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `logType` - "user" or "admin" logs
- `userId` - Filter by specific user (optional)

### Get User Activity Logs (Admin Only)
```
GET /api/logs/user/:userId?page=1&limit=50
```

### Get Activity Statistics (Admin Only)
```
GET /api/logs/statistics
```

## Management Scripts

### 1. Create Logs Tables
```bash
node scripts/create-logs-table.cjs
```
Sets up the logging database schema.

### 2. View Recent Activity
```bash
# View last 20 logs
node scripts/view-activity-logs.cjs

# View last 50 logs
node scripts/view-activity-logs.cjs 50
```

Shows recent user and admin activities with summary statistics.

## Usage Examples

### Basic Logging
```typescript
import { logUserActivity } from "../utils/logger";

// Simple activity log
await logUserActivity({
  user_id: 123,
  username: "john_doe",
  action: "profile_updated",
  details: "Updated contact information"
}, req);
```

### Using Convenience Methods
```typescript
import { ActivityLogger } from "../utils/logger";

// Login tracking
await ActivityLogger.login(userId, username, req);

// Registration tracking
await ActivityLogger.registrationCreated(
  userId, username, registrationId, req
);

// File upload tracking
await ActivityLogger.fileUploaded(
  userId, username, filename, fileType, req
);
```

### Admin Action Logging
```typescript
// Soft delete action
await ActivityLogger.userSoftDeleted(
  adminId, adminUsername,
  targetUserId, targetUsername,
  req
);

// Dashboard access
await ActivityLogger.dashboardViewed(adminId, adminUsername, req);
```

## Monitoring and Analytics

### Key Metrics to Track
- **Login patterns** - Failed attempts, unusual times
- **User engagement** - Registration activities, file uploads
- **Admin actions** - User management, data exports
- **Error rates** - Failed operations, system errors
- **Security events** - Suspicious IP addresses, multiple failed logins

### Performance Considerations
- **Indexes** - Optimized for common query patterns
- **Async logging** - Non-blocking application flow
- **Error handling** - Logging failures don't break main functionality
- **Data retention** - Consider archiving old logs

## Security Features

### Data Protection
- **IP tracking** - Monitor access patterns
- **Session correlation** - Track user sessions
- **Error classification** - Identify security issues
- **Anonymous handling** - Logs system events without user context

### Privacy Considerations
- **Sensitive data** - Avoid logging passwords or personal details
- **Data retention** - Implement log rotation policies
- **Access control** - Admin-only log access
- **Compliance** - Support for GDPR/audit requirements

## Best Practices

### For Developers
1. **Consistent logging** - Use provided convenience methods
2. **Meaningful details** - Include relevant context in log details
3. **Error handling** - Log errors don't break main functionality
4. **Performance** - Async logging to avoid blocking operations

### For Administrators
1. **Regular monitoring** - Check logs for unusual patterns
2. **Security review** - Monitor failed login attempts
3. **Performance analysis** - Use logs to identify bottlenecks
4. **Compliance** - Maintain logs for audit requirements

## Future Enhancements

### Planned Features
- **Real-time monitoring** - WebSocket-based log streaming
- **Alert system** - Notifications for critical events
- **Analytics dashboard** - Visual representation of log data
- **Log aggregation** - Support for distributed logging
- **Export functionality** - CSV/JSON export for analysis

### Integration Possibilities
- **External logging services** - ELK stack, Splunk
- **Monitoring tools** - Grafana, Prometheus
- **Security systems** - SIEM integration
- **Backup systems** - Automated log archival

---

**Setup Instructions:**
1. Run `node scripts/create-logs-table.cjs` to create tables
2. Logging is automatically integrated into existing routes
3. Use `node scripts/view-activity-logs.cjs` to view recent activity
4. Access logs via API endpoints with admin credentials

The logging system provides comprehensive visibility into application usage while maintaining performance and security standards.