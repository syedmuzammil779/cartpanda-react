import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  getConnectedEdges,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type OnConnect,
  type ReactFlowInstance,
  type NodeChange,
  type EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { FunnelNode } from "../nodes";
import type { FunnelNodeType, FunnelNodeData, FunnelState } from "../types";
import { NODE_TYPES_CONFIG } from "../types";
import {
  loadFunnel,
  saveFunnel,
  exportFunnelJSON,
  importFunnelJSON,
} from "../utils/storage";
import { getNextUpsellLabel, getNextDownsellLabel } from "../utils/labels";
import {
  isSalesPageInvalid,
  isThankYouInvalid,
  getOrphanNodeIds,
} from "../utils/funnelRules";
import { Palette } from "./Palette";

const nodeTypes = { funnel: FunnelNode };

const edgeOptionsWithArrow = {
  type: "smoothstep" as const,
  animated: false,
  markerEnd: {
    type: MarkerType.ArrowClosed as const,
    width: 16,
    height: 16,
    color: "#555",
  },
  style: { stroke: "#555", strokeWidth: 2 },
};

const MAX_HISTORY = 50;

function cloneState(state: FunnelState): FunnelState {
  return JSON.parse(JSON.stringify(state));
}

function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 0010.595 18h4.811a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function FunnelBuilder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const flowInstance = useRef<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<FunnelNodeData>(
    []
  );
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState([]);

  const historyRef = useRef<FunnelState[]>([]);
  const futureRef = useRef<FunnelState[]>([]);
  const stateAtDragStartRef = useRef<FunnelState | null>(null);

  const [undoRedoCounts, setUndoRedoCounts] = useState({
    history: 0,
    future: 0,
  });

  const pushHistory = useCallback((n: typeof nodes, e: typeof edges) => {
    historyRef.current.push(cloneState({ nodes: n, edges: e }));
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    futureRef.current = [];
    setUndoRedoCounts({
      history: historyRef.current.length,
      future: 0,
    });
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(cloneState({ nodes, edges }));
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setUndoRedoCounts({
      history: historyRef.current.length,
      future: futureRef.current.length,
    });
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(cloneState({ nodes, edges }));
    setNodes(next.nodes);
    setEdges(next.edges);
    setUndoRedoCounts({
      history: historyRef.current.length,
      future: futureRef.current.length,
    });
  }, [nodes, edges, setNodes, setEdges]);

  const canUndo = undoRedoCounts.history > 0;
  const canRedo = undoRedoCounts.future > 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const hasRemove = changes.some((c) => c.type === "remove");
      if (hasRemove) pushHistory(nodes, edges);
      onNodesChangeBase(changes);
    },
    [nodes, edges, pushHistory, onNodesChangeBase]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const hasRemove = changes.some((c) => c.type === "remove");
      if (hasRemove) pushHistory(nodes, edges);
      onEdgesChangeBase(changes);
    },
    [nodes, edges, pushHistory, onEdgesChangeBase]
  );

  useEffect(() => {
    const saved = loadFunnel();
    if (saved?.nodes?.length) {
      setNodes(saved.nodes);
      setEdges(saved.edges);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    saveFunnel({ nodes, edges });
  }, [nodes, edges]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      pushHistory(nodes, edges);
      setEdges((prev) => addEdge(params, prev));
    },
    [nodes, edges, pushHistory, setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData(
        "application/reactflow-node-type"
      ) as FunnelNodeType | "";
      if (!nodeType || !NODE_TYPES_CONFIG[nodeType]) return;
      if (!flowInstance.current) return;
      pushHistory(nodes, edges);
      const position = flowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const config = NODE_TYPES_CONFIG[nodeType];
      const label =
        nodeType === "upsell"
          ? getNextUpsellLabel(nodes)
          : nodeType === "downsell"
          ? getNextDownsellLabel(nodes)
          : config.label;
      const newNode: Node<FunnelNodeData> = {
        id: generateId(),
        type: "funnel",
        position,
        data: {
          label,
          nodeType,
          buttonLabel: config.buttonLabel,
        },
      };
      setNodes((prev) => [...prev, newNode]);
    },
    [nodes, setNodes, pushHistory]
  );

  const onNodeDragStart = useCallback(() => {
    stateAtDragStartRef.current = cloneState({ nodes, edges });
  }, [nodes, edges]);

  const onNodeDragStop = useCallback(() => {
    const snap = stateAtDragStartRef.current;
    if (snap) {
      pushHistory(snap.nodes, snap.edges);
      stateAtDragStartRef.current = null;
    }
  }, [pushHistory]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onExport = useCallback(() => {
    const json = exportFunnelJSON({ nodes, edges });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "funnel.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const onImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const state = importFunnelJSON(text);
        if (state) {
          historyRef.current = [];
          futureRef.current = [];
          setUndoRedoCounts({ history: 0, future: 0 });
          setNodes(state.nodes);
          setEdges(state.edges);
        } else {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges]);

  const selectedNodeIds = new Set(
    nodes.filter((n) => n.selected).map((n) => n.id)
  );
  const selectedEdgeIds = new Set(
    edges.filter((e) => e.selected).map((e) => e.id)
  );
  const hasSelection = selectedNodeIds.size > 0 || selectedEdgeIds.size > 0;

  const onDelete = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    pushHistory(nodes, edges);
    const edgesToRemoveIds = new Set(selectedEdges.map((e) => e.id));
    getConnectedEdges(selectedNodes, edges).forEach((e) =>
      edgesToRemoveIds.add(e.id)
    );
    setNodes((prev) => prev.filter((n) => !n.selected));
    setEdges((prev) => prev.filter((e) => !edgesToRemoveIds.has(e.id)));
  }, [nodes, edges, pushHistory, setNodes, setEdges]);

  const salesInvalid = nodes
    .filter((n) => n.data?.nodeType === "sales")
    .some((n) => isSalesPageInvalid(n.id, edges));
  const thankYouInvalid = nodes
    .filter((n) => n.data?.nodeType === "thankYou")
    .some((n) => isThankYouInvalid(n.id, edges));
  const orphanIds = getOrphanNodeIds(nodes, edges);
  const hasValidationIssues =
    salesInvalid || thankYouInvalid || orphanIds.length > 0;

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">
            Funnel Builder
          </h1>
          <p className="text-xs text-gray-500">
            Select a node or edge, then click Delete or press Backspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
            aria-label="Redo"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!hasSelection}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Delete selected (Backspace)"
            aria-label="Delete selected nodes and edges"
          >
            <span className="inline-flex items-center gap-1.5">
              <TrashIcon className="h-4 w-4" />
              Delete
            </span>
          </button>
          <button
            type="button"
            onClick={onExport}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={onImport}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Import JSON
          </button>
        </div>
      </header>
      {hasValidationIssues && (
        <div
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
          role="status"
          aria-live="polite"
        >
          {salesInvalid && (
            <p>
              Warning: Sales Page should have exactly one outgoing connection.
            </p>
          )}
          {thankYouInvalid && (
            <p>Warning: Thank You node should have no outgoing connections.</p>
          )}
          {orphanIds.length > 0 && (
            <p>
              This funnel has {orphanIds.length} orphan node(s) (no
              connections).
            </p>
          )}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Palette onDragStart={() => {}} />
        <div ref={reactFlowWrapper} className="relative flex-1">
          {nodes.length === 0 && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-gray-100/80"
              role="status"
              aria-live="polite"
            >
              <p className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-4 text-gray-600 shadow-sm">
                Drag a node from the palette and drop it here to start building
                your funnel.
              </p>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges.map((e) => ({ ...edgeOptionsWithArrow, ...e }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onInit={(inst) => {
              flowInstance.current = inst;
            }}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={edgeOptionsWithArrow}
            defaultMarkerColor="#555"
            deleteKeyCode="Backspace"
            minZoom={0.2}
            maxZoom={2}
          >
            <Background gap={16} size={1} className="bg-gray-100" />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const t = (n.data as FunnelNodeData)?.nodeType;
                if (t === "sales") return "#6366f1";
                if (t === "order") return "#3b82f6";
                if (t === "upsell") return "#10b981";
                if (t === "downsell") return "#f59e0b";
                if (t === "thankYou") return "#22c55e";
                return "#94a3b8";
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
