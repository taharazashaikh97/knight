import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. THE CLASSIC GREY SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc); // Grey Sky
scene.fog = new THREE.Fog(0xcccccc, 10, 500);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'lowp' });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);
scene.add(new THREE.AmbientLight(0xffffff, 1.0));

// --- 2. THE GREY FLOOR & GRID ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000), 
    new THREE.MeshLambertMaterial({ color: 0x999999 }) // Darker grey floor
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0; 
scene.add(floor);

const grid = new THREE.GridHelper(2000, 100, 0x444444, 0x888888);
grid.position.y = 0.01;
scene.add(grid);

// --- 3. CAR & PLAYER ---
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
const config = { accel: 80.0, friction: 0.94, turn: 2.0, maxSpeed: 100.0 };
const playerSpeed = 15.0;
const keys = {};

const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    carModel = gltf.scene;
    // We force the internal model to face "Forward" (-Z)
    // If it's still backwards, change Math.PI to 0
    carModel.rotation.y = Math.PI; 
    carHolder.add(carModel);
});

// --- 4. KEYBOARD & COLLISION ---
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

// --- 5. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (isDriving) {
        // --- DRIVING MODE (Simplified Fix) ---
        // W adds positive speed, S adds negative speed
        if (keys['KeyW']) speed += config.accel * delta;
        if (keys['KeyS']) speed -= config.accel * delta;
        
        speed *= config.friction;

        // Steering: Fixed A and D
        if (Math.abs(speed) > 0.1) {
            const steeringForce = speed > 0 ? 1 : -1;
            if (keys['KeyA']) carHolder.rotation.y += config.turn * delta * steeringForce;
            if (keys['KeyD']) carHolder.rotation.y -= config.turn * delta * steeringForce;
        }

        // We move the car along its "Forward" axis
        // If W makes it go backwards, change this to -speed
        carHolder.translateZ(speed * delta);

        // Third Person Camera Follow
        const camPos = new THREE.Vector3(0, 5, 12).applyQuaternion(carHolder.quaternion).add(carHolder.position);
        camera.position.lerp(camPos, 0.1);
        camera.lookAt(carHolder.position.x, carHolder.position.y + 1, carHolder.position.z);

    } else {
        // --- WALKING MODE (Third Person) ---
        const oldPos = player.position.clone();

        if (keys['KeyW']) player.translateZ(-playerSpeed * delta);
        if (keys['KeyS']) player.translateZ(playerSpeed * delta);
        if (keys['KeyA']) player.rotation.y += 3.0 * delta;
        if (keys['KeyD']) player.rotation.y -= 3.0 * delta;

        // Simple Collision
        if (player.position.distanceTo(carHolder.position) < 4) {
            player.position.copy(oldPos);
        }

        // Third Person Walking Camera
        const pCamPos = new THREE.Vector3(0, 4, 8).applyQuaternion(player.quaternion).add(player.position);
        camera.position.lerp(pCamPos, 0.1);
        camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
    }

    renderer.render(scene, camera);
    stats.end();
}
animate();
