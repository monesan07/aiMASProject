# Multi-Agent System (MAS) Demonstration Project

This project is a comprehensive **Agentic AI Demonstration** built to showcase advanced concepts like Orchestration, Agent-to-Agent (A2A) communication, Model Context Protocol (MCP), and Retrieval-Augmented Generation (RAG).

It was designed specifically to showcase a premium understanding of modern AI architectures during technical interviews.

## 🏗 Architecture & Tech Stack

* **Frontend:** Next.js (React), Tailwind CSS, React Flow (for dynamic drag-and-drop workflow visualization).
* **Backend:** Python, FastAPI, LangGraph (for stateful agent orchestration).
* **LLM Engine:** Gemini 1.5 Pro (via `langchain-google-genai`).
* **Vector Database (RAG):** Pinecone.
* **Agent Memory / State:** MongoDB (via async `motor`).

## 🚀 Running Locally

### 1. Start the Frontend
The frontend features a split UI: a multi-agent chat interface and a live Drag-and-Drop (DnD) canvas simulation.
```bash
cd frontend
npm install
npm run dev
```
Access the UI at: **http://localhost:3000**

### 2. Start the Python Backend
The backend manages the orchestration of the Supervisor, Researcher, and Writer agents.
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the FastAPI server
python main.py
```
*(The backend runs on http://localhost:8000)*

---

## 🌍 Deployment Guide

To deploy this project to the public internet using free tiers, we recommend splitting the deployment: **Vercel** for the frontend and **Render** for the Python backend.

### Part 1: Deploying the Frontend (Vercel)
Vercel natively supports Next.js and is entirely free for hobby projects.

1. Push this codebase to your GitHub repository.
2. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository (`monesan07/aiMASProject`).
4. **CRITICAL:** Set the **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   * `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com` *(You will get this URL from Render in Part 2. Until then, you can leave it out or deploy the backend first).*
6. Click **Deploy**.

### Part 2: Deploying the Backend (Render)
Render offers a free tier for Python web services.

1. Log in to [Render](https://render.com/) and click **New > Web Service**.
2. Connect your GitHub repository (`monesan07/aiMASProject`).
3. Set the following configuration:
   * **Root Directory:** `backend`
   * **Environment:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Expand **Environment Variables** and add your secrets securely:
   * `MONGODB_URI` = `mongodb+srv://...` (From your atlas-credentials)
   * `PINECONE_API_KEY` = `your-pinecone-key`
   * `GOOGLE_API_KEY` = `your-gemini-key`
5. Click **Create Web Service**. 

*(Note: The first deployment on Render's free tier can take a few minutes to spin up).*

---

## 🛠 Features Demonstrated
* **LangGraph Orchestration:** A Supervisor node dynamically evaluates the conversation state and routes execution to specialized workers.
* **Interactive DnD Canvas:** An interactive React Flow canvas allowing users to drag and drop agents and resources (like Pinecone and MCP servers) into the workflow.
* **Resilient Mocking:** If API keys are missing or rate limits are hit, the backend gracefully falls back to `[MOCK]` AI responses, ensuring demonstrations during live interviews never crash.


make the UI grey or white theme instead of current black or dark. As the UI we should be able to select the MCP and more MCP and other tools. Give the options and other features for customisation . 

Create and integrate a free model API as in plan. 
Put options to put all kinds of guardrails too and include that in view, Put all deterministic and custom guardrails in sidecar thread. Show different guardrails like llamafirewal, Nemo and other. 

Put NLI interference and checks for chunking and hallucinatin. 

Create another tab with all the metrics for monitoring for governance and obserbability , hallucination identification metrics, RAG metrics RAGtriad, custom LLM as judge and other custom metric , include all the metric like ranking and others.