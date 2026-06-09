import { store } from './state/store';
import { addRay, computeIntersection, deleteSphere, updateCameraPose } from './state/appSlice';
import { SceneManager } from './view3d/SceneManager';
import { UIPanel } from './view2d/UIPanel';

const container = document.getElementById('app')!;
const sceneManager = new SceneManager(container);
const uiPanel = new UIPanel();

store.subscribe(() => {
  const state = store.getState();
  sceneManager.syncWithState(state.present);
  uiPanel.update(state.present);
});

window.addEventListener('keydown', (e) => {
  switch (e.key.toUpperCase()) {
    case 'R':
      store.dispatch(addRay(sceneManager.getCurrentRay()));
      break;
    case 'C':
      store.dispatch(computeIntersection());
      break;
  }
});

sceneManager.onDeleteSphere = (id) => {
  store.dispatch(deleteSphere(id));
};

sceneManager.onCameraPoseUpdate = (pose) => {
  store.dispatch(updateCameraPose(pose));
};

sceneManager.start();
