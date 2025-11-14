import { describe, test, expect } from 'vitest';
import AABB from '../reference/aabb.js';
import { sweep } from '../src/index';

const N = 500;
const epsilon = 1e-5;
const equals = (a: number, b: number): boolean => Math.abs(a - b) < epsilon;

describe('correctness', () => {
  test('unobstructed', () => {
    // correct behavior when there's no obstruction
    const noVoxels = (): boolean => false;
    const box = new AABB([0, 0, 0], [0, 0, 0]);
    const dir: [number, number, number] = [0, 0, 0];
    let collided = false;
    const callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
      collided = true;
      return true;
    };

    for (let i = 0; i < N; i++) {
      const expected: number[] = [];
      let sum = 0;
      collided = false;
      // randomize
      for (let j = 0; j < 3; j++) {
        box.base[j] = 1 - 2 * Math.random();
        box.max[j] = box.base[j] + 0.01 + 3 * Math.random();
        dir[j] = 20 * (0.5 - Math.random());
        expected[j] = box.base[j] + dir[j];
        sum += dir[j] * dir[j];
      }
      const dist = Math.sqrt(sum);

      // find results
      const res = sweep(noVoxels, box, dir, callback);

      // compare
      expect(collided, `iteration ${i}: should not collide`).toBe(false);
      expect(equals(box.base[0], expected[0]), `iteration ${i}: box.base[0]`).toBe(true);
      expect(equals(box.base[1], expected[1]), `iteration ${i}: box.base[1]`).toBe(true);
      expect(equals(box.base[2], expected[2]), `iteration ${i}: box.base[2]`).toBe(true);
      expect(equals(dist, res), `iteration ${i}: distance`).toBe(true);
    }
  });

  test('flat wall', () => {
    const getVoxels = [
      (x: number, y: number, z: number): boolean => Math.abs(x) === 5,
      (x: number, y: number, z: number): boolean => Math.abs(y) === 5,
      (x: number, y: number, z: number): boolean => Math.abs(z) === 5,
    ];
    const box = new AABB([0, 0, 0], [1, 1, 1]);
    const callback = (dist: number, axis: number, dir: number, vec: number[]): void => {
      vec[axis] = 0;
    };

    function testWall(axis: number, sign: number): void {
      box.setPosition([1, 1, 1]);
      const dir: [number, number, number] = [2, 2, 2];
      dir[axis] = 10 * sign;
      const expected: number[] = [];
      for (let j = 0; j < 3; j++) expected[j] = box.base[j] + dir[j];
      expected[axis] = sign > 0 ? 4 : -4;
      const dist = sweep(getVoxels[axis], box, dir, callback);

      expect(equals(expected[0], box.base[0]), `axis ${axis}, sign ${sign}: box.base[0]`).toBe(true);
      expect(equals(expected[1], box.base[1]), `axis ${axis}, sign ${sign}: box.base[1]`).toBe(true);
      expect(equals(expected[2], box.base[2]), `axis ${axis}, sign ${sign}: box.base[2]`).toBe(true);
    }

    [0, 1, 2].forEach((axis) => {
      [1, -1].forEach((dir) => {
        testWall(axis, dir);
      });
    });
  });

  test('box', () => {
    const getVoxels = (x: number, y: number, z: number): boolean => {
      if (Math.abs(x) === 5) return true;
      if (Math.abs(y) === 5) return true;
      if (Math.abs(z) === 5) return true;
      return false;
    };
    const box = new AABB([0, 0, 0], [1, 1, 1]);
    const callback = (dist: number, axis: number, dir: number, vec: number[]): void => {
      vec[axis] = 0;
    };

    const testBox = (dx: number, dy: number, dz: number): void => {
      box.setPosition([1, 1, 1]);
      const dir: [number, number, number] = [dx, dy, dz];
      const expected: number[] = [];
      for (let j = 0; j < 3; j++) expected[j] = dir[j] > 0 ? 4 : -4;

      const dist = sweep(getVoxels, box, dir, callback);
      expect(equals(expected[0], box.base[0]), `[${dx}, ${dy}, ${dz}]: box.base[0]`).toBe(true);
      expect(equals(expected[1], box.base[1]), `[${dx}, ${dy}, ${dz}]: box.base[1]`).toBe(true);
      expect(equals(expected[2], box.base[2]), `[${dx}, ${dy}, ${dz}]: box.base[2]`).toBe(true);
    };

    testBox(12, 15, 17);
    testBox(-12, 15, 17);
    testBox(12, -15, 17);
    testBox(-12, -15, 17);
    testBox(12, 15, -17);
    testBox(-12, 15, -17);
    testBox(12, -15, -17);
    testBox(-12, -15, -17);
  });

  test('nearby obstruction', () => {
    const getVoxels = (x: number, y: number, z: number): boolean => {
      if (Math.abs(x) < 2 && Math.abs(y) < 2 && Math.abs(z) < 2) return true;
      return false;
    };
    const box = new AABB([0, 0, 0], [2, 2, 2]);

    const testObstruction = (axis: number, dir: number): void => {
      const arr: [number, number, number] = [-1, -1, -1];
      const vec: [number, number, number] = [6, 6, 6];
      arr[axis] = 10 * dir;
      vec[axis] = -12 * dir;
      box.setPosition(arr);
      const expected = [5, 5, 5];
      expected[axis] = -2 * dir;

      const dist = sweep(getVoxels, box, vec, (dist, axis, dir, vec) => {
        console.log('-------', dist, axis, dir, vec);
        vec[axis] = 0;
        return true;
      });

      expect(equals(expected[0], box.base[0]), `axis ${axis}, dir ${dir}: box.base[0]`).toBe(true);
      expect(equals(expected[1], box.base[1]), `axis ${axis}, dir ${dir}: box.base[1]`).toBe(true);
      expect(equals(expected[2], box.base[2]), `axis ${axis}, dir ${dir}: box.base[2]`).toBe(true);
    };

    testObstruction(0, 1);
    testObstruction(1, 1);
    testObstruction(2, 1);
    testObstruction(0, -1);
    testObstruction(1, -1);
    testObstruction(2, -1);
  });

  test("doesn't go into collided wall", () => {
    const getVoxels = (x: number, y: number, z: number): boolean => {
      if (x >= 10) return true;
      if (x <= -11) return true;
      return false;
    };
    const box = new AABB([0, 0, 0], [1, 1, 1]);
    const callback = (dist: number, axis: number, dir: number, vec: number[]): boolean => {
      return true;
      // vec[axis] = 0
    };
    const vec: number[] = [];

    function testWall(dir: boolean): boolean {
      for (let i = 0; i < 3; i++) {
        box.base[i] = Math.random();
        box.max[i] = box.base[i] + 1 + Math.random();
        vec[i] = 5 * Math.random();
      }
      vec[0] = dir ? 50 : -50;
      const dist = sweep(getVoxels, box, vec as [number, number, number], callback);
      return !(box.max[0] > 10 || box.base[0] < -10);
    }

    for (let i = 0; i < N; i++) {
      const result = testWall(i % 2 === 0);
      expect(result, `iteration ${i}: should not go beyond collision boundary`).toBe(true);
    }
  });
});
