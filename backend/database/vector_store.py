import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv(dotenv_path="../pineconekey")
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
pc = Pinecone(api_key=PINECONE_API_KEY)

# Assume index name is 'agent-knowledge'
INDEX_NAME = 'agent-knowledge'

def get_pinecone_index():
    if INDEX_NAME not in pc.list_indexes().names():
        # Ideally, we should create the index here, but Pinecone free tier 
        # requires specific region and environment configurations.
        pass
    return pc.Index(INDEX_NAME)

def query_vector_store(query: str, top_k: int = 3):
    # This is a mock implementation. In a real system, you'd embed the query first.
    # We will use this in our tools.
    index = get_pinecone_index()
    # mock vector [0.1, 0.2, ...]
    vector = [0.1] * 1536 
    try:
        results = index.query(vector=vector, top_k=top_k, include_metadata=True)
        return results
    except Exception as e:
        return {"error": str(e)}
