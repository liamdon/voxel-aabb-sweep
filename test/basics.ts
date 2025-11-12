import { test } from 'tap';
import { AABB } from '../reference/aabb';
import { sweep } from '../src/index';
import type { GetVoxelFunction } from '../src/types';

const EPSILON = 1e-5;
const eq = (a: number, b: number): boolean => Math.abs(a - b) < EPSILON;

test('basics', (t) => {
  let getVoxels: GetVoxelFunction = (): boolean => false;
  let box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
  let dir: [number, number, number] = [0, 0, 0];
  let collided = false;
  let callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
    collided = true;
    return true;
  };
  let res: number = 0;

  t.doesNotThrow(
    () => {
      res = sweep(getVoxels, box, dir, callback);
    },
    'Does not throw on empty direction vector'
  );
  t.ok(!collided, 'No collision with empty vector');
  t.equals(res, 0, 'No movement with empty vector');
  t.equals(box.base[0], 0.25, 'No movement with empty vector');
  t.equals(box.base[1], 0.25, 'No movement with empty vector');
  t.equals(box.base[2], 0.25, 'No movement with empty vector');

  dir = [10, -5, -15];
  box.setPosition([0.25, 0.25, 0.25]);
  collided = false;
  res = sweep(getVoxels, box, dir, callback);
  t.ok(!collided, 'No collision moving through empty voxels');
  t.equals(res, Math.sqrt(100 + 25 + 225), 'Full movement through empty voxels');
  t.equals(box.base[0], 0.25 + dir[0], 'Full movement through empty voxels');
  t.equals(box.base[1], 0.25 + dir[1], 'Full movement through empty voxels');
  t.equals(box.base[2], 0.25 + dir[2], 'Full movement through empty voxels');

  getVoxels = (): boolean => true as boolean;
  dir = [0, 0, 0];
  box.setPosition([0.25, 0.25, 0.25]);
  collided = false;
  res = sweep(getVoxels, box, dir, callback);
  t.ok(!collided, 'No collision not moving through full voxels');
  t.equals(res, 0, 'No collision not moving through full voxels');

  dir = [1, 0, 0];
  box.setPosition([0.25, 0.25, 0.25]);
  collided = false;
  res = sweep(getVoxels, box, dir, callback);
  t.ok(collided, 'Collision moving through full voxels');
  t.equals(res, 0.25, 'Collision moving through full voxels');
  t.equals(box.base[0], 0.5, 'Collision moving through full voxels');
  t.equals(box.base[1], 0.25, 'Collision moving through full voxels');
  t.equals(box.base[2], 0.25, 'Collision moving through full voxels');

  box = new AABB([0, 0, 0], [10, 10, 10]);
  dir = [0, 5, 0];
  getVoxels = (x: number, y: number, z: number): boolean => {
    return x === 8 && z === 8 && y === 13;
  };
  collided = false;
  res = sweep(getVoxels, box, dir, callback);
  t.ok(collided, 'Big box collides with single voxel');
  t.equals(res, 3, 'Big box collides with single voxel');
  t.equals(box.base[0], 0, 'Big box collides with single voxel');
  t.equals(box.base[1], 3, 'Big box collides with single voxel');
  t.equals(box.base[2], 0, 'Big box collides with single voxel');

  box = new AABB([0, 0, 0], [1, 1, 1]);
  dir = [10, 10, 0];
  getVoxels = (x: number, y: number, z: number): boolean => {
    return x > 5;
  };
  collided = false;
  callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
    collided = true;
    left[axis] = 0;
    return false;
  };
  res = sweep(getVoxels, box, dir, callback);
  t.ok(collided, 'Collides with wall and keeps going on other axis');
  const tgtdist = Math.sqrt(25 + 25) + 5;
  t.ok(eq(res, tgtdist), 'Collides with wall and keeps going on other axis');
  t.equals(box.base[0], 5, 'Collides with wall and keeps going on other axis');
  t.equals(box.base[1], 10, 'Collides with wall and keeps going on other axis');
  t.equals(box.base[2], 0, 'Collides with wall and keeps going on other axis');

  box = new AABB([0, 0, 0], [1, 1, 1]);
  dir = [1, 1, 1];
  getVoxels = (): boolean => false as boolean;
  callback = (): boolean => false;
  res = sweep(getVoxels, box, dir, callback, true);
  t.equals(box.base[0], 0, 'No translation when noTranslate is truthy');
  t.equals(box.base[1], 0, 'No translation when noTranslate is truthy');
  t.equals(box.base[2], 0, 'No translation when noTranslate is truthy');

  t.end();
});
