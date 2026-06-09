import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { ActionCreators } from 'redux-undo';
import sceneReducer, { addRay, spawnSphere, deleteSphere, clearRays } from '../../state/sceneSlice';
import type { Ray } from '../../state/sceneSlice';
import cameraReducer, { updateCameraPose } from '../../state/cameraSlice';
import { store as appStore } from '../../state/store';
import {
  selectCurrentRays,
  selectSpheres,
  selectCurrentRayCount,
  selectLastSphere,
  selectCanUndo,
  selectCanRedo,
} from '../../state/selectors';

function makeStore() {
  return configureStore({ reducer: { scene: sceneReducer } });
}

const ray1: Ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } };
const ray2: Ray = { origin: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 1, z: 0 } };

describe('sceneSlice', () => {
  it('addRay appends to currentRays', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    expect(store.getState().scene.present.currentRays).toHaveLength(1);
    expect(store.getState().scene.present.currentRays[0]).toEqual(ray1);
  });

  it('spawnSphere appends sphere and clears currentRays', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(addRay(ray2));
    store.dispatch(spawnSphere({ position: { x: 1, y: 1, z: 1 }, rays: [ray1, ray2], rmsError: 0.01 }));
    const state = store.getState().scene.present;
    expect(state.spheres).toHaveLength(1);
    expect(state.spheres[0].position).toEqual({ x: 1, y: 1, z: 1 });
    expect(state.spheres[0].rmsError).toBe(0.01);
    expect(state.currentRays).toHaveLength(0);
  });

  it('spawnSphere sphere has an id', () => {
    const store = makeStore();
    store.dispatch(spawnSphere({ position: { x: 0, y: 0, z: 0 }, rays: [ray1], rmsError: 0 }));
    expect(store.getState().scene.present.spheres[0].id).toBeTruthy();
  });

  it('deleteSphere removes correct sphere, leaves others', () => {
    const store = makeStore();
    store.dispatch(spawnSphere({ position: { x: 0, y: 0, z: 0 }, rays: [ray1], rmsError: 0 }));
    store.dispatch(spawnSphere({ position: { x: 1, y: 1, z: 1 }, rays: [ray2], rmsError: 0 }));
    const { spheres } = store.getState().scene.present;
    const idToDelete = spheres[0].id;
    store.dispatch(deleteSphere(idToDelete));
    const remaining = store.getState().scene.present.spheres;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).not.toBe(idToDelete);
  });

  it('clearRays empties currentRays, leaves spheres', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(spawnSphere({ position: { x: 0, y: 0, z: 0 }, rays: [ray1], rmsError: 0 }));
    store.dispatch(addRay(ray2));
    store.dispatch(clearRays());
    const state = store.getState().scene.present;
    expect(state.currentRays).toHaveLength(0);
    expect(state.spheres).toHaveLength(1);
  });

  it('undo after addRay reverts currentRays', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(ActionCreators.undo());
    expect(store.getState().scene.present.currentRays).toHaveLength(0);
  });

  it('undo after spawnSphere removes sphere and restores currentRays', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(addRay(ray2));
    store.dispatch(spawnSphere({ position: { x: 0, y: 0, z: 0 }, rays: [ray1, ray2], rmsError: 0 }));
    store.dispatch(ActionCreators.undo());
    const state = store.getState().scene.present;
    expect(state.spheres).toHaveLength(0);
    expect(state.currentRays).toHaveLength(2);
  });

  it('redo after undo re-applies spawnSphere', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(spawnSphere({ position: { x: 0, y: 0, z: 0 }, rays: [ray1], rmsError: 0 }));
    store.dispatch(ActionCreators.undo());
    store.dispatch(ActionCreators.redo());
    const state = store.getState().scene.present;
    expect(state.spheres).toHaveLength(1);
    expect(state.currentRays).toHaveLength(0);
  });
});

describe('cameraSlice', () => {
  it('has default position and target', () => {
    const store = configureStore({ reducer: { camera: cameraReducer } });
    const { position, target } = store.getState().camera;
    expect(position).toEqual({ x: 0, y: 5, z: 10 });
    expect(target).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('updateCameraPose overwrites position and target', () => {
    const store = configureStore({ reducer: { camera: cameraReducer } });
    store.dispatch(updateCameraPose({ position: { x: 1, y: 2, z: 3 }, target: { x: 4, y: 5, z: 6 } }));
    expect(store.getState().camera.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(store.getState().camera.target).toEqual({ x: 4, y: 5, z: 6 });
  });
});

describe('store', () => {
  it('has scene and camera slices', () => {
    const state = appStore.getState();
    expect(state.scene).toBeDefined();
    expect(state.camera).toBeDefined();
  });
});

describe('selectors', () => {
  function makeFullStore() {
    return configureStore({ reducer: { scene: sceneReducer, camera: cameraReducer } });
  }

  it('selectCurrentRays returns empty array initially', () => {
    const store = makeFullStore();
    expect(selectCurrentRays(store.getState())).toEqual([]);
  });

  it('selectSpheres returns empty array initially', () => {
    const store = makeFullStore();
    expect(selectSpheres(store.getState())).toEqual([]);
  });

  it('selectCurrentRayCount reflects dispatched rays', () => {
    const store = makeFullStore();
    store.dispatch(addRay(ray1));
    store.dispatch(addRay(ray2));
    expect(selectCurrentRayCount(store.getState())).toBe(2);
  });

  it('selectLastSphere returns null when no spheres', () => {
    const store = makeFullStore();
    expect(selectLastSphere(store.getState())).toBeNull();
  });

  it('selectLastSphere returns the most recent sphere', () => {
    const store = makeFullStore();
    store.dispatch(spawnSphere({ position: { x: 0, y: 0, z: 0 }, rays: [ray1], rmsError: 0 }));
    store.dispatch(spawnSphere({ position: { x: 9, y: 9, z: 9 }, rays: [ray2], rmsError: 1 }));
    expect(selectLastSphere(store.getState())?.position).toEqual({ x: 9, y: 9, z: 9 });
  });

  it('selectCanUndo is false initially, true after an action', () => {
    const store = makeFullStore();
    expect(selectCanUndo(store.getState())).toBe(false);
    store.dispatch(addRay(ray1));
    expect(selectCanUndo(store.getState())).toBe(true);
  });

  it('selectCanRedo is false initially, true after undo', () => {
    const store = makeFullStore();
    store.dispatch(addRay(ray1));
    expect(selectCanRedo(store.getState())).toBe(false);
    store.dispatch(ActionCreators.undo());
    expect(selectCanRedo(store.getState())).toBe(true);
  });
});
