import type { SystemNode } from '../model';
import { TOP_VIEW_PATH, TOP_VIEW_VIEWBOX } from '../airframe/topView';
import { SIDE_L_PATH, SIDE_L_VIEWBOX } from '../airframe/sideL';
import { SIDE_R_PATH, SIDE_R_VIEWBOX } from '../airframe/sideR';

type ViewKey = 'top' | 'sideL' | 'sideR';

interface Props {
  node: SystemNode | null;
  editMode?: boolean;
  onPlaceDot?: (view: ViewKey, pos: [number, number]) => void;
}

function svgPointFromEvent(e: React.MouseEvent<SVGSVGElement>, viewBox: string): [number, number] {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const [, , vbW, vbH] = viewBox.split(' ').map(Number);
  // Guard against zero-size layout (test env): fall back to viewBox center.
  if (!rect.width || !rect.height) return [Math.round(vbW / 2), Math.round(vbH / 2)];
  const x = ((e.clientX - rect.left) / rect.width) * vbW;
  const y = ((e.clientY - rect.top) / rect.height) * vbH;
  return [Math.round(x), Math.round(y)];
}

function View(props: {
  title: string; viewKey: ViewKey; path: string; viewBox: string;
  dot?: [number, number]; editMode?: boolean; onPlace?: (v: ViewKey, p: [number, number]) => void;
}) {
  const { title, viewKey, path, viewBox, dot, editMode, onPlace } = props;
  return (
    <figure className="silhouette-view">
      <figcaption>{title}{editMode ? ' — click to place dot' : ''}</figcaption>
      <svg
        viewBox={viewBox} role="img" aria-label={title}
        className={editMode ? 'editable' : ''}
        onClick={editMode && onPlace ? (e) => onPlace(viewKey, svgPointFromEvent(e, viewBox)) : undefined}
      >
        <path className="airframe" d={path} />
        {dot && <circle className="loc-dot" cx={dot[0]} cy={dot[1]} r={9} />}
      </svg>
    </figure>
  );
}

export function Silhouette({ node, editMode, onPlaceDot }: Props) {
  const s = node?.silhouette;
  return (
    <div className="silhouette">
      <View title="Top" viewKey="top" path={TOP_VIEW_PATH} viewBox={TOP_VIEW_VIEWBOX} dot={s?.top} editMode={editMode} onPlace={onPlaceDot} />
      <View title="Side (Left)" viewKey="sideL" path={SIDE_L_PATH} viewBox={SIDE_L_VIEWBOX} dot={s?.sideL} editMode={editMode} onPlace={onPlaceDot} />
      <View title="Side (Right)" viewKey="sideR" path={SIDE_R_PATH} viewBox={SIDE_R_VIEWBOX} dot={s?.sideR} editMode={editMode} onPlace={onPlaceDot} />
      {node && <p className="approx-note">Dot = approximate location · outline is placeholder</p>}
    </div>
  );
}
