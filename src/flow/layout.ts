import dagre from 'dagre';
import type { SystemData } from '../model';

// Left-to-right ranked layout. Returns a position per node id.
export function tidy(data: SystemData): Record<string, [number, number]> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 90, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of data.nodes) g.setNode(n.id, { width: 90, height: 60 });
  for (const e of data.edges) g.setEdge(e.from, e.to);
  dagre.layout(g);
  const out: Record<string, [number, number]> = {};
  for (const n of data.nodes) {
    const { x, y } = g.node(n.id);
    out[n.id] = [Math.round(x), Math.round(y)];
  }
  return out;
}
