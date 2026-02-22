import * as THREE from 'three';

export function buildLights(): THREE.Light[] {
  const lights: THREE.Light[] = [];

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.18);
  ambientLight.intensity *= Math.PI;

  // Overhead light — angled from above to cast piece shadows onto the board and table
  const overhead = new THREE.DirectionalLight(0xffffff, 0.2);
  overhead.position.set(5, 15, 8);
  overhead.castShadow = true;
  overhead.shadow.mapSize.set(4096, 4096);
  overhead.shadow.camera.near = 1;
  overhead.shadow.camera.far = 35;
  overhead.shadow.camera.left = -12;
  overhead.shadow.camera.right = 12;
  overhead.shadow.camera.top = 12;
  overhead.shadow.camera.bottom = -12;
  overhead.shadow.bias = -0.001;
  overhead.shadow.radius = 4;
  overhead.intensity *= Math.PI;

  const directionalBlackLeft = new THREE.DirectionalLight(0xffffff, 0.1);
  directionalBlackLeft.position.set(20, 0, 0);
  directionalBlackLeft.intensity *= Math.PI;

  const directionalLightWhiteLeft = new THREE.DirectionalLight(0xffffff, 0.1);
  directionalLightWhiteLeft.position.set(-20, 0, 0);
  directionalLightWhiteLeft.intensity *= Math.PI;

  const directionalBlackSide = new THREE.DirectionalLight(0xffffff, 0.1);
  directionalBlackSide.position.set(0, 0, -20);
  directionalBlackSide.castShadow = true;
  directionalBlackSide.shadow.mapSize.set(2048, 2048);
  directionalBlackSide.shadow.camera.near = 0.1;
  directionalBlackSide.shadow.camera.far = 50;
  directionalBlackSide.shadow.camera.left = -15;
  directionalBlackSide.shadow.camera.right = 15;
  directionalBlackSide.shadow.camera.top = 10;
  directionalBlackSide.shadow.camera.bottom = -15;
  directionalBlackSide.shadow.bias = -0.001;
  directionalBlackSide.shadow.radius = 4;
  directionalBlackSide.intensity *= Math.PI;

  const directionalLightWhiteSide = new THREE.DirectionalLight(0xffffff, 0.1);
  directionalLightWhiteSide.position.set(0, 0, 20);
  // directionalLightWhiteSide.castShadow = true;
  // directionalLightWhiteSide.shadow.mapSize.set(2048, 2048);
  directionalLightWhiteSide.shadow.camera.near = 0.1;
  directionalLightWhiteSide.shadow.camera.far = 50;
  directionalLightWhiteSide.shadow.camera.left = -15;
  directionalLightWhiteSide.shadow.camera.right = 15;
  directionalLightWhiteSide.shadow.camera.top = 10;
  directionalLightWhiteSide.shadow.camera.bottom = -15;
  directionalLightWhiteSide.shadow.bias = -0.001;
  directionalLightWhiteSide.shadow.radius = 4;
  directionalLightWhiteSide.intensity *= Math.PI;

  lights.push(ambientLight);
  lights.push(overhead);

  lights.push(directionalBlackLeft);
  lights.push(directionalLightWhiteLeft);
  lights.push(directionalBlackSide);
  lights.push(directionalLightWhiteSide);

  return lights;
}
