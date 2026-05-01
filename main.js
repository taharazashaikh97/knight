import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'stats';

// --- 1. SUPER POTATO RENDERER ---
const horizonColor = 0xdddddd;
const scene = new THREE.Scene();
scene.background = new THREE.Color(horizonColor);
scene.fog = new THREE.Fog(horizonColor, 10, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    antialias: false, 
    precision: 'lowp', 
    powerPreference: 'low-power' 
});
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

// --- 2. LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 1.2)); // Bright ambient is cheap for G41 chips

// --- 3. WORLD ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
scene.add(new THREE.GridHelper(2000, 100, 0xaaaaaa, 0xcccccc));

// --- 4. CAR & PHYSICS VARIABLES ---
let car;
let speed = 0;
const config = {
    accel: 30.0,
    friction: 0.97,
    turn: 2.0,
    maxSpeed: 50.0
};

const keys = { w: false, s: false, a: false, d: false };

// --- 5. LOADING YOUR CAR.GLB ---
const loader = new GLTFLoader();
loader.load('Knight.glb', (gltf) => {
    car = gltf.scene;
    
    // Scale fix: some models come in huge or tiny
    car.scale.set(1, 1, 1); 
    
    scene.add(car);
    console.log("Car Loaded!");
}, undefined, (error) => {
    console.error("Make sure your file is named car.glb", error);
});

// --- 6. CONTROLS ---
window.addEventListener('keydown', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });

// --- 7. ANIMATION LOOP ---
const clock = new THREE.Clock();
const camOffset = new THREE.Vector3(0, 3, 8); // Height, Distance behind

function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (car) {
        // --- DRIVING PHYSICS ---
        if (keys.w) speed += config.accel * delta;
        if (keys.s) speed -= config.accel * delta;

        speed *= config.friction; // Drag
        
        // Steering (only if moving)
        if (Math.abs(speed) > 0.2) {
            const direction = speed > 0 ? 1 : -1;
            if (keys.a) car.rotation.y += config.turn * delta * direction;
            if (keys.d) car.rotation.y -= config.turn * delta * direction;
        }

        // Apply movement
        car.translateZ(speed * delta);

        // --- THIRD PERSON CAMERA ---
        // 1. Calculate the ideal position behind the car
        const idealPos = camOffset.clone().applyQuaternion(car.quaternion).add(car.position);
        
        // 2. Smoothly move camera to that position (0.1 = smooth, 1.0 = rigid)
        camera.position.lerp(idealPos, 0.1);
        
        // 3. Always look slightly ahead of the car
        camera.lookAt(car.position);
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
