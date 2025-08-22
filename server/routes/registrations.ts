import { Request, Response } from "express";
import { dbQuery, dbRun } from "../config/database";
import { AuthRequest } from "../middleware/auth";
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
        turnoverUnit || "lakh",
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
              detail.turnoverUnit || "lakh",
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
        turnoverUnit || "lakh",
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
