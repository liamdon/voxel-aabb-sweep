import { test } from 'tap';
import { AABB } from '../reference/aabb';
import { sweep } from '../src/index';

const N = 800;

test('multiple hits', (t) => {
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

    if (!ok) {
      t.fail('Same voxel queried twice for same sweep, on ' + i + 'th test');
      break;
    }
  }

  if (ok) t.pass('Passed ' + N + ' random tests without a multiple query.');

  t.end();
});
