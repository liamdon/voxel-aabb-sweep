"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tap_1 = require("tap");
const aabb_1 = require("../reference/aabb");
const index_1 = require("../src/index");
const N = 500;
const epsilon = 1e-5;
const equals = (a, b) => Math.abs(a - b) < epsilon;
(0, tap_1.test)('correctness (unobstructed)', (t) => {
    // correct behavior when there's no obstruction
    const noVoxels = () => false;
    const box = new aabb_1.AABB([0, 0, 0], [0, 0, 0]);
    const dir = [0, 0, 0];
    let collided = false;
    const callback = (dist, axis, dir, left) => {
        collided = true;
        return true;
    };
    // comparisons
    let ok = true;
    for (let i = 0; i < N; i++) {
        const expected = [];
        let sum = 0;
        collided = false;
        // randomize
        for (let j = 0; j < 3; j++) {
            box.base[j] = 1 - 2 * Math.random();
            box.max[j] = box.base[j] + 0.01 + 3 * Math.random();
            dir[j] = 20 * (0.5 - Math.random());
            expected[j] = box.base[j] + dir[j];
            sum += dir[j] * dir[j];
        }
        const dist = Math.sqrt(sum);
        // find results
        const res = (0, index_1.sweep)(noVoxels, box, dir, callback);
        // compare
        ok = true;
        ok = ok && !collided;
        ok = ok && equals(box.base[0], expected[0]);
        ok = ok && equals(box.base[1], expected[1]);
        ok = ok && equals(box.base[2], expected[2]);
        ok = ok && equals(dist, res);
        if (!ok) {
            t.fail('Unobstructed results differed on ' + i + 'th test');
            break;
        }
    }
    if (ok)
        t.pass('Passed ' + N + ' random correctness tests (unobstructed).');
    t.end();
});
(0, tap_1.test)('correctness (flat wall)', (t) => {
    const getVoxels = [
        (x, y, z) => Math.abs(x) === 5,
        (x, y, z) => Math.abs(y) === 5,
        (x, y, z) => Math.abs(z) === 5,
    ];
    const box = new aabb_1.AABB([0, 0, 0], [1, 1, 1]);
    const callback = (dist, axis, dir, vec) => {
        vec[axis] = 0;
    };
    function testWall(axis, sign) {
        box.setPosition([1, 1, 1]);
        const dir = [2, 2, 2];
        dir[axis] = 10 * sign;
        const expected = [];
        for (let j = 0; j < 3; j++)
            expected[j] = box.base[j] + dir[j];
        expected[axis] = sign > 0 ? 4 : -4;
        const dist = (0, index_1.sweep)(getVoxels[axis], box, dir, callback);
        ok = ok && equals(expected[0], box.base[0]);
        ok = ok && equals(expected[1], box.base[1]);
        ok = ok && equals(expected[2], box.base[2]);
        if (!ok) {
            t.fail('Obstructed test failed (box) ');
            console.log('axis, dir', axis, dir);
            console.log('box.base', box.base);
            console.log('expected', expected);
        }
        return ok;
    }
    let ok = true;
    [0, 1, 2].map((axis) => {
        [1, -1].map((dir) => {
            if (!ok)
                return;
            ok = ok && testWall(axis, dir);
        });
    });
    if (ok)
        t.pass('Obstructed (one wall).');
    t.end();
});
(0, tap_1.test)('correctness (box)', (t) => {
    const getVoxels = (x, y, z) => {
        if (Math.abs(x) === 5)
            return true;
        if (Math.abs(y) === 5)
            return true;
        if (Math.abs(z) === 5)
            return true;
        return false;
    };
    const box = new aabb_1.AABB([0, 0, 0], [1, 1, 1]);
    const callback = (dist, axis, dir, vec) => {
        vec[axis] = 0;
    };
    const testBox = (dx, dy, dz) => {
        box.setPosition([1, 1, 1]);
        const dir = [dx, dy, dz];
        const expected = [];
        for (let j = 0; j < 3; j++)
            expected[j] = dir[j] > 0 ? 4 : -4;
        const dist = (0, index_1.sweep)(getVoxels, box, dir, callback);
        ok = ok && equals(expected[0], box.base[0]);
        ok = ok && equals(expected[1], box.base[1]);
        ok = ok && equals(expected[2], box.base[2]);
        if (!ok) {
            t.fail('Obstructed test failed (box)');
            console.log('dx, dy, dz', dx, dy, dz);
            console.log('box.base', box.base);
            console.log('expected', expected);
        }
        return ok;
    };
    let ok = true;
    if (ok)
        ok = ok && testBox(12, 15, 17);
    if (ok)
        ok = ok && testBox(-12, 15, 17);
    if (ok)
        ok = ok && testBox(12, -15, 17);
    if (ok)
        ok = ok && testBox(-12, -15, 17);
    if (ok)
        ok = ok && testBox(12, 15, -17);
    if (ok)
        ok = ok && testBox(-12, 15, -17);
    if (ok)
        ok = ok && testBox(12, -15, -17);
    if (ok)
        ok = ok && testBox(-12, -15, -17);
    if (ok)
        t.pass('Obstructed (box).');
    t.end();
});
(0, tap_1.test)('correctness (nearby obstruction)', (t) => {
    const getVoxels = (x, y, z) => {
        if (Math.abs(x) < 2 && Math.abs(y) < 2 && Math.abs(z) < 2)
            return true;
        return false;
    };
    const box = new aabb_1.AABB([0, 0, 0], [2, 2, 2]);
    const testObstruction = (axis, dir) => {
        const arr = [-1, -1, -1];
        const vec = [6, 6, 6];
        arr[axis] = 10 * dir;
        vec[axis] = -12 * dir;
        box.setPosition(arr);
        const expected = [5, 5, 5];
        expected[axis] = -2 * dir;
        const dist = (0, index_1.sweep)(getVoxels, box, vec, (dist, axis, dir, vec) => {
            console.log('-------', dist, axis, dir, vec);
            vec[axis] = 0;
            return true;
        });
        let ok = equals(expected[0], box.base[0]);
        ok = ok && equals(expected[1], box.base[1]);
        ok = ok && equals(expected[2], box.base[2]);
        if (!ok) {
            t.fail('Nearby obstruction test failed');
            console.log('   axis, dir', axis, dir);
            console.log('   box.base', box.base);
            console.log('   expected', expected);
        }
        return ok;
    };
    let ok = true;
    if (ok)
        ok = ok && testObstruction(0, 1);
    if (ok)
        ok = ok && testObstruction(1, 1);
    if (ok)
        ok = ok && testObstruction(2, 1);
    if (ok)
        ok = ok && testObstruction(0, -1);
    if (ok)
        ok = ok && testObstruction(1, -1);
    if (ok)
        ok = ok && testObstruction(2, -1);
    // if (ok) t.pass('Nearby obstruction')
    t.end();
});
(0, tap_1.test)("correctness - doesn't go into collided wall", (t) => {
    const getVoxels = (x, y, z) => {
        if (x >= 10)
            return true;
        if (x <= -11)
            return true;
        return false;
    };
    const box = new aabb_1.AABB([0, 0, 0], [1, 1, 1]);
    const callback = (dist, axis, dir, vec) => {
        return true;
        // vec[axis] = 0
    };
    const vec = [];
    function testWall(dir) {
        for (let i = 0; i < 3; i++) {
            box.base[i] = Math.random();
            box.max[i] = box.base[i] + 1 + Math.random();
            vec[i] = 5 * Math.random();
        }
        vec[0] = dir ? 50 : -50;
        const dist = (0, index_1.sweep)(getVoxels, box, vec, callback);
        return !(box.max[0] > 10 || box.base[0] < -10);
    }
    let ok = true;
    for (let i = 0; i < N; i++) {
        ok = ok && testWall(i % 2 === 0);
        if (!ok) {
            console.log('base', box.base);
            console.log('max', box.max);
            t.fail('Went beyond collision boundary on ' + i + 'th random test');
            break;
        }
    }
    if (ok)
        t.pass('Passed ' + N + ' randomized sliding tests');
    t.end();
});
//# sourceMappingURL=correctness.js.map