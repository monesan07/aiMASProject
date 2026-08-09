"use client";

import { useState, useEffect, useRef } from "react";
import AgentGraph from "../components/AgentGraph";
import { Send, Bot, User, Database, Globe, ArrowRight } from "lucide-react";
import axios from "axios";

export default function Home() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>("Supervisor");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setActiveNode("Supervisor"); // Supervisor always starts

    try {
      // We simulate node transitions for visual effect since our backend is sync
      setTimeout(() => setActiveNode("Researcher"), 1500);
      setTimeout(() => setActiveNode("Writer"), 3000);
      setTimeout(() => setActiveNode("Supervisor"), 4500);

      const response = await axios.post("http://localhost:8000/api/chat", {
        message: input,
        thread_id: "demo-thread-1"
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response.data.response }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error communicating with the agent system." }]);
    } finally {
      setIsLoading(false);
      setActiveNode(null);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Left Panel: Chat Interface */}
      <div className="w-1/2 flex flex-col border-r border-slate-800 shadow-2xl z-10 relative bg-slate-900/50 backdrop-blur-xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <Bot className="text-indigo-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Agentic Orchestrator
              </h1>
              <p className="text-xs text-slate-500">MAS Demonstration Project</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
              <Database className="w-3 h-3 text-emerald-400" /> <span className="text-emerald-400">MongoDb</span>
            </div>
            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
              <Globe className="w-3 h-3 text-sky-400" /> <span className="text-sky-400">Pinecone</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
              <Bot className="w-16 h-16 mb-4 text-slate-700" />
              <p>Start a conversation to trigger the agent workflow.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
              <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700"}`}>
                <div className="flex items-center gap-2 mb-1 opacity-70">
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  <span className="text-xs font-semibold">{msg.role === "user" ? "You" : "Supervisor Agent"}</span>
                </div>
                <p className="leading-relaxed text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl p-4 bg-slate-800 rounded-bl-sm border border-slate-700 flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                </div>
                <span className="text-xs text-slate-400 ml-2 animate-pulse">Agents are collaborating...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <form onSubmit={sendMessage} className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the agent network to research something..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 pl-4 pr-12 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 rounded-lg transition-colors text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel: Simulation Canvas */}
      <div className="w-1/2 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="absolute top-6 left-6 z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Workflow Simulation
          </h2>
          <p className="text-xs text-slate-400">Live Agent-to-Agent (A2A) Graph</p>
        </div>
        
        {/* We use a custom ReactFlow component here */}
        <div className="w-full h-full">
          <AgentGraph activeNode={activeNode} />
        </div>
      </div>
    </div>
  );
}
