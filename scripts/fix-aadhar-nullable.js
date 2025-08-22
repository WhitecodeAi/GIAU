const { dbRun } = require("../server/config/database.ts");

async function fixAadharNullable() {
  try {
    console.log("🔧 Making aadhar_number column nullable...");

    // For SQLite, we need to recreate the table structure
    await dbRun(`
      CREATE TABLE user_registrations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        aadhar_number TEXT UNIQUE,
        voter_id TEXT UNIQUE,
        pan_number TEXT,
        product_category_id INTEGER NOT NULL,
        area_of_production TEXT,
        annual_production TEXT,
        annual_turnover REAL,
        turnover_unit TEXT DEFAULT 'lakh',
        years_of_production TEXT,
        aadhar_card_path TEXT,
        pan_card_path TEXT,
        proof_of_production_path TEXT,
        signature_path TEXT,
        photo_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_category_id) REFERENCES product_categories(id)
      )
    `);

    // Copy existing data
    await dbRun(`
      INSERT INTO user_registrations_new 
      SELECT * FROM user_registrations
    `);

    // Drop old table and rename new one
    await dbRun("DROP TABLE user_registrations");
    await dbRun(
      "ALTER TABLE user_registrations_new RENAME TO user_registrations",
    );

    console.log("✅ Successfully made aadhar_number nullable");
    console.log(
      "✅ Database schema updated - registrations with only Voter ID are now supported",
    );
  } catch (error) {
    console.error("❌ Failed to update database schema:", error);
  }
}

fixAadharNullable();
