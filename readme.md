# Multi-Agent System (MAS) Demonstration Project

A production-grade **Agentic AI Demo** showcasing LangGraph orchestration, RAG pipelines, Model Context Protocol (MCP), multi-provider free LLM support, deterministic guardrails, and a comprehensive observability dashboard.

> **Deep-dive:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical architecture — system diagrams, data flow walkthroughs, API schemas, file structure, and deployment guide.

---

## Architecture & Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 · React 19 · Tailwind CSS v4 · React Flow (DnD canvas) |
| **Backend** | Python · FastAPI · LangGraph (stateful agent orchestration) |
| **LLM Engine** | Groq · Gemini · Together.ai · OpenRouter · HuggingFace · Ollama (all free) |
| **Vector DB (RAG)** | Pinecone (768-dim embeddings via Google AI) |
| **Agent State** | MongoDB Atlas (async via motor) |
| **Guardrails** | LlamaFirewall · NeMo Guardrails · Custom NLI (sidecar thread) |

---

## Features

### Workspace Tab
- **Multi-agent chat** — Supervisor → Researcher → Writer pipeline with real-time agent activation indicators
- **Live A2A canvas** — Drag-and-drop React Flow graph; connect agents, MCP tools, and vector stores
- **MCP tool selector** — 18+ tools across 6 categories (Search, Storage, DevOps, Communication, Productivity, AI)
- **Guardrail sidecar** — 10 configurable safety checks run in parallel, displayed with pass/fail scores

### Data & Ingestion Tab
- **Pinecone ingestion pipeline** — Chunk → Embed (Google AI 768d) → Upsert
- **Sample document loader** — One-click load of LangGraph, RAG, and MAS reference docs
- **MongoDB session browser** — View all agent sessions with latency, message counts, and Q/A previews

### Metrics & Observability Tab
- **RAG Triad (RAGAS)** — Faithfulness, Answer Relevance, Context Precision, Context Recall
- **Hallucination Detection** — NLI entailment score, source coverage, confidence, hallucination risk
- **LLM-as-Judge** — Completeness, groundedness, conciseness, coherence with configurable judge model
- **Ranking Metrics** — MRR@10, NDCG@10, Precision@5, Recall@10, MAP@10
- **Governance & Compliance** — PII events, policy violations, token usage, estimated cost
- **NLI & Chunking Insights** — Detailed explanations of entailment, hallucination, and chunking checks

### Settings Tab
- **Free model selection** — 12 model options across Groq, Gemini, OpenRouter, Together.ai, HuggingFace, Ollama
- **Custom MCP server URL** — Connect any MCP-compatible endpoint (SSE or WebSocket)
- **Ollama base URL** — Configure local Ollama instance
- **Guardrail reference panel** — Shows all guardrail categories, methods, and severity levels

---

## Guardrails (Deterministic Sidecar Thread)

All guardrails run synchronously alongside the agent pipeline. No external ML calls — pure deterministic logic.

| Guardrail | Category | Method | Severity |
|-----------|----------|--------|----------|
| Prompt Injection | LlamaFirewall | Regex pattern matching | Critical |
| Toxicity Filter | LlamaFirewall | Keyword detection | High |
| Code Injection | LlamaFirewall | Script pattern matching | Critical |
| PII Detection | NeMo Guardrails | Email/phone/SSN/CC regex | Medium |
| Topic Policy | NeMo Guardrails | Restricted topic list | Medium |
| Dialogue Flow | NeMo Guardrails | Input length & coherence | Low |
| Entailment Check | Custom NLI | Keyword overlap scoring | Medium |
| Hallucination Risk | Custom NLI | Claim/hedge phrase ratio | High |
| Chunking Quality | Custom NLI | Word count & sentence coherence | Low |
| Bias Detection | Custom NLI | Stereotyping language patterns | Medium |

---

## Free LLM Providers

All models require only a free-tier API key (or no key for Ollama):

| Provider | Models | Free Tier |
|----------|--------|-----------|
| **Groq** | Llama 3.1 8B, Llama 3.2 3B, Gemma 2 9B, Mixtral 8x7B | Yes — [console.groq.com](https://console.groq.com) |
| **Google Gemini** | Gemini 1.5 Flash (1M context) | Yes — [aistudio.google.com](https://aistudio.google.com) |
| **OpenRouter** | Llama 3.2 3B Free, Gemma 3 12B Free | Yes — [openrouter.ai](https://openrouter.ai) |
| **Together.ai** | Llama 3 8B Chat | Yes — [api.together.xyz](https://api.together.xyz) |
| **HuggingFace** | Phi-3 Mini | Yes — [huggingface.co](https://huggingface.co) |
| **Ollama** | Llama 3, Mistral 7B, Phi-3 Mini | 100% local & free |

---

## Running Locally

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

Access at **http://localhost:3000**

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend runs at **http://localhost:8000**

### 3. Environment Variables

Create `backend/.env`:

```env
# Required: at least one LLM provider
GROQ_API_KEY=your-groq-key
GOOGLE_API_KEY=your-google-key

# Optional: additional free providers
OPENROUTER_API_KEY=your-openrouter-key
TOGETHER_API_KEY=your-together-key
HUGGINGFACE_API_KEY=your-hf-token

# Optional: persistence
MONGODB_URI=mongodb+srv://...
PINECONE_API_KEY=your-pinecone-key

# Optional: local Ollama
OLLAMA_BASE_URL=http://localhost:11434
```

The backend **gracefully degrades** — missing keys trigger `[MOCK]` responses so demos never crash.

---

## Deployment

### Frontend → Vercel (Free)
1. Push to GitHub
2. Import at [vercel.com](https://vercel.com) — set Root Directory to `frontend`
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`

### Backend → Render (Free)
1. New Web Service at [render.com](https://render.com)
2. Root Directory: `backend` · Build: `pip install -r requirements.txt` · Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add all environment variables in the Render dashboard

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | GET | Health check, LLM chain status |
| `POST /api/chat` | POST | Run multi-agent pipeline |
| `GET /api/models` | GET | List all available free models |
| `POST /api/guardrails/check` | POST | Evaluate guardrails standalone |
| `POST /api/ingest` | POST | Ingest document into Pinecone |
| `GET /api/sessions` | GET | Fetch recent MongoDB sessions |
| `GET /api/metrics` | GET | Aggregated observability metrics |
