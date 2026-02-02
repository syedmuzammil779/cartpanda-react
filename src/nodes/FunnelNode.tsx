import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FunnelNodeData, FunnelNodeType } from "../types";
import { NODE_TYPES_CONFIG } from "../types";

const typeColors: Record<FunnelNodeType, string> = {
  sales: "border-indigo-500 bg-indigo-50",
  order: "border-blue-500 bg-blue-50",
  upsell: "border-emerald-500 bg-emerald-50",
  downsell: "border-amber-500 bg-amber-50",
  thankYou: "border-green-500 bg-green-50",
};

function FunnelNodeComponent({ data, selected }: NodeProps<FunnelNodeData>) {
  const config = NODE_TYPES_CONFIG[data.nodeType];
  const colors = typeColors[data.nodeType];
  const isThankYou = data.nodeType === "thankYou";

  return (
    <div
      className={`
        min-w-[160px] rounded-lg border-2 px-3 py-2 shadow-sm
        ${colors}
        ${selected ? "ring-2 ring-indigo-400 ring-offset-1" : ""}
      `}
      role="article"
      aria-label={`Funnel node: ${data.label}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!border-2 !border-white"
      />
      {!isThankYou && (
        <Handle
          type="source"
          position={Position.Right}
          className="!border-2 !border-white"
        />
      )}
      <div className="flex items-center gap-2 text-lg" aria-hidden="true">
        {config.icon}
      </div>
      <div className="font-semibold text-gray-800">{data.label}</div>
      <div className="mt-1 rounded bg-white/70 px-2 py-1 text-sm text-gray-600">
        {data.buttonLabel}
      </div>
    </div>
  );
}

export const FunnelNode = memo(FunnelNodeComponent);
