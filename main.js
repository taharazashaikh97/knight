import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. SETUP ---
const horizonColor = 0xdddddd;
const scene = new THREE.Scene();
scene.background = new THREE.Color(horizonColor);
scene.fog = new THREE.Fog(horizonColor, 20, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

const renderer = new THREE.WebGLRenderer({ antialias: false }); // Antialias OFF for speed
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

// --- 2. LIGHTING (Standard setup for low-end) ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(10, 20, 10);
scene.add(sun);

// --- 3. TEXTURED TERRAIN ---
const textureLoader = new THREE.TextureLoader();
// Note: Use a low-res (512x512 or 1024x1024) seamless texture
const grassTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(50, 50); // Tiles the texture over the large floor

// Bumpy Terrain Geometry
const terrainSize = 1000;
const terrainSegments = 64; // High enough for bumps, low enough for G41
const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);

// RANDOMIZE HEIGHT (The "Terrain" part)
const vertices = terrainGeo.attributes.position.array;
for (let i = 0; i < vertices.length; i += 3) {
    // vertices[i+2] is the Z-axis (which becomes Y when rotated)
    const x = vertices[i];
    const y = vertices[i + 1];
    // Create soft hills using sine waves or simple randoms
    vertices[i + 2] = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 3.5;
}
terrainGeo.computeVertexNormals(); // Essential for proper lighting on bumps

const terrainMat = new THREE.MeshLambertMaterial({ 
    map: grassTexture,
    flatShading: false // Set to true for a "Low Poly" faceted look
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.rotation.x = -Math.PI / 2;
scene.add(terrain);

// --- 4. MODEL LOADING ---
const loader = new GLTFLoader();
let mixer;

loader.load('knight.glb', (gltf) => {
    const knight = gltf.scene;
    knight.position.y = 2.0; // Adjust based on terrain height at center
    scene.add(knight);
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(knight);
        mixer.clipAction(gltf.animations[0]).play();
    }
});

// --- 5. SPECTATOR CONTROLS (UNTOUCHED) ---
const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());

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

const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0); // Points straight down

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (controls.isLocked) {
        const speed = 40 * delta;

        // Move based on keys
        if (move.fwd) controls.moveForward(speed);
        if (move.bkd) controls.moveForward(-speed);
        if (move.lft) controls.moveRight(-speed);
        if (move.rgt) controls.moveRight(speed);
        
        // --- TERRAIN COLLISION LOGIC ---
        // We cast a ray from high above the camera down to the ground
        const rayPos = camera.position.clone();
        rayPos.y += 10; // Start the ray slightly above the camera
        raycaster.set(rayPos, downVector);

        // Check if the ray hits the terrain
        const intersect = raycaster.intersectObject(terrain);

        if (intersect.length > 0) {
            const groundHeight = intersect[0].point.y;
            const playerHeight = 1.8; // How high the "eyes" are from the ground

            // If the camera tries to go below the ground (+ player height)
            if (camera.position.y < groundHeight + playerHeight) {
                camera.position.y = groundHeight + playerHeight;
            }
            
            // Manual Fly controls (Space/Shift)
            if (move.up) camera.position.y += speed;
            // Shift only works if we are above the ground
            if (move.dn && camera.position.y > groundHeight + playerHeight) {
                camera.position.y -= speed;
            }
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
