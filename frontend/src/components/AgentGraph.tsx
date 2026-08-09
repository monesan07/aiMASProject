"use client";

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: 'Supervisor',
    type: 'default',
    position: { x: 250, y: 50 },
    data: { label: '👨‍💼 Supervisor (Orchestrator)' },
    style: { 
      background: '#1e293b', 
      color: '#f8fafc', 
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '10px 20px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    },
  },
  {
    id: 'Researcher',
    type: 'default',
    position: { x: 100, y: 200 },
    data: { label: '🔍 Researcher Agent' },
    style: { 
      background: '#1e293b', 
      color: '#f8fafc', 
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '10px 20px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    },
  },
  {
    id: 'Writer',
    type: 'default',
    position: { x: 400, y: 200 },
    data: { label: '✍️ Writer Agent' },
    style: { 
      background: '#1e293b', 
      color: '#f8fafc', 
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '10px 20px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    },
  },
  {
    id: 'Pinecone',
    type: 'output',
    position: { x: 100, y: 350 },
    data: { label: '🌲 Pinecone DB (RAG)' },
    style: { 
      background: '#064e3b', 
      color: '#34d399', 
      border: '1px solid #059669',
      borderRadius: '8px',
      padding: '10px 20px',
    },
  },
  {
    id: 'MCP',
    type: 'output',
    position: { x: 250, y: 350 },
    data: { label: '🔌 MCP Tools Server' },
    style: { 
      background: '#4c1d95', 
      color: '#c4b5fd', 
      border: '1px solid #7c3aed',
      borderRadius: '8px',
      padding: '10px 20px',
    },
  },
];

const initialEdges = [
  { 
    id: 'e1-2', source: 'Supervisor', target: 'Researcher', 
    animated: false,
    label: 'Delegates task',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
  },
  { 
    id: 'e2-1', source: 'Researcher', target: 'Supervisor', 
    animated: false,
    label: 'Returns data',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
  },
  { 
    id: 'e1-3', source: 'Supervisor', target: 'Writer', 
    animated: false,
    label: 'Requests draft',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
  },
  { 
    id: 'e3-1', source: 'Writer', target: 'Supervisor', 
    animated: false,
    label: 'Submits draft',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
  },
  { 
    id: 'e2-4', source: 'Researcher', target: 'Pinecone', 
    animated: true,
    label: 'Semantic Search',
    style: { stroke: '#10b981', strokeWidth: 2 },
  },
  { 
    id: 'e2-5', source: 'Researcher', target: 'MCP', 
    animated: true,
    label: 'Uses Tools',
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
  }
];

export default function AgentGraph({ activeNode }: { activeNode: string | null }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes visually based on the active node
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === activeNode) {
          return {
            ...node,
            style: {
              ...node.style,
              background: '#4f46e5', // indigo-600
              border: '2px solid #818cf8',
              boxShadow: '0 0 15px 0px rgba(99, 102, 241, 0.6)',
              transform: 'scale(1.05)',
              transition: 'all 0.3s ease',
            },
          };
        }
        
        // Reset non-active nodes to default but slightly dimmed if something is active
        const defaultStyle = initialNodes.find(n => n.id === node.id)?.style;
        return {
          ...node,
          style: {
            ...defaultStyle,
            opacity: activeNode ? 0.7 : 1,
            transition: 'all 0.3s ease',
          },
        };
      })
    );

    // Animate edges connecting to/from the active node
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source === activeNode || edge.target === activeNode) {
          return { ...edge, animated: true, style: { ...edge.style, stroke: '#818cf8', strokeWidth: 3 } };
        }
        // Keep DB connections animated always, others static
        const isDBEdge = edge.id === 'e2-4' || edge.id === 'e2-5';
        return { 
          ...edge, 
          animated: isDBEdge, 
          style: { ...edge.style, stroke: isDBEdge ? edge.style?.stroke : '#64748b', strokeWidth: 2 } 
        };
      })
    );
  }, [activeNode, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-transparent">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="bg-transparent"
        colorMode="dark"
      >
        <Background gap={16} color="#334155" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
