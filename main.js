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

// --- 3. CAR LOGIC ---
const carHolder = new THREE.Group(); // Using Group instead of Object3D
scene.add(carHolder);

let carModel;
let speed = 0;
const config = { accel: 70.0, friction: 0.95, turn: 1.0, maxSpeed: 90.0 };

// NEW KEY TRACKER
const keys = {};

const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    carModel = gltf.scene;
    carModel.rotation.y = Math.PI; // Your solved orientation
    carHolder.add(carModel);
    console.log("CAR READY - PRESS W TO GO");
});

// BETTER EVENT LISTENERS
window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    console.log("Key Pressed:", e.code); // This will show in F12 console
});
window.addEventListener('keyup', (e) => { 
    keys[e.code] = false; 
});

// --- 4. ANIMATION LOOP ---
const clock = new THREE.Clock();
const camOffset = new THREE.Vector3(0, 4, 10); 

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (carHolder && carModel) {
        // MOVEMENT
        if (keys['KeyW']) speed -= config.accel * delta;
        if (keys['KeyS']) speed += config.accel * delta;
        
        speed *= config.friction;

        // STEERING
        if (Math.abs(speed) > 0.1) {
            const sDir = speed > 0 ? 1 : -1;
            if (keys['KeyA']) carHolder.rotation.y -= config.turn * delta * sDir;
            if (keys['KeyD']) carHolder.rotation.y += config.turn * delta * sDir;
        }

        // Apply movement (Try -speed if it still goes backward)
        carHolder.translateZ(speed * delta);

        // CAMERA
        const idealPos = camOffset.clone().applyQuaternion(carHolder.quaternion).add(carHolder.position);
        camera.position.lerp(idealPos, 0.1);
        camera.lookAt(carHolder.position.x, carHolder.position.y + 1, carHolder.position.z);
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
