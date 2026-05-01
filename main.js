import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. INITIALIZATION & PERFORMANCE ---
const horizonColor = 0xdddddd; // Greyish-white

const scene = new THREE.Scene();
scene.background = new THREE.Color(horizonColor);
scene.fog = new THREE.Fog(horizonColor, 20, 150); // Fog helps potato PCs by not rendering far objects

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
// Limit pixel ratio to 1 for performance on high-res "potato" screens
renderer.setPixelRatio(1); 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. FPS COUNTER ---
const stats = new Stats();
stats.showPanel(0); // 0: fps
document.body.appendChild(stats.dom);

// --- 3. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// --- 4. WORLD ELEMENTS (Floor & Grid) ---
// Solid Greyish-White Floor
const floorGeo = new THREE.PlaneGeometry(2000, 2000);
const floorMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05; // Slightly below grid to prevent flickering
scene.add(floor);

// Visual Grid
const grid = new THREE.GridHelper(2000, 100, 0xaaaaaa, 0xcccccc);
scene.add(grid);

// --- 5. MODEL LOADING ---
const loader = new GLTFLoader();
let mixer;

loader.load('knight.glb', (gltf) => {
    scene.add(gltf.scene);
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        mixer.clipAction(gltf.animations[0]).play();
    }
}, undefined, (err) => console.error("Check if knight.glb is in the folder!", err));

// --- 6. SPECTATOR CONTROLS ---
const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => instructions.style.display = 'none');
controls.addEventListener('unlock', () => instructions.style.display = 'block');

const move = { fwd: false, bkd: false, lft: false, rgt: false, up: false, dn: false };

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

// --- 7. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    stats.begin(); // Start FPS tracking
    
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (controls.isLocked) {
        const speed = 40 * delta;

        if (move.fwd) controls.moveForward(speed);
        if (move.bkd) controls.moveForward(-speed);
        if (move.lft) controls.moveRight(-speed);
        if (move.rgt) controls.moveRight(speed);
        if (move.up) camera.position.y += speed;
        if (move.dn) camera.position.y -= speed;

        // GROUND BOUNDARY: Prevents flying under the floor
        // 1.6 is roughly average human height
        if (camera.position.y < 1.6) {
            camera.position.y = 1.6;
        }
    }

    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);

    stats.end(); // End FPS tracking
}

animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
