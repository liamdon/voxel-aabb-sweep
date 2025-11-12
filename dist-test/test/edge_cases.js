"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tap_1 = require("tap");
const aabb_1 = require("../reference/aabb");
const index_1 = require("../src/index");
const epsilon = 1e-5;
const equals = (a, b) => Math.abs(a - b) < epsilon;
const mag = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
(0, tap_1.test)('edge case - fit exactly into a gap', (t) => {
    const box = new aabb_1.AABB([0, 0, 0], [2, 2, 2]);
    let dir;
    let res;
    let collided;
    const callback = (dist, axis, dir, vec) => {
        collided = true;
        return true;
    };
    function getVoxels(x, y, z) {
        // 2x2 hole along each axis
        if (x === -1 || x === 0)
            return false;
        if (y === -1 || y === 0)
            return false;
        if (z === -1 || z === 0)
            return false;
        // otherwise solid past xyz=5
        return Math.abs(x) > 5 || Math.abs(y) > 5 || Math.abs(z) > 5;
    }
    function testAxis(axisNum, sign, axisName) {
        box.setPosition([-1, -1, -1]);
        dir = [0, 0, 0];
        dir[axisNum] = 10 * sign;
        collided = false;
        res = (0, index_1.sweep)(getVoxels, box, dir, callback);
        t.ok(!collided, 'No collision, axis test, ' + axisName);
        t.equals(res, 10, 'No collision, axis test, ' + axisName);
    }
    testAxis(0, 1, '+X');
    testAxis(0, -1, '-X');
    testAxis(1, 1, '+Y');
    testAxis(1, -1, '-Y');
    testAxis(2, 1, '+Z');
    testAxis(2, -1, '-Z');
    t.end();
});
(0, tap_1.test)('edge case - between two walls', (t) => {
    const box = new aabb_1.AABB([0, 0, 0], [2, 2, 2]);
    const callback = (dist, axis, dir, vec) => {
        vec[axis] = 0;
    };
    function testAxis(axis, dir) {
        const getVoxels = (x, y, z) => {
            if (axis === 0)
                return x < -1 || x > 0;
            if (axis === 1)
                return y < -1 || y > 0;
            if (axis === 2)
                return z < -1 || z > 0;
            return false;
        };
        box.setPosition([-1, -1, -1]);
        const adjDir = dir.slice();
        adjDir[axis] = 0;
        const expectedDist = mag(adjDir);
        const dist = (0, index_1.sweep)(getVoxels, box, dir, callback);
        return equals(dist, expectedDist);
    }
    t.ok(testAxis(0, [0, 3, 3]), 'No collision between two walls, axis X');
    t.ok(testAxis(1, [3, 0, 3]), 'No collision between two walls, axis Y');
    t.ok(testAxis(2, [3, 3, 0]), 'No collision between two walls, axis Z');
    t.ok(testAxis(0, [3, 3, 3]), 'No collision moving into two walls, axis X');
    t.ok(testAxis(1, [3, 3, 3]), 'No collision moving into two walls, axis Y');
    t.ok(testAxis(2, [3, 3, 3]), 'No collision moving into two walls, axis Z');
    t.ok(testAxis(0, [-3, 3, 3]), 'No collision moving into two walls, axis X');
    t.ok(testAxis(1, [3, -3, 3]), 'No collision moving into two walls, axis Y');
    t.ok(testAxis(2, [3, 3, -3]), 'No collision moving into two walls, axis Z');
    t.end();
});
//# sourceMappingURL=edge_cases.js.map