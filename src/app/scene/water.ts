import * as THREE from 'three';
import { TABLE_HEIGHT, BOARD_CENTER, TABLE_TOP_Y, type SceneBuilderParams } from './sceneBuilder';

export function buildWater(params: SceneBuilderParams): THREE.PlaneGeometry {
  const { scene, disposables } = params;

  const pedestalHeight = TABLE_HEIGHT * 10;
  const floorY = TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight;

  // Water plane in the distance
  const waterGeometry = new THREE.PlaneGeometry(2000, 2000);
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a6e8a,
    metalness: 0.3,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  disposables.push(waterMaterial);
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(BOARD_CENTER, floorY - 0.5, BOARD_CENTER);
  water.receiveShadow = false;
  scene.add(water);
  return waterGeometry;
}
