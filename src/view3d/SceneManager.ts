import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Ray, Vector3 } from '../logic/rayIntersection';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

//let timeSinceLastCameraUpdate = 0;
//const CAMERA_UPDATE_INTERVAL = 0.5; // alle 500ms

interface AppState {
  currentRays: Ray[];
  spheres: { id: string; position: Vector3; rmsError: number; rays: Ray[] }[];
  cameraPose: { position: Vector3; direction: Vector3 };
}

export class SceneManager {

  private labelRenderer: CSS2DRenderer;
  private labels: Map<string, CSS2DObject> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private rayLines: Map<string, THREE.Line> = new Map();
  private sphereMeshes: Map<string, THREE.Mesh> = new Map();


  public onDeleteSphere?: (id: string) => void;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 10);

    //Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // labelRenderer ERST erstellen, dann benutzen
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('click', (e) => {
      if (!e.shiftKey) return;
      
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = Array.from(this.sphereMeshes.values());
      const intersects = this.raycaster.intersectObjects(meshes);
      
      if (intersects.length > 0) {
        const hoveredMesh = intersects[0].object;
        for (const [id, mesh] of this.sphereMeshes) {
          if (mesh === hoveredMesh) {
            this.onDeleteSphere?.(id);
          }
        }
      }
    });

  }

  public onCameraPoseUpdate?: (pose: { position: Vector3; direction: Vector3 }) => void;

  syncWithState(state: AppState): void {
    const allRays = [
      ...state.currentRays.map((r, i) => ({ id: `current-${i}`, ray: r })),
      ...state.spheres.flatMap(s => s.rays.map((r, i) => ({ id: `${s.id}-ray-${i}`, ray: r }))),
    ];

    // Rays die nicht mehr da sind raus machen
    for (const [id, line] of this.rayLines) {
      if (!allRays.find(r => r.id === id)) {
        this.scene.remove(line);
        this.rayLines.delete(id);
      }
    }

    // Neue Rays dazu packen
    for (const { id, ray } of allRays) {
      if (!this.rayLines.has(id)) {
        const { origin, direction } = ray;
        const points = [
          new THREE.Vector3(origin.x, origin.y, origin.z),
          new THREE.Vector3(
            origin.x + direction.x * 20,
            origin.y + direction.y * 20,
            origin.z + direction.z * 20
          ),
        ];
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: 0x00ff88 })
        );
        this.scene.add(line);
        this.rayLines.set(id, line);
      }
    }

    // Spheres die nicht mehr im State sind entfernen
    for (const [id, mesh] of this.sphereMeshes) {
      if (!state.spheres.find(s => s.id === id)) {
        this.scene.remove(mesh);
        this.sphereMeshes.delete(id);
      }
    }

    // Neue Spheres hinzufügen
    for (const sphere of state.spheres) {
      if (!this.sphereMeshes.has(sphere.id)) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0xff4444 })
        );
        mesh.position.set(sphere.position.x, sphere.position.y, sphere.position.z);
        this.scene.add(mesh);
        this.sphereMeshes.set(sphere.id, mesh);
      }
    }
  }

  getCurrentRay(): Ray {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return {
      origin: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      direction: { x: dir.x, y: dir.y, z: dir.z },
    };
  }

  start(): void {
    const clock = new THREE.Clock();
    let timeSinceLastCameraUpdate = 0;
    const CAMERA_UPDATE_INTERVAL = 0.5;

    const loop = () => {
      const deltaTime = clock.getDelta();
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);

      timeSinceLastCameraUpdate += deltaTime;
      if (timeSinceLastCameraUpdate >= CAMERA_UPDATE_INTERVAL) {
        timeSinceLastCameraUpdate = 0;
        this.onCameraPoseUpdate?.({
          position: {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z,
          },
          direction: {
            x: dir.x,
            y: dir.y,
            z: dir.z,
          }
        });
      }

      requestAnimationFrame(loop);
      this.controls.update();
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = Array.from(this.sphereMeshes.values());
      const intersects = this.raycaster.intersectObjects(meshes);

      for (const label of this.labels.values()) {
        label.element.style.display = 'none';
      }

      if (intersects.length > 0) {
        const hoveredMesh = intersects[0].object;
        for (const [id, mesh] of this.sphereMeshes) {
          if (mesh === hoveredMesh) {
            const label = this.labels.get(id);
            if (label) label.element.style.display = 'block';
          }
        }
      }

      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
    };
    loop();
  }
  

}