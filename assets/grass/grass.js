// Adapted for this site from the MIT-licensed FluffyGrass project by Ebenezer.
// See LICENSE in this directory.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

const canvas = document.getElementById('grass-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 300);
const clock = new THREE.Clock();
const loader = new GLTFLoader();
let grassShader;

scene.background = new THREE.Color('#030907');
scene.fog = new THREE.FogExp2('#030907', 0.025);
camera.position.set(-16, 10, -14);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight('#b4d8bf', '#07130b', 1.7));
const sun = new THREE.DirectionalLight('#d9ffd6', 1.8);
sun.position.set(12, 18, 8);
scene.add(sun);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function createGrassMaterial() {
  const material = new THREE.MeshLambertMaterial({ color: '#3e7f42', side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    grassShader = shader;
    shader.vertexShader = `uniform float uTime; varying float vBladeHeight;\n${shader.vertexShader}`
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float heightFactor = smoothstep(0.0, 1.0, uv.y);
         float wind = sin((instanceMatrix[3].x + instanceMatrix[3].z) * 0.35 + uTime * 1.2) * 0.18;
         transformed.x += wind * heightFactor * heightFactor;
         transformed.z += cos(instanceMatrix[3].x * 0.25 + uTime) * 0.08 * heightFactor;
         vBladeHeight = heightFactor;`
      );
    shader.fragmentShader = `varying float vBladeHeight;\n${shader.fragmentShader}`
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec3 bladeBase = vec3(0.035, 0.16, 0.07);
         vec3 bladeTip = vec3(0.34, 0.74, 0.30);
         diffuseColor.rgb = mix(bladeBase, bladeTip, vBladeHeight);`
      );
  };
  return material;
}

function populateGrass(surface, geometry) {
  const sampler = new MeshSurfaceSampler(surface).build();
  const count = window.innerWidth < 1100 ? 2800 : 4800;
  const grass = new THREE.InstancedMesh(geometry, createGrassMaterial(), count);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const randomRotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const matrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);

  for (let index = 0; index < count; index += 1) {
    sampler.sample(position, normal);
    rotation.setFromUnitVectors(up, normal);
    randomRotation.setFromAxisAngle(normal, Math.random() * Math.PI * 2);
    rotation.multiply(randomRotation);
    const size = 0.65 + Math.random() * 0.7;
    scale.setScalar(size);
    matrix.compose(position, rotation, scale);
    grass.setMatrixAt(index, matrix);
  }

  grass.instanceMatrix.needsUpdate = true;
  scene.add(grass);
}

loader.load('./island.glb', (island) => {
  let terrain;
  island.scene.traverse((child) => {
    if (!terrain && child.isMesh) {
      terrain = child;
      terrain.geometry.scale(3, 3, 3);
      terrain.material = new THREE.MeshLambertMaterial({ color: '#0c2612' });
    }
  });
  scene.add(island.scene);

  loader.load('./grassLODs.glb', (grassModel) => {
    let bladeGeometry;
    let fallbackGeometry;
    grassModel.scene.traverse((child) => {
      if (!child.isMesh) return;
      if (!fallbackGeometry) fallbackGeometry = child.geometry.clone();
      if (!bladeGeometry && child.name.includes('LOD00')) bladeGeometry = child.geometry.clone();
    });
    bladeGeometry = bladeGeometry || fallbackGeometry;
    if (terrain && bladeGeometry) {
      bladeGeometry.scale(4.5, 4.5, 4.5);
      populateGrass(terrain, bladeGeometry);
    }
  });
});

function render() {
  if (grassShader) grassShader.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

resize();
window.addEventListener('resize', resize);
render();
