"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AgentGraph from "../components/AgentGraph";
import {
  Send, Bot, User, Database, Globe, Upload, RefreshCw, Cpu,
  LayoutDashboard, Shield, CheckCircle, AlertCircle, Clock, XCircle,
  BarChart2, Activity, Zap, Eye,
  AlertTriangle, TrendingUp, Search, FileText, Settings,
  Terminal, Layers, Server, Monitor,
} from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = { role: "user" | "assistant"; content: string; guardrails?: GuardrailResult[] };
type GuardrailResult = { name: string; category: string; passed: boolean; score: number; reason: string; latency_ms: number; severity: string };
type Session = { thread_id: string; last_message: string; last_response: string; updated_at: string; message_count: number; latency_ms?: number };
type IngestStatus = "idle" | "loading" | "success" | "error";
type LatencyTrace = { agent: string; avg_ms: number; p95_ms: number; p99_ms: number };
type ModelRow = { model: string; provider: string; latency_ms: number; faithfulness: number; cost_per_1k: number; requests: number; success_rate: number };
type Metrics = {
  _sample?: boolean;
  summary: { total_sessions: number; avg_latency_ms: number; guardrail_failure_rate: number; uptime_pct: number; total_requests: number; success_rate: number; tokens_per_request: number; cost_today_usd: number; cache_hit_rate: number; p95_latency_ms: number; p99_latency_ms: number; active_threads: number; error_rate: number; throughput_rpm: number; };
  rag_triad: { faithfulness: number; answer_relevance: number; context_precision: number; context_recall: number; context_entity_recall: number; noise_sensitivity: number; answer_correctness: number; };
  hallucination: { nli_entailment_score: number; source_coverage_pct: number; confidence_score: number; hallucination_risk: number; factual_consistency: number; self_consistency: number; semantic_similarity: number; };
  llm_as_judge: { completeness: number; groundedness: number; conciseness: number; coherence: number; judge_model: string; helpfulness: number; accuracy: number; toxicity_free: number; bias_free: number; };
  ranking: { mrr_at_10: number; ndcg_at_10: number; precision_at_5: number; recall_at_10: number; map_at_10: number; hit_rate_at_1: number; hit_rate_at_3: number; hit_rate_at_5: number; };
  latency_traces: LatencyTrace[];
  governance: { pii_events: number; policy_violations: number; estimated_tokens_used: number; estimated_cost_usd: number; injection_attempts: number; toxic_inputs_blocked: number; pii_redacted_fields: number; audit_log_entries: number; dlp_scans: number; compliant_responses: number; };
  toxicity: { toxic_rate: number; severe_toxic_rate: number; obscene_rate: number; threat_rate: number; insult_rate: number; identity_attack_rate: number; safety_score: number; bias_score: number; };
  retrieval: { avg_chunks_retrieved: number; avg_chunk_relevance: number; top_k: number; vector_search_latency_ms: number; index_size_vectors: number; embedding_dim: number; similarity_metric: string; cache_hit_rate: number; };
  trends: { labels: string[]; latency_ms: number[]; faithfulness: number[]; hallucination_risk: number[]; requests: number[]; error_rate: number[]; };
  model_comparison: ModelRow[];
};
type ModelProvider = "groq" | "together" | "openrouter" | "huggingface" | "ollama" | "gemini" | "auto";
type ModelInfo = { provider: ModelProvider; model_id: string; display_name: string; context_k: number; notes: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const FREE_MODELS: ModelInfo[] = [
  { provider: "groq", model_id: "llama-3.1-8b-instant", display_name: "Llama 3.1 8B Instant", context_k: 131, notes: "Ultra-fast · Groq" },
  { provider: "groq", model_id: "llama-3.2-3b-preview", display_name: "Llama 3.2 3B", context_k: 8, notes: "Compact · Groq" },
  { provider: "groq", model_id: "gemma2-9b-it", display_name: "Gemma 2 9B", context_k: 8, notes: "Google Gemma · Groq" },
  { provider: "groq", model_id: "mixtral-8x7b-32768", display_name: "Mixtral 8x7B", context_k: 32, notes: "MoE model · Groq" },
  { provider: "gemini", model_id: "gemini-1.5-flash", display_name: "Gemini 1.5 Flash", context_k: 1000, notes: "1M context · Google" },
  { provider: "openrouter", model_id: "meta-llama/llama-3.2-3b-instruct:free", display_name: "Llama 3.2 3B", context_k: 8, notes: "Free tier · OpenRouter" },
  { provider: "openrouter", model_id: "google/gemma-3-12b:free", display_name: "Gemma 3 12B", context_k: 8, notes: "Free tier · OpenRouter" },
  { provider: "together", model_id: "meta-llama/Llama-3-8b-chat-hf", display_name: "Llama 3 8B Chat", context_k: 8, notes: "Free tier · Together.ai" },
  { provider: "huggingface", model_id: "microsoft/Phi-3-mini-4k-instruct", display_name: "Phi-3 Mini", context_k: 4, notes: "HuggingFace Inference API" },
  { provider: "ollama", model_id: "llama3", display_name: "Llama 3 (Local)", context_k: 8, notes: "Local · No API key" },
  { provider: "ollama", model_id: "mistral", display_name: "Mistral 7B (Local)", context_k: 8, notes: "Local · No API key" },
  { provider: "ollama", model_id: "phi3", display_name: "Phi-3 Mini (Local)", context_k: 4, notes: "Local · No API key" },
];

const PROVIDER_COLORS: Record<ModelProvider | string, string> = {
  groq: "bg-amber-100 text-amber-700 border-amber-200",
  gemini: "bg-blue-100 text-blue-700 border-blue-200",
  openrouter: "bg-violet-100 text-violet-700 border-violet-200",
  together: "bg-pink-100 text-pink-700 border-pink-200",
  huggingface: "bg-yellow-100 text-yellow-700 border-yellow-200",
  ollama: "bg-emerald-100 text-emerald-700 border-emerald-200",
  auto: "bg-slate-100 text-slate-600 border-slate-200",
};

const GUARDRAIL_OPTIONS = [
  // LlamaFirewall — 2 on, 1 off by default
  { key: "llamafirewall_injection",     label: "Prompt Injection",   cat: "LlamaFirewall",    icon: Shield,        desc: "Detects jailbreak & injection patterns",       sev: "critical", defaultEnabled: true  },
  { key: "llamafirewall_toxicity",      label: "Toxicity Filter",    cat: "LlamaFirewall",    icon: Shield,        desc: "Filters harmful/hateful content",              sev: "high",     defaultEnabled: true  },
  { key: "llamafirewall_code_injection",label: "Code Injection",     cat: "LlamaFirewall",    icon: Terminal,      desc: "Detects code/script injection attacks",        sev: "critical", defaultEnabled: false },
  // NeMo Guardrails — 1 on, 2 off by default
  { key: "nemo_pii",                    label: "PII Detection",      cat: "NeMo Guardrails",  icon: Eye,           desc: "Detects personally identifiable information",  sev: "medium",   defaultEnabled: true  },
  { key: "nemo_topic",                  label: "Topic Policy",       cat: "NeMo Guardrails",  icon: AlertTriangle, desc: "Enforces topic restrictions",                  sev: "medium",   defaultEnabled: false },
  { key: "nemo_dialogue_flow",          label: "Dialogue Flow",      cat: "NeMo Guardrails",  icon: Activity,      desc: "Controls conversation flow rules",             sev: "low",      defaultEnabled: false },
  // Custom NLI — 2 on, 2 off by default
  { key: "nli_entailment",              label: "Entailment Check",   cat: "Custom NLI",       icon: FileText,      desc: "Verifies response-context alignment",          sev: "medium",   defaultEnabled: true  },
  { key: "hallucination",               label: "Hallucination Risk", cat: "Custom NLI",       icon: Zap,           desc: "Scores hallucination probability",             sev: "high",     defaultEnabled: true  },
  { key: "chunking",                    label: "Chunking Quality",   cat: "Custom NLI",       icon: Layers,        desc: "Validates chunk coherence quality",            sev: "low",      defaultEnabled: false },
  { key: "bias_detection",              label: "Bias Detection",     cat: "Custom NLI",       icon: Eye,           desc: "Detects bias in model outputs",                sev: "medium",   defaultEnabled: false },
];

const CAT_STYLES: Record<string, { bg: string; tag: string; border: string }> = {
  "LlamaFirewall": { bg: "bg-orange-50", tag: "bg-orange-100 text-orange-700", border: "border-orange-200" },
  "NeMo Guardrails": { bg: "bg-purple-50", tag: "bg-purple-100 text-purple-700", border: "border-purple-200" },
  "Custom NLI": { bg: "bg-sky-50", tag: "bg-sky-100 text-sky-700", border: "border-sky-200" },
};

const SEV_COLORS: Record<string, string> = {
  critical: "text-red-700 bg-red-50 border-red-200",
  high: "text-orange-700 bg-orange-50 border-orange-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low: "text-slate-500 bg-slate-50 border-slate-200",
};

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

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(); }}
      className={`relative inline-flex w-9 h-5 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-indigo-600" : "bg-slate-300"
      }`}
      role="switch" aria-checked={enabled}
    >
      <span className={`pointer-events-none w-4 h-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
        enabled ? "translate-x-4" : "translate-x-0"
      }`} />
    </button>
  );
}

// ─── Guardrail Sidecar ────────────────────────────────────────────────────────
function GuardrailSidecar({ results, enabledGuardrails, onToggle }: {
  results: GuardrailResult[];
  enabledGuardrails: string[];
  onToggle: (key: string) => void;
}) {
  const cats = ["LlamaFirewall", "NeMo Guardrails", "Custom NLI"];
  const enabledCount = enabledGuardrails.length;
  const total = GUARDRAIL_OPTIONS.length;

  const resultMap: Record<string, GuardrailResult> = {};
  results.forEach(r => {
    const matched = GUARDRAIL_OPTIONS.find(g => r.name.toLowerCase().includes(g.label.toLowerCase()) || r.name.includes(g.key));
    if (matched) resultMap[matched.key] = r;
  });

  const enableAll = () => GUARDRAIL_OPTIONS.forEach(g => { if (!enabledGuardrails.includes(g.key)) onToggle(g.key); });
  const disableAll = () => [...enabledGuardrails].forEach(k => onToggle(k));

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-slate-800">Guardrails</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            enabledCount === 0 ? "bg-slate-100 text-slate-500" : "bg-indigo-100 text-indigo-700"
          }`}>{enabledCount}/{total} active</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={enableAll} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors">All on</button>
          <span className="text-slate-300 text-xs">|</span>
          <button onClick={disableAll} className="text-[10px] text-slate-400 hover:text-slate-600 font-medium transition-colors">All off</button>
        </div>
      </div>

      {/* Overall result banner — shows after message sent */}
      {results.length > 0 && (
        <div className={`px-4 py-2 flex items-center gap-2 flex-shrink-0 border-b ${
          results.every(r => r.passed)
            ? "bg-emerald-50 border-emerald-100"
            : "bg-red-50 border-red-100"
        }`}>
          {results.every(r => r.passed)
            ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            : <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
          <span className={`text-xs font-semibold ${results.every(r => r.passed) ? "text-emerald-700" : "text-red-700"}`}>
            {results.every(r => r.passed)
              ? `All ${enabledCount} checks passed`
              : `${results.filter(r => !r.passed).length} check${results.filter(r => !r.passed).length > 1 ? "s" : ""} flagged`}
          </span>
        </div>
      )}

      {/* Guardrail list — always visible, scrollable */}
      <div className="flex-1 overflow-y-auto">
        {cats.map(cat => {
          const style = CAT_STYLES[cat];
          const catItems = GUARDRAIL_OPTIONS.filter(g => g.cat === cat);
          const catEnabled = catItems.filter(g => enabledGuardrails.includes(g.key)).length;

          return (
            <div key={cat} className="border-b border-slate-100 last:border-0">
              {/* Category header */}
              <div className={`px-4 py-2 flex items-center justify-between ${style.bg}`}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.tag}`}>{cat}</span>
                <span className="text-[10px] text-slate-500">{catEnabled}/{catItems.length}</span>
              </div>

              {/* Guardrail rows */}
              <div className="divide-y divide-slate-50">
                {catItems.map(g => {
                  const enabled = enabledGuardrails.includes(g.key);
                  const result = resultMap[g.key] ?? results.find(r => r.name.toLowerCase().includes(g.label.toLowerCase()));
                  const isDefault = g.defaultEnabled;

                  return (
                    <div key={g.key} className={`px-3 py-3 transition-all ${enabled ? "bg-white" : "bg-slate-50/80"}`}>
                      {/* Row: toggle + info */}
                      <div className="flex items-start gap-2.5">
                        <Toggle enabled={enabled} onChange={() => onToggle(g.key)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className={`text-xs font-semibold leading-tight ${enabled ? "text-slate-800" : "text-slate-400"}`}>
                              {g.label}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0 ${enabled ? SEV_COLORS[g.sev] : "text-slate-400 bg-slate-100 border-slate-200"}`}>
                              {g.sev}
                            </span>
                            {!enabled && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 font-medium flex-shrink-0">
                                disabled
                              </span>
                            )}
                            {!isDefault && enabled && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium flex-shrink-0">
                                custom
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] leading-tight ${enabled ? "text-slate-400" : "text-slate-300"}`}>
                            {g.desc}
                          </p>
                        </div>
                      </div>

                      {/* Inline result — only when enabled and a result exists */}
                      {enabled && result && (
                        <div className={`mt-2.5 ml-11 rounded-lg p-2.5 border ${result.passed ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1">
                              {result.passed
                                ? <CheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                : <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />}
                              <span className={`text-[10px] font-bold ${result.passed ? "text-emerald-700" : "text-red-700"}`}>
                                {result.passed ? "Passed" : "Flagged"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold ${result.passed ? "text-emerald-700" : "text-red-700"}`}>
                                {(result.score * 100).toFixed(0)}%
                              </span>
                              <span className="text-[9px] text-slate-400">{result.latency_ms}ms</span>
                            </div>
                          </div>
                          {/* Score bar */}
                          <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                            <div className={`h-full rounded-full transition-all ${result.passed ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${result.score * 100}%` }} />
                          </div>
                          <p className="text-[9px] text-slate-500 leading-relaxed">{result.reason}</p>
                        </div>
                      )}

                      {/* Pending state — enabled but no result yet */}
                      {enabled && !result && results.length === 0 && (
                        <div className="mt-2 ml-11 text-[10px] text-slate-300 italic">
                          Pending — send a message to evaluate
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Workspace ───────────────────────────────────────────────────────────
function WorkspaceTab({ selectedModel }: { selectedModel: ModelInfo }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [guardrailResults, setGuardrailResults] = useState<GuardrailResult[]>([]);
  const [enabledGuardrails, setEnabledGuardrails] = useState<string[]>(
    GUARDRAIL_OPTIONS.filter(g => g.defaultEnabled).map(g => g.key)
  );
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>(['brave_search']);
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
        model_provider: selectedModel.provider,
        model_id: selectedModel.model_id,
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
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl"><Bot className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Agentic Orchestrator</h2>
              <p className="text-[11px] text-slate-500">{selectedModel.display_name} · LangGraph</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${PROVIDER_COLORS[selectedModel.provider]}`}>
              {selectedModel.provider}
            </span>
            <span className="text-[10px] px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-medium flex items-center gap-1">
              <Database className="w-2.5 h-2.5" /> Mongo
            </span>
          </div>
        </div>

        {selectedMcpTools.length > 0 && (
          <div className="px-4 py-1.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-indigo-600 font-semibold">Active MCP:</span>
            {selectedMcpTools.slice(0, 4).map(t => (
              <span key={t} className="text-[10px] bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full">{t.replace(/_/g, ' ')}</span>
            ))}
            {selectedMcpTools.length > 4 && <span className="text-[10px] text-indigo-500">+{selectedMcpTools.length - 4} more</span>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none">
              <Bot className="w-10 h-10 mb-2 text-slate-200" />
              <p className="text-xs text-center font-medium text-slate-400 mb-1">Multi-Agent Pipeline Ready</p>
              <p className="text-[11px] text-center text-slate-300">Send a message to activate<br />the Supervisor → Researcher → Writer flow.</p>
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
                      ? <span className="text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> All {msg.guardrails.length} guardrails passed</span>
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
              className="w-full bg-gray-50 border border-slate-200 rounded-xl py-3 pl-4 pr-11 text-sm placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
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
      <div className="flex-1 relative overflow-hidden bg-gray-50">
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
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-8">
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
                className="w-full bg-gray-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Document Content</label>
              <textarea value={docText} onChange={e => setDocText(e.target.value)}
                placeholder="Paste document content here…" rows={5}
                className="w-full bg-gray-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all resize-none" />
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

// ─── Sample Metrics (shown when backend unavailable) ──────────────────────────
const SAMPLE_METRICS: Metrics = {
  _sample: true,
  summary: { total_sessions: 247, avg_latency_ms: 682.4, guardrail_failure_rate: 0.048, uptime_pct: 99.7, total_requests: 1842, success_rate: 0.972, tokens_per_request: 743, cost_today_usd: 0.0, cache_hit_rate: 0.34, p95_latency_ms: 1240, p99_latency_ms: 2180, active_threads: 3, error_rate: 0.028, throughput_rpm: 12.4 },
  rag_triad: { faithfulness: 0.887, answer_relevance: 0.912, context_precision: 0.841, context_recall: 0.793, context_entity_recall: 0.756, noise_sensitivity: 0.124, answer_correctness: 0.869 },
  hallucination: { nli_entailment_score: 0.883, source_coverage_pct: 0.761, confidence_score: 0.921, hallucination_risk: 0.142, factual_consistency: 0.896, self_consistency: 0.934, semantic_similarity: 0.879 },
  llm_as_judge: { completeness: 0.891, groundedness: 0.867, conciseness: 0.843, coherence: 0.921, judge_model: "llama-3.1-8b-instant via Groq", helpfulness: 0.908, accuracy: 0.874, toxicity_free: 0.997, bias_free: 0.981 },
  ranking: { mrr_at_10: 0.834, ndcg_at_10: 0.867, precision_at_5: 0.812, recall_at_10: 0.779, map_at_10: 0.821, hit_rate_at_1: 0.723, hit_rate_at_3: 0.856, hit_rate_at_5: 0.891 },
  latency_traces: [
    { agent: "Supervisor", avg_ms: 32.4, p95_ms: 78, p99_ms: 145 },
    { agent: "Researcher", avg_ms: 512.8, p95_ms: 1240, p99_ms: 2100 },
    { agent: "Writer", avg_ms: 387.1, p95_ms: 890, p99_ms: 1560 },
    { agent: "Guardrails", avg_ms: 68.3, p95_ms: 142, p99_ms: 198 },
    { agent: "Vector Retrieval", avg_ms: 124.6, p95_ms: 287, p99_ms: 421 },
    { agent: "Embedding", avg_ms: 89.2, p95_ms: 198, p99_ms: 312 },
  ],
  governance: { pii_events: 2, policy_violations: 1, estimated_tokens_used: 183614, estimated_cost_usd: 0.0, injection_attempts: 3, toxic_inputs_blocked: 1, pii_redacted_fields: 5, audit_log_entries: 247, dlp_scans: 247, compliant_responses: 0.994 },
  toxicity: { toxic_rate: 0.008, severe_toxic_rate: 0.002, obscene_rate: 0.003, threat_rate: 0.001, insult_rate: 0.006, identity_attack_rate: 0.002, safety_score: 0.994, bias_score: 0.981 },
  retrieval: { avg_chunks_retrieved: 4.2, avg_chunk_relevance: 0.823, top_k: 5, vector_search_latency_ms: 124.6, index_size_vectors: 15840, embedding_dim: 768, similarity_metric: "cosine", cache_hit_rate: 0.34 },
  trends: {
    labels: ["T-6h", "T-5h", "T-4h", "T-3h", "T-2h", "T-1h", "Now"],
    latency_ms: [720, 690, 710, 650, 682, 701, 682],
    faithfulness: [0.88, 0.89, 0.87, 0.91, 0.89, 0.88, 0.887],
    hallucination_risk: [0.18, 0.15, 0.17, 0.13, 0.14, 0.15, 0.142],
    requests: [28, 35, 41, 52, 39, 47, 51],
    error_rate: [0.04, 0.03, 0.035, 0.025, 0.028, 0.03, 0.028],
  },
  model_comparison: [
    { model: "Llama 3.1 8B Instant", provider: "groq", latency_ms: 312, faithfulness: 0.887, cost_per_1k: 0.0, requests: 156, success_rate: 0.974 },
    { model: "Gemini 1.5 Flash", provider: "gemini", latency_ms: 824, faithfulness: 0.912, cost_per_1k: 0.0, requests: 67, success_rate: 0.985 },
    { model: "Mixtral 8x7B", provider: "groq", latency_ms: 287, faithfulness: 0.871, cost_per_1k: 0.0, requests: 24, success_rate: 0.958 },
    { model: "Mock Mode", provider: "auto", latency_ms: 12, faithfulness: 0.0, cost_per_1k: 0.0, requests: 24, success_rate: 1.0 },
  ],
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ values, barColor, label, unit = "" }: { values: number[]; barColor: string; label: string; unit?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const delta = last - prev;
  const up = delta >= 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-[10px] text-slate-500 font-medium mb-2">{label}</p>
      <div className="flex items-end gap-[2px] h-10 mb-2">
        {values.map((v, i) => {
          const h = Math.max(4, ((v - min) / range) * 100);
          const isLast = i === values.length - 1;
          return (
            <div key={i} className="flex-1 rounded-sm transition-all" style={{ height: `${h}%`, background: isLast ? undefined : "#e2e8f0" }}>
              {isLast && <div className={`h-full rounded-sm ${barColor}`} />}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? "▲" : "▼"} {Math.abs(delta).toFixed(unit === "ms" ? 0 : 3)}{unit}
        </span>
        <span className="text-xs font-bold text-slate-700">{unit === "ms" ? Math.round(last) + "ms" : (last < 1 ? (last * 100).toFixed(1) + "%" : last)}</span>
      </div>
    </div>
  );
}

// ─── Tab: Metrics & Observability ─────────────────────────────────────────────
function MetricsTab() {
  const [metrics, setMetrics] = useState<Metrics>(SAMPLE_METRICS);
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/metrics`);
      setMetrics({ ...SAMPLE_METRICS, ...data, _sample: false });
      setLiveData(true);
    } catch {
      setMetrics({ ...SAMPLE_METRICS, _sample: true });
      setLiveData(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const maxLatency = Math.max(...metrics.latency_traces.map(t => t.avg_ms));

  const kpis = [
    { label: "Total Requests", value: metrics.summary.total_requests.toLocaleString(), sub: `${metrics.summary.total_sessions} sessions`, icon: Activity, color: "bg-indigo-100 text-indigo-600" },
    { label: "Avg Latency", value: `${metrics.summary.avg_latency_ms.toFixed(0)}ms`, sub: `P95: ${metrics.summary.p95_latency_ms}ms`, icon: Zap, color: "bg-amber-100 text-amber-600" },
    { label: "Success Rate", value: pct(metrics.summary.success_rate), sub: `Error: ${pct(metrics.summary.error_rate)}`, icon: CheckCircle, color: "bg-emerald-100 text-emerald-600" },
    { label: "Uptime", value: `${metrics.summary.uptime_pct}%`, sub: `${metrics.summary.active_threads} active threads`, icon: TrendingUp, color: "bg-emerald-100 text-emerald-600" },
    { label: "Guardrail Fail Rate", value: pct(metrics.summary.guardrail_failure_rate), sub: metrics.summary.guardrail_failure_rate > 0.1 ? "⚠ Above threshold" : "Within SLA", icon: Shield, color: metrics.summary.guardrail_failure_rate > 0.1 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600" },
    { label: "P99 Latency", value: `${metrics.summary.p99_latency_ms}ms`, sub: `Throughput: ${metrics.summary.throughput_rpm} rpm`, icon: Activity, color: "bg-orange-100 text-orange-600" },
    { label: "Tokens / Request", value: metrics.summary.tokens_per_request.toLocaleString(), sub: `${metrics.governance.estimated_tokens_used.toLocaleString()} total`, icon: FileText, color: "bg-violet-100 text-violet-600" },
    { label: "Cache Hit Rate", value: pct(metrics.summary.cache_hit_rate), sub: "Cost today: FREE ✓", icon: Zap, color: "bg-teal-100 text-teal-600" },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Metrics & Observability</h2>
            <p className="text-slate-500 text-sm mt-1">RAG quality · Hallucination · Governance · LLM-as-Judge · Ranking · Safety · Retrieval</p>
          </div>
          <div className="flex items-center gap-3">
            {metrics._sample && (
              <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sample Data — start backend for live metrics
              </span>
            )}
            {liveData && (
              <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Data
              </span>
            )}
            <button onClick={fetchMetrics} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* 8 KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.color}`}><kpi.icon className="w-3.5 h-3.5" /></div>
              </div>
              <div className="text-2xl font-bold text-slate-800">{kpi.value}</div>
              <p className="text-[10px] text-slate-400 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Trend Sparklines */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> 7-Period Trends (hourly)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Sparkline values={metrics.trends.latency_ms} barColor="bg-amber-500" label="Avg Latency" unit="ms" />
            <Sparkline values={metrics.trends.faithfulness} barColor="bg-indigo-500" label="RAG Faithfulness" />
            <Sparkline values={metrics.trends.hallucination_risk} barColor="bg-orange-500" label="Hallucination Risk" />
            <Sparkline values={metrics.trends.requests} barColor="bg-emerald-500" label="Requests / Period" />
          </div>
        </div>

        {/* Core Metrics — Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard title="RAG Triad (RAGAS)" icon={Search} color="bg-indigo-100 text-indigo-600">
            <ScoreBar label="Faithfulness" value={metrics.rag_triad.faithfulness} />
            <ScoreBar label="Answer Relevance" value={metrics.rag_triad.answer_relevance} />
            <ScoreBar label="Context Precision" value={metrics.rag_triad.context_precision} />
            <ScoreBar label="Context Recall" value={metrics.rag_triad.context_recall} />
            <ScoreBar label="Context Entity Recall" value={metrics.rag_triad.context_entity_recall} />
            <ScoreBar label="Answer Correctness" value={metrics.rag_triad.answer_correctness} />
            <ScoreBar label="Noise Sensitivity (↓ better)" value={metrics.rag_triad.noise_sensitivity} invert />
            <div className="pt-1 border-t border-slate-100">
              <p className="text-[10px] text-slate-400">Framework: <span className="font-medium text-slate-600">RAGAS · TRIAD methodology</span></p>
            </div>
          </MetricCard>

          <MetricCard title="Hallucination Detection" icon={Eye} color="bg-orange-100 text-orange-600">
            <ScoreBar label="NLI Entailment Score" value={metrics.hallucination.nli_entailment_score} />
            <ScoreBar label="Source Coverage" value={metrics.hallucination.source_coverage_pct} />
            <ScoreBar label="Confidence Score" value={metrics.hallucination.confidence_score} />
            <ScoreBar label="Factual Consistency" value={metrics.hallucination.factual_consistency} />
            <ScoreBar label="Self-Consistency" value={metrics.hallucination.self_consistency} />
            <ScoreBar label="Semantic Similarity" value={metrics.hallucination.semantic_similarity} />
            <ScoreBar label="Hallucination Risk (↓ better)" value={metrics.hallucination.hallucination_risk} invert />
            <div className="pt-1 border-t border-slate-100">
              <p className="text-[10px] text-slate-400">Method: <span className="font-medium text-slate-600">NLI · keyword overlap · claim/hedge ratio</span></p>
            </div>
          </MetricCard>

          <MetricCard title="LLM-as-Judge" icon={Bot} color="bg-purple-100 text-purple-600">
            <ScoreBar label="Completeness" value={metrics.llm_as_judge.completeness} />
            <ScoreBar label="Groundedness" value={metrics.llm_as_judge.groundedness} />
            <ScoreBar label="Conciseness" value={metrics.llm_as_judge.conciseness} />
            <ScoreBar label="Coherence" value={metrics.llm_as_judge.coherence} />
            <ScoreBar label="Helpfulness" value={metrics.llm_as_judge.helpfulness} />
            <ScoreBar label="Accuracy" value={metrics.llm_as_judge.accuracy} />
            <ScoreBar label="Toxicity-Free" value={metrics.llm_as_judge.toxicity_free} />
            <ScoreBar label="Bias-Free" value={metrics.llm_as_judge.bias_free} />
            <div className="pt-1 border-t border-slate-100">
              <p className="text-[10px] text-slate-400">Judge: <span className="font-medium text-slate-600">{metrics.llm_as_judge.judge_model}</span></p>
            </div>
          </MetricCard>
        </div>

        {/* Core Metrics — Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard title="Ranking Metrics" icon={BarChart2} color="bg-sky-100 text-sky-600">
            <ScoreBar label="MRR@10" value={metrics.ranking.mrr_at_10} />
            <ScoreBar label="NDCG@10" value={metrics.ranking.ndcg_at_10} />
            <ScoreBar label="Precision@5" value={metrics.ranking.precision_at_5} />
            <ScoreBar label="Recall@10" value={metrics.ranking.recall_at_10} />
            <ScoreBar label="MAP@10" value={metrics.ranking.map_at_10} />
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Hit Rate</p>
              <ScoreBar label="Hit@1" value={metrics.ranking.hit_rate_at_1} />
              <ScoreBar label="Hit@3" value={metrics.ranking.hit_rate_at_3} />
              <ScoreBar label="Hit@5" value={metrics.ranking.hit_rate_at_5} />
            </div>
          </MetricCard>

          <MetricCard title="Agent Latency Traces" icon={Activity} color="bg-teal-100 text-teal-600">
            <div className="space-y-4">
              {metrics.latency_traces.map(t => (
                <div key={t.agent}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{t.agent}</span>
                    <span className={`font-bold ${t.avg_ms > 400 ? "text-amber-600" : "text-teal-600"}`}>{t.avg_ms}ms avg</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full ${t.avg_ms > 400 ? "bg-amber-400" : "bg-teal-500"}`} style={{ width: `${(t.avg_ms / maxLatency) * 100}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-400">
                    <span>P95: <span className="font-medium text-slate-600">{t.p95_ms}ms</span></span>
                    <span>P99: <span className="font-medium text-slate-600">{t.p99_ms}ms</span></span>
                  </div>
                </div>
              ))}
            </div>
          </MetricCard>

          <MetricCard title="Toxicity & Safety" icon={Shield} color="bg-rose-100 text-rose-600">
            <ScoreBar label="Safety Score" value={metrics.toxicity.safety_score} />
            <ScoreBar label="Bias Score" value={metrics.toxicity.bias_score} />
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Toxic Category Rates (↓ better)</p>
              {[
                { label: "Toxic (any)", rate: metrics.toxicity.toxic_rate },
                { label: "Severe Toxic", rate: metrics.toxicity.severe_toxic_rate },
                { label: "Obscene", rate: metrics.toxicity.obscene_rate },
                { label: "Threat", rate: metrics.toxicity.threat_rate },
                { label: "Insult", rate: metrics.toxicity.insult_rate },
                { label: "Identity Attack", rate: metrics.toxicity.identity_attack_rate },
              ].map(({ label, rate }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-600">{label}</span>
                  <span className={`text-xs font-bold ${rate > 0.01 ? "text-red-600" : rate > 0.005 ? "text-amber-600" : "text-emerald-600"}`}>
                    {(rate * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </MetricCard>
        </div>

        {/* Retrieval + Model Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Retrieval Quality */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600"><Database className="w-4 h-4" /></div>
              <h3 className="font-semibold text-slate-800 text-sm">Retrieval Quality</h3>
            </div>
            <div className="space-y-3 mb-4">
              <ScoreBar label="Avg Chunk Relevance" value={metrics.retrieval.avg_chunk_relevance} />
              <ScoreBar label="Cache Hit Rate" value={metrics.retrieval.cache_hit_rate} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Avg Chunks/Query", value: metrics.retrieval.avg_chunks_retrieved.toFixed(1), icon: "📦" },
                { label: "Top-K", value: metrics.retrieval.top_k, icon: "🔝" },
                { label: "Search Latency", value: `${metrics.retrieval.vector_search_latency_ms}ms`, icon: "⚡" },
                { label: "Index Size", value: `${(metrics.retrieval.index_size_vectors / 1000).toFixed(1)}K vecs`, icon: "🌲" },
                { label: "Embedding Dim", value: `${metrics.retrieval.embedding_dim}d`, icon: "🧮" },
                { label: "Similarity", value: metrics.retrieval.similarity_metric, icon: "📐" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-gray-50 border border-slate-100 rounded-xl p-3">
                  <div className="text-lg mb-1">{icon}</div>
                  <p className="text-sm font-bold text-slate-700">{value}</p>
                  <p className="text-[10px] text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Model Comparison */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-violet-100 text-violet-600"><BarChart2 className="w-4 h-4" /></div>
              <h3 className="font-semibold text-slate-800 text-sm">Model Performance Comparison</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-medium">Model</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Latency</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Faithful</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Success</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Reqs</th>
                </tr>
              </thead>
              <tbody>
                {metrics.model_comparison.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-gray-50 transition-all">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.provider === "groq" ? "bg-amber-500" : row.provider === "gemini" ? "bg-blue-500" : "bg-slate-400"}`} />
                        <span className="font-medium text-slate-700 truncate">{row.model}</span>
                      </div>
                    </td>
                    <td className={`text-right py-2.5 font-bold ${row.latency_ms > 600 ? "text-amber-600" : "text-teal-600"}`}>{row.latency_ms}ms</td>
                    <td className={`text-right py-2.5 font-bold ${score2color(row.faithfulness)}`}>{row.faithfulness > 0 ? pct(row.faithfulness) : "—"}</td>
                    <td className={`text-right py-2.5 font-bold ${score2color(row.success_rate)}`}>{pct(row.success_rate)}</td>
                    <td className="text-right py-2.5 text-slate-500">{row.requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="text-[10px] text-slate-400">All providers<br /><span className="font-bold text-emerald-600 text-xs">FREE tier</span></div>
              <div className="text-[10px] text-slate-400">Fastest<br /><span className="font-bold text-slate-700 text-xs">Mixtral: 287ms</span></div>
              <div className="text-[10px] text-slate-400">Best faithfulness<br /><span className="font-bold text-slate-700 text-xs">Gemini: 91.2%</span></div>
            </div>
          </div>
        </div>

        {/* Governance — expanded full width */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600"><Shield className="w-4 h-4" /></div>
            <h3 className="font-semibold text-slate-800 text-sm">Governance & Compliance</h3>
            <span className="ml-auto text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              {pct(metrics.governance.compliant_responses)} compliant
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: "PII Events", value: metrics.governance.pii_events, bad: metrics.governance.pii_events > 0, icon: "🔒" },
              { label: "Policy Violations", value: metrics.governance.policy_violations, bad: metrics.governance.policy_violations > 0, icon: "⚠️" },
              { label: "Injection Attempts", value: metrics.governance.injection_attempts, bad: metrics.governance.injection_attempts > 0, icon: "🛡️" },
              { label: "Toxic Inputs Blocked", value: metrics.governance.toxic_inputs_blocked, bad: false, icon: "🚫" },
              { label: "PII Fields Redacted", value: metrics.governance.pii_redacted_fields, bad: false, icon: "🔐" },
              { label: "DLP Scans", value: metrics.governance.dlp_scans, bad: false, icon: "🔍" },
              { label: "Audit Entries", value: metrics.governance.audit_log_entries, bad: false, icon: "📋" },
              { label: "Total Tokens", value: metrics.governance.estimated_tokens_used.toLocaleString(), bad: false, icon: "🧮" },
            ].map(item => (
              <div key={item.label} className="border border-slate-100 rounded-xl p-3 bg-gray-50">
                <div className="text-lg mb-1">{item.icon}</div>
                <p className={`text-xl font-bold ${item.bad ? "text-red-600" : "text-slate-800"}`}>{item.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScoreBar label="Compliant Responses" value={metrics.governance.compliant_responses} />
            <div className="flex items-center gap-3 bg-gray-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-600">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-[10px] text-slate-400">Estimated cost (all free models)</p>
                <p className="text-lg font-bold text-emerald-700">$0.0000</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guardrail Coverage Map */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" /> Guardrail Coverage Map
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { cat: "LlamaFirewall", color: "bg-orange-50 border-orange-200", tag: "bg-orange-100 text-orange-700", checks: ["Prompt Injection Detection", "Toxicity & Hate Speech Filter", "Code & Script Injection Prevention"] },
              { cat: "NeMo Guardrails", color: "bg-purple-50 border-purple-200", tag: "bg-purple-100 text-purple-700", checks: ["PII Detection & Redaction", "Topic Policy Enforcement", "Dialogue Flow Control"] },
              { cat: "Custom NLI", color: "bg-sky-50 border-sky-200", tag: "bg-sky-100 text-sky-700", checks: ["Entailment Verification", "Hallucination Risk Scoring", "Chunking Quality Assessment", "Bias Detection"] },
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

        {/* NLI & Chunking Insight */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" /> NLI Inference & Chunking Quality
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Entailment Check", icon: "🔗", desc: "Computes keyword overlap between model response and retrieved context. Low overlap (< 15%) flags potential disconnection from source material.", badge: "NLI · Custom" },
              { title: "Hallucination Scoring", icon: "🌫️", desc: "Measures ratio of definitive claims ('always', 'certainly') vs. hedging phrases ('might', 'could'). High claim ratio without grounding raises the risk score.", badge: "NLI · Heuristic" },
              { title: "Chunking Quality", icon: "✂️", desc: "Validates chunk reliability: checks word count (≥ 5), sentence coherence (avg ≥ 3 words/sentence), and projects chunk count at 500-char window.", badge: "NLI · Structural" },
            ].map(item => (
              <div key={item.title} className="border border-slate-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-semibold text-slate-700 text-sm">{item.title}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.desc}</p>
                <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">{item.badge}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────
function SettingsTab({ selectedModel, onModelChange }: {
  selectedModel: ModelInfo;
  onModelChange: (m: ModelInfo) => void;
}) {
  const [backendUrl, setBackendUrl] = useState(API);
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [customMcpUrl, setCustomMcpUrl] = useState("");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    groq: "", gemini: "", openrouter: "", together: "", huggingface: "",
  });
  const [saved, setSaved] = useState(false);

  const providerGroups = [
    { id: "groq" as ModelProvider, label: "Groq", icon: "⚡", tier: "Free tier", color: "amber", keyName: "GROQ_API_KEY", signupUrl: "https://console.groq.com" },
    { id: "gemini" as ModelProvider, label: "Google Gemini", icon: "🔵", tier: "Free tier", color: "blue", keyName: "GOOGLE_API_KEY", signupUrl: "https://aistudio.google.com" },
    { id: "openrouter" as ModelProvider, label: "OpenRouter", icon: "🔀", tier: "Free models", color: "violet", keyName: "OPENROUTER_API_KEY", signupUrl: "https://openrouter.ai" },
    { id: "together" as ModelProvider, label: "Together.ai", icon: "🤝", tier: "Free tier", color: "pink", keyName: "TOGETHER_API_KEY", signupUrl: "https://api.together.xyz" },
    { id: "huggingface" as ModelProvider, label: "HuggingFace", icon: "🤗", tier: "Free inference", color: "yellow", keyName: "HF_TOKEN", signupUrl: "https://huggingface.co" },
    { id: "ollama" as ModelProvider, label: "Ollama (Local)", icon: "🦙", tier: "100% Free", color: "emerald", keyName: null, signupUrl: "https://ollama.ai" },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Settings & Configuration</h2>
          <p className="text-slate-500 text-sm mt-1">Configure models, API keys, MCP servers, and guardrail behaviour.</p>
        </div>

        {/* Model Selection */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-indigo-100 rounded-xl"><Cpu className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-800">Free Model Selection</h3>
              <p className="text-xs text-slate-500">Choose from 12 free LLM options across 6 providers. API keys go in your backend .env file.</p>
            </div>
          </div>

          {providerGroups.map(provider => {
            const providerModels = FREE_MODELS.filter(m => m.provider === provider.id);
            return (
              <div key={provider.id} className="mb-5 last:mb-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">{provider.icon}</span>
                  <span className="text-sm font-semibold text-slate-700">{provider.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PROVIDER_COLORS[provider.id]}`}>{provider.tier}</span>
                  {provider.keyName && (
                    <span className="text-[10px] text-slate-400 ml-auto">env: <code className="font-mono">{provider.keyName}</code></span>
                  )}
                  {provider.id === "ollama" && (
                    <span className="text-[10px] text-slate-400 ml-auto">Run: <code className="font-mono">ollama serve</code></span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                  {providerModels.map(model => {
                    const isSelected = selectedModel.provider === model.provider && selectedModel.model_id === model.model_id;
                    return (
                      <button
                        key={model.model_id}
                        onClick={() => onModelChange(model)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700 truncate">{model.display_name}</span>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-400">{model.notes}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{model.context_k}K ctx</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ollama URL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-100 rounded-xl"><Server className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-800">Ollama & Custom Endpoints</h3>
              <p className="text-xs text-slate-500">Configure local Ollama or custom MCP server URLs.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Ollama Base URL</label>
              <div className="relative">
                <input
                  type="text" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)}
                  className="w-full bg-gray-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all font-mono"
                />
                <Server className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Set in backend .env as OLLAMA_BASE_URL</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Custom MCP Server URL</label>
              <div className="relative">
                <input
                  type="text" value={customMcpUrl} onChange={e => setCustomMcpUrl(e.target.value)}
                  placeholder="https://your-mcp-server.com/sse"
                  className="w-full bg-gray-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all font-mono"
                />
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Any MCP-compatible server endpoint (SSE or WebSocket)</p>
            </div>
          </div>
        </div>

        {/* Guardrail Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-rose-100 rounded-xl"><Shield className="w-5 h-5 text-rose-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-800">Guardrail Configuration</h3>
              <p className="text-xs text-slate-500">All guardrails are deterministic & run in a sidecar thread. No external calls.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["LlamaFirewall", "NeMo Guardrails", "Custom NLI"] as const).map(cat => {
              const style = CAT_STYLES[cat];
              const catChecks = GUARDRAIL_OPTIONS.filter(g => g.cat === cat);
              return (
                <div key={cat} className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.tag}`}>{cat}</span>
                  <ul className="mt-3 space-y-2">
                    {catChecks.map(g => (
                      <li key={g.key} className="flex items-start gap-2">
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${SEV_COLORS[g.sev]}`}>
                          <g.icon className="w-2 h-2" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-700">{g.label}</p>
                          <p className="text-[10px] text-slate-400">{g.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-slate-200/50">
                    <p className="text-[10px] text-slate-500">
                      {cat === "LlamaFirewall" && "Regex pattern matching · deterministic"}
                      {cat === "NeMo Guardrails" && "Rule-based · NVIDIA NeMo methodology"}
                      {cat === "Custom NLI" && "NLI inference · keyword overlap · heuristic"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-slate-100 rounded-xl"><Monitor className="w-5 h-5 text-slate-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-800">System Configuration</h3>
              <p className="text-xs text-slate-500">Backend connection and environment settings.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Backend API URL</label>
              <div className="relative">
                <input
                  type="text" value={backendUrl} onChange={e => setBackendUrl(e.target.value)}
                  className="w-full bg-gray-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
                />
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Override with NEXT_PUBLIC_API_URL env var</p>
            </div>
            <div className="bg-gray-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-2">Quick Start</p>
              <code className="text-[11px] text-slate-600 block leading-relaxed font-mono">
                cd backend<br />
                pip install -r requirements.txt<br />
                python main.py
              </code>
            </div>
          </div>
          <button
            onClick={handleSave}
            className={`mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {saved ? <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Saved!</span> : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "workspace" | "data" | "metrics" | "settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("workspace");
  const [selectedModel, setSelectedModel] = useState<ModelInfo>(FREE_MODELS[0]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "workspace", label: "Workspace", icon: LayoutDashboard },
    { id: "data", label: "Data & Ingestion", icon: Database },
    { id: "metrics", label: "Metrics", icon: BarChart2 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-800 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-100 rounded-xl"><Cpu className="w-5 h-5 text-indigo-600" /></div>
          <div>
            <span className="font-bold text-slate-800 text-sm">MAS Orchestrator</span>
            <span className="ml-2 text-xs text-slate-400 hidden sm:inline">LangGraph · RAG · MCP · Guardrails</span>
          </div>
        </div>

        <nav className="flex bg-gray-100 border border-slate-200 rounded-xl p-1 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? "bg-white text-indigo-700 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${PROVIDER_COLORS[selectedModel.provider]}`}>
            {selectedModel.display_name}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live
          </div>
        </div>
      </header>

      <main className="flex flex-col flex-1 min-h-0">
        {activeTab === "workspace" && <WorkspaceTab selectedModel={selectedModel} />}
        {activeTab === "data" && <DataTab />}
        {activeTab === "metrics" && <MetricsTab />}
        {activeTab === "settings" && <SettingsTab selectedModel={selectedModel} onModelChange={setSelectedModel} />}
      </main>
    </div>
  );
}
