import type { SystemEdge } from '../model';

interface Props {
  edge: SystemEdge;
  mode: string;
  selected: boolean;
  onSelect: () => void;
  fromPos: [number, number];
  toPos: [number, number];
}

export function Edge({ edge, mode, selected, onSelect, fromPos, toPos }: Props) {
  const flow = edge.modeFlow[mode];
  const active = !!flow?.active;
  const points = [fromPos, ...edge.waypoints, toPos].map((p) => p.join(',')).join(' ');
  const cls = [
    'edge',
    `fluid-${edge.fluid}`,
    active ? 'edge-active' : 'edge-inactive',
    active ? `rate-${flow?.rate ?? 'med'}` : '',
    selected ? 'selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <polyline
      className={cls}
      points={points}
      fill="none"
      onClick={onSelect}
      data-edge-id={edge.id}
    />
  );
}
