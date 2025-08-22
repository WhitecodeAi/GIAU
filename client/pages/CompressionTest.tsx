import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Download, Info, BarChart3 } from "lucide-react";

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isCompressed: boolean;
  isImage: boolean;
  relativePath: string;
}

interface FileInfo {
  originalName: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isCompressed: boolean;
  isImage: boolean;
  mimeType: string;
  uploadDate: string;
  savings: {
    bytes: number;
    percentage: string;
  };
}

interface StorageStats {
  registrationId: number;
  totalFiles: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSavings: number;
  averageCompressionRatio: number;
  formatted: {
    originalSize: string;
    compressedSize: string;
    savings: string;
    savingsPercentage: string;
  };
}

export default function CompressionTest() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [registrationId, setRegistrationId] = useState<string>("1");

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setFileInfo(null);
    }
  };

  const uploadFile = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", "Test User");
      formData.append("address", "Test Address");
      formData.append("age", "30");
      formData.append("gender", "male");
      formData.append("phone", "1234567890");
      formData.append("aadharNumber", "123456789012");
      formData.append("productCategoryIds", "[1]");
      formData.append("areaOfProduction", "Test Area");
      formData.append("annualProduction", "100");
      formData.append("annualTurnover", "10");
      formData.append("yearsOfProduction", "5");

      // Add the test file
      formData.append("proofOfProduction", file);

      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
    

      setResult({
        originalSize: file.size,
        compressedSize: file.size, // Will be updated when we get file info
        compressionRatio: 1,
        isCompressed: false,
        isImage: file.type.startsWith("image/"),
        relativePath: `var/www/GI/registration_${data.registrationId}/`,
      });

      setRegistrationId(data.registrationId.toString());
    } catch (error) {
      console.error("Upload error:", error);
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getFileInfo = async (filename: string) => {
    try {
      const response = await fetch(
        `/api/files/${registrationId}/${filename}/info`,
      );
      if (!response.ok) {
        throw new Error("Failed to get file info");
      }
      const info: FileInfo = await response.json();
      setFileInfo(info);
    } catch (error) {
      console.error("Error getting file info:", error);
      setError("Failed to get file information");
    }
  };

  const getStorageStats = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/files/${registrationId}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to get storage stats");
      }
      const stats: StorageStats = await response.json();
      setStorageStats(stats);
    } catch (error) {
      console.error("Error getting storage stats:", error);
      setError("Failed to get storage statistics");
    }
  };

  const downloadFile = async (filename: string) => {
    try {
      const response = await fetch(
        `/api/files/${registrationId}/${filename}/download`,
      );
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      setError("Failed to download file");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">File Compression Test</h1>
        <p className="text-muted-foreground">
          Test the 70KB file compression system while maintaining readability
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            File Upload & Compression
          </CardTitle>
          <CardDescription>
            Upload any file to test automatic compression to 70KB while keeping
            it readable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="mt-1"
            />
            {file && (
              <div className="mt-2 text-sm text-muted-foreground">
                Selected: {file.name} ({formatBytes(file.size)})
                {file.size > 70 * 1024 && (
                  <Badge variant="secondary" className="ml-2">
                    Will be compressed
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={uploadFile}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading
              ? "Uploading & Compressing..."
              : "Upload & Test Compression"}
          </Button>

          {uploading && (
            <div className="space-y-2">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Processing file with compression...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Section */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                File Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Registration ID:</span>
                  <span>{registrationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">File Type:</span>
                  <Badge variant={result.isImage ? "default" : "secondary"}>
                    {result.isImage ? "Image" : "Document"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() =>
                    file &&
                    getFileInfo(file.name.replace(/[^a-zA-Z0-9.-]/g, "_"))
                  }
                  variant="outline"
                  className="w-full"
                >
                  Get Detailed File Info
                </Button>
              </div>

              {fileInfo && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span>Original Size:</span>
                    <span>{formatBytes(fileInfo.originalSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compressed Size:</span>
                    <span>{formatBytes(fileInfo.compressedSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Savings:</span>
                    <span className="text-green-600 font-medium">
                      {formatBytes(fileInfo.savings.bytes)} (
                      {fileInfo.savings.percentage}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compressed:</span>
                    <Badge
                      variant={fileInfo.isCompressed ? "default" : "secondary"}
                    >
                      {fileInfo.isCompressed ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Storage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Storage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={getStorageStats}
                variant="outline"
                className="w-full"
              >
                Get Storage Statistics
              </Button>

              {storageStats && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span>Total Files:</span>
                    <span>{storageStats.totalFiles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Original Size:</span>
                    <span>{storageStats.formatted.originalSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compressed Size:</span>
                    <span>{storageStats.formatted.compressedSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Savings:</span>
                    <span className="text-green-600 font-medium">
                      {storageStats.formatted.savings} (
                      {storageStats.formatted.savingsPercentage})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg. Compression:</span>
                    <span>
                      {(storageStats.averageCompressionRatio * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Files larger than 70KB are automatically compressed</p>
          <p>
            • Images use progressive JPEG compression with quality reduction
          </p>
          <p>• Documents use gzip compression for maximum space savings</p>
          <p>
            • Files remain fully readable and downloadable in original format
          </p>
          <p>• Metadata tracks compression ratios and original sizes</p>
          <p>• Storage savings are calculated automatically</p>
        </CardContent>
      </Card>
    </div>
  );
}
