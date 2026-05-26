import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.models import HealthResponse
from app.routes.recordings import router as recordings_router
from app.routes.folders import router as folders_router
from app.routes.transcribe import router as transcribe_router
from app.routes.ai import router as ai_router
from app.routes.auth import router as auth_router


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup / shutdown lifecycle."""
    await connect_to_mongo()
    logger.info("Connected to MongoDB")
    yield
    await close_mongo_connection()
    logger.info("Closed MongoDB connection")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Screenapp API",
    description="Audio recording, transcription, and AI summarisation backend.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(recordings_router)
app.include_router(folders_router)
app.include_router(transcribe_router)
app.include_router(ai_router)
app.include_router(auth_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Return service health status."""
    from app.database import database

    db_status = "connected" if database.client is not None else "disconnected"
    return HealthResponse(status="ok", database=db_status)


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )