"use client";

import React, { useCallback, useEffect, useRef } from 'react';
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
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// -----------------------------
// Custom Node Implementation
// -----------------------------
const CustomNode = ({ data, selected }: any) => {
  const isOutput = data.isOutput;
  const isResource = data.label.includes("Pinecone") || data.label.includes("MCP");
  
  // Dynamic styling based on state and type
  const baseStyle = "px-4 py-3 shadow-lg rounded-xl border-2 transition-all duration-200 min-w-[150px] text-center flex flex-col items-center justify-center";
  
  let bg = "bg-slate-800";
  let border = selected ? "border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "border-slate-700";
  let text = "text-slate-200";
  
  if (data.isActive) {
    bg = "bg-indigo-600";
    border = "border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.8)] scale-105";
    text = "text-white font-bold";
  } else if (isResource) {
    bg = data.label.includes("Pinecone") ? "bg-emerald-900/50" : "bg-purple-900/50";
    border = selected ? (data.label.includes("Pinecone") ? "border-emerald-400" : "border-purple-400") : "border-slate-700";
    text = data.label.includes("Pinecone") ? "text-emerald-300" : "text-purple-300";
  }

  return (
    <div className={`${baseStyle} ${bg} ${border}`}>
      {/* Target Handle (Top) */}
      {!data.isSourceOnly && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 bg-indigo-400 border-2 border-slate-900" 
        />
      )}
      
      <div className={`text-sm ${text}`}>
        {data.label}
      </div>

      {/* Source Handle (Bottom) */}
      {!isOutput && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 bg-indigo-400 border-2 border-slate-900" 
        />
      )}
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

// -----------------------------
// Initial Data
// -----------------------------
const initialNodes = [
  {
    id: 'Supervisor',
    type: 'custom',
    position: { x: 250, y: 50 },
    data: { label: '👨‍💼 Supervisor', isSourceOnly: true },
  },
  {
    id: 'Researcher',
    type: 'custom',
    position: { x: 100, y: 200 },
    data: { label: '🔍 Researcher' },
  },
  {
    id: 'Writer',
    type: 'custom',
    position: { x: 400, y: 200 },
    data: { label: '✍️ Writer' },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'Supervisor', target: 'Researcher', animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } },
  { id: 'e1-3', source: 'Supervisor', target: 'Writer', animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } },
];

let idCounter = 0;
const getId = () => `dndnode_${idCounter++}`;

// -----------------------------
// Sidebar Component
// -----------------------------
const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 flex-shrink-0 h-full bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-4 shadow-xl z-10 flex flex-col gap-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Available Agents</h3>
      
      <div 
        className="bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-grab hover:bg-slate-700 hover:border-indigo-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'custom', '👨‍💼 Supervisor')}
        draggable
      >
        <span className="text-slate-200 font-medium text-sm">Supervisor Agent</span>
        <p className="text-xs text-slate-400 mt-1">Routes tasks to workers</p>
      </div>

      <div 
        className="bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-grab hover:bg-slate-700 hover:border-indigo-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'custom', '🔍 Researcher')}
        draggable
      >
        <span className="text-slate-200 font-medium text-sm">Researcher Agent</span>
        <p className="text-xs text-slate-400 mt-1">Searches web and vector DB</p>
      </div>

      <div 
        className="bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-grab hover:bg-slate-700 hover:border-indigo-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'custom', '✍️ Writer')}
        draggable
      >
        <span className="text-slate-200 font-medium text-sm">Writer Agent</span>
        <p className="text-xs text-slate-400 mt-1">Drafts final content</p>
      </div>

      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mt-4 mb-2">Resources</h3>
      
      <div 
        className="bg-emerald-900/30 border border-emerald-800 p-3 rounded-lg cursor-grab hover:bg-emerald-800/40 hover:border-emerald-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'custom', '🌲 Pinecone DB')}
        draggable
      >
        <span className="text-emerald-400 font-medium text-sm">Pinecone DB</span>
      </div>

      <div 
        className="bg-purple-900/30 border border-purple-800 p-3 rounded-lg cursor-grab hover:bg-purple-800/40 hover:border-purple-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'custom', '🔌 MCP Server')}
        draggable
      >
        <span className="text-purple-400 font-medium text-sm">MCP Server</span>
      </div>
    </div>
  );
};

// -----------------------------
// Main Flow Component
// -----------------------------
const DnDFlow = ({ activeNode }: { activeNode: string | null }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isOutput = label.includes('Pinecone') || label.includes('MCP');

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label, isOutput },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  // Safely update nodes' isActive state without blowing away position data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const isActive = activeNode ? node.data.label.includes(activeNode) : false;
        
        // Only update if the active state actually changed to avoid jitter
        if (node.data.isActive !== isActive) {
          return {
            ...node,
            data: {
              ...node.data,
              isActive
            }
          };
        }
        return node;
      })
    );
  }, [activeNode, setNodes]);

  return (
    <div className="flex w-full h-full relative flex-row" ref={reactFlowWrapper}>
      <div className="flex-1 h-full relative bg-slate-950">
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
          className="bg-transparent"
        >
          <Background gap={16} color="#1e293b" />
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
