import path from "path";
import os from "os";
import fs from "fs";
import archiver from "archiver";
import { dbQuery } from "../config/database";
import { exportProductGI3A, exportProductNOC, exportProductStatement, exportProductCard } from "./registrations";

// Helper function to generate production documents for a specific product
async function generateProductDocument(
  registrationId: number,
  productId: number,
  productName: string,
  documentType: "gi3a" | "noc" | "statement" | "card"
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Create mock request and response objects
      const mockReq = {
        body: {
          registrationId,
          productId,
          productName,
        },
      };

      let htmlContent = "";
      const mockRes = {
        setHeader: () => {},
        status: () => mockRes,
        json: () => mockRes,
        send: (content: string) => {
          htmlContent = content;
          resolve(htmlContent);
        },
      };

      // Call the appropriate export function
      switch (documentType) {
        case "gi3a":
          exportProductGI3A(mockReq as any, mockRes as any);
          break;
        case "noc":
          exportProductNOC(mockReq as any, mockRes as any);
          break;
        case "statement":
          exportProductStatement(mockReq as any, mockRes as any);
          break;
        case "card":
          exportProductCard(mockReq as any, mockRes as any);
          break;
        default:
          resolve(null);
      }

      // Timeout fallback
      setTimeout(() => {
        if (!htmlContent) {
          resolve(null);
        }
      }, 5000);
    } catch (error) {
      console.error(`Failed to generate ${documentType} for product ${productName}:`, error);
      resolve(null);
    }
  });
}

// Exports production documents for a specific registration organized by products as a zip streamed to the client.
export async function exportProductionByUser(req: any, res: any) {
  try {
    let { userId, registrationId } = req.body;

    // We need registrationId to get the specific registration
    if (!registrationId) {
      return res
        .status(400)
        .json({ error: "Registration ID is required" });
    }

    // Get the specific registration with product information
    const registrations = await dbQuery(
      `SELECT
        ur.id,
        ur.name,
        ur.phone,
        ur.email,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        ur.aadhar_card_path,
        ur.pan_card_path,
        ur.proof_of_production_path,
        GROUP_CONCAT(DISTINCT p.name) as product_names,
        GROUP_CONCAT(DISTINCT CONCAT(p.id, ':', p.name)) as product_details
      FROM user_registrations ur
      LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
      LEFT JOIN products p ON usp.product_id = p.id
      WHERE ur.id = ?
      GROUP BY ur.id
    `,
      [registrationId],
    );

    if (!registrations || registrations.length === 0) {
      return res
        .status(404)
        .json({ error: "Registration not found" });
    }

    const registration = registrations[0]; // Get the specific registration
    const userName = (registration.name || "user").replace(/[^a-zA-Z0-9_-]/g, "_");
    const folderName = `${userName}_production_export_${new Date().toISOString().split("T")[0]}`;

    // Stream zip to response
    res.setHeader("Content-Type", "application/zip");
    const filename = `${folderName}.zip`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("warning", (err) => {
      console.warn("Archive warning:", err);
    });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      try {
        if (!res.headersSent)
          res.status(500).json({ error: "Failed to create archive" });
      } catch (e) {}
    });

    // Pipe archive data to the response
    archive.pipe(res);

    const storageBase = "/var/www/GI"; // same base as simpleFileStorage

    // CSV helper
    const escapeCsv = (val: any) => {
      if (val == null) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const csvLines: string[] = [];
    csvLines.push(
      [
        "Reg ID",
        "Reg Date", 
        "Name",
        "Phone",
        "Email",
        "Products",
        "Files by Product",
      ].join(","),
    );

    // Organize files by products
    const productStructure: { [productName: string]: any[] } = {};

    // Process the single registration
    const reg = registration;
    const fileFields = [
      { key: "photo_path", name: "photo" },
      { key: "signature_path", name: "signature" },
      { key: "aadhar_card_path", name: "aadhar_card" },
      { key: "pan_card_path", name: "pan_card" },
      { key: "proof_of_production_path", name: "proof_of_production" },
    ];

    // Parse product details
    const productDetails = reg.product_details || "";
    const products = productDetails.split(',').map((p: string) => {
      const [id, name] = p.split(':');
      return { id: id?.trim(), name: name?.trim() };
    }).filter((p: any) => p.name);

    // If no products found, use "General" category
    if (products.length === 0) {
      products.push({ id: "general", name: "General" });
    }

    const registrationFiles: string[] = [];

    // Process each product
    for (const product of products) {
      const productName = product.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      if (!productStructure[productName]) {
        productStructure[productName] = [];
      }

      const productFiles: string[] = [];

        // Add basic registration files for each product
        for (const field of fileFields) {
          const rel = reg[field.key];
          if (!rel) continue;
          
          const cleaned = String(rel).replace(/\\/g, "/");
          const abs = path.join(storageBase, cleaned);
          
          try {
            if (fs.existsSync(abs)) {
              const fileExt = path.extname(cleaned);
              const fileName = `${field.name}_reg${reg.id}${fileExt}`;
              const arcName = path.posix.join(productName, fileName);
              
              archive.file(abs, { name: arcName });
              productFiles.push(fileName);
              registrationFiles.push(`${productName}/${fileName}`);
            }
          } catch (err) {
            console.warn("Failed to include file", abs, err);
          }
        }

        // Generate and add production documents (GI3A, NOC, Statement, Card)
        const documentTypes = [
          { type: "gi3a" as const, name: "Form_GI_3A" },
          { type: "noc" as const, name: "NOC_Certificate" },
          { type: "statement" as const, name: "Statement_of_Case" },
          { type: "card" as const, name: "Export_Card" },
        ];

        for (const docType of documentTypes) {
          try {
            const htmlContent = await generateProductDocument(
              reg.id,
              parseInt(product.id) || 0,
              product.name,
              docType.type
            );

            if (htmlContent) {
              const fileName = `${docType.name}_reg${reg.id}_${productName}.html`;
              const arcName = path.posix.join(productName, fileName);
              
              archive.append(Buffer.from(htmlContent, "utf-8"), {
                name: arcName,
              });
              
              productFiles.push(fileName);
              registrationFiles.push(`${productName}/${fileName}`);
            }
          } catch (err) {
            console.warn(`Failed to generate ${docType.name} for product ${productName}:`, err);
          }
        }

        // Add registration info for each product
        const info = `Registration ID: ${reg.id}
Name: ${reg.name}
Phone: ${reg.phone}
Email: ${reg.email || ""}
Product: ${product.name}
Registration Date: ${reg.created_at}

PRODUCTION DOCUMENTS INCLUDED:
- Form GI 3A (HTML document)
- NOC Certificate (HTML document) 
- Statement of Case (HTML document)
- Export Card (HTML document)

REGISTRATION FILES INCLUDED:
${productFiles.join("\n")}

Total files: ${productFiles.length}
Generated: ${new Date().toLocaleString()}
`;
        
        archive.append(Buffer.from(info, "utf-8"), {
          name: path.posix.join(productName, `registration_${reg.id}_info.txt`),
        });

        productStructure[productName].push({
          registration: reg,
          files: productFiles,
        });
      }

    csvLines.push(
      [
        escapeCsv(reg.id),
        escapeCsv(new Date(reg.created_at).toLocaleDateString("en-GB")),
        escapeCsv(reg.name),
        escapeCsv(reg.phone || ""),
        escapeCsv(reg.email || ""),
        escapeCsv(reg.product_names || ""),
        escapeCsv(registrationFiles.join(";")),
      ].join(","),
    );

    // Create product summary
    const productSummaryLines: string[] = [];
    productSummaryLines.push("Product Summary");
    productSummaryLines.push("================");
    productSummaryLines.push("");
    
    for (const [productName, entries] of Object.entries(productStructure)) {
      productSummaryLines.push(`Product: ${productName.replace(/_/g, " ")}`);
      productSummaryLines.push(`Total Registrations: ${entries.length}`);
      productSummaryLines.push("Registrations:");
      
      entries.forEach((entry: any) => {
        productSummaryLines.push(`  - ${entry.registration.name} (ID: ${entry.registration.id})`);
        productSummaryLines.push(`    Files: ${entry.files.join(", ")}`);
      });
      
      productSummaryLines.push("");
    }

    // Add product summary to archive
    const productSummaryContent = productSummaryLines.join("\n");
    archive.append(Buffer.from(productSummaryContent, "utf-8"), {
      name: "00_PRODUCT_SUMMARY.txt",
    });

    // Append CSV summary at root of zip
    const csvContent = csvLines.join("\n");
    archive.append(Buffer.from(csvContent, "utf-8"), {
      name: "registrations_summary.csv",
    });

    // Add README file with instructions
    const readmeContent = `Production Export for ${registration.name}
Generated: ${new Date().toLocaleString()}

This ZIP file contains ALL production documents organized by products.

Structure:
- Each product has its own folder (e.g., "Bodo_Aronai", "Bodo_Dokhona")
- Inside each product folder:
  - PRODUCTION DOCUMENTS (HTML format, ready to print):
    * Form_GI_3A_regXXX_ProductName.html
    * NOC_Certificate_regXXX_ProductName.html
    * Statement_of_Case_regXXX_ProductName.html
    * Export_Card_regXXX_ProductName.html
  - REGISTRATION FILES:
    * photo_regXXX.jpg (user photo)
    * signature_regXXX.png (user signature)
    * aadhar_card_regXXX.pdf (Aadhar card)
    * pan_card_regXXX.pdf (PAN card)
    * proof_of_production_regXXX.pdf (production proof)
  - registration_XXX_info.txt (detailed registration information)

Root folder contains:
- This README file
- Product summary (00_PRODUCT_SUMMARY.txt)
- CSV summary of all registrations (registrations_summary.csv)

IMPORTANT NOTES:
- HTML documents can be opened in any web browser
- Use browser's Print function to generate PDF copies
- All production documents are officially formatted
- Registration files are the original uploaded documents

For questions, contact the administrator.
`;
    
    archive.append(Buffer.from(readmeContent, "utf-8"), {
      name: "README.txt",
    });

    // Ensure response ends when archive finishes
    archive.on("close", () => {
      console.log("Archive finalized, bytes: ", archive.pointer());
      try {
        if (!res.writableEnded) res.end();
      } catch (e) {}
    });

    // Finalize archive
    await new Promise<void>((resolve, reject) => {
      archive.finalize((err: any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  } catch (error) {
    console.error("Export production error:", error);
    try {
      if (!res.headersSent)
        res
          .status(500)
          .json({
            error: "Failed to export production data",
            detail: (error as any).message || String(error),
          });
    } catch (e) {}
  }
}
