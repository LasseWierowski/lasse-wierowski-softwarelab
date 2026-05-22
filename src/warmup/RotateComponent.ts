import * as THREE from 'three';

class RotateComponent {
  private object: THREE.Object3D;
  private axis: THREE.Vector3;
  private speed: number;

  constructor(object: THREE.Object3D, axis: THREE.Vector3, speed: number) {
    this.object = object;
    
    this.axis = axis;
    this.speed = speed;
  }

  update(deltaTime: number): void {
    this.object.rotateOnAxis(this.axis, this.speed * deltaTime);
  }
}

export default RotateComponent;