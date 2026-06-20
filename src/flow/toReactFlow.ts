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

export type SystemFlowNode = RFNode<FlowNodeData, 'systemNode'>;
export type SystemFlowEdge = RFEdge<FlowEdgeData, 'systemEdge'>;

export function toFlow(data: SystemData, mode: string, editMode: boolean) {
  const nodes: SystemFlowNode[] = data.nodes.map((n) => ({
    id: n.id,
    type: 'systemNode',
    position: { x: n.pos[0], y: n.pos[1] },
    data: { node: n, mode, editMode },
    draggable: editMode,
    selectable: true,
  }));
  const edges: SystemFlowEdge[] = data.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    type: 'systemEdge',
    data: { edge: e, mode },
    selectable: true,
  }));
  return { nodes, edges };
}
