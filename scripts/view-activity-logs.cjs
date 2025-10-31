const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "193.203.184.233",
  user: process.env.DB_USER || "u207346834_gi",
  password: process.env.DB_PASSWORD || "GiDB25@!",
  database: process.env.DB_NAME || "u207346834_gi",
};

async function viewRecentLogs() {
  let connection;
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 20;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    console.log(`\n📊 RECENT USER ACTIVITY LOGS (Last ${limit}):`);
    console.log("=" .repeat(100));
    
    const userLogs = await connection.execute(`
      SELECT 
        id,
        COALESCE(username, 'Anonymous') as username,
        action,
        resource_type,
        resource_id,
        details,
        status,
        ip_address,
        created_at
      FROM user_activity_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);

    if (userLogs[0].length === 0) {
      console.log("   No user activity logs found");
    } else {
      console.log(`   ID | Username | Action | Resource | Status | IP | Time | Details`);
      console.log("-".repeat(100));
      userLogs[0].forEach(log => {
        const time = new Date(log.created_at).toLocaleString();
        const resource = log.resource_type ? `${log.resource_type}:${log.resource_id || 'N/A'}` : 'N/A';
        const details = (log.details || '').substring(0, 30) + (log.details && log.details.length > 30 ? '...' : '');
        console.log(`   ${log.id.toString().padEnd(3)} | ${log.username.padEnd(10)} | ${log.action.padEnd(15)} | ${resource.padEnd(15)} | ${log.status.padEnd(7)} | ${(log.ip_address || 'N/A').padEnd(15)} | ${time} | ${details}`);
      });
    }

    console.log(`\n👨‍💼 RECENT ADMIN ACTIVITY LOGS (Last ${limit}):`);
    console.log("=" .repeat(120));
    
    const adminLogs = await connection.execute(`
      SELECT 
        id,
        COALESCE(admin_username, 'Anonymous') as admin_username,
        action,
        COALESCE(target_username, 'N/A') as target_username,
        resource_type,
        resource_id,
        details,
        status,
        ip_address,
        created_at
      FROM admin_activity_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);

    if (adminLogs[0].length === 0) {
      console.log("   No admin activity logs found");
    } else {
      console.log(`   ID | Admin | Action | Target | Resource | Status | IP | Time | Details`);
      console.log("-".repeat(120));
      adminLogs[0].forEach(log => {
        const time = new Date(log.created_at).toLocaleString();
        const resource = log.resource_type ? `${log.resource_type}:${log.resource_id || 'N/A'}` : 'N/A';
        const details = (log.details || '').substring(0, 25) + (log.details && log.details.length > 25 ? '...' : '');
        console.log(`   ${log.id.toString().padEnd(3)} | ${log.admin_username.padEnd(8)} | ${log.action.padEnd(15)} | ${log.target_username.padEnd(10)} | ${resource.padEnd(15)} | ${log.status.padEnd(7)} | ${(log.ip_address || 'N/A').padEnd(15)} | ${time} | ${details}`);
      });
    }

    // Show activity summary
    const [userCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM user_activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );
    const [adminCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM admin_activity_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );
    const [loginCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM user_activity_logs WHERE action LIKE '%login%' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );
    const [errorCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM user_activity_logs WHERE status = 'error' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
    );

    console.log("\n📈 ACTIVITY SUMMARY (Last 24 Hours):");
    console.log("=" .repeat(50));
    console.log(`   User Activities: ${userCount[0].count}`);
    console.log(`   Admin Activities: ${adminCount[0].count}`);
    console.log(`   Login Attempts: ${loginCount[0].count}`);
    console.log(`   Errors: ${errorCount[0].count}`);

    // Show most active users
    const [activeUsers] = await connection.execute(`
      SELECT 
        username,
        COUNT(*) as activity_count
      FROM user_activity_logs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
        AND username IS NOT NULL
      GROUP BY username 
      ORDER BY activity_count DESC 
      LIMIT 5
    `);

    if (activeUsers[0] && activeUsers[0].length > 0) {
      console.log("\n🏆 MOST ACTIVE USERS (Last 24 Hours):");
      console.log("=" .repeat(40));
      activeUsers[0].forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username}: ${user.activity_count} activities`);
      });
    }

  } catch (error) {
    console.error("❌ Error viewing logs:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n🔌 Database connection closed");
    }
  }
}

console.log(`
📋 Activity Logs Viewer
Usage: node view-activity-logs.cjs [limit]
  limit: Number of recent logs to show (default: 20)

Current settings: showing last ${process.argv[2] || 20} logs
`);

viewRecentLogs();