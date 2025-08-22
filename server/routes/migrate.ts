import { Request, Response } from "express";
import { dbQuery, dbRun } from "../config/database";

export async function migrateCategories(req: Request, res: Response) {
  try {
    // Create the table if it doesn't exist
    await dbRun(`
      CREATE TABLE IF NOT EXISTS user_registration_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        registration_id INT NOT NULL,
        category_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES user_registrations(id),
        FOREIGN KEY (category_id) REFERENCES product_categories(id),
        UNIQUE (registration_id, category_id)
      ) ENGINE=InnoDB
    `);

    // Find registrations that don't have entries in user_registration_categories
    const registrations = await dbQuery(`
      SELECT ur.id, ur.product_category_id
      FROM user_registrations ur
      LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
      WHERE urc.registration_id IS NULL AND ur.product_category_id IS NOT NULL
    `);


    let migratedCount = 0;
    const errors = [];

    // Insert missing entries
    for (const reg of registrations) {
      try {
        await dbRun(
          "INSERT IGNORE INTO user_registration_categories (registration_id, category_id) VALUES (?, ?)",
          [reg.id, reg.product_category_id],
        );
       
        migratedCount++;
      } catch (error) {
        console.error(
          `❌ Failed to migrate registration ${reg.id}:`,
          error.message,
        );
        errors.push({ registrationId: reg.id, error: error.message });
      }
    }

    res.json({
      message: "Migration completed",
      totalFound: registrations.length,
      migrated: migratedCount,
      errors: errors,
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    res.status(500).json({ error: "Migration failed", details: error.message });
  }
}
