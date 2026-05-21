import logging
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException

from app.database import get_database
from app.config import settings
from app.services.whisper_service import transcribe_audio
from app.models import TranscriptResponse


router = APIRouter(prefix="/api/recordings", tags=["transcription"])
logger = logging.getLogger(__name__)


@router.post("/{recording_id}/transcribe", response_model=TranscriptResponse)
async def transcribe_recording(recording_id: str):
    """
    Run Whisper transcription on a previously uploaded audio file.
    Saves the resulting transcript back to MongoDB.
    """
    db = get_database()

    try:
        oid = ObjectId(recording_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid recording ID format")

    doc = await db.recordings.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Recording not found")

    filepath = settings.upload_dir / doc["filename"]
    if not filepath.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Audio file not found on disk: {doc['filename']}",
        )

    logger.info("Starting Whisper transcription for recording %s", recording_id)
    transcript_text, duration = transcribe_audio(filepath)

    await db.recordings.update_one(
        {"_id": oid},
        {"$set": {"transcript": transcript_text, "duration": duration}},
    )
    logger.info("Transcription complete for recording %s (%.1f s)", recording_id, duration)

    return TranscriptResponse(
        recording_id=recording_id,
        transcript=transcript_text,
        duration=duration,
    )