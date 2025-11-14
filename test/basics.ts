import { describe, test, expect } from 'vitest';
import AABB from '../reference/aabb.js';
import { sweep } from '../src/index';
import type { GetVoxelFunction } from '../src/types';

const EPSILON = 1e-5;
const eq = (a: number, b: number): boolean => Math.abs(a - b) < EPSILON;

describe('basics', () => {
  test('does not throw on empty direction vector', () => {
    let getVoxels: GetVoxelFunction = (): boolean => false;
    let box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    let dir: [number, number, number] = [0, 0, 0];
    let collided = false;
    let callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
      collided = true;
      return true;
    };
    let res: number = 0;

    res = sweep(getVoxels, box, dir, callback);
    expect(collided).toBe(false);
    expect(res).toBe(0);
    expect(box.base[0]).toBe(0.25);
    expect(box.base[1]).toBe(0.25);
    expect(box.base[2]).toBe(0.25);
  });

  test('no collision moving through empty voxels', () => {
    let getVoxels: GetVoxelFunction = (): boolean => false;
    let box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    let dir: [number, number, number] = [10, -5, -15];
    let collided = false;
    let callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
      collided = true;
      return true;
    };

    const res = sweep(getVoxels, box, dir, callback);
    expect(collided).toBe(false);
    expect(res).toBe(Math.sqrt(100 + 25 + 225));
    expect(box.base[0]).toBe(0.25 + dir[0]);
    expect(box.base[1]).toBe(0.25 + dir[1]);
    expect(box.base[2]).toBe(0.25 + dir[2]);
  });

  test('no collision not moving through full voxels', () => {
    let getVoxels: GetVoxelFunction = (): boolean => true as boolean;
    let box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    let dir: [number, number, number] = [0, 0, 0];
    let collided = false;
    let callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
      collided = true;
      return true;
    };

    const res = sweep(getVoxels, box, dir, callback);
    expect(collided).toBe(false);
    expect(res).toBe(0);
  });

  test('collision moving through full voxels', () => {
    let getVoxels: GetVoxelFunction = (): boolean => true as boolean;
    let box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    let dir: [number, number, number] = [1, 0, 0];
    let collided = false;
    let callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
      collided = true;
      return true;
    };

    const res = sweep(getVoxels, box, dir, callback);
    expect(collided).toBe(true);
    expect(res).toBe(0.25);
    expect(box.base[0]).toBe(0.5);
    expect(box.base[1]).toBe(0.25);
    expect(box.base[2]).toBe(0.25);
  });

  test('big box collides with single voxel', () => {
    let box = new AABB([0, 0, 0], [10, 10, 10]);
    let dir: [number, number, number] = [0, 5, 0];
    let getVoxels = (x: number, y: number, z: number): boolean => {
      return x === 8 && z === 8 && y === 13;
    };
    let collided = false;
    let callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
      collided = true;
      return true;
    };

    const res = sweep(getVoxels, box, dir, callback);
    expect(collided).toBe(true);
    expect(res).toBe(3);
    expect(box.base[0]).toBe(0);
    expect(box.base[1]).toBe(3);
    expect(box.base[2]).toBe(0);
  });

  test('collides with wall and keeps going on other axis', () => {
    let box = new AABB([0, 0, 0], [1, 1, 1]);
    let dir: [number, number, number] = [10, 10, 0];
    let getVoxels = (x: number, y: number, z: number): boolean => {
      return x > 5;
    };
    let collided = false;
    let callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
      collided = true;
      left[axis] = 0;
      return false;
    };

    const res = sweep(getVoxels, box, dir, callback);
    expect(collided).toBe(true);
    const tgtdist = Math.sqrt(25 + 25) + 5;
    expect(eq(res, tgtdist)).toBe(true);
    expect(box.base[0]).toBe(5);
    expect(box.base[1]).toBe(10);
    expect(box.base[2]).toBe(0);
  });

  test('no translation when noTranslate is truthy', () => {
    let box = new AABB([0, 0, 0], [1, 1, 1]);
    let dir: [number, number, number] = [1, 1, 1];
    let getVoxels: GetVoxelFunction = (): boolean => false as boolean;
    let callback = (): boolean => false;

    const res = sweep(getVoxels, box, dir, callback, true);
    expect(box.base[0]).toBe(0);
    expect(box.base[1]).toBe(0);
    expect(box.base[2]).toBe(0);
  });
});
