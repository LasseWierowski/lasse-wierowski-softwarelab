import { configureStore } from '@reduxjs/toolkit';
import sceneReducer from './sceneSlice';
import cameraReducer from './cameraSlice';

export const store = configureStore({
  reducer: {
    scene: sceneReducer,
    camera: cameraReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
