import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ArrowLeft, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CameraTest() {
  const [testFile, setTestFile] = useState<File | null>(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">
            Camera Capture Test
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Test Document Upload with Camera
            </h2>
            <p className="text-gray-600 mb-6">
              This page tests the camera capture functionality for document
              uploads. You can either upload a file or use your device's camera
              to capture a document.
            </p>
          </div>

          <DocumentUpload
            label="Test Document"
            file={testFile}
            onFileChange={(file) => {
              setTestFile(file);
              console.log("File captured/uploaded:", file.name, file.size);
            }}
            onFileRemove={() => {
              setTestFile(null);
              console.log("File removed");
            }}
            required={false}
            accept="image/*"
          />

          {testFile && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">
                File Details:
              </h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <strong>Name:</strong> {testFile.name}
                </p>
                <p>
                  <strong>Size:</strong> {(testFile.size / 1024).toFixed(2)} KB
                </p>
                <p>
                  <strong>Type:</strong> {testFile.type}
                </p>
                <p>
                  <strong>Last Modified:</strong>{" "}
                  {new Date(testFile.lastModified).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <h3 className="font-semibold mb-2">Features tested:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Camera access and permission handling</li>
              <li>Live camera preview with document guidelines</li>
              <li>Photo capture and preview</li>
              <li>File conversion and upload</li>
              <li>Fallback to file upload if camera fails</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
