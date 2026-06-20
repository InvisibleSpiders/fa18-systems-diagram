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
