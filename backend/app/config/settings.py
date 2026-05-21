
from pydantic import model_validator
from pydantic_settings import BaseSettings

_INSECURE_SECRETS = {
    "change-this-secret-in-production",
    "secret",
    "jwt-secret",
    "my-secret",
    "your-secret-key",
}


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./health.db"
    JWT_SECRET_KEY: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: list[str] = []

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def db_engine(self) -> str:
        if self.DATABASE_URL.startswith("sqlite"):
            return "sqlite"
        return "mysql"

    @model_validator(mode="after")
    def _validate_jwt_secret(self) -> "Settings":
        if self.JWT_SECRET_KEY in _INSECURE_SECRETS or len(self.JWT_SECRET_KEY) < 32:
            raise ValueError(
                "JWT_SECRET_KEY es inseguro o demasiado corto (minimo 32 caracteres). "
                'Genera uno con: python -c "import secrets; print(secrets.token_urlsafe(64))"'
            )
        return self


settings = Settings()
