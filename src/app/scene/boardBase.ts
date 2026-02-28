import * as THREE from 'three';
import {
  BOARD_SIZE,
  SQUARE_SIZE,
  SQUARE_HEIGHT,
  BASE_HEIGHT,
  MARGIN,
  BEVEL_SIZE,
  BOARD_CENTER,
  type SceneBuilderParams,
} from './sceneBuilder';
import { createBaseMaterial } from '../materials';

export function buildBoardBase(params: SceneBuilderParams): THREE.ExtrudeGeometry {
  const { scene, textures, disposables } = params;

  const baseWidth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
  const baseDepth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
  const baseShape = new THREE.Shape();
  baseShape.moveTo(-baseWidth / 2, -baseDepth / 2);
  baseShape.lineTo(baseWidth / 2, -baseDepth / 2);
  baseShape.lineTo(baseWidth / 2, baseDepth / 2);
  baseShape.lineTo(-baseWidth / 2, baseDepth / 2);
  baseShape.lineTo(-baseWidth / 2, -baseDepth / 2);
  const extrudeSettings = {
    depth: BASE_HEIGHT,
    bevelEnabled: true,
    bevelThickness: BEVEL_SIZE,
    bevelSize: BEVEL_SIZE,
    bevelSegments: 2,
  };
  const boardBaseGeometry = new THREE.ExtrudeGeometry(baseShape, extrudeSettings);
  boardBaseGeometry.rotateX(-Math.PI / 2);
  const baseMaterial = createBaseMaterial(textures);
  disposables.push(baseMaterial);
  const base = new THREE.Mesh(boardBaseGeometry, baseMaterial);
  base.position.set(BOARD_CENTER, -SQUARE_HEIGHT / 2 - BASE_HEIGHT - BEVEL_SIZE, BOARD_CENTER);
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  return boardBaseGeometry;
}
