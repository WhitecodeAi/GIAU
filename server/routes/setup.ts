import { Request, Response } from "express";
import { dbQuery, dbRun } from "../config/database";

export async function setupAdmin(req: Request, res: Response) {
  try {
    // Add role column to users table if it doesn't exist
    try {
      await dbRun(
        'ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT "user"',
      );
      console.log("✅ Added role column to users table");
    } catch (error: any) {
      if (
        error.code === "ER_DUP_FIELDNAME" ||
        error.message?.includes("duplicate column")
      ) {
        console.log("✅ Role column already exists");
      } else {
        console.log("❌ Error adding role column:", error.message);
      }
    }

    // Check if admin user already exists
    const existingAdmin = await dbQuery(
      "SELECT id FROM users WHERE username = ?",
      ["admin"],
    );

    if (existingAdmin.length > 0) {
      // Update existing user to admin role
      await dbRun("UPDATE users SET role = ? WHERE username = ?", [
        "admin",
        "admin",
      ]);
      console.log("✅ Updated existing admin user");
    } else {
      // Create new admin user
      await dbRun(
        "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
        ["admin", "admin123", "admin@gi.com", "admin"],
      );
      console.log("✅ Created new admin user");
    }

    res.json({
      message: "Admin setup completed successfully",
      credentials: {
        username: "admin",
        password: "admin123",
      },
    });
  } catch (error) {
    console.error("❌ Admin setup error:", error);
    res.status(500).json({ error: "Failed to setup admin user" });
  }
}
