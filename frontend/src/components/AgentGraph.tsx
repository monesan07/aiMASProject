"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MarkerType,
  Connection,
  Edge,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Sidebar for Drag and Drop
const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="absolute top-0 right-0 w-64 h-full bg-slate-900 border-l border-slate-800 p-4 shadow-xl z-10 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Available Agents</h3>
      
      <div 
        className="bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-grab hover:bg-slate-700 hover:border-indigo-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'default', '👨‍💼 Supervisor')}
        draggable
      >
        <span className="text-slate-200 font-medium text-sm">Supervisor Agent</span>
        <p className="text-xs text-slate-400 mt-1">Routes tasks to workers</p>
      </div>

      <div 
        className="bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-grab hover:bg-slate-700 hover:border-indigo-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'default', '🔍 Researcher')}
        draggable
      >
        <span className="text-slate-200 font-medium text-sm">Researcher Agent</span>
        <p className="text-xs text-slate-400 mt-1">Searches web and vector DB</p>
      </div>

      <div 
        className="bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-grab hover:bg-slate-700 hover:border-indigo-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'default', '✍️ Writer')}
        draggable
      >
        <span className="text-slate-200 font-medium text-sm">Writer Agent</span>
        <p className="text-xs text-slate-400 mt-1">Drafts final content</p>
      </div>

      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mt-4 mb-2">Resources</h3>
      
      <div 
        className="bg-emerald-900/30 border border-emerald-800 p-3 rounded-lg cursor-grab hover:bg-emerald-800/40 hover:border-emerald-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'output', '🌲 Pinecone DB')}
        draggable
      >
        <span className="text-emerald-400 font-medium text-sm">Pinecone DB</span>
      </div>

      <div 
        className="bg-purple-900/30 border border-purple-800 p-3 rounded-lg cursor-grab hover:bg-purple-800/40 hover:border-purple-500 transition-colors shadow-sm"
        onDragStart={(event) => onDragStart(event, 'output', '🔌 MCP Server')}
        draggable
      >
        <span className="text-purple-400 font-medium text-sm">MCP Server</span>
      </div>
    </div>
  );
};

const initialNodes = [
  {
    id: 'Supervisor',
    type: 'default',
    position: { x: 250, y: 50 },
    data: { label: '👨‍💼 Supervisor' },
    style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px' },
  },
  {
    id: 'Researcher',
    type: 'default',
    position: { x: 100, y: 200 },
    data: { label: '🔍 Researcher' },
    style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px' },
  },
  {
    id: 'Writer',
    type: 'default',
    position: { x: 400, y: 200 },
    data: { label: '✍️ Writer' },
    style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px' },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'Supervisor', target: 'Researcher', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
  { id: 'e1-3', source: 'Supervisor', target: 'Writer', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

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

      // Style based on type
      let style = { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px' };
      if (label.includes('Pinecone')) {
        style = { background: '#064e3b', color: '#34d399', border: '1px solid #059669', borderRadius: '8px', padding: '10px 20px' };
      } else if (label.includes('MCP')) {
        style = { background: '#4c1d95', color: '#c4b5fd', border: '1px solid #7c3aed', borderRadius: '8px', padding: '10px 20px' };
      }

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label },
        style,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  // Update nodes visually based on the active node
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        // Simple string matching to highlight the active node
        const isActive = activeNode && node.data.label.toString().includes(activeNode);
        
        if (isActive) {
          return {
            ...node,
            style: {
              ...node.style,
              background: '#4f46e5',
              border: '2px solid #818cf8',
              boxShadow: '0 0 20px 0px rgba(99, 102, 241, 0.8)',
              transform: 'scale(1.1)',
            },
          };
        }
        
        // Reset non-active nodes to default
        let defaultStyle = { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px' };
        if (node.data.label.toString().includes('Pinecone')) {
          defaultStyle = { background: '#064e3b', color: '#34d399', border: '1px solid #059669', borderRadius: '8px', padding: '10px 20px' };
        } else if (node.data.label.toString().includes('MCP')) {
          defaultStyle = { background: '#4c1d95', color: '#c4b5fd', border: '1px solid #7c3aed', borderRadius: '8px', padding: '10px 20px' };
        }

        return {
          ...node,
          style: {
            ...defaultStyle,
            opacity: activeNode ? 0.6 : 1,
          },
        };
      })
    );
  }, [activeNode, setNodes]);

  return (
    <div className="flex w-full h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        colorMode="dark"
        className="bg-transparent pr-64" // Add right padding so it doesn't overlap sidebar
      >
        <Background gap={16} color="#334155" />
        <Controls position="bottom-left" />
      </ReactFlow>
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
