import { matrix, det, lusolve } from 'mathjs';

export interface Point3D { x: number; y: number; z: number; }

export interface Ray {
  origin: Point3D;
  direction: Point3D; // must be a unit vector
}

// Empirical threshold for N ≤ 20 rays in a scene of ≤ 50 unit radius.
const SINGULAR_THRESHOLD = 1e-10;

export function computeClosestPoint(rays: Ray[]): Point3D | null {
  if (rays.length < 2) return null;

  // Build A = Σ (I - d⊗d) and b = Σ (I - d⊗d)·o using plain arrays
  const A: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const b: number[] = [0, 0, 0];

  for (const { origin: o, direction: d } of rays) {
    // M_i = I - d⊗d
    const M: number[][] = [
      [1 - d.x * d.x, -d.x * d.y,   -d.x * d.z  ],
      [-d.y * d.x,    1 - d.y * d.y, -d.y * d.z  ],
      [-d.z * d.x,   -d.z * d.y,    1 - d.z * d.z],
    ];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        A[i][j] += M[i][j];
      }
    }

    const ov = [o.x, o.y, o.z];
    for (let i = 0; i < 3; i++) {
      b[i] += M[i][0] * ov[0] + M[i][1] * ov[1] + M[i][2] * ov[2];
    }
  }

  const mA = matrix(A);
  if (Math.abs(det(mA)) < SINGULAR_THRESHOLD) return null;

  // lusolve returns a DenseMatrix when input is a Matrix; valueOf() gives number[][]
  const raw = (lusolve(mA, b) as unknown as { valueOf(): number[][] }).valueOf();
  return { x: raw[0][0], y: raw[1][0], z: raw[2][0] };
}
