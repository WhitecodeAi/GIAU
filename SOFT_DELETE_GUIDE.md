# Soft Delete System

This application now implements a **soft delete** system instead of hard deletion for better data safety and recovery options.

## Overview

When users are "deleted" through the admin interface, they are not permanently removed from the database. Instead:

- A `deleted_at` timestamp is set on the user and their registrations
- The records become hidden from normal queries but remain in the database
- Files are preserved on disk for potential recovery
- Data can be restored if needed

## What Gets Soft Deleted

When you soft delete a user:

### ✅ **Soft Deleted (Hidden but Preserved)**:
- **User account** - Marked as deleted with timestamp
- **All user registrations** - Marked as deleted with timestamp
- **Files remain** - All documents, images, certificates stay on disk

### ❌ **NOT Deleted**:
- **Related data** - Production details, selected products, categories remain linked
- **File system** - All uploaded files are preserved
- **Database integrity** - All relationships maintained

## Benefits of Soft Delete

### 🛡️ **Data Safety**:
- **No accidental permanent loss** - Data can always be recovered
- **Audit trail** - Know exactly when something was deleted
- **Referential integrity** - No broken database relationships

### 🔄 **Recovery Options**:
- **Quick restoration** - Admins can restore users instantly
- **Data investigation** - Can review deleted data before permanent cleanup
- **Rollback capability** - Easy to undo mistakes

### 📊 **Business Continuity**:
- **Historical reporting** - Can include deleted records in historical analysis
- **Legal compliance** - Data retention requirements can be met
- **Gradual cleanup** - Control when data is permanently removed

## User Interface Changes

### Admin Dashboard:
- **Button text**: "Delete" → "Soft Delete"
- **Confirmation dialog**: Updated to explain soft delete behavior
- **Success message**: "User soft deleted successfully"

### API Endpoints:
- `DELETE /api/users/:userId` - Soft deletes user and registrations
- `PATCH /api/users/:userId/restore` - Restores soft-deleted user (NEW)

## Database Schema Changes

### New Columns Added:
```sql
-- Users table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- User registrations table  
ALTER TABLE user_registrations ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Indexes for performance
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_user_registrations_deleted_at ON user_registrations(deleted_at);
```

## Query Changes

All user and registration queries now include `WHERE deleted_at IS NULL` to exclude soft-deleted records:

```sql
-- Before (shows all users)
SELECT * FROM users WHERE id = ?

-- After (excludes soft-deleted)  
SELECT * FROM users WHERE id = ? AND deleted_at IS NULL
```

## Management Scripts

### 1. View Soft-Deleted Records
```bash
node scripts/view-soft-deleted.cjs
```
Shows all soft-deleted users and registrations with summary statistics.

### 2. Clean Up Old Soft-Deleted Records
```bash
# Clean up records older than 30 days (default)
node scripts/cleanup-soft-deleted.cjs

# Clean up records older than 90 days
node scripts/cleanup-soft-deleted.cjs 90
```
Permanently removes old soft-deleted records and their files.

### 3. Restore a User (via API)
```javascript
// Client-side code
await usersAPI.restoreUser(userId);
```

## Implementation Details

### Soft Delete Process:
1. **User clicks "Soft Delete"** in Admin Dashboard  
2. **Confirmation dialog** explains the behavior
3. **API call** sets `deleted_at = NOW()` on user and registrations
4. **Files remain** on disk untouched
5. **User disappears** from normal views
6. **Success message** confirms soft deletion

### Restore Process:
1. **Admin identifies** user to restore (via scripts or database)
2. **API call** sets `deleted_at = NULL` on user and registrations  
3. **User reappears** in normal views
4. **All data intact** - registrations, files, everything restored

### Permanent Cleanup:
1. **Run cleanup script** with desired age threshold
2. **Script finds** old soft-deleted records  
3. **Hard deletes** records and removes files
4. **Cannot be undone** after cleanup

## Migration

The soft delete system was added via migration script:
```bash
node scripts/add-soft-delete.cjs
```

This script safely adds the required columns and indexes without affecting existing data.

## Best Practices

### 🎯 **For Administrators**:
- **Review before cleanup** - Use view script to see what will be permanently deleted
- **Set appropriate cleanup intervals** - Balance storage vs recovery time
- **Test restore process** - Ensure you can recover important data
- **Regular maintenance** - Run cleanup scripts periodically

### 🔧 **For Developers**:
- **Always include deleted_at checks** in queries
- **Use consistent patterns** for soft delete queries  
- **Test with soft-deleted data** to ensure proper filtering
- **Consider cascade behavior** when adding new related tables

## Recovery Scenarios

### Accidental Deletion:
1. User reports missing account
2. Admin checks soft-deleted records
3. If found, restore immediately via API
4. User account fully restored

### Data Investigation:
1. Compliance request for deleted user data
2. Admin views soft-deleted records
3. Can access all historical data
4. Meets regulatory requirements

### Bulk Recovery:
1. System error causes mass deletions
2. All data preserved as soft-deleted
3. Bulk restore possible via database update
4. No permanent data loss

## Monitoring

Track soft delete usage and storage:
- Monitor growth of soft-deleted records
- Set up alerts for unusual deletion patterns  
- Regular cleanup schedule based on storage capacity
- Audit trail of all soft delete/restore operations

---

**⚠️ Important**: Files are preserved during soft delete but will be permanently removed during cleanup. Ensure proper backup procedures are in place.