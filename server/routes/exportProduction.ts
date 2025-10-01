import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { dbQuery } from "../config/database";

// Exports all production-related files and a CSV summary for a given user as a tar.gz streamed to the client.
export async function exportProductionByUser(req: any, res: any) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Fetch user info and registrations
    const userResult = await dbQuery("SELECT id, username FROM users WHERE id = ?", [
      userId,
    ]);
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

    // Prepare temp directory
    const timestamp = Date.now();
    const folderName = `${user.username || "user"}_production_export_${new Date()
      .toISOString()
      .split("T")[0]}`;
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "export-"));
    const exportRoot = path.join(tmpBase, folderName);
    fs.mkdirSync(exportRoot, { recursive: true });

    const storageBase = "/var/www/GI"; // same base as simpleFileStorage

    // Create a CSV summary
    const csvLines = [
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
      const regDir = path.join(exportRoot, regDirName);
      fs.mkdirSync(regDir, { recursive: true });

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
        // normalize
        const cleaned = String(rel).replace(/\\/g, "/");
        const abs = path.join(storageBase, cleaned);
        try {
          if (fs.existsSync(abs)) {
            const dest = path.join(regDir, path.basename(cleaned));
            fs.copyFileSync(abs, dest);
            includedFiles.push(path.join(regDirName, path.basename(cleaned)));
          }
        } catch (err) {
          // ignore missing files
          console.warn("Failed to include file", abs, err);
        }
      }

      // Add an informational text file about the registration
      const info = `Registration ID: ${reg.id}\nName: ${reg.name}\nPhone: ${reg.phone}\nEmail: ${reg.email || ""}\nProducts: ${reg.product_names || ""}\nRegistered: ${reg.created_at}\n`;
      fs.writeFileSync(path.join(regDir, "registration_info.txt"), info, "utf-8");

      csvLines.push([
        reg.id,
        new Date(reg.created_at).toLocaleDateString("en-GB"),
        `"${String(reg.name).replace(/"/g, '""')}"`,
        reg.phone || "",
        reg.email || "",
        `"${String(reg.product_names || "").replace(/"/g, '""')}")`,
        `"${includedFiles.join(";")}")`,
      ].join(","));
    }

    // Write CSV
    const csvPath = path.join(exportRoot, "registrations_summary.csv");
    fs.writeFileSync(csvPath, csvLines.join("\n"), "utf-8");

    // Stream tar.gz using system tar if available
    // tar -czf - -C <tmpBase> <folderName>
    res.setHeader("Content-Type", "application/gzip");
    const filename = `${folderName}.tar.gz`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const tarArgs = ["-czf", "-", "-C", tmpBase, folderName];
    const tar = spawn("tar", tarArgs, { stdio: ["ignore", "pipe", "pipe"] });

    tar.stdout.pipe(res);

    tar.on("error", (err) => {
      console.error("tar process error:", err);
      res.status(500).json({ error: "Failed to create archive" });
      // cleanup
      try {
        fs.rmSync(tmpBase, { recursive: true, force: true });
      } catch (e) {}
    });

    tar.on("close", (code) => {
      // cleanup
      try {
        fs.rmSync(tmpBase, { recursive: true, force: true });
      } catch (e) {}
    });
  } catch (error) {
    console.error("Export production error:", error);
    res.status(500).json({ error: "Failed to export production data" });
  }
}
