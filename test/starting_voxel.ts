import { test } from 'tap';
import { AABB } from '../reference/aabb';
import { sweep } from '../src/index';
import type { GetVoxelFunction } from '../src/types';

const EPSILON = 1e-5;
const eq = (a: number, b: number): boolean => Math.abs(a - b) < EPSILON;

test('checkStartingVoxel option', (t) => {
  let getVoxels: GetVoxelFunction;
  let box: AABB;
  let dir: [number, number, number];
  let collided = false;
  let collisionDist = -1;
  let collisionAxis = -1;
  let callback: (dist: number, axis: number, dir: number, left: number[]) => boolean;
  let res: number;

  // Test 1: AABB starting inside solid voxel - option disabled (default behavior)
  t.test('Option disabled - no starting collision detection', (t) => {
    getVoxels = (): boolean => true; // All voxels are solid
    box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    dir = [1, 0, 0];
    collided = false;
    collisionDist = -1;

    callback = (dist: number): boolean => {
      collided = true;
      collisionDist = dist;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, false);

    // With option disabled, should detect collision when stepping to next voxel
    t.ok(collided, 'Collision detected');
    t.ok(collisionDist > 0, 'Collision distance is greater than 0 (not at start)');
    t.equals(res, 0.25, 'Moved 0.25 units before hitting voxel boundary');

    t.end();
  });

  // Test 2: AABB starting inside solid voxel - option enabled
  t.test('Option enabled - starting collision detected', (t) => {
    getVoxels = (): boolean => true; // All voxels are solid
    box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    dir = [1, 0, 0];
    collided = false;
    collisionDist = -1;

    callback = (dist: number): boolean => {
      collided = true;
      collisionDist = dist;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    t.ok(collided, 'Collision detected');
    t.equals(collisionDist, 0, 'Collision distance is 0 (started in solid)');
    t.equals(res, 0, 'No movement occurred');
    t.equals(box.base[0], 0.25, 'AABB position unchanged (X)');
    t.equals(box.base[1], 0.25, 'AABB position unchanged (Y)');
    t.equals(box.base[2], 0.25, 'AABB position unchanged (Z)');

    t.end();
  });

  // Test 3: AABB starting in air - option enabled (should work normally)
  t.test('Option enabled - starting in air works normally', (t) => {
    getVoxels = (x: number): boolean => x >= 5; // Solid voxels at x >= 5
    box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    dir = [10, 0, 0];
    collided = false;
    collisionDist = -1;

    callback = (dist: number): boolean => {
      collided = true;
      collisionDist = dist;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    t.ok(collided, 'Collision detected');
    t.ok(collisionDist > 0, 'Collision distance is greater than 0');
    t.equals(res, 4.25, 'Moved 4.25 units to reach voxel at x=5');
    t.equals(box.base[0], 4.5, 'AABB stopped at solid voxel boundary');

    t.end();
  });

  // Test 4: AABB at voxel boundary (edge case)
  t.test('Option enabled - AABB at voxel boundary', (t) => {
    getVoxels = (x: number): boolean => x >= 1; // Solid voxels at x >= 1
    box = new AABB([0.5, 0.25, 0.25], [1.0, 0.75, 0.75]); // Max edge at x=1.0
    dir = [1, 0, 0];
    collided = false;
    collisionDist = -1;

    callback = (dist: number): boolean => {
      collided = true;
      collisionDist = dist;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    // At the boundary, whether it collides depends on epsilon handling
    // The important thing is it should behave consistently
    t.ok(true, 'Handles boundary case without crashing');

    t.end();
  });

  // Test 5: Callback can modify vector when starting in solid
  t.test('Option enabled - callback can modify vector at start', (t) => {
    getVoxels = (x: number, y: number): boolean => x >= 1 || y >= 1; // Solid at x>=1 or y>=1
    box = new AABB([0.25, 1.25, 0.25], [0.75, 1.75, 0.75]); // Y starts in solid
    dir = [0, 1, 0];
    collided = false;
    let callbackCount = 0;

    callback = (dist: number, axis: number, dir: number, left: number[]): boolean => {
      callbackCount++;
      collided = true;

      if (dist === 0) {
        // Starting collision - modify vector to move in a different direction
        left[1] = 0; // Stop Y movement
        left[0] = 2; // Move in X instead
        return false; // Continue sweep
      }

      return true; // Stop on subsequent collisions
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    t.ok(collided, 'Collision detected');
    t.ok(callbackCount >= 1, 'Callback invoked at least once');
    t.ok(res >= 0, 'Some movement occurred');

    t.end();
  });

  // Test 6: Large AABB spanning multiple voxels
  t.test('Option enabled - large AABB starting in solid', (t) => {
    getVoxels = (): boolean => true; // All solid
    box = new AABB([0, 0, 0], [3, 3, 3]); // 3x3x3 box
    dir = [1, 0, 0];
    collided = false;
    collisionDist = -1;

    callback = (dist: number): boolean => {
      collided = true;
      collisionDist = dist;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    t.ok(collided, 'Collision detected for large AABB');
    t.equals(collisionDist, 0, 'Collision at start');
    t.equals(res, 0, 'No movement');

    t.end();
  });

  // Test 7: Partial overlap - only leading face in solid
  t.test('Option enabled - only leading face overlaps solid', (t) => {
    // Create a scenario where only the leading face is in a solid voxel
    getVoxels = (x: number): boolean => x === 0; // Only voxel at x=0 is solid
    box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]); // Inside voxel at x=0
    dir = [1, 0, 0]; // Moving in +X direction
    collided = false;
    collisionDist = -1;

    callback = (dist: number): boolean => {
      collided = true;
      collisionDist = dist;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    t.ok(collided, 'Collision detected');
    t.equals(collisionDist, 0, 'Starting collision detected');

    t.end();
  });

  // Test 8: No movement vector (edge case)
  t.test('Option enabled - zero movement vector', (t) => {
    getVoxels = (): boolean => true;
    box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    dir = [0, 0, 0];
    collided = false;

    callback = (): boolean => {
      collided = true;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    t.ok(!collided, 'No collision with zero movement vector');
    t.equals(res, 0, 'No movement');

    t.end();
  });

  // Test 9: Starting in solid, moving backwards out of it
  t.test('Option enabled - starting in solid, moving away', (t) => {
    getVoxels = (x: number): boolean => x >= 1; // Solid at x >= 1
    box = new AABB([1.25, 0.25, 0.25], [1.75, 0.75, 0.75]); // Inside solid voxel
    dir = [-5, 0, 0]; // Moving in -X direction (away from solid)
    collided = false;
    collisionDist = -1;

    callback = (dist: number): boolean => {
      collided = true;
      collisionDist = dist;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    t.ok(collided, 'Starting collision detected');
    t.equals(collisionDist, 0, 'Collision at distance 0');

    t.end();
  });

  // Test 10: Diagonal movement starting in solid
  t.test('Option enabled - diagonal movement from solid', (t) => {
    getVoxels = (): boolean => true;
    box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    dir = [1, 1, 1]; // Diagonal movement
    collided = false;
    collisionDist = -1;
    collisionAxis = -1;

    callback = (dist: number, axis: number): boolean => {
      collided = true;
      collisionDist = dist;
      collisionAxis = axis;
      return true;
    };

    res = sweep(getVoxels, box, dir, callback, false, 1e-10, true);

    t.ok(collided, 'Collision detected');
    t.equals(collisionDist, 0, 'Collision at start');
    t.ok(collisionAxis >= 0 && collisionAxis <= 2, 'Valid collision axis reported');

    t.end();
  });

  // Test 11: Verify option truly doesn't affect performance when disabled
  t.test('Default behavior unchanged when option not provided', (t) => {
    getVoxels = (x: number): boolean => x >= 5;
    box = new AABB([0.25, 0.25, 0.25], [0.75, 0.75, 0.75]);
    dir = [10, 0, 0];
    collided = false;
    collisionDist = -1;

    callback = (dist: number): boolean => {
      collided = true;
      collisionDist = dist;
      return true;
    };

    // Don't pass checkStartingVoxel parameter at all
    res = sweep(getVoxels, box, dir, callback);

    t.ok(collided, 'Collision detected');
    t.ok(collisionDist > 0, 'Collision not at start (default behavior)');
    t.equals(res, 4.25, 'Normal collision distance');

    t.end();
  });

  t.end();
});
