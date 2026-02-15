import * as THREE from 'three';
import {
  createBaseMaterial,
  createTextTexture,
  createLabelMaterial,
  type LoadedTextures,
} from './materials';

// Layout constants shared with Chessboard.tsx
export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 1;
export const SQUARE_HEIGHT = 0.1;
export const BASE_HEIGHT = 0.4;
export const MARGIN = 0.6;
export const BEVEL_SIZE = 0.35;
export const TABLE_HEIGHT = BASE_HEIGHT * 5;

// Derived layout constants
export const BOARD_CENTER = (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;
export const TABLE_TOP_Y = -SQUARE_HEIGHT / 2 - BASE_HEIGHT - BEVEL_SIZE * 2;
export const WHITE_CHAIR_Z = (BOARD_SIZE - 1) * SQUARE_SIZE + SQUARE_SIZE / 2 + MARGIN + 4.0;
export const BLACK_CHAIR_Z = -SQUARE_SIZE / 2 - MARGIN - 4.0;
export const SEAT_Y = TABLE_TOP_Y - 5.0;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export interface SceneBuilderParams {
  scene: THREE.Scene;
  textures: LoadedTextures;
  disposables: THREE.Material[];
  textureList: THREE.Texture[];
}

export function buildBase(params: SceneBuilderParams): THREE.ExtrudeGeometry {
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
  const baseGeometry = new THREE.ExtrudeGeometry(baseShape, extrudeSettings);
  baseGeometry.rotateX(-Math.PI / 2);
  const baseMaterial = createBaseMaterial(textures);
  disposables.push(baseMaterial);
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.set(BOARD_CENTER, -SQUARE_HEIGHT / 2 - BASE_HEIGHT - BEVEL_SIZE, BOARD_CENTER);
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);

  return baseGeometry;
}

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
    color: 0xffffff,
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

export function buildPedestal(params: SceneBuilderParams): void {
  const { scene, textures, disposables, textureList } = params;

  const pedestalRadius = SQUARE_SIZE;
  const pedestalHeight = TABLE_HEIGHT * 10;
  const pedestalGeometry = new THREE.CylinderGeometry(
    pedestalRadius,
    pedestalRadius,
    pedestalHeight,
    32
  );
  const pedestalTexture = textures.stone.clone();
  pedestalTexture.wrapS = THREE.MirroredRepeatWrapping;
  pedestalTexture.wrapT = THREE.MirroredRepeatWrapping;
  pedestalTexture.repeat.set(1, 8);
  pedestalTexture.needsUpdate = true;
  textureList.push(pedestalTexture);
  const pedestalMaterial = new THREE.MeshStandardMaterial({
    map: pedestalTexture,
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.5,
  });
  disposables.push(pedestalMaterial);
  const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
  pedestal.position.set(
    BOARD_CENTER,
    TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight / 2,
    BOARD_CENTER
  );
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
}

export function buildFloor(params: SceneBuilderParams): void {
  const { scene, disposables, textureList } = params;

  const pedestalHeight = TABLE_HEIGHT * 10;
  const floorY = TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight;
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const floorCtx = floorCanvas.getContext('2d')!;
  const floorImageData = floorCtx.createImageData(512, 512);
  const fd = floorImageData.data;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const rx = (x - 256) * 0.707 - (y - 256) * 0.707;
      const ry = (x - 256) * 0.707 + (y - 256) * 0.707;
      const ring = Math.sin(ry * 0.06 + Math.sin(rx * 0.015) * 3) * 0.5 + 0.5;
      const grain = Math.sin(ry * 0.4 + Math.sin(rx * 0.08) * 2) * 0.12;
      const noise = (Math.random() - 0.5) * 0.06;
      const value = ring + grain + noise;
      fd[idx] = Math.min(255, Math.max(0, 200 + value * 30));
      fd[idx + 1] = Math.min(255, Math.max(0, 175 + value * 28));
      fd[idx + 2] = Math.min(255, Math.max(0, 140 + value * 26));
      fd[idx + 3] = 255;
    }
  }
  floorCtx.putImageData(floorImageData, 0, 0);
  const floorTexture = new THREE.CanvasTexture(floorCanvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(50, 50);
  floorTexture.needsUpdate = true;
  textureList.push(floorTexture);

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: 0xd4b896,
    metalness: 0.05,
    roughness: 0.6,
  });
  disposables.push(floorMaterial);

  const floorGeometry = new THREE.PlaneGeometry(500, 500);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(BOARD_CENTER, floorY, BOARD_CENTER);
  floor.receiveShadow = true;
  scene.add(floor);
}

export function buildChairs(params: SceneBuilderParams): void {
  const { scene, textures, disposables, textureList } = params;

  const floorY = TABLE_TOP_Y - TABLE_HEIGHT - TABLE_HEIGHT * 10;
  const seatWidth = (BOARD_SIZE * SQUARE_SIZE + MARGIN * 2) * 2.0 * 0.5;
  const seatDepth = 5.0;
  const seatThickness = 0.7;
  const legWidth = 0.7;
  const legHeight = SEAT_Y - floorY;

  const createChair = (color: number, z: number, texture?: THREE.Texture) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      map: texture,
      metalness: 0.05,
      roughness: 0.4,
    });
    disposables.push(mat);

    const group = new THREE.Group();

    const seatShape = new THREE.Shape();
    seatShape.moveTo(-seatWidth / 2, -seatDepth / 2);
    seatShape.lineTo(seatWidth / 2, -seatDepth / 2);
    seatShape.lineTo(seatWidth / 2, seatDepth / 2);
    seatShape.lineTo(-seatWidth / 2, seatDepth / 2);
    seatShape.closePath();
    const bevel = 0.2;
    const seatGeom = new THREE.ExtrudeGeometry(seatShape, {
      depth: seatThickness - bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      bevelOffset: 0,
    });
    seatGeom.rotateX(-Math.PI / 2);
    seatGeom.translate(0, seatThickness, 0);
    const seat = new THREE.Mesh(seatGeom, mat);
    seat.position.set(0, SEAT_Y - seatThickness / 2 - bevel, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    const legBevel = 0.08;
    const legShape = new THREE.Shape();
    const hw = legWidth / 2;
    const r = legBevel;
    legShape.moveTo(-hw + r, -hw);
    legShape.lineTo(hw - r, -hw);
    legShape.quadraticCurveTo(hw, -hw, hw, -hw + r);
    legShape.lineTo(hw, hw - r);
    legShape.quadraticCurveTo(hw, hw, hw - r, hw);
    legShape.lineTo(-hw + r, hw);
    legShape.quadraticCurveTo(-hw, hw, -hw, hw - r);
    legShape.lineTo(-hw, -hw + r);
    legShape.quadraticCurveTo(-hw, -hw, -hw + r, -hw);
    const legGeom = new THREE.ExtrudeGeometry(legShape, {
      depth: legHeight - legBevel * 2,
      bevelEnabled: true,
      bevelThickness: legBevel,
      bevelSize: legBevel,
      bevelSegments: 2,
    });
    legGeom.rotateX(-Math.PI / 2);
    legGeom.translate(0, legHeight, 0);
    const legOffsets = [
      [-seatWidth / 2 + legWidth / 2, -seatDepth / 2 + legWidth / 2],
      [seatWidth / 2 - legWidth / 2, -seatDepth / 2 + legWidth / 2],
      [-seatWidth / 2 + legWidth / 2, seatDepth / 2 - legWidth / 2],
      [seatWidth / 2 - legWidth / 2, seatDepth / 2 - legWidth / 2],
    ];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeom, mat);
      leg.position.set(lx, SEAT_Y - seatThickness / 2 - legHeight * 1.95, lz);
      leg.castShadow = true;
      leg.receiveShadow = true;
      group.add(leg);
    });

    group.position.set(BOARD_CENTER, 0, z);
    scene.add(group);
  };

  // White chair on white's side (high z)
  const whiteChairTex = textures.whiteGranite.clone();
  whiteChairTex.repeat.set(
    textures.whiteGranite.repeat.x * 0.125,
    textures.whiteGranite.repeat.y * 0.125
  );
  whiteChairTex.center.set(0.5, 0.5);
  whiteChairTex.rotation = Math.PI / 4;
  whiteChairTex.needsUpdate = true;
  textureList.push(whiteChairTex);
  createChair(0xf5f5f5, WHITE_CHAIR_Z, whiteChairTex);

  // Black chair on black's side (low z, mirrored)
  createChair(0x4a3728, BLACK_CHAIR_Z, textures.whiteGranite);
}

export function buildSquares(params: SceneBuilderParams): THREE.BoxGeometry {
  const { scene, textures, disposables } = params;

  const squareGeometry = new THREE.BoxGeometry(SQUARE_SIZE, SQUARE_HEIGHT, SQUARE_SIZE);

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isLight = (row + col) % 2 === 0;
      let material;
      if (isLight) {
        const rotatedTexture = textures.whiteGranite.clone();
        rotatedTexture.center.set(0.5, 0.5);
        rotatedTexture.rotation = Math.random() * Math.PI * 2;
        rotatedTexture.offset.set(Math.random(), Math.random());
        rotatedTexture.needsUpdate = true;
        material = new THREE.MeshStandardMaterial({
          map: rotatedTexture,
          color: 0xffffff,
          emissive: 0x444444,
          metalness: 0.05,
          roughness: 0.3,
        });
        disposables.push(material);
      } else {
        const rotatedTexture = textures.blueGranite.clone();
        rotatedTexture.center.set(0.5, 0.5);
        rotatedTexture.rotation = Math.random() * Math.PI * 2;
        rotatedTexture.offset.set(Math.random(), Math.random());
        rotatedTexture.needsUpdate = true;
        material = new THREE.MeshStandardMaterial({
          map: rotatedTexture,
          color: 0xccccee,
          metalness: 0.05,
          roughness: 0.3,
        });
        disposables.push(material);
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

export function buildMolding(params: SceneBuilderParams): void {
  const { scene, disposables } = params;

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

  const moldingMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a4d2e,
    metalness: 0.05,
    roughness: 0.4,
    transparent: true,
    opacity: 0.9,
  });
  disposables.push(moldingMaterial);

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
}

export function buildLabels(params: SceneBuilderParams): THREE.PlaneGeometry {
  const { scene, disposables, textureList } = params;

  const labelGeometry = new THREE.PlaneGeometry(0.5, 0.5);
  const labelNudge = 0.045;

  // File labels (a-h) along bottom edge (white's side)
  FILES.forEach((file, i) => {
    const texture = createTextTexture(file);
    textureList.push(texture);
    const material = createLabelMaterial(texture);
    disposables.push(material);
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
    textureList.push(texture);
    const material = createLabelMaterial(texture);
    disposables.push(material);
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
    textureList.push(texture);
    const material = createLabelMaterial(texture);
    disposables.push(material);
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
    textureList.push(texture);
    const material = createLabelMaterial(texture);
    disposables.push(material);
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
