import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { dbQuery, dbRun } from "../config/database";
import { generateToken } from "../middleware/auth";

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
   
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Find user in database
    const rows = await dbQuery(
      "SELECT id, username, password, role FROM users WHERE username = ?",
      [username],
    );

     console.log("ff",rows);


    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];

    // Verify password
    const isValidPassword = password === user.password;
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role || "user",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || "user",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Check if user already exists
    const existingUser = await dbQuery(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await dbRun(
      "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, email, "user"],
    );

    // Generate JWT token
    const token = generateToken({
      id: result.insertId,
      username,
      role: "user",
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: result.insertId,
        username,
        role: "user",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function verifyToken(req: Request, res: Response) {
  try {
    // If we reach here, the token is valid (middleware checked it)
    res.json({ message: "Token is valid", user: (req as any).user });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
