import type { Ray } from './rayIntersection';
import { computeClosestPoint } from './rayIntersection';

describe('computeClosestPoint', () => {
  test('throws if less than 2 rays are provided', () => {
    const ray: Ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } };
    expect(() => computeClosestPoint([ray])).toThrow();
  });

  test('two rays intersecting at origin return (0,0,0)', () => {
    const rays: Ray[] = [
      { origin: { x: -1, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } },
      { origin: { x: 0, y: -1, z: 0 }, direction: { x: 0, y: 1, z: 0 } },
    ];

    const result = computeClosestPoint(rays);

    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });
});