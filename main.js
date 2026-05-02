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

// --- 2. ENVIRONMENT ---
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.0; 
scene.add(floor);
const grid = new THREE.GridHelper(2000, 100, 0xaaaaaa, 0xcccccc);
scene.add(grid);

// --- 3. CHARACTER & CAR LOGIC ---
let isDriving = false; // The Toggle
const carHolder = new THREE.Group(); 
scene.add(carHolder);

// Create Player (Simple Capsule for performance)
const playerGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
const playerMat = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(5, -0.5, 5); // Start on the ground away from car
scene.add(player);

let carModel;
let speed = 0;
const config = { accel: 70.0, friction: 0.95, turn: 1.5, maxSpeed: 90.0 };
const playerWalkSpeed = 15.0;

const keys = {};

const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    carModel = gltf.scene;
    carModel.rotation.y = Math.PI; 
    carHolder.add(carModel);
    console.log("CAR READY - WALK NEAR AND PRESS E");
});

// UI HINT
const ui = document.createElement('div');
ui.style.position = 'absolute';
ui.style.top = '20px';
ui.style.width = '100%';
ui.style.textAlign = 'center';
ui.style.color = 'black';
ui.style.fontFamily = 'Arial';
ui.innerHTML = 'WASD to Walk | Approach Car and Press E';
document.body.appendChild(ui);

window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    
    // ENTER/EXIT LOGIC
    if (e.code === 'KeyE') {
        const distance = player.position.distanceTo(carHolder.position);
        
        if (!isDriving && distance < 6) {
            // ENTER CAR
            isDriving = true;
            player.visible = false;
            ui.innerHTML = 'DRIVING | Press E to Exit';
        } else if (isDriving) {
            // EXIT CAR
            isDriving = false;
            player.visible = true;
            // Spawn player to the left of the car
            player.position.set(carHolder.position.x + 3, -0.5, carHolder.position.z);
            ui.innerHTML = 'WALKING | Press E to Enter';
            speed = 0;
        }
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- 4. ANIMATION LOOP ---
const clock = new THREE.Clock();
const carCamOffset = new THREE.Vector3(0, 4, 10);
const playerCamOffset = new THREE.Vector3(0, 3, 6);

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (isDriving) {
        // --- CAR PHYSICS (UNTOUCHED) ---
        if (keys['KeyW']) speed -= config.accel * delta;
        if (keys['KeyS']) speed += config.accel * delta;
        speed *= config.friction;

        if (Math.abs(speed) > 0.1) {
            const sDir = speed > 0 ? 1 : -1;
            if (keys['KeyA']) carHolder.rotation.y -= config.turn * delta * sDir;
            if (keys['KeyD']) carHolder.rotation.y += config.turn * delta * sDir;
        }

        carHolder.translateZ(speed * delta);

        // CAR CAMERA
        const idealPos = carCamOffset.clone().applyQuaternion(carHolder.quaternion).add(carHolder.position);
        camera.position.lerp(idealPos, 0.1);
        camera.lookAt(carHolder.position.x, carHolder.position.y + 1, carHolder.position.z);

    } else {
        // --- PLAYER WALKING ---
        if (keys['KeyW']) player.translateZ(-playerWalkSpeed * delta);
        if (keys['KeyS']) player.translateZ(playerWalkSpeed * delta);
        if (keys['KeyA']) player.rotation.y += 3.0 * delta;
        if (keys['KeyD']) player.rotation.y -= 3.0 * delta;

        // PLAYER CAMERA
        const pIdealPos = playerCamOffset.clone().applyQuaternion(player.quaternion).add(player.position);
        camera.position.lerp(pIdealPos, 0.1);
        camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
        
        // Proximity Hint
        const dist = player.position.distanceTo(carHolder.position);
        if (dist < 6) ui.style.fontWeight = 'bold';
        else ui.style.fontWeight = 'normal';
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
