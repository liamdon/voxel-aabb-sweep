import type { Vec3, IAABB, GetVoxelFunction, CollisionCallback } from './types';

/**
 * Internal state arrays reused across sweep operations to minimize garbage collection.
 * These arrays store intermediate calculations during the sweep algorithm.
 */
const tr_arr: Vec3 = [0, 0, 0];
const ldi_arr: Vec3 = [0, 0, 0];
const tri_arr: Vec3 = [0, 0, 0];
const step_arr: Vec3 = [0, 0, 0];
const tDelta_arr: Vec3 = [0, 0, 0];
const tNext_arr: Vec3 = [0, 0, 0];
const vec_arr: Vec3 = [0, 0, 0];
const normed_arr: Vec3 = [0, 0, 0];
const base_arr: Vec3 = [0, 0, 0];
const max_arr: Vec3 = [0, 0, 0];
const left_arr: Vec3 = [0, 0, 0];
const result_arr: Vec3 = [0, 0, 0];

/**
 * Core sweep implementation using a raycast-based algorithm.
 *
 * This function implements a sophisticated 3D collision detection algorithm that sweeps
 * an Axis-Aligned Bounding Box (AABB) through a voxel grid. Unlike naive approaches that
 * sweep along each axis independently, this algorithm raycasts along the AABB's leading
 * corner and checks for collisions across the AABB's leading face each time a voxel
 * boundary is crossed. This provides accurate, isotropic collision detection even for
 * large movement vectors.
 *
 * Algorithm overview:
 * 1. Treat the sweep as a raycast along the AABB's leading corner
 * 2. As the ray enters each new voxel, iterate over the AABB's leading face in 2D
 * 3. Check for collisions with solid voxels on that face
 * 4. When a collision occurs, invoke the callback to determine how to proceed
 *
 * Based on the fast voxel raycast algorithm:
 * - Implementation: https://github.com/fenomas/fast-voxel-raycast
 * - Paper: http://www.cse.chalmers.se/edu/year/2010/course/TDA361/grid.pdf
 *
 * @param getVoxel - Function that returns truthy values for solid voxels at (x,y,z)
 * @param callback - Function called when a collision occurs
 * @param vec - The movement vector (modified in place during sweep)
 * @param base - The minimum corner of the AABB (modified in place)
 * @param max - The maximum corner of the AABB (modified in place)
 * @param epsilon - Small value to handle floating-point precision at voxel boundaries
 * @returns The total scalar distance traveled during the sweep
 */
function sweep_impl(
  getVoxel: GetVoxelFunction,
  callback: CollisionCallback,
  vec: Vec3,
  base: Vec3,
  max: Vec3,
  epsilon: number
): number {
  // Reuse pre-allocated arrays for intermediate calculations
  const tr = tr_arr;
  const ldi = ldi_arr;
  const tri = tri_arr;
  const step = step_arr;
  const tDelta = tDelta_arr;
  const tNext = tNext_arr;
  const normed = normed_arr;

  const floor = Math.floor;
  let cumulative_t = 0.0;
  let t = 0.0;
  let max_t = 0.0;
  let axis = 0;
  let i = 0;

  /**
   * Initialize the sweep parameters for the current movement vector.
   * Calculates step directions, voxel boundaries, and parametric distances.
   */
  function initSweep(): void {
    // Parametrization t along raycast (0 to max_t represents full movement)
    t = 0.0;
    max_t = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
    if (max_t === 0) return;

    for (let i = 0; i < 3; i++) {
      const dir = vec[i] >= 0;
      step[i] = dir ? 1 : -1;

      // Leading and trailing edge coordinates
      const lead = dir ? max[i] : base[i];
      tr[i] = dir ? base[i] : max[i];

      // Integer voxel coordinates of lead/trail edges
      ldi[i] = leadEdgeToInt(lead, step[i]);
      tri[i] = trailEdgeToInt(tr[i], step[i]);

      // Normalized direction vector
      normed[i] = vec[i] / max_t;

      // Distance along t required to move one voxel in this axis
      tDelta[i] = Math.abs(1 / normed[i]);

      // Distance to the nearest voxel boundary in units of t
      const dist = dir ? ldi[i] + 1 - lead : lead - ldi[i];
      tNext[i] = tDelta[i] < Infinity ? tDelta[i] * dist : Infinity;
    }
  }

  /**
   * Check for collisions across the AABB's leading face in the given axis.
   *
   * When the raycast crosses a voxel boundary in a particular axis, this function
   * checks all voxels that intersect with the AABB's leading face perpendicular
   * to that axis.
   *
   * @param i_axis - The axis (0=x, 1=y, 2=z) along which we just stepped
   * @returns True if any solid voxel was found on the leading face
   */
  function checkCollision(i_axis: number): boolean {
    const stepx = step[0];
    const x0 = i_axis === 0 ? ldi[0] : tri[0];
    const x1 = ldi[0] + stepx;

    const stepy = step[1];
    const y0 = i_axis === 1 ? ldi[1] : tri[1];
    const y1 = ldi[1] + stepy;

    const stepz = step[2];
    const z0 = i_axis === 2 ? ldi[2] : tri[2];
    const z1 = ldi[2] + stepz;

    // Iterate over all voxels on the leading face
    for (let x = x0; x !== x1; x += stepx) {
      for (let y = y0; y !== y1; y += stepy) {
        for (let z = z0; z !== z1; z += stepz) {
          if (getVoxel(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  /**
   * Handle a collision by invoking the callback and updating sweep state.
   *
   * When a collision is detected, this function:
   * 1. Updates the AABB position to the collision point
   * 2. Snaps the colliding edge exactly to the voxel boundary
   * 3. Invokes the user callback with collision information
   * 4. Re-initializes the sweep with any remaining movement vector
   *
   * @returns True if the sweep should stop, false to continue
   */
  function handleCollision(): boolean {
    // Update cumulative distance and get collision direction
    cumulative_t += t;
    const dir = step[axis];

    // Calculate how much of the movement vector has been completed
    const done = t / max_t;
    const left = left_arr;
    for (i = 0; i < 3; i++) {
      const dv = vec[i] * done;
      base[i] += dv;
      max[i] += dv;
      left[i] = vec[i] - dv;
    }

    // Snap the leading edge exactly to the voxel boundary
    // This prevents floating-point rounding errors from causing the AABB
    // to slightly penetrate the colliding voxel
    if (dir > 0) {
      max[axis] = Math.round(max[axis]);
    } else {
      base[axis] = Math.round(base[axis]);
    }

    // Invoke the callback to let the user handle the collision
    const res = callback(cumulative_t, axis, dir, left);

    // If callback returns truthy, stop the sweep
    if (res) return true;

    // Re-initialize for a new sweep with the remaining vector
    for (i = 0; i < 3; i++) vec[i] = left[i];
    initSweep();
    if (max_t === 0) return true; // No vector left to sweep

    return false;
  }

  /**
   * Advance the raycast to the next voxel boundary.
   *
   * Determines which axis will be crossed next (the one with minimum tNext),
   * advances the parametric position t to that boundary, and updates all
   * relevant sweep state.
   *
   * @returns The axis (0=x, 1=y, 2=z) that was stepped along
   */
  function stepForward(): number {
    // Find the axis with the nearest voxel boundary
    const axis =
      tNext[0] < tNext[1]
        ? tNext[0] < tNext[2]
          ? 0
          : 2
        : tNext[1] < tNext[2]
          ? 1
          : 2;

    const dt = tNext[axis] - t;
    t = tNext[axis];
    ldi[axis] += step[axis];
    tNext[axis] += tDelta[axis];

    // Update trailing edge positions for all axes
    for (i = 0; i < 3; i++) {
      tr[i] += dt * normed[i];
      tri[i] = trailEdgeToInt(tr[i], step[i]);
    }

    return axis;
  }

  /**
   * Convert a leading edge coordinate to its voxel integer coordinate.
   *
   * The leading edge is the front face of the AABB in the direction of movement.
   * The epsilon value prevents floating-point errors at voxel boundaries.
   *
   * @param coord - The floating-point coordinate of the edge
   * @param step - The step direction (1 or -1)
   * @returns The integer voxel coordinate
   */
  function leadEdgeToInt(coord: number, step: number): number {
    return floor(coord - step * epsilon);
  }

  /**
   * Convert a trailing edge coordinate to its voxel integer coordinate.
   *
   * The trailing edge is the back face of the AABB opposite to the direction
   * of movement. The epsilon value prevents floating-point errors at boundaries.
   *
   * @param coord - The floating-point coordinate of the edge
   * @param step - The step direction (1 or -1)
   * @returns The integer voxel coordinate
   */
  function trailEdgeToInt(coord: number, step: number): number {
    return floor(coord + step * epsilon);
  }

  // Initialize sweep parameters and take the first step
  initSweep();
  if (max_t === 0) return 0;

  axis = stepForward();

  // Main loop: advance along the raycast vector
  while (t <= max_t) {
    // Check for collisions on the leading face of the AABB
    if (checkCollision(axis)) {
      // Handle the collision and decide whether to continue
      const done = handleCollision();
      if (done) return cumulative_t;
    }

    axis = stepForward();
  }

  // Reached the end of the vector without obstruction
  cumulative_t += max_t;
  for (i = 0; i < 3; i++) {
    base[i] += vec[i];
    max[i] += vec[i];
  }
  return cumulative_t;
}

/**
 * Sweep an Axis-Aligned Bounding Box (AABB) through a voxel grid.
 *
 * This function moves an AABB along a given direction vector and detects collisions
 * with solid voxels. Unlike naive approaches that sweep along each axis independently,
 * this implementation uses a raycast-based algorithm that provides accurate, isotropic
 * collision detection even for large movements.
 *
 * The algorithm works by raycasting along the AABB's leading corner and checking for
 * collisions across the AABB's leading face each time a voxel boundary is crossed.
 * This ensures correct collision detection regardless of movement direction or magnitude.
 *
 * @example
 * ```typescript
 * // Define a voxel getter function
 * const getVoxel = (x: number, y: number, z: number) => y > 5;
 *
 * // Create an AABB
 * const box = { base: [0, 0, 0], max: [1, 1, 1], translate: (v) => { ... } };
 *
 * // Define a movement vector
 * const direction = [5, 10, -4];
 *
 * // Sweep and handle collisions
 * const distance = sweep(getVoxel, box, direction, (dist, axis, dir, vec) => {
 *   console.log(`Collision at distance ${dist} on axis ${axis}`);
 *   return true; // Stop at first collision
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Physics engine usage: slide along obstacles
 * const distance = sweep(getVoxel, box, direction, (dist, axis, dir, vec) => {
 *   vec[axis] = 0; // Stop movement in the colliding axis
 *   return false;  // Continue sweeping in other axes
 * });
 * ```
 *
 * @param getVoxel - Function that returns truthy for solid voxels at (x,y,z)
 * @param box - The AABB to sweep, with base/max corners and a translate method
 * @param dir - The direction vector along which to move the AABB
 * @param callback - Function called when a collision occurs
 * @param noTranslate - If true, don't automatically translate the box to its final position
 * @param epsilon - Precision factor for voxel boundary crossing (default: 1e-10)
 * @returns The total scalar distance the AABB traveled during the sweep
 */
export function sweep(
  getVoxel: GetVoxelFunction,
  box: IAABB,
  dir: Vec3,
  callback: CollisionCallback,
  noTranslate?: boolean,
  epsilon?: number
): number {
  const vec = vec_arr;
  const base = base_arr;
  const max = max_arr;
  const result = result_arr;

  // Initialize parameter arrays with input values
  for (let i = 0; i < 3; i++) {
    vec[i] = +dir[i];
    max[i] = +box.max[i];
    base[i] = +box.base[i];
  }

  if (!epsilon) epsilon = 1e-10;

  // Run the core sweep implementation
  const dist = sweep_impl(getVoxel, callback, vec, base, max, epsilon);

  // Translate the box to its final position (unless disabled)
  if (!noTranslate) {
    for (let i = 0; i < 3; i++) {
      result[i] = dir[i] > 0 ? max[i] - box.max[i] : base[i] - box.base[i];
    }
    box.translate(result);
  }

  // Return total distance moved (not necessarily the magnitude of [end]-[start])
  return dist;
}

export default sweep;
