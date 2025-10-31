const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "193.203.184.233",
  user: process.env.DB_USER || "u207346834_gi",
  password: process.env.DB_PASSWORD || "GiDB25@!",
  database: process.env.DB_NAME || "u207346834_gi",
};

async function addSoftDeleteColumns() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to database");

    // Add deleted_at column to users table
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
      `);
      console.log("✅ Added deleted_at column to users table");
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log("ℹ️ deleted_at column already exists in users table");
      } else {
        throw error;
      }
    }

    // Add deleted_at column to user_registrations table
    try {
      await connection.execute(`
        ALTER TABLE user_registrations 
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
      `);
      console.log("✅ Added deleted_at column to user_registrations table");
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log("ℹ️ deleted_at column already exists in user_registrations table");
      } else {
        throw error;
      }
    }

    // Add indexes for better performance on soft delete queries
    try {
      await connection.execute(`
        CREATE INDEX idx_users_deleted_at ON users(deleted_at)
      `);
      console.log("✅ Added index on users.deleted_at");
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log("ℹ️ Index on users.deleted_at already exists");
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_user_registrations_deleted_at ON user_registrations(deleted_at)
      `);
      console.log("✅ Added index on user_registrations.deleted_at");
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log("ℹ️ Index on user_registrations.deleted_at already exists");
      } else {
        throw error;
      }
    }

    console.log("🎉 Soft delete migration completed successfully!");

  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed");
    }
  }
}

addSoftDeleteColumns();