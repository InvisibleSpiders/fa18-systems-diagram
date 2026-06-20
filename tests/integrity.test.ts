import { describe, it, expect } from 'vitest';
import { validateSystem } from '../src/data/integrity';
import { MODES } from '../src/data/modes';
import type { SystemData } from '../src/model';

const modeIds = MODES.map((m) => m.id);

const good: SystemData = {
  nodes: [
    { id: 'a', label: 'A', type: 'tank', pos: [0, 0], silhouette: {}, description: 'x', modeStates: { 'fuel-feed': 'active' } },
    { id: 'b', label: 'B', type: 'engine', pos: [1, 1], silhouette: {}, description: 'y', modeStates: { 'fuel-feed': 'active' } },
  ],
  edges: [
    { id: 'e1', from: 'a', to: 'b', fluid: 'fuel', waypoints: [], modeFlow: { 'fuel-feed': { active: true } } },
  ],
};

describe('validateSystem', () => {
  it('returns no errors for valid data', () => {
    expect(validateSystem(good, modeIds)).toEqual([]);
  });

  it('flags an edge referencing a missing node', () => {
    const bad: SystemData = { ...good, edges: [{ ...good.edges[0], to: 'ghost' }] };
    expect(validateSystem(bad, modeIds)).toContain('edge e1: "to" references unknown node "ghost"');
  });

  it('flags a node modeState referencing an unknown mode', () => {
    const bad: SystemData = {
      ...good,
      nodes: [{ ...good.nodes[0], modeStates: { 'no-such-mode': 'active' } }, good.nodes[1]],
    };
    expect(validateSystem(bad, modeIds)).toContain('node a: modeStates references unknown mode "no-such-mode"');
  });

  it('flags an orphan node touched by no edge', () => {
    const bad: SystemData = {
      ...good,
      nodes: [...good.nodes, { id: 'c', label: 'C', type: 'valve', pos: [2, 2], silhouette: {}, description: 'z', modeStates: {} }],
    };
    expect(validateSystem(bad, modeIds)).toContain('node c: orphan (no edge connects to it)');
  });
});
