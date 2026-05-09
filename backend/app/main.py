from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config.settings import settings
from app.routers import (
    activity,
    auth,
    body_metrics,
    medical_history,
    permissions,
    roles,
    users,
    weight_goals,
)

import os

app = FastAPI(
    title="Health Web API",
    description="Sistema de salud personal con RBAC (Roles y Permisos)",
    version="2.0.0",
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
app.include_router(users, prefix=api_prefix)
app.include_router(roles, prefix=api_prefix)
app.include_router(permissions, prefix=api_prefix)
app.include_router(activity, prefix=api_prefix)
app.include_router(body_metrics, prefix=api_prefix)
app.include_router(weight_goals, prefix=api_prefix)
app.include_router(medical_history, prefix=api_prefix)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
