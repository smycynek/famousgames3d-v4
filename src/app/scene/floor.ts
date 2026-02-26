import * as THREE from 'three';
import { TABLE_HEIGHT, BOARD_CENTER, TABLE_TOP_Y, type SceneBuilderParams } from './sceneBuilder';

export function buildFloor(params: SceneBuilderParams): void {
  const { scene, disposables, textureList } = params;

  const pedestalHeight = TABLE_HEIGHT * 10;
  const floorY = TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight;
  // Sand texture
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 1024;
  floorCanvas.height = 1024;
  const floorCtx = floorCanvas.getContext('2d')!;
  const floorImageData = floorCtx.createImageData(1024, 1024);
  const fd = floorImageData.data;

  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const idx = (y * 1024 + x) * 4;
      const grain = (Math.random() - 0.5) * 30;
      const wave = Math.sin(x * 0.02 + Math.sin(y * 0.01) * 2) * 8;
      const ripple = Math.sin(y * 0.05 + Math.sin(x * 0.03) * 1.5) * 5;
      fd[idx] = Math.min(255, Math.max(0, 215 + grain + wave + ripple));
      fd[idx + 1] = Math.min(255, Math.max(0, 190 + grain + wave + ripple));
      fd[idx + 2] = Math.min(255, Math.max(0, 145 + grain * 0.7 + wave + ripple));
      fd[idx + 3] = 255;
    }
  }

  floorCtx.putImageData(floorImageData, 0, 0);
  const floorTexture = new THREE.CanvasTexture(floorCanvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(20, 20);
  floorTexture.needsUpdate = true;
  textureList.push(floorTexture);

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.9,
  });
  disposables.push(floorMaterial);

  const floorGeometry = new THREE.CircleGeometry(250, 64);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(BOARD_CENTER, floorY, BOARD_CENTER);
  floor.receiveShadow = true;
  scene.add(floor);
}
