import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { SystemFlowEdge } from './toReactFlow';

export function FlowEdge(props: EdgeProps<SystemFlowEdge>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props;
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const flow = data!.edge.modeFlow[data!.mode];
  const active = !!flow?.active;
  const cls = [
    'flow-edge', `fluid-${data!.edge.fluid}`,
    active ? `edge-active rate-${flow?.rate ?? 'med'}` : 'edge-inactive',
    selected ? 'selected' : '',
  ].filter(Boolean).join(' ');
  return <BaseEdge id={props.id} path={path} className={cls} />;
}
