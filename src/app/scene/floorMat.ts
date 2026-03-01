import * as THREE from 'three';
import {
  BOARD_SIZE,
  SQUARE_SIZE,
  MARGIN,
  TABLE_HEIGHT,
  BOARD_CENTER,
  TABLE_TOP_Y,
  type SceneBuilderParams,
} from './sceneBuilder';
import { createFloorMatMaterial } from '../materials';

export function buildFloorMat(params: SceneBuilderParams): THREE.CircleGeometry {
  const { scene } = params;
  const baseWidth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
  const tableWidth = baseWidth * 2.0;
  // Circular mat under the table — diameter 1.5 × table width, salmon tint with speckles
  const pedestalHeight = TABLE_HEIGHT * 10;
  const matFloorY = TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight + 0.02;
  const matRadius = tableWidth * 1.5;
  const matMaterial = createFloorMatMaterial();
  const matGeometry = new THREE.CircleGeometry(matRadius, 64);
  const matMesh = new THREE.Mesh(matGeometry, matMaterial);
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.position.set(BOARD_CENTER, matFloorY, BOARD_CENTER);
  matMesh.receiveShadow = true;
  scene.add(matMesh);
  return matGeometry;
}
