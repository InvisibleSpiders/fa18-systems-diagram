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
