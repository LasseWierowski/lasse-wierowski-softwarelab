import type { RootState } from './store';

export const selectCurrentRays = (state: RootState) => state.scene.present.currentRays;
export const selectSpheres = (state: RootState) => state.scene.present.spheres;
export const selectCurrentRayCount = (state: RootState) => state.scene.present.currentRays.length;
export const selectLastSphere = (state: RootState) => {
  const spheres = state.scene.present.spheres;
  return spheres.length > 0 ? spheres[spheres.length - 1] : null;
};
export const selectCanUndo = (state: RootState) => state.scene.past.length > 0;
export const selectCanRedo = (state: RootState) => state.scene.future.length > 0;
