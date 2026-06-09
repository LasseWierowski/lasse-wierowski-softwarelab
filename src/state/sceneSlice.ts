import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import undoable from 'redux-undo';

export interface Point3D { x: number; y: number; z: number; }

export interface Ray {
  origin: Point3D;
  direction: Point3D;
}

export interface Sphere {
  id: string;
  position: Point3D;
  rays: Ray[];
  rmsError: number;
}

export interface SceneState {
  currentRays: Ray[];
  spheres: Sphere[];
}

const initialState: SceneState = {
  currentRays: [],
  spheres: [],
};

const sceneSlice = createSlice({
  name: 'scene',
  initialState,
  reducers: {
    addRay(state, action: PayloadAction<Ray>) {
      state.currentRays.push(action.payload);
    },
    spawnSphere(state, action: PayloadAction<{ position: Point3D; rays: Ray[]; rmsError: number }>) {
      state.spheres.push({
        id: crypto.randomUUID(),
        position: action.payload.position,
        rays: action.payload.rays,
        rmsError: action.payload.rmsError,
      });
      state.currentRays = [];
    },
    deleteSphere(state, action: PayloadAction<string>) {
      state.spheres = state.spheres.filter(s => s.id !== action.payload);
    },
    clearRays(state) {
      state.currentRays = [];
    },
  },
});

export const { addRay, spawnSphere, deleteSphere, clearRays } = sceneSlice.actions;

export default undoable(sceneSlice.reducer);
