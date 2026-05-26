"""
Facial Beauty Analyzer — MediaPipe FaceLandmarker (Tasks API) + OpenCV scoring.

Detects 478 facial landmarks, extracts geometric ratios, and scores
facial aesthetics against established proportional ideals (golden ratio,
neoclassical canons).
"""

from __future__ import annotations

import math
import os
import urllib.request
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

# ── MediaPipe Tasks API setup ────────────────────────────────────────
BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# Model path — auto-download if missing
MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "face_landmarker_v2_with_blendshapes.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"


def _ensure_model() -> str:
    """Download the FaceLandmarker model if it doesn't exist."""
    MODEL_DIR.mkdir(exist_ok=True)
    if not MODEL_PATH.exists():
        print(f"Downloading FaceLandmarker model to {MODEL_PATH}...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Download complete.")
    return str(MODEL_PATH)


# Key landmark indices (MediaPipe Face Mesh 478-point model)
LANDMARKS = {
    "chin": 152,
    "forehead_top": 10,
    "left_cheek": 234,
    "right_cheek": 454,
    "left_jaw": 172,
    "right_jaw": 397,
    "left_eye_inner": 133,
    "left_eye_outer": 33,
    "left_eye_top": 159,
    "left_eye_bottom": 145,
    "right_eye_inner": 362,
    "right_eye_outer": 263,
    "right_eye_top": 386,
    "right_eye_bottom": 374,
    "left_brow_inner": 107,
    "left_brow_outer": 70,
    "right_brow_inner": 336,
    "right_brow_outer": 300,
    "nose_tip": 1,
    "nose_bridge_top": 6,
    "nose_left": 129,
    "nose_right": 358,
    "nose_bottom": 2,
    "upper_lip_top": 13,
    "lower_lip_bottom": 14,
    "lip_left": 61,
    "lip_right": 291,
    "hairline_est": 10,
    "brow_line": 8,
    "nose_base": 2,
    "chin_bottom": 152,
    "jaw_left": 172,
    "jaw_right": 397,
    "jaw_mid_left": 132,
    "jaw_mid_right": 361,
}


@dataclass
class FaceMetrics:
    face_height: float = 0.0
    face_width: float = 0.0
    face_ratio: float = 0.0
    interocular_distance: float = 0.0
    interocular_ratio: float = 0.0
    nose_width: float = 0.0
    nose_width_ratio: float = 0.0
    lip_width: float = 0.0
    lip_width_ratio: float = 0.0
    eye_width_left: float = 0.0
    eye_width_right: float = 0.0
    eye_openness_left: float = 0.0
    eye_openness_right: float = 0.0
    upper_third: float = 0.0
    middle_third: float = 0.0
    lower_third: float = 0.0
    jaw_width: float = 0.0
    jaw_ratio: float = 0.0
    symmetry_score_raw: float = 0.0
    skin_variance: float = 0.0
    face_shape: str = "Oval"


@dataclass
class ScoreBreakdown:
    symmetry: float = 5.0
    proportions: float = 5.0
    bone_structure: float = 5.0
    skin_quality: float = 5.0
    eyes: float = 5.0
    nose: float = 5.0
    lips: float = 5.0
    overall_harmony: float = 5.0


@dataclass
class AnalysisResult:
    success: bool = True
    error: str | None = None
    report_id: str = ""
    report_date: str = ""
    overall_score: float = 5.0
    overall_label: str = "AVERAGE"
    scores: ScoreBreakdown = field(default_factory=ScoreBreakdown)
    metrics: FaceMetrics = field(default_factory=FaceMetrics)
    strengths: list[str] = field(default_factory=list)
    improvements: list[str] = field(default_factory=list)
    analysis: list[dict[str, str]] = field(default_factory=list)
    key_metrics: list[dict[str, str]] = field(default_factory=list)
    recommendations: dict[str, list[str]] = field(default_factory=dict)
    image_url: str = ""


# ── Helpers ──────────────────────────────────────────────────────────

def _dist(p1: np.ndarray, p2: np.ndarray) -> float:
    return float(np.linalg.norm(p1 - p2))


def _midpoint(p1: np.ndarray, p2: np.ndarray) -> np.ndarray:
    return (p1 + p2) / 2.0


def _clamp_score(value: float) -> float:
    return round(max(1.0, min(10.0, value)), 1)


def _ratio_score(actual: float, ideal: float, tolerance: float = 0.15) -> float:
    deviation = abs(actual - ideal) / ideal
    score = 10.0 - (deviation / tolerance) * 5.0
    return _clamp_score(score)


def _classify_face_shape(ratio: float) -> str:
    if ratio < 0.75:
        return "Oblong"
    elif ratio < 0.85:
        return "Oval"
    elif ratio < 0.95:
        return "Round / Oval"
    elif ratio < 1.05:
        return "Round"
    else:
        return "Wide / Square"


# ── Core analyzer ────────────────────────────────────────────────────

def _extract_metrics(landmarks: list, w: int, h: int, image: np.ndarray) -> FaceMetrics:
    """Extract metrics from FaceLandmarker normalized landmarks."""

    def pt(name: str) -> np.ndarray:
        lm = landmarks[LANDMARKS[name]]
        return np.array([lm.x * w, lm.y * h])

    m = FaceMetrics()

    # Face dimensions
    m.face_height = _dist(pt("forehead_top"), pt("chin"))
    m.face_width = _dist(pt("left_cheek"), pt("right_cheek"))
    m.face_ratio = m.face_width / max(m.face_height, 1e-6)
    m.face_shape = _classify_face_shape(m.face_ratio)

    # Interocular
    left_eye_center = _midpoint(pt("left_eye_inner"), pt("left_eye_outer"))
    right_eye_center = _midpoint(pt("right_eye_inner"), pt("right_eye_outer"))
    m.interocular_distance = _dist(left_eye_center, right_eye_center)
    m.interocular_ratio = m.interocular_distance / max(m.face_width, 1e-6)

    # Nose
    m.nose_width = _dist(pt("nose_left"), pt("nose_right"))
    m.nose_width_ratio = m.nose_width / max(m.face_width, 1e-6)

    # Lips
    m.lip_width = _dist(pt("lip_left"), pt("lip_right"))
    m.lip_width_ratio = m.lip_width / max(m.face_width, 1e-6)

    # Eyes
    m.eye_width_left = _dist(pt("left_eye_inner"), pt("left_eye_outer"))
    m.eye_width_right = _dist(pt("right_eye_inner"), pt("right_eye_outer"))
    m.eye_openness_left = _dist(pt("left_eye_top"), pt("left_eye_bottom"))
    m.eye_openness_right = _dist(pt("right_eye_top"), pt("right_eye_bottom"))

    # Facial thirds
    total = max(m.face_height, 1e-6)
    upper = _dist(pt("hairline_est"), pt("brow_line"))
    middle = _dist(pt("brow_line"), pt("nose_base"))
    lower = _dist(pt("nose_base"), pt("chin_bottom"))
    m.upper_third = upper / total
    m.middle_third = middle / total
    m.lower_third = lower / total

    # Jaw
    m.jaw_width = _dist(pt("jaw_left"), pt("jaw_right"))
    m.jaw_ratio = m.jaw_width / max(m.face_width, 1e-6)

    # Symmetry
    nose_tip = pt("nose_tip")
    pairs = [
        ("left_eye_inner", "right_eye_inner"),
        ("left_eye_outer", "right_eye_outer"),
        ("left_brow_inner", "right_brow_inner"),
        ("left_brow_outer", "right_brow_outer"),
        ("nose_left", "nose_right"),
        ("lip_left", "lip_right"),
        ("jaw_left", "jaw_right"),
    ]
    deviations: list[float] = []
    for left_name, right_name in pairs:
        d_left = _dist(pt(left_name), nose_tip)
        d_right = _dist(pt(right_name), nose_tip)
        avg = (d_left + d_right) / 2.0
        if avg > 1e-6:
            deviations.append(abs(d_left - d_right) / avg)
    m.symmetry_score_raw = float(np.mean(deviations)) if deviations else 0.0

    # Skin texture (Laplacian variance)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cx, cy = int(nose_tip[0]), int(nose_tip[1])
    fw = int(m.face_width * 0.4)
    fh = int(m.face_height * 0.3)
    y1 = max(0, cy - fh)
    y2 = min(h, cy + fh)
    x1 = max(0, cx - fw)
    x2 = min(w, cx + fw)
    face_crop = gray[y1:y2, x1:x2]
    if face_crop.size > 0:
        m.skin_variance = float(cv2.Laplacian(face_crop, cv2.CV_64F).var())
    else:
        m.skin_variance = 50.0

    return m


def _compute_scores(m: FaceMetrics) -> ScoreBreakdown:
    s = ScoreBreakdown()

    # Symmetry: raw deviation typically 0.02–0.15; multiplier calibrated so
    # 0.05 → ~8.5, 0.10 → ~7.0, 0.15 → ~5.5
    sym_pct = m.symmetry_score_raw
    s.symmetry = _clamp_score(10.0 - sym_pct * 25.0)

    # Proportions: ideal thirds each ≈ 0.333; total deviation rarely > 0.3
    thirds_dev = (
        abs(m.upper_third - 0.333)
        + abs(m.middle_third - 0.333)
        + abs(m.lower_third - 0.333)
    )
    s.proportions = _clamp_score(10.0 - thirds_dev * 15.0)

    # Bone structure: jaw ratio ideal ~0.87, wider tolerance
    s.bone_structure = _ratio_score(m.jaw_ratio, 0.87, 0.25)

    # Skin quality: Laplacian variance varies widely (10–500+) depending on
    # image resolution and compression. Use log scale for gentler scoring.
    # Target ~50-300 as "normal" range.
    import math
    log_var = math.log1p(m.skin_variance)
    log_ideal = math.log1p(150.0)  # ideal center
    skin_dev = abs(log_var - log_ideal) / log_ideal
    s.skin_quality = _clamp_score(10.0 - skin_dev * 5.0)

    # Eyes: wider tolerance for interocular ratio
    eye_score = _ratio_score(m.interocular_ratio, 0.30, 0.20)
    openness_diff = abs(m.eye_openness_left - m.eye_openness_right) / max(
        m.eye_openness_left, m.eye_openness_right, 1e-6
    )
    eye_sym_bonus = (1.0 - openness_diff) * 2.0
    s.eyes = _clamp_score((eye_score + eye_sym_bonus) / 1.2)

    # Nose: wider tolerance
    s.nose = _ratio_score(m.nose_width_ratio, 0.29, 0.20)

    # Lips: wider tolerance
    s.lips = _ratio_score(m.lip_width_ratio, 0.50, 0.25)

    # Overall harmony: weighted average of all sub-scores
    s.overall_harmony = _clamp_score(
        s.symmetry * 0.20
        + s.proportions * 0.15
        + s.bone_structure * 0.15
        + s.skin_quality * 0.10
        + s.eyes * 0.15
        + s.nose * 0.10
        + s.lips * 0.05
        + (s.symmetry + s.proportions) / 2.0 * 0.10
    )

    return s


def _overall_score(s: ScoreBreakdown) -> float:
    return round(
        (
            s.symmetry * 0.18
            + s.proportions * 0.15
            + s.bone_structure * 0.14
            + s.skin_quality * 0.12
            + s.eyes * 0.14
            + s.nose * 0.10
            + s.lips * 0.07
            + s.overall_harmony * 0.10
        ),
        1,
    )


def _score_label(score: float) -> str:
    if score >= 8.5:
        return "EXCEPTIONAL"
    elif score >= 7.5:
        return "VERY ATTRACTIVE"
    elif score >= 6.5:
        return "ABOVE AVERAGE"
    elif score >= 5.5:
        return "AVERAGE"
    elif score >= 4.5:
        return "BELOW AVERAGE"
    else:
        return "NEEDS IMPROVEMENT"


# ── Text generators ──────────────────────────────────────────────────

def _generate_strengths(s: ScoreBreakdown, m: FaceMetrics) -> list[str]:
    strengths: list[str] = []
    if s.symmetry >= 6.0:
        strengths.append("Good facial symmetry overall")
    if s.bone_structure >= 6.0:
        strengths.append("Solid bone structure and facial balance")
    if s.proportions >= 6.0:
        strengths.append("Well-balanced facial proportions")
    if s.eyes >= 6.0:
        strengths.append("Good eye spacing and shape")
    if s.lips >= 6.0:
        strengths.append("Fuller lips with balanced shape")
    if s.nose >= 6.0:
        strengths.append("Proportionate nose width")
    if s.skin_quality >= 6.5:
        strengths.append("Clear, even skin texture")
    if s.overall_harmony >= 6.0:
        strengths.append("Features work harmoniously together")
    if m.face_shape in ("Oval", "Round / Oval"):
        strengths.append("Balanced face shape with soft contours")
    if len(strengths) < 3:
        strengths.append("Approachable, friendly presence")
        strengths.append("Natural features with room for enhancement")
    return strengths[:6]


def _generate_improvements(s: ScoreBreakdown, m: FaceMetrics) -> list[str]:
    improvements: list[str] = []
    if s.skin_quality < 6.5:
        improvements.append("Skin texture: visible pores and slight uneven tone")
    if s.symmetry < 6.0:
        improvements.append("Mild facial asymmetry detected")
    if s.proportions < 6.0:
        improvements.append("Facial thirds are slightly unbalanced")
    if s.eyes < 6.0:
        improvements.append("Eye spacing or openness could be improved")
    if s.nose < 6.0:
        improvements.append("Nose width ratio is outside ideal range")
    if s.bone_structure < 6.5:
        improvements.append("Jawline definition could be stronger")
    if s.lips < 6.0:
        improvements.append("Lip width ratio could be closer to ideal")
    if m.lower_third > 0.38:
        improvements.append("Lower facial third is slightly elongated")
    if s.skin_quality < 5.5:
        improvements.append("T-zone oiliness and minor shine")
    if len(improvements) < 3:
        improvements.append("Minor asymmetries (common and natural)")
        improvements.append("Grooming refinements could elevate appearance")
    return improvements[:6]


def _generate_analysis(s: ScoreBreakdown, m: FaceMetrics) -> list[dict[str, str]]:
    def sym_text() -> str:
        if s.symmetry >= 7.0:
            return "Excellent symmetry. Very minor deviations within normal range."
        elif s.symmetry >= 5.5:
            return "Good overall symmetry. Minor asymmetry in eye openness and brow height."
        else:
            return "Noticeable asymmetry between left and right facial halves."

    def prop_text() -> str:
        thirds = f"Upper {m.upper_third:.0%}, Mid {m.middle_third:.0%}, Lower {m.lower_third:.0%}"
        if s.proportions >= 7.0:
            return f"Near-ideal facial thirds ({thirds}). Excellent vertical balance."
        elif s.proportions >= 5.5:
            return f"Facial thirds are well-balanced ({thirds}). Slightly wider lower third relative to midface."
        else:
            return f"Facial thirds show imbalance ({thirds}). Proportions deviate from the ideal equal division."

    def bone_text() -> str:
        if s.bone_structure >= 7.0:
            return "Strong jawline and cheekbone definition. Excellent facial framework."
        elif s.bone_structure >= 5.5:
            return "Decent midface support and jaw width. Chin projection is moderate."
        else:
            return "Jaw and cheekbone structure could benefit from more definition."

    def skin_text() -> str:
        if s.skin_quality >= 7.0:
            return "Clear, smooth skin with even texture and minimal blemishes."
        elif s.skin_quality >= 5.5:
            return "Generally clear but with visible pores, slight redness, and uneven texture."
        else:
            return "Skin texture shows notable unevenness. Would benefit from a consistent skincare routine."

    def eye_text() -> str:
        if s.eyes >= 7.0:
            return "Well-proportioned eyes with good spacing and symmetrical openness."
        elif s.eyes >= 5.5:
            return "Average almond shape. Slight hooding. Good eye spacing."
        else:
            return "Eye spacing or proportions deviate from ideal ratios."

    def nose_text() -> str:
        if s.nose >= 7.0:
            return "Nose is well-proportioned relative to face width. Balanced bridge and tip."
        elif s.nose >= 5.5:
            return "Nose width is proportionate. Tip is rounded; bridge is average height."
        else:
            return "Nose width ratio deviates from ideal. Bridge or tip could be more balanced."

    def lip_text() -> str:
        if s.lips >= 7.0:
            return "Full, well-shaped lips with excellent symmetry and proportion."
        elif s.lips >= 5.5:
            return "Fuller lower lip. Good lip symmetry and proportion."
        else:
            return "Lip width or symmetry falls outside the ideal range."

    def harmony_text() -> str:
        if s.overall_harmony >= 7.0:
            return "Features come together exceptionally well. Striking and balanced appearance."
        elif s.overall_harmony >= 5.5:
            return "Features work well together. Not strikingly unique but balanced and pleasant."
        else:
            return "Individual features are fine but overall cohesion could be improved."

    return [
        {"category": "Symmetry", "detail": sym_text()},
        {"category": "Proportions", "detail": prop_text()},
        {"category": "Bone Structure", "detail": bone_text()},
        {"category": "Skin", "detail": skin_text()},
        {"category": "Eyes", "detail": eye_text()},
        {"category": "Nose", "detail": nose_text()},
        {"category": "Lips", "detail": lip_text()},
        {"category": "Overall Harmony", "detail": harmony_text()},
    ]


def _generate_key_metrics(m: FaceMetrics) -> list[dict[str, str]]:
    return [
        {"label": "Face Shape", "value": m.face_shape},
        {"label": "Facial Length", "value": f"{m.face_ratio:.2f}  (Ideal ~1.0)"},
        {"label": "Face Width", "value": f"{m.face_ratio:.2f}  (Ideal ~1.4)"},
        {"label": "Interocular Distance", "value": f"{m.interocular_ratio:.2f}  (Ideal ~1.0)"},
        {"label": "Nose Width / Face Width", "value": f"{m.nose_width_ratio:.2f}  (Ideal ~0.33)"},
        {"label": "Lips Width / Face Width", "value": f"{m.lip_width_ratio:.2f}  (Ideal ~0.50)"},
        {"label": "Skin Clarity Score", "value": f"{min(m.skin_variance / 10, 10):.1f} / 10"},
    ]


def _generate_recommendations(s: ScoreBreakdown, m: FaceMetrics) -> dict[str, list[str]]:
    hair: list[str] = []
    if m.face_shape in ("Round", "Round / Oval"):
        hair.extend([
            "Add height on top to elongate the face",
            "Low to mid fade on the sides",
            "Keep top textured and lifted",
        ])
    elif m.face_shape == "Oblong":
        hair.extend([
            "Add width on the sides to balance face length",
            "Avoid excessive height on top",
            "Side-swept styles work well",
        ])
    else:
        hair.extend([
            "Most hairstyles suit your face shape",
            "Keep top textured and lifted",
            "Low to mid fade on the sides",
        ])
    hair.append("Style with matte clay for volume")
    hair.append("Avoid heavy fringe; keep forehead partially open")

    skincare: list[str] = [
        "AM: Cleanser, Vitamin C, Moisturizer, Sunscreen (SPF 30+)",
        "PM: Cleanser, Niacinamide, Moisturizer",
    ]
    if s.skin_quality < 6.5:
        skincare.append("Exfoliate 2–3x/week (BHA)")
        skincare.append("Stay hydrated, reduce sugar intake")
    else:
        skincare.append("Maintain current routine with retinol 2x/week")
        skincare.append("Weekly hydrating mask for extra glow")

    grooming: list[str] = [
        "Shape eyebrows: clean underside",
        "Consider clear nose strips 1–2x/week",
        "Light facial hair (if any): keep clean",
        "Lips: use SPF lip balm daily",
    ]

    return {
        "hair": hair[:5],
        "skincare": skincare[:5],
        "grooming": grooming[:5],
    }


# ── Public API ───────────────────────────────────────────────────────

def analyze_face(image_bytes: bytes, image_url: str = "") -> AnalysisResult:
    """Main entry point. Takes raw image bytes, returns a complete AnalysisResult."""
    # Decode image with OpenCV
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        return AnalysisResult(
            success=False,
            error="Could not decode image. Please upload a valid JPEG or PNG.",
        )

    h, w = image_bgr.shape[:2]

    # Convert to RGB for MediaPipe
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    # Create MediaPipe Image
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

    # Ensure model is downloaded
    model_path = _ensure_model()

    # Run FaceLandmarker
    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )

    with FaceLandmarker.create_from_options(options) as landmarker:
        result = landmarker.detect(mp_image)

    if not result.face_landmarks:
        return AnalysisResult(
            success=False,
            error="No face detected in the image. Please upload a clear, front-facing photo.",
        )

    # Get the first face's landmarks (list of NormalizedLandmark)
    face_landmarks = result.face_landmarks[0]

    # Extract metrics
    metrics = _extract_metrics(face_landmarks, w, h, image_bgr)

    # Compute scores
    scores = _compute_scores(metrics)
    overall = _overall_score(scores)
    label = _score_label(overall)

    # Generate text
    strengths = _generate_strengths(scores, metrics)
    improvements = _generate_improvements(scores, metrics)
    analysis = _generate_analysis(scores, metrics)
    key_metrics_list = _generate_key_metrics(metrics)
    recommendations = _generate_recommendations(scores, metrics)

    now = datetime.now()
    report_id = f"FBR-{now.strftime('%m%d%y')}-{uuid.uuid4().hex[:4].upper()}"

    return AnalysisResult(
        success=True,
        report_id=report_id,
        report_date=now.strftime("%d %B %Y").upper(),
        overall_score=overall,
        overall_label=label,
        scores=scores,
        metrics=metrics,
        strengths=strengths,
        improvements=improvements,
        analysis=analysis,
        key_metrics=key_metrics_list,
        recommendations=recommendations,
        image_url=image_url,
    )
