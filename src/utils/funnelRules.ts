import type { FunnelNode, FunnelEdge } from "../types";

export function getOutgoingCount(nodeId: string, edges: FunnelEdge[]): number {
  return edges.filter((e) => e.source === nodeId).length;
}

export function getIncomingCount(nodeId: string, edges: FunnelEdge[]): number {
  return edges.filter((e) => e.target === nodeId).length;
}

export function isSalesPageInvalid(
  nodeId: string,
  edges: FunnelEdge[]
): boolean {
  const out = getOutgoingCount(nodeId, edges);
  return out !== 1;
}

export function isThankYouInvalid(
  nodeId: string,
  edges: FunnelEdge[]
): boolean {
  return getOutgoingCount(nodeId, edges) > 0;
}

export function getOrphanNodeIds(
  nodes: FunnelNode[],
  edges: FunnelEdge[]
): string[] {
  return nodes
    .filter((n) => {
      const inCount = getIncomingCount(n.id, edges);
      const outCount = getOutgoingCount(n.id, edges);
      return inCount === 0 && outCount === 0;
    })
    .map((n) => n.id);
}
