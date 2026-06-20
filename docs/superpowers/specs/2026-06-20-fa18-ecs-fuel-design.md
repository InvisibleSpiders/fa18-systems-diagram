# F/A-18A/B Hornet — ECS + Fuel Interactive Schematic

**Date:** 2026-06-20
**Status:** Approved design, pre-implementation
**Scope:** Early A/B models only (LOX breathing, no OBOGS)

## Purpose

An animated, interactive web app that teaches the Environmental Control System (ECS)
and Fuel system of the early F/A-18A/B Hornet. Users click components to read their
function and watch flow behavior change across modes of operation.

Accuracy approach is **hybrid**: built from open-source / publicly available F/A-18
knowledge. No controlled documentation is used. Internal component placement is
therefore approximate and clearly labelled as such; the outer airframe outline is
precise (traced from public general-arrangement drawings).

## Goals

- Two separate diagrams (ECS, Fuel) on switchable tabs — each uncluttered.
- Click any component or flow line to get a description and its role in the current mode.
- Switch between modes of operation; active components light up and flow lines animate.
- A precise F/A-18A/B silhouette inset (top + side-left + side-right) shows the
  approximate physical location of a selected component.

## Non-Goals

- 3D draggable model (flow clarity favored over geometry).
- Precise internal component placement (not available from open sources).
- Late-model A/B, C/D, E/F, or OBOGS-equipped jets.
- Controlled/NATOPS-sourced data of any kind.

## Architecture — data-driven

Each system is described as **data**, not hand-drawn graphics. Correcting the model
means editing data files; the renderer lays everything out automatically. This is
essential for the hybrid-accuracy correction loop.

### Data model

```ts
type FluidType =
  | 'bleed-hot' | 'bleed-regulated' | 'conditioned-air' | 'ram-air'
  | 'fuel' | 'fuel-vapor' | 'pao-coolant';

type NodeType =
  | 'valve' | 'heat-exchanger' | 'acm' | 'compressor' | 'tank' | 'pump'
  | 'regulator' | 'sensor' | 'engine' | 'probe' | 'duct-junction'
  | 'lox-converter' | 'receptacle' | 'mast';

interface SilhouettePos { top?: [number, number]; sideL?: [number, number]; sideR?: [number, number]; }

interface Node {
  id: string;
  label: string;
  type: NodeType;
  pos: [number, number];          // schematic canvas position
  silhouette: SilhouettePos;      // approximate physical location, per view
  description: string;            // function, plain language
  modeStates: Record<string, 'active' | 'inactive' | 'standby'>;
}

interface Edge {
  id: string;
  from: string;                   // node id
  to: string;                     // node id
  fluid: FluidType;
  waypoints: [number, number][];  // routing through canvas
  modeFlow: Record<string, { active: boolean; direction?: 'forward' | 'reverse'; rate?: 'low' | 'med' | 'high' }>;
}

interface Mode {
  id: string;
  label: string;
  description: string;
  system: 'ecs' | 'fuel';
}
```

### Color by fluid

- `bleed-hot` — hot orange/red
- `bleed-regulated` — amber
- `conditioned-air` — cool blue
- `ram-air` — light cyan
- `fuel` — green
- `fuel-vapor` — pale green dashed
- `pao-coolant` — purple

### Node symbols by type

Each `NodeType` renders a distinct SVG symbol (valve, heat exchanger, ACM turbine,
tank, pump, etc.). Selected node is highlighted; inactive nodes in the current mode
are dimmed.

## Rendering

- One SVG canvas per system, shown via tabs: **ECS** / **Fuel**.
- Nodes = React components keyed by `type`.
- Edges = polylines through `waypoints`, colored by `fluid`.

## Interaction

- **Click node or edge** → side InfoPanel: name, function, role in current mode.
- **Mode selector** buttons (modes filtered to current system). Switching re-evaluates
  `modeStates` / `modeFlow`: active nodes light, inactive dim, active edges animate.
- **Silhouette inset** — F/A-18A/B top + side-left + side-right outlines. Selecting a
  component highlights its dot in each view where a position is defined. Dots are
  labelled "approximate location." User may nudge dot coordinates later against their
  own references (no document shared).

## Animation

- Active edges animate via SVG `stroke-dashoffset` march; speed maps to `rate`.
- Inactive edges static grey.
- Mode switch fades node/edge states smoothly.

## Modes of operation

### ECS
1. Ground ops — engine/APU bleed, ground cooling
2. Normal flight AUTO — temp + cabin pressure schedule
3. MANUAL temp override
4. RAM air — emergency cooling, bleed off
5. Anti-ice / pitot / windshield / canopy defog
6. Avionics + radar (PAO) cooling flow

### Fuel
7. Normal engine feed — feed tanks (2 & 3) → engines
8. Internal transfer / sequencing — transfer tanks (1 & 4) + wings → feed tanks
9. External tank transfer — centerline + 2 wing 330 gal, bleed-air pressurized
10. Aerial refuel — starboard nose probe
11. Ground pressure refuel — single-point
12. Fuel dump — dump valves/masts
13. Bingo / low-state warning

## System content coverage

### ECS components
Bleed taps L/R, bleed regulator + shutoff valves, precooler, primary + secondary heat
exchangers, Air Cycle Machine (compressor/turbine), water separator/condenser, ram-air
inlet + emergency ram valve, temp mixing valve, cabin pressure regulator, cabin/avionics
air distribution, avionics cooling, radar PAO liquid-cool loop + heat exchanger, anti-ice
(windshield/pitot/inlet), canopy seal, anti-G air, defog, **LOX converter / breathing-air
supply** (early A/B — LOX, not OBOGS).

### Fuel components
4 internal fuselage tanks — **tanks 2 & 3 = feed, tanks 1 & 4 = transfer**; L/R wing
internal tanks; collector/feed; boost pumps; transfer pumps; motive-flow proportioner;
bleed-air tank pressurization; transfer sequencing logic; external tanks (centerline + 2
wing 330 gal); aerial refuel probe (starboard nose); single-point pressure refuel;
transfer/refuel valves; dump valves/masts; crossfeed; L/R engine feed to F404s; fuel/oil
heat exchanger; low-level + bingo sensors; neg-G provisions.

## Airframe silhouette

- Precise outer mold line traced from a **public-domain / open-license** F/A-18A/B
  general-arrangement 3-view. License verified before tracing.
- Three views: top, side-left, side-right. Outlines mirror L/R; component dots differ
  per side (gun port-side, refuel probe starboard nose, etc.).
- Stored as SVG path data in `src/airframe/`.

## Project structure

```
src/
  data/
    ecs.ts          # ECS nodes + edges
    fuel.ts         # Fuel nodes + edges
    modes.ts        # mode definitions
  airframe/
    topView.ts      # traced path
    sideL.ts
    sideR.ts
  components/
    Schematic.tsx   # SVG canvas, lays out nodes + edges
    Node.tsx        # symbol per NodeType
    Edge.tsx        # polyline + animation
    ModeSelector.tsx
    InfoPanel.tsx
    Silhouette.tsx  # top + sideL + sideR with dots
  App.tsx           # tabs, selection + mode state
```

Stack: **Vite + React + TypeScript**. Deploy: GitHub repo → Vercel.

## Testing

Vitest data-integrity tests:
- Every edge `from`/`to` resolves to an existing node.
- Every `modeStates` / `modeFlow` key references a defined mode id.
- No orphan nodes (every node touched by at least one edge or intentionally standalone).
- Every mode id is referenced by at least one node or edge.

Light React render smoke tests for each component type.

## Open items / future correction

- Verify license of the chosen 3-view source before tracing.
- User to nudge silhouette dot positions against own references over time.
- Descriptions to be reviewed/corrected by user in the hybrid loop.
