import * as THREE from 'three';
import { ActionCreators } from 'redux-undo';
import { store } from './state/store';
import { addRay, spawnSphere } from './state/sceneSlice';
import type { SceneState } from './state/sceneSlice';
import { computeClosestPoint } from './logic/rayIntersection';
import { computeRmsError } from './logic/rmsError';
import { Scene } from './view3d/Scene';
import { RayRenderer } from './view3d/RayRenderer';
import { SphereRenderer } from './view3d/SphereRenderer';
import { CameraController } from './view3d/CameraController';
import { UIPanel } from './view2d/UIPanel';

// Bootstrap canvas
const appEl = document.querySelector<HTMLDivElement>('#app')!;
appEl.innerHTML = '';
const canvas = document.createElement('canvas');
Object.assign(canvas.style, { display: 'block', width: '100vw', height: '100vh' });
appEl.appendChild(canvas);

const threeScene = new Scene(canvas);
const cameraCtrl = new CameraController(threeScene.camera, threeScene.renderer, store);
const rayRenderer = new RayRenderer(threeScene.scene);
const sphereRenderer = new SphereRenderer(
  threeScene.scene, threeScene.camera, canvas, store.dispatch,
);
const uiPanel = new UIPanel(store, store.dispatch);

// Update geometry only when scene slice changes
let prevScene: SceneState | null = null;
store.subscribe(() => {
  const scene = store.getState().scene.present;
  if (scene === prevScene) return;
  prevScene = scene;
  rayRenderer.update(scene);
  sphereRenderer.update(scene);
});

// Initial geometry render
rayRenderer.update(store.getState().scene.present);
sphereRenderer.update(store.getState().scene.present);

// Keyboard interactions — bound to document, never canvas
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement) return;

  switch (e.key.toLowerCase()) {
    case 'r': {
      const cam = threeScene.camera;
      const forward = new THREE.Vector3();
      cam.getWorldDirection(forward);
      store.dispatch(addRay({
        origin: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
        direction: { x: forward.x, y: forward.y, z: forward.z },
      }));
      break;
    }
    case 'c': {
      const { currentRays } = store.getState().scene.present;
      if (currentRays.length < 2) {
        uiPanel.showStatus('Need at least 2 rays');
        return;
      }
      const position = computeClosestPoint(currentRays);
      if (!position) {
        uiPanel.showStatus('Rays are parallel — no unique intersection');
        return;
      }
      const rmsError = computeRmsError(position, currentRays);
      store.dispatch(spawnSphere({ position, rays: [...currentRays], rmsError }));
      break;
    }
    case 'z': {
      if (e.ctrlKey || e.metaKey) store.dispatch(ActionCreators.undo());
      break;
    }
    case 'y': {
      if (e.ctrlKey || e.metaKey) store.dispatch(ActionCreators.redo());
      break;
    }
  }
});

// Suppress unused variable warning — cameraCtrl update loop runs via OrbitControls internally
void cameraCtrl;

threeScene.start();
