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
const config = { accel: 100.0, friction: 0.95, turn: 1.5, maxSpeed: 100.0 };

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
        // --- 1. EXISTING PHYSICS ---
        if (keys['KeyW']) speed -= config.accel * delta;
        if (keys['KeyS']) speed += config.accel * delta;
        speed *= config.friction;

        if (Math.abs(speed) > 0.1) {
            const sDir = speed > 0 ? 1 : -1;
            if (keys['KeyA']) carHolder.rotation.y -= config.turn * delta * sDir;
            if (keys['KeyD']) carHolder.rotation.y += config.turn * delta * sDir;
        }
        carHolder.translateZ(-speed * delta);

        // --- 2. FORZA STYLE CAMERA ---
        
        // DYNAMIC FOV: The faster you go, the wider the lens gets (Speed Warp)
        // Base FOV is 75, adds up to 15 degrees at max speed
        const targetFOV = 75 + (Math.abs(speed) / config.maxSpeed) * 15;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
        camera.updateProjectionMatrix();

        // OFFSET CALCULATIONS
        // As you speed up, the camera pulls back further (camOffset.z + extra)
        const speedFactor = Math.abs(speed) / config.maxSpeed;
        const dynamicOffset = new THREE.Vector3(
            0, 
            3 + (speedFactor * 0.5), // Rises slightly
            8 + (speedFactor * 4)    // Pulls back significantly
        );

        // Calculate position behind the car
        const idealPos = dynamicOffset.clone().applyQuaternion(carHolder.quaternion).add(carHolder.position);
        
        // LERP: Using a slightly higher value (0.15) to prevent the "jitter" 
        // while keeping the smooth Forza "floating" feel.
        camera.position.lerp(idealPos, 0.15);

        // LOOK-AT: Look slightly ahead of the car to see the road
        const lookAtTarget = carHolder.position.clone();
        const lookAhead = new THREE.Vector3(0, 0, -5).applyQuaternion(carHolder.quaternion);
        lookAtTarget.add(lookAhead); 
        
        camera.lookAt(lookAtTarget.x, lookAtTarget.y + 1.2, lookAtTarget.z);
    }

    renderer.render(scene, camera);
    stats.end();
}
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
