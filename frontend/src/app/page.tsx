"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AgentGraph from "../components/AgentGraph";
import { Send, Bot, User, Database, Globe, Upload, RefreshCw, Cpu, LayoutDashboard, Layers, CheckCircle, AlertCircle, Clock } from "lucide-react";
import axios from "axios";

const API = "http://localhost:8000";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
type Message = { role: "user" | "assistant"; content: string };
type Session = { thread_id: string; last_message: string; last_response: string; updated_at: string; message_count: number };
type IngestStatus = "idle" | "loading" | "success" | "error";

// ──────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────
function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Connected
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-900/30 border border-amber-800 px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" /> Offline
    </span>
  );
}

// ──────────────────────────────────────────
// Tab: Workspace (Chat + Canvas)
// ──────────────────────────────────────────
function WorkspaceTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    // Animate the agent pipeline visually
    setTimeout(() => setActiveNode("Supervisor"), 300);
    setTimeout(() => setActiveNode("Researcher"), 1200);
    setTimeout(() => setActiveNode("Writer"), 2800);

    try {
      const response = await axios.post(`${API}/api/chat`, {
        message: currentInput,
        thread_id: "demo-thread-1",
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response.data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Could not reach the backend. Is `python main.py` running?" }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setActiveNode(null), 800);
    }
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left: Chat */}
      <div className="w-[440px] flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/40">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <Bot className="text-indigo-400 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Agentic Orchestrator
              </h2>
              <p className="text-xs text-slate-500">LangGraph · Supervisor → Researcher → Writer</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
              <Database className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Mongo</span>
            </div>
            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
              <Globe className="w-3 h-3 text-sky-400" />
              <span className="text-sky-400">Pinecone</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 select-none">
              <Bot className="w-14 h-14 mb-3 text-slate-800" />
              <p className="text-sm">Send a message to activate the agent pipeline.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700"
              }`}>
                <div className="flex items-center gap-1.5 mb-1 opacity-60 text-xs font-medium">
                  {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  {msg.role === "user" ? "You" : "Multi-Agent System"}
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3">
                <div className="flex space-x-1">
                  {["Supervisor", "Researcher", "Writer"].map((agent, i) => (
                    <span key={agent} className={`text-xs px-1.5 py-0.5 rounded font-mono transition-all duration-300 ${
                      activeNode === agent ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-500"
                    }`}>{agent[0]}</span>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  {activeNode ? `${activeNode} is working…` : "Initializing…"}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <form onSubmit={sendMessage} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the agent network something…"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3.5 pl-4 pr-12 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </div>

      {/* Right: Canvas */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_60%_40%,_#0f172a_0%,_#020617_100%)] overflow-hidden">
        <div className="absolute top-5 left-5 z-10 pointer-events-none">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live A2A Workflow Canvas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Drag agents from the panel · Connect nodes · Drop to build workflows</p>
        </div>
        <div className="w-full h-full">
          <AgentGraph activeNode={activeNode} />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Tab: Data & Ingestion
// ──────────────────────────────────────────
function DataTab() {
  const [docText, setDocText] = useState("");
  const [docSource, setDocSource] = useState("manual-upload");
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>("idle");
  const [ingestResult, setIngestResult] = useState<{ message: string; chunks?: number; mock?: boolean } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"ok" | "error" | "loading">("loading");

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/sessions`);
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const checkBackend = useCallback(async () => {
    try {
      await axios.get(`${API}/`);
      setBackendStatus("ok");
    } catch {
      setBackendStatus("error");
    }
  }, []);

  useEffect(() => {
    checkBackend();
    fetchSessions();
  }, [checkBackend, fetchSessions]);

  const handleIngest = async () => {
    if (!docText.trim()) return;
    setIngestStatus("loading");
    setIngestResult(null);
    try {
      const { data } = await axios.post(`${API}/api/ingest`, {
        text: docText,
        source: docSource,
      });
      setIngestResult({ message: data.message, chunks: data.chunks_ingested, mock: data.mock });
      setIngestStatus("success");
      setDocText("");
    } catch (err: any) {
      setIngestResult({ message: err?.response?.data?.detail || "Failed to connect to backend." });
      setIngestStatus("error");
    }
  };

  const sampleDocs = [
    { label: "AI Overview", text: "Artificial intelligence (AI) is intelligence demonstrated by machines. LangGraph is a framework for building stateful, multi-actor applications with LLMs. It uses a graph-based approach where agents are nodes and communication flows are edges." },
    { label: "RAG Explained", text: "Retrieval-Augmented Generation (RAG) combines a retrieval system (like Pinecone vector DB) with a generative LLM. When a query arrives, the system first retrieves relevant documents, then passes them as context to the LLM to generate a grounded, accurate response." },
    { label: "MAS Architecture", text: "A Multi-Agent System (MAS) consists of multiple autonomous agents that perceive their environment and act to achieve goals. Agents communicate via protocols like A2A (Agent-to-Agent) and ACP (Agent Communication Protocol). Orchestration can be centralized (Supervisor) or decentralized." },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-8 bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Data Infrastructure</h2>
            <p className="text-slate-400 text-sm mt-1">Manage Pinecone document ingestion and view MongoDB agent state.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Backend:</span>
            <StatusBadge ok={backendStatus === "ok"} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pinecone Ingestion Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <Upload className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Pinecone Ingestion Pipeline</h3>
                <p className="text-xs text-slate-500">Chunk → Embed → Upsert into vector index</p>
              </div>
            </div>

            {/* Sample loaders */}
            <div>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">Load a sample document</p>
              <div className="flex gap-2 flex-wrap">
                {sampleDocs.map((doc) => (
                  <button
                    key={doc.label}
                    onClick={() => { setDocText(doc.text); setDocSource(doc.label.toLowerCase().replace(/ /g, "-")); }}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500 text-slate-300 rounded-lg transition-all"
                  >
                    {doc.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Source Name</label>
              <input
                type="text"
                value={docSource}
                onChange={(e) => setDocSource(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex-1">
              <label className="text-xs text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Document Text</label>
              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Paste or type your document content here…"
                rows={6}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            <button
              onClick={handleIngest}
              disabled={ingestStatus === "loading" || !docText.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {ingestStatus === "loading" ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Ingesting…</>
              ) : (
                <><Upload className="w-4 h-4" /> Ingest into Pinecone</>
              )}
            </button>

            {ingestResult && (
              <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
                ingestStatus === "success"
                  ? "bg-emerald-900/20 border-emerald-800 text-emerald-300"
                  : "bg-red-900/20 border-red-800 text-red-300"
              }`}>
                {ingestStatus === "success" ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <div>
                  <p>{ingestResult.message}</p>
                  {ingestResult.chunks !== undefined && (
                    <p className="text-xs mt-1 opacity-70">{ingestResult.chunks} chunk{ingestResult.chunks !== 1 ? "s" : ""} processed{ingestResult.mock ? " (mock mode)" : ""}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* MongoDB Sessions Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                  <Database className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">MongoDB Agent Sessions</h3>
                  <p className="text-xs text-slate-500">Persisted LangGraph checkpoint state</p>
                </div>
              </div>
              <button
                onClick={fetchSessions}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${sessionsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-96">
              {sessions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-12">
                  <Database className="w-10 h-10 mb-3 text-slate-800" />
                  <p className="text-sm text-center">No sessions yet.<br />Send a message in the Workspace tab.</p>
                </div>
              ) : (
                sessions.map((s, i) => (
                  <div key={i} className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono bg-slate-700 px-2 py-0.5 rounded text-indigo-400">{s.thread_id}</span>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {new Date(s.updated_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 truncate"><span className="text-slate-600">User:</span> {s.last_message}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5"><span className="text-slate-600">Agent:</span> {s.last_response}</p>
                    <div className="text-xs text-slate-600 mt-1">{s.message_count} message{s.message_count !== 1 ? "s" : ""} in thread</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Architecture legend */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" /> Pipeline Architecture
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: "📄", title: "Document Input", desc: "Raw text pasted or uploaded via this panel", color: "border-slate-700" },
              { icon: "✂️", title: "Text Splitting", desc: "RecursiveCharacterTextSplitter (500 chars)", color: "border-indigo-700" },
              { icon: "🧮", title: "Embedding", desc: "Google Generative AI Embeddings (768 dim)", color: "border-purple-700" },
              { icon: "🌲", title: "Pinecone Upsert", desc: "Stored in serverless vector index for RAG", color: "border-emerald-700" },
            ].map((step) => (
              <div key={step.title} className={`bg-slate-800/50 border ${step.color} rounded-xl p-4 text-center`}>
                <div className="text-2xl mb-2">{step.icon}</div>
                <div className="text-sm font-semibold text-slate-200">{step.title}</div>
                <div className="text-xs text-slate-500 mt-1">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Main Page with Tab Navigation
// ──────────────────────────────────────────
type Tab = "workspace" | "data";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("workspace");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "workspace", label: "Workspace", icon: LayoutDashboard },
    { id: "data", label: "Data & Ingestion", icon: Database },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-slate-950 border-b border-slate-800 z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="font-bold text-slate-100 text-sm">MAS Orchestrator</span>
            <span className="ml-2 text-xs text-slate-600 hidden sm:inline">LangGraph · Pinecone · MongoDB · MCP</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <nav className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Live Demo
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex flex-col flex-1 min-h-0">
        {activeTab === "workspace" && <WorkspaceTab />}
        {activeTab === "data" && <DataTab />}
      </main>
    </div>
  );
}
