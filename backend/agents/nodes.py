import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage
from langchain.prompts import PromptTemplate

# Ensure API key is loaded
llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.2)

def researcher_node(state):
    print("--- RESEARCHER ---")
    messages = state["messages"]
    
    # Mock tool call to Pinecone/Search
    prompt = f"You are a researcher. Use your knowledge to provide information based on the conversation history: {messages[-1].content}"
    response = llm.invoke(prompt)
    
    return {"messages": [AIMessage(content=f"Researcher: {response.content}")], "sender": "Researcher"}

def writer_node(state):
    print("--- WRITER ---")
    messages = state["messages"]
    
    prompt = f"You are a technical writer. Draft a response based on the research provided. History: {messages[-1].content}"
    response = llm.invoke(prompt)
    
    return {"messages": [AIMessage(content=f"Writer: {response.content}")], "sender": "Writer"}

def supervisor_node(state):
    print("--- SUPERVISOR ---")
    messages = state["messages"]
    
    # Simple rule-based routing for demonstration
    last_message = messages[-1].content.lower()
    
    if "research" in last_message or state.get("sender") == "user":
        next_agent = "Researcher"
    elif state.get("sender") == "Researcher":
        next_agent = "Writer"
    else:
        next_agent = "FINISH"
        
    return {"next": next_agent}
