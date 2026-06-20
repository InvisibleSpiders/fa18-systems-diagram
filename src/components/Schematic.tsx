import type { SystemData } from '../model';
import { Node } from './Node';
import { Edge } from './Edge';

interface Props {
  data: SystemData;
  mode: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Schematic({ data, mode, selectedId, onSelect }: Props) {
  const posOf = (id: string): [number, number] =>
    data.nodes.find((n) => n.id === id)?.pos ?? [0, 0];

  return (
    <svg className="schematic" viewBox="0 0 1000 700" role="img">
      {data.edges.map((e) => (
        <Edge
          key={e.id}
          edge={e}
          mode={mode}
          selected={selectedId === e.id}
          onSelect={() => onSelect(e.id)}
          fromPos={posOf(e.from)}
          toPos={posOf(e.to)}
        />
      ))}
      {data.nodes.map((n) => (
        <Node
          key={n.id}
          node={n}
          mode={mode}
          selected={selectedId === n.id}
          onSelect={() => onSelect(n.id)}
        />
      ))}
    </svg>
  );
}
