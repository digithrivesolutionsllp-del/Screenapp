import logging
from pathlib import Path

import whisper

from app.config import settings


logger = logging.getLogger(__name__)

# Lazy-load the model so FastAPI starts quickly
_model = None


def get_model():
    """Load (once) and return the OpenAI Whisper model."""
    global _model
    if _model is None:
        logger.info("Loading OpenAI Whisper model: %s", settings.whisper_model)
        _model = whisper.load_model(settings.whisper_model)
    return _model


def transcribe_audio(audio_path: str | Path) -> tuple[str, float]:
    """
    Transcribe an audio file using OpenAI Whisper.

    Returns:
        A (transcript, duration_seconds) tuple.
    """
    model = get_model()
    result = model.transcribe(str(audio_path), language=None)
    segments = result.get("segments", [])
    duration = segments[-1].get("end", 0.0) if segments else 0.0
    text = result.get("text", "").strip()
    return text, duration