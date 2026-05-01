import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// --- 1. INITIALIZATION & PERFORMANCE ---
const horizonColor = 0xdddddd;
const scene = new THREE.Scene();
scene.background = new THREE.Color(horizonColor);
scene.fog = new THREE.Fog(horizonColor, 20, 150);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false }); // Disabled for FPS
renderer.setPixelRatio(1); 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

// --- 2. LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 1.0));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// --- 3. WORLD ELEMENTS ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
scene.add(floor);
scene.add(new THREE.GridHelper(2000, 100, 0xaaaaaa, 0xcccccc));

// --- 4. CAR CREATION (Procedural Placeholder) ---
const carGroup = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 4), new THREE.MeshLambertMaterial({ color: 0xff0000 }));
body.position.y = 0.5;
carGroup.add(body);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2), new THREE.MeshLambertMaterial({ color: 0x333333 }));
cabin.position.y = 1.0;
cabin.position.z = -0.2;
carGroup.add(cabin);

scene.add(carGroup);

// Optional: Load your .glb car here if you have one
// const loader = new GLTFLoader();
// loader.load('car.glb', (gltf) => { scene.remove(carGroup); scene.add(gltf.scene); carGroup = gltf.scene; });

// --- 5. CAR PHYSICS VARIABLES ---
let speed = 0;
let drift = 0;
const config = {
    acceleration: 20.0,
    friction: 0.98,
    turnSpeed: 1.5,
    maxSpeed: 40.0
};

// --- 6. CONTROLS ---
const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');
instructions.addEventListener('click', () => controls.lock());

const move = { fwd: false, bkd: false, lft: false, rgt: false };
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') move.fwd = true;
    if (e.code === 'KeyS') move.bkd = true;
    if (e.code === 'KeyA') move.lft = true;
    if (e.code === 'KeyD') move.rgt = true;
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') move.fwd = false;
    if (e.code === 'KeyS') move.bkd = false;
    if (e.code === 'KeyA') move.lft = false;
    if (e.code === 'KeyD') move.rgt = false;
});

// --- 7. ANIMATION LOOP ---
const clock = new THREE.Clock();
const cameraOffset = new THREE.Vector3(0, 4, 10); // How far behind the car

function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (carGroup) {
        // --- 1. Car Movement Physics ---
        if (move.fwd) speed += config.acceleration * delta;
        if (move.bkd) speed -= config.acceleration * delta;

        speed *= config.friction; // Natural slow down
        if (Math.abs(speed) > config.maxSpeed) speed = Math.sign(speed) * config.maxSpeed;

        // Steering logic (only steer if moving)
        if (Math.abs(speed) > 0.1) {
            const steeringDir = speed > 0 ? 1 : -1;
            if (move.lft) carGroup.rotation.y += config.turnSpeed * delta * steeringDir;
            if (move.rgt) carGroup.rotation.y -= config.turnSpeed * delta * steeringDir;
        }

        // Apply Speed to Position
        carGroup.translateZ(speed * delta);

        // --- 2. Third Person Camera Logic ---
        // We create a position behind the car relative to its rotation
        const relativeCameraOffset = cameraOffset.clone().applyQuaternion(carGroup.quaternion);
        const targetCameraPos = carGroup.position.clone().add(relativeCameraOffset);

        // Smoothly move camera (lerp) for that high-quality car feel
        camera.position.lerp(targetCameraPos, 0.1);
        
        // If mouse is locked, we let the camera "look around" slightly
        // otherwise it stays locked to the car's rear
        camera.lookAt(carGroup.position);
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
