const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  try {

    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });


    // Create database
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'gi_registration'}`);

    // Create a test user for login
    await connection.execute(`USE ${process.env.DB_NAME || 'gi_registration'}`);
    
    // Check if default user exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );

    if (existingUsers.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.execute(
        'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin@gi-registration.com']
      );
      
    } else {
    }

    await connection.end();
    
    

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    process.exit(1);
  }
}

setupDatabase();
