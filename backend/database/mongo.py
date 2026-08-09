import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../atlas-credentials.env")
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
db = client["multi_agent_system"]
agent_state_collection = db["agent_states"]

async def save_agent_state(thread_id: str, state: dict):
    await agent_state_collection.update_one(
        {"thread_id": thread_id},
        {"$set": {"state": state}},
        upsert=True
    )

async def get_agent_state(thread_id: str):
    doc = await agent_state_collection.find_one({"thread_id": thread_id})
    if doc:
        return doc.get("state", {})
    return None
