import fs from "fs";
import path from "path";
import os from "os";
import fs from "fs";
import archiver from "archiver";
import { dbQuery } from "../config/database";

// Exports all production-related files and a CSV summary for a given user as a zip streamed to the client.
export async function exportProductionByUser(req: any, res: any) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Fetch user info and registrations
    const userResult = await dbQuery(
      "SELECT id, username FROM users WHERE id = ?",
      [userId],
    );
    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userResult[0];

    const registrations = await dbQuery(
      `SELECT
        ur.id,
        ur.name,
        ur.phone,
        ur.email,
        ur.created_at,
        ur.photo_path,
        ur.signature_path,
        ur.aadhar_path,
        ur.pan_path,
        ur.proof_of_production_path,
        GROUP_CONCAT(DISTINCT p.name) as product_names
      FROM user_registrations ur
      LEFT JOIN user_selected_products usp ON ur.id = usp.registration_id
      LEFT JOIN products p ON usp.product_id = p.id
      WHERE ur.user_id = ?
      GROUP BY ur.id
      ORDER BY ur.created_at DESC
    `,
      [userId],
    );

    if (!registrations || registrations.length === 0) {
      return res
        .status(404)
        .json({ error: "No registrations found for this user" });
    }

    const folderName = `${user.username || "user"}_production_export_${new Date().toISOString().split("T")[0]}`;

    // Stream zip to response
    res.setHeader("Content-Type", "application/zip");
    const filename = `${folderName}.zip`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("warning", (err) => {
      // Non-fatal warnings (e.g., stat failures)
      console.warn("Archive warning:", err);
    });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      try {
        if (!res.headersSent) res.status(500).json({ error: "Failed to create archive" });
      } catch (e) {}
    });

    // Pipe archive data to the response
    archive.pipe(res);

    const storageBase = "/var/www/GI"; // same base as simpleFileStorage

    // Prepare CSV lines header
    const csvLines: string[] = [
      [
        "Reg ID",
        "Reg Date",
        "Name",
        "Phone",
        "Email",
        "Products",
        "Files",
      ].join(","),
    ];

    for (const reg of registrations as any[]) {
      const regDirName = `registration_${reg.id}`;

      const fileFields = [
        "photo_path",
        "signature_path",
        "aadhar_path",
        "pan_path",
        "proof_of_production_path",
      ];

      const includedFiles: string[] = [];

      for (const field of fileFields) {
        const rel = reg[field];
        if (!rel) continue;
        const cleaned = String(rel).replace(/\\/g, "/");
        const abs = path.join(storageBase, cleaned);
        try {
          if (fs.existsSync(abs)) {
            const arcName = path.posix.join(regDirName, path.basename(cleaned));
            archive.file(abs, { name: arcName });
            includedFiles.push(arcName);
          }
        } catch (err) {
          console.warn("Failed to include file", abs, err);
        }
      }

      const info = `Registration ID: ${reg.id}\nName: ${reg.name}\nPhone: ${reg.phone}\nEmail: ${reg.email || ""}\nProducts: ${reg.product_names || ""}\nRegistered: ${reg.created_at}\n`;
      archive.append(Buffer.from(info, "utf-8"), {
        name: path.posix.join(regDirName, "registration_info.txt"),
      });

      csvLines.push(
        [
          reg.id,
          new Date(reg.created_at).toLocaleDateString("en-GB"),
          `"${String(reg.name).replace(/"/g, '""')}",`,
          `${reg.phone || ""},`,
          `${reg.email || ""},`,
          `"${String(reg.product_names || "").replace(/"/g, '""')}"`,
          `"${includedFiles.join(";")}"`,
        ].join(","),
      );
    }

    // Append CSV summary at root of zip
    const csvContent = csvLines.join("\n");
    archive.append(Buffer.from(csvContent, "utf-8"), {
      name: "registrations_summary.csv",
    });

    // Finalize archive
    await archive.finalize();
  } catch (error) {
    console.error("Export production error:", error);
    try {
      if (!res.headersSent)
        res.status(500).json({ error: "Failed to export production data" });
    } catch (e) {}
  }
}
