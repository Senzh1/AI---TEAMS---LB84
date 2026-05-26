import { useCallback, useRef, useState } from "react";
import {
  Upload,
  Camera,
  X,
  ImageIcon,
  Aperture,
  SwitchCamera,
  CircleDot,
} from "lucide-react";

interface UploadPageProps {
  onAnalyze: (file: File) => void;
  isLoading: boolean;
}

export default function UploadPage({ onAnalyze, isLoading }: UploadPageProps) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── File selection ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearSelection = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Camera ──
  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      setCameraError(
        "Could not access camera. Please check permissions or use file upload."
      );
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
    setCameraReady(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the capture to match preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "camera-capture.jpg", {
          type: "image/jpeg",
        });
        setSelectedFile(file);
        setPreview(canvas.toDataURL("image/jpeg"));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const handleSubmit = () => {
    if (selectedFile) onAnalyze(selectedFile);
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans antialiased flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900 text-white mb-5">
            <Aperture size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            FACIAL BEAUTY REPORT
          </h1>
          <p className="mt-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-gray-400">
            DATA-DRIVEN &nbsp;•&nbsp; HONEST &nbsp;•&nbsp; ACTIONABLE
          </p>
          <p className="mt-4 text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            Upload a clear, front-facing photo or use your camera. Our computer
            vision system will analyze your facial proportions and generate a
            detailed aesthetic report.
          </p>
        </div>

        {/* Camera view */}
        {showCamera && (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden mb-6">
            <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
              {cameraError ? (
                <p className="text-red-400 text-sm px-6 text-center">
                  {cameraError}
                </p>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}

              {/* Overlay guide */}
              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-64 border-2 border-white/30 rounded-full" />
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3 p-4">
              {cameraReady && (
                <button
                  onClick={capturePhoto}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <CircleDot size={18} />
                  Capture
                </button>
              )}
              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && !showCamera && (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden mb-6">
            <div className="relative">
              <img
                src={preview}
                alt="Selected preview"
                className="w-full max-h-96 object-contain bg-gray-100"
              />
              <button
                onClick={clearSelection}
                className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full shadow hover:bg-white transition-colors cursor-pointer"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Aperture size={18} />
                    Analyze My Face
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Upload zone — visible when no preview and no camera */}
        {!preview && !showCamera && (
          <div
            className={`border-2 border-dashed rounded-xl p-10 sm:p-14 text-center transition-all cursor-pointer ${
              dragOver
                ? "border-gray-900 bg-gray-100"
                : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                <ImageIcon size={28} className="text-gray-400" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Drop your photo here or{" "}
              <span className="text-gray-900 underline underline-offset-2">
                browse
              </span>
            </p>
            <p className="text-xs text-gray-400">
              Supports JPG, PNG, WebP • Max 20 MB
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        )}

        {/* OR divider + camera button */}
        {!preview && !showCamera && (
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {!preview && !showCamera && (
          <button
            onClick={startCamera}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 border border-gray-300 bg-white text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer"
          >
            <Camera size={20} />
            Take a Photo with Camera
          </button>
        )}

        {/* Tips */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: "👤", text: "Face the camera directly" },
            { icon: "💡", text: "Use good, even lighting" },
            { icon: "🧹", text: "Remove glasses if possible" },
          ].map((tip, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-white border border-gray-100 text-xs text-gray-500"
            >
              <span className="text-base">{tip.icon}</span>
              {tip.text}
            </div>
          ))}
        </div>

        {/* Hidden canvas for camera capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </main>
  );
}
