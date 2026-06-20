import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Glyph } from '../glyph';
import type { SystemFlowNode } from './toReactFlow';

export function FlowNode({ data, selected }: NodeProps<SystemFlowNode>) {
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
