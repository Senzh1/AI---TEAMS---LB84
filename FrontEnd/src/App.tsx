import { useCallback, useState } from "react";
import UploadPage from "./UploadPage";
import FacialBeautyReport, { type ReportData } from "./FacialBeautyReport";
import { Aperture } from "lucide-react";

type AppState = "idle" | "analyzing" | "result" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = useCallback(async (file: File) => {
    setIsLoading(true);
    setState("analyzing");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        setError(json.error || json.detail || "Analysis failed. Please try again.");
        setState("error");
        return;
      }

      setReportData(json as ReportData);
      setState("result");
    } catch (err: any) {
      setError(
        err?.message?.includes("fetch")
          ? "Could not connect to the analysis server. Make sure the backend is running on port 8000."
          : "Something went wrong. Please try again."
      );
      setState("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBack = () => {
    setState("idle");
    setReportData(null);
    setError("");
  };

  // ── Analyzing screen ──
  if (state === "analyzing") {
    return (
      <main className="min-h-screen bg-gray-50 font-sans antialiased flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
            <Aperture size={32} className="text-gray-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Analyzing Your Face
          </h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            Our computer vision model is detecting facial landmarks and computing
            proportional scores. This may take a few seconds…
          </p>

          {/* Progress dots animation */}
          <div className="flex justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Error screen ──
  if (state === "error") {
    return (
      <main className="min-h-screen bg-gray-50 font-sans antialiased flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-500 mb-5">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Analysis Failed
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // ── Result screen ──
  if (state === "result" && reportData) {
    return <FacialBeautyReport data={reportData} onBack={handleBack} />;
  }

  // ── Idle / Upload screen ──
  return <UploadPage onAnalyze={handleAnalyze} isLoading={isLoading} />;
}
