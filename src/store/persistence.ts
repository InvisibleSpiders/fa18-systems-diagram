import type { SystemsState } from './systemsStore';
import { seedState } from './systemsStore';
import { validateSystem } from '../data/integrity';

export const STORAGE_KEY = 'fa18-systems-v1';
const VERSION = 1;

export function loadState(): SystemsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION || !parsed.state?.ecs || !parsed.state?.fuel) return seedState();
    return parsed.state as SystemsState;
  } catch {
    return seedState();
  }
}

export function saveState(state: SystemsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, state }));
  } catch {
    /* storage unavailable — ignore */
  }
}

export type ImportResult =
  | { ok: true; state: SystemsState }
  | { ok: false; errors: string[] };

export function parseImport(json: string, modeIds: string[]): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['File is not valid JSON.'] };
  }
  const state = (parsed as { state?: SystemsState })?.state ?? (parsed as SystemsState);
  if (!state?.ecs || !state?.fuel) return { ok: false, errors: ['Missing ecs/fuel data.'] };
  const errors = [
    ...validateSystem(state.ecs, modeIds).map((e) => `ECS: ${e}`),
    ...validateSystem(state.fuel, modeIds).map((e) => `Fuel: ${e}`),
  ];
  return errors.length ? { ok: false, errors } : { ok: true, state };
}

export function downloadJson(state: SystemsState, filename = 'fa18-systems.json'): void {
  const blob = new Blob([JSON.stringify({ version: VERSION, state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
