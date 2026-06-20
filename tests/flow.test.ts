import { describe, it, expect } from 'vitest';
import { toFlow } from '../src/flow/toReactFlow';
import { tidy } from '../src/flow/layout';
import type { SystemData } from '../src/model';

const data: SystemData = {
  nodes: [
    { id: 'a', label: 'A', type: 'tank', pos: [0, 0], silhouette: {}, description: '', modeStates: { 'ecs-auto': 'active' } },
    { id: 'b', label: 'B', type: 'engine', pos: [100, 0], silhouette: {}, description: '', modeStates: { 'ecs-auto': 'inactive' } },
  ],
  edges: [{ id: 'e', from: 'a', to: 'b', fluid: 'fuel', waypoints: [], modeFlow: { 'ecs-auto': { active: true } } }],
};

describe('toFlow', () => {
  it('maps one RF node per node and one RF edge per edge', () => {
    const { nodes, edges } = toFlow(data, 'ecs-auto', false);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(nodes[0].data.node.id).toBe('a');
    expect(edges[0].data!.edge.id).toBe('e');
  });

  it('passes the current mode into node/edge data', () => {
    const { nodes, edges } = toFlow(data, 'ecs-auto', true);
    expect(nodes[0].data.mode).toBe('ecs-auto');
    expect(edges[0].data!.mode).toBe('ecs-auto');
    expect(nodes[0].draggable).toBe(true);
  });
});

describe('tidy', () => {
  it('returns a finite distinct position for every node', () => {
    const pos = tidy(data);
    expect(Object.keys(pos).sort()).toEqual(['a', 'b']);
    for (const id of ['a', 'b']) {
      expect(Number.isFinite(pos[id][0])).toBe(true);
      expect(Number.isFinite(pos[id][1])).toBe(true);
    }
    expect(pos.a).not.toEqual(pos.b);
  });
});
