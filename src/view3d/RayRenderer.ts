import * as THREE from 'three';
import type { SceneState, Ray } from '../state/sceneSlice';

const RAY_LENGTH = 25;

function buildGeometry(rays: Ray[]): THREE.BufferGeometry {
  const positions = new Float32Array(rays.length * 6);
  rays.forEach((r, i) => {
    const base = i * 6;
    positions[base + 0] = r.origin.x;
    positions[base + 1] = r.origin.y;
    positions[base + 2] = r.origin.z;
    positions[base + 3] = r.origin.x + r.direction.x * RAY_LENGTH;
    positions[base + 4] = r.origin.y + r.direction.y * RAY_LENGTH;
    positions[base + 5] = r.origin.z + r.direction.z * RAY_LENGTH;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

export class RayRenderer {
  private scene: THREE.Scene;
  private currentLines: THREE.LineSegments;
  private archivedLines: THREE.LineSegments;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentLines = new THREE.LineSegments(
      buildGeometry([]),
      new THREE.LineBasicMaterial({ color: '#00ff88' }),
    );
    this.archivedLines = new THREE.LineSegments(
      buildGeometry([]),
      new THREE.LineBasicMaterial({ color: '#888888' }),
    );
    scene.add(this.currentLines, this.archivedLines);
  }

  update(state: SceneState) {
    this.currentLines.geometry.dispose();
    this.currentLines.geometry = buildGeometry(state.currentRays);

    this.archivedLines.geometry.dispose();
    this.archivedLines.geometry = buildGeometry(state.spheres.flatMap(s => s.rays));
  }

  dispose() {
    this.currentLines.geometry.dispose();
    this.archivedLines.geometry.dispose();
    (this.currentLines.material as THREE.Material).dispose();
    (this.archivedLines.material as THREE.Material).dispose();
    this.scene.remove(this.currentLines, this.archivedLines);
  }
}
