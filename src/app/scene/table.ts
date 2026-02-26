import * as THREE from 'three';
import {
  BOARD_SIZE,
  SQUARE_SIZE,
  MARGIN,
  BEVEL_SIZE,
  TABLE_HEIGHT,
  BOARD_CENTER,
  TABLE_TOP_Y,
  type SceneBuilderParams,
} from './sceneBuilder';

export function buildTable(params: SceneBuilderParams): THREE.ExtrudeGeometry {
  const { scene, textures, disposables } = params;

  const baseWidth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
  const baseDepth = BOARD_SIZE * SQUARE_SIZE + MARGIN * 2;
  const tableWidth = baseWidth * 2.0;
  const tableDepth = baseDepth * 1.265;
  const tableShape = new THREE.Shape();
  tableShape.moveTo(-tableWidth / 2, -tableDepth / 2);
  tableShape.lineTo(tableWidth / 2, -tableDepth / 2);
  tableShape.lineTo(tableWidth / 2, tableDepth / 2);
  tableShape.lineTo(-tableWidth / 2, tableDepth / 2);
  tableShape.lineTo(-tableWidth / 2, -tableDepth / 2);
  const tableExtrudeSettings = {
    depth: TABLE_HEIGHT,
    bevelEnabled: true,
    bevelThickness: BEVEL_SIZE,
    BEVEL_SIZE: BEVEL_SIZE,
    bevelSegments: 2,
  };
  const tableGeometry = new THREE.ExtrudeGeometry(tableShape, tableExtrudeSettings);
  tableGeometry.rotateX(-Math.PI / 2);
  const tableMaterial = new THREE.MeshStandardMaterial({
    map: textures.stone,
    color: 0xd8d0c8,
    metalness: 0.1,
    roughness: 0.5,
  });
  disposables.push(tableMaterial);
  const table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.set(BOARD_CENTER, TABLE_TOP_Y - TABLE_HEIGHT, BOARD_CENTER);
  table.receiveShadow = true;
  table.castShadow = true;
  scene.add(table);

  return tableGeometry;
}
