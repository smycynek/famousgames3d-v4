import * as THREE from 'three';

// Colors
export const WHITE_PIECE_COLOR = 0xfff0d8; // Ivory tint
export const BLACK_PIECE_COLOR = 0xbe8585; // Lighter warm gray with faint red tint
export const SCENE_BACKGROUND_COLOR = 0x0d0705; // Blended dark
export const SCENE_BACKGROUND_COLOR_2 = 0xa3886e; // Blended warm beige

const LABEL_TEXT_COLOR = '#aa7700';

const BOARD_BASE_TINT = 0xffbbaa;
const MOLDING_TINT = 0x4a7a50;
const CROWN_TINT = 0xffd700;
const FLOOR_TINT = 0xffffff;
const WATER_TINT = 0x1a6e8a;
const FLOOR_MAT_TINT = 0xe5a69a;
const TABLE_TINT = 0xd8d0c8;
export const LIGHT_SQUARE_TINT = 0xffffff;
export const DARK_SQUARE_TINT = 0xccccee;
export const WHITE_CHAIR_TINT = 0xf5f5f5;
export const BLACK_CHAIR_TINT = 0x625a52;

export const materialsToDispose: THREE.Material[] = [];
export const texturesToDispose: THREE.Texture[] = [];

// Texture paths
const TEXTURE_BASE_PATH = import.meta.env.BASE_URL + 'textures/';

const TEXTURE_PATHS = {
  lightWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_229M.jpg',
  darkWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_233M.jpg',
  redWood: TEXTURE_BASE_PATH + 'Texturelabs_Wood_187M.jpg',
  whiteGranite: TEXTURE_BASE_PATH + 'whiteGranite.jpg',
  blueGranite: TEXTURE_BASE_PATH + 'blueGranite.jpg',
  stone: TEXTURE_BASE_PATH + 'Texturelabs_Stone_134M.jpg',
} as const;

// Loaded textures interface
export interface LoadedTextures {
  lightWood: THREE.Texture;
  darkWood: THREE.Texture;
  redWood: THREE.Texture;
  whiteGranite: THREE.Texture;
  blueGranite: THREE.Texture;
  stone: THREE.Texture;
}

// Load all textures
export function loadTextures(): LoadedTextures {
  const loader = new THREE.TextureLoader();
  const lightWood = loader.load(TEXTURE_PATHS.lightWood);
  lightWood.wrapS = THREE.RepeatWrapping;
  lightWood.wrapT = THREE.RepeatWrapping;
  lightWood.repeat.set(1.6, 1.6);
  const darkWood = loader.load(TEXTURE_PATHS.darkWood);
  darkWood.wrapS = THREE.RepeatWrapping;
  darkWood.wrapT = THREE.RepeatWrapping;
  darkWood.repeat.set(2.0, 2.0);
  const redWood = loader.load(TEXTURE_PATHS.redWood);
  redWood.wrapS = THREE.RepeatWrapping;
  redWood.wrapT = THREE.RepeatWrapping;
  redWood.repeat.set(0.125, 0.125);
  const whiteGranite = loader.load(TEXTURE_PATHS.whiteGranite);
  whiteGranite.wrapS = THREE.RepeatWrapping;
  whiteGranite.wrapT = THREE.RepeatWrapping;
  whiteGranite.repeat.set(0.5, 0.5);
  const blueGranite = loader.load(TEXTURE_PATHS.blueGranite);
  blueGranite.wrapS = THREE.RepeatWrapping;
  blueGranite.wrapT = THREE.RepeatWrapping;
  blueGranite.repeat.set(0.25, 0.25);
  const stone = loader.load(TEXTURE_PATHS.stone);
  stone.wrapS = THREE.RepeatWrapping;
  stone.wrapT = THREE.RepeatWrapping;
  stone.repeat.set(0.1, 0.1);
  texturesToDispose.push(lightWood, darkWood, redWood, whiteGranite, blueGranite, stone);
  return {
    lightWood,
    darkWood,
    redWood,
    whiteGranite,
    blueGranite,
    stone,
  };
}

// Create text texture for labels with speckled gold effect
export function createTextTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text with base gold color
  ctx.fillStyle = LABEL_TEXT_COLOR;
  ctx.font = 'bold 96px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  // Add speckled gold effect
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Only modify non-transparent pixels (the text)
    if (data[i + 3] > 0) {
      const speckle = Math.random() * 160 - 80; // Random variation -80 to +80
      data[i] = Math.min(255, Math.max(0, data[i] + speckle)); // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + speckle * 0.7)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + speckle * 0.3)); // B
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texturesToDispose.push(texture);
  texture.needsUpdate = false;
  return texture;
}

export function createRandomizedPieceMaterial(
  color: number,
  texture?: THREE.Texture
): THREE.MeshStandardMaterial {
  let map = texture;
  if (texture) {
    map = texture.clone();
    map.center.set(0.5, 0.5);
    map.rotation = Math.random() * Math.PI * 2;
    map.needsUpdate = false;
  }
  const material = new THREE.MeshStandardMaterial({
    color,
    map,
    metalness: 0.05,
    roughness: 0.35,
    transparent: false,
    opacity: 1,
  });
  materialsToDispose.push(material);
  texturesToDispose.push(map!);
  return material;
}

// Create base material
export function createBaseMaterial(textures: LoadedTextures): THREE.MeshStandardMaterial {
  const rotatedTexture = textures.redWood.clone();
  rotatedTexture.center.set(0.5, 0.5);
  rotatedTexture.rotation = Math.PI / 4; // 45 degrees
  rotatedTexture.needsUpdate = false;
  const material = new THREE.MeshStandardMaterial({
    map: rotatedTexture,
    color: BOARD_BASE_TINT,
    metalness: 0.05,
    roughness: 0.4,
  });
  texturesToDispose.push(rotatedTexture);
  materialsToDispose.push(material);
  return material;
}

// Create label material
export function createLabelMaterial(texture: THREE.CanvasTexture): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  materialsToDispose.push(material);
  return material;
}

// Create gradient background texture
export function createGradientBackground(
  topColor: number,
  bottomColor: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const topColorStr = '#' + topColor.toString(16).padStart(6, '0');
  const bottomColorStr = '#' + bottomColor.toString(16).padStart(6, '0');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, topColorStr);
  gradient.addColorStop(1, bottomColorStr);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texturesToDispose.push(texture);
  texture.needsUpdate = false;
  return texture;
}

export function createMoldingMaterial(texture: THREE.Texture): THREE.MeshStandardMaterial {
  const moldingMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    color: MOLDING_TINT,
    metalness: 0.05,
    roughness: 0.6,
    transparent: false,
  });
  materialsToDispose.push(moldingMaterial);
  return moldingMaterial;
}

export function createRandomizedSquareMaterial(texture: THREE.Texture, color: number) {
  const rotatedTexture = texture.clone();
  rotatedTexture.center.set(0.5, 0.5);
  rotatedTexture.rotation = Math.random() * Math.PI * 2;
  rotatedTexture.offset.set(Math.random(), Math.random());
  rotatedTexture.needsUpdate = false;
  const material = new THREE.MeshStandardMaterial({
    map: rotatedTexture,
    color: color,
    metalness: 0.05,
    roughness: 0.7,
  });
  materialsToDispose.push(material);
  texturesToDispose.push(rotatedTexture);
  return material;
}

export function createCrownMaterial(clipPlane?: THREE.Plane) {
  const mat = new THREE.MeshStandardMaterial({
    color: CROWN_TINT,
    metalness: 0.6,
    roughness: 0.2,
    side: clipPlane ? THREE.DoubleSide : THREE.FrontSide,
    clippingPlanes: clipPlane ? [clipPlane] : [],
  });
  materialsToDispose.push(mat);
  return mat;
}

export function createFloorMaterial(): THREE.MeshStandardMaterial {
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
  floorTexture.needsUpdate = false;
  texturesToDispose.push(floorTexture);

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: FLOOR_TINT,
    metalness: 0.0,
    roughness: 0.9,
  });
  materialsToDispose.push(floorMaterial);
  return floorMaterial;
}

export function createWaterMaterial(): THREE.MeshStandardMaterial {
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: WATER_TINT,
    metalness: 0.3,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  materialsToDispose.push(waterMaterial);
  return waterMaterial;
}
export function createFloorMatMaterial(): THREE.MeshStandardMaterial {
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
  matTex.needsUpdate = false;
  texturesToDispose.push(matTex);

  const matMaterial = new THREE.MeshStandardMaterial({
    map: matTex,
    color: FLOOR_MAT_TINT,
    metalness: 0.05,
    roughness: 0.8,
  });
  materialsToDispose.push(matMaterial);
  return matMaterial;
}

export function createTableMaterial(loadedTextures: LoadedTextures): THREE.MeshStandardMaterial {
  const tableMaterial = new THREE.MeshStandardMaterial({
    map: loadedTextures.stone,
    color: TABLE_TINT,
    metalness: 0.1,
    roughness: 0.5,
  });
  materialsToDispose.push(tableMaterial);
  return tableMaterial;
}

export function createPedestalMaterial(loadedTextures: LoadedTextures): THREE.MeshStandardMaterial {
  const pedestalTexture = loadedTextures.stone.clone();
  pedestalTexture.wrapS = THREE.MirroredRepeatWrapping;
  pedestalTexture.wrapT = THREE.MirroredRepeatWrapping;
  pedestalTexture.repeat.set(1, 8);
  pedestalTexture.needsUpdate = false;
  texturesToDispose.push(pedestalTexture);
  const pedestalMaterial = new THREE.MeshStandardMaterial({
    map: pedestalTexture,
    color: TABLE_TINT,
    metalness: 0.1,
    roughness: 0.5,
  });
  materialsToDispose.push(pedestalMaterial);
  return pedestalMaterial;
}

export function createChairMaterial(
  color: number,
  texture: THREE.Texture
): THREE.MeshStandardMaterial {
  const chairTexture = texture.clone();
  chairTexture.repeat.set(chairTexture.repeat.x * 0.125, chairTexture.repeat.y * 0.125);
  chairTexture.center.set(0.5, 0.5);
  chairTexture.rotation = Math.PI / 4;
  chairTexture.needsUpdate = false;
  texturesToDispose.push(chairTexture);
  const mat = new THREE.MeshStandardMaterial({
    color,
    map: texture,
    metalness: 0.05,
    roughness: 0.4,
  });
  materialsToDispose.push(mat);
  return mat;
}
