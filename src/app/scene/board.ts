import * as THREE from 'three';
import {
  BOARD_SIZE,
  SQUARE_SIZE,
  SQUARE_HEIGHT,
  MARGIN,
  type SceneBuilderParams,
} from './sceneBuilder';
import {
  createTextTexture,
  createLabelMaterial,
  createMoldingMaterial,
  createRandomizedSquareMaterial,
  texturesToDispose,
  materialsToDispose,
  LIGHT_SQUARE_TINT,
  DARK_SQUARE_TINT,
} from '../materials';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function buildSquares(params: SceneBuilderParams): THREE.BoxGeometry {
  const { scene, loadedTextures } = params;

  const squareGeometry = new THREE.BoxGeometry(SQUARE_SIZE, SQUARE_HEIGHT, SQUARE_SIZE);

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isLight = (row + col) % 2 === 0;
      let material;
      if (isLight) {
        material = createRandomizedSquareMaterial(loadedTextures.whiteGranite, LIGHT_SQUARE_TINT);
      } else {
        material = createRandomizedSquareMaterial(loadedTextures.blueGranite, DARK_SQUARE_TINT);
      }
      const square = new THREE.Mesh(squareGeometry, material);
      square.position.set(col * SQUARE_SIZE, 0, row * SQUARE_SIZE);
      square.castShadow = true;
      square.receiveShadow = true;
      scene.add(square);
    }
  }

  return squareGeometry;
}

export function buildMolding(params: SceneBuilderParams): THREE.BufferGeometry[] {
  const { scene, loadedTextures } = params;
  const geometries: THREE.BufferGeometry[] = [];

  const moldingLeg = SQUARE_HEIGHT;
  const boardLeft = -SQUARE_SIZE / 2;
  const boardRight = (BOARD_SIZE - 1) * SQUARE_SIZE + SQUARE_SIZE / 2;
  const boardFront = -SQUARE_SIZE / 2;
  const boardBack = (BOARD_SIZE - 1) * SQUARE_SIZE + SQUARE_SIZE / 2;
  const boardBottom = -SQUARE_HEIGHT / 2;
  const boardLength = BOARD_SIZE * SQUARE_SIZE;

  const moldingShape = new THREE.Shape();
  moldingShape.moveTo(0, 0);
  moldingShape.lineTo(moldingLeg, 0);
  moldingShape.lineTo(0, moldingLeg);
  moldingShape.closePath();

  const moldingGeometry = new THREE.ExtrudeGeometry(moldingShape, {
    steps: 1,
    depth: boardLength,
    bevelEnabled: false,
  });
  geometries.push(moldingGeometry);

  const moldingMaterial = createMoldingMaterial(loadedTextures.blueGranite);

  const moldingSides: { rotY: number; pos: [number, number, number] }[] = [
    { rotY: Math.PI / 2, pos: [boardLeft, boardBottom, boardFront] },
    { rotY: 0, pos: [boardRight, boardBottom, boardFront] },
    { rotY: -Math.PI / 2, pos: [boardRight, boardBottom, boardBack] },
    { rotY: Math.PI, pos: [boardLeft, boardBottom, boardBack] },
  ];

  moldingSides.forEach(({ rotY, pos }) => {
    const molding = new THREE.Mesh(moldingGeometry, moldingMaterial);
    molding.rotation.y = rotY;
    molding.position.set(pos[0], pos[1], pos[2]);
    molding.castShadow = true;
    molding.receiveShadow = true;
    scene.add(molding);
  });

  // Cap the corners with solid triangular faces
  const addCornerCap = (v: number[]) => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
    geom.setIndex([0, 1, 2, 0, 2, 1]);
    geom.computeVertexNormals();
    geometries.push(geom);
    const cap = new THREE.Mesh(geom, moldingMaterial);
    cap.castShadow = true;
    cap.receiveShadow = true;
    scene.add(cap);
  };

  const bt = boardBottom;
  const tp = boardBottom + moldingLeg;
  const ml = moldingLeg;

  // Front-right
  addCornerCap([
    boardRight,
    bt,
    boardFront - ml,
    boardRight + ml,
    bt,
    boardFront,
    boardRight,
    tp,
    boardFront,
  ]);
  // Front-left
  addCornerCap([
    boardLeft,
    bt,
    boardFront - ml,
    boardLeft - ml,
    bt,
    boardFront,
    boardLeft,
    tp,
    boardFront,
  ]);
  // Back-right
  addCornerCap([
    boardRight,
    bt,
    boardBack + ml,
    boardRight + ml,
    bt,
    boardBack,
    boardRight,
    tp,
    boardBack,
  ]);
  // Back-left
  addCornerCap([
    boardLeft,
    bt,
    boardBack + ml,
    boardLeft - ml,
    bt,
    boardBack,
    boardLeft,
    tp,
    boardBack,
  ]);

  return geometries;
}

export function buildLabels(params: SceneBuilderParams): THREE.PlaneGeometry {
  const { scene } = params;

  const labelGeometry = new THREE.PlaneGeometry(0.5, 0.5);
  const labelNudge = 0.045;

  // File labels (a-h) along bottom edge (white's side)
  FILES.forEach((file, i) => {
    const texture = createTextTexture(file);
    texturesToDispose.push(texture);
    const material = createLabelMaterial(texture);
    materialsToDispose.push(material);
    const label = new THREE.Mesh(labelGeometry, material);
    label.rotation.x = -Math.PI / 2;
    label.position.set(
      i * SQUARE_SIZE,
      -SQUARE_HEIGHT / 2 + 0.001,
      BOARD_SIZE * SQUARE_SIZE - SQUARE_SIZE / 2 + MARGIN / 2 + labelNudge
    );
    scene.add(label);
  });

  // File labels (a-h) along top edge (black's side)
  FILES.forEach((file, i) => {
    const texture = createTextTexture(file);
    texturesToDispose.push(texture);
    const material = createLabelMaterial(texture);
    materialsToDispose.push(material);
    const label = new THREE.Mesh(labelGeometry, material);
    label.rotation.x = -Math.PI / 2;
    label.rotation.z = Math.PI;
    label.position.set(
      i * SQUARE_SIZE,
      -SQUARE_HEIGHT / 2 + 0.001,
      -SQUARE_SIZE / 2 - MARGIN / 2 - labelNudge
    );
    scene.add(label);
  });

  // Rank labels (1-8) along left edge (white's side)
  RANKS.forEach((rank, i) => {
    const texture = createTextTexture(rank);
    texturesToDispose.push(texture);
    const material = createLabelMaterial(texture);
    materialsToDispose.push(material);
    const label = new THREE.Mesh(labelGeometry, material);
    label.rotation.x = -Math.PI / 2;
    label.position.set(
      -SQUARE_SIZE / 2 - MARGIN / 2,
      -SQUARE_HEIGHT / 2 + 0.001,
      (BOARD_SIZE - 1 - i) * SQUARE_SIZE
    );
    scene.add(label);
  });

  // Rank labels (1-8) along right edge (black's side)
  RANKS.forEach((rank, i) => {
    const texture = createTextTexture(rank);
    texturesToDispose.push(texture);
    const material = createLabelMaterial(texture);
    materialsToDispose.push(material);
    const label = new THREE.Mesh(labelGeometry, material);
    label.rotation.x = -Math.PI / 2;
    label.rotation.z = Math.PI;
    label.position.set(
      BOARD_SIZE * SQUARE_SIZE - SQUARE_SIZE / 2 + MARGIN / 2,
      -SQUARE_HEIGHT / 2 + 0.001,
      (BOARD_SIZE - 1 - i) * SQUARE_SIZE
    );
    scene.add(label);
  });

  return labelGeometry;
}
