import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_database

router = APIRouter(prefix="/api/folders", tags=["folders"])
logger = logging.getLogger(__name__)


class FolderCreate(BaseModel):
    name: str


class FolderUpdate(BaseModel):
    name: str


class FolderResponse(BaseModel):
    id: str
    name: str
    created_at: str
    recording_count: int = 0


@router.get("")
async def list_folders():
    """Return all folders."""
    db = get_database()
    folders = await db.folders.find().to_list(length=500)
    result = []
    for f in folders:
        count = await db.recordings.count_documents({"folder_id": str(f["_id"])})
        result.append({
            "id": str(f["_id"]),
            "name": f["name"],
            "created_at": f["created_at"].isoformat() if isinstance(f.get("created_at"), datetime) else f.get("created_at", ""),
            "recording_count": count,
        })
    return result


@router.post("")
async def create_folder(data: FolderCreate):
    """Create a new folder."""
    db = get_database()
    doc = {
        "name": data.name,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.folders.insert_one(doc)
    logger.info("Created folder %s: %s", result.inserted_id, data.name)
    return {
        "id": str(result.inserted_id),
        "name": data.name,
        "created_at": doc["created_at"].isoformat(),
        "recording_count": 0,
    }


@router.put("/{folder_id}")
async def rename_folder(folder_id: str, data: FolderUpdate):
    """Rename a folder."""
    db = get_database()
    try:
        oid = ObjectId(folder_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid folder ID")
    result = await db.folders.update_one({"_id": oid}, {"$set": {"name": data.name}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    logger.info("Renamed folder %s to %s", folder_id, data.name)
    return {"status": "ok"}


@router.delete("/{folder_id}")
async def delete_folder(folder_id: str):
    """Delete a folder (recordings inside go to root)."""
    db = get_database()
    try:
        oid = ObjectId(folder_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid folder ID")
    # Move recordings in this folder to root
    await db.recordings.update_many({"folder_id": folder_id}, {"$set": {"folder_id": None}})
    result = await db.folders.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    logger.info("Deleted folder %s", folder_id)
    return {"status": "deleted", "id": folder_id}
