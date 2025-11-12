import type { Vec3, IAABB } from '../src/types';
/**
 * Axis-Aligned Bounding Box (AABB) implementation.
 *
 * This is a minimal reference implementation of an AABB for testing purposes.
 * Represents a rectangular box in 3D space that is aligned with the coordinate axes.
 *
 * For production use, consider using the full-featured library:
 * https://github.com/fenomas/aabb-3d
 *
 * @example
 * ```typescript
 * const box = new AABB([0, 0, 0], [1, 1, 1]);
 * box.translate([5, 0, 0]); // Move box 5 units along x-axis
 * box.setPosition([10, 10, 10]); // Move box so base is at (10,10,10)
 * ```
 */
export declare class AABB implements IAABB {
    /**
     * The minimum corner of the bounding box (lower bounds on each axis).
     */
    base: Vec3;
    /**
     * The maximum corner of the bounding box (upper bounds on each axis).
     */
    max: Vec3;
    /**
     * Creates a new AABB with the specified bounds.
     *
     * @param base - The minimum corner coordinates [x, y, z]
     * @param max - The maximum corner coordinates [x, y, z]
     */
    constructor(base: Vec3, max: Vec3);
    /**
     * Translates (moves) the AABB by the given vector.
     *
     * Both the base and max corners are moved by the same amount,
     * preserving the size and shape of the box.
     *
     * @param vec - The vector by which to translate [dx, dy, dz]
     */
    translate(vec: Vec3): void;
    /**
     * Moves the AABB so that its base corner is at the specified position.
     *
     * This method calculates the translation needed to move the base to the
     * target position and applies it to both base and max corners.
     *
     * @param vec - The target position for the base corner [x, y, z]
     */
    setPosition(vec: Vec3): void;
}
export default AABB;
//# sourceMappingURL=aabb.d.ts.map