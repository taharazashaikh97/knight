import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);
scene.fog = new THREE.Fog(0xdddddd, 20, 150);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'lowp' });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// --- 2. ENDLESS TERRAIN SETUP ---
const textureLoader = new THREE.TextureLoader();
const grassTex = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;

const terrainGeo = new THREE.PlaneGeometry(200, 200, 40, 40); // Smaller mesh, moved with player
const terrainMat = new THREE.MeshLambertMaterial({ map: grassTex });
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.rotation.x = -Math.PI / 2;
scene.add(terrain);

// --- 3. PHYSICS CONSTANTS ---
let verticalVelocity = 0;
const gravity = -30.0;
const jumpForce = 12.0;
const playerHeight = 1.8;
const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);

// --- 4. CONTROLS ---
const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());
const move = { fwd: false, bkd: false, lft: false, rgt: false, jump: false };

document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') move.fwd = true;
    if (e.code === 'KeyS') move.bkd = true;
    if (e.code === 'KeyA') move.lft = true;
    if (e.code === 'KeyD') move.rgt = true;
    if (e.code === 'Space') move.jump = true;
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') move.fwd = false;
    if (e.code === 'KeyS') move.bkd = false;
    if (e.code === 'KeyA') move.lft = false;
    if (e.code === 'KeyD') move.rgt = false;
    if (e.code === 'Space') move.jump = false;
});

// --- 5. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (controls.isLocked) {
        const speed = 30 * delta;

        // Move horizontally
        if (move.fwd) controls.moveForward(speed);
        if (move.bkd) controls.moveForward(-speed);
        if (move.lft) controls.moveRight(-speed);
        if (move.rgt) controls.moveRight(speed);

        // --- ENDLESS TERRAIN LOGIC ---
        // Move the terrain mesh with the player
        terrain.position.x = camera.position.x;
        terrain.position.z = camera.position.z;
        // Offset the texture so it looks like we are moving over it
        grassTex.offset.set(camera.position.x / 10, -camera.position.z / 10);

        // --- GRAVITY & COLLISION ---
        raycaster.set(camera.position, downVector);
        const intersect = raycaster.intersectObject(terrain);

        if (intersect.length > 0) {
            const groundY = intersect[0].point.y;
            
            // Apply Gravity
            verticalVelocity += gravity * delta;
            camera.position.y += verticalVelocity * delta;

            // Floor Collision
            if (camera.position.y < groundY + playerHeight) {
                camera.position.y = groundY + playerHeight;
                verticalVelocity = 0; // Stop falling
                
                // Jumping
                if (move.jump) verticalVelocity = jumpForce;
            }
        }
    }

    renderer.render(scene, camera);
    stats.end();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
