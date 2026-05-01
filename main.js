import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'stats';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

scene.add(new THREE.AmbientLight(0xffffff, 1));
const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

let knight, mixer, currentAction;
let animations = {};
const keys = { w: false, a: false, s: false, d: false };

const loader = new GLTFLoader();
loader.load('knight.glb', (gltf) => {
    knight = gltf.scene;
    scene.add(knight);
    mixer = new THREE.AnimationMixer(knight);
    
    // Store all animations by name so we don't guess indexes
    gltf.animations.forEach((clip) => {
        animations[clip.name.toLowerCase()] = mixer.clipAction(clip);
    });

    // Start with idle - common names are 'idle', 'static', or animations[0]
    currentAction = animations['idle'] || mixer.clipAction(gltf.animations[0]);
    currentAction.play();
});

window.addEventListener('keydown', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    stats.begin();

    if (knight) {
        const moveDir = new THREE.Vector3();
        if (keys.w) moveDir.z -= 1;
        if (keys.s) moveDir.z += 1;
        if (keys.a) moveDir.x -= 1;
        if (keys.d) moveDir.x += 1;

        if (moveDir.length() > 0) {
            moveDir.normalize();
            knight.position.add(moveDir.multiplyScalar(7 * delta));
            
            // Rotation: Face the direction of movement
            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            knight.rotation.y = targetRotation;

            // Play walk/run animation if moving
            const walk = animations['walk'] || animations['run'];
            if (walk && currentAction !== walk) {
                currentAction.stop();
                currentAction = walk;
                currentAction.play();
            }
        } else {
            // Play idle if stopped
            const idle = animations['idle'] || mixer.clipAction(knight.animations ? knight.animations[0] : Object.values(animations)[0]);
            if (idle && currentAction !== idle) {
                currentAction.stop();
                currentAction = idle;
                currentAction.play();
            }
        }

        // Camera Follow
        const offset = new THREE.Vector3(0, 5, 10);
        camera.position.lerp(knight.position.clone().add(offset), 0.1);
        camera.lookAt(knight.position);
    }

    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
    stats.end();
}
animate();
