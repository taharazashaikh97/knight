import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xA2D2FF);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 500);
const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'lowp' });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);
scene.add(new THREE.AmbientLight(0xffffff, 1.4));

// --- 2. GROUND (THE FIX: Y = 0) ---
// We set the ground to 0 so math is easier
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: 0xF4A460 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0; 
scene.add(ground);

// --- 3. PLAYER & CAR ---
let isDriving = false; 
const carHolder = new THREE.Group(); 
// THE FIX: Car sits exactly on the ground (y=0)
carHolder.position.set(0, 0, 0); 
scene.add(carHolder);

const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x00ff00 })
);
// THE FIX: Player foot is at y=0 (Capsule height is 2, so center is y=1)
player.position.set(5, 1, 5); 
scene.add(player);

const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());

let carModel, speed = 0;
const config = { accel: 70.0, friction: 0.95, turn: 1.5, maxSpeed: 90.0 };
const playerWalkSpeed = 15.0;
const keys = {};

const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    carModel = gltf.scene;
    carModel.rotation.y = Math.PI;
    // Ensure car model isn't floating inside the holder
    carModel.position.y = 0; 
    carHolder.add(carModel);
});

// --- 4. COLLISION & CONTROLS ---
window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if (e.code === 'KeyE') {
        const dist = player.position.distanceTo(carHolder.position);
        if (!isDriving && dist < 5) {
            isDriving = true;
            player.visible = false;
        } else if (isDriving) {
            isDriving = false;
            player.visible = true;
            player.position.set(carHolder.position.x + 3, 1, carHolder.position.z);
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

    if (controls.isLocked) {
        if (isDriving) {
            // DRIVING MODE
            if (keys['KeyW']) speed -= config.accel * delta;
            if (keys['KeyS']) speed += config.accel * delta;
            speed *= config.friction;

            if (Math.abs(speed) > 0.1) {
                const sDir = speed > 0 ? 1 : -1;
                if (keys['KeyA']) carHolder.rotation.y -= config.turn * delta * sDir;
                if (keys['KeyD']) carHolder.rotation.y += config.turn * delta * sDir;
            }
            carHolder.translateZ(speed * delta);

            // Simple Camera Follow
            const camOffset = new THREE.Vector3(0, 4, 10).applyQuaternion(carHolder.quaternion).add(carHolder.position);
            camera.position.lerp(camOffset, 0.1);
            camera.lookAt(carHolder.position);

        } else {
            // WALKING MODE
            const oldPos = player.position.clone(); // Record position before moving

            if (keys['KeyW']) player.translateZ(-playerWalkSpeed * delta);
            if (keys['KeyS']) player.translateZ(playerWalkSpeed * delta);
            
            // --- THE SOLID CAR FIX (Collision) ---
            const distToCar = player.position.distanceTo(carHolder.position);
            const carRadius = 3.5; // Adjust this number based on your car's size
            
            if (distToCar < carRadius) {
                // If too close, push the player back to the old position
                player.position.copy(oldPos);
            }

            player.rotation.y = camera.rotation.y;
            camera.position.copy(player.position).add(new THREE.Vector3(0, 1, 0));
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
