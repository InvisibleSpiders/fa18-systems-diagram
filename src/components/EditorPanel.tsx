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
