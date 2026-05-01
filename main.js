import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'stats';

// --- 1. SETTINGS ---
const horizonColor = 0xdddddd;
const scene = new THREE.Scene();
scene.background = new THREE.Color(horizonColor);
scene.fog = new THREE.Fog(horizonColor, 10, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    antialias: false, 
    precision: 'lowp', // Keep this for your G41
    powerPreference: 'low-power' 
});
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

// --- 2. LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

// --- 3. THE FLOOR (FIXED FLICKERING) ---
// We move the floor further down so your old GPU doesn't get confused between the grid and floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.5; // Moved down significantly to stop flickering
scene.add(floor);

const grid = new THREE.GridHelper(2000, 100, 0xaaaaaa, 0xcccccc);
grid.position.y = 0.01; // Lift grid slightly above zero
scene.add(grid);

// --- 4. CAR & PHYSICS ---
let car;
let speed = 0;
const config = {
    accel: 30.0,
    friction: 0.97,
    turn: 2.0,
    maxSpeed: 50.0
};
const keys = { w: false, s: false, a: false, d: false };

// --- 5. LOADING CAR (FIXED ORIENTATION) ---
const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    car = gltf.scene;
    
    // THE FIX: Rotate the car 180 degrees (Math.PI) so its "Front" faces the right way
    car.rotation.y = Math.PI; 
    
    scene.add(car);
}, undefined, (err) => console.error(err));

window.addEventListener('keydown', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();
const camOffset = new THREE.Vector3(0, 3, 8); 

function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (car) {
        // Physics logic
        if (keys.w) speed += config.accel * delta;
        if (keys.s) speed -= config.accel * delta;
        speed *= config.friction;

        if (Math.abs(speed) > 0.2) {
            const steeringDir = speed > 0 ? 1 : -1;
            // Flipped turn logic to match the 180-degree rotation
            if (keys.a) car.rotation.y += config.turn * delta * steeringDir;
            if (keys.d) car.rotation.y -= config.turn * delta * steeringDir;
        }

        // Apply movement along the car's local Forward axis
        car.translateZ(speed * delta);

        // --- CAMERA FOLLOW ---
        // We look at the car's position, but slightly raised
        const targetPos = car.position.clone();
        const idealPos = camOffset.clone().applyQuaternion(car.quaternion).add(targetPos);
        
        camera.position.lerp(idealPos, 0.1);
        camera.lookAt(targetPos.add(new THREE.Vector3(0, 1, 0)));
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
