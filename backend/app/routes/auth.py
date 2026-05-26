import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, EmailStr

from app.database import get_database
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token: str
    user: dict


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    db = get_database()

    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user_doc = {
        "email": body.email.lower(),
        "name": body.name,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)

    token = create_access_token({"sub": str(result.inserted_id), "email": body.email.lower()})
    return TokenResponse(
        token=token,
        user={"id": str(result.inserted_id), "email": body.email.lower(), "name": body.name},
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    db = get_database()

    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["_id"]), "email": user["email"]})
    return TokenResponse(
        token=token,
        user={"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "")},
    )


@router.get("/me")
async def get_me(authorization: str = Body(default=None)):
    """Get current user from Authorization: Bearer <token> header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization[7:]
    from app.auth import decode_token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = get_database()
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "")}
