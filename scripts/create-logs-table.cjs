const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "193.203.184.233",
  user: process.env.DB_USER || "u207346834_gi",
  password: process.env.DB_PASSWORD || "GiDB25@!",
  database: process.env.DB_NAME || "u207346834_gi",
};

async function createLogsTable() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to database");

    // Create logs table
    const createLogsTableSQL = `
      CREATE TABLE IF NOT EXISTS user_activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        username VARCHAR(255) NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NULL,
        resource_id VARCHAR(50) NULL,
        details TEXT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        session_id VARCHAR(255) NULL,
        status ENUM('success', 'failed', 'error') DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_username (username),
        INDEX idx_action (action),
        INDEX idx_resource_type (resource_type),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(createLogsTableSQL);
    console.log("✅ Created user_activity_logs table");

    // Create admin activity logs table for admin-specific actions
    const createAdminLogsTableSQL = `
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_user_id INT NULL,
        admin_username VARCHAR(255) NULL,
        action VARCHAR(100) NOT NULL,
        target_user_id INT NULL,
        target_username VARCHAR(255) NULL,
        resource_type VARCHAR(50) NULL,
        resource_id VARCHAR(50) NULL,
        details TEXT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        session_id VARCHAR(255) NULL,
        status ENUM('success', 'failed', 'error') DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_user_id (admin_user_id),
        INDEX idx_admin_username (admin_username),
        INDEX idx_target_user_id (target_user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status),
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(createAdminLogsTableSQL);
    console.log("✅ Created admin_activity_logs table");

    // Insert some sample log entries to demonstrate the structure
    const sampleLogs = [
      {
        action: 'system_initialization',
        details: 'Logging system initialized',
        status: 'success'
      }
    ];

    for (const log of sampleLogs) {
      await connection.execute(
        `INSERT INTO user_activity_logs (action, details, status) VALUES (?, ?, ?)`,
        [log.action, log.details, log.status]
      );
    }

    console.log("✅ Added sample log entries");
    console.log("🎉 Logging system setup completed successfully!");

    // Show table structure
    const [columns] = await connection.execute("DESCRIBE user_activity_logs");
    console.log("\n📋 user_activity_logs table structure:");
    console.log("Column | Type | Null | Key | Default");
    console.log("-".repeat(50));
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(15)} | ${col.Type.padEnd(20)} | ${col.Null.padEnd(4)} | ${col.Key.padEnd(3)} | ${col.Default || 'NULL'}`);
    });

  } catch (error) {
    console.error("❌ Error creating logs table:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed");
    }
  }
}

createLogsTable();