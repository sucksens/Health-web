from pathlib import Path

from app.config.settings import settings

UPLOAD_DIR: Path = Path(settings.UPLOAD_DIR)


def ensure_upload_dir() -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR
