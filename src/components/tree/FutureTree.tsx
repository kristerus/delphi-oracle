"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import FutureNode from "./FutureNode";
import BranchEdge from "./BranchEdge";
import type { FutureTreeNode, FutureTreeEdge } from "@/lib/ai/types";
import { TreeContext } from "./tree-context";

const nodeTypes: NodeTypes = {
  futureNode: FutureNode as NodeTypes["futureNode"],
};

const edgeTypes = {
  branchEdge: BranchEdge,
} as const;

interface FutureTreeProps {
  nodes: FutureTreeNode[];
  edges: FutureTreeEdge[];
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  onExtend?: (nodeId: string) => Promise<void>;
}

function FutureTreeInner({
  nodes,
  edges,
  onNodeSelect,
  selectedNodeId,
  onExtend,
}: FutureTreeProps) {
  const { fitView } = useReactFlow();

  // Apply selected state to nodes
  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      onNodeSelect?.(node.id === selectedNodeId ? null : node.id);
    },
    [onNodeSelect, selectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <TreeContext.Provider value={{ onExtend }}>
    <div className="w-full h-full">
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "branchEdge",
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        elementsSelectable={true}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="oklch(30% 0.048 265 / 0.4)"
          className="opacity-60"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-text-muted text-sm">No nodes to display</p>
          </div>
        </div>
      )}
    </div>
    </TreeContext.Provider>
  );
}

export default function FutureTree(props: FutureTreeProps) {
  return (
    <ReactFlowProvider>
      <FutureTreeInner {...props} />
    </ReactFlowProvider>
  );
}
