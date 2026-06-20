import type { SystemData } from '../model';

export function validateSystem(data: SystemData, modeIds: string[]): string[] {
  const errors: string[] = [];
  const ids = new Set(data.nodes.map((n) => n.id));
  const modes = new Set(modeIds);
  const touched = new Set<string>();

  for (const e of data.edges) {
    if (!ids.has(e.from)) errors.push(`edge ${e.id}: "from" references unknown node "${e.from}"`);
    if (!ids.has(e.to)) errors.push(`edge ${e.id}: "to" references unknown node "${e.to}"`);
    touched.add(e.from);
    touched.add(e.to);
    for (const m of Object.keys(e.modeFlow)) {
      if (!modes.has(m)) errors.push(`edge ${e.id}: modeFlow references unknown mode "${m}"`);
    }
  }

  for (const n of data.nodes) {
    for (const m of Object.keys(n.modeStates)) {
      if (!modes.has(m)) errors.push(`node ${n.id}: modeStates references unknown mode "${m}"`);
    }
    if (!touched.has(n.id)) errors.push(`node ${n.id}: orphan (no edge connects to it)`);
  }

  return errors;
}
