# Cartpanda — Funnel Builder

A small drag-and-drop funnel builder for the Cartpanda front-end practical test. You design funnels visually (no real pages, no auth). Drag nodes from the palette onto the canvas, connect them, and export/import as JSON.

---

## Setup — How to run it

**Prerequisites:** Node.js (v18 or so is fine).

```bash
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser. No login, no env vars.

**Production build:**

```bash
npm run build
npm run preview
```

`preview` serves the built app so you can test it locally.

---

## What you can do

- **Canvas:** Pan around, zoom, grid in the background, mini-map. Nodes are draggable.
- **Nodes:** Sales Page, Order Page, Upsell, Downsell, Thank You. Each shows a title, icon, and button label.
- **Palette:** Left sidebar. Drag a node type onto the canvas to add it. Upsell/Downsell labels auto-increment (Upsell 1, Upsell 2, …).
- **Connections:** Drag from a node’s right handle to another node’s left handle. Arrows show direction.
- **Rules:** Thank You has no outgoing connection. Sales Page should have exactly one; we show a warning if not. We also warn about orphan nodes (no connections).
- **Persistence:** Funnel is auto-saved to `localStorage`. Use **Export JSON** / **Import JSON** in the header to backup or restore.
- **Undo / Redo:** Header buttons and Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y). History is capped at 50 steps.
- **Delete:** Select a node or edge (click it), then click **Delete** in the header or press Backspace. Deleting a node removes its connections too.

---

## Architecture — How it’s built

**Stack:** React 18, TypeScript, Vite, Tailwind, React Flow.

**Why React Flow:** We needed a canvas where nodes can be dragged, panned, and connected. React Flow gives us that out of the box (nodes, edges, handles, pan, zoom). We use one custom node type and pass different `nodeType` in data (sales, order, upsell, downsell, thankYou) so we don’t repeat component code.

**State:** Nodes and edges live in React state (`useNodesState` / `useEdgesState` from React Flow). On every change we write to `localStorage` so the funnel survives a refresh. Export/Import just serialize/parse that same shape to JSON.

**Where things live:**

- **`src/types.ts`** — Funnel node/edge types and the config (labels, icons, button text per type).
- **`src/nodes/FunnelNode.tsx`** — The single node component; it reads `data.nodeType` to style and show the right icon/label.
- **`src/components/Palette.tsx`** — Sidebar with draggable node types. Drag sets `application/reactflow-node-type` so the canvas knows what to create.
- **`src/components/FunnelBuilder.tsx`** — Main screen: React Flow canvas, drop handler (we use `onInit` to get the flow instance and `screenToFlowPosition` so drops land in the right place), undo/redo, delete, validation banner, Export/Import.
- **`src/utils/storage.ts`** — Load/save from `localStorage`, export/import JSON.
- **`src/utils/funnelRules.ts`** — Helpers to check “Sales Page has one outgoing edge”, “Thank You has none”, “orphan nodes”.
- **`src/utils/labels.ts`** — Next “Upsell N” / “Downsell N” label when you add from the palette.

**Edges:** We pass every edge through a small options object so they all get the same style and an arrow at the target (direction). That way connections clearly show flow.

**Undo/redo:** We keep a history stack of `{ nodes, edges }` snapshots. We push before add node, add edge, drag end, and delete. Undo pops and restores; redo uses a separate “future” stack. Import clears both stacks.

---

## Accessibility notes

- **Structure:** The palette is `role="complementary"` with an `aria-label` so screen readers know it’s the node palette. Nodes and the validation/empty messages use `role="status"` / `aria-live` where it helps. Buttons have clear labels (e.g. “Undo”, “Delete selected nodes and edges”).
- **Keyboard:** You can tab to palette items and to header buttons. Undo/Redo work with Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y). Deleting is Backspace when something is selected, or the Delete button. Dragging from the palette and drawing connections are mouse/touch today; a proper “add node from palette via Enter/Space” and keyboard-driven connection flow would be a good next step.
- **Focus and contrast:** We use default focus rings and kept text/controls with sufficient contrast. No custom focus traps.
- **Scope:** This is a visual editor only (no real checkout pages, no auth). So we didn’t tackle things like form validation or full keyboard-only funnel creation.

---

## What I’d do next

- **Keyboard:** Add node from palette on Enter/Space; optional keyboard flow for creating connections.
- **Snap to grid:** Optional snap when moving nodes.
- **Validation panel:** A small panel that lists issues and maybe highlights the affected nodes.
- **Tests:** Unit tests for `funnelRules`, `labels`, and `storage`; integration tests for canvas add/connect/delete.

**Part 2** (dashboard architecture write-up) is in **[docs/dashboard-architecture.md](docs/dashboard-architecture.md)**.
