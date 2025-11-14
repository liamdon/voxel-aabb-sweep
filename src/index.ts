import type { Vec3, IAABB, GetVoxelFunction, CollisionCallback } from './types';

/**
 * Internal state arrays reused across sweep operations to minimize garbage collection.
 * Using Float64Array for monomorphic hidden classes and predictable V8 optimization.
 * These arrays store intermediate calculations during the sweep algorithm.
 */
const tr_arr = new Float64Array(3);
const ldi_arr = new Float64Array(3);
const tri_arr = new Float64Array(3);
const step_arr = new Float64Array(3);
const tDelta_arr = new Float64Array(3);
const tNext_arr = new Float64Array(3);
const vec_arr = new Float64Array(3);
const normed_arr = new Float64Array(3);
const base_arr = new Float64Array(3);
const max_arr = new Float64Array(3);
const left_arr = new Float64Array(3);
const result_arr = new Float64Array(3);

/**
 * Sweep context containing all state for the current sweep operation.
 * Extracted to module level to enable V8 function inlining.
 */
interface SweepContext {
  getVoxel: GetVoxelFunction;
  callback: CollisionCallback;
  vec: Float64Array;
  base: Float64Array;
  max: Float64Array;
  epsilon: number;
  tr: Float64Array;
  ldi: Float64Array;
  tri: Float64Array;
  step: Float64Array;
  tDelta: Float64Array;
  tNext: Float64Array;
  normed: Float64Array;
  cumulative_t: number;
  t: number;
  max_t: number;
  axis: number;
}

/**
 * Convert a leading edge coordinate to its voxel integer coordinate.
 * Extracted to module level for V8 inlining optimization.
 */
function leadEdgeToInt(coord: number, step: number, epsilon: number): number {
  return Math.floor(coord - step * epsilon);
}

/**
 * Convert a trailing edge coordinate to its voxel integer coordinate.
 * Extracted to module level for V8 inlining optimization.
 */
function trailEdgeToInt(coord: number, step: number, epsilon: number): number {
  return Math.floor(coord + step * epsilon);
}

/**
 * Initialize the sweep parameters for the current movement vector.
 * Calculates step directions, voxel boundaries, and parametric distances.
 * Extracted to module level for V8 inlining optimization.
 */
function initSweep(ctx: SweepContext): void {
  const { vec, max, base, step, tr, ldi, tri, normed, tDelta, tNext, epsilon } = ctx;

  // Parametrization t along raycast (0 to max_t represents full movement)
  ctx.t = 0.0;
  ctx.max_t = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
  if (ctx.max_t === 0) return;

  for (let i = 0; i < 3; i++) {
    const dir = vec[i] >= 0;
    step[i] = dir ? 1 : -1;

    // Leading and trailing edge coordinates
    const lead = dir ? max[i] : base[i];
    tr[i] = dir ? base[i] : max[i];

    // Integer voxel coordinates of lead/trail edges
    ldi[i] = leadEdgeToInt(lead, step[i], epsilon);
    tri[i] = trailEdgeToInt(tr[i], step[i], epsilon);

    // Normalized direction vector
    normed[i] = vec[i] / ctx.max_t;

    // Distance along t required to move one voxel in this axis
    tDelta[i] = Math.abs(1 / normed[i]);

    // Distance to the nearest voxel boundary in units of t
    const dist = dir ? ldi[i] + 1 - lead : lead - ldi[i];
    tNext[i] = tDelta[i] < Infinity ? tDelta[i] * dist : Infinity;
  }
}

/**
 * Check for collisions across the AABB's leading face in the given axis.
 * Extracted to module level for V8 inlining optimization.
 */
function checkCollision(ctx: SweepContext, i_axis: number): boolean {
  const { getVoxel, step, ldi, tri, base, max } = ctx;

  const stepx = step[0];
  const x0 = i_axis === 0 ? ldi[0] : tri[0];
  const x1 = ldi[0] + stepx;

  const stepy = step[1];
  const y0 = i_axis === 1 ? ldi[1] : tri[1];
  const y1 = ldi[1] + stepy;

  const stepz = step[2];
  const z0 = i_axis === 2 ? ldi[2] : tri[2];
  const z1 = ldi[2] + stepz;

  // Hoist leading edge calculations outside loops (V8 optimization)
  const leadX = step[0] > 0 ? max[0] : base[0];
  const leadY = step[1] > 0 ? max[1] : base[1];
  const leadZ = step[2] > 0 ? max[2] : base[2];

  // Iterate over all voxels on the leading face
  for (let x = x0; x !== x1; x += stepx) {
    // Pre-calculate dx once per x iteration
    let dx = leadX - x;
    dx = dx - Math.floor(dx);

    for (let y = y0; y !== y1; y += stepy) {
      // Pre-calculate dy once per y iteration
      let dy = leadY - y;
      dy = dy - Math.floor(dy);

      for (let z = z0; z !== z1; z += stepz) {
        // Calculate dz once per z iteration
        let dz = leadZ - z;
        dz = dz - Math.floor(dz);

        if (getVoxel(x, y, z, dx, dy, dz)) return true;
      }
    }
  }
  return false;
}

/**
 * Handle a collision by invoking the callback and updating sweep state.
 * Extracted to module level for V8 inlining optimization.
 */
function handleCollision(ctx: SweepContext): boolean {
  const { callback, vec, base, max, step, axis, t, max_t } = ctx;

  // Update cumulative distance and get collision direction
  ctx.cumulative_t += t;
  const dir = step[axis];

  // Calculate how much of the movement vector has been completed
  const done = t / max_t;
  const left = left_arr;

  for (let i = 0; i < 3; i++) {
    const dv = vec[i] * done;
    base[i] += dv;
    max[i] += dv;
    left[i] = vec[i] - dv;
  }

  // Snap the leading edge exactly to the voxel boundary
  if (dir > 0) {
    max[axis] = Math.round(max[axis]);
  } else {
    base[axis] = Math.round(base[axis]);
  }

  // Invoke the callback to let the user handle the collision
  const res = callback(ctx.cumulative_t, axis, dir, left as any);

  // If callback returns truthy, stop the sweep
  if (res) return true;

  // Re-initialize for a new sweep with the remaining vector
  for (let i = 0; i < 3; i++) vec[i] = left[i];
  initSweep(ctx);
  if (ctx.max_t === 0) return true; // No vector left to sweep

  return false;
}

/**
 * Advance the raycast to the next voxel boundary.
 * Extracted to module level for V8 inlining optimization.
 */
function stepForward(ctx: SweepContext): number {
  const { tNext, step, ldi, tDelta, tr, tri, normed } = ctx;

  // Find the axis with the nearest voxel boundary
  const axis =
    tNext[0] < tNext[1]
      ? tNext[0] < tNext[2]
        ? 0
        : 2
      : tNext[1] < tNext[2]
        ? 1
        : 2;

  const dt = tNext[axis] - ctx.t;
  ctx.t = tNext[axis];
  ldi[axis] += step[axis];
  tNext[axis] += tDelta[axis];

  // Update trailing edge positions for all axes
  for (let i = 0; i < 3; i++) {
    tr[i] += dt * normed[i];
    tri[i] = trailEdgeToInt(tr[i], step[i], ctx.epsilon);
  }

  return axis;
}

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
 * @param checkStartingVoxel - If true, check if the AABB starts inside a solid voxel
 * @returns The total scalar distance traveled during the sweep
 */
function sweep_impl(
  getVoxel: GetVoxelFunction,
  callback: CollisionCallback,
  vec: Float64Array,
  base: Float64Array,
  max: Float64Array,
  epsilon: number,
  checkStartingVoxel: boolean
): number {
  // Create sweep context for module-level functions (enables V8 inlining)
  const ctx: SweepContext = {
    getVoxel,
    callback,
    vec,
    base,
    max,
    epsilon,
    tr: tr_arr,
    ldi: ldi_arr,
    tri: tri_arr,
    step: step_arr,
    tDelta: tDelta_arr,
    tNext: tNext_arr,
    normed: normed_arr,
    cumulative_t: 0.0,
    t: 0.0,
    max_t: 0.0,
    axis: 0,
  };

  // Initialize sweep parameters
  initSweep(ctx);
  if (ctx.max_t === 0) return 0;

  // Check if AABB's leading face starts inside a solid voxel
  if (checkStartingVoxel) {
    for (let checkAxis = 0; checkAxis < 3; checkAxis++) {
      if (checkCollision(ctx, checkAxis)) {
        // Found a solid voxel at the starting position
        const left = left_arr;
        for (let i = 0; i < 3; i++) left[i] = vec[i];
        const res = callback(0, checkAxis, ctx.step[checkAxis], left as any);

        // If callback returns truthy, stop immediately
        if (res) return 0;

        // If callback modified the vector, re-initialize the sweep
        let vecModified = false;
        for (let i = 0; i < 3; i++) {
          if (left[i] !== vec[i]) {
            vec[i] = left[i];
            vecModified = true;
          }
        }

        if (vecModified) {
          initSweep(ctx);
          if (ctx.max_t === 0) return 0;
        }

        // Only check one axis - if we found a collision, we've handled it
        break;
      }
    }
  }

  ctx.axis = stepForward(ctx);

  // Main loop: advance along the raycast vector
  while (ctx.t <= ctx.max_t) {
    // Check for collisions on the leading face of the AABB
    if (checkCollision(ctx, ctx.axis)) {
      // Handle the collision and decide whether to continue
      const done = handleCollision(ctx);
      if (done) return ctx.cumulative_t;
    }

    ctx.axis = stepForward(ctx);
  }

  // Reached the end of the vector without obstruction
  ctx.cumulative_t += ctx.max_t;
  for (let i = 0; i < 3; i++) {
    base[i] += vec[i];
    max[i] += vec[i];
  }
  return ctx.cumulative_t;
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
 * @example
 * ```typescript
 * // Detect collisions when starting inside a solid voxel
 * const distance = sweep(
 *   getVoxel,
 *   box,
 *   direction,
 *   (dist, axis, dir, vec) => {
 *     if (dist === 0) {
 *       console.log('Started inside a solid voxel!');
 *     }
 *     return true;
 *   },
 *   false,
 *   1e-10,
 *   true // checkStartingVoxel enabled
 * );
 * ```
 *
 * @param getVoxel - Function that returns truthy for solid voxels at (x,y,z)
 * @param box - The AABB to sweep, with base/max corners and a translate method
 * @param dir - The direction vector along which to move the AABB
 * @param callback - Function called when a collision occurs
 * @param noTranslate - If true, don't automatically translate the box to its final position
 * @param epsilon - Precision factor for voxel boundary crossing (default: 1e-10)
 * @param checkStartingVoxel - If true, check if the AABB's leading face starts inside a solid voxel (default: false)
 * @returns The total scalar distance the AABB traveled during the sweep
 */
export function sweep(
  getVoxel: GetVoxelFunction,
  box: IAABB,
  dir: Vec3,
  callback: CollisionCallback,
  noTranslate: boolean = false,
  epsilon: number = 1e-10,
  checkStartingVoxel: boolean = false
): number {
  const vec = vec_arr;
  const base = base_arr;
  const max = max_arr;
  const result = result_arr;

  // Initialize parameter arrays with input values (direct assignment for V8 optimization)
  vec[0] = +dir[0];
  vec[1] = +dir[1];
  vec[2] = +dir[2];
  max[0] = +box.max[0];
  max[1] = +box.max[1];
  max[2] = +box.max[2];
  base[0] = +box.base[0];
  base[1] = +box.base[1];
  base[2] = +box.base[2];

  // Run the core sweep implementation
  const dist = sweep_impl(getVoxel, callback, vec, base, max, epsilon, checkStartingVoxel);

  // Translate the box to its final position (unless disabled)
  if (!noTranslate) {
    result[0] = dir[0] > 0 ? max[0] - box.max[0] : base[0] - box.base[0];
    result[1] = dir[1] > 0 ? max[1] - box.max[1] : base[1] - box.base[1];
    result[2] = dir[2] > 0 ? max[2] - box.max[2] : base[2] - box.base[2];
    box.translate(result as any);
  }

  // Return total distance moved (not necessarily the magnitude of [end]-[start])
  return dist;
}

export default sweep;
