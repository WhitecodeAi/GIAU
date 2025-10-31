const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "193.203.184.233",
  user: process.env.DB_USER || "u207346834_gi",
  password: process.env.DB_PASSWORD || "GiDB25@!",
  database: process.env.DB_NAME || "u207346834_gi",
};

async function viewSoftDeletedRecords() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    console.log("\n🗂️  SOFT-DELETED USERS:");
    console.log("=" .repeat(60));
    
    const softDeletedUsers = await connection.execute(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.deleted_at,
        COUNT(ur.id) as deleted_registrations_count
      FROM users u
      LEFT JOIN user_registrations ur ON u.id = ur.user_id AND ur.deleted_at IS NOT NULL
      WHERE u.deleted_at IS NOT NULL
      GROUP BY u.id, u.username, u.email, u.deleted_at
      ORDER BY u.deleted_at DESC
    `);

    if (softDeletedUsers[0].length === 0) {
      console.log("   No soft-deleted users found");
    } else {
      console.log(`   ID | Username | Email | Deleted At | Registrations`);
      console.log("-".repeat(60));
      softDeletedUsers[0].forEach(user => {
        const deletedAt = new Date(user.deleted_at).toLocaleString();
        console.log(`   ${user.id.toString().padEnd(3)} | ${user.username.padEnd(12)} | ${user.email.padEnd(20)} | ${deletedAt} | ${user.deleted_registrations_count}`);
      });
    }

    console.log("\n📋 SOFT-DELETED REGISTRATIONS:");
    console.log("=" .repeat(80));
    
    const softDeletedRegistrations = await connection.execute(`
      SELECT 
        ur.id,
        ur.name,
        ur.phone,
        ur.deleted_at,
        u.username as user_username,
        u.deleted_at as user_deleted_at
      FROM user_registrations ur
      JOIN users u ON ur.user_id = u.id
      WHERE ur.deleted_at IS NOT NULL
      ORDER BY ur.deleted_at DESC
      LIMIT 20
    `);

    if (softDeletedRegistrations[0].length === 0) {
      console.log("   No soft-deleted registrations found");
    } else {
      console.log(`   ID | Name | Phone | User | Deleted At`);
      console.log("-".repeat(80));
      softDeletedRegistrations[0].forEach(reg => {
        const deletedAt = new Date(reg.deleted_at).toLocaleString();
        const userStatus = reg.user_deleted_at ? "(user also deleted)" : "(user active)";
        console.log(`   ${reg.id.toString().padEnd(4)} | ${reg.name.padEnd(15)} | ${reg.phone.padEnd(13)} | ${reg.user_username.padEnd(12)} ${userStatus} | ${deletedAt}`);
      });
      
      if (softDeletedRegistrations[0].length === 20) {
        console.log("   ... (showing first 20 records)");
      }
    }

    // Summary statistics
    const [userCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NOT NULL"
    );
    const [regCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM user_registrations WHERE deleted_at IS NOT NULL"
    );
    const [oldUserCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    const [oldRegCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM user_registrations WHERE deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );

    console.log("\n📊 SUMMARY:");
    console.log("=" .repeat(40));
    console.log(`   Total soft-deleted users: ${userCount[0].count}`);
    console.log(`   Total soft-deleted registrations: ${regCount[0].count}`);
    console.log(`   Users older than 30 days: ${oldUserCount[0].count}`);
    console.log(`   Registrations older than 30 days: ${oldRegCount[0].count}`);

    if (oldUserCount[0].count > 0 || oldRegCount[0].count > 0) {
      console.log("\n💡 TIP: Run cleanup script to permanently remove old records:");
      console.log("   node scripts/cleanup-soft-deleted.cjs 30");
    }

  } catch (error) {
    console.error("❌ Error viewing soft-deleted records:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n🔌 Database connection closed");
    }
  }
}

console.log("🔍 Viewing Soft-Deleted Records");
viewSoftDeletedRecords();