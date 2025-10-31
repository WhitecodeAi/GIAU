const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "193.203.184.233",
  user: process.env.DB_USER || "u207346834_gi",
  password: process.env.DB_PASSWORD || "GiDB25@!",
  database: process.env.DB_NAME || "u207346834_gi",
};

async function cleanupSoftDeletedRecords() {
  let connection;
  const daysOld = process.argv[2] ? parseInt(process.argv[2]) : 30; // Default 30 days
  
  console.log(`🧹 Cleaning up soft-deleted records older than ${daysOld} days...`);

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Start transaction
    await connection.beginTransaction();

    // Find old soft-deleted registrations to clean up files
    const oldRegistrations = await connection.execute(`
      SELECT id, user_id
      FROM user_registrations 
      WHERE deleted_at IS NOT NULL 
        AND deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [daysOld]);

    const registrationIds = oldRegistrations[0].map(r => r.id);

    if (registrationIds.length > 0) {
      console.log(`📁 Found ${registrationIds.length} old soft-deleted registrations to clean up`);

      const placeholders = registrationIds.map(() => "?").join(",");

      // Hard delete dependent data for old soft-deleted registrations
      await connection.execute(
        `DELETE FROM user_production_details WHERE registration_id IN (${placeholders})`,
        registrationIds
      );
      console.log("✅ Cleaned up production details");

      await connection.execute(
        `DELETE FROM user_selected_products WHERE registration_id IN (${placeholders})`,
        registrationIds
      );
      console.log("✅ Cleaned up selected products");

      await connection.execute(
        `DELETE FROM user_existing_products WHERE registration_id IN (${placeholders})`,
        registrationIds
      );
      console.log("✅ Cleaned up existing products");

      await connection.execute(
        `DELETE FROM user_registration_categories WHERE registration_id IN (${placeholders})`,
        registrationIds
      );
      console.log("✅ Cleaned up registration categories");

      // Hard delete old soft-deleted registrations
      await connection.execute(
        `DELETE FROM user_registrations WHERE id IN (${placeholders})`,
        registrationIds
      );
      console.log("✅ Cleaned up old registrations");

      // Clean up files from disk
      let filesCleanedCount = 0;
      for (const regId of registrationIds) {
        try {
          const dir = path.join("/var/www/GI", `registration_${regId}`);
          await fs.rm(dir, { recursive: true, force: true });
          filesCleanedCount++;
        } catch (err) {
          console.warn(`⚠️ Failed to remove files for registration ${regId}:`, err.message);
        }
      }
      console.log(`📂 Cleaned up files for ${filesCleanedCount} registrations`);
    }

    // Find old soft-deleted users (only those with no remaining registrations)
    const oldUsers = await connection.execute(`
      SELECT u.id, u.username, u.email
      FROM users u
      WHERE u.deleted_at IS NOT NULL 
        AND u.deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND NOT EXISTS (
          SELECT 1 FROM user_registrations ur 
          WHERE ur.user_id = u.id
        )
    `, [daysOld]);

    const userIds = oldUsers[0].map(u => u.id);

    if (userIds.length > 0) {
      console.log(`👤 Found ${userIds.length} old soft-deleted users with no registrations to clean up`);

      // Hard delete old soft-deleted users
      const userPlaceholders = userIds.map(() => "?").join(",");
      await connection.execute(
        `DELETE FROM users WHERE id IN (${userPlaceholders})`,
        userIds
      );
      console.log("✅ Cleaned up old users");
    }

    await connection.commit();
    console.log("🎉 Cleanup completed successfully!");

    // Show current soft-deleted count
    const [softDeletedUsers] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NOT NULL"
    );
    const [softDeletedRegistrations] = await connection.execute(
      "SELECT COUNT(*) as count FROM user_registrations WHERE deleted_at IS NOT NULL"
    );

    console.log("\n📊 Current soft-deleted records:");
    console.log(`   Users: ${softDeletedUsers[0].count}`);
    console.log(`   Registrations: ${softDeletedRegistrations[0].count}`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    if (connection) {
      try {
        await connection.rollback();
        console.log("🔄 Transaction rolled back");
      } catch (rollbackError) {
        console.error("❌ Error rolling back:", rollbackError);
      }
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

console.log(`
🧹 Soft Delete Cleanup Tool
Usage: node cleanup-soft-deleted.cjs [days]
  days: Number of days old soft-deleted records to clean up (default: 30)

This will permanently delete:
- Soft-deleted registrations older than specified days
- Associated files and data
- Soft-deleted users with no remaining registrations

Current settings: ${process.argv[2] || 30} days
`);

cleanupSoftDeletedRecords();