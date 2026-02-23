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
  const { scene, textures, disposables, textureList } = params;

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

  // Circular mat under the table — diameter 1.5 × table width, salmon tint with speckles
  const pedestalHeight = TABLE_HEIGHT * 10;
  const matFloorY = TABLE_TOP_Y - TABLE_HEIGHT - pedestalHeight + 0.02;
  const matRadius = tableWidth * 1.5;

  const matCanvas = document.createElement('canvas');
  matCanvas.width = 256;
  matCanvas.height = 256;
  const matCtx = matCanvas.getContext('2d')!;
  const matImageData = matCtx.createImageData(256, 256);
  const md = matImageData.data;
  for (let i = 0; i < md.length; i += 4) {
    const r = Math.random();
    if (r < 0.04) {
      // Black fleck
      const v = Math.floor(Math.random() * 40);
      md[i] = v;
      md[i + 1] = v;
      md[i + 2] = v;
    } else if (r < 0.1) {
      // Grey fleck
      const v = Math.floor(120 + Math.random() * 80);
      md[i] = v;
      md[i + 1] = v;
      md[i + 2] = v;
    } else {
      // Desaturated salmon base with grain
      const speckle = (Math.random() - 0.5) * 30;
      md[i] = Math.min(255, Math.max(0, 232 + speckle));
      md[i + 1] = Math.min(255, Math.max(0, 165 + speckle * 0.6));
      md[i + 2] = Math.min(255, Math.max(0, 155 + speckle * 0.4));
    }
    md[i + 3] = 255;
  }
  matCtx.putImageData(matImageData, 0, 0);
  const matTex = new THREE.CanvasTexture(matCanvas);
  matTex.wrapS = THREE.RepeatWrapping;
  matTex.wrapT = THREE.RepeatWrapping;
  matTex.repeat.set(6, 6);
  matTex.needsUpdate = true;
  textureList.push(matTex);

  const matMaterial = new THREE.MeshStandardMaterial({
    map: matTex,
    color: 0xe5a69a,
    metalness: 0.05,
    roughness: 0.8,
  });
  disposables.push(matMaterial);
  const matGeometry = new THREE.CircleGeometry(matRadius, 64);
  const matMesh = new THREE.Mesh(matGeometry, matMaterial);
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.position.set(BOARD_CENTER, matFloorY, BOARD_CENTER);
  matMesh.receiveShadow = true;
  scene.add(matMesh);

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
    color: 0xd8d0c8,
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
}

export function buildChairs(params: SceneBuilderParams): void {
  const { scene, textures, disposables, textureList } = params;

  const floorY = TABLE_TOP_Y - TABLE_HEIGHT - TABLE_HEIGHT * 10;
  const seatWidth = (BOARD_SIZE * SQUARE_SIZE + MARGIN * 2) * 2.0 * 0.5;
  const seatDepth = 5.0;
  const seatThickness = 0.7;
  const legWidth = 0.7;
  const legHeight = SEAT_Y - floorY;

  const createChair = (color: number, z: number, texture?: THREE.Texture, backSide: 1 | -1 = 1) => {
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
    seat.receiveShadow = false;
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
      leg.receiveShadow = false;
      group.add(leg);
    });

    // Chair back — same width, depth, and thickness as the seat, standing vertically
    const backShape = new THREE.Shape();
    backShape.moveTo(-seatWidth / 2, 0);
    backShape.lineTo(seatWidth / 2, 0);
    backShape.lineTo(seatWidth / 2, seatDepth);
    backShape.lineTo(-seatWidth / 2, seatDepth);
    backShape.closePath();
    const backGeom = new THREE.ExtrudeGeometry(backShape, {
      depth: seatThickness - bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      bevelOffset: 0,
    });
    const back = new THREE.Mesh(backGeom, mat);
    const backZ = backSide > 0 ? seatDepth / 2 - seatThickness : -seatDepth / 2;
    back.position.set(0, SEAT_Y, backZ);
    back.castShadow = true;
    back.receiveShadow = false;
    group.add(back);

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
  const blackChairTex = textures.whiteGranite.clone();
  blackChairTex.repeat.set(
    textures.whiteGranite.repeat.x * 0.125,
    textures.whiteGranite.repeat.y * 0.125
  );
  blackChairTex.center.set(0.5, 0.5);
  blackChairTex.rotation = Math.PI / 4;
  blackChairTex.needsUpdate = true;
  textureList.push(blackChairTex);
  createChair(0x625a52, BLACK_CHAIR_Z, blackChairTex, -1);
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
          metalness: 0.05,
          roughness: 0.7,
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
          roughness: 0.7,
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
  const { scene, textures, disposables } = params;

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
    map: textures.blueGranite,
    color: 0x4a7a50,
    metalness: 0.05,
    roughness: 0.6,
    transparent: false,
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
