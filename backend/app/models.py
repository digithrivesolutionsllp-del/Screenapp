from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class RecordingCreate(BaseModel):
    title: str


class RecordingResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str = Field(alias="_id")
    title: str
    filename: str
    folder_id: Optional[str] = None
    duration: Optional[float] = None
    size: Optional[int] = None
    created_at: datetime
    transcript: Optional[str] = None
    summary: Optional[str] = None

    @classmethod
    def from_mongo(cls, doc: dict) -> "RecordingResponse":
        doc["_id"] = str(doc["_id"])
        return cls(**doc)


class TranscriptResponse(BaseModel):
    recording_id: str
    transcript: str
    duration: float


class SummaryResponse(BaseModel):
    recording_id: str
    summary: str


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    recording_id: str
    answer: str


class HealthResponse(BaseModel):
    status: str
    database: str
