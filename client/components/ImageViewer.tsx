import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, RotateCw, X, Download, Save as SaveIcon } from "lucide-react";

interface ImageViewerProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
  // Optional: save rotated image to profile or server
  onSave?: (blob: Blob, filename?: string) => Promise<void>;
}

export function ImageViewer({
  src,
  alt = "Image",
  open,
  onClose,
  onSave,
}: ImageViewerProps) {
  const [rotation, setRotation] = useState(0);

  const rotate = (delta: number) => {
    setRotation((prev) => (prev + delta + 360) % 360);
  };

  const reset = () => setRotation(0);

  // Helper to load image via fetch (avoids crossOrigin issues)
  const normalizeFileUrl = (u: string) => {
    try {
      // If it's an absolute URL, return as-is
      if (/^https?:\/\//i.test(u)) return u;

      // Handle legacy /api/files/serve/<relativePath>
      const servePrefix = "/api/files/serve/";
      if (u.startsWith(servePrefix)) {
        const rel = u.slice(servePrefix.length).split("?")[0];
        const decoded = decodeURIComponent(rel);
        const m = decoded.match(/^registration_(\d+)\/(.+)$/);
        if (m) {
          const id = m[1];
          const filename = m[2];
          return `/api/files/${id}/${encodeURIComponent(filename)}?view=true`;
        }
        return u;
      }

      return u;
    } catch (e) {
      return u;
    }
  };

  const loadImageViaFetch = async () => {
    const fetchUrl = normalizeFileUrl(src);
    const resp = await fetch(fetchUrl, { credentials: "include" });
    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (ev) => reject(new Error("Image load failed"));
    });
    return { img, url } as { img: HTMLImageElement; url: string };
  };

  const canvasToBlob = (canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.95) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

  const downloadImage = async () => {
    try {
      const { img, url } = await loadImageViaFetch();

      const angle = (rotation % 360 + 360) % 360;
      const radians = (angle * Math.PI) / 180;

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const absCos = Math.abs(Math.cos(radians));
      const absSin = Math.abs(Math.sin(radians));

      const canvas = document.createElement("canvas");
      const cw = Math.round(w * absCos + h * absSin);
      const ch = Math.round(w * absSin + h * absCos);
      canvas.width = cw;
      canvas.height = ch;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.translate(cw / 2, ch / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -w / 2, -h / 2);

      const blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      if (!blob) throw new Error("Failed to create blob from canvas");

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = (alt && alt.replace(/\s+/g, "-").toLowerCase()) || "image";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);

      // cleanup
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err instanceof Error ? err.message : String(err));
    }
  };

  const saveImage = async () => {
    if (!onSave) return;
    try {
      const { img, url } = await loadImageViaFetch();

      const angle = (rotation % 360 + 360) % 360;
      const radians = (angle * Math.PI) / 180;

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const absCos = Math.abs(Math.cos(radians));
      const absSin = Math.abs(Math.sin(radians));

      const canvas = document.createElement("canvas");
      const cw = Math.round(w * absCos + h * absSin);
      const ch = Math.round(w * absSin + h * absCos);
      canvas.width = cw;
      canvas.height = ch;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.translate(cw / 2, ch / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -w / 2, -h / 2);

      const blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      if (!blob) throw new Error("Failed to create blob from canvas");

      try {
        await onSave(blob, (alt && alt.replace(/\s+/g, "-").toLowerCase()) || "image.jpg");
      } catch (e) {
        console.error("Save failed", e instanceof Error ? e.message : String(e));
      }

      // cleanup
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Save failed", err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          reset();
          onClose();
        }
      }}
    >
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
              {onSave && (
                <Button size="sm" variant="outline" onClick={saveImage}>
                  <SaveIcon className="w-4 h-4 mr-1" /> Save to profile
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={downloadImage}>
                <Download className="w-4 h-4 mr-1" /> Download
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
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
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: "transform 200ms",
              }}
              className="max-h-[70vh] max-w-full object-contain"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageViewer;
