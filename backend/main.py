import os
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from agents.graph import create_graph
from ingestion import ingest_documents
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(dotenv_path="../atlas-credentials.env")
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        mongo_client.server_info()

        from langgraph_checkpoint_mongodb import MongoDBSaver
        checkpointer = MongoDBSaver(mongo_client, db_name="multi_agent_system")
        app_state["graph"] = create_graph(checkpointer=checkpointer)
        app_state["mongo_client"] = mongo_client
        app_state["db"] = mongo_client["multi_agent_system"]
        app_state["checkpointer_enabled"] = True
        print("✅ MongoDB checkpointer connected. State persistence is ACTIVE.")
    except Exception as e:
        print(f"⚠️ MongoDB unavailable ({e}). Using in-memory graph (no persistence).")
        app_state["graph"] = create_graph(checkpointer=None)
        app_state["mongo_client"] = None
        app_state["db"] = None
        app_state["checkpointer_enabled"] = False

    yield

    if app_state.get("mongo_client"):
        app_state["mongo_client"].close()

app = FastAPI(title="Multi-Agent System API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    thread_id: str

class IngestRequest(BaseModel):
    text: str
    source: str = "manual-upload"

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Multi-Agent System API v2.0 is running",
        "checkpointer": "mongodb" if app_state.get("checkpointer_enabled") else "in-memory"
    }

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    graph = app_state["graph"]
    initial_state = {
        "messages": [HumanMessage(content=request.message)],
        "sender": "user"
    }

    config = {"configurable": {"thread_id": request.thread_id}}

    try:
        if app_state.get("checkpointer_enabled"):
            final_state = graph.invoke(initial_state, config=config)
        else:
            final_state = graph.invoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent graph execution failed: {str(e)}")

    final_message = final_state["messages"][-1].content if final_state["messages"] else "No response"

    if app_state.get("db") is not None:
        try:
            app_state["db"]["agent_sessions"].update_one(
                {"thread_id": request.thread_id},
                {"$set": {
                    "thread_id": request.thread_id,
                    "last_message": request.message,
                    "last_response": final_message,
                    "updated_at": datetime.datetime.utcnow().isoformat()
                }, "$inc": {"message_count": 1}},
                upsert=True
            )
        except Exception:
            pass

    return {
        "response": final_message,
        "thread_id": request.thread_id,
        "checkpointed": app_state.get("checkpointer_enabled", False),
        "state": {
            "messages": [msg.content for msg in final_state["messages"]],
            "next": final_state.get("next")
        }
    }

@app.post("/api/ingest")
async def ingest_endpoint(request: IngestRequest):
    result = ingest_documents(text=request.text, source=request.source)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@app.get("/api/sessions")
async def get_sessions():
    if app_state.get("db") is None:
        return {"sessions": [], "checkpointer_enabled": False}
    try:
        sessions = list(
            app_state["db"]["agent_sessions"].find({}, {"_id": 0}).sort("updated_at", -1).limit(20)
        )
        return {"sessions": sessions, "checkpointer_enabled": True}
    except Exception as e:
        return {"sessions": [], "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
