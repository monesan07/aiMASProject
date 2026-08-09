import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage

def get_llm():
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        return ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.2, google_api_key=api_key)
    return None

def researcher_node(state):
    print("--- RESEARCHER ---")
    messages = state["messages"]
    llm = get_llm()
    
    # Mock tool call to Pinecone/Search
    if llm:
        prompt = f"You are a researcher. Provide information based on the conversation history: {messages[-1].content}"
        response = llm.invoke(prompt)
        content = response.content
    else:
        content = f"[MOCK] I have researched the topic: '{messages[-1].content}'. Found relevant documents in Pinecone and Web."
        
    return {"messages": [AIMessage(content=f"Researcher: {content}")], "sender": "Researcher"}

def writer_node(state):
    print("--- WRITER ---")
    messages = state["messages"]
    llm = get_llm()
    
    if llm:
        prompt = f"You are a technical writer. Draft a response based on the research provided. History: {messages[-1].content}"
        response = llm.invoke(prompt)
        content = response.content
    else:
        content = f"[MOCK] Based on the research, here is a well-crafted response regarding '{messages[-1].content}'."
    
    return {"messages": [AIMessage(content=f"Writer: {content}")], "sender": "Writer"}

def supervisor_node(state):
    print("--- SUPERVISOR ---")
    
    sender = state.get("sender")
    
    # Simple deterministic routing based on the last agent
    if sender == "user":
        next_agent = "Researcher"
    elif sender == "Researcher":
        next_agent = "Writer"
    else:
        next_agent = "FINISH"
        
    return {"next": next_agent}
