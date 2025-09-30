import fs from "fs";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

export class SimpleFileStorage {
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

  public async saveFile(
    registrationId: number,
    fileName: string,
    fileData: Buffer,
  ): Promise<string> {
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

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = path.extname(fileName);
    const baseName = path.basename(fileName, fileExtension);
    const safeFileName = `${baseName}_${timestamp}${fileExtension}`;
    const filePath = path.join(registrationDir, safeFileName);

    // Save file
    await writeFile(filePath, fileData);

    // Return relative path from baseDir for database storage
    return path.relative(this.baseDir, filePath);
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
}

export const simpleFileStorage = new SimpleFileStorage();
