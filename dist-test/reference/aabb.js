"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AABB = void 0;
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
class AABB {
    /**
     * Creates a new AABB with the specified bounds.
     *
     * @param base - The minimum corner coordinates [x, y, z]
     * @param max - The maximum corner coordinates [x, y, z]
     */
    constructor(base, max) {
        this.base = [0, 0, 0];
        this.max = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            this.base[i] = base[i];
            this.max[i] = max[i];
        }
    }
    /**
     * Translates (moves) the AABB by the given vector.
     *
     * Both the base and max corners are moved by the same amount,
     * preserving the size and shape of the box.
     *
     * @param vec - The vector by which to translate [dx, dy, dz]
     */
    translate(vec) {
        for (let i = 0; i < 3; i++) {
            this.base[i] += vec[i];
            this.max[i] += vec[i];
        }
    }
    /**
     * Moves the AABB so that its base corner is at the specified position.
     *
     * This method calculates the translation needed to move the base to the
     * target position and applies it to both base and max corners.
     *
     * @param vec - The target position for the base corner [x, y, z]
     */
    setPosition(vec) {
        for (let i = 0; i < 3; i++) {
            vec[i] = vec[i] - this.base[i];
        }
        this.translate(vec);
    }
}
exports.AABB = AABB;
exports.default = AABB;
//# sourceMappingURL=aabb.js.map