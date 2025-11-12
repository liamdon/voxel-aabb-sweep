import type { Vec3, IAABB, GetVoxelFunction, CollisionCallback } from './types';
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
export declare function sweep(getVoxel: GetVoxelFunction, box: IAABB, dir: Vec3, callback: CollisionCallback, noTranslate?: boolean, epsilon?: number): number;
export default sweep;
//# sourceMappingURL=index.d.ts.map