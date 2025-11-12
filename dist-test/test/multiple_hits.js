"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tap_1 = require("tap");
const aabb_1 = require("../reference/aabb");
const index_1 = require("../src/index");
const N = 800;
(0, tap_1.test)('multiple hits', (t) => {
    const box = new aabb_1.AABB([0, 0, 0], [0, 0, 0]);
    const dir = [0, 0, 0];
    const callback = (dist, axis, dir, vec) => {
        vec[axis] = 0;
    };
    const cache = new Set();
    let ok = true;
    const getVoxels = (x, y, z) => {
        const id = x + y * 100 + z * 10000;
        if (cache.has(id))
            ok = false;
        cache.add(id);
    };
    for (let i = 0; i < N; i++) {
        // randomize
        for (let j = 0; j < 3; j++) {
            box.base[j] = 1 - 2 * Math.random();
            box.max[j] = box.base[j] + 0.01 + 5 * Math.random();
            dir[j] = 20 * (0.5 - Math.random());
        }
        ok = true;
        cache.clear();
        const res = (0, index_1.sweep)(getVoxels, box, dir, callback);
        if (!ok) {
            t.fail('Same voxel queried twice for same sweep, on ' + i + 'th test');
            break;
        }
    }
    if (ok)
        t.pass('Passed ' + N + ' random tests without a multiple query.');
    t.end();
});
//# sourceMappingURL=multiple_hits.js.map