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
