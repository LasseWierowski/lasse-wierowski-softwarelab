import type { Ray, Vector3 } from './rayIntersection';

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
    
  };
}

function magnitude(v: Vector3): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
}

export function computeRMSError(rays: Ray[], point: Vector3): number {
  const sumSq = rays.reduce((acc, ray) => {
    const d = normalize(ray.direction);
    const diff = {
      x: point.x - ray.origin.x,
      y: point.y - ray.origin.y,
      z: point.z - ray.origin.z,
    };
    const dist = magnitude(cross(diff, d));
    return acc + dist ** 2;
  }, 0);

  return Math.sqrt(sumSq / rays.length);
}