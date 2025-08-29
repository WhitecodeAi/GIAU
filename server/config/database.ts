import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { getSQLiteDB, initializeSQLite } from "./sqlite-database";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "193.203.184.233",
  user: process.env.DB_USER || "u207346834_gi",
  password: process.env.DB_PASSWORD || "GiDB25@!",
  database: process.env.DB_NAME || "u207346834_gi",
  waitForConnections: true,
  connectionLimit: 20, // Increased from 10
  queueLimit: 0,
  acquireTimeout: 60000, // 60 seconds
  timeout: 60000, // 60 seconds
  idleTimeout: 300000, // 5 minutes
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};



// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Monitor pool status and cleanup
setInterval(() => {
  console.log("Pool status:", {
    allConnections: (pool as any)._allConnections?.length || 0,
    freeConnections: (pool as any)._freeConnections?.length || 0,
    acquiringConnections: (pool as any)._acquiringConnections?.length || 0,
  });
}, 30000); // Log every 30 seconds

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database pool...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Closing database pool...");
  await pool.end();
  process.exit(0);
});

// Database type detection
let useMySQL = true;
export function isUsingMySQL() {
  return useMySQL;
}
export function setDatabaseType(useMysql: boolean) {
  useMySQL = useMysql;
}

// Test database connection with retry for MySQL
export async function testConnection() {
  // For development, prefer SQLite for easier setup
  // if (process.env.NODE_ENV !== "production" && !process.env.FORCE_MYSQL) {
  //   console.log("🔧 Development mode: using SQLite database");
  //   useMySQL = false;
  //   try {
  //     await initializeSQLite();
  //     console.log("✅ SQLite database initialized successfully");
  //     return true;
  //   } catch (sqliteError) {
  //     console.error("❌ SQLite initialization failed:", sqliteError);
  //     // Fall back to MySQL if SQLite fails
  //   }
  // }

  // Try MySQL first with multiple attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const connection = await pool.getConnection();
      connection.release();
      useMySQL = true;
      // Ensure required tables exist in MySQL
      await ensureMySQLSchema();
      return true;
    } catch (error) {
      console.log(
        `❌ MySQL connection attempt ${attempt}/3 failed:`,
        (error as any).message,
      );
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
  }

  // No SQLite fallback: enforce MySQL-only mode
  // If MySQL connection fails after retries, report failure
  return false;
}

// Query throttling to prevent connection exhaustion
let activeQueries = 0;
const MAX_CONCURRENT_QUERIES = 15;

async function waitForQuerySlot(): Promise<void> {
  while (activeQueries >= MAX_CONCURRENT_QUERIES) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function ensureMySQLSchema() {
  if (!useMySQL) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_registration_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        registration_id INT NOT NULL,
        category_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (registration_id, category_id),
        FOREIGN KEY (registration_id) REFERENCES user_registrations(id),
        FOREIGN KEY (category_id) REFERENCES product_categories(id)
      ) ENGINE=InnoDB
    `);
  } catch (e) {
    console.error("Failed ensuring MySQL schema:", e);
  }
}

// Database query wrapper with throttling
export async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  await waitForQuerySlot();
  activeQueries++;

  try {
    if (useMySQL) {
      const [rows] = (await pool.execute(sql, params)) as any;
      return rows;
    } else {
      const db = getSQLiteDB();
      return await db.query(sql, params);
    }
  } finally {
    activeQueries--;
  }
}

export async function dbRun(
  sql: string,
  params: any[] = [],
): Promise<{ insertId: number; affectedRows: number }> {
  await waitForQuerySlot();
  activeQueries++;

  try {
    if (useMySQL) {
      const [result] = (await pool.execute(sql, params)) as any;
      return {
        insertId: result.insertId || 0,
        affectedRows: result.affectedRows || 0,
      };
    } else {
      const db = getSQLiteDB();
      const result = await db.run(sql, params);
      return { insertId: result.lastID, affectedRows: result.changes };
    }
  } finally {
    activeQueries--;
  }
}
