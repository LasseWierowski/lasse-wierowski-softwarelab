import * as THREE from 'three';

export class LifecycleLoggerComponent {
  private object: THREE.Object3D;
  private lastParent: THREE.Object3D | null;
  private visible: boolean;

  constructor(object: THREE.Object3D) {
    this.object = object;
    this.lastParent = object.parent;
    this.visible = object.visible;
    log('Created', object.name || 'unnamed');
  }

  update(deltaTime: number, frameCount: number): void {
    if (frameCount % 120 === 0) {
      log('Update tick', this.object.name || 'unnamed');
    }

    if (this.object.parent !== this.lastParent) {
      if (this.lastParent && this.object.parent) {
        log('Reparented', `${this.lastParent.name} → ${this.object.parent.name}`);
      } else if (!this.object.parent) {
        log('Removed', this.object.name || 'unnamed');
      } else {
        log('Added', this.object.name || 'unnamed');
      }
      this.lastParent = this.object.parent;
    }

    if (this.object.visible !== this.visible) {
      log(this.object.visible ? 'Enabled' : 'Disabled', this.object.name || 'unnamed');
      this.visible = this.object.visible;
    }
  }

  dispose(): void {
    log('Destroyed', this.object.name || 'unnamed');
  }
}

//hilfe für logging
const panel = document.getElementById('log-panel')!;

export function log(event: string, detail: string = ''): void {
  const line = document.createElement('div');
  line.textContent = `[${event}] ${detail}`;
  panel.prepend(line);

  // nur 20 Zeilen behalten wenn zu lang
  while (panel.children.length > 20) {
    panel.removeChild(panel.lastChild!);
  }
}