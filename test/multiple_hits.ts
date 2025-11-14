import { describe, test, expect } from 'vitest';
import AABB from '../reference/aabb.js';
import { sweep } from '../src/index';

const N = 800;

describe('multiple hits', () => {
  test('no voxel is queried twice during same sweep', () => {
    const box = new AABB([0, 0, 0], [0, 0, 0]);
    const dir: [number, number, number] = [0, 0, 0];
    const callback = (dist: number, axis: number, dir: number, vec: number[]): void => {
      vec[axis] = 0;
    };
    const cache = new Set<number>();

    let ok: boolean = true;
    const getVoxels = (x: number, y: number, z: number): void => {
      const id = x + y * 100 + z * 10000;
      if (cache.has(id)) ok = false;
      cache.add(id);
    };

    for (let i = 0; i < N; i++) {
      // randomize
      for (let j = 0; j < 3; j++) {
        box.base[j] = 1 - 2 * Math.random();
        box.max[j] = box.base[j] + 0.01 + 5 * Math.random();
        dir[j] = 20 * (0.5 - Math.random());
      }

      ok = true;
      cache.clear();
      const res = sweep(getVoxels, box, dir, callback);

      expect(ok, `iteration ${i}: no voxel should be queried twice`).toBe(true);
    }
  });
});
