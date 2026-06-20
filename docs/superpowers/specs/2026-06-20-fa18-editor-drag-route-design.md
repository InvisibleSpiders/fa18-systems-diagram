# F/A-18 Schematic — Editor, Drag-and-Drop, Auto-Routing

**Date:** 2026-06-20
**Status:** Approved design, pre-implementation
**Builds on:** `2026-06-20-fa18-ecs-fuel-design.md`

## Purpose

Add an in-app editor to the F/A-18A/B ECS + Fuel schematic so the user can clean up
and organize the diagram and correct the model directly in the browser: drag
components, rename and re-describe them, add/delete components, rewire connections,
edit per-mode behavior, and nudge silhouette location dots. Edits persist locally and
round-trip to the repo as JSON.

## Goals

- Migrate the schematic canvas to **React Flow** (`@xyflow/react`) for draggable nodes
  and auto-routed edges that follow on drag.
- An **Edit mode** covering: rename, describe, change type, reposition (drag),
  add/delete components, rewire connections, inline per-mode state editing, and
  silhouette dot placement.
- A **Tidy** auto-layout button (dagre, left-to-right).
- Persistence: **live localStorage** plus **JSON export/import** (validated) and
  **reset to seed**.

## Non-Goals

- Backend/server persistence (localStorage + file export only).
- Multi-user or real-time collaboration.
- Changing the underlying domain model (`model.ts`) — only adding an editable working
  copy and an editor over it.
- Replacing the precise-airframe-trace follow-up (still user-owned).

## Architecture

### Source of truth vs working copy
- `src/data/ecs.ts`, `src/data/fuel.ts` remain the **seed defaults**.
- On first load the store seeds from these. Thereafter the **working copy** in the
  store (persisted to localStorage) is the source of truth for rendering.
- Export writes the working copy to JSON; Import replaces it (after validation);
  Reset restores from seed.

### Store (`src/store/systemsStore.ts`)
A `useReducer` store holding both systems' editable data:

```ts
interface SystemsState {
  ecs: SystemData;
  fuel: SystemData;
}

type EditAction =
  | { type: 'moveNode'; system: System; id: string; pos: [number, number] }
  | { type: 'renameNode'; system: System; id: string; label: string }
  | { type: 'describeNode'; system: System; id: string; description: string }
  | { type: 'setNodeType'; system: System; id: string; nodeType: NodeType }
  | { type: 'addNode'; system: System; node: SystemNode }
  | { type: 'deleteNode'; system: System; id: string }          // also drops connected edges
  | { type: 'addEdge'; system: System; edge: SystemEdge }
  | { type: 'deleteEdge'; system: System; id: string }
  | { type: 'setEdgeFluid'; system: System; id: string; fluid: FluidType }
  | { type: 'setNodeModeState'; system: System; id: string; mode: string; state: NodeState }
  | { type: 'setEdgeFlow'; system: System; id: string; mode: string; flow: EdgeFlow }
  | { type: 'setDot'; system: System; id: string; view: 'top' | 'sideL' | 'sideR'; pos: [number, number] | null }
  | { type: 'tidy'; system: System; positions: Record<string, [number, number]> }
  | { type: 'replaceAll'; state: SystemsState }                  // import
  | { type: 'reset' };                                           // back to seed
```

The reducer is pure; persistence and seeding live in `src/store/persistence.ts`.

### Persistence (`src/store/persistence.ts`)
- `STORAGE_KEY = 'fa18-systems-v1'`. `loadState()` returns parsed localStorage state or
  the seed if absent/unparseable/version-mismatch. `saveState(state)` writes JSON.
- `seedState()` builds `{ ecs: ECS, fuel: FUEL }` deep-cloned from `src/data`.
- `exportJson(state)` → triggers a download of `fa18-systems.json`.
- `importJson(file)` → parses, runs `validateSystem` on both systems against `MODES`;
  resolves to state on success, rejects with the error list otherwise.
- App persists on every state change via `useEffect`.

### React Flow integration (`src/flow/`)
- `toReactFlow.ts` — `toFlow(data, mode, editMode)` maps `SystemData` to RF `Node[]` /
  `Edge[]`; each RF node/edge carries its domain object in `data`. `fromFlowChange`
  helpers translate RF drag/connect/delete events back into `EditAction`s.
- `FlowNode.tsx` — custom node: per-type glyph (reuse glyph logic), label, mode-based
  dimming (`active`/`standby`/`inactive`), selection ring, connection handles (shown
  only in edit mode).
- `FlowEdge.tsx` — custom edge: fluid color, `smoothstep` path, animated dash + rate
  class when the current mode's flow is active; dim grey otherwise.
- `SchematicFlow.tsx` — the `<ReactFlow>` canvas. Props: `data`, `mode`, `editMode`,
  `selectedId`, and callbacks (`onSelect`, `onNodesChange`, `onConnect`, `onDelete`).
  `nodesDraggable={editMode}`, `nodesConnectable={editMode}`, `elementsSelectable`.
- `layout.ts` — `tidy(data)` runs dagre rank LR and returns `Record<id, [x,y]>`.

### Editing UI
- `Toolbar.tsx` — system tabs already exist in App; toolbar adds: **Edit** toggle,
  **Tidy**, **Export**, **Import** (file input), **Reset** (confirm).
- `EditorPanel.tsx` — shown in place of `InfoPanel` when `editMode`. For a selected
  node: label input, description textarea, type dropdown, delete button, and a
  per-mode state control bound to the currently selected mode
  (active/standby/inactive). For a selected edge: fluid dropdown, delete, and per-mode
  flow control (on/off + low/med/high). An **Add component** type palette creates a
  node at canvas center with empty mode states.
- `Silhouette.tsx` — in edit mode each view becomes a click/drag target that sets the
  selected node's dot for that view (`setDot`); clicking empty space with a modifier
  or a "clear dot" affordance removes it.

### App wiring
`App.tsx` owns `system`, `mode`, `selectedId`, `editMode`, and the store dispatch.
View mode preserves current read-only behavior. Edit mode unlocks drag/connect/editor.

## Data flow

1. Load → `loadState()` (seed or localStorage) into reducer.
2. Render → `toFlow(state[system], mode, editMode)` feeds `SchematicFlow`.
3. User drags/connects/deletes/edits → RF event or panel input → `dispatch(EditAction)`.
4. Reducer updates working copy → `useEffect` persists to localStorage → re-render.
5. Export/Import/Reset via persistence helpers.

## Error handling

- **Import validation:** invalid JSON or integrity errors → reject, show the error list,
  leave current state untouched.
- **Delete node:** cascade-delete connected edges so no dangling references.
- **Add edge:** requires a fluid; new edge defaults to inactive flow in every mode.
- **Add node:** requires a type; default label `New <type>`; mode states default
  inactive; no silhouette dots until placed.
- **localStorage unavailable/corrupt:** fall back to seed; never crash.
- **Version mismatch** on stored key: fall back to seed.

## Testing

- **Reducer:** one test per action (move, rename, describe, setType, addNode,
  deleteNode cascades edges, addEdge, deleteEdge, setEdgeFluid, setNodeModeState,
  setEdgeFlow, setDot, replaceAll, reset).
- **Persistence:** save→load round-trip equals input; export→import round-trip; import
  of integrity-invalid data is rejected; corrupt localStorage falls back to seed.
- **Mapping:** `toFlow` produces one RF node per node and one RF edge per edge; domain
  objects preserved.
- **Layout:** `tidy` returns a finite distinct position for every node; integrity still
  passes afterward.
- **Components:** Toolbar toggles edit mode; EditorPanel rename dispatches renameNode;
  FlowNode dims when inactive in the current mode; Add-component dispatches addNode.

## File structure (new / changed)

```
src/
  store/
    systemsStore.ts     # reducer + EditAction
    persistence.ts      # localStorage, export/import, seed
  flow/
    toReactFlow.ts      # SystemData <-> React Flow mapping
    FlowNode.tsx
    FlowEdge.tsx
    SchematicFlow.tsx   # <ReactFlow> canvas (replaces components/Schematic.tsx in App)
    layout.ts           # dagre tidy
  components/
    Toolbar.tsx         # edit toggle, tidy, export, import, reset
    EditorPanel.tsx     # edit selected node/edge + add palette
    InfoPanel.tsx       # unchanged (view mode)
    Silhouette.tsx      # extended: editable dots in edit mode
  App.tsx               # store, editMode, wiring
```

`Schematic.tsx` is retired from `App` once `SchematicFlow` is in (kept or deleted with
its test as the plan dictates).

Dependencies added: `@xyflow/react`, `dagre`, `@types/dagre`.

## Open items / future

- Precise airframe trace still pending (unchanged from prior spec).
- Possible later: edit connections' waypoints manually; undo/redo; multiple saved
  layouts.
