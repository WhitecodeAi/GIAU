import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function getAuthToken(): string | null {
  const user = localStorage.getItem("user");
  if (user) {
    const userData = JSON.parse(user);
    return userData.token;
  }
  return null;
}

export default function SimpleFileUpload() {
  const [files, setFiles] = useState<{
    aadharCard: File | null;
    panCard: File | null;
    proofOfProduction: File | null;
    signature: File | null;
    photo: File | null;
  }>({
    aadharCard: null,
    panCard: null,
    proofOfProduction: null,
    signature: null,
    photo: null,
  });

  const [loading, setLoading] = useState(false);

  const handleFileChange = (field: keyof typeof files, file: File | null) => {
    setFiles((prev) => ({
      ...prev,
      [field]: file,
    }));
  };

  const handleSubmit = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Please log in first");
      return;
    }

    if (
      !files.aadharCard ||
      !files.panCard ||
      !files.proofOfProduction ||
      !files.signature ||
      !files.photo
    ) {
      toast.error("Please select all required files");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      // Add some dummy registration data
      formData.append("name", "Test User");
      formData.append("address", "Test Address");
      formData.append("age", "30");
      formData.append("gender", "male");
      formData.append("phone", "1234567890");
      formData.append("aadharNumber", "123456789012");
      formData.append("productCategoryId", "1");
      formData.append("areaOfProduction", "Test Area");
      formData.append("selectedProducts", JSON.stringify([1]));
      formData.append("existingProducts", JSON.stringify([]));

      // Add files
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file, file.name);
        }
      });

      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const result = await response.json();
      toast.success("Files uploaded successfully!");


      // Reset files
      setFiles({
        aadharCard: null,
        panCard: null,
        proofOfProduction: null,
        signature: null,
        photo: null,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Simple File Upload Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(files).map(([key, file]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="font-medium">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </Label>
              <Input
                id={key}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  handleFileChange(key as keyof typeof files, selectedFile);
                }}
              />
              {file && (
                <div className="text-sm text-green-600">
                  ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={
              loading || !Object.values(files).every((file) => file !== null)
            }
            className="w-full"
          >
            {loading ? "Uploading..." : "Upload Files"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
