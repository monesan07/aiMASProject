import os
from pinecone import Pinecone, ServerlessSpec
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv(dotenv_path="../atlas-credentials.env")
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "mas-knowledge-base"
EMBEDDING_MODEL = "models/embedding-001"

def get_pinecone_index():
    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing = [i.name for i in pc.list_indexes()]
    if INDEX_NAME not in existing:
        pc.create_index(
            name=INDEX_NAME,
            dimension=768,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
    return pc.Index(INDEX_NAME)

def ingest_documents(text: str, source: str = "manual") -> dict:
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_text(text)

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return {
                "success": True,
                "chunks_ingested": len(chunks),
                "mock": True,
                "message": f"[MOCK] Would have ingested {len(chunks)} chunks from '{source}' into Pinecone. (No GOOGLE_API_KEY set for embeddings)"
            }

        embedder = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL, google_api_key=api_key)
        index = get_pinecone_index()

        vectors = []
        for i, chunk in enumerate(chunks):
            embedding = embedder.embed_query(chunk)
            vectors.append({
                "id": f"{source}-chunk-{i}",
                "values": embedding,
                "metadata": {"text": chunk, "source": source}
            })

        index.upsert(vectors=vectors)

        return {
            "success": True,
            "chunks_ingested": len(chunks),
            "mock": False,
            "message": f"Successfully ingested {len(chunks)} chunks from '{source}' into Pinecone index '{INDEX_NAME}'."
        }
    except Exception as e:
        return {
            "success": False,
            "chunks_ingested": 0,
            "mock": False,
            "message": f"Ingestion failed: {str(e)}"
        }

def query_knowledge_base(query: str, top_k: int = 5) -> list[dict]:
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return [{"text": "[MOCK] This is a simulated RAG result from Pinecone.", "score": 0.95, "source": "mock"}]

        embedder = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL, google_api_key=api_key)
        index = get_pinecone_index()

        query_embedding = embedder.embed_query(query)
        results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)

        return [
            {"text": match["metadata"].get("text", ""), "score": match["score"], "source": match["metadata"].get("source", "unknown")}
            for match in results.get("matches", [])
        ]
    except Exception:
        return [{"text": "[MOCK] Pinecone query failed — returning simulated result.", "score": 0.9, "source": "fallback"}]
