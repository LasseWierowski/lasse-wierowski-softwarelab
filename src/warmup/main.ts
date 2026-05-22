import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import RotateComponent from "./RotateComponent";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

//rotation 
const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(
  75,                                      
  window.innerWidth / window.innerHeight,  
  0.1,                                     
  1000                                     
);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);



const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;   // Trägheit beim Bewegen
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 50;

//neues solar system
const solarSystem = new THREE.Object3D();
scene.add(solarSystem);

const rotateComponent = new RotateComponent(solarSystem, new THREE.Vector3(0, 1, 0), 0.3);


//sonne
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.4 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0, 0, 0);
solarSystem.add(sun);

//erde
const earthGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const earthMaterial = new THREE.MeshStandardMaterial({ color: 0x2266ff });
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.position.set(5, 0, 0);
solarSystem.add(earth);

//mars
const marsGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const marsMaterial = new THREE.MeshStandardMaterial({ color: 0xcc3300 });
const mars = new THREE.Mesh(marsGeometry, marsMaterial);
mars.position.set(8, 0, 2);
solarSystem.add(mars);


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  rotateComponent.update(deltaTime);

  controls.update();
  renderer.render(scene, camera);
}

animate();