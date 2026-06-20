import { describe, it, expect } from 'vitest';
import { reducer, seedState } from '../src/store/systemsStore';
import type { SystemNode, SystemEdge } from '../src/model';

const baseNode = (id: string): SystemNode => ({
  id, label: id, type: 'valve', pos: [0, 0], silhouette: {}, description: '', modeStates: {},
});

function twoNodeEcs() {
  const s = seedState();
  s.ecs = {
    nodes: [baseNode('a'), baseNode('b')],
    edges: [{ id: 'e', from: 'a', to: 'b', fluid: 'fuel', waypoints: [], modeFlow: {} }],
  };
  return s;
}

describe('reducer', () => {
  it('moveNode updates position', () => {
    const s = reducer(twoNodeEcs(), { type: 'moveNode', system: 'ecs', id: 'a', pos: [10, 20] });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.pos).toEqual([10, 20]);
  });

  it('renameNode updates label', () => {
    const s = reducer(twoNodeEcs(), { type: 'renameNode', system: 'ecs', id: 'a', label: 'Alpha' });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.label).toBe('Alpha');
  });

  it('describeNode updates description', () => {
    const s = reducer(twoNodeEcs(), { type: 'describeNode', system: 'ecs', id: 'a', description: 'desc' });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.description).toBe('desc');
  });

  it('setNodeType updates type', () => {
    const s = reducer(twoNodeEcs(), { type: 'setNodeType', system: 'ecs', id: 'a', nodeType: 'tank' });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.type).toBe('tank');
  });

  it('addNode appends a node', () => {
    const s = reducer(twoNodeEcs(), { type: 'addNode', system: 'ecs', node: baseNode('c') });
    expect(s.ecs.nodes.map((n) => n.id)).toContain('c');
  });

  it('deleteNode removes the node and its edges', () => {
    const s = reducer(twoNodeEcs(), { type: 'deleteNode', system: 'ecs', id: 'a' });
    expect(s.ecs.nodes.map((n) => n.id)).not.toContain('a');
    expect(s.ecs.edges.find((e) => e.from === 'a' || e.to === 'a')).toBeUndefined();
  });

  it('addEdge appends an edge', () => {
    const edge: SystemEdge = { id: 'e2', from: 'b', to: 'a', fluid: 'fuel', waypoints: [], modeFlow: {} };
    const s = reducer(twoNodeEcs(), { type: 'addEdge', system: 'ecs', edge });
    expect(s.ecs.edges.map((e) => e.id)).toContain('e2');
  });

  it('deleteEdge removes the edge', () => {
    const s = reducer(twoNodeEcs(), { type: 'deleteEdge', system: 'ecs', id: 'e' });
    expect(s.ecs.edges.map((e) => e.id)).not.toContain('e');
  });

  it('setEdgeFluid updates fluid', () => {
    const s = reducer(twoNodeEcs(), { type: 'setEdgeFluid', system: 'ecs', id: 'e', fluid: 'ram-air' });
    expect(s.ecs.edges.find((e) => e.id === 'e')!.fluid).toBe('ram-air');
  });

  it('setNodeModeState sets one mode state', () => {
    const s = reducer(twoNodeEcs(), { type: 'setNodeModeState', system: 'ecs', id: 'a', mode: 'ecs-auto', state: 'active' });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.modeStates['ecs-auto']).toBe('active');
  });

  it('setEdgeFlow sets one mode flow', () => {
    const s = reducer(twoNodeEcs(), { type: 'setEdgeFlow', system: 'ecs', id: 'e', mode: 'ecs-auto', flow: { active: true, rate: 'high' } });
    expect(s.ecs.edges.find((e) => e.id === 'e')!.modeFlow['ecs-auto']).toEqual({ active: true, rate: 'high' });
  });

  it('setDot sets and clears a silhouette dot', () => {
    let s = reducer(twoNodeEcs(), { type: 'setDot', system: 'ecs', id: 'a', view: 'top', pos: [5, 6] });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.silhouette.top).toEqual([5, 6]);
    s = reducer(s, { type: 'setDot', system: 'ecs', id: 'a', view: 'top', pos: null });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.silhouette.top).toBeUndefined();
  });

  it('tidy applies positions', () => {
    const s = reducer(twoNodeEcs(), { type: 'tidy', system: 'ecs', positions: { a: [100, 200], b: [300, 400] } });
    expect(s.ecs.nodes.find((n) => n.id === 'a')!.pos).toEqual([100, 200]);
  });

  it('reset restores seed', () => {
    const dirty = reducer(seedState(), { type: 'renameNode', system: 'ecs', id: 'bleed-l', label: 'X' });
    const s = reducer(dirty, { type: 'reset' });
    expect(s.ecs.nodes.find((n) => n.id === 'bleed-l')!.label).not.toBe('X');
  });
});
