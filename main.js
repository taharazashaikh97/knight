import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'stats';

// ---  SETUP ---
const horizonColor = 0xdddddd;
const scene = new THREE.Scene();
scene.background = new THREE.Color(horizonColor);
scene.fog = new THREE.Fog(horizonColor, 20, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

const renderer = new THREE.WebGLRenderer({ antialias: false }); // Antialias OFF for speed
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

// ---  LIGHTING (Standard setup for low-end) ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(10, 20, 10);
scene.add(sun);

// --- TEXTURED TERRAIN ---
const textureLoader = new THREE.TextureLoader();
// Note: Use a low-res (512x512 or 1024x1024) seamless texture
const grassTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(50, 50); // Tiles the texture over the large floor

// Bumpy Terrain Geometry
const terrainSize = 1000;
const terrainSegments = 64; // High enough for bumps, low enough for G41
const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);

// RANDOMIZE HEIGHT (The "Terrain" part)
const vertices = terrainGeo.attributes.position.array;
for (let i = 0; i < vertices.length; i += 3) {
    // vertices[i+2] is the Z-axis (which becomes Y when rotated)
    const x = vertices[i];
    const y = vertices[i + 1];
    // Create soft hills using sine waves or simple randoms
    vertices[i + 2] = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 3.5;
}
terrainGeo.computeVertexNormals(); // Essential for proper lighting on bumps

const terrainMat = new THREE.MeshLambertMaterial({ 
    map: grassTexture,
    flatShading: false // Set to true for a "Low Poly" faceted look
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.rotation.x = -Math.PI / 2;
scene.add(terrain);

// --- MODEL LOADING ---
const loader = new GLTFLoader();
let mixer;

loader.load('knight.glb', (gltf) => {
    const knight = gltf.scene;
    knight.position.y = 2.0; // Adjust based on terrain height at center
    scene.add(knight);
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(knight);
        mixer.clipAction(gltf.animations[0]).play();
    }
});

// --- SPECTATOR CONTROLS (UNTOUCHED) ---
const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => controls.lock());

const move = { fwd: false, bkd: false, lft: false, rgt: false, up: false, dn: false };
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') move.fwd = true;
    if (e.code === 'KeyS') move.bkd = true;
    if (e.code === 'KeyA') move.lft = true;
    if (e.code === 'KeyD') move.rgt = true;
    if (e.code === 'Space') move.up = true;
    if (e.code === 'ShiftLeft') move.dn = true;
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') move.fwd = false;
    if (e.code === 'KeyS') move.bkd = false;
    if (e.code === 'KeyA') move.lft = false;
    if (e.code === 'KeyD') move.rgt = false;
    if (e.code === 'Space') move.up = false;
    if (e.code === 'ShiftLeft') move.dn = false;
});

// ---  SETTINGS & GROUPS ---
const itemsGroup = new THREE.Group();
scene.add(itemsGroup);

const promptUI = document.getElementById('interaction-prompt');
let pointedItem = null;

// --- RANDOM SPAWNER ---
function spawnItems() {
    const types = [
        { name: 'Rock', color: 0x888888, size: 0.5 },
        { name: 'Wood', color: 0x5C4033, size: 0.8 }
    ];

    for (let i = 0; i < 50; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const geo = type.name === 'Rock' ? 
            new THREE.IcosahedronGeometry(type.size, 0) : 
            new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
            
        const mat = new THREE.MeshLambertMaterial({ color: type.color });
        const mesh = new THREE.Mesh(geo, mat);

        // Random Position on Terrain
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        
        // Find height of terrain at this point
        const groundRay = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
        const check = groundRay.intersectObject(terrain);
        const y = check.length > 0 ? check[0].point.y : 0;

        mesh.position.set(x, y + (type.name === 'Wood' ? 0 : 0.4), z);
        if(type.name === 'Wood') mesh.rotation.z = Math.PI / 2;
        
        mesh.userData = { itemName: type.name }; // Store name for inventory
        itemsGroup.add(mesh);
    }
}
spawnItems();

// --- INTERACTION LOGIC ---
const interactionRaycaster = new THREE.Raycaster();

function checkInteraction() {
    if (isInventoryOpen) return;

    // Raycast from center of screen (0,0)
    interactionRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = interactionRaycaster.intersectObjects(itemsGroup.children);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        const distance = intersects[0].distance;

        // "1 foot" is roughly 0.5 to 1.0 units in Three.js scale
        if (distance < 5) {
            pointedItem = object;
            promptUI.style.display = 'block';
            promptUI.innerText = `Press Q to pick up ${object.userData.itemName}`;
        } else {
            pointedItem = null;
            promptUI.style.display = 'none';
        }
    } else {
        pointedItem = null;
        promptUI.style.display = 'none';
    }
}

// Listen for Q Key
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ' && pointedItem) {
        addItemToInventory(pointedItem.userData.itemName);
        buildInventoryUI();
        
        // Remove from world
        itemsGroup.remove(pointedItem);
        pointedItem = null;
        promptUI.style.display = 'none';
    }
});

// --- INVENTORY STATE ---
const inventoryUI = document.getElementById('inventory');
let isInventoryOpen = false;

// Create 24 empty slots
const inventoryData = Array.from({ length: 24 }, () => ({ item: null, count: 0 }));

// Create the UI slots
function buildInventoryUI() {
    inventoryUI.innerHTML = '';
    inventoryData.forEach((slot, index) => {
        const div = document.createElement('div');
        div.className = 'slot';
        if (slot.item) {
            div.innerHTML = `<span>${slot.item}</span><div class="count">${slot.count}</div>`;
        }
        inventoryUI.appendChild(div);
    });
}
buildInventoryUI();

// --- TOGGLE LOGIC ---
const crosshair = document.getElementById('crosshair');

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        isInventoryOpen = !isInventoryOpen;
        
        // UI Toggles
        inventoryUI.style.display = isInventoryOpen ? 'grid' : 'none';
        crosshair.style.display = isInventoryOpen ? 'none' : 'block'; // Hide dot in inventory
        
        if (isInventoryOpen) {
            controls.unlock();
        } else {
            controls.lock();
        }
    }
    
    // Test Item pickup
    if (e.code === 'KeyT') {
        addItemToInventory("Rock");
        buildInventoryUI();
    }
});

// --- ADD ITEM LOGIC (Stack limit 24) ---
function addItemToInventory(itemName) {
    // 1. Try to find an existing stack of this item that isn't full
    let targetSlot = inventoryData.find(s => s.item === itemName && s.count < 24);

    if (targetSlot) {
        targetSlot.count++;
    } else {
        // 2. Otherwise, find the first empty slot
        let emptySlot = inventoryData.find(s => s.item === null);
        if (emptySlot) {
            emptySlot.item = itemName;
            emptySlot.count = 1;
        } else {
            console.log("Inventory Full!");
        }
    }
}



const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0); // Points straight down

// --- ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    stats.begin();
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Only move if the inventory is CLOSED and controls are LOCKED
    if (controls.isLocked && !isInventoryOpen) {
        const speed = 40 * delta;
        if (move.fwd) controls.moveForward(speed);
        if (move.bkd) controls.moveForward(-speed);
        if (move.lft) controls.moveRight(-speed);
        if (move.rgt) controls.moveRight(speed);
        
        // --- TERRAIN COLLISION LOGIC ---
        // We cast a ray from high above the camera down to the ground
        const rayPos = camera.position.clone();
        rayPos.y += 10; // Start the ray slightly above the camera
        raycaster.set(rayPos, downVector);

        // Check if the ray hits the terrain
        const intersect = raycaster.intersectObject(terrain);

        if (intersect.length > 0) {
            const groundHeight = intersect[0].point.y;
            const playerHeight = 1.8; // How high the "eyes" are from the ground

            // If the camera tries to go below the ground (+ player height)
            if (camera.position.y < groundHeight + playerHeight) {
                camera.position.y = groundHeight + playerHeight;
            }
            
            // Manual Fly controls (Space/Shift)
            if (move.up) camera.position.y += speed;
            // Shift only works if we are above the ground
            if (move.dn && camera.position.y > groundHeight + playerHeight) {
               camera.position.y -= speed;
              }
           }
          checkInteraction(); // Check crosshair every frame
        }
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
    stats.end();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
