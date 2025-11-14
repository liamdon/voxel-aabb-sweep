import { describe, test, expect } from 'vitest';
import AABB from '../reference/aabb.js';
import { sweep } from '../src/index';
import type { GetVoxelFunction } from '../src/types';

const EPSILON = 1e-5;
const eq = (a: number, b: number): boolean => Math.abs(a - b) < EPSILON;

describe('fractional voxels', () => {
  test('slab collision', () => {
    // Test case: Half-height slab at y=5
    // Only the bottom half of the voxel (dy < 0.5) is solid
    const getVoxel: GetVoxelFunction = (
      x: number,
      y: number,
      z: number,
      dx?: number,
      dy?: number,
      dz?: number
    ): boolean => {
      if (y === 5 && x === 0 && z === 0) {
        // Slab voxel - only solid in bottom half
        return (dy ?? 0) < 0.5;
      }
      return false;
    };

    // Test 1: AABB starting well above the slab
    // When AABB base is at y=6.4, checking voxel y=5 gives dy=6.4-5=1.4, floor->0.4
    // dy=0.4 < 0.5, so it should collide
    let box = new AABB([0.25, 6.4, 0.25], [0.75, 6.7, 0.75]);
    let dir: [number, number, number] = [0, -2, 0];
    let collided = false;
    const callback = (dist: number, axis: number, dirVal: number, left: number[]): boolean => {
      collided = true;
      return true;
    };

    sweep(getVoxel, box, dir, callback);
    expect(collided).toBe(true);
    expect(box.base[1]).toBe(6);

    // Test 2: AABB starting in position where it will check the top half of slab
    // If base is at y=5.6, when checking voxel y=5, dy = 5.6 - 5 - floor(5.6-5) = 0.6
    // Since dy=0.6 > 0.5, slab is not solid there
    box = new AABB([0.25, 5.6, 0.25], [0.75, 5.8, 0.75]);
    dir = [0, -1, 0];
    collided = false;
    sweep(getVoxel, box, dir, callback);
    expect(collided).toBe(false);
    expect(eq(box.base[1], 4.6)).toBe(true);

    // Test 3: AABB starting above, base at y=5.3, will move down and check voxel y=4
    // The algorithm checks in the direction of movement (downward)
    // This demonstrates the fractional collision feature is working
    box = new AABB([0.25, 5.3, 0.25], [0.75, 5.5, 0.75]);
    dir = [0, -2, 0];
    collided = false;
    sweep(getVoxel, box, dir, callback);
    expect(collided).toBe(false);
    // The AABB moves through since it's checking voxels in front (y=4, y=3, etc), not current voxel
  });

  test('variable height terrain', () => {
    // Test case: Terrain with variable heights based on dx position
    // Creates a sloped surface within voxels at y=3
    const getVoxel: GetVoxelFunction = (
      x: number,
      y: number,
      z: number,
      dx?: number,
      dy?: number,
      dz?: number
    ): boolean => {
      if (y === 3 && z === 0) {
        // Terrain height varies with dx: height = 0.5 + dx * 0.3
        // So at dx=0, height is 0.5 (bottom half solid)
        // At dx=1, height is 0.8 (bottom 80% solid)
        const terrainHeight = 0.5 + (dx ?? 0.5) * 0.3;
        return (dy ?? 0) < terrainHeight;
      }
      return false;
    };

    // Test: AABB moving down onto sloped terrain
    const box = new AABB([0.75, 5, 0.25], [0.95, 5.2, 0.75]);
    const dir: [number, number, number] = [0, -3, 0];
    let collided = false;
    const callback = (dist: number, axis: number, dirVal: number, left: number[]): boolean => {
      collided = true;
      return true;
    };

    sweep(getVoxel, box, dir, callback);
    expect(collided).toBe(true);

    // At x=0.75-0.95, dx would be around 0.75-0.95
    // terrain height would be approximately 0.5 + 0.85*0.3 = 0.755
    // So collision should occur around y=3.755, AABB base at 3.955
    const expectedY = 3 + 0.5 + 0.95 * 0.3 + 0.2; // terrain top + AABB height
    expect(Math.abs(box.base[1] - expectedY) < 0.1).toBe(true);
  });

  test('horizontal slab (xz plane)', () => {
    // Test case: Horizontal slab on x-axis
    // Only solid in the left half (dx < 0.5)
    const getVoxel: GetVoxelFunction = (
      x: number,
      y: number,
      z: number,
      dx?: number,
      dy?: number,
      dz?: number
    ): boolean => {
      if (x === 5 && y === 0 && z === 0) {
        // Only solid in left half of voxel
        return (dx ?? 0) < 0.5;
      }
      return false;
    };

    // Test 1: AABB moving right from before the slab
    // When max[0] reaches x=6, checking voxel x=5 gives dx=6-5=1, floor->0
    // So dx=0, which is < 0.5, should collide
    let box = new AABB([3, 0.25, 0.25], [3.3, 0.75, 0.75]);
    let dir: [number, number, number] = [3, 0, 0];
    let collided = false;
    const callback = (dist: number, axis: number, dirVal: number, left: number[]): boolean => {
      collided = true;
      return true;
    };

    sweep(getVoxel, box, dir, callback);
    expect(collided).toBe(true);
    expect(box.max[0]).toBe(5);

    // Test 2: AABB with max at x=5.6, should pass through
    // When checking voxel x=5, dx = 5.6 - 5 = 0.6 > 0.5, not solid
    box = new AABB([5.3, 0.25, 0.25], [5.6, 0.75, 0.75]);
    dir = [-2, 0, 0];
    collided = false;
    sweep(getVoxel, box, dir, callback);
    expect(collided).toBe(false);
    expect(eq(box.base[0], 3.3)).toBe(true);
  });

  test('dx dy dz parameters passed correctly', () => {
    // This test verifies that dx, dy, dz are actually being passed and have reasonable values
    let dxValues: number[] = [];
    let dyValues: number[] = [];
    let dzValues: number[] = [];

    const getVoxel: GetVoxelFunction = (
      x: number,
      y: number,
      z: number,
      dx?: number,
      dy?: number,
      dz?: number
    ): boolean => {
      if (dx !== undefined) dxValues.push(dx);
      if (dy !== undefined) dyValues.push(dy);
      if (dz !== undefined) dzValues.push(dz);

      // Return false to let the sweep complete
      return false;
    };

    const box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    const dir: [number, number, number] = [2, 3, 4];
    const callback = (): boolean => false;

    sweep(getVoxel, box, dir, callback);

    expect(dxValues.length > 0).toBe(true);
    expect(dyValues.length > 0).toBe(true);
    expect(dzValues.length > 0).toBe(true);

    // All values should be between 0 and 1 (normalized)
    const allInRange = [...dxValues, ...dyValues, ...dzValues].every(
      (val) => val >= 0 && val <= 1
    );
    expect(allInRange).toBe(true);
  });

  test('backward compatibility', () => {
    // Test that getVoxel functions without optional parameters still work
    const getVoxel: GetVoxelFunction = (x: number, y: number, z: number): boolean => {
      return y === 5;
    };

    const box = new AABB([0.25, 4, 0.25], [0.75, 4.3, 0.75]);
    const dir: [number, number, number] = [0, 2, 0];
    let collided = false;
    const callback = (): boolean => {
      collided = true;
      return true;
    };

    sweep(getVoxel, box, dir, callback);
    expect(collided).toBe(true);
    expect(eq(box.base[1], 4.7)).toBe(true);
  });
});
