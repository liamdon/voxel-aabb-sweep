#!/usr/bin/env node
'use strict';

// Simple Node.js benchmark to measure V8 performance improvements

const sweep = require('./dist/index').default;
const AABB = require('./dist-test/reference/aabb').default;

// Simple voxel getter - sparse world
const getVoxel = (x, y, z) => {
  // Create some obstacles
  if (y < -10 || y > 10) return true; // floor and ceiling
  if (Math.abs(x) > 50 || Math.abs(z) > 50) return true; // walls
  return false;
};

// Callback that slides along obstacles
const slideCallback = (dist, axis, dir, vec) => {
  vec[axis] = 0; // Stop movement on collision axis
  return false; // Continue sweeping
};

// Callback that stops at first collision
const stopCallback = () => true;

function benchmark(name, callback, iterations = 100000) {
  const box = new AABB([0, 0, 0], [1, 2, 1]);
  const directions = [];

  // Pre-generate random directions
  for (let i = 0; i < 100; i++) {
    const dir = [
      Math.random() * 20 - 10,
      Math.random() * 20 - 10,
      Math.random() * 20 - 10
    ];
    directions.push(dir);
  }

  // Warmup
  for (let i = 0; i < 1000; i++) {
    const dir = directions[i % directions.length];
    sweep(getVoxel, box, dir, callback);
    box.setPosition([0, 0, 0]);
  }

  // Actual benchmark
  const start = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    const dir = directions[i % directions.length];
    sweep(getVoxel, box, dir, callback);
    box.setPosition([0, 0, 0]);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1_000_000;
  const opsPerSec = Math.round((iterations / durationMs) * 1000);

  console.log(`${name}:`);
  console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
  console.log(`  Operations/sec: ${opsPerSec.toLocaleString()}`);
  console.log(`  Avg time/op: ${(durationMs / iterations * 1000).toFixed(3)}µs`);
  console.log();

  return { durationMs, opsPerSec };
}

console.log('=== V8 Performance Benchmark ===\n');
console.log(`Node version: ${process.version}`);
console.log(`V8 version: ${process.versions.v8}\n`);

// Run benchmarks
const results = {};
results.slide = benchmark('Sliding collision (realistic gameplay)', slideCallback, 100000);
results.stop = benchmark('Stop at first collision', stopCallback, 100000);

// Long distance sweep benchmark
function longDistanceBenchmark() {
  const box = new AABB([0, 0, 0], [1, 2, 1]);
  const iterations = 10000;

  // Warmup
  for (let i = 0; i < 100; i++) {
    sweep(getVoxel, box, [30, 5, 30], slideCallback);
    box.setPosition([0, 0, 0]);
  }

  const start = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    sweep(getVoxel, box, [30, 5, 30], slideCallback);
    box.setPosition([0, 0, 0]);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1_000_000;
  const opsPerSec = Math.round((iterations / durationMs) * 1000);

  console.log('Long distance sweep (30+ voxels):');
  console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
  console.log(`  Operations/sec: ${opsPerSec.toLocaleString()}`);
  console.log(`  Avg time/op: ${(durationMs / iterations * 1000).toFixed(3)}µs`);
  console.log();

  return { durationMs, opsPerSec };
}

results.longDistance = longDistanceBenchmark();

console.log('=== Summary ===');
console.log(`Total operations: ${(100000 + 100000 + 10000).toLocaleString()}`);
console.log('\nOptimizations applied:');
console.log('  ✓ Extracted nested functions to module level (enables V8 inlining)');
console.log('  ✓ Converted arrays to Float64Array (monomorphic hidden classes)');
console.log('  ✓ Hoisted invariant calculations out of hot loops');
console.log('  ✓ Used strict tuple types (monomorphic type system)');
console.log('  ✓ Explicit default parameters (avoid arguments object)');
console.log('  ✓ Reduced arithmetic type transitions');
