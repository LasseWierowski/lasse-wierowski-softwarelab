import type { Ray, Vector3 } from '../logic/rayIntersection';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { computeClosestPoint } from '../logic/rayIntersection';
import { computeRMSError } from '../logic/errorMetric';

interface Sphere {
  id: string;
  position: Vector3;
  rmsError: number;
  rays: Ray[];
}

interface CameraPose {
  position: Vector3;
  direction: Vector3;
}

interface AppState {
  currentRays: Ray[];
  spheres: Sphere[];
  cameraPose: CameraPose;
}

const initialState: AppState = {
  currentRays: [],
  spheres: [],
  cameraPose: {
    position: { x: 0, y: 0, z: 5 },
    direction: { x: 0, y: 0, z: -1 },
  },
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    addRay(state, action: PayloadAction<Ray>) {
      state.currentRays.push(action.payload);
    },
    computeIntersection(state) {
      if (state.currentRays.length < 2) return;

      const rays = state.currentRays as Ray[];
      const position = computeClosestPoint(rays);
      const rmsError = computeRMSError(rays, position);

      state.spheres.push({
        id: crypto.randomUUID(),
        position,
        rmsError,
        rays,
      });

      state.currentRays = [];
    },
    deleteSphere(state, action: PayloadAction<string>) {
      state.spheres = state.spheres.filter(s => s.id !== action.payload);
    },
    updateCameraPose(state, action: PayloadAction<CameraPose>) {
      state.cameraPose = action.payload;
    },
    clearRays(state) {
      state.currentRays = [];
    },
  },
});

export const { addRay, computeIntersection, deleteSphere, updateCameraPose, clearRays } = appSlice.actions;
export default appSlice.reducer;