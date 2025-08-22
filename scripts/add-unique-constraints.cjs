const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

async function addUniqueConstraintsMySQL() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gi_registration',
    });

    console.log('🔧 Adding unique constraints to MySQL database...');

    // Check if constraints already exist
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_registrations' 
      AND CONSTRAINT_TYPE = 'UNIQUE'
    `, [process.env.DB_NAME || 'gi_registration']);

    const existingConstraints = constraints.map(c => c.CONSTRAINT_NAME);

    // Add unique constraint for aadhar_number if not exists
    if (!existingConstraints.includes('unique_aadhar_number')) {
      try {
        await connection.execute(`
          ALTER TABLE user_registrations 
          ADD CONSTRAINT unique_aadhar_number UNIQUE (aadhar_number)
        `);
        console.log('✅ Added unique constraint for aadhar_number');
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log('❌ Cannot add unique constraint for aadhar_number: duplicate entries exist');
          console.log('   Please clean up duplicate Aadhar numbers first');
        } else {
          console.log('❌ Error adding aadhar_number constraint:', error.message);
        }
      }
    }

    // Add unique constraint for voter_id if not exists
    if (!existingConstraints.includes('unique_voter_id')) {
      try {
        await connection.execute(`
          ALTER TABLE user_registrations 
          ADD CONSTRAINT unique_voter_id UNIQUE (voter_id)
        `);
        console.log('✅ Added unique constraint for voter_id');
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log('❌ Cannot add unique constraint for voter_id: duplicate entries exist');
          console.log('   Please clean up duplicate Voter IDs first');
        } else {
          console.log('❌ Error adding voter_id constraint:', error.message);
        }
      }
    }

    await connection.end();
    console.log('✅ MySQL unique constraints migration completed');

  } catch (error) {
    console.error('❌ MySQL migration failed:', error);
  }
}

async function addUniqueConstraintsSQLite() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(process.cwd(), 'data', 'gi_registration.db');
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.log('SQLite database not found, skipping SQLite migration');
        resolve();
        return;
      }

      console.log('🔧 Adding unique constraints to SQLite database...');
      
      // SQLite doesn't support adding constraints to existing tables
      // We need to recreate the table with constraints
      db.serialize(() => {
        // Create new table with constraints
        db.run(`
          CREATE TABLE IF NOT EXISTS user_registrations_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
            phone TEXT NOT NULL,
            email TEXT,
            aadhar_number TEXT NOT NULL UNIQUE,
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
        `, (err) => {
          if (err) {
            console.error('❌ Error creating new table:', err);
            reject(err);
            return;
          }

          // Copy data from old table to new table
          db.run(`
            INSERT OR IGNORE INTO user_registrations_new 
            SELECT * FROM user_registrations
          `, (err) => {
            if (err) {
              console.error('❌ Error copying data:', err);
              reject(err);
              return;
            }

            // Drop old table and rename new table
            db.run('DROP TABLE user_registrations', (err) => {
              if (err) {
                console.error('❌ Error dropping old table:', err);
                reject(err);
                return;
              }

              db.run('ALTER TABLE user_registrations_new RENAME TO user_registrations', (err) => {
                if (err) {
                  console.error('❌ Error renaming table:', err);
                  reject(err);
                  return;
                }

                console.log('✅ SQLite unique constraints migration completed');
                db.close();
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

async function main() {
  console.log('🚀 Starting unique constraints migration...');
  
  // Try MySQL first
  await addUniqueConstraintsMySQL();
  
  // Then SQLite
  await addUniqueConstraintsSQLite();
  
  console.log('✅ Migration completed');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addUniqueConstraintsMySQL, addUniqueConstraintsSQLite };
