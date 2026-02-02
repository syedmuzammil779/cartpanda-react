import type { Node, Edge } from "reactflow";

export type FunnelNodeType =
  | "sales"
  | "order"
  | "upsell"
  | "downsell"
  | "thankYou";

export interface FunnelNodeData {
  label: string;
  nodeType: FunnelNodeType;
  buttonLabel: string;
}

export type FunnelNode = Node<FunnelNodeData>;
export type FunnelEdge = Edge;

export interface FunnelState {
  nodes: FunnelNode[];
  edges: FunnelEdge[];
}

export const NODE_TYPES_CONFIG: Record<
  FunnelNodeType,
  { label: string; buttonLabel: string; icon: string }
> = {
  sales: { label: "Sales Page", buttonLabel: "Buy Now", icon: "🛒" },
  order: { label: "Order Page", buttonLabel: "Checkout", icon: "📋" },
  upsell: { label: "Upsell", buttonLabel: "Add to Order", icon: "⬆️" },
  downsell: { label: "Downsell", buttonLabel: "Skip", icon: "⬇️" },
  thankYou: { label: "Thank You", buttonLabel: "Done", icon: "✅" },
};

export const STORAGE_KEY = "cart-panda-funnel";
