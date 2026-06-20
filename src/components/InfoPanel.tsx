import type { SystemNode, SystemEdge } from '../model';

interface Props {
  node: SystemNode | null;
  edge: SystemEdge | null;
  mode: string;
}

export function InfoPanel({ node, edge, mode }: Props) {
  if (node) {
    return (
      <aside className="info-panel">
        <h2>{node.label}</h2>
        <p className="type">{node.type}</p>
        <p>{node.description}</p>
        <p className="role">In this mode: <strong>{node.modeStates[mode] ?? 'inactive'}</strong></p>
      </aside>
    );
  }
  if (edge) {
    const flow = edge.modeFlow[mode];
    return (
      <aside className="info-panel">
        <h2>{edge.fluid.replace(/-/g, ' ')} line</h2>
        <p className="role">
          In this mode: <strong>{flow?.active ? `flowing (${flow.rate ?? 'med'})` : 'no flow'}</strong>
        </p>
      </aside>
    );
  }
  return <aside className="info-panel"><p className="prompt">Select a component or flow line.</p></aside>;
}
