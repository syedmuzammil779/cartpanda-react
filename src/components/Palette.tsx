import type { FunnelNodeType } from "../types";
import { NODE_TYPES_CONFIG } from "../types";

const NODE_TYPES: FunnelNodeType[] = [
  "sales",
  "order",
  "upsell",
  "downsell",
  "thankYou",
];

interface PaletteProps {
  onDragStart: (nodeType: FunnelNodeType) => void;
}

export function Palette({ onDragStart }: PaletteProps) {
  return (
    <aside
      className="flex w-52 flex-col border-r border-gray-200 bg-gray-50 p-3"
      role="complementary"
      aria-label="Node palette - drag nodes onto the canvas"
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Palette
      </h2>
      <div className="flex flex-col gap-2">
        {NODE_TYPES.map((nodeType) => {
          const config = NODE_TYPES_CONFIG[nodeType];
          return (
            <div
              key={nodeType}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/reactflow-node-type",
                  nodeType
                );
                e.dataTransfer.effectAllowed = "move";
                onDragStart(nodeType);
              }}
              className="flex cursor-grab items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:border-indigo-300 hover:shadow active:cursor-grabbing"
              role="button"
              tabIndex={0}
              aria-label={`Add ${config.label} to canvas`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.focus();
                }
              }}
            >
              <span className="text-xl" aria-hidden="true">
                {config.icon}
              </span>
              <span className="font-medium text-gray-800">{config.label}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
