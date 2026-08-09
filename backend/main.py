from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from agents.graph import graph
import os

app = FastAPI(title="Multi-Agent System API", version="1.0.0")

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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Multi-Agent System API is running"}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    # Execute the graph
    initial_state = {
        "messages": [HumanMessage(content=request.message)],
        "sender": "user"
    }
    
    # We run the graph and get the final state
    # In a real app we would stream this, but for simplicity we return the final
    final_state = graph.invoke(initial_state)
    
    # Extract the last message
    final_message = final_state["messages"][-1].content if final_state["messages"] else "No response"
    
    return {
        "response": final_message, 
        "state": {
            "messages": [msg.content for msg in final_state["messages"]],
            "next": final_state.get("next")
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
