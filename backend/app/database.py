from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


database = Database()


async def connect_to_mongo():
    """Initialise the MongoDB connection."""
    database.client = AsyncIOMotorClient(settings.mongo_url)
    database.db = database.client[settings.db_name]


async def close_mongo_connection():
    """Close the MongoDB connection."""
    if database.client:
        database.client.close()


def get_database() -> AsyncIOMotorDatabase:
    """Return the database instance for dependency injection."""
    if database.db is None:
        raise RuntimeError("Database is not initialised")
    return database.db
