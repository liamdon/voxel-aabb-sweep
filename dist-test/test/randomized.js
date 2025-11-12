"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tap_1 = require("tap");
const aabb_1 = require("../reference/aabb");
const index_1 = require("../src/index");
const N = 1000;
const epsilon = 1e-5;
const equals = (a, b) => Math.abs(a - b) < epsilon;
const rand = (a, b) => a + (b - a) * Math.random();
const mag = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
(0, tap_1.test)('more randomized tests', (t) => {
    // cast at oblique angles into a flat ground, looking for cases where things fail early
    const getVoxels = (x, y, z) => {
        return y < 0;
    };
    const box = new aabb_1.AABB([0, 0, 0], [1, 1, 1]);
    const callback = (dist, axis, dir, vec) => {
        vec[axis] = 0;
    };
    function runTest(i) {
        box.setPosition([5, 5, 5]);
        const dir = [rand(-50, 50), rand(-10, -50), rand(-50, 50)];
        const expected = [5 + dir[0], 0, 5 + dir[2]];
        const dist = (0, index_1.sweep)(getVoxels, box, dir, callback);
        let ok = equals(box.base[0], expected[0]);
        ok = ok && equals(box.base[1], expected[1]);
        ok = ok && equals(box.base[2], expected[2]);
        if (!ok) {
            t.fail('Randomized test failed on ' + i + 'th test');
            console.log('=== expected', expected);
            console.log('=== base', box.base);
            console.log('=== dir', dir);
            return false;
        }
        return true;
    }
    let ok = true;
    for (let i = 0; i < N; i++) {
        ok = ok && runTest(i);
        if (!ok)
            break;
    }
    if (ok)
        t.pass('Passed ' + N + ' randomized sliding tests');
    t.end();
});
//# sourceMappingURL=randomized.js.map