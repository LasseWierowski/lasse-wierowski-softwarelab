import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import RotateComponent from "./RotateComponent";
import { LifecycleLoggerComponent, log } from './LifecycleLoggerComponent';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const sun_light = new THREE.DirectionalLight(0xffffff, 1.2);
sun_light.position.set(5, 10, 7.5);
sun_light.castShadow = true;
sun_light.shadow.mapSize.set(2048, 2048);
sun_light.shadow.camera.near = 0.5;
sun_light.shadow.camera.far = 50;
scene.add(sun_light);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 50;

const solarSystem = new THREE.Object3D();
scene.add(solarSystem);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.4 })
);
solarSystem.add(sun);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x2266ff })
);
earth.name = 'earth';
earth.position.set(5, 0, 0);
solarSystem.add(earth);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
);
moon.name = 'moon';
moon.position.set(1.5, 0, 0);
earth.add(moon);

const mars = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xcc3300 })
);
mars.name = 'mars';
mars.position.set(8, 0, 2);
solarSystem.add(mars);

const clock = new THREE.Clock();
const solarRotate = new RotateComponent(solarSystem, new THREE.Vector3(0, 1, 0), 0.3);
const earthRotate = new RotateComponent(earth, new THREE.Vector3(0, 1, 0), 1.2);

const moonLogger = new LifecycleLoggerComponent(moon);

let moonDestroyed = false;

window.addEventListener('keydown', (e) => {
  switch (e.key.toUpperCase()) {
    case 'R':
      if (moon.parent === earth) {
        earth.remove(moon);
        mars.add(moon);
        log('Reparented', 'earth --> mars');
      } else {
        mars.remove(moon);
        earth.add(moon);
        log('Reparented', 'mars --> earth');
      }
      break;
    case 'H':
      moon.visible = !moon.visible;
      break;
    case 'X':
      if (!moonDestroyed) {
        moonLogger.dispose();
        moon.parent?.remove(moon);
        moonDestroyed = true;
      }
      break;
    case 'C':
      if (moonDestroyed) {
        earth.add(moon);
        moon.visible = true;
        moonDestroyed = false;
        log('Created', 'moon (recreated)');
      }
      break;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let markerTimer = 0;
let frameCount = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  solarRotate.update(dt);
  earthRotate.update(dt);

  markerTimer += dt;
  if (markerTimer >= 0.5) {
    const worldPos = new THREE.Vector3();
    moon.getWorldPosition(worldPos);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    marker.position.copy(worldPos);
    scene.add(marker);
    markerTimer = 0;
  }

  frameCount++;
  moonLogger.update(dt, frameCount);

  controls.update();
  renderer.render(scene, camera);
}

animate();