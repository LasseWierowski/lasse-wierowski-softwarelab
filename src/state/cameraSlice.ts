import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Point3D } from './sceneSlice';

export interface CameraState {
  position: Point3D;
  target: Point3D;
}

const initialState: CameraState = {
  position: { x: 0, y: 5, z: 10 },
  target: { x: 0, y: 0, z: 0 },
};

const cameraSlice = createSlice({
  name: 'camera',
  initialState,
  reducers: {
    updateCameraPose(state, action: PayloadAction<{ position: Point3D; target: Point3D }>) {
      state.position = action.payload.position;
      state.target = action.payload.target;
    },
  },
});

export const { updateCameraPose } = cameraSlice.actions;
export default cameraSlice.reducer;
