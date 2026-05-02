import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. INITIALIZATION & PERFORMANCE ---
const horizonColor = 0xdddddd; 

const scene = new THREE.Scene();
scene.background = new THREE.Color(horizonColor);
scene.fog = new THREE.Fog(horizonColor, 20, 150);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1); 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. FPS COUNTER ---
const stats = new Stats();
stats.showPanel(0); 
document.body.appendChild(stats.dom);

// --- 3. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// --- 4. WORLD ELEMENTS (Floor & Grid) ---
const floorGeo = new THREE.PlaneGeometry(2000, 2000);
const floorMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05; 
scene.add(floor);

const grid = new THREE.GridHelper(2000, 100, 0xaaaaaa, 0xcccccc);
scene.add(grid);

// --- 5. MODEL LOADING ---
const loader = new GLTFLoader();
let mixer;

// Original Knight Model
loader.load('kNNight.glb', (gltf) => {
    scene.add(gltf.scene);
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        mixer.clipAction(gltf.animations[0]).play();
    }
}, undefined, (err) => console.error("Check if knight.glb is in the folder!", err));

// --- NEW: GROUND OBJECT SUMMON ---
// This loads your second object and places it firmly on the ground
loader.load('Knight.glb', (gltf) => {
    const groundObj = gltf.scene;
    
    // Position: x, y, z (0 on Y means it is touching the floor)
    groundObj.position.set(10, 0, 0); 
    
    // Scale: Adjust these numbers if the object is too big or small
    groundObj.scale.set(1, 1, 1); 
    
    scene.add(groundObj);
    console.log("Ground object loaded successfully!");
}, undefined, (err) => console.error("Error loading ground object!", err));

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
    stats.begin(); 
    
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

        if (camera.position.y < 1.6) {
            camera.position.y = 1.6;
        }
    }

    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);

    stats.end(); 
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
