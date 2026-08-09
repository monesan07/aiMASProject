"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AgentGraph from "../components/AgentGraph";
import {
  Send, Bot, User, Database, Globe, Upload, RefreshCw, Cpu,
  LayoutDashboard, Shield, CheckCircle, AlertCircle, Clock, XCircle,
  BarChart2, Activity, Zap, Eye, ChevronRight, ChevronDown,
  AlertTriangle, TrendingUp, Search, FileText, Settings,
} from "lucide-react";
import axios from "axios";

const API = "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = { role: "user" | "assistant"; content: string; guardrails?: GuardrailResult[] };
type GuardrailResult = { name: string; category: string; passed: boolean; score: number; reason: string; latency_ms: number; severity: string };
type Session = { thread_id: string; last_message: string; last_response: string; updated_at: string; message_count: number; latency_ms?: number };
type IngestStatus = "idle" | "loading" | "success" | "error";
type Metrics = { summary: any; rag_triad: any; hallucination: any; llm_as_judge: any; ranking: any; latency_traces: any[]; governance: any };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const score2color = (v: number) => v >= 0.85 ? "text-emerald-600" : v >= 0.7 ? "text-amber-600" : "text-red-500";
const score2bg = (v: number) => v >= 0.85 ? "bg-emerald-500" : v >= 0.7 ? "bg-amber-400" : "bg-red-400";

function ScoreBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const display = invert ? 1 - value : value;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className={`text-xs font-bold ${score2color(display)}`}>{pct(display)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${score2bg(display)}`} style={{ width: `${display * 100}%` }} />
      </div>
    </div>
  );
}

function MetricCard({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Guardrail Sidecar ────────────────────────────────────────────────────────
const GUARDRAIL_OPTIONS = [
  { key: "llamafirewall_injection", label: "Prompt Injection", cat: "LlamaFirewall", icon: Shield },
  { key: "llamafirewall_toxicity", label: "Toxicity Filter", cat: "LlamaFirewall", icon: Shield },
  { key: "nemo_pii", label: "PII Detection", cat: "NeMo Guardrails", icon: Eye },
  { key: "nemo_topic", label: "Topic Policy", cat: "NeMo Guardrails", icon: AlertTriangle },
  { key: "nli_entailment", label: "Entailment Check", cat: "Custom NLI", icon: FileText },
  { key: "hallucination", label: "Hallucination Risk", cat: "Custom NLI", icon: Zap },
  { key: "chunking", label: "Chunking Quality", cat: "Custom NLI", icon: FileText },
];

function GuardrailSidecar({ results, enabledGuardrails, onToggle }: {
  results: GuardrailResult[];
  enabledGuardrails: string[];
  onToggle: (key: string) => void;
}) {
  const [showConfig, setShowConfig] = useState(false);
  const cats = ["LlamaFirewall", "NeMo Guardrails", "Custom NLI"];

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-slate-200 bg-slate-50 overflow-hidden">
      <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-slate-700">Guardrails Sidecar</span>
        </div>
        <button onClick={() => setShowConfig(!showConfig)} className="p-1 hover:bg-slate-100 rounded-lg transition-all">
          <Settings className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {showConfig && (
        <div className="border-b border-slate-200 bg-white p-3 overflow-y-auto max-h-64">
          {cats.map(cat => (
            <div key={cat} className="mb-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{cat}</p>
              <div className="space-y-1">
                {GUARDRAIL_OPTIONS.filter(g => g.cat === cat).map(g => (
                  <label key={g.key} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={enabledGuardrails.includes(g.key)}
                      onChange={() => onToggle(g.key)}
                      className="w-3.5 h-3.5 accent-indigo-600"
                    />
                    <span className="text-xs text-slate-600 group-hover:text-slate-800">{g.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-8">
            <Shield className="w-8 h-8 mb-2 text-slate-200" />
            <p className="text-xs">Send a message to see<br />guardrail results here.</p>
          </div>
        ) : (
          results.map((r, i) => (
            <div key={i} className={`rounded-xl border p-3 ${r.passed ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5">
                  {r.passed
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{r.name}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>{(r.score * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full mb-1.5">
                <div className={`h-full rounded-full ${r.passed ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${r.score * 100}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{r.reason}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  r.category === 'LlamaFirewall' ? 'bg-orange-100 text-orange-700' :
                  r.category === 'NeMo Guardrails' ? 'bg-purple-100 text-purple-700' :
                  'bg-sky-100 text-sky-700'
                }`}>{r.category}</span>
                <span className="text-[10px] text-slate-400">{r.latency_ms}ms</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab: Workspace ───────────────────────────────────────────────────────────
function WorkspaceTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [guardrailResults, setGuardrailResults] = useState<GuardrailResult[]>([]);
  const [enabledGuardrails, setEnabledGuardrails] = useState<string[]>(GUARDRAIL_OPTIONS.map(g => g.key));
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>(['🌐 Brave Search MCP']);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const toggleGuardrail = useCallback((key: string) => {
    setEnabledGuardrails(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }, []);

  const toggleMcp = useCallback((tool: string) => {
    setSelectedMcpTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    setTimeout(() => setActiveNode("Supervisor"), 200);
    setTimeout(() => setActiveNode("Researcher"), 900);
    setTimeout(() => setActiveNode("Writer"), 2200);

    try {
      const { data } = await axios.post(`${API}/api/chat`, {
        message: currentInput,
        thread_id: "demo-thread-1",
        enabled_guardrails: enabledGuardrails,
      });
      const gr: GuardrailResult[] = data.guardrails?.results || [];
      setGuardrailResults(gr);
      setMessages(prev => [...prev, { role: "assistant", content: data.response, guardrails: gr }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Backend unreachable. Is `python main.py` running?" }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setActiveNode(null), 600);
    }
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Chat */}
      <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl"><Bot className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Agentic Orchestrator</h2>
              <p className="text-[11px] text-slate-500">Groq · Gemini · LangGraph</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <span className="text-[10px] px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-medium flex items-center gap-1">
              <Database className="w-2.5 h-2.5" /> Mongo
            </span>
            <span className="text-[10px] px-2 py-1 bg-sky-50 border border-sky-200 text-sky-700 rounded-full font-medium flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" /> Pinecone
            </span>
          </div>
        </div>

        {selectedMcpTools.length > 0 && (
          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-indigo-600 font-semibold">Active MCP:</span>
            {selectedMcpTools.map(t => (
              <span key={t} className="text-[10px] bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full">{t.split(' ').slice(1).join(' ')}</span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none">
              <Bot className="w-10 h-10 mb-2 text-slate-200" />
              <p className="text-xs text-center">Send a message to activate<br />the multi-agent pipeline.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-white text-slate-700 rounded-bl-sm border border-slate-200"
              }`}>
                <div className="flex items-center gap-1.5 mb-1 opacity-60 text-[11px] font-medium">
                  {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  {msg.role === "user" ? "You" : "MAS"}
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.guardrails && msg.guardrails.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                    {msg.guardrails.every(g => g.passed)
                      ? <span className="text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> All guardrails passed</span>
                      : <span className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {msg.guardrails.filter(g => !g.passed).length} guardrail(s) flagged</span>
                    }
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                {["Supervisor", "Researcher", "Writer"].map(a => (
                  <span key={a} className={`text-[11px] px-1.5 py-0.5 rounded font-mono transition-all ${activeNode === a ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>{a[0]}</span>
                ))}
                <span className="text-xs text-slate-400">{activeNode ? `${activeNode}…` : "Init…"}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-t border-slate-100">
          <form onSubmit={sendMessage} className="relative">
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask the agent network…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-11 text-sm placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg transition-colors">
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-slate-50">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live A2A Workflow — drag agents · connect nodes
          </p>
        </div>
        <div className="w-full h-full">
          <AgentGraph activeNode={activeNode} selectedMcpTools={selectedMcpTools} onToggleMcp={toggleMcp} />
        </div>
      </div>

      {/* Guardrail Sidecar */}
      <GuardrailSidecar results={guardrailResults} enabledGuardrails={enabledGuardrails} onToggle={toggleGuardrail} />
    </div>
  );
}

// ─── Tab: Data & Ingestion ────────────────────────────────────────────────────
function DataTab() {
  const [docText, setDocText] = useState("");
  const [docSource, setDocSource] = useState("manual-upload");
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>("idle");
  const [ingestResult, setIngestResult] = useState<{ message: string; chunks?: number; mock?: boolean } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try { const { data } = await axios.get(`${API}/api/sessions`); setSessions(data.sessions || []); }
    catch { setSessions([]); } finally { setSessionsLoading(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const sampleDocs = [
    { label: "LangGraph Overview", text: "LangGraph is a framework for building stateful, multi-actor applications with LLMs. It uses a directed graph approach where agents are nodes and message flows are edges. The StateGraph class manages shared state across all nodes." },
    { label: "RAG Pipeline", text: "Retrieval-Augmented Generation (RAG) combines vector retrieval with generative LLMs. Documents are split into chunks, embedded using models like text-embedding-3-small, and stored in vector databases like Pinecone. At query time, the top-K most similar chunks are retrieved and injected as context." },
    { label: "MAS Concepts", text: "Multi-Agent Systems (MAS) consist of autonomous agents communicating via protocols like A2A (Agent-to-Agent) and ACP (Agent Communication Protocol). Orchestration patterns include Supervisor (centralized routing), Round-Robin, and Market-Based coordination." },
  ];

  const handleIngest = async () => {
    if (!docText.trim()) return;
    setIngestStatus("loading"); setIngestResult(null);
    try {
      const { data } = await axios.post(`${API}/api/ingest`, { text: docText, source: docSource });
      setIngestResult({ message: data.message, chunks: data.chunks_ingested, mock: data.mock });
      setIngestStatus("success"); setDocText("");
    } catch (err: any) {
      setIngestResult({ message: err?.response?.data?.detail || "Failed to reach backend." });
      setIngestStatus("error");
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Data Infrastructure</h2>
          <p className="text-slate-500 text-sm mt-1">Manage Pinecone vector ingestion and inspect MongoDB agent state.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ingestion */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl"><Upload className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <h3 className="font-semibold text-slate-800">Pinecone Ingestion Pipeline</h3>
                <p className="text-xs text-slate-500">Chunk → Embed (Google AI 768d) → Upsert</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 font-medium mb-2">Quick-load sample:</p>
              <div className="flex gap-2 flex-wrap">
                {sampleDocs.map(doc => (
                  <button key={doc.label} onClick={() => { setDocText(doc.text); setDocSource(doc.label.toLowerCase().replace(/ /g, '-')); }}
                    className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 text-slate-600 rounded-lg transition-all">
                    {doc.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Source Name</label>
              <input type="text" value={docSource} onChange={e => setDocSource(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Document Content</label>
              <textarea value={docText} onChange={e => setDocText(e.target.value)}
                placeholder="Paste document content here…" rows={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all resize-none" />
            </div>

            <button onClick={handleIngest} disabled={ingestStatus === "loading" || !docText.trim()}
              className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
              {ingestStatus === "loading" ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : <><Upload className="w-4 h-4" /> Ingest into Pinecone</>}
            </button>

            {ingestResult && (
              <div className={`p-4 rounded-xl border text-sm flex items-start gap-2 ${ingestStatus === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                {ingestStatus === "success" ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <div>
                  <p>{ingestResult.message}</p>
                  {ingestResult.chunks !== undefined && <p className="text-xs mt-1 opacity-75">{ingestResult.chunks} chunks{ingestResult.mock ? " (mock mode)" : ""}</p>}
                </div>
              </div>
            )}

            {/* Architecture steps */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              {[
                { icon: "📄", label: "Input" }, { icon: "✂️", label: "Split" },
                { icon: "🧮", label: "Embed" }, { icon: "🌲", label: "Upsert" },
              ].map((s, i) => (
                <div key={s.label} className="text-center">
                  <div className="text-lg">{s.icon}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                  {i < 3 && <div className="text-slate-300 text-xs">→</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 rounded-xl"><Database className="w-5 h-5 text-sky-600" /></div>
                <div>
                  <h3 className="font-semibold text-slate-800">MongoDB Agent Sessions</h3>
                  <p className="text-xs text-slate-500">LangGraph checkpoint state</p>
                </div>
              </div>
              <button onClick={fetchSessions} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">
                <RefreshCw className={`w-4 h-4 text-slate-500 ${sessionsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-96">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Database className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                  <p className="text-xs">No sessions yet. Send a message first.</p>
                </div>
              ) : sessions.map((s, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{s.thread_id}</span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(s.updated_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate"><span className="text-slate-400">Q:</span> {s.last_message}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5"><span className="text-slate-400">A:</span> {s.last_response}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-slate-400">{s.message_count} msg{s.message_count !== 1 ? "s" : ""}</span>
                    {s.latency_ms && <span className="text-[10px] text-slate-400">· {s.latency_ms}ms</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Metrics & Observability ─────────────────────────────────────────────
function MetricsTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try { const { data } = await axios.get(`${API}/api/metrics`); setMetrics(data); }
    catch { setMetrics(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-500"><RefreshCw className="w-5 h-5 animate-spin" /> Loading metrics…</div>
    </div>
  );

  if (!metrics) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
      <Activity className="w-10 h-10 mb-3 text-slate-200" />
      <p className="text-sm">Backend unavailable. Start the server first.</p>
      <button onClick={fetchMetrics} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700">Retry</button>
    </div>
  );

  const maxLatency = Math.max(...metrics.latency_traces.map((t: any) => t.avg_ms));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Metrics & Observability</h2>
            <p className="text-slate-500 text-sm mt-1">RAG quality · Hallucination scoring · Governance · LLM-as-Judge</p>
          </div>
          <button onClick={fetchMetrics} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Sessions", value: metrics.summary.total_sessions, icon: Activity, color: "bg-indigo-100 text-indigo-600" },
            { label: "Avg Latency", value: `${metrics.summary.avg_latency_ms.toFixed(0)}ms`, icon: Zap, color: "bg-amber-100 text-amber-600" },
            { label: "Guardrail Fail Rate", value: pct(metrics.summary.guardrail_failure_rate), icon: Shield, color: metrics.summary.guardrail_failure_rate > 0.1 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600" },
            { label: "Uptime", value: `${metrics.summary.uptime_pct}%`, icon: TrendingUp, color: "bg-emerald-100 text-emerald-600" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.color}`}><kpi.icon className="w-3.5 h-3.5" /></div>
              </div>
              <div className="text-2xl font-bold text-slate-800">{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* RAG Triad */}
          <MetricCard title="RAG Triad (RAGAS)" icon={Search} color="bg-indigo-100 text-indigo-600">
            <ScoreBar label="Faithfulness" value={metrics.rag_triad.faithfulness} />
            <ScoreBar label="Answer Relevance" value={metrics.rag_triad.answer_relevance} />
            <ScoreBar label="Context Precision" value={metrics.rag_triad.context_precision} />
            <ScoreBar label="Context Recall" value={metrics.rag_triad.context_recall} />
          </MetricCard>

          {/* Hallucination */}
          <MetricCard title="Hallucination Detection" icon={Eye} color="bg-orange-100 text-orange-600">
            <ScoreBar label="NLI Entailment Score" value={metrics.hallucination.nli_entailment_score} />
            <ScoreBar label="Source Coverage" value={metrics.hallucination.source_coverage_pct} />
            <ScoreBar label="Confidence Score" value={metrics.hallucination.confidence_score} />
            <ScoreBar label="Hallucination Risk (lower=better)" value={metrics.hallucination.hallucination_risk} invert />
          </MetricCard>

          {/* LLM as Judge */}
          <MetricCard title="LLM-as-Judge" icon={Bot} color="bg-purple-100 text-purple-600">
            <ScoreBar label="Completeness" value={metrics.llm_as_judge.completeness} />
            <ScoreBar label="Groundedness" value={metrics.llm_as_judge.groundedness} />
            <ScoreBar label="Conciseness" value={metrics.llm_as_judge.conciseness} />
            <ScoreBar label="Coherence" value={metrics.llm_as_judge.coherence} />
            <div className="pt-1 border-t border-slate-100">
              <p className="text-[10px] text-slate-400">Judge model: <span className="font-medium text-slate-600">{metrics.llm_as_judge.judge_model}</span></p>
            </div>
          </MetricCard>

          {/* Ranking Metrics */}
          <MetricCard title="Ranking Metrics" icon={BarChart2} color="bg-sky-100 text-sky-600">
            <ScoreBar label="MRR@10" value={metrics.ranking.mrr_at_10} />
            <ScoreBar label="NDCG@10" value={metrics.ranking.ndcg_at_10} />
            <ScoreBar label="Precision@5" value={metrics.ranking.precision_at_5} />
            <ScoreBar label="Recall@10" value={metrics.ranking.recall_at_10} />
            <ScoreBar label="MAP@10" value={metrics.ranking.map_at_10} />
          </MetricCard>

          {/* Latency Traces */}
          <MetricCard title="Agent Latency Traces" icon={Activity} color="bg-teal-100 text-teal-600">
            <div className="space-y-3">
              {metrics.latency_traces.map((t: any) => (
                <div key={t.agent}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{t.agent}</span>
                    <span className="text-slate-500">{t.avg_ms}ms</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${(t.avg_ms / maxLatency) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </MetricCard>

          {/* Governance */}
          <MetricCard title="Governance & Compliance" icon={Shield} color="bg-rose-100 text-rose-600">
            <div className="space-y-3">
              {[
                { label: "PII Events", value: metrics.governance.pii_events, bad: metrics.governance.pii_events > 0 },
                { label: "Policy Violations", value: metrics.governance.policy_violations, bad: metrics.governance.policy_violations > 0 },
                { label: "Tokens Used", value: metrics.governance.estimated_tokens_used.toLocaleString(), bad: false },
                { label: "Est. Cost (USD)", value: `$${metrics.governance.estimated_cost_usd}`, bad: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-600">{item.label}</span>
                  <span className={`text-xs font-bold ${item.bad ? "text-red-600" : "text-slate-700"}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </MetricCard>
        </div>

        {/* Guardrail Coverage */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" /> Guardrail Coverage Map
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { cat: "LlamaFirewall", color: "bg-orange-50 border-orange-200", tag: "bg-orange-100 text-orange-700", checks: ["Prompt Injection Detection", "Toxicity & Hate Speech Filter", "Code Injection Prevention"] },
              { cat: "NeMo Guardrails", color: "bg-purple-50 border-purple-200", tag: "bg-purple-100 text-purple-700", checks: ["PII Detection & Redaction", "Topic Policy Enforcement", "Dialogue Flow Control"] },
              { cat: "Custom NLI", color: "bg-sky-50 border-sky-200", tag: "bg-sky-100 text-sky-700", checks: ["Entailment Verification", "Hallucination Risk Scoring", "Chunking Quality Assessment"] },
            ].map(section => (
              <div key={section.cat} className={`rounded-xl border p-4 ${section.color}`}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${section.tag}`}>{section.cat}</span>
                <ul className="mt-3 space-y-1.5">
                  {section.checks.map(c => (
                    <li key={c} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "workspace" | "data" | "metrics";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("workspace");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "workspace", label: "Workspace", icon: LayoutDashboard },
    { id: "data", label: "Data & Ingestion", icon: Database },
    { id: "metrics", label: "Metrics & Observability", icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-100 rounded-xl"><Cpu className="w-5 h-5 text-indigo-600" /></div>
          <div>
            <span className="font-bold text-slate-800 text-sm">MAS Orchestrator</span>
            <span className="ml-2 text-xs text-slate-400 hidden sm:inline">LangGraph · Groq · Pinecone · MongoDB · MCP</span>
          </div>
        </div>

        <nav className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} id={`tab-${id}`} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? "bg-white text-indigo-700 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live
        </div>
      </header>

      <main className="flex flex-col flex-1 min-h-0">
        {activeTab === "workspace" && <WorkspaceTab />}
        {activeTab === "data" && <DataTab />}
        {activeTab === "metrics" && <MetricsTab />}
      </main>
    </div>
  );
}
