import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileCompression } from "./fileCompression";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

interface FileStorageResult {
  relativePath: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isCompressed: boolean;
  isImage: boolean;
}

interface FileMetadata {
  originalName: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isCompressed: boolean;
  isImage: boolean;
  mimeType?: string;
  uploadDate: string;
}

export class CompressedFileStorage {
  private readonly baseDir = "/var/www/GI";

  constructor() {
    this.ensureBaseDirectory();
  }

  private async ensureBaseDirectory(): Promise<void> {
    try {
      await access(this.baseDir);
    } catch {
      await mkdir(this.baseDir, { recursive: true });
    }
  }

  /**
   * Save file with compression if needed
   */
  public async saveFile(
    registrationId: number,
    fileName: string,
    fileData: Buffer,
    mimeType?: string,
  ): Promise<FileStorageResult> {
    // Create registration directory if it doesn't exist
    const registrationDir = path.join(
      this.baseDir,
      `registration_${registrationId}`,
    );
    try {
      await access(registrationDir);
    } catch {
      await mkdir(registrationDir, { recursive: true });
    }

    // Check if compression is needed
    const originalSize = fileData.length;
    const needsCompression = fileCompression.needsCompression(originalSize);

    let finalBuffer = fileData;
    let compressedSize = originalSize;
    let compressionRatio = 1;
    let isImage = false;

    if (needsCompression) {
      const compressionResult = await fileCompression.compressFile(
        fileData,
        fileName,
        mimeType,
      );

      finalBuffer = compressionResult.compressedBuffer;
      compressedSize = compressionResult.compressedSize;
      compressionRatio = compressionResult.compressionRatio;
      isImage = compressionResult.isImage;
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = path.extname(fileName);
    const baseName = path.basename(fileName, fileExtension);
    const safeFileName = `${baseName}_${timestamp}${fileExtension}`;
    const filePath = path.join(registrationDir, safeFileName);

    // Save compressed file
    await writeFile(filePath, finalBuffer);

    // Save metadata for later retrieval
    const metadata: FileMetadata = {
      originalName: fileName,
      originalSize,
      compressedSize,
      compressionRatio,
      isCompressed: needsCompression,
      isImage,
      mimeType,
      uploadDate: new Date().toISOString(),
    };

    const metadataPath = path.join(
      registrationDir,
      `${safeFileName}.meta.json`,
    );
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Return relative path from baseDir for database storage
    const relativePath = path.relative(this.baseDir, filePath);

    return {
      relativePath,
      originalSize,
      compressedSize,
      compressionRatio,
      isCompressed: needsCompression,
      isImage,
    };
  }

  /**
   * Read file and decompress if necessary
   */
  public async readFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.resolve(this.baseDir, relativePath);
    const metadataPath = `${fullPath}.meta.json`;

    // Read the compressed file
    const compressedData = await readFile(fullPath);

    // Check if metadata exists to determine if file is compressed
    let metadata: FileMetadata | null = null;
    try {
      const metadataContent = await readFile(metadataPath, "utf8");
      metadata = JSON.parse(metadataContent);
    } catch {
      // No metadata means file is not compressed
      return compressedData;
    }

    // Decompress if needed
    if (metadata.isCompressed) {
      return await fileCompression.decompressFile(
        compressedData,
        metadata.isImage,
        metadata.isCompressed,
      );
    }

    return compressedData;
  }

  /**
   * Get file metadata
   */
  public async getFileMetadata(
    relativePath: string,
  ): Promise<FileMetadata | null> {
    const fullPath = path.resolve(this.baseDir, relativePath);
    const metadataPath = `${fullPath}.meta.json`;

    try {
      const metadataContent = await readFile(metadataPath, "utf8");
      return JSON.parse(metadataContent);
    } catch {
      return null;
    }
  }

  /**
   * Get compressed file (for direct serving)
   */
  public async getCompressedFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.resolve(this.baseDir, relativePath);
    return await readFile(fullPath);
  }

  public getFileUrl(relativePath: string): string {
    // Convert stored path registration_X/filename to API route for serving (works on Netlify & local)
    const cleanPath = relativePath.replace(/\\/g, "/");
    const match = cleanPath.match(/^registration_(\d+)\/(.+)$/);
    if (match) {
      const registrationId = match[1];
      const filename = match[2];
      return `/api/files/${registrationId}/${encodeURIComponent(filename)}?view=true`;
    }
    // Fallback to uploads for unexpected formats
    return `/uploads/${cleanPath}`;
  }

  /**
   * Get storage statistics for a registration
   */
  public async getStorageStats(registrationId: number): Promise<{
    totalFiles: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    totalSavings: number;
    averageCompressionRatio: number;
  }> {
    const registrationDir = path.join(
      this.baseDir,
      `registration_${registrationId}`,
    );

    const stats = {
      totalFiles: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      totalSavings: 0,
      averageCompressionRatio: 0,
    };

    try {
      const files = await fs.promises.readdir(registrationDir);
      const metadataFiles = files.filter((f) => f.endsWith(".meta.json"));

      let totalCompressionRatio = 0;

      for (const metaFile of metadataFiles) {
        try {
          const metadataPath = path.join(registrationDir, metaFile);
          const metadataContent = await readFile(metadataPath, "utf8");
          const metadata: FileMetadata = JSON.parse(metadataContent);

          stats.totalFiles++;
          stats.totalOriginalSize += metadata.originalSize;
          stats.totalCompressedSize += metadata.compressedSize;
          totalCompressionRatio += metadata.compressionRatio;
        } catch (error) {
          console.warn(`Error reading metadata file ${metaFile}:`, error);
        }
      }

      stats.totalSavings = stats.totalOriginalSize - stats.totalCompressedSize;
      stats.averageCompressionRatio =
        stats.totalFiles > 0 ? totalCompressionRatio / stats.totalFiles : 0;
    } catch (error) {
      console.warn(
        `Error getting storage stats for registration ${registrationId}:`,
        error,
      );
    }

    return stats;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

export const compressedFileStorage = new CompressedFileStorage();
