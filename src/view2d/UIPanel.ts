import { store } from '../state/store';
import { clearRays } from '../state/appSlice';
import { ActionCreators } from 'redux-undo';
import type { Ray, Vector3 } from '../logic/rayIntersection';

interface AppState {
  currentRays: Ray[];
  spheres: { id: string; position: Vector3; rmsError: number; rays: Ray[] }[];
  cameraPose: { position: Vector3; direction: Vector3 };
}

export class UIPanel {
  private container: HTMLElement;
  private coordsDisplay: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '8px';
    this.container.style.left = '8px';
    this.container.style.background = 'white';
    this.container.style.padding = '8px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '12px';
    this.container.style.zIndex = '100';

    this.coordsDisplay = document.createElement('div');
    this.coordsDisplay.textContent = 'No sphere yet';

    const undoBtn = document.createElement('button');
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', () => store.dispatch(ActionCreators.undo()));

    const redoBtn = document.createElement('button');
    redoBtn.textContent = 'Redo';
    redoBtn.addEventListener('click', () => store.dispatch(ActionCreators.redo()));

    const newSetBtn = document.createElement('button');
    newSetBtn.textContent = 'New Ray Set';
    newSetBtn.addEventListener('click', () => store.dispatch(clearRays()));

    this.container.appendChild(this.coordsDisplay);
    this.container.appendChild(undoBtn);
    this.container.appendChild(redoBtn);
    this.container.appendChild(newSetBtn);
    document.body.appendChild(this.container);
  }

  update(state: AppState): void {
    if (state.spheres.length === 0) {
      this.coordsDisplay.textContent = 'No sphere yet';
      return;
    }
    const last = state.spheres[state.spheres.length - 1];
    this.coordsDisplay.textContent =
      `X: ${last.position.x.toFixed(3)} Y: ${last.position.y.toFixed(3)} Z: ${last.position.z.toFixed(3)} RMS: ${last.rmsError.toFixed(4)}`;
  }
}