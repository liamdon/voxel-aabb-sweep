/**
 * Represents a 3D vector with x, y, and z components.
 * Strict tuple type for V8 monomorphic optimization.
 */
export type Vec3 = [number, number, number];

/**
 * Axis-Aligned Bounding Box (AABB) interface.
 * Represents a box in 3D space aligned with the coordinate axes.
 */
export interface IAABB {
  /**
   * The minimum corner of the bounding box (lower bounds on each axis).
   */
  base: Vec3;

  /**
   * The maximum corner of the bounding box (upper bounds on each axis).
   */
  max: Vec3;

  /**
   * Translates the AABB by the given vector.
   * @param vec - The vector by which to translate the AABB
   */
  translate(vec: Vec3): void;
}

/**
 * Function type for querying whether a voxel at given coordinates is solid.
 *
 * @param x - The x-coordinate of the voxel
 * @param y - The y-coordinate of the voxel
 * @param z - The z-coordinate of the voxel
 * @param dx - Optional normalized position (0-1) within the voxel in the x-axis, representing where the AABB's leading edge intersects
 * @param dy - Optional normalized position (0-1) within the voxel in the y-axis, representing where the AABB's leading edge intersects
 * @param dz - Optional normalized position (0-1) within the voxel in the z-axis, representing where the AABB's leading edge intersects
 * @returns True if the voxel is solid and should collide with the AABB, false otherwise
 */
export type GetVoxelFunction = (
  x: number,
  y: number,
  z: number,
  dx?: number,
  dy?: number,
  dz?: number
) => boolean | any;

/**
 * Collision callback function that gets invoked when the AABB collides with a voxel.
 *
 * @param dist - The cumulative scalar distance moved so far during the sweep
 * @param axis - The axis along which the collision occurred (0=x, 1=y, 2=z)
 * @param dir - The direction of movement along the collision axis (1 or -1)
 * @param vec - The remaining vector distance left to move (can be modified by the callback)
 * @returns True to stop the sweep at this collision, false to continue sweeping
 *
 * @remarks
 * When `checkStartingVoxel` is enabled, the callback may be invoked with `dist=0`
 * if the AABB's leading face starts inside a solid voxel.
 */
export type CollisionCallback = (
  dist: number,
  axis: number,
  dir: number,
  vec: Vec3
) => boolean | void;
