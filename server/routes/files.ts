import { Request, Response } from "express";
import { compressedFileStorage } from "../utils/compressedFileStorage";
import { AuthRequest } from "../middleware/auth";
import path from "path";

/**
 * Serve files with automatic decompression
 */
export async function serveFile(req: Request, res: Response) {
  try {
    const { registrationId, filename } = req.params;

    if (!registrationId || !filename) {
      return res
        .status(400)
        .json({ error: "Registration ID and filename are required" });
    }

    // Construct the file path
    const relativePath = path.join(`registration_${registrationId}`, filename);

    // Get file metadata first
    const metadata = await compressedFileStorage.getFileMetadata(relativePath);

    if (!metadata) {
      return res.status(404).json({ error: "File not found" });
    }

    // Determine if we should return compressed or decompressed version
    const returnDecompressed =
      req.query.decompress === "true" || req.query.view === "true";

    let fileBuffer: Buffer;
    let contentType = metadata.mimeType || "application/octet-stream";

    if (returnDecompressed && metadata.isCompressed) {
      // Return decompressed file for viewing/downloading
      fileBuffer = await compressedFileStorage.readFile(relativePath);
    } else {
      // Return compressed file (smaller, for storage efficiency)
      fileBuffer = await compressedFileStorage.getCompressedFile(relativePath);
    }

    // Set appropriate headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${metadata.originalName}"`,
    );

    // Add compression info headers
    res.setHeader("X-Original-Size", metadata.originalSize.toString());
    res.setHeader("X-Compressed-Size", metadata.compressedSize.toString());
    res.setHeader("X-Compression-Ratio", metadata.compressionRatio.toString());
    res.setHeader("X-Is-Compressed", metadata.isCompressed.toString());

    res.send(fileBuffer);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
}

/**
 * Download file with automatic decompression
 */
export async function downloadFile(req: Request, res: Response) {
  try {
    const { registrationId, filename } = req.params;

    if (!registrationId || !filename) {
      return res
        .status(400)
        .json({ error: "Registration ID and filename are required" });
    }

    const relativePath = path.join(`registration_${registrationId}`, filename);

    const metadata = await compressedFileStorage.getFileMetadata(relativePath);

    if (!metadata) {
      return res.status(404).json({ error: "File not found" });
    }

    // Always return decompressed file for downloads
    const fileBuffer = await compressedFileStorage.readFile(relativePath);

    res.setHeader(
      "Content-Type",
      metadata.mimeType || "application/octet-stream",
    );
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${metadata.originalName}"`,
    );

    res.send(fileBuffer);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
}

/**
 * Get file metadata and compression stats
 */
export async function getFileInfo(req: Request, res: Response) {
  try {
    const { registrationId, filename } = req.params;

    if (!registrationId || !filename) {
      return res
        .status(400)
        .json({ error: "Registration ID and filename are required" });
    }

    const relativePath = path.join(`registration_${registrationId}`, filename);

    const metadata = await compressedFileStorage.getFileMetadata(relativePath);

    if (!metadata) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      originalName: metadata.originalName,
      originalSize: metadata.originalSize,
      compressedSize: metadata.compressedSize,
      compressionRatio: metadata.compressionRatio,
      isCompressed: metadata.isCompressed,
      isImage: metadata.isImage,
      mimeType: metadata.mimeType,
      uploadDate: metadata.uploadDate,
      savings: {
        bytes: metadata.originalSize - metadata.compressedSize,
        percentage: ((1 - metadata.compressionRatio) * 100).toFixed(1),
      },
    });
  } catch (error) {
    console.error("Error getting file info:", error);
    res.status(500).json({ error: "Failed to get file info" });
  }
}

/**
 * Get storage statistics for a registration
 */
export async function getStorageStats(req: AuthRequest, res: Response) {
  try {
    const { registrationId } = req.params;

    if (!registrationId) {
      return res.status(400).json({ error: "Registration ID is required" });
    }

    const stats = await compressedFileStorage.getStorageStats(
      parseInt(registrationId),
    );

    res.json({
      registrationId: parseInt(registrationId),
      totalFiles: stats.totalFiles,
      totalOriginalSize: stats.totalOriginalSize,
      totalCompressedSize: stats.totalCompressedSize,
      totalSavings: stats.totalSavings,
      averageCompressionRatio: stats.averageCompressionRatio,
      formatted: {
        originalSize: formatBytes(stats.totalOriginalSize),
        compressedSize: formatBytes(stats.totalCompressedSize),
        savings: formatBytes(stats.totalSavings),
        savingsPercentage:
          stats.totalOriginalSize > 0
            ? ((stats.totalSavings / stats.totalOriginalSize) * 100).toFixed(
                1,
              ) + "%"
            : "0%",
      },
    });
  } catch (error) {
    console.error("Error getting storage stats:", error);
    res.status(500).json({ error: "Failed to get storage statistics" });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
