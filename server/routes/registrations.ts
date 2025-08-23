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

// Product-specific export functions
export async function exportProductGI3A(req: Request, res: Response) {
  try {
    const { registrationId, productId, productName } = req.body;

    if (!registrationId || !productName) {
      return res.status(400).json({
        error: "Registration ID and product name are required"
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
        ur.signature_path
      FROM user_registrations ur
      WHERE ur.id = ?
    `,
      [registrationId],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const registration = registrations[0];
    registration.product_names = productName;

    // Generate HTML for the specific product
    const formHtml = await generateProductFormGI3AHtml(registration, productName);

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
        error: "Registration ID and product name are required"
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
        ur.signature_path
      FROM user_registrations ur
      WHERE ur.id = ?
    `,
      [registrationId],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const registration = registrations[0];

    // Generate HTML for the specific product
    const nocHtml = await generateProductNOCHtml(registration, productName);

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>NOC - ${productName}</title>
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
        error: "Registration ID and product name are required"
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
        ur.signature_path
      FROM user_registrations ur
      WHERE ur.id = ?
    `,
      [registrationId],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const registration = registrations[0];

    // Generate HTML for the specific product
    const statementHtml = await generateProductStatementHtml(registration, productName);

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
      </style>
    </head>
    <body>
      ${statementHtml}
    </body>
    </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", 'inline; filename="statement-of-case.html"');
    res.send(fullHtml);
  } catch (error) {
    console.error("Export Product Statement error:", error);
    res.status(500).json({ error: "Failed to export Statement of Case" });
  }
}

// Product-to-Association mapping
const PRODUCT_ASSOCIATIONS: { [key: string]: string } = {
  "Bodo Aronai": "Association of Bodo Traditional Weaver",
  "Bodo Gamsa": "Association of Bodo Traditional Weaver",
  "Bodo Napham": "Association of Traditional Food Products",
  "Bodo Kham": "Bodo Musical Artisan's Association",
  "Bodo Keradapini": "Bodo Ethnic- Agro Food Producer's Association",
  "Bodo Dokhona": "Association of Bodo Traditional Weaver",
  "Bodo Gongar Dunja": "Association of Bodo Traditional Weaver",
  "Bodo Eri Silk": "Association of Bodo Traditional Weaver",
  "Bodo Indi Silk": "Association of Bodo Traditional Weaver",
  "Bodo Gamus": "Association of Bodo Traditional Weaver",
  "Bodo Jomgra": "Bodo Musical Artisan's Association",
};

function getProductAssociation(productName: string): string {
  // Check for exact match first
  if (PRODUCT_ASSOCIATIONS[productName]) {
    return PRODUCT_ASSOCIATIONS[productName];
  }

  // Check for partial matches (in case of slight variations)
  for (const [key, value] of Object.entries(PRODUCT_ASSOCIATIONS)) {
    if (productName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(productName.toLowerCase())) {
      return value;
    }
  }

  // Default fallback
  return "Bodo Traditional Producers Association";
}

// Helper functions for product-specific exports
async function generateProductFormGI3AHtml(registration: any, productName: string): Promise<string> {
  const registrationDate = new Date(registration.created_at).toLocaleDateString("en-GB");
  const associationName = getProductAssociation(productName);

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
            <div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 10px;"></div>
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

async function generateProductNOCHtml(registration: any, productName: string): Promise<string> {
  const certificateDate = new Date().toLocaleDateString("en-GB");
  const appNumber = `GI-BODO-${new Date().getFullYear()}-${registration.id.toString().padStart(4, "0")}`;
  const organizationName = getProductAssociation(productName);
  const giArea = "Bodoland Territorial Area Districts (BTAD)";

  return `
    <div class="noc-page">
      <div class="noc-header">
        <div class="noc-title">No Objection Certificate (NOC)</div>
      </div>

      <div class="noc-content">
        <div class="noc-paragraph">
          This is to certify that <span class="highlight">${registration.name}</span> is a producer of "<span class="highlight">${productName}</span>", bearing GI Application No. <span class="highlight">${appNumber}</span>, and the said proposed Authorised User is the producer within the designated GI Area.
        </div>

        <div class="noc-paragraph">
          We, <span class="organization-name">${organizationName}</span>, the Registered Proprietor/Applicant of the said Geographical Indication, have no objection to the registration of <span class="highlight">${registration.name}</span> as an Authorised User for <span class="highlight">${productName}</span>.
        </div>

        <div class="noc-paragraph">
          The Authorised User is expected to adhere to the quality standards maintained as per registered GI. In case of any independent modification in cultivation or processing methods of "<span class="highlight">${productName}</span>" is done in <span class="highlight">${giArea}</span> by the said Authorised Users, then <span class="organization-name">${organizationName}</span> shall not be held responsible for any resulting actions by the competent authority.
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

          <div class="signature-line"></div>

          <div class="signature-label">
            (Signature of GI Applicant's Association/ Organisation Head)
          </div>
        </div>
      </div>
    </div>
  `;
}

async function generateProductStatementHtml(registration: any, productName: string): Promise<string> {
  const statementDate = new Date().toLocaleDateString("en-GB");
  const organizationName = "Bodo Traditional Food Producers Association";
  const giArea = "Bodoland Territorial Area Districts (BTAD)";

  const registrationYear = new Date(registration.created_at).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsOfExperience = Math.max(2, currentYear - registrationYear + 2);

  const estimatedProduction = registration.age > 40 ? "500-1000 kg" : "250-500 kg";
  const turnoverAmount = registration.age > 40 ? "₹2,50,000" : "₹1,50,000";
  const turnoverWords = registration.age > 40 ? "Two Lakh Fifty Thousand Only" : "One Lakh Fifty Thousand Only";

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
          <div class="signature-line"></div>

          <div class="signature-label">
            (Signature and Name of the Authorised User)<br>
            <strong>${registration.name}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}
