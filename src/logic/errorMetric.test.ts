import { computeRMSError } from './errorMetric';
import type { Ray, Vector3 } from './rayIntersection';

describe('computeRMSError', () => {
  test('point exactly on ray returns 0', () => {
    const rays: Ray[] = [
      { origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } },
    ];
    const point: Vector3 = { x: 5, y: 0, z: 0 };

    expect(computeRMSError(rays, point)).toBeCloseTo(0);
  });

  test('point 1 unit beside ray returns 1', () => {
    const rays: Ray[] = [
      { origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } },
    ];
    const point: Vector3 = { x: 0, y: 1, z: 0 };

    expect(computeRMSError(rays, point)).toBeCloseTo(1);
  });
});