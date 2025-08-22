import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { CameraCapture } from "./CameraCapture";

interface DocumentUploadProps {
  label: string;
  file: File | null;
  onFileChange: (file: File) => void;
  onFileRemove: () => void;
  required?: boolean;
  accept?: string;
  disabled?: boolean;
  showPreview?: boolean;
}

export function DocumentUpload({
  label,
  file,
  onFileChange,
  onFileRemove,
  required = false,
  accept = "image/*",
  disabled = false,
  showPreview = true,
}: DocumentUploadProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const fileInputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;

  // Create and manage object URL for preview
  React.useEffect(() => {
    if (file && showPreview) {
      // Revoke previous URL to prevent memory leaks
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      const newUrl = URL.createObjectURL(file);
      setObjectUrl(newUrl);
    } else {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
    }
  }, [file, showPreview]);

  // Cleanup object URL on unmount
  React.useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
    // Clear the input value to allow re-selecting the same file
    event.target.value = "";
  };

  const handleCameraCapture = (capturedFile: File) => {
    onFileChange(capturedFile);
    setShowCamera(false);
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-gray-700">
          {label}
          {required && "*"}
        </span>
        {!disabled && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="btn-secondary px-4 py-2"
              onClick={() => document.getElementById(fileInputId)?.click()}
              type="button"
            >
              <Upload size={16} className="mr-1" />
              {file ? "Change" : "Upload"}
            </Button>
            <Button
              size="sm"
              className="btn-accent px-4 py-2"
              onClick={() => setShowCamera(true)}
              type="button"
            >
              <Camera size={16} className="mr-1" />
              Camera
            </Button>
          </div>
        )}
        {disabled && (
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* File Preview */}
      {file && showPreview ? (
        <div className="mt-3">
          <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
            {objectUrl && (
              <img
                src={objectUrl}
                alt={`${label} preview`}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm text-green-600">
              ✓ File uploaded: {file.name}
            </div>
            {!disabled && (
              <Button
                size="sm"
                variant="outline"
                onClick={onFileRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                type="button"
              >
                <X size={14} className="mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      ) : file && !showPreview ? (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-600">
              ✓ File uploaded: {file.name}
            </div>
            {!disabled && (
              <Button
                size="sm"
                variant="outline"
                onClick={onFileRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                type="button"
              >
                <X size={14} className="mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      ) : disabled ? (
        <div className="mt-3 text-sm text-green-600 text-center">
          ✓ Document available from previous registration
        </div>
      ) : (
        <div className="mt-3 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
          <div className="flex flex-col items-center">
            <Upload size={24} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              Click Upload to select {label.toLowerCase()} or use Camera to
              capture
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supported formats: JPG, PNG, WEBP
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        id={fileInputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileUpload}
        disabled={disabled}
      />

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
        title={`Capture ${label}`}
      />
    </div>
  );
}
