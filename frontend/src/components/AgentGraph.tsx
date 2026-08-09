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
  const isResource = data.label.includes("Pinecone") || data.label.includes("MCP");

  let colorClass = "bg-slate-800 border-slate-700 text-slate-200";
  if (data.isActive) {
    colorClass = "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_25px_rgba(99,102,241,0.8)]";
  } else if (data.label.includes("Pinecone")) {
    colorClass = selected ? "bg-emerald-900/70 border-emerald-400 text-emerald-200" : "bg-emerald-900/50 border-emerald-700 text-emerald-300";
  } else if (data.label.includes("MCP")) {
    colorClass = selected ? "bg-purple-900/70 border-purple-400 text-purple-200" : "bg-purple-900/50 border-purple-700 text-purple-300";
  } else if (selected) {
    colorClass = "bg-slate-700 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]";
  }

  return (
    <div className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 min-w-[140px] text-center ${colorClass}`}>
      {!data.isSourceOnly && (
        <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-indigo-400 !border-2 !border-slate-900" />
      )}
      <div className="text-sm font-semibold">{data.label}</div>
      {!isResource && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-indigo-400 !border-2 !border-slate-900" />
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
  { id: 'e-sup-res', source: 'Supervisor', target: 'Researcher', animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } },
  { id: 'e-sup-wri', source: 'Supervisor', target: 'Writer', animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } },
];

let nodeIdCounter = 0;
const getNewNodeId = () => `node_${nodeIdCounter++}`;

const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, label: string) => {
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const agentItems = [
    { label: '👨‍💼 Supervisor', desc: 'Routes tasks to workers' },
    { label: '🔍 Researcher', desc: 'Searches web and vector DB' },
    { label: '✍️ Writer', desc: 'Drafts final content' },
    { label: '🧠 Analyzer', desc: 'Analyzes data patterns' },
    { label: '🔧 Executor', desc: 'Runs tools and actions' },
  ];

  const resourceItems = [
    { label: '🌲 Pinecone DB', colorClass: 'bg-emerald-900/30 border-emerald-800 hover:border-emerald-500 text-emerald-400' },
    { label: '🔌 MCP Server', colorClass: 'bg-purple-900/30 border-purple-800 hover:border-purple-500 text-purple-400' },
    { label: '🗄️ MongoDB', colorClass: 'bg-sky-900/30 border-sky-800 hover:border-sky-500 text-sky-400' },
  ];

  return (
    <div className="w-56 flex-shrink-0 h-full bg-slate-900/90 backdrop-blur-md border-l border-slate-800 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agents</h3>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2">
        {agentItems.map((item) => (
          <div
            key={item.label}
            className="bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-grab hover:bg-slate-700 hover:border-indigo-500 transition-all"
            onDragStart={(e) => onDragStart(e, item.label)}
            draggable
          >
            <div className="text-slate-200 font-medium text-sm">{item.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
          </div>
        ))}
        <div className="mt-3 mb-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resources</h3>
        </div>
        {resourceItems.map((item) => (
          <div
            key={item.label}
            className={`border p-3 rounded-lg cursor-grab transition-all ${item.colorClass}`}
            onDragStart={(e) => onDragStart(e, item.label)}
            draggable
          >
            <div className="font-medium text-sm">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DnDFlow = ({ activeNode }: { activeNode: string | null }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } }, eds)),
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
      const isOutput = label.includes('Pinecone') || label.includes('MCP') || label.includes('MongoDB');
      setNodes((nds) => nds.concat({
        id: getNewNodeId(),
        type: 'custom',
        position,
        data: { label, isOutput },
      }));
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
      <div className="flex-1 h-full bg-slate-950">
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
          colorMode="dark"
        >
          <Background gap={20} color="#1e293b" />
          <Controls position="bottom-left" />
        </ReactFlow>
      </div>
      <Sidebar />
    </div>
  );
};

export default function AgentGraph({ activeNode }: { activeNode: string | null }) {
  return (
    <ReactFlowProvider>
      <DnDFlow activeNode={activeNode} />
    </ReactFlowProvider>
  );
}
