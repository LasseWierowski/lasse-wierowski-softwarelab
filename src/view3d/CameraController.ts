import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Store } from '@reduxjs/toolkit';
import type { RootState } from '../state/store';
import { updateCameraPose } from '../state/cameraSlice';

function throttle(fn: () => void, ms: number): () => void {
  let last = 0;
  return () => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(); }
  };
}

export class CameraController {
  readonly controls: OrbitControls;
  private prevCameraState: RootState['camera'] | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, store: Store<RootState>) {
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const { position, target } = store.getState().camera;
    camera.position.set(position.x, position.y, position.z);
    this.controls.target.set(target.x, target.y, target.z);
    this.controls.update();

    const throttledDispatch = throttle(() => {
      store.dispatch(updateCameraPose({
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z },
      }));
    }, 200);

    this.controls.addEventListener('change', throttledDispatch);

    this.unsubscribe = store.subscribe(() => {
      const cameraState = store.getState().camera;
      if (cameraState === this.prevCameraState) return;
      this.prevCameraState = cameraState;
      camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
      this.controls.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
      this.controls.update();
    });
  }

  update() {
    this.controls.update();
  }

  dispose() {
    this.controls.dispose();
    this.unsubscribe?.();
  }
}
