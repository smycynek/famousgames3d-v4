import * as THREE from 'three';
import { TABLE_HEIGHT, BOARD_CENTER, TABLE_TOP_Y, type SceneBuilderParams } from './sceneBuilder';
import { createFloorMaterial } from '../materials';

export function buildFloor(params: SceneBuilderParams): THREE.CircleGeometry {
  const { scene } = params;
  const pedestalHeight = TABLE_HEIGHT * 10;
  const floorY = TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight;
  const floorMaterial = createFloorMaterial();
  const floorGeometry = new THREE.CircleGeometry(250, 64);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(BOARD_CENTER, floorY, BOARD_CENTER);
  floor.receiveShadow = true;
  scene.add(floor);
  return floorGeometry;
}
