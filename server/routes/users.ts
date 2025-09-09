import { Request, Response } from "express";
import { dbQuery } from "../config/database";
import { AuthRequest } from "../middleware/auth";

interface UserWithStats {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_login?: string;
  total_registrations: number;
  latest_registration_date?: string;
}

interface UserRegistration {
  id: number;
  name: string;
  address: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  aadhar_number?: string;
  voter_id?: string;
  pan_number?: string;
  category_names: string;
  production_summary?: string;
  created_at: string;
  documentUrls: {
    aadharCard?: string;
    panCard?: string;
    proofOfProduction?: string;
    signature?: string;
    photo?: string;
  };
}

// Get all users with statistics for admin panel
export async function getAllUsers(req: AuthRequest, res: Response) {
  try {

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search as string;

    let whereClause = "";
    let params: any[] = [];

    if (searchTerm) {
      whereClause = "WHERE u.username LIKE ? OR u.email LIKE ?";
      params = [`%${searchTerm}%`, `%${searchTerm}%`];
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;
    const [{ total }] = await dbQuery(countQuery, params);

    // Get users with registration statistics
    const usersQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.created_at,
        u.last_login,
        COUNT(ur.id) as total_registrations,
        MAX(ur.created_at) as latest_registration_date
      FROM users u
      LEFT JOIN user_registrations ur ON u.id = ur.user_id
      ${whereClause}
      GROUP BY u.id, u.username, u.email, u.role, u.created_at, u.last_login
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = await dbQuery(usersQuery, [...params, limit, offset]);

    const formattedUsers: UserWithStats[] = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email || "",
      role: user.role || "user",
      created_at: user.created_at,
      last_login: user.last_login,
      total_registrations: parseInt(user.total_registrations) || 0,
      latest_registration_date: user.latest_registration_date,
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// Get registrations for a specific user
export async function getUserRegistrations(req: AuthRequest, res: Response) {
  try {

    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "Valid user ID is required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // First verify user exists
    const userExists = await dbQuery(
      "SELECT id, username FROM users WHERE id = ?",
      [userId],
    );
    if (userExists.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get total count of registrations for this user
    const [{ total }] = await dbQuery(
      "SELECT COUNT(*) as total FROM user_registrations WHERE user_id = ?",
      [userId],
    );

    // Get registrations with category information
    const registrationsQuery = `
      SELECT 
        ur.*,
        GROUP_CONCAT(DISTINCT pc.name) as category_names
      FROM user_registrations ur
      LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
      LEFT JOIN product_categories pc ON urc.category_id = pc.id
      WHERE ur.user_id = ?
      GROUP BY ur.id
      ORDER BY ur.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const registrations = await dbQuery(registrationsQuery, [
      userId,
      limit,
      offset,
    ]);

    // Format registrations with document URLs
    const formattedRegistrations: UserRegistration[] = await Promise.all(
      registrations.map(async (reg) => {
        // Get production details if any
        let productionSummary = "";
        try {
          const productionDetails = await dbQuery(
            `SELECT product_name, annual_production, unit, area_of_production, years_of_production
             FROM user_production_details WHERE registration_id = ?`,
            [reg.id],
          );

          if (productionDetails.length > 0) {
            productionSummary = productionDetails
              .map(
                (pd) =>
                  `${pd.product_name}: ${pd.annual_production} ${pd.unit}`,
              )
              .join(", ");
          }
        } catch (err) {
          console.error("Error fetching production details:", err);
        }

        return {
          id: reg.id,
          name: reg.name,
          address: reg.address,
          age: reg.age,
          gender: reg.gender,
          phone: reg.phone,
          email: reg.email,
          aadhar_number: reg.aadhar_number,
          voter_id: reg.voter_id,
          pan_number: reg.pan_number,
          category_names: reg.category_names || "",
          production_summary: productionSummary,
          created_at: reg.created_at,
          documentUrls: {
            aadharCard: reg.aadhar_card_path
              ? `/api/files/serve/${reg.aadhar_card_path}`
              : undefined,
            panCard: reg.pan_card_path
              ? `/api/files/serve/${reg.pan_card_path}`
              : undefined,
            proofOfProduction: reg.proof_of_production_path
              ? `/api/files/serve/${reg.proof_of_production_path}`
              : undefined,
            signature: reg.signature_path
              ? `/api/files/serve/${reg.signature_path}`
              : undefined,
            photo: reg.photo_path
              ? `/api/files/serve/${reg.photo_path}`
              : undefined,
          },
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    res.json({
      user: userExists[0],
      registrations: formattedRegistrations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching user registrations:", error);
    res.status(500).json({ error: "Failed to fetch user registrations" });
  }
}

// Get user details by ID
export async function getUserById(req: AuthRequest, res: Response) {
  try {

    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "Valid user ID is required" });
    }

    const users = await dbQuery(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.created_at,
        u.last_login,
        COUNT(ur.id) as total_registrations,
        MAX(ur.created_at) as latest_registration_date
       FROM users u
       LEFT JOIN user_registrations ur ON u.id = ur.user_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email || "",
      role: user.role || "user",
      created_at: user.created_at,
      last_login: user.last_login,
      total_registrations: parseInt(user.total_registrations) || 0,
      latest_registration_date: user.latest_registration_date,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
}

// Get total user count for admin dashboard
export async function getUserCount(req: Request, res: Response) {
  try {
    const [{ total }] = await dbQuery(
      "SELECT COUNT(*) as total FROM users",
      [],
    );

    res.json({ count: total });
  } catch (error) {
    console.error("Error fetching user count:", error);
    res.status(500).json({ error: "Failed to fetch user count" });
  }
}

// Get users for dropdown (id, username, registration count)
export async function getUsersForDropdown(req: Request, res: Response) {
  try {
    // const userRole = req.user?.role;
    // if (userRole !== "admin") {
    //   return res.status(403).json({ error: "Admin access required" });
    // }

    const users = await dbQuery(
      `SELECT
        u.id,
        u.username,
        u.email,
        COUNT(ur.id) as registration_count
       FROM users u
       LEFT JOIN user_registrations ur ON u.id = ur.user_id
       WHERE u.role != 'admin'
       GROUP BY u.id, u.username, u.email
       HAVING registration_count > 0
       ORDER BY registration_count DESC, u.username ASC`,
      []
    );

    res.json({ users });
  } catch (error) {
    console.error("Error fetching users for dropdown:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}
