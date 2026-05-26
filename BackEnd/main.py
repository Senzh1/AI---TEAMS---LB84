"""
FastAPI server for the Facial Beauty Report.

Endpoints:
  POST /api/analyze   — Upload an image, returns full JSON analysis
  GET  /api/uploads/{filename} — Serve back the uploaded image
"""

from __future__ import annotations

import os
import uuid
from dataclasses import asdict
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from analyzer import analyze_face

# ── Config ───────────────────────────────────────────────────────────
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Facial Beauty Report API",
    version="1.0.0",
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ────────────────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    """Accept an image upload, run the CV pipeline, and return the report JSON."""
    # Validate content type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an image.")

    # Read bytes
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="Image is too large (max 20 MB).")

    # Save to disk
    ext = Path(file.filename or "upload.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    image_url = f"/api/uploads/{filename}"

    # Analyze
    result = analyze_face(image_bytes, image_url=image_url)

    if not result.success:
        # Clean up the file on failure
        filepath.unlink(missing_ok=True)
        return JSONResponse(
            status_code=422,
            content={"success": False, "error": result.error},
        )

    return asdict(result)


@app.get("/api/uploads/{filename}")
async def get_upload(filename: str):
    """Serve an uploaded image back to the frontend."""
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(filepath)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Run directly ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    print("Starting Facial Beauty Report API on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
