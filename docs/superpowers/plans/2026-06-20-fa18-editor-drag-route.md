# F/A-18 Schematic Editor + Drag/Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-browser editor to the F/A-18A/B ECS + Fuel schematic — drag components, rename/describe, add/delete, rewire, edit per-mode behavior, nudge silhouette dots — on a React Flow canvas with auto-routed edges, persisted to localStorage with JSON export/import.

**Architecture:** `src/data/*.ts` become seed defaults. A `useReducer` store holds the editable working copy for both systems and persists to localStorage. The canvas migrates from hand-rolled SVG to React Flow (`@xyflow/react`) with custom node/edge renderers that preserve the glyph + fluid-color + per-mode animation behavior. A dagre "Tidy" button auto-lays-out. An EditorPanel + Toolbar drive editing.

**Tech Stack:** Existing Vite + React + TS + Vitest, plus `@xyflow/react`, `dagre`, `@types/dagre`.

**Branch:** `build/editor-drag-route` (already created off `build/fa18-systems`).

---

## File Structure

```
src/
  store/
    systemsStore.ts     # reducer + EditAction + initial state helper
    persistence.ts      # localStorage load/save, seed, export/import
  flow/
    toReactFlow.ts      # SystemData -> React Flow nodes/edges
    layout.ts           # dagre left-to-right tidy
    FlowNode.tsx        # custom node (glyph, label, mode dimming, handles)
    FlowEdge.tsx        # custom edge (fluid color, animated flow)
    SchematicFlow.tsx   # <ReactFlow> canvas
  components/
    Toolbar.tsx         # edit toggle, tidy, export, import, reset
    EditorPanel.tsx     # edit selected node/edge + add palette
    Silhouette.tsx      # MODIFY: editable dots in edit mode
  glyph.tsx             # EXTRACT shared glyph from components/Node.tsx
  App.tsx               # MODIFY: store, editMode, wiring
tests/
  store.test.ts
  persistence.test.ts
  flow.test.ts          # toReactFlow + layout
  editor.test.tsx       # Toolbar, EditorPanel, FlowNode
```

---

## Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install React Flow and dagre**

```bash
cd "C:/Users/ncobu/claude plugin/fa18-systems-diagram"
npm install @xyflow/react dagre
npm install -D @types/dagre
```

- [ ] **Step 2: Verify install**

Run: `npm ls @xyflow/react dagre`
Expected: both listed with versions, no error.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xyflow/react and dagre"
```

---

## Task 2: Extract shared glyph

`FlowNode` and the existing `Node` both need the per-type SVG glyph. Extract it so both reuse one source (DRY).

**Files:**
- Create: `src/glyph.tsx`
- Modify: `src/components/Node.tsx`

- [ ] **Step 1: Create `src/glyph.tsx`**

```tsx
import type { NodeType } from './model';

// Distinct simple glyph per type, drawn around the origin.
export function Glyph({ type }: { type: NodeType }) {
  switch (type) {
    case 'tank': return <rect x={-22} y={-14} width={44} height={28} rx={6} />;
    case 'engine': return <rect x={-26} y={-12} width={52} height={24} rx={3} />;
    case 'pump': return <circle r={14} />;
    case 'valve': return <polygon points="-14,-12 14,-12 -14,12 14,12" />;
    case 'heat-exchanger': return <rect x={-20} y={-16} width={40} height={32} />;
    case 'acm': return <circle r={16} />;
    case 'compressor': return <polygon points="-16,-14 16,-8 16,8 -16,14" />;
    case 'regulator': return <polygon points="0,-16 16,12 -16,12" />;
    case 'sensor': return <circle r={9} />;
    case 'probe': return <polygon points="-18,0 14,-6 14,6" />;
    case 'duct-junction': return <circle r={6} />;
    case 'lox-converter': return <rect x={-16} y={-18} width={32} height={36} rx={10} />;
    case 'receptacle': return <rect x={-12} y={-12} width={24} height={24} rx={3} />;
    case 'mast': return <polygon points="-6,-16 6,-16 0,16" />;
    default: return <circle r={12} />;
  }
}

export const NODE_TYPES: NodeType[] = [
  'valve', 'heat-exchanger', 'acm', 'compressor', 'tank', 'pump', 'regulator',
  'sensor', 'engine', 'probe', 'duct-junction', 'lox-converter', 'receptacle', 'mast',
];
```

- [ ] **Step 2: Update `src/components/Node.tsx` to import the shared glyph**

Replace the local `Glyph` function and its usage. The file becomes:

```tsx
import type { SystemNode } from '../model';
import { Glyph } from '../glyph';

interface Props {
  node: SystemNode;
  mode: string;
  selected: boolean;
  onSelect: () => void;
}

export function Node({ node, mode, selected, onSelect }: Props) {
  const state = node.modeStates[mode] ?? 'inactive';
  const cls = ['node', `node-${state}`, `type-${node.type}`, selected ? 'selected' : ''].filter(Boolean).join(' ');
  const [x, y] = node.pos;
  return (
    <g className={cls} transform={`translate(${x},${y})`} onClick={onSelect} data-node-id={node.id}>
      <Glyph type={node.type} />
      <text className="node-label" y={30} textAnchor="middle">{node.label}</text>
    </g>
  );
}
```

- [ ] **Step 3: Run existing tests**

Run: `npm test -- components`
Expected: PASS (existing Node tests still green).

- [ ] **Step 4: Commit**

```bash
git add src/glyph.tsx src/components/Node.tsx
git commit -m "refactor: extract shared Glyph and NODE_TYPES"
```

---

## Task 3: Store reducer (TDD)

**Files:**
- Create: `src/store/systemsStore.ts`, `tests/store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/store.test.ts
import { describe, it, expect } from 'vitest';
import { reducer, seedState } from '../src/store/systemsStore';
import type { SystemNode, SystemEdge } from '../src/model';

const baseNode = (id: string): SystemNode => ({
  id, label: id, type: 'valve', pos: [0, 0], silhouette: {}, description: '', modeStates: {},
});

function twoNodeEcs() {
  const s = seedState();
  s.ecs = {
    nodes: [baseNode('a'), baseNode('b')],
    edges: [{ id: 'e', from: 'a', to: 'b', fluid: 'fuel', waypoints: [], modeFlow: {} }],
  };
  return s;
}

describe('reducer', () => {
  it('moveNode updates position', () => {
    const s = reducer(twoNodeEcs(), { type: 'moveNode', system: 'ecs', id: 'a', pos: [10, 20] });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.pos).toEqual([10, 20]);
  });

  it('renameNode updates label', () => {
    const s = reducer(twoNodeEcs(), { type: 'renameNode', system: 'ecs', id: 'a', label: 'Alpha' });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.label).toBe('Alpha');
  });

  it('describeNode updates description', () => {
    const s = reducer(twoNodeEcs(), { type: 'describeNode', system: 'ecs', id: 'a', description: 'desc' });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.description).toBe('desc');
  });

  it('setNodeType updates type', () => {
    const s = reducer(twoNodeEcs(), { type: 'setNodeType', system: 'ecs', id: 'a', nodeType: 'tank' });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.type).toBe('tank');
  });

  it('addNode appends a node', () => {
    const s = reducer(twoNodeEcs(), { type: 'addNode', system: 'ecs', node: baseNode('c') });
    expect(s.ecs.nodes.map((n) => n.id)).toContain('c');
  });

  it('deleteNode removes the node and its edges', () => {
    const s = reducer(twoNodeEcs(), { type: 'deleteNode', system: 'ecs', id: 'a' });
    expect(s.ecs.nodes.map((n) => n.id)).not.toContain('a');
    expect(s.ecs.edges.find((e) => e.from === 'a' || e.to === 'a')).toBeUndefined();
  });

  it('addEdge appends an edge', () => {
    const edge: SystemEdge = { id: 'e2', from: 'b', to: 'a', fluid: 'fuel', waypoints: [], modeFlow: {} };
    const s = reducer(twoNodeEcs(), { type: 'addEdge', system: 'ecs', edge });
    expect(s.ecs.edges.map((e) => e.id)).toContain('e2');
  });

  it('deleteEdge removes the edge', () => {
    const s = reducer(twoNodeEcs(), { type: 'deleteEdge', system: 'ecs', id: 'e' });
    expect(s.ecs.edges.map((e) => e.id)).not.toContain('e');
  });

  it('setEdgeFluid updates fluid', () => {
    const s = reducer(twoNodeEcs(), { type: 'setEdgeFluid', system: 'ecs', id: 'e', fluid: 'ram-air' });
    expect(s.ecs.edges.find((e) => e.id === 'e')!.fluid).toBe('ram-air');
  });

  it('setNodeModeState sets one mode state', () => {
    const s = reducer(twoNodeEcs(), { type: 'setNodeModeState', system: 'ecs', id: 'a', mode: 'ecs-auto', state: 'active' });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.modeStates['ecs-auto']).toBe('active');
  });

  it('setEdgeFlow sets one mode flow', () => {
    const s = reducer(twoNodeEcs(), { type: 'setEdgeFlow', system: 'ecs', id: 'e', mode: 'ecs-auto', flow: { active: true, rate: 'high' } });
    expect(s.ecs.edges.find((e) => e.id === 'e')!.modeFlow['ecs-auto']).toEqual({ active: true, rate: 'high' });
  });

  it('setDot sets and clears a silhouette dot', () => {
    let s = reducer(twoNodeEcs(), { type: 'setDot', system: 'ecs', id: 'a', view: 'top', pos: [5, 6] });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.silhouette.top).toEqual([5, 6]);
    s = reducer(s, { type: 'setDot', system: 'ecs', id: 'a', view: 'top', pos: null });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.silhouette.top).toBeUndefined();
  });

  it('tidy applies positions', () => {
    const s = reducer(twoNodeEcs(), { type: 'tidy', system: 'ecs', positions: { a: [100, 200], b: [300, 400] } });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.pos).toEqual([100, 200]);
  });

  it('reset restores seed', () => {
    const dirty = reducer(seedState(), { type: 'renameNode', system: 'ecs', id: 'bleed-l', label: 'X' });
    const s = reducer(dirty, { type: 'reset' });
    expect(s.ecs.nodes.find((n) => n.id === 'bleed-l')!.label).not.toBe('X');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- store`
Expected: FAIL — cannot find `../src/store/systemsStore`.

- [ ] **Step 3: Write `src/store/systemsStore.ts`**

```ts
import type {
  System, SystemData, SystemNode, SystemEdge, NodeType, FluidType, NodeState, EdgeFlow,
} from '../model';
import { ECS } from '../data/ecs';
import { FUEL } from '../data/fuel';

export interface SystemsState {
  ecs: SystemData;
  fuel: SystemData;
}

export type EditAction =
  | { type: 'moveNode'; system: System; id: string; pos: [number, number] }
  | { type: 'renameNode'; system: System; id: string; label: string }
  | { type: 'describeNode'; system: System; id: string; description: string }
  | { type: 'setNodeType'; system: System; id: string; nodeType: NodeType }
  | { type: 'addNode'; system: System; node: SystemNode }
  | { type: 'deleteNode'; system: System; id: string }
  | { type: 'addEdge'; system: System; edge: SystemEdge }
  | { type: 'deleteEdge'; system: System; id: string }
  | { type: 'setEdgeFluid'; system: System; id: string; fluid: FluidType }
  | { type: 'setNodeModeState'; system: System; id: string; mode: string; state: NodeState }
  | { type: 'setEdgeFlow'; system: System; id: string; mode: string; flow: EdgeFlow }
  | { type: 'setDot'; system: System; id: string; view: 'top' | 'sideL' | 'sideR'; pos: [number, number] | null }
  | { type: 'tidy'; system: System; positions: Record<string, [number, number]> }
  | { type: 'replaceAll'; state: SystemsState }
  | { type: 'reset' };

export function seedState(): SystemsState {
  return clone({ ecs: ECS, fuel: FUEL });
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function mapNodes(data: SystemData, id: string, fn: (n: SystemNode) => SystemNode): SystemData {
  return { ...data, nodes: data.nodes.map((n) => (n.id === id ? fn(n) : n)) };
}
function mapEdges(data: SystemData, id: string, fn: (e: SystemEdge) => SystemEdge): SystemData {
  return { ...data, edges: data.edges.map((e) => (e.id === id ? fn(e) : e)) };
}

export function reducer(state: SystemsState, action: EditAction): SystemsState {
  if (action.type === 'reset') return seedState();
  if (action.type === 'replaceAll') return clone(action.state);

  const sys = action.system;
  const data = state[sys];
  let next: SystemData = data;

  switch (action.type) {
    case 'moveNode':
      next = mapNodes(data, action.id, (n) => ({ ...n, pos: action.pos })); break;
    case 'renameNode':
      next = mapNodes(data, action.id, (n) => ({ ...n, label: action.label })); break;
    case 'describeNode':
      next = mapNodes(data, action.id, (n) => ({ ...n, description: action.description })); break;
    case 'setNodeType':
      next = mapNodes(data, action.id, (n) => ({ ...n, type: action.nodeType })); break;
    case 'addNode':
      next = { ...data, nodes: [...data.nodes, action.node] }; break;
    case 'deleteNode':
      next = {
        nodes: data.nodes.filter((n) => n.id !== action.id),
        edges: data.edges.filter((e) => e.from !== action.id && e.to !== action.id),
      };
      break;
    case 'addEdge':
      next = { ...data, edges: [...data.edges, action.edge] }; break;
    case 'deleteEdge':
      next = { ...data, edges: data.edges.filter((e) => e.id !== action.id) }; break;
    case 'setEdgeFluid':
      next = mapEdges(data, action.id, (e) => ({ ...e, fluid: action.fluid })); break;
    case 'setNodeModeState':
      next = mapNodes(data, action.id, (n) => ({ ...n, modeStates: { ...n.modeStates, [action.mode]: action.state } })); break;
    case 'setEdgeFlow':
      next = mapEdges(data, action.id, (e) => ({ ...e, modeFlow: { ...e.modeFlow, [action.mode]: action.flow } })); break;
    case 'setDot':
      next = mapNodes(data, action.id, (n) => {
        const silhouette = { ...n.silhouette };
        if (action.pos === null) delete silhouette[action.view];
        else silhouette[action.view] = action.pos;
        return { ...n, silhouette };
      });
      break;
    case 'tidy':
      next = {
        ...data,
        nodes: data.nodes.map((n) => (action.positions[n.id] ? { ...n, pos: action.positions[n.id] } : n)),
      };
      break;
  }

  return { ...state, [sys]: next };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- store`
Expected: PASS (all reducer tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/systemsStore.ts tests/store.test.ts
git commit -m "feat: editable systems store reducer with full edit actions"
```

---

## Task 4: Persistence (TDD)

**Files:**
- Create: `src/store/persistence.ts`, `tests/persistence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, parseImport, STORAGE_KEY } from '../src/store/persistence';
import { seedState } from '../src/store/systemsStore';
import { MODES } from '../src/data/modes';

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('loadState returns seed when storage empty', () => {
    const s = loadState();
    expect(s.ecs.nodes.length).toBeGreaterThan(0);
  });

  it('save then load round-trips', () => {
    const s = seedState();
    s.ecs.nodes[0].label = 'Edited';
    saveState(s);
    expect(loadState().ecs.nodes[0].label).toBe('Edited');
  });

  it('falls back to seed on corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadState().ecs.nodes.length).toBeGreaterThan(0);
  });

  it('parseImport accepts valid state', () => {
    const json = JSON.stringify({ version: 1, state: seedState() });
    const result = parseImport(json, MODES.map((m) => m.id));
    expect(result.ok).toBe(true);
  });

  it('parseImport rejects integrity-invalid state', () => {
    const bad = seedState();
    bad.ecs.edges[0].to = 'ghost-node';
    const json = JSON.stringify({ version: 1, state: bad });
    const result = parseImport(json, MODES.map((m) => m.id));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/ghost-node/);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- persistence`
Expected: FAIL — cannot find `../src/store/persistence`.

- [ ] **Step 3: Write `src/store/persistence.ts`**

```ts
import type { SystemsState } from './systemsStore';
import { seedState } from './systemsStore';
import { validateSystem } from '../data/integrity';

export const STORAGE_KEY = 'fa18-systems-v1';
const VERSION = 1;

export function loadState(): SystemsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION || !parsed.state?.ecs || !parsed.state?.fuel) return seedState();
    return parsed.state as SystemsState;
  } catch {
    return seedState();
  }
}

export function saveState(state: SystemsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, state }));
  } catch {
    /* storage unavailable — ignore */
  }
}

export type ImportResult =
  | { ok: true; state: SystemsState }
  | { ok: false; errors: string[] };

export function parseImport(json: string, modeIds: string[]): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['File is not valid JSON.'] };
  }
  const state = (parsed as { state?: SystemsState })?.state ?? (parsed as SystemsState);
  if (!state?.ecs || !state?.fuel) return { ok: false, errors: ['Missing ecs/fuel data.'] };
  const errors = [
    ...validateSystem(state.ecs, modeIds).map((e) => `ECS: ${e}`),
    ...validateSystem(state.fuel, modeIds).map((e) => `Fuel: ${e}`),
  ];
  return errors.length ? { ok: false, errors } : { ok: true, state };
}

export function downloadJson(state: SystemsState, filename = 'fa18-systems.json'): void {
  const blob = new Blob([JSON.stringify({ version: VERSION, state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- persistence`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/persistence.ts tests/persistence.test.ts
git commit -m "feat: localStorage persistence with validated import/export"
```

---

## Task 5: React Flow mapping + dagre layout (TDD)

**Files:**
- Create: `src/flow/toReactFlow.ts`, `src/flow/layout.ts`, `tests/flow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/flow.test.ts
import { describe, it, expect } from 'vitest';
import { toFlow } from '../src/flow/toReactFlow';
import { tidy } from '../src/flow/layout';
import type { SystemData } from '../src/model';

const data: SystemData = {
  nodes: [
    { id: 'a', label: 'A', type: 'tank', pos: [0, 0], silhouette: {}, description: '', modeStates: { 'ecs-auto': 'active' } },
    { id: 'b', label: 'B', type: 'engine', pos: [100, 0], silhouette: {}, description: '', modeStates: { 'ecs-auto': 'inactive' } },
  ],
  edges: [{ id: 'e', from: 'a', to: 'b', fluid: 'fuel', waypoints: [], modeFlow: { 'ecs-auto': { active: true } } }],
};

describe('toFlow', () => {
  it('maps one RF node per node and one RF edge per edge', () => {
    const { nodes, edges } = toFlow(data, 'ecs-auto', false);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[0].data.node.id).toBe('a');
    expect(edges[0].data.edge.id).toBe('e');
  });

  it('passes the current mode into node/edge data', () => {
    const { nodes, edges } = toFlow(data, 'ecs-auto', true);
    expect(nodes[0].data.mode).toBe('ecs-auto');
    expect(edges[0].data.mode).toBe('ecs-auto');
    expect(nodes[0].draggable).toBe(true);
  });
});

describe('tidy', () => {
  it('returns a finite distinct position for every node', () => {
    const pos = tidy(data);
    expect(Object.keys(pos).sort()).toEqual(['a', 'b']);
    for (const id of ['a', 'b']) {
      expect(Number.isFinite(pos[id][0])).toBe(true);
      expect(Number.isFinite(pos[id][1])).toBe(true);
    }
    expect(pos.a).not.toEqual(pos.b);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- flow`
Expected: FAIL — cannot find `../src/flow/toReactFlow`.

- [ ] **Step 3: Write `src/flow/toReactFlow.ts`**

```ts
import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react';
import type { SystemData, SystemNode, SystemEdge } from '../model';

export interface FlowNodeData extends Record<string, unknown> {
  node: SystemNode;
  mode: string;
  editMode: boolean;
}
export interface FlowEdgeData extends Record<string, unknown> {
  edge: SystemEdge;
  mode: string;
}

export function toFlow(data: SystemData, mode: string, editMode: boolean) {
  const nodes: RFNode<FlowNodeData>[] = data.nodes.map((n) => ({
    id: n.id,
    type: 'systemNode',
    position: { x: n.pos[0], y: n.pos[1] },
    data: { node: n, mode, editMode },
    draggable: editMode,
    selectable: true,
  }));
  const edges: RFEdge<FlowEdgeData>[] = data.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    type: 'systemEdge',
    data: { edge: e, mode },
    selectable: true,
  }));
  return { nodes, edges };
}
```

- [ ] **Step 4: Write `src/flow/layout.ts`**

```ts
import dagre from 'dagre';
import type { SystemData } from '../model';

// Left-to-right ranked layout. Returns a position per node id.
export function tidy(data: SystemData): Record<string, [number, number]> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 90, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of data.nodes) g.setNode(n.id, { width: 90, height: 60 });
  for (const e of data.edges) g.setEdge(e.from, e.to);
  dagre.layout(g);
  const out: Record<string, [number, number]> = {};
  for (const n of data.nodes) {
    const { x, y } = g.node(n.id);
    out[n.id] = [Math.round(x), Math.round(y)];
  }
  return out;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- flow`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/flow/toReactFlow.ts src/flow/layout.ts tests/flow.test.ts
git commit -m "feat: SystemData->React Flow mapping and dagre tidy layout"
```

---

## Task 6: FlowNode + FlowEdge custom renderers

**Files:**
- Create: `src/flow/FlowNode.tsx`, `src/flow/FlowEdge.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write `src/flow/FlowNode.tsx`**

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Glyph } from '../glyph';
import type { FlowNodeData } from './toReactFlow';

export function FlowNode({ data, selected }: NodeProps<FlowNodeData>) {
  const { node, mode, editMode } = data;
  const state = node.modeStates[mode] ?? 'inactive';
  const cls = ['flow-node', `node-${state}`, `type-${node.type}`, selected ? 'selected' : ''].join(' ');
  return (
    <div className={cls} title={node.label}>
      {editMode && <Handle type="target" position={Position.Left} />}
      <svg width={64} height={48} viewBox="-32 -24 64 48" className="flow-node-glyph">
        <Glyph type={node.type} />
      </svg>
      <span className="flow-node-label">{node.label}</span>
      {editMode && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/flow/FlowEdge.tsx`**

```tsx
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { FlowEdgeData } from './toReactFlow';

export function FlowEdge(props: EdgeProps<FlowEdgeData>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props;
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const flow = data!.edge.modeFlow[data!.mode];
  const active = !!flow?.active;
  const cls = [
    'flow-edge', `fluid-${data!.edge.fluid}`,
    active ? `edge-active rate-${flow?.rate ?? 'med'}` : 'edge-inactive',
    selected ? 'selected' : '',
  ].filter(Boolean).join(' ');
  return <BaseEdge id={props.id} path={path} className={cls} />;
}
```

- [ ] **Step 3: Add styles to `src/styles.css`**

```css
/* React Flow custom node */
.flow-node { display: flex; flex-direction: column; align-items: center; pointer-events: all; }
.flow-node-glyph rect, .flow-node-glyph circle, .flow-node-glyph polygon { fill: var(--panel); stroke: var(--text); stroke-width: 2; }
.flow-node.node-active .flow-node-glyph rect,
.flow-node.node-active .flow-node-glyph circle,
.flow-node.node-active .flow-node-glyph polygon { stroke: #fff; fill: #243042; }
.flow-node.node-inactive { opacity: 0.35; }
.flow-node.node-standby .flow-node-glyph rect,
.flow-node.node-standby .flow-node-glyph circle,
.flow-node.node-standby .flow-node-glyph polygon { stroke-dasharray: 4 3; }
.flow-node.selected .flow-node-glyph rect,
.flow-node.selected .flow-node-glyph circle,
.flow-node.selected .flow-node-glyph polygon { stroke: var(--fluid-bleed-regulated); stroke-width: 3.5; }
.flow-node-label { font-size: 11px; color: var(--text); margin-top: 2px; white-space: nowrap; }

/* React Flow custom edge (path classes mirror the old .edge rules) */
.flow-edge { stroke-width: 3; fill: none; }
.flow-edge.edge-inactive { stroke: var(--dim); opacity: 0.4; }
.flow-edge.fluid-bleed-hot { stroke: var(--fluid-bleed-hot); }
.flow-edge.fluid-bleed-regulated { stroke: var(--fluid-bleed-regulated); }
.flow-edge.fluid-conditioned-air { stroke: var(--fluid-conditioned-air); }
.flow-edge.fluid-ram-air { stroke: var(--fluid-ram-air); }
.flow-edge.fluid-fuel { stroke: var(--fluid-fuel); }
.flow-edge.fluid-fuel-vapor { stroke: var(--fluid-fuel-vapor); stroke-dasharray: 6 4; }
.flow-edge.fluid-pao-coolant { stroke: var(--fluid-pao-coolant); }
.flow-edge.selected { stroke-width: 5; }
.flow-edge.edge-active { stroke-dasharray: 10 8; animation: flow 1s linear infinite; }
.flow-edge.edge-active.rate-low { animation-duration: 1.8s; }
.flow-edge.edge-active.rate-med { animation-duration: 1s; }
.flow-edge.edge-active.rate-high { animation-duration: 0.5s; }
```

> Note: the `@keyframes flow` rule already exists in `styles.css` from the original build — do not duplicate it.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/flow/FlowNode.tsx src/flow/FlowEdge.tsx src/styles.css
git commit -m "feat: custom React Flow node and edge renderers"
```

---

## Task 7: SchematicFlow canvas

**Files:**
- Create: `src/flow/SchematicFlow.tsx`
- Modify: `src/main.tsx` (import React Flow CSS)

- [ ] **Step 1: Import React Flow base CSS in `src/main.tsx`**

Add this import near the top, before `./styles.css`:

```tsx
import '@xyflow/react/dist/style.css';
```

- [ ] **Step 2: Write `src/flow/SchematicFlow.tsx`**

```tsx
import { useMemo } from 'react';
import {
  ReactFlow, Background, Controls,
  type NodeChange, type Connection, type EdgeChange,
} from '@xyflow/react';
import type { SystemData } from '../model';
import { toFlow } from './toReactFlow';
import { FlowNode } from './FlowNode';
import { FlowEdge } from './FlowEdge';

const nodeTypes = { systemNode: FlowNode };
const edgeTypes = { systemEdge: FlowEdge };

interface Props {
  data: SystemData;
  mode: string;
  editMode: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onNodeMove: (id: string, pos: [number, number]) => void;
  onConnect: (from: string, to: string) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

export function SchematicFlow(props: Props) {
  const { data, mode, editMode, selectedId, onSelect, onNodeMove, onConnect, onDeleteNode, onDeleteEdge } = props;
  const { nodes, edges } = useMemo(() => toFlow(data, mode, editMode), [data, mode, editMode]);

  const nodesWithSel = nodes.map((n) => ({ ...n, selected: n.id === selectedId }));
  const edgesWithSel = edges.map((e) => ({ ...e, selected: e.id === selectedId }));

  function handleNodesChange(changes: NodeChange[]) {
    for (const c of changes) {
      // Persist only on drag end (c.dragging === false) to avoid thrashing the store.
      if (c.type === 'position' && c.position && c.dragging === false) {
        onNodeMove(c.id, [Math.round(c.position.x), Math.round(c.position.y)]);
      }
      if (c.type === 'remove') onDeleteNode(c.id);
    }
  }
  function handleEdgesChange(changes: EdgeChange[]) {
    for (const c of changes) if (c.type === 'remove') onDeleteEdge(c.id);
  }
  function handleConnect(c: Connection) {
    if (c.source && c.target) onConnect(c.source, c.target);
  }

  return (
    <div className="flow-canvas">
      <ReactFlow
        nodes={nodesWithSel}
        edges={edgesWithSel}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={editMode}
        nodesConnectable={editMode}
        elementsSelectable
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, n) => onSelect(n.id)}
        onEdgeClick={(_, e) => onSelect(e.id)}
        onPaneClick={() => onSelect(null)}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 3: Add canvas style to `src/styles.css`**

```css
.flow-canvas { width: 100%; height: 640px; background: #0b0e13; border-radius: 8px; }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If `NodeChange`/`EdgeChange` generics complain, the code above uses the non-generic forms intentionally.)

- [ ] **Step 5: Commit**

```bash
git add src/flow/SchematicFlow.tsx src/main.tsx src/styles.css
git commit -m "feat: SchematicFlow React Flow canvas with drag/connect/delete callbacks"
```

---

## Task 8: Toolbar

**Files:**
- Create: `src/components/Toolbar.tsx`
- Test: `tests/editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/editor.test.tsx
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Toolbar } from '../src/components/Toolbar';

describe('Toolbar', () => {
  it('toggles edit mode', () => {
    let edit = false;
    const { getByRole } = render(
      <Toolbar
        editMode={edit}
        onToggleEdit={() => (edit = !edit)}
        onTidy={() => {}} onExport={() => {}} onImport={() => {}} onReset={() => {}}
      />,
    );
    fireEvent.click(getByRole('button', { name: /edit/i }));
    expect(edit).toBe(true);
  });

  it('fires tidy', () => {
    let tidied = false;
    const { getByRole } = render(
      <Toolbar editMode onToggleEdit={() => {}} onTidy={() => (tidied = true)} onExport={() => {}} onImport={() => {}} onReset={() => {}} />,
    );
    fireEvent.click(getByRole('button', { name: /tidy/i }));
    expect(tidied).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- editor`
Expected: FAIL — cannot find `../src/components/Toolbar`.

- [ ] **Step 3: Write `src/components/Toolbar.tsx`**

```tsx
import { useRef } from 'react';

interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  onTidy: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}

export function Toolbar({ editMode, onToggleEdit, onTidy, onExport, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="toolbar">
      <button className={editMode ? 'tool active' : 'tool'} onClick={onToggleEdit}>
        {editMode ? 'Editing' : 'Edit'}
      </button>
      <button className="tool" onClick={onTidy}>Tidy</button>
      <button className="tool" onClick={onExport}>Export</button>
      <button className="tool" onClick={() => fileRef.current?.click()}>Import</button>
      <button className="tool" onClick={onReset}>Reset</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add toolbar style to `src/styles.css`**

```css
.toolbar { display: flex; gap: 6px; margin: 8px 0; }
.tool { background: var(--panel); color: var(--text); border: 1px solid var(--dim); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; }
.tool.active { background: var(--fluid-fuel); color: #04210f; border-color: var(--fluid-fuel); font-weight: 600; }
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- editor`
Expected: PASS (Toolbar tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/Toolbar.tsx src/styles.css tests/editor.test.tsx
git commit -m "feat: editor Toolbar (edit toggle, tidy, export, import, reset)"
```

---

## Task 9: EditorPanel

**Files:**
- Create: `src/components/EditorPanel.tsx`
- Modify: `tests/editor.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
import { EditorPanel } from '../src/components/EditorPanel';
import { ECS_MODES } from '../src/data/modes';
import type { SystemNode, SystemEdge } from '../src/model';

const node: SystemNode = { id: 'a', label: 'A', type: 'valve', pos: [0, 0], silhouette: {}, description: 'd', modeStates: { 'ecs-auto': 'inactive' } };

describe('EditorPanel', () => {
  it('renames the selected node', () => {
    let label = '';
    const { getByLabelText } = render(
      <EditorPanel node={node} edge={null} mode="ecs-auto" modes={ECS_MODES}
        onRename={(_, l) => (label = l)} onDescribe={() => {}} onSetType={() => {}}
        onDelete={() => {}} onSetNodeModeState={() => {}} onSetEdgeFluid={() => {}}
        onSetEdgeFlow={() => {}} onAddNode={() => {}} />,
    );
    fireEvent.change(getByLabelText(/label/i), { target: { value: 'Alpha' } });
    expect(label).toBe('Alpha');
  });

  it('sets the node state for the current mode', () => {
    let state = '';
    const { getByLabelText } = render(
      <EditorPanel node={node} edge={null} mode="ecs-auto" modes={ECS_MODES}
        onRename={() => {}} onDescribe={() => {}} onSetType={() => {}}
        onDelete={() => {}} onSetNodeModeState={(_, __, s) => (state = s)} onSetEdgeFluid={() => {}}
        onSetEdgeFlow={() => {}} onAddNode={() => {}} />,
    );
    fireEvent.change(getByLabelText(/state in ecs-auto|state in this mode/i), { target: { value: 'active' } });
    expect(state).toBe('active');
  });

  it('adds a component', () => {
    let added = false;
    const { getByRole } = render(
      <EditorPanel node={null} edge={null} mode="ecs-auto" modes={ECS_MODES}
        onRename={() => {}} onDescribe={() => {}} onSetType={() => {}}
        onDelete={() => {}} onSetNodeModeState={() => {}} onSetEdgeFluid={() => {}}
        onSetEdgeFlow={() => {}} onAddNode={() => (added = true)} />,
    );
    fireEvent.click(getByRole('button', { name: /add component/i }));
    expect(added).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- editor`
Expected: FAIL — cannot find `../src/components/EditorPanel`.

- [ ] **Step 3: Write `src/components/EditorPanel.tsx`**

```tsx
import { useState } from 'react';
import type { SystemNode, SystemEdge, Mode, NodeType, FluidType, NodeState } from '../model';
import { NODE_TYPES } from '../glyph';

const FLUIDS: FluidType[] = [
  'bleed-hot', 'bleed-regulated', 'conditioned-air', 'ram-air', 'fuel', 'fuel-vapor', 'pao-coolant',
];
const STATES: NodeState[] = ['active', 'standby', 'inactive'];

interface Props {
  node: SystemNode | null;
  edge: SystemEdge | null;
  mode: string;
  modes: Mode[];
  onRename: (id: string, label: string) => void;
  onDescribe: (id: string, description: string) => void;
  onSetType: (id: string, type: NodeType) => void;
  onDelete: (id: string) => void;
  onSetNodeModeState: (id: string, mode: string, state: NodeState) => void;
  onSetEdgeFluid: (id: string, fluid: FluidType) => void;
  onSetEdgeFlow: (id: string, mode: string, active: boolean, rate: 'low' | 'med' | 'high') => void;
  onAddNode: (type: NodeType) => void;
}

export function EditorPanel(props: Props) {
  const { node, edge, mode, onRename, onDescribe, onSetType, onDelete,
    onSetNodeModeState, onSetEdgeFluid, onSetEdgeFlow, onAddNode } = props;
  const [newType, setNewType] = useState<NodeType>('valve');

  if (node) {
    return (
      <aside className="editor-panel">
        <h2>Edit component</h2>
        <label>Label
          <input value={node.label} onChange={(e) => onRename(node.id, e.target.value)} />
        </label>
        <label>Description
          <textarea value={node.description} onChange={(e) => onDescribe(node.id, e.target.value)} />
        </label>
        <label>Type
          <select value={node.type} onChange={(e) => onSetType(node.id, e.target.value as NodeType)}>
            {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>State in {mode}
          <select value={node.modeStates[mode] ?? 'inactive'} onChange={(e) => onSetNodeModeState(node.id, mode, e.target.value as NodeState)}>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <button className="danger" onClick={() => onDelete(node.id)}>Delete component</button>
      </aside>
    );
  }

  if (edge) {
    const flow = edge.modeFlow[mode] ?? { active: false, rate: 'med' as const };
    return (
      <aside className="editor-panel">
        <h2>Edit connection</h2>
        <label>Fluid
          <select value={edge.fluid} onChange={(e) => onSetEdgeFluid(edge.id, e.target.value as FluidType)}>
            {FLUIDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label>Flowing in {mode}
          <input type="checkbox" checked={!!flow.active}
            onChange={(e) => onSetEdgeFlow(edge.id, mode, e.target.checked, flow.rate ?? 'med')} />
        </label>
        <label>Rate
          <select value={flow.rate ?? 'med'} onChange={(e) => onSetEdgeFlow(edge.id, mode, !!flow.active, e.target.value as 'low' | 'med' | 'high')}>
            <option value="low">low</option><option value="med">med</option><option value="high">high</option>
          </select>
        </label>
      </aside>
    );
  }

  return (
    <aside className="editor-panel">
      <h2>Add component</h2>
      <label>Type
        <select value={newType} onChange={(e) => setNewType(e.target.value as NodeType)}>
          {NODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <button onClick={() => onAddNode(newType)}>Add component</button>
      <p className="hint">Then drag from a component's right handle to another to connect them.</p>
    </aside>
  );
}
```

- [ ] **Step 4: Add editor panel styles to `src/styles.css`**

```css
.editor-panel { background: var(--panel); border-radius: 8px; padding: 16px; display: grid; gap: 10px; }
.editor-panel h2 { margin: 0; font-size: 16px; }
.editor-panel label { display: grid; gap: 4px; font-size: 12px; color: var(--dim); }
.editor-panel input, .editor-panel textarea, .editor-panel select {
  background: #0b0e13; color: var(--text); border: 1px solid var(--dim); border-radius: 4px; padding: 6px; font-size: 13px;
}
.editor-panel textarea { min-height: 70px; resize: vertical; }
.editor-panel button { background: var(--fluid-conditioned-air); color: #00121f; border: none; border-radius: 6px; padding: 8px; cursor: pointer; font-weight: 600; }
.editor-panel button.danger { background: #c0392b; color: #fff; }
.editor-panel .hint { font-size: 11px; color: var(--dim); margin: 0; }
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- editor`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/EditorPanel.tsx src/styles.css tests/editor.test.tsx
git commit -m "feat: EditorPanel for node/edge editing, mode states, and add-component"
```

---

## Task 10: Editable silhouette dots

**Files:**
- Modify: `src/components/Silhouette.tsx`, `tests/components.test.tsx`

- [ ] **Step 1: Append a failing test to `tests/components.test.tsx`**

```tsx
describe('Silhouette edit mode', () => {
  it('reports a dot placement click in edit mode', () => {
    const n: SystemNode = { id: 'a', label: 'A', type: 'tank', pos: [0, 0], silhouette: {}, description: 'x', modeStates: {} };
    let placed: { view: string; pos: [number, number] } | null = null;
    const { container } = render(
      <Silhouette node={n} editMode onPlaceDot={(view, pos) => (placed = { view, pos })} />,
    );
    const topSvg = container.querySelector('svg')!;
    // jsdom/happy-dom has no layout; component must still call back with view id
    fireEvent.click(topSvg);
    expect(placed?.view).toBe('top');
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- components`
Expected: FAIL — `Silhouette` does not accept `editMode`/`onPlaceDot`.

- [ ] **Step 3: Update `src/components/Silhouette.tsx`**

```tsx
import type { SystemNode } from '../model';
import { TOP_VIEW_PATH, TOP_VIEW_VIEWBOX } from '../airframe/topView';
import { SIDE_L_PATH, SIDE_L_VIEWBOX } from '../airframe/sideL';
import { SIDE_R_PATH, SIDE_R_VIEWBOX } from '../airframe/sideR';

type ViewKey = 'top' | 'sideL' | 'sideR';

interface Props {
  node: SystemNode | null;
  editMode?: boolean;
  onPlaceDot?: (view: ViewKey, pos: [number, number]) => void;
}

function svgPointFromEvent(e: React.MouseEvent<SVGSVGElement>, viewBox: string): [number, number] {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const [, , vbW, vbH] = viewBox.split(' ').map(Number);
  // Guard against zero-size layout (test env): fall back to viewBox center.
  if (!rect.width || !rect.height) return [Math.round(vbW / 2), Math.round(vbH / 2)];
  const x = ((e.clientX - rect.left) / rect.width) * vbW;
  const y = ((e.clientY - rect.top) / rect.height) * vbH;
  return [Math.round(x), Math.round(y)];
}

function View(props: {
  title: string; viewKey: ViewKey; path: string; viewBox: string;
  dot?: [number, number]; editMode?: boolean; onPlace?: (v: ViewKey, p: [number, number]) => void;
}) {
  const { title, viewKey, path, viewBox, dot, editMode, onPlace } = props;
  return (
    <figure className="silhouette-view">
      <figcaption>{title}{editMode ? ' — click to place dot' : ''}</figcaption>
      <svg
        viewBox={viewBox} role="img" aria-label={title}
        className={editMode ? 'editable' : ''}
        onClick={editMode && onPlace ? (e) => onPlace(viewKey, svgPointFromEvent(e, viewBox)) : undefined}
      >
        <path className="airframe" d={path} />
        {dot && <circle className="loc-dot" cx={dot[0]} cy={dot[1]} r={9} />}
      </svg>
    </figure>
  );
}

export function Silhouette({ node, editMode, onPlaceDot }: Props) {
  const s = node?.silhouette;
  return (
    <div className="silhouette">
      <View title="Top" viewKey="top" path={TOP_VIEW_PATH} viewBox={TOP_VIEW_VIEWBOX} dot={s?.top} editMode={editMode} onPlace={onPlaceDot} />
      <View title="Side (Left)" viewKey="sideL" path={SIDE_L_PATH} viewBox={SIDE_L_VIEWBOX} dot={s?.sideL} editMode={editMode} onPlace={onPlaceDot} />
      <View title="Side (Right)" viewKey="sideR" path={SIDE_R_PATH} viewBox={SIDE_R_VIEWBOX} dot={s?.sideR} editMode={editMode} onPlace={onPlaceDot} />
      {node && <p className="approx-note">Dot = approximate location · outline is placeholder</p>}
    </div>
  );
}
```

- [ ] **Step 4: Add editable style to `src/styles.css`**

```css
.silhouette-view svg.editable { cursor: crosshair; outline: 1px dashed var(--dim); }
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- components`
Expected: PASS (existing Silhouette tests still pass — `editMode` is optional).

- [ ] **Step 6: Commit**

```bash
git add src/components/Silhouette.tsx src/styles.css tests/components.test.tsx
git commit -m "feat: editable silhouette dot placement in edit mode"
```

---

## Task 11: Wire everything in App

**Files:**
- Modify: `src/App.tsx`, `tests/components.test.tsx`

- [ ] **Step 1: Update the App integration test in `tests/components.test.tsx`**

Replace the existing `describe('App', ...)` block with:

```tsx
describe('App', () => {
  it('defaults to ECS tab and switches to Fuel', () => {
    const { getByRole, getAllByRole } = render(<App />);
    fireEvent.click(getByRole('button', { name: /^fuel$/i }));
    expect(getAllByRole('button').some((b) => /normal feed/i.test(b.textContent ?? ''))).toBe(true);
  });

  it('shows the editor toolbar and toggles edit mode', () => {
    const { getByRole } = render(<App />);
    const editBtn = getByRole('button', { name: /^edit$/i });
    fireEvent.click(editBtn);
    expect(getByRole('button', { name: /editing/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- components`
Expected: FAIL — App has no Edit button yet.

- [ ] **Step 3: Rewrite `src/App.tsx`**

```tsx
import { useEffect, useMemo, useReducer, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { System, NodeType, FluidType, NodeState } from './model';
import { reducer, seedState } from './store/systemsStore';
import { loadState, saveState, parseImport, downloadJson } from './store/persistence';
import { tidy } from './flow/layout';
import { MODES, ECS_MODES, FUEL_MODES } from './data/modes';
import { SchematicFlow } from './flow/SchematicFlow';
import { ModeSelector } from './components/ModeSelector';
import { InfoPanel } from './components/InfoPanel';
import { EditorPanel } from './components/EditorPanel';
import { Toolbar } from './components/Toolbar';
import { Silhouette } from './components/Silhouette';

let uid = 0;
const newId = (p: string) => `${p}-${Date.now()}-${uid++}`;

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());
  const [system, setSystem] = useState<System>('ecs');
  const [mode, setMode] = useState<string>('ecs-ground');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => { saveState(state); }, [state]);

  const data = state[system];
  const modes = system === 'ecs' ? ECS_MODES : FUEL_MODES;
  const modeIds = useMemo(() => MODES.map((m) => m.id), []);

  const selectedNode = data.nodes.find((n) => n.id === selectedId) ?? null;
  const selectedEdge = data.edges.find((e) => e.id === selectedId) ?? null;

  function switchSystem(next: System) {
    setSystem(next);
    setMode(next === 'ecs' ? 'ecs-ground' : 'fuel-feed');
    setSelectedId(null);
  }

  function handleImport(file: File) {
    file.text().then((text) => {
      const result = parseImport(text, modeIds);
      if (result.ok) dispatch({ type: 'replaceAll', state: result.state });
      else alert('Import failed:\n' + result.errors.join('\n'));
    });
  }

  function handleAddNode(type: NodeType) {
    const id = newId(type);
    dispatch({ type: 'addNode', system, node: {
      id, label: `New ${type}`, type, pos: [400, 300], silhouette: {}, description: '', modeStates: {},
    } });
    setSelectedId(id);
  }

  return (
    <div className="app">
      <header>
        <h1>F/A-18A/B Hornet — ECS &amp; Fuel</h1>
        <div className="tabs">
          <button className={system === 'ecs' ? 'tab active' : 'tab'} onClick={() => switchSystem('ecs')}>ECS</button>
          <button className={system === 'fuel' ? 'tab active' : 'tab'} onClick={() => switchSystem('fuel')}>Fuel</button>
        </div>
      </header>

      <Toolbar
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onTidy={() => dispatch({ type: 'tidy', system, positions: tidy(data) })}
        onExport={() => downloadJson(state)}
        onImport={handleImport}
        onReset={() => { if (confirm('Reset all edits to defaults?')) dispatch({ type: 'reset' }); }}
      />

      <ModeSelector modes={modes} active={mode} onPick={setMode} />
      <p className="mode-desc">{modes.find((m) => m.id === mode)?.description}</p>

      <div className="layout">
        <ReactFlowProvider>
          <SchematicFlow
            data={data}
            mode={mode}
            editMode={editMode}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNodeMove={(id, pos) => dispatch({ type: 'moveNode', system, id, pos })}
            onConnect={(from, to) => {
              const id = newId('edge');
              dispatch({ type: 'addEdge', system, edge: { id, from, to, fluid: 'fuel', waypoints: [], modeFlow: {} } });
              setSelectedId(id);
            }}
            onDeleteNode={(id) => { dispatch({ type: 'deleteNode', system, id }); setSelectedId(null); }}
            onDeleteEdge={(id) => { dispatch({ type: 'deleteEdge', system, id }); setSelectedId(null); }}
          />
        </ReactFlowProvider>

        <div className="side">
          {editMode ? (
            <EditorPanel
              node={selectedNode}
              edge={selectedEdge}
              mode={mode}
              modes={modes}
              onRename={(id, label) => dispatch({ type: 'renameNode', system, id, label })}
              onDescribe={(id, description) => dispatch({ type: 'describeNode', system, id, description })}
              onSetType={(id, nodeType) => dispatch({ type: 'setNodeType', system, id, nodeType })}
              onDelete={(id) => { dispatch({ type: 'deleteNode', system, id }); setSelectedId(null); }}
              onSetNodeModeState={(id, m, st: NodeState) => dispatch({ type: 'setNodeModeState', system, id, mode: m, state: st })}
              onSetEdgeFluid={(id, fluid: FluidType) => dispatch({ type: 'setEdgeFluid', system, id, fluid })}
              onSetEdgeFlow={(id, m, active, rate) => dispatch({ type: 'setEdgeFlow', system, id, mode: m, flow: { active, rate } })}
              onAddNode={handleAddNode}
            />
          ) : (
            <InfoPanel node={selectedNode} edge={selectedEdge} mode={mode} />
          )}
          <Silhouette
            node={selectedNode}
            editMode={editMode}
            onPlaceDot={(view, pos) => selectedNode && dispatch({ type: 'setDot', system, id: selectedNode.id, view, pos })}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- components`
Expected: PASS (App tests, including edit-mode toggle).

- [ ] **Step 5: Full test suite**

Run: `npm test`
Expected: all suites PASS (store, persistence, flow, editor, components, integrity, airframe).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx tests/components.test.tsx
git commit -m "feat: wire store, editor, toolbar, React Flow canvas into App"
```

---

## Task 12: Retire old SVG Schematic + build verification

The old `src/components/Schematic.tsx` and its `Edge`/`Node` SVG path are no longer used by `App` (replaced by `SchematicFlow`). `Node` is still used indirectly? No — only `Schematic` used `Node`/`Edge`. Remove the unused trio and their test to avoid dead code, keeping `glyph.tsx` (shared) and `InfoPanel`/`ModeSelector`/`Silhouette` (still used).

**Files:**
- Delete: `src/components/Schematic.tsx`, `src/components/Node.tsx`, `src/components/Edge.tsx`
- Modify: `tests/components.test.tsx` (remove Schematic/Node/Edge blocks)

- [ ] **Step 1: Remove the `Edge`, `Node`, and `Schematic` describe blocks from `tests/components.test.tsx`**

Delete those three `describe(...)` blocks and their imports (`Edge`, `Node`, `Schematic`, and the now-unused `SystemData`/`SystemEdge` test fixtures `edge`, `node`, `sys` if no longer referenced). Keep InfoPanel, ModeSelector, Silhouette, and App blocks.

- [ ] **Step 2: Delete the unused components**

```bash
git rm src/components/Schematic.tsx src/components/Node.tsx src/components/Edge.tsx
```

- [ ] **Step 3: Type-check and full test**

Run: `npx tsc --noEmit && npm test`
Expected: no TS errors (no remaining imports of the deleted files); all tests PASS.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: clean build, `dist/` produced.

- [ ] **Step 5: Manual smoke (dev server)**

Run: `npm run dev`
Verify: nodes drag in Edit mode; edges auto-route and follow; Tidy rearranges; clicking a node in Edit shows EditorPanel; rename/description/type/state changes persist after refresh; Export downloads JSON; Import reloads it; Reset restores defaults; silhouette dot places on click in Edit mode. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove unused SVG Schematic/Node/Edge in favor of React Flow"
```

---

## Self-Review

- **Spec coverage:** React Flow migration (T5–T7), draggable nodes + auto-routed edges (T7), seed-vs-working-copy + store (T3), localStorage + export/import + reset (T4, T11), rename/describe/type/delete (T9), add component (T9, T11), rewire via handles (T7 onConnect, T11), inline per-mode states for nodes and edges (T9), editable silhouette dots (T10), Tidy dagre layout (T5, T11), Toolbar (T8), EditorPanel (T9), App wiring (T11), cleanup (T12). All spec sections covered.
- **Placeholder scan:** none. Every code step is complete.
- **Type consistency:** `EditAction` variants in T3 match every `dispatch` call in T11. `FlowNodeData`/`FlowEdgeData` defined in T5 used in T6. `parseImport`/`downloadJson`/`loadState`/`saveState` signatures in T4 match T11 usage. `tidy(data)` returns `Record<string,[number,number]>` consumed by the `tidy` action in T3/T11. `onSetEdgeFlow(id, mode, active, rate)` consistent between T9 and T11.
- **Known integration risk:** React Flow v12 change-event typing can be strict; T7 Step 4 calls this out. If `onNodesChange` position handling needs the `dragging` flag, persist on `c.dragging === false` (drag end) to avoid thrashing the store.
