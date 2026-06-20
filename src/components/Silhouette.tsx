import type { SystemNode } from '../model';
import { TOP_VIEW_PATH, TOP_VIEW_VIEWBOX } from '../airframe/topView';
import { SIDE_L_PATH, SIDE_L_VIEWBOX } from '../airframe/sideL';
import { SIDE_R_PATH, SIDE_R_VIEWBOX } from '../airframe/sideR';

interface Props { node: SystemNode | null; }

function View({ title, path, viewBox, dot }: { title: string; path: string; viewBox: string; dot?: [number, number] }) {
  return (
    <figure className="silhouette-view">
      <figcaption>{title}</figcaption>
      <svg viewBox={viewBox} role="img" aria-label={title}>
        <path className="airframe" d={path} />
        {dot && <circle className="loc-dot" cx={dot[0]} cy={dot[1]} r={9} />}
      </svg>
    </figure>
  );
}

export function Silhouette({ node }: Props) {
  const s = node?.silhouette;
  return (
    <div className="silhouette">
      <View title="Top" path={TOP_VIEW_PATH} viewBox={TOP_VIEW_VIEWBOX} dot={s?.top} />
      <View title="Side (Left)" path={SIDE_L_PATH} viewBox={SIDE_L_VIEWBOX} dot={s?.sideL} />
      <View title="Side (Right)" path={SIDE_R_PATH} viewBox={SIDE_R_VIEWBOX} dot={s?.sideR} />
      {node && <p className="approx-note">Dot = approximate location · outline is placeholder</p>}
    </div>
  );
}
