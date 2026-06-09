import type { Point3D, Ray } from './rayIntersection';

export function perpDistance(point: Point3D, ray: Ray): number {
  const { origin: o, direction: d } = ray;
  // Vector from ray origin to point
  const vx = point.x - o.x;
  const vy = point.y - o.y;
  const vz = point.z - o.z;
  // Project v onto d
  const dot = vx * d.x + vy * d.y + vz * d.z;
  // Perpendicular component
  const px = vx - dot * d.x;
  const py = vy - dot * d.y;
  const pz = vz - dot * d.z;
  return Math.sqrt(px * px + py * py + pz * pz);
}

export function computeRmsError(point: Point3D, rays: Ray[]): number {
  if (rays.length === 0) return 0;
  const sumSq = rays.reduce((acc, r) => {
    const d = perpDistance(point, r);
    return acc + d * d;
  }, 0);
  return Math.sqrt(sumSq / rays.length);
}
