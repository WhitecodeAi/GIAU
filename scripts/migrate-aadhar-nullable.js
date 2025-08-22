const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(process.cwd(), "gi_registration.sqlite");

function migrateDatabase() {
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    console.log("🔧 Starting migration to make aadhar_number nullable...");

    // Check if table exists first
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_registrations'",
      (err, row) => {
        if (err) {
          console.error("❌ Error checking for table:", err);
          return;
        }

        if (!row) {
          console.log(
            "✅ Table does not exist yet - schema will be created correctly",
          );
          db.close();
          return;
        }

        // Create new table structure with nullable aadhar_number
        db.run(
          `
        CREATE TABLE user_registrations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          age INTEGER NOT NULL,
          gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
          phone TEXT NOT NULL,
          email TEXT,
          aadhar_number TEXT UNIQUE,
          voter_id TEXT UNIQUE,
          pan_number TEXT,
          product_category_id INTEGER,
          area_of_production TEXT,
          annual_production TEXT,
          annual_turnover TEXT,
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
      `,
          (err) => {
            if (err) {
              console.error("❌ Error creating new table:", err);
              return;
            }

            // Copy existing data
            db.run(
              `
          INSERT INTO user_registrations_new 
          SELECT * FROM user_registrations
        `,
              (err) => {
                if (err) {
                  console.error("❌ Error copying data:", err);
                  return;
                }

                // Drop old table
                db.run("DROP TABLE user_registrations", (err) => {
                  if (err) {
                    console.error("❌ Error dropping old table:", err);
                    return;
                  }

                  // Rename new table
                  db.run(
                    "ALTER TABLE user_registrations_new RENAME TO user_registrations",
                    (err) => {
                      if (err) {
                        console.error("❌ Error renaming table:", err);
                        return;
                      }

                      console.log("✅ Successfully migrated database schema");
                      console.log(
                        "✅ aadhar_number is now nullable - registrations with only Voter ID are supported",
                      );

                      db.close();
                    },
                  );
                });
              },
            );
          },
        );
      },
    );
  });
}

migrateDatabase();
