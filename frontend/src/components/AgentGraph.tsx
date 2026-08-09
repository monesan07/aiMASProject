"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  useReactFlow,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronDown, ChevronRight } from 'lucide-react';

type CustomNodeData = {
  label: string;
  isActive?: boolean;
  isOutput?: boolean;
  isSourceOnly?: boolean;
};

const CustomNode = ({ data, selected }: NodeProps & { data: CustomNodeData }) => {
  const isResource = data.label.includes("Pinecone") || data.label.includes("MCP") || data.label.includes("MongoDB");
  const isPinecone = data.label.includes("Pinecone");
  const isMCP = data.label.includes("MCP") || data.label.includes("Search") || data.label.includes("GitHub") || data.label.includes("Slack");
  const isMongo = data.label.includes("MongoDB");

  let cls = "bg-white border-slate-300 text-slate-700 shadow-sm";
  if (data.isActive) {
    cls = "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]";
  } else if (isPinecone) {
    cls = selected ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-emerald-50 border-emerald-300 text-emerald-700";
  } else if (isMCP) {
    cls = selected ? "bg-purple-50 border-purple-500 text-purple-800" : "bg-purple-50 border-purple-300 text-purple-700";
  } else if (isMongo) {
    cls = selected ? "bg-sky-50 border-sky-500 text-sky-800" : "bg-sky-50 border-sky-300 text-sky-700";
  } else if (selected) {
    cls = "bg-indigo-50 border-indigo-400 text-indigo-800 shadow-md";
  }

  return (
    <div className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 min-w-[140px] text-center ${cls}`}>
      {!data.isSourceOnly && (
        <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-indigo-400 !border-2 !border-white" />
      )}
      <div className="text-sm font-semibold">{data.label}</div>
      {!isResource && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-indigo-400 !border-2 !border-white" />
      )}
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

const initialNodes = [
  { id: 'Supervisor', type: 'custom', position: { x: 250, y: 50 }, data: { label: '👨‍💼 Supervisor', isSourceOnly: true } as CustomNodeData },
  { id: 'Researcher', type: 'custom', position: { x: 80, y: 200 }, data: { label: '🔍 Researcher' } as CustomNodeData },
  { id: 'Writer', type: 'custom', position: { x: 420, y: 200 }, data: { label: '✍️ Writer' } as CustomNodeData },
];

const initialEdges = [
  { id: 'e-sup-res', source: 'Supervisor', target: 'Researcher', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e-sup-wri', source: 'Supervisor', target: 'Writer', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
];

let nodeIdCounter = 0;
const getNewNodeId = () => `node_${nodeIdCounter++}`;

const AGENT_PALETTE = [
  { label: '👨‍💼 Supervisor', desc: 'Routes tasks' },
  { label: '🔍 Researcher', desc: 'Retrieves context' },
  { label: '✍️ Writer', desc: 'Drafts response' },
  { label: '🧠 Analyzer', desc: 'Pattern analysis' },
  { label: '🔧 Executor', desc: 'Runs tools' },
  { label: '🛡️ Guardrail', desc: 'Safety checks' },
];

const MCP_CATEGORIES: { cat: string; color: string; tools: { label: string; key: string; desc: string }[] }[] = [
  {
    cat: "Search",
    color: "blue",
    tools: [
      { label: '🌐 Brave Search', key: 'brave_search', desc: 'Web search via Brave' },
      { label: '🔍 Exa Search', key: 'exa_search', desc: 'AI-powered semantic search' },
      { label: '📰 Perplexity', key: 'perplexity', desc: 'Real-time search with citations' },
    ],
  },
  {
    cat: "Storage & DB",
    color: "orange",
    tools: [
      { label: '📁 Filesystem', key: 'filesystem', desc: 'Local file system access' },
      { label: '🗃️ PostgreSQL', key: 'postgresql', desc: 'Postgres database queries' },
      { label: '🔥 Firebase', key: 'firebase', desc: 'Firebase realtime database' },
      { label: '🪣 AWS S3', key: 'aws_s3', desc: 'Amazon S3 object storage' },
    ],
  },
  {
    cat: "DevOps",
    color: "gray",
    tools: [
      { label: '🐙 GitHub', key: 'github', desc: 'Repository management' },
      { label: '🦊 GitLab', key: 'gitlab', desc: 'GitLab CI/CD integration' },
      { label: '🐳 Docker', key: 'docker', desc: 'Container management' },
    ],
  },
  {
    cat: "Communication",
    color: "purple",
    tools: [
      { label: '💬 Slack', key: 'slack', desc: 'Team messaging' },
      { label: '✉️ Email SMTP', key: 'email', desc: 'Send & receive emails' },
      { label: '📱 Telegram', key: 'telegram', desc: 'Telegram bot messaging' },
    ],
  },
  {
    cat: "Productivity",
    color: "pink",
    tools: [
      { label: '🗓️ Google Calendar', key: 'gcal', desc: 'Calendar management' },
      { label: '📝 Notion', key: 'notion', desc: 'Notes & documentation' },
      { label: '📊 Google Sheets', key: 'gsheets', desc: 'Spreadsheet operations' },
    ],
  },
  {
    cat: "AI & Data",
    color: "amber",
    tools: [
      { label: '🤖 Anthropic MCP', key: 'anthropic', desc: 'Claude tool use & artifacts' },
      { label: '🌤️ Weather API', key: 'weather', desc: 'Real-time weather data' },
      { label: '🔌 Custom Server', key: 'custom', desc: 'Your custom MCP endpoint' },
    ],
  },
];

const RESOURCE_PALETTE = [
  { label: '🌲 Pinecone DB' },
  { label: '🗄️ MongoDB' },
  { label: '🔗 REST API' },
];

interface SidebarProps {
  selectedMcpTools: string[];
  onToggleMcp: (tool: string) => void;
}

const Sidebar = ({ selectedMcpTools, onToggleMcp }: SidebarProps) => {
  const [expandedCats, setExpandedCats] = useState<string[]>(["Search"]);

  const onDragStart = (event: React.DragEvent, label: string) => {
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCat = (cat: string) => {
    setExpandedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="w-60 flex-shrink-0 h-full bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      <div className="overflow-y-auto flex-1">
        {/* Agents */}
        <div className="p-3 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Agents</p>
          <div className="flex flex-col gap-1.5">
            {AGENT_PALETTE.map((a) => (
              <div
                key={a.label}
                className="bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 p-2 rounded-lg cursor-grab transition-all"
                onDragStart={(e) => onDragStart(e, a.label)}
                draggable
              >
                <div className="text-slate-700 font-medium text-xs">{a.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MCP Tools grouped by category */}
        <div className="p-3 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">MCP Servers</p>
          <div className="flex flex-col gap-1">
            {MCP_CATEGORIES.map(({ cat, tools }) => {
              const expanded = expandedCats.includes(cat);
              const activeCount = tools.filter(t => selectedMcpTools.includes(t.key)).length;
              return (
                <div key={cat} className="border border-slate-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 transition-all text-left"
                  >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{cat}</span>
                    <div className="flex items-center gap-1">
                      {activeCount > 0 && (
                        <span className="text-[9px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5 font-bold">{activeCount}</span>
                      )}
                      {expanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                    </div>
                  </button>
                  {expanded && (
                    <div className="p-1.5 space-y-1 bg-white">
                      {tools.map((tool) => {
                        const active = selectedMcpTools.includes(tool.key);
                        return (
                          <div key={tool.key} className="flex items-center gap-1.5">
                            <button
                              onClick={() => onToggleMcp(tool.key)}
                              className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 transition-all ${
                                active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 hover:border-indigo-400'
                              }`}
                            >
                              {active && (
                                <svg className="w-full h-full text-white p-px" fill="none" viewBox="0 0 12 12">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                            <div
                              className={`flex-1 border ${active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'} px-2 py-1.5 rounded-md cursor-grab transition-all`}
                              onDragStart={(e) => onDragStart(e, tool.label)}
                              draggable
                            >
                              <span className="text-slate-700 font-medium text-[11px]">{tool.label}</span>
                              <div className="text-[9px] text-slate-400 mt-0.5">{tool.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resources */}
        <div className="p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resources</p>
          <div className="flex flex-col gap-1.5">
            {RESOURCE_PALETTE.map((r) => (
              <div
                key={r.label}
                className="bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 p-2.5 rounded-lg cursor-grab transition-all text-xs text-slate-700 font-medium"
                onDragStart={(e) => onDragStart(e, r.label)}
                draggable
              >
                {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DnDFlowProps {
  activeNode: string | null;
  selectedMcpTools: string[];
  onToggleMcp: (tool: string) => void;
}

const DnDFlow = ({ activeNode, selectedMcpTools, onToggleMcp }: DnDFlowProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges((eds) => addEdge(params, eds).map(e =>
        e.id === (params as any).id || (e.source === params.source && e.target === params.target)
          ? { ...e, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }
          : e
      ) as any),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const label = event.dataTransfer.getData('application/label');
      if (!label) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const isResource = label.includes('Pinecone') || label.includes('MCP') || label.includes('MongoDB') || label.includes('API') || label.includes('Search') || label.includes('GitHub') || label.includes('Slack');
      setNodes((nds) => nds.concat({ id: getNewNodeId(), type: 'custom', position, data: { label, isOutput: isResource } } as any));
    },
    [screenToFlowPosition, setNodes]
  );

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const isActive = activeNode ? (node.data as any).label.includes(activeNode) : false;
        if ((node.data as any).isActive === isActive) return node;
        return { ...node, data: { ...node.data, isActive } };
      }) as any
    );
  }, [activeNode, setNodes]);

  return (
    <div className="flex w-full h-full" ref={reactFlowWrapper}>
      <div className="flex-1 h-full bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls position="bottom-left" />
        </ReactFlow>
      </div>
      <Sidebar selectedMcpTools={selectedMcpTools} onToggleMcp={onToggleMcp} />
    </div>
  );
};

export default function AgentGraph({
  activeNode,
  selectedMcpTools,
  onToggleMcp,
}: {
  activeNode: string | null;
  selectedMcpTools: string[];
  onToggleMcp: (t: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <DnDFlow activeNode={activeNode} selectedMcpTools={selectedMcpTools} onToggleMcp={onToggleMcp} />
    </ReactFlowProvider>
  );
}
