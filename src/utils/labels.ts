import type { FunnelNode } from "../types";

export function getNextUpsellLabel(nodes: FunnelNode[]): string {
  const count = nodes.filter((n) => n.data?.nodeType === "upsell").length;
  return `Upsell ${count + 1}`;
}

export function getNextDownsellLabel(nodes: FunnelNode[]): string {
  const count = nodes.filter((n) => n.data?.nodeType === "downsell").length;
  return `Downsell ${count + 1}`;
}
