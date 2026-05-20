from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config.settings import settings
from app.routers import (
    activity,
    auth,
    blood_pressure,
    body_metrics,
    dashboard,
    medical_history,
    permissions,
    reports,
    roles,
    users,
    weight_goals,
)

import os

_version_file = Path(__file__).resolve().parent.parent.parent / "VERSION"
_version = _version_file.read_text().strip() if _version_file.exists() else "0.0.0"

app = FastAPI(
    title="Health Web API",
    description="Sistema de salud personal con RBAC (Roles y Permisos)",
    version=_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api/v1"

app.include_router(auth, prefix=api_prefix)
app.include_router(blood_pressure, prefix=api_prefix)
app.include_router(dashboard, prefix=api_prefix)
app.include_router(users, prefix=api_prefix)
app.include_router(roles, prefix=api_prefix)
app.include_router(permissions, prefix=api_prefix)
app.include_router(activity, prefix=api_prefix)
app.include_router(body_metrics, prefix=api_prefix)
app.include_router(weight_goals, prefix=api_prefix)
app.include_router(medical_history, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
