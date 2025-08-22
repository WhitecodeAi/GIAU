import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { handleDemo } from "./routes/demo";
import { testConnection } from "./config/database";
import { authenticateToken } from "./middleware/auth";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auth routes
import { login, register, verifyToken } from "./routes/auth";

// Product routes
import {
  getProductCategories,
  getProducts,
  getProductsByCategories,
  getExistingProducts,
  getProductStatistics,
} from "./routes/products";

// Registration routes
import {
  createRegistration,
  createAdditionalRegistration,
  getUserRegistrations,
  getAllRegistrations,
  getRegistrationById,
  generateReport,
  verifyRegistration,
} from "./routes/registrations";

// User routes
import {
  getUserCount,
  getAllUsers,
  getUserRegistrations as getUserRegistrationsByUserId,
  getUserById,
  getUsersForDropdown,
} from "./routes/users";

// Dashboard routes
import {
  getDashboardStatistics,
  getDashboardActivity,
} from "./routes/dashboard";

// Migration routes
import { migrateCategories } from "./routes/migrate";

// File routes
import {
  serveFile,
  downloadFile,
  getFileInfo,
  getStorageStats,
} from "./routes/files";

// Verification routes
import { checkUserRegistration } from "./routes/verification";

// Setup routes
import { setupAdmin } from "./routes/setup";

// Export routes
import {
  exportProducerCards,
  exportUsersWithDateRange,
  exportRegistrationsByUser,
  exportUsersByProducts,
} from "./routes/export";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Serve uploaded files statically - nginx handles this in production, Express in development
  app.use("/uploads", express.static("/var/www/GI"));

  // Test routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Setup routes (run once to create admin user)
  app.post("/api/setup-admin", setupAdmin);

  // Auth routes
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.get("/api/auth/verify", authenticateToken, verifyToken);

  // Verification routes (public)
  app.post("/api/verify-user", checkUserRegistration);

  // Product routes (public)
  app.get("/api/products/categories", getProductCategories);
  app.get("/api/products/by-categories", getProductsByCategories);
  app.get("/api/products", getProducts);
  app.get("/api/products/existing", getExistingProducts);
  app.get("/api/products/statistics", getProductStatistics);

  // Simple multer configuration for file uploads (no restrictions)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (generous)
  });

  // Registration routes (protected)
  app.post("/api/registrations/verify", verifyRegistration); // Public verification endpoint
  app.post(
    "/api/registrations",
    authenticateToken,
    upload.fields([
      { name: "aadharCard", maxCount: 1 },
      { name: "panCard", maxCount: 1 },
      { name: "proofOfProduction", maxCount: 1 },
      { name: "signature", maxCount: 1 },
      { name: "photo", maxCount: 1 },
    ]),
    createRegistration,
  );
  app.post(
    "/api/registrations/additional",
    authenticateToken,
    createAdditionalRegistration,
  );
  app.get("/api/registrations/user", authenticateToken, getUserRegistrations);
  app.get("/api/registrations/all", getAllRegistrations); // Admin route
  app.get("/api/registrations/report", generateReport); // Admin route
  app.post("/api/registrations/export", exportProducerCards); // Admin route
  app.post("/api/users/export", exportUsersWithDateRange); // Admin route for user export
  app.post("/api/registrations/export-by-user", exportRegistrationsByUser); // Admin route for user-specific export
  app.post("/api/users/export-by-products", exportUsersByProducts); // Admin route for product-wise export
  app.get("/api/registrations/:id", getRegistrationById);

  // User routes (admin)
  app.get("/api/users/count", getUserCount);
  app.get("/api/users", authenticateToken, getAllUsers);
  app.get("/api/users/dropdown",  getUsersForDropdown);
  app.get("/api/users/:userId", authenticateToken, getUserById);
  app.get(
    "/api/users/:userId/registrations",
    authenticateToken,
    getUserRegistrationsByUserId,
  );

  // Dashboard routes
  app.get("/api/dashboard/statistics", getDashboardStatistics);
  app.get("/api/dashboard/activity", getDashboardActivity);

  // Migration routes (admin)
  app.post("/api/migrate/categories", migrateCategories);

  // File serving routes
  app.get("/api/files/:registrationId/:filename", serveFile);
  app.get("/api/files/:registrationId/:filename/download", downloadFile);
  app.get("/api/files/:registrationId/:filename/info", getFileInfo);
  app.get(
    "/api/files/:registrationId/stats",
    authenticateToken,
    getStorageStats,
  );

  // Initialize database
  testConnection()
    .then(() => {
      console.log("✅ Database connection established");
    })
    .catch((error) => {
      console.error("❌ Database initialization failed:", error);
    });

  return app;
}
