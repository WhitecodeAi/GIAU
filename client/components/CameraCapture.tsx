import React, { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X, RotateCcw, Check } from "lucide-react";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export function CameraCapture({
  isOpen,
  onClose,
  onCapture,
  title = "Capture Document",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const startCamera = useCallback(async () => {
    try {
      console.log("Starting camera...");
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera for documents
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        console.log("Camera started successfully");
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "Unable to access camera. Please check permissions or try uploading a file instead.",
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log("Stopping camera...");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCapturedImage(null);
    console.log("Camera stopped");
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const dataURL = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(dataURL);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setError("");
    onClose();
  }, [stopCamera, onClose]);

  const confirmCapture = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    // Convert data URL to File
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const file = new File([blob], `captured-document-${timestamp}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          onCapture(file);
          handleClose();
        } else {
          console.error("Failed to convert captured image to file");
          setError("Failed to process captured image. Please try again.");
        }
      },
      "image/jpeg",
      0.8,
    );
  }, [capturedImage, onCapture, handleClose]);

  const retakePhoto = useCallback(() => {
    console.log("Retake photo clicked", { isCameraActive, capturedImage });
    setCapturedImage(null);
    // Always restart camera for retake to ensure fresh stream
    if (streamRef.current) {
      console.log("Stopping existing camera stream for retake...");
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }
    // Start camera after a brief delay to ensure cleanup
    setTimeout(() => {
      console.log("Starting camera for retake...");
      startCamera();
    }, 100);
  }, [startCamera]);

  // Start camera when dialog opens
  React.useEffect(() => {
    console.log("Camera effect triggered", { isOpen, isCameraActive, capturedImage });
    if (isOpen && !isCameraActive && !capturedImage) {
      console.log("Starting camera from useEffect");
      startCamera();
    }

    // Cleanup when dialog closes
    return () => {
      if (!isOpen) {
        console.log("Dialog closed, stopping camera");
        stopCamera();
      }
    };
  }, [isOpen, isCameraActive, capturedImage, startCamera, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm mb-2">{error}</p>
              <Button
                onClick={startCamera}
                size="sm"
                variant="outline"
                className="text-red-700 border-red-200 hover:bg-red-100"
              >
                Retry Camera
              </Button>
            </div>
          )}

          <div className="relative">
            {/* Camera Preview */}
            {!capturedImage && (
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Camera overlay guides */}
                <div className="absolute inset-4 border-2 border-white/50 rounded-lg flex items-center justify-center">
                  <div className="text-white/70 text-sm text-center">
                    <p>Position document within frame</p>
                    <p className="text-xs mt-1">Ensure good lighting & focus</p>
                  </div>
                </div>

                {/* Corner guides */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-white/70"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-white/70"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-white/70"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-white/70"></div>
              </div>
            )}

            {/* Captured Image Preview */}
            {capturedImage && (
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured document"
                  className="w-full rounded-lg"
                />
              </div>
            )}

            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Camera Controls */}
          <div className="flex gap-2 justify-center">
            {!capturedImage ? (
              <>
                <Button
                  onClick={capturePhoto}
                  disabled={!isCameraActive}
                  className="flex-1 btn-primary"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="px-4"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={confirmCapture} className="flex-1 btn-success">
                  <Check className="w-4 h-4 mr-2" />
                  Use Photo
                </Button>
              </>
            )}
          </div>

          {/* Camera Permission Help */}
          {error && (
            <div className="text-xs text-gray-600 text-center">
              <p>
                Camera not available? You can still upload files using the
                Upload button.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
