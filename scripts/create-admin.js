const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "193.203.184.233",
  user: process.env.DB_USER || "u207346834_gi",
  password: process.env.DB_PASSWORD || "GiDB25@!",
  database: process.env.DB_NAME || "u207346834_gi",
};

async function createAdminUser() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Add role column to users table if it doesn't exist
    try {
      await connection.execute(
        'ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT "user"',
      );
      console.log("✅ Added role column to users table");
    } catch (error) {
      if (error.code === "ER_DUP_FIELDNAME") {
        console.log("✅ Role column already exists");
      } else {
        console.log("❌ Error adding role column:", error.message);
      }
    }

    // Create admin user (username: admin, password: admin123)
    try {
      await connection.execute(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = "admin"',
        ["admin", "admin123", "admin@gi.com", "admin"],
      );
      console.log("✅ Admin user created/updated successfully");
      console.log("   Username: admin");
      console.log("   Password: admin123");
    } catch (error) {
      console.log("❌ Error creating admin user:", error.message);
    }
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdminUser();
