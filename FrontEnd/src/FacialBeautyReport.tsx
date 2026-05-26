import {
  CheckCircle,
  Circle,
  Scissors,
  Star,
  Pipette,
  Glasses,
  ArrowLeft,
} from "lucide-react";

/* ─────────── Types ─────────── */

export interface ReportData {
  success: boolean;
  error?: string | null;
  report_id: string;
  report_date: string;
  overall_score: number;
  overall_label: string;
  scores: {
    symmetry: number;
    proportions: number;
    bone_structure: number;
    skin_quality: number;
    eyes: number;
    nose: number;
    lips: number;
    overall_harmony: number;
  };
  strengths: string[];
  improvements: string[];
  analysis: { category: string; detail: string }[];
  key_metrics: { label: string; value: string }[];
  recommendations: {
    hair: string[];
    skincare: string[];
    grooming: string[];
  };
  image_url: string;
}

interface FacialBeautyReportProps {
  data: ReportData;
  onBack: () => void;
}

/* ─────────── small components ─────────── */

function ProgressBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="relative w-full h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gray-800 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 w-10 shrink-0">
        <span>1</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold tracking-widest uppercase text-gray-900 mb-4">
      {children}
    </h2>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-gray-200 rounded-lg bg-white p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Face outline SVG ─── */
function FaceOutlineSVG() {
  return (
    <svg
      viewBox="0 0 200 260"
      fill="none"
      stroke="#111827"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full max-h-64 mx-auto"
    >
      <ellipse cx="100" cy="105" rx="62" ry="78" />
      <path d="M38 105 Q50 185 100 200 Q150 185 162 105" />
      <path d="M38 90 Q38 30 100 25 Q162 30 162 90" strokeWidth="2" />
      <path d="M38 90 Q30 60 55 35 Q80 18 100 25" strokeWidth="1" />
      <path d="M162 90 Q170 60 145 35 Q120 18 100 25" strokeWidth="1" />
      <path d="M60 85 Q72 77 88 82" strokeWidth="2" />
      <path d="M112 82 Q128 77 140 85" strokeWidth="2" />
      <ellipse cx="75" cy="98" rx="12" ry="6" />
      <circle cx="75" cy="98" r="3" fill="#111827" />
      <ellipse cx="125" cy="98" rx="12" ry="6" />
      <circle cx="125" cy="98" r="3" fill="#111827" />
      <rect x="58" y="88" width="34" height="22" rx="4" fill="none" strokeWidth="1.5" />
      <rect x="108" y="88" width="34" height="22" rx="4" fill="none" strokeWidth="1.5" />
      <path d="M92 97 L108 97" strokeWidth="1.5" />
      <path d="M58 97 L42 93" strokeWidth="1" />
      <path d="M142 97 L158 93" strokeWidth="1" />
      <path d="M100 105 L100 132" strokeWidth="1" />
      <path d="M90 135 Q95 140 100 138 Q105 140 110 135" />
      <path d="M82 155 Q92 148 100 150 Q108 148 118 155" strokeWidth="1.5" />
      <path d="M82 155 Q100 168 118 155" strokeWidth="1" />
      <path d="M38 90 Q28 100 32 115 Q34 122 38 118" strokeWidth="1" />
      <path d="M162 90 Q172 100 168 115 Q166 122 162 118" strokeWidth="1" />
      <path d="M82 200 L78 245" strokeWidth="1.5" />
      <path d="M118 200 L122 245" strokeWidth="1.5" />
      <path d="M78 245 Q100 235 122 245" strokeWidth="1" />
      <line x1="30" y1="98" x2="170" y2="98" strokeDasharray="3 3" strokeWidth="0.5" stroke="#9ca3af" />
      <line x1="30" y1="135" x2="170" y2="135" strokeDasharray="3 3" strokeWidth="0.5" stroke="#9ca3af" />
      <line x1="30" y1="155" x2="170" y2="155" strokeDasharray="3 3" strokeWidth="0.5" stroke="#9ca3af" />
      <line x1="100" y1="25" x2="100" y2="200" strokeDasharray="3 3" strokeWidth="0.5" stroke="#9ca3af" />
    </svg>
  );
}

/* ─────────── Main Report ─────────── */

export default function FacialBeautyReport({ data, onBack }: FacialBeautyReportProps) {
  const {
    report_id,
    report_date,
    overall_score,
    overall_label,
    scores,
    strengths,
    improvements,
    analysis,
    key_metrics,
    recommendations,
    image_url,
  } = data;

  const scoresList = [
    { label: "Symmetry", value: scores.symmetry },
    { label: "Proportions", value: scores.proportions },
    { label: "Bone Structure", value: scores.bone_structure },
    { label: "Skin Quality", value: scores.skin_quality },
    { label: "Eyes", value: scores.eyes },
    { label: "Nose", value: scores.nose },
    { label: "Lips", value: scores.lips },
    { label: "Overall Harmony", value: scores.overall_harmony },
  ];

  const scorePct = (overall_score / 10) * 100;

  return (
    <main className="min-h-screen bg-gray-50 font-sans antialiased">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Analyze another photo
        </button>

        {/* ====== 1 · HEADER ====== */}
        <header className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-none">
              FACIAL BEAUTY REPORT
            </h1>
            <p className="mt-1.5 text-[11px] font-semibold tracking-[0.25em] uppercase text-gray-400">
              DATA-DRIVEN &nbsp;•&nbsp; HONEST &nbsp;•&nbsp; ACTIONABLE
            </p>
          </div>
          <div className="text-right text-xs text-gray-500 leading-relaxed whitespace-nowrap">
            <p>
              DATE:&ensp;
              <span className="font-semibold text-gray-700">{report_date}</span>
            </p>
            <p>
              REPORT ID:&ensp;
              <span className="font-semibold text-gray-700">{report_id}</span>
            </p>
          </div>
        </header>

        <hr className="border-gray-300 mb-8" />

        {/* ====== 2 · HERO (3-col) ====== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* User photo */}
          <Card className="flex items-center justify-center p-3 overflow-hidden">
            <img
              src={image_url}
              alt="User face photo"
              className="w-full h-full object-cover rounded-md max-h-72"
            />
          </Card>

          {/* Overall score */}
          <Card className="flex flex-col items-center justify-center text-center">
            <SectionTitle>OVERALL SCORE</SectionTitle>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-7xl font-extrabold tracking-tight text-gray-900 leading-none">
                {overall_score.toFixed(1)}
              </span>
              <span className="text-xl text-gray-400 font-medium">/10</span>
            </div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-500 mb-4">
              {overall_label}
            </p>

            <div className="w-full px-2 mb-4">
              <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-visible">
                <div
                  className="absolute inset-y-0 left-0 bg-gray-800 rounded-full"
                  style={{ width: `${scorePct}%` }}
                />
                <div
                  className="absolute -top-1.5 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-gray-800"
                  style={{ left: `${scorePct}%`, transform: "translateX(-50%)" }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed px-2">
              You have balanced features with good structure and potential. With
              targeted grooming and skin optimization, you can significantly
              enhance your overall attractiveness.
            </p>
          </Card>

          {/* Face outline */}
          <Card className="flex flex-col items-center justify-start">
            <SectionTitle>FACE OUTLINE (REFERENCE)</SectionTitle>
            <div className="flex-1 w-full flex items-center justify-center">
              <FaceOutlineSVG />
            </div>
          </Card>
        </section>

        {/* ====== 3 · SCORES BREAKDOWN ====== */}
        <Card className="mb-8">
          <SectionTitle>SCORES BREAKDOWN</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            {scoresList.map((s) => (
              <div key={s.label} className="flex items-center gap-4">
                <span className="text-sm text-gray-700 w-32 shrink-0">
                  {s.label}
                </span>
                <span className="text-sm font-bold text-gray-900 w-8 text-right shrink-0">
                  {s.value.toFixed(1)}
                </span>
                <ProgressBar value={s.value} />
              </div>
            ))}
          </div>
        </Card>

        {/* ====== 4 · FEEDBACK (Strengths / Improvement) ====== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <Card>
            <SectionTitle>STRENGTHS</SectionTitle>
            <ul className="space-y-2.5">
              {strengths.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle
                    size={16}
                    className="text-gray-700 mt-0.5 shrink-0"
                    strokeWidth={2}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionTitle>AREAS FOR IMPROVEMENT</SectionTitle>
            <ul className="space-y-2.5">
              {improvements.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <Circle
                    size={16}
                    className="text-gray-400 mt-0.5 shrink-0"
                    strokeWidth={2}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* ====== 5 · ANALYSIS & METRICS ====== */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.55fr] gap-5 mb-8">
          <Card>
            <SectionTitle>DETAILED ANALYSIS</SectionTitle>
            <div className="divide-y divide-gray-100">
              {analysis.map((a) => (
                <div
                  key={a.category}
                  className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm font-bold text-gray-900 w-32 shrink-0">
                    {a.category}
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    {a.detail}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>KEY METRICS (EST.)</SectionTitle>
            <div className="divide-y divide-gray-100">
              {key_metrics.map((m) => (
                <div
                  key={m.label}
                  className="flex justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm text-gray-700">{m.label}</span>
                  <span className="text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ====== 6 · ACTIONABLE RECOMMENDATIONS ====== */}
        <section className="mb-8">
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-900 mb-4">
            ACTIONABLE RECOMMENDATIONS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card>
              <div className="flex items-center gap-2.5 mb-3">
                <Scissors size={20} className="text-gray-700" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                  HAIR
                </h3>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-sm text-gray-600">
                {recommendations.hair.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="flex items-center gap-2.5 mb-3">
                <Pipette size={20} className="text-gray-700" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                  SKINCARE
                </h3>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-sm text-gray-600">
                {recommendations.skincare.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="flex items-center gap-2.5 mb-3">
                <Glasses size={20} className="text-gray-700" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                  GROOMING
                </h3>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-sm text-gray-600">
                {recommendations.grooming.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* ====== 7 · FOOTER ====== */}
        <hr className="border-gray-300 mb-4" />
        <footer className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-8">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Star size={16} className="text-gray-500" />
            <span className="font-semibold tracking-wide uppercase text-xs">
              FOCUS ON CONSISTENCY. SMALL CHANGES, BIG IMPACT.
            </span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm text-right">
            DISCLAIMER: This report is for informational purposes only. Results
            are based on estimated measurements and general aesthetic guidelines.
          </p>
        </footer>
      </div>
    </main>
  );
}
