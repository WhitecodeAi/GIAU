import { Request, Response } from "express";
import { dbQuery } from "../config/database";

export async function getProductCategories(req: Request, res: Response) {
  try {
    const rows = await dbQuery(
      "SELECT id, name, description FROM product_categories ORDER BY name",
    );

    res.json({
      categories: rows,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProducts(req: Request, res: Response) {
  try {
    const { category_id } = req.query;

    let query = `
      SELECT p.id, p.name, p.description, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
    `;
    let params: any[] = [];

    if (category_id) {
      query += " WHERE p.category_id = ?";
      params.push(category_id);
    }

    query += " ORDER BY p.name";

    const rows = await dbQuery(query, params);

    res.json({
      products: rows,
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProductsByCategories(req: Request, res: Response) {
  try {
    const { categoryIds } = req.query;

    if (!categoryIds) {
      return res.json({ products: [] });
    }

    // Handle both array and single value
    const categoryIdArray = Array.isArray(categoryIds)
      ? categoryIds
      : [categoryIds];

    if (categoryIdArray.length === 0) {
      return res.json({ products: [] });
    }

    // Create placeholders for parameterized query
    const placeholders = categoryIdArray.map(() => "?").join(",");

    const query = `
      SELECT p.id, p.name, p.description, p.category_id, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.category_id IN (${placeholders})
      ORDER BY pc.name, p.name
    `;

    const rows = await dbQuery(query, categoryIdArray);

    res.json({
      products: rows,
    });
  } catch (error) {
    console.error("Get products by categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getExistingProducts(req: Request, res: Response) {
  try {
    // Get products that have been registered by users with category information
    const rows = await dbQuery(`
      SELECT DISTINCT p.id, p.name, p.category_id, pc.name as category_name,
             COUNT(uep.product_id) as registration_count
      FROM products p
      LEFT JOIN user_existing_products uep ON p.id = uep.product_id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      GROUP BY p.id, p.name, p.category_id, pc.name
      HAVING COUNT(uep.product_id) > 0
      ORDER BY registration_count DESC, p.name
    `);

    // If no existing products, return some default ones for demo with categories
    const existingProducts =
      rows.length > 0
        ? rows
        : [
            {
              id: 10,
              name: "Bodo Gongar Dunja",
              category_id: 1,
              category_name: "Traditional Textiles",
              registration_count: 5,
            },
            {
              id: 11,
              name: "Bodo Keradapini",
              category_id: 1,
              category_name: "Traditional Textiles",
              registration_count: 3,
            },
            {
              id: 12,
              name: "Bodo Aronai",
              category_id: 1,
              category_name: "Traditional Textiles",
              registration_count: 4,
            },
            {
              id: 13,
              name: "Bodo Dokhona",
              category_id: 1,
              category_name: "Traditional Textiles",
              registration_count: 6,
            },
            {
              id: 14,
              name: "Bodo Eri Silk / Bodo Indi Silk",
              category_id: 2,
              category_name: "Silk Products",
              registration_count: 8,
            },
            {
              id: 15,
              name: "Bodo Gamus",
              category_id: 1,
              category_name: "Traditional Textiles",
              registration_count: 2,
            },
            {
              id: 16,
              name: "Bodo Jomgra",
              category_id: 3,
              category_name: "Handicrafts",
              registration_count: 3,
            },
          ];

    res.json({
      existingProducts,
    });
  } catch (error) {
    console.error("Get existing products error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProductStatistics(req: Request, res: Response) {
  try {
    // Get total product categories
    const totalCategories = await dbQuery(
      "SELECT COUNT(*) as count FROM product_categories",
    );

    // Get total products
    const totalProducts = await dbQuery(
      "SELECT COUNT(*) as count FROM products",
    );

    // Get products by category for additional info
    const productsByCategory = await dbQuery(`
      SELECT pc.name as category_name, COUNT(p.id) as product_count
      FROM product_categories pc
      LEFT JOIN products p ON pc.id = p.category_id
      GROUP BY pc.id, pc.name
      ORDER BY product_count DESC
    `);

    res.json({
      totalCategories: totalCategories[0]?.count || 0,
      totalProducts: totalProducts[0]?.count || 0,
      productsByCategory: productsByCategory || [],
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
