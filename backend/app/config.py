import os
from pathlib import Path


ROOT_DIR = Path(__file__).parent.parent
ENV_FILE = ROOT_DIR / ".env"


def _read_env_file():
    """Read .env file and return dict — does NOT set os.environ."""
    if not ENV_FILE.exists():
        return {}
    result = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            key, _, val = line.partition("=")
            result[key.strip()] = val.strip()
    return result


_env_vars = _read_env_file()


class Settings:
    mongo_url: str = _env_vars.get("MONGO_URL", os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db_name: str = _env_vars.get("DB_NAME", os.environ.get("DB_NAME", "screenapp"))
    anthropic_api_key: str = _env_vars.get("ANTHROPIC_API_KEY") or _env_vars.get("ANTHROPIC_AUTH_TOKEN") or ""
    whisper_model: str = _env_vars.get("WHISPER_MODEL", "base")
    cors_origins: str = _env_vars.get("CORS_ORIGINS", "*")
    upload_dir: Path = ROOT_DIR / "app" / "uploads"
    max_upload_size_mb: int = int(_env_vars.get("MAX_UPLOAD_SIZE_MB", "100"))


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)