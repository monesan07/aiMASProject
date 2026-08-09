import os
import random
import time
from langchain_core.messages import AIMessage
from dotenv import load_dotenv

load_dotenv(dotenv_path="../atlas-credentials.env")
load_dotenv()

FREE_MODEL_CATALOG = [
    {"provider": "groq", "model_id": "llama-3.1-8b-instant", "display_name": "Llama 3.1 8B Instant", "context_k": 131, "notes": "Ultra-fast via Groq"},
    {"provider": "groq", "model_id": "llama-3.2-3b-preview", "display_name": "Llama 3.2 3B", "context_k": 8, "notes": "Compact & fast via Groq"},
    {"provider": "groq", "model_id": "gemma2-9b-it", "display_name": "Gemma 2 9B", "context_k": 8, "notes": "Google Gemma via Groq"},
    {"provider": "groq", "model_id": "mixtral-8x7b-32768", "display_name": "Mixtral 8x7B", "context_k": 32, "notes": "MoE model via Groq"},
    {"provider": "gemini", "model_id": "gemini-1.5-flash", "display_name": "Gemini 1.5 Flash", "context_k": 1000, "notes": "Google · 1M context"},
    {"provider": "openrouter", "model_id": "meta-llama/llama-3.2-3b-instruct:free", "display_name": "Llama 3.2 3B (Free)", "context_k": 8, "notes": "OpenRouter free tier"},
    {"provider": "openrouter", "model_id": "google/gemma-3-12b:free", "display_name": "Gemma 3 12B (Free)", "context_k": 8, "notes": "OpenRouter free tier"},
    {"provider": "together", "model_id": "meta-llama/Llama-3-8b-chat-hf", "display_name": "Llama 3 8B (Together)", "context_k": 8, "notes": "Together.ai free tier"},
    {"provider": "huggingface", "model_id": "microsoft/Phi-3-mini-4k-instruct", "display_name": "Phi-3 Mini", "context_k": 4, "notes": "HuggingFace Inference API"},
    {"provider": "ollama", "model_id": "llama3", "display_name": "Llama 3 (Local)", "context_k": 8, "notes": "Ollama local inference"},
    {"provider": "ollama", "model_id": "mistral", "display_name": "Mistral 7B (Local)", "context_k": 8, "notes": "Ollama local inference"},
    {"provider": "ollama", "model_id": "phi3", "display_name": "Phi-3 Mini (Local)", "context_k": 4, "notes": "Ollama local inference"},
]


def get_llm(provider: str = None, model_id: str = None):
    """Try to get an LLM in priority order: requested provider → Groq → Gemini → mock."""

    if provider and provider != "auto":
        llm = _try_provider(provider, model_id)
        if llm:
            return llm, provider

    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            from langchain_groq import ChatGroq
            return ChatGroq(
                model=model_id if provider == "groq" and model_id else "llama-3.1-8b-instant",
                temperature=0.3,
                groq_api_key=groq_key,
            ), "groq"
        except Exception:
            pass

    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                temperature=0.2,
                google_api_key=google_key,
            ), "gemini"
        except Exception:
            pass

    return None, "mock"


def _try_provider(provider: str, model_id: str):
    try:
        if provider == "groq":
            key = os.getenv("GROQ_API_KEY")
            if not key:
                return None
            from langchain_groq import ChatGroq
            return ChatGroq(model=model_id or "llama-3.1-8b-instant", temperature=0.3, groq_api_key=key)

        if provider == "gemini":
            key = os.getenv("GOOGLE_API_KEY")
            if not key:
                return None
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(model=model_id or "gemini-1.5-flash", temperature=0.2, google_api_key=key)

        if provider == "openrouter":
            key = os.getenv("OPENROUTER_API_KEY")
            if not key:
                return None
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_id or "meta-llama/llama-3.2-3b-instruct:free",
                temperature=0.3,
                api_key=key,
                base_url="https://openrouter.ai/api/v1",
            )

        if provider == "together":
            key = os.getenv("TOGETHER_API_KEY")
            if not key:
                return None
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_id or "meta-llama/Llama-3-8b-chat-hf",
                temperature=0.3,
                api_key=key,
                base_url="https://api.together.xyz/v1",
            )

        if provider == "huggingface":
            key = os.getenv("HUGGINGFACE_API_KEY")
            if not key:
                return None
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_id or "microsoft/Phi-3-mini-4k-instruct",
                temperature=0.3,
                api_key=key,
                base_url="https://api-inference.huggingface.co/v1",
            )

        if provider == "ollama":
            try:
                from langchain_ollama import ChatOllama
                return ChatOllama(model=model_id or "llama3", temperature=0.3)
            except ImportError:
                from langchain_openai import ChatOpenAI
                ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
                return ChatOpenAI(
                    model=model_id or "llama3",
                    temperature=0.3,
                    api_key="ollama",
                    base_url=f"{ollama_url}/v1",
                )
    except Exception:
        return None


def researcher_node(state):
    print("--- RESEARCHER ---")
    messages = state["messages"]
    query = messages[-1].content
    provider = state.get("model_provider")
    model_id = state.get("model_id")
    llm, active_provider = get_llm(provider, model_id)

    if llm:
        try:
            prompt = (
                "You are a specialized AI researcher in a multi-agent system. "
                "Research the following topic concisely and provide key findings with supporting evidence. "
                f"Query: {query}"
            )
            response = llm.invoke(prompt)
            content = f"[{active_provider.upper()}] Research findings: {response.content}"
        except Exception:
            content = f"[MOCK] Research on '{query}': Found 3 relevant documents in Pinecone vector store. Key entities identified. RAG retrieval score: 0.87."
    else:
        content = f"[MOCK] Research on '{query}': Found 3 relevant documents in Pinecone vector store. Key entities identified. RAG retrieval score: 0.87."

    return {"messages": [AIMessage(content=content)], "sender": "Researcher"}


def writer_node(state):
    print("--- WRITER ---")
    messages = state["messages"]
    research_content = messages[-1].content
    provider = state.get("model_provider")
    model_id = state.get("model_id")
    llm, active_provider = get_llm(provider, model_id)

    if llm:
        try:
            prompt = (
                "You are a professional technical writer in a multi-agent system. "
                "Based on the following research, compose a clear and concise final response for the user. "
                f"Research: {research_content}"
            )
            response = llm.invoke(prompt)
            content = f"[{active_provider.upper()}] {response.content}"
        except Exception:
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
