import { describe, it, expect } from 'vitest';
import { computeClosestPoint } from '../../logic/rayIntersection';
import type { Ray } from '../../logic/rayIntersection';

const ray = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): Ray => ({
  origin: { x: ox, y: oy, z: oz },
  direction: { x: dx, y: dy, z: dz },
});

/** Normalize a direction vector */
function norm(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const len = Math.sqrt(x * x + y * y + z * z);
  return { x: x / len, y: y / len, z: z / len };
}

describe('computeClosestPoint', () => {
  it('returns null for a single ray', () => {
    const d = norm(0, 0, 1);
    expect(computeClosestPoint([ray(0, 0, 0, d.x, d.y, d.z)])).toBeNull();
  });

  it('returns null for exactly parallel rays (same direction)', () => {
    const d = norm(1, 0, 0);
    const r1 = ray(0, 0, 0, d.x, d.y, d.z);
    const r2 = ray(0, 1, 0, d.x, d.y, d.z);
    expect(computeClosestPoint([r1, r2])).toBeNull();
  });

  it('returns null for near-parallel rays (det below threshold)', () => {
    // Two rays almost parallel — tiny angular spread
    const epsilon = 1e-7;
    const d1 = norm(0, 0, 1);
    const d2 = norm(epsilon, 0, 1);
    const r1 = ray(0, 0, 0, d1.x, d1.y, d1.z);
    const r2 = ray(1, 0, 0, d2.x, d2.y, d2.z);
    expect(computeClosestPoint([r1, r2])).toBeNull();
  });

  it('two perpendicular rays that perfectly intersect at origin', () => {
    // Ray 1: along +X from x=-10
    const d1 = norm(1, 0, 0);
    // Ray 2: along +Y from y=-10
    const d2 = norm(0, 1, 0);
    const r1 = ray(-10, 0, 0, d1.x, d1.y, d1.z);
    const r2 = ray(0, -10, 0, d2.x, d2.y, d2.z);
    const result = computeClosestPoint([r1, r2]);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0, 5);
    expect(result!.y).toBeCloseTo(0, 5);
    expect(result!.z).toBeCloseTo(0, 5);
  });

  it('two perpendicular rays intersecting at a non-origin point', () => {
    const target = { x: 3, y: 4, z: 5 };
    // Ray 1: along +X, passing through target
    const d1 = norm(1, 0, 0);
    // Ray 2: along +Z, passing through target
    const d2 = norm(0, 0, 1);
    const r1 = ray(target.x - 10, target.y, target.z, d1.x, d1.y, d1.z);
    const r2 = ray(target.x, target.y, target.z - 10, d2.x, d2.y, d2.z);
    const result = computeClosestPoint([r1, r2]);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(target.x, 5);
    expect(result!.y).toBeCloseTo(target.y, 5);
    expect(result!.z).toBeCloseTo(target.z, 5);
  });

  it('three near-intersecting rays converge within tolerance', () => {
    const target = { x: 1, y: 2, z: 3 };
    // Three rays from different positions, each pointing roughly at target
    // with a tiny offset to simulate near-convergence
    const offset = 0.01;
    const origins = [
      { x: -5, y: 2, z: 3 },
      { x: 1, y: -5, z: 3 },
      { x: 1, y: 2, z: -5 },
    ];
    const rays = origins.map((o) => {
      const dx = target.x - o.x + offset;
      const dy = target.y - o.y;
      const dz = target.z - o.z;
      const d = norm(dx, dy, dz);
      return ray(o.x, o.y, o.z, d.x, d.y, d.z);
    });
    const result = computeClosestPoint(rays);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(target.x, 0);
    expect(result!.y).toBeCloseTo(target.y, 0);
    expect(result!.z).toBeCloseTo(target.z, 0);
  });
});
