import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. SETUP & STYLIZED WORLD ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xA2D2FF);
scene.fog = new THREE.Fog(0xFFEFD5, 10, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 500);
const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'lowp' });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

scene.add(new THREE.AmbientLight(0xffffff, 1.4));
const sun = new THREE.DirectionalLight(0xfff5e1, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

// --- 2. ENVIRONMENT ---
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: 0xF4A460 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.0; 
scene.add(floor);

// --- 3. PLAYER, CAR, & CONTROLS ---
let isDriving = false; 
const carHolder = new THREE.Group(); 
scene.add(carHolder);

const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x00ff00 })
);
player.position.set(5, -0.5, 5); 
scene.add(player);

// MOUSE CONTROL SETUP
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
    carHolder.add(carModel);
});

// UI
const ui = document.createElement('div');
ui.style.cssText = 'position:absolute; top:20px; width:100%; text-align:center; color:black; font-family:Arial; font-weight:bold;';
ui.innerHTML = 'CLICK TO START | WASD TO WALK | MOUSE TO LOOK';
document.body.appendChild(ui);

// --- 4. KEYBOARD LISTENERS ---
window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if (e.code === 'KeyE') {
        const distance = player.position.distanceTo(carHolder.position);
        if (!isDriving && distance < 6) {
            isDriving = true;
            player.visible = false;
            ui.innerHTML = 'DRIVING | E TO EXIT';
        } else if (isDriving) {
            isDriving = false;
            player.visible = true;
            player.position.set(carHolder.position.x + 3, -0.5, carHolder.position.z);
            ui.innerHTML = 'WALKING | E TO ENTER';
            speed = 0;
        }
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- 5. ANIMATION LOOP ---
const clock = new THREE.Clock();
const carCamOffset = new THREE.Vector3(0, 4, 10);
const playerCamOffset = new THREE.Vector3(0, 3, 6);

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (controls.isLocked) { // Only move if mouse is locked
        if (isDriving) {
            // DRIVING PHYSICS
            if (keys['KeyW']) speed -= config.accel * delta;
            if (keys['KeyS']) speed += config.accel * delta;
            speed *= config.friction;

            if (Math.abs(speed) > 0.1) {
                const sDir = speed > 0 ? 1 : -1;
                if (keys['KeyA']) carHolder.rotation.y -= config.turn * delta * sDir;
                if (keys['KeyD']) carHolder.rotation.y += config.turn * delta * sDir;
            }
            carHolder.translateZ(speed * delta);

            // CAMERA: In driving mode, we keep the original follow logic
            const idealPos = carCamOffset.clone().applyQuaternion(carHolder.quaternion).add(carHolder.position);
            camera.position.lerp(idealPos, 0.1);
            camera.lookAt(carHolder.position.x, carHolder.position.y + 1, carHolder.position.z);

        } else {
            // WALKING PHYSICS
            if (keys['KeyW']) player.translateZ(-playerWalkSpeed * delta);
            if (keys['KeyS']) player.translateZ(playerWalkSpeed * delta);
            
            // MOUSE ROTATION: Use the delta movement of the mouse to rotate the player
            // PointerLockControls handles the camera rotation automatically, 
            // but we make the player body follow the camera direction.
            player.rotation.y = camera.rotation.y;

            // CAMERA: Stick to player's head
            const pPos = new THREE.Vector3(0, 2, 0).add(player.position);
            camera.position.copy(pPos);
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
