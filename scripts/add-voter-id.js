const mysql = require("mysql2/promise");
require("dotenv").config();

async function addVoterIdColumn() {
  try {
    console.log("🔧 Adding voter_id column to user_registrations table...");

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "gi_registration",
    });

    console.log("✅ Connected to database");

    // Add voter_id column if it doesn't exist
    try {
      await connection.execute(`
        ALTER TABLE user_registrations 
        ADD COLUMN voter_id VARCHAR(20) NULL AFTER aadhar_number
      `);
      console.log("✅ Added voter_id column to user_registrations table");
    } catch (error) {
      if (error.code === "ER_DUP_FIELDNAME") {
        console.log("ℹ️  voter_id column already exists");
      } else {
        throw error;
      }
    }

    // Modify aadhar_number to be nullable since now either aadhar or voter_id is required
    try {
      await connection.execute(`
        ALTER TABLE user_registrations 
        MODIFY COLUMN aadhar_number VARCHAR(12) NULL
      `);
      console.log("✅ Modified aadhar_number to allow NULL values");
    } catch (error) {
      console.log(
        "ℹ️  aadhar_number column already allows NULL or modification not needed",
      );
    }

    await connection.end();
    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

addVoterIdColumn();
