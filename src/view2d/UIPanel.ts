import type { Store } from '@reduxjs/toolkit';
import { ActionCreators } from 'redux-undo';
import type { RootState, AppDispatch } from '../state/store';
import { clearRays } from '../state/sceneSlice';
import {
  selectCurrentRayCount,
  selectLastSphere,
  selectCanUndo,
  selectCanRedo,
} from '../state/selectors';

export class UIPanel {
  private store: Store<RootState>;
  private panel: HTMLDivElement;
  private rayCountEl: HTMLSpanElement;
  private lastSphereEl: HTMLSpanElement;
  private rmsErrorEl: HTMLSpanElement;
  private statusEl: HTMLSpanElement;
  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private statusTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(store: Store<RootState>, dispatch: AppDispatch) {
    this.store = store;
    this.panel = document.createElement('div');
    Object.assign(this.panel.style, {
      position: 'fixed', top: '16px', left: '16px',
      background: 'rgba(0,0,0,0.7)', color: '#fff',
      padding: '12px 16px', borderRadius: '8px',
      fontFamily: 'monospace', fontSize: '13px',
      lineHeight: '1.8', userSelect: 'none', minWidth: '260px',
    });

    this.rayCountEl = document.createElement('span');
    this.lastSphereEl = document.createElement('span');
    this.rmsErrorEl = document.createElement('span');
    this.statusEl = document.createElement('span');
    this.statusEl.style.color = '#ffaa00';

    this.undoBtn = this.makeBtn('Undo', () => dispatch(ActionCreators.undo()));
    this.redoBtn = this.makeBtn('Redo', () => dispatch(ActionCreators.redo()));
    this.clearBtn = this.makeBtn('New Ray Set', () => dispatch(clearRays()));

    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '6px';
    btnRow.append(this.undoBtn, this.redoBtn, this.clearBtn);

    const line = (label: string, val: HTMLSpanElement) => {
      const d = document.createElement('div');
      d.textContent = label;
      d.appendChild(val);
      return d;
    };

    this.panel.append(
      line('Current rays: ', this.rayCountEl),
      line('Last sphere: ', this.lastSphereEl),
      line('RMS error: ', this.rmsErrorEl),
      line('Status: ', this.statusEl),
      btnRow,
    );

    document.body.appendChild(this.panel);

    this.unsubscribe = store.subscribe(() => this.render());
    this.render();
  }

  showStatus(msg: string) {
    this.statusEl.textContent = msg;
    if (this.statusTimer !== null) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => { this.statusEl.textContent = ''; }, 3000);
  }

  private render() {
    const state = this.store.getState();
    this.rayCountEl.textContent = String(selectCurrentRayCount(state));

    const last = selectLastSphere(state);
    if (last) {
      const p = last.position;
      this.lastSphereEl.textContent = `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
      this.rmsErrorEl.textContent = last.rmsError.toFixed(4);
    } else {
      this.lastSphereEl.textContent = '—';
      this.rmsErrorEl.textContent = '—';
    }

    this.undoBtn.disabled = !selectCanUndo(state);
    this.redoBtn.disabled = !selectCanRedo(state);
  }

  private makeBtn(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, { marginRight: '6px', cursor: 'pointer' });
    btn.addEventListener('click', onClick);
    return btn;
  }

  dispose() {
    this.unsubscribe?.();
    document.body.removeChild(this.panel);
  }
}
