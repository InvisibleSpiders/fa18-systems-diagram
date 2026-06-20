import { describe, it, expect } from 'vitest';
import { TOP_VIEW_PATH } from '../src/airframe/topView';
import { SIDE_L_PATH } from '../src/airframe/sideL';
import { SIDE_R_PATH } from '../src/airframe/sideR';

describe('airframe paths', () => {
  it('are non-trivial closed paths', () => {
    for (const p of [TOP_VIEW_PATH, SIDE_L_PATH, SIDE_R_PATH]) {
      expect(p.startsWith('M')).toBe(true);
      expect(p.length).toBeGreaterThan(100);
      expect(/[Zz]\s*$/.test(p.trim())).toBe(true);
    }
  });
});
