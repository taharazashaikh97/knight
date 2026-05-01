import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'stats';

// --- 1. SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);
scene.fog = new THREE.Fog(0xdddddd, 20, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false }); // Performance boost
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

// --- 2. LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --- 3. FLOOR ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshLambertMaterial({ color: 0xeeeeee })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- 4. PLAYER & PHYSICS VARIABLES ---
let knight, mixer, walkAction, idleAction;
let playerPos = new THREE.Vector3(0, 0, 0);
let playerVelocity = new THREE.Vector3();
const speed = 7;
const clock = new THREE.Clock();

const keys = { w: false, a: false, s: false, d: false };
document.addEventListener('keydown', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });

// --- 5. LOADING THE KNIGHT ---
const loader = new GLTFLoader();
loader.load('knight.glb', (gltf) => {
    knight = gltf.scene;
    scene.add(knight);

    mixer = new THREE.AnimationMixer(knight);
    
    // Note: Quaternius models usually have: 0: Idle, 1: Run/Walk
    // If your knight slides without moving legs, swap these numbers!
    idleAction = mixer.clipAction(gltf.animations[0]); 
    walkAction = mixer.clipAction(gltf.animations[1] || gltf.animations[0]); 

    idleAction.play();
});

// --- 6. GAME LOOP ---
function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (knight) {
        let moving = false;
        playerVelocity.set(0, 0, 0);

        // Simple Translation Physics
        if (keys.w) { playerVelocity.z = -speed * delta; moving = true; }
        if (keys.s) { playerVelocity.z = speed * delta; moving = true; }
        if (keys.a) { playerVelocity.x = -speed * delta; moving = true; }
        if (keys.d) { playerVelocity.x = speed * delta; moving = true; }

        // Apply Movement
        knight.position.add(playerVelocity);

        // Rotation Logic: Make knight face the direction of movement
        if (moving) {
            const angle = Math.atan2(playerVelocity.x, playerVelocity.z);
            knight.rotation.y = angle;
            
            // Animation Switch
            if (walkAction && !walkAction.isRunning()) {
                idleAction.stop();
                walkAction.play();
            }
        } else {
            if (idleAction && !idleAction.isRunning()) {
                walkAction.stop();
                idleAction.play();
            }
        }

        // --- THIRD PERSON CAMERA PHYSICS ---
        // Camera stays at a fixed offset behind the knight
        const cameraOffset = new THREE.Vector3(0, 5, 10); 
        const desiredCameraPos = knight.position.clone().add(cameraOffset);
        
        // Smoothly lerp (linear interpolate) camera for a "weighty" feel
        camera.position.lerp(desiredCameraPos, 0.1); 
        camera.lookAt(knight.position);
    }

    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
    stats.end();
}

animate();
