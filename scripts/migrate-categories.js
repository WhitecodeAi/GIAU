const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "193.203.184.233",
  user: process.env.DB_USER || "u207346834_gi",
  password: process.env.DB_PASSWORD || "GiDB25@!",
  database: process.env.DB_NAME || "u207346834_gi",
};

async function migrateCategories() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Create the table if it doesn't exist
    await connection.execute(`
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
    const [registrations] = await connection.execute(`
      SELECT ur.id, ur.product_category_id
      FROM user_registrations ur
      LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
      WHERE urc.registration_id IS NULL AND ur.product_category_id IS NOT NULL
    `);


    // Insert missing entries
    for (const reg of registrations) {
      try {
        await connection.execute(
          "INSERT IGNORE INTO user_registration_categories (registration_id, category_id) VALUES (?, ?)",
          [reg.id, reg.product_category_id],
        );
        
      } catch (error) {
        console.error(
          `❌ Failed to migrate registration ${reg.id}:`,
          error.message,
        );
      }
    }

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
migrateCategories();
