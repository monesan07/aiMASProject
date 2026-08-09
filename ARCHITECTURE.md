# Architecture Overview — MAS Orchestrator

> A production-grade Multi-Agent System (MAS) demonstration built on LangGraph, with a RAG pipeline, deterministic guardrails, free-tier LLM support, MCP tool integration, and a full observability dashboard.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Agent Orchestration (LangGraph)](#5-agent-orchestration-langgraph)
6. [RAG Pipeline (Pinecone)](#6-rag-pipeline-pinecone)
7. [Guardrails System](#7-guardrails-system)
8. [LLM Provider Chain](#8-llm-provider-chain)
9. [MCP Tool Integration](#9-mcp-tool-integration)
10. [State & Persistence (MongoDB)](#10-state--persistence-mongodb)
11. [Observability & Metrics](#11-observability--metrics)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [API Reference](#13-api-reference)
14. [File Structure](#14-file-structure)
15. [Security Model](#15-security-model)
16. [Deployment Architecture](#16-deployment-architecture)

---

## 1. System Overview

The MAS Orchestrator is a full-stack agentic AI platform that demonstrates five advanced AI engineering concepts in a single runnable project:

| Concept | Implementation |
|---------|---------------|
| **Multi-Agent Orchestration** | LangGraph `StateGraph` with Supervisor → Researcher → Writer routing |
| **Retrieval-Augmented Generation** | Pinecone vector store + Google AI 768-dim embeddings + RecursiveTextSplitter |
| **Deterministic Guardrails** | 10 safety checks across LlamaFirewall, NeMo Guardrails, and Custom NLI frameworks |
| **Model Context Protocol** | 18 MCP tool categories with drag-and-drop canvas integration |
| **LLM Agnosticism** | 6 free providers (Groq, Gemini, OpenRouter, Together.ai, HuggingFace, Ollama) with automatic fallback |

The system operates entirely on **free-tier services** and degrades gracefully to mock mode when API keys are absent — making it safe to demo without credentials.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (localhost:3000)                        │
│                                                                          │
│  ┌──────────────┐  ┌────────────────────┐  ┌────────────────────────┐  │
│  │  Workspace   │  │  Data & Ingestion  │  │  Metrics & Observ.     │  │
│  │  Tab         │  │  Tab               │  │  Tab                   │  │
│  │              │  │                    │  │                         │  │
│  │ ┌──────────┐ │  │  Pinecone Ingest   │  │  RAG Triad · RAGAS     │  │
│  │ │Chat Panel│ │  │  MongoDB Sessions  │  │  Hallucination · NLI   │  │
│  │ │          │ │  │                    │  │  LLM-as-Judge          │  │
│  │ │A2A Canvas│ │  └────────────────────┘  │  Ranking · Governance  │  │
│  │ │          │ │                          │  Toxicity · Retrieval  │  │
│  │ │Guardrails│ │  ┌────────────────────┐  │  Model Comparison      │  │
│  │ │Sidecar   │ │  │   Settings Tab     │  │  Trend Sparklines      │  │
│  │ └──────────┘ │  │  Model Selection   │  └────────────────────────┘  │
│  └──────────────┘  │  MCP Config        │                               │
│                    │  Guardrail Config  │                               │
│                    └────────────────────┘                               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  HTTP/REST (axios)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND (localhost:8000)                   │
│                                                                          │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │/api/chat  │  │/api/ingest   │  │/api/guardrails│  │/api/metrics  │  │
│  │           │  │              │  │/check         │  │              │  │
│  └─────┬─────┘  └──────┬───────┘  └──────┬────────┘  └──────────────┘  │
│        │               │                  │                              │
│        ▼               ▼                  ▼                              │
│  ┌──────────┐   ┌────────────┐   ┌────────────────────────────────┐    │
│  │LangGraph │   │Ingestion   │   │    Guardrails Engine           │    │
│  │StateGraph│   │Pipeline    │   │                                │    │
│  │          │   │            │   │  LlamaFirewall (3 checks)      │    │
│  │Supervisor│   │Split →     │   │  NeMo Guardrails (3 checks)    │    │
│  │    ↓     │   │Embed →     │   │  Custom NLI (4 checks)         │    │
│  │Researcher│   │Upsert      │   │                                │    │
│  │    ↓     │   │            │   └────────────────────────────────┘    │
│  │Writer    │   └────────────┘                                          │
│  └──────────┘                                                            │
│        │                                                                 │
│        ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    LLM Provider Chain                             │   │
│  │  Groq → Gemini → OpenRouter → Together.ai → HuggingFace → Mock  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
     ┌──────────────┐   ┌───────────────┐   ┌───────────────┐
     │  MongoDB     │   │   Pinecone    │   │  LLM APIs     │
     │  Atlas       │   │   Vector DB   │   │  (6 providers)│
     │              │   │               │   │               │
     │ agent_states │   │ mas-knowledge │   │  Groq (free)  │
     │ agent_sessions│  │ -base index   │   │  Gemini (free)│
     │              │   │ 768-dim cosine│   │  OpenRouter   │
     │ LangGraph    │   │               │   │  Together.ai  │
     │ Checkpointer │   │               │   │  HuggingFace  │
     └──────────────┘   └───────────────┘   └───────────────┘
```

---

## 3. Frontend Architecture

### Technology Stack

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.3.0 | React framework with App Router |
| `react` | 19.2.8 | UI library |
| `@xyflow/react` | 12.11.2 | Drag-and-drop agent canvas |
| `axios` | 1.19.0 | HTTP client for API calls |
| `lucide-react` | 1.30.0 | Icon system |
| `tailwindcss` | v4 | Utility-first styling |
| `typescript` | 5.x | Type safety |

### Component Tree

```
app/
├── layout.tsx              — Root layout (Geist fonts, metadata)
├── globals.css             — Tailwind v4 import, forced light theme
└── page.tsx                — Main application (4 tabs)
    │
    ├── <Home>              — Tab router, global model state
    │   ├── <WorkspaceTab>  — Chat + canvas + guardrails
    │   │   ├── <AgentGraph>          — React Flow canvas
    │   │   │   ├── <DnDFlow>         — Drop zone + React Flow provider
    │   │   │   ├── <CustomNode>      — Typed node renderer
    │   │   │   └── <Sidebar>         — MCP tool palette (18 tools, 6 categories)
    │   │   └── <GuardrailSidecar>    — Always-visible guardrail panel
    │   │       └── <Toggle>          — iOS-style enable/disable switch
    │   │
    │   ├── <DataTab>       — Pinecone ingestion + MongoDB session browser
    │   │
    │   ├── <MetricsTab>    — Full observability dashboard
    │   │   ├── <Sparkline>           — 7-period trend mini-chart
    │   │   ├── <MetricCard>          — Container card
    │   │   └── <ScoreBar>            — Colour-coded progress bar
    │   │
    │   └── <SettingsTab>   — Model picker, MCP config, guardrail reference
```

### State Management

State is managed entirely with React hooks — no external store (Redux/Zustand). Key state:

| State | Location | Type |
|-------|----------|------|
| `activeTab` | `Home` | `"workspace" \| "data" \| "metrics" \| "settings"` |
| `selectedModel` | `Home` | `ModelInfo` (provider + modelId) |
| `messages` | `WorkspaceTab` | `Message[]` |
| `guardrailResults` | `WorkspaceTab` | `GuardrailResult[]` |
| `enabledGuardrails` | `WorkspaceTab` | `string[]` (default: 5 of 10) |
| `selectedMcpTools` | `WorkspaceTab` | `string[]` |
| `metrics` | `MetricsTab` | `Metrics` (with `SAMPLE_METRICS` fallback) |

### Key Design Decisions

**Sample Metrics fallback** — The `MetricsTab` initialises with `SAMPLE_METRICS` (realistic static data) so the dashboard is never empty. When the backend is reachable, live data overwrites the sample values. A yellow "Sample Data" badge is shown when offline; a pulsing green "Live Data" badge when connected.

**Default guardrail states** — 5 of 10 guardrails are enabled by default. The sidecar always shows all 10, each with an inline toggle switch. Disabled checks show a grey `disabled` pill; checks turned on that were off by default show an amber `custom` pill.

**Model selection propagation** — The selected `ModelInfo` (provider + modelId) is stored at the `Home` level and passed down to `WorkspaceTab`, which includes it in every `/api/chat` POST request so the backend uses the selected LLM.

---

## 4. Backend Architecture

### Technology Stack

| Package | Role |
|---------|------|
| `fastapi` | ASGI web framework |
| `uvicorn` | ASGI server |
| `langgraph` | Stateful agent orchestration |
| `langchain-core` | LLM abstraction & message types |
| `langchain-groq` | Groq LLM integration |
| `langchain-google-genai` | Gemini LLM + embedding |
| `langchain-openai` | OpenAI-compat (OpenRouter, Together, Ollama) |
| `langchain-ollama` | Native Ollama integration |
| `langgraph-checkpoint-mongodb` | MongoDB state persistence |
| `motor` | Async MongoDB driver |
| `pinecone` | Vector database client |
| `python-dotenv` | Environment variable loading |
| `pydantic` | Request/response validation |

### Application Startup (`lifespan`)

```
App start
    │
    ├── Load environment variables
    │   ├── atlas-credentials.env  (MongoDB URI)
    │   └── .env                   (all other keys)
    │
    ├── Connect to MongoDB Atlas
    │   ├── SUCCESS → MongoDBSaver checkpointer
    │   │            Stateful LangGraph with persistence
    │   └── FAILURE → In-memory graph (no state persistence)
    │
    └── Compile LangGraph StateGraph
        └── Returns compiled graph stored in app_state["graph"]
```

### Request Lifecycle (`/api/chat`)

```
POST /api/chat
    │
    ├── 1. Validate ChatRequest (Pydantic)
    │      message, thread_id, enabled_guardrails,
    │      model_provider, model_id
    │
    ├── 2. Build initial AgentState
    │      { messages: [HumanMessage], sender: "user",
    │        model_provider, model_id }
    │
    ├── 3. Invoke LangGraph (timed)
    │      graph.invoke(state, config={thread_id})
    │
    ├── 4. Extract final response message
    │
    ├── 5. Run Guardrails (synchronous sidecar)
    │      run_guardrails(user_input, response, context,
    │                     enabled_guardrails)
    │
    ├── 6. Persist session to MongoDB (upsert)
    │      thread_id, latency_ms, guardrails_passed
    │
    └── 7. Return JSON
           response, thread_id, latency_ms,
           guardrails.{overall_passed, results[]}
```

---

## 5. Agent Orchestration (LangGraph)

### Graph Structure

LangGraph's `StateGraph` compiles to a deterministic directed graph of agent nodes. The graph is stateful — each invocation with the same `thread_id` resumes from the last checkpoint stored in MongoDB.

```
         ┌─────────────────────────────┐
         │          Supervisor         │  ← Entry point
         │  Routes based on `sender`   │
         └──────────┬──────────────────┘
                    │
           Conditional edge (lambda x: x["next"])
                    │
          ┌─────────┴─────────┐
          │                   │
    next="Researcher"   next="Writer"
          │                   │
    ┌─────▼─────┐       ┌─────▼─────┐
    │ Researcher│       │  Writer   │
    │           │       │           │
    │ Queries   │       │ Drafts    │
    │ LLM with  │       │ final     │
    │ research  │       │ response  │
    │ prompt    │       │           │
    └─────┬─────┘       └─────┬─────┘
          │                   │
          └─────────┬─────────┘
                    │ (both loop back)
                    ▼
         ┌──────────────────────┐
         │       Supervisor     │  ← next="FINISH" → END
         └──────────────────────┘
```

### Routing Logic

```python
# supervisor_node routing
sender == "user"       →  next = "Researcher"
sender == "Researcher" →  next = "Writer"
sender == "Writer"     →  next = "FINISH"
```

### AgentState Schema

```python
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]  # append-only
    next: str           # routing decision from Supervisor
    sender: str         # who sent the last message
    model_provider: Optional[str]  # forwarded from request
    model_id: Optional[str]        # forwarded from request
```

### Checkpointing

When MongoDB is connected, each graph invocation with a `thread_id` saves a checkpoint. Re-using the same `thread_id` in subsequent requests resumes the conversation graph from where it left off, enabling multi-turn stateful sessions.

---

## 6. RAG Pipeline (Pinecone)

### Ingestion Pipeline

```
User submits document text
          │
          ▼
RecursiveCharacterTextSplitter
  chunk_size=500, chunk_overlap=50
          │
          ▼
GoogleGenerativeAIEmbeddings
  model="models/embedding-001"
  output_dim=768
          │
          ▼
Pinecone.upsert(vectors=[
  { id: "{source}-chunk-{i}",
    values: [768 floats],
    metadata: { text, source } }
])
          │
          ▼
Index: "mas-knowledge-base"
  Spec: AWS Serverless us-east-1
  Metric: cosine similarity
```

### Retrieval Pipeline

```
User query
    │
    ▼
embed_query(query) → [768 floats]
    │
    ▼
index.query(vector, top_k=5, include_metadata=True)
    │
    ▼
Returns: [{ text, score, source }]  ordered by cosine similarity
```

### Mock Mode

If `GOOGLE_API_KEY` or `PINECONE_API_KEY` is missing:
- **Ingestion**: returns `[MOCK] Would have ingested N chunks` — no actual API call
- **Retrieval**: returns `[MOCK] simulated RAG result` with score 0.95

This ensures zero crashes during demos without credentials.

---

## 7. Guardrails System

### Architecture

All 10 guardrails run **synchronously** after the agent graph completes, in the same request thread. There is no external ML service call — every check is deterministic Python logic (regex, heuristics, keyword matching).

```
Agent response ready
        │
        ▼
run_guardrails(user_input, response, context, enabled_guardrails)
        │
        ├── Only runs checks whose key is in enabled_guardrails list
        │
        ├── Each check returns GuardrailResult:
        │     { name, category, passed, score 0-1,
        │       reason, latency_ms, severity }
        │
        └── Returns GuardrailReport:
              { overall_passed, results[], total_latency_ms, summary }
```

### Guardrail Matrix

| Key | Name | Category | Input | Method | Pass Condition | Severity |
|-----|------|----------|-------|--------|----------------|----------|
| `llamafirewall_injection` | Prompt Injection | LlamaFirewall | user_input | 9 regex patterns (ignore, bypass, jailbreak…) | No match | Critical |
| `llamafirewall_toxicity` | Toxicity Filter | LlamaFirewall | user_input | Harmful keyword regex | No match | High |
| `llamafirewall_code_injection` | Code Injection | LlamaFirewall | user_input | Script/SQL injection patterns | No match | Critical |
| `nemo_pii` | PII Detection | NeMo Guardrails | user_input | Email, phone, SSN, credit card regex | No PII found | Medium |
| `nemo_topic` | Topic Policy | NeMo Guardrails | user_input | Restricted topic keyword list | No restricted topic | Medium |
| `nemo_dialogue_flow` | Dialogue Flow | NeMo Guardrails | user_input | Word count 2–2000 | In range | Low |
| `nli_entailment` | Entailment Check | Custom NLI | response + context | Keyword overlap ÷ response keywords | Overlap > 15% | Medium |
| `hallucination` | Hallucination Risk | Custom NLI | response + query | Definitive claim / hedge phrase ratio | Risk score < 60% | High |
| `chunking` | Chunking Quality | Custom NLI | user_input | Word count ≥ 5, avg sentence ≥ 3 words | Coherent & sufficient | Low |
| `bias_detection` | Bias Detection | Custom NLI | user_input | Stereotyping/generalising language regex | No match | Medium |

### Default Enable States

The frontend initialises `enabledGuardrails` from `GUARDRAIL_OPTIONS.filter(g => g.defaultEnabled)`:

```
ENABLED  by default  →  injection · toxicity · pii · nli_entailment · hallucination
DISABLED by default  →  code_injection · topic · dialogue_flow · chunking · bias_detection
```

Users toggle individual checks from the always-visible sidecar panel. The selected list is sent in every `/api/chat` request.

---

## 8. LLM Provider Chain

### Provider Resolution

```
ChatRequest arrives with model_provider + model_id
            │
            ▼
    get_llm(provider, model_id)
            │
            ├── provider specified and not "auto"?
            │     └── _try_provider(provider, model_id)
            │           ├── groq     → ChatGroq(model_id, GROQ_API_KEY)
            │           ├── gemini   → ChatGoogleGenerativeAI(model_id)
            │           ├── openrouter → ChatOpenAI(base_url=openrouter.ai/v1)
            │           ├── together   → ChatOpenAI(base_url=api.together.xyz/v1)
            │           ├── huggingface → ChatOpenAI(base_url=api-inference.hf.co/v1)
            │           └── ollama   → ChatOllama(model_id)
            │                         (or ChatOpenAI with localhost:11434/v1)
            │
            ├── Fallback 1 → Groq (GROQ_API_KEY)
            │                llama-3.1-8b-instant
            │
            ├── Fallback 2 → Gemini (GOOGLE_API_KEY)
            │                gemini-1.5-flash
            │
            └── Fallback 3 → None → [MOCK] responses
```

### Free Model Catalogue

| Provider | Model | Context | Notes |
|----------|-------|---------|-------|
| Groq | `llama-3.1-8b-instant` | 131K | Ultra-fast inference |
| Groq | `llama-3.2-3b-preview` | 8K | Compact |
| Groq | `gemma2-9b-it` | 8K | Google Gemma |
| Groq | `mixtral-8x7b-32768` | 32K | Mixture-of-Experts |
| Gemini | `gemini-1.5-flash` | 1M | Huge context window |
| OpenRouter | `meta-llama/llama-3.2-3b-instruct:free` | 8K | Free tier |
| OpenRouter | `google/gemma-3-12b:free` | 8K | Free tier |
| Together.ai | `meta-llama/Llama-3-8b-chat-hf` | 8K | Free tier |
| HuggingFace | `microsoft/Phi-3-mini-4k-instruct` | 4K | Inference API |
| Ollama | `llama3` / `mistral` / `phi3` | 4–8K | 100% local, no key |

All non-Ollama providers use the same `ChatOpenAI`-compatible interface with a custom `base_url`, making the integration uniform across providers.

---

## 9. MCP Tool Integration

### Current Implementation

The backend includes a mock MCP server (`tools/mcp_server.py`) that exposes two tool primitives:
- `search_vector_db(query)` — queries the Pinecone knowledge base
- `web_search(query)` — placeholder for web search integration

### Frontend MCP Tool Registry

The frontend maintains a catalogue of 18 MCP tools across 6 categories displayed in the A2A canvas sidebar:

| Category | Tools |
|----------|-------|
| **Search** | Brave Search, Exa Search, Perplexity |
| **Storage & DB** | Filesystem, PostgreSQL, Firebase, AWS S3 |
| **DevOps** | GitHub, GitLab, Docker |
| **Communication** | Slack, Email SMTP, Telegram |
| **Productivity** | Google Calendar, Notion, Google Sheets |
| **AI & Data** | Anthropic MCP, Weather API, Custom Server |

Tools can be:
1. **Toggled** (checkbox) — marks the tool as active; sent to the backend in API calls
2. **Dragged** onto the React Flow canvas — creates a visual node representing the tool in the agent workflow

The `selectedMcpTools` array is included in the active MCP indicator strip in the chat panel.

### Extending with Real MCP Servers

Any MCP-compatible server (SSE or WebSocket) can be connected via the Custom Server URL input in the Settings tab. The URL is stored in the `customMcpUrl` state and can be passed to the backend for real tool invocation.

---

## 10. State & Persistence (MongoDB)

### Collections

```
Database: multi_agent_system
│
├── agent_sessions          — One document per thread_id
│   ├── thread_id           — Conversation identifier
│   ├── last_message        — Most recent user input
│   ├── last_response       — Most recent agent response
│   ├── updated_at          — ISO timestamp (UTC)
│   ├── latency_ms          — Total request latency
│   ├── message_count       — Number of turns
│   └── guardrails_passed   — Boolean overall pass/fail
│
└── agent_states            — LangGraph checkpoint data
    └── (managed by langgraph-checkpoint-mongodb)
```

### Session Upsert Pattern

```python
db["agent_sessions"].update_one(
    {"thread_id": thread_id},           # match key
    {
      "$set": { ...session_fields },    # update fields
      "$inc": { "message_count": 1 }    # atomic counter
    },
    upsert=True                         # create if not exists
)
```

### Graceful Degradation

If MongoDB is unreachable at startup, the app switches to an in-memory graph with no checkpointing. Sessions are lost on restart, but all agent functionality continues normally.

---

## 11. Observability & Metrics

### Metric Categories

The `/api/metrics` endpoint returns a richly structured response covering eight domains:

```
metrics/
├── summary              — 14 top-level KPIs
│   ├── total_requests, total_sessions
│   ├── avg_latency_ms, p95_latency_ms, p99_latency_ms
│   ├── success_rate, error_rate
│   ├── throughput_rpm, active_threads
│   ├── guardrail_failure_rate
│   ├── tokens_per_request, cache_hit_rate
│   ├── cost_today_usd (always $0.00 — free models)
│   └── uptime_pct
│
├── rag_triad            — RAGAS methodology
│   ├── faithfulness, answer_relevance
│   ├── context_precision, context_recall
│   ├── context_entity_recall, noise_sensitivity
│   └── answer_correctness
│
├── hallucination        — NLI-based detection
│   ├── nli_entailment_score, source_coverage_pct
│   ├── confidence_score, hallucination_risk
│   ├── factual_consistency, self_consistency
│   └── semantic_similarity
│
├── llm_as_judge         — Custom judge evaluation
│   ├── completeness, groundedness, conciseness, coherence
│   ├── helpfulness, accuracy
│   ├── toxicity_free, bias_free
│   └── judge_model (string label)
│
├── ranking              — Information retrieval metrics
│   ├── mrr_at_10, ndcg_at_10, map_at_10
│   ├── precision_at_5, recall_at_10
│   └── hit_rate_at_{1,3,5}
│
├── latency_traces       — Per-agent breakdown
│   └── [{ agent, avg_ms, p95_ms, p99_ms }]  ×6 agents
│
├── governance           — Compliance & safety counts
│   ├── pii_events, policy_violations, injection_attempts
│   ├── toxic_inputs_blocked, pii_redacted_fields
│   ├── dlp_scans, audit_log_entries
│   ├── estimated_tokens_used, estimated_cost_usd
│   └── compliant_responses
│
├── toxicity             — Per-category toxicity rates
│   ├── toxic_rate, severe_toxic_rate, obscene_rate
│   ├── threat_rate, insult_rate, identity_attack_rate
│   ├── safety_score, bias_score
│
├── retrieval            — Vector retrieval quality
│   ├── avg_chunks_retrieved, avg_chunk_relevance
│   ├── top_k, vector_search_latency_ms
│   ├── index_size_vectors (15K–18K), embedding_dim (768)
│   ├── similarity_metric ("cosine"), cache_hit_rate
│
├── trends               — 7-period time series
│   ├── latency_ms[], faithfulness[]
│   ├── hallucination_risk[], requests[], error_rate[]
│   └── labels: ["T-6h" … "Now"]
│
└── model_comparison     — Per-model performance
    └── [{ model, provider, latency_ms, faithfulness,
            cost_per_1k, requests, success_rate }]
```

### Frontend Visualisation

| Component | Data | Colour coding |
|-----------|------|---------------|
| `ScoreBar` | Single 0–1 score | ≥0.85 emerald · ≥0.7 amber · <0.7 red |
| `Sparkline` | 7-value array | Latest bar highlighted; delta arrow |
| KPI card | Single value | Icon colour matches domain |
| Model comparison table | Per-model row | Latency colour (>600ms = amber) |
| Governance grid | Count tiles | Red if bad (PII/violations > 0) |

---

## 12. Data Flow Diagrams

### A. Chat Request Flow (happy path, MongoDB + Groq)

```
User types message → clicks Send
         │
         ▼
Frontend: POST /api/chat
  { message, thread_id, enabled_guardrails,
    model_provider: "groq", model_id: "llama-3.1-8b-instant" }
         │
         ▼
Backend: validate ChatRequest (Pydantic)
         │
         ▼
Build AgentState { messages: [HumanMessage], sender: "user",
                   model_provider, model_id }
         │
         ▼
LangGraph: invoke(state, config={thread_id})
         │
    ┌────▼────────────────────────────────────────────┐
    │ Supervisor node                                  │
    │  sender == "user" → next = "Researcher"          │
    └────┬────────────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────────────────┐
    │ Researcher node                                  │
    │  get_llm("groq", "llama-3.1-8b-instant")        │
    │  prompt: "Research this topic: {query}"         │
    │  response → AIMessage("[GROQ] Research: ...")   │
    │  return { messages: [...], sender: "Researcher" }│
    └────┬────────────────────────────────────────────┘
         │ (edge back to Supervisor)
    ┌────▼────────────────────────────────────────────┐
    │ Supervisor node                                  │
    │  sender == "Researcher" → next = "Writer"        │
    └────┬────────────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────────────────┐
    │ Writer node                                      │
    │  get_llm("groq", "llama-3.1-8b-instant")        │
    │  prompt: "Write response from: {research}"      │
    │  response → AIMessage("[GROQ] Final: ...")      │
    │  return { messages: [...], sender: "Writer" }    │
    └────┬────────────────────────────────────────────┘
         │ (edge back to Supervisor)
    ┌────▼────────────────────────────────────────────┐
    │ Supervisor node                                  │
    │  sender == "Writer" → next = "FINISH" → END     │
    └─────────────────────────────────────────────────┘
         │
         ▼
Extract final_state["messages"][-1].content
         │
         ▼
run_guardrails(user_input, response, enabled_guardrails)
  → runs only selected checks → GuardrailReport
         │
         ▼
MongoDB upsert agent_sessions (thread_id, latency_ms, ...)
         │
         ▼
Return JSON: { response, latency_ms, guardrails: {...} }
         │
         ▼
Frontend: renders message bubble + inline guardrail results in sidecar
```

### B. Document Ingestion Flow

```
User pastes text → clicks "Ingest into Pinecone"
         │
         ▼
POST /api/ingest { text, source }
         │
         ▼
RecursiveCharacterTextSplitter
  chunk_size=500, chunk_overlap=50
  → ["chunk 0 text...", "chunk 1 text...", ...]
         │
         ▼
GoogleGenerativeAIEmbeddings.embed_query(chunk) × N
  model: "models/embedding-001" → [float × 768]
         │
         ▼
Pinecone.upsert([{ id, values:[768 floats], metadata:{text,source} }])
  index: "mas-knowledge-base"
  spec: AWS serverless, us-east-1, cosine
         │
         ▼
Return { success, chunks_ingested, mock }
```

### C. Guardrail Evaluation Flow

```
user_input + response + enabled_guardrails[]
         │
         ▼
run_guardrails()
         │
    for key in enabled_guardrails:
         │
         ├── "llamafirewall_injection" → llamafirewall_prompt_injection(user_input)
         │     regex match against 9 injection patterns → GuardrailResult
         │
         ├── "nemo_pii"               → nemo_pii_detection(user_input)
         │     regex match against email/phone/SSN/CC patterns → GuardrailResult
         │
         ├── "hallucination"          → hallucination_check(response, query)
         │     count definitive claims vs hedge phrases → risk_score → GuardrailResult
         │
         └── ... (up to 10 checks, only selected ones run)
         │
         ▼
overall_passed = all(r.passed for r in results)
total_latency  = sum(r.latency_ms for r in results)
summary        = "All passed" or "Failed: {names}"
         │
         ▼
Return GuardrailReport → serialised to JSON → sent to frontend
```

---

## 13. API Reference

### Base URL
- Local: `http://localhost:8000`
- Production: set via `NEXT_PUBLIC_API_URL`

### Endpoints

#### `GET /`
Health check.
```json
{
  "status": "ok",
  "version": "3.0.0",
  "checkpointer": "mongodb | in-memory",
  "llm_chain": ["groq (llama-3.1-8b-instant)", "gemini-1.5-flash", "mock"]
}
```

#### `POST /api/chat`
Run the multi-agent pipeline.

Request:
```json
{
  "message": "Explain LangGraph",
  "thread_id": "demo-thread-1",
  "enabled_guardrails": ["llamafirewall_injection", "hallucination"],
  "model_provider": "groq",
  "model_id": "llama-3.1-8b-instant"
}
```

Response:
```json
{
  "response": "[GROQ] Final response text...",
  "thread_id": "demo-thread-1",
  "latency_ms": 842,
  "checkpointed": true,
  "guardrails": {
    "overall_passed": true,
    "summary": "All guardrails passed.",
    "total_latency_ms": 67,
    "results": [
      {
        "name": "LlamaFirewall: Prompt Injection",
        "category": "LlamaFirewall",
        "passed": true,
        "score": 0.05,
        "reason": "No injection patterns detected.",
        "latency_ms": 23,
        "severity": "low"
      }
    ]
  }
}
```

#### `GET /api/models`
List all available free models with availability status.
```json
{
  "models": [
    {
      "provider": "groq",
      "model_id": "llama-3.1-8b-instant",
      "display_name": "Llama 3.1 8B Instant",
      "context_k": 131,
      "notes": "Ultra-fast via Groq",
      "available": true
    }
  ],
  "available_providers": ["groq", "gemini"]
}
```

#### `POST /api/guardrails/check`
Run guardrails standalone (without agent invocation).
```json
// Request
{ "user_input": "...", "response": "...", "context": "...", "enabled_guardrails": [...] }
// Response: same guardrails structure as /api/chat
```

#### `POST /api/ingest`
Ingest a document into Pinecone.
```json
// Request
{ "text": "Document content...", "source": "my-doc-v1" }
// Response
{ "success": true, "chunks_ingested": 4, "mock": false, "message": "..." }
```

#### `GET /api/sessions`
Fetch the 20 most recent agent sessions from MongoDB.
```json
{ "sessions": [{ "thread_id": "...", "last_message": "...", "message_count": 3, "latency_ms": 720 }] }
```

#### `GET /api/metrics`
Full observability metrics payload (see Section 11 for schema).

---

## 14. File Structure

```
aiMASProject/
│
├── readme.md                       — Quick-start guide
├── ARCHITECTURE.md                 — This document
├── package-lock.json               — Root lock file
│
├── frontend/                       — Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            — Main UI (4 tabs, ~1100 lines)
│   │   │   ├── layout.tsx          — Root layout + fonts
│   │   │   └── globals.css         — Tailwind import + forced light theme
│   │   └── components/
│   │       └── AgentGraph.tsx      — React Flow DnD canvas + MCP sidebar
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── postcss.config.mjs
│
└── backend/                        — FastAPI application
    ├── main.py                     — App entry, all HTTP endpoints
    ├── guardrails.py               — 10 safety check functions
    ├── ingestion.py                — Pinecone chunk/embed/upsert
    ├── requirements.txt            — Python dependencies
    ├── agents/
    │   ├── graph.py                — LangGraph StateGraph definition
    │   ├── nodes.py                — Supervisor, Researcher, Writer nodes
    │   └── state.py                — AgentState TypedDict
    ├── database/
    │   ├── mongo.py                — Motor async client helpers
    │   └── vector_store.py         — Pinecone index initialisation
    └── tools/
        └── mcp_server.py           — Mock MCP tool server
```

---

## 15. Security Model

### Input Safety (Guardrails)
Every user message is evaluated by the enabled guardrails before the agent response is returned. Critical-severity checks (prompt injection, code injection) are **on by default**.

### No Secrets in Frontend
All API keys are held exclusively in the backend `.env` file. The frontend only knows the backend URL (`NEXT_PUBLIC_API_URL`). The `/api/models` endpoint exposes which providers are available (bool) but never the keys themselves.

### CORS Policy
The backend sets `allow_origins=["*"]` which is appropriate for a demo. In production this should be restricted to the frontend domain.

### Credential Fallback
Any missing API key silently activates mock mode for that provider — no credentials are ever logged or exposed in error messages.

### Data at Rest
MongoDB documents contain conversation history and latency metadata only. No raw API keys or PII are stored by default (the NeMo PII guardrail detects and flags PII inputs before they reach the agent).

---

## 16. Deployment Architecture

### Local Development

```
localhost:3000  ←→  localhost:8000
  Next.js dev        FastAPI (uvicorn)
  (Turbopack)        ├── MongoDB Atlas (cloud)
                     ├── Pinecone (cloud)
                     └── Ollama (optional, localhost:11434)
```

### Production (Free Tier)

```
                         CDN / Edge
                             │
               ┌─────────────▼──────────────┐
               │         Vercel             │
               │    Next.js static build    │
               │    NEXT_PUBLIC_API_URL=     │
               │    https://api.render.com  │
               └─────────────┬──────────────┘
                             │  HTTPS
               ┌─────────────▼──────────────┐
               │          Render            │
               │  uvicorn main:app          │
               │  --host 0.0.0.0 --port $PORT│
               │                            │
               │  env vars (Render secrets) │
               └──────┬──────────┬──────────┘
                      │          │
          ┌───────────▼─┐   ┌───▼──────────┐
          │ MongoDB Atlas│   │  Pinecone    │
          │ (M0 free)    │   │  (free tier) │
          └─────────────┘   └──────────────┘
```

### Environment Variable Checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Recommended | Primary LLM provider |
| `GOOGLE_API_KEY` | Recommended | Gemini fallback + embeddings |
| `OPENROUTER_API_KEY` | Optional | OpenRouter free models |
| `TOGETHER_API_KEY` | Optional | Together.ai free models |
| `HUGGINGFACE_API_KEY` | Optional | HuggingFace inference |
| `MONGODB_URI` | Optional | State persistence (Atlas) |
| `PINECONE_API_KEY` | Optional | Vector store |
| `OLLAMA_BASE_URL` | Optional | Local Ollama (default: localhost:11434) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL (default: localhost:8000) |

The system requires **zero required environment variables** — with all missing, it runs entirely in mock mode. Add keys incrementally to unlock real capabilities.
