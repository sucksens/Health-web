from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.routers import activity, auth, permissions, roles, users

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

app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(roles.router, prefix=api_prefix)
app.include_router(permissions.router, prefix=api_prefix)
app.include_router(activity.router, prefix=api_prefix)


@app.get("/health")
async def health():
    return {"status": "ok"}
