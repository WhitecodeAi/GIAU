import { Request, Response } from "express";
import { dbQuery } from "../config/database";
import { simpleFileStorage } from "../utils/simpleFileStorage";
import fs from "fs";
import path from "path";

interface ExportRequest {
  registrationIds: number[];
}

interface RegistrationData {
  id: number;
  name: string;
  address: string;
  age: number;
  phone: string;
  aadhar_number?: string;
  voter_id?: string;
  created_at: string;
  photo_path?: string;
  signature_path?: string;
  category_names: string;
  product_names?: string;
  production_summary: string;
}

export async function exportUsersWithDateRange(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    // Fetch user registrations data within date range
    const registrations = await dbQuery(
      `
      SELECT
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.gender,
        ur.phone,
        ur.email,
        ur.aadhar_number,
        ur.voter_id,
        ur.pan_number,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        GROUP_CONCAT(DISTINCT pc.name) as category_names,
        GROUP_CONCAT(DISTINCT p.name) as product_names,
        u.username,
        u.email as user_email
      FROM user_registrations ur
      LEFT JOIN users u ON ur.user_id = u.id
      LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
      LEFT JOIN product_categories pc ON urc.category_id = pc.id
      LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
      LEFT JOIN products p ON usp.product_id = p.id
      WHERE DATE(ur.created_at) BETWEEN ? AND ?
      GROUP BY ur.id
      ORDER BY ur.created_at DESC
    `,
      [startDate, endDate],
    );

    if (registrations.length === 0) {
      return res
        .status(404)
        .json({ error: "No registrations found in the specified date range" });
    }

    // Create CSV content
    const csvHeaders = [
      "ID",
      "Name",
      "Address",
      "Age",
      "Gender",
      "Phone",
      "Email",
      "Aadhar Number",
      "Voter ID",
      "PAN Number",
      "Categories",
      "Products",
      "Username",
      "User Email",
      "Registration Date",
    ];

    const csvRows = registrations.map((reg) => [
      reg.id,
      `"${reg.name}"`,
      `"${reg.address}"`,
      reg.age,
      reg.gender,
      reg.phone,
      reg.email || "",
      reg.aadhar_number || "",
      reg.voter_id || "",
      reg.pan_number || "",
      `"${reg.category_names || ""}"`,
      `"${reg.product_names || ""}"`,
      reg.username || "",
      reg.user_email || "",
      new Date(reg.created_at).toLocaleDateString("en-GB"),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // Set headers for CSV download
    const filename = `users_export_${startDate}_to_${endDate}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({ error: "Failed to export users data" });
  }
}

export async function exportRegistrationsByUser(req: Request, res: Response) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // First verify user exists and get username
    const userResult = await dbQuery(
      "SELECT id, username, email FROM users WHERE id = ?",
      [userId],
    );

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult[0];

    // Fetch all registrations for this user
    const registrations = await dbQuery(
      `
      SELECT
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.gender,
        ur.phone,
        ur.email,
        ur.aadhar_number,
        ur.voter_id,
        ur.pan_number,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        GROUP_CONCAT(DISTINCT pc.name) as category_names,
        GROUP_CONCAT(DISTINCT p.name) as product_names
      FROM user_registrations ur
      LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
      LEFT JOIN product_categories pc ON urc.category_id = pc.id
      LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
      LEFT JOIN products p ON usp.product_id = p.id
      WHERE ur.user_id = ?
      GROUP BY ur.id
      ORDER BY ur.created_at DESC
    `,
      [userId],
    );

    if (registrations.length === 0) {
      return res
        .status(404)
        .json({ error: "No registrations found for this user" });
    }

    // Create CSV content
    const csvHeaders = [
      "ID",
      "Name",
      "Address",
      "Age",
      "Gender",
      "Phone",
      "Email",
      "Aadhar Number",
      "Voter ID",
      "PAN Number",
      "Categories",
      "Products",
      "Registration Date",
    ];

    const csvRows = registrations.map((reg) => [
      reg.id,
      `"${reg.name}"`,
      `"${reg.address}"`,
      reg.age,
      reg.gender,
      reg.phone,
      reg.email || "",
      reg.aadhar_number || "",
      reg.voter_id || "",
      reg.pan_number || "",
      `"${reg.category_names || ""}"`,
      `"${reg.product_names || ""}"`,
      new Date(reg.created_at).toLocaleDateString("en-GB"),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // Set headers for CSV download
    const filename = `registrations_by_${user.username}_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Export registrations by user error:", error);
    res.status(500).json({ error: "Failed to export registrations" });
  }
}

export async function exportUsersByProducts(req: Request, res: Response) {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "Product IDs are required" });
    }

    // Get product names for filename
    const placeholders = productIds.map(() => "?").join(",");
    const products = await dbQuery(
      `SELECT id, name FROM products WHERE id IN (${placeholders})`,
      productIds,
    );

    if (products.length === 0) {
      return res.status(404).json({ error: "No products found" });
    }

    // Fetch users who are producing these products
    const registrations = await dbQuery(
      `
      SELECT DISTINCT
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.gender,
        ur.phone,
        ur.email,
        ur.aadhar_number,
        ur.voter_id,
        ur.pan_number,
        ur.created_at,
        u.username,
        u.email as user_email,
        GROUP_CONCAT(DISTINCT pc.name) as category_names,
        GROUP_CONCAT(DISTINCT p.name) as selected_products,
        GROUP_CONCAT(DISTINCT ep.name) as existing_products
      FROM user_registrations ur
      LEFT JOIN users u ON ur.user_id = u.id
      LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
      LEFT JOIN product_categories pc ON urc.category_id = pc.id
      LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
      LEFT JOIN products p ON usp.product_id = p.id
      LEFT JOIN user_existing_products uep ON ur.id = uep.registration_id
      LEFT JOIN products ep ON uep.product_id = ep.id
      WHERE (usp.product_id IN (${placeholders}) OR uep.product_id IN (${placeholders}))
      GROUP BY ur.id
      ORDER BY ur.name, ur.created_at DESC
    `,
      [...productIds, ...productIds],
    );

    if (registrations.length === 0) {
      return res.status(404).json({
        error: "No users found producing the selected products",
      });
    }

    // Create CSV content
    const csvHeaders = [
      "ID",
      "Name",
      "Address",
      "Age",
      "Gender",
      "Phone",
      "Email",
      "Aadhar Number",
      "Voter ID",
      "PAN Number",
      "Categories",
      "Selected Products",
      "Existing Products",
      "Username",
      "User Email",
      "Registration Date",
    ];

    const csvRows = registrations.map((reg) => [
      reg.id,
      `"${reg.name}"`,
      `"${reg.address}"`,
      reg.age,
      reg.gender,
      reg.phone,
      reg.email || "",
      reg.aadhar_number || "",
      reg.voter_id || "",
      reg.pan_number || "",
      `"${reg.category_names || ""}"`,
      `"${reg.selected_products || ""}"`,
      `"${reg.existing_products || ""}"`,
      reg.username || "",
      reg.user_email || "",
      new Date(reg.created_at).toLocaleDateString("en-GB"),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // Create filename with product names
    const productNames = products
      .map((p) => p.name)
      .join("_")
      .replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `users_producing_${productNames}_${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Export users by products error:", error);
    res.status(500).json({ error: "Failed to export users by products" });
  }
}

export async function exportProducerCards(req: Request, res: Response) {
  try {
    const { registrationIds }: ExportRequest = req.body;

    if (!registrationIds || registrationIds.length === 0) {
      return res.status(400).json({ error: "No registration IDs provided" });
    }

    // Fetch registration data
    const placeholders = registrationIds.map(() => "?").join(",");
    const registrations = await dbQuery(
      `
      SELECT 
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.phone,
        ur.aadhar_number,
        ur.voter_id,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        GROUP_CONCAT(DISTINCT pc.name) as category_names,
        GROUP_CONCAT(DISTINCT p.name) as product_names
      FROM user_registrations ur
      LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
      LEFT JOIN product_categories pc ON urc.category_id = pc.id
      LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
      LEFT JOIN products p ON usp.product_id = p.id
      WHERE ur.id IN (${placeholders})
      GROUP BY ur.id
      ORDER BY ur.name
    `,
      registrationIds,
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "No registrations found" });
    }

    // Generate HTML for all cards
    let cardsHtml = "";

    for (const registration of registrations) {
      const cardHtml = await generateCardHtml(registration);
      cardsHtml += cardHtml;
    }

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Producer Cards</title>
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
          margin: 0 auto 15mm auto;
          page-break-after: always;
          position: relative;
          background: #fff;
          box-sizing: border-box;
          padding: 0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .card:last-child {
          page-break-after: avoid;
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
      ${cardsHtml}
    </body>
    </html>
    `;

    // Return HTML for browser-based PDF generation
    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="producer-cards.html"',
    );
    res.send(fullHtml);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Failed to export producer cards" });
  }
}

async function generateCardHtml(
  registration: RegistrationData,
): Promise<string> {
  // Generate membership number (BTF prefix + ID)
  const membershipNo = `BTF - ${registration.id.toString().padStart(2, "0")}`;

  // Get photo URL if available
  let photoHtml = `<div class="profile-photo">No Photo</div>`;
  if (registration.photo_path) {
    const photoUrl = simpleFileStorage.getFileUrl(registration.photo_path);
    photoHtml = `<img src="${photoUrl}" alt="Profile Photo" class="profile-photo" />`;
  }

  // Get signature/stamp if available
  let signatureHtml = `<div class="signature-box">Association Stamp</div>`;
  if (registration.signature_path) {
    const signatureUrl = simpleFileStorage.getFileUrl(
      registration.signature_path,
    );
    signatureHtml = `<img src="${signatureUrl}" alt="Signature" class="signature-stamp" />`;
  }

  // Format registration date
  const registrationDate = new Date(registration.created_at).toLocaleDateString(
    "en-GB",
  );

  // Get primary product name
  const productName =
    registration.product_names?.split(",")[0] ||
    registration.category_names?.split(",")[0] ||
    "Food Product";

  return `
    <div class="card">
      <div class="card-header">
        FOOD PRODUCT – PRODUCER'S CARD
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
            <span class="field-value">Association of Traditional Food Products</span>
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
      </div>
      
      <div class="yellow-footer"></div>
    </div>
  `;
}
