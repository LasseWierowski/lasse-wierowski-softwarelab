import { describe, it, expect } from 'vitest';
import { perpDistance, computeRmsError } from '../../logic/rmsError';
import type { Ray } from '../../logic/rayIntersection';

const ray = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): Ray => ({
  origin: { x: ox, y: oy, z: oz },
  direction: { x: dx, y: dy, z: dz },
});

function norm(x: number, y: number, z: number) {
  const len = Math.sqrt(x * x + y * y + z * z);
  return { x: x / len, y: y / len, z: z / len };
}

describe('perpDistance', () => {
  it('point on the ray returns 0', () => {
    const d = norm(1, 0, 0);
    const r = ray(0, 0, 0, d.x, d.y, d.z);
    // point at origin + 5 * direction = (5, 0, 0)
    expect(perpDistance({ x: 5, y: 0, z: 0 }, r)).toBeCloseTo(0, 10);
  });

  it('point offset perpendicular by known distance', () => {
    const d = norm(1, 0, 0);
    const r = ray(0, 0, 0, d.x, d.y, d.z);
    // point is 3 units above the X-axis
    expect(perpDistance({ x: 5, y: 3, z: 0 }, r)).toBeCloseTo(3, 10);
  });

  it('point in 3D offset from ray', () => {
    const d = norm(0, 0, 1);
    const r = ray(0, 0, 0, d.x, d.y, d.z);
    // point (3, 4, 10): projection on Z-axis is 10, so perp dist = sqrt(9+16)=5
    expect(perpDistance({ x: 3, y: 4, z: 10 }, r)).toBeCloseTo(5, 10);
  });
});

describe('computeRmsError', () => {
  it('empty rays array returns 0', () => {
    expect(computeRmsError({ x: 0, y: 0, z: 0 }, [])).toBe(0);
  });


  it('perfect convergence — all rays pass exactly through point → 0', () => {
    const target = { x: 1, y: 2, z: 3 };
    const rays = [
      ray(target.x - 5, target.y, target.z, 1, 0, 0),
      ray(target.x, target.y - 5, target.z, 0, 1, 0),
      ray(target.x, target.y, target.z - 5, 0, 0, 1),
    ];
    expect(computeRmsError(target, rays)).toBeCloseTo(0, 10);
  });

  it('controlled offset gives expected RMS', () => {
    // Two rays along X-axis, each offset 3 units in Y.
    // Each perp dist = 3, so RMS = sqrt((9+9)/2) = 3
    const d = norm(1, 0, 0);
    const target = { x: 0, y: 0, z: 0 };
    const rays = [
      ray(0, 3, 0, d.x, d.y, d.z),
      ray(0, -3, 0, d.x, d.y, d.z),
    ];
    expect(computeRmsError(target, rays)).toBeCloseTo(3, 10);
  });
});
