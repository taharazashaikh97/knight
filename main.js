import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'stats';

// --- 1. SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 500);
const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'lowp' });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

// --- 2. ENVIRONMENT (UNTOUCHED THEME) ---
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.0; 
scene.add(floor);
const grid = new THREE.GridHelper(2000, 100, 0xaaaaaa, 0xcccccc);
scene.add(grid);

// --- 3. CHARACTER & CAR LOGIC ---
let isDriving = false; 
const carHolder = new THREE.Group(); 
scene.add(carHolder);

const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x00ff00 })
);
player.position.set(5, -0.5, 5); 
scene.add(player);

let carModel;
let speed = 0;

// FORZA PHYSICS CONFIG
const config = { 
    accel: 85.0, 
    drag: 0.96,       // Natural slowing down
    brake: 120.0,     // Stronger than accel
    baseTurn: 1.4,    // Turning at low speed
    maxSpeed: 110.0,
    rollStrength: 0.05 // How much the car leans
};

const playerWalkSpeed = 15.0;
const keys = {};

const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    carModel = gltf.scene;
    carModel.rotation.y = Math.PI; 
    carHolder.add(carModel);
});

const ui = document.createElement('div');
ui.style.position = 'absolute'; ui.style.top = '20px'; ui.style.width = '100%'; ui.style.textAlign = 'center';
ui.style.color = 'black'; ui.style.fontFamily = 'Arial';
ui.innerHTML = 'WASD to Walk | Press E to Enter';
document.body.appendChild(ui);

window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if (e.code === 'KeyE') {
        const distance = player.position.distanceTo(carHolder.position);
        if (!isDriving && distance < 6) {
            isDriving = true; player.visible = false;
            ui.innerHTML = 'DRIVING | Press E to Exit';
        } else if (isDriving) {
            isDriving = false; player.visible = true;
            player.position.set(carHolder.position.x + 3, -0.5, carHolder.position.z);
            ui.innerHTML = 'WALKING | Press E to Enter';
            speed = 0;
        }
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- 4. ANIMATION LOOP ---
const clock = new THREE.Clock();
const carCamOffset = new THREE.Vector3(0, 4, 11);
const playerCamOffset = new THREE.Vector3(0, 3, 6);

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (isDriving && carModel) {
        // --- 1. ACCEL & BRAKING ---
        if (keys['KeyW']) speed -= config.accel * delta;
        if (keys['KeyS']) {
            // If moving forward, S acts as a brake
            if (speed < 0) speed += config.brake * delta;
            else speed += config.accel * 0.5 * delta; // Reverse is slower
        }
        
        // Natural Drag (Simulating air resistance)
        speed *= config.drag;

        // --- 2. SPEED-SENSITIVE STEERING (FORZA TRICK) ---
        // Formula: Turning becomes harder the faster you go
        const speedFactor = Math.abs(speed) / config.maxSpeed;
        const currentTurnAbility = config.baseTurn * (1.1 - speedFactor * 0.6);

        if (Math.abs(speed) > 0.5) {
            const sDir = speed > 0 ? 1 : -1;
            let actualTurn = 0;
            
            if (keys['KeyA']) actualTurn = currentTurnAbility * delta * sDir;
            if (keys['KeyD']) actualTurn = -currentTurnAbility * delta * sDir;
            
            carHolder.rotation.y += actualTurn;

            // --- 3. BODY ROLL (VISUAL PHYSICS) ---
            // Leans the car model slightly when turning
            carModel.rotation.z = THREE.MathUtils.lerp(
                carModel.rotation.z, 
                actualTurn * config.rollStrength * 50, 
                0.1
            );
        } else {
            // Reset lean when stopped
            carModel.rotation.z = THREE.MathUtils.lerp(carModel.rotation.z, 0, 0.1);
        }

        carHolder.translateZ(speed * delta);

        // --- 4. DYNAMIC CAMERA ---
        const fovTarget = 75 + (Math.abs(speed) / config.maxSpeed) * 15;
        camera.fov = THREE.MathUtils.lerp(camera.fov, fovTarget, 0.1);
        camera.updateProjectionMatrix();

        const idealPos = carCamOffset.clone().applyQuaternion(carHolder.quaternion).add(carHolder.position);
        camera.position.lerp(idealPos, 0.12);
        camera.lookAt(carHolder.position.x, carHolder.position.y + 1, carHolder.position.z);

    } else {
        // --- PLAYER WALKING (UNTOUCHED) ---
        if (keys['KeyW']) player.translateZ(-playerWalkSpeed * delta);
        if (keys['KeyS']) player.translateZ(playerWalkSpeed * delta);
        if (keys['KeyA']) player.rotation.y -= 3.0 * delta;
        if (keys['KeyD']) player.rotation.y += 3.0 * delta;

        const pIdealPos = playerCamOffset.clone().applyQuaternion(player.quaternion).add(player.position);
        camera.position.lerp(pIdealPos, 0.1);
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
