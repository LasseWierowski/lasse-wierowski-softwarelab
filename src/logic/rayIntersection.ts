export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Ray {
  origin: Vector3;
  direction: Vector3;
}

import { matrix, multiply, add, subtract, inv, zeros } from 'mathjs';

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function computeClosestPoint(rays: Ray[]): Vector3 {
  if (rays.length < 2) throw new Error('At least 2 rays required');

  let A = zeros(3, 3) as math.Matrix;
  let b = zeros(3) as math.Matrix;

  for (const ray of rays) {
    const d = normalize(ray.direction);
    const o = [ray.origin.x, ray.origin.y, ray.origin.z];

    // I - d*d^T
    const I = matrix([[1,0,0],[0,1,0],[0,0,1]]);
    const ddT = matrix([
      [d.x*d.x, d.x*d.y, d.x*d.z],
      [d.y*d.x, d.y*d.y, d.y*d.z],
      [d.z*d.x, d.z*d.y, d.z*d.z],
    ]);
    const m = subtract(I, ddT);

    A = add(A, m) as math.Matrix;
    b = add(b, multiply(m, o)) as math.Matrix;
  }

  const P = multiply(inv(A), b);
  const arr = (P as math.Matrix).toArray() as number[];
  return { x: arr[0], y: arr[1], z: arr[2] };
}