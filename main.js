import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// --- INITIALIZATION ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 250);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Good for performance
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- WORLD ELEMENTS ---
const grid = new THREE.GridHelper(2000, 100, 0x000000, 0x555555);
scene.add(grid);

// --- ADD A SOLID FLOOR ---
const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x222222, // Dark gray
    roughness: 0.8 
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);

// Rotate the floor to be flat (it's vertical by default)
floor.rotation.x = -Math.PI / 2; 
floor.receiveShadow = true;
scene.add(floor);

// --- LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// --- MODEL LOADING ---
const loader = new GLTFLoader();
let mixer;

loader.load('knight.glb', (gltf) => {
    scene.add(gltf.scene);
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        mixer.clipAction(gltf.animations[0]).play();
    }
});

// --- CONTROLS ---
const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => instructions.style.display = 'none');
controls.addEventListener('unlock', () => instructions.style.display = 'block');

// Movement State
const move = { fwd: false, bkd: false, lft: false, rgt: false, up: false, dn: false };
const velocity = new THREE.Vector3();

document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') move.fwd = true;
    if (e.code === 'KeyS') move.bkd = true;
    if (e.code === 'KeyA') move.lft = true;
    if (e.code === 'KeyD') move.rgt = true;
    if (e.code === 'Space') move.up = true;
    if (e.code === 'ShiftLeft') move.dn = true;
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') move.fwd = false;
    if (e.code === 'KeyS') move.bkd = false;
    if (e.code === 'KeyA') move.lft = false;
    if (e.code === 'KeyD') move.rgt = false;
    if (e.code === 'Space') move.up = false;
    if (e.code === 'ShiftLeft') move.dn = false;
});

// --- LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (controls.isLocked) {
    const speed = 50 * delta;

    if (move.fwd) controls.moveForward(speed);
    if (move.bkd) controls.moveForward(-speed);
    if (move.lft) controls.moveRight(-speed);
    if (move.rgt) controls.moveRight(speed);
    if (move.up) camera.position.y += speed;
    if (move.dn) camera.position.y -= speed;

    // --- THE FIX: GROUND BOUNDARY ---
    // If the camera goes below 2 units high, snap it back to 2.
    // 2 is a good height for a "human" eye level, 0.5 is for "crawling".
    if (camera.position.y < 2) {
        camera.position.y = 2;
    }
}

    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
