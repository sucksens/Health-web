import os
import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_user_dir(user_id: int) -> Path:
    user_dir = UPLOAD_DIR / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


async def save_upload(file: UploadFile, user_id: int) -> tuple[str, str]:
    ext = Path(file.filename or "file").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extension no permitida: {ext}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(
            f"Archivo demasiado grande (max {MAX_FILE_SIZE // (1024 * 1024)} MB)"
        )

    filename = f"{uuid.uuid4().hex}{ext}"
    user_dir = _get_user_dir(user_id)
    file_path = user_dir / filename

    with open(file_path, "wb") as f:
        f.write(content)

    return filename, str(file_path)


def delete_file(file_path: str) -> None:
    path = Path(file_path)
    if path.exists() and UPLOAD_DIR in path.resolve().parents:
        path.unlink()
