"""
FastAPI Microservice for H2S Guard Trace

Connects OpenCV image processing, scikit-learn calibration regression,
and PostgreSQL database storage into high-performance REST API endpoints.
"""

import os
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from image_processor import decode_base64_image, extract_wristband_features
from calibration_engine import calibrator
from database import (
    init_postgres_db,
    get_full_db_state,
    get_all_workers_from_postgres,
    save_worker_to_postgres,
    get_all_badges_from_postgres,
    save_badge_to_postgres,
    get_all_measurements_from_postgres,
    save_measurement_to_postgres,
    get_all_calibrations_from_postgres,
    save_calibration_to_postgres,
    get_all_alerts_from_postgres,
    save_alert_to_postgres,
    get_all_hse_reviews_from_postgres,
    save_hse_review_to_postgres,
    get_all_audit_logs_from_postgres,
    save_audit_log_to_postgres,
    get_all_users_from_postgres,
    save_user_to_postgres,
)

app = FastAPI(
    title="H2S Guard FastAPI Microservice",
    description="FastAPI + OpenCV + scikit-learn + PostgreSQL H2S Dosimetry Calibration API",
    version="1.0.0"
)

# Enable CORS for React/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_postgres_db()

class AnalyzeRequest(BaseModel):
    preShiftImage: str
    postShiftImage: str
    badgeId: str
    batchId: str
    workerId: Optional[str] = "W-108"
    shift: Optional[str] = "Morning Shift"
    durationHours: Optional[float] = 8.0

@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "framework": "FastAPI 0.100+",
        "image_engine": "OpenCV 4.8+ (Contour Detection & Color Spaces)",
        "calibration_engine": "scikit-learn Polynomial Ridge Regression",
        "database": "PostgreSQL Driver Active",
    }

# --- DB REST ENDPOINTS FOR POSTGRESQL PERSISTENCE ---
@app.get("/api/db/state")
def get_db_state():
    return get_full_db_state()

@app.get("/api/workers")
def get_workers():
    return get_all_workers_from_postgres()

@app.post("/api/workers")
def save_worker(payload: Dict[str, Any] = Body(...)):
    success = save_worker_to_postgres(payload)
    return {"success": success}

@app.get("/api/badges")
def get_badges():
    return get_all_badges_from_postgres()

@app.post("/api/badges")
def save_badge(payload: Dict[str, Any] = Body(...)):
    success = save_badge_to_postgres(payload)
    return {"success": success}

@app.get("/api/measurements")
def get_measurements():
    return get_all_measurements_from_postgres()

@app.post("/api/measurements")
def save_measurement(payload: Dict[str, Any] = Body(...)):
    success = save_measurement_to_postgres(payload)
    return {"success": success}

@app.get("/api/calibration")
def get_calibration():
    return get_all_calibrations_from_postgres()

@app.post("/api/calibration")
def save_calibration(payload: Dict[str, Any] = Body(...)):
    success = save_calibration_to_postgres(payload)
    return {"success": success}

@app.get("/api/alerts")
def get_alerts():
    return get_all_alerts_from_postgres()

@app.post("/api/alerts")
def save_alert(payload: Dict[str, Any] = Body(...)):
    success = save_alert_to_postgres(payload)
    return {"success": success}

@app.get("/api/hse-reviews")
def get_hse_reviews():
    return get_all_hse_reviews_from_postgres()

@app.post("/api/hse-reviews")
def save_hse_review(payload: Dict[str, Any] = Body(...)):
    success = save_hse_review_to_postgres(payload)
    return {"success": success}

@app.get("/api/audit-logs")
def get_audit_logs():
    return get_all_audit_logs_from_postgres()

@app.post("/api/audit-logs")
def save_audit_log(payload: Dict[str, Any] = Body(...)):
    success = save_audit_log_to_postgres(payload)
    return {"success": success}

@app.get("/api/users")
def get_users():
    return get_all_users_from_postgres()

@app.post("/api/users")
def save_user(payload: Dict[str, Any] = Body(...)):
    success = save_user_to_postgres(payload)
    return {"success": success}

@app.post("/api/sync")
def sync_offline_queue(payload: List[Dict[str, Any]] = Body(...)):
    synced_count = 0
    for item in payload:
        item_type = item.get("type")
        data = item.get("data") or {}
        if item_type == "measurement":
            if save_measurement_to_postgres(data):
                synced_count += 1
        elif item_type == "worker":
            if save_worker_to_postgres(data):
                synced_count += 1
        elif item_type == "badge":
            if save_badge_to_postgres(data):
                synced_count += 1
        elif item_type == "alert":
            if save_alert_to_postgres(data):
                synced_count += 1
        elif item_type == "hse_review":
            if save_hse_review_to_postgres(data):
                synced_count += 1
        elif item_type == "audit_log":
            if save_audit_log_to_postgres(data):
                synced_count += 1
        elif item_type == "user":
            if save_user_to_postgres(data):
                synced_count += 1

    return {"synced": True, "count": synced_count}

@app.post("/api/analyze")
def analyze_h2s_dosimeter(payload: AnalyzeRequest):
    try:
        # 1. OpenCV Feature Extraction
        img_pre = decode_base64_image(payload.preShiftImage)
        img_post = decode_base64_image(payload.postShiftImage)
        
        feat_pre = extract_wristband_features(img_pre)
        feat_post = extract_wristband_features(img_post)
        
        if not feat_pre["quality"]["is_pass"]:
            raise HTTPException(status_code=400, detail=f"Pre-shift image error: {feat_pre['quality']['failure_reason']}")
            
        if not feat_post["quality"]["is_pass"]:
            raise HTTPException(status_code=400, detail=f"Post-shift image error: {feat_post['quality']['failure_reason']}")
            
        # 2. scikit-learn Calibration & Exposure Calculation
        exposure_res = calibrator.predict_exposure(
            pre_rgb=feat_pre["rgb"],
            post_rgb=feat_post["rgb"],
            duration_hours=payload.durationHours or 8.0
        )
        
        meas_id = f"MEAS-{os.urandom(2).hex().upper()}"
        timestamp_str = "Just analyzed via FastAPI + OpenCV"
        
        meas_record = {
            "id": meas_id,
            "workerId": payload.workerId,
            "badgeId": payload.badgeId,
            "batchId": payload.batchId,
            "shift": payload.shift,
            "timestamp": timestamp_str,
            "exposure": exposure_res["cumulative_exposure_ppm_h"],
            "twaPpm": exposure_res["twa_ppm"],
            "status": exposure_res["status"],
        }
        
        # 3. PostgreSQL Database Persistence
        db_saved = save_measurement_to_postgres(meas_record)
        
        return {
            "success": True,
            "measurementId": meas_id,
            "badgeId": payload.badgeId,
            "batchId": payload.batchId,
            "workerId": payload.workerId,
            "preShift": feat_pre,
            "postShift": feat_post,
            "exposure": exposure_res,
            "postgresSaved": db_saved,
            "engine": "FastAPI + OpenCV + scikit-learn + PostgreSQL",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
