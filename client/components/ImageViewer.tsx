import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, RotateCw, X, Download } from "lucide-react";

interface ImageViewerProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

export function ImageViewer({ src, alt = "Image", open, onClose }: ImageViewerProps) {
  const [rotation, setRotation] = useState(0);

  const rotate = (delta: number) => {
    setRotation((prev) => (prev + delta + 360) % 360);
  };

  const reset = () => setRotation(0);

  const downloadImage = () => {
    try {
      const link = document.createElement("a");
      link.href = src;
      link.download = alt.replace(/\s+/g, "-").toLowerCase() || "image";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { reset(); onClose(); } }}>
      <DialogContent className="max-w-4xl mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="flex items-center gap-2">{alt}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => rotate(-90)}>
                <RotateCcw className="w-4 h-4 mr-1" /> Rotate Left
              </Button>
              <Button size="sm" variant="outline" onClick={() => rotate(90)}>
                <RotateCw className="w-4 h-4 mr-1 transform rotate-180" /> Rotate Right
              </Button>
              <Button size="sm" variant="outline" onClick={reset}>
                Reset
              </Button>
              <Button size="sm" variant="ghost" onClick={downloadImage}>
                <Download className="w-4 h-4 mr-1" /> Download
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { reset(); onClose(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="w-full flex items-center justify-center">
            <img
              src={src}
              alt={alt}
              style={{ transform: `rotate(${rotation}deg)`, transition: "transform 200ms" }}
              className="max-h-[70vh] max-w-full object-contain"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageViewer;
