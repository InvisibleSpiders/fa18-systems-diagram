import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, parseImport, STORAGE_KEY } from '../src/store/persistence';
import { seedState } from '../src/store/systemsStore';
import { MODES } from '../src/data/modes';

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('loadState returns seed when storage empty', () => {
    const s = loadState();
    expect(s.ecs.nodes.length).toBeGreaterThan(0);
  });

  it('save then load round-trips', () => {
    const s = seedState();
    s.ecs.nodes[0].label = 'Edited';
    saveState(s);
    expect(loadState().ecs.nodes[0].label).toBe('Edited');
  });

  it('falls back to seed on corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadState().ecs.nodes.length).toBeGreaterThan(0);
  });

  it('parseImport accepts valid state', () => {
    const json = JSON.stringify({ version: 1, state: seedState() });
    const result = parseImport(json, MODES.map((m) => m.id));
    expect(result.ok).toBe(true);
  });

  it('parseImport rejects integrity-invalid state', () => {
    const bad = seedState();
    bad.ecs.edges[0].to = 'ghost-node';
    const json = JSON.stringify({ version: 1, state: bad });
    const result = parseImport(json, MODES.map((m) => m.id));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/ghost-node/);
  });
});
