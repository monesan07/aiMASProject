import os
import random
import time
from langchain_core.messages import AIMessage
from dotenv import load_dotenv

load_dotenv(dotenv_path="../atlas-credentials.env")
load_dotenv()

def get_llm():
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            from langchain_groq import ChatGroq
            return ChatGroq(model="llama-3.1-8b-instant", temperature=0.3, groq_api_key=groq_key), "groq"
        except Exception:
            pass

    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.2, google_api_key=google_key), "gemini"
        except Exception:
            pass

    return None, "mock"

def researcher_node(state):
    print("--- RESEARCHER ---")
    messages = state["messages"]
    query = messages[-1].content
    llm, provider = get_llm()

    if llm:
        try:
            prompt = (
                "You are a specialized AI researcher in a multi-agent system. "
                "Research the following topic concisely and provide key findings with supporting evidence. "
                f"Query: {query}"
            )
            response = llm.invoke(prompt)
            content = f"[{provider.upper()}] Research findings: {response.content}"
        except Exception as e:
            content = f"[MOCK] Research on '{query}': Found 3 relevant documents in Pinecone vector store. Key entities identified. RAG retrieval score: 0.87."
    else:
        content = f"[MOCK] Research on '{query}': Found 3 relevant documents in Pinecone vector store. Key entities identified. RAG retrieval score: 0.87."

    return {"messages": [AIMessage(content=content)], "sender": "Researcher"}

def writer_node(state):
    print("--- WRITER ---")
    messages = state["messages"]
    research_content = messages[-1].content
    llm, provider = get_llm()

    if llm:
        try:
            prompt = (
                "You are a professional technical writer in a multi-agent system. "
                "Based on the following research, compose a clear and concise final response for the user. "
                f"Research: {research_content}"
            )
            response = llm.invoke(prompt)
            content = f"[{provider.upper()}] {response.content}"
        except Exception as e:
            content = f"[MOCK] Based on research analysis: The topic has been thoroughly investigated. Confidence score: 0.91. Sources: 3 Pinecone docs + web context."
    else:
        content = f"[MOCK] Based on research analysis: The topic has been thoroughly investigated. Confidence score: 0.91. Sources: 3 Pinecone docs + web context."

    return {"messages": [AIMessage(content=content)], "sender": "Writer"}

def supervisor_node(state):
    print("--- SUPERVISOR ---")
    sender = state.get("sender", "user")

    if sender == "user":
        next_agent = "Researcher"
    elif sender == "Researcher":
        next_agent = "Writer"
    else:
        next_agent = "FINISH"

    return {"next": next_agent}
