import sharp from "sharp";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { createGzip, createGunzip } from "zlib";
import path from "path";

interface CompressionResult {
  compressedBuffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isImage: boolean;
}

export class FileCompression {
  private readonly maxSize = 70 * 1024; // 70KB in bytes
  private readonly supportedImageTypes = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".tiff",
    ".bmp",
  ];

  /**
   * Compress file to target size (70KB) while maintaining readability
   */
  public async compressFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType?: string,
  ): Promise<CompressionResult> {
    const fileExtension = path.extname(fileName).toLowerCase();
    const isImage =
      this.supportedImageTypes.includes(fileExtension) ||
      (mimeType && mimeType.startsWith("image/"));

    if (isImage) {
      return await this.compressImage(fileBuffer, fileName);
    } else {
      return await this.compressGenericFile(fileBuffer, fileName);
    }
  }

  /**
   * Compress image files using Sharp with progressive quality reduction
   */
  private async compressImage(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<CompressionResult> {
    const originalSize = fileBuffer.length;

    if (originalSize <= this.maxSize) {
      // File already within limit
      return {
        compressedBuffer: fileBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        isImage: true,
      };
    }

    // Try different quality levels to achieve target size
    const qualityLevels = [90, 80, 70, 60, 50, 40, 30, 20, 15, 10];
    let compressedBuffer = fileBuffer;
    let compressedSize = originalSize;

    for (const quality of qualityLevels) {
      try {
        // Convert to JPEG with specified quality for maximum compression
        compressedBuffer = await sharp(fileBuffer)
          .jpeg({
            quality,
            progressive: true,
            mozjpeg: true, // Use mozjpeg encoder for better compression
          })
          .toBuffer();

        compressedSize = compressedBuffer.length;

        if (compressedSize <= this.maxSize) {
          break;
        }

        // If still too large, try reducing dimensions
        if (compressedSize > this.maxSize) {
          const metadata = await sharp(fileBuffer).metadata();
          const currentWidth = metadata.width || 1920;
          const currentHeight = metadata.height || 1080;

          // Reduce dimensions by 20% each iteration
          const newWidth = Math.floor(currentWidth * 0.8);
          const newHeight = Math.floor(currentHeight * 0.8);

          compressedBuffer = await sharp(fileBuffer)
            .resize(newWidth, newHeight, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({
              quality,
              progressive: true,
              mozjpeg: true,
            })
            .toBuffer();

          compressedSize = compressedBuffer.length;

          if (compressedSize <= this.maxSize) {
            break;
          }
        }
      } catch (error) {
        console.warn(`Image compression failed at quality ${quality}:`, error);
        continue;
      }
    }

    return {
      compressedBuffer,
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
      isImage: true,
    };
  }

  /**
   * Compress non-image files using gzip compression
   */
  private async compressGenericFile(
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<CompressionResult> {
    const originalSize = fileBuffer.length;

    if (originalSize <= this.maxSize) {
      return {
        compressedBuffer: fileBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        isImage: false,
      };
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const gzip = createGzip({
        level: 9, // Maximum compression
        windowBits: 15,
        memLevel: 8,
      });

      gzip.on("data", (chunk) => chunks.push(chunk));
      gzip.on("end", () => {
        const compressedBuffer = Buffer.concat(chunks);
        const compressedSize = compressedBuffer.length;

        resolve({
          compressedBuffer,
          originalSize,
          compressedSize,
          compressionRatio: compressedSize / originalSize,
          isImage: false,
        });
      });
      gzip.on("error", reject);

      gzip.write(fileBuffer);
      gzip.end();
    });
  }

  /**
   * Decompress files for reading
   */
  public async decompressFile(
    compressedBuffer: Buffer,
    isImage: boolean,
    isCompressed: boolean = true,
  ): Promise<Buffer> {
    if (!isCompressed) {
      return compressedBuffer;
    }

    if (isImage) {
      // Images compressed with Sharp don't need special decompression
      // They remain in standard JPEG format
      return compressedBuffer;
    } else {
      // Decompress gzipped files
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        const gunzip = createGunzip();

        gunzip.on("data", (chunk) => chunks.push(chunk));
        gunzip.on("end", () => resolve(Buffer.concat(chunks)));
        gunzip.on("error", reject);

        gunzip.write(compressedBuffer);
        gunzip.end();
      });
    }
  }

  /**
   * Check if file needs compression
   */
  public needsCompression(fileSize: number): boolean {
    return fileSize > this.maxSize;
  }

  /**
   * Get compression info for logging
   */
  public getCompressionInfo(result: CompressionResult): string {
    const savedBytes = result.originalSize - result.compressedSize;
    const savedPercentage = ((savedBytes / result.originalSize) * 100).toFixed(
      1,
    );

    return `Compressed ${result.isImage ? "image" : "file"} from ${this.formatBytes(result.originalSize)} to ${this.formatBytes(result.compressedSize)} (${savedPercentage}% reduction)`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

export const fileCompression = new FileCompression();
