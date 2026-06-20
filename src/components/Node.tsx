import type { SystemNode, NodeType } from '../model';

interface Props {
  node: SystemNode;
  mode: string;
  selected: boolean;
  onSelect: () => void;
}

// Distinct simple glyph per type, drawn around the origin.
function Glyph({ type }: { type: NodeType }) {
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
