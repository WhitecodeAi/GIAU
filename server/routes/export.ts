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

export async function exportFormGI3A(req: Request, res: Response) {
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
        ur.email,
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

    // Generate HTML for all forms
    let formsHtml = "";

    for (const registration of registrations) {
      const formHtml = await generateFormGI3AHtml(registration);
      formsHtml += formHtml;
    }

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Form GI 3A - Authorized User Applications</title>
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
          margin: 0 auto 30px auto;
          page-break-after: always;
          background: #fff;
          min-height: 100vh;
        }

        .form-page:last-child {
          page-break-after: avoid;
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
          padding-top: 5px;
          margin-left: 50px;
        }

        .signature-label {
          margin-top: 10px;
          font-size: 11pt;
        }

        .signature-image {
          max-width: 200px;
          max-height: 60px;
          object-fit: contain;
          border: 1px solid #000;
          padding: 5px;
          background: #fff;
        }

        .signature-line {
          height: 60px;
          border-bottom: 1px solid #000;
          margin-bottom: 10px;
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
      ${formsHtml}
    </body>
    </html>
    `;

    // Return HTML for browser-based printing
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", 'inline; filename="form-gi-3a.html"');
    res.send(fullHtml);
  } catch (error) {
    console.error("Export Form GI 3A error:", error);
    res.status(500).json({ error: "Failed to export Form GI 3A" });
  }
}

async function generateFormGI3AHtml(
  registration: RegistrationData,
): Promise<string> {
  // Format registration date
  const registrationDate = new Date(registration.created_at).toLocaleDateString(
    "en-GB",
  );

  // Get primary product name for GI
  const primaryProduct =
    registration.product_names?.split(",")[0] ||
    registration.category_names?.split(",")[0] ||
    "Bodo Traditional Food Product";

  // Get signature image URL if available
  const signatureHtml = registration.signature_path
    ? `<img src="${simpleFileStorage.getFileUrl(registration.signature_path)}" alt="Signature" class="signature-image" />`
    : `<div class="signature-line"></div>`;

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
          <span class="field-value">${primaryProduct}</span>
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
            <strong>1.</strong> I hereby declare that I have enclosed the statement of case and evidence of due service of copy of my application to the registered proprietor (Name of GI Applicant Organization) for (${primaryProduct}), registered as a Geographical Indication.
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

export async function exportNOC(req: Request, res: Response) {
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
        ur.email,
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

    // Generate HTML for all NOCs
    let nocHtml = "";

    for (const registration of registrations) {
      const nocPageHtml = await generateNOCHtml(registration);
      nocHtml += nocPageHtml;
    }

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>No Objection Certificates (NOC)</title>
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
          margin: 0 auto 30px auto;
          page-break-after: always;
          background: #fff;
          min-height: 100vh;
          position: relative;
        }

        .noc-page:last-child {
          page-break-after: avoid;
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

    // Return HTML for browser-based printing
    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="no-objection-certificates.html"',
    );
    res.send(fullHtml);
  } catch (error) {
    console.error("Export NOC error:", error);
    res
      .status(500)
      .json({ error: "Failed to export No Objection Certificates" });
  }
}

async function generateNOCHtml(
  registration: RegistrationData,
): Promise<string> {
  // Format registration date
  const certificateDate = new Date().toLocaleDateString("en-GB");

  // Get primary product name for GI
  const primaryProduct =
    registration.product_names?.split(",")[0] ||
    registration.category_names?.split(",")[0] ||
    "Bodo Traditional Food Product";

  // Generate application number based on registration ID and date
  const appNumber = `GI-BODO-${new Date().getFullYear()}-${registration.id.toString().padStart(4, "0")}`;

  // Organization details - Generic for bulk exports covering multiple associations
  const organizationName = "Bodo Traditional Producers Consortium";
  const giArea = "Bodoland Territorial Area Districts (BTAD)";

  return `
    <div class="noc-page">
      <div class="noc-header">
        <div class="noc-title">No Objection Certificate (NOC)</div>
      </div>

      <div class="noc-content">
        <div class="noc-paragraph">
          This is to certify that <span class="highlight">${registration.name}</span> is a producer of "<span class="highlight">${primaryProduct}</span>", bearing GI Application No. <span class="highlight">${appNumber}</span>, and the said proposed Authorised User is the producer within the designated GI Area.
        </div>

        <div class="noc-paragraph">
          We, <span class="organization-name">${organizationName}</span>, the Registered Proprietor/Applicant of the said Geographical Indication, have no objection to the registration of <span class="highlight">${registration.name}</span> as an Authorised User.
        </div>

        <div class="noc-paragraph">
          The Authorised User is expected to adhere to the quality standards maintained as per registered GI. In case of any independent modification in cultivation or processing methods of "<span class="highlight">${primaryProduct}</span>" is done in <span class="highlight">${giArea}</span> by the said Authorised Users, then <span class="organization-name">${organizationName}</span> shall not be held responsible for any resulting actions by the competent authority.
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

export async function exportStatementOfCase(req: Request, res: Response) {
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
        ur.email,
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

    // Generate HTML for all statements
    let statementsHtml = "";

    for (const registration of registrations) {
      const statementHtml = await generateStatementOfCaseHtml(registration);
      statementsHtml += statementHtml;
    }

    // Create complete HTML document
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Statement of Case Documents</title>
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
          margin: 0 auto 30px auto;
          page-break-after: always;
          background: #fff;
          min-height: 100vh;
          position: relative;
        }

        .statement-page:last-child {
          page-break-after: avoid;
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
      ${statementsHtml}
    </body>
    </html>
    `;

    // Return HTML for browser-based printing
    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="statement-of-case.html"',
    );
    res.send(fullHtml);
  } catch (error) {
    console.error("Export Statement of Case error:", error);
    res
      .status(500)
      .json({ error: "Failed to export Statement of Case documents" });
  }
}

async function generateStatementOfCaseHtml(
  registration: RegistrationData,
): Promise<string> {
  // Format registration date
  const statementDate = new Date().toLocaleDateString("en-GB");

  // Get primary product name for GI
  const primaryProduct =
    registration.product_names?.split(",")[0] ||
    registration.category_names?.split(",")[0] ||
    "Bodo Traditional Food Product";

  // Organization details - Generic for bulk exports covering multiple associations
  const organizationName = "Bodo Traditional Producers Consortium";
  const giArea = "Bodoland Territorial Area Districts (BTAD)";

  // Calculate years of experience based on registration date (minimum 2 years)
  const registrationYear = new Date(registration.created_at).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearsOfExperience = Math.max(2, currentYear - registrationYear + 2);

  // Estimate production capacity based on age and experience
  const estimatedProduction =
    registration.age > 40 ? "500-1000 kg" : "250-500 kg";

  // Estimate annual turnover (reasonable amount for traditional producers)
  const turnoverAmount = registration.age > 40 ? "₹2,50,000" : "₹1,50,000";
  const turnoverWords =
    registration.age > 40
      ? "Two Lakh Fifty Thousand Only"
      : "One Lakh Fifty Thousand Only";

  return `
    <div class="statement-page">
      <div class="statement-header">
        <div class="statement-title">STATEMENT OF CASE</div>
      </div>

      <div class="statement-content">
        <div class="statement-paragraph">
          I, <span class="highlight">${registration.name}</span>, aged about <span class="highlight">${registration.age}</span> years, having address at <span class="highlight">${registration.address}</span>, I am the producer of <span class="highlight">${primaryProduct}</span>.
        </div>

        <div class="statement-paragraph">
          I have applied for registration as an "Authorized User" for Registered Geographical Indication, <span class="highlight">${primaryProduct}</span>, and the No Objection Certificate received from the registered proprietor of <span class="organization-name">${organizationName}</span> is attached for your reference.
        </div>

        <div class="statement-paragraph">
          I am involved in the process production of <span class="highlight">${primaryProduct}</span> since <span class="highlight">${yearsOfExperience}</span> years within the designated <span class="highlight">${giArea}</span> GI Area.
        </div>

        <div class="statement-paragraph">
          That my estimated production trading relating <span class="highlight">${primaryProduct}</span> is about <span class="highlight">${estimatedProduction}</span> per year and as on date the annual turnover is approximately <span class="currency highlight">${turnoverAmount}</span>/- (<span class="highlight">${turnoverWords}</span>).
        </div>

        <div class="statement-paragraph">
          I herein undertake, I am aware and shall adhere and confirm to all the regulating criteria (present and future) relating to specification/description and quality as set forth by the Inspection Body setup by the Registered Proprietor of <span class="highlight">${primaryProduct}</span>.
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
