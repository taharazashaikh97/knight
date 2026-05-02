import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc); 
scene.fog = new THREE.Fog(0xcccccc, 10, 500);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'lowp' });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);
scene.add(new THREE.AmbientLight(0xffffff, 1.0));

// --- 2. ENVIRONMENT ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000), 
    new THREE.MeshLambertMaterial({ color: 0x999999 }) 
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0; 
scene.add(floor);

const grid = new THREE.GridHelper(2000, 100, 0x444444, 0x888888);
grid.position.y = 0.01;
scene.add(grid);

// --- 3. PLAYER & CAR ---
let isDriving = false;
const carHolder = new THREE.Group();
carHolder.position.set(0, 0, 0);
scene.add(carHolder);

const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x00ff00 })
);
player.position.set(5, 1, 5);
scene.add(player);

const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());

let carModel, speed = 0;
// TUNED FORZA CONFIG
const config = { 
    accel: 85.0, 
    drag: 0.97,       // Smooth roll-off
    brake: 110.0,     // Strong braking
    baseTurn: 2.8,    // Max turning capability
    maxSpeed: 110.0 
};
const playerSpeed = 15.0;
const keys = {};

const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    carModel = gltf.scene;
    carModel.rotation.y = Math.PI; 
    carHolder.add(carModel);
});

window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if (e.code === 'KeyE') {
        const dist = player.position.distanceTo(carHolder.position);
        if (!isDriving && dist < 6) {
            isDriving = true;
            player.visible = false;
        } else if (isDriving) {
            isDriving = false;
            player.visible = true;
            player.position.set(carHolder.position.x + 4, 1, carHolder.position.z);
            speed = 0;
        }
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- 4. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (isDriving && carModel) {
        // --- 1. VELOCITY LOGIC ---
        if (keys['KeyW']) speed += config.accel * delta;
        if (keys['KeyS']) {
            // Brake if moving forward, reverse if stopped
            if (speed > 1) speed -= config.brake * delta;
            else speed -= config.accel * 0.5 * delta;
        }
        speed *= config.drag; // Apply air resistance

        // --- 2. FORZA STEERING GATE ---
        // We only allow turning if the car is actually moving (threshold 1.5)
        if (Math.abs(speed) > 1.5) {
            // speedFactor: 0 at stop, 1 at 35 speed. Makes low-speed turns gradual.
            const speedFactor = Math.min(Math.abs(speed) / 35, 1.0);
            
            // speedDamping: Reduces steering angle at high speeds for stability (Forza style)
            const speedDamping = speed > 60 ? 0.5 : 1.0;
            
            const turnStrength = config.baseTurn * speedFactor * speedDamping;
            const sDir = speed > 0 ? 1 : -1;

            let turnAmount = 0;
            if (keys['KeyA']) turnAmount = turnStrength * delta * sDir;
            if (keys['KeyD']) turnAmount = -turnStrength * delta * sDir;

            carHolder.rotation.y += turnAmount;

            // Visual Body Lean
            carModel.rotation.z = THREE.MathUtils.lerp(carModel.rotation.z, turnAmount * 12, 0.1);
        } else {
            // Reset body lean when car slows down
            carModel.rotation.z = THREE.MathUtils.lerp(carModel.rotation.z, 0, 0.1);
        }

        carHolder.translateZ(speed * delta);

        // Third Person Camera
        const camPos = new THREE.Vector3(0, 5, 13).applyQuaternion(carHolder.quaternion).add(carHolder.position);
        camera.position.lerp(camPos, 0.1);
        camera.lookAt(carHolder.position.x, carHolder.position.y + 1, carHolder.position.z);

    } else {
        // --- WALKING MODE ---
        const oldPos = player.position.clone();
        if (keys['KeyW']) player.translateZ(-playerSpeed * delta);
        if (keys['KeyS']) player.translateZ(playerSpeed * delta);
        if (keys['KeyA']) player.rotation.y += 3.0 * delta;
        if (keys['KeyD']) player.rotation.y -= 3.0 * delta;

        if (player.position.distanceTo(carHolder.position) < 4) player.position.copy(oldPos);

        const pCamPos = new THREE.Vector3(0, 4, 8).applyQuaternion(player.quaternion).add(player.position);
        camera.position.lerp(pCamPos, 0.1);
        camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
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
