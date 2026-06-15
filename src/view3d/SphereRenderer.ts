import * as THREE from 'three';
import type { SceneState, Sphere } from '../state/sceneSlice';
import type { AppDispatch } from '../state/store';
import { deleteSphere } from '../state/sceneSlice';

const SPHERE_RADIUS = 0.15;
const SPHERE_COLOR = '#ff4444';

function toScreenPos(point: THREE.Vector3, camera: THREE.Camera, canvas: HTMLCanvasElement) {
  const ndc = point.clone().project(camera);
  return {
    x: (ndc.x + 1) / 2 * canvas.clientWidth,
    y: (1 - ndc.y) / 2 * canvas.clientHeight,
  };
}

export class SphereRenderer {
  private threeScene: THREE.Scene;
  private camera: THREE.Camera;
  private canvas: HTMLCanvasElement;
  private dispatch: AppDispatch;
  private meshes = new Map<string, THREE.Mesh>();
  private geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 16, 16);
  private material = new THREE.MeshStandardMaterial({ color: SPHERE_COLOR });
  private raycaster = new THREE.Raycaster();
  private tooltip: HTMLDivElement;
  private mouseDownPos = { x: 0, y: 0 };

  constructor(threeScene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement, dispatch: AppDispatch) {
    this.threeScene = threeScene;
    this.camera = camera;
    this.canvas = canvas;
    this.dispatch = dispatch;

    this.tooltip = document.createElement('div');
    Object.assign(this.tooltip.style, {
      position: 'fixed', background: 'rgba(0,0,0,0.75)', color: '#fff',
      padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
      pointerEvents: 'none', display: 'none',
    });
    document.body.appendChild(this.tooltip);

    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
  }

  update(state: SceneState) {
    const incomingIds = new Set(state.spheres.map(s => s.id));

    for (const [id, mesh] of this.meshes) {
      if (!incomingIds.has(id)) {
        mesh.geometry.dispose();
        this.threeScene.remove(mesh);
        this.meshes.delete(id);
      }
    }

    for (const sphere of state.spheres) {
      if (!this.meshes.has(sphere.id)) {
        const mesh = this.buildMesh(sphere);
        this.threeScene.add(mesh);
        this.meshes.set(sphere.id, mesh);
      }
    }
  }

  private buildMesh(sphere: Sphere): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.set(sphere.position.x, sphere.position.y, sphere.position.z);
    mesh.userData = { id: sphere.id, rmsError: sphere.rmsError };
    return mesh;
  }

  private getNdcPos(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private onMouseMove = (e: MouseEvent) => {
    this.raycaster.setFromCamera(this.getNdcPos(e), this.camera);
    const hits = this.raycaster.intersectObjects([...this.meshes.values()]);
    if (hits.length > 0) {
      const { id, rmsError } = hits[0].object.userData as { id: string; rmsError: number };
      const pos = toScreenPos(hits[0].object.position.clone(), this.camera, this.canvas);
      this.tooltip.textContent = `id: ${id.slice(0, 6)} | RMS: ${(rmsError as number).toFixed(4)}`;
      this.tooltip.style.display = 'block';
      this.tooltip.style.left = `${pos.x + 10}px`;
      this.tooltip.style.top = `${pos.y - 10}px`;
    } else {
      this.tooltip.style.display = 'none';
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
  };

  private onMouseUp = (e: MouseEvent) => {
    if (!e.shiftKey) return;
    if (Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y) > 4) return;
    this.raycaster.setFromCamera(this.getNdcPos(e), this.camera);
    const hits = this.raycaster.intersectObjects([...this.meshes.values()]);
    if (hits.length > 0) {
      const { id } = hits[0].object.userData as { id: string };
      this.dispatch(deleteSphere(id));
    }
  };

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    document.body.removeChild(this.tooltip);
    for (const mesh of this.meshes.values()) {
      this.threeScene.remove(mesh);
    }
    this.meshes.clear();
  }
}
