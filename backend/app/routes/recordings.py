import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path

import aiofiles
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from bson import ObjectId
from pydantic import BaseModel

from app.database import get_database
from app.config import settings
from app.models import RecordingResponse

router = APIRouter(prefix="/api/recordings", tags=["recordings"])
logger = logging.getLogger(__name__)


class RecordingUpdate(BaseModel):
    title: str | None = None
    folder_id: str | None = None


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


@router.post("/upload")
async def upload_recording(
    title: str = Form(...),
    file: UploadFile = File(...),
):
    db = get_database()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_size_mb} MB")
    file_id = str(uuid.uuid4())
    ext = Path(file.filename or "audio.mp3").suffix or ".mp3"
    filename = f"{file_id}{ext}"
    filepath = settings.upload_dir / filename
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)
    doc = {
        "title": title,
        "filename": filename,
        "folder_id": None,
        "duration": None,
        "created_at": datetime.now(timezone.utc),
        "transcript": None,
        "summary": None,
    }
    result = await db.recordings.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("Created recording %s: %s", doc["_id"], title)
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "filename": doc["filename"],
        "folder_id": None,
        "duration": None,
        "created_at": doc["created_at"].isoformat(),
        "transcript": None,
        "summary": None,
    }


@router.get("")
async def list_recordings(folder_id: str | None = None):
    """Return recordings, optionally filtered by folder. folder_id=null means root."""
    db = get_database()
    query = {}
    if folder_id == "" or folder_id is None:
        query["folder_id"] = None
    elif folder_id == "all":
        pass
    else:
        query["folder_id"] = folder_id
    cursor = db.recordings.find(query, {
        "_id": 1, "title": 1, "filename": 1, "folder_id": 1,
        "duration": 1, "created_at": 1, "transcript": 1, "summary": 1
    }).sort("created_at", -1)
    docs = await cursor.to_list(length=1000)
    return [RecordingResponse.from_mongo(d) for d in docs]


@router.patch("/{recording_id}")
async def update_recording(recording_id: str, data: RecordingUpdate):
    """Rename a recording or move it to a folder."""
    db = get_database()
    try:
        oid = ObjectId(recording_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid recording ID")
    update = {}
    if data.title is not None:
        update["title"] = data.title
    if data.folder_id is not None:
        update["folder_id"] = data.folder_id if data.folder_id != "" else None
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.recordings.update_one({"_id": oid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recording not found")
    doc = await db.recordings.find_one({"_id": oid})
    logger.info("Updated recording %s: %s", recording_id, update)
    return RecordingResponse.from_mongo(doc)


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(recording_id: str):
    db = get_database()
    doc = await db.recordings.find_one({"_id": ObjectId(recording_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Recording not found")
    return RecordingResponse.from_mongo(doc)


@router.get("/{recording_id}/audio")
async def stream_audio(recording_id: str):
    db = get_database()
    try:
        oid = ObjectId(recording_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid recording ID")
    doc = await db.recordings.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Recording not found")
    filepath = settings.upload_dir / doc["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    from starlette.responses import FileResponse
    return FileResponse(filepath, media_type="audio/webm", filename=doc["filename"])


@router.delete("/{recording_id}")
async def delete_recording(recording_id: str):
    db = get_database()
    doc = await db.recordings.find_one({"_id": ObjectId(recording_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Recording not found")
    filepath = settings.upload_dir / doc["filename"]
    if filepath.exists():
        os.remove(filepath)
    await db.recordings.delete_one({"_id": ObjectId(recording_id)})
    logger.info("Deleted recording %s", recording_id)
    return {"status": "deleted", "id": recording_id}
