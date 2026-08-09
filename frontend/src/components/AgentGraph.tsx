"use client";

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
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

type CustomNodeData = {
  label: string;
  isActive?: boolean;
  isOutput?: boolean;
  isSourceOnly?: boolean;
};

const CustomNode = ({ data, selected }: NodeProps & { data: CustomNodeData }) => {
  const isResource = data.label.includes("Pinecone") || data.label.includes("MCP") || data.label.includes("MongoDB");
  const isPinecone = data.label.includes("Pinecone");
  const isMCP = data.label.includes("MCP");
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
  { id: 'Supervisor', type: 'custom', position: { x: 250, y: 50 }, data: { label: '👨‍💼 Supervisor', isSourceOnly: true } },
  { id: 'Researcher', type: 'custom', position: { x: 80, y: 200 }, data: { label: '🔍 Researcher' } },
  { id: 'Writer', type: 'custom', position: { x: 420, y: 200 }, data: { label: '✍️ Writer' } },
];

const initialEdges = [
  { id: 'e-sup-res', source: 'Supervisor', target: 'Researcher', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e-sup-wri', source: 'Supervisor', target: 'Writer', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
];

let nodeIdCounter = 0;
const getNewNodeId = () => `node_${nodeIdCounter++}`;

interface SidebarProps {
  selectedMcpTools: string[];
  onToggleMcp: (tool: string) => void;
}

const Sidebar = ({ selectedMcpTools, onToggleMcp }: SidebarProps) => {
  const onDragStart = (event: React.DragEvent, label: string) => {
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const agents = [
    { label: '👨‍💼 Supervisor', desc: 'Routes tasks' },
    { label: '🔍 Researcher', desc: 'Retrieves context' },
    { label: '✍️ Writer', desc: 'Drafts response' },
    { label: '🧠 Analyzer', desc: 'Pattern analysis' },
    { label: '🔧 Executor', desc: 'Runs tools' },
    { label: '🛡️ Guardrail', desc: 'Safety checks' },
  ];

  const mcpTools = [
    { label: '🌐 Brave Search MCP', color: 'blue' },
    { label: '📁 Filesystem MCP', color: 'orange' },
    { label: '🐙 GitHub MCP', color: 'gray' },
    { label: '💬 Slack MCP', color: 'purple' },
    { label: '🗃️ PostgreSQL MCP', color: 'indigo' },
    { label: '🔌 Custom MCP', color: 'green' },
  ];

  const resources = [
    { label: '🌲 Pinecone DB' },
    { label: '🗄️ MongoDB' },
    { label: '🔗 REST API' },
  ];

  return (
    <div className="w-56 flex-shrink-0 h-full bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      <div className="overflow-y-auto flex-1">
        {/* Agents */}
        <div className="p-3 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Agents</p>
          <div className="flex flex-col gap-1.5">
            {agents.map((a) => (
              <div
                key={a.label}
                className="bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 p-2.5 rounded-lg cursor-grab transition-all"
                onDragStart={(e) => onDragStart(e, a.label)}
                draggable
              >
                <div className="text-slate-700 font-medium text-xs">{a.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MCP Tools */}
        <div className="p-3 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">MCP Servers</p>
          <div className="flex flex-col gap-1.5">
            {mcpTools.map((tool) => {
              const active = selectedMcpTools.includes(tool.label);
              return (
                <div key={tool.label} className="flex items-center gap-2 group">
                  <button
                    onClick={() => onToggleMcp(tool.label)}
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-all ${
                      active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {active && <svg className="w-full h-full text-white p-px" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <div
                    className={`flex-1 bg-slate-50 border ${active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'} p-2 rounded-lg cursor-grab transition-all text-xs`}
                    onDragStart={(e) => onDragStart(e, tool.label)}
                    draggable
                  >
                    <span className="text-slate-700 font-medium">{tool.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resources */}
        <div className="p-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resources</p>
          <div className="flex flex-col gap-1.5">
            {resources.map((r) => (
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
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)),
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
      const isResource = label.includes('Pinecone') || label.includes('MCP') || label.includes('MongoDB') || label.includes('API');
      setNodes((nds) => nds.concat({ id: getNewNodeId(), type: 'custom', position, data: { label, isOutput: isResource } }));
    },
    [screenToFlowPosition, setNodes]
  );

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const isActive = activeNode ? node.data.label.includes(activeNode) : false;
        if (node.data.isActive === isActive) return node;
        return { ...node, data: { ...node.data, isActive } };
      })
    );
  }, [activeNode, setNodes]);

  return (
    <div className="flex w-full h-full" ref={reactFlowWrapper}>
      <div className="flex-1 h-full bg-slate-50">
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
