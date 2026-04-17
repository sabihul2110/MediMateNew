# MediMate/backend/database.py
# MongoDB Atlas connection via Motor (async).
# Collections: users, vitals, bmi_logs, sleep_logs, activity_logs, chat_history
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URI, MONGO_DB

_client: AsyncIOMotorClient = None

def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client

def get_db():
    return get_client()[MONGO_DB]

# Convenience collection accessors
def users_col():       return get_db()["users"]
def vitals_col():      return get_db()["vitals"]
def bmi_col():         return get_db()["bmi_logs"]
def sleep_col():       return get_db()["sleep_logs"]
def activity_col():    return get_db()["activity_logs"]
def chat_col():        return get_db()["chat_history"]

async def ping():
    """Test Atlas connection — called at startup."""
    try:
        await get_client().admin.command("ping")
        print(f"[DB] ✅ Connected to MongoDB Atlas — db: {MONGO_DB}")
        return True
    except Exception as e:
        print(f"[DB] ❌ MongoDB connection failed: {e}")
        return False