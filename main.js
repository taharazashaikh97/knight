import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'stats';

// --- 1. RENDERER & CAMERA (Flicker Fix) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);

// Change Near from 0.1 to 1.0. This is the #1 fix for flickering on old GPUs.
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 500);
const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'lowp' });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

scene.add(new THREE.AmbientLight(0xffffff, 1.2));

// --- 2. FLOOR & GRID (Flicker Fix) ---
// Move floor even further away to ensure no Z-fighting
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.0; // Deep gap to stop flickering
scene.add(floor);

const grid = new THREE.GridHelper(2000, 100, 0xaaaaaa, 0xcccccc);
grid.position.y = 0.0; 
scene.add(grid);

// --- 3. CAR WRAPPER LOGIC ---
// We use a "Holder" object. We move the holder, and rotate the model INSIDE it.
const carHolder = new THREE.Object3D();
scene.add(carHolder);

let carModel;
let speed = 0;
const config = { accel: 35.0, friction: 0.96, turn: 2.2, maxSpeed: 55.0 };
const keys = { w: false, s: false, a: false, d: false };

const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    carModel = gltf.scene;
    
    // --- THE "FORCE FACE FORWARD" FIX ---
    // If the car is backwards, we flip the model INSIDE the holder
    // If it's still backwards, change Math.PI to 0, or Math.PI / 2
    carModel.rotation.y = Math.PI; 
    
    carHolder.add(carModel);
    console.log("Car attached to holder");
});

window.addEventListener('keydown', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });

// --- 4. ANIMATION LOOP ---
const clock = new THREE.Clock();
const camOffset = new THREE.Vector3(0, 4, 10); 

function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (carHolder && carModel) {
        // --- MOVEMENT (W/S) ---
        if (keys.w) speed += config.accel * delta;
        if (keys.s) speed -= config.accel * delta;
        speed *= config.friction;

        // --- STEERING (A/D) ---
        if (Math.abs(speed) > 0.2) {
            const steeringDir = speed > 0 ? 1 : -1;
            // If steering is reversed, change += to -=
            if (keys.a) carHolder.rotation.y += config.turn * delta * steeringDir;
            if (keys.d) carHolder.rotation.y -= config.turn * delta * steeringDir;
        }

        // We move the HOLDER. Because the model is inside, it follows.
        // If the car drives backwards when you press W, change this to -speed
        carHolder.translateZ(speed * delta);

        // --- SMOOTH CAMERA ---
        const idealPos = camOffset.clone().applyQuaternion(carHolder.quaternion).add(carHolder.position);
        camera.position.lerp(idealPos, 0.1);
        camera.lookAt(carHolder.position.clone().add(new THREE.Vector3(0, 1, 0)));
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
