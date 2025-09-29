import { Request, Response } from "express";
import { dbQuery, dbRun } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import type { Request, Response } from "express";
import { simpleFileStorage } from "../utils/simpleFileStorage";
import { compressedFileStorage } from "../utils/compressedFileStorage";
import multer from "multer";
import { VerificationRequest, VerificationResponse } from "../../shared/api";

export async function createRegistration(req: AuthRequest, res: Response) {
  try {
    // Debug production details data
    if (req.body.productionDetails) {
    }
    if (req.body.existingProductDetails) {
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Store file data temporarily - will save after registration creation
    let tempFiles: { [key: string]: { originalname: string; buffer: Buffer } } =
      {};

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const file = fileArray[0]; // Take first file only

          tempFiles[fieldName] = {
            originalname: file.originalname,
            buffer: file.buffer,
          };
        }
      }
    } else {
    }

    const {
      // Personal Information
      name,
      address,
      age: ageRaw,
      gender,
      phone,
      email,
      aadharNumber,
      voterId,
      panNumber,

      // Product Information
      productCategoryIds: productCategoryIdsRaw,
      existingProducts: existingProductsRaw,
      selectedProducts: selectedProductsRaw,
      areaOfProduction,
      annualProduction,
      annualTurnover: annualTurnoverRaw,
      turnoverUnit,
      yearsOfProduction,
      productionDetails: productionDetailsRaw,
      existingProductDetails: existingProductDetailsRaw,

      // Additional Information
      additionalInfo,
      isAdditionalRegistration = false, // Flag to allow multiple registrations
    } = req.body;

    // Convert string fields to proper types (FormData sends everything as strings)
    const age = parseInt(ageRaw, 10);
    const annualTurnover = annualTurnoverRaw
      ? parseFloat(annualTurnoverRaw)
      : null;

    // Parse JSON string arrays back to arrays of integers
    let productCategoryIds: number[] = [];
    let existingProducts: number[] = [];
    let selectedProducts: number[] = [];
    let productionDetails: any[] = [];
    let existingProductDetails: any = {};

    // Parse product category IDs
    try {
      if (productCategoryIdsRaw) {
        productCategoryIds =
          typeof productCategoryIdsRaw === "string"
            ? JSON.parse(productCategoryIdsRaw)
            : productCategoryIdsRaw;
      }
    } catch (error) {
      console.error("Error parsing productCategoryIds:", error);
    }

    try {
      if (existingProductsRaw) {
        existingProducts =
          typeof existingProductsRaw === "string"
            ? JSON.parse(existingProductsRaw)
            : existingProductsRaw;
      }
    } catch (error) {
      console.error("Error parsing existingProducts:", error);
    }

    try {
      if (selectedProductsRaw) {
        selectedProducts =
          typeof selectedProductsRaw === "string"
            ? JSON.parse(selectedProductsRaw)
            : selectedProductsRaw;
      }
    } catch (error) {
      console.error("Error parsing selectedProducts:", error);
    }

    try {
      if (productionDetailsRaw) {
        productionDetails =
          typeof productionDetailsRaw === "string"
            ? JSON.parse(productionDetailsRaw)
            : productionDetailsRaw;
      }
    } catch (error) {
      console.error("Error parsing productionDetails:", error);
    }

    try {
      if (existingProductDetailsRaw) {
        existingProductDetails =
          typeof existingProductDetailsRaw === "string"
            ? JSON.parse(existingProductDetailsRaw)
            : existingProductDetailsRaw;
      }
    } catch (error) {
      console.error("Error parsing existingProductDetails:", error);
    }

    // Resolve turnover unit without forcing a default; prefer explicit field, else scan all details for first provided unit
    const resolvedTurnoverUnit: string | null = (() => {
      if (turnoverUnit) return turnoverUnit;
      if (Array.isArray(productionDetails) && productionDetails.length > 0) {
        const found = productionDetails.find((d: any) => d && d.turnoverUnit);
        if (found && found.turnoverUnit) return found.turnoverUnit as string;
      }
      if (
        existingProductDetails &&
        typeof existingProductDetails === "object"
      ) {
        for (const val of Object.values(existingProductDetails)) {
          const unit = (val as any)?.turnoverUnit;
          if (unit) return unit as string;
        }
      }
      return null;
    })();

    // Validate required fields (PAN Card and Proof of Production are now optional)
    if (
      !name ||
      !address ||
      isNaN(age) ||
      !gender ||
      !phone ||
      (!aadharNumber && !voterId) ||
      !productCategoryIds ||
      productCategoryIds.length === 0
    ) {
      return res.status(400).json({
        error:
          "Missing or invalid required fields: name, address, age (number), gender, phone, either aadharNumber or voterId, productCategoryIds (array of numbers)",
      });
    }

    // Validate Aadhar number format if provided (must be exactly 12 digits)
    if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
      return res.status(400).json({
        error: "Aadhar number must be exactly 12 digits",
      });
    }

    // Validate Voter ID format if provided (3 letters + 7 digits)
    if (voterId && !/^[A-Z]{3}\d{7}$/.test(voterId.toUpperCase())) {
      return res.status(400).json({
        error:
          "Voter ID must be in format: 3 letters followed by 7 digits (e.g., ABC1234567)",
      });
    }

    // Validate product category IDs exist
    const placeholders = productCategoryIds.map(() => "?").join(",");
    const categoryResults = await dbQuery(
      `SELECT id FROM product_categories WHERE id IN (${placeholders})`,
      productCategoryIds,
    );

    if (categoryResults.length !== productCategoryIds.length) {
      return res
        .status(400)
        .json({ error: "One or more invalid product category IDs" });
    }

    // Check for existing Aadhar number (only if not additional registration)
    if (aadharNumber && !isAdditionalRegistration) {
      const existingAadhar = await dbQuery(
        "SELECT id, name FROM user_registrations WHERE aadhar_number = ?",
        [aadharNumber],
      );

      if (existingAadhar.length > 0) {
        return res.status(409).json({
          error: `Aadhar number ${aadharNumber} is already registered by ${existingAadhar[0].name}`,
          field: "aadharNumber",
        });
      }
    }

    // Check for existing Voter ID (only if not additional registration)
    if (voterId && !isAdditionalRegistration) {
      const voterIdUpper = voterId.toUpperCase();
      const existingVoter = await dbQuery(
        "SELECT id, name FROM user_registrations WHERE voter_id = ?",
        [voterIdUpper],
      );

      if (existingVoter.length > 0) {
        return res.status(409).json({
          error: `Voter ID ${voterIdUpper} is already registered by ${existingVoter[0].name}`,
          field: "voterId",
        });
      }
    }

    // For additional registrations, add a note to the registration
    let registrationType = isAdditionalRegistration ? "additional" : "primary";

    // Use the first category as the primary category for backwards compatibility
    const primaryCategoryId = productCategoryIds[0];

    // Insert main registration without file paths first
    const registrationResult = await dbRun(
      `
      INSERT INTO user_registrations (
        user_id, name, address, age, gender, phone, email,
        aadhar_number, voter_id, pan_number, product_category_id,
        area_of_production, annual_production, annual_turnover, turnover_unit,
        years_of_production
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userId,
        name,
        address,
        age,
        gender,
        phone,
        email || null,

        aadharNumber || null,

        voterId ? voterId.toUpperCase() : null,
        panNumber || null,
        primaryCategoryId,
        areaOfProduction || null,
        annualProduction || null,
        annualTurnover,
        resolvedTurnoverUnit,
        yearsOfProduction || null,
      ],
    );

    const registrationId = registrationResult.insertId;

    // Now save files using the registration ID with compression
    let documentPaths: { [key: string]: string } = {};
    let compressionStats: { [key: string]: any } = {};

    if (Object.keys(tempFiles).length > 0) {
      for (const [fieldName, fileData] of Object.entries(tempFiles)) {
        try {
          // Use compressed file storage to limit files to 70KB
          const savedResult = await compressedFileStorage.saveFile(
            registrationId,
            fileData.originalname,
            fileData.buffer,
          );

          documentPaths[fieldName] = savedResult.relativePath;
          compressionStats[fieldName] = {
            originalSize: savedResult.originalSize,
            compressedSize: savedResult.compressedSize,
            compressionRatio: savedResult.compressionRatio,
            isCompressed: savedResult.isCompressed,
            isImage: savedResult.isImage,
          };

          if (savedResult.isCompressed) {
            const savedKB = (
              (savedResult.originalSize - savedResult.compressedSize) /
              1024
            ).toFixed(1);
          }
        } catch (error) {
          console.error(
            `❌ Failed to save ${fieldName} for registration ${registrationId}:`,
            error,
          );
          return res.status(500).json({ error: `Failed to save ${fieldName}` });
        }
      }

      // Update registration with file paths
      await dbRun(
        `UPDATE user_registrations SET
         aadhar_card_path = ?, pan_card_path = ?, proof_of_production_path = ?,
         signature_path = ?, photo_path = ?
         WHERE id = ?`,
        [
          documentPaths.aadharCard || null,
          documentPaths.panCard || null,
          documentPaths.proofOfProduction || null,
          documentPaths.signature || null,
          documentPaths.photo || null,
          registrationId,
        ],
      );
    }

    // Store all selected categories (including the primary one)
    for (const categoryId of productCategoryIds) {
      try {
        await dbRun(
          "INSERT IGNORE INTO user_registration_categories (registration_id, category_id) VALUES (?, ?)",
          [registrationId, categoryId],
        );
      } catch (error) {
        // If table doesn't exist, create it and try again
        try {
          await dbRun(`
        CREATE TABLE IF NOT EXISTS user_registration_categories (
          id INT PRIMARY KEY AUTO_INCREMENT,
          registration_id INT NOT NULL,
          category_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (registration_id) REFERENCES user_registrations(id),
          FOREIGN KEY (category_id) REFERENCES product_categories(id),
          UNIQUE (registration_id, category_id)
        ) ENGINE=InnoDB
      `);

          await dbRun(
            "INSERT IGNORE INTO user_registration_categories (registration_id, category_id) VALUES (?, ?)",
            [registrationId, categoryId],
          );
        } catch (createError) {
          console.error(
            "Error creating or inserting into user_registration_categories:",
            createError,
          );
        }
      }
    }

    // Handle existing products using integer IDs
    if (existingProducts && existingProducts.length > 0) {
      for (const productId of existingProducts) {
        // Validate product ID exists
        const productResult = await dbQuery(
          "SELECT id FROM products WHERE id = ?",
          [productId],
        );

        if (productResult.length > 0) {
          await dbRun(
            "INSERT INTO user_existing_products (registration_id, product_id) VALUES (?, ?)",
            [registrationId, productId],
          );
        }
      }
    }

    // Handle selected products using integer IDs
    if (selectedProducts && selectedProducts.length > 0) {
      for (const productId of selectedProducts) {
        // Validate product ID exists
        const productResult = await dbQuery(
          "SELECT id FROM products WHERE id = ?",
          [productId],
        );

        if (productResult.length > 0) {
          await dbRun(
            "INSERT INTO user_selected_products (registration_id, product_id) VALUES (?, ?)",
            [registrationId, productId],
          );
        }
      }
    }

    // Transform existingProductDetails object to productionDetails array format
    if (
      existingProductDetails &&
      Object.keys(existingProductDetails).length > 0
    ) {
      for (const [productIdStr, details] of Object.entries(
        existingProductDetails,
      )) {
        const productId = parseInt(productIdStr, 10);

        // Get product name from database
        const productResult = await dbQuery(
          "SELECT name FROM products WHERE id = ?",
          [productId],
        );

        const productName =
          productResult.length > 0
            ? productResult[0].name
            : `Product ${productId}`;

        productionDetails.push({
          productId: productId,
          productName: productName,
          annualProduction: (details as any).annualProduction || "",
          unit: "kg", // Default unit since existingProductDetails doesn't have unit
          areaOfProduction: (details as any).areaOfProduction || "",
          yearsOfProduction: (details as any).yearsOfProduction || "",
          annualTurnover: (details as any).annualTurnover || "",
          turnoverUnit: (details as any).turnoverUnit || null,
          additionalNotes: "",
        });
      }
    }

    // Log final production details before saving

    // Handle production details
    if (productionDetails && productionDetails.length > 0) {
      // Create production details table if it doesn't exist
      try {
        await dbRun(`
          CREATE TABLE IF NOT EXISTS user_production_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            registration_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            annual_production TEXT NOT NULL,
            unit TEXT NOT NULL,
            area_of_production TEXT NOT NULL,
            years_of_production TEXT NOT NULL,
            annual_turnover TEXT,
            additional_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (registration_id) REFERENCES user_registrations(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
          )
        `);

        // Add annual_turnover column if it doesn't exist (for existing tables)
        try {
          await dbRun(
            `ALTER TABLE user_production_details ADD COLUMN annual_turnover TEXT`,
          );
        } catch (alterError) {
          // Column already exists, ignore error
        }
      } catch (createError) {
        console.error(
          "Error creating user_production_details table:",
          createError,
        );
      }

      // Insert production details
      for (const detail of productionDetails) {
        try {
          await dbRun(
            `INSERT INTO user_production_details (
              registration_id, product_id, product_name, annual_production,
              unit, area_of_production, years_of_production, annual_turnover, turnover_unit, additional_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              registrationId,
              detail.productId || null,
              detail.productName || null,
              detail.annualProduction || null,
              detail.unit || null,
              detail.areaOfProduction || null,
              detail.yearsOfProduction || null,
              detail.annualTurnover || null,
              detail.turnoverUnit || null,
              detail.additionalNotes || null,
            ],
          );
        } catch (error) {
          console.error("Error inserting production detail:", error);
        }
      }
    }

    // Generate URLs for file access
    const documentUrls: { [key: string]: string } = {};
    for (const [key, path] of Object.entries(documentPaths)) {
      documentUrls[key] = simpleFileStorage.getFileUrl(path);
    }

    res.status(201).json({
      message: "Registration created successfully",
      registrationId,
      documentPaths,
      documentUrls,
    });
  } catch (error) {
    console.error("Registration creation error:", error);

    // Handle unique constraint violations
    if (
      error.code === "ER_DUP_ENTRY" ||
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      const errorMessage = error.message || "";

      if (
        errorMessage.includes("aadhar_number") ||
        errorMessage.includes("unique_aadhar_number")
      ) {
        return res.status(409).json({
          error: "This Aadhar number is already registered in the system",
          field: "aadharNumber",
        });
      }

      if (
        errorMessage.includes("voter_id") ||
        errorMessage.includes("unique_voter_id")
      ) {
        return res.status(409).json({
          error: "This Voter ID is already registered in the system",
          field: "voterId",
        });
      }

      return res.status(409).json({
        error:
          "This Aadhar number or Voter ID is already registered in the system",
      });
    }

    res.status(500).json({ error: "Failed to create registration" });
  }
}

export async function getUserRegistrations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const registrations = await dbQuery(
      `
      SELECT 
        ur.*,
        pc.name as category_name,
        GROUP_CONCAT(DISTINCT p1.name) as existing_products,
        GROUP_CONCAT(DISTINCT p2.name) as selected_products
      FROM user_registrations ur
      LEFT JOIN product_categories pc ON ur.product_category_id = pc.id
      LEFT JOIN user_existing_products uep ON ur.id = uep.registration_id
      LEFT JOIN products p1 ON uep.product_id = p1.id
      LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
      LEFT JOIN products p2 ON usp.product_id = p2.id
      WHERE ur.user_id = ?
      GROUP BY ur.id
      ORDER BY ur.created_at DESC
    `,
      [userId],
    );

    // Add file URLs to registrations
    const registrationsWithUrls = registrations.map((registration) => {
      const documentUrls: { [key: string]: string } = {};

      if (registration.aadhar_card_path)
        documentUrls.aadharCard = simpleFileStorage.getFileUrl(
          registration.aadhar_card_path,
        );
      if (registration.pan_card_path)
        documentUrls.panCard = simpleFileStorage.getFileUrl(
          registration.pan_card_path,
        );
      if (registration.proof_of_production_path)
        documentUrls.proofOfProduction = simpleFileStorage.getFileUrl(
          registration.proof_of_production_path,
        );
      if (registration.signature_path)
        documentUrls.signature = simpleFileStorage.getFileUrl(
          registration.signature_path,
        );
      if (registration.photo_path)
        documentUrls.photo = simpleFileStorage.getFileUrl(
          registration.photo_path,
        );

      return {
        ...registration,
        documentUrls,
      };
    });

    res.json(registrationsWithUrls);
  } catch (error) {
    console.error("Get user registrations error:", error);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
}

export async function getAllRegistrations(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = "";
    let params: any[] = [];

    const registrations = await dbQuery(
      `
      SELECT
        ur.*,
        u.username,
        pc.name as category_name,
        GROUP_CONCAT(DISTINCT p1.name) as existing_products,
        GROUP_CONCAT(DISTINCT p2.name) as selected_products
      FROM user_registrations ur
      LEFT JOIN users u ON ur.user_id = u.id
      LEFT JOIN product_categories pc ON ur.product_category_id = pc.id
      LEFT JOIN user_existing_products uep ON ur.id = uep.registration_id
      LEFT JOIN products p1 ON uep.product_id = p1.id
      LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
      LEFT JOIN products p2 ON usp.product_id = p2.id
      ${whereClause}
      GROUP BY ur.id
      ORDER BY ur.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, Number(limit), offset],
    );

    // Fetch production details and categories for each registration
    const registrationsWithProductionDetails = await Promise.all(
      registrations.map(async (registration) => {
        // Fetch all categories for this registration
        const categories = await dbQuery(
          `
          SELECT pc.id, pc.name
          FROM user_registration_categories urc
          JOIN product_categories pc ON urc.category_id = pc.id
          WHERE urc.registration_id = ?
          ORDER BY pc.name
        `,
          [registration.id],
        );

        // Fallback to primary category if no categories found in junction table
        let categoriesData = categories;
        if (categories.length === 0 && registration.product_category_id) {
          const primaryCategory = await dbQuery(
            "SELECT id, name FROM product_categories WHERE id = ?",
            [registration.product_category_id],
          );
          categoriesData = primaryCategory;
        }

        const productionDetails = await dbQuery(
          `
          SELECT
            id,
            product_id,
            product_name,
            annual_production,
            unit,
            area_of_production,
            years_of_production,
            annual_turnover,
            turnover_unit,
            additional_notes,
            created_at
          FROM user_production_details
          WHERE registration_id = ?
          ORDER BY product_name
        `,
          [registration.id],
        );

        // Format production details as strings for display
        let productionSummary = "";
        let productionDetailsFormatted = null;

        if (productionDetails.length > 0) {
          // Create formatted production details
          productionDetailsFormatted = productionDetails.map((detail) => ({
            id: detail.id,
            productId: detail.product_id,
            productName: detail.product_name,
            annualProduction: detail.annual_production,
            unit: detail.unit,
            areaOfProduction: detail.area_of_production,
            yearsOfProduction: detail.years_of_production,
            annualTurnover: detail.annual_turnover,
            turnoverUnit: detail.turnover_unit,
            additionalNotes: detail.additional_notes,
            createdAt: detail.created_at,
          }));

          // Create summary string
          const summaryParts = productionDetails.map((detail) => {
            const parts = [];
            if (detail.product_name)
              parts.push(`Product: ${detail.product_name}`);
            if (detail.annual_production && detail.unit) {
              parts.push(
                `Production: ${detail.annual_production} ${detail.unit}`,
              );
            }
            if (detail.area_of_production)
              parts.push(`Area: ${detail.area_of_production}`);
            if (detail.years_of_production)
              parts.push(`Years: ${detail.years_of_production}`);
            if (detail.annual_turnover)
              parts.push(
                `Turnover: ��${detail.annual_turnover} ${detail.turnover_unit || "lakhs"}`,
              );
            return parts.join(", ");
          });
          productionSummary = summaryParts.join(" | ");
        }

        // Add file URLs to registration
        const documentUrls: { [key: string]: string } = {};
        if (registration.aadhar_card_path)
          documentUrls.aadharCard = simpleFileStorage.getFileUrl(
            registration.aadhar_card_path,
          );
        if (registration.pan_card_path)
          documentUrls.panCard = simpleFileStorage.getFileUrl(
            registration.pan_card_path,
          );
        if (registration.proof_of_production_path)
          documentUrls.proofOfProduction = simpleFileStorage.getFileUrl(
            registration.proof_of_production_path,
          );
        if (registration.signature_path)
          documentUrls.signature = simpleFileStorage.getFileUrl(
            registration.signature_path,
          );
        if (registration.photo_path)
          documentUrls.photo = simpleFileStorage.getFileUrl(
            registration.photo_path,
          );

        const result = {
          ...registration,
          categories: categoriesData,
          category_names: categoriesData.map((cat) => cat.name).join(", "),
          production_details: productionDetailsFormatted,
          production_summary: productionSummary,
          documentUrls,
        };

        return result;
      }),
    );

    // Get total count
    const countResult = await dbQuery(
      `
      SELECT COUNT(*) as total
      FROM user_registrations ur
      ${whereClause}
    `,
      params,
    );

    res.json({
      registrations: registrationsWithProductionDetails,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all registrations error:", error);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
}

export async function getRegistrationById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const registrations = await dbQuery(
      `
      SELECT 
        ur.*,
        u.username,
        pc.name as category_name
      FROM user_registrations ur
      LEFT JOIN users u ON ur.user_id = u.id
      LEFT JOIN product_categories pc ON ur.product_category_id = pc.id
      WHERE ur.id = ?
    `,
      [id],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const registration = registrations[0];

    // Get all categories for this registration
    const categories = await dbQuery(
      `
      SELECT pc.id, pc.name
      FROM user_registration_categories urc
      JOIN product_categories pc ON urc.category_id = pc.id
      WHERE urc.registration_id = ?
      ORDER BY pc.name
    `,
      [id],
    );

    // Fallback to primary category if no categories found in junction table
    let categoriesData = categories;
    if (categories.length === 0 && registration.product_category_id) {
      const primaryCategory = await dbQuery(
        "SELECT id, name FROM product_categories WHERE id = ?",
        [registration.product_category_id],
      );
      categoriesData = primaryCategory;
    }

    // Get existing products
    const existingProducts = await dbQuery(
      `
      SELECT p.* FROM products p
      JOIN user_existing_products uep ON p.id = uep.product_id
      WHERE uep.registration_id = ?
    `,
      [id],
    );

    // Get selected products
    const selectedProducts = await dbQuery(
      `
      SELECT p.* FROM products p
      JOIN user_selected_products usp ON p.id = usp.product_id
      WHERE usp.registration_id = ?
    `,
      [id],
    );

    // Get production details
    const productionDetails = await dbQuery(
      `
      SELECT
        id,
        product_id,
        product_name,
        annual_production,
        unit,
        area_of_production,
        years_of_production,
        annual_turnover,
        turnover_unit,
        additional_notes,
        created_at
      FROM user_production_details
      WHERE registration_id = ?
      ORDER BY product_name
    `,
      [id],
    );

    // Format production details
    const productionDetailsFormatted = productionDetails.map((detail) => ({
      id: detail.id,
      productId: detail.product_id,
      productName: detail.product_name,
      annualProduction: detail.annual_production,
      unit: detail.unit,
      areaOfProduction: detail.area_of_production,
      yearsOfProduction: detail.years_of_production,
      annualTurnover: detail.annual_turnover,
      turnoverUnit: detail.turnover_unit,
      additionalNotes: detail.additional_notes,
      createdAt: detail.created_at,
    }));

    // Add file URLs to registration
    const documentUrls: { [key: string]: string } = {};

    if (registration.aadhar_card_path)
      documentUrls.aadharCard = simpleFileStorage.getFileUrl(
        registration.aadhar_card_path,
      );
    if (registration.pan_card_path)
      documentUrls.panCard = simpleFileStorage.getFileUrl(
        registration.pan_card_path,
      );
    if (registration.proof_of_production_path)
      documentUrls.proofOfProduction = simpleFileStorage.getFileUrl(
        registration.proof_of_production_path,
      );
    if (registration.signature_path)
      documentUrls.signature = simpleFileStorage.getFileUrl(
        registration.signature_path,
      );
    if (registration.photo_path)
      documentUrls.photo = simpleFileStorage.getFileUrl(
        registration.photo_path,
      );

    res.json({
      ...registration,
      categories: categoriesData,
      category_names: categoriesData.map((cat) => cat.name).join(", "),
      existing_products: existingProducts,
      selected_products: selectedProducts,
      production_details: productionDetailsFormatted,
      documentUrls,
    });
  } catch (error) {
    console.error("Get registration by ID error:", error);
    res.status(500).json({ error: "Failed to fetch registration" });
  }
}

export async function generateReport(req: Request, res: Response) {
  try {
    const { type, startDate, endDate } = req.query;

    let whereClause = "1=1";
    let params: any[] = [];

    if (startDate) {
      whereClause += " AND ur.created_at >= ?";
      params.push(startDate);
    }

    if (endDate) {
      whereClause += " AND ur.created_at <= ?";
      params.push(endDate);
    }

    const reportData = await dbQuery(
      `
      SELECT
        ur.id,
        ur.name,
        ur.phone,
        ur.email,
        ur.created_at,
        pc.name as category_name,
        ur.area_of_production,
        ur.annual_production,
        ur.annual_turnover,
        ur.turnover_unit
      FROM user_registrations ur
      LEFT JOIN product_categories pc ON ur.product_category_id = pc.id
      WHERE ${whereClause}
      ORDER BY ur.created_at DESC
    `,
      params,
    );

    // Generate summary statistics
    const summary = await dbQuery(
      `
      SELECT
        COUNT(*) as total_registrations
      FROM user_registrations ur
      WHERE ${whereClause}
    `,
      params,
    );

    res.json({
      summary: summary[0],
      data: reportData,
      generatedAt: new Date().toISOString(),
      filters: { type, startDate, endDate, status },
    });
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
}

export async function createAdditionalRegistration(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
      baseRegistrationId,
      productCategoryIds,
      existingProducts,
      selectedProducts,
      areaOfProduction,
      annualProduction,
      annualTurnover: annualTurnoverRaw,
      turnoverUnit,
      yearsOfProduction,
      productionDetails: productionDetailsRaw,
      additionalInfo,
    } = req.body;

    // Convert values
    const annualTurnover = annualTurnoverRaw
      ? parseFloat(annualTurnoverRaw)
      : null;
    let productionDetails: any[] = [];

    try {
      if (productionDetailsRaw) {
        productionDetails =
          typeof productionDetailsRaw === "string"
            ? JSON.parse(productionDetailsRaw)
            : productionDetailsRaw;
      }
    } catch (error) {
      console.error("Error parsing productionDetails:", error);
    }

    // Resolve turnover unit without forcing a default for additional registrations
    const resolvedTurnoverUnit: string | null =
      turnoverUnit ??
      (Array.isArray(productionDetails) && productionDetails.length > 0
        ? (productionDetails[0]?.turnoverUnit ?? null)
        : null);

    // Get the base registration to reuse file paths and personal data
    const baseRegistration = await dbQuery(
      "SELECT * FROM user_registrations WHERE id = ? AND user_id = ?",
      [baseRegistrationId, userId],
    );

    if (baseRegistration.length === 0) {
      return res.status(404).json({ error: "Base registration not found" });
    }

    const baseReg = baseRegistration[0];
    const primaryCategoryId = productCategoryIds[0];

    // Create new registration using base registration data and files
    const registrationResult = await dbRun(
      `
      INSERT INTO user_registrations (
        user_id, name, address, age, gender, phone, email,
        aadhar_number, voter_id, pan_number, product_category_id,
        area_of_production, annual_production, annual_turnover, turnover_unit,
        years_of_production, aadhar_card_path, pan_card_path, proof_of_production_path,
        signature_path, photo_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userId,
        baseReg.name,
        baseReg.address,
        baseReg.age,
        baseReg.gender,
        baseReg.phone,
        baseReg.email,
        baseReg.aadhar_number,
        baseReg.voter_id,
        baseReg.pan_number,
        primaryCategoryId,
        areaOfProduction || null,
        annualProduction || null,
        annualTurnover,
        resolvedTurnoverUnit,
        yearsOfProduction || null,
        // Reuse existing file paths
        baseReg.aadhar_card_path,
        baseReg.pan_card_path,
        baseReg.proof_of_production_path,
        baseReg.signature_path,
        baseReg.photo_path,
      ],
    );

    const registrationId = registrationResult.insertId;

    // Add categories
    if (productCategoryIds && productCategoryIds.length > 0) {
      for (const categoryId of productCategoryIds) {
        await dbRun(
          "INSERT OR IGNORE INTO user_registration_categories (registration_id, category_id) VALUES (?, ?)",
          [registrationId, categoryId],
        );
      }
    }

    // Add existing products
    if (existingProducts && existingProducts.length > 0) {
      for (const productId of existingProducts) {
        await dbRun(
          "INSERT OR IGNORE INTO user_existing_products (registration_id, product_id) VALUES (?, ?)",
          [registrationId, productId],
        );
      }
    }

    // Add selected products
    if (selectedProducts && selectedProducts.length > 0) {
      for (const productId of selectedProducts) {
        await dbRun(
          "INSERT OR IGNORE INTO user_selected_products (registration_id, product_id) VALUES (?, ?)",
          [registrationId, productId],
        );
      }
    }

    // Add production details
    if (productionDetails && productionDetails.length > 0) {
      for (const detail of productionDetails) {
        await dbRun(
          `INSERT INTO user_production_details (
            registration_id, product_id, product_name, annual_production, unit,
            area_of_production, years_of_production, annual_turnover, turnover_unit, additional_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            registrationId,
            detail.productId || null,
            detail.productName || null,
            detail.annualProduction || null,
            detail.unit || null,
            detail.areaOfProduction || null,
            detail.yearsOfProduction || null,
            detail.annualTurnover || null,
            detail.turnoverUnit || null,
            detail.additionalNotes || null,
          ],
        );
      }
    }

    res.status(201).json({
      message: "Additional registration created successfully",
      registrationId,
      reusedFiles: true,
      baseRegistrationId,
    });
  } catch (error) {
    console.error("Create additional registration error:", error);
    res.status(500).json({ error: "Failed to create additional registration" });
  }
}

export async function verifyRegistration(req: Request, res: Response) {
  try {
    const { aadharNumber, voterId }: VerificationRequest = req.body;

    // Validate that at least one identifier is provided
    if (!aadharNumber && !voterId) {
      return res.status(400).json({
        error: "Either Aadhar Number or Voter ID is required",
      });
    }

    // Validate Aadhar number format if provided
    if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
      return res.status(400).json({
        error: "Aadhar number must be exactly 12 digits",
      });
    }

    // Validate Voter ID format if provided (typically 10 characters: 3 letters + 7 digits)
    if (voterId && !/^[A-Z]{3}[0-9]{7}$/i.test(voterId)) {
      return res.status(400).json({
        error: "Voter ID must be in format ABC1234567 (3 letters + 7 digits)",
      });
    }

    let query = "";
    let params: any[] = [];

    // Build query based on provided identifiers - get complete user data
    if (aadharNumber && voterId) {
      query = `
        SELECT id, name, address, age, gender, phone, email,
               aadhar_number, voter_id, pan_number,
               aadhar_card_path, pan_card_path, proof_of_production_path,
               signature_path, photo_path, created_at
        FROM user_registrations
        WHERE aadhar_number = ? OR voter_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;
      params = [aadharNumber, voterId.toUpperCase()];
    } else if (aadharNumber) {
      query = `
        SELECT id, name, address, age, gender, phone, email,
               aadhar_number, voter_id, pan_number,
               aadhar_card_path, pan_card_path, proof_of_production_path,
               signature_path, photo_path, created_at
        FROM user_registrations
        WHERE aadhar_number = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;
      params = [aadharNumber];
    } else if (voterId) {
      query = `
        SELECT id, name, address, age, gender, phone, email,
               aadhar_number, voter_id, pan_number,
               aadhar_card_path, pan_card_path, proof_of_production_path,
               signature_path, photo_path, created_at
        FROM user_registrations
        WHERE voter_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;
      params = [voterId.toUpperCase()];
    }

    const existingRegistrations = await dbQuery(query, params);

    const response: VerificationResponse = {
      isRegistered: existingRegistrations.length > 0,
    };

    if (existingRegistrations.length > 0) {
      const registration = existingRegistrations[0];
      response.registrationId = registration.id;
      response.name = registration.name;
      response.registrationDate = registration.created_at;

      // Include complete user data for loading option
      response.userData = {
        name: registration.name,
        address: registration.address,
        age: registration.age,
        gender: registration.gender,
        phone: registration.phone,
        email: registration.email || undefined,
        aadharNumber: registration.aadhar_number || undefined,
        voterId: registration.voter_id || undefined,
        panNumber: registration.pan_number || undefined,
        documentPaths: {
          aadharCard: registration.aadhar_card_path || undefined,
          panCard: registration.pan_card_path || undefined,
          proofOfProduction: registration.proof_of_production_path || undefined,
          signature: registration.signature_path || undefined,
          photo: registration.photo_path || undefined,
        },
      };

      // Get all existing registrations for this user for additional registration support
      const userIdentifier = aadharNumber || voterId?.toUpperCase();
      const userRegistrations = await dbQuery(
        `
        SELECT
          ur.id,
          ur.created_at,
          GROUP_CONCAT(DISTINCT urc.category_id) as category_ids,
          GROUP_CONCAT(DISTINCT pc.name) as category_names,
          GROUP_CONCAT(DISTINCT uep.product_id) as existing_product_ids,
          GROUP_CONCAT(DISTINCT usp.product_id) as selected_product_ids
        FROM user_registrations ur
        LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
        LEFT JOIN product_categories pc ON urc.category_id = pc.id
        LEFT JOIN user_existing_products uep ON ur.id = uep.registration_id
        LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
        WHERE ur.aadhar_number = ? OR ur.voter_id = ?
        GROUP BY ur.id
        ORDER BY ur.created_at DESC
        `,
        [userIdentifier, userIdentifier],
      );

      response.existingRegistrations = userRegistrations.map((reg) => ({
        id: reg.id,
        categoryIds: reg.category_ids
          ? reg.category_ids.split(",").map(Number)
          : [],
        categoryNames: reg.category_names ? reg.category_names.split(",") : [],
        selectedProductIds: reg.selected_product_ids
          ? reg.selected_product_ids.split(",").map(Number)
          : [],
        existingProductIds: reg.existing_product_ids
          ? reg.existing_product_ids.split(",").map(Number)
          : [],
        registrationDate: reg.created_at,
      }));

      // Get all used category IDs and product IDs
      const usedCategoryIds = new Set();
      const usedProductIds = new Set();

      response.existingRegistrations.forEach((reg) => {
        reg.categoryIds.forEach((id) => usedCategoryIds.add(id));
        reg.selectedProductIds.forEach((id) => usedProductIds.add(id));
        reg.existingProductIds.forEach((id) => usedProductIds.add(id));
      });

      // Get available categories (not yet used)
      const allCategories = await dbQuery(
        "SELECT * FROM product_categories ORDER BY name",
      );
      response.availableCategories = allCategories.filter(
        (cat) => !usedCategoryIds.has(cat.id),
      );

      // Get available products (not yet selected)
      const allProducts = await dbQuery("SELECT * FROM products ORDER BY name");
      response.availableProducts = allProducts.filter(
        (prod) => !usedProductIds.has(prod.id),
      );
    }

    res.json(response);
  } catch (error) {
    console.error("Verify registration error:", error);
    res.status(500).json({ error: "Failed to verify registration" });
  }
}

export async function updateRegistration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      age,
      gender,
      phone,
      email,
      address,
      aadhar_number,
      voter_id,
      pan_number,
    } = req.body;

    // Validate required fields
    if (!name || !age || !gender || !phone || !address) {
      return res.status(400).json({
        error: "Missing required fields: name, age, gender, phone, address",
      });
    }

    // Validate Aadhar number format if provided
    if (aadhar_number && !/^\d{12}$/.test(aadhar_number)) {
      return res.status(400).json({
        error: "Aadhar number must be exactly 12 digits",
      });
    }

    // Validate Voter ID format if provided
    if (voter_id && !/^[A-Z]{3}\d{7}$/.test(voter_id.toUpperCase())) {
      return res.status(400).json({
        error:
          "Voter ID must be in format: 3 letters followed by 7 digits (e.g., ABC1234567)",
      });
    }

    // Check if registration exists
    const existingRegistration = await dbQuery(
      "SELECT id FROM user_registrations WHERE id = ?",
      [id],
    );

    if (existingRegistration.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Update the registration
    await dbRun(
      `UPDATE user_registrations SET
       name = ?, age = ?, gender = ?, phone = ?, email = ?, address = ?,
       aadhar_number = ?, voter_id = ?, pan_number = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        parseInt(age),
        gender,
        phone,
        email || null,
        address,
        aadhar_number || null,
        voter_id ? voter_id.toUpperCase() : null,
        pan_number || null,
        id,
      ],
    );

    res.json({ message: "Registration updated successfully" });
  } catch (error) {
    console.error("Update registration error:", error);

    // Handle unique constraint violations
    if (
      error.code === "ER_DUP_ENTRY" ||
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      const errorMessage = error.message || "";

      if (
        errorMessage.includes("aadhar_number") ||
        errorMessage.includes("unique_aadhar_number")
      ) {
        return res.status(409).json({
          error: "This Aadhar number is already registered in the system",
          field: "aadharNumber",
        });
      }

      if (
        errorMessage.includes("voter_id") ||
        errorMessage.includes("unique_voter_id")
      ) {
        return res.status(409).json({
          error: "This Voter ID is already registered in the system",
          field: "voterId",
        });
      }
    }

    res.status(500).json({ error: "Failed to update registration" });
  }
}

export async function uploadDocument(req: Request, res: Response) {
  try {
    const { registrationId, type } = req.body;
    const file = req.file;

    if (!registrationId || !type || !file) {
      return res.status(400).json({
        error: "Registration ID, document type, and file are required",
      });
    }

    // Validate document type
    const validTypes = [
      "aadharCard",
      "panCard",
      "proofOfProduction",
      "signature",
      "photo",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: "Invalid document type",
      });
    }

    // Check if registration exists
    const existingRegistration = await dbQuery(
      "SELECT id FROM user_registrations WHERE id = ?",
      [registrationId],
    );

    if (existingRegistration.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Save the new file using compressed file storage
    const savedResult = await compressedFileStorage.saveFile(
      registrationId,
      file.originalname,
      file.buffer,
    );

    // Update the registration with the new file path
    const columnMap = {
      aadharCard: "aadhar_card_path",
      panCard: "pan_card_path",
      proofOfProduction: "proof_of_production_path",
      signature: "signature_path",
      photo: "photo_path",
    };

    const column = columnMap[type];

    await dbRun(
      `UPDATE user_registrations SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [savedResult.relativePath, registrationId],
    );

    // Generate URL for the uploaded file
    const fileUrl = simpleFileStorage.getFileUrl(savedResult.relativePath);

    res.json({
      message: "Document uploaded successfully",
      url: fileUrl,
      compressionStats: {
        originalSize: savedResult.originalSize,
        compressedSize: savedResult.compressedSize,
        compressionRatio: savedResult.compressionRatio,
        isCompressed: savedResult.isCompressed,
      },
    });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
}

// Product-specific export functions
export async function exportProductGI3A(req: Request, res: Response) {
  try {
    const { registrationId, productId, productName } = req.body;

    if (!registrationId || !productName) {
      return res.status(400).json({
        error: "Registration ID and product name are required",
      });
    }

    // Fetch registration data
    const registrations = await dbQuery(
      `
      SELECT
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.phone,
        ur.email,
        ur.aadhar_number,
        ur.voter_id,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        ur.annual_production,
        ur.annual_turnover,
        ur.turnover_unit
      FROM user_registrations ur
      WHERE ur.id = ?
    `,
      [registrationId],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Fetch product association from database - association name is stored in description field
    const productData = await dbQuery(
      `SELECT p.* FROM products p WHERE p.name = ? LIMIT 1`,
      [productName],
    );

    const registration = registrations[0];
    registration.product_names = productName;
    registration.product_association =
      productData.length > 0 ? productData[0].description : null;

    // Generate HTML for the specific product
    const formHtml = await generateProductFormGI3AHtml(
      registration,
      productName,
    );

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Form GI 3A - ${productName}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }

        body {
          font-family: 'Times New Roman', serif;
          margin: 0;
          padding: 0;
          line-height: 1.6;
          font-size: 12pt;
          color: #000;
        }

        .form-page {
          width: 100%;
          margin: 0 auto;
          background: #fff;
          min-height: 100vh;
        }

        .form-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }

        .form-title {
          font-size: 14pt;
          font-weight: bold;
          margin: 5px 0;
          line-height: 1.4;
        }

        .form-subtitle {
          font-size: 12pt;
          margin: 3px 0;
          font-style: italic;
        }

        .form-number {
          font-size: 16pt;
          font-weight: bold;
          margin: 10px 0;
          text-decoration: underline;
        }

        .application-title {
          font-size: 13pt;
          font-weight: bold;
          margin: 10px 0;
        }

        .rule-reference {
          font-size: 11pt;
          margin: 5px 0;
          font-style: italic;
        }

        .form-field {
          margin: 15px 0;
          line-height: 1.8;
        }

        .field-number {
          font-weight: bold;
          margin-right: 10px;
        }

        .field-label {
          font-weight: normal;
        }

        .field-value {
          font-weight: bold;
          border-bottom: 1px solid #000;
          padding: 2px 5px;
          min-width: 200px;
          display: inline-block;
        }

        .declaration-section {
          margin-top: 30px;
          page-break-inside: avoid;
        }

        .declaration-title {
          font-weight: bold;
          margin-bottom: 15px;
          text-decoration: underline;
        }

        .declaration-item {
          margin: 10px 0;
          padding-left: 20px;
          text-indent: -20px;
        }

        .signature-section {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          page-break-inside: avoid;
        }

        .date-place {
          flex: 1;
        }

        .signature-area {
          flex: 1;
          text-align: center;
          border-top: 1px solid #000;
          padding-top: 5px;
          margin-left: 50px;
        }

        .signature-label {
          margin-top: 10px;
          font-size: 11pt;
        }

        .underline {
          border-bottom: 1px solid #000;
          padding: 2px 5px;
          min-width: 150px;
          display: inline-block;
        }

        .signature-image {
          max-width: 250px;
          max-height: 80px;
          object-fit: contain;
          margin: 10px auto;
          display: block;
        }
      </style>
    </head>
    <body>
      ${formHtml}
    </body>
    </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", 'inline; filename="form-gi-3a.html"');
    res.send(fullHtml);
  } catch (error) {
    console.error("Export Product GI 3A error:", error);
    res.status(500).json({ error: "Failed to export Form GI 3A" });
  }
}

export async function exportProductNOC(req: Request, res: Response) {
  try {
    const { registrationId, productId, productName } = req.body;

    if (!registrationId || !productName) {
      return res.status(400).json({
        error: "Registration ID and product name are required",
      });
    }

    // Fetch registration data
    const registrations = await dbQuery(
      `
      SELECT
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.phone,
        ur.email,
        ur.aadhar_number,
        ur.voter_id,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        ur.annual_production,
        ur.annual_turnover,
        ur.turnover_unit
      FROM user_registrations ur
      WHERE ur.id = ?
    `,
      [registrationId],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Fetch product association from database
    const productData = await dbQuery(
      `SELECT p.* FROM products p WHERE p.name = ? LIMIT 1`,
      [productName],
    );

    const registration = registrations[0];
    registration.product_association =
      productData.length > 0 ? productData[0].description : null;

    // Generate HTML for the specific product
    const nocHtml = await generateProductNOCHtml(
      registration,
      productName,
      productId,
    );

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>NOC</title>
      <style>
        @page {
          size: A4;
          margin: 25mm;
        }

        body {
          font-family: 'Times New Roman', serif;
          margin: 0;
          padding: 0;
          line-height: 1.8;
          font-size: 14pt;
          color: #000;
        }

        .noc-page {
          width: 100%;
          margin: 0 auto;
          background: #fff;
          min-height: 100vh;
          position: relative;
        }

        .noc-header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #000;
          padding-bottom: 20px;
        }

        .noc-title {
          font-size: 20pt;
          font-weight: bold;
          margin: 0;
          text-decoration: underline;
          letter-spacing: 2px;
        }

        .noc-content {
          text-align: justify;
          line-height: 2.2;
          margin-bottom: 40px;
        }

        .noc-paragraph {
          margin-bottom: 25px;
          text-indent: 30px;
        }

        .highlight {
          font-weight: bold;
          text-decoration: underline;
        }

        .signature-section {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          page-break-inside: avoid;
        }

        .date-place {
          flex: 1;
          line-height: 2.5;
        }

        .signature-area {
          flex: 1;
          text-align: center;
          margin-left: 50px;
        }

        .signature-line {
          border-bottom: 2px solid #000;
          width: 250px;
          height: 80px;
          margin: 30px auto;
          display: block;
        }

        .signature-label {
          font-weight: bold;
          margin-top: 15px;
          line-height: 1.5;
        }

        .underline-field {
          border-bottom: 1px solid #000;
          padding: 2px 8px;
          font-weight: bold;
          display: inline-block;
          min-width: 200px;
        }

        .organization-name {
          font-weight: bold;
          font-size: 16pt;
          color: #2c3e50;
        }
      </style>
    </head>
    <body>
      ${nocHtml}
    </body>
    </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", 'inline; filename="noc.html"');
    res.send(fullHtml);
  } catch (error) {
    console.error("Export Product NOC error:", error);
    res.status(500).json({ error: "Failed to export NOC" });
  }
}

export async function exportProductStatement(req: Request, res: Response) {
  try {
    const { registrationId, productId, productName } = req.body;

    if (!registrationId || !productName) {
      return res.status(400).json({
        error: "Registration ID and product name are required",
      });
    }

    // Fetch registration data
    const registrations = await dbQuery(
      `
      SELECT
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.phone,
        ur.email,
        ur.aadhar_number,
        ur.voter_id,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        ur.annual_production,
        ur.annual_turnover,
        ur.turnover_unit
      FROM user_registrations ur
      WHERE ur.id = ?
    `,
      [registrationId],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Fetch product association from database
    const productData = await dbQuery(
      `SELECT p.* FROM products p WHERE p.name = ? LIMIT 1`,
      [productName],
    );

    const registration = registrations[0];
    registration.product_association =
      productData.length > 0 ? productData[0].description : null;

    // Debug: Log signature path for Statement export
    console.log("🔍 Statement Export Debug:");
    console.log("- Registration ID:", registration.id);
    console.log("- Signature Path:", registration.signature_path);
    console.log("- Has signature_path:", !!registration.signature_path);

    // Generate HTML for the specific product
    const statementHtml = await generateProductStatementHtml(
      registration,
      productName,
      productId ?? null,
    );

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Statement of Case - ${productName}</title>
      <style>
        @page {
          size: A4;
          margin: 25mm;
        }

        body {
          font-family: 'Times New Roman', serif;
          margin: 0;
          padding: 0;
          line-height: 1.8;
          font-size: 14pt;
          color: #000;
        }

        .statement-page {
          width: 100%;
          margin: 0 auto;
          background: #fff;
          min-height: 100vh;
          position: relative;
        }

        .statement-header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #000;
          padding-bottom: 20px;
        }

        .statement-title {
          font-size: 18pt;
          font-weight: bold;
          margin: 0;
          text-decoration: underline;
          letter-spacing: 2px;
        }

        .statement-content {
          text-align: justify;
          line-height: 2.0;
          margin-bottom: 40px;
        }

        .statement-paragraph {
          margin-bottom: 20px;
          text-indent: 30px;
        }

        .highlight {
          font-weight: bold;
          border-bottom: 1px solid #000;
          padding: 2px 4px;
        }

        .signature-section {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          page-break-inside: avoid;
        }

        .date-place {
          flex: 1;
          line-height: 2.5;
        }

        .signature-area {
          flex: 1;
          text-align: center;
          margin-left: 50px;
        }

        .signature-line {
          border-bottom: 2px solid #000;
          width: 250px;
          height: 80px;
          margin: 30px auto;
          display: block;
        }

        .signature-label {
          font-weight: bold;
          margin-top: 15px;
          line-height: 1.5;
        }

        .underline-field {
          border-bottom: 1px solid #000;
          padding: 2px 8px;
          font-weight: bold;
          display: inline-block;
          min-width: 150px;
        }

        .organization-name {
          font-weight: bold;
          color: #2c3e50;
        }

        .currency {
          font-family: 'Times New Roman', serif;
        }

        .statement-signature-image {
          max-width: 250px;
          max-height: 80px;
          object-fit: contain;
          margin: 20px auto;
          display: block;
        }
      </style>
    </head>
    <body>
      ${statementHtml}
    </body>
    </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="statement-of-case.html"',
    );
    res.send(fullHtml);
  } catch (error) {
    console.error("Export Product Statement error:", error);
    res.status(500).json({ error: "Failed to export Statement of Case" });
  }
}

async function getProductAssociation(productName: string): Promise<string> {
  console.log(`🔍 Looking up association for product: "${productName}"`);

  try {
    // Try to fetch from database first - association name is stored in description field
    const productResult = await dbQuery(
      `SELECT p.name, p.description, pc.name as category_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.name = ? LIMIT 1`,
      [productName],
    );

    console.log(`���� Database query result:`, productResult);

    if (productResult.length > 0 && productResult[0].description) {
      console.log(
        `✅ Found association in database: ${productResult[0].description}`,
      );
      return productResult[0].description;
    }

    // Fallback to static mapping if no database field exists
    console.log(`🔄 Falling back to static mapping for: ${productName}`);

    const PRODUCT_ASSOCIATIONS: { [key: string]: string } = {
      "Bodo Aronai": "Association of Bodo Traditional Weaver",
      "Bodo Gamsa": "Association of Bodo Traditional Weaver",
      "Bodo Napham": "Association of Traditional Food Products",
      "Bodo Kham": "Bodo Musical Artisan's Association",
      "Bodo Keradapini": "Bodo Ethnic Agro Food Producer's Association",
      "Bodo Dokhona": "Association of Bodo Traditional Weaver",
      "Bodo Gongar Dunja": "Association of Bodo Traditional Weaver",
      "Bodo Gongar Dunjia": "Bodo Ethnic Agro Food Producer's Association",
      "Bodo Ondla": "Association of Traditional Food Products",
      "Bodo Eri Silk": "Association of Bodo Traditional Weaver",
      "Bodo Indi Silk": "Association of Bodo Traditional Weaver",
      "Bodo Gamus": "Association of Bodo Traditional Weaver",
      "Bodo Jomgra": "Bodo Musical Artisan's Association",
    };

    // Check for exact match first
    if (PRODUCT_ASSOCIATIONS[productName]) {
      console.log(`✅ Found exact match: ${PRODUCT_ASSOCIATIONS[productName]}`);
      return PRODUCT_ASSOCIATIONS[productName];
    }

    // Check for partial matches (in case of slight variations)
    for (const [key, value] of Object.entries(PRODUCT_ASSOCIATIONS)) {
      if (
        productName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(productName.toLowerCase())
      ) {
        console.log(`✅ Found partial match: ${value} for key: ${key}`);
        return value;
      }
    }

    // Default fallback
    console.log(`⚠️ No match found, using default association`);
    return "Bodo Traditional Producers Association";
  } catch (error) {
    console.error("❌ Error fetching product association:", error);
    return "Bodo Traditional Producers Association";
  }
}

// Helper function to get association stamp by association name
async function getAssociationStamp(
  associationName: string,
): Promise<string | null> {
  console.log(`🔍 Looking up stamp for association: "${associationName}"`);

  try {
    // First try exact match
    let associationResult = await dbQuery(
      `SELECT stamp_image_path FROM associations WHERE name = ? LIMIT 1`,
      [associationName],
    );

    // If no exact match, try fuzzy matching (remove hyphens, extra spaces, etc.)
    if (associationResult.length === 0) {
      console.log(`🔄 Trying fuzzy match for: ${associationName}`);
      const normalizedInput = associationName.replace(/[-\s]+/g, " ").trim();

      associationResult = await dbQuery(
        `SELECT stamp_image_path FROM associations WHERE REPLACE(REPLACE(name, '-', ' '), '  ', ' ') = ? LIMIT 1`,
        [normalizedInput],
      );
    }

    console.log(`📋 Association query result:`, associationResult);

    if (associationResult.length > 0 && associationResult[0].stamp_image_path) {
      console.log(
        `✅ Found association stamp: ${associationResult[0].stamp_image_path}`,
      );
      return associationResult[0].stamp_image_path;
    }

    console.log(`⚠️ No stamp found for association: ${associationName}`);
    return null;
  } catch (error) {
    console.error("❌ Error fetching association stamp:", error);
    return null;
  }
}

// Helper to get both stamp and registration short form (registration_number) from associations
async function getAssociationDetails(associationName: string): Promise<{
  stamp_image_path: string | null;
  registration_number: string | null;
}> {
  console.log(
    `🔍 Looking up association details (stamp, short form) for: "${associationName}"`,
  );
  try {
    // Exact match first
    let rows = await dbQuery(
      `SELECT stamp_image_path, registration_number FROM associations WHERE name = ? LIMIT 1`,
      [associationName],
    );

    if (rows.length === 0) {
      // Fuzzy match on normalized name
      const normalizedInput = associationName.replace(/[-\s]+/g, " ").trim();
      rows = await dbQuery(
        `SELECT stamp_image_path, registration_number FROM associations WHERE REPLACE(REPLACE(name, '-', ' '), '  ', ' ') = ? LIMIT 1`,
        [normalizedInput],
      );
    }

    if (rows.length > 0) {
      const { stamp_image_path, registration_number } = rows[0] as any;
      return {
        stamp_image_path: stamp_image_path || null,
        registration_number:
          (registration_number && String(registration_number).trim()) || null,
      };
    }

    return { stamp_image_path: null, registration_number: null };
  } catch (error) {
    console.error("❌ Error fetching association details:", error);
    return { stamp_image_path: null, registration_number: null };
  }
}

// Helper functions for product-specific exports
async function generateProductFormGI3AHtml(
  registration: any,
  productName: string,
): Promise<string> {
  const registrationDate = new Date(registration.created_at).toLocaleDateString(
    "en-GB",
  );

  // Use association from registration data if available, otherwise use static mapping
  let associationName = registration.product_association;
  if (!associationName) {
    console.log(
      `⚠️ No association found in registration data, using static mapping for: ${productName}`,
    );
    associationName = await getProductAssociation(productName);
  } else {
    console.log(
      `✅ Using association from database: ${associationName} for product: ${productName}`,
    );
  }

  // Get signature image HTML if available
  console.log("🔍 Form GI 3A Generation Debug:");
  console.log("- Registration Name:", registration.name);
  console.log("- Product Name:", productName);
  console.log("- Signature Path:", registration.signature_path);

  const signatureHtml = registration.signature_path
    ? `<img src="${simpleFileStorage.getFileUrl(registration.signature_path)}" alt="Signature" class="signature-image" />`
    : `<div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 10px;"></div>`;

  console.log(
    "- Generated signature HTML:",
    signatureHtml.substring(0, 100) + "...",
  );

  return `
    <div class="form-page">
      <div class="form-header">
        <div class="form-title">Geographical Indications of Goods (Registration & Protection) Act, 1999</div>
        <div class="form-subtitle">Geographical Indications of Goods (Registration & Protection) Rules, 2002</div>

        <div class="form-number">Form GI 3A</div>

        <div class="application-title">Application for the Registration of an Authorized User</div>
        <div class="rule-reference">Section 17 (1), Rule 56 (1)</div>
      </div>

      <div class="form-content">
        <div class="form-field">
          <span class="field-number">1.</span>
          <span class="field-label">Name of the Applicant (proposed Authorized user):</span>
          <span class="field-value">${registration.name}</span>
        </div>

        <div class="form-field">
          <span class="field-number">2.</span>
          <span class="field-label">Address of the applicant:</span>
          <span class="field-value">${registration.address}</span>
        </div>

        <div class="form-field">
          <span class="field-number">3.</span>
          <span class="field-label">Address of service (if different from Above):</span>
          <span class="field-value">Same as above</span>
        </div>

        <div class="form-field">
          <span class="field-number">4.</span>
          <span class="field-label">Registered Geographical Indication for which application is made:</span>
          <span class="field-value">${productName}</span>
        </div>

        <div class="form-field">
          <span class="field-number">5.</span>
          <span class="field-label">Email id:</span>
          <span class="field-value">${registration.email || "Not provided"}</span>
        </div>

        <div class="form-field">
          <span class="field-number">6.</span>
          <span class="field-label">Phone/mobile number:</span>
          <span class="field-value">${registration.phone}</span>
        </div>

        <div class="declaration-section">
          <div class="declaration-title">Declaration:</div>

          <div class="declaration-item">
            <strong>1.</strong> I hereby declare that I have enclosed the statement of case and evidence of due service of copy of my application to the registered proprietor (${associationName}) for (${productName}), registered as a Geographical Indication.
          </div>

          <div class="declaration-item">
            <strong>2.</strong> I also declare that all the above information is true and correct to the best of my knowledge and belief.
          </div>

          <div class="declaration-item">
            <strong>3.</strong> I undertake that if any of the information is found incorrect or false, my application may be rejected and if already accepted, my registration may be revoked and my name removed from Part B of the register.
          </div>
        </div>

        <div class="signature-section">
          <div class="date-place">
            <div style="margin-bottom: 20px;">
              <strong>Date:</strong> <span class="underline">${registrationDate}</span>
            </div>
            <div>
              <strong>Place:</strong> <span class="underline">Bodoland</span>
            </div>
          </div>

          <div class="signature-area">
            ${signatureHtml}
            <div class="signature-label">
              <strong>SIGNATURE</strong><br>
              (${registration.name})
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function generateProductNOCHtml(
  registration: any,
  productName: string,
  productId?: number,
): Promise<string> {
  const certificateDate = new Date().toLocaleDateString("en-GB");

  // Resolve product ID: prefer explicit productId param, otherwise lookup by product name
  let productIdNumber = productId;
  if (!productIdNumber && productName) {
    try {
      const p = await dbQuery(
        `SELECT id FROM products WHERE name = ? LIMIT 1`,
        [productName],
      );
      if (p && p.length > 0) productIdNumber = p[0].id;
    } catch (err) {
      console.error("Error resolving product ID for NOC:", err);
    }
  }
  const displayProductId = productIdNumber
    ? productIdNumber.toString()
    : "Not specified";

  // Use association from registration data if available, otherwise use static mapping
  let organizationName = registration.product_association;
  if (!organizationName) {
    console.log(
      `⚠️ No association found in registration data for NOC, using static mapping for: ${productName}`,
    );
    organizationName = await getProductAssociation(productName);
  } else {
    console.log(
      `✅ Using association from database for NOC: ${organizationName} for product: ${productName}`,
    );
  }

  const giArea = "Bodoland Territorial Area Districts (BTAD)";

  // Get association stamp for NOC signature
  const associationStampPath = await getAssociationStamp(organizationName);
  let signatureHtml = `<div class="signature-line"></div>`;
  if (associationStampPath) {
    const stampUrl = simpleFileStorage.getFileUrl(associationStampPath);
    signatureHtml = `<img src="${stampUrl}" alt="Association Stamp" style="max-width: 250px; max-height: 80px; object-fit: contain; margin: 30px auto; display: block; border: 2px solid #000; padding: 10px; background: #fff;" />`;
    console.log(`✅ Using association stamp in NOC: ${stampUrl}`);
  } else {
    console.log(`⚠️ No association stamp found for NOC: ${organizationName}`);
  }

  return `
    <div class="noc-page">
      <div class="noc-header">
        <div class="noc-title">No Objection Certificate (NOC)</div>
      </div>

      <div class="noc-content">
        <div class="noc-paragraph">
          This is to certify that <span class="highlight">${registration.name}</span> is a producer of <span class="highlight">${productName}</span>, bearing GI Application No. <span class="highlight">${displayProductId}</span>, and the said proposed Authorised User is the producer within the designated <span class="highlight">${giArea}</span> GI Area.
        </div>
      </div>

      <div class="signature-section">
        <div class="date-place">
          <div><strong>Date:</strong> <span class="underline-field">${certificateDate}</span></div>
          <br>
          <div><strong>Place:</strong> <span class="underline-field">Bodoland</span></div>
        </div>

        <div class="signature-area">
          <div><strong>For and on behalf of</strong></div>
          <div class="organization-name">${organizationName}</div>

          ${signatureHtml}

          <div class="signature-label">
            (Signature of GI Applicant's Association/ Organisation Head)
          </div>
        </div>
      </div>
    </div>
  `;
}

async function generateProductStatementHtml(
  registration: any,
  productName: string,
  productId: number | null = null,
): Promise<string> {
  const statementDate = new Date().toLocaleDateString("en-GB");

  // Use association from registration data if available, otherwise use static mapping
  let organizationName = registration.product_association;
  if (!organizationName) {
    console.log(
      `⚠️ No association found in registration data for Statement, using static mapping for: ${productName}`,
    );
    organizationName = await getProductAssociation(productName);
  } else {
    console.log(
      `✅ Using association from database for Statement: ${organizationName} for product: ${productName}`,
    );
  }

  const giArea = "Bodoland Territorial Area Districts (BTAD)";

  const registrationYear = registration.created_at
    ? new Date(registration.created_at).getFullYear()
    : new Date().getFullYear();
  const currentYear = new Date().getFullYear();

  // Resolve production and turnover dynamically
  let estimatedProduction = "Not specified";
  let turnoverAmount = "";
  let turnoverWords = "";

  try {
    let rows = await dbQuery(
      `SELECT annual_production, unit, annual_turnover, turnover_unit, years_of_production
       FROM user_production_details
       WHERE registration_id = ? AND ${productId ? "product_id = ?" : "product_name = ?"}
       ORDER BY id DESC LIMIT 1`,
      [registration.id, productId ? productId : productName],
    );

    if (!rows || rows.length === 0) {
      // Fallback: any latest production detail for this registration
      rows = await dbQuery(
        `SELECT annual_production, unit, annual_turnover, turnover_unit, years_of_production
         FROM user_production_details
         WHERE registration_id = ?
         ORDER BY id DESC LIMIT 1`,
        [registration.id],
      );
    }

    const detail = rows && rows[0];

    // Determine years of production: prefer explicit value from production detail, then registration, else compute from registration date
    let yearsOfExperience: number | null = null;
    if (detail && detail.years_of_production) {
      yearsOfExperience = parseInt(String(detail.years_of_production)) || null;
    } else if (registration.years_of_production) {
      yearsOfExperience =
        parseInt(String(registration.years_of_production)) || null;
    } else if (registration.created_at) {
      yearsOfExperience = Math.max(1, currentYear - registrationYear);
    } else {
      yearsOfExperience = 1;
    }

    console.log("🔎 Statement data lookup:", {
      productId,
      productName,
      rowsFound: rows ? rows.length : 0,
      detail,
      regAnnualProduction: registration.annual_production,
      regAnnualTurnover: registration.annual_turnover,
      regTurnoverUnit: registration.turnover_unit,
    });

    const toRupees = (amount: number, unit?: string | null): number => {
      const u = (unit || "").toLowerCase();
      if (["lakh", "lakhs"].includes(u)) return Math.round(amount * 100000);
      if (["crore", "crores", "cr"].includes(u))
        return Math.round(amount * 10000000);
      if (["thousand", "thousands", "k"].includes(u))
        return Math.round(amount * 1000);
      if (["hundred", "hundreds", "h"].includes(u))
        return Math.round(amount * 100);
      return Math.round(amount);
    };

    const formatINR = (val: number): string => {
      try {
        return new Intl.NumberFormat("en-IN").format(Math.round(val));
      } catch {
        return Math.round(val).toString();
      }
    };

    const numberToWordsIndian = (num: number): string => {
      if (num === 0) return "Zero";
      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];
      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
      ];
      const toWordsBelowThousand = (n: number): string => {
        let str = "";
        if (Math.floor(n / 100) > 0) {
          str += ones[Math.floor(n / 100)] + " Hundred ";
          n = n % 100;
        }
        if (n > 0) {
          if (n < 20) str += ones[n] + " ";
          else
            str +=
              tens[Math.floor(n / 10)] +
              (n % 10 ? " " + ones[n % 10] : "") +
              " ";
        }
        return str.trim();
      };
      const crore = Math.floor(num / 10000000);
      num %= 10000000;
      const lakh = Math.floor(num / 100000);
      num %= 100000;
      const thousand = Math.floor(num / 1000);
      num %= 1000;
      const rest = num;
      let words = "";
      if (crore) words += toWordsBelowThousand(crore) + " Crore ";
      if (lakh) words += toWordsBelowThousand(lakh) + " Lakh ";
      if (thousand) words += toWordsBelowThousand(thousand) + " Thousand ";
      if (rest) words += toWordsBelowThousand(rest);
      return words.trim();
    };

    if (detail && (detail.annual_production || detail.unit)) {
      estimatedProduction =
        `${detail.annual_production || ""} ${detail.unit || ""}`.trim();
    } else if (registration.annual_production) {
      estimatedProduction = `${registration.annual_production}`;
    } else {
      estimatedProduction =
        registration.age > 40 ? "500-1000 kg" : "250-500 kg";
    }

    let amountNum: number | null = null;
    let amountUnit: string | null = null;
    if (detail && detail.annual_turnover) {
      amountNum = parseFloat(detail.annual_turnover as any);
      amountUnit = detail.turnover_unit || null;
    } else if (registration.annual_turnover) {
      amountNum = parseFloat(registration.annual_turnover as any);
      amountUnit = registration.turnover_unit || null;
    }

    if (amountNum !== null && !isNaN(amountNum)) {
      const rupees = toRupees(amountNum, amountUnit || undefined);
      turnoverAmount = `₹${formatINR(rupees)}`;
      turnoverWords = `${numberToWordsIndian(rupees)} Only`;
    } else {
      turnoverAmount = registration.age > 40 ? "₹2,50,000" : "₹1,50,000";
      turnoverWords =
        registration.age > 40
          ? "Two Lakh Fifty Thousand Only"
          : "One Lakh Fifty Thousand Only";
    }
    console.log("✅ Resolved Statement values:", {
      estimatedProduction,
      turnoverAmount,
      turnoverWords,
    });
  } catch (err) {
    console.error("Error resolving production/turnover for Statement:", err);
  }

  // Get signature image HTML if available
  console.log("🔍 Statement Generation Debug:");
  console.log("- Registration Name:", registration.name);
  console.log("- Product Name:", productName);
  console.log("- Signature Path:", registration.signature_path);

  const signatureHtml = registration.signature_path
    ? `<img src="${simpleFileStorage.getFileUrl(registration.signature_path)}" alt="Signature" class="statement-signature-image" />`
    : `<div class="signature-line"></div>`;

  console.log(
    "- Generated signature HTML:",
    signatureHtml.substring(0, 100) + "...",
  );

  return `
    <div class="statement-page">
      <div class="statement-header">
        <div class="statement-title">STATEMENT OF CASE</div>
      </div>

      <div class="statement-content">
        <div class="statement-paragraph">
          I, <span class="highlight">${registration.name}</span>, aged about <span class="highlight">${registration.age}</span> years, having address at <span class="highlight">${registration.address}</span>, I am the producer of <span class="highlight">${productName}</span>.
        </div>

        <div class="statement-paragraph">
          I have applied for registration as an "Authorized User" for Registered Geographical Indication, <span class="highlight">${productName}</span>, and the No Objection Certificate received from the registered proprietor of <span class="organization-name">${organizationName}</span> is attached for your reference.
        </div>

        <div class="statement-paragraph">
          I am involved in the process production of <span class="highlight">${productName}</span> since <span class="highlight">${yearsOfExperience}</span> years within the designated <span class="highlight">${giArea}</span> GI Area.
        </div>

        <div class="statement-paragraph">
          That my estimated production trading relating <span class="highlight">${productName}</span> is about <span class="highlight">${estimatedProduction}</span> per year and as on date the annual turnover is approximately <span class="currency highlight">${turnoverAmount}</span>/- (<span class="highlight">${turnoverWords}</span>).
        </div>

        <div class="statement-paragraph">
          I herein undertake, I am aware and shall adhere and confirm to all the regulating criteria (present and future) relating to specification/description and quality as set forth by the Inspection Body setup by the Registered Proprietor of <span class="highlight">${productName}</span>.
        </div>

        <div class="statement-paragraph">
          I reiterate that the particulars set out herein are true to the best of my knowledge, information and belief.
        </div>
      </div>

      <div class="signature-section">
        <div class="date-place">
          <div><strong>Dated:</strong> <span class="underline-field">${statementDate}</span></div>
          <br>
          <div><strong>Place:</strong> <span class="underline-field">Bodoland</span></div>
        </div>

        <div class="signature-area">
          ${signatureHtml}

          <div class="signature-label">
            (Signature and Name of the Authorised User)<br>
            <strong>${registration.name}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function exportProductCard(req: Request, res: Response) {
  try {
    const { registrationId, productId, productName } = req.body;

    if (!registrationId || (!productId && !productName)) {
      return res.status(400).json({
        error: "Registration ID and productId or productName is required",
      });
    }

    // Fetch registration data
    const registrations = await dbQuery(
      `
      SELECT
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.phone,
        ur.email,
        ur.aadhar_number,
        ur.voter_id,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        ur.annual_production,
        ur.annual_turnover,
        ur.turnover_unit
      FROM user_registrations ur
      WHERE ur.id = ?
    `,
      [registrationId],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Fetch product association and category from database (prefer productId when provided)
    const productData = await dbQuery(
      `SELECT p.*, pc.name as category_name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id WHERE ${productId ? "p.id = ?" : "p.name = ?"} LIMIT 1`,
      [productId ? productId : productName],
    );

    const registration = registrations[0];
    const resolvedProductName =
      productName || (productData[0] && (productData[0] as any).name) || "";
    registration.product_names = resolvedProductName;
    registration.product_association =
      productData.length > 0 ? (productData[0] as any).description : null;
    // Attach category name for dynamic header
    console.log("🔍 Product lookup:", {
      productId,
      productName: resolvedProductName,
      productDataCount: productData.length,
    });
    if (productData.length > 0 && (productData[0] as any).category_name) {
      console.log(
        "✅ Found category from product:",
        (productData[0] as any).category_name,
      );
      (registration as any).category_names = (productData[0] as any)
        .category_name as string;
    } else {
      // Fallback A: derive category from mapping tables for this registration+product
      const mapRows = await dbQuery(
        `SELECT pc.name as category_name
       FROM products p
       JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN user_existing_products uep ON uep.product_id = p.id AND uep.registration_id = ?
       LEFT JOIN user_selected_products usp ON usp.product_id = p.id AND usp.registration_id = ?
       WHERE ${productId ? "p.id = ?" : "p.name = ?"} AND (uep.id IS NOT NULL OR usp.id IS NOT NULL)
       LIMIT 1`,
        [
          registrationId,
          registrationId,
          productId ? productId : resolvedProductName,
        ],
      );
      if (mapRows.length > 0) {
        console.log(
          "✅ Found category from mapping:",
          mapRows[0].category_name,
        );
        (registration as any).category_names = mapRows[0]
          .category_name as string;
      } else {
        // Fallback B: derive category from registration's categories (least specific)
        const catRows = await dbQuery(
          `SELECT pc.name as category_name FROM user_registration_categories urc JOIN product_categories pc ON urc.category_id = pc.id WHERE urc.registration_id = ? LIMIT 1`,
          [registrationId],
        );
        if (catRows.length > 0) {
          console.log(
            "✅ Found category from registration:",
            catRows[0].category_name,
          );
          (registration as any).category_names = catRows[0]
            .category_name as string;
        } else {
          console.log("⚠️ No category found, using default");
          (registration as any).category_names = "Textile Products"; // Default for this registration
        }
      }
    }

    // Generate HTML for the specific product card
    const cardHtml = await generateProductCardHtml(
      registration,
      resolvedProductName,
    );

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Producer Card - ${resolvedProductName}</title>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }

        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }

        .card {
          width: 200mm;
          height: 130mm;
          border: 4px solid #2c3e50;
          margin: 0 auto;
          position: relative;
          background: #fff;
          box-sizing: border-box;
          padding: 0;
          border-radius: 8px;
          overflow: hidden;
        }

        .card-header {
          background: #2c3e50;
          color: white;
          text-align: center;
          padding: 12px;
          font-weight: bold;
          font-size: 18px;
          margin: 0;
          letter-spacing: 1px;
        }

        .card-content {
          padding: 20px;
          height: calc(100% - 70px);
          display: flex;
          position: relative;
        }

        .left-section {
          flex: 1;
          padding-right: 20px;
        }

        .right-section {
          width: 120px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 15px;
        }

        .field {
          margin-bottom: 10px;
          font-size: 12px;
          line-height: 1.4;
        }

        .field-label {
          font-weight: bold;
          display: inline-block;
          min-width: 140px;
          color: #2c3e50;
        }

        .field-value {
          color: #34495e;
          font-weight: 500;
        }

        .profile-photo {
          width: 100px;
          height: 120px;
          border: 2px solid #bdc3c7;
          background: #ecf0f1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #7f8c8d;
          text-align: center;
          object-fit: cover;
          border-radius: 4px;
        }

        .membership-box {
          text-align: center;
          background: #ecf0f1;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #bdc3c7;
          width: 100px;
        }

        .membership-no {
          font-weight: bold;
          font-size: 11px;
          color: #2c3e50;
          line-height: 1.2;
        }

        .signature-section {
          position: absolute;
          bottom: 25px;
          left: 20px;
          right: 140px;
        }

        .signature-label {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #2c3e50;
        }

        .signature-box {
          width: 180px;
          height: 60px;
          border: 2px solid #bdc3c7;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #7f8c8d;
          border-radius: 4px;
        }

        .signature-stamp {
          max-width: 170px;
          max-height: 55px;
          object-fit: contain;
        }

        .yellow-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 12px;
          background: linear-gradient(90deg, #f1c40f 0%, #f39c12 100%);
        }
      </style>
    </head>
    <body>
      ${cardHtml}
    </body>
    </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="producer-card.html"',
    );
    res.send(fullHtml);
  } catch (error) {
    console.error("Export Product Card error:", error);
    if (error instanceof Error && error.message.startsWith("CARD_EXPORT_")) {
      return res.status(400).send(error.message);
    }
    return res.status(500).json({ error: "Failed to export producer card" });
  }
}

async function generateProductCardHtml(
  registration: any,
  productName: string,
): Promise<string> {
  // Get photo URL if available
  let photoHtml = `<div class="profile-photo">Profile Photo</div>`;
  if (registration.photo_path) {
    const photoUrl = simpleFileStorage.getFileUrl(registration.photo_path);
    photoHtml = `<img src="${photoUrl}" alt="Profile Photo" class="profile-photo" />`;
  }

  // Get association stamp instead of user signature for Card export
  let signatureHtml = `<div class="signature-box">Stamp or Sign of the Association Head:<br/>Signature</div>`;

  // Use association from registration data if available, otherwise use static mapping
  let associationName = registration.product_association;
  if (!associationName) {
    console.log(
      `⚠️ No association found in registration data for Card, using static mapping for: ${productName}`,
    );
    associationName = await getProductAssociation(productName);
  } else {
    console.log(
      `✅ Using association from database for Card: ${associationName} for product: ${productName}`,
    );
  }

  // Fetch association details (stamp + short form)
  const assoc = await getAssociationDetails(associationName);

  // Enforce: no fallback. registration_number must exist in associations
  if (!assoc.registration_number) {
    throw new Error(
      `CARD_EXPORT_MISSING_SHORTFORM: Association registration_number not found for "${associationName}"`,
    );
  }
  const membershipNo = `${assoc.registration_number} - ${registration.id.toString().padStart(2, "0")}`;

  // Use association stamp if present
  if (assoc.stamp_image_path) {
    const stampUrl = simpleFileStorage.getFileUrl(assoc.stamp_image_path);
    signatureHtml = `<img src="${stampUrl}" alt="Association Stamp" class="signature-stamp" />`;
    console.log(`✅ Using association stamp: ${stampUrl}`);
  } else {
    console.log(`⚠️ No association stamp found for: ${associationName}`);
  }

  // Format registration date
  const registrationDate = new Date(registration.created_at).toLocaleDateString(
    "en-GB",
  );

  const normalizeCategoryTitle = (raw?: string) => {
    const name = (raw || "").toLowerCase();
    if (name.includes("textile")) return "TEXTILE PRODUCTS";
    if (name.includes("beverage")) return "BEVERAGE PRODUCTS";
    if (name.includes("musical")) return "MUSICAL INSTRUMENT PRODUCTS";
    if (name.includes("agriculture")) return "AGRICULTURE PRODUCTS";
    if (name.includes("food")) return "FOOD PRODUCTS";
    return (raw || "PRODUCTS").toUpperCase();
  };
  const categoryTitle = normalizeCategoryTitle(
    registration.category_names && registration.category_names.split(",")[0],
  );

  return `
    <div class="card">
      <div class="card-header">
        ${categoryTitle} – PRODUCER'S CARD
      </div>

      <div class="card-content">
        <div class="left-section">
          <div class="field">
            <span class="field-label">Date of Registration:</span>
            <span class="field-value">${registrationDate}</span>
          </div>

          <div class="field">
            <span class="field-label">Name:</span>
            <span class="field-value">${registration.name}</span>
          </div>

          <div class="field">
            <span class="field-label">Address:</span>
            <span class="field-value">${registration.address}</span>
          </div>

          <div class="field">
            <span class="field-label">Age:</span>
            <span class="field-value">${registration.age}</span>
          </div>

          <div class="field">
            <span class="field-label">Mobile Number:</span>
            <span class="field-value">${registration.phone}</span>
          </div>

          <div class="field">
            <span class="field-label">Products Name:</span>
            <span class="field-value">${productName}</span>
          </div>

          <div class="field">
            <span class="field-label">Card Issued By (Association Name):</span>
            <span class="field-value">${associationName}</span>
          </div>
        </div>

        <div class="right-section">
          <div class="membership-box">
            <div class="membership-no">Membership No:</div>
            <div class="membership-no">${membershipNo}</div>
          </div>

          ${photoHtml}
        </div>

        <div class="signature-section">
          <div class="signature-label">Stamp or Sign of the Association Head:</div>
          ${signatureHtml}
        </div>

        <div class="yellow-footer"></div>
      </div>
    </div>
  `;
}
