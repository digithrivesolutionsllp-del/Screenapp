import logging
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException

from app.database import get_database
from app.services.claude_service import summarize_transcript, chat_about_transcript
from app.models import SummaryResponse, ChatRequest, ChatResponse


router = APIRouter(prefix="/api/recordings", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/{recording_id}/summarize", response_model=SummaryResponse)
async def summarize_recording(recording_id: str):
    """
    Generate a structured summary (key points, action items, decisions)
    from a recording's transcript using Claude Sonnet 4.
    """
    db = get_database()

    try:
        oid = ObjectId(recording_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid recording ID format")

    doc = await db.recordings.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Recording not found")

    transcript = doc.get("transcript")
    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="No transcript available. Please transcribe the recording first.",
        )

    logger.info("Summarizing recording %s with Claude Sonnet 4", recording_id)
    summary_text = summarize_transcript(transcript)

    await db.recordings.update_one(
        {"_id": oid},
        {"$set": {"summary": summary_text}},
    )
    logger.info("Summary complete for recording %s", recording_id)

    return SummaryResponse(recording_id=recording_id, summary=summary_text)


@router.post("/{recording_id}/chat", response_model=ChatResponse)
async def chat_about_recording(recording_id: str, request: ChatRequest):
    """
    Answer a question about a recording's transcript using Claude Sonnet 4.
    Supports conversation history for follow-up questions.
    """
    db = get_database()

    try:
        oid = ObjectId(recording_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid recording ID format")

    doc = await db.recordings.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Recording not found")

    transcript = doc.get("transcript")
    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="No transcript available. Please transcribe the recording first.",
        )

    logger.info("Chat request for recording %s", recording_id)
    answer = chat_about_transcript(
        transcript=transcript,
        user_message=request.message,
        history=request.history,
    )

    return ChatResponse(recording_id=recording_id, answer=answer)