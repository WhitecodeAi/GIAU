import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api";

export default function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    const token = getAuthToken();

    if (!token) {
      toast.error("Please log in again");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      // Add minimal required registration data
      formData.append("name", "Test User");
      formData.append("address", "Test Address");
      formData.append("age", "30");
      formData.append("gender", "male");
      formData.append("phone", "1234567890");
      formData.append("aadharNumber", "123456789012");
      formData.append("productCategoryId", "1");
      formData.append("selectedProducts", JSON.stringify([1]));
      formData.append("existingProducts", JSON.stringify([]));

      // Add the test file as aadharCard
      formData.append("aadharCard", file, file.name);

      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseText = await response.text();

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`,
        );
      }

      toast.success("File uploaded successfully!");
      setFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Test File Upload</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Select a test file:
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="text-sm text-green-600">
            �� Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={loading || !file}
          className="w-full"
        >
          {loading ? "Uploading..." : "Test Upload"}
        </Button>

        <div className="text-xs text-gray-500 mt-4">
          <p>
            This will create a test registration with the uploaded file as an
            Aadhar card.
          </p>
          <p>Check browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  );
}
