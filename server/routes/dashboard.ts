import { Request, Response } from "express";
import { dbQuery } from "../config/database";

export async function getDashboardStatistics(req: Request, res: Response) {
  try {
   

    // Get total registrations
    const totalRegistrationsResult = await dbQuery(
      "SELECT COUNT(*) as count FROM user_registrations",
    );
    const totalRegistrations = totalRegistrationsResult[0]?.count || 0;
  

    // Get total users
    const totalUsersResult = await dbQuery(
      "SELECT COUNT(*) as count FROM users",
    );
    const totalUsers = totalUsersResult[0]?.count || 0;
   

    // Get total products
    const totalProductsResult = await dbQuery(
      "SELECT COUNT(*) as count FROM products",
    );
    const totalProducts = totalProductsResult[0]?.count || 0;

    // Get total production detail rows (applications)
    const totalApplicationsResult = await dbQuery(
      "SELECT COUNT(*) as count FROM user_production_details",
    );
    const totalApplications = totalApplicationsResult[0]?.count || 0;


    // Get total categories
    const totalCategoriesResult = await dbQuery(
      "SELECT COUNT(*) as count FROM product_categories",
    );
    const totalCategories = totalCategoriesResult[0]?.count || 0;


    const dashboardStats = {
      totalRegistrations,
      totalUsers,
      totalProducts,
      totalCategories,
      totalApplications,
    };

  
    res.json(dashboardStats);
  } catch (error) {
    console.error("Get dashboard statistics error:", error);
    res.status(500).json({
      error: "Internal server error",
      totalRegistrations: 0,
      totalUsers: 0,
      totalProducts: 0,
      totalCategories: 0,
    });
  }
}

export async function getDashboardActivity(req: Request, res: Response) {
  try {
    

    // Get recent registrations
    const recentRegistrations = await dbQuery(`
      SELECT 
        ur.id,
        ur.name,
        ur.created_at,
        pc.name as category_name
      FROM user_registrations ur
      LEFT JOIN product_categories pc ON ur.product_category_id = pc.id
      ORDER BY ur.created_at DESC
      LIMIT 10
    `);

    const activityItems = recentRegistrations.map((reg) => ({
      id: reg.id,
      type: "registration",
      message: `New registration by ${reg.name} for ${reg.category_name || "Unknown Category"}`,
      timestamp: reg.created_at,
    }));

    
    res.json(activityItems);
  } catch (error) {
    console.error("Get dashboard activity error:", error);
    res.status(500).json([]);
  }
}
