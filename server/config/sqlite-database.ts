import sqlite3 from "sqlite3";
import { promisify } from "util";
import path from "path";

const dbPath = path.join(process.cwd(), "gi_registration.sqlite");

class SQLiteDatabase {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(dbPath);
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async run(
    sql: string,
    params: any[] = [],
  ): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

let sqliteDB: SQLiteDatabase | null = null;

export function getSQLiteDB(): SQLiteDatabase {
  if (!sqliteDB) {
    sqliteDB = new SQLiteDatabase();
  }
  return sqliteDB;
}

export async function initializeSQLite() {
  const db = getSQLiteDB();

  try {
    // Create tables
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES product_categories(id)
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS user_registrations (
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

    // Add file path columns if they don't exist (for existing databases)
    try {
      await db.run(
        `ALTER TABLE user_registrations ADD COLUMN aadhar_card_path TEXT`,
      );
    } catch (e) {
      /* Column already exists */
    }
    try {
      await db.run(
        `ALTER TABLE user_registrations ADD COLUMN pan_card_path TEXT`,
      );
    } catch (e) {
      /* Column already exists */
    }
    try {
      await db.run(
        `ALTER TABLE user_registrations ADD COLUMN proof_of_production_path TEXT`,
      );
    } catch (e) {
      /* Column already exists */
    }
    try {
      await db.run(
        `ALTER TABLE user_registrations ADD COLUMN signature_path TEXT`,
      );
    } catch (e) {
      /* Column already exists */
    }
    try {
      await db.run(`ALTER TABLE user_registrations ADD COLUMN photo_path TEXT`);
    } catch (e) {
      /* Column already exists */
    }
    try {
      await db.run(
        `ALTER TABLE user_registrations ADD COLUMN turnover_unit TEXT DEFAULT 'lakh'`,
      );
    } catch (e) {
      /* Column already exists */
    }
    try {
      await db.run(
        `ALTER TABLE user_production_details ADD COLUMN turnover_unit TEXT DEFAULT 'lakh'`,
      );
    } catch (e) {
      /* Column already exists */
    }

    await db.run(`
      CREATE TABLE IF NOT EXISTS user_existing_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER,
        product_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES user_registrations(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS user_selected_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER,
        product_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES user_registrations(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS user_production_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        annual_production TEXT NOT NULL,
        unit TEXT NOT NULL,
        area_of_production TEXT NOT NULL,
        years_of_production TEXT NOT NULL,
        annual_turnover TEXT,
        additional_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES user_registrations(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Ensure category junction table exists (used across many queries)
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_registration_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (registration_id, category_id),
        FOREIGN KEY (registration_id) REFERENCES user_registrations(id),
        FOREIGN KEY (category_id) REFERENCES product_categories(id)
      )
    `);

    // Insert default data
    await insertDefaultSQLiteData(db);
  } catch (error) {
    console.error("❌ SQLite initialization failed:", error);
    throw error;
  }
}

async function insertDefaultSQLiteData(db: SQLiteDatabase) {
  try {
    // Insert product categories
    const categories = [
      "Agriculture Products",
      "Beverage Products",
      "Food Products",
      "Musical Instrument Products",
      "Textile Products",
    ];

    for (const category of categories) {
      await db.run(
        "INSERT OR IGNORE INTO product_categories (name) VALUES (?)",
        [category],
      );
    }

    // Insert products
    const products = [
      { name: "Gonggwna", category: "Textile Products" },
      { name: "Bodo Sifung", category: "Textile Products" },
      { name: "Bodo Serza / Bodo Serja", category: "Textile Products" },
      { name: "Bodo Kham", category: "Textile Products" },
      { name: "Bodo Jotha", category: "Textile Products" },
      { name: "Bodo Thorka", category: "Textile Products" },
      { name: "Bodo Dokhona", category: "Textile Products" },
      { name: "Bodo Aronai", category: "Textile Products" },
      { name: "Bodo Gamsa", category: "Textile Products" },
      { name: "Bodo Gongar Dunja", category: "Textile Products" },
      { name: "Bodo Keradapini", category: "Textile Products" },
    ];

    for (const product of products) {
      const categoryResult = await db.query(
        "SELECT id FROM product_categories WHERE name = ?",
        [product.category],
      );

      if (categoryResult.length > 0) {
        await db.run(
          "INSERT OR IGNORE INTO products (name, category_id) VALUES (?, ?)",
          [product.name, categoryResult[0].id],
        );
      }
    }

    // Insert default admin user
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash("admin123", 10);

    await db.run(
      "INSERT OR IGNORE INTO users (username, password, email) VALUES (?, ?, ?)",
      ["admin", hashedPassword, "admin@gi-registration.com"],
    );

    // Insert some sample registrations for demo
    const userResult = await db.query(
      "SELECT id FROM users WHERE username = ?",
      ["admin"],
    );
    if (userResult.length > 0) {
      const userId = userResult[0].id;
      const textileCategoryResult = await db.query(
        "SELECT id FROM product_categories WHERE name = ?",
        ["Textile Products"],
      );

      if (textileCategoryResult.length > 0) {
        const categoryId = textileCategoryResult[0].id;

        // Sample registrations
        const sampleRegistrations = [
          {
            name: "John Doe",
            address: "Village Kokrajhar, Assam, India",
            age: 35,
            gender: "male",
            phone: "9876543210",
            email: "john@example.com",
            aadhar_number: "123456789012",
            pan_number: "ABCDE1234F",
            area_of_production: "Kokrajhar and surrounding areas",
            annual_production: "500 pieces per year",
            annual_turnover: "₹2,50,000",
            years_of_production: "10 years",
          },
          {
            name: "Jane Smith",
            address: "Village Chirang, BTR, Assam",
            age: 28,
            gender: "female",
            phone: "9876543211",
            email: "jane@example.com",
            aadhar_number: "123456789013",
            pan_number: "ABCDE1234G",
            area_of_production: "Chirang district traditional areas",
            annual_production: "800 pieces per year",
            annual_turnover: "₹4,00,000",
            years_of_production: "8 years",
          },
          {
            name: "Ram Kumar",
            address: "Udalguri, BTR, Assam",
            age: 45,
            gender: "male",
            phone: "9876543212",
            email: "ram@example.com",
            aadhar_number: "123456789014",
            pan_number: "ABCDE1234H",
            area_of_production: "Traditional Bodo weaving centers",
            annual_production: "1200 pieces per year",
            annual_turnover: "₹6,00,000",
            years_of_production: "15 years",
          },
          {
            name: "Sita Devi",
            address: "Baksa, BTR, Assam",
            age: 38,
            gender: "female",
            phone: "9876543213",
            email: "sita@example.com",
            aadhar_number: "123456789015",
            pan_number: "ABCDE1234I",
            area_of_production: "Baksa district handloom centers",
            annual_production: "600 pieces per year",
            annual_turnover: "₹3,50,000",
            years_of_production: "12 years",
          },
        ];

        for (const reg of sampleRegistrations) {
          await db.run(
            `
            INSERT OR IGNORE INTO user_registrations (
              user_id, name, address, age, gender, phone, email,
              aadhar_number, pan_number, product_category_id,
              area_of_production, annual_production, annual_turnover, years_of_production
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              userId,
              reg.name,
              reg.address,
              reg.age,
              reg.gender,
              reg.phone,
              reg.email,
              reg.aadhar_number,
              reg.pan_number,
              categoryId,
              reg.area_of_production,
              reg.annual_production,
              reg.annual_turnover,
              reg.years_of_production,
            ],
          );
        }

        // Add some product selections for the sample data
        const registrations = await db.query(
          "SELECT id FROM user_registrations LIMIT 4",
        );
        const products = await db.query(
          "SELECT id, name FROM products LIMIT 5",
        );

        for (const registration of registrations) {
          for (let i = 0; i < 3; i++) {
            if (products[i]) {
              await db.run(
                "INSERT OR IGNORE INTO user_selected_products (registration_id, product_id) VALUES (?, ?)",
                [registration.id, products[i].id],
              );

              // Add production details for the existing products
              await db.run(
                "INSERT OR IGNORE INTO user_existing_products (registration_id, product_id) VALUES (?, ?)",
                [registration.id, products[i].id],
              );

              // Add detailed production information
              const productionInfo = {
                0: { production: "100", unit: "pieces", turnover: "1.5" },
                1: { production: "200", unit: "meters", turnover: "2.0" },
                2: { production: "150", unit: "kg", turnover: "3.5" },
              };

              const info = productionInfo[i] || {
                production: "50",
                unit: "pieces",
                turnover: "1.0",
              };

              await db.run(
                `INSERT OR IGNORE INTO user_production_details (
                  registration_id, product_id, product_name, annual_production,
                  unit, area_of_production, years_of_production, annual_turnover, additional_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  registration.id,
                  products[i].id,
                  products[i].name,
                  info.production,
                  info.unit,
                  "Traditional handloom center",
                  "5",
                  info.turnover,
                  "High quality traditional products",
                ],
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ SQLite default data insertion failed:", error);
  }
}
