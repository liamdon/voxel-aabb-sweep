import { describe, test, expect } from 'vitest';
import AABB from '../reference/aabb.js';
import { sweep } from '../src/index';

const epsilon = 1e-5;
const equals = (a: number, b: number): boolean => Math.abs(a - b) < epsilon;
const mag = (v: number[]): number => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

describe('edge cases', () => {
  test('fit exactly into a gap', () => {
    const box = new AABB([0, 0, 0], [2, 2, 2]);
    let dir: [number, number, number];
    let res: number;
    let collided: boolean;

    const callback = (dist: number, axis: number, dir: number, vec: number[]): boolean => {
      collided = true;
      return true;
    };

    function getVoxels(x: number, y: number, z: number): boolean {
      // 2x2 hole along each axis
      if (x === -1 || x === 0) return false;
      if (y === -1 || y === 0) return false;
      if (z === -1 || z === 0) return false;
      // otherwise solid past xyz=5
      return Math.abs(x) > 5 || Math.abs(y) > 5 || Math.abs(z) > 5;
    }

    function testAxis(axisNum: number, sign: number, axisName: string): void {
      box.setPosition([-1, -1, -1]);
      dir = [0, 0, 0];
      dir[axisNum] = 10 * sign;
      collided = false;
      res = sweep(getVoxels, box, dir, callback);
      expect(collided, `No collision, axis test, ${axisName}`).toBe(false);
      expect(res, `No collision, axis test, ${axisName}`).toBe(10);
    }

    testAxis(0, 1, '+X');
    testAxis(0, -1, '-X');
    testAxis(1, 1, '+Y');
    testAxis(1, -1, '-Y');
    testAxis(2, 1, '+Z');
    testAxis(2, -1, '-Z');
  });

  test('between two walls', () => {
    const box = new AABB([0, 0, 0], [2, 2, 2]);
    const callback = (dist: number, axis: number, dir: number, vec: number[]): void => {
      vec[axis] = 0;
    };

    function testAxis(axis: number, dir: [number, number, number]): boolean {
      const getVoxels = (x: number, y: number, z: number): boolean => {
        if (axis === 0) return x < -1 || x > 0;
        if (axis === 1) return y < -1 || y > 0;
        if (axis === 2) return z < -1 || z > 0;
        return false;
      };
      box.setPosition([-1, -1, -1]);
      const adjDir = dir.slice() as [number, number, number];
      adjDir[axis] = 0;
      const expectedDist = mag(adjDir);
      const dist = sweep(getVoxels, box, dir, callback);
      return equals(dist, expectedDist);
    }

    expect(testAxis(0, [0, 3, 3]), 'No collision between two walls, axis X').toBe(true);
    expect(testAxis(1, [3, 0, 3]), 'No collision between two walls, axis Y').toBe(true);
    expect(testAxis(2, [3, 3, 0]), 'No collision between two walls, axis Z').toBe(true);

    expect(testAxis(0, [3, 3, 3]), 'No collision moving into two walls, axis X').toBe(true);
    expect(testAxis(1, [3, 3, 3]), 'No collision moving into two walls, axis Y').toBe(true);
    expect(testAxis(2, [3, 3, 3]), 'No collision moving into two walls, axis Z').toBe(true);

    expect(testAxis(0, [-3, 3, 3]), 'No collision moving into two walls, axis X').toBe(true);
    expect(testAxis(1, [3, -3, 3]), 'No collision moving into two walls, axis Y').toBe(true);
    expect(testAxis(2, [3, 3, -3]), 'No collision moving into two walls, axis Z').toBe(true);
  });
});
