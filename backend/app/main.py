from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.routers import (
    activity,
    auth,
    body_metrics,
    permissions,
    roles,
    users,
    weight_goals,
)

app = FastAPI(
    title="Gastos API",
    description="Sistema de gastos con RBAC (Roles y Permisos)",
    version="1.0.0",
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


@app.get("/health")
async def health():
    return {"status": "ok"}
