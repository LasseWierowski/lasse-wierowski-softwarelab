import { configureStore } from '@reduxjs/toolkit';
import appReducer, { addRay, computeIntersection, deleteSphere, clearRays } from './appSlice';
import type { Ray } from '../logic/rayIntersection';

function makeStore() {
  return configureStore({ reducer: appReducer });
}

const ray1: Ray = { origin: { x: -1, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } };
const ray2: Ray = { origin: { x: 0, y: -1, z: 0 }, direction: { x: 0, y: 1, z: 0 } };

describe('appSlice', () => {
  test('addRay adds ray to currentRays', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    expect(store.getState().currentRays).toHaveLength(1);
    expect(store.getState().currentRays[0]).toEqual(ray1);
  });

  test('computeIntersection creates sphere and clears currentRays', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(addRay(ray2));
    store.dispatch(computeIntersection());

    expect(store.getState().spheres).toHaveLength(1);
    expect(store.getState().currentRays).toHaveLength(0);
    expect(store.getState().spheres[0].position).toBeDefined();
    expect(store.getState().spheres[0].rmsError).toBeDefined();
  });

  test('computeIntersection does nothing with less than 2 rays', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(computeIntersection());

    expect(store.getState().spheres).toHaveLength(0);
    expect(store.getState().currentRays).toHaveLength(1);
  });

  test('deleteSphere removes sphere by id', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(addRay(ray2));
    store.dispatch(computeIntersection());

    const id = store.getState().spheres[0].id;
    store.dispatch(deleteSphere(id));
    expect(store.getState().spheres).toHaveLength(0);
  });

  test('clearRays empties currentRays', () => {
    const store = makeStore();
    store.dispatch(addRay(ray1));
    store.dispatch(addRay(ray2));
    store.dispatch(clearRays());
    expect(store.getState().currentRays).toHaveLength(0);
  });
});