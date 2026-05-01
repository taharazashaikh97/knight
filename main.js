import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'stats';

// --- 1. SETUP & STYLIZED COLORS ---
const skyColor = 0x87ceeb;  // Soft Blue
const fogColor = 0xfffae0;  // Warm Creamy Yellow

const scene = new THREE.Scene();
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(fogColor, 10, 150); // Objects fade into the warm horizon

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1.0, 500);
const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'lowp' });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

// --- 2. STYLIZED LIGHTING ---
// Warm ambient light gives that "Ghibli" golden glow
const ambient = new THREE.AmbientLight(0xfff5d7, 0.8); 
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(50, 100, 50);
scene.add(sun);

// --- 3. STYLIZED GROUND ---
const groundGeo = new THREE.PlaneGeometry(2000, 2000);
const groundMat = new THREE.MeshLambertMaterial({ color: 0xd2b48c }); // Warm Sand
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.0; // Keeping the gap to prevent flickering
scene.add(ground);

// Optional: Keep the grid but make it subtle
const grid = new THREE.GridHelper(2000, 100, 0xc2a47c, 0xc2a47c); 
grid.position.y = 0;
scene.add(grid);

// --- 4. CAR LOADING & LOGIC ---
const carHolder = new THREE.Group();
scene.add(carHolder);

let carModel, speed = 0;
const config = { accel: 40.0, friction: 0.95, turn: 2.5, maxSpeed: 60.0 };
const keys = {};

const loader = new GLTFLoader();
loader.load('car.glb', (gltf) => {
    carModel = gltf.scene;
    carModel.rotation.y = Math.PI; 
    carHolder.add(carModel);
});

// --- 5. CONTROLS ---
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();
const camOffset = new THREE.Vector3(0, 4, 10); 

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (carHolder && carModel) {
        // Physics
        if (keys['KeyW']) speed += config.accel * delta;
        if (keys['KeyS']) speed -= config.accel * delta;
        speed *= config.friction;

        if (Math.abs(speed) > 0.1) {
            const sDir = speed > 0 ? 1 : -1;
            if (keys['KeyA']) carHolder.rotation.y += config.turn * delta * sDir;
            if (keys['KeyD']) carHolder.rotation.y -= config.turn * delta * sDir;
        }
        carHolder.translateZ(-speed * delta);

        // Forza Camera Logic
        const speedFactor = Math.abs(speed) / config.maxSpeed;
        const targetFOV = 75 + (speedFactor * 15);
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
        camera.updateProjectionMatrix();

        const dynamicOffset = new THREE.Vector3(0, 3 + (speedFactor), 8 + (speedFactor * 4));
        const idealPos = dynamicOffset.applyQuaternion(carHolder.quaternion).add(carHolder.position);
        camera.position.lerp(idealPos, 0.15);
        
        const lookAhead = new THREE.Vector3(0, 0, -5).applyQuaternion(carHolder.quaternion);
        camera.lookAt(carHolder.position.clone().add(lookAhead).add(new THREE.Vector3(0, 1.2, 0)));
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
