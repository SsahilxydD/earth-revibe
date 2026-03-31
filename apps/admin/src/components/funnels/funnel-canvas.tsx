'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Node,
  type Edge,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus } from 'lucide-react';
import { FunnelNode } from './funnel-node';
import { FunnelEdge } from './funnel-edge';
import { NodePicker } from './node-picker';
import { useFunnelStore, type FunnelNodeData, type FunnelStepType } from '@/stores/funnel-store';

const nodeTypes = { funnelNode: FunnelNode };
const edgeTypes = { funnelEdge: FunnelEdge };

const defaultEdgeOptions = {
  type: 'funnelEdge',
  animated: true,
};

export function FunnelCanvas() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    addNode,
    addEdge: addStoreEdge,
    setSelectedNodeId,
    isEditMode,
  } = useFunnelStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [showNodePicker, setShowNodePicker] = useState(false);

  // Sync local state back to store on changes
  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Defer store sync to avoid state conflicts
      requestAnimationFrame(() => {
        setStoreNodes(
          changes.reduce(
            (acc, change) => {
              if (change.type === 'remove') {
                return acc.filter((n) => n.id !== change.id);
              }
              return acc;
            },
            [...storeNodes]
          )
        );
      });
    },
    [onNodesChange, setStoreNodes, storeNodes]
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      const newEdge: Edge = {
        ...params,
        id: `edge_${params.source}_${params.target}`,
        type: 'funnelEdge',
        animated: true,
      };
      setEdges((eds) => addEdge(newEdge, eds));
      addStoreEdge(newEdge);
    },
    [setEdges, addStoreEdge]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<FunnelNodeData>) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleAddNode = useCallback(
    (type: FunnelStepType) => {
      addNode(type);
      // Sync the new node to local state
      requestAnimationFrame(() => {
        const updatedNodes = useFunnelStore.getState().nodes;
        setNodes(updatedNodes);
      });
    },
    [addNode, setNodes]
  );

  // Sync store nodes → local React Flow state when store changes externally
  // (e.g., when analytics data updates node userCount/conversionRate, or when nodes are added/removed)
  const prevStoreRef = useRef(storeNodes);
  useEffect(() => {
    if (prevStoreRef.current !== storeNodes) {
      prevStoreRef.current = storeNodes;
      setNodes(storeNodes);
    }
  }, [storeNodes, setNodes]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isEditMode ? handleNodesChange : undefined}
        onEdgesChange={isEditMode ? handleEdgesChange : undefined}
        onConnect={isEditMode ? onConnect : undefined}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-[#0a0a1a]"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls className="!bg-[#1a1a2e] !border-white/10 !rounded-lg [&>button]:!bg-[#1a1a2e] [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!bg-white/10" />
        <MiniMap
          className="!bg-[#12122a] !border-white/10 !rounded-lg"
          nodeColor={(n) => {
            const data = n.data as FunnelNodeData;
            return data.color || '#6366f1';
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>

      {/* Add Node button */}
      {isEditMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => setShowNodePicker(true)}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40"
          >
            <Plus size={16} />
            Add Step
          </button>
        </div>
      )}

      {/* Status bar */}
      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3 rounded-lg bg-[#1a1a2e]/90 border border-white/10 px-4 py-2 text-xs text-white/50 backdrop-blur-sm">
        <span>{nodes.length} NODES</span>
        <span className="text-white/20">•</span>
        <span>{edges.length} CONNECTIONS</span>
      </div>

      {/* Node picker popup */}
      <NodePicker
        isOpen={showNodePicker}
        onClose={() => setShowNodePicker(false)}
        onSelect={handleAddNode}
      />
    </div>
  );
}
